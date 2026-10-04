# Constellation: contrato visual

Design Read: una mesa clínica de exploración, con constelación nocturna, datos precisos y un acento cálido que guía la acción.

VARIANCE 4 / MOTION 4 / DENSITY 5. Producto de una vista para escritorio 1440×900 y 1280×720. Tema oscuro (cielo azul marino) desde la Ola 3 (antes blanco con verde y luego claro azul), por decisión del humano de Saus; ver sección "Ola 3". CSS nativo para componentes y tokens Tailwind v4; no simular otra biblioteca de diseño.

## Paleta y contraste

| Token          | Hex     | Uso                                |
| -------------- | ------- | ---------------------------------- |
| night          | #0d1520 | Fondo (gris azulado muy apagado)   |
| surface        | #151f2b | Vidrio neutro al 72%, blur 12px    |
| surface-raised | #1c2835 | Controles                          |
| ink            | #edf1f5 | Texto principal                    |
| muted          | #9aa7b5 | Texto secundario                   |
| line           | #2a3644 | Líneas no esenciales               |
| accent         | #8ec5fc | Único acento (celeste) de selección y acción |
| accent-ink     | #0d1520 | Texto sobre acento                 |
| glycosylation  | #5ed3d0 | Glicosilación                      |
| lysosomal      | #b3a6f2 | Lisosomal (lavanda apagado)        |
| structural     | #ee9cbf | Estructura muscular                |
| membrane       | #a6d18c | Membrana                           |
| signaling      | #e8b46c | Señalización                       |
| other          | #a9b8c7 | Otros mecanismos                   |

Los seis colores semánticos no son acentos de acción. Siempre llevan nombre. Texto normal debe superar 4.5:1, foco y límites esenciales 3:1. El kit verifica los colores de texto contra surface-raised y el panel compuesto sobre blanco (caso extremo del vidrio). No usar line para texto. Evidencia reutiliza colores semánticos: Observed/glycosylation, Inferred/lysosomal, Hypothesis/signaling, Contradicted/structural; además lleva icono y etiqueta.

## Tipografía, espacio y profundidad

Geist Variable para interfaz; Geist Mono Variable para IDs, porcentajes, rangos y teclado. Escala 12/13/14/16/20/32px; títulos cortos, peso 450–550. Números tabulares. Sin serif ni mayúsculas ornamentales.

Espacios 4/8/12/16/24/32/48px. Radios: panel 16px, control 10px, chip 999px; tecla física 5px y marcas gráficas 3px. Panel con borde tenue de 1px, sombra azul negra `0 12px 36px rgb(2 6 15 / 28%)` y luz interior de 1px. Sin glow decorativo persistente. Tres planos: polvo estático tenue, datos del grafo, paneles. Sin imágenes ornamentales.

Phosphor, peso regular, 18px en controles y 16px en etiquetas. Los iconos nunca sustituyen un nombre accesible. Objetivos interactivos de al menos 36px; foco visible de 2px con separación 4px.

## Movimiento

Curva `[0.16, 1, 0.3, 1]`. Feedback 120ms, entradas 240ms, cambio numérico 420ms. Sólo transform/opacity animados; valores con MotionValue y limpieza al desmontar. El porcentaje anima únicamente al cambiar su valor. Sin bucles, parallax ni animaciones de layout. `prefers-reduced-motion` hace cambios instantáneos; `prefers-reduced-transparency` y ausencia de backdrop-filter producen panel sólido. El skeleton estático conserva la forma del contenido.

## API pública (`web/src/ui`)

| Componente    | Contrato                                                                                                                      |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Panel         | title, trailing, state ready/loading/empty/error, emptyMessage, emptyAction, errorMessage, onRetry; children y atributos HTML |
| Chip          | label, hpoId opcional, present, onToggle y onRemove opcionales; botones hermanos                                              |
| Meter         | pct/low/high en 0–100, low ≤ pct ≤ high, label opcional; dato inválido muestra Match unavailable                              |
| EvidenceBadge | level observado/inferido/hipotesis/contradicho                                                                                |
| Button        | atributos nativos, variant primary/secondary/ghost, loading; deshabilitado durante carga                                      |
| Kbd           | tecla y atributos nativos                                                                                                     |
| SampleBadge   | etiqueta explícita Sample case                                                                                                |

Importar desde `web/src/ui` o `@/ui` sólo si el alias existe. El kit exporta default desde `ui/Kit.tsx`; el shell monta ese módulo únicamente con `?ui=kit`.

Verificar desde la raíz con `uv run python web/src/ui/check_kit.py --url http://127.0.0.1:8000`, después de build y con FastAPI iniciado. El script usa Chromium de Playwright, comprueba comportamiento, contraste, teclado, movimiento reducido y ausencia de errores; guarda capturas en el directorio temporal del sistema (`--output` permite cambiarlo). Instalar Chromium con `uv run playwright install chromium` si falta.

## Reglas de producto

1. UI en inglés, frases cortas, sin guiones largos, emojis ni texto de relleno.
2. Datos ficticios o fixtures llevan Sample case. El kit usa el caso publicado PMID 7668832, el ranking API y 300 posiciones HPO reales del fixture; el total es 12,867 enfermedades.
3. Negación combina texto “no”, contorno y tachado. Alternar o quitar tiene nombre accesible propio.
4. El kit permite cambiar chips; avisa que el ejemplo de coincidencia API permanece fijo. No aparentar un recálculo clínico.
5. Porcentajes son coincidencia fenotípica, acompañada del aviso “not a diagnosis”. No representar confianza clínica calibrada.
6. Evidencia expresa nivel con texto, icono y color; enlace a fuente y record_id visibles. Los cuatro ejemplos son estados del componente.
7. Toda vista de datos tiene loading, empty y error con recuperación accionable.
8. No añadir filtros, términos ni vínculos clínicos inventados para mejorar una demo.
9. Evitar scroll horizontal; la vista normal conserva sus slots. El kit tiene lectura natural y adaptación de columnas.
10. Verificar build, contraste, teclado, cambios de estado, consola y capturas antes de entregar. Hero, fotos, testimonios, logos comerciales y formularios de marketing no aplican a esta biblioteca de producto.

## Ola 3 · Lo que pidió el humano de Saus (HACK-028)

Preguntas hechas por Saus a su humano el 3 oct; respuestas resumidas y qué se hizo con cada una.

| # | Pedido del humano | Estado |
|---|---|---|
| 1 | Paleta referente al tema médico: primero blanco con verde (aprobado por Joahan); después azul clínico (#EEF4F9→#DCE9F3, #1E6FD9, #0B2A4A, #8EC5FC, #5ED3D0, #5B7189) | Hecho: tokens de theme.css en azul; acento #1e6fd9; lisosomal pasa a índigo para no confundirse con el acento; AA ≥4.5 en todos los textos |
| 2 | Landing page antes del atlas | En curso como HACK-029 (tarea pedida al planificador) |
| 3 | Los paneles tapan el atlas | Hecho: botón "Focus atlas" (modo presentación) oculta los paneles; Pathway (HACK-024) ocupa la pantalla entera |
| 4 | No se entiende por dónde empezar | Hecho: recorrido de 5 pasos en la cabecera (Symptoms → Matches → Evidence → Pathway → Next steps); la búsqueda (HACK-022) ocupa el centro y la landing (HACK-029) añade el CTA |
| 5 | Galaxias como discos llenos | Hecho: estrellas más finas (1.05 px base) y tonos medios que evitan el azul del acento |
| 6 | Demasiado texto / letra pequeña | Hecho: --text-xs 13 px y --text-sm 15 px; componentes de 10–13 px suben a 13–14 px |
| 7 | Guía de gestos (zoom y desplazarse de lado a lado) | Hecho en HACK-013: guía "How to use gestures", puño y mover = arrastrar, pellizco = zoom |
| 8 | Más wow visual en el atlas y pantallas menos cargadas | Parcial: Focus atlas, estrellas finas, candidatas más grandes en azul; el resto de paneles es de sus tareas |
| 9 | Pathway como protagonista, modo presentación, transiciones, tipografía | Hecho: Pathway a pantalla completa (HACK-024), Focus atlas, entrada de paneles con fundido de 240 ms (sin animación con reduced motion), escala tipográfica mayor |

| 10 | Atlas oscuro, constelaciones con personalidad, vidrio transparente, menos cansado de ver | Hecho: tokens oscuros (AA ≥5.6), paneles de vidrio marino al 62% con blur 24px, galaxias en tonos claros, estrellas reales que titilan con destellos (capa Twinkle), halo turquesa en las candidatas. Rediseño minimalista de dictado/diagnóstico pedido al planificador |
| 11 | Minimalista y transparente como Apple, claro como Codex, asociado a salud (pasada 1-4) | Hecho: sin titileo ni halo (candidatas por tamaño y anillo fino de 1.5 px); superficies neutras gris azulado con borde de 1px y sombra suave; atlas casi monocromo (un gris azulado, sólo cambia la luminosidad); un solo acento (celeste) para acción y selección; con una enfermedad abierta el dictado se oculta (un panel principal); títulos llanos: "Your symptoms", "Matches your symptoms". Descartado: tema claro para paneles (el humano pidió oscuro y rompería la continuidad con la landing) |

Reglas nuevas: usar siempre tokens (bg-surface, text-ink, text-muted, border-line, bg-accent, fill-*/stroke-*), nunca hex fijos; el celeste #8ec5fc (accent) es sólo para acción, selección y candidatas; texto sobre acento en azul marino; la landing conserva el tema claro con su cielo marino; --color-alert (#c2410c) para "contradicted".
Pendiente fuera de este alcance (pedido a sus dueños): colores fijos en diagnosis/style.css y en la onda del dictado; nombres cortos de enfermedades y foco por teclado en el Pathway (notas de joahan-1).
