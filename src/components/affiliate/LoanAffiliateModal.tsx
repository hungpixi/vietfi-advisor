"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Banknote, Shield, ChevronRight, Zap } from "lucide-react";
import {
  LOAN_PRODUCTS,
  INSURANCE_PRODUCTS,
  type LoanProduct,
  type InsuranceProduct,
  formatRateRange,
  formatVND,
  estimateMonthlyPayment,
} from "@/lib/affiliate/products";
import { trackEvent } from "@/lib/affiliate/analytics";

/* ─── Props ──────────────────────────────────────────────── */
interface LoanAffiliateModalProps {
  dtiRatio: number;
  totalMonthlyInterest: number; // VND
  onClose: () => void;
}

/* ─── Constants ──────────────────────────────────────────── */
const DISMISS_KEY = "vietfi_affiliate_dismissed_until";

/* ─── Insurance type icon ───────────────────────────────── */
function InsuranceTypeIcon({ type }: { type: InsuranceProduct["type"] }) {
  const configs = {
    accident: { emoji: "🛡️", label: "Tai nạn" },
    health:   { emoji: "💊", label: "Sức khỏe" },
    life:     { emoji: "❤️", label: "Nhân thọ" },
    property: { emoji: "🏠", label: "Tài sản" },
  } as const;
  const cfg = configs[type] ?? { emoji: "📋", label: type };
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-xl">{cfg.emoji}</span>
      <span className="text-[9px] text-white/40">{cfg.label}</span>
    </div>
  );
}

/* ─── Loan Card ──────────────────────────────────────────── */
function LoanCard({ product }: { product: LoanProduct }) {
  const monthly = estimateMonthlyPayment(
    (product.minAmount + product.maxAmount) / 2,
    product.rateMin,
    product.rateMax,
    product.maxTenorMonths
  );

  return (
    <a
      href={product.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackEvent({
          type: "AFFILIATE_CTA_CLICK",
          productId: product.id,
          productType: "loan",
        })
      }
      className="block p-4 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-[#E6B84F]/30 rounded-2xl transition-all group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Banknote className="w-4 h-4 text-[#E6B84F] shrink-0" />
            <span className="text-[13px] font-bold text-white leading-tight">{product.name}</span>
          </div>
          <div className="text-[10px] text-white/40 mt-0.5">{product.bank}</div>
        </div>
        <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-[#E6B84F] transition-colors shrink-0 mt-0.5" />
      </div>

      {/* Badge */}
      {product.badge && (
        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#E6B84F]/15 border border-[#E6B84F]/25 rounded-md mb-2">
          <Zap className="w-2.5 h-2.5 text-[#E6B84F]" />
          <span className="text-[9px] font-semibold text-[#E6B84F]">{product.badge}</span>
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2">
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider">Hạn mức</div>
          <div className="text-[11px] font-semibold text-white/80">
            {formatVND(product.minAmount / 1_000_000)}–{formatVND(product.maxAmount / 1_000_000)}
          </div>
        </div>
        <div>
          <div className="text-[9px] text-white/30 uppercase tracking-wider">Lãi suất</div>
          <div className="text-[11px] font-semibold text-[#22C55E]">{formatRateRange(product.rateMin, product.rateMax)}/năm</div>
        </div>
        <div className="col-span-2">
          <div className="text-[9px] text-white/30 uppercase tracking-wider">Ước tính trả tháng</div>
          <div className="text-[12px] font-bold text-[#E6B84F]">~{formatVND(monthly)}/tháng</div>
        </div>
      </div>

      {/* CTA */}
      <div className="mt-3 pt-3 border-t border-white/[0.05] text-center">
        <span className="text-[10px] font-bold text-[#E6B84F] group-hover:text-[#FFD700] transition-colors uppercase tracking-wider">
          Đăng ký ngay →
        </span>
      </div>
    </a>
  );
}

/* ─── Insurance Card ─────────────────────────────────────── */
function InsuranceCard({ product }: { product: InsuranceProduct }) {
  return (
    <a
      href={product.affiliateUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackEvent({
          type: "AFFILIATE_CTA_CLICK",
          productId: product.id,
          productType: "insurance",
        })
      }
      className="flex items-start gap-3 p-4 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] hover:border-[#22C55E]/30 rounded-2xl transition-all group"
    >
      <InsuranceTypeIcon type={product.type} />
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-bold text-white leading-tight">{product.name}</div>
        <div className="text-[10px] text-white/40 mt-0.5">{product.provider}</div>
        <div className="grid grid-cols-2 gap-x-3 mt-2">
          <div>
            <div className="text-[9px] text-white/30">Phí/tháng</div>
            <div className="text-[11px] font-semibold text-[#22C55E]">
              {formatVND(product.premiumMinMonthly)}–{formatVND(product.premiumMaxMonthly)}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-white/30">Quyền lợi</div>
            <div className="text-[11px] font-semibold text-white/80">
              {formatVND(product.coverageMin / 1_000_000)}–{formatVND(product.coverageMax / 1_000_000)}
            </div>
          </div>
        </div>
        <div className="mt-2">
          <span className="text-[10px] font-bold text-[#22C55E] group-hover:text-[#4ADE80] transition-colors uppercase tracking-wider">
            Tìm hiểu thêm →
          </span>
        </div>
      </div>
    </a>
  );
}

/* ─── Modal ──────────────────────────────────────────────── */
export function LoanAffiliateModal({ dtiRatio, totalMonthlyInterest, onClose }: LoanAffiliateModalProps) {
  const [activeTab, setActiveTab] = useState<"loan" | "insurance">("loan");

  // Track modal shown on mount
  useEffect(() => {
    trackEvent({
      type: "AFFILIATE_MODAL_SHOWN",
      dtiBucket: dtiRatio >= 35 ? "high" : dtiRatio >= 20 ? "medium" : "low",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleClose = () => {
    // Dismiss for 24h
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 86_400_000));
    } catch {
      // storage full — continue anyway
    }
    trackEvent({ type: "AFFILIATE_DISMISSED", reason: "user" });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.97 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full sm:max-w-lg max-h-[90vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[#141414] border border-white/[0.10] shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ───────────────────────────────────── */}
          <div className="sticky top-0 z-10 bg-[#141414]/90 backdrop-blur-md border-b border-white/[0.06] px-5 pt-5 pb-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#E6B84F]/15 flex items-center justify-center shrink-0 mt-0.5">
                <Banknote className="w-5 h-5 text-[#E6B84F]" />
              </div>
              <div>
                <h2 className="text-[15px] font-bold text-white leading-tight">
                  Bạn đang gánh{" "}
                  <span className="text-[#EF4444]">{formatVND(totalMonthlyInterest)}</span>/tháng lãi ẩn
                </h2>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Đề xuất khoản vay tốt hơn?
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-white/40 hover:text-white/80 transition-all shrink-0"
              aria-label="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Tabs ─────────────────────────────────────── */}
          <div className="flex border-b border-white/[0.06]">
            {(["loan", "insurance"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-semibold transition-all border-b-2 ${
                  activeTab === tab
                    ? "border-[#E6B84F] text-[#E6B84F]"
                    : "border-transparent text-white/40 hover:text-white/70"
                }`}
              >
                {tab === "loan" ? (
                  <>
                    <Banknote className="w-4 h-4" /> Vay Tái Tài Chính
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" /> Bảo Hiểm
                  </>
                )}
              </button>
            ))}
          </div>

          {/* ── Content ──────────────────────────────────── */}
          <div className="p-5">
            {activeTab === "loan" ? (
              <div className="space-y-3">
                {LOAN_PRODUCTS.map((p) => (
                  <LoanCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {INSURANCE_PRODUCTS.map((p) => (
                  <InsuranceCard key={p.id} product={p} />
                ))}
              </div>
            )}

            {/* ── HIGH-1 Disclosure ────────────────────── */}
            <p className="mt-5 pt-4 border-t border-white/[0.06] text-center text-[10px] text-white/25 leading-relaxed">
              Liên kết tài chính. VietFi nhận phí giới thiệu từ các đối tác trên.
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
