-- Migration 0009: Super Admin CMS, Platform Settings, Announcements, and Maintenance Mode
-- Additive migration for TrafficVaultHub universal admin control center

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Platform Settings (Key-value store for global network configuration)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_settings (
  key             TEXT PRIMARY KEY NOT NULL,
  value_json      TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'finance', 'compliance', 'branding', 'feature_flags')),
  description     TEXT,
  is_published    INTEGER NOT NULL DEFAULT 1,
  updated_by      TEXT REFERENCES users(id),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_platform_settings_cat ON platform_settings(category);

-- ---------------------------------------------------------------------------
-- CMS Landing Page Content & Revisions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_landing_content (
  id              TEXT PRIMARY KEY NOT NULL, -- 'current_published' or 'current_draft'
  version_number  INTEGER NOT NULL DEFAULT 1,
  status          TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  content_json    TEXT NOT NULL,
  published_by    TEXT REFERENCES users(id),
  change_summary  TEXT,
  published_at    TEXT,
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS cms_page_revisions (
  id              TEXT PRIMARY KEY NOT NULL,
  page_key        TEXT NOT NULL DEFAULT 'landing',
  revision_num    INTEGER NOT NULL,
  content_json    TEXT NOT NULL,
  published_by    TEXT REFERENCES users(id),
  change_summary  TEXT,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_cms_revisions_page ON cms_page_revisions(page_key, revision_num DESC);

-- ---------------------------------------------------------------------------
-- System Announcements (Sitewide Announcement Bar)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_announcements (
  id              TEXT PRIMARY KEY NOT NULL,
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  link_url        TEXT,
  link_label      TEXT,
  style           TEXT NOT NULL DEFAULT 'info' CHECK (style IN ('info', 'warning', 'critical', 'success')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'publishers', 'advertisers', 'guests')),
  is_active       INTEGER NOT NULL DEFAULT 0,
  start_at        TEXT,
  end_at          TEXT,
  created_by      TEXT REFERENCES users(id),
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON system_announcements(is_active);

-- ---------------------------------------------------------------------------
-- Maintenance Mode Configuration
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenance_config (
  id                  TEXT PRIMARY KEY NOT NULL, -- 'singleton'
  is_enabled          INTEGER NOT NULL DEFAULT 0,
  headline            TEXT NOT NULL DEFAULT 'Scheduled System Maintenance',
  message             TEXT NOT NULL DEFAULT 'TrafficVaultHub is performing scheduled network ledger synchronization and infrastructure upgrades. All click redirects and S2S postbacks continue without interruption.',
  estimated_duration  TEXT DEFAULT '30 minutes',
  allow_admin_bypass  INTEGER NOT NULL DEFAULT 1,
  allowed_ips         TEXT DEFAULT '',
  enabled_by          TEXT REFERENCES users(id),
  updated_at          TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- ---------------------------------------------------------------------------
-- Seed initial records if not exists
-- ---------------------------------------------------------------------------
INSERT OR IGNORE INTO maintenance_config (id, is_enabled, headline, message, estimated_duration, allow_admin_bypass, allowed_ips)
VALUES ('singleton', 0, 'Scheduled System Maintenance', 'TrafficVaultHub is performing scheduled network ledger synchronization and infrastructure upgrades. All click redirects and S2S postbacks continue without interruption.', '30 minutes', 1, '');

INSERT OR IGNORE INTO platform_settings (key, value_json, category, description)
VALUES 
  ('min_payout_minor', '5000', 'finance', 'Minimum payout request amount in USD minor units ($50.00)'),
  ('default_hold_days', '7', 'finance', 'Default reserve hold duration in days for standard conversions'),
  ('probation_click_cap_daily', '250', 'compliance', 'Default daily click cap for probation publishers'),
  ('support_contact', '{"email":"support@trafficvaulthub.com","telegram":"@TrafficVaultDesk","skype":"live:.cid.tvhsupport"}', 'general', 'Official operator desk contact coordinates'),
  ('feature_flags', '{"binance_pay_enabled":true,"smartlinks_enabled":true,"auto_otp_dispatch":true,"risk_engine_active":true}', 'feature_flags', 'Global platform feature switches');

INSERT OR IGNORE INTO system_announcements (id, title, message, link_url, link_label, style, target_audience, is_active)
VALUES (
  'ann_initial_launch',
  'Universal Ledger Live',
  'Welcome to TrafficVaultHub. Every click accounted for. Every decision explained. Every valid payout tracked.',
  '/offers',
  'Explore Offers',
  'info',
  'all',
  1
);

INSERT OR IGNORE INTO cms_landing_content (id, version_number, status, content_json, change_summary, published_at)
VALUES (
  'current_published',
  1,
  'published',
  '{"siteName":"TrafficVaultHub","tagline":"The CPA Network That Shows Its Work","logoUrl":"","heroHeadline":"The CPA Network That Shows Its Work","heroSubheadline":"Universal CPA affiliate network built on double-entry accounting and cryptographic proof. Every click accounted for. Every decision explained. Every valid payout tracked.","ctaPrimaryText":"Explore Live Offers","ctaPrimaryLink":"/offers","ctaSecondaryText":"Partner Verification","ctaSecondaryLink":"/signup","supportEmail":"support@trafficvaulthub.com","telegramHandle":"@TrafficVaultDesk","minPayoutDisplay":"$50 Minimum","seoTitle":"TrafficVaultHub — Universal CPA Network","seoDescription":"Publishers track and protect every valid conversion. Advertisers control quality, fraud risk, and campaign spend."}',
  'Initial production baseline',
  strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
);
