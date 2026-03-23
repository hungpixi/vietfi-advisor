/**
 * One-time migration: localStorage → Supabase
 *
 * Called when a user logs in and has existing localStorage data.
 * Sets `vietfi_migrated` flag to prevent re-running.
 */

import { createClient } from "./client";
import type { BudgetPot } from "./user-data";
import {
  getBudgetPots, getExpenses, getIncome, getOnboardingState,
  getGamificationState, getLessonsDone, getStreakFreeze,
} from "@/lib/storage";

const MIGRATION_FLAG = "vietfi_migrated";

export async function migrateLocalStorageToSupabase(
  userId: string
): Promise<void> {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MIGRATION_FLAG) === "true") return;

  const supabase = createClient();

  try {
    // 1. Migrate profile/onboarding
    const income = getIncome();
    const onboarding = getOnboardingState();

    if (onboarding) {
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
    const pots = getBudgetPots();
    if (pots.length > 0) {
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

    // 3. Migrate expenses
    const expenses = getExpenses();
    if (expenses.length > 0) {
      await supabase.from("expenses").insert(
        expenses.slice(0, 500).map((exp) => ({
          user_id: userId,
          amount: Number(exp.amount) || 0,
          note: String(exp.note ?? ""),
          category: String(exp.category ?? ""),
        }))
      );
    }

    // 4. Migrate gamification
    const gam = getGamificationState();
    if (gam) {
      const lessonsDone = getLessonsDone();
      const streakFreeze = getStreakFreeze();

      await supabase.from("gamification").upsert({
        id: userId,
        xp: Math.min(Math.max(Number(gam.xp) || 0, 0), 1_000_000),
        level: Math.min(Math.max(Number(gam.level) || 0, 0), 4),
        level_name: String(gam.levelName || "🐣 Vẹt Teen"),
        streak: Math.min(Math.max(Number(gam.streak) || 0, 0), 365),
        last_active_date: String(gam.lastActiveDate || ""),
        actions: Array.isArray(gam.actions) ? gam.actions : [],
        quest_completed: Boolean(gam.questCompleted),
        lessons_done: lessonsDone,
        streak_freeze: streakFreeze ?? {},
        updated_at: new Date().toISOString(),
      });
    }

    // Mark migration as done
    localStorage.setItem(MIGRATION_FLAG, "true");
  } catch (err) {
    console.warn("[VietFi] Migration failed (will retry on next login):", err);
    // Don't set flag — will retry next time
  }
}
