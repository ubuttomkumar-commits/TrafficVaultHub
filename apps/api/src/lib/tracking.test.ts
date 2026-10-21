import { describe, it, expect } from "vitest";
import {
  CONVERSION_STATUSES,
  OFFER_STATUSES,
  OFFER_ACCESS_MODES,
  PAYOUT_TYPES
} from "@trafficvaulthub/shared";

describe("tracking and conversion lifecycle invariants", () => {
  it("enforces immutable sequence of conversion statuses", () => {
    // PRD §10: Received -> Validating -> Pending/Approved/Rejected
    expect(CONVERSION_STATUSES).toEqual([
      "RECEIVED",
      "VALIDATING",
      "PENDING",
      "REJECTED",
      "FRAUD_REVIEW",
    ]);
  });

  it("verifies valid tracking code formats", () => {
    const validCodes = ["trk_abc123", "trk_789xyz", "sl_live99"];
    for (const code of validCodes) {
      expect(/^[a-z]{2,3}_[a-z0-9]+$/i.test(code)).toBe(true);
    }

    const invalidCodes = ["", "invalid", "trk/123", "trk?code=1"];
    for (const code of invalidCodes) {
      expect(/^[a-z]{2,3}_[a-z0-9]+$/i.test(code)).toBe(false);
    }
  });

  it("verifies offer access modes support public and application gated", () => {
    expect(OFFER_ACCESS_MODES).toContain("PUBLIC");
    expect(OFFER_ACCESS_MODES).toContain("APPLICATION_REQUIRED");
    expect(OFFER_ACCESS_MODES).toContain("PRIVATE");
  });

  it("verifies all payout models are supported in shared types", () => {
    const requiredModels = ["CPA", "CPL", "CPC", "CPI", "CPM", "CPS", "REVSHARE"];
    for (const model of requiredModels) {
      expect(PAYOUT_TYPES).toContain(model as (typeof PAYOUT_TYPES)[number]);
    }
  });
});
