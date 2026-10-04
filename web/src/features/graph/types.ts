// Contrato GraphOverview (app/schemas, HACK-002): sólo los campos que pinta la constelación.
export type OverviewNode = { id: string; name: string; group: string; x: number; y: number };

export type OverviewGroup = { id: string; label: string; count: number; x: number; y: number; r: number };

export type GraphOverview = {
  demo_data: boolean;
  nodes: OverviewNode[];
  groups: OverviewGroup[];
  total_diseases: number;
  displayed_diseases: number;
};

// Lo que el renderer necesita para dibujar: buffers planos, uno por punto, en el orden de `nodes`.
// Por qué: cosmos.gl recibe Float32Array tal cual; el renderer Canvas lee los mismos buffers.
export type Frame = {
  colors: Float32Array; // rgba 0..1, 4 por punto
  sizes: Float32Array; // radio en px de pantalla
};

export interface GraphRenderer {
  /** Posiciones fijas del layout (x, y por punto); se llama una vez. */
  setPositions(positions: Float32Array): void;
  /** Colores y tamaños del cuadro actual; se llama en cada paso de la animación. */
  draw(frame: Frame): void;
  /** Encuadra los puntos indicados (o todos con null) en `durationMs`. */
  fitTo(indices: number[] | null, durationMs: number): void;
  /** Dibuja una arista resaltada entre dos puntos (cita del inspector), o ninguna con null. */
  setLink(pair: [number, number] | null): void;
  /** Coordenadas de pantalla de un punto, para etiquetas HTML. */
  toScreen(index: number): [number, number] | null;
  destroy(): void;
}

export type RendererEvents = {
  onHover: (index: number | null) => void;
  onClick: (index: number | null) => void;
};
