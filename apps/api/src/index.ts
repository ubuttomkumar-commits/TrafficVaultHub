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
import { authRoutes } from "./routes/auth";
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
      const allowed = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
      ];
      return allowed.includes(origin) ? origin : allowed[0];
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
  });
});

const api = new Hono<{ Bindings: Env }>();
api.use("*", optionalAuth());
api.route("/health", healthRoutes);
api.route("/auth", authRoutes);
api.route("/offer-categories", categoryRoutes);
api.route("/offers", offerRoutes);

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
