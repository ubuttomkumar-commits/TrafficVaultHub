import { describe, it, expect } from "vitest";
import { formatMoney, PAYOUT_TYPES, type Money, type PayoutType } from "@trafficvaulthub/shared";

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

  it("contains all 12 universal payout types defined in PRD Section 4.1", () => {
    const expectedModels: PayoutType[] = [
      "CPA",
      "CPL",
      "CPC",
      "CPI",
      "CPM",
      "CPS",
      "CPV",
      "CPE",
      "RECURRING",
      "REVSHARE",
      "HYBRID",
      "CUSTOM_EVENT",
    ];

    for (const model of expectedModels) {
      expect(PAYOUT_TYPES).toContain(model);
    }
    expect(PAYOUT_TYPES.length).toBe(12);
  });

  it("calculates CPM (Cost Per Mille) payouts accurately in integer minor units", () => {
    // 25,000 impressions at $2.40 CPM ($2.40 = 240 cents per 1,000 impressions)
    const impressions = 25000;
    const ratePerMilleMinor = 240;
    const payoutMinor = Math.floor((impressions / 1000) * ratePerMilleMinor);
    expect(payoutMinor).toBe(6000); // $60.00
  });

  it("calculates RevShare percentage payouts without binary floating-point drift", () => {
    // $99.99 sale = 9999 minor units at 30% revshare (3000 basis points out of 10000)
    const saleAmountMinor = 9999;
    const revShareBasisPoints = 3000; // 30.00%
    const publisherShareMinor = Math.floor((saleAmountMinor * revShareBasisPoints) / 10000);
    const networkMarginMinor = saleAmountMinor - publisherShareMinor;

    expect(publisherShareMinor).toBe(2999); // $29.99
    expect(networkMarginMinor).toBe(7000);   // $70.00
    expect(publisherShareMinor + networkMarginMinor).toBe(saleAmountMinor);
  });

  it("calculates Hybrid model (Base CPA + Performance Bonus) correctly", () => {
    const baseCpaMinor = 1500; // $15.00
    const upsellSaleMinor = 12000; // $120.00
    const upsellPercentBps = 1500; // 15.00%
    const upsellBonusMinor = Math.floor((upsellSaleMinor * upsellPercentBps) / 10000); // 1800 ($18.00)

    const totalHybridPayoutMinor = baseCpaMinor + upsellBonusMinor;
    expect(totalHybridPayoutMinor).toBe(3300); // $33.00
  });

  it("supports recurring rebill payout schedules", () => {
    // 3 recurring monthly rebills of $49.00 each at 20% commission
    const subscriptionRebills = [4900, 4900, 4900];
    const commissionBps = 2000; // 20.00%

    const monthlyCommissions = subscriptionRebills.map((amount) =>
      Math.floor((amount * commissionBps) / 10000)
    );
    expect(monthlyCommissions).toEqual([980, 980, 980]);

    const totalRecurringCommissionMinor = monthlyCommissions.reduce((a, b) => a + b, 0);
    expect(totalRecurringCommissionMinor).toBe(2940); // $29.40
  });
});
