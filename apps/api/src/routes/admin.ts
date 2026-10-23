import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator } from "../lib/rbac";

export const adminRoutes = new Hono<{ Bindings: Env }>();

// All admin routes strictly enforce platform operator permissions
adminRoutes.use("*", requireAuth(), async (c, next) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const isOperator = await isPlatformOperator(c.env.DB, user.id);
  if (!isOperator) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Platform operator privileges required for admin operations",
          correlationId,
        },
      },
      403
    );
  }
  return next();
});

/**
 * GET /api/v1/admin/overview
 * Platform statistics derived directly from database truth
 */
adminRoutes.get("/overview", async (c) => {
  const correlationId = c.get("correlationId");

  try {
    const [userCount, orgs, offers, conversions, compliance, payouts, journal] =
      await Promise.all([
        c.env.DB.prepare(
          `SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL`
        ).first<{ total: number }>(),

        c.env.DB.prepare(
          `SELECT type, COUNT(*) AS count FROM organizations WHERE deleted_at IS NULL GROUP BY type`
        ).all<{ type: string; count: number }>(),

        c.env.DB.prepare(
          `SELECT status, COUNT(*) AS count FROM offers GROUP BY status`
        ).all<{ status: string; count: number }>(),

        c.env.DB.prepare(
          `SELECT lifecycle_status, COUNT(*) AS count, COALESCE(SUM(commission_amount_minor), 0) AS total_minor
           FROM conversions GROUP BY lifecycle_status`
        ).all<{ lifecycle_status: string; count: number; total_minor: number }>(),

        c.env.DB.prepare(
          `SELECT status, COUNT(*) AS count FROM compliance_cases GROUP BY status`
        ).all<{ status: string; count: number }>(),

        c.env.DB.prepare(
          `SELECT status, COUNT(*) AS count, COALESCE(SUM(amount_minor), 0) AS total_minor
           FROM payout_requests GROUP BY status`
        ).all<{ status: string; count: number; total_minor: number }>(),

        c.env.DB.prepare(
          `SELECT journal_type, currency, COALESCE(SUM(total_minor), 0) AS total
           FROM journal_entries GROUP BY journal_type, currency`
        ).all<{ journal_type: string; currency: string; total: number }>(),
      ]);

    const orgSummary: Record<string, number> = {};
    for (const row of orgs.results ?? []) {
      orgSummary[row.type] = row.count;
    }

    const offerSummary: Record<string, number> = {};
    for (const row of offers.results ?? []) {
      offerSummary[row.status] = row.count;
    }

    const conversionSummary: Record<string, { count: number; totalMinor: number }> = {};
    for (const row of conversions.results ?? []) {
      conversionSummary[row.lifecycle_status] = {
        count: row.count,
        totalMinor: row.total_minor,
      };
    }

    return c.json({
      data: {
        users: { total: userCount?.total ?? 0 },
        organizations: orgSummary,
        offers: offerSummary,
        conversions: conversionSummary,
        complianceCases: compliance.results ?? [],
        payouts: payouts.results ?? [],
        journalEntries: journal.results ?? [],
      },
      correlationId,
    });
  } catch (err) {
    console.error(`[${correlationId}] admin overview failed:`, err);
    return c.json(
      {
        error: {
          code: "query_failed",
          message: "Unable to retrieve admin overview",
          correlationId,
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/admin/users
 * Search and list users with their tenant memberships
 */
adminRoutes.get("/users", async (c) => {
  const correlationId = c.get("correlationId");
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") || 50)));

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.display_name, u.status, u.created_at, u.last_login_at,
              o.id AS organization_id, o.name AS organization_name, o.type AS organization_type,
              r.name AS role_name
       FROM users u
       LEFT JOIN organization_members om ON om.user_id = u.id AND om.status = 'ACTIVE'
       LEFT JOIN organizations o ON o.id = om.organization_id
       LEFT JOIN roles r ON r.id = om.role_id
       WHERE u.deleted_at IS NULL
       ORDER BY u.created_at DESC
       LIMIT ?`
    ).bind(limit).all();

    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    console.error(`[${correlationId}] admin list users failed:`, err);
    return c.json({ data: [], correlationId });
  }
});

/**
 * PATCH /api/v1/admin/users/:id/status
 * Suspend or reinstate user account
 */
adminRoutes.patch("/users/:id/status", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const targetUserId = c.req.param("id");

  let body: { status?: string; reason?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "invalid_json", message: "Invalid JSON", correlationId } }, 400);
  }

  const newStatus = (body.status || "").toUpperCase();
  if (newStatus !== "ACTIVE" && newStatus !== "SUSPENDED") {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "status must be either ACTIVE or SUSPENDED",
          correlationId,
        },
      },
      400
    );
  }

  if (targetUserId === adminUser.id) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "You cannot change your own administrative account status",
          correlationId,
        },
      },
      403
    );
  }

  await c.env.DB.prepare(
    `UPDATE users SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
  ).bind(newStatus, targetUserId).run();

  try {
    await c.env.DB.prepare(
      `INSERT INTO audit_events (id, actor_id, action, resource_type, resource_id, reason, correlation_id)
       VALUES (?, ?, 'USER_STATUS_UPDATE', 'users', ?, ?, ?)`
    ).bind(
      crypto.randomUUID(),
      adminUser.id,
      targetUserId,
      body.reason || `Status changed to ${newStatus}`,
      correlationId
    ).run();
  } catch {
    /* non-fatal */
  }

  return c.json({
    data: { userId: targetUserId, status: newStatus },
    correlationId,
  });
});

/**
 * GET /api/v1/admin/audit-logs
 * Review immutable system and administrative audit records
 */
adminRoutes.get("/audit-logs", async (c) => {
  const correlationId = c.get("correlationId");
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") || 50)));

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT ae.id, ae.actor_id, ae.action, ae.resource_type, ae.resource_id,
              ae.reason, ae.correlation_id, ae.created_at,
              u.email AS actor_email, u.display_name AS actor_name
       FROM audit_events ae
       LEFT JOIN users u ON u.id = ae.actor_id
       ORDER BY ae.created_at DESC
       LIMIT ?`
    ).bind(limit).all();

    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    console.error(`[${correlationId}] admin list audit logs failed:`, err);
    return c.json({ data: [], correlationId });
  }
});
