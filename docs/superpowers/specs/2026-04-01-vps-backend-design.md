# VietFi Advisor — Hybrid Deploy: Vercel Frontend + VPS Backend via Cloudflare Worker

**Date:** 2026-04-01
**Author:** Claude
**Status:** Draft

## Overview

Split the existing monorepo into two deployment targets:

- **Frontend:** Vercel (Next.js UI) — unchanged
- **Backend:** VPS (Node.js/Bun API) — via Cloudflare Worker gateway
- **Compute layer:** Cloudflare Workers + Pages Functions (heavy lifting: crawlers, AI)
- **Cache:** Cloudflare KV Store
- **Database:** Supabase (hosted, unchanged)

**Goal:** Eliminate Vercel cron limits, reduce AI costs, hide VPS IP, run reliably on 1GB RAM VPS.

---

## Architecture

```
Browser
  │
  ▼ HTTPS
Vercel (Next.js)
  │  .env: NEXT_PUBLIC_API_BASE=https://vietfi.yourname.workers.dev
  ▼
Cloudflare Worker Gateway
  │
  ├── CF KV Store (cached market/news/stock data)
  │
  ├── CF Workers (light, real-time)
  │     ├── GET /api/market-data   → KV cache (instant, ~0ms)
  │     ├── GET /api/news         → KV + parse
  │     ├── POST /api/chat        → Gemini streaming (relay)
  │     ├── GET /api/morning-brief → KV cache
  │     ├── GET /api/stock-screener → KV cache
  │     └── GET /api/tts          → R2/static file
  │
  ├── CF Pages Functions (heavy, scheduled)
  │     ├── /functions/crawl-cafef   → KV
  │     ├── /functions/crawl-sbv     → KV
  │     ├── /functions/crawl-yahoo   → KV
  │     └── /functions/crawl-stock   → KV
  │
  └── CF Schedules
        ├── Every 15min  → crawl-cafef, crawl-sbv, crawl-yahoo
        ├── Every 30min  → crawl-stock
        └── Daily 23:00  → generate-morning-brief

VPS (1 vCPU, 1GB RAM)
  Nginx → Bun/Node.js relay
  Firewall: only Cloudflare IP ranges allowed
  RAM usage: ~200MB (relay only, no crawlers, no AI)
```

---

## Infrastructure

### Cloudflare Resources

| Resource | Type | Usage | Free tier |
|---|---|---|---|
| Worker (gateway) | Workers | Request routing, HMAC verify | 100k req/day |
| KV Store | KV | Cache market/news/stock data | 1M reads/day, 100k writes/day |
| R2 Bucket | R2 | Static files (TTS MP3, audio) | 10GB storage, 1M reads/day |
| Pages Functions | Functions | Crawlers, morning brief AI | 10s CPU, 128MB |
| Schedules | Cron Triggers | Trigger crawlers on schedule | 1 cron per site |
| DNS | DNS | Point domain to Worker | Free |

### VPS Specs

| Spec | Value | Notes |
|---|---|---|
| CPU | 1-2 vCPU | |
| RAM | 1 GB | ✅ ~200MB used, 800MB headroom |
| OS | Ubuntu 22.04 LTS | |
| Bandwidth | ≥ 1 Gbps | Sufficient for relay traffic |
| Firewall | UFW | Only allow Cloudflare IPs |

### Cloudflare IP Ranges (Firewall whitelist)

```
173.245.48.0/20
103.21.244.0/22
103.22.200.0/22
103.31.4.0/22
104.16.0.0/13
```

---

## Security

### Layer 1: VPS Firewall
VPS only accepts traffic from Cloudflare IP ranges. Direct IP access → blocked.

### Layer 2: Cloudflare Worker Gateway
HMAC request signing: each request from Vercel includes `{ signature, timestamp, nonce }`. Worker verifies before proxying. Replay attacks blocked via nonce + timestamp window.

```typescript
// Worker middleware (pseudocode)
export default {
  async fetch(request: Request): Promise<Response> {
    const signature = request.headers.get('X-Signature')
    const timestamp = request.headers.get('X-Timestamp')
    const nonce = request.headers.get('X-Nonce')

    if (!verifyHMAC(signature, timestamp, nonce, SECRET)) {
      return new Response('Unauthorized', { status: 401 })
    }

    if (isExpired(timestamp, 300)) { // 5 min window
      return new Response('Expired', { status: 401 })
    }

    if (await nonceExists(nonce)) {
      return new Response('Replay', { status: 401 })
    }

    await nonceStore.put(nonce, timestamp) // 5 min TTL
    return handle(request)
  }
}
```

### Layer 3: Rate Limiting (Worker)
Cloudflare Workers tiered caching + rate limit:
- `/api/chat`: 60 req/min per IP
- `/api/market-data`: 120 req/min per IP
- `/api/cron/*`: HMAC only, no rate limit

### What DevTools shows
`api.vietfi.yourname.workers.dev` — no IP, no port, clean.

---

## Data Flow

### Market Data (read path)
```
Browser → Vercel → GET /api/market-data
                           │
                    CF Worker (verify HMAC)
                           │
                    CF KV Store (read)
                    key: "market:data"
                    TTL: 15 min
                           │
                    return JSON (~200 bytes)
```

### Market Data (write path)
```
CF Schedule (every 15 min)
    │
CF Pages Function: crawl-cafef
    │  1. Fetch CafeF HTML
    │  2. Parse with cheerio (runs at edge)
    │  3. Write to KV
    ▼
CF KV Store (write)
key: "market:data", value: { vnindex, gold, usd, updatedAt }
TTL: 24 hours
```

### Gemini Chat (real-time)
```
Browser → Vercel → POST /api/chat
                          │
                   CF Worker (stream relay)
                          │
                   Gemini API (direct from CF edge)
                          │
                   Stream back to browser
```

---

## File Structure

```
vietfi-advisor/                          # Vercel repo (existing)
├── src/app/api/                       # Keep: removed or stubbed
│   └── README.md                      # "Use CF Worker instead"
├── src/app/dashboard/                 # Keep: all UI pages
├── src/app/page.tsx                   # Keep: landing
└── .env.local                         # MODIFIED: add CF_WORKER_URL

vietfi-cloudflare/                     # Cloudflare project
├── wrangler.toml                       # CF config
├── src/
│   ├── worker.ts                      # Gateway: routing + HMAC
│   ├── routes/
│   │   ├── market-data.ts             # KV read
│   │   ├── news.ts                    # KV read + parse
│   │   ├── chat.ts                    # Gemini stream relay
│   │   ├── morning-brief.ts           # KV read
│   │   ├── stock-screener.ts          # KV read
│   │   └── tts.ts                    # R2 static
│   └── lib/
│       ├── hmac.ts                    # HMAC verify
│       ├── kv.ts                      # KV helpers
│       └── gemini.ts                  # Gemini streaming relay
├── functions/
│   ├── crawl-cafef.ts                # Pages Function: CafeF crawler
│   ├── crawl-sbv.ts                  # Pages Function: SBV crawler
│   ├── crawl-yahoo.ts                # Pages Function: Yahoo crawler
│   ├── crawl-stock.ts                # Pages Function: TCBS crawler
│   └── generate-morning-brief.ts     # Pages Function: Gemini batch
├── scheduled-tasks.yaml               # CF Schedules config
├── r2-bucket/                         # TTS static files
└── package.json

vps-api-relay/                         # VPS (Bun relay server)
├── ecosystem.config.js                # PM2 config
├── src/
│   ├── index.ts                       # Bun HTTP server (relay only)
│   └── nginx-upstream.ts             # Optional: if Bun is primary
├── nginx/
│   └── default.conf                  # Nginx config
├── scripts/
│   └── setup-vps.sh                  # VPS setup script
├── .env.example
└── package.json

docs/
└── superpowers/specs/
    └── 2026-04-01-vps-backend-design.md  # This file
```

---

## Implementation Phases

### Phase 1: Cloudflare Worker Gateway
1. Create CF Workers project with `wrangler`
2. Implement HMAC middleware
3. Implement `/api/market-data` route (KV read)
4. Deploy + test with Vercel staging
5. Add rate limiting

### Phase 2: Crawler Migration to CF Pages
1. Create CF Pages project
2. Migrate CafeF, SBV, Yahoo crawlers as Pages Functions
3. Setup CF Schedules for cron triggers
4. Populate KV Store with initial data
5. Verify data freshness

### Phase 3: Chat + TTS on CF Workers
1. Implement `/api/chat` as streaming relay
2. Upload TTS files to R2
3. Implement `/api/tts` as R2 proxy
4. Migrate `/api/morning-brief`

### Phase 4: VPS Relay Setup
1. Setup VPS: Nginx + Bun relay
2. Configure firewall (Cloudflare IPs only)
3. Enable swap (1GB)
4. Point DNS: `api.vietfi.yourname.workers.dev` → Worker
5. Production cutover

---

## Key Design Decisions

### Why Bun on VPS instead of Node.js?
- Bun starts in ~5ms vs Node.js ~80ms
- 4x faster for HTTP throughput
- ~50% less RAM
- Native TypeScript support (no build step)

### Why KV Store instead of VPS Redis?
- Zero additional server to maintain
- Global replication (faster reads from anywhere)
- Free tier sufficient for VietFi load
- No Redis password management

### Why CF Pages Functions for crawlers?
- Runs at edge (close to CafeF/SBV servers)
- 128MB RAM limit per function — sufficient for cheerio parsing
- CPU time limit 10s — enough for VN market data
- Scheduled for free (1 cron per site)
- No cold starts from CF's warm infrastructure

### Why not do everything on Cloudflare Pages?
- Gemini streaming is complex to proxy through Pages
- Some AI responses need longer processing
- Pages CPU limit: 10s — too short for complex AI batches
- Worker streaming + Pages crawlers is the right split

---

## Cost Analysis

| Component | Cost |
|---|---|
| Vercel (existing) | Hobby: free |
| Cloudflare (Worker + KV + R2) | Free tier covers ~95% |
| VPS (1GB, 1 vCPU) | ~$7.5-10/month |
| Domain (optional) | ~$10-15/year |
| **Total additional** | **~$7.5-10/month** |

CF free tier breakdown:
- Workers: 100,000 req/day
- KV reads: 1M/day
- KV writes: 100k/day
- R2 reads: 1M/day, 10GB storage

**VietFi estimated usage:**
- Daily active users: ~100-1000
- API calls/day: ~5,000-20,000
- Well within free tier

---

## Rollback Plan

If CF Worker deployment fails:
1. Vercel `.env.local`: revert `NEXT_PUBLIC_API_BASE` to Vercel internal routes
2. KV data remains valid for 24h
3. Crawlers continue on CF Pages (independent)
4. Zero user-facing downtime during transition

---

## Testing Strategy

| Layer | Test |
|---|---|
| HMAC | Unit: valid/invalid/expired/replay signatures |
| KV reads | E2E: verify market data freshness |
| Crawlers | CI: run in Pages dev mode, check KV write |
| Chat relay | Manual: send message, verify stream |
| Rate limit | Load test: 150 req/min, expect 429 after limit |
| Firewall | VPS: attempt direct IP access → expect block |

---

## Appendix: Environment Variables

### Vercel (.env.local)
```env
NEXT_PUBLIC_API_BASE=https://vietfi.yourname.workers.dev
# Supabase stays the same
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

### Cloudflare Worker (wrangler secrets)
```bash
wrangler secret put HMAC_SECRET
wrangler secret put GEMINI_API_KEY
```

### VPS (.env)
```env
PORT=3000
CF_WORKER_URL=https://vietfi.yourname.workers.dev
NODE_ENV=production
```
