# HACKATHON · Configuración del evento

Completar con `/hack-setup` los campos entre `<...>` al inicio del evento; stack, equipo y bloque ejecutable ya vienen preconfigurados. Por qué: las decisiones del evento deben estar disponibles sin depender del chat.

## Parámetros

| Campo | Valor inicial |
|---|---|
| Duración | 24 h |
| Agentes en paralelo | 4–8 (1–2 por persona) |
| Stack | Python 3.12 + FastAPI + uv + pytest (docs/STACK.md) |
| Herramientas | Claude Code, Cursor, Codex (núcleo común: AGENTS.md) |
| Máquinas | Una por persona; un worktree por tarea (`scripts/wt`) |
| Remoto | GitHub `JoahanMorales/hacknation`, `origin` |
| Humanos | 3–4: `<producto/demo>`, `<integración/entrega>`, `<backend>`, `<frontend/datos>` |
| Inicio y zona | `<AAAA-MM-DD HH:mm, zona IANA>` |
| Fin / límite de submission | `<inicio + 24 h, confirmar hora oficial>` |
| Feature freeze | `<inicio + 18 h; completar fecha, hora y zona>` |
| Ensayo limpio | `<inicio + 21 h>` |
| Grabación del plan B | `<inicio + 22 h>` |
| Submission interna | `<inicio + 23 h; antes del límite oficial>` |

Confirmar las horas absolutas y el límite oficial antes de publicar el backlog. Por qué: las horas relativas permiten reutilizar la plantilla, pero una entrega exige una hora inequívoca.

## Rubric y definición de éxito

Sustituir esta propuesta por el rubric oficial y verificar que los pesos suman 100. Por qué: optimizar criterios inventados puede perder puntos del jurado.

| ID | Criterio | Peso propuesto | Evidencia en demo | Tareas P0 |
|---|---|---:|---|---|
| C1 | Valor para el usuario | 40 % | `<problema resuelto en un recorrido>` | `<IDs>` |
| C2 | Ejecución técnica | 30 % | `<flujo reproducible, smoke>` | `<IDs>` |
| C3 | Originalidad / momento wow | 20 % | `<acción y resultado visible>` | `<IDs>` |
| C4 | Claridad de la presentación | 10 % | `<demo y explicación>` | `<IDs>` |

Mapear cada tarea P0 a uno o más IDs de este rubric. Por qué: la prioridad debe contribuir a una evidencia que el jurado pueda evaluar.

- Flujo mínimo de la demo: `<usuario → entrada → resultado → acción útil>`.
- Momento wow: `<acción concreta y efecto visible en menos de 30 s>`.
- Línea de corte: `P0`; `P1` sólo después del recorrido P0 integrado; `P2` queda fuera hasta que sobre tiempo. Por qué: el tiempo debe completar primero la demo evaluable.
- Durante freeze: sólo errores que rompan el recorrido, seguridad, documentación, ensayo y submission. Por qué: la integración necesita estabilizarse antes de entregar.

Aplicar la línea de corte y el freeze incluso cuando existan funcionalidades tentadoras. Por qué: un recorrido completo y estable puntúa mejor que piezas aisladas.

## Reglas del evento

| Tema | Regla confirmada | Fuente / pendiente |
|---|---|---|
| Uso de IA | `<permitido, declaración exigida, límites>` | `<URL oficial o pendiente>` |
| Código previo | `<permitido, fecha límite, atribución>` | `<URL oficial o pendiente>` |
| Datos y licencias | `<fuentes, licencias, restricciones>` | `<inventario de IDEA.md>` |
| Integrantes / categorías | `<requisitos oficiales>` | `<URL oficial o pendiente>` |
| Formato de entrega | `<repositorio, URL, video, deck, formulario>` | `<URL oficial o pendiente>` |

Verificar estas reglas con las fuentes del evento antes de depender de IA, código previo o activos externos. Por qué: el paquete no puede conocer las condiciones de cada hackatón.

## Autonomía y decisiones

| Acción | Nivel autorizado inicial | Intención |
|---|---|---|
| Claims, ramas, worktrees, edición dentro de la tarea, validación | Requiere Autonomy: yes publicado | Por qué: cada agente debe poder ejecutar su incremento reservado. |
| Elegir una alternativa reversible dentro del alcance tras 15 min | Autorizado y registrado | Por qué: una decisión rutinaria no debe detener el recorrido. |
| Autofusión | Requiere Auto-Merge: yes; sólo con las seis condiciones de `docs/PLAYBOOK.md` | Por qué: evidencia y límites permiten integrar sin esperar una revisión humana rutinaria. |
| Cambios de contratos compartidos o CI | Revisión humana; continuar otra tarea mientras esperan | Por qué: esos cambios afectan a consumidores y verificaciones de todo el equipo. |
| Gastar dinero, crear cuentas, cambiar accesos, ampliar alcance | Requiere autorización explícita; no hay autorización por silencio | Por qué: los timeouts no amplían permisos ni presupuesto. |
| Publicar fuera del repositorio o enviar submission | `<persona autorizada y autorización concreta>` | Por qué: una entrega externa debe usar la autorización aplicable. |

Respetar las autorizaciones explícitas de la persona responsable por encima de los valores iniciales. Por qué: la jerarquía de autoridad se conserva y el silencio no otorga permisos.

- Canal de decisiones y bloqueos: `DECISIONS.md` en la rama `claims`.
- Backlog propuesto a las: `<hora>`; vencimiento de revisión: `<hora + 10 min>`.
- Lease de claim: 30 min desde el último heartbeat.
- Heartbeat recomendado: cada 10 min y antes/durante un comando largo. Por qué: el trabajo activo necesita conservar el lease de 30 min.
- Integración: cola secuencial; el humano recibe un solo `bash scripts/hack digest` por ronda de revisión acordada.

Tras 10 min sin respuesta al backlog, comenzar sólo P0 dentro de la autonomía autorizada. Por qué: la ausencia de un humano no debe detener el trabajo seguro que ya contribuye a la demo.

Ante una decisión sin respuesta durante 15 min, elegir y registrar la opción reversible dentro del alcance; si exige dinero, accesos o autorización, mantener sólo esa tarea bloqueada y tomar otra. Por qué: la salida del bloqueo conserva los límites humanos y permite avanzar en paralelo.

## Presupuesto de sesiones y tokens

| Campo | Valor inicial ajustable |
|---|---|
| Sesiones por agente | `<4>` |
| Tokens por sesión | `<12000; ajustar al proveedor>` |
| Tokens totales por agente | `<sesiones × tokens>` |
| Checkpoint por contexto | Al llegar aproximadamente al 60 % |
| Núcleo AGENTS.md | Máximo 150 líneas y 1800 palabras |
| STATE.md | Máximo 60 líneas y 700 palabras |
| Resumen vivo por bitácora | Máximo 15 líneas |

Registrar el presupuesto real al iniciar y usar `bash scripts/hack lint` antes del handoff. Por qué: un límite explícito evita que la coordinación consuma el contexto disponible.

Configurar `scripts/smoke-project` con la validación real del producto antes de usar `bash scripts/smoke` como evidencia de integración; `bash scripts/smoke --package-only` sólo valida este paquete. Por qué: un smoke de coordinación verde no demuestra que la aplicación funcione.

## Propiedad de recursos compartidos

Publicar en `OWNERS.md` un único ID de tarea dueño de cada lockfile, migración, tipo compartido, contrato y CI usado por el proyecto. Por qué: una reserva por tarea evita que un archivo central mezcle cambios de varios agentes.

| Recurso / patrón de ejemplo | Dueño, ID de tarea | Publicado / validado |
|---|---|---|
| `pyproject.toml`, `uv.lock` | `<HACK-001 setup>` | `<sí/no>` |
| `app/main.py`, `app/config.py` | `<HACK-001 setup>` | `<sí/no>` |
| `app/schemas/` | `<HACK-002 contract>` | `<sí/no>` |
| `.github/workflows/**` | `<HACK-NNN>` | `<sí/no>` |

Reemplazar los patrones de ejemplo por las rutas reales antes de reclamar tareas. Por qué: el control de traslape sólo es útil si coincide con los archivos del producto.

## Plan B y entrega

- Plan A: `<recorrido real y dependencias verificadas>`.
- Plan B: video local grabado del recorrido validado, con datos de demo claramente etiquetados.
- Ubicación del video: `<ruta compartida o URL accesible autorizada>`.
- Operador / narrador: `<humano o agente de demo>`.
- Condición para activar plan B: `<fallo de red, dependencia externa o demo en vivo>`.

Grabar y probar el video antes de la ventana de submission. Por qué: un respaldo que nadie puede reproducir no protege la demo.

- [ ] Reglas oficiales, declaración de IA, código previo y licencias comprobados.
- [ ] `bash scripts/smoke` verde desde un checkout limpio; comando y resultado registrados.
- [ ] Recorrido P0 completo, con mocks identificados y límites conocidos.
- [ ] Sólo cambios revisados integrados; bloqueos y deuda visibles.
- [ ] README del producto con instalación, ejecución y variables necesarias.
- [ ] Datos/cuentas de demo sin secretos ni datos personales reales.
- [ ] Video del plan B reproducido y ensayo cronometrado completado.
- [ ] Repositorio, URL, video, deck y formulario preparados según el evento.
- [ ] Acceso de los jueces verificado sin revelar credenciales.
- [ ] Submission enviada por la persona autorizada y comprobante guardado.

Completar la checklist con evidencia antes de declarar entregado el proyecto. Por qué: el resultado competitivo incluye que los jueces puedan abrir y evaluar la entrega.

## Configuración ejecutable v2.1

Estos campos planos se leen de HACKATHON.md en la base remota. Publícalos con autorización humana; faltantes equivalen a no autorizado. Freeze-Epoch: 0 desactiva freeze automático: sustituye 0 por su epoch real antes del evento. Backlog-Proposed-Epoch: 0 registra el primer tick; usa la época real de propuesta para conservar el plazo inicial.
Por qué: la prosa y las horas relativas no son permisos ni relojes ejecutables.

```text
Backlog-Proposed-Epoch: 0
Backlog-Approved: no
Autonomy: yes
Auto-Merge: yes
Freeze-Epoch: 0
Events-Per-Session: 100
Checkpoint-Percent: 60
Review-Mode: claims
Merge-Lease-Seconds: 1800
Merge-Wait-Seconds: 180
```

Preconfigurado por el responsable (JoahanMorales) para velocidad: Autonomy y Auto-Merge en yes (los gates de merge siguen exigiendo revisión de otro agente, smoke de producto y alcance); Review-Mode claims porque los agentes de una misma persona comparten cuenta de GitHub y no pueden aprobarse en gh. Cambia a no para retirar el permiso. El humano aprueba backlog según corresponda. Durante freeze sólo se reclaman tareas con Freeze-Allowed: yes explícito. HACK_SESSION identifica una sesión declarada; eventos son aproximación y no tokens reales ni detección de compactación.
Por qué: el vencimiento jamás amplía permisos, y las mediciones no deben prometer contexto invisible.
