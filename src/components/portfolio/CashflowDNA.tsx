"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { getIncome, getBudgetPots, getDebts } from "@/lib/storage";
import { Wallet, ShieldAlert, Target, HeartPulse, Brain, BatteryCharging, Flag } from "lucide-react";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

function formatVND(n: number) {
  if (n >= 1000000000) return `${(n / 1000000000).toFixed(1)} TỶ`;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)} TRIỆU`;
  return `${n.toLocaleString("vi-VN")}Đ`;
}

interface CashflowProps {
  currentCapital: number;
}

export function CashflowDNA({ currentCapital }: CashflowProps) {
  const [income, setIncome] = useState(0);
  const [essentialExpense, setEssentialExpense] = useState(0);
  const [debtMin, setDebtMin] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMounted(true);
      setIncome(getIncome());
      const pots = getBudgetPots();
      const essentials = pots.filter(p =>
        ['Ăn uống', 'Nhà cửa', 'Đi lại', 'Hoá đơn', 'Sức khoẻ'].some(k => p.name.includes(k))
      ).reduce((sum, p) => sum + p.allocated, 0);
      setEssentialExpense(essentials > 0 ? essentials : pots.reduce((sum, p) => sum + p.allocated, 0) * 0.5);
      const debts = getDebts();
      const minD = debts.reduce((sum, d) => sum + (d.minPayment ?? 0), 0);
      setDebtMin(minD);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  if (!mounted) return null;

  const freeCashflow = income - essentialExpense - debtMin;
  const isNegative = freeCashflow < 0;
  const totalFlow = income > 0 ? income : 1;
  const essentialPct = Math.min((essentialExpense / totalFlow) * 100, 100);
  const debtPct = Math.min((debtMin / totalFlow) * 100, 100);
  const freePct = Math.max(0, 100 - essentialPct - debtPct);

  const emergencyGoal = essentialExpense * 6;
  const emergencyPct = emergencyGoal > 0 ? Math.min((currentCapital / emergencyGoal) * 100, 100) : 0;
  const houseGoal = 1500000000;
  const housePct = Math.min((currentCapital / houseGoal) * 100, 100);

  return (
    <motion.div variants={stagger} initial="hidden" animate="visible" className="w-full">
      <CyberCard className="p-6 mb-6" variant="success">
        <div className="flex items-center gap-2 mb-8">
          <HeartPulse className="w-5 h-5 text-[#22C55E]" />
          <CyberHeader size="sm">Cashflow DNA &amp; Goals Radar</CyberHeader>
        </div>

        <div className="grid lg:grid-cols-2 gap-10">
          {/* Cashflow Breakdown */}
          <div className="space-y-6">
            <div>
              <div className="flex flex-col gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-white/70" />
                  <CyberSubHeader className="whitespace-normal">THU NHẬP VS</CyberSubHeader>
                </div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">NGHĨA VỤ CỐ ĐỊNH</p>
              </div>

              {income === 0 ? (
                <div className="p-6 bg-white/[0.02] border border-dashed border-white/10 rounded-xl text-center">
                  <CyberSubHeader>Chưa có dữ liệu tài chính cơ sở</CyberSubHeader>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <CyberSubHeader className="block mb-1">THU NHẬP</CyberSubHeader>
                      <CyberTypography size="sm" variant="mono" className="text-[#22C55E] font-black">{formatVND(income)}</CyberTypography>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <CyberSubHeader className="block mb-1">CHI THIẾT YẾU</CyberSubHeader>
                      <CyberTypography size="sm" variant="mono" className="text-[#E6B84F] font-black">{formatVND(essentialExpense)}</CyberTypography>
                    </div>
                    <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                      <CyberSubHeader className="block mb-1">TRẢ NỢ</CyberSubHeader>
                      <CyberTypography size="sm" variant="mono" className="text-[#EF4444] font-black">{formatVND(debtMin)}</CyberTypography>
                    </div>
                  </div>

                  {/* Status Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-end px-1">
                      <CyberSubHeader>BIỂU ĐỒ PHÂN BỔ DÒNG TIỀN</CyberSubHeader>
                      <CyberTypography size="xs" variant="mono" className="text-white/60">{(100 - freePct).toFixed(0)}% NGHĨA VỤ</CyberTypography>
                    </div>
                    <div className="h-6 w-full bg-white/5 rounded-lg overflow-hidden flex p-1 border border-white/5">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${essentialPct}%` }} className="bg-[#E6B84F] h-full rounded-sm mr-[2px]" />
                      <motion.div initial={{ width: 0 }} animate={{ width: `${debtPct}%` }} className="bg-[#EF4444] h-full rounded-sm mr-[2px]" />
                      <motion.div initial={{ width: 0 }} animate={{ width: `${freePct}%` }} className="bg-[#22C55E] h-full rounded-sm relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" />
                      </motion.div>
                    </div>
                  </div>

                  <div className={cn(
                    "p-5 rounded-2xl border transition-all",
                    isNegative ? "bg-[#EF4444]/5 border-[#EF4444]/20" : "bg-[#22C55E]/5 border-[#22C55E]/20 shadow-[inset_0_0_20px_rgba(34,197,94,0.05)]"
                  )}>
                    <div className="flex items-start gap-4">
                      <div className={cn("p-2 rounded-xl border shrink-0 mt-1", isNegative ? "border-[#EF4444]/30 text-[#EF4444]" : "border-[#22C55E]/30 text-[#22C55E]")}>
                        {isNegative ? <ShieldAlert className="w-5 h-5" /> : <BatteryCharging className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="mb-2">
                          <CyberSubHeader color={isNegative ? "text-[#EF4444]" : "text-[#22C55E]"}>
                            {isNegative ? "CẢNH BÁO THÂM HỤT" : "DƯ ĐỊA ĐẦU TƯ MỖI THÁNG"}
                          </CyberSubHeader>
                        </div>
                        <div className="mb-2">
                          <CyberMetric size="md" color={isNegative ? "text-[#EF4444]" : "text-[#22C55E]"}>
                            {formatVND(freeCashflow)}
                          </CyberMetric>
                        </div>
                        <p className="text-[11px] text-white/50 font-mono uppercase mt-2 leading-relaxed">
                          {isNegative ? "Tình trạng tài chính báo động. Cần cắt giảm chi phí lập tức trước khi nghĩ đến đầu tư." : "Đạn dược sẵn sàng. Đây là số tiền bạn có thể tự tin bơm vào các tài sản rủi ro."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Goals Radar */}
          <div className="space-y-6">
            <div className="flex flex-col gap-2 mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-white/70" />
                <CyberSubHeader>PROGRESS RADAR</CyberSubHeader>
              </div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/60">VỐN TÍCH LŨY: {formatVND(currentCapital)}</p>
            </div>

            <div className="space-y-8">
              {/* Quỹ Sinh Tồn */}
              <div className="group">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-[#22C55E]">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div className="leading-tight">
                      <div className="text-[14px] font-black uppercase text-white">QUỸ SINH TỒN</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/60">AN TOÀN TRONG 6 THÁNG</div>
                    </div>
                  </div>
                  <CyberMetric size="xs" color="text-[#22C55E]">{emergencyPct.toFixed(0)}%</CyberMetric>
                </div>

                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                  <motion.div
                    className="bg-[#22C55E] h-full rounded-full relative shadow-[0_0_10px_rgba(34,197,94,0.5)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${emergencyPct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  >
                    <div className="absolute inset-0 bg-white/20 animate-[shimmer_3s_infinite]" />
                  </motion.div>
                </div>
                <div className="flex justify-between mt-2 px-1">
                  <CyberSubHeader>MỤC TIÊU: {formatVND(emergencyGoal)}</CyberSubHeader>
                  {emergencyPct >= 100 ? (
                    <CyberTypography size="xs" className="text-[#22C55E] font-black uppercase">HOÀN THÀNH ✅</CyberTypography>
                  ) : (
                    <CyberSubHeader>CÒN THIẾU {formatVND(Math.max(0, emergencyGoal - currentCapital))}</CyberSubHeader>
                  )}
                </div>
              </div>

              {/* Mục Tiêu Lớn */}
              <div className="group">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white/60">
                      <Flag className="w-5 h-5" />
                    </div>
                    <div className="leading-tight">
                      <div className="text-[14px] font-black uppercase text-white">TỰ DO TÀI CHÍNH</div>
                      <div className="mt-1 text-[11px] uppercase tracking-[0.2em] text-white/40">MỤC TIÊU MUA NHÀ / NGHỈ HƯU</div>
                    </div>
                  </div>
                  <CyberMetric size="xs" color="text-white/60">{housePct.toFixed(1)}%</CyberMetric>
                </div>

                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[2px]">
                  <motion.div
                    className="bg-white/20 h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${housePct}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
                <div className="flex justify-between mt-2 px-1">
                  <CyberSubHeader>MỤC TIÊU: {formatVND(houseGoal)}</CyberSubHeader>
                  <CyberSubHeader>LONG WAY TO GO</CyberSubHeader>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CyberCard>
    </motion.div>
  );
}
