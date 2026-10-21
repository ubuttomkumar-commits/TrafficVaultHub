/**
 * Per-offer Durable Object for concurrency-safe conversion, budget, and click caps.
 * Authoritative in-memory counters; flushes to D1 offer_cap_counters after reserve.
 */

export type CapLimits = {
  dailyConversion: number | null;
  totalConversion: number | null;
  budgetMinor: number | null;
  dailyClick: number | null;
  totalClick: number | null;
  currency: string;
};

type CounterState = {
  dailyKey: string;
  dailyCount: number;
  totalCount: number;
  budgetSpent: number;
  dailyClickCount: number;
  totalClickCount: number;
  limits: CapLimits;
  initialized: boolean;
};

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_LIMITS: CapLimits = {
  dailyConversion: null,
  totalConversion: null,
  budgetMinor: null,
  dailyClick: null,
  totalClick: null,
  currency: "USD",
};

export class OfferCapDO implements DurableObject {
  private state: DurableObjectState;
  private env: { DB: D1Database };
  private counters: CounterState | null = null;

  constructor(state: DurableObjectState, env: { DB: D1Database }) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === "POST" && path === "/reserve") {
      const body = (await request.json()) as {
        offerId: string;
        organizationId: string;
        limits: CapLimits;
        commissionMinor: number;
      };
      await this.ensureLoaded(body.offerId, body.organizationId, body.limits);
      const result = this.tryReserveConversion(body.commissionMinor);
      if (result.ok) {
        this.state.waitUntil(
          this.flushToD1(body.offerId, body.organizationId).catch((err) =>
            console.error("cap flush failed", err)
          )
        );
      }
      return Response.json(result);
    }

    if (request.method === "POST" && path === "/reserve-click") {
      const body = (await request.json()) as {
        offerId: string;
        organizationId: string;
        limits: CapLimits;
      };
      await this.ensureLoaded(body.offerId, body.organizationId, body.limits);
      const result = this.tryReserveClick();
      if (result.ok) {
        this.state.waitUntil(
          this.flushToD1(body.offerId, body.organizationId).catch((err) =>
            console.error("cap flush failed", err)
          )
        );
      }
      return Response.json(result);
    }

    if (request.method === "GET" && path === "/status") {
      if (!this.counters) {
        const stored = await this.state.storage.get<CounterState>("counters");
        this.counters = stored ?? null;
      }
      return Response.json({ counters: this.snapshot() });
    }

    return new Response("Not found", { status: 404 });
  }

  private snapshot() {
    if (!this.counters) return null;
    return {
      dailyKey: this.counters.dailyKey,
      dailyCount: this.counters.dailyCount,
      totalCount: this.counters.totalCount,
      budgetSpent: this.counters.budgetSpent,
      dailyClickCount: this.counters.dailyClickCount,
      totalClickCount: this.counters.totalClickCount,
      limits: this.counters.limits,
    };
  }

  private mergeLimits(incoming: CapLimits, existing?: CapLimits): CapLimits {
    const base = existing ?? EMPTY_LIMITS;
    return {
      dailyConversion: incoming.dailyConversion ?? base.dailyConversion,
      totalConversion: incoming.totalConversion ?? base.totalConversion,
      budgetMinor: incoming.budgetMinor ?? base.budgetMinor,
      dailyClick: incoming.dailyClick ?? base.dailyClick,
      totalClick: incoming.totalClick ?? base.totalClick,
      currency: incoming.currency || base.currency,
    };
  }

  private async ensureLoaded(
    offerId: string,
    _organizationId: string,
    limits: CapLimits
  ) {
    const today = utcDayKey();

    if (this.counters?.initialized) {
      if (this.counters.dailyKey !== today) {
        this.counters.dailyKey = today;
        this.counters.dailyCount = 0;
        this.counters.dailyClickCount = 0;
      }
      this.counters.limits = this.mergeLimits(limits, this.counters.limits);
      return;
    }

    const stored = await this.state.storage.get<CounterState>("counters");

    if (stored) {
      this.counters = {
        ...stored,
        dailyClickCount: stored.dailyClickCount ?? 0,
        totalClickCount: stored.totalClickCount ?? 0,
        limits: this.mergeLimits(
          limits,
          stored.limits
            ? { ...EMPTY_LIMITS, ...stored.limits }
            : EMPTY_LIMITS
        ),
        initialized: true,
      };
      if (this.counters.dailyKey !== today) {
        this.counters.dailyKey = today;
        this.counters.dailyCount = 0;
        this.counters.dailyClickCount = 0;
      }
    } else {
      let dailyCount = 0;
      let totalCount = 0;
      let budgetSpent = 0;
      let dailyClickCount = 0;
      let totalClickCount = 0;
      let dailyClickLimit: number | null = limits.dailyClick;
      let totalClickLimit: number | null = limits.totalClick;

      try {
        const rows = await this.env.DB.prepare(
          `SELECT cap_type, period_key, current_value, limit_value FROM offer_cap_counters
           WHERE offer_id = ? AND cap_type IN (
             'DAILY_CONVERSION','TOTAL_CONVERSION','BUDGET','DAILY_CLICK','TOTAL_CLICK'
           )`
        )
          .bind(offerId)
          .all<{
            cap_type: string;
            period_key: string;
            current_value: number;
            limit_value: number | null;
          }>();
        for (const r of rows.results ?? []) {
          if (r.cap_type === "DAILY_CONVERSION" && r.period_key === today) {
            dailyCount = r.current_value;
          }
          if (r.cap_type === "TOTAL_CONVERSION" && r.period_key === "lifetime") {
            totalCount = r.current_value;
          }
          if (r.cap_type === "BUDGET" && r.period_key === "lifetime") {
            budgetSpent = r.current_value;
          }
          if (r.cap_type === "DAILY_CLICK" && r.period_key === today) {
            dailyClickCount = r.current_value;
            if (r.limit_value != null) dailyClickLimit = r.limit_value;
          }
          if (r.cap_type === "TOTAL_CLICK" && r.period_key === "lifetime") {
            totalClickCount = r.current_value;
            if (r.limit_value != null) totalClickLimit = r.limit_value;
          }
        }
      } catch {
        /* cold start ok */
      }

      this.counters = {
        dailyKey: today,
        dailyCount,
        totalCount,
        budgetSpent,
        dailyClickCount,
        totalClickCount,
        limits: this.mergeLimits(
          {
            ...limits,
            dailyClick: dailyClickLimit,
            totalClick: totalClickLimit,
          },
          EMPTY_LIMITS
        ),
        initialized: true,
      };
    }

    await this.state.storage.put("counters", this.counters);
  }

  private tryReserveConversion(commissionMinor: number): {
    ok: boolean;
    reason?: string;
    capType?: string;
  } {
    if (!this.counters) return { ok: false, reason: "not_initialized" };
    const { limits } = this.counters;

    if (
      limits.dailyConversion != null &&
      this.counters.dailyCount + 1 > limits.dailyConversion
    ) {
      return { ok: false, reason: "cap_reached", capType: "DAILY_CONVERSION" };
    }
    if (
      limits.totalConversion != null &&
      this.counters.totalCount + 1 > limits.totalConversion
    ) {
      return { ok: false, reason: "cap_reached", capType: "TOTAL_CONVERSION" };
    }
    if (
      limits.budgetMinor != null &&
      this.counters.budgetSpent + commissionMinor > limits.budgetMinor
    ) {
      return { ok: false, reason: "cap_reached", capType: "BUDGET" };
    }

    this.counters.dailyCount += 1;
    this.counters.totalCount += 1;
    this.counters.budgetSpent += Math.max(0, commissionMinor);
    void this.state.storage.put("counters", this.counters);
    return { ok: true };
  }

  private tryReserveClick(): {
    ok: boolean;
    reason?: string;
    capType?: string;
  } {
    if (!this.counters) return { ok: false, reason: "not_initialized" };
    const { limits } = this.counters;

    if (
      limits.dailyClick != null &&
      this.counters.dailyClickCount + 1 > limits.dailyClick
    ) {
      return { ok: false, reason: "cap_reached", capType: "DAILY_CLICK" };
    }
    if (
      limits.totalClick != null &&
      this.counters.totalClickCount + 1 > limits.totalClick
    ) {
      return { ok: false, reason: "cap_reached", capType: "TOTAL_CLICK" };
    }

    // No click limits configured → allow
    this.counters.dailyClickCount += 1;
    this.counters.totalClickCount += 1;
    void this.state.storage.put("counters", this.counters);
    return { ok: true };
  }

  private async flushToD1(offerId: string, organizationId: string) {
    if (!this.counters) return;
    const c = this.counters;
    const ops = [
      {
        type: "DAILY_CONVERSION",
        period: c.dailyKey,
        value: c.dailyCount,
        limit: c.limits.dailyConversion,
        currency: null as string | null,
      },
      {
        type: "TOTAL_CONVERSION",
        period: "lifetime",
        value: c.totalCount,
        limit: c.limits.totalConversion,
        currency: null as string | null,
      },
      {
        type: "BUDGET",
        period: "lifetime",
        value: c.budgetSpent,
        limit: c.limits.budgetMinor,
        currency: c.limits.currency,
      },
      {
        type: "DAILY_CLICK",
        period: c.dailyKey,
        value: c.dailyClickCount,
        limit: c.limits.dailyClick,
        currency: null as string | null,
      },
      {
        type: "TOTAL_CLICK",
        period: "lifetime",
        value: c.totalClickCount,
        limit: c.limits.totalClick,
        currency: null as string | null,
      },
    ];

    for (const op of ops) {
      // Always flush counts when we have a limit OR when value > 0 for click tracking visibility
      if (op.limit == null && op.value === 0) continue;
      if (op.limit == null && !op.type.includes("CLICK")) continue;

      await this.env.DB.prepare(
        `INSERT INTO offer_cap_counters (
           id, offer_id, organization_id, cap_type, period_key, currency,
           limit_value, current_value, exhausted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?,
           CASE WHEN ? IS NOT NULL AND ? >= ? THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NULL END)
         ON CONFLICT(offer_id, cap_type, period_key) DO UPDATE SET
           current_value = excluded.current_value,
           limit_value = COALESCE(excluded.limit_value, offer_cap_counters.limit_value),
           exhausted_at = CASE
             WHEN COALESCE(excluded.limit_value, offer_cap_counters.limit_value) IS NOT NULL
              AND excluded.current_value >= COALESCE(excluded.limit_value, offer_cap_counters.limit_value)
             THEN strftime('%Y-%m-%dT%H:%M:%fZ','now')
             ELSE offer_cap_counters.exhausted_at
           END,
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')`
      )
        .bind(
          crypto.randomUUID(),
          offerId,
          organizationId,
          op.type,
          op.period,
          op.currency,
          op.limit,
          op.value,
          op.limit,
          op.value,
          op.limit
        )
        .run();
    }
  }
}
