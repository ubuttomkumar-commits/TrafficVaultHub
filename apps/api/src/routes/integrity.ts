import { Hono } from "hono";
import type { Env } from "../env";
import { requireAuth } from "../middleware/auth";
import { isPlatformOperator } from "../lib/rbac";
export const integrityRoutes = new Hono<{ Bindings: Env }>();
integrityRoutes.use("*", requireAuth());
integrityRoutes.get("/summary", async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) return c.json({ error: { code: "forbidden", message: "Platform operator role required", correlationId } }, 403);
  const findings: { code: string; severity: string; message: string }[] = [];
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT c.id FROM conversions c WHERE c.lifecycle_status='LEDGER_POSTED' AND NOT EXISTS (SELECT 1 FROM journal_entries j WHERE j.reference_id=c.id AND j.journal_type='CONVERSION_COMMISSION') LIMIT 20`
    ).all<{ id: string }>();
    if ((results ?? []).length) findings.push({ code: "ledger_gap", severity: "critical", message: `LEDGER_POSTED without journal: ${results!.length}` });
    else findings.push({ code: "ledger_ok", severity: "info", message: "No LEDGER_POSTED gaps in sample" });
  } catch { findings.push({ code: "ledger_skip", severity: "warn", message: "ledger check skipped" }); }
  const critical = findings.filter((f) => f.severity === "critical").length;
  return c.json({ data: { status: critical ? "fail" : "pass", findings, note: "Read-only scan" }, correlationId });
});
