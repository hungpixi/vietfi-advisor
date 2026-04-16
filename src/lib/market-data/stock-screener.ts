/**
 * VN Stock Screener — TCBS Public API Client
 * 
 * Gọi trực tiếp endpoints TCBS (giống vnstock Python nhưng bằng JS).
 * Endpoints: apipubaws.tcbs.com.vn/tcanalysis/v1/...
 * 
 * Filters: PE, PB, ROE, Market Cap, TCBS Rating
 */

const TCBS_BASE = "https://apipubaws.tcbs.com.vn/tcanalysis/v1";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  "Accept": "application/json",
  "Referer": "https://tcinvest.tcbs.com.vn/",
};

// ── Types ──

export interface StockListing {
  ticker: string;
  comGroupCode: string; // HOSE, HNX, UPCOM
  organName: string;
  organShortName: string;
}

export interface StockOverview {
  ticker: string;
  exchange: string;
  shortName: string;
  industry: string;
  // Price
  stockPrice: number;    // current price (1000 VND)
  deltaInDay: number;    // change % today
  // Fundamentals
  pe: number;
  pb: number;
  roe: number;           // as decimal e.g. 0.18 = 18%
  eps: number;
  marketCap: number;     // tỷ VND
  dividend: number;      // yield %
  // TCBS Rating
  stockRating: number;   // 1-5
}

export interface ScreenerResult {
  ticker: string;
  exchange: string;
  shortName: string;
  industry: string;
  price: number;
  changePct: number;
  pe: number;
  pb: number;
  roe: number;       // as % (e.g. 18.5)
  eps: number;
  marketCap: number; // tỷ VND
  dividend: number;
  rating: number;
  compositeScore: number; // 0-100, higher = better
}

export interface ScreenerFilters {
  maxPE?: number;
  maxPB?: number;
  minROE?: number;       // as % (e.g. 15 = 15%)
  minMarketCap?: number; // tỷ VND
  minRating?: number;    // 1-5
  exchange?: string;     // HOSE, HNX, UPCOM, or "" for all
}

export const DEFAULT_FILTERS: ScreenerFilters = {
  maxPE: 15,
  maxPB: 2.5,
  minROE: 12,
  minMarketCap: 500,
  minRating: 2.5,
  exchange: "",
};

// ── API Calls ──

/**
 * Fetch stock listing from TCBS.
 * Returns ~1500 tickers with exchange info.
 */
async function fetchStockListing(): Promise<StockListing[]> {
  try {
    const resp = await fetch(`${TCBS_BASE}/stock`, {
      headers: HEADERS,
    } as RequestInit);
    if (!resp.ok) return [];
    const json = await resp.json() as { data?: StockListing[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Fetch overview for a batch of tickers.
 * TCBS supports batch via comma-separated tickers.
 */
async function fetchStockOverviews(tickers: string[]): Promise<StockOverview[]> {
  const results: StockOverview[] = [];

  // Batch by chunks of 30 to avoid URL-too-long
  const CHUNK = 30;
  for (let i = 0; i < tickers.length; i += CHUNK) {
    const chunk = tickers.slice(i, i + CHUNK);
    try {
      const url = `${TCBS_BASE}/stock/overview?tickers=${chunk.join(",")}`;
      const resp = await fetch(url, { headers: HEADERS } as RequestInit);
      if (!resp.ok) continue;
      const json = await resp.json() as { data?: StockOverview[] };
      if (json.data) results.push(...json.data);
    } catch {
      continue;
    }
    // Rate limit: 200ms between chunks
    if (i + CHUNK < tickers.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  return results;
}

/**
 * Alternative: Fetch watchlist-style data for all stocks.
 * TCBS has a screening endpoint that returns fundamentals for all listed stocks.
 */
async function fetchScreeningData(): Promise<StockOverview[]> {
  try {
    // TCBS screening endpoint — returns all stocks with fundamentals
    const resp = await fetch(
      `${TCBS_BASE}/screening/fc-filter?page=1&size=2000&minPrice=5&maxPrice=500`,
      { headers: HEADERS } as RequestInit
    );
    if (!resp.ok) {
      // Fallback: try the stock-ratio endpoint
      return await fetchStockRatioFallback();
    }
    const json = await resp.json() as { data?: Record<string, unknown>[] };
    if (!json.data || json.data.length === 0) {
      return await fetchStockRatioFallback();
    }

    return json.data.map(mapTcbsToOverview).filter((s): s is StockOverview => s !== null);
  } catch {
    return await fetchStockRatioFallback();
  }
}

/**
 * Fallback: Fetch from stock-ratio endpoint.
 */
async function fetchStockRatioFallback(): Promise<StockOverview[]> {
  try {
    const resp = await fetch(
      `${TCBS_BASE}/stock-ratio/top?exchangeName=&size=200&sortBy=pe&sortDir=asc`,
      { headers: HEADERS } as RequestInit
    );
    if (!resp.ok) return [];
    const json = await resp.json() as { data?: Record<string, unknown>[] };
    if (!json.data) return [];
    return json.data.map(mapTcbsToOverview).filter((s): s is StockOverview => s !== null);
  } catch {
    return [];
  }
}

function mapTcbsToOverview(d: Record<string, unknown>): StockOverview | null {
  const ticker = (d.ticker ?? d.symbol ?? d.code ?? "") as string;
  if (!ticker) return null;

  const toNum = (v: unknown): number => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") return parseFloat(v) || 0;
    return 0;
  };

  return {
    ticker,
    exchange: (d.exchange ?? d.comGroupCode ?? d.exchangeName ?? "HOSE") as string,
    shortName: (d.shortName ?? d.organShortName ?? d.companyName ?? ticker) as string,
    industry: (d.industry ?? d.industryName ?? d.sector ?? "") as string,
    stockPrice: toNum(d.stockPrice ?? d.price ?? d.closePrice),
    deltaInDay: toNum(d.deltaInDay ?? d.changePct ?? d.priceChange),
    pe: toNum(d.pe ?? d.peRatio),
    pb: toNum(d.pb ?? d.pbRatio),
    roe: toNum(d.roe ?? d.roeRatio),
    eps: toNum(d.eps),
    marketCap: toNum(d.marketCap ?? d.mktCap),
    dividend: toNum(d.dividend ?? d.dividendYield),
    stockRating: toNum(d.stockRating ?? d.rating ?? d.tcRating),
  };
}

// ── Screener Logic ──

/**
 * Calculate composite quality score (0-100).
 * Higher = better fundamentals.
 */
function calcCompositeScore(s: StockOverview): number {
  let score = 0;

  // PE score (lower is better, max 25 pts)
  if (s.pe > 0 && s.pe < 50) {
    score += Math.max(0, 25 - s.pe); // PE=5 → 20pts, PE=15 → 10pts
  }

  // PB score (lower is better, max 20 pts)
  if (s.pb > 0 && s.pb < 10) {
    score += Math.max(0, 20 - s.pb * 5); // PB=1 → 15pts, PB=2 → 10pts
  }

  // ROE score (higher is better, max 25 pts)
  const roePct = s.roe > 1 ? s.roe : s.roe * 100; // normalize
  score += Math.min(25, roePct * 1.0); // ROE=20% → 20pts

  // Rating score (max 20 pts)
  score += s.stockRating * 4; // rating 5 → 20pts

  // Dividend bonus (max 10 pts)
  score += Math.min(10, s.dividend * 2);

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ── Mock Fallback for Demo (in case TCBS API is 404/dead) ──
const MOCK_VN30: StockOverview[] = [
  { ticker: "FPT", exchange: "HOSE", shortName: "FPT Corp", industry: "Công nghệ", stockPrice: 135, deltaInDay: 1.2, pe: 22.5, pb: 5.1, roe: 26.5, eps: 6000, marketCap: 171000, dividend: 2.5, stockRating: 4.8 },
  { ticker: "VCB", exchange: "HOSE", shortName: "Vietcombank", industry: "Ngân hàng", stockPrice: 92, deltaInDay: -0.5, pe: 15.2, pb: 3.1, roe: 22.4, eps: 6100, marketCap: 510000, dividend: 1.2, stockRating: 4.9 },
  { ticker: "VNM", exchange: "HOSE", shortName: "Vinamilk", industry: "Thực phẩm", stockPrice: 67, deltaInDay: 0.8, pe: 18.2, pb: 4.5, roe: 28.1, eps: 3700, marketCap: 140000, dividend: 4.5, stockRating: 4.5 },
  { ticker: "HPG", exchange: "HOSE", shortName: "Hòa Phát", industry: "Thép", stockPrice: 28.5, deltaInDay: 2.1, pe: 14.1, pb: 1.8, roe: 15.2, eps: 2100, marketCap: 165000, dividend: 3.1, stockRating: 4.2 },
  { ticker: "MBB", exchange: "HOSE", shortName: "MBBank", industry: "Ngân hàng", stockPrice: 24.5, deltaInDay: 1.0, pe: 5.8, pb: 1.2, roe: 24.5, eps: 4200, marketCap: 130000, dividend: 5.0, stockRating: 4.6 },
  { ticker: "ACB", exchange: "HOSE", shortName: "ACB", industry: "Ngân hàng", stockPrice: 27.8, deltaInDay: -0.2, pe: 7.2, pb: 1.5, roe: 23.8, eps: 3800, marketCap: 110000, dividend: 4.2, stockRating: 4.4 },
  { ticker: "MWG", exchange: "HOSE", shortName: "Thế giới Di động", industry: "Bán lẻ", stockPrice: 48.5, deltaInDay: -1.5, pe: 25.4, pb: 2.8, roe: 12.5, eps: 1900, marketCap: 71000, dividend: 1.0, stockRating: 4.0 },
  { ticker: "SSI", exchange: "HOSE", shortName: "Chứng khoán SSI", industry: "Chứng khoán", stockPrice: 36.2, deltaInDay: 3.5, pe: 19.5, pb: 2.1, roe: 11.8, eps: 1900, marketCap: 55000, dividend: 2.5, stockRating: 4.1 },
  { ticker: "VIC", exchange: "HOSE", shortName: "Vingroup", industry: "Bất động sản", stockPrice: 45.2, deltaInDay: -0.8, pe: 35.2, pb: 1.5, roe: 4.5, eps: 1200, marketCap: 172000, dividend: 0, stockRating: 3.5 },
  { ticker: "VHM", exchange: "HOSE", shortName: "Vinhomes", industry: "Bất động sản", stockPrice: 42.5, deltaInDay: 0.5, pe: 8.5, pb: 1.1, roe: 16.5, eps: 5000, marketCap: 185000, dividend: 1.5, stockRating: 3.8 },
  { ticker: "TCB", exchange: "HOSE", shortName: "Techcombank", industry: "Ngân hàng", stockPrice: 41.5, deltaInDay: 1.8, pe: 6.8, pb: 1.1, roe: 18.5, eps: 6100, marketCap: 145000, dividend: 0, stockRating: 4.5 }
];

const STOCK_UNIVERSE_CACHE_TTL = 30 * 60 * 1000;
const stockUniverseCache = new Map<string, { stocks: StockOverview[]; fetchedAt: number }>();

async function getStockUniverse(exchange = ""): Promise<StockOverview[]> {
  const cacheKey = exchange || "ALL";
  const cached = stockUniverseCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < STOCK_UNIVERSE_CACHE_TTL) {
    return cached.stocks;
  }

  let stocks = await fetchScreeningData();

  if (stocks.length === 0) {
    const listing = await fetchStockListing();

    if (listing.length > 0) {
      const tickers = listing
        .filter((listingItem) => !exchange || listingItem.comGroupCode === exchange)
        .slice(0, 200)
        .map((listingItem) => listingItem.ticker);
      stocks = await fetchStockOverviews(tickers);
    }

    if (stocks.length === 0) {
      stocks = MOCK_VN30;
    }
  }

  stockUniverseCache.set(cacheKey, { stocks, fetchedAt: Date.now() });
  return stocks;
}

/**
 * Run stock screener with filters.
 * Returns sorted results best-first.
 */
export async function runScreener(filters: ScreenerFilters = DEFAULT_FILTERS): Promise<ScreenerResult[]> {
  const stocks = await getStockUniverse(filters.exchange || "");

  // Apply filters
  const filtered = stocks.filter(s => {
    if (filters.exchange && s.exchange !== filters.exchange) return false;
    if (s.pe <= 0) return false; // exclude negative/zero PE (lỗ)
    if (filters.maxPE && s.pe > filters.maxPE) return false;
    if (filters.maxPB && s.pb > 0 && s.pb > filters.maxPB) return false;

    const roePct = s.roe > 1 ? s.roe : s.roe * 100;
    if (filters.minROE && roePct < filters.minROE) return false;

    if (filters.minMarketCap && s.marketCap < filters.minMarketCap) return false;
    if (filters.minRating && s.stockRating > 0 && s.stockRating < filters.minRating) return false;

    return true;
  });

  // Score & sort
  const results: ScreenerResult[] = filtered.map(s => {
    const roePct = s.roe > 1 ? s.roe : Math.round(s.roe * 10000) / 100;
    return {
      ticker: s.ticker,
      exchange: s.exchange,
      shortName: s.shortName,
      industry: s.industry,
      price: s.stockPrice,
      changePct: s.deltaInDay,
      pe: Math.round(s.pe * 100) / 100,
      pb: Math.round(s.pb * 100) / 100,
      roe: Math.round(roePct * 100) / 100,
      eps: Math.round(s.eps),
      marketCap: Math.round(s.marketCap),
      dividend: Math.round(s.dividend * 100) / 100,
      rating: s.stockRating,
      compositeScore: calcCompositeScore(s),
    };
  });

  results.sort((a, b) => b.compositeScore - a.compositeScore);

  return results.slice(0, 50); // Top 50
}
