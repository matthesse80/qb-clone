import { readFile } from 'node:fs/promises';
import { dairyQueen } from '../../test/fixtures/dairy-queen.mjs';
export const PREVIEW_SUBJECT = 'local-synthetic-preview';
export async function seedPreview(db) {
  const exists = await db.query("SELECT to_regclass('ledger.refund_case') AS table_name");
  if (!exists.rows[0].table_name) await db.exec(await readFile(new URL('../../db/migrations/001_refund_foundation.sql',import.meta.url),'utf8'));
  if ((await db.query('SELECT id FROM ledger.refund_case LIMIT 1')).rows.length) return;
  await db.transaction(async tx=>{
    const add = async (sql,args=[]) => (await tx.query(sql+' RETURNING id',args)).rows[0].id;
    const d=dairyQueen();
    const user=await add("INSERT INTO ledger.app_user(seat,auth_subject) VALUES('Matt',$1)",[PREVIEW_SUBJECT]);
    await tx.query("SELECT set_config('ledger.actor_id',$1,true)",[user]);
    const customer=await add("INSERT INTO ledger.customer(legal_name,dba,entity_type) VALUES($1,$2,'corporation')",[d.customer.legalName,d.customer.dba]);
    const location=await add('INSERT INTO ledger.service_location(customer_id,service_address) VALUES($1,$2)',[customer,d.account.serviceAddress]);
    const account=await add("INSERT INTO ledger.utility_account(location_id,provider,account_number,fuel) VALUES($1,'Sample utility provider',$2,'electric')",[location,d.account.accountNumber]);
    const meter=await add("INSERT INTO ledger.meter(account_id,meter_number) VALUES($1,'SAMPLE-METER')",[account]);
    const c=await add(`INSERT INTO ledger.refund_case(customer_id,location_id,label,assigned_user_id,stage,intended_filing_date,ia843_signature_date)
      VALUES($1,$2,'Dairy Queen Mt. Pleasant',$3,'Study',$4,$5)`,[customer,location,user,d.claim.filingDate,d.claim.ia843SignatureDate]);
    await tx.query(`INSERT INTO ledger.case_account(case_id,account_id,location_id,prior_filed_through,prior_history_evidence,approved_claim_start,approved_claim_end)
      VALUES($1,$2,$3,$4,'SYNTHETIC history for demonstration',$5,$6)`,[c,account,location,d.account.priorFiledThrough,d.claim.approvedStart,d.claim.approvedEnd]);
    const doc=await add(`INSERT INTO ledger.document(case_id,kind,category,storage_provider,bucket,object_key,object_version,sha256,content_type,byte_length,received_at,created_by)
      VALUES($1,'source','Sample bills — no actual file','preview','none','synthetic-bills','sample',$2,'application/pdf',1,now(),$3)`,[c,'0'.repeat(64),user]);
    const study=await add(`INSERT INTO ledger.energy_study(case_id,account_id,claimant_name,service_address,period_start,period_end,modeled_exempt_usage,modeled_nonexempt_usage,unit)
      VALUES($1,$2,$3,$4,$5,$6,9000,3000,'kWh')`,[c,account,d.customer.legalName,d.account.serviceAddress,d.study.periodStart,d.study.periodEnd]);
    await tx.query('INSERT INTO ledger.study_meter(study_id,case_id,account_id,meter_id,included) VALUES($1,$2,$3,$4,true)',[study,c,account,meter]);
    for (const b of d.bills) {
      const bill=await add(`INSERT INTO ledger.bill(case_id,account_id,meter_id,source_document_id,source_page,service_section,provider_charge_id,service_address,
        issue_date,service_start,service_end,coverage_basis,original_usage,original_unit,normalized_usage,normalized_unit,state_tax_cents,local_tax_cents)
        VALUES($1,$2,$3,$4,$5,'electric',$6,$7,$8,$9,$10,'service',1000,'kWh',1000,'kWh',600,100)`,
        [c,account,meter,doc,b.sourcePage,b.id,b.serviceAddress,b.issueDate,b.serviceStart,b.serviceEnd]);
      await tx.query('INSERT INTO ledger.study_bill(study_id,case_id,account_id,bill_id) VALUES($1,$2,$3,$4)',[study,c,account,bill]);
    }
    await tx.query(`INSERT INTO ledger.follow_up(case_id,due_date,next_action,assigned_user_id)
      VALUES($1,'2026-10-05','Collect verified source bills, study dates and prior filing records.',$2)`,[c,user]);
  });
}
