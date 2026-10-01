// Shared 3D building blocks for the plates.
import * as THREE from 'three';
import { LIN } from '../engine/palette';
import { Panel } from '../engine/three';
import { WordSprite } from '../engine/text3d';
import { F, type FontSpec } from '../engine/type';

export const C = (k: keyof typeof LIN, m = 1) => new THREE.Color(LIN[k][0] * m, LIN[k][1] * m, LIN[k][2] * m);

export const M = {
  gold: (e = 0.0) => new THREE.MeshStandardMaterial({ color: C('gold'), emissive: C('gold', e), metalness: 1, roughness: 0.25, envMapIntensity: 1.4 }),
  bone: () => new THREE.MeshStandardMaterial({ color: C('bone'), metalness: 0.1, roughness: 0.55 }),
  paper: () => new THREE.MeshStandardMaterial({ color: C('paper'), metalness: 0, roughness: 0.9 }),
  ink: () => new THREE.MeshStandardMaterial({ color: C('ink2', 1.4), metalness: 0.3, roughness: 0.6 }),
  steel: (r = 0.35) => new THREE.MeshStandardMaterial({ color: new THREE.Color(0.55, 0.56, 0.6), metalness: 1, roughness: r, envMapIntensity: 1.2 }),
  darkSteel: () => new THREE.MeshStandardMaterial({ color: new THREE.Color(0.08, 0.085, 0.1), metalness: 0.9, roughness: 0.4, envMapIntensity: 1 }),
  glow: (k: keyof typeof LIN = 'gold', m = 3) => new THREE.MeshBasicMaterial({ color: C(k, m), toneMapped: false }),
  line: (k: keyof typeof LIN = 'bone', m = 0.6, o = 1) => new THREE.LineBasicMaterial({ color: C(k, m), transparent: o < 1, opacity: o }),
  glass: () => new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 0, roughness: 0.05, transmission: 1, thickness: 0.4, ior: 1.45, envMapIntensity: 1.2, transparent: true }),
};

/** An emissive screen showing a Panel canvas, with a thin bezel. */
export function screen(panel: Panel, w: number, h: number, bright = 1.4, bezel = true) {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ map: panel.tex, toneMapped: false, color: new THREE.Color(bright, bright, bright) });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  g.add(plane);
  if (bezel) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w * 1.03, h * 1.05, 0.06), M.darkSteel());
    b.position.z = -0.035;
    g.add(b);
  }
  return { group: g, mat, plane };
}

/** Line-segments object from pairs of points. */
export function segs(pairs: number[], mat: THREE.LineBasicMaterial) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pairs, 3));
  return new THREE.LineSegments(g, mat);
}

/** A floating 3D label (sprite text) */
export function tag(text: string, size = 0.2, f: FontSpec = F.mono(500), color: [number, number, number] = [0.8, 0.78, 0.74]) {
  const s = new WordSprite(text, f, size);
  s.tint(color[0], color[1], color[2], 1);
  return s;
}

/** Tube along points (for beams, fibres, wires). */
export function tube(points: THREE.Vector3[], r: number, mat: THREE.Material, seg = 64) {
  const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, 8, false), mat);
}

/** Standard three-point lighting for a group. */
export function lights(scene: THREE.Object3D, key = 2.5, rimCol = new THREE.Color(1, 0.62, 0.22), rim = 3) {
  const k = new THREE.DirectionalLight(0xffffff, key); k.position.set(-5, 8, 6); scene.add(k);
  const r = new THREE.DirectionalLight(rimCol, rim); r.position.set(6, 3, -8); scene.add(r);
  const a = new THREE.AmbientLight(0xffffff, 0.08); scene.add(a);
  return { k, r, a };
}

export { Panel };

import { applyCam, type CamPath } from '../engine/cam';
import type { LyricRig } from '../engine/kinetic';
/**
 * Place a lyric rig in world space where the camera will be looking during its line: at distance D in front of
 * the mid-line camera, offset to a screen region (sx, sy in −1..1 of the half-frame). The words then get real
 * parallax from the camera move while staying readable.
 */
export function anchorRig(rig: LyricRig, path: CamPath, tm: number, sx = -0.78, sy = -0.55, D = 6.5, scale = 0.72) {
  const cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 1000);
  const s = path.at(tm);
  applyCam(cam, s, tm, 0, 0, 7);
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
  const half = Math.tan(((s.fov / 2) * Math.PI) / 180) * D;
  rig.group.position.copy(cam.position).addScaledVector(fwd, D).addScaledVector(right, sx * half * (16 / 9)).addScaledVector(up, sy * half);
  rig.group.quaternion.copy(cam.quaternion);
  rig.group.scale.setScalar(scale * (D / 6.5));
}

/**
 * Card: a 2D illustration (Canvas2D) mounted on a plane in 3D. The film's default look: flat graphics composed on
 * several depth planes, filmed by a moving camera with parallax and depth of field.
 */
const BEAM = new THREE.Color(1.0, 0.62, 0.12).multiplyScalar(2.2);

export class Card {
  panel: Panel;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  pxW: number; pxH: number;
  constructor(pxW: number, pxH: number, worldW: number, o: { glow?: number; additive?: boolean; onTop?: boolean; opacity?: number; double?: boolean } = {}) {
    this.pxW = pxW; this.pxH = pxH;
    this.panel = new Panel(pxW, pxH);
    const k = o.glow ?? 1;
    const mat = new THREE.MeshBasicMaterial({
      map: this.panel.tex, transparent: true, toneMapped: false, depthWrite: false, opacity: o.opacity ?? 1,
      color: new THREE.Color(k, k, k), side: o.double === false ? THREE.FrontSide : THREE.DoubleSide,
      blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    if (o.onTop) { mat.depthTest = false; }
    // beam reveal: a gold scan line sweeps across the card and draws it on (uReveal 0 → 1; 1 = fully drawn)
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uReveal = this.uReveal;
      sh.uniforms.uOff = this.uOff;
      sh.vertexShader = 'uniform vec3 uOff;' + String.fromCharCode(10) + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + String.fromCharCode(10) + 'transformed += uOff;');
      sh.uniforms.uBeam = { value: BEAM };
      sh.fragmentShader = 'uniform float uReveal; uniform vec3 uBeam;' + String.fromCharCode(10) + sh.fragmentShader.replace('#include <opaque_fragment>', `
        if (uReveal < 0.999) {
          float rs = vMapUv.x * 0.82 + (1.0 - vMapUv.y) * 0.18;
          float R = uReveal * 1.12 - 0.02;
          if (rs > R) discard;
          float d = R - rs;
          float line = smoothstep(0.006, 0.0, d);
          float wake = exp(-d * 30.0);
          outgoingLight = outgoingLight * (1.0 + wake * 1.6) + uBeam * line * 3.0;
          diffuseColor.a = max(diffuseColor.a, line * 0.9);
        }
        #include <opaque_fragment>`);
    };
    mat.customProgramCacheKey = () => 'card-beam';
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(worldW, (worldW * pxH) / pxW), mat);
  }
  uReveal = { value: 1 };
  /** a local-space offset applied in the vertex shader (entry flight, float) — never fights scene-set positions */
  uOff = { value: new THREE.Vector3() };
  set reveal(k: number) { this.uReveal.value = k; }
  get reveal() { return this.uReveal.value; }
  /** Redraw: fn gets a cleared canvas context and its pixel size. */
  draw(fn: (c: OffscreenCanvasRenderingContext2D, w: number, h: number) => void) {
    const c = this.panel.begin();
    fn(c, this.pxW, this.pxH);
    this.panel.end();
    return this;
  }
  at(x: number, y: number, z: number, ry = 0, rx = 0, rz = 0) { this.mesh.position.set(x, y, z); this.mesh.rotation.set(rx, ry, rz); return this; }
  set glow(k: number) { this.mesh.material.color.setRGB(k, k, k); }
  set opacity(a: number) { this.mesh.material.opacity = a; }
}

// ------------------------------------------------------------------ line-art conversion
// The film's solids are drawn, not lit: a near-black fill, crisp feature edges, and a fresnel rim for curved
// silhouettes. flatten() converts every lit (Standard/Physical) mesh under a root in place.
const FILL = new THREE.Color(0.006, 0.007, 0.009);
const isWarm = (c: THREE.Color) => c.r > c.b * 1.6 && c.r > 0.2;

/** Dark fill + rim outline (silhouette) for curved meshes; instanced or not. */
export function rimMaterial(line: THREE.Color, instanced = false) {
  return new THREE.ShaderMaterial({
    uniforms: { uLine: { value: line }, uFill: { value: FILL } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ mat4 m = modelMatrix; ${instanced ? 'm = m * instanceMatrix;' : ''}
        vec4 wp = m * vec4(position, 1.0); vN = normalize(mat3(m) * normal); vV = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `uniform vec3 uLine; uniform vec3 uFill; varying vec3 vN; varying vec3 vV;
      void main(){ float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
        float w = fwidth(f) * 1.5;
        float rim = smoothstep(0.78 - w, 0.78 + w, f);
        gl_FragColor = vec4(mix(uFill, uLine, rim), 1.0); }`,
  });
}

/** Instanced boxes drawn as screen-space-width edges over a dark fill; instanceColor tints the lines. */
export function edgeBoxMaterial(half: THREE.Vector3, line = new THREE.Color(1, 1, 1), px = 1.2, tint = 0.012) {
  return new THREE.ShaderMaterial({
    uniforms: { uHalf: { value: half }, uLine: { value: line }, uFill: { value: FILL }, uPx: { value: px }, uTint: { value: tint } },
    vertexShader: `varying vec3 vP; varying vec3 vC;
      void main(){ vP = position; vC = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vC = instanceColor;
        #endif
        mat4 m = modelMatrix;
        #ifdef USE_INSTANCING
          m = m * instanceMatrix;
        #endif
        gl_Position = projectionMatrix * viewMatrix * m * vec4(position, 1.0); }`,
    fragmentShader: `uniform vec3 uHalf; uniform vec3 uLine; uniform vec3 uFill; uniform float uPx; uniform float uTint; varying vec3 vP; varying vec3 vC;
      void main(){ vec3 d = uHalf - abs(vP); vec3 fw = fwidth(vP) * uPx;
        vec3 e = vec3(1.0) - smoothstep(fw * 0.5, fw * 1.5, d);
        // a fragment is on an edge when it is near the boundary along two axes (one of them is the face itself)
        float edge = max(max(min(e.x, e.y), min(e.y, e.z)), min(e.x, e.z));
        gl_FragColor = vec4(mix(uFill + uLine * vC * uTint, uLine * vC, edge), 1.0); }`,
  });
}

export function flatten(root: THREE.Object3D, o: { bone?: THREE.Color; gold?: THREE.Color; angle?: number } = {}) {
  const bone = o.bone ?? C('bone', 0.85), gold = o.gold ?? C('gold', 1.6);
  const todo: THREE.Mesh[] = [];
  root.traverse((ob) => {
    const m = ob as THREE.Mesh;
    if (!m.isMesh) return;
    const mat = m.material as THREE.Material;
    if (mat instanceof THREE.MeshStandardMaterial) todo.push(m);
  });
  for (const m of todo) {
    const mat = m.material as THREE.MeshStandardMaterial;
    const warm = isWarm(mat.color) || (mat.emissive && isWarm(mat.emissive) && mat.emissive.r > 0.15);
    const lc = warm ? gold : bone;
    const geo = m.geometry as THREE.BufferGeometry;
    const isBox = geo.type === 'BoxGeometry';
    if ((m as THREE.InstancedMesh).isInstancedMesh) {
      if (isBox) {
        const p = (geo as THREE.BoxGeometry).parameters;
        m.material = edgeBoxMaterial(new THREE.Vector3(p.width / 2, p.height / 2, p.depth / 2), (m as THREE.InstancedMesh).instanceColor ? new THREE.Color(1, 1, 1) : lc, 1.2, 0.05);
      } else m.material = rimMaterial(lc, true);
      continue;
    }
    if (geo.type === 'PlaneGeometry') { m.material = new THREE.MeshBasicMaterial({ color: FILL, side: mat.side }); }
    else if (isBox) { const p = (geo as THREE.BoxGeometry).parameters; m.material = edgeBoxMaterial(new THREE.Vector3(p.width / 2, p.height / 2, p.depth / 2), lc); continue; }
    else m.material = rimMaterial(lc);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo, o.angle ?? 30), new THREE.LineBasicMaterial({ color: lc, toneMapped: false }));
    edges.raycast = () => {};
    m.add(edges);
  }
}
