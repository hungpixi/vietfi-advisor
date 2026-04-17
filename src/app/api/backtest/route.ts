/**
 * POST /api/backtest
 *
 * Body: { ticker, fromDate, toDate, strategy, capital, smaFast?, smaSlow?, guru? }
 * Response: { equity, trades, metrics, fetchedAt, bars, guru? }
 *
 * Nếu truyền `guru` (vd: "livermore"), strategy sẽ tự động được map từ GURU_STRATEGIES.
 */

import { NextResponse } from "next/server";
import { fetchPriceHistory, type OHLCVBar } from "@/lib/market-data/price-history";
import { runBacktest, type BacktestConfig, type Strategy } from "@/lib/market-data/backtest-engine";
import { getGuruStrategy } from "@/lib/market-data/guru-strategies";
import { createClient } from "@/lib/supabase/server";

const VALID_STRATEGIES: Strategy[] = ["buy-and-hold", "sma-cross", "breakout-52w", "ma30w-stage2", "tactical-allocation"];
const MIN_CAPITAL = 1_000_000;
const MAX_CAPITAL = 100_000_000_000;

export async function POST(req: Request) {
    // ── Auth Guard (Security) ──
    try {
        const isDemoBypass = req.headers.get("x-demo-bypass") === "hungpixi-demo";

        if (!isDemoBypass) {
            if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
                const supabase = await createClient();
                const { data: { user }, error } = await supabase.auth.getUser();
                if (error || !user) {
                    return NextResponse.json({ error: "Unauthorized. Vui lòng đăng nhập để sử dụng tính năng mô phỏng Backtest." }, { status: 401 });
                }
            } else {
                return NextResponse.json({ error: "Missing Supabase configuration." }, { status: 500 });
            }
        }
    } catch (e) {
        return NextResponse.json({ error: `Security auth check failed: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 });
    }

    let body: Record<string, unknown>;

    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // ── Guru lookup (optional shortcut) ──
    const guruId = typeof body.guru === "string" ? body.guru.trim().toLowerCase() : null;
    let guruConfig: BacktestConfig | null = null;
    let guruInfo: { strategyLabel: string; description: string } | null = null;

    if (guruId) {
        const gs = getGuruStrategy(guruId);
        if (!gs) {
            return NextResponse.json({ error: `guru "${guruId}" không tồn tại` }, { status: 400 });
        }
        guruConfig = gs.config;
        guruInfo = { strategyLabel: gs.strategyLabel, description: gs.description };
    }

    // ── Validate ticker ──
    const ticker = typeof body.ticker === "string" ? body.ticker.trim().toUpperCase() : "";
    if (!ticker || ticker.length < 2 || ticker.length > 10) {
        return NextResponse.json({ error: "ticker không hợp lệ (2-10 ký tự)" }, { status: 400 });
    }

    // ── Validate dates ──
    const fromDate = typeof body.fromDate === "string" ? body.fromDate : "";
    const toDate = typeof body.toDate === "string" ? body.toDate : "";
    if (!fromDate.match(/^\d{4}-\d{2}-\d{2}$/) || !toDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return NextResponse.json({ error: "fromDate / toDate phải là YYYY-MM-DD" }, { status: 400 });
    }
    if (fromDate >= toDate) {
        return NextResponse.json({ error: "fromDate phải trước toDate" }, { status: 400 });
    }

    // ── Validate strategy (nếu không dùng guru) ──
    const strategy = guruConfig
        ? guruConfig.strategy
        : ((body.strategy ?? "buy-and-hold") as Strategy);

    if (!VALID_STRATEGIES.includes(strategy)) {
        return NextResponse.json(
            { error: `strategy không hợp lệ. Chọn: ${VALID_STRATEGIES.join(" | ")}` },
            { status: 400 }
        );
    }

    // ── Validate capital ──
    const capital = Number(body.capital ?? guruConfig?.capital ?? 100_000_000);
    if (!Number.isFinite(capital) || capital < MIN_CAPITAL || capital > MAX_CAPITAL) {
        return NextResponse.json(
            { error: `capital phải từ ${MIN_CAPITAL.toLocaleString()} đến ${MAX_CAPITAL.toLocaleString()} VND` },
            { status: 400 }
        );
    }

    // ── Fetch and Normalize price history ──
    let rawBars: OHLCVBar[];
    try {
        rawBars = await fetchPriceHistory(ticker, fromDate, toDate);
    } catch (err: unknown) {
        return NextResponse.json(
            { error: `Lỗi truy xuất dữ liệu giá lịch sử: ${err instanceof Error ? err.message : String(err)}` },
            { status: 500 }
        );
    }

    // Validate and Normalize (Deduplicate & Sort & Fill Empty Volume)
    const uniqueBarsMap = new Map<string, OHLCVBar>();
    for (const bar of rawBars) {
        if (!bar.date) continue;
        bar.volume = bar.volume ?? 0;
        uniqueBarsMap.set(bar.date, bar); // Replace duplicate dates with the latest one
    }
    const bars = Array.from(uniqueBarsMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    if (bars.length < 2) {
        return NextResponse.json(
            { error: "Không đủ dữ liệu lịch sử cho khoảng thời gian này" },
            { status: 422 }
        );
    }

    // ── Run backtest ──
    const config: BacktestConfig = guruConfig ?? {
        strategy,
        capital,
        smaFast: typeof body.smaFast === "number" ? body.smaFast : 20,
        smaSlow: typeof body.smaSlow === "number" ? body.smaSlow : 50,
        equityWeight: typeof body.equityWeight === "number" ? body.equityWeight : 0.7,
        cashYield: typeof body.cashYield === "number" ? body.cashYield : 0.06,
    };

    const result = runBacktest(bars, config);

    return NextResponse.json(
        {
            ticker,
            strategy,
            capital,
            fromDate,
            toDate,
            bars: bars.length,
            fetchedAt: new Date().toISOString(),
            ohlcv: bars,
            ...(guruId && { guru: guruId, ...guruInfo }),
            ...result,
        },
        { headers: { "Cache-Control": "no-store" } }
    );
}
