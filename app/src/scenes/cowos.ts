// CoWoS-S (Chip-on-Wafer-on-Substrate, TSMC 2.5D packaging) as 3D line art, assembled from an exploded view:
//   organic substrate (with a BGA ball array underneath) ← C4 bumps ← silicon interposer (TSVs + RDL wiring)
//   ← µbumps ← one SoC/GPU die in the middle and four HBM stacks beside it (each: a base logic die + 8 DRAM dies,
//   joined by TSVs), then underfill and a stiffener ring. Plus the wafer it came from, sawn into dies.
import { Pen, linCol } from '../engine/lines';
import { clamp, ease, hash, lerp } from '../engine/util';

const gold = linCol('#ffb21e', 2.2), core = linCol('#ffe7b0', 3.2), bone = linCol('#ece9e2', 0.65), ash = linCol('#8b8f99', 0.5);

/** The wafer (r = 3) sawn into dies; dice 0..1 runs the saw, split 0..1 pulls the dies apart. */
export function drawWafer(pen: Pen, dice: number, split: number, t: number) {
  pen.style(bone, 1.6, 1).ring(3, 'y', 96, 0, 0, 0);
  pen.style(gold, 1.6, 1).line(-0.25, 0, 3, 0.25, 0, 3);
  const n = 11, s = 0.5;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const cx = (i - (n - 1) / 2) * s, cz = (j - (n - 1) / 2) * s;
    if (Math.hypot(Math.abs(cx) + s / 2, Math.abs(cz) + s / 2) > 3) continue;
    const ox = cx * split * 0.35, oz = cz * split * 0.35, oy = split * hash(i, j) * 0.3;
    pen.style(bone, 1, 0.8).poly([[cx + ox - 0.21, oy, cz + oz - 0.21], [cx + ox + 0.21, oy, cz + oz - 0.21], [cx + ox + 0.21, oy, cz + oz + 0.21], [cx + ox - 0.21, oy, cz + oz + 0.21]], true);
    // circuit texture inside each die
    for (let k = 0; k < 3; k++) pen.style(ash, 1, 0.6).line(cx + ox - 0.15, oy, cz + oz - 0.12 + k * 0.12, cx + ox + 0.15, oy, cz + oz - 0.12 + k * 0.12);
  }
  // the saw: street by street, a bright blade line sweeping
  const streets = 2 * (n + 1), cut = dice * streets;
  for (let k = 0; k < Math.min(streets, Math.ceil(cut)); k++) {
    const along = k < n + 1, idx = along ? k : k - (n + 1), pos = (idx - n / 2) * s;
    const frac = k < Math.floor(cut) ? 1 : cut - Math.floor(cut);
    const half = Math.sqrt(Math.max(0, 9 - pos * pos));
    const a = -half, b = lerp(-half, half, frac);
    if (along) pen.style(gold, 1.4, 0.9).line(pos, 0.01, a, pos, 0.01, b); else pen.style(gold, 1.4, 0.9).line(a, 0.01, pos, b, 0.01, pos);
    if (frac < 1) { const hx = along ? pos : b, hz = along ? b : pos; pen.style(core, 9, 1).line(hx, 0.02, hz, hx, 0.02, hz); for (let q = 0; q < 6; q++) { const a2 = q + t * 20; pen.style(core, 1.5, 0.8).line(hx, 0.02, hz, hx + Math.cos(a2) * 0.2, 0.1 + hash(q, Math.floor(t * 30)) * 0.2, hz + Math.sin(a2) * 0.2); } }
  }
}

/** The package; asm 0 = fully exploded, 1 = assembled. hbm 0..1 stacks the DRAM dies one by one. */
export function drawCoWoS(pen: Pen, asm: number, hbm: number, t: number) {
  const gap = (k: number) => (1 - ease.inOutCubic(clamp(asm * 1.2 - k * 0.04))) * (0.55 + k * 0.35);
  // substrate + BGA
  let y = 0;
  pen.style(bone, 1.4, 1).box(0, y + 0.15, 0, 8, 0.3, 6);
  for (let i = 0; i < 16; i++) for (let j = 0; j < 12; j++) { const x = -3.75 + i * 0.5, z = -2.75 + j * 0.5; pen.style(ash, 4, 0.7).line(x, y - 0.05, z, x, y - 0.05, z); }
  // routing layers drawn on the substrate's side
  for (let k = 0; k < 3; k++) pen.style(ash, 1, 0.5).line(-4, y + 0.07 + k * 0.08, 3, 4, y + 0.07 + k * 0.08, 3);
  // stiffener ring
  y = 0.3;
  pen.style(bone, 1, 0.6).box(0, y + 0.2 + gap(0) * 0.3, 0, 7.6, 0.4, 5.6);
  // C4 bumps
  const yC = y + gap(1);
  for (let i = 0; i < 24; i++) for (let j = 0; j < 12; j++) { const x = -2.9 + i * 0.25, z = -1.4 + j * 0.25; pen.style(bone, 3, 0.75).line(x, yC + 0.05, z, x, yC + 0.05, z); }
  // silicon interposer: TSVs and RDL
  const yI = yC + 0.1 + gap(2);
  pen.style(gold, 1.6, 1).box(0, yI + 0.06, 0, 6.2, 0.12, 3.2);
  for (let k = 0; k < 30; k++) { const x = -2.9 + k * 0.2; pen.style(gold, 1, 0.5).line(x, yI, 1.6, x, yI + 0.12, 1.6); }
  for (let k = 0; k < 14; k++) { const z = -1.3 + k * 0.2; pen.style(gold, 1, 0.35).line(-1.4, yI + 0.121, z, -2.0 - hash(k) * 0.4, yI + 0.121, z); pen.style(gold, 1, 0.35).line(1.4, yI + 0.121, z, 2.0 + hash(k, 2) * 0.4, yI + 0.121, z); }
  // µbumps
  const yM = yI + 0.12 + gap(3) * 0.8;
  for (let i = 0; i < 40; i++) for (let j = 0; j < 10; j++) { const x = -2.9 + i * 0.15, z = -1.2 + j * 0.27; if (Math.abs(x) > 1.35 && Math.abs(x) < 1.6) continue; pen.style(bone, 2, 0.6).line(x, yM + 0.03, z, x, yM + 0.03, z); }
  // SoC die
  const yS = yM + 0.06 + gap(4);
  pen.style(gold, 2, 1).box(0, yS + 0.18, 0, 2.6, 0.36, 2.6);
  for (let k = 0; k < 8; k++) pen.style(gold, 1, 0.5).line(-1.2, yS + 0.361, -1.2 + k * 0.34, 1.2, yS + 0.361, -1.2 + k * 0.34);
  for (let k = 0; k < 8; k++) pen.style(gold, 1, 0.3).line(-1.2 + k * 0.34, yS + 0.361, -1.2, -1.2 + k * 0.34, yS + 0.361, 1.2);
  // HBM stacks: base die + 8 DRAM dies, TSVs through the stack
  for (const [sx, sz] of [[-2.15, -0.65], [-2.15, 0.65], [2.15, -0.65], [2.15, 0.65]]) {
    const yb = yM + 0.06 + gap(4);
    pen.style(bone, 1.4, 1).box(sx, yb + 0.05, sz, 1.1, 0.1, 1.15);
    const nOn = Math.floor(hbm * 8 + 1e-6), frac = hbm * 8 - nOn;
    for (let d = 0; d < 8; d++) {
      if (d > nOn) break;
      const drop = d === nOn ? (1 - ease.outBack(frac)) * 1.2 : 0;
      if (d === nOn && frac <= 0) break;
      const yd = yb + 0.1 + d * 0.06 + drop + gap(5 + d * 0.3) * 0.4;
      pen.style(d % 2 ? bone : ash, 1.1, 0.9).box(sx, yd + 0.025, sz, 1.1, 0.05, 1.15);
    }
    for (let v = 0; v < 5; v++) { const x = sx - 0.4 + v * 0.2; pen.style(gold, 1, 0.6).line(x, yb, sz + 0.58, x, yb + 0.1 + Math.min(8, Math.ceil(hbm * 8)) * 0.06, sz + 0.58); }
  }
  void t;
}
