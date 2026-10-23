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

  // Use Node.js crypto.timingSafeEqual if available and buffer lengths match
  if (typeof (globalThis as any).crypto !== "undefined" && typeof (globalThis as any).crypto.timingSafeEqual === "function") {
    if (aBuf.byteLength !== bBuf.byteLength) {
      (globalThis as any).crypto.timingSafeEqual(aBuf, aBuf);
      return false;
    }
    return (globalThis as any).crypto.timingSafeEqual(aBuf, bBuf);
  }

  // Portable constant-time byte comparison across Cloudflare Workers & Vitest environments
  const len = Math.max(aBuf.length, bBuf.length);
  let diff = aBuf.length ^ bBuf.length;
  for (let i = 0; i < len; i++) {
    const byteA = i < aBuf.length ? aBuf[i] : 0;
    const byteB = i < bBuf.length ? bBuf[i] : 0;
    diff |= byteA ^ byteB;
  }
  return diff === 0;
}

export function constantTimeEqual(a: string, b: string): boolean {
  return timingSafeEqualString(a, b);
}
