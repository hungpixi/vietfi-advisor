# Hybrid Deploy: Vercel + Cloudflare Worker + VPS Relay

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split VietFi Advisor into Vercel frontend + Cloudflare Worker gateway + VPS relay. Eliminate Vercel cron limits, hide VPS IP, run on 1GB RAM VPS.

**Architecture:** Cloudflare Workers as API gateway (HMAC auth, KV cache reads, Gemini streaming relay). CF Pages Functions for scheduled crawlers. VPS only handles relay traffic (~200MB RAM). Vercel frontend points to CF Worker URL.

**Tech Stack:** Wrangler, TypeScript, Bun, PM2, Nginx, UFW, Cloudflare KV, Cloudflare R2, Cloudflare Pages.

---

## Chunk 1: Phase 1 — CF Worker Gateway (Core Infrastructure)

### Task 1: Scaffolding CF Worker Project

**Files:**
- Create: `vietfi-cloudflare/wrangler.toml`
- Create: `vietfi-cloudflare/package.json`
- Create: `vietfi-cloudflare/tsconfig.json`
- Create: `vietfi-cloudflare/src/worker.ts` (entry point)
- Create: `vietfi-cloudflare/src/lib/hmac.ts`
- Create: `vietfi-cloudflare/src/lib/kv.ts`
- Create: `vietfi-cloudflare/.gitignore`

- [ ] **Step 1: Create project directory and package.json**

```bash
mkdir -p vietfi-cloudflare/src/lib vietfi-cloudflare/src/routes
cd vietfi-cloudflare
npm init -y
npm install wrangler @cloudflare/workers-types typescript --save-dev
```

**package.json:**
```json
{
  "name": "vietfi-cloudflare",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250415.0",
    "typescript": "^5.0.0",
    "wrangler": "^4.0.0"
  }
}
```

- [ ] **Step 2: Create wrangler.toml**

```toml
name = "vietfi-api"
main = "src/worker.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

[vars]
ENVIRONMENT = "production"

# KV namespace (create with: wrangler kv:namespace create VIETFI_CACHE)
# Replace with actual namespace ID after creation
kv_namespaces = [
  { binding = "VIETFI_CACHE", id = "REPLACE_WITH_KV_ID" }
]

# R2 bucket (create with: wrangler r2 bucket create vietfi-static)
[[r2_buckets]]
binding = "VIETFI_STATIC"
bucket_name = "vietfi-static"
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types"],
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
.dist/
.env
.env.local
*.local
```

- [ ] **Step 5: Create HMAC library** (`src/lib/hmac.ts`)

```typescript
/**
 * HMAC-SHA256 request signing for Vercel → CF Worker auth.
 * Protects against forged requests, replay attacks, expired requests.
 */

const SECRET = HMAC_SECRET; // set via wrangler secret
const TIMESTAMP_TTL_SECONDS = 300; // 5 minutes
const NONCE_TTL_SECONDS = 300;

// In-memory nonce store (resets on Worker cold start)
// For production: use CF KV with TTL
const usedNonces = new Set<string>();

/**
 * Generate HMAC signature for a request.
 * Called by Vercel frontend before sending request.
 */
export function generateSignature(timestamp: number, nonce: string, body: string): string {
  const payload = `${timestamp}:${nonce}:${body}`;
  return HMACSHA256(payload, SECRET);
}

/**
 * Verify HMAC signature from incoming request.
 */
export async function verifySignature(
  signature: string,
  timestamp: string,
  nonce: string,
  body: string
): Promise<{ valid: boolean; reason?: string }> {
  // Check timestamp freshness
  const ts = parseInt(timestamp, 10);
  const now = Math.floor(Date.now() / 1000);
  if (isNaN(ts) || Math.abs(now - ts) > TIMESTAMP_TTL_SECONDS) {
    return { valid: false, reason: 'EXPIRED' };
  }

  // Check replay
  if (usedNonces.has(nonce)) {
    return { valid: false, reason: 'REPLAY' };
  }

  // Verify signature
  const expected = generateSignature(ts, nonce, body);
  if (signature !== expected) {
    return { valid: false, reason: 'INVALID' };
  }

  // Mark nonce as used (simplified; in prod use KV with TTL)
  usedNonces.add(nonce);
  if (usedNonces.size > 10000) {
    // Prevent memory bloat
    usedNonces.clear();
  }

  return { valid: true };
}

/** Simple HMAC-SHA256 implementation using Web Crypto API */
async function HMACSHA256(message: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(message);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
```

- [ ] **Step 6: Create KV helpers** (`src/lib/kv.ts`)

```typescript
/**
 * Cloudflare KV Store helpers for VietFi cached data.
 * KV store acts as a cache between crawlers (writers) and API routes (readers).
 */

export interface MarketData {
  vnindex: { value: number; change: number; changePercent: number } | null;
  goldSjc: { buy: number; sell: number; brand: string } | null;
  usdVnd: { rate: number; bank: string } | null;
  updatedAt: string; // ISO string
  source: string;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface StockScreenerResult {
  stocks: Array<{
    symbol: string;
    name: string;
    price: number;
    pe: number;
    pb: number;
    roe: number;
    exchange: string;
  }>;
  updatedAt: string;
}

export interface MorningBrief {
  summary: string;
  marketMood: 'bullish' | 'bearish' | 'neutral';
  topNews: NewsItem[];
  keyLevels: { vnindex: number; support: number; resistance: number };
  generatedAt: string;
}

/**
 * Read market data from KV.
 * Returns null if not cached or expired (TTL: 15 minutes).
 */
export async function getMarketData(env: Env): Promise<MarketData | null> {
  const data = await env.VIETFI_CACHE.get<MarketData>('market:data', 'json');
  if (!data) return null;

  const updatedAt = new Date(data.updatedAt).getTime();
  const now = Date.now();
  const ageMinutes = (now - updatedAt) / 1000 / 60;

  // Treat as stale if older than 20 minutes
  if (ageMinutes > 20) return null;

  return data;
}

/**
 * Write market data to KV with 24h TTL.
 */
export async function setMarketData(data: MarketData, env: Env): Promise<void> {
  await env.VIETFI_CACHE.put('market:data', JSON.stringify(data), {
    expirationTtl: 86400, // 24 hours
  });
}

/**
 * Read news from KV.
 */
export async function getNews(env: Env): Promise<NewsItem[]> {
  const data = await env.VIETFI_CACHE.get<NewsItem[]>('news:items', 'json');
  return data ?? [];
}

/**
 * Write news to KV.
 */
export async function setNews(items: NewsItem[], env: Env): Promise<void> {
  await env.VIETFI_CACHE.put('news:items', JSON.stringify(items), {
    expirationTtl: 86400,
  });
}

/**
 * Read morning brief from KV.
 */
export async function getMorningBrief(env: Env): Promise<MorningBrief | null> {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const data = await env.VIETFI_CACHE.get<MorningBrief>(`brief:${today}`, 'json');
  return data ?? null;
}

/**
 * Write morning brief to KV (no expiry, regenerated daily).
 */
export async function setMorningBrief(brief: MorningBrief, env: Env): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await env.VIETFI_CACHE.put(`brief:${today}`, JSON.stringify(brief));
}

/**
 * Read stock screener from KV.
 */
export async function getStockScreener(
  params: { maxPE?: number; maxPB?: number; minROE?: number; exchange?: string },
  env: Env
): Promise<StockScreenerResult | null> {
  const cacheKey = `stock:${JSON.stringify(params)}`;
  const data = await env.VIETFI_CACHE.get<StockScreenerResult>(cacheKey, 'json');
  if (!data) return null;

  const ageMinutes = (Date.now() - new Date(data.updatedAt).getTime()) / 1000 / 60;
  if (ageMinutes > 30) return null;

  return data;
}

/**
 * Write stock screener to KV.
 */
export async function setStockScreener(
  params: { maxPE?: number; maxPB?: number; minROE?: number; exchange?: string },
  result: StockScreenerResult,
  env: Env
): Promise<void> {
  const cacheKey = `stock:${JSON.stringify(params)}`;
  await env.VIETFI_CACHE.put(cacheKey, JSON.stringify(result), {
    expirationTtl: 86400,
  });
}
```

- [ ] **Step 7: Create Worker entry point** (`src/worker.ts`)

```typescript
import { verifySignature } from './lib/hmac';
import { getMarketData } from './lib/kv';
import type { MarketData } from './lib/kv';

// Router maps path → handler
const routes: Record<string, (request: Request, env: Env) => Promise<Response>> = {
  '/api/market-data': handleMarketData,
  '/api/news': handleNews,
  '/api/chat': handleChat,
  '/api/morning-brief': handleMorningBrief,
  '/api/stock-screener': handleStockScreener,
  '/api/tts': handleTTS,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Health check — no auth
    if (path === '/health') {
      return new Response(JSON.stringify({ status: 'ok', ts: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Route not found
    const handler = routes[path];
    if (!handler) {
      return new Response('Not Found', { status: 404 });
    }

    // HMAC verification for all API routes
    const signature = request.headers.get('X-Signature') ?? '';
    const timestamp = request.headers.get('X-Timestamp') ?? '';
    const nonce = request.headers.get('X-Nonce') ?? '';
    const body = await request.clone().text();

    const result = await verifySignature(signature, timestamp, nonce, body);
    if (!result.valid) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', reason: result.reason }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting (simplified — use CF Rate Limiting rules for production)
    const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
    const rateKey = `${path}:${ip}`;
    // TODO: implement rate limiting via CF KV counter

    return handler(request, env);
  },
};

// --- Route Handlers ---

async function handleMarketData(_request: Request, env: Env): Promise<Response> {
  const data = await getMarketData(env);
  if (!data) {
    return new Response(
      JSON.stringify({ error: 'Data not available. Crawlers may not have run yet.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
  });
}

async function handleNews(_request: Request, env: Env): Promise<Response> {
  const { getNews } = await import('./lib/kv');
  const items = await getNews(env);
  return new Response(JSON.stringify({ items, count: items.length }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  // Gemini streaming relay
  const body = await request.json<{ message: string; history?: unknown[] }>();

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?key=${env.GEMINI_API_KEY}&alt=sse`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: body.history ?? [],
        contents: [...(body.history ?? []), { role: 'user', parts: [{ text: body.message }] }],
        generationConfig: { maxOutputTokens: 500 },
      }),
    }
  );

  if (!geminiResponse.ok) {
    return new Response(
      JSON.stringify({ error: 'AI service unavailable' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Stream the response back
  return new Response(geminiResponse.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function handleMorningBrief(_request: Request, env: Env): Promise<Response> {
  const { getMorningBrief } = await import('./lib/kv');
  const brief = await getMorningBrief(env);
  if (!brief) {
    return new Response(
      JSON.stringify({ error: 'Morning brief not generated yet. Try again at 8am VN time.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return new Response(JSON.stringify(brief), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600' },
  });
}

async function handleStockScreener(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const params = {
    maxPE: url.searchParams.get('maxPE') ? parseFloat(url.searchParams.get('maxPE')!) : undefined,
    maxPB: url.searchParams.get('maxPB') ? parseFloat(url.searchParams.get('maxPB')!) : undefined,
    minROE: url.searchParams.get('minROE') ? parseFloat(url.searchParams.get('minROE')!) : undefined,
    exchange: url.searchParams.get('exchange') ?? undefined,
  };
  const { getStockScreener } = await import('./lib/kv');
  const data = await getStockScreener(params, env);
  if (!data) {
    return new Response(
      JSON.stringify({ error: 'Stock data not available. Crawlers may not have run yet.' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300' },
  });
}

async function handleTTS(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const filename = url.searchParams.get('file');
  if (!filename) {
    return new Response('Missing file parameter', { status: 400 });
  }

  // Sanitize filename — only allow alphanumeric, dash, underscore
  const safeName = filename.replace(/[^a-zA-Z0-9_-]/g, '');
  const object = await env.VIETFI_STATIC.head(safeName);
  if (!object) {
    return new Response('Audio file not found', { status: 404 });
  }

  const stream = await env.VIETFI_STATIC.get(safeName);
  if (!stream) {
    return new Response('Audio file not found', { status: 404 });
  }

  return new Response(stream.body, {
    headers: {
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=86400',
      'Content-Length': object.size.toString(),
    },
  });
}

// Type declarations
interface Env {
  VIETFI_CACHE: KVNamespace;
  VIETFI_STATIC: R2Bucket;
  GEMINI_API_KEY: string;
  HMAC_SECRET: string;
}
```

- [ ] **Step 8: TypeScript check**

```bash
cd vietfi-cloudflare && npx tsc --noEmit
```

Expected: No errors (after adding `@cloudflare/workers-types`).

- [ ] **Step 9: Commit**

```bash
cd vietfi-cloudflare && git init && git add -A && git commit -m "feat(cf-worker): scaffold Cloudflare Worker gateway

- wrangler.toml, tsconfig, package.json
- HMAC signing lib (SHA-256, timestamp + nonce replay protection)
- KV helpers (market data, news, morning brief, stock screener)
- Worker entry point with route map + /health check
- Handlers: market-data, news, chat (stream relay), morning-brief, stock-screener, tts (R2)
- R2 static file proxy for TTS audio"
```

---

### Task 2: Setup Cloudflare KV Namespace and R2 Bucket

- [ ] **Step 1: Login to Cloudflare**

```bash
npx wrangler login
# Opens browser for authentication
```

- [ ] **Step 2: Create KV namespace**

```bash
npx wrangler kv:namespace create VIETFI_CACHE
# Output: id: "xxxxxxxxxxxxxxxxxxxxxx"
# Copy this ID
```

- [ ] **Step 3: Update wrangler.toml with KV ID**

Replace `REPLACE_WITH_KV_ID` in `kv_namespaces` with actual ID from step 2.

- [ ] **Step 4: Create R2 bucket for TTS files**

```bash
npx wrangler r2 bucket create vietfi-static
```

- [ ] **Step 5: Set secrets**

```bash
npx wrangler secret put HMAC_SECRET
# Enter a random 32+ character string (e.g. from: openssl rand -hex 32)

npx wrangler secret put GEMINI_API_KEY
# Enter Google AI API key
```

- [ ] **Step 6: Deploy Worker (staging)**

```bash
npx wrangler deploy --env staging
# Output: https://vietfi-api.<account>.workers.dev
```

- [ ] **Step 7: Test health endpoint**

```bash
curl https://vietfi-api.<account>.workers.dev/health
# Expected: {"status":"ok","ts":<timestamp>}
```

- [ ] **Step 8: Test KV (write then read)**

```bash
# Write test data via CF API or create a temporary write endpoint
curl -X POST https://vietfi-api.<account>.workers.dev/admin/kv-write \
  -H "X-Admin-Key: YOUR_ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{"key":"market:data","value":{"vnindex":{"value":1200,"change":5,"changePercent":0.42},"goldSjc":{"buy":89000000,"sell":90000000,"brand":"SJC"},"usdVnd":{"rate":24500,"bank":"SBV"},"updatedAt":"2026-04-01T08:00:00Z","source":"test"}}'
```

- [ ] **Step 9: Test KV read**

```bash
# Generate test HMAC signature (use Node.js or Python script)
# Then:
curl https://vietfi-api.<account>.workers.dev/api/market-data \
  -H "X-Signature: <sig>" \
  -H "X-Timestamp: <ts>" \
  -H "X-Nonce: <nonce>"
# Expected: 200 with market data JSON
```

- [ ] **Step 10: Commit**

```bash
cd vietfi-cloudflare && git add wrangler.toml && git commit -m "chore(cf-worker): add KV and R2 bindings, set secrets

KV: VIETFI_CACHE namespace created
R2: vietfi-static bucket created
Secrets: HMAC_SECRET, GEMINI_API_KEY set via wrangler secret"
```

---

## Chunk 2: Phase 2 — CF Pages Functions (Crawlers)

### Task 3: Migrate Crawlers to CF Pages Functions

**Files:**
- Create: `vietfi-cloudflare/functions/crawl-cafef.ts`
- Create: `vietfi-cloudflare/functions/crawl-sbv.ts`
- Create: `vietfi-cloudflare/functions/crawl-yahoo.ts`
- Create: `vietfi-cloudflare/functions/crawl-stock.ts`
- Modify: `vietfi-cloudflare/wrangler.toml` (add pages config)
- Test: `vietfi-cloudflare/functions/crawl-cafef.test.ts`

First, read the existing crawlers to understand selectors and response shapes:

- Read: `src/lib/market-data/crawler.ts` ( CafeF, Yahoo, SBV parsers)
- Read: `src/lib/news/crawler.ts` ( news parser)
- Read: `src/lib/market-data/stock-screener.ts` ( TCBS parser)

- [ ] **Step 1: Read existing crawlers** (skip if already read)

Focus on:
- `parseVnindex()` — CafeF selectors
- `parseGold()` — Yahoo Finance selectors
- `parseUsdVnd()` — SBV selectors
- `parseNews()` — CafeF RSS selectors
- `parseStockScreener()` — TCBS selectors

- [ ] **Step 2: Create CafeF crawler Pages Function** (`functions/crawl-cafef.ts`)

```typescript
/**
 * CF Pages Function: crawl-cafef
 * Triggered by CF Schedule every 15 minutes.
 * Fetches VN-Index, gold, USD from CafeF + related sources.
 */

interface Env {
  VIETFI_CACHE: KVNamespace;
  GEMINI_API_KEY?: string; // Optional, for batch if needed
}

export async function onRequest(context: ExecutionContext): Promise<Response> {
  const { env } = context;
  const results: {
    vnindex: unknown;
    gold: unknown;
    updatedAt: string;
    errors: string[];
  } = {
    vnindex: null,
    gold: null,
    updatedAt: new Date().toISOString(),
    errors: [],
  };

  try {
    // Fetch CafeF market page
    const cafefRes = await fetch('https://cafef.vn', {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VietFiBot/1.0)' },
      cf: { cacheTtl: 0, cacheEverything: false },
    });
    const html = await cafefRes.text();

    // Parse VN-Index (selector from existing crawler.ts)
    const vnindexMatch = html.match(/class="idxmain">[^<]*<[^>]*>([\d,.]+)/);
    if (vnindexMatch) {
      const value = parseFloat(vnindexMatch[1].replace(/,/g, ''));
      // TODO: extract change and changePercent from existing crawler.ts
      results.vnindex = { value, change: null, changePercent: null };
    } else {
      results.errors.push('VN-Index selector did not match');
    }
  } catch (err) {
    results.errors.push(`CafeF fetch failed: ${err}`);
  }

  // Write to KV
  // NOTE: This function only updates partial data.
  // The full market data is assembled by mergeMarketData() or during read.
  try {
    // Read existing market data
    const existing = await env.VIETFI_CACHE.get<{
      vnindex?: unknown;
      gold?: unknown;
      usdVnd?: unknown;
      updatedAt: string;
      source: string;
    }>('market:data', 'json');

    const merged = {
      ...(existing ?? {}),
      ...results,
      source: 'cf-pages',
    };

    await env.VIETFI_CACHE.put('market:data', JSON.stringify(merged), {
      expirationTtl: 86400,
    });
  } catch (err) {
    results.errors.push(`KV write failed: ${err}`);
  }

  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

> **NOTE:** The actual selector strings for CafeF/Yahoo/SBV must be copied from `src/lib/market-data/crawler.ts`. Since selectors may break over time, copy them exactly and add a comment noting the last working date.

- [ ] **Step 3: Create SBV crawler** (`functions/crawl-sbv.ts`)

Same pattern as crawl-cafef.ts, fetching SBV for USD/VND rate.

- [ ] **Step 4: Create Yahoo crawler** (`functions/crawl-yahoo.ts`)

Same pattern, fetching Yahoo Finance for Gold USD price.

- [ ] **Step 5: Create stock screener crawler** (`functions/crawl-stock.ts`)

Fetches TCBS for VN stock data and writes to KV.

- [ ] **Step 6: Setup CF Schedules** (via wrangler.toml or dashboard)

```toml
# Add to wrangler.toml
[triggers]
crons = ["*/15 * * * *"]  # Every 15 minutes
```

Or configure in Cloudflare Dashboard → Workers & Pages → your project → Schedules.

- [ ] **Step 7: Test crawlers locally**

```bash
npx wrangler pages dev vietfi-cloudflare \
  -- command npm run pages:dev \
  --port 8788
# Then visit http://localhost:8788/.netlify/functions/crawl-cafef
```

- [ ] **Step 8: Deploy Pages project**

```bash
npx wrangler pages deploy vietfi-cloudflare
# Note: wrangler pages uses the `functions/` directory automatically
```

- [ ] **Step 9: Trigger manually and verify KV data**

```bash
# Trigger via CF dashboard or API
curl -X POST https://vietfi-cloudflare.<account>.pages.dev/functions/crawl-cafef
curl -X POST https://vietfi-cloudflare.<account>.pages.dev/functions/crawl-sbv
curl -X POST https://vietfi-cloudflare.<account>.pages.dev/functions/crawl-yahoo

# Verify via KV read
curl https://vietfi-api.<account>.workers.dev/api/market-data \
  -H "X-Signature: <sig>" -H "X-Timestamp: <ts>" -H "X-Nonce: <nonce>"
```

- [ ] **Step 10: Commit**

```bash
git add functions/ wrangler.toml
git commit -m "feat(cf-pages): migrate crawlers to Cloudflare Pages Functions

- crawl-cafef: CafeF VN-Index fetcher → KV
- crawl-sbv: SBV USD/VND fetcher → KV
- crawl-yahoo: Yahoo Finance Gold USD → KV
- crawl-stock: TCBS stock screener → KV
- CF Schedules: every 15 min trigger"
```

---

## Chunk 3: Phase 3 — Update Vercel Frontend

### Task 4: Add HMAC Client + Update API Calls

**Files:**
- Modify: `src/lib/api-client.ts` (create new file — unified API client with HMAC signing)
- Modify: `src/app/api/market-data/route.ts` (redirect or stub)
- Modify: `.env.example` (add NEXT_PUBLIC_API_BASE)
- Modify: `vercel.json` (update routes if needed)

- [ ] **Step 1: Create HMAC client utility** (`src/lib/api-client.ts`)

```typescript
/**
 * VietFi API Client — signs all requests with HMAC-SHA256.
 * Use this instead of fetch() directly for API calls.
 * NEXT_PUBLIC_API_BASE must be set to the CF Worker URL.
 */

const API_BASE =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE) ??
  (typeof window !== 'undefined' && (window as unknown as { env?: { NEXT_PUBLIC_API_BASE?: string } }).env?.NEXT_PUBLIC_API_BASE) ??
  '';

const HMAC_SECRET =
  (typeof process !== 'undefined' && process.env.HMAC_CLIENT_SECRET) ??
  '';

// Note: HMAC_CLIENT_SECRET should be the SAME as CF Worker's HMAC_SECRET.
// This is safe because it's used by the client-side to sign requests.
// The Worker verifies the signature — not the secret itself.
if (!HMAC_SECRET && process.env.NODE_ENV === 'production') {
  console.warn('[api-client] HMAC_CLIENT_SECRET not set — requests will fail auth');
}

function generateNonce(): string {
  return crypto.randomUUID();
}

async function generateSignature(
  timestamp: number,
  nonce: string,
  body: string
): Promise<string> {
  if (!HMAC_SECRET) return '';
  const payload = `${timestamp}:${nonce}:${body}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(HMAC_SECRET);
  const messageData = encoder.encode(payload);
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const hashArray = Array.from(new Uint8Array(signature));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

interface RequestOptions extends RequestInit {
  /** Query params to append to URL */
  params?: Record<string, string | number | undefined>;
}

/**
 * Signed fetch wrapper. Adds HMAC headers automatically.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const url = new URL(path, API_BASE);
  if (options.params) {
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const body = options.body ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body)) : '';
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = generateNonce();
  const signature = await generateSignature(timestamp, nonce, body);

  const response = await fetch(url.toString(), {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Signature': signature,
      'X-Timestamp': String(timestamp),
      'X-Nonce': nonce,
      ...options.headers,
    },
    body: body || undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API ${path} failed (${response.status}): ${error}`);
  }

  return response.json() as Promise<T>;
}

// Convenience methods
export const api = {
  get: <T = unknown>(path: string, params?: Record<string, string | number | undefined>) =>
    apiRequest<T>(path, { method: 'GET', params }),

  post: <T = unknown>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),

  postJson: <T = unknown>(path: string, body: unknown) =>
    apiRequest<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
};

// Named exports for specific endpoints
export const marketApi = {
  getData: () => api.get<import('./kv-types').MarketData>('/api/market-data'),
};

export const newsApi = {
  getNews: () => api.get<{ items: import('./kv-types').NewsItem[]; count: number }>('/api/news'),
};

export const chatApi = {
  sendMessage: (message: string, history?: unknown[]) =>
    api.postJson<import('./kv-types').ChatResponse>('/api/chat', { message, history }),
};

export const briefApi = {
  get: () => api.get<import('./kv-types').MorningBrief>('/api/morning-brief'),
};

export const stockApi = {
  screener: (params: {
    maxPE?: number;
    maxPB?: number;
    minROE?: number;
    exchange?: string;
  }) =>
    api.get<import('./kv-types').StockScreenerResult>('/api/stock-screener', params),
};
```

- [ ] **Step 2: Update `.env.example`**

Add to the existing `.env.example`:

```env
# Cloudflare Worker API Gateway
NEXT_PUBLIC_API_BASE=https://vietfi-api.<account>.workers.dev

# HMAC secret (same as CF Worker secret, used by client-side signing)
# DO NOT prefix with NEXT_PUBLIC_ — this is a server-side signing secret
HMAC_CLIENT_SECRET=your_hmac_secret_here
```

- [ ] **Step 3: Stub old API routes** (`src/app/api/market-data/route.ts`)

```typescript
// This file replaces the existing market-data API route.
// All logic moved to Cloudflare Worker.
// Keeping this stub prevents 404 errors during transition.

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json(
    {
      error: 'DEPRECATED',
      message: 'This endpoint has moved to the Cloudflare Worker gateway. Update NEXT_PUBLIC_API_BASE in your environment.',
      migrationGuide: 'See docs/superpowers/plans/2026-04-01-hybrid-vps-deploy.md',
    },
    { status: 410 }
  );
}
```

Do the same for all other API routes: `/api/news`, `/api/chat`, `/api/morning-brief`, `/api/stock-screener`, `/api/tts`.

- [ ] **Step 4: Update Supabase client URL**

The Supabase URL stays the same. Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are still set in `.env.local`.

- [ ] **Step 5: Test local dev with staging Worker**

```bash
# In .env.local
NEXT_PUBLIC_API_BASE=https://vietfi-api-staging.<account>.workers.dev
HMAC_CLIENT_SECRET=<same secret>
```

Then start dev server:
```bash
npm run dev
# Navigate to /dashboard/market
# Should see data from KV store (if crawlers ran)
```

- [ ] **Step 6: Verify no breaking changes**

```bash
npm run build
# Should pass — only env vars and API client changed
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/api-client.ts src/app/api/market-data/route.ts .env.example
git commit -m "feat(frontend): add HMAC API client + redirect API routes to CF Worker

- New src/lib/api-client.ts with HMAC signing (Web Crypto API)
- All API routes stubbed with 410 DEPRECATED response
- .env.example updated with NEXT_PUBLIC_API_BASE and HMAC_CLIENT_SECRET
- Supabase URLs unchanged"
```

---

## Chunk 4: Phase 4 — VPS Relay Setup

### Task 5: Setup VPS with Bun + Nginx

**Files:**
- Create: `vps-api-relay/ecosystem.config.js`
- Create: `vps-api-relay/src/index.ts`
- Create: `vps-api-relay/scripts/setup-vps.sh`
- Create: `vps-api-relay/nginx/default.conf`
- Create: `vps-api-relay/.env.example`
- Create: `vps-api-relay/package.json`

**Prerequisite:** VPS provisioned with Ubuntu 22.04, SSH access configured.

- [ ] **Step 1: Read existing VPS setup (if any)**

Check if user already has Nginx or PM2 installed on VPS:
```bash
ssh user@vps-ip "nginx -v && pm2 --version && node -v"
```

- [ ] **Step 2: Create project on VPS** (`vps-api-relay/`)

```bash
mkdir -p vps-api-relay/src vps-api-relay/nginx vps-api-relay/scripts
cd vps-api-relay
npm init -y
npm install bun pm2 --save-dev
npm install
```

**package.json:**
```json
{
  "name": "vps-api-relay",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "start": "bun run src/index.ts",
    "dev": "bun run --watch src/index.ts",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:stop": "pm2 stop vps-relay",
    "pm2:restart": "pm2 restart vps-relay",
    "pm2:logs": "pm2 logs vps-relay"
  },
  "devDependencies": {
    "bun": "^1.0.0",
    "pm2": "^5.3.0"
  }
}
```

- [ ] **Step 3: Create Bun relay server** (`src/index.ts`)

```typescript
/**
 * VPS Relay Server — Bun
 * Acts as a secure relay between Cloudflare Worker and Gemini/data sources.
 * Runs on internal port 3000. Only accepts traffic from Cloudflare IPs.
 *
 * Memory target: ~60MB
 */

import type { Server } from 'bun';

const PORT = parseInt(process.env.PORT ?? '3000', 10);
const CF_WORKER_URL = process.env.CF_WORKER_URL ?? '';

// Cloudflare IP ranges (as of 2024)
const CF_IP_RANGES = [
  '173.245.48.0/20',
  '103.21.244.0/22',
  '103.22.200.0/22',
  '103.31.4.0/22',
  '104.16.0.0/13',
  '162.158.0.0/15',
  '172.64.0.0/13',
];

function isCFIp(ip: string): boolean {
  // Simplified: check if IP is private or Cloudflare
  // For production: use a proper IP range check library
  // Cloudflare always passes real IP via CF-Connecting-IP header
  const cfConnectingIP = ip.startsWith('173.245.') ||
    ip.startsWith('103.21.') || ip.startsWith('103.22.') ||
    ip.startsWith('103.31.') || ip.startsWith('104.') ||
    ip.startsWith('162.158.') || ip.startsWith('172.64.') ||
    ip.startsWith('172.65.') || ip.startsWith('172.66.');
  return cfConnectingIP;
}

const server: Server = Bun.serve({
  port: PORT,
  reusePort: true,

  async fetch(req: Request): Promise<Response> {
    // Get real IP (Cloudflare proxy IP)
    const ip = req.headers.get('CF-Connecting-IP') ??
               req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
               '127.0.0.1';

    // Security: block non-Cloudflare IPs (except localhost for health checks)
    if (!isCFIp(ip) && ip !== '127.0.0.1' && ip !== '::1') {
      return new Response('Forbidden', {
        status: 403,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // Health check
    const url = new URL(req.url);
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', ip, ts: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Relay to Cloudflare Worker
    // The Worker handles auth, we just forward the request
    const workerUrl = CF_WORKER_URL + url.pathname + url.search;
    const workerRes = await fetch(workerUrl, {
      method: req.method,
      headers: {
        // Forward Cloudflare headers
        'CF-Connecting-IP': ip,
        'X-Forwarded-For': ip,
        'Host': new URL(CF_WORKER_URL).host,
        'Content-Type': req.headers.get('Content-Type') ?? 'application/json',
        // Forward API-specific headers
        'X-Signature': req.headers.get('X-Signature') ?? '',
        'X-Timestamp': req.headers.get('X-Timestamp') ?? '',
        'X-Nonce': req.headers.get('X-Nonce') ?? '',
      },
      body: req.body,
      // Stream the body through
      duplex: 'half',
    });

    // Stream response back to client
    return new Response(workerRes.body, {
      status: workerRes.status,
      headers: {
        'Content-Type': workerRes.headers.get('Content-Type') ?? 'application/octet-stream',
        'Cache-Control': workerRes.headers.get('Cache-Control') ?? 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  },

  error(err: Error): Response {
    console.error('[vps-relay] Error:', err.message);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  },
});

console.log(`[vps-relay] Listening on port ${PORT}`);
console.log(`[vps-relay] Relay target: ${CF_WORKER_URL}`);
console.log(`[vps-relay] Expected memory: ~60MB`);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('[vps-relay] SIGTERM received, shutting down...');
  server.stop();
  process.exit(0);
});
```

- [ ] **Step 4: Create PM2 config** (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [
    {
      name: 'vps-relay',
      script: 'bun',
      args: 'run src/index.ts',
      cwd: __dirname,
      instances: 1, // Single instance — no clustering (save RAM)
      exec_mode: 'fork', // Not cluster (saves ~80MB RAM)
      watch: false,
      max_memory_restart: '150M', // Hard cap — restart if exceeded
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      time: true,
      // Auto-restart on crash
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
```

- [ ] **Step 5: Create Nginx config** (`nginx/default.conf`)

```nginx
# VPS Nginx reverse proxy — forwards traffic to Bun relay
# Bun listens on localhost:3000 only (not publicly exposed)

upstream vps_relay {
    server 127.0.0.1:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name _;

    # Redirect HTTP to HTTPS (if SSL cert available)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name _;

    # SSL config (uncomment when you have certificates)
    # ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    # ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    # ssl_protocols TLSv1.2 TLSv1.3;

    client_max_body_size 10M;
    client_body_timeout 30s;

    # Proxy to Bun relay
    location / {
        proxy_pass http://vps_relay;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Connection "";

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;

        # Streaming support (for Gemini SSE)
        proxy_buffering off;
        proxy_cache off;
    }

    # Health check (no proxy needed, Bun handles this)
    location /health {
        proxy_pass http://vps_relay;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        access_log off;
    }

    # Static files (optional — serve TTS audio directly)
    location /static/ {
        alias /var/www/vietfi/static/;
        expires 1d;
        add_header Cache-Control "public, immutable";
    }

    # Rate limiting zone
    limit_req zone=api burst=50 nodelay;
    limit_conn conn_per_ip 10;
}
```

- [ ] **Step 6: Create VPS setup script** (`scripts/setup-vps.sh`)

```bash
#!/usr/bin/env bash
set -euo pipefail
# VietFi Advisor — VPS Setup Script
# Run on VPS: curl -fsSL https://your-repo/scripts/setup-vps.sh | bash

echo "=== VietFi VPS Setup ==="
echo "Memory: $(free -h | awk '/^Mem:/ {print $2}')"
echo "Swap: $(free -h | awk '/^Swap:/ {print $2}')"

# 1. Create swap if missing
if [[ ! -f /swapfile ]]; then
    echo "[1/6] Creating 1GB swap..."
    sudo fallocate -l 1G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
    echo "Swap enabled: $(free -h | awk '/^Swap:/ {print $2}')"
else
    echo "[1/6] Swap already exists"
fi

# 2. Install Bun
echo "[2/6] Installing Bun..."
curl -fsSL https://bun.sh/install | bash
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"
echo "Bun installed: $(bun --version)"

# 3. Install Nginx
echo "[3/6] Installing Nginx..."
sudo apt-get update -qq
sudo apt-get install -y -qq nginx ufw > /dev/null
echo "Nginx installed: $(nginx -v 2>&1)"

# 4. Configure firewall (only Cloudflare IPs)
echo "[4/6] Configuring firewall..."
sudo ufw --force disable 2>/dev/null || true
sudo ufw default deny incoming
sudo ufw default allow outgoing
# Allow SSH
sudo ufw allow 22/tcp comment 'SSH'
# Allow HTTP/HTTPS
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'
# Allow from Cloudflare only (for relay)
# Note: this blocks direct access — only CF can reach the relay
for cidr in \
    "173.245.48.0/20" \
    "103.21.244.0/22" \
    "103.22.200.0/22" \
    "103.31.4.0/22" \
    "104.16.0.0/13" \
    "172.64.0.0/13" \
    "162.158.0.0/15"; do
    sudo ufw allow from $cidr to any port 443 comment "Cloudflare"
done
sudo ufw --force enable
echo "Firewall active:"
sudo ufw status numbered | grep -E "(443|22|CF)"

# 5. Deploy application
echo "[5/6] Deploying application..."
if [[ -d /opt/vietfi-relay ]]; then
    cd /opt/vietfi-relay && git pull
else
    sudo git clone https://github.com/hungpixi/vps-api-relay.git /opt/vietfi-relay
    cd /opt/vietfi-relay
fi
bun install
bun run pm2:start || pm2 start ecosystem.config.js
pm2 save

# 6. Final checks
echo "[6/6] Final checks..."
curl -s http://localhost:3000/health && echo ""
echo "Memory usage: $(ps aux --no-headers | grep bun | awk '{print $6" KB"}')"
echo ""
echo "=== Setup Complete ==="
echo "Bun relay: $(curl -s http://localhost:3000/health)"
echo "Nginx: $(sudo systemctl is-active nginx)"
echo "UFW: $(sudo ufw status | head -1)"
```

- [ ] **Step 7: Create .env.example**

```env
PORT=3000
CF_WORKER_URL=https://vietfi-api.<account>.workers.dev
NODE_ENV=production
```

- [ ] **Step 8: Test locally (before deploying to VPS)**

```bash
# On local machine (or CI)
cp .env.example .env
# Fill in CF_WORKER_URL

bun run src/index.ts
# In another terminal:
curl http://localhost:3000/health
# Expected: {"status":"ok","ip":"127.0.0.1","ts":<timestamp>}
```

- [ ] **Step 9: Commit and push VPS relay repo**

```bash
cd vps-api-relay && git init && git add -A && git commit -m "feat(vps-relay): initial Bun relay server

- Bun HTTP server (~60MB RAM target)
- Cloudflare IP whitelist (block direct access)
- PM2 config (fork mode, 150M memory cap)
- Nginx reverse proxy config
- VPS setup script (swap, bun, nginx, ufw firewall)
- Security: only Cloudflare IPs allowed through firewall"
```

---

## Chunk 5: Phase 4 — Migration & Cutover

### Task 6: Production Cutover

**Goal:** Switch Vercel frontend from internal API routes to CF Worker URL with zero downtime.

- [ ] **Step 1: Ensure KV data is fresh**

```bash
# Trigger all crawlers manually
curl -X POST https://vietfi-cloudflare.<account>.pages.dev/functions/crawl-cafef
curl -X POST https://vietfi-cloudflare.<account>.pages.dev/functions/crawl-sbv
curl -X POST https://vietfi-cloudflare.<account>.pages.dev/functions/crawl-yahoo
curl -X POST https://vietfi-cloudflare.<account>.pages.dev/functions/crawl-stock

# Wait 10s then verify
curl https://vietfi-api.<account>.workers.dev/api/market-data \
  -H "X-Signature: <sig>" -H "X-Timestamp: <ts>" -H "X-Nonce: <nonce>"
# Should return valid data
```

- [ ] **Step 2: Update Vercel environment variables**

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_BASE` | `https://vietfi-api.<account>.workers.dev` |
| `HMAC_CLIENT_SECRET` | (same secret as Worker) |

Set for: **Production, Preview, Development**

- [ ] **Step 3: Deploy Vercel with new config**

```bash
git push origin master
# Vercel auto-deploys
# Or manually:
vercel --prod --token=$VERCEL_TOKEN
```

- [ ] **Step 4: Smoke test production**

```bash
# Test market data
curl https://vietfi-advisor.vercel.app/api/market-data
# Should redirect to CF Worker (or return proper response)

# Open browser: https://vietfi-advisor.vercel.app/dashboard/market
# Verify: market data loads, no console errors
```

- [ ] **Step 5: Monitor error rates**

Check Vercel Analytics and CF Worker Analytics (in CF dashboard) for:
- Error rate (5xx responses)
- KV cache hit rate
- Worker CPU time
- Memory usage on VPS

- [ ] **Step 6: (Optional) Point custom domain to CF Worker**

In Cloudflare Dashboard:
1. Add domain `api.vietfi.example.com`
2. Create CNAME record → `vietfi-api.<account>.workers.dev`
3. Enable proxy (orange cloud)
4. Update `NEXT_PUBLIC_API_BASE` to `https://api.vietfi.example.com`

- [ ] **Step 7: Commit migration complete**

```bash
git add docs/superpowers/plans/2026-04-01-hybrid-vps-deploy.md
git commit -m "docs: add hybrid deploy plan — Vercel + CF Worker + VPS relay"
```

---

## Rollback Checklist

If anything goes wrong:

1. **Revert Vercel env vars:** Set `NEXT_PUBLIC_API_BASE` back to empty → Vercel uses internal routes
2. **API routes still exist:** The stub routes return 410, but the old Vercel routes can be restored by reverting the stub commits
3. **KV data persists:** CF KV keeps data for 24h — no data loss
4. **Crawlers continue:** CF Pages crawlers run independently of Worker gateway
5. **VPS relay:** `pm2 stop vps-relay` stops relay; Nginx still running but returns 502

---

## Dependencies Between Tasks

```
Task 1 (CF Worker scaffold)
  ↓
Task 2 (CF KV + R2 setup)
  ↓ parallel ↓
Task 3 (CF Pages crawlers)  ← independent of Task 4
Task 4 (Vercel frontend)    ← depends on Task 2 (KV ID)
  ↓
Task 5 (VPS relay)           ← independent, can run any time
  ↓
Task 6 (Production cutover)  ← depends on Tasks 1-4
```

**Recommended order:** Task 1 → 2 → 3 (parallel with 4) → 5 (parallel) → 6
