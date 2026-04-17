import { NextResponse } from "next/server";
import {
  checkFixedWindowRateLimit,
  getClientIdentifier,
  rateLimitResponse,
} from "@/lib/api-security";
import { runScreener, DEFAULT_FILTERS, type ScreenerFilters } from "@/lib/market-data/stock-screener";

type CacheEntry = {
  data: unknown;
  ts: number;
};

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;
const MAX_CACHE_KEYS = 32;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30;
const WINDOW_MS = 60_000;
const ALLOWED_EXCHANGES = new Set(["", "HOSE", "HNX", "UPCOM"]);

function clampNumber(raw: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseFloat(raw ?? "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeExchange(raw: string | null): string {
  const exchange = (raw ?? "").trim().toUpperCase();
  return ALLOWED_EXCHANGES.has(exchange) ? exchange : "";
}

function normalizeFilters(url: URL): Required<ScreenerFilters> {
  return {
    maxPE: clampNumber(url.searchParams.get("maxPE"), DEFAULT_FILTERS.maxPE ?? 15, 1, 100),
    maxPB: clampNumber(url.searchParams.get("maxPB"), DEFAULT_FILTERS.maxPB ?? 2.5, 0.1, 20),
    minROE: clampNumber(url.searchParams.get("minROE"), DEFAULT_FILTERS.minROE ?? 12, -100, 100),
    minMarketCap: clampNumber(url.searchParams.get("minMarketCap"), DEFAULT_FILTERS.minMarketCap ?? 500, 0, 10_000_000),
    minRating: clampNumber(url.searchParams.get("minRating"), DEFAULT_FILTERS.minRating ?? 2.5, 0, 5),
    exchange: normalizeExchange(url.searchParams.get("exchange")),
  };
}

function setCache(key: string, data: unknown) {
  if (cache.size >= MAX_CACHE_KEYS) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, { data, ts: Date.now() });
}

export async function GET(req: Request) {
  const rl = checkFixedWindowRateLimit(
    rateLimitMap,
    getClientIdentifier(req),
    RATE_LIMIT,
    WINDOW_MS,
  );
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter);

  const url = new URL(req.url);
  const filters = normalizeFilters(url);
  const cacheKey = JSON.stringify(filters);
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return NextResponse.json(cached.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=60" },
    });
  }

  try {
    const results = await runScreener(filters);
    const response = {
      fetchedAt: new Date().toISOString(),
      filters,
      total: results.length,
      stocks: results,
    };

    setCache(cacheKey, response);

    return NextResponse.json(response, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Stock screener error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock data", stocks: [] },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
