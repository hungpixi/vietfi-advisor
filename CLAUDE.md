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
npm run dev        # Start dev server → http://localhost:3000
npm run build      # Production build
npm run lint       # ESLint (eslint.config.mjs, ESLint 9)
npm test           # Vitest (watch mode)
npm run test:run   # Vitest (single run, CI)
npm run test:e2e           # Playwright E2E — all specs
npm run test:e2e:ui        # Playwright with UI mode
npm run test:e2e:headed    # Playwright headed (visible browser)
npm run test:e2e:debug     # Playwright debug mode
```

**Required env vars** (see `.env.example`):
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

### Data Persistence

- **Guest users**: localStorage via `src/lib/storage.ts` — typed wrapper for all 18 keys, server-safe (no-ops on server)
- **Logged-in users**: Supabase PostgreSQL via `src/lib/supabase/user-data.ts` — hybrid DAL that falls back to localStorage when unauthenticated
- Migration path: `src/lib/supabase/migrate-local.ts` — one-time push of localStorage data to Supabase, sets `vietfi_migrated` flag
- React hooks: `src/lib/supabase/useUserData.ts` — `useUserBudget`, `useUserDebts`, `useUserGamification`

### Dashboard Layout (`src/app/dashboard/`)

All dashboard pages share `dashboard/layout.tsx` which mounts: sidebar navigation, `GamificationBar`, and `VetVangFloat` mascot. New dashboard pages go here and are auto-discovered by the sidebar.

**Existing pages**: budget, debt, housing, leaderboard, learn, macro, market, news, personal-cpi, portfolio, risk-profile, screener, sentiment

### Calculation Engines (`src/lib/calculations/`)

Pure TypeScript, no AI calls:

| File | Purpose |
|------|---------|
| `debt-optimizer.ts` | DTI + Snowball/Avalanche month-by-month simulation |
| `fg-index.ts` | Fear & Greed Index for VN market (5 weighted indicators) |
| `personal-cpi.ts` | Personal inflation vs official CPI (7 GSO categories) |
| `risk-scoring.ts` | 5 prospect theory questions → risk profile + allocation |

---

## Code Style

- **Path alias**: `@/*` maps to `./src/*` (tsconfig.json)
- **Styling**: Tailwind CSS v4 (`src/app/globals.css`). CSS custom properties + `.glass-card`, `.text-gradient`, `.bg-gradient-primary` utility classes. Do not use inline styles for these.
- **Animations**: Framer Motion for component animations. Lottie JSON parts for the mascot in `public/animations/`.
- **TypeScript**: Strict mode. Small, focused files (200–500 lines typical). Extract utilities rather than adding to large modules.
- **Vietnamese context**: All UI text, canned responses, and financial logic must use Vietnamese currency (VND), Vietnamese financial terminology, and VN-specific financial context (SJC gold, VN-Index, USD/VND, Sacombank Eximbank rates).
