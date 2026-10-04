import type { Candidate, Term } from "../../lib/store";

export type Driver = Term & {
  direction: "supports" | "against" | "neutral";
  likelihood_ratio: number;
  log_lr: number;
  source: string | null;
};
export type RankedDisease = Candidate & { drivers: Driver[] };
export type DiagnosisResult = {
  demo_data: boolean;
  ranking: RankedDisease[];
  total_diseases: number;
  terms_used: number;
  range_kind: string;
  method: string;
};
export type NextQuestion = {
  demo_data: boolean;
  hpo_id: string | null;
  label: string | null;
  question: string;
  candidates: string[];
  if_yes: string;
  if_no: string;
  rationale: string;
};
