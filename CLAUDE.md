# Crypto Dashboard

A crypto market dashboard with a **Go** backend and a **React + Material UI** frontend, powered by the live [CoinGecko API](https://docs.coingecko.com/).

The dashboard shows five metrics, filterable by time period (Today / Last week / Last month / Last quarter):

| # | Metric | CoinGecko endpoint | Backend route |
|---|--------|--------------------|---------------|
| 1 | Live price + change + 7d sparkline | `/coins/markets` | `/api/markets` |
| 2 | Market cap & BTC/ETH dominance | `/global` | `/api/global` |
| 3 | Price-history chart | `/coins/{id}/market_chart` | `/api/chart/{id}?period=` |
| 4 | Trending coins | `/search/trending` | `/api/trending` |
| 5 | Exchange volume | `/exchanges` | `/api/exchanges` |

## Architecture

```
Browser (React/MUI)  ──/api──▶  Go backend  ──x-cg-demo-api-key──▶  CoinGecko
```

The React app **never** calls CoinGecko directly — the API key stays server-side
in the Go backend, which also caches upstream responses (60s TTL) to stay within
the CoinGecko demo-plan rate limits.

### Time-period filter
`Today → 1 day`, `Last week → 7`, `Last month → 30`, `Last quarter → 90`.
- The **price-history chart** (metric 3) uses the full day range.
- The **Live Prices** % column uses CoinGecko's native change windows
  (24h / 7d / 30d). Quarter has no native window, so it shows the 30d change
  while the chart still renders the full 90 days.
- `/global`, `/search/trending`, `/exchanges` are live snapshots with no
  historical dimension, so those three widgets stay current regardless of period.

## Layout

```
crypto-dashboard/
├── .env                 # COINGECKO_API_KEY=... (demo key)
├── backend/             # Go (stdlib net/http) — proxy + cache + CORS
│   ├── cmd/server/      # main.go (entrypoint)
│   └── internal/
│       ├── config/      # loads .env + env vars
│       ├── coingecko/   # API client  (+ client_test.go)
│       ├── cache/       # TTL cache    (+ cache_test.go)
│       └── handlers/    # HTTP routes  (+ handlers_test.go)
└── frontend/            # React + Vite + TypeScript + MUI v6 + MUI X Charts
    └── src/
        ├── theme.ts     # blue/yellow/white MUI theme
        ├── api/         # typed fetch client + types
        ├── components/  # 5 widgets + PeriodFilter + tests
        └── utils/       # formatters + tests
```

## Configuration

The backend reads `crypto-dashboard/.env` (walks up from its working dir):

```
COINGECKO_API_KEY=CG-xxxxxxxx     # required (CoinGecko demo key)
# optional overrides:
# PORT=8080
# ALLOWED_ORIGIN=http://localhost:5173
# COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
```

The frontend defaults to a relative `/api` path, which Vite proxies to the
backend on `:8080` in dev. Override with `VITE_API_BASE` for a deployed backend.

## Running locally

Requires **Go 1.22+** and **Node 18+**.

```bash
# Terminal 1 — backend (http://localhost:8080)
cd backend
go run ./cmd/server

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm install      # first time only
npm run dev
```

Open http://localhost:5173.

### Hot reload (development)

Both layers live-reload on save: the frontend via Vite HMR (built in), the
backend via [`air`](https://github.com/air-verse/air) (config in
`backend/.air.toml`, rebuilds on `.go` changes).

```bash
make install     # one-time: deps + installs `air`
make dev         # runs backend (air) + frontend (vite) together; Ctrl-C stops both
# or: make dev-backend / make dev-frontend
```

`air` writes build artifacts to `backend/tmp/` (gitignored).

## Testing

```bash
# Backend (Go's built-in testing + httptest)
cd backend && go test ./...

# Frontend (Vitest + React Testing Library)
cd frontend && npm test
```

## Build (frontend production bundle)

```bash
cd frontend && npm run build   # type-checks then bundles to dist/
```
