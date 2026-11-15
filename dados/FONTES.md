# Fontes e construção do conjunto de dados

## De onde vêm os dados

Todos os resultados vêm das páginas públicas de resultados do **EBAN Swim**, que publica as súmulas
oficiais das duas competições:

| Competição | Página | Formato baixado |
|---|---|---|
| InterUSP 2023 | https://ebanswim.com.br/interusp-2023/ | resultados por prova, compilados na planilha |
| InterUSP 2024 | https://ebanswim.com.br/interusp-2024/ | idem |
| InterUSP 2025 | https://ebanswim.com.br/interusp-2025/ | idem |
| InterUSP 2026 | https://ebanswim.com.br/interusp-2026/ | 16 súmulas em PDF + classificação geral |
| TUSCA 2023 | https://ebanswim.com.br/tusca-2023/ | 20 súmulas em PDF + classificação geral |
| TUSCA 2024 | https://ebanswim.com.br/tusca-2024/ | idem |
| TUSCA 2025 | https://ebanswim.com.br/tusca-2025-2/ | idem |
| TUSCA 2026 | https://ebanswim.com.br/tusca-central-2026/ | idem |

As súmulas foram baixadas à mão das páginas acima. Os resultados do InterUSP 2023–2025 foram
passados para uma planilha (`InterUSP_2023_2024_2025_Jader.xlsx`), exportada como
`InterUSP_2023_2024_2025_Completo - Todas as Provas.csv`. Os arquivos brutos ficam em `dados/brutos/`,
**fora do Git e fora de qualquer pacote**, porque as súmulas do TUSCA 2026 trazem o CPF dos atletas.

## Como o `web/data/natacao.json` é construído

```bash
python3 dados/construir.py                     # lê dados/brutos/ e grava web/data/natacao.json
python3 dados/comparar.py novo.json antigo.json  # compara duas versões do conjunto
```

Precisa de Python 3 e do `pdftotext` (pacote `poppler-utils`). As etapas de `construir.py`:

1. **Extração.** Lê o CSV seção por seção (uma por edição do InterUSP) e cada súmula em PDF com
   `pdftotext -layout`, reconhecendo a prova pelo título (distância, estilo, sexo, revezamento e
   provas de demonstração) e cada linha de resultado (colocação, nome, equipe, tempo e pontos).
2. **Codificação.** Corrige acentos quebrados ("JO√O"), caracteres invisíveis e letras cirílicas que
   aparecem no lugar das latinas em algumas súmulas.
3. **Privacidade.** Remove os CPFs logo depois da extração, antes de qualquer outra etapa. O script
   falha se sobrar algum CPF na saída, e `scripts/checar-cpf.sh` confere o repositório inteiro.
4. **Normalização.** Unifica as grafias das equipes (MED.PINHEIROS, MEDICINA PINHEIROS e PINHEIROS
   viram MED PINHEIROS; AAARL e RIBEIRÃO viram MED RIBEIRÃO; LEU Unicamp vira LEU), converte os
   tempos para segundos ("1.02.45" → 62,45) e separa a categoria oficial ou extra.
5. **Entidades.** Liga o mesmo atleta entre edições e competições: mesmo sexo e primeiro nome e, na
   mesma equipe, último nome a no máximo uma edição de distância ou um nome contido no outro.
6. **Variáveis da prova.** Vencedor, número de nadadores com tempo, recorde vigente e novo recorde.
7. **Validação.** Soma os pontos de cada equipe e compara com a classificação geral das súmulas.

O Índice Técnico, as fases da prova e as braçadas estimadas são calculados na interface
(`web/js/core.js` e `web/js/bio.js`) a partir desse JSON.

## Correções feitas sobre as súmulas

- **Colocações digitadas erradas.** No 400 m livre feminino do TUSCA 2024 a súmula lista "7º" e "2º"
  depois do 3º, e no 50 m peito masculino do TUSCA 2026 um ordinal veio vazio. Como as súmulas estão
  em ordem de tempo, a colocação é refeita por essa ordem.
- **Linha colada.** Uma linha do 50 m livre feminino do TUSCA 2026 tem CPF, equipe e tempo sem espaço
  entre eles; ela é lida normalmente (e o CPF, removido).
- **Arquivos repetidos.** Súmulas baixadas duas vezes ("(1).pdf") entram uma vez só.

## Conferência

| | |
|---|---|
| Provas (finais) | 142 |
| Resultados | 1.816 |
| Atletas únicos | 504 |
| Equipes | 19 |
| Totais por equipe que conferem com a classificação geral | 65 de 71 |

As diferenças nos totais vêm de critérios de desempate e de pontos de recorde que a classificação
geral soma de forma diferente da tabela de pontuação.
