"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  AlertTriangle,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ═══════════════════ NAVBAR ═══════════════════ */
function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0F]/80 backdrop-blur-xl border-b border-white/[0.04]">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/assets/icon.png" alt="VietFi" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-bold">
            <span className="text-gradient">VietFi</span>
            <span className="text-white/40 text-sm ml-1">Advisor</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm text-[#8888AA] hover:text-white transition-colors">Tính năng</a>
          <a href="#how" className="text-sm text-[#8888AA] hover:text-white transition-colors">3 Bước</a>
          <a href="#vet" className="text-sm text-[#8888AA] hover:text-white transition-colors">Vẹt Vàng 🦜</a>
          <a href="#faq" className="text-sm text-[#8888AA] hover:text-white transition-colors">FAQ</a>
        </div>

        <Link
          href="/dashboard"
          className="px-5 py-2 text-sm bg-gradient-primary text-black font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(255,215,0,0.2)] transition-all"
        >
          Bắt đầu miễn phí
        </Link>
      </div>
    </nav>
  );
}

/* ═══════════════════ HERO ═══════════════════ */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-20">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#FFD700]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-[#00E5FF]/5 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 grid lg:grid-cols-2 gap-12 items-center">
        {/* Left */}
        <motion.div initial="hidden" animate="visible" variants={staggerContainer}>
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-[#FFD700]/20 bg-[#FFD700]/5 mb-6">
            <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-sm text-[#FFD700] font-medium">⚙️ Cố vấn tài chính thực tế, không hoa mĩ</span>
          </motion.div>

          <motion.h1 variants={fadeInUp} className="text-4xl md:text-6xl font-black mb-4 leading-[1.05] tracking-tight">
            <span className="text-white">Tự do tài chính</span><br />
            <span className="text-gradient">bắt đầu từ kiểm soát thật</span>
          </motion.h1>

          <motion.p variants={fadeInUp} className="text-lg text-[#D0D0E8] mb-6 max-w-lg leading-relaxed">
            76% người Việt không biết tiền đang đi đâu. VietFi tạo lộ trình rõ ràng,
            nhắc nhở đúng lúc, và ưu tiên trả nợ, tiết kiệm, đầu tư hợp lý.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-wrap gap-3 mb-8">
            <Link href="/dashboard" className="group inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-primary text-black font-bold rounded-xl hover:shadow-[0_0_40px_rgba(255,215,0,0.3)] transition-all text-base">
              Dùng thử miễn phí
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <a href="#vet" className="inline-flex items-center gap-2 px-6 py-3.5 border border-[#2A2A3A] rounded-xl text-[#8888AA] hover:border-[#FFD700]/30 hover:text-white transition-all">
              <span>▶</span> Xem Demo
            </a>
          </motion.div>

          <motion.div variants={fadeInUp} className="flex gap-8">
            <div><span className="text-2xl font-black text-white">6</span><span className="text-xs text-[#8888AA] ml-1.5">AI Agents</span></div>
            <div><span className="text-2xl font-black text-white">8+</span><span className="text-xs text-[#8888AA] ml-1.5">Nguồn dữ liệu</span></div>
            <div><span className="text-2xl font-black text-white">100%</span><span className="text-xs text-[#8888AA] ml-1.5">Miễn phí</span></div>
          </motion.div>
        </motion.div>

        {/* Right — Mascot */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
          className="relative hidden lg:block"
        >
          <div className="absolute inset-0 bg-[#FFD700]/5 rounded-full blur-[100px]" />
          <div className="relative">
            <Image src="/assets/mascot.png" alt="Vẹt Vàng - VietFi Mascot" width={400} height={480} className="mx-auto drop-shadow-2xl" />
            {/* Floating cards */}
            <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 3 }}
              className="absolute top-8 -left-4 glass-card px-3 py-2 text-xs flex items-center gap-2"
            >
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-[#22C55E] font-bold">+1.25%</span>
              <span className="text-white/40">VN-Index</span>
            </motion.div>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 3.5, delay: 0.5 }}
              className="absolute top-1/3 -right-6 glass-card px-3 py-2 text-center"
            >
              <span className="text-[9px] text-white/30 block">Nhiệt kế TT</span>
              <span className="text-xl font-black text-[#E6B84F]">72</span>
              <span className="text-[9px] text-[#22C55E] block">Tham lam</span>
            </motion.div>
            <motion.div animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 4, delay: 1 }}
              className="absolute bottom-16 -left-2 glass-card px-3 py-2 text-xs flex items-center gap-2"
            >
              <span>🦊</span>
              <span className="text-[#E6B84F] font-bold">Tính cách ĐT: 58</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ FEATURES ═══════════════════ */
function Features() {
  const features = [
    {
      emoji: "💰", title: "Quỹ Chi tiêu", tag: "Bước 1: Kiểm soát",
      desc: "Gọi là \"điều hành\" tiền - không phải khoe thành tích. Chia thu nhập vào quỹ thực tế, theo dõi chi tiêu theo ngày, tuần, tháng.",
      sub: "📈 Cập nhật liên tục, không ảo. Biết ngay khoản nào cạn trước, khoản nào dư sâu.",
      color: "#22C55E",
    },
    {
      emoji: "🏦", title: "Quỹ Nợ", tag: "Bước 2: Giảm gánh nặng",
      desc: "Dồn nợ, chọn cách trả hiệu quả (Snowball/Avalanche), cộng lãi ẩn chớp kịp thời.",
      sub: "🧠 Tư duy ngắn hạn + dài hạn: trả nợ không dừng cuộc sống, mà ưu tiên tương lai.",
      color: "#EF4444",
    },
    {
      emoji: "🔍", title: "Phân Tích Thị Trường", tag: "Bước 3: Quyết định",
      desc: "Tập trung vào dữ liệu thật, giả lập kịch bản rủi ro/thu lợi, chọn danh mục dựa trên bạn (không phải ID người khác).",
      sub: "🔎 Tích hợp VN-Index, vàng, USD, CPI thực tế, và nhiệt kế tâm lý \"Fear & Greed\".",
      color: "#E6B84F",
    },
  ];

  return (
    <section id="features" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <p className="text-sm text-[#E6B84F] mb-2 tracking-wider uppercase font-medium">TÍNH NĂNG</p>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            <span className="text-white">3 tính năng cốt lõi</span><br />
            <span className="text-gradient">3 bước tới tự do tài chính</span>
          </h2>
        </motion.div>

        <motion.div className="grid md:grid-cols-3 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {features.map((f) => (
            <motion.div key={f.title} variants={fadeInUp} className="glass-card p-6 relative overflow-hidden group hover:border-[#E6B84F]/20 transition-all">
              <div className="text-3xl mb-3">{f.emoji}</div>
              <h3 className="text-lg font-bold text-white mb-2">{f.title}</h3>
              <p className="text-sm text-[#8888AA] mb-4 leading-relaxed">{f.desc}</p>
              <div className="text-xs text-[#8888AA] p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-3">{f.sub}</div>
              <span className="text-[10px] px-2.5 py-1 rounded-full font-medium text-black bg-gradient-primary">{f.tag}</span>
            </motion.div>
          ))}
        </motion.div>

        <motion.div className="text-center mt-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <Link href="/dashboard" className="group inline-flex items-center gap-2 px-8 py-3.5 bg-gradient-primary text-black font-bold rounded-xl hover:shadow-[0_0_40px_rgba(255,215,0,0.3)] transition-all">
            Khám phá tất cả tính năng <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ HOW IT WORKS ═══════════════════ */
function HowItWorks() {
  const steps = [
    { num: "01", emoji: "💰", title: "🟢 Quản lý Chi tiêu", desc: "\"Tiền đi đâu hết?\" — Chia lọ ngân sách, ghi chi tiêu với Vẹt Vàng AI, đo lạm phát cá nhân thực." },
    { num: "02", emoji: "🏦", title: "🔴 Thoát bẫy Nợ", desc: "\"Nợ SPayLater + thẻ tín dụng + MoMo chiếm 60% lương?\" — Hợp nhất nợ, tính lãi ẩn, lộ trình Trả nhỏ trước vs Trả lãi cao trước." },
    { num: "03", emoji: "🚀", title: "🔵 Đầu tư Thông minh", desc: "\"Đầu tư gì? Cơ hội ở đâu?\" — Nhiệt kế thị trường, Xu hướng kinh tế, Bản tin AI sáng sớm. Cá nhân hóa theo Tính cách đầu tư." },
  ];

  return (
    <section id="how" className="py-24 px-4 bg-[#08080C]">
      <div className="max-w-4xl mx-auto">
        <motion.div className="text-center mb-16" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <p className="text-sm text-[#E6B84F] mb-2 tracking-wider uppercase font-medium">TRIẾT LÝ 3 BƯỚC</p>
          <h2 className="text-3xl md:text-5xl font-black">
            <span className="text-white">3 bước đến</span><br />
            <span className="text-gradient">Tự do Tài chính</span>
          </h2>
        </motion.div>

        <motion.div className="space-y-4" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {steps.map((s, i) => (
            <motion.div key={s.num} variants={fadeInUp}>
              <div className="glass-card p-6 flex items-start gap-5">
                <div className="text-3xl font-black text-white/10">{s.num}</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{s.title}</h3>
                  <p className="text-sm text-[#8888AA] leading-relaxed">{s.desc}</p>
                </div>
                <div className="text-3xl">{s.emoji}</div>
              </div>
              {i < 2 && <div className="h-8 flex justify-center"><div className="w-px h-full bg-[#E6B84F]/20" /></div>}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ VẸT VÀNG SHOWCASE ═══════════════════ */
function VetVangShowcase() {
  const modes = [
    { badge: "🔥 Mổ Mode", color: "#EF4444", quote: "\"3 ngày rồi mày biến đâu? Tao ngồi đây nhìn số dư tài khoản mày mà muốn khóc thay. Không phải khóc vì thương — khóc vì buồn cười 🦜\"", trigger: "Khi chi vượt lọ, bỏ app ≥2 ngày, quên trả nợ" },
    { badge: "💛 Khen Mode", color: "#E6B84F", quote: "\"Ơ hôm nay mày ghi chi tiêu sớm thế? Tao tưởng mày chỉ siêng khi vào Shopee thôi chứ. Nể thiệt! +20 XP 🦜✨\"", trigger: "Khi tiết kiệm đạt target, ghi đúng giờ, streak dài" },
    { badge: "🧠 Thâm Mode", color: "#AB47BC", quote: "\"Mua đi mua đi, tao đâu có cấm. Tao chỉ thầm tính: ly trà sữa này = 3 ngày lãi tiết kiệm. Nhưng kệ, hạnh phúc quan trọng hơn mà... phải không? 🦜\"", trigger: "Khi sắp vượt lọ, chi tiêu tăng dần" },
  ];

  const levels = [
    { name: "🐣 Vẹt Con", xp: "0 XP", desc: "Lông xơ xác, mới tập nói. Chỉ biết đếm tiền chứ chưa biết giữ.", unlock: "🔓 Ghi chi tiêu cơ bản + chia lọ" },
    { name: "🦜 Vẹt Teen", xp: "500 XP", desc: "Mọc lông vàng, tập nói xéo. Biết quy đổi trà sữa ra ngày lãi tiết kiệm.", unlock: "🔓 Roast card + streak tracker" },
    { name: "🦜✨ Vẹt Phố", xp: "2,000 XP", desc: "Lông vàng óng, đeo kính mát. Mổ đau nhưng khen ngọt.", unlock: "🔓 Market insight + outfit vẹt" },
    { name: "👑 Vẹt Nhà Giàu", xp: "5,000 XP", desc: "Lông vàng kim, đeo chain vàng. \"Tự do tài chính\" — ít nhất trong mắt vẹt.", unlock: "🔓 Full analysis + Vẹt Battle", final: true },
  ];

  return (
    <section id="vet" className="py-24 px-4">
      <div className="max-w-6xl mx-auto">
        <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <p className="text-sm text-[#E6B84F] mb-2 tracking-wider uppercase font-medium">VẸT VÀNG AI 🦜</p>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            <span className="text-white">Cố vấn tài chính</span><br />
            <span className="text-gradient">xéo sắc nhất Việt Nam</span>
          </h2>
          <p className="text-[#8888AA] max-w-xl mx-auto text-sm leading-relaxed">
            Lấy cảm hứng từ <strong className="text-white">Cleo Roast Mode</strong> + <strong className="text-white">Duolingo Owl</strong>.
            Giọng choe choé, hay than, guilt-tripping level max.
          </p>
        </motion.div>

        {/* Modes */}
        <motion.div className="grid md:grid-cols-3 gap-4 mb-8" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {modes.map((m) => (
            <motion.div key={m.badge} variants={fadeInUp} className="glass-card p-5">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full mb-3 inline-block" style={{ backgroundColor: `${m.color}15`, color: m.color }}>{m.badge}</span>
              <p className="text-sm text-white/70 italic mb-3 leading-relaxed">{m.quote}</p>
              <span className="text-[10px] text-[#8888AA]">{m.trigger}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Scenarios */}
        <motion.div className="glass-card p-6 mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full mb-4 inline-block bg-[#EF4444]/15 text-[#EF4444]">🎬 Vẹt nói gì khi...</span>
          <div className="grid sm:grid-cols-2 gap-3">
            {[
              ["Mở app lần đầu:", "\"Ồ có người mới à? Để tao đoán: lương về 3 ngày là sạch bách, đúng không? Yên tâm, tao sẽ mổ cho mày giàu 🦜\""],
              ["Streak 7 ngày:", "\"7 ngày liên tiếp! Lần cuối có ai chu đáo với tao vậy là... à chưa có bao giờ. Keep going! 🦜🔥\""],
              ["Cuối tháng hết tiền:", "\"Cuối tháng rồi, ví mày mỏng hơn tao. Mà tao là vẹt, tao mỏng là đúng rồi. Còn mày thì... 🦜\""],
              ["Trả hết 1 khoản nợ:", "\"Wait... trả hết nợ SPayLater rồi á?! Tao xin lỗi đã nghi ngờ mày. Mày xứng đáng tốt hơn 🦜🥹\""],
            ].map(([label, quote]) => (
              <div key={label} className="text-sm"><strong className="text-white">{label}</strong> <em className="text-white/50">{quote}</em></div>
            ))}
          </div>
        </motion.div>

        {/* Level system */}
        <motion.div className="text-center mb-6" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <h3 className="text-xl font-bold text-white mb-2">Lộ trình trưởng thành cùng Vẹt</h3>
          <p className="text-sm text-[#8888AA]">Ghi chi tiêu mỗi ngày = &quot;cho vẹt ăn&quot; → tích XP → level up</p>
        </motion.div>
        <motion.div className="grid grid-cols-2 md:grid-cols-4 gap-4" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {levels.map((l) => (
            <motion.div key={l.name} variants={fadeInUp} className={`glass-card p-4 text-center ${l.final ? "border-[#E6B84F]/20" : ""}`}>
              <div className="text-3xl mb-2">{l.name.split(" ")[0]}</div>
              <h4 className="text-sm font-bold text-white mb-0.5">{l.name}</h4>
              <span className="text-[10px] text-[#E6B84F] font-mono">{l.xp}</span>
              <p className="text-[11px] text-[#8888AA] mt-2 mb-2 leading-relaxed">{l.desc}</p>
              <span className="text-[10px] text-white/30">{l.unlock}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ DÀNH CHO AI ═══════════════════ */
function Personas() {
  return (
    <section id="testimonials" className="py-24 px-4 bg-[#08080C]">
      <div className="max-w-6xl mx-auto">
        <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <p className="text-sm text-[#E6B84F] mb-2 tracking-wider uppercase font-medium">DÀNH CHO AI?</p>
          <h2 className="text-3xl md:text-5xl font-black">
            <span className="text-white">Nếu bạn là một trong số này,</span><br />
            <span className="text-gradient">VietFi dành cho bạn</span>
          </h2>
        </motion.div>

        <motion.div className="grid md:grid-cols-3 gap-6" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.div variants={fadeInUp} className="glass-card p-6">
            <div className="text-xs text-[#8888AA] mb-3">👤 Persona #1</div>
            <p className="text-sm text-white/70 italic mb-4 leading-relaxed">
              &quot;Lương 12 triệu, chi 10 triệu, nợ SPayLater 3 triệu + thẻ tín dụng 5 triệu.
              Vừa mở TCBS nạp 5 triệu nhưng không biết mua gì. Scroll F319 thấy bạn bè khoe lãi, muốn FOMO nhưng sợ mất tiền.&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#EF4444]/10 flex items-center justify-center text-sm font-bold text-[#EF4444]">L</div>
              <div>
                <div className="text-sm font-semibold text-white">Linh, 24 tuổi</div>
                <div className="text-[10px] text-[#8888AA]">Nhân viên văn phòng, Hà Nội</div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="glass-card p-6">
            <div className="text-xs text-[#8888AA] mb-3">👤 Persona #2</div>
            <p className="text-sm text-white/70 italic mb-4 leading-relaxed">
              &quot;Thu nhập part-time 5 triệu, 60% cho ăn + nhà trọ. Muốn tiết kiệm nhưng lãi suất 5% chẳng thấm.
              Mọi thứ đắt lên, lương không tăng. Không biết bao giờ có nhà riêng.&quot;
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#00E5FF]/10 flex items-center justify-center text-sm font-bold text-[#00E5FF]">M</div>
              <div>
                <div className="text-sm font-semibold text-white">Minh, 22 tuổi</div>
                <div className="text-[10px] text-[#8888AA]">Sinh viên năm cuối, Đà Nẵng</div>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} className="glass-card p-6 border-[#E6B84F]/10">
            <div className="text-xs text-[#8888AA] mb-3">📊 Thống kê thực</div>
            <p className="text-sm text-white/70 mb-4 leading-relaxed">
              76% người Việt thiếu kiến thức tài chính. 67% bối rối quản lý tài chính.
              57% Gen Z chọn đầu tư an toàn thay vì tối ưu. 43% Gen Z thiếu tự tin tài chính.
            </p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#E6B84F]/10 flex items-center justify-center text-sm">📈</div>
              <div>
                <div className="text-sm font-semibold text-white">Nguồn: S&P, Sun Life, Goover.ai</div>
                <div className="text-[10px] text-[#8888AA]">Khảo sát 2024-2025</div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ FAQ ═══════════════════ */
function FAQ() {
  const faqs = [
    { q: "VietFi có miễn phí không?", a: "Hoàn toàn miễn phí. Sử dụng Gemini API free tier (1.500 request/ngày), Supabase free tier, deploy trên Vercel — đủ cho 50.000+ người dùng." },
    { q: "Nhiệt kế thị trường lấy dữ liệu từ đâu?", a: "5 chỉ báo Việt hóa: VN-Index Momentum, Khối ngoại ròng, Sentiment NLP (VnExpress), Breadth (HoSE), Spread TPCP vs tiết kiệm (NHNN). Cập nhật daily." },
    { q: "Dữ liệu tài chính của tôi có an toàn không?", a: "Supabase PostgreSQL với Row Level Security — mỗi user chỉ thấy data của mình. Không chia sẻ data với bên thứ 3." },
    { q: "VietFi có phải lời khuyên đầu tư không?", a: "Không. VietFi cung cấp phân tích và gợi ý dựa trên dữ liệu, KHÔNG phải lời khuyên đầu tư." },
    { q: "Vẹt Vàng AI hoạt động như thế nào?", a: "Mascot AI có 3 chế độ: Mổ (roast khi vượt lọ), Khen (hype khi tiết kiệm tốt), Thâm (passive-aggressive khi sắp vượt). Ghi chi tiêu = \"cho vẹt ăn\" → tích XP → level up." },
  ];

  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <motion.div className="text-center mb-12" initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <p className="text-sm text-[#E6B84F] mb-2 tracking-wider uppercase font-medium">CÂU HỎI THƯỜNG GẶP</p>
          <h2 className="text-3xl md:text-4xl font-black text-white">Giải đáp thắc mắc</h2>
        </motion.div>

        <motion.div className="space-y-3" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {faqs.map((f, i) => (
            <motion.div key={i} variants={fadeInUp}>
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full glass-card p-4 text-left flex items-center justify-between hover:border-[#E6B84F]/20 transition-all"
              >
                <span className="text-sm font-semibold text-white">{f.q}</span>
                <ChevronDown className={`w-4 h-4 text-white/30 transition-transform ${openIdx === i ? "rotate-180" : ""}`} />
              </button>
              {openIdx === i && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="px-4 pb-4">
                  <p className="text-sm text-[#8888AA] leading-relaxed pt-2">{f.a}</p>
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ CTA ═══════════════════ */
function FinalCTA() {
  return (
    <section className="py-24 px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[#E6B84F]/3 pointer-events-none" />
      <div className="relative z-10 max-w-3xl mx-auto text-center">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp}>
          <div className="text-6xl mb-4">🦜</div>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            <span className="text-white">Sẵn sàng bị Vẹt Vàng</span><br />
            <span className="text-gradient">&quot;mổ&quot; cho giàu?</span>
          </h2>
          <p className="text-[#8888AA] mb-8 text-lg">
            Bắt đầu miễn phí. Không cần thẻ tín dụng. Chỉ cần dũng cảm nghe Vẹt chửi.
          </p>
          <Link href="/dashboard" className="group inline-flex items-center gap-3 px-12 py-5 bg-gradient-primary text-black font-bold rounded-2xl text-xl hover:shadow-[0_0_60px_rgba(255,215,0,0.3)] transition-all">
            Bắt đầu ngay — Miễn phí
            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

/* ═══════════════════ FOOTER ═══════════════════ */
function Footer() {
  return (
    <footer className="border-t border-[#2A2A3A] py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-black" />
              </div>
              <span className="text-lg font-bold"><span className="text-gradient">VietFi</span> Advisor</span>
            </div>
            <p className="text-xs text-[#8888AA] leading-relaxed">Cố vấn Tài chính AI cho người Việt.<br/>Sản phẩm dự thi WebDev Adventure 2026.</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white/40 uppercase mb-3">Bước 1: Kiểm soát</h4>
            <div className="space-y-1.5">
              <Link href="/dashboard/budget" className="block text-sm text-[#8888AA] hover:text-white transition-colors">Quỹ Chi tiêu</Link>
              <Link href="/dashboard/personal-cpi" className="block text-sm text-[#8888AA] hover:text-white transition-colors">Lạm phát của tôi</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white/40 uppercase mb-3">Bước 2: Thoát nợ</h4>
            <div className="space-y-1.5">
              <Link href="/dashboard/debt" className="block text-sm text-[#8888AA] hover:text-white transition-colors">Quỹ Nợ</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-bold text-white/40 uppercase mb-3">Bước 3: Đầu tư</h4>
            <div className="space-y-1.5">
              <Link href="/dashboard/sentiment" className="block text-sm text-[#8888AA] hover:text-white transition-colors">Nhiệt kế thị trường</Link>
              <Link href="/dashboard/risk-profile" className="block text-sm text-[#8888AA] hover:text-white transition-colors">Tính cách đầu tư</Link>
              <Link href="/dashboard/portfolio" className="block text-sm text-[#8888AA] hover:text-white transition-colors">Cố vấn danh mục</Link>
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="glass-card p-4 border-[#EF4444]/10 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-[#EF4444] flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#8888AA] leading-relaxed">
              Thông tin trên VietFi chỉ mang tính chất tham khảo, không phải lời khuyên đầu tư. Mọi quyết định đầu tư thuộc trách nhiệm cá nhân.
            </p>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#666680]">
          <p>© 2026 VietFi Advisor — Cuộc thi WebDev Adventure 2026</p>
          <a href="https://comarai.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#E6B84F] transition-colors">by Comarai</a>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════ PAGE ═══════════════════ */
export default function HomePage() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <VetVangShowcase />
        <Personas />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
