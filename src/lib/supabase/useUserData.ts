"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  BudgetData,
  DebtItem,
} from "@/lib/supabase/user-data"
import type { OnboardingData } from "@/lib/onboarding-state"
import type { GamificationState } from "@/lib/gamification"

// ── Query Keys ─────────────────────────────────────────────────────────

export const QueryKeys = {
  profile: ["user", "profile"] as const,
  budgetPots: ["user", "budget", "pots"] as const,
  expenses: ["user", "budget", "expenses"] as const,
  budget: ["user", "budget"] as const,
  debts: ["user", "debts"] as const,
  gamification: ["user", "gamification"] as const,
} as const

// ── React Query Hooks ─────────────────────────────────────────────────

/**
 * useUserProfile — React Query wrapper for user profile data
 * Cache: 5 min stale, 10 min gc, refetch on mount
 */
export function useUserProfile() {
  return useQuery({
    queryKey: QueryKeys.profile,
    queryFn: async () => {
      const { getUserProfile } = await import("@/lib/supabase/user-data")
      return getUserProfile()
    },
  })
}

/**
 * useBudgetPots — React Query wrapper for budget pots
 * Cache: 5 min stale, 10 min gc
 */
export function useBudgetPots() {
  return useQuery({
    queryKey: QueryKeys.budgetPots,
    queryFn: async () => {
      const { getBudgetPots } = await import("@/lib/supabase/user-data")
      return getBudgetPots()
    },
  })
}

/**
 * useExpenses — React Query wrapper for expenses
 * Cache: 5 min stale, 10 min gc
 */
export function useExpenses() {
  return useQuery({
    queryKey: QueryKeys.expenses,
    queryFn: async () => {
      const { getExpenses } = await import("@/lib/supabase/user-data")
      return getExpenses()
    },
  })
}

/**
 * useBudget — React Query wrapper using OPTIMIZED batch read
 * Fetches pots + expenses in single DB round-trip
 * Cache: 5 min stale, 10 min gc
 */
export function useBudget() {
  return useQuery({
    queryKey: QueryKeys.budget,
    queryFn: async () => {
      const { getBudget } = await import("@/lib/supabase/user-data")
      return getBudget()
    },
  })
}

/**
 * useDebts — React Query wrapper for user debts
 * Cache: 5 min stale, 10 min gc
 */
export function useDebts() {
  return useQuery({
    queryKey: QueryKeys.debts,
    queryFn: async () => {
      const { getDebts } = await import("@/lib/supabase/user-data")
      return getDebts()
    },
  })
}

/**
 * useGamification — React Query wrapper for gamification state
 * Cache: 5 min stale, 10 min gc
 */
export function useGamification() {
  return useQuery({
    queryKey: QueryKeys.gamification,
    queryFn: async () => {
      const { getGamificationState } = await import("@/lib/supabase/user-data")
      return getGamificationState()
    },
  })
}

// ── Mutation Hooks ────────────────────────────────────────────────────

/**
 * useSaveBudget — Mutation hook for saving budget (pots + expenses)
 * Invalidates related queries on success
 */
export function useSaveBudget() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (budget: BudgetData) => {
      const { setBudget } = await import("@/lib/supabase/user-data")
      return setBudget(budget)
    },
    onSuccess: () => {
      // Invalidate all budget-related queries
      queryClient.invalidateQueries({ queryKey: QueryKeys.budget })
      queryClient.invalidateQueries({ queryKey: QueryKeys.budgetPots })
      queryClient.invalidateQueries({ queryKey: QueryKeys.expenses })
    },
  })
}

/**
 * useSaveDebts — Mutation hook for saving debts
 * Invalidates debts query on success
 */
export function useSaveDebts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (debts: DebtItem[]) => {
      const { saveDebts } = await import("@/lib/supabase/user-data")
      return saveDebts(debts)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.debts })
    },
  })
}

/**
 * useSaveGamification — Mutation hook for saving gamification state
 * Invalidates gamification query on success
 */
export function useSaveGamification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (state: GamificationState) => {
      const { saveGamificationState } = await import("@/lib/supabase/user-data")
      return saveGamificationState(state)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.gamification })
    },
  })
}

/**
 * useSaveProfile — Mutation hook for saving user profile
 * Invalidates profile query on success
 */
export function useSaveProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (profile: Partial<OnboardingData>) => {
      const { saveUserProfile } = await import("@/lib/supabase/user-data")
      return saveUserProfile(profile)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QueryKeys.profile })
    },
  })
}

// ── Legacy Hooks (kept for backward compatibility) ────────────────────

/* ─── Budget (legacy) ─────────────────────────────────────── */

export function useUserBudget(initialData?: BudgetData | null) {
  const [data, setData] = useState<BudgetData | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return
    setLoading(true)
    import("@/lib/supabase/user-data")
      .then(({ getBudget }) =>
        getBudget()
          .then(d => { setData(d); setLoading(false) })
          .catch(e => { setError(e instanceof Error ? e : new Error(String(e))); setLoading(false) })
      )
  }, [data])

  const save = useCallback(async (newData: BudgetData) => {
    setLoading(true)
    setError(null)
    try {
      const { setBudget } = await import("@/lib/supabase/user-data")
      await setBudget(newData)
      setData(newData)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, save }
}

/* ─── Debts (legacy) ────────────────────────────────────────── */

export function useUserDebts(initialData?: DebtItem[] | null) {
  const [data, setData] = useState<DebtItem[] | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return
    setLoading(true)
    import("@/lib/supabase/user-data")
      .then(({ getDebts }) =>
        getDebts()
          .then(d => { setData(d); setLoading(false) })
          .catch(e => { setError(e instanceof Error ? e : new Error(String(e))); setLoading(false) })
      )
  }, [data])

  const save = useCallback(async (newData: DebtItem[]) => {
    setLoading(true)
    setError(null)
    try {
      const { saveDebts } = await import("@/lib/supabase/user-data")
      await saveDebts(newData)
      setData(newData)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, save }
}

/* ─── Gamification (legacy) ─────────────────────────────────────── */

export function useUserGamification(initialData?: GamificationState | null) {
  const [data, setData] = useState<GamificationState | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return
    setLoading(true)
    import("@/lib/supabase/user-data")
      .then(({ getGamificationState }) =>
        getGamificationState()
          .then(d => { setData(d); setLoading(false) })
          .catch(e => { setError(e instanceof Error ? e : new Error(String(e))); setLoading(false) })
      )
  }, [data])

  const save = useCallback(async (newData: GamificationState) => {
    setLoading(true)
    setError(null)
    try {
      const { saveGamificationState } = await import("@/lib/supabase/user-data")
      await saveGamificationState(newData)
      setData(newData)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, save }
}
