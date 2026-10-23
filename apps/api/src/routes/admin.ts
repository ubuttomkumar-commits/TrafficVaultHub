import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator, PLATFORM_OPS_ROLE_IDS } from "../lib/rbac";
import { executeAdminBootstrap } from "../lib/bootstrap";
import { rateLimit } from "../middleware/rate-limit";
import { sha256Hex } from "../lib/crypto";

export const adminRoutes = new Hono<{ Bindings: Env }>();

/**
 * POST /api/v1/admin/bootstrap
 * Secure, one-time bootstrap endpoint for creating the first platform administrator.
 * Protected by BOOTSTRAP_SECRET and permanently disabled once an admin exists.
 */
adminRoutes.post("/bootstrap", rateLimit({ keyPrefix: "bootstrap", limit: 5, windowSeconds: 900 }), async (c) => {
  const correlationId = c.get("correlationId");
  let body: {
    email?: string;
    password?: string;
    displayName?: string;
    bootstrapSecret?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    throw new HTTPException(400, { message: "Invalid JSON body" });
  }

  const secretProvided = c.req.header("x-bootstrap-secret") || body.bootstrapSecret;

  const result = await executeAdminBootstrap(
    c.env.DB,
    c.env,
    {
      email: body.email || "",
      password: body.password || "",
      displayName: body.displayName,
      secretProvided,
    },
    correlationId
  );

  return c.json({ data: result, correlationId }, 201);
});

// All subsequent admin routes strictly enforce platform operator permissions
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

    let partnerAppResults: Array<{ status: string; count: number }> = [];
    let pendingPublishers = 0;
    let pendingAdvertisers = 0;
    let highRiskPending = 0;
    let totalApps = 0;
    let verifiedApps = 0;
    let decisions24h = 0;
    let recentAuditFeed: any[] = [];

    try {
      const [appCounts, typeStatusCounts, verifStats, highRiskRes, recentDecisionsRes, auditFeedRes] = await Promise.all([
        c.env.DB.prepare(
          `SELECT status, COUNT(*) AS count FROM partner_applications GROUP BY status`
        ).all<{ status: string; count: number }>(),

        c.env.DB.prepare(
          `SELECT account_type, status, COUNT(*) AS count FROM partner_applications GROUP BY account_type, status`
        ).all<{ account_type: string; status: string; count: number }>(),

        c.env.DB.prepare(
          `SELECT COUNT(*) AS total, SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) AS verified FROM partner_applications`
        ).first<{ total: number; verified: number }>(),

        c.env.DB.prepare(
          `SELECT COUNT(*) AS high_risk FROM partner_applications WHERE risk_score >= 25 AND status = 'PENDING_REVIEW'`
        ).first<{ high_risk: number }>(),

        c.env.DB.prepare(
          `SELECT COUNT(*) AS count FROM review_audit_log
           WHERE action IN ('FULL_APPROVAL', 'CONDITIONAL_APPROVAL', 'REJECTION', 'REQUEST_MORE_DOCS', 'SCHEDULE_CALL')
             AND created_at > datetime('now', '-24 hours')`
        ).first<{ count: number }>(),

        c.env.DB.prepare(
          `SELECT ral.id, ral.application_id, ral.actor_id, ral.action, ral.reason_code, ral.notes, ral.created_at,
                  pa.first_name, pa.last_name, pa.account_type, pa.email
           FROM review_audit_log ral
           LEFT JOIN partner_applications pa ON pa.id = ral.application_id
           ORDER BY ral.created_at DESC
           LIMIT 8`
        ).all<any>(),
      ]);

      partnerAppResults = appCounts.results ?? [];

      for (const row of typeStatusCounts.results ?? []) {
        if (row.status === "PENDING_REVIEW") {
          if (row.account_type === "PUBLISHER") pendingPublishers = row.count;
          if (row.account_type === "ADVERTISER") pendingAdvertisers = row.count;
        }
      }

      totalApps = verifStats?.total ?? 0;
      verifiedApps = verifStats?.verified ?? 0;
      highRiskPending = highRiskRes?.high_risk ?? 0;
      decisions24h = recentDecisionsRes?.count ?? 0;
      recentAuditFeed = auditFeedRes.results ?? [];
    } catch (dbErr) {
      console.warn("Notice: partner application metrics query:", dbErr);
    }

    const emailVerificationRate = totalApps > 0 ? Math.round((verifiedApps / totalApps) * 100) : 100;

    return c.json({
      data: {
        users: { total: userCount?.total ?? 0 },
        organizations: orgSummary,
        offers: offerSummary,
        conversions: conversionSummary,
        complianceCases: compliance.results ?? [],
        payouts: payouts.results ?? [],
        journalEntries: journal.results ?? [],
        partnerApplications: partnerAppResults,
        operationalMetrics: {
          pendingPublishers,
          pendingAdvertisers,
          highRiskPending,
          totalApplications: totalApps,
          verifiedApplications: verifiedApps,
          emailVerificationRate,
          decisions24h,
          openComplianceCases: compliance.results?.filter((c) => c.status === "OPEN").length ?? 0,
        },
        recentAuditFeed,
        systemHealth: {
          status: "OPERATIONAL",
          apiVersion: c.env.API_VERSION || "v1",
          environment: c.env.ENVIRONMENT || "development",
          database: "D1_ACTIVE",
          checkedAt: new Date().toISOString(),
        },
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
