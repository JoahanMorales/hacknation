import { create } from "zustand";

// Estado compartido de la UI: las features leen y escriben aquí; no se importan entre sí.
export type Step = "constellation" | "dictation" | "diagnosis" | "inspector" | "action";

export type Term = { hpo_id: string; label: string; present: boolean };

export type Candidate = { disease_id: string; name: string; pct: number; low: number; high: number };

type State = {
  step: Step;
  transcript: string;
  terms: Term[];
  ranking: Candidate[];
  nextQuestion: string | null;
  selectedId: string | null;
  sampleMode: boolean;
  setStep: (step: Step) => void;
  setTranscript: (transcript: string) => void;
  setTerms: (terms: Term[]) => void;
  setRanking: (ranking: Candidate[]) => void;
  setNextQuestion: (nextQuestion: string | null) => void;
  setSelectedId: (selectedId: string | null) => void;
  setSampleMode: (sampleMode: boolean) => void;
};

export const useStore = create<State>()((set) => ({
  step: "constellation",
  transcript: "",
  terms: [],
  ranking: [],
  nextQuestion: null,
  selectedId: null,
  sampleMode: false,
  setStep: (step) => set({ step }),
  setTranscript: (transcript) => set({ transcript }),
  setTerms: (terms) => set({ terms }),
  setRanking: (ranking) => set({ ranking }),
  setNextQuestion: (nextQuestion) => set({ nextQuestion }),
  setSelectedId: (selectedId) => set({ selectedId }),
  setSampleMode: (sampleMode) => set({ sampleMode }),
}));
