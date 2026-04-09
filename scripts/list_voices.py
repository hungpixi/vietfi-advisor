"""List preset voices và test generate từng voice để tìm giọng choe choé nhất"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pathlib import Path
from vieneu import Vieneu

ROOT_DIR = Path(__file__).parent.parent
OUT_DIR = ROOT_DIR / "voice_ref" / "presets"
OUT_DIR.mkdir(parents=True, exist_ok=True)

TEXT = "Ơ vượt lọ rồi đúng không? Tao không nói gì đâu, tao chỉ hỏi thôi."

print("Loading model...")
tts = Vieneu()
tts.close  # override to suppress NoneType error on exit

# List all preset voices
voices = tts.list_preset_voices()
print(f"\n=== Found {len(voices)} preset voices ===\n")
for desc, vid in voices:
    print(f"  [{vid}] {desc}")

print(f"\n=== Generating all voices for comparison ===\n")
for desc, vid in voices:
    out = OUT_DIR / f"{vid}.wav"
    if out.exists():
        print(f"Skip (cached): {vid}")
        continue
    try:
        voice_data = tts.get_preset_voice(vid)
        audio = tts.infer(text=TEXT, voice=voice_data)
        tts.save(audio, str(out))
        print(f"✅ {vid} — {desc}")
    except Exception as e:
        print(f"❌ {vid}: {e}")

print(f"\nDone! Check: {OUT_DIR}")
print("Nghe tất cả để tìm giọng choe choé / sắc nét nhất!")
