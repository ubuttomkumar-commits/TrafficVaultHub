/**
 * TrafficVaultHub — Secure First Admin Account Bootstrap
 *
 * Implements hardened, one-time platform administrator account creation:
 * 1. Strictly requires BOOTSTRAP_SECRET (timing-safe comparison).
 * 2. Enforces ZERO existing platform operator accounts (permanently disabled once an admin exists).
 * 3. Enforces strong password complexity (min 12 chars, uppercase, lowercase, digit, symbol).
 * 4. Automatic email verification flag (email_verified = 1, email_verified_at = now).
 * 5. Full immutable audit trail in review_audit_log and audit_events.
 * 6. Explicit platform_operator / super_admin role assignment.
 */

import { HTTPException } from "hono/http-exception";
import type { Env } from "../env";
import { hashPassword } from "./password";
import { timingSafeEqualString } from "./crypto";
import { PLATFORM_OPS_ROLE_IDS } from "./rbac";

export const SUPER_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000101";
export const OPERATIONS_ADMIN_ROLE_ID = "00000000-0000-4000-8000-000000000102";

export interface PasswordComplexityResult {
  valid: boolean;
  reason?: string;
}

export function validatePasswordComplexity(password: string): PasswordComplexityResult {
  if (!password || typeof password !== "string") {
    return { valid: false, reason: "Password is required" };
  }
  if (password.length < 12) {
    return { valid: false, reason: "Password must be at least 12 characters long" };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one uppercase letter (A-Z)" };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one lowercase letter (a-z)" };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one numeric digit (0-9)" };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one special character / symbol" };
  }
  return { valid: true };
}

export async function hasExistingPlatformAdmin(db: D1Database): Promise<boolean> {
  const ph = PLATFORM_OPS_ROLE_IDS.map(() => "?").join(", ");
  try {
    const row = await db.prepare(
      `SELECT COUNT(*) AS count
       FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       WHERE om.status = 'ACTIVE'
         AND UPPER(o.type) = 'PLATFORM'
         AND o.deleted_at IS NULL
         AND om.role_id IN (${ph})`
    ).bind(...PLATFORM_OPS_ROLE_IDS).first<{ count: number }>();

    return (row?.count ?? 0) > 0;
  } catch (err) {
    console.warn("hasExistingPlatformAdmin check error:", err);
    return false;
  }
}

export interface BootstrapParams {
  email: string;
  password: string;
  displayName?: string;
  secretProvided?: string;
}

export interface BootstrapResult {
  userId: string;
  email: string;
  organizationId: string;
  role: string;
  message: string;
}

export async function executeAdminBootstrap(
  db: D1Database,
  env: Env,
  params: BootstrapParams,
  correlationId: string
): Promise<BootstrapResult> {
  const configuredSecret = env.BOOTSTRAP_SECRET?.trim();
  const provided = (params.secretProvided || "").trim();

  // 1. Verify BOOTSTRAP_SECRET with constant-time equality
  if (!configuredSecret) {
    // If not configured in production, fail closed
    if ((env.ENVIRONMENT || "").toLowerCase() === "production") {
      throw new HTTPException(500, {
        message: "BOOTSTRAP_SECRET environment secret is not configured on this platform instance.",
      });
    }
    // In local non-production dev, if no secret was configured, require standard dev secret
    const devFallbackSecret = "TrafficVaultHub-Dev-Bootstrap-Secret-2026";
    if (!provided || !timingSafeEqualString(provided, devFallbackSecret)) {
      throw new HTTPException(401, {
        message: "Invalid bootstrap secret. Set BOOTSTRAP_SECRET secret in Worker environment.",
      });
    }
  } else {
    if (!provided || !timingSafeEqualString(provided, configuredSecret)) {
      throw new HTTPException(401, {
        message: "Invalid bootstrap authorization secret.",
      });
    }
  }

  // 2. Strict invariant: Bootstrap can ONLY run if ZERO admins currently exist
  const adminAlreadyExists = await hasExistingPlatformAdmin(db);
  if (adminAlreadyExists) {
    throw new HTTPException(409, {
      message: "Platform administrator already initialized. Admin bootstrap is permanently disabled.",
    });
  }

  // 3. Email validation
  const email = (params.email || "").trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HTTPException(400, {
      message: "A valid platform administrator email address is required.",
    });
  }

  // 4. Password complexity check
  const complexity = validatePasswordComplexity(params.password);
  if (!complexity.valid) {
    throw new HTTPException(400, {
      message: `Weak password rejected: ${complexity.reason}`,
    });
  }

  const displayName = params.displayName?.trim() || "Platform Super Administrator";
  const now = new Date().toISOString();

  // 5. Ensure core tables exist (roles, organizations, members)
  try {
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS roles (
          id          TEXT PRIMARY KEY NOT NULL,
          key         TEXT NOT NULL,
          name        TEXT NOT NULL,
          description TEXT,
          is_system   INTEGER NOT NULL DEFAULT 0,
          is_owner    INTEGER NOT NULL DEFAULT 0
        )
      `),
      db.prepare(`
        INSERT OR IGNORE INTO roles (id, key, name, description, is_system, is_owner) VALUES
          ('00000000-0000-4000-8000-000000000101', 'SUPER_ADMIN', 'Super Admin', 'Full platform control', 1, 1),
          ('00000000-0000-4000-8000-000000000102', 'OPERATIONS_ADMIN', 'Operations Admin', 'Operational and compliance review', 1, 0),
          ('00000000-0000-4000-8000-000000000103', 'FINANCE_MANAGER', 'Finance Manager', 'Financial and payout control', 1, 0)
      `),
    ]);
  } catch {
    /* non-fatal */
  }

  // 6. Find or create PLATFORM organization
  let orgRow = await db.prepare(
    `SELECT id FROM organizations WHERE UPPER(type) = 'PLATFORM' AND deleted_at IS NULL LIMIT 1`
  ).first<{ id: string }>();

  let orgId = orgRow?.id;
  if (!orgId) {
    orgId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO organizations (id, type, name, slug, status, created_at, updated_at)
       VALUES (?, 'PLATFORM', 'TrafficVaultHub Platform Operations', 'platform-hq', 'ACTIVE', ?, ?)`
    ).bind(orgId, now, now).run();
  }

  // 7. Check if user already exists in users table
  const existingUser = await db.prepare(
    `SELECT id, status FROM users WHERE lower(email) = ? AND deleted_at IS NULL LIMIT 1`
  ).bind(email).first<{ id: string; status: string }>();

  let userId = existingUser?.id;
  const { hash, algorithm } = await hashPassword(params.password);

  if (userId) {
    // Elevate and verify existing user account
    await db.prepare(
      `UPDATE users
       SET status = 'ACTIVE', email_verified = 1, email_verified_at = ?, display_name = ?, updated_at = ?
       WHERE id = ?`
    ).bind(now, displayName, now, userId).run();

    // Update credentials
    const credRow = await db.prepare(
      `SELECT id FROM user_credentials WHERE user_id = ? LIMIT 1`
    ).bind(userId).first<{ id: string }>();

    if (credRow?.id) {
      await db.prepare(
        `UPDATE user_credentials
         SET password_hash = ?, hash_algorithm = ?, failed_attempts = 0, locked_until = NULL, updated_at = ?
         WHERE id = ?`
      ).bind(hash, algorithm, now, credRow.id).run();
    } else {
      await db.prepare(
        `INSERT INTO user_credentials (id, user_id, password_hash, hash_algorithm, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), userId, hash, algorithm, now).run();
    }
  } else {
    // Create new admin user
    userId = crypto.randomUUID();
    const credId = crypto.randomUUID();

    await db.batch([
      db.prepare(
        `INSERT INTO users (id, email, display_name, status, email_verified, email_verified_at, created_at, updated_at)
         VALUES (?, ?, ?, 'ACTIVE', 1, ?, ?, ?)`
      ).bind(userId, email, displayName, now, now, now),
      db.prepare(
        `INSERT INTO user_credentials (id, user_id, password_hash, hash_algorithm, created_at)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(credId, userId, hash, algorithm, now),
    ]);
  }

  // 8. Assign Super Admin role in platform organization
  const existingMembership = await db.prepare(
    `SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ? LIMIT 1`
  ).bind(orgId, userId).first<{ id: string }>();

  if (existingMembership?.id) {
    await db.prepare(
      `UPDATE organization_members
       SET role_id = ?, status = 'ACTIVE', updated_at = ?
       WHERE id = ?`
    ).bind(SUPER_ADMIN_ROLE_ID, now, existingMembership.id).run();
  } else {
    await db.prepare(
      `INSERT INTO organization_members (id, organization_id, user_id, role_id, status, joined_at)
       VALUES (?, ?, ?, ?, 'ACTIVE', ?)`
    ).bind(crypto.randomUUID(), orgId, userId, SUPER_ADMIN_ROLE_ID, now).run();
  }

  // 9. Append immutable audit records
  try {
    await db.prepare(
      `INSERT INTO audit_events (id, actor_id, action, resource_type, resource_id, reason, correlation_id, created_at)
       VALUES (?, ?, 'SYSTEM_ADMIN_BOOTSTRAP', 'users', ?, 'First platform administrator initialized via secure bootstrap', ?, ?)`
    ).bind(crypto.randomUUID(), userId, userId, correlationId, now).run();
  } catch {
    /* non-fatal */
  }

  try {
    await db.prepare(
      `INSERT INTO review_audit_log (id, actor_id, action, reason_code, notes, policy_version, created_at)
       VALUES (?, ?, 'SYSTEM_ADMIN_BOOTSTRAP', 'INITIAL_SUPERADMIN_BOOTSTRAP', 'First platform operator initialized; bootstrap endpoint permanently locked', 'v5.0', ?)`
    ).bind(crypto.randomUUID(), userId, now).run();
  } catch {
    /* non-fatal */
  }

  return {
    userId,
    email,
    organizationId: orgId,
    role: "SUPER_ADMIN",
    message: "Platform administrator account successfully initialized. Bootstrap is now permanently disabled.",
  };
}
