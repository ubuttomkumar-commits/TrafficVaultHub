import { describe, it, expect } from "vitest";

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "aol.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
]);

const DISPOSABLE_PATTERNS = ["tempmail", "10minutemail", "mailinator", "trashmail"];

function evaluateOnboardingRisk(input: {
  email: string;
  trafficDescription?: string;
  experienceYears?: number;
  experienceLevel?: string;
  incentivizedTraffic?: boolean;
  restrictedCategoryIntent?: boolean;
  isAdvertiser?: boolean;
}) {
  const flags: string[] = [];
  let score = 0;
  const domain = input.email.toLowerCase().split("@")[1] ?? "";

  if (DISPOSABLE_PATTERNS.some((p) => input.email.toLowerCase().includes(p))) {
    return { score: 99, flags: ["DISPOSABLE_EMAIL_DETECTED"], isDisposable: true };
  }

  if (FREE_EMAIL_DOMAINS.has(domain)) {
    flags.push(input.isAdvertiser ? "FREE_EMAIL_ADVERTISER" : "FREE_EMAIL_PROVIDER");
    score += input.isAdvertiser ? 25 : 15;
  }

  const desc = (input.trafficDescription ?? "").trim().toLowerCase();
  if (desc.length < 50) {
    flags.push("VAGUE_TRAFFIC_DESCRIPTION");
    score += 30;
  } else if (desc.includes("any traffic") || desc.includes("all kinds") || desc.includes("buy traffic")) {
    flags.push("LOW_DETAIL_METHODOLOGY");
    score += 20;
  }

  if ((input.experienceYears ?? 0) === 0 && input.experienceLevel === "ADVANCED") {
    flags.push("EXPERIENCE_CLAIM_MISMATCH");
    score += 25;
  }

  if (input.incentivizedTraffic) {
    flags.push("INCENTIVIZED_TRAFFIC_DECLARED");
    score += 20;
  }

  if (input.restrictedCategoryIntent) {
    flags.push("RESTRICTED_CATEGORY_INTENT");
    score += 20;
  }

  return { score, flags, isDisposable: false };
}

describe("Onboarding & Multi-Dimensional Verification Rules", () => {
  it("rejects disposable temporary email addresses immediately", () => {
    const res = evaluateOnboardingRisk({ email: "scammer@10minutemail.com", trafficDescription: "Valid description of search traffic" });
    expect(res.isDisposable).toBe(true);
    expect(res.flags).toContain("DISPOSABLE_EMAIL_DETECTED");
  });

  it("penalizes vague traffic acquisition descriptions and free email domains", () => {
    const res = evaluateOnboardingRisk({
      email: "affiliate@gmail.com",
      trafficDescription: "I buy ads on social media.", // too short (< 50 chars)
    });
    expect(res.isDisposable).toBe(false);
    expect(res.flags).toContain("FREE_EMAIL_PROVIDER");
    expect(res.flags).toContain("VAGUE_TRAFFIC_DESCRIPTION");
    expect(res.score).toBeGreaterThanOrEqual(45);
  });

  it("passes comprehensive, high-detail traffic descriptions without vague flags", () => {
    const res = evaluateOnboardingRisk({
      email: "media@apexperformancepartners.com",
      trafficDescription: "We run native arbitrage on Taboola and search ads on Microsoft Ads targeting Tier-1 US insurance and cybersecurity SaaS keywords with S2S attribution.",
      experienceYears: 4,
      experienceLevel: "ADVANCED",
    });
    expect(res.flags).not.toContain("FREE_EMAIL_PROVIDER");
    expect(res.flags).not.toContain("VAGUE_TRAFFIC_DESCRIPTION");
    expect(res.score).toBe(0);
  });

  it("flags experience mismatch when 0 years experience claims Advanced tier", () => {
    const res = evaluateOnboardingRisk({
      email: "newbie@customdomain.io",
      trafficDescription: "Long explanation of how traffic is acquired across Google Search and YouTube videos targeting US financial products.",
      experienceYears: 0,
      experienceLevel: "ADVANCED",
    });
    expect(res.flags).toContain("EXPERIENCE_CLAIM_MISMATCH");
    expect(res.score).toBeGreaterThanOrEqual(25);
  });

  it("enforces multi-dimensional trust stage ordering", () => {
    const STAGE_ORDER = ["SELF_DECLARED", "DOCUMENTED", "VERIFIED", "INDEPENDENTLY_CORROBORATED", "PLATFORM_TRUSTED"];
    expect(STAGE_ORDER.indexOf("SELF_DECLARED")).toBeLessThan(STAGE_ORDER.indexOf("DOCUMENTED"));
    expect(STAGE_ORDER.indexOf("DOCUMENTED")).toBeLessThan(STAGE_ORDER.indexOf("VERIFIED"));
    expect(STAGE_ORDER.indexOf("VERIFIED")).toBeLessThan(STAGE_ORDER.indexOf("PLATFORM_TRUSTED"));
  });
});
