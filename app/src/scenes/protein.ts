// Protein toolkit: parse backbone atoms from a PDB file, assign secondary structure from HELIX/SHEET records,
// and build a cartoon (ribbon helices, arrowed strands, tube coils) oriented by the real carbonyl vectors.
// Geometry is cheap enough to rebuild per frame, so intermediate (folding) states can be drawn.
import * as THREE from 'three';

export interface Residue { n: number; name: string; N: THREE.Vector3; CA: THREE.Vector3; C: THREE.Vector3; O: THREE.Vector3; ss: 'H' | 'E' | 'C' }

const AA: Record<string, string> = { ALA: 'A', ARG: 'R', ASN: 'N', ASP: 'D', CYS: 'C', GLN: 'Q', GLU: 'E', GLY: 'G', HIS: 'H', ILE: 'I', LEU: 'L', LYS: 'K', MET: 'M', PHE: 'F', PRO: 'P', SER: 'S', THR: 'T', TRP: 'W', TYR: 'Y', VAL: 'V' };

export function parsePDB(txt: string): Residue[] {
  const res = new Map<number, Partial<Residue>>();
  const ssRanges: { a: number; b: number; ss: 'H' | 'E' }[] = [];
  for (const line of txt.split('\n')) {
    if (line.startsWith('HELIX')) ssRanges.push({ a: +line.slice(21, 25), b: +line.slice(33, 37), ss: 'H' });
    if (line.startsWith('SHEET')) ssRanges.push({ a: +line.slice(22, 26), b: +line.slice(33, 37), ss: 'E' });
    if (!line.startsWith('ATOM')) continue;
    const atom = line.slice(12, 16).trim();
    if (!['N', 'CA', 'C', 'O'].includes(atom)) continue;
    const n = +line.slice(22, 26);
    const v = new THREE.Vector3(+line.slice(30, 38), +line.slice(38, 46), +line.slice(46, 54));
    const r = res.get(n) ?? { n, name: line.slice(17, 20), ss: 'C' as const };
    (r as Record<string, unknown>)[atom] = v;
    res.set(n, r);
  }
  const out = [...res.values()].filter((r) => r.CA && r.O && r.C && r.N) as Residue[];
  out.sort((a, b) => a.n - b.n);
  for (const r of out) for (const s of ssRanges) if (r.n >= s.a && r.n <= s.b) r.ss = s.ss;
  // centre on the centroid
  const c = new THREE.Vector3();
  out.forEach((r) => c.add(r.CA));
  c.divideScalar(out.length);
  out.forEach((r) => { r.N.sub(c); r.CA.sub(c); r.C.sub(c); r.O.sub(c); });
  return out;
}

export const seqOf = (rs: Residue[]) => rs.map((r) => AA[r.name] ?? 'X').join('');

/**
 * Cartoon geometry (the standard ribbon representation, as in PyMOL / Mol*) from CA positions + carbonyl vectors:
 *  - control points: CA for helices and coils; for strands, the average of consecutive CAs, which removes the
 *    β-pleat zig-zag so strands read as flat, straight arrows;
 *  - orientation: the peptide-plane direction (C=O), sign-continuous and smoothed over three residues;
 *  - cross-sections: α/3₁₀ helices = flat ribbons, strands = flat arrows with ONE head at the C-terminal residue
 *    (1.6× wide, tapering to a point), coils = round tubes; widths blend across residue boundaries.
 * `grow` (0..1) reveals the chain from N- to C-terminus. Units are Å. A per-vertex residue index ('rid') is set.
 */
export function cartoon(ca: THREE.Vector3[], side: THREE.Vector3[], ss: ('H' | 'E' | 'C')[], opts: { sub?: number; coilR?: number; helixW?: number; sheetW?: number; thick?: number; grow?: number } = {}) {
  const S = opts.sub ?? 10, coilR = opts.coilR ?? 0.25, helixW = opts.helixW ?? 2.2, sheetW = opts.sheetW ?? 1.9, thick = opts.thick ?? 0.32;
  const n = ca.length;
  // control points
  const cp = ca.map((v, i) => {
    if (ss[i] === 'E' && i > 0 && i < n - 1 && (ss[i - 1] === 'E' || ss[i + 1] === 'E')) return v.clone().multiplyScalar(0.5).addScaledVector(ca[i - 1], 0.25).addScaledVector(ca[i + 1], 0.25);
    return v.clone();
  });
  // orientation: sign-continuous carbonyl directions, smoothed
  const sv = side.map((v) => v.clone().normalize());
  for (let i = 1; i < n; i++) if (sv[i].dot(sv[i - 1]) < 0) sv[i].negate();
  const sm = sv.map((v, i) => v.clone().add(sv[Math.max(0, i - 1)]).add(sv[Math.min(n - 1, i + 1)]).normalize());
  const cr = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, u: number) => {
    const u2 = u * u, u3 = u2 * u;
    return new THREE.Vector3(
      0.5 * (2 * b.x + (-a.x + c.x) * u + (2 * a.x - 5 * b.x + 4 * c.x - d.x) * u2 + (-a.x + 3 * b.x - 3 * c.x + d.x) * u3),
      0.5 * (2 * b.y + (-a.y + c.y) * u + (2 * a.y - 5 * b.y + 4 * c.y - d.y) * u2 + (-a.y + 3 * b.y - 3 * c.y + d.y) * u3),
      0.5 * (2 * b.z + (-a.z + c.z) * u + (2 * a.z - 5 * b.z + 4 * c.z - d.z) * u2 + (-a.z + 3 * b.z - 3 * c.z + d.z) * u3),
    );
  };
  const sec = (k: 'H' | 'E' | 'C'): [number, number] => (k === 'H' ? [helixW / 2, thick / 2] : k === 'E' ? [sheetW / 2, thick / 2] : [coilR, coilR]);
  const strandEnd = (i: number) => ss[i] === 'E' && (i + 1 >= n || ss[i + 1] !== 'E');
  const P: THREE.Vector3[] = [], Sd: THREE.Vector3[] = [], R: number[] = [], Ra: number[] = [], Rb: number[] = [];
  const last = Math.max(1, Math.floor((n - 1) * (opts.grow ?? 1)));
  for (let i = 0; i < last; i++) {
    const a = cp[Math.max(0, i - 1)], b = cp[i], c = cp[i + 1], d = cp[Math.min(n - 1, i + 2)];
    for (let s = 0; s < S; s++) {
      const u = s / S;
      P.push(cr(a, b, c, d, u));
      Sd.push(sm[i].clone().lerp(sm[i + 1], u).normalize());
      R.push(i + u);
      let [ra, rb] = sec(ss[i]);
      if (strandEnd(i)) { ra = sheetW * 0.8 * (1 - u) + 0.02; rb = thick / 2; }
      else {
        // blend into the next residue's section over the second half of the residue (no blend out of an arrowhead)
        const [na, nb] = sec(ss[i + 1]);
        const k = Math.max(0, (u - 0.5) * 2);
        if (ss[i] !== ss[i + 1]) { ra = ra + (na - ra) * k; rb = rb + (nb - rb) * k; }
      }
      Ra.push(ra); Rb.push(rb);
    }
  }
  P.push(cp[last].clone()); Sd.push(sm[last].clone()); R.push(last); Ra.push(coilR); Rb.push(coilR);
  // sweep an elliptical / rounded-rectangle section along the spline
  const M = 12;
  const pos: number[] = [], nor: number[] = [], rid: number[] = [], idx: number[] = [];
  const T = new THREE.Vector3(), N = new THREE.Vector3(), B = new THREE.Vector3();
  for (let k = 0; k < P.length; k++) {
    const p0 = P[Math.max(0, k - 1)], p1 = P[Math.min(P.length - 1, k + 1)];
    T.subVectors(p1, p0).normalize();
    N.copy(Sd[k]).addScaledVector(T, -Sd[k].dot(T)).normalize();
    B.crossVectors(T, N).normalize();
    const flat = Ra[k] > Rb[k] * 1.5;
    for (let m = 0; m < M; m++) {
      const th = (m / M) * Math.PI * 2;
      const cx = Math.cos(th), sx = Math.sin(th);
      const e = flat ? 0.3 : 1;
      const fx = Math.sign(cx) * Math.pow(Math.abs(cx), e), fy = Math.sign(sx) * Math.pow(Math.abs(sx), e);
      const q = P[k].clone().addScaledVector(N, fx * Ra[k]).addScaledVector(B, fy * Rb[k]);
      pos.push(q.x, q.y, q.z);
      const nn = N.clone().multiplyScalar(cx / Math.max(0.05, Ra[k])).addScaledVector(B, sx / Math.max(0.05, Rb[k])).normalize();
      nor.push(nn.x, nn.y, nn.z);
      rid.push(R[k]);
    }
  }
  for (let k = 0; k < P.length - 1; k++) for (let m = 0; m < M; m++) {
    const a = k * M + m, b = k * M + ((m + 1) % M), c = (k + 1) * M + m, d = (k + 1) * M + ((m + 1) % M);
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('rid', new THREE.Float32BufferAttribute(rid, 1));
  g.setIndex(idx);
  return g;
}

/** Contact map (CA–CA distance < cutoff) as an RGBA image. */
export function contactMap(rs: Residue[], size: number, sharp: number) {
  const n = rs.length;
  const img = new ImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = Math.floor((x / size) * n), j = Math.floor((y / size) * n);
    const d = rs[i].CA.distanceTo(rs[j].CA);
    const v = Math.exp(-Math.max(0, d - 3.8) / (2 + 14 * (1 - sharp)));
    const o = (y * size + x) * 4;
    img.data[o] = 255 * Math.min(1, v * 1.2); img.data[o + 1] = 178 * v; img.data[o + 2] = 30 * v; img.data[o + 3] = 255;
  }
  return img;
}
