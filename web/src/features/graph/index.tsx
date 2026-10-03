import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useStore } from "../../lib/store";
import { createRenderer } from "./cosmosRenderer";
import { Choreography } from "./choreography";
import { loadOverview } from "./data";
import { startDemoSteps } from "./demoSteps";
import { galaxyColors } from "./palette";
import type { GraphOverview, GraphRenderer } from "./types";

// HACK-006 · Constelación: escena 1 y coreografía del wow de docs/FRONTEND-BRIEF.md.
// Lee `ranking` del store (HACK-018 lo escribe) y escribe `selectedId` al hacer clic (HACK-019 lo lee).
export const slot = "stage";
export const order = 0;

const FIT_DELAY_MS = 600;
const FIT_MS = 700;
const PARALLAX_PX = 6;

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
  const parallaxRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GraphRenderer | null>(null);
  const choreoRef = useRef<Choreography | null>(null);
  const loopRef = useRef(0);
  const ranking = useStore((state) => state.ranking);
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

  // Parallax mínimo con el cursor (≤ 6 px); sin él con prefers-reduced-motion.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const onMove = (e: PointerEvent) => {
      const dx = (e.clientX / window.innerWidth - 0.5) * 2 * PARALLAX_PX;
      const dy = (e.clientY / window.innerHeight - 0.5) * 2 * PARALLAX_PX;
      if (parallaxRef.current) parallaxRef.current.style.transform = `translate3d(${-dx}px, ${-dy}px, 0)`;
    };
    window.addEventListener("pointermove", onMove);
    return () => window.removeEventListener("pointermove", onMove);
  }, []);

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
            "radial-gradient(ellipse at 50% 45%, rgb(40 60 110 / 0.22), transparent 60%), radial-gradient(1px 1px at 20% 30%, rgb(255 255 255 / 0.18), transparent), radial-gradient(1px 1px at 70% 80%, rgb(255 255 255 / 0.12), transparent), radial-gradient(1px 1px at 85% 15%, rgb(255 255 255 / 0.14), transparent)",
          backgroundSize: "100% 100%, 230px 230px, 310px 310px, 270px 270px",
        }}
      />
      <div ref={parallaxRef} className="absolute -inset-2 transition-transform duration-300 ease-out">
        <div ref={containerRef} className="absolute inset-0" aria-label="Rare disease constellation" role="img" />
      </div>

      {!data && !error && (
        <p className="absolute inset-0 grid place-items-center font-mono text-xs tracking-wide text-zinc-500">
          <span className="animate-pulse">Loading constellation</span>
        </p>
      )}

      {error && (
        <div className="absolute inset-0 grid place-items-center">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-6 py-5 text-center backdrop-blur-md">
            <p className="text-sm text-zinc-200">The constellation could not load.</p>
            <p className="mt-1 font-mono text-xs text-zinc-500">{error}</p>
            <button
              type="button"
              onClick={() => {
                setError(null);
                setAttempt((n) => n + 1);
              }}
              className="mt-4 rounded-full border border-white/15 px-4 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {counter && (
        <p className="pointer-events-none absolute right-6 top-6 font-mono text-xs tabular-nums text-zinc-500">
          {counter}
        </p>
      )}

      {hovered && hover && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-[#0c1220]/85 px-2.5 py-1.5 backdrop-blur-md"
          style={{ left: hover.x - 8, top: hover.y - 20 }}
        >
          <p className="max-w-64 truncate text-xs text-zinc-100">{hovered.name}</p>
          <p className="font-mono text-[10px] text-zinc-500">
            {hovered.id} · {data?.groupLabel.get(hovered.group) ?? hovered.group}
          </p>
        </div>
      )}
    </div>
  );
}
