// VERSE 4 — "The Proofs" (2026). Clean vector plates; the mathematics shown is the real construction where we have it.
import * as THREE from 'three';
import { ShotPlate, card, type Shot } from './shots';
import type { Line } from '../engine/data';
import { F } from '../engine/type';
import { LineBatch, Pen, linCol } from '../engine/lines';
import { drawNS } from './ns-core';
import { trace, beam, line, rect, rrect, circle, dot, text, grid, arrow, partial, ragged, chip, windowFrame, measure, rgbaHex, GOLD, CORE, BONE, ASH, GRAPH, INK, RED, GREEN, type C2, type P } from './vec';
import { clamp, ease, prog, lerp, hash, pulse, mulberry32 } from '../engine/util';

// the counterexample (van den Essen's normalisation of Alpöge's map)
const Fmap = (x: number, y: number, z: number): [number, number, number] => {
  const u = 1 - (2 / 3) * x * y;
  const p = -(2 / 3) * u * u - (2 / 9) * u;
  const q = u * u - (2 / 3) * u - 2 / 9;
  return [u ** 3 * z + y * y * p, x * u * u * z + y * q, x + x * x * y + x ** 3 * z];
};

export default class Proof2 extends ShotPlate {
  section(): Line[] { return this.ctx.lyrics.section('Verse 4'); }
  shots(): Shot[] {
    return [this.ns(), this.swarm(), this.energy(), this.lean(), this.jacobian(), this.keller(), this.art(), this.rna(), this.unit(), this.fields(), this.evolve(), this.verilog()];
  }

  // ---------------------------------------------------------------- 0: Navier–Stokes — the collapsing self-similar core (r–z section + column)
  ns(): Shot {
    return {
      at: [0, 0, 0],
      build: (g) => {
        const eq = card(g, 2400, 500, 11, [0, 3.6, -2]);
        const note = card(g, 1700, 520, 4.2, [3.6, -2.3, 2.2], [0, -0.35, 0]);
        const lb = new LineBatch(70000, { depthTest: true }), pen = new Pen(lb);
        const fg = new THREE.Group(); fg.add(lb.mesh); fg.position.set(0.6, -0.4, 0); g.add(fg);
        eq.draw((c, w) => {
          text(c, '∂ₜu + (u·∇)u − νΔu + ∇p = f,    ∇·u = 0,    u(·,0) = 0', w / 2, 230, 70, BONE, 1, F.serif(true), 'center');
          text(c, 'f ∈ C_c^∞ (smooth, compactly supported force)', w / 2, 360, 40, GOLD, 1, F.mono(500), 'center');
        });
        return ({ t, lt }) => {
          const tau = Math.max(0.02, Math.pow(0.02, clamp(lt / 2.4))); // τ: 1 → 0.02 (two decades)
          lb.clear(); pen.m.identity();
          fg.rotation.set(0.22, t * 0.18, 0);
          // dynamic rescaling: the camera follows the shrinking core part of the way, so it is seen to collapse
          drawNS(pen, t, tau, { S: 1.25, zoom: Math.pow(tau, -0.32) });
          note.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 18, BONE, 2, 0.4, 'rgba(8,9,12,0.94)');
            text(c, 'SIMILARITY VARIABLES (OpenAI 2026)', 30, 60, 26, ASH, 1, F.mono(600), 'left', 3);
            text(c, 'τ = 1 − t   z = q^D η   τ = q(1 − η²)   X = r²/2q', 30, 140, 32, BONE, 1, F.mono(500));
            text(c, 'u_θ = q^−A √(2X) F   u_z = q^−A U   A = ½ + h, D = ½ − h', 30, 210, 32, BONE, 1, F.mono(500));
            text(c, 'through-flow on the axis · return flow · forced annulus', 30, 280, 26, ASH, 1, F.mono(500));
            text(c, `τ = ${tau < 0.1 ? tau.toExponential(1) : tau.toFixed(2)}   ‖u‖∞ ∝ τ^−(½+h) = ${Math.pow(tau, -0.505).toFixed(1)}`, 30, 400, 40, CORE, 1, F.mono(700));
          });
          return { bloom: 0.65 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2.0, 2.4, 11.5], look: [0.2, 0.2, 0], fov: 42 }, { t: t1, pos: [1.6, 1.0, 9.5], look: [0.6, -0.1, 0], fov: 40 }],
      lyric: { sx: -0.7, sy: -0.7 },
      dof: { aperture: 10, maxR: 6 },
    };
  }

  // ---------------------------------------------------------------- 1: ten thousand agents — a swarm, not a tree
  swarm(): Shot {
    return {
      at: [60, 0, 0],
      build: (g) => {
        const field = card(g, 2600, 1600, 12, [0, 0, -1]);
        const glow = card(g, 2600, 1600, 12, [0, 0, -0.98], [0, 0, 0], { additive: true });
        const stats = card(g, 1100, 800, 3.8, [6.2, 1.4, 1.2], [0, -0.35, 0]);
        const N = 100, cell = 13, ox = 160, oy = 150;
        field.draw((c) => { for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) rect(c, ox + a * cell + 3, oy + b * cell + 3, cell - 7, cell - 7, BONE, 0, 1, 'rgba(236,233,226,0.022)'); text(c, '10,000 AGENTS', ox, oy - 30, 32, ASH, 1, F.mono(600), 'left', 4); });
        // lemma graph nodes on the right of the field
        const nodes: P[] = Array.from({ length: 31 }, (_, k) => [1700 + (hash(k, 1) - 0.2) * 760, 260 + hash(k, 2) * 1100]);
        return ({ t, lt }) => {
          const phase = lt * 1.6;
          glow.draw((c) => {
            // wavefronts of work ripple out from a few seeds across the agent grid; refuted attempts flash red, sparsely
            const seeds: [number, number, number][] = [[20, 30, 0], [70, 18, 0.35], [55, 75, 0.6], [12, 82, 0.8]];
            for (let a = 0; a < N; a++) for (let b = 0; b < N; b++) {
              let act = 0;
              for (const [sa, sb, so] of seeds) { const d = Math.hypot(a - sa, b - sb); const front = ((phase * 0.55 + so) % 1) * 110; act = Math.max(act, Math.exp(-((d - front) * (d - front)) / 3) + 0.25 * Math.exp(-Math.max(0, front - d) / 6) * (d < front ? 1 : 0)); }
              if (act > 0.06) rect(c, ox + a * cell + 2, oy + b * cell + 2, cell - 5, cell - 5, GOLD, 0, 1, rgbaHex(act > 0.5 ? CORE : GOLD, Math.min(1, act)));
              else if (hash(a, b, Math.floor(phase * 6)) < 0.004) rect(c, ox + a * cell, oy + b * cell, cell - 3, cell - 3, RED, 0, 1, rgbaHex(RED, 0.6));
            }
            // messages from clusters to the shared lemma graph
            for (let m = 0; m < 50; m++) {
              const ph = (lt * 0.8 + hash(m, 3)) % 1;
              const a = Math.floor(hash(m, 4) * N), b = Math.floor(hash(m, 5) * N);
              const [nx, ny] = nodes[m % nodes.length];
              const sx = ox + a * cell, sy = oy + b * cell;
              dot(c, lerp(sx, nx, ph), lerp(sy, ny, ph), 4, GOLD, 0.8 * (1 - ph));
            }
            const verified = Math.floor(clamp(lt / 2) * nodes.length);
            for (let k = 1; k < nodes.length; k++) { const par = Math.floor(hash(k, 9) * k); line(c, nodes[k][0], nodes[k][1], nodes[par][0], nodes[par][1], k < verified ? GOLD : BONE, 2, k < verified ? 0.9 : 0.3); }
            nodes.forEach(([x, y], k) => circle(c, x, y, k === 0 ? 22 : 12, k < verified ? GOLD : BONE, 3, 1, 'rgba(8,9,12,1)'));
            text(c, 'SHARED LEMMA GRAPH', 1500, 200, 30, ASH, 1, F.mono(600), 'left', 3);
          });
          stats.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'swarm · status');
            const rows: [string, string][] = [['agents', '10,000'], ['attempts', String(Math.floor(lt * 41234))], ['refuted', String(Math.floor(lt * 30120))], ['lemmas ✓', String(Math.floor(clamp(lt / 2) * 31)) + ' / 31']];
            rows.forEach(([a, b], k) => { text(c, a.toUpperCase(), 40, 170 + k * 140, 28, ASH, 1, F.mono(600), 'left', 3); text(c, b, w - 40, 170 + k * 140, 56, k === 3 ? GOLD : BONE, 1, F.mono(500), 'right'); });
          });
          void t;
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-3, 1, 9], look: [-2, 0.2, -1], fov: 44 }, { t: t1, pos: [3, 0.3, 11], look: [2, 0.2, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 2: finite energy, speeds unbound
  energy(): Shot {
    return {
      at: [120, 0, 0],
      build: (g) => {
        const a = card(g, 1600, 1100, 6.4, [-3.6, 0.2, 0], [0, 0.2, 0]);
        const b = card(g, 1600, 1100, 6.4, [3.6, 0.2, 0], [0, -0.2, 0]);
        const plot = (c: C2, w: number, h: number, title: string, f: (u: number) => number, p: number, hot: boolean, cap?: string) => {
          rrect(c, 4, 4, w - 8, h - 8, 20, hot ? GOLD : BONE, 3, hot ? 1 : 0.6, 'rgba(8,9,12,0.95)');
          text(c, title, 50, 90, 46, hot ? GOLD : BONE, 1, F.serif(true));
          const X0 = 120, X1 = w - 80, Y0 = h - 120, Y1 = 170;
          line(c, X0, Y0, X1, Y0, BONE, 2, 0.7); line(c, X0, Y1, X0, Y0, BONE, 2, 0.7);
          line(c, X1 - 60, Y1, X1 - 60, Y0, BONE, 1.5, 0.5); text(c, 't = 1', X1 - 60, Y0 + 50, 28, ASH, 1, F.mono(500), 'center');
          if (cap) { line(c, X0, Y1 + 200, X1, Y1 + 200, BONE, 2, 0.5); text(c, cap, X0 + 10, Y1 + 185, 26, ASH, 1, F.mono(500)); }
          const pts: P[] = [];
          for (let s = 0; s <= 200; s++) { const u = s / 200 * 0.995; pts.push([X0 + u * (X1 - 60 - X0), Y0 - clamp(f(u)) * (Y0 - Y1)]); }
          beam(c, pts, p, 5, hot ? GOLD : BONE, hot ? 1.2 : 0);
        };
        return ({ t, line: l }) => {
          const unbT = l.words[3]?.start ?? l.start + 1;
          a.draw((c, w, h) => plot(c, w, h, '½‖u(t)‖²_L²  (energy)', (u) => 0.45 + 0.05 * Math.sin(u * 9) * (1 - u), prog(t, this.cuts[2], unbT), false, 'sup_t E(t) < ∞'));
          b.draw((c, w, h) => plot(c, w, h, '‖u(t)‖_L∞  (speed)', (u) => 0.05 * Math.pow(1 - u, -0.55) - 0.04, prog(t, unbT - 0.4, this.vEnd(2)), true));
          return { shake: [pulse(t, this.vEnd(2) - 0.3, 0.1) * 8, 0] as [number, number] };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2, 0.6, 12], look: [-1.5, 0.2, 0], fov: 42 }, { t: t1, pos: [2.5, 0.4, 10.5], look: [2.4, 0.4, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 3: Lean puts the proof on solid ground
  lean(): Shot {
    return {
      at: [180, 0, 0],
      build: (g) => {
        const ed = card(g, 2600, 1600, 12, [0, 0.3, 0]);
        const code = [
          ['kw', 'theorem'], ['id', ' navierStokes_blowup'], ['', ' (ν : ℝ) (hν : 0 < ν) :'], ['nl', ''],
          ['', '    ∃ (f u : ℝ³ → ℝ → ℝ³) (p : ℝ³ → ℝ → ℝ),'], ['nl', ''],
          ['', '      ContDiff ℝ ⊤ ↿f ∧ HasCompactSupport ↿f ∧'], ['nl', ''],
          ['', '      IsNSSolution ν f u p (Set.Ico 0 1) ∧ (∀ x, u x 0 = 0) ∧'], ['nl', ''],
          ['', '      (∃ C, ∀ t ∈ Set.Ico 0 1, ‖u · t‖_L² ≤ C) ∧'], ['nl', ''],
          ['', '      ¬ BddAbove ((fun t ↦ ‖u · t‖_∞) \'\' Set.Ico 0 1) := '], ['kw', 'by'], ['nl', ''],
          ['', '  '], ['kw', 'obtain'], ['', ' ⟨core, hcore⟩ := selfSimilarCore ν hν'], ['nl', ''],
          ['', '  '], ['kw', 'refine'], ['', ' ⟨force core, core.u, core.p, ?_, ?_, ?_, ?_, ?_, ?_⟩'], ['nl', ''],
          ['', '  '], ['kw', 'all_goals'], ['', ' first | exact hcore.smooth | exact hcore.energy | simp'], ['nl', ''],
        ] as [string, string][];
        return ({ t, lt, line: l }) => {
          const total = code.reduce((s, [, v]) => s + v.length, 0);
          const n = Math.floor(prog(lt, 0, 1.6) * total);
          const ok = prog(t, l.words[l.words.length - 2].start - 0.2, l.words[l.words.length - 2].start + 0.2, ease.outBack);
          ed.draw((c, w, h) => {
            rrect(c, 0, 0, w, h, 20, BONE, 2, 0.4, '#0d0e12');
            text(c, 'NavierStokes/Blowup.lean · illustrative statement', 50, 70, 30, ASH, 1, F.mono(500));
            let x = 60, y = 190, used = 0;
            for (const [kind, v] of code) {
              if (kind === 'nl') { x = 60; y += 72; continue; }
              const take = Math.max(0, Math.min(v.length, n - used)); used += v.length;
              if (take <= 0) continue;
              const s = v.slice(0, take);
              const col = kind === 'kw' ? GOLD : kind === 'id' ? CORE : BONE;
              text(c, s, x, y, 40, col, 1, F.mono(kind === 'kw' ? 600 : 400));
              x += measure(c, s, 40, F.mono(kind === 'kw' ? 600 : 400));
            }
            // infoview
            rrect(c, 60, h - 300, w - 120, 230, 16, ok > 0 ? GREEN : BONE, ok > 0 ? 4 : 2, ok > 0 ? 1 : 0.4, ok > 0 ? rgbaHex(GREEN, 0.08) : undefined);
            if (ok > 0) {
              text(c, '✓  No goals', 110, h - 200, 64, GREEN, ok, F.mono(700));
              text(c, 'lake build · 0 errors · 0 sorry · axioms: propext, Classical.choice, Quot.sound', 110, h - 120, 30, BONE, ok, F.mono(500));
            } else text(c, '⋯ elaborating', 110, h - 170, 44, ASH, 1, F.mono(500));
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2, 1.2, 12.5], look: [0, 0.6, 0], fov: 42 }, { t: t1, pos: [1, -0.8, 11], look: [0.6, -1, 0], fov: 40, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: 0.7 },
    };
  }

  // ---------------------------------------------------------------- 4: three dimensions — Jacobian falls (the exact map, three points, one image)
  jacobian(): Shot {
    const Ps: [number, number, number][] = [[1, -1, 0], [0, -13, 148], [-1, -5.5, -6.5]];
    return {
      at: [240, 0, 0],
      build: (g) => {
        const fml = card(g, 2600, 900, 12, [0, 3.4, -1]);
        const viz = card(g, 2200, 1500, 9, [0, -1.5, 0.6]);
        fml.draw((c, w) => {
          text(c, 'F(x, y, z) = ( u³z + y²p(u),  xu²z + y q(u),  x + x²y + x³z )', w / 2, 170, 58, BONE, 1, F.serif(true), 'center');
          text(c, 'u = 1 − ⅔xy,   p(u) = −⅔u² − ²⁄₉u,   q(u) = u² − ⅔u − ²⁄₉', w / 2, 290, 48, BONE, 0.85, F.serif(true), 'center');
          text(c, 'det J_F ≡ −1/9   (a Keller map)', w / 2, 430, 60, GOLD, 1, F.mono(600), 'center');
          text(c, 'L. Alpöge · Claude Fable 5 · July 2026   (form: van den Essen)', w / 2, 540, 32, ASH, 1, F.mono(500), 'center');
        });
        return ({ t, lt, line: l }) => {
          const fallT = l.words[l.words.length - 1].start;
          const k = prog(t, fallT - 0.5, fallT + 0.4, ease.inOutCubic);
          viz.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 20, BONE, 2, 0.4, 'rgba(8,9,12,0.95)');
            text(c, 'THREE DISTINCT POINTS', 60, 90, 32, ASH, 1, F.mono(600), 'left', 3);
            text(c, 'ONE IMAGE', w - 60, 90, 32, GOLD, 1, F.mono(600), 'right', 3);
            const T = Fmap(1, -1, 0);
            const tgt: P = [w - 420, h / 2];
            Ps.forEach((pp, i) => {
              const y = 330 + i * 330;
              const v = Fmap(pp[0], pp[1], pp[2]);
              const appear = prog(lt, 0.1 + i * 0.25, 0.4 + i * 0.25);
              text(c, `(${pp.map((q) => (Number.isInteger(q) ? String(q) : q === -5.5 ? '−11/2' : '−13/2')).join(', ').replace(/-/g, '−')})`, 80, y + 12, 52, BONE, appear, F.mono(500));
              dot(c, 560 + 200, y, 12, BONE, 0);
              const end: P = [lerp(760, tgt[0], k), lerp(y, tgt[1], k)];
              beam(c, [[760, y], [lerp(760, tgt[0], 0.5), lerp(y, tgt[1], 0.3)], tgt], k, 4, GOLD, 1);
              dot(c, end[0], end[1], 12, GOLD, 1.2 * appear);
              void v;
            });
            circle(c, tgt[0], tgt[1], 30 + 20 * pulse(t, fallT + 0.3, 0.3), GOLD, 4, k);
            text(c, `F = (−20/9, −13/9, 0)`, tgt[0] - 40, tgt[1] + 110, 46, GOLD, k, F.mono(600), 'center');
            if (k >= 1) text(c, 'not injective ⇒ not invertible', w / 2, h - 60, 46, RED, prog(t, fallT + 0.4, fallT + 0.8), F.mono(600), 'center');
            void T;
          });
          return { flash: pulse(t, fallT + 0.4, 0.2) * 0.4 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, 4, 13], look: [0, 2.6, -1], fov: 42 }, { t: t1, pos: [0.5, -0.6, 11], look: [0.2, -1.2, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7, size: 0.55 },
    };
  }

  // ---------------------------------------------------------------- 5: Fable finds cracks in Keller's walls (Keller, 1939)
  keller(): Shot {
    return {
      at: [300, 0, 0],
      build: (g) => {
        const wall = card(g, 2800, 1600, 14, [0, 0, 0]);
        const cracks = card(g, 2800, 1600, 14, [0, 0, 0.02], [0, 0, 0], { additive: true });
        wall.draw((c, w, h) => {
          for (let r = 0; r < 14; r++) for (let k = 0; k < 12; k++) { const bw = 240, bh = 115; const x = k * bw - (r % 2 ? bw / 2 : 0); rect(c, x + 4, r * bh + 4, bw - 8, bh - 8, BONE, 2, 0.35, 'rgba(18,19,24,0.95)'); }
          rrect(c, 360, 420, w - 720, 620, 10, BONE, 3, 0.8, 'rgba(10,11,14,0.96)');
          text(c, 'O.-H. KELLER · GANZE CREMONA-TRANSFORMATIONEN · 1939', w / 2, 540, 40, ASH, 1, F.mono(600), 'center', 4);
          text(c, 'det J_F = const ≠ 0', w / 2, 720, 110, BONE, 1, F.serif(true), 'center');
          text(c, '⇒  F invertible ?', w / 2, 880, 110, BONE, 1, F.serif(true), 'center');
        });
        // crack network: deterministic branching from a seed point
        const r = mulberry32(19);
        const branches: P[][] = [];
        const grow = (x: number, y: number, a: number, len: number, depth: number) => {
          const pts: P[] = [[x, y]];
          for (let s = 0; s < len; s++) { a += (r() - 0.5) * 0.9; x += Math.cos(a) * 34; y += Math.sin(a) * 34; pts.push([x, y]); if (depth < 3 && r() < 0.12) grow(x, y, a + (r() < 0.5 ? 0.9 : -0.9), Math.floor(len * 0.6), depth + 1); }
          branches.push(pts);
        };
        for (let k = 0; k < 6; k++) grow(1400, 760, (k / 6) * Math.PI * 2, 26, 0);
        return ({ t, line: l }) => {
          const cT = l.words[2].start;
          const cp = prog(t, cT - 0.2, l.end + 0.3, ease.outCubic);
          cracks.draw((c, w, h) => {
            branches.forEach((b, k) => beam(c, b, clamp(cp * 1.5 - (k % 5) * 0.08), 4, GOLD, 1.2));
            text(c, 'Claude Fable 5 · L. Alpöge · July 2026', w / 2, h - 80, 44, GOLD, cp, F.mono(600), 'center');
          });
          return { shake: [pulse(t, cT, 0.1) * 10 * (hash(t) - 0.5), 0] as [number, number] };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2, -0.5, 13], look: [0, 0, 0], fov: 42 }, { t: t1, pos: [0.8, 0.4, 9.5], look: [0.4, 0, 0], fov: 40, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 6: Claude finds ART in phage DNA — genome → locus → B-DNA
  art(): Shot {
    return {
      at: [360, 0, 0],
      build: (g) => {
        const genome = card(g, 3000, 500, 15, [0, 4.2, -3]);
        const locus = card(g, 2600, 700, 11, [0, 1.6, -1]);
        const dna = card(g, 2600, 900, 11, [0, -1.6, 0.5], [0, 0, 0], { additive: true });
        const funnel = card(g, 1000, 1100, 3.6, [6.8, 0.6, 1.6], [0, -0.35, 0]);
        genome.draw((c, w, h) => {
          line(c, 40, h / 2, w - 40, h / 2, BONE, 3, 0.7);
          for (let k = 0; k < 120; k++) { const x = 60 + k * 24.2, dir = hash(k, 1) < 0.5 ? 1 : -1; const len = 12 + hash(k, 2) * 18; trace(c, dir > 0 ? [[x, h / 2 - 20], [x + len, h / 2 - 20], [x + len + 8, h / 2 - 12], [x + len, h / 2 - 4], [x, h / 2 - 4]] : [[x + len + 8, h / 2 + 4], [x + 8, h / 2 + 4], [x, h / 2 + 12], [x + 8, h / 2 + 20], [x + len + 8, h / 2 + 20]], 1.5, BONE, 0, true); }
          text(c, 'JUMBO PHAGE GENOME', 60, 80, 34, ASH, 1, F.mono(600), 'left', 4);
          rect(c, 1700, h / 2 - 60, 260, 120, GOLD, 4, 1);
        });
        return ({ t, lt, line: l }) => {
          const artT = l.words[2].start;
          const zk = prog(t, artT - 0.3, artT + 0.4, ease.inOutCubic);
          locus.draw((c, w, h) => {
            const y = h / 2;
            line(c, 40, y, w - 40, y, BONE, 2, 0.6);
            const gene = (x: number, len: number, name: string, hot: boolean) => { trace(c, [[x, y - 60], [x + len, y - 60], [x + len + 50, y], [x + len, y + 60], [x, y + 60]], 4, hot ? GOLD : BONE, hot ? 1 : 0, true); text(c, name, x + len / 2, y + 14, 40, hot ? CORE : BONE, 1, F.mono(600), 'center'); };
            gene(120, 620, 'RT  (reverse transcriptase)', true);
            gene(860, 380, 'partner gene', false);
            // repeat array: evenly spaced repeats (diamonds) with spacers
            for (let k = 0; k < 14; k++) { const x = 1400 + k * 82; trace(c, [[x, y], [x + 18, y - 34], [x + 36, y], [x + 18, y + 34]], 3, GOLD, 1, true); line(c, x + 38, y, x + 80, y, BONE, 3, 0.8); }
            text(c, 'REPEAT ARRAY · evenly spaced', 1400, y - 80, 30, GOLD, 1, F.mono(600));
            text(c, 'ART · array-associated reverse transcriptase system', 120, 80, 40, BONE, zk, F.mono(600));
          });
          dna.draw((c, w, h) => {
            // B-DNA: 10.5 bp per turn; minor/major grooves from the strand phase offset
            const cy = h / 2, A = 230, bp = 64, turn = 10.5 * 22;
            const off = 0.38 * Math.PI * 2;
            const s1: P[] = [], s2: P[] = [];
            const shift = t * 140;
            for (let x = 0; x <= w; x += 6) { const ph = ((x + shift) / turn) * Math.PI * 2; s1.push([x, cy + Math.sin(ph) * A]); s2.push([x, cy + Math.sin(ph + off) * A]); }
            for (let k = 0; k < bp; k++) { const x = ((k * 22 - shift) % w + w) % w; const ph = ((x + shift) / turn) * Math.PI * 2; const y1 = cy + Math.sin(ph) * A, y2 = cy + Math.sin(ph + off) * A; const inArt = x > w * 0.42 && x < w * 0.66; line(c, x, y1, x, y2, inArt && zk > 0 ? GOLD : BONE, inArt ? 3 : 2, inArt ? 0.9 : 0.35); }
            trace(c, s1, 4, BONE, 0.4); trace(c, s2, 4, GOLD, 0.9);
            text(c, 'major groove', w * 0.1, cy - A - 40, 26, ASH, 1, F.mono(500)); text(c, 'minor groove', w * 0.22, cy + A + 60, 26, ASH, 1, F.mono(500));
          });
          funnel.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'search · 21 h · 210M tokens');
            const rows: [string, number][] = [['reverse transcriptases', 200000], ['candidates', 3500], ['detailed reports', 20], ['ART', 1]];
            rows.forEach(([a, n], k) => { const ww = (w - 120) * (1 - k * 0.24); const y = 160 + k * 220; rrect(c, (w - ww) / 2, y, ww, 150, 12, k === 3 ? GOLD : BONE, k === 3 ? 4 : 2, prog(lt, k * 0.3, k * 0.3 + 0.3)); text(c, n.toLocaleString('en-US'), w / 2, y + 75, 52, k === 3 ? CORE : BONE, prog(lt, k * 0.3, k * 0.3 + 0.3), F.mono(700), 'center'); text(c, a, w / 2, y + 125, 26, ASH, prog(lt, k * 0.3, k * 0.3 + 0.3), F.mono(500), 'center'); });
            text(c, '≈ 950 agents', w / 2, h - 40, 28, ASH, 1, F.mono(500), 'center');
          });
          return {};
        };
      },
      cam: (t0, t1, l) => [{ t: t0, pos: [2, 5, 13], look: [2.2, 3.8, -3], fov: 40 }, { t: l.words[2].start + 0.2, pos: [0, 1.6, 10], look: [0, 1.2, -1], fov: 44, e: ease.inOutCubic }, { t: t1, pos: [0.5, -0.5, 9.5], look: [0.4, -0.6, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 7: a new enzyme system lights the way — the array is expressed as short RNAs
  rna(): Shot {
    return {
      at: [420, 0, 0],
      build: (g) => {
        const main = card(g, 2600, 1400, 12, [0, 0, 0]);
        const glow = card(g, 2600, 1400, 12, [0, 0, 0.02], [0, 0, 0], { additive: true });
        main.draw((c, w, h) => {
          const y = 300;
          line(c, 60, y, w - 60, y, BONE, 3, 0.6);
          for (let k = 0; k < 18; k++) { const x = 200 + k * 120; trace(c, [[x, y], [x + 22, y - 40], [x + 44, y], [x + 22, y + 40]], 3, BONE, 0, true); }
          text(c, 'REPEAT ARRAY', 200, y - 70, 32, ASH, 1, F.mono(600), 'left', 3);
          // the RT: a right-hand fold (fingers, palm, thumb) in outline
          const hx = 2250, hy = 800;
          trace(c, [[hx - 180, hy + 160], [hx - 220, hy - 40], [hx - 160, hy - 220], [hx - 60, hy - 250], [hx - 40, hy - 120], [hx + 20, hy - 260], [hx + 110, hy - 230], [hx + 80, hy - 60], [hx + 200, hy - 120], [hx + 230, hy + 20], [hx + 120, hy + 160], [hx - 180, hy + 160]], 4, BONE, 0, true);
          text(c, 'RT · fingers / palm / thumb', hx, hy + 230, 30, ASH, 1, F.mono(500), 'center');
          text(c, 'distinct short RNAs from the array (early lab result)', 60, h - 60, 32, ASH, 1, F.mono(500));
        });
        return ({ t, lt, line: l }) => {
          const lightT = l.words[4]?.start ?? l.start + 1;
          const lk = prog(t, lightT - 0.2, lightT + 0.6, ease.outCubic);
          glow.draw((c, w, h) => {
            // transcripts peel off each repeat unit as short RNAs (wavy strands drifting down)
            for (let k = 0; k < 18; k++) {
              const x0 = 222 + k * 120;
              const p = clamp(lt * 0.9 - k * 0.04);
              if (p <= 0) continue;
              const pts: P[] = [];
              for (let s = 0; s <= 30; s++) { const u = s / 30; pts.push([x0 + Math.sin(u * 8 + t * 3 + k) * 26, 340 + u * 380 * p + (hash(k) - 0.5) * 30]); }
              trace(c, pts, 3, GOLD, 0.5 + lk);
            }
            if (lk > 0) {
              // the light: a path illuminated from the enzyme toward the frame edge
              const g2 = c.createLinearGradient(2250, 800, 300, 1150);
              g2.addColorStop(0, rgbaHex(GOLD, 0.55 * lk)); g2.addColorStop(1, rgbaHex(GOLD, 0));
              c.fillStyle = g2; c.beginPath(); c.moveTo(2240, 760); c.lineTo(200, 1000); c.lineTo(200, 1300); c.lineTo(2240, 860); c.fill();
              dot(c, 2250, 800, 30, GOLD, 2 * lk);
            }
          });
          return { bloom: 0.75 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-3, 1.5, 10], look: [-2, 1, 0], fov: 44 }, { t: t1, pos: [2.5, -0.5, 9], look: [2.4, -0.8, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 8: unit distances beat the grid (counts computed)
  zon: { pts: P[]; edges: [number, number][] } | null = null;
  zonotope(d = 7) {
    if (this.zon) return this.zon;
    const v: P[] = Array.from({ length: d }, (_, k) => [Math.cos((2 * Math.PI * k) / d), Math.sin((2 * Math.PI * k) / d)]);
    const pts: P[] = [];
    for (let m = 0; m < 1 << d; m++) { let x = 0, y = 0; for (let k = 0; k < d; k++) if (m & (1 << k)) { x += v[k][0]; y += v[k][1]; } pts.push([x, y]); }
    const edges: [number, number][] = [];
    for (let a = 0; a < pts.length; a++) for (let b = a + 1; b < pts.length; b++) if (Math.abs(Math.hypot(pts[a][0] - pts[b][0], pts[a][1] - pts[b][1]) - 1) < 1e-9) edges.push([a, b]);
    this.zon = { pts, edges };
    return this.zon;
  }
  unit(): Shot {
    return {
      at: [480, 0, 0],
      build: (g) => {
        const A = card(g, 1500, 1500, 6.2, [-3.6, 0, 0], [0, 0.2, 0]);
        const B = card(g, 1500, 1500, 6.2, [3.6, 0, 0], [0, -0.2, 0], { additive: false });
        const z = this.zonotope(7);
        // grid with the same number of points (8 × 16)
        const gp: P[] = []; for (let a = 0; a < 16; a++) for (let b = 0; b < 8; b++) gp.push([a, b]);
        const ge: [number, number][] = []; for (let i = 0; i < gp.length; i++) for (let j = i + 1; j < gp.length; j++) if (Math.abs(Math.hypot(gp[i][0] - gp[j][0], gp[i][1] - gp[j][1]) - 1) < 1e-9) ge.push([i, j]);
        return ({ t, lt, line: l }) => {
          const beatT = l.words[2].start;
          const p = prog(lt, 0.1, 1.2);
          A.draw((c, w, h) => {
            rrect(c, 4, 4, w - 8, h - 8, 20, BONE, 2, 0.5, 'rgba(8,9,12,0.95)');
            text(c, 'GRID · ℤ[i]', 50, 80, 40, BONE, 1, F.mono(600));
            const S = 80, ox = 130, oy = 500;
            ge.forEach(([i, j], k) => { if (k / ge.length > p) return; line(c, ox + gp[i][0] * S, oy + gp[i][1] * S, ox + gp[j][0] * S, oy + gp[j][1] * S, BONE, 2, 0.6); });
            gp.forEach(([x, y]) => circle(c, ox + x * S, oy + y * S, 6, BONE, 0, 1, BONE));
            text(c, `n = ${gp.length}   unit pairs = ${Math.round(ge.length * Math.min(1, p))}`, 50, h - 60, 40, BONE, 1, F.mono(500));
          });
          B.draw((c, w, h) => {
            const hot = t > beatT - 0.1;
            rrect(c, 4, 4, w - 8, h - 8, 20, hot ? GOLD : BONE, 3, hot ? 1 : 0.5, 'rgba(8,9,12,0.95)');
            text(c, 'ROOTS OF UNITY · ℤ[ζ₇]', 50, 80, 40, GOLD, 1, F.mono(600));
            const S = 230, cx = w / 2 - 0, cy = h / 2 + 20;
            const mx = z.pts.reduce((a, q) => a + q[0], 0) / z.pts.length, my = z.pts.reduce((a, q) => a + q[1], 0) / z.pts.length;
            z.edges.forEach(([i, j], k) => { if (k / z.edges.length > p) return; line(c, cx + (z.pts[i][0] - mx) * S, cy + (z.pts[i][1] - my) * S, cx + (z.pts[j][0] - mx) * S, cy + (z.pts[j][1] - my) * S, GOLD, 1.5, 0.7); });
            z.pts.forEach(([x, y]) => circle(c, cx + (x - mx) * S, cy + (y - my) * S, 4, CORE, 0, 1, CORE));
            text(c, `n = ${z.pts.length}   unit pairs ≥ ${Math.round(z.edges.length * Math.min(1, p))}`, 50, h - 60, 40, GOLD, 1, F.mono(600));
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2.5, 0.5, 11.5], look: [-1.5, 0, 0], fov: 42 }, { t: t1, pos: [2.5, 0.3, 10.5], look: [2, 0, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 9: number fields do what squares once did
  fields(): Shot {
    return {
      at: [540, 0, 0],
      build: (g) => {
        const m = card(g, 2600, 1500, 12, [0, -0.3, 0]);
        const tower = card(g, 1000, 1400, 4, [6.6, 0.4, 1.4], [0, -0.35, 0]);
        const z = this.zonotope(7);
        const gp: P[] = []; for (let a = 0; a < 16; a++) for (let b = 0; b < 8; b++) gp.push([a - 7.5, b - 3.5]);
        tower.draw((c, w, h) => {
          windowFrame(c, 0, 0, w, h, 'class field tower');
          ['ℚ', 'K₁', 'K₂', 'K₃', '⋮', 'M (infinite)'].forEach((s, k) => { const y = h - 130 - k * 200; text(c, s, w / 2, y, 60, k === 5 ? GOLD : BONE, 1, F.serif(true), 'center'); if (k < 5) line(c, w / 2, y - 60, w / 2, y - 140, BONE, 2, 0.6); });
          text(c, 'bounded root discriminant', w / 2, 130, 26, ASH, 1, F.mono(500), 'center');
        });
        return ({ lt }) => {
          const k = prog(lt, 0.2, 1.6, ease.inOutCubic);
          m.draw((c, w, h) => {
            const cx = w / 2 - 200, cy = h / 2, S = lerp(90, 210, k);
            const mx = z.pts.reduce((a, q) => a + q[0], 0) / z.pts.length, my = z.pts.reduce((a, q) => a + q[1], 0) / z.pts.length;
            const P2 = z.pts.map(([x, y], i) => [lerp(gp[i][0], x - mx, k), lerp(gp[i][1], y - my, k)] as P);
            z.edges.forEach(([i, j]) => line(c, cx + P2[i][0] * S, cy + P2[i][1] * S, cx + P2[j][0] * S, cy + P2[j][1] * S, k > 0.5 ? GOLD : BONE, 1.5, 0.5));
            P2.forEach(([x, y]) => circle(c, cx + x * S, cy + y * S, 5, CORE, 0, 1, CORE));
            text(c, k < 0.5 ? 'ℚ(i): the grid' : 'a CM field K: |U| ≥ n^ε magnitude-1 elements', 80, 100, 50, k < 0.5 ? BONE : GOLD, 1, F.serif(true));
            text(c, 'Theorem: ∃ ε > 0 and point sets with ≥ n^(1+ε) unit distances', 80, h - 70, 40, BONE, 0.9, F.mono(500));
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1, 0.6, 12.5], look: [-0.5, 0, 0], fov: 42 }, { t: t1, pos: [2.5, 0.2, 11], look: [2, 0.2, 0], fov: 42, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 10: AlphaEvolve rewrites the gate — the evolutionary loop
  evolve(): Shot {
    return {
      at: [600, 0, 0],
      build: (g) => {
        const d = card(g, 2600, 1500, 12, [0, 0, 0]);
        const glow = card(g, 2600, 1500, 12, [0, 0, 0.02], [0, 0, 0], { additive: true });
        const N: [number, number, string, string][] = [[300, 360, 'PROMPT SAMPLER', ''], [1300, 360, 'LLM ENSEMBLE', 'Gemini Flash · Gemini Pro'], [2200, 760, 'EVALUATORS', 'functional verification'], [1300, 1140, 'PROGRAM DATABASE', 'evolutionary selection'], [300, 1140, 'HUMAN', 'problem · evaluation fn']];
        d.draw((c) => {
          N.forEach(([x, y, a, b], k) => { rrect(c, x - 240, y - 110, 480, 220, 20, k === 1 ? GOLD : BONE, k === 1 ? 4 : 2.5, 0.85, 'rgba(10,11,14,0.95)'); text(c, a, x, y - 4, 38, k === 1 ? GOLD : BONE, 1, F.mono(700), 'center', 2); if (b) text(c, b, x, y + 50, 24, ASH, 1, F.mono(500), 'center'); });
          [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b]) => arrow(c, N[a][0] + (N[b][0] > N[a][0] ? 250 : N[b][0] < N[a][0] ? -250 : 0), N[a][1] + (N[b][1] > N[a][1] ? 115 : N[b][1] < N[a][1] ? -115 : 0), N[b][0] + (N[b][0] > N[a][0] ? -250 : N[b][0] < N[a][0] ? 250 : 0), N[b][1] + (N[b][1] > N[a][1] ? -115 : N[b][1] < N[a][1] ? 115 : 0), BONE, 3, 20, 0.7));
          arrow(c, N[4][0], N[4][1] - 115, N[0][0], N[0][1] + 115, BONE, 2, 16, 0.5);
          text(c, 'ALPHAEVOLVE', 1300, 100, 48, BONE, 1, F.mono(700), 'center', 10);
        });
        return ({ t, lt }) => {
          glow.draw((c) => {
            const loop: P[] = [[540, 360], [1060, 360], [1540, 360], [2200, 650], [2200, 870], [1540, 1140], [1060, 1140], [300, 1030], [300, 470], [540, 360]];
            for (let s = 0; s < 5; s++) { const ph = ((lt * 0.55 + s / 5) % 1); const pts = partial(loop, ph); const [x, y] = pts[pts.length - 1]; chip(c, ['diff', 'score 0.93', 'program', '+ − bits'][s % 4], x - 60, y + 10, 26, GOLD, true); }
          });
          void t;
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, 1.2, 13], look: [0, 0.4, 0], fov: 42, roll: 0.03 }, { t: t1, pos: [1.5, -0.4, 10.5], look: [1, -0.2, 0], fov: 42, roll: -0.02, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.7 },
    };
  }

  // ---------------------------------------------------------------- 11: Verilog sheds the deadweight (bit-width trim, illustrative)
  verilog(): Shot {
    return {
      at: [660, 0, 0],
      build: (g) => {
        const diff = card(g, 2600, 1500, 12, [0, 0.2, 0]);
        const rows: [string, ' ' | '-' | '+'][] = [
          ['module mxu_mac #(parameter W = 8) (', ' '],
          ['  input  wire signed [W-1:0]   a, b,', ' '],
          ['  input  wire                  clk,', ' '],
          ['  output reg  signed [2*W+7:0] acc', '-'],
          ['  output reg  signed [2*W+3:0] acc', '+'],
          [');', ' '],
          ['  wire signed [2*W+7:0] prod = a * b;', '-'],
          ['  wire signed [2*W-1:0] prod = a * b;', '+'],
          ['  reg  [3:0]  guard_unused;', '-'],
          ['  always @(posedge clk) acc <= acc + prod;', ' '],
          ['endmodule', ' '],
        ];
        return ({ t, lt, line: l }) => {
          const shedT = l.words[2].start;
          diff.draw((c, w, h) => {
            rrect(c, 0, 0, w, h, 20, BONE, 2, 0.4, '#0d0e12');
            text(c, 'mxu_mac.v · proposed by AlphaEvolve · illustrative', 50, 70, 30, ASH, 1, F.mono(500));
            let y = 190;
            let dk = 0;
            rows.forEach(([s, kind]) => {
              const tt = shedT + dk * 0.25;
              const p = kind === '-' ? prog(t, tt, tt + 0.5, ease.inCubic) : kind === '+' ? prog(t, tt + 0.3, tt + 0.6) : 1;
              if (kind === '-') dk++;
              const col = kind === '-' ? RED : kind === '+' ? GOLD : BONE;
              if (kind === '+' && p <= 0) return;
              const a = kind === '-' ? 1 - p * 0.8 : p;
              rect(c, 40, y - 52, w - 80, 72, col, 0, 1, kind === ' ' ? 'rgba(0,0,0,0)' : rgbaHex(col, 0.1 * a));
              text(c, kind, 60, y, 40, col, a, F.mono(600));
              text(c, s, 110, y + (kind === '-' ? p * p * 60 : 0), 40, col, a, F.mono(400));
              if (kind === '-' && p > 0) line(c, 110, y - 12, 110 + measure(c, s, 40, F.mono(400)) * p, y - 12, RED, 3, 0.9);
              y += 96;
            });
            const ok = prog(t, l.end - 0.2, l.end + 0.3);
            text(c, `functional verification: PASS · fewer bits · → upcoming TPU`, 60, h - 60, 40, GOLD, ok, F.mono(600));
          });
          void lt;
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-1.5, 1, 12.5], look: [0, 0.4, 0], fov: 42 }, { t: t1, pos: [0.4, 0.2, 10], look: [0.2, 0, 0], fov: 40, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: 0.7 },
    };
  }
}
void THREE; void grid; void ragged; void INK; void GRAPH; void dot;
