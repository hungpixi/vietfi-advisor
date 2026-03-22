import { NextResponse } from 'next/server'
import { getMorningBriefCached, resetMorningBriefCache } from '@/lib/morning-brief'

export const runtime = 'nodejs'

export async function getMorningBriefResponse() {
  try {
    const { brief, stale } = await getMorningBriefCached()
    return NextResponse.json({ ...brief, stale }, { status: 200 })
  } catch (err) {
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
