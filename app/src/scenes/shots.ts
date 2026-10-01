// ShotPlate: a plate made of shots, one per lyric line (or any cut list). Each shot builds its layered cards
// into its own group (positioned anywhere in world space), defines a camera move over its window, and gets a
// kinetic lyric anchored where the camera looks. Only shots near the playhead are visible/updated.
import * as THREE from 'three';
import { Plate, type Frame } from './_base';
import type { RT } from '../engine/gl';
import { applyCam, CamPath, type CamKey } from '../engine/cam';
import { LyricRig, type RigOpts } from '../engine/kinetic';
import { F } from '../engine/type';
import type { Line } from '../engine/data';
import { anchorRig, Card } from './kit';
import { pulse, prog, ease, clamp, noise1 } from '../engine/util';

const s0drift = (s: Shot) => s.drift ?? 1;
import type { PostOverride } from '../engine/scene';

export interface ShotCtx { t: number; lt: number; i: number; line: Line; t0: number; t1: number; f: Frame; k: number /* word index */ }
export type ShotUpd = (s: ShotCtx) => PostOverride | void;

export interface Shot {
  /** build the shot's layers into g; return the per-frame update */
  build: (g: THREE.Group, i: number) => ShotUpd;
  /** camera keys over [t0, t1] (absolute times) */
  cam: (t0: number, t1: number, line: Line) => CamKey[];
  lyric?: Partial<RigOpts> & { sx?: number; sy?: number; D?: number; scale?: number; hide?: boolean; shift?: number; follow?: number };
  /** world-space origin of the shot */
  at?: [number, number, number];
  dof?: { aperture?: number; maxR?: number };
  handheld?: number;
  /** draw the shot's cards on with a scan beam at the cut (default true) */
  reveal?: boolean;
  /** the move that carries the cut INTO this shot (default: chosen by index) */
  cut?: 'whip' | 'push' | 'drop' | 'roll' | 'none';
  /** automatic arc + dolly layered on the authored camera (0 = off, default 1) */
  drift?: number;
}

export abstract class ShotPlate extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 2000);
  groups: THREE.Group[] = [];
  upd: ShotUpd[] = [];
  paths: CamPath[] = [];
  rigs: (LyricRig | null)[] = [];
  shotDefs: Shot[] = [];
  abstract section(): Line[];
  abstract shots(): Shot[];
  /** optional backdrop card (far plane) shared by all shots */
  backdrop?: Card;

  async init() {
    this.useLines(this.section());
    this.scene.background = null;
    this.shotDefs = this.shots();
    this.shotDefs.forEach((s, i) => {
      const g = new THREE.Group();
      const at = s.at ?? [i * 60, 0, 0];
      g.position.set(at[0], at[1], at[2]);
      this.scene.add(g);
      this.groups.push(g);
      this.upd.push(s.build(g, i));
      const t0 = this.cuts[i], t1 = this.vEnd(i);
      const keys = s.cam(t0, t1, this.lines[i]).map((k) => ({ ...k, pos: [k.pos[0] + at[0], k.pos[1] + at[1], k.pos[2] + at[2]] as [number, number, number], look: [k.look[0] + at[0], k.look[1] + at[1], k.look[2] + at[2]] as [number, number, number] }));
      this.paths.push(new CamPath(keys));
    });
    this.shotDefs.forEach((s, i) => {
      const l0 = this.lines[i];
      if (s.lyric?.hide) { this.rigs.push(null); return; }
      const sh = s.lyric?.shift ?? 0;
      const l = sh ? { ...l0, words: l0.words.map((w) => ({ ...w, start: w.start + sh, end: w.end + sh })) } : l0;
      const rig = new LyricRig(l, { font: F.display(700), size: 0.6, maxWidth: 10, enter: 'depth', exit: 'scatter', anticipate: 0.4, ...s.lyric });
      this.scene.add(rig.group);
      anchorRig(rig, this.paths[i], (l.words[0].start + l.end) / 2, s.lyric?.sx ?? -0.7, s.lyric?.sy ?? -0.62, s.lyric?.D ?? 6.5, s.lyric?.scale ?? 0.66);
      this.rigs.push(rig);
    });
  }

  wordIdx(i: number, t: number) { const ws = this.lines[i].words; let k = -1; for (let j = 0; j < ws.length; j++) if (t >= ws[j].start) k = j; return k; }

  /** hook for subclasses: extra 2D overlay or per-frame global updates */
  overlay(_f: Frame, _i: number): void {}

  render(f: Frame, out: RT): PostOverride {
    const t = f.t;
    const i = this.vi(t);
    let po: PostOverride = {};
    this.groups.forEach((g, j) => {
      const near = Math.abs(j - i) <= 1;
      g.visible = near;
      if (near && this.shotDefs[j].reveal !== false) {
        // cards are drawn on by the beam, staggered, starting just before the cut
        const cs = (g.userData.cards ?? []) as Card[];
        const n = cs.length, span = Math.min(0.5, 0.12 * n);
        cs.forEach((c, k) => {
          const s0 = this.cuts[j] - 0.12 + (n > 1 ? (k / (n - 1)) * span : 0);
          const r = j < i ? 1 : prog(t, s0, s0 + 0.5);
          c.reveal = ease.outCubic(r);
          // entry: flies in from behind its plane and settles with a little overshoot; then floats
          const fly = 1 - ease.outBack(prog(t, s0, s0 + 0.75));
          const fl = 0.05 * c.mesh.geometry.parameters.width / 6;
          c.uOff.value.set(noise1(t * 0.45, 31 + k * 7) * fl, noise1(t * 0.4, 47 + k * 7) * fl - fly * 0.35, -fly * 1.6 + noise1(t * 0.35, 59 + k * 7) * fl * 2);
        });
      } else if (near) {
        for (const c of (g.userData.cards ?? []) as Card[]) c.uOff.value.set(0, 0, 0);
      }
      if (near) {
        const r = this.upd[j]({ t, lt: t - this.cuts[j], i: j, line: this.lines[j], t0: this.cuts[j], t1: this.vEnd(j), f, k: this.wordIdx(j, t) });
        if (j === i && r) po = r;
      }
    });
    const s = this.shotDefs[i];
    const shot = this.paths[i].at(t);
    // matched cuts: the camera accelerates out of the old shot and the new one lands with the same move
    // (whip pans, push-throughs, drops and rolls, rotating through the shots), so every cut has momentum
    {
      const kinds = ['whip', 'push', 'drop', 'roll'] as const;
      const kindOf = (j: number) => this.shotDefs[j]?.cut ?? kinds[(j * 3 + 1) % 4];
      const IN = 0.42, OUT = 0.22;
      const inK = i > 0 ? 1 - ease.outExpo(clamp((t - this.cuts[i]) / IN)) : 0;
      const nx = i + 1 < this.cuts.length ? this.cuts[i + 1] : Infinity;
      const outK = i + 1 < this.cuts.length ? ease.inCubic(clamp((t - (nx - OUT)) / OUT)) : 0;
      const kin = i > 0 ? kindOf(i) : 'none', kout = i + 1 < this.cuts.length ? kindOf(i + 1) : 'none';
      const dir = i % 2 ? 1 : -1;
      const fwd = [shot.look[0] - shot.pos[0], shot.look[1] - shot.pos[1], shot.look[2] - shot.pos[2]];
      const fl = Math.hypot(fwd[0], fwd[1], fwd[2]) || 1; fwd[0] /= fl; fwd[1] /= fl; fwd[2] /= fl;
      const right = [-fwd[2], 0, fwd[0]]; const rl = Math.hypot(right[0], right[2]) || 1; right[0] /= rl; right[2] /= rl;
      const apply = (kind: string, k: number, sign: number) => {
        if (kind === 'whip') { const a = sign * k * 0.55; const ox = shot.look[0] - shot.pos[0], oz = shot.look[2] - shot.pos[2]; const ca = Math.cos(a), sa = Math.sin(a); shot.look = [shot.pos[0] + ox * ca - oz * sa, shot.look[1], shot.pos[2] + ox * sa + oz * ca]; }
        else if (kind === 'push') { const d = -sign * k * fl * 0.7; shot.pos = [shot.pos[0] + fwd[0] * d, shot.pos[1] + fwd[1] * d, shot.pos[2] + fwd[2] * d]; shot.fov += k * 14; }
        else if (kind === 'drop') { const d = sign * k * fl * 0.35; shot.pos = [shot.pos[0], shot.pos[1] + d, shot.pos[2]]; shot.look = [shot.look[0], shot.look[1] + d, shot.look[2]]; }
        else if (kind === 'roll') { shot.roll += sign * k * 0.5; shot.fov -= k * 8; }
      };
      if (inK > 0.001) apply(kin, inK, dir);
      if (outK > 0.001) apply(kout, outK, dir);
      po.zoom = (po.zoom ?? 1) * (1 + 0.04 * outK + 0.03 * inK);
    }
    // drift: a slow arc around the subject and a dolly-in, alternating per shot, so flat planes always parallax
    const dr = s0drift(this.shotDefs[i]);
    if (dr > 0) {
      const u = clamp((t - this.cuts[i]) / Math.max(0.5, this.vEnd(i) - this.cuts[i]));
      const ang = (u - 0.5) * 0.16 * dr * (i % 2 ? 1 : -1);
      const k = 1 + (0.5 - u) * 0.1 * dr;
      const ox = shot.pos[0] - shot.look[0], oz = shot.pos[2] - shot.look[2], oy = shot.pos[1] - shot.look[1];
      const ca = Math.cos(ang), sa = Math.sin(ang);
      shot.pos = [shot.look[0] + (ox * ca + oz * sa) * k, shot.look[1] + oy * k, shot.look[2] + (-ox * sa + oz * ca) * k];
      shot.focus *= k;
    }
    applyCam(this.cam, shot, t, s.handheld ?? 0.05, 0.05 * f.a.kick, 13 + i);
    this.rigs.forEach((r, j) => {
      if (!r) return;
      r.group.visible = Math.abs(j - i) <= 1;
      if (!r.group.visible) return;
      const ly = this.shotDefs[j].lyric;
      // follow: re-anchor toward the live camera so a lyric survives a long truck (0 = fixed in world, 1 = screen-locked)
      if (ly?.follow) { const l = this.lines[j], mid = (l.words[0].start + l.end) / 2; const tm = mid + (Math.min(Math.max(t, this.cuts[j]), this.vEnd(j)) - mid) * ly.follow; anchorRig(r, this.paths[j], tm, ly.sx ?? -0.7, ly.sy ?? -0.62, ly.D ?? 6.5, ly.scale ?? 0.66); }
      r.update(t);
    });
    this.ctx.three.render(this.scene, this.cam, out, { focus: shot.focus, aperture: s.dof?.aperture ?? 22, maxR: s.dof?.maxR ?? 10 });
    this.begin();
    this.overlay(f, i);
    this.flush(out, 2.0);
    return { hud: 1, zoom: 1 + 0.008 * f.a.kick, flash: pulse(t, this.cuts[i], 0.05) * 0.35, vignette: 0.45, bloom: 0.55, ...po };
  }
}

/** Convenience: a card added to a group at a position. */
export function card(g: THREE.Group, pxW: number, pxH: number, worldW: number, pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], o: ConstructorParameters<typeof Card>[3] = {}) {
  const c = new Card(pxW, pxH, worldW, o).at(pos[0], pos[1], pos[2], rot[1], rot[0], rot[2]);
  g.add(c.mesh);
  ((g.userData.cards ??= []) as Card[]).push(c);
  return c;
}

/** Standard camera moves (relative to the shot origin). */
export const moves = {
  push: (t0: number, t1: number, from: [number, number, number], to: [number, number, number], look: [number, number, number], fov0 = 40, fov1 = 38): CamKey[] => [
    { t: t0, pos: from, look, fov: fov0 }, { t: t1, pos: to, look, fov: fov1 },
  ],
  truck: (t0: number, t1: number, y: number, z: number, x0: number, x1: number, lookZ = 0, fov = 40): CamKey[] => [
    { t: t0, pos: [x0, y, z], look: [x0 + 0.5, y * 0.6, lookZ], fov }, { t: t1, pos: [x1, y, z], look: [x1 + 0.5, y * 0.6, lookZ], fov },
  ],
};
