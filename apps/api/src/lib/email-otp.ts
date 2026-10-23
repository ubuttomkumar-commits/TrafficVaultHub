/**
 * Production-grade Email OTP system for TrafficVaultHub.
 * Features:
 * - Cryptographically uniform 6-digit OTP generation
 * - Hashed storage with SHA-256
 * - Constant-time comparison
 * - Automatic rate-limiting: max 3 OTPs per 15 minutes per email
 * - Max 5 verification attempts per OTP with lockout
 * - 10-minute expiry with invalidation of prior active OTPs
 * - Multi-provider delivery: Resend API with safe dev-mode console fallback
 * - Audit-logged verification states across users, partner_applications, and verification_dimensions
 */

import type { Env } from "../env";
import { sha256Hex, constantTimeEqual } from "./crypto";

export const OTP_EXPIRY_MINUTES = 10;
export const MAX_VERIFICATION_ATTEMPTS = 5;
export const MAX_OTPS_PER_15_MINUTES = 3;

export function generateSecureOtp(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  // Guarantee uniform 6-digit integer from 100000 to 999999
  const code = 100000 + (arr[0] % 900000);
  return code.toString();
}

export async function ensureEmailOtpTable(db: D1Database): Promise<void> {
  try {
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS email_otps (
        id              TEXT PRIMARY KEY NOT NULL,
        email           TEXT NOT NULL,
        user_id         TEXT,
        application_id  TEXT,
        otp_hash        TEXT NOT NULL,
        attempts        INTEGER NOT NULL DEFAULT 0,
        max_attempts    INTEGER NOT NULL DEFAULT 5,
        expires_at      TEXT NOT NULL,
        created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        verified_at     TEXT,
        ip_address      TEXT,
        user_agent      TEXT
      )
    `).run();
  } catch (err) {
    console.warn("ensureEmailOtpTable notice:", err);
  }
}

export type EmailDeliveryResult = {
  success: boolean;
  provider: "resend" | "dev-console";
  error?: string;
};

/**
 * Transmit OTP using Resend API if configured, or development console fallback.
 */
export async function sendOtpEmail(
  env: Env,
  options: {
    to: string;
    code: string;
    applicationId?: string;
    correlationId?: string;
  }
): Promise<EmailDeliveryResult> {
  const apiKey = env.RESEND_API_KEY?.trim();
  const isProd = (env.ENVIRONMENT || "").toLowerCase() === "production";
  const fromEmail = env.EMAIL_FROM?.trim() || "TrafficVaultHub <onboarding@resend.dev>";

  if (apiKey) {
    try {
      const emailHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 24px; }
            .card { max-width: 500px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 8px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
            .brand { font-size: 20px; font-weight: 700; color: #22d3ee; margin-bottom: 20px; letter-spacing: -0.02em; }
            .heading { font-size: 18px; font-weight: 600; color: #ffffff; margin-bottom: 12px; }
            .code-box { background: #070a13; border: 1px solid #06b6d4; border-radius: 6px; padding: 18px; text-align: center; margin: 24px 0; }
            .code { font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #22d3ee; font-family: monospace; }
            .meta { font-size: 13px; color: #94a3b8; line-height: 1.5; margin-bottom: 20px; }
            .footer { font-size: 11px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px; margin-top: 24px; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="brand">TrafficVaultHub</div>
            <div class="heading">Verify Your Email Address</div>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
              Please use the one-time verification code below to confirm your email authenticity.
            </p>
            <div class="code-box">
              <div class="code">${options.code}</div>
            </div>
            <div class="meta">
              • This code expires in <strong>10 minutes</strong>.<br>
              • Never share this code with anyone. TrafficVaultHub staff will never ask for your verification code.<br>
              ${options.applicationId ? `• Associated Application Docket: <code>${options.applicationId}</code>` : ""}
            </div>
            <div class="footer">
              If you did not initiate this request, you can safely disregard this email.
            </div>
          </div>
        </body>
        </html>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [options.to],
          subject: `TrafficVaultHub Verification Code: ${options.code}`,
          html: emailHtml,
          text: `Your TrafficVaultHub email verification code is: ${options.code}. It expires in 10 minutes. If you did not request this, please ignore.`,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Resend Error ${response.status}]`, errText);
        if (!isProd) {
          // Dev fallback
          console.log(`[DEV OTP FALLBACK] To: ${options.to} | Code: ${options.code}`);
          return { success: true, provider: "dev-console", error: `Resend HTTP ${response.status}` };
        }
        return { success: false, provider: "resend", error: `Email delivery failed: ${errText}` };
      }

      return { success: true, provider: "resend" };
    } catch (err) {
      console.error("[Email Dispatch Exception]", err);
      if (!isProd) {
        console.log(`[DEV OTP EXCEPTION FALLBACK] To: ${options.to} | Code: ${options.code}`);
        return { success: true, provider: "dev-console" };
      }
      return { success: false, provider: "resend", error: err instanceof Error ? err.message : "Dispatch failed" };
    }
  }

  // Fallback for development / staging when RESEND_API_KEY is not configured
  if (!isProd) {
    console.log(`\n======================================================`);
    console.log(`[TRAFFICVAULTHUB EMAIL OTP] Delivered To: ${options.to}`);
    console.log(`VERIFICATION CODE: ${options.code}`);
    console.log(`EXPIRES IN: ${OTP_EXPIRY_MINUTES} minutes`);
    if (options.applicationId) console.log(`APPLICATION DOCKET: ${options.applicationId}`);
    console.log(`======================================================\n`);
    return { success: true, provider: "dev-console" };
  }

  return {
    success: false,
    provider: "resend",
    error: "Transactional email provider is not configured (RESEND_API_KEY missing)",
  };
}

export type CreateOtpResult =
  | { success: true; email: string; expiresInMinutes: number; provider: string }
  | { success: false; code: string; message: string; httpStatus: number };

export async function createAndSendOtp(
  db: D1Database,
  env: Env,
  params: {
    email: string;
    userId?: string;
    applicationId?: string;
    ip?: string | null;
    ua?: string | null;
    correlationId?: string;
  }
): Promise<CreateOtpResult> {
  await ensureEmailOtpTable(db);
  const normalizedEmail = params.email.trim().toLowerCase();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return { success: false, code: "invalid_email", message: "A valid email address is required.", httpStatus: 400 };
  }

  // 1. Rate-limit check: max 3 OTPs per email in last 15 minutes
  try {
    const rateCheck = await db.prepare(
      `SELECT COUNT(*) AS total FROM email_otps
       WHERE lower(email) = ? AND created_at > datetime('now', '-15 minutes')`
    )
      .bind(normalizedEmail)
      .first<{ total: number }>();

    if ((rateCheck?.total ?? 0) >= MAX_OTPS_PER_15_MINUTES) {
      return {
        success: false,
        code: "rate_limit_exceeded",
        message: `Too many verification requests. You can request at most ${MAX_OTPS_PER_15_MINUTES} codes per 15 minutes. Please wait before retrying.`,
        httpStatus: 429,
      };
    }
  } catch (err) {
    console.warn("Rate-limit query warning:", err);
  }

  // 2. Invalidate any active, unverified OTPs for this email
  try {
    await db.prepare(
      `UPDATE email_otps
       SET expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE lower(email) = ? AND verified_at IS NULL AND expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`
    )
      .bind(normalizedEmail)
      .run();
  } catch {
    /* non-fatal */
  }

  // 3. Generate secure 6-digit code
  const plainOtp = generateSecureOtp();
  const otpHashed = await sha256Hex(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000).toISOString();
  const otpId = "otp_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  // 4. Save to D1
  await db.prepare(
    `INSERT INTO email_otps (
      id, email, user_id, application_id, otp_hash, attempts, max_attempts, expires_at, ip_address, user_agent
    ) VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?)`
  )
    .bind(
      otpId,
      normalizedEmail,
      params.userId ?? null,
      params.applicationId ?? null,
      otpHashed,
      MAX_VERIFICATION_ATTEMPTS,
      expiresAt,
      params.ip ?? null,
      params.ua ?? null
    )
    .run();

  // 5. Audit log send attempt
  try {
    if (params.applicationId) {
      await db.prepare(
        `INSERT INTO review_audit_log (id, application_id, actor_id, action, notes, created_at)
         VALUES (?, ?, 'system', 'EMAIL_OTP_SENT', ?, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`
      )
        .bind(crypto.randomUUID(), params.applicationId, `Verification code dispatched to ${normalizedEmail}`)
        .run();
    }
  } catch {
    /* non-fatal */
  }

  // 6. Send email via Resend / Dev console
  const delivery = await sendOtpEmail(env, {
    to: normalizedEmail,
    code: plainOtp,
    applicationId: params.applicationId,
    correlationId: params.correlationId,
  });

  if (!delivery.success) {
    return {
      success: false,
      code: "delivery_failed",
      message: delivery.error || "Failed to deliver verification email. Please check configuration.",
      httpStatus: 502,
    };
  }

  return {
    success: true,
    email: normalizedEmail,
    expiresInMinutes: OTP_EXPIRY_MINUTES,
    provider: delivery.provider,
  };
}

export type VerifyOtpResult =
  | { success: true; email: string; applicationId?: string }
  | { success: false; code: string; message: string; attemptsRemaining?: number; httpStatus: number };

export async function verifyEmailOtp(
  db: D1Database,
  params: {
    email: string;
    code: string;
    applicationId?: string;
    ip?: string | null;
    ua?: string | null;
    correlationId?: string;
  }
): Promise<VerifyOtpResult> {
  await ensureEmailOtpTable(db);
  const normalizedEmail = params.email.trim().toLowerCase();
  const inputCode = params.code.trim();

  if (!normalizedEmail || !inputCode) {
    return {
      success: false,
      code: "validation_error",
      message: "Email and 6-digit verification code are required.",
      httpStatus: 400,
    };
  }

  if (!/^\d{6}$/.test(inputCode)) {
    return {
      success: false,
      code: "invalid_format",
      message: "Verification code must be exactly 6 numeric digits.",
      httpStatus: 400,
    };
  }

  // 1. Fetch latest pending unverified OTP record
  const row = await db.prepare(
    `SELECT id, email, user_id, application_id, otp_hash, attempts, max_attempts, expires_at
     FROM email_otps
     WHERE lower(email) = ? AND verified_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`
  )
    .bind(normalizedEmail)
    .first<{
      id: string;
      email: string;
      user_id: string | null;
      application_id: string | null;
      otp_hash: string;
      attempts: number;
      max_attempts: number;
      expires_at: string;
    }>();

  if (!row) {
    return {
      success: false,
      code: "no_pending_code",
      message: "No active verification code found for this email address. Please request a new code.",
      httpStatus: 400,
    };
  }

  // 2. Check maximum attempts
  if (row.attempts >= row.max_attempts) {
    return {
      success: false,
      code: "too_many_attempts",
      message: "Maximum verification attempts exceeded (5/5). Please request a new code.",
      attemptsRemaining: 0,
      httpStatus: 429,
    };
  }

  // 3. Check expiration
  if (new Date(row.expires_at).getTime() < Date.now()) {
    return {
      success: false,
      code: "code_expired",
      message: "Verification code has expired. Please request a new code.",
      httpStatus: 400,
    };
  }

  // 4. Increment attempts counter
  const newAttempts = row.attempts + 1;
  await db.prepare(
    `UPDATE email_otps SET attempts = ? WHERE id = ?`
  )
    .bind(newAttempts, row.id)
    .run();

  // 5. Constant-time hash comparison
  const inputHash = await sha256Hex(inputCode);
  const match = constantTimeEqual(inputHash, row.otp_hash);

  if (!match) {
    const remaining = Math.max(0, row.max_attempts - newAttempts);
    return {
      success: false,
      code: "invalid_code",
      message: remaining > 0
        ? `Incorrect verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Incorrect code. Maximum verification attempts exceeded. Please request a new code.",
      attemptsRemaining: remaining,
      httpStatus: 400,
    };
  }

  // 6. Code verified! Mark OTP record
  const now = new Date().toISOString();
  await db.prepare(
    `UPDATE email_otps SET verified_at = ? WHERE id = ?`
  )
    .bind(now, row.id)
    .run();

  const appId = params.applicationId || row.application_id;

  // 7. Update partner_applications and verification_dimensions if application exists
  try {
    if (appId) {
      await db.prepare(
        `UPDATE partner_applications SET email_verified = 1, updated_at = ? WHERE id = ?`
      )
        .bind(now, appId)
        .run();

      await db.prepare(
        `UPDATE verification_dimensions
         SET stage = 'VERIFIED', status = 'PASSED', verified_at = ?, updated_at = ?
         WHERE application_id = ? AND dimension = 'EMAIL'`
      )
        .bind(now, now, appId)
        .run();

      await db.prepare(
        `INSERT INTO review_audit_log (id, application_id, actor_id, action, notes, created_at)
         VALUES (?, ?, 'applicant', 'EMAIL_OTP_VERIFIED', ?, ?)`
      )
        .bind(crypto.randomUUID(), appId, `Email ${normalizedEmail} successfully confirmed via OTP`, now)
        .run();
    } else {
      // Look up application by email
      await db.prepare(
        `UPDATE partner_applications SET email_verified = 1, updated_at = ? WHERE lower(email) = ?`
      )
        .bind(now, normalizedEmail)
        .run();

      await db.prepare(
        `UPDATE verification_dimensions
         SET stage = 'VERIFIED', status = 'PASSED', verified_at = ?, updated_at = ?
         WHERE dimension = 'EMAIL' AND application_id IN (
           SELECT id FROM partner_applications WHERE lower(email) = ?
         )`
      )
        .bind(now, now, normalizedEmail)
        .run();
    }

    // 8. Update users table if user exists
    await db.prepare(
      `UPDATE users SET email_verified = 1, updated_at = ? WHERE lower(email) = ?`
    )
      .bind(now, normalizedEmail)
      .run();
  } catch (err) {
    console.warn("Post-verification sync notice:", err);
  }

  return {
    success: true,
    email: normalizedEmail,
    applicationId: appId ?? undefined,
  };
}
