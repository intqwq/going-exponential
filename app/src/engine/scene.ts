import type { PostParams } from './post';
import { type RT, type Layer, type Compositor, FSPass, W, H } from './gl';
import type { Lyrics, Audio } from './data';
import type { Three } from './three';

export interface Frame {
  t: number; // song time
  lt: number; // local time since the entry start
  p: number; // local progress 0..1
  dt: number;
  beat: number; // continuous beat index
  beatPhase: number;
  bar: number;
  barPhase: number;
  a: { rms: number; low: number; high: number; vocals: number; drums: number; kick: number; hat: number };
  /** transition-in progress (0→1 during an overlap with the previous entry), 1 otherwise */
  tin: number;
  under?: RT; // the previous entry's frame during an overlap (for scenes that handle their own transitions)
}

export interface Ctx {
  lyrics: Lyrics;
  audio: Audio;
  comp: Compositor;
  three: Three;
  base: Layer; // Canvas2D layer composited normally (sRGB)
  glow: Layer; // Canvas2D layer composited additively with gain (blooms)
  start: number;
  end: number;
  params: Record<string, unknown>;
}

export type PostOverride = Partial<PostParams> & { hud?: number };

export abstract class Scene {
  ctx!: Ctx;
  handlesTransition = false;
  async init(): Promise<void> {}
  abstract render(f: Frame, out: RT): PostOverride | void;

  get c() { return this.ctx.base.ctx; }
  get g() { return this.ctx.glow.ctx; }
  /** Clear both canvas layers (call at the start of drawing). */
  begin() {
    this.ctx.base.clear();
    this.ctx.glow.clear();
  }
  /** Composite both canvas layers onto out. */
  flush(out: RT, glowGain = 2.2, baseOpacity = 1) {
    const { comp, base, glow } = this.ctx;
    comp.draw(base.upload(), out, { mode: 'alpha', opacity: baseOpacity });
    comp.draw(glow.upload(), out, { mode: 'add', gain: glowGain });
  }
}

export { W, H, FSPass };
