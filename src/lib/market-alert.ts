/**
 * Market Alert — Client-side volatility notification
 * 
 * Không cần cron — check mỗi khi user mở app.
 * Nếu VN-Index biến động mạnh (±2%) hoặc Vàng ±3% → hiện browser notification.
 */

const ALERT_CACHE_KEY = "vietfi_market_alert";
const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 giờ cooldown giữa 2 alert

interface AlertCache {
  lastAlertTime: number;
  lastAlertMessage: string;
}

function getCache(): AlertCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ALERT_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function setCache(cache: AlertCache) {
  localStorage.setItem(ALERT_CACHE_KEY, JSON.stringify(cache));
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function getNotificationStatus(): "granted" | "denied" | "default" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function showNotification(title: string, body: string) {
  if (Notification.permission !== "granted") return;
  try {
    const n = new Notification(title, {
      body,
      icon: "/assets/icon.png",
      badge: "/assets/icon.png",
      tag: "market-alert",
    });
    // Auto close after 8s
    setTimeout(() => n.close(), 8000);
  } catch {
    // SW notification fallback for mobile
    if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.ready.then(reg => {
        reg.showNotification(title, { body, icon: "/assets/icon.png", tag: "market-alert" });
      });
    }
  }
}

interface MarketAlertResult {
  alerted: boolean;
  message: string | null;
}

/**
 * Check market data for significant moves and notify user.
 * Call this once on app load (e.g., in dashboard layout useEffect).
 */
export async function checkMarketAlerts(): Promise<MarketAlertResult> {
  const cache = getCache();
  if (cache && Date.now() - cache.lastAlertTime < ALERT_COOLDOWN_MS) {
    return { alerted: false, message: null };
  }

  try {
    const resp = await fetch("/api/market-data", { cache: "no-store" });
    if (!resp.ok) return { alerted: false, message: null };
    const data = await resp.json();

    const alerts: string[] = [];

    // VN-Index ±2%
    const vniChange = data.vnIndex?.changePct;
    if (typeof vniChange === "number") {
      if (vniChange <= -2) alerts.push(`📉 VN-Index giảm mạnh ${vniChange.toFixed(1)}%`);
      if (vniChange >= 2) alerts.push(`📈 VN-Index tăng mạnh +${vniChange.toFixed(1)}%`);
    }

    // Vàng ±3%
    const goldChange = data.goldSjc?.changePct;
    if (typeof goldChange === "number") {
      if (Math.abs(goldChange) >= 3) {
        alerts.push(goldChange > 0
          ? `🥇 Vàng SJC tăng mạnh +${goldChange.toFixed(1)}%`
          : `🥇 Vàng SJC giảm mạnh ${goldChange.toFixed(1)}%`);
      }
    }

    // BTC ±5%
    const btcChange = data.btcUsdt?.changePct24h;
    if (typeof btcChange === "number" && Math.abs(btcChange) >= 5) {
      alerts.push(btcChange > 0
        ? `₿ Bitcoin tăng +${btcChange.toFixed(1)}% trong 24h`
        : `₿ Bitcoin giảm ${btcChange.toFixed(1)}% trong 24h`);
    }

    if (alerts.length > 0) {
      const message = alerts.join(" | ");
      showNotification("⚡ VietFi — Cảnh báo thị trường", message);
      setCache({ lastAlertTime: Date.now(), lastAlertMessage: message });
      return { alerted: true, message };
    }

    return { alerted: false, message: null };
  } catch {
    return { alerted: false, message: null };
  }
}
