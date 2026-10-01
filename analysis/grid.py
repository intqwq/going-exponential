"""Drift-corrected beat grid: a 105-ish BPM base grid plus a smooth local shift estimated from the drum stem's
onset envelope in sliding windows. Bar phase from the lyric line starts (lines land on downbeats)."""
import numpy as np, librosa, json
y, sr = librosa.load('analysis/work/drums.wav', sr=22050, mono=True)
hop = 128
o = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
fps = sr / hop
dur = len(y) / sr
P, OFF = 0.5715, 0.168
def score(off, a, b):
    ts = np.arange(off, b, P); ts = ts[ts >= a]
    idx = np.round(ts * fps).astype(int); idx = idx[idx < len(o)]
    return o[idx].mean() if len(idx) else 0
cs, sh, wt = [], [], []
for c in np.arange(4, dur - 4, 3.0):
    a, b = c - 8, c + 8
    vals = [(score(OFF + d, a, b), d) for d in np.arange(-0.12, 0.12, 0.002)]
    s, d = max(vals)
    cs.append(c); sh.append(d); wt.append(s)
cs, sh, wt = map(np.array, (cs, sh, wt))
# drop weak windows (breakdowns), then smooth
ok = wt > np.percentile(wt, 25)
shs = np.interp(cs, cs[ok], sh[ok])
k = np.ones(5) / 5
shs = np.convolve(np.pad(shs, 2, mode='edge'), k, mode='valid')
beats = []
t = OFF
while t < dur:
    beats.append(t + np.interp(t, cs, shs)); t += P
beats = np.array(beats)
while beats[0] - P > 0: beats = np.insert(beats, 0, beats[0] - P)
a = json.load(open('app/public/data/audio.json'))
L = json.load(open('app/public/data/lyrics.json', encoding='utf-8'))['lines']
def bpos(t):  # fractional beat index
    return np.interp(t, beats, np.arange(len(beats)))
votes = np.zeros(4)
for l in L:
    if l['section'] in ('Opening', 'Verse 1', 'Verse 2', 'Verse 3', 'Verse 4', 'Future', 'Bridge'):
        bi = bpos(l['start']); r = int(np.round(bi)) % 4
        votes[r] += 1
ph = int(np.argmax(votes)); print('phase votes', votes, '->', ph)
a['beats'] = np.round(beats, 4).tolist()
a['downbeats'] = np.round(beats[ph::4], 4).tolist()
a['period'] = P
a['offset'] = round(float(beats[0]), 4)
json.dump(a, open('app/public/data/audio.json', 'w'))
print('shift profile (ms):', ' '.join(str(int(x * 1000)) for x in shs[::3]))
db = np.array(a['downbeats'])
for l in L:
    if l['i'] % 8 == 0 or l['i'] in (70, 94, 102, 103):
        bi = bpos(l['start']) - ph
        print(f"{l['start']:7.2f} bar {bi / 4:7.2f} {l['section']:14} {l['text'][:40]}")
