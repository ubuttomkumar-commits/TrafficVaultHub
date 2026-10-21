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

        // Auth login
        if (pathname === "/api/v1/auth/login" && req.method === "POST") {
          const body = await readRequestBody(req);
          return sendJson(res, 200, {
            data: {
              token: "tvh_live_session_token",
              user: {
                id: "usr_publisher_demo",
                email: body.email || "partner@trafficvaulthub.com",
                role: "publisher",
                organizationId: "org_traffic_vault"
              }
            }
          });
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
    allowedHosts: true
  },
  build: {
    outDir: "dist",
    sourcemap: true
  }
});
