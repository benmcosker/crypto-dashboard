// Package coingecko is a thin client over the CoinGecko v3 API. It only knows
// how to authenticate and fetch raw JSON for the handful of endpoints this
// dashboard needs; shaping/aggregation lives in the handlers package.
package coingecko

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// Client talks to the CoinGecko API using a demo API key.
type Client struct {
	baseURL string
	apiKey  string
	http    *http.Client
}

// New returns a Client. baseURL should not have a trailing slash.
func New(baseURL, apiKey string) *Client {
	return &Client{
		baseURL: strings.TrimRight(baseURL, "/"),
		apiKey:  apiKey,
		http:    &http.Client{Timeout: 15 * time.Second},
	}
}

// get performs an authenticated GET to path (e.g. "/coins/markets") with the
// given query parameters and returns the raw response body.
func (c *Client) get(ctx context.Context, path string, query url.Values) ([]byte, error) {
	u := c.baseURL + path
	if len(query) > 0 {
		u += "?" + query.Encode()
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("x-cg-demo-api-key", c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("coingecko request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("coingecko %s returned %d: %s", path, resp.StatusCode, truncate(body, 200))
	}
	return body, nil
}

func truncate(b []byte, n int) string {
	if len(b) <= n {
		return string(b)
	}
	return string(b[:n]) + "..."
}

// Markets returns /coins/markets data: top coins by market cap with a 7-day
// sparkline and the requested price-change windows.
func (c *Client) Markets(ctx context.Context, vsCurrency string, perPage int, priceChange string) ([]byte, error) {
	q := url.Values{}
	q.Set("vs_currency", vsCurrency)
	q.Set("order", "market_cap_desc")
	q.Set("per_page", fmt.Sprintf("%d", perPage))
	q.Set("page", "1")
	q.Set("sparkline", "true")
	q.Set("price_change_percentage", priceChange)
	return c.get(ctx, "/coins/markets", q)
}

// Global returns /global market data (total cap + dominance).
func (c *Client) Global(ctx context.Context) ([]byte, error) {
	return c.get(ctx, "/global", nil)
}

// MarketChart returns /coins/{id}/market_chart for the given number of days.
func (c *Client) MarketChart(ctx context.Context, id, vsCurrency string, days int) ([]byte, error) {
	q := url.Values{}
	q.Set("vs_currency", vsCurrency)
	q.Set("days", fmt.Sprintf("%d", days))
	return c.get(ctx, "/coins/"+url.PathEscape(id)+"/market_chart", q)
}

// Trending returns /search/trending.
func (c *Client) Trending(ctx context.Context) ([]byte, error) {
	return c.get(ctx, "/search/trending", nil)
}

// Exchanges returns /exchanges (first page, ordered by trust/volume).
func (c *Client) Exchanges(ctx context.Context, perPage int) ([]byte, error) {
	q := url.Values{}
	q.Set("per_page", fmt.Sprintf("%d", perPage))
	q.Set("page", "1")
	return c.get(ctx, "/exchanges", q)
}
