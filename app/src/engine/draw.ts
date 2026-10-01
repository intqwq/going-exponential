// Shared drawing vocabulary: karaoke lyric typography, the cursor, hairlines, labels.
import { rgba, type PaletteKey } from './palette';
import { F, setFont, type FontSpec, measure } from './type';
import { Lyrics, type Line, type Word } from './data';
import { clamp, ease, lerp, hash } from './util';

export type C2D = OffscreenCanvasRenderingContext2D;

const ls = (c: C2D, px: number) => ((c as unknown as CanvasRenderingContext2D).letterSpacing = `${px}px`);

export interface LyricStyle {
  font: FontSpec;
  size: number;
  tracking?: number;
  align?: 'left' | 'center' | 'right';
  /** colour of words not yet sung */
  dim?: string;
  /** colour of sung words */
  on?: string;
  /** colour of the word currently being sung (drawn to glow layer too) */
  hot?: PaletteKey;
  /** glow strength of the hot word (0 = none) */
  glow?: number;
  /** seconds before a word that it starts appearing (dim) */
  anticipate?: number;
  /** show unsung words at all */
  showUnsung?: boolean;
  /** entrance: words rise in by this many px */
  rise?: number;
  /** max width → wrap into rows */
  maxWidth?: number;
  lineHeight?: number;
  uppercase?: boolean;
  /** keep the hot colour on words once sung (else they fall back to `on`) */
  keepHot?: boolean;
}

interface Placed { w: Word; text: string; x: number; y: number; width: number }

/** Lay out a line's words into rows (greedy wrap). Returns placed words relative to (x,y) anchor. */
export function layoutWords(c: C2D, words: Word[], st: LyricStyle): { placed: Placed[]; rows: number; width: number; height: number } {
  const size = st.size;
  setFont(c, st.font, size);
  ls(c, st.tracking ?? 0);
  const space = c.measureText(' ').width;
  const maxW = st.maxWidth ?? 1e9;
  const lh = (st.lineHeight ?? 1.08) * size;
  const rows: { items: Placed[]; w: number }[] = [{ items: [], w: 0 }];
  for (const w of words) {
    const text = st.uppercase ? w.w.toUpperCase() : w.w;
    const ww = c.measureText(text).width;
    let row = rows[rows.length - 1];
    if (row.items.length && row.w + space + ww > maxW) {
      row = { items: [], w: 0 };
      rows.push(row);
    }
    const x = row.items.length ? row.w + space : 0;
    row.items.push({ w, text, x, y: (rows.length - 1) * lh, width: ww });
    row.w = x + ww;
  }
  ls(c, 0);
  const width = Math.max(...rows.map((r) => r.w));
  const placed: Placed[] = [];
  for (const r of rows) {
    const off = st.align === 'center' ? -r.w / 2 : st.align === 'right' ? -r.w : 0;
    for (const p of r.items) placed.push({ ...p, x: p.x + off });
  }
  return { placed, rows: rows.length, width, height: rows.length * lh };
}

/**
 * Karaoke line: words appear (dim) ahead of time, turn `on` as sung; the word being sung is drawn in
 * the hot colour with a left→right wipe, and duplicated on the glow layer.
 */
export function drawLyric(c: C2D, g: C2D | null, words: Word[], t: number, x: number, y: number, st: LyricStyle) {
  const L = layoutWords(c, words, st);
  const antic = st.anticipate ?? 0.35;
  const dim = st.dim ?? rgba('bone', 0.22);
  const on = st.on ?? rgba('bone', 1);
  const hot = st.hot ?? 'gold';
  const rise = st.rise ?? 0;
  setFont(c, st.font, st.size);
  ls(c, st.tracking ?? 0);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  if (g) { setFont(g, st.font, st.size); ls(g, st.tracking ?? 0); g.textAlign = 'left'; g.textBaseline = 'alphabetic'; }
  for (const p of L.placed) {
    const w = p.w;
    const appear = clamp((t - (w.start - antic)) / Math.max(0.05, antic));
    if (appear <= 0 && st.showUnsung === false) continue;
    const prog = Lyrics.wordProgress(w, t);
    const px = x + p.x, py = y + p.y + (1 - ease.outCubic(appear)) * rise;
    const showUn = st.showUnsung !== false;
    if (prog <= 0) {
      if (!showUn && appear <= 0) continue;
      c.globalAlpha = showUn ? appear : appear;
      c.fillStyle = dim;
      c.fillText(p.text, px, py);
      c.globalAlpha = 1;
      continue;
    }
    const singing = prog < 1;
    const col = singing || st.keepHot ? rgba(hot) : on;
    if (singing) {
      // dim underlay + wipe
      c.fillStyle = dim;
      c.fillText(p.text, px, py);
      c.save();
      c.beginPath();
      c.rect(px - 4, py - st.size * 1.2, p.width * ease.outQuad(prog) + 4, st.size * 1.6);
      c.clip();
      c.fillStyle = col;
      c.fillText(p.text, px, py);
      c.restore();
    } else {
      c.fillStyle = col;
      c.fillText(p.text, px, py);
    }
    if (g && (st.glow ?? 0.9) > 0 && (singing || st.keepHot)) {
      const gl = (st.glow ?? 0.9) * (singing ? 1 : 0.35);
      g.globalAlpha = gl;
      g.fillStyle = rgba(hot);
      g.save();
      g.beginPath();
      g.rect(px - 4, py - st.size * 1.2, p.width * (singing ? ease.outQuad(prog) : 1) + 4, st.size * 1.6);
      g.clip();
      g.fillText(p.text, px, py);
      g.restore();
      g.globalAlpha = 1;
    }
  }
  ls(c, 0);
  if (g) ls(g, 0);
  return L;
}

/** Karaoke by whole line. */
export function drawLine(c: C2D, g: C2D | null, line: Line, t: number, x: number, y: number, st: LyricStyle) {
  return drawLyric(c, g, line.words, t, x, y, st);
}

/** Typewriter reveal of a line (chars appear as sung). Returns caret x. */
export function typeLine(c: C2D, line: Line, t: number, x: number, y: number, f: FontSpec, size: number, col: string, tracking = 0) {
  const n = Math.floor(Lyrics.charProgress(line, t));
  const s = line.text.slice(0, Math.max(0, n));
  setFont(c, f, size);
  ls(c, tracking);
  c.textAlign = 'left';
  c.fillStyle = col;
  c.fillText(s, x, y);
  const w = c.measureText(s).width;
  ls(c, 0);
  return x + w;
}

/** The gold block cursor: the through-line of the video. */
export function cursor(c: C2D, g: C2D | null, x: number, y: number, h: number, t: number, opts: { blink?: boolean; w?: number; alpha?: number } = {}) {
  const on = opts.blink === false ? 1 : (Math.floor(t * 2.2) % 2 === 0 ? 1 : 0.15);
  const w = opts.w ?? h * 0.5;
  const a = (opts.alpha ?? 1) * on;
  c.fillStyle = rgba('gold', a);
  c.fillRect(x, y - h, w, h);
  if (g) {
    g.fillStyle = rgba('gold', a * 0.9);
    g.fillRect(x, y - h, w, h);
  }
}

export function hline(c: C2D, x0: number, x1: number, y: number, col: string, w = 1) {
  c.fillStyle = col;
  c.fillRect(Math.min(x0, x1), Math.round(y - w / 2), Math.abs(x1 - x0), w);
}
export function vline(c: C2D, x: number, y0: number, y1: number, col: string, w = 1) {
  c.fillStyle = col;
  c.fillRect(Math.round(x - w / 2), Math.min(y0, y1), w, Math.abs(y1 - y0));
}
export function seg(c: C2D, x0: number, y0: number, x1: number, y1: number, col: string, w = 1) {
  c.strokeStyle = col;
  c.lineWidth = w;
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(x1, y1);
  c.stroke();
}

/** Small mono label. */
export function label(c: C2D, s: string, x: number, y: number, col = rgba('ash', 0.9), size = 13, align: CanvasTextAlign = 'left', wght = 400, tracking = 1.5) {
  setFont(c, F.mono(wght), size);
  ls(c, tracking);
  c.textAlign = align;
  c.textBaseline = 'alphabetic';
  c.fillStyle = col;
  c.fillText(s, x, y);
  ls(c, 0);
}

/** Crop/registration mark. */
export function regMark(c: C2D, x: number, y: number, r: number, col: string) {
  c.strokeStyle = col;
  c.lineWidth = 1;
  c.beginPath();
  c.arc(x, y, r * 0.55, 0, Math.PI * 2);
  c.moveTo(x - r, y); c.lineTo(x + r, y);
  c.moveTo(x, y - r); c.lineTo(x, y + r);
  c.stroke();
}

/** Scrambled text reveal: characters flicker through glyphs before settling. p 0..1 */
export function scramble(s: string, p: number, seed = 1, charset = '01#%&*+=<>/\\ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
  const n = s.length;
  let out = '';
  for (let i = 0; i < n; i++) {
    const k = clamp(p * 1.4 - (i / n) * 0.4);
    if (k >= 1 || s[i] === ' ') out += s[i];
    else if (k <= 0) out += ' ';
    else out += charset[Math.floor(hash(i, seed, Math.floor(p * 40)) * charset.length)];
  }
  return out;
}

/** A glowing dot (point of light) on both layers. */
export function spark(c: C2D, g: C2D | null, x: number, y: number, r: number, key: PaletteKey = 'gold', a = 1) {
  c.fillStyle = rgba(key, a);
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
  if (g) {
    const grd = g.createRadialGradient(x, y, 0, x, y, r * 6);
    grd.addColorStop(0, rgba('sun', a));
    grd.addColorStop(0.2, rgba(key, a * 0.6));
    grd.addColorStop(1, rgba(key, 0));
    g.fillStyle = grd;
    g.beginPath(); g.arc(x, y, r * 6, 0, Math.PI * 2); g.fill();
  }
}

/** Odometer: each changed character rolls from `from` to `to` (p 0..1, staggered right→left). */
export function odometer(c: C2D, from: string, to: string, p: number, x: number, y: number, f: FontSpec, size: number, col: string, align: 'left' | 'right' = 'left') {
  setFont(c, f, size);
  c.textAlign = 'left';
  c.textBaseline = 'alphabetic';
  const n = Math.max(from.length, to.length);
  const A = from.padStart(n, ' '), B = to.padStart(n, ' ');
  const widths = [...B].map((ch, i) => Math.max(c.measureText(ch).width, c.measureText(A[i]).width));
  const total = widths.reduce((a, b) => a + b, 0);
  let xx = align === 'right' ? x - total : x;
  for (let i = 0; i < n; i++) {
    const k = ease.outExpo(clamp(p * 1.6 - ((n - 1 - i) / n) * 0.6));
    c.fillStyle = col;
    if (A[i] === B[i] || k >= 1) {
      c.fillText(B[i], xx, y);
    } else {
      c.save();
      c.beginPath();
      c.rect(xx - 2, y - size * 0.95, widths[i] + 4, size * 1.2);
      c.clip();
      c.globalAlpha = 1 - k;
      c.fillText(A[i], xx, y - k * size);
      c.globalAlpha = k;
      c.fillText(B[i], xx, y + (1 - k) * size);
      c.restore();
      c.globalAlpha = 1;
    }
    xx += widths[i];
  }
  return total;
}

/** Arrow from (x0,y0) to (x1,y1). */
export function arrow(c: C2D, x0: number, y0: number, x1: number, y1: number, col: string, w = 1.5, head = 9) {
  seg(c, x0, y0, x1, y1, col, w);
  const a = Math.atan2(y1 - y0, x1 - x0);
  c.fillStyle = col;
  c.beginPath();
  c.moveTo(x1, y1);
  c.lineTo(x1 - head * Math.cos(a - 0.4), y1 - head * Math.sin(a - 0.4));
  c.lineTo(x1 - head * Math.cos(a + 0.4), y1 - head * Math.sin(a + 0.4));
  c.closePath();
  c.fill();
}

/** Stroked rectangle (crisp hairline). */
export function box(c: C2D, x: number, y: number, w: number, h: number, col: string, lw = 1) {
  c.strokeStyle = col;
  c.lineWidth = lw;
  c.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
}

/** Partially drawn polyline (reveal 0..1 by length). Returns the head point. */
export function polyReveal(c: C2D, pts: [number, number][], p: number, col: string, w = 1.5): [number, number] {
  if (pts.length < 2) return pts[0] ?? [0, 0];
  const L: number[] = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const target = L[L.length - 1] * clamp(p);
  c.strokeStyle = col;
  c.lineWidth = w;
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(pts[0][0], pts[0][1]);
  let head: [number, number] = pts[0];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= target) { c.lineTo(pts[i][0], pts[i][1]); head = pts[i]; }
    else {
      const f = (target - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
      head = [lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)];
      c.lineTo(head[0], head[1]);
      break;
    }
  }
  c.stroke();
  return head;
}

export { measure, lerp };
