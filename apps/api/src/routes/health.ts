import { Hono } from "hono";
import type { Env } from "../env";

/**
 * Health & readiness endpoints.
 * Do not report a system healthy solely because a page loads.
 */
export const healthRoutes = new Hono<{ Bindings: Env }>();

healthRoutes.get("/", async (c) => {
  const correlationId = c.get("correlationId");
  let dbOk = false;

  try {
    const result = await c.env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
    dbOk = result?.ok === 1;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? "ok" : "degraded";
  const code = dbOk ? 200 : 503;

  return c.json(
    {
      status,
      product: "TrafficVaultHub",
      version: c.env.API_VERSION ?? "v1",
      environment: c.env.ENVIRONMENT ?? "unknown",
      checks: {
        database: dbOk ? "ok" : "unavailable",
      },
      correlationId,
      timestamp: new Date().toISOString(),
    },
    code
  );
});
