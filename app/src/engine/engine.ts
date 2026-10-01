// The engine: picks the timeline entries active at song time t, renders them (crossfading overlaps),
// then runs post. Every frame is a pure function of t, so preview and export match.
import { initGL, makeRT, clearRT, Compositor, Layer, FSPass, type RT, gl, bindRT, W, H } from './gl';
import { Post, DEFAULT_POST, type PostParams } from './post';
import { Lyrics, Audio } from './data';
import { Scene, type Frame, type Ctx, type PostOverride } from './scene';
import { loadFonts } from './type';
import { Hud, type HudKey } from './hud';
import { clamp, ease } from './util';
import { Three } from './three';

export interface Entry {
  id: string;
  start: number;
  end: number;
  make: () => Scene;
  params?: Record<string, unknown>;
  /** seconds of overlap with the previous entry (crossfade or custom) */
  xfade?: number;
  /** transition INTO this entry, centred on its start: [start - dur/2, start + dur/2] */
  tr?: { type: TransType; dur: number; dir?: [number, number] };
}
export type TransType = 'fade' | 'whip' | 'zoom' | 'flash' | 'glitch' | 'burn';
const TT: Record<TransType, number> = { fade: 0, whip: 1, zoom: 2, flash: 3, glitch: 4, burn: 5 };

interface Live { e: Entry; scene: Scene; ready: boolean }

export class Engine {
  lyrics!: Lyrics;
  audio!: Audio;
  comp!: Compositor;
  base!: Layer;
  glow!: Layer;
  post!: Post;
  hud!: Hud;
  three!: Three;
  transPass!: FSPass;
  rtA!: RT;
  rtB!: RT;
  rtPost!: RT;
  accum!: RT;
  mixPass!: FSPass;
  blit!: FSPass;
  live: Live[] = [];
  entries: Entry[] = [];
  lastT = 0;
  errors: string[] = [];

  async init(canvas: HTMLCanvasElement, entriesFn: (l: Lyrics, a: Audio) => Entry[], hudFn?: (l: Lyrics) => HudKey[]) {
    canvas.width = W;
    canvas.height = H;
    initGL(canvas);
    this.three = new Three(canvas);
    await loadFonts();
    const [ly, au] = await Promise.all([
      fetch('data/lyrics.json').then((r) => r.json()),
      fetch('data/audio.json').then((r) => r.json()),
    ]);
    this.lyrics = new Lyrics(ly);
    this.audio = new Audio(au);
    this.comp = new Compositor();
    this.base = new Layer();
    this.glow = new Layer();
    this.post = new Post();
    this.hud = new Hud();
    this.rtA = makeRT();
    this.rtB = makeRT();
    this.rtPost = makeRT();
    this.accum = makeRT();
    this.mixPass = new FSPass(`uniform sampler2D a; uniform sampler2D b; uniform float k;
      void main(){ fragColor = vec4(mix(texture(a, vUv).rgb, texture(b, vUv).rgb, k), 1.0); }`);
    this.blit = new FSPass(`uniform sampler2D src; uniform float k; void main(){ fragColor = vec4(texture(src, vUv).rgb * k, 1.0); }`);
    this.transPass = new FSPass(`
      uniform sampler2D a; uniform sampler2D b; uniform float p, kind, t; uniform vec2 dir;
      vec3 A(vec2 uv) { return texture(a, clamp(uv, 0.0, 1.0)).rgb; }
      vec3 B(vec2 uv) { return texture(b, clamp(uv, 0.0, 1.0)).rgb; }
      vec3 dblur(sampler2D s, vec2 uv, vec2 d) { vec3 c = vec3(0.0); for (int i = 0; i < 24; i++) { float f = float(i) / 23.0 - 0.5; c += texture(s, clamp(uv + d * f, 0.0, 1.0)).rgb; } return c / 24.0; }
      vec3 rblur(sampler2D s, vec2 uv, float k) { vec3 c = vec3(0.0); vec2 d = uv - 0.5; for (int i = 0; i < 24; i++) { float f = 1.0 - k * float(i) / 23.0; c += texture(s, clamp(0.5 + d * f, 0.0, 1.0)).rgb; } return c / 24.0; }
      void main() {
        vec2 uv = vUv;
        vec3 col;
        int K = int(kind + 0.5);
        if (K == 0) { col = mix(A(uv), B(uv), smoothstep(0.0, 1.0, p)); }
        else if (K == 1) {
          // whip pan: both frames slide along dir with a motion-blur that peaks mid-transition
          float e = p < 0.5 ? 4.0 * p * p * p : 1.0 - pow(-2.0 * p + 2.0, 3.0) / 2.0;
          float v = sin(3.14159 * p);
          vec2 d = dir * v * 0.35;
          vec3 ca = dblur(a, uv + dir * e, d);
          vec3 cb = dblur(b, uv + dir * (e - 1.0), d);
          col = mix(ca, cb, smoothstep(0.42, 0.58, p));
        } else if (K == 2) {
          // zoom-through: A rushes toward camera, B arrives from far, a flash at the seam
          float za = 1.0 + 3.0 * p * p, zb = 0.35 + 0.65 * smoothstep(0.0, 1.0, p);
          vec3 ca = rblur(a, 0.5 + (uv - 0.5) / za, 0.35 * sin(3.14159 * min(p * 1.6, 1.0)));
          vec3 cb = rblur(b, 0.5 + (uv - 0.5) / zb, 0.3 * (1.0 - p));
          col = mix(ca, cb, smoothstep(0.4, 0.6, p)) + vec3(1.0, 0.9, 0.7) * exp(-pow((p - 0.5) * 18.0, 2.0)) * 0.08;
        } else if (K == 3) {
          col = (p < 0.5 ? A(uv) : B(uv)) + vec3(1.0, 0.7, 0.25) * exp(-abs(p - 0.5) * 14.0) * 0.55;
        } else if (K == 4) {
          float band = floor(uv.y * 36.0 + t * 7.0);
          float g = step(0.55, hash11(band + floor(t * 30.0))) * sin(3.14159 * p);
          vec2 o = vec2((hash11(band * 1.7) - 0.5) * 0.25 * g, 0.0);
          vec3 ca = vec3(A(uv + o + vec2(0.01 * g, 0)).r, A(uv + o).g, A(uv + o - vec2(0.01 * g, 0)).b);
          vec3 cb = vec3(B(uv + o + vec2(0.01 * g, 0)).r, B(uv + o).g, B(uv + o - vec2(0.01 * g, 0)).b);
          col = hash11(band + 3.1) < p ? cb : ca;
        } else {
          // light burn: B appears where A is brightest first, with a gold burning edge
          float l = luma(A(uv)) + 0.15 * vnoise(uv * 9.0);
          float th = 1.2 - p * 1.4;
          float m = smoothstep(th, th - 0.08, 1.0 - l);
          float edge = exp(-pow((1.0 - l - th) * 18.0, 2.0)) * sin(3.14159 * p);
          col = mix(A(uv), B(uv), 1.0 - m) + C_GOLD * edge * 3.0;
          col = mix(col, B(uv), smoothstep(0.85, 1.0, p));
        }
        fragColor = vec4(col, 1.0);
      }`);
    this.entries = entriesFn(this.lyrics, this.audio);
    if (hudFn) this.hud.keys = hudFn(this.lyrics);
    for (const e of this.entries) {
      try {
        this.live.push({ e, scene: e.make(), ready: false });
      } catch (err) {
        this.errors.push(`${e.id}: ${(err as Error).message}`);
        console.error(err);
      }
    }
    await Promise.all(
      this.live.map(async (l) => {
        l.scene.ctx = this.ctxFor(l.e);
        try {
          await l.scene.init();
          l.ready = true;
        } catch (err) {
          this.errors.push(`${l.e.id}: ${(err as Error).stack ?? err}`);
          console.error(err);
        }
      }),
    );
  }

  ctxFor(e: Entry): Ctx {
    return {
      lyrics: this.lyrics,
      audio: this.audio,
      comp: this.comp,
      three: this.three,
      base: this.base,
      glow: this.glow,
      start: e.start,
      end: e.end,
      params: e.params ?? {},
    };
  }

  get duration() { return this.audio.d.duration; }

  frameFor(t: number, e: Entry, dt: number): Frame {
    const au = this.audio;
    const beat = au.beatAt(t), bar = au.barAt(t);
    const xf = e.xfade ?? 0;
    return {
      t,
      lt: t - e.start,
      p: clamp((t - e.start) / (e.end - e.start)),
      dt,
      beat,
      beatPhase: beat - Math.floor(beat),
      bar,
      barPhase: bar - Math.floor(bar),
      a: {
        rms: au.env('rms', t),
        low: au.env('low', t),
        high: au.env('high', t),
        vocals: au.env('vocals', t),
        drums: au.env('drums', t),
        kick: au.hit('low', t, 0.09),
        hat: au.hit('high', t, 0.05),
      },
      tin: xf > 0 ? clamp((t - e.start) / xf) : 1,
    };
  }

  renderEntry(l: Live, t: number, dt: number, out: RT, under?: RT): PostOverride {
    const f = this.frameFor(t, l.e, dt);
    f.under = under;
    if (!l.ready) { clearRT(out, [0.02, 0, 0]); return {}; }
    try {
      return l.scene.render(f, out) || {};
    } catch (err) {
      const msg = `${l.e.id} @${t.toFixed(2)}: ${(err as Error).message}`;
      if (!this.errors.includes(msg)) { this.errors.push(msg); console.error(err); }
      clearRT(out, [0.05, 0, 0]);
      return {};
    }
  }

  /** Render song time t to the screen (LDR). */
  renderTime(t: number, target: RT | null = null) {
    const dt = t - this.lastT;
    this.lastT = t;
    const L = this.live;
    const act = L.filter((l, i) => {
      const pre = (l.e.tr?.dur ?? 0) / 2;
      const nxt = L[i + 1];
      const post = nxt && Math.abs(nxt.e.start - l.e.end) < 1e-3 ? (nxt.e.tr?.dur ?? 0) / 2 : 0;
      return t >= l.e.start - pre && t < l.e.end + post;
    });
    let po: PostOverride = {};
    const B = act[act.length - 1];
    if (act.length >= 2 && B.e.tr) {
      const A = act[act.length - 2];
      const tr = B.e.tr;
      const p = clamp((t - (B.e.start - tr.dur / 2)) / tr.dur);
      const pa = this.renderEntry(A, t, dt, this.rtB);
      const pb = this.renderEntry(B, t, dt, this.rtPost);
      this.transPass.u = { a: this.rtB.tex, b: this.rtPost.tex, p, kind: TT[tr.type], t, dir: tr.dir ?? [1, 0] };
      this.transPass.render(this.rtA);
      po = blendPost(pa, pb, ease.inOutCubic(p));
    } else if (act.length === 0) {
      clearRT(this.rtA, [0, 0, 0]);
    } else if (act.length === 1 || B.e.tr) {
      po = this.renderEntry(B, t, dt, this.rtA);
    } else {
      // two overlapping entries: older one renders to B, newer composites (custom or crossfade)
      const [a, b] = act.slice(-2);
      const pa = this.renderEntry(a, t, dt, this.rtB);
      if (b.scene.handlesTransition) {
        po = this.renderEntry(b, t, dt, this.rtA, this.rtB);
      } else {
        const pb = this.renderEntry(b, t, dt, this.rtPost);
        const xf = b.e.xfade ?? 0.001;
        const k = clamp((t - b.e.start) / xf);
        this.mixPass.u = { a: this.rtB.tex, b: this.rtPost.tex, k };
        this.mixPass.render(this.rtA);
        po = blendPost(pa, pb, k);
      }
    }
    const pp: PostParams = { ...DEFAULT_POST, ...po } as PostParams;
    // global HUD (exponent ticker) drawn in HDR before post
    const hudOp = po.hud ?? 1;
    if (hudOp > 0.001) this.hud.render(t, this, this.rtA, hudOp);
    this.post.run(this.rtA, pp, t, target);
  }

  /** Motion-blurred frame: average of n sub-frames across the shutter (fraction of frame dur). */
  renderBlur(t: number, fps: number, n: number, shutter = 0.5) {
    if (n <= 1) { this.renderTime(t, this.accum); this.blit.u = { src: this.accum.tex, k: 1 }; this.blit.render(null); return; }
    clearRT(this.accum, [0, 0, 0]);
    for (let i = 0; i < n; i++) {
      const ts = t + ((i + 0.5) / n - 0.5) * shutter / fps;
      this.renderTime(ts, this.rtPost);
      this.blit.u = { src: this.rtPost.tex, k: 1 / n };
      this.blit.render(this.accum, 'add');
    }
    this.blit.u = { src: this.accum.tex, k: 1 };
    this.blit.render(null);
  }

  // ---- export: pack the finished frame (in accum, sRGB) into planar YUV 4:2:0 (BT.709, limited range),
  // laid out as an RGBA8 texture 480 × 1620: Y (1920×1080 bytes), then U, then V (960×540 bytes each).
  rtYUV?: RT;
  packPass?: FSPass;
  packYUV() {
    if (!this.rtYUV) {
      this.rtYUV = makeRT(480, 1620, false);
      this.packPass = new FSPass(`
        uniform sampler2D src;
        vec3 px(int x, int yTop) { return sat(texelFetch(src, ivec2(x, 1079 - yTop), 0).rgb); }
        float Yof(vec3 c) { return (16.0 + 219.0 * dot(c, vec3(0.2126, 0.7152, 0.0722))) / 255.0; }
        vec2 UVof(vec3 c) { float y = dot(c, vec3(0.2126, 0.7152, 0.0722)); return (128.0 + 224.0 * vec2((c.b - y) / 1.8556, (c.r - y) / 1.5748)) / 255.0; }
        void main() {
          ivec2 q = ivec2(gl_FragCoord.xy);
          vec4 o;
          if (q.y < 1080) {
            for (int k = 0; k < 4; k++) o[k] = Yof(px(q.x * 4 + k, q.y));
          } else {
            bool isV = q.y >= 1350;
            int i = (q.y - (isV ? 1350 : 1080)) * 480 + q.x;
            for (int k = 0; k < 4; k++) {
              int b = i * 4 + k;
              int cx = b % 960, cy = b / 960;
              vec3 c = (px(cx * 2, cy * 2) + px(cx * 2 + 1, cy * 2) + px(cx * 2, cy * 2 + 1) + px(cx * 2 + 1, cy * 2 + 1)) * 0.25;
              vec2 uv = UVof(c);
              o[k] = isV ? uv.y : uv.x;
            }
          }
          fragColor = o;
        }`);
    }
    this.packPass!.u = { src: this.accum.tex };
    this.packPass!.render(this.rtYUV);
    bindRT(this.rtYUV);
    return this.rtYUV;
  }

  sceneAt(t: number) {
    const act = this.live.filter((l) => t >= l.e.start && t < l.e.end);
    return act[act.length - 1]?.e;
  }
}

function blendPost(a: PostOverride, b: PostOverride, k: number): PostOverride {
  const out: Record<string, unknown> = {};
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const d = (DEFAULT_POST as unknown as Record<string, unknown>)[key] ?? (key === 'hud' ? 1 : 0);
    const va = (a as Record<string, unknown>)[key] ?? d, vb = (b as Record<string, unknown>)[key] ?? d;
    if (typeof va === 'number' && typeof vb === 'number') out[key] = va + (vb - va) * k;
    else if (Array.isArray(va) && Array.isArray(vb)) out[key] = va.map((x: number, i: number) => x + ((vb[i] as number) - x) * k);
    else out[key] = k < 0.5 ? va : vb;
  }
  return out as PostOverride;
}

export { gl, bindRT };
