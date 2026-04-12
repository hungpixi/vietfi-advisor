import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import DashboardOverview from './page'

const mockFetchData = vi.fn()
vi.stubGlobal('fetch', mockFetchData)
vi.stubGlobal('Notification', { permission: 'default' })
vi.stubGlobal(
  'IntersectionObserver',
  class IntersectionObserverMock {
    callback: IntersectionObserverCallback

    constructor(callback: IntersectionObserverCallback) {
      this.callback = callback
    }

    observe() {
      this.callback([{ isIntersecting: true } as IntersectionObserverEntry], this as unknown as IntersectionObserver)
    }

    disconnect() {}

    unobserve() {}
  } as unknown as typeof IntersectionObserver
)

const onboardingData = {
  completed: true,
  income: 0,
  hasDebt: false,
  riskProfile: 'balanced',
  setupAt: new Date().toISOString(),
}

const successJson = {
  fetchedAt: '2026-03-21T08:30:00.000Z',
  vnIndex: { price: 1647.81, change: -51.32, changePct: -3.02, volume: '961235269', source: 'cafef' },
  goldSjc: { goldUsd: 4574.9, goldVnd: 144114487, changePct: 0.5, source: 'yahoo' },
  usdVnd: { rate: 26127.87, source: 'open.er-api.com' },
}

beforeEach(() => {
  localStorage.clear()
  localStorage.setItem('vietfi_onboarding', JSON.stringify(onboardingData))
  mockFetchData.mockReset()
})

describe('DashboardOverview', () => {
  it('shows market skeleton while data is fetching', async () => {
    mockFetchData.mockImplementationOnce(() => new Promise(() => {}))
    await act(async () => {
      render(<DashboardOverview />)
    })

    expect(screen.getAllByTestId('market-skeleton').length).toBeGreaterThan(0)
  })

  it('handles invalid localStorage JSON without crashing and uses fallback income-derived net worth', async () => {
    localStorage.setItem('vietfi_pots', '{ invalid json')
    localStorage.setItem('vietfi_expenses', '{ invalid json')
    localStorage.setItem('vietfi_income', '10000000')

    mockFetchData.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(successJson),
    } as unknown as Response)

    await act(async () => {
      render(<DashboardOverview />)
    })

    await waitFor(() => {
      expect(screen.getByText(/Đã lưu thu nhập/i)).toBeInTheDocument()
    })
  })

  it('handles net=0 and income=0 case using precise net calculation', async () => {
    localStorage.setItem('vietfi_pots', JSON.stringify([{ id: '1', allocated: 1000000 }]))
    localStorage.setItem('vietfi_expenses', JSON.stringify([{ id: '1', amount: 1000000 }]))
    localStorage.setItem('vietfi_income', '0')

    mockFetchData.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(successJson),
    } as unknown as Response)

    await act(async () => {
      render(<DashboardOverview />)
    })

    await waitFor(() => {
      expect(screen.getByText(/Chưa có thu nhập/i)).toBeInTheDocument()
    })
  })

  it('renders rich morning brief sections when API returns them', async () => {
    mockFetchData.mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/api/morning-brief')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({
            fetchedAt: '2026-03-21T08:30:00.000Z',
            date: 'Hôm nay, 21/03/2026',
            title: 'Morning Brief AI',
            summary: 'Bản tin buổi sáng dài, có nhiều đoạn.\n\nĐoạn hai cho đủ chất memo.',
            raw: 'raw',
            source: 'gemini',
            thesis: 'Thị trường đang nghiêng tích cực nhưng chưa bền.',
            marketOverview: 'VN-Index đi ngang, vàng neo cao.',
            macroContext: 'GDP ổn, CPI còn phải theo dõi.',
            newsSynthesis: 'Tin nóng hôm nay vẫn xoay quanh cổ phiếu và vàng.',
            risks: ['Rủi ro thanh khoản', 'Rủi ro FOMO'],
            actionItems: ['Giữ kỷ luật', 'Không mua đuổi'],
            takeaways: [
              { emoji: '🟢', asset: 'Chứng khoán', text: 'Dòng tiền vẫn chọn lọc.' },
            ],
          }),
        } as unknown as Response)
      }

      if (url.includes('/api/news')) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ articles: [] }),
        } as unknown as Response)
      }

      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve(successJson),
      } as unknown as Response)
    })

    await act(async () => {
      render(<DashboardOverview />)
    })

    await waitFor(() => {
      expect(screen.getByText('Luận điểm chính')).toBeInTheDocument()
    })

    expect(screen.getByText('Thị trường')).toBeInTheDocument()
    expect(screen.getByText('Vĩ mô')).toBeInTheDocument()
    expect(screen.getByText('Tổng hợp tin nóng')).toBeInTheDocument()
    expect(screen.getByText('Rủi ro / watchlist')).toBeInTheDocument()
    expect(screen.getByText('Việc nên làm')).toBeInTheDocument()
  })
})
