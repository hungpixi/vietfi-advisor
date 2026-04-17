"use client";

import { useEffect, useRef } from "react";
import { createChart, IChartApi, SeriesMarker, Time, ColorType } from "lightweight-charts";
import type { OHLCVBar } from "@/lib/market-data/price-history";
import type { EquityPoint, Trade } from "@/lib/market-data/backtest-engine";

function fmtCurrencyShort(n: number): string {
    const absN = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if (absN >= 1_000_000_000) return `${sign}${(absN / 1_000_000_000).toFixed(2)}B`;
    if (absN >= 1_000_000) return `${sign}${(absN / 1_000_000).toFixed(2)}M`;
    if (absN >= 1_000) return `${sign}${(absN / 1_000).toFixed(1)}k`;
    return new Intl.NumberFormat('vi-VN').format(n);
}

function fmtPrice(n: number): string {
    return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(Math.round(n * 100) / 100);
}

interface Props {
    ohlcv: OHLCVBar[];
    equity: EquityPoint[];
    trades: Trade[];
}

export default function TradingViewChart({ ohlcv, equity, trades }: Props) {
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<IChartApi | null>(null);

    useEffect(() => {
        if (!chartContainerRef.current) return;
        if (!ohlcv || ohlcv.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: 'rgba(255, 255, 255, 0.5)',
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.04)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.04)' },
            },
            crosshair: {
                mode: 1, // Normal
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                autoScale: true,
                alignLabels: false,
                scaleMargins: {
                    top: 0.05,
                    bottom: 0.25, // Give room for drawdown chart below
                }
            },
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                rightOffset: 5,
            },
            autoSize: true,
        });

        chartRef.current = chart;

        // 1. Candlestick Series (Right Scale - Default)
        const candlestickSeries = chart.addCandlestickSeries({
            upColor: '#10B981',
            downColor: '#EF4444',
            borderVisible: false,
            wickUpColor: '#10B981',
            wickDownColor: '#EF4444',
            priceFormat: {
                type: 'custom',
                formatter: fmtPrice,
                minMove: 0.01,
            },
        });

        const candleData = ohlcv.map(b => ({
            time: (b.date.indexOf("T") > -1 ? b.date.split("T")[0] : b.date) as Time,
            open: b.open,
            high: b.high,
            low: b.low,
            close: b.close,
        }));

        candlestickSeries.setData(candleData);

        // Map trades to markers
        // Validate trades to ensure they fall on valid times in the chart
        const validTimes = new Set(candleData.map(c => c.time));
        const markers: SeriesMarker<Time>[] = [];

        trades.forEach(t => {
            const timeStr = (t.date.indexOf("T") > -1 ? t.date.split("T")[0] : t.date) as Time;
            if (validTimes.has(timeStr)) {
                let text = t.type === "BUY" ? 'Mua' : 'Bán';
                if (t.type === "SELL" && t.pnl !== undefined) {
                    text += `\n${t.pnl >= 0 ? '+' : ''}${fmtCurrencyShort(t.pnl)}`;
                }
                markers.push({
                    time: timeStr,
                    position: t.type === "BUY" ? 'belowBar' : 'aboveBar',
                    color: t.type === "BUY" ? '#10B981' : '#EF4444',
                    shape: t.type === "BUY" ? 'arrowUp' : 'arrowDown',
                    text: text,
                    size: 1,
                });
            }
        });

        // Lightweight-charts requires markers to be sorted by time
        markers.sort((a, b) => (a.time as string).localeCompare(b.time as string));
        candlestickSeries.setMarkers(markers);

        // 2. Equity Line Series (Left Scale)
        chart.priceScale('left').applyOptions({
            autoScale: true,
            visible: true,
            scaleMargins: {
                top: 0.05,
                bottom: 0.25, // Sync with right scale
            },
            borderColor: 'rgba(255, 255, 255, 0.1)'
        });

        const equitySeries = chart.addAreaSeries({
            lineColor: '#E6B84F',
            topColor: 'rgba(230, 184, 79, 0.3)',
            bottomColor: 'rgba(230, 184, 79, 0.0)',
            lineWidth: 2,
            priceScaleId: 'left',
            priceFormat: {
                type: 'custom',
                formatter: fmtCurrencyShort,
                minMove: 1,
            },
        });

        const equityData = equity.map(e => ({
            time: (e.date.indexOf("T") > -1 ? e.date.split("T")[0] : e.date) as Time,
            value: e.equity,
        }));
        equitySeries.setData(equityData);

        // 3. Benchmark Line Series (Left Scale)
        const benchmarkSeries = chart.addLineSeries({
            color: 'rgba(156, 163, 175, 0.4)', // Gray-400 with 40% opacity
            lineWidth: 2,
            lineStyle: 1, // 1 = Dotted, 2 = Dashed
            priceScaleId: 'left',
            priceFormat: {
                type: 'custom',
                formatter: fmtCurrencyShort,
                minMove: 1,
            },
        });

        const benchmarkData = equity.map(e => ({
            time: (e.date.indexOf("T") > -1 ? e.date.split("T")[0] : e.date) as Time,
            value: e.benchmark,
        }));
        benchmarkSeries.setData(benchmarkData);

        // 4. Drawdown Series (Custom Bottom Scale)
        const drawdownSeries = chart.addAreaSeries({
            lineColor: '#EF4444',
            topColor: 'rgba(239, 68, 68, 0.0)',     // Since it's negative, 0 is top
            bottomColor: 'rgba(239, 68, 68, 0.3)',  // Negative values are at bottom
            lineWidth: 1,
            priceScaleId: 'drawdown',
            priceFormat: {
                type: 'custom',
                formatter: (price: number) => price.toFixed(1) + '%',
                minMove: 0.1,
            },
        });

        chart.priceScale('drawdown').applyOptions({
            autoScale: true,
            visible: true,
            scaleMargins: {
                top: 0.8,
                bottom: 0.0,
            },
            borderColor: 'rgba(255, 255, 255, 0.1)',
        });

        const drawdownData: { time: Time, value: number }[] = [];
        let peak = equity.length > 0 ? equity[0].equity : 0;
        equity.forEach(e => {
            if (e.equity > peak) peak = e.equity;
            const dd = peak > 0 ? ((peak - e.equity) / peak) * 100 : 0;
            const timeStr = (e.date.indexOf("T") > -1 ? e.date.split("T")[0] : e.date) as Time;
            drawdownData.push({ time: timeStr, value: -dd });
        });
        drawdownSeries.setData(drawdownData);

        return () => {
            chart.remove();
        };
    }, [ohlcv, equity, trades]);

    return (
        <div className="w-full h-full relative" style={{ minHeight: '100%' }}>
            <div ref={chartContainerRef} className="absolute inset-0" />
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 text-[11px] bg-[#1E222D]/80 p-3 rounded-lg border border-white/5 shadow-lg backdrop-blur-md pointer-events-none">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-0.5 bg-[#E6B84F]"></div>
                    <span className="text-gray-300 font-medium">Tài khoản (Trục trái)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-[1px] bg-gray-400 border-b border-dashed border-gray-400"></div>
                    <span className="text-gray-400">Benchmark (Trục trái)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-2 bg-[#10B981] rounded-sm"></div>
                    <span className="text-gray-300 font-medium">Giá nến (Trục phải)</span>
                </div>
                <div className="flex items-center gap-2 mt-1 pt-1 border-t border-white/5">
                    <div className="w-3 h-3 bg-[#EF4444]/30 border-t border-[#EF4444]"></div>
                    <span className="text-gray-400">Sụt giảm / Drawdown</span>
                </div>
            </div>
        </div>
    );
}
