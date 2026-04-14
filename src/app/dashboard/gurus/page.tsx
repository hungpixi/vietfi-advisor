"use client";

import { motion } from "framer-motion";
import { GURU_PERSONAS } from "@/lib/guru-personas";
import Link from "next/link";
import { TrendingUp, Award, ChevronRight } from "lucide-react";

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function GurusPage() {
  const gurus = Object.values(GURU_PERSONAS);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <motion.div initial="hidden" animate="visible" variants={fadeIn} className="bg-black/40 border border-[#333] rounded-2xl p-6 md:p-8 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 pointer-events-none" />
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400 mb-2 relative z-10">
          Hội Đồng Cố Vấn Kỷ Nguyên Mới
        </h1>
        <p className="text-gray-400 relative z-10 max-w-2xl mx-auto">
          5 huyền thoại đầu tư chứng khoán đã được phục dựng bằng AI. Họ quét hàng ngàn mã cổ phiếu mỗi ngày để tìm kiếm cơ hội vàng cho bạn. Chọn một người đồng hành phù hợp với triết lý của bạn.
        </p>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gurus.map((guru) => (
          <Link href={`/dashboard/gurus/${guru.id}`} key={guru.id}>
            <motion.div variants={fadeIn} className="group cursor-pointer bg-black/20 border border-[#222] hover:border-indigo-500/50 hover:bg-[#111] transition-all rounded-xl p-5 flex flex-col h-full relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors" />
              
              <div className="flex items-start gap-4 z-10">
                <div className="w-16 h-16 rounded-full bg-[#1A1A1A] border border-[#333] flex items-center justify-center text-3xl shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                  {guru.avatar}
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white group-hover:text-indigo-300 transition-colors">{guru.name}</h2>
                  <p className="text-sm font-medium text-emerald-400 mb-2">{guru.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 italic">&ldquo;{guru.philosophy}&rdquo;</p>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 z-10">
                <div className="bg-black/40 rounded-lg p-3 border border-[#222]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <Award size={14} />
                    <span className="text-xs">Tỷ lệ thắng</span>
                  </div>
                  <div className="text-lg font-bold text-white">{guru.winRate}%</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 border border-[#222]">
                  <div className="flex items-center gap-2 text-gray-400 mb-1">
                    <TrendingUp size={14} />
                    <span className="text-xs">Lợi nhuận TB</span>
                  </div>
                  <div className="text-lg font-bold text-emerald-400">+{guru.avgReturn}%</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-[#222] flex items-center justify-between text-indigo-400 text-sm font-medium z-10">
                <span>Xem danh mục đang theo dõi</span>
                <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </div>
  );
}
