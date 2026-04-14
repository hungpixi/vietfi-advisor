import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/market-data/crawler', () => ({
  crawlMarketData: vi.fn(),
}))
vi.mock('@/lib/cron-cache', () => ({
  readCronCache: vi.fn(),
  writeCronCache: vi.fn(),
}))

import { POST } from './route'
import * as crawler from '@/lib/market-data/crawler'
import * as cronCache from '@/lib/cron-cache'

describe('/api/cron/macro-update', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.CRON_SECRET = 'secret'
  })

  it('returns 401 for invalid auth', async () => {
    const response = await POST(new Request('http://localhost', { method: 'POST' }))
    expect(response.status).toBe(401)
  })

  it('returns persisted=true when refresh succeeds', async () => {
    vi.spyOn(crawler, 'crawlMarketData').mockResolvedValue({
      fetchedAt: '2026-04-14T00:00:00.000Z',
      vnIndex: { price: 1200, change: 8, changePct: 0.67, volume: '0', source: 'test' },
      goldSjc: null,
      silver: null,
      goldBrands: {},
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
    expect(body.source).toBe('market-data-crawler')
    expect(body.vnIndex.price).toBe(1200)
  })

  it('returns stale cached payload when refresh fails', async () => {
    vi.spyOn(crawler, 'crawlMarketData').mockRejectedValue(new Error('crawl failed'))
    vi.spyOn(cronCache, 'readCronCache').mockResolvedValue({
      payload: {
        status: 'ok',
        updatedAt: '2026-04-01T00:00:00.000Z',
        source: 'market-data-crawler',
        macro: {
          gdpYoY: [{ period: '2025', value: 8.02 }],
          cpiYoY: [{ period: '2025', value: 3.31 }],
          deposit12m: { min: 5.2, max: 7.2, source: 'CafeF' },
        },
        usdVnd: { rate: 25100, source: 'test' },
        vnIndex: { price: 1190, changePct: -0.2, source: 'test' },
      },
      fetchedAt: new Date('2026-04-01T00:00:00.000Z').getTime(),
    })

    const response = await POST(
      new Request('http://localhost', {
        method: 'POST',
        headers: { Authorization: 'Bearer secret' },
      }),
    )

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.stale).toBe(true)
    expect(body.fallback).toBe(true)
    expect(body.persisted).toBe(false)
    expect(body.vnIndex.price).toBe(1190)
  })
})
