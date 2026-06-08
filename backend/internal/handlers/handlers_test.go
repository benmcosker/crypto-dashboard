package handlers

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"cryptodashboard/internal/cache"
)

// fakeClient records call counts and returns canned bytes, letting us assert
// caching and routing without hitting the network.
type fakeClient struct {
	marketsCalls atomic.Int32
	chartCalls   atomic.Int32
	lastChartID  string
	lastDays     int
	failGlobal   bool
}

func (f *fakeClient) Markets(ctx context.Context, vsCurrency string, perPage int, priceChange string) ([]byte, error) {
	f.marketsCalls.Add(1)
	return []byte(`[{"id":"bitcoin"}]`), nil
}
func (f *fakeClient) Global(ctx context.Context) ([]byte, error) {
	if f.failGlobal {
		return nil, errors.New("upstream boom")
	}
	return []byte(`{"data":{}}`), nil
}
func (f *fakeClient) MarketChart(ctx context.Context, id, vsCurrency string, days int) ([]byte, error) {
	f.chartCalls.Add(1)
	f.lastChartID = id
	f.lastDays = days
	return []byte(`{"prices":[]}`), nil
}
func (f *fakeClient) Trending(ctx context.Context) ([]byte, error) {
	return []byte(`{"coins":[]}`), nil
}
func (f *fakeClient) Exchanges(ctx context.Context, perPage int) ([]byte, error) {
	return []byte(`[{"id":"binance"}]`), nil
}

func newTestAPI(f *fakeClient) http.Handler {
	return New(f, cache.New(time.Minute), "http://localhost:5173").Router()
}

func TestMarketsRouteReturnsJSON(t *testing.T) {
	f := &fakeClient{}
	srv := newTestAPI(f)

	req := httptest.NewRequest(http.MethodGet, "/api/markets", nil)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("content-type = %q", ct)
	}
	if rec.Body.String() != `[{"id":"bitcoin"}]` {
		t.Errorf("body = %q", rec.Body.String())
	}
}

func TestMarketsAreCached(t *testing.T) {
	f := &fakeClient{}
	srv := newTestAPI(f)

	for i := 0; i < 3; i++ {
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/markets", nil))
	}
	if got := f.marketsCalls.Load(); got != 1 {
		t.Errorf("upstream called %d times, want 1 (cached)", got)
	}
}

func TestChartMapsPeriodToDays(t *testing.T) {
	cases := map[string]int{"today": 1, "week": 7, "month": 30, "quarter": 90, "": 7}
	for period, wantDays := range cases {
		f := &fakeClient{}
		srv := newTestAPI(f)
		url := "/api/chart/bitcoin"
		if period != "" {
			url += "?period=" + period
		}
		rec := httptest.NewRecorder()
		srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, url, nil))

		if rec.Code != http.StatusOK {
			t.Fatalf("period %q: status %d", period, rec.Code)
		}
		if f.lastDays != wantDays {
			t.Errorf("period %q: days = %d, want %d", period, f.lastDays, wantDays)
		}
		if f.lastChartID != "bitcoin" {
			t.Errorf("period %q: id = %q", period, f.lastChartID)
		}
	}
}

func TestChartCacheKeyVariesByPeriod(t *testing.T) {
	f := &fakeClient{}
	srv := newTestAPI(f)
	srv.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/chart/bitcoin?period=week", nil))
	srv.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/chart/bitcoin?period=month", nil))
	if got := f.chartCalls.Load(); got != 2 {
		t.Errorf("chart called %d times, want 2 (distinct periods)", got)
	}
}

func TestUpstreamErrorReturns502(t *testing.T) {
	f := &fakeClient{failGlobal: true}
	srv := newTestAPI(f)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/global", nil))
	if rec.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want 502", rec.Code)
	}
}

func TestCORSHeadersAndPreflight(t *testing.T) {
	f := &fakeClient{}
	srv := newTestAPI(f)

	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodOptions, "/api/markets", nil))
	if rec.Code != http.StatusNoContent {
		t.Errorf("preflight status = %d, want 204", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("CORS origin = %q", got)
	}
}

func TestHealthEndpoint(t *testing.T) {
	f := &fakeClient{}
	srv := newTestAPI(f)
	rec := httptest.NewRecorder()
	srv.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/api/health", nil))
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
}
