// Kinetic lyrics in 3D: every word is an object in the scene. Words arrive from depth (or from a direction),
// land exactly when sung, flare gold while sung, settle, then exit (scatter / fall / burst toward camera).
// Place a rig in world space (position/rotation/scale of `group`) so the camera moves through the words.
import * as THREE from 'three';
import { WordSprite } from './text3d';
import type { FontSpec } from './type';
import { Lyrics, type Line } from './data';
import { clamp, ease, hash, lerp } from './util';
import { LIN } from './palette';

export type Enter = 'depth' | 'up' | 'down' | 'left' | 'right' | 'spin' | 'drop' | 'none';
export type Exit = 'scatter' | 'fall' | 'burst' | 'fade' | 'none';

export interface RigOpts {
  font: FontSpec;
  size?: number; // world units per em
  maxWidth?: number; // wrap width in world units
  align?: 'left' | 'center' | 'right';
  lineHeight?: number; // em
  enter?: Enter;
  exit?: Exit;
  anticipate?: number; // seconds a word starts arriving before it is sung
  exitAt?: number; // absolute time the line starts leaving (default: line.end + 0.35)
  exitDur?: number;
  dim?: number; // alpha of arriving (unsung) words
  hot?: [number, number, number]; // HDR colour of the sung word
  on?: [number, number, number]; // colour of sung words
  keepHot?: boolean;
  depth?: number; // how far words travel when entering
  upper?: boolean;
  tracking?: number;
  glow?: number; // HDR multiplier of the hot flare
  onTop?: boolean; // draw over the scene (no depth test) — for lyric lines that must stay readable
}

interface W { s: WordSprite; x: number; y: number; w: Line['words'][number]; i: number }

export class LyricRig {
  group = new THREE.Group();
  words: W[] = [];
  width = 0;
  height = 0;
  o: Required<Omit<RigOpts, 'exitAt'>> & { exitAt?: number };
  constructor(public line: Line, opts: RigOpts) {
    this.o = {
      size: 1, maxWidth: 1e9, align: 'left', lineHeight: 1.1, enter: 'depth', exit: 'scatter', anticipate: 0.35,
      exitDur: 0.6, dim: 0.18, hot: [LIN.gold[0] * 3.2, LIN.gold[1] * 3.2, LIN.gold[2] * 3.2], on: [LIN.bone[0] * 1.15, LIN.bone[1] * 1.15, LIN.bone[2] * 1.15],
      keepHot: false, depth: 6, upper: false, tracking: 0, glow: 1, onTop: true, ...opts,
    } as LyricRig['o'];
    const o = this.o;
    // layout (greedy wrap)
    const rows: W[][] = [[]];
    let x = 0;
    const space = 0.28 * o.size;
    line.words.forEach((w, i) => {
      const text = o.upper ? w.w.toUpperCase() : w.w;
      const s = new WordSprite(text, o.font, o.size, '#ffffff', o.tracking);
      if (o.onTop) { s.material.depthTest = false; s.renderOrder = 100; }
      if (rows[rows.length - 1].length && x + s.advance > o.maxWidth) { rows.push([]); x = 0; }
      rows[rows.length - 1].push({ s, x, y: 0, w, i });
      x += s.advance + space;
    });
    const lh = o.lineHeight * o.size;
    rows.forEach((r, ri) => {
      const rw = r.length ? r[r.length - 1].x + r[r.length - 1].s.advance : 0;
      this.width = Math.max(this.width, rw);
      const off = o.align === 'center' ? -rw / 2 : o.align === 'right' ? -rw : 0;
      for (const it of r) { it.x += off; it.y = -ri * lh; this.words.push(it); this.group.add(it.s); }
    });
    this.height = rows.length * lh;
  }

  update(t: number) {
    const o = this.o;
    const exitAt = o.exitAt ?? this.line.end + 0.35;
    for (const it of this.words) {
      const { s, w, i } = it;
      const h1 = hash(i, 1), h2 = hash(i, 2), h3 = hash(i, 3);
      const arrive = clamp((t - (w.start - o.anticipate)) / Math.max(0.08, o.anticipate));
      const sung = Lyrics.wordProgress(w, t);
      const ex = clamp((t - exitAt - i * 0.03) / o.exitDur);
      if (arrive <= 0 && t < w.start - o.anticipate) { s.visible = false; continue; }
      s.visible = ex < 1;
      const a = ease.outExpo(arrive);
      let px = it.x, py = it.y, pz = 0, rx = 0, ry = 0, rz = 0, sc = 1;
      const D = o.depth * o.size;
      switch (o.enter) {
        case 'depth': pz = (1 - a) * D; ry = (1 - a) * (h1 - 0.5) * 1.2; rx = (1 - a) * (h2 - 0.5) * 0.8; break;
        case 'up': py -= (1 - a) * D * 0.4; rx = (1 - a) * -1.2; break;
        case 'down': py += (1 - a) * D * 0.4; rx = (1 - a) * 1.2; break;
        case 'left': px -= (1 - a) * D; ry = (1 - a) * 0.9; break;
        case 'right': px += (1 - a) * D; ry = (1 - a) * -0.9; break;
        case 'spin': rz = (1 - a) * (h1 > 0.5 ? 1 : -1) * 3; sc = a; break;
        case 'drop': { const b = ease.outBack(arrive); py += (1 - b) * D * 0.5; sc = lerp(1.6, 1, b); break; }
        default: break;
      }
      // the sung flare: a small kick in scale
      const flare = sung > 0 && sung < 1 ? 1 : 0;
      const kick = sung > 0 ? Math.exp(-(t - w.start) * 9) : 0;
      sc *= 1 + 0.12 * kick;
      // exit
      if (ex > 0) {
        const e = ease.inCubic(ex);
        switch (o.exit) {
          case 'scatter': px += (h1 - 0.5) * 4 * e * o.size; py += (h2 - 0.3) * 3 * e * o.size; pz += (h3 - 0.2) * 6 * e * o.size; rx += e * (h2 - 0.5) * 4; rz += e * (h1 - 0.5) * 3; break;
          case 'fall': py -= e * e * 8 * o.size; rz += e * (h1 - 0.5) * 2; rx += e * 1.5; break;
          case 'burst': pz += e * 14 * o.size; px += (h1 - 0.5) * e * 6 * o.size; py += (h2 - 0.5) * e * 4 * o.size; break;
          default: break;
        }
      }
      s.position.set(px, py, pz);
      s.rotation.set(rx, ry, rz);
      s.scale.setScalar(sc);
      // colour
      const fade = 1 - (o.exit === 'none' ? 0 : ease.inQuad(ex));
      let col: [number, number, number];
      let alpha: number;
      if (sung <= 0) { col = [1, 1, 1]; alpha = o.dim * a; }
      else if (flare || o.keepHot) {
        const g = o.glow * (0.6 + 0.4 * kick + 0.2);
        col = [o.hot[0] * g, o.hot[1] * g, o.hot[2] * g]; alpha = 1;
      } else {
        const k = Math.exp(-(t - w.end) * 5);
        col = [lerp(o.on[0], o.hot[0], k), lerp(o.on[1], o.hot[1], k), lerp(o.on[2], o.hot[2], k)]; alpha = 1;
      }
      s.tint(col[0], col[1], col[2], alpha * fade);
    }
  }
}

/** Convenience: many rigs, one per line, updated together; only the active ones are visible. */
export class LyricTrack {
  group = new THREE.Group();
  rigs: LyricRig[] = [];
  add(rig: LyricRig) { this.rigs.push(rig); this.group.add(rig.group); return rig; }
  update(t: number) { for (const r of this.rigs) { r.group.visible = t > r.line.start - 1.2 && t < (r.o.exitAt ?? r.line.end + 0.35) + r.o.exitDur + 0.4; if (r.group.visible) r.update(t); } }
}
