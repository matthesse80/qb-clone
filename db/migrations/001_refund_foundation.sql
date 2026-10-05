-- Additive Phase 1 schema. Run with a migration-owner role, never the app role.
BEGIN;
CREATE SCHEMA ledger;
REVOKE ALL ON SCHEMA ledger FROM PUBLIC;
SET LOCAL search_path = ledger, pg_catalog;

CREATE TABLE app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seat text NOT NULL UNIQUE CHECK (seat IN ('Matt', 'Janna')),
  auth_subject text NOT NULL UNIQUE CHECK (length(trim(auth_subject)) > 0),
  active boolean NOT NULL DEFAULT true
);
-- No passwords, invented email addresses, or automatically provisioned identities.

CREATE TABLE customer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  legal_name text NOT NULL,
  dba text,
  entity_type text NOT NULL CHECK (entity_type IN ('corporation','llc','individual','partnership','other')),
  identity_verified boolean NOT NULL DEFAULT false,
  tax_identity_secret_ref text, -- External encrypted secret reference, never SSN/FEIN plaintext.
  legacy_customer_id text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE service_location (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  service_address text NOT NULL,
  mailing_address text,
  ownership_start date,
  ownership_end date,
  UNIQUE (id, customer_id),
  CHECK (ownership_end IS NULL OR ownership_end >= ownership_start)
);
CREATE TABLE utility_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id uuid NOT NULL REFERENCES service_location,
  provider text NOT NULL,
  account_number text NOT NULL,
  fuel text NOT NULL CHECK (fuel IN ('electric','gas')),
  UNIQUE (id, location_id),
  UNIQUE (location_id, provider, account_number, fuel)
);
CREATE TABLE meter (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES utility_account,
  meter_number text NOT NULL,
  description text,
  UNIQUE (id, account_id),
  UNIQUE (account_id, meter_number)
);
CREATE TABLE refund_case (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  location_id uuid NOT NULL,
  label text NOT NULL,
  stage text NOT NULL DEFAULT 'Customer' CHECK (stage IN ('Customer','Utility Accounts','Source Docs','Study','Bills','Validation','Calculations','State Forms','Filing','Follow-up','Refund','Invoice')),
  filing_status text NOT NULL DEFAULT 'draft' CHECK (filing_status IN ('draft','review','ready','filed','acknowledged','closed','cancelled')),
  assigned_user_id uuid NOT NULL REFERENCES app_user,
  intended_filing_date date,
  filed_date date,
  state_reference text,
  ia843_signature_date date, -- Execution metadata only; never an eligibility cutoff.
  requested_refund_cents bigint CHECK (requested_refund_cents >= 0),
  approved_refund_cents bigint CHECK (approved_refund_cents >= 0),
  legacy_case_id text UNIQUE,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (location_id, customer_id) REFERENCES service_location(id, customer_id),
  UNIQUE (id, location_id),
  UNIQUE (id, customer_id),
  CHECK (filing_status NOT IN ('filed','acknowledged','closed') OR filed_date IS NOT NULL)
);
CREATE TABLE case_account (
  case_id uuid NOT NULL,
  account_id uuid NOT NULL,
  location_id uuid NOT NULL,
  records_requested_date date,
  records_received_date date,
  prior_filed_through date,
  prior_history_evidence text,
  approved_claim_start date,
  approved_claim_end date,
  period_approved_by uuid REFERENCES app_user,
  period_decision_note text,
  PRIMARY KEY (case_id, account_id),
  FOREIGN KEY (case_id, location_id) REFERENCES refund_case(id, location_id),
  FOREIGN KEY (account_id, location_id) REFERENCES utility_account(id, location_id),
  CHECK (approved_claim_end >= approved_claim_start),
  CHECK (prior_filed_through IS NULL OR (prior_history_evidence IS NOT NULL AND length(trim(prior_history_evidence)) > 0))
);
CREATE TABLE document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES refund_case,
  kind text NOT NULL CHECK (kind IN ('source','derivative')),
  category text NOT NULL,
  source_document_id uuid,
  storage_provider text NOT NULL,
  bucket text NOT NULL,
  object_key text NOT NULL,
  object_version text NOT NULL,
  sha256 text NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'),
  content_type text NOT NULL,
  byte_length bigint NOT NULL CHECK (byte_length > 0),
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES app_user,
  field_provenance jsonb,
  UNIQUE (id, case_id),
  UNIQUE (storage_provider, bucket, object_key),
  FOREIGN KEY (source_document_id, case_id) REFERENCES document(id, case_id),
  CHECK ((kind = 'source' AND source_document_id IS NULL AND received_at IS NOT NULL) OR
         (kind = 'derivative' AND source_document_id IS NOT NULL AND source_document_id <> id AND field_provenance IS NOT NULL))
);
CREATE TABLE bill (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  account_id uuid NOT NULL,
  meter_id uuid NOT NULL,
  source_document_id uuid NOT NULL,
  source_page integer NOT NULL CHECK (source_page > 0),
  service_section text NOT NULL,
  provider_charge_id text NOT NULL,
  service_address text NOT NULL,
  issue_date date NOT NULL, -- Original charge date retained through corrections.
  correction_issued_date date,
  service_start date,
  service_end date,
  coverage_basis text NOT NULL CHECK (coverage_basis IN ('service','meter-read','inferred','unknown')),
  original_usage numeric(20,6) NOT NULL CHECK (original_usage >= 0),
  original_unit text NOT NULL,
  normalized_usage numeric(20,6) NOT NULL CHECK (normalized_usage >= 0),
  normalized_unit text NOT NULL,
  conversion_method text,
  state_tax_cents bigint NOT NULL,
  local_tax_cents bigint NOT NULL,
  corrects_bill_id uuid UNIQUE,
  tax_month date GENERATED ALWAYS AS (issue_date - (extract(day FROM issue_date)::integer - 1)) STORED,
  FOREIGN KEY (case_id, account_id) REFERENCES case_account,
  FOREIGN KEY (meter_id, account_id) REFERENCES meter(id, account_id),
  FOREIGN KEY (source_document_id, case_id) REFERENCES document(id, case_id),
  UNIQUE (id, case_id, account_id),
  UNIQUE (id, case_id, account_id, meter_id, provider_charge_id, issue_date),
  FOREIGN KEY (corrects_bill_id, case_id, account_id, meter_id, provider_charge_id, issue_date)
    REFERENCES bill(id, case_id, account_id, meter_id, provider_charge_id, issue_date),
  CHECK (corrects_bill_id IS NULL OR (corrects_bill_id <> id AND correction_issued_date IS NOT NULL)),
  CHECK (service_end >= service_start),
  CHECK (coverage_basis IN ('inferred','unknown') OR (service_start IS NOT NULL AND service_end IS NOT NULL)),
  CHECK ((original_usage = normalized_usage AND original_unit = normalized_unit) OR conversion_method IS NOT NULL)
);
CREATE TABLE authorized_signer (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  legal_name text NOT NULL,
  title text NOT NULL,
  address text,
  identity_secret_ref text,
  verified boolean NOT NULL DEFAULT false,
  evidence_document_id uuid NOT NULL REFERENCES document,
  verified_by uuid REFERENCES app_user,
  verified_at timestamptz,
  CHECK (NOT verified OR (verified_by IS NOT NULL AND verified_at IS NOT NULL)),
  UNIQUE (id, customer_id)
);
CREATE TABLE case_identity_review (
  case_id uuid PRIMARY KEY,
  customer_id uuid NOT NULL,
  signer_id uuid NOT NULL,
  registration_ambiguous boolean NOT NULL DEFAULT false,
  signer_ambiguous boolean NOT NULL DEFAULT true,
  owner_has_verified_ssn boolean NOT NULL DEFAULT false,
  poa_override_note text,
  lower_schedule_override_note text,
  reviewed_by uuid REFERENCES app_user,
  reviewed_at timestamptz,
  FOREIGN KEY (case_id, customer_id) REFERENCES refund_case(id, customer_id),
  FOREIGN KEY (signer_id, customer_id) REFERENCES authorized_signer(id, customer_id)
);
CREATE UNIQUE INDEX one_original_charge ON bill(case_id, account_id, meter_id, provider_charge_id) WHERE corrects_bill_id IS NULL;
CREATE VIEW effective_bill AS SELECT b.* FROM bill b WHERE NOT EXISTS (SELECT 1 FROM bill correction WHERE correction.corrects_bill_id = b.id);

CREATE TABLE energy_study (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  account_id uuid NOT NULL,
  claimant_name text NOT NULL,
  service_address text NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL CHECK (period_end >= period_start),
  modeled_exempt_usage numeric(20,6) NOT NULL CHECK (modeled_exempt_usage >= 0),
  modeled_nonexempt_usage numeric(20,6) NOT NULL CHECK (modeled_nonexempt_usage >= 0),
  unit text NOT NULL,
  methodology jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','validated')),
  FOREIGN KEY (case_id, account_id) REFERENCES case_account,
  UNIQUE (id, case_id, account_id)
);
CREATE TABLE study_meter (
  study_id uuid NOT NULL,
  case_id uuid NOT NULL,
  account_id uuid NOT NULL,
  meter_id uuid NOT NULL,
  included boolean NOT NULL,
  decision_note text,
  PRIMARY KEY (study_id, meter_id),
  FOREIGN KEY (study_id, case_id, account_id) REFERENCES energy_study(id, case_id, account_id),
  FOREIGN KEY (meter_id, account_id) REFERENCES meter(id, account_id)
);
CREATE TABLE study_bill (
  study_id uuid NOT NULL,
  case_id uuid NOT NULL,
  account_id uuid NOT NULL,
  bill_id uuid NOT NULL,
  PRIMARY KEY (study_id, bill_id),
  FOREIGN KEY (study_id, case_id, account_id) REFERENCES energy_study(id, case_id, account_id),
  FOREIGN KEY (bill_id, case_id, account_id) REFERENCES bill(id, case_id, account_id)
);
CREATE TABLE claim_bill (
  case_id uuid NOT NULL,
  account_id uuid NOT NULL,
  bill_id uuid NOT NULL,
  disposition text NOT NULL CHECK (disposition IN ('included','previously-claimed','lookback','outside-approved-period','review')),
  reason text NOT NULL,
  refundable_state_cents bigint,
  refundable_local_cents bigint,
  calculation_version text,
  PRIMARY KEY (case_id, bill_id),
  FOREIGN KEY (case_id, account_id) REFERENCES case_account,
  FOREIGN KEY (bill_id, case_id, account_id) REFERENCES bill(id, case_id, account_id),
  CHECK (disposition = 'included' OR (refundable_state_cents IS NULL AND refundable_local_cents IS NULL))
);
CREATE TABLE validation_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES refund_case,
  case_version integer NOT NULL,
  rules_version text NOT NULL,
  input_sha256 text NOT NULL CHECK (input_sha256 ~ '^[a-f0-9]{64}$'),
  result jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES app_user,
  UNIQUE (id, case_id)
);
CREATE TABLE validation_flag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES refund_case,
  validation_run_id uuid NOT NULL,
  rule_code text NOT NULL,
  record_reference text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('blocking','warning')),
  message text NOT NULL,
  decision text CHECK (decision IN ('request-postpone','proceed','resolved')),
  decision_note text,
  decided_by uuid REFERENCES app_user,
  decided_at timestamptz,
  FOREIGN KEY (validation_run_id, case_id) REFERENCES validation_run(id, case_id),
  CHECK (decision IS NULL OR (decided_by IS NOT NULL AND decided_at IS NOT NULL AND decision_note IS NOT NULL))
);
CREATE TABLE filing_document (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES refund_case,
  document_id uuid NOT NULL,
  form text NOT NULL CHECK (form IN ('IA843','IA2848-entity','IA2848-individual','workbook','study','package')),
  revision text NOT NULL,
  signer_name text,
  signer_evidence_document_id uuid,
  period_start date NOT NULL,
  period_end date NOT NULL CHECK (period_end >= period_start),
  reviewed_by uuid REFERENCES app_user,
  reviewed_at timestamptz,
  FOREIGN KEY (document_id, case_id) REFERENCES document(id, case_id),
  FOREIGN KEY (signer_evidence_document_id, case_id) REFERENCES document(id, case_id)
);
CREATE TABLE follow_up (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES refund_case,
  account_id uuid,
  due_date date NOT NULL,
  next_action text NOT NULL,
  assigned_user_id uuid NOT NULL REFERENCES app_user,
  completed_at timestamptz,
  FOREIGN KEY (case_id, account_id) REFERENCES case_account
);
CREATE TABLE refund_receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES refund_case,
  received_date date NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  reference text NOT NULL
);
CREATE TABLE invoice (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  issued_date date NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents >= 0),
  legacy_invoice_id text UNIQUE,
  FOREIGN KEY (case_id, customer_id) REFERENCES refund_case(id, customer_id),
  UNIQUE (id, customer_id)
);
CREATE TABLE payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES customer,
  received_date date NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  reference text NOT NULL,
  UNIQUE (id, customer_id)
);
CREATE TABLE payment_allocation (
  payment_id uuid NOT NULL,
  invoice_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  PRIMARY KEY (payment_id, invoice_id),
  FOREIGN KEY (payment_id, customer_id) REFERENCES payment(id, customer_id),
  FOREIGN KEY (invoice_id, customer_id) REFERENCES invoice(id, customer_id)
);

CREATE TABLE audit_event (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_id uuid NOT NULL REFERENCES app_user,
  table_name text NOT NULL,
  record_id text NOT NULL,
  operation text NOT NULL,
  old_record jsonb,
  new_record jsonb
);
CREATE FUNCTION immutable_record() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN RAISE EXCEPTION 'Evidence and history are append-only; create a new record'; END $$;
CREATE FUNCTION audit_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ledger, pg_catalog AS $$
DECLARE actor uuid;
BEGIN
  actor := nullif(current_setting('ledger.actor_id', true), '')::uuid;
  IF actor IS NULL OR NOT EXISTS (SELECT 1 FROM app_user WHERE id = actor AND active) THEN
    RAISE EXCEPTION 'An active authenticated Matt or Janna actor is required';
  END IF;
  INSERT INTO audit_event(actor_id, table_name, record_id, operation, old_record, new_record)
  VALUES (actor, TG_TABLE_NAME, coalesce(to_jsonb(NEW)->>'id', to_jsonb(OLD)->>'id', to_jsonb(NEW)->>'case_id', to_jsonb(OLD)->>'case_id', to_jsonb(NEW)->>'study_id', to_jsonb(OLD)->>'study_id', to_jsonb(NEW)->>'payment_id', to_jsonb(OLD)->>'payment_id'), TG_OP,
    CASE WHEN TG_OP <> 'INSERT' THEN to_jsonb(OLD) END,
    CASE WHEN TG_OP <> 'DELETE' THEN to_jsonb(NEW) END);
  RETURN coalesce(NEW, OLD);
END $$;
CREATE FUNCTION source_parent() RETURNS trigger LANGUAGE plpgsql SET search_path = ledger, pg_catalog AS $$
BEGIN
  IF NEW.kind = 'derivative' AND NOT EXISTS (SELECT 1 FROM document WHERE id = NEW.source_document_id AND kind = 'source' AND case_id = NEW.case_id) THEN
    RAISE EXCEPTION 'Derivative must reference original same-case source evidence';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER document_parent BEFORE INSERT ON document FOR EACH ROW EXECUTE FUNCTION source_parent();
DO $$ DECLARE tbl text; BEGIN
  FOREACH tbl IN ARRAY ARRAY['document','bill','validation_run','audit_event'] LOOP
    EXECUTE format('CREATE TRIGGER immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION immutable_record()', tbl);
  END LOOP;
  FOREACH tbl IN ARRAY ARRAY['customer','service_location','utility_account','meter','refund_case','case_account','document','bill','authorized_signer','case_identity_review','energy_study','study_meter','study_bill','claim_bill','validation_run','validation_flag','filing_document','follow_up','refund_receipt','invoice','payment','payment_allocation'] LOOP
    EXECUTE format('CREATE TRIGGER audit AFTER INSERT OR UPDATE OR DELETE ON %I FOR EACH ROW EXECUTE FUNCTION audit_change()', tbl);
  END LOOP;
END $$;
REVOKE ALL ON ALL TABLES IN SCHEMA ledger FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ledger FROM PUBLIC;
COMMIT;
