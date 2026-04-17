/**
 * Price History — đọc từ Supabase PostgreSQL
 *
 * Data được sync bởi:
 *  - Backfill: scripts/sync_market_data.py (vnstock, KBS/TCBS source, chạy local một lần)
 *  - Daily update: Vercel Cron /api/cron/market-data (18:30 VN time, weekdays)
 */

import { queryOHLCV } from "./ohlcv-db";

export interface OHLCVBar {
  date: string;    // "YYYY-MM-DD"
  open: number;    // nghìn VND
  high: number;
  low: number;
  close: number;
  volume: number;  // số cổ phiếu
}

/**
 * Lấy lịch sử giá OHLCV từ Supabase.
 *
 * @param ticker   Mã cổ phiếu VN (VD: "FPT", "VCB", "VNINDEX")
 * @param fromDate ISO date "YYYY-MM-DD"
 * @param toDate   ISO date "YYYY-MM-DD"
 */
export async function fetchPriceHistory(
  ticker: string,
  fromDate: string,
  toDate: string
): Promise<OHLCVBar[]> {
  return queryOHLCV(ticker, fromDate, toDate);
}
