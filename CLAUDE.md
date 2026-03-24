# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
CRON_SECRET=
```

---

## Architecture

### Strategic Guidelines (WDA2026 Core Philosophy)

1. **Vercel Cron Limits & Client-Side First:** Vercel Hobby limits cron jobs to 1/day and 10s execution. Therefore, MAXIMIZE client-side processing (localStorage) and avoid heavy server-side background tasks.
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
- **Cron**: `POST /api/cron/morning-brief` for Vercel scheduled generation

### Stock Screener

- **Endpoint**: `GET /api/stock-screener` — VN stock screening
- **Params**: `maxPE`, `maxPB`, `minROE`, `minMarketCap`, `minRating`, `exchange`
- **Cache**: 30-minute TTL via `src/lib/market-data/stock-screener.ts`

### API Routes

- **`POST /api/chat`** — Edge Runtime. Custom Data Stream Protocol for Gemini streaming. Requires `GEMINI_API_KEY`.
- **`POST /api/tts`** — Node.js Runtime. Edge TTS (Microsoft, free Vietnamese voice `vi-VN-HoaiMyNeural`). Returns audio blob.
- **`GET /api/market-data`** — Node.js Runtime. Returns live `MarketSnapshot`: VN-Index (cafef), Gold SJC (Yahoo Finance USD/oz → VND/tael), USD/VND (SBV homepage with open.er-api.com fallback). Auto-refreshes every 5 minutes.
- **`POST /api/cron/market-data`** — Node.js Runtime. CRON_SECRET Bearer auth. Same data as `/api/market-data` for Vercel cron scheduling.
- **`GET /api/market`** — *(deprecated alias, points to `/api/market-data`)*
- **`POST /api/morning-brief`** — Node.js Runtime. AI Morning Brief generation with 24h cache. Source: `'gemini'` or `'heuristic'`.
- **`GET /api/news`** — Node.js Runtime. News crawl from CafeF RSS + Gemini sentiment analysis.
- **`GET /api/stock-screener`** — Node.js Runtime. VN stock screening with 30-min cache. Params: `maxPE`, `maxPB`, `minROE`, `minMarketCap`, `minRating`, `exchange`.
- **`POST /api/cron/morning-brief`** — Node.js Runtime. CRON_SECRET Bearer auth. Triggers morning brief generation on schedule.

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
