# TrafficVaultHub

**The CPA Network That Shows Its Work.**

> Every Click Accounted For. Every Decision Explained. Every Valid Payout Tracked.

Universal multi-tenant CPA / CPL / CPI / CPS / CPV / CPE / CPC / CPM and configurable affiliate marketing platform.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19 + Vite + TypeScript |
| Backend | Cloudflare Workers + Hono |
| Database | Cloudflare D1 |
| Supporting | Queues, R2, KV, Cron Triggers, Durable Objects (planned), Turnstile |
| Shared | `@trafficvaulthub/shared` types & constants |

## Repository layout

```
TrafficVaultHub/
├── apps/
│   ├── web/          # React + Vite frontend
│   └── api/          # Cloudflare Workers + Hono API
├── packages/
│   └── shared/       # Shared types, constants, pure utils
├── migrations/       # D1 SQL migrations (ordered)
├── docs/             # Architecture & operational notes
├── .github/workflows/
├── STATE.md          # Current implementation state
└── package.json      # npm workspaces root
```

## Prerequisites

- Node.js ≥ 20
- npm ≥ 10
- Cloudflare account (for remote D1 / deploy)
- Wrangler (installed via workspace)

## Quick start (local)

```bash
# Install all workspaces
npm install

# Build shared package
npm run build -w @trafficvaulthub/shared

# Apply D1 migrations locally (creates local SQLite)
npm run db:migrate:local

# Terminal 1 — API (Workers)
npm run dev:api

# Terminal 2 — Web (Vite, proxies /api → worker)
npm run dev:web
```

- Web: http://localhost:5173  
- API: http://127.0.0.1:8787  
- Health: http://localhost:5173/health or http://127.0.0.1:8787/api/v1/health  

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev:web` | Vite dev server |
| `npm run dev:api` | Wrangler local worker |
| `npm run build` | Build all workspaces |
| `npm run typecheck` | Typecheck all |
| `npm run test` | Run tests |
| `npm run db:migrate:local` | Apply D1 migrations (local) |
| `npm run db:migrate:remote` | Apply D1 migrations (remote) |
| `npm run deploy` | Deploy API worker |

## Design principles (from PRD)

1. Server-side truth takes precedence over frontend state.
2. Financial records must be auditable and reconcilable (append-only ledger).
3. Verification evidence does not automatically create trust.
4. Risk signals must be explainable and proportionate.
5. Historical offers and conversions retain applicable terms (versioned payout rules).
6. Every privileged decision is attributable.
7. Implement incrementally; never fabricate production data or weaken tests.

## Current phase

See **[STATE.md](./STATE.md)** for the live implementation gap status.

## License

UNLICENSED — proprietary.
