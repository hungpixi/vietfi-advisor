"""Debug: Clone với vocal đã lọc nhạc, output rõ ràng từng bước"""
import sys, io, os
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from pathlib import Path
ROOT = Path(r"d:\Cá nhân\Vọc vạch\Cuộc thi\vietfi-advisor")
VOCAL  = ROOT / "voice_ref" / "zinzin_vocal.wav"
OUT    = ROOT / "voice_ref" / "zinzin_vocal_cloned_v2.wav"

print(f"Vocal file: {VOCAL}")
print(f"Exists: {VOCAL.exists()}, size: {VOCAL.stat().st_size:,} bytes")

from vieneu import Vieneu
print("\nLoading model...")
tts = Vieneu()
print("Loaded OK")

TEXT     = "Ơ vượt lọ rồi đúng không? Tao không nói gì đâu, tao chỉ hỏi thôi."
REF_TEXT = "bay cao nào nhảy cao nào bay cao nào nhảy cao nào"

print(f"\nInferring with:\n  text: {TEXT}\n  ref: {REF_TEXT}")
audio = tts.infer(
    text=TEXT,
    ref_audio=str(VOCAL),
    ref_text=REF_TEXT
)
print(f"Audio object: {type(audio)}, value: {audio}")
tts.save(audio, str(OUT))
print(f"\nSaved: {OUT}")
print(f"Size: {OUT.stat().st_size:,} bytes")
if OUT.stat().st_size < 10000:
    print("WARNING: File too small, likely empty/corrupt!")
else:
    print("OK — file looks good!")
