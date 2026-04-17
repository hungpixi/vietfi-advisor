/**
 * Application Layer — Market Alert Use-Case
 *
 * Orchestrates: domain alert rules + infra storage + browser Notification API.
 * Moved from src/lib/market-alert.ts
 */

import { getMarketAlert, setMarketAlert } from "@/lib/storage";

const ALERT_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4h cooldown

function getCache() {
    return getMarketAlert();
}

function setCache(cache: { lastAlertTime: number; lastAlertMessage: string }) {
    setMarketAlert(cache);
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
        setTimeout(() => n.close(), 8000);
    } catch {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
            navigator.serviceWorker.ready.then((reg) => {
                reg.showNotification(title, { body, icon: "/assets/icon.png", tag: "market-alert" });
            });
        }
    }
}

export interface MarketAlertResult {
    alerted: boolean;
    message: string | null;
}

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

        const vniChange = data.vnIndex?.changePct;
        if (typeof vniChange === "number") {
            if (vniChange <= -2) alerts.push(`📉 VN-Index giảm mạnh ${vniChange.toFixed(1)}%`);
            if (vniChange >= 2) alerts.push(`📈 VN-Index tăng mạnh +${vniChange.toFixed(1)}%`);
        }

        const goldChange = data.goldSjc?.changePct;
        if (typeof goldChange === "number" && Math.abs(goldChange) >= 3) {
            alerts.push(goldChange > 0
                ? `🥇 Vàng SJC tăng mạnh +${goldChange.toFixed(1)}%`
                : `🥇 Vàng SJC giảm mạnh ${goldChange.toFixed(1)}%`);
        }

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
