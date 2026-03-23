"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Bell, X } from "lucide-react"
import { getNotifDismissed, setNotifDismissed } from "@/lib/storage"

const fadeIn = {
  hidden: { opacity: 0, y: -8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

export function NotificationBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (
      "Notification" in window &&
      Notification.permission === "default" &&
      !getNotifDismissed()
    ) {
      setShow(true)
    }
  }, [])

  const handleDismiss = () => {
    setNotifDismissed(true)
    setShow(false)
  }

  const handleEnable = async () => {
    const perm = await Notification.requestPermission()
    if (perm === "granted") handleDismiss()
  }

  if (!show) return null

  return (
    <motion.div
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="glass-card p-3 mb-4 flex items-center gap-3 border-[#00E5FF]/10"
    >
      <Bell className="w-4 h-4 text-[#00E5FF] flex-shrink-0" />
      <p className="text-[12px] text-white/60 flex-1">
        Bật thông báo để nhận cảnh báo khi thị trường biến động mạnh
      </p>
      <button
        onClick={handleEnable}
        className="text-[11px] px-3 py-1.5 bg-[#00E5FF]/10 text-[#00E5FF] rounded-lg hover:bg-[#00E5FF]/20 transition-colors font-medium flex-shrink-0"
      >
        Bật ngay
      </button>
      <button
        onClick={handleDismiss}
        className="text-white/20 hover:text-white/40 transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </motion.div>
  )
}
