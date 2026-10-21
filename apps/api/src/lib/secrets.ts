async function deriveKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret.padEnd(32, "0").slice(0, 32)), "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function encryptSecret(plaintext: string, sessionSecret: string): Promise<string> {
  const key = await deriveKey(sessionSecret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  const buf = new Uint8Array(iv.byteLength + ct.byteLength);
  buf.set(iv, 0); buf.set(new Uint8Array(ct), iv.byteLength);
  return btoa(String.fromCharCode(...buf));
}
export async function decryptSecret(ciphertextB64: string, sessionSecret: string): Promise<string> {
  const raw = Uint8Array.from(atob(ciphertextB64), (c) => c.charCodeAt(0));
  const key = await deriveKey(sessionSecret);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: raw.slice(0, 12) }, key, raw.slice(12));
  return new TextDecoder().decode(pt);
}
