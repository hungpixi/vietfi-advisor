-- Sector mapping table
CREATE TABLE public.sectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tickers table (Company list)
CREATE TABLE public.tickers (
    symbol VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    exchange VARCHAR(20) NOT NULL, -- HOSE, HNX, UPCOM
    sector_id INTEGER REFERENCES public.sectors(id),
    is_active BOOLEAN DEFAULT true,
    is_vn30 BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Daily OHLCV data
CREATE TABLE public.daily_ohlcv (
    id BIGSERIAL PRIMARY KEY,
    symbol VARCHAR(10) REFERENCES public.tickers(symbol) ON DELETE CASCADE,
    date DATE NOT NULL,
    open NUMERIC(15, 4) NOT NULL,
    high NUMERIC(15, 4) NOT NULL,
    low NUMERIC(15, 4) NOT NULL,
    close NUMERIC(15, 4) NOT NULL,
    volume BIGINT NOT NULL,
    value NUMERIC(20, 2),
    adj_close NUMERIC(15, 4), -- for corporate actions adjusted price
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(symbol, date)
);

-- Index idx for querying range and symbols fast
CREATE INDEX idx_daily_ohlcv_symbol_date ON public.daily_ohlcv(symbol, date DESC);
CREATE INDEX idx_daily_ohlcv_date ON public.daily_ohlcv(date DESC);

-- Market Regime tracking
CREATE TABLE public.market_regime (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    index_name VARCHAR(50) DEFAULT 'VNINDEX',
    close_price NUMERIC(15, 4) NOT NULL,
    ma50 NUMERIC(15, 4),
    ma200 NUMERIC(15, 4),
    breadth_advancers INTEGER,
    breadth_decliners INTEGER,
    breadth_unchanged INTEGER,
    regime VARCHAR(50), -- bull, neutral, bear
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
