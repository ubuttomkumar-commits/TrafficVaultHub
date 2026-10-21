/**
 * TrafficVaultHub API
 * Cloudflare Workers + Hono entrypoint
 *
 * Server-side truth takes precedence over frontend state.
 * All privileged decisions are attributable and audited.
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { secureHeaders } from "hono/secure-headers";
import { API_PREFIX, PRODUCT_NAME } from "@trafficvaulthub/shared";
import type { Env } from "./env";
import { healthRoutes } from "./routes/health";
import { categoryRoutes } from "./routes/categories";
import { errorHandler } from "./middleware/error-handler";
import { correlationId } from "./middleware/correlation-id";

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use("*", correlationId());
app.use("*", logger());
app.use("*", secureHeaders());
app.use(
  "*",
  cors({
    origin: (origin) => {
      // In production, restrict to known frontend origins
      if (!origin) return "*";
      const allowed = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        // Add production domains here
      ];
      return allowed.includes(origin) ? origin : allowed[0];
    },
    credentials: true,
  })
);

app.onError(errorHandler);

// Root
app.get("/", (c) => {
  return c.json({
    product: PRODUCT_NAME,
    message: "TrafficVaultHub API",
    version: c.env.API_VERSION ?? "v1",
    docs: `${API_PREFIX}/health`,
  });
});

// Mount versioned API
const api = new Hono<{ Bindings: Env }>();
api.route("/health", healthRoutes);
api.route("/offer-categories", categoryRoutes);

app.route(API_PREFIX, api);

// 404
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
