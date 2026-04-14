import { NextResponse } from 'next/server'
import { getMorningBriefCached, resetMorningBriefCache } from '@/lib/morning-brief'
import { readCronCache, writeCronCache } from '@/lib/cron-cache'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const PERSISTED_CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

export async function getMorningBriefResponse() {
  const persisted = await readCronCache<Awaited<ReturnType<typeof getMorningBriefCached>>['brief']>('morning-brief')
  const persistedFresh =
    persisted && Date.now() - persisted.fetchedAt <= PERSISTED_CACHE_TTL_MS

  if (persistedFresh) {
    return NextResponse.json({ ...persisted.payload, stale: false }, { status: 200 })
  }

  try {
    const { brief, stale } = await getMorningBriefCached()
    void writeCronCache('morning-brief', brief, 'api/morning-brief')
    return NextResponse.json({ ...brief, stale }, { status: 200 })
  } catch (err) {
    if (persisted) {
      return NextResponse.json({ ...persisted.payload, stale: true }, { status: 200 })
    }

    console.error('[api/morning-brief] Error:', err)
    return NextResponse.json({ error: 'Failed to fetch morning brief' }, { status: 500 })
  }
}

export function resetMorningBriefRouteCache() {
  resetMorningBriefCache()
}

export async function GET() {
  return getMorningBriefResponse()
}
