"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, ShieldAlert, X, Activity, Droplets, Zap, CheckCircle2 } from "lucide-react";
import { UIDebt, formatVND } from "./types";
import { getBudgetPots, setBudgetPots } from "@/lib/storage";

interface TriageProps {
  onClose: () => void;
  debts: UIDebt[];
  dtiRatio: number;
}

export function FinancialTriageModal({ onClose, debts, dtiRatio }: TriageProps) {
  const [phase, setPhase] = useState<"scanning" | "plan" | "success">("scanning");
  const [scanProgress, setScanProgress] = useState(0);
  const [scanText, setScanText] = useState("Đang khởi động hệ thống...");
  
  const [leisureAmount, setLeisureAmount] = useState(0);
  const [toxicDebts, setToxicDebts] = useState<UIDebt[]>([]);

  useEffect(() => {
    // Phân tích nợ độc hại (Lãi > 20%)
    const toxics = debts.filter(d => d.rate >= 20);
    setToxicDebts(toxics);

    // Tính toán số tiền quỹ Giải trí/Xa xỉ có thể cắt
    const pots = getBudgetPots();
    const leisurePots = pots.filter(p => {
      const n = p.name.toLowerCase();
      return n.includes("giải trí") || n.includes("mua sắm") || n.includes("sở thích") || n.includes("linh tinh") || n.includes("tiêu vặt") || n.includes("ăn chơi");
    });
    const totalLeisure = leisurePots.reduce((sum, p) => sum + p.allocated, 0);
    setLeisureAmount(totalLeisure);

    // Hiệu ứng Scanning giả lập
    if (phase === "scanning") {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 5;
        setScanProgress(progress);
        
        if (progress === 20) setScanText("Đang quét Dòng tiền tự do (Free Cashflow)...");
        if (progress === 50) setScanText("Phân tích danh mục nợ...");
        if (progress === 80) setScanText("Đang lập Phác đồ sinh tồn khẩn cấp...");
        
        if (progress >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase("plan"), 500);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [phase, debts]);

  const executeTriage = () => {
    // 1. Ghi đè Budget Pots (Ép quỹ giải trí về 0)
    const pots = getBudgetPots();
    const newPots = pots.map(p => {
      const n = p.name.toLowerCase();
      if (n.includes("giải trí") || n.includes("mua sắm") || n.includes("sở thích") || n.includes("linh tinh") || n.includes("tiêu vặt") || n.includes("ăn chơi")) {
        return { ...p, allocated: 0 };
      }
      return p;
    });
    setBudgetPots(newPots);

    // TODO: Chuyển thẳng `leisureAmount` vào trả nợ (Logic dồn lực Snowball)
    // Hiện tại chỉ UI ghi đè quỹ, ở bản thực tế sẽ update Extra Payment.

    setPhase("success");
    setTimeout(onClose, 4000); // Tự đóng sau 4s
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <AnimatePresence mode="wait">
        {phase === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-md bg-[#111] border border-[#EF4444]/30 rounded-2xl p-8 text-center"
          >
            <Activity className="w-16 h-16 text-[#EF4444] animate-pulse mx-auto mb-6" />
            <h2 className="text-xl font-black text-[#EF4444] tracking-widest uppercase mb-2">Trạm Cấp Cứu</h2>
            <p className="text-sm text-white/60 mb-8 h-6">{scanText}</p>
            
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#EF4444] to-[#FF6B35] transition-all duration-100 linear"
                style={{ width: `${scanProgress}%` }}
              />
            </div>
            <div className="text-[10px] font-mono text-[#EF4444]/60 mt-2">{scanProgress}%</div>
          </motion.div>
        )}

        {phase === "plan" && (
          <motion.div
            key="plan"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-lg bg-[#111] border border-[#EF4444] rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(239,68,68,0.15)]"
          >
            {/* Header */}
            <div className="bg-[#EF4444]/10 p-5 border-b border-[#EF4444]/20 flex justify-between items-start relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-[#EF4444]/10 rounded-full blur-2xl"></div>
               <div className="relative z-10">
                 <div className="flex items-center gap-2 mb-1">
                   <ShieldAlert className="w-6 h-6 text-[#EF4444]" />
                   <h2 className="text-xl font-black text-[#EF4444] uppercase tracking-wider">Phác đồ Sinh Tồn</h2>
                 </div>
                 <p className="text-xs text-[#EF4444]/80 ml-8">DTI của bạn ở mức {dtiRatio.toFixed(1)}% — Cực kỳ nguy hiểm!</p>
               </div>
               <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors relative z-10">
                 <X className="w-5 h-5" />
               </button>
            </div>

            {/* Diagnosis Content */}
            <div className="p-6 space-y-4">
               {/* Lệnh 1: Cắt máu */}
               <div className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                 <div className="w-10 h-10 rounded-full bg-[#E6B84F]/10 flex items-center justify-center shrink-0">
                   <Droplets className="w-5 h-5 text-[#E6B84F]" />
                 </div>
                 <div>
                   <h4 className="text-sm font-bold text-white mb-1">Lệnh 1: Cầm máu quỹ giải trí</h4>
                   <p className="text-xs text-white/50 leading-relaxed">
                     Hệ thống phát hiện bạn đang có <strong className="text-[#E6B84F]">{formatVND(leisureAmount)}</strong> trong nhóm quỹ "Sở thích/Ăn chơi". Bạn không có quyền giải trí khi DTI &gt; 40%. Phải cắt hoàn toàn 100%.
                   </p>
                 </div>
               </div>

               {/* Lệnh 2: Truy quét nợ độc */}
               {toxicDebts.length > 0 && (
                 <div className="flex gap-4 p-4 rounded-xl bg-[#EF4444]/[0.05] border border-[#EF4444]/20">
                   <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 flex items-center justify-center shrink-0">
                     <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                   </div>
                   <div>
                     <h4 className="text-sm font-bold text-[#EF4444] mb-1">Lệnh 2: Tự sát tài chính (Nợ Độc Hại)</h4>
                     <p className="text-xs text-white/50 leading-relaxed mb-2">
                       Bạn đang cõng {toxicDebts.length} khoản nợ cắt cổ:
                     </p>
                     <div className="space-y-1">
                       {toxicDebts.map(d => (
                         <div key={d.id} className="text-[11px] flex justify-between bg-[#EF4444]/10 px-2 py-1 rounded">
                           <span className="text-[#EF4444]/80">{d.name}</span>
                           <span className="font-bold text-[#EF4444]">Lãi {d.rate}%</span>
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>
               )}

               {/* Lệnh 3: Dồn lực */}
               <div className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                 <div className="w-10 h-10 rounded-full bg-[#22C55E]/10 flex items-center justify-center shrink-0">
                   <Zap className="w-5 h-5 text-[#22C55E]" />
                 </div>
                 <div>
                   <h4 className="text-sm font-bold text-white mb-1">Lệnh 3: Kích hoạt Snowball cưỡng bức</h4>
                   <p className="text-xs text-white/50 leading-relaxed">
                     Hệ thống sẽ ép toàn bộ <strong className="text-[#22C55E]">+{formatVND(leisureAmount)}</strong> cắt được vào quỹ trả nợ hàng tháng, ưu tiên tiêu diệt các khoản nợ độc hại trên!
                   </p>
                 </div>
               </div>
            </div>

            {/* Action Footer */}
            <div className="p-5 border-t border-white/[0.04] bg-[#111]">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={executeTriage}
                className="w-full py-4 bg-gradient-to-r from-[#EF4444] to-[#FF6B35] rounded-xl text-white font-black uppercase tracking-widest text-sm shadow-[0_0_20px_rgba(239,68,68,0.4)] flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                Thực Thi Phác Đồ Sinh Tồn
              </motion.button>
              <p className="text-center text-[9px] text-white/30 mt-3 uppercase tracking-widest">
                Cảnh báo: Hành động này sẽ thay đổi sổ sách ngân sách của bạn!
              </p>
            </div>
          </motion.div>
        )}

        {phase === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-[#111] border border-[#22C55E] rounded-2xl p-8 text-center shadow-[0_0_50px_rgba(34,197,94,0.15)]"
          >
            <CheckCircle2 className="w-20 h-20 text-[#22C55E] mx-auto mb-4" />
            <h2 className="text-xl font-black text-[#22C55E] uppercase mb-2">Đã Cầm Máu!</h2>
            <p className="text-sm text-white/60 mb-1">Hệ thống đã ghi đè ngân sách thành công.</p>
            <p className="text-xs text-white/40">Giải phóng thêm <strong className="text-[#E6B84F]">{formatVND(leisureAmount)}</strong> mỗi tháng để trả nợ!</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
