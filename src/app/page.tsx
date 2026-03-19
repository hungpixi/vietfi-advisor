"use client";

import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import {
  Brain,
  TrendingUp,
  Shield,
  BarChart3,
  Newspaper,
  Target,
  Zap,
  ArrowRight,
  ChevronDown,
  Globe,
  LineChart,
  PieChart,
  Activity,
  AlertTriangle,
  Sparkles,
  Clock,
  Compass,
  Users,
  Database,
  Lock,
  Flame,
  Sun,
  CalendarDays,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ═══════════════════ F&G GAUGE ═══════════════════ */
function FearGreedGauge({ score = 28 }: { score?: number }) {
  const [displayScore, setDisplayScore] = useState(0);
  const label =
    score <= 20
      ? "Cực kỳ sợ hãi"
      : score <= 40
        ? "Sợ hãi"
        : score <= 60
          ? "Trung lập"
          : score <= 80
            ? "Tham lam"
            : "Cực kỳ tham lam";
  const color =
    score <= 20
      ? "#FF1744"
      : score <= 40
        ? "#FF5252"
        : score <= 60
          ? "#FFD700"
          : score <= 80
            ? "#00E676"
            : "#00C853";

  useEffect(() => {
    let frame: number;
    const duration = 2000;
    const start = performance.now();
    const step = (now: number) => {
      const prog = Math.min((now - start) / duration, 1);
      setDisplayScore(Math.round(prog * score));
      if (prog < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const angle = -90 + (score / 100) * 180;

  return (
    <div className="relative w-64 h-36 mx-auto">
      {/* Gauge arc */}
      <svg viewBox="0 0 200 110" className="w-full h-full">
        <defs>
          <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FF1744" />
            <stop offset="25%" stopColor="#FF5252" />
            <stop offset="50%" stopColor="#FFD700" />
            <stop offset="75%" stopColor="#00E676" />
            <stop offset="100%" stopColor="#00C853" />
          </linearGradient>
        </defs>
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.3"
        />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * 251} 251`}
        />
        {/* Needle */}
        <line
          x1="100"
          y1="100"
          x2={100 + 60 * Math.cos((angle * Math.PI) / 180)}
          y2={100 + 60 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx="100" cy="100" r="5" fill={color} />
      </svg>
      {/* Score */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
        <div className="text-4xl font-black" style={{ color }}>
          {displayScore}
        </div>
        <div className="text-sm font-medium" style={{ color }}>
          {label}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ HERO ═══════════════════ */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00E5FF]/5 rounded-full blur-[150px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#FF5252]/3 rounded-full blur-[200px]" />
      </div>

      <div className="relative z-10 text-center px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/5 mb-8">
            <Sparkles className="w-4 h-4 text-[#FFD700]" />
            <span className="text-sm text-[#FFD700] font-medium">
              🇻🇳 Chỉ số F&G Index đầu tiên cho thị trường Việt Nam
            </span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black mb-4 leading-[0.95] tracking-tight">
            <span className="text-white">Hôm nay</span>
            <br />
            <span className="text-gradient">nên làm gì?</span>
          </h1>

          <p className="text-lg md:text-xl text-[#8888AA] mb-6 max-w-2xl mx-auto leading-relaxed">
            VietFi Advisor — Cố vấn tài chính AI giúp bạn biết{" "}
            <strong className="text-white">hôm nay nên thận trọng hay mạnh dạn</strong>,
            và{" "}
            <strong className="text-white">chiến lược dài hạn</strong> phù hợp với profile tài chính của bạn.
          </p>

          {/* F&G Gauge Demo */}
          <motion.div
            className="glass-card p-6 max-w-sm mx-auto mb-8"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-[#FF5252]" />
              <span className="text-xs text-[#8888AA] uppercase tracking-wider font-medium">
                Fear & Greed Index VN — Live Demo
              </span>
            </div>
            <FearGreedGauge score={28} />
            <p className="text-xs text-[#666680] mt-3">
              17/03/2026 — Thị trường đang sợ hãi. Cơ hội cho nhà đầu tư dài hạn?
            </p>
          </motion.div>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="group inline-flex items-center gap-2 px-10 py-4 bg-gradient-primary text-black font-bold rounded-xl hover:shadow-[0_0_40px_rgba(255,215,0,0.3)] transition-all duration-300 text-lg"
            >
              Xem Dashboard
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a
              href="#two-pillars"
              className="inline-flex items-center gap-2 px-8 py-4 border border-[#2A2A3A] rounded-xl text-[#8888AA] hover:border-[#FFD700]/30 hover:text-white transition-all duration-300"
            >
              2 trụ cột VietFi
              <ChevronDown className="w-5 h-5" />
            </a>
          </div>
        </motion.div>

        {/* Social proof stats */}
        <motion.div
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
        >
          {[
            { icon: Database, label: "Data sources verified", value: "3+" },
            { icon: Brain, label: "AI NLP Sentiment", value: "Gemini" },
            { icon: BarChart3, label: "Mã chứng khoán", value: "1,545" },
            { icon: Globe, label: "Chi phí vận hành", value: "$0" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              variants={fadeInUp}
              className="glass-card p-4 text-center"
            >
              <stat.icon className="w-5 h-5 text-[#FFD700] mx-auto mb-2" />
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-xs text-[#8888AA]">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ TWO PILLARS ═══════════════════ */
function TwoPillars() {
  const pillars = [
    {
      emoji: "🔴",
      title: "Daily Pulse",
      question: '"Hôm nay nên làm gì?"',
      features: [
        { icon: Activity, name: "Fear & Greed Index VN", desc: "1 con số — biết ngay tâm lý thị trường" },
        { icon: Sun, name: "Morning Brief AI", desc: "Tóm tắt tin tài chính mỗi sáng bằng tiếng Việt" },
        { icon: Newspaper, name: "AI News Curation", desc: "Tin tức phân loại theo sentiment: tích cực / tiêu cực" },
        { icon: Globe, name: "Macro Map", desc: "GDP, CPI, lãi suất, tỷ giá — 1 dashboard" },
      ],
      gradient: "from-[#FF5252]/10 to-[#FFD700]/5",
      borderColor: "#FF5252",
      frequency: "Mỗi ngày",
    },
    {
      emoji: "🔵",
      title: "Long-term Compass",
      question: '"Chiến lược dài hạn của tôi?"',
      features: [
        { icon: Target, name: "Risk DNA Profile", desc: "5 câu hỏi → biết bạn thuộc loại nhà đầu tư nào" },
        { icon: PieChart, name: "Portfolio Advisor", desc: "AI gợi ý phân bổ vốn theo profile rủi ro" },
        { icon: LineChart, name: "Personal CPI", desc: "Lạm phát CÁ NHÂN — con số thật ảnh hưởng đến BẠN" },
        { icon: Shield, name: "Debt Dashboard", desc: "Tổng hợp nợ + so sánh Snowball vs Avalanche" },
      ],
      gradient: "from-[#00E5FF]/10 to-[#AB47BC]/5",
      borderColor: "#00E5FF",
      frequency: "Thiết lập 1 lần",
    },
  ];

  return (
    <section id="two-pillars" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <p className="text-sm text-[#FFD700] mb-2 tracking-wider uppercase font-medium">
            Triết lý sản phẩm
          </p>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            <span className="text-gradient">2 Trụ Cột</span>{" "}
            <span className="text-white">— 2 Câu Hỏi</span>
          </h2>
          <p className="text-[#8888AA] max-w-2xl mx-auto text-lg">
            Mọi quyết định tài chính đều bắt đầu từ 2 câu hỏi.
            VietFi thiết kế quanh 2 trải nghiệm cốt lõi.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {pillars.map((pillar) => (
            <motion.div
              key={pillar.title}
              variants={fadeInUp}
              className="glass-card p-8 relative overflow-hidden"
              style={{ borderColor: `${pillar.borderColor}30` }}
            >
              {/* Background gradient */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${pillar.gradient} pointer-events-none`}
              />

              <div className="relative z-10">
                {/* Header */}
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{pillar.emoji}</span>
                  <h3 className="text-2xl font-black text-white">
                    {pillar.title}
                  </h3>
                </div>
                <p
                  className="text-lg font-medium mb-1"
                  style={{ color: pillar.borderColor }}
                >
                  {pillar.question}
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#2A2A3A] text-xs text-[#8888AA] mb-6">
                  <Clock className="w-3 h-3" />
                  {pillar.frequency}
                </div>

                {/* Features */}
                <div className="space-y-4">
                  {pillar.features.map((f) => (
                    <div key={f.name} className="flex items-start gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          backgroundColor: `${pillar.borderColor}15`,
                        }}
                      >
                        <f.icon
                          className="w-4 h-4"
                          style={{ color: pillar.borderColor }}
                        />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-sm">
                          {f.name}
                        </div>
                        <div className="text-xs text-[#8888AA]">{f.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ DATA SOURCES ═══════════════════ */
function DataSources() {
  const sources = [
    { name: "vnstock v3.5", desc: "1,545 mã CK + VN-Index", status: "✅ Tested", color: "#00E676" },
    { name: "VnExpress RSS", desc: "Tin tài chính real-time", status: "✅ Free", color: "#FFD700" },
    { name: "World Bank API", desc: "GDP, CPI, FDI Vietnam", status: "✅ No auth", color: "#00E5FF" },
    { name: "Gemini 2.0 Flash", desc: "NLP Sentiment tiếng Việt", status: "✅ 1500 req/day", color: "#AB47BC" },
    { name: "Supabase", desc: "PostgreSQL + Auth + RLS", status: "✅ Free tier", color: "#3ECF8E" },
    { name: "Vercel Edge", desc: "CDN global, auto-deploy", status: "✅ Hobby", color: "#8888AA" },
  ];

  return (
    <section className="py-20 px-4 bg-[#08080C]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <p className="text-sm text-[#00E5FF] mb-2 tracking-wider uppercase font-medium">
            Tech Stack đã kiểm chứng
          </p>
          <h2 className="text-3xl md:text-4xl font-black mb-3">
            <span className="text-white">100% Free</span>
            <span className="text-[#8888AA]"> — Tất cả đã tested</span>
          </h2>
          <p className="text-[#666680]">
            Mỗi data source đều đã được verify với API call thực tế. Tổng chi phí vận hành: $0/tháng.
          </p>
        </motion.div>

        <motion.div
          className="grid grid-cols-2 md:grid-cols-3 gap-4"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {sources.map((s) => (
            <motion.div
              key={s.name}
              variants={fadeInUp}
              className="glass-card p-5 group hover:border-[#FFD700]/20 transition-all"
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-bold text-white text-sm">{s.name}</span>
              </div>
              <p className="text-xs text-[#8888AA] mb-2">{s.desc}</p>
              <span
                className="text-xs font-medium"
                style={{ color: s.color }}
              >
                {s.status}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ MOAT ═══════════════════ */
function MoatSection() {
  const moats = [
    {
      icon: Flame,
      title: "Brand Moat",
      subtitle: "F&G Index VN = VietFi",
      desc: "Chỉ số tâm lý thị trường đầu tiên cho Việt Nam. Giống CNN Fear & Greed — khi đã trở thành chuẩn, không ai copy nổi.",
      color: "#FF5252",
    },
    {
      icon: Database,
      title: "Data Moat",
      subtitle: "Dataset behavioral finance lớn nhất VN",
      desc: "Risk DNA + chi tiêu + preferences của hàng trăm nghìn user → AI càng chính xác → càng nhiều user (flywheel).",
      color: "#00E5FF",
    },
    {
      icon: Clock,
      title: "Habit Moat",
      subtitle: "Morning Brief mỗi sáng",
      desc: "User mở VietFi TRƯỚC KHI mở app chứng khoán. Habit loop → switching cost cao.",
      color: "#FFD700",
    },
    {
      icon: Lock,
      title: "IP Moat",
      subtitle: "Thuật toán F&G + Personal CPI",
      desc: "5 indicators Việt hóa + trọng số riêng. Càng chạy lâu → data lịch sử càng dài → càng đáng tin.",
      color: "#AB47BC",
    },
  ];

  return (
    <section className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <p className="text-sm text-[#AB47BC] mb-2 tracking-wider uppercase font-medium">
            Competitive Advantage
          </p>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            <span className="text-white">4 tầng</span>{" "}
            <span className="text-gradient">MOAT</span>
          </h2>
          <p className="text-[#8888AA] max-w-2xl mx-auto">
            &quot;Một startup tốt phải có monopoly&quot; — Peter Thiel, Zero to One.
            Đây là lý do VietFi khó bị copy.
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-6"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {moats.map((m, i) => (
            <motion.div
              key={m.title}
              variants={fadeInUp}
              className="glass-card glass-card-hover p-8 relative overflow-hidden group"
            >
              <div className="absolute top-4 right-4 text-7xl font-black text-white/[0.02] group-hover:text-white/[0.04] transition-colors">
                {i + 1}
              </div>
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: `${m.color}15` }}
              >
                <m.icon className="w-6 h-6" style={{ color: m.color }} />
              </div>
              <h3 className="text-xl font-bold text-white mb-1">{m.title}</h3>
              <p className="text-sm font-medium mb-3" style={{ color: m.color }}>
                {m.subtitle}
              </p>
              <p className="text-[#8888AA] text-sm leading-relaxed">{m.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ USER PERSONA ═══════════════════ */
function UserPersona() {
  return (
    <section className="py-20 px-4 bg-[#08080C]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          className="text-center mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl md:text-4xl font-black mb-4">
            <span className="text-white">Ai cần</span>{" "}
            <span className="text-gradient">VietFi?</span>
          </h2>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 gap-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {/* Persona 1 */}
          <motion.div variants={fadeInUp} className="glass-card p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#FF5252]/10 flex items-center justify-center text-xl">
                👩‍💼
              </div>
              <div>
                <h3 className="font-bold text-white">Linh, 24 tuổi</h3>
                <p className="text-xs text-[#8888AA]">Nhân viên văn phòng • Lương 12tr/tháng</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="text-sm text-[#8888AA]">• Vừa mở TK chứng khoán, nạp 5tr, chưa biết mua gì</div>
              <div className="text-sm text-[#8888AA]">• Scroll F319, TikTok thấy bạn &quot;khoe lãi&quot; → FOMO</div>
              <div className="text-sm text-[#8888AA]">• SPayLater 3tr + thẻ tín dụng dư 5tr = không biết tổng nợ</div>
            </div>
            <div className="glass-card p-3 border-[#FF5252]/20 bg-[#FF5252]/5">
              <p className="text-sm text-[#FF5252] italic">
                &quot;Tôi biết phải đầu tư nhưng sợ mất tiền, và không biết tổng nợ mình bao nhiêu.&quot;
              </p>
            </div>
          </motion.div>

          {/* Persona 2 */}
          <motion.div variants={fadeInUp} className="glass-card p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-[#00E5FF]/10 flex items-center justify-center text-xl">
                👨‍🎓
              </div>
              <div>
                <h3 className="font-bold text-white">Minh, 22 tuổi</h3>
                <p className="text-xs text-[#8888AA]">Sinh viên năm cuối • Thu nhập 5tr/tháng</p>
              </div>
            </div>
            <div className="space-y-2 mb-4">
              <div className="text-sm text-[#8888AA]">• Chi 60% cho ăn + nhà trọ, &quot;tiền mất đi đâu hết&quot;</div>
              <div className="text-sm text-[#8888AA]">• Muốn tiết kiệm nhưng lãi suất 5% &quot;chẳng thấm tháp&quot;</div>
              <div className="text-sm text-[#8888AA]">• Mọi thứ đắt lên nhưng lương không tăng</div>
            </div>
            <div className="glass-card p-3 border-[#00E5FF]/20 bg-[#00E5FF]/5">
              <p className="text-sm text-[#00E5FF] italic">
                &quot;Gửi tiết kiệm 5% mà lạm phát 6.8% — thực ra đang MẤT TIỀN mà không biết.&quot;
              </p>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ CTA ═══════════════════ */
function FinalCTA() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeInUp}
        >
          <h2 className="text-3xl md:text-5xl font-black mb-6">
            <span className="text-white">Bắt đầu kiểm soát</span>
            <br />
            <span className="text-gradient">tài chính của bạn</span>
          </h2>
          <p className="text-[#8888AA] mb-8 text-lg">
            Miễn phí. Không cần thẻ tín dụng. Chỉ cần 30 giây.
          </p>
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-3 px-12 py-5 bg-gradient-primary text-black font-bold rounded-2xl text-xl hover:shadow-[0_0_60px_rgba(255,215,0,0.3)] transition-all duration-300"
          >
            Khám phá Dashboard
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ RISK WARNING ═══════════════════ */
function RiskWarning() {
  return (
    <section className="py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="glass-card p-6 border-[#FF5252]/20">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-[#FF5252] flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-[#FF5252] mb-1">Cảnh báo rủi ro</h3>
              <p className="text-[#8888AA] text-xs leading-relaxed">
                VietFi Advisor cung cấp thông tin tham khảo, không phải lời khuyên đầu tư chuyên nghiệp.
                Mọi quyết định đầu tư đều có rủi ro. Hiệu suất quá khứ không đảm bảo kết quả tương lai.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ FOOTER ═══════════════════ */
function Footer() {
  return (
    <footer className="border-t border-[#2A2A3A] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-black" />
            </div>
            <span className="text-lg font-bold">
              <span className="text-gradient">VietFi</span> Advisor
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-[#8888AA]">
            <span>WDA 2026</span>
            <span>•</span>
            <a
              href="https://comarai.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#FFD700] transition-colors"
            >
              by Comarai
            </a>
          </div>
          <p className="text-xs text-[#666680]">
            © 2026 VietFi Advisor. Made with ♥ in Vietnam.
          </p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════ NAVBAR ═══════════════════ */
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-black" />
          </div>
          <span className="text-lg font-bold">
            <span className="text-gradient">VietFi</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#two-pillars" className="text-sm text-[#8888AA] hover:text-white transition-colors">
            2 Trụ Cột
          </a>
          <a href="#how-it-works" className="text-sm text-[#8888AA] hover:text-white transition-colors">
            Tech Stack
          </a>
          <Link href="/dashboard" className="text-sm text-[#8888AA] hover:text-white transition-colors">
            Dashboard
          </Link>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2 text-sm bg-gradient-primary text-black font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all"
        >
          Bắt đầu
        </Link>
      </div>
    </nav>
  );
}

/* ═══════════════════ PAGE ═══════════════════ */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TwoPillars />
        <UserPersona />
        <DataSources />
        <MoatSection />
        <FinalCTA />
        <RiskWarning />
      </main>
      <Footer />
    </>
  );
}
