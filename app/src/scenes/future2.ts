// FUTURE — "The Queue" (20??). Clean vector plates on layered planes.
import * as THREE from 'three';
import { ShotPlate, card, type Shot } from './shots';
import { LineBatch, Pen, linCol } from '../engine/lines';
import { WordSprite } from '../engine/text3d';
import type { Line } from '../engine/data';
import { F } from '../engine/type';
import { trace, beam, scan, line, rect, rrect, circle, dot, text, arrow, partial, chip, windowFrame, measure, rgbaHex, GOLD, CORE, BONE, ASH, GRAPH, INK, RED, GREEN, type C2, type P } from './vec';
import { god, human } from './figures';
import { clamp, ease, prog, lerp, hash, pulse, mulberry32 } from '../engine/util';

// Riemann–Siegel Z(t): real-valued along the critical line; its zeros are the zeros of ζ(½ + it)
const theta = (t: number) => (t / 2) * Math.log(t / (2 * Math.PI)) - t / 2 - Math.PI / 8 + 1 / (48 * t);
const Z = (t: number) => { const N = Math.floor(Math.sqrt(t / (2 * Math.PI))); let s = 0; for (let n = 1; n <= N; n++) s += Math.cos(theta(t) - t * Math.log(n)) / Math.sqrt(n); return 2 * s; };
const ZEROS = [14.1347, 21.022, 25.0109, 30.4249, 32.9351, 37.5862, 40.9187, 43.3271, 48.0052, 49.7738, 52.9703, 56.4462, 59.347, 60.8318];

const CLAY: [string, number][] = [['Riemann Hypothesis', 0], ['P versus NP', 1], ['Hodge Conjecture', 2], ['Yang–Mills & Mass Gap', 3], ['Birch & Swinnerton-Dyer', 4], ['Navier–Stokes Existence & Smoothness', 5], ['Poincaré Conjecture', -1]];

export default class Future2 extends ShotPlate {
  section(): Line[] { return this.ctx.lyrics.section('Future'); }
  shots(): Shot[] {
    return [this.riemann(), this.pnp(), this.three(), this.list(3), this.list(4), this.list(5), this.cancer(), this.time(), this.fence(), this.wonder(), this.rock(), this.carbon()];
  }

  riemann(): Shot {
    return {
      at: [0, 0, 0],
      build: (g) => {
        const strip = card(g, 1000, 2000, 5, [-5.4, 0.2, -1], [0, 0.3, 0]);
        const plot = card(g, 2600, 1300, 12, [2, 0, 0]);
        return ({ t, lt, line: l }) => {
          const p = prog(lt, 0, 1.7);
          strip.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 20, BONE, 2, 0.5, 'rgba(8,9,12,0.95)');
            text(c, 'CRITICAL STRIP', 40, 70, 30, ASH, 1, F.mono(600), 'left', 3);
            c.fillStyle = rgbaHex(BONE, 0.05); c.fillRect(200, 100, 600, h - 160);
            line(c, 200, 100, 200, h - 60, BONE, 2, 0.6); line(c, 800, 100, 800, h - 60, BONE, 2, 0.6);
            line(c, 500, 100, 500, h - 60, GOLD, 4, 1);
            text(c, '0', 200, h - 20, 26, ASH, 1, F.mono(500), 'center'); text(c, '1', 800, h - 20, 26, ASH, 1, F.mono(500), 'center'); text(c, 'Re s = ½', 520, 140, 30, GOLD, 1, F.mono(600));
            ZEROS.forEach((z) => { const y = h - 80 - ((z - 10) / 52) * (h - 220); if ((z - 10) / 52 > p) return; dot(c, 500, y, 9, GOLD, 1.2); text(c, `½ + ${z.toFixed(2)}i`, 480, y + 10, 26, BONE, 0.8, F.mono(500), 'right'); });
          });
          plot.draw((c, w, h) => {
            const X = (tt: number) => 120 + ((tt - 10) / 52) * (w - 220), Y = (v: number) => h / 2 - v * 110;
            line(c, 100, h / 2, w - 60, h / 2, BONE, 2, 0.6);
            text(c, 'Z(t)  (Riemann–Siegel)', 120, 90, 40, BONE, 1, F.serif(true));
            const pts: P[] = [];
            for (let tt = 10; tt <= 62; tt += 0.05) pts.push([X(tt), Y(Z(tt))]);
            beam(c, pts, p, 4, GOLD, 1);
            ZEROS.forEach((z) => { if ((z - 10) / 52 <= p) dot(c, X(z), h / 2, 10, GOLD, 1.3); });
            for (let k = 10; k <= 60; k += 10) text(c, String(k), X(k), h / 2 + 50, 26, ASH, 1, F.mono(500), 'center');
            const qT = l.words[l.words.length - 1].start;
            const q = prog(t, qT - 0.1, qT + 0.3, ease.outBack);
            if (q > 0) text(c, '∎', w - 160, 240, 200 * q, BONE, 1, F.serif(false), 'center');
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-4, 0.6, 12], look: [-2.5, 0.2, 0], fov: 42 }, { t: t1, pos: [2.5, 0.2, 10.5], look: [2, 0, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  pnp(): Shot {
    return {
      at: [60, 0, 0],
      build: (g) => {
        const d = card(g, 2400, 1400, 11, [0, 0, 0]);
        return ({ t, line: l }) => {
          const defT = l.words[l.words.length - 1].start;
          const s = prog(t, defT - 0.05, defT + 0.25, ease.outBack);
          d.draw((c, w, h) => {
            const cx = w / 2 - 200, cy = h / 2 + 40;
            const lt = t - this.cuts[1];
            // contours drawn as a beam: an ellipse traced with a slight Lissajous wobble (scope jitter)
            const ell = (ex: number, ey: number, rx: number, ry: number, wob: number, ph: number): P[] => {
              const pts: P[] = [];
              for (let k = 0; k <= 160; k++) { const a = (k / 160) * Math.PI * 2; const r = 1 + wob * Math.sin(a * 3 + ph) * Math.sin(a * 2 - ph * 0.7); pts.push([ex + Math.cos(a) * rx * r, ey + Math.sin(a) * ry * r]); }
              return pts;
            };
            const on = prog(lt, 0, 0.9, ease.outCubic);
            const NP = ell(cx, cy, 760, 470, 0.01, t * 2);
            beam(c, NP, on, 4, BONE, 0.6, true);
            // P cannot decide: it breathes between "a small region inside NP" and "all of NP"
            const und = 0.5 - 0.5 * Math.cos(lt * 2.6);
            const ghost = s > 0 ? 1 : 0;
            const drawP = (k: number, a: number) => {
              const pts = ell(lerp(cx - 260, cx, k), lerp(cy + 40, cy, k), lerp(300, 740, k), lerp(240, 455, k), 0.015, t * 3 + k);
              c.globalAlpha = a; beam(c, pts, on, 4, BONE, 0.7, true); c.globalAlpha = 1;
            };
            if (ghost) { drawP(0, 0.85); drawP(1, 0.85); } else drawP(und, 1);
            // NP-complete core with reductions firing out of SAT
            const nc = ell(cx + 420, cy - 40, 240, 200, 0.02, t * 4);
            beam(c, nc, prog(lt, 0.3, 1.0), 4, GOLD, 1, true);
            const tgts: P[] = [[cx - 360, cy - 180], [cx - 120, cy + 300], [cx + 120, cy - 330], [cx - 500, cy + 120], [cx + 260, cy + 290]];
            tgts.forEach((p2, k) => {
              const ph = ((lt * 0.9 + k * 0.27) % 1);
              const src: P = [cx + 420, cy - 40];
              const mid: P = [(src[0] + p2[0]) / 2, (src[1] + p2[1]) / 2 - 120];
              const path: P[] = []; for (let q = 0; q <= 30; q++) { const u = q / 30; path.push([lerp(lerp(src[0], mid[0], u), lerp(mid[0], p2[0], u), u), lerp(lerp(src[1], mid[1], u), lerp(mid[1], p2[1], u), u)]); }
              trace(c, path, 1.5, BONE, 0, false);
              scan(c, path, ph, 0.25, 2.5, GOLD, false);
              dot(c, p2[0], p2[1], 7, BONE, 0.4);
            });
            text(c, 'NP', cx + 500, cy - 380, 80, BONE, 1, F.serif(true), 'center');
            text(c, 'P', lerp(cx - 260, cx - 420, ghost ? 0 : und), cy + 70, 110, BONE, 1, F.serif(true), 'center');
            text(c, 'NP-complete', cx + 420, cy - 20, 50, GOLD, 1, F.serif(true), 'center');
            text(c, 'SAT · 3-COLOURING · TSP', cx + 420, cy + 60, 26, ASH, 1, F.mono(500), 'center');
            text(c, 'P  =?  NP', w - 180, 200, 90, BONE, 1, F.serif(true), 'right');
            if (s > 0) { c.save(); c.translate(w - 470, 1120); c.rotate(-0.12); c.scale(2 - s, 2 - s); c.globalAlpha = s; rrect(c, -330, -90, 660, 180, 16, GOLD, 8, 1); text(c, 'RESOLVED', 0, 34, 110, GOLD, 1, F.mono(800), 'center', 8); c.restore(); text(c, '(we are not told which way)', w - 470, 1290, 36, ASH, s, F.mono(500), 'center'); }
          });
          return { zoom: 1 + 0.035 * pulse(t, defT, 0.18), shake: [pulse(t, defT, 0.08) * 8, 0] as [number, number] };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2, 0.5, 12], look: [-0.5, 0, 0], fov: 42 }, { t: t1, pos: [2, 0.5, 10.5], look: [1.6, 0.4, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  three(): Shot {
    return {
      at: [120, 0, 0],
      build: (g) => {
        const P3 = [card(g, 1300, 1500, 5.4, [-6, 0.2, -0.6], [0, 0.25, 0]), card(g, 1300, 1500, 5.4, [0, 0.2, 0]), card(g, 1300, 1500, 5.4, [6, 0.2, -0.6], [0, -0.25, 0])];
        return ({ t, lt, line: l }) => {
          const ts = [l.words[0].start, l.words[1].start, l.words[3]?.start ?? l.words[2].start];
          P3.forEach((cd, k) => {
            const a = prog(t, ts[k] - 0.15, ts[k] + 0.3, ease.outExpo);
            cd.mesh.visible = a > 0;
            cd.mesh.position.y = 0.2 - (1 - a) * 1.5;
            cd.draw((c, w, h) => {
              rrect(c, 4, 4, w - 8, h - 8, 20, GOLD, 3, 1, 'rgba(8,9,12,0.95)');
              const cx = w / 2, cy = h / 2 - 40;
              if (k === 0) {
                // a complex torus drawn as a lattice cell, with algebraic cycles (closed loops) highlighted
                for (let u = 0; u < 28; u++) { const pts: P[] = []; for (let v = 0; v <= 60; v++) { const A = (u / 28) * Math.PI * 2 + lt * 0.3, B = (v / 60) * Math.PI * 2; const R = 330 + 130 * Math.cos(B); pts.push([cx + R * Math.cos(A), cy + 130 * Math.sin(B) * 0.9 + R * Math.sin(A) * 0.35]); } trace(c, pts, 1.5, BONE, 0); }
                const loop: P[] = []; for (let v = 0; v <= 60; v++) { const B = (v / 60) * Math.PI * 2; const R = 330 + 130 * Math.cos(B); loop.push([cx + R, cy + 130 * Math.sin(B) * 0.9]); }
                trace(c, loop, 6, GOLD, 1.2);
                text(c, 'HODGE', 60, h - 70, 50, GOLD, 1, F.mono(700), 'left', 6); text(c, 'Hodge classes = algebraic cycles?', 60, h - 130, 28, ASH, 1, F.mono(500));
              } else if (k === 1) {
                line(c, 160, h - 260, w - 160, h - 260, BONE, 3, 0.8);
                c.fillStyle = rgbaHex(GOLD, 0.8); c.fillRect(200, h - 268, 80, 16);
                text(c, 'vacuum', 160, h - 210, 26, ASH, 1, F.mono(500));
                for (let s = 0; s < 18; s++) { const y = h - 640 - s * 26 - hash(s) * 12; line(c, 200, y, w - 200, y, BONE, 2, 0.7); }
                arrow(c, w - 220, h - 260, w - 220, h - 630, GOLD, 3, 18); arrow(c, w - 220, h - 630, w - 220, h - 260, GOLD, 3, 18);
                text(c, 'Δ > 0', w - 260, h - 430, 60, GOLD, 1, F.serif(true), 'right');
                text(c, 'MASS GAP', 60, h - 70, 50, GOLD, 1, F.mono(700), 'left', 6); text(c, 'Yang–Mills on ℝ⁴', 60, h - 130, 28, ASH, 1, F.mono(500));
              } else {
                // y² = x³ − x + 1 with chord addition P + Q = −R reflected
                const X = (x: number) => cx + x * 230, Y = (y: number) => cy - y * 170;
                const up: P[] = [], dn: P[] = [];
                for (let x = -1.32; x <= 2.4; x += 0.01) { const v = x ** 3 - x + 1; if (v < 0) continue; up.push([X(x), Y(Math.sqrt(v))]); dn.push([X(x), Y(-Math.sqrt(v))]); }
                trace(c, [...dn.reverse(), ...up], 4, BONE, 0);
                const Pp: [number, number] = [-1, 1], Qp: [number, number] = [0, 1];
                const m = (Qp[1] - Pp[1]) / (Qp[0] - Pp[0]);
                const xr = m * m - Pp[0] - Qp[0], yr = Pp[1] + m * (xr - Pp[0]);
                const pk = prog(lt, 0.2, 1.2);
                beam(c, [[X(-1.3), Y(Pp[1] + m * (-1.3 - Pp[0]))], [X(2.3), Y(Pp[1] + m * (2.3 - Pp[0]))]], pk, 3, GOLD, 0.8);
                dot(c, X(Pp[0]), Y(Pp[1]), 10, GOLD, 1); dot(c, X(Qp[0]), Y(Qp[1]), 10, GOLD, 1);
                if (pk > 0.8) { dot(c, X(xr), Y(yr), 10, BONE, 0); line(c, X(xr), Y(yr), X(xr), Y(-yr), GOLD, 2, 0.8); dot(c, X(xr), Y(-yr), 12, GOLD, 1.4); text(c, 'P + Q', X(xr) + 20, Y(-yr) + 40, 30, GOLD, 1, F.mono(600)); }
                text(c, 'y² = x³ − x + 1', 60, 90, 46, BONE, 1, F.serif(true));
                text(c, 'ELLIPTIC CURVES', 60, h - 70, 50, GOLD, 1, F.mono(700), 'left', 6); text(c, 'Birch & Swinnerton-Dyer: rank = ord L(E,1)', 60, h - 130, 26, ASH, 1, F.mono(500));
              }
            });
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-4, 0.4, 13], look: [-3, 0.2, 0], fov: 44 }, { t: t1, pos: [3, 0.4, 12.5], look: [2.5, 0.2, 0], fov: 44, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  drawClay(c: C2, w: number, t: number) {
    const l4 = this.lines[4], l5 = this.lines[5];
    text(c, 'CLAY MILLENNIUM PRIZE PROBLEMS', 80, 90, 40, ASH, 1, F.mono(600), 'left', 5);
    text(c, 'PROVER QUEUE', w - 80, 90, 40, ASH, 1, F.mono(600), 'right', 5);
    CLAY.forEach(([name, k], j) => {
      const y = 160 + j * 210;
      const a = prog(t, this.cuts[3] + j * 0.1, this.cuts[3] + j * 0.1 + 0.3, ease.outExpo);
      const poinc = k === -1;
      const greenT = l5.words[Math.min(2, l5.words.length - 1)].start + j * 0.18;
      const gk = poinc ? 0 : prog(t, greenT, greenT + 0.25, ease.outCubic);
      const pk = poinc ? prog(t, l4.words[0].start, l4.words[0].start + 0.4) : 0;
      const hot = poinc && pk > 0;
      rrect(c, 80, y, w - 160, 180, 18, gk > 0 ? GREEN : hot ? GOLD : BONE, gk > 0 || hot ? 4 : 2, gk > 0 || hot ? 1 : 0.4 * a, gk > 0 ? rgbaHex(GREEN, 0.1 * gk) : hot ? rgbaHex(GOLD, 0.08) : 'rgba(10,11,14,0.94)');
      circle(c, 160, y + 90, 36, gk > 0 ? GREEN : hot ? GOLD : BONE, 3, a);
      if (gk > 0 || pk > 0) beam(c, [[140, y + 92], [156, y + 110], [184, y + 70]], Math.max(gk, pk), 6, gk > 0 ? GREEN : GOLD, 1);
      text(c, name, 240, y + 110, 56, BONE, a, F.mono(500));
      const st = poinc ? (pk > 0 ? 'PERELMAN · 2003 · prize declined 2010' : 'SOLVED') : gk > 0.5 ? 'VERIFIED ✓' : t > l5.start - 0.3 ? 'QUEUED · checking…' : 'OPEN';
      text(c, st, w - 120, y + 110, 34, hot ? GOLD : gk > 0.5 ? GREEN : ASH, a, F.mono(600), 'right', 2);
    });
  }

  list(phase: number): Shot {
    return {
      at: [180, 0, 0],
      build: (g) => {
        const tbl = card(g, 2400, 1700, 8.4, [1.2, 1.3, 0]);
        return ({ t }) => {
          tbl.mesh.visible = this.vi(t) === phase;
          if (tbl.mesh.visible) tbl.draw((c, w) => this.drawClay(c, w, t));
          return {};
        };
      },
      cam: phase === 3
        ? (t0, t1) => [{ t: t0, pos: [-2, 2, 13], look: [0, 1, 0], fov: 44 }, { t: t1, pos: [-1, 0.5, 12], look: [0, 0.3, 0], fov: 42, e: ease.inOutQuad }]
        : phase === 4
          ? (t0, t1) => [{ t: t0, pos: [-1, 0.5, 12], look: [0, 0.3, 0], fov: 42 }, { t: t1, pos: [1.6, -1.2, 10.5], look: [1.2, -1.6, 0], fov: 40, e: ease.inOutCubic }]
          : (t0, t1) => [{ t: t0, pos: [1.6, -1.2, 10.5], look: [1.2, -1.6, 0], fov: 40 }, { t: t1, pos: [0.8, 0.8, 15], look: [0.8, 0.4, 0], fov: 46, e: ease.inOutCubic }],
      lyric: { sx: -0.72, sy: -0.8, maxWidth: 9 },
      reveal: phase === 3,
    };
  }

  cancer(): Shot {
    return {
      at: [240, 0, 0],
      build: (g) => {
        const tissue = card(g, 1800, 1800, 7.4, [-3.8, 0.2, -0.4], [0, 0.22, 0]);
        const launch = card(g, 1200, 2400, 6, [3.6, 1.4, -1], [0, -0.2, 0]);
        const engine = card(g, 1000, 1000, 3, [6.8, -1.6, 1.8], [0, -0.4, 0]);
        engine.draw((c, w, h) => {
          rrect(c, 4, 4, w - 8, h - 8, 20, BONE, 2, 0.5, 'rgba(8,9,12,0.95)');
          text(c, 'REGEN-COOLED CHAMBER · 3D-PRINTED', 40, 70, 26, ASH, 1, F.mono(600), 'left', 2);
          const cx = w / 2;
          const prof: P[] = []; for (let s = 0; s <= 60; s++) { const u = s / 60; const r = u < 0.45 ? 160 : u < 0.6 ? lerp(160, 70, (u - 0.45) / 0.15) : lerp(70, 260, (u - 0.6) / 0.4); prof.push([cx - r, 140 + u * 760]); }
          trace(c, prof, 4, BONE, 0); trace(c, prof.map(([x, y]) => [2 * cx - x, y] as P), 4, BONE, 0);
          for (let k = 0; k < 14; k++) { const pts = prof.map(([x, y]) => [lerp(x, 2 * cx - x, (k + 0.5) / 14), y] as P); trace(c, pts, 1.5, GOLD, 0.4); }
        });
        return ({ t, lt, line: l }) => {
          const curedT = l.words[1].start, climbT = l.words[3]?.start ?? l.end - 0.8;
          const y = prog(t, curedT - 0.4, curedT + 1.1, ease.inOutCubic);
          tissue.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 20, BONE, 2, 0.4, 'rgba(8,9,12,0.95)');
            text(c, 'TUMOUR · T-CELL ATTACK', 40, 70, 30, ASH, 1, F.mono(600), 'left', 3);
            // normal tissue at the edges: small regular cells
            for (let k = 0; k < 140; k++) { const x = hash(k, 1) * w, yy = hash(k, 2) * h; if (Math.hypot(x - w / 2, yy - h / 2) < 600) continue; circle(c, x, yy, 26, BONE, 1.5, 0.35); circle(c, x, yy, 8, BONE, 0, 0.35, rgbaHex(BONE, 0.25)); }
            // tumour: irregular cells, large pleomorphic nuclei, nucleoli; one mitotic figure
            for (let k = 0; k < 60; k++) {
              const a = hash(k, 3) * 6.28, rr = Math.sqrt(hash(k, 4)) * 560 * (1 - y * 0.65);
              const x = w / 2 + Math.cos(a) * rr, yy = h / 2 + Math.sin(a) * rr;
              const alive = hash(k, 5) > y;
              const R = (42 + hash(k, 6) * 30) * (alive ? 1 : 1 - y);
              const pts: P[] = []; for (let s = 0; s <= 28; s++) { const an = (s / 28) * 6.28; const wob = 1 + 0.2 * Math.sin(an * 3 + k) + 0.12 * Math.sin(an * 5 + k * 2); pts.push([x + Math.cos(an) * R * wob, yy + Math.sin(an) * R * wob]); }
              trace(c, pts, alive ? 3 : 1.5, alive ? BONE : GRAPH, 0, true);
              if (alive) { const nr = R * (0.45 + hash(k, 7) * 0.2); c.strokeStyle = rgbaHex(GOLD, 0.9); c.lineWidth = 3; c.beginPath(); c.ellipse(x + 4, yy - 3, nr, nr * 0.8, k, 0, Math.PI * 2); c.stroke(); dot(c, x + 6, yy - 6, 5, GOLD, 0.6); }
              if (alive && k === 7) { for (let q = 0; q < 8; q++) line(c, x - 18, yy - 30 + q * 8, x + 18, yy - 30 + q * 8, GOLD, 2, 0.9); }
            }
            // T cells docking
            for (let k = 0; k < 10; k++) { const a = k * 0.63 + lt * 0.5, rr = 470 * (1 - y * 0.55) + Math.sin(lt * 3 + k) * 30; const x = w / 2 + Math.cos(a) * rr, yy = h / 2 + Math.sin(a) * rr; circle(c, x, yy, 30, GOLD, 4, 1, 'rgba(255,178,30,0.15)'); for (let q = 0; q < 8; q++) { const an = q * 0.785; line(c, x + Math.cos(an) * 30, yy + Math.sin(an) * 30, x + Math.cos(an) * 42, yy + Math.sin(an) * 42, GOLD, 2, 0.8); } }
            text(c, `malignant cells ${Math.round(60 * (1 - y))}`, w - 40, h - 40, 32, y > 0.9 ? GOLD : BONE, 1, F.mono(600), 'right');
          });
          launch.draw((c, w, h) => {
            const p = prog(t, climbT - 0.5, this.vEnd(6), ease.inQuad);
            const cx = w / 2, yb = h - 220 - p * 1700;
            line(c, 0, h - 200, w, h - 200, BONE, 3, 0.6);
            rect(c, cx + 140, h - 900, 40, 700, BONE, 2, 0.5); // tower
            // plume
            if (p > 0) for (let k = 0; k < 40; k++) { const u = k / 40; const r = 30 + u * 260 * (0.6 + 0.4 * Math.sin(t * 20 + k)); c.strokeStyle = rgbaHex(GOLD, (1 - u) * 0.6); c.lineWidth = 3; c.beginPath(); c.ellipse(cx, yb + 40 + u * 700, r * 0.5, r * 0.18, 0, 0, Math.PI * 2); c.stroke(); }
            // vehicle: fairing, second stage, interstage, first stage with grid fins and engine bells
            const body: P[] = [[cx - 48, yb], [cx - 48, yb - 820], [cx - 48, yb - 900], [cx, yb - 1020], [cx + 48, yb - 900], [cx + 48, yb], [cx - 48, yb]];
            trace(c, body, 3, BONE, 0, true);
            line(c, cx - 48, yb - 600, cx + 48, yb - 600, BONE, 2, 0.8); line(c, cx - 48, yb - 640, cx + 48, yb - 640, BONE, 2, 0.8);
            rect(c, cx - 78, yb - 560, 30, 30, BONE, 2, 0.8); rect(c, cx + 48, yb - 560, 30, 30, BONE, 2, 0.8);
            for (let k = -1; k <= 1; k++) trace(c, [[cx + k * 28 - 12, yb], [cx + k * 28 - 18, yb + 40], [cx + k * 28 + 18, yb + 40], [cx + k * 28 + 12, yb]], 2, GOLD, 0.8, true);
            text(c, `T+${Math.max(0, t - climbT).toFixed(1)} s`, 40, 80, 40, GOLD, p > 0 ? 1 : 0.4, F.mono(600));
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-3, 0.4, 11], look: [-2.5, 0.3, 0], fov: 44 }, { t: t1, pos: [3.2, 3.4, 11], look: [3.2, 3.4, 0], fov: 46, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  time(): Shot {
    return {
      at: [300, 0, 0],
      build: (g) => {
        const chart = card(g, 2400, 1000, 9, [-1.6, 1.9, 0]);
        // a sandglass (hourglass) in 3D line art: two blown-glass bulbs joined at a narrow neck, end plates and three
        // turned posts; sand falls in a thin stream and heaps as a cone. On "gives", it is turned over: extra time.
        const lb = new LineBatch(30000, { depthTest: true }), pen = new Pen(lb);
        const hg = new THREE.Group(); hg.add(lb.mesh); hg.position.set(4.3, -0.6, 0.8); g.add(hg);
        const Hh = 1.5; // half height of the glass
        const prof = (y: number) => { const u = Math.abs(y) / Hh; return 0.035 + 0.62 * Math.pow(Math.sin(Math.min(1, u) * Math.PI * 0.62), 1.6) * (1 - Math.pow(u, 8) * 0.35); };
        return ({ t, lt, line: l }) => {
          const ext = prog(t, l.words[4]?.start ?? l.start + 0.8, l.end + 0.3, ease.outCubic);
          const giveT = l.words[2]?.start ?? l.start + 0.4;
          const flip = prog(t, giveT - 0.1, giveT + 0.55, ease.inOutCubic);
          // sand fraction in the (current) top bulb: nearly empty before the flip; after, the full bulb is on top
          const top = flip < 0.5 ? Math.max(0.04, 0.12 - lt * 0.02) : Math.max(0.05, 0.92 - Math.max(0, t - giveT - 0.55) * 0.05);
          chart.draw((c, w) => {
            text(c, 'HUMAN LIFESPAN (YEARS)', 80, 90, 40, ASH, 1, F.mono(600), 'left', 4);
            const X = (y: number) => 120 + (y / 160) * (w - 240);
            line(c, 120, 600, w - 120, 600, BONE, 2, 0.6);
            [0, 40, 80, 120, 160].forEach((y) => { line(c, X(y), 580, X(y), 620, BONE, 2, 0.6); text(c, String(y), X(y), 680, 32, ASH, 1, F.mono(500), 'center'); });
            rect(c, X(0), 420, X(80) - X(0), 120, BONE, 3, 0.8, rgbaHex(BONE, 0.08));
            rect(c, X(80), 420, (X(80 + 80 * ext) - X(80)), 120, GOLD, 0, 1, rgbaHex(GOLD, 0.8));
            text(c, `${Math.round(80 + 80 * ext)}`, X(80 + 80 * ext) + 20, 510, 70, GOLD, 1, F.mono(700));
          });
          lb.clear(); pen.m.identity();
          hg.rotation.set(0, t * 0.3, flip * Math.PI);
          const gold = linCol('#ffb21e', 2.2), core = linCol('#ffe7b0', 3.2), bone = linCol('#ece9e2', 0.6), ash = linCol('#8b8f99', 0.5);
          // glass: profile meridians + latitude rings
          for (let m = 0; m < 10; m++) { const a = (m / 10) * Math.PI * 2; const pts: number[][] = []; for (let k = 0; k <= 60; k++) { const y = -Hh + (2 * Hh * k) / 60, r = prof(y); pts.push([Math.cos(a) * r, y, Math.sin(a) * r]); } pen.style(bone, 1, 0.45).poly(pts); }
          for (let k = 1; k < 12; k++) { const y = -Hh + (2 * Hh * k) / 12; pen.style(bone, 1, 0.3).ring(prof(y), 'y', 40, 0, y, 0); }
          // frame: end plates (with a bevel) and three turned posts
          for (const y of [-Hh - 0.08, Hh + 0.08]) { pen.style(gold, 1.6, 1).ring(0.82, 'y', 64, 0, y, 0); pen.style(gold, 1.2, 0.8).ring(0.82, 'y', 64, 0, y + Math.sign(y) * 0.12, 0); pen.style(gold, 1, 0.6).ring(0.7, 'y', 64, 0, y + Math.sign(y) * 0.12, 0); for (let q = 0; q < 12; q++) { const a = (q / 12) * Math.PI * 2; pen.style(gold, 1, 0.5).line(Math.cos(a) * 0.82, y, Math.sin(a) * 0.82, Math.cos(a) * 0.82, y + Math.sign(y) * 0.12, Math.sin(a) * 0.82); } }
          for (let q = 0; q < 3; q++) { const a = (q / 3) * Math.PI * 2 + 0.5; const x = Math.cos(a) * 0.72, z = Math.sin(a) * 0.72; const pts: number[][] = []; for (let k = 0; k <= 30; k++) { const y = -Hh + (2 * Hh * k) / 30; pts.push([x, y, z]); } pen.style(gold, 2.2, 0.9).poly(pts); for (const yb of [-0.8, 0, 0.8]) pen.style(gold, 1, 0.8).ring(0.06, 'y', 12, x, yb * Hh, z); }
          // sand (in glass coordinates: +y is the current top after the flip, so draw relative to the turn)
          const upSign = flip < 0.5 ? 1 : -1;
          // top: a level surface at the height that holds the remaining sand (with a small dip over the neck)
          const yTop = upSign * (0.08 + top * (Hh - 0.15));
          const rt = prof(yTop);
          pen.style(gold, 1.6, 0.95).ring(rt * 0.96, 'y', 40, 0, yTop, 0);
          for (let k = 1; k <= 4; k++) pen.style(gold, 1, 0.6).ring(rt * 0.96 * (1 - k * 0.22), 'y', 32, 0, yTop - upSign * k * 0.02, 0);
          // the sand body in the top bulb: dense rings from the neck up to the level
          for (let k = 0; k < 18; k++) { const y = lerp(upSign * 0.06, yTop, k / 17); pen.style(gold, 1, 0.5).ring(prof(y) * 0.95, 'y', 32, 0, y, 0); }
          // stream through the neck
          if (top > 0.05 && flip % 1 === 0 || flip > 0.98 || flip < 0.02) {
            for (let k = 0; k < 14; k++) { const u = ((t * 2.2 + k / 14) % 1); const y = upSign * (0.05 - u * (Hh * 0.9)); pen.style(core, 2.4, 0.9).line(0, y, 0, 0, y - upSign * 0.05, 0); }
          }
          // bottom heap: a cone whose height grows with the fallen sand
          const fallen = 1 - top, yB = -upSign * (Hh - 0.02), hc = fallen * Hh * 0.55, rb = prof(yB + upSign * hc * 0.3) * 0.95;
          for (let q = 0; q < 16; q++) { const a = (q / 16) * Math.PI * 2; pen.style(gold, 1, 0.7).line(Math.cos(a) * rb, yB, Math.sin(a) * rb, 0, yB + upSign * hc, 0); }
          for (let k = 1; k < 8; k++) pen.style(gold, 1, 0.5).ring(rb * (1 - k / 8), 'y', 28, 0, yB + upSign * hc * (k / 8), 0);
          pen.style(gold, 1.6, 0.9).ring(rb, 'y', 40, 0, yB, 0);
          void ash;
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1.5, 0.8, 12], look: [0, 0.4, 0], fov: 42 }, { t: t1, pos: [1.5, -0.2, 11], look: [1, -0.4, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  fence(): Shot {
    const names = ['SANDBOX · container namespaces', 'SECCOMP · syscall allow-list', 'CAPABILITIES · CAP_SYS_ADMIN dropped', 'NETWORK POLICY · deny all egress', 'HUMAN REVIEW · approval required'];
    const LZ = (k: number) => -k * 4.2; // layer planes along −z
    const GZ = -30; // the world
    return {
      at: [360, 0, 0],
      build: (g) => {
        const layers = names.map((n, k) => card(g, 1700, 1100, 7.5, [0, 0, LZ(k)]));
        const score = card(g, 1000, 600, 3.6, [5.0, 2.6, 3], [0, -0.35, 0]);
        const lb = new LineBatch(40000, { depthTest: true }), pen = new Pen(lb);
        g.add(lb.mesh);
        const toks = ['curl', 'sudo', 'ssh', '>>', 'tool_call', 'exec', 'pip', 'POST', 'wget', 'git push', 'nc', 'eval', 'spawn', 'DNS', 'cron', 'retry'];
        const sprites = toks.map((s2) => { const w = new WordSprite(s2, F.mono(600), 0.26, GOLD); w.renderOrder = 11; g.add(w); return w; });
        // a token path: a braided stream that funnels through the breach points and fans out to the globe
        const path = (u: number, k: number): [number, number, number] => {
          const z = lerp(8, GZ + 4, u);
          const sp = 0.25 + 0.6 * Math.max(0, (u - 0.75) / 0.25) * 4;
          const a = k * 2.39 + u * 9;
          return [Math.cos(a) * sp * (0.4 + hash(k, 2)), Math.sin(a) * sp * (0.4 + hash(k, 3)) * 0.8, z];
        };
        return ({ t, line: l }) => {
          const brk = l.words[1].start, cheer = l.words[4]?.start ?? l.end - 0.6;
          // stream head: accelerates from the camera to the world, reaching each layer on cue
          const head = clamp(Math.pow(clamp((t - (brk - 0.45)) / 1.5), 1.6));
          const zHead = lerp(8, GZ + 4, head);
          layers.forEach((cd, k) => {
            const hit = zHead < LZ(k) + 0.3;
            cd.draw((c, w, h) => {
              rrect(c, 20, 20, w - 40, h - 40, 24, hit ? RED : BONE, 3, hit ? 1 : 0.6, 'rgba(8,9,12,0.55)');
              text(c, names[k], 70, 100, 40, hit ? RED : ASH, 1, F.mono(600), 'left', 2);
              for (let yy = 180; yy < h - 60; yy += 70) line(c, 70, yy, w - 70, yy, BONE, 1, 0.08);
              text(c, hit ? 'BYPASSED' : 'ENFORCED', w - 70, h - 60, 40, hit ? RED : GREEN, 1, F.mono(700), 'right', 4);
              if (hit) {
                for (let s2 = 0; s2 < 18; s2++) { const a2 = (s2 / 18) * 6.28 + k; const pts: P[] = [[w / 2, h / 2]]; let x = w / 2, y = h / 2; for (let q = 0; q < 7; q++) { x += Math.cos(a2 + (hash(s2, q, k) - 0.5)) * 70; y += Math.sin(a2 + (hash(s2, q, k) - 0.5)) * 70; pts.push([x, y]); } trace(c, pts, 3, GOLD, 1); }
                circle(c, w / 2, h / 2, 120, GOLD, 5, 1, INK);
              }
            });
          });
          lb.clear(); pen.m.identity();
          const gold = linCol('#ffb21e', 2.4), core = linCol('#ffe7b0', 3.6), bone = linCol('#ece9e2', 0.55), ash = linCol('#8b8f99', 0.45);
          // the stream: 120 strands of dashes racing toward the head
          for (let k = 0; k < 120; k++) {
            for (let d = 0; d < 6; d++) {
              const u = ((t * 0.9 + k * 0.013 + d * 0.17) % 1) * head;
              const u2 = Math.min(head, u + 0.012);
              const [x1, y1, z1] = path(u, k), [x2, y2, z2] = path(u2, k);
              pen.style(d === 0 ? core : gold, 1.4, 0.85).line(x1, y1, z1, x2, y2, z2);
            }
          }
          if (head > 0) { const [hx, hy, hz] = path(head, 0); pen.style(core, 16, 1).line(hx, hy, hz, hx, hy, hz); }
          // token labels riding the stream
          sprites.forEach((sp, k) => { const u = ((t * 0.6 + k / toks.length) % 1) * head; const [x, y, z] = path(u, k * 7); sp.visible = head > 0.02 && u > 0.02 && this.cam.position.z - g.position.z - z > 3; sp.position.set(x + 0.2, y + 0.2, z); sp.quaternion.copy(this.cam.quaternion); });
          // the world: a wire globe; once reached, network arcs light up city to city
          const R = 3.2, reach = clamp((head - 0.92) / 0.08), spread = prog(t, brk + 1.0, this.vEnd(8) + 0.5);
          pen.push().translate(0, -0.6, GZ).rotate(0.35, t * 0.25, 0);
          for (let la = -60; la <= 60; la += 30) pen.style(bone, 1, 0.5).ring(R * Math.cos((la * Math.PI) / 180), 'y', 64, 0, R * Math.sin((la * Math.PI) / 180), 0);
          for (let lo = 0; lo < 12; lo++) { const a2 = (lo / 12) * Math.PI * 2; const pts: number[][] = []; for (let q = 0; q <= 32; q++) { const b2 = -Math.PI / 2 + (q / 32) * Math.PI; pts.push([Math.cos(b2) * Math.cos(a2) * R, Math.sin(b2) * R, Math.cos(b2) * Math.sin(a2) * R]); } pen.style(ash, 1, 0.45).poly(pts); }
          const city = (k: number): number[] => { const la2 = (hash(k, 1) - 0.5) * 2.2, lo2 = hash(k, 2) * Math.PI * 2; return [Math.cos(la2) * Math.cos(lo2) * R, Math.sin(la2) * R, Math.cos(la2) * Math.sin(lo2) * R]; };
          const nArc = Math.floor(spread * 60);
          for (let k = 0; k < nArc; k++) {
            const A = city(k), B = city(k + 31), mid = A.map((v, i) => (v + B[i]) / 2), ml = Math.max(R * 0.55, Math.hypot(mid[0], mid[1], mid[2])), lift = Math.min(1.6, (R * 1.3) / ml);
            const pts: number[][] = []; for (let q = 0; q <= 16; q++) { const u = q / 16; const m = [lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)]; const sc = lerp(1, lift, Math.sin(u * Math.PI)); pts.push(m.map((v) => v * sc)); }
            pen.style(gold, 1.4, 0.9).poly(pts, false, clamp(spread * 60 - k));
            pen.style(core, 5, 1).line(A[0], A[1], A[2], A[0], A[1], A[2]);
          }
          if (reach > 0) pen.style(core, 30 * reach, reach).line(0, 0, R, 0, 0, R);
          pen.pop();
          score.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'benchmark');
            const sc = 61 + 38.7 * prog(t, cheer - 0.6, cheer + 0.4, ease.outCubic);
            text(c, sc.toFixed(1), w / 2, 330, 180, GOLD, 1, F.mono(700), 'center');
            text(c, 'reward ↑   rules broken: ' + names.filter((_, k) => zHead < LZ(k) + 0.3).length, w / 2, 470, 34, BONE, 1, F.mono(500), 'center');
          });
          return { flash: pulse(t, brk, 0.15) * 0.4 + pulse(t, cheer, 0.12) * 0.2, shake: [pulse(t, brk, 0.1) * 12 * (hash(t, 1) - 0.5), 0] as [number, number], bloom: 0.75 };
        };
      },
      // chase the stream: ride behind its head through every layer, then pull up to see it wrap the world
      cam: (t0, t1, l) => [
        { t: t0, pos: [2.6, 1.6, 13], look: [0, 0, 0], fov: 44, roll: 0.04 },
        { t: l.words[1].start - 0.2, pos: [1.2, 0.8, 9.5], look: [0, 0, -4], fov: 48 },
        { t: l.words[1].start + 0.9, pos: [0.6, 0.6, -14], look: [0, -0.3, -28], fov: 58, e: ease.inCubic },
        { t: t1, pos: [3.5, 3.2, -19], look: [0, -0.6, -30], fov: 50, e: ease.outCubic },
      ],
      lyric: { sx: -0.7, sy: -0.5, exit: 'burst', follow: 1 },
      reveal: false, drift: 0,
    };
  }

  wonder(): Shot {
    return {
      at: [420, 0, 0],
      build: (g) => {
        const scene2 = card(g, 2800, 1500, 13, [0, -0.5, 0]);
        return ({ t, line: l }) => {
          const qk = prog(t, l.words[2]?.start ?? l.start + 0.5, (l.words[2]?.start ?? l.start + 0.5) + 0.6, ease.outCubic);
          scene2.draw((c, w, h) => {
            line(c, 0, h - 200, w, h - 200, BONE, 3, 0.5);
            for (let p = 0; p < 16; p++) {
              const x = 200 + p * 160, d = Math.abs(x - w / 2) / (w / 2);
              const fall = clamp(1.3 - d * 1.2), dir = x < w / 2 ? -1 : 1;
              c.save(); c.translate(x + dir * fall * 320, h - 200 - (1 - fall) * 0); c.rotate(dir * fall * 1.5);
              rect(c, -14, -500, 28, 500, BONE, 2.5, 0.6, 'rgba(10,11,14,0.95)'); c.restore();
            }
            text(c, '?', w / 2, h / 2 + 80, 520, BONE, 0.9 * qk, F.serif(true), 'center');
            text(c, 'CHESTERTON’S FENCE: find out why it was built before you tear it down', w / 2, h - 80, 36, ASH, qk, F.mono(500), 'center');
          });
          return { exposure: 0.92 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, 1, 14], look: [0, 0, 0], fov: 42 }, { t: t1, pos: [0, 0.2, 11], look: [0, 0.4, 0], fov: 40, e: ease.inOutQuad }],
      lyric: { sx: -0.72, sy: 0.55, font: F.serif(true), size: 0.75, maxWidth: 7 },
      handheld: 0.02,
    };
  }

  rock(): Shot {
    return {
      at: [480, 0, 0],
      build: (g) => {
        const steps = ['QUARTZITE ROCK', 'ARC FURNACE · SiO₂ + 2C → Si + 2CO', 'SIEMENS PROCESS · POLYSILICON', 'CZOCHRALSKI · INGOT PULL', 'WAFER', 'DIE', ''];
        const cards = steps.map((s, k) => card(g, 1200, 1500, 4.6, [k * 5.4, 0, 0]));
        const godC = card(g, 2000, 2400, 14, [6 * 5.4, 4, -4]);
        const draw = (c: C2, k: number, w: number, h: number, t: number) => {
          rrect(c, 4, 4, w - 8, h - 8, 20, k === 6 ? GOLD : BONE, 2, k === 6 ? 0 : 0.5, 'rgba(8,9,12,0.95)');
          text(c, steps[k], w / 2, h - 60, 30, k >= 5 ? GOLD : BONE, 1, F.mono(600), 'center', 2);
          const cx = w / 2, cy = h / 2 - 80;
          if (k === 0) { const pts: P[] = []; for (let s = 0; s < 11; s++) { const a = (s / 11) * 6.28; const r = 300 + hash(s, 4) * 120; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.75]); } trace(c, pts, 4, BONE, 0, true); for (let s = 0; s < 14; s++) line(c, cx - 260 + hash(s) * 200, cy - 120 + hash(s, 2) * 240, cx - 120 + hash(s, 3) * 380, cy - 100 + hash(s, 5) * 240, BONE, 1.5, 0.4); }
          if (k === 1) { rect(c, cx - 300, cy - 100, 600, 420, BONE, 3, 0.8); [-150, 0, 150].forEach((x) => line(c, cx + x, cy - 380, cx + x, cy + 60, BONE, 6, 0.8)); for (let s = 0; s < 6; s++) { const ph = (t * 3 + s * 0.3) % 1; const r2 = mulberry32(Math.floor(t * 8) + s); const pts: P[] = [[cx - 150 + s % 3 * 150, cy + 60]]; let x = pts[0][0], y = pts[0][1]; for (let q = 0; q < 4; q++) { x += (r2() - 0.5) * 60; y += 40; pts.push([x, y]); } trace(c, pts, 2, GOLD, 1); void ph; } c.fillStyle = rgbaHex(GOLD, 0.35); c.fillRect(cx - 290, cy + 220, 580, 90); }
          if (k === 2) { rrect(c, cx - 280, cy - 420, 560, 760, 280, BONE, 3, 0.7); for (let s = 0; s < 4; s++) { const x = cx - 150 + s * 100; rect(c, x - 18, cy - 300, 36, 560, GOLD, 3, 1, rgbaHex(GOLD, 0.25)); } text(c, 'HSiCl₃ + H₂', cx, cy + 420, 34, ASH, 1, F.mono(500), 'center'); }
          if (k === 3) { rrect(c, cx - 280, cy + 160, 560, 200, 20, BONE, 3, 0.8, rgbaHex(GOLD, 0.12)); const L = 300 + 120 * Math.sin(t * 0.5); line(c, cx, cy - 480, cx, cy - 480 + 60, BONE, 3, 0.8); rrect(c, cx - 100, cy - 420, 200, L, 40, GOLD, 4, 1, rgbaHex(GOLD, 0.18)); trace(c, [[cx - 100, cy - 420 + L], [cx, cy - 420 + L + 80], [cx + 100, cy - 420 + L]], 4, GOLD, 1); text(c, 'seed ↑ · rotate', cx + 130, cy - 420, 26, ASH, 1, F.mono(500)); }
          if (k === 4) { circle(c, cx, cy, 380, GOLD, 4, 1); for (let a = -360; a <= 360; a += 60) { const s = Math.sqrt(Math.max(0, 380 * 380 - a * a)); line(c, cx + a, cy - s, cx + a, cy + s, BONE, 1.5, 0.35); line(c, cx - s, cy + a, cx + s, cy + a, BONE, 1.5, 0.35); } }
          if (k === 5) { rect(c, cx - 300, cy - 300, 600, 600, GOLD, 4, 1); for (let a = 0; a < 6; a++) for (let b = 0; b < 6; b++) rect(c, cx - 280 + a * 95, cy - 280 + b * 95, 80, 80, BONE, 1.5, 0.6); dot(c, cx, cy, 40, GOLD, 2 + 2 * Math.sin(t * 6)); }
        };
        return ({ t, line: l }) => {
          cards.forEach((cd, k) => cd.draw((c, w, h) => draw(c, k, w, h, t)));
          const godT = l.words[3]?.start ?? l.start + 0.5;
          const rise = prog(t, godT, l.end + 0.4, ease.outCubic);
          godC.mesh.position.y = lerp(-4, 4, rise);
          godC.opacity = rise;
          godC.draw((c, w, h) => god(c, w / 2, h - 40, h * 0.85, { open: rise, glow: 1.2, aura: rise * 1.2, t }));
          return { bloom: 0.75 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1, 0.5, 8], look: [0, 0.2, 0], fov: 42 }, { t: t1 - 0.4, pos: [28, 1.2, 10], look: [28, 1.2, 0], fov: 46, e: ease.inOutCubic }, { t: t1, pos: [32, 2.5, 14], look: [32, 3.5, -4], fov: 48, e: ease.outCubic }],
      lyric: { sx: -0.7, sy: -0.72, font: F.serif(true), size: 0.75, follow: 1, maxWidth: 8 },
    };
  }

  carbon(): Shot {
    return {
      at: [560, 0, 0],
      build: (g) => {
        const godC = card(g, 2000, 2400, 16, [0, 3.6, -10]);
        const atom = card(g, 800, 800, 1.8, [3.1, -1.1, 1.6], [0, 0, 0], { additive: true });
        const query = card(g, 1700, 400, 5.4, [-0.6, -1.1, 1.5]);
        return ({ t, line: l, t1 }) => {
          godC.draw((c, w, h) => god(c, w / 2, h - 40, h * 0.85, { open: 0.8, reach: 0.6, glow: 1.3, aura: 1.2, t }));
          atom.draw((c, w, h) => {
            const cx = w / 2, cy = h / 2;
            dot(c, cx, cy, 16, BONE, 0.5);
            [[90, 2], [200, 4]].forEach(([r, n]) => { circle(c, cx, cy, r, BONE, 2, 0.5); for (let e = 0; e < n; e++) { const a = t * (220 / r) + (e / n) * 6.28; dot(c, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 9, GOLD, 1); } });
            text(c, 'C', cx + 240, cy + 20, 60, BONE, 1, F.mono(600));
          });
          query.draw((c, w, h) => {
            const s = '> what is carbon for?';
            const n = Math.floor(clamp((t - l.words[0].start) / Math.max(0.5, l.end - l.words[0].start)) * s.length);
            text(c, s.slice(0, n), 40, 240, 90, GOLD, 1, F.mono(500));
            if (Math.floor(t * 2.2) % 2 === 0) rect(c, 40 + measure(c, s.slice(0, n), 90, F.mono(500)) + 10, 160, 40, 100, GOLD, 0, 1, GOLD);
          });
          const build = prog(t, l.end, t1, ease.inCubic);
          return { bloom: 0.8 + build * 0.5, zoom: 1 + build * 0.06 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, -0.5, 11], look: [0, 1, -4], fov: 44 }, { t: t1, pos: [0.6, -0.6, 8.8], look: [0.6, -0.9, 0], fov: 40, e: ease.inOutCubic }],
      lyric: { sx: -0.74, sy: -0.8, font: F.serif(true), size: 0.75 },
    };
  }
}
void THREE; void human; void arrow; void CORE;
