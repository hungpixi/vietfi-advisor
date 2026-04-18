"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { GURU_PERSONAS, GuruPersona } from "@/lib/guru-personas";
import { ArrowLeft, Target, AlertTriangle, CheckCircle2, MessageSquare } from "lucide-react";
import Link from "next/link";
import { AreaChart, Area, Tooltip, ResponsiveContainer } from "recharts";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberSubHeader, CyberMetric, CyberTypography } from "@/components/ui/CyberTypography";

// Mock data until Supabase is ready
const mockPerformanceData = Array.from({ length: 30 }).map((_, i) => ({
  day: i + 1,
  value: 10000 + Math.random() * 2000 + (i * 100),
}));

export default function GuruDetailPage() {
  const { id } = useParams() as { id: string };
  const guru: GuruPersona | null = id ? GURU_PERSONAS[id] ?? null : null;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;
  if (!guru) return <div className="p-8 text-center text-gray-400 font-mono">ĐANG TÌM CỐ VẤN...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <Link href="/dashboard/gurus" className="inline-flex items-center text-[10px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors mb-2">
        <ArrowLeft size={14} className="mr-1" /> QUAY LẠI HỘI ĐỒNG
      </Link>

      {/* Guru Header */}
      <CyberCard className="p-6 relative overflow-hidden flex flex-col md:flex-row items-center gap-6" variant="success">
        <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-5xl shadow-inner shrink-0 relative z-10">
          {guru.avatar}
        </div>
        <div className="flex-1 text-center md:text-left relative z-10">
          <CyberHeader size="sm" className="mb-1">{guru.name}</CyberHeader>
          <CyberTypography size="xs" color="text-[#22C55E]" className="font-black mb-2 tracking-widest uppercase">{guru.title}</CyberTypography>
          <p className="text-[12px] text-white/50 italic font-mono uppercase">&quot;{guru.philosophy}&quot;</p>
        </div>

        <div className="flex gap-6 relative z-10">
          <div className="text-center">
            <CyberSubHeader className="mb-1">TỶ LỆ THẮNG</CyberSubHeader>
            <CyberMetric size="xs" color="text-white">{guru.winRate}%</CyberMetric>
          </div>
          <div className="text-center">
            <CyberSubHeader className="mb-1">LỢI NHUẬN TB</CyberSubHeader>
            <CyberMetric size="xs" color="text-[#22C55E]">+{guru.avgReturn}%</CyberMetric>
          </div>
        </div>
      </CyberCard>

      <div className="space-y-6">
        {/* Daily Insight */}
        <CyberCard className="p-6" variant="neutral">
          <div className="flex items-center gap-2 text-[#22C55E] mb-4">
            <MessageSquare size={18} />
            <CyberHeader size="xs">Nhận định hôm nay từ {guru.name}</CyberHeader>
          </div>
          <div className="text-[13px] text-white/60 font-mono uppercase leading-relaxed">
            <p>Thị trường đang có dấu hiệu tích lũy tại vùng kháng cự quan trọng. Khối lượng giao dịch sụt giảm cho thấy lực cung đang yếu đi. Đây là thời điểm tuyệt vời để thiết lập vị thế mua vào các mã dẫn dắt có kết quả kinh doanh quý đột phá.</p>
            <p className="text-[10px] text-white/20 mt-4 border-t border-white/5 pt-4">* DỮ LIỆU ĐƯỢC QUÉT TỰ ĐỘNG BỞI THUẬT TOÁN NỘI BỘ LÚC 14:00 HÔM NAY.</p>
          </div>
        </CyberCard>

        {/* Performance Chart */}
        <CyberCard className="p-6">
          <CyberHeader size="xs" className="mb-8">MÔ PHỎNG HIỆU SUẤT DANH MỤC</CyberHeader>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockPerformanceData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ backgroundColor: '#08110f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                  itemStyle={{ color: '#22C55E' }}
                />
                <Area type="monotone" dataKey="value" stroke="#22C55E" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CyberCard>

        {/* Watchlist & Action List */}
        <CyberCard className="overflow-hidden p-0">
          <div className="p-6 border-b border-white/5">
            <CyberHeader size="xs">WATCHLIST & VỊ THẾ HIỆN TẠI</CyberHeader>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/[0.02] text-[10px] font-black uppercase text-white/30 tracking-widest">
                  <th className="p-4 font-black">Mã CK</th>
                  <th className="p-4 font-black">Tín hiệu</th>
                  <th className="p-4 font-black">Mục tiêu Mua</th>
                  <th className="p-4 font-black text-right">Dừng lỗ</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-mono uppercase divide-y divide-white/5">
                <tr className="hover:bg-[#22C55E]/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-black text-white flex items-center gap-2">FPT <span className="px-1.5 py-0.5 rounded-[4px] text-[8px] bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/20">ĐANG GIỮ</span></div>
                    <div className="text-[9px] text-white/30">CTCP FPT</div>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-[#22C55E]"><CheckCircle2 size={13} /> BREAKOUT VCP</span>
                  </td>
                  <td className="p-4 text-white/60">QUANH 115.0</td>
                  <td className="p-4 text-right text-red-400 font-black">108.5 (-5.6%)</td>
                </tr>
                <tr className="hover:bg-[#22C55E]/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-black text-white flex items-center gap-2">GMD <span className="px-1.5 py-0.5 rounded-[4px] text-[8px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">WATCHLIST</span></div>
                    <div className="text-[9px] text-white/30">GEMADEPT</div>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-indigo-400"><Target size={13} /> CHỜ VƯỢT ĐỈNH MỐC 82</span>
                  </td>
                  <td className="p-4 text-white/60">82.1 - 82.5</td>
                  <td className="p-4 text-right text-red-400 font-black">78.0 (-5.0%)</td>
                </tr>
                <tr className="hover:bg-[#22C55E]/[0.02] transition-colors">
                  <td className="p-4">
                    <div className="font-black text-white flex items-center gap-2">VIX <span className="px-1.5 py-0.5 rounded-[4px] text-[8px] bg-white/5 text-white/20 border border-white/10">ĐÃ BÁN</span></div>
                    <div className="text-[9px] text-white/30">CHỨNG KHOÁN VIX</div>
                  </td>
                  <td className="p-4">
                    <span className="flex items-center gap-1.5 text-red-500/60"><AlertTriangle size={13} /> VI PHẠM CẮT LỖ</span>
                  </td>
                  <td className="p-4 text-white/30">-</td>
                  <td className="p-4 text-right text-white/10 line-through">18.5</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
