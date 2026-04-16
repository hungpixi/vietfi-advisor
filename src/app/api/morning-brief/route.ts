import { NextResponse } from 'next/server'
import { checkFixedWindowRateLimit, getClientIdentifier, rateLimitResponse } from '@/lib/api-security'
import { getMorningBriefCached, resetMorningBriefCache } from '@/lib/morning-brief'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT = 30
const WINDOW_MS = 60_000

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

export async function GET(request: Request) {
  const rl = checkFixedWindowRateLimit(
    rateLimitMap,
    getClientIdentifier(request),
    RATE_LIMIT,
    WINDOW_MS,
  )
  if (!rl.allowed) return rateLimitResponse(rl.retryAfter)

  return getMorningBriefResponse()
}
