import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import { createRenderer } from "./cosmosRenderer";
import { Choreography } from "./choreography";
import { loadOverview } from "./data";
import { startDemoSteps } from "./demoSteps";
import { galaxyColors, type Rgb } from "./palette";
import { Twinkle } from "./Twinkle";
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
  const [marks, setMarks] = useState<{ id: string; name: string; pct: number; x: number; y: number }[]>([]);
  const [sky, setSky] = useState<{ renderer: GraphRenderer; colors: Rgb[] } | null>(null);
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
    setSky({ renderer, colors: base });
    return () => {
      setSky(null);
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

  // Marcas de las 2 candidatas (Ola 3: "que el match se entienda"): anillo + nombre + % junto a cada
  // estrella, siguiendo la cámara. Sólo aparecen cuando la ola termina (600 ms) para no competir con ella.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!data || !renderer) return;
    const top = ranking
      .slice(0, 2)
      .map((candidate) => ({ candidate, index: data.indexById.get(candidate.disease_id) }))
      .filter((item): item is { candidate: (typeof ranking)[number]; index: number } => item.index !== undefined);
    if (top.length === 0) return;
    let frame = 0;
    let last = "";
    const follow = () => {
      const next = top.flatMap(({ candidate, index }) => {
        const point = renderer.toScreen(index);
        return point ? [{ id: candidate.disease_id, name: candidate.name, pct: candidate.pct, x: point[0], y: point[1] }] : [];
      });
      const key = next.map((mark) => `${Math.round(mark.x)},${Math.round(mark.y)}`).join("|");
      if (key !== last) {
        last = key;
        setMarks(next);
      }
      frame = requestAnimationFrame(follow);
    };
    const start = window.setTimeout(() => (frame = requestAnimationFrame(follow)), prefersReducedMotion() ? 0 : FIT_DELAY_MS);
    return () => {
      window.clearTimeout(start);
      cancelAnimationFrame(frame);
    };
  }, [ranking, data]);

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
      {/* Cielo profundo: azul marino con nebulosas celeste y turquesa muy tenues y polvo estelar fijo
          (decorativo, 1 px y casi transparente: no se confunde con una enfermedad). */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 60% 50% at 50% 48%, rgb(18 54 92 / 0.9), transparent 70%), radial-gradient(ellipse 35% 30% at 22% 30%, rgb(142 197 252 / 0.10), transparent 70%), radial-gradient(ellipse 30% 28% at 78% 70%, rgb(94 211 208 / 0.08), transparent 70%), radial-gradient(1px 1px at 20% 30%, rgb(238 244 249 / 0.35), transparent), radial-gradient(1px 1px at 70% 80%, rgb(238 244 249 / 0.25), transparent), radial-gradient(1px 1px at 85% 15%, rgb(238 244 249 / 0.3), transparent)",
          backgroundSize: "100% 100%, 100% 100%, 100% 100%, 230px 230px, 310px 310px, 270px 270px",
        }}
      />
      <div ref={containerRef} className="absolute inset-0" aria-label="Rare disease constellation" role="img" />
      <Twinkle renderer={sky?.renderer ?? null} count={sky?.colors.length ?? 0} colors={sky?.colors ?? []} quiet={ranking.length > 0} />

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

      {/* Sin ranking no hay marcas, aunque queden las del último cuadro calculado. */}
      {ranking.length > 0 && marks.length > 0 && <CandidateMarks marks={marks.filter((mark) => ranking.some((c) => c.disease_id === mark.id))} />}

      {hovered && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-accent/20 bg-surface/80 px-2.5 py-1.5 shadow-panel backdrop-blur-xl"
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

// Halo turquesa y anillo celeste sobre cada candidata y una etiqueta legible al lado; si hay dos, una línea tenue las une.
function CandidateMarks({ marks }: { marks: { id: string; name: string; pct: number; x: number; y: number }[] }) {
  const [a, b] = marks;
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {a && b && (
        <svg className="absolute inset-0 h-full w-full">
          <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} className="stroke-accent/40" strokeWidth={1.5} strokeDasharray="4 6" />
        </svg>
      )}
      {marks.map((mark, rank) => {
        // Etiqueta centrada encima de la estrella: hacia los lados quedaba tapada por el dictado o el
        // inspector. Si las dos estrellas están cerca, la segunda va debajo para no encimarse.
        const below = rank === 1 && b !== undefined && Math.abs(a.x - b.x) < 300;
        return (
          <div key={mark.id} className="absolute" style={{ left: mark.x, top: mark.y }}>
            <span className="absolute -left-10 -top-10 size-20 rounded-full bg-[radial-gradient(circle,rgb(94_211_208/0.35),transparent_65%)]" />
            <span className="absolute -left-4 -top-4 size-8 rounded-full border-2 border-accent bg-accent/10 shadow-[0_0_18px_rgb(142_197_252/0.55)]" />
            <div
              className={`absolute left-0 flex -translate-x-1/2 flex-col items-center rounded-[14px] border border-accent/25 bg-surface/70 px-3.5 py-2.5 text-center shadow-panel backdrop-blur-xl ${
                below ? "top-8" : "bottom-8"
              }`}
            >
              <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">{rank === 0 ? "Top match" : "Second match"}</span>
              <span className="max-w-[15rem] truncate text-sm font-medium text-ink">{mark.name}</span>
              <span className="font-mono text-xs tabular-nums text-glycosylation">{mark.pct.toFixed(1)}% phenotype match</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
