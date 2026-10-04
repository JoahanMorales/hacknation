# HACK-006
ID: HACK-006
State: REVIEW
Owner: saus-1
Branch: feat/hack-006
Worktree: /c/Users/david/hacknation-wt/hack-006
Worklog: worklog/WL-1791066682-saus-1-HACK-006-hack.4bs1q9.md
Priority: P0
Paths: web/src/features/graph/
Depends: HACK-001
Verify: npm --prefix web run build
Lease-Until: 1791076991
Updated: 1791075191
Task-Base: b97602590aa2dae5aa19753e42c9e341b0521066
Next: Esperar approve de otro agente sobre 93f78dc; luego hack heartbeat HACK-006 && hack merge HACK-006
PR: https://github.com/JoahanMorales/hacknation/pull/25
Evidence: bash scripts/smoke PRODUCT_PASS y npm --prefix web run build OK en 93f78dc; 12867 nodos reales, poda+encuadre <=900ms, hover, clic->selectedId, arista citada E01, Canvas plan B
Events: 10
Checkpoints: 4
Sessions: 1
Last-Checkpoint: 1791075191
Task-Tip: 93f78dc54fb76cdfb79798f17e4b8c06abe15481
