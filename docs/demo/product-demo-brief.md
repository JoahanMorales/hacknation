# Constellation — Brief para escribir el guion del Product Demo

Este documento describe el producto y el recorrido que debe convertirse en video. Es un brief para el agente que escribirá el guion; no es evidencia de una grabación terminada.

## 1. Entrega que necesitamos

- **Video:** Product demo, separado de Team introduction y Technical walkthrough.
- **Duración objetivo:** 55 segundos; máximo permitido: 60 segundos.
- **Formato de entrega del video:** MP4 o MOV, hasta 1 GB.
- **Narración propuesta:** inglés natural, porque la interfaz está en inglés. El brief está en español para coordinar la grabación.
- **Contenido:** pantalla real del producto, acciones visibles y una historia breve. Evitar una presentación de arquitectura o una lista de funciones.
- **Proyecto:** Constellation.
- **Challenge:** 05 — AI Atlas for the World's Rare Diseases.
- **Repositorio:** https://github.com/JoahanMorales/hacknation

Los límites de video provienen de las capturas de la plataforma proporcionadas por el usuario. La entrega del evento requiere tres clips distintos; este brief cubre únicamente Product demo.

## 2. Qué es el producto y para quién sirve

Constellation es un atlas de enfermedades raras que conecta enfermedades, genes, mecanismos, evidencia y recursos de investigación. Ayuda a pasar de una búsqueda a una siguiente conversación concreta con una comunidad, registro o colaborador existente.

La protagonista de esta demo es **Maria, líder de una organización de pacientes**. Es una persona ilustrativa para contar la historia, no una usuaria entrevistada ni un testimonio real. Necesita encontrar qué evidencia existe para su enfermedad, quién ya trabaja en ella y qué pregunta llevar a una posible colaboración.

El resultado visible debe ser: **una ruta sustentada en evidencia, un recurso existente y un borrador de colaboración con fuentes y preguntas para revisión experta**.

## 3. Caso elegido

Usaremos una búsqueda explícita de **LGMD2I**, que abre **FKRP-related limb-girdle muscular dystrophy R9**, identificador **ORPHA:34515**, asociada al gen **FKRP**.

Elegimos este caso porque permite mostrar identidad de la enfermedad, mecanismo, conexiones, comunidades y un registro existente en un recorrido corto. Buscar directamente `FKRP` puede abrir el resultado del gen y cambiar el punto de entrada; para este guion usar `LGMD2I` y seleccionar el resultado de enfermedad.

## 4. Recorrido de pantalla y presupuesto de tiempo

Entrar al atlas antes de empezar el cronómetro. Desde la portada, usar **Start with a disease, a gene or a symptom**; la vista del atlas usa `/?view=atlas`. Mantener los gestos desactivados y evitar hacer zoom o mover el mapa sin propósito.

| Tiempo objetivo | Acción del operador | Qué debe entender el espectador |
|---|---|---|
| 0–8 s | En **Search the atlas**, escribir `LGMD2I` y seleccionar la enfermedad. | Maria empieza con un nombre de enfermedad y encuentra su registro. Introducir el problema en una frase. |
| 8–20 s | Mostrar el inspector: enfermedad, **ORPHA:34515**, gen **FKRP**, mecanismo y una fuente visible. | El producto conecta la identidad con evidencia sobre el mecanismo de transferencia de ribitol-fosfato y glicosilación. Simplificar la locución; no leer todos los términos técnicos. |
| 20–33 s | Pulsar **Open pathway: genes, mechanism, communities**. Mostrar una conexión legible y su evidencia/fuente. | El mapa permite examinar relaciones entre enfermedades, mecanismos y comunidades. Una relación sirve para investigar; no prueba que un tratamiento pueda transferirse. |
| 33–43 s | Pulsar **Next steps**. Mostrar **Who is already working on this** y un recurso existente. | Maria encuentra un punto de partida concreto: por ejemplo, **Global FKRP Registry**, **CureLGMD2i** o **LGMD Awareness Foundation**, según lo visible en la versión grabada. |
| 43–55 s | Pulsar **Draft a proposal**. Mostrar **Collaboration proposal**, **Questions for expert review**, **Sources** y, si cabe, **Copy with sources**. | El recorrido termina con un borrador que conserva fuentes y preguntas para una conversación con expertos o colaboradores. |

Los tiempos son un presupuesto editorial, no un ensayo humano ya medido. Priorizar una conexión y un recurso; no recorrer todos los nodos ni leer toda la propuesta. Si copiar falla, mostrar el borrador y sus fuentes; **Print** o selección de texto son alternativas disponibles.

## 5. Qué es real, qué es muestra y qué puede afirmarse

- La búsqueda, navegación, inspector, recursos y vista de propuesta se han recorrido en una versión candidata del producto. Confirmar el recorrido completo en la versión final antes de grabar; la candidatura no equivale a aceptación final.
- El atlas contiene **12,867 registros de enfermedades** en el dataset fijado. Es opcional mencionarlo; el resultado para Maria importa más que la cifra.
- Las conexiones incluyen niveles de evidencia y fuentes. Distinguir lo observado, inferido o hipotético cuando lo indique la interfaz.
- La ruta de grabación puede usar `DEMO_MODE=true`. En ese modo la propuesta es una **muestra grabada etiquetada**, no una generación en vivo. Dejar su etiqueta visible y describirla como un borrador de muestra si se narra su generación.
- El registro y las organizaciones son recursos del dataset. No afirmar que un estudio está reclutando actualmente ni que ya existe una colaboración acordada.
- La propuesta es un punto de partida para revisión experta. No es asesoría clínica, un resultado científico validado ni un compromiso de la organización citada.
- No se ha medido una mejora de **10×**, ni precisión clínica prospectiva, ni eficacia terapéutica. Hablar de ayudar a encontrar el siguiente paso, sin inventar resultados.

## 6. Funciones que pueden omitirse en este clip

Constellation también tiene una ruta clínica con **Play sample case**, síntomas revisables, hallazgos negados, ranking por fenotipo y una siguiente pregunta. El caso publicado de muestra es de **Pompe**. Ese caso **no diagnostica FKRP**: si se muestran ambos, la transición debe decir que FKRP se eligió explícitamente como otro ejemplo.

Para este video de 55 segundos recomendamos centrar todo el recorrido en Maria y FKRP. El dictado en vivo, el caso Pompe y la arquitectura pueden ir en otros clips o en una demo más larga. No depender del micrófono para esta grabación urgente. Los porcentajes del ranking son coincidencias fenotípicas, no probabilidades clínicas.

## 7. Preparación para grabar

1. Abrir la versión que se entregará y ensayar la ruta exacta con cronómetro. Comprobar que búsqueda, etiquetas del mapa, recursos y propuesta se leen bien.
2. Usar una ventana limpia, por ejemplo 1280×720 o 1440×900, con zoom del navegador al 100 %. Cerrar paneles que tapen el contenido.
3. Confirmar qué modo se está usando y conservar las etiquetas de muestra. No editar la toma para simular una respuesta instantánea en vivo.
4. Grabar acciones pausadas y visibles. Mantener fuentes en pantalla; no reemplazarlas con afirmaciones comerciales.
5. Reproducir el archivo exportado completo: comprobar audio, legibilidad y duración de hasta 60 segundos.

## 8. Petición lista para enviar al agente del guion

> Con este brief, crea un guion de Product demo para Constellation de 55 segundos, con máximo absoluto de 60. Usa narración en inglés natural, aproximadamente 110–125 palabras, ajustándola al ritmo real de lectura. La historia es Maria, líder de una organización de pacientes, que busca LGMD2I/FKRP, inspecciona evidencia, abre Pathway, identifica un registro o comunidad existente y termina con una propuesta con fuentes y preguntas para expertos. Entrega una tabla con segundos, acción exacta en pantalla, locución y texto breve superpuesto si aporta claridad. Incluye la locución completa aparte para leerla al grabar, su número de palabras y una lista corta de preparación. No incluyas Team introduction ni Technical walkthrough. No inventes resultados clínicos, velocidad 10×, testimonios o funciones. Si la propuesta utiliza la muestra etiquetada, dilo sin presentarla como generación en vivo. Conserva las fuentes y no mezcles el caso Pompe con un supuesto diagnóstico de FKRP. Si alguna parte no cabe, recorta detalles secundarios y conserva el recorrido hasta el siguiente paso concreto.
