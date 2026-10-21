import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing and verification", () => {
  it("hashes password and verifies successfully with valid credentials", async () => {
    const pwd = "SecureAffiliatePassword2026!";
    const { hash, algorithm } = await hashPassword(pwd);

    expect(algorithm).toBe("pbkdf2-sha256");
    expect(hash).toMatch(/^pbkdf2\$sha256\$i=100000\$.+\$.+$/);

    const isValid = await verifyPassword(pwd, hash, algorithm);
    expect(isValid).toBe(true);
  });

  it("fails verification with incorrect password", async () => {
    const pwd = "CorrectPassword123!";
    const { hash, algorithm } = await hashPassword(pwd);

    const isInvalid = await verifyPassword("WrongPassword456!", hash, algorithm);
    expect(isInvalid).toBe(false);
  });

  it("fails closed on corrupted or unsupported format", async () => {
    expect(await verifyPassword("test", "corrupted$hash", "unknown")).toBe(false);
    expect(await verifyPassword("test", "pbkdf2$md5$i=10000$salt$hash", "pbkdf2-md5")).toBe(false);
    expect(await verifyPassword("test", "pbkdf2$sha256$i=100$salt$hash", "pbkdf2-sha256")).toBe(false);
  });
});
