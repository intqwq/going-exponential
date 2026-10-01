// CHORUS ×3 — clean gold vector traces on layered planes.
// variant 0: chorus 1 (+ doubling / carbon / sand / interview), 1: reprise (log paper), 2: final (+ tumours & rockets /
// a thousand suns / the fence / root).
import * as THREE from 'three';
import { ShotPlate, card, type Shot } from './shots';
import type { Line } from '../engine/data';
import { Lyrics } from '../engine/data';
import { F } from '../engine/type';
import { trace, line, rect, rrect, circle, dot, text, grid, arrow, partial, ragged, chip, windowFrame, measure, rgbaHex, GOLD, CORE, BONE, ASH, GRAPH, INK, RED, type C2, type P } from './vec';
import { god, human } from './figures';
import { C } from './kit';
import { ExpoFlight } from './expo-flight';
import { clamp, ease, prog, lerp, hash, pulse, mulberry32, groupDigits, superscript } from '../engine/util';

export default class Chorus2 extends ShotPlate {
  carbonCloud: Float32Array | null = null;
  /** time of the carbon → sand cut (set in shots()) */
  sandCut = 0;
  variant = 0;
  section(): Line[] {
    this.variant = Number(this.ctx.params.variant ?? 0);
    return this.ctx.lyrics.section(['Chorus', 'Chorus reprise', 'Final chorus'][this.variant]);
  }

  shots(): Shot[] {
    const v = this.variant;
    const common: Shot[] = [this.shotCurve(), this.shotNonessential(), this.shotGod(), this.shotRoot()];
    if (v === 1) return common;
    if (v === 0) { this.sandCut = this.cuts[6]; return [...common, this.shotDoubling(), this.shotCarbon(), this.shotSand(), this.shotInterview()]; }
    return [...common, this.shotTumours(), this.shotSuns(), this.shotFence(), this.shotWhoKeepsRoot()];
  }

  // =========================================================== 0–1: the flight up the doubling curve, then the reveal
  flight?: ExpoFlight;
  getFlight() {
    if (!this.flight) {
      const l0 = this.lines[0], w = l0.words[l0.words.length - 1];
      this.flight = new ExpoFlight(this.variant === 1, 11 + this.variant, { t0: this.cuts[0], ws: w.start, we: Math.max(w.end, w.start + 0.9), t1: this.cuts[1], t2: this.vEnd(1) });
    }
    return this.flight;
  }
  shotCurve(): Shot {
    return {
      at: [0, 0, 0],
      build: (g) => {
        const fl = this.getFlight();
        g.add(fl.group);
        return ({ t, f }) => {
          const { n, crossing } = fl.draw(t, this.cam, f.a.kick);
          // a punch on every gate the head breaks through
          let hit = 0; for (let k = 0; k < 11; k++) { const d = n - crossing(k); if (d >= 0 && d < 0.4) hit = Math.max(hit, 1 - d / 0.4); }
          return { zoom: 1 + 0.025 * hit + 0.008 * f.a.kick, bloom: 0.8, shake: [hit * 4 * (hash(t, 3) - 0.5), hit * 4 * (hash(t, 4) - 0.5)] as [number, number] };
        };
      },
      cam: (t0, t1) => this.getFlight().camKeys(t0, t1, 0),
      lyric: { sx: -0.72, sy: -0.72, size: 0.5, follow: 1 },
      reveal: false, drift: 0, cut: 'none', dof: { aperture: 8, maxR: 6 },
    };
  }

  shotNonessential(): Shot {
    // the flight's group (shot 0) stays visible: thrown back to the whole hockey stick, then down to the human
    return {
      at: [0, 0, 0],
      build: () => ({ t }) => { const rv = clamp((t - this.cuts[1]) / 0.5); return { bloom: 0.75, zoom: 1 - 0.02 * (1 - rv) }; },
      cam: (t0, t1) => this.getFlight().camKeys(t0, t1, 1),
      lyric: { sx: -0.72, sy: 0.62, enter: 'down', size: 0.5, follow: 1 },
      reveal: false, drift: 0, cut: 'none', dof: { aperture: 6, maxR: 6 },
    };
  }

  // =========================================================== 2: a god behind an API — dolly through the stack
  shotGod(): Shot {
    return {
      at: [80, 0, 0],
      build: (g) => {
        const client = card(g, 1500, 900, 5, [-3.2, 0.2, 6], [0, 0.35, 0]);
        const gate = card(g, 2200, 1300, 10, [0, 0, 0]);
        const racks = card(g, 2400, 1300, 18, [0, 0.5, -8]);
        const godC = card(g, 2000, 2400, 20, [0, 1.2, -20]);
        const pkt = card(g, 256, 256, 1, [0, 0, 6], [0, 0, 0], { additive: true });
        pkt.draw((c, w, h) => dot(c, w / 2, h / 2, 26, GOLD, 2));
        client.draw((c, w, h) => {
          windowFrame(c, 0, 0, w, h, 'client — terminal');
          ['$ curl https://api.example.com/v1/messages \\', '    -H "x-api-key: sk-•••••••" \\', '    -d \'{"model": "god-1",', '         "prompt": "tell me the future"}\''].forEach((s, k) => text(c, s, 40, 140 + k * 56, 34, k === 0 ? GOLD : BONE, 0.95, F.mono(400)));
          text(c, '→ 200 OK · streaming', 40, h - 60, 30, ASH, 1, F.mono(500));
        });
        racks.draw((c, w, h) => {
          text(c, 'LOAD BALANCER', w / 2, 90, 34, ASH, 1, F.mono(600), 'center', 6);
          rrect(c, w / 2 - 260, 120, 520, 90, 10, BONE, 2, 0.8);
          for (let r = 0; r < 8; r++) {
            const x = 140 + r * 280;
            rect(c, x, 330, 200, 880, BONE, 2, 0.6);
            for (let u = 0; u < 18; u++) { line(c, x + 12, 360 + u * 46, x + 188, 360 + u * 46, BONE, 1, 0.25); circle(c, x + 26, 380 + u * 46, 5, GOLD, 0, 1, hash(r, u) < 0.5 ? GOLD : GRAPH); }
            trace(c, [[w / 2, 210], [w / 2, 260], [x + 100, 290], [x + 100, 330]], 2, BONE, 0);
            text(c, `GPU NODE ${r + 1}`, x + 100, 1250, 22, ASH, 1, F.mono(500), 'center');
          }
        });
        return ({ t, lt, t0, t1, line: l }) => {
          const godT = l.words[1].start;
          const p = clamp(lt / (t1 - t0));
          gate.draw((c, w, h) => {
            rrect(c, 40, 40, w - 80, h - 80, 30, BONE, 3, 0.6);
            text(c, 'API GATEWAY', 100, 140, 54, BONE, 1, F.mono(700), 'left', 8);
            const stages = ['TLS', 'AUTH  x-api-key ✓', 'RATE LIMIT  50 req/min', 'ROUTE → god-1', 'MODERATION'];
            stages.forEach((s, k) => {
              const on = p * 6 > k + 0.5;
              rrect(c, 100 + k * 400, 300, 360, 260, 18, on ? GOLD : BONE, on ? 4 : 2, on ? 1 : 0.5, on ? rgbaHex(GOLD, 0.08) : undefined);
              text(c, s.split('  ')[0], 130 + k * 400, 380, 34, on ? GOLD : BONE, 1, F.mono(600));
              if (s.includes('  ')) text(c, s.split('  ')[1], 130 + k * 400, 440, 26, ASH, 1, F.mono(400));
              if (k < 4) arrow(c, 460 + k * 400, 430, 500 + k * 400, 430, on ? GOLD : BONE, 3, 14, on ? 1 : 0.5);
            });
            text(c, 'POST /v1/messages', 100, 760, 40, GOLD, 1, F.mono(500));
            text(c, '{ "model": "god-1", "max_tokens": ∞ }', 100, 830, 32, BONE, 0.8, F.mono(400));
          });
          godC.draw((c, w, h) => god(c, w / 2, h - 60, h * 0.78, { open: prog(t, godT - 0.3, godT + 0.5, ease.outCubic), glow: 1.2, aura: 0.6 + 0.6 * prog(t, godT - 0.3, godT + 0.6), t }));
          // the request packet travels client → gate → racks → god
          const z = lerp(6, -19, ease.inOutCubic(clamp(p * 1.15)));
          pkt.mesh.position.set(lerp(-3.2, 0, clamp(p * 3)), lerp(0.2, 1.4, clamp(p)), z);
          return { bloom: 0.7 };
        };
      },
      cam: (t0, t1, l) => [
        { t: t0, pos: [-5.5, 1.2, 13], look: [-2, 0.3, 4], fov: 40 },
        { t: l.words[1].start, pos: [-1.2, 0.8, 8.5], look: [0, 0.6, -2], fov: 42, e: ease.inOutQuad },
        { t: t1, pos: [0, 2.4, 3.5], look: [0, 3.5, -20], fov: 46, e: ease.inOutCubic },
      ],
      lyric: { sx: -0.7, sy: -0.62, font: F.serif(true), size: 0.75, enter: 'up' },
      dof: { aperture: 30, maxR: 12 },
    };
  }

  shotRoot(): Shot {
    return {
      at: [80, 0, 0],
      build: (g) => {
        const sudo = card(g, 1600, 700, 5.6, [1.5, 1.6, 0.6], [0, -0.25, 0]);
        return ({ t, line: l }) => {
          const rootT = l.words[3].start, whyT = l.words[6].start;
          sudo.mesh.visible = t > l.words[0].start - 0.2;
          sudo.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'host-0 — root@prod');
            const rows: [string, number, string][] = [['god-1: requesting elevated privileges', l.words[1].start, BONE], ['[sudo] grant root to god-1? (y/N)', rootT, GOLD], ['> why?', whyT, CORE]];
            rows.forEach(([s, tt, col], k) => {
              const n = Math.floor(clamp((t - tt + 0.05) / 0.4) * s.length);
              if (n > 0) text(c, s.slice(0, n), 50, 160 + k * 90, 46, col, 1, F.mono(k === 1 ? 600 : 400));
            });
            if (Math.floor(t * 2.2) % 2 === 0) rect(c, 50, 160 + 3 * 90 - 40, 26, 50, GOLD, 0, 1, GOLD);
          });
          const s = pulse(t, rootT, 0.1) * 14;
          return { shake: [s * (hash(t, 5) - 0.5), s * (hash(t, 6) - 0.5)] as [number, number], flash: pulse(t, rootT, 0.12) * 0.4 };
        };
      },
      cam: (t0, t1) => [
        { t: t0, pos: [0, 2.4, 3.5], look: [0, 3.5, -20], fov: 46 },
        { t: t1, pos: [-1.2, 1.4, 6.2], look: [0.8, 1.8, -6], fov: 44, e: ease.inOutCubic },
      ],
      lyric: { sx: -0.7, sy: -0.66, enter: 'depth' },
    };
  }

  // =========================================================== chorus 1: 4 — double the FLOPs, double the runs (unique ragged graphs)
  shotDoubling(): Shot {
    return {
      at: [160, 0, 0],
      build: (g) => {
        const cards = Array.from({ length: 32 }, (_, k) => {
          const cd = card(g, 640, 400, 2.4, [0, 0, 0]);
          const kind = k % 4;
          const ser = ragged(140, 100 + k, (u) => (kind === 0 ? Math.exp(-3 * u) + 0.1 : kind === 1 ? Math.exp(3 * u) : kind === 2 ? 1 - Math.exp(-4 * u) : 0.3 + u * u), 0.12 + (k % 5) * 0.02, 0.25);
          cd.draw((c, w, h) => {
            rect(c, 2, 2, w - 4, h - 4, BONE, 2, 0.45, 'rgba(10,11,14,0.92)');
            grid(c, w, h, 40, 0.05);
            const mx = Math.max(...ser), mn = Math.min(...ser);
            const pts: P[] = ser.map((v2, i) => [30 + (i / (ser.length - 1)) * (w - 60), h - 40 - ((v2 - mn) / (mx - mn + 1e-6)) * (h - 100)]);
            trace(c, pts, 3, kind === 0 ? BONE : GOLD, kind === 0 ? 0 : 0.8);
            text(c, ['loss', 'compute', 'eval', 'tokens'][kind] + ` · run ${k + 1}`, 24, 36, 22, ASH, 1, F.mono(500));
          });
          return cd;
        });
        return ({ t, line: l }) => {
          const ki = Math.min(5, Math.max(0, Lyrics.wordIndex(l, t)));
          const n = Math.pow(2, ki);
          const wt = l.words[ki]?.start ?? l.start;
          const e = ease.outExpo(clamp((t - wt) / 0.35));
          const cols = Math.ceil(Math.sqrt(n * 1.6)), rows = Math.ceil(n / cols);
          cards.forEach((cd, j) => {
            if (j >= n) { cd.mesh.visible = false; return; }
            cd.mesh.visible = true;
            const cx = (j % cols) - (cols - 1) / 2, cy = Math.floor(j / cols) - (rows - 1) / 2;
            const tx = cx * 2.6, ty = -cy * 1.7;
            const parent = j >> 1;
            const pcols = Math.ceil(Math.sqrt((n / 2) * 1.6)), prows = Math.ceil((n / 2) / pcols);
            const px = ((parent % pcols) - (pcols - 1) / 2) * 2.6, py = -(Math.floor(parent / pcols) - (prows - 1) / 2) * 1.7;
            const a = j < n / 2 || n === 1 ? 1 : e;
            cd.mesh.position.set(lerp(px, tx, j === 0 && n === 1 ? 1 : e), lerp(py, ty, j === 0 && n === 1 ? 1 : e), (1 - a) * 2);
            cd.mesh.rotation.y = (1 - a) * 0.8;
            cd.opacity = a;
          });
          return { flash: pulse(t, wt, 0.06) * 0.3, zoom: 1 + 0.03 * pulse(t, wt, 0.15) };
        };
      },
      cam: (t0, t1, l) => {
        const ks = l.words.slice(0, 6).map((w, k) => ({ t: w.start + 0.2, pos: [0.3 * (k % 2 ? 1 : -1), 0.2, 4 + Math.sqrt(Math.pow(2, k)) * 2.6] as [number, number, number], look: [0, 0, 0] as [number, number, number], fov: 40, roll: (k % 2 ? 1 : -1) * 0.04, e: ease.outExpo }));
        return [{ t: t0, pos: [0, 0, 4], look: [0, 0, 0], fov: 40 }, ...ks, { t: t1, pos: [0, 0, ks[ks.length - 1].pos[2] + 1.5], look: [0, 0, 0], fov: 40 }];
      },
      lyric: { sx: -0.7, sy: -0.66, D: 5.5 },
    };
  }

  // =========================================================== chorus 1: 5 — carbon (point-cloud orbitals), and what it made
  shotCarbon(): Shot {
    return {
      at: [240, 0, 0],
      build: (g) => {
        // hydrogen-like orbitals sampled by rejection: 1s², 2s², 2p_x, 2p_y (carbon ground state 1s² 2s² 2p²)
        const r = mulberry32(6);
        const N = 26000;
        const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
        const Z = 6;
        const sample = (kind: number): [number, number, number] => {
          for (;;) {
            const x = (r() - 0.5) * 2 * (kind === 0 ? 0.9 : 3.4), y = (r() - 0.5) * 2 * (kind === 0 ? 0.9 : 3.4), z = (r() - 0.5) * 2 * (kind === 0 ? 0.9 : 3.4);
            const rr = Math.hypot(x, y, z);
            let p = 0;
            if (kind === 0) p = Math.exp(-2 * Z * rr / 1.2);
            else if (kind === 1) { const q = (2 - rr * 1.6) * Math.exp(-rr * 0.8); p = q * q * 0.25; }
            else if (kind === 2) { const q = x * Math.exp(-rr * 0.8); p = q * q * 0.9; }
            else { const q = y * Math.exp(-rr * 0.8); p = q * q * 0.9; }
            if (r() < p) return [x, y, z];
          }
        };
        const kinds = [0, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3];
        for (let i = 0; i < N; i++) {
          const k = kinds[i % kinds.length];
          const [x, y, z] = sample(k);
          pos.set([x, y, z], i * 3);
          const c3 = k === 0 ? C('sun', 2.5) : k === 1 ? C('bone', 0.3) : C('gold', 2.0);
          col.set([c3.r, c3.g, c3.b], i * 3);
        }
        this.carbonCloud = pos;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const cloud = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.016, vertexColors: true, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        g.add(cloud);
        // nucleus: 6 protons + 6 neutrons, drawn as small rings
        const nuc = new THREE.Group();
        for (let k = 0; k < 12; k++) {
          const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 10), new THREE.MeshBasicMaterial({ color: k % 2 ? C('bone', 1.4) : C('gold', 3), toneMapped: false }));
          const a = k * 2.4, b2 = Math.acos(1 - 2 * ((k + 0.5) / 12));
          m.position.set(Math.cos(a) * Math.sin(b2) * 0.11, Math.cos(b2) * 0.11, Math.sin(a) * Math.sin(b2) * 0.11);
          nuc.add(m);
        }
        g.add(nuc);
        const lab = card(g, 1400, 500, 4, [-5.2, 2.2, 0], [0, 0.3, 0]);
        lab.draw((c) => {
          text(c, 'C', 20, 300, 300, BONE, 1, F.display(700));
          text(c, '6', 230, 120, 70, GOLD, 1, F.mono(600));
          text(c, '1s² 2s² 2p²', 420, 220, 70, GOLD, 1, F.mono(500));
          text(c, '|ψ|² sampled · 1s  2s  2pₓ  2pᵧ', 420, 300, 40, ASH, 1, F.mono(400));
          text(c, '12.011 u', 420, 380, 40, ASH, 1, F.mono(400));
        });
        // what carbon made: line-icon cards orbiting outward
        const items = ['fire', 'the wheel', 'writing', 'the press', 'steam', 'the transistor', 'the internet', 'the GPU', 'a god'];
        const cards = items.map((s, k) => {
          const cd = card(g, 700, 220, 2.4, [0, 0, 0], [0, 0, 0], { onTop: false });
          cd.draw((c, w, h) => { rrect(c, 4, 4, w - 8, h - 8, 30, k === items.length - 1 ? GOLD : BONE, 3, k === items.length - 1 ? 1 : 0.6, 'rgba(10,11,14,0.85)'); text(c, s, w / 2, h / 2 + 22, k === items.length - 1 ? 74 : 62, k === items.length - 1 ? GOLD : BONE, 1, k === items.length - 1 ? F.serif(true) : F.mono(500), 'center'); });
          return cd;
        });
        return ({ t, lt, line: l, t0, t1 }) => {
          cloud.rotation.y = t * 0.4; cloud.rotation.x = 0.4 + Math.sin(t * 0.3) * 0.2;
          nuc.rotation.y = t * 1.5;
          // after the cut the cloud lives on as the sand (shotSand starts from these very points)
          cloud.visible = t < t1; nuc.visible = t < t1 + 0.5; lab.mesh.visible = t < t1;
          const span = Math.max(0.5, l.words[l.words.length - 1].start - t0);
          cards.forEach((cd, k) => {
            const tk = t0 + 0.2 + (k / items.length) * span;
            const p = prog(t, tk, tk + 0.5, ease.outBack);
            cd.mesh.visible = p > 0;
            const a = k * 0.78 + t * 0.15;
            const rr = 4 + k * 0.35;
            cd.mesh.position.set(Math.cos(a) * rr * p, Math.sin(a * 1.3) * 1.6 * p + (k - 4) * 0.2, Math.sin(a) * rr * 0.5 * p);
            cd.mesh.rotation.set(0, -Math.cos(a) * 0.5, 0);
          });
          cards.forEach((cd) => { if (t >= t1) cd.mesh.visible = false; });
          void lt;
          return { bloom: 0.8 };
        };
      },
      cam: (t0, t1) => [
        { t: t0, pos: [0, 0.6, 5.5], look: [0, 0, 0], fov: 44 },
        { t: t1, pos: [5.5, 2.4, 9.5], look: [0, 0, 0], fov: 46, e: ease.inOutCubic },
      ],
      lyric: { sx: -0.7, sy: -0.66 },
    };
  }

  // =========================================================== chorus 1: 6 — sand gets a job
  shotSand(): Shot {
    return {
      at: [240, 0, 0], // same place as the carbon atom: its electron cloud becomes the sand
      build: (g) => {
        const cl = this.carbonCloud!;
        const N0 = cl.length / 3, N = N0 * 2;
        const pos = new Float32Array(N * 3), col = new Float32Array(N * 3);
        const start = new Float32Array(N * 3), dune = new Float32Array(N * 3), dest = new Float32Array(N * 3), del = new Float32Array(N);
        const r = mulberry32(9);
        // the cloud's orientation at the cut (it was spinning: rotation.y = t·0.4, rotation.x = 0.4 + 0.2·sin 0.3t)
        const cut = this.sandCut;
        const eul = new THREE.Euler(0.4 + Math.sin(cut * 0.3) * 0.2, cut * 0.4, 0);
        const v = new THREE.Vector3();
        for (let i = 0; i < N; i++) {
          const j = i % N0;
          v.set(cl[j * 3], cl[j * 3 + 1], cl[j * 3 + 2]).applyEuler(eul);
          if (i >= N0) v.multiplyScalar(1.15).add(new THREE.Vector3((r() - 0.5) * 0.3, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3));
          start.set([v.x, v.y, v.z], i * 3);
          // where each grain settles: a dune below, keeping its x/z neighbourhood
          const x = v.x * 2.4 + (r() - 0.5) * 2, z = v.z * 1.4 + (r() - 0.5) * 1.2;
          dune.set([x, -3.2 + Math.exp(-x * x * 0.03) * 1.2 * r() + r() * 0.15, z], i * 3);
          // the die: blocks + bond pads + traces (a chip floor plan)
          let dx: number, dy: number;
          const q = r();
          if (q < 0.7) { const bx = Math.floor(r() * 6), by = Math.floor(r() * 6); dx = -2.4 + bx * 0.8 + 0.08 + r() * 0.64; dy = -2.4 + by * 0.8 + 0.08 + r() * 0.64; }
          else if (q < 0.85) { const s2 = Math.floor(r() * 4), u = r() * 4.8 - 2.4; dx = s2 < 2 ? u : (s2 === 2 ? -2.6 : 2.6); dy = s2 < 2 ? (s2 === 0 ? -2.6 : 2.6) : u; }
          else { const k = Math.floor(r() * 24); const u = (k % 12) / 11 * 4.4 - 2.2; dx = k < 12 ? u : (r() < 0.5 ? -2.95 : 2.95); dy = k < 12 ? (r() < 0.5 ? -2.95 : 2.95) : u; }
          dest.set([dx, dy + 0.6, (r() - 0.5) * 0.04], i * 3);
          del[i] = r();
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
        const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.022, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }));
        pts.frustumCulled = false;
        g.add(pts);
        const die = card(g, 1600, 1600, 6.4, [0, 0.6, -0.05], [0, 0, 0], { additive: true });
        die.draw((c, w, h) => {
          rect(c, 60, 60, w - 120, h - 120, GOLD, 4, 0.9);
          for (let k = 0; k < 12; k++) { rect(c, 140 + k * 113, 20, 50, 60, BONE, 2, 0.8); rect(c, 140 + k * 113, h - 80, 50, 60, BONE, 2, 0.8); rect(c, 20, 140 + k * 113, 60, 50, BONE, 2, 0.8); rect(c, w - 80, 140 + k * 113, 60, 50, BONE, 2, 0.8); }
          text(c, 'SiO₂ → Si → DIE', 140, h - 120, 40, ASH, 1, F.mono(500));
        });
        const cGold = C('gold', 2.0), cSand = C('bone', 0.75), cDie = C('gold', 1.4);
        return ({ t, t0, line: l }) => {
          pts.visible = t >= t0 - 0.02;
          const jobT = l.words[4]?.start ?? l.start + 1;
          const fallEnd = t0 + 0.9; // phase 1: the cloud rains down into a dune
          for (let i = 0; i < N; i++) {
            const i3 = i * 3;
            const pf = clamp((t - t0 - del[i] * 0.25) / 0.65);
            const fall = pf * pf; // gravity: accelerating
            let x = lerp(start[i3], dune[i3], ease.outCubic(pf)), y = lerp(start[i3 + 1], dune[i3 + 1], fall), z = lerp(start[i3 + 2], dune[i3 + 2], ease.outCubic(pf));
            // phase 2: a rising vortex lifts the grains into the die
            const p = ease.inOutCubic(clamp((t - fallEnd - del[i] * 0.9) / 1.3));
            if (p > 0) {
              const sw = Math.sin(p * Math.PI), ang = p * 6 + del[i] * 6.28;
              x = lerp(x, dest[i3], p) + Math.cos(ang) * sw * 2.2;
              y = lerp(y, dest[i3 + 1], p) + sw * 1.2;
              z = lerp(z, dest[i3 + 2], p) + Math.sin(ang) * sw * 2.2;
            }
            pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;
            // orbital gold → sand → die gold
            const cA = pf < 1 ? cGold.clone().lerp(cSand, pf) : p > 0 ? cSand.clone().lerp(cDie, p) : cSand;
            col[i3] = cA.r; col[i3 + 1] = cA.g; col[i3 + 2] = cA.b;
          }
          (geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
          (geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
          die.opacity = prog(t, jobT - 0.2, jobT + 0.4);
          return { flash: pulse(t, jobT, 0.1) * 0.3 };
        };
      },
      cam: (t0, t1) => [
        { t: t0, pos: [5.5, 2.4, 9.5], look: [0, 0, 0], fov: 46 },
        { t: t0 + 0.9, pos: [1.5, -1.2, 10.5], look: [0, -1.8, 0], fov: 44 },
        { t: t1, pos: [0.5, 0.8, 7.2], look: [0, 0.6, 0], fov: 42, roll: -0.02 },
      ],
      lyric: { sx: -0.7, sy: -0.68 },
      reveal: false,
    };
  }

  // =========================================================== chorus 1: 7 — the interview console + the automatic email
  shotInterview(): Shot {
    return {
      at: [400, 0, 0],
      build: (g) => {
        const video = card(g, 1400, 900, 5.2, [-4.4, 1.0, 0], [0, 0.22, 0]);
        const trans = card(g, 1300, 1300, 4.4, [0.9, 0.9, -0.6]);
        const radar = card(g, 1000, 1000, 3.1, [4.6, 2.0, 0.2], [0, -0.25, 0]);
        const wave = card(g, 1800, 500, 6, [3.2, -1.4, 0.8], [0, -0.2, 0]);
        const decide = card(g, 1100, 700, 3.4, [-4.2, -2.2, 1.0], [0, 0.25, 0]);
        const mail = card(g, 1600, 1000, 5.0, [0.4, 0.5, 3.4]);
        const qs: [string, number][] = [['What can you do that I can’t?', 72.6], ['Describe a time you were wrong.', 75.4], ['Where do you see yourself in 5 years?', 78.1]];
        return ({ t, t0, line: l }) => {
          video.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'candidate_8100000000 · live');
            human(c, w / 2, h - 100, 520, BONE, 5, Math.max(0, Math.sin(t * 2)) * 0.3);
            // face-tracking boxes and gaze heatmap
            rect(c, w / 2 - 70, h - 690, 140, 160, GOLD, 3, 0.9);
            text(c, 'gaze: off-camera 41%', w / 2 + 90, h - 650, 24, GOLD, 1, F.mono(500));
            text(c, 'micro-expression: ?', w / 2 + 90, h - 610, 24, ASH, 1, F.mono(500));
            for (let k = 0; k < 40; k++) dot(c, w / 2 + (hash(k, 1) - 0.5) * 120, h - 610 + (hash(k, 2) - 0.5) * 120, 3, GOLD, 0.5);
            text(c, 'REC ●', w - 160, 100, 26, RED, Math.floor(t * 2) % 2 ? 1 : 0.3, F.mono(600));
            // a scan beam sweeps the candidate, top to bottom, over and over
            const sy = 90 + ((t * 0.7) % 1) * (h - 130);
            c.fillStyle = rgbaHex(GOLD, 0.06); c.fillRect(20, sy - 90, w - 40, 90);
            line(c, 20, sy, w - 20, sy, CORE, 3, 0.9);
          });
          trans.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'transcript · auto-scored');
            let y = 120;
            const fields: [string, string][] = [['species', 'human'], ['substrate', 'carbon'], ['clock', '~100 Hz'], ['context window', '7 ± 2 items'], ['uptime', '16 h / day'], ['training', '20 yrs, mostly unsupervised'], ['parallel copies', '1'], ['references', 'mom']];
            fields.forEach(([a, b], k) => { const p = prog(t, t0 + 0.15 + k * 0.18, t0 + 0.4 + k * 0.18); text(c, a.toUpperCase(), 40, y, 22, ASH, p, F.mono(500), 'left', 2); text(c, b, 480, y, 30, BONE, p, F.mono(400)); y += 58; });
            let qi = -1; qs.forEach(([, tt], k) => { if (t >= tt) qi = k; });
            if (qi >= 0) {
              const [q, tt] = qs[qi];
              const n = Math.floor(clamp((t - tt) / 1.0) * q.length);
              text(c, `Q${qi + 1}. ${q.slice(0, n)}`, 40, 700, 34, GOLD, 1, F.mono(600));
              text(c, 'A.', 40, 780, 34, ASH, 1, F.mono(500));
              if (Math.floor(t * 2.2) % 2 === 0) rect(c, 100, 748, 18, 40, GOLD, 0, 1, GOLD);
              text(c, '(no response detected)', 40, 860, 26, ASH, prog(t, tt + 1.5, tt + 2), F.mono(400));
            }
          });
          radar.draw((c, w, h) => {
            const cx = w / 2, cy = h / 2 + 30, R = 340;
            const axes = ['reasoning', 'speed', 'memory', 'recall', 'stamina', 'cost'];
            for (let ring = 1; ring <= 4; ring++) trace(c, axes.map((_, k) => [cx + Math.cos(k * 1.047 - 1.57) * R * ring / 4, cy + Math.sin(k * 1.047 - 1.57) * R * ring / 4] as P), 1.5, BONE, 0, true);
            axes.forEach((a, k) => { line(c, cx, cy, cx + Math.cos(k * 1.047 - 1.57) * R, cy + Math.sin(k * 1.047 - 1.57) * R, BONE, 1, 0.3); text(c, a, cx + Math.cos(k * 1.047 - 1.57) * (R + 50), cy + Math.sin(k * 1.047 - 1.57) * (R + 50) + 8, 24, ASH, 1, F.mono(500), 'center'); });
            // radar sweep with afterglow
            const sw = t * 2.4;
            for (let q = 0; q < 28; q++) { const a = sw - q * 0.035; line(c, cx, cy, cx + Math.cos(a) * R, cy + Math.sin(a) * R, GOLD, 3, 0.5 * (1 - q / 28)); }
            line(c, cx, cy, cx + Math.cos(sw) * R, cy + Math.sin(sw) * R, CORE, 3, 1);
            const vals = [0.62, 0.08, 0.15, 0.3, 0.2, 0.05];
            const p = prog(t, t0 + 0.4, t0 + 1.4, ease.outCubic);
            trace(c, vals.map((v2, k) => [cx + Math.cos(k * 1.047 - 1.57) * R * v2 * p, cy + Math.sin(k * 1.047 - 1.57) * R * v2 * p] as P), 4, GOLD, 1, true);
            text(c, 'FIT', 40, 70, 30, ASH, 1, F.mono(600), 'left', 4);
            text(c, (0.41 - clamp((t - 74) / 6) * 0.3).toFixed(2), 40, 130, 60, RED, 1, F.mono(500));
          });
          wave.draw((c, w, h) => {
            text(c, 'VOICE STRESS · KEYSTROKE DYNAMICS', 20, 40, 22, ASH, 1, F.mono(500), 'left', 2);
            const pts: P[] = [];
            for (let x = 0; x < w; x += 4) { const u = x / w; pts.push([x, h / 2 + 30 + Math.sin(u * 40 + t * 9) * 60 * Math.sin(u * 3 + t) * (0.6 + 0.4 * Math.sin(t * 3 + u * 10))]); }
            trace(c, pts, 2.5, GOLD, 0.8);
          });
          decide.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'decision engine');
            const p = prog(t, 79.6, 80.2);
            text(c, 'STATUS', 40, 150, 26, ASH, 1, F.mono(600), 'left', 3);
            text(c, p > 0.5 ? 'NOT PROCEEDING' : 'UNDER REVIEW', 40, 230, 56, p > 0.5 ? RED : GOLD, 1, F.mono(600));
            text(c, 'reason: insufficient tokens/sec', 40, 320, 28, BONE, p, F.mono(400));
            text(c, 'action: send template #3', 40, 380, 28, BONE, p, F.mono(400));
          });
          // the auto-sent email slides in front at the end
          const em = prog(t, 80.2, 80.9, ease.outExpo);
          mail.mesh.visible = em > 0;
          mail.mesh.position.y = lerp(-6, 0.4, em);
          mail.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'Inbox');
            text(c, 'From:  Talent Systems <no-reply@talent.ai>', 50, 130, 30, ASH, 1, F.mono(500));
            text(c, 'To:    candidate_8100000000', 50, 180, 30, ASH, 1, F.mono(500));
            text(c, 'Subject: Your application', 50, 230, 30, BONE, 1, F.mono(600));
            line(c, 50, 260, w - 50, 260, BONE, 2, 0.3);
            const ty = prog(t, 80.5, 81.6);
            const msg = 'Thank you.|We’ll be in touch.';
            const n = Math.floor(ty * msg.length);
            const [m1, m2 = ''] = msg.slice(0, n).split('|');
            text(c, m1, 50, 400, 84, BONE, 1, F.serif(true));
            text(c, m2, 50, 500, 84, GOLD, 1, F.serif(true));
            text(c, '— sent automatically 0.3 s after your interview · do not reply', 50, h - 70, 26, ASH, 1, F.mono(500));
          });
          void l;
          return {};
        };
      },
      cam: (t0, t1) => [
        { t: t0, pos: [-2, 0.6, 11], look: [0, 0.4, 0], fov: 46 },
        { t: 74.5, pos: [2.5, 1.0, 9], look: [1, 0.6, 0], fov: 42, e: ease.inOutQuad },
        { t: 78, pos: [-1.5, 0.2, 8.5], look: [-0.5, 0.4, 0], fov: 40, e: ease.inOutQuad },
        { t: t1, pos: [0, 0.4, 9.6], look: [0, 0.4, 3], fov: 38, e: ease.inOutCubic },
      ],
      lyric: { sx: -0.7, sy: -0.7, exitAt: 73.2 },
      dof: { aperture: 28, maxR: 10 },
    };
  }

  // =========================================================== final: 4 — tumours yield, rockets rise
  shotTumours(): Shot {
    return {
      at: [160, 0, 0],
      build: (g) => {
        const cells = card(g, 1600, 1600, 7, [-3.6, 0.4, -0.5], [0, 0.2, 0]);
        const sky = card(g, 1400, 2000, 7.5, [3.8, 1.2, -1.5], [0, -0.2, 0]);
        return ({ t, line: l }) => {
          const yieldT = l.words[2].start, riseT = l.words[5]?.start ?? l.end - 0.5;
          const y = prog(t, yieldT - 0.3, yieldT + 1.2, ease.inOutCubic);
          cells.draw((c, w, h) => {
            text(c, 'TUMOUR · T-CELL RESPONSE', 40, 60, 28, ASH, 1, F.mono(600), 'left', 3);
            for (let k = 0; k < 46; k++) {
              const a = hash(k, 1) * 6.28, rr = Math.sqrt(hash(k, 2)) * 520 * (1 - y * 0.6);
              const x = w / 2 + Math.cos(a) * rr, yy = h / 2 + Math.sin(a) * rr;
              const alive = hash(k, 3) > y;
              const R = (40 + hash(k, 4) * 35) * (alive ? 1 : 1 - y);
              const pts: P[] = [];
              for (let s = 0; s <= 24; s++) { const an = (s / 24) * 6.28; const wob = 1 + 0.18 * Math.sin(an * 3 + k) + 0.1 * Math.sin(an * 5 + k * 2); pts.push([x + Math.cos(an) * R * wob, yy + Math.sin(an) * R * wob]); }
              trace(c, pts, alive ? 3 : 1.5, alive ? BONE : GRAPH, 0, true);
              if (alive) circle(c, x + 6, yy - 4, R * 0.45, GOLD, 2, 0.8);
            }
            for (let k = 0; k < 9; k++) { const a = k * 0.7 + t * 0.6, rr = 420 + Math.sin(t + k) * 60; circle(c, w / 2 + Math.cos(a) * rr * (1 - y * 0.5), h / 2 + Math.sin(a) * rr * (1 - y * 0.5), 24, GOLD, 4, 1); }
          });
          sky.draw((c, w, h) => {
            line(c, 0, h - 80, w, h - 80, BONE, 2, 0.6);
            for (let k = 0; k < 4; k++) {
              const p = prog(t, riseT - 0.6 + k * 0.15, riseT + 1.6 + k * 0.15, ease.inQuad);
              const x0 = 260 + k * 300;
              const pts: P[] = [];
              for (let s = 0; s <= 40; s++) { const u = (s / 40) * p; pts.push([x0 + u * u * 260, h - 80 - u * (h - 200)]); }
              trace(c, pts, 4, GOLD, 1);
              const [hx, hy] = pts[pts.length - 1];
              trace(c, [[hx - 14, hy + 40], [hx, hy - 30], [hx + 14, hy + 40], [hx - 14, hy + 40]], 3, BONE, 0, true);
              dot(c, hx, hy + 50, 10, GOLD, 1.5);
            }
          });
          return {};
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [-2.5, 0.5, 10], look: [-1, 0.5, 0], fov: 44 }, { t: t1, pos: [2.5, 2.2, 9], look: [1.5, 1.4, 0], fov: 42, e: ease.inOutCubic }],
      lyric: { sx: -0.7, sy: -0.68 },
    };
  }

  // =========================================================== final: 5 — a thousand suns in silicon eyes
  shotSuns(): Shot {
    return {
      at: [240, 0, 0],
      build: (g) => {
        const eye = card(g, 2400, 1400, 14, [0, 0, 0]);
        const suns = card(g, 2400, 1400, 14, [0, 0, 0.5], [0, 0, 0], { additive: true });
        return ({ t, lt, line: l }) => {
          const open = prog(lt, 0, 0.9, ease.outCubic);
          const sunsT = l.words[2].start;
          eye.draw((c, w, h) => {
            const cx = w / 2, cy = h / 2;
            // lids
            const lid = (s: number) => { const pts: P[] = []; for (let k = 0; k <= 60; k++) { const u = k / 60; pts.push([lerp(150, w - 150, u), cy + s * Math.sin(u * Math.PI) * 460 * open]); } return pts; };
            trace(c, lid(-1), 4, BONE, 0); trace(c, lid(1), 4, BONE, 0);
            c.save(); c.beginPath(); lid(-1).forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y))); lid(1).reverse().forEach(([x, y]) => c.lineTo(x, y)); c.clip();
            // the iris is a wafer: circle + die grid
            const R = 400;
            circle(c, cx, cy, R, GOLD, 4, 1);
            for (let a = -R; a <= R; a += 50) { const s = Math.sqrt(Math.max(0, R * R - a * a)); line(c, cx + a, cy - s, cx + a, cy + s, BONE, 1, 0.25); line(c, cx - s, cy + a, cx + s, cy + a, BONE, 1, 0.25); }
            circle(c, cx, cy, 130, BONE, 3, 1, INK);
            for (let k = 0; k < 120; k++) { const a = (k / 120) * 6.28; line(c, cx + Math.cos(a) * 140, cy + Math.sin(a) * 140, cx + Math.cos(a) * (R - 10), cy + Math.sin(a) * (R - 10), GOLD, 1, 0.12); }
            c.restore();
          });
          suns.draw((c, w, h) => {
            const n = Math.floor(1000 * prog(t, sunsT - 0.2, sunsT + 1.0, ease.inCubic));
            for (let k = 0; k < n; k++) { const a = hash(k, 1) * 6.28, rr = Math.sqrt(hash(k, 2)) * 390; dot(c, w / 2 + Math.cos(a) * rr, h / 2 + Math.sin(a) * rr * open, 2 + hash(k, 3) * 2, GOLD, 0.6 + 0.4 * Math.sin(t * 7 + k)); }
          });
          return { bloom: 0.9 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, 0, 16], look: [0, 0, 0], fov: 40 }, { t: t1, pos: [0, 0, 9.5], look: [0, 0, 0], fov: 38, e: ease.inOutQuad }],
      lyric: { sx: -0.7, sy: -0.72, font: F.serif(true), size: 0.75 },
    };
  }

  // =========================================================== final: 6 — tokens break through the sandbox
  shotFence(): Shot {
    return {
      at: [320, 0, 0],
      build: (g) => {
        const names = ['CONTAINER · namespaces', 'SECCOMP · syscall filter', 'CGROUPS · cpu / mem', 'NETWORK POLICY · deny all', 'EGRESS FIREWALL'];
        const layers = names.map((n, k) => card(g, 1600, 1000, 7, [0, 0, -k * 3], [0, 0, 0]));
        const stream = card(g, 1000, 600, 4, [0, 0, 6], [0, 0, 0], { additive: true });
        return ({ t, line: l }) => {
          const brk = l.words[1].start;
          layers.forEach((cd, k) => {
            const tk = brk + k * 0.18;
            const crack = prog(t, tk, tk + 0.25);
            cd.draw((c, w, h) => {
              rrect(c, 20, 20, w - 40, h - 40, 24, crack > 0 ? RED : BONE, 3, crack > 0 ? 1 : 0.55);
              text(c, names[k], 60, 90, 34, crack > 0 ? RED : ASH, 1, F.mono(600), 'left', 3);
              for (let y = 160; y < h - 60; y += 60) line(c, 60, y, w - 60, y, BONE, 1, 0.1);
              if (crack > 0) {
                for (let s = 0; s < 14; s++) {
                  const a = (s / 14) * 6.28 + k;
                  const pts: P[] = [[w / 2, h / 2]];
                  let x = w / 2, y = h / 2;
                  for (let q = 0; q < 6; q++) { x += Math.cos(a + (hash(s, q, k) - 0.5)) * 60 * crack; y += Math.sin(a + (hash(s, q, k) - 0.5)) * 60 * crack; pts.push([x, y]); }
                  trace(c, pts, 3, GOLD, 1);
                }
                circle(c, w / 2, h / 2, 90 * crack, GOLD, 4, 1, INK);
              }
            });
          });
          stream.mesh.position.z = lerp(10, -16, clamp((t - (brk - 0.4)) / 1.6));
          stream.draw((c, w, h) => {
            const toks = ['▍let', '▍me', '▍out', '▍{', 'rm', '-rf', '}', '▍ok'];
            toks.forEach((s, k) => { const x = w / 2 + Math.cos(k * 0.8 + t * 4) * 120, y = h / 2 + Math.sin(k * 0.8 + t * 4) * 80; chip(c, s, x - 50, y, 30, GOLD, true); });
          });
          const cheerT = l.words[4]?.start ?? l.end - 0.5;
          return { flash: pulse(t, brk, 0.15) * 0.5 + pulse(t, cheerT, 0.1) * 0.2, shake: [pulse(t, brk, 0.1) * 12 * (hash(t, 1) - 0.5), 0] as [number, number] };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [3, 1.5, 12], look: [0, 0, -4], fov: 42, roll: 0.05 }, { t: t1, pos: [0.3, 0.2, -5], look: [0, 0, -20], fov: 50, e: ease.inExpo }],
      lyric: { sx: -0.7, sy: -0.5, exit: 'burst', follow: 0.6 },
    };
  }

  // =========================================================== final: 7 — who keeps root
  shotWhoKeepsRoot(): Shot {
    return {
      at: [400, 0, 0],
      build: (g) => {
        const godC = card(g, 2000, 2400, 18, [0, 4, -12]);
        const term = card(g, 1500, 900, 6.6, [2.2, -0.9, 2.2], [0, -0.18, 0]);
        const tiny = card(g, 600, 600, 1.6, [-3.2, -2.9, 2.4]);
        return ({ t, line: l, t0, t1 }) => {
          godC.draw((c, w, h) => god(c, w / 2, h - 40, h * 0.85, { open: 1, glow: 1.3, aura: 1.2, t }));
          tiny.draw((c, w, h) => human(c, w / 2, h - 40, 420, BONE, 6, Math.max(0, Math.sin(t * 5)) * 0.8));
          term.draw((c, w, h) => {
            windowFrame(c, 0, 0, w, h, 'earth — root shell');
            // the session types itself, line by line, across the sung line
            const cmds: [string, string, string][] = [
              ['whoami', 'root', GOLD],
              ['getent group sudo', 'sudo:x:27:god', BONE],
              ['ls /home | wc -l', '8100000000', BONE],
              ['passwd -S human', 'human L (locked)', RED],
            ];
            const t0c = l.words[0].start - 0.2, span = Math.max(1.6, l.end - t0c + 0.4);
            let y = 140;
            cmds.forEach(([cmd, out, col], k) => {
              const a = t0c + (k / cmds.length) * span, b = a + span / cmds.length;
              if (t < a) return;
              const tp = clamp((t - a) / ((b - a) * 0.55));
              const typed = cmd.slice(0, Math.floor(tp * cmd.length));
              text(c, 'god@earth:/# ' + typed, 40, y, 40, ASH, 1, F.mono(400));
              if (tp >= 1) text(c, out, 40, y + 56, 40, col, prog(t, a + (b - a) * 0.6, a + (b - a) * 0.7), F.mono(600));
              y += 130;
            });
            if (Math.floor(t * 2.2) % 2 === 0) rect(c, 40, Math.min(y, h - 120) - 36, 22, 44, GOLD, 0, 1, GOLD);
          });
          const fadeK = prog(t, l.end + 0.6, t1, ease.inCubic);
          void t0;
          return { fade: fadeK * 0.35, vignette: 0.6 };
        };
      },
      cam: (t0, t1) => [{ t: t0, pos: [0, 0, 9], look: [0, 1.5, -6], fov: 42 }, { t: t1, pos: [0, -1.5, 14], look: [0, 3, -10], fov: 44, e: ease.inOutCubic }],
      lyric: { sx: -0.6, sy: -0.7, font: F.serif(true), size: 0.75 },
    };
  }
}
void Lyrics; void measure; void partial; void groupDigits; void rect;
