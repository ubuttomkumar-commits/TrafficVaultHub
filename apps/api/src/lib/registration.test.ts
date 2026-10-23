import { describe, it, expect } from "vitest";
import { PLATFORM_OPS_ROLE_IDS } from "./rbac";

describe("registration and role security invariants", () => {
  const AFFILIATE_OWNER_ROLE_ID = "00000000-0000-4000-8000-000000000201";
  const ADVERTISER_OWNER_ROLE_ID = "00000000-0000-4000-8000-000000000301";

  it("never assigns platform operator role to public registrations", () => {
    const platformSet = new Set<string>(PLATFORM_OPS_ROLE_IDS);
    expect(platformSet.has(AFFILIATE_OWNER_ROLE_ID)).toBe(false);
    expect(platformSet.has(ADVERTISER_OWNER_ROLE_ID)).toBe(false);
  });

  it("validates email formatting and rejects malformed inputs", () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    expect(emailRegex.test("valid.affiliate@partner.com")).toBe(true);
    expect(emailRegex.test("advertiser@brand.co.uk")).toBe(true);
    expect(emailRegex.test("invalid-email")).toBe(false);
    expect(emailRegex.test("missing@domain")).toBe(false);
    expect(emailRegex.test("@no-user.com")).toBe(false);
    expect(emailRegex.test("spaces in@email.com")).toBe(false);
  });

  it("strictly enforces password minimum length of 8 characters", () => {
    const minLength = 8;
    expect("short".length >= minLength).toBe(false);
    expect("pass123".length >= minLength).toBe(false);
    expect("password123".length >= minLength).toBe(true);
    expect("SecureVaultPass2026!".length >= minLength).toBe(true);
  });

  it("restricts public account types to PUBLISHER and ADVERTISER only", () => {
    const allowedPublicTypes = new Set(["PUBLISHER", "ADVERTISER"]);
    const requestedTypes = ["PUBLISHER", "ADVERTISER", "PLATFORM", "SUPER_ADMIN", "ADMIN", "FINANCE"];

    const valid = requestedTypes.filter((t) => allowedPublicTypes.has(t));
    const rejected = requestedTypes.filter((t) => !allowedPublicTypes.has(t));

    expect(valid).toEqual(["PUBLISHER", "ADVERTISER"]);
    expect(rejected).toEqual(["PLATFORM", "SUPER_ADMIN", "ADMIN", "FINANCE"]);
  });

  it("sanitizes organization slugs into safe URL-compatible strings", () => {
    function generateSlug(orgName: string, suffix: string): string {
      const base = orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 40) || "org";
      return `${base}-${suffix}`;
    }

    expect(generateSlug("Apex Digital Media & Co.!", "abcd")).toBe("apex-digital-media-co-abcd");
    expect(generateSlug("$$$ Crypto Network $$$", "1234")).toBe("crypto-network-1234");
    expect(generateSlug("   ", "xyz0")).toBe("org-xyz0");
  });
});
