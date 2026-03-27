import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, Scissors, Wallet, Flame, Lightbulb, Banknote } from "lucide-react";
import { formatVND, UIDebt } from "./types";

interface Props {
  dtiRatio: number;
  monthlyIncome: number;
  totalMonthlyMin: number;
  toxicDebt?: UIDebt;
}

export function DTIDominoGauge({ dtiRatio, monthlyIncome, totalMonthlyMin, toxicDebt }: Props) {
  const isDanger = dtiRatio >= 60;
  const isWarning = dtiRatio >= 40 && dtiRatio < 60;
  
  const canRefinance = toxicDebt && dtiRatio < 50;

  return (
    <div className={`glass-card p-6 mb-6 relative overflow-hidden transition-all ${isDanger ? "border-[#EF4444]/40" : isWarning ? "border-[#E6B84F]/40" : "border-[#22C55E]/20"}`}>
      {/* Background glow if danger */}
      {isDanger && <div className="absolute inset-0 bg-[#EF4444]/5 pointer-events-none animate-[pulse_4s_ease-in-out_infinite]" />}
      
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 relative z-10">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2 text-white">
            {isDanger ? <ShieldAlert className="text-[#EF4444] animate-pulse w-5 h-5" /> : isWarning ? <AlertTriangle className="text-[#E6B84F] w-5 h-5" /> : <Wallet className="text-[#22C55E] w-5 h-5" />}
            Sinh Mệnh Tài Chính (DTI)
          </h2>
          <p className="text-[11px] text-white/50 mt-1 uppercase font-mono tracking-wider">
            Tỷ lệ Nợ / Thu Nhập hàng tháng
          </p>
        </div>
        <div className="mt-4 md:mt-0 md:text-right">
          <div className="text-3xl font-black tracking-tight" style={{ color: isDanger ? "#EF4444" : isWarning ? "#E6B84F" : "#22C55E" }}>
            {dtiRatio.toFixed(1)}%
          </div>
          <span className="text-[10px] uppercase font-mono tracking-wider text-white/40 block mt-1">
            {isDanger ? "Báo động đỏ!" : isWarning ? "Đang nguy hiểm" : "Vùng an toàn"}
          </span>
        </div>
      </div>

      {/* The Gauge Bar */}
      <div className="relative h-4 bg-black/50 rounded-full overflow-hidden mb-3 border border-white/10 flex z-10 shadow-inner">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, dtiRatio)}%` }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className={`h-full ${isDanger ? 'bg-gradient-to-r from-[#991B1B] to-[#EF4444]' : isWarning ? 'bg-gradient-to-r from-[#B45309] to-[#E6B84F]' : 'bg-gradient-to-r from-[#166534] to-[#22C55E]'}`}
          style={{
            backgroundImage: isDanger ? 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.2) 10px, rgba(0,0,0,0.2) 20px)' : 'none'
          }}
        />
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${Math.max(0, 100 - dtiRatio)}%` }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          className="h-full bg-white/5"
        />
      </div>

      <div className="flex justify-between text-[11px] font-mono mb-6 relative z-10">
        <div className={isDanger ? "text-[#EF4444] font-bold" : "text-white/60"}>
          Trả nợ: {formatVND(totalMonthlyMin)}
        </div>
        <div className="text-[#22C55E] font-bold text-right">
          Để sống: {formatVND(Math.max(0, monthlyIncome - totalMonthlyMin))}
        </div>
      </div>

      {/* Actionable Cards from Vẹt Vàng based on Risk */}
      {isDanger && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-black/40 p-5 border-l-2 border-[#EF4444] rounded-r-xl relative z-10 shadow-[inset_0_2px_15px_rgba(0,0,0,0.5)]">
          <div className="flex items-center gap-2 mb-3">
             <Flame className="w-5 h-5 text-[#EF4444]" />
             <span className="text-xs font-black text-[#EF4444] uppercase tracking-wider">Hội chẩn y khoa: Xuất huyết cấp tính</span>
          </div>
          <p className="text-[13px] text-white/80 leading-relaxed mb-4">
            Bạn đang <strong>"lấy mỡ nó rán nó"</strong>. Vòng lặp lấy nợ mới đắp nợ cũ đang giết chết bạn từ bên trong và sẽ bóp nát dòng tiền trong vòng 3-6 tháng tới nếu bạn không hành động NGAY BÂY GIỜ!
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3 text-xs bg-[#EF4444]/15 p-4 rounded-xl border border-[#EF4444]/30 hover:bg-[#EF4444]/20 transition-colors">
              <Scissors className="w-5 h-5 text-[#FFD700] flex-shrink-0" />
              <div>
                <strong className="text-white block mb-1 text-sm">Cắt Bỏ Xa Xỉ Phẩm & Đóng Băng Thẻ</strong>
                <span className="text-white/70 leading-relaxed block">Cắt hoàn toàn chi tiêu cafe, du lịch, mua sắm. Xóa app Shopee, chuyển sang dùng tiền mặt. Đây là báo động sinh tồn!</span>
              </div>
            </div>
            <div className="flex items-start gap-3 text-xs bg-white/5 p-4 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
              <Banknote className="w-5 h-5 text-[#E6B84F] flex-shrink-0" />
              <div>
                <strong className="text-white block mb-1 text-sm">Khất Nợ / Thanh Lý Tài Sản</strong>
                <span className="text-white/70 leading-relaxed block">Chủ động gọi cho ngân hàng xin giãn nợ, làm rõ khả năng thanh toán. Thanh lý ngay xe SH, iPhone lên đời để dập ngay khoản gốc đắt nhất. Bớt sĩ diện đi!</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {canRefinance && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6 }} className="bg-[#00E5FF]/5 p-5 border border-[#00E5FF]/20 rounded-xl relative z-10 shadow-[0_4px_20px_rgba(0,229,255,0.05)] mt-5">
           <div className="flex gap-4">
             <div className="w-12 h-12 rounded-full bg-[#00E5FF]/10 flex items-center justify-center flex-shrink-0 border border-[#00E5FF]/30">
               <Lightbulb className="w-6 h-6 text-[#00E5FF] animate-pulse" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-[#00E5FF] mb-1.5 flex items-center gap-2">
                 Thuyết Đảo Nợ AI (Arbitrage Lãi Suất)
                 <span className="text-[9px] bg-[#00E5FF]/20 px-2 py-0.5 rounded text-[#00E5FF] font-mono uppercase">Highly Recommended</span>
               </h3>
               <p className="text-xs text-white/70 mb-4 leading-relaxed">
                 Phát hiện khoản <strong>{toxicDebt.name}</strong> độc hại ở mức lãi <strong className="text-[#EF4444]">{toxicDebt.rate}%/năm</strong>. 
                 Tuyệt vời là tín dụng DTI của bạn ({dtiRatio.toFixed(1)}%) <strong className="text-[#22C55E]">vẫn gánh được nợ ngân hàng</strong>. 
                 Hãy "lấy bạc lẻ đập lô lớn": vay tín chấp 1 cục (lãi ~12-18%) đập tắt ngay khoản nợ cắt cổ kia!
               </p>
               <div className="flex flex-col sm:flex-row gap-3">
                 <button className="px-5 py-2.5 bg-gradient-to-r from-[#00E5FF]/20 to-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/40 rounded-xl text-xs font-bold hover:bg-[#00E5FF]/30 transition-all flex items-center justify-center gap-2">
                    <Banknote className="w-4 h-4" /> Tham khảo Vay Tín Chấp Bank
                 </button>
               </div>
             </div>
           </div>
        </motion.div>
      )}
    </div>
  );
}
