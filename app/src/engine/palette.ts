import { hexToLinear, hexToRgb } from './util';

// "Silicon & gold": cold ink, warm bone paper, and one signal colour — gold, the colour of the curve,
// the cursor, the sung word and the god. One rare accent (proof green) is owned by the proofs:
// it appears only when something is verified ("turn green in the prover's queue").
export const HEX = {
  ink: '#07080B', // background: cold black
  ink2: '#111319', // raised black (panels)
  ink3: '#1B1E26', // hairline panels in the dark
  graphite: '#474B55', // dim lines, secondary text
  ash: '#8B8F99', // mid grey
  bone: '#ECE9E2', // paper / primary type
  paper: '#E9E5DB', // bone paper for the light plates
  gold: '#FFB21E', // signal: the exponential, the cursor, the sung word
  sun: '#FFE3A0', // hot gold core
  umber: '#8A4B06', // deep shadow of gold
  green: '#46E08A', // proof green (rare: verification only)
  red: '#FF3B2F', // alarm red (very rare: errors, quota exhausted)
} as const;

export type PaletteKey = keyof typeof HEX;

export const LIN = Object.fromEntries(Object.entries(HEX).map(([k, v]) => [k, hexToLinear(v)])) as Record<
  PaletteKey,
  [number, number, number]
>;

export function rgba(key: PaletteKey | string, a = 1): string {
  const hex = (HEX as Record<string, string>)[key] ?? key;
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/** Mix two palette colours in sRGB space → css. */
export function mix(a: PaletteKey, b: PaletteKey, t: number, alpha = 1): string {
  const A = hexToRgb(HEX[a]), B = hexToRgb(HEX[b]);
  const c = A.map((x, i) => Math.round(x + (B[i] - x) * t));
  return `rgba(${c[0]},${c[1]},${c[2]},${alpha})`;
}
