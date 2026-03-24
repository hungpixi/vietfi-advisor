import { NextResponse } from 'next/server'
import { refreshMorningBriefCache } from '@/lib/morning-brief'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    console.error('[cron/morning-brief] CRON_SECRET is not set — rejecting request')
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
    const brief = await refreshMorningBriefCache()
    return NextResponse.json({ status: 'ok', brief }, { status: 200 })
  } catch (err) {
    console.error('[cron/morning-brief] Error:', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
