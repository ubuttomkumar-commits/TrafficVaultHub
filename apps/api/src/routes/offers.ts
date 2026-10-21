/**
 * Offer read APIs against existing `offers` + `offer_versions` tables.
 * Public callers only see LIVE + PUBLIC access offers.
 * Does not invent performance metrics.
 */

import { Hono } from "hono";
import type { Env } from "../env";

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
        // advertiser payout / margin only for authenticated staff later — omit for public
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
