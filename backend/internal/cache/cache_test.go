package cache

import (
	"testing"
	"time"
)

func TestCacheSetGet(t *testing.T) {
	c := New(time.Minute)
	c.Set("k", []byte("v"))

	got, ok := c.Get("k")
	if !ok {
		t.Fatal("expected hit, got miss")
	}
	if string(got) != "v" {
		t.Fatalf("got %q, want %q", got, "v")
	}
}

func TestCacheMissUnknownKey(t *testing.T) {
	c := New(time.Minute)
	if _, ok := c.Get("absent"); ok {
		t.Fatal("expected miss for unknown key")
	}
}

func TestCacheExpiry(t *testing.T) {
	c := New(time.Minute)
	base := time.Now()
	c.now = func() time.Time { return base }
	c.Set("k", []byte("v"))

	// Still fresh just before TTL.
	c.now = func() time.Time { return base.Add(59 * time.Second) }
	if _, ok := c.Get("k"); !ok {
		t.Fatal("entry should still be live before TTL")
	}

	// Expired after TTL.
	c.now = func() time.Time { return base.Add(2 * time.Minute) }
	if _, ok := c.Get("k"); ok {
		t.Fatal("entry should have expired after TTL")
	}
}
