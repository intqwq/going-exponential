// Fallback plate: karaoke on black. Used only while a plate is under construction.
import { Plate, Solid, type Frame } from './_base';
import type { RT } from '../engine/gl';
import { F } from '../engine/type';
import { drawLine, label } from '../engine/draw';

export default class Generic extends Plate {
  bg = new Solid();
  async init() {
    const { lyrics, start, end } = this.ctx;
    this.useLines(lyrics.lines.filter((l) => l.start >= start - 0.3 && l.start < end));
  }
  render(f: Frame, out: RT) {
    this.bg.render(out);
    this.begin();
    const i = this.vi(f.t);
    const l = this.lines[i];
    label(this.c, String(this.ctx.params.name ?? ''), 96, 96);
    if (l) drawLine(this.c, this.g, l, f.t, 960, 560, { font: F.display(700), size: 84, align: 'center', maxWidth: 1600 });
    this.flush(out);
  }
}
