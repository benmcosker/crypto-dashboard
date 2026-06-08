// Time-period filter shared across the dashboard.
export type Period = "today" | "week" | "month" | "quarter";

export const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Last week" },
  { value: "month", label: "Last month" },
  { value: "quarter", label: "Last quarter" },
];

// Which CoinGecko price-change window backs each period in the markets table.
// CoinGecko exposes native 1h/24h/7d/30d windows; "quarter" has no native
// field, so it falls back to 30d (the chart still renders the full 90 days).
export const PERIOD_CHANGE_FIELD: Record<
  Period,
  "price_change_percentage_24h_in_currency" | "price_change_percentage_7d_in_currency" | "price_change_percentage_30d_in_currency"
> = {
  today: "price_change_percentage_24h_in_currency",
  week: "price_change_percentage_7d_in_currency",
  month: "price_change_percentage_30d_in_currency",
  quarter: "price_change_percentage_30d_in_currency",
};

export const PERIOD_CHANGE_LABEL: Record<Period, string> = {
  today: "24h",
  week: "7d",
  month: "30d",
  quarter: "30d",
};

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  total_volume: number;
  price_change_percentage_24h_in_currency?: number;
  price_change_percentage_7d_in_currency?: number;
  price_change_percentage_30d_in_currency?: number;
  sparkline_in_7d?: { price: number[] };
}

export interface GlobalData {
  data: {
    active_cryptocurrencies: number;
    markets: number;
    total_market_cap: Record<string, number>;
    total_volume: Record<string, number>;
    market_cap_percentage: Record<string, number>;
    market_cap_change_percentage_24h_usd: number;
  };
}

export interface MarketChart {
  prices: [number, number][];
}

export interface TrendingResponse {
  coins: {
    item: {
      id: string;
      name: string;
      symbol: string;
      market_cap_rank: number;
      thumb: string;
      score: number;
      data?: { price_change_percentage_24h?: { usd?: number } };
    };
  }[];
}

export interface Exchange {
  id: string;
  name: string;
  image: string;
  trust_score_rank: number;
  trade_volume_24h_btc: number;
}
