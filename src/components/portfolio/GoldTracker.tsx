"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Plus, TrendingUp, TrendingDown, Coins, X } from "lucide-react";
import { getGoldPurchases, addGoldPurchase, deleteGoldPurchase, type GoldPurchase } from "@/lib/storage";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

interface GoldTrackerProps {
  marketData: {
    goldBrands?: Record<string, { buy: number }>;
    goldSjc?: { goldVnd?: number; goldUsd?: number };
    usdVnd?: { rate?: number };
  } | null;
}

const BRANDS = ["SJC", "Bảo Tín Minh Châu", "DOJI", "PNJ", "Mi Hồng", "Khác"];
const TYPES = ["Vàng miếng", "Vàng nhẫn 9999"];

export function GoldTracker({ marketData }: GoldTrackerProps) {
  const [purchases, setPurchases] = useState<GoldPurchase[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const [form, setForm] = useState({
    brand: "SJC",
    type: "Vàng miếng",
    weight: 10,       // 1 lượng
    buyPrice: 8000000 // VND/chỉ
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPurchases(getGoldPurchases());
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const np = {
      brand: form.brand,
      type: form.type,
      weight: Number(form.weight),
      buyPrice: Number(form.buyPrice),
      date: new Date().toISOString()
    };
    addGoldPurchase(np);
    setPurchases(getGoldPurchases());
    setIsAdding(false);
  };

  const handleDelete = (id: string) => {
    deleteGoldPurchase(id);
    setPurchases(getGoldPurchases());
  };

  const getMarketPricePerChi = (type: string, brand: string) => {
    if (!marketData) return null;
    let brandCode = null;
    if (brand === 'Bảo Tín Minh Châu') brandCode = 'BTMC';
    else if (brand === 'DOJI') brandCode = 'DOJI';
    else if (brand === 'PNJ') brandCode = 'PNJ';
    else if (brand === 'Mi Hồng') brandCode = 'Mi Hồng';
    else if (brand === 'SJC') brandCode = 'SJC';

    if (marketData.goldBrands && brandCode && brandCode !== 'SJC') {
      const typeSuffix = type === "Vàng miếng" ? "_SJC" : "_NHAN";
      const key = `${brandCode}${typeSuffix}`;
      const brandData = marketData.goldBrands[key];
      if (brandData && brandData.buy > 0) {
        return brandData.buy / 10;
      }
    }

    if ((type === "Vàng miếng" || brand === "SJC") && marketData.goldSjc?.goldVnd) {
      return marketData.goldSjc.goldVnd / 10;
    }

    if (marketData.goldSjc?.goldUsd && marketData.usdVnd?.rate) {
      const globalVndPerLuong = marketData.goldSjc.goldUsd * marketData.usdVnd.rate * 1.20565;
      const globalVndPerChi = globalVndPerLuong / 10;
      return globalVndPerChi + 300000;
    }
    return null;
  };

  const fmtVnd = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round(val)) + 'Đ';

  return (
    <CyberCard className="p-5 mb-4" variant="success">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-[#22C55E]" />
          <CyberHeader size="xs">Sổ Vàng vật chất</CyberHeader>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#22C55E]/10 hover:bg-[#22C55E]/20 text-[#22C55E] text-[10px] font-black uppercase tracking-widest rounded-lg transition-all border border-[#22C55E]/20"
          >
            <Plus className="w-4 h-4" /> Thêm mẻ
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white/[0.03] border border-white/5 p-5 rounded-xl mb-6"
            onSubmit={handleAdd}
          >
            <div className="flex justify-between items-center mb-4">
              <CyberSubHeader color="text-[#22C55E]">NHẬP THÔNG TIN MUA VÀNG</CyberSubHeader>
              <button type="button" onClick={() => setIsAdding(false)} className="text-white/20 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <CyberSubHeader className="mb-1.5 block">THƯƠNG HIỆU</CyberSubHeader>
                <select
                  value={form.brand}
                  onChange={e => setForm({ ...form, brand: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white font-mono uppercase outline-none focus:border-[#22C55E]/40"
                >
                  {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <CyberSubHeader className="mb-1.5 block">LOẠI VÀNG</CyberSubHeader>
                <select
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white font-mono uppercase outline-none focus:border-[#22C55E]/40"
                >
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <CyberSubHeader className="mb-1.5 block">SỐ LƯỢNG (CHỈ)</CyberSubHeader>
                <input
                  type="number" step="0.1" required
                  value={form.weight}
                  onChange={e => setForm({ ...form, weight: Number(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white font-mono outline-none"
                />
              </div>
              <div>
                <CyberSubHeader className="mb-1.5 block">GIÁ MUA (Đ/CHỈ)</CyberSubHeader>
                <input
                  type="number" step="10000" required
                  value={form.buyPrice}
                  onChange={e => setForm({ ...form, buyPrice: Number(e.target.value) })}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white font-mono outline-none"
                />
              </div>
            </div>
            <button type="submit" className="w-full py-2.5 bg-[#22C55E] text-black text-[10px] font-black uppercase tracking-widest rounded-lg hover:shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-all">
              Lưu vào sổ vàng
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {purchases.length === 0 && !isAdding && (
        <div className="py-12 flex flex-col items-center justify-center gap-3">
          <Coins className="w-8 h-8 text-white/5" />
          <CyberSubHeader className="text-center opacity-30">Chưa ghi nhận mẻ vàng nào</CyberSubHeader>
        </div>
      )}

      <div className="grid gap-3">
        {purchases.map(p => {
          const currentPrice = getMarketPricePerChi(p.type, p.brand);
          const totalBuy = p.weight * p.buyPrice;

          let pnlLabel = "ĐANG CẬP NHẬT...";
          let pnlColor = "text-white/20";
          let pnlPct = 0;
          let pnlRaw = 0;

          if (currentPrice) {
            const totalCurrent = p.weight * currentPrice;
            pnlRaw = totalCurrent - totalBuy;
            pnlPct = (pnlRaw / totalBuy) * 100;

            if (pnlRaw > 0) {
              pnlLabel = `+${fmtVnd(pnlRaw)} (+${pnlPct.toFixed(1)}%)`;
              pnlColor = "text-[#22C55E]";
            } else if (pnlRaw < 0) {
              pnlLabel = `${fmtVnd(pnlRaw)} (${pnlPct.toFixed(1)}%)`;
              pnlColor = "text-[#EF4444]";
            } else {
              pnlLabel = "HÒA VỐN";
              pnlColor = "white/40";
            }
          }

          return (
            <div key={p.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl group hover:bg-white/[0.04] transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CyberTypography size="sm" className="text-white font-black">{p.brand} ({p.type.toUpperCase()})</CyberTypography>
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E] rounded uppercase tracking-wider">{p.weight} CHỈ</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <CyberSubHeader className="flex items-center gap-1.5 uppercase">
                      MUA: <span className="text-white/60 font-mono italic">{fmtVnd(p.buyPrice)}</span>/CHỈ
                    </CyberSubHeader>
                    {currentPrice && (
                      <CyberSubHeader className="flex items-center gap-1.5 uppercase">
                        SÀN: <span className="text-[#22C55E] font-mono italic">{fmtVnd(currentPrice)}</span>
                      </CyberSubHeader>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={cn("text-right", pnlColor)}>
                    <div className="text-[14px] font-black font-heading flex items-center justify-end gap-1 uppercase tracking-tight">
                      {pnlRaw > 0 && <TrendingUp className="w-3.5 h-3.5" />}
                      {pnlRaw < 0 && <TrendingDown className="w-3.5 h-3.5" />}
                      {pnlLabel.split(' ')[0]}
                    </div>
                    {pnlLabel.includes('(') && <CyberTypography size="xs" variant="mono" className="opacity-80 font-black">{pnlLabel.split(' ')[1]}</CyberTypography>}
                  </div>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-white/10 hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </CyberCard>
  );
}
