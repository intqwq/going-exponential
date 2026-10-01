// Post: bloom pyramid, anamorphic streak, chromatic aberration, tone shoulder, grain, vignette,
// fades / flashes / punch-in zoom / shake. Operates on the composited linear-HDR frame.
import { FSPass, makeRT, type RT, W, H } from './gl';

export interface PostParams {
  exposure: number;
  bloom: number;
  bloomThreshold: number;
  streak: number; // horizontal anamorphic streak on the brightest things
  ca: number;
  grain: number;
  vignette: number;
  fade: number; // to black
  white: number; // to white (the light)
  flash: number; // additive flash
  shake: [number, number];
  zoom: number;
  rot: number;
  invert: number;
  scan: number; // CRT-ish scanline amount
  paper: number; // 1 = light plate (adds paper fibre instead of dark grain)
}

export const DEFAULT_POST: PostParams = {
  exposure: 1,
  bloom: 0.6,
  bloomThreshold: 0.9,
  streak: 0.18,
  ca: 0.22,
  grain: 0.035,
  vignette: 0.35,
  fade: 0,
  white: 0,
  flash: 0,
  shake: [0, 0],
  zoom: 1,
  rot: 0,
  invert: 0,
  scan: 0,
  paper: 0,
};

const MIPS = 7;

export class Post {
  mips: RT[] = [];
  ups: RT[] = [];
  streakA: RT;
  streakB: RT;
  prefilter = new FSPass(`
    uniform sampler2D src; uniform vec2 texel; uniform float threshold;
    void main() {
      vec3 c = texture(src, vUv + texel * vec2(-1,-1)).rgb + texture(src, vUv + texel * vec2(1,-1)).rgb
             + texture(src, vUv + texel * vec2(-1, 1)).rgb + texture(src, vUv + texel * vec2(1, 1)).rgb;
      c = min(c * 0.25, vec3(30.0));
      float l = max(c.r, max(c.g, c.b));
      float knee = 0.5;
      float rq = clamp(l - threshold + knee, 0.0, 2.0 * knee); rq = rq * rq / (4.0 * knee + 1e-5);
      float w = max(rq, l - threshold) / max(l, 1e-5);
      fragColor = vec4(c * w, 1.0);
    }`);
  down = new FSPass(`
    uniform sampler2D src; uniform vec2 texel;
    void main() {
      vec3 a = texture(src, vUv + texel * vec2(-2,-2)).rgb, b = texture(src, vUv + texel * vec2(0,-2)).rgb, c = texture(src, vUv + texel * vec2(2,-2)).rgb;
      vec3 d = texture(src, vUv + texel * vec2(-1,-1)).rgb, e = texture(src, vUv + texel * vec2(1,-1)).rgb;
      vec3 f = texture(src, vUv + texel * vec2(-2,0)).rgb, g = texture(src, vUv).rgb, h = texture(src, vUv + texel * vec2(2,0)).rgb;
      vec3 i = texture(src, vUv + texel * vec2(-1,1)).rgb, j = texture(src, vUv + texel * vec2(1,1)).rgb;
      vec3 k = texture(src, vUv + texel * vec2(-2,2)).rgb, l = texture(src, vUv + texel * vec2(0,2)).rgb, m = texture(src, vUv + texel * vec2(2,2)).rgb;
      vec3 o = (d + e + i + j) * 0.125 + (a + b + g + f) * 0.03125 + (b + c + h + g) * 0.03125 + (f + g + l + k) * 0.03125 + (g + h + m + l) * 0.03125;
      fragColor = vec4(o, 1.0);
    }`);
  up = new FSPass(`
    uniform sampler2D src; uniform sampler2D prev; uniform vec2 texel; uniform float k;
    void main() {
      vec2 o = texel;
      vec3 s = texture(src, vUv - o).rgb + 2.0 * texture(src, vUv + vec2(0, -o.y)).rgb + texture(src, vUv + vec2(o.x, -o.y)).rgb
        + 2.0 * texture(src, vUv + vec2(-o.x, 0)).rgb + 4.0 * texture(src, vUv).rgb + 2.0 * texture(src, vUv + vec2(o.x, 0)).rgb
        + texture(src, vUv + vec2(-o.x, o.y)).rgb + 2.0 * texture(src, vUv + vec2(0, o.y)).rgb + texture(src, vUv + o).rgb;
      fragColor = vec4(texture(prev, vUv).rgb + s / 16.0 * k, 1.0);
    }`);
  streak = new FSPass(`
    uniform sampler2D src; uniform vec2 dir;
    void main() {
      vec3 s = vec3(0.0); float wsum = 0.0;
      for (int i = -12; i <= 12; i++) { float w = exp(-abs(float(i)) * 0.16); s += texture(src, vUv + dir * float(i)).rgb * w; wsum += w; }
      fragColor = vec4(s / wsum, 1.0);
    }`);
  final = new FSPass(`
    uniform sampler2D src; uniform sampler2D bloomTex; uniform sampler2D streakTex;
    uniform float exposure, bloom, streak, ca, grain, vignette, fade, white, flash, time, zoom, rot, invert, scan, paper;
    uniform vec2 shake;
    vec3 shoulder(vec3 x) {
      const float k = 0.75;
      vec3 y = mix(x, k + (1.0 - k) * (1.0 - exp(-(x - k) / (1.0 - k))), step(k, x));
      float over = max(max(x.r, x.g), x.b);
      return mix(y, vec3(1.0), smoothstep(1.5, 10.0, over) * 0.9);
    }
    void main() {
      vec2 res = uRes;
      vec2 q = vUv - 0.5; q.x *= res.x / res.y; q = rot2(rot) * q; q.x /= res.x / res.y;
      vec2 uv = q / zoom + 0.5 - shake / res;
      vec2 dc = uv - 0.5;
      float r2 = dot(dc * vec2(res.x / res.y, 1.0), dc * vec2(res.x / res.y, 1.0));
      vec2 off = dc * r2 * ca / res.x * 6.0;
      vec3 col;
      col.r = texture(src, uv + off).r;
      col.g = texture(src, uv).g;
      col.b = texture(src, uv - off).b;
      vec3 bl = texture(bloomTex, uv).rgb;
      vec3 st = texture(streakTex, uv).rgb;
      col += bl * bloom + st * streak * vec3(1.0, 0.85, 0.6);
      col *= exposure;
      // flash = a beam-intensity surge: lines flare, black stays black (no grey veil)
      col *= 1.0 + flash * 2.5;
      col += flash * flash * 0.02 * vec3(1.0, 0.7, 0.3);
      col = shoulder(col);
      col = mix(col, vec3(1.0) - col, invert);
      // vignette
      float v = 1.0 - vignette * smoothstep(0.25, 1.1, r2 * 1.2);
      col *= v;
      col = mix(col, vec3(0.0), fade);
      col = mix(col, vec3(1.0, 0.985, 0.95), white);
      vec3 s = toSRGB(col);
      // scanlines
      s *= 1.0 - scan * (0.5 + 0.5 * cos(gl_FragCoord.y * PI)) * 0.35;
      // grain (luma-weighted, animated) + dither
      float gseed = floor(time * 30.0);
      float n = hash13(vec3(gl_FragCoord.xy, gseed)) + hash13(vec3(gl_FragCoord.xy + 17.0, gseed)) - 1.0;
      float lum = luma(s);
      float gw = mix(0.6 + 0.8 * lum * (1.0 - lum) * 4.0, 1.0, paper);
      s += n * grain * gw;
      s += (hash12(gl_FragCoord.xy + time) - 0.5) / 255.0;
      fragColor = vec4(sat(s), 1.0);
    }`);

  constructor() {
    let w = W >> 1, h = H >> 1;
    for (let i = 0; i < MIPS; i++) {
      this.mips.push(makeRT(Math.max(2, w), Math.max(2, h)));
      this.ups.push(makeRT(Math.max(2, w), Math.max(2, h)));
      w >>= 1;
      h >>= 1;
    }
    this.streakA = makeRT(W >> 2, H >> 2);
    this.streakB = makeRT(W >> 2, H >> 2);
  }

  run(src: RT, p: PostParams, time: number, target: RT | null) {
    this.prefilter.u = { src: src.tex, texel: [1 / src.w, 1 / src.h], threshold: p.bloomThreshold };
    this.prefilter.render(this.mips[0]);
    for (let i = 1; i < MIPS; i++) {
      const s = this.mips[i - 1];
      this.down.u = { src: s.tex, texel: [1 / s.w, 1 / s.h] };
      this.down.render(this.mips[i]);
    }
    // upsample chain
    let cur = this.mips[MIPS - 1];
    for (let i = MIPS - 2; i >= 0; i--) {
      this.up.u = { src: cur.tex, prev: this.mips[i].tex, texel: [1 / cur.w, 1 / cur.h], k: 0.62 };
      this.up.render(this.ups[i]);
      cur = this.ups[i];
    }
    // streak from mip1 (quarter res)
    this.streak.u = { src: this.mips[1].tex, dir: [3 / this.streakA.w, 0] };
    this.streak.render(this.streakA);
    this.streak.u = { src: this.streakA.tex, dir: [9 / this.streakA.w, 0] };
    this.streak.render(this.streakB);

    this.final.u = {
      src: src.tex,
      bloomTex: this.ups[0].tex,
      streakTex: this.streakB.tex,
      exposure: p.exposure,
      bloom: p.bloom * 0.55,
      streak: p.streak,
      ca: p.ca,
      grain: p.grain,
      vignette: p.vignette,
      fade: p.fade,
      white: p.white,
      flash: p.flash,
      time,
      zoom: p.zoom,
      rot: p.rot,
      invert: p.invert,
      scan: p.scan,
      paper: p.paper,
      shake: p.shake,
    };
    this.final.render(target);
  }
}
