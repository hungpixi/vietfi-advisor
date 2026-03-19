/* ═══════════════════════════════════════
   VietFi Advisor — Animations & Interactions
   ═══════════════════════════════════════ */

// ── Intersection Observer for scroll animations ──
const animateOnScroll = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, parseInt(delay));
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('[data-animate]').forEach(el => observer.observe(el));
};

// ── Navbar blur on scroll ──
const handleNavScroll = () => {
  const nav = document.querySelector('.nav');
  let lastScroll = 0;
  
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 60) {
      nav.classList.add('nav--scrolled');
    } else {
      nav.classList.remove('nav--scrolled');
    }
    lastScroll = scrollY;
  }, { passive: true });
};

// ── Vẹt Vàng roast typing effect in CTA ──
const roastLines = [
  '"3 ngày rồi mày biến đâu? Tao nhìn số dư tài khoản mày mà muốn khóc thay 🦜"',
  '"Lại Shopee hả? Tuần thứ 3 rồi đấy. Tao không nói gì, chỉ thở dài thôi 🦜"',
  '"Trưa rồi, ăn gì khai báo đi. Đừng bắt tao đói cùng ví mày 🦜"',
  '"Ly trà sữa này = 3 ngày lãi tiết kiệm. Nhưng kệ, hạnh phúc quan trọng hơn... phải không? 🦜"',
  '"Hôm nay mày ghi chi tiêu sớm thế? Tao tưởng mày chỉ siêng khi vào Shopee thôi chứ 🦜✨"',
  '"Cuối tháng rồi, ví mày mỏng hơn tao. Mà tao là vẹt, tao mỏng là đúng rồi 🦜"',
  '"Trả hết nợ SPayLater rồi á?! Tao xin lỗi đã nghi ngờ mày 🦜🥹"',
  '"Lương về 3 ngày là sạch bách, đúng không? Yên tâm, tao sẽ mổ cho mày giàu 🦜"',
];

const startRoastCycle = () => {
  const el = document.getElementById('roast-text');
  if (!el) return;
  
  let idx = 0;
  const typeText = (text) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => {
      el.textContent = text;
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    }, 300);
  };
  
  typeText(roastLines[0]);
  setInterval(() => {
    idx = (idx + 1) % roastLines.length;
    typeText(roastLines[idx]);
  }, 4000);
};

// ── Smooth scroll for nav links ──
const setupSmoothScroll = () => {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
};

// ── Parallax on mascot ──
const setupParallax = () => {
  const mascot = document.querySelector('.hero__mascot-wrap');
  if (!mascot) return;
  
  window.addEventListener('mousemove', (e) => {
    const x = (e.clientX / window.innerWidth - 0.5) * 20;
    const y = (e.clientY / window.innerHeight - 0.5) * 20;
    mascot.style.transform = `translate(${x}px, ${y}px)`;
  }, { passive: true });
};

// ── F&G Counter animation ──
const animateCounters = () => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.count);
        if (!target) return;
        
        let current = 0;
        const step = target / 40;
        const timer = setInterval(() => {
          current += step;
          if (current >= target) {
            current = target;
            clearInterval(timer);
          }
          el.textContent = Math.round(current).toLocaleString('vi-VN');
        }, 30);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-count]').forEach(el => observer.observe(el));
};

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  animateOnScroll();
  handleNavScroll();
  startRoastCycle();
  setupSmoothScroll();
  setupParallax();
  animateCounters();
});
