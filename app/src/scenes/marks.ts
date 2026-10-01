// Line-art renditions of the bidders' marks (as heads on suited figures in the "bids go high" auction):
// OpenAI blossom, Claude spark (Anthropic), Google G, Meta loop, xAI X, Microsoft four squares.
// Drawn monochrome in the film's palette, at radius r around (x, y).
import { trace, circle, rect, rrect, rgbaHex, GOLD, BONE, INK, type C2, type P } from './vec';

const stadium = (cx: number, cy: number, len: number, rad: number, ang: number): P[] => {
  const pts: P[] = []; const ca = Math.cos(ang), sa = Math.sin(ang);
  const L = (u: number, v: number): P => [cx + u * ca - v * sa, cy + u * sa + v * ca];
  for (let k = 0; k <= 12; k++) { const a = -Math.PI / 2 + (k / 12) * Math.PI; pts.push(L(len / 2 + Math.cos(a) * rad, Math.sin(a) * rad)); }
  for (let k = 0; k <= 12; k++) { const a = Math.PI / 2 + (k / 12) * Math.PI; pts.push(L(-len / 2 + Math.cos(a) * rad, Math.sin(a) * rad)); }
  return pts;
};

export function mark(c: C2, name: string, x: number, y: number, r: number, col = BONE, w = 3, t = 0) {
  if (name === 'OpenAI') {
    // six interlocking rounded links around a hexagonal hole
    for (let k = 0; k < 6; k++) {
      const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
      const cx = x + Math.cos(a) * r * 0.36, cy = y + Math.sin(a) * r * 0.36;
      trace(c, stadium(cx, cy, r * 0.62, r * 0.2, a + Math.PI / 2), w, col, 0, true);
    }
  } else if (name === 'Anthropic') {
    // the Claude spark: irregular rays radiating from the centre
    const n = 12;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + 0.13 + Math.sin(k * 2.3) * 0.08;
      const L = r * (0.62 + 0.3 * (((k * 7) % 5) / 4));
      const ww = r * 0.075;
      const nx = -Math.sin(a), ny = Math.cos(a);
      const p0: P = [x + Math.cos(a) * r * 0.12 + nx * ww, y + Math.sin(a) * r * 0.12 + ny * ww];
      const p1: P = [x + Math.cos(a) * L, y + Math.sin(a) * L];
      const p2: P = [x + Math.cos(a) * r * 0.12 - nx * ww, y + Math.sin(a) * r * 0.12 - ny * ww];
      c.fillStyle = rgbaHex(col, 0.9); c.beginPath(); c.moveTo(p0[0], p0[1]); c.lineTo(p1[0], p1[1]); c.lineTo(p2[0], p2[1]); c.closePath(); c.fill();
    }
    void t;
  } else if (name === 'Google') {
    // G: an open ring with the crossbar
    const R = r * 0.62;
    c.strokeStyle = col; c.lineWidth = r * 0.2; c.lineCap = 'butt';
    c.beginPath(); c.arc(x, y, R, -0.28 * Math.PI * 0.9, -0.28 * Math.PI * 0.9 - Math.PI * 1.72, true); c.stroke();
    c.beginPath(); c.moveTo(x + R + r * 0.1, y); c.lineTo(x + r * 0.02, y); c.stroke();
    c.beginPath(); c.moveTo(x + R + r * 0.1 - r * 0.0, y - r * 0.1); c.lineTo(x + R + r * 0.1, y + r * 0.35); c.stroke();
  } else if (name === 'Meta') {
    // the loop: an asymmetric infinity, thick stroke
    const pts: P[] = [];
    for (let k = 0; k <= 80; k++) { const s = (k / 80) * Math.PI * 2; const den = 1 + Math.sin(s) * Math.sin(s); pts.push([x + (r * 0.78 * Math.cos(s)) / den, y + (r * 0.62 * Math.sin(s) * Math.cos(s)) / den * (Math.cos(s) > 0 ? 1.15 : 0.9)]); }
    trace(c, pts, r * 0.16, col, 0, true);
  } else if (name === 'xAI') {
    // X: a long heavy diagonal, and a broken counter-stroke
    c.strokeStyle = col; c.lineCap = 'butt';
    c.lineWidth = r * 0.17; c.beginPath(); c.moveTo(x - r * 0.55, y - r * 0.62); c.lineTo(x + r * 0.55, y + r * 0.62); c.stroke();
    c.lineWidth = r * 0.12; c.beginPath(); c.moveTo(x + r * 0.62, y - r * 0.72); c.lineTo(x + r * 0.12, y - r * 0.12); c.stroke();
    c.beginPath(); c.moveTo(x - r * 0.12, y + r * 0.12); c.lineTo(x - r * 0.55, y + r * 0.62); c.stroke();
  } else if (name === 'Microsoft') {
    const s = r * 0.5, g = r * 0.06;
    for (let q = 0; q < 4; q++) { const ox = q % 2 ? g / 2 : -s - g / 2, oy = q < 2 ? -s - g / 2 : g / 2; rect(c, x + ox, y + oy, s, s, col, 0, 1, rgbaHex(col, q === 0 ? 0.95 : q === 3 ? 0.55 : 0.75)); }
  }
}

/** A suited bidder (feet at x, y; height h) with a mark for a head, raising a numbered paddle by `raise` (0..1). */
export function bidder(c: C2, name: string, x: number, y: number, h: number, num: string, raise: number, hot: boolean, t: number) {
  const S = h / 1000, X = (u: number) => x + u * S, Y = (v: number) => y - v * S;
  const col = hot ? GOLD : BONE, lw = Math.max(2, 3 * S * 2);
  const poly = (pts: [number, number][], close = true, fill?: string) => {
    const P2: P[] = pts.map(([u, v]) => [X(u), Y(v)]);
    if (fill) { c.fillStyle = fill; c.beginPath(); P2.forEach(([a, b], k) => (k ? c.lineTo(a, b) : c.moveTo(a, b))); c.closePath(); c.fill(); }
    trace(c, P2, lw, col, hot ? 0.8 : 0, close);
  };
  // legs (trousers), shoes
  poly([[-70, 0], [-58, 420], [-6, 420], [-14, 0]], true, INK); poly([[14, 0], [6, 420], [58, 420], [70, 0]], true, INK);
  poly([[-90, 0], [-10, 0], [-12, 22], [-84, 22]], true, INK); poly([[10, 0], [90, 0], [84, 22], [12, 22]], true, INK);
  // jacket: shoulders, lapels, buttons
  poly([[-130, 760], [-150, 520], [-120, 380], [120, 380], [150, 520], [130, 760], [40, 790], [-40, 790]], true, INK);
  trace(c, [[X(-40), Y(790)], [X(0), Y(600)], [X(40), Y(790)]], lw * 0.7, col, 0);
  trace(c, [[X(0), Y(600)], [X(0), Y(400)]], lw * 0.5, col, 0);
  for (const v of [540, 470]) circle(c, X(14), Y(v), 5 * S * 2, col, lw * 0.5, 1);
  // tie
  poly([[-12, 785], [12, 785], [18, 640], [0, 610], [-18, 640]], true, rgbaHex(GOLD, hot ? 0.4 : 0.12));
  // left arm down; right arm raises the paddle
  poly([[-130, 750], [-175, 560], [-170, 400], [-140, 400], [-140, 560], [-110, 700]], true, INK);
  const ang = -0.2 - raise * 1.1;
  const sx = 130, sy = 740, ex = sx + Math.cos(ang - 0.6) * 200, ey = sy + Math.sin(-(ang - 0.6)) * -200;
  const hx = ex + Math.cos(-ang * 0.6 + 1.1) * 190, hy = ey + 170 * (0.3 + raise);
  trace(c, [[X(sx), Y(sy)], [X(ex), Y(ey)], [X(hx), Y(hy)]], lw * 2.6, INK, 0);
  trace(c, [[X(sx), Y(sy)], [X(ex), Y(ey)], [X(hx), Y(hy)]], lw, col, 0);
  // paddle
  const pw = 150, ph = 170;
  trace(c, [[X(hx), Y(hy)], [X(hx), Y(hy + 90)]], lw, col, 0);
  rrect(c, X(hx - pw / 2), Y(hy + 90 + ph), pw * S, ph * S, 12 * S, col, lw, 1, hot ? rgbaHex(GOLD, 0.2) : 'rgba(10,11,14,0.95)');
  c.fillStyle = col; c.textAlign = 'center'; c.font = `700 ${Math.round(70 * S)}px Mart`; c.fillText(num, X(hx), Y(hy + 90 + ph / 2) + 24 * S); c.textAlign = 'left';
  // neck and the mark as the head
  trace(c, [[X(-26), Y(790)], [X(-22), Y(830)]], lw, col, 0); trace(c, [[X(26), Y(790)], [X(22), Y(830)]], lw, col, 0);
  circle(c, X(0), Y(950), 125 * S, col, lw, 1, 'rgba(10,11,14,0.96)');
  mark(c, name, X(0), Y(950), 105 * S, col, lw, t);
}
