-- Migration: Create ohlcv_bars table for VietFi Advisor
-- Chạy file này trong Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS ohlcv_bars (
  ticker  VARCHAR(10)  NOT NULL,
  date    DATE         NOT NULL,
  open    NUMERIC(12,2),
  high    NUMERIC(12,2),
  low     NUMERIC(12,2),
  close   NUMERIC(12,2),
  volume  BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (ticker, date)
);

-- Index để query nhanh theo ticker + date range
CREATE INDEX IF NOT EXISTS ohlcv_bars_ticker_date_idx
  ON ohlcv_bars (ticker, date DESC);

-- Không dùng RLS vì đây là read-only public market data
-- (service role key dùng cho write từ cron)
ALTER TABLE ohlcv_bars DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT 'ohlcv_bars table created ✅' AS status;
