import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator } from "../lib/rbac";
import { writeAuditEvent } from "../lib/audit";
export const complianceRoutes = new Hono<{ Bindings: Env }>();
complianceRoutes.use("*", requireAuth());
complianceRoutes.get("/queue", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Platform operator role required", correlationId } }, 403);
  try {
    const status = (c.req.query("status") || "OPEN").toUpperCase();
    const { results } = status === "ALL"
      ? await c.env.DB.prepare(`SELECT * FROM compliance_cases ORDER BY created_at ASC LIMIT 100`).all()
      : await c.env.DB.prepare(`SELECT * FROM compliance_cases WHERE status = ? ORDER BY created_at ASC LIMIT 100`).bind(status).all();
    return c.json({ data: results ?? [], correlationId });
  } catch { return c.json({ error: { code: "catalog_unavailable", message: "Apply migration 0004", correlationId } }, 503); }
});
complianceRoutes.post("/cases", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Platform operator role required", correlationId } }, 403);
  let body: { summary?: string; offerId?: string; organizationId?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: { code: "invalid_json", message: "JSON required", correlationId } }, 400); }
  if (!(body.summary ?? "").trim()) return c.json({ error: { code: "validation_error", message: "summary required", correlationId } }, 400);
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(`INSERT INTO compliance_cases (id, organization_id, offer_id, case_type, status, priority, summary, opened_by_user_id) VALUES (?, ?, ?, 'RESTRICTED_CATEGORY_REVIEW', 'OPEN', 'normal', ?, ?)`)
      .bind(id, body.organizationId ?? null, body.offerId ?? null, body.summary!.slice(0, 500), user.id).run();
    return c.json({ data: { id, status: "OPEN" }, correlationId }, 201);
  } catch { return c.json({ error: { code: "catalog_unavailable", message: "Apply migration 0004", correlationId } }, 503); }
});
complianceRoutes.post("/offers/:offerId/emergency-pause", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Platform operator role required", correlationId } }, 403);
  const offerId = c.req.param("offerId");
  const offer = await c.env.DB.prepare(`SELECT id, status FROM offers WHERE id = ?`).bind(offerId).first<{ id: string; status: string }>();
  if (!offer) return c.json({ error: { code: "not_found", message: "Offer not found", correlationId } }, 404);
  await c.env.DB.prepare(`UPDATE offers SET status='COMPLIANCE_HOLD', updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?`).bind(offerId).run();
  await writeAuditEvent(c.env.DB, { actorId: user.id, action: "compliance.emergency_pause", resourceType: "offer", resourceId: offerId, before: { status: offer.status }, after: { status: "COMPLIANCE_HOLD" }, correlationId });
  return c.json({ data: { offerId, toStatus: "COMPLIANCE_HOLD" }, correlationId });
});
