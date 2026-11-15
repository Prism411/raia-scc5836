#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
RE='[0-9]{3}\.[0-9]{3}\.[0-9]{3}-[0-9]{2}|CPF[^A-Za-z]{0,6}[0-9]{11}'
if [ $# -gt 0 ]; then
  achados=$(grep -rIlE "$RE" "$1" --exclude-dir=node_modules --exclude-dir=vendor 2>/dev/null || true)
else
  achados=$(git ls-files -z | grep -zv -e '^web/vendor/' -e 'package-lock.json$' | xargs -0 grep -IlE "$RE" 2>/dev/null || true)
fi
if [ -n "$achados" ]; then
  echo "CPF encontrado em:"; echo "$achados"; exit 1
fi
echo "checar-cpf: nenhum CPF encontrado"
