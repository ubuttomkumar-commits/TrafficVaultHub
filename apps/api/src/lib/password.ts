/**
 * Password hashing for user_credentials.
 * Format: pbkdf2$sha256$i=<iterations>$<salt_b64>$<hash_b64>
 * Uses Web Crypto only (Workers-native). hash_algorithm column: "pbkdf2-sha256"
 *
 * No existing credential rows were present when this was introduced; all new
 * hashes use this format. If legacy scrypt rows appear later, add a verifier
 * branch without rewriting historical hashes.
 */

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BYTES = 32;

function b64encode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<ArrayBuffer> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      // BufferSource: pass underlying ArrayBuffer for TS DOM lib compatibility
      salt: salt,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_BYTES * 8
  );
}

export async function hashPassword(password: string): Promise<{
  hash: string;
  algorithm: string;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await pbkdf2(password, salt, ITERATIONS);
  const hash = `pbkdf2$sha256$i=${ITERATIONS}$${b64encode(salt)}$${b64encode(derived)}`;
  return { hash, algorithm: "pbkdf2-sha256" };
}

export async function verifyPassword(
  password: string,
  storedHash: string,
  algorithm: string
): Promise<boolean> {
  if (algorithm === "pbkdf2-sha256" || storedHash.startsWith("pbkdf2$")) {
    const parts = storedHash.split("$");
    // pbkdf2$sha256$i=100000$salt$hash
    if (parts.length !== 5 || parts[0] !== "pbkdf2" || parts[1] !== "sha256") {
      return false;
    }
    const iter = Number(parts[2].replace("i=", ""));
    if (!Number.isFinite(iter) || iter < 10_000) return false;
    const salt = b64decode(parts[3]);
    const expected = b64decode(parts[4]);
    const derived = new Uint8Array(await pbkdf2(password, salt, iter));
    if (derived.length !== expected.length) return false;
    // constant-time compare
    let diff = 0;
    for (let i = 0; i < derived.length; i++) diff |= derived[i] ^ expected[i];
    return diff === 0;
  }

  // Unknown algorithm — fail closed
  console.warn(`Unsupported password algorithm: ${algorithm}`);
  return false;
}
