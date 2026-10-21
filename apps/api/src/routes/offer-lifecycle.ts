/**
 * Offer create + lifecycle transitions against offers / offer_versions / offer_status_transitions.
 * Server-controlled status only.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";

export const offerLifecycleRoutes = new Hono<{ Bindings: Env }>();

offerLifecycleRoutes.use("*", requireAuth());

const PAYOUT_TYPES = new Set([
  "CPA",
  "CPL",
  "CPC",
  "CPI",
  "CPM",
  "CPS",
  "REVSHARE",
]);

async function isPlatformOps(db: D1Database, userId: string): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS ok FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = ? AND om.status = 'ACTIVE' AND o.type = 'PLATFORM'
         AND om.role_id IN (
           '00000000-0000-4000-8000-000000000101',
           '00000000-0000-4000-8000-000000000102'
         ) LIMIT 1`
    )
    .bind(userId)
    .first();
  return Boolean(row);
}

async function advertiserAccess(
  db: D1Database,
  userId: string,
  orgId: string
): Promise<{ ok: boolean; profileId?: string }> {
  const member = await db
    .prepare(
      `SELECT om.role_id FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = ? AND om.organization_id = ? AND om.status = 'ACTIVE'
         AND o.type = 'ADVERTISER' AND o.deleted_at IS NULL LIMIT 1`
    )
    .bind(userId, orgId)
    .first<{ role_id: string }>();
  if (!member) return { ok: false };
  const profile = await db
    .prepare(
      `SELECT id FROM advertiser_profiles WHERE organization_id = ? LIMIT 1`
    )
    .bind(orgId)
    .first<{ id: string }>();
  if (!profile) return { ok: false };
  return { ok: true, profileId: profile.id };
}

async function recordTransition(
  db: D1Database,
  offerId: string,
  orgId: string,
  from: string | null,
  to: string,
  userId: string,
  actorKind: "TENANT" | "PLATFORM" | "SYSTEM",
  reason: string | null,
  requestId: string
) {
  await db
    .prepare(
      `INSERT INTO offer_status_transitions (
         id, offer_id, organization_id, from_status, to_status,
         actor_user_id, actor_kind, reason, request_id
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      crypto.randomUUID(),
      offerId,
      orgId,
      from,
      to,
      userId,
      actorKind,
      reason,
      requestId
    )
    .run();
}

/**
 * POST /api/v1/offers
 * Create DRAFT offer + version 1
 */
offerLifecycleRoutes.post("/", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;

  let body: {
    organizationId?: string;
    name?: string;
    description?: string;
    vertical?: string;
    accessMode?: string;
    payoutType?: string;
    currency?: string;
    advertiserPayoutMinor?: number;
    affiliateCommissionMinor?: number;
    conversionEvent?: string;
    destinationUrl?: string;
    attributionWindowSeconds?: number;
    dailyConversionCap?: number | null;
    totalConversionCap?: number | null;
    budgetMinor?: number | null;
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
  const name = body.name?.trim();
  if (!orgId || !name) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "organizationId and name required",
          correlationId,
        },
      },
      400
    );
  }

  const access = await advertiserAccess(c.env.DB, user.id, orgId);
  const platform = await isPlatformOps(c.env.DB, user.id);
  if (!access.ok && !platform) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Advertiser membership or platform ops required",
          correlationId,
        },
      },
      403
    );
  }

  let profileId = access.profileId;
  if (!profileId) {
    const p = await c.env.DB.prepare(
      `SELECT id FROM advertiser_profiles WHERE organization_id = ? LIMIT 1`
    )
      .bind(orgId)
      .first<{ id: string }>();
    profileId = p?.id;
  }
  if (!profileId) {
    return c.json(
      {
        error: {
          code: "no_advertiser_profile",
          message: "Advertiser profile missing for organization",
          correlationId,
        },
      },
      422
    );
  }

  const payoutType = (body.payoutType || "CPA").toUpperCase();
  if (!PAYOUT_TYPES.has(payoutType)) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: `payoutType must be one of ${[...PAYOUT_TYPES].join(",")}`,
          correlationId,
        },
      },
      400
    );
  }

  const currency = (body.currency || "USD").toUpperCase();
  if (currency.length !== 3) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "currency must be ISO 4217",
          correlationId,
        },
      },
      400
    );
  }

  const advPayout = Math.max(0, Math.floor(Number(body.advertiserPayoutMinor) || 0));
  const affComm = Math.max(0, Math.floor(Number(body.affiliateCommissionMinor) || 0));
  if (affComm > advPayout && payoutType !== "REVSHARE") {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "affiliateCommissionMinor cannot exceed advertiserPayoutMinor",
          correlationId,
        },
      },
      400
    );
  }

  const conversionEvent = (body.conversionEvent || "lead").trim();
  const accessMode = (body.accessMode || "PUBLIC").toUpperCase();
  const allowedAccess = new Set([
    "PUBLIC",
    "APPLICATION_REQUIRED",
    "PRIVATE",
    "INVITE_ONLY",
    "AFFILIATE_SPECIFIC",
  ]);
  if (!allowedAccess.has(accessMode)) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Invalid accessMode",
          correlationId,
        },
      },
      400
    );
  }

  const offerId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const margin = Math.max(0, advPayout - affComm);

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO offers (
           id, organization_id, advertiser_profile_id, status, access_mode,
           name, vertical, description, current_version_id
         ) VALUES (?, ?, ?, 'DRAFT', ?, ?, ?, ?, ?)`
      ).bind(
        offerId,
        orgId,
        profileId,
        accessMode,
        name,
        body.vertical ?? null,
        body.description ?? null,
        versionId
      ),
      c.env.DB.prepare(
        `INSERT INTO offer_versions (
           id, offer_id, organization_id, version_number,
           payout_type, currency, advertiser_payout_minor, affiliate_commission_minor,
           network_margin_minor, daily_conversion_cap, total_conversion_cap, budget_minor,
           attribution_window_seconds, conversion_event, destination_url,
           created_by_user_id, change_summary
         ) VALUES (
           ?, ?, ?, 1,
           ?, ?, ?, ?,
           ?, ?, ?, ?,
           ?, ?, ?,
           ?, 'Initial version'
         )`
      ).bind(
        versionId,
        offerId,
        orgId,
        payoutType,
        currency,
        advPayout,
        affComm,
        margin,
        body.dailyConversionCap ?? null,
        body.totalConversionCap ?? null,
        body.budgetMinor ?? null,
        body.attributionWindowSeconds ?? 2592000,
        conversionEvent,
        body.destinationUrl ?? null,
        user.id
      ),
    ]);
    await recordTransition(
      c.env.DB,
      offerId,
      orgId,
      null,
      "DRAFT",
      user.id,
      platform ? "PLATFORM" : "TENANT",
      "offer_created",
      correlationId
    );
  } catch (err) {
    console.error(`[${correlationId}] offer create failed`, err);
    return c.json(
      {
        error: {
          code: "create_failed",
          message: "Unable to create offer",
          correlationId,
        },
      },
      503
    );
  }

  return c.json(
    {
      data: {
        offerId,
        versionId,
        status: "DRAFT",
        name,
      },
      correlationId,
    },
    201
  );
});

async function transitionOffer(
  c: {
    env: Env;
    get: (k: "correlationId" | "user") => unknown;
    req: { param: (k: string) => string };
    json: (b: unknown, s?: number) => Response;
  },
  toStatus: string,
  opts: {
    allowedFrom: string[];
    platformOnly?: boolean;
    reason?: string;
  }
) {
  const correlationId = c.get("correlationId") as string;
  const user = c.get("user") as {
    id: string;
  };
  const offerId = c.req.param("id");

  const offer = await c.env.DB.prepare(
    `SELECT id, organization_id, status, current_version_id FROM offers WHERE id = ? LIMIT 1`
  )
    .bind(offerId)
    .first<{
      id: string;
      organization_id: string;
      status: string;
      current_version_id: string | null;
    }>();

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

  const platform = await isPlatformOps(c.env.DB, user.id);
  const access = await advertiserAccess(
    c.env.DB,
    user.id,
    offer.organization_id
  );

  if (opts.platformOnly && !platform) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Platform ops required",
          correlationId,
        },
      },
      403
    );
  }
  if (!platform && !access.ok) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Not allowed for this offer",
          correlationId,
        },
      },
      403
    );
  }

  if (!opts.allowedFrom.includes(offer.status)) {
    return c.json(
      {
        error: {
          code: "invalid_state",
          message: `Cannot move from ${offer.status} to ${toStatus}`,
          correlationId,
        },
      },
      409
    );
  }

  // Activation readiness
  if (toStatus === "LIVE") {
    const ver = await c.env.DB.prepare(
      `SELECT destination_url, conversion_event, affiliate_commission_minor, currency
       FROM offer_versions WHERE id = ? LIMIT 1`
    )
      .bind(offer.current_version_id)
      .first<{
        destination_url: string | null;
        conversion_event: string;
        affiliate_commission_minor: number;
        currency: string;
      }>();
    if (!ver?.destination_url || !ver.conversion_event) {
      return c.json(
        {
          error: {
            code: "not_ready",
            message: "destination_url and conversion_event required before LIVE",
            correlationId,
          },
        },
        422
      );
    }
  }

  const extra =
    toStatus === "SUBMITTED"
      ? `, submitted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
      : toStatus === "APPROVED"
        ? `, approved_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
        : toStatus === "LIVE"
          ? `, activated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
          : toStatus === "ARCHIVED"
            ? `, archived_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
            : "";

  await c.env.DB.prepare(
    `UPDATE offers SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')${extra}
     WHERE id = ?`
  )
    .bind(toStatus, offerId)
    .run();

  await recordTransition(
    c.env.DB,
    offerId,
    offer.organization_id,
    offer.status,
    toStatus,
    user.id,
    platform ? "PLATFORM" : "TENANT",
    opts.reason ?? null,
    correlationId
  );

  return c.json({
    data: {
      offerId,
      fromStatus: offer.status,
      toStatus,
    },
    correlationId,
  });
}

offerLifecycleRoutes.post("/:id/submit-review", (c) =>
  transitionOffer(c as never, "SUBMITTED", {
    allowedFrom: ["DRAFT"],
    reason: "submitted_for_review",
  })
);

offerLifecycleRoutes.post("/:id/approve", (c) =>
  transitionOffer(c as never, "APPROVED", {
    allowedFrom: ["SUBMITTED", "UNDER_REVIEW"],
    platformOnly: true,
    reason: "platform_approved",
  })
);

offerLifecycleRoutes.post("/:id/activate", (c) =>
  transitionOffer(c as never, "LIVE", {
    allowedFrom: ["APPROVED", "PAUSED"],
    reason: "activated",
  })
);

offerLifecycleRoutes.post("/:id/pause", (c) =>
  transitionOffer(c as never, "PAUSED", {
    allowedFrom: ["LIVE"],
    reason: "paused",
  })
);

offerLifecycleRoutes.post("/:id/resume", (c) =>
  transitionOffer(c as never, "LIVE", {
    allowedFrom: ["PAUSED"],
    reason: "resumed",
  })
);

offerLifecycleRoutes.post("/:id/reject", (c) =>
  transitionOffer(c as never, "DRAFT", {
    allowedFrom: ["SUBMITTED", "UNDER_REVIEW"],
    platformOnly: true,
    reason: "rejected_to_draft",
  })
);
