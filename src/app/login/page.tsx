"use client";

import { useSearchParams } from "next/navigation";
import { login, signup } from "./actions";
import { Suspense } from "react";

function LoginForm() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const message = searchParams.get("message");

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

        {/* Form */}
        <form className="space-y-4">
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
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
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
              🔑 Đăng nhập
            </button>

            <button
              formAction={signup}
              className="w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 cursor-pointer"
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
