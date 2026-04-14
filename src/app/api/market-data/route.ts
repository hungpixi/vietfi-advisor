import { NextResponse } from 'next/server'
import { crawlMarketData, type MarketSnapshot } from '@/lib/market-data/crawler'
import { readCronCache, writeCronCache } from '@/lib/cron-cache'

export const runtime = 'nodejs'

// ── In-memory cache ──────────────────────────────────────────────────────────
// Persists across requests within the same serverless function instance.
// On Vercel/serverless: cleared on cold start. On Node: persists indefinitely.
const CACHE_TTL_MS = 1 * 60 * 1000 // 1 minute
const PERSISTED_CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

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
  const readPersistedCache = async () => {
    const cached = await readCronCache<MarketSnapshot>('market-data')
    if (!cached) return null
    return {
      snapshot: cached.payload,
      stale: Date.now() - cached.fetchedAt > PERSISTED_CACHE_TTL_MS,
    }
  }

  const persistSnapshot = async (snapshot: MarketSnapshot) => {
    await writeCronCache('market-data', snapshot, 'api/market-data')
  }

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
          void writeCronCache('market-data', snapshot, 'api/market-data')
        })
        .catch(() => {
          // ignore background refresh failures
        })

      return NextResponse.json({ ...cache.snapshot, stale: true }, { status: 200 })
    }

    const persisted = await readPersistedCache()
    if (persisted && !persisted.stale) {
      cache = { snapshot: persisted.snapshot, fetchedAt: Date.now() }
      return NextResponse.json({ ...persisted.snapshot, stale: false }, { status: 200 })
    }

    // No cache yet: fetch first time.
    const snapshot = await crawl()
    cache = { snapshot, fetchedAt: Date.now() }
    void persistSnapshot(snapshot)
    return NextResponse.json({ ...snapshot, stale: false }, { status: 200 })
  } catch {
    const persisted = await readPersistedCache()
    if (persisted) {
      return NextResponse.json({ ...persisted.snapshot, stale: true }, { status: 200 })
    }

    if (cache) {
      // no fresh data, but return stale cache if exists
      return NextResponse.json({ ...cache.snapshot, stale: true }, { status: 200 })
    }
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}

export async function GET() {
  return getMarketDataResponse(crawlMarketData)
}
