import { NextResponse } from 'next/server'
import { writeCronCache } from '@/lib/cron-cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Vercel Cron endpoint — triggered by vercel.json cron job.
 * Runs monthly on the 1st at midnight Vietnam time (UTC+7).
 *
 * Vercel sends: { cron: true } body with CRON_SECRET header.
 *
 * TODO (WDA2026/Hoàng): Implement macro-economic data refresh.
 * Candidates: USD/VND rate, GSO CPI components, VN-Index P/E band,
 * G-bond yield curve, PMI/PMI-NMI from VCCI.
 */
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
    // TODO: Fetch and persist macro-economic indicators
    // - Exchange rates (USD/VND from SBV or Eximbank/ACB public rates)
    // - Official CPI components from GSO Vietnam (gso.gov.vn)
    // - VN-Index monthly close for P/E band history
    // - G-bond yield tenor data from HNX or VBMA

    const payload = {
      status: 'ok',
      note: 'Macro-update cron stub — implement in next iteration',
      updatedAt: new Date().toISOString(),
    }

    const persisted = await writeCronCache('macro-update', payload, 'api/cron/macro-update')

    return NextResponse.json(
      { ...payload, persisted },
      { status: 200 },
    )
  } catch (err) {
    console.error('[cron/macro-update] Error:', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
