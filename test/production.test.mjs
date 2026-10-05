import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorkspaceServer} from '../src/server/http.mjs';
test('production protects pages, rejects legacy and pins mutation origin',async()=>{
 const workspace={actor:async s=>{if(s!=='Matt')throw Object.assign(new Error('Denied'),{status:403});},list:async()=>[]};
 const options={workspace,authenticate:async r=>r.headers['x-test-session']};
 assert.throws(()=>createWorkspaceServer(options),/HTTPS/);
 const server=createWorkspaceServer({...options,publicOrigin:'https://ledger.example.com'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base+'/workspace.html')).status,401);
  assert.equal((await fetch(base+'/workspace.html',{headers:{'x-test-session':'other'}})).status,403);
  const headers={'x-test-session':'Matt'};
  assert.equal((await fetch(base+'/workspace.html',{headers})).status,200);
  assert.equal((await fetch(base+'/customers.html',{headers})).status,404);
  assert.equal((await fetch(base+'/api/cases',{headers})).status,200);
  assert.equal((await fetch(base+'/api/cases',{method:'POST',headers:{...headers,origin:base,'content-type':'application/json'},body:'{}'})).status,403);
 }finally{await new Promise(r=>server.close(r));}
});
