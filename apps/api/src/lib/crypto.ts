/**
 * Hash helpers for session token lookup.
 * Existing sessions.token_hash is unique; we treat inbound Bearer token as
 * raw secret and store/compare SHA-256 hex (documented for login when added).
 * If legacy rows use a different algorithm, login/session creation must match.
 */

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
