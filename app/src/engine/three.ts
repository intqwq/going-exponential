// three.js on the engine's WebGL2 context: HDR multisampled render targets with depth, a depth-of-field pass,
// an environment map for physically based metals/glass, and helpers to hand three's textures to the
// engine's compositor. After every three render we reset GL state so the engine's raw passes stay valid.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { gl, FSPass, makeRT, type RT, W, H } from './gl';

export class Three {
  renderer: THREE.WebGLRenderer;
  rt: THREE.WebGLRenderTarget; // MSAA HDR colour + depth
  env: THREE.Texture;
  dofOut: RT;
  dof: FSPass;
  copy: FSPass;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, context: gl as unknown as WebGLRenderingContext, antialias: false, alpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(W, H, false);
    this.renderer.autoClear = true;
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const depth = new THREE.DepthTexture(W, H);
    depth.type = THREE.FloatType;
    this.rt = new THREE.WebGLRenderTarget(W, H, {
      type: THREE.HalfFloatType,
      samples: 4,
      depthTexture: depth,
      depthBuffer: true,
    });
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.env = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    this.renderer.resetState();
    this.dofOut = makeRT();
    // Depth of field: golden-angle gather with per-tap circle of confusion (scatter-as-gather approximation).
    this.dof = new FSPass(`
      uniform sampler2D col; uniform sampler2D dep; uniform float nearZ, farZ, focus, aperture, maxR, amount;
      float linZ(float d) { float z = d * 2.0 - 1.0; return (2.0 * nearZ * farZ) / (farZ + nearZ - z * (farZ - nearZ)); }
      float coc(vec2 uv) { float z = linZ(texture(dep, uv).r); return clamp(abs(1.0 / focus - 1.0 / z) * aperture, 0.0, maxR); }
      void main() {
        vec2 px = 1.0 / uRes;
        float c0 = coc(vUv) * amount;
        vec3 acc = texture(col, vUv).rgb; float wsum = 1.0;
        if (c0 > 0.5) {
          const float GA = 2.39996323;
          for (int i = 1; i < 56; i++) {
            float fi = float(i);
            float r = sqrt(fi / 56.0) * c0;
            vec2 o = vec2(cos(fi * GA), sin(fi * GA)) * r * px;
            vec2 uv = vUv + o;
            float ct = coc(uv) * amount;
            // a tap contributes if its own blur reaches this pixel (prevents sharp fg bleeding onto bg)
            float w = smoothstep(r - 1.5, r + 0.5, max(ct, c0 * 0.35));
            acc += texture(col, uv).rgb * w; wsum += w;
          }
        }
        fragColor = vec4(acc / wsum, 1.0);
      }`);
    this.copy = new FSPass(`uniform sampler2D src; void main(){ fragColor = vec4(texture(src, vUv).rgb, 1.0); }`);
  }

  tex(t: THREE.Texture): WebGLTexture {
    return (this.renderer.properties.get(t) as { __webglTexture: WebGLTexture }).__webglTexture;
  }

  /**
   * Render a three scene and write it into the engine target `out` (replaces its contents).
   * dof: { focus (world units), aperture (px·units), maxR (px) } — omit for a sharp frame.
   */
  render(scene: THREE.Scene, camera: THREE.PerspectiveCamera, out: RT, dof?: { focus: number; aperture?: number; maxR?: number; amount?: number }) {
    const r = this.renderer;
    r.resetState();
    r.setRenderTarget(this.rt);
    r.setViewport(0, 0, W, H);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.resetState();
    const colT = this.tex(this.rt.texture);
    if (dof && (dof.amount ?? 1) > 0.001) {
      this.dof.u = {
        col: colT,
        dep: this.tex(this.rt.depthTexture!),
        nearZ: camera.near,
        farZ: camera.far,
        focus: dof.focus,
        aperture: dof.aperture ?? 60,
        maxR: dof.maxR ?? 18,
        amount: dof.amount ?? 1,
      };
      this.dof.render(out);
    } else {
      this.copy.u = { src: colT };
      this.copy.render(out);
    }
  }
}

/** A Canvas2D surface usable as a texture on 3D panels (screens, papers, UIs). */
export class Panel {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  tex: THREE.CanvasTexture;
  constructor(public w = 1024, public h = 1024) {
    this.canvas = new OffscreenCanvas(w, h);
    this.ctx = this.canvas.getContext('2d')!;
    this.tex = new THREE.CanvasTexture(this.canvas as unknown as HTMLCanvasElement);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 8;
    this.tex.generateMipmaps = true;
    this.tex.minFilter = THREE.LinearMipmapLinearFilter;
  }
  begin() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.clearRect(0, 0, this.w, this.h);
    return c;
  }
  end() { this.tex.needsUpdate = true; }
}

export { THREE };
void gl;
