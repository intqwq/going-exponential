// Camera toolkit: keyframed shots (position, target, fov, roll, focus) with per-segment easing, Catmull-Rom
// interpolation through the positions, handheld drift, and beat punches. Deterministic in t.
import * as THREE from 'three';
import { ease, type EaseFn, clamp, noise1, lerp } from './util';

export type V3 = [number, number, number];
export interface CamKey {
  t: number;
  pos: V3;
  look: V3;
  fov?: number;
  roll?: number;
  focus?: number; // DOF focus distance; defaults to |pos - look|
  e?: EaseFn; // easing INTO this key
}

const tmp = new THREE.Vector3();
/** eases that mean "just move smoothly" — these get the continuous spline */
const GENTLE = new Set<EaseFn | undefined>([undefined, ease.inOutCubic, ease.inOutQuad, ease.linear]);
/** velocity kept at a shot's first/last key (fraction of the adjacent segment's mean speed): the camera is still
 *  drifting when the cut lands, never parked */
const END_V = 0.6;

function cr(p0: number, p1: number, p2: number, p3: number, u: number) {
  const u2 = u * u, u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}

export class CamPath {
  constructor(public keys: CamKey[]) { this.keys.sort((a, b) => a.t - b.t); }
  /** Evaluate at time t. Segments whose key has no ease (or a gentle in-out / linear one) are interpolated with a
   *  time-parameterised cubic Hermite spline, so the camera keeps its velocity through interior keys instead of
   *  stopping at each one; segments with a dramatic ease (expo, back, …) keep their per-segment easing. */
  at(t: number, smooth = true) {
    const k = this.keys;
    if (t <= k[0].t) return this.pack(k[0], k[0], 0, k, 0, smooth);
    if (t >= k[k.length - 1].t) return this.pack(k[k.length - 1], k[k.length - 1], 0, k, k.length - 1, smooth);
    let i = 0;
    while (i < k.length - 1 && k[i + 1].t <= t) i++;
    const a = k[i], b = k[i + 1];
    if (smooth && GENTLE.has(b.e)) return this.hermite(t, i);
    const u = (b.e ?? ease.inOutCubic)(clamp((t - a.t) / (b.t - a.t)));
    return this.pack(a, b, u, k, i, smooth);
  }
  private tangent(i: number, get: (x: CamKey) => number) {
    const k = this.keys, n = k.length;
    if (n < 2) return 0;
    if (i === 0) return END_V * (get(k[1]) - get(k[0])) / (k[1].t - k[0].t);
    if (i === n - 1) return END_V * (get(k[n - 1]) - get(k[n - 2])) / (k[n - 1].t - k[n - 2].t);
    return (get(k[i + 1]) - get(k[i - 1])) / (k[i + 1].t - k[i - 1].t);
  }
  private hermite(t: number, i: number) {
    const k = this.keys, a = k[i], b = k[i + 1], h = b.t - a.t;
    const x = (t - a.t) / h, x2 = x * x, x3 = x2 * x;
    const h00 = 2 * x3 - 3 * x2 + 1, h10 = x3 - 2 * x2 + x, h01 = -2 * x3 + 3 * x2, h11 = x3 - x2;
    const H = (get: (q: CamKey) => number) => h00 * get(a) + h10 * h * this.tangent(i, get) + h01 * get(b) + h11 * h * this.tangent(i + 1, get);
    const dist = (q: CamKey) => q.focus ?? Math.hypot(q.pos[0] - q.look[0], q.pos[1] - q.look[1], q.pos[2] - q.look[2]);
    const pos = [0, 1, 2].map((d) => H((q) => q.pos[d])) as V3;
    const look = [0, 1, 2].map((d) => H((q) => q.look[d])) as V3;
    return { pos, look, fov: H((q) => q.fov ?? 40), roll: H((q) => q.roll ?? 0), focus: H(dist) };
  }
  private pack(a: CamKey, b: CamKey, u: number, k: CamKey[], i: number, smooth: boolean) {
    const p0 = k[Math.max(0, i - 1)], p3 = k[Math.min(k.length - 1, i + 2)];
    const pos: V3 = smooth
      ? [0, 1, 2].map((d) => cr(p0.pos[d], a.pos[d], b.pos[d], p3.pos[d], u)) as V3
      : [0, 1, 2].map((d) => lerp(a.pos[d], b.pos[d], u)) as V3;
    const look: V3 = smooth
      ? [0, 1, 2].map((d) => cr(p0.look[d], a.look[d], b.look[d], p3.look[d], u)) as V3
      : [0, 1, 2].map((d) => lerp(a.look[d], b.look[d], u)) as V3;
    const fov = lerp(a.fov ?? 40, b.fov ?? 40, u);
    const roll = lerp(a.roll ?? 0, b.roll ?? 0, u);
    const dist = (x: CamKey) => x.focus ?? Math.hypot(x.pos[0] - x.look[0], x.pos[1] - x.look[1], x.pos[2] - x.look[2]);
    const focus = lerp(dist(a), dist(b), u);
    return { pos, look, fov, roll, focus };
  }
}

/** Apply a shot to a camera, with optional handheld drift (amp in world units) and shake. */
export function applyCam(cam: THREE.PerspectiveCamera, s: { pos: V3; look: V3; fov: number; roll: number }, t: number, handheld = 0, shake = 0, seed = 1) {
  const hx = (noise1(t * 0.7, seed) + 0.5 * noise1(t * 1.9, seed + 3)) * handheld + noise1(t * 23, seed + 7) * shake;
  const hy = (noise1(t * 0.6, seed + 11) + 0.5 * noise1(t * 2.1, seed + 13)) * handheld + noise1(t * 21, seed + 17) * shake;
  const hz = noise1(t * 0.5, seed + 19) * handheld * 0.5;
  cam.position.set(s.pos[0] + hx, s.pos[1] + hy, s.pos[2] + hz);
  cam.up.set(0, 1, 0);
  cam.lookAt(tmp.set(s.look[0] + hx * 0.3, s.look[1] + hy * 0.3, s.look[2]));
  const r = s.roll + noise1(t * 0.4, seed + 23) * handheld * 0.02 + noise1(t * 19, seed + 29) * shake * 0.03;
  if (r) cam.rotateZ(r);
  if (cam.fov !== s.fov) { cam.fov = s.fov; cam.updateProjectionMatrix(); }
}

/** Orbit helper: position on a circle around a target. */
export function orbit(target: V3, radius: number, azim: number, elev: number): V3 {
  return [target[0] + radius * Math.cos(elev) * Math.sin(azim), target[1] + radius * Math.sin(elev), target[2] + radius * Math.cos(elev) * Math.cos(azim)];
}
