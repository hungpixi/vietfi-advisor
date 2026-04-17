# VietFi Auth + Voice + Supabase Optimization Design

**Date:** 2026-04-15
**Status:** Approved by User
**Scope:** Login/Register UI, Vẹt Vàng Voice Tone, Supabase Optimization

---

## 1. Login/Register UI

### Layout
- **Desktop:** Split screen (left: mascot branding, right: form)
- **Mobile:** Stacked (logo → form → subtle mascot)

### Components
- `src/app/(auth)/login/page.tsx` - Login page
- `src/app/(auth)/register/page.tsx` - Register page
- `src/app/(auth)/layout.tsx` - Auth layout wrapper
- `src/components/auth/LoginForm.tsx` - Login form component
- `src/components/auth/RegisterForm.tsx` - Register form component
- `src/components/auth/OAuthButtons.tsx` - Google/GitHub OAuth buttons

### OAuth Providers
- Google (primary)
- GitHub (secondary)

### Design Style
- Fun & Playful - match mascot personality
- Glass-card effects from existing design system
- Responsive breakpoints: mobile-first

---

## 2. Vẹt Vàng Voice Tone

### Core Principle
**Sắc sảo nhưng lịch sự** - 80% respectful, 20% comedic harsh

### Xưng hô
- 80%: "bạn/tôi"
- 20%: "mày/tao" for comedic effect

### Examples Transformation

| Category | Before | After |
|----------|--------|-------|
| Greeting | "Mở app lên ngắm tao hay gì?" | "Chào bạn! Rất vui được gặp lại." |
| Harsh (comedy) | "Order lần 4 rồi à? Shopee chắc..." | "Order lần 4 rồi à? Lọ mua sắm chắc đang gào khóc..." |
| Motivation | "Mày bắt đầu nghe lời tao rồi!" | "Tháng này bạn tiết kiệm 15%. Tiếp tục nhé!" |

### Keep (Comedic Harsh)
- Shopee jokes
- Tea milk addiction roasts
- Streak praises
- Debt payoff celebrations

### Files
- `src/lib/scripted-responses.ts` - Main responses file

---

## 3. Supabase Optimization

### Batch Reads
Replace 2 separate queries with 1 combined query for budget data

### React Query Integration
Add SWR/React Query for:
- Cache Supabase responses
- Dedupe identical requests
- Background refetch

### Hybrid Persistence
- Keep localStorage for guest users
- Supabase for logged-in users
- Migration tooling from `src/lib/supabase/migrate-local.ts`

### Files
- `src/lib/supabase/user-data.ts` - Batch read optimization
- `src/lib/supabase/useUserData.ts` - React Query hooks

---

## 4. File Structure

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── layout.tsx
│   └── dashboard/
│       └── ...
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── RegisterForm.tsx
│   │   └── OAuthButtons.tsx
│   └── ui/
│       └── ... (reuse existing)
└── lib/
    ├── supabase/
    │   ├── user-data.ts (modify)
    │   └── useUserData.ts (modify)
    └── scripted-responses.ts (modify)
```

---

## 5. Verification

- Run `npm run lint` after each agent
- Test OAuth flow in browser
- Test guest → logged-in migration
- Verify voice tone with TTS playback
