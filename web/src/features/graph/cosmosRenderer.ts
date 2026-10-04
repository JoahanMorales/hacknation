import { Graph } from "@cosmos.gl/graph";

import { createCanvasRenderer } from "./canvasRenderer";
import type { Frame, GraphRenderer, RendererEvents } from "./types";

// Renderer principal: cosmos.gl dibuja y anima en la GPU (12,867 puntos sin esfuerzo).
// La simulación está apagada: las posiciones vienen fijas del layout de HACK-003.
// @cosmos.gl/graph es MIT (proyecto cosmos.gl de la OpenJS Foundation).

const SIZE_SCALE = 1.0; // los tamaños de la coreografía están pensados en px del renderer Canvas

export function createCosmosRenderer(container: HTMLElement, events: RendererEvents): GraphRenderer {
  const div = document.createElement("div");
  div.className = "absolute inset-0";
  container.appendChild(div);

  const graph = new Graph(div, {
    enableSimulation: false,
    backgroundColor: [0, 0, 0, 0],
    pixelRatio: Math.min(2, window.devicePixelRatio || 1),
    transitionDuration: 0, // la coreografía anima cuadro a cuadro; cosmos sólo dibuja
    scalePointsOnZoom: true,
    renderLinks: true,
    linkDefaultWidth: 2,
    curvedLinks: true,
    // Sólo hay una arista a la vez (la citada): que no se desvanezca por larga.
    linkVisibilityDistanceRange: [1e6, 2e6],
    renderHoveredPointRing: true,
    hoveredPointRingColor: [0.04, 0.16, 0.29, 0.9],
    hoveredPointCursor: "pointer",
    fitViewOnInit: true,
    fitViewDelay: 0,
    fitViewPadding: 0.12,
    attribution: "",
    onPointMouseOver: (index) => events.onHover(index),
    onPointMouseOut: () => events.onHover(null),
    onClick: (index) => events.onClick(index ?? null),
  });

  let spacePositions: number[] | null = null;
  let sizes = new Float32Array(0);
  let destroyed = false;

  return {
    setPositions(positions) {
      graph.setPointPositions(positions);
      spacePositions = null;
      graph.render(undefined, 0);
    },
    draw(frame: Frame) {
      if (destroyed) return;
      if (sizes.length !== frame.sizes.length) sizes = new Float32Array(frame.sizes.length);
      for (let i = 0; i < sizes.length; i++) sizes[i] = frame.sizes[i] * SIZE_SCALE;
      graph.setPointColors(frame.colors);
      graph.setPointSizes(sizes);
      graph.render(undefined, 0);
    },
    setLink(pair) {
      graph.setLinks(new Float32Array(pair ?? []));
      if (pair) graph.setLinkColors(new Float32Array([0.12, 0.44, 0.85, 0.9]));
      graph.render(undefined, 0);
    },
    fitTo(indices, durationMs) {
      if (indices && indices.length) graph.fitViewByPointIndices(indices, durationMs, 0.38, false);
      else graph.fitView(durationMs, 0.12, false);
    },
    toScreen(index) {
      spacePositions ??= graph.getPointPositions();
      const x = spacePositions[index * 2];
      const y = spacePositions[index * 2 + 1];
      if (x === undefined || Number.isNaN(x)) return null;
      return graph.spaceToScreenPosition([x, y]);
    },
    destroy() {
      destroyed = true;
      graph.destroy();
      div.remove();
    },
  };
}

function supportsWebGL2(): boolean {
  try {
    return Boolean(document.createElement("canvas").getContext("webgl2"));
  } catch {
    return false;
  }
}

/**
 * cosmos.gl por defecto; Canvas 2D si el navegador no tiene WebGL2 (plan B del proyector) o si la
 * URL lleva ?renderer=canvas para ensayarlo.
 */
export function createRenderer(container: HTMLElement, events: RendererEvents): GraphRenderer {
  const forced = new URLSearchParams(window.location.search).get("renderer");
  if (forced === "canvas" || !supportsWebGL2()) return createCanvasRenderer(container, events);
  return createCosmosRenderer(container, events);
}
