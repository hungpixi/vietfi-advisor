"""Test nhanh voice cloning VieNeu-TTS với clip ZinZin"""
import sys, io, os
if sys.stdout and hasattr(sys.stdout, 'buffer'):
    if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from vieneu import Vieneu

VOICE_DIR = r"d:\Cá nhân\Vọc vạch\Cuộc thi\vietfi-advisor\voice_ref"
OUT_DIR   = r"d:\Cá nhân\Vọc vạch\Cuộc thi\vietfi-advisor\voice_ref"

# Text mẫu của Vẹt Vàng
TEST_TEXT = "Ơ vượt lọ rồi đúng không? Tao không nói gì đâu, tao chỉ hỏi thôi."

CLIPS = [
    ("zinzin_clip_A.wav", "Bay cao nào nhảy cao nào, đỉnh cao không trở ngại"),
    ("zinzin_clip_B.wav", "Bay cao nào nhảy cao nào, đỉnh cao không trở ngại"),
    ("zinzin_clip_C.wav", "Bay cao nào nhảy cao nào, đỉnh cao không trở ngại"),
]

print("Loading model...")
try:
    tts = Vieneu()
    print("Model loaded OK\n")
except Exception as e:
    print(f"ERROR: {e}")
    sys.exit(1)

for clip_file, ref_text in CLIPS:
    clip_path = os.path.join(VOICE_DIR, clip_file)
    if not os.path.exists(clip_path):
        print(f"Skip {clip_file} - not found")
        continue
    
    out_name = clip_file.replace(".wav", "_cloned.wav")
    out_path = os.path.join(OUT_DIR, out_name)
    
    try:
        print(f"Cloning with {clip_file}...")
        audio = tts.infer(
            text=TEST_TEXT,
            ref_audio=clip_path,
            ref_text=ref_text
        )
        tts.save(audio, out_path)
        print(f"  Saved: {out_name}")
    except Exception as e:
        print(f"  ERROR: {e}")

print("\nDone! Check voice_ref/ folder for *_cloned.wav files")
