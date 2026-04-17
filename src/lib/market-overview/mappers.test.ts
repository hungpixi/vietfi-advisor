import { describe, expect, it } from "vitest";
import {
    buildAssetCards,
    buildMacroCards,
    buildSentimentSnapshot,
    buildTrendSummary,
} from "./mappers";
import { getZone, formatMarketTime } from "./formatters";

const marketSnapshot = {
    fetchedAt: "2026-04-15T08:30:00.000Z",
    vnIndex: { price: 1245.66, changePct: -1.2 },
    goldSjc: { goldVnd: 121_500_000, changePct: 0.8 },
    usdVnd: { rate: 25880 },
    btc: { priceUsd: 83550, changePct24h: 2.4 },
    macro: {
        gdpYoY: [{ period: "2025", value: 8.02 }],
        cpiYoY: [{ period: "2025", value: 3.31 }],
        deposit12m: { min: 5.2, max: 7.2, source: "CafeF" },
    },
    aiSummary: "VN-Index yếu nhưng vàng và BTC vẫn giữ nhịp.",
} as const;

const newsPayload = {
    metrics: {
        overallNewsScore: 29,
        history: [
            { date: "2026-04-10", score: 45 },
            { date: "2026-04-11", score: 38 },
            { date: "2026-04-12", score: 31 },
        ],
        assetSentiment: [
            { asset: "Chứng khoán", score: 32, trend: "down", news: "Khối ngoại bán ròng" },
            { asset: "Vàng", score: 74, trend: "up", news: "Vàng lập đỉnh ngắn hạn" },
        ],
    },
} as const;

describe("market-overview mappers", () => {
    it("buildSentimentSnapshot derives zone and asset mood cards", () => {
        const sentiment = buildSentimentSnapshot(newsPayload, marketSnapshot, []);

        expect(sentiment.score).toBe(29);
        expect(sentiment.zone.label).toBe("Sợ hãi");
        expect(sentiment.assetSentiments[0].asset).toBe("Chứng khoán");
        expect(sentiment.drivers).toHaveLength(5);
    });

    it("buildAssetCards maps snapshot into 4 comparable cards", () => {
        const cards = buildAssetCards(marketSnapshot);

        expect(cards).toHaveLength(4);
        expect(cards[0].asset).toBe("Chứng khoán");
        expect(cards[1].price).toMatch(/121/);
    });

    it("buildMacroCards exposes GDP, CPI, deposit, and USD/VND", () => {
        const cards = buildMacroCards(marketSnapshot);

        expect(cards.map((card) => card.label)).toEqual([
            "GDP YoY 2025",
            "CPI YoY 2025",
            "Lãi suất tiền gửi 12T",
            "USD/VND",
        ]);
    });

    it("buildTrendSummary returns concise summary rows", () => {
        const summary = buildTrendSummary(marketSnapshot);
        expect(summary).toEqual([
            { label: "VN-Index", value: "-1.20%" },
            { label: "Vàng SJC", value: "+0.80%" },
            { label: "BTC", value: "+2.40%" },
        ]);
    });
});

describe("market-overview formatters", () => {
    it("getZone returns the expected market bucket", () => {
        expect(getZone(29)).toEqual({ label: "Sợ hãi", color: "#ea3943" });
    });

    it("formatMarketTime formats fetchedAt for vi-VN display", () => {
        expect(formatMarketTime("2026-04-15T08:30:00.000Z")).toMatch(/15\/04\/2026|08:30/);
    });
});
