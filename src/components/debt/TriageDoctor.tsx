"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface DoctorProps {
  dti: number;
  debtCount: number;
  phase: "scanning" | "diagnosis" | "surgery" | "success";
}

const SPICY_MESSAGES = {
  scanning: [
    "Để xem 'khối u' tài chính lớn cỡ nào...",
    "Đang quét sinh hiệu... mạch tiền đang có dấu hiệu tắc nghẽn!",
    "Chỉ số nợ này... bạn đang dùng thẻ tín dụng hay đang dùng 'máu' vậy?",
    "Hệ thống Bio-Scan đang báo động đỏ, bình tĩnh nhé!",
  ],
  diagnosis: [
    "Chà, ca này khó... nợ toàn lãi 'cắt cổ' từ tín dụng đen à?",
    "Bạn đang 'chảy máu lãi suất' mỗi giây, cần cầm máu ngay lập tức!",
    "Quỹ giải trí của bạn là một khối u lành tính nhưng đang phồng to.",
    "Bệnh án: Nghiện tiêu xài mức độ trung bình. Phác đồ: Cắt bỏ triệt để.",
  ],
  surgery: [
    "Cầm dao lên và 'cắt máu' đống quỹ vô bổ ngay!",
    "Hy sinh trà sữa để mua lại tự do, kèo này lời đấy!",
    "Một nhát cắt quỹ giải trí = 3 tháng nợ thẻ tín dụng biến mất. Bắt đầu!",
    "Đang thực hiện 'nối ống' dòng tiền trả nợ. Trụ vững nhé!",
  ],
  success: [
    "Ca mổ thành công! Đã cầm máu và đồng bộ dữ liệu lên Cloud.",
    "Chúc mừng! Bạn vừa hồi sức cấp cứu cho tương lai của mình.",
    "Đơn thuốc: Kiên trì trả nợ trong 30 ngày tới. Đừng để tái phát!",
    "Vết mổ sẽ hơi đau (thèm mua sắm), nhưng bạn sẽ sống sót!",
  ],
};

export function TriageDoctor({ dti, debtCount, phase }: DoctorProps) {
  const getDoctorTitle = () => {
    if (dti > 60) return "BÁC SĨ TRƯỞNG";
    if (dti > 40) return "CHUYÊN GIA PHẪU THUẬT";
    return "BÁC SĨ NỘI TRÚ";
  };

  const messages = SPICY_MESSAGES[phase];
  const message = messages[Math.floor(Math.random() * messages.length)];

  return (
    <div className="flex flex-col items-center gap-4 py-4 w-full">
      <motion.div
        animate={{
          y: [0, -4, 0],
          rotate: phase === "surgery" ? [0, 2, -2, 0] : 0,
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-24 h-24"
      >
        {/* Medical Glow */}
        <div className={`absolute inset-0 rounded-full blur-2xl animate-pulse ${
          dti > 40 ? "bg-[#EF4444]/30" : "bg-[#22C55E]/20"
        }`} />
        
        <Image
          src="/vietfi_mascot_sly_1773897837198.png"
          alt="Vet Vang Doctor"
          width={96}
          height={96}
          className="relative z-10 drop-shadow-2xl"
        />
        
        {/* Clinical Badge */}
        <div className={`absolute -top-1 -right-4 px-2 py-1 rounded-md text-[8px] font-black text-white shadow-xl border border-white/20 uppercase tracking-tighter ${
          dti > 40 ? "bg-gradient-to-r from-[#EF4444] to-[#FF6B35]" : "bg-gradient-to-r from-[#22C55E] to-[#00E5FF]"
        }`}>
          {getDoctorTitle()}
        </div>
      </motion.div>

      <motion.div
        key={message}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 w-full relative"
      >
        <div className="absolute -top-1 left-1/2 -track-x-1/2 w-2 h-2 bg-[#0d0d0d] border-l border-t border-white/10 rotate-45" />
        <p className="text-[11px] text-white/50 italic text-center leading-relaxed font-mono">
          &ldquo;{message}&rdquo;
        </p>
        
        {/* Surgical Vital Line (Animated Path) */}
        <div className="mt-3 h-px w-full bg-white/5 relative overflow-hidden">
          <motion.div 
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-[#EF4444]/40 to-transparent"
          />
        </div>
      </motion.div>
    </div>
  );
}
