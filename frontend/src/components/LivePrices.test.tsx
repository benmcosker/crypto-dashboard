import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LivePrices from "./LivePrices";
import type { Coin } from "../api/types";

// Mock the API client so the component renders deterministic data.
vi.mock("../api/client", () => ({
  fetchMarkets: vi.fn(),
}));
import { fetchMarkets } from "../api/client";

const sampleCoin: Coin = {
  id: "bitcoin",
  symbol: "btc",
  name: "Bitcoin",
  image: "https://example.com/btc.png",
  current_price: 50000,
  market_cap: 1_000_000_000,
  market_cap_rank: 1,
  total_volume: 20_000_000,
  price_change_percentage_24h_in_currency: 2.5,
  price_change_percentage_7d_in_currency: -3.1,
  price_change_percentage_30d_in_currency: 10.4,
  sparkline_in_7d: { price: [48000, 49000, 50000, 49500] },
};

function renderWidget(props: Partial<Parameters<typeof LivePrices>[0]> = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSelectCoin = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <LivePrices
        period="week"
        selectedCoin="bitcoin"
        onSelectCoin={onSelectCoin}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { onSelectCoin };
}

afterEach(() => {
  vi.mocked(fetchMarkets).mockReset();
});

describe("LivePrices", () => {
  it("renders coin rows from the markets API", async () => {
    vi.mocked(fetchMarkets).mockResolvedValue([sampleCoin]);
    renderWidget();

    expect(await screen.findByText("Bitcoin")).toBeInTheDocument();
    expect(screen.getByText("$50,000.00")).toBeInTheDocument();
  });

  it("shows the change for the selected period (7d for 'week')", async () => {
    vi.mocked(fetchMarkets).mockResolvedValue([sampleCoin]);
    renderWidget({ period: "week" });

    // 7d value is -3.1, rendered as a loss.
    expect(await screen.findByText("-3.10%")).toBeInTheDocument();
  });

  it("uses the 24h change for the 'today' period", async () => {
    vi.mocked(fetchMarkets).mockResolvedValue([sampleCoin]);
    renderWidget({ period: "today" });

    expect(await screen.findByText("+2.50%")).toBeInTheDocument();
  });

  it("selects a coin when its row is clicked", async () => {
    vi.mocked(fetchMarkets).mockResolvedValue([sampleCoin]);
    const { onSelectCoin } = renderWidget();

    await userEvent.click(await screen.findByText("Bitcoin"));
    expect(onSelectCoin).toHaveBeenCalledWith("bitcoin");
  });

  it("surfaces an error state when the request fails", async () => {
    vi.mocked(fetchMarkets).mockRejectedValue(new Error("boom"));
    renderWidget();

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
  });
});
