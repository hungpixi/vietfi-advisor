import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, ShieldAlert } from "lucide-react";
import { UIDebt, ICON_MAP, COLOR_OPTIONS, formatVND } from "./types";

export function AddDebtModal({ onClose, onAdd }: { onClose: () => void; onAdd: (d: Omit<UIDebt, "id">) => void }) {
  const [name, setName] = useState("");
  const [principal, setPrincipal] = useState<number | "">("");
  const [rate, setRate] = useState<number | "">("");
  const [minPayment, setMinPayment] = useState<number | "">("");
  const [hiddenFees, setHiddenFees] = useState<number | "">("");
  const [type, setType] = useState<UIDebt["type"]>("other");
  const [color, setColor] = useState("#E6B84F");

  const handleSubmit = () => {
    const p = Number(principal) || 0;
    if (!name || p <= 0) return;
    onAdd({
      name,
      principal: p,
      rate: Number(rate) || 0,
      minPayment: Number(minPayment) || Math.round(p * 0.05),
      type,
      hiddenFees: Number(hiddenFees) || 0,
      icon: type,
      color,
    });
    onClose();
  };

  const isDarkDebt = type === "bnpl" || type === "credit_card" || type === "loan_shark";
  const pVal = Number(principal) || 0;
  const rVal = Number(rate) || 0;
  const hVal = Number(hiddenFees) || 0;
  const yearlyInterest = pVal * (rVal / 100);
  const yearlyFees = hVal * 12;
  const realInterestRate = pVal > 0 ? ((yearlyInterest + yearlyFees) / pVal) * 100 : rVal;
  const showScaryWarning = isDarkDebt && hVal > 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-card p-6 my-8 border-t border-[#E6B84F]/20 relative overflow-hidden"
      >
        {/* Glow effect for dark debts */}
        {isDarkDebt && (
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#EF4444]/20 to-transparent pointer-events-none" />
        )}

        <div className="flex items-center justify-between mb-5 relative z-10">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              Khai báo Nợ <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full text-white/50 font-normal">Thành thật với bản thân</span>
            </h3>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors bg-white/5 p-1.5 rounded-full"><X className="w-4 h-4" /></button>
        </div>

        <div className="space-y-4 relative z-10">
          <div>
            <label className="text-[10px] text-white/40 uppercase font-mono tracking-wider block mb-1.5 font-bold">Tên khoản nợ (App, Ngân hàng, Người quen)</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#E6B84F]/50 transition-colors" placeholder="VD: Thẻ tín dụng VIB, Nhờ vả bạn A..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/40 uppercase font-mono tracking-wider block mb-1.5 font-bold">Dư nợ gốc (₫)</label>
              <input type="number" value={principal} onChange={(e) => setPrincipal(Number(e.target.value))} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#E6B84F]/50 transition-colors" placeholder="5000000" />
            </div>
            <div>
              <label className="text-[10px] text-white/40 uppercase font-mono tracking-wider block mb-1.5 font-bold">Lãi suất (%/năm)</label>
              <input type="number" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#E6B84F]/50 transition-colors" placeholder="18" />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase font-mono tracking-wider block mb-1.5 font-bold">Tiền phải trả tối thiểu/tháng (₫)</label>
            <input type="number" value={minPayment} onChange={(e) => setMinPayment(Number(e.target.value))} className="w-full px-4 py-3 bg-black/40 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-[#E6B84F]/50 transition-colors" placeholder="250000" />
          </div>

          <div>
            <label className="text-[10px] text-white/40 uppercase font-mono tracking-wider block mb-1.5 font-bold">Loại nợ (Nguồn vay)</label>
            <div className="flex flex-wrap gap-2">
              {Object.entries(ICON_MAP).map(([key]) => {
                const label = key === "credit_card" ? "Thẻ tín dụng" : key === "bnpl" ? "Trả sau (SPayLater...)" : key === "personal" ? "Vay người thân" : key === "mortgage" ? "Nhà/Phòng trọ" : key === "loan_shark" ? "Tín dụng đen" : "Khác";
                const isSelected = type === key;
                return (
                  <button key={key} onClick={() => setType(key as UIDebt["type"])}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all ${isSelected ? "bg-[#E6B84F] text-black border-[#E6B84F] shadow-[0_0_15px_rgba(230,184,79,0.3)]" : "bg-black/30 text-white/50 border-white/10 hover:bg-white/5"}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence>
            {isDarkDebt && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-xl p-4 mt-2 mb-2 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#EF4444]/20 rounded-full blur-3xl" />
                  <label className="text-[10px] text-[#EF4444] uppercase font-mono tracking-wider block mb-1.5 font-bold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" /> Phí ẩn / Thuế Máu (VNĐ/tháng)
                  </label>
                  <p className="text-[10px] text-white/60 mb-3 leading-relaxed">
                    Các khoản vay tài chính, trả sau (Buy Now Pay Later) thường gài <strong className="text-white">&quot;Phí duy trì&quot;, &quot;Phí bảo hiểm khoản vay&quot;, &quot;Phí thu hộ&quot;</strong>. Cộng hết vào đây để thấy bức tranh thật!
                  </p>
                  <div className="relative">
                    <input type="number" value={hiddenFees} onChange={(e) => setHiddenFees(Number(e.target.value))} className="w-full px-4 py-3 bg-black/60 border border-[#EF4444]/50 rounded-xl text-sm text-white focus:outline-none focus:border-[#EF4444] transition-colors shadow-inner" placeholder="Ví dụ: 30000" />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#EF4444]">₫/Tháng</div>
                  </div>
                  
                  {showScaryWarning && (
                    <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-3 pt-3 border-t border-[#EF4444]/20">
                      <div className="flex items-start gap-2 text-xs">
                        <AlertTriangle className="w-4 h-4 text-[#FFD700] flex-shrink-0 mt-0.5 animate-pulse" />
                        <div>
                          Sự thật mất lòng: Lãi suất thực tế của khoản vay này không phải là {rVal}%/năm, mà là <span className="font-black text-[#FFD700] text-sm bg-[#EF4444]/20 px-1 rounded">{realInterestRate.toFixed(1)}%/năm</span>! 
                          Bạn đang trả <strong className="text-white">{formatVND(yearlyFees)}</strong> tiền phí vô lý mỗi năm.
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div>
            <label className="text-[10px] text-white/40 uppercase font-mono tracking-wider block mb-2 font-bold">Mã Màu Ghi Nhớ</label>
            <div className="flex gap-3">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full transition-all shadow-inner border border-white/10 ${color === c ? "ring-2 ring-white/60 scale-110 shadow-[0_0_15px_rgba(255,255,255,0.2)]" : "opacity-50 hover:opacity-100"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </div>

        <button onClick={handleSubmit} className="w-full mt-6 py-3.5 bg-gradient-to-r from-[#E6B84F] to-[#FFD700] text-black text-sm font-bold rounded-xl hover:shadow-[0_0_25px_rgba(230,184,79,0.4)] transition-all flex items-center justify-center gap-2">
          Lưu Khoản Nợ <span className="opacity-50 font-normal">| Đối mặt với hiện tại</span>
        </button>
      </motion.div>
    </div>
  );
}
