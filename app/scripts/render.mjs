// Offline renderer: drives the app in headless Chrome.
//   node scripts/render.mjs stills --t 12.5,14,20 --out ../out/wip
//   node scripts/render.mjs sheet --from 0 --to 17 --n 12 --cols 4 --out ../out/wip/sheet.png
//   node scripts/render.mjs video --from 0 --to 293.6 --fps 60 --samples 4 --out ../out/going-exponential.mp4
// Needs the dev server (npm run dev, port 5199) or pass --url.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const mode = args[0] ?? 'stills';
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const url = opt('url', 'http://localhost:5199');
const out = path.resolve(opt('out', path.join(here, '../../out/wip')));
// Chrome and ffmpeg: --chrome / --ffmpeg, or the CHROME / FFMPEG env vars, or the usual install locations / PATH
const firstExisting = (xs) => xs.find((x) => x && fs.existsSync(x));
const chromePath = opt('chrome', process.env.CHROME ?? firstExisting([
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser',
]));
const ffmpeg = opt('ffmpeg', process.env.FFMPEG ?? firstExisting([path.join(here, '../../tools/ffmpeg.exe'), path.join(here, '../../tools/ffmpeg')]) ?? 'ffmpeg');

const browser = await chromium.launch({
  executablePath: chromePath,
  headless: true,
  args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-webgpu', '--autoplay-policy=no-user-gesture-required'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') console.log('[page]', m.type(), m.text().slice(0, 400)); });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(url + '/?export', { waitUntil: 'load' });
await page.waitForFunction(() => window.__ready === true, null, { timeout: 120000 });
const errs = await page.evaluate(() => window.__eng.errors);
if (errs.length) console.log('SCENE ERRORS:\n' + errs.join('\n'));

async function still(t, file, n = 1) {
  const data = await page.evaluate(([t, n]) => {
    window.__renderFrame(t, 60, n, 0.5);
    return document.getElementById('c').toDataURL('image/png');
  }, [t, n]);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.from(data.split(',')[1], 'base64'));
}

if (mode === 'stills') {
  const ts = opt('t', '1').split(',').map(Number);
  for (const t of ts) {
    const f = path.join(out, `t${t.toFixed(2).padStart(7, '0')}.png`);
    await still(t, f, Number(opt('samples', '1')));
    console.log('wrote', f);
  }
} else if (mode === 'sheet') {
  const from = Number(opt('from', '0')), to = Number(opt('to', '10')), n = Number(opt('n', '12')), cols = Number(opt('cols', '4'));
  const ts = opt('t') ? opt('t').split(',').map(Number) : Array.from({ length: n }, (_, i) => from + ((to - from) * i) / Math.max(1, n - 1));
  const data = await page.evaluate(([ts, cols]) => {
    const cw = 640, ch = 360, pad = 4;
    const rows = Math.ceil(ts.length / cols);
    const sc = document.createElement('canvas');
    sc.width = cols * (cw + pad); sc.height = rows * (ch + pad + 18);
    const x = sc.getContext('2d');
    x.fillStyle = '#222'; x.fillRect(0, 0, sc.width, sc.height);
    const src = document.getElementById('c');
    ts.forEach((t, i) => {
      window.__renderFrame(t, 60, 1, 0.5);
      const cx = (i % cols) * (cw + pad), cy = Math.floor(i / cols) * (ch + pad + 18);
      x.drawImage(src, cx, cy + 18, cw, ch);
      x.fillStyle = '#ccc'; x.font = '13px monospace'; x.fillText(`t=${t.toFixed(2)}`, cx + 4, cy + 13);
    });
    return sc.toDataURL('image/png');
  }, [ts, cols]);
  const f = out.endsWith('.png') ? out : path.join(out, 'sheet.png');
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, Buffer.from(data.split(',')[1], 'base64'));
  console.log('wrote', f);
} else if (mode === 'motion') {
  // motion energy: mean |Δ| between consecutive low-res samples → finds static stretches
  const from = Number(opt('from', '0')), to = Number(opt('to', '293.6')), step = Number(opt('step', '0.2'));
  const rows = await page.evaluate(async ([from, to, step]) => {
    const src = document.getElementById('c');
    const sc = document.createElement('canvas'); sc.width = 160; sc.height = 90; const x = sc.getContext('2d', { willReadFrequently: true });
    let prev = null; const out = [];
    for (let t = from; t <= to; t += step) {
      window.__renderFrame(t, 60, 1, 0.5);
      x.drawImage(src, 0, 0, 160, 90);
      const d = x.getImageData(0, 0, 160, 90).data;
      let diff = 0, lum = 0;
      for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; lum += l; if (prev) diff += Math.abs(l - prev[i >> 2]); }
      const cur = new Float32Array(d.length / 4); for (let i = 0; i < d.length; i += 4) cur[i >> 2] = (d[i] + d[i + 1] + d[i + 2]) / 3;
      prev = cur;
      out.push([+t.toFixed(2), +(diff / cur.length).toFixed(2), +(lum / cur.length).toFixed(1)]);
    }
    return out;
  }, [from, to, step]);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const f = out.endsWith('.csv') ? out : path.join(out, 'motion.csv');
  fs.writeFileSync(f, ['t,diff,lum', ...rows.map((r) => r.join(','))].join(String.fromCharCode(10)));
  console.log('wrote', f);
} else if (mode === 'segment') {
  // one worker: renders [from, to) to a video-only mp4 via WebSocket → ffmpeg (yuv420p raw)
  const fps = Number(opt('fps', '60'));
  const from = Number(opt('from')), to = Number(opt('to'));
  const samples = Number(opt('samples', '4')), shutter = Number(opt('shutter', '0.5'));
  const crf = opt('crf', '18'), preset = opt('preset', 'medium');
  const port = Number(opt('port', '5299'));
  const file = path.resolve(opt('out'));
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const ff = spawn(ffmpeg, [
    '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', '1920x1080', '-r', String(fps),
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-i', '-',
    ...(opt('encoder', 'x264') === 'nvenc'
      // GPU encode (NVENC): constant-quality VBR; frees the CPU for the browsers
      ? ['-c:v', 'h264_nvenc', '-preset', 'p7', '-tune', 'hq', '-rc', 'vbr', '-cq', crf, '-b:v', '0', '-maxrate', '120M', '-bufsize', '240M', '-spatial-aq', '1', '-aq-strength', '8', '-bf', '3', '-profile:v', 'high']
      : ['-c:v', 'libx264', '-preset', preset, '-crf', crf, '-tune', 'grain']),
    '-pix_fmt', 'yuv420p',
    '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-an', file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  // if the encoder dies, fail this chunk cleanly (the pool retries it)
  ff.stdin.on('error', (e) => { console.log('[seg] ffmpeg stdin error:', e.code); process.exit(1); });
  ff.on('exit', (code, sig) => { if (code !== 0) { console.log('[seg] ffmpeg exited', code, sig); process.exit(1); } });
  const { WebSocketServer } = await import('ws');
  const wss = new WebSocketServer({ port });
  wss.on('connection', (sock) => sock.on('message', (buf) => {
    const ok = ff.stdin.write(buf);
    if (ok) sock.send('ok'); else ff.stdin.once('drain', () => sock.send('ok'));
  }));
  const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
  const t0 = Date.now();
  await page.evaluate(async ([port]) => {
    const ws = new WebSocket('ws://localhost:' + port); ws.binaryType = 'arraybuffer';
    await new Promise((r) => (ws.onopen = r));
    window.__ws = ws;
    window.__px = new Uint8Array(480 * 1620 * 4);
  }, [port]);
  const CH = args.includes('--machine') ? 10 : 30; // frames per evaluate call
  for (let fi = f0; fi < f1; fi += CH) {
    const n = Math.min(CH, f1 - fi);
    await page.evaluate(async ([fi, n, fps, samples, shutter]) => {
      const e = window.__eng, gl = document.getElementById('c').getContext('webgl2');
      for (let k = 0; k < n; k++) {
        window.__renderFrame((fi + k) / fps, fps, samples, shutter);
        e.packYUV();
        gl.readPixels(0, 0, 480, 1620, gl.RGBA, gl.UNSIGNED_BYTE, window.__px);
        const ack = new Promise((r) => (window.__ws.onmessage = r));
        window.__ws.send(window.__px);
        await ack;
      }
    }, [fi, n, fps, samples, shutter]);
    const done = fi + n - f0, total = f1 - f0;
    const el = (Date.now() - t0) / 1000;
    if (args.includes('--machine')) console.log(`PROGRESS ${done} ${total}`);
    else console.log(`[seg ${port}] ${done}/${total} ${(el / done * 1000).toFixed(0)} ms/f eta ${Math.round((el / done) * (total - done))} s`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  wss.close();
  console.log('wrote', file);
} else if (mode === 'video') {
  // split into --jobs parallel workers, then concat (lossless) + mux the song
  await browser.close();
  const fps = Number(opt('fps', '60'));
  const dur = Number(opt('duration', '293.642'));
  const from = Number(opt('from', '0')), to = Math.min(dur, Number(opt('to', String(dur))));
  const jobs = Number(opt('jobs', '2'));
  const file = path.resolve(opt('out', path.join(here, '../../out/going-exponential.mp4')));
  const tmp = path.join(path.dirname(file), 'segments');
  fs.mkdirSync(tmp, { recursive: true });
  // ~20 s chunks on whole frames, rendered by a pool of --jobs workers; each chunk is written to .part and renamed
  // when complete, retried on failure, and skipped on a re-run (resume) unless --fresh
  const F0 = Math.round(from * fps), F1 = Math.round(to * fps);
  const nCh = Math.max(jobs, Math.ceil((F1 - F0) / (fps * Number(opt('chunk', '20')))));
  const bounds = Array.from({ length: nCh + 1 }, (_, k) => Math.round(F0 + ((F1 - F0) * k) / nCh));
  const pass = ['--url', url, '--fps', String(fps), '--samples', opt('samples', '4'), '--shutter', opt('shutter', '0.5'), '--crf', opt('crf', '18'), '--preset', opt('preset', 'medium')];
  const tag = `${fps}-${opt('samples', '4')}-${opt('crf', '18')}`;
  if (args.includes('--fresh')) for (const f of fs.readdirSync(tmp)) fs.rmSync(path.join(tmp, f));
  const segs = bounds.slice(0, -1).map((_, k) => path.join(tmp, `ch${String(k).padStart(3, '0')}-${bounds[k]}-${bounds[k + 1]}-${tag}.mp4`));
  const queue = segs.map((_, k) => k).filter((k) => !fs.existsSync(segs[k]));
  console.log(`${segs.length} chunks, ${segs.length - queue.length} already done`);
  const runChunk = (k, port) => new Promise((res) => {
    const part = segs[k] + '.part.mp4';
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url), 'segment', '--from', String(bounds[k] / fps), '--to', String(bounds[k + 1] / fps), '--port', String(port), '--out', part, ...pass], { stdio: 'inherit' });
    child.on('close', (code) => { if (code === 0 && fs.existsSync(part)) { fs.renameSync(part, segs[k]); res(true); } else res(false); });
  });
  await Promise.all(Array.from({ length: jobs }, async (_, w) => {
    for (;;) {
      const k = queue.shift();
      if (k === undefined) return;
      let ok = false;
      for (let tries = 0; tries < 3 && !ok; tries++) { ok = await runChunk(k, 5299 + w); if (!ok) console.log(`chunk ${k} failed (try ${tries + 1})`); }
      if (!ok) throw new Error('chunk ' + k + ' failed 3 times');
      console.log(`chunk ${k} done (${segs.filter((f) => fs.existsSync(f)).length}/${segs.length})`);
    }
  }));
  const list = path.join(tmp, 'list.txt');
  fs.writeFileSync(list, segs.map((s) => `file '${s.split(path.sep).join('/')}'`).join('\n'));
  const song = path.join(here, '../public/song.mp3');
  await new Promise((res) => spawn(ffmpeg, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-ss', String(from), '-t', String(to - from), '-i', song,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '320k', '-shortest', '-movflags', '+faststart', file], { stdio: 'inherit' }).on('close', res));
  console.log('wrote', file);
  process.exit(0);
}
await browser.close();
