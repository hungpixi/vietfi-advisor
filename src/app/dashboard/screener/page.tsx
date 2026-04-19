"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, TrendingUp, TrendingDown, Star, Loader2,
  ChevronDown, ChevronUp, BarChart3, Sparkles, ArrowUpDown,
  Building2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import RequireTier from "@/components/gamification/RequireTier";
import { UserRole } from "@/lib/rbac";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";

/* ─── Types ─── */

interface StockResult {
  ticker: string;
  exchange: string;
  shortName: string;
  industry: string;
  price: number;
  changePct: number;
  pe: number;
  pb: number;
  roe: number;
  eps: number;
  marketCap: number;
  dividend: number;
  rating: number;
  compositeScore: number;
}

interface Filters {
  maxPE: number;
  maxPB: number;
  minROE: number;
  minMarketCap: number;
  minRating: number;
  exchange: string;
}

const DEFAULT: Filters = {
  maxPE: 15,
  maxPB: 2.5,
  minROE: 12,
  minMarketCap: 500,
  minRating: 2.5,
  exchange: "",
};

/* ─── Filter Presets ─── */

const PRESETS = [
  { label: "Cổ phiếu đầu ngành", emoji: "💎", filters: { maxPE: 20, maxPB: 3, minROE: 15, minMarketCap: 5000, minRating: 3, exchange: "HOSE" } },
  { label: "Giá trị", emoji: "🏷️", filters: { maxPE: 10, maxPB: 1.5, minROE: 10, minMarketCap: 200, minRating: 2, exchange: "" } },
  { label: "Tăng trưởng", emoji: "🚀", filters: { maxPE: 25, maxPB: 4, minROE: 20, minMarketCap: 1000, minRating: 3, exchange: "" } },
  { label: "Cổ tức cao", emoji: "💰", filters: { maxPE: 15, maxPB: 2, minROE: 8, minMarketCap: 500, minRating: 2, exchange: "" } },
];

/* ─── Component ─── */

export default function ScreenerPage() {
  const [filters, setFilters] = useState<Filters>(DEFAULT);
  const [stocks, setStocks] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<keyof StockResult>("compositeScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [showFilters, setShowFilters] = useState(true);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        maxPE: String(filters.maxPE),
        maxPB: String(filters.maxPB),
        minROE: String(filters.minROE),
        minMarketCap: String(filters.minMarketCap),
        minRating: String(filters.minRating),
        exchange: filters.exchange,
      });
      const resp = await fetch(`/api/stock-screener?${params}`);
      if (!resp.ok) throw new Error("API error");
      const json = await resp.json();
      setStocks(json.stocks ?? []);
      setFetchedAt(json.fetchedAt ?? null);
    } catch {
      setError("Không thể tải dữ liệu. Thử lại sau.");
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  const sorted = [...stocks].sort((a, b) => {
    const av = a[sortKey] ?? 0;
    const bv = b[sortKey] ?? 0;
    return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
  });

  const handleSort = (key: keyof StockResult) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const setPreset = (p: typeof PRESETS[0]) => {
    setFilters(p.filters as Filters);
  };

  const SortIcon = ({ col }: { col: keyof StockResult }) => {
    if (sortKey !== col) return <ArrowUpDown className="w-3 h-3 text-white/20" />;
    return sortDir === "desc"
      ? <ChevronDown className="w-3 h-3 text-[#22C55E]" />
      : <ChevronUp className="w-3 h-3 text-[#22C55E]" />;
  };

  const scoreColor = (s: number) => {
    if (s >= 60) return "text-[#22C55E]";
    if (s >= 40) return "text-[#E6B84F]";
    return "text-[#EF4444]";
  };

  return (
    <RequireTier requiredRole={UserRole.MASTER} featureName="Lọc Cổ Phiếu VIP">
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <CyberHeader size="display">Lọc <span className="text-[#22C55E]">Cổ Phiếu</span></CyberHeader>
            <div className="flex items-center gap-2 mt-2">
              <div className="h-1 w-12 bg-[#22C55E]/50" />
              <CyberSubHeader className="text-[#22C55E] font-black tracking-[0.2em] uppercase">
                TÌM KIẾM CƠ HỘI ĐẦU TƯ TIỀM NĂNG
              </CyberSubHeader>
            </div>
          </div>
          <button
            onClick={fetchStocks}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-[#22C55E]/10 border border-[#22C55E]/20 rounded-xl text-[#22C55E] text-[10px] font-black uppercase tracking-widest hover:bg-[#22C55E]/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Lọc lại
          </button>
        </div>

        {/* Presets */}
        <div className="flex gap-2 flex-wrap">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => setPreset(p)}
              className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-[10px] font-black uppercase text-white/40 hover:bg-white/[0.08] hover:text-[#22C55E] hover:border-[#22C55E]/30 transition-all flex items-center gap-2"
            >
              <span>{p.emoji}</span>
              {p.label}
            </button>
          ))}
        </div>

        {/* Filters Panel */}
        <CyberCard className="overflow-hidden" showDecorators={false}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="w-full flex items-center justify-between px-5 py-3 text-[10px] font-black uppercase text-white/40 hover:text-white transition-colors"
          >
            <span className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#22C55E]" />
              Bộ lọc nâng cao
            </span>
            {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="px-5 pb-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
              >
                <FilterInput label="PE tối đa" value={filters.maxPE} onChange={v => setFilters({ ...filters, maxPE: v })} />
                <FilterInput label="PB tối đa" value={filters.maxPB} onChange={v => setFilters({ ...filters, maxPB: v })} step={0.5} />
                <FilterInput label="ROE tối (%)" value={filters.minROE} onChange={v => setFilters({ ...filters, minROE: v })} />
                <FilterInput label="Vốn hóa (tỷ)" value={filters.minMarketCap} onChange={v => setFilters({ ...filters, minMarketCap: v })} step={100} />
                <FilterInput label="Rating" value={filters.minRating} onChange={v => setFilters({ ...filters, minRating: v })} step={0.5} min={0} max={5} />
                <div>
                  <CyberSubHeader className="mb-1.5 block">Sàn</CyberSubHeader>
                  <select
                    value={filters.exchange}
                    onChange={e => setFilters({ ...filters, exchange: e.target.value })}
                    className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono uppercase outline-none focus:border-[#22C55E]/40"
                  >
                    <option value="">Tất cả</option>
                    <option value="HOSE">HOSE</option>
                    <option value="HNX">HNX</option>
                    <option value="UPCOM">UPCOM</option>
                  </select>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CyberCard>

        {/* Results */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-white/20 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-[#22C55E]" />
            <CyberHeader size="xs">Đang quét {filters.exchange || "tất cả"} sàn...</CyberHeader>
          </div>
        ) : error ? (
          <div className="text-center py-20">
            <CyberHeader size="xs" color="text-[#EF4444]">{error}</CyberHeader>
          </div>
        ) : stocks.length === 0 ? (
          <div className="text-center py-20 text-white/20">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <CyberSubHeader>Không tìm thấy cổ phiếu phù hợp. Hãy thử nới lỏng bộ lọc.</CyberSubHeader>
          </div>
        ) : (
          <CyberCard className="overflow-hidden" showDecorators={false}>
            {/* Meta */}
            <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#22C55E]" />
                <CyberSubHeader>{stocks.length} CỔ PHIẾU • XẾP THEO {sortKey.toUpperCase()}</CyberSubHeader>
              </div>
              {fetchedAt && <CyberSubHeader>TRỰC TIẾP: {new Date(fetchedAt).toLocaleTimeString("vi-VN")}</CyberSubHeader>}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06] bg-white/[0.01]">
                    <th className="text-left px-5 py-4"><CyberSubHeader>#</CyberSubHeader></th>
                    <th className="text-left px-3 py-4"><CyberSubHeader>Mã</CyberSubHeader></th>
                    <th className="text-left px-3 py-4 hidden md:table-cell"><CyberSubHeader>Ngành</CyberSubHeader></th>
                    <ThSortable label="Giá" col="price" onSort={handleSort} icon={<SortIcon col="price" />} />
                    <ThSortable label="%" col="changePct" onSort={handleSort} icon={<SortIcon col="changePct" />} />
                    <ThSortable label="PE" col="pe" onSort={handleSort} icon={<SortIcon col="pe" />} />
                    <ThSortable label="PB" col="pb" onSort={handleSort} icon={<SortIcon col="pb" />} />
                    <ThSortable label="ROE%" col="roe" onSort={handleSort} icon={<SortIcon col="roe" />} />
                    <ThSortable label="Vốn hóa" col="marketCap" onSort={handleSort} icon={<SortIcon col="marketCap" />} />
                    <ThSortable label="Đánh giá" col="rating" onSort={handleSort} icon={<SortIcon col="rating" />} />
                    <ThSortable label="Điểm" col="compositeScore" onSort={handleSort} icon={<SortIcon col="compositeScore" />} />
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((s, i) => (
                    <motion.tr
                      key={s.ticker}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.02, 0.4) }}
                      className="border-b border-white/[0.03] hover:bg-[#22C55E]/[0.02] transition-colors group"
                    >
                      <td className="px-5 py-4"><CyberTypography size="xs" variant="mono" className="text-white/20">{i + 1}</CyberTypography></td>
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-[#22C55E]/30 transition-all">
                            <Building2 className="w-4 h-4 text-[#22C55E]" />
                          </div>
                          <div>
                            <CyberTypography size="sm" className="text-white font-black">{s.ticker}</CyberTypography>
                            <div className="text-[9px] font-mono text-white/30 max-w-[100px] truncate uppercase">{s.shortName}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 hidden md:table-cell max-w-[120px] truncate">
                        <CyberSubHeader>{s.industry || "—"}</CyberSubHeader>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <CyberTypography size="xs" variant="mono" className="text-white">{s.price > 0 ? s.price.toLocaleString("vi-VN") : "—"}</CyberTypography>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <span className={cn(
                          "font-mono text-[11px] font-black flex items-center justify-end gap-1",
                          s.changePct > 0 ? "text-[#22C55E]" : s.changePct < 0 ? "text-[#EF4444]" : "text-white/40"
                        )}>
                          {s.changePct > 0 ? "+" : ""}{s.changePct.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-3 py-4 text-right"><CyberTypography size="xs" variant="mono" className="text-white/60">{s.pe.toFixed(1)}</CyberTypography></td>
                      <td className="px-3 py-4 text-right"><CyberTypography size="xs" variant="mono" className="text-white/60">{s.pb.toFixed(1)}</CyberTypography></td>
                      <td className="px-3 py-4 text-right"><CyberTypography size="xs" variant="mono" color="text-[#22C55E]/80">{s.roe.toFixed(1)}%</CyberTypography></td>
                      <td className="px-3 py-4 text-right">
                        <CyberTypography size="xs" variant="mono" className="text-white/40">
                          {s.marketCap >= 1000 ? `${(s.marketCap / 1000).toFixed(1)}K` : s.marketCap}
                        </CyberTypography>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center justify-end gap-0.5">
                          {Array.from({ length: 5 }, (_, j) => (
                            <Star key={j} className={cn("w-2.5 h-2.5", j < Math.round(s.rating) ? "text-[#22C55E] fill-[#22C55E]" : "text-white/10")} />
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <CyberMetric size="xs" color={scoreColor(s.compositeScore)}>{s.compositeScore}</CyberMetric>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CyberCard>
        )}

        {/* Top 3 Insight Card */}
        {sorted.length >= 3 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
            <CyberCard className="p-5" variant="success">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🏆</span>
                <CyberHeader size="xs" color="text-[#22C55E]">Top 3 cổ phiếu nổi bật</CyberHeader>
              </div>

              <div className="grid md:grid-cols-3 gap-3">
                {sorted.slice(0, 3).map((s, i) => {
                  const category = s.pe < 10 ? "Giá trị" : s.roe > 20 ? "Tăng trưởng" : s.marketCap > 5000 ? "Đầu ngành" : "Tiềm năng";
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
                  return (
                    <div key={s.ticker} className="flex items-center gap-4 p-3 rounded-xl bg-white/[0.03] border border-white/5">
                      <span className="text-2xl shrink-0">{medal}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <CyberTypography size="sm" className="text-white font-black">{s.ticker}</CyberTypography>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">{category}</span>
                        </div>
                        <CyberSubHeader className="block">Score: <span className={scoreColor(s.compositeScore)}>{s.compositeScore}</span> • ROE: {s.roe.toFixed(1)}%</CyberSubHeader>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[9px] font-mono text-white/20 mt-4 uppercase border-t border-white/5 pt-3">⚠️ Đây KHÔNG phải khuyến nghị mua. Hãy tự nghiên cứu thêm trước khi quyết định.</p>
            </CyberCard>
          </motion.div>
        )}

        {/* Disclaimer */}
        <CyberSubHeader className="text-center block opacity-30">
          Dữ liệu chốt ngày (End-Of-Day) từ TCBS API. Không phù hợp cho scalping/day-trading. Hãy tự nghiên cứu trước quyết định.
        </CyberSubHeader>
      </div>
    </RequireTier>
  );
}

/* ─── Sub-components ─── */

function FilterInput({ label, value, onChange, step = 1, min = 0, max = 999 }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <CyberSubHeader className="mb-1.5 block">{label}</CyberSubHeader>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="w-full bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#22C55E]/40"
      />
    </div>
  );
}

function ThSortable({ label, col, onSort, icon }: {
  label: string; col: keyof StockResult; onSort: (k: keyof StockResult) => void; icon: React.ReactNode;
}) {
  return (
    <th
      onClick={() => onSort(col)}
      className="text-right px-3 py-4 cursor-pointer hover:bg-white/5 transition-colors whitespace-nowrap"
    >
      <div className="inline-flex items-center gap-1">
        <CyberSubHeader>{label}</CyberSubHeader> {icon}
      </div>
    </th>
  );
}
