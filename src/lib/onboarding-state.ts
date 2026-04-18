/* ═══════════════════════════════════════════════════════════
 * Onboarding State — Quick Setup data management
 * Hybrid: localStorage (instant) + Supabase (background sync)
 * ═══════════════════════════════════════════════════════════ */

import { getCachedUserId, saveUserProfile } from "@/lib/supabase/user-data";
import { getOnboardingState, setOnboardingState, clearOnboardingState, clearAllUserData } from "@/lib/storage";

export interface OnboardingData {
  completed: boolean;
  income: number;            // Thu nhập hàng tháng
  netWorth: number;          // Tổng tài sản ròng (NEW)
  hasDebt: boolean;          // Có nợ không
  riskProfile: "conservative" | "balanced" | "growth" | "";
  setupAt: string;           // ISO date
}

const DEFAULT_DATA: OnboardingData = {
  completed: false,
  income: 0,
  netWorth: 0,
  hasDebt: false,
  riskProfile: "",
  setupAt: "",
};

export function getOnboardingData(): OnboardingData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const saved = getOnboardingState();
    if (saved) {
      const raw = saved as unknown as Record<string, unknown>;
      // Validate schema to prevent localStorage tampering
      if (
        typeof raw === "object" && raw !== null &&
        typeof raw.completed === "boolean" &&
        typeof raw.hasDebt === "boolean" &&
        typeof raw.riskProfile === "string" &&
        typeof raw.setupAt === "string"
      ) {
        const validProfiles = ["conservative", "balanced", "growth", ""];
        if (!validProfiles.includes(raw.riskProfile)) return DEFAULT_DATA;

        // Cap values to reasonable max (1000B VND)
        const income = typeof raw.income === "number"
          ? Math.min(Math.max(raw.income, 0), 100_000_000_000)
          : 0;
        const netWorth = typeof raw.netWorth === "number"
          ? Math.min(Math.max(raw.netWorth, 0), 1_000_000_000_000)
          : 0;

        return {
          ...DEFAULT_DATA,
          completed: raw.completed,
          income,
          netWorth,
          hasDebt: raw.hasDebt,
          riskProfile: raw.riskProfile as OnboardingData["riskProfile"],
          setupAt: raw.setupAt,
        };
      }
      clearOnboardingState();
    }
  } catch { /* ignore */ }
  return DEFAULT_DATA;
}

export function saveOnboardingData(data: Partial<OnboardingData>): OnboardingData {
  const current = getOnboardingData();
  const updated = { ...current, ...data };
  setOnboardingState(updated);
  // Background sync to Supabase
  if (getCachedUserId()) {
    saveUserProfile(updated).catch(() => { });
  }
  return updated;
}

export function completeOnboarding(data: Partial<OnboardingData>): OnboardingData {
  return saveOnboardingData({
    ...data,
    completed: true,
    setupAt: new Date().toISOString(),
  });
}

export function resetOnboarding(): void {
  clearAllUserData();
}

export function isFirstTimeUser(): boolean {
  return !getOnboardingData().completed;
}

/* ─── Budget auto-generate từ thu nhập ─── */
export function generateBudgetPots(income: number) {
  return [
    { id: "1", name: "Ăn uống", iconKey: "Coffee", allocated: Math.round(income * 0.30), color: "#FF6B35" },
    { id: "2", name: "Shopping", iconKey: "ShoppingBag", allocated: Math.round(income * 0.10), color: "#AB47BC" },
    { id: "3", name: "Đi lại", iconKey: "Car", allocated: Math.round(income * 0.08), color: "#00E5FF" },
    { id: "4", name: "Nhà ở", iconKey: "Home", allocated: Math.round(income * 0.25), color: "#22C55E" },
    { id: "5", name: "Giải trí", iconKey: "Gamepad2", allocated: Math.round(income * 0.07), color: "#E6B84F" },
    { id: "6", name: "Sức khỏe", iconKey: "Heart", allocated: Math.round(income * 0.05), color: "#EF4444" },
    { id: "7", name: "Học tập", iconKey: "GraduationCap", allocated: Math.round(income * 0.05), color: "#3ECF8E" },
    { id: "8", name: "Tiết kiệm", iconKey: "TrendingUp", allocated: Math.round(income * 0.10), color: "#FFD700" },
  ];
}
