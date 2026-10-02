# NEC Ledger

Functional browser prototype for National Energy Consultants' QuickBooks replacement.

Current working features: customer list/search; add, edit and delete customer; parent organization; four configurable phone rows; Main/CC email; mailing and physical addresses; payment terms; default NEC fee percentage; filing/utility fields; local browser persistence; two synthetic sample locations.

Important: prototype data is stored in browser localStorage. Do not enter real FEINs, SSNs, utility account numbers, or client financial data.

Next build: Refund case -> Invoice preview -> FIFO payment allocation -> A/R detail.

## Production refund foundation (Phase 1)

The additive Postgres data model, private document-storage contract and Dairy Queen
regression fixtures are in place. See [Phase 1 implementation and setup](docs/PHASE_1_REFUND_FOUNDATION.md).
Run `pnpm install --frozen-lockfile` then `pnpm test` with Node 22+.
The existing browser app is unchanged and remains a prototype; production UI/API
integration and verified source-data acceptance are subsequent phases.
