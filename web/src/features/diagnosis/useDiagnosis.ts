import { useEffect, useMemo, useState } from "react";
import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import type { Term } from "../../lib/store";
import type { DiagnosisResult, NextQuestion } from "./types";

type Status = "loading" | "ready" | "error";
type MatchState = {
  key: string;
  status: Status;
  result: DiagnosisResult | null;
  question: NextQuestion | null;
  questionStatus: Status;
};
// Ignore transcription quotes: only findings change a scoring request.
const termKey = (terms: Term[]) =>
  JSON.stringify(
    terms.map(({ hpo_id, label, present }) => ({ hpo_id, label, present })),
  );
export function useDiagnosis(terms: Term[]) {
  const key = useMemo(() => termKey(terms), [terms]);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<MatchState>({
    key: "",
    status: "ready",
    result: null,
    question: null,
    questionStatus: "ready",
  });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let deadline = 0;
    const current = () => active && termKey(useStore.getState().terms) === key;
    const store = useStore.getState();
    store.setNextQuestion(null);
    if (key === "[]") {
      store.setRanking([]);
      return () => {
        active = false;
        controller.abort();
      };
    }
    const request = {
      method: "POST",
      body: `{"terms":${key}}`,
      signal: controller.signal,
    };
    async function load() {
      let result: DiagnosisResult;
      try {
        // No automatic fixture fallback: a fixed ranking cannot answer changed findings.
        result = await api<DiagnosisResult>("/diagnose", request);
        if (!current()) return;
        store.setRanking(result.ranking);
        if (result.demo_data) store.setSampleMode(true);
        setState({
          key,
          status: "ready",
          result,
          question: null,
          questionStatus: result.ranking.length >= 2 ? "loading" : "ready",
        });
      } catch {
        if (!current()) return;
        store.setRanking([]);
        setState({
          key,
          status: "error",
          result: null,
          question: null,
          questionStatus: "error",
        });
        return;
      }
      if (result.ranking.length < 2) return;
      try {
        const question = await api<NextQuestion>("/next-question", request);
        if (!current()) return;
        store.setNextQuestion(question.hpo_id ? question.question : null);
        if (question.demo_data) store.setSampleMode(true);
        setState((previous) => ({
          ...previous,
          question,
          questionStatus: "ready",
        }));
      } catch {
        if (current())
          setState((previous) => ({ ...previous, questionStatus: "error" }));
      }
    }
    // Debounce fast transcript updates; cancellation also prevents stale store writes.
    const timer = window.setTimeout(() => {
      if (!current()) return;
      setState({
        key,
        status: "loading",
        result: null,
        question: null,
        questionStatus: "loading",
      });
      deadline = window.setTimeout(() => controller.abort(), 10000);
      void load().finally(() => window.clearTimeout(deadline));
    }, 150);
    return () => {
      active = false;
      window.clearTimeout(timer);
      window.clearTimeout(deadline);
      controller.abort();
    };
  }, [key, attempt]);

  const current = state.key === key && terms.length > 0;
  return {
    result: current ? state.result : null,
    status: current ? state.status : terms.length ? "loading" : "ready",
    question: current ? state.question : null,
    questionStatus: current ? state.questionStatus : "loading",
    retry: () => {
      setState({
        key,
        status: "loading",
        result: null,
        question: null,
        questionStatus: "loading",
      });
      setAttempt((previous) => previous + 1);
    },
  };
}
