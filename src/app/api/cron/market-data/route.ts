import { NextResponse } from 'next/server'
import { crawlMarketData } from '@/lib/market-data/crawler'
import { writeCronCache } from '@/lib/cron-cache'

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
  if (!cronSecret) {
    console.error('[cron/market-data] CRON_SECRET is not set — rejecting request')
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET not set' },
      { status: 500 },
    )
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const snapshot = await crawlMarketData()
    const persisted = await writeCronCache('market-data', snapshot, 'api/cron/market-data')

    return NextResponse.json(
      {
        status: 'ok',
        persisted,
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
