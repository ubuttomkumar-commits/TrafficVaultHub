/**
 * Read/update offer click (and conversion) cap limits on offer_cap_counters.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";

export const offerCapRoutes = new Hono<{ Bindings: Env }>();

offerCapRoutes.use("*", requireAuth());

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

async function canManageOffer(
  db: D1Database,
  userId: string,
  offerOrgId: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS ok FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = ? AND om.status = 'ACTIVE'
         AND (
           (om.organization_id = ? AND o.type = 'ADVERTISER')
           OR (o.type = 'PLATFORM' AND om.role_id IN (
             '00000000-0000-4000-8000-000000000101',
             '00000000-0000-4000-8000-000000000102'
           ))
         )
       LIMIT 1`
    )
    .bind(userId, offerOrgId)
    .first();
  return Boolean(row);
}

/**
 * GET /api/v1/offers/:offerId/caps
 */
offerCapRoutes.get("/:offerId/caps", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const offerId = c.req.param("offerId");

  const offer = await c.env.DB.prepare(
    `SELECT id, organization_id, name, status FROM offers WHERE id = ? LIMIT 1`
  )
    .bind(offerId)
    .first<{ id: string; organization_id: string; name: string; status: string }>();

  if (!offer) {
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

  if (!(await canManageOffer(c.env.DB, user.id, offer.organization_id))) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Not allowed to view caps for this offer",
          correlationId,
        },
      },
      403
    );
  }

  const day = utcDayKey();
  const { results } = await c.env.DB.prepare(
    `SELECT cap_type, period_key, limit_value, current_value, exhausted_at, currency
     FROM offer_cap_counters
     WHERE offer_id = ?
     ORDER BY cap_type, period_key`
  )
    .bind(offerId)
    .all();

  const ver = await c.env.DB.prepare(
    `SELECT daily_conversion_cap, total_conversion_cap, budget_minor, currency
     FROM offer_versions WHERE id = (
       SELECT current_version_id FROM offers WHERE id = ?
     ) LIMIT 1`
  )
    .bind(offerId)
    .first();

  return c.json({
    data: {
      offer: {
        id: offer.id,
        name: offer.name,
        status: offer.status,
        organizationId: offer.organization_id,
      },
      versionCaps: ver,
      counters: results ?? [],
      today: day,
    },
    correlationId,
  });
});

/**
 * PUT /api/v1/offers/:offerId/caps
 * Body: { dailyClickLimit?: number | null, totalClickLimit?: number | null }
 * null clears the limit (unlimited).
 */
offerCapRoutes.put("/:offerId/caps", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const offerId = c.req.param("offerId");

  let body: {
    dailyClickLimit?: number | null;
    totalClickLimit?: number | null;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: {
          code: "invalid_json",
          message: "Invalid JSON",
          correlationId,
        },
      },
      400
    );
  }

  const offer = await c.env.DB.prepare(
    `SELECT id, organization_id FROM offers WHERE id = ? LIMIT 1`
  )
    .bind(offerId)
    .first<{ id: string; organization_id: string }>();

  if (!offer) {
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

  if (!(await canManageOffer(c.env.DB, user.id, offer.organization_id))) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Not allowed to update caps for this offer",
          correlationId,
        },
      },
      403
    );
  }

  const day = utcDayKey();
  const updates: { type: string; period: string; limit: number | null }[] = [];

  if ("dailyClickLimit" in body) {
    const v = body.dailyClickLimit;
    if (v != null && (!Number.isFinite(v) || v < 0)) {
      return c.json(
        {
          error: {
            code: "validation_error",
            message: "dailyClickLimit must be null or a non-negative integer",
            correlationId,
          },
        },
        400
      );
    }
    updates.push({
      type: "DAILY_CLICK",
      period: day,
      limit: v == null ? null : Math.floor(v),
    });
  }

  if ("totalClickLimit" in body) {
    const v = body.totalClickLimit;
    if (v != null && (!Number.isFinite(v) || v < 0)) {
      return c.json(
        {
          error: {
            code: "validation_error",
            message: "totalClickLimit must be null or a non-negative integer",
            correlationId,
          },
        },
        400
      );
    }
    updates.push({
      type: "TOTAL_CLICK",
      period: "lifetime",
      limit: v == null ? null : Math.floor(v),
    });
  }

  if (updates.length === 0) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Provide dailyClickLimit and/or totalClickLimit",
          correlationId,
        },
      },
      400
    );
  }

  for (const u of updates) {
    if (u.limit == null) {
      // Clear limit but keep counter history
      await c.env.DB.prepare(
        `UPDATE offer_cap_counters
         SET limit_value = NULL, exhausted_at = NULL,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE offer_id = ? AND cap_type = ? AND period_key = ?`
      )
        .bind(offerId, u.type, u.period)
        .run();
      // Ensure a row exists for DO hydration with null limit (optional)
      await c.env.DB.prepare(
        `INSERT INTO offer_cap_counters (
           id, offer_id, organization_id, cap_type, period_key,
           limit_value, current_value
         ) VALUES (?, ?, ?, ?, ?, NULL, 0)
         ON CONFLICT(offer_id, cap_type, period_key) DO UPDATE SET
           limit_value = NULL,
           exhausted_at = NULL,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
      )
        .bind(
          crypto.randomUUID(),
          offerId,
          offer.organization_id,
          u.type,
          u.period
        )
        .run();
    } else {
      await c.env.DB.prepare(
        `INSERT INTO offer_cap_counters (
           id, offer_id, organization_id, cap_type, period_key,
           limit_value, current_value
         ) VALUES (?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT(offer_id, cap_type, period_key) DO UPDATE SET
           limit_value = excluded.limit_value,
           exhausted_at = CASE
             WHEN offer_cap_counters.current_value >= excluded.limit_value
             THEN strftime('%Y-%m-%dT%H:%M:%fZ','now')
             ELSE NULL
           END,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
      )
        .bind(
          crypto.randomUUID(),
          offerId,
          offer.organization_id,
          u.type,
          u.period,
          u.limit
        )
        .run();
    }
  }

  // Best-effort: poke DO so next reserve reloads limits from D1
  try {
    if (c.env.CAPS) {
      const id = c.env.CAPS.idFromName(offerId);
      const stub = c.env.CAPS.get(id);
      // status read forces nothing; next reserve-click hydrates limits from D1
      await stub.fetch("https://cap/status");
    }
  } catch {
    /* non-fatal */
  }

  const { results } = await c.env.DB.prepare(
    `SELECT cap_type, period_key, limit_value, current_value, exhausted_at
     FROM offer_cap_counters
     WHERE offer_id = ? AND cap_type IN ('DAILY_CLICK','TOTAL_CLICK')`
  )
    .bind(offerId)
    .all();

  return c.json({
    data: {
      offerId,
      counters: results ?? [],
      updated: updates,
    },
    correlationId,
  });
});
