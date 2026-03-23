# VietFi Advisor — Full Optimization Sprint Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce technical debt across 4 sprints: typed storage wrapper, hybrid DAL completion, dashboard extraction, and quality polish.

**Architecture:** A typed `storage.ts` wrapper centralizes all 18 localStorage keys behind explicit named accessors. Sprint 2 builds a hybrid Supabase DAL on top. Sprint 3 extracts dashboard sub-components. Sprint 4 removes debug logs and adds coverage.

**Tech Stack:** TypeScript (strict), Vitest, Supabase SSR, Next.js 16

**Spec:** `docs/superpowers/specs/2026-03-23-full-optimization-sprint-design.md`

---

## Implementation Order

```
Chunk 1: Sprint 1 Storage Foundation → Chunk 2: Sprint 1 Consumer Migration → Chunk 3: Sprint 2 DAL → Chunk 4: Sprint 3 Dashboard → Chunk 5: Sprint 4 Quality
```

---

## File Map (Pre-reading Required)

Before any chunk, read these files to understand existing types:

| Type | Where |
|------|-------|
| `BudgetPot`, `Expense` | `src/app/dashboard/budget/page.tsx` (lines ~14-35) |
| `DebtItem` | `src/lib/supabase/user-data.ts` line 290 |
| `GamificationState`, `DailyQuest`, `StreakFreezeState` | `src/lib/gamification.ts` lines 8-20, 164-174 |
| `OnboardingData` | `src/lib/onboarding-state.ts` line 8 |
| `RiskResult` | `src/lib/calculations/risk-scoring.ts` line 11 |
| `MarketSnapshot` | `src/lib/market-data/crawler.ts` line 51 |
| `LeaderboardOffsets` | `src/app/dashboard/leaderboard/page.tsx` line ~48 |

Also read: `src/lib/gamification.ts` (full, for validator pattern), `src/lib/onboarding-state.ts` (full, for `clearAll` pattern)

---

## Chunk 1: Sprint 1 — `src/lib/storage.ts` Foundation

**New Files:**
- `src/lib/types/budget.ts`
- `src/lib/storage.ts`

---

### Task 1: Extract budget types

**Files:**
- Create: `src/lib/types/budget.ts`
- Read: `src/app/dashboard/budget/page.tsx:14-35`

- [ ] **Step 1: Extract types from budget page**

```typescript
// src/lib/types/budget.ts

export interface BudgetPot {
  id: string
  name: string
  allocated: number
  color: string
  emoji: string
  spent: number
}

export interface Expense {
  id: string
  item: string
  amount: number
  category: string
  date: string
  note?: string
}
```

- [ ] **Step 2: Verify budget page imports these types**

Run: `grep -n "BudgetPot\|Expense" src/app/dashboard/budget/page.tsx | head -5`
Expected: Lines importing or using these types. Update imports in budget page to use `src/lib/types/budget.ts` so storage.ts can also import them.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/budget.ts
git commit -m "refactor: extract BudgetPot and Expense types to src/lib/types/budget.ts"
```

---

### Task 2: Write `src/lib/storage.ts`

**Files:**
- Create: `src/lib/storage.ts`
- Read: `src/lib/gamification.ts:74-99` (validator pattern)
- Read: `src/lib/onboarding-state.ts:29-40` (validator pattern)

- [ ] **Step 1: Write internal helpers**

```typescript
// src/lib/storage.ts

const isServer = typeof window === "undefined"

/** Parse JSON safely, return null on failure */
function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

/** Read from localStorage, parse, and validate */
function getItem<T>(key: string, fallback: T): T {
  if (isServer) return fallback
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  return safeParseJSON<T>(raw) ?? fallback
}

/** Write to localStorage */
function setItem<T>(key: string, value: T): void {
  if (isServer) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Quota exceeded or other storage error — fail silently
  }
}

/** Remove a key */
function removeItem(key: string): void {
  if (isServer) return
  localStorage.removeItem(key)
}
```

- [ ] **Step 2: Write Budget accessors**

```typescript
/* ─── Budget ─── */

export function getBudgetPots(): BudgetPot[] {
  return getItem<BudgetPot[]>("vietfi_pots", [])
}

export function setBudgetPots(pots: BudgetPot[]): void {
  setItem("vietfi_pots", pots)
}

export function getExpenses(): Expense[] {
  return getItem<Expense[]>("vietfi_expenses", [])
}

export function setExpenses(expenses: Expense[]): void {
  setItem("vietfi_expenses", expenses)
}

export function getIncome(): number {
  return getItem<number>("vietfi_income", 0)
}

export function setIncome(income: number): void {
  setItem("vietfi_income", income)
}
```

- [ ] **Step 3: Write Debt accessors**

```typescript
/* ─── Debts ─── */
import type { DebtItem } from "@/lib/supabase/user-data"

export function getDebts(): DebtItem[] {
  return getItem<DebtItem[]>("vietfi_debts", [])
}

export function setDebts(debts: DebtItem[]): void {
  setItem("vietfi_debts", debts)
}
```

- [ ] **Step 4: Write Gamification accessors**

```typescript
/* ─── Gamification ─── */
import type { GamificationState } from "@/lib/gamification"

export function getGamificationState(): GamificationState | null {
  return getItem<GamificationState | null>("vietfi_gamification", null)
}

export function setGamificationState(state: GamificationState): void {
  setItem("vietfi_gamification", state)
}
```

- [ ] **Step 5: Write Onboarding accessors**

```typescript
/* ─── Onboarding ─── */
import type { OnboardingData } from "@/lib/onboarding-state"

export function getOnboardingState(): OnboardingData | null {
  return getItem<OnboardingData | null>("vietfi_onboarding", null)
}

export function setOnboardingState(state: OnboardingData): void {
  setItem("vietfi_onboarding", state)
}

export function clearOnboardingState(): void {
  removeItem("vietfi_onboarding")
}

/** Clear all user data keys — used by reset/logout flows */
export function clearAllUserData(): void {
  const keys = [
    "vietfi_pots",
    "vietfi_expenses",
    "vietfi_income",
    "vietfi_debts",
    "vietfi_gamification",
    "vietfi_onboarding",
    "vietfi_lessons_done",
    "vietfi_streak_freeze",
    "vietfi_risk_result",
    "vietfi_news_bookmarks",
  ]
  keys.forEach(removeItem)
}
```

- [ ] **Step 6: Write Market cache accessors**

```typescript
/* ─── Market cache ─── */
import type { MarketSnapshot } from "@/lib/market-data/crawler"

export function getMarketCache(): MarketSnapshot | null {
  return getItem<MarketSnapshot | null>("vietfi_market_cache", null)
}

export function setMarketCache(snapshot: MarketSnapshot): void {
  setItem("vietfi_market_cache", snapshot)
}

/* ─── Market alert cache ─── */
export function getMarketAlertCache(): Record<string, unknown> {
  return getItem<Record<string, unknown>>("vietfi_market_alert_cache", {})
}

export function setMarketAlertCache(cache: Record<string, unknown>): void {
  setItem("vietfi_market_alert_cache", cache)
}
```

- [ ] **Step 7: Write Misc accessors**

```typescript
/* ─── Misc ─── */

export function getSoundMuted(): boolean {
  // Stored as "1" or null — normalize to boolean
  if (isServer) return false
  return localStorage.getItem("vietfi_sound_muted") === "1"
}

export function setSoundMuted(muted: boolean): void {
  setItem("vietfi_sound_muted", muted ? "1" : "0")
}

export function getNotifDismissed(): boolean {
  return getItem<boolean>("vietfi_notif_dismissed", false)
}

export function setNotifDismissed(dismissed: boolean): void {
  setItem("vietfi_notif_dismissed", dismissed)
}

export function getLessonsDone(): string[] {
  return getItem<string[]>("vietfi_lessons_done", [])
}

export function setLessonsDone(lessons: string[]): void {
  setItem("vietfi_lessons_done", lessons)
}

export function getRiskResult(): import("@/lib/calculations/risk-scoring").RiskResult | null {
  return getItem<import("@/lib/calculations/risk-scoring").RiskResult | null>("vietfi_risk_result", null)
}

export function setRiskResult(result: import("@/lib/calculations/risk-scoring").RiskResult): void {
  setItem("vietfi_risk_result", result)
}

export function getStreakFreeze(): import("@/lib/gamification").StreakFreezeState | null {
  return getItem<import("@/lib/gamification").StreakFreezeState | null>("vietfi_streak_freeze", null)
}

export function setStreakFreeze(state: import("@/lib/gamification").StreakFreezeState): void {
  setItem("vietfi_streak_freeze", state)
}

export function getLeaderboardOffsets(): Record<string, number> {
  return getItem<Record<string, number>>("vietfi_leaderboard_offsets", {})
}

export function setLeaderboardOffsets(offsets: Record<string, number>): void {
  setItem("vietfi_leaderboard_offsets", offsets)
}

export function getNewsBookmarks(): Set<string> {
  const arr = getItem<string[]>("vietfi_news_bookmarks", [])
  return new Set(arr)
}

export function setNewsBookmarks(bookmarks: Set<string>): void {
  setItem("vietfi_news_bookmarks", Array.from(bookmarks))
}
```

- [ ] **Step 8: Verify TypeScript compiles**

Run: `cd /d/vietfi-advisor && npx tsc --noEmit`
Expected: No errors from `src/lib/storage.ts`. Errors in other files are OK at this stage — they will be fixed in Chunk 2.

- [ ] **Step 9: Commit**

```bash
git add src/lib/storage.ts src/lib/types/budget.ts
git commit -m "feat(storage): add typed storage wrapper with 18 localStorage accessors"
```

---

## Chunk 2: Sprint 1 — Migrate Consumer Files to `storage.ts`

**Prerequisite:** Chunk 1 must be committed.

**Files modified:** 16 consumer files + `migrate-local.ts` (17 total). Note: `migrate-local.ts` is also modified in Sprint 4 (console.log removal) — do not skip Sprint 4 for this file.

---

**Priority order for migration:**

1. `src/lib/gamification.ts` — 3 calls, used everywhere
2. `src/lib/onboarding-state.ts` — 8 calls
3. `src/lib/market-alert.ts` — 2 calls
4. `src/lib/sounds.ts` — 2 calls
5. `src/app/dashboard/layout.tsx` — 5 calls
6. `src/components/onboarding/QuickSetupWizard.tsx` — 5 calls
7. `src/components/gamification/WeeklyReport.tsx` — 4 calls
8. `src/app/dashboard/budget/page.tsx` — 6 calls
9. `src/app/dashboard/debt/page.tsx` — 3 calls
10. `src/app/dashboard/page.tsx` — 6 calls
11. `src/app/dashboard/portfolio/page.tsx` — 4 calls
12. `src/app/dashboard/learn/page.tsx` — 3 calls
13. `src/app/dashboard/news/page.tsx` — 2 calls
14. `src/app/dashboard/leaderboard/page.tsx` — 4 calls
15. `src/app/dashboard/personal-cpi/page.tsx` — 2 calls
16. `src/components/vet-vang/VetVangChat.tsx` — 6 calls
17. `src/lib/supabase/migrate-local.ts` — 9 calls

**Migration pattern for each file:**

```
OLD:  localStorage.getItem("vietfi_X") + JSON.parse → storage.getX()
OLD:  localStorage.setItem("vietfi_X", JSON.stringify(v)) → storage.setX(v)
OLD:  localStorage.removeItem("vietfi_X") → storage.removeX()  (if exists) or removeItem()
```

**For each file, repeat:**

- [ ] **Read the file** — identify all localStorage calls
- [ ] **Add import** — `import { getX, setX } from "@/lib/storage"` (group with existing imports)
- [ ] **Replace each call** — `localStorage.getItem("vietfi_X")` → `getX()`, `localStorage.setItem(...)` → `setX(...)`
- [ ] **Run type check** — `npx tsc --noEmit` — fix any type errors before moving on
- [ ] **Run tests** — `npm test` — all tests must pass
- [ ] **Commit after each file** — `git commit -m "refactor(<file>): migrate to storage.ts wrappers"`

**Important notes per file:**

- **`gamification.ts`**: Keep the existing `getGamification()` and `setGamificationState()` in that file as-is for now. They use raw localStorage internally. Update the internal calls to use `getItem`/`setItem` from `storage.ts`. The public API of `gamification.ts` stays unchanged.
- **`onboarding-state.ts`**: `resetOnboarding()` currently calls `localStorage.removeItem()` per key. Replace with `clearAllUserData()` from `storage.ts`.
- **`market-alert.ts`**: Replace `localStorage.getItem/setItem("vietfi_market_alert_cache", ...)` with `getMarketAlertCache()` / `setMarketAlertCache()`.
- **`sounds.ts`**: `getSoundMuted()` stores "1"/null. `storage.getSoundMuted()` normalizes to boolean. Ensure `setSoundMuted` is called with boolean.
- **`migrate-local.ts`**: Most complex — 9 raw calls. Replace each:
  - `localStorage.getItem("vietfi_pots")` → `getBudgetPots()`
  - `localStorage.setItem("vietfi_pots", ...)` → `setBudgetPots(...)`
  - `localStorage.getItem("vietfi_expenses")` → `getExpenses()`
  - `localStorage.setItem("vietfi_expenses", ...)` → `setExpenses(...)`
  - `localStorage.getItem("vietfi_income")` → `getIncome()`
  - `localStorage.setItem("vietfi_income", ...)` → `setIncome(...)`
  - `localStorage.getItem("vietfi_debts")` → `getDebts()`
  - `localStorage.setItem("vietfi_debts", ...)` → `setDebts(...)`
  - `localStorage.getItem("vietfi_onboarding")` → `getOnboardingState()`
  - `localStorage.getItem("vietfi_gamification")` → `getGamificationState()`
  - `localStorage.setItem("vietfi_gamification", ...)` → `setGamificationState(...)`
  - `localStorage.getItem("vietfi_lessons_done")` → `getLessonsDone()`
  - `localStorage.getItem("vietfi_streak_freeze")` → `getStreakFreeze()`
  - `localStorage.setItem("vietfi_migrated", ...)` → `setItem("vietfi_migrated", ...)` (keep raw, this key is migration-internal)
  - `localStorage.getItem("vietfi_migrated")` → `getItem<string>("vietfi_migrated", "")` (keep using storage internal helper)

After all files migrated:

- [ ] **Run full type check**

Run: `cd /d/vietfi-advisor && npx tsc --noEmit`
Expected: No errors.

- [ ] **Run all tests**

Run: `npm test`
Expected: All tests pass.

---

## Chunk 3: Sprint 2 — DAL Hybrid Completion

**Prerequisite:** Chunks 1 + 2 committed.

**Files:**
- Modify: `src/lib/supabase/user-data.ts`
- Create: `src/lib/supabase/useUserData.ts`

---

### Task 3: Extend `user-data.ts` with typed CRUD

**Files:**
- Modify: `src/lib/supabase/user-data.ts`
- Read: `src/lib/supabase/user-data.ts` (full, understand existing structure)

- [ ] **Step 1: Read existing user-data.ts to understand current structure**

Focus on: how auth is checked, how localStorage is currently used as fallback, what Supabase tables exist.

- [ ] **Step 2: Add `BudgetData` interface**

```typescript
// src/lib/supabase/user-data.ts

// Combined budget domain — aggregates pots, expenses, and income
export interface BudgetData {
  pots: BudgetPot[]
  expenses: Expense[]
  income: number
}
```

Add this near the top of the file after existing type definitions.

- [ ] **Step 3: Add typed `getBudget` and `setBudget`**

```typescript
// src/lib/supabase/user-data.ts

/**
 * Get combined budget data.
 * If user is logged in → read from Supabase.
 * If not logged in → read from localStorage via storage.ts.
 */
export async function getBudget(): Promise<BudgetData> {
  const { getSupabaseUser } = await import("@/lib/supabase/client")
  const user = getSupabaseUser()

  if (user) {
    // TODO: Read from Supabase budget table (wire up when Supabase schema is ready)
    // Fallthrough to localStorage for now
  }

  // Guest: use storage.ts
  const { getBudgetPots, getExpenses, getIncome } = await import("@/lib/storage")
  return {
    pots: getBudgetPots(),
    expenses: getExpenses(),
    income: getIncome(),
  }
}

/**
 * Save combined budget data.
 * If user is logged in → write to Supabase.
 * If not → write to localStorage.
 */
export async function setBudget(data: BudgetData): Promise<void> {
  const { getSupabaseUser } = await import("@/lib/supabase/client")
  const user = getSupabaseUser()

  if (user) {
    // TODO: Write to Supabase budget table (wire up when Supabase schema is ready)
    // Fallthrough to localStorage for now
  }

  // Always write to localStorage as fallback / for guests
  const { setBudgetPots, setExpenses, setIncome } = await import("@/lib/storage")
  setBudgetPots(data.pots)
  setExpenses(data.expenses)
  setIncome(data.income)
}
```

- [ ] **Step 4: Add typed `getDebts` and `setDebts`**

```typescript
// Add to src/lib/supabase/user-data.ts

export async function getDebts(): Promise<DebtItem[]> {
  const { getSupabaseUser } = await import("@/lib/supabase/client")
  const user = getSupabaseUser()

  if (user) {
    // TODO: Read from Supabase debts table
  }

  const { getDebts } = await import("@/lib/storage")
  return getDebts()
}

export async function setDebts(debts: DebtItem[]): Promise<void> {
  const { getSupabaseUser } = await import("@/lib/supabase/client")
  const user = getSupabaseUser()

  if (user) {
    // TODO: Write to Supabase debts table
  }

  const { setDebts } = await import("@/lib/storage")
  setDebts(debts)
}
```

- [ ] **Step 5: Add typed `getGamification` and `setGamification`**

```typescript
// Add to src/lib/supabase/user-data.ts

export async function getGamificationData(): Promise<GamificationState | null> {
  const { getSupabaseUser } = await import("@/lib/supabase/client")
  const user = getSupabaseUser()

  if (user) {
    // TODO: Read from Supabase gamification table
  }

  const { getGamificationState } = await import("@/lib/storage")
  return getGamificationState()
}

export async function setGamificationData(state: GamificationState): Promise<void> {
  const { getSupabaseUser } = await import("@/lib/supabase/client")
  const user = getSupabaseUser()

  if (user) {
    // TODO: Write to Supabase gamification table
  }

  const { setGamificationState } = await import("@/lib/storage")
  setGamificationState(state)
}
```

- [ ] **Step 6: Add `getLessonsDone` and `setLessonsDone`**

```typescript
// Add to src/lib/supabase/user-data.ts

export async function getLessonsDoneData(): Promise<string[]> {
  const { getLessonsDone } = await import("@/lib/storage")
  return getLessonsDone()
}

export async function setLessonsDoneData(lessons: string[]): Promise<void> {
  const { setLessonsDone } = await import("@/lib/storage")
  setLessonsDone(lessons)
}
```

- [ ] **Step 7: Add `getRiskResult` and `setRiskResult`**

```typescript
// Add to src/lib/supabase/user-data.ts

export async function getRiskResultData(): Promise<RiskResult | null> {
  const { getRiskResult } = await import("@/lib/storage")
  return getRiskResult()
}

export async function setRiskResultData(result: RiskResult): Promise<void> {
  const { setRiskResult } = await import("@/lib/storage")
  setRiskResult(result)
}
```

- [ ] **Step 8: Type check**

Run: `npx tsc --noEmit`
Expected: No errors from `user-data.ts`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/supabase/user-data.ts
git commit -m "feat(dal): add typed CRUD per domain to user-data.ts"
```

---

### Task 4: Write `useUserData.ts` hook

**Files:**
- Create: `src/lib/supabase/useUserData.ts`
- Read: `src/lib/supabase/client.ts` (to understand auth pattern)

- [ ] **Step 1: Write the hook**

```typescript
// src/lib/supabase/useUserData.ts
"use client"

import { useState, useEffect, useCallback } from "react"
import type { BudgetData } from "@/lib/supabase/user-data"
import {
  getBudget,
  setBudget,
  getDebts,
  setDebts,
  getGamificationData,
  setGamificationData,
  getLessonsDoneData,
  setLessonsDoneData,
  getRiskResultData,
  setRiskResultData,
  type DebtItem,
  type GamificationState,
  type RiskResult,
} from "@/lib/supabase/user-data"

/* ─── Budget ─── */

export function useUserBudget(initialData?: BudgetData) {
  const [data, setData] = useState<BudgetData | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return // already loaded
    setLoading(true)
    getBudget()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false))
  }, [data])

  const save = useCallback(async (newData: BudgetData) => {
    setLoading(true)
    setError(null)
    try {
      await setBudget(newData)
      setData(newData)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, save }
}

/* ─── Debts ─── */

export function useUserDebts(initialData?: DebtItem[]) {
  const [data, setData] = useState<DebtItem[] | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return
    setLoading(true)
    getDebts()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false))
  }, [data])

  const save = useCallback(async (newData: DebtItem[]) => {
    setLoading(true)
    setError(null)
    try {
      await setDebts(newData)
      setData(newData)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, save }
}

/* ─── Gamification ─── */

export function useUserGamification(initialData?: GamificationState) {
  const [data, setData] = useState<GamificationState | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return
    setLoading(true)
    getGamificationData()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false))
  }, [data])

  const save = useCallback(async (newData: GamificationState) => {
    setLoading(true)
    setError(null)
    try {
      await setGamificationData(newData)
      setData(newData)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, save }
}

/* ─── Risk Result ─── */

export function useUserRiskResult(initialData?: RiskResult | null) {
  const [data, setData] = useState<RiskResult | null | undefined>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== undefined) return
    setLoading(true)
    getRiskResultData()
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e : new Error(String(e))))
      .finally(() => setLoading(false))
  }, [data])

  const save = useCallback(async (newData: RiskResult) => {
    setLoading(true)
    setError(null)
    try {
      await setRiskResultData(newData)
      setData(newData)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, save }
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors. If `DebtItem`, `GamificationState`, or `RiskResult` types are not exported from `user-data.ts`, add `export type { DebtItem, GamificationState, RiskResult }` to `user-data.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/useUserData.ts
git commit -m "feat(hooks): add useUserBudget, useUserDebts, useUserGamification, useUserRiskResult hooks"
```

---

## Chunk 4: Sprint 3 — Dashboard Extraction

**Prerequisite:** Chunks 1 + 2 committed (storage.ts must exist before dashboard components use it).

**Files:**
- Create: `src/app/dashboard/components/MarketSection.tsx`
- Create: `src/app/dashboard/components/DailyQuestSection.tsx`
- Create: `src/app/dashboard/components/NotificationBanner.tsx`
- Modify: `src/app/dashboard/page.tsx`

---

### Task 5: Extract `MarketSection.tsx`

**Files:**
- Create: `src/app/dashboard/components/MarketSection.tsx`
- Read: `src/app/dashboard/page.tsx:1-120` (MarketCard, FGGauge data)
- Read: `src/app/dashboard/page.tsx:659-693` (fetchMarketData)
- Read: `src/app/dashboard/page.tsx:739-761` (notification threshold)
- Read: `src/lib/storage.ts` (for getMarketCache/setMarketCache)
- Read: `src/lib/market-data/crawler.ts:51` (MarketSnapshot type)

- [ ] **Step 1: Write `MarketSection.tsx`**

```typescript
// src/app/dashboard/components/MarketSection.tsx
"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import {
  TrendingUp,
  TrendingDown,
  Activity,
  ArrowUpRight,
} from "lucide-react"
import type { MarketSnapshot } from "@/lib/market-data/crawler"
import {
  getMarketCache,
  setMarketCache,
} from "@/lib/storage"
import { cn } from "@/lib/utils"

const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

/* ─── Helpers ─── */

function getFgLabel(score: number) {
  if (score < 25) return "Cực kỳ sợ hãi"
  if (score < 45) return "Sợ hãi"
  if (score < 55) return "Trung lập"
  if (score < 75) return "Tham lam"
  return "Cực kỳ tham lam"
}

function getFgColor(score: number) {
  if (score < 25) return "#FF1744"
  if (score < 45) return "#FF5252"
  if (score < 55) return "#E6B84F"
  if (score < 75) return "#22C55E"
  return "#00C853"
}

function calculateFgScore(snapshot: MarketSnapshot | null) {
  if (!snapshot || !snapshot.vnIndex) return 38
  const vn = snapshot.vnIndex.changePct ?? 0
  const gold = snapshot.goldSjc?.changePct ?? 0
  return Math.round(Math.max(0, Math.min(100, 50 + vn * 1.5 - gold * 1.2)))
}

interface MarketCardData {
  label: string
  value: string
  change: number
  icon: typeof TrendingUp
}

const DEFAULT_MARKET_CARDS: MarketCardData[] = [
  { label: "VN-Index", value: "--", change: 0, icon: TrendingDown },
  { label: "Vàng SJC", value: "--", change: 0, icon: TrendingUp },
  { label: "USD/VND", value: "--", change: 0, icon: TrendingUp },
  { label: "BTC", value: "$83,450", change: -0.8, icon: TrendingDown },
]

function buildMarketCards(snapshot: MarketSnapshot | null, prev: MarketSnapshot | null): MarketCardData[] {
  if (!snapshot) return DEFAULT_MARKET_CARDS

  const vnIdx = snapshot.vnIndex
  const gold = snapshot.goldSjc
  const fx = snapshot.usdVnd
  const usdChange = fx && prev?.usdVnd
    ? Number(((fx.rate - prev.usdVnd.rate) / prev.usdVnd.rate * 100).toFixed(2))
    : 0

  return [
    {
      label: "VN-Index",
      value: vnIdx ? vnIdx.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--",
      change: vnIdx?.changePct ?? 0,
      icon: (vnIdx?.changePct ?? 0) >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "Vàng SJC",
      value: gold ? `${(gold.goldVnd / 1_000_000).toFixed(1)}tr` : "--",
      change: gold?.changePct ?? 0,
      icon: (gold?.changePct ?? 0) >= 0 ? TrendingUp : TrendingDown,
    },
    {
      label: "USD/VND",
      value: fx ? fx.rate.toLocaleString("vi-VN") : "--",
      change: usdChange,
      icon: fx ? (usdChange >= 0 ? TrendingUp : TrendingDown) : TrendingDown,
    },
    {
      label: "BTC",
      value: snapshot.btc
        ? `$${snapshot.btc.priceUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : "--",
      change: snapshot.btc ? snapshot.btc.changePct24h : 0,
      icon: snapshot.btc ? (snapshot.btc.changePct24h >= 0 ? TrendingUp : TrendingDown) : TrendingDown,
    },
  ]
}

/* ─── Components ─── */

function MarketCard({ label, value, change, icon: Icon }: MarketCardData) {
  const positive = change >= 0
  return (
    <motion.div
      variants={fadeIn}
      className="glass-card glass-card-hover p-4 transition-all cursor-default"
      data-testid="market-card"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-mono uppercase tracking-wider text-white/30">{label}</span>
        <Icon className={cn("w-3.5 h-3.5", positive ? "text-[#22C55E]" : "text-[#EF4444]")} />
      </div>
      <div className="text-xl font-bold text-white tracking-tight">{value}</div>
      <span className={cn("text-xs font-medium", positive ? "text-[#22C55E]" : "text-[#EF4444]")}>
        {positive ? "+" : ""}{change}%
      </span>
    </motion.div>
  )
}

function MarketSkeletonCard() {
  return (
    <div data-testid="market-skeleton" className="glass-card p-4 animate-pulse">
      <div className="h-4 bg-white/[0.1] rounded mb-3" />
      <div className="h-8 bg-white/[0.1] rounded mb-2" />
      <div className="h-3 bg-white/[0.1] rounded w-3/4" />
    </div>
  )
}

function FGGauge({ score }: { score: number }) {
  const fgLabel = getFgLabel(score)
  const fgColor = getFgColor(score)
  const angle = -90 + (score / 100) * 180

  return (
    <motion.div variants={fadeIn} className="glass-card p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4" style={{ color: fgColor }} />
          <h3 className="text-sm font-semibold text-white">Nhiệt kế thị trường</h3>
        </div>
        <Link
          href="/dashboard/sentiment"
          className="text-[10px] text-[#E6B84F] hover:underline flex items-center gap-0.5 font-mono uppercase tracking-wider"
        >
          Chi tiết <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
      <div className="flex items-center justify-center py-2">
        <div className="relative w-44 h-24">
          <svg viewBox="0 0 200 110" className="w-full h-full">
            <defs>
              <linearGradient id="gaugeG" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#FF1744" />
                <stop offset="25%" stopColor="#FF5252" />
                <stop offset="50%" stopColor="#E6B84F" />
                <stop offset="75%" stopColor="#22C55E" />
                <stop offset="100%" stopColor="#00C853" />
              </linearGradient>
            </defs>
            <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="url(#gaugeG)" strokeWidth="6" strokeLinecap="round" opacity="0.2" />
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#gaugeG)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(score / 100) * 251} 251`}
            />
            <line
              x1="100" y1="100"
              x2={100 + 55 * Math.cos((angle * Math.PI) / 180)}
              y2={100 + 55 * Math.sin((angle * Math.PI) / 180)}
              stroke={fgColor} strokeWidth="2.5" strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="4" fill={fgColor} />
          </svg>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
            <div className="text-3xl font-black" style={{ color: fgColor }}>{score}</div>
          </div>
        </div>
      </div>
      <div className="text-center mt-1">
        <span
          className="text-xs font-semibold px-3 py-1 rounded-full"
          style={{ color: fgColor, backgroundColor: `${fgColor}12` }}
        >
          {fgLabel}
        </span>
      </div>
    </motion.div>
  )
}

/* ─── Market Section (orchestrator) ─── */

interface MarketSectionProps {
  onError?: (error: string) => void
}

export function MarketSection({ onError }: MarketSectionProps) {
  const [snapshot, setSnapshot] = useState<MarketSnapshot | null>(null)
  const [prevSnapshot, setPrevSnapshot] = useState<MarketSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMarketData = useCallback(async (isRetry = false) => {
    setLoading(true)
    setError(null)
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 8000)
      const resp = await fetch("/api/market-data", { signal: controller.signal })
      clearTimeout(timeout)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      const data: MarketSnapshot = await resp.json()
      setSnapshot(prev => {
        setPrevSnapshot(prev)
        return data
      })
      setMarketCache(data)
    } catch (err: unknown) {
      // Try localStorage fallback
      const cached = getMarketCache()
      if (cached) setSnapshot(prev => prev || cached)
      const msg = err instanceof Error ? err.message : "Lỗi không xác định"
      setError(msg)
      onError?.(msg)
      if (!isRetry) setTimeout(() => fetchMarketData(true), 30000)
    } finally {
      setLoading(false)
    }
  }, [onError])

  // Mount: fetch once
  useEffect(() => { fetchMarketData() }, [fetchMarketData])

  // Auto-refresh every 5 min
  useEffect(() => {
    if (!snapshot) return
    const timer = setInterval(fetchMarketData, 5 * 60 * 1000)
    return () => clearInterval(timer)
  }, [!!snapshot, fetchMarketData])

  // Market volatility notification check
  useEffect(() => {
    if (!snapshot || typeof window === "undefined") return
    if (Notification.permission !== "granted") return
    const today = new Date().toDateString()
    const alertedKey = `vietfi_alerted_${today}`
    if (sessionStorage.getItem(alertedKey)) return

    const alerts: string[] = []
    const vnPct = snapshot.vnIndex?.changePct ?? 0
    const goldPct = snapshot.goldSjc?.changePct ?? 0
    if (Math.abs(vnPct) >= 2) alerts.push(`VN-Index ${vnPct > 0 ? "+" : ""}${vnPct.toFixed(1)}%`)
    if (Math.abs(goldPct) >= 3) alerts.push(`Vàng ${goldPct > 0 ? "+" : ""}${goldPct.toFixed(1)}%`)

    if (alerts.length > 0) {
      sessionStorage.setItem(alertedKey, "1")
      new Notification("⚠️ VietFi — Biến động mạnh!", {
        body: alerts.join(" | ") + "\nMở dashboard để xem chi tiết.",
        icon: "/assets/icon-192.png",
        tag: "market-volatility",
      })
    }
  }, [snapshot])

  const cards = useMemo(() => buildMarketCards(snapshot, prevSnapshot), [snapshot, prevSnapshot])
  const fgScore = useMemo(() => calculateFgScore(snapshot), [snapshot])

  return (
    <motion.div variants={stagger}>
      {error && (
        <div className="glass-card p-3 mb-4 text-sm text-red-300">
          Lỗi lấy dữ liệu thị trường: {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {Array.from({ length: 4 }).map((_, idx) => <MarketSkeletonCard key={idx} />)}
        </div>
      ) : (
        <motion.div variants={stagger} className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {cards.map(card => <MarketCard key={card.label} {...card} />)}
        </motion.div>
      )}

      <FGGauge score={fgScore} />
    </motion.div>
  )
}

export { MarketCard, MarketSkeletonCard, FGGauge }
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors in `MarketSection.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/components/MarketSection.tsx
git commit -m "refactor(dashboard): extract MarketSection to standalone component"
```

---

### Task 6: Extract `DailyQuestSection.tsx`

**Files:**
- Create: `src/app/dashboard/components/DailyQuestSection.tsx`
- Read: `src/app/dashboard/page.tsx:440-565` (DailyQuestCard)
- Read: `src/lib/gamification.ts` (getDailyQuests)
- Read: `src/components/gamification/Celebration.tsx` (ConfettiCannon, QuestCompleteToast)

- [ ] **Step 1: Write `DailyQuestSection.tsx`**

```typescript
// src/app/dashboard/components/DailyQuestSection.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { getDailyQuests } from "@/lib/gamification"
import type { DailyQuest } from "@/lib/gamification"
import { ConfettiCannon, QuestCompleteToast } from "@/components/gamification/Celebration"
import { cn } from "@/lib/utils"

interface DailyQuestSectionProps {
  className?: string
}

export function DailyQuestSection({ className }: DailyQuestSectionProps) {
  const [quests, setQuests] = useState<DailyQuest[]>([])
  const prevDoneRef = useRef(0)
  const questsRef = useRef<DailyQuest[]>([])
  const [showConfetti, setShowConfetti] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [toastQuest, setToastQuest] = useState({ name: "", xp: 0 })

  useEffect(() => {
    const check = () => {
      const q = getDailyQuests()
      const nowDone = q.filter(x => x.completed).length
      const prev = prevDoneRef.current

      if (nowDone > prev && prev > 0) {
        const justDone = q.find(x => x.completed && !questsRef.current.find(old => old.id === x.id && old.completed))
        if (justDone) {
          setToastQuest({ name: justDone.title, xp: justDone.xp })
          setShowToast(true)
          setTimeout(() => setShowToast(false), 2500)
        }
      }
      if (nowDone === q.length && nowDone > 0 && prev < q.length) {
        setShowConfetti(true)
      }
      prevDoneRef.current = nowDone
      questsRef.current = q
      setQuests(q)
    }
    check()
    const t = setInterval(check, 2000)
    return () => clearInterval(t)
  }, [])

  const completedCount = quests.filter(q => q.completed).length
  const allDone = completedCount === quests.length && quests.length > 0
  const progress = quests.length > 0 ? (completedCount / quests.length) * 100 : 0

  const questLinks: Record<string, string> = {
    log_expense: "/dashboard/budget",
    check_market: "/dashboard/sentiment",
    setup_budget: "/dashboard/budget",
    read_knowledge: "/dashboard/macro",
  }

  return (
    <>
      <ConfettiCannon active={showConfetti} onDone={() => setShowConfetti(false)} />
      <QuestCompleteToast show={showToast} questName={toastQuest.name} xp={toastQuest.xp} />

      <motion.div
        variants={{
          hidden: { opacity: 0, y: 8 },
          visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
        }}
        className={cn(
          "glass-card p-4 mb-4 transition-all duration-500",
          allDone && "border-[#22C55E]/20 shadow-[0_0_20px_rgba(34,197,94,0.08)]",
          className
        )}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">{allDone ? "🎉" : "🎯"}</span>
            <h3 className="text-xs font-semibold text-white">Nhiệm vụ hôm nay</h3>
            <div className="relative w-5 h-5">
              <svg viewBox="0 0 20 20" className="w-5 h-5 -rotate-90">
                <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                <circle
                  cx="10" cy="10" r="8" fill="none"
                  stroke={allDone ? "#22C55E" : "#E6B84F"}
                  strokeWidth="2"
                  strokeDasharray={`${progress * 0.502} 50.2`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/40">
                {completedCount}/{quests.length}
              </span>
            </div>
          </div>
          {allDone && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-[10px] px-2 py-0.5 bg-[#22C55E]/10 text-[#22C55E] rounded-full font-bold"
            >
              ✅ Xuất sắc!
            </motion.span>
          )}
        </div>
        <div className="space-y-1.5">
          {quests.map(q => (
            <Link
              key={q.id}
              href={questLinks[q.actionKey] || "/dashboard"}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                q.completed
                  ? "bg-[#22C55E]/5 border border-[#22C55E]/10"
                  : "bg-white/[0.02] border border-white/[0.04] hover:border-[#E6B84F]/20 hover:bg-[#E6B84F]/[0.02]"
              )}
            >
              <motion.span
                animate={q.completed ? { scale: [1, 1.3, 1] } : {}}
                transition={{ duration: 0.3 }}
              >
                {q.completed ? "✅" : q.icon}
              </motion.span>
              <div className="flex-1">
                <span className={cn(
                  "text-xs font-medium",
                  q.completed ? "text-[#22C55E]/60 line-through" : "text-white/70"
                )}>
                  {q.title}
                </span>
                <p className="text-[10px] text-white/20">{q.description}</p>
              </div>
              <span className={cn(
                "text-[10px] font-mono font-bold",
                q.completed ? "text-[#22C55E]/40" : "text-[#E6B84F]"
              )}>
                +{q.xp} XP
              </span>
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/components/DailyQuestSection.tsx
git commit -m "refactor(dashboard): extract DailyQuestSection to standalone component"
```

---

### Task 7: Extract `NotificationBanner.tsx`

**Files:**
- Create: `src/app/dashboard/components/NotificationBanner.tsx`
- Read: `src/app/dashboard/page.tsx:841-861` (notification banner JSX)

- [ ] **Step 1: Write `NotificationBanner.tsx`**

```typescript
// src/app/dashboard/components/NotificationBanner.tsx
"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bell, X } from "lucide-react"
import { getNotifDismissed, setNotifDismissed } from "@/lib/storage"

export function NotificationBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if ("Notification" in window && Notification.permission === "default" && !getNotifDismissed()) {
      setShow(true)
    }
  }, [])

  const handleDismiss = () => {
    setNotifDismissed(true)
    setShow(false)
  }

  const handleEnable = async () => {
    const perm = await Notification.requestPermission()
    if (perm === "granted") handleDismiss()
  }

  if (!show) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-3 mb-4 flex items-center gap-3 border-[#00E5FF]/10"
    >
      <Bell className="w-4 h-4 text-[#00E5FF] flex-shrink-0" />
      <p className="text-[12px] text-white/60 flex-1">
        Bật thông báo để nhận cảnh báo khi thị trường biến động mạnh
      </p>
      <button
        onClick={handleEnable}
        className="text-[11px] px-3 py-1.5 bg-[#00E5FF]/10 text-[#00E5FF] rounded-lg hover:bg-[#00E5FF]/20 transition-colors font-medium flex-shrink-0"
      >
        Bật ngay
      </button>
      <button
        onClick={handleDismiss}
        className="text-white/20 hover:text-white/40 transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/components/NotificationBanner.tsx
git commit -m "refactor(dashboard): extract NotificationBanner to standalone component"
```

---

### Task 8: Refactor `page.tsx` to use extracted components

**Files:**
- Modify: `src/app/dashboard/page.tsx`
- Read: `src/app/dashboard/page.tsx` (full, for all remaining content)

**Goal:** Reduce from 911 lines → ~300 lines. Remove: `MarketCard`, `FGGauge`, `MarketSkeletonCard`, `VetVangFloat`, `DailyQuestCard`, the market fetch + interval + notification useEffects. Keep: net worth, `BriefCard`, `NewsFeed`, `PortfolioMini`, onboarding wizard.

- [ ] **Step 1: Read the full page.tsx** — identify every line to keep vs remove

Lines to **REMOVE** (will be replaced by imports):
- Lines 40-116: `MarketCardData`, `DEFAULT_MARKET_CARDS`, `getFgLabel`, `getFgColor`, `calculateFgScore`, `buildMarketCards`, `portfolioData` (move to `PortfolioMini.tsx` or keep inline)
- Lines 179-185: `formatTimeAgo` (used by NewsFeed, keep)
- Lines 225-314: `FGGauge` + `PortfolioMini` — keep inline (stateless, already compact)
- Lines 316-362: `BriefCard` — keep inline (depends on `liveBrief` state)
- Lines 364-411: `NewsFeed` — keep inline (depends on `liveNews`)
- Lines 413-438: `VetVangFloat` — keep inline (already a standalone function, not a component)
- Lines 440-565: `DailyQuestCard` — **REMOVE** (replaced by `<DailyQuestSection />`)
- Lines 569-737: All market data + notification state + fetch logic — **REMOVE** (now in `MarketSection`)
- Lines 739-761: Market notification useEffect — **REMOVE**

Lines to **KEEP**:
- Imports (update to add new component imports)
- `fetchNetWorth` callback
- `liveArticles` + `aiBrief` + `newsLoading` + `aiBriefLoading` state
- `BriefCard` (inline)
- `NewsFeed` (inline)
- `FGGauge` + `PortfolioMini` + `VetVangFloat` (inline)
- Full return JSX layout (update to mount new components)

- [ ] **Step 2: Rewrite page.tsx imports**

```typescript
// Replace the old market/gamification imports with:
// Keep: MarketSnapshot, NewsArticle, NewsSentimentLabel
// Keep: QuickSetupWizard, isFirstTimeUser, getDailyQuests
// Keep: GamificationState, DailyQuest
// Keep: MarketSnapshot
// Keep: ConfettiCannon, QuestCompleteToast, BadgeGrid
// ADD:
import { MarketSection } from "./components/MarketSection"
import { DailyQuestSection } from "./components/DailyQuestSection"
import { NotificationBanner } from "./components/NotificationBanner"
import { getBudgetPots, getExpenses, getIncome } from "@/lib/storage"
```

- [ ] **Step 3: Replace state declarations** — remove: `marketSnapshot`, `prevMarketSnapshot`, `marketLoading`, `marketError`, `showNotifBanner`

Keep: `showSetup`, `liveArticles`, `newsLoading`, `aiBrief`, `aiBriefLoading`, `aiBriefError`, `netWorth`, `monthlyDeltaPct`, `assetSummary`

- [ ] **Step 4: Remove market-related useEffects** — delete the `fetchMarketData` useCallback, the `fetchNetWorth` (replace inline with storage calls), the market fetch useEffect, the market interval useEffect, and the market notification useEffect

Replace `fetchNetWorth` with direct `storage.ts` calls:

```typescript
// Replace the fetchNetWorth inline logic with:
useEffect(() => {
  const pots = getBudgetPots()
  const expenses = getExpenses()
  const income = getIncome()

  const potTotal = pots.reduce((sum, pot) => sum + (Number.isFinite(pot.allocated) ? pot.allocated : 0), 0)
  const spentTotal = expenses.reduce((sum, item) => sum + (Number.isFinite(item.amount) ? item.amount : 0), 0)
  const net = potTotal - spentTotal

  const hasData = pots.length > 0 || expenses.length > 0
  const computedNetWorth = hasData ? net : income ? income * 2.5 : 0

  setNetWorth(computedNetWorth)
  setMonthlyDeltaPct(income > 0 ? Math.round((net / income) * 100) : 0)
  setAssetSummary(income > 0
    ? `Đã lưu thu nhập: ${new Intl.NumberFormat("vi-VN").format(income)} ₫`
    : "Chưa có thu nhập")
}, [])
```

- [ ] **Step 5: Verify `safeParseArray` has zero remaining usages**

Run: `grep -n "safeParseArray" src/app/dashboard/page.tsx`
Expected: No output. If usages remain, resolve them before proceeding. If `fetchNetWorth` still uses it, replace with `getBudgetPots()` / `getExpenses()` / `getIncome()` from `storage.ts`.

- [ ] **Step 6: Remove `safeParseArray` function** — no longer needed (using typed `storage.ts`)

- [ ] **Step 6: Remove `showNotifBanner` state and its useEffect** — replaced by `NotificationBanner` component

- [ ] **Step 7: Remove the `localStorage.setItem("vietfi_notif_dismissed", "1")` call** — `NotificationBanner` handles this

- [ ] **Step 8: Update the return JSX**

```tsx
// REPLACE the market grid section with:
<MarketSection />

// REPLACE DailyQuestCard with:
<DailyQuestSection />

// REPLACE notification banner (lines ~841-861) with:
<NotificationBanner />
```

Keep the rest of the JSX structure identical: net worth banner, BriefCard, BadgeGrid, FGGauge + PortfolioMini + VetVangFloat, NewsFeed.

- [ ] **Step 9: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors. If `Expense` or `BudgetPot` types are not found, import from `src/lib/types/budget.ts`.

- [ ] **Step 10: Run tests**

Run: `npm test`
Expected: All tests pass.

- [ ] **Step 11: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "refactor(dashboard): use extracted components, reduce page.tsx from 911 to ~300 lines"
```

---

## Chunk 5: Sprint 4 — Quality Sprint

**Prerequisite:** None (independent).

**Files:**
- Modify: `vitest.config.ts`
- Modify: `src/app/api/cron/market-data/route.ts`
- Modify: `src/app/api/cron/morning-brief/route.ts`
- Modify: `src/lib/supabase/migrate-local.ts`
- Modify: `src/app/dashboard/page.tsx`

---

### Task 9: Add vitest coverage config

**Files:**
- Modify: `vitest.config.ts`

- [ ] **Step 1: Update vitest.config.ts**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/lib/**/*.ts', 'src/app/api/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/test/**',
        'src/app/test/**',
      ],
      thresholds: {
        statements: 70,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
})
```

- [ ] **Step 2: Install coverage provider if missing**

Run: `npm install -D @vitest/coverage-v8`
Expected: Installs successfully.

- [ ] **Step 3: Run coverage**

Run: `npm test -- --coverage`
Expected: Coverage report generated. If thresholds are not met, the test command will exit non-zero — this is expected. Fix by adding tests or lowering thresholds temporarily.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts package.json
git commit -m "chore: add vitest coverage config with 70% thresholds"
```

---

### Task 10: Remove console.log from cron routes

**Files:**
- Modify: `src/app/api/cron/market-data/route.ts:27`
- Modify: `src/app/api/cron/morning-brief/route.ts:18`
- Modify: `src/lib/supabase/migrate-local.ts:107`

- [ ] **Step 1: Remove each console.log**

Run: `grep -n "console.log" src/app/api/cron/market-data/route.ts src/app/api/cron/morning-brief/route.ts src/lib/supabase/migrate-local.ts`
Expected: 3 lines, noted above.

Then use Edit tool to remove each one.

- [ ] **Step 2: Verify no console.log remains**

Run: `grep -rn "console.log" src/app/api/cron/ src/lib/supabase/migrate-local.ts`
Expected: No output.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/cron/market-data/route.ts src/app/api/cron/morning-brief/route.ts src/lib/supabase/migrate-local.ts
git commit -m "chore: remove debug console.log from cron routes"
```

---

### Task 11: Fix PortfolioMini eslint-disable

**Files:**
- Modify: `src/app/dashboard/page.tsx` (line ~292-296)

- [ ] **Step 1: Fix the Tooltip formatter type issue**

Read the `PortfolioMini` function in `page.tsx`. Find the `Tooltip` component with `eslint-disable-next-line`. Extract the formatter:

```typescript
// Add near top of PortfolioMini function:
const pctFormatter = (value: unknown) => `${value}%`

// In Tooltip:
<Tooltip
  contentStyle={{ background: "#111318", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, color: "#F5F3EE", fontSize: 11 }}
  formatter={pctFormatter}
/>
```

Delete the `// eslint-disable-next-line @typescript-eslint/no-explicit-any` comment.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/dashboard/page.tsx
git commit -m "fix(page): extract Tooltip formatter to fix explicit-any eslint error"
```

---

## Final Verification

After all chunks:

- [ ] Run: `npm test` — all tests pass
- [ ] Run: `npm run lint` — no errors
- [ ] Run: `npx tsc --noEmit` — no TypeScript errors
- [ ] Run: `npm test -- --coverage` — coverage report generated
- [ ] Verify `docs/superpowers/plans/2026-03-23-full-optimization-sprint-plan.md` is committed
- [ ] Verify `docs/superpowers/specs/2026-03-23-full-optimization-sprint-design.md` is committed
