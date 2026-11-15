import * as d3 from '../vendor/d3.esm.js';
import { fmtTime, YOU, EVENTS, EVENT_ORDER, COMP_COLORS } from './core.js';
import { PHASES, PHASE_C, PRO } from './bio.js';
import { showTip, hideTip, styleAxis, GRID, INK, AX, MUTE, MONO, SANS, esc } from './ui.js';

const nf = (v, d = 1) => (v == null || !isFinite(v)) ? '—' : v.toFixed(d).replace('.', ',');
const colorOf = e => e.isPro ? '#eaf6ff' : e.isYou ? YOU : e.color;
const foc = (e, o) => o && o.focus ? e.id === o.focus : !!e.isYou;
const uid = () => 'b' + Math.random().toString(36).slice(2, 9);
function base(el, minH = 150) {
  d3.select(el).selectAll('*').remove();
  const W = Math.max(240, el.clientWidth || 0), H = Math.max(minH, el.clientHeight || 0);
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('display', 'block').style('font-family', MONO).style('user-select', 'none');
  return { svg, W, H };
}
function api(svg, extra = {}) {
  return {
    highlight(id) { svg.selectAll('[data-id]').attr('opacity', function () { const o = +(this.getAttribute('data-o') || 1); return id == null || this.getAttribute('data-id') === String(id) ? o : o * 0.15; }); },
    setTime() { }, ...extra
  };
}
const lab = (e, max) => { const s = `${e.isPro ? 'PRO' : e.tag != null ? e.tag : e.place ? e.place + 'º' : ''} ${e.isPro ? '' : (e.short || e.name || '')}`.trim(); const n = Math.max(4, Math.floor(max / 6.4)); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const tipPlan = e => { const p = e.plan, s = p.tot; return `<b style="color:${colorOf(e)}">${esc(e.name)}</b> · ${fmtTime(p.T)}<br>reação ${nf(s.rt, 2)} s · submerso ${nf(s.uw, 2)} s · nado ${nf(s.swim, 1)} s<br>breakout ${nf(s.boStart, 1)} m · ${Math.round(s.strokes)} braçadas · ${nf(s.SR, 0)} cic/min · ${nf(s.DPS, 2)} m/cic`; };
function rowsFrame(svg, W, H, entries, o, { l = 0.26, r = 58, t = 22, b = 22 } = {}) {
  const m = { l: Math.min(150, Math.max(90, W * l)), r, t, b };
  const n = entries.length; const rh = Math.min(30, (H - m.t - m.b) / n);
  return { m, n, rh };
}
function names(svg, entries, m, rh, bh, yOf, o) {
  entries.forEach((e, i) => {
    const yy = yOf(i) + bh / 2; const g = svg.append('g').attr('data-id', e.id).style('cursor', 'pointer');
    g.append('rect').attr('x', 4).attr('y', yy - 4).attr('width', 8).attr('height', 8).attr('fill', colorOf(e)).attr('stroke', e.isPro ? '#eaf6ff' : 'none').attr('stroke-dasharray', e.isPro ? '2 1' : null).attr('fill-opacity', e.isPro ? 0 : 1);
    g.append('text').attr('x', 16).attr('y', yy + 3.5).attr('fill', foc(e, o) && o.focus ? '#2FE0F0' : e.isYou ? YOU : INK).style('font', `${foc(e, o) ? 800 : 600} ${rh < 17 ? 10 : 11.5}px ${SANS}`).text((foc(e, o) && o.focus ? '◉ ' : '') + lab(e, m.l - 20));
    g.on('mouseenter', () => o.onHover && o.onHover(e.id)).on('mouseleave', () => o.onHover && o.onHover(null)).on('click', () => o.onPick && o.onPick(e.id));
  });
}

export function fita(el, entries, o = {}) {
  const { svg, W, H } = base(el); const { m, n, rh } = rowsFrame(svg, W, H, entries, o);
  const Tm = d3.max(entries, e => e.plan.T); const x = d3.scaleLinear([0, Tm], [m.l, W - m.r]); const bh = Math.max(5, rh * 0.6);
  const y = i => m.t + i * rh + (rh - bh) / 2;
  svg.append('g').selectAll('line').data(x.ticks(8)).join('line').attr('x1', x).attr('x2', x).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', GRID);
  styleAxis(svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(Math.max(3, Math.floor((W - m.l - m.r) / 70))).tickFormat(v => v + 's').tickSizeOuter(0)));
  const lg = svg.append('g').attr('transform', `translate(${m.l},11)`); let lx = 0;
  PHASES.forEach(p => { lg.append('rect').attr('x', lx).attr('y', -6).attr('width', 9).attr('height', 9).attr('fill', p.c); const t = lg.append('text').attr('x', lx + 12).attr('y', 2).attr('fill', AX).style('font', `500 9.5px ${MONO}`).text(p.label); lx += 22 + t.node().getComputedTextLength(); });
  const cid = uid(); const clip = svg.append('clipPath').attr('id', cid).append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H);
  const g = svg.append('g').attr('clip-path', `url(#${cid})`);
  const times = [];
  entries.forEach((e, i) => {
    const P = e.plan; const yy = y(i); const gr = g.append('g').attr('data-id', e.id).attr('data-o', e.isPro ? 0.7 : 1);
    const bl = [];
    P.legs.forEach(L => { bl.push(['rt', L.t0, L.t0 + L.rt]); bl.push(['flight', L.t0 + L.rt, L.t0 + L.rt + L.tf]); });
    P.segs.forEach(s => { const L = P.legs[s.leg]; const t0 = s.k === 0 ? L.t0 + L.rt + L.tf : s.T0 + s.wall; if (s.k > 0 && s.wall > 0) bl.push(['wall', s.T0, s.T0 + s.wall]); if (s.bo > 0 && s.TBo != null) { bl.push(['uw', t0, s.TBo]); bl.push(['swim', s.TBo, s.T1]); } else bl.push(['swim', t0, s.T1]); });
    gr.selectAll('rect').data(bl).join('rect').attr('x', b => x(b[1])).attr('y', yy).attr('width', b => Math.max(0.6, x(b[2]) - x(b[1]))).attr('height', bh).attr('fill', b => PHASE_C[b[0]]);
    if (foc(e, o)) gr.append('rect').attr('x', x(0) - 1).attr('y', yy - 2).attr('width', x(P.T) - x(0) + 2).attr('height', bh + 4).attr('fill', 'none').attr('stroke', o.focus ? '#2FE0F0' : YOU).attr('stroke-width', 1.5);
    P.legs.slice(1).forEach(L => gr.append('line').attr('x1', x(L.t0)).attr('x2', x(L.t0)).attr('y1', yy - 3).attr('y2', yy + bh + 3).attr('stroke', '#FF5468').attr('stroke-width', 2));
    times.push(svg.append('text').attr('data-id', e.id).attr('x', W - m.r + 6).attr('y', yy + bh / 2 + 3.5).attr('fill', e.isYou ? YOU : AX).style('font', `600 10.5px ${MONO}`).text(fmtTime(P.T)));
  });
  names(svg, entries, m, rh, bh, y, o);
  const cur = svg.append('line').attr('y1', m.t - 4).attr('y2', H - m.b).attr('stroke', '#FF5468').attr('stroke-width', 1.4).style('display', 'none');
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', n * rh).attr('fill', 'transparent').style('cursor', 'crosshair')
    .on('mousemove', ev => { const [, py] = d3.pointer(ev); const e = entries[Math.floor((py - m.t) / rh)]; if (!e) return hideTip(); o.onHover && o.onHover(e.id); showTip(tipPlan(e), ev); })
    .on('mouseleave', () => { hideTip(); o.onHover && o.onHover(null); })
    .on('click', ev => { const [px, py] = d3.pointer(ev); const e = entries[Math.floor((py - m.t) / rh)]; o.onSeek && o.onSeek(Math.max(0, x.invert(px))); e && o.onPick && o.onPick(e.id); });
  return api(svg, { setTime(t) { const live = isFinite(t); clip.attr('width', live ? Math.max(0, x(Math.max(0, t))) : W); cur.style('display', live ? null : 'none').attr('x1', x(Math.min(Math.max(0, t), Tm))).attr('x2', x(Math.min(Math.max(0, t), Tm))); times.forEach((tx, i) => tx.style('display', !live || t >= entries[i].plan.T ? null : 'none')); } });
}

export function breakouts(el, entries, o = {}) {
  const { svg, W, H } = base(el); const { m, n, rh } = rowsFrame(svg, W, H, entries, o, { r: 74 });
  const P0 = entries[0].plan; const L = P0.poolLen; const x = d3.scaleLinear([0, L], [m.l, W - m.r]);
  const top = m.t, bot = m.t + n * rh;
  svg.append('rect').attr('x', x(0)).attr('y', top).attr('width', x(L) - x(0)).attr('height', bot - top).attr('fill', '#08385a');
  entries.forEach((e, i) => { if (i % 2) svg.append('rect').attr('x', x(0)).attr('y', top + i * rh).attr('width', x(L) - x(0)).attr('height', rh).attr('fill', 'rgba(255,255,255,.035)'); });
  for (let i = 1; i < n; i++) svg.append('line').attr('x1', x(0)).attr('x2', x(L)).attr('y1', top + i * rh).attr('y2', top + i * rh).attr('stroke', 'rgba(234,246,255,.22)').attr('stroke-dasharray', '3 4');
  const st = P0.segs[0].stroke; const S = P0.sex === 'F' ? 1 : 0; const pr = PRO[st] || PRO.L;
  const band = (a, b, lbl) => { svg.append('rect').attr('x', x(Math.min(a, b))).attr('y', top).attr('width', Math.abs(x(b) - x(a))).attr('height', bot - top).attr('fill', 'rgba(234,246,255,.07)'); svg.append('text').attr('x', x(b)).attr('y', top - 4).attr('text-anchor', 'middle').attr('fill', AX).style('font', `600 9px ${MONO}`).text(lbl); };
  band(pr.xe[S], pr.boS[S], `PRO ${nf(pr.boS[S], 1)}`);
  if (P0.relay && P0.laps > 1 && L === 50) band(L, L - pr.boS[S], `PRO ${nf(pr.boS[S], 1)}`); else if (P0.laps > 1) band(L, L - pr.boT[S], `PRO ${nf(pr.boT[S], 1)}`);
  [15, L - 15].forEach(v => { if (v <= 0 || v >= L) return; svg.append('line').attr('x1', x(v)).attr('x2', x(v)).attr('y1', top).attr('y2', bot).attr('stroke', '#FF5468').attr('stroke-dasharray', '4 3').attr('opacity', 0.8); });
  svg.append('text').attr('x', x(15) + 3).attr('y', bot + 12).attr('fill', '#FF5468').style('font', `600 9px ${MONO}`).text('15 m');
  [0, L].forEach(v => svg.append('rect').attr('x', x(v) - 2).attr('y', top).attr('width', 4).attr('height', bot - top).attr('fill', '#c3cfda'));
  const segLines = []; const markers = [];
  entries.forEach((e, i) => {
    const P = e.plan; const g = svg.append('g').attr('data-id', e.id).attr('data-o', e.isPro ? 0.75 : 1); const c = colorOf(e);
    const segs = P.segs.filter(s => s.bo > 0); const nl = segs.length; const stack = nl <= 8;
    segs.forEach((s, j) => {
      const Lg = P.legs[s.leg]; const w0 = s.k === 0 ? Lg.xe : 0; const a = s.D0 + w0, b = s.D0 + s.bo;
      const yy = top + i * rh + rh * (stack && nl > 1 ? 0.22 + 0.56 * j / (nl - 1) : 0.5);
      const ln = g.append('line').attr('x1', x(P.pos(a + 1e-3).x)).attr('x2', x(P.pos(b).x)).attr('y1', yy).attr('y2', yy).attr('stroke', PHASE_C.uw).attr('stroke-width', Math.max(2, Math.min(4, rh * 0.14))).attr('stroke-linecap', 'round').attr('opacity', stack ? 1 : 0.6);
      const dot = g.append('circle').attr('cx', x(P.pos(b).x)).attr('cy', yy).attr('r', Math.max(2.4, Math.min(4.5, rh * 0.15))).attr('fill', s.k === 0 ? c : '#08385a').attr('stroke', c).attr('stroke-width', 1.6)
        .on('mousemove', ev => showTip(`<b style="color:${c}">${esc(e.name)}</b><br>${s.k === 0 ? 'saída' : 'virada ' + Math.round(s.D0) + ' m'} · breakout ${nf(s.bo, 1)} m<br>submerso ${nf(s.uwTime, 2)} s`, ev)).on('mouseleave', hideTip);
       segLines.push({ e, ln, dot, a, b, t0: s.k === 0 ? Lg.t0 + Lg.rt + Lg.tf : s.T0 + s.wall, t1: s.TBo, P });
    });
    const yc = top + i * rh + rh / 2;
    markers.push({ e, P, m: svg.append('path').attr('d', d3.symbol(d3.symbolTriangle, Math.max(30, rh * 2.6))()).attr('fill', c).attr('stroke', '#041226').attr('stroke-width', 1).attr('transform', `translate(${x(0)},${yc}) rotate(90)`).style('display', 'none'), yc });
    svg.append('text').attr('data-id', e.id).attr('x', W - m.r + 8).attr('y', yc + 3.5).attr('fill', e.isYou ? YOU : AX).style('font', `600 10px ${MONO}`).text(`${nf(P.tot.boStart, 1)}${P.tot.boTurnMean ? ' · ' + nf(P.tot.boTurnMean, 1) : ''} m`);
  });
  names(svg, entries, m, rh, 0, i => top + i * rh + rh / 2, o);
  svg.append('text').attr('x', W - m.r + 8).attr('y', top - 6).attr('fill', MUTE).style('font', `600 9px ${MONO}`).text('saída·virada');
  return api(svg, {
    setTime(t) {
      const live = isFinite(t);
      for (const s of segLines) {
        if (!live || t >= s.t1) { s.ln.style('display', null).attr('x2', x(s.P.pos(s.b).x)); s.dot.style('display', null); continue; }
        if (t < s.t0) { s.ln.style('display', 'none'); s.dot.style('display', 'none'); continue; }
        const d = Math.min(s.b, s.P.dAt(t)); s.ln.style('display', null).attr('x2', x(s.P.pos(Math.max(s.a + 1e-3, d)).x)); s.dot.style('display', 'none');
      }
      for (const k of markers) { if (!live) { k.m.style('display', 'none'); continue; } const d = k.P.dAt(Math.max(0, t)); const p = k.P.pos(Math.min(d, k.P.dist - 1e-3)); k.m.style('display', null).attr('transform', `translate(${x(p.x)},${k.yc}) rotate(${p.dir === 1 ? 90 : -90})`); }
    }
  });
}

export function velocidade(el, entries, o = {}) {
  const { svg, W, H } = base(el); const m = { l: 42, r: 14, t: 16, b: 24 };
  const P0 = entries[0].plan; const D = P0.dist, L = P0.poolLen; const x = d3.scaleLinear([0, D], [m.l, W - m.r]);
  const step = Math.max(0.25, D / Math.min(420, (W - m.l - m.r) / 1.4));
  const prof = entries.map(e => { const P = e.plan; const out = []; for (let d = step / 2; d < D; d += step) { const z = P.zoneAt(d); if (z.z !== 0) out.push([d, P.speedAt(d), z.z]); } return out; });
  const vals = prof.flat().map(p => p[1]).sort(d3.ascending);
  const y = d3.scaleLinear([d3.quantile(vals, 0.005) * 0.92, Math.min(vals[vals.length - 1], d3.quantile(vals, 0.97) * 1.25)], [H - m.b, m.t]).nice();
  svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y).attr('y2', y).attr('stroke', GRID);
  for (let w = L; w < D; w += L) svg.append('line').attr('x1', x(w)).attr('x2', x(w)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', w % 50 === 0 && P0.relay ? '#FF5468' : 'rgba(234,246,255,.25)');
  const hl = entries.find(e => foc(e, o)) || entries.find(e => !e.isPro) || entries[0];
  hl.plan.segs.filter(s => s.bo > 0).forEach(s => { const Lg = hl.plan.legs[s.leg]; const a = s.D0 + (s.k === 0 ? Lg.xe : 0); svg.append('rect').attr('x', x(a)).attr('y', m.t).attr('width', Math.max(1, x(s.D0 + s.bo) - x(a))).attr('height', H - m.t - m.b).attr('fill', 'rgba(47,224,240,.09)'); });
  styleAxis(svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(Math.min(10, Math.floor((W - m.l - m.r) / 60))).tickFormat(v => v + ' m').tickSizeOuter(0)));
  styleAxis(svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(v => nf(v, 1)).tickSizeOuter(0)));
 svg.append('text').attr('x', m.l + 4).attr('y', m.t + 2).attr('fill', MUTE).style('font', `600 9px ${MONO}`).text('m/s');
  const line = d3.line(p => x(p[0]), p => y(Math.min(y.domain()[1], p[1]))).curve(d3.curveMonotoneX);
  const clips = []; const dots = [];
  entries.forEach((e, i) => {
    const cid = uid(); const cr = svg.append('clipPath').attr('id', cid).append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H); clips.push(cr);
    if (foc(e, o) && !e.isPro) { const gid = uid(); const gr = svg.append('defs').append('linearGradient').attr('id', gid).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1); gr.append('stop').attr('offset', '0%').attr('stop-color', colorOf(e)).attr('stop-opacity', 0.32); gr.append('stop').attr('offset', '100%').attr('stop-color', colorOf(e)).attr('stop-opacity', 0); svg.append('path').attr('clip-path', `url(#${cid})`).attr('d', d3.area(p => x(p[0]), H - m.b, p => y(Math.min(y.domain()[1], p[1]))).curve(d3.curveMonotoneX)(prof[i])).attr('fill', `url(#${gid})`).attr('pointer-events', 'none'); }
    svg.append('path').attr('data-id', e.id).attr('data-o', e.isPro ? 0.85 : foc(e, o) ? 1 : 0.6).attr('opacity', e.isPro ? 0.85 : foc(e, o) ? 1 : 0.6).attr('clip-path', `url(#${cid})`).attr('d', line(prof[i])).attr('fill', 'none').attr('stroke', colorOf(e)).attr('stroke-width', foc(e, o) ? 2.6 : e.isPro ? 1.6 : 1.2).attr('stroke-dasharray', e.isPro ? '5 3' : null);
    dots.push(svg.append('circle').attr('data-id', e.id).attr('r', e.isYou ? 4 : 3).attr('fill', colorOf(e)).attr('stroke', '#041226').style('display', 'none'));
  });
  const vl = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('stroke', 'rgba(234,246,255,.5)').style('display', 'none');
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent')
    .on('mousemove', ev => { const [px] = d3.pointer(ev); const d = x.invert(px); vl.style('display', null).attr('x1', px).attr('x2', px); const rows = entries.map(e => ({ e, v: e.plan.speedAt(Math.max(0.05, Math.min(D - 0.05, d))), z: e.plan.zoneAt(Math.max(0.05, Math.min(D - 0.05, d))).z })).sort((a, b) => b.v - a.v).slice(0, 8); showTip(`<b>${nf(d, 1)} m</b><br>` + rows.map(r => `<span style="color:${colorOf(r.e)}">■</span> ${esc((r.e.short || r.e.name).split(' ')[0])} ${nf(r.v, 2)} m/s${r.z === 1 ? ' · submerso' : ''}`).join('<br>'), ev); })
   .on('mouseleave', () => { vl.style('display', 'none'); hideTip(); });
   return api(svg, { setTime(t) { const live = isFinite(t); entries.forEach((e, i) => { if (!live) { clips[i].attr('width', W); dots[i].style('display', 'none'); return; } const d = e.plan.dAt(Math.max(0, t)); clips[i].attr('width', x(d)); const dd = Math.max(0.05, Math.min(D - 0.05, d)); dots[i].style('display', t > 0 && t < e.plan.T ? null : 'none').attr('cx', x(dd)).attr('cy', y(Math.min(y.domain()[1], e.plan.speedAt(dd)))); }); } });
}

export function srdps(el, entries, o = {}) {
  const { svg, W, H } = base(el); const m = { l: 44, r: 58, t: 14, b: 30 };
  const pts = entries.flatMap(e => e.plan.segs.filter(s => s.SR > 0 && s.swimDist > 1).map((s, j) => ({ e, s, j })));
  const x = d3.scaleLinear(d3.extent(pts, p => p.s.SR), [m.l, W - m.r]).nice(); const y = d3.scaleLinear(d3.extent(pts, p => p.s.DPS), [H - m.b, m.t]).nice();
  x.domain([x.domain()[0] - 2, x.domain()[1] + 2]); y.domain([y.domain()[0] - 0.05, y.domain()[1] + 0.05]);
  const [x0, x1] = x.domain(), [y0, y1] = y.domain();
  const vmin = x0 * y0 / 60, vmax = x1 * y1 / 60; const stepV = (vmax - vmin) > 1.2 ? 0.2 : 0.1;
  for (let v = Math.ceil(vmin / stepV) * stepV; v < vmax; v += stepV) {
    const ln = d3.range(0, 41).map(k => { const sr = x0 + (x1 - x0) * k / 40; return [sr, 60 * v / sr]; }).filter(p => p[1] >= y0 && p[1] <= y1); if (ln.length < 2) continue;
    svg.append('path').attr('d', d3.line(p => x(p[0]), p => y(p[1]))(ln)).attr('fill', 'none').attr('stroke', 'rgba(141,179,207,.25)').attr('stroke-dasharray', '2 3');
    const q = ln[ln.length - 1]; svg.append('text').attr('x', Math.min(W - m.r + 4, x(q[0]) + 4)).attr('y', y(q[1]) + 3).attr('fill', MUTE).style('font', `500 9px ${MONO}`).text(nf(v, 1) + ' m/s');
  }
  styleAxis(svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(6).tickSizeOuter(0)));
  styleAxis(svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(v => nf(v, 1)).tickSizeOuter(0)));
   svg.append('text').attr('x', W - m.r).attr('y', H - 4).attr('text-anchor', 'end').attr('fill', MUTE).style('font', `600 9px ${MONO}`).text('frequência (ciclos/min) →');
  svg.append('text').attr('x', m.l + 4).attr('y', m.t + 2).attr('fill', MUTE).style('font', `600 9px ${MONO}`).text('↑ m por ciclo');
  const groups = entries.map(e => {
    const ps = pts.filter(p => p.e === e); const c = colorOf(e); const g = svg.append('g').attr('data-id', e.id).attr('data-o', e.isPro ? 0.9 : foc(e, o) ? 1 : 0.65).attr('opacity', e.isPro ? 0.9 : foc(e, o) ? 1 : 0.65);
    const path = g.append('path').attr('fill', 'none').attr('stroke', c).attr('stroke-width', foc(e, o) ? 2.4 : 1.2).attr('stroke-dasharray', e.isPro ? '4 3' : null);
    const nodes = ps.map((p, k) => {
      const r = 2.4 + 3.2 * (ps.length > 1 ? k / (ps.length - 1) : 1);
      const nd = e.isPro ? g.append('path').attr('d', d3.symbol(d3.symbolDiamond, r * r * 4)()).attr('transform', `translate(${x(p.s.SR)},${y(p.s.DPS)})`).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 1.4)
        : g.append('circle').attr('cx', x(p.s.SR)).attr('cy', y(p.s.DPS)).attr('r', r).attr('fill', c).attr('stroke', '#041226');
      nd.style('cursor', 'pointer').on('mousemove', ev => { o.onHover && o.onHover(e.id); showTip(`<b style="color:${c}">${esc(e.name)}</b><br>${Math.round(p.s.D0)}–${Math.round(p.s.D1)} m · ${p.s.stroke === 'L' ? 'livre' : p.s.stroke === 'C' ? 'costas' : p.s.stroke === 'P' ? 'peito' : 'borboleta'}<br>SR ${nf(p.s.SR, 0)} cic/min · DPS ${nf(p.s.DPS, 2)} m<br>${nf(p.s.vSwim, 2)} m/s · ${Math.round(p.s.strokes)} braçadas`, ev); }).on('mouseleave', () => { hideTip(); o.onHover && o.onHover(null); }).on('click', () => o.onPick && o.onPick(e.id));
      return { p, nd };
    });
    const draw = k => { const vis = nodes.slice(0, k); path.attr('d', vis.length > 1 ? d3.line(n => x(n.p.s.SR), n => y(n.p.s.DPS))(vis) : null); nodes.forEach((n, i) => n.nd.style('display', i < k ? null : 'none')); };
    draw(nodes.length); return { e, nodes, draw };
  });
  return api(svg, { setTime(t) { const live = isFinite(t); groups.forEach(G => G.draw(live ? G.nodes.filter(n => n.p.s.T1 <= t || (n.p.s.TBo != null ? n.p.s.TBo < t : n.p.s.T0 < t)).length : G.nodes.length)); } });
}

export function bracadas(el, entries, o = {}) {
  const { svg, W, H } = base(el); const { m, n, rh } = rowsFrame(svg, W, H, entries, o, { r: 52 });
   const P0 = entries[0].plan; const D = P0.dist, L = P0.poolLen; const x = d3.scaleLinear([0, D], [m.l, W - m.r]); const bh = Math.max(5, rh * 0.62);
  const y = i => m.t + i * rh + (rh - bh) / 2;
  for (let w = L; w < D; w += L) svg.append('line').attr('x1', x(w)).attr('x2', x(w)).attr('y1', m.t).attr('y2', m.t + n * rh).attr('stroke', 'rgba(234,246,255,.22)');
  styleAxis(svg.append('g').attr('transform', `translate(0,${m.t + n * rh + 2})`).call(d3.axisBottom(x).ticks(Math.min(10, Math.floor((W - m.l - m.r) / 60))).tickFormat(v => v + ' m').tickSizeOuter(0)));
  svg.append('text').attr('x', W - m.r + 6).attr('y', m.t - 8).attr('fill', MUTE).style('font', `600 9px ${MONO}`).text('braçadas');
  const rows = entries.map((e, i) => {
    const P = e.plan; const yy = y(i); const c = colorOf(e); const marks = P.strokeMarks();
    const cid = uid(); const cr = svg.append('clipPath').attr('id', cid).append('rect').attr('x', 0).attr('y', 0).attr('width', W).attr('height', H);
    const g = svg.append('g').attr('data-id', e.id).attr('data-o', e.isPro ? 0.8 : 1).attr('clip-path', `url(#${cid})`);
    P.segs.filter(s => s.bo > 0).forEach(s => { const Lg = P.legs[s.leg]; const a = s.D0 + (s.k === 0 ? Lg.xe : 0); g.append('rect').attr('x', x(a)).attr('y', yy + bh * 0.35).attr('width', Math.max(1, x(s.D0 + s.bo) - x(a))).attr('height', bh * 0.3).attr('fill', PHASE_C.uw).attr('opacity', 0.75); });
    g.append('path').attr('d', marks.map(d => `M${x(d).toFixed(1)},${yy.toFixed(1)}v${bh.toFixed(1)}`).join('')).attr('stroke', c).attr('stroke-width', foc(e, o) ? 1.8 : 1.1).attr('opacity', e.isPro ? 0.75 : foc(e, o) ? 1 : 0.8);
    const tx = svg.append('text').attr('data-id', e.id).attr('x', W - m.r + 6).attr('y', yy + bh / 2 + 4).attr('fill', e.isYou ? YOU : INK).style('font', `700 12px ${MONO}`).text(Math.round(P.tot.strokes));
    return { e, P, cr, tx, marks };
  });
  names(svg, entries, m, rh, bh, y, o);
  svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', n * rh).attr('fill', 'transparent')
    .on('mousemove', ev => { const [px, py] = d3.pointer(ev); const r = rows[Math.floor((py - m.t) / rh)]; if (!r) return hideTip(); const d = x.invert(px); const s = r.P.segAt(Math.max(0, Math.min(D - 0.01, d))); o.onHover && o.onHover(r.e.id); showTip(`<b style="color:${colorOf(r.e)}">${esc(r.e.name)}</b><br>${Math.round(s.D0)}–${Math.round(s.D1)} m: ${Math.round(s.strokes)} braçadas<br>${nf(s.SR, 0)} cic/min · ${nf(s.DPS, 2)} m/ciclo`, ev); })
    .on('mouseleave', () => { hideTip(); o.onHover && o.onHover(null); }).on('click', ev => { const [, py] = d3.pointer(ev); const r = rows[Math.floor((py - m.t) / rh)]; r && o.onPick && o.onPick(r.e.id); });
  return api(svg, { setTime(t) { const live = isFinite(t); rows.forEach(r => { if (!live) { r.cr.attr('width', W); r.tx.text(Math.round(r.P.tot.strokes)); return; } const d = r.P.dAt(Math.max(0, t)); r.cr.attr('width', x(d)); r.tx.text(d3.bisectLeft(r.marks, d)); }); } });
}

export function parciais(el, entries, o = {}) {
  const { svg, W, H } = base(el); const P0 = entries[0].plan; const D = P0.dist;
  const step = D <= 100 ? 25 : 50; const data = entries.map(e => e.plan.splits(step)); const cols = data[0].map(s => s.d);
  const m = { l: Math.min(150, Math.max(90, W * 0.24)), r: 62, t: 22, b: 6 }; const n = entries.length; const rh = Math.min(28, (H - m.t - m.b) / n);
  const cw = (W - m.l - m.r) / cols.length;
  const best = cols.map((_, j) => d3.min(data.filter((_, i) => !entries[i].isPro), r => r[j].split));
  const worst = d3.max(cols.map((_, j) => d3.max(data.filter((_, i) => !entries[i].isPro), r => r[j].split - best[j]))) || 1;
   const col = d3.scaleSequential(d3.interpolateCividis).domain([worst, 0]);
  cols.forEach((d, j) => svg.append('text').attr('x', m.l + cw * (j + 0.5)).attr('y', m.t - 8).attr('text-anchor', 'middle').attr('fill', AX).style('font', `600 9.5px ${MONO}`).text(`${d} m`));
  svg.append('text').attr('x', W - m.r + 6).attr('y', m.t - 8).attr('fill', AX).style('font', `600 9.5px ${MONO}`).text('total');
  const cells = [];
  entries.forEach((e, i) => {
    const g = svg.append('g').attr('data-id', e.id); const yy = m.t + i * rh;
     data[i].forEach((s, j) => {
      const dv = s.split - best[j]; const bg = e.isPro ? '#0b2a44' : col(Math.max(0, dv)); const lum = d3.hsl(bg).l;
      const r = g.append('rect').attr('x', m.l + cw * j + 1).attr('y', yy + 1).attr('width', cw - 2).attr('height', rh - 2).attr('fill', bg);
      const t = g.append('text').attr('x', m.l + cw * (j + 0.5)).attr('y', yy + rh / 2 + 4).attr('text-anchor', 'middle').attr('fill', lum > 0.55 ? '#041226' : '#eaf6ff').style('font', `600 ${cw < 52 ? 9.5 : 11}px ${MONO}`).text(nf(s.split, 2));
      r.on('mousemove', ev => showTip(`<b style="color:${colorOf(e)}">${esc(e.name)}</b><br>${s.d - step}–${s.d} m: ${nf(s.split, 2)} s${e.isPro ? '' : `<br>+${nf(dv, 2)} s para a melhor parcial`}<br>passagem ${fmtTime(s.t)}`, ev)).on('mouseleave', hideTip);
      cells.push({ i, s, r, t });
    });
    if (foc(e, o)) g.append('rect').attr('x', m.l).attr('y', yy).attr('width', cw * cols.length).attr('height', rh).attr('fill', 'none').attr('stroke', o.focus ? '#2FE0F0' : YOU).attr('stroke-width', 1.5);
    cells.push({ i, s: { t: e.plan.T }, t: svg.append('text').attr('data-id', e.id).attr('x', W - m.r + 6).attr('y', yy + rh / 2 + 4).attr('fill', e.isYou ? YOU : INK).style('font', `700 11px ${MONO}`).text(fmtTime(e.plan.T)) });
  });
  names(svg, entries, m, rh, 0, i => m.t + i * rh + rh / 2, o);
  return api(svg, { setTime(t) { const live = isFinite(t); cells.forEach(c => { const show = !live || t >= c.s.t || entries[c.i].isPro; if (c.r) c.r.style('display', show ? null : 'none'); c.t.style('display', show ? null : 'none'); }); } });
}

export function perda(el, entry, other, o = {}) {
  const { svg, W, H } = base(el); const m = { l: 96, r: 70, t: 26, b: 18 };
  const p = entry && entry.plan; const pro = p && (p.pro || null);
  if (!p || !pro || entry.isPro) { svg.append('text').attr('x', W / 2).attr('y', H / 2).attr('text-anchor', 'middle').attr('fill', AX).style('font', `600 12px ${SANS}`).text('Selecione um nadador'); return api(svg); }
    const parts = (P) => [['Saída 0–15 m', P.zones.start - pro.zones.start, '#2FE0F0'], ['Viradas', P.zones.turns - pro.zones.turns, '#FFD23F'], ['Nado limpo', P.zones.clean - pro.zones.clean, '#2b7bc0'], ['Chegada', P.zones.finish - pro.zones.finish, '#eaf6ff']];
  const A = parts(p).filter(r => p.laps > 1 || p.relay || r[0] !== 'Viradas'); const tot = p.T - pro.T;
  const B = other && other.plan && other !== entry ? parts(other.plan).filter(r => p.laps > 1 || p.relay || r[0] !== 'Viradas') : null;
  const cats = [...A.map(r => r[0]), 'Total'];
  const x = d3.scaleLinear([Math.min(0, d3.min(A, r => r[1])), Math.max(tot, B ? other.plan.T - pro.T : 0) * 1.06 || 1], [m.l, W - m.r]);
  const yb = d3.scaleBand(cats, [m.t, H - m.b]).padding(0.28);
  svg.append('text').attr('x', m.l).attr('y', 14).attr('fill', INK).style('font', `700 12px ${SANS}`).text(`${entry.short || entry.name} − PRO = +${nf(tot, 2)} s`);
  if (B) svg.append('text').attr('x', W - m.r + 66).attr('y', 14).attr('text-anchor', 'end').attr('fill', colorOf(other)).style('font', `600 10px ${MONO}`).text(`▮ ${(other.short || other.name).split(' ')[0]}`);
  svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t - 4).attr('y2', H - m.b).attr('stroke', 'rgba(234,246,255,.5)');
  styleAxis(svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(v => '+' + nf(v, 1) + 's').tickSizeOuter(0)));
  let acc = 0, accB = 0;
  A.forEach((r, i) => {
    const y0 = yb(r[0]), bw = yb.bandwidth(); const a = acc, b = acc + r[1]; acc = b;
    svg.append('rect').attr('x', x(Math.min(a, b))).attr('y', y0).attr('width', Math.max(1, Math.abs(x(b) - x(a)))).attr('height', B ? bw * 0.66 : bw).attr('fill', r[2]);
    if (B) { const rb = B[i]; const a2 = accB, b2 = accB + rb[1]; accB = b2; svg.append('rect').attr('x', x(Math.min(a2, b2))).attr('y', y0 + bw * 0.72).attr('width', Math.max(1, Math.abs(x(b2) - x(a2)))).attr('height', bw * 0.28).attr('fill', colorOf(other)).attr('opacity', 0.85); }
    svg.append('text').attr('x', m.l - 8).attr('y', y0 + bw / 2 + 4).attr('text-anchor', 'end').attr('fill', AX).style('font', `600 10.5px ${SANS}`).text(r[0]);
    svg.append('text').attr('x', x(Math.max(a, b)) + 5).attr('y', y0 + bw / 2 + 4).attr('fill', INK).style('font', `600 10.5px ${MONO}`).text(`+${nf(r[1], 2)} · ${Math.round(100 * r[1] / (tot || 1))}%`);
  });
  const yT = yb('Total'), bw = yb.bandwidth();
  svg.append('rect').attr('x', x(0)).attr('y', yT).attr('width', Math.max(1, x(tot) - x(0))).attr('height', B ? bw * 0.66 : bw).attr('fill', '#FF5468');
  if (B) svg.append('rect').attr('x', x(0)).attr('y', yT + bw * 0.72).attr('width', Math.max(1, x(other.plan.T - pro.T) - x(0))).attr('height', bw * 0.28).attr('fill', colorOf(other));
  svg.append('text').attr('x', m.l - 8).attr('y', yT + bw / 2 + 4).attr('text-anchor', 'end').attr('fill', INK).style('font', `700 11px ${SANS}`).text('Total');
  svg.append('text').attr('x', x(tot) + 5).attr('y', yT + bw / 2 + 4).attr('fill', '#FF5468').style('font', `700 11px ${MONO}`).text(`+${nf(tot, 2)} s`);
  return api(svg);
}

export function panorama(el, rows, metric, pros, o = {}) {
  const { svg, W, H } = base(el, 260);
  const codes = EVENT_ORDER.filter(c => rows.some(r => r.code === c)); if (!codes.length) return api(svg);
  const nc = W > 1100 ? 5 : W > 760 ? 4 : W > 520 ? 3 : 2; const nr = Math.ceil(codes.length / nc);
  const cw = W / nc, ch = H / nr; const pad = { l: 12, r: 12, t: 40, b: 22 };
  codes.forEach((code, k) => {
    const gx = (k % nc) * cw, gy = Math.floor(k / nc) * ch; const g = svg.append('g').attr('transform', `translate(${gx},${gy})`);
    g.append('rect').attr('x', 3).attr('y', 3).attr('width', cw - 6).attr('height', ch - 6).attr('fill', '#071a2e').attr('stroke', 'rgba(141,179,207,.14)');
    const rs = rows.filter(r => r.code === code && isFinite(r.v)); const pv = pros[code];
    const ext = d3.extent([...rs.map(r => r.v), ...(isFinite(pv) ? [pv] : [])]); if (ext[0] === ext[1]) { ext[0] -= 1; ext[1] += 1; }
    const x = d3.scaleLinear(ext, [pad.l, cw - pad.r]).nice();
    g.append('text').attr('x', 12).attr('y', 20).attr('fill', INK).style('font', `800 14px 'Big Shoulders Display', sans-serif`).style('letter-spacing', '.05em').text(EVENTS[code].label.toUpperCase());
    const med = d3.median(rs, r => r.v);
    g.append('text').attr('x', 12).attr('y', 33).attr('fill', AX).style('font', `500 9.5px ${MONO}`).text(`med ${metric.fmt(med)} · PRO ${isFinite(pv) ? metric.fmt(pv) : '—'}${metric.unit ? ' ' + metric.unit : ''}`);
    styleAxis(g.append('g').attr('transform', `translate(0,${ch - pad.b})`).call(d3.axisBottom(x).ticks(4).tickSizeOuter(0)));
    const r0 = Math.max(1.6, Math.min(3.6, (cw - 30) / Math.max(40, rs.length) * 1.1)); const cy = pad.t + (ch - pad.t - pad.b) / 2; const half = (ch - pad.t - pad.b) / 2 - 2;
    const placed = []; const sorted = [...rs].sort((a, b) => a.v - b.v);
    sorted.forEach(r => { const px = x(r.v); let yy = 0; for (let j = 0; j < 80; j++) { const c = j === 0 ? 0 : (j % 2 ? 1 : -1) * Math.ceil(j / 2) * r0 * 1.9; if (!placed.some(p => Math.abs(p.x - px) < r0 * 1.9 && Math.abs(p.y - c) < r0 * 1.9)) { yy = c; break; } yy = c; } yy = Math.max(-half, Math.min(half, yy)); placed.push({ x: px, y: yy }); r.px = px; r.py = cy + yy; });
     g.append('line').attr('x1', x(med)).attr('x2', x(med)).attr('y1', pad.t).attr('y2', ch - pad.b).attr('stroke', 'rgba(234,246,255,.6)').attr('stroke-dasharray', '3 3');
    g.selectAll('circle').data(sorted).join('circle').attr('cx', r => r.px).attr('cy', r => r.py).attr('r', r0).attr('fill', r => r.isYou ? YOU : (COMP_COLORS[r.comp] || '#8db3cf')).attr('opacity', 0.85).style('cursor', 'pointer')
      .on('mousemove', (ev, r) => showTip(`<b>${esc(r.name)}</b> · ${esc(r.team || '')}<br>${r.comp} ${r.year} · ${fmtTime(r.time)}<br>${metric.label}: <b>${metric.fmt(r.v)}${metric.unit ? ' ' + metric.unit : ''}</b>`, ev)).on('mouseleave', hideTip)
      .on('click', (ev, r) => o.onPick && o.onPick(r));
    if (isFinite(pv)) { g.append('path').attr('d', d3.symbol(d3.symbolDiamond, 90)()).attr('transform', `translate(${x(pv)},${cy})`).attr('fill', '#FF5468').attr('stroke', '#041226'); g.append('text').attr('x', x(pv)).attr('y', pad.t - 2).attr('text-anchor', 'middle').attr('fill', '#FF5468').style('font', `700 9px ${MONO}`).text('PRO'); }
  });
  return api(svg);
}

export function passagens(el, entries, o = {}) {
  const showT = o.showT !== false, showS = o.showS !== false, showDir = o.showDir !== false;
  const { svg, W, H } = base(el); const P0 = entries[0].plan; const D = P0.dist; const unit = o.unit && o.unit < D ? o.unit : (D <= 100 ? 25 : D <= 200 ? 50 : 100);
  const segs = d3.range(0, D, unit).map(a => ({ a, b: Math.min(D, a + unit) }));
  const marksArr = entries.map(e => e.plan.strokeMarks());
  const data = entries.map((e, ei) => { const P = e.plan; const mk = marksArr[ei]; return segs.map(s => { const t0 = s.a === 0 ? 0 : P.tAt(s.a - 1e-3), t1 = s.b >= D ? P.T : P.tAt(s.b - 1e-3); const dir = P.pos(Math.min(D - 0.01, (s.a + s.b) / 2)).dir; const mixed = P.pos(s.a + 0.01).dir !== P.pos(Math.min(D - 0.01, s.b - 0.01)).dir; return { ...s, split: t1 - t0, t1, n: mk.filter(d => d >= s.a && d < s.b).length, dir, mixed }; }); });
  const m = { l: 44, r: 14, t: showDir ? 26 : 12, b: 22 };
  if (!showT && !showS) { svg.append('text').attr('x', W / 2).attr('y', H / 2).attr('text-anchor', 'middle').attr('fill', AX).style('font', `600 12px ${SANS}`).text('Ative tempos ou braçadas'); return api(svg); }
  const both = showT && showS; const gap = both ? 22 : 0; const ih = H - m.t - m.b - gap; const hT = showT ? (both ? ih * 0.56 : ih) : 0; const hS = showS ? ih - hT : 0;
  const x = d3.scaleBand(segs.map(s => s.a), [m.l, W - m.r]).paddingInner(0.1); const bw = x.bandwidth(); const cx = s => x(s.a) + bw / 2;
  if (showDir) segs.forEach((s, j) => { const d0 = data[0][j]; const c = d0.mixed ? '#cfe3f2' : d0.dir === 1 ? '#2FE0F0' : '#FFD23F'; const L = P0.poolLen; const sx = d3.scaleLinear([s.a, s.b], [x(s.a), x(s.a) + bw]); for (let w = s.a; w < s.b - 1e-6; w = Math.min(s.b, (Math.floor(w / L + 1e-6) + 1) * L)) { const w2 = Math.min(s.b, (Math.floor(w / L + 1e-6) + 1) * L); const dd = P0.pos(Math.min(D - 0.01, (w + w2) / 2)).dir; svg.append('rect').attr('x', sx(w)).attr('y', m.t - 6).attr('width', Math.max(1, sx(w2) - sx(w) - (w2 < s.b ? 1 : 0))).attr('height', H - m.t - m.b + 6).attr('fill', dd === 1 ? '#2FE0F0' : '#FFD23F').attr('opacity', 0.07); } svg.append('text').attr('x', cx(s)).attr('y', m.t - 11).attr('text-anchor', 'middle').attr('fill', c).style('font', `700 9.5px ${MONO}`).text(d0.mixed ? 'IDA + VOLTA' : d0.dir === 1 ? 'IDA →' : '← VOLTA'); });
  segs.forEach(s => svg.append('text').attr('x', cx(s)).attr('y', H - 7).attr('text-anchor', 'middle').attr('fill', AX).style('font', `500 9.5px ${MONO}`).text(`${s.a}–${s.b} m`));
  const hl = entries.find(e => e.id === o.focus) || entries.find(e => e.isYou) || entries[1] || entries[0];
  const order = [...entries.filter(e => e !== hl), hl]; const idx = e => entries.indexOf(e);
  const reveal = [];
  const panel = (y0, h, key, fmt, zero, label) => {
    const vals = data.flat().map(d => d[key]); const lo = zero ? 0 : d3.min(vals) * 0.97, hi = d3.max(vals) * (zero ? 1.18 : 1.03);
    const y = d3.scaleLinear([lo, hi], [y0 + h, y0 + 4]).nice(4);
    svg.append('g').selectAll('line').data(y.ticks(4)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', y).attr('y2', y).attr('stroke', GRID);
    styleAxis(svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(v => fmt(v)).tickSizeOuter(0)));
    svg.append('text').attr('x', m.l + 4).attr('y', y0 + 4).attr('fill', MUTE).style('font', `600 9px ${MONO}`).text(label);
    order.forEach(e => {
      const i = idx(e); const c = colorOf(e); const isH = e === hl; const g = svg.append('g').attr('data-id', e.id).attr('data-o', isH ? 1 : e.isPro ? 0.7 : 0.45).attr('opacity', isH ? 1 : e.isPro ? 0.7 : 0.45);
      const pts = data[i].map(d => [cx(d), y(d[key]), d]);
      if (zero && isH) pts.forEach(([px, py, d]) => { const r = g.append('rect').attr('x', px - bw * 0.2).attr('y', py).attr('width', bw * 0.4).attr('height', y(0) - py).attr('fill', c).attr('opacity', 0.85); const t = g.append('text').attr('x', px).attr('y', py - 5).attr('text-anchor', 'middle').attr('fill', INK).style('font', `700 11px ${MONO}`).text(fmt(d[key])); reveal.push({ e, d, els: [r, t], bar: { r, t, y, i } }); });
      else {
        const ln = g.append('path').attr('d', d3.line()(pts.map(p => [p[0], p[1]]))).attr('fill', 'none').attr('stroke', c).attr('stroke-width', isH ? 2.4 : 1.1).attr('stroke-dasharray', e.isPro ? '5 3' : null);
        reveal.push({ e, line: ln, pts, key });
        pts.forEach(([px, py, d]) => { const dot = e.isPro ? g.append('path').attr('d', d3.symbol(d3.symbolDiamond, 46)()).attr('transform', `translate(${px},${py})`).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 1.4) : g.append('circle').attr('cx', px).attr('cy', py).attr('r', isH ? 4.5 : 2.6).attr('fill', c).attr('stroke', '#041226'); const els = [dot]; if (isH) els.push(g.append('text').attr('x', px).attr('y', py - 9).attr('text-anchor', 'middle').attr('fill', INK).style('font', `700 11px ${MONO}`).text(fmt(d[key]))); reveal.push({ e, d, els }); });
      }
    });
  };
  if (showT) panel(m.t, hT, 'split', v => nf(v, v >= 100 ? 0 : 1) + 's', false, 'PARCIAL');
  if (showS) panel(m.t + hT + gap, hS, 'n', v => String(Math.round(v)), true, 'BRAÇADAS');
  svg.append('text').attr('x', W - m.r).attr('y', m.t - 11).attr('text-anchor', 'end').attr('fill', colorOf(hl)).style('font', `700 10px ${MONO}`).text(showDir ? '' : (hl.short || hl.name));
  segs.forEach((s, j) => svg.append('rect').attr('x', x(s.a)).attr('y', m.t - 6).attr('width', bw).attr('height', H - m.t - m.b + 6).attr('fill', 'transparent')
    .on('mousemove', ev => { const rows = entries.map((e, i) => ({ e, d: data[i][j] })).sort((p, q) => p.d.split - q.d.split); showTip(`<b>${s.a}–${s.b} m</b> · ${data[0][j].mixed ? 'ida + volta' : data[0][j].dir === 1 ? 'ida' : 'volta'}<br>` + rows.slice(0, 9).map(r => `<span style="color:${colorOf(r.e)}">■</span> ${esc((r.e.short || r.e.name).split(' ')[0])} ${nf(r.d.split, 2)} s · ${r.d.n} braç.`).join('<br>'), ev); })
    .on('mouseleave', hideTip).on('click', () => { const r = entries.map((e, i) => ({ e, d: data[i][j] })).filter(r => !r.e.isPro).sort((p, q) => p.d.split - q.d.split)[0]; r && o.onPick && o.onPick(r.e.id); }));
  return api(svg, { setTime(t) { const live = isFinite(t); reveal.forEach(r => {
    if (r.e.isPro || !live) { if (r.line) r.line.attr('d', d3.line()(r.pts.map(p => [p[0], p[1]]))); else r.els.forEach(x => x.style('display', null)); if (r.bar) { const yy = r.bar.y(r.d.n); r.bar.r.attr('y', yy).attr('height', r.bar.y(0) - yy); r.bar.t.attr('y', yy - 5).text(r.d.n); } return; }
    if (r.line) { const vis = r.pts.filter(p => p[2].t1 <= t); r.line.attr('d', vis.length > 1 ? d3.line()(vis.map(p => [p[0], p[1]])) : null); return; }
    if (r.bar && t < r.d.t1) { const P = r.e.plan; const t0 = r.d.a === 0 ? 0 : P.tAt(r.d.a - 1e-3); if (t <= t0) { r.els.forEach(x => x.style('display', 'none')); return; } const dd = P.dAt(t); const n = marksArr[r.bar.i].filter(x => x >= r.d.a && x < Math.min(r.d.b, dd)).length; const yy = r.bar.y(n); r.bar.r.style('display', null).attr('y', yy).attr('height', Math.max(0, r.bar.y(0) - yy)); r.bar.t.style('display', null).attr('y', yy - 5).text(n); return; }
    if (r.bar) { const yy = r.bar.y(r.d.n); r.bar.r.attr('y', yy).attr('height', r.bar.y(0) - yy); r.bar.t.attr('y', yy - 5).text(r.d.n); }
    const show = t >= r.d.t1; r.els.forEach(x => x.style('display', show ? null : 'none')); }); } });
}

export function correlacoes(el, rows, mets, o = {}) {
  const { svg, W, H } = base(el, 260); const n = mets.length; if (rows.length < 5) return api(svg);
 const byCode = d3.group(rows, r => r.code); const Z = rows.map(r => ({ r, z: {} }));
  mets.forEach(m => { for (const [, rs] of byCode) { const v = rs.map(r => r.sum[m.k]).filter(isFinite); const mu = d3.mean(v), sd = d3.deviation(v) || 1; rs.forEach(r => { const zz = Z.find(q => q.r === r); zz.z[m.k] = isFinite(r.sum[m.k]) ? (r.sum[m.k] - mu) / sd : NaN; }); } });
  if (o.partial !== false && mets.some(m => m.k === 'q')) { mets.forEach(m => { if (m.k === 'q') return; const p = Z.filter(q => isFinite(q.z[m.k]) && isFinite(q.z.q)); const mq = d3.mean(p, q => q.z.q), mm = d3.mean(p, q => q.z[m.k]); let cv = 0, vq = 0; p.forEach(q => { cv += (q.z.q - mq) * (q.z[m.k] - mm); vq += (q.z.q - mq) ** 2; }); const bq = cv / (vq || 1); Z.forEach(q => { if (isFinite(q.z[m.k])) q.z[m.k] = q.z[m.k] - mm - bq * (q.z.q - mq); }); }); }
  const pear = (a, b) => { const p = Z.filter(q => isFinite(q.z[a]) && isFinite(q.z[b])); if (p.length < 5) return NaN; const ma = d3.mean(p, q => q.z[a]), mb = d3.mean(p, q => q.z[b]); let sab = 0, sa = 0, sb = 0; p.forEach(q => { const da = q.z[a] - ma, db = q.z[b] - mb; sab += da * db; sa += da * da; sb += db * db; }); return sab / Math.sqrt(sa * sb || 1); };
  const S = Math.min(H - 92, W * 0.46); const cs = S / n; const ox = 92, oy = 26; const col = d3.scaleSequential(d3.interpolateRdBu).domain([1, -1]);
  let sel = o.sel || [mets[0].k, mets[1].k];
  mets.forEach((m, i) => { svg.append('text').attr('x', ox - 6).attr('y', oy + cs * (i + 0.5) + 4).attr('text-anchor', 'end').attr('fill', AX).style('font', `600 10px ${SANS}`).text(m.label); svg.append('text').attr('transform', `translate(${ox + cs * (i + 0.5)},${oy + S + 8}) rotate(40)`).attr('fill', AX).style('font', `600 9.5px ${SANS}`).text(m.label); });
  const cells = svg.append('g'); const right = svg.append('g');
  const drawScatter = () => {
    right.selectAll('*').remove(); const [a, b] = sel; const ma = mets.find(m => m.k === a), mb = mets.find(m => m.k === b);
    const x0 = ox + S + 40, w = W - x0 - 12, h = H - 70; const pts = Z.filter(q => isFinite(q.z[a]) && isFinite(q.z[b]));
    const x = d3.scaleLinear(d3.extent(pts, q => q.z[a]), [x0, x0 + w]).nice(), y = d3.scaleLinear(d3.extent(pts, q => q.z[b]), [oy + h, oy]).nice();
    styleAxis(right.append('g').attr('transform', `translate(0,${oy + h})`).call(d3.axisBottom(x).ticks(5).tickSizeOuter(0))); styleAxis(right.append('g').attr('transform', `translate(${x0},0)`).call(d3.axisLeft(y).ticks(5).tickSizeOuter(0)));
    const bins = d3.contourDensity().x(q => x(q.z[a])).y(q => y(q.z[b])).size([W, H]).bandwidth(16).thresholds(8)(pts);
    right.append('g').selectAll('path').data(bins).join('path').attr('d', d3.geoPath()).attr('fill', 'none').attr('stroke', '#2FE0F0').attr('stroke-opacity', (d, i) => 0.15 + 0.6 * i / bins.length);
    right.append('g').selectAll('circle').data(pts).join('circle').attr('cx', q => x(q.z[a])).attr('cy', q => y(q.z[b])).attr('r', 2).attr('fill', q => COMP_COLORS[q.r.comp] || AX).attr('opacity', 0.55)
      .on('mousemove', (ev, q) => showTip(`<b>${esc(q.r.name)}</b> · ${EVENTS[q.r.code].label}<br>${fmtTime(q.r.time)} · ${q.r.comp} ${q.r.year}`, ev)).on('mouseleave', hideTip);
    const r = pear(a, b); const mx = d3.mean(pts, q => q.z[a]), my = d3.mean(pts, q => q.z[b]); const sl = r * (d3.deviation(pts, q => q.z[b]) / (d3.deviation(pts, q => q.z[a]) || 1)); const [d0, d1] = x.domain();
    right.append('line').attr('x1', x(d0)).attr('x2', x(d1)).attr('y1', y(my + sl * (d0 - mx))).attr('y2', y(my + sl * (d1 - mx))).attr('stroke', '#FFD23F').attr('stroke-width', 2);
    right.append('text').attr('x', x0 + w).attr('y', oy + 10).attr('text-anchor', 'end').attr('fill', '#FFD23F').style('font', `700 13px ${MONO}`).text(`r = ${nf(r, 2)} · n = ${pts.length}`);
     right.append('text').attr('x', x0 + w / 2).attr('y', oy + h + 30).attr('text-anchor', 'middle').attr('fill', AX).style('font', `600 10.5px ${SANS}`).text(`${ma.label} (z) →`); right.append('text').attr('x', x0 + 4).attr('y', oy - 4).attr('fill', AX).style('font', `600 10.5px ${SANS}`).text(`↑ ${mb.label} (z)`);
    cells.selectAll('rect').attr('stroke', d => (d[0] === a && d[1] === b) || (d[0] === b && d[1] === a) ? '#FFD23F' : 'none');
  };
  const pairs = []; mets.forEach((ma, i) => mets.forEach((mb, j) => pairs.push([ma.k, mb.k, i, j, i === j ? 1 : pear(ma.k, mb.k)])));
  cells.selectAll('rect').data(pairs).join('rect').attr('x', d => ox + d[3] * cs + 1).attr('y', d => oy + d[2] * cs + 1).attr('width', cs - 2).attr('height', cs - 2).attr('fill', d => isFinite(d[4]) ? col(d[4]) : '#0b2a44').attr('stroke-width', 2).style('cursor', 'pointer')
    .on('mousemove', (ev, d) => showTip(`${mets[d[2]].label} × ${mets[d[3]].label}<br><b>r = ${nf(d[4], 2)}</b>`, ev)).on('mouseleave', hideTip).on('click', (ev, d) => { if (d[2] === d[3]) return; sel = [d[1], d[0]]; drawScatter(); o.onSel && o.onSel(sel); });
  cells.selectAll('text').data(pairs.filter(d => cs > 24)).join('text').attr('x', d => ox + d[3] * cs + cs / 2).attr('y', d => oy + d[2] * cs + cs / 2 + 4).attr('text-anchor', 'middle').attr('fill', d => Math.abs(d[4]) > 0.55 ? '#fff' : '#041226').style('font', `600 ${cs > 36 ? 10 : 8.5}px ${MONO}`).style('pointer-events', 'none').text(d => d[2] === d[3] ? '' : nf(d[4], 1));
  svg.append('text').attr('x', ox).attr('y', 12).attr('fill', MUTE).style('font', `500 9.5px ${MONO}`).text(o.partial !== false ? 'r parcial (nível removido) · z por prova · estimativas do modelo' : 'Pearson r · z por prova · estimativas do modelo');
  drawScatter(); return api(svg);
}
export const CHARTS = { fita, breakouts, velocidade, srdps, bracadas, parciais, passagens };
