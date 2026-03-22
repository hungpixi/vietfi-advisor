import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getNewsResponse, resetNewsCache } from './route'
import type { NewsSnapshot } from '@/lib/news/crawler'

describe('getNewsResponse', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    resetNewsCache()
  })

  it('returns 200 with snapshot when crawl succeeds', async () => {
    const snapshot: NewsSnapshot = {
      fetchedAt: '2026-03-22T08:30:00.000Z',
      articles: [],
      metrics: {
        fetchedAt: '2026-03-22T08:30:00.000Z',
        totalArticles: 0,
        sentimentCounts: { bullish: 0, bearish: 0, neutral: 0 },
        overallNewsScore: 50,
        overallZone: 'neutral',
        assetSentiment: [],
        history: [],
      },
    }

    const response = await getNewsResponse(() => Promise.resolve(snapshot))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.stale).toBe(false)
    expect(body.metrics.overallNewsScore).toBe(50)
  })

  it('returns 500 when crawl fails and no cache', async () => {
    const response = await getNewsResponse(() => Promise.reject(new Error('network error')))
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to fetch news data' })
  })

  it('returns stale cache when crawl fails after warm cache', async () => {
    const nowSpy = vi.spyOn(Date, 'now')
    nowSpy.mockReturnValue(1_000_000)

    const snapshot: NewsSnapshot = {
      fetchedAt: '2026-03-22T08:30:00.000Z',
      articles: [],
      metrics: {
        fetchedAt: '2026-03-22T08:30:00.000Z',
        totalArticles: 0,
        sentimentCounts: { bullish: 0, bearish: 0, neutral: 0 },
        overallNewsScore: 50,
        overallZone: 'neutral',
        assetSentiment: [],
        history: [],
      },
    }

    await getNewsResponse(() => Promise.resolve(snapshot))

    // Make existing cache stale (TTL is 10 minutes) so code path re-crawls.
    nowSpy.mockReturnValue(1_000_000 + 11 * 60 * 1000)

    const response = await getNewsResponse(() => Promise.reject(new Error('network error')))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.stale).toBe(true)
  })
})
