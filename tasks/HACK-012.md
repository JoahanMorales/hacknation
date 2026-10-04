# HACK-012
ID: HACK-012
State: REVIEW
Owner: cris-1
Branch: feat/hack-012
Worktree: /c/Users/crist/Documents/HackNation/hacknation-wt/hack-012
Worklog: worklog/WL-1791074969-cris-1-HACK-012-hack.Ft6Pru.md
Priority: P1
Paths: data/validate.py, app/fixtures/validation/, docs/validation.md
Depends: HACK-007
Verify: python3 data/validate.py --check
Lease-Until: 1791077611
Updated: 1791075811
Task-Base: d1909207fc5ec70864edc10648fcc8e2a48dec40
Next: Esperar review de SHA 45547d1; luego hack merge HACK-012
PR: https://github.com/JoahanMorales/hacknation/pull/27
Evidence: python data/validate.py --check exit 0 (VALIDATION_CHECK_PASS); bash scripts/smoke PRODUCT_PASS; docs/validation.md con n/top-1/top-3/método; --check sin recalcular
Events: 5
Checkpoints: 1
Sessions: 2
Last-Checkpoint: 1791075811
Task-Tip: 45547d175f26a459e29ddf1bfb07b8746aea4053
