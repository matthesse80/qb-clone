# Production foundation sprint

This sprint begins the approved conversion from a browser prototype to a controlled
NEC business application. It builds on the refund foundation in the open draft pull
request; it does not merge, deploy, migrate client records or enable real-data entry.

## Delivered controls

- Exactly two pre-provisioned owners: **Matt** and **Janna**. There is no public signup.
- Independent password hashes using Node's built-in scrypt; no default or plaintext
  password is stored.
- Separate one-time recovery codes. A successful recovery rotates both the password
  and recovery code and invalidates prior sessions.
- Janna can perform an audited emergency reset for Matt, and Matt can do the same for
  Janna. The co-owner flow cannot be used as an unauthenticated back door.
- In-memory opaque sessions with a 30-minute inactivity timeout. Password or recovery
  changes invalidate that owner's sessions.
- Failed-login counting and temporary lockout after repeated failures.
- Append-only security events for enrollment, login results, recovery, co-owner reset,
  logout and session expiration. Passwords, recovery codes and session tokens are never
  written to the audit log.
- A database migration for credentials and security history that preserves the existing
  normalized refund schema and provider-subject authorization boundary.
- A production login and recovery page plus same-origin JSON endpoints. Successful
  sign-in sets an opaque `HttpOnly`, `Secure`, `SameSite=Strict` session cookie; logout
  deletes the server-side session and expires the cookie.
- A generic consistent-backup contract that writes a temporary snapshot, computes a
  SHA-256 checksum, writes application/schema metadata and atomically renames the
  completed files. Restore refuses unverified or tampered snapshots and requires the
  application to be closed.

## Recovery handoff

Enrollment must be performed through a future owner-only setup command on Matt's
computer or through the selected private deployment administrator. The command will
show each recovery code once. Matt should keep his code in a password manager and a
printed sealed copy; Janna should keep hers independently. Neither code belongs in this
repository, email, screenshots or ordinary backup manifests.

If Matt loses only his password, he can use his recovery code. If he also loses that
code, Janna signs in to her separate owner account and resets Matt. If both owners lose
their credentials and recovery codes, restoration requires the documented offline
administrative procedure and physical control of the database; it is not a hidden
universal password.

## Backup handoff

The backup module is deliberately database-adapter neutral. Deployment must supply a
snapshot writer that produces a transactionally consistent Postgres dump (or supported
embedded-Postgres export) and a restore adapter that restores only while the application
is closed. Completed snapshots and manifests go to the Carbonite-protected Backups
folder. The deployment layer still needs Back up now, close-time and pre-upgrade hooks,
the two-day maximum interval, retention, and a quarterly restore-test record.

## Still blocked before real data

- Complete visual QA and accessibility review of the owner sign-in/recovery screen.
- Create an owner-only enrollment command and save neither generated secret in Git.
- Configure the production Postgres/PGlite data path, least-privilege runtime role and
  migration role.
- Connect a private document-storage adapter with encryption, versioning and retention.
- Connect the backup contract to the selected database's consistent export/restore tool
  and test a restore on Matt's Windows computer.
- Complete invoice, payment, FIFO allocation, A/R and checking services and tests.
- Pass the real-data acceptance gate before entering FEINs, SSNs, utility account
  numbers or customer financial records.

## October 19 hardening increment

The original 33-test foundation was not production certification. Adversarial
regressions reproduced three defects before fixing them: an empty derived-key hash
could verify, concurrent requests could reuse one recovery code, and two backup
operations with the same timestamp could share temporary/final paths.

The increment now rejects malformed/noncanonical salt and derived-key encodings,
uses a credential-version compare-and-swap in the database for password resets,
requires the acting co-owner's passphrase for emergency reset, and counts failed
logins atomically in SQL. A stale login result cannot clear a lock or a newer
credential version. A malformed session cookie is treated as signed out.

Backups now use unique names and isolated staging, stream checksums rather than
loading the database snapshot into memory, flush files before publication, and
publish using non-overwriting same-volume hard links. The manifest is the completion
marker; an orphan snapshot after a process crash is not a valid backup. Hard-link
support must be verified on Matt's Windows/Carbonite backup volume; do not silently
fall back to overwriting copy/rename. Directory durability on power loss, filesystem
permissions/ACLs, encryption, retention and a real database restore remain deployment
gates. SHA-256 detects accidental corruption or an altered snapshot with an unchanged
manifest; it does not authenticate an attacker who can rewrite both files.

The full local suite now has 37 passing tests. SQL concurrency regressions run against
PGlite using the actual migrations; hosted Postgres and Windows tests are still needed.
No owners were enrolled, no real identifiers were entered, and no database or site
was deployed or migrated during this increment.
