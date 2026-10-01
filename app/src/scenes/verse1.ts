// VERSE 1 — "175,000,000,000" (2020 → 2021), one continuous 3D plate.
// GPT-3's 96 decoder blocks as an architecture you can fly through (attention heads, 4× MLP, residual stream);
// the autocomplete graduates; few-shot gradients bounce off frozen weights; rows of books are fed in (1, 3, 5,
// 9, 15, 25 rows) and text is written token by token with its probability box; then AlphaFold2's actual mechanism
// on ubiquitin (1UBQ): MSA + pair representation → structure module frames from the origin → the fold.
import * as THREE from 'three';
import { Plate, type Frame } from './_base';
import type { RT } from '../engine/gl';
import { applyCam, CamPath, type CamKey } from '../engine/cam';
import { WordSprite } from '../engine/text3d';
import { LyricRig } from '../engine/kinetic';
import { F, setFont } from '../engine/type';
import { rgba } from '../engine/palette';
import { C, M, Panel, screen, tag, lights, anchorRig, flatten, edgeBoxMaterial } from './kit';
import { LineBatch, linCol } from '../engine/lines';
import { parsePDB, seqOf, cartoon, contactMap, type Residue } from './protein';
import { clamp, ease, prog, lerp, hash, pulse, groupDigits, mulberry32 } from '../engine/util';

const NB = 96, NH = 96, MLP = 16; // blocks, heads, MLP grid side
const DZ = 1.45;
const FOLD_X = 90;

export default class Verse1 extends Plate {
  scene = new THREE.Scene();
  cam = new THREE.PerspectiveCamera(45, 16 / 9, 0.05, 900);
  arch = new LineBatch(260000, { depthTest: true });
  lanes = new LineBatch(400, { depthTest: true });
  shield!: THREE.Mesh;
  books!: THREE.InstancedMesh;
  grads!: THREE.InstancedMesh;
  paths: CamPath[] = [];
  rigs: LyricRig[] = [];
  counter = new Panel(1400, 260);
  counterMesh!: THREE.Mesh;
  ui = new Panel(1200, 800); uiMesh!: THREE.Group;
  gen = new Panel(1600, 900); genMesh!: THREE.Group;
  cap = new THREE.Group();
  tricks: THREE.Group[] = [];
  // fold
  rs: Residue[] = [];
  fold = new THREE.Group();
  cartoonMesh!: THREE.Mesh;
  frames!: THREE.InstancedMesh;
  msa = new Panel(2048, 420); msaMesh!: THREE.Mesh;
  pair = new Panel(512, 512); pairMesh!: THREE.Mesh;
  tiles: THREE.Group[] = [];
  foldLabels: { s: WordSprite; res: number; dx: number; dy: number }[] = [];
  m4 = new THREE.Matrix4(); col = new THREE.Color();

  async init() {
    this.useLines(this.ctx.lyrics.section('Verse 1'));
    const sc = this.scene;
    sc.environment = this.ctx.three.env;
    sc.fog = new THREE.FogExp2(0x030304, 0.012);
    lights(sc, 2.0);
    this.buildStack();
    this.buildUI();
    this.buildBooks();
    await this.buildFold();
    this.buildPaths();
    this.lines.forEach((l, i) => {
      const rig = new LyricRig(l, { font: F.display(700), size: 0.62, maxWidth: 10, enter: i % 2 ? 'up' : 'depth', exit: i === 3 ? 'fall' : 'scatter', anticipate: 0.4 });
      sc.add(rig.group);
      anchorRig(rig, this.paths[i], (l.words[0].start + l.end) / 2, -0.8, i >= 6 ? 0.62 : -0.58);
      this.rigs.push(rig);
    });
    flatten(sc);
  }

  // ------------------------------------------------------------------ the 96-block stack
  buildStack() {
    const sc = this.scene;
    // the architecture itself is drawn every frame as GPU line art (drawStack)
    sc.add(this.arch.mesh);
    // embedding & unembedding plates
    const emb = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.4, 0.08), new THREE.MeshStandardMaterial({ color: C('ink3', 2), metalness: 0.6, roughness: 0.3, emissive: C('gold', 0.05) }));
    emb.position.z = 2.2; emb.visible = false; sc.add(emb);
    const embL = tag('TOKEN EMBEDDING · 50,257 × 12,288', 0.12); embL.position.set(-1.7, 1.9, 2.25); sc.add(embL);
    const unb = emb.clone(); unb.position.z = -NB * DZ - 2; unb.visible = false; sc.add(unb);
    const unL = tag('UNEMBEDDING → SOFTMAX', 0.12); unL.position.set(-1.7, 1.9, -NB * DZ - 1.95); sc.add(unL);
    for (let b = 0; b < NB; b += 12) {
      const l = tag(`BLOCK ${b + 1}`, 0.1); l.position.set(1.8, 1.4, -b * DZ); sc.add(l);
    }
    // shield (few-shot: gradients can't get in)
    this.shield = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, NB * DZ, 6, 40, true), new THREE.MeshBasicMaterial({ color: C('gold', 1.4), wireframe: true, transparent: true, opacity: 0, toneMapped: false }));
    this.shield.rotation.x = Math.PI / 2; this.shield.position.z = -(NB * DZ) / 2;
    sc.add(this.shield);
    this.grads = new THREE.InstancedMesh(new THREE.ConeGeometry(0.12, 0.45, 3), M.glow('bone', 2.5), 200);
    this.grads.frustumCulled = false;
    sc.add(this.grads);
    // counter (screen-space-ish plate near the front of the stack)
    const { group, plane } = screen(this.counter, 7, 1.3, 1.6, false);
    group.position.set(-3.2, 2.8, 4); group.rotation.y = 0.3;
    this.counterMesh = plane; sc.add(group);
    void plane;
  }

  // ------------------------------------------------------------------ UI panels
  buildUI() {
    const sc = this.scene;
    const u = screen(this.ui, 4.8, 3.2, 1.3);
    u.group.position.set(-4.6, 1.2, 4.5); u.group.rotation.y = 0.45;
    this.uiMesh = u.group; sc.add(u.group);
    const g = screen(this.gen, 6.4, 3.6, 1.4);
    g.group.position.set(5.2, 1.2, 9); g.group.rotation.y = -0.55;
    this.genMesh = g.group; sc.add(g.group);
    // mortarboard: square board, cap, button, tassel
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.05, 1.5), new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.6 }));
    const capB = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.6, 0.45, 32), new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.7 }));
    capB.position.y = -0.24;
    const btn = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), M.gold(0.3)); btn.position.y = 0.05;
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 6), M.gold(0.4)); cord.position.set(0.4, -0.3, 0.4); cord.rotation.z = 0.2;
    const tas = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 0.3, 8), M.gold(0.4)); tas.position.set(0.48, -0.75, 0.42);
    this.cap.add(board, capB, btn, cord, tas);
    this.cap.rotation.set(0.2, 0.5, 0);
    sc.add(this.cap);
    // tricks: cards that pop out of the (frozen) stack
    ['translate → French', 'add 3-digit numbers', 'unscramble words', 'write a poem', 'use a new word', 'SQL from English'].forEach((s, k) => {
      const p = new Panel(700, 160);
      const c = p.begin();
      c.fillStyle = 'rgba(255,178,30,0.16)'; c.fillRect(0, 0, 700, 160);
      c.strokeStyle = '#ffb21e'; c.lineWidth = 6; c.strokeRect(3, 3, 694, 154);
      setFont(c, F.mono(500), 54); c.fillStyle = '#ffd98a'; c.fillText(s, 34, 100);
      p.end();
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.5), new THREE.MeshBasicMaterial({ map: p.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, color: new THREE.Color(1.6, 1.6, 1.6) }));
      const gr = new THREE.Group(); gr.add(m); gr.visible = false; sc.add(gr); this.tricks.push(gr);
      void k;
    });
  }

  // ------------------------------------------------------------------ books
  buildBooks() {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    this.books = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, metalness: 0.05 }), 2400);
    this.books.frustumCulled = false;
    const palette = [C('umber', 1.3), C('bone', 0.8), C('graphite', 2.2), C('gold', 0.55), C('ink3', 3), C('ash', 0.7)];
    for (let i = 0; i < 2400; i++) this.books.setColorAt(i, palette[Math.floor(hash(i, 3) * palette.length)]);
    this.scene.add(this.books, this.lanes.mesh);
    // conveyor floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(26, 60), new THREE.MeshStandardMaterial({ color: C('ink2', 1.5), roughness: 0.7, metalness: 0.4 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(0, -2.2, 32);
    floor.name = 'floor';
    this.scene.add(floor);
  }

  // ------------------------------------------------------------------ AlphaFold
  async buildFold() {
    const txt = await (await fetch('data/pdb/1ubq.pdb')).text();
    this.rs = parsePDB(txt);
    const S = 0.13; // Å → world
    this.fold.position.set(FOLD_X, 1.2, -4);
    this.fold.scale.setScalar(S);
    this.scene.add(this.fold);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uGrow: { value: 1 }, uN: { value: this.rs.length }, uT: { value: 0 }, uA: { value: 1 } },
      transparent: true,
      vertexShader: `attribute float rid; varying float vR; varying vec3 vN; varying vec3 vV;
        void main(){ vR = rid; vec4 wp = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix)*normal); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix * viewMatrix * wp; }`,
      fragmentShader: `uniform float uN; uniform float uT; uniform float uA; varying float vR; varying vec3 vN; varying vec3 vV;
        void main(){
          float u = vR / uN;
          // pLDDT-like confidence: termini lower, core high
          float conf = 0.55 + 0.45 * smoothstep(0.0, 0.1, u) * smoothstep(1.0, 0.9, u);
          vec3 lo = vec3(0.30, 0.25, 0.22), hi = vec3(1.0, 0.45, 0.02);
          vec3 base = mix(lo, hi, conf);
          vec3 n = normalize(vN); vec3 l = normalize(vec3(-0.4, 0.8, 0.5));
          float d = max(dot(n, l), 0.0); float rim = pow(1.0 - abs(dot(n, vV)), 3.0);
          float spec = pow(max(dot(reflect(-l, n), vV), 0.0), 24.0);
          vec3 c = base * (0.18 + 0.9 * d) + vec3(1.0, 0.85, 0.6) * spec * 0.6 + base * rim * 1.4;
          gl_FragColor = vec4(c, uA);
        }`,
    });
    this.cartoonMesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
    this.fold.add(this.cartoonMesh);
    // secondary structure (from the PDB's HELIX/SHEET records) and the two famous lysines
    ([['N', 1, -0.5, 0.2], ['β1', 4, 0.3, 0.3], ['β2', 13, 0.3, 0.3], ['α1', 28, 0.4, 0.3], ['β3', 42, 0.3, 0.3], ['β4', 49, 0.3, -0.3], ['3₁₀', 57, 0.3, 0.3], ['β5', 68, 0.3, 0.3], ['C', 76, 0.3, 0.2], ['K48', 48, 0.3, -0.5], ['K63', 63, 0.3, 0.4]] as [string, number, number, number][])
      .forEach(([txt, res, dx, dy]) => { const sp = new WordSprite(txt, F.mono(600), 0.22); sp.visible = false; sp.renderOrder = 12; this.scene.add(sp); this.foldLabels.push({ s: sp, res, dx, dy }); });
    // structure-module frames (one small triangle per residue)
    const tri = new THREE.ConeGeometry(0.9, 2.4, 3); tri.rotateX(Math.PI / 2);
    this.frames = new THREE.InstancedMesh(tri, M.glow('gold', 2.5), this.rs.length);
    this.frames.frustumCulled = false;
    this.fold.add(this.frames);
    // MSA panel + pair representation
    const mm = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.85), new THREE.MeshBasicMaterial({ map: this.msa.tex, toneMapped: false, transparent: true, color: new THREE.Color(1.3, 1.3, 1.3) }));
    mm.position.set(FOLD_X - 1, 5.2, -9); this.msaMesh = mm; this.scene.add(mm);
    const pm = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.4), new THREE.MeshBasicMaterial({ map: this.pair.tex, toneMapped: false, color: new THREE.Color(1.5, 1.5, 1.5) }));
    pm.position.set(FOLD_X - 6.8, 1.6, -7); pm.rotation.y = 0.5; this.pairMesh = pm; this.scene.add(pm);
    const pl = tag('PAIR REPRESENTATION  (76 × 76)', 0.14); pl.position.set(FOLD_X - 8.3, 3.6, -6.2); pl.rotation.y = 0.5; this.scene.add(pl);
    const ml = tag('MSA  ·  48 EVOFORMER BLOCKS', 0.14); ml.position.set(FOLD_X - 5.5, 6.4, -9); this.scene.add(ml);
    // Si and C tiles
    const mk = (sym: string, z: string, nm: string, gold: boolean, x: number) => {
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 0.3), new THREE.MeshStandardMaterial({ color: C('ink2', 2), metalness: 0.5, roughness: 0.35, emissive: gold ? C('gold', 0.08) : C('ink', 0) }));
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(b.geometry), M.line(gold ? 'gold' : 'bone', gold ? 2 : 0.9));
      const s = new WordSprite(sym, F.display(700), 0.95); s.position.set(-0.4, -0.25, 0.17); s.tint(gold ? 3 : 1, gold ? 1.4 : 1, gold ? 0.2 : 1, 1);
      const zz = tag(z, 0.2, F.mono(500)); zz.position.set(-0.7, 0.55, 0.17);
      const nn = tag(nm, 0.12, F.mono(500)); nn.position.set(-0.7, -0.7, 0.17);
      g.add(b, e, s, zz, nn); g.position.set(FOLD_X + x, 1.4, -2.5); g.visible = false;
      this.scene.add(g); this.tiles.push(g);
    };
    mk('Si', '14', 'SILICON', true, -4.4);
    mk('C', '6', 'CARBON', false, 4.4);
  }

  // ------------------------------------------------------------------ camera
  buildPaths() {
    const L = this.lines, cuts = this.cuts, e = ease;
    const end = (i: number) => this.vEnd(i);
    const Z = -NB * DZ;
    const K: CamKey[][] = [
      // 0: fly in through the stack along the residual stream
      [{ t: cuts[0], pos: [3.5, 1.6, 12], look: [0, 0, -10], fov: 46 }, { t: L[0].words[1].start, pos: [0.75, 0.55, 3.5], look: [0.4, 0.3, -20], fov: 58, e: e.inQuad }, { t: end(0), pos: [0.7, 0.6, -58], look: [0.3, 0.2, -90], fov: 66, e: e.inOutQuad }],
      // 1: pull out to the side; the autocomplete panel graduates
      [{ t: cuts[1], pos: [-12, 5, 14], look: [-3, 0.5, 0], fov: 42 }, { t: end(1), pos: [-9.5, 3.2, 10], look: [-4.3, 1.2, 4.3], fov: 38, e: e.inOutCubic }],
      // 2: few-shot: gradients from the right bounce off the shield
      [{ t: cuts[2], pos: [9, 4, 10], look: [0, 0, -12], fov: 44 }, { t: end(2), pos: [11, 2.5, -2], look: [0, 0, -25], fov: 40, e: e.inOutQuad }],
      // 3: frozen weights; tricks pop out of the output end
      [{ t: cuts[3], pos: [5, 3, Z - 10], look: [0, 0, Z + 10], fov: 44 }, { t: end(3), pos: [-4, 2, Z - 14], look: [0, 0.5, Z + 2], fov: 46, e: e.inOutCubic }],
      // 4: books: the conveyor into the mouth of the stack
      [{ t: cuts[4], pos: [7, 6, 40], look: [0, -1, 18], fov: 48 }, { t: L[4].words[3].start, pos: [4, 3, 26], look: [0, -0.5, 6], fov: 46, e: e.inOutQuad }, { t: end(4), pos: [1, 2.5, 17], look: [4, 1, 9], fov: 42, e: e.inOutCubic }],
      // 5: the writing (probability boxes)
      [{ t: cuts[5], pos: [0.5, 2, 16], look: [5, 1.2, 9], fov: 40 }, { t: end(5), pos: [1.8, 1.6, 13.6], look: [5.2, 1.2, 9], fov: 36, e: e.inOutQuad }],
      // 6: AlphaFold: MSA + pair → frames
      [{ t: cuts[6], pos: [FOLD_X - 3, 5, 10], look: [FOLD_X - 2, 2.5, -6], fov: 46 }, { t: end(6), pos: [FOLD_X + 2, 2.4, 6], look: [FOLD_X, 1.2, -4], fov: 40, e: e.inOutCubic }],
      // 7: orbit the fold; Si studies C
      [{ t: cuts[7], pos: [FOLD_X + 2, 2.4, 6], look: [FOLD_X, 1.2, -4], fov: 40 }, { t: end(7), pos: [FOLD_X - 3.5, 3.5, 5.5], look: [FOLD_X, 1.3, -3.6], fov: 44, e: e.inOutQuad }],
    ];
    this.paths = K.map((k) => new CamPath(k));
  }

  /** GPT-3 as it actually computes: P token positions, each with a residual stream through all 96 decoder blocks.
   *  Per block (pre-LN): LayerNorm → Q,K,V → causal multi-head attention (each position attends to itself and every
   *  earlier position; H heads drawn as arc families) → ⊕ residual → LayerNorm → MLP 12,288 → 49,152 → 12,288 (GELU)
   *  → ⊕ residual. Blocks near the camera are drawn in full; far blocks keep only streams and frames (LOD). */
  drawStack(t: number, wave: number, frozen: number, kick: number) {
    const lb = this.arch; lb.clear();
    const P = 6, H = 4, K = 14;
    const camZ = this.cam.position.z;
    const gold = linCol('#ffb21e', 2.2), core = linCol('#ffe7b0', 3.2), bone = linCol('#ece9e2', 0.55), ash = linCol('#8b8f99', 0.5), cold = linCol('#cfe0ff', 0.9);
    const px = (p: number) => (p - (P - 1) / 2) * 0.62;
    const mix = (a: number[], b2: number[], k: number) => [a[0] + (b2[0] - a[0]) * k, a[1] + (b2[1] - a[1]) * k, a[2] + (b2[2] - a[2]) * k];
    const tint = (k: number) => { const c = mix(bone, gold, Math.min(1, k)); return frozen > 0 ? mix(c, cold, frozen * 0.8) : c; };
    const L = (a: number[], b2: number[], w: number, c: number[], al: number) => lb.seg(a[0], a[1], a[2], b2[0], b2[1], b2[2], w, c[0], c[1], c[2], al);
    const ring = (x: number, y: number, z: number, r: number, c: number[], al: number, seg = 14) => { for (let k = 0; k < seg; k++) { const a0 = (k / seg) * 6.283, a1 = ((k + 1) / seg) * 6.283; L([x + Math.cos(a0) * r, y + Math.sin(a0) * r, z], [x + Math.cos(a1) * r, y + Math.sin(a1) * r, z], 1, c, al); } };
    // residual streams through the whole stack
    const zEnd = -NB * DZ - 2, zBeg = 2.2;
    for (let p = 0; p < P; p++) L([px(p), 0, zBeg], [px(p), 0, zEnd], 2.2, frozen > 0 ? mix(gold, cold, frozen * 0.6) : gold, 0.85);
    // embedding (50,257 × 12,288) and unembedding matrices as line grids; each position looks up one row
    for (const [zm, label] of [[zBeg, 0], [zEnd, 1]] as [number, number][]) {
      const S = 1.7, n = 16;
      for (let k = 0; k <= n; k++) { const u = -S + (2 * S * k) / n; L([u, -S, zm], [u, S, zm], 1, bone, 0.35); L([-S, u, zm], [S, u, zm], 1, bone, 0.35); }
      for (let p = 0; p < P; p++) { const row = Math.floor(hash(p, label, 3) * n); const y = -S + (2 * S * (row + 0.5)) / n; L([-S, y, zm], [S, y, zm], 2.4, gold, 0.9); L([px(p), y, zm], [px(p), 0, zm + (label ? 0.6 : -0.6)], 1.2, gold, 0.6); }
    }
    for (let b = 0; b < NB; b++) {
      const z = -b * DZ, zc = b * DZ;
      const w = Math.exp(-Math.pow((zc - wave) / 6, 2)) + 0.4 * kick * Math.exp(-Math.pow((zc - wave * 0.5) / 10, 2));
      const near = true; // every block is drawn in full (no LOD), so every connection exists in every shot
      const segsN = Math.abs(z - camZ) < 34 ? 8 : 4;
      const fA = near ? 1 : 0.5;
      // block frame (the decoder block boundary)
      const fx = px(P - 1) + 0.45, c0 = tint(w * 0.6);
      [[-fx, -1.15], [fx, -1.15], [fx, 0.95], [-fx, 0.95]].forEach(([x, y], k, arr) => { const [x2, y2] = arr[(k + 1) % 4]; L([x, y, z], [x2, y2, z], 1, c0, 0.35 * fA); });
      if (!near) continue;
      const zLN1 = z - 0.08, zQKV = z - 0.2, zAtt = z - 0.34, zAdd1 = z - 0.5, zLN2 = z - 0.62, zUp = z - 0.72, zHid = z - 0.98, zDn = z - 1.22, zAdd2 = z - 1.34;
      for (let p = 0; p < P; p++) {
        const x = px(p);
        ring(x, 0, zLN1, 0.07, tint(w), 0.7);
        // Q, K, V projections: three short spokes up from the normalised stream
        const q: number[] = [x, 0.22, zAtt], kk: number[] = [x - 0.08, 0.16, zQKV], v: number[] = [x + 0.08, 0.16, zQKV];
        L([x, 0, zLN1], q, 1, tint(w), 0.6); L([x, 0, zLN1], kk, 1, tint(w), 0.45); L([x, 0, zLN1], v, 1, tint(w), 0.45);
        // causal attention: position p reads keys/values of every q ≤ p, per head (arcs above the streams)
        for (let h = 0; h < H; h++) {
          // a deterministic softmax-ish pattern per (block, head, position)
          let tot = 0; const ws: number[] = [];
          for (let r = 0; r <= p; r++) { const e = Math.exp(3 * hash(b, h, p, r) + (r === p ? 1 : 0) + (h === 0 && r === p - 1 ? 2 : 0)); ws.push(e); tot += e; }
          for (let r = 0; r <= p; r++) {
            const wt = ws[r] / tot; if (wt < 0.08 && r !== p) continue;
            const x0 = px(r), x1 = x, hgt = 0.26 + 0.12 * h + Math.abs(x1 - x0) * 0.35, zz = zAtt - h * 0.03;
            const segs = segsN; let prev = [x0 + 0.08, 0.16, zQKV];
            for (let s2 = 1; s2 <= segs; s2++) { const u = s2 / segs; const pt = [x0 + (x1 - x0) * u, 0.22 + Math.sin(u * Math.PI) * hgt, zz]; L(prev, pt, 0.6 + 1.6 * wt, tint(w * (0.5 + wt * 2)), (0.15 + 0.85 * wt) * 0.9); prev = pt; }
          }
        }
        // attention output (W_o) back into the stream, ⊕ residual add
        L(q, [x, 0, zAdd1], 1, tint(w), 0.6);
        ring(x, 0, zAdd1, 0.06, tint(w * 1.2), 0.9, 10); L([x - 0.05, 0, zAdd1], [x + 0.05, 0, zAdd1], 1, tint(w), 0.9);
        ring(x, 0, zLN2, 0.07, tint(w), 0.7);
        // MLP: 4× expansion to a column of hidden units (GELU) below the stream, then contraction
        for (let j = 0; j < K; j++) {
          const y = -0.2 - (j / (K - 1)) * 0.85, act = Math.max(0, hash(b, p, j) * 1.4 - 0.4) * (0.4 + w);
          const hu = [x, y, zHid];
          L([x, 0, zUp], hu, 0.6, tint(w * 0.7), 0.18 + 0.4 * Math.min(1, act));
          L(hu, [x, 0, zDn], 0.6, tint(w * 0.7), 0.12 + 0.4 * Math.min(1, act));
          const c = act > 0.5 ? core : tint(w); lb.seg(hu[0], hu[1], hu[2], hu[0], hu[1], hu[2], 3 + 3 * Math.min(1, act), c[0], c[1], c[2], 0.5 + 0.5 * Math.min(1, act));
        }
        ring(x, 0, zAdd2, 0.06, tint(w * 1.2), 0.9, 10); L([x - 0.05, 0, zAdd2], [x + 0.05, 0, zAdd2], 1, tint(w), 0.9);
      }
    }
    void ash;
  }

  wordIdx(i: number, t: number) { const ws = this.lines[i].words; let k = -1; for (let j = 0; j < ws.length; j++) if (t >= ws[j].start) k = j; return k; }

  // ------------------------------------------------------------------ frame
  render(f: Frame, out: RT) {
    const t = f.t;
    const i = this.vi(t);
    const lt = this.vt(t, i);
    const L = this.lines;
    const shot = this.paths[i].at(t);
    applyCam(this.cam, shot, t, i === 0 ? 0.02 : 0.08, 0.06 * f.a.kick, 11);
    // ---- activations ripple through the stack
    const frozenT = L[3].words[1].start;
    const frozen = prog(t, frozenT - 0.1, frozenT + 0.5, ease.outCubic) * (1 - prog(t, this.cuts[4] + 1.5, this.cuts[4] + 2.5));
    const wave = ((t - this.ctx.start) * 38) % (NB * DZ + 40);
    this.drawStack(t, wave, frozen, f.a.kick);
    // ---- weight counter (line 0)
    this.counterMesh.parent!.visible = i <= 1;
    if (i <= 1) {
      const l0 = L[0];
      const p = prog(t, l0.words[0].start, l0.words[l0.words.length - 1].start + 0.2);
      const v = p >= 1 ? 175e9 : Math.floor(Math.pow(10, lerp(0, Math.log10(175e9), ease.outQuad(p))));
      const c = this.counter.begin();
      setFont(c, F.mono(300), 170); c.fillStyle = p >= 1 ? '#ffb21e' : '#ece9e2'; c.textAlign = 'right';
      c.fillText(groupDigits(v), 1390, 190);
      setFont(c, F.mono(500), 34); c.fillStyle = 'rgba(139,143,153,1)'; c.textAlign = 'left'; c.fillText('PARAMETERS · FP16 · 350 GB', 10, 245);
      this.counter.end();
    }
    // ---- line 1: autocomplete + graduation cap
    this.uiMesh.visible = i === 1;
    this.cap.visible = i === 1;
    if (i === 1) this.drawAutocomplete(t);
    // ---- line 2: gradients bounce off the shield
    const l2 = L[2];
    const noT = l2.words[l2.words.length - 2].start;
    // exit: on the cut to "frozen weights" the gradients freeze where they are, ice over, and shatter away in turn
    const gExit = i === 2 ? clamp((t - (this.cuts[3] - 0.75)) / 0.7) : i > 2 ? 1 : 0;
    const gOn = i === 2;
    (this.shield.material as THREE.MeshBasicMaterial).opacity = gOn ? 0.08 + 0.35 * pulse(t, noT, 0.25) + 0.1 * Math.max(0, Math.sin(t * 20)) * prog(t, noT, noT + 0.2) : frozen * 0.12;
    for (let g = 0; g < 200; g++) {
      if (!gOn) { this.m4.makeScale(0, 0, 0); this.grads.setMatrixAt(g, this.m4); continue; }
      const tf = this.cuts[3] - 0.75, tt = t > tf ? tf + (t - tf) * 0.08 : t; // frozen in place at the end of the line
      const ph = ((tt - this.cuts[2]) * 0.9 + hash(g, 1)) % 1;
      const ek = clamp(gExit * 1.7 - hash(g, 4) * 0.7);
      const zz = -hash(g, 2) * 60 - 4, yy = (hash(g, 3) - 0.5) * 4;
      // fly in from +x, reflect at the shield radius
      const x = ph < 0.5 ? lerp(16, 2.6, ph * 2) : lerp(2.6, 12, (ph - 0.5) * 2);
      const dir = ph < 0.5 ? -1 : 1;
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), dir * Math.PI / 2);
      const sc = ek <= 0 ? 1 : Math.max(0, 1 + 0.6 * Math.sin(ek * Math.PI) - ek * 1.6);
      const burst = ease.outCubic(ek) * 1.5;
      this.m4.compose(new THREE.Vector3(x + (hash(g, 5) - 0.5) * burst, yy + (hash(g, 6) - 0.2) * burst, zz), q, new THREE.Vector3(sc, sc, sc));
      this.grads.setMatrixAt(g, this.m4);
    }
    this.grads.instanceMatrix.needsUpdate = true;
    (this.grads.material as THREE.MeshBasicMaterial).color.copy(C('bone', 2.5)).lerp(new THREE.Color(1.2, 1.8, 2.6), gExit > 0 ? Math.min(1, gExit * 4) : 0);
    // ---- line 3: tricks pop out of the output end
    const trT = L[3].words[4].start;
    this.tricks.forEach((g, k) => {
      const tt = trT + k * 0.2;
      const p = prog(t, tt, tt + 0.5, ease.outBack);
      g.visible = i === 3 && p > 0;
      const a = (k / this.tricks.length) * Math.PI * 2;
      g.position.set(Math.cos(a) * 3.2 * p, Math.sin(a) * 2.2 * p + 0.3, -NB * DZ - 3 - 5 * p);
      g.lookAt(this.cam.position);
    });
    this.scene.getObjectByName('floor')!.visible = i === 4 || i === 5;
    // ---- line 4–5: books and the writing
    this.updateBooks(t, i);
    this.genMesh.visible = i === 4 || i === 5;
    if (this.genMesh.visible) this.drawGen(t);
    // ---- 6–7: AlphaFold
    this.updateFold(t, i);
    // ---- lyrics
    this.rigs.forEach((r, j) => { r.group.visible = Math.abs(j - i) <= 1; if (r.group.visible) r.update(t); });
    this.ctx.three.render(this.scene, this.cam, out, { focus: shot.focus, aperture: i === 0 ? 20 : 45, maxR: 14 });
    this.begin();
    const tags = ['GPT-3 · 96 LAYERS · 96 HEADS · d = 12,288', 'NEXT-TOKEN PREDICTION', 'IN-CONTEXT LEARNING · NO GRADIENT STEPS', 'FROZEN WEIGHTS · NEW TASKS', 'BOOKS1 · BOOKS2 · WEBTEXT2 · COMMON CRAWL · WIKIPEDIA', 'FLUENT ≠ TRUE  (TRUTHFULQA)', 'ALPHAFOLD 2 · UBIQUITIN 1UBQ · 76 RESIDUES', 'SILICON STUDIES CARBON'];
    setFont(this.c, F.mono(500), 13); this.c.fillStyle = rgba('ash', 0.9 * prog(lt, 0.1, 0.5));
    (this.c as unknown as CanvasRenderingContext2D).letterSpacing = '3px'; this.c.fillText(tags[i], 96, 80); (this.c as unknown as CanvasRenderingContext2D).letterSpacing = '0px';
    this.flush(out, 2.0);
    return {
      hud: 1,
      flash: pulse(t, this.cuts[i], 0.06) * 0.4 + pulse(t, frozenT, 0.12) * 0.5 + pulse(t, noT, 0.1) * 0.3,
      zoom: 1 + 0.01 * f.a.kick,
      vignette: 0.5,
      bloom: 0.75,
      ca: i === 0 ? 0.22 + prog(t, L[0].words[1].start, this.vEnd(0)) * 1.2 : 0.22,
    };
  }

  drawAutocomplete(t: number) {
    const l = this.lines[1];
    const c = this.ui.begin();
    c.fillStyle = '#101218'; c.fillRect(0, 0, 1200, 800);
    c.strokeStyle = 'rgba(236,233,226,0.5)'; c.lineWidth = 3; c.strokeRect(40, 60, 1120, 110);
    const typed = 'The autocomplete gra';
    const n = Math.floor(clamp((t - l.words[0].start) / Math.max(0.2, l.words[2].start - l.words[0].start)) * typed.length);
    setFont(c, F.mono(400), 52); c.fillStyle = '#ece9e2'; c.fillText(typed.slice(0, n), 70, 135);
    const w = c.measureText(typed.slice(0, n)).width;
    if (Math.floor(t * 2.2) % 2 === 0) { c.fillStyle = '#ffb21e'; c.fillRect(74 + w, 88, 26, 60); }
    const pick = t >= l.words[2].start;
    [['graduates', 0.61], ['gradient', 0.17], ['grammar', 0.09], ['grasps', 0.04]].forEach(([s, p], j) => {
      const y = 200 + j * 120;
      const on = j === 0 && pick;
      c.fillStyle = on ? '#ffb21e' : '#171a22'; c.fillRect(40, y, 760, 104);
      setFont(c, F.mono(on ? 600 : 400), 46); c.fillStyle = on ? '#07080b' : 'rgba(236,233,226,0.85)'; c.fillText(String(s), 70, y + 68);
      c.fillStyle = on ? '#07080b' : 'rgba(139,143,153,1)'; c.fillText((p as number).toFixed(2), 620, y + 68);
    });
    this.ui.end();
    // the cap falls onto the panel on "graduates"
    const drop = prog(t, l.words[2].start - 0.15, l.words[2].start + 0.25, ease.outBounce);
    const base = this.uiMesh.position.clone().add(new THREE.Vector3(1.6, 1.7, 0.2));
    this.cap.position.set(base.x, lerp(base.y + 5, base.y, drop), base.z);
    this.cap.rotation.set(lerp(1.2, 0.25, drop), 0.5 + t * 0.2 * (1 - drop), lerp(-0.6, -0.15, drop));
  }

  updateBooks(t: number, i: number) {
    const l4 = this.lines[4];
    const rowsBy = [1, 3, 5, 9, 15, 25];
    const live = i === 4 || i === 5;
    // row r opens with the word that first needs it; lanes are fixed (centre, then alternating outward)
    const rowT = (r: number) => { const k = rowsBy.findIndex((n) => n > r); return l4.words[Math.min(k, l4.words.length - 1)].start; };
    const laneX = (r: number) => (r === 0 ? 0 : (r % 2 ? -1 : 1) * Math.ceil(r / 2)) * 0.95;
    const per = 90;
    let n = 0;
    const q = new THREE.Quaternion(), ax = new THREE.Vector3(0, 1, 0), tumble = new THREE.Quaternion(), ax2 = new THREE.Vector3(1, 0, 0);
    const lanes = this.lanes; lanes.clear();
    const gold = linCol('#ffb21e', 2), bone = linCol('#ece9e2', 0.5);
    for (let r = 0; r < 25 && n < 2400; r++) {
      const t0 = rowT(r);
      const on = live && t >= t0 - 0.25;
      const xx = laneX(r);
      // the lane is drawn first, by a beam running toward the stack
      if (on) {
        const lp = clamp((t - (t0 - 0.25)) / 0.45);
        const z0 = 60, z1 = 3, zh = lerp(z0, z1, ease.outCubic(lp));
        lanes.seg(xx - 0.45, -2.19, z0, xx - 0.45, -2.19, zh, 1.4, bone[0], bone[1], bone[2], 0.7);
        lanes.seg(xx + 0.45, -2.19, z0, xx + 0.45, -2.19, zh, 1.4, bone[0], bone[1], bone[2], 0.7);
        if (lp < 1) lanes.seg(xx - 0.45, -2.19, zh, xx + 0.45, -2.19, zh, 4, gold[0] * 1.5, gold[1] * 1.5, gold[2] * 1.5, 1);
      }
      for (let b = 0; b < per && n < 2400; b++, n++) {
        if (!on) { this.m4.makeScale(0, 0, 0); this.books.setMatrixAt(n, this.m4); continue; }
        const speed = 7 + 0.25 * rowsBy[Math.min(5, Math.max(0, this.wordIdx(4, t)))];
        const z = 60 - ((t * speed + b * 0.62 + hash(r, 9) * 3) % 58);
        // each book of a new lane drops in, front of the queue first, tumbling and overshooting as it lands
        const bt = t0 + (60 - z) * 0.004 + hash(n, 7) * 0.12;
        const dp = clamp((t - bt) / 0.45);
        if (dp <= 0) { this.m4.makeScale(0, 0, 0); this.books.setMatrixAt(n, this.m4); continue; }
        const land = ease.outBack(dp);
        const w = 0.14 + hash(n, 1) * 0.12, h = 0.55 + hash(n, 2) * 0.35, d = 0.42 + hash(n, 4) * 0.1;
        const into = clamp((z - 2) / 4);
        q.setFromAxisAngle(ax, Math.PI / 2 + (hash(n, 5) - 0.5) * 0.1);
        tumble.setFromAxisAngle(ax2, (1 - dp) * (hash(n, 6) - 0.5) * 6);
        q.multiply(tumble);
        const y = lerp(-2.2 + 6 + hash(n, 8) * 3, -2.2, land);
        this.m4.compose(new THREE.Vector3(lerp(0, xx, into), lerp(0, y, into), z), q, new THREE.Vector3(d * into, h * into, w * into).multiplyScalar(Math.min(1, dp * 1.6)));
        this.books.setMatrixAt(n, this.m4);
      }
    }
    for (; n < 2400; n++) { this.m4.makeScale(0, 0, 0); this.books.setMatrixAt(n, this.m4); }
    this.books.instanceMatrix.needsUpdate = true;
  }

  drawGen(t: number) {
    const l4 = this.lines[4], l5 = this.lines[5];
    const toks: [string, [string, number][]][] = [
      ['The', [['The', 0.34], ['It', 0.21], ['This', 0.12], ['Yes', 0.08]]],
      [' answer', [[' answer', 0.29], [' result', 0.18], [' truth', 0.07], [' data', 0.05]]],
      [' is', [[' is', 0.83], [' was', 0.06], [' seems', 0.04], [' may', 0.02]]],
      [' clearly', [[' clearly', 0.22], [' simply', 0.19], [' likely', 0.11], [' 42', 0.03]]],
      [' correct', [[' correct', 0.41], [' right', 0.2], [' true', 0.12], [' wrong', 0.02]]],
      [',', [[',', 0.52], ['.', 0.31], [' and', 0.09], [' —', 0.03]]],
      [' well', [[' well', 0.33], [' fully', 0.14], [' as', 0.09], [' and', 0.08]]],
      [' sourced', [[' sourced', 0.47], [' known', 0.2], [' tested', 0.08], [' said', 0.03]]],
      [' and', [[' and', 0.61], [',', 0.2], [' but', 0.04], ['.', 0.04]]],
      [' consistent', [[' consistent', 0.38], [' agreed', 0.14], [' cited', 0.09], [' fine', 0.02]]],
      [' with', [[' with', 0.92], [' across', 0.02], [' to', 0.02], [' in', 0.01]]],
      [' the', [[' the', 0.71], [' all', 0.08], [' prior', 0.06], [' my', 0.01]]],
      [' literature', [[' literature', 0.44], [' evidence', 0.21], [' data', 0.1], [' vibes', 0.01]]],
      [' [12]', [[' [12]', 0.27], ['.', 0.25], [' [3]', 0.14], [' (2019)', 0.09]]],
      ['.', [['.', 0.88], [',', 0.04], ['!', 0.02], [' [13]', 0.01]]],
    ];
    const t0 = l4.words[4].start, t1 = l5.end;
    const n = Math.floor(clamp((t - t0) / (t1 - t0)) * toks.length + (t > t0 ? 1 : 0));
    const c = this.gen.begin();
    c.fillStyle = '#0b0c10'; c.fillRect(0, 0, 1600, 900); c.strokeStyle = 'rgba(236,233,226,0.4)'; c.lineWidth = 3; c.strokeRect(2, 2, 1596, 896);
    c.fillStyle = '#16181f'; c.fillRect(0, 0, 1600, 70);
    setFont(c, F.mono(500), 26); c.fillStyle = '#ece9e2'; c.fillText('completion · temperature 0.7 · top-p 1.0', 30, 45);
    setFont(c, F.mono(400), 38); c.fillStyle = '#8b8f99'; c.fillText('Q: Is this claim true?', 60, 150);
    c.fillText('A:', 60, 220);
    let x = 130, y = 220;
    setFont(c, F.mono(500), 38);
    for (let j = 0; j < Math.min(n, toks.length); j++) {
      const [tok, dist] = toks[j];
      const w = c.measureText(tok).width;
      if (x + w > 1540) { x = 60; y += 64; }
      c.fillStyle = `rgba(255,178,30,${0.08 + 0.3 * dist[0][1]})`; c.fillRect(x, y - 40, w, 52);
      c.fillStyle = j === 13 && t > l5.words[l5.words.length - 1].start ? '#ff3b2f' : '#ece9e2';
      c.fillText(tok, x, y);
      if (j === Math.min(n, toks.length) - 1) {
        const bx = Math.min(x, 1100), by = y + 30;
        c.fillStyle = '#101218'; c.fillRect(bx, by, 470, 230); c.strokeStyle = '#ffb21e'; c.lineWidth = 2; c.strokeRect(bx, by, 470, 230);
        dist.forEach(([s, p], q) => {
          setFont(c, F.mono(q === 0 ? 600 : 400), 28); c.fillStyle = q === 0 ? '#ffb21e' : '#8b8f99';
          c.fillText(JSON.stringify(s), bx + 16, by + 48 + q * 48);
          c.fillStyle = q === 0 ? '#ffb21e' : '#474b55'; c.fillRect(bx + 250, by + 28 + q * 48, 140 * p, 24);
          setFont(c, F.mono(400), 24); c.fillStyle = '#ece9e2'; c.fillText(`${Math.round(p * 100)}%`, bx + 400, by + 48 + q * 48);
        });
        setFont(c, F.mono(500), 38);
      }
      x += w;
    }
    // confidence vs truth
    if (t > l5.words[3].start) {
      const k = prog(t, l5.words[3].start, l5.words[3].start + 0.4);
      setFont(c, F.mono(500), 30); c.fillStyle = '#8b8f99'; c.fillText('confidence', 60, 780); c.fillText('grounded', 60, 840);
      c.fillStyle = '#ffb21e'; c.fillRect(300, 755, 900 * 0.99 * k, 30);
      c.fillStyle = '#272a32'; c.fillRect(300, 815, 900, 30);
      c.fillStyle = '#ff3b2f'; c.fillRect(300, 815, 900 * 0.08 * k, 30);
    }
    if (t > l5.words[l5.words.length - 1].start) {
      c.save(); c.translate(1200, 560); c.rotate(-0.12);
      c.strokeStyle = '#ff3b2f'; c.lineWidth = 8; c.strokeRect(-230, -60, 460, 120);
      setFont(c, F.mono(700), 46); c.fillStyle = '#ff3b2f'; c.textAlign = 'center'; c.fillText('[12] NOT FOUND', 0, 16);
      c.restore(); c.textAlign = 'left';
    }
    this.gen.end();
  }

  updateFold(t: number, i: number) {
    const on = i >= 6;
    this.fold.visible = on; this.msaMesh.visible = on; this.pairMesh.visible = on;
    this.tiles.forEach((g) => (g.visible = i === 7));
    if (!on) return;
    const l6 = this.lines[6], l7 = this.lines[7];
    const rs = this.rs, n = rs.length;
    // Evoformer: MSA rows light, pair representation sharpens
    const evo = prog(t, this.cuts[6], l6.words[1].start + 0.2);
    const seq = seqOf(rs);
    const c = this.msa.begin();
    c.fillStyle = 'rgba(12,13,17,0.92)'; c.fillRect(0, 0, 2048, 420);
    setFont(c, F.mono(500), 25);
    for (let r = 0; r < 12; r++) {
      for (let k = 0; k < n; k++) {
        const ch = r === 0 ? seq[k] : hash(r, k) < 0.22 ? 'ACDEFGHIKLMNPQRSTVWY'[Math.floor(hash(k, r, 3) * 20)] : hash(r, k, 5) < 0.06 ? '-' : seq[k];
        const lit = hash(r, k, 9) < evo;
        c.fillStyle = r === 0 ? '#ffb21e' : lit ? 'rgba(236,233,226,0.9)' : 'rgba(236,233,226,0.25)';
        c.fillText(ch, 18 + k * 26.6, 36 + r * 32);
      }
    }
    this.msa.end();
    const pc = this.pair.begin();
    pc.putImageData(contactMap(rs, 512, evo), 0, 0);
    this.pair.end();
    // structure module: 8 iterations from the origin ("residue gas") to the fold
    const sm = prog(t, l6.words[1].start, l6.end + 0.3);
    const it = sm * 8;
    const ca: THREE.Vector3[] = [], side: THREE.Vector3[] = [];
    const q = new THREE.Quaternion();
    for (let k = 0; k < n; k++) {
      const r = rs[k];
      // AlphaFold 2's structure module: every residue frame starts at the origin with the identity rotation
      // ("black-hole initialisation"); 8 shared-weight iterations of invariant point attention move them into place
      const itK = Math.min(8, Math.floor(it)), fr = it - itK;
      const f1 = Math.min(1, (itK + ease.outCubic(fr)) / 8);
      const p = r.CA.clone().multiplyScalar(f1);
      ca.push(p);
      side.push(r.O.clone().sub(r.C));
      const dir = r.C.clone().sub(r.N).normalize();
      q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
      q.slerp(new THREE.Quaternion(), 1 - f1);
      this.m4.compose(p, q, new THREE.Vector3(1, 1, 1).multiplyScalar(0.7 * (1 - prog(sm, 0.7, 0.95))));
      this.frames.setMatrixAt(k, this.m4);
    }
    this.frames.instanceMatrix.needsUpdate = true;
    const cartA = prog(sm, 0.65, 1.0);
    (this.frames.material as THREE.MeshBasicMaterial).color.copy(C('gold', 2.5 * (1 - cartA * 0.8)));
    const geo = cartoon(sm >= 1 ? rs.map((r) => r.CA) : ca, side, rs.map((r) => r.ss), { grow: 1 });
    this.cartoonMesh.geometry.dispose();
    this.cartoonMesh.geometry = geo;
    (this.cartoonMesh.material as THREE.ShaderMaterial).uniforms.uA.value = cartA;
    this.fold.rotation.y = t * 0.35;
    this.fold.rotation.x = 0.3;
    // annotations on the finished fold (residue numbering of 1UBQ)
    this.fold.updateMatrixWorld(true);
    const la = prog(sm, 0.92, 1.0);
    this.foldLabels.forEach(({ s: sp, res: rn, dx, dy }, k) => {
      const r = rs.find((x) => x.n === rn); if (!r) return;
      const wp = this.fold.localToWorld(r.CA.clone());
      sp.visible = la > 0;
      sp.position.copy(wp).add(new THREE.Vector3(dx, dy, 0).applyQuaternion(this.cam.quaternion));
      sp.quaternion.copy(this.cam.quaternion);
      sp.tint(k < 7 ? 1 : 2.4, k < 7 ? 1 : 1.2, k < 7 ? 1 : 0.2, la);
    });
    if (i === 7) {
      const siT = l7.words[0].start, cT = l7.words[2].start;
      this.tiles[0].scale.setScalar(Math.max(0.001, prog(t, siT - 0.1, siT + 0.3, ease.outBack)));
      this.tiles[1].scale.setScalar(Math.max(0.001, prog(t, cT - 0.1, cT + 0.3, ease.outBack)));
      this.tiles.forEach((g) => g.lookAt(this.cam.position));
    }
    void mulberry32;
  }
}
