import { useState } from "react";
import { UIDebt, formatVND } from "./types";

export function ExtraPaymentSlider({ totalDebt, totalMonthlyMin, debts }: { totalDebt: number; totalMonthlyMin: number; debts: UIDebt[] }) {
  const [extra, setExtra] = useState(0);
  const maxExtra = Math.min(3000000, totalDebt); // max 3tr/tháng

  const baseMonths = Math.max(1, Math.ceil(totalDebt / totalMonthlyMin));
  const newMonths = totalMonthlyMin + extra > 0 ? Math.max(1, Math.ceil(totalDebt / (totalMonthlyMin + extra))) : baseMonths;
  const savedMonths = baseMonths - newMonths;

  // Tính lãi tiết kiệm được
  const baseInterest = debts.reduce((s, d) => s + d.principal * (d.rate / 12 / 100) * baseMonths, 0);
  const newInterest = debts.reduce((s, d) => s + d.principal * (d.rate / 12 / 100) * newMonths, 0);
  const savedInterest = Math.max(0, baseInterest - newInterest);

  return (
    <div className="mt-4 pt-4 border-t border-white/[0.04]">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/40 font-bold">NẾU THẮT LƯNG BUỘC BỤNG TRẢ THÊM</span>
        <span className="text-xs font-black text-[#E6B84F]">+{formatVND(extra)}/tháng</span>
      </div>

      {/* Slider */}
      <div className="relative pt-1 pb-4">
        <input
          type="range"
          min={0}
          max={maxExtra}
          step={50000}
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="w-full h-1.5 bg-black/40 rounded-full appearance-none cursor-pointer accent-[#E6B84F] outline-none"
          style={{
            background: `linear-gradient(to right, #E6B84F ${(extra / maxExtra) * 100}%, rgba(255,255,255,0.05) ${(extra / maxExtra) * 100}%)`,
          }}
        />
        <div className="flex justify-between text-[9px] text-white/30 mt-2 font-mono">
          <span>0 ₫</span>
          <span>{formatVND(maxExtra)} ₫</span>
        </div>
      </div>

      {extra > 0 && (
        <div className="space-y-2 bg-gradient-to-br from-[#22C55E]/10 to-transparent border border-[#22C55E]/20 rounded-xl p-4 shadow-inner">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-white/60 font-medium">Bạn sẽ thoát nợ sớm hơn</span>
            <span className="text-sm font-black text-[#E6B84F] bg-[#E6B84F]/10 px-2 py-0.5 rounded-md">{savedMonths} Tháng</span>
          </div>
          {savedInterest > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-white/60 font-medium">Tiết kiệm được bộn tiền lãi</span>
              <span className="text-sm font-black text-[#22C55E] bg-[#22C55E]/10 px-2 py-0.5 rounded-md">{formatVND(Math.round(savedInterest))}</span>
            </div>
          )}
          <p className="text-[10px] text-white/40 mt-2 pt-2 border-t border-[#22C55E]/10 italic">
            💡 "Một đồng tiết kiệm được là một đồng cướp lại được từ bọn tài phiệt." — Khuyết danh
          </p>
        </div>
      )}
    </div>
  );
}
