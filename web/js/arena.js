import { THREE, Swimmer, pose, orient, groundFeet, Q_STAND, genericAvatar } from './swimmer.js';
import { strokeAt, fmtTime, YOU, REC, EVENTS, teamColor } from './core.js';
import { racePlan, makeTrajectory, randomStyle, relayStyle, mergeStyle } from './bio.js';

const LANES = 10, LW = 2.5, PW = LANES * LW;
const DECK = 0.3, DEPTH = 2.0, BLOCK_TOP = 0.74, BLOCK_X = -0.42;
const laneZ = i => -PW / 2 + LW * (i + 0.5);
export const SEED_ORDER = [4, 5, 3, 6, 2, 7, 1, 8, 0, 9];
const STYLE = { L: 'free', C: 'back', P: 'breast', B: 'fly' };
const DPS = { free: 2.15, back: 2.2, breast: 1.75, fly: 2.0 };
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const lerp = (a, b, u) => a + (b - a) * u;
const ease = u => u * u * (3 - 2 * u);

function ctex(w, h, draw, opts = {}) {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const g = cv.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.userData.canvas = cv; return t;
}
function rand(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const SKINS = ['#F5D0B0', '#E5B48F', '#C98E62', '#A86B3C', '#7E4E2C', '#5A3620'];
const NEUTRAL = ['#e9eef5', '#1c2a3a', '#33465c', '#c8d3df', '#56677a', '#8193a8', '#2a3d52'];

const WATER_VS = `uniform float uTime; varying vec3 vW; varying float vH;
void main(){ vec3 p = position; float h = sin(p.x*0.8+uTime*1.7)*0.022 + sin(p.z*1.1-uTime*1.3)*0.018 + sin((p.x-p.z)*2.3+uTime*2.6)*0.008; p.y += h; vH = h;
vec4 w = modelMatrix*vec4(p,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const WATER_FS = `uniform float uTime; uniform vec3 uCam; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; varying vec3 vW; varying float vH;
float caust(vec2 p, float t){ vec2 i = p; float c = 0.0; float inten = 0.006;
 for (int n=0; n<4; n++){ float tt = t*(1.0-(3.5/float(n+1))); i = p + vec2(cos(tt-i.x)+sin(tt+i.y), sin(tt-i.y)+cos(tt+i.x)); c += 1.0/length(vec2(p.x/(sin(i.x+tt)/inten), p.y/(cos(i.y+tt)/inten))); }
 c /= 4.0; c = 1.17 - pow(c, 1.4); return pow(abs(c), 8.0); }
void main(){
 vec3 N = normalize(vec3(-dFdx(vH)*45.0, 1.0, -dFdy(vH)*45.0));
 vec3 V = normalize(uCam - vW);
 float fres = pow(1.0 - max(dot(V, vec3(0.0,1.0,0.0)), 0.0), 4.0);
 float c = caust(mod(vW.xz*0.32, 6.2831*4.0), uTime*0.55);
 vec3 col = mix(uShallow, uDeep, 0.4 + 0.15*sin(vW.x*0.07));
 col += vec3(0.55,0.95,1.0)*clamp(c,0.0,1.0)*0.32;
 col = mix(col, uSky, clamp(fres*0.6, 0.0, 0.5));
 float spec = pow(max(dot(reflect(-V, N), normalize(vec3(0.25,1.0,-0.35))), 0.0), 70.0);
 col += vec3(1.0)*spec*0.55;
 gl_FragColor = vec4(col, 0.66 + fres*0.3);
 #include <tonemapping_fragment>
 #include <colorspace_fragment>
}`;

export class Arena {
  constructor(el, cb = {}) {
    this.el = el; this.cb = cb; this.poolLen = 50; this.x0 = 0; this.mode = 'showcase'; this.camMode = 'tv';
    this.speed = 1; this.t = 0; this.time = 0; this.state = 'idle'; this.paused = false; this.excite = 0.15; this.cubeOn = false;
    this.youCfg = null; this.swimmers = []; this.race = null; this.showRecord = true;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
      r.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none';
    el.appendChild(r.domElement);
    this.overlay = document.createElement('div'); this.overlay.style.cssText = 'position:absolute;inset:0;pointer-events:none;overflow:hidden;font-family:Barlow,system-ui,sans-serif';
    el.appendChild(this.overlay);
    this.scene = new THREE.Scene(); this.scene.background = new THREE.Color('#041226'); this.scene.fog = new THREE.Fog('#041226', 70, 170);
    this.camera = new THREE.PerspectiveCamera(40, 1, 0.1, 500);
    this.camPos = new THREE.Vector3(25, 16, -44); this.camLook = new THREE.Vector3(25, 0, 0);
    this.orbit = { az: -1.2, el: 0.38, r: 40, target: new THREE.Vector3(25, 0, 0) };
    this.buildLights(); this.buildVenue(); this.buildPool(); this.buildCrowd(); this.buildScoreboard(); this.buildParticles(); this.buildHUD();
    this.bindPointer();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el); this.resize();
    this._last = performance.now(); this.active = true;
    const loop = () => { this.raf = requestAnimationFrame(loop); if (!this.active) return; const now = performance.now(); const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now; this.frame(dt); };
    loop();
    this.setShowcase();
  }
  buildLights() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#cdeeff', '#0a1c30', 1.25));
    const d = new THREE.DirectionalLight('#ffffff', 1.9); d.position.set(10, 40, -25); s.add(d);
    const d2 = new THREE.DirectionalLight('#9fe8ff', 0.6); d2.position.set(40, 20, 30); s.add(d2);
  }
  buildVenue() {
    const g = this.venue = new THREE.Group(); this.scene.add(g);
    const tileTex = ctex(256, 256, (c, w, h) => { c.fillStyle = '#c3cfda'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(60,85,110,.35)'; c.lineWidth = 3; c.strokeRect(0, 0, w / 2, h / 2); c.strokeRect(w / 2, 0, w / 2, h / 2); c.strokeRect(0, h / 2, w / 2, h / 2); c.strokeRect(w / 2, h / 2, w / 2, h / 2); }, { repeat: true });
    this.deckMat = new THREE.MeshStandardMaterial({ map: tileTex, roughness: 0.75 });
    const standMat = [new THREE.MeshStandardMaterial({ color: '#0f2740', roughness: 0.85 }), new THREE.MeshStandardMaterial({ color: '#13304d', roughness: 0.85 })];
    for (let r = 0; r < 10; r++) {
      const top = DECK + 1.0 + r * 0.5; const box = new THREE.Mesh(new THREE.BoxGeometry(70, top, 0.95), standMat[r % 2]);
      box.position.set(25, top / 2, 17.9 + r * 0.95 + 0.475); g.add(box);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(74, 16, 0.6), new THREE.MeshStandardMaterial({ color: '#081a2e', roughness: 0.9 }));
    back.position.set(25, 8, 27.8); g.add(back);
    this.ledTex = ctex(2048, 64, (c, w, h) => {
       c.fillStyle = '#04101f'; c.fillRect(0, 0, w, h); c.font = '700 40px "Big Shoulders Display", Impact, sans-serif'; c.textBaseline = 'middle';
      const items = ['RAIA', 'INTERUSP', 'TUSCA', 'NATAÇÃO UNIVERSITÁRIA', '2023 — 2026', 'VISUALIZAÇÃO COMPUTACIONAL'];
      let x = 20; let i = 0; while (x < w) { c.fillStyle = i % 2 ? '#2FE0F0' : '#FFD23F'; const t = items[i % items.length]; c.fillText(t, x, h / 2 + 2); x += c.measureText(t).width + 30; c.fillStyle = '#FF5468'; c.fillText('◆', x, h / 2); x += 50; i++; }
    }, { repeat: true });
    this.ledTex.repeat.set(2, 1);
    const led = new THREE.Mesh(new THREE.PlaneGeometry(70, 0.9), new THREE.MeshBasicMaterial({ map: this.ledTex })); led.position.set(25, DECK + 0.55, 17.79); led.rotation.y = Math.PI; g.add(led);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(70, 1.1, 0.25), new THREE.MeshStandardMaterial({ color: '#0a1d33' })); wall.position.set(25, DECK + 0.55, 17.95); g.add(wall);
    const endWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 14, 50), new THREE.MeshStandardMaterial({ color: '#071629', roughness: 0.9 })); endWall.position.set(-13, 7, 0); g.add(endWall);
    const endWall2 = endWall.clone(); endWall2.position.x = 64; g.add(endWall2);
    const bigTex = ctex(1024, 256, (c, w, h) => { c.fillStyle = '#071629'; c.fillRect(0, 0, w, h); c.font = '900 200px "Big Shoulders Display", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#0f3150'; c.fillText('RAIA', w / 2, h / 2 + 10); });
    const big = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), new THREE.MeshBasicMaterial({ map: bigTex })); big.position.set(-12.65, 6, 0); big.rotation.y = Math.PI / 2; g.add(big);
    const truss = new THREE.MeshStandardMaterial({ color: '#0d2135', roughness: 0.6, metalness: 0.4 });
    const lamp = new THREE.MeshBasicMaterial({ color: '#eaf8ff' });
    const beamMat = new THREE.MeshBasicMaterial({ color: '#bfeaff', transparent: true, opacity: 0.045, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (let x = -4; x <= 56; x += 10) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.5, 44), truss); b.position.set(x, 21, 2); g.add(b);
      for (const z of [-9, 0, 9]) {
        const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.7), lamp); l.position.set(x, 20.7, z); g.add(l);
        if (z !== 0) { const cone = new THREE.Mesh(new THREE.ConeGeometry(4.2, 20.5, 24, 1, true), beamMat); cone.position.set(x, 10.4, z); g.add(cone); }
      }
    }
    this.flags = [];
    for (let i = 0; i < 8; i++) {
      const geo = new THREE.PlaneGeometry(1.6, 1.0, 12, 6); geo.translate(0.8, 0, 0);
      const mat = new THREE.MeshStandardMaterial({ color: '#fff', side: THREE.DoubleSide, roughness: 0.8 });
      const m = new THREE.Mesh(geo, mat); const fx = 2 + i * 6.6, fy = DECK + 3.6 + (i % 3) * 0.9, fz = 19.6 + (i % 3) * 1.6;
      m.position.set(fx, fy, fz); m.rotation.y = Math.PI; g.add(m);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), truss); pole.position.set(fx, fy - 0.6, fz); g.add(pole);
      this.flags.push({ mesh: m, base: Float32Array.from(geo.attributes.position.array), ph: i * 1.7 });
    }
    g.children.filter(o => o.isMesh && o.position.z > 17.4).forEach(o => { const c = o.clone(); c.position.z = -o.position.z; c.rotation.y = -o.rotation.y; g.add(c); });
  }
  buildPool() {
    if (this.pool) { this.scene.remove(this.pool); this.pool.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const L = this.poolLen; this.x0 = (50 - L) / 2; const x0 = this.x0;
    const g = this.pool = new THREE.Group(); this.scene.add(g);
    const shape = new THREE.Shape(); shape.moveTo(-13, -22); shape.lineTo(64, -22); shape.lineTo(64, 18); shape.lineTo(-13, 18); shape.lineTo(-13, -22);
    const hole = new THREE.Path(); hole.moveTo(x0, -PW / 2); hole.lineTo(x0, PW / 2); hole.lineTo(x0 + L, PW / 2); hole.lineTo(x0 + L, -PW / 2); hole.lineTo(x0, -PW / 2); shape.holes.push(hole);
    const deckGeo = new THREE.ShapeGeometry(shape); deckGeo.rotateX(Math.PI / 2);
    const deck = new THREE.Mesh(deckGeo, this.deckMat); deck.position.y = DECK; deck.material.side = THREE.DoubleSide; g.add(deck);
    const px = 1024 / L;
    const floorTex = ctex(1024, Math.round(PW * px), (c, w, h) => {
      c.fillStyle = '#5fb6d3'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(20,90,130,.3)'; c.lineWidth = 1;
      for (let x = 0; x <= w; x += px / 2) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      for (let y = 0; y <= h; y += px / 2) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.fillStyle = '#0b2b4c';
      for (let i = 0; i < LANES; i++) { const yc = (i + 0.5) * LW * px; c.fillRect(2 * px, yc - 0.13 * px, (L - 4) * px, 0.26 * px); c.fillRect(2 * px - 0.13 * px, yc - 0.5 * px, 0.26 * px, px); c.fillRect((L - 2) * px - 0.13 * px, yc - 0.5 * px, 0.26 * px, px); }
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(L, PW), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.6 }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(x0 + L / 2, -DEPTH, 0); g.add(floor);
    const wallMat = new THREE.MeshStandardMaterial({ color: '#7cc9df', roughness: 0.55 });
    const mkWall = (w, x, z, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, DEPTH + DECK), wallMat); m.position.set(x, (DECK - DEPTH) / 2, z); m.rotation.y = ry; g.add(m); };
    mkWall(L, x0 + L / 2, -PW / 2, 0); mkWall(L, x0 + L / 2, PW / 2, Math.PI); mkWall(PW, x0, 0, Math.PI / 2); mkWall(PW, x0 + L, 0, -Math.PI / 2);
    const ul = new THREE.MeshBasicMaterial({ color: '#d9fbff' });
    for (let x = x0 + 2.5; x < x0 + L; x += 5) for (const z of [-PW / 2 + 0.02, PW / 2 - 0.02]) { const m = new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), ul); m.position.set(x, -0.9, z); m.rotation.y = z < 0 ? 0 : Math.PI; g.add(m); }
    const coping = new THREE.MeshStandardMaterial({ color: '#e7eef4', roughness: 0.5 });
    const mkC = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), coping); m.position.set(x, DECK + 0.02, z); g.add(m); };
    mkC(L + 0.8, 0.4, x0 + L / 2, -PW / 2 - 0.2); mkC(L + 0.8, 0.4, x0 + L / 2, PW / 2 + 0.2); mkC(0.4, PW, x0 - 0.2, 0); mkC(0.4, PW, x0 + L + 0.2, 0);
    const pad = new THREE.MeshStandardMaterial({ color: '#141b24', roughness: 0.4 });
   for (let i = 0; i < LANES; i++) for (const x of [x0 + 0.02, x0 + L - 0.02]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.9, 2.2), pad); m.position.set(x, -0.25, laneZ(i)); g.add(m); }
    this.waterMat = new THREE.ShaderMaterial({
       vertexShader: WATER_VS, fragmentShader: WATER_FS, transparent: true, depthWrite: false,
      uniforms: { uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uDeep: { value: new THREE.Color('#054a78') }, uShallow: { value: new THREE.Color('#128bb8') }, uSky: { value: new THREE.Color('#4f7fa6') } }
    });
    const wg = new THREE.PlaneGeometry(L, PW, Math.round(L * 2), 50); wg.rotateX(-Math.PI / 2);
    const water = new THREE.Mesh(wg, this.waterMat); water.position.set(x0 + L / 2, 0, 0); water.renderOrder = 2; g.add(water);
    const floatGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.16, 10); floatGeo.rotateZ(Math.PI / 2);
    const nPer = Math.floor(L / 0.19); const ropes = LANES + 1;
    const ropeMesh = new THREE.InstancedMesh(floatGeo, new THREE.MeshStandardMaterial({ roughness: 0.4 }), nPer * ropes);
    const dm = new THREE.Object3D(); const cR = new THREE.Color('#e63946'), cB = new THREE.Color('#1d4ed8'), cW = new THREE.Color('#f1f5f9'), cY = new THREE.Color('#f5c518');
    let k = 0;
    for (let r = 0; r < ropes; r++) {
      const z = -PW / 2 + r * LW + (r === 0 ? 0.12 : r === ropes - 1 ? -0.12 : 0);
      for (let i = 0; i < nPer; i++) {
        const x = x0 + 0.1 + i * 0.19; dm.position.set(x, 0.02, z); dm.updateMatrix(); ropeMesh.setMatrixAt(k, dm.matrix);
        const dd = Math.min(x - x0, x0 + L - x); const seg = Math.floor(dd / 0.95);
        ropeMesh.setColorAt(k, dd < 5 ? cR : (r === 0 || r === ropes - 1) ? (seg % 2 ? cY : cB) : (seg % 2 ? cW : cB)); k++;
      }
    }
    g.add(ropeMesh); this.ropes = ropeMesh;
    const fl = new THREE.MeshStandardMaterial({ color: '#fff', side: THREE.DoubleSide, vertexColors: true });
    for (const fx of [x0 + 5, x0 + L - 5]) {
      const line = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, PW + 2, 4), new THREE.MeshBasicMaterial({ color: '#0b1220' })); line.rotation.x = Math.PI / 2; line.position.set(fx, 1.9, 0); g.add(line);
      const tri = new THREE.BufferGeometry(); const pos = [], col = [];
      for (let z = -PW / 2 - 0.8; z < PW / 2 + 0.8; z += 0.36) { pos.push(fx, 1.9, z, fx, 1.9, z + 0.3, fx, 1.55, z + 0.15); const c = [cR, cW, cB][Math.round((z + 20) / 0.36) % 3]; for (let q = 0; q < 3; q++) col.push(c.r, c.g, c.b); }
      tri.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); tri.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); tri.computeVertexNormals();
      g.add(new THREE.Mesh(tri, fl));
    }
    const bodyM = new THREE.MeshStandardMaterial({ color: '#d9e2ea', roughness: 0.5 }); const topM = new THREE.MeshStandardMaterial({ color: '#1b2633', roughness: 0.9 });
    for (let i = 0; i < LANES; i++) {
       const num = ctex(128, 128, (c, w, h) => { c.fillStyle = '#0b1b2e'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffffff'; c.font = '900 96px "Big Shoulders Display", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(i), w / 2, h / 2 + 6); });
      const nm = new THREE.MeshStandardMaterial({ map: num, roughness: 0.6 });
      const h = BLOCK_TOP - DECK;
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.56), [nm, nm, bodyM, bodyM, nm, nm]); b.position.set(x0 + BLOCK_X - 0.02, DECK + h / 2, laneZ(i)); g.add(b);
      const tp = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.6), topM); tp.position.set(x0 + BLOCK_X, BLOCK_TOP, laneZ(i)); tp.rotation.z = -0.12; g.add(tp);
      const b2 = b.clone(); b2.position.x = x0 + this.poolLen - BLOCK_X + 0.02; g.add(b2); const tp2 = tp.clone(); tp2.position.x = x0 + this.poolLen - BLOCK_X; tp2.rotation.z = 0.12; g.add(tp2);
    }
    const rl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, PW), new THREE.MeshBasicMaterial({ color: REC, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
    rl.position.set(x0, 0.05, 0); rl.visible = false; rl.renderOrder = 3; g.add(rl); this.recordLine = rl;
    const padM = new THREE.MeshStandardMaterial({ color: '#f2c94c', roughness: 0.45 }); const padG = new THREE.BoxGeometry(0.04, 0.9, LW - 0.35);
    for (let i = 0; i < LANES; i++) [x0 + 0.03, x0 + L - 0.03].forEach(px => { const p = new THREE.Mesh(padG, padM); p.position.set(px, -0.28, laneZ(i)); g.add(p); });
    const stM = new THREE.MeshStandardMaterial({ color: '#d7dee6', metalness: 0.9, roughness: 0.2 }); const rG = new THREE.TorusGeometry(0.45, 0.025, 8, 20, Math.PI);
    [[x0 + 1.4, -PW / 2], [x0 + L - 1.4, PW / 2], [x0 + L - 1.4, -PW / 2], [x0 + 1.4, PW / 2]].forEach(([px, pz]) => [-0.25, 0.25].forEach(o => { const r = new THREE.Mesh(rG, stM); r.position.set(px + o, DECK, pz); r.rotation.y = Math.PI / 2; r.rotation.z = Math.PI / 2 * 0; g.add(r); }));
    const numTex = n => ctex(128, 128, (c, w, h) => { c.fillStyle = '#123b63'; c.font = '900 110px "Big Shoulders Display", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(String(n), w / 2, h / 2 + 6); });
    for (let i = 0; i < LANES; i++) { const p = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: numTex(i), transparent: true, opacity: 0.55, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.rotation.z = -Math.PI / 2; p.position.set(x0 + 2.2, -DEPTH + 0.04, laneZ(i)); g.add(p); }
    const cTex = ctex(512, 512, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(190,240,255,.55)'; c.lineWidth = 3; for (let k = 0; k < 70; k++) { c.beginPath(); let x = Math.random() * w, y = Math.random() * h; c.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 90; y += (Math.random() - 0.5) * 90; c.quadraticCurveTo(x + 20, y - 20, x, y); } c.stroke(); } });
    cTex.wrapS = cTex.wrapT = THREE.RepeatWrapping; cTex.repeat.set(L / 5, PW / 5); this.caustic = cTex;
    const caus = new THREE.Mesh(new THREE.PlaneGeometry(L - 0.1, PW - 0.1), new THREE.MeshBasicMaterial({ map: cTex, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false }));
    caus.rotation.x = -Math.PI / 2; caus.position.set(x0 + L / 2, -DEPTH + 0.05, 0); g.add(caus);
    const SP = ['RAIA', 'INTERUSP', 'TUSCA', 'ICMC · USP', 'SCC5836', 'VISUALIZAÇÃO', 'BORA, TIME!', 'ÁGUA • DADOS', 'NADA QUE NADA', 'SPLASH'];
    const spTex = (t, k) => ctex(512, 96, (c, w, h) => { c.fillStyle = k % 2 ? '#0B3D91' : '#041226'; c.fillRect(0, 0, w, h); c.fillStyle = k % 3 === 0 ? '#FFD23F' : '#eaf6ff'; c.font = '900 62px "Big Shoulders Display", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, w / 2, h / 2 + 3); c.fillStyle = '#2FE0F0'; c.fillRect(0, h - 8, w, 8); });
     let kk = 0; for (let px = x0 + 3; px < x0 + L - 3; px += 6.2) [-1, 1].forEach(sd => { const b = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.85, 0.08), new THREE.MeshStandardMaterial({ map: spTex(SP[kk % SP.length], kk), roughness: 0.6 })); b.position.set(px + 2.8, DECK + 0.45, sd * (PW / 2 + 2.6)); b.rotation.y = sd > 0 ? Math.PI : 0; g.add(b); kk++; });
    const dial = new THREE.Mesh(new THREE.CircleGeometry(1.2, 40), new THREE.MeshBasicMaterial({ map: ctex(256, 256, (c, w, h) => { c.fillStyle = '#f4f7fb'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); c.fill(); c.lineWidth = 10; c.strokeStyle = '#041226'; c.stroke(); c.fillStyle = '#041226'; c.font = '700 26px JetBrains Mono, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let k = 0; k < 12; k++) { const an = k / 12 * Math.PI * 2 - Math.PI / 2; c.fillText(String(k * 5 || 60), w / 2 + Math.cos(an) * 92, h / 2 + Math.sin(an) * 92); } }) }));
    dial.position.set(x0 + L + 1.4, 2.6, -PW / 2 - 1.2); dial.rotation.y = -Math.PI / 2 + 0.5; g.add(dial);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.02), new THREE.MeshBasicMaterial({ color: '#FF5468' })); hand.geometry.translate(0, 0.45, 0.01); hand.position.copy(dial.position); hand.rotation.y = dial.rotation.y; g.add(hand); this.paceHand = hand;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4, 10), stM); post.position.set(dial.position.x, 1.2, dial.position.z); g.add(post);
    const fig = (px, pz, shirt, ry = 0) => { const gg = new THREE.Group(); const b = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.55, 4, 10), new THREE.MeshStandardMaterial({ color: shirt, roughness: 0.7 })); b.position.y = 1.05; gg.add(b); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 10), new THREE.MeshStandardMaterial({ color: SKINS[(px * 7 | 0) % SKINS.length], roughness: 0.6 })); hd.position.y = 1.62; gg.add(hd); const lg = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.55, 4, 8), new THREE.MeshStandardMaterial({ color: '#1c2a3a' })); lg.position.y = 0.45; lg.scale.x = 1.7; gg.add(lg); const cp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshStandardMaterial({ color: shirt === '#f4f7fb' ? '#0B3D91' : '#f4f7fb' })); cp.position.y = 1.66; gg.add(cp); const vz = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.14), cp.material); vz.position.set(0.16, 1.66, 0); gg.add(vz); const ar = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.45, 3, 6), b.material); ar.position.set(0.12, 1.25, 0.24); ar.rotation.x = -0.9; gg.add(ar); const fl = new THREE.Mesh(new THREE.PlaneGeometry(0.32, 0.22), new THREE.MeshStandardMaterial({ color: '#FF5468', side: THREE.DoubleSide })); fl.position.set(0.18, 1.6, 0.52); gg.add(fl); gg.userData.arm = ar; gg.position.set(px, DECK, pz); gg.rotation.y = ry; g.add(gg); return gg; };
    const pod = new THREE.Mesh(new THREE.BoxGeometry(1, 0.8, 1), new THREE.MeshStandardMaterial({ color: '#0B3D91' })); pod.position.set(x0 - 3.6, DECK + 0.4, -PW / 2 - 2.6); g.add(pod); const starter = fig(x0 - 3.6, -PW / 2 - 2.6, '#f4f7fb', 0.9); starter.position.y = DECK + 0.8;
    this.officials = [starter, fig(x0 - 2.6, -PW / 2 - 1.1, '#f4f7fb', 0.6), fig(x0 - 2.6, PW / 2 + 1.1, '#f4f7fb', -0.6), fig(x0 + L + 2.2, PW / 2 + 1.2, '#FF5468', Math.PI + 0.5)];
    const benchM = new THREE.MeshStandardMaterial({ color: '#8193a8', roughness: 0.7 }); [-1, 1].forEach(sd => { const bn = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.42, 7.2), benchM); bn.position.set(x0 - 4.6, DECK + 0.21, sd * 6.5); g.add(bn); for (let k = 0; k < 4; k++) { const tw = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.05, 0.7), new THREE.MeshStandardMaterial({ color: ['#FF5468', '#2FE0F0', '#FFD23F', '#f4f7fb'][k], roughness: 0.95 })); tw.position.set(x0 - 4.6, DECK + 0.45, sd * 6.5 - 2.7 + k * 1.8); g.add(tw); } });
    const lc = new THREE.Group(); [[-0.4, -0.4], [0.4, -0.4], [-0.4, 0.4], [0.4, 0.4]].forEach(([dx, dz]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 6), new THREE.MeshStandardMaterial({ color: '#f4f7fb' })); l.position.set(dx, 1.1, dz); lc.add(l); }); const seat = new THREE.Mesh(new THREE.BoxGeometry(1, 0.1, 1), new THREE.MeshStandardMaterial({ color: '#FF5468' })); seat.position.y = 2.2; lc.add(seat); lc.position.set(x0 + L / 2, DECK, -PW / 2 - 1.6); g.add(lc);
    const plant = (px, pz) => { const pt = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.6, 14), new THREE.MeshStandardMaterial({ color: '#c3cfda' })); pt.position.set(px, DECK + 0.3, pz); g.add(pt); for (let k = 0; k < 5; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), new THREE.MeshStandardMaterial({ color: k % 2 ? '#2f8f5b' : '#3fae6f', roughness: 0.8 })); lf.position.set(px + Math.cos(k * 1.3) * 0.22, DECK + 0.85 + (k % 3) * 0.18, pz + Math.sin(k * 1.3) * 0.22); g.add(lf); } };
    plant(x0 - 3.2, -PW / 2 - 3); plant(x0 - 3.2, PW / 2 + 3); plant(x0 + L + 3, PW / 2 + 3); plant(x0 + L + 3, -PW / 2 - 3);
    const camRig = (px, pz) => { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), stM); t.position.set(px, DECK + 0.8, pz); g.add(t); const bx = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.3), new THREE.MeshStandardMaterial({ color: '#111827' })); bx.position.set(px, DECK + 1.7, pz); g.add(bx); const ln = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.25, 12).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#0d1117', metalness: 0.6, roughness: 0.3 })); ln.position.set(px - 0.35 * Math.sign(px - 25), DECK + 1.7, pz); g.add(ln); };
    camRig(x0 + L + 2.6, -PW / 2 - 2.4); camRig(x0 - 2.6, PW / 2 + 3.6);
    const far = -1; const zF = far * (PW / 2 + 4.2);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(6, 0.8, 1.1), new THREE.MeshStandardMaterial({ color: '#0B3D91', roughness: 0.6 })); desk.position.set(x0 + L / 2, DECK + 0.4, zF); g.add(desk);
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.06, 1.3), new THREE.MeshStandardMaterial({ color: '#eaf6ff' })); deskTop.position.set(x0 + L / 2, DECK + 0.83, zF); g.add(deskTop);
    for (let k = 0; k < 4; k++) { const mon = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.05), new THREE.MeshBasicMaterial({ color: k % 2 ? '#2FE0F0' : '#FFD23F' })); mon.position.set(x0 + L / 2 - 2.2 + k * 1.45, DECK + 1.1, zF + 0.3); mon.rotation.y = Math.PI; g.add(mon); }
    [-1, 1].forEach(o => { const fg = fig(x0 + L / 2 + o * 1.6, zF - 1.1, '#2FE0F0', 0); fg.rotation.y = 0; });
    const umb = (px, pz, col) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 6), stM); p.position.set(px, DECK + 1.2, pz); g.add(p); const cn = new THREE.Mesh(new THREE.ConeGeometry(1.2, 0.5, 8, 1, true), new THREE.MeshStandardMaterial({ color: col, side: THREE.DoubleSide, roughness: 0.7 })); cn.position.set(px, DECK + 2.5, pz); g.add(cn); };
    umb(x0 + 6, zF - 0.6, '#FF5468'); umb(x0 + L - 6, zF - 0.6, '#FFD23F');
    const cool = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), new THREE.MeshStandardMaterial({ color: '#2FE0F0', roughness: 0.4 })); cool.position.set(x0 + 9, DECK + 0.25, zF + 0.8); g.add(cool);
    for (let k = 0; k < 6; k++) { const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 10), new THREE.MeshStandardMaterial({ color: '#ff8a00' })); cone.position.set(x0 + 3 + k * (L - 6) / 5, DECK + 0.21, -PW / 2 - 1.7); g.add(cone); }
    const pts = []; for (let px = x0 - 2; px <= x0 + L + 2; px += 1.4) pts.push(px);
    const flagG = new THREE.ConeGeometry(0.22, 0.42, 3); pts.forEach((px, k) => { const fl = new THREE.Mesh(flagG, new THREE.MeshStandardMaterial({ color: ['#FF5468', '#FFD23F', '#2FE0F0', '#f4f7fb', '#009E73'][k % 5], side: THREE.DoubleSide })); fl.position.set(px, 4.2 - 0.25 * Math.sin(k / pts.length * Math.PI), zF + 0.2); fl.rotation.x = Math.PI; g.add(fl); });
    const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, L + 4, 6).rotateZ(Math.PI / 2), stM); rope.position.set(x0 + L / 2, 4.42, zF + 0.2); g.add(rope);
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.9), new THREE.MeshBasicMaterial({ map: ctex(768, 250, (c, w, h) => { c.fillStyle = '#041226'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFD23F'; c.font = '900 96px "Big Shoulders Display", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('INTERUSP · TUSCA', w / 2, h * 0.42); c.fillStyle = '#2FE0F0'; c.font = '700 40px JetBrains Mono, monospace'; c.fillText('2023 — 2026', w / 2, h * 0.8); }) }));
    lb.position.set(x0 + L / 2, 2.7, zF - 1.3); g.add(lb);
    const spk = ctex(512, 512, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); for (let k = 0; k < 900; k++) { const x = Math.random() * w, y = Math.random() * h, r = Math.random() * 1.6 + 0.4; const gr = c.createRadialGradient(x, y, 0, x, y, r * 3); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(x - r * 3, y - r * 3, r * 6, r * 6); } });
    spk.wrapS = spk.wrapT = THREE.RepeatWrapping; spk.repeat.set(L / 6, PW / 6); this.sparkle = spk;
    this.sparkleMat = new THREE.MeshBasicMaterial({ map: spk, transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false });
    const spm = new THREE.Mesh(new THREE.PlaneGeometry(L, PW), this.sparkleMat); spm.rotation.x = -Math.PI / 2; spm.position.set(x0 + L / 2, 0.035, 0); spm.renderOrder = 4; g.add(spm);
    const m15 = new THREE.MeshStandardMaterial({ color: '#FF5468', emissive: '#ff2244', emissiveIntensity: 0.35, roughness: 0.5 });
    const fGeo = new THREE.CylinderGeometry(0.075, 0.075, 1.0, 12).rotateZ(Math.PI / 2); const pGeo = new THREE.BoxGeometry(0.22, 0.03, 1.1);
    [15, L - 15].forEach(xd => { if (xd <= 0 || xd >= L) return;
      for (let k = 1; k < LANES; k++) { const f = new THREE.Mesh(fGeo, m15); f.position.set(x0 + xd, 0.05, -PW / 2 + LW * k); g.add(f); }
      [-1, 1].forEach(sd => { const p = new THREE.Mesh(pGeo, m15); p.position.set(x0 + xd, DECK + 0.02, sd * (PW / 2 + 0.75)); g.add(p); });
    });
  }
  buildCrowd() {
    const R = rand(77); const ps = [];
    for (const sd of [1, -1]) for (let r = 0; r < 10; r++) {
      const y = DECK + 1.0 + r * 0.5; const z = sd * (18.2 + r * 0.95);
      for (let x = -7; x <= 57; x += 0.6) {
        if (((x + 7) % 16) < 0.9) continue; if (R() < 0.1) continue;
        ps.push({ x: x + (R() - 0.5) * 0.14, y, z: z + 0.1 * sd, ph: R() * 6.283, h: 0.88 + R() * 0.24, sk: SKINS[Math.floor(R() * SKINS.length)], sh: NEUTRAL[Math.floor(R() * NEUTRAL.length)], team: -1, r: R() });
      }
    }
    this.crowd = ps; const N = ps.length;
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.85 });
    this.cTorso = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.17, 0.3, 3, 8), mat, N);
    this.cHead = new THREE.InstancedMesh(new THREE.SphereGeometry(0.11, 10, 8), mat.clone(), N);
    this.cArm = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.045, 0.36, 2, 6), mat.clone(), N * 2);
    const c = new THREE.Color();
    ps.forEach((p, i) => { this.cTorso.setColorAt(i, c.set(p.sh)); this.cHead.setColorAt(i, c.set(p.sk)); this.cArm.setColorAt(2 * i, c.set(p.sk)); this.cArm.setColorAt(2 * i + 1, c.set(p.sk)); });
    for (const m of [this.cTorso, this.cHead, this.cArm]) { m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.scene.add(m); m.frustumCulled = false; }
    this.dummy = new THREE.Object3D(); this.ola = { on: false, x: -10, next: 4 };
  }
  setCrowdTeams(teams) {
    const c = new THREE.Color(); const n = teams.length;
    this.crowd.forEach((p, i) => {
       if (!n) { p.team = -1; this.cTorso.setColorAt(i, c.set(p.sh)); return; }
      const sec = Math.min(n - 1, Math.floor(((p.x + 7) / 64) * n));
      if (p.r < 0.72) { p.team = sec; this.cTorso.setColorAt(i, c.set(teams[sec].color)); } else { p.team = -1; this.cTorso.setColorAt(i, c.set(p.sh)); }
    });
    this.cTorso.instanceColor.needsUpdate = true;
    this.crowdTeams = teams;
    this.flags.forEach((f, i) => {
      const t = teams.length ? teams[Math.min(teams.length - 1, Math.floor((i / this.flags.length) * teams.length))] : { team: 'RAIA', color: i % 2 ? '#2FE0F0' : '#FFD23F' };
      const tx = ctex(256, 160, (g, w, h) => { g.fillStyle = t.color; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,.22)'; g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = '#06101d'; g.font = '900 64px "Big Shoulders Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText((t.team || '').slice(0, 9), w / 2, h * 0.42); });
      if (f.mesh.material.map) f.mesh.material.map.dispose(); f.mesh.material.map = tx; f.mesh.material.needsUpdate = true;
    });
  }
  buildScoreboard() {
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 512; this.sbCanvas = cv;
    this.sbTex = new THREE.CanvasTexture(cv); this.sbTex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(18, 9), new THREE.MeshBasicMaterial({ map: this.sbTex }));
    m.position.set(25, 15.5, 27.45); m.rotation.y = Math.PI; this.scene.add(m);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(18.6, 9.6, 0.3), new THREE.MeshStandardMaterial({ color: '#0b1726', metalness: 0.5, roughness: 0.4 })); frame.position.set(25, 15.5, 27.65); this.scene.add(frame);
    this.drawScoreboard();
  }
  drawScoreboard() {
    const g = this.sbCanvas.getContext('2d'), w = 1024, h = 512;
    g.fillStyle = '#020b18'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#0b2a44'; g.fillRect(0, 0, w, 74);
    g.font = '800 44px "Big Shoulders Display", Impact, sans-serif'; g.fillStyle = '#2FE0F0'; g.textBaseline = 'middle';
    const R = this.race;
    if (!R) {
      g.fillText('RAIA ARENA', 28, 38); g.fillStyle = '#FFD23F'; g.textAlign = 'right'; g.fillText('INTERUSP · TUSCA', w - 28, 38); g.textAlign = 'left';
      g.fillStyle = '#eaf6ff'; g.font = '900 150px "Big Shoulders Display", Impact, sans-serif'; g.fillText('RAIA', 28, 220);
      g.font = '600 38px "JetBrains Mono", monospace'; g.fillStyle = '#8db3cf'; g.fillText('crie seu nadador · dispute · analise', 32, 330);
    } else {
      g.fillText(R.spec.title.toUpperCase().slice(0, 40), 28, 38);
      g.textAlign = 'right'; g.fillStyle = '#FFD23F'; g.font = '700 46px "JetBrains Mono", monospace'; g.fillText(fmtTime(Math.max(0, Math.min(this.t, R.Tmax))), w - 28, 38); g.textAlign = 'left';
      const rows = this.standings();
      const rh = 42; g.font = '600 30px "JetBrains Mono", monospace';
      rows.slice(0, 10).forEach((s, i) => {
        const y = 96 + i * rh;
        if (s.isYou) { g.fillStyle = 'rgba(255,210,63,.16)'; g.fillRect(16, y - 4, w - 32, rh - 4); }
        g.fillStyle = s.color; g.fillRect(20, y, 10, rh - 12);
        g.fillStyle = '#8db3cf'; g.fillText(String(s.lane), 44, y + 15);
        g.fillStyle = s.isYou ? '#FFD23F' : '#eaf6ff'; g.fillText(s.short.slice(0, 22), 90, y + 15);
        g.fillStyle = '#8db3cf'; g.fillText(s.team.slice(0, 12), 560, y + 15);
        g.textAlign = 'right'; g.fillStyle = s.done ? (s.place === 1 ? '#FFD23F' : '#eaf6ff') : '#56708a'; g.fillText(s.done ? `${s.place}º ${fmtTime(s.T)}` : `${s.d.toFixed(0)} m`, w - 30, y + 15); g.textAlign = 'left';
      });
    }
    this.sbTex.needsUpdate = true;
  }
  buildParticles() {
    const N = 900; const geo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(N * 3); this.pCol = new Float32Array(N * 3); this.pVel = new Float32Array(N * 3); this.pLife = new Float32Array(N); this.pN = N; this.pI = 0;
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    const spr = ctex(64, 64, (c, w, h) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const m = new THREE.PointsMaterial({ size: 0.22, map: spr, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    this.points = new THREE.Points(geo, m); this.points.frustumCulled = false; this.points.renderOrder = 4; this.scene.add(this.points);
    this.foamTex = ctex(128, 64, (c, w, h) => { const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,.0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); const g2 = c.createLinearGradient(0, 0, 0, h); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); c.globalCompositeOperation = 'destination-out'; c.fillStyle = g2; c.fillRect(0, 0, w, h); });
  }
  emit(x, y, z, n, spread = 1, up = 2.2) {
    for (let k = 0; k < n; k++) {
      const i = this.pI = (this.pI + 1) % this.pN;
      this.pPos[3 * i] = x + (Math.random() - 0.5) * 0.4 * spread; this.pPos[3 * i + 1] = y; this.pPos[3 * i + 2] = z + (Math.random() - 0.5) * 0.4 * spread;
      this.pVel[3 * i] = (Math.random() - 0.5) * 1.6 * spread; this.pVel[3 * i + 1] = up * (0.4 + Math.random() * 0.8); this.pVel[3 * i + 2] = (Math.random() - 0.5) * 1.6 * spread;
      this.pLife[i] = 0.55 + Math.random() * 0.45;
    }
  }
  updateParticles(dt) {
    for (let i = 0; i < this.pN; i++) {
      if (this.pLife[i] <= 0) { this.pCol[3 * i] = this.pCol[3 * i + 1] = this.pCol[3 * i + 2] = 0; continue; }
      this.pLife[i] -= dt; this.pVel[3 * i + 1] -= 9.8 * dt;
      this.pPos[3 * i] += this.pVel[3 * i] * dt; this.pPos[3 * i + 1] = Math.max(0.0, this.pPos[3 * i + 1] + this.pVel[3 * i + 1] * dt); this.pPos[3 * i + 2] += this.pVel[3 * i + 2] * dt;
      const a = Math.max(0, this.pLife[i]) * 0.9; this.pCol[3 * i] = a * 0.85; this.pCol[3 * i + 1] = a * 0.97; this.pCol[3 * i + 2] = a;
    }
    this.points.geometry.attributes.position.needsUpdate = true; this.points.geometry.attributes.color.needsUpdate = true;
  }
  buildHUD() {
    const o = this.overlay;
    o.innerHTML = `
    <div data-h="top" style="position:absolute;left:20px;top:18px;display:none;align-items:stretch;gap:0;box-shadow:0 8px 30px rgba(0,0,0,.35)">
      <div style="background:#FFD23F;color:#041226;font:800 13px/1 'Big Shoulders Display',sans-serif;letter-spacing:.14em;padding:10px 12px;display:flex;align-items:center">RAIA</div>
      <div data-h="title" style="background:rgba(4,18,38,.92);color:#eaf6ff;font:700 18px/1 'Big Shoulders Display',sans-serif;letter-spacing:.06em;padding:10px 14px;display:flex;align-items:center;text-transform:uppercase"></div>
      <div data-h="clock" style="background:#0b2a44;color:#2FE0F0;font:600 22px/1 'JetBrains Mono',monospace;padding:8px 14px;min-width:96px;text-align:right;display:flex;align-items:center;justify-content:flex-end">0.00</div>
    </div>
    <div data-h="flash" style="position:absolute;left:50%;top:22%;transform:translate(-50%,-50%);font:900 clamp(28px,4.6vw,64px)/1 'Big Shoulders Display',sans-serif;letter-spacing:.04em;color:#eaf6ff;text-shadow:0 6px 40px rgba(0,0,0,.6);opacity:0;transition:opacity .25s;white-space:nowrap;text-align:center"></div>
    <div data-h="board" style="position:absolute;right:16px;top:18px;width:min(300px,42vw);display:none;flex-direction:column;gap:2px;font:500 12px/1.2 'JetBrains Mono',monospace;pointer-events:auto"></div>
    <div data-h="tags"></div>`;
    this.h = {}; o.querySelectorAll('[data-h]').forEach(e => { this.h[e.dataset.h] = e; });
    this.h.board.addEventListener('click', e => { const r = e.target.closest('[data-lane]'); if (r && this.cb.onPick) this.cb.onPick(+r.dataset.lane); });
    this.tagEls = [];
  }
  flash(text, color = '#eaf6ff', ms = 1100) {
    const f = this.h.flash; f.textContent = text; f.style.color = color; f.style.opacity = '1';
    clearTimeout(this._fl); this._fl = setTimeout(() => { f.style.opacity = '0'; }, ms);
  }
  bindPointer() {
    const cv = this.renderer.domElement; let down = false, lx = 0, ly = 0;
    cv.addEventListener('pointerdown', e => { down = true; lx = e.clientX; ly = e.clientY; cv.setPointerCapture(e.pointerId); if (!this.cubeOn && this.mode === 'race' && this.camMode !== 'livre' && this.camMode !== 'voce') { this.orbitFromCamera(); this.setCamera('livre'); this.cb.onCamera && this.cb.onCamera('livre'); } });
      cv.addEventListener('pointermove', e => {
        if (!down) return; const dx = e.clientX - lx, dy = e.clientY - ly; lx = e.clientX; ly = e.clientY;
      if (!this.cubeOn && this.camMode === 'voce') { const f = this.follow3 = this.follow3 || { az: 0, el: 0.35, r: 7.6 }; f.az -= dx * 0.006; f.el = clamp(f.el + dy * 0.004, 0.06, 1.35); return; }
      const o = this.cubeOn ? this.cubeOrbit : this.orbit; if (!o) return;
      o.az -= dx * 0.006; o.el = clamp(o.el + dy * 0.004, 0.05, 1.45);
    });
    cv.addEventListener('pointerup', () => { down = false; });
    cv.addEventListener('wheel', e => { if (!this.cubeOn && this.camMode === 'voce') { e.preventDefault(); const f = this.follow3 = this.follow3 || { az: 0, el: 0.35, r: 7.6 }; f.r = clamp(f.r * (1 + e.deltaY * 0.001), 3, 30); } }, { passive: false });
    cv.addEventListener('wheel', e => { const o = this.cubeOn ? this.cubeOrbit : this.orbit; if (!o || (!this.cubeOn && this.camMode !== 'livre')) return; e.preventDefault(); o.r = clamp(o.r * (1 + e.deltaY * 0.001), 8, 90); }, { passive: false });
  }
  orbitFromCamera() {
    const t = this.camLook.clone(); const d = this.camera.position.clone().sub(t); const r = d.length();
    this.orbit = { az: Math.atan2(d.x, d.z), el: Math.asin(clamp(d.y / r, -1, 1)), r, target: t };
  }
  resize() { const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); if (this.cube) { this.cube.camera.aspect = w / h; this.cube.camera.updateProjectionMatrix(); } }
  setActive(v) { this.active = v; if (v) { this._last = performance.now(); this.resize(); } }
  setCamera(m) { this.camMode = m; }
  setSpeed(s) { this.speed = s; }
  setMood(m) {
    if (!this._moodBase) { const L = []; this.scene.traverse(o => { if (o.isLight) L.push({ o, i: o.intensity, c: o.color.clone(), g: o.groundColor ? o.groundColor.clone() : null }); }); const u = this.waterMat && this.waterMat.uniforms; this._moodBase = { L, bg: this.scene.background.clone(), fog: this.scene.fog ? this.scene.fog.color.clone() : null, exp: this.renderer.toneMappingExposure, deep: u && u.uDeep ? u.uDeep.value.clone() : null, sh: u && u.uShallow ? u.uShallow.value.clone() : null }; }
    const B = this._moodBase; const C = c => new THREE.Color(c); const u = this.waterMat && this.waterMat.uniforms;
    const cfg = { final: { k: 1, exp: 1 }, dia: { k: 1.45, exp: 1.25, bg: '#16395c', tint: '#fff6e8' }, neon: { k: 0.9, exp: 1.05, bg: '#10031f', tint: '#ff6ad5', tint2: '#2fe0f0', deep: '#1a0b4a', sh: '#00d5ff' } }[m] || { k: 1, exp: 1 };
    B.L.forEach((l, i) => { l.o.intensity = l.i * cfg.k; l.o.color.copy(cfg.tint ? C(i % 2 && cfg.tint2 ? cfg.tint2 : cfg.tint).lerp(l.c, m === 'dia' ? 0.6 : 0.25) : l.c); if (l.g) l.o.groundColor.copy(m === 'neon' ? C('#1a0033') : l.g); });
    this.scene.background.copy(cfg.bg ? C(cfg.bg) : B.bg); if (this.scene.fog && B.fog) this.scene.fog.color.copy(cfg.bg ? C(cfg.bg) : B.fog);
    this.renderer.toneMappingExposure = (B.exp || 1) * cfg.exp;
    if (u && B.deep) { u.uDeep.value.copy(cfg.deep ? C(cfg.deep) : B.deep); u.uShallow.value.copy(cfg.sh ? C(cfg.sh) : B.sh); }
  }
  setCrowd(g) { this.crowdGain = g; }
  mkBlob() {
    if (!this._blobTex) this._blobTex = ctex(128, 128, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,10,25,.55)'); gr.addColorStop(1, 'rgba(0,10,25,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this._blobTex, transparent: true, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.renderOrder = 1; this.scene.add(m); return m;
  }
  perf(dt) {
    this._fa = (this._fa || 0.016) * 0.95 + dt * 0.05; const r = this.renderer; if (!r || !r.getPixelRatio) return;
    const pr = r.getPixelRatio(); const now = performance.now(); if (now - (this._pt || 0) < 2500) return; this._pt = now;
    if (this._fa > 0.026 && pr > 1) { r.setPixelRatio(Math.max(1, pr - 0.25)); this.resize(); }
    else if (this._fa < 0.015 && pr < Math.min(2, window.devicePixelRatio || 1)) { r.setPixelRatio(Math.min(2, pr + 0.25)); this.resize(); }
  }
  buildBubbles() {
    const N = 1400; const geo = new THREE.BufferGeometry(); this.bP = new Float32Array(N * 3); this.bV = new Float32Array(N); this.bL = new Float32Array(N); this.bN = N; this.bI = 0;
    for (let i = 0; i < N; i++) this.bP[i * 3 + 1] = -99;
    geo.setAttribute('position', new THREE.BufferAttribute(this.bP, 3));
    const tex = ctex(64, 64, (c, w, h) => { const gr = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.62, 'rgba(230,250,255,.35)'); gr.addColorStop(0.82, 'rgba(255,255,255,.95)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); });
    this.bubbles = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.075, map: tex, transparent: true, depthWrite: false, opacity: 0.9, sizeAttenuation: true })); this.bubbles.frustumCulled = false; this.scene.add(this.bubbles);
    const rt = ctex(128, 128, (c, w, h) => { c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 5; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 6, 0, Math.PI * 2); c.stroke(); });
    this.rings = []; this.ringI = 0; for (let k = 0; k < 40; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: rt, transparent: true, opacity: 0, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.renderOrder = 5; this.scene.add(m); this.rings.push({ m, life: 0 }); }
  }
  bubble(x, y, z, n = 3, spread = 0.25) { if (!this.bP) return; for (let k = 0; k < n; k++) { const i = this.bI = (this.bI + 1) % this.bN; this.bP[i * 3] = x + (Math.random() - 0.5) * spread; this.bP[i * 3 + 1] = Math.min(-0.05, y + (Math.random() - 0.5) * 0.2); this.bP[i * 3 + 2] = z + (Math.random() - 0.5) * spread; this.bV[i] = 0.35 + Math.random() * 0.6; this.bL[i] = 1.2 + Math.random() * 1.6; } }
  ring(x, z, s = 1) { if (!this.rings) return; const r = this.rings[this.ringI = (this.ringI + 1) % this.rings.length]; r.m.position.set(x, 0.04, z); r.life = 1; r.s = s; }
  updateExtras(dt) {
    this.perf(dt);
    if (!this.bubbles) this.buildBubbles();
    { const P = this.bP; for (let i = 0; i < this.bN; i++) { if (this.bL[i] <= 0) continue; this.bL[i] -= dt; P[i * 3 + 1] += this.bV[i] * dt; P[i * 3] += Math.sin(this.time * 6 + i) * 0.004; if (P[i * 3 + 1] > -0.02 || this.bL[i] <= 0) { P[i * 3 + 1] = -99; this.bL[i] = 0; } } this.bubbles.geometry.attributes.position.needsUpdate = true; }
    for (const r of this.rings) { if (r.life <= 0) { r.m.material.opacity = 0; continue; } r.life -= dt * 0.9; const k = 1 - r.life; r.m.scale.setScalar((0.3 + k * 2.2) * (r.s || 1)); r.m.material.opacity = 0.45 * r.life; }
    for (const s of (this.mode === 'race' || this.mode === 'showcase') ? this.swimmers : []) {
      const sw = s.act || s.sw; if (!sw || !sw.root.visible) continue; const p = sw.root.position; const by = sw.body.position.y;
      if (p.x < this.x0 || p.x > this.x0 + this.poolLen || Math.abs(p.z) > PW / 2) continue;
     if (by < -0.25 && Math.random() < 0.9) this.bubble(p.x, by - 0.1, p.z, 2, 0.35);
      else if (by < 0.2 && by > -0.25 && Math.random() < 0.35) this.bubble(p.x - Math.cos(sw.root.rotation.y) * 0.9, -0.3, p.z, 1, 0.3);
      if (by < 0.2 && by > -0.3 && Math.random() < dt * 2.2) this.ring(p.x + Math.cos(sw.root.rotation.y) * 0.6, p.z + (Math.random() - 0.5) * 0.4, 0.8);
     }
    if (this.caustic) { this.caustic.offset.x = (this.time * 0.018) % 1; this.caustic.offset.y = (Math.sin(this.time * 0.21) * 0.06); }
    if (this.paceHand) this.paceHand.rotation.z = -((this.time % 60) / 60) * Math.PI * 2;
    if (this.officials) this.officials.forEach((o, i) => { o.rotation.y += Math.sin(this.time * 0.6 + i) * 0.002; if (o.userData.arm) o.userData.arm.rotation.x = -0.9 - (this.mode === 'race' && this.t > -2 && this.t < 0.4 ? 1.4 : 0.15 * Math.sin(this.time + i)); });
    if (this.sparkle) { this.sparkle.offset.x = (this.time * 0.035) % 1; this.sparkle.offset.y = (this.time * 0.012) % 1; this.sparkleMat.opacity = 0.22 + 0.08 * Math.sin(this.time * 1.7); }
    const L = this.poolLen, x0 = this.x0;
    const put = (blob, sw) => { if (!blob || !sw) return; const v = sw.root.visible; blob.visible = v; if (!v) return; const p = sw.root.position; const inPool = p.x > x0 + 0.1 && p.x < x0 + L - 0.1 && Math.abs(p.z) < PW / 2; const by = sw.body.position.y; const floor = inPool ? -DEPTH + 0.03 : (Math.abs(p.x - x0 - BLOCK_X) < 0.5 || Math.abs(p.x - (x0 + L - BLOCK_X)) < 0.5) && by > 0.5 ? BLOCK_TOP + 0.04 : DECK + 0.015; blob.position.set(p.x, floor, p.z); const sc = inPool ? 1.9 + 0.3 * Math.sin(this.time * 3 + p.x) : 0.9; blob.scale.set(sc * (inPool ? 1.5 : 1), sc * 0.7, 1); blob.material.opacity = inPool ? 0.5 : 0.8; };
    for (const s of this.swimmers) { put(s.blob, s.sw); put(s.blob2, s.sw2); }
    this.updateEvents(dt);
  }
  ticker(text) {
    if (!this.tickEl) { const d = document.createElement('div'); d.style.cssText = "position:absolute;left:50%;top:62px;transform:translateX(-50%);padding:6px 12px;background:rgba(4,18,38,.82);border:1px solid rgba(255,210,63,.45);color:#FFD23F;font:700 12.5px/1.2 Barlow,sans-serif;letter-spacing:.03em;white-space:nowrap;opacity:0;transition:opacity .4s;pointer-events:none"; this.overlay.appendChild(d); this.tickEl = d; }
    this.tickEl.textContent = text; this.tickEl.style.opacity = '1'; clearTimeout(this._tk); this._tk = setTimeout(() => { this.tickEl.style.opacity = '0'; }, 3200);
   }
  updateEvents(dt) {
    this.evs = this.evs || []; if (this.nextEv == null) this.nextEv = this.time + 7;
    const busy = this.cubeOn || (this.mode === 'race' && this.state === 'countdown');
    if (!busy && this.time > this.nextEv && this.evs.length < 2) { this.spawnEvent(); this.nextEv = this.time + 9 + Math.random() * 9; }
    this.evs = this.evs.filter(e => { e.t += dt; const u = e.t / e.dur; if (u >= 1) { e.objs.forEach(o => { this.scene.remove(o); o.traverse && o.traverse(n => { if (n.geometry) n.geometry.dispose(); }); }); return false; } e.upd(u, dt, e); return true; });
  }
  spawnEvent() {
    const L = this.poolLen, x0 = this.x0; const S = (c, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
    const add = o => { this.scene.add(o); return o; }; const rnd = (a, b) => a + Math.random() * (b - a); const side = Math.random() < 0.5 ? -1 : 1;
    const emptyLane = (() => { const used = new Set(this.swimmers.map(s => s.lane)); for (const l of [0, 9, 1, 8]) if (!used.has(l)) return l; return Math.random() < 0.5 ? 0 : 9; })();
    const defs = [
      () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), S('#FFD23F', 0.35)); b.scale.set(1.25, 0.8, 1); g.add(b); const h = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), S('#FFD23F', 0.35)); h.position.set(0.25, 0.25, 0); g.add(h); const bk = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 10).rotateZ(-Math.PI / 2), S('#ff8a00')); bk.position.set(0.44, 0.23, 0); g.add(bk); add(g); const z = laneZ(emptyLane); return { text: 'Um pato de borracha entrou na raia ' + emptyLane + '!', dur: 16, objs: [g], upd: u => { g.position.set(x0 + 2 + u * (L - 4), 0.08 + 0.04 * Math.sin(u * 60), z + 0.3 * Math.sin(u * 9)); g.rotation.y = 0.3 * Math.sin(u * 7); } }; },
      () => { const tx = ctex(128, 64, (c, w, h) => { ['#FF5468', '#f4f7fb', '#2FE0F0', '#FFD23F', '#f4f7fb', '#009E73'].forEach((cl, i) => { c.fillStyle = cl; c.fillRect(i * w / 6, 0, w / 6, h); }); }); const b = add(new THREE.Mesh(new THREE.SphereGeometry(0.45, 20, 14), new THREE.MeshStandardMaterial({ map: tx, roughness: 0.4 }))); const z0 = side * (PW / 2 + 6), z1 = -side * (PW / 2 + 2); return { text: 'Bola de praia voando da arquibancada!', dur: 7, objs: [b], upd: u => { b.position.set(x0 + L * (0.2 + 0.6 * u), DECK + 0.45 + Math.abs(Math.sin(u * Math.PI * 4)) * 4 * (1 - u * 0.6), z0 + (z1 - z0) * u); b.rotation.x += 0.15; b.rotation.z += 0.08; } }; },
      () => { const g = new THREE.Group(); const bd = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.7, 6, 12).rotateZ(Math.PI / 2), S('#8a5a2b', 0.9)); bd.position.y = 0.5; g.add(bd); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.36, 0.4), S('#7a4d22', 0.9)); hd.position.set(0.7, 0.62, 0); g.add(hd); [[-0.3, 0.18], [0.3, 0.18], [-0.3, -0.18], [0.3, -0.18]].forEach(([dx, dz]) => { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 6), S('#5a3620')); l.position.set(dx, 0.15, dz); g.add(l); }); add(g); const z = side * (PW / 2 + 1.3); return { text: 'Uma capivara atravessou o deck. Clássico da USP.', dur: 12, objs: [g], upd: u => { g.position.set(x0 - 1 + u * (L + 2), DECK + 0.03 * Math.abs(Math.sin(u * 80)), z); } }; },
      () => { const g = new THREE.Group(); g.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), S('#111827', 0.4, 0.5))); const rot = []; [[-0.35, -0.35], [0.35, -0.35], [-0.35, 0.35], [0.35, 0.35]].forEach(([dx, dz]) => { const r = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.01, 0.05), S('#cfe3f2')); r.position.set(dx, 0.1, dz); g.add(r); rot.push(r); }); const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#FF5468' })); led.position.y = -0.08; g.add(led); add(g); return { text: 'Drone da transmissão sobrevoando a piscina', dur: 11, objs: [g], upd: u => { g.position.set(x0 + u * L, 5 + Math.sin(u * 12) * 0.4, side * 4 * Math.sin(u * 3)); rot.forEach(r => { r.rotation.y += 0.9; }); } }; },
      () => { const g = new THREE.Group(); const bd = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), S('#8193a8')); bd.scale.set(1.6, 1, 1); g.add(bd); const w1 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.02, 0.5), S('#6b7c90')); w1.position.z = 0.28; const w2 = w1.clone(); w2.position.z = -0.28; g.add(w1, w2); add(g); return { text: 'Um pombo achou que era a final dele', dur: 6, objs: [g], upd: u => { g.position.set(x0 - 3 + u * (L + 6), 7 + Math.sin(u * 7) * 1.2, -side * PW / 2 + side * u * PW); const f = Math.sin(u * 120) * 0.7; w1.rotation.x = f; w2.rotation.x = -f; } }; },
      () => { const n = 160; const geo = new THREE.BufferGeometry(); const P = new Float32Array(n * 3), C = new Float32Array(n * 3), V = []; const cols = ['#FF5468', '#FFD23F', '#2FE0F0', '#f4f7fb', '#B9A6F5'].map(c => new THREE.Color(c)); for (let i = 0; i < n; i++) { P.set([x0 + L * Math.random(), 9 + Math.random() * 3, (Math.random() - 0.5) * PW], i * 3); const c = cols[i % cols.length]; C.set([c.r, c.g, c.b], i * 3); V.push((Math.random() - 0.5) * 0.6); } geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); geo.setAttribute('color', new THREE.BufferAttribute(C, 3)); const pts = add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.22, vertexColors: true }))); return { text: 'Chuva de confete!', dur: 8, objs: [pts], upd: (u, dt) => { for (let i = 0; i < n; i++) { P[i * 3 + 1] = Math.max(0.05, P[i * 3 + 1] - dt * (1.1 + (i % 5) * 0.15)); P[i * 3] += Math.sin(u * 20 + i) * 0.01 + V[i] * dt; } geo.attributes.position.needsUpdate = true; } }; },
      () => { const objs = []; for (let k = 0; k < 7; k++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.32, 14, 12), S(['#FF5468', '#FFD23F', '#2FE0F0', '#B9A6F5', '#009E73'][k % 5], 0.3)); b.scale.y = 1.2; b.userData = { x: x0 + rnd(4, L - 4), z: side * (PW / 2 + rnd(5, 8)), d: rnd(0, 1) }; objs.push(add(b)); } return { text: 'Balões soltos pela torcida', dur: 12, objs, upd: u => objs.forEach(b => b.position.set(b.userData.x + Math.sin(u * 6 + b.userData.d * 6) * 0.6, 2 + u * 16 + b.userData.d, b.userData.z)) }; },
      () => { const objs = []; for (let k = 0; k < 5; k++) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.05, 0.3), S(['#f4f7fb', '#FFD23F', '#2FE0F0'][k % 3], 0.9)); t.userData = { d: k * 0.12, x: x0 + rnd(5, L - 5) }; objs.push(add(t)); } return { text: 'Canhão de camisetas: alguém pegou uma!', dur: 5, objs, upd: u => objs.forEach(t => { const v = Math.max(0, Math.min(1, (u - t.userData.d) * 1.6)); t.position.set(t.userData.x, DECK + 1 + Math.sin(v * Math.PI) * 7, -side * (PW / 2 + 2) + side * 0 + side * -v * 7 * -1); t.rotation.x += 0.2; t.visible = u > t.userData.d; }) }; },
      () => { const tx = ctex(512, 160, (c, w, h) => { c.fillStyle = '#f4f7fb'; c.fillRect(0, 0, w, h); c.fillStyle = '#041226'; c.font = '900 68px "Big Shoulders Display", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(['MÃE, TÔ NA TV!', 'NADA, NADA!', 'CADÊ O RECORDE?', 'BRAÇADA LINDA'][Math.floor(Math.random() * 4)], w / 2, h / 2 + 4); }); const sp = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: tx }))); sp.scale.set(4, 1.25, 1); const x = x0 + rnd(8, L - 8), z = side * (PW / 2 + 7); return { text: 'Cartaz levantado na arquibancada', dur: 7, objs: [sp], upd: u => sp.position.set(x, 4 + Math.sin(u * 30) * 0.15, z) }; },
      () => { const tx = ctex(256, 256, (c, w, h) => { c.fillStyle = '#FF5468'; c.beginPath(); c.roundRect ? c.roundRect(60, 40, 136, 200, 30) : c.fillRect(60, 40, 136, 200); c.fill(); c.fillStyle = '#fff'; c.font = '900 90px "Big Shoulders Display", Impact, sans-serif'; c.textAlign = 'center'; c.fillText('#1', w / 2, 175); }); const sp = add(new THREE.Sprite(new THREE.SpriteMaterial({ map: tx }))); sp.scale.set(1.6, 1.6, 1); const x = x0 + rnd(6, L - 6), z = -side * (PW / 2 + 6.5); return { text: 'Dedão de espuma no ar', dur: 6, objs: [sp], upd: u => sp.position.set(x + Math.sin(u * 25) * 0.4, 3.6 + Math.abs(Math.sin(u * 18)) * 0.6, z) }; },
      () => { const g = new THREE.Group(); const cart = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 0.9), S('#33465c')); cart.position.y = 0.25; g.add(cart); const op = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.6, 4, 8), S('#111827')); op.position.set(0, 1.1, 0); g.add(op); const cam = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.3), S('#0d1117', 0.3, 0.6)); cam.position.set(0, 1.6, side * -0.3); g.add(cam); add(g); const z = side * (PW / 2 + 0.9); return { text: 'Câmera no trilho correndo atrás do líder', dur: 9, objs: [g], upd: u => g.position.set(x0 + u * L, DECK, z) }; },
      () => { const n = 70; const geo = new THREE.BufferGeometry(); const P = new Float32Array(n * 3); const z = laneZ(emptyLane), x = x0 + rnd(5, L - 5); for (let i = 0; i < n; i++) P.set([x + rnd(-0.6, 0.6), -DEPTH + Math.random() * 2, z + rnd(-0.6, 0.6)], i * 3); geo.setAttribute('position', new THREE.BufferAttribute(P, 3)); const pts = add(new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.1, color: '#dff6ff', transparent: true, opacity: 0.8 }))); return { text: 'Bolhas misteriosas na raia ' + emptyLane, dur: 6, objs: [pts], upd: (u, dt) => { for (let i = 0; i < n; i++) { P[i * 3 + 1] += dt * (0.6 + (i % 4) * 0.2); if (P[i * 3 + 1] > 0) P[i * 3 + 1] = -DEPTH; } geo.attributes.position.needsUpdate = true; } }; },
      () => { const seg = 24; const geo = new THREE.PlaneGeometry(6, 2.4, seg, 4); const base = geo.attributes.position.array.slice(); const tx = ctex(512, 200, (c, w, h) => { c.fillStyle = '#0B3D91'; c.fillRect(0, 0, w, h); c.fillStyle = '#FFD23F'; c.fillRect(0, h * 0.4, w, h * 0.2); c.fillStyle = '#fff'; c.font = '900 70px "Big Shoulders Display", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('VAI, RAIA!', w / 2, h / 2 + 4); }); const fl = add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tx, side: THREE.DoubleSide, roughness: 0.8 }))); fl.position.set(x0 + L / 2 + rnd(-8, 8), 5.5, side * (PW / 2 + 8)); fl.rotation.y = side > 0 ? Math.PI : 0; fl.rotation.x = -0.3; return { text: 'Bandeirão aberto na torcida', dur: 9, objs: [fl], upd: u => { const p = geo.attributes.position.array; for (let i = 0; i < p.length; i += 3) p[i + 2] = Math.sin(base[i] * 1.3 + u * 25) * 0.25; geo.attributes.position.needsUpdate = true; fl.position.y = 5.5 + Math.min(1, u * 4) * 0.6; } }; },
      () => { const objs = []; for (let k = 0; k < 26; k++) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.02), new THREE.MeshBasicMaterial({ color: ['#FF5468', '#FFD23F', '#2FE0F0', '#B9A6F5'][k % 4] })); st.userData = { x: x0 + rnd(2, L - 2), z: rnd(-PW / 2, PW / 2), d: rnd(0, 0.4), r: rnd(0, 6) }; objs.push(add(st)); } return { text: 'Serpentinas caindo do teto', dur: 8, objs, upd: u => objs.forEach(s => { const v = Math.max(0, u - s.userData.d); s.position.set(s.userData.x + Math.sin(v * 9 + s.userData.r) * 0.5, Math.max(0.2, 12 - v * 22), s.userData.z); s.rotation.z = Math.sin(v * 12 + s.userData.r); }) }; },
      () => { const g = new THREE.Group(); const bd = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.7, 6, 12), S('#FFD23F', 0.5)); bd.position.y = 0.9; g.add(bd); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), S('#FFD23F', 0.5)); hd.position.y = 1.9; g.add(hd); const cp = new THREE.Mesh(new THREE.SphereGeometry(0.52, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), S('#0B3D91', 0.3)); cp.position.y = 1.95; g.add(cp); [-0.18, 0.18].forEach(dz => { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 14).rotateZ(Math.PI / 2), S('#E9B949', 0.2, 0.9)); e.position.set(0.46, 1.95, dz); g.add(e); }); const arms = [-1, 1].map(sd => { const a2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 4, 8), S('#FFD23F', 0.5)); a2.position.set(0, 1.2, sd * 0.55); g.add(a2); return a2; }); add(g); const x = x0 - 3.5, z = side * 3; return { text: 'O mascote da RAIA está dançando no deck', dur: 8, objs: [g], upd: u => { g.position.set(x, DECK + Math.abs(Math.sin(u * 40)) * 0.15, z); g.rotation.y = Math.sin(u * 12) * 0.6 + Math.PI / 2; arms.forEach((a2, i) => { a2.rotation.x = Math.sin(u * 30 + i * Math.PI) * 1.2; }); } }; }
    ];
    defs.push(
      () => { const g = new THREE.Group(); const bd = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.4, 4, 10).rotateZ(Math.PI / 2), S('#4a4a4a', 0.8)); g.add(bd); const tl = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.3, 8).rotateZ(Math.PI / 2), S('#6b6b6b')); tl.position.x = -0.38; g.add(tl); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), S('#3b3b3b')); hd.position.set(0.36, 0.08, 0); g.add(hd); add(g); const z = side * (PW / 2 + 1.0); return { dur: 7, objs: [g], upd: u => { g.position.set(x0 + L - u * (L + 2), DECK + 0.12 + Math.abs(Math.sin(u * 90)) * 0.05, z + Math.sin(u * 30) * 0.2); } }; },
      () => { const g = new THREE.Group(); const sh = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.0, 4), S('#8193a8', 0.4)); sh.rotation.x = Math.PI; sh.position.y = 0.2; g.add(sh); add(g); const z = laneZ(emptyLane); return { dur: 9, objs: [g], upd: u => { g.position.set(x0 + 3 + u * (L - 6), Math.sin(u * 3.14) * 0.25 - 0.15, z); g.rotation.y = Math.sin(u * 8) * 0.3; } }; },
      () => { const g = new THREE.Group(); for (let k = 0; k < 5; k++) { const d = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), S('#FFD23F', 0.35)); d.scale.set(1.25, 0.8, 1); d.position.set(-k * 0.55, 0, Math.sin(k) * 0.15); g.add(d); } add(g); const z = laneZ(emptyLane); return { dur: 14, objs: [g], upd: u => { g.position.set(x0 + L - 2 - u * (L - 4), 0.06 + 0.03 * Math.sin(u * 70), z); g.rotation.y = Math.PI; } }; },
      () => { const pl = add(new THREE.PointLight('#ff6ad5', 0, 40)); const pl2 = add(new THREE.PointLight('#2fe0f0', 0, 40)); return { dur: 5, objs: [pl, pl2], upd: u => { const on = Math.floor(u * 20) % 2 === 0; pl.intensity = on ? 60 : 0; pl2.intensity = on ? 0 : 60; pl.position.set(x0 + L * 0.3, 8, 0); pl2.position.set(x0 + L * 0.7, 8, 0); } }; },
      () => { const objs = []; for (let k = 0; k < 9; k++) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.12, 14), S(['#FF5468', '#FFD23F', '#2FE0F0'][k % 3], 0.6)); h.userData = { x: x0 + rnd(3, L - 3), z: side * (PW / 2 + rnd(5, 9)), d: rnd(0, 0.5) }; objs.push(add(h)); } return { dur: 4, objs, upd: u => objs.forEach(h => { const v = Math.max(0, u - h.userData.d) * 2; h.position.set(h.userData.x, 3 + Math.sin(Math.min(1, v) * Math.PI) * 2.5, h.userData.z); h.rotation.x += 0.3; h.visible = v > 0; }) }; },
      () => { const g = new THREE.Group(); const b = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.14, 10, 20), S('#FF5468', 0.4)); b.rotation.x = Math.PI / 2; g.add(b); const st = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.145, 10, 20, 0.5), S('#f4f7fb')); st.rotation.x = Math.PI / 2; g.add(st); add(g); const z = laneZ(emptyLane); return { dur: 15, objs: [g], upd: u => { g.position.set(x0 + 4 + u * (L - 8), 0.05 + 0.03 * Math.sin(u * 50), z + 0.4 * Math.sin(u * 6)); g.rotation.y = u * 6; } }; }
    );
    let k; do { k = Math.floor(Math.random() * defs.length); } while (k === this._lastEv && defs.length > 1); this._lastEv = k;
    try { const e = defs[k](); e.t = 0; this.evs.push(e);  } catch (err) { console.error('RAIA evento: ' + err.message); }
  }
  rate2() { const n = performance.now(); if (n - (this._r2 || 0) < 900) return false; this._r2 = n; return true; }
  pan(x) { return clamp((x - this.camPos.x) / 16, -1, 1) * 0.8; }
  setFollow(lane) { this.followLane = lane; this.follow3 = null; }
  setHUD(v) { this.hudOn = v; this.overlay.style.display = v ? 'block' : 'none'; }
  setBoard(v) { this.boardHidden = !v; if (this.h && this.h.board && this.race && !this.cubeOn) this.h.board.style.display = v ? 'flex' : 'none'; }
  setRecordLine(v) { this.showRecord = v; }
  setPoolLength(L) { if (L !== this.poolLen) { this.poolLen = L; this.buildPool(); if (this.race) this.setRace(this.race.spec); else this.setShowcase(); } }
  setYou(cfg) { this.youCfg = cfg; const y = this.swimmers.find(s => s.isYou); if (y) y.sw.setConfig(cfg); else if (this.mode === 'showcase') this.setShowcase(); }
  clearSwimmers() { for (const s of this.swimmers) { if (s.blob) this.scene.remove(s.blob); if (s.blob2) this.scene.remove(s.blob2); }
    for (const s of this.swimmers) { s.sw.dispose(); if (s.sw2) { this.scene.remove(s.sw2.root); s.sw2.dispose(); } } this.swimmers = []; this.tagEls.forEach(e => e.remove()); this.tagEls = []; if (this.foams) this.foams.forEach(f => { this.scene.remove(f); f.geometry.dispose(); }); this.foams = []; }
  addSwimmer(opts) {
    const sw = new Swimmer(opts.cfg); this.scene.add(sw.root);
    const foam = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.9), new THREE.MeshBasicMaterial({ map: this.foamTex, transparent: true, depthWrite: false, opacity: 0 }));
    foam.rotation.x = -Math.PI / 2; foam.renderOrder = 3; this.scene.add(foam); this.foams.push(foam);
    const tag = document.createElement('div'); tag.style.cssText = 'position:absolute;left:0;top:0;transform:translate(-50%,-100%);display:none;white-space:nowrap;font:600 11px/1 "JetBrains Mono",monospace;pointer-events:none';
    this.h.tags.appendChild(tag); this.tagEls.push(tag);
    const s = { ...opts, sw, foam, tag, lastHalf: -1 }; s.blob = this.mkBlob(); this.swimmers.push(s); return s;
  }
  setShowcase() {
    this.mode = 'showcase'; this.race = null; this.state = 'idle'; this.cubeOn = false; this.excite = 0.2;
    this.clearSwimmers(); this.h.top.style.display = 'none'; this.h.board.style.display = 'none'; this.recordLine.visible = false;
    const teams = [['POLI', 'InterUSP'], ['MED PINHEIROS', 'InterUSP'], ['CAASO', 'TUSCA'], ['UFSCAR', 'TUSCA'], ['FEA', 'InterUSP'], ['LEU', 'TUSCA'], ['MED RIBEIRÃO', 'InterUSP'], ['LAP', 'TUSCA'], ['SANFRAN', 'InterUSP'], ['ODONTO', 'InterUSP']];
    for (let i = 0; i < LANES; i++) {
      const [tm, comp] = teams[i]; const color = teamColor(tm, comp); const sex = i % 2 ? 'F' : 'M';
      const isYou = i === 4 && this.youCfg;
      const cfg = isYou ? this.youCfg : genericAvatar(i + 3, sex, color, tm.split(' ').pop().slice(0, 5));
      const swimming = i === 0 || i === 9 || i === 2;
      const s = this.addSwimmer({ lane: i, cfg, isYou: !!isYou, name: isYou ? this.youCfg.name : '', team: tm, color, seed: i * 1.37 });
      if (swimming) { s.loopT = 30 + i * 2.2; s.traj = makeTrajectory({ T: s.loopT, dist: 100, poolLen: this.poolLen, stroke: i === 2 ? 'B' : (i === 9 ? 'C' : 'L'), reaction: 0 }); s.phase0 = i * 7; s.strokeCode = i === 2 ? '50B' : (i === 9 ? '50C' : '50L'); }
    }
    this.setCrowdTeams(teams.slice(0, 6).map(([t, c]) => ({ team: t.split(' ').pop(), color: teamColor(t, c) })));
    this.drawScoreboard();
  }
  setRace(spec) {
    this.mode = 'race'; this.cubeOn = false;
    if (spec.poolLen && spec.poolLen !== this.poolLen) { this.poolLen = spec.poolLen; this.buildPool(); }
    this.clearSwimmers();
    const ev = EVENTS[spec.code]; const dist = ev.dist; const stroke0 = strokeAt(spec.code, 0, dist);
    const ents = [...spec.lanes].sort((a, b) => a.seed - b.seed).slice(0, LANES);
    const R = rand(Math.floor(spec.seed || 5));
    ents.forEach((e, i) => {
      const lane = SEED_ORDER[i];
      const cfg = e.isYou ? (spec.youCfg || this.youCfg) : genericAvatar(i * 13 + (e.name || '').length, spec.sex, e.color, (e.team || '').split(' ').pop().slice(0, 6));
      const jit = e.isYou ? 0.001 : (R() - 0.5) * 0.08;
      const s = this.addSwimmer({ lane, cfg, isYou: !!e.isYou, name: e.name, short: e.short || e.name, team: e.team, color: e.isYou ? YOU : e.color, seed: i * 1.7, T: e.time, ref: e.ref, label: e.label });
      const sty = spec.styles === false ? null : (ev.relay ? relayStyle(R) : randomStyle(R)); s.style = sty;
      s.traj = racePlan({ code: spec.code, sex: spec.sex, T: e.time, poolLen: this.poolLen, rtJitter: jit, ov: mergeStyle(sty, e.ov || null) });
      if (ev.relay) { const m2 = new Swimmer(genericAvatar(i * 31 + 17 + (e.name || '').length, spec.sex, e.color, (e.team || '').split(' ').pop().slice(0, 6))); this.scene.add(m2.root); s.sw2 = m2; s.blob2 = this.mkBlob(); }
    });
    const order = [...this.swimmers].sort((a, b) => a.T - b.T); order.forEach((s, i) => { s.place = i + 1; });
    this.race = { spec, dist, stroke0, Tmax: Math.max(...this.swimmers.map(s => s.T)), order };
    this.recordTraj = spec.record ? racePlan({ code: spec.code, sex: spec.sex, T: spec.record, poolLen: this.poolLen }) : null;
    this.t = -4.5; this.state = 'ready'; this.paused = true; this.flashed = {}; this.excite = 0.25;
    const teams = []; for (const s of order) if (!teams.find(t => t.team === s.team)) teams.push({ team: (s.team || '').split(' ').pop(), full: s.team, color: s.isYou ? YOU : s.color });
    this.setCrowdTeams(teams.slice(0, 6));
    this.h.top.style.display = 'flex'; this.h.title.textContent = spec.title; this.h.board.style.display = this.boardHidden ? 'none' : 'flex';
    this.drawScoreboard(); this.updateBoard(true);
    this.cb.onState && this.cb.onState('ready');
  }
  start() { if (!this.race) return; this.t = -3.4; this.state = 'countdown'; this.paused = false; this.setCube(false); this.excite = 0.3; this.flashed = {}; this.swimmers.forEach(s => { s.finished = false; s.enteredLeg = -1; s.legI = null; }); this._leadLane = null; this.cb.onState && this.cb.onState('racing'); }
  pause() { this.paused = true; }
  play() { if (!this.race) return; if (this.state === 'finished' || this.t >= this.race.Tmax + 2) { this.t = -0.5; } this.state = 'replay'; this.paused = false; this.flashed = this.flashed || {}; }
 seek(t) { if (!this.race) return; this.t = t; this.paused = true; if (this.state !== 'finished') this.state = 'replay'; }
  standings() {
    const t = this.t;
    return this.swimmers.map(s => ({ lane: s.lane, short: s.short || s.name || '', team: s.team || '', color: s.color, isYou: s.isYou, T: s.T, place: s.place, d: s.traj ? s.traj.dAt(Math.max(0, t)) : 0, done: t >= s.T }))
      .sort((a, b) => (b.done - a.done) || (a.done ? a.T - b.T : b.d - a.d));
  }
  updateBoard(force) {
    if (!this.race) return; const now = performance.now(); if (!force && now - (this._lb || 0) < 160) return; this._lb = now;
    const rows = this.standings(); const lead = rows[0];
    this.h.board.innerHTML = rows.map((s, i) => {
      const gap = i === 0 ? (s.done ? fmtTime(s.T) : `${s.d.toFixed(1)} m`) : (s.done ? '+' + (s.T - lead.T).toFixed(2) : (lead.d - s.d > 0.05 ? '−' + (lead.d - s.d).toFixed(1) + ' m' : '—'));
      const fo = s.lane === this.followLane;
      return `<div data-lane="${s.lane}" title="Clique para seguir" style="display:flex;align-items:center;gap:8px;cursor:pointer;background:${s.isYou ? 'rgba(48,38,4,.94)' : 'rgba(4,18,38,.86)'};padding:6px 8px;border-left:3px solid ${s.color};box-shadow:${fo ? 'inset 0 0 0 1.5px #2FE0F0' : 'none'}">
        <span style="width:16px;color:#8db3cf">${i + 1}</span>${fo ? '<span style="color:#2FE0F0;font-size:10px">◉</span>' : ''}<span style="flex:1;min-width:0;color:${s.isYou ? '#FFD23F' : '#eaf6ff'};overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:Barlow,sans-serif;font-weight:600;font-size:13px">${s.short}</span><span style="flex:none;color:#8db3cf;white-space:nowrap">${gap}</span></div>`;
    }).join('');
  }
  frame(dt) {
    this.time += dt;
    if (this.waterMat) { this.waterMat.uniforms.uTime.value = this.time; this.waterMat.uniforms.uCam.value.copy(this.camera.position); }
    this.ledTex.offset.x = (this.time * 0.02) % 1;
    for (const f of this.flags) { const p = f.mesh.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const bx = f.base[3 * i]; p.array[3 * i + 2] = 0.16 * Math.sin(bx * 3.2 - this.time * 5 + f.ph) * (bx / 1.6); } p.needsUpdate = true; }
    if (this.mode === 'race' && this.race) this.updateRace(dt); else this.updateShowcase(dt);
    if (this.snd) this.snd.crowd(this.mode === 'race' ? this.excite : 0, this.active !== false);
    this.updateCrowd(dt); this.updateParticles(dt); this.updateExtras(dt); this.updateCamera(dt); this.updateTags();
    if (this.cubeOn && this.cube) { this.updateCube(); this.renderer.render(this.cube.scene, this.cube.camera); }
    else this.renderer.render(this.scene, this.camera);
  }
  updateShowcase(dt) {
    const t = this.time;
    for (const s of this.swimmers) {
      if (s.traj) {
        const tt = (t + s.phase0) % s.loopT; const d = s.traj.dAt(tt); this.placeSwimmer(s, d, tt, dt, s.strokeCode);
      } else {
        const sw = s.sw; sw.root.position.set(this.x0 + BLOCK_X - 1.2, 0, laneZ(s.lane)); sw.root.rotation.y = 0;
        const which = (Math.floor((t + s.seed * 3) / 6) % 3); const pn = which === 0 ? 'stand' : which === 1 ? 'warmup' : 'shake';
        const r = pose(sw, pn, t + s.seed, 0); orient(sw, Q_STAND, r.pitch); sw.body.position.set(0, 1.2 * sw.H + r.y, 0); groundFeet(sw, DECK);
        sw.setHat(true); s.foam.material.opacity = 0;
      }
    }
    if (!this.ola.on && t > this.ola.next) { this.ola.on = true; this.ola.x = -10; }
    if (this.ola.on) { this.ola.x += dt * 16; if (this.ola.x > 62) { this.ola.on = false; this.ola.next = t + 9 + Math.random() * 6; } }
  }
  updateRace(dt) {
    const R = this.race;
    if (!this.paused) this.t += dt * this.speed;
    const t = this.t;
    if (this.state === 'countdown' && t >= 0) { this.state = 'racing'; this.emitStart = true; }
    if (t > -3.3 && !this.flashed?.wh && this.state === 'countdown') { this.flashed.wh = 1; this.snd && this.snd.whistle(); }
    if (t > -1.7 && t < -1.3 && !this.flashed?.marks && (this.state === 'countdown')) { this.flashed.marks = 1; this.flash('ÀS SUAS MARCAS', '#eaf6ff', 1200); this.snd && this.snd.marks(); }
    if (t >= 0 && t < 0.3 && !this.flashed?.go && this.state === 'racing') { this.flashed.go = 1; this.flash('●', '#FF5468', 500); this.snd && this.snd.beep(); }
    const lead = this.swimmers.reduce((m, s) => Math.max(m, s.traj.dAt(Math.max(0, t))), 0);
    const prog = lead / R.dist;
    if (this.state === 'racing' && t > 2.5) {
      let best = null, bd = -1; for (const s of this.swimmers) { const d = s.traj.dAt(t); if (d > bd) { bd = d; best = s; } }
      if (best && this._leadLane !== best.lane && bd < R.dist - 1.5) {
          if (this._leadLane != null && performance.now() - (this._leadT || 0) > 2200) { this.flash(`${(best.short || best.name || '').split(' ')[0].toUpperCase()} ASSUME A PONTA`, best.isYou ? '#FFD23F' : '#2FE0F0', 1100); this._leadT = performance.now(); this.excite = Math.min(1, this.excite + 0.25); this.snd && this.snd.cheer(0.5); }
        this._leadLane = best.lane;
      }
    }
    if (this.state === 'racing' || this.state === 'replay') this.excite = t < 0 ? 0.06 : clamp(0.45 + 0.55 * prog * prog, 0, 1);
    for (const s of this.swimmers) {
      const d = s.traj.dAt(Math.max(0, t));
      if (t >= s.T && !s.finished && (this.state === 'racing' || this.state === 'replay')) {
        s.finished = true; const p = s.traj.pos(R.dist); this.emit(this.x0 + p.x, 0.05, laneZ(s.lane), 26, 1.2, 2.8); this.snd && this.snd.touch(this.pan(this.x0 + p.x));
        if (s.place === 1 && this.snd) this.snd.horn();
        if (s.isYou && s.place <= 3 && this.snd) setTimeout(() => this.snd && this.snd.celebrate(1), 600);
        if (s.place === 1 && !this.flashed.win) { this.flashed.win = 1; const rec = R.spec.record && s.T < R.spec.record; this.flash(rec ? 'NOVO RECORDE!' : `${(s.short || '').split(' ')[0].toUpperCase()} VENCE`, rec ? '#FF5468' : '#FFD23F', 1600); }
        if (s.isYou && !this.flashed.you) { this.flashed.you = 1; setTimeout(() => this.flash(`VOCÊ: ${s.place}º · ${fmtTime(s.T)}`, '#FFD23F', 2200), s.place === 1 ? 1700 : 300); }
      }
      if (t < s.T) s.finished = false;
      this.placeSwimmer(s, d, t, dt, R.spec.code);
     }
    if (this.recordTraj && this.showRecord && t > 0) { const d = this.recordTraj.dAt(t); const p = this.recordTraj.pos(d); this.recordLine.visible = t < this.recordTraj.T + 0.2; this.recordLine.position.x = this.x0 + p.x; }
    else this.recordLine.visible = false;
    if ((this.state === 'racing') && t > R.Tmax + 2.2) {
      this.state = 'finished'; this.excite = 0.85; this.ola.on = true; this.ola.x = -10;
      this.cb.onFinish && this.cb.onFinish(this.results());
    }
    if (this.state === 'replay' && !this.paused && t > R.Tmax + 2.5) { this.paused = true; this.state = 'finished'; }
    if (this.ola.on) { this.ola.x += dt * 16; if (this.ola.x > 62) this.ola.on = false; }
    if (this.state === 'finished') this.excite = Math.max(0.5, this.excite - dt * 0.05);
    this.h.clock.textContent = fmtTime(clamp(t, 0, R.Tmax));
    if (Math.floor(this.time * 8) !== this._sbk) { this._sbk = Math.floor(this.time * 8); this.drawScoreboard(); }
    this.updateBoard();
    if (this.cb.onTime && performance.now() - (this._ot || 0) > 50) { this._ot = performance.now(); this.cb.onTime(t, R.Tmax); }
  }
  results() { return [...this.swimmers].sort((a, b) => a.T - b.T).map(s => ({ lane: s.lane, name: s.name, team: s.team, color: s.color, isYou: s.isYou, T: s.T, place: s.place, ref: s.ref, label: s.label })); }
  placeSwimmer(s, d, t, dt, code) {
    const tr = s.traj, L = this.poolLen, x0 = this.x0, z = laneZ(s.lane);
    const dist = tr.dist; const showcase = this.mode === 'showcase';
    const leg = tr.legAt(Math.max(0, t)); const lt = t - leg.t0;
    const sw = s.sw2 ? (leg.i % 2 ? s.sw2 : s.sw) : s.sw; s.act = sw; sw.root.visible = true;
    if (s.sw2 && !showcase) this.placeMate(s, leg.i % 2 ? s.sw : s.sw2, leg, t);
    sw.root.rotation.y = 0;
    const p0 = tr.pos(leg.d0 + 0.001); const atStart = p0.dir === 1; const dir0 = p0.dir; const wallX = x0 + (atStart ? 0 : L);
    const water = leg.start === 'water';
    if (s.legI !== leg.i) { if (s.legI != null && leg.i > s.legI && !showcase) { this.emit(wallX + dir0 * 0.3, 0.05, z, 20, 0.9, 2.2); this.snd && (this.snd.touch(this.pan(wallX)), this.snd.cheer(0.15)); } s.legI = leg.i; }
    if (!showcase && lt < leg.rt) {
      s.foam.material.opacity = 0; if ((s.enteredLeg ?? -1) >= leg.i) s.enteredLeg = leg.i - 1;
      if (water) {
        sw.root.position.set(wallX + dir0 * 0.42, 0, z); sw.root.rotation.y = dir0 === 1 ? Math.PI : 0;
        const ready = t > -1.6 || leg.i > 0; const r = pose(sw, ready ? 'backready' : 'tread', this.time + s.seed, 0);
        orient(sw, Q_STAND, ready ? -0.25 : 0); sw.body.position.set(ready ? 0.05 : 0.25, ready ? -0.2 : -0.36 + r.y, 0); sw.setHat(false);
      } else {
        const first = leg.i === 0; const onBlock = !first || t > -3.0; const ready = !first || t > -1.6;
        sw.root.position.set(atStart ? x0 + BLOCK_X : x0 + L - BLOCK_X, 0, z); sw.root.rotation.y = atStart ? 0 : Math.PI;
        const r = pose(sw, ready ? 'ready' : (onBlock ? 'stand' : 'shake'), this.time + s.seed, 0);
        orient(sw, Q_STAND, r.pitch); sw.body.position.set(ready ? 0.1 : (onBlock ? -0.02 : -1.3), 1.2 * sw.H + r.y, 0);
        groundFeet(sw, onBlock ? BLOCK_TOP + 0.03 : DECK); sw.setHat(first && !ready);
      }
      return;
    }
    sw.setHat(false);
    if (!showcase && lt < leg.rt + leg.tf) {
      const u = (lt - leg.rt) / leg.tf;
      if (water) {
        sw.root.position.set(wallX + dir0 * (0.3 + u * leg.xe), 0, z); sw.root.rotation.y = dir0 === 1 ? 0 : Math.PI;
        pose(sw, 'stream', this.time); orient(sw, Q_STAND, Math.PI / 2 + 0.5 * (1 - u), Math.PI); sw.body.position.set(0, -0.15 - 0.3 * u, 0);
      } else {
        const xs = atStart ? x0 + BLOCK_X + 0.35 : x0 + L - BLOCK_X - 0.35, xe = wallX + dir0 * leg.xe; const top = BLOCK_TOP;
        sw.root.position.set(lerp(xs, xe, u), 0, z); sw.root.rotation.y = dir0 === 1 ? 0 : Math.PI;
        pose(sw, 'stream', this.time); orient(sw, Q_STAND, lerp(1.15, Math.PI / 2 + 0.55, ease(u)));
        sw.body.position.set(0, lerp(top + 0.95, -0.2, u) + 0.75 * u * (1 - u), 0);
        if (u > 0.85 && (s.enteredLeg ?? -1) < leg.i) { s.enteredLeg = leg.i; this.emit(xe + dir0 * 0.6, 0.05, z, 30, 1.0, 2.6); this.bubble(xe + dir0 * 0.6, -0.5, z, 60, 0.9); this.ring(xe + dir0 * 0.6, z, 1.6); this.snd && this.snd.dive(this.pan(xe)); }
      }
      s.foam.material.opacity = 0; return;
    }
    const done = !showcase && t >= tr.T;
    const p = tr.pos(Math.min(d, dist - 0.001)); const dir = p.dir; const xw = x0 + p.x;
    if (done) {
      const pe = tr.pos(dist); const xf = x0 + pe.x - pe.dir * 0.55;
      sw.root.position.set(xf, 0, z); sw.root.rotation.y = Math.PI / 2;
      const since = t - tr.T; const cele = since > 0.8 && (s.place === 1 || s.isYou);
     const r = pose(sw, cele ? 'celebrate' : 'tread', this.time + s.seed, 0, { kind: sw.cfg.celebration, inWater: true });
      orient(sw, Q_STAND, 0); sw.body.position.set(0, -0.36 + r.y, 0);
      if (cele && sw.cfg.celebration === 'splash' && Math.random() < 0.3) this.emit(xf, 0.05, z, 3, 0.8, 2.2);
      s.foam.material.opacity = Math.max(0, s.foam.material.opacity - dt);
      return;
    }
    sw.root.position.set(xw, 0, z); sw.root.rotation.y = dir === 1 ? 0 : Math.PI;
    const zi = tr.zoneAt(Math.min(d, dist - 0.001)); const seg = zi.s; const w = zi.w; const remain = seg.D1 - d;
    const st = STYLE[zi.stroke] || 'free'; const backNow = st === 'back';
    let foamOp = 0;
    if (seg.k > 0 && seg.atWall && seg.wall > 0 && t < seg.T0 + seg.wall) {
      pose(sw, 'tuck', this.time); orient(sw, Q_STAND, Math.PI * 1.5, backNow ? Math.PI : 0); sw.body.position.set(0, -0.32, 0);
    } else if (seg.endWall && remain < 1.3) {
      const u = 1 - remain / 1.3;
      pose(sw, 'tuck', this.time); orient(sw, Q_STAND, Math.PI / 2 + Math.PI * ease(u), backNow ? Math.PI : 0);
      sw.body.position.set(0, -0.15 - 0.35 * Math.sin(Math.PI * u), 0);
      if (u > 0.9 && s.lastTurn !== seg.D1) { s.lastTurn = seg.D1; this.emit(xw, 0.05, z, 14, 0.8, 1.8); this.bubble(xw, -0.6, z, 40, 0.7); this.ring(xw, z, 1.2); if (this.snd && !showcase && (s.lane === this.followLane || (this.followLane == null && s.isYou) || this.rate2())) this.snd.turn(this.pan(xw)); }
    } else if (zi.z <= 1) {
      const w0 = zi.first ? leg.xe : 0; const bo = Math.max(w0 + 0.5, zi.bo || 0); const u = clamp((w - w0) / (bo - w0), 0, 1);
      const depth = -0.18 - 0.5 * Math.sin(Math.PI * Math.pow(u, 0.8));
      const slope = 0.5 * Math.PI * Math.cos(Math.PI * Math.pow(u, 0.8)) * 0.35;
      pose(sw, 'stream', this.time * 1.1, 0, { kick: 1 });
       const tw = ease(clamp(w / 3, 0, 1));
      const rollIn = !zi.first ? (backNow ? Math.PI * tw : Math.PI * (1 - tw)) : (backNow ? Math.PI : 0);
      orient(sw, Q_STAND, Math.PI / 2 + slope, rollIn);
      sw.body.position.set(0, depth, 0);
      const isF = s.lane === this.followLane || (this.followLane == null && s.isYou);
      if (isF && this.snd && !showcase && s.uwSeg !== seg.D0 + '|' + leg.i) { s.uwSeg = seg.D0 + '|' + leg.i; this.snd.underwater((seg.uwTime || 2) / Math.max(1, this.speed), this.pan(xw), 2.4 * Math.max(1, this.speed)); }
      if (u > 0.97 && s.lastBo !== seg.D0) { s.lastBo = seg.D0; if (this.snd && !showcase && isF) this.snd.breakout(this.pan(xw)); this.emit(xw + dir * 0.6, 0.04, z, 8, 0.6, 1.4); }
      foamOp = 0.1;
    } else {
      const phase = zi.cyc * Math.PI * 2 + (s.phase0 || 0);
      const r = pose(sw, st, this.time, phase);
      orient(sw, Q_STAND, Math.PI / 2 + r.pitch, (backNow ? Math.PI : 0) + r.roll);
      sw.body.position.set(0, (st === 'breast' ? -0.1 : -0.05) + r.y, 0);
      const half = Math.floor(phase / Math.PI);
      if (half !== s.lastHalf) { s.lastHalf = half; if (this.snd && !showcase && this.speed <= 2 && (s.lane === this.followLane || (this.followLane == null && s.isYou))) { this.snd.stroke(this.pan(xw), st); if (st === 'free' || st === 'back') this.snd.kicks(this.pan(xw), st === 'fly' ? 2 : 3, 30 / Math.max(20, zi.s.SR || 50)); } if (st !== 'breast') this.emit(xw + dir * 0.95, 0.04, z + (half % 2 ? 0.25 : -0.25), st === 'fly' ? 8 : 4, 0.6, 1.6); else if (half % 2) this.emit(xw - dir * 1.0, 0.04, z, 5, 0.7, 1.2); }
      if (Math.random() < 0.35) this.emit(xw - dir * 1.15, 0.03, z + (Math.random() - 0.5) * 0.3, 1, 0.5, 1.1);
      foamOp = 0.55;
    }
    const f = s.foam; f.position.set(xw - dir * 1.2, 0.035, z); f.rotation.z = dir === 1 ? Math.PI : 0; f.material.opacity += (foamOp - f.material.opacity) * Math.min(1, dt * 6);
  }
  placeMate(s, m, leg, t) {
    const tr = s.traj, L = this.poolLen, x0 = this.x0, z = laneZ(s.lane); const since = t - leg.t0; const next = tr.legs[leg.i + 1];
    m.root.visible = true; m.root.rotation.y = 0;
    if (leg.i > 0 && since < 1.8) { const pe = tr.pos(leg.d0 - 0.01); const xf = x0 + pe.x - pe.dir * 0.5; m.root.position.set(xf, 0, z + 0.62); m.root.rotation.y = Math.PI / 2; const r = pose(m, 'tread', this.time + s.seed, 0); orient(m, Q_STAND, 0); m.body.position.set(0, -0.36 + r.y, 0); m.setHat(false); return; }
    if (!next || (leg.i > 0 && since < 3.4)) { m.root.visible = false; return; }
    const wait = next.t0 - t; const p0 = tr.pos(next.d0 + 0.001); const atStart = p0.dir === 1;
    const bx = atStart ? x0 + BLOCK_X : x0 + L - BLOCK_X; const back = atStart ? -1 : 1; m.root.rotation.y = atStart ? 0 : Math.PI;
    if (wait > 7.5) {
      const ph = Math.floor((t + s.seed * 3) / 4) % 3; const r = pose(m, ph === 0 ? 'warmup' : ph === 1 ? 'shake' : 'stand', this.time + s.seed, 0);
      m.root.position.set(bx + back * 1.6, 0, z); orient(m, Q_STAND, r.pitch); m.body.position.set(0, 1.2 * m.H + r.y, 0); groundFeet(m, DECK); m.setHat(true); return;
    }
    if (wait > 4) {
      const u = clamp((7.5 - wait) / 3.5, 0, 1); const r = pose(m, 'stand', this.time + s.seed, 0);
      m.root.position.set(lerp(bx + back * 1.6, bx, ease(u)), 0.06 * Math.abs(Math.sin(u * Math.PI * 4)) * (u < 0.8 ? 1 : 0), z); orient(m, Q_STAND, r.pitch); m.body.position.set(0, 1.2 * m.H + r.y, 0);
      groundFeet(m, u > 0.82 ? BLOCK_TOP + 0.03 : DECK); m.setHat(u < 0.5); return;
    }
    const ready = wait < 1.8; const r = pose(m, ready ? 'ready' : 'stand', this.time + s.seed, 0);
    m.root.position.set(bx, 0, z); orient(m, Q_STAND, r.pitch); m.body.position.set(ready ? 0.1 : -0.02, 1.2 * m.H + r.y, 0); groundFeet(m, BLOCK_TOP + 0.03); m.setHat(false);
  }
  updateCrowd(dt) {
    const ps = this.crowd, dm = this.dummy, t = this.time; const cg = this.crowdGain ?? 1; const e0 = Math.min(1, Math.max(0, this.excite * cg + (cg > 1.2 ? 0.12 : 0)));
    const leadTeamIdx = this.race && this.crowdTeams ? (() => { const st = this.standings()[0]; return this.crowdTeams.findIndex(c => c.full === (st && this.swimmers.find(s => s.lane === st.lane)?.team)); })() : -1;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      const wave = this.ola.on ? Math.exp(-(((p.x - this.ola.x) / 2.6) ** 2)) : 0;
      const ex = Math.min(1, e0 + (p.team >= 0 && p.team === leadTeamIdx ? 0.25 : 0));
      const stand = Math.max(wave, clamp((ex - 0.5) / 0.25, 0, 1));
      const jump = ex * 0.2 * Math.max(0, Math.sin(t * (5.5 + ex * 4) + p.ph)) * (0.5 + p.r);
      const ty = p.y + 0.38 + stand * 0.3 + jump + wave * 0.15;
      dm.position.set(p.x, ty, p.z); dm.rotation.set(0, 0, 0); dm.scale.set(1, p.h, 1); dm.updateMatrix(); this.cTorso.setMatrixAt(i, dm.matrix);
      dm.position.set(p.x, ty + 0.36 * p.h, p.z); dm.scale.set(1, 1, 1); dm.updateMatrix(); this.cHead.setMatrixAt(i, dm.matrix);
      const up = wave > 0.35 || ex > 0.62;
      const sw = up ? 0.25 + 0.25 * Math.sin(t * 9 + p.ph) : 0.08;
      for (let k = 0; k < 2; k++) {
        const sgn = k ? 1 : -1;
        if (up) { dm.position.set(p.x + sgn * 0.21, ty + 0.42 * p.h, p.z); dm.rotation.set(0, 0, -sgn * sw); }
        else { dm.position.set(p.x + sgn * 0.21, ty - 0.02, p.z); dm.rotation.set(0, 0, sgn * sw); }
        dm.updateMatrix(); this.cArm.setMatrixAt(2 * i + k, dm.matrix);
      }
    }
    this.cTorso.instanceMatrix.needsUpdate = true; this.cHead.instanceMatrix.needsUpdate = true; this.cArm.instanceMatrix.needsUpdate = true;
  }
  updateCamera(dt) {
    const L = this.poolLen, x0 = this.x0; const sp = this.mode === 'race' && !this.paused ? Math.max(1, this.speed) : 1; const k = 1 - Math.exp(-dt * 2.6 * sp * (this.camMode === 'voce' ? 1.8 : 1));
    let pos, look;
    if (this.mode === 'showcase') {
      const a = this.time * 0.045 - 1.9; pos = new THREE.Vector3(25 + Math.cos(a) * 27, 9.5 + 2.2 * Math.sin(this.time * 0.07), Math.sin(a) * 13.5 - 1.5); look = new THREE.Vector3(25, -0.6, 0);
      this.camPos.lerp(pos, 0.02 + k * 0.2); this.camLook.lerp(look, k);
    } else {
      const t = Math.max(0, this.t); let lx = x0;
      if (this.race && this.t > 0) { let best = -1; for (const s of this.swimmers) { const d = s.traj.dAt(t); if (d > best) { best = d; lx = x0 + s.traj.pos(Math.min(d, s.traj.dist - 0.001)).x; } } }
      if (this.state === 'finished' || (this.race && this.t > this.race.Tmax)) lx = x0 + L * 0.62;
      const lxTV = Math.max(x0 + 6, Math.min(x0 + L - 7, lx));
      const you = (this.followLane != null && this.swimmers.find(s => s.lane === this.followLane)) || this.swimmers.find(s => s.isYou);
      switch (this.camMode) {
        case 'aerea': pos = new THREE.Vector3(lx, 30, -10); look = new THREE.Vector3(lx, 0, 0.5); break;
        case 'bloco': pos = new THREE.Vector3(x0 - 9, 3.6, 0); look = new THREE.Vector3(x0 + Math.min(L, 30), -1, 0); break;
        case 'voce': {
          if (you) { const d = you.traj.dAt(t); const p = you.traj.pos(Math.min(d, you.traj.dist - 0.001)); const yx = x0 + p.x, yz = laneZ(you.lane); const f = this.follow3 || { az: 0, el: 0.35, r: 7.6 }; const base = Math.atan2(-4, -p.dir * 6.5) + f.az; pos = new THREE.Vector3(yx + f.r * Math.cos(f.el) * Math.cos(base), 0.4 + f.r * Math.sin(f.el), yz + f.r * Math.cos(f.el) * Math.sin(base)); look = new THREE.Vector3(yx + p.dir * 2.2, -0.2, yz); }
          else { pos = new THREE.Vector3(lx - 3, 9.5, -27); look = new THREE.Vector3(lx + 1.5, 0, 0); }
          break;
        }
        case 'livre': {
          const o = this.orbit; o.target.lerp(new THREE.Vector3(lx, 0, 0), k * 0.5);
          pos = new THREE.Vector3(o.target.x + o.r * Math.cos(o.el) * Math.sin(o.az), o.target.y + o.r * Math.sin(o.el), o.target.z + o.r * Math.cos(o.el) * Math.cos(o.az)); look = o.target.clone();
          this.camPos.copy(pos); this.camLook.copy(look); break;
        }
        default: pos = new THREE.Vector3(lxTV - 3, 9.5, -27); look = new THREE.Vector3(lxTV + 1.5, 0, 0);
      }
      if (this.camMode !== 'livre') { this.camPos.lerp(pos, k); this.camLook.lerp(look, k); }
    }
    if (!this.cubeOn) { this.camPos.x = clamp(this.camPos.x, -9, 59); this.camPos.z = clamp(this.camPos.z, -19, 19); this.camPos.y = clamp(this.camPos.y, 0.5, 30); }
    this.camera.position.copy(this.camPos); this.camera.lookAt(this.camLook);
  }
  updateTags() {
    const w = this.el.clientWidth, h = this.el.clientHeight; const v = new THREE.Vector3();
    const show = this.mode === 'race' && !this.cubeOn;
    this.swimmers.forEach((s, i) => {
      const el = this.tagEls[i]; if (!el) return;
      if (!show) { el.style.display = 'none'; return; }
      const pre = this.t < 0.4; const fin = this.t >= s.T;
      const fl = this.followLane != null ? this.followLane : (this.swimmers.find(x => x.isYou) || {}).lane; if (!fin && s.lane !== fl) { el.style.display = 'none'; return; }
      v.copy((s.act || s.sw).root.position); v.y = pre ? (this.race.stroke0 === 'C' ? 0.6 : 2.25) : 0.9; if (fin) v.y = 0.7; v.z = laneZ(s.lane);
      v.project(this.camera); if (v.z > 1) { el.style.display = 'none'; return; }
      const x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
      el.style.display = 'block'; el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
      const nm = (s.short || s.name || '').split(' ')[0];
      const html = pre ? `<span style="background:${s.isYou ? '#FFD23F' : 'rgba(4,18,38,.88)'};color:${s.isYou ? '#041226' : '#eaf6ff'};padding:4px 6px;border-bottom:2px solid ${s.color}">${s.lane} · ${nm.toUpperCase()}</span>`
        : fin ? `<span style="background:${s.place === 1 ? '#FFD23F' : s.isYou ? 'rgba(255,210,63,.9)' : 'rgba(4,18,38,.85)'};color:${s.place === 1 || s.isYou ? '#041226' : '#eaf6ff'};padding:4px 6px">${s.place}º ${fmtTime(s.T)}</span>`
        : `<span style="color:#FFD23F;font-size:16px;text-shadow:0 2px 8px #000">▼</span>`;
      if (el._h !== html) { el.innerHTML = html; el._h = html; }
    });
  }
  setCube(on) {
    this.cubeOn = on && !!this.race;
    if (this.cubeOn) { this.buildCube(); }
    this.h.top.style.display = this.cubeOn ? 'none' : (this.race ? 'flex' : 'none'); this.h.board.style.display = this.cubeOn || this.boardHidden ? 'none' : (this.race ? 'flex' : 'none');
  }
  buildCube() {
    if (this.cube) { this.cube.scene.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
    const R = this.race; const D = R.dist; const Tm = R.Tmax;
    const SX = 32 / D, SY = 20 / Tm, SZ = 2.0;
    const sc = new THREE.Scene(); sc.background = new THREE.Color('#041226');
    sc.add(new THREE.HemisphereLight('#dff4ff', '#0b2540', 1.4)); const dl = new THREE.DirectionalLight('#fff', 1.4); dl.position.set(20, 40, -20); sc.add(dl);
    const cam = new THREE.PerspectiveCamera(42, this.camera.aspect, 0.1, 400);
    const g = new THREE.Group(); sc.add(g); g.position.set(-16, -10, 0);
    const lineM = new THREE.LineBasicMaterial({ color: '#1d4a6e' }); const lineM2 = new THREE.LineBasicMaterial({ color: '#2FE0F0', transparent: true, opacity: 0.55 });
    const seg = (pts, m) => { const geo = new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(...p))); g.add(new THREE.LineSegments(geo, m)); };
    const zMin = -PW / 2 * 0.8 - 0.5, zMax = PW / 2 * 0.8 + 0.5; const Z = lane => (lane - 4.5) * SZ;
    const pts = [];
    const stepD = D <= 50 ? 5 : D <= 100 ? 10 : D <= 200 ? 25 : 50;
    for (let d = 0; d <= D + 0.01; d += stepD) pts.push([d * SX, 0, Z(-0.5)], [d * SX, 0, Z(9.5)]);
    for (let l = 0; l <= 10; l++) pts.push([0, 0, Z(l - 0.5)], [D * SX, 0, Z(l - 0.5)]);
    seg(pts, lineM);
    const tStep = Tm < 40 ? 5 : Tm < 90 ? 10 : Tm < 200 ? 20 : 60; const wall = [];
    for (let t = 0; t <= Tm + 0.01; t += tStep) wall.push([0, t * SY, Z(-0.5)], [D * SX, t * SY, Z(-0.5)], [0, t * SY, Z(-0.5)], [0, t * SY, Z(9.5)]);
    wall.push([0, 0, Z(-0.5)], [0, Tm * SY, Z(-0.5)], [D * SX, 0, Z(-0.5)], [D * SX, Tm * SY, Z(-0.5)], [0, 0, Z(9.5)], [0, Tm * SY, Z(9.5)]);
    seg(wall, lineM);
    for (let k = 1; k < Math.round(D / this.poolLen); k++) seg([[k * this.poolLen * SX, 0, Z(-0.5)], [k * this.poolLen * SX, 0, Z(9.5)], [k * this.poolLen * SX, 0, Z(-0.5)], [k * this.poolLen * SX, Tm * SY, Z(-0.5)]], lineM2);
    const label = (text, x, y, z, size = 1, color = '#8db3cf') => {
      const tx = ctex(512, 128, (c, w, h) => { c.font = '600 54px "JetBrains Mono", monospace'; c.fillStyle = color; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2); });
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthWrite: false })); s.scale.set(5.2 * size, 1.3 * size, 1); s.position.set(x, y, z); g.add(s); return s;
    };
    for (let d = 0; d <= D + 0.01; d += stepD) label(`${d}`, d * SX, -0.9, Z(-1.4), 0.8);
    for (let t = tStep; t <= Tm + 0.01; t += tStep) label(`${t}s`, -1.4, t * SY, Z(-0.9), 0.8);
    label('DISTÂNCIA (m) →', D * SX / 2, -2.2, Z(-2.2), 1.2, '#2FE0F0'); label('TEMPO ↑', -2.6, Tm * SY + 1.2, Z(-0.5), 1.2, '#2FE0F0'); label('RAIAS', D * SX + 2.8, 0, Z(4.5), 1.1, '#2FE0F0');
    const markers = [];
    for (const s of this.swimmers) {
      const N = 140; const pts3 = []; const proj = [];
      for (let i = 0; i <= N; i++) { const t = s.T * i / N; const d = s.traj.dAt(t); pts3.push(new THREE.Vector3(d * SX, t * SY, Z(s.lane))); proj.push(new THREE.Vector3(d * SX, t * SY, Z(-0.5) + 0.02)); }
      const curve = new THREE.CatmullRomCurve3(pts3);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 160, s.isYou ? 0.2 : 0.11, 8, false), new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: s.isYou ? 0.55 : 0.25, roughness: 0.4 }));
      g.add(tube);
      const pl = new THREE.Line(new THREE.BufferGeometry().setFromPoints(proj), new THREE.LineBasicMaterial({ color: s.color, transparent: true, opacity: 0.45 })); g.add(pl);
      const fin = new THREE.Mesh(new THREE.SphereGeometry(s.isYou ? 0.36 : 0.24, 16, 12), new THREE.MeshBasicMaterial({ color: s.color })); fin.position.copy(pts3[N]); g.add(fin);
      if (s.place <= 3 || s.isYou) label(`${s.place}º ${(s.short || '').split(' ')[0]}`, D * SX + 2.6, s.T * SY, Z(s.lane), 0.75, s.isYou ? YOU : '#eaf6ff');
      const mk = new THREE.Mesh(new THREE.SphereGeometry(s.isYou ? 0.34 : 0.22, 14, 10), new THREE.MeshBasicMaterial({ color: '#ffffff' })); g.add(mk); markers.push({ s, mk });
    }
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(D * SX + 2, 10 * SZ + 1), new THREE.MeshBasicMaterial({ color: '#2FE0F0', transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
    plane.rotation.x = -Math.PI / 2; plane.position.set(D * SX / 2, 0, Z(4.5)); g.add(plane);
    const ring = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(D * SX + 2, 10 * SZ + 1)), new THREE.LineBasicMaterial({ color: '#2FE0F0' })); ring.rotation.x = -Math.PI / 2; ring.position.copy(plane.position); g.add(ring);
    this.cube = { scene: sc, camera: cam, g, SX, SY, Z, plane, ring, markers };
    this.cubeOrbit = this.cubeOrbit || { az: -0.7, el: 0.38, r: 40, target: new THREE.Vector3(0, -1, 0) };
  }
  updateCube() {
    const c = this.cube, o = this.cubeOrbit; const t = clamp(this.t, 0, this.race.Tmax);
    if (!this.paused && this.state !== 'finished') { }
    c.plane.position.y = t * c.SY; c.ring.position.y = t * c.SY;
    for (const { s, mk } of c.markers) { const tt = Math.min(t, s.T); const d = s.traj.dAt(tt); mk.position.set(d * c.SX, tt * c.SY, c.Z(s.lane)); }
    c.camera.position.set(o.r * Math.cos(o.el) * Math.sin(o.az), o.r * Math.sin(o.el), o.r * Math.cos(o.el) * Math.cos(o.az)); c.camera.lookAt(o.target);
    c.camera.aspect = this.camera.aspect; c.camera.updateProjectionMatrix();
  }
  trajectories() {
    if (!this.race) return null;
    return { dist: this.race.dist, poolLen: this.poolLen, Tmax: this.race.Tmax, swimmers: this.swimmers.map(s => ({ lane: s.lane, name: s.short || s.name, team: s.team, color: s.color, isYou: s.isYou, T: s.T, place: s.place, traj: s.traj })) };
  }
  dispose() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.clearSwimmers(); this.renderer.dispose(); this.renderer.domElement.remove(); this.overlay.remove(); }
}
