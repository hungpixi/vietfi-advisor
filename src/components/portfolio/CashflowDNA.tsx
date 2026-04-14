"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { getIncome, getBudgetPots, getDebts } from "@/lib/storage";
import { Wallet, ShieldAlert, Target, HeartPulse, BatteryCharging, Flag } from "lucide-react";

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function formatVND(n: number) {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)} tỷ`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} triệu`;
  return `${n.toLocaleString("vi-VN")}đ`;
}

interface CashflowProps {
  currentCapital: number;
}

export function CashflowDNA({ currentCapital }: CashflowProps) {
  const [income, setIncome] = useState(0);
  const [essentialExpense, setEssentialExpense] = useState(0);
  const [debtMin, setDebtMin] = useState(0);
  
  // Mounted check for hydration
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    setIncome(getIncome());
    
    // Tính tổng chi phí thiết yếu từ pots (giả định các mục cơ bản)
    const pots = getBudgetPots();
    const essentials = pots.filter(p => 
      ['Ăn uống', 'Nhà cửa', 'Đi lại', 'Hoá đơn', 'Sức khoẻ'].some(k => p.name.includes(k))
    ).reduce((sum, p) => sum + p.allocated, 0);
    // Dự phòng nếu không có tên khớp: Lấy 50% tổng allocated
    setEssentialExpense(essentials > 0 ? essentials : pots.reduce((sum, p) => sum + p.allocated, 0) * 0.5);
    
    // Tính tổng tiền trả nợ tối thiểu
    const debts = getDebts();
    const minD = debts.reduce((sum, d) => sum + d.min_payment, 0);
    setDebtMin(minD);
  }, []);

  if (!mounted) return null;

  const freeCashflow = income - essentialExpense - debtMin;
  const isNegative = freeCashflow < 0;

  // Cấu trúc progress bar
  const totalFlow = income > 0 ? income : 1;
  const essentialPct = Math.min((essentialExpense / totalFlow) * 100, 100);
  const debtPct = Math.min((debtMin / totalFlow) * 100, 100);
  const freePct = Math.max(0, 100 - essentialPct - debtPct);

  // Mục tiêu sống
  const emergencyGoal = essentialExpense * 6; // 6 tháng sinh tồn
  const emergencyPct = emergencyGoal > 0 ? Math.min((currentCapital / emergencyGoal) * 100, 100) : 0;
  
  const houseGoal = 1500000000; // 1.5 tỷ target ví dụ
  const housePct = Math.min((currentCapital / houseGoal) * 100, 100);

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="w-full">
      <motion.div variants={fadeIn} className="glass-card p-5 mb-4 relative overflow-hidden group border border-[#AB47BC]/20">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#AB47BC]/10 rounded-full blur-3xl group-hover:bg-[#AB47BC]/20 transition-all"></div>
        
        <div className="flex items-center gap-2 mb-4">
          <HeartPulse className="w-5 h-5 text-[#AB47BC]" />
          <h2 className="text-base font-bold text-white">Bức Tranh Dòng Tiền & Mục Tiêu Sống</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Phân Tích Cashflow */}
          <div className="space-y-4">
            <div>
              <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
                <Wallet className="w-3 h-3" /> Thu Nhập vs Nghĩa Vụ
              </h3>
              
              {income === 0 ? (
                <div className="p-3 bg-white/5 rounded-lg border border-white/10 text-center text-[11px] text-white/50">
                  Chưa có dữ liệu thu nhập. Vui lòng cập nhật ở mục Quản Trị Chi Tiêu.
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Thu nhập ròng</span>
                    <span className="font-bold text-[#22C55E]">{formatVND(income)}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/60">Chi thiết yếu</span>
                    <span className="font-medium text-[#E6B84F]">-{formatVND(essentialExpense)}</span>
                  </div>
                  <div className="flex justify-between text-xs mb-3">
                    <span className="text-white/60">Trả nợ tối thiểu</span>
                    <span className="font-medium text-[#EF4444]">-{formatVND(debtMin)}</span>
                  </div>
                  
                  {/* Visual Bar */}
                  <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden flex mb-2">
                    <div className="bg-[#E6B84F] h-full" style={{ width: `${essentialPct}%` }} title="Chi thiết yếu" />
                    <div className="bg-[#EF4444] h-full" style={{ width: `${debtPct}%` }} title="Trả nợ" />
                    <div className="bg-[#22C55E] h-full relative" style={{ width: `${freePct}%` }}>
                       {freePct > 15 && <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-black/50">DƯ ĐỊA</span>}
                    </div>
                  </div>

                  <div className={`p-3 rounded-lg border flex items-start gap-2 ${isNegative ? 'bg-[#EF4444]/10 border-[#EF4444]/20' : 'bg-[#22C55E]/10 border-[#22C55E]/20'}`}>
                     {isNegative ? <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" /> : <BatteryCharging className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />}
                     <div>
                       <span className={`text-[10px] uppercase font-bold tracking-wider ${isNegative ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                         {isNegative ? 'Dòng tiền thâm hụt' : 'Dư địa đầu tư/tháng'}
                       </span>
                       <div className={`text-lg font-black mt-0.5 ${isNegative ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                         {formatVND(freeCashflow)}
                       </div>
                       <p className="text-[10px] text-white/50 mt-1">
                         {isNegative ? 'Bạn đang âm tiền mỗi tháng, tuyệt đối không đầu tư rủi ro lúc này!' : 'Đạn dược có sẵn để bơm vào danh mục tài sản.'}
                       </p>
                     </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mục Tiêu Sống (Life Goals Progress) */}
          <div className="space-y-4">
             <h3 className="text-[11px] font-mono uppercase tracking-wider text-white/40 mb-3 flex items-center gap-1.5">
                <Target className="w-3 h-3" /> Radar Mục Tiêu (Áp dụng vốn {formatVND(currentCapital)})
             </h3>

             <div className="space-y-4">
                {/* Quỹ Khẩn Cấp */}
                <div className="relative">
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1.5 bg-[#00E5FF]/10 rounded-md border border-[#00E5FF]/20">
                         <ShieldAlert className="w-3 h-3 text-[#00E5FF]" />
                      </div>
                      <span className="text-xs font-semibold text-white/80">Quỹ Sinh Tồn (6 Tháng)</span>
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-bold text-[#00E5FF]">{emergencyPct.toFixed(0)}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                     <div className="bg-[#00E5FF] h-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${emergencyPct}%` }}>
                        <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite] -skew-x-12"></div>
                     </div>
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-white/40">
                    <span>Mục tiêu: {formatVND(emergencyGoal)}</span>
                    {emergencyPct >= 100 ? <span className="text-[#00E5FF] font-medium">Đã an toàn</span> : <span>Còn thiếu {formatVND(Math.max(0, emergencyGoal - currentCapital))}</span>}
                  </div>
                </div>

                {/* Mục Tiêu Mua Nhà */}
                <div className="relative">
                  <div className="flex justify-between items-end mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1.5 bg-[#AB47BC]/10 rounded-md border border-[#AB47BC]/20">
                         <Flag className="w-3 h-3 text-[#AB47BC]" />
                      </div>
                      <span className="text-xs font-semibold text-white/80">Quỹ Mua Nhà / Tự Do</span>
                    </div>
                    <div className="text-right">
                       <span className="text-xs font-bold text-[#AB47BC]">{housePct.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                     <div className="bg-[#AB47BC] h-full transition-all duration-1000 relative overflow-hidden" style={{ width: `${housePct}%` }}>
                     </div>
                  </div>
                  <div className="flex justify-between mt-1 text-[9px] text-white/40">
                    <span>Mục tiêu: {formatVND(houseGoal)}</span>
                    <span>Hành trình còn dài</span>
                  </div>
                </div>
             </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
