import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useMarketOverview } from "./useMarketOverview";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { pushSentimentDay, getSentimentHistory } = vi.hoisted(() => ({
    pushSentimentDay: vi.fn(),
    getSentimentHistory: vi.fn(() => ({
        entries: [{ date: "2026-04-14", score: 35, overallZone: "Sợ hãi", topNews: [] }],
        yearlyHigh: { date: "2026-03-01", score: 70 },
        yearlyLow: { date: "2026-04-01", score: 12 },
    })),
}));

vi.mock("../storage", () => ({
    getSentimentHistory,
    pushSentimentDay,
    getRiskResult: () => ({ score: 9 }),
    getIncome: () => 30_000_000,
    getBudgetPots: () => [{ name: "Ăn uống", allocated: 5_000_000 }],
    getDebts: () => [{ min_payment: 3_000_000 }],
}));

describe("useMarketOverview", () => {
    beforeEach(() => {
        mockFetch.mockReset();
        pushSentimentDay.mockReset();
    });

    it("merges news and market payloads into one ready state", async () => {
        mockFetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ metrics: { overallNewsScore: 29, history: [], assetSentiment: [] } }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ fetchedAt: "2026-04-15T08:30:00.000Z", macro: { gdpYoY: [], cpiYoY: [], deposit12m: { min: 5.2, max: 7.2, source: "CafeF" } } }) });

        const { result } = renderHook(() => useMarketOverview());

        await waitFor(() => expect(result.current.status).toBe("ready"));
        expect(result.current.data?.sentiment.score).toBe(29);
    });

    it("persists today sentiment after successful news fetch", async () => {
        mockFetch
            .mockResolvedValueOnce({ ok: true, json: async () => ({ metrics: { overallNewsScore: 29, history: [], assetSentiment: [{ asset: "Vàng", score: 70, trend: "up", news: "Tăng mạnh" }] } }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ fetchedAt: "2026-04-15T08:30:00.000Z", macro: { gdpYoY: [], cpiYoY: [], deposit12m: { min: 5.2, max: 7.2, source: "CafeF" } } }) });

        renderHook(() => useMarketOverview());

        await waitFor(() => expect(pushSentimentDay).toHaveBeenCalledTimes(1));
    });

    it("returns error state when either fetch fails hard", async () => {
        mockFetch.mockRejectedValueOnce(new Error("news down"));

        const { result } = renderHook(() => useMarketOverview());

        await waitFor(() => expect(result.current.status).toBe("error"));
        expect(result.current.error).toMatch(/news down/i);
    });
});
