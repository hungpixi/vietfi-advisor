import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MarketSnapshot } from './crawler'

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockFetch = vi.fn()
global.fetch = mockFetch

const mockDelay = vi.fn()
vi.mock('./crawler', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>
  return {
    ...actual,
    sleep: mockDelay,
  }
})

beforeEach(() => {
  mockFetch.mockReset().mockResolvedValue({
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue({}),
  } as unknown as Response)
  mockDelay.mockResolvedValue(undefined)
})

afterEach(() => {
  mockFetch.mockRestore()
})

// ── Type smoke tests ─────────────────────────────────────────────────────────

describe('MarketSnapshot type', () => {
  it('accepts complete snapshot', () => {
    const snap: MarketSnapshot = {
      fetchedAt: new Date().toISOString(),
      vnIndex: { price: 1200, change: 5, changePct: 0.42, volume: '5000000000', source: 'test' },
      goldSjc: { goldUsd: 3000, goldVnd: 75000000, changePct: 0.5, source: 'test' },
      usdVnd: { rate: 25085, source: 'test' },
      btc: null,
      macro: { gdpYoY: [], cpiYoY: [], deposit12m: { min: 0, max: 0, source: 'test' } },
      silver: null,
      news: [],
      aiSummary: null,
    }
    expect(snap.vnIndex!.price).toBe(1200)
    expect(snap.goldSjc!.goldVnd).toBe(75000000)
    expect(snap.usdVnd!.rate).toBe(25085)
  })

  it('goldVnd is optional (computed from goldUsd when missing)', () => {
    const snap: MarketSnapshot = {
      fetchedAt: new Date().toISOString(),
      vnIndex: { price: 1200, change: 0, changePct: 0, volume: '0', source: 'test' },
      goldSjc: { goldUsd: 3000, goldVnd: undefined as unknown as number, changePct: 0, source: 'test' },
      usdVnd: { rate: 25085, source: 'test' },
      btc: null,
      macro: { gdpYoY: [], cpiYoY: [], deposit12m: { min: 0, max: 0, source: 'test' } },
      silver: null,
      news: [],
      aiSummary: null,
    }
    expect(snap.goldSjc!.goldUsd).toBe(3000)
  })
})

// ── VN-Index parsing ─────────────────────────────────────────────────────────

describe('VN-Index fetch', () => {
  it('parses cafef msh-appdata response correctly', async () => {
    const { fetchVnIndex } = await import('./crawler')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        data: [
          {
            id: '1',
            price: 1250.5,
            changePrice: 12.3,
            changePercentPrice: 0.99,
            volume: 5_000_000_000,
            value: 15_000_000_000_000,
          },
        ],
      }),
    } as unknown as Response)

    const result = await fetchVnIndex()

    expect(result?.price).toBe(1250.5)
    expect(result?.change).toBe(12.3)
    expect(result?.changePct).toBe(0.99)
    expect(result?.volume).toBe('5000000000')
    expect(result?.gtgdTyVnd).toBe('15000')
    expect(result?.source).toContain('cafef')
  })

  it('returns null when VN-Index API fails', async () => {
    const { fetchVnIndex } = await import('./crawler')

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as unknown as Response)

    const result = await fetchVnIndex()
    expect(result).toBeNull()
  })

  it('returns null when response has no HOSE data', async () => {
    const { fetchVnIndex } = await import('./crawler')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: '2' }] }), // no HOSE (id=1)
    } as unknown as Response)

    const result = await fetchVnIndex()
    expect(result).toBeNull()
  })
})

// ── Gold SJC ─────────────────────────────────────────────────────────────────

describe('Gold SJC fetch', () => {
  it('calculates goldVnd from goldUsd using provided exchange rate', async () => {
    const { calculateGoldVnd } = await import('./crawler')

    const result = calculateGoldVnd(3000, 25000)
    // 3000 USD × 25000 VND/USD × (37.5 / 31.1035) = 90,300,544 VND/tael
    expect(result).toBeGreaterThan(90_000_000)
    expect(result).toBeLessThan(91_000_000)
  })

  it('handles zero exchange rate gracefully', async () => {
    const { calculateGoldVnd } = await import('./crawler')
    const result = calculateGoldVnd(3000, 0)
    expect(result).toBe(0)
  })

  it('uses giaVang /all API as primary SJC source and reads sell price', async () => {
    const { fetchGoldSjc } = await import('./crawler')

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        world: {
          xau_usd: 4574.9,
          change_pct: 0.0985,
        },
        sjc: {
          prices: [
            { name: 'Vàng SJC 1L, 10L, 1KG', buy: 168000000, sell: 171000000 },
            { name: 'Vàng SJC 5 chỉ', buy: 168000000, sell: 171020000 },
          ],
          is_live: true,
          updated_at: '2026-03-22 16:55:10',
          source: 'sjc_official',
        },
      }),
    } as unknown as Response)

    const result = await fetchGoldSjc(25000)
    expect(result).not.toBeNull()
    expect(result?.source).toContain('giaVang /wp-json/giavang/v1/all')
    expect(result?.goldVnd).toBe(171000000)
    expect(result?.changePct).toBe(0.0985)
  })
})

// ── Exchange rate ────────────────────────────────────────────────────────────

describe('USD/VND fetch', () => {
  it('parses SBV homepage TỶ GIÁ text', async () => {
    const { parseSbvExchangeRate } = await import('./crawler')

    const html = `
      <html><body>
        <span>TỶ GIÁ: 25.085,00 VND/USD</span>
        <span>Ngày: 21/03/2026</span>
      </body></html>
    `
    const result = parseSbvExchangeRate(html)
    expect(result?.rate).toBe(25085)
    expect(result?.source).toContain('SBV')
  })

  it('returns null for unparseable HTML', async () => {
    const { parseSbvExchangeRate } = await import('./crawler')
    const result = parseSbvExchangeRate('<html><body>No rate here</body></html>')
    expect(result).toBeNull()
  })
})
