"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GURU_PERSONAS, GuruPersona } from "@/lib/guru-personas";
import { spendXP, getGamification } from "@/lib/gamification";
import { Lock, Unlock, ArrowLeft, TrendingUp, Target, AlertTriangle, CheckCircle2, Coffee, MessageSquare } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Mock data until Supabase is ready
const mockPerformanceData = Array.from({ length: 30 }).map((_, i) => ({
  day: i + 1,
  value: 10000 + Math.random() * 2000 + (i * 100),
}));

export default function GuruDetailPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const [guru, setGuru] = useState<GuruPersona | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [userXp, setUserXp] = useState(0);

  useEffect(() => {
    if (id && GURU_PERSONAS[id]) {
      setGuru(GURU_PERSONAS[id]);
    }
    const state = getGamification();
    setUserXp(state.xp);
    
    // In actual app, check if user has already unlocked this guru for today
    const unlockedList = JSON.parse(localStorage.getItem("vf_unlocked_gurus") || "[]");
    const today = new Date().toISOString().slice(0, 10);
    if (unlockedList.includes(`${id}_${today}`)) {
      setIsUnlocked(true);
    }
  }, [id]);

  const handleUnlock = () => {
    const cost = 300; // 300 XP = 3 Coffee
    if (spendXP(cost)) {
      setIsUnlocked(true);
      setUserXp((prev) => prev - cost);
      const unlockedList = JSON.parse(localStorage.getItem("vf_unlocked_gurus") || "[]");
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem("vf_unlocked_gurus", JSON.stringify([...unlockedList, `${id}_${today}`]));
    } else {
      alert("Bạn không đủ XP (Cà phê) để mời Guru này rồi! Hãy ghi chép chi tiêu để kiếm thêm nhé.");
    }
  };

  if (!guru) return <div className="p-8 text-center text-gray-400">Đang tìm Guru...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <Link href="/dashboard/gurus" className="inline-flex items-center text-sm text-gray-400 hover:text-white transition-colors mb-2">
        <ArrowLeft size={16} className="mr-1" /> Quay lại Hội đồng
      </Link>

      {/* Guru Header */}
      <div className="bg-black/40 border border-[#333] rounded-2xl p-6 relative overflow-hidden flex flex-col md:flex-row items-center gap-6">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="w-24 h-24 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-5xl shadow-inner shrink-0 relative z-10">
          {guru.avatar}
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <h1 className="text-3xl font-bold text-white mb-1">{guru.name}</h1>
          <p className="text-emerald-400 font-medium mb-2">{guru.title}</p>
          <p className="text-sm text-gray-400 italic">"{guru.philosophy}"</p>
        </div>
        
        <div className="flex gap-4 relative z-10">
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Win Rate</div>
            <div className="text-xl font-bold text-white">{guru.winRate}%</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Return</div>
            <div className="text-xl font-bold text-emerald-400">+{guru.avgReturn}%</div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!isUnlocked ? (
          <motion.div
            key="locked"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#111] border border-[#333] rounded-2xl p-8 text-center relative overflow-hidden"
          >
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <Lock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-3">Watchlist Đang Khóa</h2>
            <p className="text-gray-400 max-w-lg mx-auto mb-8 leading-relaxed">
              {guru.lockedMessage}
            </p>

            <div className="flex flex-col items-center gap-4">
              <button
                onClick={handleUnlock}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2 group relative overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Unlock size={18} />
                  Mở khóa bằng 3 Cà Phê
                </span>
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform" />
              </button>
              
              <div className="text-sm text-gray-500 flex items-center gap-1.5">
                <Coffee size={14} className="text-[#E6B84F]" />
                Bạn đang có: <span className="font-bold text-white">{Math.floor(userXp / 100)} Cà phê ({(userXp)} XP)</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="unlocked"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Daily Insight */}
            <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-2xl p-6">
              <div className="flex items-center gap-2 text-indigo-400 mb-4">
                <MessageSquare size={20} />
                <h2 className="font-semibold text-lg">Nhận định hôm nay từ {guru.name}</h2>
              </div>
              <div className="prose prose-invert max-w-none text-gray-300">
                <p>Thị trường đang có dấu hiệu tích lũy tại vùng kháng cự quan trọng. Khối lượng giao dịch sụt giảm cho thấy lực cung đang yếu đi. Đây là thời điểm tuyệt vời để thiết lập vị thế mua vào các mã dẫn dắt có kết quả kinh doanh quý đột phá.</p>
                <p className="text-sm text-gray-500 mt-4">* Dữ liệu được quét tự động bởi thuật toán nội bộ từ 1,000 mã cổ phiếu trên sàn tự động lúc 14:00 hôm nay.</p>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-black/40 border border-[#333] rounded-2xl p-6">
              <h2 className="font-semibold text-lg text-white mb-6">Mô phỏng hiệu suất Danh mục</h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockPerformanceData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#111', borderColor: '#333' }}
                      itemStyle={{ color: '#10b981' }}
                    />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Watchlist & Action List */}
            <div className="bg-black/40 border border-[#333] rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-[#333]">
                <h2 className="font-semibold text-lg text-white">Watchlist & Vị thế hiện tại</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#111] text-xs uppercase text-gray-500">
                      <th className="p-4 font-medium">Mã CK</th>
                      <th className="p-4 font-medium">Tín hiệu</th>
                      <th className="p-4 font-medium">Giá mục tiêu Mua</th>
                      <th className="p-4 font-medium text-right">Dừng lỗ</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm divide-y divide-[#222]">
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white flex items-center gap-2">FPT <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-400">Đang giữ</span></div>
                        <div className="text-xs text-gray-500">CTCP FPT</div>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-emerald-400"><CheckCircle2 size={14}/> Breakout VCP</span>
                      </td>
                      <td className="p-4 text-gray-300">Quanh 115.0</td>
                      <td className="p-4 text-right text-rose-400 font-medium">108.5 (-5.6%)</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white flex items-center gap-2">GMD <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/10 text-indigo-400">Watchlist</span></div>
                        <div className="text-xs text-gray-500">Gemadept</div>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-indigo-400"><Target size={14}/> Chờ vượt đỉnh mốc 82</span>
                      </td>
                      <td className="p-4 text-gray-300">82.1 - 82.5</td>
                      <td className="p-4 text-right text-rose-400 font-medium">78.0 (-5.0%)</td>
                    </tr>
                    <tr className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-white flex items-center gap-2">VIX <span className="px-2 py-0.5 rounded text-[10px] bg-gray-500/10 text-gray-400">Đã bán</span></div>
                        <div className="text-xs text-gray-500">Chứng khoán VIX</div>
                      </td>
                      <td className="p-4">
                        <span className="flex items-center gap-1.5 text-rose-400"><AlertTriangle size={14}/> Vi phạm cắt lỗ</span>
                      </td>
                      <td className="p-4 text-gray-300">-</td>
                      <td className="p-4 text-right text-gray-500 line-through">18.5</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
