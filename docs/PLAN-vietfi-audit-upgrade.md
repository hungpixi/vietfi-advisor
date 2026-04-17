# VietFi Advisor — Audit & Upgrade Plan

## Goal

Phân tích toàn bộ dự án VietFi Advisor, xác định vấn đề cần fix, và lập kế hoạch nâng cấp theo thứ tự ưu tiên. **Priority #1: Nâng cấp VieNeu TTS pipeline.**

---

## 🔍 Phân Tích Hiện Trạng (Audit Findings)

### A. TTS Pipeline — 3 vấn đề chính

| # | Vấn đề | Mức độ | File liên quan |
|---|--------|--------|----------------|
| 1 | **VieNeu TTS chưa integrate** — `generate_audio.py` output WAV ra `ui-prototype/assets/audio/`, hoàn toàn tách biệt với main app. Main app chỉ dùng `edge-tts-universal` (giọng Microsoft, không phải giọng Vẹt Vàng custom) | 🔴 Critical | `scripts/generate_audio.py`, `src/app/api/tts/route.ts` |
| 2 | **Data desync** — `quotes.json` (8 category, 41 quotes) trong `ui-prototype/` bị tách biệt với `scripted-responses.ts` (25 intents, 83+ responses). Hai nguồn data riêng biệt, không sync | 🟡 Medium | `ui-prototype/quotes.json`, `src/lib/scripted-responses.ts` |
| 3 | **VetVangChat thiếu TTS playback** — Component chat không có code phát audio, không call `/api/tts`, không dùng pre-rendered MP3 | 🔴 Critical | `src/components/vet-vang/VetVangChat.tsx` |
| 4 | **Voice ref thiếu** — `voice_ref/` chỉ có file `.vtt` subtitle, không có WAV. Scripts Python hardcode path `zinzin_clip_A.wav` không tồn tại | 🟡 Medium | `voice_ref/`, `scripts/test_clone.py` |
| 5 | **Scripts Python hardcode path cũ** — Dùng `d:\Cá nhân\Vọc vạch\...` thay vì relative path | 🟡 Medium | `scripts/list_voices.py`, `scripts/test_clone.py`, `scripts/debug_clone.py` |

### B. Deployment — Đã setup 80%, cần hoàn thiện

| # | Trạng thái | Chi tiết |
|---|-----------|----------|
| ✅ | FTP deploy workflow | `deploy-vinahost-ftp.yml` — build standalone → FTP upload → `tmp/restart.txt` restart |
| ✅ | CI workflow | `ci.yml` — lint + build trên push/PR |
| ✅ | `next.config.ts` | `output: "standalone"` đã set |
| ✅ | `server.cjs` | Standalone HTTP server cho cPanel Passenger |
| ⚠️ | **GitHub Secrets** | Cần verify đã set: `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD`, `FTP_SERVER_DIR`, `APP_ENV_PRODUCTION` |
| ⚠️ | **cPanel Node.js App** | Cần verify setup trên Vinahost |
| ⚠️ | **Cron jobs** | `vercel.json` cron sẽ KHÔNG chạy trên Vinahost — cần chuyển sang GitHub Actions scheduled workflows |

### C. Các vấn đề khác (Lower Priority)

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | `generate-tts-bank.ts` duplicate data thay vì import từ `scripted-responses.ts` | 🟡 |
| 2 | `Permissions-Policy` block microphone nhưng app cần mic cho voice input | 🟡 |
| 3 | `edge-tts-universal` package dùng Node.js runtime, không chạy trên Edge | 🔵 Info |

---

## 🧠 Brainstorm: VieNeu TTS Upgrade Strategy

### Option A: Pre-render ALL audio offline → Ship as static MP3

**Mô tả:** Generate tất cả scripted responses bằng VieNeu-TTS (local Python) trước khi deploy. Ship MP3 trong `public/audio/tts/`. Realtime TTS chỉ cho Gemini dynamic responses.

✅ **Pros:**
- Zero latency cho scripted responses
- Không cần server-side VieNeu runtime
- Đã có pipeline sẵn (`generate_audio.py`)
- Chất lượng voice clone nhất quán

❌ **Cons:**
- 83+ responses × ~40KB = ~3.3MB static files (chấp nhận được)
- Khi thêm response mới phải re-generate

📊 **Effort:** Low — Pipeline sẵn, chỉ cần sync data + integrate playback

---

### Option B: Server-side VieNeu TTS API (realtime)

**Mô tả:** Deploy VieNeu model lên server, tất cả TTS đều realtime. Thay `edge-tts-universal` bằng VieNeu API.

✅ **Pros:**
- Dynamic: mọi text đều có giọng Vẹt Vàng custom
- Không cần pre-render

❌ **Cons:**
- VieNeu model nặng (~1-2GB RAM), cPanel shared hosting KHÔNG đủ
- Latency cao (3-5s/request)
- Chi phí server riêng

📊 **Effort:** High — Cần infra riêng (GPU/VPS)

---

### Option C: Hybrid — Pre-render scripted + Edge TTS cho dynamic

**Mô tả:** Scripted responses dùng pre-rendered VieNeu audio. Dynamic Gemini responses dùng Edge TTS (HoaiMyNeural) làm fallback. Hai giọng khác nhau nhưng chấp nhận được.

✅ **Pros:**
- Best of both worlds
- Scripted = giọng Vẹt Vàng choe choé (personality)
- Dynamic = giọng HoaiMyNeural (tự nhiên, miễn phí)
- Không cần infra mới

❌ **Cons:**
- Hai giọng khác nhau (có thể tạo UX không nhất quán)

📊 **Effort:** Medium

---

### 💡 Recommendation

**Option A (Pre-render ALL) + fallback Edge TTS cho dynamic.** Lý do: tận dụng pipeline sẵn có, zero-cost, chất lượng tốt nhất cho scripted responses. Edge TTS backup cho dynamic content.

---

## 📋 Task Breakdown

### Phase 1: VieNeu TTS Upgrade (Priority #1)

- [ ] **Task 1.1:** Sync `quotes.json` data vào `scripted-responses.ts` — thêm 8 category mới (vuot-lo, mua-tra-sua, bo-app, shopee, het-tien, ghi-dung-gio, streak-7, tra-no, tiet-kiem) → Verify: `scripted-responses.ts` có đủ cả 25+ intents cũ + 8 category mới
- [ ] **Task 1.2:** Fix Python scripts path — Đổi hardcode path sang relative path, dùng `ROOT_DIR` từ script location → Verify: `python scripts/generate_audio.py --dry-run` chạy OK
- [ ] **Task 1.3:** Generate audio bank hoàn chỉnh — Chạy `generate_audio.py` với tất cả responses từ `scripted-responses.ts` (export ttsText ra JSON trước) → Verify: Thư mục `public/audio/tts/` có đủ MP3 cho mọi scripted response
- [ ] **Task 1.4:** Integrate TTS playback vào VetVangChat — Khi bot reply = scripted response, auto-play MP3 từ `/audio/tts/{id}.mp3`. Khi bot reply = Gemini dynamic, call `/api/tts` realtime → Verify: Mở Chat, nói "xin chào", nghe giọng Vẹt Vàng custom | Hỏi câu Gemini, nghe giọng Edge TTS
- [ ] **Task 1.5:** Add toggle mute/unmute trong VetVangChat → Verify: Button Volume2/VolumeX toggle audio on/off

### Phase 2: Deploy hoàn thiện

- [ ] **Task 2.1:** Verify GitHub Secrets đã set đúng (FTP_SERVER, FTP_USERNAME, FTP_PASSWORD, FTP_SERVER_DIR, APP_ENV_PRODUCTION) → Verify: Run workflow dispatch, check log "Validate deployment secrets" pass
- [ ] **Task 2.2:** Verify cPanel Node.js App setup (subdomain vietfi.phamphunguyenhung.com, startup file server.js, Node 20) → Verify: Truy cập https://vietfi.phamphunguyenhung.com trả về response (dù lỗi cũng OK = Node app đang chạy)
- [ ] **Task 2.3:** Chuyển Vercel cron → GitHub Actions scheduled workflows — Tạo `cron-jobs.yml` với 3 scheduled jobs gọi API endpoints production → Verify: Workflow chạy đúng schedule, logs show API call thành công
- [ ] **Task 2.4:** Fix CSP header cho microphone — Đổi `microphone=()` thành `microphone=(self)` trong `next.config.ts` → Verify: Voice input hoạt động trên production

### Phase 3: Code Cleanup & Audit (Lower Priority)

- [ ] **Task 3.1:** Remove duplicate data trong `generate-tts-bank.ts` — Import từ `scripted-responses.ts` thay vì duplicate 152 dòng
- [ ] **Task 3.2:** Cleanup `ui-prototype/` — Merge data cần thiết vào main app, archive hoặc xóa prototype
- [ ] **Task 3.3:** Security audit — Review API routes (rate limiting, input validation), check .gitignore, scan env leaks

---

## Verification Plan

### Automated Tests

```bash
# Unit tests hiện có
npm run test:run

# E2E tests
npm run test:e2e
```

### Manual Verification

1. **TTS Playback:** Mở chat Vẹt Vàng → Gõ "xin chào" → Phải nghe giọng custom (pre-rendered) → Gõ câu hỏi Gemini → Phải nghe giọng Edge TTS
2. **Deploy:** Push commit lên `master` → GitHub Actions build + FTP upload → Truy cập https://vietfi.phamphunguyenhung.com → App hiện trang chủ
3. **Cron:** Check GitHub Actions scheduled workflow chạy đúng lịch

---

## Dependencies / Blockers

| Blocker | Ai cần giải quyết |
|---------|-------------------|
| Voice ref WAV files (zinzin_clip_A.wav) cần cung cấp lại | User — copy vào `voice_ref/` |
| GitHub Secrets cần set | User — vào repo Settings > Secrets |
| cPanel Node.js App cần verify | User — check Vinahost cPanel |
| VieNeu Python venv cần setup | User — `pip install vieneu` trong `.venv-vieneu` |

---

## Notes

- `edge-tts-universal` dùng Node.js runtime (không phải Edge Runtime) → OK trên standalone server
- Standalone build (~20MB) FTP upload mấy vài phút, chấp nhận được
- Nếu Vinahost shared hosting quá yếu cho Next.js standalone, backup plan: deploy Vercel vercel.app + cron GitHub Actions
