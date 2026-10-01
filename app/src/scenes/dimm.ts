// A DDR5 UDIMM as 3D line art, at true proportions (JEDEC: 133.35 × 31.25 mm, 1.2 mm PCB):
//   288-pin edge connector (144 gold fingers per side), the key notch off-centre between pins 72 and 73 (DDR5),
//   two independent 32-bit sub-channels (left and right halves), 8 × x8 DRAM FBGA packages per side on a single-rank
//   32 GB module (16 Gb dies, 2 ranks shown front/back), the on-module PMIC, the SPD hub with temperature sensor,
//   decoupling capacitors, and fly-by address/command routing daisy-chained through the packages to termination.
// One package can lift off the board and open to its die: 32 banks in 8 bank groups (DDR5), each bank a cell array
// with row decoders and sense amplifiers.
import { Pen, linCol } from '../engine/lines';
import { clamp, ease, hash, lerp } from '../engine/util';

const S = 0.055; // mm → world
const W = 133.35, Hh = 31.25, T = 1.2;
const gold = linCol('#ffb21e', 2.2), core = linCol('#ffe7b0', 3.2), bone = linCol('#ece9e2', 0.65), ash = linCol('#8b8f99', 0.5), graph = linCol('#474b55', 0.9);

/** PCB coordinates: x from the left edge (mm), y up from the bottom edge (mm), z = board face (+ front). */
export function drawDimm(pen: Pen, o: { build: number; lift: number; open: number; flow: number; t: number }) {
  const P = (x: number, y: number) => [(x - W / 2) * S, y * S];
  const z0 = (T / 2) * S;
  const rv = clamp(o.build * 1.4);
  // ---- PCB outline with the notch and the side retention notches
  const notchX = 72.8; // DDR5 key: between pins 72 and 73, not at the centre
  const out: number[][] = [];
  const add = (x: number, y: number) => { const [a, b] = P(x, y); out.push([a, b]); };
  add(0, 2.5); add(0, 18); add(1.5, 18); add(1.5, 21); add(0, 21); add(0, Hh); add(W, Hh); add(W, 21); add(W - 1.5, 21); add(W - 1.5, 18); add(W, 18); add(W, 2.5);
  add(W - 2.5, 0); add(notchX + 0.8, 0); add(notchX + 0.8, 3.6); add(notchX - 0.8, 3.6); add(notchX - 0.8, 0); add(2.5, 0);
  for (const zz of [z0, -z0]) pen.style(bone, 1.6, rv).poly(out.map(([a, b]) => [a, b, zz]), true);
  out.forEach(([a, b], k) => { if (k % 2 === 0) pen.style(bone, 1, 0.5 * rv).line(a, b, z0, a, b, -z0); });
  // ---- 288 gold fingers (144 per side), skipping the notch
  for (let k = 0; k < 144; k++) {
    const x = 4.2 + k * 0.85 + (k >= 72 ? 1.65 : 0);
    if (Math.abs(x - notchX) < 1.0) continue;
    const a = clamp(o.build * 3 - (k / 144) * 1.2);
    const [x0, y0] = P(x - 0.3, 0.4), [x1, y1] = P(x + 0.3, 3.8);
    for (const zz of [z0 + 0.001, -z0 - 0.001]) pen.style(gold, 1, a).poly([[x0, y0, zz], [x1, y0, zz], [x1, y1, zz], [x0, y1, zz]], true);
  }
  // ---- packages: 8 DRAM per side (x8), PMIC (centre-top), SPD hub, caps
  const dram: [number, number][] = [];
  for (let k = 0; k < 8; k++) dram.push([12 + k * 14.5 + (k >= 4 ? 7 : 0), 17]);
  const box = (cx: number, cy: number, w: number, h: number, d: number, side: 1 | -1, a: number, col = bone, lift = 0) => {
    const [x, y] = P(cx, cy); const zz = side * (z0 + (d * S) / 2 + lift);
    pen.style(col, 1.4, a).box(x, y, zz, w * S, h * S, d * S);
  };
  dram.forEach(([cx, cy], k) => {
    for (const side of [1, -1] as const) {
      const a = clamp(o.build * 3 - 0.6 - k * 0.12);
      const drop = (1 - ease.outBack(a)) * 0.8;
      const isOpen = side === 1 && k === 2;
      const lift = isOpen ? o.lift * 1.1 : 0;
      box(cx, cy, 11, 9.5, 1.2, side, a, bone, drop + lift);
      // package marking + pin-1 dot
      const [x, y] = P(cx - 3.5, cy + 3); const zz = side * (z0 + 1.2 * S + drop + lift + 0.001);
      pen.style(gold, 2.5, a).line(x, y, zz, x, y, zz);
      for (let q = 0; q < 2; q++) { const [xa, ya] = P(cx - 3, cy - 1 - q * 1.6), [xb] = P(cx + 3, 0); pen.style(ash, 1, a * 0.8).line(xa, ya, zz, xb, ya, zz); }
    }
  });
  const pa = clamp(o.build * 3 - 1.5);
  box(66.7, 24, 8, 6, 1.0, 1, pa, gold); // PMIC
  const [px, py] = P(66.7, 24); pen.style(gold, 1, pa * 0.6).line(px - 0.25, py, z0 + 0.1, px + 0.25, py, z0 + 0.1);
  box(66.7, 9.5, 3.5, 3.5, 0.8, 1, pa); // SPD hub (+ TS)
  for (let k = 0; k < 40; k++) { const cx = 8 + k * 3.1 + (k > 19 ? 6 : 0), cy = k % 2 ? 9 : 26.5; box(cx, cy, 1.0, 0.5, 0.5, 1, pa * 0.8, ash); }
  // ---- fly-by routing (address/command) through the packages to termination resistors; data lanes straight down
  if (o.build > 0.6) {
    const ra = clamp((o.build - 0.6) * 2.5);
    for (const half of [0, 1]) {
      const ch = half ? dram.slice(4) : dram.slice(0, 4);
      const pts: number[][] = [];
      const [sx, sy] = P(half ? notchX + 4 : notchX - 4, 4.5); pts.push([sx, sy, z0 + 0.001]);
      const order = half ? ch : ch.slice().reverse();
      order.forEach(([cx, cy]) => { const [x, y] = P(cx, cy - 6.5); pts.push([x, y, z0 + 0.001]); });
      const [ex, ey] = P(half ? 128 : 5, 11); pts.push([ex, ey, z0 + 0.001]);
      pen.style(gold, 1.4, 0.8 * ra).poly(pts, false, ra);
      // a command pulse running down the fly-by chain
      const u = (o.flow * 1.3 + half * 0.5) % 1, n = pts.length - 1, f = u * n, i = Math.floor(f), w = f - i;
      const q = [lerp(pts[i][0], pts[i + 1][0], w), lerp(pts[i][1], pts[i + 1][1], w), z0 + 0.002];
      pen.style(core, 5, ra).line(q[0], q[1], q[2], q[0], q[1], q[2]);
    }
    dram.forEach(([cx], k) => { for (let b = 0; b < 8; b++) { const x = cx - 3.5 + b; const [xa, ya] = P(x, 12.2), [, yb] = P(x, 4.2); pen.style(ash, 1, 0.55 * ra).line(xa, ya, z0 + 0.001, xa, yb, z0 + 0.001); if (hash(k, b, Math.floor(o.flow * 40)) > 0.75) { const yy = lerp(ya, yb, (o.flow * 6 + b * 0.13) % 1); pen.style(gold, 3, ra).line(xa, yy, z0 + 0.002, xa, yy, z0 + 0.002); } } });
  }
  // ---- the opened package: die with 8 bank groups × 4 banks, sense amps, row decoders, centre pad row
  if (o.open > 0) {
    const [cx, cy] = P(dram[2][0], dram[2][1]);
    const zl = z0 + 1.2 * S + o.lift * 1.1 + 0.25 + o.open * 0.6;
    const DW = 1.9 * o.open, DH = 1.5 * o.open;
    pen.style(gold, 1.8, 1).poly([[cx - DW / 2, cy - DH / 2, zl], [cx + DW / 2, cy - DH / 2, zl], [cx + DW / 2, cy + DH / 2, zl], [cx - DW / 2, cy + DH / 2, zl]], true);
    // centre pad row (DRAM dies bond along the middle)
    for (let k = 0; k < 24; k++) { const x = cx - DW * 0.45 + (k / 23) * DW * 0.9; pen.style(gold, 2, o.open).line(x, cy, zl, x, cy, zl); }
    for (let bg = 0; bg < 8; bg++) for (let b = 0; b < 4; b++) {
      const col = bg % 4, row = bg < 4 ? 1 : -1;
      const bx = cx - DW / 2 + DW * (0.04 + col * 0.24) + (b % 2) * DW * 0.11, by = cy + row * (DH * 0.1 + (b < 2 ? 0 : DH * 0.19)) + (row < 0 ? -DH * 0.17 : 0);
      const bw = DW * 0.1, bh = DH * 0.16;
      const act = hash(bg, b, Math.floor(o.flow * 8)) > 0.7;
      pen.style(act ? gold : bone, 1.1, o.open * (act ? 1 : 0.6)).poly([[bx, by, zl], [bx + bw, by, zl], [bx + bw, by + bh, zl], [bx, by + bh, zl]], true);
      for (let r = 1; r < 5; r++) pen.style(graph, 1, o.open * 0.7).line(bx, by + (bh * r) / 5, zl, bx + bw, by + (bh * r) / 5, zl); // cell rows
      pen.style(ash, 1, o.open).line(bx + bw * 0.08, by, zl, bx + bw * 0.08, by + bh, zl); // row decoder
      if (act) { const ry = by + bh * ((o.flow * 5 + b * 0.2) % 1); pen.style(core, 2.2, o.open).line(bx, ry, zl, bx + bw, ry, zl); } // the opened row
    }
    // bond wires from the die down to the package
    for (let k = 0; k < 10; k++) { const x = cx - DW * 0.4 + k * DW * 0.09; pen.style(gold, 1, 0.4 * o.open).line(x, cy, zl, x, cy - 0.2, zl - 0.6 * o.open); }
  }
}
