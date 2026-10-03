# Turno Claro · ejemplo con datos ficticios

## Problema y usuarios
Un organizador de una jornada necesita elegir a quién atender a continuación y explicar la elección. La demo usa tres solicitudes inventadas, sin datos personales.

## Resultado de demo y momento wow
Carga solicitudes ficticias, compara prioridad y espera, y muestra el siguiente turno con una explicación comprensible. Al cambiar una urgencia se ve la nueva recomendación de inmediato.

## Rubric de ejemplo
| ID | Criterio | Peso | Evidencia |
|---|---|---|---|
| J1 | Flujo útil completo | 50% | Elegir y explicar un turno desde datos mock |
| J2 | Solidez técnica | 30% | Spike de timeout, validación reproducible |
| J3 | Claridad de demo | 20% | Recorrido corto y video de respaldo |

Estos pesos son ilustrativos; sustituye por las reglas oficiales antes de competir. Por qué: el paquete no conoce un jurado real.

## Riesgos técnicos
- Servicio externo lento: spike primero; timeout y fallback al mismo contrato.
- Puntaje difícil de explicar: regla simple y resultado visible en consola.

## Activos existentes y contratos iniciales
- Schema acordado: request = {id, wait_minutes, urgency}; recommendation = {id, explanation, demo_data}.
- Fixture de tres registros ficticios; el planificador publica schema y mock antes de la primera ola.
- Entorno local con Python 3; el ejemplo no necesita una credencial ni servicio real.

## Funcionalidades y fuera de alcance
P0: skeleton mock, riesgo validado, explicación y ensayo. P1: interfaz gráfica. P2: proveedor externo real.
No incluye datos reales, creación de cuentas, gasto ni publicación externa.

## Pregunta abierta
¿Preferimos urgency sobre tiempo de espera? Opción reversible: urgency primero, espera como desempate; registrar en DECISIONS después del timebox. Por qué: permite probar el wow sin una decisión irreversible.
