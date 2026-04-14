# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**VietFi Advisor** — Cố vấn Tài chính AI Cho Người Việt.

An AI-powered personal finance app for Vietnamese users, featuring **Vẹt Vàng (Golden Parrot)** — a sarcastic, Duolingo-style mascot that roasts bad spending habits. Built with Next.js 16 + React 19, deployed on Vercel. Competition project for **WDA2026** (Problem 5: Personal Finance).

## WDA2026 Task Delegation

| | Hoàng (Human Dev / Night Shift) | Hưng (AI Agent / Day Shift) |
|---|---|---|
| **Scope** | Data Crawling, Security, UI refinements | Feature Development, Business Logic, AI Prompts, WDA2026 Rules validation |
| **Key focus** | Market APIs, News Scraping, Security hardening | Debt Hub, AI Financial Advisor, Gamification, Voice |

## Commands

```bash
npm run dev          # Dev server → http://localhost:3000
npm run build        # Production build
npm run lint          # ESLint 9 (eslint.config.mjs)
npm test              # Vitest watch mode
npm run test:run      # Vitest single run (CI)
npm run test:e2e      # Playwright — all specs
npm run test:e2e:ui   # Playwright UI mode
npm run test:e2e:headed  # Visible browser
npm run test:e2e:debug   # Playwright debug mode
```

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Google AI API key for Vẹt Vàng chatbot |
| `GEMINI_BASE_URL` | No | Proxy URL (e.g. Cloudflare Worker) |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `CRON_SECRET` | Yes | Secret for cron job authentication |

See `.env.example` for full template.

### Useful Dev Commands

```bash
npx tsx scripts/generate-tts-bank.ts   # Generate all 72 TTS MP3 files
npx playwright test --ui                # Visual test runner
npx playwright show-report               # View last test report
```

## Architecture

### Core Philosophy

1. **Client-First, Cron-Light:** Vercel Hobby limits cron to 1/day + 10s execution. Maximize localStorage (guest) and client-side processing. Only use server-side for what requires it.
2. **AI Cost Hierarchy:** Use `gemini-batch.ts` for bulk processing (Morning Briefs, News). Reserve streaming `POST /api/chat` strictly for user conversations.
3. **Mascot as Core Viral Loop:** Vẹt Vàng MUST be sarcastic, street-smart, and brutally honest. Never polite or generic. The chat is the habit-building engine.
4. **No Mutation:** Always create new objects. Never mutate existing state.

## AI Chat Pipeline

| Tier | Source | Trigger | Cost |
|---|---|---|---|
| 1 — Regex parser | `src/lib/expense-parser.ts` | `"phở 30k"` → `{item, amount, category}` | 0 API calls |
| 2 — Scripted responses | `src/lib/scripted-responses.ts` | 25 intents, 500+ canned responses | 0 API calls |
| 3 — Gemini streaming | `src/lib/gemini.ts` + `POST /api/chat` | Edge Runtime, 3-attempt retry | $ |

**Rule:** When adding new chat logic, add scripted responses FIRST before reaching Gemini.

## Data Persistence

```
Guest user  →  localStorage via src/lib/storage.ts  (18 typed keys, server-safe)
Logged-in   →  Supabase PostgreSQL via src/lib/supabase/user-data.ts
Migration   →  src/lib/supabase/migrate-local.ts  (one-time push, sets vietfi_migrated flag)
React hooks →  src/lib/supabase/useUserData.ts  (useUserBudget, useUserDebts, useUserGamification)
```

`storage.ts` is the **single source of truth** for all guest data.

## Dashboard

All pages share `dashboard/layout.tsx` which mounts: sidebar navigation, `GamificationBar`, and `VetVangFloat` mascot.

| Route | Component | Purpose |
|---|---|---|
| `/dashboard` | `page.tsx` | Overview: net worth, morning brief, news, quests, badges |
| `budget` | `page.tsx` | 6 spending pots, income, pie chart, expense entry |
| `debt` | `page.tsx` | Debt hub: DTI gauge, Snowball/Avalanche optimizer, timeline |
| `portfolio` | `page.tsx` | Allocation pie, GoldTracker, CashflowDNA |
| `risk-profile` | `page.tsx` | Prospect theory quiz → risk profile + allocation |
| `personal-cpi` | `page.tsx` | Personal inflation vs official CPI (7 GSO categories) |
| `market` | `page.tsx` | Live VN-Index, Gold SJC, USD/VND, F&G gauge |
| `screener` | `page.tsx` | VN stock filter: maxPE, maxPB, minROE, exchange |
| `sentiment` | `page.tsx` | Fear & Greed Index + AI commentary |
| `news` | `page.tsx` | Live news + sentiment analysis |
| `macro` | `page.tsx` | Macro indicators |
| `gurus` | `page.tsx` | AI investment mentor hub (5 gurus) |
| `gurus/[id]` | `page.tsx` | Individual guru chat |
| `housing` | `page.tsx` | Buy vs rent calculator |
| `leaderboard` | `page.tsx` | XP rankings (1 real user + 14 bot competitors) |
| `learn` | `page.tsx` | 12+ micro-learning lessons, 60s each |

## Calculation Engines

Pure TypeScript, no AI calls, fully testable. These are the core business logic.

| File | Purpose |
|---|---|
| `debt-optimizer.ts` | DTI ratio + Snowball/Avalanche month-by-month simulation |
| `fg-index.ts` | Fear & Greed Index for VN market (5 weighted indicators) |
| `personal-cpi.ts` | Personal inflation vs official CPI (7 GSO categories) |
| `risk-scoring.ts` | Prospect theory quiz → risk profile (Conservative/Balanced/Aggressive) |

Component-level financial tools:
- `GoldTracker.tsx` — Real-time PnL: multi-brand DOM scraping (Webgia) + DOJI XML API. Graceful degradation fallback to `goldUsd × Rate + Premium`.
- `CashflowDNA.tsx` — Cashflow pattern analysis.

## Gamification

### XP & Levels

| Level | Name | XP Range | Role |
|---|---|---|---|
| 🐣 | Vẹt Con | 0–499 | MEMBER |
| 🦜 | Vẹt Teen | 500–999 | PRO |
| 🦜✨ | Vẹt Phố | 1,000–1,999 | MASTER |
| 👑 | Vẹt Nhà Giàu | 2,000–4,999 | LEGEND |
| 💎 | Vẹt Hoàng | 5,000+ | LEGEND |

### RBAC

XP thresholds gate content access. `hungpixi` promo code bypasses all gates to LEGEND tier. See `src/lib/rbac.ts`.

### Components

| Component | Purpose |
|---|---|
| `Badges.tsx` | Badge grid display |
| `Celebration.tsx` | Level-up confetti animation |
| `ShareCard.tsx` | Achievement social card |
| `XPToast.tsx` | XP gain notification toast |
| `WeeklyReport.tsx` | Weekly spending/report summary |
| `RequireTier.tsx` | Tier-gated content wrapper |

## API Routes

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/api/chat` | Gemini streaming chat (Vẹt Vàng) | — |
| `POST` | `/api/tts` | Edge TTS (edge-tts-universal) | — |
| `GET` | `/api/market-data` | Live market data (VN-Index, Gold, USD) | — |
| `POST` | `/api/cron/market-data` | Cron: market data refresh (8:30am weekdays VN) | `CRON_SECRET` |
| `GET` | `/api/news` | News + AI sentiment from CafeF RSS | — |
| `GET` | `/api/morning-brief` | AI Morning Brief (live or heuristic fallback) | — |
| `POST` | `/api/cron/morning-brief` | Cron: morning brief prep (11pm daily) | `CRON_SECRET` |
| `POST` | `/api/cron/macro-update` | Cron: macro data update (1st of month) | `CRON_SECRET` |
| `GET` | `/api/stock-screener` | VN stock screening (TCBS, VN30 fallback) | — |
| `GET` | `/auth/confirm` | Email OTP confirmation | — |
| `POST` | `/auth/signout` | Sign out | Session |

## Data Crawlers

| Source | Purpose | File |
|---|---|---|
| CafeF | VN-Index, stock prices | `src/lib/market-data/crawler.ts` |
| Yahoo Finance | Gold USD price | `src/lib/market-data/crawler.ts` |
| SBV (Nhàn Nhạc) | USD/VND exchange rate | `src/lib/market-data/crawler.ts` |
| CafeF RSS | Financial news articles | `src/lib/news/crawler.ts` |
| TCBS | VN stock screener data | `src/lib/market-data/stock-screener.ts` |
| Webgia DOM | SJC gold brand prices | `GoldTracker.tsx` |
| DOJI XML API | Gold DOJI rates | `GoldTracker.tsx` |

> **Warning:** CafeF/TCBS DOM selectors are fragile. Check selector strings first when crawlers break.

## Auth (Supabase)

Supabase Auth via `@supabase/ssr` with cookie-based sessions in Next.js App Router.
- Server helpers: `src/lib/supabase/server.ts`
- Client helpers: `src/lib/supabase/client.ts`
- RLS policies protect user data
- Supports Email+Password and Google OAuth

## Code Style

- **Path alias:** `@/*` maps to `./src/*` (tsconfig.json)
- **Styling:** Tailwind CSS v4 (`src/app/globals.css`). CSS custom properties + `.glass-card`, `.text-gradient`, `.bg-gradient-primary`. No inline styles for these.
- **Animations:** Framer Motion for components. Lottie JSON for mascot.
- **TypeScript:** Strict mode. Small files (200–500 lines typical, 800 max). Extract utilities.
- **Vietnamese context:** All UI, canned responses, and financial logic use VND, Vietnamese financial terminology (SJC gold, VN-Index, USD/VND, Sacombank/Eximbank rates).

## Testing

- **Vitest:** 57 tests across 10 files, 70% line coverage enforced
- **Playwright E2E:** Landing, onboarding, budget (15 scenarios)
- **CI:** GitHub Actions `e2e.yml` runs on every push/PR

```bash
npm test            # Vitest watch mode
npm run test:run    # CI single run
npm run test:e2e    # All E2E specs
```

## Known Limitations

| Issue | Workaround |
|---|---|
| Market crawler depends on CafeF DOM structure | Check selector strings in `crawler.ts` first |
| TCBS API fragility | VN30 mock data fallback in stock screener |
| localStorage → Supabase migration is one-way | Data added post-migration stays in localStorage only |
| Gemini mock returns hardcoded responses without `GEMINI_API_KEY` | Do not use mock for real conversations |
| Vercel Hobby cron limit (1/day, 10s) | Use GitHub Actions `vercel-deploy.yml` with CLI token for bypass |

## Handoff Notes (2026-04-14)

### Priority UI/UX Fix (Landing Page)
- Route: `/` (`src/app/page.tsx`)
- Current issue: nhiều section đang tràn bố cục (overflow/căng full-width) và mật độ nội dung chưa cân đối theo từng section.
- Yêu cầu cho Claude/team UI:
  - Chuẩn hoá khung section theo cùng một layout container (`max-width`, `padding-x`, `gap`) để không bị lệch/đè trên desktop và mobile.
  - Kiểm tra và xử lý `overflow-x` toàn trang (đặc biệt các khối animation, mascot, gradient/orb tuyệt đối vị trí).
  - Thiết kế lại “content budget” cho từng section: mỗi section chỉ giữ số lượng yếu tố vừa đủ (headline, supporting text, 1 visual block, 1 CTA rõ ràng), tránh dồn quá nhiều card/chi tiết.
  - Đảm bảo Hero, Features, HowItWorks, Vet, Stats, FAQ có nhịp dọc nhất quán và không bị kéo dài bất thường.
  - Re-check responsive ở các breakpoint chính: 360px, 390px, 768px, 1024px, 1280px.

### Build Status
- `npm run build` đã pass (2026-04-14) sau khi fix typing ở:
  - `playwright.config.ts`
  - `src/components/vet-vang/AnimatedParrot.tsx`
  - `src/components/vet-vang/VetVangChat.tsx`
- Vẫn còn cảnh báo runtime Recharts trong quá trình build prerender (`width(-1)/height(-1)`), cần rà soát các `ResponsiveContainer` có thể mount khi parent chưa có kích thước.

### TODO/FIXME còn trong source code
- Không còn TODO/FIXME/HACK/TBD trong `src/`, `tests/`, `playwright.config.ts`, `next.config.ts` (đã rà soát bằng `rg` ngày 2026-04-14).

## Deployment

- **Platform:** Vercel (Hobby + Hobby Plus)
- **CI/CD:** GitHub Actions (`vercel-deploy.yml`) — uses Vercel CLI with token to bypass Hobby daily deploy limit
- **Auto-deploy:** On push to `master` and manual `workflow_dispatch`
- **Required secrets:** `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`

## Key Files

```
src/
├── app/
│   ├── dashboard/            # All dashboard pages
│   ├── api/                 # All API routes (Edge Runtime)
│   ├── login/              # Auth page
│   └── page.tsx            # Landing page
├── components/
│   ├── vet-vang/           # Mascot: VetVangChat, VetVangFloat, AnimatedParrot
│   ├── gamification/        # Badges, XPToast, Celebration, ShareCard, RequireTier
│   ├── debt/               # DTI gauge, optimizer timeline
│   ├── portfolio/          # GoldTracker, CashflowDNA
│   └── onboarding/         # QuickSetupWizard
└── lib/
    ├── calculations/        # Pure TS calculators (debt-optimizer, fg-index, personal-cpi, risk-scoring)
    ├── supabase/           # Auth, user-data DAL, hooks, migrate-local
    ├── market-data/        # Crawlers (CafeF, Yahoo, SBV, TCBS, stock-screener)
    ├── news/               # CafeF RSS news crawler
    ├── gemini.ts           # Streaming AI (Edge Runtime)
    ├── gemini-batch.ts     # Batch AI (50% cost)
    ├── expense-parser.ts   # Regex → structured expense
    ├── scripted-responses.ts # 500+ canned responses (25 intents)
    ├── storage.ts          # 18-key localStorage wrapper
    ├── gamification.ts     # XP, badges, levels
    ├── rbac.ts            # XP-threshold gates + promo code
    ├── guru-personas.ts    # 5 AI mentor prompts (Livermore, Minervini, O'Neil, Darvas, Weinstein)
    └── vetvang-persona.ts # Vẹt Vàng system prompt
```
