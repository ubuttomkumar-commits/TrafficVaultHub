import { createMiddleware } from "hono/factory";
import type { Env } from "../env";

declare module "hono" {
  interface ContextVariableMap {
    correlationId: string;
  }
}

/**
 * Attach a correlation ID to every request for observability.
 */
export function correlationId() {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const incoming =
      c.req.header("x-correlation-id") ||
      c.req.header("cf-ray") ||
      crypto.randomUUID();
    c.set("correlationId", incoming);
    c.header("x-correlation-id", incoming);
    await next();
  });
}
