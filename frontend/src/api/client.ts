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

// Shape of the backend's structured error responses.
interface BackendError {
  error?: string;
  code?: string;
  status?: number;
}

// ApiError carries a user-safe message plus the HTTP status and a stable code,
// so the UI can tailor messaging and the retry policy can branch on it.
// status === 0 means the request never reached the server (network failure).
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }

  /** True for connection failures (server unreachable). */
  get isNetwork(): boolean {
    return this.status === 0;
  }

  /** True when CoinGecko's rate limit was hit (HTTP 429). */
  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

async function getJSON<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`);
  } catch {
    // fetch only rejects on network/DNS/CORS failures, not HTTP error statuses.
    throw new ApiError(
      "Can't reach the server. Check your connection and that the backend is running.",
      0,
      "network_error",
    );
  }

  if (!res.ok) {
    let message = `Request failed (${res.status}).`;
    let code = "http_error";
    try {
      const body: BackendError = await res.json();
      if (body.error) message = body.error;
      if (body.code) code = body.code;
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new ApiError(message, res.status, code);
  }

  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(
      "The server returned an unexpected response.",
      res.status,
      "bad_response",
    );
  }
}

export const fetchMarkets = () => getJSON<Coin[]>("/api/markets");
export const fetchGlobal = () => getJSON<GlobalData>("/api/global");
export const fetchTrending = () => getJSON<TrendingResponse>("/api/trending");
export const fetchExchanges = () => getJSON<Exchange[]>("/api/exchanges");
export const fetchChart = (id: string, period: Period) =>
  getJSON<MarketChart>(`/api/chart/${id}?period=${period}`);
