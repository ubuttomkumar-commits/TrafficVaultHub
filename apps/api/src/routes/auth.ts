/**
 * Auth against existing users / user_credentials / sessions tables.
 * No parallel auth system.
 */

import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../env";
import { hashPassword, verifyPassword } from "../lib/password";
import { sha256Hex } from "../lib/crypto";
import { requireAuth } from "../middleware/auth";
import { rateLimit } from "../middleware/rate-limit";

export const authRoutes = new Hono<{ Bindings: Env }>();

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_FAILED = 8;
const LOCK_MINUTES = 15;

function newId(): string {
  return crypto.randomUUID();
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

type CredRow = {
  cred_id: string;
  user_id: string;
  password_hash: string;
  hash_algorithm: string;
  failed_attempts: number;
  locked_until: string | null;
  email: string;
  display_name: string | null;
  user_status: string;
};

authRoutes.post("/login", rateLimit({ keyPrefix: "login", limit: 20, windowSeconds: 60 }), async (c) => {
  const correlationId = c.get("correlationId");
  let body: { email?: string; password?: string };
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "Invalid JSON body" });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  if (!email || !password || password.length < 8) {
    throw new HTTPException(400, {
      message: "Email and password (min 8) required",
    });
  }

  const ip =
    c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  const ua = c.req.header("user-agent") ?? null;

  const row = await c.env.DB.prepare(
    `SELECT c.id AS cred_id, c.user_id, c.password_hash, c.hash_algorithm,
            c.failed_attempts, c.locked_until,
            u.email, u.display_name, u.status AS user_status
     FROM user_credentials c
     INNER JOIN users u ON u.id = c.user_id
     WHERE lower(u.email) = ? AND u.deleted_at IS NULL
     LIMIT 1`
  )
    .bind(email)
    .first<CredRow>();

  if (!row) {
    return c.json(
      {
        error: {
          code: "invalid_credentials",
          message: "Invalid email or password",
          correlationId,
        },
      },
      401
    );
  }

  if (row.user_status !== "ACTIVE") {
    return c.json(
      {
        error: {
          code: "account_inactive",
          message: "Account is not active",
          correlationId,
        },
      },
      403
    );
  }

  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) {
    return c.json(
      {
        error: {
          code: "account_locked",
          message: "Too many failed attempts; try again later",
          correlationId,
        },
      },
      423
    );
  }

  const ok = await verifyPassword(
    password,
    row.password_hash,
    row.hash_algorithm
  );

  if (!ok) {
    const attempts = (row.failed_attempts ?? 0) + 1;
    const lockedUntil =
      attempts >= MAX_FAILED
        ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000).toISOString()
        : null;
    await c.env.DB.prepare(
      `UPDATE user_credentials
       SET failed_attempts = ?, locked_until = ?,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`
    )
      .bind(attempts, lockedUntil, row.cred_id)
      .run();

    try {
      await c.env.DB.prepare(
        `INSERT INTO auth_events (id, user_id, event_type, ip_address, user_agent, request_id)
         VALUES (?, ?, 'LOGIN_FAILED', ?, ?, ?)`
      )
        .bind(newId(), row.user_id, ip, ua, correlationId)
        .run();
    } catch {
      /* non-fatal */
    }

    return c.json(
      {
        error: {
          code: "invalid_credentials",
          message: "Invalid email or password",
          correlationId,
        },
      },
      401
    );
  }

  await c.env.DB.prepare(
    `UPDATE user_credentials
     SET failed_attempts = 0, locked_until = NULL,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  )
    .bind(row.cred_id)
    .run();

  const rawToken = randomToken();
  const tokenHash = await sha256Hex(rawToken);
  const sessionId = newId();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  await c.env.DB.prepare(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(sessionId, row.user_id, tokenHash, expiresAt, ip, ua)
    .run();

  await c.env.DB.prepare(
    `UPDATE users SET last_login_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
                        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  )
    .bind(row.user_id)
    .run();

  try {
    await c.env.DB.prepare(
      `INSERT INTO auth_events (id, user_id, event_type, session_id, ip_address, user_agent, request_id)
       VALUES (?, ?, 'LOGIN_SUCCEEDED', ?, ?, ?, ?)`
    )
      .bind(newId(), row.user_id, sessionId, ip, ua, correlationId)
      .run();
  } catch {
    /* non-fatal */
  }

  return c.json({
    data: {
      token: rawToken,
      expiresAt,
      user: {
        id: row.user_id,
        email: row.email,
        displayName: row.display_name,
      },
    },
    correlationId,
  });
});

authRoutes.post("/logout", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user");
  if (user?.sessionId) {
    await c.env.DB.prepare(
      `UPDATE sessions
       SET revoked_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
           revoked_reason = 'logout'
       WHERE id = ? AND revoked_at IS NULL`
    )
      .bind(user.sessionId)
      .run();

    try {
      await c.env.DB.prepare(
        `INSERT INTO auth_events (id, user_id, event_type, session_id, request_id)
         VALUES (?, ?, 'LOGOUT', ?, ?)`
      )
        .bind(newId(), user.id, user.sessionId, correlationId)
        .run();
    } catch {
      /* non-fatal */
    }
  }
  return c.json({ data: { ok: true }, correlationId });
});

authRoutes.get("/me", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;

  const memberships = await c.env.DB.prepare(
    `SELECT om.organization_id, om.role_id, om.status AS member_status,
            o.name AS org_name, o.type AS org_type, o.slug AS org_slug,
            r.name AS role_name
     FROM organization_members om
     INNER JOIN organizations o ON o.id = om.organization_id
     INNER JOIN roles r ON r.id = om.role_id
     WHERE om.user_id = ? AND om.status = 'ACTIVE' AND o.deleted_at IS NULL`
  )
    .bind(user.id)
    .all();

  return c.json({
    data: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      status: user.status,
      memberships: memberships.results ?? [],
    },
    correlationId,
  });
});

/**
 * First-user bootstrap when the users table is empty.
 * Blocked in production ENVIRONMENT.
 */
authRoutes.post("/bootstrap", async (c) => {
  const correlationId = c.get("correlationId");

  if ((c.env.ENVIRONMENT || "").toLowerCase() === "production") {
    throw new HTTPException(403, { message: "Bootstrap disabled in production" });
  }

  const count = await c.env.DB.prepare(
    `SELECT COUNT(*) AS c FROM users WHERE deleted_at IS NULL`
  ).first<{ c: number }>();

  if ((count?.c ?? 0) > 0) {
    return c.json(
      {
        error: {
          code: "bootstrap_unavailable",
          message: "Users already exist; bootstrap disabled",
          correlationId,
        },
      },
      409
    );
  }

  let body: { email?: string; password?: string; displayName?: string };
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "Invalid JSON body" });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const displayName = body.displayName?.trim() || "Platform Admin";

  if (!email || !password || password.length < 12) {
    throw new HTTPException(400, {
      message: "email and password (min 12 characters) required",
    });
  }

  const userId = newId();
  const credId = newId();
  const orgId = newId();
  const memberId = newId();
  const { hash, algorithm } = await hashPassword(password);
  const superAdminRoleId = "00000000-0000-4000-8000-000000000101";

  await c.env.DB.batch([
    c.env.DB.prepare(
      `INSERT INTO organizations (id, type, name, slug, status)
       VALUES (?, 'PLATFORM', 'TrafficVaultHub Platform', 'platform', 'ACTIVE')`
    ).bind(orgId),
    c.env.DB.prepare(
      `INSERT INTO users (id, email, email_verified_at, display_name, status)
       VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?, 'ACTIVE')`
    ).bind(userId, email, displayName),
    c.env.DB.prepare(
      `INSERT INTO user_credentials (id, user_id, password_hash, hash_algorithm)
       VALUES (?, ?, ?, ?)`
    ).bind(credId, userId, hash, algorithm),
    c.env.DB.prepare(
      `INSERT INTO organization_members (id, organization_id, user_id, role_id, status, joined_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', strftime('%Y-%m-%dT%H:%M:%fZ','now'))`
    ).bind(memberId, orgId, userId, superAdminRoleId),
  ]);

  return c.json(
    {
      data: {
        userId,
        email,
        organizationId: orgId,
        message: "Bootstrap complete. Use POST /api/v1/auth/login",
      },
      correlationId,
    },
    201
  );
});

async function ensureAuthTables(db: D1Database) {
  try {
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS affiliate_profiles (
          id              TEXT PRIMARY KEY NOT NULL,
          organization_id TEXT NOT NULL,
          status          TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS advertiser_profiles (
          id              TEXT PRIMARY KEY NOT NULL,
          organization_id TEXT NOT NULL,
          status          TEXT NOT NULL DEFAULT 'ACTIVE',
          created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS roles (
          id          TEXT PRIMARY KEY NOT NULL,
          name        TEXT NOT NULL,
          description TEXT
        )
      `),
      db.prepare(`
        INSERT OR IGNORE INTO roles (id, name, description) VALUES
          ('00000000-0000-4000-8000-000000000101', 'Super Administrator', 'Full platform control'),
          ('00000000-0000-4000-8000-000000000102', 'Platform Operator', 'Operational and compliance review'),
          ('00000000-0000-4000-8000-000000000103', 'Platform Finance', 'Financial and payout control'),
          ('00000000-0000-4000-8000-000000000201', 'Affiliate Owner', 'Primary affiliate account administrator'),
          ('00000000-0000-4000-8000-000000000301', 'Advertiser Owner', 'Primary advertiser account administrator')
      `),
    ]);
  } catch (err) {
    console.warn("ensureAuthTables initialization:", err);
  }
}

/**
 * Public registration for Publishers and Advertisers.
 * Strictly blocks privileged roles.
 */
authRoutes.post("/register", rateLimit({ keyPrefix: "register", limit: 10, windowSeconds: 60 }), async (c) => {
  const correlationId = c.get("correlationId");
  await ensureAuthTables(c.env.DB);

  let body: {
    email?: string;
    password?: string;
    displayName?: string;
    accountType?: string;
    organizationName?: string;
  };

  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "Invalid JSON body" });
  }

  const email = body.email?.trim().toLowerCase();
  const password = body.password ?? "";
  const displayName = body.displayName?.trim() || "";
  const rawType = (body.accountType || "PUBLISHER").trim().toUpperCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "A valid email address is required",
          correlationId,
        },
      },
      400
    );
  }

  if (password.length < 8) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Password must be at least 8 characters long",
          correlationId,
        },
      },
      400
    );
  }

  if (!displayName || displayName.length < 2) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Display name must be at least 2 characters",
          correlationId,
        },
      },
      400
    );
  }

  // Public registration must NEVER allow PLATFORM or ADMIN roles
  if (rawType !== "PUBLISHER" && rawType !== "ADVERTISER") {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "accountType must be either PUBLISHER or ADVERTISER",
          correlationId,
        },
      },
      400
    );
  }

  const isAdvertiser = rawType === "ADVERTISER";
  const orgType = isAdvertiser ? "ADVERTISER" : "AFFILIATE";
  const roleId = isAdvertiser
    ? "00000000-0000-4000-8000-000000000301"
    : "00000000-0000-4000-8000-000000000201";

  // Check duplicate email
  const existing = await c.env.DB.prepare(
    `SELECT id FROM users WHERE lower(email) = ? AND deleted_at IS NULL LIMIT 1`
  )
    .bind(email)
    .first();

  if (existing) {
    return c.json(
      {
        error: {
          code: "account_exists",
          message: "An account with this email address already exists. Please sign in.",
          correlationId,
        },
      },
      409
    );
  }

  const userId = newId();
  const credId = newId();
  const orgId = newId();
  const memberId = newId();
  const profileId = newId();
  const sessionId = newId();

  const orgName = body.organizationName?.trim() || `${displayName} ${isAdvertiser ? "Advertising" : "Media"}`;
  const slugBase = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "org";
  const slug = `${slugBase}-${newId().slice(0, 6)}`;

  const { hash, algorithm } = await hashPassword(password);
  const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? null;
  const ua = c.req.header("user-agent") ?? null;

  try {
    const batchOps = [
      c.env.DB.prepare(
        `INSERT INTO users (id, email, email_verified_at, display_name, status)
         VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'), ?, 'ACTIVE')`
      ).bind(userId, email, displayName),

      c.env.DB.prepare(
        `INSERT INTO user_credentials (id, user_id, password_hash, hash_algorithm)
         VALUES (?, ?, ?, ?)`
      ).bind(credId, userId, hash, algorithm),

      c.env.DB.prepare(
        `INSERT INTO organizations (id, type, name, slug, status)
         VALUES (?, ?, ?, ?, 'ACTIVE')`
      ).bind(orgId, orgType, orgName, slug),

      c.env.DB.prepare(
        `INSERT INTO organization_members (id, organization_id, user_id, role_id, status, joined_at)
         VALUES (?, ?, ?, ?, 'ACTIVE', strftime('%Y-%m-%dT%H:%M:%fZ','now'))`
      ).bind(memberId, orgId, userId, roleId),
    ];

    if (isAdvertiser) {
      batchOps.push(
        c.env.DB.prepare(
          `INSERT INTO advertiser_profiles (id, organization_id, status) VALUES (?, ?, 'ACTIVE')`
        ).bind(profileId, orgId)
      );
    } else {
      batchOps.push(
        c.env.DB.prepare(
          `INSERT INTO affiliate_profiles (id, organization_id, status) VALUES (?, ?, 'ACTIVE')`
        ).bind(profileId, orgId)
      );
    }

    await c.env.DB.batch(batchOps);

    // Issue initial session
    const rawToken = randomToken();
    const tokenHash = await sha256Hex(rawToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

    await c.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token_hash, expires_at, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(sessionId, userId, tokenHash, expiresAt, ip, ua).run();

    try {
      await c.env.DB.prepare(
        `INSERT INTO auth_events (id, user_id, event_type, session_id, ip_address, user_agent, request_id)
         VALUES (?, ?, 'REGISTER_SUCCEEDED', ?, ?, ?, ?)`
      ).bind(newId(), userId, sessionId, ip, ua, correlationId).run();
    } catch {
      /* non-fatal */
    }

    return c.json(
      {
        data: {
          token: rawToken,
          expiresAt,
          user: {
            id: userId,
            email,
            displayName,
            accountType: rawType,
            organizationId: orgId,
          },
          organization: {
            id: orgId,
            name: orgName,
            type: orgType,
            slug,
          },
        },
        correlationId,
      },
      201
    );
  } catch (err) {
    console.error(`[${correlationId}] Registration failed:`, err);
    return c.json(
      {
        error: {
          code: "registration_failed",
          message: "Unable to complete registration. Please try again.",
          correlationId,
        },
      },
      500
    );
  }
});

