import { NextResponse } from 'next/server'
import { crawlMarketData } from '@/lib/market-data/crawler'
import { writeCronCache } from '@/lib/cron-cache'
import { upsertOHLCV, getLatestDate } from '@/lib/market-data/ohlcv-db'

export const runtime = 'nodejs'

// Tickers cần sync OHLCV hàng ngày
const OHLCV_TICKERS = ['FPT', 'VCB', 'TCB', 'MBB', 'SSI', 'VNM', 'HPG', 'VPB', 'VIC', 'VHM', 'ACB', 'VNINDEX']

const TCBS_BASE = 'https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term'
const TCBS_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
  Accept: 'application/json',
  Referer: 'https://tcinvest.tcbs.com.vn/',
}

/**
 * Fetch EOD bar từ TCBS cho một ticker.
 * fromDate và toDate là ISO date strings "YYYY-MM-DD".
 */
async function fetchTcbsOHLCV(ticker: string, fromDate: string, toDate: string) {
  const from = Math.floor(new Date(fromDate).getTime() / 1000)
  const to = Math.floor(new Date(toDate).getTime() / 1000)
  const url = `${TCBS_BASE}?ticker=${ticker}&type=stock&resolution=D&from=${from}&to=${to}`

  const resp = await fetch(url, { headers: TCBS_HEADERS, cache: 'no-store' })
  if (!resp.ok) return []

  const json = await resp.json() as {
    data?: Array<{
      tradingDate?: number; open?: number; high?: number; low?: number; close?: number; volume?: number
    }>
  }

  return (json.data ?? []).flatMap((r) => {
    if (!r.tradingDate || !r.close) return []
    const d = new Date(r.tradingDate * 1000)
    const date = new Date(d.getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10)
    return [{
      date,
      open: r.open ?? r.close,
      high: r.high ?? r.close,
      low: r.low ?? r.close,
      close: r.close,
      volume: r.volume ?? 0,
    }]
  })
}

/**
 * Vercel Cron endpoint — triggered by vercel.json cron job.
 * Runs weekdays at 18:30 Vietnam time (UTC+7 = 11:30 UTC).
 */
export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not set' }, { status: 500 })
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().slice(0, 10)
  const results: Record<string, number> = {}

  try {
    // 1. Macro data (existing)
    const snapshot = await crawlMarketData()
    const persisted = await writeCronCache('market-data', snapshot, 'api/cron/market-data')

    // 2. OHLCV sync — incremental per ticker
    for (const ticker of OHLCV_TICKERS) {
      try {
        const latestDate = await getLatestDate(ticker)
        // Lấy từ ngày tiếp theo sau date cuối cùng trong DB
        const fromDate = latestDate
          ? new Date(new Date(latestDate).getTime() + 86400000).toISOString().slice(0, 10)
          : '2020-01-01'

        if (fromDate > today) {
          results[ticker] = 0 // đã up-to-date
          continue
        }

        const bars = await fetchTcbsOHLCV(ticker, fromDate, today)
        const upserted = await upsertOHLCV(ticker, bars)
        results[ticker] = upserted
      } catch (e) {
        console.error(`[ohlcv-sync] ${ticker} error:`, e)
        results[ticker] = -1
      }
    }

    return NextResponse.json({
      status: 'ok',
      persisted,
      fetchedAt: snapshot.fetchedAt,
      vnIndex: snapshot.vnIndex?.price ?? null,
      ohlcvSync: results,
    })
  } catch (err) {
    console.error('[cron/market-data] Error:', err)
    return NextResponse.json({ error: 'Cron failed' }, { status: 500 })
  }
}
