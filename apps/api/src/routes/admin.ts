import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator, PLATFORM_OPS_ROLE_IDS } from "../lib/rbac";
import { executeAdminBootstrap } from "../lib/bootstrap";
import { rateLimit } from "../middleware/rate-limit";
import { writeAuditEvent } from "../lib/audit";
import { GoogleGenAI } from "@google/genai";

export const adminRoutes = new Hono<{ Bindings: Env }>();
export const publicCmsRoutes = new Hono<{ Bindings: Env }>();

// ===========================================================================
// PUBLIC CMS & ANNOUNCEMENTS ROUTES (No Auth Required)
// ===========================================================================

/**
 * GET /api/v1/cms/landing
 * Public published landing page content with live customization
 */
publicCmsRoutes.get("/landing", async (c) => {
  const correlationId = c.get("correlationId");
  try {
    const row = await c.env.DB.prepare(
      `SELECT content_json, version_number, published_at FROM cms_landing_content WHERE id = 'current_published' LIMIT 1`
    ).first<{ content_json: string; version_number: number; published_at: string }>();

    if (row && row.content_json) {
      return c.json({
        data: {
          ...JSON.parse(row.content_json),
          versionNumber: row.version_number,
          publishedAt: row.published_at,
        },
        correlationId,
      });
    }
  } catch (err) {
    /* fallback to default */
  }

  // Fallback defaults
  return c.json({
    data: {
      siteName: "TrafficVaultHub",
      tagline: "The CPA Network That Shows Its Work",
      logoUrl: "",
      heroHeadline: "The CPA Network That Shows Its Work",
      heroSubheadline: "Universal CPA affiliate network built on double-entry accounting and cryptographic proof. Every click accounted for. Every decision explained. Every valid payout tracked.",
      ctaPrimaryText: "Explore Live Offers",
      ctaPrimaryLink: "/offers",
      ctaSecondaryText: "Partner Verification",
      ctaSecondaryLink: "/signup",
      supportEmail: "support@trafficvaulthub.com",
      telegramHandle: "@TrafficVaultDesk",
      minPayoutDisplay: "$50 Minimum",
      seoTitle: "TrafficVaultHub — Universal CPA Network",
      seoDescription: "Publishers track and protect every valid conversion. Advertisers control quality, fraud risk, and campaign spend.",
    },
    correlationId,
  });
});

/**
 * GET /api/v1/announcements/active
 * Current sitewide active announcement
 */
publicCmsRoutes.get("/announcements/active", async (c) => {
  const correlationId = c.get("correlationId");
  try {
    const row = await c.env.DB.prepare(
      `SELECT id, title, message, link_url, link_label, style, target_audience
       FROM system_announcements
       WHERE is_active = 1
         AND (start_at IS NULL OR start_at <= datetime('now'))
         AND (end_at IS NULL OR end_at >= datetime('now'))
       ORDER BY created_at DESC
       LIMIT 1`
    ).first<any>();

    return c.json({ data: row || null, correlationId });
  } catch {
    return c.json({ data: null, correlationId });
  }
});

/**
 * GET /api/v1/maintenance/status
 * Real-time maintenance status check
 */
publicCmsRoutes.get("/maintenance/status", async (c) => {
  const correlationId = c.get("correlationId");
  try {
    const row = await c.env.DB.prepare(
      `SELECT is_enabled, headline, message, estimated_duration, allow_admin_bypass FROM maintenance_config WHERE id = 'singleton' LIMIT 1`
    ).first<any>();

    return c.json({
      data: {
        isEnabled: Boolean(row?.is_enabled),
        headline: row?.headline || "Scheduled System Maintenance",
        message: row?.message || "TrafficVaultHub is performing scheduled network synchronization.",
        estimatedDuration: row?.estimated_duration || "30 minutes",
        allowAdminBypass: Boolean(row?.allow_admin_bypass ?? true),
      },
      correlationId,
    });
  } catch {
    return c.json({ data: { isEnabled: false }, correlationId });
  }
});

// ===========================================================================
// ADMIN BOOTSTRAP (Special One-Time Setup Endpoint)
// ===========================================================================

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

// ===========================================================================
// STRICT SERVER-SIDE AUTHORIZATION MIDDLEWARE
// ===========================================================================

adminRoutes.use("*", requireAuth(), async (c, next) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const isOperator = await isPlatformOperator(c.env.DB, user.id);
  if (!isOperator) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Platform operator privileges required for administrative operations",
          correlationId,
        },
      },
      403
    );
  }
  return next();
});

// ===========================================================================
// MODULE 1: COMMAND CENTER OVERVIEW
// ===========================================================================

adminRoutes.get("/overview", async (c) => {
  const correlationId = c.get("correlationId");

  try {
    const [userCount, orgs, offers, conversions, compliance, payouts, journal] =
      await Promise.all([
        c.env.DB.prepare(`SELECT COUNT(*) AS total FROM users WHERE deleted_at IS NULL`).first<{ total: number }>(),
        c.env.DB.prepare(`SELECT type, COUNT(*) AS count FROM organizations WHERE deleted_at IS NULL GROUP BY type`).all<{ type: string; count: number }>(),
        c.env.DB.prepare(`SELECT status, COUNT(*) AS count FROM offers GROUP BY status`).all<{ status: string; count: number }>(),
        c.env.DB.prepare(
          `SELECT lifecycle_status, COUNT(*) AS count, COALESCE(SUM(commission_amount_minor), 0) AS total_minor
           FROM conversions GROUP BY lifecycle_status`
        ).all<{ lifecycle_status: string; count: number; total_minor: number }>(),
        c.env.DB.prepare(`SELECT status, COUNT(*) AS count FROM compliance_cases GROUP BY status`).all<{ status: string; count: number }>(),
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
    for (const row of orgs.results ?? []) orgSummary[row.type] = row.count;

    const offerSummary: Record<string, number> = {};
    for (const row of offers.results ?? []) offerSummary[row.status] = row.count;

    const conversionSummary: Record<string, { count: number; totalMinor: number }> = {};
    for (const row of conversions.results ?? []) {
      conversionSummary[row.lifecycle_status] = { count: row.count, totalMinor: row.total_minor };
    }

    let pendingPublishers = 0;
    let pendingAdvertisers = 0;
    let highRiskPending = 0;
    let totalApps = 0;
    let verifiedApps = 0;
    let decisions24h = 0;
    let recentAuditFeed: any[] = [];
    let isMaintenanceActive = false;

    try {
      const [typeStatusCounts, verifStats, highRiskRes, recentDecisionsRes, auditFeedRes, maintRes] = await Promise.all([
        c.env.DB.prepare(`SELECT account_type, status, COUNT(*) AS count FROM partner_applications GROUP BY account_type, status`).all<{ account_type: string; status: string; count: number }>(),
        c.env.DB.prepare(`SELECT COUNT(*) AS total, SUM(CASE WHEN email_verified = 1 THEN 1 ELSE 0 END) AS verified FROM partner_applications`).first<{ total: number; verified: number }>(),
        c.env.DB.prepare(`SELECT COUNT(*) AS high_risk FROM partner_applications WHERE risk_score >= 25 AND status = 'PENDING_REVIEW'`).first<{ high_risk: number }>(),
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
        c.env.DB.prepare(`SELECT is_enabled FROM maintenance_config WHERE id = 'singleton' LIMIT 1`).first<{ is_enabled: number }>(),
      ]);

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
      isMaintenanceActive = Boolean(maintRes?.is_enabled);
    } catch {
      /* non-fatal */
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
        maintenanceMode: isMaintenanceActive,
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
    return c.json({ error: { code: "query_failed", message: "Unable to retrieve admin overview", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 2: PUBLISHER CONTROL (Full CRUD, Caps, Holds, Dossier)
// ===========================================================================

adminRoutes.get("/publishers", async (c) => {
  const correlationId = c.get("correlationId");
  const search = (c.req.query("search") || "").trim().toLowerCase();
  const status = (c.req.query("status") || "ALL").toUpperCase();
  const risk = (c.req.query("riskLevel") || "ALL").toUpperCase();

  try {
    let query = `
      SELECT o.id AS org_id, o.name AS org_name, o.status AS org_status, o.created_at AS org_created_at,
             u.id AS user_id, u.email, u.display_name, u.status AS user_status, u.email_verified,
             pa.id AS application_id, pa.status AS app_status, pa.risk_score, pa.risk_flags,
             pa.traffic_sources, pa.conditional_caps, pa.contact_method, pa.contact_handle,
             COALESCE(conv.total_conversions, 0) AS total_conversions,
             COALESCE(conv.total_earned_minor, 0) AS total_earned_minor
      FROM organizations o
      LEFT JOIN organization_members om ON om.organization_id = o.id
      LEFT JOIN users u ON u.id = om.user_id
      LEFT JOIN partner_applications pa ON pa.email = u.email AND pa.account_type = 'PUBLISHER'
      LEFT JOIN (
        SELECT publisher_organization_id, COUNT(*) AS total_conversions,
               COALESCE(SUM(commission_amount_minor), 0) AS total_earned_minor
        FROM conversions
        WHERE lifecycle_status IN ('COMMISSION_PENDING', 'COMMISSION_APPROVED')
        GROUP BY publisher_organization_id
      ) conv ON conv.publisher_organization_id = o.id
      WHERE o.type = 'publisher' AND o.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (status !== "ALL") {
      query += ` AND o.status = ?`;
      params.push(status.toLowerCase());
    }

    if (risk === "HIGH") {
      query += ` AND pa.risk_score >= 25`;
    } else if (risk === "MEDIUM") {
      query += ` AND pa.risk_score >= 10 AND pa.risk_score < 25`;
    } else if (risk === "LOW") {
      query += ` AND pa.risk_score < 10`;
    }

    if (search) {
      query += ` AND (lower(o.name) LIKE ? OR lower(u.email) LIKE ? OR lower(u.display_name) LIKE ? OR lower(o.id) LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    query += ` ORDER BY o.created_at DESC LIMIT 100`;

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    console.error(`[${correlationId}] list publishers failed:`, err);
    return c.json({ data: [], correlationId });
  }
});

adminRoutes.get("/publishers/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const id = c.req.param("id");

  try {
    const org = await c.env.DB.prepare(
      `SELECT * FROM organizations WHERE id = ? AND type = 'publisher' LIMIT 1`
    ).bind(id).first<any>();

    if (!org) {
      return c.json({ error: { code: "not_found", message: "Publisher organization not found", correlationId } }, 404);
    }

    const [members, application, conversions, payouts, trackingLinks, auditEvents] = await Promise.all([
      c.env.DB.prepare(
        `SELECT u.id, u.email, u.display_name, u.status, u.email_verified, u.created_at, r.name AS role_name
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         LEFT JOIN roles r ON r.id = om.role_id
         WHERE om.organization_id = ?`
      ).bind(id).all(),
      c.env.DB.prepare(`SELECT * FROM partner_applications WHERE company_name = ? OR email IN (SELECT email FROM users WHERE id IN (SELECT user_id FROM organization_members WHERE organization_id = ?)) LIMIT 1`).bind(org.name, id).first<any>(),
      c.env.DB.prepare(
        `SELECT lifecycle_status, COUNT(*) AS count, COALESCE(SUM(commission_amount_minor), 0) AS total_minor
         FROM conversions WHERE publisher_organization_id = ? GROUP BY lifecycle_status`
      ).bind(id).all(),
      c.env.DB.prepare(`SELECT * FROM payout_requests WHERE organization_id = ? ORDER BY requested_at DESC LIMIT 10`).bind(id).all(),
      c.env.DB.prepare(`SELECT * FROM tracking_links WHERE organization_id = ? ORDER BY created_at DESC LIMIT 10`).bind(id).all(),
      c.env.DB.prepare(`SELECT * FROM audit_events WHERE resource_type = 'publisher' AND resource_id = ? ORDER BY created_at DESC LIMIT 20`).bind(id).all(),
    ]);

    return c.json({
      data: {
        organization: org,
        members: members.results ?? [],
        application: application || null,
        conversionsSummary: conversions.results ?? [],
        recentPayouts: payouts.results ?? [],
        trackingLinks: trackingLinks.results ?? [],
        auditHistory: auditEvents.results ?? [],
      },
      correlationId,
    });
  } catch (err) {
    return c.json({ error: { code: "query_failed", message: "Failed to load publisher details", correlationId } }, 500);
  }
});

adminRoutes.patch("/publishers/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  try {
    const existing = await c.env.DB.prepare(`SELECT * FROM organizations WHERE id = ? LIMIT 1`).bind(id).first<any>();
    if (!existing) {
      return c.json({ error: { code: "not_found", message: "Publisher not found", correlationId } }, 404);
    }

    const newStatus = body.status ? String(body.status).toLowerCase() : existing.status;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `UPDATE organizations SET status = ?, updated_at = ? WHERE id = ?`
    ).bind(newStatus, now, id).run();

    // If conditional caps or notes provided, record on application if linked
    if (body.conditionalCaps || body.notes) {
      await c.env.DB.prepare(
        `UPDATE partner_applications
         SET conditional_caps = COALESCE(?, conditional_caps),
             decision_notes = COALESCE(?, decision_notes),
             updated_at = ?
         WHERE company_name = ?`
      ).bind(
        body.conditionalCaps ? JSON.stringify(body.conditionalCaps) : null,
        body.notes || null,
        now,
        existing.name
      ).run();
    }

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "publisher.updated",
      resourceType: "publisher",
      resourceId: id,
      before: { status: existing.status },
      after: { status: newStatus, caps: body.conditionalCaps, notes: body.notes },
      reason: body.reason || "Administrative publisher moderation",
      correlationId,
    });

    return c.json({ data: { id, status: newStatus, updatedAt: now }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "update_failed", message: "Failed to update publisher", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 3: ADVERTISER CONTROL (KYB, Campaigns, Restricted Gate)
// ===========================================================================

adminRoutes.get("/advertisers", async (c) => {
  const correlationId = c.get("correlationId");
  const search = (c.req.query("search") || "").trim().toLowerCase();
  const status = (c.req.query("status") || "ALL").toUpperCase();

  try {
    let query = `
      SELECT o.id AS org_id, o.name AS org_name, o.status AS org_status, o.created_at AS org_created_at,
             u.id AS user_id, u.email, u.display_name, u.status AS user_status,
             pa.id AS application_id, pa.status AS app_status, pa.company_name, pa.country,
             COUNT(DISTINCT off.id) AS total_offers,
             SUM(CASE WHEN off.status = 'active' THEN 1 ELSE 0 END) AS active_offers
      FROM organizations o
      LEFT JOIN organization_members om ON om.organization_id = o.id
      LEFT JOIN users u ON u.id = om.user_id
      LEFT JOIN partner_applications pa ON pa.email = u.email AND pa.account_type = 'ADVERTISER'
      LEFT JOIN offers off ON off.organization_id = o.id
      WHERE o.type = 'advertiser' AND o.deleted_at IS NULL
    `;
    const params: any[] = [];

    if (status !== "ALL") {
      query += ` AND o.status = ?`;
      params.push(status.toLowerCase());
    }

    if (search) {
      query += ` AND (lower(o.name) LIKE ? OR lower(u.email) LIKE ? OR lower(pa.company_name) LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ` GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100`;

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    return c.json({ data: [], correlationId });
  }
});

adminRoutes.get("/advertisers/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const id = c.req.param("id");

  try {
    const org = await c.env.DB.prepare(
      `SELECT * FROM organizations WHERE id = ? AND type = 'advertiser' LIMIT 1`
    ).bind(id).first<any>();

    if (!org) {
      return c.json({ error: { code: "not_found", message: "Advertiser organization not found", correlationId } }, 404);
    }

    const [members, offers, complianceCases] = await Promise.all([
      c.env.DB.prepare(
        `SELECT u.id, u.email, u.display_name, u.status, u.created_at, r.name AS role_name
         FROM organization_members om
         JOIN users u ON u.id = om.user_id
         LEFT JOIN roles r ON r.id = om.role_id
         WHERE om.organization_id = ?`
      ).bind(id).all(),
      c.env.DB.prepare(
        `SELECT id, public_id, name, status, payout_model, currency, current_payout_version, created_at
         FROM offers WHERE organization_id = ? ORDER BY created_at DESC`
      ).bind(id).all(),
      c.env.DB.prepare(`SELECT * FROM compliance_cases WHERE organization_id = ? ORDER BY created_at DESC LIMIT 10`).bind(id).all(),
    ]);

    return c.json({
      data: {
        organization: org,
        members: members.results ?? [],
        offers: offers.results ?? [],
        complianceCases: complianceCases.results ?? [],
      },
      correlationId,
    });
  } catch (err) {
    return c.json({ error: { code: "query_failed", message: "Failed to load advertiser", correlationId } }, 500);
  }
});

adminRoutes.patch("/advertisers/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  try {
    const existing = await c.env.DB.prepare(`SELECT * FROM organizations WHERE id = ? LIMIT 1`).bind(id).first<any>();
    if (!existing) {
      return c.json({ error: { code: "not_found", message: "Advertiser not found", correlationId } }, 404);
    }

    const newStatus = body.status ? String(body.status).toLowerCase() : existing.status;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `UPDATE organizations SET status = ?, updated_at = ? WHERE id = ?`
    ).bind(newStatus, now, id).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "advertiser.updated",
      resourceType: "advertiser",
      resourceId: id,
      before: { status: existing.status },
      after: { status: newStatus, notes: body.notes },
      reason: body.reason || "Administrative advertiser moderation",
      correlationId,
    });

    return c.json({ data: { id, status: newStatus, updatedAt: now }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "update_failed", message: "Failed to update advertiser", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 4: OFFER / CAMPAIGN CONTROL (Full CRUD, Versioned Payouts, Status)
// ===========================================================================

adminRoutes.get("/offers", async (c) => {
  const correlationId = c.get("correlationId");
  const status = (c.req.query("status") || "ALL").toLowerCase();
  const search = (c.req.query("search") || "").trim().toLowerCase();

  try {
    let query = `
      SELECT o.id, o.public_id, o.organization_id, o.category_id, o.name, o.description,
             o.status, o.payout_model, o.currency, o.current_payout_version,
             o.attribution_window_hours, o.start_at, o.end_at, o.created_at, o.updated_at,
             cat.name AS category_name, cat.risk_classification,
             org.name AS advertiser_name,
             opr.affiliate_payout_minor, opr.event_name
      FROM offers o
      LEFT JOIN offer_categories cat ON cat.id = o.category_id
      LEFT JOIN organizations org ON org.id = o.organization_id
      LEFT JOIN offer_payout_rules opr ON opr.offer_id = o.id AND opr.version = o.current_payout_version
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status !== "all") {
      query += ` AND o.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (lower(o.name) LIKE ? OR lower(o.public_id) LIKE ? OR lower(org.name) LIKE ?)`;
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    query += ` ORDER BY o.created_at DESC LIMIT 100`;

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    return c.json({ data: [], correlationId });
  }
});

adminRoutes.post("/offers", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const body = await c.req.json().catch(() => ({}));

  if (!body.name || !body.payoutModel) {
    return c.json({ error: { code: "validation_error", message: "name and payoutModel required", correlationId } }, 400);
  }

  const id = "off_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const publicId = body.publicId || ("OFF-" + Math.floor(100000 + Math.random() * 900000));
  const orgId = body.organizationId || "org_trafficvault_platform";
  const categoryId = body.categoryId || "cat_dating_mainstream";
  const status = (body.status || "draft").toLowerCase();
  const payoutModel = body.payoutModel.toLowerCase();
  const currency = (body.currency || "USD").toUpperCase();
  const payoutMinor = Number(body.affiliatePayoutMinor || 2500);
  const now = new Date().toISOString();

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO offers (
          id, public_id, organization_id, category_id, name, description,
          status, payout_model, currency, current_payout_version, attribution_window_hours,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 720, ?, ?)`
      ).bind(
        id, publicId, orgId, categoryId, body.name, body.description || null,
        status, payoutModel, currency, now, now
      ),
      c.env.DB.prepare(
        `INSERT INTO offer_payout_rules (
          id, offer_id, version, affiliate_payout_minor, network_fee_minor,
          advertiser_cost_minor, event_name, effective_from, created_at
        ) VALUES (?, ?, 1, ?, 0, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(), id, payoutMinor, payoutMinor, body.eventName || "conversion", now, now
      ),
    ]);

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "offer.created",
      resourceType: "offer",
      resourceId: id,
      after: { name: body.name, status, payoutModel, payoutMinor },
      correlationId,
    });

    return c.json({ data: { id, publicId, status }, correlationId }, 201);
  } catch (err) {
    return c.json({ error: { code: "create_failed", message: err instanceof Error ? err.message : "Failed to create offer", correlationId } }, 500);
  }
});

adminRoutes.patch("/offers/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  try {
    const existing = await c.env.DB.prepare(`SELECT * FROM offers WHERE id = ? LIMIT 1`).bind(id).first<any>();
    if (!existing) {
      return c.json({ error: { code: "not_found", message: "Offer not found", correlationId } }, 404);
    }

    const newStatus = body.status ? String(body.status).toLowerCase() : existing.status;
    const newName = body.name || existing.name;
    const newDesc = body.description !== undefined ? body.description : existing.description;
    const newCategory = body.categoryId || existing.category_id;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `UPDATE offers
       SET status = ?, name = ?, description = ?, category_id = ?, updated_at = ?
       WHERE id = ?`
    ).bind(newStatus, newName, newDesc, newCategory, now, id).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "offer.status_updated",
      resourceType: "offer",
      resourceId: id,
      before: { status: existing.status, name: existing.name },
      after: { status: newStatus, name: newName },
      reason: body.reason || `Status updated to ${newStatus}`,
      correlationId,
    });

    return c.json({ data: { id, status: newStatus, updatedAt: now }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "update_failed", message: "Failed to update offer", correlationId } }, 500);
  }
});

adminRoutes.post("/offers/:id/new-payout-version", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const payoutMinor = Number(body.affiliatePayoutMinor);
  if (!payoutMinor || payoutMinor <= 0) {
    return c.json({ error: { code: "validation_error", message: "Valid affiliatePayoutMinor required", correlationId } }, 400);
  }

  try {
    const offer = await c.env.DB.prepare(`SELECT * FROM offers WHERE id = ? LIMIT 1`).bind(id).first<any>();
    if (!offer) {
      return c.json({ error: { code: "not_found", message: "Offer not found", correlationId } }, 404);
    }

    const nextVersion = (offer.current_payout_version || 1) + 1;
    const now = new Date().toISOString();

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO offer_payout_rules (
          id, offer_id, version, affiliate_payout_minor, network_fee_minor,
          advertiser_cost_minor, event_name, reason_for_change, effective_from, created_at
        ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(), id, nextVersion, payoutMinor, payoutMinor,
        body.eventName || "conversion", body.reason || "Administrative rate update", now, now
      ),
      c.env.DB.prepare(
        `UPDATE offers SET current_payout_version = ?, updated_at = ? WHERE id = ?`
      ).bind(nextVersion, now, id),
    ]);

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "offer.payout_version_created",
      resourceType: "offer",
      resourceId: id,
      after: { version: nextVersion, payoutMinor },
      reason: body.reason || "Immutable payout version created",
      correlationId,
    });

    return c.json({ data: { id, version: nextVersion, payoutMinor }, correlationId }, 201);
  } catch (err) {
    return c.json({ error: { code: "version_failed", message: "Failed to create payout version", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 5: CATEGORIES & POLICY CONTROL (CRUD, Hierarchy, Risk)
// ===========================================================================

adminRoutes.get("/categories", async (c) => {
  const correlationId = c.get("correlationId");
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT c.*, p.name AS parent_name,
              COUNT(DISTINCT off.id) AS offer_count
       FROM offer_categories c
       LEFT JOIN offer_categories p ON p.id = c.parent_id
       LEFT JOIN offers off ON off.category_id = c.id
       GROUP BY c.id
       ORDER BY c.sort_order ASC, c.name ASC`
    ).all();

    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    return c.json({ data: [], correlationId });
  }
});

adminRoutes.post("/categories", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const body = await c.req.json().catch(() => ({}));

  if (!body.name) {
    return c.json({ error: { code: "validation_error", message: "Category name required", correlationId } }, 400);
  }

  const slug = (body.slug || body.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")).replace(/^-|-$/g, "");
  const id = "cat_" + slug.replace(/-/g, "_");
  const risk = body.riskClassification || "standard";
  const sortOrder = Number(body.sortOrder || 50);
  const parentId = body.parentId || null;
  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      `INSERT INTO offer_categories (
        id, slug, name, description, parent_id, sort_order, is_active, risk_classification, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).bind(id, slug, body.name, body.description || null, parentId, sortOrder, risk, now, now).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "category.created",
      resourceType: "offer_category",
      resourceId: id,
      after: { name: body.name, slug, riskClassification: risk },
      correlationId,
    });

    return c.json({ data: { id, slug, name: body.name }, correlationId }, 201);
  } catch (err) {
    return c.json({ error: { code: "create_failed", message: err instanceof Error ? err.message : "Failed to create category", correlationId } }, 500);
  }
});

adminRoutes.patch("/categories/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  try {
    const existing = await c.env.DB.prepare(`SELECT * FROM offer_categories WHERE id = ? LIMIT 1`).bind(id).first<any>();
    if (!existing) {
      return c.json({ error: { code: "not_found", message: "Category not found", correlationId } }, 404);
    }

    const name = body.name || existing.name;
    const desc = body.description !== undefined ? body.description : existing.description;
    const risk = body.riskClassification || existing.risk_classification;
    const sortOrder = body.sortOrder !== undefined ? Number(body.sortOrder) : existing.sort_order;
    const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `UPDATE offer_categories
       SET name = ?, description = ?, risk_classification = ?, sort_order = ?, is_active = ?, updated_at = ?
       WHERE id = ?`
    ).bind(name, desc, risk, sortOrder, isActive, now, id).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "category.updated",
      resourceType: "offer_category",
      resourceId: id,
      before: { name: existing.name, isActive: existing.is_active },
      after: { name, isActive },
      correlationId,
    });

    return c.json({ data: { id, name, isActive }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "update_failed", message: "Failed to update category", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 8: FINANCE & PAYOUT OPERATIONS (Safe Ledger Integrity, Approval)
// ===========================================================================

adminRoutes.get("/payouts", async (c) => {
  const correlationId = c.get("correlationId");
  const status = (c.req.query("status") || "ALL").toUpperCase();

  try {
    let query = `
      SELECT p.*, o.name AS organization_name, o.type AS organization_type,
             u.email AS requester_email, u.display_name AS requester_name
      FROM payout_requests p
      LEFT JOIN organizations o ON o.id = p.organization_id
      LEFT JOIN users u ON u.id = p.requested_by_user_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status !== "ALL") {
      query += ` AND p.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY p.requested_at DESC LIMIT 100`;

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    return c.json({ data: [], correlationId });
  }
});

adminRoutes.post("/payouts/:id/decide", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const decision = (body.decision || "").toUpperCase(); // 'PROCESSING' | 'PAID' | 'REJECTED'
  if (!decision || !["PROCESSING", "PAID", "REJECTED"].includes(decision)) {
    return c.json({ error: { code: "validation_error", message: "decision must be PROCESSING, PAID, or REJECTED", correlationId } }, 400);
  }

  const txRef = body.transactionReference || null;
  const reason = body.reason || "Administrative finance decision";
  const now = new Date().toISOString();

  try {
    const existing = await c.env.DB.prepare(`SELECT * FROM payout_requests WHERE id = ? LIMIT 1`).bind(id).first<any>();
    if (!existing) {
      return c.json({ error: { code: "not_found", message: "Payout request not found", correlationId } }, 404);
    }

    let statusCol = "PENDING";
    if (decision === "PROCESSING") statusCol = "PROCESSING";
    else if (decision === "PAID") statusCol = "PAID";
    else if (decision === "REJECTED") statusCol = "REJECTED";

    await c.env.DB.prepare(
      `UPDATE payout_requests
       SET status = ?, processed_at = ?, decision_notes = COALESCE(?, decision_notes)
       WHERE id = ?`
    ).bind(statusCol, now, reason, id).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: `payout.${decision.toLowerCase()}`,
      resourceType: "payout_request",
      resourceId: id,
      before: { status: existing.status },
      after: { status: statusCol, transactionReference: txRef, reason },
      reason,
      correlationId,
    });

    return c.json({ data: { id, status: statusCol, decidedAt: now }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "decision_failed", message: "Failed to update payout", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 9: TRACKING & POSTBACK DIAGNOSTICS
// ===========================================================================

adminRoutes.get("/tracking/diagnostics", async (c) => {
  const correlationId = c.get("correlationId");

  try {
    const [clicks24h, convs24h, recentClicks, postbacksStatus] = await Promise.all([
      c.env.DB.prepare(`SELECT COUNT(*) AS total FROM clicks WHERE created_at > datetime('now', '-24 hours')`).first<{ total: number }>(),
      c.env.DB.prepare(`SELECT COUNT(*) AS total FROM conversions WHERE created_at > datetime('now', '-24 hours')`).first<{ total: number }>(),
      c.env.DB.prepare(
        `SELECT c.id, c.code, c.ip_hash, c.user_agent, c.sub1, c.created_at, off.name AS offer_name
         FROM clicks c
         LEFT JOIN offers off ON off.id = c.offer_id
         ORDER BY c.created_at DESC
         LIMIT 10`
      ).all(),
      c.env.DB.prepare(
        `SELECT lifecycle_status, COUNT(*) AS count
         FROM conversions
         GROUP BY lifecycle_status`
      ).all(),
    ]);

    return c.json({
      data: {
        clicks24h: clicks24h?.total ?? 0,
        conversions24h: convs24h?.total ?? 0,
        recentClicks: recentClicks.results ?? [],
        conversionLifecycleBreakdown: postbacksStatus.results ?? [],
        checkedAt: new Date().toISOString(),
      },
      correlationId,
    });
  } catch (err) {
    return c.json({ data: { clicks24h: 0, conversions24h: 0, recentClicks: [] }, correlationId });
  }
});

// ===========================================================================
// MODULE 10: LANDING PAGE CMS CONTROL (Draft, Publish, Revisions)
// ===========================================================================

adminRoutes.get("/cms/landing", async (c) => {
  const correlationId = c.get("correlationId");
  try {
    const [published, draft, revisions] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM cms_landing_content WHERE id = 'current_published' LIMIT 1`).first<any>(),
      c.env.DB.prepare(`SELECT * FROM cms_landing_content WHERE id = 'current_draft' LIMIT 1`).first<any>(),
      c.env.DB.prepare(`SELECT * FROM cms_page_revisions WHERE page_key = 'landing' ORDER BY revision_num DESC LIMIT 10`).all(),
    ]);

    return c.json({
      data: {
        published: published ? { ...JSON.parse(published.content_json), version: published.version_number, publishedAt: published.published_at } : null,
        draft: draft ? { ...JSON.parse(draft.content_json), updatedAt: draft.updated_at } : null,
        revisions: revisions.results ?? [],
      },
      correlationId,
    });
  } catch (err) {
    return c.json({ error: { code: "cms_query_failed", message: "Failed to load CMS content", correlationId } }, 500);
  }
});

adminRoutes.post("/cms/landing/draft", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const body = await c.req.json().catch(() => ({}));
  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      `INSERT INTO cms_landing_content (id, version_number, status, content_json, published_by, change_summary, updated_at, created_at)
       VALUES ('current_draft', 1, 'draft', ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         content_json = excluded.content_json,
         published_by = excluded.published_by,
         change_summary = excluded.change_summary,
         updated_at = excluded.updated_at`
    ).bind(
      JSON.stringify(body),
      adminUser.id,
      body.changeSummary || "Draft autosave",
      now,
      now
    ).run();

    return c.json({ data: { ok: true, savedAt: now }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "draft_save_failed", message: "Failed to save draft", correlationId } }, 500);
  }
});

adminRoutes.post("/cms/landing/publish", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const body = await c.req.json().catch(() => ({}));
  const now = new Date().toISOString();

  try {
    const currentPub = await c.env.DB.prepare(`SELECT version_number FROM cms_landing_content WHERE id = 'current_published' LIMIT 1`).first<{ version_number: number }>();
    const nextVer = (currentPub?.version_number || 0) + 1;
    const contentJson = JSON.stringify(body.content || body);

    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO cms_landing_content (id, version_number, status, content_json, published_by, change_summary, published_at, updated_at, created_at)
         VALUES ('current_published', ?, 'published', ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           version_number = excluded.version_number,
           content_json = excluded.content_json,
           published_by = excluded.published_by,
           change_summary = excluded.change_summary,
           published_at = excluded.published_at,
           updated_at = excluded.updated_at`
      ).bind(
        nextVer, contentJson, adminUser.id, body.changeSummary || `Published version ${nextVer}`, now, now, now
      ),
      c.env.DB.prepare(
        `INSERT INTO cms_page_revisions (id, page_key, revision_num, content_json, published_by, change_summary, created_at)
         VALUES (?, 'landing', ?, ?, ?, ?, ?)`
      ).bind(
        crypto.randomUUID(), nextVer, contentJson, adminUser.id, body.changeSummary || `Version ${nextVer}`, now
      ),
    ]);

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "cms.landing_published",
      resourceType: "cms_page",
      resourceId: "landing",
      after: { version: nextVer, changeSummary: body.changeSummary },
      correlationId,
    });

    return c.json({ data: { ok: true, version: nextVer, publishedAt: now }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "publish_failed", message: "Failed to publish landing content", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 11: ANNOUNCEMENT BAR (Full Control)
// ===========================================================================

adminRoutes.get("/announcements", async (c) => {
  const correlationId = c.get("correlationId");
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT a.*, u.email AS creator_email
       FROM system_announcements a
       LEFT JOIN users u ON u.id = a.created_by
       ORDER BY a.created_at DESC`
    ).all();

    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    return c.json({ data: [], correlationId });
  }
});

adminRoutes.post("/announcements", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const body = await c.req.json().catch(() => ({}));

  if (!body.message) {
    return c.json({ error: { code: "validation_error", message: "Announcement message required", correlationId } }, 400);
  }

  const id = "ann_" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const now = new Date().toISOString();
  const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : 1;

  try {
    // If activating, deactivate others if requested
    if (isActive) {
      await c.env.DB.prepare(`UPDATE system_announcements SET is_active = 0 WHERE is_active = 1`).run();
    }

    await c.env.DB.prepare(
      `INSERT INTO system_announcements (
        id, title, message, link_url, link_label, style, target_audience, is_active, start_at, end_at, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id,
      body.title || "Network Announcement",
      body.message,
      body.linkUrl || null,
      body.linkLabel || null,
      body.style || "info",
      body.targetAudience || "all",
      isActive,
      body.startAt || null,
      body.endAt || null,
      adminUser.id,
      now,
      now
    ).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "announcement.created",
      resourceType: "system_announcement",
      resourceId: id,
      after: { title: body.title, message: body.message, isActive },
      correlationId,
    });

    return c.json({ data: { id, isActive }, correlationId }, 201);
  } catch (err) {
    return c.json({ error: { code: "create_failed", message: "Failed to create announcement", correlationId } }, 500);
  }
});

adminRoutes.patch("/announcements/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  try {
    const existing = await c.env.DB.prepare(`SELECT * FROM system_announcements WHERE id = ? LIMIT 1`).bind(id).first<any>();
    if (!existing) {
      return c.json({ error: { code: "not_found", message: "Announcement not found", correlationId } }, 404);
    }

    const isActive = body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active;
    const now = new Date().toISOString();

    if (isActive && !existing.is_active) {
      await c.env.DB.prepare(`UPDATE system_announcements SET is_active = 0 WHERE is_active = 1`).run();
    }

    await c.env.DB.prepare(
      `UPDATE system_announcements
       SET title = COALESCE(?, title),
           message = COALESCE(?, message),
           link_url = COALESCE(?, link_url),
           link_label = COALESCE(?, link_label),
           style = COALESCE(?, style),
           target_audience = COALESCE(?, target_audience),
           is_active = ?,
           updated_at = ?
       WHERE id = ?`
    ).bind(
      body.title || null,
      body.message || null,
      body.linkUrl || null,
      body.linkLabel || null,
      body.style || null,
      body.targetAudience || null,
      isActive,
      now,
      id
    ).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "announcement.updated",
      resourceType: "system_announcement",
      resourceId: id,
      after: { isActive, message: body.message },
      correlationId,
    });

    return c.json({ data: { id, isActive }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "update_failed", message: "Failed to update announcement", correlationId } }, 500);
  }
});

adminRoutes.delete("/announcements/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const id = c.req.param("id");

  try {
    await c.env.DB.prepare(`DELETE FROM system_announcements WHERE id = ?`).bind(id).run();
    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "announcement.deleted",
      resourceType: "system_announcement",
      resourceId: id,
      correlationId,
    });
    return c.json({ data: { ok: true, id }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "delete_failed", message: "Failed to delete announcement", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 12: MAINTENANCE MODE (Full Control)
// ===========================================================================

adminRoutes.get("/maintenance", async (c) => {
  const correlationId = c.get("correlationId");
  try {
    const row = await c.env.DB.prepare(`SELECT * FROM maintenance_config WHERE id = 'singleton' LIMIT 1`).first<any>();
    return c.json({ data: row || null, correlationId });
  } catch (err) {
    return c.json({ data: null, correlationId });
  }
});

adminRoutes.post("/maintenance", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const body = await c.req.json().catch(() => ({}));
  const isEnabled = body.isEnabled ? 1 : 0;
  const headline = body.headline || "Scheduled System Maintenance";
  const message = body.message || "TrafficVaultHub is performing scheduled network synchronization.";
  const estimatedDuration = body.estimatedDuration || "30 minutes";
  const allowAdminBypass = body.allowAdminBypass !== undefined ? (body.allowAdminBypass ? 1 : 0) : 1;
  const allowedIps = body.allowedIps || "";
  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      `INSERT INTO maintenance_config (id, is_enabled, headline, message, estimated_duration, allow_admin_bypass, allowed_ips, enabled_by, updated_at)
       VALUES ('singleton', ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         is_enabled = excluded.is_enabled,
         headline = excluded.headline,
         message = excluded.message,
         estimated_duration = excluded.estimated_duration,
         allow_admin_bypass = excluded.allow_admin_bypass,
         allowed_ips = excluded.allowed_ips,
         enabled_by = excluded.enabled_by,
         updated_at = excluded.updated_at`
    ).bind(
      isEnabled, headline, message, estimatedDuration, allowAdminBypass, allowedIps, adminUser.id, now
    ).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: isEnabled ? "maintenance.enabled" : "maintenance.disabled",
      resourceType: "maintenance_config",
      resourceId: "singleton",
      after: { isEnabled, headline, allowAdminBypass },
      reason: body.reason || `Maintenance mode ${isEnabled ? "activated" : "deactivated"}`,
      correlationId,
    });

    return c.json({ data: { isEnabled: Boolean(isEnabled), headline, updatedAt: now }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "maintenance_update_failed", message: "Failed to update maintenance settings", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 14: PLATFORM SETTINGS
// ===========================================================================

adminRoutes.get("/settings", async (c) => {
  const correlationId = c.get("correlationId");
  try {
    const { results } = await c.env.DB.prepare(`SELECT * FROM platform_settings ORDER BY category, key`).all();
    const settingsMap: Record<string, any> = {};
    for (const r of results ?? []) {
      try {
        settingsMap[r.key] = JSON.parse(r.value_json);
      } catch {
        settingsMap[r.key] = r.value_json;
      }
    }
    return c.json({ data: settingsMap, raw: results ?? [], correlationId });
  } catch (err) {
    return c.json({ data: {}, correlationId });
  }
});

adminRoutes.post("/settings", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const body = await c.req.json().catch(() => ({}));
  const now = new Date().toISOString();

  try {
    const updates = Object.entries(body);
    for (const [key, val] of updates) {
      const valJson = typeof val === "string" ? val : JSON.stringify(val);
      await c.env.DB.prepare(
        `INSERT INTO platform_settings (key, value_json, updated_by, updated_at)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET
           value_json = excluded.value_json,
           updated_by = excluded.updated_by,
           updated_at = excluded.updated_at`
      ).bind(key, valJson, adminUser.id, now).run();
    }

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "settings.updated",
      resourceType: "platform_settings",
      resourceId: "global",
      after: body,
      correlationId,
    });

    return c.json({ data: { ok: true, updatedKeys: Object.keys(body) }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "settings_save_failed", message: "Failed to save settings", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 15: AI-ASSISTED ADMIN TOOLS (Safe, Explanatory, Confirmation-gated)
// ===========================================================================

adminRoutes.post("/ai/analyze-risk", async (c) => {
  const correlationId = c.get("correlationId");
  const body = await c.req.json().catch(() => ({}));

  const applicant = body.applicant || {};
  const trafficDescription = applicant.trafficDescription || applicant.traffic_description || "";
  const trafficSources = applicant.trafficSources || applicant.traffic_sources || [];
  const experienceYears = applicant.experienceYears || applicant.years_experience || 0;
  const email = applicant.email || "";

  // 1. Try Gemini model if key is present
  if (c.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: c.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const prompt = `You are a Senior Risk Officer at a global CPA affiliate network. Analyze this partner onboarding application:
Email: ${email}
Years Experience: ${experienceYears}
Traffic Sources: ${JSON.stringify(trafficSources)}
Traffic Methodology Description: "${trafficDescription}"

Provide an executive risk briefing in JSON format with:
- executiveSummary: 2-3 sentences evaluating legitimacy and risk level.
- primaryRisks: array of specific operational or fraud concerns.
- suggestedInterviewQuestions: 3 targeted questions the admin should ask.
- recommendedAction: one of ["APPROVE", "PROBATIONARY_APPROVE", "REQUEST_DOCS", "SCHEDULE_CALL", "REJECT"].`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return c.json({ data: parsed, correlationId });
      }
    } catch (aiErr) {
      console.warn(`[${correlationId}] Gemini API call fallback:`, aiErr);
    }
  }

  // 2. Structured domain heuristic fallback
  const isVague = trafficDescription.length < 60;
  const hasIncentivized = trafficDescription.toLowerCase().includes("incent") || trafficDescription.toLowerCase().includes("bot");
  const isFreeMail = email.includes("@gmail.com") || email.includes("@yahoo.com") || email.includes("@outlook.com");

  return c.json({
    data: {
      executiveSummary: `Applicant reports ${experienceYears} years experience utilizing ${trafficSources.join(", ") || "unspecified channels"}. ${isVague ? "Methodology explanation is brief and warrants verification." : "Methodology documentation appears structured."} ${isFreeMail ? "Uses generic email provider." : "Uses business domain email."}`,
      primaryRisks: [
        ...(isVague ? ["Vague traffic acquisition methodology"] : []),
        ...(hasIncentivized ? ["Mention of incentivized or automated traffic patterns"] : []),
        ...(isFreeMail ? ["Personal webmail domain rather than registered agency entity"] : []),
      ],
      suggestedInterviewQuestions: [
        "Can you share live campaign dashboard screenshots demonstrating clean traffic quality from your primary sources?",
        "What specific tracking software and sub-id parameter structures do you deploy?",
        "What is your typical conversion rate and refund/chargeback threshold on similar CPA offers?",
      ],
      recommendedAction: isVague ? "REQUEST_DOCS" : "PROBATIONARY_APPROVE",
    },
    correlationId,
  });
});

adminRoutes.post("/ai/draft-message", async (c) => {
  const correlationId = c.get("correlationId");
  const body = await c.req.json().catch(() => ({}));
  const intent = body.intent || "REQUEST_DOCS"; // 'REQUEST_DOCS' | 'REJECT' | 'PROBATION_TERMS'
  const applicantName = body.applicantName || "Partner";
  const notes = body.notes || "";

  if (c.env.GEMINI_API_KEY) {
    try {
      const ai = new GoogleGenAI({
        apiKey: c.env.GEMINI_API_KEY,
        httpOptions: { headers: { "User-Agent": "aistudio-build" } },
      });

      const prompt = `Write a professional, concise, respectful email from the TrafficVaultHub Operations Desk to ${applicantName}.
Intent: ${intent}
Context / Specific Reasons: ${notes}
Sign-off: Operations Review Desk, TrafficVaultHub
Return JSON with subject and body.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return c.json({ data: parsed, correlationId });
      }
    } catch {
      /* fallback */
    }
  }

  // Fallback template
  if (intent === "REQUEST_DOCS") {
    return c.json({
      data: {
        subject: "TrafficVaultHub — Verification Documents Required for Your Application",
        body: `Dear ${applicantName},\n\nThank you for applying to TrafficVaultHub. Before we can activate your publisher portal, our compliance team requires additional verification documentation:\n\n1. Government-issued photo identification or corporate registration certificate\n2. Proof of traffic source (recent billing statement or active ad manager screenshot)\n\n${notes ? `Additional notes: ${notes}\n\n` : ""}Please upload these documents directly via your verification portal at https://trafficvaulthub.pages.dev/verification.\n\nBest regards,\nOperations Desk\nTrafficVaultHub`,
      },
      correlationId,
    });
  }

  return c.json({
    data: {
      subject: "Update Regarding Your TrafficVaultHub Partner Application",
      body: `Dear ${applicantName},\n\nThank you for your interest in joining the TrafficVaultHub network. After careful review of your application, we are unable to approve access at this time.\n\n${notes ? `Reason: ${notes}\n\n` : ""}You may re-apply after 60 days with updated traffic documentation.\n\nSincerely,\nOperations Review Desk\nTrafficVaultHub`,
    },
    correlationId,
  });
});

// ===========================================================================
// MODULE 13: USERS & RBAC ACCESS
// ===========================================================================

adminRoutes.get("/users", async (c) => {
  const correlationId = c.get("correlationId");
  const limit = Math.min(100, Math.max(1, Number(c.req.query("limit") || 50)));

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT u.id, u.email, u.display_name, u.status, u.email_verified, u.created_at, u.last_login_at,
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
    return c.json({ data: [], correlationId });
  }
});

adminRoutes.patch("/users/:id/status", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const targetUserId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const newStatus = (body.status || "").toUpperCase();
  if (newStatus !== "ACTIVE" && newStatus !== "SUSPENDED") {
    return c.json({ error: { code: "validation_error", message: "status must be ACTIVE or SUSPENDED", correlationId } }, 400);
  }

  if (targetUserId === adminUser.id) {
    return c.json({ error: { code: "forbidden", message: "You cannot change your own administrative account status", correlationId } }, 403);
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(`UPDATE users SET status = ?, updated_at = ? WHERE id = ?`).bind(newStatus, now, targetUserId).run();

  await writeAuditEvent(c.env.DB, {
    actorId: adminUser.id,
    action: "user.status_updated",
    resourceType: "user",
    resourceId: targetUserId,
    after: { status: newStatus },
    reason: body.reason || `Status updated to ${newStatus}`,
    correlationId,
  });

  return c.json({ data: { userId: targetUserId, status: newStatus }, correlationId });
});

adminRoutes.patch("/users/:id/role", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const targetUserId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const newRole = body.role; // 'admin' | 'support' | 'compliance' | 'finance' | 'publisher' | 'advertiser'

  if (!newRole) {
    return c.json({ error: { code: "validation_error", message: "role required", correlationId } }, 400);
  }

  if (targetUserId === adminUser.id && newRole !== "super_admin" && newRole !== "admin") {
    return c.json({ error: { code: "forbidden", message: "Cannot demote your own admin account", correlationId } }, 403);
  }

  try {
    const roleRow = await c.env.DB.prepare(`SELECT id FROM roles WHERE id = ? OR name = ? LIMIT 1`).bind(newRole, newRole).first<{ id: string }>();
    if (!roleRow) {
      return c.json({ error: { code: "role_not_found", message: "Role does not exist", correlationId } }, 404);
    }

    await c.env.DB.prepare(
      `UPDATE organization_members SET role_id = ?, updated_at = ? WHERE user_id = ?`
    ).bind(roleRow.id, new Date().toISOString(), targetUserId).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "user.role_updated",
      resourceType: "user",
      resourceId: targetUserId,
      after: { role: newRole },
      correlationId,
    });

    return c.json({ data: { userId: targetUserId, role: newRole }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "role_update_failed", message: "Failed to update role", correlationId } }, 500);
  }
});

adminRoutes.post("/users/:id/force-reverify", async (c) => {
  const correlationId = c.get("correlationId");
  const adminUser = c.get("user")!;
  const targetUserId = c.req.param("id");
  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(`UPDATE users SET email_verified = 0, updated_at = ? WHERE id = ?`).bind(now, targetUserId).run();

    await writeAuditEvent(c.env.DB, {
      actorId: adminUser.id,
      action: "user.force_reverification",
      resourceType: "user",
      resourceId: targetUserId,
      reason: "Administrative force re-verification",
      correlationId,
    });

    return c.json({ data: { ok: true, userId: targetUserId, emailVerified: false }, correlationId });
  } catch (err) {
    return c.json({ error: { code: "reverify_failed", message: "Failed to reset verification", correlationId } }, 500);
  }
});

// ===========================================================================
// MODULE 16: GLOBAL AUDIT LOG
// ===========================================================================

adminRoutes.get("/audit-logs", async (c) => {
  const correlationId = c.get("correlationId");
  const limit = Math.min(200, Math.max(1, Number(c.req.query("limit") || 50)));
  const actionFilter = c.req.query("action")?.trim();
  const resourceFilter = c.req.query("resourceType")?.trim();

  try {
    let query = `
      SELECT ae.id, ae.actor_id, ae.action, ae.resource_type, ae.resource_id,
             ae.before_json, ae.after_json, ae.reason, ae.correlation_id, ae.created_at,
             u.email AS actor_email, u.display_name AS actor_name
      FROM audit_events ae
      LEFT JOIN users u ON u.id = ae.actor_id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (actionFilter) {
      query += ` AND ae.action LIKE ?`;
      params.push(`%${actionFilter}%`);
    }

    if (resourceFilter) {
      query += ` AND ae.resource_type = ?`;
      params.push(resourceFilter);
    }

    query += ` ORDER BY ae.created_at DESC LIMIT ?`;
    params.push(limit);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    return c.json({ data: [], correlationId });
  }
});
