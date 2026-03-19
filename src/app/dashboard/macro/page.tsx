"use client";

import { motion } from "framer-motion";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, AreaChart, Area } from "recharts";
import { BarChart3, Sparkles } from "lucide-react";

const cpiData = [
  { month: "T8/25", cpi: 3.2 },
  { month: "T9/25", cpi: 3.4 },
  { month: "T10/25", cpi: 3.5 },
  { month: "T11/25", cpi: 3.6 },
  { month: "T12/25", cpi: 3.7 },
  { month: "T1/26", cpi: 3.9 },
  { month: "T2/26", cpi: 3.8 },
];

const interestRateData = [
  { month: "T8/25", rate: 4.8 },
  { month: "T9/25", rate: 4.9 },
  { month: "T10/25", rate: 5.0 },
  { month: "T11/25", rate: 5.0 },
  { month: "T12/25", rate: 5.1 },
  { month: "T1/26", rate: 5.2 },
  { month: "T2/26", rate: 5.2 },
];

const fxData = [
  { month: "T8/25", rate: 25100 },
  { month: "T9/25", rate: 25200 },
  { month: "T10/25", rate: 25250 },
  { month: "T11/25", rate: 25300 },
  { month: "T12/25", rate: 25350 },
  { month: "T1/26", rate: 25420 },
  { month: "T2/26", rate: 25480 },
];

const macroIndicators = [
  { name: "GDP (Q4/2025)", value: "6.8%", change: "+0.3%", positive: true },
  { name: "CPI YoY", value: "3.8%", change: "+0.1%", positive: false },
  { name: "Lãi suất TB 12T", value: "5.2%", change: "+0.1%", positive: true },
  { name: "USD/VND", value: "25,480", change: "+0.1%", positive: false },
  { name: "FDI (2 tháng)", value: "$3.2B", change: "+12%", positive: true },
  { name: "Xuất khẩu", value: "$53B", change: "+8.5%", positive: true },
];

const chartStyle = {
  background: "#12121A",
  border: "1px solid #2A2A3A",
  borderRadius: 8,
  color: "#F0F0F5",
  fontSize: 12,
};

export default function MacroPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold text-white mb-2">
        <span className="text-gradient">Macro Map</span> — Bản đồ Vĩ mô
      </h1>
      <p className="text-[#8888AA] mb-8">
        Dữ liệu kinh tế vĩ mô Việt Nam + AI commentary giải thích tác động lên các kênh đầu tư.
      </p>

      {/* Indicator cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {macroIndicators.map((ind) => (
          <div key={ind.name} className="glass-card p-4">
            <p className="text-xs text-[#8888AA] mb-1">{ind.name}</p>
            <p className="text-lg font-bold text-white">{ind.value}</p>
            <p className={`text-xs ${ind.positive ? "text-[#00E676]" : "text-[#FF5252]"}`}>{ind.change}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-3 gap-6 mb-8">
        {/* CPI */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">CPI (YoY %)</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart data={cpiData}>
                <defs>
                  <linearGradient id="cpiGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF6B35" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FF6B35" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                <XAxis dataKey="month" tick={{ fill: "#8888AA", fontSize: 10 }} axisLine={false} />
                <YAxis domain={[2.5, 4.5]} tick={{ fill: "#8888AA", fontSize: 10 }} axisLine={false} />
                <Tooltip contentStyle={chartStyle} />
                <Area type="monotone" dataKey="cpi" stroke="#FF6B35" fill="url(#cpiGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Interest Rate */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">Lãi suất TK 12 tháng (%)</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <LineChart data={interestRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                <XAxis dataKey="month" tick={{ fill: "#8888AA", fontSize: 10 }} axisLine={false} />
                <YAxis domain={[4, 6]} tick={{ fill: "#8888AA", fontSize: 10 }} axisLine={false} />
                <Tooltip contentStyle={chartStyle} />
                <Line type="monotone" dataKey="rate" stroke="#00E5FF" strokeWidth={2} dot={{ fill: "#00E5FF", r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* FX */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4">USD/VND</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <AreaChart data={fxData}>
                <defs>
                  <linearGradient id="fxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFD700" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#FFD700" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3A" />
                <XAxis dataKey="month" tick={{ fill: "#8888AA", fontSize: 10 }} axisLine={false} />
                <YAxis domain={[24800, 25800]} tick={{ fill: "#8888AA", fontSize: 10 }} axisLine={false} />
                <Tooltip contentStyle={chartStyle} />
                <Area type="monotone" dataKey="rate" stroke="#FFD700" fill="url(#fxGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Commentary */}
      <div className="glass-card p-6 border-[#FFD700]/10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#FFD700]" />
          <span className="text-sm font-semibold text-[#FFD700]">AI Macro Commentary</span>
        </div>
        <div className="text-sm text-[#8888AA] leading-relaxed space-y-3">
          <p>
            <strong className="text-white">Tổng quan:</strong> Kinh tế VN Q1/2026 tăng trưởng ổn định 6.8% GDP,
            lạm phát kiểm soát ở 3.8%. NHNN duy trì chính sách tiền tệ nới lỏng có kiểm soát.
          </p>
          <p>
            <strong className="text-white">Tác động lên kênh đầu tư:</strong>
          </p>
          <ul className="space-y-2 ml-4">
            <li>🟡 <strong>Vàng:</strong> Đang ở vùng rủi ro cao (chênh thế giới 18 triệu). Nên hold, tránh mua mới.</li>
            <li>🟢 <strong>Chứng khoán:</strong> Mặt bằng lãi suất thấp hỗ trợ, nhưng cần chờ VN-Index test lại hỗ trợ 1,250.</li>
            <li>🔵 <strong>Tiết kiệm:</strong> Lãi suất thực âm (5.2% - 3.8% = 1.4%), không nên để quá 30% tài sản.</li>
            <li>🔴 <strong>BĐS:</strong> Thanh khoản thấp, nên tránh trong ngắn hạn trừ khi có cơ hội cụ thể.</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
