# IDEA · <nombre del producto>

> Reto: <nombre y número> · Evento: <nombre, fechas>.
> Marcas: **[Decidido]** · **[Recomendación]** · **[Por validar]** (probar o citar antes del pitch). Toda cifra del pitch sale de §11 con fuente.
> Cada sección alimenta una pieza del backlog: §4 → tareas verticales · §6 → contrato · §7/§9 → spikes · §8 → criterios de aceptación · §12 → olas de `/hack-plan`.

## 1. Una línea
Para **<usuario>**, que **<dolor con cifra>**, **<producto>** permite **<resultado observable>**, a diferencia de **<alternativa actual>**.

**Diferencial frente a otros equipos del reto:** <qué hacen los repos/demos públicos y en qué nos separamos; buscarlos antes de decidir>.

## 2. Problema y usuarios
| Persona (nombre + rol) | Momento | Qué necesita | Paso del flujo |
|---|---|---|---|
| <usuario de entrada> | <situación concreta> | <necesidad> | <#> |
| <usuario central del brief> | <...> | <...> | <#> |

- Dolor con fuente: <cifra> (§11).
- Resultado que cambia: <de X a Y, concreto y medible>.

## 3. Caso de demo
<Un caso real, publicado y con resultado conocido, que recorra todo el flujo. Por qué este caso: diferencial real, datos que lo separan, final bueno para el jurado, contraejemplo.>

## 4. Flujo de demo (≤ 6 pasos, ≤ 3 min; cada paso = 1 tarea vertical)
| # | Usuario hace | Ve en pantalla (concreto) | API | Prio |
|---|---|---|---|---|
| 1 | <acción> | <qué aparece exactamente> | `GET /api/<x>` | P0 |
| 3 | <acción> | **Wow:** <efecto visible> | `POST /api/<z>` | P0 |

- Momento wow en una frase: <...> · segundos hasta el wow: <≤ 45>.
- Plan B de cada paso que dependa de red, micrófono o cámara: <precargado / ratón / grabado>.

## 5. Núcleo técnico (el número o resultado que el jurado verá)
- Método: <algoritmo explicable y su referencia>.
- El LLM **no** produce el número: <qué hace el LLM y qué hace el cálculo>.
- Trampas comprobadas con datos reales: <lo que salió mal al probar con los datos>.
- Validación honesta: <dataset público, métrica (top-k), cómo se reporta>.

## 6. Datos (contrato `app/schemas/`)
| Entidad | Campos clave (nombre: tipo) | Fuente (licencia) |
|---|---|---|
| <Entidad> | <campo: tipo, ...> | <dataset/API (licencia)> |

- Capa ancha (volumen, efecto visual) frente a capa profunda (curada a mano, con URL): <qué entra en cada una>.
- Snapshot procesado en el repo (< 5 MB); crudos con `data/fetch.sh`.

## 7. IA y APIs externas (cada una = spike ≤ 30 min + fallback)
| Uso | Modelo/API [Por validar] | ¿Clave? quién la tiene | Fallback |
|---|---|---|---|
| <...> | <...> | <...> | <respuesta grabada `demo_data`> |

- Regla anti-alucinación: <el LLM elige entre opciones dadas y cita IDs existentes>.

## 8. Rubric → evidencia
| Criterio oficial | Peso | Qué paso/artefacto lo demuestra |
|---|---|---|
| <criterio> | <% o "sin peso"> | <paso # o archivo> |

Entregables oficiales: <prototipo, repo + README, video, deck, formulario>.

## 9. Tecnología y cortes
| Pieza | Decisión | Por qué / qué se corta si falla |
|---|---|---|
| <...> | P0 / P1 / P2 | <...> |

## 10. Alcance
- Fuera: <...> · Simulado con `demo_data`: <...> · Idioma de la UI: <...> · Ética/datos: <...>

## 11. Hechos citables (verificados el <fecha>)
| Hecho | Fuente (URL) |
|---|---|
| <cifra o afirmación> | <URL> |

## 12. Backlog propuesto (olas paralelas)
| Ola | ID | Tarea | Tipo | Prio | Depende | Archivos |
|---|---|---|---|---|---|---|
| 0 | HACK-001 | Setup (docs/STACK.md) | setup | P0 | — | lockfiles, main, App |
| 1 | HACK-002 | Contrato + fixtures + web/DESIGN.md | contract | P0 | — | app/schemas/, web/DESIGN.md |
| 1 | HACK-003 | Spike de mayor riesgo | spike | P0 | — | spikes/<x>/ |
| 1 | HACK-004 | Walking skeleton del flujo con mocks | feature | P0 | — | web/src/features/<f>/, app/routers/<f>.py |

Relacionadas (para avisos automáticos): <ID↔ID>.

## 13. Decisiones abiertas
- [ ] <decisión> · responsable · hora límite
