import { LIN } from './palette';

const v3 = (c: [number, number, number]) => `vec3(${c.map((x) => x.toFixed(5)).join(',')})`;

/** Shared GLSL prepended to every FSPass. Palette colours are LINEAR RGB. */
export const GLSL_COMMON = /* glsl */ `
#define PI 3.14159265359
#define TAU 6.28318530718
const vec3 C_INK = ${v3(LIN.ink)};
const vec3 C_INK2 = ${v3(LIN.ink2)};
const vec3 C_INK3 = ${v3(LIN.ink3)};
const vec3 C_GRAPHITE = ${v3(LIN.graphite)};
const vec3 C_ASH = ${v3(LIN.ash)};
const vec3 C_BONE = ${v3(LIN.bone)};
const vec3 C_PAPER = ${v3(LIN.paper)};
const vec3 C_GOLD = ${v3(LIN.gold)};
const vec3 C_SUN = ${v3(LIN.sun)};
const vec3 C_UMBER = ${v3(LIN.umber)};
const vec3 C_GREEN = ${v3(LIN.green)};
const vec3 C_RED = ${v3(LIN.red)};

float sat(float x) { return clamp(x, 0.0, 1.0); }
vec3 sat(vec3 x) { return clamp(x, 0.0, 1.0); }
float remap(float x, float a, float b, float c, float d) { return c + (d - c) * sat((x - a) / (b - a)); }
mat2 rot2(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 toLinear(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 toSRGB(vec3 c) { c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }

float hash11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash12(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hash22(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float hash13(vec3 p3) { p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
vec3 hash33(vec3 p3) { p3 = fract(p3 * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yxz + 33.33); return fract((p3.xxy + p3.yxx) * p3.zyx); }

// value noise + fbm (cheap, smooth enough for fields)
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y) * 2.0 - 1.0;
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p); vec3 u = f * f * (3.0 - 2.0 * f);
  float a = hash13(i), b = hash13(i + vec3(1,0,0)), c = hash13(i + vec3(0,1,0)), d = hash13(i + vec3(1,1,0));
  float e = hash13(i + vec3(0,0,1)), f1 = hash13(i + vec3(1,0,1)), g = hash13(i + vec3(0,1,1)), h = hash13(i + vec3(1,1,1));
  return mix(mix(mix(a,b,u.x), mix(c,d,u.x), u.y), mix(mix(e,f1,u.x), mix(g,h,u.x), u.y), u.z) * 2.0 - 1.0;
}
float fbm(vec2 p, int oct) { float s = 0.0, a = 0.5; for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * vnoise(p); p = rot2(0.6) * p * 2.03 + 11.7; a *= 0.5; } return s; }
float fbm(vec3 p, int oct) { float s = 0.0, a = 0.5; for (int i = 0; i < 8; i++) { if (i >= oct) break; s += a * vnoise(p); p = p * 2.03 + 11.7; a *= 0.5; } return s; }

float sdBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }
float sdSegment(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h); }
float sdBox3(vec3 p, vec3 b) { vec3 q = abs(p) - b; return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0); }
float smin(float a, float b, float k) { float h = sat(0.5 + 0.5 * (b - a) / k); return mix(b, a, h) - k * h * (1.0 - h); }

// antialiased hairline of a scalar field value v at level 0, width w in px
float aline(float v, float w) { float fw = fwidth(v); return 1.0 - smoothstep(w * 0.5 * fw, (w * 0.5 + 1.0) * fw, abs(v)); }
// grid lines in a coordinate p with cell size, width px
float grid(vec2 p, float cell, float w) {
  vec2 g = abs(fract(p / cell - 0.5) - 0.5) * cell; vec2 fw = fwidth(p);
  vec2 l = 1.0 - smoothstep(w * 0.5 * fw, (w * 0.5 + 1.0) * fw, g);
  return max(l.x, l.y);
}
// gold ramp: 0 → umber → gold → sun → white-hot
vec3 heat(float x) {
  x = max(x, 0.0);
  vec3 c = mix(vec3(0.0), C_UMBER, sat(x * 3.0));
  c = mix(c, C_GOLD, sat(x * 3.0 - 1.0));
  c = mix(c, C_SUN * 1.6, sat(x * 3.0 - 2.0));
  return c + max(x - 1.0, 0.0) * C_SUN * 2.0;
}
// thin-film interference (silicon wafer iridescence), thickness d in ~[0,1]
vec3 thinfilm(float d) {
  vec3 w = vec3(0.65, 0.53, 0.44);
  vec3 c = 0.5 + 0.5 * cos(TAU * (d * 2.6 / w + vec3(0.0, 0.1, 0.25)));
  return toLinear(c);
}
`;
