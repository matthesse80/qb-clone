# Phase 2 workspace preview

Run `pnpm install --frozen-lockfile`, then `pnpm preview`. Open
http://127.0.0.1:4173/workspace.html on the same computer. The server binds only to
127.0.0.1. `NODE_ENV=production` refuses to launch this preview.

The new workspace is additive: the existing HTML pages, browser data, and document
stores are untouched. The preview uses the Phase 1 normalized SQL schema in a
persistent, local PGlite database under `.preview/database` (excluded from Git).
Reloading the page or restarting the preview retains draft edits and audit history.
It does not read or migrate existing browser records.

## Working now

- All twelve workflow sections and a customer/case/account selector.
- Customer identity, utility account, source-document metadata and bill history.
- Editable study dates/usage, proposed claim dates, intended filing date and follow-up.
- Validation of study coverage/variance and claim eligibility using Phase 1 rules.
- Saved validation results with input hash and case version, plus immutable audit rows.
- Transactional draft edits, optimistic concurrency and approval invalidation.
- Read-only calculation summaries explicitly labeled as tax inputs, not refund totals.
- Source docs, forms, filing, refund receipts and invoicing show their pending work;
  they do not pretend to upload, generate, submit, receive or invoice.

The seed includes Matt's supplied Dairy Queen identity; all other records are
synthetic. The preview attributes actions to a clearly isolated sample Matt seat.
It is not a sign-in session, must not be exposed publicly, and must not hold real
documents or sensitive identifiers. Janna is not impersonated or provisioned.

## Production connection seam

`postgresDatabase(pool)` adapts an injected Postgres pool to the same repository
contract exercised by the preview. Each write uses one checked-out connection,
BEGIN/COMMIT/ROLLBACK, and a transaction-local audit actor. `Workspace` reads and
writes normalized Phase 1 tables, not a separate JSON case store.

`createWorkspaceServer({workspace, authenticate})` requires a trusted authentication
callback. It must verify the deployment's secure session and return an authentication
subject; the repository maps that subject to an active Matt/Janna seat. It must never
derive identity from an unverified header or request body. The sample entry point
uses a fixed subject only on the loopback-only synthetic preview.

Hosted deployment still needs the Postgres driver/pool configuration, verified
sign-in sessions, TLS/reverse-proxy configuration, rate limits, cloud storage adapter,
and restricted-role/restore testing. No production login or cloud connection is
claimed by this preview. Do not mount the unauthenticated legacy prototype pages
into a production application without a separate integration review.

Every saved validation returns `filingReady: false`. Source evidence checks,
signer/POA gates, historical-rate calculations, workbook reconciliation and visual
form QA remain required. Browsing the stage navigation does not advance a case or
constitute completion. Follow-up notes do not send messages or create automations.

Current editing supports one study per selected account; accounts with multiple
studies fail closed on edits until explicit study selection is implemented. Validation
is stored, but the UI does not yet browse historical validation snapshots. Study and
bill ingestion, file upload/download, stage transitions and financial posting remain
future work; these limitations are visible in the corresponding sections.

## Verification

`pnpm test` runs 20 tests, including real SQL migration/constraints, the six Dairy Queen
regressions, atomic edit rollback, unauthorized/stale update rejection, audit capture,
saved validations, HTTP identity/origin checks and private-file route exclusion.
The pool adapter's connection/rollback behavior is unit-tested; hosted Postgres is
not available in this environment. Browser verification exercised a wrong study date,
saved the draft, observed the study-date warning and restored the sample date.

## Review layout refinement

The workspace opens on a review overview with the next action, required source and
signer/calculation reviews, and direct navigation from each issue. Section statuses
describe missing review or unavailable features; visiting a section never completes
it. The bill review places recorded values beside an explicit missing-original
placeholder until private PDF storage is connected. Audit history is collapsed.

The supplied JPEG logo contains a gray block in the image itself. All app sidebars
now use a clean HTML/CSS NEC Ledger wordmark; the damaged image file is retained.
This is a temporary wordmark replacement, not a restoration of the original artwork.
