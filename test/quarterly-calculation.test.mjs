import test from 'node:test';
import assert from 'node:assert/strict';
import {quarterlyCalculation} from '../src/refunds/quarterly-calculation.mjs';
const rates={stateRateBps:600,localRateBps:100,nonExemptBps:7078};
test('round combined tax before rate-ratio split and use issue quarter',()=>{
 const r=quarterlyCalculation([{recordKey:'a',issueDate:'2024-07-20',electricCents:96250}],rates);
 assert.equal(r.rows[0].combinedElectricTaxCents,6738);
 assert.equal(r.rows[0].stateTaxCents,5775);
 assert.equal(r.rows[0].localTaxCents,963);
 assert.equal(r.rows[0].quarter,'2024-Q3');assert.equal(r.filingReady,false);
 const q=r.quarters['2024-Q3'];assert.equal(q.stateRefundCents,q.stateTaxCents-q.correctedStateCents);
});
test('duplicate records, invalid dates and negative charges require review',()=>{
 const b={recordKey:'a',issueDate:'2024-07-20',electricCents:100};
 assert.throws(()=>quarterlyCalculation([b,b],rates),/duplicate/);
 assert.throws(()=>quarterlyCalculation([{...b,issueDate:'2024-02-31'}],rates),/date/);
 assert.throws(()=>quarterlyCalculation([{...b,electricCents:-100}],rates),/negative/);
});
