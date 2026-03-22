process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key'

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/morning-brief', () => ({
  refreshMorningBriefCache: vi.fn(),
}))

import { POST } from './route'
import * as mbLib from '@/lib/morning-brief'

describe('/api/cron/morning-brief', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.CRON_SECRET
  })

  it('returns 401 when no auth header for protected cron', async () => {
    process.env.CRON_SECRET = 'secret'
    const request = new Request('http://localhost', { method: 'POST' })

    const response = await POST(request)
    expect(response.status).toBe(401)

    const body = await response.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns 200 and brief on valid authorization', async () => {
    process.env.CRON_SECRET = 'secret'
    const request = new Request('http://localhost', { method: 'POST', headers: { Authorization: 'Bearer secret' } })
    vi.spyOn(mbLib, 'refreshMorningBriefCache').mockResolvedValue({
      date: 'Hôm nay, 22/03/2026',
      title: 'Morning Brief AI',
      summary: 'Test summary',
      raw: 'Test summary',
      takeaways: [],
    })

    const response = await POST(request)
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.brief.summary).toBe('Test summary')
  })
})
