#!/usr/bin/env bash
# Descarga los crudos de HPO (v2026-09-01) a data/raw/ (ignorado por Git). Uso: bash data/fetch.sh
# Por qué: el build es reproducible desde una versión fija; los crudos (~35 MB) no van al repo.
set -euo pipefail
version=${HPO_VERSION:-v2026-09-01}
raw="$(cd "$(dirname "$0")" && pwd)/raw"
base="https://github.com/obophenotype/human-phenotype-ontology/releases/download/$version"
mkdir -p "$raw"
for file in hp.json phenotype.hpoa; do
  if [ -s "$raw/$file" ]; then
    printf 'SKIP %s (ya existe)\n' "$file"
    continue
  fi
  curl -fsSL --retry 3 -o "$raw/$file.tmp" "$base/$file"
  mv "$raw/$file.tmp" "$raw/$file"
  printf 'OK %s %s bytes\n' "$file" "$(wc -c < "$raw/$file" | tr -d ' ')"
done
printf '%s\n' "$version" > "$raw/VERSION"
