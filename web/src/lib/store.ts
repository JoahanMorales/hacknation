import { create } from "zustand";

// Estado compartido de la UI: las features leen y escriben aquí; no se importan entre sí.
export type Step = "constellation" | "dictation" | "diagnosis" | "inspector" | "pathway" | "action";

export type Term = { hpo_id: string; label: string; present: boolean };

export type Candidate = { disease_id: string; name: string; pct: number; low: number; high: number };

type State = {
  step: Step;
  transcript: string;
  terms: Term[];
  ranking: Candidate[];
  nextQuestion: string | null;
  selectedId: string | null;
  // Arista resaltada en la constelación (citas del inspector, HACK-019).
  highlightedEdgeId: string | null;
  sampleMode: boolean;
  setStep: (step: Step) => void;
  setTranscript: (transcript: string) => void;
  setTerms: (terms: Term[]) => void;
  setRanking: (ranking: Candidate[]) => void;
  setNextQuestion: (nextQuestion: string | null) => void;
  setSelectedId: (selectedId: string | null) => void;
  setHighlightedEdgeId: (highlightedEdgeId: string | null) => void;
  setSampleMode: (sampleMode: boolean) => void;
};

export const useStore = create<State>()((set) => ({
  step: "constellation",
  transcript: "",
  terms: [],
  ranking: [],
  nextQuestion: null,
  selectedId: null,
  highlightedEdgeId: null,
  sampleMode: false,
  setStep: (step) => set({ step }),
  setTranscript: (transcript) => set({ transcript }),
  setTerms: (terms) => set({ terms }),
  setRanking: (ranking) => set({ ranking }),
  setNextQuestion: (nextQuestion) => set({ nextQuestion }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setHighlightedEdgeId: (highlightedEdgeId) => set({ highlightedEdgeId }),
  setSampleMode: (sampleMode) => set({ sampleMode }),
}));
