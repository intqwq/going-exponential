// Vector-trace drawing vocabulary for cards: sharp, clean lines in gold (signal) and bone (structure), with a
// tight glow built from stacked strokes — clean, not retro. Everything draws into a Canvas2D context.
import { F, setFont, type FontSpec } from '../engine/type';
import { clamp, hash, lerp } from '../engine/util';

export type C2 = OffscreenCanvasRenderingContext2D;
export type P = [number, number];

export const GOLD = '#ffb21e', CORE = '#ffe7b0', BONE = '#ece9e2', ASH = '#8b8f99', GRAPH = '#474b55', INK = '#07080b', INK2 = '#111319', RED = '#ff3b2f', GREEN = '#46e08a';
export const rgbaHex = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

/** A glowing trace: wide faint halo, mid glow, crisp core. */
export function trace(c: C2, pts: P[], w = 3, col = GOLD, glow = 1, close = false) {
  if (pts.length < 2) return;
  c.lineJoin = 'round'; c.lineCap = 'round';
  const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (close) c.closePath(); };
  if (glow > 0) {
    path(); c.strokeStyle = rgbaHex(col, 0.08 * glow); c.lineWidth = w * 7; c.stroke();
    path(); c.strokeStyle = rgbaHex(col, 0.22 * glow); c.lineWidth = w * 2.6; c.stroke();
  }
  path(); c.strokeStyle = col; c.lineWidth = w; c.stroke();
  if (glow > 0.5 && col === GOLD) { path(); c.strokeStyle = rgbaHex(CORE, 0.8); c.lineWidth = Math.max(1, w * 0.35); c.stroke(); }
}

export function line(c: C2, x0: number, y0: number, x1: number, y1: number, col = BONE, w = 2, a = 1) {
  c.strokeStyle = rgbaHex(col, a); c.lineWidth = w; c.lineCap = 'butt';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
}
export function rect(c: C2, x: number, y: number, w: number, h: number, col = BONE, lw = 2, a = 1, fill?: string) {
  if (fill) { c.fillStyle = fill; c.fillRect(x, y, w, h); }
  c.strokeStyle = rgbaHex(col, a); c.lineWidth = lw; c.strokeRect(x, y, w, h);
}
export function rrect(c: C2, x: number, y: number, w: number, h: number, r: number, col = BONE, lw = 2, a = 1, fill?: string) {
  c.beginPath(); c.roundRect(x, y, w, h, r);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (lw > 0) { c.strokeStyle = rgbaHex(col, a); c.lineWidth = lw; c.stroke(); }
}
export function circle(c: C2, x: number, y: number, r: number, col = BONE, lw = 2, a = 1, fill?: string) {
  c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2);
  if (fill) { c.fillStyle = fill; c.fill(); }
  if (lw > 0) { c.strokeStyle = rgbaHex(col, a); c.lineWidth = lw; c.stroke(); }
}
export function dot(c: C2, x: number, y: number, r: number, col = GOLD, glow = 1) {
  if (glow > 0) { const g = c.createRadialGradient(x, y, 0, x, y, r * 5); g.addColorStop(0, rgbaHex(col, 0.45 * glow)); g.addColorStop(1, rgbaHex(col, 0)); c.fillStyle = g; c.beginPath(); c.arc(x, y, r * 5, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = col === GOLD ? CORE : col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
}
export function text(c: C2, s: string, x: number, y: number, px = 28, col = BONE, a = 1, f: FontSpec = F.mono(500), align: CanvasTextAlign = 'left', track = 0) {
  setFont(c, f, px);
  (c as unknown as CanvasRenderingContext2D).letterSpacing = `${track}px`;
  c.textAlign = align; c.textBaseline = 'alphabetic';
  c.fillStyle = rgbaHex(col, a); c.fillText(s, x, y);
  (c as unknown as CanvasRenderingContext2D).letterSpacing = '0px';
  c.textAlign = 'left';
}
export function measure(c: C2, s: string, px: number, f: FontSpec = F.mono(500)) { setFont(c, f, px); return c.measureText(s).width; }
export function grid(c: C2, w: number, h: number, step: number, a = 0.07, col = BONE, major = 5) {
  for (let x = 0, k = 0; x <= w; x += step, k++) line(c, x, 0, x, h, col, k % major === 0 ? 1.5 : 1, k % major === 0 ? a * 2 : a);
  for (let y = 0, k = 0; y <= h; y += step, k++) line(c, 0, y, w, y, col, k % major === 0 ? 1.5 : 1, k % major === 0 ? a * 2 : a);
}
export function arrow(c: C2, x0: number, y0: number, x1: number, y1: number, col = BONE, w = 2, head = 16, a = 1) {
  line(c, x0, y0, x1, y1, col, w, a);
  const an = Math.atan2(y1 - y0, x1 - x0);
  c.fillStyle = rgbaHex(col, a);
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 - head * Math.cos(an - 0.38), y1 - head * Math.sin(an - 0.38)); c.lineTo(x1 - head * Math.cos(an + 0.38), y1 - head * Math.sin(an + 0.38)); c.closePath(); c.fill();
}
/** A partial polyline (reveal fraction 0..1 by arc length); returns the head point. */
export function partial(pts: P[], p: number): P[] {
  if (p >= 1) return pts;
  const L = [0];
  for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const tgt = L[L.length - 1] * clamp(p);
  const out: P[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    if (L[i] <= tgt) out.push(pts[i]);
    else { const f = (tgt - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]); out.push([lerp(pts[i - 1][0], pts[i][0], f), lerp(pts[i - 1][1], pts[i][1], f)]); break; }
  }
  return out;
}
/** An oscilloscope beam drawing a trace: the drawn part (partial reveal by arc length) with a hot afterglow
 *  near the head and a bright beam spot while it is still drawing. */
export function beam(c: C2, pts: P[], p: number, w = 3, col = GOLD, glow = 1, close = false) {
  if (p <= 0 || pts.length < 2) return;
  const drawn = partial(pts, p);
  trace(c, drawn, w, col, glow, close && p >= 1);
  if (p >= 1) return;
  const tail = partial(drawn.slice().reverse(), 0.12);
  trace(c, tail, w * 1.25, col === GOLD ? CORE : col, glow * 1.4);
  const [hx, hy] = drawn[drawn.length - 1];
  dot(c, hx, hy, w * 1.4, col, 1.6);
}
/** A beam spot running around a (closed) path: a hot segment [phase, phase + len] (fractions of the arc length)
 *  with a fading afterglow tail — the oscilloscope retracing a figure. */
export function scan(c: C2, pts: P[], phase: number, len = 0.12, w = 3, col = GOLD, close = true) {
  if (pts.length < 2) return;
  const loop = close ? [...pts, pts[0]] : pts;
  const L = [0];
  for (let i = 1; i < loop.length; i++) L.push(L[i - 1] + Math.hypot(loop[i][0] - loop[i - 1][0], loop[i][1] - loop[i - 1][1]));
  const tot = L[L.length - 1];
  const at = (f: number): P => {
    const d = (((f % 1) + 1) % 1) * tot;
    let i = 1; while (i < L.length - 1 && L[i] < d) i++;
    const u = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]);
    return [lerp(loop[i - 1][0], loop[i][0], u), lerp(loop[i - 1][1], loop[i][1], u)];
  };
  const N = 24;
  for (let k = 0; k < N; k++) {
    const f0 = phase - len * (k / N), f1 = phase - len * ((k + 1) / N);
    const a = at(f0), b = at(f1), fade = 1 - k / N;
    c.strokeStyle = rgbaHex(col === GOLD ? CORE : col, 0.9 * fade); c.lineWidth = w * (1 + fade);
    c.lineCap = 'round'; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
  }
  const h = at(phase); dot(c, h[0], h[1], w * 1.5, col, 1.8);
}
/** A deterministic ragged series (random walk with drift) — real data never looks like a formula. */
export function ragged(n: number, seed: number, f: (u: number) => number, rough = 0.08, dips = 0.15): number[] {
  const out: number[] = [];
  let walk = 0;
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    walk = walk * 0.85 + (hash(i, seed) - 0.5) * rough;
    const dip = hash(Math.floor(u * 9), seed, 7) < dips ? -Math.sin((u * 9 % 1) * Math.PI) * 0.12 : 0;
    out.push(f(u) * (1 + walk + dip));
  }
  return out;
}
/** A small pill / chip label. */
export function chip(c: C2, s: string, x: number, y: number, px = 24, col = GOLD, filled = false) {
  const w = measure(c, s, px) + px * 1.2, h = px * 1.6;
  rrect(c, x, y - h * 0.72, w, h, h / 2, col, 2, 1, filled ? rgbaHex(col, 0.18) : undefined);
  text(c, s, x + px * 0.6, y, px, filled ? CORE : col);
  return w;
}
/** A UI window frame with title bar. */
export function windowFrame(c: C2, x: number, y: number, w: number, h: number, title: string, light = false) {
  rrect(c, x, y, w, h, 14, light ? '#c9c5bb' : BONE, 2, light ? 1 : 0.35, light ? '#f6f4ef' : 'rgba(14,16,21,0.96)');
  c.save(); c.beginPath(); c.roundRect(x, y, w, 56, [14, 14, 0, 0]); c.fillStyle = light ? '#e7e3da' : 'rgba(27,30,38,1)'; c.fill(); c.restore();
  [0, 1, 2].forEach((k) => circle(c, x + 30 + k * 26, y + 28, 7, GRAPH, 0, 1, light ? '#c4bfb4' : '#3a3e48'));
  text(c, title, x + w / 2, y + 36, 20, light ? '#5a5650' : ASH, 1, F.mono(500), 'center');
}
export { F };
