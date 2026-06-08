package coingecko

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// newTestServer spins up a fake CoinGecko that records the last request and
// returns body for any path.
func newTestServer(t *testing.T, body string) (*httptest.Server, *http.Request) {
	t.Helper()
	var last *http.Request
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		last = r.Clone(context.Background())
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv, last
}

func TestMarketsSendsAuthAndParams(t *testing.T) {
	var captured *http.Request
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = r
		_, _ = w.Write([]byte(`[{"id":"bitcoin"}]`))
	}))
	t.Cleanup(srv.Close)

	c := New(srv.URL, "test-key")
	body, err := c.Markets(context.Background(), "usd", 25, "1h,24h,7d,30d")
	if err != nil {
		t.Fatalf("Markets: %v", err)
	}
	if !strings.Contains(string(body), "bitcoin") {
		t.Fatalf("unexpected body: %s", body)
	}

	if got := captured.Header.Get("x-cg-demo-api-key"); got != "test-key" {
		t.Errorf("api key header = %q, want test-key", got)
	}
	q := captured.URL.Query()
	if q.Get("vs_currency") != "usd" {
		t.Errorf("vs_currency = %q", q.Get("vs_currency"))
	}
	if q.Get("sparkline") != "true" {
		t.Errorf("sparkline = %q, want true", q.Get("sparkline"))
	}
	if q.Get("per_page") != "25" {
		t.Errorf("per_page = %q, want 25", q.Get("per_page"))
	}
	if q.Get("price_change_percentage") != "1h,24h,7d,30d" {
		t.Errorf("price_change_percentage = %q", q.Get("price_change_percentage"))
	}
}

func TestMarketChartBuildsPath(t *testing.T) {
	var capturedPath string
	var capturedDays string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		capturedPath = r.URL.Path
		capturedDays = r.URL.Query().Get("days")
		_, _ = w.Write([]byte(`{"prices":[]}`))
	}))
	t.Cleanup(srv.Close)

	c := New(srv.URL, "k")
	if _, err := c.MarketChart(context.Background(), "bitcoin", "usd", 90); err != nil {
		t.Fatalf("MarketChart: %v", err)
	}
	if capturedPath != "/coins/bitcoin/market_chart" {
		t.Errorf("path = %q", capturedPath)
	}
	if capturedDays != "90" {
		t.Errorf("days = %q, want 90", capturedDays)
	}
}

func TestGetPropagatesUpstreamError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
		_, _ = w.Write([]byte(`{"error":"rate limited"}`))
	}))
	t.Cleanup(srv.Close)

	c := New(srv.URL, "k")
	_, err := c.Global(context.Background())
	if err == nil {
		t.Fatal("expected error on non-200 response")
	}
	if !strings.Contains(err.Error(), "429") {
		t.Errorf("error should mention status code: %v", err)
	}
}

func TestTrimsTrailingSlashFromBaseURL(t *testing.T) {
	srv, _ := newTestServer(t, `{"coins":[]}`)
	c := New(srv.URL+"/", "k")
	if _, err := c.Trending(context.Background()); err != nil {
		t.Fatalf("Trending: %v", err)
	}
}
