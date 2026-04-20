"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  X,
  Activity,
  Droplets,
  Zap,
  CheckCircle2,
  HeartPulse,
  Scissors,
  TrendingDown,
  ChevronRight,
  Database,
  Terminal,
  Clock
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { UIDebt, formatVND } from "./types";
// Import sync functions
import { getBudgetPots, saveBudgetPots, getCachedUserId } from "@/lib/supabase/user-data";
import { TriageDoctor } from "./TriageDoctor";
import type { BudgetPot } from "@/lib/types/budget";
import { snowballPlan, summarizePlan } from "@/lib/calculations/debt-optimizer";

interface TriageProps {
  onClose: () => void;
  debts: UIDebt[];
  dtiRatio: number;
}

export function FinancialTriageModal({ onClose, debts, dtiRatio }: TriageProps) {
  const [phase, setPhase] = useState<"scanning" | "diagnosis" | "surgery" | "success">("scanning");
  const [scanProgress, setScanProgress] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const [leisurePots, setLeisurePots] = useState<BudgetPot[]>([]);
  const [surgeryCuts, setSurgeryCuts] = useState<Record<string, number>>({});
  const [toxicDebts, setToxicDebts] = useState<UIDebt[]>([]);
  const [surgicalLogs, setSurgicalLogs] = useState<string[]>([]);

  // 1. Chẩn đoán ban đầu
  useEffect(() => {
    async function initTriage() {
      const toxics = debts.filter(d => d.rate >= 20);
      setToxicDebts(toxics);

      const pots = await getBudgetPots();
      const targetPots = pots.filter(p => {
        const n = p.name.toLowerCase();
        return n.includes("giải trí") || n.includes("mua sắm") || n.includes("sở thích") || n.includes("linh tinh") || n.includes("tiêu vặt") || n.includes("ăn chơi");
      });
      setLeisurePots(targetPots);

      const initialCuts: Record<string, number> = {};
      targetPots.forEach(p => { initialCuts[p.id] = 100; });
      setSurgeryCuts(initialCuts);
    }
    initTriage();
  }, [debts]);

  // 2. Hiệu ứng Scanning & Live Logs
  useEffect(() => {
    if (phase === "scanning") {
      const logs = [
        "KHỞI ĐỘNG HỆ THỐNG PHÂN TÍCH SINH HIỆU...",
        "ĐANG QUÉT DANH SÁCH NỢ (COUNT: " + debts.length + ")...",
        "PHÁT HIỆN " + toxicDebts.length + " KHOẢN NỢ ĐỘC HẠI...",
        "ĐANG ĐO LƯỜNG DTI RATIO: " + dtiRatio.toFixed(1) + "%...",
        "TRUY XUẤT NGÂN SÁCH DƯ THỪA...",
        "CHUẨN BỊ PHÁC ĐỒ PHẪU THUẬT..."
      ];

      let currentIdx = 0;
      const logInterval = setInterval(() => {
        if (currentIdx < logs.length) {
          setSurgicalLogs(prev => [...prev, logs[currentIdx]]);
          currentIdx++;
        }
      }, 800);

      const progressInterval = setInterval(() => {
        setScanProgress(p => {
          if (p >= 100) {
            clearInterval(progressInterval);
            setTimeout(() => setPhase("diagnosis"), 1000);
            return 100;
          }
          return p + 2;
        });
      }, 50);

      return () => {
        clearInterval(logInterval);
        clearInterval(progressInterval);
      };
    }
  }, [phase, debts.length, toxicDebts.length, dtiRatio]);

  // 3. Tính toán tác động (Impact Analysis)
  const simulation = useMemo(() => {
    if (debts.length === 0) return { monthsSaved: 0, interestSaved: 0, chartData: [] };

    const extraPayment = leisurePots.reduce((sum, p) => {
      const cutRatio = (surgeryCuts[p.id] || 0) / 100;
      return sum + (p.allocated * (cutRatio));
    }, 0);

    const baselineSteps = snowballPlan(debts, 0);
    const baselineResults = summarizePlan(baselineSteps);

    const improvedSteps = snowballPlan(debts, extraPayment);
    const improvedResults = summarizePlan(improvedSteps);

    // Prepare Chart Data
    const maxMonth = Math.max(baselineResults.totalMonths, improvedResults.totalMonths);
    interface ChartPoint {
      name: string;
      "Truớc mổ": number;
      "Sau mổ": number;
    }
    const chartData: ChartPoint[] = [];

    // Sample 12 points for the chart
    for (let i = 0; i <= 12; i++) {
      const m = Math.round((maxMonth / 12) * i);
      const bStep = baselineSteps.filter(s => s.month <= m);
      const iStep = improvedSteps.filter(s => s.month <= m);

      const bRemaining = bStep.length > 0 ? bStep[bStep.length - 1].remaining : debts.reduce((s, d) => s + d.principal, 0);
      const iRemaining = iStep.length > 0 ? iStep[iStep.length - 1].remaining : debts.reduce((s, d) => s + d.principal, 0);

      chartData.push({
        name: m === 0 ? "Nay" : `T${m}`,
        "Truớc mổ": bRemaining,
        "Sau mổ": iRemaining
      });
    }

    return {
      monthsSaved: Math.max(0, baselineResults.totalMonths - improvedResults.totalMonths),
      interestSaved: Math.max(0, baselineResults.totalInterestPaid - improvedResults.totalInterestPaid),
      totalSaving: extraPayment,
      chartData
    };
  }, [debts, leisurePots, surgeryCuts]);

  const executeSurgery = async () => {
    setIsSyncing(true);
    const pots = await getBudgetPots();
    const newPots = pots.map(p => {
      if (surgeryCuts[p.id] !== undefined) {
        const remainingRatio = 1 - (surgeryCuts[p.id] / 100);
        return { ...p, allocated: Math.round(p.allocated * remainingRatio) };
      }
      return p;
    });

    // CONNECTIVITY: Save to Cloud (Supabase) via user-data.ts
    await saveBudgetPots(newPots);

    setTimeout(() => {
      setIsSyncing(false);
      setPhase("success");
    }, 1500);
  };

  const monthlyBleeding = useMemo(() => {
    return debts.reduce((sum, d) => sum + (d.principal * (d.rate / 12 / 100)), 0);
  }, [debts]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/95 backdrop-blur-3xl overflow-y-auto scrollbar-hide">
      <AnimatePresence mode="wait">
        {phase === "scanning" && (
          <motion.div
            key="scanning"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="w-full max-w-md bg-[#0a0a0a] border border-[#EF4444]/20 rounded-t-3xl sm:rounded-3xl p-6 sm:p-10 text-center relative overflow-hidden max-h-[92vh] overflow-y-auto"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#EF4444]/5 via-transparent to-transparent animate-pulse" />

            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 0.6, repeat: Infinity }} className="relative z-10">
              <HeartPulse className="w-20 h-20 text-[#EF4444] mx-auto mb-8 drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
            </motion.div>

            <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-6">Đang Chẩn Đoán</h2>

            {/* Surgical Logs View */}
            <div className="h-40 bg-black/40 rounded-2xl p-4 mb-8 text-left border border-white/5 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />
              <div className="space-y-1.5">
                {surgicalLogs.map((log, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-2"
                  >
                    <Terminal className="w-3 h-3 text-[#EF4444]/60" />
                    <span className="text-[10px] font-mono text-white/50 uppercase tracking-tighter">{log}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="relative h-1 w-full bg-white/5 rounded-full overflow-hidden mb-4">
              <motion.div className="absolute inset-y-0 left-0 bg-[#EF4444] shadow-[0_0_10px_#EF4444]" style={{ width: `${scanProgress}%` }} />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-white/30 uppercase">
              <span>Bio-Check</span>
              <span>{scanProgress}%</span>
            </div>
          </motion.div>
        )}

        {(phase === "diagnosis" || phase === "surgery") && (
          <motion.div
            key="surgery-ui"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-4xl bg-[#0d0d0d] border border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(239,68,68,0.1)] flex flex-col md:flex-row my-auto max-h-[95vh]"
          >
            {/* Left Panel: Vitals & Dr. Vẹt */}
            <div className="md:w-1/3 bg-[#0a0a0a] p-5 sm:p-8 border-b md:border-b-0 md:border-r border-white/5 flex flex-col overflow-y-auto">
              <TriageDoctor dti={dtiRatio} debtCount={debts.length} phase={phase} />

              <div className="space-y-4 mt-8">
                <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05]">
                  <div className="flex items-center gap-2 mb-2">
                    <Activity className="w-4 h-4 text-[#EF4444]" />
                    <span className="text-[11px] font-bold text-white/40 uppercase">Chỉ số DTI (Bio-Vital)</span>
                  </div>
                  <div className="text-3xl font-black text-[#EF4444]">{dtiRatio.toFixed(1)}%</div>
                  <div className="text-[10px] text-white/30 uppercase mt-1">Trạng thái: Nguy kịch</div>
                </div>

                <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05]">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-4 h-4 text-[#FF6B35]" />
                    <span className="text-[11px] font-bold text-white/40 uppercase">Tốc độ Chảy máu Lãi</span>
                  </div>
                  <div className="text-xl font-black text-[#FF6B35]">{formatVND(Math.round(monthlyBleeding))}<span className="text-[10px] text-white/40 ml-1">/tháng</span></div>
                </div>

                <div className="bg-white/[0.02] rounded-2xl p-4 border border-white/[0.05]">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-[#22C55E]" />
                    <span className="text-[11px] font-bold text-white/40 uppercase">Kết nối Cloud</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                    <span className="text-xs text-white/80 font-mono">{getCachedUserId() ? "Supabase (Synced)" : "Local Storage Mode"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Operations & Visualization */}
            <div className="flex-1 p-5 sm:p-8 flex flex-col overflow-y-auto scrollbar-hide">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">
                  {phase === "diagnosis" ? "Bảng Chẩn Đoán" : "Phòng Đại Phẫu"}
                </h3>
                <button onClick={onClose} className="p-2 text-white/20 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {phase === "diagnosis" ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-6 rounded-3xl bg-[#EF4444]/5 border border-[#EF4444]/20">
                      <ShieldAlert className="w-8 h-8 text-[#EF4444] mb-4" />
                      <h4 className="text-sm font-bold text-white mb-2 uppercase">Xác định Khối u</h4>
                      <p className="text-xs text-white/50 leading-relaxed">Phát hiện {toxicDebts.length} khoản nợ lãi suất cao. Đây là nguyên nhân chính gây &quot;nhiễm trùng&quot; tài chính.</p>
                    </div>
                    <div className="p-6 rounded-3xl bg-[#22C55E]/5 border border-[#22C55E]/20">
                      <Scissors className="w-8 h-8 text-[#22C55E] mb-4" />
                      <h4 className="text-sm font-bold text-white mb-2 uppercase">Giải pháp cắt bỏ</h4>
                      <p className="text-xs text-white/50 leading-relaxed">Cần cắt giảm {leisurePots.length} quỹ giải trí dư thừa để thu hồi dòng tiền.</p>
                    </div>
                  </div>

                  <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-6">
                    <h4 className="text-[11px] font-bold text-white/40 uppercase mb-4 tracking-widest flex items-center gap-2">
                      <TrendingDown className="w-4 h-4" /> Bản đồ tiên lượng (Forecasting)
                    </h4>
                    <div className="h-[200px] w-full min-w-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={simulation.chartData}>
                          <XAxis dataKey="name" hide />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                            formatter={(val: unknown) => formatVND(Number(val))}
                          />
                          <Area type="monotone" dataKey="Truớc mổ" stroke="#EF4444" fill="#EF4444" fillOpacity={0.1} />
                          <Area type="monotone" dataKey="Sau mổ" stroke="#22C55E" fill="#22C55E" fillOpacity={0.2} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex justify-between mt-4">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-[#EF4444]" />
                        <span className="text-[10px] text-white/40">Trước phẫu thuật</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-1 bg-[#22C55E]" />
                        <span className="text-[10px] text-white/40">Dự kiến sau mổ</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setPhase("surgery")}
                    className="w-full py-5 bg-white text-black text-sm font-black uppercase tracking-[0.2em] rounded-2xl hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                  >
                    Vào Phòng Phẫu Thuật <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Real-time Impact Header */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-3xl bg-[#22C55E]/10 border border-[#22C55E]/20 text-center">
                      <span className="text-[10px] font-bold text-[#22C55E] uppercase block mb-1">Cứu vãn Thời Gian</span>
                      <div className="text-2xl font-black text-white">-{simulation.monthsSaved} tháng</div>
                    </div>
                    <div className="p-4 rounded-3xl bg-[#EF4444]/10 border border-[#EF4444]/20 text-center">
                      <span className="text-[10px] font-bold text-[#EF4444] uppercase block mb-1">Cứu vãn Tiền Lãi</span>
                      <div className="text-lg font-black text-white">{formatVND(simulation.interestSaved)}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="text-[11px] font-bold text-white/40 uppercase tracking-widest">Thiết lập mức cắt bỏ (%)</h4>
                    {leisurePots.map(p => (
                      <div key={p.id} className="p-5 rounded-3xl bg-white/[0.03] border border-white/5 group">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <div className="text-sm font-bold text-white mb-0.5">{p.name}</div>
                            <div className="text-[10px] text-white/30">Hiện tại: {formatVND(p.allocated)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-[#EF4444]">-{surgeryCuts[p.id]}%</div>
                            <div className="text-[10px] text-[#22C55E]">Tiết kiệm: {formatVND(Math.round(p.allocated * (surgeryCuts[p.id] / 100)))}</div>
                          </div>
                        </div>
                        <input
                          type="range" min="0" max="100" step="10"
                          value={surgeryCuts[p.id]}
                          onChange={(e) => setSurgeryCuts({ ...surgeryCuts, [p.id]: parseInt(e.target.value) })}
                          className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-[#EF4444]"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 border-t border-white/5">
                    <button
                      disabled={isSyncing}
                      onClick={executeSurgery}
                      className="group relative w-full py-6 bg-gradient-to-r from-[#EF4444] to-[#FF6B35] text-white text-base font-black uppercase tracking-[0.3em] rounded-3xl flex items-center justify-center gap-4 overflow-hidden"
                    >
                      {isSyncing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Đang Khâu Vết Thương...
                        </>
                      ) : (
                        <>
                          <Zap className="w-6 h-6 fill-current group-hover:scale-125 transition-transform" />
                          Xác Nhận Thực Thi
                        </>
                      )}

                      {/* Cloud Sync Indicator */}
                      <div className="absolute bottom-2 right-4 flex items-center gap-2 opacity-40">
                        <Database className="w-3 h-3" />
                        <span className="text-[8px] font-mono">SUPABASE_SYNC: READY</span>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {phase === "success" && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-[#0d0d0d] border border-[#22C55E]/30 rounded-t-[3rem] sm:rounded-[3rem] p-6 sm:p-12 text-center max-h-[92vh] overflow-y-auto"
          >
            <div className="w-24 h-24 bg-[#22C55E] rounded-full mx-auto mb-8 flex items-center justify-center shadow-[0_0_50px_rgba(34,197,94,0.4)]">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>

            <h2 className="text-3xl font-black text-white uppercase mb-2 tracking-tight">Ca Mổ Hoàn Tất!</h2>
            <p className="text-sm text-white/50 mb-10 leading-relaxed">Bạn đã cầm máu tài chính thành công. Roadmap thoát nợ đã được cập nhật đồng bộ lên Cloud.</p>

            <div className="space-y-3 mb-10">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-bold uppercase flex items-center gap-2"><Clock className="w-3.5 h-3.5" /> Thời gian mua lại</span>
                <span className="text-sm font-black text-[#22C55E]">{simulation.monthsSaved} Tháng Tự Do</span>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
                <span className="text-[10px] text-white/40 font-bold uppercase flex items-center gap-2"><Zap className="w-3.5 h-3.5" /> Tiết kiệm nợ</span>
                <span className="text-sm font-black text-[#22C55E]">{formatVND(simulation.interestSaved)}</span>
              </div>
            </div>

            <TriageDoctor dti={dtiRatio} debtCount={debts.length} phase="success" />

            <button
              onClick={onClose}
              className="w-full py-5 bg-white text-black text-xs font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-white/90 transition-all mt-8"
            >
              Hoàn Tất Hồi Sức
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
