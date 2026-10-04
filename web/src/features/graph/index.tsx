import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import { createRenderer } from "./cosmosRenderer";
import { Choreography } from "./choreography";
import { loadOverview } from "./data";
import { startDemoSteps } from "./demoSteps";
import { galaxyColors } from "./palette";
import type { GraphOverview, GraphRenderer } from "./types";

type EdgeResult = { edge: { src: string; dst: string } };

// HACK-006 · Constelación: escena 1 y coreografía del wow de docs/FRONTEND-BRIEF.md.
// Lee `ranking` del store (HACK-018 lo escribe) y escribe `selectedId` al hacer clic (HACK-019 lo lee).
export const slot = "stage";
export const order = 0;

// La cámara arranca con el brillo de las candidatas y termina a los 900 ms, como el resto del paso.
const FIT_DELAY_MS = 500;
const FIT_MS = 400;

type Loaded = {
  overview: GraphOverview;
  positions: Float32Array;
  indexById: Map<string, number>;
  groupLabel: Map<string, string>;
};

function prepare(overview: GraphOverview): Loaded {
  const positions = new Float32Array(overview.nodes.length * 2);
  const indexById = new Map<string, number>();
  overview.nodes.forEach((node, i) => {
    positions[i * 2] = node.x;
    positions[i * 2 + 1] = node.y;
    indexById.set(node.id, i);
  });
  const groupLabel = new Map(overview.groups.map((group) => [group.id, group.label]));
  return { overview, positions, indexById, groupLabel };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Constellation() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const choreoRef = useRef<Choreography | null>(null);
  const loopRef = useRef(0);
  const prunedRef = useRef(false); // ¿la constelación muestra una poda que haya que deshacer?
  const ranking = useStore((state) => state.ranking);
  const highlightedEdgeId = useStore((state) => state.highlightedEdgeId);
  const setSelectedId = useStore((state) => state.setSelectedId);

  useEffect(() => {
    let cancelled = false;
    loadOverview()
      .then((overview) => !cancelled && setData(prepare(overview)))
      .catch((reason: unknown) => !cancelled && setError(reason instanceof Error ? reason.message : String(reason)));
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // Bucle de animación: corre sólo mientras la coreografía tenga algo que mover.
  const animate = useCallback(() => {
    cancelAnimationFrame(loopRef.current);
    const tick = (now: number) => {
      const choreo = choreoRef.current;
      const renderer = rendererRef.current;
      if (!choreo || !renderer) return;
      const moving = choreo.step(now);
      renderer.draw(choreo.frame);
      if (moving) loopRef.current = requestAnimationFrame(tick);
    };
    loopRef.current = requestAnimationFrame(tick);
  }, []);

  // Monta el renderer cuando llegan los datos.
  useEffect(() => {
    const container = containerRef.current;
    if (!data || !container) return;
    const { overview, positions } = data;
    const groupsBySize = [...overview.groups].sort((a, b) => b.count - a.count).map((group) => group.id);
    const colors = galaxyColors(groupsBySize);
    const fallback = colors.get(groupsBySize[0]) ?? [0.7, 0.75, 0.85];
    const base = overview.nodes.map((node) => colors.get(node.group) ?? fallback);

    const renderer = createRenderer(container, {
      onHover: (index) => {
        const point = index === null ? null : renderer.toScreen(index);
        setHover(index === null || !point ? null : { index, x: point[0], y: point[1] });
      },
      onClick: (index) => setSelectedId(index === null ? null : overview.nodes[index].id),
    });
    renderer.setPositions(positions);
    const choreo = new Choreography(positions, base);
    rendererRef.current = renderer;
    choreoRef.current = choreo;
    prunedRef.current = false;
    choreo.intro(performance.now(), prefersReducedMotion());
    animate();
    return () => {
      cancelAnimationFrame(loopRef.current);
      renderer.destroy();
      rendererRef.current = null;
      choreoRef.current = null;
    };
  }, [data, animate, setSelectedId]);

  // Poda: cada ranking nuevo dispara la ola y, con 2 candidatas, la cámara encuadra el par.
  useEffect(() => {
    const choreo = choreoRef.current;
    const renderer = rendererRef.current;
    if (!data || !choreo || !renderer) return;
    const indices = ranking
      .map((candidate) => data.indexById.get(candidate.disease_id))
      .filter((index): index is number => index !== undefined);
    // Un ranking vacío sin poda previa no tiene nada que deshacer: no pisar la intro de 1.2 s.
    if (indices.length === 0 && !prunedRef.current) return;
    prunedRef.current = indices.length > 0;
    const candidates = indices.slice(0, 2);
    const reduced = prefersReducedMotion();
    choreo.prune(performance.now(), candidates, indices.slice(2), candidates[0] ?? null, reduced);
    animate();
    const timer = window.setTimeout(
      () => renderer.fitTo(candidates.length === 2 ? candidates : null, reduced ? 0 : FIT_MS),
      reduced ? 0 : FIT_DELAY_MS,
    );
    return () => window.clearTimeout(timer);
  }, [ranking, data, animate]);

  // Demo guiada sin backend de diagnóstico: ?graph=steps recorre diagnose_step_01..05 del contrato.
  useEffect(() => {
    if (!data || new URLSearchParams(window.location.search).get("graph") !== "steps") return;
    return startDemoSteps();
  }, [data]);

  // Cita del inspector (HACK-019): resalta la arista src → dst de GET /api/edge/{id} y la encuadra.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!data || !renderer) return;
    if (!highlightedEdgeId) {
      renderer.setLink(null);
      return;
    }
    let cancelled = false;
    api<EdgeResult>(`/edge/${encodeURIComponent(highlightedEdgeId)}`)
      .then(({ edge }) => {
        const src = data.indexById.get(edge.src);
        const dst = data.indexById.get(edge.dst);
        if (cancelled || src === undefined || dst === undefined) return;
        renderer.setLink([src, dst]);
        renderer.fitTo([src, dst], prefersReducedMotion() ? 0 : FIT_MS);
      })
      .catch(() => !cancelled && renderer.setLink(null));
    return () => {
      cancelled = true;
    };
  }, [highlightedEdgeId, data]);

  const counter = useMemo(() => {
    if (!data) return null;
    const total = data.overview.total_diseases.toLocaleString("en-US");
    const shown = data.overview.nodes.length;
    return shown < data.overview.total_diseases
      ? `${shown.toLocaleString("en-US")} of ${total} rare diseases shown`
      : `${total} rare diseases · ${data.overview.groups.length} body systems`;
  }, [data]);

  const hovered = hover && data ? data.overview.nodes[hover.index] : null;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Polvo estelar estático: tercer plano de profundidad, por debajo de la constelación. */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 45%, rgb(13 122 84 / 0.07), transparent 62%), radial-gradient(1px 1px at 20% 30%, rgb(16 48 42 / 0.12), transparent), radial-gradient(1px 1px at 70% 80%, rgb(16 48 42 / 0.08), transparent), radial-gradient(1px 1px at 85% 15%, rgb(16 48 42 / 0.1), transparent)",
          backgroundSize: "100% 100%, 230px 230px, 310px 310px, 270px 270px",
        }}
      />
      <div ref={containerRef} className="absolute inset-0" aria-label="Rare disease constellation" role="img" />

      {!data && !error && (
        <p role="status" className="absolute inset-0 grid place-items-center font-mono text-xs tracking-wide text-muted">
          <span>Loading constellation</span>
        </p>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="cn-panel px-6 py-5 text-center">
            <p className="text-sm text-ink">The constellation could not load.</p>
            <p className="mt-1 font-mono text-xs text-muted">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAttempt((n) => n + 1);
              }}
              className="mt-4 rounded-full border border-line px-4 py-1.5 text-xs text-ink hover:bg-surface-raised"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* Subtítulo bajo el nombre de la app (cabecera de HACK-028): la derecha queda para los controles. */}
      {counter && (
        <p className="pointer-events-none absolute left-6 top-[3.1rem] font-mono text-xs tabular-nums text-muted">
          {counter}
        </p>
      )}

      {hovered && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-line bg-surface/95 shadow-sm px-2.5 py-1.5 backdrop-blur-md"
          style={{ left: hover.x, top: hover.y - 12 }}
        >
          <p className="max-w-64 truncate text-xs text-ink">{hovered.name}</p>
          <p className="font-mono text-[10px] text-muted">
            {hovered.id} · {data?.groupLabel.get(hovered.group) ?? hovered.group}
          </p>
        </div>
      )}
    </div>
  );
}
