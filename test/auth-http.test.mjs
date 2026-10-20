import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceServer } from '../src/server/http.mjs';
import { LocalAccountService, requestAuthenticator } from '../src/production/auth.mjs';

class Store{
 constructor(){this.user={id:'m',seat:'Matt',auth_subject:'matt-subject',active:true,failed_attempts:0};}
 async findSeat(seat){return `${seat}`.toLowerCase()==='matt'?this.user:null;}
 async enroll(id,password_hash,recovery_code_hash){Object.assign(this.user,{password_hash,recovery_code_hash,credential_version:1});return true;}
 async loginSucceeded(){this.user.failed_attempts=0;} async loginFailed(){}
 async replaceCredential({passwordHash,recoveryCodeHash}){Object.assign(this.user,{password_hash:passwordHash,recovery_code_hash:recoveryCodeHash,credential_version:this.user.credential_version+1});}
 async record(){}
}

test('production login establishes an owner session; logout removes access',async()=>{
 const accounts=new LocalAccountService(new Store());await accounts.enroll('Matt','Matt has a long passphrase');
 const workspace={actor:async s=>{if(s!=='matt-subject')throw Object.assign(new Error('Denied'),{status:403});},list:async()=>[]};
 const server=createWorkspaceServer({workspace,accounts,authenticate:requestAuthenticator(accounts),publicOrigin:'https://ledger.example.com'});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
 try{
  assert.equal((await fetch(base+'/login.html')).status,200);
  const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{origin:'https://ledger.example.com','content-type':'application/json'},body:JSON.stringify({seat:'Matt',password:'Matt has a long passphrase'})});
  assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
  assert.equal((await fetch(base+'/workspace.html',{headers:{cookie}})).status,200);
  const logout=await fetch(base+'/api/auth/logout',{method:'POST',headers:{cookie,origin:'https://ledger.example.com','content-type':'application/json'},body:'{}'});
  assert.equal(logout.status,200);assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
  assert.equal((await fetch(base+'/workspace.html',{headers:{cookie}})).status,401);
 }finally{await new Promise(r=>server.close(r));}
});
