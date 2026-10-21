# TrafficVaultHub — Implementation State

**Last updated:** 2026-10-21  
**PRD version:** v5.0  
**Phase:** A complete (scaffold) → ready for Phase B

---

## 1. Repository status

| Item | Status |
|------|--------|
| Git repository | Initialized (was empty; structure created) |
| Monorepo | npm workspaces (`apps/*`, `packages/*`) |
| Frontend | React 19 + Vite + TypeScript scaffold |
| Backend | Cloudflare Workers + Hono scaffold |
| Database | D1 migrations: initial schema + category seed |
| Shared package | Types, roles, statuses, payout models, reason codes |
| CI | Placeholder workflow (typecheck/build) |
| Auth / RBAC | Not implemented |
| Tracking / postbacks | Not implemented |
| Finance / ledger write path | Schema only |
| Production credentials | None (placeholders in wrangler.toml) |

---

## 2. What exists

### Backend (`apps/api`)
- Hono app with `/api/v1` prefix
- Correlation ID middleware
- Safe error handler (no stack leaks)
- CORS (localhost Vite)
- `GET /api/v1/health` — D1 connectivity check
- `GET /api/v1/offer-categories` — active categories from D1 (graceful empty if unmigrated)
- Wrangler config: D1, KV, R2, Queues, Cron (bindings are placeholders until Cloudflare resources are created)

### Frontend (`apps/web`)
- Dark obsidian / cyan–violet design foundation
- Shell layout (header, nav, footer)
- Home (positioning)
- Categories page (consumes API; no hard-coded catalog)
- System Health page (live API check)
- Vite proxy `/api` → worker

### Shared (`packages/shared`)
- Product constants
- Roles, offer statuses, conversion statuses, payout models, reason codes
- Money type + format helper
- Pagination / API error shapes
- Initial category seed constants (for reference; runtime is DB-driven)

### Migrations
- `0001_initial_schema.sql` — organizations, users, offer_categories, category_policy_versions, offers, offer_payout_rules, clicks, conversions, ledger_accounts, ledger_entries, audit_events
- `0002_seed_categories.sql` — full PRD §3.1 catalog with risk classifications

---

## 3. Explicitly not done (by design)

- Authentication / sessions / Turnstile
- RBAC enforcement on routes
- Offer CRUD / lifecycle transitions
- Payout calculation engine
- Click / postback / conversion processing
- Queue consumers
- Durable Object cap coordinator
- Double-entry posting logic
- Publisher / advertiser dashboards
- Dispute workflows
- Restricted-category compliance queue
- Real payment integrations
- Fabricated metrics or demo financial balances

---

## 4. Baseline commands (post-init)

```bash
npm install
npm run build -w @trafficvaulthub/shared
npm run typecheck
npm run build -w @trafficvaulthub/web
# API typecheck requires wrangler types after first install:
# npm run cf-typegen -w @trafficvaulthub/api
npm run db:migrate:local   # after wrangler is available
```

Results should be recorded here after first successful run.

---

## 5. Next prioritized units (Phase B+)

1. Create real Cloudflare D1 / KV / R2 / Queue resources; update `wrangler.toml` IDs  
2. Category admin API (create / rename / reorder / deactivate / policy version) with auth stubs  
3. Auth foundation (session or JWT + role claims) — server-enforced  
4. Offer draft → review → activate lifecycle with readiness checks  
5. Versioned payout rule create / publish  
6. Click tracking endpoint + attribution window  
7. Postback receiver (signature, idempotency, queue)  

Security and data-integrity dependencies take precedence over visual work.

---

## 6. Residual risks

- `database_id` and resource IDs in `wrangler.toml` are placeholders  
- No automated tests yet beyond structure  
- Local D1 is SQLite; concurrency / Durable Objects behavior differs from production  
- No secret management process documented yet  

---

## 7. Traceability

PRD sections addressed by this scaffold:
- §2 Non-negotiable execution rules (structure only; no rewrite of non-existent code)
- §3 Category system (schema + seed + read API)
- §4 Monetary representation (schema: integer minor units + currency)
- §5 Offer entity skeleton
- §10 Tracking tables (clicks, conversions) — schema only
- §11 Database design (initial tables)
- §12 Frontend foundation + design tokens
- §13 Cloudflare bindings declared
- §18 Phase A — repository structure established

---

## 8. Cloudflare account resources (discovered 2026-10-21)

Account ID: `fa6ffb91f755b6a7066cd0cf4ce70556`

### Existing D1
| Name | ID |
|------|-----|
| trafficvaulthub-dev | 1525d448-4367-402e-af19-cf4a26022f05 |
| trafficvaulthub-staging | 36c9817c-899d-4bb0-846a-a0b393326d6e |
| trafficvaulthub-production | f39fc28f-40ba-49c2-a26c-546eaa9b2352 |

**Important:** `trafficvaulthub-dev` already contains a full production-oriented schema
(offers, conversions, ledger_accounts, journal_entries, fraud_*, compliance_*, sessions, etc.).
Do **not** blindly apply the scaffold migrations (`0001_initial_schema.sql`) against these
databases — they will conflict. Scaffold migrations are for green-field / local only until
a gap matrix reconciles schemas.

### Existing KV
| Title | ID |
|-------|-----|
| trafficvaulthub-cache-dev | 1fa2b2d7578b4f1e846c0c6a4cbdb710 |
| trafficvaulthub-cache-staging | f636ad4c89b04159a4d15c474ebc5ccf |
| trafficvaulthub-cache-production | b1aab1d8918c4500b7f67afbc209dcc2 |

### Existing Queues
- trafficvaulthub-events-dev
- trafficvaulthub-events-staging
- trafficvaulthub-events-production

### Existing Worker
- Script id: `trafficvaulthub` (already deployed)

### R2
- Not enabled on this account. Enable in Dashboard before using evidence storage.

### Security
- API tokens must never be committed. Rotate any token that was shared in chat.

---

## 8. Phase A audit complete (2026-10-21)

See `docs/PHASE_A_AUDIT.md`.

**System of record for schema:** Cloudflare D1 (migrations 0001–0009 + additive 0003 categories on **dev**).

**System of record for application code:** this git repository (scaffold).

### B1 completed on trafficvaulthub-dev
- `offer_categories` + `category_policy_versions` created (additive)
- 56 category rows seeded (PRD §3.1)
- **Not** applied to staging/production yet
- Scaffold migrations `0001`/`0002` must **never** be applied to remote D1

### Explicit non-actions
- Did not overwrite worker `trafficvaulthub` (no auth in scaffold; existing script not in git)
- Did not invent production conversions/earnings
- Did not duplicate offers/conversions/ledger/sessions tables

---

## 9. Unit B2 + C1 + auth middleware (2026-10-21)

### B2 — Shared types aligned to remote D1
- `OFFER_STATUSES`, `OFFER_ACCESS_MODES`, `PAYOUT_TYPES`, `CONVERSION_STATUSES` match deployed CHECKs

### C1 — Read-only offers API
- `GET /api/v1/offers` — LIVE + PUBLIC (or APPLICATION_REQUIRED if session present)
- `GET /api/v1/offers/:id` — same visibility rules; no fabricated metrics
- Uses existing `offers` + `offer_versions` only

### Auth middleware (foundation)
- `optionalAuth` / `requireAuth` against existing `sessions` + `users`
- Bearer token hashed SHA-256 → `sessions.token_hash`
- No parallel auth tables; login endpoint not yet implemented (needs verified scrypt params)

### Frontend
- `/offers` marketplace page (empty until LIVE public offers exist)

### Not done
- Login / password verify
- Deploy to Cloudflare Workers (deferred until login + secrets)
- Staging/prod category seed

---

## 10. Auth unit — login / logout / me / bootstrap (2026-10-21)

### Endpoints
- `POST /api/v1/auth/login` — email+password → session token (7d)
- `POST /api/v1/auth/logout` — revoke session
- `GET /api/v1/auth/me` — current user + org memberships
- `POST /api/v1/auth/bootstrap` — first user only; **blocked when ENVIRONMENT=production**

### Implementation notes
- Reuses `users`, `user_credentials`, `sessions`, `organizations`, `organization_members`, `auth_events`
- Password format: `pbkdf2$sha256$i=100000$salt$hash` (algorithm `pbkdf2-sha256`)
- Session: raw token returned once; stored as SHA-256 hex in `sessions.token_hash`
- Lockout after 8 failed attempts (15 minutes)
- No parallel auth tables

### Not done
- Public registration, MFA, password reset flows
- Worker deploy to Cloudflare

---

## 11. Publisher earnings + click tracking + deploy (2026-10-21)

### APIs
- `GET /api/v1/publisher/earnings` — journal-based totals; pending ≠ payable
- `GET /api/v1/publisher/conversions` — lifecycle-labeled conversion list
- `GET /api/v1/t/:code` — click record + 302 to offer destination

### Deploy
- Worker: `https://trafficvaulthub.uttombarmon45.workers.dev`
- Bound to trafficvaulthub-dev D1, KV, events-dev queue
- Health OK; 56 categories; bootstrap + login verified live

### Residual
- S2S postback processor not yet
- Advertiser campaign APIs not yet
- No production ENVIRONMENT deploy
- Bootstrap admin password must be rotated by operator

---

## 12. S2S postback unit (2026-10-21)

- `GET|POST /api/v1/postbacks/s2s`
- Params: click_id, external_conversion_id, optional event, transaction_id, sale_amount_minor, occurred_at, sig, ts
- Commission always from offer_versions.affiliate_commission_minor
- Idempotent via organization_id + idempotency_key
- Rejects: attribution_window_expired, offer_not_live, invalid_event (recorded as REJECTED with reason_code)
- Optional HMAC when POSTBACK_HMAC_SECRET set
- Queue message conversion.received when CONVERSION_QUEUE bound
- Deployed version aa7245e2 on workers.dev

---

## 13. Conversion approve → ledger post (2026-10-21)

- `POST /api/v1/conversions/:id/approve` — platform Super Admin / Ops / Finance only
- Posts `journal_entries` CONVERSION_COMMISSION on affiliate org
- Ensures `ledger_accounts` AFFILIATE_PAYABLE exists
- Idempotent via `ledger:commission:{conversionId}`
- Lifecycle → LEDGER_POSTED + status history
- `POST /api/v1/conversions/:id/reject` — no ledger credit
- Deployed version a48d9006

---

## 14. Conversion reversal (2026-10-21)

- `POST /api/v1/conversions/:id/reverse`
- Posts CONVERSION_REVERSAL with reverses_journal_id → original CONVERSION_COMMISSION
- Writes conversion_reversals (schema-aligned reason codes)
- Lifecycle → REVERSED; idempotent ledger:reversal:{id}
- Allowed reasons: REFUND, CHARGEBACK, FRAUD_CONFIRMED, ADVERTISER_DISPUTE, DUPLICATE_DETECTED_LATE, COMPLIANCE_VIOLATION, MANUAL_CORRECTION
- Deployed version 4cea4396

---

## 15. Advertiser funding (2026-10-21)

- `GET /api/v1/advertiser/balance?organizationId=`
- `GET /api/v1/advertiser/funding?organizationId=`
- `POST /api/v1/advertiser/funding` — FUNDING journal, ADVERTISER_PREPAID account ensure
- Idempotent; platform finance/ops or advertiser owner/admin/billing roles
- Explicit note: not payment-provider proof
- Deployed version a59526e1

---

## 16. Offer lifecycle (2026-10-21)

- `POST /api/v1/offers` — DRAFT + offer_versions v1
- Transitions: submit-review, approve (platform), activate, pause, resume, reject→DRAFT
- Records offer_status_transitions; LIVE requires destination_url + conversion_event
- Deployed version 093f0952

---

## 17. Frontend on Cloudflare Pages (2026-10-21)

- UI: https://trafficvaulthub.pages.dev
- API: https://trafficvaulthub.uttombarmon45.workers.dev
- VITE_API_BASE points pages build at workers API
- CORS allows *.pages.dev

---

## 18. Tracking links + Login/Earnings UI (2026-10-21)

- POST/GET /api/v1/tracking-links
- UI: /login, /earnings on https://trafficvaulthub.pages.dev
- docs/PRD_STATUS.md — honest complete vs residual matrix
- API worker version e6195cbb

---

## 19. Cap enforcement on postback (2026-10-21)

- apps/api/src/lib/caps.ts — DAILY_CONVERSION, TOTAL_CONVERSION, BUDGET
- Atomic UPDATE … WHERE current_value + delta <= limit_value
- Reject postback with reason cap_reached; pause LIVE → CAP_REACHED
- Residual risk: multi-region races without Durable Objects
- Deployed 731c31e0

---

## 20. Durable Object offer caps (2026-10-21)

- Class OfferCapDO, binding CAPS, migration new_sqlite_classes (free plan)
- idFromName(offerId) — serialized per-offer reservation
- Hydrates from D1; flushes counters after reserve
- Fallback to D1 atomic UPDATE if DO call fails
- Deployed 6b078298 with CAPS binding live

---

## 21. Click caps (2026-10-21)

- DAILY_CLICK / TOTAL_CLICK via OfferCapDO `/reserve-click` + D1 fallback
- Limits from offer_cap_counters.limit_value (ops sets limits on rows)
- GET /api/v1/t/:code returns 429 when click cap reached
- CAP_REACHED pause includes click exhaustion
- Deployed ba42042c

---

## 22. Click caps UI + API (2026-10-21)

- GET/PUT /api/v1/offers/:offerId/caps
- Pages: /offer-caps — load/save daily & lifetime click limits
- Role: advertiser member or platform ops

---

## 23. Premium marketing landing (2026-10-21)

- Full dark/glass landing at /
- Sections: hero, problems/solutions, bento features, how-it-works, payout, trust, differentiators, CTA, footer
- No fabricated metrics; illustrative dashboard labeled as such
- SEO meta + OG/Twitter; prefers-reduced-motion
- Live: https://trafficvaulthub.pages.dev
