"use client";

import { useState, useEffect } from "react";
import { Sparkles, X, Gift, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { subscribePremium } from "@/lib/premium";
import { trackEvent } from "@/lib/affiliate/analytics";

interface PremiumGateModalProps {
  featureName: string;
  onClose: () => void;
}

export function PremiumGateModal({ featureName, onClose }: PremiumGateModalProps) {
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  // Track gate shown
  useEffect(() => {
    trackEvent({ type: "PREMIUM_SUBSCRIBE", source: "modal" });
  }, []);

  function handleSubscribe() {
    subscribePremium(promoCode.trim() || undefined);
    setSubscribed(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  }

  function handlePromoSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Validate against env promo codes
    const envCodes = (process.env.NEXT_PUBLIC_VIETFI_PROMO_CODES ?? "")
      .split(",")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
    if (envCodes.includes(promoCode.trim().toUpperCase())) {
      handleSubscribe();
    } else {
      setPromoError(true);
      setTimeout(() => setPromoError(false), 1500);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 8 }}
          transition={{ duration: 0.22 }}
          className="glass-card w-full max-w-sm p-6 border border-[#E6B84F]/20 relative"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
          >
            <X className="w-3.5 h-3.5 text-white/40" />
          </button>

          {subscribed ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-[#E6B84F]/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-7 h-7 text-[#E6B84F]" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Chào mừng Vẹt Vàng VIP! 🎉</h3>
              <p className="text-sm text-white/50">Bạn đã nâng cấp thành công. Tính năng đang mở khóa...</p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-[#E6B84F]/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-7 h-7 text-[#E6B84F]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Tính năng <span className="text-[#E6B84F]">{featureName}</span>
                </h3>
                <p className="text-[12px] text-white/40">chỉ dành cho Vẹt Vàng VIP</p>
              </div>

              {/* Price */}
              <div className="text-center p-4 bg-[#E6B84F]/5 border border-[#E6B84F]/15 rounded-xl mb-4">
                <div className="text-[28px] font-black text-[#E6B84F] mb-0.5">59.000đ</div>
                <div className="text-[11px] text-white/30">/ tháng — ≈ $2.40 USD</div>
                <div className="flex items-center justify-center gap-1 mt-2 text-[10px] text-[#22C55E]">
                  <Gift className="w-3 h-3" />
                  <span>LEGEND users: truy cập miễn phí 3yr backtest!</span>
                </div>
              </div>

              {/* Subscribe CTA */}
              <button
                onClick={handleSubscribe}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-[#E6B84F] to-[#FF6B35] text-black font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity mb-3"
              >
                <Sparkles className="w-4 h-4" />
                Nâng cấp ngay
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Promo code */}
              <form onSubmit={handlePromoSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={promoCode}
                  onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(false); }}
                  placeholder="Nhập mã VIP"
                  className={cn(
                    "flex-1 px-3 py-2.5 bg-white/[0.04] border rounded-lg text-sm text-white placeholder:text-white/20 focus:outline-none transition-colors",
                    promoError
                      ? "border-[#EF4444]/40 focus:border-[#EF4444]/60"
                      : "border-white/[0.08] focus:border-[#E6B84F]/30"
                  )}
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-white/[0.06] hover:bg-white/10 border border-white/[0.08] rounded-lg text-sm text-white/60 hover:text-white transition-colors"
                >
                  Áp dụng
                </button>
              </form>
              {promoError && (
                <p className="text-[10px] text-[#EF4444] mt-2 text-center">Mã VIP không hợp lệ. Thử lại hoặc nâng cấp ngay.</p>
              )}

              {/* Disclosure */}
              <p className="text-[9px] text-white/20 mt-4 text-center">
                Liên kết tài chính. VietFi nhận phí giới thiệu từ các đối tác trên.
              </p>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
