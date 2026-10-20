import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { WorkspaceError } from './workspace.mjs';
import { sessionCookie, sessionTokenFromRequest } from '../production/auth.mjs';
const root = new URL('../../',import.meta.url);
const routes = new Map([
  ['/', ['workspace.html','text/html']], ['/workspace.html',['workspace.html','text/html']],
  ['/assets/workspace.mjs',['assets/workspace.mjs','text/javascript']],
  ['/assets/packet.mjs',['assets/packet.mjs','text/javascript']],
  ['/assets/review.mjs',['assets/review.mjs','text/javascript']],
  ['/assets/workspace.css',['assets/workspace.css','text/css']],
  ['/assets/app-shell.css',['assets/app-shell.css','text/css']],
  ['/assets/nec-ledger-logo.jpg',['assets/nec-ledger-logo.jpg','image/jpeg']],
  ['/login.html',['login.html','text/html']],
  ['/assets/login.mjs',['assets/login.mjs','text/javascript']],
  ['/assets/login.css',['assets/login.css','text/css']],
  ...['index','customers','refunds','receivables','checking','reports','company'].map(n=>[`/${n}.html`,[`${n}.html`,'text/html']])
]);
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
export function createWorkspaceServer({workspace,authenticate,accounts=null,preview=false,packet=null,publicOrigin=null}) {
  if (typeof authenticate!=='function') throw new Error('Trusted server-side authentication is required');
  if(!preview && (!publicOrigin || new URL(publicOrigin).protocol!=='https:' || new URL(publicOrigin).origin!==publicOrigin)) throw new Error('Production requires a canonical HTTPS publicOrigin');
  return createServer(async (req,res)=>{
    const send=(status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
    const body=async()=>{
      if(req.headers.origin!==(preview?`http://${req.headers.host}`:publicOrigin)) throw new WorkspaceError(403,'Same-origin request required.');
      if(req.headers['content-type']!=='application/json') throw new WorkspaceError(415,'JSON required.');
      let raw=''; for await (const part of req) {raw+=part;if(Buffer.byteLength(raw)>16000)throw new WorkspaceError(413,'Request too large');}
      try{return JSON.parse(raw);}catch{throw new WorkspaceError(400,'Invalid JSON');}
    };
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    try {
      if (preview && !/^127\.0\.0\.1:\d+$/.test(req.headers.host??'')) throw new WorkspaceError(403,'Preview accepts only its loopback address.');
      const url=new URL(req.url,'http://localhost');
      if(!preview && accounts && url.pathname.startsWith('/api/auth/')) {
        if(req.method!=='POST')throw new WorkspaceError(405,'Method not allowed');
        const input=await body();
        if(url.pathname==='/api/auth/login'){
          const result=await accounts.login(input?.seat,input?.password);
          res.setHeader('Set-Cookie',sessionCookie(result.token,{secure:true,maxAgeSeconds:Math.floor(result.idleMs/1000)}));
          return send(200,{seat:result.seat,idleMs:result.idleMs});
        }
        if(url.pathname==='/api/auth/recover'){
          const result=await accounts.resetWithRecoveryCode(input?.seat,input?.recoveryCode,input?.newPassword);
          return send(200,{seat:result.seat,recoveryCode:result.recoveryCode,notice:'Save this replacement recovery code now. It will not be shown again.'});
        }
        const token=sessionTokenFromRequest(req);
        if(url.pathname==='/api/auth/logout'){
          await accounts.logout(token);res.setHeader('Set-Cookie',sessionCookie(null,{secure:true}));return send(200,{signedOut:true});
        }
        if(url.pathname==='/api/auth/co-owner-reset'){
          const result=await accounts.resetByCoOwner(token,input?.targetSeat,input?.newPassword,input?.actorPassword);
          return send(200,{seat:result.seat,recoveryCode:result.recoveryCode,notice:'Give the replacement recovery code directly to the other owner.'});
        }
        throw new WorkspaceError(404,'Endpoint not found');
      }
      if(!preview && accounts && req.method==='GET' && ['/login.html','/assets/login.mjs','/assets/login.css'].includes(url.pathname)){
        const [path,type]=routes.get(url.pathname);
        if(path==='login.html')res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
        res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});return res.end(await readFile(fileURLToPath(new URL(path,root))));
      }
      let productionSubject;
      if(!preview){
        productionSubject=await authenticate(req);
        if(!productionSubject)throw new WorkspaceError(401,'Sign in to continue.');
        await workspace.actor(productionSubject);
      }
      if (url.pathname.startsWith('/api/')) {
        if (!['GET','POST','PATCH'].includes(req.method)) throw new WorkspaceError(405,'Method not allowed');
        const subject=preview?await authenticate(req):productionSubject;
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
        let input;
        if (req.method!=='GET') {
          input=await body();
        }
        if(url.pathname==='/api/cases' && req.method==='GET') return send(200,await workspace.list(subject));
        const match=url.pathname.match(new RegExp(`^/api/cases/(${uuid})(/validate)?$`));
        if(!match) throw new WorkspaceError(404,'Endpoint not found');
        if(req.method==='GET' && !match[2]) return send(200,await workspace.read(subject,match[1]));
        if(req.method==='PATCH' && !match[2]) return send(200,await workspace.update(subject,match[1],input));
        if(req.method==='POST' && match[2]) return send(200,await workspace.validate(subject,match[1],input?.version));
        throw new WorkspaceError(405,'Method not allowed');
      }
      if(req.method!=='GET' || !routes.has(url.pathname)) throw new WorkspaceError(404,'Page not found');
      const [path,type]=routes.get(url.pathname);
      if(!preview && path.endsWith('.html') && path!=='workspace.html')throw new WorkspaceError(404,'Legacy prototype is available only in local preview.');
      // Only the new workspace uses external scripts; legacy prototype inline scripts remain untouched.
      if(path==='workspace.html') res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'");
      res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'});
      res.end(await readFile(fileURLToPath(new URL(path,root))));
    } catch(error) {send(error.status??500,{error:error.status ? error.message : 'Unable to complete the request. Please retry.'});}
  });
}
