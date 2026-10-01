// "We're going exponential; I'm feeling nonessential." — a 3D chase up a doubling curve.
//
// The curve is real data-shaped (ragged) and doubles every unit n: y = Y0·(2ⁿ − 1). Eleven gates sit at successive
// doublings (×2, ×4 … ×2048), each a square frame perpendicular to the curve. The camera rides beside the head; as
// "ex-po-nen-tial" is sung the head punches through one gate per letter, stamping that letter (each 1.12× the last)
// with a shockwave, and the camera is dragged upward faster and faster as the curve turns vertical. On "nonessential"
// the camera is thrown back to reveal the whole hockey stick, then drops to a tiny human at the origin, looking up.
// Variant 1 (the reprise) flies the same route on LOG paper: the curve is a straight ramp ("for your comfort").
import * as THREE from 'three';
import { LineBatch, Pen, linCol, type RGB } from '../engine/lines';
import { WordSprite } from '../engine/text3d';
import { F } from '../engine/type';
import { ragged, GOLD, BONE } from './vec';
import { clamp, ease, hash, lerp } from '../engine/util';
import type { CamKey } from '../engine/cam';

const WORD = 'EXPONENTIAL';
const N0 = 3, NG = WORD.length, NEND = N0 + NG; // run-up doublings, gates, end of the word
const DX = 0.9; // world x per doubling
const gold = linCol('#ffb21e', 2.4), core = linCol('#ffe7b0', 4), bone = linCol('#ece9e2', 0.55), ash = linCol('#8b8f99', 0.42), dim = linCol('#474b55', 0.9);

export class ExpoFlight {
  lb = new LineBatch(60000, { depthTest: true });
  pen = new Pen(this.lb);
  group = new THREE.Group();
  letters: WordSprite[] = [];
  tags: WordSprite[] = [];
  you: WordSprite; youSub: WordSprite; logTag: WordSprite;
  rag: number[];
  constructor(public log: boolean, seed: number, public T: { t0: number; ws: number; we: number; t1: number; t2: number }) {
    this.group.add(this.lb.mesh);
    this.rag = ragged(400, seed, () => 1, 0.05, 0.18);
    for (let k = 0; k < NG; k++) {
      const s = new WordSprite(WORD[k], F.display(800), 1, k === NG - 1 ? GOLD : BONE); s.renderOrder = 12; s.visible = false; this.group.add(s); this.letters.push(s);
      const tg = new WordSprite(`×${2 ** (k + 1)}`, F.mono(600), 1, GOLD); tg.renderOrder = 12; tg.visible = false; this.group.add(tg); this.tags.push(tg);
    }
    this.you = new WordSprite('YOU ARE HERE', F.mono(700), 0.06, BONE); this.you.renderOrder = 12; this.group.add(this.you);
    this.youSub = new WordSprite('~10¹⁶ FLOP/s · CARBON · NON-UPGRADABLE', F.mono(500), 0.04, '#8b8f99'); this.youSub.renderOrder = 12; this.group.add(this.youSub);
    this.logTag = new WordSprite('LOG SCALE — FOR YOUR COMFORT', F.mono(700), 0.45, GOLD); this.logTag.renderOrder = 12; this.logTag.visible = log; this.group.add(this.logTag);
  }

  // ------------------------------------------------------------------ the curve
  Y0 = 30 / 2 ** (NEND);
  y(n: number) {
    const i = clamp((n / (NEND + 2)) * (this.rag.length - 1), 0, this.rag.length - 2), f = i - Math.floor(i);
    const r = lerp(this.rag[Math.floor(i)], this.rag[Math.floor(i) + 1], f);
    if (this.log) return Math.max(0, n) * 0.72 * (0.97 + 0.03 * r);
    // drawn growth is gentler than the labels (×2048 would be a needle on screen): e^(0.32n), the knee stays visible
    return 0.12 * (Math.exp(0.32 * n) - 1) * r;
  }
  P(n: number): THREE.Vector3 { return new THREE.Vector3(n * DX, this.y(n), Math.sin(n * 0.7) * 0.25); }
  tan(n: number) { return this.P(n + 0.02).sub(this.P(n - 0.02)).normalize(); }
  /** local scale: how far the head travels per doubling (sets camera distance and gate size) */
  scale(n: number) { return Math.max(1, this.P(n + 0.5).distanceTo(this.P(n - 0.5))); }

  /** head position (in doublings) at time t */
  n(t: number) {
    const { t0, ws, we, t1, t2 } = this.T;
    if (t < ws) return N0 * ease.inCubic(clamp((t - t0) / Math.max(0.2, ws - t0)));
    if (t < we) return N0 + NG * ((t - ws) / Math.max(0.2, we - ws));
    return NEND + 1.6 * ease.outCubic(clamp((t - we) / Math.max(0.3, t2 - we))) + 0 * t1;
  }

  /** camera keys for both shots (dense, so the Hermite spline follows the head exactly) */
  camKeys(t0: number, t1: number, shot: 0 | 1): CamKey[] {
    const keys: CamKey[] = [];
    const chase = (t: number): CamKey => {
      const n = this.n(t), h = this.P(n), d = 3.4 + 1.6 * clamp((n - N0) / NG), tg = this.tan(n);
      const side = new THREE.Vector3(-0.25, -0.12, 1).normalize();
      const pos = h.clone().addScaledVector(side, d).addScaledVector(tg, -0.9 * d);
      const look = h.clone().addScaledVector(tg, 0.25 * d);
      return { t, pos: [pos.x, pos.y, pos.z], look: [look.x, look.y, look.z], fov: lerp(46, 58, clamp((n - N0) / NG)), roll: -0.18 * clamp((n - N0 - 4) / 7) };
    };
    if (shot === 0) {
      for (let t = t0; t < t1; t += 0.06) keys.push(chase(t));
      keys.push(chase(t1));
    } else {
      // thrown back: the whole hockey stick; then drop to the human at the origin, looking up the curve
      const top = this.P(this.n(t1));
      const c0 = chase(t0);
      keys.push(c0);
      const tb = lerp(t0, t1, 0.42), td = lerp(t0, t1, 0.78);
      const midY = top.y * 0.5;
      keys.push({ t: tb, pos: [top.x * 0.4, midY * 0.85, 17], look: [top.x * 0.55, midY, 0], fov: 46, roll: 0.04 });
      // low and close behind the human: it stands bottom-left, the curve towers away above it
      keys.push({ t: td, pos: [-0.9, 0.3, 2.0], look: [2.6, 2.0, -0.6], fov: 64, roll: -0.03 });
      keys.push({ t: t1, pos: [-0.75, 0.22, 1.7], look: [2.8, 2.6, -0.6], fov: 68, roll: -0.05 });
    }
    return keys;
  }

  // ------------------------------------------------------------------ drawing
  private square(c: THREE.Vector3, tg: THREE.Vector3, s: number, col: RGB, w: number, a: number, p = 1) {
    const up = Math.abs(tg.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = up.clone().cross(tg).normalize(), v = tg.clone().cross(u).normalize();
    const pts = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a2, b2]) => { const q = c.clone().addScaledVector(u, a2 * s).addScaledVector(v, b2 * s); return [q.x, q.y, q.z]; });
    this.pen.style(col, w, a).poly(pts, true, p);
    return { u, v };
  }

  draw(t: number, cam: THREE.Camera, kick: number) {
    const pen = this.pen; this.lb.clear(); pen.m.identity();
    const n = this.n(t), head = this.P(n), S = this.scale(n);
    const { we, t2 } = this.T;
    const reveal = clamp((t - we - 0.15) / 0.6);
    // ---- floor grid around the origin and under the run (fades with distance from the head)
    for (let k = -8; k <= 52; k++) { const x = k * 0.75, f = Math.exp(-Math.abs(x - head.x) / 9); pen.style(ash, 1, (0.18 + 0.25 * kick) * f + 0.06).line(x, 0, -6, x, 0, 6); }
    for (let k = -8; k <= 8; k++) { const z = k * 0.75; pen.style(ash, 1, 0.14 + 0.06 * (k === 0 ? 1 : 0)).line(-6, 0, z, 40, 0, z); }
    // ---- altitude wall behind: one line per doubling, streaming past as the camera climbs
    for (let k = 0; k <= NEND + 2; k++) {
      const y = this.y(k); if (y < 0.02 && k > 0) continue;
      pen.style(k <= n ? bone : dim, 1, k <= n ? 0.35 : 0.2).line(-4, y, -3, 40, y, -3);
    }
    pen.style(bone, 1.4, 0.6).line(0, 0, -3, 0, 40, -3);
    // ---- the curve: ribbon (two rails + rungs), its floor shadow and wall shadow
    const steps = Math.max(2, Math.floor(n * 40));
    let prev: THREE.Vector3 | null = null, prevT: THREE.Vector3 | null = null;
    for (let i = 0; i <= steps; i++) {
      const m = (n * i) / steps, p = this.P(m), tg = this.tan(m);
      const wdt = 0.05 * Math.pow(this.scale(m), 0.6);
      const side = new THREE.Vector3(0, 0, 1).cross(tg).normalize().multiplyScalar(wdt);
      if (prev && prevT) {
        const fresh = clamp(1 - (n - m) * 0.6); // newest part glows hottest
        const c = fresh > 0.5 ? core : gold;
        pen.style(c, 2.4, 0.95).line(prev.x, prev.y, prev.z, p.x, p.y, p.z);
        pen.style(gold, 1, 0.5).line(prev.x + prevT.x, prev.y + prevT.y, prev.z, p.x + side.x, p.y + side.y, p.z);
        pen.style(gold, 1, 0.5).line(prev.x - prevT.x, prev.y - prevT.y, prev.z, p.x - side.x, p.y - side.y, p.z);
        if (i % 4 === 0) pen.style(gold, 1, 0.35).line(p.x - side.x, p.y - side.y, p.z, p.x + side.x, p.y + side.y, p.z);
        pen.style(dim, 1, 0.7).line(prev.x, 0.002, prev.z, p.x, 0.002, p.z); // floor shadow
        pen.style(bone, 1, 0.22).line(prev.x, prev.y, -2.99, p.x, p.y, -2.99); // wall shadow
        if (i % 6 === 0) pen.style(ash, 1, 0.12).line(p.x, 0, p.z, p.x, p.y, p.z); // drop lines
      }
      prev = p; prevT = side;
    }
    // ---- the head: hot point + sparks trailing behind it
    pen.style(core, 12 + 8 * kick, 1).line(head.x, head.y, head.z, head.x, head.y, head.z);
    pen.style(gold, 34, 0.18).line(head.x, head.y, head.z, head.x, head.y, head.z);
    for (let p = 0; p < 70; p++) {
      const age = ((t * 2.6 + hash(p, 1)) % 1);
      const src = this.P(Math.max(0, n - age * 0.35));
      const dir = new THREE.Vector3(hash(p, 2) - 0.5, hash(p, 3) - 0.3, hash(p, 4) - 0.5).normalize().multiplyScalar(age * 0.35 * S);
      const a = src.clone().add(dir), b = a.clone().addScaledVector(dir, 0.15);
      pen.style(p % 3 ? gold : core, 1.4, (1 - age) * 0.9).line(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    // ---- gates: drawn by a beam as the head approaches, punched (shockwave) as it passes; letters stamped
    for (let k = 0; k < NG; k++) {
      const nk = N0 + k + 0.5, c = this.P(nk), tg = this.tan(nk), sk = 0.3 * Math.pow(this.scale(nk), 0.6) * Math.pow(1.05, k);
      const appear = clamp((n - (nk - 1.6)) / 1.2);
      const passed = n >= nk;
      const since = passed ? (n - nk) : -1;
      if (appear <= 0 && !passed) { this.letters[k].visible = false; this.tags[k].visible = false; continue; }
      const { u, v } = this.square(c, tg, sk, passed ? gold : bone, passed ? 2 : 1.3, passed ? 0.9 : 0.6, ease.outCubic(appear));
      if (passed) this.square(c, tg, sk * 1.08, gold, 1, 0.4);
      // shockwave ring right after the punch
      const sw = passed ? clamp(since / 0.7) : 0;
      if (passed && sw < 1) {
        const R = sk * (1 + sw * 2.6), pts: number[][] = [];
        for (let q = 0; q <= 48; q++) { const a = (q / 48) * Math.PI * 2; const p = c.clone().addScaledVector(u, Math.cos(a) * R).addScaledVector(v, Math.sin(a) * R); pts.push([p.x, p.y, p.z]); }
        pen.style(core, 3 * (1 - sw) + 1, 1 - sw).poly(pts);
      }
      // the letter: slams in at the gate (overshoot) and stays, facing the camera; sized to the local scale
      const L = this.letters[k], tag = this.tags[k];
      L.visible = passed; tag.visible = appear > 0.3;
      const hk = 0.8 * sk * Math.pow(1.08, k);
      if (passed) {
        const slam = ease.outBack(clamp(since / 0.35));
        const off = u.clone().multiplyScalar(sk * 1.25).add(v.clone().multiplyScalar(-sk * 0.4));
        L.position.copy(c).add(off);
        L.quaternion.copy(cam.quaternion);
        L.scale.setScalar(Math.max(0.001, hk * lerp(2.2, 1, slam)));
        const hot = clamp(1 - since / 0.5);
        if (k === NG - 1) L.tint(1.6 + 2 * hot, 1.4 + 1.5 * hot, 1.2 + hot, 1); else L.tint(1 + 2 * hot, 1 + 1.4 * hot, 1 + 0.6 * hot, 1);
      }
      tag.position.copy(c).add(u.clone().multiplyScalar(-sk * 1.05)).add(v.clone().multiplyScalar(sk * 1.05));
      tag.quaternion.copy(cam.quaternion);
      tag.scale.setScalar(Math.max(0.001, sk * 0.28 * appear));
    }
    // ---- the human at the origin, and the label
    const hs = 0.32, hx = 0.25, hz = 0.35;
    pen.style(bone, 1.6, 1).ring(hs * 0.09, 'z', 16, hx, hs * 0.9, hz);
    pen.style(bone, 1.6, 1).line(hx, hs * 0.81, hz, hx, hs * 0.42, hz);
    pen.style(bone, 1.6, 1).line(hx, hs * 0.42, hz, hx - hs * 0.12, 0, hz); pen.style(bone, 1.6, 1).line(hx, hs * 0.42, hz, hx + hs * 0.12, 0, hz);
    const wave = reveal * Math.max(0, Math.sin(t * 6)) * 0.3;
    pen.style(bone, 1.6, 1).line(hx, hs * 0.72, hz, hx - hs * 0.2, hs * 0.5, hz); pen.style(bone, 1.6, 1).line(hx, hs * 0.72, hz, hx + hs * 0.18, hs * (0.5 + wave), hz);
    const lab = clamp((t - t2 + 1.4) / 0.4);
    this.you.position.set(hx + 0.16, hs * 0.95, hz); this.you.quaternion.copy(cam.quaternion); this.you.tint(1, 1, 1, lab);
    this.youSub.position.set(hx + 0.16, hs * 0.82, hz); this.youSub.quaternion.copy(cam.quaternion); this.youSub.tint(0.9, 0.9, 0.9, lab);
    if (this.log) { this.logTag.position.set(head.x + 1.2 * S, head.y + 0.8 * S, head.z); this.logTag.quaternion.copy(cam.quaternion); this.logTag.scale.setScalar(S * 0.6); }
    return { n, crossing: (k: number) => N0 + k + 0.5 };
  }
}
