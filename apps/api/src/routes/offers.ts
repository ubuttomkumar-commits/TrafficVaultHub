/**
 * Offer read APIs against existing `offers` + `offer_versions` tables.
 * Public callers only see LIVE + PUBLIC access offers.
 * Does not invent performance metrics.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator } from "../lib/rbac";

type OfferListRow = {
  id: string;
  name: string;
  description: string | null;
  vertical: string | null;
  status: string;
  access_mode: string;
  payout_type: string | null;
  currency: string | null;
  affiliate_commission_minor: number | null;
  conversion_event: string | null;
  attribution_window_seconds: number | null;
  version_number: number | null;
};

export const offerRoutes = new Hono<{ Bindings: Env }>();

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 20;

offerRoutes.get("/", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user");

  const page = Math.max(1, Number(c.req.query("page") || 1) || 1);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(c.req.query("limit") || DEFAULT_LIMIT) || DEFAULT_LIMIT)
  );
  const offset = (page - 1) * limit;
  const vertical = c.req.query("vertical")?.trim() || null;
  const payoutType = c.req.query("payoutType")?.trim()?.toUpperCase() || null;
  const q = c.req.query("q")?.trim() || null;

  // Unauthenticated: only LIVE + PUBLIC
  // Authenticated (any role): LIVE offers still limited to PUBLIC / APPLICATION_REQUIRED
  // Private inventory requires affiliate_offer_access (not implemented in this unit)
  const statusFilter = "LIVE";
  const accessClause = user
    ? `o.access_mode IN ('PUBLIC', 'APPLICATION_REQUIRED')`
    : `o.access_mode = 'PUBLIC'`;

  const conditions = [`o.status = ?`, accessClause];
  const binds: (string | number)[] = [statusFilter];

  if (vertical) {
    conditions.push(`o.vertical = ?`);
    binds.push(vertical);
  }
  if (payoutType) {
    conditions.push(`ov.payout_type = ?`);
    binds.push(payoutType);
  }
  if (q) {
    conditions.push(`(o.name LIKE ? OR IFNULL(o.description, '') LIKE ?)`);
    const like = `%${q.replace(/[%_]/g, "")}%`;
    binds.push(like, like);
  }

  const where = conditions.join(" AND ");

  try {
    const countRow = await c.env.DB.prepare(
      `SELECT COUNT(*) AS total
       FROM offers o
       LEFT JOIN offer_versions ov ON ov.id = o.current_version_id
       WHERE ${where}`
    )
      .bind(...binds)
      .first<{ total: number }>();

    const total = countRow?.total ?? 0;

    const { results } = await c.env.DB.prepare(
      `SELECT o.id, o.name, o.description, o.vertical, o.status, o.access_mode,
              ov.payout_type, ov.currency, ov.affiliate_commission_minor,
              ov.conversion_event, ov.attribution_window_seconds, ov.version_number
       FROM offers o
       LEFT JOIN offer_versions ov ON ov.id = o.current_version_id
       WHERE ${where}
       ORDER BY o.updated_at DESC
       LIMIT ? OFFSET ?`
    )
      .bind(...binds, limit, offset)
      .all<OfferListRow>();

    const data = (results ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      vertical: r.vertical,
      status: r.status,
      accessMode: r.access_mode,
      payoutType: r.payout_type,
      currency: r.currency,
      affiliateCommissionMinor: r.affiliate_commission_minor,
      conversionEvent: r.conversion_event,
      attributionWindowSeconds: r.attribution_window_seconds,
      versionNumber: r.version_number,
    }));

    return c.json({
      data,
      pagination: {
        page,
        limit,
        total,
        hasMore: offset + data.length < total,
      },
      correlationId,
    });
  } catch (err) {
    console.error(`[${correlationId}] offers list failed`, err);
    return c.json(
      {
        error: {
          code: "offers_query_failed",
          message: "Unable to load offers",
          correlationId,
        },
      },
      503
    );
  }
});

offerRoutes.get("/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user");
  const id = c.req.param("id");

  try {
    const row = await c.env.DB.prepare(
      `SELECT o.id, o.name, o.description, o.vertical, o.status, o.access_mode,
              o.created_at, o.updated_at, o.activated_at,
              ov.payout_type, ov.currency, ov.affiliate_commission_minor,
              ov.advertiser_payout_minor, ov.network_margin_minor,
              ov.conversion_event, ov.attribution_window_seconds, ov.version_number,
              ov.daily_conversion_cap, ov.total_conversion_cap, ov.budget_minor
       FROM offers o
       LEFT JOIN offer_versions ov ON ov.id = o.current_version_id
       WHERE o.id = ?
       LIMIT 1`
    )
      .bind(id)
      .first<
        OfferListRow & {
          created_at: string;
          updated_at: string;
          activated_at: string | null;
          advertiser_payout_minor: number | null;
          network_margin_minor: number | null;
          daily_conversion_cap: number | null;
          total_conversion_cap: number | null;
          budget_minor: number | null;
        }
      >();

    if (!row) {
      return c.json(
        {
          error: {
            code: "not_found",
            message: "Offer not found",
            correlationId,
          },
        },
        404
      );
    }

    const publicOk =
      row.status === "LIVE" &&
      (row.access_mode === "PUBLIC" ||
        (user && row.access_mode === "APPLICATION_REQUIRED"));

    if (!publicOk) {
      // Do not leak private offer existence details beyond 404 for anonymous
      return c.json(
        {
          error: {
            code: "not_found",
            message: "Offer not found",
            correlationId,
          },
        },
        404
      );
    }

    return c.json({
      data: {
        id: row.id,
        name: row.name,
        description: row.description,
        vertical: row.vertical,
        status: row.status,
        accessMode: row.access_mode,
        payoutType: row.payout_type,
        currency: row.currency,
        affiliateCommissionMinor: row.affiliate_commission_minor,
        conversionEvent: row.conversion_event,
        attributionWindowSeconds: row.attribution_window_seconds,
        versionNumber: row.version_number,
        dailyConversionCap: row.daily_conversion_cap,
        totalConversionCap: row.total_conversion_cap,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        activatedAt: row.activated_at,
      },
      correlationId,
    });
  } catch (err) {
    console.error(`[${correlationId}] offer detail failed`, err);
    return c.json(
      {
        error: {
          code: "offers_query_failed",
          message: "Unable to load offer",
          correlationId,
        },
      },
      503
    );
  }
});

let tablesInitialized = false;
async function ensureTables(db: D1Database) {
  if (tablesInitialized) return;
  try {
    await db.batch([
      db.prepare(`
        CREATE TABLE IF NOT EXISTS offer_applications (
          id                      TEXT PRIMARY KEY NOT NULL,
          offer_id                TEXT NOT NULL,
          publisher_org_id        TEXT NOT NULL,
          applicant_user_id       TEXT NOT NULL,
          status                  TEXT NOT NULL DEFAULT 'PENDING',
          traffic_sources         TEXT,
          message                 TEXT,
          decided_by_user_id      TEXT,
          decided_at              TEXT,
          decision_notes          TEXT,
          created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          UNIQUE (offer_id, publisher_org_id)
        )
      `),
      db.prepare(`
        CREATE TABLE IF NOT EXISTS affiliate_offer_access (
          id                      TEXT PRIMARY KEY NOT NULL,
          offer_id                TEXT NOT NULL,
          affiliate_organization_id TEXT NOT NULL,
          granted_by_user_id      TEXT,
          status                  TEXT NOT NULL DEFAULT 'APPROVED',
          created_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          updated_at              TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
          UNIQUE (offer_id, affiliate_organization_id)
        )
      `),
    ]);
    tablesInitialized = true;
  } catch (err) {
    console.warn("ensureTables initialized or failed:", err);
  }
}

async function getAffiliateOrg(db: D1Database, userId: string, preferredOrgId?: string) {
  const query = preferredOrgId
    ? `SELECT om.organization_id FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = ? AND om.organization_id = ? AND om.status = 'ACTIVE'
         AND o.type = 'AFFILIATE' AND o.deleted_at IS NULL LIMIT 1`
    : `SELECT om.organization_id FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = ? AND om.status = 'ACTIVE'
         AND o.type = 'AFFILIATE' AND o.deleted_at IS NULL LIMIT 1`;
  const binds = preferredOrgId ? [userId, preferredOrgId] : [userId];
  const row = await db.prepare(query).bind(...binds).first<{ organization_id: string }>();
  return row?.organization_id ?? null;
}

async function canManageOfferApplications(db: D1Database, userId: string, offerId: string) {
  const isPlatform = await isPlatformOperator(db, userId);
  if (isPlatform) return true;
  const row = await db.prepare(
    `SELECT 1 AS ok FROM offers o
     INNER JOIN organization_members om ON om.organization_id = o.organization_id
     WHERE o.id = ? AND om.user_id = ? AND om.status = 'ACTIVE' LIMIT 1`
  ).bind(offerId, userId).first();
  return Boolean(row);
}

/**
 * GET /api/v1/offers/applications/my
 * View current user's submitted access applications
 */
offerRoutes.get("/applications/my", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  await ensureTables(c.env.DB);

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT oa.id, oa.offer_id, oa.publisher_org_id, oa.status, oa.traffic_sources,
              oa.message, oa.decision_notes, oa.decided_at, oa.created_at, oa.updated_at,
              o.name AS offer_name, o.access_mode, o.status AS offer_status
       FROM offer_applications oa
       INNER JOIN offers o ON o.id = oa.offer_id
       INNER JOIN organization_members om ON om.organization_id = oa.publisher_org_id
       WHERE om.user_id = ? AND om.status = 'ACTIVE'
       ORDER BY oa.updated_at DESC`
    ).bind(user.id).all();

    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    console.error(`[${correlationId}] list my applications failed:`, err);
    return c.json({ data: [], message: "No applications found", correlationId });
  }
});

/**
 * POST /api/v1/offers/:id/apply
 * Apply for offer access
 */
offerRoutes.post("/:id/apply", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const offerId = c.req.param("id");
  await ensureTables(c.env.DB);

  let body: {
    organizationId?: string;
    trafficSources?: string;
    message?: string;
  } = {};
  try {
    body = await c.req.json();
  } catch {
    // optional body
  }

  const orgId = await getAffiliateOrg(c.env.DB, user.id, body.organizationId?.trim());
  if (!orgId) {
    return c.json(
      {
        error: {
          code: "affiliate_membership_required",
          message: "You must be an active member of an affiliate organization to apply",
          correlationId,
        },
      },
      403
    );
  }

  const offer = await c.env.DB.prepare(
    `SELECT id, name, status, access_mode FROM offers WHERE id = ? LIMIT 1`
  ).bind(offerId).first<{ id: string; name: string; status: string; access_mode: string }>();

  if (!offer || offer.status !== "LIVE") {
    return c.json(
      {
        error: {
          code: "offer_not_available",
          message: "Offer is not available for applications",
          correlationId,
        },
      },
      404
    );
  }

  // If already PUBLIC, automatically grant access
  if (offer.access_mode === "PUBLIC") {
    const accessId = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO affiliate_offer_access (id, offer_id, affiliate_organization_id, granted_by_user_id, status)
       VALUES (?, ?, ?, ?, 'APPROVED')
       ON CONFLICT(offer_id, affiliate_organization_id) DO UPDATE SET status = 'APPROVED'`
    ).bind(accessId, offerId, orgId, user.id).run();

    return c.json({
      data: {
        offerId,
        status: "APPROVED",
        accessMode: "PUBLIC",
        message: "Offer is public and immediately accessible for tracking link generation",
      },
      correlationId,
    });
  }

  const appId = crypto.randomUUID();
  const trafficSources = body.trafficSources?.trim() || null;
  const message = body.message?.trim() || null;

  try {
    await c.env.DB.prepare(
      `INSERT INTO offer_applications (
         id, offer_id, publisher_org_id, applicant_user_id, status, traffic_sources, message, updated_at
       ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(offer_id, publisher_org_id) DO UPDATE SET
         status = 'PENDING',
         traffic_sources = excluded.traffic_sources,
         message = excluded.message,
         applicant_user_id = excluded.applicant_user_id,
         decision_notes = NULL,
         decided_at = NULL,
         decided_by_user_id = NULL,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
    ).bind(appId, offerId, orgId, user.id, trafficSources, message).run();

    return c.json(
      {
        data: {
          applicationId: appId,
          offerId,
          publisherOrgId: orgId,
          status: "PENDING",
          message: "Application submitted. The advertiser or network operator will review your traffic sources.",
        },
        correlationId,
      },
      201
    );
  } catch (err) {
    console.error(`[${correlationId}] submit application failed:`, err);
    return c.json(
      {
        error: {
          code: "application_failed",
          message: "Unable to submit application",
          correlationId,
        },
      },
      500
    );
  }
});

/**
 * GET /api/v1/offers/:id/applications
 * Advertiser/Operator view applications for an offer
 */
offerRoutes.get("/:id/applications", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const offerId = c.req.param("id");
  await ensureTables(c.env.DB);

  const canManage = await canManageOfferApplications(c.env.DB, user.id, offerId);
  if (!canManage) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Advertiser ownership or platform operator role required",
          correlationId,
        },
      },
      403
    );
  }

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT oa.id, oa.offer_id, oa.publisher_org_id, oa.status, oa.traffic_sources,
              oa.message, oa.decision_notes, oa.decided_at, oa.created_at, oa.updated_at,
              o.name AS publisher_org_name
       FROM offer_applications oa
       LEFT JOIN organizations o ON o.id = oa.publisher_org_id
       WHERE oa.offer_id = ?
       ORDER BY oa.created_at DESC`
    ).bind(offerId).all();

    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    console.error(`[${correlationId}] load applications failed:`, err);
    return c.json({ data: [], correlationId });
  }
});

/**
 * POST /api/v1/offers/:id/applications/:appId/approve
 */
offerRoutes.post("/:id/applications/:appId/approve", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const offerId = c.req.param("id");
  const appId = c.req.param("appId");
  await ensureTables(c.env.DB);

  const canManage = await canManageOfferApplications(c.env.DB, user.id, offerId);
  if (!canManage) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Advertiser ownership or platform operator role required",
          correlationId,
        },
      },
      403
    );
  }

  const app = await c.env.DB.prepare(
    `SELECT id, offer_id, publisher_org_id FROM offer_applications WHERE id = ? AND offer_id = ? LIMIT 1`
  ).bind(appId, offerId).first<{ id: string; offer_id: string; publisher_org_id: string }>();

  if (!app) {
    return c.json(
      {
        error: {
          code: "not_found",
          message: "Application not found",
          correlationId,
        },
      },
      404
    );
  }

  const accessId = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE offer_applications
       SET status = 'APPROVED', decided_by_user_id = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`
    ).bind(user.id, appId),
    c.env.DB.prepare(
      `INSERT INTO affiliate_offer_access (
         id, offer_id, affiliate_organization_id, granted_by_user_id, status, updated_at
       ) VALUES (?, ?, ?, ?, 'APPROVED', strftime('%Y-%m-%dT%H:%M:%fZ','now'))
       ON CONFLICT(offer_id, affiliate_organization_id) DO UPDATE SET
         status = 'APPROVED',
         granted_by_user_id = excluded.granted_by_user_id,
         updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
    ).bind(accessId, offerId, app.publisher_org_id, user.id),
  ]);

  return c.json({
    data: {
      applicationId: appId,
      offerId,
      publisherOrgId: app.publisher_org_id,
      status: "APPROVED",
    },
    correlationId,
  });
});

/**
 * POST /api/v1/offers/:id/applications/:appId/reject
 */
offerRoutes.post("/:id/applications/:appId/reject", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const offerId = c.req.param("id");
  const appId = c.req.param("appId");
  await ensureTables(c.env.DB);

  const canManage = await canManageOfferApplications(c.env.DB, user.id, offerId);
  if (!canManage) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Advertiser ownership or platform operator role required",
          correlationId,
        },
      },
      403
    );
  }

  let body: { notes?: string } = {};
  try {
    body = await c.req.json();
  } catch {
    // optional body
  }

  const app = await c.env.DB.prepare(
    `SELECT id, publisher_org_id FROM offer_applications WHERE id = ? AND offer_id = ? LIMIT 1`
  ).bind(appId, offerId).first<{ id: string; publisher_org_id: string }>();

  if (!app) {
    return c.json(
      {
        error: {
          code: "not_found",
          message: "Application not found",
          correlationId,
        },
      },
      404
    );
  }

  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE offer_applications
       SET status = 'REJECTED', decision_notes = ?, decided_by_user_id = ?, decided_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`
    ).bind(body.notes?.trim() ?? null, user.id, appId),
    c.env.DB.prepare(
      `UPDATE affiliate_offer_access
       SET status = 'REVOKED', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE offer_id = ? AND affiliate_organization_id = ?`
    ).bind(offerId, app.publisher_org_id),
  ]);

  return c.json({
    data: {
      applicationId: appId,
      offerId,
      status: "REJECTED",
    },
    correlationId,
  });
});

