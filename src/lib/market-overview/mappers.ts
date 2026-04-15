import { formatCompactVnd, formatPercent, getZone } from "./formatters";
import type {
    AssetMoodCard,
    AssetOverviewCard,
    MacroCard,
    SentimentDriver,
    TrendSummaryItem,
} from "./types";

function clampMetric(value: number): number {
    return Math.max(8, Math.min(92, Math.round(value)));
}

export function buildSentimentSnapshot(
    newsPayload: { metrics?: { overallNewsScore?: number; assetSentiment?: AssetMoodCard[] } },
    marketSnapshot: { vnIndex?: { changePct?: number } | null; goldSjc?: { changePct?: number } | null; btc?: { changePct24h?: number } | null; usdVnd?: { rate?: number } | null } | null,
    history: Array<{ date: string; score: number }>,
) {
    const score = Math.max(0, Math.min(100, newsPayload.metrics?.overallNewsScore ?? 48));
    const vnChange = marketSnapshot?.vnIndex?.changePct ?? 0;
    const goldChange = marketSnapshot?.goldSjc?.changePct ?? 0;
    const btcChange = marketSnapshot?.btc?.changePct24h ?? 0;
    const fxRate = marketSnapshot?.usdVnd?.rate ?? 25_500;
    const fxPressure = (fxRate - 25_500) / 40;

    const drivers: SentimentDriver[] = [
        { label: "Đà giá", value: clampMetric(score + vnChange * 10), tone: score >= 58 ? "greed" : score <= 42 ? "fear" : "neutral" },
        { label: "Tin tức", value: clampMetric(score + vnChange * 7 - goldChange * 5 + 4), tone: score >= 55 ? "greed" : score <= 40 ? "fear" : "neutral" },
        { label: "Độ rộng", value: clampMetric(score + vnChange * 14 + btcChange * 2), tone: score >= 52 ? "greed" : score <= 38 ? "fear" : "neutral" },
        { label: "Vàng", value: clampMetric(50 - goldChange * 14 + score * 0.18), tone: goldChange > 0.8 ? "fear" : goldChange < -0.4 ? "greed" : "neutral" },
        { label: "Khối ngoại", value: clampMetric(score + vnChange * 8 - fxPressure), tone: score >= 57 ? "greed" : score <= 44 ? "fear" : "neutral" },
    ];

    return {
        score,
        zone: getZone(score),
        history,
        historicalValues: [],
        yearlyExtremes: [],
        assetSentiments: newsPayload.metrics?.assetSentiment ?? [],
        drivers,
    };
}

export function buildAssetCards(snapshot: {
    vnIndex?: { price?: number; changePct?: number } | null;
    goldSjc?: { goldVnd?: number; changePct?: number } | null;
    btc?: { priceUsd?: number; changePct24h?: number } | null;
}): AssetOverviewCard[] {
    return [
        {
            asset: "Chứng khoán",
            price: snapshot.vnIndex?.price?.toLocaleString("en-US", { maximumFractionDigits: 2 }) ?? "--",
            change: snapshot.vnIndex?.changePct ?? 0,
            score: 32,
            trend: (snapshot.vnIndex?.changePct ?? 0) >= 0 ? "up" : "down",
            summary: "Theo dõi VN-Index và định giá blue-chip trước khi tăng tỷ trọng.",
            action: "Ưu tiên giải ngân theo đợt nhỏ nếu dòng tiền cải thiện.",
            color: "#3B82F6",
        },
        {
            asset: "Vàng SJC",
            price: snapshot.goldSjc?.goldVnd ? snapshot.goldSjc.goldVnd.toLocaleString("vi-VN") : "--",
            change: snapshot.goldSjc?.changePct ?? 0,
            score: 72,
            trend: (snapshot.goldSjc?.changePct ?? 0) >= 0 ? "up" : "down",
            summary: "Vàng là lớp phòng thủ khi tâm lý thị trường xấu đi.",
            action: "Nếu đã có vị thế, ưu tiên giữ thay vì FOMO mua đuổi.",
            color: "#F59E0B",
        },
        {
            asset: "Bất động sản",
            price: "45-65tr/m²",
            change: -2.1,
            score: 28,
            trend: "down",
            summary: "Thanh khoản còn yếu, phù hợp theo dõi nhu cầu ở thực hơn là đầu cơ.",
            action: "Giữ kỷ luật tiền mặt, chỉ khảo giá khi có nhu cầu thật.",
            color: "#8B5CF6",
        },
        {
            asset: "Bitcoin",
            price: snapshot.btc?.priceUsd ? `$${snapshot.btc.priceUsd.toLocaleString("en-US")}` : "--",
            change: snapshot.btc?.changePct24h ?? 0,
            score: 48,
            trend: (snapshot.btc?.changePct24h ?? 0) >= 0 ? "up" : "neutral",
            summary: "BTC phản ứng nhanh với khẩu vị rủi ro toàn cầu.",
            action: "Giữ tỷ trọng nhỏ, không để crypto lấn sang quỹ an toàn.",
            color: "#F97316",
        },
    ];
}

export function buildMacroCards(snapshot: {
    macro: { gdpYoY: Array<{ period: string; value: number }>; cpiYoY: Array<{ period: string; value: number }>; deposit12m: { min: number; max: number } };
    usdVnd?: { rate?: number } | null;
}): MacroCard[] {
    return [
        { emoji: "📈", label: "GDP YoY 2025", value: formatPercent(snapshot.macro.gdpYoY[0]?.value ?? 0), trend: "up" },
        { emoji: "⚖️", label: "CPI YoY 2025", value: formatPercent(snapshot.macro.cpiYoY[0]?.value ?? 0), trend: "neutral" },
        { emoji: "🏦", label: "Lãi suất tiền gửi 12T", value: `${snapshot.macro.deposit12m.min.toFixed(1)}-${snapshot.macro.deposit12m.max.toFixed(1)}%`, trend: "neutral" },
        { emoji: "💵", label: "USD/VND", value: snapshot.usdVnd?.rate?.toLocaleString("vi-VN") ?? "--", trend: "neutral" },
    ];
}

export function buildTrendSummary(snapshot: {
    vnIndex?: { changePct?: number } | null;
    goldSjc?: { changePct?: number } | null;
    btc?: { changePct24h?: number } | null;
}): TrendSummaryItem[] {
    return [
        { label: "VN-Index", value: formatPercent(snapshot.vnIndex?.changePct ?? 0) },
        { label: "Vàng SJC", value: formatPercent(snapshot.goldSjc?.changePct ?? 0) },
        { label: "BTC", value: formatPercent(snapshot.btc?.changePct24h ?? 0) },
    ];
}

export function buildMacroNarrative(snapshot: { aiSummary?: string | null; vnIndex?: { changePct?: number } | null; goldSjc?: { goldVnd?: number } | null }): string {
    if (snapshot.aiSummary) return snapshot.aiSummary;
    return `VN-Index ${formatPercent(snapshot.vnIndex?.changePct ?? 0)}, vàng SJC ${formatCompactVnd(snapshot.goldSjc?.goldVnd ?? 0)}.`;
}
