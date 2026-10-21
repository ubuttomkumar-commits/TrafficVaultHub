/**
 * Publisher (affiliate) read APIs — earnings + conversions.
 * Uses existing journal_entries, conversions, organization_members.
 * Never presents pending as payable without explicit labels.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";

export const publisherRoutes = new Hono<{ Bindings: Env }>();

publisherRoutes.use("*", requireAuth());

type Membership = {
  organization_id: string;
  org_type: string;
  org_name: string;
};

async function affiliateOrgs(
  db: D1Database,
  userId: string
): Promise<Membership[]> {
  const { results } = await db
    .prepare(
      `SELECT om.organization_id, o.type AS org_type, o.name AS org_name
       FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       WHERE om.user_id = ? AND om.status = 'ACTIVE'
         AND o.type = 'AFFILIATE' AND o.deleted_at IS NULL AND o.status = 'ACTIVE'`
    )
    .bind(userId)
    .all<Membership>();
  return results ?? [];
}

/**
 * GET /api/v1/publisher/earnings
 * Optional query: organizationId (must be a membership)
 */
publisherRoutes.get("/earnings", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const orgs = await affiliateOrgs(c.env.DB, user.id);

  if (orgs.length === 0) {
    return c.json(
      {
        error: {
          code: "no_affiliate_org",
          message: "No active affiliate organization membership",
          correlationId,
        },
      },
      403
    );
  }

  const requested = c.req.query("organizationId");
  const org =
    (requested && orgs.find((o) => o.organization_id === requested)) || orgs[0];

  if (requested && !orgs.some((o) => o.organization_id === requested)) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Not a member of that organization",
          correlationId,
        },
      },
      403
    );
  }

  const orgId = org.organization_id;

  // Journal-based totals (integer minor units)
  const journal = await c.env.DB.prepare(
    `SELECT journal_type, currency, COALESCE(SUM(total_minor), 0) AS total
     FROM journal_entries
     WHERE organization_id = ?
     GROUP BY journal_type, currency`
  )
    .bind(orgId)
    .all<{ journal_type: string; currency: string; total: number }>();

  const byCurrency: Record<
    string,
    {
      commissionsMinor: number;
      reversalsMinor: number;
      payoutsMinor: number;
      adjustmentsMinor: number;
    }
  > = {};

  for (const row of journal.results ?? []) {
    const cur = row.currency;
    if (!byCurrency[cur]) {
      byCurrency[cur] = {
        commissionsMinor: 0,
        reversalsMinor: 0,
        payoutsMinor: 0,
        adjustmentsMinor: 0,
      };
    }
    const t = row.journal_type;
    const amt = Number(row.total) || 0;
    if (t === "CONVERSION_COMMISSION") byCurrency[cur].commissionsMinor += amt;
    else if (t === "CONVERSION_REVERSAL") byCurrency[cur].reversalsMinor += amt;
    else if (t === "PAYOUT") byCurrency[cur].payoutsMinor += amt;
    else if (t === "PAYOUT_REVERSAL") byCurrency[cur].payoutsMinor -= amt;
    else if (t === "ADJUSTMENT") byCurrency[cur].adjustmentsMinor += amt;
  }

  // Conversion lifecycle buckets (not ledger — labeled separately)
  const conv = await c.env.DB.prepare(
    `SELECT lifecycle_status, COUNT(*) AS c
     FROM conversions
     WHERE affiliate_organization_id = ?
     GROUP BY lifecycle_status`
  )
    .bind(orgId)
    .all<{ lifecycle_status: string; c: number }>();

  const conversionCounts: Record<string, number> = {};
  for (const row of conv.results ?? []) {
    conversionCounts[row.lifecycle_status] = Number(row.c) || 0;
  }

  const currencies = Object.keys(byCurrency);
  const summaries = currencies.map((currency) => {
    const b = byCurrency[currency];
    const earnedMinor = b.commissionsMinor - b.reversalsMinor + b.adjustmentsMinor;
    const paidMinor = b.payoutsMinor;
    // Payable ≈ earned - paid (floor at 0 for display; not a guarantee)
    const payableMinor = Math.max(0, earnedMinor - paidMinor);
    return {
      currency,
      definitions: {
        commissionsMinor: "Sum of CONVERSION_COMMISSION journal totals",
        reversalsMinor: "Sum of CONVERSION_REVERSAL journal totals",
        earnedMinor: "commissions - reversals + adjustments",
        paidMinor: "Sum of PAYOUT journals (net of PAYOUT_REVERSAL)",
        payableMinor: "max(0, earned - paid) — display estimate from journals only",
      },
      commissionsMinor: b.commissionsMinor,
      reversalsMinor: b.reversalsMinor,
      adjustmentsMinor: b.adjustmentsMinor,
      earnedMinor,
      paidMinor,
      payableMinor,
    };
  });

  return c.json({
    data: {
      organizationId: orgId,
      organizationName: org.org_name,
      memberships: orgs,
      conversionCounts,
      // Pending conversions are NOT included in payableMinor
      note: "Pending/received conversions are not treated as payable. Totals come from posted journal_entries only.",
      byCurrency: summaries,
    },
    correlationId,
  });
});

/**
 * GET /api/v1/publisher/conversions
 */
publisherRoutes.get("/conversions", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const orgs = await affiliateOrgs(c.env.DB, user.id);

  if (orgs.length === 0) {
    return c.json(
      {
        error: {
          code: "no_affiliate_org",
          message: "No active affiliate organization membership",
          correlationId,
        },
      },
      403
    );
  }

  const requested = c.req.query("organizationId");
  const org =
    (requested && orgs.find((o) => o.organization_id === requested)) || orgs[0];
  if (requested && org.organization_id !== requested) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Not a member of that organization",
          correlationId,
        },
      },
      403
    );
  }

  const page = Math.max(1, Number(c.req.query("page") || 1) || 1);
  const limit = Math.min(50, Math.max(1, Number(c.req.query("limit") || 20) || 20));
  const offset = (page - 1) * limit;
  const status = c.req.query("lifecycleStatus")?.trim() || null;

  const conditions = [`affiliate_organization_id = ?`];
  const binds: (string | number)[] = [org.organization_id];
  if (status) {
    conditions.push(`lifecycle_status = ?`);
    binds.push(status);
  }
  const where = conditions.join(" AND ");

  const totalRow = await c.env.DB.prepare(
    `SELECT COUNT(*) AS total FROM conversions WHERE ${where}`
  )
    .bind(...binds)
    .first<{ total: number }>();

  const { results } = await c.env.DB.prepare(
    `SELECT id, offer_id, conversion_event, status, lifecycle_status,
            external_conversion_id, created_at, updated_at
     FROM conversions
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...binds, limit, offset)
    .all();

  return c.json({
    data: results ?? [],
    pagination: {
      page,
      limit,
      total: totalRow?.total ?? 0,
      hasMore: offset + (results?.length ?? 0) < (totalRow?.total ?? 0),
    },
    organizationId: org.organization_id,
    correlationId,
  });
});

/**
 * GET /api/v1/publisher/conversion-confidence
 * PRD §6.3 — real counts only; no fabricated rates.
 */
publisherRoutes.get("/conversion-confidence", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const orgs = await affiliateOrgs(c.env.DB, user.id);

  if (orgs.length === 0) {
    return c.json(
      {
        error: {
          code: "no_affiliate_org",
          message: "No active affiliate organization membership",
          correlationId,
        },
      },
      403
    );
  }

  const requested = c.req.query("organizationId");
  const org =
    (requested && orgs.find((o) => o.organization_id === requested)) || orgs[0];
  if (requested && org.organization_id !== requested) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Not a member of that organization",
          correlationId,
        },
      },
      403
    );
  }

  const orgId = org.organization_id;
  const windowHours = Math.min(
    168,
    Math.max(1, Number(c.req.query("windowHours") || 24) || 24)
  );

  const lifecycleCounts = await c.env.DB.prepare(
    `SELECT COALESCE(lifecycle_status, status) AS st, COUNT(*) AS cnt
     FROM conversions
     WHERE affiliate_organization_id = ?
     GROUP BY COALESCE(lifecycle_status, status)`
  )
    .bind(orgId)
    .all<{ st: string; cnt: number }>();

  const recent = await c.env.DB.prepare(
    `SELECT COUNT(*) AS cnt FROM conversions
     WHERE affiliate_organization_id = ?
       AND created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', ?)`
  )
    .bind(orgId, `-${windowHours} hours`)
    .first<{ cnt: number }>();

  const lastEvent = await c.env.DB.prepare(
    `SELECT created_at FROM conversions
     WHERE affiliate_organization_id = ?
     ORDER BY created_at DESC LIMIT 1`
  )
    .bind(orgId)
    .first<{ created_at: string }>();

  const lastClick = await c.env.DB.prepare(
    `SELECT clicked_at FROM clicks
     WHERE affiliate_organization_id = ?
     ORDER BY clicked_at DESC LIMIT 1`
  )
    .bind(orgId)
    .first<{ clicked_at: string }>();

  const byStatus: Record<string, number> = {};
  for (const row of lifecycleCounts.results ?? []) {
    byStatus[row.st] = row.cnt;
  }

  return c.json({
    data: {
      organizationId: orgId,
      organizationName: org.org_name,
      windowHours,
      conversionCountsByStatus: byStatus,
      conversionsInWindow: recent?.cnt ?? 0,
      lastConversionAt: lastEvent?.created_at ?? null,
      lastClickAt: lastClick?.clicked_at ?? null,
      note: "Counts are server-derived from conversions and clicks only. No estimated EPC or conversion rates.",
    },
    correlationId,
  });
});
