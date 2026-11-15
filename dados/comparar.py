#!/usr/bin/env python3
import json
import sys
from collections import Counter


def carregar(p):
    d = json.load(open(p))
    ev = {(e['c'], e['y'], e['cd'], e['s']): (i, e) for i, e in enumerate(d['events'])}
    res = {}
    for r in d['results']:
        e = d['events'][r['e']]
        res.setdefault((e['c'], e['y'], e['cd'], e['s']), []).append(r)
    return d, ev, res


def linha(r, ath):
    nome = ath[r['a']]['n'] if 'a' in r else r.get('n', '')
    return (r.get('p'), r['t'], r.get('tm'), r['pt'], r.get('st'), r.get('k'), r.get('q'), nome)


def main(novo, ref):
    dn, en, rn = carregar(novo)
    dr, er, rr = carregar(ref)
    an, ar = dn['athletes'], dr['athletes']
    print(f"provas {len(dn['events'])} x {len(dr['events'])} · resultados {len(dn['results'])} x {len(dr['results'])} · atletas {len(an)} x {len(ar)}")
    so_n, so_r = set(en) - set(er), set(er) - set(en)
    if so_n: print('provas só no novo:', sorted(so_n))
    if so_r: print('provas só na referência:', sorted(so_r))
    difs = Counter()
    exemplos = []
    for k in sorted(set(en) & set(er)):
        e1, e2 = en[k][1], er[k][1]
        for c in ['d', 'k', 'r', 'dm', 'rec', 'nr', 'win', 'n']:
            if e1[c] != e2[c]:
                difs['prova.' + c] += 1
                if len(exemplos) < 40: exemplos.append((k, c, e1[c], e2[c]))
        a = [linha(r, an) for r in rn.get(k, [])]
        b = [linha(r, ar) for r in rr.get(k, [])]
        for x, y in zip(a, b):
            for j, c in enumerate(['p', 't', 'tm', 'pt', 'st', 'k', 'q', 'nome']):
                if x[j] != y[j]:
                    difs['res.' + c] += 1
                    if len(exemplos) < 40 and c != 'nome': exemplos.append((k, c, x, y))
        if len(a) != len(b):
            difs['res.contagem'] += 1
            if len(exemplos) < 40: exemplos.append((k, 'n', len(a), len(b)))
    print('diferenças:', dict(difs) or 'nenhuma')
    for x in exemplos: print('  ', x)
    v1, v2 = dn['meta']['validation'], dr['meta']['validation']
    print(f"validação contra as súmulas gerais: {v1['geral_match']}/{v1['geral_total']} x {v2['geral_match']}/{v2['geral_total']}")


if __name__ == '__main__':
    main(*sys.argv[1:3])
