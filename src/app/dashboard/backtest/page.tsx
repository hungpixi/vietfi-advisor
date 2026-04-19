"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
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
import { CyberHeader, CyberSubHeader, CyberMetric, CyberTypography } from "@/components/ui/CyberTypography";
import { CyberCard } from "@/components/ui/CyberCard";
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
    { value: "buy-and-hold", label: "Mua và nắm giữ", description: "Mua và giữ toàn bộ vốn từ đầu đến cuối" },
    { value: "sma-cross", label: "Cắt SMA", description: "Mua khi SMA nhanh cắt lên SMA chậm" },
    { value: "breakout-52w", label: "Bứt phá 52 Tuần", description: "Mua khi giá vượt đỉnh 52 tuần, cắt lỗ -8%" },
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
        <div className="bg-white/[0.03] border border-white/10 p-4 rounded-xl hover:border-[#E6B84F]/30 transition-all group">
            <p className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-black mb-1.5">{label}</p>
            <p className={cn("text-xl font-black font-mono",
                positive === true ? "text-[#22C55E] drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" :
                    positive === false ? "text-red-400" :
                        warning ? "text-[#E6B84F]" : "text-white"
            )}>{value}</p>
            {sub && <p className="text-[9px] text-white/30 mt-1 uppercase font-black tracking-widest leading-tight group-hover:text-white/50 transition-colors">{sub}</p>}
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
    const [toDate, setDate] = useState("2024-12-31");
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
        setDate(s.toDate);
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
            strategy: sStrategy as any,
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
        <div className="space-y-6 pb-32">
            {/* ─── Hero Header ─── */}
            <CyberCard className="p-8" variant="neutral">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="space-y-4 flex-1">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="px-3 py-1 rounded-sm bg-[#E6B84F]/10 text-[#E6B84F] border border-[#E6B84F]/30 text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <FlaskConical className="w-3 h-3" />
                                PHÒNG THÍ NGHIỆM
                            </span>
                            <span className="px-3 py-1 rounded-sm bg-white/5 border border-white/10 text-white/90 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5 text-[#22C55E]" />
                                TRUY CẬP VIP
                            </span>
                        </div>

                        <div className="space-y-1">
                            <CyberHeader size="display" className="leading-none">
                                KIỂM THỬ <span className="text-[#E6B84F]">PRO</span>
                            </CyberHeader>
                            <div className="flex items-center gap-2">
                                <div className="h-1 w-12 bg-[#E6B84F]/50" />
                                <CyberSubHeader color="text-[#E6B84F]" className="font-bold opacity-100">
                                    {activeGuruInfo ? `CHIẾN LƯỢC ${activeGuruInfo.name.toUpperCase()}` : "THỬ NGHIỆM CHIẾN LƯỢC ĐẦU TƯ"}
                                </CyberSubHeader>
                            </div>
                        </div>

                        <p className="text-white text-[16px] leading-relaxed font-black italic tracking-wide drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] opacity-100">
                            &quot;Kết quả quá khứ không phải là tương lai, nhưng là kim chỉ nam để tối ưu hóa xác suất thắng.&quot;
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={() => setSavedPanel(v => !v)}
                            className={cn("flex flex-col items-center justify-center p-6 rounded-xl border backdrop-blur-md min-w-[140px] group/rank transition-all",
                                savedPanel ? "bg-[#E6B84F]/10 border-[#E6B84F]/40 shadow-[0_0_30px_rgba(230,184,79,0.1)]" : "bg-black/40 border-white/10 hover:border-[#E6B84F]/20")}>
                            <FolderOpen className={cn("w-6 h-6 mb-2", savedPanel ? "text-[#E6B84F]" : "text-white/50")} />
                            <span className="font-mono text-[10px] text-white/90 mb-1 uppercase tracking-[0.3em] font-black text-center">Đã lưu</span>
                            <span className="font-heading text-3xl font-black text-white">{saved.length}</span>
                        </button>
                    </div>
                </div>
            </CyberCard>

            {/* Saved Strategies Panel Dropdown */}
            <AnimatePresence>
                {savedPanel && (
                    <motion.div initial={{ opacity: 0, scale: 0.98, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: -10 }}>
                        <CyberCard className="p-6" variant="neutral">
                            <div className="flex items-center justify-between mb-6 border-b border-white/5 pb-4">
                                <CyberHeader size="xs">CHIẾN LƯỢC ĐÃ LƯU</CyberHeader>
                                <button onClick={() => setSavedPanel(false)} className="text-white/50 hover:text-white/80"><ChevronUp className="w-5 h-5" /></button>
                            </div>
                            {saved.length === 0 ? (
                                <div className="text-center py-10 text-white/30 font-mono text-xs uppercase tracking-widest">[ TRỐNG ]</div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {saved.map(s => (
                                        <div key={s.id} className="flex items-center justify-between gap-3 p-4 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-[#E6B84F]/[0.05] hover:border-[#E6B84F]/30 transition-all group">
                                            <button onClick={() => handleLoadStrategy(s)} className="flex-1 text-left min-w-0">
                                                <div className="text-[13px] font-black text-white truncate uppercase tracking-wide">{s.name}</div>
                                                <div className="text-[9px] text-white/50 font-mono mt-1 uppercase tracking-widest">
                                                    {s.ticker} · {s.strategy}
                                                    {s.lastMetrics && (
                                                        <span className={cn("ml-2", s.lastMetrics.totalReturn >= 0 ? "text-[#22C55E]" : "text-red-500")}>
                                                            {s.lastMetrics.totalReturn >= 0 ? "+" : ""}{s.lastMetrics.totalReturn.toFixed(1)}%
                                                        </span>
                                                    )}
                                                </div>
                                            </button>
                                            <button onClick={() => handleDeleteSaved(s.id)} className="text-white/20 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/5">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CyberCard>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* ─── Config Panel ─── */}
                <CyberCard className="lg:col-span-1 p-6" variant="neutral">
                    <div className="space-y-6">
                        <div className="border-b border-white/10 pb-4">
                            <CyberHeader size="xs" className="flex items-center gap-2">
                                <BarChart3 className="w-4 h-4 text-[#E6B84F]" /> THIẾT LẬP
                            </CyberHeader>
                        </div>

                        {/* Ticker */}
                        <div>
                            <CyberSubHeader className="mb-2 block text-white/80 font-black">Mã cổ phiếu</CyberSubHeader>
                            <input
                                type="text"
                                value={ticker}
                                onChange={e => setTicker(e.target.value.toUpperCase())}
                                placeholder="FPT, VCB..."
                                className="w-full bg-white/[0.08] border border-white/20 rounded-xl px-4 py-3 text-sm text-white font-black font-mono outline-none focus:border-[#E6B84F] transition-all uppercase placeholder:text-white/20 shadow-inner"
                            />
                            <div className="flex gap-1.5 mt-3 flex-wrap">
                                {TICKER_SUGGESTIONS.slice(0, 5).map(t => (
                                    <button key={t} onClick={() => setTicker(t)} className={cn(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all",
                                        ticker === t ? "bg-[#E6B84F] border-[#E6B84F] text-black" : "bg-white/[0.05] border-white/10 text-white/60 hover:text-white hover:border-white/30"
                                    )}>{t}</button>
                                ))}
                            </div>
                        </div>

                        {/* Dates Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <CyberSubHeader className="mb-2 block text-white/80 font-black">Từ ngày</CyberSubHeader>
                                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                                    className="w-full bg-white/[0.08] border border-white/20 rounded-xl px-3 py-2.5 text-[12px] text-white font-black outline-none focus:border-[#E6B84F] [color-scheme:dark]" />
                            </div>
                            <div>
                                <CyberSubHeader className="mb-2 block text-white/80 font-black">Đến ngày</CyberSubHeader>
                                <input type="date" value={toDate} onChange={e => setDate(e.target.value)}
                                    className="w-full bg-white/[0.08] border border-white/20 rounded-xl px-3 py-2.5 text-[12px] text-white font-black outline-none focus:border-[#E6B84F] [color-scheme:dark]" />
                            </div>
                        </div>

                        {/* Capital */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <CyberSubHeader className="block text-white/80 font-black">Vốn ban đầu</CyberSubHeader>
                                <span className="text-[10px] font-mono font-black text-[#E6B84F] drop-shadow-[0_0_8px_rgba(230,184,79,0.3)]">{fmtCurrency(capital)}</span>
                            </div>
                            <input type="number" value={capital} onChange={e => setCapital(Number(e.target.value))}
                                step={10_000_000} min={1_000_000}
                                className="w-full bg-white/[0.08] border border-white/20 rounded-xl px-4 py-3 text-sm text-white font-black font-mono outline-none focus:border-[#E6B84F] transition-all" />
                        </div>

                        {/* Strategy Selection */}
                        <div className="space-y-3 pt-2">
                            <div className="flex p-1 bg-white/[0.05] rounded-xl border border-white/10">
                                <button onClick={() => setUseGuruPreset(true)}
                                    className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                        useGuruPreset ? "bg-[#E6B84F] text-black shadow-lg" : "text-white/50 hover:text-white")}>
                                    🧠 GURU
                                </button>
                                <button onClick={() => setUseGuruPreset(false)}
                                    className={cn("flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                                        !useGuruPreset ? "bg-[#E6B84F] text-black shadow-lg" : "text-white/50 hover:text-white")}>
                                    ⚙️ TÙY CHỈNH
                                </button>
                            </div>

                            <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                {useGuruPreset ? (
                                    GURU_OPTIONS.map(opt => (
                                        <button key={opt.value} onClick={() => {
                                            setSelectedGuru(opt.value);
                                            const gs = GURU_STRATEGIES[opt.value];
                                            if (gs) setTicker(gs.sampleTicker);
                                        }}
                                            className={cn("w-full text-left px-4 py-3 rounded-xl border transition-all flex flex-col gap-0.5",
                                                selectedGuru === opt.value ? "bg-[#E6B84F]/10 border-[#E6B84F]/40 shadow-inner" : "bg-white/[0.02] border-white/10 hover:bg-white/[0.08] hover:border-white/20")}>
                                            <div className={cn("text-[13px] font-black uppercase tracking-wide", selectedGuru === opt.value ? "text-[#E6B84F]" : "text-white/90")}>
                                                {opt.label}
                                            </div>
                                            <div className="text-[10px] text-white/50 font-mono tracking-widest uppercase">{opt.strategyLabel}</div>
                                        </button>
                                    ))
                                ) : (
                                    CUSTOM_STRATEGY_OPTIONS.map(opt => (
                                        <button key={opt.value} onClick={() => setStrategy(opt.value)}
                                            className={cn("w-full text-left px-4 py-3 rounded-xl border transition-all",
                                                strategy === opt.value ? "bg-[#E6B84F]/10 border-[#E6B84F]/40 shadow-inner" : "bg-white/[0.02] border-white/10 hover:bg-white/[0.08] hover:border-white/20")}>
                                            <div className={cn("text-[13px] font-black uppercase tracking-wide", strategy === opt.value ? "text-[#E6B84F]" : "text-white/90")}>{opt.label}</div>
                                            <div className="text-[11px] text-white/60 mt-1 font-black leading-relaxed line-clamp-2 uppercase tracking-tight">{opt.description}</div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Run Button */}
                        <button onClick={runBacktest} disabled={loading || !ticker}
                            className="group relative w-full overflow-hidden rounded-xl bg-[#E6B84F] p-4 font-black uppercase tracking-[0.2em] text-black shadow-[0_12px_40px_rgba(230,184,79,0.3)] transition-all hover:scale-[1.02] hover:shadow-[0_12px_50px_rgba(230,184,79,0.4)] active:scale-95 disabled:opacity-50">
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5 fill-current" />}
                                {loading ? "ĐANG TÍNH TOÁN..." : "CHẠY THỬ NGHIỆM"}
                            </div>
                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent group-hover:transition-all group-hover:duration-700 group-hover:translate-x-full" />
                        </button>
                    </div>
                </CyberCard>

                {/* ─── Results Panel ─── */}
                <div className="lg:col-span-2 space-y-6">
                    <AnimatePresence mode="wait">
                        {loading ? (
                            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="h-full min-h-[500px] flex flex-col items-center justify-center gap-6 border border-white/10 bg-[#08110f]/50 rounded-2xl backdrop-blur-xl">
                                <div className="relative">
                                    <div className="w-20 h-20 rounded-full border-4 border-[#E6B84F]/20 border-t-[#E6B84F] animate-spin" />
                                    <FlaskConical className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#E6B84F] w-8 h-8 animate-pulse" />
                                </div>
                                <div className="text-center space-y-2">
                                    <CyberHeader size="xs">ĐANG MÔ PHỎNG DỮ LIỆU</CyberHeader>
                                    <CyberSubHeader className="block text-white/60">QUÉT TOÀN BỘ LỊCH SỬ {ticker}...</CyberSubHeader>
                                </div>
                            </motion.div>
                        ) : error ? (
                            <motion.div key="error" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                className="p-12 text-center border border-red-500/30 bg-red-500/5 rounded-2xl">
                                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                                <CyberHeader size="xs" color="text-red-400">{error}</CyberHeader>
                                <button onClick={() => setError(null)} className="mt-6 text-xs font-black uppercase text-white/50 hover:text-white transition-colors">THỬ LẠI</button>
                            </motion.div>
                        ) : result && metrics ? (
                            <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                                {/* Result Summary Header */}
                                <div className="flex items-center justify-between px-2">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-[#E6B84F]/20 flex items-center justify-center border border-[#E6B84F]/40 shadow-[0_0_15px_rgba(230,184,79,0.2)]">
                                            <span className="text-xl font-black text-[#E6B84F]">{ticker.slice(0, 1)}</span>
                                        </div>
                                        <div>
                                            <CyberHeader size="xs" className="leading-tight drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]">{ticker}</CyberHeader>
                                            <CyberSubHeader className="block font-mono text-white/60">{result.fromDate} — {result.toDate}</CyberSubHeader>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <CyberMetric size="xs" color={metrics.totalReturn >= 0 ? "text-[#22C55E]" : "text-red-500"} className="drop-shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                                            {fmtPct(metrics.totalReturn)}
                                        </CyberMetric>
                                        <CyberSubHeader className="block tracking-tighter uppercase font-black text-white/70">Lợi nhuận tổng</CyberSubHeader>
                                    </div>
                                </div>

                                {/* Main Metrics Grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                                    <MetricCard label="LN GỘP NĂM (CAGR)" value={fmtPct(metrics.cagr)} sub={`Chênh lệch Chỉ số: ${fmtPct(metrics.cagr - (metrics.benchmarkCagr ?? 0))}`} positive={metrics.cagr > 0} />
                                    <MetricCard label="SỤT GIẢM TỐI ĐA" value={`-${metrics.maxDrawdown.toFixed(1)}%`} sub="Mức lỗ sâu nhất" positive={false} />
                                    <MetricCard label="HIỆU SUẤT SHARPE" value={metrics.sharpe.toFixed(2)} sub="Lợi nhuận/Rủi ro" positive={metrics.sharpe > 1} warning={metrics.sharpe > 0 && metrics.sharpe <= 1} />
                                    <MetricCard label="TỶ LỆ THẮNG" value={`${metrics.winRate.toFixed(0)}%`} sub={`${metrics.numTrades} Giao dịch`} positive={metrics.winRate >= 50} />
                                    <MetricCard label="VỐN CUỐI CÙNG" value={fmtCurrency(metrics.finalCapital)} sub={`Gốc: ${fmtCurrency(result.capital)}`} positive={metrics.finalCapital > result.capital} />
                                    <MetricCard label="LỢI NHUẬN TB" value={fmtPct(metrics.totalReturn / metrics.numTrades)} sub="Mỗi lệnh" positive={metrics.totalReturn > 0} />
                                </div>

                                {/* Equity Curve Chart */}
                                <CyberCard className="p-6">
                                    <div className="flex items-center justify-between mb-8 border-b border-white/10 pb-4">
                                        <CyberHeader size="xs">BIỂU ĐỒ TÀI SẢN</CyberHeader>
                                        <div className="flex gap-4">
                                            <div className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-widest text-[#E6B84F]">
                                                <div className="w-2 h-2 rounded-full bg-[#E6B84F]" /> TÀI SẢN
                                            </div>
                                            <div className="flex items-center gap-1.5 font-mono text-[9px] font-black uppercase tracking-widest text-white/40">
                                                <div className="w-2 h-2 rounded-full bg-white/20" /> CHỈ SỐ
                                            </div>
                                        </div>
                                    </div>
                                    <div className="h-96 w-full relative">
                                        <TradingViewChart
                                            ohlcv={result.ohlcv ?? []}
                                            equity={chartData}
                                            trades={result.trades}
                                        />
                                    </div>
                                </CyberCard>

                                {/* Trades Detail Table */}
                                <CyberCard className="overflow-hidden p-0">
                                    <div className="p-6 border-b border-white/10 flex items-center justify-between">
                                        <CyberHeader size="xs">NHẬT KÝ GIAO DỊCH</CyberHeader>
                                        <button onClick={() => setShowTrades(!showTrades)} className="text-[10px] font-black uppercase tracking-widest text-white/50 hover:text-white transition-colors flex items-center gap-2">
                                            {showTrades ? "THU GỌN" : "XEM CHI TIẾT"}
                                            {showTrades ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        </button>
                                    </div>
                                    <AnimatePresence>
                                        {showTrades && (
                                            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-x-auto">
                                                <table className="w-full text-left">
                                                    <thead>
                                                        <tr className="bg-white/[0.05] text-[10px] font-black uppercase text-white/40 tracking-[0.2em]">
                                                            <th className="p-4">Thời gian</th>
                                                            <th className="p-4">Lệnh</th>
                                                            <th className="p-4 text-right">Giá</th>
                                                            <th className="p-4 text-right">Khối lượng</th>
                                                            <th className="p-4 text-right">Kết quả</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-white/10 font-mono text-[11px] uppercase font-black">
                                                        {sortedTrades.map((trade, i) => (
                                                            <tr key={i} className="hover:bg-white/[0.05] transition-colors">
                                                                <td className="p-4 text-white/70">{trade.date}</td>
                                                                <td className="p-4">
                                                                    <span className={cn("px-2 py-0.5 rounded-[4px] font-black text-[9px]",
                                                                        trade.type === "BUY" ? "bg-[#22C55E]/20 text-[#22C55E]" : "bg-red-500/20 text-red-500")}>
                                                                        {trade.type === "BUY" ? "MUA" : "BÁN"}
                                                                    </span>
                                                                </td>
                                                                <td className="p-4 text-right text-white font-black">{trade.price.toLocaleString("vi-VN")}</td>
                                                                <td className="p-4 text-right text-white/60">{trade.shares.toLocaleString()}</td>
                                                                <td className="p-4 text-right">
                                                                    {trade.pnl !== undefined ? (
                                                                        <span className={cn("font-black", trade.pnl >= 0 ? "text-[#22C55E]" : "text-red-500")}>
                                                                            {trade.pnl >= 0 ? "+" : ""}{trade.pnlPct?.toFixed(1)}%
                                                                        </span>
                                                                    ) : "—"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </CyberCard>

                                {/* Save Button Section */}
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border border-white/10 bg-white/[0.03] rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#E6B84F]/20 flex items-center justify-center border border-[#E6B84F]/40 shadow-[0_0_10px_rgba(230,184,79,0.1)]">
                                            <Save className="w-4 h-4 text-[#E6B84F]" />
                                        </div>
                                        <CyberSubHeader className="uppercase font-black text-white/90">LƯU KẾT QUẢ VÀO CHIẾN LƯỢC CỦA BẠN?</CyberSubHeader>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <AnimatePresence>
                                            {saveModalOpen ? (
                                                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        placeholder="TÊN CHIẾN LƯỢC..."
                                                        value={saveName}
                                                        onChange={e => setSaveName(e.target.value.toUpperCase())}
                                                        className="bg-black/60 border border-[#E6B84F]/50 rounded-lg px-3 py-2 text-xs text-white font-black uppercase outline-none shadow-xl"
                                                    />
                                                    <button onClick={handleSaveStrategy} className="bg-[#E6B84F] text-black px-4 py-2 rounded-lg text-xs font-black uppercase hover:bg-[#E6B84F]/90 transition-all shadow-[0_0_15px_rgba(230,184,79,0.3)]">XÁC NHẬN</button>
                                                    <button onClick={() => setSaveModalOpen(false)} className="bg-white/10 text-white/60 px-3 py-2 rounded-lg text-xs font-black uppercase hover:bg-white/20 transition-all">HỦY</button>
                                                </motion.div>
                                            ) : (
                                                <button onClick={() => setSaveModalOpen(true)} className="px-6 py-2 border border-[#E6B84F]/50 text-[#E6B84F] rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-[#E6B84F]/20 transition-all shadow-[0_0_20px_rgba(230,184,79,0.1)]">LƯU CHIẾN LƯỢC</button>
                                            )}
                                        </AnimatePresence>
                                        {saveMsg && <span className="text-[10px] text-[#22C55E] font-black uppercase drop-shadow-[0_0_5px_rgba(34,197,94,0.3)]">{saveMsg}</span>}
                                    </div>
                                </div>
                            </motion.div>
                        ) : (
                            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                className="h-full min-h-[500px] flex flex-col items-center justify-center gap-8 border border-dashed border-white/20 rounded-2xl bg-[#08110f]/20 backdrop-blur-sm shadow-inner">
                                <div className="w-24 h-24 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/20 shadow-[0_0_30px_rgba(255,255,255,0.05)]">
                                    <FlaskConical size={48} className="animate-pulse" />
                                </div>
                                <div className="text-center space-y-2">
                                    <CyberHeader size="xs">HỆ THỐNG SẴN SÀNG</CyberHeader>
                                    <CyberSubHeader className="block text-white/50 font-black">CHỌN THÔNG SỐ VÀ NHẤN "CHẠY THỬ NGHIỆM" ĐỂ BẮT ĐẦU.</CyberSubHeader>
                                </div>
                            </motion.div>
                        )}
                        {/* Disclaimer */}
                        <p className="text-[11px] text-white/20 text-center mt-6">
                            ⚠️ Kết quả backtest dựa trên dữ liệu lịch sử cuối ngày (End-Of-Day) để tối ưu swing-trading. Hiệu suất quá khứ KHÔNG đảm bảo lợi nhuận tương lai.
                        </p>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

/* ─── Page wrapper với Suspense (required khi dùng useSearchParams) ─── */
export default function BacktestPage() {
    return (
        <RequireTier requiredRole={UserRole.PRO} featureName="Backtest Pro">
            <Suspense fallback={<div className="p-8 text-center text-white/50 font-mono text-xs uppercase tracking-widest animate-pulse font-black">KẾT NỐI TERMINAL...</div>}>
                <BacktestInner />
            </Suspense>
        </RequireTier>
    );
}
