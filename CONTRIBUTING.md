# Contributing

Thanks for your interest in improving Crypto Dashboard! This guide covers local
setup, the tooling, and the conventions the project follows.

## Prerequisites

- **Go** 1.22+
- **Node.js** 18+ and **npm** 9+
- A free **CoinGecko Demo** API key (see the [README](README.md#getting-an-api-key))

## Getting started

```bash
# 1. Fork & clone
git clone https://github.com/<your-username>/crypto-dashboard.git
cd crypto-dashboard

# 2. Add your API key
cp .env.example .env        # then edit .env and set COINGECKO_API_KEY

# 3. Install deps + dev tools (also installs `air` for backend hot-reload)
make install

# 4. Run both servers with hot-reload
make dev                    # backend :8080 + frontend :5173
```

Open <http://localhost:5173>. See the [README](README.md) for the full
architecture and API reference.

## Project layout

- `backend/` — Go API (stdlib `net/http`) that proxies CoinGecko behind a TTL
  cache so the API key stays server-side.
- `frontend/` — React + Vite + TypeScript + Material UI dashboard.

Keep the boundary intact: the frontend talks **only** to the backend, never to
CoinGecko directly, and the API key never reaches the client.

## Development workflow

1. **Create a branch** off `main`:
   ```bash
   git checkout -b feature/short-description
   ```
2. Make your change, with tests where it makes sense.
3. **Run the checks locally** before pushing — they must pass (CI runs the same):
   ```bash
   make test          # backend `go test -race` + frontend `vitest`
   make build         # backend `go build` + frontend type-check & bundle
   ```
4. **Commit** with a clear, imperative message (see below).
5. **Open a pull request** against `main`. Describe what changed and why; link any
   related issue. CI must be green before merge.

## Coding conventions

### Go (`backend/`)
- Format with `gofmt` (run `go fmt ./...`); keep `go vet ./...` clean.
- Prefer the standard library; this project intentionally has minimal deps.
- Add table-driven tests with `testing` + `httptest`. Keep handlers testable via
  the `fetcher` interface rather than calling the live API in tests.

### TypeScript / React (`frontend/`)
- TypeScript is `strict`; no `any` escapes without a good reason.
- Keep each dashboard widget self-contained under `src/components/`.
- Data fetching goes through TanStack Query hooks against the typed client in
  `src/api/`.
- Use the MUI theme (`src/theme.ts`) for colors/spacing — avoid hard-coded
  values. The palette is blue / yellow / white.
- Test with Vitest + React Testing Library; mock the API client, not `fetch`
  internals where avoidable.

## Commit messages

- Imperative mood, concise subject line (≤ ~72 chars), e.g.
  `Add 24h volume sparkline to markets table`.
- Add a body when the “why” isn’t obvious.

## Tests & CI

Every push and pull request to `main` runs
[`.github/workflows/ci.yml`](.github/workflows/ci.yml):

| Job | Steps |
|-----|-------|
| Backend | `go vet` · `go build` · `go test ./... -race` |
| Frontend | `npm ci` · `npm run build` · `npm test` |

Run `make test` to reproduce locally.

## Dependencies

[Dependabot](.github/dependabot.yml) opens weekly PRs for Go modules, npm
packages, and GitHub Actions. Minor/patch bumps are grouped; review CI on those
PRs and merge when green.

## Reporting issues

Open a GitHub issue with steps to reproduce, what you expected, and what
happened (include backend logs / browser console output where relevant). Please
**never** paste your CoinGecko API key or other secrets into an issue.
