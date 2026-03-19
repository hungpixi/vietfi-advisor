"use client";

import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";

const allNews = [
  { title: "Vàng SJC lập đỉnh mới 93.5 triệu/lượng, chênh thế giới 18 triệu", source: "VnExpress", time: "2 giờ trước", sentiment: "bullish" as const, asset: "Vàng", summary: "Giá vàng SJC sáng nay tiếp tục tăng mạnh, chạm mốc 93.5 triệu đồng/lượng bán ra, tăng 500.000 đồng so với phiên hôm qua." },
  { title: "Fed giữ nguyên lãi suất, Powell cảnh báo rủi ro lạm phát", source: "CafeF", time: "4 giờ trước", sentiment: "bearish" as const, asset: "Chứng khoán", summary: "Cục Dự trữ Liên bang Mỹ quyết định giữ nguyên lãi suất ở mức 5.25-5.5%, đồng thời cảnh báo rủi ro lạm phát vẫn còn dai dẳng." },
  { title: "NHNN bơm 15.000 tỷ qua OMO, tỷ giá ổn định", source: "NHNN", time: "5 giờ trước", sentiment: "neutral" as const, asset: "Tiết kiệm", summary: "Ngân hàng Nhà nước tiếp tục bơm thanh khoản qua kênh OMO, giúp tỷ giá USD/VND ổn định quanh mức 25.480." },
  { title: "BTC sideway $83k, ETF Bitcoin ghi nhận dòng tiền vào 200M USD", source: "CoinDesk", time: "6 giờ trước", sentiment: "bullish" as const, asset: "Crypto", summary: "Bitcoin tiếp tục giao dịch trong vùng $83,000-84,000. Các quỹ ETF Bitcoin spot tại Mỹ ghi nhận dòng tiền vào ròng 200 triệu USD." },
  { title: "VN-Index giảm nhẹ phiên sáng, nhóm ngân hàng chịu áp lực", source: "CafeF", time: "7 giờ trước", sentiment: "bearish" as const, asset: "Chứng khoán", summary: "VN-Index giảm 4.2 điểm trong phiên sáng, xuống còn 1,268 điểm. Nhóm cổ phiếu ngân hàng chịu áp lực bán ròng từ khối ngoại." },
  { title: "CPI tháng 2 tăng 0.3%, lạm phát cả năm dự báo dưới 4%", source: "GSO", time: "1 ngày trước", sentiment: "neutral" as const, asset: "Vĩ mô", summary: "Chỉ số giá tiêu dùng tháng 2/2026 tăng 0.3% so với tháng trước, tương đương mức tăng cùng kỳ năm ngoái." },
  { title: "Thị trường BĐS Q1/2026: Thanh khoản hồi phục nhẹ, giá vẫn đi ngang", source: "VnExpress", time: "2 ngày trước", sentiment: "neutral" as const, asset: "BĐS", summary: "Thị trường BĐS quý 1/2026 ghi nhận thanh khoản hồi phục nhẹ 15% so với cùng kỳ, tuy nhiên mặt bằng giá vẫn đi ngang." },
];

const sentimentMap: Record<string, { color: string; label: string }> = {
  bullish: { color: "#00E676", label: "Tích cực" },
  bearish: { color: "#FF5252", label: "Tiêu cực" },
  neutral: { color: "#8888AA", label: "Trung lập" },
};

export default function NewsPage() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <h1 className="text-2xl font-bold text-white mb-2">
        Tin tức <span className="text-gradient">AI-Curated</span>
      </h1>
      <p className="text-[#8888AA] mb-8">
        AI tự động scrape, phân loại và đánh giá sentiment cho từng tin tức từ các nguồn uy tín.
      </p>

      <div className="space-y-4">
        {allNews.map((news, i) => {
          const s = sentimentMap[news.sentiment];
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card glass-card-hover p-5 transition-all cursor-pointer"
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/[0.04] flex items-center justify-center flex-shrink-0">
                  <Newspaper className="w-5 h-5 text-[#8888AA]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-medium text-white mb-2">{news.title}</h3>
                  <p className="text-sm text-[#666680] mb-3 line-clamp-2">{news.summary}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-[#666680]">{news.source}</span>
                    <span className="text-xs text-[#666680]">•</span>
                    <span className="text-xs text-[#666680]">{news.time}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: s.color, backgroundColor: `${s.color}15` }}>
                      {s.label}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded border border-[#2A2A3A] text-[#8888AA]">{news.asset}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
