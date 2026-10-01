// OUTRO — "Next token: / Let there be…".
// The camera flies back through the film: a corridor of callback cards (tape → Go → 175B → protein → the curve →
// the god → wafer → racks → Lean ✓ → det J → RESET → "Hello."), arriving at a prompt. "Let there be" is typed
// word by word; the next token is never typed — the cursor swells until the frame becomes light. Out of the white:
// the title page, the composer's credit, then black.
import * as THREE from 'three';
import type { RT } from '../engine/gl';
import type { Frame } from './_base';
import { ShotPlate, card, type Shot } from './shots';
import type { Line } from '../engine/data';
import { F, setFont } from '../engine/type';
import { trace, beam, line, rect, rrect, circle, dot, text, measure, ragged, partial, rgbaHex, GOLD, CORE, BONE, ASH, GRAPH, GREEN, type C2, type P } from './vec';
import { god } from './figures';
import { clamp, ease, prog, lerp, hash, pulse } from '../engine/util';
import type { PostOverride } from '../engine/scene';

type Vig = [string, (c: C2, w: number, h: number, t: number) => void];

const VIGS: Vig[] = [
  ['1936 · a tape and a table', (c, w, h, t) => {
    for (let k = 0; k < 11; k++) { const x = 60 + k * 62; rect(c, x, h / 2 - 40, 62, 80, BONE, 2, 0.8); text(c, String((hash(k, 3) > 0.5) ? 1 : 0), x + 31, h / 2 + 14, 40, BONE, 1, F.mono(500), 'center'); }
    const hx = 60 + (Math.floor(t * 2) % 11) * 62 + 31;
    trace(c, [[hx - 26, h / 2 - 90], [hx + 26, h / 2 - 90], [hx, h / 2 - 50]], 4, GOLD, 1, true);
  }],
  ['2016 · move 37', (c, w, h) => {
    const s = 44, x0 = w / 2 - 4 * s, y0 = h / 2 - 4 * s;
    for (let k = 0; k < 9; k++) { line(c, x0, y0 + k * s, x0 + 8 * s, y0 + k * s, BONE, 1.5, 0.5); line(c, x0 + k * s, y0, x0 + k * s, y0 + 8 * s, BONE, 1.5, 0.5); }
    for (let k = 0; k < 16; k++) { const i = Math.floor(hash(k, 1) * 9), j = Math.floor(hash(k, 2) * 9); circle(c, x0 + i * s, y0 + j * s, 18, BONE, 2, 0.9, k % 2 ? 'rgba(236,233,226,0.9)' : 'rgba(7,8,11,1)'); }
    circle(c, x0 + 5 * s, y0 + 2 * s, 18, BONE, 2, 1, 'rgba(7,8,11,1)'); circle(c, x0 + 5 * s, y0 + 2 * s, 34, GOLD, 4, 1);
    text(c, '37', x0 + 5 * s + 44, y0 + 2 * s - 24, 34, GOLD, 1, F.mono(700));
  }],
  ['2020 · one-seventy-five billion', (c, w, h, t) => {
    const n = Math.min(175e9, Math.floor(175e9 * clamp(0.7 + t * 0.1)));
    text(c, n.toLocaleString('en-US'), w / 2, h / 2 + 30, 76, GOLD, 1, F.mono(700), 'center');
    text(c, 'PARAMETERS', w / 2, h / 2 + 100, 26, ASH, 1, F.mono(600), 'center', 6);
  }],
  ['2020 · AlphaFold', (c, w, h) => {
    // helix (as a sine ribbon) into a β-hairpin with arrowheads
    const hel: P[] = []; for (let s = 0; s <= 80; s++) { const u = s / 80; hel.push([120 + u * 300, h / 2 - 40 + Math.sin(u * Math.PI * 7) * 40]); }
    trace(c, hel, 6, GOLD, 1);
    trace(c, [[420, h / 2 - 40], [480, h / 2 + 60], [700, h / 2 + 60]], 4, BONE, 0);
    trace(c, [[690, h / 2 + 40], [720, h / 2 + 60], [690, h / 2 + 80]], 4, BONE, 0);
    trace(c, [[700, h / 2 + 130], [480, h / 2 + 130]], 4, BONE, 0);
    trace(c, [[490, h / 2 + 110], [460, h / 2 + 130], [490, h / 2 + 150]], 4, BONE, 0);
  }],
  ['the curve', (c, w, h, t) => {
    const ys = ragged(80, 4, (u) => Math.exp(u * 4) / Math.exp(4), 0.1, 0.2);
    const pts: P[] = ys.map((y, k) => [60 + (k / 79) * (w - 120), h - 60 - y * (h - 140)]);
    line(c, 60, h - 60, w - 60, h - 60, BONE, 2, 0.5); line(c, 60, 60, 60, h - 60, BONE, 2, 0.5);
    beam(c, pts, clamp(0.5 + t * 0.15), 5, GOLD, 1.2);
  }],
  ['the god behind the API', (c, w, h, t) => { god(c, w / 2, h - 10, h * 0.9, { open: 1, glow: 1, aura: 0.6, t }); }],
  ['2 nm', (c, w, h) => {
    const cx = w / 2, cy = h / 2, R = 200;
    circle(c, cx, cy, R, GOLD, 4, 1);
    for (let a = -R + 25; a < R; a += 25) { const s = Math.sqrt(R * R - a * a); line(c, cx + a, cy - s, cx + a, cy + s, BONE, 1, 0.35); line(c, cx - s, cy + a, cx + s, cy + a, BONE, 1, 0.35); }
    line(c, cx - 30, cy + R - 4, cx + 30, cy + R - 4, BONE, 4, 1);
  }],
  ['the hall', (c, w, h, t) => {
    for (let k = 0; k < 6; k++) { const x = 70 + k * 115; rect(c, x, 70, 90, h - 140, BONE, 2, 0.7); for (let u = 0; u < 14; u++) { line(c, x + 8, 90 + u * 22, x + 82, 90 + u * 22, BONE, 1, 0.25); dot(c, x + 78, 96 + u * 22, 3, hash(k, u, Math.floor(t * 6)) > 0.4 ? GOLD : GRAPH, 0.6); } }
  }],
  ['Lean 4 · NavierStokes', (c, w, h) => {
    const L = ['theorem blowup :', '  ∃ u, sup ‖u‖₂ < ∞ ∧', '    limsup ‖u‖∞ = ∞ := by', '  exact ⟨u★, energy_bd, blow⟩'];
    L.forEach((s, k) => text(c, s, 60, 110 + k * 54, 34, k === 0 ? GOLD : BONE, 1, F.mono(500)));
    text(c, 'No goals ✓', 60, h - 50, 36, GREEN, 1, F.mono(700));
  }],
  ['Jacobian · 1939 → now', (c, w, h) => {
    text(c, 'det J ≡ −1/9', w / 2, h / 2, 96, GOLD, 1, F.serif(true), 'center');
    text(c, '3 points ↦ (−20/9, −13/9, 0)', w / 2, h / 2 + 80, 30, BONE, 1, F.mono(500), 'center');
  }],
  ['RESET', (c, w, h, t) => {
    const cx = w / 2, cy = h / 2 + 10;
    c.strokeStyle = rgbaHex(BONE, 0.7); c.lineWidth = 3; c.beginPath(); c.ellipse(cx, cy + 40, 210, 70, 0, 0, Math.PI * 2); c.stroke();
    c.strokeStyle = rgbaHex(GOLD, 1); c.lineWidth = 5; c.beginPath(); c.ellipse(cx, cy, 170, 56, 0, 0, Math.PI * 2); c.stroke();
    line(c, cx - 170, cy, cx - 170, cy + 30, GOLD, 5, 1); line(c, cx + 170, cy, cx + 170, cy + 30, GOLD, 5, 1);
    c.beginPath(); c.ellipse(cx, cy + 30, 170, 56, 0, 0, Math.PI); c.stroke();
    text(c, 'RESET', cx, cy + 12, 50, GOLD, 0.6 + 0.4 * Math.sin(t * 6), F.mono(800), 'center', 8);
  }],
  ['', (c, w, h, t) => {
    rrect(c, 140, h / 2 - 70, w - 280, 140, 70, BONE, 3, 0.9, 'rgba(236,233,226,0.06)');
    const s = 'Hello.';
    text(c, s, 210, h / 2 + 26, 72, BONE, 1, F.serif(false));
    if (Math.floor(t * 2.2) % 2 === 0) rect(c, 220 + measure(c, s, 72, F.serif(false)), h / 2 - 34, 12, 70, GOLD, 0, 1, GOLD);
  }],
];

const DEPTH = 6.6; // spacing of the callback cards along the corridor

export default class Outro2 extends ShotPlate {
  section(): Line[] { return this.ctx.lyrics.section('Outro'); }
  swellT = 0; whiteIn = 0; whiteOut = 0; titleIn = 0;
  cur: [number, number] = [0, 0];
  pc?: THREE.Object3D;

  shots(): Shot[] {
    const l1 = this.lines[1];
    const be = l1.words[l1.words.length - 1];
    this.swellT = be.start + 2.0;
    this.whiteIn = this.swellT + 2.2;
    this.whiteOut = this.whiteIn + 1.6;
    this.titleIn = this.whiteOut + 0.05;
    return [this.corridor(), this.prompt()];
  }

  corridor(): Shot {
    return {
      at: [0, 0, 0],
      build: (g) => {
        const cards = VIGS.map((_, k) => {
          const side = k % 4, x = [-3.0, 3.0, -2.7, 2.7][side], y = [1.0, -0.9, -1.1, 1.1][side];
          return card(g, 800, 500, 4.4, [x, y, -6 - k * DEPTH], [0, -x * 0.07, 0]);
        });
        return ({ t, lt }) => {
          VIGS.forEach(([cap, fn], k) => cards[k].draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 16, BONE, 2, 0.45, 'rgba(8,9,12,0.92)');
            fn(c, w, h, lt);
            if (cap) text(c, cap, 24, h - 18, 20, ASH, 1, F.mono(600), 'left', 2);
          }));
          void t;
          return { hud: 0, bloom: 0.6 };
        };
      },
      // forward through the film; the camera eases into the last stretch and hands over to the prompt
      cam: (t0, t1) => [
        { t: t0, pos: [0, 0.2, 4], look: [0, 0, -10], fov: 50 },
        { t: lerp(t0, t1 - 1.3, 0.5), pos: [0.2, 0, -6 - 5.5 * DEPTH], look: [0, 0, -18 - 5.5 * DEPTH], fov: 52, roll: 0.04, e: ease.linear },
        { t: t1 - 1.3, pos: [0, 0, -88], look: [0, 0, -100], fov: 44, roll: 0, e: ease.linear },
        { t: t1, pos: [0, 0, -89], look: [0, 0, -100], fov: 44 },
      ],
      lyric: { sx: -0.15, sy: -0.05, font: F.mono(500), size: 0.5, follow: 1, exit: 'fade', D: 5 },
      handheld: 0.02,
      drift: 0,
    };
  }

  prompt(): Shot {
    return {
      at: [0, 0, -100],
      build: (g) => {
        const pc = card(g, 2400, 1200, 10, [0, 0, 0]);
        this.pc = pc.mesh;
        return ({ t, line: l }) => {
          const ws = l.words;
          const swell = prog(t, this.swellT, this.whiteIn, ease.inExpo);
          pc.mesh.visible = t < this.whiteIn + 0.3;
          pc.draw((c, w, h) => {
            const x0 = 200, yb = 560;
            text(c, 'Next token:', x0, 300, 44, ASH, 1, F.mono(500), 'left', 2);
            const typed = ws.filter((wd) => t >= wd.start - 0.02).map((wd) => wd.w.replace(/…$/, '')).join(' ');
            text(c, typed, x0 - 6, yb, 190, BONE, 1, F.serif(true));
            const tw = typed ? measure(c, typed + ' ', 190, F.serif(true)) : 0;
            const blink = Math.floor(t * 2.2) % 2 === 0 || t > ws[ws.length - 1].start;
            // the cursor: where the next token would go
            const cx = x0 + tw + 40, cy = yb - 70;
            this.cur = [cx, cy];
            if (blink && swell <= 0) rect(c, cx - 30, cy - 75, 60, 150, GOLD, 0, 1, GOLD);
            // the distribution: flickers while the line is sung, settles on "light"
            const settled = t > ws[ws.length - 1].start + 0.4;
            const cands: [string, number][] = settled ? [['light', 0.97], ['more', 0.012], ['us', 0.009], ['…', 0.009]] : [['light', 0.38], ['peace', 0.14], ['more', 0.11], ['us', 0.07]];
            const dk = prog(t, ws[0].start + 0.2, ws[0].start + 0.7) * (1 - swell);
            rrect(c, x0, 680, 1100, 330, 20, BONE, 2, 0.5 * dk, 'rgba(10,11,14,0.9)');
            cands.forEach(([s, p], j) => {
              const pp = Math.max(0.004, p + (settled ? 0 : (hash(j, Math.floor(t * 10)) - 0.5) * 0.06));
              const y = 750 + j * 70;
              text(c, s, x0 + 40, y + 12, 40, j === 0 ? GOLD : ASH, dk, F.mono(j === 0 ? 700 : 500));
              rect(c, x0 + 280, y - 18, 640 * pp, 26, GOLD, 0, dk, rgbaHex(j === 0 ? GOLD : BONE, j === 0 ? 0.9 : 0.35));
              text(c, pp.toFixed(3), x0 + 1060, y + 10, 30, BONE, dk * 0.8, F.mono(500), 'right');
            });
          });
          const wIn = prog(t, this.whiteIn - 0.6, this.whiteIn, ease.inCubic);
          const wOut = prog(t, this.whiteOut, this.whiteOut + 0.45, ease.outCubic);
          const end = this.ctx.end;
          const outK = prog(t, end - 3.2, end - 0.3, ease.inOutCubic);
          const po: PostOverride = {
            hud: 0, white: wIn * (1 - wOut), fade: outK,
            exposure: 1 + swell * 1.6, bloom: t > this.whiteOut ? 0.28 : 0.6 + swell * 1.6, vignette: 0.45 * (1 - wIn * (1 - wOut)),
            flash: pulse(t, this.whiteIn, 0.3) * 0.3,
          };
          return po;
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, 0, 11], look: [0, 0, 0], fov: 44 }, { t: this.swellT, pos: [-0.5, 0.2, 8.2], look: [-0.7, 0.2, 0], fov: 42, e: ease.outCubic }, { t: t1, pos: [-0.5, 0.2, 7.4], look: [-0.7, 0.2, 0], fov: 42 }],
      lyric: { hide: true },
      handheld: 0.015,
      reveal: false,
      drift: 0.4,
    };
  }

  // the title page lives in screen space: crisp, flat, gold
  overlay(f: Frame, i: number) {
    if (i !== 1) return;
    const t = f.t;
    // the cursor swells into light (screen space, so it is never clipped by its card)
    const swell = prog(t, this.swellT, this.whiteIn, ease.inExpo);
    if (swell > 0 && this.pc && t < this.whiteOut) {
      const v = new THREE.Vector3((this.cur[0] / 2400 - 0.5) * 10, (0.5 - this.cur[1] / 1200) * 5, 0);
      this.pc.localToWorld(v); v.project(this.cam);
      const sx = (v.x * 0.5 + 0.5) * 1920, sy = (0.5 - v.y * 0.5) * 1080;
      const h0 = 150 / 1200 * 5 / (2 * Math.tan((this.cam.fov / 2) * Math.PI / 180) * this.cam.position.distanceTo(this.pc.getWorldPosition(new THREE.Vector3()))) * 1080;
      const cw = lerp(h0 * 0.4, 2400, swell), ch = lerp(h0, 1400, swell);
      const mx = lerp(sx, 960, swell), my = lerp(sy, 540, swell);
      for (const L of [this.c, this.g]) { (L as unknown as C2).fillStyle = swell > 0.05 ? CORE : GOLD; (L as unknown as C2).fillRect(mx - cw / 2, my - ch / 2, cw, ch); }
    }
    const k = prog(t, this.titleIn, this.titleIn + 1.4, ease.outCubic);
    if (k <= 0) return;
    const c = this.c as unknown as C2;
    c.fillStyle = 'rgba(7,8,11,1)'; c.fillRect(0, 0, 1920, 1080);
    const cx = 960;
    text(c, 'GOING', cx, 380, 30, ASH, k, F.mono(500), 'center', 24);
    // EXPONENTIAL lands letter by letter, weight on the tail
    const word = 'EXPONENTIAL';
    setFont(c, F.display(800), 170);
    const full = c.measureText(word).width;
    let x = cx - full / 2;
    [...word].forEach((ch, j) => {
      const a = prog(t, this.titleIn + 0.15 + j * 0.06, this.titleIn + 0.55 + j * 0.06, ease.outCubic);
      const wch = c.measureText(ch).width;
      const dy = (1 - a) * (j > 7 ? 80 : 40);
      text(c, ch, x, 560 - dy, 170, GOLD, a, F.display(800));
      x += wch;
    });
    // a ragged rise drawn under the title
    const ys = ragged(120, 11, (u) => (Math.exp(u * 5) - 1) / (Math.exp(5) - 1), 0.06, 0.12);
    const pts: P[] = ys.map((y, j) => [cx - full / 2 + (j / 119) * full, 690 - y * 70]);
    const dr = prog(t, this.titleIn + 0.9, this.titleIn + 2.6, ease.inOutCubic);
    line(c, cx - full / 2, 690, cx + full / 2, 690, BONE, 1.5, 0.25 * k);
    beam(c, pts, dr, 3, GOLD, 1);
    if (dr > 0.98) dot(c, pts[pts.length - 1][0], pts[pts.length - 1][1], 7, CORE, 1.2 + 0.4 * Math.sin(t * 5));
    // credit
    const ck = prog(t, this.titleIn + 2.2, this.titleIn + 3.2, ease.outCubic);
    c.save(); c.globalAlpha = ck; c.fillStyle = BONE; c.textAlign = 'center'; c.font = '400 64px "Noto Serif SC", "Songti SC", serif';
    c.fillText('数原律', cx, 850); c.restore();
    text(c, 'intqwq', cx, 915, 26, ASH, ck, F.mono(500), 'center', 4);
    line(c, cx - 40, 760, cx + 40, 760, GOLD, 2, ck);
  }

  render(f: Frame, out: RT): PostOverride {
    return super.render(f, out);
  }
}
