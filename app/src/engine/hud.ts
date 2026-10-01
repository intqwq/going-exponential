// The ledger: a small running readout (year + frontier training compute) that climbs through the whole video.
// Scenes set its opacity via the `hud` post override (0 hides it). Keyframes come from the timeline.
import { gl, type RT, Compositor, FSPass } from './gl';
import { rgba } from './palette';
import { F, setFont } from './type';
import { clamp, ease, lerp } from './util';
import type { Engine } from './engine';

export interface HudKey { t: number; year: number | string; exp: number; label?: string }

const HW = 560, HH = 120;

export class Hud {
  keys: HudKey[] = [];
  canvas = new OffscreenCanvas(HW, HH);
  c = this.canvas.getContext('2d')!;
  tex: WebGLTexture;
  pass = new FSPass(`uniform sampler2D src; uniform vec4 rect; uniform float op;
    void main(){
      vec2 px = vUv * uRes; vec2 q = (px - rect.xy) / rect.zw;
      if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) { fragColor = vec4(0.0); return; }
      vec4 c = texture(src, vec2(q.x, 1.0 - q.y));
      vec3 un = c.a > 0.0 ? c.rgb / c.a : vec3(0.0);
      fragColor = vec4(toLinear(un) * c.a, c.a) * op;
    }`);
  constructor() {
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  state(t: number) {
    const k = this.keys;
    if (!k.length) return null;
    if (t < k[0].t) return { year: k[0].year, exp: k[0].exp, label: k[0].label ?? '', roll: 0, kt: k[0].t };
    let i = 0;
    while (i < k.length - 1 && k[i + 1].t <= t) i++;
    const a = k[i];
    const prev = k[i - 1];
    // exponent rolls up over 0.6 s after the key
    const r = ease.outExpo(clamp((t - a.t) / 0.6));
    const exp = prev ? lerp(prev.exp, a.exp, r) : a.exp;
    return { year: a.year, exp, label: a.label ?? '', roll: r, kt: a.t };
  }

  render(t: number, eng: Engine, out: RT, op: number) {
    const s = this.state(t);
    if (!s) return;
    const c = this.c;
    c.clearRect(0, 0, HW, HH);
    const x0 = HW - 8;
    // exponent display: 10^xx.x
    const ex = s.exp;
    const inf = !isFinite(ex);
    c.textAlign = 'right';
    c.textBaseline = 'alphabetic';
    setFont(c, F.mono(300), 13);
    c.fillStyle = rgba('ash', 0.9);
    (c as unknown as CanvasRenderingContext2D).letterSpacing = '2px';
    c.fillText(`FRONTIER COMPUTE · ${typeof s.year === 'number' ? s.year : s.year}`, x0, 26);
    (c as unknown as CanvasRenderingContext2D).letterSpacing = '0px';
    // big number
    const expStr = inf ? '∞' : ex.toFixed(1);
    setFont(c, F.mono(500), 40);
    const wExp = c.measureText(expStr).width;
    setFont(c, F.mono(200), 13);
    const wUnit = c.measureText(' FLOP').width;
    c.fillStyle = rgba('ash', 0.9);
    c.fillText(' FLOP', x0, 84);
    setFont(c, F.mono(500), 30);
    c.fillStyle = rgba('gold', 1);
    c.fillText(expStr, x0 - wUnit, 66);
    setFont(c, F.mono(300), 56);
    c.fillStyle = rgba('bone', 0.95);
    c.fillText('10', x0 - wUnit - wExp * 0.75 - 6, 84);
    // log ruler: ticks 0..30, a marker at exp
    const rx0 = 8, rx1 = HW - 8, ry = 104;
    c.strokeStyle = rgba('graphite', 0.9);
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(rx0, ry + 0.5); c.lineTo(rx1, ry + 0.5);
    for (let i = 0; i <= 30; i++) {
      const x = Math.round(lerp(rx0, rx1, i / 30)) + 0.5;
      const h = i % 5 === 0 ? 7 : 3;
      c.moveTo(x, ry - h); c.lineTo(x, ry);
    }
    c.stroke();
    const mx = lerp(rx0, rx1, clamp((inf ? 30 : ex) / 30));
    c.fillStyle = rgba('gold', 1);
    c.fillRect(rx0, ry - 1, mx - rx0, 2);
    c.beginPath();
    c.arc(mx, ry, 3.5, 0, Math.PI * 2);
    c.fill();

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.canvas as unknown as TexImageSource);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    // bottom-right, gl coords y up
    this.pass.u = { src: this.tex, rect: [1920 - HW - 64, 48, HW, HH], op };
    this.pass.render(out, 'alpha');
  }
}

export type { Compositor };
