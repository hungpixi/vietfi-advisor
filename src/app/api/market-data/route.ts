import { NextResponse } from 'next/server'
import { checkFixedWindowRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/api-security'
import { crawlMarketData, type MarketSnapshot } from '@/lib/market-data/crawler'

export const runtime = 'nodejs'

// ── In-memory cache ──────────────────────────────────────────────────────────
// Persists across requests within the same serverless function instance.
// On Vercel/serverless: cleared on cold start. On Node: persists indefinitely.
const CACHE_TTL_MS = 1 * 60 * 1000 // 1 minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60
const WINDOW_MS = 60_000

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
    if (cache) {
      // Fresh cache is fast; stale cache is still better than blocking on a network crawl.
      if (isCacheFresh()) {
        return NextResponse.json({ ...cache.snapshot, stale: false }, { status: 200 })
      }

      // Stale cache: return current snapshot immediately and revalidate in background.
      void crawl()
        .then((snapshot) => {
          cache = { snapshot, fetchedAt: Date.now() }
        })
        .catch(() => {
          // ignore background refresh failures
        })

      return NextResponse.json({ ...cache.snapshot, stale: true }, { status: 200 })
    }

    // No cache yet: fetch first time with global timeout.
    const snapshot = await Promise.race([
      crawl(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Crawl timeout')), 20000),
      ),
    ])
    cache = { snapshot, fetchedAt: Date.now() }
    return NextResponse.json({ ...snapshot, stale: false }, { status: 200 })
  } catch (error) {
    console.error('Market data fetch error:', error)
    if (cache) {
      // no fresh data, but return stale cache if exists
      return NextResponse.json({ ...cache.snapshot, stale: true }, { status: 200 })
    }
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  const rl = checkFixedWindowRateLimit(
    rateLimitMap,
    getClientIdentifier(request),
    RATE_LIMIT,
    WINDOW_MS,
  )
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  return getMarketDataResponse(crawlMarketData)
}
