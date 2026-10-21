import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator, userBelongsToOrg } from "../lib/rbac";
export const evidenceRoutes = new Hono<{ Bindings: Env }>();
evidenceRoutes.use("*", requireAuth());
evidenceRoutes.post("/upload", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!c.env.R2) return c.json({ error: { code: "r2_not_configured", message: "Enable R2 on Cloudflare, bind bucket, redeploy", correlationId } }, 503);
  const form = await c.req.formData();
  const file = form.get("file");
  const organizationId = String(form.get("organizationId") || "");
  if (!file || typeof file !== "object" || !("arrayBuffer" in file)) return c.json({ error: { code: "validation_error", message: "file required", correlationId } }, 400);
  if (!organizationId) return c.json({ error: { code: "validation_error", message: "organizationId required", correlationId } }, 400);
  if (!(await userBelongsToOrg(c.env.DB, user.id, organizationId)) && !(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Not a member", correlationId } }, 403);
  const upload = file as { arrayBuffer: () => Promise<ArrayBuffer>; size: number; type: string };
  if (upload.size > 5_000_000) return c.json({ error: { code: "validation_error", message: "Max 5MB", correlationId } }, 400);
  const id = crypto.randomUUID();
  const key = `evidence/${organizationId}/${id}`;
  await c.env.R2.put(key, await upload.arrayBuffer(), { httpMetadata: { contentType: upload.type || "application/octet-stream" } });
  try {
    await c.env.DB.prepare(`INSERT INTO evidence_objects (id, organization_id, resource_type, r2_key, content_type, size_bytes, uploaded_by_user_id) VALUES (?, ?, 'generic', ?, ?, ?, ?)`)
      .bind(id, organizationId, key, upload.type || null, upload.size, user.id).run();
  } catch { /* */ }
  return c.json({ data: { id, key, note: "Private object; not payment proof" }, correlationId }, 201);
});
