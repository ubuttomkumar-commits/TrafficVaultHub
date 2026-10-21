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
