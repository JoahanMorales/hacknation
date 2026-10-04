import { ArrowLeft, ArrowRight, ArrowSquareOut } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState } from "react";

import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import { Button, EvidenceBadge, type EvidenceLevel } from "../../ui";
import { EDGE_LABEL, type Evidence, layout, NOTABLE_EDGES, type NodeType, type Pathway, type PathwayEdge, type Placed } from "./layout";

// HACK-024 · Pathway Navigator: el subgrafo tipado alrededor de la enfermedad (GET /api/pathway/{id},
// HACK-023) ocupa la pantalla. Forma por tipo de nodo, trazo por nivel de evidencia, clic en arista =
// resumen + fuente, clic en enfermedad = nuevo centro, "Next steps" lleva a la acción.
export const slot = "overlay";
export const order = 50;

const EASE = [0.16, 1, 0.3, 1] as const;
const BADGE: Record<Evidence, EvidenceLevel> = {
  observado: "observado",
  inferido: "inferido",
  hipotesis: "hipotesis",
  contradictorio: "contradicho",
};
// Trazo por evidencia (leyenda): sólido, discontinuo, punteado y color de alerta.
const STROKE: Record<Evidence, { className: string; dash?: string }> = {
  observado: { className: "stroke-ink/45" },
  inferido: { className: "stroke-lysosomal", dash: "7 5" },
  hipotesis: { className: "stroke-signaling", dash: "1.5 5" },
  contradictorio: { className: "stroke-red-500" },
};
const TYPE_NAME: Record<NodeType, string> = {
  disease: "Disease",
  gene: "Gene",
  mechanism: "Mechanism",
  group: "Patient group",
  asset: "Registry, study or trial",
  investigator: "Investigator",
};
const TYPE_FILL: Record<NodeType, string> = {
  disease: "fill-surface-raised",
  gene: "fill-glycosylation",
  mechanism: "fill-lysosomal",
  group: "fill-membrane",
  asset: "fill-signaling",
  investigator: "fill-other",
};

type Status = "loading" | "ready" | "error";
type Selection = { kind: "edge"; edge: PathwayEdge } | { kind: "node"; node: Placed } | null;

export default function PathwayNavigator() {
  const step = useStore((state) => state.step);
  const selectedId = useStore((state) => state.selectedId);
  if (step !== "pathway" || !selectedId) return null;
  return <Navigator key={selectedId} initialCenter={selectedId} />;
}

function Navigator({ initialCenter }: { initialCenter: string }) {
  const reduced = useReducedMotion() ?? false;
  const [center, setCenter] = useState(initialCenter);
  const [data, setData] = useState<Pathway | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [notice, setNotice] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<Pathway>(`/pathway/${encodeURIComponent(center)}`)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setStatus("ready");
        setNotice(null);
        // Si se llegó desde una cita del inspector, se abre esa arista.
        const cited = useStore.getState().highlightedEdgeId;
        const edge = cited ? result.edges.find((item) => item.curated_edge_id === cited || item.id === cited) : undefined;
        setSelection(edge ? { kind: "edge", edge } : null);
      })
      .catch(() => {
        if (cancelled) return;
        if (data) setNotice("No curated pathway for that disease yet. The map stays here.");
        else setStatus("error");
      });
    return () => {
      cancelled = true;
    };
    // `data` sólo decide el mensaje de error; no debe volver a pedir el subgrafo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [center, attempt]);

  const placed = useMemo(() => (data ? layout(data) : []), [data]);
  const byId = useMemo(() => new Map(placed.map((node) => [node.id, node])), [placed]);
  const centerNode = byId.get(data?.center ?? "");

  const close = () => useStore.getState().setStep("inspector");
  const recenter = (node: Placed) => {
    if (node.type !== "disease" || node.id === data?.center) return;
    setCenter(node.id);
    useStore.getState().setSelectedId(node.id);
  };
  const isActive = (edge: PathwayEdge) =>
    !hovered || edge.src === hovered || edge.dst === hovered || (selection?.kind === "edge" && selection.edge.id === edge.id);

  return (
    <motion.section
      aria-label="Pathway navigator"
      className="pointer-events-auto fixed inset-0 z-30 flex flex-col bg-night/95 backdrop-blur-sm"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      <header className="flex items-center gap-4 border-b border-line/40 px-6 py-4">
        <Button variant="ghost" onClick={close} aria-label="Back to the disease">
          <ArrowLeft size={18} aria-hidden /> Back
        </Button>
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs text-muted">Pathway · genes, mechanisms and communities</p>
          <h2 className="truncate text-lg font-medium text-ink">{centerNode?.label ?? center}</h2>
        </div>
        <Button onClick={() => useStore.getState().setStep("action")}>
          Next steps <ArrowRight size={18} aria-hidden />
        </Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {status === "loading" && <p className="absolute inset-0 grid place-items-center font-mono text-sm text-muted">Loading pathway</p>}
          {status === "error" && (
            <div className="absolute inset-0 grid place-items-center">
              <div className="cn-panel max-w-sm p-5 text-center">
                <p className="text-sm text-ink">The pathway could not load.</p>
                <p className="mt-1 text-xs text-muted">Only curated diseases have a pathway today.</p>
                <div className="mt-4 flex justify-center gap-2">
                  <Button variant="secondary" onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
                  <Button variant="ghost" onClick={close}>Back</Button>
                </div>
              </div>
            </div>
          )}
          {status === "ready" && data && (
            <svg viewBox="-500 -455 1000 920" className="absolute inset-0 h-full w-full" role="img" aria-label={`Pathway around ${centerNode?.label ?? center}`}>
              {/* Anillos guía, muy tenues. */}
              {[150, 285, 400].map((r) => (
                <circle key={r} r={r} className="fill-none stroke-line/25" strokeWidth={1} />
              ))}
              <g>
                {data.edges.map((edge) => {
                  const a = byId.get(edge.src);
                  const b = byId.get(edge.dst);
                  if (!a || !b) return null;
                  const chosen = selection?.kind === "edge" && selection.edge.id === edge.id;
                  const style = STROKE[edge.evidence_level];
                  const path = curve(a, b);
                  return (
                    <g key={edge.id} className="cursor-pointer" onClick={() => setSelection({ kind: "edge", edge })}>
                      <path d={path} className={`fill-none ${chosen ? "stroke-accent" : style.className}`} strokeWidth={chosen ? 3 : 1.6} strokeDasharray={style.dash} strokeLinecap="round" opacity={isActive(edge) ? 1 : 0.15} />
                      {/* Zona de clic generosa e invisible. */}
                      <path d={path} className="fill-none stroke-transparent" strokeWidth={14}>
                        <title>{`${EDGE_LABEL[edge.type] ?? edge.type}: ${edge.summary}`}</title>
                      </path>
                      {NOTABLE_EDGES.has(edge.type) && isActive(edge) && <EdgeLabel a={a} b={b} text={EDGE_LABEL[edge.type] ?? edge.type} />}
                    </g>
                  );
                })}
              </g>
              <g>
                {placed.map((node, index) => (
                  <motion.g
                    key={node.id}
                    initial={reduced ? false : { x: 0, y: 0, opacity: 0, scale: 0.4 }}
                    animate={{ x: node.x, y: node.y, opacity: !hovered || hovered === node.id || linked(data, hovered, node.id) ? 1 : 0.3, scale: 1 }}
                    transition={{ duration: reduced ? 0 : 0.55, ease: EASE, delay: reduced ? 0 : node.ring * 0.08 + index * 0.004 }}
                    className={node.type === "disease" && node.id !== data.center ? "cursor-pointer" : "cursor-default"}
                    onMouseEnter={() => setHovered(node.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => setSelection({ kind: "node", node })}
                    onDoubleClick={() => recenter(node)}
                  >
                    <g transform="scale(1.4)"><Shape type={node.type} center={node.id === data.center} selected={selection?.kind === "node" && selection.node.id === node.id} /></g>
                    <text y={node.id === data.center ? 48 : 34} textAnchor="middle" className={`select-none ${node.id === data.center ? "fill-ink text-[22px] font-medium" : "fill-ink/85 text-[17px]"}`}>
                      {short(node.label, node.id === data.center ? 34 : 20)}
                    </text>
                    <title>{`${TYPE_NAME[node.type]}: ${node.label}`}</title>
                  </motion.g>
                ))}
              </g>
            </svg>
          )}
          {notice && <p role="status" className="cn-panel absolute left-1/2 top-4 -translate-x-1/2 px-4 py-2 text-xs text-ink">{notice}</p>}
        </div>

        <aside className="flex w-[22rem] shrink-0 flex-col gap-8 overflow-y-auto border-l border-line/40 p-6" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={selection ? (selection.kind === "edge" ? selection.edge.id : selection.node.id) : "empty"} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0 }} transition={{ duration: 0.24, ease: EASE }}>
              {selection?.kind === "edge" && <EdgeCard edge={selection.edge} byId={byId} />}
              {selection?.kind === "node" && <NodeCard node={selection.node} isCenter={selection.node.id === data?.center} onRecenter={() => recenter(selection.node)} />}
              {!selection && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-base font-medium text-ink">Read it from the inside out</h3>
                  <p className="text-sm leading-relaxed text-muted">
                    Inner ring: the genes and mechanism behind the disease. Middle ring: diseases that share them. Outer ring: patient groups, registries, studies and trials.
                  </p>
                  <p className="text-sm leading-relaxed text-muted">Click a line to see its source. Double click a disease to put it at the center.</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          <Legend />
          {data && (
            <details className="text-xs text-muted">
              <summary className="cursor-pointer text-ink">What was searched</summary>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {data.coverage.searched.map((item) => <li key={item}>{item}</li>)}
              </ul>
              {data.coverage.missing.map((item) => <p key={item} className="mt-2">{item}</p>)}
            </details>
          )}
        </aside>
      </div>
    </motion.section>
  );
}

function linked(data: Pathway, a: string, b: string): boolean {
  return data.edges.some((edge) => (edge.src === a && edge.dst === b) || (edge.src === b && edge.dst === a));
}

function curve(a: Placed, b: Placed): string {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  // Curva suave hacia fuera del centro: las aristas del mismo anillo no atraviesan el núcleo.
  const bend = 0.12;
  return `M${a.x},${a.y} Q${mx - (b.y - a.y) * bend},${my + (b.x - a.x) * bend} ${b.x},${b.y}`;
}

function EdgeLabel({ a, b, text }: { a: Placed; b: Placed; text: string }) {
  const x = (a.x + b.x) / 2 - (b.y - a.y) * 0.06;
  const y = (a.y + b.y) / 2 + (b.x - a.x) * 0.06;
  return (
    <g transform={`translate(${x},${y})`} pointerEvents="none">
      <rect x={-text.length * 4 - 8} y={-11} width={text.length * 8 + 16} height={22} rx={11} className="fill-surface stroke-line/50" />
      <text y={4} textAnchor="middle" className="fill-ink text-[13px]">{text}</text>
    </g>
  );
}

function Shape({ type, center, selected }: { type: NodeType; center: boolean; selected: boolean }) {
  const ring = selected ? "stroke-accent" : "stroke-ink/40";
  const width = selected ? 3 : 1.2;
  if (center) return <circle r={18} className="fill-accent stroke-accent" strokeWidth={6} strokeOpacity={0.25} />;
  const fill = TYPE_FILL[type];
  switch (type) {
    case "gene":
      return <rect x={-8} y={-8} width={16} height={16} transform="rotate(45)" className={`${fill} ${ring}`} strokeWidth={width} />;
    case "mechanism":
      return <polygon points="0,-11 9.5,-5.5 9.5,5.5 0,11 -9.5,5.5 -9.5,-5.5" className={`${fill} ${ring}`} strokeWidth={width} />;
    case "group":
      return <polygon points="0,-11 10,8 -10,8" className={`${fill} ${ring}`} strokeWidth={width} />;
    case "asset":
      return <rect x={-8} y={-8} width={16} height={16} rx={3} className={`${fill} ${ring}`} strokeWidth={width} />;
    case "investigator":
      return <circle r={8} className={`${fill} ${ring}`} strokeWidth={width} strokeDasharray="2 2" />;
    default:
      return <circle r={10} className={`${fill} ${ring}`} strokeWidth={width} />;
  }
}

function Legend() {
  return (
    <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-line/40 pt-6 text-xs text-ink" aria-label="Legend">
      <div className="flex flex-col gap-1.5">
        {(Object.keys(TYPE_NAME) as NodeType[]).map((type) => (
          <span key={type} className="flex items-center gap-2">
            <svg width={22} height={22} viewBox="-11 -11 22 22" aria-hidden><Shape type={type} center={false} selected={false} /></svg>
            {TYPE_NAME[type]}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1.5">
        {(["observado", "inferido", "hipotesis", "contradictorio"] as Evidence[]).map((level) => (
          <span key={level} className="flex items-center gap-2">
            <svg width={34} height={10} aria-hidden>
              <line x1={2} y1={5} x2={32} y2={5} className={STROKE[level].className} strokeWidth={2} strokeDasharray={STROKE[level].dash} strokeLinecap="round" />
            </svg>
            {{ observado: "Observed", inferido: "Inferred", hipotesis: "Hypothesis", contradictorio: "Contradicted" }[level]}
          </span>
        ))}
      </div>
    </div>
  );
}

function EdgeCard({ edge, byId }: { edge: PathwayEdge; byId: Map<string, Placed> }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-xs text-muted">Connection</p>
      <h3 className="text-base font-medium text-ink">{EDGE_LABEL[edge.type] ?? edge.type}</h3>
      <p className="text-sm text-ink">
        {byId.get(edge.src)?.label ?? edge.src} <span className="text-muted">→</span> {byId.get(edge.dst)?.label ?? edge.dst}
      </p>
      <EvidenceBadge level={BADGE[edge.evidence_level]} className="self-start" />
      <p className="text-sm leading-relaxed text-muted">{edge.summary}</p>
      {edge.type === "allelic_series" && (
        <p className="rounded-[10px] border border-line/50 px-3 py-2 text-xs text-ink">
          Same gene, different disease: a counterexample to grouping by gene alone.
        </p>
      )}
      {edge.source_url ? (
        <a href={edge.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 self-start text-sm text-accent underline underline-offset-4">
          Source <ArrowSquareOut size={14} aria-hidden />
        </a>
      ) : (
        <p className="text-xs text-muted">No public source link for this connection.</p>
      )}
    </div>
  );
}

function NodeCard({ node, isCenter, onRecenter }: { node: Placed; isCenter: boolean; onRecenter: () => void }) {
  const details = Object.entries(node.meta).filter(([key, value]) => key !== "center" && (typeof value === "string" || typeof value === "number"));
  return (
    <div className="flex flex-col gap-3">
      <p className="font-mono text-xs text-muted">{TYPE_NAME[node.type]}</p>
      <h3 className="text-base font-medium text-ink">{node.label}</h3>
      <p className="font-mono text-xs text-muted">{node.id}</p>
      {details.map(([key, value]) => (
        <p key={key} className="text-sm text-muted">
          <span className="text-ink">{key.replace(/_/g, " ")}:</span> {String(value)}
        </p>
      ))}
      {node.type === "disease" && !isCenter && (
        <Button variant="secondary" onClick={onRecenter} className="self-start">
          Put this disease at the center
        </Button>
      )}
    </div>
  );
}

function short(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
