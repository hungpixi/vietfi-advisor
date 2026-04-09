"""Test clone với ref_text đúng từ subtitle"""
import sys, io, os
if sys.stdout and hasattr(sys.stdout, 'buffer'):
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from vieneu import Vieneu

from pathlib import Path
ROOT_DIR = Path(__file__).parent.parent
VOICE_DIR = str(ROOT_DIR / "voice_ref")

tts = Vieneu()
print("Model loaded\n")

# Clip 16-23s "Bay cao nào nhảy cao nào" — đúng nhất theo subtitle
tests = [
    {
        "clip": "zinzin_baycao.wav",
        "ref_text": "Bay cao nào nhảy cao nào bay cao nào nhảy cao nào",
        "out": "test_baycao_cloned.wav",
    },
    # Thử không dùng ref_text để model tự detect
    {
        "clip": "zinzin_baycao.wav",
        "ref_text": None,
        "out": "test_baycao_noreftext_cloned.wav",
    },
]

text = "Ơ vượt lọ rồi đúng không? Tao không nói gì đâu, tao chỉ hỏi thôi."

for t in tests:
    clip = os.path.join(VOICE_DIR, t["clip"])
    out  = os.path.join(VOICE_DIR, t["out"])
    kwargs = {"ref_audio": clip}
    if t["ref_text"]:
        kwargs["ref_text"] = t["ref_text"]
    try:
        print(f"Testing: {t['out']}")
        audio = tts.infer(text=text, **kwargs)
        tts.save(audio, out)
        print(f"  Saved: {t['out']}\n")
    except Exception as e:
        print(f"  Error: {e}\n")

print("Done! Check voice_ref/*.wav")
