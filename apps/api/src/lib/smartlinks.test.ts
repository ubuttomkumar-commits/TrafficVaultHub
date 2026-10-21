import { describe, it, expect } from "vitest";

type TargetCandidate = {
  offerId: string;
  weight: number;
  status: string;
  destinationUrl: string | null;
};

function resolveSmartlinkTarget(targets: TargetCandidate[], randomValue: number): TargetCandidate | null {
  const live = targets.filter((t) => t.status === "LIVE" && t.destinationUrl && t.weight > 0);
  if (live.length === 0) return null;

  const totalWeight = live.reduce((sum, t) => sum + t.weight, 0);
  let threshold = randomValue * totalWeight;

  for (const target of live) {
    threshold -= target.weight;
    if (threshold <= 0) {
      return target;
    }
  }

  return live[live.length - 1];
}

describe("smartlinks weighted routing algorithms", () => {
  const sampleTargets: TargetCandidate[] = [
    { offerId: "off_alpha", weight: 70, status: "LIVE", destinationUrl: "https://alpha.example.com" },
    { offerId: "off_beta", weight: 30, status: "LIVE", destinationUrl: "https://beta.example.com" },
    { offerId: "off_paused", weight: 50, status: "PAUSED", destinationUrl: "https://paused.example.com" },
  ];

  it("filters out non-LIVE offers from routing pool", () => {
    // Total live weight is 70 + 30 = 100
    // At randomValue = 0.1 (10% into 100) -> off_alpha
    const pick1 = resolveSmartlinkTarget(sampleTargets, 0.1);
    expect(pick1?.offerId).toBe("off_alpha");

    // At randomValue = 0.85 (85% into 100) -> off_beta
    const pick2 = resolveSmartlinkTarget(sampleTargets, 0.85);
    expect(pick2?.offerId).toBe("off_beta");
  });

  it("never routes to paused or non-eligible offers", () => {
    for (let r = 0; r <= 1.0; r += 0.05) {
      const picked = resolveSmartlinkTarget(sampleTargets, r);
      expect(picked?.status).toBe("LIVE");
      expect(picked?.offerId).not.toBe("off_paused");
    }
  });

  it("returns null when no targets are LIVE with valid destination URLs", () => {
    const inactiveTargets: TargetCandidate[] = [
      { offerId: "off_1", weight: 10, status: "PAUSED", destinationUrl: "https://example.com" },
      { offerId: "off_2", weight: 10, status: "LIVE", destinationUrl: null },
    ];
    expect(resolveSmartlinkTarget(inactiveTargets, 0.5)).toBeNull();
  });
});
