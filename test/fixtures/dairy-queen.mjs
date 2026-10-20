// Confirmed customer identity; ALL study/bill dates, meters, usage, taxes and
// signer/form records below are SYNTHETIC. Never seed these as a verified claim.
import { studyDate, taxPeriod } from '../../src/refunds/rules.mjs';
export function dairyQueen() {
  const serviceAddress = '117 E Washington St., Mt Pleasant IA 52641';
  const customer = { id: 'dq', legalName: 'AJJA, INC.', dba: 'Dairy Queen', entityType: 'corporation',
    registrationAmbiguous: false, verifiedOwnerHasSsn: false };
  const account = { id: 'dq-electric', accountNumber: '2175-01098720', fuel: 'electric',
    meterIds: ['synthetic-meter'], serviceAddress, priorFiledThrough: '2025-10-31' };
  const bills = Array.from({ length: 12 }, (_, i) => {
    const start = new Date(Date.UTC(2025, 6 + i, 1)).toISOString().slice(0, 10);
    const end = new Date(Date.UTC(2025, 7 + i, 0)).toISOString().slice(0, 10);
    const issueDate = new Date(Date.UTC(2025, 7 + i, 2)).toISOString().slice(0, 10);
    return { id: `bill-${i + 1}`, accountId: account.id, meterId: account.meterIds[0], fuel: 'electric',
      serviceAddress, serviceSection: 'synthetic-electric', issueDate, serviceStart: start, serviceEnd: end,
      originalUsage: 1000, originalUnit: 'kWh', normalizedUsage: 1000, normalizedUnit: 'kWh',
      stateTaxCents: 600, localTaxCents: 100, sourceDocumentId: 'synthetic-bills', sourcePage: i + 1,
      taxMonth: taxPeriod(issueDate).month, taxQuarter: taxPeriod(issueDate).quarter };
  });
  const study = { id: 'study', accountId: account.id, fuel: 'electric', meterIds: [...account.meterIds],
    serviceAddress, billIds: bills.map(b => b.id), periodStart: bills[0].serviceStart, periodEnd: bills.at(-1).serviceEnd,
    displayStart: studyDate(bills[0].serviceStart), displayEnd: studyDate(bills.at(-1).serviceEnd),
    modeledExemptUsage: 9000, modeledNonexemptUsage: 3000, unit: 'kWh' };
  const claim = { bills, account, filingDate: '2026-08-15', approvedStart: '2025-11-01', approvedEnd: '2026-07-31',
    ia843SignatureDate: '2026-03-01', cutoffBasis: 'approved-claim-period' };
  const filing = { customer, studyClaimant: customer.legalName, ia843Claimant: customer.legalName,
    poas: [{ kind: 'entity', taxpayerName: customer.legalName, identityVerified: true,
      identityEvidenceDocumentId: 'synthetic-identity', periodStart: '11/25', periodEnd: '07/26' }],
    signer: { verified: true, verifiedName: 'Synthetic Signer', printedName: 'Synthetic Signer', evidenceDocumentId: 'synthetic-signer-history' },
    lowerLocalSchedule: [] };
  return { synthetic: true, customer, account, bills, study, claim, filing };
}
