"use client";

import { motion } from "framer-motion";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { PieChart as PieIcon, Target, TrendingUp, Sparkles } from "lucide-react";
import { useState } from "react";

const riskProfiles = [
  { label: "Bảo thủ", value: "conservative", allocation: [
    { name: "Tiết kiệm", value: 50, color: "#00E5FF" },
    { name: "Vàng", value: 25, color: "#FFD700" },
    { name: "Chứng khoán", value: 15, color: "#00E676" },
    { name: "Crypto", value: 0, color: "#AB47BC" },
    { name: "BĐS (REIT)", value: 10, color: "#FF6B35" },
  ]},
  { label: "Cân bằng", value: "balanced", allocation: [
    { name: "Tiết kiệm", value: 30, color: "#00E5FF" },
    { name: "Vàng", value: 20, color: "#FFD700" },
    { name: "Chứng khoán", value: 25, color: "#00E676" },
    { name: "Crypto", value: 10, color: "#AB47BC" },
    { name: "BĐS (REIT)", value: 15, color: "#FF6B35" },
  ]},
  { label: "Tăng trưởng", value: "growth", allocation: [
    { name: "Tiết kiệm", value: 15, color: "#00E5FF" },
    { name: "Vàng", value: 10, color: "#FFD700" },
    { name: "Chứng khoán", value: 35, color: "#00E676" },
    { name: "Crypto", value: 20, color: "#AB47BC" },
    { name: "BĐS (REIT)", value: 20, color: "#FF6B35" },
  ]},
];

const projectionData = [
  { year: "Năm 1", conservative: 104, balanced: 108, growth: 112 },
  { year: "Năm 2", conservative: 108, balanced: 117, growth: 126 },
  { year: "Năm 3", conservative: 113, balanced: 126, growth: 141 },
  { year: "Năm 5", conservative: 122, balanced: 147, growth: 176 },
  { year: "Năm 10", conservative: 149, balanced: 216, growth: 310 },
];

export default function PortfolioPage() {
  const [capital, setCapital] = useState("");
  const [selectedProfile, setSelectedProfile] = useState(1);
  const profile = riskProfiles[selectedProfile];
  const capitalNum = parseInt(capital) || 100000000;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold text-white mb-2">
        Portfolio <span className="text-gradient">Advisor</span>
      </h1>
      <p className="text-[#8888AA] mb-8">
        AI gợi ý phân bổ vốn tối ưu dựa trên profile rủi ro, bối cảnh kinh tế vĩ mô và mục tiêu tài chính.
      </p>

      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* Input */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-[#FFD700]" />
            Thông tin của bạn
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-[#8888AA] mb-1 block">Tổng vốn (VNĐ)</label>
              <input
                type="number"
                placeholder="VD: 100000000"
                value={capital}
                onChange={(e) => setCapital(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-[#2A2A3A] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm text-[#8888AA] mb-2 block">Profile rủi ro</label>
              <div className="flex gap-2">
                {riskProfiles.map((p, i) => (
                  <button
                    key={p.value}
                    onClick={() => setSelectedProfile(i)}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                      selectedProfile === i
                        ? "bg-[#FFD700]/10 text-[#FFD700] border border-[#FFD700]/30"
                        : "bg-white/[0.04] text-[#8888AA] border border-[#2A2A3A] hover:border-[#FFD700]/20"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pie chart */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-[#FFD700]" />
            Phân bổ đề xuất
          </h3>
          <div className="h-48">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={profile.allocation} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                  {profile.allocation.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#12121A", border: "1px solid #2A2A3A", borderRadius: 8, color: "#F0F0F5", fontSize: 12 }} formatter={(v: any) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-2">
            {profile.allocation.map((a) => (
              <div key={a.name} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                  <span className="text-xs text-[#8888AA]">{a.name}</span>
                </div>
                <div className="text-xs text-white">
                  <span className="font-medium">{a.value}%</span>
                  <span className="text-[#666680] ml-2">
                    {((capitalNum * a.value) / 100).toLocaleString()} đ
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Projection */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#FFD700]" />
            Dự phóng tài sản
          </h3>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={projectionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                <XAxis dataKey="year" tick={{ fill: "#8888AA", fontSize: 10 }} axisLine={false} />
                <YAxis tick={{ fill: "#8888AA", fontSize: 10 }} axisLine={false} />
                <Tooltip contentStyle={{ background: "#12121A", border: "1px solid #2A2A3A", borderRadius: 8, color: "#F0F0F5", fontSize: 12 }} formatter={(v: any) => `${v}tr`} />
                <Bar dataKey="conservative" fill="#00E5FF" radius={[4, 4, 0, 0]} opacity={selectedProfile === 0 ? 1 : 0.2} />
                <Bar dataKey="balanced" fill="#FFD700" radius={[4, 4, 0, 0]} opacity={selectedProfile === 1 ? 1 : 0.2} />
                <Bar dataKey="growth" fill="#00E676" radius={[4, 4, 0, 0]} opacity={selectedProfile === 2 ? 1 : 0.2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-[#666680] mt-2 text-center">
            * Dự phóng dựa trên lợi nhuận kỳ vọng lịch sử, không đảm bảo tương lai
          </p>
        </div>
      </div>

      {/* AI Insight */}
      <div className="glass-card p-6 border-[#FFD700]/10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#FFD700]" />
          <span className="text-sm font-semibold text-[#FFD700]">AI Portfolio Insight</span>
        </div>
        <p className="text-sm text-[#8888AA] leading-relaxed">
          Dựa trên bối cảnh vĩ mô hiện tại (lạm phát 3.8%, lãi suất tiết kiệm 5.2%, VN-Index vùng 1,268, vàng đạt đỉnh),
          AI khuyến nghị profile <strong className="text-white">{profile.label}</strong> với tỷ trọng vàng cao hơn bình thường (+5%) do rủi ro địa chính trị.
          Nên tăng tỷ trọng chứng khoán nếu VN-Index điều chỉnh về vùng 1,200-1,220.
          Crypto nên DCA thay vì all-in tại mức giá hiện tại.
        </p>
      </div>
    </motion.div>
  );
}
