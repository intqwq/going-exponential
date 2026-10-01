// Typography. Three families, three voices:
//  - Bricolage Grotesque (variable wght 200–800, wdth 75–100): the voice of the lyrics.
//  - Martian Mono (variable wght 100–800, wdth 75–112.5): the machine — tokens, labels, code, readouts.
//  - Instrument Serif (roman + italic): the sacred register — the god, the future, "Let there be".
import bricolage from '@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2?url';
import martian from '@fontsource-variable/martian-mono/files/martian-mono-latin-standard-normal.woff2?url';
import serifR from '@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2?url';
import serifI from '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2?url';

type Ctx2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

export async function loadFonts() {
  const faces = [
    new FontFace('Brico', `url(${bricolage})`, { weight: '200 800', stretch: '75% 100%' }),
    new FontFace('Mart', `url(${martian})`, { weight: '100 800', stretch: '75% 112.5%' }),
    new FontFace('Serif', `url(${serifR})`, { weight: '400', style: 'normal' }),
    new FontFace('Serif', `url(${serifI})`, { weight: '400', style: 'italic' }),
  ];
  for (const f of faces) {
    await f.load();
    (document.fonts as FontFaceSet).add(f);
    // workers / offscreen canvases share document fonts in the main thread
  }
  // the composer's name (CJK subset of Noto Serif SC, registered by its @fontsource stylesheet)
  try { await document.fonts.load('400 120px "Noto Serif SC"', '数原律'); } catch { /* falls back to a system serif */ }
  await document.fonts.ready;
}

export type Stretch = 'ultra-condensed' | 'extra-condensed' | 'condensed' | 'semi-condensed' | 'normal' | 'semi-expanded' | 'expanded';

export interface FontSpec {
  fam: 'Brico' | 'Mart' | 'Serif';
  wght?: number;
  italic?: boolean;
  stretch?: Stretch;
}

export const F = {
  display: (wght = 700, stretch: Stretch = 'normal'): FontSpec => ({ fam: 'Brico', wght, stretch }),
  mono: (wght = 400, stretch: Stretch = 'normal'): FontSpec => ({ fam: 'Mart', wght, stretch }),
  serif: (italic = false): FontSpec => ({ fam: 'Serif', wght: 400, italic }),
};

export function setFont(c: Ctx2D, f: FontSpec, px: number) {
  c.font = `${f.italic ? 'italic ' : ''}${f.wght ?? 400} ${px}px ${f.fam}`;
  (c as CanvasRenderingContext2D).fontStretch = (f.stretch ?? 'normal') as CanvasFontStretch;
  (c as CanvasRenderingContext2D).fontKerning = 'normal';
}

export function measure(c: Ctx2D, text: string, f: FontSpec, px: number, tracking = 0) {
  setFont(c, f, px);
  (c as CanvasRenderingContext2D).letterSpacing = `${tracking}px`;
  const w = c.measureText(text).width;
  (c as CanvasRenderingContext2D).letterSpacing = '0px';
  return w;
}

/** Font size that makes `text` exactly `width` wide. */
export function fitSize(c: Ctx2D, text: string, f: FontSpec, width: number, tracking = 0) {
  const w100 = measure(c, text, f, 100, tracking);
  return (100 * width) / Math.max(1, w100);
}

export function text(
  c: Ctx2D,
  s: string,
  x: number,
  y: number,
  f: FontSpec,
  px: number,
  fill: string,
  align: CanvasTextAlign = 'left',
  base: CanvasTextBaseline = 'alphabetic',
  tracking = 0,
) {
  setFont(c, f, px);
  (c as CanvasRenderingContext2D).letterSpacing = `${tracking}px`;
  c.textAlign = align;
  c.textBaseline = base;
  c.fillStyle = fill;
  c.fillText(s, x, y);
  (c as CanvasRenderingContext2D).letterSpacing = '0px';
}

/** Glyph x offsets (with kerning) for per-character animation. Returns cumulative x of each char start and total width. */
export function glyphXs(c: Ctx2D, s: string, f: FontSpec, px: number, tracking = 0) {
  setFont(c, f, px);
  (c as CanvasRenderingContext2D).letterSpacing = `${tracking}px`;
  const xs: number[] = [];
  for (let i = 0; i < s.length; i++) xs.push(c.measureText(s.slice(0, i)).width);
  const total = c.measureText(s).width;
  (c as CanvasRenderingContext2D).letterSpacing = '0px';
  return { xs, total };
}

/** Typographic punctuation. */
export function smart(s: string) {
  return s
    .replace(/(^|[\s(\[{—–-])'/g, '$1‘')
    .replace(/'/g, '’')
    .replace(/(^|[\s(\[{—–-])"/g, '$1“')
    .replace(/"/g, '”')
    .replace(/\.\.\./g, '…');
}
