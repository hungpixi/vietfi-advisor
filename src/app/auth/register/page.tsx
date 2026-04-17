import RegisterForm from "@/components/auth/RegisterForm";

export default function RegisterPage() {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-center">
      {/* Left Side - Branding */}
      <div className="hidden md:flex flex-col items-center justify-center text-center p-8">
        {/* Logo */}
        <div className="mb-8">
          <div className="text-5xl mb-4 animate-float">🦜</div>
          <h1 className="text-4xl font-bold text-gradient mb-2">
            VietFi Advisor
          </h1>
          <p className="text-xl text-text-secondary">
            Tài chính thông minh cùng Vẹt Vàng
          </p>
        </div>

        {/* Mascot Quote */}
        <div className="glass-card p-6 mb-8 max-w-md">
          <p className="text-lg italic text-text-secondary">
            &ldquo;Muốn biết tiền đi đâu? Hỏi Vẹt Vàng!&rdquo;
          </p>
          <p className="text-sm text-primary mt-2">— Vẹt Vàng 🦜</p>
        </div>

        {/* Features */}
        <div className="space-y-3 text-left">
          <div className="flex items-center gap-3">
            <span className="text-success text-xl">✓</span>
            <span className="text-text-secondary">
              AI thông minh - Chat với cố vấn ảo
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-success text-xl">✓</span>
            <span className="text-text-secondary">
              Theo dõi chi tiêu - Quản lý tiền dễ dàng
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-success text-xl">✓</span>
            <span className="text-text-secondary">
              Vẹt Vàng sắc sảo - Nhắc nhở khi cần
            </span>
          </div>
        </div>
      </div>

      {/* Right Side - Register Form */}
      <div className="w-full max-w-md mx-auto">
        {/* Mobile Logo */}
        <div className="md:hidden text-center mb-6">
          <div className="text-4xl mb-2 animate-float">🦜</div>
          <h1 className="text-3xl font-bold text-gradient">VietFi Advisor</h1>
          <p className="text-text-secondary text-sm mt-1">
            Tài chính thông minh cùng Vẹt Vàng
          </p>
        </div>

        <RegisterForm />
      </div>
    </div>
  );
}
