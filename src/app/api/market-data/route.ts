import { NextResponse } from 'next/server'
import { crawlMarketData, type MarketSnapshot } from '@/lib/market-data/crawler'

export const runtime = 'nodejs'

// ── In-memory cache ──────────────────────────────────────────────────────────
// Persists across requests within the same serverless function instance.
// On Vercel/serverless: cleared on cold start. On Node: persists indefinitely.
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

interface CacheEntry {
  snapshot: MarketSnapshot
  fetchedAt: number
}

let cache: CacheEntry | null = null

// Exported so route.test.ts can reset state between test cases
export function resetMarketDataCache() {
  cache = null
}

function isCacheFresh(): boolean {
  if (!cache) return false
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS
}

/**
 * Injectable — crawls and returns a JSON response.
 * Separated so it can be unit-tested without HTTP mocking.
 */
export async function getMarketDataResponse(
  crawl: () => Promise<MarketSnapshot>,
) {
  try {
    // Serve from cache if fresh
    if (isCacheFresh() && cache) {
      return NextResponse.json(cache.snapshot, { status: 200 })
    }

    // Crawl fresh data
    const snapshot = await crawl()

    // Store in cache
    cache = { snapshot, fetchedAt: Date.now() }

    return NextResponse.json(snapshot, { status: 200 })
  } catch {
    // On crawl failure, try to serve stale cache (better than nothing)
    if (cache) {
      return NextResponse.json(cache.snapshot, { status: 200 })
    }
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}

export async function GET() {
  return getMarketDataResponse(crawlMarketData)
}
