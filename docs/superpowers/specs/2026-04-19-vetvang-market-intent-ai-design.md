# VetVang Market Intent AI Behavior Design

## Goal

Ensure VetVang uses live market data when answering market-related questions about gold, stocks, crypto, inflation, and market comparisons.

## Scope

Update VetVang chat routing so market-related intents are AI-backed and receive the current market snapshot from `/api/market-data`.

This includes:
- `ask_gold`
- `ask_stock`
- `ask_crypto`
- `ask_market`
- `compare_gold_stock`
- `ask_inflation`
- `ask_realestate`

## Current behavior

- VetVang uses a local scripted response for some market intents, including `ask_gold`.
- `needsAI()` can return `false` for short market queries, which bypasses live market context.
- `fetchMarketContext()` already exists in `src/components/vet-vang/VetVangChat.tsx`, but it is only used when AI is selected.

## Proposed design

### 1. Always require AI for market intent questions

In `src/lib/scripted-responses.ts`:
- Modify `needsAI(intent, text)` so that any intent in `DATA_INTENTS` considered market-related returns `true`.
- This prevents short queries like "vàng" or "chứng khoán" from resolving to canned responses.

Market-related intents are:
- `ask_gold`
- `ask_stock`
- `ask_crypto`
- `ask_market`
- `compare_gold_stock`
- `ask_inflation`
- `ask_realestate`

### 2. Keep the existing market context injection flow

In `src/components/vet-vang/VetVangChat.tsx`:
- Retain `MARKET_INTENTS` and `fetchMarketContext()`.
- When the intent is market-related, fetch live `/api/market-data`, then send the user message with `context`, `market`, and explicit instruction.

This keeps the existing pattern and avoids adding extra routes.

### 3. Add regression tests

Add tests for `src/lib/scripted-responses.ts` verifying:
- `needsAI('ask_gold', 'vàng') === true`
- `needsAI('ask_stock', 'chứng khoán') === true`
- `needsAI('ask_crypto', 'bitcoin') === true`
- `needsAI('compare_gold_stock', 'vàng vs chứng khoán') === true`
- `needsAI('ask_inflation', 'lạm phát') === true`
- `needsAI('ask_realestate', 'mua nhà') === true`

## Why this design

- It preserves the current client-side architecture while fixing the main bug.
- It uses live market data only for questions that need it.
- It avoids hardcoding market responses and keeps VetVang advice more accurate and responsive.

## Validation

- Unit tests for `needsAI()`.
- Manual check that `ask_gold`, `ask_stock`, and `compare_gold_stock` queries now issue an AI request with market context.
