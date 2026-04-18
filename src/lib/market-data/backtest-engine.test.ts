/**
 * Unit tests — backtest-engine.ts
 * Chạy: npm run test:run -- src/lib/market-data/backtest-engine.test.ts
 */

import { describe, it, expect } from "vitest";
import { runBacktest } from "./backtest-engine";
import type { OHLCVBar } from "./price-history";

// ── Helpers ──

function makeBars(closes: number[], startDate = "2024-01-01"): OHLCVBar[] {
    return closes.map((close, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i * 7); // weekly
        return {
            date: d.toISOString().slice(0, 10),
            open: close,
            high: close * 1.01,
            low: close * 0.99,
            close,
            volume: 1_000_000,
        };
    });
}

// ── Buy and Hold ──

describe("runBacktest — buy-and-hold", () => {
    it("trả về equity curve có độ dài bằng số bars", () => {
        const bars = makeBars([100, 110, 120, 130, 140]);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(result.equity).toHaveLength(bars.length);
    });

    it("vốn cuối > vốn đầu khi giá tăng", () => {
        const bars = makeBars([100, 110, 120, 130, 140]);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(result.metrics.finalCapital).toBeGreaterThan(10_000_000);
    });

    it("totalReturn dương khi giá tăng", () => {
        const bars = makeBars([100, 110, 120, 130, 140]);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(result.metrics.totalReturn).toBeGreaterThan(0);
    });

    it("totalReturn âm khi giá giảm", () => {
        const bars = makeBars([140, 130, 120, 110, 100]);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(result.metrics.totalReturn).toBeLessThan(0);
    });

    it("maxDrawdown = 0 khi giá luôn tăng", () => {
        const bars = makeBars([100, 110, 120, 130, 140]);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(result.metrics.maxDrawdown).toBeCloseTo(0, 1);
    });

    it("maxDrawdown > 0 khi giá giảm rồi tăng", () => {
        const bars = makeBars([100, 120, 80, 90, 100]);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(result.metrics.maxDrawdown).toBeGreaterThan(0);
    });

    it("numTrades = 1 (chỉ buy 1 lần)", () => {
        const bars = makeBars([100, 110, 120]);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(result.metrics.numTrades).toBe(1);
        expect(result.trades[0].type).toBe("BUY");
    });

    it("giá flat → totalReturn gần 0", () => {
        const bars = makeBars([100, 100, 100, 100, 100]);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(Math.abs(result.metrics.totalReturn)).toBeLessThan(1);
    });

    it("single bar → equity length = 1", () => {
        const bars = makeBars([100]);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(result.equity).toHaveLength(1);
    });

    it("CAGR hợp lý: ~ +40% cho 1 năm tăng 40%", () => {
        // 252 bars ≈ 1 năm, giá tăng từ 100→140 (+40%)
        const closes = Array.from({ length: 252 }, (_, i) => 100 + i * (40 / 252));
        const bars = makeBars(closes);
        const result = runBacktest(bars, { strategy: "buy-and-hold", capital: 10_000_000 });
        expect(result.metrics.cagr).toBeGreaterThan(30);
        expect(result.metrics.cagr).toBeLessThan(50);
    });
});

// ── SMA Cross ──

describe("runBacktest — sma-cross", () => {
    it("trả về equity curve có độ dài bằng số bars", () => {
        const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.3) * 20);
        const bars = makeBars(closes);
        const result = runBacktest(bars, { strategy: "sma-cross", capital: 10_000_000, smaFast: 5, smaSlow: 10 });
        expect(result.equity).toHaveLength(bars.length);
    });

    it("không có trade khi bars quá ít (< smaSlow)", () => {
        const bars = makeBars([100, 110, 120]);
        const result = runBacktest(bars, { strategy: "sma-cross", capital: 10_000_000, smaFast: 5, smaSlow: 10 });
        // Bars < smaSlow → empty result
        expect(result.trades).toHaveLength(0);
    });

    it("winRate trong khoảng [0, 100]", () => {
        const closes = Array.from({ length: 60 }, (_, i) => 100 + Math.sin(i * 0.5) * 30);
        const bars = makeBars(closes);
        const result = runBacktest(bars, { strategy: "sma-cross", capital: 10_000_000, smaFast: 5, smaSlow: 15 });
        expect(result.metrics.winRate).toBeGreaterThanOrEqual(0);
        expect(result.metrics.winRate).toBeLessThanOrEqual(100);
    });

    it("benchmark theo dõi buy-and-hold", () => {
        const closes = Array.from({ length: 60 }, (_, i) => 100 + i);
        const bars = makeBars(closes);
        const result = runBacktest(bars, { strategy: "sma-cross", capital: 10_000_000, smaFast: 5, smaSlow: 10 });
        // Benchmark cuối phải > benchmark đầu vì giá tăng
        const lastBm = result.equity[result.equity.length - 1]?.benchmark ?? 0;
        const firstBm = result.equity[0]?.benchmark ?? 0;
        expect(lastBm).toBeGreaterThan(firstBm);
    });
});

// ── WQ Alpha Mean Reversion ──

describe("runBacktest — wq-mean-reversion", () => {
    it("trả về empty list nếu số bar nhỏ hơn lookback", () => {
        const bars = makeBars([100, 110, 120]);
        const result = runBacktest(bars, { strategy: "wq-mean-reversion", capital: 10_000_000, wqLookback: 10 });
        expect(result.trades).toHaveLength(0);
    });

    it("mua khi giá giảm sâu dưới threshold", () => {
        const closes = Array.from({ length: 20 }, () => 100);
        closes.push(95);
        closes.push(105);
        const bars = makeBars(closes);
        const result = runBacktest(bars, { strategy: "wq-mean-reversion", capital: 100_000_000, wqLookback: 10, wqThreshold: -0.5 });
        expect(result.trades.length).toBeGreaterThan(0);
        expect(result.trades[0].type).toBe("BUY");
    });
});

// ── WQ Volatility Breakout ──

describe("runBacktest — wq-vol-breakout", () => {
    it("mua khi volume đột biến và giá tăng", () => {
        const closes = Array.from({ length: 20 }, (_, i) => 100 + i);
        const bars = makeBars(closes);
        bars[18].volume = 5_000_000;
        const result = runBacktest(bars, { strategy: "wq-vol-breakout", capital: 100_000_000, wqLookback: 10, wqThreshold: 2.0 });
        expect(result.trades.length).toBeGreaterThan(0);
        expect(result.trades[0].type).toBe("BUY");
    });
});

