"""Audio analysis for the PV.

1. Demucs (htdemucs) separates the vocal stem.
2. stable-ts force-aligns the known lyrics (lyrics.txt) to the vocal stem -> word timings.
3. librosa: tempo, beat grid, downbeats, onsets (kick/snare/hat bands), loudness envelopes.

Outputs app/public/data/lyrics.json and app/public/data/audio.json.
Run:  <venv>/python analysis/analyze.py [--skip-demucs] [--model large-v3]
"""
import argparse, json, os, re, sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
MP3 = ROOT / 'app' / 'public' / 'song.mp3'  # the song (same file as 'Going Exponential.mp3')
WORK = ROOT / 'analysis' / 'work'
OUT = ROOT / 'app' / 'public' / 'data'


def load_lyrics():
    txt = (ROOT / 'lyrics.txt').read_text(encoding='utf-8')
    lines, sections, sec = [], [], None
    for raw in txt.splitlines():
        s = raw.strip()
        if not s or s == 'GOING EXPONENTIAL':
            continue
        m = re.match(r'^\[(.+)\]$', s)
        if m:
            sec = m.group(1)
            continue
        lines.append({'text': s, 'section': sec})
    return lines


def separate():
    WORK.mkdir(parents=True, exist_ok=True)
    voc = WORK / 'vocals.wav'
    if voc.exists():
        return voc
    import torch, soundfile as sf
    from demucs.pretrained import get_model
    from demucs.apply import apply_model
    import av
    c = av.open(str(MP3))
    frames = []
    res = av.AudioResampler(format='fltp', layout='stereo', rate=44100)
    for fr in c.decode(audio=0):
        for r in res.resample(fr):
            frames.append(r.to_ndarray())
    wav = np.concatenate(frames, axis=1).astype(np.float32)
    sf.write(str(WORK / 'mix.wav'), wav.T, 44100)
    model = get_model('htdemucs')
    model.eval()
    dev = 'cuda' if torch.cuda.is_available() else 'cpu'
    x = torch.from_numpy(wav)[None]
    ref = x.mean(1)
    x = (x - ref.mean()) / ref.std()
    with torch.no_grad():
        out = apply_model(model, x.to(dev), device=dev, split=True, overlap=0.25, progress=True)[0]
    out = out * ref.std() + ref.mean()
    for i, name in enumerate(model.sources):
        sf.write(str(WORK / f'{name}.wav'), out[i].cpu().numpy().T, 44100)
    return voc


def align(voc, lines, model_name):
    import stable_whisper
    model = stable_whisper.load_model(model_name, device='cuda')
    # text for alignment: plain words
    text = '\n'.join(l['text'] for l in lines)
    # whisper would shell out to ffmpeg for a path; hand it decoded 16 kHz mono instead
    import soundfile as sf, librosa, torch
    y, sr = sf.read(str(voc), dtype='float32')
    y = librosa.resample(y.mean(1) if y.ndim > 1 else y, orig_sr=sr, target_sr=16000)
    audio = torch.from_numpy(np.ascontiguousarray(y))
    res = model.align(audio, text, language='en', original_split=True)
    res.save_as_json(str(WORK / 'align_raw.json'))
    # also a free transcription for sanity checks
    tr = model.transcribe(audio, language='en', word_timestamps=True)
    tr.save_as_json(str(WORK / 'transcribe_raw.json'))
    return res


def build_lyrics(lines):
    raw = json.loads((WORK / 'align_raw.json').read_text(encoding='utf-8'))
    words = []
    for seg in raw['segments']:
        for w in seg['words']:
            words.append({'w': w['word'].strip(), 'start': w['start'], 'end': w['end'], 'p': w.get('probability', 1.0)})
    # map aligned words back onto our lines (same tokenization as the text we passed: whitespace split)
    out, k = [], 0
    for i, l in enumerate(lines):
        toks = l['text'].split()
        ws = []
        for tok in toks:
            if k >= len(words):
                break
            a = words[k]
            ws.append({'w': tok, 'start': round(a['start'], 3), 'end': round(a['end'], 3), 'p': round(a['p'], 3)})
            k += 1
        out.append({'i': i, 'section': l['section'], 'text': l['text'], 'start': ws[0]['start'] if ws else 0,
                    'end': ws[-1]['end'] if ws else 0, 'words': ws})
    if k != len(words):
        print('WARNING: word count mismatch', k, len(words), file=sys.stderr)
    return out


def rhythm():
    import librosa, soundfile as sf
    y, sr = librosa.load(str(WORK / 'mix.wav'), sr=22050, mono=True)
    dur = len(y) / sr
    hop = 256
    oenv = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop, aggregate=np.median)
    tempo, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=sr, hop_length=hop, units='time', tightness=200)
    tempo = float(np.atleast_1d(tempo)[0])
    beats = np.asarray(beats)
    # refine: fit a straight grid (the song is presumably at a fixed tempo, from a DAW)
    idx = np.arange(len(beats))
    A = np.vstack([idx, np.ones_like(idx)]).T
    period, off = np.linalg.lstsq(A, beats, rcond=None)[0]
    resid = beats - (idx * period + off)
    print(f'tempo {tempo:.3f} bpm, grid period {period:.5f}s ({60/period:.3f} bpm), resid std {resid.std()*1000:.1f} ms')

    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)
    def band(lo, hi):
        m = (freqs >= lo) & (freqs < hi)
        e = S[m].sum(0)
        return e
    low, mid, high = band(30, 150), band(150, 2000), band(5000, 11000)

    # downbeat phase: which beat mod 4 carries the most low-band energy
    t_frames = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=hop)
    lowflux = np.maximum(0, np.diff(low, prepend=low[0]))
    grid = off + period * np.arange(-4, int(dur / period) + 4)
    grid = grid[(grid >= -0.01) & (grid < dur)]
    score = np.zeros(4)
    for j, b in enumerate(grid):
        fi = int(round(b * sr / hop))
        if 0 <= fi < len(lowflux):
            score[j % 4] += lowflux[max(0, fi - 2):fi + 3].max()
    ph = int(np.argmax(score))
    downbeats = grid[ph::4]

    def env(x, name):
        x = librosa.util.normalize(np.log1p(x / (np.percentile(x, 50) + 1e-9)), norm=np.inf)
        # resample to 100 Hz
        tt = np.arange(0, dur, 0.01)
        return np.round(np.interp(tt, t_frames[:len(x)], x), 3).tolist()

    def onsets(x, delta):
        fl = np.maximum(0, np.diff(np.log1p(x), prepend=np.log1p(x[0])))
        fl = fl / (fl.max() + 1e-9)
        pk = librosa.util.peak_pick(fl, pre_max=3, post_max=3, pre_avg=10, post_avg=10, delta=delta, wait=6)
        return [[round(float(t_frames[p]), 3), round(float(fl[p]), 3)] for p in pk]

    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=hop)[0]
    stems = {}
    for name in ['vocals', 'drums', 'bass', 'other']:
        p = WORK / f'{name}.wav'
        if p.exists():
            ys, _ = librosa.load(str(p), sr=sr, mono=True)
            stems[name] = librosa.feature.rms(y=ys, frame_length=2048, hop_length=hop)[0]

    data = {
        'duration': round(dur, 3),
        'bpm': round(60 / period, 3),
        'period': round(float(period), 5),
        'offset': round(float(off), 4),
        'beats': np.round(grid, 3).tolist(),
        'downbeats': np.round(downbeats, 3).tolist(),
        'downbeatPhase': ph,
        'env': {'rms': env(rms, 'rms'), 'low': env(low, 'low'), 'mid': env(mid, 'mid'), 'high': env(high, 'high'),
                **{k: env(v, k) for k, v in stems.items()}},
        'onsets': {'low': onsets(low, 0.08), 'high': onsets(high, 0.08), 'all': [[round(float(t), 3), 1] for t in librosa.onset.onset_detect(onset_envelope=oenv, sr=sr, hop_length=hop, units='time')]},
    }
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', default='large-v3')
    ap.add_argument('--skip-align', action='store_true')
    ap.add_argument('--skip-rhythm', action='store_true')
    a = ap.parse_args()
    OUT.mkdir(parents=True, exist_ok=True)
    lines = load_lyrics()
    voc = separate()
    if not a.skip_align:
        align(voc, lines, a.model)
    lyr = build_lyrics(lines)
    (OUT / 'lyrics.json').write_text(json.dumps({'lines': lyr}, ensure_ascii=False, indent=1), encoding='utf-8')
    if not a.skip_rhythm:
        au = rhythm()
        (OUT / 'audio.json').write_text(json.dumps(au), encoding='utf-8')


if __name__ == '__main__':
    main()
