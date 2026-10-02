# Phase 1: refund-case foundation

## Scope and governing rules

This change extends the existing NEC Ledger repository. The current HTML application,
localStorage keys, IndexedDB documents, banking and customer features are unchanged.
It does **not** migrate browser records, connect the UI to production, generate forms,
calculate a verified Dairy Queen refund, or enable filing. Existing pages remain a
prototype and must not receive real sensitive records.

`REFUND_STUDY_REQUIREMENTS.md` governs business behavior. The October 1, 2026 project
decision selects Postgres plus private object storage and supersedes the SQLite
recommendation in `CHECKING_AND_BACKUP_REQUIREMENTS.md`. Its requirements for consistent
backups, checksums, exports and restore testing remain applicable to deployment.

## Data model

`db/migrations/001_refund_foundation.sql` creates a separate `ledger` schema in one
transaction. Apply once to a new development database; no existing tables are dropped.

| Records | Responsibility |
| --- | --- |
| Customer, service location, account, meter | Legal identity, ownership, physical service identity and independent electric/gas accounts |
| Refund case, case account | Twelve named workflow stages, filing status, account-specific prior filed-through dates, approved claim periods and evidence |
| Document | Private immutable object version, checksum, receipt/creator, source-to-derivative lineage and field provenance |
| Bill, effective bill view | Original charge date, service coverage, source page/section, original and normalized usage, tax cents, append-only correction chain |
| Energy study, study meter, study bill | Independent study period, explicitly included/excluded meters, selected source bills and modeled usage |
| Claim bill | Separate inclusion/exclusion decision and calculated refund amounts; study selection never implies tax inclusion |
| Authorized signer, case identity review | Verified signer history, encrypted identity references, registration ambiguity and separate POA/schedule decisions |
| Validation run, validation flag | Versioned input hash, rule results, review decisions and actor/time |
| Filing document, follow-up | Form revisions, signer evidence, filing periods and dated next actions |
| Refund receipt, invoice, payment, allocation | Refund receipt versus NEC receivable, customer-consistent invoice/payment linkage |
| Audit event | Transactional before/after history attributed to an active Matt/Janna account |

Dates are SQL `date`; amounts are integer cents; usage uses decimal types. Null means
unknown, not zero. `issue_date` means the **original charge's** issue date; retain a
correction's publication date separately in `correction_issued_date`. Corrections
replace the charge values and cannot branch, change account/meter/charge identity,
or overwrite evidence. The final row in a correction chain is the only effective bill.

Original and derivative document rows are append-only. Each new document gets a new
object key. Object-store versioning/retention must also protect the actual bytes.
Private storage is a server-side adapter contract in `src/storage/private-documents.mjs`;
no cloud credentials, public links or fake production adapter are included.

## Rules delivered and acceptance evidence

Run `pnpm install --frozen-lockfile` and `pnpm test` using Node 22 or newer. PGlite is a
development-only embedded Postgres engine used to execute the actual SQL migration
and constraints. A hosted Postgres instance is still needed for deployment testing.

`test/fixtures/dairy-queen.mjs` uses the supplied identity:
AJJA, INC. dba Dairy Queen, 117 E Washington St., Mt Pleasant IA 52641,
account 2175-01098720. All bills, dates, meters, usage, tax amounts and signer records
in the fixture are explicitly synthetic. Nothing is automatically seeded into production.

Tests cover the six requested prior failures: wrong study dates, signature cutoff
misuse, entity/POA mismatch, service-address mismatch, issue-date tax-period errors,
and corrected-bill double counting. Additional tests cover 12-bill continuity,
inclusive +/-5% reconciliation, prior-refund overlap, three-year lookback, signer
evidence, blank lower IA 843 local schedule, source lineage, storage authorization,
checksums and database/audit constraints.

`src/refunds/rules.mjs` provides pure rules for the future API; it is not wired into
the prototype. It fails closed on unresolved review situations and does not implement
all manual exceptions from the requirements yet. Missing reliable coverage, ownership
boundary allocations, differing multi-meter coverage windows, inferred billing cadence,
and ambiguous correction attribution need a reviewed decision workflow in Phase 3.
Refund eligibility uses original issue date for bill tax placement; partial-period
eligibility and historical rate decomposition still require the calculation engine.
The rule output's `stateTaxCents`/`localTaxCents` totals are provider-billed tax, **not**
final refunds after application of an exemption percentage.

## Production access and persistence contract

Provision exactly two authentication subjects, one for Matt and one for Janna, in
`app_user`. Do not infer accounts from display names or seed passwords. Both seats have
full business access; there is no public signup. Authentication itself is Phase 2 work.

Use a separate non-owner runtime database role with only needed table operations:
SELECT/INSERT/UPDATE/DELETE on mutable business records, SELECT/INSERT on documents,
bills and validation runs, SELECT only on audit history and user configuration. Grant
schema USAGE; do not grant schema CREATE, ownership, TRUNCATE, user provisioning,
audit insertion, or trigger-management privileges. Migration/admin credentials must
never be available to the web application. The SECURITY DEFINER audit function is
owned by the migration role with a fixed search path. Its trigger writes audit rows
inside the same transaction as the business mutation.

The future trusted API resolves the authenticated subject to an active user and sets
`ledger.actor_id` with `set_config(..., true)` **inside every write transaction**.
Never accept actor IDs from request bodies or expose database connections to clients.
The database setting is attribution, not standalone authentication. Administrator
user provisioning is an administrative operation outside business-row auditing.

The API must validate the complete aggregate, increment `refund_case.version`, save
validation input hashes/results and apply optimistic concurrency atomically. It must
invalidate prior validations when evidence changes and gate validated/ready/filed
transitions. Phase 1 SQL stores these states but does not yet enforce the full filing
workflow. Invoice totals, allocation limits/FIFO, and final refund reconciliation
also require transactional service logic before production use.

## Remaining phases

1. **Phase 2:** authenticated server/repository layer; hosted Postgres migration runner;
   cloud adapter; control-center UI using Customer -> Utility Accounts -> Source Docs ->
   Study -> Bills -> Validation -> Calculations -> State Forms -> Filing -> Follow-up ->
   Refund -> Invoice. Connect existing customer/refund pages without replacing them.
   Import existing prototype records only through an explicit reviewed migration.
2. **Phase 3:** complete review/override gates, actual source extraction, equipment
   inventory and modeling, historical tax calculations, canonical Excel templates,
   Iowa form rendering/visual QA, immutable filed snapshots, follow-up automation,
   invoicing/payment services and full acceptance against verified Dairy Queen totals.

## Setup Matt needs to provide next

- Hosting choice and a Postgres connection delivered through the deployment secret
  manager (`DATABASE_URL`), with separate migration credentials and backups enabled.
- Private object-storage provider/bucket, region, server-side credentials or workload
  identity, encryption, versioning and retention configuration.
- Matt and Janna's verified sign-in identities through the selected authentication
  provider. Never place passwords or live credentials in this repository.
- Dairy Queen source bills (including corrections), meter/provider details, approved
  study dates and equipment inventory, prior electric/gas filed-through evidence,
  verified signer/entity records, signed source forms, approved filing strategy and
  canonical workbook/form masters. Supply sensitive records through private storage.

Before real data is enabled, test hosted-database privileges, restore procedures,
object retention, account authorization and the entire API-to-database workflow.
