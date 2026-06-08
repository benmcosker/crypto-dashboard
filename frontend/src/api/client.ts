import type {
  Coin,
  Exchange,
  GlobalData,
  MarketChart,
  Period,
  TrendingResponse,
} from "./types";

// Base URL of the Go backend. In dev, Vite proxies /api to :8080, so a relative
// path works; override with VITE_API_BASE for a deployed backend.
const BASE = import.meta.env.VITE_API_BASE ?? "";

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const fetchMarkets = () => getJSON<Coin[]>("/api/markets");
export const fetchGlobal = () => getJSON<GlobalData>("/api/global");
export const fetchTrending = () => getJSON<TrendingResponse>("/api/trending");
export const fetchExchanges = () => getJSON<Exchange[]>("/api/exchanges");
export const fetchChart = (id: string, period: Period) =>
  getJSON<MarketChart>(`/api/chart/${id}?period=${period}`);
