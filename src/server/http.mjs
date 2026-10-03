import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { WorkspaceError } from './workspace.mjs';
const root = new URL('../../',import.meta.url);
const routes = new Map([
  ['/', ['workspace.html','text/html']], ['/workspace.html',['workspace.html','text/html']],
  ['/assets/workspace.mjs',['assets/workspace.mjs','text/javascript']],
  ['/assets/packet.mjs',['assets/packet.mjs','text/javascript']],
  ['/assets/review.mjs',['assets/review.mjs','text/javascript']],
  ['/assets/workspace.css',['assets/workspace.css','text/css']],
  ['/assets/app-shell.css',['assets/app-shell.css','text/css']],
  ['/assets/nec-ledger-logo.jpg',['assets/nec-ledger-logo.jpg','image/jpeg']],
  ...['index','customers','refunds','receivables','checking','reports','company'].map(n=>[`/${n}.html`,[`${n}.html`,'text/html']])
]);
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function createWorkspaceServer({workspace,authenticate,preview=false,packet=null}) {
  if (typeof authenticate!=='function') throw new Error('Trusted server-side authentication is required');
  return createServer(async (req,res)=>{
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    try {
      if (preview && !/^127\.0\.0\.1:\d+$/.test(req.headers.host??'')) throw new WorkspaceError(403,'Preview accepts only its loopback address.');
      const url=new URL(req.url,'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        if (!['GET','POST','PATCH'].includes(req.method)) throw new WorkspaceError(405,'Method not allowed');
        const subject=await authenticate(req);
        if (!subject) throw new WorkspaceError(401,'Sign in to continue.');
        const packetMatch=url.pathname.match(new RegExp(`^/api/cases/(${uuid})/packet(?:/(original|pages/([0-9]+)))?$`));
        if(packetMatch && req.method==='GET') {
          const current=await workspace.read(subject,packetMatch[1]);
          if(!packet || !preview || packet.metadata.caseId!==current.id || !current.accounts.some(a=>a.account.accountNumber===packet.metadata.accountNumber)) throw new WorkspaceError(404,'No source packet connected.');
          if(!packetMatch[2]) return send(200,packet.metadata);
          const bytes=packetMatch[2]==='original'?packet.pdf:await packet.page(Number(packetMatch[3]));
          if(!bytes) throw new WorkspaceError(404,'Source page not found');
          res.writeHead(200,{'Content-Type':packetMatch[2]==='original'?'application/pdf':'image/png','Cache-Control':'no-store','Content-Disposition':packetMatch[2]==='original'?'inline; filename="source-bills.pdf"':'inline'});
          return res.end(bytes);
        }
        let body;
        if (req.method!=='GET') {
          if (req.headers.origin!==`http://${req.headers.host}` && (preview || req.headers.origin!==`https://${req.headers.host}`))
            throw new WorkspaceError(403,'Same-origin request required.');
          if (req.headers['content-type']!=='application/json') throw new WorkspaceError(415,'JSON required.');
          let raw=''; for await (const part of req) {raw+=part; if(Buffer.byteLength(raw)>16000) throw new WorkspaceError(413,'Request too large');}
          try {body=JSON.parse(raw);} catch {throw new WorkspaceError(400,'Invalid JSON');}
        }
        if(url.pathname==='/api/cases' && req.method==='GET') return send(200,await workspace.list(subject));
        const match=url.pathname.match(new RegExp(`^/api/cases/(${uuid})(/validate)?$`));
        if(!match) throw new WorkspaceError(404,'Endpoint not found');
        if(req.method==='GET' && !match[2]) return send(200,await workspace.read(subject,match[1]));
        if(req.method==='PATCH' && !match[2]) return send(200,await workspace.update(subject,match[1],body));
        if(req.method==='POST' && match[2]) return send(200,await workspace.validate(subject,match[1],body?.version));
        throw new WorkspaceError(405,'Method not allowed');
      }
      if(req.method!=='GET' || !routes.has(url.pathname)) throw new WorkspaceError(404,'Page not found');
      const [path,type]=routes.get(url.pathname);
      // Only the new workspace uses external scripts; legacy prototype inline scripts remain untouched.
      if(path==='workspace.html') res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
      res.end(await readFile(fileURLToPath(new URL(path,root))));
    } catch(error) {send(error.status??500,{error:error.status ? error.message : 'Unable to complete the request. Please retry.'});}
  });
}
