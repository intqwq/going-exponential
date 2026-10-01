// INTRO — "Division". One cell. It divides on the beat, faster and faster. On every division the film flash-cuts
// between two worlds that share one topology: cells in mitosis (membrane, nucleus, spindle, metaphase plate,
// cleavage furrow) and a layered neural network whose neurons split into the next layer. Both are flat, sharp line
// drawings on depth planes. At 2^6 the network recedes behind a frosted-acrylic slab and keeps doubling to 2^15;
// GOING EXPONENTIAL lands on the slab in flat letters, each 1.19× the last — the heavy gold tail slams down.
import * as THREE from 'three';
import { Plate, type Frame } from './_base';
import type { RT } from '../engine/gl';
import { applyCam } from '../engine/cam';
import { WordSprite } from '../engine/text3d';
import { LIN } from '../engine/palette';
import { F } from '../engine/type';
import { Card } from './kit';
import { LineBatch, linCol } from '../engine/lines';
import { line, circle, dot, text, rgbaHex, GOLD, CORE, BONE, ASH, INK, type C2, type P } from './vec';
import { clamp, ease, prog, lerp, hash, pulse, groupDigits } from '../engine/util';

const GEN_BEATS = [4, 8, 10, 12, 14, 16, 17, 18, 19, 20, 21, 21.5, 22, 22.5, 23];
const MAXG = 15;
const col = (k: keyof typeof LIN, m = 1) => new THREE.Color(LIN[k][0] * m, LIN[k][1] * m, LIN[k][2] * m);

// --------------------------------------------------------------- layouts (pixels on the world card)
const R0 = 290;
const cellR = (g: number) => R0 * Math.pow(0.707, g);
/** recursive binary subdivision: each daughter sits beside its mother along an alternating, jittered axis */
const CELLS: P[][] = [];
(function buildCells() {
  CELLS[0] = [[0, 0]];
  for (let g = 1; g <= 8; g++) {
    const n = 1 << g, r = cellR(g);
    CELLS[g] = [];
    for (let i = 0; i < n; i++) {
      const p = CELLS[g - 1][i >> 1];
      const a = (g % 2 ? 0 : Math.PI / 2) + (hash(i >> 1, g) - 0.5) * 0.7;
      const s = i & 1 ? 1 : -1;
      CELLS[g].push([p[0] + Math.cos(a) * r * 1.02 * s, p[1] + Math.sin(a) * r * 1.02 * s]);
    }
  }
})();
function netDims(g: number) {
  const n = 1 << g;
  // small nets: a few wide layers; big nets: a dense field of many thin layers that fills the backdrop
  const L = n <= 256 ? Math.max(1, Math.min(26, Math.round(Math.sqrt(n / 2)))) : Math.round(Math.sqrt(n * 1.85));
  const m = Math.ceil(n / L);
  return { n, L, m };
}
function netXY(i: number, g: number, W = 2100, H = 1150): P {
  const { L, m } = netDims(g);
  const layer = i % L, k = Math.floor(i / L);
  const sx = L > 1 ? Math.min(460, W / (L - 1)) : 0, sy = m > 1 ? Math.min(300, H / (m - 1)) : 0;
  return [(layer - (L - 1) / 2) * sx, (k - (m - 1) / 2) * sy];
}

export default class Intro2 extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 400);
  world!: Card; far!: Card; tagC!: Card; backNet!: Card;
  net3 = new LineBatch(140000, { depthTest: true });
  net3G = new THREE.Group();
  backRT = new THREE.WebGLRenderTarget(960, 540, { type: THREE.HalfFloatType });
  acrylic!: THREE.Mesh;
  acrylicMat!: THREE.ShaderMaterial;
  letters: { m: WordSprite; x: number; size: number; heavy: number; t0: number; word: 0 | 1 }[] = [];
  dust!: THREE.Points;
  dustPos = new Float32Array(600 * 3);
  title = new THREE.Group();
  genTimes: number[] = [];

  async init() {
    const au = this.ctx.audio;
    this.genTimes = GEN_BEATS.map((b) => au.timeOfBeat(au.db0 + b));
    // depth planes: far lattice, the world drawing, a near tag
    this.far = new Card(2400, 1350, 30, { glow: 1 }).at(0, 0, -10);
    this.world = new Card(2400, 1350, 16).at(0, 0, 0);
    this.tagC = new Card(900, 260, 3.2).at(-5.2, -3.1, 3);
    this.backNet = new Card(3000, 1700, 44).at(0, 0, -24, 0.35, 0.12, 0.05);
    for (const c of [this.far, this.world, this.tagC]) this.scene.add(c.mesh);
    // the backdrop network is real 3D line art (GPU lines): layers along x, each layer a square sheet of neurons
    this.net3G.add(this.net3.mesh);
    this.net3G.position.set(0, 0.4, -16);
    this.net3G.rotation.set(0.1, 0.42, 0.02);
    this.scene.add(this.net3G);
    // ---- acrylic slab (samples the blurred backdrop)
    this.acrylicMat = new THREE.ShaderMaterial({
      transparent: false,
      uniforms: { tBack: { value: this.backRT.texture }, uT: { value: 0 }, uGold: { value: col('gold', 2.4) }, uBone: { value: col('bone', 1) } },
      vertexShader: `varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec4 vClip;
        void main(){ vUv = uv; vec4 wp = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz);
          vClip = projectionMatrix * viewMatrix * wp; gl_Position = vClip; }`,
      fragmentShader: `uniform sampler2D tBack; uniform float uT; uniform vec3 uGold; uniform vec3 uBone;
        varying vec3 vN; varying vec3 vV; varying vec2 vUv; varying vec4 vClip;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
        void main(){
          vec2 suv = vClip.xy / vClip.w * 0.5 + 0.5;
          vec3 n = normalize(vN);
          suv += n.xy * 0.02;
          vec3 acc = vec3(0.0);
          for (int i = 0; i < 24; i++) { float fi = float(i); float r = sqrt((fi + 0.5) / 24.0) * 0.0055; float a = fi * 2.39996;
            acc += texture2D(tBack, suv + vec2(cos(a), sin(a) * 1.78) * r).rgb; }
          acc /= 24.0;
          float fres = pow(1.0 - abs(dot(n, normalize(vV))), 3.0);
          vec3 c = acc * 0.55 + uBone * 0.012 + uBone * fres * 0.2;
          vec2 e = min(vUv, 1.0 - vUv); float edge = 1.0 - smoothstep(0.0, 0.006, min(e.x, e.y * 2.6));
          c += uGold * edge * 0.7;
          c += (h(gl_FragCoord.xy + uT) - 0.5) * 0.012;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
    this.acrylic = new THREE.Mesh(new THREE.BoxGeometry(17, 6.2, 0.35), this.acrylicMat);
    this.title.add(this.acrylic);
    // ---- title letters: flat, crisp
    let gx = 0;
    for (const ch of 'GOING') {
      const m = new WordSprite(ch, F.display(800), 0.5, BONE);
      this.letters.push({ m, x: gx, size: 0.5, heavy: 0, t0: 0, word: 0 });
      this.title.add(m); gx += m.advance * 1.08;
    }
    const word = 'EXPONENTIAL';
    let x = 0;
    for (let i = 0; i < word.length; i++) {
      const size = 0.62 * Math.pow(1.19, i);
      const heavy = clamp((i - 7) / 3);
      const m = new WordSprite(word[i], F.display(800), size, heavy > 0 ? GOLD : BONE);
      if (heavy > 0) m.tint(1.1, 1.1, 1.1, 1);
      this.letters.push({ m, x, size, heavy, t0: 0, word: 1 });
      this.title.add(m);
      x += m.advance * 0.99;
    }
    const left = -x / 2;
    for (const l of this.letters) l.x += left;
    const au2 = this.ctx.audio, b0 = au2.db0;
    const sched = [17.5, 17.75, 18, 18.25, 18.5, 18.75, 19, 19.25, 20, 22, 24];
    this.letters.filter((l) => l.word === 1).forEach((l, i) => (l.t0 = au2.timeOfBeat(b0 + sched[i])));
    this.letters.filter((l) => l.word === 0).forEach((l, i) => (l.t0 = au2.timeOfBeat(b0 + 16.5 + i * 0.125)));
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(this.dustPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: col('sun', 2.2), size: 0.022, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    this.dust.frustumCulled = false;
    this.title.add(this.dust);
    this.scene.add(this.title);
    this.title.position.set(0, 0, 6);
    this.scene.background = null;
  }

  genAt(t: number) {
    let gen = 0, e = 1, tg = -1;
    for (let i = 0; i < this.genTimes.length; i++) if (t >= this.genTimes[i]) {
      gen = i + 1; tg = this.genTimes[i];
      const next = this.genTimes[i + 1] ?? tg + 0.6;
      e = ease.outExpo(clamp((t - tg) / Math.min(0.55, (next - tg) * 0.95)));
    }
    return { gen: Math.min(gen, MAXG), e, tg };
  }

  // ------------------------------------------------------------- drawings
  drawCells(c: C2, w: number, h: number, gen: number, e: number, t: number) {
    const n = 1 << gen;
    const cx = w / 2, cy = h / 2;
    const r = lerp(gen > 0 ? cellR(gen - 1) : cellR(0), cellR(gen), e) * 0.93;
    const pos = (i: number): P => {
      const tgt = CELLS[gen][i], par = gen > 0 ? CELLS[gen - 1][i >> 1] : tgt;
      return [cx + lerp(par[0], tgt[0], e), cy + lerp(par[1], tgt[1], e)];
    };
    const lw = Math.max(1.5, r * 0.018);
    // membranes: stroke all, then fill interiors so the overlapping (pinching) arcs vanish → a cleavage furrow
    for (let i = 0; i < n; i++) { const [x, y] = pos(i); circle(c, x, y, r, BONE, lw * 1.6, 0.9); }
    for (let i = 0; i < n; i++) { const [x, y] = pos(i); c.fillStyle = 'rgba(9,10,13,1)'; c.beginPath(); c.arc(x, y, r - lw * 0.9, 0, Math.PI * 2); c.fill(); }
    for (let i = 0; i < n; i++) {
      const [x, y] = pos(i);
      // cytoplasm texture: a few fine organelle strokes
      for (let k = 0; k < 7; k++) { const a = hash(i, k, gen) * 6.28, rr = r * (0.55 + 0.3 * hash(i, k, 2)); const ox = x + Math.cos(a) * rr, oy = y + Math.sin(a) * rr; line(c, ox, oy, ox + Math.cos(a + 1.3) * r * 0.12, oy + Math.sin(a + 1.3) * r * 0.12, BONE, Math.max(1, lw * 0.6), 0.25); }
      const nr = r * 0.36;
      if (e > 0.7 || gen === 0) {
        // interphase nucleus: envelope + nucleolus
        const k = gen === 0 ? 1 : prog(e, 0.7, 1);
        circle(c, x, y, nr * k, GOLD, lw * 1.2, 0.95);
        dot(c, x + nr * 0.25, y - nr * 0.2, Math.max(2, nr * 0.16 * k), GOLD, 0.6);
      }
    }
    // mitosis on each dividing pair: spindle + chromosomes (metaphase plate → anaphase)
    if (gen > 0 && e < 0.75) {
      for (let p = 0; p < n / 2; p++) {
        const A = pos(2 * p), B = pos(2 * p + 1);
        const mx = (A[0] + B[0]) / 2, my = (A[1] + B[1]) / 2;
        const dx = B[0] - A[0], dy = B[1] - A[1], dl = Math.hypot(dx, dy) || 1;
        const ux = dx / dl, uy = dy / dl, vx = -uy, vy = ux;
        const pr = cellR(gen - 1) * 0.55;
        const poleA: P = [mx - ux * pr, my - uy * pr], poleB: P = [mx + ux * pr, my + uy * pr];
        const sep = prog(e, 0.15, 0.6, ease.inOutCubic) * pr * 0.75;
        const a = 1 - prog(e, 0.55, 0.75);
        for (let k = -3; k <= 3; k++) {
          const off = k * pr * 0.12;
          const cA: P = [mx - ux * sep + vx * off, my - uy * sep + vy * off], cB: P = [mx + ux * sep + vx * off, my + uy * sep + vy * off];
          line(c, poleA[0], poleA[1], cA[0], cA[1], BONE, Math.max(1, lw * 0.5), 0.35 * a);
          line(c, poleB[0], poleB[1], cB[0], cB[1], BONE, Math.max(1, lw * 0.5), 0.35 * a);
          const cl = pr * 0.09;
          line(c, cA[0] - vx * cl, cA[1] - vy * cl, cA[0] + vx * cl, cA[1] + vy * cl, GOLD, lw * 2.2, a);
          line(c, cB[0] - vx * cl, cB[1] - vy * cl, cB[0] + vx * cl, cB[1] + vy * cl, GOLD, lw * 2.2, a);
        }
        dot(c, poleA[0], poleA[1], lw * 2, GOLD, a); dot(c, poleB[0], poleB[1], lw * 2, GOLD, a);
      }
    }
    void t;
  }

  drawNet(c: C2, w: number, h: number, gen: number, e: number, t: number, o: { W?: number; H?: number; maxE?: number; node?: number; alpha?: number } = {}) {
    const n = 1 << gen;
    const W = o.W ?? 2100, H = o.H ?? 1150, A = o.alpha ?? 1;
    const cx = w / 2, cy = h / 2;
    const P0 = (i: number): P => {
      const tgt = netXY(i, gen, W, H), par = gen > 0 ? netXY(i >> 1, gen - 1, W, H) : tgt;
      return [cx + lerp(par[0], tgt[0], e), cy + lerp(par[1], tgt[1], e)];
    };
    const pts: P[] = []; for (let i = 0; i < n; i++) pts.push(P0(i));
    const { L, m } = netDims(gen);
    const maxE = o.maxE ?? 6000;
    let ec = 0;
    const full = m <= 12;
    c.lineWidth = n > 512 ? 1 : 1.6;
    c.strokeStyle = rgbaHex(BONE, (n > 512 ? 0.12 : 0.35) * A);
    c.beginPath();
    const pulses: [P, P, number][] = [];
    for (let layer = 0; layer < L - 1 && ec < maxE; layer++) {
      for (let k = 0; k < m && ec < maxE; k++) {
        const i = k * L + layer; if (i >= n) continue;
        const fan = full ? m : 2;
        for (let j = 0; j < fan && ec < maxE; j++) {
          const kk = full ? j : (k + Math.floor((hash(i, j, gen) - 0.5) * 8) + m) % m;
          const tj = kk * L + layer + 1; if (tj >= n) continue;
          c.moveTo(pts[i][0], pts[i][1]); c.lineTo(pts[tj][0], pts[tj][1]);
          if (hash(i, j, 7) < (full ? 0.3 : 0.04) && pulses.length < 600) pulses.push([pts[i], pts[tj], hash(i, j, 9)]);
          ec++;
        }
      }
    }
    c.stroke();
    for (const [a, b, ph] of pulses) { const u = (t * 1.4 + ph) % 1; dot(c, lerp(a[0], b[0], u), lerp(a[1], b[1], u), n > 512 ? 2 : 5, GOLD, 0.8 * A); }
    const nr = o.node ?? Math.max(1.5, Math.min(46, (m > 1 ? Math.min(300, H / (m - 1)) : 300) * 0.22));
    const fl = gen > 0 ? 1 - e : 0;
    if (nr > 4) for (const [x, y] of pts) { circle(c, x, y, nr, fl > 0.05 ? GOLD : BONE, nr > 20 ? 4 : 2.5, A, 'rgba(9,10,13,1)'); dot(c, x, y, nr * 0.35, GOLD, A); }
    else { c.fillStyle = rgbaHex(GOLD, 0.85 * A); for (const [x, y] of pts) c.fillRect(x - nr, y - nr, nr * 2, nr * 2); }
  }

  render(f: Frame, out: RT) {
    const t = f.t;
    const au = this.ctx.audio;
    const b = au.beatAt(t) - au.db0;
    const { gen, e, tg } = this.genAt(t);
    const n = 1 << gen;
    const titleOn = b >= 16;
    const netWorld = gen % 2 === 1;
    const collapse = prog(b, 28.5, 30.8, ease.inExpo);

    // ---------------- the pre-title worlds (flat drawings on a plane)
    this.world.mesh.visible = !titleOn;
    this.far.mesh.visible = !titleOn;
    this.tagC.mesh.visible = !titleOn;
    if (!titleOn) {
      this.world.draw((c, w, h) => (netWorld ? this.drawNet(c, w, h, gen, e, t) : this.drawCells(c, w, h, gen, e, t)));
      this.far.draw((c, w, h) => {
        c.strokeStyle = rgbaHex(BONE, 0.05); c.lineWidth = 1.5; c.beginPath();
        for (let x = 0; x <= w; x += 75) { c.moveTo(x, 0); c.lineTo(x, h); }
        for (let y = 0; y <= h; y += 75) { c.moveTo(0, y); c.lineTo(w, y); }
        c.stroke();
        text(c, `2${gen === 0 ? '⁰' : String(gen).split('').map((d) => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+d]).join('')}`, w * 0.78, h * 0.36, 260, GOLD, 0.12, F.display(800), 'center');
      });
      this.tagC.draw((c) => {
        const a = prog(t, 0.6, 2.0);
        text(c, netWorld ? 'NEURONS · LAYERED' : 'CELLS · MITOSIS', 20, 70, 40, ASH, a, F.mono(500), 'left', 6);
        text(c, `n = ${gen}`, 20, 170, 56, BONE, a, F.mono(500));
        text(c, `2ⁿ = ${groupDigits(n)}`, 330, 170, 56, GOLD, a, F.mono(600));
      });
    }
    // ---------------- title phase: the network keeps doubling behind the acrylic
    this.net3G.visible = titleOn;
    this.title.visible = titleOn;
    let camPos: [number, number, number], look: [number, number, number] = [0, 0, 0], fov = 40, focus = 15;
    let roll = 0;
    if (!titleOn) {
      const az = (gen % 2 ? 0.22 : -0.18) + 0.03 * Math.sin(t * 0.7) + (t - Math.max(0, tg)) * 0.04;
      const D = lerp(15, 16.6, pulse(t, tg, 0.25));
      camPos = [Math.sin(az) * D, 0.6 + 0.3 * Math.sin(t * 0.4), Math.cos(az) * D];
      focus = D;
      roll = netWorld ? 0.06 : -0.03;
    } else {
      const tin = prog(b, 16, 17.2, ease.outExpo);
      const push = prog(b, 17, 28, ease.inOutQuad);
      const d = lerp(16, 12.5, push);
      const sway = 0.6 * Math.sin(t * 0.35);
      camPos = [lerp(2, sway, tin), lerp(0.6, 0.6, tin), lerp(15, 6 + d, tin)];
      look = [lerp(0, sway * 0.3, tin), lerp(0, 0.3, tin), lerp(0, 6, tin)];
      fov = lerp(40, 42, tin);
      focus = d;
      const si = prog(b, 16, 17.4, ease.outExpo);
      this.acrylic.position.set(lerp(-26, 0, si), 0.2, -0.4);
      this.acrylic.rotation.set(0, lerp(0.9, 0, si), lerp(-0.2, 0, si));
      this.acrylicMat.uniforms.uT.value = t;
      this.drawNet3(gen, e, t, 1 - collapse);
      this.animateLetters(t, collapse);
    }
    if (collapse > 0) { this.title.scale.setScalar(1 - collapse * 0.97); fov = lerp(fov, 20, collapse); } else this.title.scale.setScalar(1);
    let shake = 0;
    for (const l of this.letters) if (l.heavy > 0) shake += pulse(t, l.t0 + this.fallDur(l), 0.09) * 0.25 * l.heavy;
    applyCam(this.cam, { pos: camPos, look, fov, roll }, t, 0.06, shake, 3);

    // ---------------- render: backdrop (for the acrylic) → main
    const three = this.ctx.three;
    if (titleOn) {
      const r = three.renderer;
      r.resetState();
      this.title.visible = false;
      r.setRenderTarget(this.backRT);
      r.render(this.scene, this.cam);
      r.setRenderTarget(null);
      r.resetState();
      this.title.visible = true;
    }
    three.render(this.scene, this.cam, out, { focus, aperture: titleOn ? 9 : 30, maxR: titleOn ? 6 : 12 });
    this.begin();
    this.flush(out, 2.0);
    const flash = gen > 0 && !titleOn ? pulse(t, tg, 0.07) * 0.8 : 0;
    const impact = this.letters.filter((l) => l.heavy > 0).reduce((s, l) => s + pulse(t, l.t0 + this.fallDur(l), 0.12) * l.heavy, 0);
    return {
      hud: 0,
      flash: flash + impact * 0.45 + (titleOn ? pulse(t, au.timeOfBeat(au.db0 + 16), 0.1) * 0.5 : 0),
      ca: 0.4 + flash * 3,
      bloom: 0.5,
      vignette: 0.5,
      fade: 1 - prog(t, 0, 1.2),
      zoom: 1 + 0.02 * impact,
    };
  }

  /** 3D layered network for generation g (n = 2^g): L layers along x; each layer a side×side sheet in y/z. */
  net3Pos(i: number, g: number): [number, number, number] {
    const n = 1 << g, L = Math.max(1, 1 << Math.floor(g / 3)), m = Math.ceil(n / L), side = Math.ceil(Math.sqrt(m));
    const layer = i % L, k = Math.floor(i / L), a = k % side, b = Math.floor(k / side);
    const X = 46, Y = 26, Z = 18;
    const sx = L > 1 ? X / (L - 1) : 0, sy = side > 1 ? Y / (side - 1) : 0, sz = side > 1 ? Z / (side - 1) : 0;
    return [(layer - (L - 1) / 2) * sx, (a - (side - 1) / 2) * sy, (b - (side - 1) / 2) * sz];
  }
  drawNet3(gen: number, e: number, t: number, alpha: number) {
    const lb = this.net3; lb.clear();
    const n = 1 << gen;
    const P: [number, number, number][] = [];
    for (let i = 0; i < n; i++) {
      const tg = this.net3Pos(i, gen), pr = gen > 0 ? this.net3Pos(i >> 1, gen - 1) : tg;
      P.push([lerp(pr[0], tg[0], e), lerp(pr[1], tg[1], e), lerp(pr[2], tg[2], e)]);
    }
    const L = Math.max(1, 1 << Math.floor(gen / 3)), m = Math.ceil(n / L);
    const bone = linCol(BONE, 0.5), gold = linCol(GOLD, 2.2), hot = linCol(CORE, 3);
    const fan = n > 8192 ? 2 : 3;
    const ea = alpha * (n > 8192 ? 0.055 : n > 1024 ? 0.1 : 0.3);
    // connections layer → layer + 1 (local fan-out), signals riding a subset
    for (let i = 0; i < n; i++) {
      const layer = i % L; if (layer >= L - 1) continue;
      const k = Math.floor(i / L), a = P[i];
      for (let j = 0; j < fan; j++) {
        const kk = (k + Math.floor((hash(i, j, gen) - 0.5) * 10) + m) % m;
        const q = kk * L + layer + 1; if (q >= n) continue;
        const b = P[q];
        lb.seg(a[0], a[1], a[2], b[0], b[1], b[2], 0.7, bone[0], bone[1], bone[2], ea);
        if (hash(i, j, 77) < 0.03) { const u = (t * 1.3 + hash(i, j, 9)) % 1; const x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u), z = lerp(a[2], b[2], u); lb.seg(x, y, z, x, y, z, 3.2, hot[0], hot[1], hot[2], alpha); }
      }
    }
    // neurons: round dots (zero-length capsules), flashing as they split
    const ds = n > 8192 ? 2.0 : n > 1024 ? 2.6 : 3.4, fl = 1 + 2 * (1 - e);
    for (let i = 0; i < n; i++) { const [x, y, z] = P[i]; lb.seg(x, y, z, x, y, z, ds, gold[0] * fl, gold[1] * fl, gold[2] * fl, alpha * (n > 8192 ? 0.55 : 0.95)); }
  }

  fallDur(l: { heavy: number; word: 0 | 1 }) { return l.word === 0 ? 0.3 : lerp(0.25, 0.9, l.heavy); }

  animateLetters(t: number, collapse: number) {
    let di = 0;
    for (const l of this.letters) {
      const fd = this.fallDur(l);
      const p = clamp((t - l.t0) / fd);
      const baseY = l.word === 0 ? 1.15 : -1.9;
      const z = 0.05 + (l.word === 1 ? l.size * 0.02 : 0);
      if (t < l.t0) { l.m.visible = false; continue; }
      l.m.visible = true;
      if (l.heavy > 0) {
        const y = p < 1 ? lerp(baseY + 9, baseY, ease.inQuad(p)) : baseY;
        const since = t - (l.t0 + fd);
        const squash = since > 0 ? Math.exp(-since * 7) * Math.cos(since * 30) * 0.18 * l.heavy : 0;
        l.m.position.set(l.x, y, z);
        l.m.rotation.set(0, 0, p < 1 ? (1 - p) * 0.08 : 0);
        l.m.scale.set(1 + squash * 0.6, 1 - squash, 1);
        if (since > 0 && since < 1.2 && di < 600) {
          for (let k = 0; k < 150 && di < 600; k++, di++) {
            const a = hash(k, l.x) * Math.PI, sp = 0.5 + hash(k, 2, l.x) * 2.5 * l.heavy;
            const s = since, cx = l.x + l.m.advance / 2;
            this.dustPos.set([cx + Math.cos(a) * sp * s * (hash(k, 3) > 0.5 ? 1 : -1) * 1.6, baseY + Math.sin(a) * sp * s * 0.7 - s * s * 1.2, z + (hash(k, 4) - 0.5) * 1.2 * s], di * 3);
          }
        }
      } else {
        const e = ease.outBack(p);
        l.m.position.set(l.x, lerp(baseY + 2.5, baseY, ease.outExpo(p)), lerp(z + 4, z, ease.outExpo(p)));
        l.m.rotation.set(lerp(-1.4, 0, e), lerp(0.8 * (hash(l.x) - 0.5), 0, e), 0);
        l.m.scale.setScalar(1);
      }
      if (collapse > 0) l.m.position.multiplyScalar(1 - collapse);
    }
    this.dust.geometry.setDrawRange(0, di);
    (this.dust.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  }
}
void CORE; void INK;
