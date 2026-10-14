import test from 'node:test';
import assert from 'node:assert/strict';
import { LocalAccountService, hashSecret, verifySecret } from '../src/production/auth.mjs';

class MemoryStore {
  constructor() { this.users = new Map(['Matt','Janna'].map((seat,index)=>[seat.toLowerCase(),{
    id:`user-${index}`,seat,auth_subject:`subject-${seat.toLowerCase()}`,active:true,failed_attempts:0,credential_version:null
  }])); this.events=[]; }
  async findSeat(seat) { return this.users.get(`${seat}`.toLowerCase()); }
  async enroll(id,password_hash,recovery_code_hash) { const u=[...this.users.values()].find(x=>x.id===id); if(u.password_hash)return false;
    Object.assign(u,{password_hash,recovery_code_hash,credential_version:1});this.events.push(['enroll',id]);return true; }
  async loginSucceeded(id){const u=this.#u(id);u.failed_attempts=0;u.locked_until=null;this.events.push(['login-success',id]);}
  async loginFailed(id,value){Object.assign(this.#u(id),{failed_attempts:value.failedAttempts,locked_until:value.lockedUntil});this.events.push(['login-failed',id]);}
  async replaceCredential({actorUserId,targetUserId,passwordHash,recoveryCodeHash,eventType}){const u=this.#u(targetUserId);
    Object.assign(u,{password_hash:passwordHash,recovery_code_hash:recoveryCodeHash,credential_version:u.credential_version+1,failed_attempts:0,locked_until:null});this.events.push([eventType,actorUserId,targetUserId]);}
  async record(id,type){this.events.push([type,id]);}
  #u(id){return [...this.users.values()].find(x=>x.id===id);}
}

test('scrypt hashes verify without retaining the passphrase',async()=>{
  const encoded=await hashSecret('long owner passphrase');
  assert.equal(encoded.includes('long owner passphrase'),false);
  assert.equal(await verifySecret('long owner passphrase',encoded),true);
  assert.equal(await verifySecret('wrong passphrase',encoded),false);
});

test('Matt and Janna enroll separately; recovery rotates credentials and invalidates sessions',async()=>{
  const store=new MemoryStore();let now=1_000;const auth=new LocalAccountService(store,{now:()=>now,idleMs:1_800_000});
  const matt=await auth.enroll('Matt','Matt has a long passphrase');
  await auth.enroll('Janna','Janna has a long passphrase');
  assert.match(matt.recoveryCode,/^[A-Z0-9_-]{8}(?:-[A-Z0-9_-]{8}){3}$/);
  const session=await auth.login('Matt','Matt has a long passphrase');
  assert.equal((await auth.authenticate(session.token)).authSubject,'subject-matt');
  const reset=await auth.resetWithRecoveryCode('Matt',matt.recoveryCode,'Matt replacement passphrase');
  assert.notEqual(reset.recoveryCode,matt.recoveryCode);
  await assert.rejects(auth.authenticate(session.token),/Sign in/);
  await assert.rejects(auth.login('Matt','Matt has a long passphrase'),/Invalid sign-in/);
  assert.equal((await auth.login('Matt','Matt replacement passphrase')).seat,'Matt');
});

test('Janna can perform an audited emergency reset for Matt, but not reset herself through co-owner flow',async()=>{
  const store=new MemoryStore();const auth=new LocalAccountService(store);
  await auth.enroll('Matt','Matt has a long passphrase');await auth.enroll('Janna','Janna has a long passphrase');
  const janna=await auth.login('Janna','Janna has a long passphrase');
  const result=await auth.resetByCoOwner(janna.token,'Matt','Emergency replacement passphrase');
  assert.equal(result.seat,'Matt');
  assert.ok(store.events.some(e=>e[0]==='co-owner-reset'&&e[1]==='user-1'&&e[2]==='user-0'));
  await assert.rejects(auth.resetByCoOwner(janna.token,'Janna','Another long passphrase'),/own account/);
});

test('sessions expire after thirty inactive minutes and repeated failures lock the account',async()=>{
  const store=new MemoryStore();let now=0;const auth=new LocalAccountService(store,{now:()=>now,idleMs:1_800_000,lockMs:900_000,maxFailures:3});
  await auth.enroll('Matt','Matt has a long passphrase');const session=await auth.login('Matt','Matt has a long passphrase');
  now=1_800_000;await assert.rejects(auth.authenticate(session.token),/30 minutes/);
  for(let i=0;i<3;i++)await assert.rejects(auth.login('Matt','wrong password value'),/Invalid sign-in/);
  await assert.rejects(auth.login('Matt','Matt has a long passphrase'),/temporarily locked/);
});
