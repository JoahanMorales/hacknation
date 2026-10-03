# Sourced por scripts/hack; no requiere Python ni jq.
secrets_lint() {
  local mode=${1:---tracked}
  bash "$ROOT/scripts/secret-scan" "$mode" --decisions "$TX/DECISIONS.md"
}
secret_exception_action() {
  local claim until owner wt branch actual hash line
  case "$SECRET_RULE" in SEC_ENV|SEC_PRIVATE_KEY|SEC_CLOUD_ACCESS|SEC_CLOUD_SECRET|SEC_GITHUB|SEC_ANTHROPIC|SEC_OPENAI) ;; *) die "Regla de secreto desconocida.";; esac
  case "$SECRET_PATH" in ''|/*|[A-Za-z]:*|../*|*/../*|*/..|*'|'*|*'\'*|*$'\n'*|*$'\r'*) die "Ruta de excepción inválida.";; esac
  [ -n "$SECRET_REASON" ] || die "secret-exception requiere motivo."
  claim="$TX/claims/$ID.md"
  [ -f "$claim" ] || conflict "$ID no tiene claim para revisar el blob del index."
  until=$(field "$claim" Lease-Until)
  case "$until" in ''|*[!0-9]*) conflict "Lease de la tarea inválido.";; esac
  [ "$until" -gt "$NOW" ] && is_reserved "$(field "$claim" State)" || conflict "Claim de la tarea vencido o inactivo."
  owner=$(field "$claim" Owner)
  [ "$owner" != "$AGENT" ] || conflict "Una excepción requiere revisor distinto del dueño."
  review_identity_eligible "$AGENT" || conflict "Revisor sin claim activo ni rol registrado."
  normalize_paths "$SECRET_PATH" > "$TXROOT/secret-path" || die "Ruta de excepción inválida."
  normalize_paths "$(field "$claim" Paths)" > "$TXROOT/secret-scope" || die "Scope del claim inválido."
  overlaps "$TXROOT/secret-scope" "$TXROOT/secret-path" || conflict "La ruta está fuera del alcance de $ID."
  wt=$(field "$claim" Worktree); branch=$(field "$claim" Branch)
  actual=$(git -C "$wt" symbolic-ref --short HEAD 2>/dev/null) || conflict "Worktree del dueño no accesible."
  [ "$actual" = "$branch" ] || conflict "Worktree del dueño cambió de rama."
  git -C "$wt" show ":$SECRET_PATH" > "$TXROOT/secret-blob" 2>/dev/null || conflict "La ruta no está en el index de $ID."
  hash=$(git -C "$wt" hash-object "$TXROOT/secret-blob") || gitfail "No se puede identificar el blob."
  line="Secret-Exception: $ID|$SECRET_PATH|$SECRET_RULE|$hash|$AGENT|approved|$NOW"
  [ -f "$TX/DECISIONS.md" ] || printf '%s\n' '# Decisiones verificadas' > "$TX/DECISIONS.md"
  if ! grep -Fqx "$line" "$TX/DECISIONS.md"; then
    printf '\n%s\n%s\n' "$line" "Por qué: $(one_line "$SECRET_REASON")" >> "$TX/DECISIONS.md"
  fi
  say "SECRET_EXCEPTION_APPROVED $ID $SECRET_PATH $SECRET_RULE reviewer=$AGENT blob=$hash"
}
