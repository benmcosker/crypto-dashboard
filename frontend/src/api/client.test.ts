import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, fetchExchanges, fetchMarkets } from "./client";

function mockFetchOnce(value: Partial<Response> & { json?: () => Promise<unknown> }) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(value));
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("api client", () => {
  it("returns parsed JSON on success", async () => {
    mockFetchOnce({ ok: true, status: 200, json: async () => [{ id: "bitcoin" }] });
    await expect(fetchMarkets()).resolves.toEqual([{ id: "bitcoin" }]);
  });

  it("throws ApiError carrying the backend message, status, and code", async () => {
    mockFetchOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Slow down please", code: "rate_limited", status: 429 }),
    });

    const err = await fetchExchanges().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Slow down please");
    expect(err.status).toBe(429);
    expect(err.code).toBe("rate_limited");
    expect(err.isRateLimited).toBe(true);
    expect(err.isNetwork).toBe(false);
  });

  it("falls back to a generic message when the error body isn't JSON", async () => {
    mockFetchOnce({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error("not json");
      },
    });

    const err = await fetchMarkets().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(502);
    expect(err.message).toContain("502");
  });

  it("maps a network failure to an ApiError with status 0", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const err = await fetchMarkets().catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.code).toBe("network_error");
    expect(err.isNetwork).toBe(true);
  });
});
