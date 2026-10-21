-- TrafficVaultHub — Initial schema (Phase A foundation)
-- Additive, reversible where possible. Prefer soft deactivation over destructive deletes.
-- Monetary amounts stored as integer minor units + ISO 4217 currency code.
-- All timestamps UTC.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Organizations (multi-tenant root)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id            TEXT PRIMARY KEY NOT NULL,
  name          TEXT NOT NULL,
  slug          TEXT NOT NULL UNIQUE,
  type          TEXT NOT NULL CHECK (type IN ('platform', 'advertiser', 'publisher', 'agency')),
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed')),
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id              TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT NOT NULL REFERENCES organizations(id),
  email           TEXT NOT NULL,
  email_verified  INTEGER NOT NULL DEFAULT 0,
  display_name    TEXT,
  role            TEXT NOT NULL CHECK (role IN (
                    'super_admin', 'admin', 'support', 'compliance',
                    'finance', 'advertiser', 'publisher'
                  )),
  status          TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ---------------------------------------------------------------------------
-- Offer categories (database-driven catalog)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offer_categories (
  id                  TEXT PRIMARY KEY NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT,
  parent_id           TEXT REFERENCES offer_categories(id),
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_active           INTEGER NOT NULL DEFAULT 1,
  risk_classification TEXT NOT NULL DEFAULT 'standard'
                        CHECK (risk_classification IN ('standard', 'elevated', 'restricted', 'prohibited')),
  policy_version      INTEGER NOT NULL DEFAULT 1,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_offer_categories_parent ON offer_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_offer_categories_active ON offer_categories(is_active);

-- ---------------------------------------------------------------------------
-- Category policy versions (immutable history)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS category_policy_versions (
  id              TEXT PRIMARY KEY NOT NULL,
  category_id     TEXT NOT NULL REFERENCES offer_categories(id),
  version         INTEGER NOT NULL,
  policy_json     TEXT NOT NULL, -- JSON blob of rules, age gates, GEO restrictions, etc.
  actor_id        TEXT,           -- authorized actor who published
  reason          TEXT,
  effective_from  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (category_id, version)
);

-- ---------------------------------------------------------------------------
-- Offers (core entity — versioned configuration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offers (
  id                    TEXT PRIMARY KEY NOT NULL,
  public_id             TEXT NOT NULL UNIQUE, -- human-facing identifier
  organization_id       TEXT NOT NULL REFERENCES organizations(id), -- advertiser org
  category_id           TEXT REFERENCES offer_categories(id),
  name                  TEXT NOT NULL,
  description           TEXT,
  status                TEXT NOT NULL DEFAULT 'draft'
                          CHECK (status IN (
                            'draft', 'pending_review', 'active', 'paused',
                            'rejected', 'expired', 'archived'
                          )),
  payout_model          TEXT NOT NULL
                          CHECK (payout_model IN (
                            'cpa', 'cpl', 'cpi', 'cps', 'cpv', 'cpe',
                            'cpc', 'cpm', 'recurring', 'revenue_share',
                            'hybrid', 'custom_event'
                          )),
  currency              TEXT NOT NULL DEFAULT 'USD', -- ISO 4217
  current_payout_version INTEGER NOT NULL DEFAULT 1,
  attribution_window_hours INTEGER NOT NULL DEFAULT 720, -- 30 days default
  start_at              TEXT,
  end_at                TEXT,
  created_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at            TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_offers_org ON offers(organization_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);
CREATE INDEX IF NOT EXISTS idx_offers_category ON offers(category_id);
CREATE INDEX IF NOT EXISTS idx_offers_public_id ON offers(public_id);

-- ---------------------------------------------------------------------------
-- Offer payout rule versions (immutable; conversions reference a version)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS offer_payout_rules (
  id              TEXT PRIMARY KEY NOT NULL,
  offer_id        TEXT NOT NULL REFERENCES offers(id),
  version         INTEGER NOT NULL,
  rule_json       TEXT NOT NULL, -- fixed / % / tiered / hybrid definition
  currency        TEXT NOT NULL,
  effective_from  TEXT NOT NULL,
  effective_to    TEXT,
  approved_by     TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (offer_id, version)
);

CREATE INDEX IF NOT EXISTS idx_offer_payout_rules_offer ON offer_payout_rules(offer_id);

-- ---------------------------------------------------------------------------
-- Clicks (attribution base)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clicks (
  id              TEXT PRIMARY KEY NOT NULL,
  offer_id        TEXT NOT NULL REFERENCES offers(id),
  publisher_id    TEXT NOT NULL REFERENCES organizations(id),
  sub_id          TEXT,
  campaign_id     TEXT,
  source_id       TEXT,
  ip_hash         TEXT, -- privacy-aware; never store raw IP long-term without policy
  user_agent_hash TEXT,
  geo_country     TEXT,
  device_type     TEXT,
  os              TEXT,
  received_at     TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  attribution_expires_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_clicks_offer ON clicks(offer_id);
CREATE INDEX IF NOT EXISTS idx_clicks_publisher ON clicks(publisher_id);
CREATE INDEX IF NOT EXISTS idx_clicks_received ON clicks(received_at);

-- ---------------------------------------------------------------------------
-- Conversions (state machine + evidence trail)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS conversions (
  id                  TEXT PRIMARY KEY NOT NULL,
  click_id            TEXT REFERENCES clicks(id),
  offer_id            TEXT NOT NULL REFERENCES offers(id),
  publisher_id        TEXT NOT NULL REFERENCES organizations(id),
  payout_rule_version INTEGER NOT NULL,
  event_type          TEXT NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'approved', 'rejected', 'reversed', 'disputed')),
  amount_minor        INTEGER, -- commission in minor units (set only when eligible)
  currency            TEXT,
  reason_code         TEXT,
  reason_detail       TEXT,    -- human-readable, non-exploitable
  idempotency_key     TEXT UNIQUE,
  received_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  decided_at          TEXT,
  decided_by          TEXT,
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_conversions_offer ON conversions(offer_id);
CREATE INDEX IF NOT EXISTS idx_conversions_publisher ON conversions(publisher_id);
CREATE INDEX IF NOT EXISTS idx_conversions_status ON conversions(status);
CREATE INDEX IF NOT EXISTS idx_conversions_received ON conversions(received_at);

-- ---------------------------------------------------------------------------
-- Double-entry ledger (append-only financial truth)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ledger_accounts (
  id              TEXT PRIMARY KEY NOT NULL,
  organization_id TEXT REFERENCES organizations(id),
  code            TEXT NOT NULL UNIQUE, -- e.g. publisher:pending, advertiser:liability
  name            TEXT NOT NULL,
  account_type    TEXT NOT NULL CHECK (account_type IN (
                    'asset', 'liability', 'equity', 'revenue', 'expense'
                  )),
  currency        TEXT NOT NULL DEFAULT 'USD',
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id              TEXT PRIMARY KEY NOT NULL,
  transaction_id  TEXT NOT NULL, -- groups balanced debits/credits
  account_id      TEXT NOT NULL REFERENCES ledger_accounts(id),
  amount_minor    INTEGER NOT NULL, -- signed: positive = debit for assets, etc.
  currency        TEXT NOT NULL,
  conversion_id   TEXT REFERENCES conversions(id),
  description     TEXT,
  actor_id        TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_tx ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_conversion ON ledger_entries(conversion_id);

-- ---------------------------------------------------------------------------
-- Audit events (privileged actions)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_events (
  id              TEXT PRIMARY KEY NOT NULL,
  actor_id        TEXT,
  action          TEXT NOT NULL,
  resource_type   TEXT NOT NULL,
  resource_id     TEXT,
  before_json     TEXT,
  after_json      TEXT,
  reason          TEXT,
  correlation_id  TEXT,
  ip_hash         TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_resource ON audit_events(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at);
