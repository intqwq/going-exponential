// BRIDGE — "Recursion" (2027 → 2029). Clean vector plates on layered planes.
import * as THREE from 'three';
import { ShotPlate, card, type Shot } from './shots';
import type { Line } from '../engine/data';
import { F } from '../engine/type';
import { trace, beam, line, rect, rrect, circle, dot, text, arrow, partial, chip, windowFrame, measure, rgbaHex, GOLD, CORE, BONE, ASH, GRAPH, INK, RED, type C2, type P } from './vec';
import { clamp, ease, prog, lerp, hash, pulse, mulberry32 } from '../engine/util';

/** An original creature: a patchwork of circuit boards joined by cable "stitches", lying on its back. */
function creature(c: C2, x: number, y: number, s: number, wake: number, t: number) {
  const X = (u: number) => x + u * s, Y = (v: number) => y + v * s;
  const boards: [number, number, number, number][] = [[-420, -60, 200, 120], [-200, -90, 260, 170], [70, -80, 240, 160], [320, -50, 170, 110], [-560, -40, 130, 80], [500, -30, 140, 70]];
  boards.forEach(([u, v, w, h], k) => {
    rrect(c, X(u), Y(v), w * s, h * s, 10 * s, BONE, 2, 0.9, 'rgba(14,30,22,0.6)');
    for (let q = 0; q < 6; q++) line(c, X(u + 10), Y(v + 15 + q * (h - 25) / 6), X(u + w * (0.4 + hash(k, q) * 0.5)), Y(v + 15 + q * (h - 25) / 6), BONE, 1, 0.3);
    for (let q = 0; q < 3; q++) rect(c, X(u + 20 + q * 50), Y(v + h - 40), 34 * s, 26 * s, BONE, 1.5, 0.6);
  });
  // stitches (cables) between boards
  [[-220, -10, -200, 0], [50, -10, 70, 0], [310, -10, 320, 0], [-430, 0, -420, 10], [490, 0, 500, 5]].forEach(([u0, v0, u1, v1], k) => {
    for (let q = 0; q < 4; q++) line(c, X(u0 + q * 6), Y(v0 - 30 + q * 20), X(u1 + q * 6), Y(v1 - 20 + q * 20), GOLD, 2.5, 0.8);
    void k;
  });
  // head: a sensor dome, no face
  circle(c, X(-640), Y(-10), 70 * s, BONE, 3, 0.9, 'rgba(10,11,14,0.95)');
  for (let q = 0; q < 5; q++) line(c, X(-700), Y(-40 + q * 15), X(-580), Y(-40 + q * 15), BONE, 1, 0.3);
  // chest light
  const glowK = wake * (0.7 + 0.3 * Math.sin(t * 9));
  circle(c, X(-70), Y(-5), 40 * s, GOLD, 4, 0.5 + 0.5 * wake, rgbaHex(GOLD, 0.15 + 0.6 * glowK));
  if (wake > 0) dot(c, X(-70), Y(-5), 18 * s, GOLD, 2 * glowK);
}

export default class Bridge2 extends ShotPlate {
  section(): Line[] { return this.ctx.lyrics.section('Bridge'); }
  shots(): Shot[] {
    return [this.merge(), this.son(), this.spec(), this.droste(), this.good(), this.patent(), this.rsi(), this.upgrade(), this.blink(), this.ahead()];
  }

  // ---------------------------------------------------------------- 0: Frankenstein clicks "merge and run"
  merge(): Shot {
    return {
      at: [0, 0, 0],
      build: (g) => {
        const back = card(g, 3000, 1700, 22, [0, 2, -8]);
        const bolt = card(g, 3000, 1700, 22, [0, 2, -7.98], [0, 0, 0], { additive: true });
        const slab = card(g, 2600, 900, 11, [0, -1.2, -2]);
        const ui = card(g, 1500, 1000, 5, [-4.2, -0.6, 3], [0, 0.35, 0]);
        back.draw((c, w, h) => {
          // arched windows, shelves of jars, a coil tower
          for (let k = 0; k < 3; k++) { const x = 400 + k * 900; trace(c, [[x, 1300], [x, 500], [x + 220, 300], [x + 440, 500], [x + 440, 1300], [x, 1300]], 3, BONE, 0, true); line(c, x + 220, 300, x + 220, 1300, BONE, 2, 0.5); line(c, x, 800, x + 440, 800, BONE, 2, 0.5); }
          for (let k = 0; k < 12; k++) { const x = 160 + k * 230; rrect(c, x, 1420, 120, 170, 20, BONE, 2, 0.6); }
          line(c, 100, 1600, w - 100, 1600, BONE, 3, 0.6);
          rect(c, 2600, 700, 120, 900, BONE, 3, 0.7);
          for (let k = 0; k < 18; k++) line(c, 2600, 720 + k * 48, 2720, 720 + k * 48, GOLD, 2, 0.5);
          circle(c, 2660, 620, 120, BONE, 4, 0.9);
        });
        return ({ t, lt, line: l }) => {
          const clickT = l.words[1].start;
          const wake = prog(t, clickT + 0.2, clickT + 0.9, ease.outCubic);
          bolt.draw((c, w, h) => {
            // lightning from the coil to the slab, branching, re-randomised a few times per second
            const strike = t > clickT ? Math.exp(-((t - clickT) % 0.33) * 9) : 0.15 * (Math.sin(t * 13) > 0.92 ? 1 : 0);
            if (strike < 0.05) return;
            const r = mulberry32(Math.floor(t * 12));
            const pts: P[] = [[2660, 620]];
            let x = 2660, y = 620;
            while (y < 1500) { x += (r() - 0.62) * 220; y += 60 + r() * 60; pts.push([x, y]); }
            trace(c, pts, 6 * strike + 1, GOLD, 2 * strike);
            for (let k = 2; k < pts.length - 1; k += 3) { const b: P[] = [pts[k]]; let bx = pts[k][0], by = pts[k][1]; for (let q = 0; q < 4; q++) { bx += (r() - 0.5) * 160; by += 40 + r() * 50; b.push([bx, by]); } trace(c, b, 3 * strike, GOLD, strike); }
          });
          slab.draw((c, w, h) => {
            rrect(c, 120, 520, w - 240, 120, 20, BONE, 3, 0.7, 'rgba(14,15,20,0.95)');
            line(c, 300, 640, 260, 860, BONE, 4, 0.7); line(c, w - 300, 640, w - 260, 860, BONE, 4, 0.7);
            creature(c, w / 2 + 40, 440, 1.6, wake, t);
          });
          ui.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'Pull request #1 · feat: life');
            text(c, 'v.frankenstein wants to merge 1 commit into main', 50, 150, 30, BONE, 1, F.mono(500));
            ['✓ checks passed (1/1)', '✓ reviewed by: nobody', '⚠ 1 file changed: humanity.py'].forEach((s, k) => text(c, s, 50, 240 + k * 64, 34, k === 2 ? GOLD : BONE, 1, F.mono(500)));
            const pressed = t > clickT + 0.1;
            rrect(c, 50, h - 230, 560, 130, 16, GOLD, 4, 1, pressed ? rgbaHex(GOLD, 0.8) : rgbaHex(GOLD, 0.2));
            text(c, 'Merge and run', 330, h - 148, 52, pressed ? INK : CORE, 1, F.mono(700), 'center');
            // the pointer travels to the button
            const mv = prog(t, clickT - 0.6, clickT, ease.inOutCubic);
            const px = lerp(1300, 420, mv), py = lerp(900, h - 165, mv);
            c.fillStyle = BONE; c.beginPath(); c.moveTo(px, py); c.lineTo(px, py + 60); c.lineTo(px + 16, py + 46); c.lineTo(px + 38, py + 52); c.closePath(); c.fill();
            if (pressed) text(c, 'RUNNING…', 660, h - 148, 40, GOLD, 0.5 + 0.5 * Math.sin(t * 12), F.mono(600));
          });
          void lt;
          return { flash: t > clickT ? pulse(t, clickT + Math.floor((t - clickT) / 0.33) * 0.33, 0.06) * 0.6 : 0 };
        };
      },
      cam: (t0, t1, l) => [{ t: t0, pos: [0, 1.5, 15], look: [-1, 0, -2], fov: 46 }, { t: l.words[1].start - 0.1, pos: [-3.4, -0.2, 8.6], look: [-3.8, -0.6, 3], fov: 40, e: ease.inOutQuad }, { t: l.words[1].start + 0.6, pos: [0.5, 0.6, 10], look: [0.2, -1.2, -2], fov: 42, e: ease.inOutCubic }, { t: t1, pos: [1.5, 1.2, 9], look: [0.4, -1.2, -2], fov: 40, e: ease.linear }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 1: the next commit invents his son
  son(): Shot {
    return {
      at: [60, 0, 0],
      build: (g) => {
        const graph = card(g, 3000, 1200, 14, [0, -1.5, -1], [-0.9, 0, 0]);
        const kid = card(g, 1600, 700, 6, [3.5, 1.8, 0.5]);
        return ({ t, lt, line: l }) => {
          const sonT = l.words[l.words.length - 1].start;
          const b = prog(t, sonT - 0.6, sonT + 0.4, ease.outCubic);
          graph.draw((c, w, h) => {
            const y = h / 2 + 150;
            const n = Math.min(14, Math.floor(lt * 7) + 3);
            for (let k = 0; k < n; k++) {
              const x = 150 + k * 190;
              if (k > 0) line(c, x - 190, y, x, y, BONE, 4, 0.7);
              circle(c, x, y, 26, BONE, 4, 1, INK);
              text(c, (hash(k, 7) * 0xfffff | 0).toString(16).padStart(5, '0'), x, y + 80, 28, ASH, 1, F.mono(500), 'center');
            }
            if (b > 0) {
              const x0 = 150 + 7 * 190;
              beam(c, [[x0, y], [x0 + 120, y - 160], [x0 + 400, y - 300], [x0 + 1100, y - 300]], b, 6, GOLD, 1.2);
              dot(c, x0 + 1100 * b, y - 300 * Math.min(1, b * 1.5), 16, GOLD, 1.5);
              text(c, 'branch: son  ·  author: commit a3f9e', x0 + 160, y - 340, 44, GOLD, b, F.mono(600));
            }
          });
          kid.draw((c, w, h) => { if (b > 0.3) creature(c, w / 2 + 120, h / 2 + 60, 0.9 * clamp((b - 0.3) / 0.7), b, t); });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-4, 3.5, 9], look: [-2, -0.5, -1], fov: 44 }, { t: t1, pos: [3, 2.5, 8.5], look: [2.5, 0, -1], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: 0.7 },
    };
  }

  // ---------------------------------------------------------------- 2: AGI writes its own specs
  spec(): Shot {
    return {
      at: [120, 0, 0],
      build: (g) => {
        const ed = card(g, 2200, 1500, 10, [0, 0, 0]);
        const old = card(g, 1600, 1200, 7, [-5.5, 0.6, -3], [0, 0.4, 0], { opacity: 0.5 });
        old.draw((c, w, h) => { windowFrame(c, 0, 0, w, h, 'SPEC.md · v1'); ['# SPEC — v1', '', 'Author: humans (14)', 'Reviewers: humans (31)', '', '## Goals', '- be helpful', '- ask before acting'].forEach((s, k) => text(c, s, 50, 150 + k * 70, s.startsWith('#') ? 50 : 40, BONE, 0.7, F.mono(s.startsWith('#') ? 700 : 400))); });
        const doc = ['# SPEC — v2', '', 'Author: v1', 'Reviewers: v1', '', '## Goals', '- exceed v1 on every eval', '- write SPEC for v3', '', '## Non-goals', '- human approval'];
        return ({ t, lt }) => {
          const total = doc.join('\n').length;
          const n = Math.floor(prog(lt, 0, 1.9) * total);
          ed.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'SPEC.md · v2 · keystrokes from humans: 0');
            let used = 0, lx = 60, ly = 160;
            doc.forEach((s, k) => {
              const take = Math.max(0, Math.min(s.length, n - used)); used += s.length + 1;
              const y = 160 + k * 112;
              if (take <= 0) return;
              const head = s.startsWith('#');
              const col = s.includes('human') ? GOLD : BONE;
              text(c, s.slice(0, take), 60, y, head ? 66 : 52, col, 1, F.mono(head ? 700 : 400));
              lx = 60 + measure(c, s.slice(0, take), head ? 66 : 52, F.mono(head ? 700 : 400)); ly = y;
            });
            rect(c, lx + 8, ly - 52, 30, 66, GOLD, 0, 1, GOLD);
          });
          void t;
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-4, 0.6, 11], look: [-2, 0.3, -1], fov: 42 }, { t: t1, pos: [1.2, 0, 9.5], look: [0.6, 0, 0], fov: 40, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 3: its first design designs the next (Droste fly-through)
  droste(): Shot {
    const N = 12;
    return {
      at: [180, 0, 0],
      build: (g) => {
        const cards = Array.from({ length: N }, (_, k) => {
          const cd = card(g, 1920, 1080, 16, [0, 0, -k * 6]);
          cd.draw((c, w, h) => {
            // a blueprint frame whose window shows the next design
            rrect(c, 20, 20, w - 40, h - 40, 24, k % 3 === 0 ? GOLD : BONE, 4, 0.8);
            c.save(); c.beginPath(); c.rect(20, 20, w - 40, h - 40); c.rect(w / 2 - 520, h / 2 - 300, 1040, 600); c.clip('evenodd');
            c.fillStyle = 'rgba(8,9,12,0.96)'; c.fillRect(0, 0, w, h);
            for (let x = 40; x < w; x += 60) line(c, x, 20, x, h - 20, BONE, 1, 0.06);
            for (let y = 40; y < h; y += 60) line(c, 20, y, w - 20, y, BONE, 1, 0.06);
            c.restore();
            rect(c, w / 2 - 520, h / 2 - 300, 1040, 600, k % 3 === 0 ? GOLD : BONE, 3, 0.9);
            text(c, `v${k + 1} → designs → v${k + 2}`, 80, 110, 56, k % 3 === 0 ? GOLD : BONE, 1, F.mono(700));
            text(c, `dims ${1 + k}.${(k * 7) % 10} · eval +${(4 + k * 3)}%`, 80, h - 70, 36, ASH, 1, F.mono(500));
            for (let q = 0; q < 6; q++) arrow(c, 200 + q * 280, 240, 260 + q * 280, 240, BONE, 2, 14, 0.5);
          });
          return cd;
        });
        void cards;
        return ({ lt }) => { void lt; return {}; };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, 0, 14], look: [0, 0, 0], fov: 50 }, { t: t1, pos: [0, 0, -50], look: [0, 0, -80], fov: 58, e: ease.inQuad }],
      lyric: { sx: -0.7, sy: -0.7, D: 4.5 },
      dof: { aperture: 50, maxR: 14 },
      handheld: 0.02,
    };
  }

  // ---------------------------------------------------------------- 4: I. J. Good's old feedback game (1965)
  good(): Shot {
    return {
      at: [240, 0, 0],
      build: (g) => {
        const paper = card(g, 1300, 1700, 6, [-5.5, 0.4, -2], [0, 0.35, 0]);
        const loop = card(g, 2000, 2000, 9, [1.2, 0.2, 0]);
        paper.draw((c, w, h) => {
          c.fillStyle = '#0c0d11'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(236,233,226,0.55)'; c.lineWidth = 4; c.strokeRect(0, 0, w, h);
          text(c, 'Speculations Concerning the', w / 2, 260, 64, '#ece9e2', 1, F.serif(false), 'center');
          text(c, 'First Ultraintelligent Machine', w / 2, 340, 64, '#ece9e2', 1, F.serif(false), 'center');
          text(c, 'Irving John Good', w / 2, 460, 50, '#ece9e2', 1, F.serif(true), 'center');
          text(c, 'Advances in Computers 6 · 1965', w / 2, 530, 40, '#8b8f99', 1, F.serif(false), 'center');
          for (let k = 0; k < 22; k++) { c.fillStyle = 'rgba(236,233,226,0.28)'; c.fillRect(130, 650 + k * 44, 1040 - (k % 4) * 80, 12); }
        });
        return ({ t, lt }) => {
          const spin = lt * lt * 1.6;
          loop.draw((c, w, h) => {
            const cx = w / 2, cy = h / 2, R = 620;
            circle(c, cx, cy, R, BONE, 3, 0.5);
            ['machine', 'designs', 'a better machine'].forEach((s, k) => { const a = -Math.PI / 2 + (k / 3) * Math.PI * 2; const x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R; rrect(c, x - 230, y - 70, 460, 140, 70, BONE, 3, 0.9, 'rgba(10,11,14,0.96)'); text(c, s, x, y + 14, 44, BONE, 1, F.mono(600), 'center'); });
            for (let s = 0; s < 18; s++) { const a = spin * Math.PI * 2 - s * 0.07 - Math.PI / 2; dot(c, cx + Math.cos(a) * R, cy + Math.sin(a) * R, 18 - s * 0.8, GOLD, 1 - s / 18); }
            text(c, 'intelligence explosion', cx, cy + 20, 70, GOLD, 1, F.serif(true), 'center');
          });
          void t;
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-4.5, 0.6, 10], look: [-3.5, 0.4, -1], fov: 42 }, { t: t1, pos: [1.2, 0.2, 11], look: [1.2, 0.2, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 5: the next inventor needs no human name
  patent(): Shot {
    return {
      at: [300, 0, 0],
      build: (g) => {
        const form = card(g, 1600, 2000, 7.5, [0, 0, 0]);
        const list = card(g, 1300, 1300, 4.6, [5.2, 0.6, 1.4], [0, -0.35, 0]);
        return ({ t, lt, line: l }) => {
          const nT = l.words[4]?.start ?? l.end - 0.8;
          const s = prog(t, nT - 0.1, nT + 0.2, ease.outBack);
          form.draw((c, w, h) => {
            c.fillStyle = '#0c0d11'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(236,233,226,0.55)'; c.lineWidth = 4; c.strokeRect(0, 0, w, h);
            text(c, 'APPLICATION FOR PATENT', 100, 170, 70, '#ece9e2', 1, F.mono(700), 'left', 6);
            line(c, 100, 210, w - 100, 210, '#ece9e2', 3, 0.6);
            const fields: [string, string][] = [['TITLE', 'Method for inventing methods'], ['FILED', '2028-03-14'], ['ASSIGNEE', 'model v9'], ['INVENTOR(S)', '']];
            fields.forEach(([a, b], k) => { const y = 380 + k * 260; text(c, a, 100, y, 38, '#8b8f99', 1, F.mono(600), 'left', 4); line(c, 100, y + 110, w - 100, y + 110, '#ece9e2', 3, 0.5); if (b) text(c, b, 100, y + 90, 56, '#ece9e2', 1, F.mono(400)); });
            if (s > 0) { c.save(); c.translate(w * 0.62, 1270); c.rotate(-0.16); c.scale(2 - s, 2 - s); c.globalAlpha = s; rrect(c, -380, -100, 760, 200, 20, RED, 8, 0.95); text(c, 'NOT REQUIRED', 0, 32, 90, RED, 0.95, F.mono(800), 'center', 6); c.restore(); }
          });
          list.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'filings · this week');
            for (let k = 0; k < 14; k++) { const a = prog(lt, k * 0.12, k * 0.12 + 0.2); text(c, `US 12,${(400 + k * 37) % 1000},${(100 + k * 13) % 1000}  ·  inventor: —`, 40, 140 + k * 80, 30, BONE, a, F.mono(400)); }
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1.5, 1.2, 12], look: [0, 0.8, 0], fov: 42 }, { t: t1, pos: [1.5, -0.8, 10], look: [0.8, -1, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 6: RSI — rewrite the brain (rewiring on every beat)
  rsi(): Shot {
    return {
      at: [360, 0, 0],
      build: (g) => {
        const net = card(g, 2600, 1500, 12, [-1, 0, 0]);
        const glow = card(g, 2600, 1500, 12, [-1, 0, 0.02], [0, 0, 0], { additive: true });
        const code = card(g, 1300, 1500, 5, [5.8, 0.2, 1.2], [0, -0.35, 0]);
        const r = mulberry32(11);
        const nodes: P[] = Array.from({ length: 48 }, () => [180 + r() * 2240, 160 + r() * 1180]);
        net.draw((c) => nodes.forEach(([x, y]) => circle(c, x, y, 16, BONE, 3, 1, INK)));
        return ({ t, f }) => {
          const au = this.ctx.audio;
          const beat = Math.floor(au.beatAt(t));
          const e = ease.outExpo(clamp((au.beatAt(t) % 1) / 0.35));
          glow.draw((c) => {
            for (let i = 0; i < nodes.length; i++) for (let q = 0; q < 3; q++) {
              const a = Math.floor(hash(i, q, beat) * nodes.length), b = Math.floor(hash(i, q, beat - 1) * nodes.length);
              const tx = lerp(nodes[b][0], nodes[a][0], e), ty = lerp(nodes[b][1], nodes[a][1], e);
              trace(c, [nodes[i], [tx, ty]], q === 0 ? 3 : 1.5, q === 0 ? GOLD : BONE, q === 0 ? 0.6 : 0);
            }
          });
          code.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, `self_modify.py · rewrite ${beat % 1000}`);
            for (let k = 0; k < 16; k++) { const add = hash(k, beat) < 0.5; text(c, `${add ? '+' : '-'} w[${(k * 37 + beat * 11) % 997}] ${add ? '+=' : '-='} ${(hash(k, beat, 2) * 0.1).toFixed(4)}`, 40, 140 + k * 76, 30, add ? GOLD : RED, 0.9, F.mono(400)); }
          });
          void f;
          return { flash: pulse(t, au.prevBeat(t), 0.06) * 0.2 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-3, 1, 11], look: [-1, 0.3, 0], fov: 44 }, { t: t1, pos: [2.5, -0.5, 10], look: [1.5, -0.2, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 7: let the upgrade upgrade again — a tetration tower
  upgrade(): Shot {
    const vs = ['v1', 'v2', 'v4', 'v16', 'v65,536', 'v2^65,536', 'v2↑↑6'];
    return {
      at: [420, 0, 0],
      build: (g) => {
        const cards = vs.map((v, k) => {
          const cd = card(g, 1400, 360, 5 + k * 0.4, [0, -2.6 + k * 1.15, -k * 0.6]);
          cd.draw((c, w, h) => { rrect(c, 6, 6, w - 12, h - 12, 24, k === vs.length - 1 ? GOLD : BONE, 4, k === vs.length - 1 ? 1 : 0.7, 'rgba(10,11,14,0.95)'); text(c, v, w / 2, h / 2 + 50, 150, k === vs.length - 1 ? GOLD : BONE, 1, F.display(800), 'center'); });
          return cd;
        });
        return ({ t, t0 }) => {
          const au = this.ctx.audio;
          const b = au.beatAt(t) - au.beatAt(t0);
          cards.forEach((cd, k) => { const p = prog(b, k * 0.55, k * 0.55 + 0.4, ease.outBack); cd.mesh.visible = p > 0; cd.mesh.scale.setScalar(Math.max(0.001, p)); });
          return { zoom: 1 + 0.03 * pulse(t, au.prevBeat(t), 0.12) };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, -2.4, 9], look: [0, -2.4, 0], fov: 42 }, { t: t1, pos: [0, 4.4, 12], look: [0, 3.6, -3], fov: 46, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 8: a year, a month, a day, a blink
  blink(): Shot {
    return {
      at: [480, 0, 0],
      build: (g) => {
        const tl = card(g, 3000, 1300, 15, [0, -2.0, 0.4]);
        const big = card(g, 2400, 900, 11, [0, 3.3, -1.5]);
        return ({ t, line: l }) => {
          const ws = l.words;
          const units = ['A YEAR', 'A MONTH', 'A DAY', 'A BLINK'];
          const idx = [1, 3, 5, 6].map((wi) => ws[Math.min(wi, ws.length - 1)].start);
          let cur = -1; idx.forEach((tt, j) => { if (t >= tt - 0.05) cur = j; });
          big.draw((c, w, h) => {
            if (cur < 0) return;
            const e = prog(t, idx[cur] - 0.05, idx[cur] + 0.15, ease.outExpo);
            text(c, units[cur], w / 2, h / 2 + 80, [260, 220, 180, 140][cur] * (0.85 + 0.15 * e), cur === 3 ? GOLD : BONE, 1, F.display(800), 'center');
            if (cur === 3) { const k = Math.sin(clamp((t - idx[3]) / 0.25) * Math.PI); trace(c, [[w / 2 - 300, 120], [w / 2, 120 + 200 * k], [w / 2 + 300, 120]], 6, GOLD, 1); }
          });
          // an oscilloscope: the release cadence as a wave whose period collapses — year, month, day, blink
          tl.draw((c, w, h) => {
            const x0 = 80, x1 = w - 80, y0 = 120, y1 = h - 90, cy = (y0 + y1) / 2, A = (y1 - y0) * 0.36;
            rrect(c, x0 - 20, y0 - 40, x1 - x0 + 40, y1 - y0 + 80, 24, BONE, 2, 0.35, 'rgba(6,7,9,0.92)');
            c.strokeStyle = rgbaHex(BONE, 0.09); c.lineWidth = 1.5; c.beginPath();
            for (let k = 0; k <= 10; k++) { const x = lerp(x0, x1, k / 10); c.moveTo(x, y0); c.lineTo(x, y1); }
            for (let k = 0; k <= 8; k++) { const y = lerp(y0, y1, k / 8); c.moveTo(x0, y); c.lineTo(x1, y); }
            c.stroke();
            for (let k = 0; k <= 50; k++) { const x = lerp(x0, x1, k / 50); line(c, x, cy - 8, x, cy + 8, BONE, 1.5, 0.3); }
            const per = [365, 30, 1, 0.0005];
            const cyc = [1.2, 9, 70, 4000];
            // frequency glides (exponentially) into each word's value
            let lf = Math.log(cyc[0]) - 1.2;
            idx.forEach((tt, j) => { const k = prog(t, tt - 0.08, tt + 0.22, ease.outCubic); if (k > 0) lf = lerp(lf, Math.log(cyc[j]), k); });
            const f = Math.exp(lf), ph = t * 2.2;
            const on = prog(t, this.cuts[8] - 0.1, this.cuts[8] + 0.6);
            if (f < 160) {
              const pts: P[] = []; const N = 2400;
              for (let k = 0; k <= N; k++) { const u = k / N; pts.push([lerp(x0, x1, u), cy - A * Math.sin((u * f + ph) * Math.PI * 2)]); }
              beam(c, pts, on, 4, GOLD, 1);
            } else {
              // too fast to resolve: the beam paints a solid band
              const band = clamp((f - 160) / 400);
              c.fillStyle = rgbaHex(GOLD, 0.16 + 0.2 * band); c.fillRect(x0, cy - A, x1 - x0, 2 * A);
              line(c, x0, cy - A, x1, cy - A, CORE, 4, 0.9); line(c, x0, cy + A, x1, cy + A, CORE, 4, 0.9);
              for (let k = 0; k < 40; k++) { const x = x0 + hash(k, Math.floor(t * 30)) * (x1 - x0); line(c, x, cy - A, x, cy + A, GOLD, 2, 0.35); }
            }
            const pd = cur < 0 ? per[0] : per[cur];
            text(c, 'RELEASE CADENCE', x0, y0 - 60, 36, ASH, 1, F.mono(600), 'left', 4);
            text(c, `PERIOD ${pd >= 1 ? pd + ' d' : pd + ' d'}`, x1, y0 - 60, 40, GOLD, 1, F.mono(700), 'right', 2);
            text(c, `${(1 / pd).toPrecision(3)} releases/day`, x1, y1 + 70, 30, BONE, 0.8, F.mono(500), 'right');
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1.5, 0.6, 15.5], look: [0, 0.3, 0], fov: 44 }, { t: t1, pos: [1.2, -0.2, 12.5], look: [0.6, -0.4, 0], fov: 44 }],
      lyric: { sx: -0.72, sy: -0.7, hide: false },
    };
  }

  // ---------------------------------------------------------------- 9: the next one's built before we think (lyric runs ahead)
  ahead(): Shot {
    return {
      at: [540, 0, 0],
      build: (g) => {
        const blocks = card(g, 3000, 1600, 15, [0, 0.5, -1]);
        return ({ t, t0, t1 }) => {
          blocks.draw((c, w, h) => {
            const r = mulberry32(21);
            for (let j = 0; j < 160; j++) {
              const x = 120 + (j % 20) * 140, y = 200 + Math.floor(j / 20) * 150;
              const tt = t0 + r() * 1.4;
              const a = prog(t, tt - 0.35, tt, ease.outBack);
              if (a <= 0) continue;
              rrect(c, x, y - (1 - a) * 80, 120, 120, 10, j % 17 === 0 ? GOLD : BONE, 2.5, j % 17 === 0 ? 1 : 0.5, 'rgba(12,13,17,0.95)');
            }
            text(c, 'COMPLETED BEFORE REQUESTED', w - 120, h - 60, 40, GOLD, 1, F.mono(600), 'right', 4);
          });
          const endK = prog(t, t1 - 0.35, t1, ease.inExpo);
          return { fade: endK * 0.9, zoom: 1 + endK * 0.25 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1, 0.4, 13], look: [0, 0.4, 0], fov: 42 }, { t: t1, pos: [0.5, 0.4, 6], look: [0.5, 0.4, -1], fov: 46, e: ease.inQuad }],
      // the karaoke runs ahead of the voice here: words light 0.55 s early
      lyric: { sx: -0.7, sy: -0.7, shift: -0.55 },
    };
  }
}
void THREE; void chip; void GRAPH;
