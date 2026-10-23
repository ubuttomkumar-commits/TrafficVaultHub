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

/**
 * Constant-time string comparison to prevent timing attacks on cryptographic hashes, secrets, and OTPs.
 * Uses Web Crypto timingSafeEqual when buffer lengths match, and executes equal-cost comparison
 * on length mismatch to resist execution-duration timing analysis.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBuf = enc.encode(a);
  const bBuf = enc.encode(b);
  if (aBuf.byteLength !== bBuf.byteLength) {
    // Run comparison against self to equalize execution time before returning false
    crypto.subtle.timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return crypto.subtle.timingSafeEqual(aBuf, bBuf);
}

export function constantTimeEqual(a: string, b: string): boolean {
  return timingSafeEqualString(a, b);
}
