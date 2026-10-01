// GPU line batches (after mexicat/pdoom-video's engine/lines.ts): thousands of anti-aliased capsule segments per
// frame, drawn as instanced quads. In 3D they live in a three.js scene like any mesh (depth-tested against solids,
// blurred by the DOF pass), so models can be drawn as clean, glowing line art at GPU speed: the oscilloscope look.
// A Pen adds a model matrix and shape helpers (polylines, rings, boxes, cylinders, helices) on top.
import * as THREE from 'three';

const VERT = /* glsl */ `
precision highp float;
in vec3 position;          // quad corner: x in {0,1} along segment, y in {-1,1} across
in vec3 iA; in vec3 iB;     // segment endpoints (world)
in vec4 iColor;             // linear rgb * intensity, alpha
in float iWidth;            // px, or world units if worldWidth
uniform mat4 projectionMatrix; uniform mat4 modelViewMatrix;
uniform vec2 res; uniform bool screen2D; uniform bool worldWidth; uniform float widthScale; uniform float fade;
out vec2 vLocal; out float vLen; out float vHalfW; out vec4 vColor;
vec4 toClip(vec3 p) {
  if (screen2D) return vec4(p.x / res.x * 2.0 - 1.0, 1.0 - p.y / res.y * 2.0, 0.0, 1.0);
  return projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
void main() {
  vec4 ca = toClip(iA), cb = toClip(iB);
  // clip against the near plane: pull the behind-camera end onto it
  float nz = 0.001;
  if (ca.w <= nz && cb.w <= nz) { gl_Position = vec4(2.0, 2.0, 2.0, 1.0); return; }
  if (ca.w <= nz) ca = mix(ca, cb, (nz - ca.w) / (cb.w - ca.w));
  if (cb.w <= nz) cb = mix(cb, ca, (nz - cb.w) / (ca.w - cb.w));
  vec2 sa = ca.xy / ca.w * 0.5 * res, sb = cb.xy / cb.w * 0.5 * res;
  float w = iWidth * widthScale;
  if (worldWidth && !screen2D) {
    float pa = projectionMatrix[1][1] * 0.5 * res.y / ca.w, pb = projectionMatrix[1][1] * 0.5 * res.y / cb.w;
    w = iWidth * widthScale * mix(pa, pb, position.x);
  }
  float hw = max(w * 0.5, 0.35) + 1.0;
  vec2 d = sb - sa; float len = length(d);
  vec2 dir = len > 1e-4 ? d / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float along = mix(-hw, len + hw, position.x);
  vec2 p = sa + dir * along + nrm * position.y * hw;
  float z = mix(ca.z / ca.w, cb.z / cb.w, position.x);
  gl_Position = vec4(p / (0.5 * res), z, 1.0);
  vLocal = vec2(along, position.y * hw);
  vLen = len; vHalfW = max(w * 0.5, 0.35);
  vColor = iColor * vec4(1.0, 1.0, 1.0, min(1.0, w / 0.7) * fade);
}`;

const FRAG = /* glsl */ `
precision highp float;
in vec2 vLocal; in float vLen; in float vHalfW; in vec4 vColor;
out vec4 fragColor;
void main() {
  float x = clamp(vLocal.x, 0.0, vLen);
  float d = length(vec2(vLocal.x - x, vLocal.y)) - vHalfW;
  float a = clamp(0.5 - d, 0.0, 1.0) * vColor.a;
  if (a <= 0.0) discard;
  fragColor = vec4(vColor.rgb * a, a);
}`;

export type LineBlend = 'add' | 'max' | 'normal';
export type RGB = [number, number, number];

export class LineBatch {
  mesh: THREE.Mesh;
  geo: THREE.InstancedBufferGeometry;
  mat: THREE.RawShaderMaterial;
  private a: Float32Array; private b: Float32Array; private c: Float32Array; private w: Float32Array;
  private attrs: THREE.InstancedBufferAttribute[];
  count = 0;

  constructor(capacity: number, opts: { screen2D?: boolean; worldWidth?: boolean; blend?: LineBlend; depthTest?: boolean; depthWrite?: boolean } = {}) {
    this.geo = new THREE.InstancedBufferGeometry();
    const quad = new Float32Array([0, -1, 0, 1, -1, 0, 1, 1, 0, 0, 1, 0]);
    this.geo.setAttribute('position', new THREE.BufferAttribute(quad, 3));
    this.geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.a = new Float32Array(capacity * 3); this.b = new Float32Array(capacity * 3);
    this.c = new Float32Array(capacity * 4); this.w = new Float32Array(capacity);
    this.attrs = [
      new THREE.InstancedBufferAttribute(this.a, 3), new THREE.InstancedBufferAttribute(this.b, 3),
      new THREE.InstancedBufferAttribute(this.c, 4), new THREE.InstancedBufferAttribute(this.w, 1),
    ];
    this.attrs.forEach((x) => x.setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('iA', this.attrs[0]); this.geo.setAttribute('iB', this.attrs[1]);
    this.geo.setAttribute('iColor', this.attrs[2]); this.geo.setAttribute('iWidth', this.attrs[3]);
    const blend = opts.blend ?? 'add';
    this.mat = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3, vertexShader: VERT, fragmentShader: FRAG,
      uniforms: {
        res: { value: new THREE.Vector2(1920, 1080) }, screen2D: { value: opts.screen2D ?? false },
        worldWidth: { value: !!opts.worldWidth }, widthScale: { value: 1 }, fade: { value: 1 },
      },
      // lines write depth by default so the DOF pass focuses them like solids (otherwise they read as background)
      transparent: true, depthWrite: opts.depthWrite ?? true, depthTest: opts.depthTest ?? true, blending: THREE.CustomBlending,
    });
    const m = this.mat;
    m.blendEquation = blend === 'max' ? THREE.MaxEquation : THREE.AddEquation;
    m.blendSrc = THREE.OneFactor;
    m.blendDst = blend === 'normal' ? THREE.OneMinusSrcAlphaFactor : THREE.OneFactor;
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    this.mesh.onBeforeRender = () => this.upload();
  }

  get capacity() { return this.w.length; }
  clear() { this.count = 0; }
  set fade(k: number) { this.mat.uniforms.fade.value = k; }

  /** Add a segment (world coords). Colour is LINEAR rgb (may exceed 1 to bloom), alpha 0..1. */
  seg(ax: number, ay: number, az: number, bx: number, by: number, bz: number, width: number, r: number, g: number, bl: number, alpha = 1) {
    if (this.count >= this.capacity || alpha <= 0.001) return;
    const i = this.count++;
    this.a[i * 3] = ax; this.a[i * 3 + 1] = ay; this.a[i * 3 + 2] = az;
    this.b[i * 3] = bx; this.b[i * 3 + 1] = by; this.b[i * 3 + 2] = bz;
    this.c[i * 4] = r; this.c[i * 4 + 1] = g; this.c[i * 4 + 2] = bl; this.c[i * 4 + 3] = alpha;
    this.w[i] = width;
  }
  private upload() {
    for (const at of this.attrs) { at.needsUpdate = true; at.clearUpdateRanges(); at.addUpdateRange(0, this.count * at.itemSize); }
    this.geo.instanceCount = this.count;
  }
}

/** A pen over a LineBatch: a model matrix stack and shape helpers, all in local coordinates. */
export class Pen {
  m = new THREE.Matrix4();
  private stack: THREE.Matrix4[] = [];
  private v = new THREE.Vector3(); private u = new THREE.Vector3();
  col: RGB = [1, 1, 1]; alpha = 1; width = 1.5;
  constructor(public lb: LineBatch) {}
  push(m?: THREE.Matrix4) { this.stack.push(this.m.clone()); if (m) this.m.multiply(m); return this; }
  pop() { this.m.copy(this.stack.pop() ?? new THREE.Matrix4()); return this; }
  translate(x: number, y: number, z: number) { this.m.multiply(new THREE.Matrix4().makeTranslation(x, y, z)); return this; }
  rotate(rx: number, ry: number, rz: number) { this.m.multiply(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rx, ry, rz))); return this; }
  scale(s: number, sy = s, sz = s) { this.m.multiply(new THREE.Matrix4().makeScale(s, sy, sz)); return this; }
  style(col: RGB, width = this.width, alpha = 1) { this.col = col; this.width = width; this.alpha = alpha; return this; }

  line(ax: number, ay: number, az: number, bx: number, by: number, bz: number, col = this.col, width = this.width, alpha = this.alpha) {
    this.v.set(ax, ay, az).applyMatrix4(this.m); this.u.set(bx, by, bz).applyMatrix4(this.m);
    this.lb.seg(this.v.x, this.v.y, this.v.z, this.u.x, this.u.y, this.u.z, width, col[0], col[1], col[2], alpha);
  }
  /** Polyline through points [x,y,z][]; draw only the first fraction p of it (by count). */
  poly(pts: number[][], close = false, p = 1) {
    const n = pts.length - (close ? 0 : 1);
    const m = Math.floor(n * Math.min(1, Math.max(0, p)) + 1e-6);
    for (let i = 0; i < m; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; this.line(a[0], a[1], a[2], b[0], b[1], b[2]); }
    if (m < n && p > 0) { const a = pts[m], b = pts[(m + 1) % pts.length], f = n * p - m; this.line(a[0], a[1], a[2], a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f); }
  }
  /** Circle of radius r in the local plane (axis 'y': XZ plane, 'z': XY plane, 'x': YZ plane). */
  ring(r: number, axis: 'x' | 'y' | 'z' = 'y', seg = 48, cx = 0, cy = 0, cz = 0, a0 = 0, a1 = Math.PI * 2) {
    const pts: number[][] = [];
    for (let i = 0; i <= seg; i++) {
      const a = a0 + ((a1 - a0) * i) / seg, c = Math.cos(a) * r, s = Math.sin(a) * r;
      pts.push(axis === 'y' ? [cx + c, cy, cz + s] : axis === 'z' ? [cx + c, cy + s, cz] : [cx, cy + c, cz + s]);
    }
    this.poly(pts);
  }
  /** Axis-aligned box edges centred at (cx,cy,cz) with full sizes (sx,sy,sz). */
  box(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number) {
    const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
    const L = (a: number[], b: number[]) => this.line(a[0], a[1], a[2], b[0], b[1], b[2]);
    const c = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => L(c[a], c[b]));
  }
  /** Rectangle in the XY plane (z fixed). */
  rect(cx: number, cy: number, z: number, sx: number, sy: number) {
    this.poly([[cx - sx / 2, cy - sy / 2, z], [cx + sx / 2, cy - sy / 2, z], [cx + sx / 2, cy + sy / 2, z], [cx - sx / 2, cy + sy / 2, z]], true);
  }
  /** Cylinder along Y: end rings + n generator lines. */
  cylinder(r: number, h: number, cx = 0, cy = 0, cz = 0, gens = 8, seg = 40) {
    this.ring(r, 'y', seg, cx, cy - h / 2, cz); this.ring(r, 'y', seg, cx, cy + h / 2, cz);
    for (let k = 0; k < gens; k++) { const a = (k / gens) * Math.PI * 2; this.line(cx + Math.cos(a) * r, cy - h / 2, cz + Math.sin(a) * r, cx + Math.cos(a) * r, cy + h / 2, cz + Math.sin(a) * r); }
  }
}

export const linCol = (hex: string, k = 1): RGB => {
  const n = parseInt(hex.slice(1), 16);
  const f = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  return [f((n >> 16) & 255) * k, f((n >> 8) & 255) * k, f(n & 255) * k];
};
