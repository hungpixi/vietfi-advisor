import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/market-data/crawler', () => ({
  crawlMarketData: vi.fn(),
}))
vi.mock('@/lib/cron-cache', () => ({
  writeCronCache: vi.fn(),
}))

import { POST } from './route'
import * as crawler from '@/lib/market-data/crawler'
import * as cronCache from '@/lib/cron-cache'

describe('/api/cron/market-data', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.CRON_SECRET = 'secret'
  })

  it('returns 401 for invalid auth', async () => {
    const response = await POST(new Request('http://localhost', { method: 'POST' }))
    expect(response.status).toBe(401)
  })

  it('returns persisted=true when crawl succeeds and cache write succeeds', async () => {
    vi.spyOn(crawler, 'crawlMarketData').mockResolvedValue({
      fetchedAt: '2026-04-14T00:00:00.000Z',
      vnIndex: { price: 1200, change: 10, changePct: 0.8, volume: '0', source: 'test' },
      goldSjc: { goldUsd: 3000, goldVnd: 90000000, changePct: 0.5, source: 'test' },
      silver: null,
      usdVnd: { rate: 25000, source: 'test' },
      btc: null,
      news: [],
      macro: {
        gdpYoY: [{ period: '2025', value: 8.02 }],
        cpiYoY: [{ period: '2025', value: 3.31 }],
        deposit12m: { min: 5.2, max: 7.2, source: 'CafeF' },
      },
      aiSummary: null,
    })
    vi.spyOn(cronCache, 'writeCronCache').mockResolvedValue(true)

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { Authorization: 'Bearer secret' },
      }),
    )
    expect(response.status).toBe(200)

    const body = await response.json()
    expect(body.status).toBe('ok')
    expect(body.persisted).toBe(true)
  })
})
