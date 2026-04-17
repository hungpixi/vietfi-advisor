process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key'

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/market-data/crawler', () => ({
  crawlMarketData: vi.fn(async () => ({
    fetchedAt: '2026-03-22T09:00:00.000Z',
    vnIndex: { price: 1200, change: 8, changePct: 0.68, volume: '123', source: 'test' },
    goldSjc: { goldUsd: 2800, goldVnd: 78000000, changePct: 0.54, source: 'test' },
    usdVnd: { rate: 25000, source: 'test' },
    btc: null,
    macro: { gdpYoY: [], cpiYoY: [], deposit12m: { min: 0, max: 0, source: 'test' } },
    aiSummary: null,
  })),
}))

vi.mock('@/lib/news/crawler', () => ({
  crawlNews: vi.fn(async () => ({
    fetchedAt: '2026-03-22T09:00:00.000Z',
    articles: [
      { id: '1', category: 'Chứng khoán', title: 'VN-Index bật tăng', link: '', published: '', summary: 'VN-Index dưới 1000', content: '', source: 'CafeF', sentiment: 'bullish', sentimentScore: 95, asset: 'Chứng khoán' },
      { id: '2', category: 'Vàng', title: 'Vàng ổn định', link: '', published: '', summary: 'Giá vàng đi ngang', content: '', source: 'CafeF', sentiment: 'neutral', sentimentScore: 50, asset: 'Vàng' },
    ],
    metrics: {
      fetchedAt: '2026-03-22T09:00:00.000Z',
      totalArticles: 2,
      sentimentCounts: { bullish: 1, bearish: 0, neutral: 1 },
      overallNewsScore: 70,
      overallZone: 'greed',
      assetSentiment: [],
      history: [],
    },
  })),
}))

vi.mock('@/lib/gemini-batch', () => ({
  generateMorningBrief: vi.fn(async () => ({
    summary: 'VN-Index và thị trường vàng có tín hiệu tích cực. Nên theo dõi USD/VND và news từ doanh nghiệp lớn.',
    takeaways: [
      { emoji: '🟢', asset: 'Chứng khoán', text: 'VN-Index dưới 1000' },
      { emoji: '🟡', asset: 'Vàng', text: 'Giá vàng đi ngang' },
    ],
  })),
}))

import { buildMorningBrief, getMorningBriefCached, refreshMorningBriefCache, resetMorningBriefCache } from './morning-brief'



describe('morning-brief utils', () => {
  beforeEach(() => {
    resetMorningBriefCache()
  })

  it('buildMorningBrief returns an object with summary and takeaways', async () => {
    const brief = await buildMorningBrief()

    expect(brief.title).toBe('Morning Brief AI')
    expect(brief.summary).toContain('VN-Index và thị trường vàng')
    expect(brief.takeaways.length).toBe(2)
  })

  it('getMorningBriefCached uses cache and returns stale flag', async () => {
    const first = await getMorningBriefCached()
    expect(first.stale).toBe(false)

    const second = await getMorningBriefCached()
    expect(second.stale).toBe(false)

    // Simulate expiration by setting clock forward
    const clock = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 20 * 60 * 1000)
    const third = await getMorningBriefCached()
    expect(third.stale).toBe(true)
    clock.mockRestore()
  })

  it('refreshMorningBriefCache updates cache and returns data', async () => {
    const brief = await refreshMorningBriefCache()
    expect(brief.title).toBe('Morning Brief AI')
  })

  it('buildMorningBrief falls back to heuristic when GEMINI_API_KEY missing', async () => {
    delete process.env.GEMINI_API_KEY
    const brief = await buildMorningBrief()
    expect(brief.source).toBe('heuristic')
    expect(brief.summary).toContain('VN-Index bật tăng')
  })
})
