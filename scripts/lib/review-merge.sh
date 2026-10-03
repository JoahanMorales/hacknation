#!/usr/bin/env bash
# Biblioteca Bash 3.2: revisión por SHA y cola con publicación atómica.
# Por qué: un nombre declarado nunca acredita una aprobación independiente.
RM_REASON= APPROVED_BY= RM_TIP= RM_ELIGIBLE_VIA= RM_PROOF=
RM_COUNTER=0 RM_HELD=no RM_FINISHED=no RM_TOKEN= RM_BUILD= RM_CANDIDATE= RM_BASE_TIP= RM_REVIEWED_TIP=
RM_ACTION= RM_QUEUE_REASON= RM_TREE= RM_REVIEW_MODE= RM_GH_MERGED= RM_GH_MERGE=

rm_config() {
  if typeset -f coord_config >/dev/null 2>&1; then coord_config "$1" "$2";
  elif [ -f "$TX/meta/config.md" ]; then
    v=$(field "$TX/meta/config.md" "$1"); printf '%s\n' "${v:-$2}"
  else printf '%s\n' "$2"; fi
}
registered_reviewer() {
  case "$1" in ''|*[!A-Za-z0-9_.-]*) return 1;; esac
  [ -f "$TX/roles/reviewers/$1.md" ] &&
    [ "$(field "$TX/roles/reviewers/$1.md" Reviewer)" = "$1" ] &&
    [ -n "$(field "$TX/roles/reviewers/$1.md" Registered-By)" ]
}
review_identity_eligible() {
  local who=${1:-$AGENT} c until state
  RM_ELIGIBLE_VIA=
  if registered_reviewer "$who"; then RM_ELIGIBLE_VIA="role:$who"; return 0; fi
  for c in "$TX"/claims/*.md; do
    [ -f "$c" ] || continue
    [ "$(field "$c" Owner)" = "$who" ] || continue
    until=$(field "$c" Lease-Until); state=$(field "$c" State)
    case "$until" in ''|*[!0-9]*) continue;; esac
    case "$state" in CLAIMED|BLOCKED|REVIEW) ;; *) continue;; esac
    if [ "$NOW" -lt "$until" ]; then RM_ELIGIBLE_VIA="claim:$(field "$c" ID):$until"; return 0; fi
  done
  return 1
}
register_reviewer_mutate() {
  local who=${REGISTER_REVIEWER:-$ID}
  [ -n "$HUMAN" ] || conflict "register-reviewer necesita HACK_HUMAN."
  case "$who" in ''|*[!A-Za-z0-9_.-]*) die "Identidad de revisor inválida.";; esac
  [ "$who" != "$AGENT" ] && [ "$who" != "$HUMAN" ] || conflict "El registrador no puede asignarse su propio rol."
  mkdir -p "$TX/roles/reviewers"
  RECORD="$TX/roles/reviewers/$who.md"
  printf '%s\n' "Reviewer: $who" 'State: REGISTERED' "Registered-By: $HUMAN" "Registered: $NOW" > "$RECORD"
}
resolve_task_tip() {
  local branch worktree
  branch=$(field "$RECORD" Branch); worktree=$(field "$RECORD" Worktree)
  git check-ref-format "refs/heads/$branch" >/dev/null 2>&1 || { RM_REASON='Rama de tarea inválida'; return 1; }
  if git -C "$TX" ls-remote --exit-code --heads origin "$branch" >/dev/null 2>&1; then
    git -C "$TX" fetch -q origin "refs/heads/$branch:refs/hack/task" || { RM_REASON='No se pudo leer la rama remota de tarea'; return 1; }
    RM_TIP=$(git -C "$TX" rev-parse refs/hack/task) || return 1
    # Un HEAD local nuevo también invalida la revisión; publicar primero elimina ambigüedad.
    if [ -d "$worktree" ] && [ "$(git -C "$worktree" symbolic-ref --short HEAD 2>/dev/null)" = "$branch" ]; then
      [ "$(git -C "$worktree" rev-parse HEAD 2>/dev/null)" = "$RM_TIP" ] || {
        RM_REASON='HEAD local y remoto difieren; publique la rama antes de revisar/integrar'; return 1;
      }
    fi
  elif [ -d "$worktree" ] && [ "$(git -C "$worktree" symbolic-ref --short HEAD 2>/dev/null)" = "$branch" ]; then
    RM_TIP=$(git -C "$worktree" rev-parse HEAD) || return 1
    git -C "$TX" fetch -q "$worktree" "$RM_TIP" || { RM_REASON='No se pudo leer HEAD de la tarea'; return 1; }
  else
    RM_TIP=$(field "$RECORD" Task-Tip)
    [ -n "$RM_TIP" ] || { RM_REASON='Falta HEAD o Task-Tip verificable'; return 1; }
    git -C "$TX" cat-file -e "$RM_TIP^{commit}" 2>/dev/null ||
      git -C "$TX" fetch -q origin "$RM_TIP" || { RM_REASON='Task-Tip no disponible'; return 1; }
  fi
}
review_mutate() {
  RECORD=$(task_file)
  [ -f "$RECORD" ] || conflict "$ID no tiene tarea reservada."
  [ "$AGENT" != "$(field "$RECORD" Owner)" ] || conflict "La persona dueña no puede aprobarse."
  review_identity_eligible "$AGENT" || conflict "El revisor necesita claim propio activo o rol registrado."
  resolve_task_tip || conflict "$RM_REASON"
  [ "$REVIEW_SHA" = "$RM_TIP" ] || conflict "La revisión debe coincidir con el HEAD actual de la tarea."
  case "$REVIEW_VERDICT" in approve|reject) ;; *) die "--verdict debe ser approve o reject.";; esac
  mkdir -p "$TX/reviews"
  printf '%s\n' "ID: $ID" "SHA: $RM_TIP" "Reviewer: $AGENT" "Owner: $(field "$RECORD" Owner)" \
    "Verdict: $REVIEW_VERDICT" "Reviewed: $NOW" "Eligible-Via: $RM_ELIGIBLE_VIA" 'Command: hack review' > "$TX/reviews/$ID.md"
  put "$RECORD" Task-Tip "$RM_TIP"
  WL=$(field "$RECORD" Worklog); STATE=$(field "$RECORD" State)
  event "review; $REVIEW_VERDICT; SHA $RM_TIP; revisor $AGENT"
  if [ "$REVIEW_VERDICT" = approve ]; then
    msg_append "task:$ID" approve "$ID" "Aprobado SHA $RM_TIP por $AGENT. Siguiente: bash scripts/hack merge $ID"
  else
    msg_append "task:$ID" reject "$ID" "Rechazado SHA $RM_TIP por $AGENT. Lee hack inbox --task $ID y los comentarios del PR; corrige y repite /hack-ship"
  fi
}
approval_check() {
  local tip=$1 pr=${2:-} mode review who author meta gh_tip gh_author gh_base gh_branch gh_repo gh_state gh_merged gh_merge remote_repo
  APPROVED_BY= RM_REASON=
  RM_GH_MERGED= RM_GH_MERGE=
  mode=${HACK_REVIEW_MODE:-$(rm_config Review-Mode auto)}
  if [ "$mode" = auto ]; then
    case "$pr" in https://github.com/*/pull/*)
      if command -v gh >/dev/null 2>&1; then mode=gh; else mode=claims; fi;;
      *) mode=claims;;
    esac
  fi
  RM_REVIEW_MODE=$mode
  case "$mode" in
    claims)
      review="$TX/reviews/$ID.md"; author=$(field "$RECORD" Owner)
      [ -f "$review" ] || { RM_REASON='Falta aprobación verificable en claims'; return 1; }
      who=$(field "$review" Reviewer)
      case "$who" in ''|*[!A-Za-z0-9_.-]*) RM_REASON='Identidad de aprobación inválida'; return 1;; esac
      [ "$(field "$review" Verdict)" = approve ] && [ "$(field "$review" SHA)" = "$tip" ] &&
        [ "$(field "$review" Owner)" = "$author" ] && [ "$who" != "$author" ] &&
        [ "$(field "$review" Command)" = 'hack review' ] && [ -n "$(field "$review" Eligible-Via)" ] || {
        RM_REASON='Aprobación ausente, rechazada, propia u obsoleta para el SHA actual'; return 1;
      }
      APPROVED_BY=$who;;
    gh)
      command -v gh >/dev/null 2>&1 || { RM_REASON='Review-Mode gh requiere gh disponible'; return 1; }
      printf '%s\n' "$pr" | grep -Eq '^https://github\.com/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/pull/[1-9][0-9]*$' || {
        RM_REASON='Modo gh requiere URL exacta de PR en github.com'; return 1;
      }
      gh_repo=$(printf '%s\n' "$pr" | sed 's@^https://github.com/@@;s@/pull/.*@@')
      remote_repo=$(printf '%s\n' "$REMOTE_URL" | sed 's@^git\@github.com:@@;s@^https://github.com/@@;s@\.git$@@')
      [ "$(printf '%s' "$remote_repo" | tr '[:upper:]' '[:lower:]')" = "$(printf '%s' "$gh_repo" | tr '[:upper:]' '[:lower:]')" ] || {
        RM_REASON='El PR no pertenece al remoto configurado'; return 1;
      }
      RM_GH_ENDPOINT="repos/$gh_repo/pulls/${pr##*/}"
      meta=$(gh api "$RM_GH_ENDPOINT" --template '{{.head.sha}}|{{.user.login}}|{{.base.ref}}|{{.head.ref}}|{{.head.repo.full_name}}|{{.state}}|{{.merged}}|{{.merge_commit_sha}}' 2>/dev/null) || {
        RM_REASON='API de GitHub no pudo verificar el PR'; return 1;
      }
      IFS='|' read -r gh_tip gh_author gh_base gh_branch gh_repo gh_state gh_merged gh_merge <<< "$meta"
      RM_GH_MERGED=$gh_merged; RM_GH_MERGE=$gh_merge
      [ "$gh_tip" = "$tip" ] && [ "$gh_base" = "$BASE" ] && [ "$gh_branch" = "$(field "$RECORD" Branch)" ] || {
        RM_REASON='SHA/rama/base del PR no coincide con la tarea'; return 1;
      }
      gh api "$RM_GH_ENDPOINT/reviews" --paginate --template '{{range .}}{{.user.login}}|{{.state}}|{{.commit_id}}{{"\n"}}{{end}}' > "$TXROOT/gh-reviews" 2>/dev/null || {
        RM_REASON='API de GitHub no pudo verificar las revisiones'; return 1;
      }
      APPROVED_BY=$(awk -F'|' -v tip="$tip" -v author="$gh_author" '
        $2=="APPROVED" || $2=="CHANGES_REQUESTED" || $2=="DISMISSED" {k=tolower($1); state[k]=$2; sha[k]=$3; name[k]=$1}
        END {
          for(k in state) if(k!=tolower(author) && state[k]=="CHANGES_REQUESTED" && sha[k]==tip) exit;
          for(k in state) if(k!=tolower(author) && state[k]=="APPROVED" && sha[k]==tip) {print name[k]; exit}
        }' "$TXROOT/gh-reviews")
      [ -n "$APPROVED_BY" ] || { RM_REASON='GitHub no acredita aprobación independiente vigente sobre el SHA actual'; return 1; };;
    *) RM_REASON='Review-Mode inválido'; return 1;;
  esac
  return 0
}
integrated_check() {
  local tip=$1 merged=$2 task_base parent expected actual path entry mode type blob changed=no
  RM_PROOF= RM_REASON=
  task_base=$(field "$RECORD" Task-Base)
  if [ "$RM_REVIEW_MODE" = gh ]; then
    [ "$RM_GH_MERGED" = true ] && [ "$RM_GH_MERGE" = "$merged" ] || {
      RM_REASON='GitHub no acredita este COMMIT como resultado de un PR fusionado'; return 1;
    }
  fi
  [ -n "$task_base" ] && [ "$tip" != "$task_base" ] || { RM_REASON='TIP coincide con base; falta implementación'; return 1; }
  git -C "$TX" diff --quiet "$task_base" "$tip" && { RM_REASON='La tarea no tiene diff contra su base'; return 1; }
  git -C "$TX" merge-base --is-ancestor "$merged" refs/hack/base || { RM_REASON='COMMIT no integrado en la base remota'; return 1; }
  if git -C "$TX" merge-base --is-ancestor "$tip" "$merged"; then RM_PROOF=ancestry; return 0; fi
  parent=$(git -C "$TX" rev-parse "$merged^" 2>/dev/null) || { RM_REASON='No hay padre para reconstruir squash/rebase'; return 1; }
  git -C "$TX" diff --no-renames --name-only -z "$task_base" "$tip" > "$TXROOT/proof-task-paths" || return 1
  git -C "$TX" diff --no-renames --name-only -z "$parent" "$merged" > "$TXROOT/proof-result-paths" || return 1
  # Overlay completo del contenido revisado sobre el padre real. Dos pasadas
  # manejan correctamente borrados, modos y sustituciones archivo/directorio.
  GIT_INDEX_FILE="$TXROOT/proof-index-$ATTEMPT" git -C "$TX" read-tree "$parent" || return 1
  while IFS= read -r -d '' path; do
    GIT_INDEX_FILE="$TXROOT/proof-index-$ATTEMPT" git -C "$TX" update-index --force-remove -- "$path" || return 1
    while IFS= read -r -d '' entry; do [ "$entry" != "$path" ] || changed=yes; done < "$TXROOT/proof-result-paths"
  done < "$TXROOT/proof-task-paths"
  [ "$changed" = yes ] || { RM_REASON='El commit resultante no cambia ningún archivo de la tarea'; return 1; }
  while IFS= read -r -d '' path; do
    git -C "$TX" ls-tree -z "$tip" -- "$path" > "$TXROOT/proof-entry"
    while IFS=$'\t' read -r -d '' entry ignored_path; do
      IFS=' ' read -r mode type blob <<< "$entry"
      [ "$type" != tree ] || continue
      GIT_INDEX_FILE="$TXROOT/proof-index-$ATTEMPT" git -C "$TX" update-index --add --cacheinfo "$mode" "$blob" "$path" || return 1
    done < "$TXROOT/proof-entry"
  done < "$TXROOT/proof-task-paths"
  expected=$(GIT_INDEX_FILE="$TXROOT/proof-index-$ATTEMPT" git -C "$TX" write-tree) || return 1
  actual=$(git -C "$TX" rev-parse "$merged^{tree}") || return 1
  [ "$expected" = "$actual" ] || { RM_REASON='El tree hash resultante no acredita el contenido revisado'; return 1; }
  # Una fusión que descartó cambios por estar ya en el padre no acredita esta tarea.
  git -C "$TX" diff --quiet "$parent" "$merged" && { RM_REASON='El resultado de integración no contiene cambios'; return 1; }
  RM_PROOF="tree:$actual"
}
merge_tick_lock() {
  local lock="$TX/queue/merge-lock.md" until token task
  [ -f "$lock" ] || return 0
  until=$(field "$lock" Lease-Until); token=$(field "$lock" Token); task=$(field "$lock" Task)
  case "$until" in ''|*[!0-9]*) return 0;; esac
  [ "$NOW" -ge "$until" ] || return 0
  if typeset -f coord_receipt >/dev/null 2>&1; then
    coord_receipt queue-lock "$token" "$until" HUMAN 'Lease de lock vencido; revalidar antes de integrar' || true
  fi
  if [ -f "$TX/queue/$task.md" ]; then
    put "$TX/queue/$task.md" State HUMAN; put "$TX/queue/$task.md" Reason 'Lease de lock vencido; revalidar antes de integrar'
  fi
  rm -f "$lock"
}
rm_lock_owned() {
  [ -f "$TX/queue/merge-lock.md" ] && [ "$(field "$TX/queue/merge-lock.md" Token)" = "$RM_TOKEN" ]
}
rm_authority_check() {
  local freeze
  [ "$(rm_config Autonomy no)" = yes ] || { RM_REASON='Autonomía revocada o sin autorización explícita'; return 1; }
  [ "$(rm_config Auto-Merge no)" = yes ] || { RM_REASON='Autofusión sin autorización explícita'; return 1; }
  freeze=$(rm_config Freeze-Epoch 0)
  if [ "$freeze" -gt 0 ] && [ "$NOW" -ge "$freeze" ]; then
    typeset -f coord_remote_task_field >/dev/null 2>&1 &&
      [ "$(coord_remote_task_field Freeze-Allowed)" = yes ] || {
      RM_REASON='FREEZE: integrar sólo fixes de demo autorizados en TASKS remoto'; return 1;
    }
  fi
  return 0
}
rm_coord_mutate() {
  local lock="$TX/queue/merge-lock.md" until current_base
  RECORD=$(task_file); CLAIM=$(claim_file); mkdir -p "$TX/queue"
  case "$RM_ACTION" in
    enqueue|lock|finalize)
      [ -f "$RECORD" ] && [ -f "$CLAIM" ] || { RM_REASON='Tarea sin claim; no se puede fusionar'; return 3; }
      [ "$(field "$RECORD" Owner)" = "$AGENT" ] || { RM_REASON='Solo el dueño puede encolar su tarea'; return 3; }
      [ "$(field "$RECORD" State)" = REVIEW ] || { RM_REASON='Registre primero done para entrar en REVIEW'; return 3; }
      until=$(field "$CLAIM" Lease-Until)
      case "$until" in ''|*[!0-9]*) RM_REASON='Lease de claim inválido'; return 3;; esac
      [ "$NOW" -lt "$until" ] || { RM_REASON='Claim vencido; recuperar antes de fusionar'; return 3; };;
  esac
  case "$RM_ACTION" in
    enqueue)
      printf '%s\n' "ID: $ID" 'State: WAITING' "Owner: $AGENT" "Queued: $NOW" 'Reason: Esperando cola' > "$TX/queue/$ID.md";;
    lock)
      merge_tick_lock
      if [ -f "$lock" ] && ! rm_lock_owned; then RM_REASON='Cola ocupada'; return 4; fi
      printf '%s\n' "Owner: $AGENT" "Task: $ID" "Token: $RM_TOKEN" "Lease-Until: $((NOW + RM_LOCK_LEASE))" "Updated: $NOW" > "$lock"
      put "$TX/queue/$ID.md" State MERGING;;
    human)
      printf '%s\n' "ID: $ID" 'State: HUMAN' "Owner: $AGENT" "Updated: $NOW" "Reason: $(one_line "$RM_QUEUE_REASON")" > "$TX/queue/$ID.md"
      if [ -f "$RECORD" ]; then
        put "$RECORD" Next "Humano: $(one_line "$RM_QUEUE_REASON")"
        [ ! -f "$CLAIM" ] || put "$CLAIM" Next "Humano: $(one_line "$RM_QUEUE_REASON")"
        WL=$(field "$RECORD" Worklog); STATE=$(field "$RECORD" State)
        [ ! -f "$TX/$WL" ] || { update_summary_field Siguiente "Humano: $RM_QUEUE_REASON"; event "merge rechazado; $RM_QUEUE_REASON"; }
      fi
      msg_append human human "$ID" "Merge de $ID en cola humana: $RM_QUEUE_REASON"
      rm_lock_owned && rm -f "$lock";;
    unlock)
      if rm_lock_owned; then rm -f "$lock"; else return 6; fi;;
    finalize)
      rm_authority_check || return 3
      rm_lock_owned || { RM_REASON='Lock perdido; candidato cancelado'; return 3; }
      until=$(field "$lock" Lease-Until)
      [ "$NOW" -lt "$until" ] || { RM_REASON='Lock vencido; candidato cancelado'; return 3; }
      git -C "$TX" fetch -q origin "refs/heads/$BASE:refs/hack/base" || { RM_REASON='No se pudo revalidar base'; return 3; }
      current_base=$(git -C "$TX" rev-parse refs/hack/base)
      [ "$current_base" = "$RM_BASE_TIP" ] || { RM_REASON='Base avanzó; vuelva a validar candidato'; return 3; }
      resolve_task_tip || return 3
      [ "$RM_TIP" = "$RM_REVIEWED_TIP" ] || { RM_REASON='SHA de tarea cambió durante validación'; return 3; }
      approval_check "$RM_TIP" "$(field "$RECORD" PR)" || return 3
      git -C "$TX" fetch -q "$RM_BUILD" "$RM_CANDIDATE:refs/hack/candidate" || { RM_REASON='Candidato no disponible'; return 3; }
      STATE=INTEGRATED; WL=$(field "$RECORD" Worklog)
      put "$RECORD" State INTEGRATED; put "$RECORD" Merge-Commit "$RM_CANDIDATE"; put "$RECORD" Reviewer "$APPROVED_BY"
      put "$RECORD" Task-Tip "$RM_REVIEWED_TIP"; put "$RECORD" Integration-Proof ancestry
      put "$RECORD" Lease-Until 0; put "$RECORD" Updated "$NOW"; put "$RECORD" Next "Integrada en $BASE: $RM_CANDIDATE"
      update_summary_field Siguiente "Integrada en $BASE: $RM_CANDIDATE"; event "merge; smoke y Verify PASS; commit $RM_CANDIDATE; revisor $APPROVED_BY"
      rm -f "$CLAIM" "$lock"; put "$TX/queue/$ID.md" State INTEGRATED; put "$TX/queue/$ID.md" Commit "$RM_CANDIDATE"
      msg_notify_related "$ID" integrated "$ID integrado en $BASE ($RM_CANDIDATE). Si dependes de él: git fetch origin && git rebase origin/$BASE";;
  esac
  return 0
}
rm_coord_update() {
  local rc attempts=0
  RM_ACTION=$1
  while [ "$attempts" -lt 80 ]; do
    attempts=$((attempts + 1)); RM_COUNTER=$((RM_COUNTER + 1)); ATTEMPT="merge-$RM_COUNTER"
    fresh_state
    if typeset -f coord_init >/dev/null 2>&1; then coord_init; fi
    rm_coord_mutate; rc=$?
    [ "$rc" -ne 6 ] || return 0
    [ "$rc" -eq 0 ] || return "$rc"
    snapshot
    git -C "$TX" add -A || { RM_REASON='No se pudo preparar transacción de cola'; return 3; }
    git -C "$TX" diff --cached --quiet && return 0
    git -C "$TX" commit -q -m "hack: merge $ID $RM_ACTION ($AGENT)" || { RM_REASON='Commit de cola falló'; return 3; }
    if [ "$RM_ACTION" = finalize ]; then
      git -C "$TX" push --atomic --porcelain origin HEAD:refs/heads/claims refs/hack/candidate:refs/heads/"$BASE" > "$TXROOT/merge-push" 2>&1 && return 0
    else
      git -C "$TX" push --porcelain origin HEAD:refs/heads/claims > "$TXROOT/merge-push" 2>&1 && return 0
    fi
    if ! grep -Eqi 'fetch first|non-fast-forward|cannot lock ref|already exists|failed to update ref|incorrect old value provided' "$TXROOT/merge-push"; then
      RM_REASON='Push de cola/base rechazado; verificar remoto, atomic y permisos'; return 3
    fi
  done
  RM_REASON='Contención excedió reintentos; volver a intentar'; return 3
}
rm_exit_cleanup() {
  local rc=$1
  trap - EXIT INT TERM
  if [ "$RM_HELD" = yes ]; then
    if [ "$RM_FINISHED" != yes ]; then
      RM_QUEUE_REASON=${RM_QUEUE_REASON:-'Proceso interrumpido; requiere revalidación'}
      # El exit de un error remoto queda contenido y no impide limpiar temporales.
      (rm_coord_update human) >/dev/null 2>&1 || {
        RM_COUNTER=$((RM_COUNTER + 1000))
        (rm_coord_update unlock) >/dev/null 2>&1 || true
      }
    else (rm_coord_update unlock) >/dev/null 2>&1 || true; fi
  fi
  cleanup
  exit "$rc"
}
rm_gate_scope() {
  local path allowed reserve
  normalize_paths "$(field "$RECORD" Paths)" > "$TXROOT/merge-allowed" || { RM_REASON='Paths de claim inválidos'; return 1; }
  git -C "$RM_BUILD" diff --no-renames --name-only -z "$(field "$RECORD" Task-Base)" "$RM_REVIEWED_TIP" > "$TXROOT/merge-files" || return 1
  while IFS= read -r -d '' path; do
    case "$path" in *$'\n'*|*$'\r'*) RM_REASON='Ruta con salto de línea no soportada'; return 1;; esac
    normalize_paths "$path" > "$TXROOT/merge-path" || { RM_REASON='Ruta de diff inválida'; return 1; }
    allowed=no
    while IFS= read -r reserve; do
      printf '%s\n' "$reserve" > "$TXROOT/merge-reserve"
      overlaps "$TXROOT/merge-path" "$TXROOT/merge-reserve" && allowed=yes
    done < "$TXROOT/merge-allowed"
    [ "$allowed" = yes ] || { RM_REASON="Diff fuera de Archivos: $path"; return 1; }
    case "/$(printf '%s' "$path" | tr '[:upper:]' '[:lower:]')/" in
      */contracts/*|*/types/*|*/shared-types/*|*/migrations/*|*/.github/workflows/*|*/.gitlab-ci.yml/*|*/azure-pipelines.yml/*|*/package-lock.json/*|*/pnpm-lock.yaml/*|*/*.lock/*|*/*.lockb/*|*/go.sum/*|*/scripts/smoke/*|*/scripts/smoke-project/*|*/scripts/secret-scan/*|*/scripts/hack/*|*/scripts/lib/*|*/scripts/hack-coordination/*|*/.githooks/*|*/hackathon.md/*)
        RM_REASON="R32 exige humano para recurso compartido/CI: $path"; return 1;;
    esac
  done < "$TXROOT/merge-files"
}
rm_prepare_candidate() {
  local branch task_base verify
  RECORD=$(task_file); CLAIM=$(claim_file)
  rm_authority_check || return 1
  resolve_task_tip || return 1; RM_REVIEWED_TIP=$RM_TIP
  approval_check "$RM_REVIEWED_TIP" "$(field "$RECORD" PR)" || return 1
  task_base=$(field "$RECORD" Task-Base); branch=$(field "$RECORD" Branch)
  git -C "$TX" cat-file -e "$task_base^{commit}" 2>/dev/null || { RM_REASON='Task-Base no disponible'; return 1; }
  git -C "$TX" merge-base --is-ancestor "$task_base" "$RM_REVIEWED_TIP" || { RM_REASON='Task-Base no pertenece a la historia actual'; return 1; }
  git -C "$TX" diff --quiet "$task_base" "$RM_REVIEWED_TIP" && { RM_REASON='La tarea no tiene implementación'; return 1; }
  RM_BUILD="$TXROOT/candidate"
  git clone -q --no-checkout "$REMOTE_URL" "$RM_BUILD" || { RM_REASON='No se pudo clonar base vigente'; return 1; }
  git -C "$RM_BUILD" config user.name "$USER_NAME"; git -C "$RM_BUILD" config user.email "$USER_EMAIL"
  git -C "$RM_BUILD" fetch -q origin "refs/heads/$BASE:refs/hack/base" || { RM_REASON='Base remota no disponible'; return 1; }
  RM_BASE_TIP=$(git -C "$RM_BUILD" rev-parse refs/hack/base)
  git -C "$RM_BUILD" fetch -q "$TX" "$RM_REVIEWED_TIP:refs/hack/task" || { RM_REASON='TIP de tarea no disponible'; return 1; }
  git -C "$RM_BUILD" checkout -q --detach "$RM_BASE_TIP" || return 1
  # Valida la combinación con base vigente sin reescribir el SHA aprobado.
  git -C "$RM_BUILD" merge --no-ff --no-commit "$RM_REVIEWED_TIP" > "$TXROOT/candidate-merge.log" 2>&1 || {
    RM_REASON='Conflicto con base vigente; humano debe resolver y pedir nueva revisión'; return 1;
  }
  RM_TREE=$(git -C "$RM_BUILD" write-tree) || { RM_REASON='No se pudo capturar árbol del candidato'; return 1; }
  rm_gate_scope || return 1
  [ -f "$RM_BUILD/scripts/secret-scan" ] || { RM_REASON='Falta escáner propio de secretos'; return 1; }
  (cd "$RM_BUILD" && bash scripts/secret-scan --tracked --decisions "$TX/DECISIONS.md") > "$TXROOT/gate-secrets.log" 2>&1 || {
    RM_REASON='Gate de secretos rojo'; return 1;
  }
  (cd "$RM_BUILD" && bash scripts/smoke) > "$TXROOT/gate-smoke.log" 2>&1 || { RM_REASON='Smoke rojo o producto sin verificar'; return 1; }
  verify=$(field "$RECORD" Verify); verify=$(printf '%s\n' "$verify" | sed 's/^`//;s/`$//')
  [ -n "$verify" ] || { RM_REASON='Falta Cómo verificar ejecutable'; return 1; }
  (cd "$RM_BUILD" && bash -c "$verify") > "$TXROOT/gate-verify.log" 2>&1 || { RM_REASON='Cómo verificar / aceptación rojo'; return 1; }
  git -C "$RM_BUILD" diff --quiet && [ "$(git -C "$RM_BUILD" write-tree)" = "$RM_TREE" ] || {
    RM_REASON='Smoke/Verify modificó archivos rastreados del candidato; requiere nueva revisión'; return 1;
  }
  git -C "$RM_BUILD" diff --quiet && git -C "$RM_BUILD" diff --cached --quiet && {
    RM_REASON='Candidato no aporta cambios'; return 1;
  }
  git -C "$RM_BUILD" commit -q -m "Integrar $ID revisada por $APPROVED_BY" || { RM_REASON='No se pudo crear merge commit'; return 1; }
  RM_CANDIDATE=$(git -C "$RM_BUILD" rev-parse HEAD)
}
merge_run() {
  local waited=0 rc wait_started
  RM_TOKEN="$(basename "$TXROOT")-$AGENT-$ID"; RM_HELD=no; RM_FINISHED=no
  rm_coord_update enqueue || { say "MERGE_HUMAN $ID | $RM_REASON"; return 3; }
  RM_LOCK_LEASE=$(rm_config Merge-Lease-Seconds 1800); RM_WAIT=$(rm_config Merge-Wait-Seconds 180)
  case "$RM_LOCK_LEASE:$RM_WAIT" in *[!0-9:]*|0:*|*:0) die 'Merge lease/wait deben ser segundos positivos.';; esac
  wait_started=$(date +%s)
  while :; do
    clock_now
    rm_coord_update lock; rc=$?
    if [ "$rc" -eq 0 ]; then RM_HELD=yes; break; fi
    waited=$(($(date +%s) - wait_started))
    [ "$rc" -eq 4 ] && [ "$waited" -lt "$RM_WAIT" ] || {
      RM_QUEUE_REASON=${RM_REASON:-'Espera de cola agotada'}; rm_coord_update human || true
      say "MERGE_HUMAN $ID | $RM_QUEUE_REASON"; return 3;
    }
    sleep 1
  done
  trap 'rm_exit_cleanup $?' EXIT
  trap 'exit 130' INT; trap 'exit 143' TERM
  if ! rm_prepare_candidate; then
    RM_QUEUE_REASON=${RM_REASON:-'Falló validación del candidato'}
    if rm_coord_update human; then RM_HELD=no; fi
    say "MERGE_HUMAN $ID | $RM_QUEUE_REASON"; return 3
  fi
  clock_now
  if ! rm_coord_update finalize; then
    RM_QUEUE_REASON=${RM_REASON:-'Falló publicación atómica'}
    if rm_coord_update human; then RM_HELD=no; fi
    say "MERGE_HUMAN $ID | $RM_QUEUE_REASON"; return 3
  fi
  RM_FINISHED=yes; RM_HELD=no
  say "OK merge $ID | INTEGRATED | $RM_CANDIDATE | revisión $APPROVED_BY | atomic claims+$BASE"
}
