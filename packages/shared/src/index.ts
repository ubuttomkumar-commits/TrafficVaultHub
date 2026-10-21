/**
 * @trafficvaulthub/shared
 * Types aligned with deployed D1 schema (migrations 0001–0009 + additive categories).
 */

export const PRODUCT_NAME = "TrafficVaultHub" as const;
export const PRODUCT_TAGLINE = "The CPA Network That Shows Its Work" as const;
export const PRODUCT_PROMISE =
  "Every Click Accounted For. Every Decision Explained. Every Valid Payout Tracked." as const;

export const API_PREFIX = "/api/v1" as const;

/** Remote D1 offers.status */
export const OFFER_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "LIVE",
  "PAUSED",
  "CAP_REACHED",
  "BUDGET_EXHAUSTED",
  "TRACKING_ISSUE",
  "COMPLIANCE_HOLD",
  "EXPIRED",
  "ARCHIVED",
] as const;
export type OfferStatus = (typeof OFFER_STATUSES)[number];

export const OFFER_ACCESS_MODES = [
  "PUBLIC",
  "APPLICATION_REQUIRED",
  "PRIVATE",
  "INVITE_ONLY",
  "AFFILIATE_SPECIFIC",
] as const;
export type OfferAccessMode = (typeof OFFER_ACCESS_MODES)[number];

/** offer_versions.payout_type */
export const PAYOUT_TYPES = [
  "CPA",
  "CPL",
  "CPC",
  "CPI",
  "CPM",
  "CPS",
  "REVSHARE",
] as const;
export type PayoutType = (typeof PAYOUT_TYPES)[number];

/** conversions.status (remote) */
export const CONVERSION_STATUSES = [
  "RECEIVED",
  "VALIDATING",
  "PENDING",
  "REJECTED",
  "FRAUD_REVIEW",
] as const;
export type ConversionStatus = (typeof CONVERSION_STATUSES)[number];

export const USER_STATUSES = [
  "ACTIVE",
  "RESTRICTED",
  "SUSPENDED",
  "TERMINATED",
] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const RISK_CLASSIFICATIONS = [
  "standard",
  "elevated",
  "restricted",
  "prohibited",
] as const;
export type RiskClassification = (typeof RISK_CLASSIFICATIONS)[number];

export type Money = {
  amount: number;
  currency: string;
};

export function formatMoney(m: Money, locale = "en-US"): string {
  const major = m.amount / 100;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: m.currency,
  }).format(major);
}

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
};

export type ApiErrorBody = {
  error: {
    code: string;
    message: string;
    details?: unknown;
    correlationId?: string;
  };
};
