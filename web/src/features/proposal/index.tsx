import { useEffect, useRef, useState } from "react";
import { ArrowSquareOut, Copy, Printer, X } from "@phosphor-icons/react";

import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import { Button, Panel } from "../../ui";
import type { PanelState } from "../../ui";

// HACK-026: propuesta de colaboración con fuentes ("she approaches a partner with a sourced proposal").
export const slot = "overlay";
export const order = 90;

type Source = { key: string; kind: "edge" | "group" | "asset"; label: string; url: string };
type Proposal = {
  demo_data: boolean;
  partner_disease_id: string;
  title: string;
  markdown: string;
  cited_keys: string[];
  sources: Source[];
  questions_for_expert: string[];
  generation_method: string;
};
const CITATION = /\[([A-Za-z0-9_.:-]+)\]/g;

export default function ProposalLayer() {
  const diseaseId = useStore((s) => s.proposalFor);
  // key: cada enfermedad monta su propio borrador.
  return diseaseId ? <ProposalDialog key={diseaseId} diseaseId={diseaseId} /> : null;
}

function ProposalDialog({ diseaseId }: { diseaseId: string }) {
  const close = () => useStore.getState().setProposalFor(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [state, setState] = useState<PanelState>("loading");
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let current = true;
    api<Proposal>("/proposal", { method: "POST", body: JSON.stringify({ disease_id: diseaseId }) })
      .then((result) => {
        if (!current) return;
        setProposal(result);
        setState("ready");
      })
      .catch(() => current && setState("error"));
    return () => {
      current = false;
    };
  }, [diseaseId, attempt]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const plainText = () => {
    if (!proposal) return "";
    const sources = proposal.sources
      .filter((s) => proposal.cited_keys.includes(s.key))
      .map((s) => `[${s.key}] ${s.label}: ${s.url}`);
    const questions = proposal.questions_for_expert.map((q) => `- ${q}`);
    return [`# ${proposal.title}`, "", proposal.markdown, "", "## Questions for expert review", ...questions, "",
      "## Sources", ...sources].join("\n");
  };
  const copy = async () => {
    await navigator.clipboard.writeText(plainText());
    setCopied(true);
  };
  const print = () => {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return;
    win.document.title = proposal?.title ?? "Proposal";
    const pre = win.document.createElement("pre");
    pre.style.cssText = "white-space:pre-wrap;font:14px/1.5 system-ui;margin:32px";
    pre.textContent = plainText();
    win.document.body.appendChild(pre);
    win.print();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Collaboration proposal"
      className="fixed inset-0 z-50 grid place-items-center bg-night/70 p-6"
      onClick={(event) => event.target === event.currentTarget && close()}
    >
      <Panel
        title={proposal?.title ?? "Drafting a sourced proposal"}
        trailing={
          <button ref={closeRef} type="button" className="cn-chip-remove" aria-label="Close proposal" onClick={close}>
            <X size={18} aria-hidden="true" />
          </button>
        }
        state={state}
        errorMessage="The proposal could not be drafted."
        onRetry={() => {
          setState("loading");
          setAttempt((n) => n + 1);
        }}
        className="max-h-[88dvh] w-[min(48rem,100%)] overflow-y-auto"
      >
        {state === "loading" && <p className="cn-muted">Writing from cited sources only. This can take up to 20 seconds.</p>}
        {proposal && <ProposalBody proposal={proposal} />}
        {proposal && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="primary" onClick={copy}>
              <Copy size={18} aria-hidden="true" /> {copied ? "Copied" : "Copy with sources"}
            </Button>
            <Button variant="secondary" onClick={print}>
              <Printer size={18} aria-hidden="true" /> Print
            </Button>
          </div>
        )}
      </Panel>
    </div>
  );
}

function ProposalBody({ proposal }: { proposal: Proposal }) {
  const numbers = new Map(proposal.cited_keys.map((key, i) => [key, i + 1]));
  const sources = new Map(proposal.sources.map((s) => [s.key, s]));
  const inline = (text: string, keyPrefix: string) =>
    text.split(CITATION).map((part, i) => {
      if (i % 2 === 0) return <span key={`${keyPrefix}-${i}`}>{part}</span>;
      const source = sources.get(part);
      const n = numbers.get(part);
      if (!source || !n) return null;
      return (
        <a
          key={`${keyPrefix}-${i}`}
          href={`#source-${part}`}
          aria-label={`Source ${n}: ${source.label}`}
          className="mx-0.5 font-mono text-xs text-accent hover:underline"
        >
          [{n}]
        </a>
      );
    });
  const blocks = proposal.markdown.split("\n").filter((line) => line.trim());
  return (
    <article className="flex flex-col gap-3 text-sm leading-relaxed">
      {proposal.demo_data && <p className="cn-id">Sample: {proposal.generation_method}</p>}
      {blocks.map((line, i) =>
        line.startsWith("#") ? (
          <h3 key={i} className="mt-2 text-base font-medium">
            {line.replace(/^#+\s*/, "")}
          </h3>
        ) : line.startsWith("- ") ? (
          <p key={i} className="pl-4 before:-ml-4 before:mr-2 before:content-['•']">
            {inline(line.slice(2), `l${i}`)}
          </p>
        ) : (
          <p key={i}>{inline(line, `l${i}`)}</p>
        ),
      )}
      <h3 className="mt-2 text-base font-medium">Questions for expert review</h3>
      <ul className="flex list-disc flex-col gap-1 pl-5">
        {proposal.questions_for_expert.map((q) => (
          <li key={q}>{inline(q, q.slice(0, 12))}</li>
        ))}
      </ul>
      <h3 className="mt-2 text-base font-medium">Sources</h3>
      <ol className="flex flex-col gap-1">
        {proposal.cited_keys.map((key) => {
          const source = sources.get(key);
          if (!source) return null;
          return (
            <li key={key} id={`source-${key}`} className="flex gap-2">
              <span className="font-mono text-xs text-accent">[{numbers.get(key)}]</span>
              <a href={source.url} target="_blank" rel="noreferrer" className="hover:underline">
                {source.label} <ArrowSquareOut size={14} aria-hidden="true" className="inline" />
              </a>
            </li>
          );
        })}
      </ol>
      {!proposal.demo_data && <p className="cn-id">{proposal.generation_method}</p>}
    </article>
  );
}
