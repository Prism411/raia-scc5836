import * as d3 from '../vendor/d3.esm.js';
import { fmtTime, YOU } from './core.js';
import { showTip, hideTip, styleAxis, GRID, INK, AX, MONO, SANS, esc } from './ui.js';

export function drawRace(elMarey, elHeat, data, { onSeek } = {}) {
  if (!data) return { setTime() { } };
  const st = { t: 0 };
  const sw = [...data.swimmers].sort((a, b) => a.lane - b.lane);
  const L = data.poolLen, D = data.dist, Tm = data.Tmax;
  const m = { l: 44, r: 96, t: 12, b: 34 };
  const W = Math.max(320, elMarey.clientWidth), H = Math.max(220, elMarey.clientHeight || 260);
  d3.select(elMarey).selectAll('*').remove();
  const svg = d3.select(elMarey).append('svg').attr('width', W).attr('height', H).style('display', 'block');
  const x = d3.scaleLinear([0, Tm * 1.01], [m.l, W - m.r]);
  const y = d3.scaleLinear([0, L], [H - m.b, m.t]);
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8).tickFormat(d => d + 's')).call(styleAxis);
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickFormat(d => d + 'm')).call(styleAxis);
  svg.append('g').selectAll('line').data(y.ticks(5)).join('line').attr('x1', m.l).attr('x2', W - m.r).attr('y1', d => y(d)).attr('y2', d => y(d)).attr('stroke', GRID);
  svg.append('text').attr('x', m.l).attr('y', m.t + 2).attr('fill', AX).style('font', `500 10px ${MONO}`).attr('dy', '0.7em').attr('dx', 6).text('posição na piscina (m)');
  const N = 160;
  const paths = sw.map(s => ({ s, pts: d3.range(N + 1).map(i => { const t = s.T * i / N; const d = s.traj.dAt(t); return [t, s.traj.pos(Math.min(d, D - 1e-3)).x]; }) }));
  const line = d3.line().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveMonotoneX);
  const gl = svg.append('g');
  const lines = gl.selectAll('path').data(paths).join('path').attr('d', p => line(p.pts)).attr('fill', 'none')
    .attr('stroke', p => p.s.isYou ? YOU : p.s.color).attr('stroke-width', p => p.s.isYou ? 3 : 1.6).attr('opacity', p => p.s.isYou ? 1 : 0.85);
  const ends = svg.append('g').selectAll('text').data([...sw].sort((a, b) => a.place - b.place)).join('text')
    .attr('x', W - m.r + 6).attr('y', (s, i) => m.t + 6 + i * Math.min(16, (H - m.t - m.b) / sw.length)).attr('fill', s => s.isYou ? YOU : INK)
    .style('font', `600 10.5px ${SANS}`).text(s => `${s.place}º ${String(s.name || '').split(' ')[0]} ${fmtTime(s.T)}`);
  const ph = svg.append('line').attr('y1', m.t).attr('y2', H - m.b).attr('stroke', '#2FE0F0').attr('stroke-width', 1.5);
  const dots = svg.append('g').selectAll('circle').data(sw).join('circle').attr('r', s => s.isYou ? 5 : 3.5).attr('fill', s => s.isYou ? YOU : s.color).attr('stroke', '#041226').attr('stroke-width', 1.5);
  const hit = svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent').style('cursor', 'crosshair');
  hit.on('pointermove', ev => {
    const [px, py] = d3.pointer(ev); const t = x.invert(px);
    let best = null, bd = 1e9; for (const p of paths) { const tt = Math.min(t, p.s.T); const d = p.s.traj.dAt(tt); const yy = y(p.s.traj.pos(Math.min(d, D - 1e-3)).x); const dd = Math.abs(yy - py); if (dd < bd) { bd = dd; best = { p, d, tt }; } }
    lines.attr('opacity', q => !best || q === best.p ? 1 : 0.25);
    if (best) showTip(`<b style="color:${best.p.s.isYou ? YOU : best.p.s.color}">${esc(best.p.s.name)}</b><br>t = ${best.tt.toFixed(2)} s · ${best.d.toFixed(1)} m percorridos<br>velocidade ≈ ${best.p.s.traj.speedAt(best.d).toFixed(2)} m/s`, ev);
  }).on('pointerleave', () => { lines.attr('opacity', p => p.s.isYou ? 1 : 0.85); hideTip(); })
    .on('click', ev => { const [px] = d3.pointer(ev); onSeek && onSeek(Math.max(0, x.invert(px))); });
  const mh = { l: 92, r: 16, t: 10, b: 30 };
  const W2 = Math.max(320, elHeat.clientWidth), H2 = Math.max(200, elHeat.clientHeight || 240);
  d3.select(elHeat).selectAll('*').remove();
  const svg2 = d3.select(elHeat).append('svg').attr('width', W2).attr('height', H2).style('display', 'block');
  const step = D <= 50 ? 2.5 : D <= 100 ? 5 : D <= 200 ? 10 : 20;
  const cols = d3.range(step, D + 0.01, step);
  const tAtD = sw.map(s => cols.map(d => s.traj.tAt(d)));
  const lead = cols.map((_, j) => d3.min(tAtD, row => row[j]));
  const cells = []; sw.forEach((s, i) => cols.forEach((d, j) => cells.push({ s, i, j, d, gap: tAtD[i][j] - lead[j] })));
  const gmax = Math.max(0.5, d3.quantile(cells.map(c => c.gap).sort(d3.ascending), 0.95));
  const color = d3.scaleSequential(v => d3.interpolateCividis(1 - Math.min(1, v / gmax)));
  const xb = d3.scaleBand(cols, [mh.l, W2 - mh.r]).paddingInner(0.06);
  const yb = d3.scaleBand(sw.map(s => s.lane), [mh.t, H2 - mh.b]).paddingInner(0.1);
  svg2.append('g').selectAll('rect').data(cells).join('rect').attr('x', c => xb(c.d)).attr('y', c => yb(c.s.lane)).attr('width', xb.bandwidth()).attr('height', yb.bandwidth())
    .attr('fill', c => color(c.gap)).attr('stroke', c => c.s.isYou ? YOU : 'none').attr('stroke-width', c => c.s.isYou ? 1 : 0)
    .on('pointermove', (ev, c) => showTip(`<b>${esc(c.s.name)}</b> · raia ${c.s.lane}<br>aos ${c.d} m: ${c.gap < 0.005 ? '<b style="color:#FFD23F">liderando</b>' : '+' + c.gap.toFixed(2) + ' s do líder'}<br>passagem: ${fmtTime(tAtD[c.i][c.j])}`, ev))
    .on('pointerleave', hideTip).on('click', (ev, c) => onSeek && onSeek(lead[c.j]));
  svg2.append('g').selectAll('circle').data(cells.filter(c => c.gap < 0.005)).join('circle').attr('cx', c => xb(c.d) + xb.bandwidth() / 2).attr('cy', c => yb(c.s.lane) + yb.bandwidth() / 2).attr('r', Math.min(3, yb.bandwidth() / 4)).attr('fill', '#041226');
  svg2.append('g').selectAll('text').data(sw).join('text').attr('x', mh.l - 6).attr('y', s => yb(s.lane) + yb.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end')
    .attr('fill', s => s.isYou ? YOU : INK).style('font', `600 10.5px ${SANS}`).text(s => `${s.lane} · ${String(s.name || '').split(' ')[0].slice(0, 11)}`);
  const tickEvery = Math.ceil(cols.length / 10);
  svg2.append('g').attr('transform', `translate(0,${H2 - mh.b})`).call(d3.axisBottom(xb).tickValues(cols.filter((_, i) => (i + 1) % tickEvery === 0)).tickFormat(d => d + 'm')).call(styleAxis);
  for (let k = 1; k < Math.round(D / L); k++) { const xx = xb(k * L) + xb.bandwidth() + 1; svg2.append('line').attr('x1', xx).attr('x2', xx).attr('y1', mh.t).attr('y2', H2 - mh.b).attr('stroke', '#FF5468').attr('stroke-dasharray', '3 3'); }
  const ph2 = svg2.append('line').attr('y1', mh.t).attr('y2', H2 - mh.b).attr('stroke', '#2FE0F0').attr('stroke-width', 1.5);
  function setTime(t) {
    st.t = t; const tc = Math.max(0, Math.min(t, Tm));
    ph.attr('x1', x(tc)).attr('x2', x(tc));
    dots.attr('cx', s => x(Math.min(tc, s.T))).attr('cy', s => { const d = s.traj.dAt(Math.min(tc, s.T)); return y(s.traj.pos(Math.min(d, D - 1e-3)).x); });
    const ld = d3.max(sw, s => s.traj.dAt(Math.min(tc, s.T))) || 0; const xx = mh.l + (W2 - mh.r - mh.l) * (ld / D);
    ph2.attr('x1', xx).attr('x2', xx);
  }
  setTime(0);
  return { setTime, gmax };
}
