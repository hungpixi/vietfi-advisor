"use client";

import { motion } from "framer-motion";
import { ArrowRight, User, Mail, Lock, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogle = async () => {
    await authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (isLogin) {
      const { data, error } = await authClient.signIn.email({
        email, password,
      });
      if (!error) {
        window.location.href = "/dashboard";
      } else {
        alert(error.message);
      }
    } else {
      const { data, error } = await authClient.signUp.email({
        email, password, name: email.split("@")[0],
      });
      if (!error) {
        window.location.href = "/dashboard";
      } else {
        alert(error.message);
      }
    }
    setLoading(false);
  };

  const handleGuest = () => {
    // Set a client-side cookie so middleware lets us through
    document.cookie = "vietfi_guest=true; path=/; max-age=86400"; // 1 day
    router.push("/dashboard");
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center p-4 py-8 relative overflow-x-hidden overflow-y-auto bg-[#0A0A0F] scrollbar-hide">
      <div className="absolute inset-0 pointer-events-none fixed">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[radial-gradient(ellipse,#FFD700_0%,transparent_65%)] opacity-[0.04]" />
        <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[radial-gradient(circle,#00E5FF_0%,transparent_70%)] opacity-[0.03]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-[#111] border border-white/10 p-8 rounded-2xl shadow-2xl backdrop-blur-xl">
          <div className="text-center mb-8">
            <Link href="/" className="inline-block text-2xl font-black mb-2 select-none">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFD700] to-[#FFB300]">VietFi</span>
            </Link>
            <h1 className="text-xl font-bold text-white mb-2">
              {isLogin ? "Đăng nhập vào tài khoản" : "Tạo tài khoản mới"}
            </h1>
            <p className="text-sm text-gray-400">
              Quản lý tài chính cá nhân thông minh với AI
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="hungpixi@gmail.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-400 uppercase tracking-wider mb-2">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none focus:border-[#FFD700] transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-gradient-to-r from-[#FFD700] to-[#FFB300] text-black font-bold py-3 rounded-xl hover:shadow-[0_0_20px_rgba(255,215,0,0.3)] transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Đang xử lý..." : isLogin ? "Đăng nhập" : "Đăng ký"}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10"></div>
            <span className="text-xs text-gray-500 uppercase tracking-wider">Hoặc</span>
            <div className="flex-1 h-px bg-white/10"></div>
          </div>

          <button
            onClick={handleGoogle}
            className="w-full mb-4 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Google
          </button>

          <button
            onClick={handleGuest}
            className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <User className="w-5 h-5 text-gray-400" />
            Tiếp tục với tư cách Khách
          </button>

          <p className="mt-8 text-center text-sm text-gray-400">
            {isLogin ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-[#E6B84F] font-bold hover:underline"
            >
              {isLogin ? "Đăng ký ngay" : "Đăng nhập ngay"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
