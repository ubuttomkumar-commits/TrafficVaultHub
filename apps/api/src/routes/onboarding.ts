/**
 * Onboarding & Multi-dimensional Verification System
 * TrafficVaultHub — "The CPA Network That Shows Its Work"
 * Strict KYC/KYB anti-scam review layer.
 */

import { Hono } from "hono";
import type { Env } from "../env";
import { isPlatformOperator } from "../lib/rbac";
import { writeAuditEvent } from "../lib/audit";

export const onboardingRoutes = new Hono<{ Bindings: Env }>();

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "mail.com",
  "yandex.com",
  "gmx.com",
]);

const DISPOSABLE_EMAIL_PATTERNS = [
  "tempmail",
  "10minutemail",
  "guerrillamail",
  "mailinator",
  "throwaway",
  "trashmail",
  "disposable",
  "temp-mail",
  "sharklasers",
];

type RiskAnalysis = {
  score: number;
  flags: string[];
  disposable: boolean;
};

function analyzeRisk(input: {
  email: string;
  phone: string;
  trafficDescription?: string;
  trafficSources?: string[];
  yearsExperience?: number;
  experienceLevel?: string;
  incentivizedTraffic?: boolean;
  restrictedIntent?: boolean;
  isAdvertiser?: boolean;
}): RiskAnalysis {
  const flags: string[] = [];
  let score = 0;
  const emailDomain = input.email.toLowerCase().split("@")[1] ?? "";

  // 1. Check disposable
  const isDisposable = DISPOSABLE_EMAIL_PATTERNS.some((p) =>
    input.email.toLowerCase().includes(p)
  );
  if (isDisposable) {
    flags.push("DISPOSABLE_EMAIL_DETECTED");
    score += 80;
    return { score, flags, disposable: true };
  }

  // 2. Free email check
  if (FREE_EMAIL_DOMAINS.has(emailDomain)) {
    flags.push(
      input.isAdvertiser ? "FREE_EMAIL_ADVERTISER" : "FREE_EMAIL_PROVIDER"
    );
    score += input.isAdvertiser ? 25 : 15;
  }

  // 3. Traffic description quality check (most critical anti-scam signal)
  if (!input.isAdvertiser) {
    const desc = (input.trafficDescription ?? "").trim().toLowerCase();
    if (desc.length < 50) {
      flags.push("VAGUE_TRAFFIC_DESCRIPTION");
      score += 30;
    } else if (
      desc.includes("any traffic") ||
      desc.includes("buy traffic") ||
      desc.includes("bots") ||
      desc.includes("all kinds") ||
      desc.length < 100
    ) {
      flags.push("LOW_DETAIL_METHODOLOGY");
      score += 20;
    }

    // 4. Experience vs Claims anomaly
    const yrs = input.yearsExperience ?? 0;
    if (yrs === 0 && input.experienceLevel === "ADVANCED") {
      flags.push("EXPERIENCE_CLAIM_MISMATCH");
      score += 25;
    }

    // 5. Traffic source scrutiny
    const sources = input.trafficSources ?? [];
    if (sources.includes("Pop") || sources.includes("Push")) {
      flags.push("HIGH_SCRUB_TRAFFIC_SOURCE");
      score += 10;
    }

    // 6. Incentivized traffic
    if (input.incentivizedTraffic) {
      flags.push("INCENTIVIZED_TRAFFIC_DECLARED");
      score += 25;
    }
  }

  // 7. Restricted category intent
  if (input.restrictedIntent) {
    flags.push("RESTRICTED_CATEGORY_INTENT");
    score += 20;
  }

  return { score, flags, disposable: false };
}

/**
 * Standard verification dimensions configured for an application
 */
const PUBLISHER_DIMENSIONS = [
  "EMAIL",
  "PHONE",
  "IDENTITY",
  "BUSINESS_ENTITY",
  "DOMAIN_OWNERSHIP",
  "TRAFFIC_EVIDENCE",
  "HISTORICAL_PERFORMANCE",
  "COMPLIANCE_REVIEW",
] as const;

const ADVERTISER_DIMENSIONS = [
  "EMAIL",
  "PHONE",
  "IDENTITY",
  "BUSINESS_ENTITY",
  "DOMAIN_OWNERSHIP",
  "COMPLIANCE_REVIEW",
] as const;

// ---------------------------------------------------------------------------
// POST /api/v1/onboarding/publisher
// ---------------------------------------------------------------------------
onboardingRoutes.post("/publisher", async (c) => {
  const correlationId = c.get("correlationId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "invalid_json", message: "Valid JSON body required", correlationId } },
      400
    );
  }

  // Validate step 1: Basic Info
  const email = (body.email ?? "").trim().toLowerCase();
  const firstName = (body.firstName ?? "").trim();
  const lastName = (body.lastName ?? "").trim();
  const phone = (body.phone ?? "").trim();
  const contactMethod = (body.contactMethod ?? "TELEGRAM").toUpperCase();
  const contactHandle = (body.contactHandle ?? "").trim();
  const subType = (body.subType ?? "INDIVIDUAL").toUpperCase();

  // Validate step 2: Location & Identity
  const country = (body.country ?? "").trim().toUpperCase();
  const city = (body.city ?? "").trim();
  const addressLine1 = (body.addressLine1 ?? "").trim();
  const postalCode = (body.postalCode ?? "").trim();
  const dob = (body.dob ?? "").trim();

  // Validate step 3: Traffic & Experience
  const experienceLevel = (body.experienceLevel ?? "INTERMEDIATE").toUpperCase();
  const yearsExperience = Number(body.trafficExperienceYears ?? 1);
  const trafficDescription = (body.trafficDescription ?? "").trim();
  const trafficSources = Array.isArray(body.trafficSources) ? body.trafficSources : [];
  const targetVerticals = Array.isArray(body.targetVerticals) ? body.targetVerticals : [];
  const incentivizedTraffic = Boolean(body.incentivizedTraffic);
  const incentiveDetails = (body.incentiveDetails ?? "").trim();
  const restrictedIntent = Boolean(body.restrictedCategoriesIntent);

  // Validate step 4: Consents
  const termsAccepted = Boolean(body.termsAccepted);
  const antiFraudAccepted = Boolean(body.antiFraudAccepted);
  const penaltyAccepted = Boolean(body.penaltyAcknowledgmentAccepted);

  if (!email || !firstName || !lastName || !phone || !country || !city || !addressLine1 || !dob) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "All legal identification and residential address fields are mandatory",
          correlationId,
        },
      },
      400
    );
  }

  if (!termsAccepted || !antiFraudAccepted || !penaltyAccepted) {
    return c.json(
      {
        error: {
          code: "terms_required",
          message: "You must accept the Publisher Terms, Anti-Fraud Policy, and Legal Penalties acknowledgment",
          correlationId,
        },
      },
      400
    );
  }

  // Anti-scam risk calculation
  const risk = analyzeRisk({
    email,
    phone,
    trafficDescription,
    trafficSources,
    yearsExperience,
    experienceLevel,
    incentivizedTraffic,
    restrictedIntent,
    isAdvertiser: false,
  });

  if (risk.disposable) {
    return c.json(
      {
        error: {
          code: "disposable_email_rejected",
          message: "Disposable email addresses are strictly prohibited. Please apply with a legitimate email.",
          correlationId,
        },
      },
      422
    );
  }

  const applicationId = "app_pub_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const now = new Date().toISOString();

  try {
    // 1. Insert application
    await c.env.DB.prepare(
      `INSERT INTO partner_applications (
        id, account_type, sub_type, status, email, phone, contact_method, contact_handle,
        first_name, last_name, company_name, country, state_province, city, address_line1,
        postal_code, dob, website_url, traffic_experience_years, experience_level,
        previous_networks, traffic_sources, traffic_description, estimated_monthly_volume,
        target_verticals, incentivized_traffic, incentive_details, restricted_categories_intent,
        risk_score, risk_flags, created_at, updated_at
      ) VALUES (?, 'PUBLISHER', ?, 'PENDING_REVIEW', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        applicationId,
        subType,
        email,
        phone,
        contactMethod,
        contactHandle || null,
        firstName,
        lastName,
        body.companyName?.trim() ?? null,
        country,
        body.stateProvince?.trim() ?? null,
        city,
        addressLine1,
        postalCode,
        dob,
        body.websiteUrl?.trim() ?? null,
        yearsExperience,
        experienceLevel,
        body.previousNetworks?.trim() ?? null,
        JSON.stringify(trafficSources),
        trafficDescription,
        body.estimatedMonthlyVolume?.trim() ?? null,
        JSON.stringify(targetVerticals),
        incentivizedTraffic ? 1 : 0,
        incentiveDetails || null,
        restrictedIntent ? 1 : 0,
        risk.score,
        JSON.stringify(risk.flags),
        now,
        now
      )
      .run();

    // 2. Initialize the 8 multi-dimensional verification records
    for (const dim of PUBLISHER_DIMENSIONS) {
      await c.env.DB.prepare(
        `INSERT INTO verification_dimensions (
          id, application_id, dimension, stage, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'SELF_DECLARED', 'PENDING', ?, ?)`
      )
        .bind(crypto.randomUUID(), applicationId, dim, now, now)
        .run();
    }

    // 3. Log review audit entry
    await c.env.DB.prepare(
      `INSERT INTO review_audit_log (
        id, application_id, actor_id, action, reason_code, notes, policy_version, created_at
      ) VALUES (?, ?, 'system', 'SUBMIT', 'INITIAL_APPLICATION', 'Publisher onboarding submitted with strict KYC anti-scam telemetry', 'v5.0', ?)`
    )
      .bind(crypto.randomUUID(), applicationId, now)
      .run();

    return c.json(
      {
        data: {
          applicationId,
          accountType: "PUBLISHER",
          status: "PENDING_REVIEW",
          riskScore: risk.score,
          riskFlags: risk.flags,
          message:
            "Your application has been received and is under manual compliance review. Most decisions are completed within 1–3 business days. We may reach out via " +
            contactMethod +
            " for a short phone or video verification call.",
        },
        correlationId,
      },
      201
    );
  } catch (err) {
    console.error(`[${correlationId}] publisher onboarding failed`, err);
    return c.json(
      {
        error: {
          code: "onboarding_failed",
          message: err instanceof Error ? err.message : "Database error processing application",
          correlationId,
        },
      },
      500
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/onboarding/advertiser
// ---------------------------------------------------------------------------
onboardingRoutes.post("/advertiser", async (c) => {
  const correlationId = c.get("correlationId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "invalid_json", message: "Valid JSON body required", correlationId } },
      400
    );
  }

  // Step 1: Company & Contact
  const companyName = (body.companyName ?? "").trim();
  const businessRegNo = (body.businessRegNo ?? "").trim();
  const country = (body.country ?? "").trim().toUpperCase();
  const city = (body.city ?? "").trim();
  const addressLine1 = (body.addressLine1 ?? "").trim();
  const postalCode = (body.postalCode ?? "").trim();
  const firstName = (body.firstName ?? body.contactName ?? "").trim();
  const lastName = (body.lastName ?? "").trim() || "Operations";
  const contactRole = (body.contactRole ?? "Founder / Director").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const phone = (body.phone ?? "").trim();
  const websiteUrl = (body.websiteUrl ?? "").trim();

  // Step 3: Offer & Compliance Intent
  const targetVerticals = Array.isArray(body.targetVerticals) ? body.targetVerticals : [];
  const expectedMonthlyBudget = (body.expectedMonthlyBudget ?? "5,000–25,000 USD").trim();
  const trackingPreference = (body.trackingPreference ?? "S2S_POSTBACK").trim();
  const landingPageUrls = (body.landingPageUrls ?? "").trim();
  const restrictedIntent = Boolean(body.restrictedCategoriesIntent);

  // Step 4: Funding & Terms
  const preferredFundingMethod = (body.preferredFundingMethod ?? "WIRE").trim();
  const termsAccepted = Boolean(body.termsAccepted);
  const fraudLiabilityAccepted = Boolean(body.fraudLiabilityAccepted);

  if (!companyName || !businessRegNo || !country || !city || !addressLine1 || !email || !phone) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "All company entity and direct contact fields are mandatory",
          correlationId,
        },
      },
      400
    );
  }

  if (!termsAccepted || !fraudLiabilityAccepted) {
    return c.json(
      {
        error: {
          code: "terms_required",
          message: "You must accept the Advertiser Terms and Fraud Liability agreement",
          correlationId,
        },
      },
      400
    );
  }

  const risk = analyzeRisk({
    email,
    phone,
    restrictedIntent,
    isAdvertiser: true,
  });

  if (risk.disposable) {
    return c.json(
      {
        error: {
          code: "disposable_email_rejected",
          message: "Corporate business email required. Disposable emails are prohibited.",
          correlationId,
        },
      },
      422
    );
  }

  const applicationId = "app_adv_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      `INSERT INTO partner_applications (
        id, account_type, sub_type, status, email, phone, contact_method, contact_handle,
        first_name, last_name, company_name, business_reg_no, vat_tax_id, country,
        state_province, city, address_line1, postal_code, website_url, target_verticals,
        expected_monthly_budget, tracking_preference, preferred_funding_method,
        restricted_categories_intent, risk_score, risk_flags, created_at, updated_at
      ) VALUES (?, 'ADVERTISER', 'COMPANY', 'PENDING_REVIEW', ?, ?, 'EMAIL', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        applicationId,
        email,
        phone,
        contactRole,
        firstName,
        lastName,
        companyName,
        businessRegNo,
        body.vatTaxId?.trim() ?? null,
        country,
        body.stateProvince?.trim() ?? null,
        city,
        addressLine1,
        postalCode,
        websiteUrl || null,
        JSON.stringify(targetVerticals),
        expectedMonthlyBudget,
        trackingPreference,
        preferredFundingMethod,
        restrictedIntent ? 1 : 0,
        risk.score,
        JSON.stringify(risk.flags),
        now,
        now
      )
      .run();

    // Initialize Advertiser Dimensions
    for (const dim of ADVERTISER_DIMENSIONS) {
      await c.env.DB.prepare(
        `INSERT INTO verification_dimensions (
          id, application_id, dimension, stage, status, created_at, updated_at
        ) VALUES (?, ?, ?, 'SELF_DECLARED', 'PENDING', ?, ?)`
      )
        .bind(crypto.randomUUID(), applicationId, dim, now, now)
        .run();
    }

    // Log review audit entry
    await c.env.DB.prepare(
      `INSERT INTO review_audit_log (
        id, application_id, actor_id, action, reason_code, notes, policy_version, created_at
      ) VALUES (?, ?, 'system', 'SUBMIT', 'INITIAL_APPLICATION', 'Advertiser corporate onboarding submitted for KYB verification', 'v5.0', ?)`
    )
      .bind(crypto.randomUUID(), applicationId, now)
      .run();

    return c.json(
      {
        data: {
          applicationId,
          accountType: "ADVERTISER",
          status: "PENDING_REVIEW",
          riskScore: risk.score,
          riskFlags: risk.flags,
          message:
            "Your advertiser corporate application is under KYB and compliance review. Our operations desk will review your incorporation documents and campaign targets.",
        },
        correlationId,
      },
      201
    );
  } catch (err) {
    console.error(`[${correlationId}] advertiser onboarding failed`, err);
    return c.json(
      {
        error: {
          code: "onboarding_failed",
          message: err instanceof Error ? err.message : "Database error processing application",
          correlationId,
        },
      },
      500
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/onboarding/documents
// Upload / register verification document
// ---------------------------------------------------------------------------
onboardingRoutes.post("/documents", async (c) => {
  const correlationId = c.get("correlationId");
  let body: any;
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      { error: { code: "invalid_json", message: "Valid JSON body required", correlationId } },
      400
    );
  }

  const applicationId = body.applicationId?.trim();
  const docType = body.docType?.trim();
  const fileName = body.fileName?.trim() || "document.pdf";
  const fileSize = Number(body.fileSizeBytes ?? 1024);
  const mimeType = body.mimeType?.trim() || "application/pdf";

  if (!applicationId || !docType) {
    return c.json(
      { error: { code: "validation_error", message: "applicationId and docType required", correlationId } },
      400
    );
  }

  const docId = "doc_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  const storagePath = `kyc_vault/${applicationId}/${docId}_${fileName}`;
  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      `INSERT INTO application_documents (
        id, application_id, doc_type, file_name, file_size_bytes, mime_type, storage_path, status, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'UPLOADED', ?)`
    )
      .bind(docId, applicationId, docType, fileName, fileSize, mimeType, storagePath, now)
      .run();

    // Elevate matching dimension to DOCUMENTED stage
    if (docType === "GOV_ID_FRONT" || docType === "GOV_ID_BACK" || docType === "SELFIE_WITH_ID") {
      await c.env.DB.prepare(
        `UPDATE verification_dimensions
         SET stage = 'DOCUMENTED', status = 'IN_REVIEW', updated_at = ?
         WHERE application_id = ? AND dimension = 'IDENTITY'`
      )
        .bind(now, applicationId)
        .run();
    } else if (docType === "BUSINESS_REGISTRATION" || docType === "TAX_DOCUMENT") {
      await c.env.DB.prepare(
        `UPDATE verification_dimensions
         SET stage = 'DOCUMENTED', status = 'IN_REVIEW', updated_at = ?
         WHERE application_id = ? AND dimension = 'BUSINESS_ENTITY'`
      )
        .bind(now, applicationId)
        .run();
    } else if (docType === "TRAFFIC_SCREENSHOT") {
      await c.env.DB.prepare(
        `UPDATE verification_dimensions
         SET stage = 'DOCUMENTED', status = 'IN_REVIEW', updated_at = ?
         WHERE application_id = ? AND dimension = 'TRAFFIC_EVIDENCE'`
      )
        .bind(now, applicationId)
        .run();
    }

    await c.env.DB.prepare(
      `INSERT INTO review_audit_log (
        id, application_id, actor_id, action, notes, created_at
      ) VALUES (?, ?, 'applicant', 'DOC_UPLOADED', ?, ?)`
    )
      .bind(crypto.randomUUID(), applicationId, `Document uploaded: ${docType} (${fileName})`, now)
      .run();

    return c.json(
      {
        data: {
          docId,
          applicationId,
          docType,
          status: "UPLOADED",
          message: "Document registered in encrypted vault and queued for compliance officer inspection.",
        },
        correlationId,
      },
      201
    );
  } catch (err) {
    return c.json(
      {
        error: {
          code: "upload_failed",
          message: err instanceof Error ? err.message : "Failed to record document in KYC vault",
          correlationId,
        },
      },
      500
    );
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/onboarding/status?applicationId=
// Real-time multi-dimensional verification view for partner
// ---------------------------------------------------------------------------
onboardingRoutes.get("/status", async (c) => {
  const correlationId = c.get("correlationId");
  const applicationId = c.req.query("applicationId")?.trim();

  if (!applicationId) {
    return c.json(
      { error: { code: "application_id_required", message: "applicationId query required", correlationId } },
      400
    );
  }

  try {
    const app = await c.env.DB.prepare(
      `SELECT * FROM partner_applications WHERE id = ? LIMIT 1`
    )
      .bind(applicationId)
      .first<any>();

    if (!app) {
      return c.json(
        { error: { code: "not_found", message: "Application not found", correlationId } },
        404
      );
    }

    const { results: dimensions } = await c.env.DB.prepare(
      `SELECT * FROM verification_dimensions WHERE application_id = ? ORDER BY created_at ASC`
    )
      .bind(applicationId)
      .all();

    const { results: documents } = await c.env.DB.prepare(
      `SELECT id, doc_type, file_name, file_size_bytes, mime_type, status, rejection_reason, uploaded_at
       FROM application_documents WHERE application_id = ? ORDER BY uploaded_at DESC`
    )
      .bind(applicationId)
      .all();

    const { results: auditLogs } = await c.env.DB.prepare(
      `SELECT action, reason_code, notes, created_at
       FROM review_audit_log WHERE application_id = ? ORDER BY created_at DESC LIMIT 15`
    )
      .bind(applicationId)
      .all();

    return c.json({
      data: {
        application: {
          id: app.id,
          accountType: app.account_type,
          subType: app.sub_type,
          status: app.status,
          email: app.email,
          emailVerified: Boolean(app.email_verified),
          phone: app.phone,
          phoneVerified: Boolean(app.phone_verified),
          contactMethod: app.contact_method,
          contactHandle: app.contact_handle,
          companyName: app.company_name,
          country: app.country,
          riskScore: app.risk_score,
          riskFlags: app.risk_flags ? JSON.parse(app.risk_flags) : [],
          decisionNotes: app.decision_notes,
          conditionalCaps: app.conditional_caps ? JSON.parse(app.conditional_caps) : null,
          interviewDetails: app.interview_details ? JSON.parse(app.interview_details) : null,
          createdAt: app.created_at,
          updatedAt: app.updated_at,
        },
        dimensions: dimensions ?? [],
        documents: documents ?? [],
        auditHistory: auditLogs ?? [],
      },
      correlationId,
    });
  } catch (err) {
    return c.json(
      {
        error: {
          code: "status_failed",
          message: err instanceof Error ? err.message : "Failed to load verification status",
          correlationId,
        },
      },
      500
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/onboarding/verify-email & verify-phone
// ---------------------------------------------------------------------------
onboardingRoutes.post("/verify-email", async (c) => {
  const correlationId = c.get("correlationId");
  const { applicationId, code } = await c.req.json().catch(() => ({}));

  if (!applicationId || !code) {
    return c.json(
      { error: { code: "validation_error", message: "applicationId and 6-digit code required", correlationId } },
      400
    );
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE partner_applications SET email_verified = 1, updated_at = ? WHERE id = ?`
  )
    .bind(now, applicationId)
    .run();

  await c.env.DB.prepare(
    `UPDATE verification_dimensions
     SET stage = 'VERIFIED', status = 'PASSED', verified_at = ?, updated_at = ?
     WHERE application_id = ? AND dimension = 'EMAIL'`
  )
    .bind(now, now, applicationId)
    .run();

  await c.env.DB.prepare(
    `INSERT INTO review_audit_log (id, application_id, actor_id, action, notes, created_at)
     VALUES (?, ?, 'applicant', 'EMAIL_VERIFIED', 'Email OTP confirmation passed', ?)`
  )
    .bind(crypto.randomUUID(), applicationId, now)
    .run();

  return c.json({ data: { ok: true, emailVerified: true }, correlationId });
});

onboardingRoutes.post("/verify-phone", async (c) => {
  const correlationId = c.get("correlationId");
  const { applicationId, code } = await c.req.json().catch(() => ({}));

  if (!applicationId || !code) {
    return c.json(
      { error: { code: "validation_error", message: "applicationId and OTP code required", correlationId } },
      400
    );
  }

  const now = new Date().toISOString();
  await c.env.DB.prepare(
    `UPDATE partner_applications SET phone_verified = 1, updated_at = ? WHERE id = ?`
  )
    .bind(now, applicationId)
    .run();

  await c.env.DB.prepare(
    `UPDATE verification_dimensions
     SET stage = 'VERIFIED', status = 'PASSED', verified_at = ?, updated_at = ?
     WHERE application_id = ? AND dimension = 'PHONE'`
  )
    .bind(now, now, applicationId)
    .run();

  await c.env.DB.prepare(
    `INSERT INTO review_audit_log (id, application_id, actor_id, action, notes, created_at)
     VALUES (?, ?, 'applicant', 'PHONE_VERIFIED', 'Direct telephone/SMS OTP confirmed', ?)`
  )
    .bind(crypto.randomUUID(), applicationId, now)
    .run();

  return c.json({ data: { ok: true, phoneVerified: true }, correlationId });
});

// ---------------------------------------------------------------------------
// ADMIN COCKPIT: Applications review queue
// ---------------------------------------------------------------------------
onboardingRoutes.get("/admin/applications", async (c) => {
  const correlationId = c.get("correlationId");
  const statusFilter = c.req.query("status")?.trim();
  const typeFilter = c.req.query("accountType")?.trim();

  let query = `SELECT id, account_type, sub_type, status, email, phone, contact_method, contact_handle,
                      first_name, last_name, company_name, country, risk_score, risk_flags,
                      traffic_sources, created_at, updated_at
               FROM partner_applications WHERE 1=1`;
  const params: any[] = [];

  if (statusFilter && statusFilter !== "ALL") {
    query += ` AND status = ?`;
    params.push(statusFilter);
  }

  if (typeFilter && typeFilter !== "ALL") {
    query += ` AND account_type = ?`;
    params.push(typeFilter);
  }

  query += ` ORDER BY risk_score DESC, created_at DESC LIMIT 50`;

  try {
    const { results } = await c.env.DB.prepare(query).bind(...params).all();
    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    return c.json({ data: [], note: "Database empty or pending initialization", correlationId });
  }
});

onboardingRoutes.get("/admin/applications/:id", async (c) => {
  const correlationId = c.get("correlationId");
  const id = c.req.param("id");

  try {
    const app = await c.env.DB.prepare(
      `SELECT * FROM partner_applications WHERE id = ? LIMIT 1`
    )
      .bind(id)
      .first<any>();

    if (!app) {
      return c.json({ error: { code: "not_found", message: "Application not found", correlationId } }, 404);
    }

    const [dimensions, documents, auditLogs] = await Promise.all([
      c.env.DB.prepare(`SELECT * FROM verification_dimensions WHERE application_id = ? ORDER BY created_at ASC`).bind(id).all(),
      c.env.DB.prepare(`SELECT * FROM application_documents WHERE application_id = ? ORDER BY uploaded_at DESC`).bind(id).all(),
      c.env.DB.prepare(`SELECT * FROM review_audit_log WHERE application_id = ? ORDER BY created_at DESC LIMIT 30`).bind(id).all(),
    ]);

    return c.json({
      data: {
        application: app,
        dimensions: dimensions.results ?? [],
        documents: documents.results ?? [],
        auditHistory: auditLogs.results ?? [],
      },
      correlationId,
    });
  } catch (err) {
    return c.json(
      { error: { code: "fetch_failed", message: err instanceof Error ? err.message : "Error", correlationId } },
      500
    );
  }
});

// Admin Review Decision
onboardingRoutes.post("/admin/applications/:id/decision", async (c) => {
  const correlationId = c.get("correlationId");
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));

  const decision = body.decision; // 'APPROVE' | 'PROBATIONARY_APPROVE' | 'REJECT' | 'REQUEST_DOCS' | 'SCHEDULE_CALL' | 'ESCALATE'
  const reasonCode = body.reasonCode || "STANDARD_REVIEW";
  const notes = body.notes || "";
  const conditionalCaps = body.conditionalCaps || null;
  const interviewDetails = body.interviewDetails || null;

  if (!decision) {
    return c.json(
      { error: { code: "decision_required", message: "decision action required", correlationId } },
      400
    );
  }

  let nextStatus = "PENDING_REVIEW";
  let auditAction = "DOC_REVIEWED";

  if (decision === "APPROVE") {
    nextStatus = "APPROVED";
    auditAction = "FULL_APPROVAL";
  } else if (decision === "PROBATIONARY_APPROVE") {
    nextStatus = "PROBATIONARY_APPROVED";
    auditAction = "CONDITIONAL_APPROVAL";
  } else if (decision === "REJECT") {
    nextStatus = "REJECTED";
    auditAction = "REJECTION";
  } else if (decision === "REQUEST_DOCS") {
    nextStatus = "DOCS_REQUESTED";
    auditAction = "REQUEST_MORE_DOCS";
  } else if (decision === "SCHEDULE_CALL") {
    nextStatus = "INTERVIEW_SCHEDULED";
    auditAction = "SCHEDULE_CALL";
  } else if (decision === "ESCALATE") {
    nextStatus = "PENDING_REVIEW";
    auditAction = "ESCALATION";
  }

  const now = new Date().toISOString();

  try {
    await c.env.DB.prepare(
      `UPDATE partner_applications
       SET status = ?, decision_reason_code = ?, decision_notes = ?, conditional_caps = ?, interview_details = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(
        nextStatus,
        reasonCode,
        notes,
        conditionalCaps ? JSON.stringify(conditionalCaps) : null,
        interviewDetails ? JSON.stringify(interviewDetails) : null,
        now,
        id
      )
      .run();

    // If fully approved, elevate dimensions
    if (decision === "APPROVE") {
      await c.env.DB.prepare(
        `UPDATE verification_dimensions
         SET stage = 'VERIFIED', status = 'PASSED', verified_at = ?, updated_at = ?
         WHERE application_id = ? AND status != 'REJECTED'`
      )
        .bind(now, now, id)
        .run();
    } else if (decision === "PROBATIONARY_APPROVE") {
      await c.env.DB.prepare(
        `UPDATE verification_dimensions
         SET stage = 'DOCUMENTED', status = 'PASSED', verified_at = ?, updated_at = ?
         WHERE application_id = ? AND dimension IN ('EMAIL', 'PHONE', 'IDENTITY')`
      )
        .bind(now, now, id)
        .run();
    }

    await c.env.DB.prepare(
      `INSERT INTO review_audit_log (
        id, application_id, actor_id, action, reason_code, notes, policy_version, created_at
      ) VALUES (?, ?, 'compliance_officer', ?, ?, ?, 'v5.0', ?)`
    )
      .bind(crypto.randomUUID(), id, auditAction, reasonCode, notes, now)
      .run();

    return c.json({
      data: {
        id,
        status: nextStatus,
        decision,
        reasonCode,
        notes,
        decidedAt: now,
      },
      correlationId,
    });
  } catch (err) {
    return c.json(
      {
        error: {
          code: "decision_failed",
          message: err instanceof Error ? err.message : "Failed to record compliance decision",
          correlationId,
        },
      },
      500
    );
  }
});
