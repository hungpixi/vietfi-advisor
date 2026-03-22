# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VietFi Advisor is an AI-powered personal finance app for Vietnamese users, featuring Vẹt Vàng (Golden Parrot) AI — a sarcastic Duolingo-style mascot. Built with Next.js 16 + React 19, deployed on Vercel.

No existing CLAUDE.md, `.cursorrules`, or Copilot instructions found.

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
npm test        # Vitest unit tests (36 tests passing)
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

### API Routes

- **`POST /api/chat`** — Edge Runtime. Custom Data Stream Protocol for Gemini streaming. Requires `GEMINI_API_KEY`.
- **`POST /api/tts`** — Node.js Runtime. Edge TTS (Microsoft, free Vietnamese voice `vi-VN-HoaiMyNeural`). Returns audio blob.
- **`GET /api/market-data`** — Node.js Runtime. Returns live `MarketSnapshot`: VN-Index (cafef), Gold SJC (Yahoo Finance USD/oz → VND/tael), USD/VND (SBV homepage with open.er-api.com fallback). Auto-refreshes every 5 minutes.
- **`POST /api/cron/market-data`** — Node.js Runtime. CRON_SECRET Bearer auth. Same data as `/api/market-data` for Vercel cron scheduling.
- **`GET /api/market`** — *(deprecated alias, points to `/api/market-data`)*

### Data Persistence

- **Current**: localStorage only (budget pots, expenses, debts, gamification, onboarding state)
- **Planned**: Supabase PostgreSQL (tables + RLS defined, not wired up yet)
- `src/lib/supabase.ts` — Supabase clients (browser singleton + server client). Do not import server client in client components.

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

---

## Code Style

- **Path alias**: `@/*` maps to `./src/*` (tsconfig.json)
- **Styling**: Tailwind CSS v4 (`src/app/globals.css`). CSS custom properties + `.glass-card`, `.text-gradient`, `.bg-gradient-primary` utility classes are defined there. Do not use inline styles for these.
- **Animations**: Framer Motion for component animations. Lottie JSON parts for the mascot in `public/animations/`.
- **TypeScript**: Strict mode. Small, focused files (200–500 lines typical). Extract utilities rather than adding to large modules.
- **Vietnamese context**: All UI text, canned responses, and financial logic must use Vietnamese currency (VND), Vietnamese financial terminology, and VN-specific financial context (SJC gold, VN-Index, USD/VND, Sacombank Eximbank rates).

---

## Pending Work (by priority)

1. **Supabase migration** — wire up `src/lib/supabase.ts` to replace localStorage across all modules.
2. **PWA** — service worker + offline support.
3. **Playwright E2E tests** — vitest covers unit tests; playwright needed for critical user flows.
