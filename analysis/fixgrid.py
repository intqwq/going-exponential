"""Refine the beat grid: shift to the median kick offset, and set the bar phase from the vocal line starts
(opening lines land on the downbeat). Also clamp inflated word ends (held into instrumentals)."""
import json, numpy as np
a = json.load(open('app/public/data/audio.json'))
Lp = 'app/public/data/lyrics.json'
L = json.load(open(Lp, encoding='utf-8'))
P = a['period']
beats = np.array(a['beats'])
lows = np.array([o[0] for o in a['onsets']['low'] if o[1] > 0.2])
d = []
for t in lows:
    k = np.round((t - beats[0]) / P)
    r = t - (beats[0] + k * P)
    if abs(r) < 0.1: d.append(r)
shift = float(np.median(d)); print('grid shift', round(shift * 1000, 1), 'ms from', len(d), 'onsets')
b0 = beats[0] + shift
n0 = int(np.floor(b0 / P)); b0 -= n0 * P  # first beat >= 0
dur = a['duration']
grid = b0 + P * np.arange(0, int((dur - b0) / P) + 1)
# bar phase from the first 8 lyric lines (Opening): choose phase that puts line starts nearest downbeats
starts = np.array([l['start'] for l in L['lines'][:8]])
best = min(range(4), key=lambda ph: np.mean(np.abs(((starts - (b0 + ph * P)) / (4 * P) + 0.5) % 1 - 0.5)))
print('downbeat phase', best)
a['beats'] = np.round(grid, 4).tolist()
a['downbeats'] = np.round(grid[best::4], 4).tolist()
a['offset'] = round(b0, 4)
json.dump(a, open('app/public/data/audio.json', 'w'))
for l in L['lines']:
    for i, w in enumerate(l['words']):
        nxt = l['words'][i + 1]['start'] if i + 1 < len(l['words']) else None
        mx = 1.6 if nxt is None else 99
        if w['end'] - w['start'] > mx: w['end'] = round(w['start'] + mx, 3)
    l['end'] = l['words'][-1]['end']
json.dump(L, open(Lp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
db = np.array(a['downbeats'])
for l in L['lines']:
    if l['i'] in (0, 8, 16, 24, 40, 54, 68, 72, 82, 94, 102, 103):
        print(f"{l['start']:7.2f} bar {(l['start'] - db[0]) / (4 * P):6.2f} {l['section']:14} {l['text'][:40]}")
