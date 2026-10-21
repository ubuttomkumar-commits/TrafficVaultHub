/**
 * Per-offer Durable Object for concurrency-safe conversion/budget caps.
 * Authoritative in-memory counters; flushes to D1 offer_cap_counters after reserve.
 */

export type CapLimits = {
  dailyConversion: number | null;
  totalConversion: number | null;
  budgetMinor: number | null;
  currency: string;
};

type CounterState = {
  dailyKey: string;
  dailyCount: number;
  totalCount: number;
  budgetSpent: number;
  limits: CapLimits;
  initialized: boolean;
};

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

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

    if (request.method === "POST" && path === "/init") {
      const body = (await request.json()) as {
        limits: CapLimits;
        offerId: string;
        organizationId: string;
      };
      await this.ensureLoaded(body.offerId, body.organizationId, body.limits);
      return Response.json({ ok: true, counters: this.snapshot() });
    }

    if (request.method === "POST" && path === "/reserve") {
      const body = (await request.json()) as {
        offerId: string;
        organizationId: string;
        limits: CapLimits;
        commissionMinor: number;
      };
      await this.ensureLoaded(body.offerId, body.organizationId, body.limits);
      const result = this.tryReserve(body.commissionMinor);
      if (result.ok) {
        // Persist after successful in-memory reserve (best-effort flush)
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
      limits: this.counters.limits,
    };
  }

  private async ensureLoaded(
    offerId: string,
    organizationId: string,
    limits: CapLimits
  ) {
    if (this.counters?.initialized) {
      // Roll daily key if date changed
      const today = utcDayKey();
      if (this.counters.dailyKey !== today) {
        this.counters.dailyKey = today;
        this.counters.dailyCount = 0;
      }
      this.counters.limits = limits;
      return;
    }

    const stored = await this.state.storage.get<CounterState>("counters");
    const today = utcDayKey();

    if (stored) {
      this.counters = stored;
      if (this.counters.dailyKey !== today) {
        this.counters.dailyKey = today;
        this.counters.dailyCount = 0;
      }
      this.counters.limits = limits;
      this.counters.initialized = true;
    } else {
      // Hydrate from D1 if rows exist
      let dailyCount = 0;
      let totalCount = 0;
      let budgetSpent = 0;
      try {
        const rows = await this.env.DB.prepare(
          `SELECT cap_type, period_key, current_value FROM offer_cap_counters
           WHERE offer_id = ? AND cap_type IN ('DAILY_CONVERSION','TOTAL_CONVERSION','BUDGET')`
        )
          .bind(offerId)
          .all<{ cap_type: string; period_key: string; current_value: number }>();
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
        }
      } catch {
        /* cold start without D1 rows is fine */
      }

      this.counters = {
        dailyKey: today,
        dailyCount,
        totalCount,
        budgetSpent,
        limits,
        initialized: true,
      };
    }

    await this.state.storage.put("counters", this.counters);
  }

  private tryReserve(commissionMinor: number): {
    ok: boolean;
    reason?: string;
    capType?: string;
    counters?: ReturnType<OfferCapDO["snapshot"]>;
  } {
    if (!this.counters) {
      return { ok: false, reason: "not_initialized" };
    }
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
    // fire-and-forget storage put
    void this.state.storage.put("counters", this.counters);

    return { ok: true, counters: this.snapshot() };
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
    ];

    for (const op of ops) {
      if (op.limit == null) continue;
      await this.env.DB.prepare(
        `INSERT INTO offer_cap_counters (
           id, offer_id, organization_id, cap_type, period_key, currency,
           limit_value, current_value, exhausted_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?,
           CASE WHEN ? >= ? THEN strftime('%Y-%m-%dT%H:%M:%fZ','now') ELSE NULL END)
         ON CONFLICT(offer_id, cap_type, period_key) DO UPDATE SET
           current_value = excluded.current_value,
           limit_value = excluded.limit_value,
           exhausted_at = CASE
             WHEN excluded.current_value >= excluded.limit_value
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
          op.value,
          op.limit
        )
        .run();
    }
  }
}
