# Constellation: contrato visual

Design Read: una mesa clínica de exploración, con constelación nocturna, datos precisos y un acento cálido que guía la acción.

VARIANCE 4 / MOTION 4 / DENSITY 5. Producto de una vista para escritorio 1440×900 y 1280×720. Tema oscuro fijo, conforme al brief. CSS nativo para componentes y tokens Tailwind v4; no simular otra biblioteca de diseño.

## Paleta y contraste

| Token          | Hex     | Uso                                |
| -------------- | ------- | ---------------------------------- |
| night          | #070b14 | Fondo                              |
| surface        | #111b2b | Panel de vidrio al 96%, blur 12px  |
| surface-raised | #1a273a | Controles                          |
| ink            | #edf2f8 | Texto principal                    |
| muted          | #a5b3c7 | Texto secundario                   |
| line           | #536780 | Líneas no esenciales               |
| accent         | #edc994 | Único acento de selección y acción |
| accent-ink     | #171c25 | Texto sobre acento                 |
| glycosylation  | #9fcac3 | Glicosilación                      |
| lysosomal      | #aabddf | Lisosomal                          |
| structural     | #d5b5c7 | Estructura muscular                |
| membrane       | #a5c9a1 | Membrana                           |
| signaling      | #d3b9a0 | Señalización                       |
| other          | #bac2ce | Otros mecanismos                   |

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
