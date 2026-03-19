"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { Calculator, TrendingUp, AlertTriangle } from "lucide-react";

const categories = [
  { label: "Ăn uống", key: "food", placeholder: "VD: 5000000", weight: 0.35 },
  { label: "Nhà ở / Thuê trọ", key: "housing", placeholder: "VD: 3000000", weight: 0.2 },
  { label: "Đi lại (xăng, grab)", key: "transport", placeholder: "VD: 1500000", weight: 0.12 },
  { label: "Giáo dục", key: "education", placeholder: "VD: 2000000", weight: 0.1 },
  { label: "Y tế / Sức khỏe", key: "health", placeholder: "VD: 500000", weight: 0.08 },
  { label: "Giải trí", key: "entertainment", placeholder: "VD: 1000000", weight: 0.08 },
  { label: "Khác", key: "other", placeholder: "VD: 1000000", weight: 0.07 },
];

const officialCPI = 3.8;
const categoryInflation: Record<string, number> = {
  food: 6.2,
  housing: 8.5,
  transport: 4.1,
  education: 5.8,
  health: 4.5,
  entertainment: 2.3,
  other: 3.0,
};

export default function PersonalCPIPage() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{
    personalCPI: number;
    breakdown: { category: string; amount: number; inflation: number; impact: number }[];
    total: number;
  } | null>(null);

  function calculate() {
    const breakdown = categories.map((c) => {
      const amount = parseInt(values[c.key] || "0") || 0;
      const inflation = categoryInflation[c.key];
      return { category: c.label, amount, inflation, impact: 0 };
    });

    const total = breakdown.reduce((s, b) => s + b.amount, 0);
    if (total === 0) return;

    const withImpact = breakdown.map((b) => ({
      ...b,
      impact: total > 0 ? (b.amount / total) * categoryInflation[b.category === "Ăn uống" ? "food" : b.category === "Nhà ở / Thuê trọ" ? "housing" : b.category === "Đi lại (xăng, grab)" ? "transport" : b.category === "Giáo dục" ? "education" : b.category === "Y tế / Sức khỏe" ? "health" : b.category === "Giải trí" ? "entertainment" : "other"] : 0,
    }));

    const personalCPI = withImpact.reduce((s, b) => s + b.impact, 0);
    setResult({ personalCPI, breakdown: withImpact, total });
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold text-white mb-2">
        <span className="text-gradient">Personal CPI</span> Calculator
      </h1>
      <p className="text-[#8888AA] mb-8">
        Lạm phát chính thức 3.8%, nhưng lạm phát THỰC SỰ ảnh hưởng đến BẠN là bao nhiêu?
        Nhập chi tiêu hàng tháng để tính lạm phát cá nhân.
      </p>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Input form */}
        <div className="glass-card p-6">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-[#FFD700]" />
            Chi tiêu hàng tháng (VNĐ)
          </h3>

          <div className="space-y-4">
            {categories.map((c) => (
              <div key={c.key}>
                <label className="text-sm text-[#8888AA] mb-1 block">{c.label}</label>
                <input
                  type="number"
                  placeholder={c.placeholder}
                  value={values[c.key] || ""}
                  onChange={(e) => setValues({ ...values, [c.key]: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/[0.04] border border-[#2A2A3A] text-white text-sm focus:border-[#FFD700]/50 focus:outline-none transition-colors"
                />
              </div>
            ))}

            <button
              onClick={calculate}
              className="w-full py-3 bg-gradient-primary text-black font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all"
            >
              Tính lạm phát cá nhân
            </button>
          </div>
        </div>

        {/* Result */}
        <div>
          {result ? (
            <div className="space-y-6">
              {/* Main result */}
              <div className="glass-card p-8 text-center glow-primary" style={{ borderColor: "rgba(255, 215, 0, 0.15)" }}>
                <p className="text-sm text-[#8888AA] mb-2">Lạm phát cá nhân của bạn</p>
                <div className="text-5xl font-black text-gradient mb-2">
                  {result.personalCPI.toFixed(1)}%
                </div>
                <div className="flex items-center justify-center gap-4 text-sm">
                  <span className="text-[#8888AA]">CPI chính thức: {officialCPI}%</span>
                  <span className={result.personalCPI > officialCPI ? "text-[#FF5252]" : "text-[#00E676]"}>
                    {result.personalCPI > officialCPI ? "+" : ""}
                    {(result.personalCPI - officialCPI).toFixed(1)}% so với chính thức
                  </span>
                </div>
              </div>

              {/* Comparison */}
              {result.personalCPI > officialCPI && (
                <div className="glass-card p-4 border-[#FF5252]/20 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-[#FFAB40] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-[#FFAB40] font-medium">Lạm phát cá nhân cao hơn chính thức</p>
                    <p className="text-xs text-[#8888AA] mt-1">
                      Cơ cấu chi tiêu của bạn tập trung vào nhóm hàng có tốc độ tăng giá cao (ăn uống, nhà ở).
                      Nếu không đầu tư, sức mua thực tế giảm {result.personalCPI.toFixed(1)}% mỗi năm.
                    </p>
                  </div>
                </div>
              )}

              {/* Breakdown */}
              <div className="glass-card p-6">
                <h3 className="font-semibold text-white mb-4">Chi tiết theo danh mục</h3>
                <div className="space-y-3">
                  {result.breakdown.filter(b => b.amount > 0).map((b) => (
                    <div key={b.category} className="flex items-center gap-3">
                      <span className="text-sm text-[#8888AA] w-36">{b.category}</span>
                      <div className="flex-1 h-2 bg-[#2A2A3A] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(b.inflation * 10, 100)}%`,
                            backgroundColor: b.inflation > 5 ? "#FF5252" : b.inflation > 3 ? "#FFAB40" : "#00E676",
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-white w-12 text-right">
                        {b.inflation.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Insight */}
              <div className="glass-card p-6 border-[#FFD700]/10">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-sm font-semibold text-[#FFD700]">AI Insight</span>
                </div>
                <p className="text-sm text-[#8888AA] leading-relaxed">
                  Với lạm phát cá nhân {result.personalCPI.toFixed(1)}%, để giữ nguyên sức mua sau 5 năm, 
                  tổng tài sản của bạn cần tăng ít nhất{" "}
                  <strong className="text-white">
                    {(Math.pow(1 + result.personalCPI / 100, 5) * 100 - 100).toFixed(0)}%
                  </strong>. 
                  Gửi tiết kiệm 5.2%/năm chỉ đủ bù {(5.2 / result.personalCPI * 100).toFixed(0)}% lạm phát.
                  AI khuyến nghị phân bổ ít nhất 30-40% vào các kênh có lợi nhuận kỳ vọng cao hơn.
                </p>
              </div>
            </div>
          ) : (
            <div className="glass-card p-12 flex flex-col items-center justify-center text-center h-full">
              <Calculator className="w-12 h-12 text-[#2A2A3A] mb-4" />
              <p className="text-[#8888AA]">Nhập chi tiêu hàng tháng và nhấn &quot;Tính&quot; để xem kết quả</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
