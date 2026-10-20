import { createHash } from 'node:crypto';
import { date, studyDate, validateStudy, selectClaimBills } from '../refunds/rules.mjs';

export class WorkspaceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const iso = value => value instanceof Date ? value.toISOString().slice(0, 10) : value;
const one = async (db, sql, values) => (await db.query(sql, values)).rows[0];

export class Workspace {
  constructor(db, { preview = false } = {}) { this.db = db; this.preview = preview; }
  async actor(subject, db = this.db) {
    const actor = await one(db, 'SELECT id, seat FROM ledger.app_user WHERE auth_subject=$1 AND active', [subject]);
    if (!actor) throw new WorkspaceError(403, 'Access is limited to the configured Matt and Janna accounts.');
    return actor;
  }
  async list(subject) {
    await this.actor(subject);
    return (await this.db.query(`SELECT c.id,c.label,c.stage,c.filing_status,cu.legal_name,cu.dba,l.service_address
      FROM ledger.refund_case c JOIN ledger.customer cu ON cu.id=c.customer_id
      JOIN ledger.service_location l ON l.id=c.location_id ORDER BY c.created_at`)).rows;
  }
  async read(subject, id, db = this.db) {
    const actor = await this.actor(subject, db);
    const row = await one(db, `SELECT c.*,cu.legal_name,cu.dba,cu.entity_type,l.service_address
      FROM ledger.refund_case c JOIN ledger.customer cu ON cu.id=c.customer_id
      JOIN ledger.service_location l ON l.id=c.location_id WHERE c.id=$1`, [id]);
    if (!row) throw new WorkspaceError(404, 'Refund case not found.');
    const accountRows = (await db.query(`SELECT a.*,ca.prior_filed_through,ca.approved_claim_start,ca.approved_claim_end
      FROM ledger.case_account ca JOIN ledger.utility_account a ON a.id=ca.account_id WHERE ca.case_id=$1`, [id])).rows;
    const accounts = [];
    for (const a of accountRows) {
      const meters = (await db.query('SELECT id,meter_number FROM ledger.meter WHERE account_id=$1', [a.id])).rows;
      const account = { id:a.id, provider:a.provider, accountNumber:a.account_number, fuel:a.fuel,
        serviceAddress:row.service_address, meterIds:meters.map(m=>m.id), meters,
        priorFiledThrough:iso(a.prior_filed_through) };
      const bills = (await db.query('SELECT * FROM ledger.bill WHERE case_id=$1 AND account_id=$2 ORDER BY service_start, issue_date, id', [id,a.id])).rows.map(b=>({
        id:b.id, accountId:b.account_id, meterId:b.meter_id, fuel:a.fuel, serviceAddress:b.service_address,
        serviceSection:b.service_section, issueDate:iso(b.issue_date), serviceStart:iso(b.service_start), serviceEnd:iso(b.service_end),
        normalizedUsage:Number(b.normalized_usage), normalizedUnit:b.normalized_unit,
        originalUsage:Number(b.original_usage), originalUnit:b.original_unit, conversionMethod:b.conversion_method,
        sourceDocumentId:b.source_document_id, sourcePage:b.source_page, correctsBillId:b.corrects_bill_id,
        stateTaxCents:Number(b.state_tax_cents), localTaxCents:Number(b.local_tax_cents)
      }));
      const s = await one(db, 'SELECT * FROM ledger.energy_study WHERE case_id=$1 AND account_id=$2 ORDER BY id LIMIT 1', [id,a.id]);
      let study = null;
      if (s) {
        const included = (await db.query('SELECT meter_id FROM ledger.study_meter WHERE study_id=$1 AND included', [s.id])).rows;
        const selected = (await db.query('SELECT bill_id FROM ledger.study_bill WHERE study_id=$1', [s.id])).rows;
        study = { id:s.id, accountId:a.id, fuel:a.fuel, serviceAddress:s.service_address, meterIds:included.map(m=>m.meter_id),
          billIds:selected.map(b=>b.bill_id), periodStart:iso(s.period_start), periodEnd:iso(s.period_end),
          displayStart:studyDate(iso(s.period_start)), displayEnd:studyDate(iso(s.period_end)),
          modeledExemptUsage:Number(s.modeled_exempt_usage), modeledNonexemptUsage:Number(s.modeled_nonexempt_usage), unit:s.unit };
      }
      const claim = { filingDate:iso(row.intended_filing_date), approvedStart:iso(a.approved_claim_start),
        approvedEnd:iso(a.approved_claim_end), ia843SignatureDate:iso(row.ia843_signature_date), cutoffBasis:'approved-claim-period' };
      let validation;
      try {
        const studyResult = study ? validateStudy(study,bills,account) : {flags:[{code:'STUDY_REQUIRED',message:'Add a study before validation.',severity:'blocking'}]};
        const claimResult = selectClaimBills({...claim,bills,account});
        validation = {study:studyResult,claim:claimResult,flags:[...studyResult.flags,...claimResult.flags]};
      } catch { validation = {flags:[{code:'INCOMPLETE_INPUT',message:'Complete the filing and study dates before validation.',severity:'blocking'}]}; }
      accounts.push({account,bills,study,claim,validation});
    }
    const documents = (await db.query('SELECT id,kind,category,created_at,source_document_id FROM ledger.document WHERE case_id=$1 ORDER BY created_at', [id])).rows;
    const followups = (await db.query(`SELECT f.id,f.due_date,f.next_action,f.completed_at FROM ledger.follow_up f WHERE f.case_id=$1
      ORDER BY (SELECT max(e.id) FROM ledger.audit_event e WHERE e.table_name='follow_up' AND e.record_id=f.id::text)`, [id])).rows;
    const activity = (await db.query(`SELECT e.id,e.occurred_at,u.seat,e.table_name,e.operation FROM ledger.audit_event e
      JOIN ledger.app_user u ON u.id=e.actor_id WHERE e.record_id=$1 OR e.new_record->>'case_id'=$1 OR e.old_record->>'case_id'=$1
      ORDER BY e.id DESC LIMIT 30`, [id])).rows;
    return {id,version:row.version,label:row.label,stage:row.stage,status:row.filing_status,preview:this.preview,actor:actor.seat,
      customer:{legalName:row.legal_name,dba:row.dba,entityType:row.entity_type,serviceAddress:row.service_address},
      accounts,documents,followups:followups.map(f=>({...f,due_date:iso(f.due_date)})),activity};
  }
  async update(subject, id, input) {
    const allowed = ['version','accountId','studyStart','studyEnd','modeledExemptUsage','modeledNonexemptUsage','claimStart','claimEnd','filingDate','nextAction','followupDate'];
    if (!input || Object.keys(input).some(k=>!allowed.includes(k)) || !Number.isInteger(input.version)) throw new WorkspaceError(400,'Invalid update fields.');
    try {
      for (const k of ['studyStart','studyEnd','claimStart','claimEnd','filingDate','followupDate']) date(input[k]);
      if (input.studyEnd<input.studyStart || input.claimEnd<input.claimStart || input.claimEnd>input.filingDate) throw new Error();
      for (const k of ['modeledExemptUsage','modeledNonexemptUsage']) if (!Number.isFinite(input[k]) || input[k]<0 || input[k]>1e12) throw new Error();
      if (typeof input.nextAction !== 'string' || !input.nextAction.trim() || input.nextAction.length>2000) throw new Error();
    } catch { throw new WorkspaceError(400,'Enter valid ordered dates, nonnegative usage and a next action.'); }
    return this.db.transaction(async tx=>{
      const actor = await this.actor(subject,tx);
      await tx.query("SELECT set_config('ledger.actor_id',$1,true)",[actor.id]);
      const updated = await tx.query(`UPDATE ledger.refund_case SET version=version+1,intended_filing_date=$1,filing_status='draft'
        WHERE id=$2 AND version=$3 AND filing_status IN ('draft','review') RETURNING id`,[input.filingDate,id,input.version]);
      if (!updated.rows.length) throw new WorkspaceError(409,'This case changed or is locked. Reload before editing.');
      const account = await tx.query(`UPDATE ledger.case_account SET approved_claim_start=$1,approved_claim_end=$2,
        period_approved_by=NULL,period_decision_note='Draft period edited; approval required' WHERE case_id=$3 AND account_id=$4 RETURNING case_id`,
        [input.claimStart,input.claimEnd,id,input.accountId]);
      if (!account.rows.length) throw new WorkspaceError(400,'Account does not belong to this case.');
      const studies = await tx.query(`UPDATE ledger.energy_study SET period_start=$1,period_end=$2,modeled_exempt_usage=$3,
        modeled_nonexempt_usage=$4,status='draft' WHERE case_id=$5 AND account_id=$6 RETURNING id`,
        [input.studyStart,input.studyEnd,input.modeledExemptUsage,input.modeledNonexemptUsage,id,input.accountId]);
      if (studies.rows.length!==1) throw new WorkspaceError(409,'This account requires a single draft study before editing.');
      const before = await this.read(subject,id,tx);
      const previous = before.followups.at(-1);
      if (!previous || previous.due_date!==input.followupDate || previous.next_action!==input.nextAction.trim())
        await tx.query('INSERT INTO ledger.follow_up(case_id,due_date,next_action,assigned_user_id) VALUES ($1,$2,$3,$4)',
          [id,input.followupDate,input.nextAction.trim(),actor.id]);
      return this.read(subject,id,tx);
    });
  }
  async validate(subject,id,version) {
    if (!Number.isInteger(version)) throw new WorkspaceError(400,'Case version required.');
    return this.db.transaction(async tx=>{
      const actor = await this.actor(subject,tx);
      await tx.query("SELECT set_config('ledger.actor_id',$1,true)",[actor.id]);
      const locked = await one(tx,'SELECT version FROM ledger.refund_case WHERE id=$1 FOR UPDATE',[id]);
      if (!locked || locked.version!==version) throw new WorkspaceError(409,'Case changed. Reload and validate again.');
      const data = await this.read(subject,id,tx);
      const flags = data.accounts.flatMap(a=>a.validation.flags);
      const gate = {code:'FILING_REVIEW_REQUIRED',severity:'blocking',message:'Source evidence, signer/POA review, workbook reconciliation and form review are required before filing.'};
      const result = {flags:[...flags,gate],accounts:data.accounts.map(a=>({accountId:a.account.id,...a.validation})),filingReady:false};
      const hash = createHash('sha256').update(JSON.stringify(data.accounts)).digest('hex');
      const run = await one(tx,`INSERT INTO ledger.validation_run(case_id,case_version,rules_version,input_sha256,result,created_by)
        VALUES($1,$2,'phase2-1',$3,$4,$5) RETURNING id`,[id,version,hash,JSON.stringify(result),actor.id]);
      for (const f of result.flags) await tx.query(`INSERT INTO ledger.validation_flag(case_id,validation_run_id,rule_code,record_reference,severity,message)
        VALUES($1,$2,$3,$4,$5,$6)`,[id,run.id,f.code,f.recordId??id,f.severity,f.message]);
      return {...result,runId:run.id};
    });
  }
}
