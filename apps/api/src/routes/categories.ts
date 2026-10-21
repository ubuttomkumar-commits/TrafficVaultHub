import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator } from "../lib/rbac";
export const categoryRoutes = new Hono<{ Bindings: Env }>();
const RISK = new Set(["standard", "elevated", "restricted", "prohibited"]);
categoryRoutes.get("/", async (c) => {
  const correlationId = c.get("correlationId");
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, slug, name, description, parent_id, sort_order, is_active, risk_classification FROM offer_categories WHERE is_active = 1 ORDER BY sort_order ASC, name ASC`
    ).all();
    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    console.warn(`[${correlationId}] offer_categories query failed:`, err);
    return c.json({ data: [], message: "Category catalog not yet initialized. Apply migrations.", correlationId });
  }
});
categoryRoutes.get("/admin", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Platform operator role required", correlationId } }, 403);
  try {
    const { results } = await c.env.DB.prepare(`SELECT * FROM offer_categories ORDER BY sort_order, name`).all();
    return c.json({ data: results ?? [], correlationId });
  } catch { return c.json({ error: { code: "catalog_unavailable", message: "Categories unavailable", correlationId } }, 503); }
});
categoryRoutes.post("/admin", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Platform operator role required", correlationId } }, 403);
  let body: { name?: string; slug?: string; risk_classification?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: { code: "invalid_json", message: "JSON required", correlationId } }, 400); }
  const name = (body.name ?? "").trim();
  if (!name) return c.json({ error: { code: "validation_error", message: "name required", correlationId } }, 400);
  const slug = (body.slug || name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  const risk = (body.risk_classification || "standard").toLowerCase();
  if (!RISK.has(risk)) return c.json({ error: { code: "validation_error", message: "invalid risk", correlationId } }, 400);
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(`INSERT INTO offer_categories (id, slug, name, is_active, risk_classification, policy_version, sort_order) VALUES (?, ?, ?, 1, ?, 1, 0)`).bind(id, slug, name, risk).run();
    return c.json({ data: { id, slug, name, risk_classification: risk }, correlationId }, 201);
  } catch { return c.json({ error: { code: "conflict", message: "create failed", correlationId } }, 409); }
});
categoryRoutes.patch("/admin/:id", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Platform operator role required", correlationId } }, 403);
  const id = c.req.param("id");
  let body: { name?: string; is_active?: number | boolean; risk_classification?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: { code: "invalid_json", message: "JSON required", correlationId } }, 400); }
  if (!(await c.env.DB.prepare(`SELECT id FROM offer_categories WHERE id = ?`).bind(id).first())) return c.json({ error: { code: "not_found", message: "Not found", correlationId } }, 404);
  const isActive = body.is_active === undefined ? null : (body.is_active === true || body.is_active === 1 ? 1 : 0);
  await c.env.DB.prepare(`UPDATE offer_categories SET name = COALESCE(?, name), is_active = COALESCE(?, is_active), risk_classification = COALESCE(?, risk_classification), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`)
    .bind(body.name?.trim() ?? null, isActive, body.risk_classification?.toLowerCase() ?? null, id).run();
  return c.json({ data: await c.env.DB.prepare(`SELECT * FROM offer_categories WHERE id = ?`).bind(id).first(), correlationId });
});
