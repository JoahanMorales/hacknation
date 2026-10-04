import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ArrowSquareOut, CaretDown, Graph, X } from "@phosphor-icons/react";

import explainRaw from "../../../../app/fixtures/api/explain.json?raw";
import nodeRaw from "../../../../app/fixtures/api/node.json?raw";
import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import { Button, Chip, EvidenceBadge, Panel } from "../../ui";
import type { EvidenceLevel, PanelState } from "../../ui";
import type { ApiEvidence, Edge, ExplainResult, NodeResult } from "./types";

// Escena 4 del brief (HACK-019): se abre con store.selectedId; resumen → detalle; citas que resaltan aristas.
export const slot = "right";
export const order = 20;

// ?select=ORPHA:34515 abre el inspector al cargar (demo guiada y pruebas en navegador).
const preselect = new URLSearchParams(window.location.search).get("select");
if (preselect) useStore.getState().setSelectedId(preselect);

const nodeExample = JSON.parse(nodeRaw) as NodeResult;
const explainExample = JSON.parse(explainRaw) as ExplainResult;
const EASE = [0.16, 1, 0.3, 1] as const;
const CITATION = /\[([A-Za-z0-9_.:-]+)\]/g;

const BADGE: Record<ApiEvidence, EvidenceLevel> = {
  observado: "observado",
  inferido: "inferido",
  hipotesis: "hipotesis",
  contradictorio: "contradicho",
};
const EDGE_TYPE: Record<string, string> = {
  shared_pathway: "Shared pathway",
  therapy_bridge: "Therapy bridge",
  allelic_series: "Same gene, different picture",
  differential_diagnosis: "Differential diagnosis",
  same_mechanism_family: "Same mechanism family",
};
// Para la familia se explican primero los puentes y el contraejemplo (máximo 3 aristas).
const EXPLAIN_PRIORITY = ["therapy_bridge", "allelic_series", "differential_diagnosis", "shared_pathway"];

function explainEdges(edges: Edge[]): string[] {
  const rank = (e: Edge) => (EXPLAIN_PRIORITY.indexOf(e.type) + 1 || 99);
  return [...edges]
    .sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id))
    .slice(0, 3)
    .map((e) => e.id)
    .sort();
}

function mechanismColor(id: string): string {
  const family = id.split(".")[0];
  return ["glycosylation", "lysosomal", "structural", "membrane", "signaling"].includes(family)
    ? `var(--color-${family})`
    : "var(--color-other)";
}

function focusEdge(edgeId: string) {
  requestAnimationFrame(() => document.getElementById(`edge-${edgeId}`)?.focus());
}

export default function Inspector() {
  const selectedId = useStore((s) => s.selectedId);
  // En la escena de acción la columna derecha es de la acción (brief: "inspector / acción").
  const step = useStore((s) => s.step);
  // En "pathway" el navegador ocupa la pantalla: el inspector no debe quedar montado debajo (HACK-031).
  if (step === "action" || step === "pathway") return null;
  // key: cada estrella monta un panel nuevo, así el estado local se reinicia sin efectos.
  return selectedId ? <InspectorPanel key={selectedId} selectedId={selectedId} /> : null;
}

function InspectorPanel({ selectedId }: { selectedId: string }) {
  const setSelectedId = useStore((s) => s.setSelectedId);
  const highlighted = useStore((s) => s.highlightedEdgeId);
  const setHighlighted = useStore((s) => s.setHighlightedEdgeId);
  const setStep = useStore((s) => s.setStep);
  const reduced = useReducedMotion();

  const [node, setNode] = useState<NodeResult | null>(null);
  const [state, setState] = useState<PanelState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState<ExplainResult | null>(null);
  const [explaining, setExplaining] = useState(false);
  const [explainError, setExplainError] = useState(false);

  useEffect(() => {
    let current = true;
    // El ejemplo del contrato sólo sirve para su propia enfermedad: nunca mostrar datos de otra.
    const example = selectedId === nodeExample.disease.id ? nodeExample : undefined;
    api<NodeResult>(`/node/${encodeURIComponent(selectedId)}`, undefined, example)
      .then((result) => {
        if (!current) return;
        setNode(result);
        setState("ready");
      })
      .catch((error: Error) => {
        if (current) setState(error.message.startsWith("404") ? "empty" : "error");
      });
    return () => {
      current = false;
    };
  }, [selectedId, attempt]);

  const explain = async () => {
    if (!node) return;
    setExplaining(true);
    setExplainError(false);
    const edgeIds = explainEdges(node.edges);
    // El ejemplo sólo vale si cada cita suya es una arista pedida de este nodo; si no, se muestra el error.
    const example =
      node.disease.id === explainExample.disease_id &&
      explainExample.citations.every((c) => edgeIds.includes(c.edge_id))
        ? explainExample
        : undefined;
    try {
      const result = await api<ExplainResult>(
        "/explain",
        {
          method: "POST",
          body: JSON.stringify({ disease_id: node.disease.id, edge_ids: edgeIds, language: "en" }),
        },
        example,
      );
      setExplanation(result);
    } catch {
      setExplainError(true);
    } finally {
      setExplaining(false);
    }
  };

  const cite = (edgeId: string) => {
    setHighlighted(edgeId);
    setOpen(true);
    focusEdge(edgeId);
  };

  const close = (
    <button
      type="button"
      className="cn-chip-remove"
      aria-label="Close inspector"
      onClick={() => {
        setSelectedId(null);
        setHighlighted(null);
      }}
    >
      <X size={18} aria-hidden="true" />
    </button>
  );

  return (
    <Panel
      title={node?.disease.name ?? "Disease"}
      trailing={close}
      state={state}
      emptyMessage="Outside the curated deep layer. This star has a phenotype match only, no cited connections yet."
      emptyAction={<NextSteps onClick={() => setStep("action")} />}
      errorMessage="The disease details could not be loaded."
      onRetry={() => {
        setState("loading");
        setAttempt((n) => n + 1);
      }}
      className="min-h-0 overflow-y-auto"
      aria-label="Disease inspector"
    >
      {node && (
        <div className="flex flex-col gap-4">
          <section aria-label="Summary" className="flex flex-col gap-2">
            <p className="cn-id">{node.disease.id}</p>
            <p className="text-sm">
              <span className="text-muted">Gene </span>
              <span className="font-mono">{node.genes.map((g) => g.symbol).join(", ") || "Not curated"}</span>
            </p>
            {node.mechanisms.map((m) => (
              <p key={m.id} className="flex items-start gap-2 text-sm">
                <span
                  aria-hidden="true"
                  className="mt-1.5 size-2 shrink-0 rounded-[3px]"
                  style={{ background: mechanismColor(m.id) }}
                />
                <a href={m.source_url} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                  {m.name}
                </a>
              </p>
            ))}
            {/* node.summary repite gen y mecanismo; aquí sólo se añade lo nuevo. */}
            <p className="cn-muted">
              {node.edges.length} cited connections{node.demo_data ? " (sample case)" : ""}.
            </p>
          </section>

          {/* Del "porqué" al "qué hacer": el atlas de la enfermedad (HACK-024) y la escena de acción. */}
          <Button variant="secondary" onClick={() => setStep("pathway")}>
            <Graph size={18} aria-hidden="true" /> Open pathway: genes, mechanism, communities
          </Button>
          <NextSteps onClick={() => setStep("action")} />

          <section aria-label="Explanation for the family" className="flex flex-col gap-2">
            {!explanation && (
              <Button variant="primary" loading={explaining} onClick={explain}>
                Explain for the family
              </Button>
            )}
            {explaining && <p className="cn-muted">Writing a plain explanation. This can take a few seconds.</p>}
            {explainError && (
              <p role="alert" className="cn-error">
                The explanation could not be generated. The cited connections below are still available.
              </p>
            )}
            {explanation && <Explanation result={explanation} onCite={cite} />}
          </section>

          <Button
            variant="ghost"
            aria-expanded={open}
            aria-controls="inspector-detail"
            onClick={() => setOpen((v) => !v)}
          >
            <CaretDown
              size={18}
              aria-hidden="true"
              style={{ transform: open ? "rotate(180deg)" : undefined, transition: reduced ? undefined : "transform 120ms" }}
            />
            {open ? "Hide evidence" : `Show evidence (${node.edges.length} connections)`}
          </Button>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                id="inspector-detail"
                initial={reduced ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 8 }}
                transition={{ duration: 0.24, ease: EASE }}
                className="flex flex-col gap-4"
              >
                <Symptoms title="Typical findings" terms={node.symptoms_for} />
                <Symptoms title="Usually absent" terms={node.symptoms_against} />
                <section aria-label="Cited connections" className="flex flex-col gap-3">
                  <h3 className="text-sm font-medium">Cited connections</h3>
                  {node.edges.length === 0 && <p className="cn-muted">No cited connections for this disease.</p>}
                  {node.edges.map((edge) => (
                    <EdgeItem
                      key={edge.id}
                      edge={edge}
                      self={node.disease.id}
                      highlighted={highlighted === edge.id}
                      onHighlight={() => setHighlighted(highlighted === edge.id ? null : edge.id)}
                    />
                  ))}
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </Panel>
  );
}

function NextSteps({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="secondary" onClick={onClick}>
      Next steps: who is working on this <ArrowRight size={18} aria-hidden="true" />
    </Button>
  );
}

function Symptoms({ title, terms }: { title: string; terms: NodeResult["symptoms_for"] }) {
  if (terms.length === 0) return null;
  return (
    <section aria-label={title} className="flex flex-col gap-2">
      <h3 className="text-sm font-medium">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {terms.map((t) => (
          <Chip key={t.hpo_id} label={t.label} hpoId={t.hpo_id} present={t.present} />
        ))}
      </div>
    </section>
  );
}

function EdgeItem({
  edge,
  self,
  highlighted,
  onHighlight,
}: {
  edge: Edge;
  self: string;
  highlighted: boolean;
  onHighlight: () => void;
}) {
  const other = edge.src === self ? edge.dst : edge.src;
  return (
    <article
      id={`edge-${edge.id}`}
      tabIndex={-1}
      aria-label={`${EDGE_TYPE[edge.type] ?? edge.type} with ${other}`}
      className={`flex flex-col gap-2 rounded-[10px] border p-3 outline-none ${
        highlighted ? "border-accent" : "border-line/40"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">{EDGE_TYPE[edge.type] ?? edge.type}</span>
        <EvidenceBadge level={BADGE[edge.evidence_level]} />
      </div>
      <p className="text-sm">{edge.summary}</p>
      <p className="cn-id">
        {edge.id} · with {other} · confidence {edge.confidence.toFixed(2)} · retrieved {edge.retrieved_at.slice(0, 10)}
      </p>
      <p className="cn-muted">{edge.confidence_note}</p>
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={edge.source_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm underline-offset-2 hover:underline"
        >
          Read source <ArrowSquareOut size={16} aria-hidden="true" />
        </a>
        <span className="cn-id">{edge.record_id}</span>
        <Button variant="ghost" aria-pressed={highlighted} onClick={onHighlight}>
          {highlighted ? "Highlighted in the map" : "Show in the map"}
        </Button>
      </div>
    </article>
  );
}

function Explanation({ result, onCite }: { result: ExplainResult; onCite: (edgeId: string) => void }) {
  const numbers = new Map(result.citations.map((c, i) => [c.edge_id, i + 1]));
  const parts = result.text.split(CITATION);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm leading-relaxed">
        {parts.map((part, i) => {
          if (i % 2 === 0) return <span key={i}>{part}</span>;
          const n = numbers.get(part);
          if (!n) return null;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onCite(part)}
              aria-label={`Source ${n}: connection ${part}`}
              className="mx-0.5 rounded-[5px] px-1 font-mono text-xs text-accent underline-offset-2 hover:underline"
            >
              [{n}]
            </button>
          );
        })}
      </p>
      <p className="cn-id">{result.generation_method}</p>
    </div>
  );
}
