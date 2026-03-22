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

/**
 * Run stock screener with filters.
 * Returns sorted results best-first.
 */
export async function runScreener(filters: ScreenerFilters = DEFAULT_FILTERS): Promise<ScreenerResult[]> {
  // Fetch all stock data
  let stocks = await fetchScreeningData();

  // If screening endpoint returned nothing, try listing + batch overview
  if (stocks.length === 0) {
    const listing = await fetchStockListing();
    const hoseTickers = listing
      .filter(l => !filters.exchange || l.comGroupCode === filters.exchange)
      .slice(0, 200) // limit for API rate
      .map(l => l.ticker);
    stocks = await fetchStockOverviews(hoseTickers);
  }

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
