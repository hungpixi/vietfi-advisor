import { NextResponse } from 'next/server'
import { refreshMorningBriefCache } from '@/lib/morning-brief'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  try {
    const brief = await refreshMorningBriefCache()
    console.log('[cron/morning-brief] Generated at', new Date().toISOString())
    return NextResponse.json({ status: 'ok', brief }, { status: 200 })
  } catch (err) {
    console.error('[cron/morning-brief] Error:', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
