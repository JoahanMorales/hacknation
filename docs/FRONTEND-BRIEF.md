# Constelación · Brief de frontend

Dueño: Saus. Fuente de verdad visual del producto. HACK-005 lo convierte en `web/DESIGN.md`, tokens y `web/src/ui/`; cada pantalla (HACK-006, 017, 018, 019, 020, 013) implementa una escena de este brief.

## Norte

> Un médico habla y el universo de las enfermedades raras se apaga hasta dejar dos estrellas. Luego, una de ellas nos lleva a las personas que ya están trabajando en ella.

El jurado debe sentir tres cosas, en orden: **asombro** (la escala y el colapso), **confianza** (cada número y cada línea tiene su porqué) y **esperanza** (hay un siguiente paso concreto esta semana). Si una decisión visual no sirve a una de esas tres, se quita.

## Lenguaje visual

- **Metáfora:** constelación nocturna; *low ink, high signal*. Fondo casi negro, azulado y profundo (nunca `#000`). Las estrellas son el dato; el resto es silencio.
- **Color = significado, nunca decoración.** Seis tonos de mecanismo, desaturados y luminosos (p. ej. glicosilación, metabolismo lisosomal, estructural del músculo, canal/membrana, señalización, otros), más **un único acento cálido** para lo que importa ahora (candidatas, CTA, "esta semana"). Todo lo demás, en grises fríos de una sola familia.
- **Tipografía:** Geist para la interfaz; **Geist Mono con cifras tabulares** para %, rangos, IDs (HPO:, OMIM:, NCT) y fechas. Titulares cortos, interlineado ajustado, sin serif.
- **Superficies:** paneles de vidrio oscuro (blur suave, borde interior de 1 px, sombra tintada del fondo). Un solo radio para paneles y otro para chips; definirlos en DESIGN.md y no improvisar.
- **Profundidad:** tres planos. Fondo con un grano o polvo estelar estático muy sutil; la constelación; los paneles flotando encima.
- **Iconos:** Phosphor, un solo grosor. Nada de emojis.
- **Idioma de la UI:** inglés, frases cortas y concretas. Sin guiones largos (—).

## Arquitectura de pantalla (una sola vista, sin navegación de páginas)

```text
┌──────────────────────────────────────────────────────────────┐
│ top: logo · búsqueda global · Sample case · gestos on/off     │
│                                                              │
│ left: dictado         STAGE: constelación         right:     │
│ y chips               (pantalla completa,         inspector  │
│                        detrás de todo)            / acción   │
│                                                              │
│ bottom: candidatas + medidores + siguiente pregunta          │
└──────────────────────────────────────────────────────────────┘
```

`App.tsx` (HACK-001) pinta el `stage` a pantalla completa y coloca cada feature en su `slot` (`left`, `right`, `bottom`, `overlay`). Los paneles se ocultan o aparecen según `store.step`; la constelación nunca desaparece. Diseño para 1440×900 (proyector) y válido hasta 1280×720; móvil fuera de alcance.

## Escenas

### 1 · Constelación (HACK-006) — "la escala"
- Al cargar: las estrellas aparecen por galaxias en 1.2 s (de dentro hacia fuera), una sola vez. Contador discreto en mono: `12,867 rare diseases · 20,482 phenotypes`.
- Cada galaxia es un sistema del cuerpo; su nombre aparece al acercar el cursor o al hacer zoom, no siempre.
- Hover sobre una estrella: halo + nombre en una etiqueta pequeña. Clic: se abre el inspector.
- Parallax mínimo con el cursor (≤ 6 px) para dar vida sin marear.

### 2 · Dictado (HACK-017) — "el médico habla"
- Barra de dictado con una onda de audio viva y un único botón grande de micrófono. Al lado, "Play sample case" (el plan B, igual de bonito).
- La transcripción entra palabra a palabra. Cuando un fragmento se reconoce como síntoma, **se subraya, se convierte en chip y vuela hacia la constelación** (trayectoria curva de ~500 ms) mientras la constelación reacciona.
- Chips: presente = relleno suave; negado = contorno + tachado ("no cardiomyopathy"). Se pueden quitar o negar con un clic.

### 3 · Diagnóstico (HACK-006 + HACK-018) — **el wow**
Coreografía por cada síntoma nuevo (≤ 900 ms en total):
1. **0–150 ms:** el chip llega y emite un pulso que recorre la constelación.
2. **150–600 ms:** las estrellas que dejan de coincidir se atenúan en ola, desde el pulso hacia fuera (alfa y tamaño; nada desaparece de golpe).
3. **600–900 ms:** las candidatas que suben ganan brillo y tamaño; el panel inferior reordena sus tarjetas con animación de layout.
- Al quedar 2 candidatas claras: la cámara se mueve y encuadra el par, una línea tenue las une y aparece entre ellas **la diferencia** ("Respiratory involvement separates them").
- Medidores: número que cuenta hasta su valor, barra con **rango sombreado** (no un número falso de precisión), y debajo los 3 síntomas que más empujan. Leyenda fija: `Phenotype match · not a diagnosis`.
- **Siguiente mejor pregunta:** tarjeta con la pregunta, el efecto previsto ("If yes → Pompe ↑") y dos botones Yes/No; al responder se repite la coreografía.

### 4 · Inspector (HACK-019) — "la confianza"
- Panel derecho con progressive reveal: resumen (nombre, gen, mecanismo, 1 frase) → detalle (síntomas a favor y en contra, aristas).
- Cada arista: tipo, fuente con enlace, fecha y **EvidenceBadge** (observed / inferred / hypothesis / contradicted) con texto e icono, no solo color.
- "Explain for the family": texto claro en 3-4 frases, cada afirmación con su cita clicable `[1]` que resalta la arista en la constelación.

### 5 · Acción para Maria (HACK-020) — "la esperanza"
- Transición: la constelación **se reorganiza alrededor del mecanismo compartido** (ribitol → FKRP, FKTN, CRPPA): las enfermedades puente se acercan y se unen con líneas finas, cada una con su nivel de evidencia.
- Panel en tres bloques: **Community** (organizaciones y registros, con logo o monograma), **Reusable assets** (registro, estudio de historia natural, ensayo con fecha) y **This week** (una sola acción, grande, con un botón).
- Línea de tiempo 10×: dos carriles ("Today: 4.7 years average to diagnosis" frente a "With Constelación") que se dibujan de izquierda a derecha; los supuestos se despliegan debajo.
- Estado "no supported route" diseñado con el mismo cuidado: qué se buscó, qué evidencia falta y qué preguntar.

### Gestos (HACK-013, P1)
- HUD pequeño abajo a la derecha: silueta de mano de líneas finas que refleja el gesto detectado y su nombre (`Point · open`). Debounce visible (anillo que se completa).

## Movimiento

- Motion (`motion/react`) para la UI y sigma para la constelación. Curvas suaves de salida (tipo expo-out) para entradas; resortes solo en interacciones directas (chips, botones).
- Cada animación comunica algo: jerarquía, causa → efecto o cambio de estado. Si no, se quita.
- `prefers-reduced-motion`: sin vuelos ni ola; cambios instantáneos de opacidad.
- Nada de bucles infinitos salvo el halo de "escuchando" mientras el micrófono está activo.

## Datos en pantalla

- Los porcentajes siempre llevan su rango y la etiqueta "match".
- Las cifras del relato (4.7 years, 12,867, fechas) salen de la API o de IDEA.md §11, nunca inventadas.
- "Sample case": badge discreto arriba cuando se usa el caso de ejemplo; es una función del producto (demo guiada), no un error.

## Vara de calidad (Saus revisa antes de cada merge de UI)

- [ ] Captura con la skill webapp-testing en 1440×900, sin errores de consola.
- [ ] Contraste AA en texto y controles sobre vidrio oscuro.
- [ ] Un acento, una familia de grises, un radio por tipo de elemento.
- [ ] Estados loading (skeleton con la forma final), empty y error diseñados en cada panel.
- [ ] Ninguna animación de más de 900 ms bloquea la interacción.
- [ ] Pre-Flight de la skill design-taste-frontend (§14) en las secciones que aplican.
- [ ] El recorrido completo del caso de ejemplo funciona solo con clics, sin teclado, en menos de 90 s.

## Cómo trabajar (Saus, 2 agentes)

1. Agente A: HACK-005 (DESIGN.md con la skill design-taste-frontend usando este brief → tokens → `web/src/ui/` + `?ui=kit`).
2. Agente B, en cuanto HACK-001 esté integrada: HACK-006 (constelación) con `app/fixtures/api/graph_overview.json`.
3. Después: HACK-017 → HACK-018 → HACK-019 → HACK-020; HACK-013 al final.
4. Cada pantalla arranca con los ejemplos de `app/fixtures/api/` (HACK-002) y pasa sola a la API real cuando esté integrada (`api()` con `example`).
5. Skills: `hack-frontend` (estructura), `design-taste-frontend` (solo para DESIGN.md y la escena 3), `vercel-react-best-practices` (rendimiento), `webapp-testing` (capturas), `redesign-existing-projects` (pulido final).

## Referencias de sensación

Vista de grafo de Obsidian (la constelación) · Linear (calma, precisión, tipografía) · Apple Health (medicina amable) · Open Targets Platform (evidencia legible) · Stripe Press (narrativa con datos).
