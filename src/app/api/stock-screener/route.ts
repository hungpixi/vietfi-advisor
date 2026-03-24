/**
 * /api/stock-screener — VN Stock Screening API
 * 
 * Query params: maxPE, maxPB, minROE, minMarketCap, minRating, exchange
 * Cache: 30 minutes
 */

import { NextResponse } from "next/server";
import { runScreener, DEFAULT_FILTERS, type ScreenerFilters } from "@/lib/market-data/stock-screener";

let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export async function GET(req: Request) {
  const url = new URL(req.url);

  const filters: ScreenerFilters = {
    maxPE: parseFloat(url.searchParams.get("maxPE") ?? "") || DEFAULT_FILTERS.maxPE,
    maxPB: parseFloat(url.searchParams.get("maxPB") ?? "") || DEFAULT_FILTERS.maxPB,
    minROE: parseFloat(url.searchParams.get("minROE") ?? "") || DEFAULT_FILTERS.minROE,
    minMarketCap: parseFloat(url.searchParams.get("minMarketCap") ?? "") || DEFAULT_FILTERS.minMarketCap,
    minRating: parseFloat(url.searchParams.get("minRating") ?? "") || DEFAULT_FILTERS.minRating,
    exchange: url.searchParams.get("exchange") ?? "",
  };

  // Build cache key from filters
  const cacheKey = JSON.stringify(filters);

  if (cache && Date.now() - cache.ts < CACHE_TTL && (cache as { key?: string }).key === cacheKey) {
    return NextResponse.json(cache.data, {
      headers: { "X-Cache": "HIT", "Cache-Control": "public, s-maxage=1800" },
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

    cache = { data: response, ts: Date.now(), ...{ key: cacheKey } } as typeof cache;

    return NextResponse.json(response, {
      headers: { "X-Cache": "MISS", "Cache-Control": "public, s-maxage=1800" },
    });
  } catch (error) {
    console.error("Stock screener error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock data", stocks: [] },
      { status: 500 }
    );
  }
}
