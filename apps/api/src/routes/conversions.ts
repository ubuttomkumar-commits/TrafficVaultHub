/**
 * Conversion approve → ledger post using existing journal_entries + ledger_accounts.
 * Idempotent: re-approve of LEDGER_POSTED returns existing journal reference.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";

export const conversionRoutes = new Hono<{ Bindings: Env }>();

conversionRoutes.use("*", requireAuth());

type ConvRow = {
  id: string;
  organization_id: string;
  offer_id: string;
  affiliate_organization_id: string | null;
  status: string;
  lifecycle_status: string;
  commission_amount_minor: number | null;
  commission_currency: string | null;
  external_conversion_id: string;
  conversion_event: string;
};

async function isPlatformOperator(
  db: D1Database,
  userId: string
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT 1 AS ok
       FROM organization_members om
       INNER JOIN organizations o ON o.id = om.organization_id
       INNER JOIN roles r ON r.id = om.role_id
       WHERE om.user_id = ? AND om.status = 'ACTIVE'
         AND o.type = 'PLATFORM' AND o.deleted_at IS NULL
         AND r.id IN (
           '00000000-0000-4000-8000-000000000101',
           '00000000-0000-4000-8000-000000000102',
           '00000000-0000-4000-8000-000000000103'
         )
       LIMIT 1`
    )
    .bind(userId)
    .first<{ ok: number }>();
  return Boolean(row?.ok);
}

async function ensurePayableAccount(
  db: D1Database,
  orgId: string,
  currency: string
): Promise<string> {
  const existing = await db
    .prepare(
      `SELECT id FROM ledger_accounts
       WHERE organization_id = ? AND code = 'AFFILIATE_PAYABLE' AND currency = ?
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
       ) VALUES (?, ?, 'AFFILIATE_PAYABLE', 'LIABILITY', ?, 'Affiliate payable', 'OPEN')`
    )
    .bind(id, orgId, currency)
    .run();
  return id;
}

/**
 * POST /api/v1/conversions/:id/approve
 * Platform ops only. Posts CONVERSION_COMMISSION journal for affiliate org.
 */
conversionRoutes.post("/:id/approve", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const conversionId = c.req.param("id");

  if (!(await isPlatformOperator(c.env.DB, user.id))) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Platform operator role required",
          correlationId,
        },
      },
      403
    );
  }

  const conv = await c.env.DB.prepare(
    `SELECT id, organization_id, offer_id, affiliate_organization_id,
            status, lifecycle_status, commission_amount_minor, commission_currency,
            external_conversion_id, conversion_event
     FROM conversions WHERE id = ? LIMIT 1`
  )
    .bind(conversionId)
    .first<ConvRow>();

  if (!conv) {
    return c.json(
      {
        error: {
          code: "not_found",
          message: "Conversion not found",
          correlationId,
        },
      },
      404
    );
  }

  if (
    conv.lifecycle_status === "LEDGER_POSTED" ||
    conv.lifecycle_status === "EARNED" ||
    conv.lifecycle_status === "PAYOUT_ELIGIBLE" ||
    conv.lifecycle_status === "PAID"
  ) {
    const prior = await c.env.DB.prepare(
      `SELECT id FROM journal_entries
       WHERE reference_type = 'CONVERSION' AND reference_id = ?
         AND journal_type = 'CONVERSION_COMMISSION'
       LIMIT 1`
    )
      .bind(conversionId)
      .first<{ id: string }>();
    return c.json({
      data: {
        conversionId,
        lifecycleStatus: conv.lifecycle_status,
        journalId: prior?.id ?? null,
        alreadyPosted: true,
      },
      correlationId,
    });
  }

  if (
    conv.lifecycle_status === "REJECTED" ||
    conv.lifecycle_status === "REVERSED" ||
    conv.lifecycle_status === "FRAUD_REVIEW"
  ) {
    return c.json(
      {
        error: {
          code: "invalid_state",
          message: `Cannot approve conversion in lifecycle ${conv.lifecycle_status}`,
          correlationId,
        },
      },
      409
    );
  }

  if (!conv.affiliate_organization_id) {
    return c.json(
      {
        error: {
          code: "missing_affiliate",
          message: "Conversion has no affiliate organization",
          correlationId,
        },
      },
      422
    );
  }

  const amount = conv.commission_amount_minor;
  const currency = conv.commission_currency;
  if (amount == null || amount <= 0 || !currency || currency.length !== 3) {
    return c.json(
      {
        error: {
          code: "missing_commission",
          message: "Server-side commission amount/currency required before ledger post",
          correlationId,
        },
      },
      422
    );
  }

  const idempotencyKey = `ledger:commission:${conversionId}`;
  const existingJournal = await c.env.DB.prepare(
    `SELECT id FROM journal_entries WHERE idempotency_key = ? LIMIT 1`
  )
    .bind(idempotencyKey)
    .first<{ id: string }>();

  if (existingJournal) {
    await c.env.DB.prepare(
      `UPDATE conversions
       SET status = 'PENDING', lifecycle_status = 'LEDGER_POSTED',
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`
    )
      .bind(conversionId)
      .run();
    return c.json({
      data: {
        conversionId,
        lifecycleStatus: "LEDGER_POSTED",
        journalId: existingJournal.id,
        alreadyPosted: true,
      },
      correlationId,
    });
  }

  await ensurePayableAccount(
    c.env.DB,
    conv.affiliate_organization_id,
    currency.toUpperCase()
  );

  const journalId = crypto.randomUUID();
  const historyId = crypto.randomUUID();
  const fromStatus = conv.lifecycle_status;
  const postedAt = new Date().toISOString();

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO journal_entries (
           id, organization_id, journal_type, currency, total_minor,
           reference_type, reference_id, idempotency_key, actor_type,
           posted_by_user_id, description, request_id, posted_at
         ) VALUES (
           ?, ?, 'CONVERSION_COMMISSION', ?, ?,
           'CONVERSION', ?, ?, 'PLATFORM',
           ?, ?, ?, ?
         )`
      ).bind(
        journalId,
        conv.affiliate_organization_id,
        currency.toUpperCase(),
        amount,
        conversionId,
        idempotencyKey,
        user.id,
        `Commission for conversion ${conv.external_conversion_id} (${conv.conversion_event})`,
        correlationId,
        postedAt
      ),
      c.env.DB.prepare(
        `UPDATE conversions
         SET status = 'PENDING',
             lifecycle_status = 'LEDGER_POSTED',
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?`
      ).bind(conversionId),
      c.env.DB.prepare(
        `INSERT INTO conversion_status_history (
           id, organization_id, conversion_id, from_status, to_status,
           actor_type, actor_user_id, reason_code, note, request_id
         ) VALUES (?, ?, ?, ?, 'LEDGER_POSTED', 'PLATFORM', ?, 'approved_ledger_posted', ?, ?)`
      ).bind(
        historyId,
        conv.organization_id,
        conversionId,
        fromStatus,
        user.id,
        `Journal ${journalId} amount ${amount} ${currency}`,
        correlationId
      ),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNIQUE") || msg.includes("unique")) {
      const j = await c.env.DB.prepare(
        `SELECT id FROM journal_entries WHERE idempotency_key = ? LIMIT 1`
      )
        .bind(idempotencyKey)
        .first<{ id: string }>();
      return c.json({
        data: {
          conversionId,
          lifecycleStatus: "LEDGER_POSTED",
          journalId: j?.id ?? null,
          alreadyPosted: true,
        },
        correlationId,
      });
    }
    console.error(`[${correlationId}] approve/ledger failed`, err);
    return c.json(
      {
        error: {
          code: "ledger_post_failed",
          message: "Unable to post commission journal",
          correlationId,
        },
      },
      503
    );
  }

  return c.json({
    data: {
      conversionId,
      lifecycleStatus: "LEDGER_POSTED",
      journalId,
      commissionAmountMinor: amount,
      commissionCurrency: currency.toUpperCase(),
      affiliateOrganizationId: conv.affiliate_organization_id,
      alreadyPosted: false,
      note: "Pending conversions are not payable until ledger post; this entry is CONVERSION_COMMISSION only",
    },
    correlationId,
  });
});

/**
 * POST /api/v1/conversions/:id/reject
 * Platform ops — mark REJECTED without ledger credit.
 */
conversionRoutes.post("/:id/reject", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const conversionId = c.req.param("id");

  if (!(await isPlatformOperator(c.env.DB, user.id))) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Platform operator role required",
          correlationId,
        },
      },
      403
    );
  }

  let reason = "manual_reject";
  let note: string | null = null;
  try {
    const body = await c.req.json<{ reasonCode?: string; note?: string }>();
    if (body.reasonCode) reason = body.reasonCode.slice(0, 64);
    if (body.note) note = body.note.slice(0, 1000);
  } catch {
    /* optional body */
  }

  const conv = await c.env.DB.prepare(
    `SELECT id, organization_id, lifecycle_status FROM conversions WHERE id = ? LIMIT 1`
  )
    .bind(conversionId)
    .first<{ id: string; organization_id: string; lifecycle_status: string }>();

  if (!conv) {
    return c.json(
      {
        error: {
          code: "not_found",
          message: "Conversion not found",
          correlationId,
        },
      },
      404
    );
  }

  if (
    conv.lifecycle_status === "LEDGER_POSTED" ||
    conv.lifecycle_status === "PAID" ||
    conv.lifecycle_status === "EARNED"
  ) {
    return c.json(
      {
        error: {
          code: "invalid_state",
          message: "Use reversal flow for ledger-posted conversions",
          correlationId,
        },
      },
      409
    );
  }

  const historyId = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare(
      `UPDATE conversions
       SET status = 'REJECTED', lifecycle_status = 'REJECTED',
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`
    ).bind(conversionId),
    c.env.DB.prepare(
      `INSERT INTO conversion_status_history (
         id, organization_id, conversion_id, from_status, to_status,
         actor_type, actor_user_id, reason_code, note, request_id
       ) VALUES (?, ?, ?, ?, 'REJECTED', 'PLATFORM', ?, ?, ?, ?)`
    ).bind(
      historyId,
      conv.organization_id,
      conversionId,
      conv.lifecycle_status,
      user.id,
      reason,
      note,
      correlationId
    ),
  ]);

  return c.json({
    data: {
      conversionId,
      lifecycleStatus: "REJECTED",
      reasonCode: reason,
    },
    correlationId,
  });
});

/**
 * POST /api/v1/conversions/:id/reverse
 * Platform ops — reverse a LEDGER_POSTED (or later earned) conversion.
 * Posts CONVERSION_REVERSAL journal linked via reverses_journal_id.
 */
conversionRoutes.post("/:id/reverse", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const conversionId = c.req.param("id");

  if (!(await isPlatformOperator(c.env.DB, user.id))) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Platform operator role required",
          correlationId,
        },
      },
      403
    );
  }

  const ALLOWED = new Set(["REFUND","CHARGEBACK","FRAUD_CONFIRMED","ADVERTISER_DISPUTE","DUPLICATE_DETECTED_LATE","COMPLIANCE_VIOLATION","MANUAL_CORRECTION"]);
  let reason = "MANUAL_CORRECTION";
  let note: string | null = null;
  try {
    const body = await c.req.json<{ reasonCode?: string; note?: string }>();
    if (body.reasonCode && ALLOWED.has(body.reasonCode)) reason = body.reasonCode;
    else if (body.reasonCode) reason = "MANUAL_CORRECTION";
    if (body.note) note = body.note.slice(0, 1000);
  } catch {
    /* optional */
  }

  const conv = await c.env.DB.prepare(
    `SELECT id, organization_id, affiliate_organization_id, lifecycle_status,
            commission_amount_minor, commission_currency, external_conversion_id
     FROM conversions WHERE id = ? LIMIT 1`
  )
    .bind(conversionId)
    .first<{
      id: string;
      organization_id: string;
      affiliate_organization_id: string | null;
      lifecycle_status: string;
      commission_amount_minor: number | null;
      commission_currency: string | null;
      external_conversion_id: string;
    }>();

  if (!conv) {
    return c.json(
      {
        error: {
          code: "not_found",
          message: "Conversion not found",
          correlationId,
        },
      },
      404
    );
  }

  if (conv.lifecycle_status === "REVERSED") {
    const prior = await c.env.DB.prepare(
      `SELECT id FROM journal_entries
       WHERE reference_type = 'CONVERSION_REVERSAL' AND reference_id = ?
         AND journal_type = 'CONVERSION_REVERSAL'
       LIMIT 1`
    )
      .bind(conversionId)
      .first<{ id: string }>();
    return c.json({
      data: {
        conversionId,
        lifecycleStatus: "REVERSED",
        journalId: prior?.id ?? null,
        alreadyReversed: true,
      },
      correlationId,
    });
  }

  const reversible = new Set([
    "LEDGER_POSTED",
    "EARNED",
    "PAYOUT_ELIGIBLE",
  ]);
  if (!reversible.has(conv.lifecycle_status)) {
    return c.json(
      {
        error: {
          code: "invalid_state",
          message: `Cannot reverse conversion in lifecycle ${conv.lifecycle_status}`,
          correlationId,
        },
      },
      409
    );
  }

  if (!conv.affiliate_organization_id) {
    return c.json(
      {
        error: {
          code: "missing_affiliate",
          message: "Conversion has no affiliate organization",
          correlationId,
        },
      },
      422
    );
  }

  const original = await c.env.DB.prepare(
    `SELECT id, currency, total_minor FROM journal_entries
     WHERE reference_type = 'CONVERSION' AND reference_id = ?
       AND journal_type = 'CONVERSION_COMMISSION'
     LIMIT 1`
  )
    .bind(conversionId)
    .first<{ id: string; currency: string; total_minor: number }>();

  if (!original) {
    return c.json(
      {
        error: {
          code: "missing_commission_journal",
          message: "No CONVERSION_COMMISSION journal found to reverse",
          correlationId,
        },
      },
      422
    );
  }

  const amount = original.total_minor;
  const currency = original.currency;
  const idempotencyKey = `ledger:reversal:${conversionId}`;

  const existingReversal = await c.env.DB.prepare(
    `SELECT id FROM journal_entries WHERE idempotency_key = ? LIMIT 1`
  )
    .bind(idempotencyKey)
    .first<{ id: string }>();

  if (existingReversal) {
    await c.env.DB.prepare(
      `UPDATE conversions
       SET lifecycle_status = 'REVERSED',
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
       WHERE id = ?`
    )
      .bind(conversionId)
      .run();
    return c.json({
      data: {
        conversionId,
        lifecycleStatus: "REVERSED",
        journalId: existingReversal.id,
        alreadyReversed: true,
      },
      correlationId,
    });
  }

  const journalId = crypto.randomUUID();
  const historyId = crypto.randomUUID();
  const revHistoryId = crypto.randomUUID();
  const postedAt = new Date().toISOString();
  const fromStatus = conv.lifecycle_status;

  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        `INSERT INTO journal_entries (
           id, organization_id, journal_type, currency, total_minor,
           reference_type, reference_id, reverses_journal_id,
           idempotency_key, actor_type, posted_by_user_id,
           description, request_id, posted_at
         ) VALUES (
           ?, ?, 'CONVERSION_REVERSAL', ?, ?,
           'CONVERSION_REVERSAL', ?, ?,
           ?, 'PLATFORM', ?,
           ?, ?, ?
         )`
      ).bind(
        journalId,
        conv.affiliate_organization_id,
        currency,
        amount,
        conversionId,
        original.id,
        idempotencyKey,
        user.id,
        `Reversal of commission for ${conv.external_conversion_id}: ${reason}`,
        correlationId,
        postedAt
      ),
      c.env.DB.prepare(
        `UPDATE conversions
         SET lifecycle_status = 'REVERSED',
             updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
         WHERE id = ?`
      ).bind(conversionId),
      c.env.DB.prepare(
        `INSERT INTO conversion_status_history (
           id, organization_id, conversion_id, from_status, to_status,
           actor_type, actor_user_id, reason_code, note, request_id
         ) VALUES (?, ?, ?, ?, 'REVERSED', 'PLATFORM', ?, ?, ?, ?)`
      ).bind(
        historyId,
        conv.organization_id,
        conversionId,
        fromStatus,
        user.id,
        reason,
        note ?? `Reversed journal ${original.id} → ${journalId}`,
        correlationId
      ),
      c.env.DB.prepare(
        `INSERT INTO conversion_reversals (
           id, organization_id, conversion_id, reason_code,
           amount_minor, currency, reversed_by_user_id, actor_type, note, request_id
         ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PLATFORM', ?, ?)`
      ).bind(
        revHistoryId,
        conv.organization_id,
        conversionId,
        reason,
        amount,
        currency,
        user.id,
        note,
        correlationId
      ),
    ]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // conversion_reversals table may have different columns — retry without it
    if (msg.includes("conversion_reversals") || msg.includes("no such table") || msg.includes("has no column")) {
      try {
        await c.env.DB.batch([
          c.env.DB.prepare(
            `INSERT INTO journal_entries (
               id, organization_id, journal_type, currency, total_minor,
               reference_type, reference_id, reverses_journal_id,
               idempotency_key, actor_type, posted_by_user_id,
               description, request_id, posted_at
             ) VALUES (
               ?, ?, 'CONVERSION_REVERSAL', ?, ?,
               'CONVERSION_REVERSAL', ?, ?,
               ?, 'PLATFORM', ?,
               ?, ?, ?
             )`
          ).bind(
            journalId,
            conv.affiliate_organization_id,
            currency,
            amount,
            conversionId,
            original.id,
            idempotencyKey,
            user.id,
            `Reversal of commission for ${conv.external_conversion_id}: ${reason}`,
            correlationId,
            postedAt
          ),
          c.env.DB.prepare(
            `UPDATE conversions
             SET lifecycle_status = 'REVERSED',
                 updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
             WHERE id = ?`
          ).bind(conversionId),
          c.env.DB.prepare(
            `INSERT INTO conversion_status_history (
               id, organization_id, conversion_id, from_status, to_status,
               actor_type, actor_user_id, reason_code, note, request_id
             ) VALUES (?, ?, ?, ?, 'REVERSED', 'PLATFORM', ?, ?, ?, ?)`
          ).bind(
            historyId,
            conv.organization_id,
            conversionId,
            fromStatus,
            user.id,
            reason,
            note ?? `Reversed journal ${original.id} → ${journalId}`,
            correlationId
          ),
        ]);
      } catch (err2) {
        console.error(`[${correlationId}] reverse failed`, err2);
        return c.json(
          {
            error: {
              code: "reversal_failed",
              message: "Unable to post reversal journal",
              correlationId,
            },
          },
          503
        );
      }
    } else if (msg.includes("UNIQUE") || msg.includes("unique")) {
      const j = await c.env.DB.prepare(
        `SELECT id FROM journal_entries WHERE idempotency_key = ? LIMIT 1`
      )
        .bind(idempotencyKey)
        .first<{ id: string }>();
      return c.json({
        data: {
          conversionId,
          lifecycleStatus: "REVERSED",
          journalId: j?.id ?? null,
          alreadyReversed: true,
        },
        correlationId,
      });
    } else {
      console.error(`[${correlationId}] reverse failed`, err);
      return c.json(
        {
          error: {
            code: "reversal_failed",
            message: "Unable to post reversal journal",
            correlationId,
          },
        },
        503
      );
    }
  }

  return c.json({
    data: {
      conversionId,
      lifecycleStatus: "REVERSED",
      journalId,
      reversesJournalId: original.id,
      amountMinor: amount,
      currency,
      alreadyReversed: false,
      reasonCode: reason,
    },
    correlationId,
  });
});
