# Local source packet review

The preview optionally loads `.preview/packet/packet.json`, `original.pdf`, and `page-N.png` derivatives. This ignored directory contains private client data and must never be committed. The original SHA-256 is checked on startup. Metadata binds to the exact case ID and account number; routes require the workspace identity check and loopback host. This is local review staging, not cloud storage or production authentication.

Bill drafts show issue-date tax month, meter reading dates, electric usage, service charges, combined statement tax and reconciliation difference beside their source page. State and local electric tax remain unallocated. Account history is supporting evidence and is not counted as more bills. Existing synthetic ledger records are unchanged, sample calculation totals are hidden, and source validation is blocked until reconciliation and study selection are implemented.

The packet is transcribed manually from rendered source pages, not an automatic PDF parser. No upload, draft editing or approval interface is implemented yet. Next: database-backed draft ingestion and review audit, tax allocation, correction-history reconciliation, explicit study selection and private production object storage.

Run `node --test test/*.test.mjs`. Packet tests cover identity checks, cross-case access, invalid pages, no public filesystem route, escaping and issue-date month display.
