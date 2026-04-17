#!/usr/bin/env python3
"""
sync_market_data.py — Backfill OHLCV data to Supabase via REST API
=====================================================================
Dùng:
    python scripts/sync_market_data.py                     # Sync tất cả tickers mặc định
    python scripts/sync_market_data.py FPT VCB --from 2020-01-01
    python scripts/sync_market_data.py --incremental       # Chỉ 30 ngày gần nhất

Yêu cầu:
    pip install vnstock requests python-dotenv
"""

import sys
import json
import argparse
import requests
from pathlib import Path
from datetime import datetime, timedelta

# Load .env.local
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env.local")
except ImportError:
    pass

import os

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Thiếu env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
    print("   Đảm bảo file .env.local tồn tại và có đủ giá trị.")
    sys.exit(1)

try:
    from vnstock import Vnstock
except ImportError:
    print("❌ Cần cài vnstock: pip install vnstock")
    sys.exit(1)

DEFAULT_TICKERS = ["FPT", "VCB", "TCB", "MBB", "SSI", "VNM", "HPG", "VPB", "VIC", "VHM", "ACB", "VNINDEX"]
DEFAULT_FROM = "2020-01-01"
SOURCE = "KBS"

SUPABASE_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",  # upsert
}


def fetch_ohlcv(ticker: str, from_date: str, to_date: str) -> list[dict]:
    try:
        stock = Vnstock().stock(symbol=ticker, source=SOURCE)
        df = stock.quote.history(start=from_date, end=to_date, interval="1D")
        df = df.rename(columns={"time": "date"})
        df["date"] = df["date"].astype(str).str[:10]
        cols = ["date", "open", "high", "low", "close", "volume"]
        df = df[cols].dropna(subset=["close"])
        return df.sort_values("date").to_dict(orient="records")
    except Exception as e:
        print(f"  ⚠️  vnstock {ticker} lỗi: {e}")
        return []


def get_latest_date(ticker: str) -> str | None:
    """Lấy ngày mới nhất đã có trong Supabase cho ticker này."""
    url = f"{SUPABASE_URL}/rest/v1/ohlcv_bars"
    params = {
        "select": "date",
        "ticker": f"eq.{ticker}",
        "order": "date.desc",
        "limit": "1",
    }
    resp = requests.get(url, headers=SUPABASE_HEADERS, params=params)
    if resp.ok and resp.json():
        return resp.json()[0]["date"]
    return None


def upsert_to_supabase(ticker: str, bars: list[dict]) -> int:
    if not bars:
        return 0

    rows = [
        {
            "ticker": ticker.upper(),
            "date": b["date"],
            "open": round(float(b["open"]), 2),
            "high": round(float(b["high"]), 2),
            "low": round(float(b["low"]), 2),
            "close": round(float(b["close"]), 2),
            "volume": int(b["volume"]),
        }
        for b in bars
    ]

    # Upsert in batches of 500 to avoid payload limits
    batch_size = 500
    total = 0
    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        url = f"{SUPABASE_URL}/rest/v1/ohlcv_bars"
        resp = requests.post(url, headers=SUPABASE_HEADERS, json=batch)
        if not resp.ok:
            print(f"  ⚠️  Supabase upsert lỗi [{resp.status_code}]: {resp.text[:200]}")
        else:
            total += len(batch)

    return total


def main():
    parser = argparse.ArgumentParser(description="Sync VN stock OHLCV data to Supabase")
    parser.add_argument("tickers", nargs="*", default=DEFAULT_TICKERS)
    parser.add_argument("--from", dest="from_date", default=None)
    parser.add_argument("--to", dest="to_date", default=datetime.today().strftime("%Y-%m-%d"))
    parser.add_argument("--incremental", action="store_true", help="Chỉ lấy từ ngày cuối cùng trong DB")
    args = parser.parse_args()

    to_date = args.to_date
    print(f"📂 Target: {SUPABASE_URL}\n")

    total_upserted = 0
    for ticker in args.tickers:
        ticker = ticker.upper()
        print(f"⏳ {ticker}... ", end="", flush=True)

        # Determine from_date
        if args.from_date:
            from_date = args.from_date
        elif args.incremental:
            latest = get_latest_date(ticker)
            if latest:
                from_date = (datetime.fromisoformat(latest) + timedelta(days=1)).strftime("%Y-%m-%d")
            else:
                from_date = DEFAULT_FROM
        else:
            from_date = DEFAULT_FROM

        if from_date > to_date:
            print(f"✅ Up-to-date (latest: {from_date})")
            continue

        bars = fetch_ohlcv(ticker, from_date, to_date)
        n = upsert_to_supabase(ticker, bars)
        total_upserted += n
        print(f"✅ Upserted {n} bars ({from_date} → {to_date})")

    print(f"\n🎉 Xong! Tổng {total_upserted} bars đã sync lên Supabase.")


if __name__ == "__main__":
    main()
