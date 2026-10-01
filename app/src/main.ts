import '@fontsource/noto-serif-sc/400.css';
import { Engine } from './engine/engine';
import { buildTimeline, hudKeys } from './timeline';

const qs = new URLSearchParams(location.search);
const exportMode = qs.has('export');
if (exportMode) document.body.classList.add('export');

const canvas = document.getElementById('c') as HTMLCanvasElement;
const scrub = document.getElementById('scrub') as HTMLInputElement;
const info = document.getElementById('info')!;
const marks = document.getElementById('marks')!;
const errs = document.getElementById('errs')!;
const start = document.getElementById('start')!;

const eng = new Engine();
const audio = new Audio();
audio.src = 'song.mp3';
audio.preload = 'auto';
(window as unknown as Record<string, unknown>).__audio = audio;

let playing = false;
let t = parseFloat(qs.get('t') ?? '0') || 0;
let loop: { a: number; b: number } | null = null;

function showErrors() {
  if (eng.errors.length) {
    errs.style.display = 'block';
    errs.textContent = eng.errors.join('\n');
  }
}

async function main() {
  await eng.init(canvas, buildTimeline, hudKeys);
  (window as unknown as Record<string, unknown>).__eng = eng;
  showErrors();
  scrub.max = String(eng.duration);
  // scene marks
  for (const e of eng.entries) {
    const m = document.createElement('div');
    m.className = 'mark';
    m.style.left = `${(e.start / eng.duration) * 100}%`;
    m.style.width = `${((e.end - e.start) / eng.duration) * 100}%`;
    m.textContent = e.id;
    m.title = `${e.id} ${e.start.toFixed(2)}–${e.end.toFixed(2)}`;
    m.onclick = () => seek(e.start);
    marks.appendChild(m);
  }
  if (exportMode) {
    start.remove();
    (window as unknown as Record<string, unknown>).__renderFrame = (tt: number, fps: number, n: number, shutter: number) => {
      eng.renderBlur(tt, fps, n, shutter);
    };
    (window as unknown as Record<string, unknown>).__ready = true;
    return;
  }
  eng.renderTime(t);
  start.onclick = () => { start.remove(); play(); };
  requestAnimationFrame(tick);
}

function seek(x: number) {
  t = Math.max(0, Math.min(eng.duration - 0.001, x));
  audio.currentTime = t;
  clockBase = t; clockT0 = performance.now();
  if (!playing) eng.renderTime(t);
}

// Master clock: the audio element when it is advancing, else a wall clock (so visuals never stall).
let clockBase = 0, clockT0 = 0;
function wall() { return clockBase + (performance.now() - clockT0) / 1000; }
function play() {
  if (playing) return;
  audio.currentTime = t;
  clockBase = t; clockT0 = performance.now();
  audio.play().catch((e) => console.warn('audio play failed; running on wall clock', e));
  playing = true;
}
function pause() {
  audio.pause();
  playing = false;
}
function clock() {
  const w = wall();
  const at = audio.currentTime;
  if (!audio.paused && Math.abs(at - w) < 0.75) {
    // re-anchor the wall clock to the audio, gently
    clockBase = at; clockT0 = performance.now();
    return at;
  }
  return w;
}

let lastPerf = 0, fpsAvg = 60;
function tick(now: number) {
  requestAnimationFrame(tick);
  if (playing) {
    t = Math.min(clock(), eng.duration);
    if (loop && t >= loop.b) seek(loop.a);
    if (audio.ended || t >= eng.duration) pause();
  }
  const t0 = performance.now();
  eng.renderTime(t);
  const ms = performance.now() - t0;
  if (lastPerf) fpsAvg = fpsAvg * 0.95 + (1000 / Math.max(1, now - lastPerf)) * 0.05;
  lastPerf = now;
  scrub.value = String(t);
  const e = eng.sceneAt(t);
  const l = eng.lyrics.at(t);
  info.textContent = `${fmt(t)} / ${fmt(eng.duration)} · ${e?.id ?? '—'} · beat ${eng.audio.beatAt(t).toFixed(2)} · ${ms.toFixed(1)} ms · ${fpsAvg.toFixed(0)} fps${loop ? ' · LOOP' : ''} · ${l ? l.text : ''}`;
  showErrors();
}
const fmt = (x: number) => `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, '0')}`;

scrub.oninput = () => seek(parseFloat(scrub.value));
canvas.onclick = () => (playing ? pause() : play());
window.addEventListener('keydown', (ev) => {
  const k = ev.key;
  if (k === ' ') { ev.preventDefault(); playing ? pause() : play(); }
  else if (k === 'ArrowRight') seek(t + (ev.shiftKey ? 5 : 1));
  else if (k === 'ArrowLeft') seek(t - (ev.shiftKey ? 5 : 1));
  else if (k === '.') seek(t + 1 / 60);
  else if (k === ',') seek(t - 1 / 60);
  else if (k === ']' || k === '[') {
    const es = eng.entries;
    const i = es.findIndex((e) => t >= e.start && t < e.end);
    const j = Math.max(0, Math.min(es.length - 1, i + (k === ']' ? 1 : -1)));
    seek(es[j].start);
  } else if (k === 'l') {
    const e = eng.sceneAt(t);
    loop = loop ? null : e ? { a: e.start, b: e.end } : null;
  } else if (k === 'h') {
    document.getElementById('ui')!.classList.toggle('hidden');
    document.body.classList.toggle('nohud');
  } else if (k === 'f') {
    if (document.fullscreenElement) document.exitFullscreen();
    else canvas.requestFullscreen();
  }
});

main().catch((e) => {
  errs.style.display = 'block';
  errs.textContent = String(e?.stack ?? e);
});
