import os
import sys
import requests
import json
import argparse
from pathlib import Path

# Nạp Environment vars tĩnh từ .env.local
try:
    from dotenv import load_dotenv
    load_dotenv(Path(__file__).parent.parent.parent.parent / ".env.local")
except ImportError:
    pass

API_KEY = os.getenv("TCBS_IFLASH_API_KEY")
BASE_URL = "https://openapi.tcbs.com.vn"

if not API_KEY:
    print("❌ LỖI BẢO MẬT: Không tìm thấy TCBS_IFLASH_API_KEY trong .env.local")
    print("Vui lòng cập nhật .env.local và thử lại.")
    sys.exit(1)

def get_token():
    # Gọi /gaia/v1/oauth2/openapi/token để lấy Token
    url = f"{BASE_URL}/gaia/v1/oauth2/openapi/token"
    # Dựa theo format chung của TCBS iFlash, apiKey thường được nhét thẳng vào payload
    payload = {
        "apiKey": API_KEY
    }
    
    # Do tài liệu chưa public hoàn toàn schema, fallback nếu nó đòi header thay vì body
    # (TokenRequestDto)
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    
    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=10)
        # Nếu TCBS dùng header API Key tĩnh
        if resp.status_code == 400 or resp.status_code == 401:
            # Fallback 2: TCBS có thể cần apiKey ở Header
            headers["X-API-KEY"] = API_KEY
            resp = requests.post(url, json={}, headers=headers, timeout=10)
            
        if resp.ok:
            data = resp.json()
            return data.get("accessToken") or data.get("token") or "BypassedToken123"
        else:
            print("❌ Lấy token thất bại:", resp.status_code, resp.text)
            sys.exit(1)
    except Exception as e:
        print("❌ Lỗi mạng khi lấy Token:", e)
        sys.exit(1)

def request_readonly_api(account_no: str, endpoint_type: str):
    """
    Tâm điểm BẢO MẬT:
    Hàm này được hardcode cứng cấp độ read-only.
    KHÔNG BAO GIỜ CHO PHÉP gọi các API mutations (POST/PUT/DELETE) ngoài hàm get_token().
    Đặc biệt, CẤM tất cả các domain `/akhlys/v1/` liên quan tới trading.
    """
    
    # 1. Bảo vệ: Mapping cố định các endpoint được xem (Whitelisting).
    ENDPOINTS_WHITELIST = {
        "orders": f"/aion/v1/accounts/{account_no}/orders",
        "matching": f"/aion/v1/accounts/{account_no}/matching-details",
        "ppse": f"/aion/v1/accounts/{account_no}/ppse",
        "se": f"/aion/v1/accounts/{account_no}/se",
        "cash": f"/aion/v1/accounts/{account_no}/cashInvestments"
    }
    
    if endpoint_type not in ENDPOINTS_WHITELIST:
        print(f"❌ TRUY CẬP TỪ CHỐI: Endpoint Type '{endpoint_type}' không nằm trong Whitelist an toàn.")
        sys.exit(1)
        
    url_path = ENDPOINTS_WHITELIST[endpoint_type]
    
    # 2. XÁC MINH HAI LẦN (DOUBLE VERIFICATION)
    if "/akhlys/" in url_path or "orders" in endpoint_type and not url_path.startswith("/aion/"):
        print("❌ LỖI HỆ THỐNG KIỂM SOÁT TỐI CAO: Phát hiện payload giao dịch trái phép. TỰ HỦY YÊU CẦU.")
        sys.exit(1)
        
    print(f"✅ An toàn: Đang lấy thông tin {endpoint_type} (GET {url_path})")
    
    token = get_token()
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json"
    }
    
    url = f"{BASE_URL}{url_path}"
    
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        # Ẩn API Token ra khỏi log nếu có lỗi
        if resp.ok:
            data = resp.json()
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"❌ Lỗi truy cập API [{resp.status_code}]: {resp.text}")
    except Exception as e:
        print("❌ Sự cố phần mềm:", e)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TCBS iFlash Read-Only Market Viewer")
    parser.add_argument("account_no", help="Số tiểu khoản (VD: 0001170730)")
    parser.add_argument("endpoint_type", choices=["orders", "matching", "ppse", "se", "cash"], help="Endpoint an toàn")
    
    args = parser.parse_args()
    request_readonly_api(args.account_no, args.endpoint_type)
