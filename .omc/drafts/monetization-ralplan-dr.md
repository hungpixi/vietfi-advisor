# RALPLAN-DR — VietFi Advisor Monetization
**Date:** 2026-04-09 · **Author:** Senior Fintech Planner

---

## 1. Principles (RALPLAN Framework)

### P1 — Scripted-First Monetization
Every affiliate dollar earned without an AI API call is superior to revenue that requires LLM inference.
Monetization phases are ordered by cost-to-serve: affiliate (~$0) → subscription mock (~$0) → gold UTM (~$0).
Premium features that require Gemini should be tiered so free users still get meaningful value.

### P2 — No Payment Infra Before Product-Market Fit
Do not integrate Stripe, MoMo, or ZaloPay until ≥5% of weekly active users convert to paid.
Phase 2 deliberately ships a mock subscription endpoint so the UI/UX can be validated before committing to a payment provider.
Vietnam's payment landscape is fragmented (MoMo, ZaloPay, VietQR, bank transfer) — lock in the product before choosing the PSP.

### P3 — Premium Must Not Hard-Block Free Users
Every premium-gated feature requires a credible free alternative.
Non-payers must never feel locked out of core workflows.
Premium upsell appears contextually (e.g., after viewing Monte Carlo results, not on every page load).

### P4 — Guest-First, Cloud-Second
All monetization state lives in `localStorage` first, Supabase sync is additive.
This mirrors the existing architecture: guest users get full Phase 1/2/3 functionality without creating an account.
Supabase dependency is a future optimization, not a launch requirement.

### P5 — Affiliate Is UI, Not Logic
Affiliate components are pure presentational wrappers.
Zero business logic (commission calculation, lead scoring, eligibility) lives in affiliate components or `src/lib/affiliate/`.
Partner eligibility is determined by user DTI profile only (not by opaque third-party signals).

---

## 2. Top 3 Decision Drivers

| # | Driver | Evidence from Codebase |
|---|---|---|
| D1 | **DTI 35% trigger threshold** | `DTIDominoGauge.tsx` line 16 already computes `canRefinance = toxicDebt && dtiRatio < 50`. Lowering to 35% aligns with industry warning threshold. `analyzeDTI()` in `debt-optimizer.ts` already classifies 35–40 as "warning" color `#FFD700`. |
| D2 | **`X-Premium-Key` mock header vs real JWT** | Backtest API (`src/app/api/portfolio/backtest/route.ts`) is a simple Edge Function with no session context. Real auth requires Supabase `supabase.auth.getUser()` call + `profiles.is_premium` row lookup — 3–5 days to implement. Header-based mock is acceptable for Phase 2 demo; must be replaced before production. |
| D3 | **Gold CTA in GoldTracker vs separate page** | `GoldTracker.tsx` (existing) already has purchase context and 200+ lines of UX for tracking PnL. Adding a "Buy Gold" CTA as the natural next action after viewing portfolio gains alignment with the user's mental model. A separate `/dashboard/buy-gold` page would require a new route and compete with the gold tracker workflow. |

---

## 3. Options Considered

### Option A — Premium Subscription First
Launch Phase 2 (mock Stripe) before Phase 1 (affiliate).
**Pros:** Fastest path to recurring revenue model; clear monetization story for investors.
**Cons:** No existing conversion data; likely <1% free→paid conversion without established trust. App has 0 paying users — no PMF signal.
**Verdict:** ❌ **Rejected** — no PMF for a financial app with no track record.

### Option B — Loan + Insurance Affiliate First (CHOSEN ✓)
Launch Phase 1 before all others.
**Pros:** High-intent users (DTI > 35%), proven Vietnam affiliate model (Techcombank, VPBank, Fe Credit all use CPA), zero payment infra, 1–5% commission per completed application, revenue same week.
**Cons:** Commission payment cycles are 30–90 days; not recurring.
**Verdict:** ✅ **Selected** — lowest execution risk, immediate feedback loop.

### Option C — Research Phase Only
Spend 2 weeks on competitive analysis before any implementation.
**Pros:** Thorough understanding of VietFinance, Manulife, Mirae Asset FETU pricing.
**Cons:** Delays all output by 9–11 days; research does not validate monetization hypotheses.
**Verdict:** ❌ **Rejected** — execution risk is low enough to build first and iterate.

### Option D — Gold Distribution Phase 1
Lead with gold affiliate since users tracking gold in-app signal purchase intent.
**Pros:** Natural product fit; gold is culturally resonant for Vietnamese users; PnL tracker creates urgency.
**Cons:** Narrow audience (only users who have added gold purchases); gold prices are volatile and commission rates are low (0.3–0.8%).
**Verdict:** ⏸️ **Deferred to Phase 3** — correct audience sizing, correct sequence.

---

## 4. Pre-Mortem — 3 Failure Scenarios

### F1: Phase 1 Modal Causes Debt Page Drop-Off
**Scenario:** Loan affiliate modal appears too aggressively. Users feel "marketed at" and close the debt page, never returning. Sessions on `/dashboard/debt` fall 30%.
**Earliest Signal:** `affiliate_modal_shown` fires 3x more than `affiliate_cta_click` — click-through rate < 0.5%.
**Prevention:**
- 24h dismiss via localStorage (`vietfi_affiliate_dismissed_until`) — already in plan
- A/B test: modal vs. inline banner vs. bottom toast for the first 2 weeks
- Modal only fires once per session, not on every render
**Mitigation if triggered:** Immediately switch to a subtle inline banner variant; remove modal from Phase 1 entirely.

### F2: Premium Mock Gate Ships to Production Unchanged
**Scenario:** App goes live with `X-Premium-Key: vip-mock-key` header spoofable by any user. Users share the key on Vietnamese Facebook groups. Revenue = $0 despite real paying customers.
**Earliest Signal:** Supabase `profiles` table shows 0 rows with `is_premium = true` despite 50+ users claiming VIP access.
**Prevention:**
- Add a hardcoded comment in `backtest/route.ts`: `// TODO: Replace mock header check with Supabase JWT before production`
- Gate the PR review: blocked unless R+ (reviewer signs off on auth implementation)
- Env var flag `NEXT_PUBLIC_PREMIUM_MOCK=false` gates mock path
**Mitigation if triggered:** Kill switch: `NEXT_PUBLIC_PREMIUM_ENABLED=false` disables all premium gates and shows free tier. 1-hour hotfix.

### F3: Gold Partner Page Goes Down or Changes URL
**Scenario:** SJC/DOJI/PNJ revamps their website, breaking affiliate URLs. Users click "Mua vàng SJC" → 404. VietFi reputation damage.
**Earliest Signal:** `gold_affiliate_click` events with 100% bounce rate (GA4 bounce + no downstream event within 5 minutes).
**Prevention:**
- UTM parameter `utm_campaign` enables filtering by vendor in analytics
- Monthly smoke test: visit each `buildGoldAffiliateUrl()` output URL automatically (GitHub Actions cron, 1/month)
**Mitigation if triggered:** Fallback renders "Liên kết tạm thời bảo trì" placeholder with `pointer-events: none`; removes CTA for that vendor only.

---

## 5. Expanded Test Plan

### Unit Tests
| Function | Test Cases |
|---|---|
| `filterLoansByAmount()` | maxAmount exactly at product min; maxAmount below all products (returns empty); maxAmount above all products (returns all) |
| `formatRateRange()` | min === max; min ≠ max; negative values (should not occur but guard) |
| `analyzeDTI()` | dtiRatio 34.9 (warning), 35.0 (danger), 49.9, 50.0, 60.0 boundary values |
| `hasPremium()` | XP-based LEGEND user (no premium flag); XP-based LEGEND + promoCode `HUNGPIXI`; PREMIUM role; MEMBER; expired subscription |
| `buildGoldAffiliateUrl()` | URL with existing query string; URL without; vendor with `&` in note (escaped) |
| `subscribePremium()` | First subscribe (sets state); re-subscribe after cancel (re-activates) |
| `getPremiumState()` | Active subscription; expired subscription (auto-clears); corrupted JSON (returns default) |
| `isPremiumActive()` | Mock key + no real state; real state active; real state inactive |

### Integration Tests
| Flow | Expected Result |
|---|---|
| `POST /api/premium` → `GET /api/premium` | `active: true` echoed back |
| `DELETE /api/premium` → `GET /api/premium` | `active: false` |
| `GET /api/portfolio/backtest` (no key) | 403, `PREMIUM_REQUIRED` |
| `GET /api/portfolio/backtest` (with mock key) | 200, `premiumRequired: undefined` |
| `GET /api/portfolio/projection?years=10` (no key) | 403, `PREMIUM_REQUIRED` |
| `GET /api/portfolio/projection?years=5` (no key) | 200 |
| `LoanAffiliateModal` render | 5 loan cards + 3 insurance tabs; CTA opens new tab |
| PremiumGateModal → subscribe → VIP badge | State persists across component remount |

### E2E Tests (Playwright)
```
/dashboard/debt
  → With debts + DTI 35%+ → modal appears within 2s
  → Click "Đăng ký ngay" on first loan card → new tab opens
  → Dismiss modal → reload → modal does not reappear

/dashboard/portfolio
  → GoldTracker → 3 vendor CTAs visible
  → Monte Carlo button → PremiumGateModal appears
  → "Nâng cấp ngay" → VIP badge appears in sidebar
  → Monte Carlo button → now navigates to results (no modal)

/api/premium
  → GET → 200, active: false
  → POST { promoCode: "HUNGPIXI" } → 200, active: true
  → GET → active: true echoed
  → DELETE → 200, active: false
```

### Observability & Analytics Events
| Event Name | Trigger | Properties |
|---|---|---|
| `affiliate_modal_shown` | Modal mounts | `dtiRatio`, `dtiBucket` ("warning"\|"danger"\|"domino"), `trigger` ("dti"\|"plan_view") |
| `affiliate_product_click` | CTA clicked | `productId`, `productType` ("loan"\|"insurance"), `bank` |
| `affiliate_modal_dismissed` | X or backdrop click | `dtiRatio` |
| `premium_modal_shown` | Gate modal mounts | `featureName`, `featureCategory` |
| `premium_subscribe_attempt` | POST /api/premium | `method` ("cta"\|"promo_code"), `promoCode` |
| `premium_subscribe_success` | POST 200 | `tier`, `duration` |
| `premium_cancel` | DELETE /api/premium | — |
| `gold_affiliate_click` | Gold vendor CTA click | `vendorId`, `totalGoldValue` (from GoldTracker), `utmCampaign` |

**Logging:** All events logged via `console.info()` in development; structured JSON in production. Events are additive (no PII — only IDs and numeric values).

---

## 6. Decision Matrix Summary

| Decision | Choice | Confidence | Reversibility |
|---|---|---|---|
| Phase 1 = Loan/Insurance affiliate | Option B | High | Reversible — affiliate module isolated, removable |
| Phase 2 = Mock subscription | Acceptable | High | Reversible — replace mock with Stripe in follow-up |
| Phase 3 = Gold UTM links | Acceptable | Medium | Reversible — CTA removable in 1 PR |
| DTI trigger = 35% | Acceptable | Medium | A/B test after 2 weeks |
| Premium rank = 4 (above LEGEND) | Acceptable | High | Schema migration required |
| Gold CTA inside GoldTracker | Acceptable | High | Reversible — component isolation |
| `X-Premium-Key` header (not JWT) | Acceptable (Phase 2 only) | High | **Hard requirement:** replace before production |
