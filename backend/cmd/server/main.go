// Command server runs the crypto-dashboard backend: a small HTTP API that
// proxies CoinGecko through an in-memory cache so the demo API key stays
// server-side.
package main

import (
	"log"
	"net/http"
	"time"

	"cryptodashboard/internal/cache"
	"cryptodashboard/internal/coingecko"
	"cryptodashboard/internal/config"
	"cryptodashboard/internal/handlers"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	client := coingecko.New(cfg.CoinGeckoBaseURL, cfg.CoinGeckoAPIKey)
	c := cache.New(time.Duration(cfg.CacheTTLSeconds) * time.Second)
	api := handlers.New(client, c, cfg.AllowedOrigin)

	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      api.Router(),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 20 * time.Second,
	}

	log.Printf("crypto-dashboard backend listening on :%s (CORS origin %s)", cfg.Port, cfg.AllowedOrigin)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server: %v", err)
	}
}
