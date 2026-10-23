import { describe, it, expect } from "vitest";
import { generateSecureOtp } from "./email-otp";
import { sha256Hex, constantTimeEqual } from "./crypto";

describe("Email OTP Security & Utility Invariants", () => {
  it("generates uniform 6-digit integer strings", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateSecureOtp();
      expect(code).toMatch(/^\d{6}$/);
      const num = parseInt(code, 10);
      expect(num).toBeGreaterThanOrEqual(100000);
      expect(num).toBeLessThanOrEqual(999999);
    }
  });

  it("produces deterministic SHA-256 hex digests", async () => {
    const code = "849201";
    const hash1 = await sha256Hex(code);
    const hash2 = await sha256Hex(code);
    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64);
  });

  it("enforces constant-time equality and resists tampering", async () => {
    const h1 = await sha256Hex("123456");
    const h2 = await sha256Hex("123456");
    const h3 = await sha256Hex("123457");

    expect(constantTimeEqual(h1, h2)).toBe(true);
    expect(constantTimeEqual(h1, h3)).toBe(false);
    expect(constantTimeEqual(h1, "short")).toBe(false);
    expect(constantTimeEqual("", "")).toBe(true);
  });
});
