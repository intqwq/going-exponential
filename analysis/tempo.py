import numpy as np, librosa, json
y, sr = librosa.load('analysis/work/drums.wav', sr=22050, mono=True)
hop = 128
o = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop)
fps = sr / hop
def score(P, off, a=0, b=None):
    b = b or len(o) / fps
    ts = np.arange(off, b, P); ts = ts[ts >= a]
    idx = np.round(ts * fps).astype(int); idx = idx[idx < len(o)]
    return o[idx].mean()
best = (0, 0, 0)
for P in np.arange(0.560, 0.585, 0.00005):
    for off in np.arange(0, P, 0.004):
        s = score(P, off)
        if s > best[0]: best = (s, P, off)
print('global best', best, 'bpm', 60 / best[1])
# half/double checks
P, off = best[1], best[2]
# windowed local offset residual (drift check)
for a in range(0, 290, 20):
    bo = max(((score(P, off + d, a, a + 20), d) for d in np.arange(-0.08, 0.08, 0.002)))
    print(a, 'local shift ms', round(bo[1] * 1000), 'score', round(bo[0], 2))
