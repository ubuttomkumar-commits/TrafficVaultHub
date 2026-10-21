import { describe, it, expect } from "vitest";
import { OFFER_STATUSES, CONVERSION_STATUSES, PAYOUT_TYPES } from "@trafficvaulthub/shared";

describe("shared domain invariants used by caps/lifecycle", () => {
  it("includes CAP_REACHED and COMPLIANCE_HOLD", () => {
    expect(OFFER_STATUSES).toContain("CAP_REACHED");
    expect(OFFER_STATUSES).toContain("COMPLIANCE_HOLD");
    expect(OFFER_STATUSES).toContain("BUDGET_EXHAUSTED");
  });

  it("conversion statuses are non-empty", () => {
    expect(CONVERSION_STATUSES.length).toBeGreaterThan(0);
    expect(CONVERSION_STATUSES).toContain("PENDING");
  });

  it("payout types cover core CPA models", () => {
    for (const t of ["CPA", "CPL", "CPI", "CPS"]) {
      expect(PAYOUT_TYPES).toContain(t as (typeof PAYOUT_TYPES)[number]);
    }
  });
});
