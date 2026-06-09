# Crypto Dashboard

[![CI](https://github.com/benmcosker/crypto-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/benmcosker/crypto-dashboard/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A real-time cryptocurrency market dashboard built on a **Go** backend and a **React + Material UI** frontend, powered by the live [CoinGecko API](https://docs.coingecko.com/).

It surfaces five live metrics, all filterable by time period (**Today / Last week / Last month / Last quarter**):

| # | Metric | Source endpoint |
|---|--------|-----------------|
| 1 | Live price, % change & 7-day sparkline | `/coins/markets` |
| 2 | Total market cap + BTC/ETH dominance | `/global` |
| 3 | Price-history chart (per coin) | `/coins/{id}/market_chart` |
| 4 | Trending coins | `/search/trending` |
| 5 | Exchange volume | `/exchanges` |

---

## Table of contents

- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Getting an API key](#getting-an-api-key)
- [Configuration](#configuration)
- [Running the app](#running-the-app)
- [Running the tests](#running-the-tests)
- [Production build](#production-build)
- [API reference](#api-reference)
- [Project structure](#project-structure)
- [Time-period behavior](#time-period-behavior)
- [Troubleshooting](#troubleshooting)

---

## How it works

```
┌────────────────────┐      /api/*       ┌──────────────────┐   x-cg-demo-api-key   ┌─────────────┐
│  React + MUI (5173) │ ───────────────▶ │  Go backend (8080) │ ───────────────────▶ │  CoinGecko  │
└────────────────────┘   (Vite proxy)    └──────────────────┘    (60s TTL cache)    └─────────────┘
```

- The **React app never calls CoinGecko directly.** All requests go to the Go
  backend, so the API key stays server-side.
- The backend **caches** every upstream response for 60 seconds to stay within
  the CoinGecko demo-plan rate limits and to keep the UI snappy.
- In development, Vite proxies `/api/*` to the backend, so the browser stays
  same-origin (no CORS headaches).

---

## Prerequisites

| Tool | Version | Check |
|------|---------|-------|
| **Go** | 1.22+ | `go version` |
| **Node.js** | 18+ (built/tested on 24) | `node --version` |
| **npm** | 9+ | `npm --version` |

Install Go and Node if you don't have them:

```bash
# macOS (Homebrew)
brew install go node

# Ubuntu/Debian
sudo apt-get install -y golang-go
# Node via nodesource: https://github.com/nodesource/distributions
```

---

## Getting an API key

This project uses a **CoinGecko Demo** API key (free).

1. Create an account at <https://www.coingecko.com/en/developers/dashboard>.
2. Generate a **Demo** API key (it looks like `CG-xxxxxxxxxxxxxxxx`).
3. Put it in the `.env` file (see below).

> The backend auto-detects nothing magical — it simply sends the key as the
> `x-cg-demo-api-key` header against `https://api.coingecko.com/api/v3`. If you
> later upgrade to a Pro key, override `COINGECKO_BASE_URL` to
> `https://pro-api.coingecko.com/api/v3` and adjust the header in
> `backend/internal/coingecko/client.go`.

---

## Configuration

All configuration is read from environment variables, with a `.env` file at the
project root as a convenient default. The backend walks up from its working
directory to find `.env`, so it works whether you run it from `backend/` or the
repo root.

Create `crypto-dashboard/.env` (copy the template):

```bash
cp .env.example .env
```

```ini
# .env  (required)
COINGECKO_API_KEY=CG-your-demo-key-here

# Optional overrides (defaults shown)
# PORT=8080
# ALLOWED_ORIGIN=http://localhost:5173
# COINGECKO_BASE_URL=https://api.coingecko.com/api/v3
```

| Variable | Default | Purpose |
|----------|---------|---------|
| `COINGECKO_API_KEY` | _(required)_ | Demo API key. The server refuses to start without it. |
| `PORT` | `8080` | Backend HTTP port. |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | Origin echoed in CORS headers (the frontend dev server). |
| `COINGECKO_BASE_URL` | `https://api.coingecko.com/api/v3` | Upstream API base URL. |

### Frontend env (optional)

The frontend defaults to a relative `/api` path (proxied by Vite in dev). To
point it at a backend on a different host/port, create `frontend/.env`:

```ini
VITE_API_BASE=http://localhost:8080
```

---

## Running the app

You need **two terminals** — one for the backend, one for the frontend.

> 💡 **Want live hot-reload while you code?** Skip ahead to
> [Hot reload for development](#hot-reload-for-development) — one command
> (`make dev`) runs both servers and auto-restarts on every change.

### 1. Backend

```bash
cd backend
go run ./cmd/server
```

You should see:

```
crypto-dashboard backend listening on :8080 (CORS origin http://localhost:5173)
```

Verify it's up:

```bash
curl http://localhost:8080/api/health
# {"status":"ok","time":"..."}
```

### 2. Frontend

```bash
cd frontend
npm install        # first time only — installs dependencies
npm run dev
```

Vite prints a local URL:

```
  ➜  Local:   http://localhost:5173/
```

Open **<http://localhost:5173>** in your browser. The dashboard loads live data
immediately and refreshes prices every 60 seconds.

> **Order doesn't strictly matter,** but if the frontend loads before the
> backend is ready, widgets show an error state — just start the backend and
> refresh.

---

## Hot reload for development

Both halves of the app reload automatically when you edit source files:

| Layer | Tool | What triggers a reload |
|-------|------|------------------------|
| **Frontend** | Vite HMR (built in) | Saving any file under `frontend/src/` — the browser updates instantly, usually without losing component state. |
| **Backend** | [`air`](https://github.com/air-verse/air) | Saving any `.go` file — `air` rebuilds and restarts the server in ~1s. |

### One-time setup

```bash
# from the project root
make install          # installs frontend deps, downloads Go modules, and installs `air`
```

`air` installs to `$(go env GOPATH)/bin` (usually `~/go/bin`). The Makefile finds
it there even if that directory isn't on your `PATH`.

### Run both with hot-reload (one command)

```bash
make dev
```

This starts the backend (via `air`) and the frontend (via Vite) together; press
**Ctrl-C** once to stop both. Then open <http://localhost:5173>.

### Or run them separately

```bash
make dev-backend      # backend with live reload  (http://localhost:8080)
make dev-frontend     # frontend with Vite HMR     (http://localhost:5173)
```

> Prefer not to use Make? Run `air -c .air.toml` from `backend/` and
> `npm run dev` from `frontend/` directly. The backend reload config lives in
> [`backend/.air.toml`](backend/.air.toml); `air`'s build artifacts go to
> `backend/tmp/` (gitignored).

### Make targets

| Target | Does |
|--------|------|
| `make dev` | Run backend + frontend together with hot-reload |
| `make dev-backend` / `make dev-frontend` | Run one side with hot-reload |
| `make install` | Install deps + the `air` tool |
| `make test` | Run backend + frontend test suites |
| `make build` | Production build (Go binary + frontend bundle) |
| `make clean` | Remove build artifacts |

---

## Running the tests

### Backend (Go `testing` + `httptest`)

```bash
cd backend
go test ./...            # run all packages
go test ./... -v         # verbose
go test ./... -cover     # with coverage
```

Covers the CoinGecko client (auth header, query params, error propagation), the
TTL cache (hit/miss/expiry), and the HTTP handlers (routing, caching, CORS,
period→days mapping, upstream error handling).

### Frontend (Vitest + React Testing Library)

```bash
cd frontend
npm test                 # run once (CI mode)
npm run test:watch       # watch mode
```

Covers the formatters, the period filter interaction, the percent-change
component, and the Live Prices widget (rendering, period-driven change column,
row selection, and error states) with a mocked API.

---

## Production build

Build the optimized frontend bundle (type-checks first, then bundles to
`frontend/dist/`):

```bash
cd frontend
npm run build
npm run preview          # serve the built bundle locally to sanity-check
```

Build the backend into a single binary:

```bash
cd backend
go build -o server ./cmd/server
./server                 # reads ../.env
```

For deployment, serve `frontend/dist/` from any static host and point the
frontend at your backend via `VITE_API_BASE` at build time. Ensure the
backend's `ALLOWED_ORIGIN` matches the static site's origin.

---

## API reference

All routes are served by the Go backend under `/api`. Responses are CoinGecko
JSON, passed through after caching.

| Method | Route | Query params | Description |
|--------|-------|--------------|-------------|
| `GET` | `/api/health` | — | Liveness check. |
| `GET` | `/api/markets` | — | Top 25 coins by market cap, with 7-day sparkline and 1h/24h/7d/30d change windows. |
| `GET` | `/api/global` | — | Total market cap, volume, and dominance percentages. |
| `GET` | `/api/chart/{id}` | `period=today\|week\|month\|quarter` | Price history for a coin over the period (1/7/30/90 days). |
| `GET` | `/api/trending` | — | Currently trending coins. |
| `GET` | `/api/exchanges` | — | Top 10 exchanges by trade volume. |

Examples:

```bash
curl "http://localhost:8080/api/markets"
curl "http://localhost:8080/api/chart/bitcoin?period=quarter"
curl "http://localhost:8080/api/global"
```

---

## Project structure

```
crypto-dashboard/
├── .env                       # COINGECKO_API_KEY (gitignored)
├── .env.example               # template
├── .github/workflows/ci.yml   # CI: go test + frontend build/test
├── LICENSE                    # MIT
├── Makefile                   # dev / test / build tasks
├── README.md
├── CLAUDE.md                  # condensed project notes
│
├── backend/                   # Go — stdlib net/http
│   ├── go.mod
│   ├── cmd/server/main.go     # entrypoint: config → client → cache → handlers
│   └── internal/
│       ├── config/            # .env + env var loading
│       ├── coingecko/         # API client      (+ client_test.go)
│       ├── cache/             # TTL cache        (+ cache_test.go)
│       └── handlers/          # HTTP routes/CORS (+ handlers_test.go)
│
└── frontend/                  # React + Vite + TypeScript + MUI v6
    ├── package.json
    ├── vite.config.ts         # dev server + /api proxy + Vitest config
    ├── index.html
    └── src/
        ├── main.tsx           # providers: Theme, QueryClient, CssBaseline
        ├── App.tsx            # layout + period/selected-coin state
        ├── theme.ts           # blue/yellow/white MUI theme
        ├── api/               # typed fetch client + types
        ├── components/        # 5 widgets + PeriodFilter + WidgetCard (+ tests)
        ├── utils/             # formatters (+ tests)
        └── test/setup.ts      # jsdom test setup
```

---

## Time-period behavior

The period filter (Today / Last week / Last month / Last quarter) maps to
`1 / 7 / 30 / 90` days. Not every metric has a historical dimension, so the
filter applies where it's meaningful and the rest stay live:

- **Price-history chart** — uses the full day range for the selected period.
- **Live Prices % column** — uses CoinGecko's native change windows
  (24h / 7d / 30d). "Last quarter" has **no native 90-day window**, so the table
  shows the 30d change while the chart still renders the full 90 days.
- **Market overview, Trending, Exchange volume** — live snapshots with no
  historical dimension, so they stay current regardless of the selected period.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `config: COINGECKO_API_KEY is not set` on startup | Add your key to `crypto-dashboard/.env`. |
| Widgets show "Failed to load" | Make sure the backend is running on `:8080` and the key is valid. Check the backend terminal for upstream errors. |
| `429 Too Many Requests` from CoinGecko | Demo-plan rate limit. The 60s cache usually prevents this; wait a minute and reload. |
| `bind: address already in use` | Port 8080 (or 5173) is taken. Free it: `lsof -ti tcp:8080 \| xargs kill -9`, or set a different `PORT`. |
| Frontend can't reach the API | In dev, the Vite proxy handles `/api`. If you changed ports, set `VITE_API_BASE` in `frontend/.env`. |
| Prices look stale | Responses are cached for 60s server-side and the table auto-refreshes each minute. |

---

## Continuous integration

Every push and pull request to `main` runs [`.github/workflows/ci.yml`](.github/workflows/ci.yml):

- **Backend** — `go vet`, `go build`, and `go test ./... -race`.
- **Frontend** — `npm ci`, `npm run build` (type-check + bundle), and `npm test`.

Run the same checks locally with `make test` (or `make build`).

---

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md) for local
setup, conventions, and the PR workflow. Dependencies are kept current by
[Dependabot](.github/dependabot.yml).

## License

Released under the [MIT License](LICENSE).
