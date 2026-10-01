// Minimal WebGL2 layer: HDR render targets, fullscreen shader passes, canvas uploads, compositing.
import { GLSL_COMMON } from './glsl';

export const W = 1920;
export const H = 1080;

export let gl: WebGL2RenderingContext;
let triVAO: WebGLVertexArrayObject;

export function initGL(canvas: HTMLCanvasElement) {
  const g = canvas.getContext('webgl2', {
    antialias: false,
    alpha: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  });
  if (!g) throw new Error('WebGL2 not available');
  gl = g;
  if (!gl.getExtension('EXT_color_buffer_float')) throw new Error('EXT_color_buffer_float missing');
  gl.getExtension('OES_texture_float_linear');
  triVAO = gl.createVertexArray()!;
  return gl;
}

export interface RT {
  fb: WebGLFramebuffer;
  tex: WebGLTexture;
  w: number;
  h: number;
}

export function makeRT(w = W, h = H, float = true): RT {
  const tex = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, float ? gl.RGBA16F : gl.RGBA8, w, h, 0, gl.RGBA, float ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const fb = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { fb, tex, w, h };
}

export function bindRT(rt: RT | null) {
  gl.bindFramebuffer(gl.FRAMEBUFFER, rt ? rt.fb : null);
  gl.viewport(0, 0, rt ? rt.w : gl.drawingBufferWidth, rt ? rt.h : gl.drawingBufferHeight);
}

export function clearRT(rt: RT, c: [number, number, number] = [0, 0, 0], a = 1) {
  bindRT(rt);
  gl.disable(gl.BLEND);
  gl.clearColor(c[0], c[1], c[2], a);
  gl.clear(gl.COLOR_BUFFER_BIT);
}

const VERT = `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

function compile(type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(s);
    const lines = src.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n');
    console.error(lines);
    throw new Error('Shader compile error: ' + log);
  }
  return s;
}

export type UniformValue = number | number[] | Float32Array | WebGLTexture | null | boolean;

/** Fullscreen fragment shader pass. `frag` is the body after the common header; write `fragColor`. */
export class FSPass {
  prog: WebGLProgram;
  locs = new Map<string, WebGLUniformLocation | null>();
  u: Record<string, UniformValue> = {};
  constructor(frag: string, uniforms: Record<string, UniformValue> = {}) {
    const src = `#version 300 es
precision highp float;
precision highp int;
in vec2 vUv;
out vec4 fragColor;
uniform vec2 uRes;
${GLSL_COMMON}
${frag}`;
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, src));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Link error: ' + gl.getProgramInfoLog(p));
    this.prog = p;
    this.u = { ...uniforms };
  }
  private loc(name: string) {
    if (!this.locs.has(name)) this.locs.set(name, gl.getUniformLocation(this.prog, name));
    return this.locs.get(name)!;
  }
  /** Draw into rt (null = screen). blend: none | alpha (premultiplied) | add */
  render(rt: RT | null, blend: 'none' | 'alpha' | 'add' | 'mul' = 'none') {
    bindRT(rt);
    gl.useProgram(this.prog);
    let unit = 0;
    const uRes = this.loc('uRes');
    if (uRes) gl.uniform2f(uRes, rt ? rt.w : gl.drawingBufferWidth, rt ? rt.h : gl.drawingBufferHeight);
    for (const [k, v] of Object.entries(this.u)) {
      const l = this.loc(k);
      if (!l) continue;
      if (v instanceof WebGLTexture) {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, v);
        gl.uniform1i(l, unit++);
      } else if (typeof v === 'number') gl.uniform1f(l, v);
      else if (typeof v === 'boolean') gl.uniform1i(l, v ? 1 : 0);
      else if (v && (Array.isArray(v) || v instanceof Float32Array)) {
        const n = v.length;
        if (n === 2) gl.uniform2fv(l, v);
        else if (n === 3) gl.uniform3fv(l, v);
        else if (n === 4) gl.uniform4fv(l, v);
        else gl.uniform1fv(l, v);
      }
    }
    if (blend === 'none') gl.disable(gl.BLEND);
    else {
      gl.enable(gl.BLEND);
      gl.blendEquation(gl.FUNC_ADD);
      if (blend === 'alpha') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      else if (blend === 'add') gl.blendFunc(gl.ONE, gl.ONE);
      else gl.blendFunc(gl.DST_COLOR, gl.ZERO);
    }
    gl.bindVertexArray(triVAO);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.disable(gl.BLEND);
  }
}

/** A 1920×1080 Canvas2D layer uploaded as a texture. */
export class Layer {
  canvas: OffscreenCanvas;
  ctx: OffscreenCanvasRenderingContext2D;
  tex: WebGLTexture;
  dirty = false;
  constructor(public w = W, public h = H) {
    this.canvas = new OffscreenCanvas(w, h);
    this.ctx = this.canvas.getContext('2d', { alpha: true })!;
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  clear() {
    const c = this.ctx;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
    c.filter = 'none';
    c.shadowBlur = 0;
    c.clearRect(0, 0, this.w, this.h);
    this.dirty = true;
  }
  upload() {
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas as unknown as TexImageSource);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    this.dirty = false;
    return this.tex;
  }
}

/** Composites textures onto an HDR target. The source is sRGB premultiplied (canvas) or linear (RT). */
export class Compositor {
  pass = new FSPass(`
    uniform sampler2D src; uniform float gain; uniform float opacity; uniform float srgb;
    uniform vec2 scale; uniform vec2 offset; uniform float rot; uniform vec3 tint; uniform float flipY;
    void main() {
      vec2 p = (vUv - 0.5 - offset) ;
      p.x *= uRes.x / uRes.y; p = rot2(-rot) * p; p.x /= uRes.x / uRes.y;
      vec2 uv = p / scale + 0.5;
      if (flipY > 0.5) uv.y = 1.0 - uv.y;
      if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) { fragColor = vec4(0.0); return; }
      vec4 c = texture(src, uv);
      if (srgb > 0.5) { vec3 un = c.a > 0.0 ? c.rgb / c.a : vec3(0.0); c.rgb = toLinear(un) * c.a; }
      c.rgb *= tint * gain;
      fragColor = c * opacity;
    }`);
  draw(
    tex: WebGLTexture,
    target: RT,
    o: {
      mode?: 'alpha' | 'add' | 'none';
      gain?: number;
      opacity?: number;
      srgb?: boolean;
      scale?: number | [number, number];
      offset?: [number, number];
      rot?: number;
      tint?: [number, number, number];
    } = {},
  ) {
    const s = o.scale ?? 1;
    this.pass.u = {
      src: tex,
      gain: o.gain ?? 1,
      opacity: o.opacity ?? 1,
      srgb: o.srgb === false ? 0 : 1,
      scale: Array.isArray(s) ? s : [s, s],
      offset: o.offset ?? [0, 0],
      rot: o.rot ?? 0,
      tint: o.tint ?? [1, 1, 1],
      flipY: 0,
    };
    this.pass.render(target, o.mode ?? 'alpha');
  }
}
