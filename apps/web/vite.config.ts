import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

function readRequestBody(req: IncomingMessage): Promise<any> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function sendJson(res: ServerResponse, status: number, data: any) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function devMockApiPlugin(): Plugin {
  const seedCategories = [
    { id: "cat_dating", slug: "dating-relationships", name: "Dating & Relationships", description: "Dating, matchmaking and relationship services", parent_id: null, sort_order: 10, is_active: 1, risk_classification: "elevated" },
    { id: "cat_dating_mainstream", slug: "mainstream-dating", name: "Mainstream Dating", description: null, parent_id: "cat_dating", sort_order: 11, is_active: 1, risk_classification: "standard" },
    { id: "cat_dating_adult", slug: "adult-dating", name: "Adult Dating", description: "Restricted category — requires compliance review", parent_id: "cat_dating", sort_order: 12, is_active: 1, risk_classification: "restricted" },
    { id: "cat_dating_matchmaking", slug: "matchmaking", name: "Matchmaking", description: null, parent_id: "cat_dating", sort_order: 13, is_active: 1, risk_classification: "standard" },
    { id: "cat_mobile", slug: "mobile-apps-software", name: "Mobile Applications & Software", description: null, parent_id: null, sort_order: 20, is_active: 1, risk_classification: "standard" },
    { id: "cat_mobile_android", slug: "android-apps", name: "Android Apps", description: null, parent_id: "cat_mobile", sort_order: 21, is_active: 1, risk_classification: "standard" },
    { id: "cat_mobile_ios", slug: "ios-apps", name: "iOS Apps", description: null, parent_id: "cat_mobile", sort_order: 22, is_active: 1, risk_classification: "standard" },
    { id: "cat_mobile_vpn", slug: "vpn-cybersecurity", name: "VPN & Cybersecurity", description: null, parent_id: "cat_mobile", sort_order: 25, is_active: 1, risk_classification: "standard" },
    { id: "cat_gaming", slug: "gaming-entertainment", name: "Gaming & Entertainment", description: null, parent_id: null, sort_order: 30, is_active: 1, risk_classification: "standard" },
    { id: "cat_gaming_mobile", slug: "mobile-games", name: "Mobile Games", description: null, parent_id: "cat_gaming", sort_order: 31, is_active: 1, risk_classification: "standard" },
    { id: "cat_ecom", slug: "ecommerce-retail", name: "E-commerce & Retail", description: null, parent_id: null, sort_order: 40, is_active: 1, risk_classification: "standard" },
    { id: "cat_finance", slug: "finance-business", name: "Finance & Business", description: null, parent_id: null, sort_order: 50, is_active: 1, risk_classification: "elevated" },
    { id: "cat_finance_b2b", slug: "b2b-saas", name: "B2B SaaS", description: null, parent_id: "cat_finance", sort_order: 54, is_active: 1, risk_classification: "standard" },
    { id: "cat_health", slug: "health-wellness-lifestyle", name: "Health, Wellness & Lifestyle", description: null, parent_id: null, sort_order: 80, is_active: 1, risk_classification: "elevated" },
  ];

  const offers = [
    {
      id: "off_vpn_shield_01",
      name: "ShieldVault VPN Ultra",
      description: "High-converting multi-device cyber security and private encryption subscription.",
      vertical: "VPN & Cybersecurity",
      status: "LIVE",
      accessMode: "PUBLIC",
      payoutType: "CPA",
      currency: "USD",
      affiliateCommissionMinor: 4800,
      conversionEvent: "subscription"
    },
    {
      id: "off_match_premier_02",
      name: "SoulMatch Global Dating",
      description: "Single-opt-in international dating portal with direct verified publisher tracking.",
      vertical: "Mainstream Dating",
      status: "LIVE",
      accessMode: "PUBLIC",
      payoutType: "CPL",
      currency: "USD",
      affiliateCommissionMinor: 950,
      conversionEvent: "lead"
    },
    {
      id: "off_pulse_saas_03",
      name: "PulseAnalytics Cloud B2B",
      description: "Enterprise attribution analytics and click telemetry dashboard with 14-day trial.",
      vertical: "B2B SaaS",
      status: "LIVE",
      accessMode: "PUBLIC",
      payoutType: "CPA",
      currency: "USD",
      affiliateCommissionMinor: 7500,
      conversionEvent: "trial_signup"
    },
    {
      id: "off_rpg_game_04",
      name: "Valor & Conquest RPG",
      description: "Cross-platform multiplayer RPG action with tier-1 geo engagement performance bonuses.",
      vertical: "Mobile Games",
      status: "LIVE",
      accessMode: "PUBLIC",
      payoutType: "CPI",
      currency: "USD",
      affiliateCommissionMinor: 450,
      conversionEvent: "install"
    }
  ];

  const complianceCases = [
    {
      id: "case_cp_01",
      status: "OPEN",
      case_type: "RESTRICTED_CATEGORY_REVIEW",
      summary: "Advertiser landing page compliance check for matchmaking offers in Tier 1 regions.",
      offer_id: "off_match_premier_02",
      decision_reason: null
    },
    {
      id: "case_cp_02",
      status: "OPEN",
      case_type: "CLICK_VELOCITY_AUDIT",
      summary: "Traffic quality threshold check: automated postback integrity verification passed.",
      offer_id: "off_vpn_shield_01",
      decision_reason: null
    }
  ];

  const payouts = [
    { id: "pay_req_9801", currency: "USD", amount_minor: 50000, status: "PROCESSED" },
    { id: "pay_req_9802", currency: "USD", amount_minor: 75000, status: "PENDING" }
  ];

  const trackingLinks = [
    {
      id: "trk_01",
      code: "trk_vpn_top",
      name: "Tier-1 Google Search Native",
      offer_id: "off_vpn_shield_01",
      status: "ACTIVE",
      created_at: new Date(Date.now() - 86400000).toISOString()
    },
    {
      id: "trk_02",
      code: "trk_dating_social",
      name: "Social Discovery In-App",
      offer_id: "off_match_premier_02",
      status: "ACTIVE",
      created_at: new Date(Date.now() - 43200000).toISOString()
    }
  ];

  const smartlinks = [
    {
      id: "sl_01",
      code: "sl_global_security",
      name: "Global Cyber Security Mix",
      status: "ACTIVE",
      created_at: new Date(Date.now() - 172800000).toISOString()
    }
  ];

  const clickCaps: Record<string, { daily: number | null; total: number | null; currentDaily: number; currentTotal: number }> = {
    off_vpn_shield_01: { daily: 5000, total: 100000, currentDaily: 1420, currentTotal: 31200 },
  };

  const mockUsers = [
    {
      id: "usr_admin_01",
      email: "admin@trafficvaulthub.local",
      display_name: "Platform Admin",
      status: "ACTIVE",
      created_at: new Date(Date.now() - 864000000).toISOString(),
      last_login_at: new Date().toISOString(),
      organization_id: "org_platform_01",
      organization_name: "TrafficVaultHub Platform",
      organization_type: "PLATFORM",
      role_name: "Super Admin",
    },
    {
      id: "usr_pub_01",
      email: "partner@trafficvaulthub.com",
      display_name: "Apex Media Partners",
      status: "ACTIVE",
      created_at: new Date(Date.now() - 432000000).toISOString(),
      last_login_at: new Date(Date.now() - 3600000).toISOString(),
      organization_id: "org_traffic_vault",
      organization_name: "TrafficVault Media Partners",
      organization_type: "AFFILIATE",
      role_name: "Affiliate Owner",
    },
    {
      id: "usr_adv_01",
      email: "advertiser@globalbrands.io",
      display_name: "Global Brands Digital",
      status: "ACTIVE",
      created_at: new Date(Date.now() - 216000000).toISOString(),
      last_login_at: new Date(Date.now() - 7200000).toISOString(),
      organization_id: "org_adv_01",
      organization_name: "Global Brands Direct",
      organization_type: "ADVERTISER",
      role_name: "Advertiser Owner",
    },
  ];

  const mockAuditLogs: any[] = [];

  const mockApplications: any[] = [
    {
      id: "app_pub_sample01",
      account_type: "PUBLISHER",
      sub_type: "INDIVIDUAL",
      status: "PENDING_REVIEW",
      email: "marcus.vance@apexaffiliates.com",
      email_verified: 1,
      phone: "+1 415 555 2671",
      phone_verified: 1,
      contact_method: "TELEGRAM",
      contact_handle: "@marcus_apex",
      first_name: "Marcus",
      last_name: "Vance",
      company_name: "Apex Performance Media",
      country: "UNITED STATES",
      city: "Austin",
      risk_score: 15,
      risk_flags: ["FREE_EMAIL_PROVIDER"],
      traffic_experience_years: 4,
      experience_level: "ADVANCED",
      previous_networks: "MaxBounty ($40k/mo), GiddyUp ($15k/mo)",
      traffic_sources: '["Paid Search (Google/Bing)", "Native (Taboola/Outbrain)"]',
      traffic_description: "We run high-intent native traffic on Taboola and search arbitrage campaigns on Bing targeting Tier-1 financial SaaS and cybersecurity utility subscriptions with 2.4x ROAS.",
      estimated_monthly_volume: "50,000–100,000 clicks / mo",
      target_verticals: '["VPN & Cybersecurity", "Finance & Business", "B2B SaaS"]',
      incentivized_traffic: 0,
      created_at: new Date(Date.now() - 36000000).toISOString(),
      updated_at: new Date(Date.now() - 36000000).toISOString(),
    },
    {
      id: "app_adv_sample02",
      account_type: "ADVERTISER",
      sub_type: "COMPANY",
      status: "PENDING_REVIEW",
      email: "billing@auroracryptosec.io",
      email_verified: 1,
      phone: "+44 20 7946 0912",
      phone_verified: 0,
      contact_method: "EMAIL",
      contact_handle: "billing@auroracryptosec.io",
      first_name: "Elena",
      last_name: "Rostova",
      company_name: "Aurora Security Global Ltd",
      business_reg_no: "UK-09823411",
      country: "UNITED KINGDOM",
      city: "London",
      risk_score: 20,
      risk_flags: ["RESTRICTED_CATEGORY_ADVERTISER"],
      expected_monthly_budget: "$25,000–$50,000 USD",
      tracking_preference: "S2S_POSTBACK",
      target_verticals: '["VPN & Cybersecurity", "Finance & Business"]',
      created_at: new Date(Date.now() - 18000000).toISOString(),
      updated_at: new Date(Date.now() - 18000000).toISOString(),
    }
  ];

  const mockDimensions: Record<string, any[]> = {
    app_pub_sample01: [
      { id: "d1", application_id: "app_pub_sample01", dimension: "EMAIL", stage: "VERIFIED", status: "PASSED", verified_at: new Date().toISOString() },
      { id: "d2", application_id: "app_pub_sample01", dimension: "PHONE", stage: "VERIFIED", status: "PASSED", verified_at: new Date().toISOString() },
      { id: "d3", application_id: "app_pub_sample01", dimension: "IDENTITY", stage: "DOCUMENTED", status: "IN_REVIEW", reviewer_notes: "Passport front uploaded. Clarity good." },
      { id: "d4", application_id: "app_pub_sample01", dimension: "BUSINESS_ENTITY", stage: "SELF_DECLARED", status: "PENDING" },
      { id: "d5", application_id: "app_pub_sample01", dimension: "DOMAIN_OWNERSHIP", stage: "SELF_DECLARED", status: "PENDING" },
      { id: "d6", application_id: "app_pub_sample01", dimension: "TRAFFIC_EVIDENCE", stage: "DOCUMENTED", status: "IN_REVIEW", reviewer_notes: "MaxBounty ledger earnings screenshot attached." },
      { id: "d7", application_id: "app_pub_sample01", dimension: "HISTORICAL_PERFORMANCE", stage: "DOCUMENTED", status: "IN_REVIEW" },
      { id: "d8", application_id: "app_pub_sample01", dimension: "COMPLIANCE_REVIEW", stage: "SELF_DECLARED", status: "PENDING" }
    ],
    app_adv_sample02: [
      { id: "d21", application_id: "app_adv_sample02", dimension: "EMAIL", stage: "VERIFIED", status: "PASSED", verified_at: new Date().toISOString() },
      { id: "d22", application_id: "app_adv_sample02", dimension: "PHONE", stage: "SELF_DECLARED", status: "PENDING" },
      { id: "d23", application_id: "app_adv_sample02", dimension: "IDENTITY", stage: "DOCUMENTED", status: "IN_REVIEW" },
      { id: "d24", application_id: "app_adv_sample02", dimension: "BUSINESS_ENTITY", stage: "DOCUMENTED", status: "IN_REVIEW", reviewer_notes: "UK Companies House Certificate attached." },
      { id: "d25", application_id: "app_adv_sample02", dimension: "DOMAIN_OWNERSHIP", stage: "SELF_DECLARED", status: "PENDING" },
      { id: "d26", application_id: "app_adv_sample02", dimension: "COMPLIANCE_REVIEW", stage: "SELF_DECLARED", status: "PENDING" }
    ]
  };

  const mockDocuments: Record<string, any[]> = {
    app_pub_sample01: [
      { id: "doc_01", application_id: "app_pub_sample01", doc_type: "GOV_ID_FRONT", file_name: "us_passport_front.jpg", file_size_bytes: 184000, mime_type: "image/jpeg", status: "ACCEPTED", uploaded_at: new Date(Date.now() - 35000000).toISOString() },
      { id: "doc_02", application_id: "app_pub_sample01", doc_type: "TRAFFIC_SCREENSHOT", file_name: "maxbounty_dashboard_earnings.png", file_size_bytes: 342000, mime_type: "image/png", status: "ACCEPTED", uploaded_at: new Date(Date.now() - 34000000).toISOString() }
    ],
    app_adv_sample02: [
      { id: "doc_03", application_id: "app_adv_sample02", doc_type: "BUSINESS_REGISTRATION", file_name: "companies_house_cert_incorp.pdf", file_size_bytes: 490000, mime_type: "application/pdf", status: "ACCEPTED", uploaded_at: new Date(Date.now() - 17000000).toISOString() }
    ]
  };

  return {
    name: "tvh-dev-mock-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) {
          return next();
        }

        const [pathname, searchStr] = url.split("?");
        const searchParams = new URLSearchParams(searchStr ?? "");

        // Health check
        if (pathname === "/api/v1/health") {
          return sendJson(res, 200, {
            status: "ok",
            product: "TrafficVaultHub",
            version: "v1.0.0",
            environment: "development",
            checks: { database: "healthy (in-memory)" },
            correlationId: "tvh-live-preview",
            timestamp: new Date().toISOString()
          });
        }

        // Auth register
        if (pathname === "/api/v1/auth/register" && req.method === "POST") {
          const body = await readRequestBody(req);
          const rawType = (body.accountType || "PUBLISHER").toUpperCase();
          const isAdv = rawType === "ADVERTISER";
          const newUser = {
            id: "usr_" + Math.random().toString(36).substring(2, 9),
            email: body.email || "newuser@trafficvaulthub.local",
            display_name: body.displayName || "New User",
            status: "ACTIVE",
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
            organization_id: "org_" + Math.random().toString(36).substring(2, 9),
            organization_name: body.organizationName || (isAdv ? "Brand Operations" : "Affiliate Media"),
            organization_type: isAdv ? "ADVERTISER" : "AFFILIATE",
            role_name: isAdv ? "Advertiser Owner" : "Affiliate Owner",
          };
          mockUsers.unshift(newUser);
          return sendJson(res, 201, {
            data: {
              token: "tvh_token_" + Math.random().toString(36).substring(2, 12),
              expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
              user: {
                id: newUser.id,
                email: newUser.email,
                displayName: newUser.display_name,
                accountType: rawType,
                organizationId: newUser.organization_id,
              },
              organization: {
                id: newUser.organization_id,
                name: newUser.organization_name,
                type: newUser.organization_type,
                slug: "org-" + newUser.id,
              },
            },
          });
        }

        // Admin Bootstrap endpoint (matches Worker API /api/v1/admin/bootstrap)
        if (pathname === "/api/v1/admin/bootstrap" && req.method === "POST") {
          const body = await readRequestBody(req);
          const secretProvided = req.headers["x-bootstrap-secret"] || body.bootstrapSecret;
          const expectedSecret = process.env.BOOTSTRAP_SECRET || "TrafficVaultHub-Dev-Bootstrap-Secret-2026";

          if (!secretProvided || secretProvided !== expectedSecret) {
            return sendJson(res, 401, {
              error: { code: "unauthorized", message: "Invalid bootstrap authorization secret." }
            });
          }

          const email = (body.email || "").trim().toLowerCase();
          if (!email || !email.includes("@")) {
            return sendJson(res, 400, {
              error: { code: "invalid_email", message: "Valid platform administrator email required." }
            });
          }

          const password = body.password || "";
          if (password.length < 12) {
            return sendJson(res, 400, {
              error: { code: "weak_password", message: "Password must be at least 12 characters long." }
            });
          }

          let existingUser = mockUsers.find(u => u.email.toLowerCase() === email);
          if (existingUser) {
            existingUser.organization_type = "PLATFORM";
            existingUser.role_name = "Super Admin";
            existingUser.status = "ACTIVE";
          } else {
            existingUser = {
              id: "usr_admin_" + Math.random().toString(36).substring(2, 9),
              email,
              display_name: body.displayName || "Platform Super Administrator",
              status: "ACTIVE",
              created_at: new Date().toISOString(),
              last_login_at: new Date().toISOString(),
              organization_id: "org_platform_01",
              organization_name: "TrafficVaultHub Platform Operations",
              organization_type: "PLATFORM",
              role_name: "Super Admin",
            };
            mockUsers.unshift(existingUser);
          }

          mockAuditLogs.unshift({
            id: "aud_boot_" + Math.random().toString(36).substring(2, 9),
            action: "SYSTEM_ADMIN_BOOTSTRAP",
            resource_id: existingUser.id,
            details: { email, role: "SUPER_ADMIN", initiated_by: "bootstrap_secret" },
            created_at: new Date().toISOString()
          });

          return sendJson(res, 201, {
            data: {
              userId: existingUser.id,
              email: existingUser.email,
              organizationId: existingUser.organization_id,
              role: "SUPER_ADMIN",
              message: "Platform administrator account successfully initialized. Bootstrap is now permanently disabled."
            }
          });
        }

        // Auth login
        if (pathname === "/api/v1/auth/login" && req.method === "POST") {
          const body = await readRequestBody(req);
          const email = (body.email || "").toLowerCase().trim();
          const foundUser = mockUsers.find(u => u.email.toLowerCase() === email);

          const isAdmin =
            email === "ubuttomkumar@gmail.com" ||
            email.includes("admin") ||
            (foundUser && (foundUser.organization_type === "PLATFORM" || foundUser.role_name === "Super Admin"));

          const token = isAdmin
            ? "tvh_admin_token_" + Math.random().toString(36).substring(2, 10)
            : "tvh_pub_token_" + Math.random().toString(36).substring(2, 10);

          return sendJson(res, 200, {
            data: {
              token,
              user: {
                id: foundUser ? foundUser.id : (isAdmin ? "usr_admin_01" : "usr_pub_01"),
                email: email || (isAdmin ? "admin@trafficvaulthub.local" : "partner@trafficvaulthub.com"),
                role: isAdmin ? "super_admin" : "publisher",
                isOperator: Boolean(isAdmin),
                organizationId: foundUser ? foundUser.organization_id : (isAdmin ? "org_platform_01" : "org_traffic_vault")
              }
            }
          });
        }

        // Email OTP: Send / Resend
        if ((pathname === "/api/v1/auth/send-email-otp" || pathname === "/api/v1/auth/resend-email-otp") && req.method === "POST") {
          const body = await readRequestBody(req);
          const email = (body.email || "").trim().toLowerCase();
          if (!email || !email.includes("@")) {
            return sendJson(res, 400, { error: { code: "invalid_email", message: "Valid email address required" } });
          }
          const plainCode = Math.floor(100000 + Math.random() * 900000).toString();
          console.log(`\n======================================================`);
          console.log(`[TRAFFICVAULTHUB LOCAL DEV OTP] Recipient: ${email}`);
          console.log(`VERIFICATION CODE: ${plainCode}`);
          console.log(`EXPIRES IN: 10 minutes`);
          console.log(`======================================================\n`);
          return sendJson(res, 200, {
            data: {
              sent: true,
              email,
              expiresInMinutes: 10,
              provider: "dev-console",
              message: `A 6-digit verification code has been dispatched to ${email}.`,
              devCodeHint: plainCode // Provided for convenient local testing
            }
          });
        }

        // Email OTP: Verify
        if (pathname === "/api/v1/auth/verify-email-otp" && req.method === "POST") {
          const body = await readRequestBody(req);
          const email = (body.email || "").trim().toLowerCase();
          const code = (body.code || "").trim();
          if (!email || !code) {
            return sendJson(res, 400, { error: { code: "validation_error", message: "Email and 6-digit code required" } });
          }
          if (code.length !== 6 || !/^\d{6}$/.test(code)) {
            return sendJson(res, 400, { error: { code: "invalid_format", message: "Code must be 6 numeric digits" } });
          }

          // Mark mock application & dimensions verified
          const found = mockApplications.find(a => (body.applicationId && a.id === body.applicationId) || a.email.toLowerCase() === email);
          if (found) {
            found.email_verified = 1;
            if (mockDimensions[found.id]) {
              const match = mockDimensions[found.id].find(d => d.dimension === "EMAIL");
              if (match) { match.stage = "VERIFIED"; match.status = "PASSED"; }
            }
          }

          return sendJson(res, 200, {
            data: {
              verified: true,
              email,
              applicationId: found ? found.id : body.applicationId,
              message: "Email address successfully verified."
            }
          });
        }

        // Admin overview
        if (pathname === "/api/v1/admin/overview") {
          return sendJson(res, 200, {
            data: {
              users: { total: mockUsers.length },
              organizations: {
                AFFILIATE: mockUsers.filter(u => u.organization_type === "AFFILIATE").length,
                ADVERTISER: mockUsers.filter(u => u.organization_type === "ADVERTISER").length,
                PLATFORM: 1
              },
              offers: { LIVE: 4, DRAFT: 1 },
              conversions: {
                APPROVED: { count: 95, totalMinor: 184500 },
                PENDING: { count: 19, totalMinor: 38000 }
              },
              complianceCases: [
                { status: "OPEN", count: 2 },
                { status: "RESOLVED", count: 5 }
              ],
              payouts: [
                { status: "PROCESSED", count: 1, total_minor: 50000 },
                { status: "PENDING", count: 1, total_minor: 75000 }
              ],
              journalEntries: [],
              partnerApplications: [
                { status: "PENDING_REVIEW", count: mockApplications.filter(a => a.status === "PENDING_REVIEW").length },
                { status: "APPROVED", count: mockApplications.filter(a => a.status === "APPROVED").length },
              ],
              operationalMetrics: {
                pendingPublishers: mockApplications.filter(a => a.account_type === "PUBLISHER" && a.status === "PENDING_REVIEW").length,
                pendingAdvertisers: mockApplications.filter(a => a.account_type === "ADVERTISER" && a.status === "PENDING_REVIEW").length,
                highRiskPending: mockApplications.filter(a => (a.risk_score || 0) >= 20 && a.status === "PENDING_REVIEW").length,
                totalApplications: mockApplications.length,
                verifiedApplications: mockApplications.filter(a => a.email_verified === 1).length,
                emailVerificationRate: Math.round((mockApplications.filter(a => a.email_verified === 1).length / mockApplications.length) * 100),
                decisions24h: 3,
                openComplianceCases: complianceCases.filter(c => c.status === "OPEN").length,
              },
              recentAuditFeed: [
                { id: "aud_1", action: "FULL_APPROVAL", notes: "Identity and Tier-1 search traffic evidence corroborated", actor_id: "usr_admin_01", created_at: new Date(Date.now() - 3600000).toISOString(), first_name: "Marcus", last_name: "Vance", account_type: "PUBLISHER", email: "marcus.vance@apexaffiliates.com" },
                { id: "aud_2", action: "REQUEST_MORE_DOCS", notes: "Requested UK Companies House certificate amendment", actor_id: "usr_admin_01", created_at: new Date(Date.now() - 7200000).toISOString(), first_name: "Elena", last_name: "Rostova", account_type: "ADVERTISER", email: "billing@auroracryptosec.io" },
                { id: "aud_3", action: "EMAIL_OTP_VERIFIED", notes: "Email verified via 6-digit cryptographic OTP", actor_id: "applicant", created_at: new Date(Date.now() - 14400000).toISOString(), first_name: "Marcus", last_name: "Vance", account_type: "PUBLISHER", email: "marcus.vance@apexaffiliates.com" }
              ],
              systemHealth: {
                status: "OPERATIONAL",
                apiVersion: "v5.0",
                environment: "development (Vite preview)",
                database: "D1_ACTIVE",
                checkedAt: new Date().toISOString()
              }
            }
          });
        }

        // Admin users list
        if (pathname === "/api/v1/admin/users") {
          const q = (searchParams.get("query") || "").toLowerCase();
          const filtered = q
            ? mockUsers.filter(u => u.email.toLowerCase().includes(q) || (u.display_name && u.display_name.toLowerCase().includes(q)))
            : mockUsers;
          return sendJson(res, 200, { data: filtered });
        }

        // Admin user status patch
        const userStatusMatch = pathname.match(/^\/api\/v1\/admin\/users\/([^/]+)\/status$/);
        if (userStatusMatch && req.method === "PATCH") {
          const userId = userStatusMatch[1];
          const body = await readRequestBody(req);
          const found = mockUsers.find(u => u.id === userId);
          if (found) {
            found.status = body.status || "ACTIVE";
            mockAuditLogs.unshift({
              id: "aud_" + Math.random().toString(36).substring(2, 9),
              action: `USER_STATUS_${found.status}`,
              resource_id: userId,
              details: { reason: body.reason },
              created_at: new Date().toISOString()
            });
          }
          return sendJson(res, 200, { data: { userId, status: found ? found.status : body.status } });
        }

        // Admin audit logs
        if (pathname === "/api/v1/admin/audit-logs") {
          return sendJson(res, 200, { data: mockAuditLogs });
        }

        // Onboarding: Publisher sign-up
        if (pathname === "/api/v1/onboarding/publisher" && req.method === "POST") {
          const body = await readRequestBody(req);
          const email = (body.email || "").toLowerCase().trim();
          const isFreeEmail = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"].some(d => email.endsWith(d));
          const flags: string[] = [];
          let riskScore = 0;
          if (isFreeEmail) {
            flags.push("FREE_EMAIL_PROVIDER");
            riskScore += 15;
          }
          if ((body.trafficDescription || "").length < 60) {
            flags.push("VAGUE_TRAFFIC_DESCRIPTION");
            riskScore += 25;
          }
          if (body.incentivizedTraffic) {
            flags.push("INCENTIVIZED_TRAFFIC_DECLARED");
            riskScore += 20;
          }
          if (body.restrictedCategoriesIntent) {
            flags.push("RESTRICTED_CATEGORY_INTENT");
            riskScore += 20;
          }
          const appId = "app_pub_" + Math.random().toString(36).substring(2, 10);
          const newApp = {
            id: appId,
            account_type: "PUBLISHER",
            sub_type: (body.subType || "INDIVIDUAL").toUpperCase(),
            status: "PENDING_REVIEW",
            email,
            email_verified: 0,
            phone: body.phone || "+1 555 0192",
            phone_verified: 0,
            contact_method: body.contactMethod || "TELEGRAM",
            contact_handle: body.contactHandle || "",
            first_name: body.firstName || "Publisher",
            last_name: body.lastName || "Applicant",
            company_name: body.companyName || null,
            country: body.country || "UNITED STATES",
            city: body.city || "San Francisco",
            address_line1: body.addressLine1 || "",
            postal_code: body.postalCode || "",
            dob: body.dob || "1995-05-15",
            website_url: body.websiteUrl || null,
            traffic_experience_years: Number(body.trafficExperienceYears) || 2,
            experience_level: body.experienceLevel || "INTERMEDIATE",
            previous_networks: body.previousNetworks || "Direct / MaxBounty",
            traffic_sources: JSON.stringify(body.trafficSources || ["Paid Search (Google/Bing)"]),
            traffic_description: body.trafficDescription || "Detailed native & search campaigns.",
            estimated_monthly_volume: body.estimatedMonthlyVolume || "10k-50k",
            target_verticals: JSON.stringify(body.targetVerticals || ["VPN & Cybersecurity"]),
            incentivized_traffic: body.incentivizedTraffic ? 1 : 0,
            incentive_details: body.incentiveDetails || null,
            restricted_categories_intent: body.restrictedCategoriesIntent ? 1 : 0,
            risk_score: riskScore,
            risk_flags: flags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          mockApplications.unshift(newApp);
          mockDimensions[appId] = [
            { id: "d_" + Math.random(), application_id: appId, dimension: "EMAIL", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "PHONE", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "IDENTITY", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "BUSINESS_ENTITY", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "DOMAIN_OWNERSHIP", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "TRAFFIC_EVIDENCE", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "HISTORICAL_PERFORMANCE", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "COMPLIANCE_REVIEW", stage: "SELF_DECLARED", status: "PENDING" }
          ];
          mockDocuments[appId] = [];
          return sendJson(res, 201, {
            data: {
              applicationId: appId,
              accountType: "PUBLISHER",
              status: "PENDING_REVIEW",
              riskScore,
              riskFlags: flags,
              message: "Your application is under manual review. Most decisions within 1–3 business days. We may contact you for a short call."
            }
          });
        }

        // Onboarding: Advertiser sign-up
        if (pathname === "/api/v1/onboarding/advertiser" && req.method === "POST") {
          const body = await readRequestBody(req);
          const email = (body.email || "").toLowerCase().trim();
          const isFreeEmail = ["gmail.com", "yahoo.com", "hotmail.com"].some(d => email.endsWith(d));
          const flags: string[] = [];
          let riskScore = 0;
          if (isFreeEmail) {
            flags.push("FREE_EMAIL_ADVERTISER");
            riskScore += 20;
          }
          if (body.restrictedCategoriesIntent) {
            flags.push("RESTRICTED_CATEGORY_ADVERTISER");
            riskScore += 25;
          }
          const appId = "app_adv_" + Math.random().toString(36).substring(2, 10);
          const newApp = {
            id: appId,
            account_type: "ADVERTISER",
            sub_type: "COMPANY",
            status: "PENDING_REVIEW",
            email,
            email_verified: 0,
            phone: body.phone || "+1 555 9811",
            phone_verified: 0,
            contact_method: "EMAIL",
            contact_handle: email,
            first_name: body.firstName || "Brand Contact",
            last_name: body.lastName || "Director",
            company_name: body.companyName || "Global Brand LLC",
            business_reg_no: body.businessRegNo || "REG-99120",
            country: body.country || "UNITED STATES",
            city: body.city || "New York",
            address_line1: body.addressLine1 || "5th Avenue",
            postal_code: body.postalCode || "10001",
            website_url: body.websiteUrl || "https://example.com",
            target_verticals: JSON.stringify(body.targetVerticals || ["E-commerce & Retail"]),
            expected_monthly_budget: body.expectedMonthlyBudget || "$10,000–$50,000",
            tracking_preference: body.trackingPreference || "S2S_POSTBACK",
            preferred_funding_method: body.preferredFundingMethod || "WIRE",
            restricted_categories_intent: body.restrictedCategoriesIntent ? 1 : 0,
            risk_score: riskScore,
            risk_flags: flags,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          mockApplications.unshift(newApp);
          mockDimensions[appId] = [
            { id: "d_" + Math.random(), application_id: appId, dimension: "EMAIL", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "PHONE", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "IDENTITY", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "BUSINESS_ENTITY", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "DOMAIN_OWNERSHIP", stage: "SELF_DECLARED", status: "PENDING" },
            { id: "d_" + Math.random(), application_id: appId, dimension: "COMPLIANCE_REVIEW", stage: "SELF_DECLARED", status: "PENDING" }
          ];
          mockDocuments[appId] = [];
          return sendJson(res, 201, {
            data: {
              applicationId: appId,
              accountType: "ADVERTISER",
              status: "PENDING_REVIEW",
              riskScore,
              riskFlags: flags,
              message: "Your advertiser application is under manual business & KYB verification."
            }
          });
        }

        // Onboarding: Document Upload
        if (pathname === "/api/v1/onboarding/documents" && req.method === "POST") {
          const body = await readRequestBody(req);
          const appId = body.applicationId || "app_pub_sample01";
          const docId = "doc_" + Math.random().toString(36).substring(2, 9);
          const newDoc = {
            id: docId,
            application_id: appId,
            doc_type: body.docType || "GOV_ID_FRONT",
            file_name: body.fileName || "uploaded_id.jpg",
            file_size_bytes: Number(body.fileSizeBytes) || 240000,
            mime_type: body.mimeType || "image/jpeg",
            status: "ACCEPTED",
            uploaded_at: new Date().toISOString(),
          };
          if (!mockDocuments[appId]) mockDocuments[appId] = [];
          mockDocuments[appId].unshift(newDoc);
          if (mockDimensions[appId]) {
            const targetDim = body.docType?.includes("GOV_ID") || body.docType === "SELFIE_WITH_ID"
              ? "IDENTITY"
              : body.docType === "BUSINESS_REGISTRATION"
              ? "BUSINESS_ENTITY"
              : "TRAFFIC_EVIDENCE";
            const match = mockDimensions[appId].find(d => d.dimension === targetDim);
            if (match) {
              match.stage = "DOCUMENTED";
              match.status = "IN_REVIEW";
            }
          }
          return sendJson(res, 201, { data: newDoc });
        }

        // Onboarding: Status check
        if (pathname === "/api/v1/onboarding/status") {
          const appId = searchParams.get("applicationId") || mockApplications[0]?.id;
          const found = mockApplications.find(a => a.id === appId) || mockApplications[0];
          return sendJson(res, 200, {
            data: {
              application: found,
              dimensions: mockDimensions[found?.id] || [],
              documents: mockDocuments[found?.id] || [],
              auditHistory: [
                { action: "SUBMIT", notes: "Application submitted and queued for verification", created_at: found?.created_at },
                { action: "DOC_REVIEWED", notes: "Initial risk screening completed", created_at: new Date().toISOString() }
              ]
            }
          });
        }

        // Onboarding: Verify Email & Phone
        if (pathname === "/api/v1/onboarding/verify-email" && req.method === "POST") {
          const body = await readRequestBody(req);
          const found = mockApplications.find(a => a.id === body.applicationId);
          if (found) found.email_verified = 1;
          if (found && mockDimensions[found.id]) {
            const match = mockDimensions[found.id].find(d => d.dimension === "EMAIL");
            if (match) { match.stage = "VERIFIED"; match.status = "PASSED"; }
          }
          return sendJson(res, 200, { data: { ok: true, emailVerified: true } });
        }

        if (pathname === "/api/v1/onboarding/verify-phone" && req.method === "POST") {
          const body = await readRequestBody(req);
          const found = mockApplications.find(a => a.id === body.applicationId);
          if (found) found.phone_verified = 1;
          if (found && mockDimensions[found.id]) {
            const match = mockDimensions[found.id].find(d => d.dimension === "PHONE");
            if (match) { match.stage = "VERIFIED"; match.status = "PASSED"; }
          }
          return sendJson(res, 200, { data: { ok: true, phoneVerified: true } });
        }

        // Admin: List Onboarding Applications with advanced filters and sorting
        if (pathname === "/api/v1/onboarding/admin/applications") {
          const st = searchParams.get("status");
          const tp = searchParams.get("accountType");
          const q = (searchParams.get("search") || "").toLowerCase().trim();
          const rk = (searchParams.get("riskLevel") || "").toUpperCase();
          const ev = searchParams.get("emailVerified");
          const sb = searchParams.get("sortBy") || "risk_score";
          const so = searchParams.get("sortOrder") || "DESC";

          let list = [...mockApplications];
          if (st && st !== "ALL") list = list.filter(a => a.status === st);
          if (tp && tp !== "ALL") list = list.filter(a => a.account_type === tp);
          if (ev === "1" || ev === "true") list = list.filter(a => a.email_verified === 1);
          else if (ev === "0" || ev === "false") list = list.filter(a => a.email_verified === 0);
          if (rk === "HIGH") list = list.filter(a => (a.risk_score || 0) >= 20);
          else if (rk === "MEDIUM") list = list.filter(a => (a.risk_score || 0) >= 10 && (a.risk_score || 0) < 20);
          else if (rk === "LOW") list = list.filter(a => (a.risk_score || 0) < 10);

          if (q) {
            list = list.filter(a =>
              (a.first_name && a.first_name.toLowerCase().includes(q)) ||
              (a.last_name && a.last_name.toLowerCase().includes(q)) ||
              (a.email && a.email.toLowerCase().includes(q)) ||
              (a.company_name && a.company_name.toLowerCase().includes(q)) ||
              (a.id && a.id.toLowerCase().includes(q))
            );
          }

          list.sort((a, b) => {
            if (sb === "created_at") {
              const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              return so === "ASC" ? -diff : diff;
            }
            if (sb === "status") {
              return so === "ASC" ? a.status.localeCompare(b.status) : b.status.localeCompare(a.status);
            }
            const diff = (b.risk_score || 0) - (a.risk_score || 0);
            return so === "ASC" ? -diff : diff;
          });

          return sendJson(res, 200, { data: list });
        }

        // Admin: Bulk Decision on Applications
        if (pathname === "/api/v1/onboarding/admin/applications/bulk-decision" && req.method === "POST") {
          const body = await readRequestBody(req);
          const ids: string[] = Array.isArray(body.applicationIds) ? body.applicationIds : [];
          const dec = body.decision;
          ids.forEach((id) => {
            const found = mockApplications.find((a) => a.id === id);
            if (found) {
              if (dec === "APPROVE") found.status = "APPROVED";
              else if (dec === "PROBATIONARY_APPROVE") found.status = "PROBATIONARY_APPROVED";
              else if (dec === "REJECT") found.status = "REJECTED";
              else if (dec === "REQUEST_DOCS") found.status = "DOCS_REQUESTED";
              found.decision_notes = body.notes || "Bulk decision applied";
            }
          });
          return sendJson(res, 200, { data: { success: true, count: ids.length, status: dec } });
        }

        // Admin: Get Single Application
        const singleAppMatch = pathname.match(/^\/api\/v1\/onboarding\/admin\/applications\/([^/]+)$/);
        if (singleAppMatch && req.method === "GET") {
          const appId = singleAppMatch[1];
          const found = mockApplications.find(a => a.id === appId);
          return sendJson(res, 200, {
            data: {
              application: found,
              dimensions: mockDimensions[appId] || [],
              documents: mockDocuments[appId] || [],
              auditHistory: [
                { action: "SUBMIT", notes: "Initial application received", created_at: found?.created_at }
              ]
            }
          });
        }

        // Admin: Update Single Dimension
        const dimPatchMatch = pathname.match(/^\/api\/v1\/onboarding\/admin\/applications\/([^/]+)\/dimensions\/([^/]+)$/);
        if (dimPatchMatch && req.method === "PATCH") {
          const appId = dimPatchMatch[1];
          const dimKey = dimPatchMatch[2].toUpperCase();
          const body = await readRequestBody(req);
          if (mockDimensions[appId]) {
            const match = mockDimensions[appId].find(d => d.dimension === dimKey);
            if (match) {
              if (body.stage) match.stage = body.stage;
              if (body.status) match.status = body.status;
              if (body.reviewerNotes) match.reviewer_notes = body.reviewerNotes;
            }
          }
          return sendJson(res, 200, { data: { ok: true, appId, dimension: dimKey } });
        }

        // Admin: Decision on Application
        const decisionAppMatch = pathname.match(/^\/api\/v1\/onboarding\/admin\/applications\/([^/]+)\/decision$/);
        if (decisionAppMatch && req.method === "POST") {
          const appId = decisionAppMatch[1];
          const body = await readRequestBody(req);
          const found = mockApplications.find(a => a.id === appId);
          if (found) {
            if (body.decision === "APPROVE") found.status = "APPROVED";
            else if (body.decision === "PROBATIONARY_APPROVE") found.status = "PROBATIONARY_APPROVED";
            else if (body.decision === "REJECT") found.status = "REJECTED";
            else if (body.decision === "REQUEST_DOCS") found.status = "DOCS_REQUESTED";
            else if (body.decision === "SCHEDULE_CALL") found.status = "INTERVIEW_SCHEDULED";
            found.decision_reason_code = body.reasonCode || "KYC_REVIEW";
            found.decision_notes = body.notes || "";
            found.conditional_caps = body.conditionalCaps ? JSON.stringify(body.conditionalCaps) : null;
            found.interview_details = body.interviewDetails ? JSON.stringify(body.interviewDetails) : null;
            if (body.decision === "APPROVE" && mockDimensions[appId]) {
              mockDimensions[appId].forEach(d => { d.stage = "VERIFIED"; d.status = "PASSED"; });
            }
          }
          return sendJson(res, 200, { data: { id: appId, status: found ? found.status : "APPROVED" } });
        }

        // Categories
        if (pathname === "/api/v1/offer-categories") {
          return sendJson(res, 200, {
            data: seedCategories,
            message: "Active categories catalog",
            correlationId: "corr_cat_01"
          });
        }

        // Offers list
        if (pathname === "/api/v1/offers") {
          if (req.method === "POST") {
            const body = await readRequestBody(req);
            const newOffer = {
              id: "off_" + Math.random().toString(36).substring(2, 9),
              name: body.name || "Draft Campaign",
              description: body.description || null,
              vertical: "Custom",
              status: "DRAFT",
              accessMode: "PUBLIC",
              payoutType: body.payoutType || "CPA",
              currency: body.currency || "USD",
              affiliateCommissionMinor: body.affiliateCommissionMinor || 500,
              conversionEvent: body.conversionEvent || "lead"
            };
            offers.push(newOffer);
            return sendJson(res, 201, { data: { id: newOffer.id, offerId: newOffer.id, ...newOffer } });
          }
          return sendJson(res, 200, {
            data: offers,
            pagination: { page: 1, limit: 20, total: offers.length, hasMore: false }
          });
        }

        // Offer caps
        const capMatch = pathname.match(/^\/api\/v1\/offers\/([^/]+)\/caps$/);
        if (capMatch) {
          const offerId = capMatch[1];
          const today = new Date().toISOString().slice(0, 10);
          if (req.method === "PUT") {
            const body = await readRequestBody(req);
            clickCaps[offerId] = {
              daily: body.dailyClickLimit ?? null,
              total: body.totalClickLimit ?? null,
              currentDaily: clickCaps[offerId]?.currentDaily ?? 0,
              currentTotal: clickCaps[offerId]?.currentTotal ?? 0
            };
          }
          const caps = clickCaps[offerId] ?? { daily: null, total: null, currentDaily: 0, currentTotal: 0 };
          const matchedOffer = offers.find((o) => o.id === offerId) || { name: offerId };
          return sendJson(res, 200, {
            data: {
              offer: matchedOffer,
              today,
              counters: [
                {
                  cap_type: "DAILY_CLICK",
                  period_key: today,
                  limit_value: caps.daily,
                  current_value: caps.currentDaily,
                  exhausted_at: null
                },
                {
                  cap_type: "TOTAL_CLICK",
                  period_key: "TOTAL",
                  limit_value: caps.total,
                  current_value: caps.currentTotal,
                  exhausted_at: null
                }
              ]
            }
          });
        }

        // Publisher earnings
        if (pathname === "/api/v1/publisher/earnings") {
          return sendJson(res, 200, {
            data: {
              organizationName: "TrafficVault Media Partners",
              note: "Verified ledger balances. Minimum payout threshold: $50.",
              byCurrency: [
                {
                  currency: "USD",
                  commissionsMinor: 184500,
                  reversalsMinor: 0,
                  earnedMinor: 184500,
                  paidMinor: 60000,
                  payableMinor: 124500
                }
              ],
              conversionCounts: {
                RECEIVED: 142,
                VALIDATING: 28,
                PENDING: 19,
                APPROVED: 95
              }
            }
          });
        }

        // Conversion confidence
        if (pathname === "/api/v1/publisher/conversion-confidence") {
          return sendJson(res, 200, {
            data: {
              organizationName: "TrafficVault Media Partners",
              windowHours: 24,
              conversionsInWindow: 142,
              lastConversionAt: new Date(Date.now() - 180000).toISOString(),
              lastClickAt: new Date(Date.now() - 15000).toISOString(),
              conversionCountsByStatus: {
                RECEIVED: 142,
                VALIDATING: 28,
                PENDING: 19,
                APPROVED: 95
              },
              note: "Real verified conversion events across all tracking endpoints in the last 24h"
            }
          });
        }

        // Compliance queue
        if (pathname === "/api/v1/compliance/queue") {
          const filter = searchParams.get("status") || "OPEN";
          const filtered = filter === "ALL" ? complianceCases : complianceCases.filter((c) => c.status === filter);
          return sendJson(res, 200, { data: filtered });
        }

        // Compliance decide
        const decideMatch = pathname.match(/^\/api\/v1\/compliance\/cases\/([^/]+)\/decide$/);
        if (decideMatch && req.method === "POST") {
          const caseId = decideMatch[1];
          const body = await readRequestBody(req);
          const found = complianceCases.find((c) => c.id === caseId);
          if (found) {
            found.status = body.decision;
            found.decision_reason = body.reason || null;
          }
          return sendJson(res, 200, { data: { ok: true, caseId, status: body.decision } });
        }

        // Compliance create case
        if (pathname === "/api/v1/compliance/cases" && req.method === "POST") {
          const body = await readRequestBody(req);
          const newCase = {
            id: "case_" + Math.random().toString(36).substring(2, 9),
            status: "OPEN",
            case_type: body.caseType || "CONVERSION_REVERSAL_DISPUTE",
            summary: body.summary || "Dispute appeal",
            offer_id: body.offerId || null,
            organization_id: body.organizationId || null,
            priority: body.priority || "normal",
            decision_reason: null,
            created_at: new Date().toISOString()
          };
          complianceCases.unshift(newCase);
          return sendJson(res, 201, { data: newCase });
        }

        // Integrity summary
        if (pathname === "/api/v1/integrity/summary") {
          return sendJson(res, 200, {
            data: {
              status: "pass",
              findings: [
                { code: "ledger_parity", severity: "info", message: "100% of LEDGER_POSTED conversions reconciled to double-entry journal" },
                { code: "postback_idempotency", severity: "info", message: "Zero duplicate postback double-credits detected" },
                { code: "velocity_shield", severity: "info", message: "Traffic velocity within normal operating parameters (0 anomalies)" },
              ],
              note: "Automated scan verified all cryptographic invariants against double-entry ledger."
            }
          });
        }


        // Payouts
        if (pathname === "/api/v1/payouts") {
          if (req.method === "POST") {
            const body = await readRequestBody(req);
            const newPayout = {
              id: "pay_req_" + Math.random().toString(36).substring(2, 9),
              currency: body.currency || "USD",
              amount_minor: Number(body.amountMinor) || 5000,
              status: "PENDING"
            };
            payouts.unshift(newPayout);
            return sendJson(res, 201, { data: newPayout });
          }
          return sendJson(res, 200, { data: payouts });
        }

        // Tracking links
        if (pathname === "/api/v1/tracking-links") {
          if (req.method === "POST") {
            const body = await readRequestBody(req);
            const code = body.code || "trk_" + Math.random().toString(36).substring(2, 8);
            const newLink = {
              id: "trk_" + Math.random().toString(36).substring(2, 9),
              code,
              name: body.name || null,
              offer_id: body.offerId || "off_vpn_shield_01",
              status: "ACTIVE",
              created_at: new Date().toISOString()
            };
            trackingLinks.unshift(newLink);
            return sendJson(res, 201, { data: newLink });
          }
          return sendJson(res, 200, { data: trackingLinks });
        }

        // Smartlinks
        if (pathname === "/api/v1/smartlinks") {
          if (req.method === "POST") {
            const body = await readRequestBody(req);
            const code = "sl_" + Math.random().toString(36).substring(2, 8);
            const newSl = {
              id: "sl_" + Math.random().toString(36).substring(2, 9),
              code,
              name: body.name || "Custom Mix",
              status: "ACTIVE",
              created_at: new Date().toISOString()
            };
            smartlinks.unshift(newSl);
            return sendJson(res, 201, { data: newSl });
          }
          return sendJson(res, 200, { data: smartlinks });
        }

        // Public smartlink click redirect simulation
        const slMatch = pathname.match(/^\/api\/v1\/sl\/([^/]+)$/);
        if (slMatch) {
          const code = slMatch[1];
          const matchedSl = smartlinks.find((s) => s.code === code);
          return sendJson(res, 200, {
            status: "ok",
            message: `Smartlink ${code} resolved. Traffic distributed to highest-weighted active offer.`,
            redirectUrl: "https://example.com/lander?click_id=clk_demo_" + Date.now()
          });
        }

        // Public click tracking simulation
        const trkMatch = pathname.match(/^\/api\/v1\/t\/([^/]+)$/);
        if (trkMatch) {
          const code = trkMatch[1];
          return sendJson(res, 200, {
            status: "ok",
            clickId: "clk_" + Math.random().toString(36).substring(2, 10),
            code,
            message: "Click logged, cap limits validated, 302 issued to advertiser destination."
          });
        }

        // Generic fallback for any other /api routes
        return sendJson(res, 200, { data: [], message: "Endpoint active in development preview" });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), devMockApiPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@trafficvaulthub/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts")
    }
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: false,
    allowedHosts: true
  },
  build: {
    outDir: "dist",
    sourcemap: false
  }
});
