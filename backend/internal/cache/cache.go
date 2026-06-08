// Package cache provides a tiny concurrency-safe TTL cache. The backend uses it
// to smooth CoinGecko demo-plan rate limits and keep handler tests
// deterministic.
package cache

import (
	"sync"
	"time"
)

type entry struct {
	value     []byte
	expiresAt time.Time
}

// Cache is an in-memory key/value store with per-entry expiry.
type Cache struct {
	mu    sync.RWMutex
	ttl   time.Duration
	items map[string]entry
	now   func() time.Time // injectable clock for tests
}

// New returns a Cache where entries live for ttl.
func New(ttl time.Duration) *Cache {
	return &Cache{
		ttl:   ttl,
		items: make(map[string]entry),
		now:   time.Now,
	}
}

// Get returns the cached bytes for key and whether a live (non-expired) entry
// was found.
func (c *Cache) Get(key string) ([]byte, bool) {
	c.mu.RLock()
	e, ok := c.items[key]
	c.mu.RUnlock()
	if !ok || c.now().After(e.expiresAt) {
		return nil, false
	}
	return e.value, true
}

// Set stores value under key with the cache's TTL.
func (c *Cache) Set(key string, value []byte) {
	c.mu.Lock()
	c.items[key] = entry{value: value, expiresAt: c.now().Add(c.ttl)}
	c.mu.Unlock()
}
