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
        // Vietnamese error messages
        if (signUpError.message.includes("already registered")) {
          setError("Email này đã được đăng ký!");
        } else if (signUpError.message.includes("valid email")) {
          setError("Email không hợp lệ!");
        } else {
          setError("Đăng ký thất bại. Vui lòng thử lại!");
        }
        setIsLoading(false);
        return;
      }

      // Show success message
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
        {/* Email Field */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
          />
        </div>

        {/* Password Field */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
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
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
          />
        </div>

        {/* Confirm Password Field */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="block text-sm font-medium text-text-secondary mb-1.5"
          >
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
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 bg-gradient-primary text-bg font-semibold rounded-lg hover:opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Đang đăng ký...</span>
            </>
          ) : (
            <span>Đăng ký</span>
          )}
        </button>
      </form>

      {/* OAuth Buttons */}
      <OAuthButtons />

      {/* Login Link */}
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
