"use client";

import { useEffect, useMemo, useState } from "react";
import {
    getBudgetPots,
    getDebts,
    getIncome,
    getRiskResult,
    getSentimentHistory,
    pushSentimentDay,
} from "@/lib/storage";
import {
    buildAssetCards,
    buildMacroCards,
    buildMacroNarrative,
    buildSentimentSnapshot,
    buildTrendSummary,
} from "./mappers";
import { formatMarketTime } from "./formatters";

type HookState =
    | { status: "loading"; data: null; error: null }
    | { status: "error"; data: null; error: string }
    | { status: "ready"; data: Record<string, unknown>; error: null };

function buildPersonalizedAlert() {
    const income = getIncome();
    const pots = getBudgetPots();
    const debts = getDebts();
    const risk = getRiskResult();
    const essentials = pots.reduce((sum, pot) => sum + (pot.allocated ?? 0), 0);
    const debtMin = debts.reduce((sum, debt) => sum + (debt.min_payment ?? 0), 0);
    const freeCashflow = income - essentials - debtMin;

    if (freeCashflow < 0) return { type: "danger" as const, icon: "🚨", msg: "Dòng tiền âm. Đừng cố đầu tư hăng hơn thị trường." };
    if ((risk?.score ?? 0) <= 6) return { type: "balanced" as const, icon: "🛡️", msg: "Ưu tiên vốn an toàn, chỉ quan sát cơ hội rõ ràng." };
    return { type: "safe" as const, icon: "📊", msg: "Bạn còn dòng tiền rảnh. Có thể giải ngân theo lớp tài sản phù hợp khẩu vị rủi ro." };
}

export function useMarketOverview() {
    const [state, setState] = useState<HookState>({ status: "loading", data: null, error: null });

    useEffect(() => {
        let active = true;

        async function load() {
            try {
                const [newsResp, marketResp] = await Promise.all([
                    fetch("/api/news", { cache: "no-store" }),
                    fetch("/api/market-data", { cache: "no-store" }),
                ]);

                if (!newsResp.ok) throw new Error(`news ${newsResp.status}`);
                if (!marketResp.ok) throw new Error(`market ${marketResp.status}`);

                const newsPayload = await newsResp.json();
                const marketSnapshot = await marketResp.json();
                const stored = getSentimentHistory();
                const history = (stored.entries ?? []).slice(-16).map((entry: { date: string; score: number }) => ({
                    date: new Date(entry.date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }),
                    score: entry.score,
                    vnindex: marketSnapshot.vnIndex?.price,
                }));

                const sentiment = buildSentimentSnapshot(newsPayload, marketSnapshot, history);
                pushSentimentDay({
                    date: new Date().toISOString().slice(0, 10),
                    score: sentiment.score,
                    overallZone: sentiment.zone.label,
                    topNews: sentiment.assetSentiments.slice(0, 3).map((item) => item.news),
                });

                const data = {
                    lastUpdated: formatMarketTime(marketSnapshot.fetchedAt),
                    stale: Boolean(newsPayload.stale || marketSnapshot.stale),
                    sentiment,
                    assets: {
                        cards: buildAssetCards(marketSnapshot),
                        trendData: [],
                        opportunities: [],
                        personalizedAlert: buildPersonalizedAlert(),
                    },
                    macro: {
                        cards: buildMacroCards(marketSnapshot),
                        commentary: buildMacroNarrative(marketSnapshot),
                        trendSummary: buildTrendSummary(marketSnapshot),
                    },
                };

                if (active) setState({ status: "ready", data, error: null });
            } catch (error) {
                if (active) setState({ status: "error", data: null, error: error instanceof Error ? error.message : "Unknown error" });
            }
        }

        load();
        return () => {
            active = false;
        };
    }, []);

    return useMemo(() => state, [state]);
}
