import sampleOverviewUrl from "../../../../app/fixtures/api/graph_overview.json?url";
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../lib/api";
import { loadSampleCase } from "./sample";

// El cielo de la landing: la constelación REAL (GET /api/graph/overview, una estrella por enfermedad)
// sobre azul marino, y el caso publicado (PMID 7668832, POST /api/diagnose) que la reduce a dos
// coincidencias. Personalidad de las estrellas (pedido del humano): brillo que titila, destellos en
// cruz y halo en las dos candidatas, sólo con los colores de la paleta. Canvas 2D: el fondo de
// estrellas se pinta una vez en un lienzo aparte y cada cuadro sólo anima unas cientos.
// Las features no se importan entre sí: tipos y carga propios.

type Node = { id: string; group: string; x: number; y: number };
type Overview = { nodes: Node[]; total_diseases: number; demo_data: boolean };
type Ranked = { disease_id: string; name: string; pct: number };
export type Match = Ranked & { x: number; y: number };

const json = <T,>(url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) throw new Error(`${url} ${response.status}`);
    return response.json() as Promise<T>;
  });

const TINTS = [
  [255, 255, 255],
  [142, 197, 252], // #8EC5FC
  [94, 211, 208], // #5ED3D0
  [142, 197, 252],
] as const;

// Ciclo del cielo: completo → poda → dos coincidencias → vuelve a abrirse.
const FULL_MS = 3200;
const PRUNE_MS = 900;
const HOLD_MS = 5200;
const CYCLE_MS = FULL_MS + PRUNE_MS + HOLD_MS + PRUNE_MS;
const TWINKLERS = 320;
const SPARKLES = 12;

const ease = (t: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);

function pruneAt(time: number): number {
  const t = time % CYCLE_MS;
  if (t < FULL_MS) return 0;
  if (t < FULL_MS + PRUNE_MS) return ease((t - FULL_MS) / PRUNE_MS);
  if (t < FULL_MS + PRUNE_MS + HOLD_MS) return 1;
  return 1 - ease((t - FULL_MS - PRUNE_MS - HOLD_MS) / PRUNE_MS);
}

type State =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; overview: Overview; ranking: Ranked[] };

export function Sky({ onReady }: { onReady?: (info: { total: number; demo: boolean }) => void }) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<State>({ status: "loading" });
  const [matches, setMatches] = useState<Match[]>([]);
  const [narrow, setNarrow] = useState(false);
  const onReadyRef = useRef(onReady);
  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const overview = await api<Overview>("/graph/overview").catch(() => json<Overview>(sampleOverviewUrl));
        let ranking: Ranked[] = [];
        try {
          const sample = await loadSampleCase();
          const terms = sample.terms.map(({ hpo_id, label, present }) => ({ hpo_id, label, present }));
          const result = await api<{ ranking: Ranked[] }>("/diagnose", { method: "POST", body: JSON.stringify({ terms }) });
          ranking = result.ranking.slice(0, 2);
        } catch {
          ranking = []; // sin backend: el cielo titila, sin candidatas inventadas
        }
        if (!alive) return;
        setState({ status: "ready", overview, ranking });
        onReadyRef.current?.({ total: overview.total_diseases, demo: overview.demo_data });
      } catch {
        if (alive) setState({ status: "error" });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (state.status !== "ready") return;
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!wrap || !canvas || !ctx) return;
    const { nodes } = state.overview;
    const groups = [...new Set(nodes.map((node) => node.group))];
    const tintOf = new Map(groups.map((group, i) => [group, TINTS[i % TINTS.length]]));
    const candidateIndex = state.ranking.map((rank) => nodes.findIndex((node) => node.id === rank.disease_id));

    // Estrellas que titilan y destellos: elegidas una vez, fuera de las candidatas.
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const pick = (count: number) =>
      Array.from({ length: Math.min(count, nodes.length) }, () => Math.floor(random() * nodes.length)).filter(
        (i) => !candidateIndex.includes(i),
      );
    const twinklers = pick(TWINKLERS).map((i) => ({ i, phase: random() * Math.PI * 2, speed: 0.6 + random() * 1.4 }));
    const sparkles = pick(SPARKLES).map((i) => ({ i, phase: random() * Math.PI * 2 }));

    const base = document.createElement("canvas");
    const bctx = base.getContext("2d")!;
    let px = new Float32Array(0);
    let py = new Float32Array(0);
    let dpr = 1;
    let frame = 0;
    let visible = true;
    let lastNarrow = false;

    const layout = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { width, height } = wrap.getBoundingClientRect();
      canvas.width = base.width = Math.max(1, Math.round(width * dpr));
      canvas.height = base.height = Math.max(1, Math.round(height * dpr));
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const node of nodes) {
        minX = Math.min(minX, node.x); maxX = Math.max(maxX, node.x);
        minY = Math.min(minY, node.y); maxY = Math.max(maxY, node.y);
      }
      const pad = 0.08;
      const scale = Math.min((width * (1 - 2 * pad)) / (maxX - minX || 1), (height * (1 - 2 * pad)) / (maxY - minY || 1));
      const ox = (width - (maxX - minX) * scale) / 2;
      const oy = (height - (maxY - minY) * scale) / 2;
      px = new Float32Array(nodes.length);
      py = new Float32Array(nodes.length);
      nodes.forEach((node, i) => {
        px[i] = (ox + (node.x - minX) * scale) * dpr;
        py[i] = (oy + (node.y - minY) * scale) * dpr;
      });
      // Fondo: todas las estrellas, tenues, una sola vez por tamaño.
      bctx.clearRect(0, 0, base.width, base.height);
      const r = (nodes.length > 2000 ? 0.75 : 1.4) * dpr;
      nodes.forEach((node, i) => {
        const [cr, cg, cb] = tintOf.get(node.group)!;
        bctx.fillStyle = `rgb(${cr} ${cg} ${cb} / 0.62)`;
        bctx.beginPath();
        bctx.arc(px[i], py[i], r, 0, Math.PI * 2);
        bctx.fill();
      });
      setMatches(
        state.ranking.flatMap((rank, k) =>
          candidateIndex[k] >= 0 ? [{ ...rank, x: px[candidateIndex[k]] / dpr, y: py[candidateIndex[k]] / dpr }] : [],
        ),
      );
    };

    const star = (x: number, y: number, radius: number, rgb: readonly number[], alpha: number) => {
      ctx.fillStyle = `rgb(${rgb[0]} ${rgb[1]} ${rgb[2]} / ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    };

    const draw = (time: number) => {
      const prune = reduced ? 1 : candidateIndex.some((i) => i >= 0) ? pruneAt(time) : 0;
      const isNarrow = prune > 0.85;
      if (isNarrow !== lastNarrow) {
        lastNarrow = isNarrow;
        setNarrow(isNarrow);
      }
      const fade = 1 - prune * 0.82;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = fade;
      ctx.drawImage(base, 0, 0);
      ctx.globalAlpha = 1;

      // Titileo: cada estrella respira a su ritmo.
      for (const { i, phase, speed } of twinklers) {
        const glow = 0.5 + 0.5 * Math.sin((time / 1000) * speed + phase);
        star(px[i], py[i], (0.9 + glow * 0.9) * dpr, tintOf.get(nodes[i].group)!, (0.25 + glow * 0.75) * fade);
      }
      // Destellos en cruz, como estrellas brillantes en una placa del cielo.
      for (const { i, phase } of sparkles) {
        const glow = (0.55 + 0.45 * Math.sin(time / 1400 + phase)) * fade;
        const len = (7 + glow * 7) * dpr;
        const grad = ctx.createRadialGradient(px[i], py[i], 0, px[i], py[i], len);
        grad.addColorStop(0, `rgb(255 255 255 / ${0.9 * glow})`);
        grad.addColorStop(1, "rgb(142 197 252 / 0)");
        ctx.strokeStyle = grad;
        ctx.lineWidth = dpr;
        ctx.beginPath();
        ctx.moveTo(px[i] - len, py[i]); ctx.lineTo(px[i] + len, py[i]);
        ctx.moveTo(px[i], py[i] - len); ctx.lineTo(px[i], py[i] + len);
        ctx.stroke();
        star(px[i], py[i], 1.6 * dpr, [255, 255, 255], glow);
      }
      // Las dos coincidencias: halo turquesa, anillo celeste y núcleo blanco que crecen con la poda.
      candidateIndex.forEach((i, k) => {
        if (i < 0) return;
        const grow = prune;
        const pulse = reduced ? 1 : 0.85 + 0.15 * Math.sin(time / 600 + k);
        const halo = (10 + 22 * grow * pulse) * dpr;
        const grad = ctx.createRadialGradient(px[i], py[i], 0, px[i], py[i], halo);
        grad.addColorStop(0, `rgb(94 211 208 / ${0.15 + 0.45 * grow})`);
        grad.addColorStop(1, "rgb(94 211 208 / 0)");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px[i], py[i], halo, 0, Math.PI * 2);
        ctx.fill();
        if (grow > 0.05) {
          ctx.strokeStyle = `rgb(142 197 252 / ${grow})`;
          ctx.lineWidth = 1.5 * dpr;
          ctx.beginPath();
          ctx.arc(px[i], py[i], (6 + 6 * grow) * dpr, 0, Math.PI * 2);
          ctx.stroke();
        }
        star(px[i], py[i], (1.4 + 2.4 * grow) * dpr, [255, 255, 255], 0.7 + 0.3 * grow);
      });
    };

    const loop = (time: number) => {
      if (visible) draw(time);
      frame = requestAnimationFrame(loop);
    };

    layout();
    if (reduced) draw(0);
    else frame = requestAnimationFrame(loop);
    const resize = new ResizeObserver(() => {
      layout();
      if (reduced) draw(0);
    });
    resize.observe(wrap);
    // Fuera de pantalla no se anima: la landing sigue a 60 fps al hacer scroll.
    const io = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    io.observe(wrap);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      io.disconnect();
    };
  }, [state, reduced]);

  return (
    <div ref={wrapRef} className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" aria-hidden />
      {state.status === "loading" && (
        <p role="status" className="absolute inset-0 grid place-items-center font-mono text-sm text-[#8EC5FC]">
          Loading the constellation
        </p>
      )}
      {state.status === "error" && (
        <p role="status" className="absolute inset-0 grid place-items-center px-6 text-center text-sm text-white">
          The constellation could not load. Open the atlas to try again.
        </p>
      )}
      {matches.map((match, k) => {
        // Hacia fuera: la de la izquierda abre su etiqueta a la izquierda y la otra a la derecha.
        const right = matches.length === 2 ? match.x > Math.min(matches[0].x, matches[1].x) : true;
        return (
          <div
            key={match.disease_id}
            className="lp-match pointer-events-none absolute"
            data-on={narrow || undefined}
            style={{
              left: match.x,
              top: match.y,
              transform: `translate(${right ? "22px" : "calc(-100% - 22px)"}, -50%)`,
            }}
          >
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8EC5FC]">
              {k === 0 ? "Top match" : "Second match"}
            </span>
            <span className="block max-w-[15rem] truncate text-sm font-medium text-white">{match.name}</span>
            <span className="font-mono text-xs tabular-nums text-[#5ED3D0]">{match.pct.toFixed(1)}% phenotype match</span>
          </div>
        );
      })}
    </div>
  );
}
