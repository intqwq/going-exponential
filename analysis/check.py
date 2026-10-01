import json, numpy as np, sys
from pathlib import Path
W = Path('analysis/work')
a = json.load(open('app/public/data/audio.json'))
L = json.load(open('app/public/data/lyrics.json', encoding='utf-8'))['lines']
P, db0 = a['period'], a['downbeats'][0]
def ph(t): return ((t - db0) / P) % 4
# onset phase histogram (low band) relative to beat grid
lows = np.array([o[0] for o in a['onsets']['low'] if o[1] > 0.2])
fr = ((lows - a['beats'][0]) / P) % 1
h, _ = np.histogram(fr, bins=16, range=(0, 1)); print('low onset frac-beat hist', h.tolist())
fr4 = ((lows - db0) / P) % 4
h4, _ = np.histogram(fr4, bins=16, range=(0, 4)); print('low onset bar-pos hist (16ths of bar)', h4.tolist())
print('line start bar positions (beats):', ' '.join(f'{ph(l["start"]):.2f}' for l in L[:40]))
if len(sys.argv) > 1:
    import stable_whisper, soundfile as sf, librosa, torch
    y, sr = sf.read(str(W / 'vocals.wav'), dtype='float32')
    y = librosa.resample(y.mean(1), orig_sr=sr, target_sr=16000)
    m = stable_whisper.load_model('large-v3', device='cuda')
    r = m.transcribe(torch.from_numpy(np.ascontiguousarray(y)), language='en', word_timestamps=True)
    r.save_as_json(str(W / 'transcribe_raw.json'))
    for s in r.segments: print(f'{s.start:7.2f} {s.end:7.2f} {s.text}')
