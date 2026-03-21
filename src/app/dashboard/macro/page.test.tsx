import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import MacroPage from './page'

// ── Mock fetch ────────────────────────────────────────────────────────────────

const mockFetchData = vi.fn()
vi.stubGlobal('fetch', mockFetchData)

beforeEach(() => {
  mockFetchData.mockReset()
})

// ── Helpers ────────────────────────────────────────────────────────────────

const successJson = {
  fetchedAt: '2026-03-21T08:30:00.000Z',
  vnIndex: { price: 1647.81, change: -51.32, changePct: -3.02, volume: '961235269', source: 'cafef' },
  goldSjc: { goldUsd: 4574.9, goldVnd: 144114487, changePct: 0.5, source: 'yahoo' },
  usdVnd: { rate: 26127.87, source: 'open.er-api.com' },
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('MacroPage', () => {
  it('shows loading skeletons while fetching', async () => {
    // Never resolve
    mockFetchData.mockImplementationOnce(() => new Promise(() => {}))

    await act(async () => {
      render(<MacroPage />)
    })

    const skeletons = screen.getAllByTestId('macro-skeleton')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
  })

  it('displays VN-Index price when data loads', async () => {
    mockFetchData.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(successJson),
    } as unknown as Response)

    await act(async () => {
      render(<MacroPage />)
    })

    await waitFor(() => {
      expect(screen.queryByTestId('macro-skeleton')).not.toBeInTheDocument()
    })

    expect(screen.getByText('1,647.81')).toBeInTheDocument()
  })

  it('displays Gold SJC price in VND', async () => {
    mockFetchData.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve(successJson),
    } as unknown as Response)

    await act(async () => {
      render(<MacroPage />)
    })

    await waitFor(() => {
      expect(screen.queryByTestId('macro-skeleton')).not.toBeInTheDocument()
    })

    // Gold card shows: "144.1 tr/lượng" — use getAllByText[0] to target the
    // IndicatorCard value (renders before the commentary paragraph)
    expect(screen.getByText('Vàng SJC')).toBeInTheDocument()
    expect(screen.getAllByText(/144.*tr\/lượng/)[0]).toBeInTheDocument()
  })

  it('shows error state when HTTP response is not ok', async () => {
    mockFetchData.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as unknown as Response)

    await act(async () => {
      render(<MacroPage />)
    })

    await waitFor(() => {
      expect(screen.queryByTestId('macro-skeleton')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('macro-error')).toBeInTheDocument()
  })

  it('shows retry button in error state', async () => {
    mockFetchData.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({}),
    } as unknown as Response)

    await act(async () => {
      render(<MacroPage />)
    })

    await waitFor(() => {
      expect(screen.queryByTestId('macro-skeleton')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Thử lại')).toBeInTheDocument()
  })
})
