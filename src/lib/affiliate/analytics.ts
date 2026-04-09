/* ═══════════════════════════════════════════════════════════
 * Affiliate Analytics — typed event tracking for monetization.
 * Events queued to localStorage first; flushed to analytics endpoint.
 * ═══════════════════════════════════════════════════════════ */

/* ─── Event types ─────────────────────────────────────── */
export type AffiliateEvent =
  | { type: "AFFILIATE_MODAL_SHOWN"; dtiBucket: "low" | "medium" | "high" }
  | { type: "AFFILIATE_CTA_CLICK"; productId: string; productType: "loan" | "insurance" }
  | { type: "AFFILIATE_DISMISSED"; reason: "user" | "auto" }
  | { type: "GOLD_AFFILIATE_CLICK"; vendorId: string }
  | { type: "PREMIUM_SUBSCRIBE"; source: "modal" | "sidebar" }
  | { type: "PREMIUM_CANCEL"; reason?: string }
  | { type: "UNIT_TRUST_VIEW"; fundId: string };

export type AnalyticsEvent = AffiliateEvent;

/* ─── Queue ────────────────────────────────────────────── */
const LS_KEY = "vietfi_analytics_queue";

function isServer() {
  return typeof window === "undefined";
}

function getQueue(): AnalyticsEvent[] {
  if (isServer()) return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as AnalyticsEvent[];
  } catch {
    return [];
  }
}

function saveQueue(queue: AnalyticsEvent[]) {
  if (isServer()) return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(queue));
  } catch {
    // Storage full — drop oldest event
    if (queue.length > 0) saveQueue(queue.slice(1));
  }
}

/**
 * Track an analytics event. Persists to localStorage queue.
 * Queue is flushed to analytics endpoint on app load / page visibility.
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (isServer()) return;
  const queue = getQueue();
  queue.push(event);
  saveQueue(queue);
}

export function flushAnalyticsQueue(): AnalyticsEvent[] {
  if (isServer()) return [];
  const queue = getQueue();
  saveQueue([]);
  return queue;
}

/* ─── DTI bucket helper ────────────────────────────────── */
export function getDtiBucket(dtiRatio: number): "low" | "medium" | "high" {
  if (dtiRatio >= 35) return "high";
  if (dtiRatio >= 20) return "medium";
  return "low";
}
