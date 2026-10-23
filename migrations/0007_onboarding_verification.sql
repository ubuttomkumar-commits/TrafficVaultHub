-- 0007_onboarding_verification.sql
-- Onboarding & Multi-dimensional Verification for Publishers & Advertisers

CREATE TABLE IF NOT EXISTS partner_applications (
  id                          TEXT PRIMARY KEY NOT NULL,
  account_type                TEXT NOT NULL CHECK (account_type IN ('PUBLISHER', 'ADVERTISER')),
  sub_type                    TEXT NOT NULL DEFAULT 'INDIVIDUAL' CHECK (sub_type IN ('INDIVIDUAL', 'COMPANY', 'AGENCY')),
  status                      TEXT NOT NULL DEFAULT 'PENDING_REVIEW'
                              CHECK (status IN ('PENDING_REVIEW', 'DOCS_REQUESTED', 'INTERVIEW_SCHEDULED', 'APPROVED', 'REJECTED', 'PROBATIONARY_APPROVED')),
  user_id                     TEXT REFERENCES users(id),
  organization_id             TEXT REFERENCES organizations(id),
  email                       TEXT NOT NULL,
  email_verified              INTEGER NOT NULL DEFAULT 0,
  phone                       TEXT NOT NULL,
  phone_verified              INTEGER NOT NULL DEFAULT 0,
  contact_method              TEXT NOT NULL DEFAULT 'TELEGRAM',
  contact_handle              TEXT,
  first_name                  TEXT NOT NULL,
  last_name                   TEXT NOT NULL,
  company_name                TEXT,
  business_reg_no             TEXT,
  vat_tax_id                  TEXT,
  country                     TEXT NOT NULL,
  state_province              TEXT,
  city                        TEXT NOT NULL,
  address_line1               TEXT NOT NULL,
  postal_code                 TEXT NOT NULL,
  dob                         TEXT,
  website_url                 TEXT,
  traffic_experience_years    INTEGER,
  experience_level            TEXT CHECK (experience_level IN ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'AGENCY')),
  previous_networks           TEXT,
  traffic_sources             TEXT,
  traffic_description         TEXT,
  estimated_monthly_volume    TEXT,
  target_verticals            TEXT,
  incentivized_traffic        INTEGER NOT NULL DEFAULT 0,
  incentive_details           TEXT,
  restricted_categories_intent INTEGER NOT NULL DEFAULT 0,
  expected_monthly_budget     TEXT,
  tracking_preference         TEXT DEFAULT 'S2S_POSTBACK',
  preferred_funding_method    TEXT,
  risk_score                  INTEGER NOT NULL DEFAULT 0,
  risk_flags                  TEXT,
  interview_details           TEXT,
  assigned_reviewer_id        TEXT,
  decided_by_user_id          TEXT,
  decision_reason_code        TEXT,
  decision_notes              TEXT,
  conditional_caps            TEXT,
  created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_partner_apps_email ON partner_applications(email);
CREATE INDEX IF NOT EXISTS idx_partner_apps_status ON partner_applications(status);
CREATE INDEX IF NOT EXISTS idx_partner_apps_type ON partner_applications(account_type);
CREATE INDEX IF NOT EXISTS idx_partner_apps_created ON partner_applications(created_at);

CREATE TABLE IF NOT EXISTS verification_dimensions (
  id                          TEXT PRIMARY KEY NOT NULL,
  application_id              TEXT NOT NULL REFERENCES partner_applications(id),
  organization_id             TEXT REFERENCES organizations(id),
  dimension                   TEXT NOT NULL CHECK (dimension IN (
                                'EMAIL', 'PHONE', 'IDENTITY', 'BUSINESS_ENTITY',
                                'DOMAIN_OWNERSHIP', 'TRAFFIC_EVIDENCE',
                                'HISTORICAL_PERFORMANCE', 'COMPLIANCE_REVIEW'
                              )),
  stage                       TEXT NOT NULL DEFAULT 'SELF_DECLARED'
                              CHECK (stage IN ('SELF_DECLARED', 'DOCUMENTED', 'VERIFIED', 'INDEPENDENTLY_CORROBORATED', 'PLATFORM_TRUSTED')),
  status                      TEXT NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING', 'IN_REVIEW', 'PASSED', 'REJECTED', 'WAIVED')),
  evidence_ref                TEXT,
  reviewer_notes              TEXT,
  reviewed_by                 TEXT,
  verified_at                 TEXT,
  created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (application_id, dimension)
);

CREATE INDEX IF NOT EXISTS idx_verif_dim_app ON verification_dimensions(application_id);
CREATE INDEX IF NOT EXISTS idx_verif_dim_stage ON verification_dimensions(stage);

CREATE TABLE IF NOT EXISTS application_documents (
  id                          TEXT PRIMARY KEY NOT NULL,
  application_id              TEXT NOT NULL REFERENCES partner_applications(id),
  doc_type                    TEXT NOT NULL CHECK (doc_type IN (
                                'GOV_ID_FRONT', 'GOV_ID_BACK', 'SELFIE_WITH_ID',
                                'BUSINESS_REGISTRATION', 'PROOF_OF_ADDRESS',
                                'TAX_DOCUMENT', 'TRAFFIC_SCREENSHOT', 'OTHER'
                              )),
  file_name                   TEXT NOT NULL,
  file_size_bytes             INTEGER NOT NULL,
  mime_type                   TEXT NOT NULL,
  storage_path                TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'UPLOADED'
                              CHECK (status IN ('UPLOADED', 'ACCEPTED', 'REJECTED', 'NEEDS_RESUBMISSION')),
  rejection_reason            TEXT,
  uploaded_at                 TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_app_docs_app ON application_documents(application_id);

CREATE TABLE IF NOT EXISTS review_audit_log (
  id                          TEXT PRIMARY KEY NOT NULL,
  application_id              TEXT NOT NULL REFERENCES partner_applications(id),
  actor_id                    TEXT NOT NULL,
  action                      TEXT NOT NULL CHECK (action IN (
                                'SUBMIT', 'EMAIL_VERIFIED', 'PHONE_VERIFIED', 'DOC_UPLOADED',
                                'DOC_REVIEWED', 'REQUEST_MORE_DOCS', 'SCHEDULE_CALL',
                                'CONDITIONAL_APPROVAL', 'FULL_APPROVAL', 'REJECTION',
                                'ESCALATION', 'APPEAL_OPENED'
                              )),
  reason_code                 TEXT,
  notes                       TEXT,
  policy_version              TEXT NOT NULL DEFAULT 'v5.0',
  created_at                  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_review_audit_app ON review_audit_log(application_id);
