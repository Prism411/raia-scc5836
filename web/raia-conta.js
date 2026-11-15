(function () {
  'use strict';

  const C = {
    fundo: '#031021', painel: '#041226', campo: '#071a2e', texto: '#eaf6ff', suave: '#8db3cf',
    apagado: '#56708a', ciano: '#2FE0F0', ouro: '#FFD23F', coral: '#FF5468',
    borda: 'rgba(141,179,207,.14)', bordaCampo: 'rgba(141,179,207,.25)'
  };
  const TITULO = "'Big Shoulders Display',Impact,sans-serif";
  const MONO = "'JetBrains Mono',monospace";

  let conta = null;
  let tAvatar = 0, tTec = 0;
  const cacheRanking = new Map();

  const app = () => window.__raia || null;

  async function api(metodo, caminho, corpo, ms = 4000) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), ms);
    try {
      const r = await fetch(caminho, {
        method: metodo, credentials: 'same-origin', signal: ctl.signal,
        headers: corpo ? { 'Content-Type': 'application/json' } : {},
        body: corpo ? JSON.stringify(corpo) : undefined
      });
      let dados = null; try { dados = await r.json(); } catch (e) { }
      return { ok: r.ok, status: r.status, dados };
    } catch (e) {
      return { ok: false, status: 0, dados: null };
    } finally { clearTimeout(t); }
  }

  function el(tag, estilo, filhos) {
    const n = document.createElement(tag);
    if (estilo) n.style.cssText = estilo;
    (filhos || []).forEach(f => n.append(f));
    return n;
  }
  const txt = s => document.createTextNode(String(s == null ? '' : s));

  async function carregar() {
    const r = await api('GET', '/api/eu', null, 2500);
    if (r.ok && r.dados && r.dados.nome) { conta = { nome: r.dados.nome }; return r.dados; }
    conta = null; return null;
  }

  async function entrar(nome) {
    const r = await api('POST', '/api/sessao', { nome });
    if (r.ok && r.dados && r.dados.nome) {
      cacheRanking.clear();
      conta = { nome: r.dados.nome };
      const a = app(); if (a && a.setConta) a.setConta(r.dados.nome, r.dados);
      return { ok: true };
    }
    const msg = (r.dados && r.dados.erro) || (r.status === 0 ? 'Sem conexão com o servidor. Tente de novo.' : 'Não foi possível entrar agora.');
    return { ok: false, msg };
  }

  async function sair() {
    await api('DELETE', '/api/sessao');
    cacheRanking.clear();
    conta = null;
    const a = app(); if (a && a.setConta) a.setConta(null);
  }

  function salvarAvatar(av) {
    if (!conta || !av) return;
     clearTimeout(tAvatar);
    const copia = JSON.parse(JSON.stringify(av));
    tAvatar = setTimeout(() => api('PUT', '/api/eu/avatar', { avatar: copia }), 900);
  }
  function salvarTec(tec) {
    if (!conta || !tec) return;
    clearTimeout(tTec);
    const copia = JSON.parse(JSON.stringify(tec));
    tTec = setTimeout(() => api('PUT', '/api/eu/tec', { tec: copia }), 900);
  }
  async function enviarResultado(r) {
    if (!conta || !r || !isFinite(r.time)) return false;
    const a = app(); const team = a && a.state && a.state.avatar ? a.state.avatar.team || '' : '';
    const resp = await api('POST', '/api/resultados', { ...r, time: Math.round(r.time * 100) / 100, team });
    if (resp.ok) cacheRanking.clear();
    return !!resp.ok;
  }

  let modal = null;
  function abrir() {
    if (modal) return;
    const a = app(); const atual = a && a.state && a.state.avatar ? a.state.avatar.name : '';
    const fundo = el('div', `position:fixed;inset:0;z-index:100;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(1,8,18,.72);backdrop-filter:blur(3px)`);
    const caixa = el('form', `width:min(420px,100%);background:${C.painel};border:1px solid rgba(47,224,240,.45);box-shadow:0 24px 60px rgba(0,0,0,.6);padding:22px 22px 18px;display:flex;flex-direction:column;gap:12px;font-family:Barlow,system-ui,sans-serif;color:${C.texto}`);
    caixa.setAttribute('role', 'dialog'); caixa.setAttribute('aria-modal', 'true'); caixa.setAttribute('aria-label', 'Entrar na RAIA');
    const faixas = el('span', 'display:flex;flex-direction:column;gap:3px', ['#FF5468', '#2FE0F0', '#FFD23F'].map(c => el('span', `display:block;width:22px;height:3px;background:${c}`)));
    const fechar = el('button', `margin-left:auto;width:28px;height:28px;background:none;border:1px solid ${C.bordaCampo};color:${C.suave};cursor:pointer;border-radius:2px`, [txt('✕')]);
    fechar.type = 'button'; fechar.setAttribute('aria-label', 'Fechar');
    const topo = el('div', 'display:flex;align-items:center;gap:10px', [faixas, el('span', `font:900 26px/1 ${TITULO};letter-spacing:.05em`, [txt('ENTRAR NA RAIA')]), fechar]);
    const sub = el('p', `margin:0;font:500 13.5px/1.45 Barlow,sans-serif;color:${C.suave}`, [txt('Só o nome, sem senha. Seu nadador e sua técnica ficam salvos, e cada prova que você correr na Arena entra no ranking dos visitantes.')]);
    const rot = el('label', `font:600 10px/1 ${MONO};letter-spacing:.14em;color:${C.suave};text-transform:uppercase`, [txt('Como você quer aparecer?')]);
    const campo = el('input', `height:42px;background:${C.campo};border:1px solid ${C.bordaCampo};padding:0 12px;font:600 15px Barlow,sans-serif;border-radius:2px;color:${C.texto}`);
    campo.maxLength = 24; campo.placeholder = 'Seu nome'; campo.autocomplete = 'nickname'; campo.required = true;
    campo.value = atual && atual !== 'Você' ? atual : '';
    campo.id = 'raia-conta-nome'; rot.htmlFor = campo.id;
    const erro = el('div', `min-height:16px;font:500 12.5px/1.3 Barlow,sans-serif;color:${C.coral}`);
    erro.setAttribute('role', 'alert');
    const botao = el('button', `height:42px;background:${C.ouro};color:#041226;border:0;cursor:pointer;border-radius:2px;font:800 17px/1 ${TITULO};letter-spacing:.1em;text-transform:uppercase`, [txt('Entrar')]);
    botao.type = 'submit';
    const nota = el('p', `margin:0;font:500 11px/1.4 ${MONO};color:${C.apagado}`, [txt('O nome fica reservado para este navegador. Ver o site não exige conta.')]);
    caixa.append(topo, sub, rot, campo, erro, botao, nota);
    fundo.append(caixa);

    const fecharModal = () => { if (!modal) return; modal.remove(); modal = null; document.removeEventListener('keydown', onKey, true); };
     const onKey = e => { if (e.key === 'Escape') { e.stopPropagation(); fecharModal(); } };
    fechar.onclick = fecharModal;
    fundo.addEventListener('mousedown', e => { if (e.target === fundo) fecharModal(); });
    document.addEventListener('keydown', onKey, true);
    caixa.addEventListener('keydown', e => e.stopPropagation());
    caixa.onsubmit = async e => {
      e.preventDefault();
      const nome = campo.value.replace(/\s+/g, ' ').trim();
      if (nome.length < 2) { erro.textContent = 'Use pelo menos 2 caracteres.'; return; }
      botao.disabled = true; botao.style.opacity = '.6'; erro.textContent = '';
      const r = await entrar(nome);
      botao.disabled = false; botao.style.opacity = '1';
      if (r.ok) fecharModal(); else { erro.textContent = r.msg; campo.focus(); }
    };
    document.body.append(fundo); modal = fundo;
    setTimeout(() => campo.focus(), 30);
  }

  function fmt(s) {
    if (s == null || !isFinite(s)) return '—';
    if (s >= 60) { const m = Math.floor(s / 60); const r = s - m * 60; return m + ':' + (r < 10 ? '0' : '') + r.toFixed(2); }
    return s.toFixed(2);
  }
  function rotuloProva(q) {
    const a = app(); const ev = a && a.M && a.M.core && a.M.core.EVENTS[q.code];
    return (ev ? ev.label : q.code) + ' ' + (q.sex === 'F' ? 'Feminino' : 'Masculino') + ' · piscina ' + q.pool + ' m';
  }
  function desenharRanking(alvo, q) {
    if (!alvo) return null;
    alvo.replaceChildren();
    const caixa = el('div', 'position:absolute;inset:0;display:flex;flex-direction:column;gap:6px;overflow:hidden');
    const cab = el('div', 'flex:none;display:flex;align-items:baseline;flex-wrap:wrap;gap:4px 10px;padding:0 4px', [
      el('span', `font:800 16px/1 ${TITULO};letter-spacing:.08em;text-transform:uppercase;color:${C.texto}`, [txt('Ranking dos visitantes')]),
      el('span', `font:500 10.5px/1.2 ${MONO};letter-spacing:.06em;color:${C.suave}`, [txt(rotuloProva(q))]),
      el('span', `margin-left:auto;font:600 9.5px/1 ${MONO};letter-spacing:.1em;color:${C.apagado}`, [txt('TEMPO INFORMADO')])
    ]);
    const lista = el('div', 'flex:1;min-height:0;overflow-y:auto;display:flex;flex-direction:column;gap:2px;padding:0 4px');
    lista.append(el('div', `padding:10px 6px;font:500 12.5px Barlow,sans-serif;color:${C.suave}`, [txt('Carregando…')]));
    caixa.append(cab, lista); alvo.append(caixa);

    const vivo = { cancel: false };
    const url = `/api/ranking?code=${encodeURIComponent(q.code)}&sex=${encodeURIComponent(q.sex)}&pool=${encodeURIComponent(q.pool)}`;
    const c = cacheRanking.get(url);
    const pedido = c && Date.now() - c.t < 8000 ? Promise.resolve(c.r) : api('GET', url).then(r => { if (r.ok) cacheRanking.set(url, { t: Date.now(), r }); return r; });
    pedido.then(r => {
      if (vivo.cancel || !alvo.isConnected) return;
      lista.replaceChildren();
      if (!r.ok || !r.dados) { lista.append(el('div', `padding:10px 6px;font:500 12.5px Barlow,sans-serif;color:${C.suave}`, [txt('Ranking indisponível no momento.')])); return; }
      const { top = [], eu = null } = r.dados;
      if (!top.length) lista.append(el('div', `padding:10px 6px;font:500 12.5px Barlow,sans-serif;color:${C.suave}`, [txt('Ninguém nadou esta prova ainda. Corra na Arena e seja o primeiro.')]));
      const linha = (p) => {
        const meu = conta && p.nome === conta.nome;
        const cor = p.pos === 1 ? '#E8B931' : p.pos === 2 ? '#C9D2DA' : p.pos === 3 ? '#C07A43' : C.suave;
        return el('div', `display:grid;grid-template-columns:34px 6px minmax(0,1fr) 74px minmax(0,200px);gap:8px;align-items:center;min-height:26px;padding:0 6px;background:${meu ? 'rgba(255,210,63,.14)' : 'rgba(141,179,207,.04)'};font:500 12.5px/1 Barlow,sans-serif`, [
          el('span', `font:700 13px/1 ${MONO};color:${cor}`, [txt(p.pos + 'º')]),
          el('span', `width:6px;height:18px;background:${meu ? C.ouro : C.ciano}`),
          el('span', `overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${meu ? C.ouro : C.texto};font-weight:600`, [txt(p.nome + (meu ? ' (você)' : '')), el('span', `color:${C.apagado};font-weight:500`, [txt(p.team ? ' · ' + p.team : '')])]),
          el('span', `font:600 12.5px/1 ${MONO};text-align:right;color:${C.texto}`, [txt(fmt(p.time))]),
          el('span', `font:500 10.5px/1.2 ${MONO};text-align:right;color:${C.apagado};overflow:hidden;text-overflow:ellipsis;white-space:nowrap`, [txt(p.place ? `${p.place}º na final ${p.comp || ''} ${p.year || ''}`.trim() : '')])
        ]);
      };
      top.forEach(p => lista.append(linha(p)));
      if (eu && !top.some(p => p.nome === eu.nome)) { lista.append(el('div', `padding:2px 6px;color:${C.apagado};font:600 11px ${MONO}`, [txt('⋯')])); lista.append(linha(eu)); }
      if (!conta) {
        const cta = el('button', `align-self:flex-start;margin:8px 6px 4px;height:28px;padding:0 12px;background:none;border:1px solid rgba(47,224,240,.45);color:${C.ciano};cursor:pointer;border-radius:2px;font:700 14px/1 ${TITULO};letter-spacing:.08em;text-transform:uppercase`, [txt('Entrar para aparecer aqui')]);
        cta.type = 'button'; cta.onclick = abrir; lista.append(cta);
      }
    });
      return { setTime() { }, highlight() { }, cancel() { vivo.cancel = true; } };
  }

  window.raiaConta = { carregar, entrar, sair, abrir, salvarAvatar, salvarTec, enviarResultado, desenharRanking, get nome() { return conta ? conta.nome : null; } };
})();
