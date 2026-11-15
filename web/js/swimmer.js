import * as THREE from '../vendor/three.module.js';
export { THREE };

export const SKINS = ['#F5D0B0', '#E5B48F', '#C98E62', '#A86B3C', '#7E4E2C', '#5A3620'];
export const SUITS = [
  { id: 'sunga', label: 'Sunga' }, { id: 'jammer', label: 'Jammer' }, { id: 'bermuda', label: 'Bermudão' },
   { id: 'maio', label: 'Maiô' }, { id: 'macaquinho', label: 'Macaquinho' }
];
export const PATTERNS = [
  { id: 'liso', label: 'Liso' }, { id: 'listras', label: 'Listras' }, { id: 'faixa', label: 'Faixa lateral' },
  { id: 'degrade', label: 'Degradê' }, { id: 'chevron', label: 'Chevron' }, { id: 'bolinhas', label: 'Bolinhas' }
];
export const CAPS = [{ id: 'lisa', label: 'Lisa' }, { id: 'equipe', label: 'Com sigla' }, { id: 'listrada', label: 'Listrada' }, { id: 'bicolor', label: 'Bicolor' }, { id: 'chamas', label: 'Chamas' }, { id: 'ondas', label: 'Ondas' }, { id: 'estrelas', label: 'Estrelas' }, { id: 'raio', label: 'Raio' }, { id: 'bandeira', label: 'Brasil' }, { id: 'sem', label: 'Sem touca' }];
export const GOGGLES = {
  ouro: { label: 'Espelhado ouro', color: '#E9B949', metal: 0.95, rough: 0.12 },
  prata: { label: 'Espelhado prata', color: '#DCE3EA', metal: 0.95, rough: 0.08 },
  azul: { label: 'Azul', color: '#2C7BE5', metal: 0.7, rough: 0.15 },
  fume: { label: 'Fumê', color: '#2A2F36', metal: 0.4, rough: 0.2 },
  arcoiris: { label: 'Arco-íris', color: '#7a5cff', metal: 0.9, rough: 0.1, irid: true },
  transparente: { label: 'Transparente', color: '#CFEFFF', metal: 0, rough: 0.05, opacity: 0.45 }
};
export const HATS = [{ id: 'none', label: 'Nenhum' }, { id: 'bone', label: 'Boné' }, { id: 'bone-tras', label: 'Boné pra trás' }, { id: 'viseira', label: 'Viseira' }, { id: 'balde', label: 'Chapéu bucket' }];
export const CELEBRATIONS = [{ id: 'punho', label: 'Soco no ar' }, { id: 'bracos', label: 'Braços em V' }, { id: 'aponta', label: 'Aponta o placar' }, { id: 'splash', label: 'Bate na água' }];

export const BODY_TYPES = [{ id: 'magro', label: 'Esguio' }, { id: 'medio', label: 'Equilibrado' }, { id: 'atletico', label: 'Atlético' }, { id: 'forte', label: 'Musculoso' }, { id: 'gordinho', label: 'Robusto' }];
export const HAIRS = [{ id: 'curto', label: 'Curto' }, { id: 'raspado', label: 'Raspado' }, { id: 'franja', label: 'Franja' }, { id: 'afro', label: 'Black power' }, { id: 'cacheado', label: 'Cacheado' }, { id: 'coque', label: 'Coque' }, { id: 'rabo', label: 'Rabo de cavalo' }, { id: 'trancas', label: 'Tranças' }, { id: 'longo', label: 'Longo' }];
export const FACES = [{ id: 'sorriso', label: 'Sorriso' }, { id: 'serio', label: 'Concentrado' }, { id: 'confiante', label: 'Confiante' }, { id: 'surpreso', label: 'Animado' }];
export const NOSES = [{ id: 'fino', label: 'Nariz fino' }, { id: 'medio', label: 'Nariz médio' }, { id: 'largo', label: 'Nariz largo' }];
export const FACIAL = [{ id: 'none', label: 'Sem barba' }, { id: 'barba', label: 'Barba cheia' }, { id: 'rala', label: 'Barba rala' }, { id: 'cavanhaque', label: 'Cavanhaque' }, { id: 'bigode', label: 'Bigode' }];
export const MARKS = [{ id: 'none', label: 'Nenhuma' }, { id: 'sardas', label: 'Sardas' }, { id: 'pintura', label: 'Pintura de torcida' }, { id: 'brinco', label: 'Brinco' }];
export const HAIR_COLORS = ['#141010', '#3b2418', '#6b4226', '#b07b3e', '#d9b36c', '#8a8f98', '#c2412d', '#2FE0F0'];
const BT = {
  magro: { w: 0.88, limb: 0.84, waist: 0.92, belly: 0, delt: 0.82, chest: 0.94 },
  medio: { w: 1, limb: 1, waist: 1.02, belly: 0.3, delt: 0.95, chest: 1 },
  atletico: { w: 1.03, limb: 1.04, waist: 0.9, belly: 0, delt: 1.18, chest: 1.06 },
  forte: { w: 1.12, limb: 1.17, waist: 1.0, belly: 0.12, delt: 1.32, chest: 1.12 },
  gordinho: { w: 1.14, limb: 1.12, waist: 1.24, belly: 1, delt: 1.0, chest: 1.08 }
};
export const DEFAULT_AVATAR = {
  name: 'Você', sigla: 'VOC', team: 'CAASO', sex: 'M', bodyType: 'atletico', hair: 'curto', hairColor: '#3b2418', facial: 'none', face: 'sorriso', nose: 'medio', mark: 'none', skin: '#C98E62', height: 1, build: 1,
  suit: 'jammer', suitColor: '#0B3D91', suitColor2: '#FFD23F', pattern: 'faixa',
  cap: 'equipe', capColor: '#FFD23F', capColor2: '#0B1B33', capText: 'RAIA',
  goggles: 'ouro', hat: 'none', hatColor: '#111827', headphones: false, phonesColor: '#FFD23F',
  towel: false, towelColor: '#FF5468', watch: false, medal: 'none', celebration: 'punho'
};

const texCache = new Map();
function canvasTex(key, w, h, draw) {
  if (texCache.has(key)) return texCache.get(key);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  texCache.set(key, t); return t;
}
function suitTex(p, c1, c2) {
  return canvasTex(`suit|${p}|${c1}|${c2}`, 256, 256, (g, w, h) => {
    g.fillStyle = c1; g.fillRect(0, 0, w, h); g.fillStyle = c2;
    if (p === 'listras') for (let y = 0; y < h; y += 42) g.fillRect(0, y, w, 16);
    else if (p === 'faixa') { g.fillRect(0, 0, 22, h); g.fillRect(w / 2 - 11, 0, 22, h); g.fillRect(w - 22, 0, 22, h); }
    else if (p === 'degrade') { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
    else if (p === 'chevron') { g.lineWidth = 14; g.strokeStyle = c2; for (let y = -40; y < h + 40; y += 56) { g.beginPath(); for (let x = 0; x <= w; x += 32) g.lineTo(x, y + ((x / 32) % 2 ? 22 : 0)); g.stroke(); } }
    else if (p === 'bolinhas') for (let y = 12; y < h; y += 34) for (let x = (y / 34 % 2) * 17 + 8; x < w; x += 34) { g.beginPath(); g.arc(x, y, 7, 0, 7); g.fill(); }
  });
}
function capTex(style, c1, c2, text) {
  return canvasTex(`cap|${style}|${c1}|${c2}|${text}`, 512, 256, (g, w, h) => {
    g.fillStyle = c1; g.fillRect(0, 0, w, h);
    if (style === 'listrada') { g.fillStyle = c2; for (let x = 0; x < w; x += 64) g.fillRect(x + 4, 0, 18, h); }
    if (style === 'bicolor') { g.fillStyle = c2; g.fillRect(0, 0, w / 2, h); }
    if (style === 'chamas') { g.fillStyle = c2; for (let x = 0; x < w; x += 42) { g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + 6, h * 0.55, x + 20, h * 0.35 - (x % 84 ? 0 : 20)); g.quadraticCurveTo(x + 26, h * 0.6, x + 42, h); g.fill(); } }
    if (style === 'ondas') { g.strokeStyle = c2; g.lineWidth = 10; for (let y = 40; y < h; y += 46) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y + 10 * Math.sin(x / 22)); g.stroke(); } }
    if (style === 'estrelas') { g.fillStyle = c2; const star = (cx, cy, r) => { g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * 0.45 : r; g.lineTo(cx + rr * Math.cos(a), cy + rr * Math.sin(a)); } g.fill(); }; for (let k = 0; k < 14; k++) star((k * 97) % w, 40 + ((k * 61) % (h - 70)), 16 + (k % 3) * 6); }
    if (style === 'raio') { g.fillStyle = c2; [[0, 0.5], [0.5, 0.5]].forEach(([ox]) => { g.beginPath(); const X = ox * w; g.moveTo(X + 40, 0); g.lineTo(X + 150, 0); g.lineTo(X + 110, h * 0.45); g.lineTo(X + 170, h * 0.45); g.lineTo(X + 60, h); g.lineTo(X + 90, h * 0.55); g.lineTo(X + 30, h * 0.55); g.closePath(); g.fill(); }); }
    if (style === 'bandeira') { g.fillStyle = '#009C3B'; g.fillRect(0, 0, w, h); g.fillStyle = '#FFDF00'; [0, w / 2].forEach(X => { g.beginPath(); g.moveTo(X + w / 4, h * 0.12); g.lineTo(X + w / 2 - 12, h * 0.55); g.lineTo(X + w / 4, h * 0.98); g.lineTo(X + 12, h * 0.55); g.closePath(); g.fill(); g.fillStyle = '#002776'; g.beginPath(); g.arc(X + w / 4, h * 0.55, h * 0.2, 0, Math.PI * 2); g.fill(); g.fillStyle = '#FFDF00'; }); }
    if (style === 'equipe' || style === 'bicolor') {
      g.fillStyle = style === 'bicolor' ? c1 : c2; g.font = '900 64px "Big Shoulders Display", Impact, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const t = (text || '').slice(0, 8).toUpperCase();
      g.save(); g.translate(w * 0.0 + 64, h * 0.62); g.fillText(t, 0, 0); g.restore();
      g.fillStyle = c2; g.save(); g.translate(w * 0.5 + 64, h * 0.62); g.fillText(t, 0, 0); g.restore();
    }
  });
}
const G = {};
function geo(key, make) { return G[key] || (G[key] = make()); }

export class Swimmer {
  constructor(cfg = {}) {
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body);
    this.model = new THREE.Group(); this.body.add(this.model);
    this.mats = []; this.cfg = null; this.j = {}; this.hatVisible = true;
    this.setConfig(cfg);
  }
  mat(opts) { const m = new THREE.MeshStandardMaterial(opts); this.mats.push(m); return m; }
  setConfig(cfg) {
    cfg = { ...DEFAULT_AVATAR, ...cfg }; this.cfg = cfg;
    for (const m of this.mats) m.dispose(); this.mats = [];
    while (this.model.children.length) this.model.remove(this.model.children[0]);
    const F = (cfg.frame || cfg.sex) === 'F'; const bt = BT[cfg.bodyType] || BT.atletico; this._bust = null; const noCap = cfg.cap === 'sem'; const hz = cfg.hair || 'curto';
    const H = cfg.height || 1, Bw = (cfg.build || 1) * (F ? 0.92 : 1) * bt.w, Lb = bt.limb * (F ? 0.94 : 1) * (0.92 + 0.08 * (cfg.build || 1));
     const hipW = (F ? 1.13 : 1) * (cfg.bodyType === 'gordinho' ? 1.08 : 1);
    const TW = Lb * (F ? 1.06 : 1) * (cfg.bodyType === 'gordinho' ? 1.1 : 1);
    this.model.scale.setScalar(H); this.model.position.y = -1.2 * H; this.H = H;
    const skin = this.mat({ color: cfg.skin, roughness: 0.55, metalness: 0.0 });
    const suitMap = suitTex(cfg.pattern, cfg.suitColor, cfg.suitColor2);
    const suit = this.mat({ color: '#ffffff', map: suitMap, roughness: 0.32, metalness: 0.08 });
    const capM = this.mat({ color: '#ffffff', map: capTex(cfg.cap, cfg.capColor, cfg.capColor2, cfg.capText || cfg.sigla), roughness: 0.25, metalness: 0.05 });
    const gg = GOGGLES[cfg.goggles] || GOGGLES.ouro;
    const lens = gg.irid ? new THREE.MeshPhysicalMaterial({ color: gg.color, metalness: gg.metal, roughness: gg.rough, iridescence: 1, iridescenceIOR: 1.6 }) : this.mat({ color: gg.color, metalness: gg.metal, roughness: gg.rough, transparent: !!gg.opacity, opacity: gg.opacity || 1 });
    if (gg.irid) this.mats.push(lens);
    const dark = this.mat({ color: '#0d1117', roughness: 0.5 });
    const M = (g, m, x = 0, y = 0, z = 0, parent = this.model) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); parent.add(o); return o; };
    const cap = (r, l) => geo(`cap${r}|${l}`, () => new THREE.CapsuleGeometry(r, l, 6, 18));
    const sph = (r, ws = 20, hs = 14) => geo(`sph${r}|${ws}`, () => new THREE.SphereGeometry(r, ws, hs));
    const torsoPts = (sc = 1) => [[0.0, -0.22], [0.13, -0.215], [F ? 0.152 : 0.145, -0.16], [(F ? 0.13 : 0.14) * bt.waist, -0.06], [(F ? 0.148 : 0.163) * (bt.waist * 0.5 + bt.chest * 0.5), 0.06], [(F ? 0.162 : 0.185) * bt.chest, 0.14], [(F ? 0.155 : 0.18) * bt.chest, 0.19], [0.12, 0.235], [0.06, 0.255], [0.0, 0.26]].map(([r, y]) => new THREE.Vector2(r * sc, y));
    const torsoGeo = geo('torsoLathe|' + F + '|' + cfg.bodyType, () => new THREE.LatheGeometry(torsoPts(), 32));
    const torso = M(torsoGeo, skin, 0, 1.25, 0); torso.scale.set(1.22 * Bw, 1, (F ? 0.84 : 0.78) * Bw);
    const delt = geo('delt', () => new THREE.SphereGeometry(0.072, 16, 12));
    const dS = bt.delt * (F ? 0.86 : 1); const shX = (F ? 0.198 : 0.215) * Bw;
    M(delt, skin, shX, 1.455, 0).scale.setScalar(dS); M(delt, skin, -shX, 1.455, 0).scale.setScalar(dS);
    const torsoCovered = ['maio', 'macaquinho'].includes(cfg.suit);
    if (bt.belly > 0.05) { const b = M(geo('bellyLathe', () => new THREE.LatheGeometry([[0, -0.09], [0.11, -0.07], [0.135, -0.02], [0.13, 0.04], [0.1, 0.08], [0, 0.095]].map(([r, y]) => new THREE.Vector2(r, y)), 28)), torsoCovered ? null : skin, 0, 1.15, 0.012 + 0.03 * bt.belly); b.scale.set(1.08 * Bw * Math.min(1.15, bt.waist), 0.62 + 0.14 * bt.belly, (0.6 + 0.26 * bt.belly) * Bw); b.userData.belly = true; }
    { const tr = M(sph(0.12, 20, 12), skin, 0, 1.49, -0.012); tr.scale.set(1.45 * Bw * (F ? 0.9 : 1), 0.42, 0.66 * Bw); }
    { const ws = M(geo('waist2', () => new THREE.CylinderGeometry(0.13, 0.142, 0.1, 28)), torsoCovered ? null : skin, 0, 1.075, 0); ws.userData.belly = true; ws.scale.set(1.18 * Bw * Math.min(1.12, bt.waist) * (F ? 0.98 : 1), 1, 0.8 * Bw * (0.92 + 0.08 * Math.min(1.12, bt.waist))); }
    if (!F && (cfg.bodyType === 'atletico' || cfg.bodyType === 'forte')) { const pg = sph(0.07, 14, 10); [-1, 1].forEach(sd => { const p = M(pg, skin, sd * 0.075 * Bw, 1.38, 0.09 * Bw); p.scale.set(1.25, 0.75, 0.45); }); }
    if (F) { const bg = sph(0.056, 18, 14); this._bust = [-1, 1].map(sd => { const p = M(bg, ['maio', 'macaquinho'].includes(cfg.suit) ? null : skin, sd * 0.058 * Bw, 1.375, 0.094 * Bw * bt.chest); p.userData.belly = true; p.scale.set(1.05, 0.82, 0.55); return p; }); }
    const pelvis = M(sph(0.155), skin, 0, 0.98, 0); pelvis.scale.set(1.05 * Bw * hipW, 0.75, (0.8 + (F ? 0.06 : 0)) * Bw);
    M(geo('neck', () => new THREE.CylinderGeometry(0.055, 0.062, 0.12, 14)), skin, 0, 1.53, 0);
    const neck = new THREE.Group(); neck.position.set(0, 1.585, 0); this.model.add(neck); this.j.neck = neck;
    M(sph(0.112, 28, 20), skin, 0, 0.105, 0, neck);
    M(sph(0.022, 10, 8), skin, 0.108, 0.1, 0, neck); M(sph(0.022, 10, 8), skin, -0.108, 0.1, 0, neck);
    { const nk = { fino: [0.8, 1.15, 1], medio: [1, 1, 1], largo: [1.35, 0.95, 1.05] }[cfg.nose || 'medio'] || [1, 1, 1]; M(sph(0.018, 12, 8), skin, 0, 0.082, 0.108, neck).scale.set(nk[0], nk[1], nk[2]); }
    const hairM = this.mat({ color: cfg.hairColor || '#3b2418', roughness: 0.85 });
    const fc = cfg.face || 'sorriso'; const browTilt = { sorriso: 0.12, serio: -0.28, confiante: 0.05, surpreso: 0.3 }[fc] ?? 0.12;
    const brow = geo('brow', () => new THREE.BoxGeometry(0.03, 0.007, 0.01)); [-1, 1].forEach(sd => { const bx = sd * 0.043, by = (fc === 'surpreso' ? 0.128 : 0.124) + (noCap ? 0.012 : 0); const bz = Math.sqrt(Math.max(0, 0.01254 - bx * bx - (by - 0.105) * (by - 0.105))) - 0.001; const b = M(brow, hairM, bx, by, bz, neck); b.rotation.z = -sd * browTilt; b.rotation.y = Math.atan2(bx, bz); b.scale.set(1, 0.85, 0.5); });
    const lipM = this.mat({ color: '#6b2a2a', roughness: 0.6 });
    if (fc === 'surpreso') M(sph(0.012, 10, 8), lipM, 0, 0.058, 0.104, neck).scale.set(1, 1.2, 0.5);
    else if (fc === 'serio') M(geo('mouthF', () => new THREE.BoxGeometry(0.03, 0.004, 0.006)), lipM, 0, 0.06, 0.106, neck);
    else { const mouth = M(geo('mouth', () => new THREE.TorusGeometry(0.02, 0.0035, 5, 12, Math.PI)), lipM, fc === 'confiante' ? 0.006 : 0, 0.058, 0.103, neck); mouth.rotation.z = Math.PI + (fc === 'confiante' ? 0.35 : 0); if (fc === 'confiante') mouth.scale.set(0.8, 0.6, 1); }
    const mk = cfg.mark || 'none';
    if (mk === 'sardas') { const fr = this.mat({ color: '#7a4a2a', roughness: 0.8 }); const fg = geo('freckle', () => new THREE.SphereGeometry(0.0028, 5, 4)); [[-0.05, 0.09], [-0.06, 0.082], [-0.042, 0.078], [0.05, 0.09], [0.06, 0.082], [0.042, 0.078], [-0.03, 0.096], [0.03, 0.096]].forEach(([x, y]) => M(fg, fr, x, y, Math.sqrt(Math.max(0, 0.0125 - x * x - (y - 0.105) * (y - 0.105))) + 0.0005, neck)); }
    if (mk === 'pintura') { const p1 = this.mat({ color: cfg.capColor || '#FFD23F', roughness: 0.5 }), p2 = this.mat({ color: cfg.suitColor || '#0B3D91', roughness: 0.5 }); [-1, 1].forEach(sd => { const x = sd * 0.06; const z = Math.sqrt(Math.max(0, 0.01254 - x * x - 0.0004)) - 0.0035; const a = M(geo('paint2', () => new THREE.BoxGeometry(0.022, 0.006, 0.004)), p1, x, 0.088, z, neck); a.rotation.y = Math.atan2(x, z); const b = M(geo('paint2', () => new THREE.BoxGeometry(0.022, 0.006, 0.004)), p2, x, 0.08, z - 0.0005, neck); b.rotation.y = Math.atan2(x, z); }); }
    if (mk === 'brinco') M(geo('earring', () => new THREE.TorusGeometry(0.008, 0.0022, 6, 14)), this.mat({ color: '#E8B931', metalness: 0.95, roughness: 0.2 }), 0.112, 0.076, 0.004, neck).rotation.y = Math.PI / 2;
    if (cfg.facial === 'rala') { const st = this.mat({ color: cfg.hairColor || '#3b2418', roughness: 0.9, transparent: true, opacity: 0.45 }); M(geo('beard2', () => new THREE.SphereGeometry(0.1135, 28, 12, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.64, Math.PI * 0.3)), st, 0, 0.1, 0.002, neck); }
    if (cfg.facial === 'barba') { const bd = M(geo('beard2', () => new THREE.SphereGeometry(0.1135, 28, 12, Math.PI * 0.08, Math.PI * 0.84, Math.PI * 0.64, Math.PI * 0.3)), hairM, 0, 0.1, 0.002, neck); bd.scale.set(1.01, 1, 1.02); }
    if (cfg.facial === 'cavanhaque') M(geo('goatee', () => new THREE.SphereGeometry(0.03, 12, 8)), hairM, 0, 0.03, 0.095, neck).scale.set(1, 1.3, 0.6);
    if (cfg.facial === 'bigode' || cfg.facial === 'cavanhaque') { const mu = M(geo('mustache', () => new THREE.CapsuleGeometry(0.008, 0.04, 4, 8).rotateZ(Math.PI / 2)), hairM, 0, 0.071, 0.106, neck); mu.scale.set(1, 1, 0.8); }
    const bunM = noCap ? this.mat({ color: cfg.hairColor || '#3b2418', roughness: 0.92 }) : capM;
    if (cfg.hair === 'coque') M(sph(0.055, 16, 12), bunM, 0, 0.175, -0.1, neck).scale.set(1, 0.9, 0.9);
    if (cfg.hair === 'rabo') { const pt = M(cap(0.028, 0.16), hairM, 0, 0.02, -0.12, neck); pt.rotation.x = 0.35; M(sph(0.03, 10, 8), bunM, 0, 0.1, -0.115, neck); }
    if (cfg.hair === 'trancas') [-1, 1].forEach(sd => { const tr = M(cap(0.016, 0.17), hairM, sd * 0.06, 0.0, -0.1, neck); tr.rotation.x = 0.25; tr.rotation.z = sd * 0.15; });
    if (noCap && hz === 'curto') [-1, 1].forEach(sd => { const sb = M(geo('sideburn2', () => new THREE.BoxGeometry(0.004, 0.026, 0.012)), hairM, sd * 0.1065, 0.088, 0.02, neck); sb.rotation.y = sd * 0.2; });

    if (!noCap) { const capMesh = M(geo('capshell2', () => new THREE.SphereGeometry(0.1185, 36, 20, 0, Math.PI * 2, 0, Math.PI * 0.56)), capM, 0, 0.11, -0.004, neck); capMesh.rotation.x = -0.2; capMesh.renderOrder = 1; if (hz === 'afro' || hz === 'cacheado') { capMesh.scale.set(1.06, 1.12, 1.12); capMesh.position.z = -0.012; } }
    else {
      const hm2 = this.mat({ color: cfg.hairColor || '#3b2418', roughness: 0.92 });
      const shell = (r, a, k = 'hs') => M(geo(k + r + a, () => new THREE.SphereGeometry(r, 32, 18, 0, Math.PI * 2, 0, Math.PI * a)), hm2, 0, 0.11, -0.006, neck);
      if (hz === 'raspado') { const sh = shell(0.1145, 0.55); sh.rotation.x = -0.25; sh.material = this.mat({ color: cfg.hairColor || '#3b2418', roughness: 1, transparent: true, opacity: 0.55 }); }
      else if (hz === 'afro') { const a = M(sph(0.16, 28, 20), hm2, 0, 0.16, -0.03, neck); a.scale.set(1, 0.92, 0.95); }
      else if (hz === 'cacheado') { shell(0.12, 0.6).rotation.x = -0.2; const cg = sph(0.034, 10, 8); for (let k = 0; k < 16; k++) { const th = k / 16 * Math.PI * 2; M(cg, hm2, 0.1 * Math.cos(th), 0.15 + 0.03 * Math.sin(k * 2.1), -0.02 + 0.09 * Math.sin(th) - (Math.sin(th) > 0.6 ? 0.05 : 0), neck); } }
      else { const sh = shell(0.119, hz === 'longo' ? 0.62 : 0.56); sh.rotation.x = -0.22; }
      if (hz === 'franja' || hz === 'longo') { const fr = M(geo('fringe', () => new THREE.SphereGeometry(0.121, 24, 8, -Math.PI * 0.32, Math.PI * 0.64, Math.PI * 0.2, Math.PI * 0.16)), hm2, 0, 0.11, 0, neck); fr.rotation.y = 0; }
      if (hz === 'longo') { const bk = M(geo('longback', () => new THREE.CylinderGeometry(0.1, 0.085, 0.2, 20, 1, true, Math.PI * 0.55, Math.PI * 0.9)), hm2, 0, 0.02, -0.03, neck); bk.material.side = THREE.DoubleSide; }
    }
    const gy = 0.108, R0 = 0.112; const gz = x => Math.sqrt(Math.max(0, R0 * R0 - x * x - (gy - 0.105) * (gy - 0.105)));
    const lg = geo('lens2', () => { const g = new THREE.SphereGeometry(0.027, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42); g.rotateX(Math.PI / 2); g.scale(1.12, 0.82, 0.55); return g; });
    const rim = geo('lensrim2', () => { const g = new THREE.TorusGeometry(0.027, 0.0042, 6, 22); g.scale(1.12, 0.82, 1); return g; });
    [-1, 1].forEach(sd => { const x = sd * 0.04; const z = gz(x) + 0.001; const yaw = Math.atan2(x, z);
      const l = M(lg, lens, x, gy, z - 0.006, neck); l.rotation.y = yaw; l.renderOrder = 3;
      const r = M(rim, dark, x, gy, z + 0.001, neck); r.rotation.y = yaw; });
    const bridge = M(geo('gbridge', () => new THREE.CylinderGeometry(0.003, 0.003, 0.024, 6).rotateZ(Math.PI / 2)), dark, 0, gy + 0.004, gz(0) + 0.006, neck);
    const strap = M(geo('strap3', () => new THREE.TorusGeometry(0.1205, 0.0052, 6, 56)), dark, 0, gy, -0.004, neck); strap.rotation.x = Math.PI / 2;
    if (noCap && (hz === 'afro' || hz === 'cacheado')) { strap.visible = false; const sides = M(geo('strapFront', () => new THREE.TorusGeometry(0.1205, 0.0052, 6, 36, Math.PI * 1.0)), dark, 0, gy, -0.004, neck); sides.rotation.x = -Math.PI / 2; const back = M(geo('strapBack', () => new THREE.TorusGeometry(0.15, 0.0055, 6, 36, Math.PI)), dark, 0, gy + 0.02, -0.006, neck); back.rotation.x = Math.PI / 2; back.scale.set(0.8, 1, 1); }
    this.hatGroup = new THREE.Group(); neck.add(this.hatGroup);
    if (cfg.hat && cfg.hat !== 'none') {
      const hm = this.mat({ color: cfg.hatColor, roughness: 0.7 });
      const accent = this.mat({ color: cfg.capColor, roughness: 0.6 });
      if (cfg.hat === 'balde') {
        M(geo('bucket', () => new THREE.CylinderGeometry(0.1, 0.125, 0.11, 28, 1, false)), hm, 0, 0.19, 0, this.hatGroup);
        M(geo('bucketbrim', () => new THREE.CylinderGeometry(0.19, 0.2, 0.012, 32)), hm, 0, 0.135, 0, this.hatGroup);
       } else {
        if (cfg.hat !== 'viseira') M(geo('crown', () => new THREE.SphereGeometry(0.126, 28, 14, 0, Math.PI * 2, 0, Math.PI * 0.5)), hm, 0, 0.128, 0, this.hatGroup);
        else { const band = M(geo('vband', () => new THREE.TorusGeometry(0.118, 0.016, 8, 32)), hm, 0, 0.165, 0, this.hatGroup); band.rotation.x = Math.PI / 2; }
        M(geo('button', () => new THREE.SphereGeometry(0.014, 8, 6)), accent, 0, 0.255, 0, this.hatGroup).visible = cfg.hat !== 'viseira';
        const brim = M(geo('brim', () => new THREE.CylinderGeometry(0.1, 0.1, 0.012, 28, 1, false, -Math.PI / 2, Math.PI)), cfg.hat === 'viseira' ? hm : accent, 0, 0.14, cfg.hat === 'bone-tras' ? -0.105 : 0.105, this.hatGroup);
        brim.scale.set(1, 1, 0.95); brim.rotation.y = cfg.hat === 'bone-tras' ? Math.PI : 0; brim.rotation.x = cfg.hat === 'bone-tras' ? -0.1 : 0.1;
      }
    }
    this.phones = [];
    if (cfg.headphones) {
      const pm = this.mat({ color: cfg.phonesColor, roughness: 0.35, metalness: 0.2 });
      this.phones.push(M(geo('band', () => new THREE.TorusGeometry(0.13, 0.012, 8, 32, Math.PI)), pm, 0, 0.11, 0, neck));
      const cup = geo('cup', () => new THREE.CylinderGeometry(0.044, 0.044, 0.034, 20).rotateZ(Math.PI / 2));
      this.phones.push(M(cup, dark, 0.126, 0.1, 0, neck), M(cup, dark, -0.126, 0.1, 0, neck));
    }
    const arm = (side) => {
      const sh = new THREE.Group(); sh.position.set(side * (F ? 0.218 : 0.235) * Bw, 1.47, 0); this.model.add(sh);
      M(cap(0.056, 0.2), skin, 0, -0.158, 0, sh).scale.set(Lb * (1 + 0.12 * (bt.delt - 1)), 1, Lb * (1 + 0.12 * (bt.delt - 1)));
      const el = new THREE.Group(); el.position.y = -0.3; sh.add(el);
      M(sph(0.046, 12, 8), skin, 0, 0, 0, el).scale.setScalar(Lb);
      M(cap(0.047, 0.19), skin, 0, -0.14, 0, el).scale.set(Lb, 1, Lb);
      const hand = M(sph(0.05, 14, 10), skin, 0, -0.3, 0, el); hand.scale.set(0.8, 1.25, 0.45);
      return { sh, el };
    };
    const L = arm(1), R = arm(-1);
    Object.assign(this.j, { shL: L.sh, elL: L.el, shR: R.sh, elR: R.el });
    if (cfg.watch) { const w = M(geo('watch', () => new THREE.BoxGeometry(0.058, 0.034, 0.06)), this.mat({ color: '#111', roughness: 0.3, metalness: 0.6 }), 0, -0.235, 0, L.el); M(geo('watchface', () => new THREE.BoxGeometry(0.04, 0.036, 0.03)), this.mat({ color: cfg.capColor, emissive: cfg.capColor, emissiveIntensity: 0.6 }), 0, -0.235, 0.02, L.el); w.userData.watch = true; }
    const leg = (side) => {
      const hp = new THREE.Group(); hp.position.set(side * 0.088 * Bw * hipW, 0.94, 0); this.model.add(hp);
      const tw = Lb * (F ? 1.06 : 1) * (cfg.bodyType === 'gordinho' ? 1.1 : 1); M(sph(0.08, 16, 12), skin, 0, -0.03, 0, hp).scale.setScalar(tw); M(cap(0.078, 0.28), skin, 0, -0.21, 0, hp).scale.set(tw, 1, tw);
      const kn = new THREE.Group(); kn.position.y = -0.44; hp.add(kn);
      M(sph(0.058, 12, 8), skin, 0, 0, 0.004, kn).scale.setScalar(Lb);
      M(cap(0.058, 0.3), skin, 0, -0.2, 0, kn).scale.set(Lb, 1, Lb);
      const calf = M(sph(0.05, 12, 10), skin, 0, -0.14, -0.02, kn); calf.scale.set(Lb * 1.02, 1.8, Lb * 1.05);
      const an = new THREE.Group(); an.position.y = -0.42; kn.add(an);
      M(geo('foot', () => new THREE.BoxGeometry(0.085, 0.05, 0.22)), skin, 0, -0.025, 0.055, an);
      return { hp, kn, an };
    };
    const LL = leg(1), RL = leg(-1);
    Object.assign(this.j, { hipL: LL.hp, knL: LL.kn, anL: LL.an, hipR: RL.hp, knR: RL.kn, anR: RL.an });
    const band = M(geo('bandLathe', () => new THREE.LatheGeometry([[0.0, -0.135], [0.07, -0.13], [0.13, -0.095], [0.16, -0.045], [0.168, 0.0], [0.165, 0.035], [0.158, 0.062]].map(([r, y]) => new THREE.Vector2(r, y)), 32)), suit, 0, 0.98, 0);
    const pelX = 0.155 * 1.05 * hipW, pelZ = 0.155 * (0.8 + (F ? 0.06 : 0));
    const wX = 0.142 * 1.18 * Math.min(1.12, bt.waist) * (F ? 0.98 : 1), wZ = 0.142 * 0.8 * (0.92 + 0.08 * Math.min(1.12, bt.waist));
    const thX = 0.088 * hipW + 0.08 * TW;
    const bandX = Math.min(1.22, Math.max(pelX, wX, thX) * 1.04 / 0.168), bandZ = Math.min(1.08, Math.max(pelZ, wZ) * 1.05 / 0.168);
    band.scale.set(bandX * Bw, 1, bandZ * Bw);
    const s = cfg.suit;
    const plain = this.mat({ color: cfg.suitColor, roughness: 0.32, metalness: 0.08 });
    this.model.children.forEach(o => { if (o.userData.belly && (!o.material || o.material === suit)) o.material = plain; });
    if (F && !['maio', 'macaquinho'].includes(s)) { const topM = M(geo('croptop|' + cfg.bodyType, () => new THREE.LatheGeometry(torsoPts(1.03).slice(4, 7), 32)), suit, 0, 1.25, 0); topM.scale.set(1.22 * Bw, 1, (F ? 0.88 : 0.78) * Bw); if (this._bust) this._bust.forEach(b => { b.visible = false; }); }
    if (s === 'maio' || s === 'macaquinho') {
      const top = M(geo('suittop|' + F + '|' + cfg.bodyType, () => new THREE.LatheGeometry(torsoPts(1.025).slice(0, 7), 32)), suit, 0, 1.25, 0); top.scale.set(1.22 * Bw, 1, (F ? 0.86 : 0.78) * Bw);
      if (this._bust) this._bust.forEach(b => { b.visible = false; });
    }
    const thighShell = (hp, loose) => {
      const g = loose ? geo('bermudash', () => new THREE.CylinderGeometry(0.105, 0.1, 0.36, 22, 1, true)) : geo('jammersh', () => new THREE.CapsuleGeometry(0.083, 0.24, 6, 18));
      const sh = M(g, suit, 0, loose ? -0.16 : -0.17, 0, hp); const k = TW * (loose ? 1.08 : 1.14); sh.scale.set(k, 1, k);
    };
    if (s === 'jammer' || s === 'macaquinho') { thighShell(LL.hp, false); thighShell(RL.hp, false); }
    if (s === 'bermuda') { thighShell(LL.hp, true); thighShell(RL.hp, true); }
    if (cfg.towel) {
      const tm = this.mat({ color: cfg.towelColor, roughness: 0.95 });
      const ring = M(geo('towelring', () => new THREE.TorusGeometry(0.11, 0.038, 10, 26)), tm, 0, 1.54, 0); ring.rotation.x = Math.PI / 2 - 0.25; ring.scale.set(1.25, 1, 1); ring.userData.dry = true;
      const strip = geo('towelstrip', () => new THREE.BoxGeometry(0.08, 0.34, 0.03));
      const a = M(strip, tm, 0.08, 1.37, 0.128); a.rotation.z = 0.08; const b = M(strip, tm, -0.08, 1.37, 0.128); b.rotation.z = -0.08; a.userData.dry = b.userData.dry = true;
    }
    if (cfg.medal && cfg.medal !== 'none') {
      const col = { ouro: '#E8B931', prata: '#C9D2DA', bronze: '#C07A43' }[cfg.medal] || '#E8B931';
      const mm = this.mat({ color: col, metalness: 0.95, roughness: 0.22 });
      const rib = this.mat({ color: '#0B3D91', roughness: 0.8 });
      const rg = geo('ribbon', () => new THREE.BoxGeometry(0.022, 0.24, 0.006));
      const r1 = M(rg, rib, 0.05, 1.39, 0.13); r1.rotation.z = 0.36; const r2 = M(rg, rib, -0.05, 1.39, 0.13); r2.rotation.z = -0.36;
      const md = M(geo('medal', () => new THREE.CylinderGeometry(0.045, 0.045, 0.009, 26).rotateX(Math.PI / 2)), mm, 0, 1.265, 0.14);
      r1.userData.dry = r2.userData.dry = md.userData.dry = true;
    }
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; } });
    this.dry = this.model.children.filter(o => o.userData.dry);
    this.setHat(this.hatVisible);
  }
  setHat(v) { this.hatVisible = v; if (this.hatGroup) this.hatGroup.visible = v; if (this.dry) for (const o of this.dry) o.visible = v; if (this.phones) for (const o of this.phones) o.visible = v; }
  dispose() { for (const m of this.mats) m.dispose(); this.mats = []; this.root.removeFromParent(); }
}

const Q1 = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), Q3 = new THREE.Quaternion(), V1 = new THREE.Vector3();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0);
export const Q_FRONT = new THREE.Quaternion();
export const Q_STAND = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI / 2, 0));
export const Q_PRONE = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, -Math.PI / 2, 'XYZ'));
export const Q_SUPINE = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, -Math.PI / 2, 'XYZ'));
export function orient(sw, base, pitch = 0, roll = 0, yaw = 0) {
  Q1.setFromAxisAngle(AY, yaw); Q2.setFromAxisAngle(AX, pitch); Q3.setFromAxisAngle(AY, roll);
  sw.body.quaternion.copy(base).multiply(Q1).multiply(Q2).multiply(Q3);
}
const TAU = Math.PI * 2;
const clamp01 = x => Math.max(0, Math.min(1, x));
const ss = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function joints(sw, o) {
  const j = sw.j;
  j.shL.rotation.set(o.shLx || 0, o.shLy || 0, o.shLz ?? 0.08);
  j.shR.rotation.set(o.shRx || 0, o.shRy || 0, o.shRz ?? -0.08);
  j.elL.rotation.set(o.elLx || 0, 0, 0); j.elR.rotation.set(o.elRx || 0, 0, 0);
  j.hipL.rotation.set(o.hipLx || 0, 0, o.hipLz || 0); j.hipR.rotation.set(o.hipRx || 0, 0, o.hipRz || 0);
  j.knL.rotation.set(o.knLx || 0, 0, 0); j.knR.rotation.set(o.knRx || 0, 0, 0);
  j.anL.rotation.set(o.anLx || 0, 0, 0); j.anR.rotation.set(o.anRx || 0, 0, 0);
  j.neck.rotation.set(o.nx || 0, o.ny || 0, o.nz || 0);
}
export function pose(sw, name, t = 0, phase = 0, extra = {}) {
  const o = {}; let y = 0, pitch = 0, roll = 0;
  const kick = (amp, f) => { o.hipLx = amp * Math.sin(f); o.hipRx = -amp * Math.sin(f); o.knLx = 0.22 * (1 + Math.sin(f + 0.8)); o.knRx = 0.22 * (1 - Math.sin(f + 0.8)); o.anLx = o.anRx = 1.35; };
  switch (name) {
    case 'stand': {
      const b = Math.sin(t * 1.6) * 0.04;
      Object.assign(o, { shLx: b, shRx: -b, shLz: 0.1, shRz: -0.1, elLx: -0.14, elRx: -0.14, knLx: 0.03, knRx: 0.03, nx: 0.02 * Math.sin(t * 0.7) });
      break;
    }
    case 'warmup': {
      const a = (t * 5.2) % TAU;
      Object.assign(o, { shLx: -a, shRx: -(a + Math.PI), shLz: 0.18, shRz: -0.18, knLx: 0.08 + 0.06 * Math.sin(t * 10.4), knRx: 0.08 + 0.06 * Math.sin(t * 10.4) });
      y = 0.02 * Math.sin(t * 10.4);
      break;
    }
    case 'shake': {
      const a = Math.sin(t * 14) * 0.25;
      Object.assign(o, { shLx: 0.2 + a, shRx: 0.2 - a, shLz: 0.35, shRz: -0.35, elLx: -0.3, elRx: -0.3, knLx: 0.12, knRx: 0.12 });
      y = 0.03 * Math.abs(Math.sin(t * 7));
      break;
    }
    case 'ready': {
      Object.assign(o, { shLx: -1.0, shRx: -1.0, shLz: 0.12, shRz: -0.12, elLx: -0.1, elRx: -0.1, hipLx: -1.05, hipRx: -0.75, knLx: 0.8, knRx: 0.55, anLx: -0.15, anRx: 0.1, nx: 0.25 });
      pitch = 1.1;
      break;
    }
    case 'backready': {
      Object.assign(o, { shLx: -2.2, shRx: -2.2, shLz: 0.2, shRz: -0.2, elLx: -1.2, elRx: -1.2, hipLx: -1.6, hipRx: -1.6, knLx: 1.9, knRx: 1.9, anLx: 0.5, anRx: 0.5, nx: -0.3 });
      break;
    }
    case 'stream': {
      const k = extra.kick || 0;
      Object.assign(o, { shLx: -Math.PI, shRx: -Math.PI, shLz: -0.09, shRz: 0.09, nx: 0.2, anLx: 1.45, anRx: 1.45 });
      if (k) { const f = t * 11; o.hipLx = o.hipRx = 0.22 * Math.sin(f); o.knLx = o.knRx = 0.35 * Math.max(0, Math.sin(f + 0.9)); pitch = 0.05 * Math.sin(f - 0.6); }
      break;
    }
    case 'tuck': {
      Object.assign(o, { shLx: -0.5, shRx: -0.5, shLz: 0.2, shRz: -0.2, elLx: -1.4, elRx: -1.4, hipLx: -2.1, hipRx: -2.1, knLx: 2.3, knRx: 2.3, anLx: 0.9, anRx: 0.9, nx: 0.7 });
      break;
    }
    case 'free': {
      const a = phase % TAU, b = (phase + Math.PI) % TAU;
      const elb = x => x > Math.PI ? -1.45 * Math.sin(x - Math.PI) : -0.55 * Math.sin(x);
      Object.assign(o, { shLx: a - Math.PI, shRx: b - Math.PI, shLz: 0.14, shRz: -0.14, elLx: elb(a), elRx: elb(b) });
      kick(0.3, phase * 3);
      const breath = Math.pow(Math.max(0, Math.sin(phase / 2)), 8);
      o.ny = 1.15 * breath; o.nx = 0.15;
      roll = 0.55 * Math.sin(phase);
      break;
    }
    case 'back': {
      const a = phase % TAU, b = (phase + Math.PI) % TAU;
      const elb = x => x < Math.PI ? 1.3 * Math.sin(x) : 0;
      Object.assign(o, { shLx: Math.PI - a, shRx: Math.PI - b, shLz: 0.16, shRz: -0.16, elLx: elb(a), elRx: elb(b), nx: -0.15 });
      kick(0.3, phase * 3);
        roll = 0.45 * Math.sin(phase);
      break;
    }
    case 'breast': {
      const u = (phase / TAU) % 1;
      const out = ss(0.22, 0.45, u), ins = ss(0.45, 0.62, u), rec = ss(0.62, 0.8, u);
      const sweepX = -Math.PI + 1.25 * ins * (1 - rec);
      const abd = 0.75 * out * (1 - ins) + 0.25 * ins * (1 - rec) + 0.05;
      const elb = -1.7 * ins * (1 - rec);
      Object.assign(o, { shLx: sweepX, shRx: sweepX, shLz: abd, shRz: -abd, elLx: elb, elRx: elb });
      const lr = ss(0.5, 0.72, u), lk = ss(0.72, 0.88, u);
      const hipF = -0.75 * lr * (1 - lk), kneeF = 2.05 * lr * (1 - lk), hipA = 0.28 * lr + 0.2 * Math.sin(Math.PI * lk) - 0.28 * lk;
      Object.assign(o, { hipLx: hipF, hipRx: hipF, knLx: kneeF, knRx: kneeF, hipLz: hipA, hipRz: -hipA, anLx: lr > 0.1 && lk < 0.6 ? -0.3 : 1.35, anRx: lr > 0.1 && lk < 0.6 ? -0.3 : 1.35 });
      const bump = Math.sin(Math.PI * ss(0.4, 0.72, u));
      y = 0.12 * bump; pitch = -0.28 * bump; o.nx = -0.25 * bump;
      break;
    }
    case 'fly': {
      const a = phase % TAU;
      const rec = a > Math.PI ? Math.sin(a - Math.PI) : 0;
      Object.assign(o, { shLx: a - Math.PI, shRx: a - Math.PI, shLz: 0.12 + 0.55 * rec, shRz: -0.12 - 0.55 * rec, elLx: a < Math.PI ? -0.6 * Math.sin(a) : -0.2 * rec, elRx: a < Math.PI ? -0.6 * Math.sin(a) : -0.2 * rec });
      const f = phase * 2 + 1.2;
      o.hipLx = o.hipRx = 0.38 * Math.sin(f); o.knLx = o.knRx = 0.6 * Math.max(0, Math.sin(f - 0.7)); o.anLx = o.anRx = 1.35;
      pitch = 0.2 * Math.sin(phase * 2 + 0.3); y = 0.06 * Math.sin(phase * 2 - 0.4);
      o.nx = -0.35 * Math.max(0, Math.sin(a - Math.PI * 0.6));
      break;
    }
    case 'tread': {
      const s = Math.sin(t * 3.2);
      Object.assign(o, { shLx: -0.45, shRx: -0.45, shLz: 1.15 + 0.22 * s, shRz: -1.15 - 0.22 * s, elLx: -0.9, elRx: -0.9, hipLx: -0.35 + 0.3 * Math.sin(t * 2.4), hipRx: -0.35 - 0.3 * Math.sin(t * 2.4), knLx: 0.9 + 0.4 * Math.sin(t * 2.4), knRx: 0.9 - 0.4 * Math.sin(t * 2.4) });
      y = 0.03 * Math.sin(t * 2.4);
      break;
    }
    case 'celebrate': {
      const k = extra.kind || 'punho';
      if (k === 'punho') { const p = Math.sin(t * 8); Object.assign(o, { shRx: -Math.PI + 0.25 + 0.22 * p, shRz: -0.15, elRx: -0.5 - 0.35 * p, shLx: -0.4, shLz: 0.7, elLx: -0.8 }); }
      else if (k === 'bracos') { const p = Math.sin(t * 4); Object.assign(o, { shLx: -Math.PI + 0.12, shLz: 0.55 + 0.08 * p, shRx: -Math.PI + 0.12, shRz: -0.55 - 0.08 * p, elLx: -0.1, elRx: -0.1, nx: -0.3 }); }
      else if (k === 'aponta') { Object.assign(o, { shRx: -2.35, shRz: -0.1, elRx: -0.05, shLx: -0.3, shLz: 0.55, elLx: -0.6, ny: 0.25, nx: -0.25 }); }
      else { const p = 0.5 + 0.5 * Math.sin(t * 9); Object.assign(o, { shLx: -Math.PI + 1.6 * p, shRx: -Math.PI + 1.6 * p, shLz: 0.35, shRz: -0.35, elLx: -0.2, elRx: -0.2, nx: -0.2 }); }
      if (extra.inWater) { o.hipLx = -0.35 + 0.3 * Math.sin(t * 2.4); o.hipRx = -0.35 - 0.3 * Math.sin(t * 2.4); o.knLx = o.knRx = 0.9; }
      y = extra.inWater ? 0.05 * Math.sin(t * 2.4) + 0.08 : 0.04 * Math.abs(Math.sin(t * 4));
      break;
    }
  }
  joints(sw, o);
  return { y, pitch, roll };
}
export function groundFeet(sw, floorY) {
  sw.root.updateMatrixWorld(true);
  const a = sw.j.anL.getWorldPosition(V1).y; const b = sw.j.anR.getWorldPosition(new THREE.Vector3()).y;
  const low = Math.min(a, b) - 0.045 * sw.H;
  sw.body.position.y += floorY - low;
}

export class AvatarViewer {
  constructor(el) {
    this.el = el; this.poseName = 'stand'; this.yaw = -0.5; this.vyaw = 0; this.auto = true; this.zoom = 1;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.1;
    r.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
    el.appendChild(r.domElement);
    const s = this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
    s.add(new THREE.HemisphereLight('#cfeaff', '#0b2540', 1.1));
    const key = new THREE.DirectionalLight('#ffffff', 2.2); key.position.set(2.5, 4, 3); s.add(key);
    const rim = new THREE.DirectionalLight('#2FE0F0', 1.6); rim.position.set(-3, 2.5, -3); s.add(rim);
    const fill = new THREE.DirectionalLight('#FFD23F', 0.5); fill.position.set(-2, 0.5, 3); s.add(fill);
    const tile = canvasTex('podiumtile', 512, 512, (g, w, h) => {
      g.fillStyle = '#0e3a5a'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(160,230,255,.25)'; g.lineWidth = 3;
      for (let i = 0; i <= w; i += 32) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, h); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(w, i); g.stroke(); }
      g.fillStyle = '#071a2e'; g.fillRect(w / 2 - 18, 40, 36, h - 80); g.fillRect(w / 2 - 90, 40, 180, 30); g.fillRect(w / 2 - 90, h - 70, 180, 30);
    });
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.9, 0.2, 64), [new THREE.MeshStandardMaterial({ color: '#0a2238', roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: tile, roughness: 0.35 }), new THREE.MeshStandardMaterial({ color: '#0a2238' })]);
    top.position.y = -0.1; s.add(top);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.012, 8, 96), new THREE.MeshBasicMaterial({ color: '#2FE0F0' })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.002; s.add(ring);
    const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.006, 8, 96), new THREE.MeshBasicMaterial({ color: '#FFD23F', transparent: true, opacity: 0.5 })); ring2.rotation.x = Math.PI / 2; ring2.position.y = -0.19; s.add(ring2);
    this.ring2 = ring2;
    this.sw = new Swimmer(DEFAULT_AVATAR); s.add(this.sw.root);
    this.water = new THREE.Mesh(new THREE.CircleGeometry(0.84, 64), new THREE.MeshStandardMaterial({ color: '#2FE0F0', transparent: true, opacity: 0.0, roughness: 0.1, metalness: 0.2 }));
    this.water.rotation.x = -Math.PI / 2; this.water.position.y = 0.55; s.add(this.water);
    let down = false, lx = 0;
    const cv = r.domElement;
    cv.addEventListener('pointerdown', e => { down = true; lx = e.clientX; this.auto = false; cv.setPointerCapture(e.pointerId); cv.style.cursor = 'grabbing'; });
    cv.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - lx; lx = e.clientX; this.vyaw = dx * 0.01; this.yaw += dx * 0.01; });
    cv.addEventListener('pointerup', () => { down = false; cv.style.cursor = 'grab'; clearTimeout(this._ai); this._ai = setTimeout(() => { this.auto = true; }, 3500); });
    cv.addEventListener('wheel', e => { e.preventDefault(); this.zoom = Math.max(0.6, Math.min(1.5, this.zoom * (1 + e.deltaY * 0.001))); }, { passive: false });
   this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(el); this.resize();
    this._last = performance.now(); this.active = true; this.t = 0;
    const loop = () => { this.raf = requestAnimationFrame(loop); if (!this.active) return; const now = performance.now(); const dt = Math.min(0.05, (now - this._last) / 1000); this._last = now; this.frame(dt); };
    loop();
  }
  setConfig(cfg) { this.sw.setConfig(cfg); }
  setPose(p) { this.poseName = p; }
  setActive(v) { this.active = v; if (v) { this._last = performance.now(); this.resize(); } }
  resize() { const w = this.el.clientWidth || 1, h = this.el.clientHeight || 1; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); }
  frame(dt) {
    this.t += dt;
    if (this.auto) this.yaw += dt * 0.35; else { this.yaw += this.vyaw * 0.0; this.vyaw *= 0.9; }
    const sw = this.sw, p = this.poseName, t = this.t;
    sw.root.rotation.y = this.yaw; sw.body.position.set(0, 0, 0);
    sw.setHat(p !== 'free');
    if (p === 'free') {
      const ph = t * 4.2; const r = pose(sw, 'free', t, ph);
      orient(sw, Q_PRONE, r.pitch, r.roll); sw.body.position.set(0, 0.72 + r.y, 0);
      this.water.material.opacity = 0;
    } else {
      this.water.material.opacity = 0;
      const r = pose(sw, p === 'celebrate' ? 'celebrate' : p, t, 0, { kind: sw.cfg.celebration });
      orient(sw, Q_FRONT, r.pitch, 0, 0);
      sw.body.position.y = 1.2 * sw.H + r.y;
      groundFeet(sw, 0);
    }
    this.ring2.scale.setScalar(1 + 0.03 * Math.sin(t * 2));
    const d = (p === 'free' ? 5.4 : 3.95) * this.zoom;
    this.camera.position.set(0, 1.2 + 0.12 * this.zoom, d); this.camera.lookAt(0, p === 'free' ? 0.72 : 0.9, 0);
    this.renderer.render(this.scene, this.camera);
  }
  dispose() { cancelAnimationFrame(this.raf); this.ro.disconnect(); this.renderer.dispose(); this.renderer.domElement.remove(); }
}

export function genericAvatar(seed, sex, color, sigla) {
  const r = (n) => { const x = Math.sin(seed * 9301 + n * 49297) * 233280; return x - Math.floor(x); };
  const pick = (arr, n) => arr[Math.floor(r(n) * arr.length) % arr.length];
  const F = sex === 'F'; const gogs = Object.keys(GOGGLES); const team = [color, '#0d1726', '#f4f7fb', '#FFD23F', '#FF5468'];
  return {
    name: '', sigla: sigla || '', team: '', sex, frame: F ? 'F' : 'M', gender: F ? 'mulher' : 'homem',
    skin: pick(SKINS, 1), height: F ? 0.92 + r(2) * 0.1 : 0.95 + r(2) * 0.12, build: 0.9 + r(3) * 0.22,
    bodyType: pick(['atletico', 'atletico', 'atletico', 'medio', 'medio', 'magro', 'forte', 'gordinho'], 11),
    suit: F ? pick(['maio', 'maio', 'macaquinho'], 4) : pick(['jammer', 'jammer', 'sunga', 'sunga', 'bermuda'], 4),
    suitColor: r(5) > 0.45 ? color : pick(team, 15), suitColor2: r(16) > 0.5 ? color : pick(team, 17), pattern: pick(PATTERNS, 6).id,
    cap: pick(CAPS.filter(c => c.id !== 'sem'), 7).id, capColor: r(8) > 0.4 ? color : pick(team, 18), capColor2: pick(['#0b1220', '#f4f7fb', '#FFD23F'], 19), capText: sigla || '',
    goggles: pick(gogs, 9), hat: 'none', headphones: false, towel: false, watch: r(20) > 0.8, medal: 'none', celebration: pick(CELEBRATIONS, 10).id,
    hair: F ? pick(['coque', 'rabo', 'trancas', 'curto', 'coque'], 12) : pick(['curto', 'curto', 'raspado', 'coque', 'curto'], 12), hairColor: pick(HAIR_COLORS.slice(0, 7), 13),
    facial: F ? 'none' : pick(['none', 'none', 'none', 'barba', 'rala', 'cavanhaque', 'bigode'], 14),
    face: pick(FACES, 21).id, nose: pick(NOSES, 22).id, mark: pick(['none', 'none', 'none', 'sardas', 'pintura', 'brinco'], 23)
  };
}
