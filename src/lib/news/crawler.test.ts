import { describe, expect, it } from 'vitest'
import { aggregateNewsSentiment, isFinanceRelevant, type NewsArticle } from './crawler'

describe('aggregateNewsSentiment', () => {
  it('computes counts and score', () => {
    const articles: NewsArticle[] = [
      {
        id: '1',
        category: 'Chứng khoán',
        title: 'VN-Index bật tăng',
        link: 'https://cafef.vn/a',
        published: '2026-03-22T10:00:00.000Z',
        summary: 'Khởi sắc mạnh',
        content: 'Thị trường tăng',
        source: 'cafef.vn',
        sentiment: 'bullish',
        sentimentScore: 72,
        asset: 'Chứng khoán',
      },
      {
        id: '2',
        category: 'Vĩ mô',
        title: 'Rủi ro lạm phát',
        link: 'https://cafef.vn/b',
        published: '2026-03-22T11:00:00.000Z',
        summary: 'Áp lực tăng',
        content: 'Thị trường thận trọng',
        source: 'cafef.vn',
        sentiment: 'bearish',
        sentimentScore: 30,
        asset: 'Vĩ mô',
      },
      {
        id: '3',
        category: 'Vàng',
        title: 'Giá vàng đi ngang',
        link: 'https://cafef.vn/c',
        published: '2026-03-21T11:00:00.000Z',
        summary: 'Không biến động mạnh',
        content: 'Trung lập',
        source: 'cafef.vn',
        sentiment: 'neutral',
        sentimentScore: 50,
        asset: 'Vàng',
      },
    ]

    const result = aggregateNewsSentiment(articles, '2026-03-22T12:00:00.000Z')

    expect(result.totalArticles).toBe(3)
    expect(result.sentimentCounts.bullish).toBe(1)
    expect(result.sentimentCounts.bearish).toBe(1)
    expect(result.sentimentCounts.neutral).toBe(1)
    expect(result.overallNewsScore).toBe(51)
    expect(result.assetSentiment.length).toBe(3)
    expect(result.history.length).toBe(2)
  })
})

describe('isFinanceRelevant', () => {
  it('keeps finance related content', () => {
    const text = 'VN-Index giảm nhẹ, khối ngoại bán ròng và lãi suất liên ngân hàng tăng'
    expect(isFinanceRelevant(text)).toBe(true)
  })

  it('filters unrelated web/dev content', () => {
    const text = 'Hướng dẫn tối ưu SEO website bằng Next.js và React để tăng traffic'
    expect(isFinanceRelevant(text)).toBe(false)
  })

  it('filters entertainment content', () => {
    const text = 'Showbiz hôm nay: ca sĩ ra MV mới và bảng xếp hạng bóng đá cuối tuần'
    expect(isFinanceRelevant(text)).toBe(false)
  })
})
