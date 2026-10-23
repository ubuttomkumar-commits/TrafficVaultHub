/**
 * TrafficVaultHub API
 * Cloudflare Workers + Hono — existing D1 schema; no duplicate systems.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { API_PREFIX, PRODUCT_NAME } from "@trafficvaulthub/shared";
import type { Env } from "./env";
import { healthRoutes } from "./routes/health";
import { categoryRoutes } from "./routes/categories";
import { offerRoutes } from "./routes/offers";
import { offerLifecycleRoutes } from "./routes/offer-lifecycle";
import { trackingLinkRoutes } from "./routes/tracking-links";
import { offerCapRoutes } from "./routes/offer-caps";
import { authRoutes } from "./routes/auth";
import { publisherRoutes } from "./routes/publisher";
import { trackingRoutes } from "./routes/tracking";
import { postbackRoutes } from "./routes/postbacks";
import { conversionRoutes } from "./routes/conversions";
import { advertiserRoutes } from "./routes/advertiser";
import { complianceRoutes } from "./routes/compliance";
import { integrityRoutes } from "./routes/integrity";
import { smartlinkRoutes, smartlinkPublicRoutes } from "./routes/smartlinks";
import { payoutRoutes } from "./routes/payouts";
import { evidenceRoutes } from "./routes/evidence";
import { adminRoutes, publicCmsRoutes } from "./routes/admin";
import { onboardingRoutes } from "./routes/onboarding";
import { errorHandler } from "./middleware/error-handler";
import { correlationId } from "./middleware/correlation-id";
import { optionalAuth } from "./middleware/auth";

const app = new Hono<{ Bindings: Env }>();

app.use("*", correlationId());
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      // Allow local Vite + Cloudflare Pages
      if (
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.endsWith(".pages.dev") ||
        origin.endsWith(".workers.dev")
      ) {
        return origin;
      }
      return "http://localhost:5173";
    },
    credentials: true,
  })
);

app.onError(errorHandler);

app.get("/", (c) => {
  return c.json({
    product: PRODUCT_NAME,
    message: "TrafficVaultHub API",
    version: c.env.API_VERSION ?? "v1",
    docs: `${API_PREFIX}/health`,
    ui: "https://trafficvaulthub.pages.dev",
  });
});

const api = new Hono<{ Bindings: Env }>();
api.use("*", optionalAuth());
api.route("/health", healthRoutes);
api.route("/auth", authRoutes);
api.route("/offer-categories", categoryRoutes);
api.route("/offers", offerRoutes);
api.route("/offers", offerLifecycleRoutes);
api.route("/offers", offerCapRoutes);
api.route("/tracking-links", trackingLinkRoutes);
api.route("/publisher", publisherRoutes);
api.route("/t", trackingRoutes);
api.route("/postbacks", postbackRoutes);
api.route("/conversions", conversionRoutes);
api.route("/advertiser", advertiserRoutes);
api.route("/compliance", complianceRoutes);
api.route("/integrity", integrityRoutes);
api.route("/smartlinks", smartlinkRoutes);
api.route("/sl", smartlinkPublicRoutes);
api.route("/payouts", payoutRoutes);
api.route("/evidence", evidenceRoutes);
api.route("/admin", adminRoutes);
api.route("/onboarding", onboardingRoutes);
api.route("/cms", publicCmsRoutes);
api.route("/", publicCmsRoutes);

app.route(API_PREFIX, api);

app.notFound((c) => {
  return c.json(
    {
      error: {
        code: "not_found",
        message: "Resource not found",
        correlationId: c.get("correlationId"),
      },
    },
    404
  );
});

export default app;

export { OfferCapDO } from "./durable/offer-cap";
