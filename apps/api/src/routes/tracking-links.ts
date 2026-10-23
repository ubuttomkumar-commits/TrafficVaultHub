/**
 * Tracking link management — existing tracking_links table.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";

export const trackingLinkRoutes = new Hono<{ Bindings: Env }>();

trackingLinkRoutes.use("*", requireAuth());

function randomCode(len = 10): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

async function affiliateContext(db: D1Database, userId: string, orgId: string) {
  const member = await db
    .prepare(
      `SELECT 1 AS ok FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = ? AND om.organization_id = ? AND om.status = 'ACTIVE'
         AND o.type = 'AFFILIATE' AND o.deleted_at IS NULL LIMIT 1`
    )
    .bind(userId, orgId)
    .first();
  if (!member) return null;
  const profile = await db
    .prepare(
      `SELECT id FROM affiliate_profiles WHERE organization_id = ? LIMIT 1`
    )
    .bind(orgId)
    .first<{ id: string }>();
  return profile?.id ?? null;
}

/**
 * POST /api/v1/tracking-links
 * { organizationId, offerId, name?, code? }
 */
trackingLinkRoutes.post("/", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  let body: {
    organizationId?: string;
    offerId?: string;
    name?: string;
    code?: string;
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

  const orgId = body.organizationId?.trim();
  const offerId = body.offerId?.trim();
  if (!orgId || !offerId) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "organizationId and offerId required",
          correlationId,
        },
      },
      400
    );
  }

  const profileId = await affiliateContext(c.env.DB, user.id, orgId);
  if (!profileId) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Active affiliate membership and profile required",
          correlationId,
        },
      },
      403
    );
  }

  const offer = await c.env.DB.prepare(
    `SELECT id, organization_id AS offer_organization_id, status, access_mode
     FROM offers WHERE id = ? LIMIT 1`
  )
    .bind(offerId)
    .first<{
      id: string;
      offer_organization_id: string;
      status: string;
      access_mode: string;
    }>();

  if (!offer || offer.status !== "LIVE") {
    return c.json(
      {
        error: {
          code: "offer_unavailable",
          message: "Offer must be LIVE",
          correlationId,
        },
      },
      422
    );
  }

  if (offer.access_mode !== "PUBLIC") {
    try {
      const access = await c.env.DB.prepare(
        `SELECT 1 AS ok FROM affiliate_offer_access
         WHERE offer_id = ? AND affiliate_organization_id = ? AND status = 'APPROVED'
         LIMIT 1`
      )
        .bind(offerId, orgId)
        .first();
      if (!access) {
        return c.json(
          {
            error: {
              code: "approval_required",
              message:
                offer.access_mode === "APPLICATION_REQUIRED"
                  ? "Application approval required for this offer before generating tracking links"
                  : "Private inventory: approved affiliate access required",
              correlationId,
            },
          },
          403
        );
      }
    } catch {
      // If table is still provisioning, don't crash
    }
  }

  let code = body.code?.trim().toLowerCase() || randomCode(10);
  if (code.length < 6 || code.length > 32) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "code must be 6–32 characters",
          correlationId,
        },
      },
      400
    );
  }

  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(
      `INSERT INTO tracking_links (
         id, organization_id, affiliate_profile_id, offer_id, offer_organization_id,
         code, name, status, created_by_user_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`
    )
      .bind(
        id,
        orgId,
        profileId,
        offerId,
        offer.offer_organization_id,
        code,
        body.name ?? null,
        user.id
      )
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      return c.json(
        {
          error: {
            code: "code_taken",
            message: "Tracking code already in use",
            correlationId,
          },
        },
        409
      );
    }
    console.error(`[${correlationId}] tracking link create failed`, err);
    return c.json(
      {
        error: {
          code: "create_failed",
          message: "Unable to create tracking link",
          correlationId,
        },
      },
      503
    );
  }

  const base = "https://trafficvaulthub.uttombarmon45.workers.dev";
  return c.json(
    {
      data: {
        id,
        code,
        trackingUrl: `${base}/api/v1/t/${code}`,
        offerId,
        organizationId: orgId,
        status: "ACTIVE",
      },
      correlationId,
    },
    201
  );
});

/**
 * GET /api/v1/tracking-links?organizationId=
 */
trackingLinkRoutes.get("/", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const orgId = c.req.query("organizationId")?.trim();
  if (!orgId) {
    return c.json(
      {
        error: {
          code: "organization_required",
          message: "organizationId required",
          correlationId,
        },
      },
      400
    );
  }
  const profileId = await affiliateContext(c.env.DB, user.id, orgId);
  if (!profileId) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Affiliate membership required",
          correlationId,
        },
      },
      403
    );
  }

  const { results } = await c.env.DB.prepare(
    `SELECT id, code, name, offer_id, status, created_at
     FROM tracking_links
     WHERE organization_id = ? AND status != 'ARCHIVED'
     ORDER BY created_at DESC
     LIMIT 100`
  )
    .bind(orgId)
    .all();

  const base = "https://trafficvaulthub.uttombarmon45.workers.dev";
  const data = (results ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    trackingUrl: `${base}/api/v1/t/${r.code}`,
  }));

  return c.json({ data, correlationId });
});
