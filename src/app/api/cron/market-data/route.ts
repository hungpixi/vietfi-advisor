import { NextResponse } from 'next/server'
import { crawlMarketData } from '@/lib/market-data/crawler'

export const runtime = 'nodejs'

/**
 * Vercel Cron endpoint — triggered by vercel.json cron job.
 * Runs weekdays at 8:30am Vietnam time (UTC+7).
 *
 * Vercel sends: { cron: true } body with CRON_SECRET header.
 */
export async function POST(request: Request) {
  // Verify cron secret to prevent unauthorized invocations
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const snapshot = await crawlMarketData()

    // TODO: Persist to Supabase or localStorage cache
    // For now, just return the snapshot
    console.log('[cron/market-data] Fetched at', snapshot.fetchedAt)

    return NextResponse.json(
      {
        status: 'ok',
        fetchedAt: snapshot.fetchedAt,
        vnIndex: snapshot.vnIndex?.price ?? null,
        goldVnd: snapshot.goldSjc?.goldVnd ?? null,
        usdVnd: snapshot.usdVnd?.rate ?? null,
      },
      { status: 200 },
    )
  } catch (err) {
    console.error('[cron/market-data] Error:', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
