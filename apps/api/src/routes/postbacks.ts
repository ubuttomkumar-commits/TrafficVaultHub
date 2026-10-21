/**
 * S2S postback intake — existing conversions / clicks / offer_versions.
 * Never trusts advertiser-supplied commission; uses offer_version amounts.
 * Idempotent via (organization_id, idempotency_key).
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { pauseOfferIfCapsExhausted, reserveConversionCap } from "../lib/caps";
import { rateLimit } from "../middleware/rate-limit";

export const postbackRoutes = new Hono<{ Bindings: Env }>();
postbackRoutes.use("*", rateLimit({ keyPrefix: "postback", limit: 120, windowSeconds: 60 }));

type ClickRow = {
  click_id: string;
  organization_id: string;
  offer_id: string;
  offer_version_id: string;
  offer_organization_id: string;
  affiliate_organization_id: string;
  clicked_at: string;
  destination_url: string | null;
  payout_type: string;
  currency: string;
  affiliate_commission_minor: number;
  conversion_event: string;
  attribution_window_seconds: number;
  offer_status: string;
};

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message)
  );
  return [...new Uint8Array(sig)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

/**
 * GET or POST /api/v1/postbacks/s2s
 * Query/body: click_id, external_conversion_id, event?, transaction_id?,
 *             sale_amount_minor?, occurred_at?, sig?, ts?
 */
async function handlePostback(c: {
  req: {
    method: string;
    query: (k: string) => string | undefined;
    json: () => Promise<Record<string, unknown>>;
    header: (k: string) => string | undefined;
  };
  env: Env;
  get: (k: "correlationId") => string;
  json: (body: unknown, status?: number) => Response;
}) {
  const correlationId = c.get("correlationId");

  let params: Record<string, string | undefined> = {};
  if (c.req.method === "POST") {
    try {
      const body = await c.req.json();
      for (const [k, v] of Object.entries(body)) {
        if (v != null) params[k] = String(v);
      }
    } catch {
      /* fall through to query */
    }
  }
  // Query overrides / fills
  for (const key of [
    "click_id",
    "external_conversion_id",
    "event",
    "transaction_id",
    "sale_amount_minor",
    "occurred_at",
    "sig",
    "ts",
    "idempotency_key",
  ]) {
    const q = c.req.query(key);
    if (q) params[key] = q;
  }

  const clickId = params.click_id?.trim();
  const externalId = params.external_conversion_id?.trim();
  if (!clickId || !externalId) {
    return c.json(
      {
        error: {
          code: "missing_params",
          message: "click_id and external_conversion_id are required",
          correlationId,
        },
      },
      400
    );
  }

  // Optional HMAC when POSTBACK_HMAC_SECRET is configured
  const hmacSecret = (c.env as Env & { POSTBACK_HMAC_SECRET?: string })
    .POSTBACK_HMAC_SECRET;
  if (hmacSecret) {
    const ts = params.ts ?? "";
    const sig = params.sig ?? "";
    const payload = `${clickId}.${externalId}.${ts}`;
    const expected = await hmacHex(hmacSecret, payload);
    if (!sig || !timingSafeEqual(sig.toLowerCase(), expected.toLowerCase())) {
      return c.json(
        {
          error: {
            code: "invalid_signature",
            message: "Postback signature verification failed",
            correlationId,
          },
        },
        401
      );
    }
    if (ts) {
      const t = Number(ts) * (ts.length <= 10 ? 1000 : 1);
      if (Math.abs(Date.now() - t) > 15 * 60 * 1000) {
        return c.json(
          {
            error: {
              code: "stale_timestamp",
              message: "Postback timestamp outside allowed window",
              correlationId,
            },
          },
          401
        );
      }
    }
  }

  const click = await c.env.DB.prepare(
    `SELECT cl.id AS click_id, cl.organization_id, cl.offer_id, cl.offer_version_id,
            cl.offer_organization_id, cl.organization_id AS affiliate_organization_id,
            cl.clicked_at, cl.destination_url,
            ov.payout_type, ov.currency, ov.affiliate_commission_minor,
            ov.conversion_event, ov.attribution_window_seconds,
            o.status AS offer_status
     FROM clicks cl
     INNER JOIN offers o ON o.id = cl.offer_id
     INNER JOIN offer_versions ov ON ov.id = cl.offer_version_id
     WHERE cl.id = ?
     LIMIT 1`
  )
    .bind(clickId)
    .first<ClickRow>();

  if (!click) {
    return c.json(
      {
        error: {
          code: "unknown_click",
          message: "Click not found",
          correlationId,
        },
      },
      404
    );
  }

  // Attribution window
  const clickedAt = new Date(click.clicked_at).getTime();
  const windowMs = (click.attribution_window_seconds || 2592000) * 1000;
  const occurredAt = params.occurred_at
    ? new Date(params.occurred_at).toISOString()
    : new Date().toISOString();
  const occurredMs = new Date(occurredAt).getTime();
  if (Number.isNaN(occurredMs) || occurredMs < clickedAt) {
    return c.json(
      {
        error: {
          code: "invalid_occurred_at",
          message: "occurred_at is invalid or before click",
          correlationId,
        },
      },
      400
    );
  }
  if (occurredMs - clickedAt > windowMs) {
    return rejectConversion(c, {
      click,
      externalId,
      correlationId,
      reason: "attribution_window_expired",
      event: params.event || click.conversion_event,
      occurredAt,
      transactionId: params.transaction_id,
    });
  }

  if (click.offer_status !== "LIVE") {
    return rejectConversion(c, {
      click,
      externalId,
      correlationId,
      reason: "offer_not_live",
      event: params.event || click.conversion_event,
      occurredAt,
      transactionId: params.transaction_id,
    });
  }

  const eventName = (params.event || click.conversion_event).trim();
  if (eventName !== click.conversion_event) {
    // Soft reject mismatched event — still record as rejected for audit
    return rejectConversion(c, {
      click,
      externalId,
      correlationId,
      reason: "invalid_event",
      event: eventName,
      occurredAt,
      transactionId: params.transaction_id,
    });
  }

  const idempotencyKey =
    params.idempotency_key?.trim() ||
    `s2s:${click.offer_organization_id}:${externalId}`;

  // Existing by idempotency
  const existing = await c.env.DB.prepare(
    `SELECT id, status, lifecycle_status FROM conversions
     WHERE organization_id = ? AND idempotency_key = ?
     LIMIT 1`
  )
    .bind(click.offer_organization_id, idempotencyKey)
    .first<{ id: string; status: string; lifecycle_status: string }>();

  if (existing) {
    return c.json({
      data: {
        conversionId: existing.id,
        status: existing.status,
        lifecycleStatus: existing.lifecycle_status,
        duplicate: true,
      },
      correlationId,
    });
  }

  // Server-side commission — never from advertiser payload
  const commissionMinor = click.affiliate_commission_minor;
  const commissionCurrency = click.currency;
  let saleMinor: number | null = null;
  if (params.sale_amount_minor != null) {
    const n = Number(params.sale_amount_minor);
    if (Number.isFinite(n) && n >= 0) saleMinor = Math.floor(n);
  }

  const conversionId = crypto.randomUUID();
  const historyId = crypto.randomUUID();

  const cap = await reserveConversionCap(c.env, {
    offerId: click.offer_id,
    organizationId: click.offer_organization_id,
    commissionMinor,
    currency: commissionCurrency,
  });
  if (!cap.ok) {
    return rejectConversion(c, {
      click,
      externalId,
      correlationId,
      reason: "cap_reached",
      event: eventName,
      occurredAt,
      transactionId: params.transaction_id,
    });
  }


  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO conversions (
           id, organization_id, offer_id, offer_version_id, click_id,
           affiliate_organization_id, external_conversion_id, transaction_id,
           conversion_event, status, source, sale_amount_minor, currency,
           occurred_at, request_id, lifecycle_status, idempotency_key,
           commission_amount_minor, commission_currency
         ) VALUES (
           ?, ?, ?, ?, ?,
           ?, ?, ?,
           ?, 'PENDING', 'S2S_POSTBACK', ?, ?,
           ?, ?, 'PENDING', ?,
           ?, ?
         )`
      ).bind(
        conversionId,
        click.offer_organization_id,
        click.offer_id,
        click.offer_version_id,
        click.click_id,
        click.organization_id,
        externalId,
        params.transaction_id ?? null,
        eventName,
        saleMinor,
        saleMinor != null ? commissionCurrency : null,
        occurredAt,
        correlationId,
        idempotencyKey,
        commissionMinor,
        commissionCurrency
      ),
      c.env.DB.prepare(
        `INSERT INTO conversion_status_history (
           id, organization_id, conversion_id, from_status, to_status,
           actor_type, reason_code, note, request_id
         ) VALUES (?, ?, ?, NULL, 'PENDING', 'SYSTEM', 'postback_accepted', ?, ?)`
      ).bind(
        historyId,
        click.offer_organization_id,
        conversionId,
        "S2S postback validated; commission from offer_version",
        correlationId
      ),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      const again = await c.env.DB.prepare(
        `SELECT id, status, lifecycle_status FROM conversions
         WHERE organization_id = ? AND idempotency_key = ? LIMIT 1`
      )
        .bind(click.offer_organization_id, idempotencyKey)
        .first<{ id: string; status: string; lifecycle_status: string }>();
      if (again) {
        return c.json({
          data: {
            conversionId: again.id,
            status: again.status,
            lifecycleStatus: again.lifecycle_status,
            duplicate: true,
          },
          correlationId,
        });
      }
    }
    console.error(`[${correlationId}] postback insert failed`, err);
    return c.json(
      {
        error: {
          code: "postback_failed",
          message: "Unable to record conversion",
          correlationId,
        },
      },
      503
    );
  }

  // Optional queue notify (non-fatal)
  try {
    if (c.env.CONVERSION_QUEUE) {
      await c.env.CONVERSION_QUEUE.send({
        type: "conversion.received",
        conversionId,
        organizationId: click.offer_organization_id,
        offerId: click.offer_id,
        correlationId,
      });
    }
  } catch {
    /* queue optional */
  }

  await pauseOfferIfCapsExhausted(
    c.env.DB,
    click.offer_id,
    click.offer_organization_id,
    correlationId
  );

  return c.json(
    {
      data: {
        conversionId,
        status: "PENDING",
        lifecycleStatus: "PENDING",
        commissionAmountMinor: commissionMinor,
        commissionCurrency,
        duplicate: false,
        note: "Commission taken from offer_version; advertiser payout fields ignored",
      },
      correlationId,
    },
    201
  );
}

async function rejectConversion(
  c: {
    env: Env;
    json: (body: unknown, status?: number) => Response;
  },
  args: {
    click: ClickRow;
    externalId: string;
    correlationId: string;
    reason: string;
    event: string;
    occurredAt: string;
    transactionId?: string;
  }
) {
  const { click, externalId, correlationId, reason, event, occurredAt } = args;
  const idempotencyKey = `s2s:${click.offer_organization_id}:${externalId}`;

  const existing = await c.env.DB.prepare(
    `SELECT id, status, lifecycle_status FROM conversions
     WHERE organization_id = ? AND idempotency_key = ? LIMIT 1`
  )
    .bind(click.offer_organization_id, idempotencyKey)
    .first<{ id: string; status: string; lifecycle_status: string }>();

  if (existing) {
    return c.json({
      data: {
        conversionId: existing.id,
        status: existing.status,
        lifecycleStatus: existing.lifecycle_status,
        duplicate: true,
      },
      correlationId,
    });
  }

  const conversionId = crypto.randomUUID();
  const historyId = crypto.randomUUID();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO conversions (
           id, organization_id, offer_id, offer_version_id, click_id,
           affiliate_organization_id, external_conversion_id, transaction_id,
           conversion_event, status, source, occurred_at, request_id,
           lifecycle_status, idempotency_key,
           commission_amount_minor, commission_currency
         ) VALUES (
           ?, ?, ?, ?, ?,
           ?, ?, ?,
           ?, 'REJECTED', 'S2S_POSTBACK', ?, ?,
           'REJECTED', ?,
           NULL, NULL
         )`
      ).bind(
        conversionId,
        click.offer_organization_id,
        click.offer_id,
        click.offer_version_id,
        click.click_id,
        click.organization_id,
        externalId,
        args.transactionId ?? null,
        event,
        occurredAt,
        correlationId,
        idempotencyKey
      ),
      c.env.DB.prepare(
        `INSERT INTO conversion_status_history (
           id, organization_id, conversion_id, from_status, to_status,
           actor_type, reason_code, note, request_id
         ) VALUES (?, ?, ?, NULL, 'REJECTED', 'SYSTEM', ?, ?, ?)`
      ).bind(
        historyId,
        click.offer_organization_id,
        conversionId,
        reason,
        reason,
        correlationId
      ),
    ]);
  } catch (err) {
    console.error(`[${correlationId}] reject insert failed`, err);
  }

  return c.json(
    {
      data: {
        conversionId,
        status: "REJECTED",
        lifecycleStatus: "REJECTED",
        reasonCode: reason,
        duplicate: false,
      },
      correlationId,
    },
    200
  );
}

postbackRoutes.get("/s2s", (c) => handlePostback(c as never));
postbackRoutes.post("/s2s", (c) => handlePostback(c as never));
