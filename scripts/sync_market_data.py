#!/usr/bin/env python3
"""
sync_market_data.py — Backfill OHLCV data to Supabase via REST API
=====================================================================
Dùng:
    python scripts/sync_market_data.py                     # Sync tất cả tickers mặc định
    python scripts/sync_market_data.py FPT VCB --from 2020-01-01
    python scripts/sync_market_data.py --incremental       # Chỉ 30 ngày gần nhất

Trực tiếp gọi Public API (DNSE/TCBS) thay vì vnstock để tránh lỗi timeout/block header.
"""

import sys
import argparse
import requests
import time
from pathlib import Path
from datetime import datetime, timedelta
import os

# Load .env.local
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent / ".env.local")
except ImportError:
    pass

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
    print("❌ Thiếu env vars: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
    print("   Đảm bảo file .env.local tồn tại và có đủ giá trị.")
    sys.exit(1)

DEFAULT_TICKERS = ["FPT", "VCB", "TCB", "MBB", "SSI", "VNM", "HPG", "VPB", "VIC", "VHM", "ACB", "VNINDEX"]
DEFAULT_FROM = "2020-01-01"

SUPABASE_HEADERS = {
    "apikey": SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=merge-duplicates",  # upsert
}

# Add standard user-agent to avoid blocking
SESSION = requests.Session()
SESSION.headers.update({
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json"
})

def fetch_ohlcv_dnse(ticker: str, from_date: str, to_date: str) -> list[dict]:
    """Lấy dữ liệu từ DNSE Open API."""
    ts_from = int(datetime.strptime(from_date, "%Y-%m-%d").timestamp())
    ts_to = int((datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)).timestamp())
    
    url = f"https://services.entrade.com.vn/chart-api/v2/ohlcs/stock?from={ts_from}&to={ts_to}&symbol={ticker}&resolution=1D"
    resp = SESSION.get(url, timeout=10)
    if not resp.ok:
        raise Exception(f"DNSE API HTTP {resp.status_code}")
    
    data = resp.json()
    if "t" not in data or not data["t"]:
        return []
        
    bars = []
    for i in range(len(data["t"])):
        # Chuyển timestamp về YYYY-MM-DD
        dt_str = datetime.fromtimestamp(data["t"][i]).strftime("%Y-%m-%d")
        bars.append({
            "date": dt_str,
            "open": float(data["o"][i]),
            "high": float(data["h"][i]),
            "low": float(data["l"][i]),
            "close": float(data["c"][i]),
            "volume": int(data["v"][i])
        })
    return bars

def fetch_ohlcv_tcbs(ticker: str, from_date: str, to_date: str) -> list[dict]:
    """Fallback: Lấy dữ liệu từ TCBS Open API."""
    ts_from = int(datetime.strptime(from_date, "%Y-%m-%d").timestamp())
    ts_to = int((datetime.strptime(to_date, "%Y-%m-%d") + timedelta(days=1)).timestamp())
    url = f"https://apipubaws.tcbs.com.vn/stock-insight/v1/stock/bars-long-term?ticker={ticker}&type=stock&resolution=D&from={ts_from}&to={ts_to}"
    resp = SESSION.get(url, timeout=10)
    if not resp.ok:
        raise Exception(f"TCBS API HTTP {resp.status_code}")
    
    data = resp.json()
    if "data" not in data or not data["data"]:
        return []
    
    bars = []
    for row in data["data"]:
        dt_str = row["tradingDate"][:10] # Có dạng YYYY-MM-DD
        bars.append({
            "date": dt_str,
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "volume": int(row["volume"])
        })
    return bars

def fetch_ohlcv(ticker: str, from_date: str, to_date: str) -> list[dict]:
    """Thử lần lượt DNSE, nếu lỗi thử qua TCBS."""
    # Special fix for VNINDEX indicator format on DNSE vs TCBS
    api_ticker = ticker
    if ticker == "VNINDEX":
        api_ticker = "VNINDEX" # DNSE supports VNINDEX exactly like this
        
    try:
        bars = fetch_ohlcv_dnse(api_ticker, from_date, to_date)
        if bars:
            return bars
    except Exception as e:
        print(f"  ⚠️ DNSE lỗi: {e}, thử fallback sang TCBS...")
        
    try:
        bars = fetch_ohlcv_tcbs(api_ticker, from_date, to_date)
        # TCBS typically returns latest dates first or might require sorting, make sure we sort ASC
        if bars:
            bars = sorted(bars, key=lambda x: x["date"])
            return bars
    except Exception as e:
        print(f"  ⚠️ Lỗi fetch dữ liệu cho {ticker}: {e}")
        
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
        try:
            resp = requests.post(url, headers=SUPABASE_HEADERS, json=batch, timeout=15)
            if not resp.ok:
                print(f"  ⚠️  Supabase upsert lỗi [{resp.status_code}]: {resp.text[:200]}")
            else:
                total += len(batch)
        except Exception as e:
            print(f"  ⚠️ Lỗi kết nối Supabase: {e}")

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
        time.sleep(1) # Chống rate limit

    print(f"\n🎉 Xong! Tổng {total_upserted} bars đã sync lên Supabase.")


if __name__ == "__main__":
    main()
