-- Additive only. Compatible with deployed trafficvaulthub-* schema (migrations 0001–0009).
-- Does NOT recreate offers, conversions, ledger, users, or sessions.
-- Safe to apply on empty or existing remote D1 that lacks category tables.

CREATE TABLE IF NOT EXISTS offer_categories (
  id                  TEXT PRIMARY KEY NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  description         TEXT,
  parent_id           TEXT REFERENCES offer_categories(id) ON DELETE RESTRICT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  is_active           INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  risk_classification TEXT NOT NULL DEFAULT 'standard'
                      CHECK (risk_classification IN ('standard', 'elevated', 'restricted', 'prohibited')),
  policy_version      INTEGER NOT NULL DEFAULT 1 CHECK (policy_version >= 1),
  created_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_offer_categories_parent ON offer_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_offer_categories_active ON offer_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_offer_categories_sort ON offer_categories(sort_order);

CREATE TABLE IF NOT EXISTS category_policy_versions (
  id              TEXT PRIMARY KEY NOT NULL,
  category_id     TEXT NOT NULL REFERENCES offer_categories(id) ON DELETE RESTRICT,
  version         INTEGER NOT NULL CHECK (version >= 1),
  policy_json     TEXT NOT NULL,
  actor_id        TEXT,
  reason          TEXT,
  effective_from  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (category_id, version)
);

CREATE INDEX IF NOT EXISTS idx_category_policy_versions_cat ON category_policy_versions(category_id);

-- Optional link from offers.vertical (free text) is retained; category_id is additive nullable FK.
-- SQLite/D1: ADD COLUMN only if missing — applied carefully via API when needed.
-- ALTER TABLE offers ADD COLUMN category_id TEXT REFERENCES offer_categories(id);
-- (Run separately after verifying column absence; not unconditional in this file.)
