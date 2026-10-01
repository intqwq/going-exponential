# Going Exponential — music video

A generative, code-rendered music video for the song **"Going Exponential"** (music and words: 数原律 / intqwq):
the history of AI told as one long exponential, from Turing's tape to "Let there be…". Every frame is a
deterministic function of song time, so the live browser preview and the offline 1080p60 export are identical.

**Watch:** the rendered film (1920×1080, 60 fps, H.264 + AAC) is attached to the
[latest release](../../releases/latest).

The video was made with Claude (Anthropic) in Claude Code: the treatment, the lyric alignment and audio analysis,
the renderer, every scene and the renders were worked out in conversation.

## The treatment

**The idea.** The history of AI told as one long exponential. The through-line is a gold **cursor**: it is
Turing's tape head, the next token, and finally the light. A small ledger of frontier training compute
(10ⁿ FLOP + year) climbs through the whole video.

**Look.** Flat, sharp vector drawings (gold traces over near-black, bone for structure) mounted on cards at
different depths and filmed by a moving camera with parallax, depth of field and motion blur. Solids that remain
(the tape head, the 96-block stack, books, racks) are drawn, not lit: a dark fill, crisp edges and a rim outline
(`flatten()` in `scenes/kit.ts`). Lyrics are kinetic 3D type placed inside each shot, not captions.

**Oscilloscope language.** Lines behave like a vector scope's beam, not a retro CRT: traces are drawn on with a
bright beam head and a hot afterglow (`beam()` / `scan()` in `scenes/vec.ts`); every card is drawn onto its
plane by a gold scan line and flies in from depth at its cut (`Card.reveal` / `uOff`); figures are continuously
retraced (the god's robe and halo); data becomes scope traces (the release-cadence sine that collapses into a
band, an ECG under the folded hands, Lissajous-wobbled P/NP contours, radar sweeps).

**Camera.** Keyframed paths are a time-parameterised Hermite spline, so the camera keeps its velocity through
interior keys instead of stopping at each one; every shot also gets a slow automatic arc + dolly (alternating
direction), so flat planes always show parallax.
**Proof green** appears only when something is verified.

**Type.** Bricolage Grotesque (lyrics), Martian Mono (the machine), Instrument Serif italic (the sacred
register), Noto Serif SC for the composer's name.

| Plate | Module | Idea |
|---|---|---|
| Intro | `intro2.ts` | A cell divides on the beat (membrane, spindle, metaphase plate, cleavage furrow), flash-cutting to a layered network whose neurons split into the next layer. At 2⁶ the network keeps doubling to 2¹⁵ behind a frosted-acrylic slab; GOING EXPONENTIAL lands on it, each letter 1.19× the last, the heavy gold tail slamming down. |
| Opening | `tape3d.ts` | A Turing tape and head carriage run through history, every sung line written onto it one token per cell (GPT-4's pre-tokenizer, with token ids; `analysis/tokens.py`); per-line stations: transition table, von Neumann bus, Dartmouth proposal (summer sun → winter frost), backprop, AlexNet, move 37, attention, the GPT-3 playground. |
| Verse 1 | `verse1.ts` | The 96-block transformer stack, 175B counter, the autocomplete graduates, frozen weights, rows of books → token-by-token generation with probability boxes, AlphaFold on ubiquitin (MSA, pair map, residue frames). |
| Chorus ×3 | `chorus2.ts`, `expo-flight.ts` | A 3D chase up a doubling curve: the head punches through eleven gates (×2 … ×2048), stamping one letter of EXPONENTIAL per gate, then the camera is thrown back to the whole hockey stick and drops to a tiny human at the origin (the reprise flies it on log paper). The god behind a real API route; `sudo`; doubling panels; carbon orbitals; sand into a die; the interview console; tumours, rockets, a wafer-eye, a breached sandbox, `whoami → root`. |
| Verse 2 | `race2.ts` | Chinchilla iso-FLOPs, RLHF/PPO, a ChatGPT-like window, a photo dissolving into patches, chain of thought, GRPO + R1, distillation, a leaderboard trading blows, loss ↓ turning into invoice ↑ on a perpendicular plane. |
| Verse 3 | `fab2.ts` | EUV light path, TSMC wafer, CoWoS cross-section, a rack hall fly-through, GPU and RAM prices, bidders, subscriptions flooding an inbox, the effort CLI, the weekly quota cutting off Fermat, and a RESET button. |
| Verse 4 | `proof2.ts` | Navier–Stokes blowup and a 10k-agent swarm, Lean "No goals", the Jacobian counterexample (det J ≡ −1/9, three points ↦ one), ART, unit distances (ℤ[ζ₇] zonotope vs the grid), AlphaEvolve. |
| Bridge | `bridge2.ts` | A patchwork creature, a commit that authors a branch, a self-writing spec, a Droste corridor, a patent with no inventor, RSI rewiring, a tetration tower, year/month/day/blink. |
| Future | `future2.ts` | Z(t) and its zeros, P vs NP "RESOLVED", Hodge / mass gap / elliptic curves, the Clay list turning green (Poincaré already Perelman's), T-cells and a launch, a lifespan bar, a token stream breaking through sandbox layers, Chesterton's fence, quartzite → arc furnace → Siemens → Czochralski → wafer → die → god, and `> what is carbon for?`. |
| Outro | `outro2.ts` | A flight back through the film (tape, move 37, 175B, protein, the curve, the god, the wafer, the racks, Lean ✓, det J, RESET, "Hello.") to a prompt: "Let there be" typed as sung; the next token (*light*, 0.97) is never typed: the cursor swells into white. Title page, 数原律 · intqwq, black. |

## Layout

- `lyrics.txt`: the lyrics. `docs/LYRIC-CITATIONS.txt`: a citation map for the references in the lyrics.
- `app/`: the renderer (TypeScript + WebGL2 + three.js + Canvas2D, Vite).
  - `public/song.mp3`: the song. `public/data/`: word-level lyric timings, beat grid and envelopes, tokens, and the
    ubiquitin structure (PDB 1UBQ) used for AlphaFold.
  - `src/engine/`: timeline playback, HDR compositing, post (bloom pyramid, anamorphic streak, CA, grain, vignette),
    typography, kinetic 3D lyrics, GPU line batches (`lines.ts`), cameras, the compute ledger, GPU YUV packing.
  - `src/scenes/`: one module per plate (see the table) plus the models they use (`euv-machine.ts`, `cowos.ts`,
    `rackhall.ts`, `dimm.ts`, `ns-core.ts`, `protein.ts`, `marks.ts`, `figures.ts` …).
  - `src/timeline.ts`: the edit (plate windows snapped to the beat, transitions) and the ledger keyframes.
  - `scripts/render-film.mjs`: the full-film renderer; `scripts/render.mjs`: stills, contact sheets, segments.
- `analysis/`: the Python tools that produced the timing data.
- `render-film.cmd`: Windows launcher for the film render.

## Requirements

Node 20+, Google Chrome (driven headless through playwright-core) and ffmpeg with libx264 (and NVENC, for the
default GPU encode). Put ffmpeg on your PATH or pass `--ffmpeg`; point at Chrome with `--chrome` or `CHROME=…`
if it is not in the usual place. The analysis tools need Python (see below); the renderer doesn't.

## Preview

```bash
cd app && npm install && npm run dev
```

Open http://localhost:5199 and click to play (`?t=120` starts at a given time).

| Key | Action |
|---|---|
| space / click | play / pause |
| ← / → | seek ±1 s (±5 s with shift) |
| `,` / `.` | step one frame |
| `[` / `]` | previous / next plate |
| `l` | loop the current plate |
| `f` | fullscreen |
| `h` | hide the UI |

## Render

```bash
cd app && npm install && npm run film -- --jobs 6 --samples 4
```

(On Windows, `render-film.cmd` in the project root does the same.) It:

1. starts its own Vite server without hot reload (so edits can't reload a page mid-render);
2. renders the film in ~20 s chunks with a pool of headless-Chrome workers. Each frame is drawn by WebGL on the
   GPU (RTX via ANGLE/D3D11), packed to YUV on the GPU, and encoded by NVENC on the GPU, so the CPU stays free
   for the browsers;
3. shows a live progress bar: overall %, frames, fps, elapsed and ETA, plus one bar per worker;
4. keeps finished chunks, so a stopped or failed run resumes where it left off (a failed chunk is retried);
5. concatenates the chunks losslessly, muxes the song, and writes a 720p preview next to the film.

| Option | Default | |
|---|---|---|
| `--jobs N` | 6 | parallel workers (raise it while GPU and CPU have headroom) |
| `--samples N` | 4 | motion-blur sub-frames per frame |
| `--cq N` | 21 | NVENC constant quality (lower = bigger, cleaner) |
| `--encoder x264` | nvenc | use the CPU encoder (no NVIDIA GPU) |
| `--from S --to S` | whole song | render a section |
| `--fresh` | | discard finished chunks and start over |
| `--out FILE` | `out/going-exponential-1080p60.mp4` | |

Other modes of the low-level script (`app/scripts/render.mjs`): `stills --t 12.5,60`, `sheet --from 0 --to 20 --n 12`
(contact sheets) and `motion --step 0.2` (per-sample motion energy as a CSV, to find static stretches).

## Re-running the analysis

The committed `app/public/data/*.json` files are all the renderer needs. To regenerate them you need Python
with torch, demucs, stable-ts and librosa:

```bash
python analysis/analyze.py && python analysis/fixgrid.py && python analysis/grid.py && python analysis/patch_lyrics.py
python analysis/tokens.py   # needs tiktoken and regex
```

## Credits and licenses

- **Song and lyrics** ("Going Exponential", `app/public/song.mp3`, `lyrics.txt`): © 数原律 (intqwq). All rights
  reserved; included only so the video can be rebuilt from source. The MIT license below does not cover them.
- **Code** (everything else in this repository): [MIT](LICENSE).
- **Fonts** (installed from npm): Bricolage Grotesque, Martian Mono, Instrument Serif, Noto Serif SC — all SIL Open
  Font License.
- **Data:** ubiquitin structure from the RCSB Protein Data Bank, entry 1UBQ (Vijay-Kumar, Bugg & Cook, 1987).
- Company and product names, and the line-art renditions of company marks in the "bids go high" shot, belong to
  their owners and are used for commentary; no endorsement is implied.
- Visual style and craft approach were inspired by [mexicat/pdoom-video](https://github.com/mexicat/pdoom-video)
  (MIT). The engine, scenes and designs here are new.
