"""
VietFi Advisor — TTS Pre-render Script
=======================================
Dùng VieNeu-TTS + pitch shift để tạo giọng Vẹt Vàng choe choé.

Pipeline:
  1. VieNeu-TTS clone giọng từ zinzin_clip_A.wav → WAV gốc
  2. FFmpeg pitch shift lên N semitones → giọng choe choé
  3. Cache: mỗi quote chỉ generate 1 lần mãi mãi

Usage:
  # Setup venv riêng
  python -m venv .venv-vieneu
  .venv-vieneu\\Scripts\\activate
  pip install vieneu --extra-index-url https://pnnbao97.github.io/llama-cpp-python-v0.3.16/cpu/

  # Generate với giọng ZinZin clone + pitch shift +5 (default)
  python scripts/generate_audio.py

  # Tuỳ chỉnh pitch (3=nhẹ, 5=vừa, 7=choe choé mạnh)
  python scripts/generate_audio.py --pitch 7

  # Dùng voice ref khác
  python scripts/generate_audio.py --voice voice_ref/my_voice.wav --voice-text "transcript đây"

Arguments:
  --pitch N           Semitones để pitch shift lên (default: 5)
  --voice PATH        Path tới reference audio (default: voice_ref/zinzin_clip_A.wav)
  --voice-text TEXT   Transcript của voice ref (default: transcript của ZinZin clip A)
  --force             Regenerate ngay cả khi file đã tồn tại
  --dry-run           Chỉ list quotes, không generate thực
"""

import json
import os
import time
import argparse
import subprocess
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
ROOT_DIR   = SCRIPT_DIR.parent
QUOTES_FILE = ROOT_DIR / "scripts" / "static_responses.json"
OUTPUT_DIR  = ROOT_DIR / "public" / "audio" / "tts"

# ── CLI Args ────────────────────────────────────────────────────────────────
parser = argparse.ArgumentParser(description="VietFi TTS Pre-render")
parser.add_argument("--voice",      type=str, default=None,  help="Reference audio (default: zinzin_clip_A.wav)")
parser.add_argument("--voice-text", type=str, default=None,  help="Transcript of reference audio")
parser.add_argument("--pitch",      type=int, default=3,     help="Semitones to pitch up (default: 3)")
parser.add_argument("--noise",      type=str, default="A",   help="Noise level: A=nhẹ, B=vừa, C=khàn (default: A)")
parser.add_argument("--force",      action="store_true",     help="Regenerate even if cached")
parser.add_argument("--dry-run",    action="store_true",     help="List quotes only, no generation")
args = parser.parse_args()

# ── Defaults ────────────────────────────────────────────────────────────────
# Default: dùng zinzin_clip_A làm voice ref (giọng user đã chọn)
DEFAULT_VOICE      = ROOT_DIR / "voice_ref" / "zinzin_clip_A.wav"
DEFAULT_VOICE_TEXT = "cái tay cái tay cái tay bắt lấy cái tay"

# ── Pitch + Noise pipeline ───────────────────────────────────────────────────
NOISE_FILTERS = {
    "A": "acrusher=level_in=4:level_out=4:bits=12:mode=log:aa=1,aeval=val(0)+0.003*random(0)|val(1)+0.003*random(1),highpass=f=200,lowpass=f=7000",
    "B": "acrusher=level_in=5:level_out=4:bits=11:mode=log:aa=1,aeval=val(0)+0.006*random(0)|val(1)+0.006*random(1),equalizer=f=3000:width_type=o:width=2:g=3,highpass=f=250",
    "C": "acrusher=level_in=6:level_out=4:bits=10:mode=log:aa=1,aeval=val(0)+0.012*random(0)|val(1)+0.012*random(1),equalizer=f=2500:width_type=o:width=2:g=4",
}

def apply_voice_fx(src: Path, pitch_semitones: int, noise_level: str) -> bool:
    """Pitch shift + add noise to audio and export to MP3. Returns True if OK."""
    rate_mult = 2 ** (pitch_semitones / 12)
    tempo_inv = 1 / rate_mult
    noise_filter = NOISE_FILTERS.get(noise_level.upper(), NOISE_FILTERS["A"])
    out_mp3 = src.with_suffix(".mp3")
    filter_chain = f"asetrate=22050*{rate_mult:.4f},aresample=22050,atempo={tempo_inv:.4f},{noise_filter}"
    result = subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-af", filter_chain, "-ar", "22050", "-b:a", "64k", str(out_mp3)],
        capture_output=True
    )
    if result.returncode == 0 and out_mp3.exists():
        src.unlink(missing_ok=True)  # overwrite original với file đã xử lý
        return True
    src.unlink(missing_ok=True)
    return False

# ── Load quotes ─────────────────────────────────────────────────────────────
with open(QUOTES_FILE, encoding="utf-8") as f:
    responses = json.load(f)

print(f"📋 Loaded {len(responses)} responses from {QUOTES_FILE.name}")

if args.dry_run:
    for item in responses:
        id = item["id"]
        text = item["ttsText"]
        out = OUTPUT_DIR / f"{id}.mp3"
        status = "✅ EXISTS" if out.exists() else "⬜ MISSING"
        print(f"  {status}  {id}.mp3 — {text[:60]}...")
    print("\nDry run done. No files generated.")
    exit(0)

# ── Init TTS ────────────────────────────────────────────────────────────────
print("\n🦜 Loading VieNeu-TTS model...")
try:
    from vieneu import Vieneu
    tts = Vieneu()
    print("✅ Model loaded\n")
except ImportError:
    print("❌ vieneu không tìm thấy!")
    print("   Chạy: pip install vieneu --extra-index-url https://pnnbao97.github.io/llama-cpp-python-v0.3.16/cpu/")
    exit(1)

# ── Voice clone setup ────────────────────────────────────────────────────────
voice_kwargs = {}
voice_path = Path(args.voice) if args.voice else DEFAULT_VOICE
voice_text  = args.voice_text or DEFAULT_VOICE_TEXT

if voice_path.exists():
    voice_kwargs = {
        "ref_audio": str(voice_path),
        "ref_text":  voice_text,
    }
    print(f"🎙️  Voice ref : {voice_path.name}")
else:
    print(f"⚠️  Voice ref không tìm thấy ({voice_path.name}), dùng default voice")

noise_desc = {"A": "nhẹ", "B": "vừa", "C": "khàn"}.get(args.noise.upper(), "?")
print(f"🎚️  Pitch     : +{args.pitch} semitones")
print(f"🔊  Noise     : Level {args.noise} ({noise_desc})\n")

# ── Generate ─────────────────────────────────────────────────────────────────
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
generated = 0
skipped   = 0
errors    = 0
start     = time.time()

for i, item in enumerate(responses):
    id = item["id"]
    text = item["ttsText"]
    out_wav = OUTPUT_DIR / f"{id}.wav"
    out_mp3 = OUTPUT_DIR / f"{id}.mp3"
    
    # Skip nếu đã có mp3 và không force
    if out_mp3.exists() and not args.force:
        print(f"   ⏭ Skip (cached): {out_mp3.name}")
        skipped += 1
        continue
    
    try:
        print(f"   🎤 [{i+1}/{len(responses)}] {id}: {text[:55]}...")
        audio = tts.infer(text=text, **voice_kwargs)
        tts.save(audio, str(out_wav))
        # Pitch shift + noise in-place
        ok = apply_voice_fx(out_wav, args.pitch, args.noise)
        status = f"+{args.pitch}st noise-{args.noise}" if ok else "(fx failed)"
        print(f"   ✅ {out_mp3.name} [{status}]")
        generated += 1
    except Exception as e:
        print(f"   ❌ Error on {id}: {e}")
        errors += 1

elapsed = time.time() - start
print(f"{'='*50}")
print(f"✅ Generated : {generated}")
print(f"⏭ Skipped   : {skipped} (already cached)")
print(f"❌ Errors    : {errors}")
print(f"⏱ Time      : {elapsed:.1f}s")
print(f"📂 Output    : {OUTPUT_DIR}")

if generated > 0:
    print(f"\n🚀 Mở vet-demo.html để thử giọng!")
