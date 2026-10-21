import { Hono } from "hono";
import type { Env } from "../env";

/**
 * Offer category catalog — database-driven.
 * Frontend and business logic must not depend on hard-coded exhaustive lists.
 *
 * Full CRUD + policy versioning will be added in Phase B.
 * This route returns the current active catalog (or empty if migrations not applied).
 */
export const categoryRoutes = new Hono<{ Bindings: Env }>();

categoryRoutes.get("/", async (c) => {
  const correlationId = c.get("correlationId");

  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, slug, name, description, parent_id, sort_order, is_active, risk_classification
       FROM offer_categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, name ASC`
    ).all();

    return c.json({
      data: results ?? [],
      correlationId,
    });
  } catch (err) {
    // Table may not exist yet (pre-migration). Return empty catalog gracefully.
    console.warn(`[${correlationId}] offer_categories query failed:`, err);
    return c.json({
      data: [],
      message: "Category catalog not yet initialized. Apply migrations.",
      correlationId,
    });
  }
});
