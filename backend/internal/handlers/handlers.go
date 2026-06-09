// Package handlers exposes the dashboard's HTTP API. Each route proxies a
// CoinGecko endpoint through the TTL cache and re-emits the JSON to the
// frontend, so the API key never leaves the server.
package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net"
	"net/http"
	"strings"
	"time"

	"cryptodashboard/internal/cache"
	"cryptodashboard/internal/coingecko"
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

// validPeriods is the set of accepted time-period filter values.
var validPeriods = map[string]int{"today": 1, "week": 7, "month": 30, "quarter": 90}

// periodToDays maps the dashboard's time-period filter to a day count for the
// price-history chart. Unknown/empty periods fall back to 7 days.
func periodToDays(period string) int {
	if days, ok := validPeriods[period]; ok {
		return days
	}
	return 7
}

// Router returns an http.Handler with all routes registered and middleware
// (panic recovery, request logging, CORS) applied.
func (a *API) Router() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", a.handleHealth)
	mux.HandleFunc("GET /api/markets", a.handleMarkets)
	mux.HandleFunc("GET /api/global", a.handleGlobal)
	mux.HandleFunc("GET /api/chart/{id}", a.handleChart)
	mux.HandleFunc("GET /api/trending", a.handleTrending)
	mux.HandleFunc("GET /api/exchanges", a.handleExchanges)

	// Outer → inner: recover from panics, log every request, then apply CORS.
	return a.withRecovery(a.withLogging(a.withCORS(mux)))
}

// --- middleware ---------------------------------------------------------------

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

// statusRecorder captures the response status code for logging.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (s *statusRecorder) WriteHeader(code int) {
	s.status = code
	s.ResponseWriter.WriteHeader(code)
}

func (a *API) withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(rec, r)
		log.Printf("[api] %s %s -> %d (%s)", r.Method, r.URL.Path, rec.status, time.Since(start).Round(time.Millisecond))
	})
}

func (a *API) withRecovery(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("[api] PANIC on %s %s: %v", r.Method, r.URL.Path, rec)
				writeError(w, http.StatusInternalServerError, "internal_error",
					"Something went wrong on the server. Please try again.")
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// --- handlers -----------------------------------------------------------------

func (a *API) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"status": "ok", "time": time.Now().UTC()})
}

// serveCached returns the cached body for key, or calls fetch, caches, and
// returns the result. fetch must return raw JSON bytes.
func (a *API) serveCached(w http.ResponseWriter, r *http.Request, key string, fetch func() ([]byte, error)) {
	if body, ok := a.cache.Get(key); ok {
		writeRawJSON(w, http.StatusOK, body)
		return
	}
	body, err := fetch()
	if err != nil {
		a.writeFetchError(w, r, err)
		return
	}
	a.cache.Set(key, body)
	writeRawJSON(w, http.StatusOK, body)
}

// writeFetchError translates an upstream/transport error into a clean,
// client-safe JSON response. Raw upstream details are logged, never forwarded.
func (a *API) writeFetchError(w http.ResponseWriter, r *http.Request, err error) {
	path := r.URL.Path

	var apiErr *coingecko.APIError
	switch {
	case errors.As(err, &apiErr):
		switch apiErr.StatusCode {
		case http.StatusTooManyRequests:
			log.Printf("[api] %s upstream rate limited", path)
			w.Header().Set("Retry-After", "60")
			writeError(w, http.StatusTooManyRequests, "rate_limited",
				"CoinGecko's rate limit was reached. Please wait a moment and try again.")
		case http.StatusUnauthorized, http.StatusForbidden:
			log.Printf("[api] %s upstream auth error %d: %s", path, apiErr.StatusCode, apiErr.Body)
			writeError(w, http.StatusBadGateway, "upstream_auth",
				"The market-data service rejected our request. The server's API key may be invalid.")
		case http.StatusNotFound:
			log.Printf("[api] %s upstream 404: %s", path, apiErr.Body)
			writeError(w, http.StatusNotFound, "not_found",
				"That resource wasn't found on the market-data service.")
		default:
			log.Printf("[api] %s upstream error %d: %s", path, apiErr.StatusCode, apiErr.Body)
			writeError(w, http.StatusBadGateway, "upstream_error",
				"The market-data service is temporarily unavailable. Please try again shortly.")
		}

	case errors.Is(err, context.Canceled):
		// The client disconnected; there's nobody to respond to.
		log.Printf("[api] %s request canceled by client", path)

	case errors.Is(err, context.DeadlineExceeded), isTimeout(err):
		log.Printf("[api] %s upstream timeout: %v", path, err)
		writeError(w, http.StatusGatewayTimeout, "upstream_timeout",
			"The market-data service took too long to respond. Please try again.")

	default:
		log.Printf("[api] %s upstream unreachable: %v", path, err)
		writeError(w, http.StatusBadGateway, "upstream_unreachable",
			"Couldn't reach the market-data service. Please try again shortly.")
	}
}

// isTimeout reports whether err is a network timeout.
func isTimeout(err error) bool {
	var netErr net.Error
	return errors.As(err, &netErr) && netErr.Timeout()
}

// handleMarkets serves /coins/markets with a 7-day sparkline and the price-change
// windows the frontend selects between (1h/24h/7d/30d).
func (a *API) handleMarkets(w http.ResponseWriter, r *http.Request) {
	a.serveCached(w, r, "markets", func() ([]byte, error) {
		return a.client.Markets(r.Context(), vsCurrency, 25, "1h,24h,7d,30d")
	})
}

func (a *API) handleGlobal(w http.ResponseWriter, r *http.Request) {
	a.serveCached(w, r, "global", func() ([]byte, error) {
		return a.client.Global(r.Context())
	})
}

// handleChart serves /coins/{id}/market_chart for the period's day range.
func (a *API) handleChart(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimSpace(r.PathValue("id"))
	if id == "" {
		writeError(w, http.StatusBadRequest, "missing_id", "A coin id is required.")
		return
	}
	period := r.URL.Query().Get("period")
	if _, ok := validPeriods[period]; period != "" && !ok {
		writeError(w, http.StatusBadRequest, "invalid_period",
			"period must be one of: today, week, month, quarter.")
		return
	}
	days := periodToDays(period)
	a.serveCached(w, r, "chart:"+id+":"+period, func() ([]byte, error) {
		return a.client.MarketChart(r.Context(), id, vsCurrency, days)
	})
}

func (a *API) handleTrending(w http.ResponseWriter, r *http.Request) {
	a.serveCached(w, r, "trending", func() ([]byte, error) {
		return a.client.Trending(r.Context())
	})
}

func (a *API) handleExchanges(w http.ResponseWriter, r *http.Request) {
	a.serveCached(w, r, "exchanges", func() ([]byte, error) {
		return a.client.Exchanges(r.Context(), 10)
	})
}

// --- response helpers ---------------------------------------------------------

// errorResponse is the consistent JSON shape for all error responses.
type errorResponse struct {
	Error  string `json:"error"`  // human-readable, client-safe message
	Code   string `json:"code"`   // stable machine-readable code
	Status int    `json:"status"` // mirrors the HTTP status
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, errorResponse{Error: message, Code: code, Status: status})
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
