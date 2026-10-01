// Full-film renderer with a live progress display.
//
//   node scripts/render-film.mjs [--jobs 6]   (--encoder x264 without an NVIDIA GPU; --ffmpeg / --chrome to point at binaries)
//   node scripts/render-film.mjs [--jobs 6] [--samples 4] [--cq 19] [--encoder nvenc|x264] [--fresh]
//                                [--from 0] [--to 293.642] [--out ../out/going-exponential-1080p60.mp4]
//
// What it does:
//   1. starts its own Vite server without hot reload (so edits can't reload a page mid-render),
//   2. splits the film into ~20 s chunks and renders them with a pool of headless-Chrome workers
//      (each chunk: WebGL on the GPU → YUV packed on the GPU → ffmpeg; NVENC encodes on the GPU by default),
//   3. resumes: finished chunks are kept between runs (--fresh starts over),
//   4. concatenates the chunks losslessly, muxes the song, and writes a 720p preview next to the film.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const has = (k) => args.includes('--' + k);

const fps = 60;
const jobs = Number(opt('jobs', '6'));
const samples = opt('samples', '4');
const encoder = opt('encoder', 'nvenc');
const cq = opt('cq', encoder === 'nvenc' ? '21' : '20');
const from = Number(opt('from', '0'));
const dur = 293.642;
const to = Math.min(dur, Number(opt('to', String(dur))));
const out = path.resolve(app, opt('out', '../out/going-exponential-1080p60.mp4'));
const preview = out.replace(/\.mp4$/, '') + '-720p-preview.mp4';
const ffmpeg = opt('ffmpeg', process.env.FFMPEG ?? [path.resolve(app, '../tools/ffmpeg.exe'), path.resolve(app, '../tools/ffmpeg')].find((x) => fs.existsSync(x)) ?? 'ffmpeg');
const chunkSec = Number(opt('chunk', '20'));
const tmp = path.join(path.dirname(out), 'segments');
fs.mkdirSync(tmp, { recursive: true });

// ------------------------------------------------------------------ display
const isTTY = process.stdout.isTTY;
const fmtT = (s) => { s = Math.max(0, Math.round(s)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return (h ? h + 'h' : '') + String(m).padStart(h ? 2 : 1, '0') + 'm' + String(x).padStart(2, '0') + 's'; };
const bar = (p, w = 40) => { const n = Math.round(p * w); return '█'.repeat(n) + '░'.repeat(w - n); };
let lastLines = 0;
function draw(lines) {
  if (isTTY) { if (lastLines) process.stdout.write(`\x1b[${lastLines}A`); process.stdout.write(lines.map((l) => '\x1b[2K' + l).join('\n') + '\n'); lastLines = lines.length; }
}
const log = (s) => { if (isTTY && lastLines) { process.stdout.write(`\x1b[${lastLines}A\x1b[0J`); lastLines = 0; } console.log(s); };

// ------------------------------------------------------------------ server
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, () => { const p = s.address().port; s.close(() => res(p)); }); });
async function startServer() {
  const port = await freePort();
  const vite = spawn(process.execPath, [path.join(app, 'node_modules/vite/bin/vite.js'), '--port', String(port), '--strictPort'], {
    cwd: app, env: { ...process.env, PV_NO_HMR: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
  });
  vite.stdout.on('data', () => {}); vite.stderr.on('data', () => {});
  const url = `http://localhost:${port}`;
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(url); if (r.ok) return { vite, url }; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('vite did not start');
}

// ------------------------------------------------------------------ chunks
const F0 = Math.round(from * fps), F1 = Math.round(to * fps);
const nCh = Math.max(jobs, Math.ceil((F1 - F0) / (fps * chunkSec)));
const bounds = Array.from({ length: nCh + 1 }, (_, k) => Math.round(F0 + ((F1 - F0) * k) / nCh));
const tag = `${fps}-${samples}-${encoder}${cq}`;
if (has('fresh')) for (const f of fs.readdirSync(tmp)) fs.rmSync(path.join(tmp, f), { force: true });
const segs = bounds.slice(0, -1).map((_, k) => path.join(tmp, `ch${String(k).padStart(3, '0')}-${bounds[k]}-${bounds[k + 1]}-${tag}.mp4`));
const frames = (k) => bounds[k + 1] - bounds[k];
const queue = segs.map((_, k) => k).filter((k) => !fs.existsSync(segs[k]));
const totalFrames = F1 - F0;
let doneFrames = segs.reduce((s, f, k) => s + (fs.existsSync(f) ? frames(k) : 0), 0);
const startDone = doneFrames;
const workers = Array.from({ length: jobs }, () => ({ chunk: -1, done: 0, total: 0, state: 'idle' }));
const t0 = Date.now();

function render() {
  const live = workers.reduce((s, w) => s + (w.chunk >= 0 ? w.done : 0), 0);
  const f = doneFrames + live, p = f / totalFrames;
  const el = (Date.now() - t0) / 1000, rate = (f - startDone) / Math.max(1, el);
  const eta = rate > 0 ? (totalFrames - f) / rate : 0;
  const lines = [
    `Going Exponential · 1080p60 · ${samples} samples/frame · ${encoder.toUpperCase()} cq ${cq} · ${jobs} workers`,
    `${bar(p)} ${(p * 100).toFixed(1).padStart(5)}%  ${f}/${totalFrames} frames  ${rate.toFixed(1)} fps  elapsed ${fmtT(el)}  ETA ${fmtT(eta)}`,
    `chunks: ${segs.filter((s) => fs.existsSync(s)).length}/${segs.length} done, ${queue.length} queued`,
    ...workers.map((w, i) => `  worker ${i + 1}: ${w.chunk < 0 ? w.state : `chunk ${String(w.chunk + 1).padStart(2)} ${bar(w.total ? w.done / w.total : 0, 20)} ${w.done}/${w.total}  (${((bounds[w.chunk] / fps)).toFixed(1)}–${(bounds[w.chunk + 1] / fps).toFixed(1)} s)`}`),
  ];
  if (isTTY) draw(lines);
  else if (Math.floor(el) % 10 === 0) console.log(lines[1]);
}

function runChunk(k, w, url) {
  return new Promise((res) => {
    const part = segs[k] + '.part.mp4';
    const W = workers[w]; W.chunk = k; W.done = 0; W.total = frames(k);
    const child = spawn(process.execPath, [path.join(here, 'render.mjs'), 'segment', '--machine', '--url', url, '--from', String(bounds[k] / fps), '--to', String(bounds[k + 1] / fps),
      '--port', String(5299 + w), '--out', part, '--fps', String(fps), '--samples', samples, '--shutter', '0.5', '--crf', cq, '--encoder', encoder, '--ffmpeg', ffmpeg, ...(opt('chrome') ? ['--chrome', opt('chrome')] : [])], { cwd: app, stdio: ['ignore', 'pipe', 'pipe'] });
    let errTail = '';
    child.stdout.on('data', (d) => {
      for (const line of String(d).split(/\r?\n/)) {
        const m = /^PROGRESS (\d+) (\d+)/.exec(line);
        if (m) { W.done = Number(m[1]); W.total = Number(m[2]); }
        else if (/SCENE ERRORS|pageerror|ffmpeg exited|stdin error/.test(line)) errTail = line;
      }
    });
    child.stderr.on('data', (d) => { const s = String(d); if (!/X4122|warning/.test(s)) errTail = s.slice(-300); });
    child.on('close', (code) => {
      W.chunk = -1; W.state = 'idle';
      if (code === 0 && fs.existsSync(part)) { fs.renameSync(part, segs[k]); doneFrames += frames(k); res(true); }
      else { log(`chunk ${k + 1} failed (exit ${code}) ${errTail.trim()}`); res(false); }
    });
  });
}

async function main() {
  log(`Rendering ${(to - from).toFixed(1)} s in ${segs.length} chunks (${segs.length - queue.length} already done) → ${path.relative(process.cwd(), out)}`);
  let server = null;
  if (queue.length) {
    log('starting render server…');
    server = await startServer();
    log(`server ${server.url}`);
  }
  const timer = setInterval(render, 500);
  try {
    await Promise.all(workers.map(async (_, w) => {
      for (;;) {
        const k = queue.shift();
        if (k === undefined) { workers[w].state = 'finished'; return; }
        let ok = false;
        for (let tries = 0; tries < 3 && !ok; tries++) ok = await runChunk(k, w, server.url);
        if (!ok) throw new Error(`chunk ${k + 1} failed 3 times`);
      }
    }));
  } finally {
    clearInterval(timer); render();
    if (server) server.vite.kill();
  }
  log('concatenating chunks and muxing the song…');
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s.split(path.sep).join('/')}'`).join('\n'));
  const song = path.join(app, 'public/song.mp3');
  const ff = (a) => new Promise((res, rej) => spawn(ffmpeg, a, { stdio: ['ignore', 'ignore', 'inherit'] }).on('close', (c) => (c === 0 ? res() : rej(new Error('ffmpeg failed')))));
  await ff(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ss', String(from), '-t', String(to - from), '-i', song,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', out]);
  log('writing the 720p preview…');
  await ff(['-y', '-loglevel', 'error', '-i', out, '-vf', 'scale=1280:720:flags=lanczos', '-c:v', encoder === 'nvenc' ? 'h264_nvenc' : 'libx264',
    ...(encoder === 'nvenc' ? ['-preset', 'p6', '-cq', '24'] : ['-crf', '24', '-preset', 'medium']), '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', preview]);
  log(`done in ${fmtT((Date.now() - t0) / 1000)}\n  ${out}\n  ${preview}`);
}

main().catch((e) => { log('render failed: ' + e.message); process.exit(1); });
