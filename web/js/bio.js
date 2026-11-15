import { EVENTS } from './core.js';

export const PHASES = [
  { k: 'rt', label: 'Reação', c: '#3d556e' }, { k: 'flight', label: 'Voo', c: '#eaf6ff' },
  { k: 'uw', label: 'Submerso', c: '#2FE0F0' }, { k: 'swim', label: 'Nado', c: '#2b7bc0' }, { k: 'wall', label: 'Virada', c: '#FFD23F' }
];
export const PHASE_C = Object.fromEntries(PHASES.map(p => [p.k, p.c]));
export const STROKE_NAME = { L: 'Livre', C: 'Costas', P: 'Peito', B: 'Borboleta' };

export const PRO_TIME = {
  M: { '50L': 21.6, '50C': 24.4, '50P': 26.8, '50B': 23.0, '100L': 47.6, '200L': 105.3, '400L': 224.5, '100M': 51.5 },
  F: { '50L': 24.3, '50C': 27.6, '50P': 30.0, '50B': 25.4, '100L': 53.0, '200L': 115.5, '400L': 242.0, '100M': 57.8 }
};
const SC_GAIN = { 50: 0.025, 100: 0.03, 200: 0.035, 400: 0.04 };
export const PRO = {
  L: { rt: [0.64, 0.67], xe: [3.4, 3.1], boS: [13.0, 11.5], boT: [8.0, 6.5], ve: [4.4, 4.0], vk: [2.2, 1.95], vp: [3.1, 2.8], flip: true },
  C: { rt: [0.56, 0.59], xe: [1.6, 1.4], boS: [14.0, 13.0], boT: [12.0, 10.5], ve: [3.2, 2.9], vk: [2.05, 1.85], vp: [3.0, 2.7], flip: true },
  B: { rt: [0.64, 0.67], xe: [3.4, 3.1], boS: [13.5, 12.0], boT: [10.0, 8.5], ve: [4.4, 4.0], vk: [2.15, 1.9], vp: [3.0, 2.7], flip: false },
  P: { rt: [0.64, 0.67], xe: [3.4, 3.1], boS: [10.5, 9.5], boT: [9.0, 8.0], ve: [4.2, 3.8], vk: [1.75, 1.55], vp: [2.8, 2.5], flip: false }
};
export const PRO_SR = {
  M: { L: { 50: 61, 100: 51, 200: 44, 400: 41 }, C: { 50: 55, 100: 48 }, P: { 50: 58, 100: 52 }, B: { 50: 58, 100: 52 } },
  F: { L: { 50: 60, 100: 53, 200: 46, 400: 44 }, C: { 50: 54, 100: 48 }, P: { 50: 60, 100: 54 }, B: { 50: 59, 100: 53 } }
};
export const PRO_WALL = { flip: 0.3, open: 0.65 };
const TAKEOVER = [0.22, 0.25];
const IM_SPEED = { B: 1.0, C: 0.93, P: 0.8, L: 1.06 };
const H = 0.1;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ss = u => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
const S_ = s => s === 'F' ? 'F' : 'M';

export function legOrder(code) { const ev = EVENTS[code]; if (!ev || ev.stroke !== 'M') return null; return ev.relay ? ['C', 'P', 'B', 'L'] : ['B', 'C', 'P', 'L']; }
export function strokeOf(code, d, dist) { const o = legOrder(code); if (!o) return EVENTS[code] ? EVENTS[code].stroke : 'L'; return o[Math.min(3, Math.floor(d / (dist / 4)))]; }

export function proTime(code, sex, poolLen = 50) {
  const ev = EVENTS[code]; const S = S_(sex); if (!ev) return null;
  if (ev.relay) return proLegTimes(code, S, poolLen).reduce((a, b) => a + b, 0);
  const base = PRO_TIME[S][code];
  if (code === '100M') return poolLen === 50 ? base * 1.03 : base;
  return poolLen === 25 ? base * (1 - (SC_GAIN[ev.dist] || 0.03)) : base;
}
export function proLegTimes(code, sex, poolLen = 50) {
  const S = S_(sex); const f = c => proTime(c, S, poolLen); const fly = 0.55;
  if (code === '4x50L') return [f('50L'), f('50L') - fly * 0.95, f('50L') - fly * 1.05, f('50L') - fly * 0.9];
  return [f('50C'), f('50P') - fly, f('50B') - fly, f('50L') - fly];
}
function genericPro(stroke, dist, sex) { const T50 = PRO_TIME[S_(sex)]['50' + stroke] || PRO_TIME[S_(sex)]['50L']; return T50 * Math.pow(dist / 50, 1.11); }
function srPro(S, stroke, dClass) { const t = PRO_SR[S][stroke] || PRO_SR[S].L; if (t[dClass]) return t[dClass]; const ks = Object.keys(t).map(Number).sort((a, b) => a - b); let best = ks[0]; for (const k of ks) if (k <= dClass) best = k; return t[best]; }
function pace(dl, dist, a) {
  const u = dl / dist;
  if (dist <= 50) return 1.02 - (0.05 + 0.1 * a) * u;
  if (dist <= 100) return 1.03 - (0.07 + 0.12 * a) * u;
  if (dist <= 200) return 1 + 0.025 * Math.exp(-dl / 25) - (0.05 + 0.08 * a) * u + 0.035 * ss((dl - dist + 50) / 50);
  return 1 + 0.02 * Math.exp(-dl / 40) - (0.04 + 0.06 * a) * u + 0.04 * ss((dl - dist + 50) / 50);
}

function buildLeg({ dist, strokeFn, poolLen, S, T, q, start, rt: rtOv, dClass, im, proLeg, ov = {} }) {
  const si = S === 'F' ? 1 : 0; const a = clamp(1 - q, 0, 0.6);
  const s0 = strokeFn(0); const P0 = PRO[s0]; const water = start === 'water';
  const rt = ov.rt ?? Math.max(0.12, (rtOv ?? (start === 'takeover' ? TAKEOVER[si] + 0.8 * a : P0.rt[si] + 0.35 * a)) + (ov.rtd || 0));
  const xe = P0.xe[si] * Math.pow(q, 0.8); const tf = water ? 0.24 : 0.32;
  const cuts = new Set([0, dist]); for (let w = poolLen; w < dist - 1e-6; w += poolLen) cuts.add(+w.toFixed(3));
  if (im) for (let k = 1; k < 4; k++) cuts.add(+(dist * k / 4).toFixed(3));
  const cs = [...cuts].sort((x, y) => x - y);
  const segs = [];
  for (let k = 0; k < cs.length - 1; k++) {
    const d0 = cs[k], d1 = cs[k + 1]; const stroke = strokeFn(d0 + 0.01); const P = PRO[stroke];
    const atWall = k === 0 || Math.abs(d0 / poolLen - Math.round(d0 / poolLen)) < 1e-6;
    const endWall = Math.abs(d1 / poolLen - Math.round(d1 / poolLen)) < 1e-6;
    let bo = 0, wall = 0, flipIn = false;
    if (k === 0) bo = clamp(ov.boS ?? P.boS[si] * Math.pow(q, 2.2) * (ov.boSf || 1), Math.max(xe + 0.6, 3.5), Math.min(15, d1 - d0 - 2));
    else if (atWall) {
      const prev = segs[k - 1].stroke; const flip = prev === stroke && PRO[prev].flip; flipIn = flip;
      wall = flip ? PRO_WALL.flip + 1.0 * a : PRO_WALL.open + 1.3 * a;
      bo = clamp(ov.boT ?? P.boT[si] * Math.pow(q, 2.4) * (ov.boTf || 1) * (ov.boTk ? 1 + ov.boTk * Math.sin(k * 2.3) : 1), 2.5, Math.min(15, d1 - d0 - 2));
    }
    segs.push({ k, d0, d1, stroke, atWall, endWall: endWall && k < cs.length - 2, last: k === cs.length - 2, bo, wall, flipIn,
      ve: P.ve[si] * q, vk: P.vk[si] * Math.pow(q, 1.25), vp: P.vp[si] * Math.pow(q, 1.1), lamS: stroke === 'P' ? 2.6 : 1.8, lamT: stroke === 'P' ? 2.0 : 1.4 });
  }
  for (let k = 0; k < segs.length - 1; k++) segs[k].flipOut = segs[k + 1].flipIn;
  const n = Math.max(1, Math.round(dist / H));
  const zone = new Uint8Array(n), val = new Float32Array(n), wa = new Float32Array(n), sg = new Uint8Array(n);
  let si2 = 0, nf = 0, uwT = 0, I = 0, wallT = 0, uwS0 = 0;
  for (let i = 0; i < n; i++) {
    const dl = (i + 0.5) * H; while (si2 < segs.length - 1 && dl >= segs[si2].d1) si2++;
    const s = segs[si2]; sg[i] = si2; const w = dl - s.d0;
    if (s.k > 0 && s.atWall && i > 0 && sg[i - 1] !== si2) { wa[i] = s.wall; wallT += s.wall; }
    if (s.k === 0 && dl < xe) { zone[i] = 0; nf++; continue; }
    if (s.k === 0 && dl < s.bo) { zone[i] = 1; const v = s.vk + (s.ve - s.vk) * Math.exp(-(dl - xe) / s.lamS); val[i] = v; uwT += H / v; uwS0 += H / v; continue; }
    if (s.k > 0 && s.atWall && w < s.bo) { zone[i] = 1; const v = s.vk + (s.vp - s.vk) * Math.exp(-w / s.lamT); val[i] = v; uwT += H / v; continue; }
    zone[i] = 2; const rem = s.d1 - dl;
    let f = pace(dl, dist, a) * (im ? IM_SPEED[s.stroke] : 1) * (1 + (ov.tilt || 0) * (0.5 - dl / dist)) * (1 + (ov.kick || 0) * (ss((dl / dist - (ov.kickAt ?? 0.75)) / 0.18) - 0.5)) * (1 + (ov.wave || 0) * Math.sin(6.2832 * (dl / dist) * (ov.waveN || 1) + (ov.waveP || 0)));
    if (rem < 1.5) f *= s.last ? 1 - 0.03 * (1 - rem / 1.5) : 1 - (s.flipOut ? 0.06 : 0.1) * (1 - rem / 1.5);
    val[i] = f; I += H / f;
   }
  if (ov.uwS && uwS0 > 0) { const fc = uwS0 / ov.uwS; for (let i = 0; i < n; i++) if (zone[i] === 1 && sg[i] === 0) val[i] *= fc; uwT += ov.uwS - uwS0; }
  let remT = T - rt - (nf ? tf : 0) - uwT - wallT; if (remT < 0.25 * T) remT = 0.25 * T;
  const vs = I / remT;
  const te = new Float32Array(n), v = new Float32Array(n); let acc = rt;
  for (let i = 0; i < n; i++) {
    acc += wa[i];
    const dt = zone[i] === 0 ? tf / nf : zone[i] === 1 ? H / val[i] : H / (vs * val[i]);
    v[i] = zone[i] === 0 ? xe / tf : zone[i] === 1 ? val[i] : vs * val[i];
    acc += dt; te[i] = acc;
  }
  const fix = (T - rt) / (acc - rt || 1); if (Math.abs(fix - 1) > 1e-6) { for (let i = 0; i < n; i++) te[i] = rt + (te[i] - rt) * fix; for (let i = 0; i < n; i++) { wa[i] *= fix; v[i] /= fix; } }
  const tAt = dl => { if (dl <= 0) return rt; const f = Math.min(n - 1e-6, dl / H); const i = Math.floor(f); const u = f - i; const prev = i ? te[i - 1] : rt; const ts = prev + wa[i]; return ts + u * (te[i] - ts); };
  const touch = dl => { const i = Math.round(dl / H); return i <= 0 ? rt : te[Math.min(n, i) - 1]; };
  const dAt = t => {
    if (t <= rt) return 0; if (t >= te[n - 1]) return dist;
   let lo = 0, hi = n - 1; while (lo < hi) { const m = (lo + hi) >> 1; if (te[m] < t) lo = m + 1; else hi = m; }
    const prev = lo ? te[lo - 1] : rt; const ts = prev + wa[lo]; if (t <= ts) return lo * H;
    return (lo + (t - ts) / ((te[lo] - ts) || 1e-6)) * H;
  };
  for (const s of segs) {
    const i0 = Math.round(s.d0 / H), i1 = Math.min(n, Math.round(s.d1 / H));
    let uw = 0, sw = 0, swD = 0, fl = 0;
    for (let i = i0; i < i1; i++) { const dt = te[i] - (i ? te[i - 1] : rt) - wa[i]; if (zone[i] === 2) { sw += dt; swD += H; } else if (zone[i] === 1) uw += dt; else fl += dt; }
    s.t0 = s.k === 0 ? 0 : touch(s.d0); s.t1 = touch(s.d1); s.split = s.t1 - s.t0;
    s.uwTime = uw; s.flight = fl; s.swimTime = sw; s.swimDist = swD; s.vSwim = sw > 0 ? swD / sw : 0;
    s.tBo = s.bo ? tAt(s.d0 + s.bo) : null;
    const pro = proLeg ? proLeg.segs[s.k] : null; const r = pro && pro.vSwim ? s.vSwim / pro.vSwim : 1;
    s.SR = srPro(S, s.stroke, dClass) * Math.pow(r, 0.35) * (dist >= 200 && s.last ? 1.03 : 1);
    s.DPS = s.SR > 0 ? 60 * s.vSwim / s.SR : 0; if (ov.dpsf && !ov.strokes) { s.DPS *= ov.dpsf * (ov.dpsLap ? 1 + ov.dpsLap * Math.sin(s.k * 1.9 + 0.7) : 1); s.SR = s.DPS > 0 ? 60 * s.vSwim / s.DPS : 0; } s.cycles = s.DPS > 0 ? s.swimDist / s.DPS : 0;
    s.perCycle = s.stroke === 'L' || s.stroke === 'C' ? 2 : 1; s.strokes = s.cycles * s.perCycle;
  }
  if (ov.strokes) { const S0 = segs.reduce((x, s) => x + s.strokes, 0); if (S0 > 0) { const g = S0 / ov.strokes; for (const s of segs) { s.DPS *= g; s.SR = s.DPS > 0 ? 60 * s.vSwim / s.DPS : 0; s.cycles = s.DPS > 0 ? s.swimDist / s.DPS : 0; s.strokes = s.cycles * s.perCycle; } } }
  return { dist, poolLen, rt, tf, xe, start, segs, te, wa, v, zone, sg, n, vs, T, q, tAt, dAt, touch };
}

const proCache = new Map();
export function proPlan(code, sex, poolLen = 50) {
  const k = code + '|' + S_(sex) + '|' + poolLen; if (!proCache.has(k)) proCache.set(k, racePlan({ code, sex, T: proTime(code, sex, poolLen), poolLen, isPro: true }));
  return proCache.get(k);
}
export function racePlan({ code, sex = 'M', T, poolLen = 50, stroke, dist: distIn, reaction, rtJitter = 0, isPro = false, ov = null }) {
  const ev = EVENTS[code]; const S = S_(sex);
  const dist = ev ? ev.dist : (distIn || 50); const relay = !!(ev && ev.relay);
  const pro = isPro || !ev ? null : proPlan(code, S, poolLen);
  const legs = [];
  if (relay) {
    const pl = proLegTimes(code, S, poolLen); const sum = pl.reduce((x, y) => x + y, 0); const k = T / sum; const order = legOrder(code);
    let t0 = 0;
    const shape = [1, 1.012, 0.994, 0.998]; const w = pl.map((tp, i) => tp * (k > 1.02 ? shape[i] : 1) * (ov && ov.legW ? ov.legW[i] : 1)); const ws = w.reduce((x, y) => x + y, 0);
    pl.forEach((tp, i) => {
      const st = order ? order[i] : 'L'; let Tl = w[i] * T / ws;
      if (ov && ov.split) { const wr = w.slice(1).reduce((x, y) => x + y, 0); Tl = i === 0 ? ov.split : w[i] * (T - ov.split) / wr; }
      const lov = ov ? { ...(ov.legs ? ov.legs[i] : {}), rt: i === 0 ? ov.rt : ov.tk, boS: ov.boS, boT: ov.boT, strokes: ov.strokes ? ov.strokes / 4 : undefined } : {};
        const L = buildLeg({ dist: 50, strokeFn: () => st, poolLen, S, T: Tl, q: clamp(tp / Tl, 0.4, 1.1), start: i === 0 ? (st === 'C' ? 'water' : 'block') : 'takeover', rt: i === 0 && reaction != null ? reaction : undefined, dClass: 50, proLeg: pro ? pro.legs[i] : null, ov: lov });
      L.i = i; L.d0 = i * 50; L.d1 = L.d0 + 50; L.t0 = t0; L.t1 = t0 + Tl; L.stroke0 = st; t0 += Tl; legs.push(L);
    });
  } else {
    const Tp = ev ? proTime(code, S, poolLen) : genericPro(stroke || 'L', dist, S);
    const im = !!(ev && ev.stroke === 'M');
    const sf = ev ? (d => strokeOf(code, d, dist)) : (() => stroke || 'L');
    const s0 = sf(0.01);
    let rt = reaction; if (rt == null && rtJitter) rt = PRO[s0].rt[S === 'F' ? 1 : 0] + 0.35 * clamp(1 - Tp / T, 0, 0.6) + rtJitter;
    const args = { dist, strokeFn: sf, poolLen, S, T, q: clamp(Tp / T, 0.4, 1.1), start: s0 === 'C' ? 'water' : 'block', rt, dClass: im ? 100 : dist, im, proLeg: pro ? pro.legs[0] : null };
    const o2 = ov || {}; let L = buildLeg({ ...args, ov: o2 });
    if (o2.split != null && !o2.tilt) { let lo = -1.4, hi = 1.4; for (let it = 0; it < 18; it++) { const mid = (lo + hi) / 2; const Lm = buildLeg({ ...args, ov: { ...o2, tilt: mid } }); if (Lm.touch(dist / 2) > o2.split) lo = mid; else hi = mid; L = Lm; } }
    L.i = 0; L.d0 = 0; L.d1 = dist; L.t0 = 0; L.t1 = T; L.stroke0 = s0; legs.push(L);
  }
  const legOfD = d => legs[Math.min(legs.length - 1, Math.max(0, Math.floor(d / (relay ? 50 : dist + 1))))];
  const legAt = t => { for (const L of legs) if (t < L.t1) return L; return legs[legs.length - 1]; };
  const tAt = d => { if (d >= dist) return T; const L = legOfD(d); return L.t0 + L.tAt(d - L.d0); };
  const dAt = t => { if (t >= T) return dist; const L = legAt(t); return L.d0 + L.dAt(t - L.t0); };
  const laps = Math.max(1, Math.round(dist / poolLen));
  const pos = d => { const lap = Math.min(laps - 1, Math.floor(d / poolLen)); const w = d - lap * poolLen; const dir = lap % 2 === 0 ? 1 : -1; return { x: dir === 1 ? w : poolLen - w, dir, lap, w }; };
  const idx = d => { const L = legOfD(d); const i = clamp(Math.floor((d - L.d0) / H), 0, L.n - 1); return { L, i }; };
  const speedAt = d => { const { L, i } = idx(d); return L.v[i]; };
  const segs = []; legs.forEach(L => L.segs.forEach(s => segs.push({ ...s, leg: L.i, D0: L.d0 + s.d0, D1: L.d0 + s.d1, T0: L.t0 + s.t0, T1: L.t0 + s.t1, TBo: s.tBo != null ? L.t0 + s.tBo : null, start: s.k === 0 ? L.start : null })));
  const segAt = d => { for (const s of segs) if (d < s.D1) return s; return segs[segs.length - 1]; };
  const zoneAt = d => {
    const { L, i } = idx(d); const s = segAt(d); const w = d - s.D0; const z = L.zone[i];
    const cyc = z === 2 && s.DPS > 0 ? (w - s.bo) / s.DPS : 0;
    return { z, s, w, bo: s.bo, first: s.k === 0, leg: L, cyc, stroke: s.stroke };
  };
  const tot = { rt: 0, flight: 0, uw: 0, swim: 0, wall: 0, strokes: 0, cycles: 0, uwDist: 0, swimDist: 0 };
  legs.forEach(L => { tot.rt += L.rt; });
  segs.forEach(s => { tot.flight += s.flight; tot.uw += s.uwTime; tot.swim += s.swimTime; tot.wall += s.wall; tot.strokes += s.strokes; tot.cycles += s.cycles; tot.uwDist += s.bo ? s.bo - (s.k === 0 ? legs[s.leg].xe : 0) : 0; tot.swimDist += s.swimDist; });
  tot.vSwim = tot.swim > 0 ? tot.swimDist / tot.swim : 0;
  tot.SR = tot.swim > 0 ? segs.reduce((a, s) => a + s.SR * s.swimTime, 0) / tot.swim : 0;
  tot.DPS = tot.cycles > 0 ? tot.swimDist / tot.cycles : 0;
  tot.boStart = segs[0].bo; tot.boTurn = segs.filter(s => s.k > 0 && s.atWall).map(s => s.bo);
  tot.boTurnMean = tot.boTurn.length ? tot.boTurn.reduce((a, b) => a + b, 0) / tot.boTurn.length : null;
  const zones = { start: 0, turns: 0, finish: 0, clean: 0, turnList: [] };
  legs.forEach(L => {
    const at = dl => L.t0 + L.tAt(dl);
    zones.start += at(Math.min(15, L.dist)) - L.t0;
    for (let w = poolLen; w < L.dist - 1e-6; w += poolLen) { const tt = at(Math.min(L.dist, w + 10)) - at(w - 5); zones.turns += tt; zones.turnList.push({ d: L.d0 + w, t: tt }); }
    zones.finish += L.t1 - at(L.dist - 5);
  });
  zones.clean = T - zones.start - zones.turns - zones.finish;
  const splits = step => { const out = []; let prev = 0; for (let d = step; d <= dist + 1e-6; d += step) { const t = d >= dist ? T : tAt(d - 1e-3); out.push({ d, t, split: t - prev }); prev = t; } return out; };
  const breakouts = segs.filter(s => s.bo > 0).map(s => ({ d: s.D0 + s.bo, w: s.bo, t: s.TBo, seg: s, start: s.k === 0 }));
  const vProfile = (m = 360) => { const st = Math.max(H, dist / m); const out = []; for (let d = st / 2; d < dist; d += st) out.push([d, speedAt(d)]); return out; };
  const strokeMarks = () => { const out = []; for (const s of segs) { if (!s.DPS) continue; const step = s.DPS / s.perCycle; const a0 = s.D0 + (s.bo || 0); for (let d = a0; d < s.D1 - 0.4; d += step) out.push(d); } return out; };
  const L0 = legs[0];
  return { code, sex: S, T, dist, poolLen, laps, relay, q: L0.q, legs, segs, tot, zones, breakouts, splits, vProfile, strokeMarks, legAt, legOfD, tAt, dAt, pos, speedAt, zoneAt, segAt, pro, isPro,
    reaction: L0.rt, tf: L0.tf, xe: L0.xe, v0: dist / T };
}
export function makeTrajectory({ T, dist, poolLen = 50, stroke = 'L', reaction, code, sex }) { return racePlan({ code, sex, T, poolLen, stroke, dist, reaction }); }

export function summary(p) {
  const pro = p.pro;
  return { q: p.q, rt: p.tot.rt, uw: p.tot.uw, swim: p.tot.swim, wall: p.tot.wall, strokes: p.tot.strokes, SR: p.tot.SR, DPS: p.tot.DPS, vSwim: p.tot.vSwim,
    boStart: p.tot.boStart, boTurn: p.tot.boTurnMean, uwDist: p.tot.uwDist, start15: p.zones.start, turns: p.zones.turns, clean: p.zones.clean, finish: p.zones.finish,
    lossStart: pro ? p.zones.start - pro.zones.start : 0, lossTurns: pro ? p.zones.turns - pro.zones.turns : 0, lossClean: pro ? p.zones.clean - pro.zones.clean : 0, lossFinish: pro ? p.zones.finish - pro.zones.finish : 0 };
}
export const METRICS = [
  { k: 'boStart', label: 'Breakout saída', unit: 'm', fmt: v => v.toFixed(1).replace('.', ',') },
  { k: 'boTurn', label: 'Breakout virada', unit: 'm', fmt: v => v.toFixed(1).replace('.', ',') },
    { k: 'uw', label: 'Tempo submerso', unit: 's', fmt: v => v.toFixed(2).replace('.', ',') },
  { k: 'swim', label: 'Tempo nadando', unit: 's', fmt: v => v.toFixed(1).replace('.', ',') },
  { k: 'strokes', label: 'Braçadas', unit: '', fmt: v => Math.round(v) },
  { k: 'SR', label: 'Frequência', unit: 'cic/min', fmt: v => v.toFixed(0) },
  { k: 'DPS', label: 'Dist. por ciclo', unit: 'm', fmt: v => v.toFixed(2).replace('.', ',') },
  { k: 'rt', label: 'Reação', unit: 's', fmt: v => v.toFixed(2).replace('.', ',') },
  { k: 'start15', label: 'Saída 15 m', unit: 's', fmt: v => v.toFixed(2).replace('.', ',') }
];

const VCAP = { L: [2.3, 2.05], C: [2.05, 1.85], B: [2.2, 1.95], P: [1.75, 1.55] };
export function techLimits(code, sex, T, poolLen, ov = {}) {
  const ev = EVENTS[code]; if (!ev || !isFinite(T)) return null;
  const si = S_(sex) === 'F' ? 1 : 0; const p = racePlan({ code, sex, T, poolLen, ov });
  if (ev.relay) {
    const L0 = p.legs[0], s0 = p.segs[0]; const pl = proLegTimes(code, sex, poolLen); const minLeg = Math.min(...pl.slice(1)) * 0.98;
    const turns = p.segs.filter(s => s.k > 0 && s.atWall); const swimDist = p.tot.swimDist;
    const cap = p.segs.reduce((a, s) => a + VCAP[s.stroke][si] * s.swimDist, 0) / (swimDist || 1);
    const pc = p.tot.cycles > 0 ? p.tot.strokes / p.tot.cycles : 2; const sw = p.tot.swim;
    const cyMin = Math.max(swimDist / 2.7, 22 * sw / 60), cyMax = Math.max(cyMin + 1, Math.min(swimDist / 0.9, 80 * sw / 60));
    const uwDist = Math.max(0.5, s0.bo - L0.xe); const spLo = Math.max(pl[0] * 0.98, T * 0.18);
    return { plan: p, relay: true, rt: [0.45, 1.2], tk: [0.05, 1.0], boS: [Math.max(L0.xe + 0.6, 3.5), 15], uwS: null, boT: turns.length ? [2.5, Math.min(15, poolLen - 2)] : null,
      split: [spLo, Math.max(spLo + 0.2, Math.min(T * 0.34, T - 3 * minLeg))], strokes: [cyMin * pc, cyMax * pc],
      implied: { vUw: uwDist / Math.max(0.05, s0.uwTime), vSwim: p.tot.vSwim, SR: p.tot.SR, DPS: p.tot.DPS, cap, uwDist } };
  }
  const L = p.legs[0], s0 = p.segs[0], dist = p.dist; const turns = p.segs.filter(s => s.k > 0 && s.atWall);
  const swimDist = p.tot.swimDist; const cap = p.segs.reduce((a, s) => a + VCAP[s.stroke][si] * s.swimDist, 0) / (swimDist || 1);
  const uwDist = Math.max(0.5, s0.bo - L.xe); const uwTurnT = turns.reduce((a, s) => a + s.uwTime, 0);
  const uwMin = uwDist / 3.0; const uwMax = Math.max(uwMin + 0.1, Math.min(uwDist / 0.55, T - L.rt - L.tf - p.tot.wall - uwTurnT - swimDist / cap));
  const sp = t => racePlan({ code, sex, T, poolLen, ov: { ...ov, split: null, tilt: t } }).legs[0].touch(dist / 2);
  const pc = p.tot.cycles > 0 ? p.tot.strokes / p.tot.cycles : 2; const sw = p.tot.swim;
  const cyMin = Math.max(swimDist / 2.7, 22 * sw / 60), cyMax = Math.max(cyMin + 1, Math.min(swimDist / 0.9, 80 * sw / 60));
  return {
    plan: p, rt: [0.45, 1.2], boS: [Math.max(L.xe + 0.6, 3.5), Math.min(15, s0.D1 - s0.D0 - 2)], uwS: [uwMin, uwMax],
    boT: turns.length ? [2.5, Math.min(15, poolLen - 2)] : null, split: [sp(1.2), sp(-1.0)], strokes: [cyMin * pc, cyMax * pc],
    implied: { vUw: uwDist / Math.max(0.05, s0.uwTime), vSwim: p.tot.vSwim, SR: p.tot.SR, DPS: p.tot.DPS, cap, uwDist }
  };
}

export function seeded(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const STYLE_NAMES = { even: 'constante', fast: 'sai forte', closer: 'arrancada final', surge: 'ataques no meio' };
export function randomStyle(r) {
  const n = () => (r() + r() + r() - 1.5) / 1.5; const kinds = ['even', 'fast', 'closer', 'surge']; const kind = kinds[Math.floor(r() * 4)];
  const tilt = kind === 'fast' ? 0.09 + 0.08 * r() : kind === 'closer' ? -(0.07 + 0.08 * r()) : 0.03 * n();
  return { kind, tilt, kick: kind === 'closer' ? 0.05 + 0.05 * r() : kind === 'fast' ? -0.02 * r() : 0.025 * r(), kickAt: 0.58 + 0.27 * r(),
    wave: kind === 'surge' ? 0.035 + 0.035 * r() : 0.012 * r(), waveN: 1 + Math.floor(r() * 2), waveP: r() * 6.28,
    boSf: 1 + 0.2 * n(), boTf: 1 + 0.22 * n(), boTk: 0.08 * r(), rtd: 0.06 * n(), dpsf: 1 + 0.09 * n(), dpsLap: 0.05 * r() };
}
export function relayStyle(r) { return { legs: [0, 1, 2, 3].map(() => randomStyle(r)), legW: [0, 1, 2, 3].map(() => 1 + 0.04 * (r() * 2 - 1)), kind: 'relay' }; }
export function mergeStyle(style, user) { if (!style) return user || null; const ov = { ...style, ...(user || {}) }; if (user && user.split != null) { delete ov.tilt; delete ov.kick; delete ov.wave; } if (user && user.strokes != null) delete ov.dpsf; return ov; }
