"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
    FlaskConical, Play, Loader2, TrendingUp, TrendingDown,
    AlertTriangle, BarChart3, Percent, ArrowUpDown,
    ChevronDown, ChevronUp, ArrowLeft, Save, Trash2, FolderOpen,
} from "lucide-react";

import { cn } from "@/lib/utils";
import RequireTier from "@/components/gamification/RequireTier";
import { UserRole } from "@/lib/rbac";
import { addXP } from "@/lib/gamification";
import { GURU_PERSONAS } from "@/lib/guru-personas";
import { GURU_STRATEGIES } from "@/lib/market-data/guru-strategies";
import {
    getSavedStrategies, saveStrategy, deleteStrategy,
    type SavedStrategy,
} from "@/lib/saved-strategies";
import type { BacktestResult, BacktestMetrics, Trade, Strategy } from "@/lib/market-data/backtest-engine";
import type { OHLCVBar } from "@/lib/market-data/price-history";
import { CyberHeader, CyberSubHeader } from "@/components/ui/CyberTypography";
import dynamic from "next/dynamic";

const TradingViewChart = dynamic(
    () => import("@/components/charts/TradingViewChart"),
    { ssr: false, loading: () => <div className="animate-pulse bg-white/5 w-full h-full rounded-2xl"></div> }
);

/* ─── Types ─── */


interface BacktestResponse extends BacktestResult {
    ticker: string;
    strategy: Strategy;
    capital: number;
    fromDate: string;
    toDate: string;
    bars: number;
    fetchedAt: string;
    guru?: string;
    strategyLabel?: string;
    ohlcv?: OHLCVBar[];
}

/* ─── Guru Presets ─── */
const GURU_OPTIONS = Object.values(GURU_STRATEGIES).map((gs) => ({
    value: gs.guruId,
    label: `${GURU_PERSONAS[gs.guruId]?.avatar ?? "🧠"} ${GURU_PERSONAS[gs.guruId]?.name ?? gs.guruId}`,
    strategyLabel: gs.strategyLabel,
    description: gs.description,
}));

const CUSTOM_STRATEGY_OPTIONS: { value: Strategy; label: string; description: string }[] = [
    { value: "buy-and-hold", label: "Buy & Hold", description: "Mua và giữ toàn bộ vốn từ đầu đến cuối" },
    { value: "sma-cross", label: "SMA Crossover", description: "Mua khi SMA nhanh cắt lên SMA chậm" },
    { value: "breakout-52w", label: "Breakout 52 Tuần", description: "Mua khi giá vượt đỉnh 52 tuần, cắt lỗ -8%" },
    { value: "ma30w-stage2", label: "MA30 Giai Đoạn 2", description: "Mua khi giá vượt MA30 và MA30 đang hướng lên" },
    { value: "tactical-allocation", label: "Phân bổ TCBS (70% Cổ / 30% Tiền)", description: "Giữ 70% Cổ & 30% Tiền gửi 6%. Gãy MA40 (200 ngày) -> Bán 100% ra Tiền gửi" },
];

const TICKER_SUGGESTIONS = ["FPT", "VCB", "VNM", "HPG", "MBB", "ACB", "TCB", "VHM", "SSI", "MWG"];

/* ─── Helpers ─── */
function fmtCurrency(n: number): string {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} tỷ`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} tr`;
    return n.toLocaleString("vi-VN");
}
function fmtPct(n: number, decimals = 1): string {
    return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

function MetricCard({ label, value, sub, positive, warning }: {
    label: string; value: string; sub?: string; positive?: boolean; warning?: boolean;
}) {
    return (
        <div className="glass-card p-4 hover:border-white/10 transition-colors group">
            <p className="text-[11px] text-white/30 uppercase tracking-wider font-mono mb-1">{label}</p>
            <p className={cn("text-xl font-black font-mono",
                positive === true ? "text-[#22C55E] drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" :
                    positive === false ? "text-red-400" :
                        warning ? "text-yellow-400" : "text-white"
            )}>{value}</p>
            {sub && <p className="text-[10px] text-white/25 mt-0.5 group-hover:text-white/40 transition-colors">{sub}</p>}
        </div>
    );
}

/* ─── Inner Page (needs useSearchParams) ─── */
function BacktestInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const guruParam = searchParams.get("guru") ?? "";

    // Config state
    const [ticker, setTicker] = useState("FPT");
    const [fromDate, setFromDate] = useState("2022-01-01");
    const [toDate, setToDate] = useState("2024-12-31");
    const [capital, setCapital] = useState(100_000_000);
    const [selectedGuru, setSelectedGuru] = useState(guruParam);
    const [strategy, setStrategy] = useState<Strategy>("buy-and-hold");
    const [useGuruPreset, setUseGuruPreset] = useState(!!guruParam);

    // Result state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<BacktestResponse | null>(null);
    const [showTrades, setShowTrades] = useState(false);
    const [tradeSortDir, setTradeSortDir] = useState<"asc" | "desc">("desc");

    // Saved strategies
    const [saved, setSaved] = useState<SavedStrategy[]>([]);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [saveName, setSaveName] = useState("");
    const [savedPanel, setSavedPanel] = useState(false);
    const [saveMsg, setSaveMsg] = useState("");

    // Load saved strategies on mount
    useEffect(() => {
        setSaved(getSavedStrategies());
    }, []);

    // Sync guru preset
    useEffect(() => {
        if (guruParam) {
            setSelectedGuru(guruParam);
            setUseGuruPreset(true);
            const gs = GURU_STRATEGIES[guruParam];
            if (gs) setTicker(gs.sampleTicker);
        }
    }, [guruParam]);

    // Handlers — saved strategies
    const handleLoadStrategy = (s: SavedStrategy) => {
        setTicker(s.ticker);
        setFromDate(s.fromDate);
        setToDate(s.toDate);
        setCapital(s.capital);
        if (s.guruId) {
            setUseGuruPreset(true);
            setSelectedGuru(s.guruId);
        } else {
            setUseGuruPreset(false);
            setStrategy(s.strategy);
        }
        setSavedPanel(false);
    };

    const handleDeleteSaved = (id: string) => {
        deleteStrategy(id);
        setSaved(getSavedStrategies());
    };

    const handleSaveStrategy = () => {
        const name = saveName.trim() || `${ticker} · ${fromDate.slice(0, 7)}`;
        const sGuru = useGuruPreset && selectedGuru ? selectedGuru : undefined;
        const sStrategy = sGuru
            ? (GURU_STRATEGIES[sGuru]?.config.strategy ?? strategy)
            : strategy;
        const entry = saveStrategy({
            name,
            ticker, fromDate, toDate, capital,
            strategy: sStrategy,
            guruId: sGuru,
            lastMetrics: result?.metrics,
        });
        if (!entry) {
            setSaveMsg("Đã đầy 20! Xóa bớt chiến lược cũ nhé.");
        } else {
            setSaveMsg(`Đã lưu "${name}" thành công!`);
            setSaved(getSavedStrategies());
        }
        setSaveModalOpen(false);
        setSaveName("");
        setTimeout(() => setSaveMsg(""), 3000);
    };

    const activeGuruInfo = useGuruPreset && selectedGuru ? GURU_PERSONAS[selectedGuru] : null;
    const activeGuruStrategy = useGuruPreset && selectedGuru ? GURU_STRATEGIES[selectedGuru] : null;

    const runBacktest = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const body: Record<string, unknown> = { ticker, fromDate, toDate, capital };
            if (useGuruPreset && selectedGuru) {
                body.guru = selectedGuru;
            } else {
                body.strategy = strategy;
            }
            const resp = await fetch("/api/backtest", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "x-demo-bypass": "hungpixi-demo"
                },
                body: JSON.stringify(body),
            });
            const json = await resp.json();
            if (!resp.ok) { setError(json.error ?? "Lỗi không xác định"); return; }
            setResult(json as BacktestResponse);
            addXP("run_backtest"); // +30 XP
        } catch {
            setError("Không thể kết nối server. Kiểm tra mạng và thử lại.");
        } finally {
            setLoading(false);
        }
    };

    const metrics: BacktestMetrics | null = result?.metrics ?? null;
    const chartData = result?.equity ?? [];
    const sortedTrades = [...(result?.trades ?? [])].sort((a, b) =>
        tradeSortDir === "desc" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)
    );

    return (
        <div className="space-y-6 pb-32 md:pb-12">
            {/* Header */}
            <div className="flex items-start gap-3 mb-4">
                {activeGuruInfo && (
                    <button onClick={() => router.push(`/dashboard/gurus/${selectedGuru}`)} className="mt-1 text-white/30 hover:text-white/60 transition-colors">
                        <ArrowLeft size={16} />
                    </button>
                )}
                <div className="flex-1 space-y-1">
                    <CyberHeader size="display" className="flex items-center gap-3">
                        <FlaskConical className="w-7 h-7 text-[#E6B84F] drop-shadow-[0_0_10px_rgba(230,184,79,0.5)]" />
                        Backtest <span className="text-[#E6B84F]">Pro</span>
                        <span className="text-[10px] bg-[#E6B84F]/10 text-[#E6B84F] border border-[#E6B84F]/30 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider ml-1 mt-1">VIP</span>
                    </CyberHeader>
                    {activeGuruInfo ? (
                        <p className="text-white/40 text-sm flex items-center gap-1.5 font-medium">
                            <span className="text-lg drop-shadow-md">{activeGuruInfo.avatar}</span>
                            Đang dùng chiến lược của <span className="text-white/80 font-bold">{activeGuruInfo.name}</span>
                            {activeGuruStrategy && <span className="text-[#E6B84F] font-mono text-[10px] ml-1 px-1.5 py-0.5 bg-[#E6B84F]/10 rounded border border-[#E6B84F]/20">{activeGuruStrategy.strategyLabel}</span>}
                        </p>
                    ) : (
                        <CyberSubHeader>Kiểm thử chiến lược đầu tư trên dữ liệu lịch sử cổ phiếu Việt Nam</CyberSubHeader>
                    )}
                </div>
            </div>

            {/* Saved Strategies Panel */}
            <AnimatePresence>
                {savedPanel && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                        className="glass-card p-5">
                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                            <h3 className="text-sm font-semibold text-[#E6B84F] flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" /> Chiến lược đã lưu ({saved.length}/20)
                            </h3>
                            <button onClick={() => setSavedPanel(false)} className="text-white/30 hover:text-white/60"><ChevronUp className="w-4 h-4" /></button>
                        </div>
                        {saved.length === 0 ? (
                            <p className="text-white/25 text-xs text-center py-4">Chưa có chiến lược nào được lưu</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {saved.map(s => (
                                    <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg hover:bg-white/[0.05] transition-all">
                                        <button onClick={() => handleLoadStrategy(s)} className="flex-1 text-left">
                                            <div className="text-sm font-medium text-white/80 truncate">{s.name}</div>
                                            <div className="text-[10px] text-white/30 font-mono mt-0.5">
                                                {s.ticker} · {s.strategy} · {s.fromDate.slice(0, 7)}
                                                {s.lastMetrics && (
                                                    <span className={cn("ml-2", s.lastMetrics.totalReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
                                                        {s.lastMetrics.totalReturn >= 0 ? "+" : ""}{s.lastMetrics.totalReturn.toFixed(1)}%
                                                    </span>
                                                )}
                                            </div>
                                        </button>
                                        <button onClick={() => handleDeleteSaved(s.id)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Config Panel */}
            <div className="glass-card p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h2 className="text-sm font-semibold text-white/60 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" /> Cấu hình
                    </h2>
                    <button onClick={() => setSavedPanel(v => !v)}
                        className={cn("flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-all",
                            savedPanel ? "bg-[#E6B84F]/10 border-[#E6B84F]/30 text-[#E6B84F]" : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60")}>
                        <FolderOpen className="w-3.5 h-3.5" />
                        Đã lưu ({saved.length})
                        {savedPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </button>
                </div>

                {/* Ticker + Dates + Capital */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Ticker */}
                    <div>
                        <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Mã cổ phiếu</label>
                        <input
                            type="text"
                            value={ticker}
                            onChange={e => setTicker(e.target.value.toUpperCase())}
                            placeholder="VD: FPT, VCB..."
                            maxLength={10}
                            className="w-full mt-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#E6B84F]/40 uppercase"
                        />
                        <div className="flex gap-1 mt-1.5 flex-wrap">
                            {TICKER_SUGGESTIONS.slice(0, 5).map(t => (
                                <button key={t} onClick={() => setTicker(t)} className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-mono border transition-all",
                                    ticker === t ? "bg-[#E6B84F]/10 border-[#E6B84F]/30 text-[#E6B84F]" : "bg-white/[0.03] border-white/[0.08] text-white/40 hover:text-white/70"
                                )}>{t}</button>
                            ))}
                        </div>
                    </div>
                    {/* From Date */}
                    <div>
                        <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Từ ngày</label>
                        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                            className="w-full mt-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#E6B84F]/40" />
                    </div>
                    {/* To Date */}
                    <div>
                        <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Đến ngày</label>
                        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                            className="w-full mt-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#E6B84F]/40" />
                    </div>
                    {/* Capital */}
                    <div>
                        <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Vốn ban đầu (VND)</label>
                        <input type="number" value={capital} onChange={e => setCapital(Number(e.target.value))}
                            step={10_000_000} min={1_000_000}
                            className="w-full mt-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#E6B84F]/40" />
                        <p className="text-[10px] text-white/25 mt-1">{fmtCurrency(capital)}</p>
                    </div>
                </div>

                {/* Mode toggle: Guru Preset vs Custom */}
                <div>
                    <div className="flex gap-2 mb-3">
                        <button onClick={() => setUseGuruPreset(true)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                                useGuruPreset ? "bg-[#E6B84F]/10 border-[#E6B84F]/30 text-[#E6B84F]" : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60")}>
                            🧠 Chiến lược Guru
                        </button>
                        <button onClick={() => setUseGuruPreset(false)}
                            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                                !useGuruPreset ? "bg-[#E6B84F]/10 border-[#E6B84F]/30 text-[#E6B84F]" : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:text-white/60")}>
                            ⚙️ Tùy chỉnh
                        </button>
                    </div>

                    {useGuruPreset ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {GURU_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => {
                                    setSelectedGuru(opt.value);
                                    const gs = GURU_STRATEGIES[opt.value];
                                    if (gs) setTicker(gs.sampleTicker);
                                }}
                                    className={cn("text-left px-4 py-3 rounded-xl border transition-all",
                                        selectedGuru === opt.value ? "bg-[#E6B84F]/10 border-[#E6B84F]/30" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]")}>
                                    <div className={cn("text-sm font-semibold", selectedGuru === opt.value ? "text-[#E6B84F]" : "text-white/70")}>
                                        {opt.label}
                                    </div>
                                    <div className="text-[10px] text-white/30 mt-0.5 font-mono">{opt.strategyLabel}</div>
                                    <div className="text-[10px] text-white/25 mt-0.5 line-clamp-1">{opt.description}</div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {CUSTOM_STRATEGY_OPTIONS.map(opt => (
                                <button key={opt.value} onClick={() => setStrategy(opt.value)}
                                    className={cn("text-left px-4 py-3 rounded-xl border transition-all",
                                        strategy === opt.value ? "bg-[#E6B84F]/10 border-[#E6B84F]/30" : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]")}>
                                    <div className={cn("text-sm font-semibold", strategy === opt.value ? "text-[#E6B84F]" : "text-white/70")}>{opt.label}</div>
                                    <div className="text-[11px] text-white/30 mt-0.5">{opt.description}</div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Run Button */}
                <button onClick={runBacktest} disabled={loading || !ticker}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#E6B84F] to-[#FFD700] text-black font-bold rounded-xl text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Đang chạy backtest...</>
                        : <><Play className="w-4 h-4" /> Chạy Backtest{useGuruPreset && selectedGuru ? ` — ${GURU_PERSONAS[selectedGuru]?.name}` : ""}</>}
                </button>
            </div>

            {/* Error */}
            {error && (
                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />{error}
                </motion.div>
            )}

            {/* Results */}
            <AnimatePresence>
                {result && metrics && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
                        {/* Summary badge */}
                        <div className="flex items-center gap-3 flex-wrap">
                            {result.guru && GURU_PERSONAS[result.guru] && (
                                <span className="flex items-center gap-1.5 text-sm">
                                    <span className="text-xl">{GURU_PERSONAS[result.guru].avatar}</span>
                                    <span className="text-white/60">{GURU_PERSONAS[result.guru].name}</span>
                                    <span className="text-white/20">·</span>
                                </span>
                            )}
                            <span className="text-white/60 text-sm">
                                <span className="font-mono font-bold text-white">{result.ticker}</span>
                                {" · "}{result.strategyLabel ?? result.strategy}
                                {" · "}{result.fromDate} → {result.toDate}
                                {" · "}{result.bars} tuần
                            </span>
                            {result.fetchedAt && (
                                <span className="text-[10px] text-white/20 font-mono">
                                    {new Date(result.fetchedAt).toLocaleTimeString("vi-VN")}
                                </span>
                            )}
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                            <MetricCard label="CAGR" value={fmtPct(metrics.cagr)} sub={`Alpha (vs B&H): ${fmtPct(metrics.cagr - (metrics.benchmarkCagr ?? 0))}`} positive={metrics.cagr > 0} />
                            <MetricCard label="Tổng lợi nhuận" value={fmtPct(metrics.totalReturn)} sub={`Tổng phí GD: ${fmtCurrency(metrics.totalFees ?? 0)}`} positive={metrics.totalReturn > 0} />
                            <MetricCard label="Sharpe Ratio" value={metrics.sharpe.toFixed(2)} sub="Cao hơn 1 là tốt" positive={metrics.sharpe > 1} warning={metrics.sharpe > 0 && metrics.sharpe <= 1} />
                            <MetricCard label="Max Drawdown" value={`-${metrics.maxDrawdown.toFixed(1)}%`} sub="Sụt giảm tối đa" positive={false} />
                            <MetricCard label="Win Rate" value={`${metrics.winRate.toFixed(0)}%`} sub={`${metrics.numTrades} lệnh`} positive={metrics.winRate >= 50} />
                            <MetricCard label="Vốn cuối" value={fmtCurrency(metrics.finalCapital)} sub={`Gốc: ${fmtCurrency(result.capital)}`} positive={metrics.finalCapital > result.capital} />
                        </div>

                        {/* Stress Test Grid */}
                        {metrics.upDays !== undefined && (
                            <div className="glass-card p-6 mt-6">
                                <h3 className="text-sm font-semibold text-white/60 mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
                                    <AlertTriangle className="w-4 h-4 text-[#E6B84F]" /> Kiếm thử Áp lực (Stress Test)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                    <MetricCard label="Giảm max / ngày" value={`-${Math.abs(metrics.maxDailyDrop).toFixed(1)}%`} positive={false} />
                                    <MetricCard label="Tăng max / ngày" value={`+${metrics.maxDailyGain.toFixed(1)}%`} positive={true} />
                                    <MetricCard label="Tỷ lệ thắng/thua" value={metrics.winLossRatio.toFixed(2)} sub="Avg Gain / Avg Loss" positive={metrics.winLossRatio > 1} warning={metrics.winLossRatio > 0 && metrics.winLossRatio <= 1} />
                                    <MetricCard label="Số ngày tăng" value={metrics.upDays.toString()} sub="Phiên xanh" positive={true} />
                                    <MetricCard label="Số ngày giảm" value={metrics.downDays.toString()} sub="Phiên đỏ" positive={false} />
                                </div>
                            </div>
                        )}

                        {/* Equity Curve */}
                        {chartData.length > 0 && (
                            <div className="glass-card p-6">
                                <h3 className="text-sm font-semibold text-white/60 mb-5 flex items-center gap-2 border-b border-white/5 pb-3">
                                    <Percent className="w-4 h-4 text-[#E6B84F]" />Biểu đồ kết quả (TradingView)
                                </h3>
                                <div className="h-96 w-full relative">
                                    <TradingViewChart
                                        ohlcv={result.ohlcv ?? []}
                                        equity={chartData}
                                        trades={result.trades}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Trades Table */}
                        {result.trades.length > 0 && (
                            <div className="glass-card p-6">
                                <button onClick={() => setShowTrades(!showTrades)}
                                    className="w-full flex items-center justify-between text-sm font-medium text-white/60 hover:text-white transition-colors">
                                    <span className="flex items-center gap-2">
                                        <ArrowUpDown className="w-4 h-4" />Lịch sử lệnh ({result.trades.length} giao dịch)
                                    </span>
                                    {showTrades ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                                <AnimatePresence>
                                    {showTrades && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="border-b border-white/[0.06] text-[10px] text-white/30 uppercase tracking-wider">
                                                            <th className="px-5 py-2 text-left">
                                                                <button onClick={() => setTradeSortDir(d => d === "asc" ? "desc" : "asc")} className="flex items-center gap-1 hover:text-white/60 transition-colors">
                                                                    Ngày {tradeSortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                                                                </button>
                                                            </th>
                                                            <th className="px-3 py-2 text-left">Lệnh</th>
                                                            <th className="px-3 py-2 text-right">Giá</th>
                                                            <th className="px-3 py-2 text-right">KL</th>
                                                            <th className="px-3 py-2 text-right">Giá trị</th>
                                                            <th className="px-3 py-2 text-right">Lãi/Lỗ</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {sortedTrades.map((trade: Trade, i) => (
                                                            <tr key={i} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                                                                <td className="px-5 py-2.5 font-mono text-white/50">{trade.date}</td>
                                                                <td className="px-3 py-2.5">
                                                                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-bold",
                                                                        trade.type === "BUY" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400")}>
                                                                        {trade.type === "BUY" ? "MUA" : "BÁN"}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2.5 text-right font-mono text-white/70">{trade.price.toFixed(2)}</td>
                                                                <td className="px-3 py-2.5 text-right font-mono text-white/50">{trade.shares.toLocaleString()}</td>
                                                                <td className="px-3 py-2.5 text-right font-mono text-white/50">{fmtCurrency(trade.value)}</td>
                                                                <td className="px-3 py-2.5 text-right font-mono">
                                                                    {trade.pnl !== undefined ? (
                                                                        <span className={trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                                            {trade.pnl >= 0 ? <TrendingUp className="w-3 h-3 inline mr-0.5" /> : <TrendingDown className="w-3 h-3 inline mr-0.5" />}
                                                                            {fmtPct(trade.pnlPct ?? 0)}
                                                                        </span>
                                                                    ) : <span className="text-white/20">—</span>}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        )}

                        {/* Save Strategy */}
                        <div className="flex items-center justify-between pt-1">
                            <button
                                onClick={() => setSaveModalOpen(v => !v)}
                                className="flex items-center gap-2 px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/60 hover:text-[#E6B84F] hover:border-[#E6B84F]/30 transition-all"
                            >
                                <Save className="w-3.5 h-3.5" /> Lưu chiến lược này
                            </button>
                            {saveMsg && (
                                <span className="text-xs text-emerald-400 font-medium">✓ {saveMsg}</span>
                            )}
                        </div>

                        <AnimatePresence>
                            {saveModalOpen && (
                                <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                                    className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder={`${ticker} · ${fromDate.slice(0, 7)} (Enter để lưu)`}
                                        value={saveName}
                                        onChange={e => setSaveName(e.target.value)}
                                        onKeyDown={e => e.key === "Enter" && handleSaveStrategy()}
                                        autoFocus
                                        className="flex-1 bg-white/[0.05] border border-[#E6B84F]/30 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#E6B84F]/60"
                                    />
                                    <button onClick={handleSaveStrategy}
                                        className="px-3 py-2 bg-[#E6B84F] text-black rounded-lg text-sm font-bold hover:opacity-90 transition-all">
                                        Lưu
                                    </button>
                                    <button onClick={() => setSaveModalOpen(false)}
                                        className="px-3 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-sm text-white/40 hover:text-white/60 transition-all">
                                        Hủy
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Disclaimer */}
                        <p className="text-[11px] text-white/20 text-center">
                            ⚠️ Kết quả backtest dựa trên dữ liệu lịch sử. Hiệu suất quá khứ KHÔNG đảm bảo lợi nhuận tương lai.
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─── Page wrapper với Suspense (required khi dùng useSearchParams) ─── */
export default function BacktestPage() {
    return (
        <RequireTier requiredRole={UserRole.PRO} featureName="Backtest Pro">
            <Suspense fallback={<div className="p-8 text-center text-white/30">Đang tải...</div>}>
                <BacktestInner />
            </Suspense>
        </RequireTier>
    );
}
