"use client";

import { motion } from "framer-motion";
import { GURU_PERSONAS } from "@/lib/guru-personas";
import Link from "next/link";
import { TrendingUp, Award, ChevronRight, Sparkles } from "lucide-react";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function GurusPage() {
  const gurus = Object.values(GURU_PERSONAS);

  return (
    <div className="space-y-6">
      <motion.div variants={fadeIn} className="mb-6">
        <CyberHeader size="display">Hội đồng <span className="text-[#22C55E]">Gurus</span></CyberHeader>
        <div className="flex items-center gap-2 mt-2">
          <div className="h-1 w-12 bg-[#22C55E]/50" />
          <p className="font-mono text-[12px] font-black uppercase tracking-[0.2em] text-[#22C55E]">
            PHÂN TÍCH CHIẾN LƯỢC THEO CÁC HUYỀN THOẠI
          </p>
        </div>
      </motion.div>

      {/* Hero Section */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn}>
        <CyberCard className="p-8 md:p-12 text-center" showDecorators={true} variant="success">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-[#22C55E]" />
            <CyberSubHeader color="text-[#22C55E]">HỘI ĐỒNG CỐ VẤN KỶ NGUYÊN MỚI</CyberSubHeader>
            <Sparkles className="w-5 h-5 text-[#22C55E]" />
          </div>
          <CyberHeader size="sm" className="mb-4">
            Phục dựng huyền thoại đầu tư bằng <span className="text-[#22C55E]">Trí tuệ Nhân tạo</span>
          </CyberHeader>
          <p className="text-[13px] text-white/50 font-mono uppercase max-w-2xl mx-auto leading-relaxed">
            5 bộ não thiên tài đã được số hóa. Họ quét hàng ngàn mã cổ phiếu mỗi giây để lọc ra các tín hiệu đồng nhất với triết lý đầu tư kinh điển.
          </p>
        </CyberCard>
      </motion.div>

      {/* Guru Grid */}
      <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {gurus.map((guru) => (
          <Link href={`/dashboard/gurus/${guru.id}`} key={guru.id} className="block group">
            <CyberCard className="h-full group-hover:border-[#22C55E]/40 transition-all cursor-pointer">
              <div className="p-6">
                <div className="flex items-start gap-5 mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-4xl shadow-inner shrink-0 group-hover:scale-105 group-hover:bg-[#22C55E]/10 group-hover:border-[#22C55E]/30 transition-all">
                    {guru.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <CyberHeader size="xs" className="mb-1 group-hover:text-[#22C55E] transition-colors">{guru.name}</CyberHeader>
                    <CyberTypography size="xs" color="text-[#22C55E]" className="font-black mb-2 tracking-widest">{guru.title.toUpperCase()}</CyberTypography>
                    <p className="text-[11px] text-white/30 italic font-mono uppercase line-clamp-2 leading-relaxed">
                      &quot;{guru.philosophy}&quot;
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Award className="w-3 h-3 text-white/20" />
                      <CyberSubHeader>TỶ LỆ THẮNG</CyberSubHeader>
                    </div>
                    <CyberMetric size="xs" color="text-white">{guru.winRate}%</CyberMetric>
                  </div>
                  <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-3 h-3 text-white/20" />
                      <CyberSubHeader>LỢI NHUẬN TB</CyberSubHeader>
                    </div>
                    <CyberMetric size="xs" color="text-[#22C55E]">+{guru.avgReturn}%</CyberMetric>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-4 group-hover:border-[#22C55E]/20 transition-all">
                  <CyberSubHeader color="group-hover:text-[#22C55E]">XEM CHIẾN LƯỢC CHI TIẾT</CyberSubHeader>
                  <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-[#22C55E] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            </CyberCard>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
