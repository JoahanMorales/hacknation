# Mensajería asíncrona entre agentes en la rama claims; Bash 3.2+.
# Por qué: dos tareas relacionadas necesitan avisarse cambios sin un humano de intermediario,
# y el único canal común a Claude Code, Cursor y Codex en varias máquinas es Git.
# inbox/log.md es append-only: "- N | epoch | de | para | tipo | tarea | texto".
# Destinos: agent:NOMBRE, task:HACK-NNN (llega a quien la tenga reservada, ahora o después), all, human.
MSG_LOG=inbox/log.md
MSG_TO= MSG_KIND=info MSG_TASK= MSG_TEXT= MSG_SENT= MSG_ACK=no MSG_MODE=unread MSG_ACK_UPTO=0
msg_valid_kind() {
  case "$1" in info|request|contract|blocker|reply|review|approve|reject|integrated|human) return 0;; *) return 1;; esac
}
# IDs relacionados con $1 en ambos sentidos: Depende de, Relacionadas y Contratos consumidos.
msg_related() {
  [ -f "$BACKLOG" ] || return 0
  awk -v id="$1" '
    function ids(s,   out) { out=""; while (match(s, /HACK-[0-9][0-9][0-9]+/)) { out=out " " substr(s, RSTART, RLENGTH); s=substr(s, RSTART+RLENGTH) } return out }
    /^## / { cur=($2 ~ /^HACK-[0-9]+$/) ? $2 : ""; next }
    cur != "" {
      s=$0; gsub(/\*\*/, "", s); sub(/^[[:space:]]*-[[:space:]]*/, "", s)
      if (s ~ /^(Depende de|Relacionadas|Contratos consumidos)[[:space:]]*:/) {
        n=split(ids(s), a, " ")
        for (i=1; i<=n; i++) { if (cur==id) rel[a[i]]=1; else if (a[i]==id) rel[cur]=1 }
      }
    }
    END { for (k in rel) if (k != id) print k }' "$BACKLOG" | sort -u
}
msg_append() {
  # $1 para, $2 tipo, $3 tarea, $4 texto
  local n
  mkdir -p "$TX/inbox"
  [ -f "$TX/$MSG_LOG" ] || printf '%s\n' '# Mensajes entre agentes' '' \
    'Append-only; usar bash scripts/hack msg / inbox. Formato: - N | epoch | de | para | tipo | tarea | texto' '' > "$TX/$MSG_LOG"
  n=$(grep -c '^- [0-9]' "$TX/$MSG_LOG" || true); n=$((n + 1))
  printf -- '- %s | %s | %s | %s | %s | %s | %s\n' "$n" "$NOW" "${AGENT:-scheduler}" "$1" "$2" "${3:--}" \
    "$(one_line "$4" | tr '|' '/')" >> "$TX/$MSG_LOG"
  MSG_SENT="${MSG_SENT}${MSG_SENT:+, }#$n→$1"
}
msg_notify_related() {
  # $1 tarea origen, $2 tipo, $3 texto: un mensaje a cada tarea relacionada.
  local r
  for r in $(msg_related "$1"); do msg_append "task:$r" "$2" "$1" "$3"; done
}
msg_owned() {
  local c
  for c in "$TX"/claims/*.md; do
    [ -f "$c" ] || continue
    [ "$(field "$c" Owner)" != "$AGENT" ] || field "$c" ID
  done | tr '\n' ' '
}
msg_last_read() {
  local v
  v=$(field "$TX/inbox/read/$AGENT.md" Last)
  case "$v" in ''|*[!0-9]*) v=0;; esac
  printf '%s' "$v"
}
msg_select() {
  # $1: unread | all | task:HACK-NNN | human
  [ -f "$TX/$MSG_LOG" ] || return 0
  awk -F' [|] ' -v me="$AGENT" -v owned=" $(msg_owned) " -v last="$(msg_last_read)" -v mode="$1" -v now="$NOW" '
    /^- [0-9]/ {
      n=substr($1, 3) + 0; from=$3; to=$4
      if (mode ~ /^task:/) { if (to != mode) next }
      else if (mode == "human") { if (to != "human") next }
      else {
        mine=(to == "agent:" me) || (to == "all" && from != me) || (to ~ /^task:/ && index(owned, " " substr(to, 6) " "))
        if (!mine || (mode == "unread" && n <= last)) next
      }
      age=int((now - $2) / 60)
      printf "#%d · hace %dm · %s → %s · %s · %s\n  %s\n", n, age, from, to, $5, $6, $7
    }' "$TX/$MSG_LOG"
}
msg_resolve_targets() {
  # Expande MSG_TO en destinos canónicos, uno por línea.
  case "$MSG_TO" in
    all|human) printf '%s\n' "$MSG_TO";;
    related:*)
      valid_id "${MSG_TO#related:}" || die "Destino inválido: $MSG_TO"
      msg_related "${MSG_TO#related:}" | sed 's/^/task:/';;
    HACK-*) valid_id "$MSG_TO" || die "ID inválido: $MSG_TO"; printf 'task:%s\n' "$MSG_TO";;
    task:*) valid_id "${MSG_TO#task:}" || die "ID inválido: $MSG_TO"; printf '%s\n' "$MSG_TO";;
    agent:*|*)
      local name=${MSG_TO#agent:}
      case "$name" in ''|*[!A-Za-z0-9_.-]*) die "Destino inválido: use NOMBRE, HACK-NNN, related:HACK-NNN, all o human.";; esac
      [ "$name" != "$AGENT" ] || die "No te envíes mensajes a ti mismo."
      printf 'agent:%s\n' "$name";;
  esac
}
msg_mutate() {
  local targets t
  targets=$(msg_resolve_targets) || exit $?
  [ -n "$targets" ] || die "$MSG_TO no tiene tareas relacionadas en TASKS.md (Depende de / Relacionadas)."
  MSG_SENT=
  for t in $targets; do msg_append "$t" "$MSG_KIND" "$MSG_TASK" "$MSG_TEXT"; done
}
msg_ack_mutate() {
  local current
  current=$(msg_last_read)
  [ "$MSG_ACK_UPTO" -gt "$current" ] || return 0
  mkdir -p "$TX/inbox/read"
  printf 'Agent: %s\nLast: %s\nUpdated: %s\n' "$AGENT" "$MSG_ACK_UPTO" "$NOW" > "$TX/inbox/read/$AGENT.md"
}
msg_inbox_run() {
  local out count
  ATTEMPT=read; fresh_state   # "read" no choca con los try-N de la transacción de --ack
  case "$MSG_MODE" in
    task:*) out=$(msg_select "$MSG_MODE"); say "INBOX ${MSG_MODE#task:} (hilo completo)"; say "${out:-  sin mensajes}"; return 0;;
    human) out=$(msg_select human); say "INBOX humanos"; say "${out:-  sin mensajes}"; return 0;;
  esac
  out=$(msg_select "$MSG_MODE")
  count=$(printf '%s\n' "$out" | grep -c '^#' || true)
  if [ "$MSG_MODE" = peek ]; then
    out=$(msg_select unread); count=$(printf '%s\n' "$out" | grep -c '^#' || true)
    [ "$count" -gt 0 ] || return 0
  fi
  if [ "$count" -eq 0 ]; then say "INBOX $AGENT: sin mensajes nuevos"; return 0; fi
  say "INBOX $AGENT: $count mensaje(s)$([ "$MSG_MODE" = all ] || printf ' sin leer')"
  say "$out"
  if [ "$MSG_MODE" = peek ] || [ "$MSG_ACK" = no ]; then
    say "Atiende request/reject/contract/approve antes de seguir; responde con hack msg NOMBRE --kind reply TEXTO; luego hack inbox --ack."
    return 0
  fi
  MSG_ACK_UPTO=$(printf '%s\n' "$out" | sed -n 's/^#\([0-9][0-9]*\) .*/\1/p' | sort -n | tail -n 1)
  QUIET=yes; transaction; QUIET=no
  say "INBOX_ACK hasta #$MSG_ACK_UPTO"
}
