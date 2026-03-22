"use client";

import { useSearchParams } from "next/navigation";
import { login, signup, loginWithGoogle } from "./actions";
import { Suspense, useState } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => setLoading(true);

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--color-bg)" }}>
      {/* Decorative background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 animate-pulse-slow"
          style={{ background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-8 animate-pulse-slow"
          style={{ background: "radial-gradient(circle, var(--color-accent) 0%, transparent 70%)", animationDelay: "1.5s" }}
        />
      </div>

      <div className="glass-card w-full max-w-md p-8 relative z-10">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🦜</div>
          <h1 className="text-2xl font-bold text-gradient mb-2">VietFi Advisor</h1>
          <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            Đăng nhập để lưu hồ sơ rủi ro & lịch sử chat
          </p>
        </div>

        {/* Error / Success Messages */}
        {error && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(255, 82, 82, 0.15)", border: "1px solid rgba(255, 82, 82, 0.3)", color: "var(--color-danger)" }}>
            ⚠️ {error}
          </div>
        )}
        {message && (
          <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: "rgba(0, 230, 118, 0.12)", border: "1px solid rgba(0, 230, 118, 0.3)", color: "var(--color-success)" }}>
            ✅ {message}
          </div>
        )}

        {/* Google OAuth */}
        <form action={loginWithGoogle}>
          <button
            type="submit"
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 mb-4"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid var(--color-border)",
              color: "var(--color-text)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.borderColor = "var(--color-primary)";
              e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11.96 11.96 0 0 0 0 12c0 1.94.46 3.77 1.28 5.4l3.56-2.77.01-.54Z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
            </svg>
            Đăng nhập với Google
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
          <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>hoặc dùng email</span>
          <div className="flex-1 h-px" style={{ background: "var(--color-border)" }} />
        </div>

        {/* Email Form */}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,215,0,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              placeholder="••••••••"
              minLength={6}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.boxShadow = "0 0 0 3px rgba(255,215,0,0.1)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div>

          {/* Buttons */}
          <div className="space-y-3 pt-2">
            <button
              formAction={login}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-end))",
                color: "#0A0A0F",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.opacity = "0.9";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 4px 20px rgba(255,215,0,0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              {loading ? "⏳ Đang xử lý..." : "🔑 Đăng nhập"}
            </button>

            <button
              formAction={signup}
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer disabled:opacity-50"
              style={{
                background: "transparent",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = "var(--color-primary)";
                e.currentTarget.style.background = "rgba(255,215,0,0.05)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = "var(--color-border)";
                e.currentTarget.style.background = "transparent";
              }}
            >
              ✨ Tạo tài khoản mới
            </button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-center mt-6 text-xs" style={{ color: "var(--color-text-secondary)" }}>
          Sử dụng VietFi, bạn đồng ý với{" "}
          <span className="text-gradient cursor-pointer">Điều khoản sử dụng</span>
        </p>
      </div>
    </div>
  );
}


export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-bg)" }}>
        <div className="text-4xl animate-pulse-slow">🦜</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
