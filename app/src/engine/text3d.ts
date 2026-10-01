// 3D typography.
//  - WordSprite: a word rendered once to a high-res canvas texture on a plane (crisp, glowable, DOF-blurred).
//  - extrudeText: real extruded glyph geometry from the font outlines (opentype.js) for hero titles.
import * as THREE from 'three';
import opentype from 'opentype.js';
import brico800 from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-800-normal.woff?url';
import brico600 from '@fontsource/bricolage-grotesque/files/bricolage-grotesque-latin-600-normal.woff?url';
import serifI from '@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff?url';
import { setFont, type FontSpec } from './type';

// ---------------------------------------------------------------- word sprites
const cache = new Map<string, { tex: THREE.CanvasTexture; w: number; h: number; asc: number }>();

/** Texture for a string in a font; world size: height 1 = font size (em box). */
export function wordTexture(text: string, f: FontSpec, color = '#ffffff', tracking = 0) {
  const key = `${text}|${f.fam}|${f.wght}|${f.italic}|${f.stretch}|${color}|${tracking}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const px = 200;
  const probe = new OffscreenCanvas(8, 8).getContext('2d')!;
  setFont(probe, f, px);
  (probe as unknown as CanvasRenderingContext2D).letterSpacing = `${tracking * px}px`;
  const m = probe.measureText(text);
  const pad = Math.ceil(px * 0.25);
  const w = Math.ceil(m.width + pad * 2), h = Math.ceil(px * 1.5 + pad);
  const cv = new OffscreenCanvas(w, h);
  const c = cv.getContext('2d')!;
  setFont(c, f, px);
  (c as unknown as CanvasRenderingContext2D).letterSpacing = `${tracking * px}px`;
  c.textBaseline = 'alphabetic';
  const base = pad * 0.5 + px * 1.08;
  // a soft dark halo keeps words readable over light plates
  c.shadowColor = 'rgba(0,0,0,0.75)'; c.shadowBlur = px * 0.18;
  c.fillStyle = color;
  c.fillText(text, pad, base);
  c.shadowBlur = 0;
  c.fillText(text, pad, base);
  const tex = new THREE.CanvasTexture(cv as unknown as HTMLCanvasElement);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  const out = { tex, w: w / px, h: h / px, asc: base / px, advance: m.width / px, pad: pad / px } as { tex: THREE.CanvasTexture; w: number; h: number; asc: number; advance: number; pad: number };
  cache.set(key, out);
  return out;
}

export class WordSprite extends THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> {
  advance: number;
  constructor(public text: string, f: FontSpec, size = 1, color = '#ffffff', tracking = 0) {
    const t = wordTexture(text, f, color, tracking) as ReturnType<typeof wordTexture> & { advance: number; pad: number };
    const geo = new THREE.PlaneGeometry(t.w * size, t.h * size);
    // anchor: (0,0) = start of the text on its baseline
    geo.translate((t.w / 2 - t.pad) * size, (t.asc - t.h / 2) * size, 0);
    const mat = new THREE.MeshBasicMaterial({ map: t.tex, transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
    super(geo, mat);
    this.advance = t.advance * size;
    this.renderOrder = 10;
  }
  /** HDR tint: k > 1 blooms */
  tint(r: number, g: number, b: number, a = 1) { this.material.color.setRGB(r, g, b); this.material.opacity = a; }
}

// ---------------------------------------------------------------- extruded glyphs
const fontCache = new Map<string, Promise<opentype.Font>>();
function loadOT(url: string) {
  if (!fontCache.has(url)) fontCache.set(url, fetch(url).then((r) => r.arrayBuffer()).then((b) => opentype.parse(b)));
  return fontCache.get(url)!;
}
export const OT = { display: brico800, displaySemi: brico600, serifItalic: serifI };

export interface Glyph3D { char: string; geo: THREE.ExtrudeGeometry; x: number; advance: number }

/** Build per-glyph extruded geometry (size = em height in world units). Glyphs are centred on their own x-extent. */
export async function extrudeText(text: string, fontUrl: string, size = 1, depth = 0.2, bevel = 0.02, curveSegments = 10): Promise<Glyph3D[]> {
  const font = await loadOT(fontUrl);
  const scale = size / font.unitsPerEm;
  const glyphs = [...text].map((ch) => font.charToGlyph(ch));
  const out: Glyph3D[] = [];
  let x = 0;
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const adv = (g.advanceWidth ?? 0) * scale;
    let kern = 0; try { kern = i + 1 < glyphs.length ? font.getKerningValue(g, glyphs[i + 1]) * scale : 0; } catch { kern = 0; }
    const path = g.getPath(0, 0, size);
    const sp = new THREE.ShapePath();
    for (const cmd of path.commands) {
      // opentype y is down in getPath; flip to y-up
      if (cmd.type === 'M') sp.moveTo(cmd.x, -cmd.y);
      else if (cmd.type === 'L') sp.lineTo(cmd.x, -cmd.y);
      else if (cmd.type === 'Q') sp.quadraticCurveTo(cmd.x1, -cmd.y1, cmd.x, -cmd.y);
      else if (cmd.type === 'C') sp.bezierCurveTo(cmd.x1, -cmd.y1, cmd.x2, -cmd.y2, cmd.x, -cmd.y);
    }
    const shapes = sp.toShapes();
    const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel * 0.8, bevelSegments: 3, curveSegments });
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const cx = (bb.min.x + bb.max.x) / 2;
    geo.translate(-cx, 0, -depth / 2);
    out.push({ char: text[i], geo, x: x + cx, advance: adv + kern });
    x += adv + kern;
  }
  return out;
}

export function textWidth(glyphs: Glyph3D[]) {
  return glyphs.reduce((a, g) => a + g.advance, 0);
}
