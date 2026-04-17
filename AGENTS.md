# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

VietFi Advisor is an AI-powered personal finance app for Vietnamese users, featuring Vẹt Vàng (Golden Parrot) AI — a sarcastic Duolingo-style mascot. Built with Next.js 16 + React 19, deployed on Vercel.

---

## WDA2026 Task Delegation (Hưng vs Hoàng)

- **Hoàng (Human Dev/Night Shift):** Responsible for Data Crawling, Security enhancements, and UI refinements.
- **Hưng (AI Agent/Day Shift):** Responsible for Feature Development (Business Logic/Calculations), writing Prompts, and strictly validating all features against the WDA2026 Competition Rules (Problem 1: Centralized Debt Hub & Problem 2: AI Financial Advisor).

---

## Commands

```bash
npm run dev     # Start dev server → http://localhost:3000
npm run build   # Production build
npm run lint    # ESLint (eslint.config.mjs, ESLint 9)
npm test        # Vitest unit tests (57 tests across 10 files)
```

**Required env vars** (documented in README):
```
GEMINI_API_KEY=          # Required — Google AI API key
GEMINI_BASE_URL=         # Optional — proxy URL (e.g. Cloudflare Worker)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CRON_SECRET=
```

---

## Architecture

### Strategic Guidelines (WDA2026 Core Philosophy)

1. **Client-Side First + External Scheduler:** Keep Vercel focused on frontend/API runtime. Schedule cron jobs from external GitHub Actions and trigger `/api/cron/*` endpoints with `CRON_SECRET`.
2. **Generative AI Usage:** Use `gemini-batch.ts` for bulk AI processing (e.g., Morning Briefs, News summaries) to save costs and avoid timeouts. Reserve the interactive streaming `api/chat` strictly for user conversations.
3. **Mascot Persona (CRITICAL VIRAL FEATURE):** Vẹt Vàng (Golden Parrot) MUST BE the most sarcastic, street-smart, and brutally honest financial advisor in Vietnam. Do not write polite, generic AI responses. The chat is the core viral loop to build user habits.

### AI Chat Pipeline (3-tier fallback — always check tiers in order)

1. **Regex expense parser** (`src/lib/expense-parser.ts`) — parses `"phở 30k"` → `{item, amount, category}` with 0 API calls. Check this first when adding expense-parsing logic.
2. **Scripted responses** (`src/lib/scripted-responses.ts`) — 500+ canned responses across 25 intents. Each entry has `ttsText` (emoji-free, for TTS). Add new responses here before reaching Gemini.
3. **Gemini streaming** (`src/lib/gemini.ts` + `POST /api/chat`) — Edge Runtime, 3-attempt retry, `callGemini` and `callGeminiJSON` variants. Only hits this tier when tiers 1-2 don't match.

### News System

- **Crawl source**: CafeF RSS feeds via `src/lib/news/crawler.ts`
- **Sentiment analysis**: Gemini-powered sentiment tagging per article
- **AI summaries**: `gemini-batch.ts` for cost-efficient bulk summarization
- **Cache**: Results cached to avoid redundant API calls

### Morning Brief

- **Endpoint**: `POST /api/morning-brief` — AI Morning Brief (Node.js runtime)
- **Generation**: `src/lib/morning-brief.ts` with `getMorningBriefCached`
- **Sources**: `'gemini'` (full AI) or `'heuristic'` (rule-based fallback)
- **Cache**: 24-hour TTL to avoid redundant generation
- **Cron trigger**: `POST /api/cron/morning-brief` (called by external scheduler, not Vercel cron)

### Stock Screener

- **Endpoint**: `GET /api/stock-screener` — VN stock screening
- **Params**: `maxPE`, `maxPB`, `minROE`, `minMarketCap`, `minRating`, `exchange`
- **Cache**: 30-minute TTL via `src/lib/market-data/stock-screener.ts`

### API Routes

- **`POST /api/chat`** — Edge Runtime. Custom Data Stream Protocol for Gemini streaming. Requires `GEMINI_API_KEY`.
- **`POST /api/tts`** — Node.js Runtime. Edge TTS (Microsoft, free Vietnamese voice `vi-VN-HoaiMyNeural`). Returns audio blob.
- **`GET /api/market-data`** — Node.js Runtime. Returns live `MarketSnapshot`: VN-Index (cafef), Gold SJC (Yahoo Finance USD/oz → VND/tael), USD/VND (SBV homepage with open.er-api.com fallback). Auto-refreshes every 5 minutes.
- **`POST /api/cron/market-data`** — Node.js Runtime. CRON_SECRET Bearer auth. Trigger endpoint for external scheduler; persists snapshot to Supabase cache.
- **`GET /api/market`** — *(deprecated alias, points to `/api/market-data`)*
- **`POST /api/morning-brief`** — Node.js Runtime. AI Morning Brief generation with 24h cache. Source: `'gemini'` or `'heuristic'`.
- **`GET /api/news`** — Node.js Runtime. News crawl from CafeF RSS + Gemini sentiment analysis.
- **`GET /api/stock-screener`** — Node.js Runtime. VN stock screening with 30-min cache. Params: `maxPE`, `maxPB`, `minROE`, `minMarketCap`, `minRating`, `exchange`.
- **`POST /api/cron/morning-brief`** — Node.js Runtime. CRON_SECRET Bearer auth. Trigger endpoint for external scheduler; persists morning brief to Supabase cache.

### Data Persistence

- **Guest users**: localStorage (budget pots, expenses, debts, gamification, onboarding state)
- **Logged-in users**: Supabase PostgreSQL (RLS-protected, migration tooling ready)
- `src/lib/supabase/client.ts` — Browser singleton Supabase client
- `src/lib/supabase/server.ts` — Server-side Supabase client (for Server Components / Route Handlers)
- `src/lib/supabase/middleware.ts` — SSR auth helper for Middleware
- `src/lib/supabase/migrate-local.ts` — One-time localStorage → Supabase migration (sets `vietfi_migrated` flag)
- `src/lib/supabase/user-data.ts` — Hybrid DAL: Supabase for logged-in users, localStorage fallback for guests

### Gamification System (`src/lib/gamification.ts`)

XP engine with 8 action types (log_expense=10, pay_debt=50, etc.), 5 mascot levels, daily quests, streak tracking, and 8 badges (bronze/silver/gold/diamond tiers). All state lives in localStorage under keys managed by this module.

### Calculation Engines (pure TypeScript, no AI calls)

| File | Purpose |
|------|---------|
| `src/lib/calculations/debt-optimizer.ts` | DTI + Snowball/Avalanche month-by-month simulation |
| `src/lib/calculations/fg-index.ts` | Fear & Greed Index for VN market (5 weighted indicators) |
| `src/lib/calculations/personal-cpi.ts` | Personal inflation vs official CPI (7 GSO categories) |
| `src/lib/calculations/risk-scoring.ts` | 5 prospect theory questions → risk profile + allocation |

### Dashboard Layout (`src/app/dashboard/`)

All dashboard pages share `dashboard/layout.tsx` which mounts: sidebar navigation, `GamificationBar`, and `VetVangFloat` mascot. New dashboard pages go here and are auto-discovered by the sidebar.

**Existing pages**: budget, debt, housing, leaderboard, learn, macro, market, news, personal-cpi, portfolio, risk-profile, screener, sentiment

### Key lib Files

| File | Purpose |
|------|---------|
| `src/lib/storage.ts` | Typed localStorage wrapper — 36 typed accessors for all 18 localStorage keys, server-safe |
| `src/lib/types/budget.ts` | Shared `BudgetPot` and `Expense` type definitions |
| `src/lib/supabase/useUserData.ts` | React hooks: `useUserBudget`, `useUserDebts`, `useUserGamification` (hybrid DAL) |
| `src/lib/gemini-batch.ts` | Gemini batch API (50% cheaper vs interactive), used for Morning Briefs & News summaries |
| `src/lib/morning-brief.ts` | Morning brief generation with 24h cache + heuristic fallback |
| `src/lib/news/crawler.ts` | News crawling from CafeF RSS feeds |
| `src/lib/market-data/stock-screener.ts` | VN stock screening logic |
| `src/lib/market-data/crawler.ts` | Market data crawling (VN-Index, Gold, USD/VND) |
| `src/lib/market-data/parser.ts` | Market data parsing & normalization |
| `src/lib/market-alert.ts` | Push notification alerts for market price movements |
| `src/lib/sounds.ts` | Sound effect management |
| `src/lib/utils.ts` | General utility functions |
| `src/lib/onboarding-state.ts` | Onboarding state management |
| `src/components/vet-vang/AnimatedParrot.tsx` | Lottie-based animated mascot component |

### Extracted Dashboard Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MarketSection` | `src/app/dashboard/components/MarketSection.tsx` | Live market cards, FG gauge, auto-refresh, notification firing |
| `DailyQuestSection` | `src/app/dashboard/components/DailyQuestSection.tsx` | Self-contained quest polling, completion toast, confetti |
| `NotificationBanner` | `src/app/dashboard/components/NotificationBanner.tsx` | Push notification permission banner, self-managed dismissed state |

> `src/app/dashboard/page.tsx` — refactored from 911 to ~500 lines by delegating to the above components. Uses `storage.ts` for all localStorage access.

### Animations & Mascot

- **Framer Motion**: Component animations throughout the UI
- **Lottie**: Mascot animation parts in `public/animations/`
- `src/components/vet-vang/AnimatedParrot.tsx` — Lottie-powered animated Vẹt Vàng
- `src/app/test/lottie/page.tsx` — Test page for Lottie animation development

### PWA

- Service worker at `public/sw.js` for offline support

---

## Code Style

- **Path alias**: `@/*` maps to `./src/*` (tsconfig.json)
- **Styling**: Tailwind CSS v4 (`src/app/globals.css`). CSS custom properties + `.glass-card`, `.text-gradient`, `.bg-gradient-primary` utility classes are defined there. Do not use inline styles for these.

### Data Persistence

- **Guest users**: localStorage (budget pots, expenses, debts, gamification, onboarding state)
- **Logged-in users**: Supabase PostgreSQL (RLS-protected, migration tooling ready)
- `src/lib/supabase/client.ts` — Browser singleton Supabase client
- `src/lib/supabase/server.ts` — Server-side Supabase client (for Server Components / Route Handlers)
- `src/lib/supabase/middleware.ts` — SSR auth helper for Middleware
- `src/lib/supabase/migrate-local.ts` — One-time localStorage → Supabase migration (sets `vietfi_migrated` flag)
- `src/lib/supabase/user-data.ts` — Hybrid DAL: Supabase for logged-in users, localStorage fallback for guests

### Gamification System (`src/lib/gamification.ts`)

XP engine with 8 action types (log_expense=10, pay_debt=50, etc.), 5 mascot levels, daily quests, streak tracking, and 8 badges (bronze/silver/gold/diamond tiers). All state lives in localStorage under keys managed by this module.

### Calculation Engines (pure TypeScript, no AI calls)

| File | Purpose |
|------|---------|
| `src/lib/calculations/debt-optimizer.ts` | DTI + Snowball/Avalanche month-by-month simulation |
| `src/lib/calculations/fg-index.ts` | Fear & Greed Index for VN market (5 weighted indicators) |
| `src/lib/calculations/personal-cpi.ts` | Personal inflation vs official CPI (7 GSO categories) |
| `src/lib/calculations/risk-scoring.ts` | 5 prospect theory questions → risk profile + allocation |

### Dashboard Layout (`src/app/dashboard/`)

All dashboard pages share `dashboard/layout.tsx` which mounts: sidebar navigation, `GamificationBar`, and `VetVangFloat` mascot. New dashboard pages go here and are auto-discovered by the sidebar.

**Existing pages**: budget, debt, housing, leaderboard, learn, macro, market, news, personal-cpi, portfolio, risk-profile, screener, sentiment

### Key lib Files

| File | Purpose |
|------|---------|
| `src/lib/storage.ts` | Typed localStorage wrapper — 36 typed accessors for all 18 localStorage keys, server-safe |
| `src/lib/types/budget.ts` | Shared `BudgetPot` and `Expense` type definitions |
| `src/lib/supabase/useUserData.ts` | React hooks: `useUserBudget`, `useUserDebts`, `useUserGamification` (hybrid DAL) |
| `src/lib/gemini-batch.ts` | Gemini batch API (50% cheaper vs interactive), used for Morning Briefs & News summaries |
| `src/lib/morning-brief.ts` | Morning brief generation with 24h cache + heuristic fallback |
| `src/lib/news/crawler.ts` | News crawling from CafeF RSS feeds |
| `src/lib/market-data/stock-screener.ts` | VN stock screening logic |
| `src/lib/market-data/crawler.ts` | Market data crawling (VN-Index, Gold, USD/VND) |
| `src/lib/market-data/parser.ts` | Market data parsing & normalization |
| `src/lib/market-alert.ts` | Push notification alerts for market price movements |
| `src/lib/sounds.ts` | Sound effect management |
| `src/lib/utils.ts` | General utility functions |
| `src/lib/onboarding-state.ts` | Onboarding state management |
| `src/components/vet-vang/AnimatedParrot.tsx` | Lottie-based animated mascot component |

### Extracted Dashboard Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `MarketSection` | `src/app/dashboard/components/MarketSection.tsx` | Live market cards, FG gauge, auto-refresh, notification firing |
| `DailyQuestSection` | `src/app/dashboard/components/DailyQuestSection.tsx` | Self-contained quest polling, completion toast, confetti |
| `NotificationBanner` | `src/app/dashboard/components/NotificationBanner.tsx` | Push notification permission banner, self-managed dismissed state |

> `src/app/dashboard/page.tsx` — refactored from 911 to ~500 lines by delegating to the above components. Uses `storage.ts` for all localStorage access.

### Animations & Mascot

- **Framer Motion**: Component animations throughout the UI
- **Lottie**: Mascot animation parts in `public/animations/`
- `src/components/vet-vang/AnimatedParrot.tsx` — Lottie-powered animated Vẹt Vàng
- `src/app/test/lottie/page.tsx` — Test page for Lottie animation development

### PWA

- Service worker at `public/sw.js` for offline support

---

## Code Style

- **Path alias**: `@/*` maps to `./src/*` (tsconfig.json)
- **Styling**: Tailwind CSS v4 (`src/app/globals.css`). CSS custom properties + `.glass-card`, `.text-gradient`, `.bg-gradient-primary` utility classes are defined there. Do not use inline styles for these.
- **Animations**: Framer Motion for component animations. Lottie JSON parts for the mascot in `public/animations/`.
- **TypeScript**: Strict mode. Small, focused files (200–500 lines typical). Extract utilities rather than adding to large modules.
- **Vietnamese context**: All UI text, canned responses, and financial logic must use Vietnamese currency (VND), Vietnamese financial terminology, and VN-specific financial context (SJC gold, VN-Index, USD/VND, Sacombank Eximbank rates).

---

## Pending Work

1. **Playwright E2E tests** — vitest covers unit tests (57 tests across 10 files); playwright needed for critical user flows.

---

## Backtest Pro System (added 2026-04-17)

### Architecture

```
User → Guru page → "Backtest chiến lược" → /dashboard/backtest?guru=livermore
                                                         ↓
                                              POST /api/backtest { guru, ticker, ... }
                                                         ↓
                                         src/lib/market-data/backtest-engine.ts (Server)
                                                         ↓
                                         src/lib/market-data/price-history.ts → TCBS API
                                         (cache: next: { revalidate: 3600 } — Vercel edge)
```

### Key files (Backtest)

| File | Purpose |
|------|---------|
| `src/lib/market-data/backtest-engine.ts` | Engine chạy backtest. 4 strategies: buy-and-hold, sma-cross, breakout-52w, ma30w-stage2 |
| `src/lib/market-data/price-history.ts` | Fetch OHLCV từ TCBS. **Cache: `next: { revalidate: 3600 }`** (Next.js edge, không phải in-memory) |
| `src/lib/market-data/guru-strategies.ts` | Map guru ID → BacktestConfig (livermore, darvas, weinstein, minervini, oneil) |
| `src/lib/saved-strategies.ts` | CRUD localStorage cho user saved strategies. Max 20, key: `vietfi_saved_strategies` |
| `src/app/api/backtest/route.ts` | POST API, hỗ trợ `guru` param, validate tất cả inputs |
| `src/app/dashboard/backtest/page.tsx` | UI: Guru Preset selector, URL param ?guru=, save/load chiến lược, tier PRO |
| `src/app/dashboard/gurus/[id]/page.tsx` | Guru detail: real backtest chart, CTA "Backtest chiến lược này" |

### Gamification integration

- Mở Backtest Pro: Tier PRO (300 XP) thay MASTER (1000 XP trước đây)
- Chạy backtest: +30 XP (`run_backtest` action trong XP_TABLE)
- Mở Guru watchlist: 300 XP (3 cà phê)

### Tier system (hiện tại)

| Tier | XP Range | Key Perk |
|------|---------|----------|
| MEMBER | 0-99 | Cơ bản |
| PRO | 300+ | Backtest Pro, Guru watchlist |
| MASTER | 1000+ | (trống — chưa có feature riêng) |
| LEGEND | 5000+ | (trống) |

### Data flow: Client vs Server

| Data | Where | Persist |
|------|-------|---------|
| Backtest computation | Server (API route) | No |
| TCBS price data | Server | Next.js fetch cache 1h (Vercel edge) |
| XP, level, streak | Client localStorage | → Supabase background sync |
| Saved strategies | Client localStorage | `vietfi_saved_strategies` (no cloud sync yet) |
| Backtest results | Client React state | Lost on refresh (by design) |

---

## Session Memory (Latest)

**Last updated:** 2026-04-17 by Hưng (AI)

### ✅ Completed this session
- Thêm 4 strategies vào backtest engine (breakout-52w, ma30w-stage2)
- Kết nối Guru page → Backtest Pro flow (URL param, Guru Preset selector)
- Fix cache bug: thay in-memory Map bằng Next.js fetch cache
- Tạo `saved-strategies.ts` CRUD cho user saved strategies
- Hạ tier Backtest Pro từ MASTER → PRO

### 🔜 Next tasks (theo priority)
1. **[P1]** Thêm Save/Load UI vào backtest/page.tsx (đang làm)
2. **[P2]** Sync saved strategies lên Supabase `user_strategies` table
3. **[P3]** "My Strategies" page riêng (`/dashboard/strategies`)
4. **[P3]** Playwright E2E cho critical flows (backtest, guru unlock)
5. **[Idea]** Screener → Backtest bridge: từ Lọc Cổ Phiếu → bấm "Test ngay"

### ⚠️ Known issues / gotchas
- Supabase project `ttwymfmgqpkffexmjqzj` đang INACTIVE — cần restore để dùng cloud sync
- TCBS API đôi khi trả rỗng cho mã ít giao dịch → fallback mock data (random walk)
- `price-history.ts` mock fallback là random walk, chỉ dùng cho demo/testing
- Guru winRate/avgReturn trong `guru-personas.ts` vẫn là mock — nên tính từ real backtest
