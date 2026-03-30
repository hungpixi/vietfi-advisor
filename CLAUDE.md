# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VietFi Advisor** — Cố vấn Tài chính AI Cho Người Việt.

An AI-powered personal finance app for Vietnamese users, featuring **Vẹt Vàng (Golden Parrot)** — a sarcastic, Duolingo-style mascot that roasts bad spending habits. Built with Next.js 16 + React 19, deployed on Vercel. Competition project for **WDA2026** (Problem 5: Personal Finance).

---

## WDA2026 Task Delegation

| | Hoàng (Human Dev / Night Shift) | Hưng (AI Agent / Day Shift) |
|---|---|---|
| **Scope** | Data Crawling, Security, UI refinements | Feature Development, Business Logic, AI Prompts, WDA2026 Rules validation |
| **Key focus** | Market APIs, News Scraping, Security hardening | Debt Hub, AI Financial Advisor, Gamification, Voice |

---

## Commands

```bash
npm run dev          # Dev server → http://localhost:3000
npm run build        # Production build
npm run lint         # ESLint (eslint.config.mjs, ESLint 9)
npm test             # Vitest (watch mode)
npm run test:run     # Vitest single run, CI
npm run test:e2e     # Playwright — all specs
npm run test:e2e:ui  # Playwright with UI mode
npm run test:e2e:headed  # Playwright headed (visible browser)
npm run test:e2e:debug   # Playwright debug mode
```

### Required Environment Variables (see `.env.example`)

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | ✅ | Google AI API key for Vẹt Vàng chatbot |
| `GEMINI_BASE_URL` | ❌ | Proxy URL (e.g. Cloudflare Worker) |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Supabase anon key |
| `CRON_SECRET` | ✅ | Secret for cron job authentication |

### Useful Dev Commands

```bash
npx tsx scripts/generate-tts-bank.ts    # Generate all 72 TTS MP3 files
npx playwright test --ui                 # Visual test runner
npx playwright show-report               # View last test report
```

---

## Architecture

### Core Philosophy

1. **Client-First, Cron-Light:** Vercel Hobby limits cron to 1/day + 10s execution. Maximize localStorage (guest) and client-side processing. Only use server-side for what requires it.
2. **AI Cost Hierarchy:** Use `gemini-batch.ts` for bulk processing (Morning Briefs, News). Reserve streaming `POST /api/chat` strictly for user conversations.
3. **Mascot as Core Viral Loop:** Vẹt Vàng MUST be sarcastic, street-smart, and brutally honest. Never polite or generic. The chat is the habit-building engine.
4. **No Mutation:** Always create new objects. Never mutate existing state.

---

## AI Chat Pipeline (3-tier, check in order)

| Tier | Source | When to use |
|---|---|---|
| 1 — Regex parser | `src/lib/expense-parser.ts` | `"phở 30k"` → `{item, amount, category}` — 0 API calls |
| 2 — Scripted responses | `src/lib/scripted-responses.ts` | 500+ canned responses across 25 intents, each with `ttsText` (emoji-free) |
| 3 — Gemini streaming | `src/lib/gemini.ts` + `POST /api/chat` | Edge Runtime, 3-attempt retry, `callGemini` / `callGeminiJSON` |

**Rule:** When adding new chat logic, add scripted responses FIRST before reaching Gemini.

---

## Data Persistence

```
Guest user  →  localStorage via src/lib/storage.ts  (18 typed keys, server-safe)
Logged-in   →  Supabase PostgreSQL via src/lib/supabase/user-data.ts  (hybrid DAL, falls back to localStorage)
Migration   →  src/lib/supabase/migrate-local.ts  (one-time push, sets vietfi_migrated flag)
React hooks →  src/lib/supabase/useUserData.ts  (useUserBudget, useUserDebts, useUserGamification)
```

`storage.ts` is the **single source of truth** for all guest data.

---

## Dashboard (`src/app/dashboard/`)

All pages share `dashboard/layout.tsx` which mounts: sidebar navigation, `GamificationBar`, and `VetVangFloat` mascot. New pages are auto-discovered by the sidebar.

| Route | Component | Purpose |
|---|---|---|
| `/dashboard` | `page.tsx` | Overview: net worth, morning brief, news, quests, badges |
| `budget` | `page.tsx` | 6 spending pots, income, pie chart, expense entry |
| `debt` | `page.tsx` | Debt hub: DTI gauge, Snowball/Avalanche optimizer, timeline |
| `portfolio` | `page.tsx` | Allocation pie, GoldTracker, CashflowDNA |
| `risk-profile` | `page.tsx` | 5 prospect-theory questions → risk profile + allocation |
| `personal-cpi` | `page.tsx` | Personal inflation vs official CPI (7 GSO categories) |
| `market` | `page.tsx` | Live VN-Index, Gold SJC, USD/VND, F&G gauge |
| `screener` | `page.tsx` | VN stock filter: maxPE, maxPB, minROE, exchange |
| `sentiment` | `page.tsx` | Fear & Greed Index + AI commentary |
| `news` | `page.tsx` | Live news + sentiment analysis |
| `macro` | `page.tsx` | Macro indicators |
| `gurus` | `page.tsx` | AI investment mentor hub |
| `gurus/[id]` | `page.tsx` | Individual guru chat (Livermore, Minervini, O'Neil, Darvas, Weinstein) |
| `housing` | `page.tsx` | Buy vs rent calculator |
| `leaderboard` | `page.tsx` | XP rankings (1 real user + 14 bot competitors) |
| `learn` | `page.tsx` | 12+ micro-learning lessons, 60s each |

---

## Calculation Engines (`src/lib/calculations/`)

Pure TypeScript, no AI calls, fully testable.

| File | Purpose |
|---|---|
| `debt-optimizer.ts` | DTI ratio + Snowball/Avalanche month-by-month simulation |
| `fg-index.ts` | Fear & Greed Index for VN market (5 weighted indicators) |
| `personal-cpi.ts` | Personal inflation vs official CPI (7 GSO categories) |
| `risk-scoring.ts` | 5 prospect theory questions → risk profile + allocation |

**Component-level PnL:**
- `GoldTracker.tsx` — Real-time PnL: multi-brand DOM scraping (Webgia) + DOJI XML API. Graceful degradation fallback to `goldUsd × Rate + Premium`.
- `CashflowDNA.tsx` — Cashflow pattern analysis.

---

## Gamification System

### XP & Levels

| Level | Name | XP Range | Role |
|---|---|---|---|
| 🐣 | Vẹt Con | 0–499 | MEMBER |
| 🦜 | Vẹt Teen | 500–999 | PRO |
| 🦜✨ | Vẹt Phố | 1,000–1,999 | MASTER |
| 👑 | Vẹt Nhà Giàu | 2,000–4,999 | LEGEND |
| 💎 | Vẹt Hoàng | 5,000+ | LEGEND |

### RBAC

XP thresholds gate content. `hungpixi` promo code bypasses all gates to LEGEND tier. See `src/lib/rbac.ts`.

### Components (`src/components/gamification/`)

- `Badges.tsx` — Badge grid display
- `Celebration.tsx` — Level-up confetti animation
- `ShareCard.tsx` — Achievement social card
- `XPToast.tsx` — XP gain notification toast
- `WeeklyReport.tsx` — Weekly spending/report summary
- `RequireTier.tsx` — Tier-gated content wrapper

---

## API Routes

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat` | Gemini streaming chat (Vẹt Vàng) |
| `POST` | `/api/tts` | Edge TTS (edge-tts-universal) |
| `GET` | `/api/market-data` | Live market data (VN-Index, Gold, USD) |
| `POST` | `/api/cron/market-data` | Cron: market data refresh (8:30am weekdays VN) |
| `GET` | `/api/news` | News + AI sentiment from CafeF RSS |
| `GET` | `/api/morning-brief` | AI Morning Brief (live or heuristic fallback) |
| `POST` | `/api/cron/morning-brief` | Cron: morning brief prep (11pm daily) |
| `POST` | `/api/cron/macro-update` | Cron: macro data update (1st of month) |
| `GET` | `/api/stock-screener` | VN stock screening (TCBS, VN30 fallback) |
| `GET` | `/auth/confirm` | Email OTP confirmation |
| `POST` | `/auth/signout` | Sign out |

### Vercel Cron Schedule (`vercel.json`)

```json
"crons": [
  { "path": "/api/cron/market-data",   "schedule": "30 8 * * 1-5" },  // 8:30am weekdays
  { "path": "/api/cron/morning-brief", "schedule": "0 23 * * *"    },  // 11pm daily
  { "path": "/api/cron/macro-update",  "schedule": "0 0 1 * *"     }   // 1st monthly
]
```

---

## Data Crawlers (`src/lib/market-data/`)

| Source | Purpose | File |
|---|---|---|
| CafeF | VN-Index, stock prices | `crawler.ts` |
| Yahoo Finance | Gold USD price | `crawler.ts` |
| SBV (Nhàn Nhạc) | USD/VND exchange rate | `crawler.ts` |
| CafeF RSS | Financial news articles | `src/lib/news/crawler.ts` |
| TCBS | VN stock screener data | `src/lib/market-data/stock-screener.ts` |
| Webgia DOM | SJC gold brand prices | `GoldTracker.tsx` |
| DOJI XML API | Gold DOJI rates | `GoldTracker.tsx` |

⚠️ **Warning:** CafeF/TCBS DOM selectors are fragile. Check selector strings first when crawlers break.

---

## Auth (Supabase)

Supabase Auth via `@supabase/ssr` with cookie-based sessions in Next.js App Router.
- Server helpers: `src/lib/supabase/server.ts`
- Client helpers: `src/lib/supabase/client.ts`
- RLS policies protect user data
- Supports Email+Password and Google OAuth

---

## Vẹt Vàng Mascot System (`src/components/vet-vang/`)

- `VetVangFloat.tsx` — Floating mascot on dashboard
- `VetVangChat.tsx` — Full chat interface
- `VetVangConfig.tsx` — Avatar config + mood states
- `AnimatedParrot.tsx` — Lottie animation player

**Mood states:** 🔥 Mổ (roast), 💛 Khen (praise), 🧠 Thâm (insightful), 😴 Chán (bored)

**Voice system:**
- Primary: Pre-rendered TTS via `edge-tts-universal` (72+ MP3 files in `public/audio/tts/`)
- Fallback: Web Speech API (pitch 1.3, rate 0.92)
- Voice cloning: Python scripts in `scripts/` with ZinZin WAV reference + FFmpeg post-processing

**Generate TTS bank:**
```bash
npx tsx scripts/generate-tts-bank.ts
```

---

## Code Style

- **Path alias**: `@/*` maps to `./src/*` (tsconfig.json)
- **Styling**: Tailwind CSS v4 (`src/app/globals.css`). CSS custom properties + `.glass-card`, `.text-gradient`, `.bg-gradient-primary`. No inline styles for these.
- **Animations**: Framer Motion for components. Lottie JSON for mascot.
- **TypeScript**: Strict mode. Small files (200–500 lines typical). Extract utilities.
- **Vietnamese context**: All UI, canned responses, and financial logic use VND, Vietnamese financial terminology (SJC gold, VN-Index, USD/VND, Sacombank/Eximbank rates).

---

## Testing

- **Vitest**: 57 tests across 10 files, 70% line coverage enforced
- **Playwright E2E**: Landing, onboarding, budget (15 scenarios)
- **CI**: GitHub Actions `e2e.yml` runs on every push/PR

---

## Known Limitations

| Issue | Workaround |
|---|---|
| Market crawler depends on CafeF DOM structure | Check selector strings in `crawler.ts` first |
| TCBS API fragility | VN30 mock data fallback in stock screener |
| localStorage → Supabase migration is one-way | Data added post-migration stays in localStorage only |
| Gemini mock returns hardcoded responses without `GEMINI_API_KEY` | Do not use mock for real conversations |
| Vercel Hobby cron limit (1/day, 10s) | Use GitHub Actions `vercel-deploy.yml` with CLI token for bypass |

---

## Deployment

- **Platform**: Vercel (Hobby + Hobby Plus)
- **CI/CD**: GitHub Actions (`vercel-deploy.yml`) — uses Vercel CLI with token to bypass Hobby daily deploy limit
- **Auto-deploy**: On push to `master` and manual `workflow_dispatch`
- **Required secrets**: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

---

## Key Files Reference

```
src/
├── app/
│   ├── dashboard/           # All dashboard pages
│   ├── api/                # All API routes
│   ├── login/             # Auth page
│   └── page.tsx            # Landing page
├── components/
│   ├── vet-vang/          # Mascot system
│   ├── gamification/       # Badges, XP, celebrations
│   ├── debt/              # Debt hub components
│   ├── portfolio/         # GoldTracker, CashflowDNA
│   └── onboarding/        # QuickSetupWizard
└── lib/
    ├── calculations/       # Pure TS calculators
    ├── supabase/          # Auth, user data, migration
    ├── market-data/       # Crawlers, parser, screener
    ├── news/              # News crawler
    ├── gemini.ts          # Streaming AI
    ├── gemini-batch.ts    # Batch AI (50% cost)
    ├── expense-parser.ts  # Regex expense parser
    ├── scripted-responses.ts # 500+ canned responses
    ├── storage.ts         # 18-key localStorage wrapper
    ├── gamification.ts    # XP, badges, levels
    ├── rbac.ts            # Role-based access control
    ├── guru-personas.ts   # 5 AI investment mentor prompts
    └── vetvang-persona.ts # Vẹt Vàng system prompt
```
