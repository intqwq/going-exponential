// The blow-up flow of the OpenAI 2026 forced Navier–Stokes construction, as 3D line art, following its similarity
// variables (as recast in Duraiswami, arXiv:2609.17642, eqs. (1)–(2) and Fig. 1):
//   τ = 1 − t,  z = q^D η,  τ = q(1 − η²),  X = r²/2q,  A = ½ + h,  D = ½ − h,  0 < h < 1/100,
//   u_θ = q^(−A) √(2X) F,  u_z = q^(−A) U,  r u_r = X v₀,  p = q^(−2A) Π.
// Axisymmetric swirl core about the axis; dividing plane η = 0; singular ends η = ±1. Three motions: inflow, an
// axial THROUGH-flow along the axis (the core is not symmetric about the dividing plane), and a return flow at larger
// radius. Around the core, a forced annulus where an oscillatory force (pulses) supplies the missing stress; outside,
// a heat exterior that carries swirl only. The collapse is of the profile: material turns only a fraction of a
// revolution per decade of τ. Here the profile is drawn in similarity units (radius √(2qX), height q^D η) with a
// model streamfunction that reproduces those three motions; the physical scale shrinks as τ → 0.
import { Pen, linCol } from '../engine/lines';
import { clamp, hash, lerp } from '../engine/util';

const gold = linCol('#ffb21e', 2.2), core = linCol('#ffe7b0', 3.4), bone = linCol('#ece9e2', 0.6), ash = linCol('#8b8f99', 0.5), red = linCol('#ff3b2f', 1.6);

// model profile in similarity units: ρ ∈ [0, ~3] (radius, units of √q), ζ = η ∈ [−1, 1]
// Ψ = ρ² e^(−ρ²) · c(ζ) with c(ζ) = 1 − 0.55ζ² + 0.25ζ (the odd part breaks the symmetry: through-flow, not two jets)
const cz = (z: number) => 1 - 0.55 * z * z + 0.25 * z;
const Psi = (r: number, z: number) => r * r * Math.exp(-r * r) * cz(z);
// u_z = (1/ρ) ∂Ψ/∂ρ, u_ρ = −(1/ρ) ∂Ψ/∂ζ
const uz = (r: number, z: number) => 2 * (1 - r * r) * Math.exp(-r * r) * cz(z);
const ur = (r: number, z: number) => -r * Math.exp(-r * r) * (-1.1 * z + 0.25);
// swirl profile E = √(2X) F: zero on the axis, peak near the core edge, X^(−A)-like decay in the exterior
const swirl = (r: number) => (r * 1.6) / (1 + Math.pow(r, 2.6));

/** Streamlines: level sets of Ψ, traced by integrating (u_ρ, u_z) from seeds; returns polylines in (ρ, ζ, φ). */
function traceLines(): number[][][] {
  const out: number[][][] = [];
  const seeds: [number, number][] = [];
  for (let k = 0; k < 7; k++) seeds.push([0.18 + k * 0.1, -0.98]); // through-flow near the axis
  for (let k = 0; k < 6; k++) seeds.push([1.25 + k * 0.17, 0.98]); // return flow outside
  for (let k = 0; k < 4; k++) seeds.push([0.95 + k * 0.05, -0.2 + k * 0.12]); // the turning cell (inflow)
  seeds.forEach(([r0, z0], s) => {
    let r = r0, z = z0, phi = (s / seeds.length) * Math.PI * 2;
    const pts: number[][] = [[r, z, phi]];
    for (let n = 0; n < 1400; n++) {
      const a = ur(r, z), b = uz(r, z), sp = Math.hypot(a, b) + 1e-6;
      const ds = 0.006;
      r += (a / sp) * ds; z += (b / sp) * ds;
      phi += (swirl(r) / Math.max(0.25, r)) * ds * 0.25 / sp; // a fraction of a turn along the line
      if (r < 0.02 || r > 3.2 || Math.abs(z) > 1) break;
      if (n % 4 === 0) pts.push([r, z, phi]);
      if (n > 40 && Math.hypot(r - r0, z - z0) < 0.03) break; // closed loop
      if (n > 900) break;
    }
    out.push(pts);
  });
  return out;
}
const LINES = traceLines();

/**
 * Draw the collapsing core. tau: time to the singularity (1 → 0); S: world units per similarity unit at q = 1.
 * The profile is drawn at its physical size (radius ∝ √q, height ∝ q^D) times `zoom` (a dynamic-rescaling camera).
 */
export function drawNS(pen: Pen, t: number, tau: number, o: { S: number; zoom: number; h?: number }) {
  const h = o.h ?? 0.005, D = 0.5 - h, A = 0.5 + h;
  const q = Math.max(1e-6, tau);
  const Rw = o.S * Math.sqrt(q) * o.zoom, Zw = o.S * 1.15 * Math.pow(q, D) * o.zoom;
  const W = (r: number, z: number, phi: number) => [Math.cos(phi) * r * Rw, z * Zw, Math.sin(phi) * r * Rw];
  const L = (a: number[], b: number[], c: number[], w: number, al: number) => pen.style(c as [number, number, number], w, al).line(a[0], a[1], a[2], b[0], b[1], b[2]);
  // axis, dividing plane, singular ends
  L([0, -1.25 * Zw, 0], [0, 1.25 * Zw, 0], ash, 1, 0.7);
  pen.style(ash, 1, 0.35).ring(3.0 * Rw, 'y', 72);
  for (const e of [-1, 1]) { pen.style(red, 1.2, 0.6).ring(0.12 * Rw, 'y', 24, 0, e * Zw, 0); const b = 1 + 0.5 * Math.sin(t * 9 + e); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; L([0, e * Zw, 0], [Math.cos(a) * 0.12 * Rw * b, e * Zw + e * 0.05 * Zw, Math.sin(a) * 0.12 * Rw * b], red, 1, 0.6); } }
  // region boundaries: core (ρ ≈ 1.15), forced annulus (to ρ ≈ 2.1), heat exterior beyond
  for (const [rb, c, al] of [[1.15, gold, 0.55], [2.1, bone, 0.35]] as [number, number[], number][]) for (let j = -4; j <= 4; j++) pen.style(c as [number, number, number], 1, al * (1 - Math.abs(j) * 0.12)).ring(rb * Rw, 'y', 64, 0, (j / 4) * Zw, 0);
  // streamlines, each drawn in 6 azimuthal copies (axisymmetry), with tracers whose speed grows as q^(−A)
  const speed = Math.pow(q, -A);
  LINES.forEach((pts, s) => {
    const kind = s < 7 ? 0 : s < 13 ? 1 : 2;
    const col = kind === 0 ? gold : kind === 1 ? bone : gold;
    const nc = kind === 2 ? 3 : 5;
    for (let c = 0; c < nc; c++) {
      const off = (c / nc) * Math.PI * 2 + s * 0.4;
      for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; L(W(a[0], a[1], a[2] + off), W(b[0], b[1], b[2] + off), col, kind === 1 ? 1 : 1.2, kind === 1 ? 0.4 : kind === 2 ? 0.35 : 0.7); }
      const u = (t * 0.12 * Math.min(8, speed) + hash(s, c)) % 1, p = pts[Math.floor(u * (pts.length - 1))];
      const w = W(p[0], p[1], p[2] + off); L(w, w, core, 4, 1);
    }
  });
  // forced annulus: oscillatory pulses (rings travelling round, beating in amplitude)
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2 + t * 0.6, rr = 1.6 + 0.25 * Math.sin(k * 1.7), zz = Math.sin(k * 2.3) * 0.6;
    const amp = 0.5 + 0.5 * Math.sin(t * 8 + k * 1.3);
    const c = W(rr, zz, a);
    pen.style(k % 2 ? gold : bone, 1.2, 0.5 + 0.4 * amp).ring((0.06 + 0.08 * amp) * Rw, 'y', 16, c[0], c[1], c[2]);
  }
  // heat exterior: swirl only (pure circles, no meridional motion), fading out
  for (let k = 0; k < 5; k++) { const rr = 2.3 + k * 0.18; const ph = t * swirl(rr) * 0.2; for (let j = -1; j <= 1; j++) pen.style(ash, 1, 0.35 - k * 0.05).ring(rr * Rw, 'y', 48, 0, j * 0.5 * Zw, 0, ph, ph + Math.PI * 1.7); }
  void clamp; void lerp;
}
