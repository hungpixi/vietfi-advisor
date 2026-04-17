/**
 * Price History — đọc từ Supabase PostgreSQL
 *
 * Data được sync bởi:
 *  - Backfill: scripts/sync_market_data.py (vnstock, KBS/TCBS source, chạy local một lần)
 *  - Daily update: Vercel Cron /api/cron/market-data (18:30 VN time, weekdays)
 */

import { queryOHLCV } from "./ohlcv-db";
import { unstable_cache } from "next/cache";

export interface OHLCVBar {
  date: string;    // "YYYY-MM-DD"
  open: number;    // nghìn VND
  high: number;
  low: number;
  close: number;
  volume: number;  // số cổ phiếu
}

/**
 * Hàm lấy dữ liệu giá thực tế từ Database.
 * Nếu thiếu API key hoặc lỗi, có thể trả về lỗi hoặc mock fallback ở các cấp độ trên.
 */
async function fetchFromDb(ticker: string, fromDate: string, toDate: string): Promise<OHLCVBar[]> {
  try {
    return await queryOHLCV(ticker, fromDate, toDate);
  } catch (err) {
    console.error(`[price-history] Lỗi khi lấy nến cho ${ticker}:`, err);
    throw err;
  }
}

/**
 * Lấy lịch sử giá OHLCV từ Supabase (có gắn Server Cache 24h).
 * Dữ liệu này chỉ cập nhật hàng ngày qua Cron jobs nên cache 24h là an toàn.
 *
 * @param ticker   Mã cổ phiếu VN (VD: "FPT", "VCB", "VNINDEX")
 * @param fromDate ISO date "YYYY-MM-DD"
 * @param toDate   ISO date "YYYY-MM-DD"
 */
export const fetchPriceHistory = unstable_cache(
  async (ticker: string, fromDate: string, toDate: string): Promise<OHLCVBar[]> => {
    return fetchFromDb(ticker, fromDate, toDate);
  },
  ["market-ohlcv-history"], // Cache key tags
  { revalidate: 86400 }     // 24 hours
);
