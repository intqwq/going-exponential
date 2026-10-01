// VERSE 2 — "The Race" (2022 → 2026). Clean vector plates on layered planes, real architectures and plots.
import * as THREE from 'three';
import { ShotPlate, card, type Shot } from './shots';
import type { Line } from '../engine/data';
import { F } from '../engine/type';
import { trace, beam, line, rect, rrect, circle, dot, text, grid, arrow, partial, ragged, chip, windowFrame, measure, rgbaHex, GOLD, CORE, BONE, ASH, GRAPH, INK, RED, type C2, type P } from './vec';
import { clamp, ease, prog, lerp, hash, pulse, mulberry32 } from '../engine/util';

const FS = 36;

/** A node box with a title (for architecture diagrams). */
function node(c: C2, x: number, y: number, w: number, h: number, title: string, sub = '', on = false, dim = false) {
  rrect(c, x, y, w, h, 16, on ? GOLD : BONE, on ? 4 : 2.5, dim ? 0.35 : on ? 1 : 0.8, on ? rgbaHex(GOLD, 0.1) : 'rgba(12,13,17,0.9)');
  text(c, title, x + w / 2, y + h / 2 + (sub ? -4 : 12), 32, on ? GOLD : BONE, dim ? 0.4 : 1, F.mono(600), 'center');
  if (sub) text(c, sub, x + w / 2, y + h / 2 + 36, 22, ASH, dim ? 0.4 : 1, F.mono(400), 'center');
}

export default class Race2 extends ShotPlate {
  section(): Line[] { return this.ctx.lyrics.section('Verse 2'); }
  shots(): Shot[] {
    return [this.chinchilla(), this.gopher(), this.rlhf(), this.hello(), this.vision(), this.patches(), this.cot(), this.ttc(), this.grpo(), this.distill(), this.board(), this.invoice(), this.versions(), this.cv()];
  }

  // ---------------------------------------------------------------- 0: Chinchilla — iso-FLOP profiles, compute-optimal frontier
  chinchilla(): Shot {
    return {
      at: [0, 0, 0],
      build: (g) => {
        const plot = card(g, 2400, 1500, 12, [0, 0, 0]);
        const spec = card(g, 1200, 900, 4.6, [7.2, 0.6, 2.2], [0, -0.4, 0]);
        const C = [6e18, 1e19, 3e19, 6e19, 1e20, 3e20, 6e20, 1e21, 3e21];
        const X0 = 200, X1 = 2300, Y0 = 1350, Y1 = 150;
        const lx = (n: number) => X0 + ((Math.log10(n) - 8) / 3) * (X1 - X0); // 1e8 .. 1e11 params
        const ly = (L: number) => Y0 - ((3.6 - L) / 1.6) * (Y0 - Y1); // loss 3.6 .. 2.0
        const nopt = (c: number) => Math.sqrt(c / 120); // N_opt with D ≈ 20 N, C = 6 N D
        const lmin = (c: number) => 3.35 - 0.3 * Math.log10(c / 6e18);
        return ({ t, line: l }) => {
          const p = prog(t, this.cuts[0], l.words[2].start, ease.outCubic);
          const fr = prog(t, l.words[2].start, l.words[4].start + 0.3, ease.inOutCubic);
          plot.draw((c, w, h) => {
            grid(c, w, h, 60, 0.04);
            line(c, X0, Y0, X1, Y0, BONE, 2, 0.8); line(c, X0, Y1, X0, Y0, BONE, 2, 0.8);
            [1e8, 1e9, 1e10, 1e11].forEach((n, k) => text(c, ['100M', '1B', '10B', '100B'][k], lx(n), Y0 + 50, 28, ASH, 1, F.mono(500), 'center'));
            [2.0, 2.4, 2.8, 3.2, 3.6].forEach((L) => text(c, L.toFixed(1), X0 - 20, ly(L) + 10, 26, ASH, 1, F.mono(400), 'right'));
            text(c, 'PARAMETERS', X1, Y0 + 100, 26, ASH, 1, F.mono(600), 'right', 4);
            text(c, 'TRAINING LOSS', X0, Y1 - 50, 26, ASH, 1, F.mono(600), 'left', 4);
            text(c, 'ISO-FLOP PROFILES', X1, Y1 - 50, 30, BONE, 1, F.mono(600), 'right', 4);
            const minima: P[] = [];
            C.forEach((cc, k) => {
              const no = nopt(cc), lm = lmin(cc);
              const pts: P[] = [];
              for (let s = -1.1; s <= 1.1; s += 0.02) { const n = no * Math.pow(10, s); if (n < 1e8 || n > 1e11) continue; pts.push([lx(n), ly(Math.min(3.6, lm + 0.28 * s * s + 0.004 * Math.sin(s * 30 + k)))]); }
              const kp = clamp(p * C.length - k);
              beam(c, pts, kp, 2.5, BONE, 0);
              if (kp >= 1) { minima.push([lx(no), ly(lm)]); dot(c, lx(no), ly(lm), 7, GOLD, 1); }
              if (kp > 0) text(c, cc.toExponential(0).replace('e+', 'e'), pts[0][0] - 8, pts[0][1] + 6, 20, ASH, kp, F.mono(400), 'right');
            });
            if (fr > 0 && minima.length > 1) {
              beam(c, minima, fr, 4, GOLD, 1.2);
              text(c, 'N_opt ∝ C^0.50 · D_opt ∝ C^0.50 · D ≈ 20 N', X0 + 60, Y1 + 60, 34, GOLD, fr, F.mono(600));
            }
          });
          spec.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 20, GOLD, 3, 1, 'rgba(10,11,14,0.94)');
            text(c, 'CHINCHILLA', 50, 100, 54, GOLD, 1, F.display(700));
            const rows: [string, string][] = [['params', '70B'], ['tokens', '1.4T'], ['layers', '80'], ['d_model', '8,192'], ['heads', '64'], ['compute', '≈ Gopher']];
            rows.forEach(([a, b], k) => { text(c, a.toUpperCase(), 50, 200 + k * 100, 26, ASH, prog(t, l.words[1].start + k * 0.1, l.words[1].start + 0.3 + k * 0.1), F.mono(600), 'left', 3); text(c, b, w - 50, 200 + k * 100, 44, BONE, prog(t, l.words[1].start + k * 0.1, l.words[1].start + 0.3 + k * 0.1), F.mono(500), 'right'); });
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-3, -1.2, 14], look: [0, 0, 0], fov: 44 }, { t: t1, pos: [2.4, 0.2, 13], look: [1.8, 0.2, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.68 },
    };
  }

  // ---------------------------------------------------------------- 1: Gopher's bigger — second best (MMLU)
  gopher(): Shot {
    return {
      at: [60, 0, 0],
      build: (g) => {
        const L = card(g, 1300, 1500, 5.2, [-3, 0.2, 0], [0, 0.25, 0]);
        const R = card(g, 1300, 1500, 5.2, [3, 0.2, -1], [0, -0.25, 0]);
        const bars = card(g, 1600, 800, 5.6, [0, -1.4, 2.4]);
        const spec = (c: C2, w: number, h: number, name: string, rows: [string, string][], col: string, widthK: number, on: boolean) => {
          rrect(c, 4, 4, w - 8, h - 8, 20, col, 3, 1, 'rgba(10,11,14,0.94)');
          text(c, name, 50, 100, 60, col, 1, F.display(700));
          rows.forEach(([a, b], k) => { text(c, a, 50, 200 + k * 80, 26, ASH, 1, F.mono(600), 'left', 3); text(c, b, w - 50, 200 + k * 80, 40, BONE, 1, F.mono(500), 'right'); });
          // block width ∝ d_model
          const bw = (w - 160) * widthK;
          for (let k = 0; k < 10; k++) rect(c, (w - bw) / 2, 760 + k * 64, bw, 48, col, 2, 0.4 + (on ? 0.4 : 0));
          text(c, `× 80 layers`, w / 2, h - 30, 26, ASH, 1, F.mono(500), 'center');
        };
        return ({ t, line: l }) => {
          const bigT = l.words[1].start, secT = l.words[2]?.start ?? l.end - 0.6;
          L.draw((c, w, h) => spec(c, w, h, 'GOPHER', [['PARAMS', '280B'], ['TOKENS', '300B'], ['d_model', '16,384'], ['HEADS', '128']], BONE, lerp(0.5, 1, prog(t, bigT - 0.2, bigT + 0.4, ease.outBack)), false));
          R.draw((c, w, h) => spec(c, w, h, 'CHINCHILLA', [['PARAMS', '70B'], ['TOKENS', '1.4T'], ['d_model', '8,192'], ['HEADS', '64']], GOLD, 0.5, true));
          bars.draw((c, w, h) => {
            text(c, 'MMLU (5-SHOT)', 40, 70, 34, ASH, 1, F.mono(600), 'left', 4);
            const p = prog(t, secT - 0.5, secT + 0.3, ease.outCubic);
            [['Chinchilla 70B', 67.6, GOLD], ['Gopher 280B', 60.0, BONE]].forEach(([n, v, col], k) => {
              const y = 190 + k * 200;
              text(c, String(n), 40, y + 45, 40, String(col), 1, F.mono(500));
              rect(c, 560, y, (w - 760) * ((v as number) / 100) * p, 70, String(col), 0, 1, rgbaHex(String(col), k ? 0.5 : 0.85));
              text(c, `${((v as number) * p).toFixed(1)}%`, 580 + (w - 760) * ((v as number) / 100) * p, y + 52, 40, String(col), 1, F.mono(600));
            });
            if (p >= 1) { c.save(); c.translate(w - 260, 600); c.rotate(-0.12); rrect(c, -200, -60, 400, 110, 12, BONE, 4, 0.9); text(c, '2nd', 0, 26, 80, BONE, 1, F.display(800), 'center'); c.restore(); }
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, 0.5, 13], look: [0, 0, 0], fov: 42 }, { t: t1, pos: [-1.5, -0.3, 10.5], look: [0, -0.4, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.72, size: 0.55 },
    };
  }

  // ---------------------------------------------------------------- 2: RLHF (InstructGPT 3 steps) + PPO clipped objective
  rlhf(): Shot {
    return {
      at: [120, 0, 0],
      build: (g) => {
        const steps = [0, 1, 2].map((k) => card(g, 1100, 1400, 4.2, [-4.6 + k * 4.6, 0.6, -k * 1.2], [0, 0, 0]));
        const ppo = card(g, 2200, 1000, 8.5, [0, -0.2, 3.2]);
        return ({ t, line: l }) => {
          const ppoT = l.words[1].start;
          const s = [['STEP 1', 'Supervised fine-tuning', ['prompt', 'human demo', 'SFT model']], ['STEP 2', 'Reward model', ['A  >  C  >  B', 'human ranks outputs', 'RM r(x, y)']], ['STEP 3', 'PPO against the RM', ['policy π_θ', 'reward r(x, y)', '− β · KL(π_θ ‖ π_SFT)']]] as const;
          steps.forEach((cd, k) => {
            const on = prog(t, this.cuts[2] + k * 0.25, this.cuts[2] + 0.3 + k * 0.25);
            cd.draw((c, w, h) => {
              rrect(c, 4, 4, w - 8, h - 8, 22, k === 2 ? GOLD : BONE, 3, 0.8, 'rgba(10,11,14,0.94)');
              text(c, s[k][0], 50, 90, 34, k === 2 ? GOLD : ASH, on, F.mono(600), 'left', 5);
              text(c, s[k][1], 50, 160, 44, BONE, on, F.display(600));
              s[k][2].forEach((r, q) => { node(c, 90, 280 + q * 330, w - 180, 180, r, '', k === 2 && q === 0, on < 1); if (q < 2) arrow(c, w / 2, 470 + q * 330, w / 2, 600 + q * 330, BONE, 3, 18, on); });
            });
            cd.mesh.position.y = 0.6 + (1 - on) * -1;
            cd.opacity = on;
          });
          const pp = prog(t, ppoT - 0.2, ppoT + 0.8, ease.outCubic);
          ppo.mesh.visible = pp > 0;
          ppo.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 20, GOLD, 3, 1, 'rgba(8,9,12,0.96)');
            text(c, 'L^CLIP(θ) = E[ min( r_t(θ) Â_t , clip(r_t(θ), 1−ε, 1+ε) Â_t ) ]', 60, 100, 40, GOLD, 1, F.mono(500));
            const panel = (x0: number, pos: boolean) => {
              const W = 900, H = 640, y0 = 250;
              line(c, x0, y0 + H / 2, x0 + W, y0 + H / 2, BONE, 2, 0.5); line(c, x0 + W / 2, y0, x0 + W / 2, y0 + H, BONE, 2, 0.5);
              const X = (r: number) => x0 + (r / 2) * W, Y = (v: number) => y0 + H / 2 - v * (H * 0.4);
              const pts: P[] = [];
              for (let r = 0; r <= 2; r += 0.01) { const v = pos ? Math.min(r, 1.2) : Math.max(-r, -0.8) * 1; pts.push([X(r), Y(pos ? v : v)]); }
              beam(c, pts, pp, 5, GOLD, 1);
              line(c, X(1), y0, X(1), y0 + H, BONE, 1, 0.3);
              text(c, '1', X(1), y0 + H + 40, 26, ASH, 1, F.mono(500), 'center');
              text(c, pos ? '1+ε' : '1−ε', X(pos ? 1.2 : 0.8), y0 + H + 40, 26, GOLD, 1, F.mono(500), 'center');
              text(c, pos ? 'Â > 0' : 'Â < 0', x0 + 20, y0 + 40, 34, BONE, 1, F.mono(600));
              text(c, 'r = π_θ / π_old', x0 + W, y0 + H + 40, 24, ASH, 1, F.mono(400), 'right');
            };
            panel(120, true); panel(1180, false);
          });
          return {};
        };
      },
      cam: (t0, t1, l) => [{ t: t0, pos: [-2, 1.8, 13], look: [0, 0.6, -1], fov: 44 }, { t: l.words[1].start, pos: [0, 0.8, 11], look: [0, 0.2, 0], fov: 42, e: ease.inOutQuad }, { t: t1, pos: [0, -0.2, 9.4], look: [0, -0.2, 3], fov: 40, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.68 },
    };
  }

  // ---------------------------------------------------------------- 3: 2022 — ChatGPT says "Hello."
  hello(): Shot {
    return {
      at: [180, 0, 0],
      build: (g) => {
        const win = card(g, 2400, 1400, 11, [0, 0, 0]);
        const date = card(g, 1200, 300, 5, [-5, 3.4, -3]);
        date.draw((c) => { text(c, '30 NOV 2022', 20, 200, 160, BONE, 0.25, F.serif(true)); });
        return ({ t, line: l }) => {
          const helloW = l.words[l.words.length - 1];
          win.draw((c, w, h) => {
            rrect(c, 0, 0, w, h, 24, BONE, 2, 0.4, '#16171c');
            c.fillStyle = '#0d0e11'; c.fillRect(0, 0, 440, h);
            rrect(c, 30, 40, 380, 80, 12, BONE, 2, 0.4);
            text(c, '+  New chat', 60, 92, 30, BONE, 0.9, F.mono(500));
            ['Free Research Preview', 'Nov 30 · v1'].forEach((s, k) => text(c, s, 40, h - 120 + k * 40, 22, ASH, 0.8, F.mono(400)));
            text(c, 'ChatGPT', 440 + (w - 440) / 2, 120, 72, BONE, 0.5, F.display(700), 'center');
            // the exchange
            const userT = l.words[2]?.start ?? l.start + 0.6;
            const uk = prog(t, userT - 0.3, userT);
            if (uk > 0) { c.fillStyle = '#26282f'; c.fillRect(440, 240, w - 440, 150); text(c, 'You', 520, 300, 26, ASH, uk, F.mono(600)); text(c, 'hi', 520, 350, 40, BONE, uk, F.mono(400)); }
            const n = Math.floor(clamp((t - helloW.start) / Math.max(0.3, helloW.end - helloW.start)) * 6 + 0.999);
            if (t > helloW.start - 0.05) {
              text(c, 'ChatGPT', 520, 470, 26, GOLD, 1, F.mono(600));
              text(c, 'Hello.'.slice(0, n), 520, 600, 120, BONE, 1, F.serif(true));
              if (n < 6 || Math.floor(t * 2.2) % 2 === 0) rect(c, 520 + measure(c, 'Hello.'.slice(0, n), 120, F.serif(true)) + 12, 510, 28, 110, GOLD, 0, 1, GOLD);
            }
            rrect(c, 520, h - 170, w - 640, 100, 16, BONE, 2, 0.5);
            text(c, 'Send a message…', 560, h - 106, 30, ASH, 0.9, F.mono(400));
          });
          return { flash: pulse(t, helloW.start, 0.2) * 0.3 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-3, 0.6, 14], look: [0, 0.2, 0], fov: 40 }, { t: t1, pos: [0.8, 0.5, 9.2], look: [1.2, 0.4, 0], fov: 38, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7, size: 0.5 },
    };
  }

  // ---------------------------------------------------------------- 4: GPT-4 reads the scene (procedural photo → pixel wave → 16×16 patches)
  photo: OffscreenCanvas | null = null;
  makePhoto() {
    if (this.photo) return this.photo;
    const W = 1536, H = 1024;
    const cv = new OffscreenCanvas(W, H);
    const c = cv.getContext('2d')!;
    const r = mulberry32(4);
    // dusk sky
    const sky = c.createLinearGradient(0, 0, 0, H * 0.62);
    sky.addColorStop(0, '#0d1426'); sky.addColorStop(0.55, '#4b3a4e'); sky.addColorStop(0.85, '#d9824a'); sky.addColorStop(1, '#f1b465');
    c.fillStyle = sky; c.fillRect(0, 0, W, H * 0.62);
    // sun
    const sg = c.createRadialGradient(1100, 560, 10, 1100, 560, 260); sg.addColorStop(0, 'rgba(255,240,200,1)'); sg.addColorStop(0.2, 'rgba(255,200,120,0.8)'); sg.addColorStop(1, 'rgba(255,160,80,0)');
    c.fillStyle = sg; c.fillRect(800, 300, 600, 500);
    // clouds
    for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(${200 + r() * 55},${130 + r() * 60},${110 + r() * 40},${0.15 + r() * 0.2})`; c.beginPath(); c.ellipse(r() * W, 120 + r() * 360, 80 + r() * 200, 10 + r() * 22, 0, 0, Math.PI * 2); c.fill(); }
    // skyline (three depth layers)
    [[0.55, '#2a2633', 40, 260], [0.6, '#1b1a22', 26, 340], [0.64, '#0f0f14', 18, 420]].forEach(([yb, col, n, maxH]) => {
      let x = -20;
      while (x < W) {
        const bw = 30 + r() * (n as number) * 3, bh = 60 + r() * (maxH as number);
        const yb2 = H * (yb as number);
        c.fillStyle = col as string; c.fillRect(x, yb2 - bh, bw, bh + 4);
        for (let wy = yb2 - bh + 12; wy < yb2 - 8; wy += 14) for (let wx = x + 6; wx < x + bw - 6; wx += 10) if (r() < 0.32) { c.fillStyle = r() < 0.7 ? 'rgba(255,200,120,0.85)' : 'rgba(180,200,255,0.6)'; c.fillRect(wx, wy, 4, 6); }
        if (r() < 0.2) { c.fillStyle = col as string; c.fillRect(x + bw / 2 - 2, yb2 - bh - 40, 4, 40); }
        x += bw + r() * 6;
      }
    });
    // river with reflections
    const rv = c.createLinearGradient(0, H * 0.64, 0, H);
    rv.addColorStop(0, '#3a2c33'); rv.addColorStop(1, '#0a0b10');
    c.fillStyle = rv; c.fillRect(0, H * 0.64, W, H * 0.36);
    for (let k = 0; k < 900; k++) { const x = r() * W, y = H * 0.65 + r() * H * 0.33; c.fillStyle = `rgba(255,${170 + r() * 60},${90 + r() * 60},${0.08 + r() * 0.35 * (1 - (y - H * 0.64) / (H * 0.36))})`; c.fillRect(x, y, 6 + r() * 30, 2); }
    // bridge
    c.strokeStyle = '#08080b'; c.lineWidth = 10; c.beginPath(); c.moveTo(0, H * 0.7); c.quadraticCurveTo(W * 0.5, H * 0.6, W, H * 0.7); c.stroke();
    for (let k = 0; k < 30; k++) { const x = (k / 29) * W; c.lineWidth = 3; c.beginPath(); c.moveTo(x, H * 0.7 - Math.sin((k / 29) * Math.PI) * H * 0.07); c.lineTo(x, H * 0.75); c.stroke(); }
    // people on the embankment
    for (let k = 0; k < 18; k++) { const x = 60 + r() * (W - 120), y = H * 0.96; c.fillStyle = '#050507'; c.beginPath(); c.arc(x, y - 52, 8, 0, Math.PI * 2); c.fill(); c.fillRect(x - 7, y - 44, 14, 44); }
    // gold duotone: keep the photo's tonal detail, lose its off-palette hues
    const id = c.getImageData(0, 0, W, H), d = id.data;
    for (let i = 0; i < d.length; i += 4) {
      const l = Math.pow((0.3 * d[i] + 0.59 * d[i + 1] + 0.11 * d[i + 2]) / 255, 0.9);
      const a = Math.min(1, l * 1.6), b2 = Math.max(0, l * 1.6 - 1) / 0.6;
      d[i] = Math.min(255, 7 + a * 248 + b2 * 0); d[i + 1] = Math.min(255, 8 + a * 170 + b2 * 61); d[i + 2] = Math.min(255, 11 + a * 19 + b2 * 146);
    }
    c.putImageData(id, 0, 0);
    this.photo = cv;
    return cv;
  }
  vision(): Shot {
    return {
      at: [240, 0, 0],
      build: (g) => {
        const img = card(g, 1536, 1024, 9, [0, 0.4, 0]);
        const over = card(g, 1536, 1024, 9, [0, 0.4, 0.02], [0, 0, 0], { additive: true });
        const cap = card(g, 1800, 300, 7, [0.5, -3.4, 1.4]);
        const photo = this.makePhoto();
        const small = new OffscreenCanvas(96, 64);
        small.getContext('2d')!.drawImage(photo, 0, 0, 96, 64);
        return ({ t, lt, line: l }) => {
          const wave = prog(lt, 0.3, 1.9, ease.inOutCubic);
          img.draw((c, w, h) => {
            c.drawImage(photo, 0, 0, w, h);
            // pixel wave: a radial front from the left converts the photo into 16×16 patches (nearest-neighbour)
            c.save();
            c.imageSmoothingEnabled = false;
            const fx = wave * (w + 600) - 300;
            c.beginPath();
            for (let y = 0; y <= h; y += 16) c.lineTo(fx + Math.sin(y * 0.02 + lt * 6) * 80, y);
            c.lineTo(-10, h); c.lineTo(-10, 0); c.closePath(); c.clip();
            c.drawImage(small, 0, 0, w, h);
            c.restore();
          });
          over.draw((c, w, h) => {
            const fx = wave * (w + 600) - 300;
            for (let y = 0; y <= h; y += 16) dot(c, fx + Math.sin(y * 0.02 + lt * 6) * 80, y, 3, GOLD, 0.8);
            for (let x = 0; x < Math.min(w, fx); x += 16) line(c, x, 0, x, h, GOLD, 1, 0.18);
            for (let y = 0; y < h; y += 16) line(c, 0, y, Math.min(w, fx), y, GOLD, 1, 0.18);
            // detections after the wave
            const det: [number, number, number, number, string][] = [[1000, 380, 220, 200, 'sun 0.98'], [0, 590, 1536, 140, 'bridge 0.94'], [40, 900, 1460, 110, 'people ×18'], [100, 300, 700, 340, 'skyline 0.97']];
            det.forEach(([x, y, dw, dh, s], k) => { if (fx < x + dw * 0.5) return; rect(c, x + 6, y + 6, dw - 12, dh - 12, GOLD, 3, 0.9); text(c, s, x + 14, y + 40, 28, CORE, 1, F.mono(600)); void k; });
          });
          cap.draw((c, w) => {
            const s = '“A city at dusk: a river, a bridge, the sun low behind the skyline, people on the embankment.”';
            const n = Math.floor(prog(lt, 1.5, 2.3) * s.length);
            text(c, s.slice(0, n), w / 2, 180, 40, BONE, 1, F.serif(true), 'center');
          });
          void l;
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-3.5, 0.8, 9], look: [0, 0.4, 0], fov: 44, roll: 0.03 }, { t: t1, pos: [2, 0.2, 8.5], look: [0.6, 0.2, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7, size: 0.55 },
    };
  }

  // ---------------------------------------------------------------- 5: the picture joins the token stream (tilted 3D stream, DOF)
  patches(): Shot {
    return {
      at: [300, 0, 0],
      build: (g) => {
        const photo = this.makePhoto();
        const stream = new THREE.Group(); stream.rotation.set(-1.15, 0, 0.12); stream.position.set(0, -1.2, 0); g.add(stream);
        const toks = ['<|im_start|>', 'user', 'Describe', 'this', ':', ...Array(12).fill('<img>'), 'The', ' city', ' at', ' dusk', ',', ' a', ' river', '…'];
        const chips = toks.map((s, k) => {
          const cd = new THREE.Group();
          const c2 = card(cd, 520, 160, 2.2, [0, 0, 0]);
          c2.draw((c, w, h) => { rrect(c, 4, 4, w - 8, h - 8, 26, s === '<img>' ? GOLD : BONE, 3, s === '<img>' ? 1 : 0.7, s === '<img>' ? rgbaHex(GOLD, 0.14) : 'rgba(10,11,14,0.9)'); text(c, s, w / 2, h / 2 + 16, 46, s === '<img>' ? CORE : BONE, 1, F.mono(500), 'center'); });
          cd.position.set(0, -k * 1.2 + 12, 0); stream.add(cd);
          return cd;
        });
        // flying patches: each a small card with a crop of the photo
        const patches: THREE.Mesh[] = [];
        for (let k = 0; k < 12; k++) {
          const cd = card(g, 256, 256, 1.0, [0, 0, 0]);
          const px = (k % 4) * 384, py = Math.floor(k / 4) * 340;
          cd.draw((c, w, h) => { c.drawImage(photo, px, py, 384, 340, 0, 0, w, h); rect(c, 2, 2, w - 4, h - 4, GOLD, 4, 1); });
          patches.push(cd.mesh);
        }
        return ({ t, lt }) => {
          const scroll = lt * 3.2;
          chips.forEach((cd, k) => { cd.position.y = -k * 1.2 + 12 - scroll; cd.visible = cd.position.y > -16 && cd.position.y < 16; });
          patches.forEach((m, k) => {
            const p = ease.inOutCubic(clamp(lt * 0.9 - k * 0.07));
            const tgt = new THREE.Vector3(0, -(5 + k) * 1.2 + 12 - scroll, 0.1).applyMatrix4(stream.matrix);
            m.position.set(lerp(-6 + (k % 4) * 1.1, tgt.x, p), lerp(3 - Math.floor(k / 4) * 1.0, tgt.y, p), lerp(2, tgt.z, p));
            m.rotation.set(lerp(0, -1.15, p), 0, lerp(0, 0.12, p));
            m.scale.setScalar(lerp(1.4, 0.6, p));
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-4, 1.2, 7], look: [0, -1, -2], fov: 46, roll: -0.08 }, { t: t1, pos: [2.5, 0.2, 5.5], look: [0, -1.5, -4], fov: 44, roll: 0.05, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: 0.7 },
      dof: { aperture: 70, maxR: 18 },
    };
  }

  // ---------------------------------------------------------------- 6: chain of thought — the reasoning interface
  cot(): Shot {
    return {
      at: [360, 0, 0],
      build: (g) => {
        const win = card(g, 2200, 1500, 10, [0, 0, 0]);
        const sweat = card(g, 800, 800, 3, [4.2, 2.2, 1.6], [0, 0, 0], { additive: true });
        const steps: [string, string][] = [
          ['Restating the problem', 'We need the number of subsets whose sum is divisible by 3.'],
          ['Trying small cases', 'n = 1, 2, 3 give 1, 2, 4 … looks like 2ⁿ⁻¹? Check n = 4.'],
          ['Hmm, a contradiction', 'n = 4 gives 6, not 8. The pattern is wrong.'],
          ['Using roots of unity', 'Count with ω = e^{2πi/3}: (1/3) Σ ∏ (1 + ω^{k·a}).'],
          ['Verifying', 'n = 4 → 6 ✓, n = 5 → 11 ✓.'],
          ['Double-checking the edge case', 'The empty set counts. Final answer follows.'],
        ];
        return ({ t, lt, line: l }) => {
          const secs = Math.floor(lt * 6);
          win.draw((c, w, h) => {
            rrect(c, 0, 0, w, h, 26, BONE, 2, 0.35, '#121318');
            text(c, 'o1', 60, 90, 40, BONE, 0.8, F.mono(600));
            rrect(c, 60, 140, w - 120, 110, 16, GOLD, 2, 0.8, rgbaHex(GOLD, 0.06));
            text(c, `Thinking… ${secs}s`, 100, 210, 46, GOLD, 1, F.mono(600));
            text(c, '▾', w - 120, 210, 46, GOLD, 1, F.mono(600));
            const n = Math.min(steps.length, Math.floor(lt * 2.6) + 1);
            const top = Math.max(0, n - 4);
            for (let k = top; k < n; k++) {
              const y = 360 + (k - top) * 260;
              const kk = clamp(lt * 2.6 - k);
              text(c, steps[k][0], 100, y, 44, BONE, kk, F.display(700));
              const body = steps[k][1];
              text(c, body.slice(0, Math.floor(kk * body.length)), 100, y + 70, 36, ASH, 1, F.serif(true));
              line(c, 70, y - 50, 70, y + 100, k === n - 1 ? GOLD : GRAPH, 4, 1);
            }
          });
          const swT = l.words[4]?.start ?? l.end - 0.5;
          sweat.draw((c) => { for (let d = 0; d < 7; d++) { const p = clamp((t - swT - d * 0.15) / 0.9); if (p <= 0 || p >= 1) continue; const x = 200 + d * 70, y = 100 + p * p * 600; c.fillStyle = rgbaHex(BONE, 0.9 * (1 - p)); c.beginPath(); c.moveTo(x, y - 30); c.quadraticCurveTo(x + 20, y, x, y + 14); c.quadraticCurveTo(x - 20, y, x, y - 30); c.fill(); } });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2, -0.5, 11], look: [0, 0, 0], fov: 42 }, { t: t1, pos: [1.2, 0.4, 9.2], look: [0.4, 0.4, 0], fov: 40, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7, size: 0.55 },
    };
  }

  // ---------------------------------------------------------------- 7: more test-time compute (train-time vs test-time, log x)
  ttc(): Shot {
    return {
      at: [420, 0, 0],
      build: (g) => {
        const L = card(g, 1300, 1100, 6, [-3.4, 0.3, -0.6], [0, 0.18, 0]);
        const R = card(g, 1300, 1100, 6, [3.4, 0.3, 0], [0, -0.18, 0]);
        const plot = (c: C2, w: number, h: number, title: string, seed: number, p: number, hot: boolean) => {
          rrect(c, 4, 4, w - 8, h - 8, 20, hot ? GOLD : BONE, 3, hot ? 1 : 0.5, 'rgba(10,11,14,0.94)');
          text(c, title, 50, 80, 34, hot ? GOLD : BONE, 1, F.mono(600), 'left', 3);
          line(c, 120, h - 140, w - 60, h - 140, BONE, 2, 0.7); line(c, 120, 150, 120, h - 140, BONE, 2, 0.7);
          text(c, 'compute (log scale)', w - 60, h - 80, 26, ASH, 1, F.mono(500), 'right');
          text(c, 'pass@1 accuracy', 120, 130, 26, ASH, 1, F.mono(500));
          const ser = ragged(14, seed, (u) => 0.15 + 0.7 * u, 0.05, 0);
          const pts: P[] = ser.map((v, k) => [140 + (k / 13) * (w - 220), h - 140 - v * (h - 330)]);
          const sh = partial(pts, p);
          trace(c, sh, 3, hot ? GOLD : BONE, hot ? 1 : 0);
          sh.forEach(([x, y]) => dot(c, x, y, 7, hot ? GOLD : BONE, hot ? 1 : 0));
        };
        return ({ t, lt, line: l }) => {
          const betT = l.words[l.words.length - 1].start;
          L.draw((c, w, h) => plot(c, w, h, 'TRAIN-TIME COMPUTE', 3, prog(lt, 0, 1.2), false));
          R.draw((c, w, h) => {
            plot(c, w, h, 'TEST-TIME COMPUTE', 7, prog(lt, 0.4, 1.8), true);
            const k = prog(t, betT - 0.3, betT + 0.3, ease.outBack);
            if (k > 0) { c.save(); c.translate(w - 250, 360); c.rotate(-0.1); c.scale(k, k); rrect(c, -170, -60, 340, 110, 55, GOLD, 4, 1, rgbaHex(GOLD, 0.15)); text(c, 'BET ↑', 0, 26, 64, CORE, 1, F.display(800), 'center'); c.restore(); }
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2.5, 0.6, 12], look: [-1, 0.3, 0], fov: 42 }, { t: t1, pos: [3, 0.4, 9.5], look: [2.2, 0.3, 0], fov: 40, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 8: GRPO vs PPO (DeepSeekMath) + the R1 pipeline
  grpo(): Shot {
    return {
      at: [480, 0, 0],
      build: (g) => {
        const ppo = card(g, 2400, 900, 10, [0, 2.4, -2.4]);
        const grpo = card(g, 2400, 1100, 10, [0, -1.8, 0]);
        const pipe = card(g, 1600, 1500, 5, [7.8, 0.2, -1], [0, -0.45, 0]);
        return ({ t, line: l }) => {
          const gT = l.words[1].start;
          const gp = prog(t, gT - 0.2, gT + 0.8, ease.outCubic);
          ppo.draw((c) => {
            text(c, 'PPO', 40, 90, 50, BONE, 1 - gp * 0.5, F.mono(700));
            const a = 1 - gp * 0.6;
            node(c, 40, 260, 260, 140, 'q', '', false, a < 0.6);
            node(c, 380, 260, 380, 140, 'Policy', 'π_θ', false, a < 0.6);
            node(c, 860, 120, 380, 140, 'Reference', 'KL', false, a < 0.6);
            node(c, 860, 400, 380, 140, 'Reward', 'r', false, a < 0.6);
            node(c, 860, 680, 380, 140, 'Value', 'v  (critic)', false, true);
            node(c, 1360, 400, 300, 140, 'GAE', 'Â', false, a < 0.6);
            [[300, 330, 380, 330], [760, 330, 860, 190], [760, 330, 860, 470], [760, 330, 860, 750], [1240, 470, 1360, 470], [1240, 750, 1360, 470]].forEach(([x0, y0, x1, y1]) => arrow(c, x0, y0, x1, y1, BONE, 2.5, 16, a));
            if (gp > 0.4) { line(c, 860, 680, 1240, 820, RED, 6, gp); line(c, 860, 820, 1240, 680, RED, 6, gp); text(c, 'no value model', 1280, 780, 34, RED, gp, F.mono(600)); }
          });
          grpo.draw((c, w, h) => {
            text(c, 'GRPO', 40, 90, 50, GOLD, gp, F.mono(700));
            node(c, 40, 440, 220, 140, 'q', '', gp > 0);
            node(c, 340, 440, 340, 140, 'Policy', 'π_θ', gp > 0);
            const G = 8;
            const rew = [0.2, 0.9, 0.35, 0.95, 0.1, 0.6, 0.85, 0.3];
            const mean = rew.reduce((a2, b2) => a2 + b2) / G, sd = Math.sqrt(rew.reduce((a2, b2) => a2 + (b2 - mean) ** 2, 0) / G);
            for (let k = 0; k < G; k++) {
              const y = 140 + k * 110, kk = clamp(gp * 10 - k * 0.4);
              arrow(c, 680, 510, 760, y + 40, BONE, 2, 12, kk);
              rrect(c, 760, y, 200, 80, 12, BONE, 2, kk, 'rgba(12,13,17,0.9)'); text(c, `o${k + 1}`, 860, y + 52, 30, BONE, kk, F.mono(500), 'center');
              text(c, `r=${rew[k].toFixed(2)}`, 1000, y + 52, 30, ASH, kk, F.mono(500));
              const A = (rew[k] - mean) / sd;
              const bx = 1500;
              rect(c, A >= 0 ? bx : bx + A * 160, y + 18, Math.abs(A) * 160, 44, A >= 0 ? GOLD : BONE, 0, 1, A >= 0 ? rgbaHex(GOLD, 0.85 * kk) : rgbaHex(BONE, 0.3 * kk));
              text(c, `Â=${A >= 0 ? '+' : ''}${A.toFixed(2)}`, 1900, y + 52, 30, A >= 0 ? GOLD : ASH, kk, F.mono(600));
            }
            line(c, 1500, 120, 1500, 1040, BONE, 2, 0.5);
            text(c, 'Â_i = (r_i − mean(r)) / std(r)', 1200, h - 20, 40, GOLD, gp, F.mono(500));
            text(c, 'group of G = 8 outputs', 760, 110, 28, ASH, gp, F.mono(500));
            void w;
          });
          pipe.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 20, BONE, 2, 0.45, 'rgba(10,11,14,0.94)');
            text(c, 'DEEPSEEK-R1 · 671B MoE · 37B active', 50, 90, 34, BONE, 1, F.mono(600));
            const rows = ['DeepSeek-V3-Base', 'R1-Zero: pure RL (GRPO), rule-based rewards', 'cold-start SFT', 'reasoning RL (GRPO)', 'rejection sampling + SFT', 'RL · all scenarios', 'DeepSeek-R1'];
            rows.forEach((s, k) => { const on = prog(t, this.cuts[8] + k * 0.18, this.cuts[8] + 0.3 + k * 0.18); rrect(c, 60, 160 + k * 185, w - 120, 130, 14, k === 6 ? GOLD : BONE, k === 6 ? 4 : 2, on, k === 6 ? rgbaHex(GOLD, 0.12) : undefined); text(c, s, 90, 240 + k * 185, 34, k === 6 ? GOLD : BONE, on, F.mono(500)); if (k < 6) arrow(c, w / 2, 290 + k * 185, w / 2, 345 + k * 185, BONE, 2, 12, on); });
            void h;
          });
          return {};
        };
      },
      cam: (t0, t1, l) => [{ t: t0, pos: [0, 3.5, 12], look: [0, 2.2, -2], fov: 44 }, { t: l.words[1].start + 0.2, pos: [0, -0.8, 11], look: [0, -1.5, 0], fov: 44, e: ease.inOutCubic }, { t: t1, pos: [4, -0.2, 10], look: [3, -0.6, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: 0.72 },
    };
  }

  // ---------------------------------------------------------------- 9: distill the teacher; watch it go
  distill(): Shot {
    return {
      at: [540, 0, 0],
      build: (g) => {
        const teacher = card(g, 1200, 1200, 5.5, [-4.5, 0.6, -1]);
        const flow = card(g, 2400, 900, 10, [1, 0.2, -0.5], [0, 0, 0], { additive: true });
        const students = ['Qwen-1.5B', 'Qwen-7B', 'Llama-8B', 'Qwen-14B', 'Qwen-32B', 'Llama-70B'].map((s, k) => {
          const cd = card(g, 700, 220, 2.4, [4.6, 2.6 - k * 0.95, 0]);
          cd.draw((c, w, h) => { rrect(c, 4, 4, w - 8, h - 8, 26, GOLD, 3, 1, 'rgba(10,11,14,0.9)'); text(c, `R1-Distill-${s}`, w / 2, h / 2 + 16, 40, CORE, 1, F.mono(500), 'center'); });
          return cd;
        });
        teacher.draw((c, w, h) => {
          circle(c, w / 2, h / 2, w * 0.42, BONE, 4, 0.9, 'rgba(10,11,14,0.9)');
          for (let k = 0; k < 256; k++) { const a = hash(k, 1) * 6.28, r = Math.sqrt(hash(k, 2)) * w * 0.38; circle(c, w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 10, k % 32 === 0 ? GOLD : BONE, 2, k % 32 === 0 ? 1 : 0.3); }
          text(c, 'TEACHER', w / 2, h / 2 - 20, 60, BONE, 1, F.mono(700), 'center');
          text(c, 'DeepSeek-R1 · 671B', w / 2, h / 2 + 50, 40, ASH, 1, F.mono(500), 'center');
        });
        return ({ t, lt, line: l }) => {
          flow.draw((c, w, h) => {
            for (let s = 0; s < 40; s++) { const u = ((lt * 0.6 + s / 40) % 1); const x = lerp(200, w - 250, u), y = h / 2 + Math.sin(u * 6 + s) * 160; chip(c, ['<think>', 'proof', '∴', 'step', '✓'][s % 5], x, y, 26, GOLD, true); }
            text(c, '≈ 800k reasoning samples → SFT', w / 2, 80, 40, GOLD, 1, F.mono(600), 'center');
          });
          const goT = l.words[4]?.start ?? l.end - 0.5;
          students.forEach((cd, k) => { const go = prog(t, goT + k * 0.06, goT + 0.9 + k * 0.06, ease.inExpo); cd.mesh.position.x = 4.6 + go * 18; cd.mesh.position.z = go * 4; });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1, 0.5, 11], look: [0, 0.4, 0], fov: 44 }, { t: t1, pos: [3.2, 0.5, 10], look: [3, 0.6, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 10: trading blows — a leaderboard through real releases
  board(): Shot {
    // real releases in order; every swap (each half beat) the side that just shipped takes #1 with its new model
    const REL: [0 | 1, string, string][] = [
      [1, 'Claude 3 Opus', 'Mar 2024'], [0, 'GPT-4o', 'May 2024'], [1, 'Claude 3.5 Sonnet', 'Jun 2024'], [0, 'o1-preview', 'Sep 2024'],
      [1, 'Claude 3.5 Sonnet (new)', 'Oct 2024'], [0, 'o1', 'Dec 2024'], [1, 'Claude 3.7 Sonnet', 'Feb 2025'], [0, 'o3', 'Apr 2025'],
      [1, 'Claude Opus 4', 'May 2025'], [0, 'GPT-5', 'Aug 2025'], [1, 'Claude Sonnet 4.5', 'Sep 2025'], [0, 'GPT-5.1', 'Nov 2025'], [1, 'Claude Opus 4.5', 'Nov 2025'],
    ];
    return {
      at: [600, 0, 0],
      build: (g) => {
        const tbl = card(g, 2200, 1300, 10, [0, 0, 0]);
        return ({ t, t0 }) => {
          const au = this.ctx.audio;
          const b = (au.beatAt(t) - au.beatAt(t0)) * 2;
          const step = Math.min(REL.length - 1, Math.max(0, Math.floor(b)));
          const e = ease.outExpo(clamp((b - Math.floor(b)) / 0.3));
          // current model per company = its latest release up to this step (GPT-4 Turbo before OpenAI's first)
          const cur = (co: 0 | 1, k: number) => { for (let q = k; q >= 0; q--) if (REL[q][0] === co) return REL[q]; return co === 0 ? [0, 'GPT-4 Turbo', 'Apr 2024'] as [0, string, string] : REL[0]; };
          const topCo = REL[step][0];
          const prevTop = step > 0 ? REL[step - 1][0] : topCo;
          tbl.draw((c, w, h) => {
            text(c, 'LEADERBOARD', 80, 110, 40, ASH, 1, F.mono(600), 'left', 6);
            text(c, REL[step][2], w - 80, 110, 40, GOLD, 1, F.mono(600), 'right');
            ([0, 1] as const).forEach((co) => {
              const top = co === topCo, wasTop = co === prevTop;
              const y = lerp(wasTop ? 240 : 520, top ? 240 : 520, e);
              const jab = Math.sin(e * Math.PI) * (top ? 80 : -30);
              const [, name, date] = cur(co, step);
              const fresh = top && step > 0; // the new release flashes in
              rrect(c, 80 + jab, y, w - 160, 230, 20, top ? GOLD : BONE, top ? 4 : 2, top ? 1 : 0.5, top ? rgbaHex(GOLD, 0.1 + (fresh ? 0.25 * (1 - e) : 0)) : 'rgba(12,13,17,0.9)');
              text(c, top ? '#1' : '#2', 130 + jab, y + 140, 70, top ? GOLD : ASH, 1, F.mono(700));
              c.save(); c.beginPath(); c.rect(340 + jab, y, w - 760, 230); c.clip();
              const slide = fresh ? (1 - e) * 120 : 0; // the name slides up as it is replaced
              text(c, name, 360 + jab, y + 105 + slide, 74, BONE, fresh ? e : 1, F.display(700));
              c.restore();
              text(c, `${co === 0 ? 'OpenAI' : 'Anthropic'} · ${date}`, 360 + jab, y + 175, 34, ASH, 1, F.mono(500));
              text(c, String(1250 + step * 9 + (top ? 7 : 0) + co), w - 140 + jab, y + 140, 60, top ? GOLD : BONE, 1, F.mono(600), 'right');
            });
            for (let k = 0; k < 4; k++) { const y = 820 + k * 110; rrect(c, 80, y, w - 160, 90, 14, BONE, 2, 0.2); text(c, `#${k + 3}`, 130, y + 62, 40, GRAPH, 1, F.mono(600)); rect(c, 360, y + 30, 300 + hash(k) * 600, 30, GRAPH, 0, 1, rgbaHex(GRAPH, 0.6)); }
          });
          const s = pulse(t, t0 + au.timeOfBeat(au.beatAt(t0) + step / 2) - t0, 0.07) * 10;
          return { shake: [s * (hash(t, 1) - 0.5), s * (hash(t, 2) - 0.5)] as [number, number] };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2.5, 1.5, 11], look: [0, 0.6, 0], fov: 42, roll: 0.04 }, { t: t1, pos: [2.5, -0.5, 10], look: [0, 0.3, 0], fov: 42, roll: -0.04, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 11: the loss goes down; the invoice grows (two perpendicular planes, one point)
  invoice(): Shot {
    // the loss card lies in the XY plane; the invoice card stands perpendicular (ZY plane) sharing the point P
    const P0 = new THREE.Vector3(3, -2.2, 0);
    return {
      at: [660, 0, 0],
      build: (g) => {
        const lossC = card(g, 2000, 1400, 9, [P0.x - 3.5, P0.y + 3.1, 0]);
        // placed so its origin (pixel x = 80, left as seen from the camera) sits exactly on the shared point P
        const IZ = -(4.5 - (80 / 2000) * 9);
        const invC = card(g, 2000, 1400, 9, [P0.x, P0.y + 3.1, IZ], [0, Math.PI / 2, 0]);
        const pt = card(g, 256, 256, 1.2, [P0.x, P0.y, 0.05], [0, 0, 0], { additive: true });
        pt.draw((c, w, h) => dot(c, w / 2, h / 2, 26, GOLD, 2));
        const series = ragged(200, 23, (u) => 2.6 - 1.7 * (1 - Math.exp(-u * 4)), 0.03, 0.1);
        return ({ t, line: l }) => {
          const invT = l.words[4]?.start ?? l.start + 1;
          const lp = prog(t, this.cuts[11], invT - 0.1);
          const ip = prog(t, invT + 0.3, this.vEnd(11), ease.inQuad);
          // seen from behind, the loss plane would read mirrored: it dims away once the turn to the invoice is made
          lossC.opacity = 1 - 0.85 * prog(t, invT + 0.15, invT + 0.6);
          lossC.draw((c, w, h) => {
            line(c, 80, h - 80, w - 40, h - 80, BONE, 2, 0.7); line(c, 80, 60, 80, h - 80, BONE, 2, 0.7);
            text(c, 'LOSS', 100, 100, 40, BONE, 1, F.mono(600), 'left', 6);
            const pts: P[] = series.map((v, k) => [80 + (k / 199) * (w - 120), h - 80 - ((v - 0.8) / 2) * (h - 160)]);
            beam(c, pts, lp, 4, BONE, 0);
          });
          invC.draw((c, w, h) => {
            line(c, 80, h - 80, w - 40, h - 80, BONE, 2, 0.7); line(c, 80, 60, 80, h - 80, BONE, 2, 0.7);
            text(c, 'INVOICE', 100, 100, 40, GOLD, 1, F.mono(600), 'left', 6);
            const pts: P[] = [];
            for (let k = 0; k <= 200 * ip; k++) { const u = k / 200; pts.push([80 + u * (w - 140), h - 80 - (Math.exp(u * 4.2) - 1) / (Math.exp(4.2) - 1) * (h - 160) * (1 + 0.05 * Math.sin(u * 50))]); }
            trace(c, pts, 5, GOLD, 1.2);
            if (pts.length > 1) { const [x, y] = pts[pts.length - 1]; text(c, `$${Math.round(Math.exp(ip * 13)).toLocaleString('en-US')}`, x - 30, y - 30, 56, GOLD, 1, F.mono(600), 'right'); }
          });
          // the point: rides the loss curve's head, then stays put and becomes the start of the invoice, which climbs
          const lw = 9, lh = 9 * 1400 / 2000;
          const k2 = Math.floor(lp * 199);
          const v = series[k2];
          const lx = (P0.x - 3.5) - lw / 2 + (80 + (k2 / 199) * (2000 - 120)) / 2000 * lw;
          const ly = (P0.y + 3.1) + lh / 2 - (1400 - 80 - ((v - 0.8) / 2) * (1400 - 160)) / 1400 * lh;
          if (t < invT) pt.mesh.position.set(lx, ly, 0.05);
          else {
            const u = ip;
            const iz = IZ + lw / 2 - (80 + u * (2000 - 140)) / 2000 * lw;
            const iy = (P0.y + 3.1) + lh / 2 - (1400 - 80 - (Math.exp(u * 4.2) - 1) / (Math.exp(4.2) - 1) * (1400 - 160)) / 1400 * lh;
            pt.mesh.position.set(P0.x + 0.05, iy, iz);
            pt.mesh.rotation.y = Math.PI / 2;
          }
          return {};
        };
      },
      cam: (t0, t1, l) => {
        const invT = l.words[4]?.start ?? t0 + 1;
        return [
          { t: t0, pos: [-1, 1.2, 9], look: [-0.5, 0.8, 0], fov: 42 },
          { t: invT - 0.15, pos: [2, -0.5, 6.5], look: [2.7, -1.6, 0], fov: 40, e: ease.inOutQuad },
          { t: invT + 0.5, pos: [10.5, 0.6, -3.4], look: [3, 0.6, -4.1], fov: 46, e: ease.inOutCubic },
          { t: t1, pos: [11.5, 1.2, -4.6], look: [3, 0.9, -4.1], fov: 48, e: ease.linear },
        ];
      },
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 12: GPT-6, Opus five-point-five — release reels
  versions(): Shot {
    return {
      at: [720, 0, 0],
      build: (g) => {
        const a = card(g, 2000, 700, 10, [0, 1.6, 0]);
        const b = card(g, 2000, 700, 10, [0, -1.8, 0.8]);
        const reel = (c: C2, w: number, h: number, pre: string, seq: string[], t: number, tt: number, sub: string) => {
          const p = prog(t, tt - 0.45, tt + 0.6, ease.outCubic);
          text(c, pre, w * 0.52, 470, 300, BONE, 1, F.display(800), 'right');
          c.save(); c.beginPath(); c.rect(w * 0.53, 110, w * 0.45, 460); c.clip();
          const f = p * (seq.length - 1), i = Math.floor(f), fr = p >= 1 ? 0 : f - i;
          for (let d = -1; d <= 1; d++) { const j = i + d; if (j < 0 || j >= seq.length) continue; text(c, seq[j], w * 0.55, 470 + (d - fr) * 360, 300, p >= 1 && d === 0 ? GOLD : BONE, d === 0 ? 1 : 0.3, F.display(800)); }
          c.restore();
          rrect(c, w * 0.53, 110, w * 0.45, 460, 20, BONE, 3, 0.4);
          text(c, sub, w * 0.55, 650, 34, ASH, p, F.mono(500));
        };
        return ({ t, line: l }) => {
          a.draw((c, w, h) => reel(c, w, h, 'GPT-', ['4', '4o', 'o1', 'o3', '5', '6'], t, l.words[0].start, 'GPT-6 Astra · OpenAI · 2026'));
          b.draw((c, w, h) => reel(c, w, h, 'Opus ', ['3', '4', '4.1', '4.5', '5', '5.5'], t, l.words[1].start, 'Claude Opus 5.5 · Anthropic · 22 Sep 2026'));
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, 0, 12], look: [0, 0, 0], fov: 42 }, { t: t1, pos: [-0.5, -0.4, 10.5], look: [0, -0.2, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7, size: 0.5 },
    };
  }

  // ---------------------------------------------------------------- 13: my carbon CV fights to stay alive (strike, then shred at the fill)
  cv(): Shot {
    return {
      at: [780, 0, 0],
      build: (g) => {
        const strips = 18;
        const parts = Array.from({ length: strips }, (_, k) => card(g, 2000 / strips, 2600, 7 / strips, [-3.5 + (k + 0.5) * (7 / strips), 0, 0]));
        const items = ['Arithmetic', 'Translation (40 languages)', 'Copywriting', 'Illustration', 'Coding', 'Legal research', 'Composing songs', 'Diagnosing X-rays', 'Being funny', 'Breathing'];
        const draw = (c: C2, k: number, t: number, l: Line) => {
          c.save(); c.translate(-k * (2000 / strips), 0);
          c.fillStyle = '#0c0d11'; c.fillRect(0, 0, 2000, 2600); c.strokeStyle = 'rgba(236,233,226,0.55)'; c.lineWidth = 4; c.strokeRect(0, 0, 2000, 2600);
          text(c, 'CURRICULUM VITAE', 140, 240, 90, '#ece9e2', 1, F.mono(700), 'left', 8);
          text(c, 'HUMAN · CARBON-BASED · SINCE ~300,000 BC', 140, 320, 40, '#8b8f99', 1, F.mono(500), 'left', 4);
          line(c, 140, 380, 1860, 380, '#ece9e2', 3, 0.5);
          text(c, 'SKILLS', 140, 500, 44, '#8b8f99', 1, F.mono(600), 'left', 6);
          const a = this.cuts[13] + 0.1, b = l.words[l.words.length - 1].start + 0.3;
          items.forEach((it, j) => {
            const y = 620 + j * 170;
            text(c, it, 200, y, 72, '#ece9e2', 1, F.mono(400));
            const st = a + (j / 9) * (b - a);
            const p = prog(t, st, st + 0.18, ease.outCubic);
            if (j < items.length - 1 && p > 0) { const wd = measure(c, it, 72, F.mono(400)); c.fillStyle = 'rgba(255,59,47,0.95)'; c.fillRect(190, y - 26, (wd + 20) * p, 10); }
            if (j === items.length - 1 && t > st) text(c, '← still doing this', 900, y, 52, '#ffb21e', 0.5 + 0.5 * Math.sin(t * 10), F.mono(600));
          });
          c.restore();
        };
        return ({ t, line: l }) => {
          const sh = prog(t, 116.55, 117.8, ease.inCubic);
          parts.forEach((cd, k) => {
            cd.draw((c) => draw(c, k, t, l));
            cd.mesh.position.y = -sh * (4 + hash(k, 1) * 7) * (k % 2 ? 1 : 0.7);
            cd.mesh.position.z = sh * (hash(k, 3) - 0.3) * 4;
            cd.mesh.rotation.set(sh * (hash(k, 4) - 0.5) * 1.5, sh * (hash(k, 5) - 0.5), sh * (hash(k, 2) - 0.5) * 0.8);
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2, 2.5, 9], look: [0, 1.2, 0], fov: 44 }, { t: 116.4, pos: [0.5, 0.2, 8], look: [0, -0.4, 0], fov: 42, e: ease.inOutQuad }, { t: t1, pos: [0, -3, 9], look: [0, -4, 0], fov: 46, e: ease.inQuad }],
      lyric: { sx: -0.7, sy: -0.7, size: 0.55 },
    };
  }
}
void grid; void chip; void windowFrame; void INK; void mulberry32; void CORE;
