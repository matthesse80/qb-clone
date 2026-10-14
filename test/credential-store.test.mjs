import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { embeddedDatabase } from '../src/server/database.mjs';
import { PostgresCredentialStore } from '../src/production/credential-store.mjs';

test('production credential migration preserves two explicit owners and immutable security history',async()=>{
  const db=new PGlite();
  try{
    await db.exec(await readFile(new URL('../db/migrations/001_refund_foundation.sql',import.meta.url),'utf8'));
    await db.exec(await readFile(new URL('../db/migrations/002_production_access.sql',import.meta.url),'utf8'));
    const matt=(await db.query("INSERT INTO ledger.app_user(seat,auth_subject) VALUES('Matt','matt-subject') RETURNING id")).rows[0];
    await db.query("INSERT INTO ledger.app_user(seat,auth_subject) VALUES('Janna','janna-subject')");
    const store=new PostgresCredentialStore(embeddedDatabase(db));
    assert.equal(await store.enroll(matt.id,'scrypt$1','scrypt$2'),true);
    assert.equal(await store.enroll(matt.id,'scrypt$3','scrypt$4'),false);
    await store.loginFailed(matt.id,{failedAttempts:1,lockedUntil:null});await store.loginSucceeded(matt.id);
    assert.equal((await store.findSeat('matt')).seat,'Matt');
    assert.equal((await db.query('SELECT count(*) FROM ledger.security_event')).rows[0].count,3);
    await assert.rejects(db.query('DELETE FROM ledger.security_event'),/append-only/);
  }finally{await db.close();}
});
