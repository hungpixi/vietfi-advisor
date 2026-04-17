#!/usr/bin/env python3
"""
sync_market_data.py
====================
Lấy dữ liệu OHLCV từ vnstock (KBS source) và lưu vào public/data/ohlcv/<TICKER>.json.
Script tự động merge data mới vào file cũ (không ghi đè toàn bộ).

Dùng:
    python scripts/sync_market_data.py              # Sync mặc định tickers
    python scripts/sync_market_data.py FPT VCB TCB  # Sync danh sách cụ thể
    python scripts/sync_market_data.py --from 2020-01-01  # Lấy từ ngày cụ thể

Cài đặt tự động chạy hàng ngày (18:30, sau đóng cửa HOSE):
    Windows Task Scheduler:
        schtasks /create /tn "VietFi_Market_Sync" /tr "python d:/code/vietfi-advisor/scripts/sync_market_data.py" /sc daily /st 18:30
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timedelta

try:
    from vnstock import Vnstock
except ImportError:
    print("❌ Cần cài vnstock: pip install vnstock")
    sys.exit(1)

# ── Config ──

OUTPUT_DIR = Path(__file__).parent.parent / "public" / "data" / "ohlcv"
DEFAULT_TICKERS = ["FPT", "VCB", "TCB", "MBB", "SSI", "VNM", "HPG", "VPB", "VIC", "VHM", "ACB", "VNINDEX"]
DEFAULT_FROM = "2020-01-01"
SOURCE = "KBS"

# ── Helpers ──

def fetch_ohlcv(ticker: str, from_date: str, to_date: str) -> list[dict]:
    """Lấy dữ liệu từ vnstock KBS và trả về list các bars."""
    try:
        stock = Vnstock().stock(symbol=ticker, source=SOURCE)
        df = stock.quote.history(start=from_date, end=to_date, interval="1D")
        df = df.rename(columns={"time": "date"})
        # Chuẩn hoá ngày về YYYY-MM-DD
        df["date"] = df["date"].astype(str).str[:10]
        # Chọn các cột cần thiết
        cols = ["date", "open", "high", "low", "close", "volume"]
        df = df[cols].dropna(subset=["close"])
        df = df.sort_values("date")
        return df.to_dict(orient="records")
    except Exception as e:
        print(f"  ⚠️  Lỗi lấy {ticker}: {e}")
        return []


def merge_and_save(ticker: str, new_bars: list[dict]) -> int:
    """Merge bars mới vào file JSON hiện tại. Trả về số bars được thêm vào."""
    if not new_bars:
        return 0

    output_file = OUTPUT_DIR / f"{ticker}.json"

    # Đọc data cũ nếu có
    existing: dict[str, dict] = {}
    if output_file.exists():
        with open(output_file, "r", encoding="utf-8") as f:
            old_bars = json.load(f)
            existing = {b["date"]: b for b in old_bars}

    original_count = len(existing)

    # Merge (mới ghi đè cũ cùng ngày để cập nhật adjusted prices)
    for bar in new_bars:
        existing[bar["date"]] = {
            "date": bar["date"],
            "open": round(float(bar["open"]), 2),
            "high": round(float(bar["high"]), 2),
            "low": round(float(bar["low"]), 2),
            "close": round(float(bar["close"]), 2),
            "volume": int(bar["volume"]),
        }

    # Sắp xếp theo ngày rồi lưu
    sorted_bars = sorted(existing.values(), key=lambda x: x["date"])
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(sorted_bars, f, ensure_ascii=False)

    return len(existing) - original_count


def main():
    parser = argparse.ArgumentParser(description="Sync VN stock market data via vnstock")
    parser.add_argument("tickers", nargs="*", default=DEFAULT_TICKERS, help="Danh sách mã cổ phiếu")
    parser.add_argument("--from", dest="from_date", default=DEFAULT_FROM, help="Ngày bắt đầu (YYYY-MM-DD)")
    parser.add_argument("--to", dest="to_date", default=datetime.today().strftime("%Y-%m-%d"), help="Ngày kết thúc")
    parser.add_argument("--incremental", action="store_true", help="Chỉ lấy 30 ngày gần nhất (nhanh hơn)")
    args = parser.parse_args()

    from_date = args.from_date
    to_date = args.to_date

    if args.incremental:
        from_date = (datetime.today() - timedelta(days=30)).strftime("%Y-%m-%d")
        print(f"📈 Incremental mode: lấy từ {from_date} → {to_date}")
    else:
        print(f"📈 Full sync: lấy từ {from_date} → {to_date}")

    print(f"📂 Output: {OUTPUT_DIR.resolve()}\n")

    total_added = 0
    for ticker in args.tickers:
        ticker = ticker.upper()
        print(f"⏳ {ticker}... ", end="", flush=True)
        bars = fetch_ohlcv(ticker, from_date, to_date)
        added = merge_and_save(ticker, bars)
        total_added += added
        output_file = OUTPUT_DIR / f"{ticker}.json"
        total_bars = len(json.loads(output_file.read_text())) if output_file.exists() else 0
        print(f"✅ +{added} bars mới | Tổng {total_bars} bars")

    print(f"\n🎉 Xong! Đã thêm {total_added} bars mới vào {len(args.tickers)} mã.")


if __name__ == "__main__":
    main()
