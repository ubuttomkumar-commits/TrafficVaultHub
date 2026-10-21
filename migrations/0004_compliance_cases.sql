CREATE TABLE IF NOT EXISTS compliance_cases (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT, offer_id TEXT, category_id TEXT,
  case_type TEXT NOT NULL DEFAULT 'RESTRICTED_CATEGORY_REVIEW', status TEXT NOT NULL DEFAULT 'OPEN',
  priority TEXT NOT NULL DEFAULT 'normal', summary TEXT NOT NULL, evidence_note TEXT, decision_reason TEXT,
  opened_by_user_id TEXT, decided_by_user_id TEXT, parent_case_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')), decided_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_compliance_cases_status ON compliance_cases(status);
