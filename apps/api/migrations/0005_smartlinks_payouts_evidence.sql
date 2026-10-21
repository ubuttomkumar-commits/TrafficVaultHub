CREATE TABLE IF NOT EXISTS smartlinks (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, code TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE', created_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS smartlink_targets (
  id TEXT PRIMARY KEY NOT NULL, smartlink_id TEXT NOT NULL, offer_id TEXT NOT NULL,
  weight INTEGER NOT NULL DEFAULT 1, is_active INTEGER NOT NULL DEFAULT 1, sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS payout_requests (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT NOT NULL, currency TEXT NOT NULL, amount_minor INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING', provider TEXT NOT NULL DEFAULT 'manual', provider_reference TEXT, note TEXT,
  requested_by_user_id TEXT, decided_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TABLE IF NOT EXISTS evidence_objects (
  id TEXT PRIMARY KEY NOT NULL, organization_id TEXT, resource_type TEXT NOT NULL, resource_id TEXT,
  r2_key TEXT NOT NULL, content_type TEXT, size_bytes INTEGER, uploaded_by_user_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
