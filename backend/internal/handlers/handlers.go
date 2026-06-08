// Package handlers exposes the dashboard's HTTP API. Each route proxies a
// CoinGecko endpoint through the TTL cache and re-emits the JSON to the
// frontend, so the API key never leaves the server.
package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"cryptodashboard/internal/cache"
)

// fetcher is the subset of the CoinGecko client the handlers depend on; defining
// it as an interface keeps the handlers unit-testable with a fake.
type fetcher interface {
	Markets(ctx context.Context, vsCurrency string, perPage int, priceChange string) ([]byte, error)
	Global(ctx context.Context) ([]byte, error)
	MarketChart(ctx context.Context, id, vsCurrency string, days int) ([]byte, error)
	Trending(ctx context.Context) ([]byte, error)
	Exchanges(ctx context.Context, perPage int) ([]byte, error)
}

// API wires the CoinGecko client and cache into HTTP handlers.
type API struct {
	client        fetcher
	cache         *cache.Cache
	allowedOrigin string
}

// New builds an API handler set.
func New(client fetcher, c *cache.Cache, allowedOrigin string) *API {
	return &API{client: client, cache: c, allowedOrigin: allowedOrigin}
}

// vsCurrency is the fiat all prices are quoted in.
const vsCurrency = "usd"

// periodToDays maps the dashboard's time-period filter to a day count for the
// price-history chart. Unknown periods fall back to 7 days.
func periodToDays(period string) int {
	switch period {
	case "today":
		return 1
	case "week":
		return 7
	case "month":
		return 30
	case "quarter":
		return 90
	default:
		return 7
	}
}

// Router returns an http.Handler with all routes registered and CORS applied.
func (a *API) Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", a.handleHealth)
	mux.HandleFunc("GET /api/markets", a.handleMarkets)
	mux.HandleFunc("GET /api/global", a.handleGlobal)
	mux.HandleFunc("GET /api/chart/{id}", a.handleChart)
	mux.HandleFunc("GET /api/trending", a.handleTrending)
	mux.HandleFunc("GET /api/exchanges", a.handleExchanges)
	return a.withCORS(mux)
}

func (a *API) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", a.allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (a *API) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "time": time.Now().UTC()})
}

// serveCached returns the cached body for key, or calls fetch, caches, and
// returns the result. fetch must return raw JSON bytes.
func (a *API) serveCached(w http.ResponseWriter, key string, fetch func() ([]byte, error)) {
	if body, ok := a.cache.Get(key); ok {
		writeRawJSON(w, http.StatusOK, body)
		return
	}
	body, err := fetch()
	if err != nil {
		writeJSON(w, http.StatusBadGateway, map[string]string{"error": err.Error()})
		return
	}
	a.cache.Set(key, body)
	writeRawJSON(w, http.StatusOK, body)
}

// handleMarkets serves /coins/markets with a 7-day sparkline and the price-change
// windows the frontend selects between (1h/24h/7d/30d).
func (a *API) handleMarkets(w http.ResponseWriter, r *http.Request) {
	a.serveCached(w, "markets", func() ([]byte, error) {
		return a.client.Markets(r.Context(), vsCurrency, 25, "1h,24h,7d,30d")
	})
}

func (a *API) handleGlobal(w http.ResponseWriter, r *http.Request) {
	a.serveCached(w, "global", func() ([]byte, error) {
		return a.client.Global(r.Context())
	})
}

// handleChart serves /coins/{id}/market_chart for the period's day range.
func (a *API) handleChart(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	period := r.URL.Query().Get("period")
	days := periodToDays(period)
	a.serveCached(w, "chart:"+id+":"+period, func() ([]byte, error) {
		return a.client.MarketChart(r.Context(), id, vsCurrency, days)
	})
}

func (a *API) handleTrending(w http.ResponseWriter, r *http.Request) {
	a.serveCached(w, "trending", func() ([]byte, error) {
		return a.client.Trending(r.Context())
	})
}

func (a *API) handleExchanges(w http.ResponseWriter, r *http.Request) {
	a.serveCached(w, "exchanges", func() ([]byte, error) {
		return a.client.Exchanges(r.Context(), 10)
	})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeRawJSON(w http.ResponseWriter, status int, body []byte) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_, _ = w.Write(body)
}
