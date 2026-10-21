/**
 * @trafficvaulthub/shared
 * Shared types, constants, and pure utilities used by both API and Web.
 * Keep this package free of runtime side-effects and environment-specific code.
 */

// ---------------------------------------------------------------------------
// Brand & product
// ---------------------------------------------------------------------------
export const PRODUCT_NAME = "TrafficVaultHub" as const;
export const PRODUCT_TAGLINE =
  "The CPA Network That Shows Its Work" as const;
export const PRODUCT_PROMISE =
  "Every Click Accounted For. Every Decision Explained. Every Valid Payout Tracked." as const;

// ---------------------------------------------------------------------------
// API conventions
// ---------------------------------------------------------------------------
export const API_PREFIX = "/api/v1" as const;

// ---------------------------------------------------------------------------
// Roles (least-privilege, server-enforced)
// ---------------------------------------------------------------------------
export const ROLES = [
  "super_admin",
  "admin",
  "support",
  "compliance",
  "finance",
  "advertiser",
  "publisher",
] as const;
export type Role = (typeof ROLES)[number];

// ---------------------------------------------------------------------------
// Offer lifecycle statuses (server-controlled transitions only)
// ---------------------------------------------------------------------------
export const OFFER_STATUSES = [
  "draft",
  "pending_review",
  "active",
  "paused",
  "rejected",
  "expired",
  "archived",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

// ---------------------------------------------------------------------------
// Conversion states
// ---------------------------------------------------------------------------
export const CONVERSION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "reversed",
  "disputed",
] as const;
export type ConversionStatus = (typeof CONVERSION_STATUSES)[number];

// ---------------------------------------------------------------------------
// Supported payout models
// ---------------------------------------------------------------------------
export const PAYOUT_MODELS = [
  "cpa",
  "cpl",
  "cpi",
  "cps",
  "cpv",
  "cpe",
  "cpc",
  "cpm",
  "recurring",
  "revenue_share",
  "hybrid",
  "custom_event",
] as const;
export type PayoutModel = (typeof PAYOUT_MODELS)[number];

// ---------------------------------------------------------------------------
// Standardized rejection / decision reason codes
// ---------------------------------------------------------------------------
export const REASON_CODES = [
  "duplicate_conversion",
  "invalid_event",
  "attribution_window_expired",
  "ineligible_geo",
  "prohibited_traffic_source",
  "advertiser_validation_pending",
  "policy_violation",
  "manual_review_required",
  "reversal_or_refund",
  "tracking_discrepancy",
  "cap_reached",
  "budget_exhausted",
  "ineligible_device",
  "ineligible_os",
  "signature_invalid",
  "replay_detected",
  "idempotency_conflict",
] as const;
export type ReasonCode = (typeof REASON_CODES)[number];

// ---------------------------------------------------------------------------
// Monetary representation helpers (integer minor units)
// ---------------------------------------------------------------------------
export type Money = {
  /** Amount in minor units (e.g. cents for USD) */
  amount: number;
  /** ISO 4217 currency code */
  currency: string;
};

export function formatMoney(m: Money, locale = "en-US"): string {
  const major = m.amount / 100; // default 2-decimal; currency-specific handling later
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
  }).format(major);
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------
export type PaginationParams = {
  page?: number;
  limit?: number;
  cursor?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    nextCursor?: string | null;
  };
};

// ---------------------------------------------------------------------------
// Standard API error shape
// ---------------------------------------------------------------------------
export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    correlationId?: string;
  };
};

// ---------------------------------------------------------------------------
// Category seed (initial catalog — database-driven at runtime)
// ---------------------------------------------------------------------------
export const INITIAL_CATEGORY_SEED = [
  {
    slug: "dating-relationships",
    name: "Dating & Relationships",
    subcategories: [
      "mainstream-dating",
      "adult-dating",
      "matchmaking",
      "relationship-services",
      "dating-applications",
      "dating-memberships",
    ],
  },
  {
    slug: "mobile-apps-software",
    name: "Mobile Applications & Software",
    subcategories: [
      "android-apps",
      "ios-apps",
      "software-downloads",
      "saas",
      "vpn-cybersecurity",
      "productivity-tools",
    ],
  },
  {
    slug: "gaming-entertainment",
    name: "Gaming & Entertainment",
    subcategories: [
      "mobile-games",
      "pc-games",
      "gaming-subscriptions",
      "entertainment-services",
    ],
  },
  {
    slug: "ecommerce-retail",
    name: "E-commerce & Retail",
    subcategories: [
      "physical-products",
      "digital-products",
      "coupons-cashback",
      "subscription-commerce",
    ],
  },
  {
    slug: "finance-business",
    name: "Finance & Business",
    subcategories: [
      "business-leads",
      "eligible-financial-services",
      "accounting-business-software",
      "b2b-saas",
    ],
  },
  {
    slug: "education-employment",
    name: "Education & Employment",
    subcategories: [
      "online-courses",
      "training",
      "recruitment-leads",
      "career-services",
    ],
  },
  {
    slug: "travel-hospitality",
    name: "Travel & Hospitality",
    subcategories: ["travel-bookings", "hotels", "travel-services"],
  },
  {
    slug: "health-wellness-lifestyle",
    name: "Health, Wellness & Lifestyle",
    subcategories: [
      "eligible-healthcare-services",
      "wellness-services",
      "fitness-applications",
    ],
  },
  {
    slug: "home-local-services",
    name: "Home & Local Services",
    subcategories: [
      "home-improvement-leads",
      "local-service-leads",
      "professional-services",
    ],
  },
  {
    slug: "media-content",
    name: "Media & Content",
    subcategories: [
      "content-subscriptions",
      "publishing",
      "eligible-creator-tools",
    ],
  },
  {
    slug: "surveys-research-rewards",
    name: "Surveys, Research & Rewards",
    subcategories: [
      "market-research",
      "surveys",
      "eligible-reward-programs",
    ],
  },
  {
    slug: "other",
    name: "Other",
    subcategories: ["custom-approved-category"],
  },
] as const;
