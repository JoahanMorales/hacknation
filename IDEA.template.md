# IDEA · `<nombre del producto>`

Completar esta ficha antes de planificar; conservarla como descripción del producto. Por qué: el planificador necesita un objetivo y evidencia observable, no una lista de tecnologías.

## Problema y usuario

- Usuario principal: `<quién>`.
- Problema: `<situación, coste y frecuencia>`.
- Resultado útil: `<qué cambia para ese usuario>`.
- Flujo de demo: `<entrada → procesamiento → resultado → siguiente acción>`.
- Alcance mínimo: `<un recorrido que cabe en 24 h>`.
- Fuera de alcance: `<funcionalidades excluidas>`.

Dividir el alcance en incrementos verticales y demostrables. Por qué: cada tarea debe producir algo que pueda comprobarse sin esperar todo el sistema.

## Jurado y momento wow

| Criterio ID de HACKATHON.md | Peso oficial | Evidencia concreta | Incremento propuesto |
|---|---:|---|---|
| `<C1>` | `<%>` | `<acción y resultado visible>` | `<tarea P0>` |
| `<C2>` | `<%>` | `<validación reproducible>` | `<tarea P0>` |

- Momento wow: `<la acción exacta que sorprenderá y el resultado que verá el jurado>`.
- Tiempo hasta el wow: `<segundos desde el inicio de la demo>`.
- Éxito mínimo verificable: `<comportamiento y comando reproducible>`.
- Ruta crítica de demo: `<orden de capacidades que deben funcionar>`.
- Corte propuesto: P0 `<lista>`; P1 `<lista>`; P2 `<lista>`.

Mapear cada P0 a un criterio del rubric y proteger el recorrido hasta el wow. Por qué: el backlog debe concentrar el tiempo disponible en evidencias evaluables.

## Riesgos técnicos y spikes

| Riesgo | Spike y límite de tiempo | Cómo verificar, comando exacto | Resultado mínimo | Fallback reversible |
|---|---|---|---|---|
| `<API o capacidad no comprobada>` | `<HACK-NNN, 30 min>` | `<comando real>` | `<evidencia esperada>` | `<mock/datos locales>` |
| `<rendimiento o formato incierto>` | `<HACK-NNN, 30 min>` | `<comando real>` | `<umbral>` | `<ruta más simple>` |

Ejecutar spikes de alto riesgo antes de integrar capacidades reales y limitar su duración. Por qué: una incertidumbre que falla al final puede invalidar el recorrido completo.

Permitir que el walking skeleton y los consumidores de contratos avancen con mocks mientras corren los spikes. Por qué: validar un riesgo no debe detener el trabajo independiente.

## Contratos para la primera ola

| Interfaz / esquema | Ruta y versión inicial | Dueño, tarea ID | Mock publicado | Consumidores |
|---|---|---|---|---|
| `<request/response>` | `<contracts/...>` | `<HACK-NNN>` | `<fixtures/...>` | `<IDs>` |
| `<tipo compartido>` | `<src/shared/...>` | `<HACK-NNN>` | `<fixtures/...>` | `<IDs>` |

Publicar y revisar interfaces, esquemas y mocks mínimos antes de la primera ola de implementación. Por qué: cuatro tareas pueden usar una forma estable sin depender de una única tarea inicial.

Crear un walking skeleton P0 con datos falsos en la primera ola, separando su ruta de las validaciones externas. Por qué: un recorrido temprano ofrece una demo recuperable aunque falle una dependencia.

## Activos existentes

| Activo | Ruta / fuente | Licencia / permiso | Disponible y probado | Uso en la demo |
|---|---|---|---|---|
| `<código previo>` | `<ruta/URL>` | `<licencia>` | `<comando y resultado>` | `<uso>` |
| `<datos/imagen/modelo>` | `<ruta/URL>` | `<licencia>` | `<prueba>` | `<uso>` |
| `<API/servicio>` | `<documentación oficial>` | `<condición>` | `<prueba sin secretos>` | `<uso/fallback>` |

Verificar disponibilidad, licencia y reglas de código previo antes de asignar un activo como dependencia. Por qué: una promesa de disponibilidad no sustituye una prueba ni una autorización.

## Decisiones y límites

- Restricciones: `<tiempo, coste, datos, plataforma, idioma>`.
- Datos de demo: `<fuente, etiquetas y anonimización>`.
- Decisiones pendientes: `<preguntas concretas y alternativa reversible>`.
- Plan B: `<video y fallback descritos en HACKATHON.md>`.

Registrar las decisiones operativas en `DECISIONS.md` de la rama `claims`, referenciando esta idea cuando aplique. Por qué: el contenido de producto no debe convertirse en una segunda fuente de estado compartido.
