"use client";

import {
  motion,
  useScroll,
  useTransform,
  useInView,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  AlertTriangle,
  TrendingUp,
  Brain,
  PiggyBank,
  LineChart,
  Zap,
  Shield,
  Users,
  Star,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import Image from "next/image";

/* ═══════════════════════════════════════════════════════════════════
   DESIGN TOKENS
   Typography: Inter (body) + Space Grotesk (headings) + JetBrains Mono (mono/stats)
   Color: Deep space dark + Gold primary (#FFD700) + Cyan accent (#00E5FF)
═══════════════════════════════════════════════════════════════════ */

/* ─── 3D Tilt Hook ─── */
function useTilt<T extends HTMLElement>(maxRotate = 14) {
  const ref = useRef<T>(null);
  const rotateX = useMotionValue(0);
  const rotateY = useMotionValue(0);
  const springX = useSpring(rotateX, { stiffness: 180, damping: 28 });
  const springY = useSpring(rotateY, { stiffness: 180, damping: 28 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      rotateY.set(dx * maxRotate);
      rotateX.set(-dy * maxRotate);
    };
    const onLeave = () => {
      rotateX.set(0);
      rotateY.set(0);
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [maxRotate, rotateX, rotateY]);

  return { ref, rotateX: springX, rotateY: springY };
}

/* ─── Tilt Card Wrapper ─── */
function TiltCard({
  children,
  className = "",
  maxRotate = 12,
}: {
  children: React.ReactNode;
  className?: string;
  maxRotate?: number;
}) {
  const { ref, rotateX, rotateY } = useTilt<HTMLDivElement>(maxRotate);
  return (
    <motion.div
      ref={ref}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ─── Shared Animation Variants ─── */
const EASE_SMOOTH = [0.25, 0.46, 0.45, 0.94] as const;
const EASE_SPRING = [0.34, 1.56, 0.64, 1] as const;

const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: EASE_SMOOTH },
  }),
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: EASE_SMOOTH },
  }),
};

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.7, delay: i * 0.12, ease: EASE_SMOOTH },
  }),
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: (i = 0) => ({
    opacity: 1,
    scale: 1,
    transition: { duration: 0.6, delay: i * 0.08, ease: EASE_SPRING },
  }),
};

/* ─── Counter Animation ─── */
function AnimatedCounter({
  target,
  suffix = "",
  duration = 2,
}: {
  target: number;
  suffix?: string;
  duration?: number;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = target / (duration * 60);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target, duration]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ─── Word-by-word stagger ─── */
function WordReveal({
  text,
  className = "",
}: {
  text: string;
  className?: string;
}) {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.3em]"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{
            duration: 0.5,
            delay: i * 0.06,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}>
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* ─── Gradient Text ─── */
function GradientText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`text-gradient ${className}`}>{children}</span>;
}

/* ═══════════════════ NAVBAR ═══════════════════ */
function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#0A0A0F]/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-[0_4px_40px_rgba(0,0,0,0.5)]"
          : "bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/[0.04]"
      }`}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="relative w-10 h-10">
            <Image
              src="/assets/icon.png"
              alt="VietFi"
              fill
              className="object-contain"
            />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-black tracking-tight">
              <GradientText>VietFi</GradientText>
            </span>
            <span className="text-sm font-medium text-white/30 hidden sm:inline">
              Advisor
            </span>
          </div>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { href: "#features", label: "Tính năng" },
            { href: "#how", label: "3 Bước" },
            { href: "#vet", label: "Vẹt Vàng 🦜" },
            { href: "#stats", label: "Số liệu" },
            { href: "#faq", label: "FAQ" },
          ].map((item) => (
            <motion.a
              key={item.href}
              href={item.href}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-4 py-2 text-sm text-white/50 hover:text-white transition-colors duration-200 rounded-lg hover:bg-white/[0.04]">
              {item.label}
            </motion.a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{
              scale: 1.04,
              boxShadow: "0 0 40px rgba(255,215,0,0.25)",
            }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}>
            <Link
              href="/dashboard"
              className="hidden sm:inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#FFD700] to-[#FFB300] text-black font-bold text-sm rounded-xl shadow-[0_0_20px_rgba(255,215,0,0.15)]">
              Bắt đầu miễn phí
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-white/[0.05] border border-white/[0.08]"
            onClick={() => setMobileOpen(!mobileOpen)}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-5 h-0.5 bg-white/60 rounded transition-all ${mobileOpen ? "rotate-45 translate-y-2" : ""}`}
              />
            ))}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={{
          height: mobileOpen ? "auto" : 0,
          opacity: mobileOpen ? 1 : 0,
        }}
        className="md:hidden overflow-hidden bg-[#0A0A0F]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="px-6 py-4 space-y-1">
          {["#features", "#how", "#vet", "#stats", "#faq"].map((href) => (
            <a
              key={href}
              href={href}
              className="block px-4 py-3 text-sm text-white/60 hover:text-white hover:bg-white/[0.04] rounded-lg transition-all"
              onClick={() => setMobileOpen(false)}>
              {href.replace("#", "")}
            </a>
          ))}
          <Link
            href="/dashboard"
            className="block px-4 py-3 text-sm font-bold text-black bg-gradient-to-r from-[#FFD700] to-[#FFB300] rounded-xl text-center mt-2">
            Bắt đầu miễn phí
          </Link>
        </div>
      </motion.div>
    </nav>
  );
}

/* ═══════════════════ TRUST BAR ═══════════════════ */
/* Inspired by Wealthsimple: social proof before Hero content */
function TrustBar() {
  const trustItems = [
    { value: "3 bước", label: "triết lý tài chính" },
    { value: "100%", label: "miễn phí mãi mãi" },
    { value: "8+", label: "nguồn dữ liệu thực" },
    { value: "🦜 Vẹt Vàng", label: "AI cố vấn 24/7" },
  ];

  return (
    <div className="bg-[#0D0D14]/55 backdrop-blur-[2px] border-b border-white/[0.05]">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex items-center justify-center gap-6 md:gap-12 flex-wrap">
          {trustItems.map((item, i) => (
            <motion.div
              key={item.value}
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="flex items-center gap-2">
              <span className="text-sm font-bold text-[#FFD700]">
                {item.value}
              </span>
              <span className="text-xs text-white/30 hidden sm:inline">
                {item.label}
              </span>
              {i < trustItems.length - 1 && (
                <div className="hidden md:block w-px h-4 bg-white/[0.08] ml-4" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ HERO ═══════════════════ */
function Hero() {
  const containerRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [0, 80]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={containerRef}
      className="relative min-h-screen flex items-center overflow-hidden pt-20 pb-16">
      {/* Subtle ambient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,#FFD700_0%,transparent_65%)] opacity-[0.04]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,#00E5FF_0%,transparent_70%)] opacity-[0.03]" />
      </div>

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 max-w-6xl mx-auto px-4 w-full">
        {/* 2-col layout */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div>
            {/* Headline — Wealthsimple style: clean, no word-by-word blur */}
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-5xl md:text-6xl font-black mb-6 leading-[1.18] md:leading-[1.14] tracking-tight"
            >
              <span className="text-white">Tự do tài chính</span>
              <br />
              <span className="text-white/80">bắt đầu từ</span>
              <br />
              <GradientText>kiểm soát thật.</GradientText>
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.15,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="text-lg text-white/45 mb-10 max-w-md leading-[1.7]">
              76% người Việt không biết tiền đi đâu mỗi tháng. VietFi tạo lộ
              trình rõ ràng, ưu tiên trả nợ, và tiết kiệm thông minh — không hoa
              mĩ.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.25,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="flex flex-wrap items-center gap-4 mb-12">
              <motion.div
                whileHover={{
                  scale: 1.04,
                  boxShadow: "0 0 60px rgba(255,215,0,0.25)",
                }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-[#FFD700] to-[#FFB300] text-black font-bold rounded-2xl text-base shadow-[0_0_30px_rgba(255,215,0,0.2)]">
                  Bắt đầu miễn phí
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </motion.div>

              <motion.a
                href="#features"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="inline-flex items-center gap-2.5 px-6 py-4 border border-white/[0.08] rounded-2xl text-white/50 hover:text-white hover:border-white/[0.15] transition-all duration-200">
                Xem cách hoạt động
                <ChevronDown className="w-4 h-4" />
              </motion.a>
            </motion.div>

            {/* Social proof — Wealthsimple trust row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex items-center gap-6">
              {[
                { num: "6", label: "AI Agents" },
                { num: "8+", label: "Nguồn dữ liệu" },
                { num: "100%", label: "Miễn phí mãi" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2">
                  <div className="text-lg font-black text-white font-mono">
                    {s.num}
                  </div>
                  <div className="text-[11px] text-white/30 leading-tight">
                    {s.label}
                  </div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: Dashboard mockup + Mascot */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: 0.3,
              duration: 0.8,
              ease: [0.25, 0.46, 0.45, 0.94],
            }}
            className="relative hidden lg:block">
            {/* Dashboard UI mockup — clean glass card */}
            <TiltCard
              className="relative z-10 glass-card p-5 rounded-2xl border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.4)]"
              maxRotate={10}>
              {/* Mockup header */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-white/30 mb-0.5">
                    Tổng tài sản
                  </div>
                  <div className="text-2xl font-black text-white font-mono">
                    ₫47,250,000
                  </div>
                  <div className="text-xs text-[#22C55E]">
                    ▲ +1.25% tháng này
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FFD700] to-[#FFB300] flex items-center justify-center text-lg">
                  🦜
                </div>
              </div>

              {/* Mockup chart bars */}
              <div className="flex items-end gap-1.5 h-20 mb-4">
                {[40, 55, 45, 65, 58, 72, 68, 80, 75, 88, 82, 95].map(
                  (h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t-sm transition-all"
                      style={{
                        height: `${h}%`,
                        background:
                          i === 11 ? "#FFD700" : "rgba(255,255,255,0.06)",
                      }}
                    />
                  ),
                )}
              </div>

              {/* Mockup pots */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Chi tiêu", val: "12.4M", color: "#22C55E" },
                  { label: "Tiết kiệm", val: "8.0M", color: "#00E5FF" },
                  { label: "Đầu tư", val: "26.8M", color: "#FFD700" },
                ].map((pot) => (
                  <div
                    key={pot.label}
                    className="bg-white/[0.03] rounded-xl p-2.5 border border-white/[0.04]">
                    <div className="text-[10px] text-white/30 mb-0.5">
                      {pot.label}
                    </div>
                    <div
                      className="text-sm font-bold font-mono"
                      style={{ color: pot.color }}>
                      {pot.val}
                    </div>
                  </div>
                ))}
              </div>
            </TiltCard>

            {/* Vẹt Vàng mascot — bottom right, smaller */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                repeat: Infinity,
                duration: 3.5,
                ease: "easeInOut",
              }}
              className="absolute -bottom-4 -right-8 w-36 z-20">
              <Image
                src="/assets/mascot.png"
                alt="Vẹt Vàng"
                width={144}
                height={176}
                className="object-contain drop-shadow-[0_10px_30px_rgba(255,215,0,0.2)]"
              />
            </motion.div>

            {/* Floating badge */}
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: 0.5 }}
              className="absolute -top-3 -left-3 glass-card px-3 py-2 z-20">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-xs font-bold text-white">
                  VN-Index +1.25%
                </span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════ FEATURES ═══════════════════ */
/* Wealthsimple style: 1 product visual + 3 clear feature pillars */
function Features() {
  const pillars = [
    {
      num: "01",
      icon: <PiggyBank className="w-7 h-7" />,
      color: "#22C55E",
      title: "Quản lý Chi tiêu",
      desc: "Chia thu nhập vào 6 quỹ rõ ràng. Ghi chi tiêu hàng ngày, theo dõi sát sao từng đồng.",
      detail: "Biết ngay khoản nào cạn, khoản nào dư. Không cần spreadsheet.",
    },
    {
      num: "02",
      icon: <Shield className="w-7 h-7" />,
      color: "#EF4444",
      title: "Thoát bẫy Nợ",
      desc: "Hợp nhất nợ, tính lãi ẩn, chọn lộ trình Snowball hoặc Avalanche phù hợp.",
      detail: "DTI Gauge + timeline trả nợ cụ thể theo tháng.",
    },
    {
      num: "03",
      icon: <LineChart className="w-7 h-7" />,
      color: "#00E5FF",
      title: "Đầu tư Thông minh",
      desc: "Risk profile quiz → danh mục phù hợp. Nhiệt kế thị trường VN, vàng SJC, CPI cá nhân.",
      detail: "Không phải lời khuyên. Chỉ dữ liệu + gợi ý cá nhân hóa.",
    },
  ];

  return (
    <section id="features" className="py-28 px-6 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-[radial-gradient(ellipse,#FFD700_0%,transparent_70%)] opacity-[0.03] pointer-events-none" />

      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/5 text-[#FFD700] text-xs font-medium tracking-wider uppercase mb-6">
            <Zap className="w-3 h-3" />
            TÍNH NĂNG CỐT LÕI
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-5 leading-tight">
            Mọi thứ bạn cần.
            <br />
            <GradientText>Không thừa gì.</GradientText>
          </h2>
          <p className="text-white/40 text-base md:text-lg max-w-lg mx-auto leading-relaxed">
            3 bước triết lý tài chính rõ ràng. Không phức tạp, không phí.
          </p>
        </motion.div>

        {/* 2-col: mockup left, pillars right */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-12 items-start">
          {/* Left: App mockup */}
          <TiltCard maxRotate={10} className="relative">
            {/* Main dashboard card */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}>
              <div className="glass-card rounded-2xl p-6 border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-xs text-white/30 mb-1">
                      Tháng 4, 2026
                    </div>
                    <div className="text-3xl font-black text-white font-mono">
                      ₫47,250,000
                    </div>
                    <div className="text-sm text-[#22C55E]">▲ +1.25%</div>
                  </div>
                  <div className="flex gap-2">
                    {["🟢 Chi", "🔴 Nợ", "🔵 Đầu tư"].map((label) => (
                      <div
                        key={label}
                        className="text-[10px] px-2 py-1 rounded-full bg-white/[0.04] text-white/30">
                        {label}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chart area */}
                <div className="mb-5">
                  <div className="text-xs text-white/30 mb-3">
                    Dòng tiền 12 tháng
                  </div>
                  <div className="flex items-end gap-1 h-24">
                    {[35, 50, 42, 60, 55, 70, 65, 78, 72, 85, 80, 92].map(
                      (h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm"
                          style={{
                            height: `${h}%`,
                            background:
                              i === 11 ? "#FFD700" : "rgba(255,255,255,0.06)",
                          }}
                        />
                      ),
                    )}
                  </div>
                </div>

                {/* Pots */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    {
                      label: "Chi tiêu",
                      val: "12.4M",
                      color: "#22C55E",
                      spent: "8.2M",
                      pct: 66,
                    },
                    {
                      label: "Tiết kiệm",
                      val: "8.0M",
                      color: "#00E5FF",
                      spent: "2.0M",
                      pct: 25,
                    },
                    {
                      label: "Đầu tư",
                      val: "26.8M",
                      color: "#FFD700",
                      spent: "0M",
                      pct: 0,
                    },
                  ].map((pot) => (
                    <div
                      key={pot.label}
                      className="bg-white/[0.03] rounded-xl p-3 border border-white/[0.04]">
                      <div className="text-[10px] text-white/30 mb-1">
                        {pot.label}
                      </div>
                      <div
                        className="text-base font-black font-mono mb-1"
                        style={{ color: pot.color }}>
                        {pot.val}
                      </div>
                      <div className="text-[10px] text-white/30">
                        đã dùng {pot.pct}%
                      </div>
                      <div className="mt-1.5 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pot.pct}%`,
                            background: pot.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Overlay: DTI card */}
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{
                repeat: Infinity,
                duration: 3.5,
                ease: "easeInOut",
              }}
              className="absolute -bottom-4 -right-6 glass-card px-4 py-3 z-20 border-[#EF4444]/15">
              <div className="text-[10px] text-white/30 mb-1">Chỉ số DTI</div>
              <div className="text-xl font-black text-[#EF4444] font-mono">
                38%
              </div>
              <div className="text-[10px] text-[#22C55E]">Khả năng tốt</div>
            </motion.div>

            {/* Overlay: streak */}
            <motion.div
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: Infinity, duration: 3, delay: 0.8 }}
              className="absolute -top-3 -left-4 glass-card px-3 py-2 z-20">
              <div className="flex items-center gap-2">
                <span className="text-base">🔥</span>
                <div>
                  <div className="text-xs text-white/50">Streak</div>
                  <div className="text-sm font-black text-[#FFD700] font-mono">
                    7 ngày
                  </div>
                </div>
              </div>
            </motion.div>
          </TiltCard>

          {/* Right: 3 pillars */}
          <div className="space-y-4 pt-4">
            {pillars.map((p, i) => (
              <TiltCard
                key={p.title}
                maxRotate={8}
                className="glass-card p-6 border-white/[0.06] hover:border-white/[0.12] transition-all duration-300 group cursor-default">
                <motion.div
                  initial={{ opacity: 0, x: 30 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{
                    duration: 0.6,
                    delay: i * 0.12,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}>
                  <div className="flex items-start gap-4">
                    {/* Number + Icon */}
                    <div className="flex-shrink-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center mb-2"
                        style={{
                          backgroundColor: `${p.color}15`,
                          color: p.color,
                        }}>
                        {p.icon}
                      </div>
                      <div className="text-xs font-mono text-white/15 font-bold text-center">
                        {p.num}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-white mb-1.5">
                        {p.title}
                      </h3>
                      <p className="text-sm text-white/45 mb-2 leading-relaxed">
                        {p.desc}
                      </p>
                      <p className="text-xs text-white/25 leading-relaxed">
                        {p.detail}
                      </p>
                    </div>
                  </div>

                  {/* Right arrow on hover */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="h-px flex-1 bg-white/[0.05]" />
                    <motion.div
                      initial={{ opacity: 0, x: -8 }}
                      whileHover={{ opacity: 1, x: 0 }}
                      className="ml-3 flex-shrink-0">
                      <ArrowRight
                        className="w-4 h-4"
                        style={{ color: p.color }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              </TiltCard>
            ))}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="pt-2">
              <Link
                href="/dashboard"
                className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-[#FFD700] to-[#FFB300] text-black font-bold rounded-xl text-sm hover:shadow-[0_0_40px_rgba(255,215,0,0.2)] transition-all">
                Dùng thử miễn phí — Không cần thẻ
                <ArrowRight className="w-4 h-4" />
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ HOW IT WORKS ═══════════════════ */
/* Wealthsimple style: horizontal 3-step with connecting line */
function HowItWorks() {
  const steps = [
    {
      num: "01",
      emoji: "💰",
      color: "#22C55E",
      title: "Quản lý Chi tiêu",
      desc: "Chia hũ ngân sách, ghi chi tiêu hàng ngày cùng Vẹt Vàng AI.",
      tools: ["6 quỹ", "CPI cá nhân", "Biểu đồ"],
    },
    {
      num: "02",
      emoji: "🏦",
      color: "#EF4444",
      title: "Thoát bẫy Nợ",
      desc: "Hợp nhất nợ, tính lãi ẩn, lộ trình Snowball hoặc Avalanche.",
      tools: ["DTI Gauge", "Timeline", "Lãi ẩn"],
    },
    {
      num: "03",
      emoji: "🚀",
      color: "#00E5FF",
      title: "Đầu tư Thông minh",
      desc: "Risk profile quiz, nhiệt kế thị trường, danh mục cá nhân hóa.",
      tools: ["VN-Index", "Risk Quiz", "AI Brief"],
    },
  ];

  return (
    <section
      id="how"
      className="py-28 px-6 bg-[#08080C]/55 relative overflow-hidden">
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7 }}
          className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/5 text-[#FFD700] text-xs font-medium tracking-wider uppercase mb-6">
            <Users className="w-3 h-3" />
            TRIẾT LÝ 3 BƯỚC
          </div>
          <h2 className="text-4xl md:text-5xl font-black mb-5">
            Không phức tạp.
            <br />
            <GradientText>Chỉ cần bắt đầu.</GradientText>
          </h2>
        </motion.div>

        {/* Horizontal 3-step */}
        <div className="relative">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-12 left-[16.67%] right-[16.67%] h-px bg-gradient-to-r from-[#22C55E] via-[#EF4444] to-[#00E5FF] opacity-20" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.num}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.15,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="glass-card p-7 text-center relative hover:border-white/[0.1] transition-all duration-300">
                {/* Step number */}
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black mx-auto mb-5 relative z-10"
                  style={{
                    backgroundColor: `${s.color}20`,
                    color: s.color,
                    border: `2px solid ${s.color}40`,
                  }}>
                  {s.emoji}
                </div>

                <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                <p className="text-sm text-white/45 mb-4 leading-relaxed">
                  {s.desc}
                </p>

                <div className="flex flex-wrap justify-center gap-1.5">
                  {s.tools.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2.5 py-1 rounded-full border border-white/[0.06] text-white/30 font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ STICKY CTA BAR ═══════════════════ */
function StickyCTABar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-80px 0px 0px 0px" },
    );
    const el = document.getElementById("features");
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: visible ? 0 : 100, opacity: visible ? 1 : 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-md">
      <div className="glass-card px-6 py-4 flex items-center justify-between gap-4 border-white/[0.1] shadow-[0_8px_40px_rgba(0,0,0,0.6)]">
        <div>
          <div className="text-sm font-bold text-white">Sẵn sàng bắt đầu?</div>
          <div className="text-xs text-white/30">Miễn phí — không cần thẻ</div>
        </div>
        <Link
          href="/dashboard"
          className="flex-shrink-0 px-5 py-2.5 bg-gradient-to-r from-[#FFD700] to-[#FFB300] text-black font-bold text-sm rounded-xl hover:shadow-[0_0_30px_rgba(255,215,0,0.2)] transition-all">
          Dùng ngay
        </Link>
      </div>
    </motion.div>
  );
}

/* ═══════════════════ VẸT VÀNG SHOWCASE ═══════════════════ */
function VetVangShowcase() {
  const modes = [
    {
      badge: "🔥 Mổ Mode",
      color: "#EF4444",
      bg: "from-[#EF4444]/10",
      border: "border-[#EF4444]/20",
      quote:
        '"3 ngày rồi mày biến đâu? Tao ngồi đây nhìn số dư tài khoản mày mà muốn khóc thay. Không phải khóc vì thương — khóc vì buồn cười 🦜"',
      trigger: "Khi chi vượt hũ, bỏ app ≥2 ngày, quên trả nợ",
    },
    {
      badge: "💛 Khen Mode",
      color: "#E6B84F",
      bg: "from-[#E6B84F]/10",
      border: "border-[#E6B84F]/20",
      quote:
        '"Ơ hôm nay mày ghi chi tiêu sớm thế? Tao tưởng mày chỉ siêng khi vào Shopee thôi chứ. Nể thiệt! +20 XP 🦜✨"',
      trigger: "Khi tiết kiệm đạt target, ghi đúng giờ, streak dài",
    },
    {
      badge: "🧠 Thâm Mode",
      color: "#A855F7",
      bg: "from-[#A855F7]/10",
      border: "border-[#A855F7]/20",
      quote:
        '"Mua đi mua đi, tao đâu có cấm. Tao chỉ thầm tính: ly trà sữa này = 3 ngày lãi tiết kiệm. Nhưng kệ, hạnh phúc quan trọng hơn mà... phải không? 🦜"',
      trigger: "Khi sắp vượt hũ, chi tiêu tăng dần",
    },
  ];

  const scenarios = [
    [
      "Mở app lần đầu:",
      '"Ồ có người mới à? Để tao đoán: lương về 3 ngày là sạch bách, đúng không? Yên tâm, tao sẽ mổ cho mày giàu 🦜"',
    ],
    [
      "Streak 7 ngày:",
      '"7 ngày liên tiếp! Lần cuối có ai chu đáo với tao vậy là... à chưa có bao giờ. Keep going! 🦜🔥"',
    ],
    [
      "Cuối tháng hết tiền:",
      '"Cuối tháng rồi, ví mày mỏng hơn tao. Mà tao là vẹt, tao mỏng là đúng rồi. Còn mày thì... 🦜"',
    ],
    [
      "Trả hết 1 khoản nợ:",
      '"Wait... trả hết nợ SPayLater rồi á?! Tao xin lỗi đã nghi ngờ mày. Mày xứng đáng tốt hơn 🦜🥹"',
    ],
  ];

  const levels = [
    {
      emoji: "🐣",
      name: "Vẹt Con",
      xp: "0 XP",
      desc: "Lông xơ xác, mới tập nói. Chỉ biết đếm tiền chứ chưa biết giữ.",
      unlock: "Ghi chi tiêu + chia hũ",
      color: "#9CA3AF",
    },
    {
      emoji: "🦜",
      name: "Vẹt Teen",
      xp: "500 XP",
      desc: "Mọc lông vàng, tập nói xéo. Quy đổi trà sữa ra ngày lãi tiết kiệm.",
      unlock: "Roast card + streak",
      color: "#FFD700",
    },
    {
      emoji: "🦜✨",
      name: "Vẹt Phố",
      xp: "2,000 XP",
      desc: "Lông vàng óng, đeo kính mát. Mổ đau nhưng khen ngọt.",
      unlock: "Market insight",
      color: "#FFB300",
    },
    {
      emoji: "👑",
      name: "Vẹt Nhà Giàu",
      xp: "5,000 XP",
      desc: 'Lông vàng kim, đeo chain vàng. "Tự do tài chính" trong mắt vẹt.',
      unlock: "Full analysis",
      color: "#F59E0B",
      final: true,
    },
  ];

  return (
    <section id="vet" className="py-28 px-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[radial-gradient(circle,#FFD700_0%,transparent_70%)] opacity-[0.04] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeInUp}
          className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/5 text-[#FFD700] text-xs font-medium tracking-wider uppercase mb-6">
            <Star className="w-3 h-3" />
            VẸT VÀNG AI 🦜
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-5">
            <WordReveal text="Cố vấn tài chính" className="text-white block" />
            <GradientText>xéo sắc nhất Việt Nam</GradientText>
          </h2>
          <p className="text-white/40 text-base max-w-xl mx-auto leading-relaxed">
            Lấy cảm hứng từ{" "}
            <strong className="text-white/60">Cleo Roast Mode</strong> +{" "}
            <strong className="text-white/60">Duolingo Owl</strong>. Giọng choe
            choé, hay than, guilt-tripping level max.
          </p>
        </motion.div>

        {/* Mode cards */}
        <div className="grid md:grid-cols-3 gap-5 mb-8">
          {modes.map((m, i) => (
            <motion.div
              key={m.badge}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                delay: i * 0.12,
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`glass-card p-6 border ${m.border} bg-gradient-to-b ${m.bg}`}>
              <div className="flex items-center justify-between mb-4">
                <span
                  className="text-xs font-bold px-3 py-1.5 rounded-full"
                  style={{ backgroundColor: `${m.color}18`, color: m.color }}>
                  {m.badge}
                </span>
              </div>
              <p className="text-sm text-white/60 italic leading-relaxed mb-4">
                "{m.quote.replace(/^"|"$/g, "")}"
              </p>
              <div className="flex items-start gap-2">
                <div className="w-1 h-1 rounded-full bg-white/20 mt-2 flex-shrink-0" />
                <span className="text-[11px] text-white/30 leading-relaxed">
                  {m.trigger}
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Scenarios */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="glass-card p-7 mb-12 border-[#FFD700]/10">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-lg">🎬</span>
            <span className="text-sm font-bold text-white">
              Vẹt nói gì khi...
            </span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {scenarios.map(([label, quote]) => (
              <div
                key={label}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="text-xs font-bold text-[#FFD700] mb-2">
                  {label}
                </div>
                <p className="text-sm text-white/45 leading-relaxed italic">
                  {quote}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Level system */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8">
          <h3 className="text-2xl font-bold text-white mb-2">
            Lộ trình trưởng thành cùng Vẹt
          </h3>
          <p className="text-sm text-white/35">
            Ghi chi tiêu mỗi ngày = "cho vẹt ăn" → tích XP → level up
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {levels.map((l, i) => (
            <motion.div
              key={l.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`glass-card p-5 text-center relative ${l.final ? "border-[#FFD700]/25 shadow-[0_0_30px_rgba(255,215,0,0.08)]" : ""}`}>
              {l.final && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 text-[10px] px-2.5 py-0.5 bg-[#FFD700] text-black font-bold rounded-full">
                  CAO NHẤT
                </div>
              )}
              <div className="text-4xl mb-3">{l.emoji}</div>
              <div className="text-sm font-bold text-white mb-0.5">
                {l.name}
              </div>
              <div
                className="text-xs font-mono mb-3"
                style={{ color: l.color }}>
                {l.xp}
              </div>
              <p className="text-[11px] text-white/35 mb-3 leading-relaxed">
                {l.desc}
              </p>
              <div className="text-[10px] text-white/25">{l.unlock}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ STATS / SOCIAL PROOF ═══════════════════ */
function Stats() {
  const stats = [
    {
      value: "76%",
      label: "Người Việt thiếu kiến thức tài chính",
      source: "S&P Global 2024",
    },
    {
      value: "67%",
      label: "Bối rối khi quản lý tài chính cá nhân",
      source: "Sun Life 2025",
    },
    {
      value: "57%",
      label: "Gen Z chọn an toàn thay vì tối ưu",
      source: "Goover.ai 2025",
    },
    {
      value: "100%",
      label: "Miễn phí — không giới hạn tính năng",
      source: "VietFi",
    },
  ];

  return (
    <section
      id="stats"
      className="py-20 px-6 bg-[#08080C]/55 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-[radial-gradient(ellipse,#FFD700_0%,transparent_70%)] opacity-[0.03]" />
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeInUp}
          className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/5 text-[#FFD700] text-xs font-medium tracking-wider uppercase mb-4">
            SỐ LIỆU THỰC
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-white">
            Vấn đề có thật. <GradientText>Giải pháp cũng có thật.</GradientText>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className="glass-card p-6 text-center">
              <div className="text-4xl md:text-5xl font-black font-mono text-[#FFD700] mb-3">
                {s.value}
              </div>
              <div className="text-sm text-white/55 leading-relaxed mb-3">
                {s.label}
              </div>
              <div className="text-[10px] text-white/20">{s.source}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ FAQ ═══════════════════ */
function FAQ() {
  const faqs = [
    {
      q: "VietFi có miễn phí không?",
      a: "Hoàn toàn miễn phí. Sử dụng Gemini API free tier (1.500 request/ngày), Supabase free tier, deploy trên Vercel — đủ cho 50.000+ người dùng.",
    },
    {
      q: "Nhiệt kế thị trường lấy dữ liệu từ đâu?",
      a: "5 chỉ báo Việt hóa: VN-Index Momentum, Khối ngoại ròng, Sentiment NLP (VnExpress), Breadth (HoSE), Spread TPCP vs tiết kiệm (NHNN). Cập nhật daily.",
    },
    {
      q: "Dữ liệu tài chính của tôi có an toàn không?",
      a: "Supabase PostgreSQL với Row Level Security — mỗi user chỉ thấy data của mình. Không chia sẻ data với bên thứ 3.",
    },
    {
      q: "VietFi có phải lời khuyên đầu tư không?",
      a: "Không. VietFi cung cấp phân tích và gợi ý dựa trên dữ liệu, KHÔNG phải lời khuyên đầu tư.",
    },
    {
      q: "Vẹt Vàng AI hoạt động như thế nào?",
      a: 'Mascot AI có 3 chế độ: Mổ (roast khi vượt hũ), Khen (hype khi tiết kiệm tốt), Thâm (passive-aggressive khi sắp vượt). Ghi chi tiêu = "cho vẹt ăn" → tích XP → level up.',
    },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-28 px-6 relative">
      <div className="max-w-3xl mx-auto relative z-10">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeInUp}
          className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/5 text-[#FFD700] text-xs font-medium tracking-wider uppercase mb-4">
            FAQ
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white">
            Giải đáp <GradientText>thắc mắc</GradientText>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ delay: i * 0.07, duration: 0.5 }}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full glass-card p-5 text-left flex items-center justify-between hover:border-[#FFD700]/15 transition-all duration-200 group">
                <span className="text-sm font-semibold text-white group-hover:text-[#FFD700] transition-colors pr-4">
                  {f.q}
                </span>
                <motion.div
                  animate={{ rotate: openIdx === i ? 180 : 0 }}
                  transition={{ duration: 0.3 }}>
                  <ChevronDown className="w-4 h-4 text-white/30 flex-shrink-0" />
                </motion.div>
              </button>

              <motion.div
                initial={false}
                animate={{
                  height: openIdx === i ? "auto" : 0,
                  opacity: openIdx === i ? 1 : 0,
                }}
                transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="overflow-hidden">
                <div className="px-5 pb-5 pt-1">
                  <p className="text-sm text-white/45 leading-relaxed border-l-2 border-[#FFD700]/20 pl-4">
                    {f.a}
                  </p>
                </div>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════ FINAL CTA ═══════════════════ */
function FinalCTA() {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A0A0F] via-[#FFD700]/[0.03] to-[#0A0A0F]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 max-w-3xl mx-auto text-center">
        {/* Mascot emoji */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{
            delay: 0.2,
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className="text-7xl mb-8">
          🦜
        </motion.div>

        <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-tight">
          <WordReveal
            text="Sẵn sàng bị Vẹt Vàng"
            className="text-white block"
          />
          <GradientText>"mổ" cho giàu?</GradientText>
        </h2>

        <p className="text-lg text-white/45 mb-12 max-w-lg mx-auto leading-relaxed">
          Bắt đầu miễn phí. Không cần thẻ tín dụng.
          <br className="hidden sm:block" />
          Chỉ cần dũng cảm nghe Vẹt chửi.
        </p>

        <motion.div
          className="relative inline-flex"
          whileHover={{
            scale: 1.04,
            boxShadow: "0 0 80px rgba(255,215,0,0.3)",
          }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-2 rounded-[1.1rem] bg-[radial-gradient(ellipse,rgba(255,215,0,0.35)_0%,rgba(255,215,0,0.12)_42%,transparent_75%)] blur-xl"
          />
          <Link
            href="/dashboard"
            className="group inline-flex items-center gap-4 px-14 py-5 bg-gradient-to-r from-[#FFD700] to-[#FFB300] text-black font-bold rounded-2xl text-xl leading-none tracking-normal whitespace-nowrap shadow-[0_0_40px_rgba(255,215,0,0.2)]"
          >
            Bắt đầu ngay — Miễn phí
            <motion.span
              animate={{ x: [0, 6, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.4,
                ease: "easeInOut",
              }}>
              <ArrowRight className="w-6 h-6" />
            </motion.span>
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}

/* ═══════════════════ FOOTER ═══════════════════ */
function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-14 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8">
                <Image
                  src="/assets/icon.png"
                  alt="VietFi"
                  width={32}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-base font-black">
                  <GradientText>VietFi</GradientText>
                </span>
                <span className="text-xs text-white/30 ml-1">Advisor</span>
              </div>
            </Link>
            <p className="text-xs text-white/30 leading-relaxed">
              Cố vấn Tài chính AI cho người Việt.
              <br />
              Sản phẩm dự thi WebDev Adventure 2026.
            </p>
          </div>

          {/* Bước 1 */}
          <div>
            <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-3">
              Bước 1: Kiểm soát
            </h4>
            <div className="space-y-2">
              {[
                { href: "/dashboard/budget", label: "Quỹ Chi tiêu" },
                { href: "/dashboard/personal-cpi", label: "Lạm phát của tôi" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block text-sm text-white/40 hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Bước 2 */}
          <div>
            <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-3">
              Bước 2: Thoát nợ
            </h4>
            <div className="space-y-2">
              <Link
                href="/dashboard/debt"
                className="block text-sm text-white/40 hover:text-white transition-colors">
                Quỹ Nợ
              </Link>
            </div>
          </div>

          {/* Bước 3 */}
          <div>
            <h4 className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-3">
              Bước 3: Đầu tư
            </h4>
            <div className="space-y-2">
              {[
                { href: "/dashboard/sentiment", label: "Nhiệt kế thị trường" },
                { href: "/dashboard/risk-profile", label: "Tính cách đầu tư" },
                { href: "/dashboard/portfolio", label: "Cố vấn danh mục" },
              ].map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block text-sm text-white/40 hover:text-white transition-colors">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="glass-card p-4 border-[#EF4444]/10 mb-8">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-white/30 leading-relaxed">
              Thông tin trên VietFi chỉ mang tính chất tham khảo, không phải lời
              khuyên đầu tư. Mọi quyết định đầu tư thuộc trách nhiệm cá nhân.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-white/20">
          <p>© 2026 VietFi Advisor — Cuộc thi WebDev Adventure 2026</p>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════ PAGE ═══════════════════ */
export default function HomePage() {
  return (
    <>
      <div className="landing-aurora" aria-hidden="true" />
      <div className="relative z-10">
        <Navbar />
        <TrustBar />
        <main>
          <Hero />
          <Features />
          <HowItWorks />
          <VetVangShowcase />
          <Stats />
          <FAQ />
          <FinalCTA />
        </main>
        <StickyCTABar />
        <Footer />
      </div>
    </>
  );
}
