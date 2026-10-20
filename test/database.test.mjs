import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

test('Postgres migration, relationships, immutable evidence and authenticated audit', async () => {
  const db = new PGlite();
  try {
    await db.exec(await readFile(new URL('../db/migrations/001_refund_foundation.sql', import.meta.url), 'utf8'));
    await db.exec('SET search_path = ledger, pg_catalog');
    const insert = async (sql, args = []) => (await db.query(sql + ' RETURNING id', args)).rows[0].id;
    const matt = await insert("INSERT INTO app_user(seat, auth_subject) VALUES ('Matt', 'test-matt')");
    await insert("INSERT INTO app_user(seat, auth_subject) VALUES ('Janna', 'test-janna')");
    await assert.rejects(db.exec("INSERT INTO app_user(seat, auth_subject) VALUES ('Other', 'test-other')"));
    await assert.rejects(db.exec("INSERT INTO customer(legal_name, entity_type) VALUES ('Unauthorized', 'corporation')"), /active authenticated/);
    await db.query("SELECT set_config('ledger.actor_id', $1, false)", [matt]);
    const customer = await insert("INSERT INTO customer(legal_name, dba, entity_type) VALUES ('AJJA, INC.', 'Dairy Queen', 'corporation')");
    const location = await insert("INSERT INTO service_location(customer_id, service_address) VALUES ($1, '117 E Washington St., Mt Pleasant IA 52641')", [customer]);
    const account = await insert("INSERT INTO utility_account(location_id, provider, account_number, fuel) VALUES ($1, 'Synthetic Provider', '2175-01098720', 'electric')", [location]);
    const meter = await insert("INSERT INTO meter(account_id, meter_number) VALUES ($1, 'Synthetic Meter')", [account]);
    const refundCase = await insert("INSERT INTO refund_case(customer_id, location_id, label, assigned_user_id) VALUES ($1, $2, 'Synthetic acceptance test', $3)", [customer, location, matt]);
    await db.query('INSERT INTO case_account(case_id, account_id, location_id) VALUES ($1,$2,$3)', [refundCase, account, location]);
    const document = await insert(`INSERT INTO document(case_id,kind,category,storage_provider,bucket,object_key,object_version,sha256,content_type,byte_length,received_at,created_by)
      VALUES ($1,'source','bills','test','private','original','v1',$2,'application/pdf',10,now(),$3)`, [refundCase, 'a'.repeat(64), matt]);
    await assert.rejects(db.query("UPDATE document SET object_key='overwritten' WHERE id=$1", [document]), /append-only/);
    await assert.rejects(db.query('DELETE FROM document WHERE id=$1', [document]), /append-only/);
    const billSql = `INSERT INTO bill(case_id, account_id, meter_id, source_document_id, source_page, service_section, provider_charge_id,
      service_address, issue_date, service_start, service_end, coverage_basis, original_usage, original_unit,
      normalized_usage, normalized_unit, state_tax_cents, local_tax_cents, corrects_bill_id, correction_issued_date)
      VALUES ($1,$2,$3,$4,1,'electric','charge-1','117 E Washington St., Mt Pleasant IA 52641','2026-04-02','2026-03-01','2026-03-31','service',1000,'kWh',1000,'kWh',$5,100,$6,$7)`;
    const bill = await insert(billSql, [refundCase, account, meter, document, 600, null, null]);
    const correction = await insert(billSql, [refundCase, account, meter, document, 300, bill, '2026-08-01']);
    const effective = (await db.query('SELECT id, state_tax_cents, tax_month FROM effective_bill')).rows;
    assert.equal(effective.length, 1); assert.equal(effective[0].id, correction);
    assert.equal(Number(effective[0].state_tax_cents), 300);
    assert.equal(effective[0].tax_month.toISOString().slice(0, 10), '2026-04-01');
    await assert.rejects(insert(billSql, [refundCase, account, meter, document, 400, bill, '2026-08-02']));
    await assert.rejects(db.query('UPDATE bill SET state_tax_cents=1200 WHERE id=$1', [bill]), /append-only/);
    const otherCustomer = await insert("INSERT INTO customer(legal_name, entity_type) VALUES ('Other', 'corporation')");
    await assert.rejects(insert("INSERT INTO refund_case(customer_id,location_id,label,assigned_user_id) VALUES ($1,$2,'Wrong location',$3)", [otherCustomer, location, matt]), /foreign key/);
    await assert.rejects(insert("INSERT INTO invoice(case_id,customer_id,invoice_number,issued_date,amount_cents) VALUES ($1,$2,'wrong-customer','2026-08-01',100)", [refundCase, otherCustomer]), /foreign key/);
    await assert.rejects(db.query("UPDATE refund_case SET filing_status='filed' WHERE id=$1", [refundCase]), /check constraint/);
    const audits = (await db.query("SELECT * FROM audit_event WHERE table_name='bill'")).rows;
    assert.equal(audits.length, 2); assert.equal(audits[0].actor_id, matt);
    assert.equal(audits[1].new_record.corrects_bill_id, bill);
    await assert.rejects(db.exec('DELETE FROM audit_event'), /append-only/);
    await assert.rejects(db.exec('TRUNCATE audit_event'), /append-only/);
    await db.query('UPDATE app_user SET active=false WHERE id=$1', [matt]);
    await assert.rejects(db.query("UPDATE customer SET dba='Changed' WHERE id=$1", [customer]), /active authenticated/);
  } finally { await db.close(); }
});
