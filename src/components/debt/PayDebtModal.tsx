import { useState } from "react";
import { motion } from "framer-motion";
import { X, Check } from "lucide-react";
import { UIDebt, formatVND } from "./types";

export function PayDebtModal({ debt, onClose, onPay }: { debt: UIDebt; onClose: () => void; onPay: (id: string, amount: number) => void }) {
  const [amount, setAmount] = useState<number | "">(debt.minPayment);
  const quickAmounts = [debt.minPayment, Math.round(debt.principal * 0.1), Math.round(debt.principal * 0.25), debt.principal];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", damping: 25, stiffness: 300 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm glass-card p-5 sm:p-6 border-t border-[#22C55E]/20 relative overflow-hidden rounded-t-2xl sm:rounded-2xl max-h-[92vh] overflow-y-auto">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#22C55E]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between mb-5 relative z-10">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            Trả nợ <span className="text-[#22C55E]">• {debt.name}</span>
          </h3>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
        </div>

        <div className="mb-4 relative z-10">
          <label className="text-[10px] text-white/40 uppercase font-mono tracking-wider block mb-2 font-bold">Số tiền mặt đã ném vào nợ (₫)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full px-4 py-3 text-lg font-bold bg-black/50 border border-white/10 rounded-xl text-[#22C55E] focus:outline-none focus:border-[#22C55E]/50 transition-colors" placeholder="0" autoFocus />
        </div>

        <div className="flex flex-wrap gap-2 mb-6 relative z-10">
          {quickAmounts.filter((v, i, a) => a.indexOf(v) === i && v > 0).map((v) => {
            const isMin = v === debt.minPayment;
            const isFull = v === debt.principal;
            return (
              <button key={v} onClick={() => setAmount(v)} className={`px-3 py-2 text-[10px] font-bold rounded-lg border transition-all flex items-center gap-1 ${amount === v ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/40 shadow-[0_0_10px_rgba(34,197,94,0.2)] scale-105" : "bg-black/40 text-white/60 border-white/10 hover:bg-white/5"}`}>
                {isMin && <span className="opacity-50">Tối thiểu:</span>}
                {isFull && <span className="text-[#EF4444]">Tất toán:</span>}
                {!isMin && !isFull && <span className="opacity-50">+</span>}
                {formatVND(v)}
              </button>
            )
          })}
        </div>

        <div className="text-[10px] text-white/40 mb-3 text-center">
          Mỗi đồng trả nợ là một bước tiến gần hơn tới Tự Do. Cố lên!
        </div>

        <button
          onClick={() => { const val = Number(amount) || 0; if (val > 0) { onPay(debt.id, Math.min(val, debt.principal)); onClose(); } }}
          className="w-full py-3.5 bg-gradient-to-r from-[#22C55E] to-[#16a34a] text-black text-sm font-bold rounded-xl hover:shadow-[0_0_25px_rgba(34,197,94,0.4)] transition-all flex items-center justify-center gap-2 relative z-10"
        >
          <Check className="w-4 h-4" /> Tuyệt vời! Xác nhận rút máu
        </button>
      </motion.div>
    </div>
  );
}
