process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key'

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/morning-brief', () => ({
  getMorningBriefCached: vi.fn(),
  resetMorningBriefCache: vi.fn(),
}))

import { getMorningBriefResponse, resetMorningBriefRouteCache } from './route'
import * as mbLib from '@/lib/morning-brief'

const sampleBrief = {
  date: 'Hôm nay, 22/03/2026',
  title: 'Morning Brief AI',
  summary: 'Test summary',
  raw: 'Test summary',
  takeaways: [],
}

describe('/api/morning-brief', () => {
  beforeEach(() => {
    resetMorningBriefRouteCache()
    vi.restoreAllMocks()
  })

  it('returns 200 and data when cache fetch succeeds', async () => {
    vi.spyOn(mbLib, 'getMorningBriefCached').mockResolvedValue({ brief: sampleBrief, stale: false })

    const response = await getMorningBriefResponse()
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.summary).toBe('Test summary')
    expect(body.stale).toBe(false)
  })

  it('returns 500 when helper throws', async () => {
    vi.spyOn(mbLib, 'getMorningBriefCached').mockRejectedValue(new Error('fail'))

    const response = await getMorningBriefResponse()
    expect(response.status).toBe(500)

    const body = await response.json()
    expect(body.error).toBe('Failed to fetch morning brief')
  })
})
