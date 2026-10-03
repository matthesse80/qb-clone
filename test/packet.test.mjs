import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorkspaceServer } from '../src/server/http.mjs';
import { packetPanel } from '../assets/packet.mjs';
test('source packet requires identity, case binding and valid page; has no public file route',async()=>{
 const id='11111111-1111-4111-8111-111111111111';
 const packet={metadata:{caseId:id,accountNumber:'test'},pdf:Buffer.from('pdf'),page:async n=>n===1?Buffer.from('png'):null};
 const workspace={read:async(subject,caseId)=>{if(subject!=='allowed')throw Object.assign(new Error('Denied'),{status:403});return {id:caseId,accounts:[{account:{accountNumber:'test'}}]};}};
 const server=createWorkspaceServer({workspace,packet,preview:true,authenticate:async r=>r.headers['x-test-subject']});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const base=`http://127.0.0.1:${server.address().port}`;const headers={'x-test-subject':'allowed'};
 try{
  assert.equal((await fetch(`${base}/api/cases/${id}/packet`)).status,401);
  assert.equal((await fetch(`${base}/api/cases/${id}/packet`,{headers:{'x-test-subject':'other'}})).status,403);
  assert.equal((await fetch(`${base}/api/cases/${id}/packet`,{headers})).status,200);
  assert.equal((await fetch(`${base}/api/cases/22222222-2222-4222-8222-222222222222/packet`,{headers})).status,404);
  assert.equal((await fetch(`${base}/api/cases/${id}/packet/pages/1`,{headers})).headers.get('cache-control'),'no-store');
  assert.equal((await fetch(`${base}/api/cases/${id}/packet/pages/99`,{headers})).status,404);
  assert.equal((await fetch(`${base}/.preview/packet/original.pdf`,{headers})).status,404);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
test('draft review uses issue-date month and keeps unallocated tax pending',()=>{
 const b={sourcePage:3,issueDate:'2026-04-20',serviceStart:'2026-03-10',serviceEnd:'2026-04-10',usage:100,electricCents:1000,waterCents:0,sewerCents:0,garbageCents:0,landfillCents:0,combinedTaxCents:70,totalCents:1070,reconciliationDifferenceCents:0};
 const html=packetPanel({bills:[b],accountNumber:'test',serviceAddress:'<script>'},'case','3');
 assert.ok(html.includes('2026-04-20 / 2026-04'));assert.ok(html.includes('Pending allocation'));assert.ok(html.includes('/pages/3'));assert.ok(html.includes('&lt;script&gt;'));
});
