# NEC Ledger: checking, year-end books, and Carbonite backup

## New durable requirements
NEC Ledger must include a checking register and bank-statement reconciliation workflow so the company's books can be balanced and year-end tax-preparation data can be produced from the same system.

### Checking register
Each transaction records date, type, amount, check/reference number, payee/source, category/account, memo, cleared status, reconciled status, and tax year. The register maintains opening balance, running book balance, cleared balance, uncleared difference, search, CSV export, and year-end category summaries.

### Reconciliation
A reconciliation stores statement ending date, statement ending balance, cleared transactions, calculated cleared balance, difference, and completion timestamp. It cannot be finalized until the difference is $0.00 within currency rounding. Production must preserve completed reconciliations and require an audited reopen/correction process.

### Tax-readiness
Year-end exports should include the full checking register, income and expenses by category, check/disbursement detail, invoice/payment detail, A/R aging, and commonly readable CSV/Excel-friendly exports. Final tax treatment and filing must use the entity type and tax rules applicable to the year being filed.

## Carbonite-optimized production backup
Browser localStorage is prototype-only and must not hold real NEC identifiers or accounting records.

Production should use a local database on Matt's Windows computer, preferably SQLite, with a stable layout such as:
- %USERPROFILE%\Documents\NEC Ledger\Data\nec-ledger.db
- %USERPROFILE%\Documents\NEC Ledger\Backups\
- %USERPROFILE%\Documents\NEC Ledger\Exports\

Carbonite should protect completed application-consistent snapshots in Backups and exports in Exports. Do not rely on Carbonite copying a live database file while it is open.

Required backup behavior:
1. Create a consistent snapshot at application close and at least every two days even if continuously open.
2. Include a visible Back up now command.
3. Create a pre-upgrade snapshot before database/application migrations.
4. Write snapshots to a temporary filename and atomically rename only after successful completion.
5. Include date/time and schema version in snapshot filenames.
6. Keep a manifest with checksum, creation time, application version, and database schema version.
7. Test restoration at least quarterly.
8. Preserve owner-controlled CSV/JSON exports in addition to database snapshots.

Production security and restore testing are required before real customer identifiers or financial records are entered.