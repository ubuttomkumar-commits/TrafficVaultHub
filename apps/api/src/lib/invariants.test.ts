import { describe, it, expect } from "vitest";
import { PLATFORM_OPS_ROLE_IDS } from "./rbac";
import { encryptSecret, decryptSecret } from "./secrets";
import { OFFER_STATUSES, API_PREFIX } from "@trafficvaulthub/shared";
describe("invariants", () => {
  it("platform roles", () => expect(PLATFORM_OPS_ROLE_IDS).toHaveLength(3));
  it("statuses", () => { expect(OFFER_STATUSES).toContain("LIVE"); expect(OFFER_STATUSES).toContain("COMPLIANCE_HOLD"); });
  it("api prefix", () => expect(API_PREFIX).toBe("/api/v1"));
  it("secret roundtrip", async () => {
    const s = "session-secret-for-tests!!!!";
    expect(await decryptSecret(await encryptSecret("hmac-value", s), s)).toBe("hmac-value");
  });
});
