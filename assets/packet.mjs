const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(n/100);
const detail=(k,v)=>`<div class="detail"><small>${esc(k)}</small>${esc(v)}</div>`;
export function packetPanel(packet,id,selected){
 const b=packet.bills.find(b=>String(b.sourcePage)===selected)??packet.bills[0];
 const base=`/api/cases/${id}/packet`;
 return `<p class="notice">Draft transcription. Tax allocation and correction-history review pending. These records are not included in refund calculations.</p>
 <label>Statement<select id="bill-picker">${packet.bills.map(x=>`<option value="${x.sourcePage}"${x.sourcePage===b.sourcePage?' selected':''}>${esc(x.issueDate)} · page ${x.sourcePage}</option>`).join('')}</select></label>
 <div class="evidence-layout"><div><a href="${base}/original#page=${b.sourcePage}" target="_blank" rel="noopener">Open original PDF</a><a href="${base}/pages/${b.sourcePage}" target="_blank" rel="noopener"><img class="source-page" src="${base}/pages/${b.sourcePage}" alt="Source statement page ${b.sourcePage}"></a></div><div><h3>Draft statement values</h3>
 ${detail('Account / service address',`${packet.accountNumber} / ${packet.serviceAddress}`)}
 ${detail('Issue date / tax month',`${b.issueDate} / ${b.issueDate.slice(0,7)}`)}
 ${detail('Meter reading dates',`${b.serviceStart} – ${b.serviceEnd}`)}${detail('Electric usage',`${b.usage.toLocaleString()} kWh`)}
 ${detail('Electric charge',money(b.electricCents))}${detail('Water / sewer',`${money(b.waterCents)} / ${money(b.sewerCents)}`)}${detail('Garbage / landfill',`${money(b.garbageCents)} / ${money(b.landfillCents)}`)}
 ${detail('Combined statement sales tax',money(b.combinedTaxCents))}${detail('Statement total',money(b.totalCents))}${detail('Line-item reconciliation',b.reconciliationDifferenceCents===0?'Matches statement total':money(b.reconciliationDifferenceCents))}
 ${detail('Electric state / local tax','Pending allocation — not zero')}${detail('Correction status','History reconciliation pending')}</div></div>`;
}
export function packetSources(packet,id){return `<h3>${esc(packet.filename)}</h3><p>${packet.pageCount} pages · ${packet.bills.length} draft statements. Original and blank reverse pages retained.</p><p>${esc(packet.extractionMethod)}</p><p><a href="/api/cases/${id}/packet/original" target="_blank" rel="noopener">Open complete original PDF</a></p><button data-go="Bills">Review extracted bills</button><h3>Account history</h3><p>Supporting history is not counted as additional bills.</p>${packet.historyPages.map(n=>`<a href="/api/cases/${id}/packet/pages/${n}" target="_blank" rel="noopener">Page ${n}</a> `).join('')}<p>Still needed: study and inventory, prior filing evidence, signer records and approved form masters.</p>`;}

export function packetStudy(packet){
 const s=packet.studyReview;if(!s)return '<p>Study source needed.</p>';
 const modeled=s.modeledExemptUsage+s.modeledNonexemptUsage;
 const variance=(modeled/s.actualUsage-1)*100;
 const date=v=>`${v.slice(5,7)}/${v.slice(8,10)}/${v.slice(0,4)}`;
 return `<p class="notice">Draft carry-forward study. Original workbook preserved. Equipment and operating assumptions confirmed by ${esc(s.equipmentConfirmedBy)}. Bill and tax approval remains pending.</p>${detail('Study period',`${date(s.periodStart)} – ${date(s.periodEnd)}`)}${detail('Actual usage',`${s.actualUsage.toLocaleString()} kWh`)}${detail('Modeled exempt / non-exempt usage',`${s.modeledExemptUsage.toLocaleString()} / ${s.modeledNonexemptUsage.toLocaleString()} kWh`)}${detail('Modeled total',`${modeled.toLocaleString()} kWh`)}${detail('Usage variance',`${variance.toFixed(2)}% (within ±5%: ${Math.abs(variance)<=5?'yes':'no'})`)}${detail('Exempt percentage',`${(100*s.modeledExemptUsage/modeled).toFixed(2)}%`)}${detail('Original workbook period',`${date(s.originalPeriodStart)} – ${date(s.originalPeriodEnd)}`)}<h3>Prior refund</h3>${detail('Documented claim through',date(packet.priorRefund.claimEnd))}${detail('Prior claimed refund',money(packet.priorRefund.totalRefundCents))}<p>Payment not verified. The prior claim period does not set the study period.</p><h3>Reconciliation</h3><p>${esc(packet.historyReview.status)}</p><ul>${packet.historyReview.issues.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`;
}

export function packetCalculations(packet){
 const calc=packet.historicalCalculationDraft;if(!calc)return '<p>Historical reconstruction pending.</p>';
 const quarters=Object.entries(calc.quarters);
 const total=quarters.reduce((n,[,q])=>n+q.candidateStateRefundCents+q.candidateLocalRefundCents,0);
 return `<p class="notice">Draft estimate only. Historical local-tax evidence, reconstruction methodology and final approval remain pending. Not ready to file.</p>${detail('Candidate refund',money(total))}${detail('Monthly records',calc.rows.length)}${detail('Planned filing / lookback',`${packet.claimPlanning.plannedFilingDate} / ${packet.claimPlanning.lookbackStart}`)}<p>Quarter assignment follows bill issue date. Refund estimate uses 29.22% of reconstructed electric tax. Water and other service taxes are excluded from this estimate.</p><table><thead><tr><th>Quarter</th><th>Bills</th><th>State refund</th><th>Local refund</th></tr></thead><tbody>${quarters.map(([period,q])=>`<tr><td>${esc(period)}</td><td>${q.billCount}</td><td>${money(q.candidateStateRefundCents)}</td><td>${money(q.candidateLocalRefundCents)}</td></tr>`).join('')}</tbody></table><h3>Reconciliation</h3><p>${esc(calc.rebateFinding)}</p><p>All 36 totals and combined-tax amounts match the candidate reconstruction to the cent. Electric combined tax is rounded at 7%; state is rounded at 6% and local receives the remainder. Quarterly refunds are rounded separately. This rounding method requires final review.</p>`;
}
