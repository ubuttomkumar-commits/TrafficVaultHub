/**
 * Category-agnostic click tracking via existing tracking_links + clicks + offer_versions.
 * GET /api/v1/t/:code — records click and redirects to destination URL.
 * Does not trust client-supplied payout values.
 */

import { Hono } from "hono";
import type { Env } from "../env";

export const trackingRoutes = new Hono<{ Bindings: Env }>();

type LinkRow = {
  link_id: string;
  organization_id: string;
  affiliate_profile_id: string;
  offer_id: string;
  offer_organization_id: string;
  traffic_source_id: string | null;
  link_status: string;
  offer_status: string;
  current_version_id: string | null;
  destination_url: string | null;
  offer_version_id: string | null;
  attribution_window_seconds: number | null;
  default_sub1: string | null;
  default_sub2: string | null;
  default_sub3: string | null;
  default_sub4: string | null;
  default_sub5: string | null;
};

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

trackingRoutes.get("/:code", async (c) => {
  const correlationId = c.get("correlationId");
  const code = c.req.param("code")?.trim();
  if (!code || code.length < 6 || code.length > 32) {
    return c.json(
      {
        error: {
          code: "invalid_code",
          message: "Invalid tracking code",
          correlationId,
        },
      },
      400
    );
  }

  const row = await c.env.DB.prepare(
    `SELECT tl.id AS link_id, tl.organization_id, tl.affiliate_profile_id,
            tl.offer_id, tl.offer_organization_id, tl.traffic_source_id,
            tl.status AS link_status, tl.default_sub1, tl.default_sub2,
            tl.default_sub3, tl.default_sub4, tl.default_sub5,
            o.status AS offer_status, o.current_version_id,
            ov.id AS offer_version_id, ov.destination_url,
            ov.attribution_window_seconds
     FROM tracking_links tl
     INNER JOIN offers o ON o.id = tl.offer_id
     LEFT JOIN offer_versions ov ON ov.id = o.current_version_id
     WHERE tl.code = ?
     LIMIT 1`
  )
    .bind(code)
    .first<LinkRow>();

  if (!row || row.link_status !== "ACTIVE" || row.offer_status !== "LIVE") {
    return c.json(
      {
        error: {
          code: "link_unavailable",
          message: "Tracking link is not available",
          correlationId,
        },
      },
      404
    );
  }

  if (!row.offer_version_id || !row.destination_url) {
    return c.json(
      {
        error: {
          code: "offer_not_ready",
          message: "Offer destination is not configured",
          correlationId,
        },
      },
      503
    );
  }

  const clickId = crypto.randomUUID();
  const ip = c.req.header("cf-connecting-ip") ?? "";
  const ua = c.req.header("user-agent") ?? "";
  const ipHash = ip ? await sha256Hex(ip) : null;
  const uaHash = ua ? await sha256Hex(ua) : null;
  const country = c.req.header("cf-ipcountry") ?? null;

  const sub1 = c.req.query("sub1") ?? row.default_sub1;
  const sub2 = c.req.query("sub2") ?? row.default_sub2;
  const sub3 = c.req.query("sub3") ?? row.default_sub3;
  const sub4 = c.req.query("sub4") ?? row.default_sub4;
  const sub5 = c.req.query("sub5") ?? row.default_sub5;

  try {
    await c.env.DB.prepare(
      `INSERT INTO clicks (
         id, organization_id, affiliate_profile_id, tracking_link_id,
         offer_id, offer_version_id, offer_organization_id, traffic_source_id,
         sub1, sub2, sub3, sub4, sub5,
         country_code, ip_hash, user_agent_hash,
         decision_reason_code, destination_url, request_id
       ) VALUES (
         ?, ?, ?, ?,
         ?, ?, ?, ?,
         ?, ?, ?, ?, ?,
         ?, ?, ?,
         'DIRECT', ?, ?
       )`
    )
      .bind(
        clickId,
        row.organization_id,
        row.affiliate_profile_id,
        row.link_id,
        row.offer_id,
        row.offer_version_id,
        row.offer_organization_id,
        row.traffic_source_id,
        sub1,
        sub2,
        sub3,
        sub4,
        sub5,
        country && country.length === 2 ? country : null,
        ipHash,
        uaHash,
        row.destination_url,
        correlationId
      )
      .run();
  } catch (err) {
    console.error(`[${correlationId}] click insert failed`, err);
    // Still attempt redirect if destination known — but prefer not to lose attribution silently
    return c.json(
      {
        error: {
          code: "click_failed",
          message: "Unable to record click",
          correlationId,
        },
      },
      503
    );
  }

  // Redirect — append click id if destination allows query (safe append)
  let dest = row.destination_url;
  try {
    const u = new URL(dest);
    if (!u.searchParams.has("click_id")) {
      u.searchParams.set("click_id", clickId);
    }
    dest = u.toString();
  } catch {
    /* keep raw destination */
  }

  return c.redirect(dest, 302);
});
