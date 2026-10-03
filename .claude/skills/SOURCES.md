# Procedencia de las skills

Skills de terceros copiadas al repo tras leerlas completas (sin instrucciones remotas, sin comandos ocultos). Actualizar = volver a revisarlas antes de copiar. Por qué: una skill son instrucciones que todos los agentes obedecen.

| Skill | Origen (commit revisado) | Licencia | Notas |
|---|---|---|---|
| design-taste-frontend | Leonxlnx/taste-skill `skills/taste-skill` @ ce26fc2 | MIT | Pedida por el equipo. ~25k tokens: cargar sólo para web/DESIGN.md y pantallas de impacto |
| redesign-existing-projects | Leonxlnx/taste-skill `skills/redesign-skill` @ ce26fc2 | MIT | Pulido durante freeze |
| webapp-testing | anthropics/skills `skills/webapp-testing` @ 8a1541c | Apache-2.0 | Verificado con nuestro stack (Playwright + with_server.py) |
| vercel-react-best-practices | vercel-labs/agent-skills `skills/react-best-practices` @ 063bee9 | MIT | Sólo SKILL.md + rules/ (sin AGENTS.md de 108 KB) |
| hack-backend, hack-frontend | Propias | - | Convenciones del stack (docs/STACK.md) |

Descartadas: `output-skill` (pide no optimizar brevedad; choca con el ahorro de tokens), `web-design-guidelines` de Vercel (descarga instrucciones remotas en cada uso; viola R07), `frontend-design` de Anthropic (duplica design-taste-frontend con criterios distintos), `minimalist-skill` (cubierto por los diales de design-taste-frontend).
