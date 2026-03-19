/* ═══════════════════════════════════════════════════════════
 * Onboarding State — Quick Setup data management
 * Lưu trữ dữ liệu từ Quick Setup Wizard vào localStorage
 * ═══════════════════════════════════════════════════════════ */

export interface OnboardingData {
  completed: boolean;
  income: number;            // Thu nhập hàng tháng
  hasDebt: boolean;          // Có nợ không
  riskProfile: "conservative" | "balanced" | "growth" | "";
  setupAt: string;           // ISO date
}

const STORAGE_KEY = "vietfi_onboarding";

const DEFAULT_DATA: OnboardingData = {
  completed: false,
  income: 0,
  hasDebt: false,
  riskProfile: "",
  setupAt: "",
};

export function getOnboardingData(): OnboardingData {
  if (typeof window === "undefined") return DEFAULT_DATA;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_DATA, ...JSON.parse(saved) };
  } catch { /* ignore */ }
  return DEFAULT_DATA;
}

export function saveOnboardingData(data: Partial<OnboardingData>): OnboardingData {
  const current = getOnboardingData();
  const updated = { ...current, ...data };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
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
  localStorage.removeItem(STORAGE_KEY);
  // Also clear related data
  localStorage.removeItem("vietfi_pots");
  localStorage.removeItem("vietfi_expenses");
  localStorage.removeItem("vietfi_income");
  localStorage.removeItem("vietfi_debts");
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
