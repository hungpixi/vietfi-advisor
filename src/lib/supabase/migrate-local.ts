/**
 * One-time migration: localStorage → Supabase
 *
 * Called when a user logs in and has existing localStorage data.
 * Sets `vietfi_migrated` flag to prevent re-running.
 */

import { createClient } from "./client";
import type { BudgetPot } from "./user-data";

const MIGRATION_FLAG = "vietfi_migrated";

export async function migrateLocalStorageToSupabase(
  userId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG) === "true") return;

  const supabase = createClient();

  try {
    // 1. Migrate profile/onboarding
    const onboardingRaw = localStorage.getItem("vietfi_onboarding");
    const income = Number(localStorage.getItem("vietfi_income") ?? 0);

    if (onboardingRaw) {
      const onboarding = JSON.parse(onboardingRaw);
      await supabase.from("profiles").upsert({
        id: userId,
        income: income || onboarding.income || 0,
        has_debt: onboarding.hasDebt ?? false,
        risk_profile: onboarding.riskProfile ?? "",
        setup_at: onboarding.setupAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    } else if (income > 0) {
      await supabase
        .from("profiles")
        .update({ income, updated_at: new Date().toISOString() })
        .eq("id", userId);
    }

    // 2. Migrate budget pots
    const potsRaw = localStorage.getItem("vietfi_pots");
    if (potsRaw) {
      const pots: BudgetPot[] = JSON.parse(potsRaw);
      if (Array.isArray(pots) && pots.length > 0) {
        // Clear existing pots first
        await supabase.from("budget_pots").delete().eq("user_id", userId);
        await supabase.from("budget_pots").insert(
          pots.map((pot, i) => ({
            user_id: userId,
            name: pot.name ?? `Pot ${i + 1}`,
            icon_key: pot.iconKey ?? "Wallet",
            allocated: pot.allocated ?? 0,
            color: pot.color ?? "#E6B84F",
            sort_order: i,
          }))
        );
      }
    }

    // 3. Migrate expenses
    const expensesRaw = localStorage.getItem("vietfi_expenses");
    if (expensesRaw) {
      const expenses = JSON.parse(expensesRaw);
      if (Array.isArray(expenses) && expenses.length > 0) {
        await supabase.from("expenses").insert(
          expenses.slice(0, 500).map((exp: Record<string, unknown>) => ({
            user_id: userId,
            amount: Number(exp.amount) || 0,
            note: String(exp.note ?? ""),
            category: String(exp.category ?? ""),
          }))
        );
      }
    }

    // 4. Migrate gamification
    const gamRaw = localStorage.getItem("vietfi_gamification");
    if (gamRaw) {
      const gam = JSON.parse(gamRaw);
      const lessonsDone = JSON.parse(
        localStorage.getItem("vietfi_lessons_done") ?? "[]"
      );
      const streakFreeze = JSON.parse(
        localStorage.getItem("vietfi_streak_freeze") ?? "{}"
      );

      await supabase.from("gamification").upsert({
        id: userId,
        xp: Math.min(Math.max(Number(gam.xp) || 0, 0), 1_000_000),
        level: Math.min(Math.max(Number(gam.level) || 0, 0), 4),
        level_name: String(gam.levelName || "🐣 Vẹt Teen"),
        streak: Math.min(Math.max(Number(gam.streak) || 0, 0), 365),
        last_active_date: String(gam.lastActiveDate || ""),
        actions: Array.isArray(gam.actions) ? gam.actions : [],
        quest_completed: Boolean(gam.questCompleted),
        lessons_done: Array.isArray(lessonsDone) ? lessonsDone : [],
        streak_freeze: streakFreeze ?? {},
        updated_at: new Date().toISOString(),
      });
    }

    // Mark migration as done
    localStorage.setItem(MIGRATION_FLAG, "true");
    console.log("[VietFi] localStorage → Supabase migration complete");
  } catch (err) {
    console.warn("[VietFi] Migration failed (will retry on next login):", err);
    // Don't set flag — will retry next time
  }
}
