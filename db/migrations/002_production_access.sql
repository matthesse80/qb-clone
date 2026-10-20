-- Local credential and recovery foundation for the two pre-provisioned owners.
-- Apply with the migration role. The runtime role receives only the minimum
-- SELECT/INSERT/UPDATE grants required by the production deployment.
BEGIN;
SET LOCAL search_path = ledger, pg_catalog;

CREATE TABLE local_credential (
  user_id uuid PRIMARY KEY REFERENCES app_user,
  password_hash text NOT NULL CHECK (password_hash LIKE 'scrypt$%'),
  recovery_code_hash text NOT NULL CHECK (recovery_code_hash LIKE 'scrypt$%'),
  credential_version integer NOT NULL DEFAULT 1 CHECK (credential_version > 0),
  failed_attempts integer NOT NULL DEFAULT 0 CHECK (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE security_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_user_id uuid REFERENCES app_user,
  target_user_id uuid NOT NULL REFERENCES app_user,
  event_type text NOT NULL CHECK (event_type IN (
    'enroll','login-failed','login-success','password-change',
    'recovery-reset','co-owner-reset','logout','session-expired'
  )),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TRIGGER security_event_immutable
  BEFORE UPDATE OR DELETE OR TRUNCATE ON security_event
  FOR EACH STATEMENT EXECUTE FUNCTION immutable_record();

REVOKE ALL ON local_credential, security_event FROM PUBLIC;
COMMIT;
