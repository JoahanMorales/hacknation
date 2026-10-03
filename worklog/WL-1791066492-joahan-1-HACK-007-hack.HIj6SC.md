# worklog/WL-1791066492-joahan-1-HACK-007-hack.HIj6SC.md · HACK-007

## Resumen vivo
- Hecho: scoring.py, router diagnose/next-question, 5 tests; pytest 40 ok; smoke PASS; rama 05da61d
- Decisión: semántica de generate.py de HACK-002; labels añadidos a annotations.json
- Por qué: API real y ejemplos de la UI dan los mismos números
- Falla: gh sin permiso de PR
- Comandos: uv run pytest -q app/tests/test_scoring.py; bash scripts/smoke
- Siguiente: Humano abre PR de feat/hack-007; luego hack done HACK-007 --pr URL

## Historial
- 1791066492 | CLAIMED | joahan-1 | claim; siguiente: LR sobre annotations.json y POST /api/diagnose
- 1791066699 | CLAIMED | joahan-1 | checkpoint; siguiente: Humano abre PR de feat/hack-007; luego hack done HACK-007 --pr URL
