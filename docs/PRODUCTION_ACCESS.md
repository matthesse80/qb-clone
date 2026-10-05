# Production access boundary

Production server construction now requires a canonical HTTPS publicOrigin, for example https://ledger.example.com. Mutating API requests must use that exact Origin; client Host headers cannot choose an allowed origin. Authentication and active-seat authorization run before production pages, assets or APIs are served. Legacy HTML pages are available only in preview.

The authenticate callback must verify a real secure session. Test headers are test-only and are never implemented by the production server. Matt and Janna must be provisioned as active seats with verified provider subjects. Postgres pool/TLS settings, a deployed authentication provider, private object storage and deployment configuration are still required. No live production connection is claimed.

Local source packets remain preview-only. The existing localhost process is unchanged by this remote branch update. Current local source review includes real draft bills and must remain loopback-only. Earlier Phase 2 documentation describing only synthetic data predates source packet review.
