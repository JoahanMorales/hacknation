import { useState } from "react";
import { ArrowUpRight, Sparkle } from "@phosphor-icons/react";
import diagnoseRaw from "../../../app/fixtures/api/diagnose.json?raw";
import graphRaw from "../../../app/fixtures/api/graph_overview.json?raw";
import caseRaw from "../../../app/fixtures/case/pompe_case.json?raw";
import edgeRaw from "../../../app/fixtures/api/edge.json?raw";
import {
  Button,
  Chip,
  EvidenceBadge,
  Kbd,
  Meter,
  Panel,
  SampleBadge,
} from "./index";
import type { EvidenceLevel, PanelState } from "./index";

type Term = { hpo_id: string; label: string; present: boolean };
type Star = { id: string; x: number; y: number };
const sample = JSON.parse(caseRaw) as { terms: Term[]; pmid: string };
const diagnosis = JSON.parse(diagnoseRaw) as {
  ranking: {
    disease_id: string;
    name: string;
    pct: number;
    low: number;
    high: number;
  }[];
  range_kind: string;
};
const graph = JSON.parse(graphRaw) as { nodes: Star[]; total_diseases: number };
const bridge = (
  JSON.parse(edgeRaw) as {
    edge: {
      summary: string;
      source_url: string;
      evidence_level: EvidenceLevel;
      record_id: string;
    };
  }
).edge;
const mechanisms = [
  ["glycosylation", "Glycosylation"],
  ["lysosomal", "Lysosomal"],
  ["structural", "Muscle structure"],
  ["membrane", "Membrane"],
  ["signaling", "Signaling"],
  ["other", "Other"],
];
const levels: EvidenceLevel[] = [
  "observado",
  "inferido",
  "hipotesis",
  "contradicho",
];
const states: PanelState[] = ["ready", "loading", "empty", "error"];

function SampleSky() {
  const xs = graph.nodes.map((node) => node.x),
    ys = graph.nodes.map((node) => node.y);
  const minX = Math.min(...xs),
    spanX = Math.max(...xs) - minX || 1;
  const minY = Math.min(...ys),
    spanY = Math.max(...ys) - minY || 1;
  const selected = new Set(
    diagnosis.ranking.slice(0, 2).map((candidate) => candidate.disease_id),
  );
  return (
    <svg
      className="cn-kit-sky"
      viewBox="0 0 900 300"
      role="img"
      aria-label={`${graph.nodes.length} sample diseases in their precalculated HPO positions`}
    >
      {graph.nodes.map((node) => (
        <circle
          key={node.id}
          cx={24 + ((node.x - minX) / spanX) * 852}
          cy={20 + ((node.y - minY) / spanY) * 260}
          r={selected.has(node.id) ? 3.5 : 1.5}
          className={selected.has(node.id) ? "cn-star--selected" : "cn-star"}
        />
      ))}
    </svg>
  );
}

export default function Kit() {
  const [terms, setTerms] = useState<Term[]>(sample.terms);
  const [state, setState] = useState<PanelState>("ready");
  const [notice, setNotice] = useState(
    "Try the symptom controls. The API match example stays fixed.",
  );
  const leading = diagnosis.ranking[0];
  const restore = () => {
    setTerms(sample.terms);
    setState("ready");
    setNotice("Sample restored. The API match example stays fixed.");
  };
  return (
    <main className="cn-kit">
      <div className="cn-kit-container">
        <header className="cn-kit-header">
          <a href="/" className="cn-kit-brand">
            <Sparkle size={22} aria-hidden="true" />
            OlivIA
          </a>
          <span className="cn-kit-label">Interface library</span>
          <SampleBadge />
          <Button variant="secondary" onClick={restore}>
            Reset sample
          </Button>
        </header>
        <div className="cn-kit-intro">
          <div>
            <h1>Symptoms, matches and evidence.</h1>
            <p>One visual language for exploring the connections.</p>
          </div>
          <p className="cn-kit-count">
            <strong>{graph.total_diseases.toLocaleString("en-US")}</strong>{" "}
            diseases
            <br />
            {graph.nodes.length} in this sample
          </p>
        </div>
        <div className="cn-kit-grid">
          <div className="cn-kit-column">
            <Panel
              title="Symptoms"
              state={state === "ready" && terms.length === 0 ? "empty" : state}
              emptyMessage="Add findings to begin exploring."
              emptyAction={<Button onClick={restore}>Load sample</Button>}
              onRetry={() => setState("ready")}
            >
              <p className="cn-muted">
                Published adult Pompe case. Present and excluded findings are
                kept together.
              </p>
              <div className="cn-kit-chips">
                {terms.map((term) => (
                  <Chip
                    key={term.hpo_id}
                    hpoId={term.hpo_id}
                    label={term.label}
                    present={term.present}
                    onToggle={() => {
                      setTerms((previous) =>
                        previous.map((item) =>
                          item.hpo_id === term.hpo_id
                            ? { ...item, present: !item.present }
                            : item,
                        ),
                      );
                      setNotice(
                        "Finding changed. The API match example stays fixed.",
                      );
                    }}
                    onRemove={() => {
                      setTerms((previous) =>
                        previous.filter((item) => item.hpo_id !== term.hpo_id),
                      );
                      setNotice(
                        "Finding removed. The API match example stays fixed.",
                      );
                    }}
                  />
                ))}
              </div>
              <Button variant="ghost" onClick={() => setTerms([])}>
                Clear symptoms
              </Button>
            </Panel>
            <div>
              <div
                className="cn-kit-states"
                role="group"
                aria-label="Panel preview state"
              >
                {states.map((value) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={state === value}
                    onClick={() => setState(value)}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <p role="status" className="cn-kit-notice">
                {notice}
              </p>
            </div>
          </div>
          <div className="cn-kit-column">
            <div>
              <div className="cn-kit-sky-heading">
                <span>Sample constellation</span>
                <span>{sample.pmid.replace("PMID:", "PMID ")}</span>
              </div>
              <SampleSky />
            </div>
            <Panel
              title="Phenotype match"
              trailing={<span className="cn-kit-fixed">API sample</span>}
              className="cn-kit-match"
            >
              <h3>{leading.name}</h3>
              <p className="cn-id">{leading.disease_id}</p>
              <Meter
                pct={leading.pct}
                low={leading.low}
                high={leading.high}
                label="Leading match"
              />
              <p className="cn-kit-disclaimer">
                Phenotype match · not a diagnosis
              </p>
              <details>
                <summary>How to read the range</summary>
                <p>
                  The published API fixture uses {diagnosis.range_kind}. This
                  illustrative range is not calibrated clinical confidence.
                </p>
              </details>
            </Panel>
          </div>
          <div className="cn-kit-column">
            <Panel title="Evidence">
              <EvidenceBadge level={bridge.evidence_level} />
              <p className="cn-kit-evidence-copy">{bridge.summary}</p>
              <a
                className="cn-kit-source"
                href={bridge.source_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Read source <ArrowUpRight size={16} aria-hidden="true" />
              </a>
              <p className="cn-id">{bridge.record_id}</p>
              <div className="cn-kit-badges">
                {levels.map((level) => (
                  <EvidenceBadge key={level} level={level} />
                ))}
              </div>
              <p className="cn-kit-caption">
                Four component states. The sample bridge is inferred.
              </p>
            </Panel>
            <Panel title="Mechanism colors">
              <div className="cn-kit-mechanisms">
                {mechanisms.map(([token, name]) => (
                  <span key={token}>
                    <i
                      style={{ background: `var(--color-${token})` }}
                      aria-hidden="true"
                    />
                    {name}
                  </span>
                ))}
              </div>
            </Panel>
          </div>
        </div>
        <footer className="cn-kit-footer">
          <p>
            Published case, illustrative matching. For exploration; not clinical
            validation.
          </p>
          <span>
            <Kbd>Tab</Kbd> move <Kbd>Enter</Kbd> activate
          </span>
          <Button variant="secondary" loading>
            Loading example
          </Button>
        </footer>
      </div>
    </main>
  );
}
