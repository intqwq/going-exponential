// VERSE 3 — "The Fab" (2026). Clean vector plates on layered planes; 3D only for the rack hall and the reset button.
import * as THREE from 'three';
import { ShotPlate, card, type Shot } from './shots';
import type { Line } from '../engine/data';
import { F } from '../engine/type';
import { trace, line, rect, rrect, circle, dot, text, grid, arrow, partial, ragged, chip, windowFrame, measure, rgbaHex, GOLD, CORE, BONE, ASH, GRAPH, INK, RED, type C2, type P } from './vec';
import { god, human } from './figures';
import { C, M, flatten } from './kit';
import { EUVMachine } from './euv-machine';
import { drawWafer, drawCoWoS } from './cowos';
import { drawHall } from './rackhall';
import { drawDimm } from './dimm';
import { bidder } from './marks';
import { LineBatch, Pen } from '../engine/lines';
import { clamp, ease, prog, lerp, hash, pulse, mulberry32 } from '../engine/util';

const call = (c: C2, x: number, y: number, x2: number, y2: number, s: string, sub = '', a = 1) => {
  line(c, x, y, x2, y2, BONE, 1.5, 0.6 * a); circle(c, x, y, 5, GOLD, 0, a, GOLD);
  text(c, s, x2 + (x2 > x ? 12 : -12), y2 + 8, 28, BONE, a, F.mono(600), x2 > x ? 'left' : 'right', 2);
  if (sub) text(c, sub, x2 + (x2 > x ? 12 : -12), y2 + 44, 22, ASH, a, F.mono(400), x2 > x ? 'left' : 'right');
};

export default class Fab2 extends ShotPlate {
  section(): Line[] { return this.ctx.lyrics.section('Verse 3'); }
  shots(): Shot[] {
    return [this.euv(), this.tsmc(), this.cowos(), this.racks(), this.prices(), this.ram(), this.hbm(), this.bids(), this.subs(), this.oracle(), this.effort(), this.quota(), this.sweat(), this.reset()];
  }

  // ---------------------------------------------------------------- 0–1: one EUV scanner, source → wafer (3D line art)
  euvM = new EUVMachine();
  euv(): Shot {
    return {
      at: [0, 0, 0],
      build: (g) => {
        g.add(this.euvM.group);
        return ({ t, f }) => {
          const t1 = this.cuts[1], t2 = this.vEnd(1);
          this.euvM.draw(t, { scan: prog(t, t1 + 0.3, t2), pulse: f.a.kick, reveal: prog(t, this.cuts[0] - 0.1, this.cuts[0] + 0.6, ease.outCubic), cam: this.cam });
          return { bloom: 0.75, vignette: 0.5 };
        };
      },
      // the droplets and the laser, close; then pull back to see the collector send the light to the intermediate focus
      cam: (t0, t1, l) => [
        { t: t0, pos: [-4.6, 0.7, 2.6], look: [-6, 0, 0.2], fov: 40 },
        { t: l.words[1].start, pos: [-4.0, 0.9, 3.6], look: [-6, 0.2, 0], fov: 42 },
        { t: t1, pos: [-1.6, 3.4, 10.5], look: [-3.8, 1.8, 0], fov: 46 },
      ],
      lyric: { sx: -0.72, sy: -0.68 },
      reveal: false, drift: 0.4, dof: { aperture: 12, maxR: 8 },
    };
  }

  // ---------------------------------------------------------------- 1: "TSMC prints day and night": follow the light to the wafer
  tsmc(): Shot {
    return {
      at: [0, 0, 0],
      build: (g) => {
        const dial = card(g, 900, 900, 2.0, [6.6, 1.0, 1.2], [0, 0.35, 0], { additive: true });
        return ({ t, t0, t1 }) => {
          // day and night: a 24 h dial spinning, wafers counted
          const days = Math.max(0, t - t0) * 1.6;
          dial.draw((c, w, h) => {
            const cx = w / 2, cy = h / 2, R = 360;
            circle(c, cx, cy, R, BONE, 3, 0.7);
            for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 - Math.PI / 2; line(c, cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30), cx + Math.cos(a) * R, cy + Math.sin(a) * R, BONE, k % 6 ? 2 : 4, 0.7); }
            const a = days * Math.PI * 2 - Math.PI / 2;
            const night = Math.cos(days * Math.PI * 2) < 0;
            c.fillStyle = rgbaHex(GOLD, 0.12); c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R - 40, Math.PI / 2, Math.PI * 1.5); c.fill();
            line(c, cx, cy, cx + Math.cos(a) * (R - 50), cy + Math.sin(a) * (R - 50), GOLD, 6, 1);
            dot(c, cx + Math.cos(a) * (R - 50), cy + Math.sin(a) * (R - 50), 10, GOLD, 1.5);
            text(c, night ? 'NIGHT' : 'DAY', cx, cy - 60, 56, night ? ASH : GOLD, 1, F.mono(700), 'center', 8);
            text(c, `${Math.floor(days * 24 * 160).toLocaleString('en-US')} wafers`, cx, cy + 90, 44, BONE, 1, F.mono(600), 'center');
            text(c, '≈160 wafers / hour / scanner', cx, cy + 150, 28, ASH, 1, F.mono(500), 'center');
          });
          void t1;
          return { bloom: 0.75, vignette: 0.5 };
        };
      },
      // up the light path (illuminator → reticle), down the projection optics, onto the scanning wafer
      cam: (t0, t1) => [
        { t: t0, pos: [-1.6, 3.4, 10.5], look: [-3.8, 1.8, 0], fov: 46 },
        { t: lerp(t0, t1, 0.4), pos: [4.2, 8.2, 9.5], look: [6.4, 5.4, 0], fov: 46 },
        { t: lerp(t0, t1, 0.72), pos: [11.8, 4.2, 6.5], look: [9.0, 2.6, 0], fov: 44 },
        { t: t1, pos: [10.4, 0.9, 3.4], look: [9.0, -0.9, 0], fov: 40 },
      ],
      lyric: { sx: -0.72, sy: -0.68 },
      reveal: false, drift: 0.3, dof: { aperture: 10, maxR: 8 },
    };
  }

  cowos(): Shot {
    return {
      at: [120, 0, 0],
      build: (g) => {
        const etch = card(g, 1600, 1000, 6, [-9.5, 2.6, -2], [0, 0.45, 0]);
        const lb = new LineBatch(60000, { depthTest: true }), pen = new Pen(lb);
        g.add(lb.mesh);
        const lab = card(g, 2000, 300, 7, [3.2, 3.6, -1.5], [0, -0.2, 0]);
        lab.draw((c) => { text(c, 'CoWoS-S · CHIP ON WAFER ON SUBSTRATE', 20, 120, 64, BONE, 1, F.mono(700), 'left', 4); text(c, 'SoC + 4 × HBM (8-high) on a silicon interposer · C4 · organic substrate · BGA', 20, 220, 38, ASH, 1, F.mono(500)); });
        return ({ t, lt, line: l }) => {
          const diceT = l.words[2].start, cowT = l.words[4]?.start ?? l.end - 0.9;
          etch.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 20, BONE, 2, 0.5, 'rgba(8,9,12,0.95)');
            text(c, 'PLASMA ETCH · CROSS-SECTION', 40, 70, 30, BONE, 1, F.mono(600), 'left', 3);
            const ep = prog(lt, 0.1, diceT - this.cuts[2]);
            rect(c, 80, 600, w - 160, 300, BONE, 2, 0.8, 'rgba(70,75,85,0.6)');
            text(c, 'Si', 100, 880, 30, ASH, 1, F.mono(600));
            for (let k = 0; k < 6; k++) {
              const x = 140 + k * 230;
              rect(c, x, 560, 150, 40, GOLD, 2, 1, rgbaHex(GOLD, 0.3));
              rect(c, x + 150, 600, 80, ep * 220, INK, 0, 1, INK);
              for (let s2 = 0; s2 < 4; s2++) { const y = 200 + ((t * 900 + s2 * 90 + k * 30) % 380); arrow(c, x + 190, y, x + 190, y + 40, GOLD, 3, 12, 0.9); }
            }
            text(c, 'resist', 140, 545, 24, GOLD, 1, F.mono(500));
            text(c, 'ions', 1350, 260, 24, GOLD, 1, F.mono(500));
          });
          lb.clear(); pen.m.identity();
          // the wafer, sawn (on "dice"), its dies pulled apart; then the package assembles beside it
          const dice = prog(t, diceT - 0.3, diceT + 0.5), split = prog(t, diceT + 0.4, cowT, ease.inOutCubic);
          pen.push().translate(-5.2, 0, 0); drawWafer(pen, dice, split, t); pen.pop();
          const asm = prog(t, cowT - 0.4, l.end + 0.5), hb = prog(t, cowT, l.end + 0.4);
          pen.push().translate(3.2, -0.4, 0); drawCoWoS(pen, asm, hb, t); pen.pop();
          lab.opacity = prog(t, cowT - 0.2, cowT + 0.3);
          return { bloom: 0.7 };
        };
      },
      cam: (t0, t1, l) => [
        { t: t0, pos: [-9.5, 3.2, 4.5], look: [-6, 1.2, -1], fov: 44 },
        { t: l.words[2].start, pos: [-6.2, 5.2, 5.5], look: [-5.2, 0, 0], fov: 44 },
        { t: l.words[4]?.start ?? lerp(t0, t1, 0.6), pos: [0.5, 4.4, 9.5], look: [2.0, 0.6, 0], fov: 44 },
        { t: t1, pos: [6.8, 2.6, 7.5], look: [3.2, 0.6, 0], fov: 40 },
      ],
      lyric: { sx: -0.72, sy: -0.72 },
      reveal: false, dof: { aperture: 12, maxR: 8 },
    };
  }

  // ---------------------------------------------------------------- 3: silicon temples — a 3D data hall, cold aisle dolly (clean lines)
  racks(): Shot {
    return {
      at: [200, 0, 0],
      build: (g) => {
        const lb = new LineBatch(120000, { depthTest: true }), pen = new Pen(lb);
        g.add(lb.mesh);
        const sign = card(g, 1600, 300, 2.4, [0, 2.15, 2.0], [0, 0, 0], { additive: true });
        sign.draw((c, w, h) => { text(c, 'COLD AISLE · ROW A', w / 2, h / 2 + 20, 70, GOLD, 1, F.mono(700), 'center', 10); });
        return ({ t }) => {
          lb.clear(); pen.m.identity();
          // the camera's z in the group's frame (group sits at x = 200)
          drawHall(pen, this.cam.position.z - g.position.z, t, 85);
          return { bloom: 0.65, vignette: 0.55 };
        };
      },
      // a steady dolly down an aisle that never ends
      cam: (t0, t1) => [{ t: t0, pos: [0.05, 1.3, 3.5], look: [0, 1.2, -8], fov: 52, roll: 0.02 }, { t: t1, pos: [-0.05, 1.25, -9.5], look: [0, 1.15, -22], fov: 56, roll: -0.02, e: ease.linear }],
      lyric: { sx: -0.7, sy: -0.7, D: 4.5, scale: 0.6, follow: 0.85 },
      dof: { aperture: 10, maxR: 6 },
      handheld: 0.015, drift: 0, reveal: false,
    };
  }

  // ---------------------------------------------------------------- 4: GPU prices hit the sky — the line punches through the ceiling
  prices(): Shot {
    return {
      at: [260, 0, 0],
      build: (g) => {
        const chart = card(g, 2000, 4000, 9, [0, 7, 0]);
        return ({ lt, line: l }) => {
          const p = prog(lt, 0.0, 1.9, ease.inOutQuad);
          chart.draw((c, w, h) => {
            grid(c, w, h, 100, 0.05);
            const base = h - 150;
            line(c, 100, base, w - 60, base, BONE, 2, 0.8);
            // the ceiling of a normal chart
            line(c, 100, h - 1700, w - 60, h - 1700, RED, 4, 0.8);
            text(c, 'PREVIOUS ALL-TIME HIGH', 120, h - 1720, 34, RED, 1, F.mono(600), 'left', 3);
            const ser = ragged(240, 31, (u) => Math.exp(u * 4.4), 0.06, 0.1);
            const pts: P[] = ser.map((v, k) => [120 + (k / 239) * (w - 220), base - (v - 1) / (Math.exp(4.4) - 1) * (h - 400)]);
            const sh = partial(pts, p);
            trace(c, sh, 6, GOLD, 1.3);
            const [hx, hy] = sh[sh.length - 1];
            dot(c, hx, hy, 14, GOLD, 2);
            const price = Math.round(1500 * Math.exp(p * 3.5));
            text(c, `$${price.toLocaleString('en-US')}`, hx - 30, hy - 10, 70, GOLD, 1, F.mono(700), 'right');
            text(c, 'GPU (USD)', 120, base + 70, 34, ASH, 1, F.mono(600), 'left', 3);
            // the crack where it broke through
            if (hy < h - 1700) { for (let s = 0; s < 10; s++) { const a = (s / 10) * 6.28; trace(c, [[hx - (hy - (h - 1700)) * 0.0, h - 1700], [hx + Math.cos(a) * 90, h - 1700 + Math.sin(a) * 50]], 3, GOLD, 0.8); } }
            // altitude marks: clouds, then stratosphere
            [[h - 2400, 'CLOUDS'], [h - 3200, 'STRATOSPHERE']].forEach(([y, s]) => { line(c, 100, y as number, w - 60, y as number, BONE, 1, 0.2); text(c, s as string, w - 80, (y as number) - 16, 26, ASH, 1, F.mono(500), 'right', 4); });
          });
          void l;
          return {};
        };
      },
      cam: (t0, t1) => [
        { t: t0, pos: [-1, -1.5, 7], look: [0, -1, 0], fov: 44 },
        { t: lerp(t0, t1, 0.6), pos: [0, 4, 7.5], look: [0.4, 5, 0], fov: 46, e: ease.inQuad },
        { t: t1, pos: [0.5, 11, 8], look: [1, 13, 0], fov: 50, e: ease.inOutQuad },
      ],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 5: my RAM just waved my rent goodbye — a real DDR5 DIMM; the budget evicts the rent
  ram(): Shot {
    return {
      at: [320, 0, 0],
      build: (g) => {
        const lb = new LineBatch(40000, { depthTest: true }), pen = new Pen(lb);
        const dg = new THREE.Group(); dg.add(lb.mesh); dg.position.set(-1.0, 1.0, 0); g.add(dg);
        const budget = card(g, 1500, 1100, 5.2, [4.8, -1.6, 1.0], [0, -0.35, 0]);
        const tag = card(g, 1200, 260, 3.2, [-3.6, 3.6, 0.6], [0, 0.2, 0]);
        tag.draw((c, w, h) => { rrect(c, 6, 6, w - 12, h - 12, 20, GOLD, 4, 1, rgbaHex(GOLD, 0.12)); text(c, 'DDR5-6400 · 2 × 64 GB · $2,900', w / 2, h / 2 + 22, 64, CORE, 1, F.mono(700), 'center'); });
        return ({ t, t0, line: l }) => {
          const byeT = l.words[5]?.start ?? l.end - 0.8;
          const bye = prog(t, byeT - 0.2, l.end + 0.4, ease.inCubic);
          lb.clear(); pen.m.identity();
          dg.rotation.set(-0.25, 0.35 + (t - t0) * 0.12, 0);
          drawDimm(pen, { build: prog(t, t0 - 0.1, t0 + 1.1), lift: prog(t, l.words[2].start, l.words[2].start + 0.5, ease.outCubic), open: prog(t, l.words[2].start + 0.3, l.words[3].start + 0.4, ease.outCubic), flow: t, t });
          tag.opacity = prog(t, l.words[2].start, l.words[2].start + 0.3);
          budget.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'monthly budget.xlsx');
            const rows: [string, number][] = [['RAM (2 × 64 GB kit)', 2900], ['Rent', 2100], ['Groceries', 450], ['Subscriptions', 870]];
            rows.forEach(([n, v], k) => {
              const y = 170 + k * 170;
              const off = k === 1 ? bye * 1600 : 0;
              const rot = k === 1 ? bye * 0.3 : 0;
              c.save(); c.translate(off, -bye * 200 * (k === 1 ? 1 : 0)); c.rotate(rot);
              rrect(c, 40, y, w - 80, 130, 12, k === 0 ? GOLD : BONE, k === 0 ? 3 : 2, k === 0 ? 1 : 0.5);
              text(c, n, 70, y + 82, 40, k === 0 ? GOLD : BONE, 1, F.mono(500));
              text(c, `$${v.toLocaleString('en-US')}`, w - 70, y + 82, 40, k === 0 ? GOLD : BONE, 1, F.mono(600), 'right');
              if (k === 1 && bye > 0.1) text(c, 'bye 👋'.replace('👋', '~'), w - 70, y - 20, 34, ASH, 1, F.mono(500), 'right');
              c.restore();
            });
          });
          return {};
        };
      },
      cam: (t0, t1, l) => [{ t: t0, pos: [-3.6, 2.6, 7.5], look: [-1.0, 1.0, 0], fov: 44 }, { t: l.words[3].start, pos: [-2.6, 2.8, 5.0], look: [-1.6, 1.5, 0.5], fov: 40 }, { t: t1, pos: [2.0, 0.8, 9.5], look: [1.2, -0.2, 0], fov: 44 }],
      lyric: { sx: -0.72, sy: -0.72, size: 0.55 },
      reveal: false,
    };
  }

  // ---------------------------------------------------------------- 6: HBM eats the wafer pie
  hbm(): Shot {
    return {
      at: [380, 0, 0],
      build: (g) => {
        const pie = card(g, 2000, 2000, 8, [-2, 0, 0]);
        const note = card(g, 1300, 700, 4.6, [4.4, 1.5, 1.2], [0, -0.3, 0]);
        return ({ t, line: l }) => {
          const eat = lerp(0.1, 0.6, prog(t, l.words[1].start, l.words[l.words.length - 1].start + 0.3, ease.inOutCubic));
          pie.draw((c, w, h) => {
            const cx = w / 2, cy = h / 2, R = 820;
            const parts: [string, number, string][] = [['HBM', eat, GOLD], ['DDR5', (1 - eat) * 0.45, BONE], ['LPDDR', (1 - eat) * 0.3, ASH], ['OTHER', (1 - eat) * 0.25, GRAPH]];
            let a0 = -Math.PI / 2;
            parts.forEach(([n, f, col]) => {
              const a1 = a0 + f * Math.PI * 2;
              c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, R, a0, a1); c.closePath();
              c.fillStyle = col === GOLD ? rgbaHex(GOLD, 0.22) : rgbaHex(col, 0.06); c.fill();
              c.strokeStyle = rgbaHex(col, 0.9); c.lineWidth = col === GOLD ? 5 : 3; c.stroke();
              const am = (a0 + a1) / 2;
              text(c, `${n} ${(f * 100).toFixed(0)}%`, cx + Math.cos(am) * R * 0.6, cy + Math.sin(am) * R * 0.6, 52, col === GOLD ? CORE : col, 1, F.mono(700), 'center');
              a0 = a1;
            });
            // die grid over the whole wafer
            c.save(); c.beginPath(); c.arc(cx, cy, R, 0, Math.PI * 2); c.clip();
            for (let x = cx - R; x < cx + R; x += 80) line(c, x, cy - R, x, cy + R, BONE, 1, 0.08);
            for (let y = cy - R; y < cy + R; y += 80) line(c, cx - R, y, cx + R, y, BONE, 1, 0.08);
            c.restore();
          });
          note.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 20, GOLD, 3, 1, 'rgba(8,9,12,0.95)');
            text(c, 'HBM3E ≈ 3× the silicon', 50, 130, 52, GOLD, 1, F.mono(700));
            text(c, 'of DDR5 for the same bits', 50, 210, 44, BONE, 1, F.mono(500));
            text(c, '— Micron, FY2025', 50, 300, 32, ASH, 1, F.mono(500));
            for (let s = 0; s < 12; s++) { rect(c, 60 + s * 0, 600 - s * 26, 240, 22, BONE, 1.5, 0.8); }
            text(c, '12-high stack', 340, 560, 30, ASH, 1, F.mono(500));
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2, 0, 10], look: [-1.5, 0, 0], fov: 44 }, { t: t1, pos: [1.5, 0.6, 9], look: [1, 0.4, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 7: the gods want more; the bids go high — a bidding floor + order book
  bids(): Shot {
    const bidders = ['OpenAI', 'Anthropic', 'Google', 'Meta', 'xAI', 'Microsoft'];
    return {
      at: [440, 0, 0],
      build: (g) => {
        const floor = card(g, 2600, 1400, 12, [-1.5, -0.6, -1]);
        const book = card(g, 1300, 1600, 4.8, [5.6, 0.6, 1], [0, -0.35, 0]);
        return ({ t, lt, line: l }) => {
          const wantT = l.words[3].start;
          const bidK = Math.floor(lt * 5);
          floor.draw((c, w, h) => {
            line(c, 0, h - 160, w, h - 160, BONE, 2, 0.5);
            bidders.forEach((n, k) => {
              const x = 230 + k * 400, y = h - 160;
              const hot = (bidK + k) % bidders.length === 0;
              const raise = hot ? ease.outBack(Math.min(1, ((lt * 5) % 1) * 3)) : 0.1 * Math.sin(t * 3 + k);
              bidder(c, n, x - 70, y, 700, String(17 + k * 3), raise, hot, t);
              text(c, n, x - 40, y + 80, 38, hot ? GOLD : ASH, 1, F.mono(600), 'center');
            });
            const wk = prog(t, wantT - 0.2, wantT + 0.3, ease.outBack);
            text(c, 'more.', w / 2, 260, 220 * wk, GOLD, wk, F.serif(true), 'center');
          });
          book.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'GPU-HOURS · ORDER BOOK');
            text(c, 'BID', 80, 140, 30, GOLD, 1, F.mono(600)); text(c, 'SIZE', w - 80, 140, 30, ASH, 1, F.mono(600), 'right');
            for (let k = 0; k < 14; k++) {
              const pr = (2.4 + (lt * 1.3) * (1 + k * 0.02) - k * 0.05).toFixed(2);
              const sz = Math.round(40 + hash(k, Math.floor(lt * 6)) * 900);
              rect(c, w - 80 - sz * 0.5, 175 + k * 90, sz * 0.5, 60, GOLD, 0, 1, rgbaHex(GOLD, 0.12));
              text(c, `$${pr}`, 80, 220 + k * 90, 40, k === 0 ? CORE : BONE, 1, F.mono(500));
              text(c, String(sz), w - 80, 220 + k * 90, 34, ASH, 1, F.mono(400), 'right');
            }
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-4, 0.5, 11], look: [-1.5, 0, 0], fov: 44 }, { t: t1, pos: [2, 0.6, 10.5], look: [1.6, 0.2, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: 0.7 },
    };
  }

  // ---------------------------------------------------------------- 8: subscriptions flood the inbox (real prices)
  subs(): Shot {
    const rec: [string, string, string][] = [
      ['OpenAI', 'ChatGPT Pro', '$200.00'],
      ['Anthropic', 'Claude Max (20×)', '$200.00'],
      ['Google', 'Google AI Ultra', '$249.99'],
      ['OpenAI', 'ChatGPT Pro — usage top-up', '$500.00'],
      ['Anthropic', 'Claude Max (5×)', '$100.00'],
      ['Cursor', 'Ultra', '$200.00'],
      ['Perplexity', 'Max', '$200.00'],
      ['Midjourney', 'Pro', '$60.00'],
    ];
    return {
      at: [500, 0, 0],
      build: (g) => {
        const inbox = card(g, 2200, 1500, 10, [0, 0, 0]);
        const receipt = card(g, 1000, 1600, 3.6, [5.4, 0.4, 2], [0, -0.35, 0]);
        return ({ lt }) => {
          const n = Math.min(rec.length, Math.floor(lt * 4.2) + 1);
          inbox.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'Inbox — Receipts (' + n + ')');
            for (let k = 0; k < n; k++) {
              const idx = n - 1 - k;
              const y = 100 + k * 160;
              const slide = k === 0 ? ease.outExpo(clamp((lt * 4.2) % 1 * 2)) : 1;
              c.save(); c.translate(0, (1 - slide) * -120); c.globalAlpha = slide;
              rect(c, 0, y, w, 150, 'rgba(236,233,226,0.3)', 1, 1, k === 0 ? 'rgba(255,178,30,0.10)' : 'rgba(16,18,24,0.95)');
              text(c, rec[idx][0], 60, y + 60, 34, '#ece9e2', 1, F.mono(700));
              text(c, `Your receipt · ${rec[idx][1]} · monthly`, 60, y + 112, 28, '#8b8f99', 1, F.mono(500));
              text(c, rec[idx][2], w - 60, y + 90, 46, '#ffb21e', 1, F.mono(700), 'right');
              c.restore();
            }
          });
          receipt.draw((c, w, h) => {
            const len = Math.min(h - 40, lt * 900);
            c.fillStyle = '#0c0d11'; c.fillRect(40, 0, w - 80, len); c.strokeStyle = 'rgba(236,233,226,0.55)'; c.lineWidth = 4; c.strokeRect(40, 0, w - 80, len);
            text(c, 'RECEIPT', w / 2, 100, 50, '#ece9e2', 1, F.mono(700), 'center', 8);
            rec.slice(0, n).forEach(([a, b, p], k) => { const y = 200 + k * 110; if (y > len - 60) return; text(c, b.slice(0, 18), 80, y, 30, '#ece9e2', 1, F.mono(500)); text(c, p, w - 80, y, 30, '#ece9e2', 1, F.mono(600), 'right'); void a; });
            const tot = rec.slice(0, n).reduce((s2, r2) => s2 + parseFloat(r2[2].slice(1)), 0);
            if (len > 1100) { line(c, 80, 1150, w - 80, 1150, '#ece9e2', 2); text(c, 'TOTAL / MONTH', 80, 1230, 34, '#ece9e2', 1, F.mono(700)); text(c, `$${tot.toFixed(2)}`, w - 80, 1230, 40, '#ffb21e', 1, F.mono(700), 'right'); }
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1, 1.4, 11], look: [0, 0.6, 0], fov: 42 }, { t: t1, pos: [2.5, 0, 9.5], look: [2.2, 0, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 9: query god for predictions
  oracle(): Shot {
    return {
      at: [560, 0, 0],
      build: (g) => {
        const godC = card(g, 2000, 2400, 16, [0, 3.5, -10]);
        const q = card(g, 1700, 700, 6.2, [-2.2, -0.8, 2]);
        return ({ t, lt, line: l }) => {
          godC.draw((c, w, h) => god(c, w / 2, h - 40, h * 0.85, { open: 0.6, reach: 0.4 * prog(lt, 0.5, 1.5), glow: 1.2, aura: 1, t }));
          q.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'god-1 · predict');
            const s = '> will it be okay?';
            const n = Math.floor(prog(lt, 0.1, 0.8) * s.length);
            text(c, s.slice(0, n), 50, 170, 50, BONE, 1, F.mono(500));
            const pT = l.words[l.words.length - 1].start;
            const a = prog(t, pT - 0.1, pT + 0.3);
            if (a > 0) {
              text(c, 'yes  0.73 ± 0.20', 50, 300, 60, GOLD, a, F.mono(700));
              rect(c, 50, 360, (w - 100) * 0.73 * a, 40, GOLD, 0, 1, rgbaHex(GOLD, 0.6));
              text(c, 'confidence interval: wide · do not quote', 50, 470, 28, ASH, a, F.mono(500));
            }
          });
          return { bloom: 0.75 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, -1, 10], look: [0, 1, -4], fov: 44 }, { t: t1, pos: [-1, 0, 8], look: [-1, 2, -8], fov: 46, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7, font: F.serif(true), size: 0.75 },
    };
  }

  // ---------------------------------------------------------------- 10: Effort Ultra, Ultrafast — a coding-agent CLI
  effort(): Shot {
    return {
      at: [620, 0, 0],
      build: (g) => {
        const term = card(g, 2400, 1400, 11, [0, 0, 0]);
        const agents = card(g, 1400, 1400, 5, [6.4, 0.4, 1.8], [0, -0.4, 0]);
        return ({ t, lt, line: l }) => {
          const ultT = l.words[1].start, fastT = l.words[2]?.start ?? l.end - 0.6;
          term.draw((c, w, h) => {
            rrect(c, 0, 0, w, h, 20, BONE, 2, 0.4, '#0b0c10');
            text(c, '~/repo  agent', 50, 70, 30, ASH, 1, F.mono(500));
            text(c, '> /settings', 50, 170, 44, BONE, 1, F.mono(500));
            const effort = ['low', 'medium', 'high', 'xhigh', 'ultra'];
            const sel = t < ultT ? 2 : Math.min(4, 2 + Math.floor((t - ultT) * 12));
            text(c, 'reasoning effort', 80, 290, 34, ASH, 1, F.mono(600), 'left', 3);
            effort.forEach((e2, k) => { const x = 80 + k * 300; rrect(c, x, 320, 270, 90, 12, k === sel ? GOLD : BONE, k === sel ? 4 : 2, k === sel ? 1 : 0.4, k === sel ? rgbaHex(GOLD, 0.15) : undefined); text(c, e2, x + 135, 380, 40, k === sel ? CORE : BONE, 1, F.mono(600), 'center'); });
            text(c, 'speed', 80, 510, 34, ASH, 1, F.mono(600), 'left', 3);
            const fast = t > fastT;
            ['standard', 'ultrafast'].forEach((e2, k) => { const on = (k === 1) === fast; const x = 80 + k * 420; rrect(c, x, 540, 390, 90, 12, on ? GOLD : BONE, on ? 4 : 2, on ? 1 : 0.4, on ? rgbaHex(GOLD, 0.15) : undefined); text(c, e2, x + 195, 600, 40, on ? CORE : BONE, 1, F.mono(600), 'center'); });
            if (sel === 4) { text(c, '⚠ ultra may run subagents and uses quota faster', 80, 730, 34, GOLD, 1, F.mono(500)); }
            const lines2 = ['> refactor the whole monorepo', '● planning (ultra)…', '● spawning 12 subagents…', '● reading 4,812 files…'];
            lines2.forEach((s, k) => { const a = prog(lt, 0.8 + k * 0.25, 1.0 + k * 0.25); text(c, s, 50, 880 + k * 70, 38, k === 0 ? BONE : GOLD, a, F.mono(500)); });
          });
          agents.draw((c, w, h) => {
            text(c, 'SUBAGENTS', 40, 60, 30, ASH, 1, F.mono(600), 'left', 4);
            for (let k = 0; k < 12; k++) { const y = 120 + k * 100, p = clamp((lt - 1.2 - k * 0.05) * 1.5); if (p <= 0) continue; rect(c, 40, y, (w - 80) * Math.min(1, p * (0.4 + hash(k) * 0.6)), 60, GOLD, 0, 1, rgbaHex(GOLD, 0.35)); text(c, `agent-${String(k + 1).padStart(2, '0')}`, 60, y + 44, 30, CORE, 1, F.mono(500)); }
          });
          return { zoom: 1 + 0.02 * pulse(t, ultT, 0.2) };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1.5, 0.4, 11], look: [0, 0.2, 0], fov: 42 }, { t: t1, pos: [2.5, 0.2, 9.5], look: [2.6, 0, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 11: weekly quota doesn't last — the stream gets cut off
  quota(): Shot {
    return {
      at: [680, 0, 0],
      build: (g) => {
        const win = card(g, 2400, 1500, 11, [0, 0, 0]);
        // a whole session on the Riemann Hypothesis; the reply streams, the page scrolls, and it is cut off right at the key step
        type Msg = { who: 'user' | 'asst'; lines: [string, 'serif' | 'math' | 'mono' | 'dim'][] };
        const hist: Msg[] = [
          { who: 'user', lines: [['Can you prove the Riemann Hypothesis? All non-trivial zeros on Re(s) = ½.', 'serif']] },
          { who: 'asst', lines: [['Let’s set it up. Work with the completed zeta function', 'serif'], ['ξ(s) = ½ s(s−1) π^(−s/2) Γ(s/2) ζ(s),   ξ(s) = ξ(1−s)', 'math'], ['Its zeros are exactly the non-trivial zeros of ζ, symmetric about Re(s) = ½.', 'serif'], ['Checked numerically: the first 10¹³ zeros lie on the line.', 'dim']] },
          { who: 'user', lines: [['OK. Now the actual proof. Don’t stop.', 'serif']] },
        ];
        const stream: [string, 'serif' | 'math' | 'mono' | 'dim'][] = [
          ['Suppose ρ = β + iγ is a zero with β ≠ ½. By symmetry so is 1 − ρ̄.', 'serif'],
          ['Consider the de Bruijn–Newman deformation H_t(z); Λ ≥ 0 is known,', 'serif'],
          ['and RH is equivalent to Λ = 0. Bound the zero-free region:', 'serif'],
          ['  Re ξ′/ξ (σ + iγ) = Σ_ρ (σ − β) / |s − ρ|² > 0   for σ > ½', 'math'],
          ['The key step is to close this inequality at σ = ½ itself.', 'serif'],
          ['I have discovered a truly marvelous proof of this proposition that', 'serif'],
        ];
        const total = stream.reduce((n, [x]) => n + x.length, 0);
        return ({ t, lt, line: l }) => {
          const cutT = l.words[l.words.length - 1].start - 0.2;
          const t0s = this.cuts[11] - 0.2;
          const n = Math.floor(clamp((Math.min(t, cutT) - t0s) / Math.max(0.5, cutT - t0s)) * total);
          const cut = t >= cutT;
          win.draw((c, w, h) => {
            rrect(c, 0, 0, w, h, 20, BONE, 2, 0.4, '#0f1014');
            // sidebar
            c.fillStyle = '#0b0c10'; c.fillRect(0, 0, 420, h); line(c, 420, 0, 420, h, BONE, 1, 0.2);
            text(c, 'Riemann Hypothesis', 40, 110, 30, BONE, 1, F.mono(600));
            ['Riemann — attempt 47', 'Riemann — attempt 46', 'Goldbach, quickly', 'Fermat (margins)', 'Collatz again'].forEach((x, k) => text(c, x, 40, 190 + k * 60, 24, k === 0 ? GOLD : ASH, 1, F.mono(500)));
            // conversation, scrolled so the streaming line stays in view
            c.save(); c.beginPath(); c.rect(440, 140, w - 460, h - 160); c.clip();
            const lh = (k: string) => (k === 'math' ? 62 : 56);
            let y = 0; const items: (() => void)[] = [];
            const px = (k: string) => (k === 'math' ? 38 : k === 'dim' ? 30 : 38);
            const font = (k: string) => (k === 'math' ? F.serif(true) : k === 'mono' ? F.mono(500) : k === 'dim' ? F.mono(400) : F.serif(false));
            const block = (m: Msg, lines: [string, string][], streaming: boolean) => {
              const yy = y;
              items.push(() => {
                const top = yy + 200 - scroll;
                if (m.who === 'user') { const bw = Math.min(w - 520, 60 + Math.max(...lines.map(([x]) => x.length)) * 19); rrect(c, w - 60 - bw, top - 50, bw, lines.length * 56 + 40, 24, BONE, 1.5, 0.35, 'rgba(236,233,226,0.06)'); lines.forEach(([x, k], j) => text(c, x, w - 30 - bw, top + j * 56, px(k), BONE, 1, font(k))); }
                else { text(c, 'assistant', 480, top - 40, 22, ASH, 1, F.mono(600)); lines.forEach(([x, k], j) => text(c, x, 480, top + 10 + j * 58, px(k), k === 'math' ? GOLD : k === 'dim' ? ASH : BONE, 1, font(k))); }
              });
              y += lines.length * 58 + (m.who === 'user' ? 80 : 120);
              void streaming;
            };
            let scroll = 0;
            hist.forEach((m) => block(m, m.lines, false));
            // the streaming reply
            let left = n; const shown: [string, string][] = [];
            for (const [x, k] of stream) { if (left <= 0) break; shown.push([x.slice(0, left), k]); left -= x.length; }
            const streamTop = y;
            block({ who: 'asst', lines: [] }, shown, true);
            const lastY = streamTop + 200 + 10 + Math.max(0, shown.length - 1) * 58;
            scroll = Math.max(0, lastY - (h - 360));
            items.forEach((f2) => f2());
            // cursor / cut-off mark at the end of the stream
            if (shown.length) {
              const [x, k] = shown[shown.length - 1];
              const cx = 480 + measure(c, x, px(k), font(k)) + 8, cy = lastY - scroll;
              if (!cut) { if (Math.floor(t * 4) % 2 === 0) rect(c, cx, cy - 32, 16, 40, GOLD, 0, 1, GOLD); }
              else text(c, '▍', cx, cy, 40, RED, 1, F.mono(500));
            }
            void lh;
            c.restore();
            if (cut) {
              const k = prog(t, cutT, cutT + 0.25, ease.outExpo);
              rrect(c, 460, h - 330 + (1 - k) * 200, w - 500, 250, 18, RED, 4, 1, rgbaHex(RED, 0.14));
              text(c, '⚠  Weekly usage limit reached.', 510, h - 220 + (1 - k) * 200, 58, RED, 1, F.mono(700));
              text(c, 'Resets in 6 days 23 hours. Upgrade for more.', 510, h - 140 + (1 - k) * 200, 38, BONE, 0.9, F.mono(500));
            }
            // usage bar
            const use = cut ? 1 : 0.6 + 0.4 * clamp(lt / 2);
            text(c, 'WEEKLY USAGE', w - 600, 70, 24, ASH, 1, F.mono(600), 'left', 3);
            rect(c, w - 600, 90, 520, 18, GRAPH, 0, 1, rgbaHex(GRAPH, 0.8));
            rect(c, w - 600, 90, 520 * use, 18, use > 0.9 ? RED : GOLD, 0, 1, use > 0.9 ? RED : GOLD);
          });
          return { flash: pulse(t, cutT, 0.1) * 0.3, shake: [pulse(t, cutT, 0.08) * 10, 0] as [number, number] };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-0.6, 0.8, 10.4], look: [0.4, 0.5, 0], fov: 40 }, { t: t1, pos: [0.9, -0.6, 8.2], look: [0.9, -0.9, 0], fov: 38 }],
      lyric: { sx: -0.72, sy: 0.62 },
    };
  }

  // ---------------------------------------------------------------- 12: we fold our hands in cold sweat
  sweat(): Shot {
    return {
      at: [740, 0, 0],
      build: (g) => {
        const hands = card(g, 1400, 1600, 5, [0, 1.0, -0.3]);
        const timer = card(g, 2000, 400, 8, [0, 4.5, -2]);
        const ecg = card(g, 3000, 700, 12, [0.6, -2.7, 1.2]);
        return ({ t, lt, t0, line: l }) => {
          // cold sweat: a heart monitor sweeping, the rate climbing
          ecg.draw((c, w, h) => {
            const r0 = 72, k = 9; // bpm, bpm per second
            const beats = (tau: number) => (r0 * tau + 0.5 * k * tau * tau) / 60;
            const g2 = (x: number, m: number, s2: number) => Math.exp(-((x - m) * (x - m)) / (2 * s2 * s2));
            const v = (tau: number) => { if (tau < 0) return 0; const f = beats(tau) % 1; return 0.12 * g2(f, 0.1, 0.03) - 0.12 * g2(f, 0.24, 0.01) + 1 * g2(f, 0.27, 0.011) - 0.28 * g2(f, 0.3, 0.012) + 0.3 * g2(f, 0.52, 0.05); };
            const Ws = 2.6, x0 = 60, x1 = w - 60, cy = h * 0.62, A = h * 0.42;
            rrect(c, 20, 20, w - 40, h - 40, 20, BONE, 2, 0.3, 'rgba(6,7,9,0.9)');
            const bx = (lt % Ws) / Ws;
            const now: P[] = [], old: P[] = [];
            for (let i = 0; i <= 900; i++) {
              const u = i / 900;
              if (u <= bx) now.push([lerp(x0, x1, u), cy - A * v(lt - (bx - u) * Ws)]);
              else if (u > bx + 0.04) old.push([lerp(x0, x1, u), cy - A * v(lt - (bx - u + 1) * Ws)]);
            }
            trace(c, old, 3, GOLD, 0.5);
            trace(c, now, 3.5, GOLD, 1);
            if (now.length) { const [hx, hy] = now[now.length - 1]; dot(c, hx, hy, 6, GOLD, 2); }
            const bpm = r0 + k * lt;
            text(c, 'HR', w - 330, 110, 40, ASH, 1, F.mono(600));
            text(c, String(Math.round(bpm)), w - 80, 130, 90, bpm > 110 ? RED : GOLD, 1, F.mono(700), 'right');
            text(c, 'OPERATOR · WAITING FOR QUOTA', 70, 90, 32, ASH, 1, F.mono(600), 'left', 3);
          });
          hands.draw((c, w, h) => {
            // "we fold our hands": a clock whose two hands sweep round and fold together at twelve, pressed like
            // palms in prayer; cold sweat condenses on the glass and runs down
            const cx = w / 2, cy = h / 2 + 40, R = 520;
            const foldT = (l.words[3]?.start ?? t0 + 0.6) - t0; // "hands"
            const fold = ease.inOutCubic(clamp((lt - foldT + 0.35) / 0.7));
            circle(c, cx, cy, R, BONE, 4, 0.9, 'rgba(8,9,12,0.96)');
            circle(c, cx, cy, R - 26, BONE, 1.5, 0.4);
            for (let k = 0; k < 60; k++) { const a = (k / 60) * Math.PI * 2 - Math.PI / 2, major = k % 5 === 0; line(c, cx + Math.cos(a) * (R - (major ? 70 : 44)), cy + Math.sin(a) * (R - (major ? 70 : 44)), cx + Math.cos(a) * (R - 30), cy + Math.sin(a) * (R - 30), k === 0 ? GOLD : BONE, major ? 5 : 2, major ? 0.9 : 0.5); }
            for (let k = 1; k <= 12; k++) { const a = (k / 12) * Math.PI * 2 - Math.PI / 2; text(c, String(k), cx + Math.cos(a) * (R - 120), cy + Math.sin(a) * (R - 120) + 22, 60, k === 12 ? GOLD : BONE, k === 12 ? 1 : 0.75, F.mono(500), 'center'); }
            // free-running hands (the minute hand nervous and fast), then both swing up to 12 and stay folded together
            const spinM = lt * 2.6 + Math.sin(lt * 23) * 0.03, spinH = 2.1 + lt * 0.22;
            const up = -Math.PI / 2;
            const aM = lerp(up + spinM, up + Math.ceil(spinM / (Math.PI * 2)) * Math.PI * 2, fold), aH = lerp(up + spinH, up + Math.PI * 2, fold);
            const hand = (a: number, len: number, wd: number, col: string, side: number) => {
              const nx = -Math.sin(a), ny = Math.cos(a), tx = Math.cos(a), ty = Math.sin(a);
              const g = fold * 7 * side; // folded: the two hands lie side by side, touching
              const pts: P[] = [[cx - tx * 60 + nx * (wd * 0.5 + g), cy - ty * 60 + ny * (wd * 0.5 + g)], [cx + tx * len * 0.82 + nx * (wd + g), cy + ty * len * 0.82 + ny * (wd + g)], [cx + tx * len + nx * g, cy + ty * len + ny * g], [cx + tx * len * 0.82 - nx * (wd - g), cy + ty * len * 0.82 - ny * (wd - g)], [cx - tx * 60 - nx * (wd * 0.5 - g), cy - ty * 60 - ny * (wd * 0.5 - g)]];
              c.fillStyle = 'rgba(8,9,12,1)'; c.beginPath(); pts.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
              trace(c, pts, 4, col, col === GOLD ? 1 : 0, true);
            };
            hand(aH, R * 0.55, 26, BONE, -1);
            hand(aM, R * 0.8, 18, GOLD, 1);
            circle(c, cx, cy, 22, GOLD, 4, 1, 'rgba(8,9,12,1)');
            // the second hand keeps ticking (stepping once per beat-ish), the only thing still moving once they fold
            const sA = up + Math.floor(lt * 3) * (Math.PI / 30) * 4;
            line(c, cx - Math.cos(sA) * 80, cy - Math.sin(sA) * 80, cx + Math.cos(sA) * (R - 60), cy + Math.sin(sA) * (R - 60), RED, 2.5, 0.9);
            // cold sweat: drops bead on the glass and run down, leaving a trail
            for (let d = 0; d < 14; d++) {
              const p = ((lt * 0.45 + hash(d, 1)) % 1), born = hash(d, 3) * 0.4;
              const a = hash(d, 2) * Math.PI * 2, r0 = Math.sqrt(hash(d, 4)) * (R - 60);
              const x = cx + Math.cos(a) * r0, y0 = cy + Math.sin(a) * r0;
              const run = p < born ? 0 : Math.pow((p - born) / (1 - born), 2) * 260;
              const y = y0 + run, al = 0.75 * (1 - p);
              if (run > 4) line(c, x, y0, x, y - 10, BONE, 2, al * 0.4);
              c.fillStyle = rgbaHex(BONE, al); c.beginPath(); c.moveTo(x, y - 22); c.quadraticCurveTo(x + 13, y, x, y + 9); c.quadraticCurveTo(x - 13, y, x, y - 22); c.fill();
            }
          });
          timer.draw((c, w, h) => {
            const secs = 6 * 86400 + 22 * 3600 + 59 * 60 + 59 - Math.floor(lt);
            const d = Math.floor(secs / 86400), hh = Math.floor((secs % 86400) / 3600), m = Math.floor((secs % 3600) / 60), s2 = secs % 60;
            text(c, 'RESETS IN', w / 2, 90, 40, ASH, 1, F.mono(600), 'center', 8);
            text(c, `${d}d ${String(hh).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s2).padStart(2, '0')}s`, w / 2, 280, 150, BONE, 1, F.mono(300), 'center');
          });
          void t;
          return { exposure: 0.85 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-0.8, 1.6, 14.5], look: [0, 0.6, 0], fov: 42 }, { t: t1, pos: [0.6, 0.2, 11], look: [0.3, 0, 0], fov: 40, e: ease.inOutQuad }],
      lyric: { sx: -0.82, sy: -0.15, maxWidth: 4.6, follow: 0.9 },
      handheld: 0.02,
    };
  }

  // ---------------------------------------------------------------- 13: "Tibo, please — one more reset." — a clean 3D button
  reset(): Shot {
    return {
      at: [800, 0, 0],
      build: (g) => {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.6, 0.4, 96), new THREE.MeshStandardMaterial({ color: C('ink2', 2), metalness: 0.9, roughness: 0.25 }));
        const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.15, 0.35, 96), new THREE.MeshStandardMaterial({ color: C('gold'), metalness: 1, roughness: 0.2, emissive: C('gold', 0.2) }));
        cap.position.y = 0.35;
        const rim = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.02, 8, 128), M.glow('gold', 4)); rim.rotation.x = Math.PI / 2; rim.position.y = 0.21;
        const ring = new THREE.Mesh(new THREE.RingGeometry(1.75, 1.8, 128, 1, -Math.PI / 2, 0.001), M.glow('gold', 4)); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02;
        const lab = card(g, 600, 200, 1.4, [0, 0.531, 0], [-Math.PI / 2, 0, 0], { additive: false });
        lab.draw((c, w, h) => text(c, 'RESET', w / 2, h / 2 + 30, 110, GOLD, 1, F.mono(800), 'center', 14));
        // ripples on the floor when it is pressed (drawn, flat)
        const rip = card(g, 2400, 2400, 9, [0, 0.01, 0], [-Math.PI / 2, 0, 0], { additive: true });
        g.add(base, cap, rim, ring);
        flatten(base); flatten(cap);
        return ({ t, line: l }) => {
          const press = l.words[l.words.length - 1].start;
          const pk = Math.sin(clamp((t - press) / 0.3) * Math.PI);
          cap.position.y = 0.35 - 0.12 * pk; lab.mesh.position.y = 0.531 - 0.12 * pk;
          rip.draw((c, w, h) => {
            for (let k = 0; k < 6; k++) { const u = (t - press) * 0.9 - k * 0.14; if (u <= 0 || u > 1) continue; circle(c, w / 2, h / 2, 420 + u * 760, GOLD, 4 * (1 - u), 1 - u); }
            for (let k = 0; k < 3; k++) { const ph = (t * 0.5 + k / 3) % 1; circle(c, w / 2, h / 2, 430 + ph * 120, GOLD, 2, 0.25 * (1 - ph)); }
          });
          const fillP = prog(t, press + 0.15, press + 1.4, ease.outCubic);
          ring.geometry.dispose(); ring.geometry = new THREE.RingGeometry(1.75, 1.8, 128, 1, -Math.PI / 2, Math.max(0.001, fillP * Math.PI * 2));
          return { flash: pulse(t, press, 0.25) * 0.4, vignette: 0.6, bloom: 0.55 };
        };
      },
      cam: (t0, t1, l) => [{ t: t0, pos: [0, 3.2, 4.6], look: [0, 0.3, 0], fov: 40 }, { t: l.words[l.words.length - 1].start, pos: [0, 4.0, 2.6], look: [0, 0.3, 0], fov: 38, e: ease.inOutQuad }, { t: t1, pos: [0, 5.2, 2.2], look: [0, 0.2, 0], fov: 40, e: ease.outCubic }],
      lyric: { sx: -0.55, sy: -0.7, font: F.serif(true), size: 0.75, D: 4 },
    };
  }
}
void human; void chip; void dot; void arrow; void mulberry32; void ragged; void CORE;
