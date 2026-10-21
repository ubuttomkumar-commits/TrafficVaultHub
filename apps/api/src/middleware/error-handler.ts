import type { ErrorHandler } from "hono";
import type { Env } from "../env";

/**
 * Consistent, safe error responses.
 * Never leak secrets, stack traces, or internal details to clients.
 */
export const errorHandler: ErrorHandler<{ Bindings: Env }> = (err, c) => {
  const correlationId = c.get("correlationId") ?? "unknown";
  console.error(`[${correlationId}]`, err);

  // Zod / validation style errors
  if (err && typeof err === "object" && "name" in err && err.name === "ZodError") {
    return c.json(
      {
        error: {
          code: "validation_error",
          message: "Invalid request",
          details: (err as { issues?: unknown }).issues,
          correlationId,
        },
      },
      400
    );
  }

  // HTTPException from Hono
  if (err && typeof err === "object" && "status" in err && typeof (err as { status: number }).status === "number") {
    const status = (err as { status: number; message?: string }).status;
    const message = (err as { message?: string }).message ?? "Request failed";
    return c.json(
      {
        error: {
          code: "http_error",
          message,
          correlationId,
        },
      },
      status as 400
    );
  }

  return c.json(
    {
      error: {
        code: "internal_error",
        message: "An unexpected error occurred",
        correlationId,
      },
    },
    500
  );
};
