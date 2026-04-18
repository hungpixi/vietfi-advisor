"use client";

import { createClient } from "@/lib/supabase/client";
import { getBrowserAuthCallbackUrl } from "@/lib/security/origin";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OAuthButtons from "./OAuthButtons";

export default function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự!");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp!");
      return;
    }

    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: getBrowserAuthCallbackUrl("/dashboard"),
        },
      });

      if (signUpError) {
        // Log the full error to console for technical debugging
        console.error("Supabase technical error:", signUpError);

        // Map some common errors to Vietnamese, otherwise show raw message
        if (signUpError.message.includes("already registered")) {
          setError("Email này đã được đăng ký!");
        } else if (signUpError.message.includes("valid email")) {
          setError("Email không hợp lệ!");
        } else {
          // HIỂN THỊ LỖI THẬT TỪ HỆ THỐNG
          setError(`Lỗi hệ thống: ${signUpError.message}`);
        }
        setIsLoading(false);
        return;
      }


      setError("");
      alert(
        "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản."
      );
      router.push("/auth/login");
    } catch (err) {
      console.error("Register error:", err);
      setError("Đã xảy ra lỗi. Vui lòng thử lại!");
      setIsLoading(false);
    }
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gradient">
          Tạo tài khoản mới
        </h2>
        <p className="text-text-secondary mt-1 text-sm">
          Gia nhập cùng Vẹt Vàng ngay hôm nay
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-text-secondary mb-1.5">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-text-secondary mb-1.5">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Tối thiểu 6 ký tự"
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-secondary mb-1.5">
            Xác nhận mật khẩu
          </label>
          <input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={6}
            placeholder="Nhập lại mật khẩu"
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
          />
        </div>


        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-gradient-primary text-bg font-semibold rounded-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? "Đang đăng ký..." : "Đăng ký"}
        </button>
      </form>

      {/* OAuth Buttons */}
      <OAuthButtons />

      {/* Guest Login Button */}
      <button
        onClick={() => {
          document.cookie = "vietfi_guest=true; path=/; max-age=86400";
          window.location.href = "/dashboard";
        }}
        className="w-full py-2.5 bg-secondary/10 text-text-secondary font-medium rounded-lg hover:bg-secondary/20 transition-all duration-200 flex items-center justify-center gap-2 border border-border"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>Tiếp tục với tư cách Khách</span>
      </button>

      <p className="text-center text-sm text-text-secondary">
        Đã có tài khoản?{" "}
        <Link
          href="/auth/login"
          className="text-primary hover:text-primary-hover font-medium transition-colors"
        >
          Đăng nhập ngay
        </Link>
      </p>
    </div>
  );
}
