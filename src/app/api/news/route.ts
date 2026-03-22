import { NextResponse } from 'next/server'
import { crawlNews, type NewsSnapshot } from '@/lib/news/crawler'

export const runtime = 'nodejs'

const CACHE_TTL_MS = 5 * 60 * 1000

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
    if (isCacheFresh() && cache) {
      return NextResponse.json({ ...cache.snapshot, stale: false }, { status: 200 })
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

export async function GET() {
  return getNewsResponse(() => crawlNews({ includeContent: false }))
}
