import { NextResponse } from 'next/server'
import { crawlMarketData, type MarketSnapshot } from '@/lib/market-data/crawler'

export const runtime = 'nodejs'

/**
 * Injectable — crawls and returns a JSON response.
 * Separated so it can be unit-tested without HTTP mocking.
 */
export async function getMarketDataResponse(
  crawl: () => Promise<MarketSnapshot>,
) {
  try {
    const snapshot = await crawl()
    return NextResponse.json(snapshot, { status: 200 })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}

export async function GET() {
  return getMarketDataResponse(crawlMarketData)
}
