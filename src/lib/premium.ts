/* ═══════════════════════════════════════════════════════════
 * Premium State Management — localStorage-backed subscription
 * for guest users. Server-safe: all ops are no-ops server-side.
 * ═══════════════════════════════════════════════════════════ */

import { hasPremium as hasPremiumFromRBAC } from "@/lib/rbac";

const LS_KEY = "vietfi_premium_state";

export interface PremiumState {
  active: boolean;
  tier: "Vẹt Vàng VIP" | null;
  subscribedAt: string | null;   // ISO date
  expiresAt: string | null;       // ISO date — null = lifetime
}

const DEFAULT_STATE: PremiumState = {
  active: false,
  tier: null,
  subscribedAt: null,
  expiresAt: null,
};

function isServer() {
  return typeof window === "undefined";
}

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function getPremiumState(): PremiumState {
  if (isServer()) return DEFAULT_STATE;
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return DEFAULT_STATE;
  return safeParseJSON<PremiumState>(raw) ?? DEFAULT_STATE;
}

function save(state: PremiumState) {
  if (isServer()) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {
    // Storage full — fail silently
  }
}

export function subscribePremium(promoCode?: string): PremiumState {
  if (isServer()) return DEFAULT_STATE;

  // Validate promo code before activating premium
  if (promoCode) {
    const codes = (process.env.NEXT_PUBLIC_VIETFI_PROMO_CODES ?? "")
      .split(",").map(c => c.trim().toUpperCase()).filter(Boolean);
    if (!codes.includes(promoCode.toUpperCase())) {
      // Invalid code — return current state without activating
      return getPremiumState();
    }
  }

  const state: PremiumState = {
    active: true,
    tier: "Vẹt Vàng VIP",
    subscribedAt: new Date().toISOString(),
    expiresAt: null, // lifetime for Phase 2 mock
  };
  save(state);
  return state;
}

export function cancelPremium(): Promise<PremiumState> {
  if (isServer()) return Promise.resolve(DEFAULT_STATE);

  // Clear cookie first (so verifyPremium() doesn't re-activate on reload)
  return fetch("/api/premium", { method: "DELETE" })
    .catch(() => {
      // Network error — still clear localStorage
    })
    .then(() => {
      const state = DEFAULT_STATE;
      save(state);
      return state;
    });
}

/**
 * Client-side premium check — unifies XP rank + promo code + localStorage state.
 * Use this in UI components (VIP badge, gate logic).
 *
 * Note: for API routes use verifyPremium(req) instead.
 */
export function isPremiumActive(): boolean {
  if (isServer()) return false;
  const state = getPremiumState();
  if (state.active) return true;

  // Fallback: check LEGEND XP rank
  try {
    const raw = localStorage.getItem("vf_gamification");
    if (raw) {
      const gam = safeParseJSON<{ xp?: number }>(raw);
      if (gam?.xp != null && hasPremiumFromRBAC(gam.xp)) return true;
    }
  } catch { /* ignore */ }

  return false;
}

/**
 * Sync premium state from Supabase on app load.
 * Called by useEffect in dashboard layout.
 */
export async function syncPremiumFromSupabase(): Promise<PremiumState> {
  // Phase 3 stub — for now, just return local state
  // TODO(Phase 3): fetch /api/premium which sets cookie for server-side reads
  return getPremiumState();
}
