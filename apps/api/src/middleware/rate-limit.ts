import type { Context, Next } from "hono";
import type { Env } from "../env";
export function rateLimit(opts: { keyPrefix: string; limit: number; windowSeconds: number }) {
  return async (c: Context<{ Bindings: Env }>, next: Next) => {
    try {
      if (!c.env.KV) { await next(); return; }
      const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
      const bucket = Math.floor(Date.now() / 1000 / opts.windowSeconds);
      const key = `rl:${opts.keyPrefix}:${ip}:${bucket}`;
      const current = Number((await c.env.KV.get(key)) || "0");
      if (current >= opts.limit) {
        return c.json({ error: { code: "rate_limited", message: "Too many requests. Try again later.", correlationId: c.get("correlationId") } }, 429);
      }
      await c.env.KV.put(key, String(current + 1), { expirationTtl: opts.windowSeconds + 5 });
    } catch { /* fail open */ }
    await next();
  };
}
