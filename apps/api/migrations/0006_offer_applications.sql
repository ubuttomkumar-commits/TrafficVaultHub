-- 0006_offer_applications.sql
-- Additive tables for offer access workflows and private/application_required offer approvals.

CREATE TABLE IF NOT EXISTS offer_applications (
  id                      TEXT PRIMARY KEY NOT NULL,
  offer_id                TEXT NOT NULL REFERENCES offers(id),
  publisher_org_id        TEXT NOT NULL REFERENCES organizations(id),
  applicant_user_id       TEXT NOT NULL,
  status                  TEXT NOT NULL DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  traffic_sources         TEXT,
  message                 TEXT,
  decided_by_user_id      TEXT,
  decided_at              TEXT,
  decision_notes          TEXT,
  created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (offer_id, publisher_org_id)
);

CREATE INDEX IF NOT EXISTS idx_offer_apps_offer ON offer_applications(offer_id);
CREATE INDEX IF NOT EXISTS idx_offer_apps_pub ON offer_applications(publisher_org_id);
CREATE INDEX IF NOT EXISTS idx_offer_apps_status ON offer_applications(status);

CREATE TABLE IF NOT EXISTS affiliate_offer_access (
  id                      TEXT PRIMARY KEY NOT NULL,
  offer_id                TEXT NOT NULL REFERENCES offers(id),
  affiliate_organization_id TEXT NOT NULL REFERENCES organizations(id),
  granted_by_user_id      TEXT,
  status                  TEXT NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('APPROVED', 'REVOKED')),
  created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (offer_id, affiliate_organization_id)
);

CREATE INDEX IF NOT EXISTS idx_aff_offer_access_offer ON affiliate_offer_access(offer_id);
CREATE INDEX IF NOT EXISTS idx_aff_offer_access_aff ON affiliate_offer_access(affiliate_organization_id);
