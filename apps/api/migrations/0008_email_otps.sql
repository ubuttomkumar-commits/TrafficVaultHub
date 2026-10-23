-- 0008_email_otps.sql
-- Production-grade Email OTP verification storage with attempt limiting & cryptographic hashes

CREATE TABLE IF NOT EXISTS email_otps (
  id              TEXT PRIMARY KEY NOT NULL,
  email           TEXT NOT NULL,
  user_id         TEXT,
  application_id  TEXT,
  otp_hash        TEXT NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  max_attempts    INTEGER NOT NULL DEFAULT 5,
  expires_at      TEXT NOT NULL,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  verified_at     TEXT,
  ip_address      TEXT,
  user_agent      TEXT
);

CREATE INDEX IF NOT EXISTS idx_email_otps_email ON email_otps(email);
CREATE INDEX IF NOT EXISTS idx_email_otps_created ON email_otps(created_at);
