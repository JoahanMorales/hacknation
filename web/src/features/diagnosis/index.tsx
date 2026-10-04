import { ArrowDownRight, ArrowUpRight, Minus } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import sampleRaw from "../../../../app/fixtures/case/pompe_case.json?raw";
import { useStore } from "../../lib/store";
import type { Term } from "../../lib/store";
import { Button, Meter, Panel } from "../../ui";
import type { Driver } from "./types";
import { useDiagnosis } from "./useDiagnosis";
import "./style.css";

export const slot = "bottom";
export const order = 20;
const sample = JSON.parse(sampleRaw) as {
  terms: Term[];
  transcript_en: string;
  pmid: string;
};
const directions = {
  supports: { label: "Supports", Icon: ArrowUpRight },
  against: { label: "Against", Icon: ArrowDownRight },
  neutral: { label: "Neutral", Icon: Minus },
};

function Finding({ driver }: { driver: Driver }) {
  const { label, Icon } = directions[driver.direction];
  return (
    <li
      className="cn-diagnosis-driver"
      title={`${driver.hpo_id} · ${driver.source ?? "No matching annotation"}`}
    >
      <Icon
        size={16}
        className={`cn-diagnosis-direction--${driver.direction}`}
        aria-hidden="true"
      />
      <span>
        {!driver.present && "no "}
        {driver.label}
      </span>
      <span
        className={`cn-diagnosis-direction cn-diagnosis-direction--${driver.direction}`}
      >
        {label}
      </span>
    </li>
  );
}

export default function Diagnosis() {
  const step = useStore((state) => state.step);
  const terms = useStore((state) => state.terms);
  const selectedId = useStore((state) => state.selectedId);
  const { result, status, question, questionStatus, retry } =
    useDiagnosis(terms);
  const reduced = useReducedMotion();
  // Action owns the bottom slot in scene 5. Keep scoring mounted across scenes.
  if (step === "action") return null;
  const state =
    !terms.length || (status === "ready" && !result?.ranking.length)
      ? "empty"
      : status;
  const loadSample = () => {
    const store = useStore.getState();
    store.setSampleMode(true);
    store.setTranscript(sample.transcript_en);
    store.setTerms(
      sample.terms.map(({ hpo_id, label, present }) => ({
        hpo_id,
        label,
        present,
      })),
    );
    store.setStep("diagnosis");
  };
  const answer = (present: boolean) => {
    if (
      !question?.hpo_id ||
      !question.label ||
      questionStatus !== "ready" ||
      status !== "ready"
    )
      return;
    const store = useStore.getState();
    // Replace an existing finding atomically; never submit contradictory IDs.
    store.setTerms([
      ...store.terms.filter((term) => term.hpo_id !== question.hpo_id),
      { hpo_id: question.hpo_id, label: question.label, present },
    ]);
    store.setStep("diagnosis");
  };
  const nameFor = (id: string) =>
    result?.ranking.find((candidate) => candidate.disease_id === id)?.name ??
    id;
  return (
    <section
      className="cn-diagnosis"
      data-testid="diagnosis"
      aria-label="Phenotype matching"
    >
      <Panel
        title="Phenotype matches"
        state={state}
        trailing={
          <div className="cn-diagnosis-tools">
            {terms.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => useStore.getState().setTerms([])}
              >
                Clear findings
              </Button>
            )}
          </div>
        }
        emptyMessage={
          terms.length
            ? "No matching candidates were returned."
            : "Add findings or explore the published case."
        }
        emptyAction={
          <Button onClick={loadSample}>Load published sample</Button>
        }
        errorMessage="The matches could not be updated. Your findings are kept."
        onRetry={retry}
      >
        <div className="cn-diagnosis-grid">
          {result?.ranking.slice(0, 2).map((candidate) => (
            <motion.article
              key={candidate.disease_id}
              className="cn-diagnosis-candidate"
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: reduced ? 0 : 0.24,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <h3>
                <button
                  type="button"
                  aria-label={`Inspect ${candidate.name}`}
                  aria-pressed={selectedId === candidate.disease_id}
                  onClick={() => {
                    const store = useStore.getState();
                    store.setSelectedId(candidate.disease_id);
                    store.setStep("inspector");
                  }}
                >
                  {candidate.name}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </button>
              </h3>
              <p className="cn-id">{candidate.disease_id}</p>
              <Meter
                pct={candidate.pct}
                low={candidate.low}
                high={candidate.high}
              />
              <ul aria-label={`Leading findings for ${candidate.name}`}>
                {candidate.drivers.map((driver) => (
                  <Finding key={driver.hpo_id} driver={driver} />
                ))}
              </ul>
            </motion.article>
          ))}
          <section
            className="cn-diagnosis-question"
            aria-label="Next question"
            aria-busy={questionStatus === "loading" || undefined}
          >
            <h3>Next question</h3>
            {questionStatus === "loading" && (
              <div role="status" className="cn-diagnosis-question-loading">
                <span className="cn-sr-only">Finding a useful question</span>
                <span />
                <span />
              </div>
            )}
            {questionStatus === "error" && (
              <>
                <p role="alert">
                  A question could not be loaded. The matches are available.
                </p>
                <Button variant="secondary" onClick={retry}>
                  Retry question
                </Button>
              </>
            )}
            {questionStatus === "ready" &&
              (!question?.hpo_id || !question.label) && (
                <p>
                  {question?.question ??
                    "No supported question separates these candidates."}
                </p>
              )}
            {questionStatus === "ready" &&
              question?.hpo_id &&
              question.label && (
                <>
                  <p className="cn-diagnosis-question-text">
                    {question.question}
                  </p>
                  <div className="cn-diagnosis-outcomes">
                    <p>
                      <span>If yes</span>
                      {nameFor(question.if_yes)}
                    </p>
                    <p>
                      <span>If no</span>
                      {nameFor(question.if_no)}
                    </p>
                  </div>
                  <div className="cn-diagnosis-answers">
                    <Button onClick={() => answer(true)}>Yes</Button>
                    <Button variant="secondary" onClick={() => answer(false)}>
                      No
                    </Button>
                  </div>
                </>
              )}
          </section>
        </div>
      </Panel>
      <div className="cn-diagnosis-legend">
        <p>Phenotype match · not a diagnosis</p>
        {result && (
          <details>
            <summary>About these matches</summary>
            <p>
              {result.terms_used} findings compared across{" "}
              {result.total_diseases.toLocaleString("en-US")} diseases.
            </p>
            <p>{result.range_kind}</p>
            <p>{result.method}</p>
            <p>
              Only the two leading candidates are shown. The graph receives the
              full returned ranking.
            </p>
          </details>
        )}
      </div>
    </section>
  );
}
