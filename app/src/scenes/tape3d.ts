// OPENING — "The Tape" (1936 → 2020), one continuous camera journey.
// A physical Turing tape runs through history. Its read/write head writes each sung word into a cell; between
// lines the head races to the next station, where a 3D diorama shows that line: the Turing machine itself, a
// von Neumann machine running fetch/decode/execute, the Dartmouth proposal freezing into the AI winter,
// backprop on a real network and loss surface, AlexNet's actual layer stack, a Go board and move 37, the eight
// authors and attention, and GPT-3's completion interface in front of its 96-layer stack.
import * as THREE from 'three';
import { Plate, type Frame } from './_base';
import type { RT } from '../engine/gl';
import { applyCam, CamPath, type V3 } from '../engine/cam';
import { WordSprite } from '../engine/text3d';
import { LyricRig } from '../engine/kinetic';
import { F, setFont } from '../engine/type';
import { rgba } from '../engine/palette';
import { loadTokens, type Word } from '../engine/data';
import { C, M, Panel, screen, tag, tube, lights, Card, flatten } from './kit';
import { clamp, ease, prog, lerp, hash, pulse, mulberry32 } from '../engine/util';

const GAP = 44; // distance between stations along the tape
const CELL = 1.35;
const YEARS = ['1936', '1945', '1956', '1986', '2012', '2016', '2017', '2020'];

type Upd = (t: number, lt: number, k: number) => void;

export default class Tape3D extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 600);
  words: { w: Word; line: number; j: number; s: WordSprite; x: number; id: WordSprite; sp: WordSprite | null }[] = [];
  head = new THREE.Group();
  rigs: LyricRig[] = [];
  upd: Upd[] = [];
  years: WordSprite[] = [];
  paths: CamPath[] = [];
  snow!: THREE.Points;
  snowPos = new Float32Array(3000 * 3);
  snowAmt = 0;

  sx(i: number) { return i * GAP; }

  async init() {
    this.useLines(this.ctx.lyrics.section('Opening'));
    const sc = this.scene;
    sc.environment = this.ctx.three.env;
    sc.fog = new THREE.FogExp2(0x020203, 0.018);
    lights(sc, 2.2);
    // ------------------------------------------------ the tape
    const len = GAP * 8 + 40;
    const tape = new THREE.Mesh(new THREE.BoxGeometry(len, 0.04, 1.0), new THREE.MeshStandardMaterial({ color: C('ink2', 2.2), roughness: 0.85, metalness: 0.05 }));
    tape.position.set(len / 2 - 20, 0, 0);
    tape.receiveShadow = true;
    sc.add(tape);
    const nCells = Math.ceil(len / CELL);
    const div = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.05, 1.0), M.bone(), nCells);
    const edge = new THREE.InstancedMesh(new THREE.BoxGeometry(CELL, 0.06, 0.03), M.bone(), nCells * 2);
    const m4 = new THREE.Matrix4();
    for (let k = 0; k < nCells; k++) {
      const x = -20 + k * CELL;
      m4.makeTranslation(x, 0.01, 0); div.setMatrixAt(k, m4);
      m4.makeTranslation(x + CELL / 2, 0.01, 0.5); edge.setMatrixAt(k * 2, m4);
      m4.makeTranslation(x + CELL / 2, 0.01, -0.5); edge.setMatrixAt(k * 2 + 1, m4);
    }
    sc.add(div, edge);
    // sprocket holes
    const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 10), new THREE.MeshBasicMaterial({ color: 0x000000 }), nCells * 2);
    for (let k = 0; k < nCells; k++) {
      m4.makeTranslation(-20 + k * CELL + CELL / 2, 0.02, 0.42); holes.setMatrixAt(k * 2, m4);
      m4.makeTranslation(-20 + k * CELL + CELL / 2, 0.02, -0.42); holes.setMatrixAt(k * 2 + 1, m4);
    }
    sc.add(holes);
    // filler symbols in the gaps (the tape remembers)
    const r = mulberry32(5);
    for (let k = 0; k < nCells; k += 1) {
      const x = -20 + k * CELL + CELL * 0.28;
      const near = this.lines.some((_, i) => x > this.sx(i) - 2 && x < this.sx(i) + 12);
      if (near) continue;
      const s = new WordSprite(['0', '1', '1', '0', 'B'][Math.floor(r() * 5)], F.mono(400), 0.42);
      s.rotation.x = -Math.PI / 2;
      s.position.set(x, 0.04, 0.14);
      s.tint(0.35, 0.34, 0.32, 1);
      sc.add(s);
    }
    // written tokens: one GPT-3 token per cell, starting at each line's station
    const TK = await loadTokens();
    this.lines.forEach((l, i) => (TK[l.i] ?? []).forEach((tk, j) => {
      const txt = tk.t.trim().replace(/^--$/, '—') || '␣';
      const cx = this.sx(i) + j * CELL + CELL / 2;
      const s = new WordSprite(txt, F.mono(500), 0.34);
      const k = Math.min(1, (CELL * 0.8) / Math.max(0.01, s.advance));
      s.scale.setScalar(k);
      s.rotation.x = -Math.PI / 2;
      s.position.set(cx - (s.advance * k) / 2, 0.045, 0.12);
      s.visible = false;
      sc.add(s);
      // the token id, small, near the tape edge
      const idS = new WordSprite((tk.ids ?? [tk.id]).join('·'), F.mono(400), 0.13);
      { const k2 = Math.min(1, (CELL * 0.85) / Math.max(0.01, idS.advance)); idS.scale.setScalar(k2); }
      idS.rotation.x = -Math.PI / 2;
      idS.position.set(cx - (idS.advance * idS.scale.x) / 2, 0.045, 0.36);
      idS.visible = false;
      sc.add(idS);
      const sp: WordSprite | null = null;
      this.words.push({ w: { w: tk.t, start: tk.start, end: tk.end }, line: i, j, s, x: cx, id: idS, sp });
    }));
    // ------------------------------------------------ the head (carriage straddling the tape)
    const brass = M.gold(0.05);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.12, 1.5), M.darkSteel());
    frame.position.y = 0.75;
    const legA = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 0.1), M.darkSteel()); legA.position.set(0, 0.35, 0.72);
    const legB = legA.clone(); legB.position.z = -0.72;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.4, 24), brass); lens.position.y = 0.48;
    const eye = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 24), M.glow('gold', 5)); eye.position.y = 0.27;
    const light = new THREE.PointLight(new THREE.Color(1, 0.7, 0.3), 3, 3); light.position.y = 0.2;
    const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.05, 40), M.bone()); dial.rotation.x = Math.PI / 2; dial.position.set(0, 1.25, 0.2);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.02), M.glow('gold', 4)); needle.position.set(0, 1.25, 0.25); needle.name = 'needle';
    this.head.add(frame, legA, legB, lens, eye, light, dial, needle);
    ['q0', 'q1', 'q2', 'q3'].forEach((q, k) => {
      const s = tag(q, 0.1, F.mono(500), [0.1, 0.1, 0.1]);
      const a = (k / 4) * Math.PI * 2;
      s.position.set(Math.sin(a) * 0.25 - 0.04, 1.25 + Math.cos(a) * 0.25 - 0.03, 0.23);
      this.head.add(s);
    });
    sc.add(this.head);
    // ------------------------------------------------ stations
    const builders = [this.stTuring, this.stVonNeumann, this.stDartmouth, this.stBackprop, this.stAlexNet, this.stGo, this.stAttention, this.stGPT3];
    builders.forEach((b, i) => {
      const g = new THREE.Group();
      g.position.set(this.sx(i), 0, 0);
      sc.add(g);
      this.upd.push(b.call(this, g, i));
      // year, huge and dim behind the diorama
      const y = new WordSprite(YEARS[i], F.serif(true), 6);
      y.position.set(this.sx(i) - 6, 3.5, -24);
      y.tint(0.22, 0.21, 0.2, 1);
      sc.add(y);
      this.years.push(y);
      // the lyric, as objects in the station's space (billboarded toward the camera each frame)
      const rig = new LyricRig(this.lines[i], { font: F.display(680), size: 0.62, maxWidth: 9, enter: 'depth', exit: 'scatter', depth: 5, anticipate: 0.4 });
      sc.add(rig.group);
      this.rigs.push(rig);
    });
    // snow (winter)
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(this.snowPos, 3).setUsage(THREE.DynamicDrawUsage));
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: C('bone', 1.2), size: 0.06, transparent: true, opacity: 0.9, depthWrite: false }));
    this.snow.frustumCulled = false;
    sc.add(this.snow);
    this.buildPaths();
    // anchor each lyric where the camera will be looking during its line (lower-left third, ~6 units out)
    const tmpCam = new THREE.PerspectiveCamera(40, 16 / 9, 0.05, 600);
    this.rigs.forEach((rig, i) => {
      const l = this.lines[i];
      const tm = (l.words[0].start + l.end) / 2;
      applyCam(tmpCam, this.paths[i].at(tm), tm, 0, 0, 7);
      const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(tmpCam.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(tmpCam.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(tmpCam.quaternion);
      const D = 6.5, half = Math.tan((20 * Math.PI) / 180) * D;
      const p = tmpCam.position.clone().addScaledVector(fwd, D).addScaledVector(right, -half * 1.55).addScaledVector(up, -half * 0.52);
      rig.group.position.copy(p);
      rig.group.scale.setScalar(0.72);
    });
    flatten(sc);
  }

  // ======================================================== camera
  buildPaths() {
    const e = ease;
    this.lines.forEach((l, i) => {
      const x = this.sx(i), t0 = this.cuts[i], t1 = this.vEnd(i);
      const d = t1 - t0;
      const K: V3[][] = [
        // Turing: macro along the tape surface, rising to reveal the head
        [[x - 3, 0.35, 2.2], [x + 1, 0.6, 0.6]], [[x + 3, 1.6, 4.2], [x + 3, 0.8, 0]],
        // von Neumann: high orbit
        [[x - 2, 7, 9], [x + 5, 1.5, -3]], [[x + 12, 5, 7], [x + 5, 1.5, -3]],
        // Dartmouth: low, warm, then snowing
        [[x - 3, 1.2, 5], [x + 3, 1.6, -2]], [[x + 6, 2.8, 6], [x + 3, 1.4, -2]],
        // backprop: inside the network, then over the loss surface
        [[x - 1, 3, 6], [x + 4, 2.2, -3]], [[x + 9, 5.5, 5], [x + 6, 0, -5]],
        // AlexNet: fly along the layer stack
        [[x - 4, 2.5, 5], [x + 2, 2, -3]], [[x + 14, 3.5, 5], [x + 12, 1, -4]],
        // Go: top-down swoop
        [[x + 4, 9, 6], [x + 4, 0, -4]], [[x + 4.5, 5, 1.5], [x + 5, 0, -4.6]],
        // attention: slow push
        [[x - 3, 3, 8], [x + 4, 2.2, -2]], [[x + 3, 3.4, 5.2], [x + 4, 2.3, -2]],
        // GPT-3: the screen slams in
        [[x - 2, 2.2, 9], [x + 4, 2.6, -2]], [[x + 4, 2.7, 5.4], [x + 4, 2.6, -2]],
      ];
      const [a, b] = [K[i * 2], K[i * 2 + 1]];
      if (i === 4) {
        const goT = l.words[2].start, x5 = this.sx(5);
        this.paths.push(new CamPath([
          { t: t0, pos: a[0], look: a[1], fov: 42 },
          { t: goT - 0.15, pos: [x + 9, 3.2, 5], look: [x + 9, 1.8, -3], fov: 40, e: e.inOutQuad },
          { t: goT + 0.35, pos: [x5 + 4, 7.5, 5], look: [x5 + 4, 0, -4.6], fov: 42, e: e.inOutExpo },
          { t: t1, pos: [x5 + 4, 8.5, 4], look: [x5 + 4, 0, -4.6], fov: 40, e: e.linear },
        ], ));
        return;
      }
      this.paths.push(new CamPath([
        { t: t0, pos: a[0], look: a[1], fov: 42 },
        { t: t0 + d * 0.55, pos: [lerp(a[0][0], b[0][0], 0.6), lerp(a[0][1], b[0][1], 0.6), lerp(a[0][2], b[0][2], 0.6)], look: [lerp(a[1][0], b[1][0], 0.6), lerp(a[1][1], b[1][1], 0.6), lerp(a[1][2], b[1][2], 0.6)], fov: 40, e: e.inOutCubic },
        { t: t1, pos: b[0], look: b[1], fov: 38, e: e.inOutQuad },
      ]));
    });
  }

  // ======================================================== stations
  stTuring(g: THREE.Group, i: number): Upd {
    // transition-table card: the active rule highlights on each word
    const p = new Panel(1024, 640);
    const { group } = screen(p, 3.2, 2.0, 1.2);
    group.position.set(4.6, 2.2, -2.5);
    group.rotation.y = -0.35;
    g.add(group);
    const rules = [['q0', '0', '1', 'R', 'q1'], ['q1', '1', '0', 'R', 'q2'], ['q2', 'B', '1', 'L', 'q3'], ['q3', '1', '1', 'R', 'q0'], ['q1', '0', 'B', 'L', 'q0']];
    return (t) => {
      const c = p.begin();
      c.fillStyle = '#0c0d11'; c.fillRect(0, 0, 1024, 640);
      c.strokeStyle = 'rgba(236,233,226,0.4)'; c.lineWidth = 2; c.strokeRect(10, 10, 1004, 620);
      setFont(c, F.mono(500), 30); c.fillStyle = 'rgba(139,143,153,1)';
      c.fillText('δ   STATE  READ  WRITE  MOVE  NEXT', 40, 70);
      const k = Math.max(0, this.wordIdx(i, t));
      rules.forEach((row, j) => {
        const y = 140 + j * 95;
        const on = j === k % rules.length;
        if (on) { c.fillStyle = 'rgba(255,178,30,0.18)'; c.fillRect(24, y - 60, 976, 84); }
        setFont(c, F.mono(on ? 600 : 400), 42);
        c.fillStyle = on ? '#ffb21e' : 'rgba(236,233,226,0.8)';
        row.forEach((v, q) => c.fillText(v, 130 + q * 175, y));
      });
      p.end();
    };
  }

  // ---- shared card drawing helpers (engineering-drawing idiom: bone hairlines, gold signal)
  static ln(c: OffscreenCanvasRenderingContext2D, a: number, b2: number, x: number, y: number, col = 'rgba(236,233,226,0.85)', w = 3) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.moveTo(a, b2); c.lineTo(x, y); c.stroke(); }
  static bx(c: OffscreenCanvasRenderingContext2D, x: number, y: number, w: number, h: number, col = 'rgba(236,233,226,0.85)', lw = 3, fill = 'rgba(17,19,25,0.92)') { c.fillStyle = fill; c.fillRect(x, y, w, h); c.strokeStyle = col; c.lineWidth = lw; c.strokeRect(x, y, w, h); }
  static tx(c: OffscreenCanvasRenderingContext2D, s: string, x: number, y: number, px = 30, col = 'rgba(236,233,226,0.9)', wght = 500, align: CanvasTextAlign = 'left') { setFont(c, F.mono(wght), px); c.fillStyle = col; c.textAlign = align; c.fillText(s, x, y); c.textAlign = 'left'; }

  stVonNeumann(g: THREE.Group, i: number): Upd {
    const T = Tape3D;
    // far: the EDVAC report title page; main: the machine; glow: packets; near: the IR register, blurred
    const far = new Card(1400, 1800, 7).at(9, 4.5, -14, -0.25);
    far.draw((c, w, h) => {
      c.fillStyle = 'rgba(233,229,219,0.12)'; c.fillRect(0, 0, w, h);
      setFont(c, F.serif(false), 64); c.fillStyle = 'rgba(233,229,219,0.55)'; c.textAlign = 'center';
      ['First Draft of a Report', 'on the EDVAC'].forEach((s2, k) => c.fillText(s2, w / 2, 260 + k * 84));
      setFont(c, F.serif(true), 46); c.fillText('John von Neumann', w / 2, 480); c.fillText('June 30, 1945', w / 2, 550);
      c.textAlign = 'left';
      for (let k = 0; k < 26; k++) { c.fillStyle = 'rgba(233,229,219,0.18)'; c.fillRect(160, 700 + k * 40, 1080 - (k % 4) * 90, 10); }
    });
    const main = new Card(2400, 1200, 11).at(4.5, 2.4, -4);
    const glow = new Card(2400, 1200, 11, { additive: true, glow: 3 }).at(4.5, 2.4, -3.97);
    const near = new Card(900, 360, 2.6).at(-0.3, 1.2, 2.4, 0.25);
    g.add(far.mesh, main.mesh, glow.mesh, near.mesh);
    const mem = { x: 140, y: 250 }, cu = { x: 1380, y: 250, w: 520, h: 250 }, alu = { x: 1380, y: 560, w: 520, h: 250 };
    const prog2 = ['LOAD  7', 'ADD   8', 'STORE 9', 'JMP   0', '', '', '', '0003', '0004', '0000'];
    const drawMain = (stage: number, pc: number) => main.draw((c, w, h) => {
      c.strokeStyle = 'rgba(236,233,226,0.08)'; c.lineWidth = 1;
      for (let x = 0; x < w; x += 40) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = 0; y < h; y += 40) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      T.tx(c, 'MEMORY', mem.x, mem.y - 24, 34, 'rgba(236,233,226,0.9)', 600);
      for (let r = 0; r < 5; r++) for (let q = 0; q < 2; q++) {
        const k = q * 5 + r, x = mem.x + q * 440, y = mem.y + r * 112;
        const on = k === pc;
        T.bx(c, x, y, 420, 96, on ? '#ffb21e' : 'rgba(236,233,226,0.7)', on ? 5 : 2, on ? 'rgba(255,178,30,0.16)' : 'rgba(17,19,25,0.92)');
        T.tx(c, String(k).padStart(2, '0'), x + 16, y + 60, 26, 'rgba(139,143,153,1)', 400);
        T.tx(c, prog2[k] || '—', x + 90, y + 62, 36, on ? '#ffb21e' : 'rgba(236,233,226,0.9)', 500);
      }
      T.bx(c, 1340, 200, 800, 660, 'rgba(236,233,226,0.35)', 2, 'rgba(0,0,0,0)');
      T.tx(c, 'CENTRAL ARITHMETIC + CONTROL', 1340, 186, 24, 'rgba(139,143,153,1)', 500);
      T.bx(c, cu.x, cu.y, cu.w, cu.h, stage === 1 ? '#ffb21e' : 'rgba(236,233,226,0.85)', stage === 1 ? 5 : 3);
      T.tx(c, 'CONTROL UNIT', cu.x + 30, cu.y + 70, 38, stage === 1 ? '#ffb21e' : '#ece9e2', 600);
      T.tx(c, stage === 1 ? 'decode: opcode, address' : 'sequencing', cu.x + 30, cu.y + 130, 26, 'rgba(139,143,153,1)', 400);
      T.bx(c, alu.x, alu.y, alu.w, alu.h, stage === 2 ? '#ffb21e' : 'rgba(236,233,226,0.85)', stage === 2 ? 5 : 3);
      T.tx(c, 'ALU', alu.x + 30, alu.y + 70, 38, stage === 2 ? '#ffb21e' : '#ece9e2', 600);
      T.tx(c, stage === 2 ? 'ACC <- ACC + M[8]' : 'add / sub / mul', alu.x + 30, alu.y + 130, 26, 'rgba(139,143,153,1)', 400);
      ['PC', 'IR', 'ACC'].forEach((n, k) => {
        const y = 270 + k * 190, x = 1990;
        const on = (k === 0 && stage === 0) || (k === 1 && stage === 1) || (k === 2 && stage >= 2);
        T.bx(c, x, y, 130, 120, on ? '#ffb21e' : 'rgba(236,233,226,0.8)', on ? 5 : 2);
        T.tx(c, n, x + 20, y + 50, 30, on ? '#ffb21e' : '#ece9e2', 600);
        T.tx(c, k === 0 ? String(pc).padStart(2, '0') : k === 1 ? (prog2[pc] || '').slice(0, 5) : '0007', x + 20, y + 98, 24, 'rgba(236,233,226,0.8)', 400);
      });
      const bus = (x1: number, y1: number, x2: number, y2: number) => { T.ln(c, x1, y1 - 8, x2, y2 - 8, 'rgba(236,233,226,0.6)', 3); T.ln(c, x1, y1 + 8, x2, y2 + 8, 'rgba(236,233,226,0.6)', 3); };
      bus(1020, 360, 1380, 360); bus(1020, 700, 1380, 700); bus(1640, 500, 1640, 560);
      T.tx(c, 'ADDRESS BUS', 1060, 330, 22, 'rgba(139,143,153,1)', 400); T.tx(c, 'DATA BUS', 1060, 670, 22, 'rgba(139,143,153,1)', 400);
      T.bx(c, 140, 930, 360, 150); T.tx(c, 'INPUT (TAPE)', 170, 1020, 30, '#ece9e2', 600);
      T.bx(c, 1780, 930, 360, 150); T.tx(c, 'OUTPUT', 1810, 1020, 30, '#ece9e2', 600);
      bus(320, 930, 320, 810); bus(1960, 860, 1960, 930);
      ['FETCH', 'DECODE', 'EXECUTE', 'STORE'].forEach((n, k) => T.tx(c, n, 640 + k * 230, 1010, 38, k === stage ? '#ffb21e' : 'rgba(139,143,153,0.8)', k === stage ? 700 : 400));
    });
    const pathOf = (stage: number, u: number): [number, number] => {
      const P: [number, number][][] = [
        [[580, 360], [1020, 360], [1380, 360], [1640, 370]],
        [[1640, 370], [1640, 440], [1990, 440]],
        [[580, 700], [1020, 700], [1380, 700], [1640, 690]],
        [[1640, 690], [1380, 700], [1020, 700], [580, 590]],
      ];
      const pts = P[stage];
      const n = pts.length - 1, f = u * n, k = Math.min(n - 1, Math.floor(f)), r = f - k;
      return [lerp(pts[k][0], pts[k + 1][0], r), lerp(pts[k][1], pts[k + 1][1], r)];
    };
    let lastKey = '';
    return (t) => {
      const k = this.wordIdx(i, t);
      const stage = Math.max(0, k) % 4, pc = (Math.floor(Math.max(0, k) / 4) + (k >= 0 ? 0 : 0)) % 4;
      const key = `${stage}|${pc}`;
      if (key !== lastKey) { drawMain(stage, pc); lastKey = key; }
      const ws = this.lines[i].words;
      const st = k < 0 ? this.cuts[i] : ws[k].start;
      const u = ease.inOutCubic(clamp((t - st) / 0.42));
      glow.draw((c) => {
        for (let tr = 9; tr >= 0; tr--) { const [px, py] = pathOf(stage, Math.max(0, u - tr * 0.025)); c.fillStyle = `rgba(255,178,30,${(1 - tr / 10) * 0.5})`; c.fillRect(px - 16, py - 16, 32, 32); }
        const [x, y] = pathOf(stage, u);
        c.fillStyle = '#ffe3a0'; c.fillRect(x - 18, y - 18, 36, 36);
      });
      near.draw((c, w, h) => { c.fillStyle = 'rgba(17,19,25,0.95)'; c.fillRect(0, 0, w, h); c.strokeStyle = '#ffb21e'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6); T.tx(c, 'IR', 40, 120, 60, '#8b8f99', 600); T.tx(c, prog2[pc] || '', 40, 270, 110, '#ffb21e', 600); });
    };
  }

  stDartmouth(g: THREE.Group, i: number): Upd {
    const T = Tape3D;
    const sun = new Card(1600, 1600, 16, { additive: true, glow: 1.3 }).at(10, 6, -18);
    const doc = new Card(1024, 1320, 2.9).at(3.2, 1.7, -2, -0.22, -0.12, 0.06);
    const chart = new Card(1100, 800, 4).at(8.6, 1.9, -3.2, -0.35);
    g.add(sun.mesh, doc.mesh, chart.mesh);
    const winterT = this.lines[i].words[2].start;
    let lastW = -1;
    return (t) => {
      const w = prog(t, winterT - 0.15, winterT + 0.8, ease.inOutCubic);
      sun.draw((c, W, H) => {
        const cx = W / 2, cy = H / 2, k = 1 - w * 0.92;
        for (let r = 0; r < 60; r++) {
          const a = (r / 60) * Math.PI * 2 + t * 0.03, len = (300 + (r % 3) * 220) * k;
          c.strokeStyle = `rgba(255,190,80,${0.25 * k})`; c.lineWidth = r % 3 ? 3 : 7;
          c.beginPath(); c.moveTo(cx + Math.cos(a) * 170, cy + Math.sin(a) * 170); c.lineTo(cx + Math.cos(a) * (170 + len), cy + Math.sin(a) * (170 + len)); c.stroke();
        }
        const gr = c.createRadialGradient(cx, cy, 0, cx, cy, 170);
        gr.addColorStop(0, `rgba(255,240,200,${k})`); gr.addColorStop(0.8, `rgba(255,178,30,${k})`); gr.addColorStop(1, 'rgba(255,178,30,0)');
        c.fillStyle = gr; c.beginPath(); c.arc(cx, cy, 170, 0, Math.PI * 2); c.fill();
        if (w > 0) { c.strokeStyle = `rgba(160,165,175,${w * 0.6})`; c.lineWidth = 4; c.beginPath(); c.arc(cx, cy, 150, 0, Math.PI * 2); c.stroke(); }
        void H;
      });
      const wq = Math.round(w * 30) / 30;
      if (wq !== lastW) {
        lastW = wq;
        doc.draw((c, W, H) => {
          c.fillStyle = '#0c0d11'; c.fillRect(0, 0, W, H); c.strokeStyle = 'rgba(236,233,226,0.6)'; c.lineWidth = 4; c.strokeRect(2, 2, W - 4, H - 4);
          c.fillStyle = '#ece9e2'; setFont(c, F.serif(false), 48); c.textAlign = 'center';
          ['A PROPOSAL FOR THE', 'DARTMOUTH SUMMER RESEARCH', 'PROJECT ON ARTIFICIAL', 'INTELLIGENCE'].forEach((s2, k) => c.fillText(s2, W / 2, 170 + k * 64));
          setFont(c, F.serif(true), 32); c.fillText('J. McCarthy, M. L. Minsky, N. Rochester, C. E. Shannon', W / 2, 470);
          setFont(c, F.serif(false), 30); c.fillText('August 31, 1955', W / 2, 530); c.textAlign = 'left';
          for (let k = 0; k < 16; k++) { c.fillStyle = 'rgba(236,233,226,0.3)'; c.fillRect(110, 620 + k * 40, 804 - (k % 5) * 60, 10); }
          if (wq > 0) {
            const g2 = c.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 900);
            g2.addColorStop(0, `rgba(12,13,17,${0.2 * wq})`); g2.addColorStop(1, `rgba(12,13,17,${0.85 * wq})`);
            c.fillStyle = g2; c.fillRect(0, 0, W, H);
            c.strokeStyle = `rgba(236,233,226,${0.6 * wq})`; c.lineWidth = 2;
            for (let k = 0; k < 80; k++) { const x = hash(k, 1) * W, y = hash(k, 2) * H, r = 16 + hash(k, 3) * 70 * wq; for (let a = 0; a < 6; a++) { c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a * 1.047) * r, y + Math.sin(a * 1.047) * r); c.stroke(); } }
          }
        });
      }
      chart.draw((c, W, H) => {
        T.tx(c, 'UK AI FUNDING, AFTER THE LIGHTHILL REPORT (1973)', 20, 50, 24, 'rgba(236,233,226,0.8)', 500);
        T.ln(c, 60, H - 80, W - 30, H - 80, 'rgba(236,233,226,0.7)', 3);
        ['1965', '1968', '1970', '1972', '1974', '1976'].forEach((y, k) => {
          const hgt = lerp(160 + k * 70, 60 + (5 - k) * 8, w * clamp(k / 4 + 0.2));
          c.fillStyle = w > 0.5 ? 'rgba(139,143,153,0.9)' : '#ffb21e';
          c.fillRect(100 + k * 160, H - 80 - hgt, 100, hgt);
          T.tx(c, y, 100 + k * 160, H - 40, 24, 'rgba(139,143,153,1)', 400);
        });
      });
      this.snowAmt = w;
    };
  }

  stBackprop(g: THREE.Group, i: number): Upd {
    const T = Tape3D;
    const net = new Card(2000, 1200, 8.5).at(3.6, 2.3, -3.6);
    const glow = new Card(2000, 1200, 8.5, { additive: true, glow: 3 }).at(3.6, 2.3, -3.57);
    const loss = new Card(1600, 1600, 9).at(10.5, -0.4, -5.5, -0.3, -1.15);
    const lossG = new Card(1600, 1600, 9, { additive: true, glow: 3 }).at(10.5, -0.38, -5.5, -0.3, -1.15);
    g.add(net.mesh, glow.mesh, loss.mesh, lossG.mesh);
    const layers = [4, 6, 6, 3];
    const P = layers.map((n, L) => Array.from({ length: n }, (_, k) => [260 + L * 500, 600 + (k - (n - 1) / 2) * 160] as [number, number]));
    const Wt = (a: number, b: number, L: number) => hash(a, b, L);
    net.draw((c) => {
      for (let L = 0; L < 3; L++) P[L].forEach((a, ia) => P[L + 1].forEach((b, ib) => { const w = Wt(ia, ib, L); T.ln(c, a[0], a[1], b[0], b[1], `rgba(236,233,226,${0.12 + 0.35 * w})`, 1 + 3 * w); }));
      P.forEach((Lp) => Lp.forEach(([x, y]) => { c.fillStyle = '#111319'; c.beginPath(); c.arc(x, y, 34, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#ece9e2'; c.lineWidth = 4; c.stroke(); }));
      T.tx(c, 'x', 150, 610, 44, '#8b8f99', 400); T.tx(c, 'y', 1840, 610, 44, '#8b8f99', 400);
      T.tx(c, 'L = 1/2 |y_hat - y|^2', 1300, 1120, 40, '#ece9e2', 400);
    });
    const f = (x: number, y: number) => 0.06 * (x * x + 1.6 * y * y) + 0.35 * Math.sin(x * 0.9) * Math.cos(y * 0.8);
    loss.draw((c, Wd, H) => {
      c.fillStyle = 'rgba(236,233,226,0.8)';
      for (let lv = 0; lv < 26; lv++) {
        const L = -0.35 + lv * 0.12;
        c.fillStyle = `rgba(236,233,226,${lv % 5 === 0 ? 0.5 : 0.18})`;
        for (let gx = 0; gx < 200; gx++) for (let gy = 0; gy < 200; gy++) {
          const x = (gx / 200 - 0.5) * 12, y = (gy / 200 - 0.5) * 12;
          const v = f(x, y), v2 = f(x + 0.06, y), v3 = f(x, y + 0.06);
          if ((v - L) * (v2 - L) < 0 || (v - L) * (v3 - L) < 0) c.fillRect((gx / 200) * Wd, (gy / 200) * H, lv % 5 === 0 ? 4 : 3, lv % 5 === 0 ? 4 : 3);
        }
      }
      T.tx(c, 'LOSS LANDSCAPE', 40, 70, 40, '#8b8f99', 500);
    });
    const backT = this.lines[i].words[1].start;
    return (t) => {
      const fwd = prog(t, this.cuts[i], backT, ease.inOutQuad);
      const back = prog(t, backT, this.lines[i].end + 0.3, ease.inOutQuad);
      glow.draw((c) => {
        for (let L = 0; L < 3; L++) P[L].forEach((a, ia) => P[L + 1].forEach((b, ib) => {
          const w = Wt(ia, ib, L);
          const pf = clamp(fwd * 3 - L), pb = clamp(back * 3 - (2 - L));
          if (pf > 0 && pf < 1 && w > 0.4) { c.fillStyle = '#ffe3a0'; c.beginPath(); c.arc(lerp(a[0], b[0], pf), lerp(a[1], b[1], pf), 9, 0, Math.PI * 2); c.fill(); }
          if (pb > 0) { c.strokeStyle = `rgba(255,178,30,${0.25 + 0.6 * w})`; c.lineWidth = 2 + 5 * w; c.beginPath(); c.moveTo(b[0], b[1]); c.lineTo(lerp(b[0], a[0], pb), lerp(b[1], a[1], pb)); c.stroke(); }
        }));
        if (back > 0) T.tx(c, 'dL/dw', 900, 120, 70, '#ffb21e', 500);
      });
      lossG.draw((c, Wd, H) => {
        let x = -5, y = 3.5;
        const steps = Math.floor(back * 70);
        c.strokeStyle = '#ffb21e'; c.lineWidth = 6; c.beginPath();
        c.moveTo((x / 12 + 0.5) * Wd, (y / 12 + 0.5) * H);
        for (let s2 = 0; s2 < steps; s2++) { const gx = 0.12 * x + 0.315 * Math.cos(x * 0.9) * Math.cos(y * 0.8), gy = 0.192 * y - 0.28 * Math.sin(x * 0.9) * Math.sin(y * 0.8); x -= 0.35 * gx; y -= 0.35 * gy; c.lineTo((x / 12 + 0.5) * Wd, (y / 12 + 0.5) * H); }
        c.stroke();
        c.fillStyle = '#ffe3a0'; c.beginPath(); c.arc((x / 12 + 0.5) * Wd, (y / 12 + 0.5) * H, 22, 0, Math.PI * 2); c.fill();
      });
    };
  }

  stAlexNet(g: THREE.Group, i: number): Upd {
    const T = Tape3D;
    const main = new Card(2600, 1100, 12).at(5.5, 2.3, -4.2);
    const glow = new Card(2600, 1100, 12, { additive: true, glow: 2.5 }).at(5.5, 2.3, -4.17);
    g.add(main.mesh, glow.mesh);
    const maps: Card[] = [];
    for (let k = 0; k < 6; k++) {
      const m = new Card(256, 256, 0.9).at(-0.5 + k * 1.2, 0.9 + (k % 2) * 0.5, 1.8 + (k % 3) * 0.4, 0.2);
      m.draw((c, W, H) => { for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) { const v = 0.5 + 0.5 * Math.sin(x * (0.3 + k * 0.15) + Math.cos(y * 0.4 + k)) * Math.cos(y * (0.2 + k * 0.1)); c.fillStyle = `rgba(${Math.round(255 * v)},${Math.round(178 * v)},${Math.round(40 * v)},1)`; c.fillRect(x * 8, y * 8, 8, 8); } c.strokeStyle = '#ece9e2'; c.lineWidth = 4; c.strokeRect(2, 2, W - 4, H - 4); });
      g.add(m.mesh); maps.push(m);
    }
    const L: [string, number, number, number][] = [['224x224x3', 224, 3, 11], ['55x55x96', 55, 96, 11], ['27x27x256', 27, 256, 5], ['13x13x384', 13, 384, 3], ['13x13x384', 13, 384, 3], ['13x13x256', 13, 256, 3]];
    const boxes: [number, number, number, number, number][] = [];
    let x = 120;
    L.forEach(([, s2, d], k) => { const h = 90 + Math.log2(s2) * 55, dep = 30 + Math.log2(d) * 12; boxes.push([x, 550 - h / 2, dep, h, k]); x += dep + h * 0.45 + 150; });
    const iso = (c: OffscreenCanvasRenderingContext2D, x0: number, y0: number, w: number, h: number, dx: number, dy: number, col: string, lw = 3) => {
      c.strokeStyle = col; c.lineWidth = lw; c.strokeRect(x0, y0, w, h);
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + dx, y0 - dy); c.lineTo(x0 + w + dx, y0 - dy); c.lineTo(x0 + w, y0);
      c.moveTo(x0 + w + dx, y0 - dy); c.lineTo(x0 + w + dx, y0 + h - dy); c.lineTo(x0 + w, y0 + h); c.stroke();
    };
    main.draw((c) => {
      boxes.forEach(([x0, y0, w, h, k]) => {
        (k === 0 ? [0] : [-1, 1]).forEach((tw) => {
          const hh = h * (k === 0 ? 1 : 0.5), yy = k === 0 ? y0 : y0 + (tw < 0 ? -h * 0.05 : h * 0.55);
          c.fillStyle = 'rgba(17,19,25,0.9)'; c.fillRect(x0, yy, w, hh);
          iso(c, x0, yy, w, hh, h * 0.45, h * 0.3, 'rgba(236,233,226,0.85)');
        });
        T.tx(c, L[k][0], x0, 1020, 26, 'rgba(236,233,226,0.85)', 500);
        if (k > 0) T.tx(c, `${L[k][3]}x${L[k][3]} conv`, x0, 1060, 22, 'rgba(139,143,153,1)', 400);
      });
      ['4096', '4096', '1000'].forEach((n, k) => { const xx = 2150 + k * 140; c.fillStyle = 'rgba(255,178,30,0.8)'; c.fillRect(xx, 300 + k * 60, 40, 500 - k * 120); T.tx(c, n, xx - 10, 1020, 24, '#ffb21e', 600); });
      T.tx(c, 'GPU 1', 60, 250, 28, 'rgba(139,143,153,1)', 500); T.tx(c, 'GPU 2', 60, 860, 28, 'rgba(139,143,153,1)', 500);
    });
    const goT = this.lines[i].words[2].start;
    return (t, lt) => {
      glow.draw((c) => {
        boxes.forEach(([x0, y0, w, h, k]) => { const p = pulse(t, this.cuts[i] + 0.1 + k * 0.12, 0.25); if (p > 0.02) { c.fillStyle = `rgba(255,178,30,${0.5 * p})`; c.fillRect(x0, y0 - h * 0.3, w + h * 0.45, h * 1.3); } });
      });
      maps.forEach((m, k) => { const p = prog(lt, 0.2 + k * 0.1, 0.5 + k * 0.1, ease.outBack); m.mesh.scale.setScalar(Math.max(0.001, p)); });
      g.visible = t < goT + 0.5;
    };
  }

  stGo(g: THREE.Group, i: number): Upd {
    const T = Tape3D;
    const N = 19, px = 2048, m = 110, sp = (px - 2 * m) / (N - 1);
    const board = new Card(px, px, 6.4, { double: false }).at(4, 0.02, -4.6, 0, -Math.PI / 2);
    const top = new Card(px, px, 6.4, { additive: true, glow: 3 }).at(4, 0.04, -4.6, 0, -Math.PI / 2);
    g.add(board.mesh, top.mesh);
    // the real game: AlphaGo (black) vs Lee Sedol (white), Game 2, Seoul, 10 March 2016 — moves 1–36, then 37
    const REC = 'Q16 D4 C16 R4 P4 P3 O3 Q3 C6 F3 N4 R6 J17 D10 Q5 R5 C4 C3 B3 C5 B4 B5 D5 B6 D3 E4 D2 C7 K4 C13 E16 R14 R15 Q14 O16 Q11 P10'.split(' ');
    const COLS = 'ABCDEFGHJKLMNOPQRST';
    const toAB = (v: string): [number, number] => [COLS.indexOf(v[0]), N - Number(v.slice(1))];
    // replay with captures: board state after each move (index = number of moves played)
    const states: Map<string, [boolean, number]>[] = [new Map()];
    REC.forEach((v, k) => {
      const st = new Map(states[k]); const [a, b] = toAB(v); const black = k % 2 === 0;
      st.set(`${a},${b}`, [black, k + 1]);
      const group = (a0: number, b0: number) => { const col = st.get(`${a0},${b0}`)![0]; const seen = new Set<string>(); const todo = [[a0, b0]]; let libs = 0;
        while (todo.length) { const [x, y] = todo.pop()!; const key = `${x},${y}`; if (seen.has(key)) continue; seen.add(key);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue; const q = st.get(`${nx},${ny}`); if (!q) libs++; else if (q[0] === col) todo.push([nx, ny]); } }
        return { seen, libs }; };
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const q = st.get(`${a + dx},${b + dy}`); if (q && q[0] !== black) { const g2 = group(a + dx, b + dy); if (g2.libs === 0) g2.seen.forEach((key) => st.delete(key)); } }
      states.push(st);
    });
    const [m37a, m37b] = toAB(REC[36]);
    const start = this.lines[4].words[2].start, hitT = this.lines[5].words[1].start;
    const stone = (c: OffscreenCanvasRenderingContext2D, a: number, b: number, black: boolean, num = 0) => {
      const x = m + a * sp, y = m + b * sp, rad = sp * 0.47;
      // flat line-art stones: black = hollow ring, white = filled bone
      c.beginPath(); c.arc(x, y, rad * 0.9, 0, Math.PI * 2);
      c.fillStyle = black ? '#07080b' : 'rgba(236,233,226,0.92)'; c.fill();
      c.strokeStyle = black ? 'rgba(236,233,226,0.85)' : '#ece9e2'; c.lineWidth = 4; c.stroke();
      if (num) { setFont(c, F.mono(600), num > 9 ? 40 : 46); c.fillStyle = black ? 'rgba(236,233,226,0.9)' : '#07080b'; c.textAlign = 'center'; c.fillText(String(num), x, y + 15); c.textAlign = 'left'; }
    };
    let lastN = -1;
    return (t) => {
      g.visible = t > start - 0.2;
      const n = Math.floor(clamp((t - start) / 1.6) * 36);
      const s37 = t > hitT - 0.02;
      const key = n * 2 + (s37 ? 1 : 0);
      if (key !== lastN) {
        lastN = key;
        board.draw((c, W, H) => {
          c.fillStyle = 'rgba(9,10,13,0.96)'; c.fillRect(0, 0, W, H);
          c.strokeStyle = 'rgba(255,178,30,0.9)'; c.lineWidth = 6; c.strokeRect(3, 3, W - 6, H - 6);
          c.strokeStyle = 'rgba(236,233,226,0.42)'; c.lineWidth = 3;
          for (let k = 0; k < N; k++) { c.beginPath(); c.moveTo(m + k * sp, m); c.lineTo(m + k * sp, px - m); c.moveTo(m, m + k * sp); c.lineTo(px - m, m + k * sp); c.stroke(); }
          [3, 9, 15].forEach((a) => [3, 9, 15].forEach((b) => { c.fillStyle = 'rgba(236,233,226,0.7)'; c.beginPath(); c.arc(m + a * sp, m + b * sp, 9, 0, Math.PI * 2); c.fill(); }));
          // column / row labels like a game record
          setFont(c, F.mono(500), 34); c.fillStyle = 'rgba(139,143,153,0.9)'; c.textAlign = 'center';
          for (let k = 0; k < N; k++) { c.fillText(COLS[k], m + k * sp, 60); c.fillText(String(N - k), 50, m + k * sp + 12); }
          c.textAlign = 'left';
          const st = states[s37 ? 37 : n];
          st.forEach(([black, num], key) => { const [a, b] = key.split(',').map(Number); stone(c, a, b, black, num); });
        });
      }
      const rr = clamp((t - hitT) / 1.1);
      top.draw((c) => {
        if (t < hitT) return;
        const x = m + m37a * sp, y = m + m37b * sp;
        c.strokeStyle = `rgba(255,178,30,${1 - rr})`; c.lineWidth = 14 * (1 - rr) + 2; c.beginPath(); c.arc(x, y, sp * 0.5 + rr * 900, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = '#ffb21e'; c.lineWidth = 8; c.beginPath(); c.arc(x, y, sp * 0.62, 0, Math.PI * 2); c.stroke();
        T.tx(c, '37', x + sp * 0.8, y - sp * 0.6, 110, '#ffb21e', 700);
        T.tx(c, 'GAME 2 · MARCH 2016', x + sp * 0.8, y - sp * 0.6 + 60, 40, '#ffe3a0', 500);
      });
    };
  }

  stAttention(g: THREE.Group, i: number): Upd {
    const T = Tape3D;
    const names = ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Lukasz Kaiser', 'Illia Polosukhin'];
    const back = new Card(2400, 1000, 14).at(5, 4.2, -10);
    const main = new Card(2600, 1100, 10).at(4, 1.6, -2.6);
    const glow = new Card(2600, 1100, 10, { additive: true, glow: 3 }).at(4, 1.6, -2.57);
    const heat = new Card(900, 900, 3.2).at(10.2, 2.4, -4.5, -0.45);
    g.add(back.mesh, main.mesh, glow.mesh, heat.mesh);
    const toks = ['Eight', 'names', ',', 'attention', ',', 'twenty', '-', 'seventeen'];
    const xs = toks.map((_, k) => 180 + k * 300);
    const A = toks.map((_, a) => toks.map((__, b) => (b <= a ? Math.pow(hash(a, b, 17), 2) : 0)));
    const attT = this.lines[i].words[2].start;
    main.draw((c) => {
      toks.forEach((s2, k) => { T.bx(c, xs[k] - 120, 760, 240, 110); T.tx(c, s2, xs[k], 828, 34, '#ece9e2', 500, 'center'); });
      T.tx(c, 'Attention(Q, K, V) = softmax(QK^T / sqrt(d_k)) V', 180, 1030, 44, 'rgba(236,233,226,0.9)', 400);
    });
    return (t, lt) => {
      const a = prog(t, attT - 0.1, attT + 0.9, ease.outCubic);
      back.draw((c) => { names.forEach((n, k) => { const p = prog(lt, k * 0.07, k * 0.07 + 0.4); setFont(c, F.serif(true), 74); c.fillStyle = `rgba(236,233,226,${0.55 * p * (1 - a * 0.5)})`; c.textAlign = 'center'; c.fillText(n, 200 + (k % 4) * 670, 260 + Math.floor(k / 4) * 190); }); c.textAlign = 'left'; });
      glow.draw((c) => {
        for (let q = 0; q < toks.length; q++) for (let k = 0; k <= q; k++) {
          const w = A[q][k]; if (w < 0.15 || a * toks.length < q) continue;
          const x1 = xs[q], x2 = xs[k], hgt = 60 + Math.abs(x1 - x2) * 0.45;
          c.strokeStyle = `rgba(255,178,30,${0.2 + 0.8 * w})`; c.lineWidth = 2 + 10 * w;
          c.beginPath(); c.moveTo(x1, 750); c.bezierCurveTo(x1, 750 - hgt, x2, 750 - hgt, x2, 750); c.stroke();
        }
      });
      heat.draw((c, W) => {
        const n = toks.length, cs = (W - 80) / n;
        for (let q = 0; q < n; q++) for (let k = 0; k < n; k++) {
          const w = A[q][k], on = a * n > q;
          c.fillStyle = k > q ? '#0a0b0e' : on ? `rgba(255,${Math.round(120 + 58 * w)},30,${0.15 + 0.85 * w})` : '#15171d';
          c.fillRect(60 + k * cs, 60 + q * cs, cs - 4, cs - 4);
        }
        T.tx(c, 'CAUSAL MASK', 60, 40, 28, '#8b8f99', 500);
      });
    };
  }

  stGPT3(g: THREE.Group, i: number): Upd {
    const T = Tape3D;
    const blockCard = new Card(1000, 600, 5.2, { opacity: 0.55 });
    blockCard.draw((c, W, H) => {
      c.fillStyle = 'rgba(17,19,25,0.35)'; c.fillRect(0, 0, W, H);
      c.strokeStyle = 'rgba(236,233,226,0.7)'; c.lineWidth = 4; c.strokeRect(4, 4, W - 8, H - 8);
      const rows: [string, number, number][] = [['MASKED MULTI-HEAD ATTENTION · 96 heads', 60, 150], ['ADD & NORM', 250, 60], ['FEED-FORWARD 12288 > 49152 > 12288', 350, 150], ['ADD & NORM', 540, 40]];
      rows.forEach(([s2, y, h]) => { c.strokeStyle = 'rgba(236,233,226,0.45)'; c.strokeRect(40, y - 10, W - 80, h); T.tx(c, s2, 60, y + (h > 100 ? 80 : 32), 30, 'rgba(236,233,226,0.9)', 500); });
    });
    const stack = new THREE.Group(); stack.position.set(4, 2.6, -8); g.add(stack);
    const layerMats: THREE.MeshBasicMaterial[] = [];
    for (let k = 0; k < 96; k++) {
      const mt = blockCard.mesh.material.clone();
      const m = new THREE.Mesh(blockCard.mesh.geometry, mt);
      m.position.set(k * 0.02, k * 0.035, -k * 0.55);
      stack.add(m); layerMats.push(mt);
    }
    const lab = tag('96 x DECODER BLOCK · d_model 12,288 · 96 heads · context 2,048', 0.18, F.mono(500), [1.2, 1.1, 1]);
    lab.position.set(-2.6, 1.9, 0.1); stack.add(lab);
    const p = new Panel(1600, 1000);
    const { group } = screen(p, 6.4, 4.0, 1.5);
    group.position.set(4, 2.6, -2); g.add(group);
    const prompt = 'Q: What is the capital of France?\nA: Paris\n\nQ: Write the next line of the song.\nA:';
    const comp: [string, [string, number][]][] = [
      [' Three', [[' Three', 0.41], [' The', 0.22], [' Seven', 0.09], [' We', 0.07]]],
      [' years', [[' years', 0.88], [' days', 0.04], [' hours', 0.02], [' months', 0.02]]],
      [' later', [[' later', 0.93], [' ago', 0.03], [' pass', 0.01], [' on', 0.01]]],
      [',', [[',', 0.71], [' the', 0.11], ['.', 0.08], [' GPT', 0.04]]],
      [' GPT', [[' GPT', 0.64], [' AI', 0.12], [' it', 0.08], [' we', 0.05]]],
      ['-3', [['-3', 0.97], ['-2', 0.01], ['-4', 0.01], [' 3', 0.01]]],
    ];
    const hitT = this.lines[i].words[this.lines[i].words.length - 1].start;
    return (t, lt) => {
      const k = this.wordIdx(i, t);
      const sl = prog(t, this.lines[i].words[3].start - 0.4, this.lines[i].words[3].start, ease.outBack);
      group.position.z = lerp(-40, -2, sl);
      group.rotation.y = lerp(0.8, 0, sl);
      const c = p.begin();
      c.fillStyle = '#0b0c10'; c.fillRect(0, 0, 1600, 1000); c.strokeStyle = 'rgba(236,233,226,0.4)'; c.lineWidth = 3; c.strokeRect(2, 2, 1596, 996);
      c.fillStyle = '#16181f'; c.fillRect(0, 0, 1600, 70);
      setFont(c, F.mono(500), 26); c.fillStyle = '#ece9e2'; c.fillText('completion · davinci · 175B', 30, 45);
      setFont(c, F.mono(400), 34); c.fillStyle = '#8b8f99';
      prompt.split('\n').forEach((s2, j) => c.fillText(s2, 60, 150 + j * 52));
      let x = 110; const y = 150 + 4 * 52;
      const nTok = Math.min(comp.length, Math.max(0, k + 2));
      for (let j = 0; j < nTok; j++) {
        const [tok, dist] = comp[j];
        setFont(c, F.mono(500), 34);
        const w = c.measureText(tok).width;
        c.fillStyle = `rgba(255,178,30,${0.08 + 0.3 * dist[0][1]})`; c.fillRect(x, y - 36, w, 46);
        c.fillStyle = '#ece9e2'; c.fillText(tok, x, y);
        if (j === nTok - 1) {
          const bx = Math.min(x, 1150), by = y + 30;
          c.fillStyle = '#101218'; c.fillRect(bx, by, 420, 210); c.strokeStyle = '#ffb21e'; c.lineWidth = 2; c.strokeRect(bx, by, 420, 210);
          dist.forEach(([s2, pr], q) => {
            setFont(c, F.mono(q === 0 ? 600 : 400), 26); c.fillStyle = q === 0 ? '#ffb21e' : '#8b8f99';
            c.fillText(JSON.stringify(s2), bx + 16, by + 44 + q * 44);
            c.fillStyle = q === 0 ? '#ffb21e' : '#474b55'; c.fillRect(bx + 200, by + 26 + q * 44, 150 * pr, 22);
            setFont(c, F.mono(400), 22); c.fillStyle = '#ece9e2'; c.fillText(`${(pr * 100).toFixed(0)}%`, bx + 360, by + 44 + q * 44);
          });
        }
        x += w;
      }
      p.end();
      stack.rotation.y = -0.5 + lt * 0.12;
      layerMats.forEach((mt, j) => { const kk = 0.55 + 2.2 * pulse(t, hitT + j * 0.008, 0.2); mt.color.setRGB(kk, kk * 0.92, kk * 0.8); });
    };
  }

  wordIdx(i: number, t: number) {
    const ws = this.lines[i].words;
    let k = -1;
    for (let j = 0; j < ws.length; j++) if (t >= ws[j].start) k = j;
    return k;
  }

  // ======================================================== frame
  render(f: Frame, out: RT) {
    const t = f.t;
    const i = this.vi(t);
    const lt = this.vt(t, i);
    // head: steps cell by cell as each token is sung; races between stations
    let hx = this.sx(i) - 1;
    const lineToks = this.words.filter((q) => q.line === i);
    let k = -1; lineToks.forEach((q, j) => { if (t >= q.w.start) k = j; });
    if (k >= 0) {
      const w = lineToks[k];
      const prev = k > 0 ? lineToks[k - 1].x : this.sx(i) - 1;
      hx = lerp(prev, w.x, ease.outExpo(clamp((t - w.w.start) / 0.16)));
    } else if (i > 0) {
      const from = this.words.filter((q) => q.line === i - 1).slice(-1)[0]?.x ?? this.sx(i - 1);
      hx = lerp(from, this.sx(i) - 1, ease.inOutCubic(clamp(lt / 0.5)));
    }
    this.head.position.set(hx, 0, 0);
    const needle = this.head.getObjectByName('needle')!;
    needle.rotation.z = -Math.max(0, k) * (Math.PI / 2);
    for (const q of this.words) { const on = t >= q.w.start; q.s.visible = on; q.id.visible = on; if (q.sp) q.sp.visible = on; }
    this.words.forEach((q) => { const a = clamp((t - q.w.start) / 0.3); q.s.material.color.copy(a < 1 ? C('gold', 3 - 2 * a) : C('bone', 0.9)); q.id.material.color.copy(C('ash', 0.8)); if (q.sp) q.sp.material.color.copy(C('ash', 0.6)); });
    this.upd.forEach((u, j) => u(t, t - this.cuts[j], j));
    // snow
    const sn = this.snowAmt * (i === 2 ? 1 : 0);
    this.snow.visible = sn > 0.01;
    if (this.snow.visible) {
      for (let s = 0; s < 3000; s++) {
        const x = this.sx(2) - 8 + hash(s, 1) * 22, z = -10 + hash(s, 2) * 16;
        const y = 8 - ((t * (0.6 + hash(s, 3) * 0.8) + hash(s, 4) * 9) % 9) + Math.sin(t + s) * 0.1;
        this.snowPos.set([x + Math.sin(t * 0.7 + s) * 0.3, y, z], s * 3);
      }
      (this.snow.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.snow.material as THREE.PointsMaterial).opacity = 0.9 * sn;
    }
    // lyrics: billboard each rig toward the camera
    const shot = this.paths[i].at(t);
    applyCam(this.cam, shot, t, 0.06, 0.08 * f.a.kick, 7);
    this.rigs.forEach((r, j) => {
      r.group.visible = Math.abs(j - i) <= 1;
      if (!r.group.visible) return;
      r.group.quaternion.copy(this.cam.quaternion);
      r.update(t);
    });
    this.years.forEach((y, j) => { y.visible = j === i; y.material.opacity = prog(lt, 0, 0.6); });
    this.ctx.three.render(this.scene, this.cam, out, { focus: shot.focus, aperture: 45, maxR: 14 });
    // tiny machine-voice caption
    this.begin();
    const caps = ['A-MACHINE · δ(q, a) = (q′, b, D)', 'STORED PROGRAM · FETCH → DECODE → EXECUTE', 'SUMMER 1956 · WINTER 1974', 'BACKPROPAGATION · ∂L/∂w', 'CONVOLUTION · 2 GPUs · 60M PARAMS', 'ALPHAGO 4 – 1 LEE SEDOL', 'ATTENTION IS ALL YOU NEED', 'GPT-3 · 175B · 3.14 × 10²³ FLOP'];
    const { label } = { label: (s: string, x: number, y: number, a: number) => { setFont(this.c, F.mono(500), 13); this.c.fillStyle = rgba('ash', a); (this.c as unknown as CanvasRenderingContext2D).letterSpacing = '3px'; this.c.fillText(s, x, y); (this.c as unknown as CanvasRenderingContext2D).letterSpacing = '0px'; } };
    label(caps[i], 96, 80, prog(lt, 0.1, 0.5));
    this.flush(out, 2.0);
    const gT = this.lines[7].words[3].start;
    return {
      hud: 1,
      flash: pulse(t, this.cuts[i], 0.06) * 0.5 + (i === 7 ? pulse(t, gT, 0.12) * 0.6 : 0) + (i === 5 ? pulse(t, this.lines[5].words[1].start, 0.1) * 0.7 : 0),
      zoom: 1 + 0.01 * f.a.kick,
      vignette: 0.5,
      bloom: 0.5,
      exposure: 1 - (i === 2 ? this.snowAmt * 0.1 : 0),
    };
  }
}
void tube;
