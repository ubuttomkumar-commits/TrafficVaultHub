/**
 * Session auth against existing D1 `sessions` + `users` tables.
 * Does not create a parallel auth system.
 */

import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../env";
import { sha256Hex } from "../lib/crypto";

export type AuthUser = {
  id: string;
  email: string;
  displayName: string | null;
  status: string;
  sessionId: string;
};

declare module "hono" {
  interface ContextVariableMap {
    user: AuthUser | null;
    correlationId: string;
  }
}

type SessionRow = {
  session_id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  user_status: string;
  expires_at: string;
  revoked_at: string | null;
};

/**
 * Optional auth: attaches user when valid Bearer session token present.
 */
export function optionalAuth() {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    c.set("user", null);
    const header = c.req.header("authorization");
    if (!header?.toLowerCase().startsWith("bearer ")) {
      await next();
      return;
    }
    const raw = header.slice(7).trim();
    if (!raw) {
      await next();
      return;
    }

    try {
      const tokenHash = await sha256Hex(raw);
      const row = await c.env.DB.prepare(
        `SELECT s.id AS session_id, s.user_id, s.expires_at, s.revoked_at,
                u.email, u.display_name, u.status AS user_status
         FROM sessions s
         INNER JOIN users u ON u.id = s.user_id
         WHERE s.token_hash = ?
         LIMIT 1`
      )
        .bind(tokenHash)
        .first<SessionRow>();

      if (
        row &&
        !row.revoked_at &&
        row.user_status === "ACTIVE" &&
        new Date(row.expires_at).getTime() > Date.now()
      ) {
        c.set("user", {
          id: row.user_id,
          email: row.email,
          displayName: row.display_name,
          status: row.user_status,
          sessionId: row.session_id,
        });
        // Touch last_seen (best-effort)
        c.env.DB.prepare(
          `UPDATE sessions SET last_seen_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`
        )
          .bind(row.session_id)
          .run()
          .catch(() => undefined);
      }
    } catch (err) {
      console.warn(`[${c.get("correlationId")}] optionalAuth lookup failed`, err);
    }

    await next();
  });
}

/**
 * Require authenticated ACTIVE user.
 */
export function requireAuth() {
  return createMiddleware<{ Bindings: Env }>(async (c, next) => {
    const user = c.get("user");
    if (!user) {
      throw new HTTPException(401, { message: "Authentication required" });
    }
    await next();
  });
}
