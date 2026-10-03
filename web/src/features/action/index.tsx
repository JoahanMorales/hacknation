import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowSquareOut, CalendarCheck, MagnifyingGlass, Question, UsersThree } from "@phosphor-icons/react";

import planRaw from "../../../../app/fixtures/api/action_plan.json?raw";
import unsupportedRaw from "../../../../app/fixtures/api/action_plan_unsupported.json?raw";
import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import { EvidenceBadge, Panel, SampleBadge } from "../../ui";
import type { EvidenceLevel, PanelState } from "../../ui";

// Escena 5 del brief (HACK-020): comunidad, activos reutilizables, la acción de esta semana y la línea de tiempo.
export const slot = "bottom";
export const order = 30;

// ?step=action abre esta escena al cargar (demo guiada y pruebas); se combina con ?select=ORPHA:34515.
if (new URLSearchParams(window.location.search).get("step") === "action") useStore.getState().setStep("action");

type ApiEvidence = "observado" | "inferido" | "hipotesis" | "contradictorio";
type Lane = { label: string; duration: string; source_url: string | null };
type ActionPlan = {
  demo_data: boolean;
  disease_id: string;
  supported: boolean;
  groups: { name: string; diseases: string[]; url: string; registry: string | null }[];
  assets: { kind: string; id: string; name: string; url: string; evidence_level: ApiEvidence }[];
  bridges: { id: string; src: string; dst: string; summary: string; evidence_level: ApiEvidence }[];
  differences: string[];
  needs_expert: string[];
  this_week: { action: string; url: string | null };
  timeline: { current: Lane; proposed: Lane; assumptions: string[] } | null;
  searched: string[];
  missing_evidence: string[];
};

const examples = [JSON.parse(planRaw), JSON.parse(unsupportedRaw)] as ActionPlan[];
const EASE = [0.16, 1, 0.3, 1] as const;
const BADGE: Record<ApiEvidence, EvidenceLevel> = {
  observado: "observado",
  inferido: "inferido",
  hipotesis: "hipotesis",
  contradictorio: "contradicho",
};
const KIND: Record<string, string> = {
  registro: "Registry",
  historia_natural: "Natural history study",
  ensayo: "Trial",
  biomarcador: "Biomarker",
};

// "International Pompe Association" → "IP"; "CureLGMD2i" → "CL".
const monogram = (name: string) => {
  const words = name.split(/\s+/).filter((w) => /^[A-Z0-9]/.test(w));
  const letters = words.length > 1 ? words.map((w) => w[0]) : (words[0] ?? name).match(/[A-Z0-9]/g) ?? [];
  return letters.slice(0, 2).join("");
};

export default function ActionScene() {
  const step = useStore((s) => s.step);
  const selectedId = useStore((s) => s.selectedId);
  if (step !== "action") return null;
  if (!selectedId) {
    return (
      <Panel title="Next steps" state="empty" emptyMessage="Select a disease in the constellation to see who already works on it." />
    );
  }
  // key: cada enfermedad monta su propio plan, así el estado local se reinicia sin efectos.
  return <ActionPanel key={selectedId} diseaseId={selectedId} />;
}

function ActionPanel({ diseaseId }: { diseaseId: string }) {
  const [plan, setPlan] = useState<ActionPlan | null>(null);
  const [state, setState] = useState<PanelState>("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let current = true;
    // El ejemplo del contrato sólo sirve para su propia enfermedad: nunca mostrar el plan de otra.
    const example = examples.find((e) => e.disease_id === diseaseId);
    api<ActionPlan>("/action-plan", { method: "POST", body: JSON.stringify({ disease_id: diseaseId }) }, example)
      .then((result) => {
        if (!current) return;
        setPlan(result);
        setState("ready");
      })
      .catch(() => current && setState("error"));
    return () => {
      current = false;
    };
  }, [diseaseId, attempt]);

  return (
    <Panel
      title={plan?.supported === false ? "No supported route yet" : "Who is already working on this"}
      trailing={plan?.demo_data ? <SampleBadge /> : undefined}
      state={state}
      errorMessage="The action plan could not be loaded."
      onRetry={() => {
        setState("loading");
        setAttempt((n) => n + 1);
      }}
      aria-label="Action plan"
      className="max-h-[62dvh] overflow-y-auto"
    >
      {plan && (plan.supported ? <Supported plan={plan} /> : <Unsupported plan={plan} />)}
    </Panel>
  );
}

function Supported({ plan }: { plan: ActionPlan }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-[1fr_1fr_minmax(0,1.1fr)] gap-5">
        <section aria-label="Community" className="flex flex-col gap-3">
          <h3 className="flex items-center gap-2 text-sm font-medium">
            <UsersThree size={18} aria-hidden="true" /> Community
          </h3>
          {plan.groups.length === 0 && <p className="cn-muted">No patient organisation curated yet.</p>}
          {plan.groups.map((g) => (
            <article key={g.name} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-surface-raised font-mono text-xs text-accent"
              >
                {monogram(g.name)}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <a href={g.url} target="_blank" rel="noreferrer" className="text-sm underline-offset-2 hover:underline">
                  {g.name}
                </a>
                {g.registry && (
                  <a href={g.registry} target="_blank" rel="noreferrer" className="cn-id hover:underline">
                    Registry
                  </a>
                )}
              </div>
            </article>
          ))}
          {plan.bridges.length > 0 && (
            <div className="flex flex-col gap-2 border-t border-line/40 pt-3">
              <h4 className="text-xs text-muted">Connected through the same mechanism</h4>
              {plan.bridges.map((b) => (
                <p key={b.id} className="flex flex-col gap-1 text-xs">
                  <span>{b.summary}</span>
                  <EvidenceBadge level={BADGE[b.evidence_level]} className="self-start" />
                </p>
              ))}
            </div>
          )}
        </section>

        <section aria-label="Reusable assets" className="flex flex-col gap-3">
          <h3 className="text-sm font-medium">Reusable assets</h3>
          {plan.assets.length === 0 && <p className="cn-muted">No registry, study or trial curated yet.</p>}
          {plan.assets.map((a) => (
            <article key={a.id} className="flex flex-col gap-1">
              <span className="cn-id">
                {KIND[a.kind] ?? a.kind} · {a.id}
              </span>
              <a href={a.url} target="_blank" rel="noreferrer" className="text-sm underline-offset-2 hover:underline">
                {a.name}
              </a>
              <EvidenceBadge level={BADGE[a.evidence_level]} className="self-start" />
            </article>
          ))}
        </section>

        <div className="flex flex-col gap-4">
          <ThisWeek plan={plan} />
          {plan.timeline && <TimelineView timeline={plan.timeline} />}
        </div>
      </div>
      <Notes plan={plan} />
    </div>
  );
}

function ThisWeek({ plan }: { plan: ActionPlan }) {
  return (
    <section
      aria-label="This week"
      className="flex flex-col justify-between gap-4 rounded-2xl border border-accent/45 bg-surface-raised/60 p-5"
    >
      <div className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium text-accent">
          <CalendarCheck size={18} aria-hidden="true" /> This week
        </h3>
        <p className="text-xl leading-snug font-medium">{plan.this_week.action}</p>
      </div>
      {plan.this_week.url && (
        <a
          href={plan.this_week.url}
          target="_blank"
          rel="noreferrer"
          className="cn-button cn-button--primary self-start"
        >
          Open <ArrowSquareOut size={18} aria-hidden="true" />
        </a>
      )}
    </section>
  );
}

function TimelineView({ timeline }: { timeline: NonNullable<ActionPlan["timeline"]> }) {
  const reduced = useReducedMotion();
  const lanes = [
    { key: "current", prefix: "Today", lane: timeline.current, width: 1, tone: "bg-muted/70" },
    { key: "proposed", prefix: "With Constellation", lane: timeline.proposed, width: 0.06, tone: "bg-accent" },
  ];
  return (
    <section aria-label="Timeline" className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">Timeline</h3>
      {lanes.map(({ key, prefix, lane, width, tone }, i) => (
        <div key={key} className="flex flex-col gap-1.5">
          <p className="text-sm">
            <span className="text-muted">{prefix}: </span>
            {lane.label}{" "}
            <span className="font-mono tabular-nums">{lane.duration}</span>
            {lane.source_url && (
              <a href={lane.source_url} target="_blank" rel="noreferrer" className="cn-id ml-1 hover:underline">
                source
              </a>
            )}
          </p>
          <div className="h-2 rounded-[3px] bg-surface-raised" aria-hidden="true">
            <motion.div
              className={`h-full origin-left rounded-[3px] ${tone}`}
              style={{ width: `${Math.max(width * 100, 2)}%` }}
              initial={reduced ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.9, delay: i * 0.25, ease: EASE }}
            />
          </div>
        </div>
      ))}
      <details className="text-sm">
        <summary className="cursor-pointer text-muted">Assumptions ({timeline.assumptions.length})</summary>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-muted">
          {timeline.assumptions.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function Notes({ plan }: { plan: ActionPlan }) {
  if (plan.differences.length === 0 && plan.needs_expert.length === 0) return null;
  return (
    <details aria-label="Limits" className="border-t border-line/40 pt-3 text-xs text-muted">
      <summary className="cursor-pointer">Limits of this plan</summary>
      <div className="mt-2 grid grid-cols-2 gap-5">
      {plan.differences.length > 0 && (
        <ul className="flex flex-col gap-1">
          {plan.differences.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      )}
      {plan.needs_expert.length > 0 && (
        <ul className="flex flex-col gap-1">
          {plan.needs_expert.map((d) => (
            <li key={d} className="flex gap-1.5">
              <Question size={16} aria-hidden="true" className="shrink-0" /> {d}
            </li>
          ))}
        </ul>
      )}
      </div>
    </details>
  );
}

function Unsupported({ plan }: { plan: ActionPlan }) {
  return (
    <div className="grid grid-cols-[1fr_1fr_minmax(0,1.1fr)] gap-5">
      <section aria-label="What we searched" className="flex flex-col gap-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <MagnifyingGlass size={18} aria-hidden="true" /> What we searched
        </h3>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {plan.searched.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ul>
      </section>
      <section aria-label="Missing evidence" className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Missing evidence</h3>
        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
          {plan.missing_evidence.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        {plan.needs_expert.map((n) => (
          <p key={n} className="cn-muted flex gap-1.5">
            <Question size={16} aria-hidden="true" className="mt-0.5 shrink-0" /> {n}
          </p>
        ))}
      </section>
      <ThisWeek plan={plan} />
    </div>
  );
}
