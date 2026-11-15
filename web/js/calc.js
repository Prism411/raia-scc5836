import * as d3 from '../vendor/d3.esm.js';
import { fmtTime, YOU, teamColor } from './core.js';
import { showTip, hideTip, styleAxis, GRID, INK, AX, MONO, SANS, esc } from './ui.js';

const C1 = '#E8B931', C3 = '#2FE0F0', CS = '#B9A6F5';
const pc = v => (v * 100).toFixed(v < 0.1 && v > 0 ? 1 : 0).replace('.', ',') + '%';

export function drawCalc(els, model, opts) {
  if (!model) { for (const k in els) if (els[k]) d3.select(els[k]).selectAll('*').remove(); return; }
  curve(els.curve, model, opts); positions(els.pos, model, opts); fields(els.fields, model, opts);
}

function curve(el, M, o) {
  const which = o.mode === 'todos' ? 'pool' : 'avg';
   const W = Math.max(320, el.clientWidth), H = Math.max(240, el.clientHeight || 300);
  const m = { l: 44, r: 18, t: 16, b: 34 };
  d3.select(el).selectAll('*').remove();
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('display', 'block').style('touch-action', 'none');
  const x = d3.scaleLinear([M.lo, M.hi], [m.l, W - m.r]); const y = d3.scaleLinear([0, 1], [H - m.b, m.t]);
  svg.append('g').selectAll('line').data([0.25, 0.5, 0.75, 1]).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', GRID);
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(7).tickFormat(d => fmtTime(d, 1))).call(styleAxis);
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d => d * 100 + '%')).call(styleAxis);
  const ln = key => d3.line().x(d => x(d.t)).y(d => y(d[which][key])).curve(d3.curveMonotoneX);
  if (which === 'avg' && M.fields.length > 1) {
    M.fields.forEach((f, i) => {
       const l = d3.line().x(d => x(d.t)).y(d => y(d.years[i].p1)).curve(d3.curveMonotoneX);
      svg.append('path').attr('d', l(M.curve)).attr('fill', 'none').attr('stroke', C1).attr('stroke-width', 1).attr('opacity', 0.28);
    });
  }
  const series = [['pS', CS, '2 3', 2, 'pontuar'], ['p3', C3, '7 4', 2.2, 'pódio'], ['p1', C1, null, 3, 'ouro']];
  for (const [k, c, dash, w, lab] of series) {
    svg.append('path').attr('d', ln(k)(M.curve)).attr('fill', 'none').attr('stroke', c).attr('stroke-width', w).attr('stroke-dasharray', dash);
    const last = M.curve.find(d => d[which][k] < 0.85) || M.curve[0];
    svg.append('text').attr('x', x(last.t) + 6).attr('y', y(last[which][k]) - 6).attr('fill', c).style('font', `700 11px ${SANS}`).text(lab);
  }
  const tg = M.targets(which);
  if (tg.g50) { svg.append('line').attr('x1', x(tg.g50)).attr('x2', x(tg.g50)).attr('y1', y(0.5)).attr('y2', H - m.b).attr('stroke', C1).attr('stroke-dasharray', '2 3'); svg.append('circle').attr('cx', x(tg.g50)).attr('cy', y(0.5)).attr('r', 3.5).attr('fill', C1); }
  const g = svg.append('g').style('cursor', 'ew-resize');
  const vl = g.append('line').attr('y1', m.t - 4).attr('y2', H - m.b).attr('stroke', YOU).attr('stroke-width', 2);
  const knob = g.append('rect').attr('y', m.t - 12).attr('width', 64).attr('height', 18).attr('rx', 2).attr('fill', YOU);
  const kt = g.append('text').attr('y', m.t + 1).attr('fill', '#041226').style('font', `700 11px ${MONO}`).attr('text-anchor', 'middle');
  const dots = series.map(([k, c]) => g.append('circle').attr('r', 4.5).attr('fill', c).attr('stroke', '#041226').attr('stroke-width', 1.5));
  const interp = (t, k) => { const C = M.curve; if (t <= C[0].t) return C[0][which][k]; for (let i = 0; i < C.length - 1; i++) if (t <= C[i + 1].t) { const u = (t - C[i].t) / (C[i + 1].t - C[i].t); return C[i][which][k] + u * (C[i + 1][which][k] - C[i][which][k]); } return C[C.length - 1][which][k]; };
  const place = t => { const X = x(t); vl.attr('x1', X).attr('x2', X); knob.attr('x', X - 32); kt.attr('x', X).text(fmtTime(t)); series.forEach(([k], i) => dots[i].attr('cx', X).attr('cy', y(interp(t, k)))); };
  place(Math.max(M.lo, Math.min(M.hi, o.time)));
  const drag = d3.drag().on('drag', ev => { const t = Math.max(M.lo, Math.min(M.hi, x.invert(ev.x))); place(t); showTip(`<b>${fmtTime(t)}</b><br><span style="color:${C1}">ouro ${pc(interp(t, 'p1'))}</span> · <span style="color:${C3}">pódio ${pc(interp(t, 'p3'))}</span> · <span style="color:${CS}">pontuar ${pc(interp(t, 'pS'))}</span>`, ev.sourceEvent); })
    .on('end', ev => { hideTip(); const t = Math.max(M.lo, Math.min(M.hi, x.invert(ev.x))); o.onTime && o.onTime(Math.round(t * 100) / 100); });
  g.call(drag);
  const hit = svg.insert('rect', () => g.node()).attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent');
  hit.on('pointermove', ev => { const [px] = d3.pointer(ev); const t = x.invert(px); showTip(`<b>${fmtTime(t)}</b> — se você nadar este tempo:<br><span style="color:${C1}">ouro ${pc(interp(t, 'p1'))}</span> · <span style="color:${C3}">pódio ${pc(interp(t, 'p3'))}</span> · <span style="color:${CS}">pontuar ${pc(interp(t, 'pS'))}</span><br><span style="color:#8db3cf">clique para usar este tempo</span>`, ev); })
    .on('pointerleave', hideTip).on('click', ev => { const [px] = d3.pointer(ev); o.onTime && o.onTime(Math.round(x.invert(px) * 100) / 100); });
}

function positions(el, M, o) {
  const which = o.mode === 'todos' ? 'pool' : 'avg';
  const hist = (which === 'pool' ? M.main.pool.hist : M.main.avg.hist).slice(1);
  const nScore = M.fields[0].table.length;
  const W = Math.max(280, el.clientWidth), H = Math.max(180, el.clientHeight || 210);
  const m = { l: 34, r: 10, t: 18, b: 30 };
  d3.select(el).selectAll('*').remove();
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('display', 'block');
  const data = hist.map((p, i) => ({ k: i + 1, p })).filter((d, i, a) => i < Math.max(nScore + 2, a.findLastIndex(q => q.p > 0.004) + 1));
  const x = d3.scaleBand(data.map(d => d.k), [m.l, W - m.r]).padding(0.18);
  const y = d3.scaleLinear([0, Math.max(0.05, d3.max(data, d => d.p))], [H - m.b, m.t]);
  const col = k => k === 1 ? '#E8B931' : k === 2 ? '#C9D2DA' : k === 3 ? '#C07A43' : k <= nScore ? '#2FE0F0' : '#3a536b';
  svg.append('g').selectAll('rect').data(data).join('rect').attr('x', d => x(d.k)).attr('width', x.bandwidth()).attr('y', d => y(d.p)).attr('height', d => y(0) - y(d.p)).attr('fill', d => col(d.k)).attr('opacity', d => d.k <= 3 ? 1 : 0.75)
    .on('pointermove', (ev, d) => showTip(`<b>${d.k}º lugar oficial</b><br>probabilidade ${pc(d.p)}${d.k <= nScore ? `<br>pontua ${M.fields[0].table[d.k - 1]} pts` : '<br>fora da zona de pontos'}`, ev)).on('pointerleave', hideTip);
  svg.append('g').selectAll('text').data(data.filter(d => d.p >= 0.02)).join('text').attr('x', d => x(d.k) + x.bandwidth() / 2).attr('y', d => y(d.p) - 4).attr('text-anchor', 'middle').attr('fill', INK).style('font', `600 9.5px ${MONO}`).text(d => Math.round(d.p * 100) + '%');
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickFormat(d => d + 'º')).call(styleAxis);
  const xs = x(nScore) + x.bandwidth() + x.step() * x.paddingInner() / 2;
  if (isFinite(xs)) { const nearEdge = xs + 100 > W - m.r; svg.append('line').attr('x1', xs).attr('x2', xs).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', '#FF5468').attr('stroke-dasharray', '3 3'); svg.append('text').attr('x', nearEdge ? xs - 4 : xs + 4).attr('text-anchor', nearEdge ? 'end' : 'start').attr('y', m.t + 6).attr('fill', '#FF5468').style('font', `500 9.5px ${MONO}`).text('limite de pontos'); }
}

function fields(el, M, o) {
  const rows = M.fields; const all = rows.flatMap(f => f.ev.ok.map(r => r.time)).concat([o.time]).sort(d3.ascending);
  const W = Math.max(300, el.clientWidth); const H0 = el.clientHeight || (rows.length * 34 + 44); const rh = Math.max(16, Math.min(34, (H0 - 40) / rows.length)); const H = Math.max(90, rows.length * rh + 40);
  const m = { l: 52, r: 82, t: 12, b: 28 };
  d3.select(el).selectAll('*').remove();
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('display', 'block');
  const hi = Math.max(o.time * 1.03, d3.quantile(all, 0.92));
  const x = d3.scaleLinear([all[0] * 0.985, hi], [m.l, W - m.r]).clamp(true);
  const y = d3.scaleBand(rows.map(f => f.year), [m.t, H - m.b]).padding(0.25);
 svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(7).tickFormat(d => fmtTime(d, 1))).call(styleAxis);
  rows.forEach((f, i) => {
    const py = M.perYear[i]; const yy = y(f.year) + y.bandwidth() / 2;
    svg.append('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', yy).attr('y2', yy).attr('stroke', GRID);
    svg.append('text').attr('x', m.l - 8).attr('y', yy).attr('dy', '0.35em').attr('text-anchor', 'end').attr('fill', INK).style('font', `600 11px ${MONO}`).text(f.year);
    svg.append('g').selectAll('circle').data(f.ev.ok).join('circle').attr('cx', r => x(r.time)).attr('cy', (r, k) => yy + ((k % 3) - 1) * 4).attr('r', r => r.orank && r.orank <= 3 ? 5 : 3.6)
      .attr('fill', r => r.cat === 'E' ? 'none' : teamColor(r.team, r.comp)).attr('stroke', r => r.cat === 'E' ? teamColor(r.team, r.comp) : (r.orank && r.orank <= 3 ? '#fff' : '#041226')).attr('stroke-width', r => r.orank && r.orank <= 3 ? 1.4 : 1)
      .on('pointermove', (ev, r) => showTip(`<b>${esc(r.name)}</b> · ${esc(r.team)}<br>${fmtTime(r.time)} · ${r.prank}º geral${r.orank ? ` · ${r.orank}º oficial` : ' · extra'}${r.pts ? ` · ${r.pts} pts` : ''}`, ev)).on('pointerleave', hideTip);
    svg.append('text').attr('x', W - m.r + 8).attr('y', yy).attr('dy', '0.35em').attr('fill', py.posOff <= 3 ? YOU : INK).style('font', `700 11px ${SANS}`).text(`${py.posOff}º de ${py.nOff}`);
  });
  const X = x(o.time);
  svg.append('line').attr('x1', X).attr('x2', X).attr('y1', m.t - 4).attr('y2', H - m.b).attr('stroke', YOU).attr('stroke-width', 2);
  svg.append('text').attr('x', X).attr('y', m.t - 2).attr('text-anchor', 'middle').attr('fill', YOU).style('font', `700 10px ${MONO}`).attr('dy', '0.6em').text('VOCÊ');
}
