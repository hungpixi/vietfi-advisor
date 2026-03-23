"use client"

import { useState, useEffect, useCallback } from "react"
import type { BudgetData } from "./user-data"
import type { GamificationState } from "@/lib/gamification"
import type { RiskResult } from "@/lib/calculations/risk-scoring"
import type { DebtItem } from "./user-data"

export function useUserBudget(initialData?: BudgetData) {
  const [data, setData] = useState<BudgetData | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return
    setLoading(true)
    import("./user-data")
      .then(({ getBudget }) => getBudget())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
      })
  }, [data])

  const save = useCallback(async (newData: BudgetData) => {
    setLoading(true)
    setError(null)
    try {
      const { setBudget } = await import("./user-data")
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

export function useUserDebts(initialData?: DebtItem[]) {
  const [data, setData] = useState<DebtItem[] | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return
    setLoading(true)
    import("./user-data")
      .then(({ getDebts }) => getDebts())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
      })
  }, [data])

  const save = useCallback(async (newData: DebtItem[]) => {
    setLoading(true)
    setError(null)
    try {
      const { saveDebts } = await import("./user-data")
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

export function useUserGamification(initialData?: GamificationState) {
  const [data, setData] = useState<GamificationState | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return
    setLoading(true)
    import("./user-data")
      .then(({ getGamificationState }) => getGamificationState())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
      })
  }, [data])

  const save = useCallback(async (newData: GamificationState) => {
    setLoading(true)
    setError(null)
    try {
      const { saveGamificationState } = await import("./user-data")
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

export function useUserRiskResult(initialData?: RiskResult) {
  const [data, setData] = useState<RiskResult | null>(initialData ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (data !== null) return
    setLoading(true)
    import("@/lib/storage")
      .then(({ getRiskResult }) => getRiskResult())
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch((e) => {
        setError(e instanceof Error ? e : new Error(String(e)))
        setLoading(false)
      })
  }, [data])

  const save = useCallback(async (newData: RiskResult) => {
    setLoading(true)
    setError(null)
    try {
      const { setRiskResult } = await import("@/lib/storage")
      setRiskResult(newData)
      setData(newData)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, save }
}
