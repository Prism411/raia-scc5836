export const EVENTS = {
  '50L': { label: '50 m Livre', short: '50 Livre', dist: 50, stroke: 'L' },
  '50C': { label: '50 m Costas', short: '50 Costas', dist: 50, stroke: 'C' },
  '50P': { label: '50 m Peito', short: '50 Peito', dist: 50, stroke: 'P' },
  '50B': { label: '50 m Borboleta', short: '50 Borb.', dist: 50, stroke: 'B' },
  '100L': { label: '100 m Livre', short: '100 Livre', dist: 100, stroke: 'L' },
  '100M': { label: '100 m Medley', short: '100 Medley', dist: 100, stroke: 'M' },
  '200L': { label: '200 m Livre', short: '200 Livre', dist: 200, stroke: 'L' },
  '400L': { label: '400 m Livre', short: '400 Livre', dist: 400, stroke: 'L' },
  '4x50L': { label: '4×50 m Livre', short: '4×50 L', dist: 200, stroke: 'L', relay: true },
  '4x50M': { label: '4×50 m Medley', short: '4×50 M', dist: 200, stroke: 'M', relay: true }
};
export const EVENT_ORDER = Object.keys(EVENTS);
export const IND_EVENTS = EVENT_ORDER.filter(k => !EVENTS[k].relay);
export const STROKES = { L: 'Livre', C: 'Costas', P: 'Peito', B: 'Borboleta', M: 'Medley' };
export const STROKE_COLORS = { L: '#56B4E9', C: '#E69F00', P: '#009E73', B: '#CC79A7', M: '#D55E00' };
export const YOU = '#FFD23F';
export const REC = '#FF5468';
export const COMP_COLORS = { InterUSP: '#56B4E9', TUSCA: '#E69F00' };
const PAL = {
  InterUSP: { POLI: '#56B4E9', 'MED PINHEIROS': '#E69F00', 'MED RIBEIRÃO': '#CC79A7', FEA: '#009E73', CAASO: '#D55E00', SANFRAN: '#B9A6F5', ODONTO: '#F2A7A7', ESALQ: '#C29A4A', 'FARMÁCIA': '#9AA8B5' },
  TUSCA: { UFSCAR: '#E69F00', CAASO: '#D55E00', POLI: '#56B4E9', LEU: '#CC79A7', LAP: '#009E73', LAURP: '#B9A6F5', UFABC: '#C29A4A', MACK: '#F2A7A7', 'MAUÁ': '#9AA8B5', AXIS: '#7FD1C0', USCS: '#E3C9A4', UNIFEI: '#8E86F0' }
};
export const TEAM_NAMES = {
 POLI: 'Poli USP', 'MED PINHEIROS': 'Medicina USP Pinheiros', 'MED RIBEIRÃO': 'Medicina USP Ribeirão (AAARL)', FEA: 'FEA USP', CAASO: 'CAASO · USP São Carlos',
  SANFRAN: 'Sanfran · Direito USP', ODONTO: 'Odonto USP', ESALQ: 'ESALQ USP', 'FARMÁCIA': 'Farmácia USP', UFSCAR: 'UFSCar', LEU: 'LEU Unicamp', MACK: 'Mackenzie',
  'MAUÁ': 'Mauá', UFABC: 'UFABC', UNIFEI: 'UNIFEI', USCS: 'USCS', LAP: 'LAP', LAURP: 'LAURP', AXIS: 'AXIS'
};
export function teamColor(team, comp) {
  return (comp && PAL[comp] && PAL[comp][team]) || PAL.InterUSP[team] || PAL.TUSCA[team] || '#9AA8B5';
}
export const ALL_TEAMS = [...new Set([...Object.keys(PAL.InterUSP), ...Object.keys(PAL.TUSCA)])];

export function fmtTime(s, dec = 2) {
  if (s == null || !isFinite(s)) return '—';
  const neg = s < 0; s = Math.abs(s);
  let out;
  if (s >= 60) { const m = Math.floor(s / 60); const r = s - m * 60; out = m + ':' + (r < 10 ? '0' : '') + r.toFixed(dec); }
  else out = s.toFixed(dec);
  return (neg ? '−' : '') + out;
}
export function parseTime(str) {
  if (typeof str === 'number') return str;
  str = String(str || '').trim().replace(/,/g, '.');
  if (!str) return NaN;
  let m = str.match(/^(\d+)[:.'](\d{1,2})[.](\d{1,2})$/);
  if (m) return +m[1] * 60 + +m[2] + +(m[3].padEnd(2, '0')) / 100;
  m = str.match(/^(\d+):(\d{1,2}(?:\.\d+)?)$/);
  if (m) return +m[1] * 60 + parseFloat(m[2]);
  const v = parseFloat(str);
  return isFinite(v) ? v : NaN;
}
export const pct = (v, d = 0) => (v == null || !isFinite(v)) ? '—' : (v * 100).toFixed(d).replace('.', ',') + '%';
export const num = (v, d = 1) => (v == null || !isFinite(v)) ? '—' : v.toFixed(d).replace('.', ',');

export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export function normal(r) { let u = 0; while (u === 0) u = r(); const v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
export const median = arr => { if (!arr.length) return NaN; const s = [...arr].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
export const mean = arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : NaN;
export const std = arr => { if (arr.length < 2) return 0; const m = mean(arr); return Math.sqrt(arr.reduce((a, b) => a + (b - m) ** 2, 0) / (arr.length - 1)); };
export function quantile(sorted, q) { if (!sorted.length) return NaN; const p = (sorted.length - 1) * q; const lo = Math.floor(p), hi = Math.ceil(p); return sorted[lo] + (sorted[hi] - sorted[lo]) * (p - lo); }

export async function loadData(url) {
  const raw = await (await fetch(url)).json();
  const events = raw.events.map((e, i) => ({ id: i, comp: e.c, year: e.y, code: e.cd, sex: e.s, dist: e.d, stroke: e.k, relay: !!e.r, demo: !!e.dm, record: e.rec, newRecord: !!e.nr, win: e.win, n: e.n, label: EVENTS[e.cd].label, results: [] }));
  const athletes = raw.athletes.map(a => ({ id: a.id, name: a.n, sex: a.s, team: a.t, comps: a.c, years: a.y, results: [] }));
  const results = raw.results.map((r, i) => {
    const ev = events[r.e]; const a = r.a != null ? athletes[r.a] : null;
    const o = { id: i, ev, comp: ev.comp, year: ev.year, code: ev.code, sex: ev.sex, relay: ev.relay, demo: ev.demo, stroke: ev.stroke, dist: ev.dist, pos: r.p, ath: a ? a.id : -1, name: a ? a.name : r.n, squad: r.q || null, team: r.t, cat: r.k || null, time: r.tm, pts: r.pt || 0, status: r.st || 'OK' };
    if (a) a.results.push(o);
    ev.results.push(o);
    return o;
  });
  const ref = {};
  for (const r of results) if (r.status === 'OK' && r.time) { const k = r.code + '|' + r.sex; if (!ref[k] || r.time < ref[k]) ref[k] = r.time; }
  for (const r of results) {
    if (r.status === 'OK' && r.time) { r.it = 1000 * Math.pow(ref[r.code + '|' + r.sex] / r.time, 3); r.gap = r.time / r.ev.win - 1; }
    else { r.it = null; r.gap = null; }
  }
  for (const ev of events) {
    ev.results.sort((a, b) => (a.pos ?? 999) - (b.pos ?? 999));
    ev.ok = ev.results.filter(r => r.status === 'OK').sort((a, b) => a.time - b.time);
    let k = 0;
    for (const r of ev.ok) { r.orank = r.cat === 'E' ? null : ++k; r.prank = ev.ok.indexOf(r) + 1; }
    ev.nOff = k;
  }
  for (const a of athletes) {
    a.ind = a.results.filter(r => r.status === 'OK');
    a.best = {};
    for (const r of a.ind) if (!a.best[r.code] || r.time < a.best[r.code].time) a.best[r.code] = r;
    a.medals = { g: 0, s: 0, b: 0 };
    for (const r of a.ind) { if (r.demo || !r.orank) continue; if (r.orank === 1) a.medals.g++; else if (r.orank === 2) a.medals.s++; else if (r.orank === 3) a.medals.b++; }
    a.pts = a.results.reduce((s, r) => s + (r.demo ? 0 : r.pts), 0);
    a.bestIT = a.ind.length ? Math.max(...a.ind.map(r => r.it)) : 0;
    a.events = [...new Set(a.ind.map(r => r.code))];
  }
  const db = { meta: raw.meta, scoringRaw: raw.scoring, events, athletes, results, ref };
  db.scoring = (comp, year) => comp === 'InterUSP' ? raw.scoring.InterUSP : (raw.scoring['TUSCA|' + year] || raw.scoring['TUSCA|2026']);
  db.teams = {};
  for (const r of results) { (db.teams[r.comp] = db.teams[r.comp] || new Set()).add(r.team); }
  for (const k in db.teams) db.teams[k] = [...db.teams[k]];
  db.sigma = estimateSigma(athletes);
  db.findEvent = (comp, year, code, sex) => events.find(e => e.comp === comp && e.year === year && e.code === code && e.sex === sex);
  db.athleteProfile = athleteFeatures;
  return db;
}

function estimateSigma(athletes) {
  const logs = [];
  for (const a of athletes) {
    const by = {};
    for (const r of a.ind) { if (r.demo) continue; const k = r.comp + '|' + r.code; (by[k] = by[k] || []).push(r); }
    for (const arr of Object.values(by)) {
      arr.sort((x, y) => x.year - y.year);
       for (let i = 1; i < arr.length; i++) if (arr[i].year - arr[i - 1].year === 1) logs.push(Math.log(arr[i].time / arr[i - 1].time));
    }
  }
  const med = median(logs);
  const mad = median(logs.map(v => Math.abs(v - med)));
  return { sigma: Math.max(0.008, 1.4826 * mad / Math.SQRT2), drift: med, n: logs.length, logs };
}

export function silverman(values) {
  const n = values.length; if (n < 2) return 1;
  const s = [...values].sort((a, b) => a - b);
  const sd = std(values); const iqr = quantile(s, 0.75) - quantile(s, 0.25);
  const h = 0.9 * Math.min(sd, iqr / 1.34 || sd) * Math.pow(n, -0.2);
  return h > 0 ? h : (sd || 1) * 0.5;
}
export function kde(values, xs, bw) {
  const n = values.length; if (!n) return xs.map(x => [x, 0]);
  const h = bw || silverman(values); const c = 1 / (n * h * Math.sqrt(2 * Math.PI));
  return xs.map(x => { let s = 0; for (const v of values) { const u = (x - v) / h; s += Math.exp(-0.5 * u * u); } return [x, s * c]; });
}
export function gini(values) {
  const v = values.filter(x => x >= 0).sort((a, b) => a - b); const n = v.length; const sum = v.reduce((a, b) => a + b, 0);
  if (!n || !sum) return 0;
  let acc = 0; v.forEach((x, i) => { acc += (2 * (i + 1) - n - 1) * x; });
  return acc / (n * sum);
}
export function lorenz(values) {
  const v = values.filter(x => x >= 0).sort((a, b) => a - b); const sum = v.reduce((a, b) => a + b, 0) || 1;
  const pts = [[0, 0]]; let acc = 0; v.forEach((x, i) => { acc += x; pts.push([(i + 1) / v.length, acc / sum]); });
  return pts;
}
export function pca(X, k = 2) {
  const n = X.length, d = X[0].length;
  const mu = Array(d).fill(0); X.forEach(r => r.forEach((v, j) => { mu[j] += v / n; }));
  const sd = Array(d).fill(0); X.forEach(r => r.forEach((v, j) => { sd[j] += (v - mu[j]) ** 2 / Math.max(1, n - 1); }));
  for (let j = 0; j < d; j++) sd[j] = Math.sqrt(sd[j]) || 1;
  const Z = X.map(r => r.map((v, j) => (v - mu[j]) / sd[j]));
  let C = Array.from({ length: d }, () => Array(d).fill(0));
  for (const r of Z) for (let i = 0; i < d; i++) for (let j = 0; j < d; j++) C[i][j] += r[i] * r[j] / Math.max(1, n - 1);
  const trace = C.reduce((s, row, i) => s + row[i], 0);
  const vecs = [], vals = [];
  for (let c = 0; c < k; c++) {
    let v = Array.from({ length: d }, (_, i) => Math.sin(i * 7.13 + c * 3.1) + 1.1);
    let lambda = 0;
    for (let it = 0; it < 300; it++) {
      const w = C.map(row => row.reduce((s, x, j) => s + x * v[j], 0));
      const norm = Math.hypot(...w) || 1; v = w.map(x => x / norm); lambda = norm;
    }
    vecs.push(v); vals.push(lambda);
    C = C.map((row, i) => row.map((x, j) => x - lambda * v[i] * v[j]));
  }
  vecs.forEach(v => { const iMax = v.reduce((bi, x, i) => Math.abs(x) > Math.abs(v[bi]) ? i : bi, 0); if (v[iMax] < 0) for (let i = 0; i < d; i++) v[i] = -v[i]; });
  const coords = Z.map(r => vecs.map(v => r.reduce((s, x, j) => s + x * v[j], 0)));
  return { coords, vecs, vals, explained: vals.map(l => l / trace), mu, sd };
}
export function kmeans(P, k, seed = 3) {
  const r = rng(seed); const n = P.length; if (n <= k) return { labels: P.map((_, i) => i), centers: P.map(p => [...p]) };
  const d2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
  const centers = [P[Math.floor(r() * n)].slice()];
  while (centers.length < k) {
    const dist = P.map(p => Math.min(...centers.map(c => d2(p, c)))); const tot = dist.reduce((a, b) => a + b, 0);
    let t = r() * tot, i = 0; while (t > dist[i] && i < n - 1) { t -= dist[i]; i++; }
    centers.push(P[i].slice());
  }
  let labels = new Array(n).fill(0);
  for (let it = 0; it < 60; it++) {
    let moved = false;
    P.forEach((p, i) => { let best = 0, bd = Infinity; centers.forEach((c, j) => { const dd = d2(p, c); if (dd < bd) { bd = dd; best = j; } }); if (labels[i] !== best) { labels[i] = best; moved = true; } });
    centers.forEach((c, j) => { const m = P.filter((_, i) => labels[i] === j); if (m.length) { c[0] = mean(m.map(p => p[0])); c[1] = mean(m.map(p => p[1])); } });
    if (!moved && it > 0) break;
  }
  return { labels, centers };
}

export const FEATURE_NAMES = ['Nível (IT médio)', 'Livre', 'Costas', 'Peito', 'Borboleta', 'Medley', 'Distância média', 'Versatilidade'];
export function athleteFeatures(a, results) {
  const rs = results || a.ind;
  const best = {};
  for (const r of rs) if (!r.relay && r.status === 'OK' && (!best[r.code] || r.it > best[r.code].it)) best[r.code] = r;
  const vals = Object.values(best); if (!vals.length) return null;
   const level = mean(vals.map(r => r.it));
  const byStroke = {}; for (const r of vals) (byStroke[r.stroke] = byStroke[r.stroke] || []).push(r.it);
  const spec = ['L', 'C', 'P', 'B', 'M'].map(s => byStroke[s] ? (Math.max(...byStroke[s]) - level) / 100 + 0.35 : 0);
  const dist = mean(vals.map(r => Math.log2(r.dist / 50)));
  return [level / 100, ...spec, dist, Math.log2(1 + vals.length)];
}

export function chanceModel(db, { code, sex, comp, years, time, sigmaYou = 0.012, sigmaField, nSim = 2500, seed = 11 }) {
  const sF = sigmaField ?? db.sigma.sigma;
  const evs = db.events.filter(e => e.comp === comp && e.code === code && e.sex === sex && !e.demo && years.includes(e.year)).sort((a, b) => a.year - b.year);
  if (!evs.length || !isFinite(time)) return null;
  const fields = evs.map(ev => ({ year: ev.year, ev, off: ev.ok.filter(r => r.cat !== 'E').map(r => r.time), all: ev.ok.map(r => r.time), table: ev.relay ? db.scoring(comp, ev.year).rel : db.scoring(comp, ev.year).ind }));
  const perYear = fields.map(f => {
    const posAll = 1 + f.all.filter(t => t < time).length; const posOff = 1 + f.off.filter(t => t < time).length;
    return { year: f.year, posAll, nAll: f.all.length + 1, posOff, nOff: f.off.length + 1, pts: f.table[posOff - 1] || 0, win: f.ev.win, gap: time - f.ev.win, record: f.ev.record, third: f.off[2], lastScore: f.off[f.table.length - 1] };
  });
  const r = rng(seed);
  const maxField = Math.max(...fields.map(f => f.off.length)); const poolOff = fields.flatMap(f => f.off);
  const mField = Math.round(mean(fields.map(f => f.off.length)));
  const N = nSim;
  const zY = Float64Array.from({ length: N }, () => normal(r));
  const zF = Array.from({ length: N }, () => Float64Array.from({ length: Math.max(maxField, mField) }, () => normal(r)));
  const poolIdx = Array.from({ length: N }, () => Int32Array.from({ length: mField }, () => Math.floor(r() * poolOff.length)));
  const tableAvg = fields[0].table;
  function simFields(t, nUse) {
    const out = fields.map(f => ({ hist: new Float64Array(f.off.length + 2), pts: 0 }));
    const pooled = { hist: new Float64Array(mField + 2), pts: 0 };
    const n = nUse || N;
    for (let s = 0; s < n; s++) {
      const ty = t * (1 + sigmaYou * zY[s]); const zf = zF[s];
      fields.forEach((f, fi) => { let rank = 1; for (let i = 0; i < f.off.length; i++) if (f.off[i] * (1 + sF * zf[i]) < ty) rank++; out[fi].hist[rank]++; out[fi].pts += f.table[rank - 1] || 0; });
     let rank = 1; const pi = poolIdx[s]; for (let i = 0; i < mField; i++) if (poolOff[pi[i]] * (1 + sF * zf[i]) < ty) rank++;
      pooled.hist[rank]++; pooled.pts += tableAvg[rank - 1] || 0;
    }
    const summarize = (h, pts, nScore) => { const tot = n; const p = i => (h[i] || 0) / tot; let eRank = 0; for (let i = 1; i < h.length; i++) eRank += i * (h[i] || 0) / tot; let pS = 0; for (let i = 1; i <= nScore; i++) pS += p(i); return { p1: p(1), p3: p(1) + p(2) + p(3), pS, ePts: pts / tot, eRank, hist: Array.from(h).map(v => v / tot) }; };
    const years = out.map((o, i) => ({ year: fields[i].year, ...summarize(o.hist, o.pts, fields[i].table.length) }));
    const avg = { p1: mean(years.map(y => y.p1)), p3: mean(years.map(y => y.p3)), pS: mean(years.map(y => y.pS)), ePts: mean(years.map(y => y.ePts)), eRank: mean(years.map(y => y.eRank)) };
    const histLen = Math.max(...years.map(y => y.hist.length)); avg.hist = Array.from({ length: histLen }, (_, i) => mean(years.map(y => y.hist[i] || 0)));
    const pool = summarize(pooled.hist, pooled.pts, tableAvg.length);
    return { years, avg, pool };
  }
  const main = simFields(time);
  const allTimes = poolOff.length ? poolOff : [time];
  const lo = Math.min(time, Math.min(...allTimes)) * 0.94, hi = Math.max(time, quantile([...allTimes].sort((a, b) => a - b), 0.85)) * 1.04;
  const G = 64, nCurve = Math.min(700, N);
  const curve = Array.from({ length: G }, (_, i) => { const t = lo + (hi - lo) * i / (G - 1); const s = simFields(t, nCurve); return { t, avg: s.avg, pool: s.pool, years: s.years.map(y => ({ year: y.year, p1: y.p1, p3: y.p3, pS: y.pS })) }; });
  const inv = (key, target, which) => { for (let i = 0; i < curve.length - 1; i++) { const a = curve[i][which][key], b = curve[i + 1][which][key]; if ((a - target) * (b - target) <= 0 && a !== b) { const u = (target - a) / (b - a); return curve[i].t + u * (curve[i + 1].t - curve[i].t); } } return null; };
  const targets = which => ({ g50: inv('p1', 0.5, which), g90: inv('p1', 0.9, which), p50: inv('p3', 0.5, which), s50: inv('pS', 0.5, which) });
  return { fields, perYear, main, curve, targets, sigmaField: sF, sigmaYou, mField, lo, hi };
}

export function strokeAt(code, d, dist) {
  const ev = EVENTS[code]; if (!ev) return 'L';
  if (ev.stroke !== 'M') return ev.stroke;
  const order = ev.relay ? ['C', 'P', 'B', 'L'] : ['B', 'C', 'P', 'L']; return order[Math.min(3, Math.floor(d / (dist / 4)))];
}
export function makeTrajectory({ T, dist, poolLen = 50, stroke = 'L', reaction = 0.68 }) {
  const back = stroke === 'C';
  const tf = back ? 0.22 : 0.32; const xe = back ? 1.3 : 3.4;
  const laps = Math.max(1, Math.round(dist / poolLen));
  const fat = dist <= 50 ? 0.07 : dist <= 100 ? 0.08 : 0.06;
  const step = 0.1; const nSt = Math.max(1, Math.ceil((dist - xe) / step));
  const m = d => { let v = 1 + 0.42 * Math.exp(-(d - xe) / 4.5) - fat * (d / dist); for (let k = 1; k < laps; k++) { const w = k * poolLen; if (d > w) v += 0.16 * Math.exp(-(d - w) / 3.5); } return v; };
  const cum = new Float64Array(nSt + 1); let acc = 0;
  for (let i = 1; i <= nSt; i++) { const d = xe + (i - 0.5) * step; acc += step / m(d); cum[i] = acc; }
  const swimTime = Math.max(1, T - reaction - tf); const v0 = acc / swimTime;
  const tAt = d => {
    if (d <= 0) return 0; if (d < xe) return reaction + tf * (d / xe);
    const f = (d - xe) / step; const i = Math.min(nSt - 1, Math.floor(f)); const u = f - i;
    return reaction + tf + (cum[i] + (cum[i + 1] - cum[i]) * u) / v0;
  };
  const dAt = t => {
    if (t <= reaction) return 0; if (t < reaction + tf) return xe * (t - reaction) / tf; if (t >= T) return dist;
    const target = (t - reaction - tf) * v0; let lo = 0, hi = nSt;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cum[mid] < target) lo = mid; else hi = mid; }
    const u = (target - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
    return Math.min(dist, xe + (lo + u) * step);
  };
  const pos = d => { const lap = Math.min(laps - 1, Math.floor(d / poolLen)); const w = d - lap * poolLen; const dir = lap % 2 === 0 ? 1 : -1; return { x: dir === 1 ? w : poolLen - w, dir, lap, w }; };
  return { T, reaction, tf, xe, dist, poolLen, laps, v0, tAt, dAt, pos, speedAt: d => v0 * m(d) };
}
