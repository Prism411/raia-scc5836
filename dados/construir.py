#!/usr/bin/env python3
import argparse
import csv
import datetime
import json
import re
import subprocess
import sys
import unicodedata
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[1]

SCORING = {
    'InterUSP': {'ind': [13, 10, 8, 6, 4, 3, 2, 1], 'rel': [26, 20, 16, 12, 8, 6, 4, 2], 'rec': 'x2'},
    'TUSCA|2023': {'ind': [12, 11, 10, 8, 6, 4, 2, 1], 'rel': [24, 22, 20, 16, 12, 8], 'rec': '+2'},
    'TUSCA|2024': {'ind': [10, 8, 6, 4, 2, 1], 'rel': [20, 16, 12, 8, 4], 'rec': '+2'},
    'TUSCA|2025': {'ind': [14, 12, 10, 8, 6, 4, 2, 1], 'rel': [28, 24, 20, 16], 'rec': '+2'},
    'TUSCA|2026': {'ind': [14, 12, 10, 8, 6, 4, 2, 1], 'rel': [28, 24, 20, 16], 'rec': '+2'},
}

STROKES = {'LIVRE': 'L', 'COSTAS': 'C', 'PEITO': 'P', 'BORBOLETA': 'B', 'MEDLEY': 'M'}

TEAM_ALIASES = {
    'MEDICINA PINHEIROS': 'MED PINHEIROS', 'MED.PINHEIROS': 'MED PINHEIROS', 'MED. PINHEIROS': 'MED PINHEIROS',
    'PINHEIROS': 'MED PINHEIROS', 'MED PINHEIROS': 'MED PINHEIROS',
    'MED RIBEIRAO': 'MED RIBEIRÃO', 'RIBEIRAO': 'MED RIBEIRÃO', 'AAARL': 'MED RIBEIRÃO',
    'FEA USP': 'FEA', 'FEA': 'FEA', 'FARMACIA': 'FARMÁCIA', 'FARMA': 'FARMÁCIA',
    'ENGENHARIA MACKENZIE': 'MACK', 'MACKENZIE': 'MACK', 'MACK': 'MACK', 'MAUA': 'MAUÁ',
    'UFABC': 'UFABC', 'UFAB': 'UFABC', 'UFSCAR': 'UFSCAR', 'LEU UNICAMP': 'LEU',
    **{t: t for t in ['POLI', 'CAASO', 'SANFRAN', 'ESALQ', 'ODONTO', 'LEU', 'LAP', 'LAURP', 'AXIS', 'USCS', 'UNIFEI']},
}
_ALT = '|'.join(re.escape(t).replace(r'\ ', r'\s*') for t in sorted(TEAM_ALIASES, key=len, reverse=True))
TEAM_FIM = re.compile(r'(?:^|\s)(?:EQUIPE\s+([AB])\s+)?(' + _ALT + r')(?:\s*([AB]))?\s*(?:\(\s*(O|E)[A-Z]*\s*\))?\s*$')


def norm_team(t):
    t = re.sub(r'\(\s*[OE][A-Z]*\s*\)', '', sem_acento(t).upper())
    t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(r'\s+[AB]$', '', t)
    t = re.sub(r'^EQUIPE [AB] ', '', t)
    return TEAM_ALIASES.get(t, t)


PARTICULAS = {'de', 'da', 'do', 'das', 'dos', 'e'}
HOMOGLIFOS = str.maketrans('аеорсухАВЕКМНОРСТХ', 'aeopcyxABEKMHOPCTX')


def sem_acento(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if unicodedata.category(c) != 'Mn')


MOJIBAKE = {'√': 'Ã', '√£': 'ã', 'Õ': 'Õ', '‚': 'é', 'á': 'á'}


def corrigir_codificacao(s):
    if not any(ch in s for ch in '√‚'):
        return s
    try:
        return s.encode('mac_roman').decode('cp1252')
    except (UnicodeEncodeError, UnicodeDecodeError):
        for a, b in MOJIBAKE.items():
            s = s.replace(a, b)
        return s


CPF = re.compile(r'(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)')


def remover_cpf(s):
    return CPF.sub(' ', s)


def parse_tempo(s):
    s = s.strip().replace(',', '.')
    m = re.fullmatch(r'(?:(\d+)\.)?(\d{1,2})\.(\d{2})', s)
    if not m:
        return None
    mi, se, cs = int(m.group(1) or 0), int(m.group(2)), int(m.group(3))
    return round(mi * 60 + se + cs / 100, 2)


def titulo(nome):
    out = []
    for i, w in enumerate(nome.lower().split()):
        out.append(w if (i and w in PARTICULAS) else w[:1].upper() + w[1:])
    return ' '.join(out)


def limpar_nome(n):
    cat = None
    n = re.sub(r'[\u200b-\u200f\u2060\ufeff]', '', n).translate(HOMOGLIFOS)
    n = re.sub(r'^[º°]\s*', '', n.strip())
    m = re.search(r'\(\s*(O|E|OFICIAL|EXTRA)\s*\)\s*$', n, re.I)
    if m:
        cat = 'O' if m.group(1).upper().startswith('O') else 'E'
        n = n[:m.start()]
    return re.sub(r'\s+', ' ', n).strip(), cat


def ler_csv(caminho):
    eventos = []
    ano, ev = None, None
    with open(caminho, encoding='utf-8') as f:
        for row in csv.reader(f):
            cel = [c.strip() for c in row]
            if not any(cel):
                continue
            m = re.fullmatch(r'INTERUSP (\d{4})', cel[0], re.I)
            if m:
                ano = int(m.group(1)); continue
            m = re.match(r'(Rev )?(4x)?(\d+)m? ?(Livre|Costas|Peito|Borboleta|Medley)( \(Demo\))? (Feminino|Masculino)', cel[0], re.I)
            if m:
                rel = bool(m.group(1) or m.group(2))
                dist = int(m.group(3)) * (4 if rel else 1)
                ev = {'c': 'InterUSP', 'y': ano, 'd': dist, 'k': STROKES[m.group(4).upper()], 'r': int(rel),
                      'dm': int(bool(m.group(5))), 's': 'F' if m.group(6).lower().startswith('f') else 'M',
                      'rec': None, 'nr': 0, 'src': 'csv', 'res': []}
                eventos.append(ev); continue
            if cel[0] == 'Pos' or ev is None:
                continue
            pos, nome, cat, _eq, eq_orig, tempo, _tseg, pts = (cel + [''] * 8)[:8]
            st = None
            tm = parse_tempo(tempo)
            if tm is None:
                st = tempo.upper() or 'DSQ'
            r = {'p': int(pos) if pos.isdigit() and tm is not None else None, 't': norm_team(eq_orig),
                 'tm': tm, 'pt': int(float(pts.replace(',', '.'))) if pts else 0}
            r['k'] = 'E' if cat.lower().startswith('extra') else 'O'
            if ev['r']:
                q = re.search(r'\s([AB])$', eq_orig.strip())
                r['n'] = ' / '.join(titulo(x.strip()) for x in nome.split('/'))
                if q:
                    r['q'] = q.group(1)
            else:
                r['nome'] = nome
            if st:
                r['st'] = st
            ev['res'].append(r)
    return eventos


def pdf_texto(caminho):
    out = subprocess.run(['pdftotext', '-layout', str(caminho), '-'], capture_output=True, check=True)
    return corrigir_codificacao(remover_cpf(out.stdout.decode('utf-8', 'replace')))


LINHA = re.compile(r'^\s*(?:(\d+)\s*[º°])?\s*(.+?)\s*(?<![\d.])(\d{1,2}\.\d{2}\.\d{2}|\d{1,2}\.\d{2}|DSQ|DNF|NC)(?:\s+(\d+))?\s*$')


def ler_pdf(caminho, comp, ano):
    txt = pdf_texto(caminho)
    m = re.search(r'(REVEZAMENTO\s+)?(4\s*X\s*)?(\d+)\s*(?:METROS|MTS|M)?\s+(LIVRE|COSTAS|PEITO|BORBOLETA|MEDLEY)\s+(FEMININO|MASCULINO)', txt, re.I)
    if not m:
        return None
    rel = bool(m.group(1) or m.group(2))
    dist = int(m.group(3)) * (4 if rel else 1)
    ev = {'c': comp, 'y': ano, 'd': dist, 'k': STROKES[m.group(4).upper()], 'r': int(rel), 'dm': 0,
          's': 'F' if m.group(5).upper().startswith('F') else 'M', 'rec': None, 'nr': 0, 'src': 'pdf', 'res': []}
    if re.search(r'DEMO(N)?STRATIV|DEMONSTRA', txt, re.I):
        ev['dm'] = 1
    mr = re.search(r'RECORDE:?\s+(\d{1,2}\.\d{2}(?:\.\d{2})?)', txt, re.I)
    if mr:
        ev['rec'] = parse_tempo(mr.group(1))
    if re.search(r'novo recorde|estabelece', txt, re.I):
        ev['nr'] = 1
    for ln in txt.splitlines():
        ml = LINHA.match(ln)
        if not ml or re.search(r'RECORDE|CLAS|NOME|PROVA', ln, re.I):
            continue
        pos, meio, tempo, pts = ml.groups()
        mt = TEAM_FIM.search(sem_acento(meio).upper())
        if not mt:
            continue
        nome = meio[:mt.start()].strip()
        nome, cat = limpar_nome(nome)
        cat = mt.group(4) or cat
        q = mt.group(1) or mt.group(3)
        tm = parse_tempo(tempo)
        r = {'p': int(pos) if pos and tm is not None else None, 't': TEAM_ALIASES[re.sub(r'\s+', ' ', mt.group(2))],
             'tm': tm, 'pt': int(pts) if pts else 0}
        if tm is None:
            r['st'] = tempo.upper()
        if cat:
            r['k'] = cat
        elif r['pt'] > 0:
            r['k'] = 'O'
        if rel:
            r['n'] = ' / '.join(titulo(x.strip()) for x in nome.split('/'))
            if q:
                r['q'] = q
        else:
            r['nome'] = nome
        ev['res'].append(r)
    ordem = sorted((r for r in ev['res'] if r['tm'] is not None), key=lambda r: r['tm'])
    for i, r in enumerate(ordem, 1):
        r['p'] = i
    ev['res'] = ordem + [r for r in ev['res'] if r['tm'] is None]
    ultimo = max((i for i, r in enumerate(ev['res']) if r['pt'] > 0), default=-1)
    for i, r in enumerate(ev['res']):
        if 'k' not in r and r['tm'] is not None and i < ultimo:
            r['k'] = 'E'
    return ev


def ler_geral(caminho):
    tot, sexo = {}, None
    for ln in pdf_texto(caminho).splitlines():
        ms = re.search(r'NATA[CÇ][AÃ]O\s+(FEMININO|MASCULINO)', ln, re.I)
        if ms:
            sexo = 'F' if ms.group(1).upper().startswith('F') else 'M'; continue
        m = re.match(r'^\s*\d+\s*º\s+(.+?)\s{2,}.*?(\d+)\s*$', ln)
        if m and sexo:
            mt = TEAM_FIM.search(sem_acento(m.group(1)).upper())
            if mt:
                tot[(sexo, TEAM_ALIASES[re.sub(r'\s+', ' ', mt.group(2))])] = int(m.group(2))
    return tot


def tokens(nome):
    return [w for w in sem_acento(nome).upper().replace("'", '').split() if w.lower() not in PARTICULAS]


def edicao(a, b):
    ant = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        atual = [i]
        for j, cb in enumerate(b, 1):
            atual.append(min(ant[j] + 1, atual[j - 1] + 1, ant[j - 1] + (ca != cb)))
        ant = atual
    return ant[-1]


def mesmo_atleta(t1, team1, t2, team2):
    if not t1 or not t2 or t1[0] != t2[0]:
        return False
    s1, s2 = set(t1), set(t2)
    contido = s1 <= s2 or s2 <= s1
    if team1 == team2:
        return contido or edicao(t1[-1], t2[-1]) <= 1 and (len(t1) == 2 or len(t2) == 2 or len(s1 & s2) >= 2)
    return contido and min(len(s1), len(s2)) >= 3


def ligar_atletas(eventos):
    atletas = []
    por_inicio = defaultdict(list)
    for ev in eventos:
        if ev['r']:
            continue
        for r in ev['res']:
            nome = r.pop('nome')
            t = tokens(nome)
            alvo = next((a for a in por_inicio[(ev['s'], t[0] if t else '')]
                         if mesmo_atleta(t, r['t'], a['tok'], a['t'])), None)
            if alvo is None:
                alvo = {'id': len(atletas), 'nome': nome, 'tok': t, 's': ev['s'], 't': r['t'], 'c': set(), 'y': set()}
                atletas.append(alvo); por_inicio[(ev['s'], t[0] if t else '')].append(alvo)
            if len(t) > len(alvo['tok']):
                alvo['nome'], alvo['tok'] = nome, t
            alvo['c'].add(ev['c']); alvo['y'].add(ev['y'])
            r['a'] = alvo['id']
    return [{'id': a['id'], 'n': titulo(a['nome']), 's': a['s'], 't': a['t'],
             'c': sorted(a['c'], key=['InterUSP', 'TUSCA'].index), 'y': sorted(a['y'])} for a in atletas]


def codigo(ev):
    return f"4x50{ev['k']}" if ev['r'] else f"{ev['d']}{ev['k']}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--brutos', default=RAIZ / 'dados' / 'brutos', type=Path)
    ap.add_argument('--saida', default=RAIZ / 'web' / 'data' / 'natacao.json', type=Path)
    a = ap.parse_args()

    eventos = ler_csv(next(a.brutos.glob('InterUSP_*Todas as Provas.csv')))
    gerais = {}
    vistos = set()
    for pasta, comp, ano in [('interusp_2026', 'InterUSP', 2026)] + [(f'tusca_{y}', 'TUSCA', y) for y in (2023, 2024, 2025, 2026)]:
        for pdf in sorted((a.brutos / pasta).glob('*.pdf')):
            if 'GERAL' in pdf.name.upper():
                gerais[(comp, ano)] = ler_geral(pdf); continue
            ev = ler_pdf(pdf, comp, ano)
            if ev is None or not ev['res']:
                print(f'aviso: sem prova reconhecida em {pdf}', file=sys.stderr); continue
            k = (comp, ano, codigo(ev), ev['s'])
            if k in vistos:
                continue
            vistos.add(k); eventos.append(ev)

    for ev in eventos:
        ev['cd'] = codigo(ev)
        ok = [r['tm'] for r in ev['res'] if r['tm'] is not None]
        ev['win'] = min(ok) if ok else None
        ev['n'] = len(ok)
    eventos.sort(key=lambda e: (['InterUSP', 'TUSCA'].index(e['c']), e['y'], e['cd'], e['s']))
    atletas = ligar_atletas(eventos)

    match = total = 0
    for (comp, ano), geral in gerais.items():
        soma = defaultdict(float)
        for ev in eventos:
            if ev['c'] == comp and ev['y'] == ano:
                for r in ev['res']:
                    soma[(ev['s'], r['t'])] += r['pt']
        for eq, pts in geral.items():
            total += 1; match += int(abs(soma.get(eq, 0) - pts) < 0.01)

    events, results = [], []
    for i, ev in enumerate(eventos):
        events.append({k: ev[k] for k in ['c', 'y', 'cd', 's', 'd', 'k', 'r', 'dm', 'rec', 'nr', 'win', 'n', 'src']})
        for r in ev['res']:
            results.append({'e': i, **{k: r[k] for k in ['p', 't', 'k', 'tm', 'pt', 'a', 'n', 'q', 'st'] if k in r}})

    saida = {
        'meta': {'title': 'RAIA — natação universitária InterUSP + TUSCA', 'built': datetime.date.today().isoformat(),
                 'comps': ['InterUSP', 'TUSCA'], 'years': [2023, 2024, 2025, 2026],
                 'sources': {'csv': 'InterUSP_2023_2024_2025_Completo - Todas as Provas.csv (InterUSP 2023–2025)',
                             'pdf': 'Súmulas PDF: TUSCA 2023–2026, InterUSP 2026 (1 PDF por prova + GERAL EQUIPES)'},
                 'validation': {'geral_match': match, 'geral_total': total},
                 'privacy': 'CPFs presentes nas súmulas TUSCA 2026 foram removidos no pré-processamento.'},
        'scoring': SCORING, 'events': events, 'athletes': atletas, 'results': results,
    }
    texto = json.dumps(saida, ensure_ascii=False, separators=(',', ':'))
    assert not CPF.search(texto), 'CPF no JSON de saída'
    a.saida.write_text(texto)
    print(f'{len(events)} provas, {len(results)} resultados, {len(atletas)} atletas; '
          f'totais por equipe conferem em {match}/{total} -> {a.saida}')


if __name__ == '__main__':
    main()
