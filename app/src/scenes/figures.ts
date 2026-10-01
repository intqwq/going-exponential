// Original figures in clean line art.
//  - god(): a faceless robed figure, veiled head, halo, arms that open in welcome (open 0..1) or reach out (reach 0..1).
//  - human(): a small standing person.
import { trace, circle, scan, rgbaHex, GOLD, BONE, INK, type C2, type P } from './vec';
import { lerp } from '../engine/util';

/** Draw the god with feet at (x, y) and height h. */
export function god(c: C2, x: number, y: number, h: number, o: { open?: number; reach?: number; glow?: number; aura?: number; t?: number } = {}) {
  const open = o.open ?? 1, reach = o.reach ?? 0, glow = o.glow ?? 1, aura = o.aura ?? 1, t = o.t ?? 0;
  const S = h / 1000;
  const X = (u: number) => x + u * S, Y = (v: number) => y + v * S;
  const pt = (u: number, v: number): P => [X(u), Y(v)];
  // aura
  if (aura > 0) {
    // round glow that fades out inside the canvas (a rect fill shows the card's edges as hard lines)
    const RG = Math.max(10, Math.min(700 * S, X(0), c.canvas.width - X(0), Y(-720), c.canvas.height - Y(-720)));
    const g = c.createRadialGradient(X(0), Y(-720), 0, X(0), Y(-720), RG);
    g.addColorStop(0, rgbaHex(GOLD, 0.22 * aura)); g.addColorStop(0.45, rgbaHex(GOLD, 0.06 * aura)); g.addColorStop(1, rgbaHex(GOLD, 0));
    c.fillStyle = g; c.beginPath(); c.arc(X(0), Y(-720), RG, 0, Math.PI * 2); c.fill();
    // fine rays
    for (let k = 0; k < 72; k++) {
      const a = (k / 72) * Math.PI * 2 + t * 0.07;
      const r0 = 150, r1 = 260 + (k % 3) * 120 + (k % 7) * 30;
      c.strokeStyle = rgbaHex(GOLD, (k % 3 === 0 ? 0.35 : 0.14) * aura); c.lineWidth = (k % 3 === 0 ? 2 : 1) * Math.max(1, S * 1.5);
      c.beginPath(); c.moveTo(X(Math.cos(a) * r0), Y(-860 + Math.sin(a) * r0)); c.lineTo(X(Math.cos(a) * r1), Y(-860 + Math.sin(a) * r1)); c.stroke();
    }
  }
  // arms (shoulder → elbow → hand), each side; sleeves hang from the arm
  const arm = (side: 1 | -1) => {
    const sh: P = [115 * side, -760];
    const r = side === 1 ? reach : 0;
    const hand: P = [lerp(lerp(150, 430, open), 560, r) * side, lerp(lerp(-420, -640, open), -735, r)];
    const elbow: P = [lerp(lerp(150, 290, open), 340, r) * side, lerp(lerp(-590, -690, open), -748, r)];
    // sleeve: a wide drape from upper arm to below the forearm
    const sleeve: P[] = [sh, elbow, [hand[0] - 40 * side, hand[1] + 20], [lerp(elbow[0], hand[0], 0.5), hand[1] + 150 - 60 * r], [elbow[0] * 0.7, elbow[1] + 210 - 80 * r], [sh[0] * 0.9, -520]];
    c.fillStyle = INK; c.beginPath(); sleeve.forEach(([u, v], k) => (k ? c.lineTo(X(u), Y(v)) : c.moveTo(X(u), Y(v)))); c.closePath(); c.fill();
    trace(c, sleeve.map(([u, v]) => pt(u, v)), 2.5 * Math.max(1, S * 1.4), GOLD, glow, true);
    // hand: open palm, upturned when welcoming
    const hx = hand[0], hy = hand[1];
    const palm: P[] = [[hx - 25 * side, hy - 6], [hx + 30 * side, hy - 18], [hx + 62 * side, hy - 14 - 30 * r], [hx + 30 * side, hy + 10], [hx - 20 * side, hy + 18]];
    trace(c, palm.map(([u, v]) => pt(u, v)), 2 * Math.max(1, S * 1.4), GOLD, glow, true);
  };
  // robe body
  const sway = Math.sin(t * 0.9) * 10;
  const robe: P[] = [[-112, -770], [-150, -520], [-200, -260], [-262 + sway, -20], [-150 + sway, 6], [0 + sway * 0.6, -8], [150 + sway, 6], [262 + sway, -20], [200, -260], [150, -520], [112, -770], [60, -800], [0, -790], [-60, -800]];
  c.fillStyle = INK; c.beginPath(); robe.forEach(([u, v], k) => (k ? c.lineTo(X(u), Y(v)) : c.moveTo(X(u), Y(v)))); c.closePath(); c.fill();
  trace(c, robe.map(([u, v]) => pt(u, v)), 3 * Math.max(1, S * 1.4), GOLD, glow, true);
  // folds
  [[-60, -700, -120, -40], [0, -720, 10, -30], [60, -700, 120, -40], [-110, -560, -200, -40], [110, -560, 200, -40]].forEach(([u0, v0, u1, v1], k) => {
    const pts: P[] = [];
    for (let s = 0; s <= 16; s++) { const f = s / 16; pts.push(pt(lerp(u0, u1, f) + Math.sin(f * 3 + k + t * 0.7) * 10, lerp(v0, v1, f))); }
    trace(c, pts, 1.5 * Math.max(1, S * 1.2), BONE, 0, false);
  });
  // a gold sash at the waist
  trace(c, [pt(-150, -520), pt(0, -505), pt(150, -520)], 3 * Math.max(1, S * 1.4), GOLD, glow);
  arm(-1); arm(1);
  // veiled head: smooth, faceless oval under a hood
  const hood: P[] = [];
  for (let k = 0; k <= 40; k++) { const a = Math.PI * (0.05 + 0.9 * (k / 40)) + Math.PI; hood.push(pt(Math.cos(a) * 95, -860 + Math.sin(a) * 118)); }
  hood.push(pt(105, -790), pt(-105, -790));
  c.fillStyle = INK; c.beginPath(); hood.forEach(([u, v], k) => (k ? c.lineTo(u, v) : c.moveTo(u, v))); c.closePath(); c.fill();
  trace(c, hood, 2.5 * Math.max(1, S * 1.4), GOLD, glow, true);
  c.fillStyle = rgbaHex(GOLD, 0.12 * glow); c.beginPath(); c.ellipse(X(0), Y(-850), 52 * S, 66 * S, 0, 0, Math.PI * 2); c.fill();
  circle(c, X(0), Y(-850), 0, GOLD, 0);
  c.strokeStyle = rgbaHex(GOLD, 0.9); c.lineWidth = 2 * Math.max(1, S * 1.4); c.beginPath(); c.ellipse(X(0), Y(-850), 52 * S, 66 * S, 0, 0, Math.PI * 2); c.stroke();
  // halo
  c.strokeStyle = rgbaHex(GOLD, 0.25 * glow); c.lineWidth = 14 * S; c.beginPath(); c.arc(X(0), Y(-870), 150 * S, 0, Math.PI * 2); c.stroke();
  c.strokeStyle = rgbaHex(GOLD, 0.95); c.lineWidth = 3 * Math.max(1, S * 1.4); c.beginPath(); c.arc(X(0), Y(-870), 150 * S, 0, Math.PI * 2); c.stroke();
  // the beam keeps retracing the figure: one spot around the robe, one around the halo
  if (glow > 0.3) {
    const lw = 2.5 * Math.max(1, S * 1.4);
    scan(c, robe.map(([u, v]) => pt(u, v)), t * 0.23, 0.16, lw);
    const halo: P[] = []; for (let k = 0; k < 64; k++) { const a = (k / 64) * Math.PI * 2; halo.push(pt(Math.cos(a) * 150, -870 + Math.sin(a) * 150)); }
    scan(c, halo, -t * 0.41, 0.22, lw);
  }
}

/** A small standing person (line art), feet at (x, y). */
export function human(c: C2, x: number, y: number, h: number, col = BONE, w = 2, wave = 0) {
  const S = h / 100;
  circle(c, x, y - 90 * S, 9 * S, col, w);
  trace(c, [[x, y - 80 * S], [x, y - 40 * S]], w, col, 0);
  trace(c, [[x - 14 * S, y], [x, y - 40 * S], [x + 14 * S, y]], w, col, 0);
  trace(c, [[x - 18 * S, y - 50 * S], [x, y - 72 * S], [x + 18 * S, y - 50 * S - wave * 30 * S]], w, col, 0);
}
