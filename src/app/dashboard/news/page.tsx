"use client";

import { motion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown, Minus, Filter, ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getNewsBookmarks, setNewsBookmarks } from "@/lib/storage";
import { CyberCard } from "@/components/ui/CyberCard";
import { CyberHeader, CyberMetric, CyberSubHeader, CyberTypography } from "@/components/ui/CyberTypography";
import { cn } from "@/lib/utils";

type NewsSentiment = "bullish" | "bearish" | "neutral";

interface NewsItem {
  id: string | number;
  title: string;
  source: string;
  time: string;
  sentiment: NewsSentiment;
  asset: string;
  summary: string;
  link?: string;
}

const allNewsFallback: NewsItem[] = [
  { id: 1, title: "Vàng SJC lập đỉnh mới 93.5 triệu/lượng, chênh thế giới 18 triệu", source: "VnExpress", time: "2 giờ trước", sentiment: "bullish" as const, asset: "Vàng", summary: "Giá vàng SJC tiếp tục tăng mạnh do nhu cầu trú ẩn an toàn và chênh lệch giá thế giới thu hẹp chậm." },
  { id: 2, title: "Fed giữ nguyên lãi suất, Powell cảnh báo rủi ro lạm phát dai dẳng", source: "CafeF", time: "4 giờ trước", sentiment: "bearish" as const, asset: "Chứng khoán", summary: "Fed giữ lãi suất 5.25-5.5%, Powell phát biểu dovish nhưng cảnh báo lạm phát chưa về 2% mục tiêu." },
  { id: 3, title: "NHNN bơm 15.000 tỷ qua OMO, tỷ giá ổn định", source: "NHNN", time: "5 giờ trước", sentiment: "neutral" as const, asset: "Tiết kiệm", summary: "Ngân hàng Nhà nước tiếp tục bơm thanh khoản qua thị trường mở, hỗ trợ ổn định tỷ giá USD/VND." },
  { id: 4, title: "BTC sideway $83k, ETF Bitcoin ghi nhận dòng tiền vào 200M USD", source: "CoinDesk", time: "6 giờ trước", sentiment: "bullish" as const, asset: "Crypto", summary: "Bitcoin đi ngang quanh $83,000, trong khi ETF Bitcoin spot tiếp tục thu hút dòng tiền." },
  { id: 5, title: "VN-Index giảm nhẹ 0.3%, nhóm ngân hàng chịu áp lực chốt lời", source: "VnExpress", time: "7 giờ trước", sentiment: "bearish" as const, asset: "Chứng khoán", summary: "Thị trường chứng khoán VN giảm nhẹ phiên sáng, thanh khoản cải thiện nhưng lực bán chiếm ưu thế." },
  { id: 6, title: "CPI tháng 3 tăng 3.5% — chuyên gia nói lạm phát đang kiểm soát được", source: "GSO", time: "8 giờ trước", sentiment: "neutral" as const, asset: "Vĩ mô", summary: "Chỉ số giá tiêu dùng tháng 3/2026 tăng 3.5% so với cùng kỳ, nằm trong ngưỡng mục tiêu NHNN." },
];

const sentimentTag = {
  bullish: { color: "#22C55E", label: "TÍCH CỰC", icon: TrendingUp },
  bearish: { color: "#EF4444", label: "TIÊU CỰC", icon: TrendingDown },
  neutral: { color: "#8B8D96", label: "TRUNG LẬP", icon: Minus },
};

const assetFilters = ["Tất cả", "📌 Đã lưu", "Vàng", "Chứng khoán", "Crypto", "Tiết kiệm", "Vĩ mô"];

function getBookmarks(): Set<string | number> {
  return getNewsBookmarks() as Set<string | number>;
}
function saveBookmarks(bm: Set<string | number>) {
  setNewsBookmarks(bm as Set<string>);
}

const fadeIn = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function NewsPage() {
  const [filter, setFilter] = useState("Tất cả");
  const [items, setItems] = useState<NewsItem[]>(allNewsFallback);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string | number>>(new Set());

  useEffect(() => { setBookmarks(getBookmarks()); }, []);

  const toggleBookmark = useCallback((id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    setBookmarks(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveBookmarks(next);
      return next;
    });
  }, []);

  useEffect(() => {
    let active = true;

    const loadNews = async () => {
      try {
        const resp = await fetch("/api/news", { cache: "no-store" });
        if (!resp.ok) throw new Error("Cannot load news");

        const payload = (await resp.json()) as {
          articles?: Array<{
            id: string;
            title: string;
            source: string;
            published: string;
            sentiment: NewsSentiment;
            asset: string;
            summary: string;
            link: string;
          }>;
        };

        const mapped = (payload.articles ?? []).map((article) => ({
          id: article.id,
          title: article.title,
          source: article.source,
          time: new Date(article.published).toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
          }),
          sentiment: article.sentiment,
          asset: article.asset,
          summary: article.summary,
          link: article.link,
        }));

        if (active && mapped.length > 0) {
          setItems(mapped);
        }

        if (active) {
          setStale(Boolean((payload as { stale?: boolean }).stale));
        }
      } catch {
        if (active) {
          setItems(allNewsFallback);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadNews();

    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(
    () => {
      if (filter === "Tất cả") return items;
      if (filter === "📌 Đã lưu") return items.filter(n => bookmarks.has(n.id));
      return items.filter((n) => n.asset === f.replace("📌 ", ""));
    },
    [filter, items, bookmarks],
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <CyberHeader size="display">Tin tức <span className="text-[#22C55E]">AI</span></CyberHeader>
        <CyberSubHeader className="mt-1">
          Phân tích tâm lý thị trường thời gian thực — cung cấp bởi VietFi AI
        </CyberSubHeader>
      </motion.div>

      {stale && (
        <motion.div variants={fadeIn} className="mb-4">
          <CyberSubHeader color="text-yellow-300" className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-300 animate-pulse" />
            Dữ liệu tin tức cũ (đang cập nhật nền)...
          </CyberSubHeader>
        </motion.div>
      )}

      {loading && (
        <motion.div variants={fadeIn} className="mb-4 flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#22C55E]" />
          <CyberSubHeader>Đang đồng bộ tin tức mới nhất...</CyberSubHeader>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeIn} className="mb-6 flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
        <Filter className="w-4 h-4 text-[#22C55E] shrink-0" />
        <div className="flex items-center gap-2">
          {assetFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "whitespace-nowrap px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border",
                filter === f
                  ? "bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/30"
                  : "bg-white/5 text-white/40 border-white/10 hover:border-white/20"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* News List */}
      <motion.div variants={stagger} className="space-y-4">
        {filtered.map((news) => {
          const s = sentimentTag[news.sentiment];
          const SentIcon = s.icon;
          const hasLink = Boolean(news.link);
          const isBookmarked = bookmarks.has(news.id);

          return (
            <motion.div key={news.id} variants={fadeIn}>
              <CyberCard
                className="group"
                variant={news.sentiment === "bullish" ? "success" : news.sentiment === "bearish" ? "danger" : "default"}
              >
                <div
                  className="p-5 flex items-start gap-4 cursor-pointer"
                  onClick={() => hasLink && window.open(news.link, "_blank", "noopener,noreferrer")}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/40">
                        {news.asset}
                      </span>
                      <span
                        className="text-[10px] font-black uppercase tracking-widest flex items-center gap-1 px-2 py-0.5 rounded border"
                        style={{ color: s.color, backgroundColor: `${s.color}15`, borderColor: `${s.color}30` }}
                      >
                        <SentIcon className="w-3 h-3" /> {s.label}
                      </span>
                    </div>

                    <CyberHeader size="xs" className="mb-2 group-hover:text-[#22C55E] transition-colors line-clamp-2 leading-tight">
                      {news.title}
                    </CyberHeader>

                    <p className="text-[12px] text-white/50 leading-relaxed font-mono uppercase line-clamp-2 mb-4">
                      {news.summary}
                    </p>

                    <div className="flex items-center gap-4">
                      <CyberSubHeader className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-white/20" />
                        {news.source.toUpperCase()}
                      </CyberSubHeader>
                      <CyberSubHeader className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        {news.time.toUpperCase()}
                      </CyberSubHeader>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3 shrink-0 pt-1">
                    <button
                      onClick={(e) => toggleBookmark(news.id, e)}
                      className="p-2 rounded-xl transition-all hover:bg-white/5"
                      title={isBookmarked ? "Bỏ lưu" : "Lưu tin"}
                    >
                      {isBookmarked
                        ? <BookmarkCheck className="w-5 h-5 text-[#22C55E] drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                        : <Bookmark className="w-5 h-5 text-white/10 hover:text-white/40" />
                      }
                    </button>
                    {hasLink && (
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-all bg-white/5 border border-white/10 group-hover:border-[#22C55E]/30 group-hover:text-[#22C55E]">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>
                </div>
              </CyberCard>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
