import { NextResponse } from 'next/server'
import { checkFixedWindowRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/api-security'
import { crawlNews, type NewsSnapshot } from '@/lib/news/crawler'

export const runtime = 'nodejs'

const CACHE_TTL_MS = 10 * 60 * 1000
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 60
const WINDOW_MS = 60_000

interface CacheEntry {
  snapshot: NewsSnapshot
  fetchedAt: number
}

let cache: CacheEntry | null = null

export function resetNewsCache() {
  cache = null
}

function isCacheFresh(): boolean {
  if (!cache) return false
  return Date.now() - cache.fetchedAt < CACHE_TTL_MS
}

export async function getNewsResponse(crawl: () => Promise<NewsSnapshot>) {
  try {
    if (cache) {
      if (isCacheFresh()) {
        return NextResponse.json({ ...cache.snapshot, stale: false }, { status: 200 })
      }

      void crawl()
        .then((snapshot) => {
          cache = { snapshot, fetchedAt: Date.now() }
        })
        .catch(() => {
          // ignore failed background refresh
        })

      return NextResponse.json({ ...cache.snapshot, stale: true }, { status: 200 })
    }

    const snapshot = await crawl()
    cache = { snapshot, fetchedAt: Date.now() }

    return NextResponse.json({ ...snapshot, stale: false }, { status: 200 })
  } catch {
    if (cache) {
      return NextResponse.json({ ...cache.snapshot, stale: true }, { status: 200 })
    }
    return NextResponse.json({ error: 'Failed to fetch news data' }, { status: 500 })
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

  return getNewsResponse(() =>
    crawlNews({ includeContent: false, enableAiReview: false }),
  )
}
