import { packetPanel, packetSources, packetStudy } from './packet.mjs';
import {reviewState} from './review.mjs';
const stages=['Customer','Utility Accounts','Source Docs','Study','Bills','Validation','Calculations','State Forms','Filing','Follow-up','Refund','Invoice'];
const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n===null||n===undefined?'Pending':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
let packet=null;
let data,stage='Review',validation=null,dirty=false,accountId=null,billId=null;
async function api(path,method='GET',body){const r=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;}
function message(text){$('message').textContent=text;}
function metric(label,value){return `<div class="metric"><div class="k">${escape(label)}</div><div class="v">${escape(value)}</div></div>`;}
function detail(label,value){return `<div class="detail"><small>${escape(label)}</small>${escape(value)}</div>`;}
function input(label,name,value,type='text'){return `<label>${label}<input name="${name}" type="${type}" value="${escape(value)}" required${type==='number'?' min="0" step="any"':''}></label>`;}
function action(target,label,account){return `<button data-go="${target}"${account?` data-account="${account}"`:''}>${escape(label)} →</button>`;}
function reviewPanel(a,review){return `<div class="next-action"><div><div class="eyebrow">NEXT ACTION</div><h3>${escape(data.followups.at(-1)?.next_action??'Gather the original source records.')}</h3><p>${data.followups.length?`Follow-up: ${escape(data.followups.at(-1).due_date)}`:'No follow-up date recorded'}</p></div>${action('Source Docs','See required records')}</div>
<div class="section-heading"><h3>Needs your attention</h3><span>${review.issues.length+review.tasks.length} open items</span></div>
${review.issues.map(f=>`<div class="attention-item urgent"><div><strong>${escape(f.code.replaceAll('_',' '))}</strong><p>${escape(f.message)}</p></div>${action(f.target,'Review issue',f.accountId)}</div>`).join('')}
${review.tasks.map(t=>`<div class="attention-item"><div><strong>${escape(t.title)}</strong><p>${escape(t.description)}</p></div>${action(t.target,t.action)}</div>`).join('')}
<div class="review-summary"><div><h3>Study result</h3><p>${a?.validation.study?.valid?'Sample usage checks pass':'Study needs review'}</p><small>Passing checks does not verify the source records.</small></div><div><h3>Proposed claim period</h3><p>${escape(a?.claim.approvedStart??'Pending')} – ${escape(a?.claim.approvedEnd??'Pending')}</p>${action('Study','Review dates')}</div></div>`;}
function billReview(a){
 if(packet && a?.account.accountNumber===packet.accountNumber)return packetPanel(packet,data.id,billId);
 const bills=a?.bills??[];const bill=bills.find(b=>b.id===billId)??bills[0];if(!bill)return '<p>No bills received.</p>';billId=bill.id;
 const excluded=a.validation.claim?.excluded.find(e=>e.billId===bill.id);
 const treatment=excluded?.reason??(a.validation.claim?.included.some(b=>b.id===bill.id)?'Included in proposed claim':'Needs review');
 return `<p class="muted">Compare each bill with its recorded values. Service dates control study coverage; issue dates control tax placement.</p><label>Bill to review<select id="bill-picker">${bills.map(b=>`<option value="${b.id}"${b.id===bill.id?' selected':''}>${escape(b.issueDate)} · source page ${b.sourcePage}</option>`).join('')}</select></label>
 <div class="evidence-layout"><div class="evidence-placeholder"><span class="pill warn">Original file needed</span><h3>Source bill</h3><p>No original PDF is connected to this record yet. The values alongside it are sample entries, not extracted or verified evidence.</p><p>Expected source page: <strong>${bill.sourcePage}</strong></p>${action('Source Docs','See source requirements')}</div><div><h3>Recorded bill values</h3>${detail('Issue date / tax month',`${bill.issueDate} / ${bill.issueDate.slice(0,7)}`)}${detail('Service coverage',`${bill.serviceStart} – ${bill.serviceEnd}`)}${detail('Usage',`${bill.normalizedUsage} ${bill.normalizedUnit}`)}${detail('State tax / local tax',`${money(bill.stateTaxCents)} / ${money(bill.localTaxCents)}`)}${detail('Claim treatment',treatment)}${detail('Source status','Unverified — original file required')}</div></div>`;
}
function editForm(a){return `<p class="muted">Edit the draft, then run validation. Saving resets prior study approval. Study dates and claim dates are separate.</p><form id="edit"><div class="form-grid">
${input('Study start','studyStart',a.study.periodStart,'date')}${input('Study end','studyEnd',a.study.periodEnd,'date')}
${input(`Modeled exempt usage (${escape(a.study.unit)})`,'modeledExemptUsage',a.study.modeledExemptUsage,'number')}${input(`Modeled non-exempt usage (${escape(a.study.unit)})`,'modeledNonexemptUsage',a.study.modeledNonexemptUsage,'number')}
${input('Proposed claim start','claimStart',a.claim.approvedStart,'date')}${input('Proposed claim end','claimEnd',a.claim.approvedEnd,'date')}
${input('Intended filing date','filingDate',a.claim.filingDate,'date')}${input('Next follow-up date','followupDate',data.followups.at(-1)?.due_date??'','date')}
<label class="form-wide">Next action<textarea name="nextAction" maxlength="2000" required>${escape(data.followups.at(-1)?.next_action??'')}</textarea></label></div><button class="primary" type="submit">Save draft</button></form>`;}
function render(){
  const a=data.accounts.find(x=>x.account.id===accountId)??data.accounts[0];
  accountId=a?.account.id;
  $('account-picker').innerHTML=data.accounts.map(x=>`<option value="${x.account.id}">${escape(x.account.fuel)} · ${escape(x.account.accountNumber)}</option>`).join('');
  $('account-picker').value=accountId??'';
  $('title').textContent=data.label;$('subtitle').textContent=`${data.customer.legalName} dba ${data.customer.dba} · ${data.customer.serviceAddress}`;
  $('mode').textContent=data.preview?'Sample records · local preview':`Signed in as ${data.actor}`;
  $('notice').textContent=data.preview?'Customer identity is supplied by Matt. Bills, dates, usage and taxes are synthetic examples. No real documents are stored here.':'Draft workspace. Filing remains locked until all evidence and reviews are complete.';
  const flags=data.accounts.flatMap(x=>x.validation.flags);
  const review=reviewState(data);if(packet){review.status['Source Docs']='Packet connected';review.status.Bills='Drafts to review';}
  $('metrics').innerHTML=metric('Open review items',review.issues.length+review.tasks.length)+metric('Study coverage',a?.study?`${a.study.billIds.length} selected bills`:'Not started')+metric('Verified refund','Pending')+metric('Filing','Locked for review');
  $('stages').innerHTML=`<button data-stage="Review" ${stage==='Review'?'aria-current="page"':''}><span class="stage-number">◎</span><span>Review overview<small>Start here</small></span></button>`+stages.map((s,i)=>`<button data-stage="${s}" ${s===stage?'aria-current="page"':''}><span class="stage-number">${i+1}</span><span>${s}<small>${review.status[s]}${['Source Docs','Calculations','State Forms','Filing','Refund','Invoice'].includes(s)?' · Preview only':''}</small></span></button>`).join('');
  $('panel-title').textContent=stage==='Review'?'Case review':stage;
  const empty=text=>`<div class="empty">${text}</div>`;
  let html='';
  if(stage==='Review')html=reviewPanel(a,review);
  if(stage==='Customer')html=`<span class="pill info">Draft refund case</span>${detail('Legal entity',data.customer.legalName)}${detail('Business name',data.customer.dba)}${detail('Entity type',data.customer.entityType)}${detail('Service location',data.customer.serviceAddress)}${detail('Next action',data.followups.at(-1)?.next_action??'No follow-up recorded')}<p class="muted">Choose Study to edit dates and modeled usage, or Bills to inspect the source-to-tax trail.</p>`;
  if(stage==='Utility Accounts')html=data.accounts.map(x=>`${detail('Account',x.account.accountNumber)}${detail('Provider',x.account.provider)}${detail('Fuel',x.account.fuel)}${detail('Meters',x.account.meters.map(m=>m.meter_number).join(', '))}${detail('Prior filed through',x.account.priorFiledThrough)}`).join('');
  if(stage==='Source Docs')html=`<p class="notice">Uploads are not connected yet. The sample document record below is not an actual PDF.</p><h3>Records needed for Dairy Queen</h3><ul class="records-list"><li>Original utility bills, including every corrected bill</li><li>Energy study and equipment inventory with confirmed study dates</li><li>Prior electric and gas filing records and filed-through dates</li><li>Signed forms and verified legal-entity/signer records</li><li>Approved blank calculation workbook and form masters</li></ul>${action('Bills','Preview bill review')}`+data.documents.map(d=>detail(d.category,`${d.kind} · ${d.source_document_id?'Linked derivative':'Original evidence record'}`)).join('');
  if(stage==='Study')html=a?.study?`${detail('Study period display',`${a.study.displayStart} – ${a.study.displayEnd}`)}${editForm(a)}`:empty('No study is available for this account.');
  if(stage==='Validation'){const f=validation?.flags??flags;html=`<p class="muted">Run validation to save a dated review against this version of the case.</p>${f.length?f.map(x=>`<div class="issue"><strong>${escape(x.code.replaceAll('_',' '))}</strong>${escape(x.message)}</div>`).join(''):'<p class="good-note">Study and claim data checks pass. Document and filing review are still required.</p>'}${validation?detail('Saved validation run',validation.runId):''}`;}
  if(stage==='Bills')html=billReview(a);
  if(stage==='Calculations')html=`<p class="notice">These are provider-billed tax totals, not a verified refund. Workbook reconciliation and final exemption calculations are pending.</p>${detail('Included state tax',money(a?.validation.claim?.stateTaxCents))}${detail('Included local tax',money(a?.validation.claim?.localTaxCents))}${detail('Actual study usage',a?.validation.study?.actualUsage??'Pending')}${detail('Modeled usage',a?.validation.study?.modeledUsage??'Pending')}${detail('Study variance',a?.validation.study?.variance==null?'Pending':`${(a.validation.study.variance*100).toFixed(2)}%`)}`;
  if(stage==='State Forms')html=empty('AJJA, INC. is a corporation. Confirm entity and signer evidence before preparing POAs. The IA 843 signature date does not control the claim cutoff. The lower local-option schedule stays blank unless Matt directs otherwise. Form generation is not enabled in this preview.');
  if(stage==='Filing')html=empty('Filing is locked. Required next: verified source records, signer and POA review, reconciled calculation workbook and visual review of the completed state forms.');
  if(stage==='Follow-up')html=data.followups.map(f=>detail(f.due_date,f.next_action)).join('')+'<p class="muted">Add the next action and due date when saving a draft in Study. These records do not send messages or schedule notifications.</p>';
  if(stage==='Refund')html=empty('No verified refund receipt has been recorded. Receipt entry will connect after filing and refund reconciliation.');
  if(stage==='Invoice')html=empty('No NEC invoice has been created for this case. Invoicing and payment allocation require verified refund amounts and approved fee terms.');
  if(packet){
    $('metrics').innerHTML=metric('Source statements',packet.bills.length)+metric('Study selection',packet.studyReview?'12 source bills · draft':'Pending')+metric('Verified refund','Pending')+metric('Filing','Locked for review');
    $('mode').textContent='Local source review · draft';
    $('notice').textContent='Real bill drafts are connected in Bills. Study shows the confirmed carry-forward draft; claim settings still require reconciliation. Draft bills are not approved for refund calculations.';
    if(stage==='Review')html='<h3>Your 12 statements are ready for review</h3>'+action('Bills','Review source bills')+'<p>Review dates and usage, then reconcile tax allocation and history.</p>';
    if(stage==='Source Docs')html=packetSources(packet,data.id);
    if(stage==='Study' && packet.studyReview)html=packetStudy(packet);
    if(stage==='Calculations'||stage==='Validation')html=empty('Source drafts await tax allocation, correction-history reconciliation and study selection. No verified refund or validation result is available for these drafts.');
  }
  $('panel').innerHTML=html;
  $('activity').innerHTML=data.activity.map(e=>`<div class="activity-line">${escape(e.seat)} · ${escape(e.operation.toLowerCase())} · ${escape(e.table_name.replaceAll('_',' '))}<span>${escape(new Date(e.occurred_at).toLocaleString())}</span></div>`).join('');
  const form=$('edit');if(form){form.addEventListener('input',()=>dirty=true);form.addEventListener('submit',save);}
  const picker=$('bill-picker');if(picker)picker.addEventListener('change',e=>{billId=e.target.value;render();});
}
async function load(id){data=await api(`/api/cases/${id}`);const response=await fetch(`/api/cases/${id}/packet`);if(!response.ok&&response.status!==404)throw new Error('Unable to load source packet');packet=response.ok?await response.json():null;validation=null;dirty=false;render();}
async function busy(work){for(const id of ['reload','validate','case-picker'])$(id).disabled=true;try{await work();}catch(e){message(e.message);}finally{for(const id of ['reload','validate','case-picker'])$(id).disabled=false;}}
async function save(event){event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;await busy(async()=>{const values=Object.fromEntries(new FormData(event.target));for(const k of ['modeledExemptUsage','modeledNonexemptUsage'])values[k]=Number(values[k]);data=await api(`/api/cases/${data.id}`,'PATCH',{...values,version:data.version,accountId});validation=null;dirty=false;render();message('Draft saved. Changes are in the audit history.');});button.disabled=false;}
$('account-picker').addEventListener('change',e=>{if(dirty&&!confirm('Discard unsaved changes?')){e.target.value=accountId;return;}accountId=e.target.value;dirty=false;render();});
$('stages').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(dirty&&!confirm('Discard unsaved changes?'))return;dirty=false;stage=b.dataset.stage;render();});
$('panel').addEventListener('click',e=>{const b=e.target.closest('[data-go]');if(!b)return;if(dirty&&!confirm('Discard unsaved changes?'))return;dirty=false;stage=b.dataset.go;if(b.dataset.account)accountId=b.dataset.account;render();});
$('reload').addEventListener('click',()=>{if(dirty&&!confirm('Discard unsaved changes?'))return;busy(()=>load(data.id));});
$('case-picker').addEventListener('change',e=>{if(dirty&&!confirm('Discard unsaved changes?')){e.target.value=data.id;return;}busy(()=>load(e.target.value));});
$('validate').addEventListener('click',()=>busy(async()=>{if(packet){stage='Validation';render();message('Source drafts require reconciliation before validation.');return;}if(dirty){message('Save your draft before running validation.');return;}validation=await api(`/api/cases/${data.id}/validate`,'POST',{version:data.version});const run=validation;data=await api(`/api/cases/${data.id}`);validation=run;stage='Validation';render();message('Validation saved. Filing review is still required.');}));
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
await busy(async()=>{const cases=await api('/api/cases');$('case-picker').innerHTML=cases.map(c=>`<option value="${c.id}">${escape(c.label)}</option>`).join('');if(!cases.length){message('No refund cases found.');return;}await load(cases[0].id);});
