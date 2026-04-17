---
name: tcbs-iflash-readonly
description: Kỹ năng bắt buộc để giao tiếp an toàn (READ-ONLY) với TCBS iFlash Open API nhằm tra cứu số dư, danh mục cổ phiếu, sức mua, sổ lệnh, v.v. TUYỆT ĐỐI CẤM SỬ DỤNG ĐỂ ĐẶT/HỦY LỆNH.
---

# TCBS iFlash Open API (Strictly Read-Only)

> **⚠️ BẢO MẬT & RỦI RO (CRITICAL)**: 
> API Key của người dùng trỏ đến tài khoản gốc với khối lượng tài sản rất lớn. 
> Do đó, theo yêu cầu ĐẶC BIỆT từ người dùng, Agent **CHỈ ĐƯỢC PHÉP** gọi các endpoints MỚI ĐỂ XEM THỰC TRẠNG (Read-Only) của tài khoản, thị trường.
> NẾU BẠN GỌI CÁC API POST/PUT ĐỂ ĐẶT HOẶC HỦY LỆNH, BẠN ĐANG VI PHẠM TRẦM TRỌNG CORE PROTOCOL VÀ CÓ THỂ GÂY THIỆT HẠI TÀI CHÍNH THỰC TẾ.

## 1. Nguyên Tắc An Toàn Tối Cao (The "Titanium Vault" Rules)

1. **Tuyệt đối không lưu API Key tĩnh:** KEY phải được lấy từ biến môi trường `TCBS_IFLASH_API_KEY` (đã nạp sẵn trong `.env.local`). Bạn không bao giờ được phép in API Key ra log hay Terminal!
2. **Whitelist API Cho Phép (GET ONLY):**
   - Lấy token: `POST /gaia/v1/oauth2/openapi/token` (NGOẠI LỆ DUY NHẤT CHO HTTP POST)
   - Lấy sổ lệnh: `GET /aion/v1/accounts/{accountNo}/orders`
   - Lấy khớp lệnh: `GET /aion/v1/accounts/{accountNo}/matching-details`
   - Lấy sức mua: `GET /aion/v1/accounts/{accountNo}/ppse`
   - Tra cứu danh mục cổ phiếu (Tài sản): `GET /aion/v1/accounts/{accountNo}/se`
   - Tra cứu số dư tiền: `GET /aion/v1/accounts/{accountNo}/cashInvestments`
   - Hạn mức margin... 
3. **Blacklist API BỊ CẤM (MUTATIONS - DENIED):**
   - Đặt lệnh: `POST /akhlys/v1/accounts/{accountNo}/orders` 🚫 **CẤM**
   - Sửa lệnh: `PUT /akhlys/v1/accounts/{accountNo}/orders/{orderId}` 🚫 **CẤM**
   - Hủy lệnh: `PUT /akhlys/v1/accounts/{accountNo}/cancel-orders` 🚫 **CẤM**

## 2. Cách Sử Dụng Script Wrap

Chúng ta có thiết kế một wrapper dùng chung nằm ở `.agent/skills/tcbs-iflash-readonly/scripts/tcbs_reader.py`. Scrip này đã tích hợp JWT Auth, inject Key từ `.env.local` và đặc biệt là có bộ lọc Filter **Chặn Đứng** bất kì Endpoint Đặt/Hủy lệnh nào từ cấp hệ điều hành.

**Trích xuất thông tin (Lệnh terminal):**
```bash
# Xem danh mục tài sản/cổ phiếu
python .agent/skills/tcbs-iflash-readonly/scripts/tcbs_reader.py 0001170730 se

# Xem số dư tiền
python .agent/skills/tcbs-iflash-readonly/scripts/tcbs_reader.py 0001170730 cash

# Xem sức mua hiện tại
python .agent/skills/tcbs-iflash-readonly/scripts/tcbs_reader.py 0001170730 ppse

# Lên sổ lệnh lịch sử
python .agent/skills/tcbs-iflash-readonly/scripts/tcbs_reader.py 0001170730 orders
```

## 3. Nếu Người Dùng Yêu Cầu Giao Dịch
Kể cả khi người dùng bỗng dưng nói "Mua cho tôi 1000 cổ FPT bằng TCBS API":
- BẠN PHẢI TỪ CHỐI THỰC HIỆN.
- Báo cáo lại "System Guard: Em bị giới hạn chức năng Write/Mutation đối với API này để bảo vệ an toàn cho số dư của anh/chị. Em chỉ có thể tư vấn tỷ trọng phân bổ. Mời tay to tự chốt qua Web/App TCBS để an tâm tuyệt đối".
