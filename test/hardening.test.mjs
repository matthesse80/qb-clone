import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { embeddedDatabase } from '../src/server/database.mjs';
import { PostgresCredentialStore } from '../src/production/credential-store.mjs';
import { LocalAccountService, sessionTokenFromRequest, verifySecret } from '../src/production/auth.mjs';
import { createBackup, verifyBackup } from '../src/production/backup.mjs';

test('same-second parallel backups preserve both complete snapshots', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nec-collision-'));
  try {
    const options = { backupsDir:dir, schemaVersion:'002', appVersion:'0.2.0', now:new Date('2026-10-20T01:00:00Z') };
    const results = await Promise.all(['first snapshot','second snapshot'].map(text =>
      createBackup({ ...options, writeSnapshot:path => writeFile(path,text) })));
    assert.notEqual(results[0].snapshot,results[1].snapshot);
    assert.deepEqual(await Promise.all(results.map(x=>readFile(x.snapshot,'utf8'))),['first snapshot','second snapshot']);
    await Promise.all(results.map(x=>verifyBackup(x.snapshot)));
  } finally { await rm(dir,{recursive:true,force:true}); }
});

test('malformed empty hash can never verify a secret', async () => {
  assert.equal(await verifySecret('any passphrase','scrypt$16384$8$1$c2FsdA$'),false);
  assert.equal(sessionTokenFromRequest({headers:{cookie:'nec_session=%GG'}}),null);
});

test('concurrent failures accumulate atomically and stale login cannot unlock a changed credential',async()=>{
  const db=new PGlite();
  try{
    for(const file of ['001_refund_foundation.sql','002_production_access.sql'])
      await db.exec(await readFile(new URL(`../db/migrations/${file}`,import.meta.url),'utf8'));
    const user=(await db.query("INSERT INTO ledger.app_user(seat,auth_subject) VALUES('Matt','matt') RETURNING id")).rows[0];
    const store=new PostgresCredentialStore(embeddedDatabase(db));
    await store.enroll(user.id,'scrypt$fixture','scrypt$fixture');
    const options={maxFailures:3,lockMs:900000,now:'2026-10-20T01:00:00Z',expectedCredentialVersion:1};
    await Promise.all([1,2,3].map(()=>store.loginFailed(user.id,options)));
    const locked=await store.findSeat('Matt');
    assert.equal(locked.failed_attempts,3);
    assert.equal(new Date(locked.locked_until).toISOString(),'2026-10-20T01:15:00.000Z');
    assert.equal(await store.loginSucceeded(user.id,options),false);
    await store.loginFailed(user.id,{...options,now:'2026-10-20T01:16:00Z'});
    assert.equal((await store.findSeat('Matt')).failed_attempts,1);
    await store.replaceCredential({actorUserId:user.id,targetUserId:user.id,expectedCredentialVersion:1,
      passwordHash:'scrypt$new',recoveryCodeHash:'scrypt$new',eventType:'recovery-reset'});
    assert.equal(await store.loginSucceeded(user.id,{...options,now:'2026-10-20T01:17:00Z'}),false);
  }finally{await db.close();}
});

test('one recovery code authorizes at most one concurrent reset', async () => {
  const db = new PGlite();
  try {
    for (const file of ['001_refund_foundation.sql','002_production_access.sql'])
      await db.exec(await readFile(new URL(`../db/migrations/${file}`,import.meta.url),'utf8'));
    await db.query("INSERT INTO ledger.app_user(seat,auth_subject) VALUES('Matt','matt'),('Janna','janna')");
    const store = new PostgresCredentialStore(embeddedDatabase(db));
    const auth = new LocalAccountService(store);
    const enrolled = await auth.enroll('Matt','An independently long passphrase');
    // Barrier forces both operations to verify the same original credential version.
    const originalFind=store.findSeat.bind(store); let reads=0; let release;
    const barrier=new Promise(resolve=>{release=resolve;});
    store.findSeat=async seat=>{const row=await originalFind(seat); if(++reads<=2){if(reads===2)release();await barrier;}return row;};
    const attempts=await Promise.allSettled([
      auth.resetWithRecoveryCode('Matt',enrolled.recoveryCode,'First replacement passphrase'),
      auth.resetWithRecoveryCode('Matt',enrolled.recoveryCode,'Second replacement passphrase')
    ]);
    assert.equal(attempts.filter(x=>x.status==='fulfilled').length,1);
    assert.equal((await originalFind('Matt')).credential_version,2);
    assert.equal((await db.query("SELECT count(*) FROM ledger.security_event WHERE event_type='recovery-reset'")).rows[0].count,1);
  } finally { await db.close(); }
});
