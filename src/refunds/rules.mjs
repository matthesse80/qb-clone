// Business policy: REFUND_STUDY_REQUIREMENTS.md. Pure functions; no browser storage.
export const STAGES = Object.freeze(['Customer', 'Utility Accounts', 'Source Docs', 'Study',
  'Bills', 'Validation', 'Calculations', 'State Forms', 'Filing', 'Follow-up', 'Refund', 'Invoice']);

export function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Expected ISO calendar date');
  const parsed = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(+parsed) || parsed.toISOString().slice(0, 10) !== value) throw new Error('Invalid calendar date');
  return parsed;
}
export function studyDate(value) {
  date(value);
  return `${value.slice(5, 7)}/${value.slice(8, 10)}/${value.slice(0, 4)}`;
}
export function taxPeriod(issueDate) {
  date(issueDate);
  return { month: issueDate.slice(0, 7), quarter: `${issueDate.slice(0, 4)}-Q${Math.ceil(Number(issueDate.slice(5, 7)) / 3)}` };
}
export function lookbackDate(filingDate) {
  const d = date(filingDate);
  const year = d.getUTCFullYear() - 3;
  const day = Math.min(d.getUTCDate(), new Date(Date.UTC(year, d.getUTCMonth() + 1, 0)).getUTCDate());
  return new Date(Date.UTC(year, d.getUTCMonth(), day)).toISOString().slice(0, 10);
}
const dayAfter = value => new Date(+date(value) + 86400000).toISOString().slice(0, 10);
const flag = (code, recordId, message) => ({ code, recordId, severity: 'blocking', message });
const identity = bill => [bill.accountId, bill.meterId, bill.fuel, bill.serviceSection].join('|');
const addressKey = value => String(value ?? '').toUpperCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();

// Exact normalized matching by default. A shortened/provider-specific address needs
// an explicit reviewed match with evidence; never match only on a mailing address.
export function addressMatches(expected, observed, review) {
  return Boolean(addressKey(expected) && addressKey(expected) === addressKey(observed)) ||
    Boolean(review?.approved && review?.actorId && review?.evidenceDocumentId &&
      review.expected === expected && review.observed === observed);
}

export function effectiveBills(bills) {
  const ids = new Map();
  const replaced = new Set();
  const flags = [];
  for (const bill of bills) {
    if (!bill.id || ids.has(bill.id)) flags.push(flag('DUPLICATE_BILL', bill.id, 'Bill IDs must be unique.'));
    ids.set(bill.id, bill);
  }
  for (const bill of bills.filter(b => b.correctsBillId)) {
    const original = ids.get(bill.correctsBillId);
    if (!original || identity(original) !== identity(bill) || original.serviceStart !== bill.serviceStart ||
        original.serviceEnd !== bill.serviceEnd || original.issueDate !== bill.issueDate) {
      flags.push(flag('CORRECTION_LINK', bill.id, 'Correction must identify the same original charge, account, meter, fuel and issue date.'));
    }
    if (replaced.has(bill.correctsBillId)) flags.push(flag('CORRECTION_FORK', bill.id, 'Conflicting correction branches require review.'));
    replaced.add(bill.correctsBillId);
    const seen = new Set([bill.id]);
    let parent = bill.correctsBillId;
    while (parent) {
      if (seen.has(parent)) { flags.push(flag('CORRECTION_CYCLE', bill.id, 'Correction chain contains a cycle.')); break; }
      seen.add(parent);
      parent = ids.get(parent)?.correctsBillId;
    }
  }
  return { bills: flags.length ? [] : bills.filter(b => !replaced.has(b.id)), flags };
}

export function validateStudy(study, allBills, account) {
  const result = effectiveBills(allBills);
  const flags = [...result.flags];
  const selected = result.bills.filter(b => study.billIds.includes(b.id));
  if (study.accountId !== account.id || study.fuel !== account.fuel || !study.meterIds.length ||
      study.meterIds.some(id => !account.meterIds.includes(id))) flags.push(flag('STUDY_LINKAGE', study.id, 'Select the exact account, fuel and included meters.'));
  if (!addressMatches(account.serviceAddress, study.serviceAddress, study.addressReview))
    flags.push(flag('SERVICE_ADDRESS', study.id, 'Study location differs from the service address.'));
  if (new Set(study.billIds).size !== study.billIds.length || selected.length !== study.billIds.length)
    flags.push(flag('STUDY_BILL_SELECTION', study.id, 'Select unique final corrected bill records; obsolete or missing bills cannot be used.'));
  if (selected.some(b => b.accountId !== study.accountId || b.fuel !== study.fuel || !study.meterIds.includes(b.meterId)))
    flags.push(flag('STUDY_LINKAGE', study.id, 'Study includes an unrelated account, fuel or meter.'));
  let actualUsage = 0;
  for (const meter of study.meterIds) {
    const meterBills = selected.filter(b => b.meterId === meter).sort((a, b) => String(a.serviceStart).localeCompare(String(b.serviceStart)));
    if (meterBills.length !== 12) flags.push(flag('TWELVE_BILLS', study.id, `Meter ${meter} requires 12 consecutive bills, not 12 calendar months.`));
    const available = result.bills.filter(b => b.accountId === study.accountId && b.fuel === study.fuel && b.meterId === meter)
      .sort((a, b) => String(a.serviceStart).localeCompare(String(b.serviceStart)));
    const indices = meterBills.map(b => available.indexOf(b));
    if (indices.some((n, i) => i && n !== indices[i - 1] + 1)) flags.push(flag('NONCONSECUTIVE_BILLS', study.id, 'An available bill was skipped.'));
    for (let i = 0; i < meterBills.length; i++) {
      const bill = meterBills[i];
      if (!addressMatches(account.serviceAddress, bill.serviceAddress, bill.addressReview)) flags.push(flag('SERVICE_ADDRESS', bill.id, 'Bill service address conflicts with the study location.'));
      try {
        if (date(bill.serviceEnd) < date(bill.serviceStart)) throw new Error();
        if (i) {
          const gap = (+date(bill.serviceStart) - +date(meterBills[i - 1].serviceEnd)) / 86400000;
          if (gap > 1 || gap < 0) flags.push(flag('SERVICE_CONTINUITY', bill.id, 'Coverage has a gap or overlapping periods; review before finalizing.'));
        }
      } catch { flags.push(flag('COVERAGE_UNVERIFIED', bill.id, 'Reliable coverage dates are required; inferred cadence requires manual review.')); }
      if (!Number.isFinite(bill.normalizedUsage) || bill.normalizedUsage < 0 || bill.normalizedUnit !== study.unit ||
          !Number.isFinite(bill.originalUsage) || bill.originalUsage < 0 || !bill.originalUnit ||
          ((bill.originalUnit !== bill.normalizedUnit || bill.originalUsage !== bill.normalizedUsage) && !bill.conversionMethod))
        flags.push(flag('USAGE_UNITS', bill.id, 'Preserve original usage, units and conversion evidence.'));
      else actualUsage += bill.normalizedUsage;
      if (!bill.sourceDocumentId || !Number.isInteger(bill.sourcePage) || bill.sourcePage < 1)
        flags.push(flag('BILL_EVIDENCE', bill.id, 'Bill requires its source document and page.'));
    }
    if (meterBills.length && (study.periodStart !== meterBills[0].serviceStart || study.periodEnd !== meterBills.at(-1).serviceEnd))
      flags.push(flag('STUDY_DATES', study.id, 'Study dates must match the selected coverage boundaries for every included meter.'));
  }
  try {
    if (study.displayStart !== studyDate(study.periodStart) || study.displayEnd !== studyDate(study.periodEnd)) throw new Error();
  } catch { flags.push(flag('STUDY_DATE_FORMAT', study.id, 'Study dates must display as MM/DD/YYYY.')); }
  const modeledUsage = study.modeledExemptUsage + study.modeledNonexemptUsage;
  const variance = actualUsage > 0 ? (modeledUsage - actualUsage) / actualUsage : null;
  if (![study.modeledExemptUsage, study.modeledNonexemptUsage].every(n => Number.isFinite(n) && n >= 0) ||
      variance === null || Math.abs(variance) > 0.05 + Number.EPSILON)
    flags.push(flag('MODELED_VARIANCE', study.id, 'Modeled usage must be within +/-5% of actual usage.'));
  return { flags, actualUsage, modeledUsage, variance, valid: flags.length === 0 };
}

// issueDate is the original tax-charge date; correctionIssuedDate is separate.
// This is an eligibility proposal, not a tax-law determination or filing approval.
export function selectClaimBills({ bills, account, filingDate, approvedStart, approvedEnd, cutoffBasis }) {
  const result = effectiveBills(bills);
  const flags = [...result.flags];
  const excluded = [];
  const included = [];
  const boundary = lookbackDate(filingDate);
  date(approvedStart); date(approvedEnd);
  if (approvedStart > approvedEnd || approvedEnd > filingDate) flags.push(flag('CLAIM_DATES', account.id, 'Approved period must be ordered and end no later than filing.'));
  if (cutoffBasis === 'ia843-signature') flags.push(flag('SIGNATURE_CUTOFF', account.id, 'IA 843 signature date is not a claim cutoff.'));
  if (approvedStart < boundary) flags.push(flag('LOOKBACK', account.id, 'Proposed start is beyond the three-year operating boundary.'));
  const prior = account.priorFiledThrough ? dayAfter(account.priorFiledThrough) : boundary;
  const start = [boundary, prior, approvedStart, account.ownershipStart ?? boundary].sort().at(-1);
  for (const bill of result.bills) {
    if (bill.accountId !== account.id || bill.fuel !== account.fuel || !account.meterIds.includes(bill.meterId)) continue;
    date(bill.issueDate);
    if (!addressMatches(account.serviceAddress, bill.serviceAddress, bill.addressReview)) {
      flags.push(flag('SERVICE_ADDRESS', bill.id, 'Resolve the bill service-address conflict.')); continue;
    }
    const expected = taxPeriod(bill.issueDate);
    if ((bill.taxMonth && bill.taxMonth !== expected.month) || (bill.taxQuarter && bill.taxQuarter !== expected.quarter))
      flags.push(flag('TAX_PERIOD', bill.id, 'Tax must be assigned by original bill issue date.'));
    let reason = bill.issueDate < boundary ? 'lookback' : bill.issueDate < prior ? 'previously-claimed' :
      bill.issueDate < start || bill.issueDate > approvedEnd ? 'outside-approved-period' : null;
    if (reason) { excluded.push({ billId: bill.id, reason }); continue; }
    if (account.ownershipStart && (!bill.serviceStart || bill.serviceStart < account.ownershipStart)) {
      flags.push(flag('OWNERSHIP_BOUNDARY', bill.id, 'Review ownership attribution for a service period crossing the new ownership date.')); continue;
    }
    if (![bill.stateTaxCents, bill.localTaxCents].every(Number.isSafeInteger)) {
      flags.push(flag('TAX_AMOUNTS', bill.id, 'Provider tax must be represented in integer cents.')); continue;
    }
    included.push({ ...bill, taxMonth: expected.month, taxQuarter: expected.quarter });
  }
  // A caller must never receive apparently usable totals after a blocking error.
  const ready = flags.length === 0;
  return { flags, start, end: approvedEnd, included, excluded, ready,
    stateTaxCents: ready ? included.reduce((sum, b) => sum + b.stateTaxCents, 0) : null,
    localTaxCents: ready ? included.reduce((sum, b) => sum + b.localTaxCents, 0) : null };
}

export function validateFilingIdentity({ customer, studyClaimant, ia843Claimant, poas, signer, lowerLocalSchedule, poaOverride, localScheduleOverride }) {
  const flags = [];
  const reviewedOverride = value => Boolean(value?.approvedByMatt && value?.actorId && value?.reason);
  if (studyClaimant !== customer.legalName || ia843Claimant !== customer.legalName)
    flags.push(flag('CLAIMANT_ENTITY', customer.id, 'Study and IA 843 claimant must use the verified legal entity.'));
  const dualRequired = (customer.entityType === 'llc' && customer.verifiedOwnerHasSsn) || customer.registrationAmbiguous;
  const expectedKinds = dualRequired && !reviewedOverride(poaOverride) ? ['entity', 'individual'] : ['entity'];
  if (poas.length !== expectedKinds.length || expectedKinds.some(kind => !poas.some(p => p.kind === kind)))
    flags.push(flag('POA_ENTITY', customer.id, 'POA combination does not match verified entity and registration records.'));
  for (const poa of poas) {
    if (!poa.identityVerified || !poa.identityEvidenceDocumentId ||
        (poa.kind === 'entity' && poa.taxpayerName !== customer.legalName) ||
        (poa.kind === 'individual' && poa.taxpayerName !== customer.verifiedOwnerName) ||
        !/^(0[1-9]|1[0-2])\/\d{2}$/.test(poa.periodStart ?? '') || !/^(0[1-9]|1[0-2])\/\d{2}$/.test(poa.periodEnd ?? '') ||
        poa.periodStart !== poas[0].periodStart || poa.periodEnd !== poas[0].periodEnd)
      flags.push(flag('POA_IDENTITY_PERIOD', customer.id, 'POAs need verified identities and matching MM/YY refund periods.'));
  }
  if (!signer?.verified || signer.ambiguous || !signer.evidenceDocumentId || !signer.verifiedName || signer.printedName !== signer.verifiedName)
    flags.push(flag('SIGNER_NAME', customer.id, 'Printed signer name requires unambiguous documented signer history.'));
  if (lowerLocalSchedule?.length && !reviewedOverride(localScheduleOverride))
    flags.push(flag('IA843_LOWER_SCHEDULE', customer.id, 'Leave the lower local-option schedule blank unless Matt directs otherwise.'));
  return flags;
}

export function validateDocument(document, documents) {
  const flags = [];
  if (!document.objectKey || !document.objectVersion || !/^[a-f0-9]{64}$/.test(document.sha256 ?? ''))
    flags.push(flag('DOCUMENT_STORAGE', document.id, 'Private object key, immutable version and SHA-256 are required.'));
  if (document.kind === 'source' && document.sourceDocumentId)
    flags.push(flag('SOURCE_DOCUMENT', document.id, 'Original evidence cannot be labeled as a derivative.'));
  if (document.kind === 'derivative') {
    const source = documents.find(d => d.id === document.sourceDocumentId && d.kind === 'source' && d.caseId === document.caseId);
    if (!source || source.objectKey === document.objectKey || !document.generatedBy || !document.fieldProvenance)
      flags.push(flag('DERIVATIVE_DOCUMENT', document.id, 'Derivative needs a same-case source, separate object and field provenance.'));
  } else if (document.kind !== 'source') flags.push(flag('DOCUMENT_KIND', document.id, 'Unknown document kind.'));
  return flags;
}
