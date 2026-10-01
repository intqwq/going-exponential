// The edit: plate windows anchored to lyric lines, snapped to the beat grid.
import type { Entry } from './engine/engine';
import type { Lyrics, Audio } from './engine/data';
import type { Scene } from './engine/scene';
import Generic from './scenes/generic';
import Intro3D from './scenes/intro2';
import Tape3D from './scenes/tape3d';
import Verse1 from './scenes/verse1';
import Chorus from './scenes/chorus2';
import Race from './scenes/race2';
import Fab from './scenes/fab2';
import Proof from './scenes/proof2';
import Bridge from './scenes/bridge2';
import Future from './scenes/future2';
import Outro from './scenes/outro2';
import type { HudKey } from './engine/hud';

type Make = () => Scene;
const G = (name: string): Make => () => { const s = new Generic(); return s; };

/** The ledger: year + log10(frontier training FLOP), keyed to lyric words. */
export function hudKeys(ly: Lyrics): HudKey[] {
  const w = (frag: string, wi = 0, nth = 0) => ly.get(frag, nth).words[wi].start;
  return [
    { t: 0, year: 1936, exp: 0 },
    { t: w('Von Neumann'), year: 1945, exp: 3 },
    { t: w('Dartmouth'), year: 1956, exp: 6 },
    { t: w('Dartmouth', 2), year: 1974, exp: 8 },
    { t: w('Backprop'), year: 1986, exp: 12 },
    { t: w('AlexNet'), year: 2012, exp: 17.7 },
    { t: w('AlexNet', 2), year: 2016, exp: 21.3 },
    { t: w('Eight names', 2), year: 2017, exp: 21.5 },
    { t: w('Three years', 3), year: 2020, exp: 23.5 },
    { t: w('AlphaFold'), year: 2021, exp: 23.6 },
    { t: w('Chinchilla'), year: 2022, exp: 23.8 },
    { t: w('ChatGPT says', 1), year: 2022, exp: 24.4 },
    { t: w('GPT-4 can'), year: 2023, exp: 25.3 },
    { t: w('Chain of thought'), year: 2024, exp: 25.7 },
    { t: w('DeepSeek'), year: 2025, exp: 26.0 },
    { t: w('GPT-6'), year: 2026, exp: 27.0 },
    { t: w('ASML'), year: 2026, exp: 27.2 },
    { t: w('Navier'), year: 2026, exp: 27.5 },
    { t: w('Frankenstein'), year: 2027, exp: 28.3 },
    { t: w('RSI'), year: 2028, exp: 29.4 },
    { t: w('A year, a month', 3), year: 2029, exp: 30.8 },
    { t: w('Riemann'), year: '20??', exp: 33 },
    { t: w('We made a god'), year: '—', exp: 40 },
    { t: w('going exponential', 1, 2), year: '—', exp: Infinity },
  ];
}

export function buildTimeline(ly: Lyrics, au: Audio): Entry[] {
  const at = (frag: string, nth = 0) => au.snap(ly.get(frag, nth).start - 0.05);
  const T = {
    tape: at('Turing'),
    weights: at('One-seventy-five'),
    fold: at('AlphaFold'),
    chorus: at('going exponential', 0),
    race: at('Chinchilla'),
    fab: at('ASML'),
    proof: at('Navier'),
    reprise: at('going exponential', 1),
    bridge: at('Frankenstein'),
    future: at('Riemann'),
    final: at('going exponential', 2),
    outro: at('Next token'),
    end: au.d.duration,
  };
  const e = (id: string, a: number, b: number, make: Make, params: Record<string, unknown> = {}, xfade = 0): Entry => ({
    id, start: a, end: b, make, params: { name: id, ...params }, xfade,
  });
  const list: Entry[] = [
    e('intro', 0, T.tape, () => new Intro3D()),
    { ...e('tape', T.tape, T.weights, () => new Tape3D()), tr: { type: 'zoom', dur: 0.9 } },
    { ...e('verse1', T.weights, T.chorus, () => new Verse1()), tr: { type: 'whip', dur: 0.5, dir: [1, 0] } },
    { ...e('chorus', T.chorus, T.race, () => new Chorus(), { variant: 0 }), tr: { type: 'flash', dur: 0.35 } },
    { ...e('race', T.race, T.fab, () => new Race()), tr: { type: 'glitch', dur: 0.4 } },
    { ...e('fab', T.fab, T.proof, () => new Fab()), tr: { type: 'whip', dur: 0.45, dir: [0, 1] } },
    { ...e('proof', T.proof, T.reprise, () => new Proof()), tr: { type: 'zoom', dur: 0.6 } },
    { ...e('reprise', T.reprise, T.bridge, () => new Chorus(), { variant: 1 }), tr: { type: 'burn', dur: 0.5 } },
    { ...e('bridge', T.bridge, T.future, () => new Bridge()), tr: { type: 'whip', dur: 0.4, dir: [-1, 0] } },
    { ...e('future', T.future, T.final, () => new Future()), tr: { type: 'zoom', dur: 0.7 } },
    { ...e('final', T.final, T.outro, () => new Chorus(), { variant: 2 }), tr: { type: 'flash', dur: 0.4 } },
    { ...e('outro', T.outro, T.end, () => new Outro()), tr: { type: 'glitch', dur: 0.5 } },
  ];
  return list;
}
