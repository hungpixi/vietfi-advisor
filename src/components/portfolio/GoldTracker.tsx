"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trash2, Plus, TrendingUp, TrendingDown, Coins } from "lucide-react";
import { getGoldPurchases, addGoldPurchase, deleteGoldPurchase, type GoldPurchase } from "@/lib/storage";

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
    
    // 1. Phân loại mã Thương hiệu
    let brandCode = null;
    if (brand === 'Bảo Tín Minh Châu') brandCode = 'BTMC';
    else if (brand === 'DOJI') brandCode = 'DOJI';
    else if (brand === 'PNJ') brandCode = 'PNJ';
    else if (brand === 'Mi Hồng') brandCode = 'Mi Hồng';
    else if (brand === 'SJC') brandCode = 'SJC';

    // 2. Tìm giá thực từ Multi-Brand Crawler (Ưu tiên 1)
    if (marketData.goldBrands && brandCode && brandCode !== 'SJC') {
      const typeSuffix = type === "Vàng miếng" ? "_SJC" : "_NHAN";
      const key = `${brandCode}${typeSuffix}`;
      const brandData = marketData.goldBrands[key];
      // Tính PnL thanh khoản: Vàng mang ra tiệm bán -> tiệm "Mua vào". Vì vậy dùng giá BUY của tiệm.
      if (brandData && brandData.buy > 0) {
        return brandData.buy / 10; // Trả về VNĐ / Chỉ
      }
    }
    
    // 3. Fallback / Nội suy (Ưu tiên 2)
    // Nếu là vàng SJC (miếng) hoặc tất cả vàng brand "SJC" -> Dùng giá SJC API gốc
    if ((type === "Vàng miếng" || brand === "SJC") && marketData.goldSjc?.goldVnd) {
      return marketData.goldSjc.goldVnd / 10;
    }
    
    // Nếu là vàng Nhẫn 9999 hãng "Khác" hoặc cào data webgia thất bại -> Dùng Vàng Global
    if (marketData.goldSjc?.goldUsd && marketData.usdVnd?.rate) {
      // 1 Lượng = 1.20565 troy ounce
      const globalVndPerLuong = marketData.goldSjc.goldUsd * marketData.usdVnd.rate * 1.20565;
      const globalVndPerChi = globalVndPerLuong / 10;
      // Premium Nhẫn trơn nội địa VN thường ~3 triệu/lượng => 300,000 đ/chỉ
      return globalVndPerChi + 300000;
    }
    
    return null;
  };

  const fmtVnd = (val: number) => new Intl.NumberFormat('vi-VN').format(Math.round(val)) + 'đ';

  return (
    <div className="glass-card p-5 mb-4 border border-[#E6B84F]/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Coins className="w-5 h-5 text-[#E6B84F]" />
          <h3 className="text-sm font-semibold text-white">Sổ Vàng (PnL Vật Chất)</h3>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E6B84F]/10 hover:bg-[#E6B84F]/20 text-[#E6B84F] text-xs font-semibold rounded-lg transition-colors border border-[#E6B84F]/20"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm mẻ Vàng
          </button>
        )}
      </div>

      {isAdding && (
        <motion.form 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }} 
          className="bg-white/[0.02] border border-white/[0.05] p-4 rounded-xl mb-4 text-[13px]"
          onSubmit={handleAdd}
        >
          <div className="grid sm:grid-cols-2 gap-4 mb-3">
            <div>
              <label className="text-white/40 block mb-1">Thương hiệu</label>
              <select 
                value={form.brand} 
                onChange={e => setForm({...form, brand: e.target.value})}
                className="w-full p-2 bg-black/20 border border-white/10 rounded-lg text-white outline-none"
              >
                {BRANDS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/40 block mb-1">Loại vàng</label>
              <select 
                value={form.type} 
                onChange={e => setForm({...form, type: e.target.value})}
                className="w-full p-2 bg-black/20 border border-white/10 rounded-lg text-white outline-none"
              >
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/40 block mb-1">Số lượng (Chỉ)</label>
              <input 
                type="number" step="0.1" required
                value={form.weight} 
                onChange={e => setForm({...form, weight: Number(e.target.value)})}
                className="w-full p-2 bg-black/20 border border-white/10 rounded-lg text-white outline-none" 
              />
            </div>
            <div>
              <label className="text-white/40 block mb-1">Giá MUA BAO (VND/chỉ)</label>
              <input 
                type="number" step="10000" required
                value={form.buyPrice} 
                onChange={e => setForm({...form, buyPrice: Number(e.target.value)})}
                className="w-full p-2 bg-black/20 border border-white/10 rounded-lg text-white outline-none" 
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-[#E6B84F] hover:bg-[#FFD700] text-black font-semibold rounded-lg flex-1 transition-colors">Lưu vào Sổ</button>
            <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors">Hủy</button>
          </div>
        </motion.form>
      )}

      {purchases.length === 0 && !isAdding && (
        <div className="text-center py-6 text-white/30 text-xs">
          Bạn chưa ghi nhận mẻ vàng nào. Ấn "Thêm mẻ Vàng" để bắt đầu theo dõi Lãi/Lỗ.
        </div>
      )}

      {purchases.length > 0 && (
        <div className="space-y-3">
          {purchases.map(p => {
            const currentPrice = getMarketPricePerChi(p.type, p.brand);
            const totalBuy = p.weight * p.buyPrice;
            
            let pnlStr = "Đang cập nhật giá...";
            let pnlColor = "text-white/40";
            let pnlPct = 0;
            let pnlRaw = 0;

            if (currentPrice) {
              const totalCurrent = p.weight * currentPrice;
              pnlRaw = totalCurrent - totalBuy;
              pnlPct = (pnlRaw / totalBuy) * 100;
              
              if (pnlRaw > 0) {
                pnlStr = `+${fmtVnd(pnlRaw)} (+${pnlPct.toFixed(1)}%)`;
                pnlColor = "text-[#22C55E]";
              } else if (pnlRaw < 0) {
                pnlStr = `${fmtVnd(pnlRaw)} (${pnlPct.toFixed(1)}%)`;
                pnlColor = "text-[#EF4444]";
              } else {
                pnlStr = "Hòa vốn";
                pnlColor = "text-white/50";
              }
            }

            return (
              <div key={p.id} className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl flex items-center justify-between group">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-semibold text-white/90">{p.brand} ({p.type})</span>
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/60">{p.weight} chỉ</span>
                  </div>
                  <div className="text-[11px] text-white/40">
                    <div>Mua: <span className="text-white/60">{fmtVnd(p.buyPrice)}/chỉ</span> • {new Date(p.date).toLocaleDateString("vi-VN")}</div>
                    {currentPrice && <div>Thị trường: <span className="text-[#E6B84F]">{fmtVnd(currentPrice)}/chỉ</span></div>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className={`text-right ${pnlColor}`}>
                    <div className="text-[13px] font-bold flex items-center justify-end gap-1">
                      {pnlRaw > 0 && <TrendingUp className="w-3.5 h-3.5" />}
                      {pnlRaw < 0 && <TrendingDown className="w-3.5 h-3.5" />}
                      {pnlStr.split(' ')[0]}
                    </div>
                    {pnlStr.includes('(') && <div className="text-[10px]">{pnlStr.split(' ')[1]}</div>}
                  </div>
                  <button onClick={() => handleDelete(p.id)} className="p-2 text-white/20 hover:text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
