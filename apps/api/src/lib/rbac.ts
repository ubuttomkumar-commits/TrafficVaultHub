export const PLATFORM_OPS_ROLE_IDS = [
  "00000000-0000-4000-8000-000000000101",
  "00000000-0000-4000-8000-000000000102",
  "00000000-0000-4000-8000-000000000103",
] as const;
export async function isPlatformOperator(db: D1Database, userId: string): Promise<boolean> {
  const ph = PLATFORM_OPS_ROLE_IDS.map(() => "?").join(", ");
  const row = await db.prepare(
    `SELECT 1 AS ok FROM organization_members om INNER JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = ? AND om.status = 'ACTIVE' AND o.type = 'PLATFORM' AND (o.deleted_at IS NULL)
       AND om.role_id IN (${ph}) LIMIT 1`
  ).bind(userId, ...PLATFORM_OPS_ROLE_IDS).first<{ ok: number }>();
  return Boolean(row?.ok);
}
export async function userBelongsToOrg(db: D1Database, userId: string, orgId: string): Promise<boolean> {
  const row = await db.prepare(
    `SELECT 1 AS ok FROM organization_members om INNER JOIN organizations o ON o.id = om.organization_id
     WHERE om.user_id = ? AND om.organization_id = ? AND om.status = 'ACTIVE' AND (o.deleted_at IS NULL) LIMIT 1`
  ).bind(userId, orgId).first<{ ok: number }>();
  return Boolean(row?.ok);
}
