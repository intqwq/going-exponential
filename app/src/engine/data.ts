// Lyric timings + audio analysis (produced by analysis/analyze.py).
import { clamp } from './util';
import { smart } from './type';

export interface Word { w: string; start: number; end: number; p?: number }
/** A GPT-3 (r50k_base) token of a lyric line, timed inside its sung word (analysis/tokens.py). */
export interface Tok { t: string; start: number; end: number; word: number; id: number; ids?: number[] }
let tokP: Promise<Tok[][]> | null = null;
/** Tokens per global line index (Line.i). */
export const loadTokens = () => (tokP ??= fetch('data/tokens.json').then((r) => r.json()).then((d) => d.lines as Tok[][]));

export interface Line { i: number; section: string; text: string; start: number; end: number; words: Word[] }

export class Lyrics {
  lines: Line[];
  constructor(data: { lines: Line[] }) {
    this.lines = data.lines.map((l) => ({
      ...l,
      text: smart(l.text),
      words: l.words.map((w) => ({ ...w, w: smart(w.w) })),
    }));
  }
  /** Find a line by (a fragment of) its text; nth match. */
  get(frag: string, nth = 0): Line {
    const f = norm(frag);
    const m = this.lines.filter((l) => norm(l.text).includes(f));
    if (!m[nth]) throw new Error(`lyric not found: ${frag}`);
    return m[nth];
  }
  section(name: string, nth = 0): Line[] {
    const secs: Line[][] = [];
    let cur: Line[] | null = null, prev = '';
    for (const l of this.lines) {
      if (l.section !== prev) { cur = []; secs.push(cur); prev = l.section; }
      cur!.push(l);
    }
    return secs.filter((s) => s[0].section === name)[nth];
  }
  /** Line being sung at t (or the most recent). */
  at(t: number): Line | null {
    let best: Line | null = null;
    for (const l of this.lines) if (l.start <= t) best = l;
    return best;
  }
  static wordProgress(w: Word, t: number) {
    return clamp((t - w.start) / Math.max(0.05, w.end - w.start));
  }
  /** Characters of line sung so far (fractional). */
  static charProgress(l: Line, t: number) {
    let n = 0;
    for (let i = 0; i < l.words.length; i++) {
      const w = l.words[i];
      const p = Lyrics.wordProgress(w, t);
      n += p * w.w.length;
      if (p < 1) break;
      n += 1; // space
    }
    return n;
  }
  /** Word index sung at t within line (-1 before, words.length-1 after). */
  static wordIndex(l: Line, t: number) {
    let k = -1;
    for (let i = 0; i < l.words.length; i++) if (t >= l.words[i].start) k = i;
    return k;
  }
}
const norm = (s: string) => s.toLowerCase().replace(/[’‘']/g, "'").replace(/[“”"]/g, '"');

export interface AudioData {
  duration: number;
  bpm: number;
  period: number;
  offset: number;
  beats: number[];
  downbeats: number[];
  env: Record<string, number[]>;
  onsets: Record<string, [number, number][]>;
}

export class Audio {
  db0: number; // index of the first downbeat in beats[]
  constructor(public d: AudioData) {
    this.db0 = d.beats.findIndex((b) => Math.abs(b - d.downbeats[0]) < 1e-3);
    if (this.db0 < 0) this.db0 = 0;
  }
  get period() { return this.d.period; }
  /** Continuous beat index (0 at beats[0]); the grid is drift-corrected, so interpolate. */
  beatAt(t: number) {
    const b = this.d.beats, P = this.d.period;
    if (t <= b[0]) return (t - b[0]) / P;
    if (t >= b[b.length - 1]) return b.length - 1 + (t - b[b.length - 1]) / P;
    let lo = 0, hi = b.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (b[m] <= t) lo = m; else hi = m; }
    return lo + (t - b[lo]) / (b[hi] - b[lo]);
  }
  timeOfBeat(i: number) {
    const b = this.d.beats, P = this.d.period;
    if (i <= 0) return b[0] + i * P;
    if (i >= b.length - 1) return b[b.length - 1] + (i - (b.length - 1)) * P;
    const k = Math.floor(i), f = i - k;
    return b[k] + (b[k + 1] - b[k]) * f;
  }
  barAt(t: number) { return (this.beatAt(t) - this.db0) / 4; }
  timeOfBar(i: number) { return this.timeOfBeat(this.db0 + i * 4); }
  /** Nearest grid time (div subdivisions per beat). */
  snap(t: number, div = 1) { return this.timeOfBeat(Math.round(this.beatAt(t) * div) / div); }
  snapBar(t: number) { return this.timeOfBar(Math.round(this.barAt(t))); }
  prevBeat(t: number, div = 1) { return this.timeOfBeat(Math.floor(this.beatAt(t) * div + 1e-6) / div); }
  nextBeat(t: number, div = 1) { return this.timeOfBeat(Math.ceil(this.beatAt(t) * div - 1e-6) / div); }
  env(name: string, t: number) {
    const e = this.d.env[name];
    if (!e) return 0;
    const x = t * 100, i = Math.floor(x), f = x - i;
    if (i < 0) return e[0];
    if (i >= e.length - 1) return e[e.length - 1];
    return e[i] * (1 - f) + e[i + 1] * f;
  }
  /** Decaying pulses from onsets of a band. */
  hit(kind: string, t: number, half = 0.12, window = 1.0) {
    const o = this.d.onsets[kind];
    if (!o) return 0;
    let s = 0;
    // binary search to last onset <= t
    let lo = 0, hi = o.length - 1, k = -1;
    while (lo <= hi) { const m = (lo + hi) >> 1; if (o[m][0] <= t) { k = m; lo = m + 1; } else hi = m - 1; }
    for (let i = k; i >= 0 && t - o[i][0] < window; i--) s = Math.max(s, o[i][1] * Math.pow(0.5, (t - o[i][0]) / half));
    return s;
  }
  onsetsIn(kind: string, a: number, b: number) {
    return (this.d.onsets[kind] ?? []).filter((o) => o[0] >= a && o[0] < b);
  }
}
