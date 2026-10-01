// An EUV lithography scanner (ASML NXE-class) as 3D line art, with the real optical train:
//   tin-droplet generator → CO₂ laser pre-pulse (droplet → pancake) + main pulse (→ plasma, 13.5 nm)
//   → ellipsoidal Mo/Si collector (plasma at its first focus) → intermediate focus (its second focus)
//   → illuminator: field-facet mirror → pupil-facet mirror → condenser → grazing-incidence mirror
//   → reflective reticle on its scanning stage (6° chief ray) → projection optics: six mirrors, NA 0.33, 4× reduction
//   → 300 mm wafer on a step-and-scan stage (the reticle stage scans 4× faster, in the opposite direction).
// Every mirror is oriented by the law of reflection (its normal bisects the incoming and outgoing rays), so the light
// path is geometrically consistent. Units ≈ 0.5 m; layout is schematic but topologically faithful.
import * as THREE from 'three';
import { LineBatch, Pen, linCol, type RGB } from '../engine/lines';
import { WordSprite } from '../engine/text3d';
import { F } from '../engine/type';
import { clamp, hash, lerp, ease } from '../engine/util';

type V = THREE.Vector3;
const v3 = (x: number, y: number, z = 0) => new THREE.Vector3(x, y, z);

export const EUV = {
  F1: v3(-6, 0, 0), // plasma: primary focus of the collector
  IF: v3(-2.4, 3.1, 0), // intermediate focus
  FFM: v3(1.0, 5.8, 0), PFM: v3(-0.4, 3.4, 0), MC: v3(3.2, 4.4, 0), GI: v3(6.3, 6.3, 0),
  RET: v3(7.9, 7.7, 0),
  M: [v3(9.5, 4.7, 0), v3(8.4, 6.6, 0), v3(10.3, 5.3, 0), v3(7.9, 3.2, 0), v3(9.8, 1.6, 0), v3(8.4, 2.5, 0)],
  W: v3(9.0, -0.9, 0), // exposure point on the wafer
};

export class EUVMachine {
  lb = new LineBatch(90000, { depthTest: true });
  pen = new Pen(this.lb);
  group = new THREE.Group();
  labels: { s: WordSprite; p: V }[] = [];
  chain: { p: V; r: number; n?: V }[] = [];

  constructor() {
    this.group.add(this.lb.mesh);
    // the optical chain after the intermediate focus: point (r = 0) or mirror (footprint radius r)
    const E = EUV;
    const pts: [V, number][] = [[E.IF, 0], [E.FFM, 0.9], [E.PFM, 0.7], [E.MC, 0.6], [E.GI, 0.55], [E.RET, 0.45], ...E.M.map((m, k) => [m, [0.45, 0.35, 0.5, 0.8, 0.6, 0.55][k]] as [V, number]), [E.W, 0]];
    this.chain = pts.map(([p, r]) => ({ p, r }));
    for (let i = 1; i < this.chain.length - 1; i++) {
      const a = this.chain[i - 1].p, b = this.chain[i].p, c = this.chain[i + 1].p;
      this.chain[i].n = a.clone().sub(b).normalize().add(c.clone().sub(b).normalize()).normalize();
    }
    const L = (s: string, p: V, size = 0.2) => { const w = new WordSprite(s, F.mono(600), size); w.renderOrder = 12; this.group.add(w); this.labels.push({ s: w, p }); };
    L('Sn DROPLETS · 50 kHz', v3(-6, 0.4, -2.4), 0.13);
    L('CO₂ LASER · PRE-PULSE + MAIN PULSE', v3(-8.9, -2.6, 0.6));
    L('COLLECTOR · Mo/Si MULTILAYER', v3(-8.2, 1.9, 0));
    L('PLASMA · 13.5 nm', v3(-5.8, -0.5, 0.4), 0.1);
    L('INTERMEDIATE FOCUS', v3(-2.1, 3.3, 0));
    L('FIELD FACET MIRROR', v3(0.4, 6.5, 0));
    L('PUPIL FACET MIRROR', v3(-1.6, 2.7, 0));
    L('RETICLE · REFLECTIVE MASK', v3(7.0, 8.5, 0));
    L('PROJECTION OPTICS · 6 MIRRORS · NA 0.33 · 4×', v3(10.9, 7.2, 0));
    L('WAFER STAGE · 300 mm · STEP & SCAN', v3(7.4, -2.0, 1.8));
  }

  /** basis perpendicular to n */
  private basis(n: V): [V, V] {
    const a = Math.abs(n.z) < 0.9 ? v3(0, 0, 1) : v3(1, 0, 0);
    const u = a.clone().cross(n).normalize(), w = n.clone().cross(u).normalize();
    return [u, w];
  }

  private mirror(p: V, n: V, r: number, col: RGB, a = 1, facets = 0) {
    const pen = this.pen, [u, w] = this.basis(n);
    const ringAt = (o: V, rr: number, sag: number) => {
      const pts: number[][] = [];
      for (let k = 0; k <= 40; k++) { const t = (k / 40) * Math.PI * 2; const q = o.clone().addScaledVector(u, Math.cos(t) * rr).addScaledVector(w, Math.sin(t) * rr).addScaledVector(n, sag); pts.push([q.x, q.y, q.z]); }
      pen.style(col, 1.6, a).poly(pts);
    };
    ringAt(p, r, 0); ringAt(p, r, -0.12);
    // substrate edge + a concave sag profile across the face
    for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2; const q = p.clone().addScaledVector(u, Math.cos(t) * r).addScaledVector(w, Math.sin(t) * r); const q2 = q.clone().addScaledVector(n, -0.12); pen.style(col, 1, a * 0.6).line(q.x, q.y, q.z, q2.x, q2.y, q2.z); }
    for (const dir of [u, w]) { const pts: number[][] = []; for (let k = 0; k <= 16; k++) { const s = (k / 16) * 2 - 1; const q = p.clone().addScaledVector(dir, s * r).addScaledVector(n, -0.06 * (1 - s * s)); pts.push([q.x, q.y, q.z]); } pen.style(col, 1, a * 0.5).poly(pts); }
    // facet arrays (field / pupil facet mirrors): many small tilted elements
    if (facets) for (let i = -facets; i <= facets; i++) for (let j = -facets; j <= facets; j++) {
      const x = (i / facets) * r * 0.8, y = (j / facets) * r * 0.8; if (x * x + y * y > r * r * 0.7) continue;
      const q = p.clone().addScaledVector(u, x).addScaledVector(w, y).addScaledVector(n, 0.01);
      const s = (r / facets) * 0.4, tilt = (hash(i, j) - 0.5) * 0.3;
      const a1 = q.clone().addScaledVector(u, -s).addScaledVector(w, -s * 0.4 + tilt * s), b1 = q.clone().addScaledVector(u, s).addScaledVector(w, -s * 0.4 - tilt * s);
      pen.style(col, 1, a * 0.7).line(a1.x, a1.y, a1.z, b1.x, b1.y, b1.z);
    }
    // mount: a short arm into the frame behind the mirror
    const m0 = p.clone().addScaledVector(n, -0.12), m1 = p.clone().addScaledVector(n, -0.55);
    pen.style(col, 1.2, a * 0.5).line(m0.x, m0.y, m0.z, m1.x, m1.y, m1.z);
  }

  /** Draw the machine at song time t. lt = local time (for the source cycle), scan = wafer progress 0..1. */
  draw(t: number, o: { scan: number; pulse: number; reveal?: number; beam?: number; cam: THREE.Camera }) {
    const lb = this.lb, pen = this.pen; lb.clear(); pen.m.identity();
    const E = EUV;
    const gold = linCol('#ffb21e', 2.2), core = linCol('#ffe7b0', 4), bone = linCol('#ece9e2', 0.6), ash = linCol('#8b8f99', 0.5), red = linCol('#ff3b2f', 2.2), euv = linCol('#ffd27a', 2.6);
    const rv = o.reveal ?? 1, bm = o.beam ?? 1;
    // ---- chambers (vacuum vessels): source, illuminator, projection optics, reticle stage, wafer stage
    pen.style(ash, 1, 0.55 * rv);
    pen.box(-6.2, 0.2, 0, 4.2, 4.0, 5.2); pen.box(1.6, 5.0, 0, 6.2, 3.6, 3.0); pen.box(9.1, 4.3, 0, 3.4, 6.2, 3.0);
    pen.box(8.0, 8.05, 0, 3.6, 0.7, 2.4); pen.box(9.0, -1.35, 0, 5.2, 0.9, 5.2);
    // ---- collector: ellipsoid with foci F1 and IF; bowl behind the plasma, central hole for the laser
    const d = E.IF.clone().sub(E.F1), c = d.length(); d.normalize();
    const a2 = (c + 2 * 1.25) / 2; // vertex 1.25 behind the plasma
    const [cu, cw] = this.basis(d);
    const rAt = (psi: number) => (4 * a2 * a2 - c * c) / (4 * a2 - 2 * c * Math.cos(psi));
    const P = (psi: number, phi: number) => { const r = rAt(psi); const dir = d.clone().multiplyScalar(Math.cos(psi)).addScaledVector(cu, Math.sin(psi) * Math.cos(phi)).addScaledVector(cw, Math.sin(psi) * Math.sin(phi)); return E.F1.clone().addScaledVector(dir, r); };
    for (const psi of [1.95, 2.2, 2.45, 2.7, 2.92]) { const pts: number[][] = []; for (let k = 0; k <= 48; k++) { const q = P(psi, (k / 48) * Math.PI * 2); pts.push([q.x, q.y, q.z]); } pen.style(psi === 2.92 ? gold : bone, psi === 1.95 ? 2 : 1.2, rv * (psi === 1.95 ? 1 : 0.7)).poly(pts); }
    for (let k = 0; k < 16; k++) { const phi = (k / 16) * Math.PI * 2; const pts: number[][] = []; for (let s = 0; s <= 12; s++) { const q = P(lerp(1.95, 2.92, s / 12), phi); pts.push([q.x, q.y, q.z]); } pen.style(bone, 1, rv * 0.45).poly(pts); }
    // EUV cone: plasma → collector rim → intermediate focus (converging)
    if (bm > 0) for (let k = 0; k < 24; k++) {
      const phi = (k / 24) * Math.PI * 2 + 0.13, q = P(1.95, phi), q2 = P(2.6, phi);
      pen.style(euv, 1.2, 0.35 * bm).line(E.F1.x, E.F1.y, E.F1.z, q.x, q.y, q.z);
      pen.style(euv, 1.4, 0.55 * bm).line(q.x, q.y, q.z, E.IF.x, E.IF.y, E.IF.z);
      if (k % 3 === 0) pen.style(euv, 1, 0.25 * bm).line(q2.x, q2.y, q2.z, E.IF.x, E.IF.y, E.IF.z);
    }
    // ---- tin droplet stream across the primary focus; the laser fires as each droplet arrives
    const gen = E.F1.clone().add(v3(0, 0, -2.4)), catcher = E.F1.clone().add(v3(0, 0, 2.4));
    pen.style(bone, 1.6, rv).box(gen.x, gen.y, gen.z - 0.2, 0.3, 0.3, 0.4); pen.style(bone, 1.6, rv).box(catcher.x, catcher.y, catcher.z + 0.2, 0.4, 0.4, 0.4);
    const spacing = 0.42, speed = 1.9, ph = (t * speed) / spacing;
    for (let k = -6; k <= 6; k++) {
      const z = (k - (ph % 1)) * spacing; // droplet k crosses z = 0 at integer phase
      if (z < -2.2 || z > 2.2) continue;
      const passed = z > 0.02;
      const q = E.F1.clone().add(v3(0, 0, z));
      if (!passed) { pen.style(bone, 10, 1).line(q.x, q.y, q.z, q.x, q.y, q.z); pen.style(bone, 1.4, 0.7).ring(0.07, 'z', 12, q.x, q.y, q.z); }
      else { // pre-pulse flattened it to a pancake, the main pulse made plasma: debris continues to the catcher
        const age = z / speed;
        if (age < 0.09) { const rr = 0.08 + age * 4; pen.style(gold, 2.2, 1 - age * 8).ring(rr, 'z', 20, q.x, q.y, q.z); pen.style(gold, 2.2, 1 - age * 8).ring(rr * 0.5, 'x', 12, q.x, q.y, q.z); }
        else pen.style(ash, 2, 0.6).line(q.x, q.y, q.z, q.x, q.y, q.z + 0.02);
      }
    }
    // laser: from behind the collector, through its central hole, onto the focus
    const las = E.F1.clone().addScaledVector(d, -4.2);
    const cyc = ph % 1, pre = cyc < 0.12, main = cyc >= 0.12 && cyc < 0.3;
    pen.style(red, 2, 0.4 * rv).line(las.x, las.y, las.z, E.F1.x, E.F1.y, E.F1.z);
    if (pre) pen.style(red, 4, 1).line(las.x, las.y, las.z, E.F1.x, E.F1.y, E.F1.z - 0.05);
    if (main) { pen.style(red, 10, 1).line(las.x, las.y, las.z, E.F1.x, E.F1.y, E.F1.z); pen.style(red, 22, 0.25).line(las.x, las.y, las.z, E.F1.x, E.F1.y, E.F1.z); }
    // plasma: a white-hot point and a burst of short rays on each main pulse
    const fl = main ? 1 - (cyc - 0.12) / 0.18 : 0;
    pen.style(core, 6 + 14 * fl + 6 * o.pulse, 1).line(E.F1.x, E.F1.y, E.F1.z, E.F1.x, E.F1.y, E.F1.z);
    if (fl > 0) for (let k = 0; k < 14; k++) { const a = (k / 14) * Math.PI * 2; const q = E.F1.clone().add(v3(Math.cos(a) * 1.0 * fl, Math.sin(a) * 1.0 * fl, (hash(k, 3) - 0.5) * 0.8)); pen.style(core, 2, fl).line(E.F1.x, E.F1.y, E.F1.z, q.x, q.y, q.z); }
    pen.style(gold, 3, 1).line(E.IF.x, E.IF.y, E.IF.z, E.IF.x, E.IF.y, E.IF.z);
    // ---- mirrors (normals by reflection) and the ray bundle through them
    this.chain.forEach((m, i) => { if (m.n) this.mirror(m.p, m.n, m.r, i === 1 || i === 2 ? gold : bone, rv, i === 1 ? 6 : i === 2 ? 5 : 0); });
    // reticle: a patterned mask on a stage that scans along x
    const retShift = -Math.sin(o.scan * Math.PI * 18) * 0.6;
    const R = E.RET.clone().add(v3(retShift, 0.05, 0));
    pen.style(gold, 1.6, rv).rect(R.x, R.y, R.z, 1.0, 0.02); // edge-on outline (seen from the side)
    for (let k = -4; k <= 4; k++) pen.style(bone, 1, 0.6 * rv).line(R.x + k * 0.1, R.y + 0.02, -0.5, R.x + k * 0.1, R.y + 0.02, 0.5);
    pen.style(gold, 1.6, rv).poly([[R.x - 0.5, R.y, -0.5], [R.x + 0.5, R.y, -0.5], [R.x + 0.5, R.y, 0.5], [R.x - 0.5, R.y, 0.5]], true);
    // ray bundle: 5 rays share the chain, offset across each mirror's footprint; photons flow along them
    if (bm > 0) for (let k = 0; k < 5; k++) {
      const th = (k / 5) * Math.PI * 2 + 0.4, rad = k === 0 ? 0 : 0.55;
      const pts = this.chain.map((m) => { if (!m.n) return m.p.clone(); const [u, w] = this.basis(m.n); return m.p.clone().addScaledVector(u, Math.cos(th) * rad * m.r).addScaledVector(w, Math.sin(th) * rad * m.r); });
      for (let s = 0; s < pts.length - 1; s++) {
        const a = pts[s], b = pts[s + 1];
        pen.style(euv, k === 0 ? 2 : 1.1, (k === 0 ? 0.75 : 0.4) * bm).line(a.x, a.y, a.z, b.x, b.y, b.z);
        const u = (t * 2.2 + s * 0.17 + k * 0.31) % 1, q = a.clone().lerp(b, u);
        pen.style(core, 3.5, bm).line(q.x, q.y, q.z, q.x, q.y, q.z);
      }
    }
    // ---- wafer stage: 300 mm wafer, 9×9 dies, step-and-scan (serpentine); exposed dies fill in gold
    const dies: [number, number][] = [];
    for (let j = 0; j < 9; j++) for (let i = 0; i < 9; i++) { const x = (i - 4) * 0.27, z = (j - 4) * 0.27; if (x * x + z * z < 1.18 * 1.18) dies.push([j % 2 ? -x : x, z]); }
    const nd = dies.length, fexp = o.scan * nd, cur = Math.min(nd - 1, Math.floor(fexp)), within = fexp - cur;
    const [dx, dz] = dies[cur];
    const scanOff = (within - 0.5) * 0.27; // scanning the die under the fixed slit
    const wc = E.W.clone().add(v3(-dx, -0.02, -dz - scanOff));
    pen.style(bone, 1.8, rv).ring(1.3, 'y', 72, wc.x, wc.y, wc.z);
    pen.style(gold, 1.4, rv).line(wc.x - 0.12, wc.y, wc.z + 1.3, wc.x + 0.12, wc.y, wc.z + 1.3); // notch
    dies.forEach(([x, z], k) => {
      const cx = wc.x + x, cz = wc.z + z, done = k < cur || (k === cur && within > 0.95);
      pen.style(done ? gold : ash, done ? 1.4 : 1, done ? 0.95 : 0.5).poly([[cx - 0.12, wc.y, cz - 0.12], [cx + 0.12, wc.y, cz - 0.12], [cx + 0.12, wc.y, cz + 0.12], [cx - 0.12, wc.y, cz + 0.12]], true);
      if (done) for (let q = -2; q <= 2; q++) pen.style(gold, 1, 0.5).line(cx - 0.1, wc.y, cz + q * 0.045, cx + 0.1, wc.y, cz + q * 0.045);
    });
    // exposure slit (arc-shaped field) burning on the wafer
    const slit: number[][] = []; for (let k = 0; k <= 16; k++) { const a = -0.5 + k / 16; slit.push([E.W.x + a * 0.26, E.W.y + 0.01, E.W.z + 0.03 * Math.cos(a * 3)]); }
    pen.style(core, 3.5, bm).poly(slit);
    // stage block under the chuck, on its long-stroke rails
    pen.style(bone, 1.2, 0.6 * rv).box(wc.x, wc.y - 0.25, wc.z, 3.0, 0.4, 3.0);
    pen.style(ash, 1, 0.5 * rv).line(6.6, -1.75, -2.4, 11.4, -1.75, -2.4); pen.style(ash, 1, 0.5 * rv).line(6.6, -1.75, 2.4, 11.4, -1.75, 2.4);
    // labels face the camera
    this.labels.forEach(({ s, p }) => { s.position.copy(p); s.quaternion.copy(o.cam.quaternion); s.tint(0.9, 0.88, 0.84, rv); });
    void ease; void clamp;
  }
}
