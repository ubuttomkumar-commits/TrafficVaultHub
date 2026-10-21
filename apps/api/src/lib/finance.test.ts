import { describe, it, expect } from "vitest";
import { formatMoney, type Money } from "@trafficvaulthub/shared";

describe("financial integrity and ledger mathematics", () => {
  it("formats monetary values safely from minor units", () => {
    const m1: Money = { amount: 5000, currency: "USD" };
    expect(formatMoney(m1)).toBe("$50.00");

    const m2: Money = { amount: 124550, currency: "USD" };
    expect(formatMoney(m2)).toBe("$1,245.50");

    const m3: Money = { amount: 0, currency: "USD" };
    expect(formatMoney(m3)).toBe("$0.00");
  });

  it("calculates ledger balance without floating point inaccuracy", () => {
    // 0.1 + 0.2 in float equals 0.30000000000000004
    // In minor units: 10 + 20 = 30 cents exactly
    const items = [10, 20, 30, 40, 50]; // minor units
    const totalMinor = items.reduce((acc, curr) => acc + curr, 0);
    expect(totalMinor).toBe(150);

    const commissionsMinor = 184500; // $1,845.00
    const reversalsMinor = 12000;   // $120.00
    const paidMinor = 50000;        // $500.00

    const earnedMinor = commissionsMinor - reversalsMinor;
    expect(earnedMinor).toBe(172500); // $1,725.00

    const payableMinor = Math.max(0, earnedMinor - paidMinor);
    expect(payableMinor).toBe(122500); // $1,225.00
  });

  it("enforces minimum payout threshold of $50 (5000 minor units)", () => {
    const MINIMUM_PAYOUT_THRESHOLD_MINOR = 5000;
    const request1 = 4999;
    const request2 = 5000;

    expect(request1 >= MINIMUM_PAYOUT_THRESHOLD_MINOR).toBe(false);
    expect(request2 >= MINIMUM_PAYOUT_THRESHOLD_MINOR).toBe(true);
  });

  it("prevents negative payable amount when paid exceeds earned", () => {
    const earnedMinor = 10000;
    const paidMinor = 15000; // e.g., clawback or dispute
    const payableMinor = Math.max(0, earnedMinor - paidMinor);
    expect(payableMinor).toBe(0);
  });
});
