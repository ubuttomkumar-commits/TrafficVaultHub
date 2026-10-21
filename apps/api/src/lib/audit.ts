export async function writeAuditEvent(db: D1Database, input: {
  actorId?: string | null; action: string; resourceType: string; resourceId?: string | null;
  before?: unknown; after?: unknown; reason?: string | null; correlationId?: string | null;
}): Promise<void> {
  try {
    await db.prepare(
      `INSERT INTO audit_events (id, actor_id, action, resource_type, resource_id, before_json, after_json, reason, correlation_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      crypto.randomUUID(), input.actorId ?? null, input.action.slice(0, 120), input.resourceType.slice(0, 80),
      input.resourceId ?? null,
      input.before !== undefined ? JSON.stringify(input.before).slice(0, 8000) : null,
      input.after !== undefined ? JSON.stringify(input.after).slice(0, 8000) : null,
      input.reason?.slice(0, 240) ?? null, input.correlationId ?? null
    ).run();
  } catch (e) { console.warn("[audit] skipped", e instanceof Error ? e.message : e); }
}
