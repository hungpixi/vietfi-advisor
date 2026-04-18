# PLAN-login-fix

## 🔴 Phase 0: Socratic Gate & Analysis

### Overview
Dựa trên yêu cầu của bạn về việc kiểm tra logic phần đăng nhập (`/login`), tôi đã khảo sát source code và phát hiện có sự chồng chéo giữa hai hệ thống Authentication:

1. **Hệ thống Better Auth** (Nằm ở `src/app/login/page.tsx` và `src/lib/auth.ts`)
   - ✅ Đã cài đặt thư viện và config sqlite (`better-auth.sqlite`).
   - ❌ Mất biến môi trường: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_SECRET`.
   - ❓ Chưa rõ đã có API Routes cho Better Auth (`src/app/api/auth/[...all]/route.ts`) hay chưa.

2. **Hệ thống Supabase Auth** (Nằm ở `src/app/auth/login/page.tsx` và file spec `docs/superpowers/specs/2026-04-15-auth-login-voice-supabase-design.md`)
   - ✅ Đã có biến `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` trong `.env`.
   - ✅ Component `LoginForm.tsx` đã được kết nối với Supabase client.

### Câu hỏi Socratic (Cần xác nhận trước khi làm)
1. Dự án này chúng ta sẽ thống nhất sử dụng **Supabase Auth** hay **Better Auth**? (Khuyến nghị dùng Supabase vì đã có file thiết kế hệ thống Supabase trước đó).
2. Nếu dùng Supabase, bạn có muốn xóa Better Auth đi để source code sạch hơn không?

---
## Project Type
**WEB** (Next.js)

## Success Criteria
- Loại bỏ Auth provider dư thừa.
- Người dùng có thể đăng nhập / đăng ký thành công mà không bị lỗi.
- Đảm bảo các biến môi trường được cấu hình đầy đủ.

## Tech Stack
- Khả năng cao sẽ giữ lại **Supabase Auth** theo định hướng ban đầu.

## Task Breakdown (Dự kiến sau khi xác nhận)
1. **[Xóa dư thừa]** Xóa các trang / config của thư viện Auth bị loại bỏ.
2. **[Cấu hình môi trường]** Bổ sung biến môi trường cần thiết vào `.env`.
3. **[Hoàn thiện API Auth]** Thêm hoặc sửa Callback API Route để lưu session.
4. **[Kiểm thử]** Đảm bảo UI báo lỗi hoặc báo thành công chính xác.

## ✅ PHASE X (Verification)
- Sẽ thực hiện sau khi có quyết định chọn Provider.
