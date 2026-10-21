import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator, userBelongsToOrg } from "../lib/rbac";
export const smartlinkRoutes = new Hono<{ Bindings: Env }>();
smartlinkRoutes.use("*", requireAuth());
smartlinkRoutes.get("/", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const orgId = c.req.query("organizationId");
  if (!orgId) return c.json({ error: { code: "validation_error", message: "organizationId required", correlationId } }, 400);
  if (!(await userBelongsToOrg(c.env.DB, user.id, orgId)) && !(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Not a member", correlationId } }, 403);
  try {
    const { results } = await c.env.DB.prepare(`SELECT id, code, name, status, created_at FROM smartlinks WHERE organization_id = ?`).bind(orgId).all();
    return c.json({ data: results ?? [], correlationId });
  } catch { return c.json({ error: { code: "catalog_unavailable", message: "Apply migration 0005", correlationId } }, 503); }
});
smartlinkRoutes.post("/", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  let body: { organizationId?: string; name?: string; targets?: { offerId: string; weight?: number }[] };
  try { body = await c.req.json(); } catch { return c.json({ error: { code: "invalid_json", message: "JSON required", correlationId } }, 400); }
  const orgId = body.organizationId?.trim();
  const name = (body.name ?? "").trim();
  if (!orgId || !name || !(body.targets ?? []).length) return c.json({ error: { code: "validation_error", message: "organizationId, name, targets required", correlationId } }, 400);
  if (!(await userBelongsToOrg(c.env.DB, user.id, orgId)) && !(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Not a member", correlationId } }, 403);
  const id = crypto.randomUUID();
  const code = "sl_" + [...crypto.getRandomValues(new Uint8Array(8))].map((b) => (b % 36).toString(36)).join("");
  try {
    const stmts = [c.env.DB.prepare(`INSERT INTO smartlinks (id, organization_id, code, name, status, created_by_user_id) VALUES (?,?,?,?,'ACTIVE',?)`).bind(id, orgId, code, name.slice(0, 120), user.id)];
    body.targets!.forEach((t, i) => { stmts.push(c.env.DB.prepare(`INSERT INTO smartlink_targets (id, smartlink_id, offer_id, weight, is_active, sort_order) VALUES (?,?,?,?,1,?)`).bind(crypto.randomUUID(), id, t.offerId, Math.max(1, Math.floor(t.weight ?? 1)), i)); });
    await c.env.DB.batch(stmts);
    return c.json({ data: { id, code, name }, correlationId }, 201);
  } catch { return c.json({ error: { code: "catalog_unavailable", message: "Apply migration 0005", correlationId } }, 503); }
});
export const smartlinkPublicRoutes = new Hono<{ Bindings: Env }>();
smartlinkPublicRoutes.get("/:code", async (c) => {
  const correlationId = c.get("correlationId");
  const code = c.req.param("code");
  try {
    const sl = await c.env.DB.prepare(`SELECT id, status FROM smartlinks WHERE code = ?`).bind(code).first<{ id: string; status: string }>();
    if (!sl || sl.status !== "ACTIVE") return c.json({ error: { code: "not_found", message: "Not found", correlationId } }, 404);
    const { results } = await c.env.DB.prepare(
      `SELECT st.weight, ov.destination_url, o.status AS offer_status FROM smartlink_targets st INNER JOIN offers o ON o.id = st.offer_id LEFT JOIN offer_versions ov ON ov.id = o.current_version_id WHERE st.smartlink_id = ? AND st.is_active = 1`
    ).bind(sl.id).all<{ weight: number; destination_url: string | null; offer_status: string }>();
    const live = (results ?? []).filter((r) => r.offer_status === "LIVE" && r.destination_url && r.weight > 0);
    if (!live.length) return c.json({ error: { code: "no_targets", message: "No LIVE targets", correlationId } }, 404);
    const total = live.reduce((s, r) => s + r.weight, 0);
    let pick = Math.random() * total, chosen = live[0];
    for (const r of live) { pick -= r.weight; if (pick <= 0) { chosen = r; break; } }
    return c.redirect(chosen.destination_url!, 302);
  } catch { return c.json({ error: { code: "catalog_unavailable", message: "Unavailable", correlationId } }, 503); }
});
