/**
 * Offer cap checks against existing offer_cap_counters + offer_versions limits.
 * D1 single-statement increments — not a Durable Object; document residual race risk.
 */

export type CapCheckResult =
  | { ok: true }
  | { ok: false; reason: string; capType?: string };

function utcDayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function utcMonthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

type VersionCaps = {
  daily_conversion_cap: number | null;
  total_conversion_cap: number | null;
  budget_minor: number | null;
  currency: string;
};

/**
 * Ensure counter rows exist from offer_versions limits, then try increment.
 * Returns not ok if limit would be exceeded.
 */
export async function reserveConversionCap(
  db: D1Database,
  args: {
    offerId: string;
    organizationId: string;
    commissionMinor: number;
    currency: string;
  }
): Promise<CapCheckResult> {
  const ver = await db
    .prepare(
      `SELECT daily_conversion_cap, total_conversion_cap, budget_minor, currency
       FROM offer_versions ov
       INNER JOIN offers o ON o.current_version_id = ov.id
       WHERE o.id = ?
       LIMIT 1`
    )
    .bind(args.offerId)
    .first<VersionCaps>();

  if (!ver) return { ok: true };

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

    // Upsert counter with limit_value
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

    // Atomic increment only if room remains
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

    const changes = result.meta?.changes ?? 0;
    if (changes === 0) {
      return {
        ok: false,
        reason: "cap_reached",
        capType: c.capType,
      };
    }
  }

  return { ok: true };
}

/** Pause offer when any lifetime/day counter is exhausted */
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
         AND cap_type IN ('DAILY_CONVERSION', 'TOTAL_CONVERSION', 'BUDGET')
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
