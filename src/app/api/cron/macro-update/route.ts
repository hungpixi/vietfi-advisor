import { NextResponse } from 'next/server'
import { readCronCache, writeCronCache } from '@/lib/cron-cache'
import { crawlMarketData, type MarketSnapshot } from '@/lib/market-data/crawler'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Vercel Cron endpoint — triggered by vercel.json cron job.
 * Runs monthly on the 1st at midnight Vietnam time (UTC+7).
 *
 * Vercel sends: { cron: true } body with CRON_SECRET header.
 */

interface MacroUpdatePayload {
  status: 'ok'
  updatedAt: string
  source: string
  macro: MarketSnapshot['macro']
  usdVnd: MarketSnapshot['usdVnd']
  vnIndex: Pick<NonNullable<MarketSnapshot['vnIndex']>, 'price' | 'changePct' | 'source'> | null
}

function buildMacroPayload(snapshot: MarketSnapshot): MacroUpdatePayload {
  return {
    status: 'ok',
    updatedAt: snapshot.fetchedAt,
    source: 'market-data-crawler',
    macro: snapshot.macro,
    usdVnd: snapshot.usdVnd,
    vnIndex: snapshot.vnIndex
      ? {
          price: snapshot.vnIndex.price,
          changePct: snapshot.vnIndex.changePct,
          source: snapshot.vnIndex.source,
        }
      : null,
  }
}

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/macro-update] CRON_SECRET is not set — rejecting request')
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
    const payload = buildMacroPayload(snapshot)

    const persisted = await writeCronCache('macro-update', payload, 'api/cron/macro-update')

    return NextResponse.json(
      { ...payload, persisted },
      { status: 200 },
    )
  } catch (err) {
    console.error('[cron/macro-update] Error, trying fallback cache:', err)
    const cached = await readCronCache<MacroUpdatePayload>('macro-update')
    if (cached?.payload) {
      return NextResponse.json(
        {
          ...cached.payload,
          stale: true,
          fallback: true,
          persisted: false,
          cachedAt: new Date(cached.fetchedAt).toISOString(),
        },
        { status: 200 },
      )
    }
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
