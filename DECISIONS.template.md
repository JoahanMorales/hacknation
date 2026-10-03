# Decisiones vigentes

Este archivo es plantilla: la instancia DECISIONS.md vive exclusivamente en claims. Por qué: evita decisiones divergentes entre ramas de código.
Registra una pregunta concreta, tarea, hora UTC, plazo de 15 min, opciones, reversibilidad, autonomía y siguiente tarea independiente. Por qué: una decisión pendiente debe dejar al agente libre para avanzar.
Abre el plazo con `hack decision ID --option TEXTO --why TEXTO --reversible yes --authorized yes --class routine`; tick registra el fallback autorizado a los 15 min. Por qué: la espera no debe detener a todos.
Si requiere gasto, credencial, cuenta, publicación, cambio de alcance o contradice autoridad, mantén esa acción bloqueada y cambia de tarea. Por qué: un timeout no sustituye autorización.

| ID | Tarea | Pregunta / opción | Abierta UTC | Vence UTC | Resolución | Por qué |
|---|---|---|---|---|---|---|

Los recibos viven en deadlines/ y los pendientes en meta/decisions/ de claims. Clases money/accounts/publish/scope nunca obtienen permisos por timeout. Excepciones de secretos sólo mediante hack secret-exception, con revisor elegible y ruta/regla/blob exactos; no agregues valores secretos. Por qué: los campos verificables permiten aplicar límites sin interpretar prosa.
