import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator, userBelongsToOrg } from "../lib/rbac";
import { writeAuditEvent } from "../lib/audit";
export const payoutRoutes = new Hono<{ Bindings: Env }>();
payoutRoutes.use("*", requireAuth());
payoutRoutes.get("/", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  const orgId = c.req.query("organizationId");
  if (!orgId) return c.json({ error: { code: "validation_error", message: "organizationId required", correlationId } }, 400);
  if (!(await userBelongsToOrg(c.env.DB, user.id, orgId)) && !(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Not a member", correlationId } }, 403);
  try {
    const { results } = await c.env.DB.prepare(`SELECT id, currency, amount_minor, status, provider, provider_reference, created_at FROM payout_requests WHERE organization_id = ? ORDER BY created_at DESC LIMIT 50`).bind(orgId).all();
    return c.json({ data: results ?? [], note: "Not payment-provider confirmation", correlationId });
  } catch { return c.json({ error: { code: "catalog_unavailable", message: "Apply migration 0005", correlationId } }, 503); }
});
payoutRoutes.post("/", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  let body: { organizationId?: string; currency?: string; amountMinor?: number; note?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: { code: "invalid_json", message: "JSON required", correlationId } }, 400); }
  const orgId = body.organizationId?.trim();
  const amount = Math.floor(Number(body.amountMinor) || 0);
  const currency = (body.currency || "USD").toUpperCase();
  if (!orgId || amount <= 0) return c.json({ error: { code: "validation_error", message: "organizationId and positive amountMinor required", correlationId } }, 400);
  if (!(await userBelongsToOrg(c.env.DB, user.id, orgId)) && !(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Not a member", correlationId } }, 403);
  const id = crypto.randomUUID();
  try {
    await c.env.DB.prepare(`INSERT INTO payout_requests (id, organization_id, currency, amount_minor, status, provider, note, requested_by_user_id) VALUES (?,?,?,?,'PENDING','manual',?,?)`)
      .bind(id, orgId, currency, amount, body.note?.slice(0, 500) ?? null, user.id).run();
    await writeAuditEvent(c.env.DB, { actorId: user.id, action: "payout.request.create", resourceType: "payout_request", resourceId: id, correlationId });
    return c.json({ data: { id, status: "PENDING", note: "No funds moved" }, correlationId }, 201);
  } catch { return c.json({ error: { code: "catalog_unavailable", message: "Apply migration 0005", correlationId } }, 503); }
});
