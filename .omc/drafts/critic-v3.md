# Critic v3 — Final Review: monetization-plan.md (v2.1)

**Date:** 2026-04-09
**Reviewer:** Senior Reviewer
**Version under review:** monetization-plan.md v2.1 (dated 2026-04-09)

---

## Checklist Results

### 1. All 6 Original CRITICALs from Iteration 1 — FIXED

| ID | Issue | Status | Evidence |
|---|---|---|---|
| CRITICAL-1 | /api/premium used Edge Runtime; localStorage unavailable -> silent auth failure | FIXED | Step 0.3: export const dynamic = force-dynamic; no Edge export; standard runtime explicit in file header |
| CRITICAL-2 | No unified gate function; split-brain between localStorage and server | FIXED | Step 0.1: verifyPremium(req) exported from src/lib/premium-auth.ts; all gated routes call it |
| CRITICAL-3 | HUNGPIXI hardcoded in rbac.ts | FIXED | Step 0.2: read from NEXT_PUBLIC_VIETFI_PROMO_CODES env var; changelog confirms removal from source |
| CRITICAL-4 | UnitTrustProduct missing updatedAt -> staleness unmeasurable | FIXED | Step 3.1: updatedAt field + exported isStale() helper; used in unit trust panel |
| CRITICAL-5 | VIP badge used isPremiumActive() -> missed XP-rank and promo-code users | FIXED | Step 2.8: badge calls hasPremium(currentXp) via useUserGamification(); changelog confirms C-1/G-5 fix |
| CRITICAL-6 | Trigger condition used dtiRatio >= 35 without debts.length > 0 guard | FIXED | Step 1.3 ADR-001 v2: both sub-conditions require debts.length > 0; changelog confirms |

**All 6 CRITICALs: RESOLVED**

---

### 2. All 4 Issues from Iteration 2 (Architect v2) — FIXED

| ID | Issue | Status | Evidence |
|---|---|---|---|
| C-1 | PREMIUM enum, getRoleRank(), hasPremium() missing before Phase 2 Step 2.1 | FIXED | Step 0.5 (Phase 0): all three added; Step 2.1 is now a verification checklist only |
| C-2 | cancelPremium() did not clear server-set cookie | FIXED | premium.ts Step 2.2: calls fetch DELETE before removing localStorage |
| C-3 | httpOnly: false XSS risk undocumented | DOCUMENTED | ADR-002 Consequences: SECURITY_NOTE calls out Phase 2 XSS risk and Phase 3 remediation path |
| H-1 | console.log in trackEvent() | FIXED | Changelog v2.1: console.log removed; only localStorage queue retained |

**All 4 iteration-2 issues: RESOLVED**

---

### 3. Acceptance Criteria — Concrete and Testable

Coverage assessment: ~95%+ of AC items are concrete and verifiable.

Strong testable examples:
- AC Phase 0: exports PremiumAuth { source, active, tier, expiresAt } — exact interface signature
- AC Phase 0: route.ts is a standard (non-Edge) Route Handler — verifiable by absence of export const runtime = edge
- AC Phase 1: Modal does not re-appear for 24h (vietfi_affiliate_dismissed_until) — exact localStorage key + timestamp
- AC Phase 2: GET /api/portfolio/backtest with X-User-XP: 2500 -> 200 — exact header + value + status code
- AC Phase 2: coverage >= 90% — exact percentage target per file
- AC Phase 3: all gold CTAs use rel=noopener noreferrer and utm_source=vietfiutm_medium=gold_affiliate — exact attributes

Minor advisory (non-blocking): LEGEND->3yr backtest AC references rank 3 rather than naming getRoleRank(). Step 2.1 checklist makes this concrete. Pass.

**ACCEPTANCE CRITERIA ~95% CONCRETE AND TESTABLE**

---

### 4. ADR Sections — Complete

| ADR | Title | Sections present | Status |
|---|---|---|---|
| ADR-001 v2 | Trigger Condition for Loan Affiliate Modal | Decision, Drivers, Alternatives, Consequences, Follow-ups | Complete |
| ADR-002 v2 | Premium Tier Rank in Role Hierarchy | Decision, Drivers, Alternatives, Consequences, SECURITY_NOTE, Follow-ups | Complete |
| ADR-003 | Gold Distribution Channel Architecture | Decision, Drivers, Consequences, Follow-ups | Complete |

All ADRs follow standard decision-record format. ADR-002 v2 SECURITY_NOTE on httpOnly: false Phase 2 compromise is a best-practice addition.

**ADR SECTIONS: COMPLETE**

---

### 5. Pre-Mortem — 3 Scenarios with Measurable Signals

| # | Scenario | Earliest Signal | Prevention |
|---|---|---|---|
| F1 | Phase 1 modal confuses users -> they leave debt page | Drop-off in debt page session duration >20% — affiliate_modal_shown vs affiliate_cta_click delta in vietfi_analytics_queue | A/B test banner vs modal; debts.length > 0 guard |
| F2 | Premium gate bypassed via mock header spoofing in production | Revenue USD 0 + user complaints; MOCK_AUTH_ENABLED still true | MOCK_AUTH_ENABLED=false by default; env-check fails open to active: false |
| F3 | Gold affiliate links degrade (partner page down) | gold_affiliate_click event count dropping to 0; support ticket spike | Fallback message; remove broken vendor from GOLD_VENDORS |

Each scenario has: (a) specific failure description, (b) objective measurable signal tied to Phase 0 analytics schema, (c) concrete prevention action. F1 is only measurable because analytics infrastructure is a Phase 0 deliverable — this dependency is correctly identified and resolved.

**PRE-MORTEM: COMPLETE**

---

### 6. Test Plan — Unit/Integration/E2E/Observability with 80%+ Targets

| Layer | Scope | Target | Evidence |
|---|---|---|---|
| Unit | premium-auth.ts verifyPremium() | >=90% | AC Phase 2 + Step 0.6 stub + hasPremium 8-case checklist |
| Unit | premium.ts state transitions | >=90% | AC Phase 2 + Step 0.6 stub |
| Unit | rbac.ts hasPremium() | >=90% | AC Phase 2 + Step 2.1 verification checklist |
| Unit | analytics.ts dtiBucket() + isStale() | >=80% implied | Step 0.6 + Step 3.1 + Phase 3 verification step 7 |
| Integration | /api/premium GET/POST/DELETE | Pass | Phase 2 verification steps 1-3 |
| Integration | /api/portfolio/backtest gate | Pass + 403 check | Phase 2 verification steps 4-7 |
| Integration | /api/portfolio/projection gate (>5yr) | Pass + 403 check | Phase 2 verification step 8 |
| E2E | Portfolio page loads without crash | Pass | Phase 3 verification step 8 |
| E2E | Debt page modal flow (9-step) | Pass | Phase 1 verification steps 1-9 |
| Observability | Analytics queue in DevTools | Readable events | Phase 1 verification step 8 + Pre-Mortem F1 |

All four layers covered. Explicit 80-90% coverage targets stated for all three critical unit files.

Advisory (non-blocking): E2E steps are manual browser checks; no Playwright spec in file map. Plan references npm run test:e2e and project uses Playwright per CLAUDE.md — acceptable; team wires into existing harness.

**TEST PLAN: COMPLETE**

---

### 7. RALPLAN-DR Summary — Principles, Drivers, Options Present

| Section | Status | Coverage |
|---|---|---|
| Governing Principles (5) | OK | Scripted-First, No Payment Before PMF, No Degradation, Unified Auth, Affiliate as UI |
| Decision Drivers (D1-D4) | OK | DTI <35%, Standard Runtime, LEGEND=3yr/PREMIUM=full, Env-var promo codes |
| Viable Options (A-E) | OK | 5 options with pros/cons/verdict; C selected, A/B/D/E rejected |
| Pre-Mortem (F1-F3) | OK | 3 failure scenarios with measurable signals |

**RALPLAN-DR: COMPLETE**

---

## Final Verdict

**APPROVED**

The plan is ready to proceed. All six CRITICALs from iteration 1 and all four architect-v2 issues are confirmed resolved. Acceptance criteria are concrete and testable to specific values, headers, and UI states. ADRs are complete with consequences documented including the Phase 2 httpOnly: false security compromise. Pre-mortem scenarios are measurable via Phase 0 analytics infrastructure. Test plan covers all four layers with explicit 80-90% coverage targets. RALPLAN-DR sections are complete.

The plan is production-ready pending implementation of Phase 0 as a mandatory prerequisite before Phase 1 begins.

---

## Advisory Notes (Non-blocking)

1. **E2E spec file:** File map references npm run test:e2e but does not create a Playwright spec. Consider adding tests/e2e/monetization.spec.ts if team maintains explicit E2E specs.
2. **ADR-003 unchanged:** Listed as unchanged — acceptable; already well-formed.
3. **Phase 0 definition of done:** Plan estimates Day 0 but acceptance criteria serve as definition of done, which is sufficient.

---
*critic-v3.md • 2026-04-09 • APPROVED*
