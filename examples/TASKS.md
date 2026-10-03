# Backlog estático · Turno Claro

Derivado de IDEA.md: J1 exige flujo completo, J2 valida el riesgo y J3 protege la presentación. Sin Estado; consulta hack status. Por qué: claims es la fuente operativa.
Primera ola paralela: HACK-001 valida riesgo, HACK-002 ejecuta mock de extremo a extremo y HACK-003 puntúa según contrato inicial. Por qué: ninguna depende de un único setup.
Línea de corte: HACK-001/002/003/004 P0; HACK-005 P1 queda fuera si peligra la demo. Por qué: protege lo puntuable.

## HACK-001 · Validar timeout y fallback del proveedor
- **Tipo:** spike
- **Prioridad:** P0
- **Estimación:** 30 min
- **Objetivo:** comprobar que la demo sobrevive a proveedor caído.
- **Depende de:** ninguna
- **Área:** backend, infraestructura
- **Archivos probables:** spikes/provider.py
- **Rubric:** J2
- **Criterios de aceptación:** simular timeout y producir recommendation mock etiquetada.
- **Cómo verificar:** python3 spikes/provider.py --verify
- **Riesgos o decisiones pendientes:** proveedor definitivo después del spike.

## HACK-002 · Elegir un turno con walking skeleton ficticio
- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 45 min
- **Objetivo:** mostrar flujo completo con tres solicitudes falsas.
- **Depende de:** ninguna
- **Área:** frontend, backend, datos
- **Archivos probables:** app/demo.py
- **Rubric:** J1
- **Criterios de aceptación:** mostrar turno B y explicación; salida incluye demo_data=true; --verify falla si cambia el resultado esperado.
- **Cómo verificar:** python3 app/demo.py --verify
- **Riesgos o decisiones pendientes:** mantener mock durante el spike; no esperar al proveedor.

## HACK-003 · Explicar prioridad con el contrato existente
- **Tipo:** feature
- **Prioridad:** P0
- **Estimación:** 40 min
- **Objetivo:** ordenar urgencia y espera con explicación verificable.
- **Depende de:** ninguna
- **Área:** backend, datos
- **Archivos probables:** app/scoring.py
- **Rubric:** J1
- **Criterios de aceptación:** urgencia domina; espera desempata; entrada vacía retorna explicación sin resultado.
- **Cómo verificar:** python3 app/scoring.py --verify
- **Riesgos o decisiones pendientes:** elección reversible del algoritmo en DECISIONS.

## HACK-004 · Ensayar y grabar el recorrido completo
- **Tipo:** demo
- **Prioridad:** P0
- **Estimación:** 30 min
- **Objetivo:** tener una demo limpia y video plan B.
- **Depende de:** HACK-002, HACK-003
- **Área:** documentación, frontend
- **Archivos probables:** demo/
- **Rubric:** J3
- **Criterios de aceptación:** ensayo desde clon limpio y video sin secretos; checklist de submission completo.
- **Cómo verificar:** bash demo/verify.sh
- **Riesgos o decisiones pendientes:** video no grabado hasta existir producto demostrable.

## HACK-005 · Vista gráfica de la recomendación
- **Tipo:** feature
- **Prioridad:** P1
- **Estimación:** 60 min
- **Objetivo:** facilitar lectura del siguiente turno.
- **Depende de:** ninguna
- **Área:** frontend
- **Archivos probables:** ui/
- **Rubric:** J3
- **Criterios de aceptación:** usar mock sin modificar contratos.
- **Cómo verificar:** bash ui/verify.sh
- **Riesgos o decisiones pendientes:** fuera de la línea de corte si faltan P0.
