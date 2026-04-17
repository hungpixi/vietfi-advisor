/**
 * Price History - đọc từ local JSON files (public/data/ohlcv/<TICKER>.json)
 *
 * Data được sync bởi: scripts/sync_market_data.py (vnstock, KBS source)
 * Chạy hàng ngày lúc 18:30 sau khi HoSE đóng cửa.
 *
 * KHÔNG còn mock fallback - nếu file không tồn tại → throw error.
 */

import { promises as fs } from "fs";
import path from "path";

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

const DATA_DIR = path.join(process.cwd(), "public", "data", "ohlcv");

// ── Main export ──

/**
 * Đọc và lọc OHLCV data từ file JSON cục bộ.
 * Data được tổng hợp bởi scripts/sync_market_data.py sử dụng vnstock (KBS source).
 *
 * @param ticker  Mã cổ phiếu VN (VD: "FPT", "VCB", "VNINDEX")
 * @param fromDate  ISO date string "YYYY-MM-DD"
 * @param toDate    ISO date string "YYYY-MM-DD"
 */
export async function fetchPriceHistory(
  ticker: string,
  fromDate: string,
  toDate: string
): Promise<OHLCVBar[]> {
  const filePath = path.join(DATA_DIR, `${ticker.toUpperCase()}.json`);

  let allBars: OHLCVBar[];
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    allBars = JSON.parse(raw) as OHLCVBar[];
  } catch (err) {
    // File chưa tồn tại → hướng dẫn chạy sync script
    const e = err as NodeJS.ErrnoException;
    if (e.code === "ENOENT") {
      throw new Error(
        `Không tìm thấy dữ liệu cho mã "${ticker.toUpperCase()}". ` +
        `Vui lòng chạy: python scripts/sync_market_data.py ${ticker.toUpperCase()}`
      );
    }
    throw err;
  }

  // Lọc theo khoảng ngày
  const filtered = allBars
    .filter((b) => b.date >= fromDate && b.date <= toDate)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (filtered.length === 0) {
    throw new Error(
      `Không có dữ liệu cho "${ticker}" từ ${fromDate} đến ${toDate}. ` +
      `Hãy chạy: python scripts/sync_market_data.py ${ticker.toUpperCase()} --from ${fromDate}`
    );
  }

  return filtered;
}
