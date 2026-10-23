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
      `SELECT id, slug, name, description, parent_id, sort_order, is_active, risk_classification
       FROM offer_categories
       WHERE is_active = 1
       ORDER BY sort_order ASC, name ASC`
    ).all();
    return c.json({ data: results ?? [], correlationId });
  } catch (err) {
    console.warn(`[${correlationId}] offer_categories query failed:`, err);
    return c.json({
      data: [],
      message: "Category catalog not yet initialized. Apply migrations.",
      correlationId,
    });
  }
});

categoryRoutes.get("/admin", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Platform operator role required",
          correlationId,
        },
      },
      403
    );
  }
  try {
    const { results } = await c.env.DB.prepare(
      `SELECT id, slug, name, description, parent_id, sort_order, is_active, risk_classification, created_at, updated_at
       FROM offer_categories
       ORDER BY sort_order ASC, name ASC`
    ).all();
    return c.json({ data: results ?? [], correlationId });
  } catch {
    return c.json(
      {
        error: {
          code: "catalog_unavailable",
          message: "Categories unavailable",
          correlationId,
        },
      },
      503
    );
  }
});

categoryRoutes.post("/admin", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Platform operator role required",
          correlationId,
        },
      },
      403
    );
  }

  let body: {
    name?: string;
    slug?: string;
    description?: string;
    parent_id?: string | null;
    sort_order?: number;
    risk_classification?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: {
          code: "invalid_json",
          message: "JSON required",
          correlationId,
        },
      },
      400
    );
  }

  const name = (body.name ?? "").trim();
  if (!name) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "name required",
          correlationId,
        },
      },
      400
    );
  }

  const slug = (body.slug || name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  const risk = (body.risk_classification || "standard").toLowerCase();
  if (!RISK.has(risk)) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "invalid risk classification",
          correlationId,
        },
      },
      400
    );
  }

  const parentId = body.parent_id?.trim() || null;
  if (parentId) {
    const parent = await c.env.DB.prepare(
      `SELECT id FROM offer_categories WHERE id = ? LIMIT 1`
    )
      .bind(parentId)
      .first();
    if (!parent) {
      return c.json(
        {
          error: {
            code: "parent_not_found",
            message: "Specified parent category does not exist",
            correlationId,
          },
        },
        400
      );
    }
  }

  const sortOrder = Number.isInteger(body.sort_order) ? Number(body.sort_order) : 0;
  const description = body.description?.trim() || null;
  const id = crypto.randomUUID();

  try {
    await c.env.DB.prepare(
      `INSERT INTO offer_categories (
         id, slug, name, description, parent_id, sort_order, is_active, risk_classification, policy_version
       ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, 1)`
    )
      .bind(id, slug, name, description, parentId, sortOrder, risk)
      .run();

    return c.json(
      {
        data: {
          id,
          slug,
          name,
          description,
          parent_id: parentId,
          sort_order: sortOrder,
          risk_classification: risk,
          is_active: 1,
        },
        correlationId,
      },
      201
    );
  } catch (err) {
    console.error(`[${correlationId}] create category failed:`, err);
    return c.json(
      {
        error: {
          code: "conflict",
          message: "Category creation failed (slug may be duplicated)",
          correlationId,
        },
      },
      409
    );
  }
});

categoryRoutes.patch("/admin/:id", requireAuth(), async (c) => {
  const correlationId = c.get("correlationId");
  const user = c.get("user")!;
  if (!(await isPlatformOperator(c.env.DB, user.id))) {
    return c.json(
      {
        error: {
          code: "forbidden",
          message: "Platform operator role required",
          correlationId,
        },
      },
      403
    );
  }

  const id = c.req.param("id");
  let body: {
    name?: string;
    description?: string | null;
    parent_id?: string | null;
    sort_order?: number;
    is_active?: number | boolean;
    risk_classification?: string;
  };

  try {
    body = await c.req.json();
  } catch {
    return c.json(
      {
        error: {
          code: "invalid_json",
          message: "JSON required",
          correlationId,
        },
      },
      400
    );
  }

  const existing = await c.env.DB.prepare(
    `SELECT id, parent_id FROM offer_categories WHERE id = ? LIMIT 1`
  )
    .bind(id)
    .first<{ id: string; parent_id: string | null }>();

  if (!existing) {
    return c.json(
      {
        error: {
          code: "not_found",
          message: "Category not found",
          correlationId,
        },
      },
      404
    );
  }

  let newParentId = existing.parent_id;
  if (body.parent_id !== undefined) {
    const candidate = body.parent_id?.trim() || null;
    if (candidate === id) {
      return c.json(
        {
          error: {
            code: "cycle_detected",
            message: "A category cannot be its own parent",
            correlationId,
          },
        },
        400
      );
    }

    if (candidate) {
      // Cycle detection: walk upward from candidate to make sure id is not an ancestor
      let curr: string | null = candidate;
      let depth = 0;
      while (curr && depth < 20) {
        if (curr === id) {
          return c.json(
            {
              error: {
                code: "cycle_detected",
                message: "Circular parent-child relationship detected",
                correlationId,
              },
            },
            400
          );
        }
        const parentRow: { parent_id: string | null } | null =
          await c.env.DB.prepare(
            `SELECT parent_id FROM offer_categories WHERE id = ? LIMIT 1`
          )
            .bind(curr)
            .first<{ parent_id: string | null }>();
        if (!parentRow) {
          return c.json(
            {
              error: {
                code: "parent_not_found",
                message: "Specified parent category does not exist",
                correlationId,
              },
            },
            400
          );
        }
        curr = parentRow.parent_id;
        depth++;
      }
      newParentId = candidate;
    } else {
      newParentId = null;
    }
  }

  const isActive =
    body.is_active === undefined
      ? null
      : body.is_active === true || body.is_active === 1
        ? 1
        : 0;

  if (body.risk_classification && !RISK.has(body.risk_classification.toLowerCase())) {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "invalid risk classification",
          correlationId,
        },
      },
      400
    );
  }

  await c.env.DB.prepare(
    `UPDATE offer_categories SET
       name = COALESCE(?, name),
       description = CASE WHEN ? = 1 THEN ? ELSE description END,
       parent_id = CASE WHEN ? = 1 THEN ? ELSE parent_id END,
       sort_order = COALESCE(?, sort_order),
       is_active = COALESCE(?, is_active),
       risk_classification = COALESCE(?, risk_classification),
       updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
     WHERE id = ?`
  )
    .bind(
      body.name?.trim() ?? null,
      body.description !== undefined ? 1 : 0,
      body.description?.trim() ?? null,
      body.parent_id !== undefined ? 1 : 0,
      newParentId,
      body.sort_order !== undefined ? Number(body.sort_order) : null,
      isActive,
      body.risk_classification?.toLowerCase() ?? null,
      id
    )
    .run();

  const updated = await c.env.DB.prepare(
    `SELECT * FROM offer_categories WHERE id = ? LIMIT 1`
  )
    .bind(id)
    .first();

  return c.json({ data: updated, correlationId });
});
