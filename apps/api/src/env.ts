/**
 * Cloudflare Worker environment bindings.
 * Keep financial balances and conversion uniqueness out of KV as sole authority.
 */

export type Env = {
  // D1
  DB: D1Database;

  // KV (cache / config only)
  KV: KVNamespace;

  // R2 (private evidence)
  R2: R2Bucket;

  // Queues
  CONVERSION_QUEUE: Queue;

  // Vars
  ENVIRONMENT: string;
  API_VERSION: string;

  // Secrets (injected at runtime)
  SESSION_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
};
