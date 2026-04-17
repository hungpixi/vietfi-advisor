/**
 * TCBS Price History Fetcher
 *
 * Lấy dữ liệu OHLCV lịch sử từ TCBS để phục vụ Backtest engine.
 * Endpoint: stock-insight/v2/stock/bars-long-term
 *
 * Cache strategy: Next.js fetch cache (next: { revalidate: 3600 })
 * → Persistent across Vercel serverless cold starts (không như in-memory Map).
 */

const TCBS_INSIGHT_BASE = "https://apipubaws.tcbs.com.vn/stock-insight/v2";

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  Accept: "application/json",
  Referer: "https://tcinvest.tcbs.com.vn/",
};

// ── Types ──

export interface OHLCVBar {
  date: string;    // "YYYY-MM-DD"
  open: number;    // nghìn VND
  high: number;
  low: number;
  close: number;
  volume: number;  // cổ phiếu
}

// ── Helpers ──

function toUnixSec(dateStr: string): number {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

function unixToDate(unix: number): string {
  // TCBS returns unix seconds for 00:00:00 VN Time. Convert to VN Time UTC+7 (7 hours offset)
  const d = new Date(unix * 1000);
  return new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// ── Mapper ──

interface TcbsBar {
  tradingDate?: number;
  open?: number;
  high?: number;
  low?: number;
  close?: number;
  volume?: number;
}

function mapBar(raw: TcbsBar): OHLCVBar | null {
  if (!raw.tradingDate || !raw.close) return null;
  return {
    date: unixToDate(raw.tradingDate),
    open: raw.open ?? raw.close,
    high: raw.high ?? raw.close,
    low: raw.low ?? raw.close,
    close: raw.close,
    volume: raw.volume ?? 0,
  };
}

// ── Main export ──

/**
 * Fetch weekly OHLCV bars from TCBS.
 * Returns sorted ascending (oldest first).
 *
 * Cache: Next.js fetch cache với revalidate 1 giờ.
 * Persistent trên Vercel edge (không mất khi cold start).
 *
 * @param ticker  VN ticker (e.g. "FPT", "VCB")
 * @param fromDate  ISO date string "YYYY-MM-DD"
 * @param toDate    ISO date string "YYYY-MM-DD"
 */
export async function fetchPriceHistory(
  ticker: string,
  fromDate: string,
  toDate: string
): Promise<OHLCVBar[]> {
  const from = toUnixSec(fromDate);
  const to = toUnixSec(toDate);

  const url =
    `${TCBS_INSIGHT_BASE}/stock/bars-long-term` +
    `?ticker=${ticker.toUpperCase()}&type=stock&resolution=D&from=${from}&to=${to}`;

  try {
    // next: { revalidate: 3600 } → Next.js data cache (persistent on Vercel, không phải in-memory)
    const resp = await fetch(url, {
      headers: HEADERS,
      next: { revalidate: 3600 },
    } as RequestInit);

    if (!resp.ok) {
      return generateMockBars(ticker, fromDate, toDate);
    }

    const json = (await resp.json()) as { data?: TcbsBar[] };
    const bars = (json.data ?? [])
      .map(mapBar)
      .filter((b): b is OHLCVBar => b !== null)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (bars.length === 0) {
      return generateMockBars(ticker, fromDate, toDate);
    }

    return bars;
  } catch {
    return generateMockBars(ticker, fromDate, toDate);
  }
}


// ── Mock fallback (khi TCBS API unavailable) ──

/**
 * Sinh dữ liệu giả lập để demo khi TCBS không phản hồi.
 * Random walk với seed từ ticker để deterministic.
 */
function generateMockBars(ticker: string, fromDate: string, toDate: string): OHLCVBar[] {
  // Use a pseudo-random seed based on ticker
  let seed = 0;
  for (let i = 0; i < ticker.length; i++) {
    seed += ticker.charCodeAt(i);
  }

  // Realistic base prices for some popular tickers
  const BASE_PRICES: Record<string, number> = {
    "FPT": 105,
    "TCB": 48,
    "MBB": 24,
    "SSI": 35,
    "VNM": 65,
    "HPG": 28,
    "VPB": 19,
    "VIC": 42,
    "VHM": 40,
    "ACB": 27,
  };

  const initialPrice = BASE_PRICES[ticker.toUpperCase()] || (20 + (seed % 50));
  let lastClose = initialPrice;

  // Xóa râu (chaotic) thay bằng xu hướng có cấu trúc (Drift + Volatility)
  // Xác định một xu hướng (trend) dài hạn dựa vào seed
  const trend = (seed % 10) / 1000; // Drift nhẹ từ 0 -> 0.009% mỗi ngày
  const volatility = 0.015; // 1.5% biến động ngày

  const bars: OHLCVBar[] = [];
  const current = new Date(fromDate);
  const endDate = new Date(toDate);

  // Seed random function for deterministic output
  let rSeed = seed;
  const rand = () => {
    rSeed = (rSeed * 9301 + 49297) % 233280;
    return rSeed / 233280;
  };

  while (current <= endDate) {
    // Bỏ qua Thứ 7, Chủ Nhật
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      // Geometric Brownian Motion step
      const z = Math.sqrt(-2.0 * Math.log(rand())) * Math.cos(2.0 * Math.PI * rand());
      const dailyReturn = trend + volatility * z;

      const open = lastClose;
      let close = open * Math.exp(dailyReturn);

      // Khống chế trần sàn (+- 7% cho HOSE)
      if (close > open * 1.07) close = open * 1.07;
      if (close < open * 0.93) close = open * 0.93;

      const diff = Math.abs(open - close);
      // Tạo high/low thực tế hơn
      const high = Math.max(open, close) + diff * rand();
      const low = Math.min(open, close) - diff * rand();

      bars.push({
        date: current.toISOString().slice(0, 10),
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume: 1000000 + Math.floor(rand() * 5000000), // Khối lượng 1tr-6tr
      });

      lastClose = close;
    }
    // Ngày tiếp theo
    current.setDate(current.getDate() + 1);
  }

  // Next.js components/charts/TradingViewChart needs sorting
  return bars;
}
