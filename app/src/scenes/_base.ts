// Helpers shared by the plates.
import { Scene, type Frame } from '../engine/scene';
import type { Line } from '../engine/data';
import { FSPass, type RT, clearRT } from '../engine/gl';
import { LIN } from '../engine/palette';

/** A plate built from sub-vignettes that cut on (beat-snapped) lyric line starts. */
export abstract class Plate extends Scene {
  lines: Line[] = [];
  cuts: number[] = [];
  /** Build lines + cut times: each cut is the line start snapped to the nearest beat (or half beat). */
  useLines(lines: Line[], snapDiv = 1) {
    this.lines = lines;
    this.cuts = lines.map((l) => this.ctx.audio.snap(l.start - 0.05, snapDiv));
    this.cuts[0] = Math.min(this.cuts[0], this.ctx.start);
    this.cuts[0] = this.ctx.start;
  }
  /** index of the active vignette at t */
  vi(t: number) {
    let k = 0;
    for (let i = 0; i < this.cuts.length; i++) if (t >= this.cuts[i]) k = i;
    return k;
  }
  /** local time within vignette i */
  vt(t: number, i: number) { return t - this.cuts[i]; }
  vEnd(i: number) { return i + 1 < this.cuts.length ? this.cuts[i + 1] : this.ctx.end; }
}

/** Solid background pass. */
export class Solid {
  pass = new FSPass(`uniform vec3 col; void main(){ fragColor = vec4(col, 1.0); }`);
  render(out: RT, col: [number, number, number] = LIN.ink) {
    this.pass.u = { col };
    this.pass.render(out);
  }
}

export { clearRT };
export type { Frame };
