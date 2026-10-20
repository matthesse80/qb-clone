import test from 'node:test';
import assert from 'node:assert/strict';
import { PGlite } from '@electric-sql/pglite';
import { seedPreview, PREVIEW_SUBJECT } from '../src/server/preview-data.mjs';
import { embeddedDatabase, postgresDatabase } from '../src/server/database.mjs';
import { Workspace } from '../src/server/workspace.mjs';
import { createWorkspaceServer } from '../src/server/http.mjs';

test('workspace edits persist atomically, invalidate approval, reject stale writes and audit validation',async()=>{
  const db=new PGlite();
  try{
    await seedPreview(db);
    const workspace=new Workspace(embeddedDatabase(db),{preview:true});
    await assert.rejects(workspace.list('uninvited'),e=>e.status===403);
    const [list]=await workspace.list(PREVIEW_SUBJECT);
    const initial=await workspace.read(PREVIEW_SUBJECT,list.id);
    assert.equal(initial.customer.legalName,'AJJA, INC.');
    const a=initial.accounts[0];
    assert.equal(a.bills.length,12);assert.deepEqual(a.validation.flags,[]);
    const edit={version:initial.version,accountId:a.account.id,studyStart:'2025-07-02',studyEnd:a.study.periodEnd,
      modeledExemptUsage:9000,modeledNonexemptUsage:3000,claimStart:a.claim.approvedStart,claimEnd:a.claim.approvedEnd,
      filingDate:a.claim.filingDate,followupDate:'2026-10-06',nextAction:'Request original bills'};
    const updated=await workspace.update(PREVIEW_SUBJECT,list.id,edit);
    assert.equal(updated.version,2);
    assert.ok(updated.accounts[0].validation.flags.some(f=>f.code==='STUDY_DATES'));
    assert.equal(updated.followups.at(-1).next_action,'Request original bills');
    await assert.rejects(workspace.update(PREVIEW_SUBJECT,list.id,edit),e=>e.status===409);
    const count=(await db.query('SELECT count(*) FROM ledger.audit_event')).rows[0].count;
    await assert.rejects(workspace.update(PREVIEW_SUBJECT,list.id,{...edit,version:2,accountId:'00000000-0000-0000-0000-000000000000'}),e=>e.status===400);
    assert.equal((await workspace.read(PREVIEW_SUBJECT,list.id)).version,2);
    assert.equal((await db.query('SELECT count(*) FROM ledger.audit_event')).rows[0].count,count);
    const run=await workspace.validate(PREVIEW_SUBJECT,list.id,2);
    assert.equal(run.filingReady,false);assert.ok(run.flags.some(f=>f.code==='STUDY_DATES'));
    assert.ok(run.flags.some(f=>f.code==='FILING_REVIEW_REQUIRED'));
    assert.equal((await db.query('SELECT count(*) FROM ledger.validation_run')).rows[0].count,1);
    await assert.rejects(workspace.validate(PREVIEW_SUBJECT,list.id,1),e=>e.status===409);
    await assert.rejects(workspace.update(PREVIEW_SUBJECT,list.id,{...edit,version:2,actorId:'janna'}),e=>e.status===400);
  }finally{await db.close();}
});

test('HTTP routes require identity and same-origin JSON; private files are not served',async()=>{
  const db=new PGlite();let server;
  try{
    await seedPreview(db);
    const workspace=new Workspace(embeddedDatabase(db),{preview:true});
    server=createWorkspaceServer({workspace,preview:true,authenticate:async req=>req.headers['x-test-subject']});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base=`http://127.0.0.1:${server.address().port}`;
    assert.equal((await fetch(base+'/api/cases')).status,401);
    const headers={'x-test-subject':PREVIEW_SUBJECT};
    const [c]=await (await fetch(base+'/api/cases',{headers})).json();
    assert.equal((await fetch(`${base}/api/cases/${c.id}/validate`,{method:'POST',headers:{...headers,'Content-Type':'application/json'},body:'{"version":1}'})).status,403);
    const ok=await fetch(`${base}/api/cases/${c.id}/validate`,{method:'POST',headers:{...headers,'Content-Type':'application/json',Origin:base},body:'{"version":1}'});
    assert.equal(ok.status,200);assert.equal((await ok.json()).filingReady,false);
    for(const path of ['/.env','/.preview/database','/src/server/preview-data.mjs','/api/cases/not-a-uuid'])assert.equal((await fetch(base+path,{headers})).status,404);
    const page=await fetch(base+'/workspace.html');assert.equal(page.status,200);assert.ok(page.headers.get('content-security-policy'));
    assert.equal((await fetch(base+'/refunds.html')).status,200);
  }finally{if(server)await new Promise(resolve=>server.close(resolve));await db.close();}
});

test('Postgres pool adapter uses one connection and rolls back/release on failure',async()=>{
  const calls=[];
  const client={query:async sql=>{calls.push(sql);},release:()=>calls.push('RELEASE')};
  const db=postgresDatabase({connect:async()=>client,query:async()=>{throw new Error('Wrong connection');}});
  await assert.rejects(db.transaction(async tx=>{await tx.query('MUTATE');throw new Error('failure');}),/failure/);
  assert.deepEqual(calls,['BEGIN','MUTATE','ROLLBACK','RELEASE']);
});
