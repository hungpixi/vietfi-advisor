import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đăng nhập - VietFi Advisor",
  description: "Đăng nhập vào VietFi Advisor - Quản lý tài chính thông minh cùng Vẹt Vàng",
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-5xl">
        {children}
      </div>
    </div>
  );
}
