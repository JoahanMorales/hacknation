# Adaptador compilado desde el comando explícito del usuario; Bash 3.2+.
init_smoke() {
  local adapter provenance hash command_hash result
  [ -n "${SMOKE_COMMAND:-}" ] || die "init-smoke requiere --command con la validación real del producto."
  mkdir -p "$ROOT/scripts" || return 2
  adapter="$ROOT/scripts/smoke-project"
  provenance="$ROOT/scripts/.smoke-project.provenance"
  if [ -e "$adapter" ] && ! grep -Fqx '# HACK_PRODUCT_ADAPTER: generated-v2.1' "$adapter"; then
    die "scripts/smoke-project manual ya existe; revíselo y retire el archivo para regenerar."
  fi
  printf '%s\n' '#!/usr/bin/env bash' '# HACK_PRODUCT_ADAPTER: generated-v2.1' 'set -u' 'set -o pipefail' > "$adapter" || return 2
  printf '%s\n' 'root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)' 'cd "$root" || exit 2' >> "$adapter"
  printf 'exec bash -c %q\n' "$SMOKE_COMMAND" >> "$adapter"
  chmod +x "$adapter" || return 2
  hash=$(git -C "$ROOT" hash-object "$adapter") || return 2
  command_hash=$(printf '%s' "$SMOKE_COMMAND" | git -C "$ROOT" hash-object --stdin) || return 2
  printf 'Adapter-Blob: %s\nCommand-Blob: %s\nGenerated-By: %s\nCreated-At: %s\nProduct-Result: UNVERIFIED\n' "$hash" "$command_hash" "${AGENT:-user-command}" "${NOW:-$(date +%s)}" > "$provenance"
  bash "$adapter"
  result=$?
  if [ "$result" -ne 0 ]; then
    printf 'PRODUCT_UNVERIFIED: comando suministrado terminó con salida %s.\n' "$result" >&2
    return "$result"
  fi
  printf 'Adapter-Blob: %s\nCommand-Blob: %s\nGenerated-By: %s\nCreated-At: %s\nProduct-Result: PASS\n' "$hash" "$command_hash" "${AGENT:-user-command}" "${NOW:-$(date +%s)}" > "$provenance"
  printf '%s\n' 'SMOKE_ADAPTER_CREATED: comando suministrado ejecutado con salida 0; el gate lo ejecutará otra vez.'
}
product_gate() {
  local adapter provenance expected actual result
  adapter="$ROOT/scripts/smoke-project"
  provenance="$ROOT/scripts/.smoke-project.provenance"
  if [ ! -f "$adapter" ]; then
    printf '%s\n' 'PRODUCT_UNVERIFIED: falta scripts/smoke-project; salida 2.' >&2; return 2
  fi
  if ! grep -Fqx '# HACK_PRODUCT_ADAPTER: generated-v2.1' "$adapter" || [ ! -f "$provenance" ]; then
    printf '%s\n' 'PRODUCT_UNVERIFIED: adaptador sin procedencia de init-smoke; salida 2.' >&2; return 2
  fi
  expected=$(sed -n 's/^Adapter-Blob: //p' "$provenance" | head -n 1)
  actual=$(git -C "$ROOT" hash-object "$adapter" 2>/dev/null) || return 2
  if [ -z "$expected" ] || [ "$expected" != "$actual" ] || ! grep -Fqx 'Product-Result: PASS' "$provenance"; then
    printf '%s\n' 'PRODUCT_UNVERIFIED: adaptador modificado o comando inicial sin validar; salida 2.' >&2; return 2
  fi
  bash "$adapter"
  result=$?
  if [ "$result" -ne 0 ]; then printf 'PRODUCT_FAIL: adapter exit=%s\n' "$result" >&2; return "$result"; fi
  printf '%s\n' 'PRODUCT_PASS: adaptador vigente ejecutado con salida 0.'
}
if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd) || exit 2
  case "${1:-}" in gate) product_gate; exit "$?";; *) printf '%s\n' 'Uso interno: smoke-init.sh gate' >&2; exit 2;; esac
fi
