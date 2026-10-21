import { describe, it, expect } from "vitest";

const VALID_REVERSAL_REASONS = [
  "REFUND",
  "CHARGEBACK",
  "FRAUD_CONFIRMED",
  "ADVERTISER_DISPUTE",
  "DUPLICATE_DETECTED_LATE",
  "COMPLIANCE_VIOLATION",
  "MANUAL_CORRECTION",
] as const;

function validateIdempotencyKey(orgId: string, externalConversionId: string): string {
  if (!orgId.trim() || !externalConversionId.trim()) {
    throw new Error("Missing organization or conversion ID");
  }
  return `idemp:${orgId.trim()}:${externalConversionId.trim()}`;
}

function checkClickVelocityAnomaly(
  clickTimestamps: number[],
  windowMs: number,
  burstThreshold: number
): boolean {
  if (clickTimestamps.length < burstThreshold) return false;
  const now = clickTimestamps[clickTimestamps.length - 1];
  const recentClicks = clickTimestamps.filter((ts) => now - ts <= windowMs);
  return recentClicks.length >= burstThreshold;
}

describe("fraud quality shield and reversal invariants", () => {
  it("enforces recognized reversal reason codes", () => {
    expect(VALID_REVERSAL_REASONS).toContain("FRAUD_CONFIRMED");
    expect(VALID_REVERSAL_REASONS).toContain("CHARGEBACK");
    expect(VALID_REVERSAL_REASONS).toContain("ADVERTISER_DISPUTE");
    expect(VALID_REVERSAL_REASONS).toContain("COMPLIANCE_VIOLATION");
    expect(VALID_REVERSAL_REASONS).toContain("REFUND");
  });

  it("constructs deterministic idempotency keys for S2S postbacks", () => {
    const key1 = validateIdempotencyKey("org_affiliate_1", "conv_tx_9921");
    const key2 = validateIdempotencyKey("org_affiliate_1", "conv_tx_9921");
    const key3 = validateIdempotencyKey("org_affiliate_2", "conv_tx_9921");

    expect(key1).toBe("idemp:org_affiliate_1:conv_tx_9921");
    expect(key1).toBe(key2);
    expect(key1).not.toBe(key3); // Tenant isolated
  });

  it("detects rapid click velocity bursts exceeding safety thresholds", () => {
    const baseTime = Date.now();
    // 10 clicks within 500ms
    const burstTimestamps = Array.from({ length: 10 }, (_, i) => baseTime + i * 40);

    const isAnomaly = checkClickVelocityAnomaly(burstTimestamps, 1000, 8);
    expect(isAnomaly).toBe(true);

    // Normal organic spacing
    const organicTimestamps = [
      baseTime,
      baseTime + 15000,
      baseTime + 32000,
      baseTime + 48000,
    ];
    const isOrganic = checkClickVelocityAnomaly(organicTimestamps, 1000, 8);
    expect(isOrganic).toBe(false);
  });
});
