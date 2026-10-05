// Integer cents and basis points. No binary floating-point currency rounding.
const roundRatio=(value,numerator,denominator)=>Number((BigInt(value)*BigInt(numerator)*2n+BigInt(denominator))/(2n*BigInt(denominator)));
export function quarterlyCalculation(bills,{stateRateBps,localRateBps,nonExemptBps,rateEvidenceVerified=false}){
 for(const n of [stateRateBps,localRateBps,nonExemptBps])if(!Number.isSafeInteger(n)||n<0)throw new Error('Nonnegative integer basis points required');
 if(stateRateBps+localRateBps<=0||stateRateBps+localRateBps>10000||nonExemptBps>10000)throw new Error('Invalid rate');
 const quarters={};const rows=[];const seen=new Set();
 for(const bill of bills){
  if(!bill.recordKey||seen.has(bill.recordKey))throw new Error('Missing or duplicate record key');seen.add(bill.recordKey);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(bill.issueDate)||!Number.isFinite(Date.parse(bill.issueDate))||new Date(bill.issueDate).toISOString().slice(0,10)!==bill.issueDate)throw new Error('Valid issue date required');
  if(!Number.isSafeInteger(bill.electricCents)||bill.electricCents<0)throw new Error('Review negative or invalid electric charges before calculation');
  const combined=roundRatio(bill.electricCents,stateRateBps+localRateBps,10000);
  const state=roundRatio(combined,stateRateBps,stateRateBps+localRateBps);
  const local=roundRatio(combined,localRateBps,stateRateBps+localRateBps);
  if(state+local!==combined)throw new Error('Tax split rounding requires review');
  const period=`${bill.issueDate.slice(0,4)}-Q${Math.ceil(Number(bill.issueDate.slice(5,7))/3)}`;
  const q=quarters[period]??={billCount:0,stateTaxCents:0,localTaxCents:0};
  q.billCount++;q.stateTaxCents+=state;q.localTaxCents+=local;
  rows.push({...bill,quarter:period,combinedElectricTaxCents:combined,stateTaxCents:state,localTaxCents:local});
 }
 let totalRefundCents=0;
 for(const q of Object.values(quarters)){
  q.correctedStateCents=roundRatio(q.stateTaxCents,nonExemptBps,10000);
  q.correctedLocalCents=roundRatio(q.localTaxCents,nonExemptBps,10000);
  q.stateRefundCents=q.stateTaxCents-q.correctedStateCents;
  q.localRefundCents=q.localTaxCents-q.correctedLocalCents;
  totalRefundCents+=q.stateRefundCents+q.localRefundCents;
 }
 return {rows,quarters,totalRefundCents,rateEvidenceVerified,filingReady:false,method:'Round combined bill tax; split by rate ratio; aggregate by issue quarter; subtract rounded non-exempt tax'};
}
