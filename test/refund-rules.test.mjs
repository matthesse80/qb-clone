import test from 'node:test';
import assert from 'node:assert/strict';
import { dairyQueen } from './fixtures/dairy-queen.mjs';
import { date, studyDate, taxPeriod, lookbackDate, addressMatches, effectiveBills, validateStudy,
  selectClaimBills, validateFilingIdentity, validateDocument } from '../src/refunds/rules.mjs';
const codes = result => (result.flags ?? result).map(f => f.code);

test('Dairy Queen identity and synthetic fixture pass study and identity checks', () => {
  const d = dairyQueen();
  assert.equal(d.account.accountNumber, '2175-01098720');
  assert.equal(d.customer.legalName, 'AJJA, INC.');
  assert.equal(d.synthetic, true);
  assert.equal(validateStudy(d.study, d.bills, d.account).valid, true);
  assert.deepEqual(validateFilingIdentity(d.filing), []);
});
test('wrong study dates and wrong display format are caught separately', () => {
  const d = dairyQueen();
  d.study.periodStart = '2025-07-21';
  assert.ok(codes(validateStudy(d.study, d.bills, d.account)).includes('STUDY_DATES'));
  d.study = dairyQueen().study;
  d.study.displayStart = '2025-07-01';
  assert.ok(codes(validateStudy(d.study, d.bills, d.account)).includes('STUDY_DATE_FORMAT'));
  assert.equal(studyDate('2025-07-21'), '07/21/2025');
  assert.throws(() => date('2025-02-29'));
  assert.equal(lookbackDate('2024-02-29'), '2021-02-28');
});
test('signature is never a claim cutoff; later bills remain included', () => {
  const d = dairyQueen();
  const r = selectClaimBills(d.claim);
  assert.equal(r.ready, true);
  assert.equal(r.included.length, 9);
  assert.ok(r.included.some(b => b.issueDate > d.claim.ia843SignatureDate));
  d.claim.ia843SignatureDate = '2025-01-01';
  assert.deepEqual(selectClaimBills(d.claim), r);
  d.claim.cutoffBasis = 'ia843-signature';
  assert.ok(codes(selectClaimBills(d.claim)).includes('SIGNATURE_CUTOFF'));
  assert.equal(selectClaimBills(d.claim).stateTaxCents, null);
});
test('corporation does not inherit LLC dual-POA requirement', () => {
  const { filing } = dairyQueen();
  filing.poas.push({ ...filing.poas[0], kind: 'individual', taxpayerName: 'Synthetic Signer' });
  assert.ok(codes(validateFilingIdentity(filing)).includes('POA_ENTITY'));
  filing.customer.entityType = 'llc';
  filing.customer.verifiedOwnerHasSsn = true;
  filing.customer.verifiedOwnerName = 'Synthetic Signer';
  assert.deepEqual(validateFilingIdentity(filing), []);
  filing.poas.pop();
  assert.ok(codes(validateFilingIdentity(filing)).includes('POA_ENTITY'));
  filing.ia843Claimant = 'Synthetic Signer';
  assert.ok(codes(validateFilingIdentity(filing)).includes('CLAIMANT_ENTITY'));
});
test('service-address mismatch blocks both study and claim; mailing address is irrelevant', () => {
  const d = dairyQueen();
  d.bills[4].serviceAddress = '999 Other Street';
  d.bills[4].mailingAddress = d.account.serviceAddress;
  assert.ok(codes(validateStudy(d.study, d.bills, d.account)).includes('SERVICE_ADDRESS'));
  assert.equal(selectClaimBills(d.claim).ready, false);
  assert.equal(addressMatches('', ''), false);
  assert.equal(addressMatches(d.account.serviceAddress, '117 E Washington St'), false);
  assert.equal(addressMatches(d.account.serviceAddress, '117 E Washington St', { approved: true, actorId: 'matt',
    evidenceDocumentId: 'source', expected: d.account.serviceAddress, observed: '117 E Washington St' }), true);
});
test('tax quarter follows issue date across a service-quarter boundary', () => {
  const d = dairyQueen();
  const bill = d.bills[8]; // March service, April issue.
  assert.equal(bill.serviceEnd, '2026-03-31');
  assert.deepEqual(taxPeriod(bill.issueDate), { month: '2026-04', quarter: '2026-Q2' });
  bill.taxQuarter = '2026-Q1';
  assert.ok(codes(selectClaimBills(d.claim)).includes('TAX_PERIOD'));
});
test('corrected bills replace originals in taxes and study usage; stale selections fail', () => {
  const d = dairyQueen();
  const original = d.bills[8];
  const correction = { ...original, id: 'correction', correctsBillId: original.id,
    correctionIssuedDate: '2026-08-01', stateTaxCents: 300, originalUsage: 900, normalizedUsage: 900 };
  d.bills.push(correction);
  const r = selectClaimBills(d.claim);
  assert.equal(r.included.length, 9);
  assert.equal(r.stateTaxCents, 5100);
  assert.ok(!r.included.some(b => b.id === original.id));
  assert.ok(codes(validateStudy(d.study, d.bills, d.account)).includes('STUDY_BILL_SELECTION'));
  d.study.billIds[8] = correction.id;
  assert.equal(validateStudy(d.study, d.bills, d.account).actualUsage, 11900);
  assert.equal(validateStudy(d.study, d.bills, d.account).valid, true);
});
test('correction forks, cycles and cross-account corrections fail closed', () => {
  const d = dairyQueen();
  const a = d.bills[0];
  const correction = { ...a, id: 'correction', correctsBillId: a.id };
  assert.equal(effectiveBills([...d.bills, correction, { ...correction, id: 'fork' }]).bills.length, 0);
  assert.equal(effectiveBills([...d.bills, { ...correction, accountId: 'other' }]).bills.length, 0);
  a.correctsBillId = correction.id;
  assert.ok(codes(effectiveBills([...d.bills, correction])).includes('CORRECTION_CYCLE'));
});
test('study/prior refund overlap is allowed but previously claimed tax is excluded', () => {
  const d = dairyQueen();
  assert.equal(validateStudy(d.study, d.bills, d.account).actualUsage, 12000);
  assert.equal(selectClaimBills(d.claim).excluded.filter(b => b.reason === 'previously-claimed').length, 3);
  d.claim.filingDate = '2029-01-15';
  assert.ok(codes(selectClaimBills(d.claim)).includes('LOOKBACK'));
  assert.ok(selectClaimBills(d.claim).excluded.some(b => b.reason === 'lookback'));
});
test('12 bills are required and continuity uses coverage, not distinct issue months', () => {
  const d = dairyQueen();
  d.bills[1].issueDate = d.bills[0].issueDate;
  assert.equal(validateStudy(d.study, d.bills, d.account).valid, true);
  d.bills[4].serviceStart = '2025-11-03';
  assert.ok(codes(validateStudy(d.study, d.bills, d.account)).includes('SERVICE_CONTINUITY'));
  d.study.billIds.pop();
  assert.ok(codes(validateStudy(d.study, d.bills, d.account)).includes('TWELVE_BILLS'));
});
test('modeled usage must be within inclusive +/-5%; zero or mismatched units fail', () => {
  const d = dairyQueen();
  for (const exempt of [8400, 9600]) {
    d.study.modeledExemptUsage = exempt;
    assert.equal(validateStudy(d.study, d.bills, d.account).valid, true);
  }
  d.study.modeledExemptUsage = 9601;
  assert.ok(codes(validateStudy(d.study, d.bills, d.account)).includes('MODELED_VARIANCE'));
  d.bills[0].normalizedUnit = 'therms';
  assert.ok(codes(validateStudy(d.study, d.bills, d.account)).includes('USAGE_UNITS'));
});
test('signer evidence and blank lower local-option schedule are controlled', () => {
  const { filing } = dairyQueen();
  filing.signer.ambiguous = true;
  filing.lowerLocalSchedule = [{ county: 'Henry', amount: 100 }];
  const flags = codes(validateFilingIdentity(filing));
  assert.ok(flags.includes('SIGNER_NAME'));
  assert.ok(flags.includes('IA843_LOWER_SCHEDULE'));
});
test('derivative cannot overwrite or sever same-case original source evidence', () => {
  const source = { id: 'source', caseId: 'dq', kind: 'source', objectKey: 'original', objectVersion: '1', sha256: 'a'.repeat(64) };
  const derivative = { ...source, id: 'derivative', kind: 'derivative', sourceDocumentId: 'source', objectKey: 'completed',
    generatedBy: 'matt', fieldProvenance: { printedName: 'verified-history' } };
  assert.deepEqual(validateDocument(derivative, [source]), []);
  derivative.objectKey = source.objectKey;
  assert.ok(codes(validateDocument(derivative, [source])).includes('DERIVATIVE_DOCUMENT'));
  derivative.objectKey = 'completed'; derivative.caseId = 'other';
  assert.ok(codes(validateDocument(derivative, [source])).includes('DERIVATIVE_DOCUMENT'));
});
