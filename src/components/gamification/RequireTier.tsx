"use client";

import { useEffect, useState } from "react";
import { UserRole, hasRole, ROLE_THRESHOLDS, ROLE_DESCRIPTIONS } from "@/lib/rbac";
import { getGamification } from "@/lib/gamification";
import { Lock, Zap, ArrowRight, ShieldAlert, Key } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface RequireTierProps {
  requiredRole: UserRole;
  featureName: string;
  children: React.ReactNode;
}

export default function RequireTier({ requiredRole, featureName, children }: RequireTierProps) {
  const [isClient, setIsClient] = useState(false);
  const [xp, setXp] = useState(0);
  const [showPromo, setShowPromo] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsClient(true);
      const gam = getGamification();
      setXp(gam.xp);
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const handleActivateCode = () => {
    if (promoCode.trim().toLowerCase() === "hungpixi") {
      const gam = getGamification();
      gam.xp += 2000;
      localStorage.setItem("gamification_store", JSON.stringify(gam));
      window.dispatchEvent(new Event("gamification_updated"));
      
      setXp(gam.xp);
      setErrorMsg("");
      setSuccessMsg("Kích hoạt mã thành công! Bạn đã được nhận 2000 XP 💎");
    } else {
      setSuccessMsg("");
      setErrorMsg("Mã kích hoạt không hợp lệ!");
    }
  };

  if (!isClient) {
    // Return skeleton or null during SSR to avoid hydration mismatch
    return <div className="animate-pulse bg-white/5 h-64 rounded-xl w-full"></div>;
  }

  const isAllowed = hasRole(xp, requiredRole);
  const requiredXp = ROLE_THRESHOLDS[requiredRole];
  const missingXp = Math.max(0, requiredXp - xp);

  if (isAllowed) {
    return <>{children}</>;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-black/40 border border-[#333] rounded-2xl p-8 text-center max-w-2xl mx-auto my-12 backdrop-blur-md"
      >
        <div className="absolute top-0 right-0 p-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 p-8 w-64 h-64 bg-rose-500/5 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="w-20 h-20 bg-[#1A1A1A] rounded-full border border-[#333] flex items-center justify-center mx-auto mb-6 shadow-inner">
          <ShieldAlert className="w-10 h-10 text-rose-500" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-2">Tính Năng Bị Khóa</h2>
        <p className="text-gray-400 mb-6">
          Trang <strong className="text-white">{featureName}</strong> là đặc quyền dành cho các{" "}
          <span className="text-indigo-400 font-semibold">{ROLE_DESCRIPTIONS[requiredRole]}</span>.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto mb-8">
          <div className="bg-[#111] p-4 rounded-xl border border-[#222]">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Cấp bậc cần thiết</div>
            <div className="text-lg font-bold text-indigo-400">{requiredRole}</div>
          </div>
          <div className="bg-[#111] p-4 rounded-xl border border-[#222]">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">XP Của Bạn</div>
            <div className="text-lg font-bold text-white flex items-center justify-center gap-1.5">
              <Zap size={16} className="text-[#E6B84F]" /> {xp} / {requiredXp}
            </div>
          </div>
        </div>

        <div className="inline-block bg-white/5 border border-white/10 px-6 py-4 rounded-xl mb-8 w-full max-w-lg">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Tiến độ cày cuốc</span>
            <span className="text-gray-300 font-medium">{Math.floor((xp / requiredXp) * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-black rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#E6B84F] to-[#FF6B35]" 
              style={{ width: `${Math.min(100, Math.floor((xp / requiredXp) * 100))}%` }} 
            />
          </div>
          <p className="text-xs text-gray-500 mt-3">
            Bạn cần thu thập thêm <strong className="text-[#E6B84F]">{missingXp} XP</strong> nữa để mở khóa.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6">
          <Link href="/dashboard/budget" className="bg-white text-black hover:bg-gray-200 px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2">
            <Zap size={18} /> Đi kiếm XP ngay
          </Link>
          <button className="bg-transparent border border-[#333] hover:border-[#555] text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
           onClick={() => { alert("Trong thực tế, đây là nút nâng cấp Tier nạp tiền thật (Billing Modal).") }}>
            <Lock size={18} /> Nâng cấp VIP (Demo)
          </button>
        </div>

        {/* Promo Code Section */}
        <div className="mt-8 pt-6 border-t border-white/10">
          {!showPromo ? (
            <button 
              onClick={() => setShowPromo(true)}
              className="text-xs text-white/40 hover:text-white transition-colors"
            >
              Bạn có Mã kích hoạt sớm (Promo code)?
            </button>
          ) : (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="flex items-center justify-center gap-2 max-w-sm mx-auto"
            >
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="w-4 h-4 text-white/40" />
                </div>
                <input 
                  type="text" 
                  autoFocus
                  placeholder="Nhập mã 'hungpixi'..."
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleActivateCode()}
                  className="w-full bg-white/5 border border-white/20 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:outline-none focus:border-[#E6B84F] transition-colors"
                />
              </div>
              <button 
                onClick={handleActivateCode}
                className="bg-[#E6B84F] hover:bg-[#FF6B35] text-black px-4 py-2 rounded-lg text-sm font-bold transition-colors"
              >
                Kích hoạt
              </button>
            </motion.div>
          )}

          {errorMsg && <p className="text-rose-500 text-xs mt-3">{errorMsg}</p>}
          {successMsg && <p className="text-emerald-400 text-xs mt-3">{successMsg}</p>}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
