# worklog/WL-1791091992-joahan-2-HACK-032-hack.kFQbMW.md · HACK-032

## Resumen vivo
- Hecho: tokens claros en diagnosis/dictation; DICTATION_PASS; check de diagnosis arranca con Play sample y espera 5 términos
- Decisión: no parchear el check a ciegas
- Por qué: el fallo restante es layout del shell (HACK-028)
- Falla: diagnosis check línea 103: 'Phenotype match · not a diagnosis' fuera del viewport (ratio 0) en el loop de tamaños; a 1280x720 queda en y=704-720.5
- Comandos: uv run python web/src/features/diagnosis/check_ui.py --url URL --output DIR
- Siguiente: Cancelada: Absorbida por HACK-034 (saus-1, rediseño de dictado/diagnóstico pedido por su humano). Ya en main: tokens claros (93aa0d6) y check de dictado al shell nuevo; pendiente en 034: aviso 'not a diagnosis' dentro del viewport y DIAGNOSIS_PASS.

## Historial
- 1791091992 | CLAIMED | joahan-2 | claim; siguiente: Tokens claros en diagnosis/dictation y check_ui al shell nuevo
- 1791093036 | CLAIMED | joahan-2 | checkpoint; siguiente: Saus ajusta el pie del diagnóstico para que el aviso quede dentro del viewport; luego DIAGNOSIS_PASS y done
- 1791094816 | CANCELLED | joahan-2 | release; reserva liberada por joahan-2; motivo: Absorbida por HACK-034 (saus-1, rediseño de dictado/diagnóstico pedido por su humano). Ya en main: tokens claros (93aa0d6) y check de dictado al shell nuevo; pendiente en 034: aviso 'not a diagnosis' dentro del viewport y DIAGNOSIS_PASS.; resumen conservado
