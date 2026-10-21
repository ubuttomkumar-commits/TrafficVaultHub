# Phase A — Repository & Cloudflare Audit

**Date:** 2026-10-21  
**PRD:** v5.0  
**Sources:** GitHub `ubuttomkumar-commits/TrafficVaultHub` @ `91e7292`, Cloudflare account `fa6ffb91f755b6a7066cd0cf4ce70556`

---

## 1. Existing implementations

### A. Git repository (code)

| Area | Status |
|------|--------|
| Monorepo scaffold | Present (apps/web, apps/api, packages/shared) |
| Hono API | Health + offer-categories read (graceful if table missing) |
| React UI | Home, Categories, Health (design foundation) |
| Auth / sessions | **Not in git** |
| Offer CRUD / lifecycle | **Not in git** |
| Tracking / postbacks | **Not in git** |
| Ledger posting | **Not in git** |
| Publisher / advertiser dashboards | **Not in git** |
| Tests | **None** |
| CI workflow | Omitted from push (token lacked `workflow` scope) |

### B. Cloudflare D1 `trafficvaulthub-dev` (schema)

**49 tables** applied via migrations `0001`–`0009` (2026-10-09):

| Domain | Tables (examples) |
|--------|-------------------|
| Identity | `users`, `user_credentials`, `sessions`, `auth_tokens`, `auth_events` |
| RBAC | `roles` (14 seeded), `permissions`, `role_permissions`, `role_org_types` |
| Orgs | `organizations`, `organization_members` |
| Advertisers / affiliates | `advertiser_profiles`, `affiliate_profiles`, status transitions, traffic sources |
| Offers | `offers`, `offer_versions`, `offer_version_targeting`, `offer_status_transitions`, `offer_cap_counters` |
| Tracking | `clicks`, `tracking_links`, `smartlinks`, `smartlink_offers`, `attributions`, `attribution_policies`, `postback_nonces` |
| Conversions | `conversions`, `conversion_status_history`, `conversion_holds`, `conversion_reversals` |
| Fraud / compliance | `fraud_*`, `compliance_*` |
| Finance | `ledger_accounts`, `journal_entries` |
| Ops | `audit_logs`, `reconciliation_*` |

**Data:** roles=14, permissions≈38; **0** organizations, users, offers, conversions, clicks, ledger rows (empty operational data).

**Missing vs PRD §3:** no `offer_categories` / `category_policy_versions` tables. Offers use free-text `vertical` only.

### C. Cloudflare runtime

| Resource | IDs / notes |
|----------|-------------|
| D1 dev / staging / prod | Present (see STATE.md) |
| KV cache env namespaces | Present |
| Queues `trafficvaulthub-events-*` | Present |
| Worker `trafficvaulthub` | Exists; subdomain enabled; settings bindings list empty in API response |
| R2 | **Not enabled** on account |

Worker **source is not in this git repo**. Deploying this scaffold under the same script name would replace whatever is currently uploaded.

---

## 2. Reusable components

| Component | Reuse decision |
|-----------|----------------|
| D1 offers / offer_versions / conversions / clicks | **Reuse** — do not recreate |
| ledger_accounts / journal_entries | **Reuse** as double-entry ledger |
| roles / permissions / sessions | **Reuse** for RBAC/auth |
| fraud_* / compliance_* | **Reuse** for quality shield / restricted categories |
| Scaffold Hono middleware (correlation, errors) | Keep; extend |
| Scaffold React shell / design tokens | Keep; extend |
| Scaffold migrations `0001`/`0002` | **Do not apply to remote D1** — conflict with deployed schema |

---

## 3–4. Publisher / advertiser problems

| Problem area | Solved in production data/code? | Notes |
|--------------|----------------------------------|-------|
| Explainable rejections | Schema partially (`conversion_status_history`, reason fields) | No API/UI in git |
| Earnings transparency | Ledger tables exist, empty | No earnings API/UI |
| Offer discovery | offers + versions schema | No marketplace UI; no categories table |
| Tracking / postbacks | clicks, postback_nonces, attributions | No worker handlers in git |
| Cap / budget protection | offer_cap_counters, offer_versions caps | No Durable Object / enforcement code in git |
| Fraud / compliance queues | Tables exist | No case-management UI in git |
| Auth | sessions, credentials tables | No login flow in git |

**All product surfaces remain unresolved in application code.** Schema is the main asset.

---

## 5. Database & migration risks

1. **Applying scaffold `0001_initial_schema.sql` to remote D1 will fail or diverge** (duplicate table names, different shapes: e.g. offer statuses `draft` vs `DRAFT`/`LIVE`).
2. Remote uses uppercase status enums and richer offer lifecycle — git shared types use lowercase PRD names. **Align types to remote schema**, not the reverse.
3. Additive-only migrations required (`CREATE TABLE IF NOT EXISTS` for genuinely missing objects).
4. Zero operational data — safe for additive schema work; not safe to claim “production traffic handled.”

---

## 6. Tracking, finance, security risks

| Risk | Level | Note |
|------|-------|------|
| No auth on API routes in scaffold | **High** | Any deploy without auth is open |
| Overwriting worker without source backup | **High** | Existing script not in git |
| Ledger posting not implemented | **High** | Tables only |
| Floating-point money | Controlled | Remote uses `*_minor` integers |
| R2 evidence storage | Blocked | R2 not enabled |
| Token exposure in chat | **High** | Rotate Cloudflare + GitHub PATs |

---

## 7. Exact files requiring changes (near term)

| File | Reason |
|------|--------|
| `migrations/0003_offer_categories.sql` | **New** — additive categories only |
| `apps/api/src/routes/categories.ts` | Query real columns; admin later |
| `packages/shared/src/index.ts` | Align offer status enums with remote |
| `apps/api/wrangler.toml` | Already bound to real IDs |
| `STATE.md` | Traceability |
| **Do not** re-run `0001`/`0002` on remote | Conflict |

---

## 8. Prioritized implementation units

1. **B1** — Additive `offer_categories` + seed on **dev** only; public `GET /api/v1/offer-categories`
2. **B2** — Align shared types with remote status enums
3. **D1** — Session auth middleware reusing `sessions` / `users` tables (no parallel auth system)
4. **C1** — Read-only offers list from existing `offers` + `offer_versions`
5. **H0** — Do not deploy to production until auth exists
6. Publisher/advertiser UI only after read APIs return real shapes

---

## 9. Baseline test / build results

| Check | Result |
|-------|--------|
| `npm install` (this environment) | Works on normal FS; FUSE path unreliable |
| Automated tests | **None exist** — not run |
| Typecheck / build | Not green-proven in CI (no workflow on remote) |
| Remote D1 query | **OK** (API token) |
| GitHub push | **OK** (`91e7292`) |
| Production readiness | **Not claimed** |

---

## Decision

Treat **Cloudflare D1 schema + RBAC seed** as the system of record. Treat **this git repo** as the application source starting point. Implement only additive, compatible changes. Do not duplicate ledger, offers, conversions, or auth tables.
