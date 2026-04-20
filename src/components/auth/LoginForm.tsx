"use client";

import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OAuthButtons from "./OAuthButtons";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        if (signInError.message.includes("Invalid login credentials")) {
          setError("Email hoặc mật khẩu không đúng!");
        } else if (signInError.message.includes("Email not confirmed")) {
          setError("Vui lòng xác thực email trước khi đăng nhập!");
        } else {
          setError("Đăng nhập thất bại. Vui lòng thử lại!");
        }
        setIsLoading(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Login error:", err);
      setError("Đã xảy ra lỗi. Vui lòng thử lại!");
      setIsLoading(false);
    }
  };

  const handleGuest = () => {
    document.cookie = "vietfi_guest=true; path=/; max-age=86400";
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div className="glass-card p-6 space-y-5">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gradient">Chào đã quay lại!</h2>
        <p className="text-text-secondary mt-1 text-sm">
          Đăng nhập để tiếp tục quản lý tài chính
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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
            placeholder="••••••••"
            className="w-full px-4 py-2.5 bg-bg border border-border rounded-lg text-text placeholder-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-200"
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
              <span>Đang đăng nhập...</span>
            </>
          ) : (
            <span>Đăng nhập</span>
          )}
        </button>
      </form>

      <OAuthButtons />

      <button
        onClick={handleGuest}
        className="w-full py-2.5 bg-secondary/10 text-text-secondary font-medium rounded-lg hover:bg-secondary/20 transition-all duration-200 flex items-center justify-center gap-2 border border-border"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span>Tiếp tục với tư cách Khách</span>
      </button>

      <p className="text-center text-sm text-text-secondary">
        Chưa có tài khoản?{" "}
        <Link
          href="/auth/register"
          className="text-primary hover:text-primary-hover font-medium transition-colors"
        >
          Đăng ký ngay
        </Link>
      </p>
    </div>
  );
}
