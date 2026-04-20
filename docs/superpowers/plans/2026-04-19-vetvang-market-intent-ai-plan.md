# VetVang Market Intent AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make VetVang use live market data through AI for all market-related questions, including gold, stocks, crypto, inflation, and market comparisons.

**Architecture:** Update the intent routing logic in `src/lib/scripted-responses.ts` so market-related `DATA_INTENTS` always require AI, then verify with focused unit tests.

**Tech Stack:** Next.js, TypeScript, Vitest

---

### Task 1: Add market intent regression tests

**Files:**
- Create: `src/lib/scripted-responses.test.ts`
- Test: `src/lib/scripted-responses.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { needsAI, detectIntent } from './scripted-responses'

describe('market intent AI routing', () => {
  const cases: Array<[string, string]> = [
    ['ask_gold', 'vàng'],
    ['ask_stock', 'chứng khoán'],
    ['ask_crypto', 'bitcoin'],
    ['compare_gold_stock', 'vàng vs chứng khoán'],
    ['ask_inflation', 'lạm phát'],
    ['ask_realestate', 'mua nhà'],
  ]

  it.each(cases)('returns true for %s when asked with %s', (intent, text) => {
    expect(needsAI(intent as any, text)).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- src/lib/scripted-responses.test.ts`
Expected: FAIL because `needsAI` currently returns `false` for short generic market queries.

- [ ] **Step 3: Commit test file**

```bash
git add src/lib/scripted-responses.test.ts
git commit -m "test: add regression coverage for VetVang market intent AI routing"
```

### Task 2: Update `needsAI` to require AI for market intents

**Files:**
- Modify: `src/lib/scripted-responses.ts`

- [ ] **Step 1: Add market intent helper**

In `src/lib/scripted-responses.ts`, add a local constant near `DATA_INTENTS`:

```ts
const MARKET_INTENTS: Intent[] = [
  'ask_gold',
  'ask_stock',
  'ask_crypto',
  'ask_market',
  'compare_gold_stock',
  'ask_inflation',
  'ask_realestate',
]
```

- [ ] **Step 2: Change `needsAI` behavior**

Update `needsAI` to return `true` when `intent` is one of `MARKET_INTENTS`.

```ts
export function needsAI(intent: Intent, text: string): boolean {
  if (intent === 'unknown') return true;
  if (MARKET_INTENTS.includes(intent)) return true;
  if (DATA_INTENTS.includes(intent)) {
    if (!hasPersonalContext(text) && text.length <= 80) return false;
    return true;
  }
  if (text.length > 80) return true;
  return false;
}
```

- [ ] **Step 3: Run the focused test again**

Run: `npm run test -- src/lib/scripted-responses.test.ts`
Expected: PASS

- [ ] **Step 4: Commit the implementation change**

```bash
git add src/lib/scripted-responses.ts
git commit -m "fix: require AI for market-related VetVang intents"
```

### Task 3: Validate the fix

**Files:**
- `src/lib/scripted-responses.ts`
- `src/lib/scripted-responses.test.ts`

- [ ] **Step 1: Run the full related test file**

Run: `npm run test -- src/lib/scripted-responses.test.ts`
Expected: PASS

- [ ] **Step 2: Optionally run any broader regression command**

Run: `npm run test -- src/lib/market-data/crawler.test.ts src/lib/scripted-responses.test.ts`
Expected: PASS

- [ ] **Step 3: Commit any final test or cleanup changes**

If the test file or implementation needed adjustments, commit them with:

```bash
git add src/lib/scripted-responses.ts src/lib/scripted-responses.test.ts
git commit -m "chore: validate VetVang market intent AI routing with tests"
```

---

## Self-review checklist

- [ ] Spec coverage: The plan updates `needsAI()` for market intents and adds test coverage for gold, stock, crypto, inflation, and real estate.
- [ ] No placeholders: all steps include exact files, code, and commands.
- [ ] Type consistency: all referenced TypeScript symbols exist in `src/lib/scripted-responses.ts`.
- [ ] Execution path: if this passes, VetVang market queries will now use AI with live market context.
