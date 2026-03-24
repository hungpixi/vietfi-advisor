"use client";

import { motion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown, Minus, Filter, ExternalLink, Bookmark, BookmarkCheck } from "lucide-react";
import { useEffect, useMemo, useState, useCallback } from "react";
import { getNewsBookmarks, setNewsBookmarks } from "@/lib/storage";

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

/* ─── Data ─── */
const allNewsFallback: NewsItem[] = [
  { id: 1, title: "Vàng SJC lập đỉnh mới 93.5 triệu/lượng, chênh thế giới 18 triệu", source: "VnExpress", time: "2 giờ trước", sentiment: "bullish" as const, asset: "Vàng", summary: "Giá vàng SJC tiếp tục tăng mạnh do nhu cầu trú ẩn an toàn và chênh lệch giá thế giới thu hẹp chậm." },
  { id: 2, title: "Fed giữ nguyên lãi suất, Powell cảnh báo rủi ro lạm phát dai dẳng", source: "CafeF", time: "4 giờ trước", sentiment: "bearish" as const, asset: "Chứng khoán", summary: "Fed giữ lãi suất 5.25-5.5%, Powell phát biểu dovish nhưng cảnh báo lạm phát chưa về 2% mục tiêu." },
  { id: 3, title: "NHNN bơm 15.000 tỷ qua OMO, tỷ giá ổn định", source: "NHNN", time: "5 giờ trước", sentiment: "neutral" as const, asset: "Tiết kiệm", summary: "Ngân hàng Nhà nước tiếp tục bơm thanh khoản qua thị trường mở, hỗ trợ ổn định tỷ giá USD/VND." },
  { id: 4, title: "BTC sideway $83k, ETF Bitcoin ghi nhận dòng tiền vào 200M USD", source: "CoinDesk", time: "6 giờ trước", sentiment: "bullish" as const, asset: "Crypto", summary: "Bitcoin đi ngang quanh $83,000, trong khi ETF Bitcoin spot tiếp tục thu hút dòng tiền." },
  { id: 5, title: "VN-Index giảm nhẹ 0.3%, nhóm ngân hàng chịu áp lực chốt lời", source: "VnExpress", time: "7 giờ trước", sentiment: "bearish" as const, asset: "Chứng khoán", summary: "Thị trường chứng khoán VN giảm nhẹ phiên sáng, thanh khoản cải thiện nhưng lực bán chiếm ưu thế." },
  { id: 6, title: "CPI tháng 3 tăng 3.5% — chuyên gia nói lạm phát đang kiểm soát được", source: "GSO", time: "8 giờ trước", sentiment: "neutral" as const, asset: "Vĩ mô", summary: "Chỉ số giá tiêu dùng tháng 3/2026 tăng 3.5% so với cùng kỳ, nằm trong ngưỡng mục tiêu NHNN." },
];

const sentimentTag = {
  bullish: { color: "#22C55E", label: "Tích cực", icon: TrendingUp },
  bearish: { color: "#EF4444", label: "Tiêu cực", icon: TrendingDown },
  neutral: { color: "#8B8D96", label: "Trung lập", icon: Minus },
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
      return items.filter((n) => n.asset === filter);
    },
    [filter, items, bookmarks],
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeIn} className="mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-white mb-0.5">
          Tin tức <span className="text-gradient">AI</span>
        </h1>
        <p className="text-[13px] text-white/40">
          Tin tức tài chính + sentiment AI — cập nhật từ RSS CafeF
        </p>
      </motion.div>

      {stale && (
        <motion.div variants={fadeIn} className="mb-4 text-[12px] text-yellow-300">
          Dữ liệu tin tức cũ (đang cập nhật nền), bạn có thể refresh lại để lấy bản mới nhất.
        </motion.div>
      )}

      {loading && (
        <motion.div variants={fadeIn} className="mb-4 text-[12px] text-white/40">
          Đang tải tin tức mới...
        </motion.div>
      )}

      {/* Filters */}
      <motion.div variants={fadeIn} className="mb-6">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-white/20" />
          {assetFilters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-[11px] px-3 py-1.5 rounded-full transition-all ${
                filter === f
                  ? "bg-[#E6B84F]/15 text-[#E6B84F] border border-[#E6B84F]/20"
                  : "bg-white/[0.03] text-white/40 border border-white/[0.06] hover:border-white/10"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </motion.div>

      {/* News List */}
      <motion.div variants={stagger} className="space-y-3">
        {filtered.map((news) => {
          const s = sentimentTag[news.sentiment];
          const SentIcon = s.icon;
          const hasLink = Boolean(news.link);
          return (
            <motion.div
              key={news.id}
              variants={fadeIn}
              className="glass-card glass-card-hover p-4 transition-all cursor-pointer group block"
              role={hasLink ? "link" : undefined}
              onClick={() => {
                if (hasLink) {
                  window.open(news.link, "_blank", "noopener,noreferrer");
                }
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/30 border border-white/[0.06]">{news.asset}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5" style={{ color: s.color, backgroundColor: `${s.color}10` }}>
                      <SentIcon className="w-2.5 h-2.5" /> {s.label}
                    </span>
                  </div>
                  <h3 className="text-sm font-medium text-white/80 group-hover:text-white transition-colors mb-1">{news.title}</h3>
                  <p className="text-[11px] text-white/30 line-clamp-2">{news.summary}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-white/20">{news.source}</span>
                    <span className="text-[10px] text-white/20 flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{news.time}</span>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2 flex-shrink-0 mt-1">
                  <button
                    onClick={(e) => toggleBookmark(news.id, e)}
                    className="p-1 rounded-md hover:bg-white/[0.06] transition-colors"
                    title={bookmarks.has(news.id) ? "Bỏ lưu" : "Lưu tin"}
                  >
                    {bookmarks.has(news.id)
                      ? <BookmarkCheck className="w-4 h-4 text-[#E6B84F]" />
                      : <Bookmark className="w-4 h-4 text-white/15 hover:text-white/40" />
                    }
                  </button>
                  <ExternalLink className="w-3.5 h-3.5 text-white/10 group-hover:text-[#E6B84F] transition-colors" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </motion.div>
  );
}
