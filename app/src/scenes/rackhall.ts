// An AI data hall as 3D line art: a cold aisle between two rows of liquid-cooled racks (GB200 NVL72-style layout:
// power shelves top and bottom, 18 1U compute trays, 9 NVLink switch trays in the middle), overhead busway with
// tap-off boxes, cable ladders, containment roof and light strips, perforated floor tiles in the cold aisle.
// The aisle is generated around the camera, so it never ends; distance fades it into the dark.
import { Pen, linCol, type RGB } from '../engine/lines';
import { hash } from '../engine/util';

const bone = linCol('#ece9e2', 0.6), ash = linCol('#8b8f99', 0.45), gold = linCol('#ffb21e', 2.4), core = linCol('#ffe7b0', 3.4), graph = linCol('#474b55', 0.8);
const PITCH = 0.62; // rack width along the aisle
const H = 2.25, D = 1.2; // rack height, depth

/** One rack whose front faces the aisle (side = −1: left row, faces +x; +1: right row, faces −x). */
function rack(pen: Pen, x: number, z: number, side: number, idx: number, t: number, fade: number) {
  const fx = x - side * (D / 2); // front face plane
  const a = fade;
  pen.style(bone, 1.2, 0.85 * a).box(x, H / 2, z, D, H, PITCH * 0.96);
  const z0 = z - PITCH * 0.44, z1 = z + PITCH * 0.44;
  const unit = (H - 0.12) / 42; // 42U
  const U = (u: number) => 0.06 + u * unit;
  const row = (u0: number, nU: number, kind: 'psu' | 'comp' | 'nvl', k: number) => {
    const y0 = U(u0), y1 = U(u0 + nU);
    pen.style(bone, 1, 0.55 * a).poly([[fx, y0, z0], [fx, y0, z1], [fx, y1, z1], [fx, y1, z0]], true);
    if (a < 0.25) return; // far racks: outlines only
    if (kind === 'comp') {
      // handles at both ends, 4 E1.S bays, status LED
      pen.style(ash, 1, a).line(fx, y0 + unit * 0.2, z0 + 0.02, fx, y1 - unit * 0.2, z0 + 0.02);
      pen.style(ash, 1, a).line(fx, y0 + unit * 0.2, z1 - 0.02, fx, y1 - unit * 0.2, z1 - 0.02);
      for (let b = 0; b < 4; b++) { const zb = z0 + 0.08 + b * 0.07; pen.style(graph, 1, a).poly([[fx, y0 + unit * 0.25, zb], [fx, y0 + unit * 0.25, zb + 0.05], [fx, y1 - unit * 0.25, zb + 0.05], [fx, y1 - unit * 0.25, zb]], true); }
      const on = hash(idx, k, Math.floor(t * 6 + hash(idx, k) * 6)) > 0.3;
      const c: RGB = on ? gold : graph;
      pen.style(c, 3.2, a).line(fx, (y0 + y1) / 2, z1 - 0.07, fx, (y0 + y1) / 2, z1 - 0.07);
      pen.style(core, 2.4, a * (hash(idx, k, Math.floor(t * 14)) > 0.6 ? 1 : 0.2)).line(fx, (y0 + y1) / 2, z1 - 0.11, fx, (y0 + y1) / 2, z1 - 0.11);
    } else if (kind === 'nvl') {
      // a row of OSFP-style ports and the copper spine cables looping out
      for (let p = 0; p < 9; p++) { const zp = z0 + 0.05 + p * 0.055; pen.style(ash, 1, a).line(fx, y0 + unit * 0.3, zp, fx, y1 - unit * 0.3, zp); }
      const sag: number[][] = []; for (let s = 0; s <= 8; s++) { const u = s / 8; sag.push([fx - side * 0.02 * Math.sin(u * Math.PI), (y0 + y1) / 2 - 0.02 * Math.sin(u * Math.PI), z0 + 0.03 + u * (z1 - z0 - 0.06)]); }
      pen.style(gold, 1, 0.4 * a).poly(sag);
    } else {
      // power shelf: 6 PSUs, each with a LED
      for (let p = 0; p < 6; p++) { const zp = z0 + 0.02 + p * 0.088; pen.style(ash, 1, a).line(fx, y0, zp, fx, y1, zp); pen.style(gold, 2.4, a * 0.9).line(fx, y1 - unit * 0.4, zp + 0.04, fx, y1 - unit * 0.4, zp + 0.04); }
    }
  };
  let u = 0;
  for (let k = 0; k < 2; k++, u += 2) row(u, 2, 'psu', k);
  for (let k = 0; k < 10; k++, u += 1) row(u, 1, 'comp', k);
  for (let k = 0; k < 9; k++, u += 1) row(u, 1, 'nvl', 20 + k);
  for (let k = 0; k < 8; k++, u += 1) row(u, 1, 'comp', 40 + k);
  for (let k = 0; k < 2; k++, u += 2) row(u, 2, 'psu', 60 + k);
  // liquid-cooling manifolds at the rear corners
  if (a > 0.25) { const rx = x + side * (D / 2 - 0.05); pen.style(gold, 1.4, 0.55 * a).line(rx, 0.1, z0 + 0.03, rx, H - 0.1, z0 + 0.03); pen.style(bone, 1.4, 0.4 * a).line(rx, 0.1, z1 - 0.03, rx, H - 0.1, z1 - 0.03); }
}

/** Draw the hall around camera z (camZ); the aisle runs along −z. */
export function drawHall(pen: Pen, camZ: number, t: number, depth = 80) {
  const k0 = Math.floor((camZ + 3) / PITCH), k1 = Math.floor((camZ - depth) / PITCH);
  for (let k = k0; k >= k1; k--) {
    const z = k * PITCH, dist = camZ - z;
    const fade = Math.max(0, Math.min(1, Math.exp(-Math.max(0, dist) / 22) * 1.15));
    if (fade < 0.02) continue;
    rack(pen, -1.5, z, -1, k * 2, t, fade);
    rack(pen, 1.5, z, 1, k * 2 + 1, t, fade);
    // floor: cold-aisle perforated tiles between the rows; plain tiles behind
    pen.style(ash, 1, 0.35 * fade).line(-3.4, 0, z, 3.4, 0, z);
    if (fade > 0.3 && k % 1 === 0) for (let p = 0; p < 6; p++) pen.style(graph, 1.8, 0.7 * fade).line(-0.75 + p * 0.3, 0.001, z - PITCH / 2, -0.75 + p * 0.3, 0.001, z - PITCH / 2);
    // containment roof frame + light strip, busway with a tap-off box per rack, cable ladder rungs
    pen.style(bone, 1, 0.5 * fade).line(-0.9, H + 0.25, z, 0.9, H + 0.25, z);
    pen.style(gold, 1.2, 0.35 * fade).box(-1.5, H + 0.48, z, 0.18, 0.12, 0.14); pen.style(gold, 1.2, 0.35 * fade).box(1.5, H + 0.48, z, 0.18, 0.12, 0.14);
    pen.style(ash, 1, 0.4 * fade).line(-1.8, H + 0.85, z, -1.2, H + 0.85, z); pen.style(ash, 1, 0.4 * fade).line(1.2, H + 0.85, z, 1.8, H + 0.85, z);
  }
  // long runs along the aisle: floor rails, roof edges, light strips, busways, ladders, coolant mains
  const zA = camZ + 3, zB = camZ - depth;
  const run = (x: number, y: number, c: RGB, w: number, al: number) => {
    const n = 24; for (let s = 0; s < n; s++) { const za = zA + (zB - zA) * (s / n), zb = zA + (zB - zA) * ((s + 1) / n); const f = Math.exp(-Math.max(0, camZ - za) / 22); pen.style(c, w, al * f).line(x, y, za, x, y, zb); }
  };
  run(-0.9, H + 0.25, bone, 1.2, 0.7); run(0.9, H + 0.25, bone, 1.2, 0.7);
  run(-0.25, H + 0.24, core, 3, 0.6); run(0.25, H + 0.24, core, 3, 0.6);
  run(-1.5, H + 0.55, gold, 1.6, 0.6); run(1.5, H + 0.55, gold, 1.6, 0.6);
  run(-1.8, H + 0.85, ash, 1, 0.5); run(-1.2, H + 0.85, ash, 1, 0.5); run(1.2, H + 0.85, ash, 1, 0.5); run(1.8, H + 0.85, ash, 1, 0.5);
  run(-2.3, 0.35, gold, 2, 0.5); run(2.3, 0.35, gold, 2, 0.5); run(-2.3, 0.5, bone, 1.4, 0.4); run(2.3, 0.5, bone, 1.4, 0.4);
  run(-0.9, 0, ash, 1, 0.5); run(0.9, 0, ash, 1, 0.5);
}
