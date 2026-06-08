// Package config loads runtime configuration from the environment and an
// optional .env file. We keep this dependency-free so the backend stays on the
// Go standard library.
package config

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
)

// Config holds all runtime settings for the server.
type Config struct {
	// CoinGeckoAPIKey is the demo API key (header: x-cg-demo-api-key).
	CoinGeckoAPIKey string
	// CoinGeckoBaseURL is the API base; overridable in tests.
	CoinGeckoBaseURL string
	// Port the HTTP server listens on.
	Port string
	// AllowedOrigin is echoed in CORS headers for the frontend dev server.
	AllowedOrigin string
	// CacheTTLSeconds controls how long upstream responses are cached.
	CacheTTLSeconds int
}

// Load reads configuration, loading the nearest .env file (searching the
// working directory and parent directories) before reading the environment so
// real environment variables always win.
func Load() (*Config, error) {
	loadDotEnv()

	key := os.Getenv("COINGECKO_API_KEY")
	if key == "" {
		return nil, fmt.Errorf("COINGECKO_API_KEY is not set (expected in environment or .env)")
	}

	return &Config{
		CoinGeckoAPIKey:  key,
		CoinGeckoBaseURL: getEnv("COINGECKO_BASE_URL", "https://api.coingecko.com/api/v3"),
		Port:             getEnv("PORT", "8080"),
		AllowedOrigin:    getEnv("ALLOWED_ORIGIN", "http://localhost:5173"),
		CacheTTLSeconds:  60,
	}, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// loadDotEnv walks up from the current directory looking for a .env file and
// loads any keys not already present in the environment.
func loadDotEnv() {
	dir, err := os.Getwd()
	if err != nil {
		return
	}
	for i := 0; i < 5; i++ {
		path := filepath.Join(dir, ".env")
		if f, err := os.Open(path); err == nil {
			parseDotEnv(f)
			f.Close()
			return
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return
		}
		dir = parent
	}
}

func parseDotEnv(f *os.File) {
	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		key, val, ok := strings.Cut(line, "=")
		if !ok {
			continue
		}
		key = strings.TrimSpace(key)
		val = strings.Trim(strings.TrimSpace(val), `"'`)
		if _, exists := os.LookupEnv(key); !exists {
			os.Setenv(key, val)
		}
	}
}
