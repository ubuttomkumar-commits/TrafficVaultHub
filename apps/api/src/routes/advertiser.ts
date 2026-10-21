/**
 * Advertiser funding & balance — existing journal_entries + ledger_accounts.
 * No parallel finance system.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";

export const advertiserRoutes = new Hono<{ Bindings: Env }>();

advertiserRoutes.use("*", requireAuth());

type OrgAccess = {
  organization_id: string;
  org_name: string;
  org_type: string;
  role_id: string;
};

async function accessibleAdvertiserOrgs(
  db: D1Database,
  userId: string
): Promise<OrgAccess[]> {
  const { results } = await db
    .prepare(
      `SELECT om.organization_id, o.name AS org_name, o.type AS org_type, om.role_id
       FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = ? AND om.status = 'ACTIVE'
         AND o.deleted_at IS NULL AND o.status = 'ACTIVE'
         AND (
           o.type = 'ADVERTISER'
           OR o.type = 'PLATFORM'
         )`
    )
    .bind(userId)
    .all<OrgAccess>();
  return results ?? [];
}

function isPlatformRole(roleId: string): boolean {
  return [
    "00000000-0000-4000-8000-000000000101",
    "00000000-0000-4000-8000-000000000102",
    "00000000-0000-4000-8000-000000000103",
  ].includes(roleId);
}

async function ensurePrepaidAccount(
  db: D1Database,
  orgId: string,
  currency: string
): Promise<string> {
  const existing = await db
    .prepare(
      `SELECT id FROM ledger_accounts
       WHERE organization_id = ? AND code = 'ADVERTISER_PREPAID' AND currency = ?
       LIMIT 1`
    )
    .bind(orgId, currency)
    .first<{ id: string }>();
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  await db
    .prepare(
      `INSERT INTO ledger_accounts (
         id, organization_id, code, account_type, currency, name, status
       ) VALUES (?, ?, 'ADVERTISER_PREPAID', 'LIABILITY', ?, 'Advertiser prepaid', 'OPEN')`
    )
    .bind(id, orgId, currency)
    .run();
  return id;
}

/**
 * GET /api/v1/advertiser/balance?organizationId=
 */
advertiserRoutes.get("/balance", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const orgs = await accessibleAdvertiserOrgs(c.env.DB, user.id);
  const advertisers = orgs.filter((o) => o.org_type === "ADVERTISER");
  const platform = orgs.some((o) => o.org_type === "PLATFORM");

  const requested = c.req.query("organizationId");
  let orgId = requested;
  if (!orgId) {
    if (advertisers.length === 1) orgId = advertisers[0].organization_id;
    else {
      return c.json(
        {
          error: {
            code: "organization_required",
            message: "organizationId query parameter required",
            correlationId,
          },
        },
        400
      );
    }
  }

  const allowed =
    platform ||
    advertisers.some((o) => o.organization_id === orgId);
  if (!allowed) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Not allowed for this organization",
          correlationId,
        },
      },
      403
    );
  }

  const { results } = await c.env.DB.prepare(
    `SELECT journal_type, currency, COALESCE(SUM(total_minor), 0) AS total
     FROM journal_entries
     WHERE organization_id = ?
       AND journal_type IN ('FUNDING', 'FUNDING_REVERSAL', 'ADJUSTMENT')
     GROUP BY journal_type, currency`
  )
    .bind(orgId)
    .all<{ journal_type: string; currency: string; total: number }>();

  const byCurrency: Record<
    string,
    { fundingMinor: number; fundingReversalMinor: number; adjustmentMinor: number }
  > = {};

  for (const row of results ?? []) {
    const cur = row.currency;
    if (!byCurrency[cur]) {
      byCurrency[cur] = {
        fundingMinor: 0,
        fundingReversalMinor: 0,
        adjustmentMinor: 0,
      };
    }
    const t = Number(row.total) || 0;
    if (row.journal_type === "FUNDING") byCurrency[cur].fundingMinor += t;
    else if (row.journal_type === "FUNDING_REVERSAL")
      byCurrency[cur].fundingReversalMinor += t;
    else if (row.journal_type === "ADJUSTMENT")
      byCurrency[cur].adjustmentMinor += t;
  }

  const balances = Object.entries(byCurrency).map(([currency, b]) => ({
    currency,
    fundingMinor: b.fundingMinor,
    fundingReversalMinor: b.fundingReversalMinor,
    adjustmentMinor: b.adjustmentMinor,
    availableMinor: Math.max(
      0,
      b.fundingMinor - b.fundingReversalMinor + b.adjustmentMinor
    ),
    definitions: {
      availableMinor:
        "max(0, FUNDING - FUNDING_REVERSAL + ADJUSTMENT) from journal_entries for this advertiser org",
    },
  }));

  return c.json({
    data: {
      organizationId: orgId,
      balances,
      note: "Spend against offers is not auto-deducted here until advertiser liability journals are posted per conversion.",
    },
    correlationId,
  });
});

/**
 * GET /api/v1/advertiser/funding?organizationId=
 */
advertiserRoutes.get("/funding", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const orgs = await accessibleAdvertiserOrgs(c.env.DB, user.id);
  const platform = orgs.some((o) => o.org_type === "PLATFORM");
  const advertisers = orgs.filter((o) => o.org_type === "ADVERTISER");

  const orgId = c.req.query("organizationId");
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
  if (
    !platform &&
    !advertisers.some((o) => o.organization_id === orgId)
  ) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Not allowed for this organization",
          correlationId,
        },
      },
      403
    );
  }

  const page = Math.max(1, Number(c.req.query("page") || 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || 20) || 20));
  const offset = (page - 1) * limit;

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM journal_entries
     WHERE organization_id = ?
       AND journal_type IN ('FUNDING', 'FUNDING_REVERSAL')`
  )
    .bind(orgId)
    .first<{ total: number }>();

  const { results } = await c.env.DB.prepare(
    `SELECT id, journal_type, currency, total_minor, reference_type, reference_id,
            description, posted_at, created_at, idempotency_key
     FROM journal_entries
     WHERE organization_id = ?
       AND journal_type IN ('FUNDING', 'FUNDING_REVERSAL')
     ORDER BY posted_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(orgId, limit, offset)
    .all();

  return c.json({
    data: results ?? [],
    pagination: {
      page,
      limit,
      total: totalRow?.total ?? 0,
      hasMore: offset + (results?.length ?? 0) < (totalRow?.total ?? 0),
    },
    correlationId,
  });
});

/**
 * POST /api/v1/advertiser/funding
 * Body: { organizationId, amountMinor, currency, referenceId?, description?, idempotencyKey? }
 * Platform finance/ops or advertiser billing roles.
 */
advertiserRoutes.post("/funding", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const orgs = await accessibleAdvertiserOrgs(c.env.DB, user.id);

  let body: {
    organizationId?: string;
    amountMinor?: number;
    currency?: string;
    referenceId?: string;
    description?: string;
    idempotencyKey?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: {
          code: "invalid_json",
          message: "Invalid JSON body",
          correlationId,
        },
      },
      400
    );
  }

  const orgId = body.organizationId?.trim();
  const amount = Number(body.amountMinor);
  const currency = body.currency?.trim().toUpperCase();

  if (!orgId || !Number.isFinite(amount) || amount <= 0 || !currency || currency.length !== 3) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "organizationId, positive amountMinor, and 3-letter currency required",
          correlationId,
        },
      },
      400
    );
  }

  const membership = orgs.find((o) => o.organization_id === orgId);
  const platformMember = orgs.find((o) => o.org_type === "PLATFORM");
  const canPost =
    (platformMember && isPlatformRole(platformMember.role_id)) ||
    (membership &&
      membership.org_type === "ADVERTISER" &&
      [
        "00000000-0000-4000-8000-000000000201",
        "00000000-0000-4000-8000-000000000202",
        "00000000-0000-4000-8000-000000000204",
      ].includes(membership.role_id));

  // Platform operators can fund any advertiser org (verify it is ADVERTISER)
  if (platformMember && isPlatformRole(platformMember.role_id)) {
    const adv = await c.env.DB.prepare(
      `SELECT id FROM organizations WHERE id = ? AND type = 'ADVERTISER' AND deleted_at IS NULL LIMIT 1`
    )
      .bind(orgId)
      .first();
    if (!adv) {
      return c.json(
        {
          error: {
            code: "not_advertiser",
            message: "Organization is not an active advertiser",
            correlationId,
          },
        },
        422
      );
    }
  } else if (!canPost) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Not allowed to post funding for this organization",
          correlationId,
        },
      },
      403
    );
  }

  const idempotencyKey =
    body.idempotencyKey?.trim() ||
    `funding:${orgId}:${currency}:${amount}:${body.referenceId ?? correlationId}`;

  if (idempotencyKey.length < 8 || idempotencyKey.length > 256) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "idempotencyKey length must be 8–256",
          correlationId,
        },
      },
      400
    );
  }

  const existing = await c.env.DB.prepare(
    `SELECT id, total_minor, currency, posted_at FROM journal_entries
     WHERE idempotency_key = ? LIMIT 1`
  )
    .bind(idempotencyKey)
    .first<{ id: string; total_minor: number; currency: string; posted_at: string }>();

  if (existing) {
    return c.json({
      data: {
        journalId: existing.id,
        amountMinor: existing.total_minor,
        currency: existing.currency,
        postedAt: existing.posted_at,
        duplicate: true,
      },
      correlationId,
    });
  }

  await ensurePrepaidAccount(c.env.DB, orgId, currency);

  const journalId = crypto.randomUUID();
  const postedAt = new Date().toISOString();
  const referenceId = body.referenceId?.trim() || journalId;

  try {
    await c.env.DB.prepare(
      `INSERT INTO journal_entries (
         id, organization_id, journal_type, currency, total_minor,
         reference_type, reference_id, idempotency_key, actor_type,
         posted_by_user_id, description, request_id, posted_at
       ) VALUES (
         ?, ?, 'FUNDING', ?, ?,
         'FUNDING', ?, ?, 'PLATFORM',
         ?, ?, ?, ?
       )`
    )
      .bind(
        journalId,
        orgId,
        currency,
        Math.floor(amount),
        referenceId,
        idempotencyKey,
        user.id,
        body.description?.slice(0, 500) ?? "Advertiser funding",
        correlationId,
        postedAt
      )
      .run();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      const again = await c.env.DB.prepare(
        `SELECT id, total_minor, currency, posted_at FROM journal_entries
         WHERE idempotency_key = ? LIMIT 1`
      )
        .bind(idempotencyKey)
        .first<{ id: string; total_minor: number; currency: string; posted_at: string }>();
      return c.json({
        data: {
          journalId: again?.id,
          amountMinor: again?.total_minor,
          currency: again?.currency,
          postedAt: again?.posted_at,
          duplicate: true,
        },
        correlationId,
      });
    }
    console.error(`[${correlationId}] funding post failed`, err);
    return c.json(
      {
        error: {
          code: "funding_failed",
          message: "Unable to post funding journal",
          correlationId,
        },
      },
      503
    );
  }

  return c.json(
    {
      data: {
        journalId,
        organizationId: orgId,
        amountMinor: Math.floor(amount),
        currency,
        postedAt,
        duplicate: false,
        note: "Recorded as FUNDING journal; not a payment-provider confirmation",
      },
      correlationId,
    },
    201
  );
});
