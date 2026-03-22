"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, TrendingUp, TrendingDown, Star, Loader2,
  ChevronDown, ChevronUp, BarChart3, Sparkles, ArrowUpDown,
  Building2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
  { label: "Blue-chip", emoji: "💎", filters: { maxPE: 20, maxPB: 3, minROE: 15, minMarketCap: 5000, minRating: 3, exchange: "HOSE" } },
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      ? <ChevronDown className="w-3 h-3 text-[#E6B84F]" />
      : <ChevronUp className="w-3 h-3 text-[#E6B84F]" />;
  };

  const scoreColor = (s: number) => {
    if (s >= 60) return "text-emerald-400";
    if (s >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-[#E6B84F]" />
            <span className="text-gradient">Lọc Cổ Phiếu</span>
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Tìm cổ phiếu tiềm năng từ {stocks.length > 0 ? `${stocks.length} kết quả` : "1500+ mã"} trên sàn VN
          </p>
        </div>
        <button
          onClick={fetchStocks}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-[#E6B84F]/10 border border-[#E6B84F]/20 rounded-xl text-[#E6B84F] text-sm font-medium hover:bg-[#E6B84F]/20 transition-all disabled:opacity-50"
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
            className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-white/60 hover:bg-white/[0.08] hover:text-white transition-all flex items-center gap-1.5"
          >
            <span>{p.emoji}</span>
            {p.label}
          </button>
        ))}
      </div>

      {/* Filters Panel */}
      <motion.div
        className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden"
      >
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-white/60 hover:text-white transition-colors"
        >
          <span className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
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
              className="px-5 pb-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
            >
              <FilterInput label="PE tối đa" value={filters.maxPE} onChange={v => setFilters({ ...filters, maxPE: v })} />
              <FilterInput label="PB tối đa" value={filters.maxPB} onChange={v => setFilters({ ...filters, maxPB: v })} step={0.5} />
              <FilterInput label="ROE tối thiểu (%)" value={filters.minROE} onChange={v => setFilters({ ...filters, minROE: v })} />
              <FilterInput label="Vốn hóa tối thiểu (tỷ)" value={filters.minMarketCap} onChange={v => setFilters({ ...filters, minMarketCap: v })} step={100} />
              <FilterInput label="Rating tối thiểu" value={filters.minRating} onChange={v => setFilters({ ...filters, minRating: v })} step={0.5} min={0} max={5} />
              <div>
                <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">Sàn</label>
                <select
                  value={filters.exchange}
                  onChange={e => setFilters({ ...filters, exchange: e.target.value })}
                  className="w-full mt-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#E6B84F]/40"
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
      </motion.div>

      {/* Results */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/40 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#E6B84F]" />
          <p className="text-sm">Đang quét {filters.exchange || "tất cả"} sàn...</p>
        </div>
      ) : error ? (
        <div className="text-center py-16 text-red-400/80 text-sm">{error}</div>
      ) : stocks.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <Search className="w-10 h-10 mx-auto mb-3 text-white/20" />
          <p className="text-sm">Không tìm thấy cổ phiếu phù hợp. Thử nới lỏng bộ lọc.</p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
          {/* Meta */}
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between text-xs text-white/30">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#E6B84F]" />
              {stocks.length} cổ phiếu • Xếp theo {sortKey}
            </span>
            {fetchedAt && <span>Cập nhật: {new Date(fetchedAt).toLocaleTimeString("vi-VN")}</span>}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] text-white/30 uppercase tracking-wider border-b border-white/[0.06]">
                  <th className="text-left px-5 py-3">#</th>
                  <th className="text-left px-3 py-3">Mã</th>
                  <th className="text-left px-3 py-3 hidden md:table-cell">Ngành</th>
                  <ThSortable label="Giá" col="price" onSort={handleSort} icon={<SortIcon col="price" />} />
                  <ThSortable label="%" col="changePct" onSort={handleSort} icon={<SortIcon col="changePct" />} />
                  <ThSortable label="PE" col="pe" onSort={handleSort} icon={<SortIcon col="pe" />} />
                  <ThSortable label="PB" col="pb" onSort={handleSort} icon={<SortIcon col="pb" />} />
                  <ThSortable label="ROE%" col="roe" onSort={handleSort} icon={<SortIcon col="roe" />} />
                  <ThSortable label="Vốn hóa" col="marketCap" onSort={handleSort} icon={<SortIcon col="marketCap" />} />
                  <ThSortable label="Rating" col="rating" onSort={handleSort} icon={<SortIcon col="rating" />} />
                  <ThSortable label="Score" col="compositeScore" onSort={handleSort} icon={<SortIcon col="compositeScore" />} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((s, i) => (
                  <motion.tr
                    key={s.ticker}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/[0.03] hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="px-5 py-3 text-white/20 font-mono text-xs">{i + 1}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E6B84F]/20 to-[#E6B84F]/5 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-[#E6B84F]" />
                        </div>
                        <div>
                          <div className="font-bold text-white">{s.ticker}</div>
                          <div className="text-[10px] text-white/30 max-w-[120px] truncate">{s.shortName}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-white/40 text-xs hidden md:table-cell max-w-[100px] truncate">{s.industry || "—"}</td>
                    <td className="px-3 py-3 font-mono text-white/80">{s.price > 0 ? s.price.toLocaleString("vi-VN") : "—"}</td>
                    <td className="px-3 py-3">
                      <span className={cn(
                        "font-mono text-xs font-medium flex items-center gap-0.5",
                        s.changePct > 0 ? "text-emerald-400" : s.changePct < 0 ? "text-red-400" : "text-white/40"
                      )}>
                        {s.changePct > 0 ? <TrendingUp className="w-3 h-3" /> : s.changePct < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        {s.changePct > 0 ? "+" : ""}{s.changePct.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-white/60">{s.pe.toFixed(1)}</td>
                    <td className="px-3 py-3 font-mono text-white/60">{s.pb.toFixed(1)}</td>
                    <td className="px-3 py-3 font-mono text-emerald-400/80">{s.roe.toFixed(1)}%</td>
                    <td className="px-3 py-3 font-mono text-white/50 text-xs">
                      {s.marketCap >= 1000 ? `${(s.marketCap / 1000).toFixed(1)}K` : s.marketCap}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-0.5">
                        {Array.from({ length: 5 }, (_, j) => (
                          <Star key={j} className={cn("w-3 h-3", j < Math.round(s.rating) ? "text-[#E6B84F] fill-[#E6B84F]" : "text-white/10")} />
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={cn("font-mono font-bold text-sm", scoreColor(s.compositeScore))}>
                        {s.compositeScore}
                      </span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top 3 Insight Card */}
      {sorted.length >= 3 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/[0.02] border border-[#E6B84F]/10 rounded-2xl p-5 relative overflow-hidden"
        >
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#E6B84F]/5 rounded-full blur-[80px] pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🏆</span>
              <h3 className="text-sm font-bold text-[#E6B84F]">Top 3 Cổ Phiếu Nổi Bật</h3>
            </div>
            <div className="space-y-2.5">
              {sorted.slice(0, 3).map((s, i) => {
                const category = s.pe < 10 ? "Giá trị" : s.roe > 20 ? "Tăng trưởng" : s.marketCap > 5000 ? "Blue-chip" : "Tiềm năng";
                const emoji = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
                return (
                  <div key={s.ticker} className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.02]">
                    <span className="text-lg shrink-0">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{s.ticker}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E6B84F]/10 text-[#E6B84F] font-medium">{category}</span>
                        <span className={cn("text-[10px] font-mono", s.changePct >= 0 ? "text-emerald-400" : "text-red-400")}>
                          {s.changePct >= 0 ? "+" : ""}{s.changePct.toFixed(1)}%
                        </span>
                      </div>
                      <p className="text-[11px] text-white/30 mt-0.5">
                        PE {s.pe.toFixed(1)} • PB {s.pb.toFixed(1)} • ROE {s.roe.toFixed(1)}% • Score <strong className={scoreColor(s.compositeScore)}>{s.compositeScore}</strong>
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-white/20 mt-3">⚠️ Đây KHÔNG phải khuyến nghị mua. Hãy tự nghiên cứu thêm trước khi quyết định.</p>
          </div>
        </motion.div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-white/20 text-center">
        ⚠️ Dữ liệu từ TCBS API. Đây KHÔNG phải lời khuyên đầu tư. Hãy tự nghiên cứu trước khi quyết định.
      </p>
    </div>
  );
}

/* ─── Sub-components ─── */

function FilterInput({ label, value, onChange, step = 1, min = 0, max = 999 }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number;
}) {
  return (
    <div>
      <label className="text-[11px] text-white/30 font-medium uppercase tracking-wider">{label}</label>
      <input
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        step={step}
        min={min}
        max={max}
        className="w-full mt-1 bg-white/[0.05] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white font-mono outline-none focus:border-[#E6B84F]/40"
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
      className="text-right px-3 py-3 cursor-pointer hover:text-white/60 transition-colors whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1">
        {label} {icon}
      </span>
    </th>
  );
}
