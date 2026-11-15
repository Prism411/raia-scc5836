import * as d3 from '../vendor/d3.esm.js';
import { EVENTS, EVENT_ORDER, IND_EVENTS, STROKES, STROKE_COLORS, COMP_COLORS, YOU, teamColor, fmtTime, kde, pca, kmeans, athleteFeatures, FEATURE_NAMES, gini, lorenz, mean, median } from './core.js';
import { showTip, hideTip, styleAxis, GRID, INK, AX, MUTE, MONO, SANS, DISPLAY, esc } from './ui.js';

const evColor = code => { const e = EVENTS[code]; const base = d3.color(STROKE_COLORS[e.stroke]); if (e.relay) return base.darker(0.7).formatHex(); return e.dist >= 200 ? base.brighter(0.6).formatHex() : e.dist === 100 ? base.brighter(0.25).formatHex() : base.formatHex(); };

export function createObservatory(els, db, hooks = {}) {
  const S = {
    F: { comps: ['InterUSP', 'TUSCA'], years: [2023, 2024, 2025, 2026], sex: 'M', events: [...IND_EVENTS], teams: [], demo: false },
    sel: null, selSrc: null, hover: null, colorBy: 'auto', k: 4, pcaMode: 'zoom', order: 'total', pcBrush: {}, zoomK: 1
  };
  let R = [], RI = [], athIds = new Set(), byAth = new Map();
  const views = {};
    const colorOf = r => {
    const mode = S.colorBy === 'auto' ? (S.F.comps.length === 1 ? 'team' : 'comp') : S.colorBy;
    if (mode === 'team') return teamColor(r.team, r.comp);
    if (mode === 'stroke') return evColor(r.code);
    return COMP_COLORS[r.comp];
  };
  const athColor = a => { const rs = byAth.get(a.id) || a.ind; const r = rs[0]; return r ? colorOf(r) : '#8db3cf'; };
  function compute() {
    const F = S.F;
    R = db.results.filter(r => r.status === 'OK' && F.comps.includes(r.comp) && F.years.includes(r.year) && (F.sex === 'A' || r.sex === F.sex) && F.events.includes(r.code) && (!F.teams.length || F.teams.includes(r.team)) && (F.demo || !r.demo));
    RI = R.filter(r => !r.relay);
    byAth = d3.group(RI, r => r.ath); athIds = new Set(byAth.keys());
  }
  const selAth = () => S.sel ? new Set([...S.sel].map(id => db.results[id].ath).filter(a => a >= 0)) : null;
  function setSel(ids, src) {
    S.sel = ids && ids.size ? ids : null; S.selSrc = S.sel ? src : null;
    restyle(); hooks.onSelection && hooks.onSelection(S.sel ? summarize(S.sel) : null);
  }
  function summarize(sel) {
    const rs = [...sel].map(i => db.results[i]); const ath = new Set(rs.map(r => r.ath).filter(a => a >= 0));
     return { n: rs.length, athletes: ath.size, teams: new Set(rs.map(r => r.team)).size, itMed: median(rs.map(r => r.it)), src: S.selSrc };
  }
  const hoverMatch = r => { const h = S.hover; if (!h) return null; if (h.type === 'team') return r.team === h.team; if (h.type === 'athlete') return r.ath === h.id; if (h.type === 'event') return r.code === h.code; return null; };
  function setHover(h) { S.hover = h; restyle(); }
  function restyle() { for (const v of Object.values(views)) v.restyle && v.restyle(); }
  const tipR = r => `<b>${esc(r.name)}</b> <span style="color:${colorOf(r)}">●</span> ${esc(r.team)}<br>${EVENTS[r.code].label} · ${r.comp} ${r.year}<br>${fmtTime(r.time)} · IT ${Math.round(r.it)} · ${r.prank}º${r.orank ? ` (${r.orank}º oficial)` : ' (extra)'}${r.pts ? ` · ${r.pts} pts` : ''}`;
  const mkSvg = (el, minH) => { d3.select(el).selectAll('*').remove(); const W = Math.max(260, el.clientWidth), H = Math.max(minH, el.clientHeight || minH); const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('display', 'block'); return { svg, W, H }; };
  const empty = (svg, W, H, msg = 'Sem dados para os filtros atuais') => svg.append('text').attr('x', W / 2).attr('y', H / 2).attr('text-anchor', 'middle').attr('fill', MUTE).style('font', `500 12px ${SANS}`).text(msg);

  views.swarm = {
    draw() {
      const el = els.swarm; if (!el || !el.clientWidth) return;
      const { svg, W, H } = mkSvg(el, 180); this.svg = svg;
      const codes = EVENT_ORDER.filter(c => S.F.events.includes(c) && R.some(r => r.code === c));
      if (!codes.length) return empty(svg, W, H);
      const m = { l: 78, r: 14, t: 8, b: 28 };
      const minIT = d3.min(R, r => r.it); const x = d3.scaleLinear([Math.max(0, Math.floor(minIT / 50) * 50), 1000], [m.l, W - m.r]);
      const y = d3.scaleBand(codes, [m.t, H - m.b]).padding(0.08); const rowH = y.bandwidth();
      svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8)).call(styleAxis);
      svg.append('text').attr('x', W - m.r).attr('y', H - m.b - 6).attr('text-anchor', 'end').attr('fill', MUTE).style('font', `500 10px ${MONO}`).text('índice técnico (IT) →  1000 = melhor marca do banco');
      svg.append('g').selectAll('line').data(x.ticks(8)).join('line').attr('x1', d => x(d)).attr('x2', d => x(d)).attr('y1', m.t).attr('y2', H - m.b).attr('stroke', GRID);
      svg.append('g').selectAll('text').data(codes).join('text').attr('x', m.l - 10).attr('y', c => y(c) + rowH / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('fill', c => evColor(c)).style('font', `700 11px ${SANS}`).text(c => EVENTS[c].short);
      const nodes = [];
      for (const c of codes) {
        const items = R.filter(r => r.code === c).map(r => ({ r, x: x(r.it), row: c })).sort((a, b) => a.x - b.x);
        let rad = Math.min(4, Math.max(1.6, rowH / 9)); let tries = 0;
        do { dodge(items, rad); tries++; const mx = d3.max(items, d => Math.abs(d.dy)) || 0; if (mx + rad <= rowH / 2 || tries > 4) break; rad *= 0.78; } while (true);
        items.forEach(d => { d.y = y(c) + rowH / 2 + Math.max(-rowH / 2 + rad, Math.min(rowH / 2 - rad, d.dy)); d.rad = rad; nodes.push(d); });
      }
      this.nodes = nodes;
      this.dots = svg.append('g').selectAll('circle').data(nodes).join('circle').attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.rad)
        .attr('fill', d => colorOf(d.r)).attr('stroke', d => d.r.orank && d.r.orank <= 3 && !d.r.demo ? '#ffffff' : 'none').attr('stroke-width', 1)
        .on('pointerenter', (ev, d) => { setHover({ type: 'athlete', id: d.r.ath }); showTip(tipR(d.r), ev); })
        .on('pointermove', (ev, d) => showTip(tipR(d.r), ev))
        .on('pointerleave', () => { hideTip(); setHover(null); })
        .on('click', (ev, d) => { if (d.r.ath >= 0) hooks.onAthlete && hooks.onAthlete(d.r.ath); });
      const brush = d3.brush().extent([[m.l, m.t], [W - m.r, H - m.b]])
        .filter(ev => !ev.button && (ev.target.tagName !== 'circle' || ev.shiftKey || ev.altKey))
        .on('brush end', ev => {
          if (!ev.selection) { if (ev.type === 'end' && S.selSrc === 'swarm') setSel(null); return; }
          const [[x0, y0], [x1, y1]] = ev.selection; const ids = new Set(nodes.filter(d => d.x >= x0 && d.x <= x1 && d.y >= y0 && d.y <= y1).map(d => d.r.id));
          if (ev.type === 'brush') { S.sel = ids.size ? ids : null; S.selSrc = 'swarm'; cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(restyle); } else setSel(ids, 'swarm');
        });
      const R2 = Number(window.RAIA_RELEASE || 1) >= 2;
      const bg = svg.insert('g', ':first-child').attr('class', 'brush'); if (R2) bg.call(brush);
      bg.selectAll('.selection').attr('fill', 'rgba(47,224,240,.12)').attr('stroke', '#2FE0F0');
      this.brushG = R2 ? bg : null; this.brush = brush;
      this.restyle();
    },
    clearBrush() { if (this.brushG) this.brushG.call(this.brush.move, null); },
    restyle() {
      if (!this.dots) return; const sel = S.sel, h = S.hover;
      this.dots.attr('opacity', d => { const hm = hoverMatch(d.r); if (h && hm === false) return sel && !sel.has(d.r.id) ? 0.05 : 0.18; if (sel) return sel.has(d.r.id) ? 1 : 0.1; return 0.88; })
        .attr('r', d => (h && hoverMatch(d.r)) ? d.rad * 1.6 : d.rad);
      if (h && h.type === 'athlete') this.dots.filter(d => d.r.ath === h.id).raise();
    }
  };
  function dodge(items, r) {
    const placed = []; const r2 = 4 * r * r; let start = 0;
    for (const it of items) {
      while (start < placed.length && placed[start].x < it.x - 2 * r) start++;
      const near = placed.slice(start);
      let yy = 0;
      if (near.length) {
        const cands = [0]; for (const p of near) { const dx = p.x - it.x; const dy = Math.sqrt(Math.max(0, r2 - dx * dx)); cands.push(p.y + dy + 0.01, p.y - dy - 0.01); }
        cands.sort((a, b) => Math.abs(a) - Math.abs(b));
        for (const c of cands) { if (near.every(p => (p.x - it.x) ** 2 + (p.y - c) ** 2 >= r2 - 0.02)) { yy = c; break; } }
      }
      it.dy = yy; placed.push({ x: it.x, y: yy }); placed.sort((a, b) => a.x - b.x);
    }
  }

  views.ridge = {
    draw() {
      const el = els.ridge; if (!el || !el.clientWidth) return;
      const { svg, W, H } = mkSvg(el, 180); this.svg = svg;
      const rows = []; for (const c of ['InterUSP', 'TUSCA']) if (S.F.comps.includes(c)) for (const y of [2023, 2024, 2025, 2026]) if (S.F.years.includes(y)) { const rs = RI.filter(r => r.comp === c && r.year === y); if (rs.length > 2) rows.push({ c, y, rs, key: c + ' ' + y }); }
      if (!rows.length) return empty(svg, W, H);
      const m = { l: 92, r: 14, t: 24, b: 26 };
      const x = d3.scaleLinear([Math.max(0, Math.floor(d3.min(RI, r => r.it) / 50) * 50), 1000], [m.l, W - m.r]);
      const yb = d3.scaleBand(rows.map(r => r.key), [m.t, H - m.b]).paddingInner(0);
      const xs = d3.range(x.domain()[0], 1001, 8);
       rows.forEach(r => { r.dens = kde(r.rs.map(q => q.it), xs, 40); r.med = median(r.rs.map(q => q.it)); });
      const ymax = d3.max(rows, r => d3.max(r.dens, d => d[1]));
      const hh = Math.min(70, yb.bandwidth() * 2.1);
      const yy = d3.scaleLinear([0, ymax], [0, hh]);
      svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).ticks(8)).call(styleAxis);
      const area = d3.area().x(d => x(d[0])).y0(0).y1(d => -yy(d[1])).curve(d3.curveBasis);
      const g = svg.append('g');
      const rowG = g.selectAll('g').data(rows).join('g').attr('transform', r => `translate(0,${yb(r.key) + yb.bandwidth()})`).style('cursor', 'pointer')
        .on('click', (ev, r) => setSel(new Set(r.rs.map(q => q.id)), 'ridge'))
        .on('pointermove', (ev, r) => showTip(`<b>${r.key}</b><br>${r.rs.length} resultados individuais<br>IT mediano ${Math.round(r.med)} · clique para selecionar`, ev)).on('pointerleave', hideTip);
      rowG.append('path').attr('d', r => area(r.dens)).attr('fill', r => COMP_COLORS[r.c]).attr('fill-opacity', 0.28).attr('stroke', r => COMP_COLORS[r.c]).attr('stroke-width', 1.4);
      rowG.append('line').attr('x1', r => x(r.med)).attr('x2', r => x(r.med)).attr('y1', 0).attr('y2', r => -yy(d3.max(r.dens, d => d[1])) * 0.9).attr('stroke', INK).attr('stroke-width', 1.2).attr('stroke-dasharray', '2 2');
      rowG.append('text').attr('x', m.l - 8).attr('y', -4).attr('text-anchor', 'end').attr('fill', r => COMP_COLORS[r.c]).style('font', `700 11px ${SANS}`).text(r => r.key);
      this.selPaths = rowG.append('path').attr('fill', 'none').attr('stroke', '#ffffff').attr('stroke-width', 2);
      this.rugs = rowG.append('g');
      this.rows = rows; this.x = x; this.yy = yy; this.xs = xs; this.area = area;
      const meds = rows.map(r => [x(r.med), yb(r.key) + yb.bandwidth()]);
     svg.append('path').attr('d', d3.line().curve(d3.curveMonotoneY)(meds)).attr('fill', 'none').attr('stroke', 'rgba(234,246,255,.35)').attr('stroke-width', 1);
      svg.append('text').attr('x', m.l).attr('y', 12).attr('fill', MUTE).style('font', `500 10px ${MONO}`).text('densidade do IT por edição · tracejado = mediana');
      this.restyle();
    },
    restyle() {
     if (!this.rows) return; const sel = S.sel; const h = S.hover;
      const line = d3.line().x(d => this.x(d[0])).y(d => -this.yy(d[1])).curve(d3.curveBasis);
      this.selPaths.attr('d', r => { const rs = sel ? r.rs.filter(q => sel.has(q.id)) : (h ? r.rs.filter(q => hoverMatch(q)) : []); if (rs.length < 2) return null; const dens = kde(rs.map(q => q.it), this.xs, 40).map(d => [d[0], d[1] * rs.length / r.rs.length]); return line(dens); });
      this.rugs.each((r, i, nodes) => { const rs = sel ? r.rs.filter(q => sel.has(q.id)) : (h ? r.rs.filter(q => hoverMatch(q)) : []); d3.select(nodes[i]).selectAll('line').data(rs.slice(0, 400)).join('line').attr('x1', q => this.x(q.it)).attr('x2', q => this.x(q.it)).attr('y1', 0).attr('y2', 5).attr('stroke', h && h.type === 'athlete' ? YOU : '#ffffff').attr('stroke-width', 1); });
    }
  };

  views.bump = {
    draw() {
      const el = els.bump; if (!el || !el.clientWidth) return;
      const { svg, W, H } = mkSvg(el, 180); this.svg = svg;
      const comps = ['InterUSP', 'TUSCA'].filter(c => S.F.comps.includes(c));
      const panels = comps.map(c => {
        const years = [2023, 2024, 2025, 2026].filter(y => S.F.years.includes(y));
        const pts = d3.rollup(R.filter(r => r.comp === c && !r.demo), v => d3.sum(v, r => r.pts), r => r.year, r => r.team);
        const teams = new Set(); const ranks = [];
        for (const y of years) { const m = pts.get(y); if (!m) continue; const arr = [...m].filter(([, p]) => p > 0).sort((a, b) => b[1] - a[1]); arr.forEach(([t, p], i) => { teams.add(t); ranks.push({ c, y, team: t, rank: i + 1, pts: p }); }); }
        return { c, years: years.filter(y => pts.get(y)), teams: [...teams], ranks };
      }).filter(p => p.ranks.length);
      if (!panels.length) return empty(svg, W, H);
      const ph = (H - 10) / panels.length; this.items = [];
      panels.forEach((P, pi) => {
        const m = { l: 40, r: 110, t: 22 + pi * ph, b: H - (pi + 1) * ph + 18 };
        const maxR = d3.max(P.ranks, d => d.rank);
        const x = d3.scalePoint(P.years, [m.l, W - m.r]).padding(0.2); const y = d3.scaleLinear([1, Math.max(2, maxR)], [m.t + 6, (pi + 1) * ph - 22]);
        svg.append('text').attr('x', 6).attr('y', m.t - 8).attr('fill', COMP_COLORS[P.c]).style('font', `800 13px ${DISPLAY}`).style('letter-spacing', '.08em').text(P.c.toUpperCase());
        svg.append('g').selectAll('text').data(P.years).join('text').attr('x', d => x(d)).attr('y', m.t - 8).attr('text-anchor', 'middle').attr('fill', AX).style('font', `500 10px ${MONO}`).text(d => d);
        const byTeam = d3.group(P.ranks, d => d.team);
        const g = svg.append('g');
        for (const [team, arr] of byTeam) {
          arr.sort((a, b) => a.y - b.y); const col = teamColor(team, P.c);
          const grp = g.append('g').style('cursor', 'pointer').on('pointerenter', () => setHover({ type: 'team', team })).on('pointerleave', () => { setHover(null); hideTip(); })
            .on('click', () => hooks.onToggleTeam && hooks.onToggleTeam(team));
          grp.append('path').attr('d', d3.line().x(d => x(d.y)).y(d => y(d.rank)).curve(d3.curveMonotoneX)(arr)).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 3).attr('stroke-linecap', 'round');
          grp.selectAll('circle').data(arr).join('circle').attr('cx', d => x(d.y)).attr('cy', d => y(d.rank)).attr('r', 9).attr('fill', '#071a2e').attr('stroke', col).attr('stroke-width', 2.5)
            .on('pointermove', (ev, d) => showTip(`<b>${esc(team)}</b> · ${P.c} ${d.y}<br>${d.rank}º lugar · ${d.pts} pts<br><span style="color:#8db3cf">pontos das provas filtradas</span>`, ev));
          grp.selectAll('text.n').data(arr).join('text').attr('class', 'n').attr('x', d => x(d.y)).attr('y', d => y(d.rank)).attr('dy', '0.35em').attr('text-anchor', 'middle').attr('fill', INK).style('font', `700 9px ${MONO}`).style('pointer-events', 'none').text(d => d.rank);
          const last = arr[arr.length - 1];
          grp.append('text').attr('x', x(last.y) + 14).attr('y', y(last.rank)).attr('dy', '0.35em').attr('fill', col).style('font', `700 11px ${SANS}`).text(team);
          this.items.push({ team, grp });
        }
      });
      this.restyle();
    },
    restyle() { if (!this.items) return; const h = S.hover; const selTeams = S.sel ? new Set([...S.sel].map(i => db.results[i].team)) : null; this.items.forEach(it => it.grp.attr('opacity', h && h.type === 'team' ? (h.team === it.team ? 1 : 0.15) : (selTeams ? (selTeams.has(it.team) ? 1 : 0.2) : 1))); }
  };

  views.matrix = {
    draw() {
      const el = els.matrix; if (!el || !el.clientWidth) return;
      const { svg, W, H } = mkSvg(el, 180); this.svg = svg;
      const RR = R.filter(r => !r.demo);
      const codes = EVENT_ORDER.filter(c => S.F.events.includes(c) && RR.some(r => r.code === c));
      const tot = d3.rollup(RR, v => d3.sum(v, r => r.pts), r => r.team, r => r.code);
      let teams = [...tot.keys()].filter(t => d3.sum([...tot.get(t).values()]) > 0);
      if (!teams.length || !codes.length) return empty(svg, W, H);
      const colTot = new Map(codes.map(c => [c, d3.sum(teams, t => tot.get(t)?.get(c) || 0) || 1]));
      const val = (t, c) => (tot.get(t)?.get(c) || 0);
      const share = (t, c) => val(t, c) / colTot.get(c);
      let cols = [...codes];
      if (S.order === 'total') teams.sort((a, b) => d3.sum(codes, c => val(b, c)) - d3.sum(codes, c => val(a, c)));
      else {
        const ordBy = (items, vec) => { if (items.length < 3) return items; const P = pca(items.map(vec), 2); const ang = P.coords.map(p => Math.atan2(p[1], p[0])); return items.map((it, i) => [it, ang[i]]).sort((a, b) => a[1] - b[1]).map(d => d[0]); };
        teams = ordBy(teams, t => codes.map(c => share(t, c) + 1e-6 * Math.random()));
        cols = ordBy(codes, c => teams.map(t => share(t, c) + 1e-6 * Math.random()));
      }
      const m = { l: 112, r: 12, t: 56, b: 10 };
      const x = d3.scaleBand(cols, [m.l, W - m.r]).padding(0.06); const y = d3.scaleBand(teams, [m.t, Math.min(H - m.b, m.t + teams.length * 30)]).padding(0.08);
      const color = d3.scaleSequential(d3.interpolateViridis).domain([0, d3.max(teams, t => d3.max(cols, c => share(t, c))) || 1]);
     const cells = teams.flatMap(t => cols.map(c => ({ t, c, v: val(t, c), s: share(t, c) })));
      this.cells = svg.append('g').selectAll('rect').data(cells).join('rect').attr('x', d => x(d.c)).attr('y', d => y(d.t)).attr('width', x.bandwidth()).attr('height', y.bandwidth())
       .attr('fill', d => d.v ? color(d.s) : 'rgba(141,179,207,.06)').style('cursor', 'pointer')
        .on('pointerenter', (ev, d) => setHover({ type: 'team', team: d.t })).on('pointerleave', () => { setHover(null); hideTip(); })
        .on('pointermove', (ev, d) => showTip(`<b>${esc(d.t)}</b> em ${EVENTS[d.c].label}<br>${d.v} pts · ${(d.s * 100).toFixed(0)}% dos pontos da prova<br><span style="color:#8db3cf">clique para selecionar esses resultados</span>`, ev))
        .on('click', (ev, d) => setSel(new Set(R.filter(r => r.team === d.t && r.code === d.c).map(r => r.id)), 'matrix'));
      svg.append('g').selectAll('text').data(cells.filter(d => d.v && x.bandwidth() > 24)).join('text').attr('x', d => x(d.c) + x.bandwidth() / 2).attr('y', d => y(d.t) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'middle')
        .attr('fill', d => d.s > color.domain()[1] * 0.6 ? '#041226' : INK).style('font', `600 9.5px ${MONO}`).style('pointer-events', 'none').text(d => d.v);
      svg.append('g').selectAll('text').data(teams).join('text').attr('x', m.l - 8).attr('y', t => y(t) + y.bandwidth() / 2).attr('dy', '0.35em').attr('text-anchor', 'end').attr('fill', t => teamColor(t, S.F.comps.length === 1 ? S.F.comps[0] : null)).style('font', `700 11px ${SANS}`).text(t => t);
      svg.append('g').selectAll('text').data(cols).join('text').attr('transform', c => `translate(${x(c) + x.bandwidth() / 2},${m.t - 8}) rotate(-40)`).attr('fill', c => evColor(c)).style('font', `700 10.5px ${SANS}`).text(c => EVENTS[c].short)
        .style('cursor', 'pointer').on('pointerenter', (ev, c) => setHover({ type: 'event', code: c })).on('pointerleave', () => setHover(null));
      this.teams = teams; this.restyle();
    },
    restyle() { if (!this.cells) return; const h = S.hover; const sel = S.sel; const selKeys = sel ? new Set([...sel].map(i => db.results[i].team + '|' + db.results[i].code)) : null;
      this.cells.attr('opacity', d => { if (h && h.type === 'team') return d.t === h.team ? 1 : 0.3; if (h && h.type === 'event') return d.c === h.code ? 1 : 0.3; if (selKeys) return selKeys.has(d.t + '|' + d.c) ? 1 : 0.25; return 1; })
        .attr('stroke', d => selKeys && selKeys.has(d.t + '|' + d.c) ? '#ffffff' : 'none').attr('stroke-width', 1.5); }
  };

  views.pc = {
    draw() {
      const el = els.pc; if (!el || !el.clientWidth) return;
      const { svg, W, H } = mkSvg(el, 180); this.svg = svg;
      const codes = IND_EVENTS.filter(c => S.F.events.includes(c) && RI.some(r => r.code === c));
      const ath = [...byAth].map(([id, rs]) => { const best = {}; for (const r of rs) if (!best[r.code] || r.it > best[r.code].it) best[r.code] = r; return { id, a: db.athletes[id], best, n: Object.keys(best).length, rs }; }).filter(d => d.n >= 2);
      if (codes.length < 2 || !ath.length) return empty(svg, W, H, 'Selecione 2+ provas individuais — atletas com 2+ provas aparecem aqui');
      const m = { l: 30, r: 30, t: 30, b: 28 };
      const x = d3.scalePoint(codes, [m.l, W - m.r]); const lo = Math.max(0, Math.floor(d3.min(RI, r => r.it) / 50) * 50);
      const naY = H - m.b; const y = d3.scaleLinear([lo, 1000], [naY - 26, m.t]);
      this.x = x; this.y = y; this.codes = codes; this.ath = ath;
      const pathOf = d => { let p = ''; let k = 0; codes.forEach(c => { const v = d.best[c]; if (!v) return; p += (k++ ? 'L' : 'M') + x(c).toFixed(1) + ',' + y(v.it).toFixed(1); }); return p; };
      svg.append('text').attr('x', m.l).attr('y', naY - 2).attr('fill', MUTE).style('font', `500 9.5px ${MONO}`).text('linhas ligam só as provas que o atleta nadou · arraste nos eixos para filtrar');
      this.lines = svg.append('g').selectAll('path').data(ath).join('path').attr('d', pathOf).attr('fill', 'none').attr('stroke', d => athColor(d.a)).attr('stroke-width', 1.3)
        .on('pointerenter', (ev, d) => { setHover({ type: 'athlete', id: d.id }); }).on('pointerleave', () => { setHover(null); hideTip(); })
        .on('pointermove', (ev, d) => showTip(`<b>${esc(d.a.name)}</b> · ${esc(d.a.team)}<br>${codes.filter(c => d.best[c]).map(c => `${EVENTS[c].short}: ${fmtTime(d.best[c].time)} (IT ${Math.round(d.best[c].it)})`).join('<br>')}`, ev))
        .on('click', (ev, d) => hooks.onAthlete && hooks.onAthlete(d.id));
      const axes = svg.append('g').selectAll('g').data(codes).join('g').attr('transform', c => `translate(${x(c)},0)`);
      axes.append('g').each(function () { d3.select(this).call(d3.axisLeft(y).ticks(5).tickSize(3)).call(styleAxis); });
      axes.append('text').attr('y', m.t - 12).attr('text-anchor', 'middle').attr('fill', c => evColor(c)).style('font', `700 11px ${SANS}`).text(c => EVENTS[c].short);
      const self = this;
      axes.each(function (c) {
        const b = d3.brushY().extent([[-12, m.t], [12, naY - 26]]).on('brush end', ev => {
          if (ev.selection) S.pcBrush[c] = ev.selection.map(y.invert).sort((a, b) => a - b); else delete S.pcBrush[c];
          const keys = Object.keys(S.pcBrush);
          if (!keys.length) { if (ev.type === 'end' && S.selSrc === 'pc') setSel(null); else if (ev.type === 'brush') { S.sel = null; restyle(); } return; }
          const ok = self.ath.filter(d => keys.every(k => d.best[k] && d.best[k].it >= S.pcBrush[k][0] && d.best[k].it <= S.pcBrush[k][1]));
          const ids = new Set(ok.flatMap(d => d.rs.map(r => r.id)));
          if (ev.type === 'brush') { S.sel = ids.size ? ids : new Set([-1]); S.selSrc = 'pc'; cancelAnimationFrame(self._raf); self._raf = requestAnimationFrame(restyle); } else setSel(ids.size ? ids : new Set([-1]), 'pc');
        });
        d3.select(this).append('g').call(b).selectAll('.selection').attr('fill', 'rgba(255,210,63,.18)').attr('stroke', YOU);
      });
      this.restyle();
     },
    restyle() {
      if (!this.lines) return; const h = S.hover; const sa = selAth();
      this.lines.attr('opacity', d => { if (h && h.type === 'athlete') return d.id === h.id ? 1 : 0.06; if (h && h.type === 'team') return d.a.team === h.team ? 0.9 : 0.06; if (h && h.type === 'event') return d.best[h.code] ? 0.8 : 0.06; if (sa) return sa.has(d.id) ? 0.95 : 0.05; return 0.32; })
        .attr('stroke-width', d => h && h.type === 'athlete' && d.id === h.id ? 3 : 1.3);
      if (h && h.type === 'athlete') this.lines.filter(d => d.id === h.id).raise();
    }
  };

  views.pca = {
    draw() {
      const el = els.pca; if (!el || !el.clientWidth) return;
      const { svg, W, H } = mkSvg(el, 180); this.svg = svg;
      const pts = [...byAth].map(([id, rs]) => ({ id, a: db.athletes[id], f: athleteFeatures(db.athletes[id], rs), rs })).filter(d => d.f);
      if (pts.length < 8) return empty(svg, W, H, 'Poucos atletas para projetar');
      const P = pca(pts.map(d => d.f), 2); pts.forEach((d, i) => { d.p = P.coords[i]; });
      const K = Math.min(S.k, Math.max(2, Math.floor(pts.length / 6)));
      const km = kmeans(pts.map(d => d.p), K, 5); pts.forEach((d, i) => { d.cl = km.labels[i]; });
      const Z = pts.map(d => d.f.map((v, j) => (v - P.mu[j]) / P.sd[j]));
      const names = d3.range(K).map(k => {
        const idx = pts.map((d, i) => d.cl === k ? i : -1).filter(i => i >= 0); const zc = FEATURE_NAMES.map((_, j) => mean(idx.map(i => Z[i][j])));
        const lvl = zc[0] > 0.55 ? 'Elite' : zc[0] < -0.45 ? 'Base' : 'Intermediário';
        const strokes = ['Livre', 'Costas', 'Peito', 'Borboleta', 'Medley']; let bj = 1; for (let j = 2; j <= 5; j++) if (zc[j] > zc[bj]) bj = j;
        const tag = zc[6] > 0.7 ? 'Fundo' : (zc[7] > 0.8 ? 'Versáteis' : strokes[bj - 1]);
        return `${lvl} · ${tag}`;
      });
      const clCol = d3.scaleOrdinal(d3.range(K), ['#56B4E9', '#E69F00', '#009E73', '#CC79A7', '#D55E00', '#B9A6F5', '#C29A4A']);
     const m = 22; const ex = d3.extent(pts, d => d.p[0]), ey = d3.extent(pts, d => d.p[1]);
      const x = d3.scaleLinear(ex, [m + 10, W - m]).nice(); const y = d3.scaleLinear(ey, [H - m - 16, m + 18]).nice();
      const root = svg.append('g'); const gz = root.append('g');
      const hullG = gz.append('g'), arrowG = gz.append('g'), dotG = gz.append('g'), glyphG = gz.append('g'); const labelG = svg.append('g').style('pointer-events', 'none');
      svg.append('text').attr('x', 10).attr('y', 14).attr('fill', MUTE).style('font', `500 10px ${MONO}`).text(`PC1 ${(P.explained[0] * 100).toFixed(0)}% · PC2 ${(P.explained[1] * 100).toFixed(0)}% da variância · k-means k=${K}`);
      this.pts = pts; this.clCol = clCol; this.names = names; this.x = x; this.y = y;
      const hulls = d3.range(K).map(k => { const ps = pts.filter(d => d.cl === k).map(d => [x(d.p[0]), y(d.p[1])]); return { k, hull: ps.length >= 3 ? d3.polygonHull(ps) : null, c: [d3.mean(ps, p => p[0]), d3.mean(ps, p => p[1])] }; }).filter(h => isFinite(h.c[0]));
       hullG.selectAll('path').data(hulls.filter(h => h.hull)).join('path').attr('d', h => 'M' + h.hull.join('L') + 'Z').attr('fill', h => clCol(h.k)).attr('fill-opacity', 0.07).attr('stroke', h => clCol(h.k)).attr('stroke-opacity', 0.5).attr('stroke-dasharray', '4 3');
      const sx = 0.42 * Math.min(W, H); const ox = x(0), oy = y(0);
      const arrows = FEATURE_NAMES.map((n, j) => ({ n, dx: P.vecs[0][j], dy: P.vecs[1][j] })).filter(a => Math.hypot(a.dx, a.dy) > 0.2);
      arrowG.selectAll('line').data(arrows).join('line').attr('x1', ox).attr('y1', oy).attr('x2', a => ox + a.dx * sx).attr('y2', a => oy - a.dy * sx).attr('stroke', 'rgba(234,246,255,.35)').attr('stroke-width', 1).attr('marker-end', 'url(#arrowhead)');
      arrowG.selectAll('text').data(arrows).join('text').attr('x', a => ox + a.dx * sx * 1.08).attr('y', a => oy - a.dy * sx * 1.08).attr('text-anchor', 'middle').attr('fill', 'rgba(234,246,255,.6)').style('font', `600 9.5px ${MONO}`).text(a => a.n);
      svg.append('defs').append('marker').attr('id', 'arrowhead').attr('viewBox', '0 0 10 10').attr('refX', 9).attr('refY', 5).attr('markerWidth', 6).attr('markerHeight', 6).attr('orient', 'auto').append('path').attr('d', 'M0,0L10,5L0,10z').attr('fill', 'rgba(234,246,255,.45)');
      this.dots = dotG.selectAll('circle').data(pts).join('circle').attr('cx', d => x(d.p[0])).attr('cy', d => y(d.p[1])).attr('r', d => 2.5 + Math.min(4, (d.a.medals.g || 0) * 0.8))
        .attr('fill', d => S.colorBy === 'cluster' ? clCol(d.cl) : athColor(d.a)).attr('stroke', '#041226').attr('stroke-width', 0.8)
        .on('pointerenter', (ev, d) => setHover({ type: 'athlete', id: d.id })).on('pointerleave', () => { setHover(null); hideTip(); })
        .on('pointermove', (ev, d) => showTip(`<b>${esc(d.a.name)}</b> · ${esc(d.a.team)}<br>grupo: <span style="color:${clCol(d.cl)}">${names[d.cl]}</span><br>${d.a.events.map(c => EVENTS[c].short).join(', ')} · ${d.a.medals.g} ouro(s)`, ev))
        .on('click', (ev, d) => hooks.onAthlete && hooks.onAthlete(d.id));
      const zoomed = (tr) => {
        gz.attr('transform', tr); S.zoomK = tr.k; const k = tr.k;
        this.dots.attr('r', d => (2.5 + Math.min(4, (d.a.medals.g || 0) * 0.8)) / Math.sqrt(k)).attr('stroke-width', 0.8 / k);
        hullG.selectAll('path').attr('stroke-width', 1 / k).attr('fill-opacity', k > 2.2 ? 0.02 : 0.07);
        arrowG.attr('opacity', k > 2.2 ? 0.15 : 1);
        const lab = []; if (k < 1.8) hulls.forEach(h => lab.push({ x: tr.applyX(h.c[0]), y: tr.applyY(h.c[1]), t: names[h.k], c: clCol(h.k), big: true }));
        else { const vis = pts.filter(d => { const X = tr.applyX(x(d.p[0])), Y = tr.applyY(y(d.p[1])); return X > 0 && X < W && Y > 0 && Y < H; }).sort((a, b) => b.a.bestIT - a.a.bestIT).slice(0, k > 3.2 ? 60 : 22); vis.forEach(d => lab.push({ x: tr.applyX(x(d.p[0])) + 7, y: tr.applyY(y(d.p[1])), t: d.a.name.split(' ').slice(0, 2).join(' '), c: INK })); }
        labelG.selectAll('text').data(lab).join('text').attr('x', d => d.x).attr('y', d => d.y).attr('dy', '0.35em').attr('text-anchor', d => d.big ? 'middle' : 'start').attr('fill', d => d.c)
          .style('font', d => d.big ? `800 12px ${DISPLAY}` : `600 10px ${SANS}`).style('letter-spacing', d => d.big ? '.06em' : '0').style('paint-order', 'stroke').attr('stroke', '#071a2e').attr('stroke-width', 3).text(d => d.big ? d.t.toUpperCase() : d.t);
        if (k >= 3.2) {
          const vis = pts.filter(d => { const X = tr.applyX(x(d.p[0])), Y = tr.applyY(y(d.p[1])); return X > 0 && X < W && Y > 0 && Y < H; });
          const gl = glyphG.selectAll('g').data(vis, d => d.id).join(enter => { const g = enter.append('g'); g.selectAll('path').data(d => d.f.slice(1, 6).map((v, j) => ({ v, j }))).join('path'); return g; });
          gl.attr('transform', d => `translate(${x(d.p[0])},${y(d.p[1])})`).selectAll('path').attr('d', q => d3.arc()({ innerRadius: 3.2 / k, outerRadius: (3.2 + q.v * 9) / k, startAngle: q.j * 2 * Math.PI / 5 + 0.08, endAngle: (q.j + 1) * 2 * Math.PI / 5 - 0.08 })).attr('fill', q => STROKE_COLORS['LCPBM'[q.j]]).attr('opacity', 0.9);
        } else glyphG.selectAll('g').remove();
      };
      const zoom = d3.zoom().scaleExtent([0.8, 10]).filter(ev => S.pcaMode !== 'lasso' && (!ev.button || ev.type === 'wheel')).on('zoom', ev => zoomed(ev.transform));
      svg.call(zoom); this.zoom = zoom; this.zoomed = zoomed;
      if (this.lastT) svg.call(zoom.transform, this.lastT); else zoomed(d3.zoomIdentity);
      zoom.on('end', ev => { this.lastT = ev.transform; });
      let lasso = null; const lp = svg.append('path').attr('fill', 'rgba(255,210,63,.1)').attr('stroke', YOU).attr('stroke-dasharray', '4 3');
      svg.on('pointerdown.lasso', ev => { if (S.pcaMode !== 'lasso') return; lasso = [d3.pointer(ev)]; svg.node().setPointerCapture(ev.pointerId); })
        .on('pointermove.lasso', ev => { if (!lasso) return; lasso.push(d3.pointer(ev)); lp.attr('d', 'M' + lasso.join('L') + 'Z'); })
        .on('pointerup.lasso', () => {
          if (!lasso) return; const poly = lasso; lasso = null; lp.attr('d', null); if (poly.length < 4) { setSel(null); return; }
          const tr = d3.zoomTransform(svg.node()); const inside = pts.filter(d => d3.polygonContains(poly, [tr.applyX(x(d.p[0])), tr.applyY(y(d.p[1]))]));
          setSel(new Set(inside.flatMap(d => d.rs.map(r => r.id))), 'pca');
        });
      this.restyle();
    },
    resetZoom() { if (this.svg && this.zoom) { this.lastT = null; this.svg.transition().duration(500).call(this.zoom.transform, d3.zoomIdentity); } },
    restyle() {
      if (!this.dots) return; const h = S.hover; const sa = selAth();
      this.dots.attr('opacity', d => { if (h && h.type === 'athlete') return d.id === h.id ? 1 : 0.2; if (h && h.type === 'team') return d.a.team === h.team ? 1 : 0.12; if (h && h.type === 'event') return d.a.events.includes(h.code) ? 1 : 0.12; if (sa) return sa.has(d.id) ? 1 : 0.1; return 0.9; })
        .attr('stroke', d => (h && h.type === 'athlete' && d.id === h.id) ? YOU : (sa && sa.has(d.id) ? '#ffffff' : '#041226'));
    }
  };

  views.chord = {
    draw() {
      const el = els.chord; if (!el || !el.clientWidth) return;
      const { svg, W, H } = mkSvg(el, 180); this.svg = svg;
      const codes = IND_EVENTS.filter(c => S.F.events.includes(c) && RI.some(r => r.code === c));
      if (codes.length < 2) return empty(svg, W, H, 'Selecione 2+ provas individuais');
      const idx = new Map(codes.map((c, i) => [c, i])); const M = codes.map(() => codes.map(() => 0)); const pairs = new Map();
      const ed = d3.group(RI, r => r.ath + '|' + r.comp + '|' + r.year);
      for (const [k, rs] of ed) { const cs = [...new Set(rs.map(r => r.code))]; for (let i = 0; i < cs.length; i++) for (let j = i + 1; j < cs.length; j++) { const a = idx.get(cs[i]), b = idx.get(cs[j]); M[a][b]++; M[b][a]++; const key = [cs[i], cs[j]].sort().join('|'); (pairs.get(key) || pairs.set(key, new Set()).get(key)).add(rs[0].ath); } }
      if (!d3.sum(M.flat())) return empty(svg, W, H, 'Nenhum atleta combinou provas nesta seleção');
      const r0 = Math.min(W, H) / 2 - 46; const g = svg.append('g').attr('transform', `translate(${W / 2},${H / 2 + 4})`);
      const chords = d3.chord().padAngle(0.05).sortSubgroups(d3.descending)(M);
      const arc = d3.arc().innerRadius(r0).outerRadius(r0 + 12); const rib = d3.ribbon().radius(r0 - 2);
      this.groups = g.append('g').selectAll('path').data(chords.groups).join('path').attr('d', arc).attr('fill', d => evColor(codes[d.index])).style('cursor', 'pointer')
        .on('pointerenter', (ev, d) => setHover({ type: 'event', code: codes[d.index] })).on('pointerleave', () => { setHover(null); hideTip(); })
        .on('pointermove', (ev, d) => showTip(`<b>${EVENTS[codes[d.index]].label}</b><br>${d.value} combinações com outras provas`, ev));
      g.append('g').selectAll('text').data(chords.groups).join('text').each(function (d) { d.a = (d.startAngle + d.endAngle) / 2; })
        .attr('transform', d => `rotate(${d.a * 180 / Math.PI - 90}) translate(${r0 + 18}) ${d.a > Math.PI ? 'rotate(180)' : ''}`).attr('text-anchor', d => d.a > Math.PI ? 'end' : 'start').attr('dy', '0.35em')
        .attr('fill', d => evColor(codes[d.index])).style('font', `700 10.5px ${SANS}`).text(d => EVENTS[codes[d.index]].short);
      this.ribs = g.append('g').selectAll('path').data(chords).join('path').attr('d', rib).attr('fill', d => evColor(codes[d.source.index])).attr('stroke', '#071a2e').attr('stroke-width', 0.5).style('cursor', 'pointer')
        .on('pointermove', (ev, d) => { const a = codes[d.source.index], b = codes[d.target.index]; showTip(`<b>${EVENTS[a].short} + ${EVENTS[b].short}</b><br>${d.source.value} participações conjuntas (mesma edição)<br><span style="color:#8db3cf">clique para selecionar esses atletas</span>`, ev); })
        .on('pointerleave', hideTip)
        .on('click', (ev, d) => { const a = codes[d.source.index], b = codes[d.target.index]; const ath = pairs.get([a, b].sort().join('|')) || new Set(); setSel(new Set(RI.filter(r => ath.has(r.ath) && (r.code === a || r.code === b)).map(r => r.id)), 'chord'); });
      this.codes = codes; this.restyle();
    },
    restyle() {
      if (!this.ribs) return; const h = S.hover; const sa = selAth(); const codes = this.codes;
      const selCodes = S.sel ? new Set([...S.sel].map(i => db.results[i].code)) : null;
      this.ribs.attr('opacity', d => { if (h && h.type === 'event') return codes[d.source.index] === h.code || codes[d.target.index] === h.code ? 0.9 : 0.08; if (h && h.type === 'athlete') { const a = db.athletes[h.id]; return a && a.events.includes(codes[d.source.index]) && a.events.includes(codes[d.target.index]) ? 0.95 : 0.08; } if (selCodes) return selCodes.has(codes[d.source.index]) && selCodes.has(codes[d.target.index]) ? 0.85 : 0.1; return 0.62; });
    }
  };

  views.lorenz = {
    draw() {
      const el = els.lorenz; if (!el || !el.clientWidth) return;
      const { svg, W, H } = mkSvg(el, 180); this.svg = svg;
      const RR = RI.filter(r => !r.demo); const byTeam = d3.group(RR, r => r.team);
      const teams = [...byTeam].map(([t, rs]) => { const pa = d3.rollup(rs, v => d3.sum(v, r => r.pts), r => r.ath); const vals = [...pa.values()]; return { t, tot: d3.sum(vals), n: vals.length, g: gini(vals), L: lorenz(vals), comp: rs[0].comp }; }).filter(d => d.tot > 0 && d.n >= 3).sort((a, b) => b.tot - a.tot).slice(0, 7);
      if (!teams.length) return empty(svg, W, H);
      const legW = Math.min(170, W * 0.38); const m = { l: 36, r: legW + 12, t: 12, b: 30 }; const side = Math.min(W - m.l - m.r, H - m.t - m.b);
      const x = d3.scaleLinear([0, 1], [m.l, m.l + side]); const y = d3.scaleLinear([0, 1], [m.t + side, m.t]);
      svg.append('g').attr('transform', `translate(0,${m.t + side})`).call(d3.axisBottom(x).ticks(4).tickFormat(d => d * 100 + '%')).call(styleAxis);
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(d => d * 100 + '%')).call(styleAxis);
      svg.append('line').attr('x1', x(0)).attr('y1', y(0)).attr('x2', x(1)).attr('y2', y(1)).attr('stroke', 'rgba(234,246,255,.4)').attr('stroke-dasharray', '3 3');
      svg.append('text').attr('x', x(0.5)).attr('y', m.t + side + 26).attr('text-anchor', 'middle').attr('fill', MUTE).style('font', `500 9.5px ${MONO}`).text('% de atletas (do menor ao maior)');
      const line = d3.line().x(d => x(d[0])).y(d => y(d[1])).curve(d3.curveStepAfter);
      this.items = teams.map(T => {
        const col = teamColor(T.t, T.comp);
          const p = svg.append('path').attr('d', line(T.L)).attr('fill', 'none').attr('stroke', col).attr('stroke-width', 2);
        return { T, p, col };
      });
      const leg = svg.append('g').attr('transform', `translate(${W - legW},${m.t + 4})`);
      leg.append('text').attr('fill', MUTE).style('font', `500 9.5px ${MONO}`).text('equipe · Gini');
      this.items.forEach((it, i) => {
        const r = leg.append('g').attr('transform', `translate(0,${16 + i * 20})`).style('cursor', 'pointer').on('pointerenter', () => setHover({ type: 'team', team: it.T.t })).on('pointerleave', () => setHover(null)).on('click', () => hooks.onToggleTeam && hooks.onToggleTeam(it.T.t));
        r.append('rect').attr('width', 10).attr('height', 10).attr('y', -9).attr('fill', it.col);
        r.append('text').attr('x', 16).attr('fill', INK).style('font', `600 11px ${SANS}`).text(it.T.t.slice(0, 13));
        r.append('text').attr('x', legW - 6).attr('text-anchor', 'end').attr('fill', it.col).style('font', `700 11px ${MONO}`).text(it.T.g.toFixed(2));
        it.leg = r;
      });
      this.restyle();
    },
    restyle() { if (!this.items) return; const h = S.hover; this.items.forEach(it => { const on = !(h && h.type === 'team') || h.team === it.T.t; it.p.attr('opacity', on ? 1 : 0.12).attr('stroke-width', h && h.team === it.T.t ? 3.5 : 2); it.leg.attr('opacity', on ? 1 : 0.35); }); }
  };

  function update() { compute(); S.sel = null; S.selSrc = null; S.pcBrush = {}; hooks.onSelection && hooks.onSelection(null); for (const v of Object.values(views)) { try { v.draw(); } catch (e) { console.error('view', e); } } hooks.onCounts && hooks.onCounts({ results: R.length, athletes: athIds.size }); }
  return {
    setFilters(F) { S.F = { ...S.F, ...F }; update(); },
    setOption(k, v) { S[k] = v; if (k === 'pcaMode') { const sv = views.pca.svg; if (sv) sv.style('cursor', v === 'lasso' ? 'crosshair' : 'grab'); return; } if (k === 'order') return views.matrix.draw(); if (k === 'k') return views.pca.draw(); for (const v of Object.values(views)) v.draw(); },
    clearSelection() { S.pcBrush = {}; setSel(null); views.swarm.clearBrush(); views.pc.draw(); },
    resetZoom() { views.pca.resetZoom(); },
    hover(h) { setHover(h); },
    redraw() { for (const v of Object.values(views)) { try { v.draw(); } catch (e) { console.error(e); } } },
    state: S
  };
}

export function drawAthlete(els, db, id, you) {
  const a = db.athletes[id]; if (!a) return;
 const el = els.timeline; d3.select(el).selectAll('*').remove();
  const W = Math.max(260, el.clientWidth), H = 200; const m = { l: 40, r: 16, t: 14, b: 26 };
  const svg = d3.select(el).append('svg').attr('width', W).attr('height', H).style('display', 'block');
  const rs = a.ind.filter(r => !r.relay);
  const x = d3.scalePoint([2023, 2024, 2025, 2026], [m.l, W - m.r]).padding(0.3);
  const y = d3.scaleLinear([Math.max(0, (d3.min(rs, r => r.it) || 500) - 60), 1000], [H - m.b, m.t]);
  svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x)).call(styleAxis);
  svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4)).call(styleAxis);
  const byEv = d3.group(rs, r => r.code + '|' + r.comp);
  for (const [k, arr] of byEv) { arr.sort((p, q) => p.year - q.year); if (arr.length > 1) svg.append('path').attr('d', d3.line().x(r => x(r.year)).y(r => y(r.it))(arr)).attr('fill', 'none').attr('stroke', evColor(arr[0].code)).attr('stroke-width', 1.6).attr('stroke-dasharray', arr[0].comp === 'TUSCA' ? '4 3' : null); }
  const sym = d3.symbol().size(70);
  svg.append('g').selectAll('path').data(rs).join('path').attr('transform', r => `translate(${x(r.year) + (r.comp === 'TUSCA' ? 6 : -6)},${y(r.it)})`).attr('d', r => sym.type(r.comp === 'TUSCA' ? d3.symbolDiamond : d3.symbolCircle)())
    .attr('fill', r => evColor(r.code)).attr('stroke', r => r.orank && r.orank <= 3 ? '#fff' : '#041226').attr('stroke-width', 1.2)
    .on('pointermove', (ev, r) => showTip(`${EVENTS[r.code].label} · ${r.comp} ${r.year}<br><b>${fmtTime(r.time)}</b> · IT ${Math.round(r.it)} · ${r.prank}º${r.pts ? ` · ${r.pts} pts` : ''}`, ev)).on('pointerleave', hideTip);
  svg.append('text').attr('x', W - m.r).attr('y', m.t).attr('text-anchor', 'end').attr('fill', MUTE).style('font', `500 9.5px ${MONO}`).text('● InterUSP  ◆ TUSCA · IT por ano');
  const el2 = els.radar; d3.select(el2).selectAll('*').remove();
  const W2 = Math.max(220, el2.clientWidth), H2 = 210; const svg2 = d3.select(el2).append('svg').attr('width', W2).attr('height', H2).style('display', 'block');
  const g = svg2.append('g').attr('transform', `translate(${W2 / 2},${H2 / 2 + 6})`); const rr = Math.min(W2, H2) / 2 - 30;
  const keys = ['L', 'C', 'P', 'B', 'M']; const best = keys.map(k => d3.max(rs.filter(r => r.stroke === k), r => r.it) || 0);
  const ang = i => -Math.PI / 2 + i * 2 * Math.PI / 5; const rs2 = d3.scaleLinear([0, 1000], [0, rr]);
  for (const lv of [250, 500, 750, 1000]) g.append('path').attr('d', d3.line()(keys.map((k, i) => [Math.cos(ang(i)) * rs2(lv), Math.sin(ang(i)) * rs2(lv)]).concat([[Math.cos(ang(0)) * rs2(lv), Math.sin(ang(0)) * rs2(lv)]]))).attr('fill', 'none').attr('stroke', GRID);
  keys.forEach((k, i) => { g.append('line').attr('x2', Math.cos(ang(i)) * rr).attr('y2', Math.sin(ang(i)) * rr).attr('stroke', GRID); g.append('text').attr('x', Math.cos(ang(i)) * (rr + 14)).attr('y', Math.sin(ang(i)) * (rr + 14)).attr('dy', '0.35em').attr('text-anchor', 'middle').attr('fill', STROKE_COLORS[k]).style('font', `700 10.5px ${SANS}`).text(STROKES[k]); });
  const poly = keys.map((k, i) => [Math.cos(ang(i)) * rs2(best[i]), Math.sin(ang(i)) * rs2(best[i])]);
  g.append('path').attr('d', 'M' + poly.join('L') + 'Z').attr('fill', 'rgba(47,224,240,.22)').attr('stroke', '#2FE0F0').attr('stroke-width', 2);
  g.selectAll('circle').data(poly).join('circle').attr('cx', d => d[0]).attr('cy', d => d[1]).attr('r', (d, i) => best[i] ? 3.5 : 0).attr('fill', '#2FE0F0');
}
