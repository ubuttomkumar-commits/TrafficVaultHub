/**
 * Offer cap reservation: prefers Durable Object CAPS when bound,
 * falls back to D1 atomic UPDATE.
 */

export type CapCheckResult =
  | { ok: true }
  | { ok: false; reason: string; capType?: string };

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

type VersionCaps = {
  daily_conversion_cap: number | null;
  total_conversion_cap: number | null;
  budget_minor: number | null;
  currency: string;
};

type EnvWithCaps = {
  DB: D1Database;
  CAPS?: DurableObjectNamespace;
};

async function loadVersionCaps(
  db: D1Database,
  offerId: string
): Promise<VersionCaps | null> {
  return db
    .prepare(
      `SELECT daily_conversion_cap, total_conversion_cap, budget_minor, currency
       FROM offer_versions ov
       INNER JOIN offers o ON o.current_version_id = ov.id
       WHERE o.id = ?
       LIMIT 1`
    )
    .bind(offerId)
    .first<VersionCaps>();
}

/** DO-backed reserve when CAPS binding exists */
async function reserveViaDO(
  env: EnvWithCaps,
  args: {
    offerId: string;
    organizationId: string;
    commissionMinor: number;
    currency: string;
  },
  ver: VersionCaps
): Promise<CapCheckResult> {
  if (!env.CAPS) return { ok: true };

  const id = env.CAPS.idFromName(args.offerId);
  const stub = env.CAPS.get(id);
  const limits = {
    dailyConversion: ver.daily_conversion_cap,
    totalConversion: ver.total_conversion_cap,
    budgetMinor: ver.budget_minor,
    dailyClick: null as number | null,
    totalClick: null as number | null,
    currency: ver.currency || args.currency,
  };

  const res = await stub.fetch("https://cap/reserve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offerId: args.offerId,
      organizationId: args.organizationId,
      limits,
      commissionMinor: args.commissionMinor,
    }),
  });

  const body = (await res.json()) as {
    ok: boolean;
    reason?: string;
    capType?: string;
  };

  if (!body.ok) {
    return {
      ok: false,
      reason: body.reason ?? "cap_reached",
      capType: body.capType,
    };
  }
  return { ok: true };
}

/** D1 fallback (previous behavior) */
async function reserveViaD1(
  db: D1Database,
  args: {
    offerId: string;
    organizationId: string;
    commissionMinor: number;
    currency: string;
  },
  ver: VersionCaps
): Promise<CapCheckResult> {
  const day = utcDayKey();
  const checks: {
    capType: string;
    periodKey: string;
    limit: number | null;
    delta: number;
    currency: string | null;
  }[] = [
    {
      capType: "DAILY_CONVERSION",
      periodKey: day,
      limit: ver.daily_conversion_cap,
      delta: 1,
      currency: null,
    },
    {
      capType: "TOTAL_CONVERSION",
      periodKey: "lifetime",
      limit: ver.total_conversion_cap,
      delta: 1,
      currency: null,
    },
  ];

  if (ver.budget_minor != null && ver.budget_minor > 0) {
    checks.push({
      capType: "BUDGET",
      periodKey: "lifetime",
      limit: ver.budget_minor,
      delta: Math.max(0, args.commissionMinor),
      currency: ver.currency || args.currency,
    });
  }

  for (const c of checks) {
    if (c.limit == null) continue;

    await db
      .prepare(
        `INSERT INTO offer_cap_counters (
           id, offer_id, organization_id, cap_type, period_key, currency,
           limit_value, current_value
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT(offer_id, cap_type, period_key) DO UPDATE SET
           limit_value = excluded.limit_value,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
      )
      .bind(
        crypto.randomUUID(),
        args.offerId,
        args.organizationId,
        c.capType,
        c.periodKey,
        c.currency,
        c.limit
      )
      .run();

    const result = await db
      .prepare(
        `UPDATE offer_cap_counters
         SET current_value = current_value + ?,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
             exhausted_at = CASE
               WHEN current_value + ? >= limit_value THEN strftime('%Y-%m-%dT%H:%M:%fZ','now')
               ELSE exhausted_at
             END
         WHERE offer_id = ? AND cap_type = ? AND period_key = ?
           AND limit_value IS NOT NULL
           AND current_value + ? <= limit_value`
      )
      .bind(
        c.delta,
        c.delta,
        args.offerId,
        c.capType,
        c.periodKey,
        c.delta
      )
      .run();

    if ((result.meta?.changes ?? 0) === 0) {
      return { ok: false, reason: "cap_reached", capType: c.capType };
    }
  }

  return { ok: true };
}

export async function reserveConversionCap(
  env: EnvWithCaps,
  args: {
    offerId: string;
    organizationId: string;
    commissionMinor: number;
    currency: string;
  }
): Promise<CapCheckResult> {
  const ver = await loadVersionCaps(env.DB, args.offerId);
  if (!ver) return { ok: true };

  if (env.CAPS) {
    try {
      return await reserveViaDO(env, args, ver);
    } catch (err) {
      console.warn("DO cap reserve failed, falling back to D1", err);
      return reserveViaD1(env.DB, args, ver);
    }
  }

  return reserveViaD1(env.DB, args, ver);
}

/** @deprecated pass env instead of db — kept for call-site migration */
export async function reserveConversionCapDb(
  db: D1Database,
  args: {
    offerId: string;
    organizationId: string;
    commissionMinor: number;
    currency: string;
  }
): Promise<CapCheckResult> {
  return reserveConversionCap({ DB: db }, args);
}

export async function pauseOfferIfCapsExhausted(
  db: D1Database,
  offerId: string,
  organizationId: string,
  requestId: string
): Promise<void> {
  const exhausted = await db
    .prepare(
      `SELECT 1 AS ok FROM offer_cap_counters
       WHERE offer_id = ? AND exhausted_at IS NOT NULL
         AND cap_type IN ('DAILY_CONVERSION', 'TOTAL_CONVERSION', 'BUDGET', 'DAILY_CLICK', 'TOTAL_CLICK')
       LIMIT 1`
    )
    .bind(offerId)
    .first();

  if (!exhausted) return;

  const offer = await db
    .prepare(`SELECT status FROM offers WHERE id = ? LIMIT 1`)
    .bind(offerId)
    .first<{ status: string }>();

  if (!offer || offer.status !== "LIVE") return;

  await db
    .prepare(
      `UPDATE offers SET status = 'CAP_REACHED',
                        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ? AND status = 'LIVE'`
    )
    .bind(offerId)
    .run();

  await db
    .prepare(
      `INSERT INTO offer_status_transitions (
         id, offer_id, organization_id, from_status, to_status,
         actor_user_id, actor_kind, reason, request_id
       ) VALUES (?, ?, ?, 'LIVE', 'CAP_REACHED', NULL, 'SYSTEM', 'cap_exhausted', ?)`
    )
    .bind(crypto.randomUUID(), offerId, organizationId, requestId)
    .run();
}


/** Load click limits from existing offer_cap_counters rows (limit_value). */
async function loadClickLimits(
  db: D1Database,
  offerId: string
): Promise<{ dailyClick: number | null; totalClick: number | null }> {
  const day = utcDayKey();
  const rows = await db
    .prepare(
      `SELECT cap_type, period_key, limit_value FROM offer_cap_counters
       WHERE offer_id = ? AND cap_type IN ('DAILY_CLICK','TOTAL_CLICK')`
    )
    .bind(offerId)
    .all<{ cap_type: string; period_key: string; limit_value: number | null }>();

  let dailyClick: number | null = null;
  let totalClick: number | null = null;
  for (const r of rows.results ?? []) {
    if (r.cap_type === "DAILY_CLICK" && r.limit_value != null) {
      // Prefer today's row limit, else any DAILY_CLICK limit template
      if (r.period_key === day || dailyClick == null) dailyClick = r.limit_value;
    }
    if (r.cap_type === "TOTAL_CLICK" && r.limit_value != null) {
      totalClick = r.limit_value;
    }
  }
  return { dailyClick, totalClick };
}

async function reserveClickViaDO(
  env: EnvWithCaps,
  args: { offerId: string; organizationId: string },
  clickLimits: { dailyClick: number | null; totalClick: number | null }
): Promise<CapCheckResult> {
  if (!env.CAPS) return { ok: true };
  const id = env.CAPS.idFromName(args.offerId);
  const stub = env.CAPS.get(id);
  const res = await stub.fetch("https://cap/reserve-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      offerId: args.offerId,
      organizationId: args.organizationId,
      limits: {
        dailyConversion: null,
        totalConversion: null,
        budgetMinor: null,
        dailyClick: clickLimits.dailyClick,
        totalClick: clickLimits.totalClick,
        currency: "USD",
      },
    }),
  });
  const body = (await res.json()) as {
    ok: boolean;
    reason?: string;
    capType?: string;
  };
  if (!body.ok) {
    return {
      ok: false,
      reason: body.reason ?? "cap_reached",
      capType: body.capType,
    };
  }
  return { ok: true };
}

async function reserveClickViaD1(
  db: D1Database,
  args: { offerId: string; organizationId: string },
  clickLimits: { dailyClick: number | null; totalClick: number | null }
): Promise<CapCheckResult> {
  const day = utcDayKey();
  const checks = [
    {
      capType: "DAILY_CLICK",
      periodKey: day,
      limit: clickLimits.dailyClick,
    },
    {
      capType: "TOTAL_CLICK",
      periodKey: "lifetime",
      limit: clickLimits.totalClick,
    },
  ];

  for (const c of checks) {
    if (c.limit == null) continue;
    await db
      .prepare(
        `INSERT INTO offer_cap_counters (
           id, offer_id, organization_id, cap_type, period_key,
           limit_value, current_value
         ) VALUES (?, ?, ?, ?, ?, ?, 0)
         ON CONFLICT(offer_id, cap_type, period_key) DO UPDATE SET
           limit_value = excluded.limit_value,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
      )
      .bind(
        crypto.randomUUID(),
        args.offerId,
        args.organizationId,
        c.capType,
        c.periodKey,
        c.limit
      )
      .run();

    const result = await db
      .prepare(
        `UPDATE offer_cap_counters
         SET current_value = current_value + 1,
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now'),
             exhausted_at = CASE
               WHEN current_value + 1 >= limit_value THEN strftime('%Y-%m-%dT%H:%M:%fZ','now')
               ELSE exhausted_at
             END
         WHERE offer_id = ? AND cap_type = ? AND period_key = ?
           AND limit_value IS NOT NULL
           AND current_value + 1 <= limit_value`
      )
      .bind(args.offerId, c.capType, c.periodKey)
      .run();

    if ((result.meta?.changes ?? 0) === 0) {
      return { ok: false, reason: "cap_reached", capType: c.capType };
    }
  }
  return { ok: true };
}

/**
 * Reserve one click against DAILY_CLICK / TOTAL_CLICK limits.
 * Limits come from offer_cap_counters.limit_value (set by ops/admin).
 * No limit rows → allow (unlimited clicks).
 */
export async function reserveClickCap(
  env: EnvWithCaps,
  args: { offerId: string; organizationId: string }
): Promise<CapCheckResult> {
  const clickLimits = await loadClickLimits(env.DB, args.offerId);
  if (clickLimits.dailyClick == null && clickLimits.totalClick == null) {
    // Still track counts via DO when bound (no hard limit)
    if (env.CAPS) {
      try {
        await reserveClickViaDO(env, args, clickLimits);
      } catch {
        /* non-fatal count tracking */
      }
    }
    return { ok: true };
  }

  if (env.CAPS) {
    try {
      return await reserveClickViaDO(env, args, clickLimits);
    } catch (err) {
      console.warn("DO click cap failed, D1 fallback", err);
      return reserveClickViaD1(env.DB, args, clickLimits);
    }
  }
  return reserveClickViaD1(env.DB, args, clickLimits);
}
