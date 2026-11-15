#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
V=web/vendor
mkdir -p "$V/fonts"

baixar() { curl -fsSL --retry 3 -o "$2" "$1"; }

baixar https://unpkg.com/react@18.3.1/umd/react.production.min.js "$V/react.production.min.js"
baixar https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js "$V/react-dom.production.min.js"
sri() { echo "sha384-$(openssl dgst -sha384 -binary "$1" | openssl base64 -A)"; }
[ "$(sri $V/react.production.min.js)" = "sha384-DGyLxAyjq0f9SPpVevD6IgztCFlnMF6oW/XQGmfe+IsZ8TqEiDrcHkMLKI6fiB/Z" ]
[ "$(sri $V/react-dom.production.min.js)" = "sha384-gTGxhz21lVGYNMcdJOyq01Edg0jhn/c22nsx0kyqP0TxaV5WVdsSH1fSDUf5YJj1" ]

baixar https://unpkg.com/three@0.184.0/build/three.module.js "$V/three.module.js"
baixar https://unpkg.com/three@0.184.0/build/three.core.js "$V/three.core.js"

mkdir -p .tmp && echo "export * from 'd3';" > .tmp/d3-entry.mjs
npx esbuild .tmp/d3-entry.mjs --bundle --format=esm --minify --log-level=warning \
  --outfile="$V/d3.esm.js"
rm -f .tmp/d3-entry.mjs

UA='Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36'
CSS_URL='https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600;700&family=Big+Shoulders+Display:wght@600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&display=swap'
curl -fsSL -A "$UA" "$CSS_URL" -o /tmp/raia-fonts.css
rm -f "$V"/fonts/*.woff2
grep -o 'https://fonts.gstatic.com/[^)]*' /tmp/raia-fonts.css | sort -u | while read -r u; do
  baixar "$u" "$V/fonts/$(echo "$u" | sed 's#https://fonts.gstatic.com/##; s#/#_#g')"
done
sed -E 's#https://fonts.gstatic.com/([^)]*)#\1#; s#url\(([^)]*)\)#url(fonts/\1)#' /tmp/raia-fonts.css \
  | awk '{ if ($0 ~ /url\(fonts\//) { match($0, /url\(fonts\/[^)]*\)/); p=substr($0, RSTART+10, RLENGTH-11); gsub("/", "_", p); sub(/url\(fonts\/[^)]*\)/, "url(fonts/" p ")"); } print }' \
  > "$V/fonts.css"
rm -f /tmp/raia-fonts.css
echo "vendor ok: $(ls $V | wc -l) itens, $(ls $V/fonts | wc -l) fontes"
