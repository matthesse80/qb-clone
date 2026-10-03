const stages=['Customer','Utility Accounts','Source Docs','Study','Bills','Validation','Calculations','State Forms','Filing','Follow-up','Refund','Invoice'];
const $=id=>document.getElementById(id);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>n===null||n===undefined?'Pending':new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
let data,stage='Customer',validation=null,dirty=false,accountId=null;
async function api(path,method='GET',body){const r=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;}
function message(text){$('message').textContent=text;}
function metric(label,value){return `<div class="metric"><div class="k">${escape(label)}</div><div class="v">${escape(value)}</div></div>`;}
function detail(label,value){return `<div class="detail"><small>${escape(label)}</small>${escape(value)}</div>`;}
function input(label,name,value,type='text'){return `<label>${label}<input name="${name}" type="${type}" value="${escape(value)}" required${type==='number'?' min="0" step="any"':''}></label>`;}
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
  $('metrics').innerHTML=metric('Current stage',data.stage)+metric('Study coverage',a?.study?`${a.study.billIds.length} selected bills`:'Not started')+metric('Data checks',flags.length?`${flags.length} need attention`:'Sample checks pass')+metric('Filing status','Review required');
  $('stages').innerHTML=stages.map((s,i)=>`<button data-stage="${s}" ${s===stage?'aria-current="step"':''}><span class="stage-number">${i+1}</span>${s}</button>`).join('');
  $('panel-title').textContent=stage;
  const empty=text=>`<div class="empty">${text}</div>`;
  let html='';
  if(stage==='Customer')html=`<span class="pill info">Draft refund case</span>${detail('Legal entity',data.customer.legalName)}${detail('Business name',data.customer.dba)}${detail('Entity type',data.customer.entityType)}${detail('Service location',data.customer.serviceAddress)}${detail('Next action',data.followups.at(-1)?.next_action??'No follow-up recorded')}<p class="muted">Choose Study to edit dates and modeled usage, or Bills to inspect the source-to-tax trail.</p>`;
  if(stage==='Utility Accounts')html=data.accounts.map(x=>`${detail('Account',x.account.accountNumber)}${detail('Provider',x.account.provider)}${detail('Fuel',x.account.fuel)}${detail('Meters',x.account.meters.map(m=>m.meter_number).join(', '))}${detail('Prior filed through',x.account.priorFiledThrough)}`).join('');
  if(stage==='Source Docs')html=empty('Original signed documents will be preserved separately from completed copies. Private storage must be connected before real uploads are enabled.')+data.documents.map(d=>detail(d.category,`${d.kind} · ${d.source_document_id?'Linked derivative':'Original evidence record'}`)).join('');
  if(stage==='Study')html=a?.study?`${detail('Study period display',`${a.study.displayStart} – ${a.study.displayEnd}`)}${editForm(a)}`:empty('No study is available for this account.');
  if(stage==='Bills')html=`<p class="muted">Study coverage follows service dates. Tax month follows the original bill issue date. Superseded originals remain in history.</p><div class="table-scroll"><table><thead><tr><th>Issued</th><th>Service period</th><th>Usage</th><th>State tax</th><th>Local tax</th><th>Claim treatment</th></tr></thead><tbody>${(a?.bills??[]).map(b=>{const excluded=a.validation.claim?.excluded.find(e=>e.billId===b.id);return `<tr><td>${escape(b.issueDate)}</td><td>${escape(b.serviceStart)} – ${escape(b.serviceEnd)}</td><td>${escape(b.normalizedUsage)} ${escape(b.normalizedUnit)}</td><td>${money(b.stateTaxCents)}</td><td>${money(b.localTaxCents)}</td><td>${escape(excluded?.reason??(a.validation.claim?.included.some(i=>i.id===b.id)?'Included':'Review'))}</td></tr>`;}).join('')}</tbody></table></div>`;
  if(stage==='Validation'){const f=validation?.flags??flags;html=`<p class="muted">Run validation to save a dated review against this version of the case.</p>${f.length?f.map(x=>`<div class="issue"><strong>${escape(x.code.replaceAll('_',' '))}</strong>${escape(x.message)}</div>`).join(''):'<p class="good-note">Study and claim data checks pass. Document and filing review are still required.</p>'}${validation?detail('Saved validation run',validation.runId):''}`;}
  if(stage==='Calculations')html=`<p class="notice">These are provider-billed tax totals, not a verified refund. Workbook reconciliation and final exemption calculations are pending.</p>${detail('Included state tax',money(a?.validation.claim?.stateTaxCents))}${detail('Included local tax',money(a?.validation.claim?.localTaxCents))}${detail('Actual study usage',a?.validation.study?.actualUsage??'Pending')}${detail('Modeled usage',a?.validation.study?.modeledUsage??'Pending')}${detail('Study variance',a?.validation.study?.variance==null?'Pending':`${(a.validation.study.variance*100).toFixed(2)}%`)}`;
  if(stage==='State Forms')html=empty('AJJA, INC. is a corporation. Confirm entity and signer evidence before preparing POAs. The IA 843 signature date does not control the claim cutoff. The lower local-option schedule stays blank unless Matt directs otherwise. Form generation is not enabled in this preview.');
  if(stage==='Filing')html=empty('Filing is locked. Required next: verified source records, signer and POA review, reconciled calculation workbook and visual review of the completed state forms.');
  if(stage==='Follow-up')html=data.followups.map(f=>detail(f.due_date,f.next_action)).join('')+'<p class="muted">Add the next action and due date when saving a draft in Study. These records do not send messages or schedule notifications.</p>';
  if(stage==='Refund')html=empty('No verified refund receipt has been recorded. Receipt entry will connect after filing and refund reconciliation.');
  if(stage==='Invoice')html=empty('No NEC invoice has been created for this case. Invoicing and payment allocation require verified refund amounts and approved fee terms.');
  $('panel').innerHTML=html;
  $('activity').innerHTML=data.activity.map(e=>`<div class="activity-line">${escape(e.seat)} · ${escape(e.operation.toLowerCase())} · ${escape(e.table_name.replaceAll('_',' '))}<span>${escape(new Date(e.occurred_at).toLocaleString())}</span></div>`).join('');
  const form=$('edit');if(form){form.addEventListener('input',()=>dirty=true);form.addEventListener('submit',save);}
}
async function load(id){data=await api(`/api/cases/${id}`);validation=null;dirty=false;render();}
async function busy(work){for(const id of ['reload','validate','case-picker'])$(id).disabled=true;try{await work();}catch(e){message(e.message);}finally{for(const id of ['reload','validate','case-picker'])$(id).disabled=false;}}
async function save(event){event.preventDefault();const button=event.target.querySelector('button');button.disabled=true;await busy(async()=>{const values=Object.fromEntries(new FormData(event.target));for(const k of ['modeledExemptUsage','modeledNonexemptUsage'])values[k]=Number(values[k]);data=await api(`/api/cases/${data.id}`,'PATCH',{...values,version:data.version,accountId});validation=null;dirty=false;render();message('Draft saved. Changes are in the audit history.');});button.disabled=false;}
$('account-picker').addEventListener('change',e=>{if(dirty&&!confirm('Discard unsaved changes?')){e.target.value=accountId;return;}accountId=e.target.value;dirty=false;render();});
$('stages').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(dirty&&!confirm('Discard unsaved changes?'))return;dirty=false;stage=b.dataset.stage;render();});
$('reload').addEventListener('click',()=>{if(dirty&&!confirm('Discard unsaved changes?'))return;busy(()=>load(data.id));});
$('case-picker').addEventListener('change',e=>{if(dirty&&!confirm('Discard unsaved changes?')){e.target.value=data.id;return;}busy(()=>load(e.target.value));});
$('validate').addEventListener('click',()=>busy(async()=>{if(dirty){message('Save your draft before running validation.');return;}validation=await api(`/api/cases/${data.id}/validate`,'POST',{version:data.version});const run=validation;data=await api(`/api/cases/${data.id}`);validation=run;stage='Validation';render();message('Validation saved. Filing review is still required.');}));
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
await busy(async()=>{const cases=await api('/api/cases');$('case-picker').innerHTML=cases.map(c=>`<option value="${c.id}">${escape(c.label)}</option>`).join('');if(!cases.length){message('No refund cases found.');return;}await load(cases[0].id);});
