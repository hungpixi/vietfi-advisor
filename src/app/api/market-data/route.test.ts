import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getMarketDataResponse } from './route'
import type { MarketSnapshot } from '@/lib/market-data/crawler'

// ── Tests ────────────────────────────────────────────────────────────────────

describe('getMarketDataResponse', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns 200 with snapshot when crawler succeeds', async () => {
    const snapshot: MarketSnapshot = {
      fetchedAt: '2026-03-21T08:30:00.000Z',
      vnIndex: {
        price: 1250, change: 10, changePct: 0.8,
        volume: '5000000000', gtgdTyVnd: '15000', source: 'test',
      },
      goldSjc: { goldUsd: 3000, goldVnd: 75000000, changePct: 0.5, source: 'test' },
      usdVnd: { rate: 25085, source: 'test' },
    }

    const response = await getMarketDataResponse(() => Promise.resolve(snapshot))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(snapshot)
  })

  it('returns 500 with error when crawler throws', async () => {
    const response = await getMarketDataResponse(() =>
      Promise.reject(new Error('network error')),
    )
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body).toEqual({ error: 'Failed to fetch market data' })
  })

  it('returns partial data when vnIndex is null', async () => {
    const snapshot: MarketSnapshot = {
      fetchedAt: '2026-03-21T08:30:00.000Z',
      vnIndex: null,
      goldSjc: { goldUsd: 3000, goldVnd: 75000000, changePct: 0.5, source: 'test' },
      usdVnd: { rate: 25085, source: 'test' },
    }

    const response = await getMarketDataResponse(() => Promise.resolve(snapshot))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.vnIndex).toBeNull()
    expect(body.goldSjc.goldVnd).toBe(75000000)
  })
})
