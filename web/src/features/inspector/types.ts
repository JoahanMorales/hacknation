// Forma de NodeResult, Edge y ExplainResult en app/schemas/ (HACK-002).
export type ApiEvidence = "observado" | "inferido" | "hipotesis" | "contradictorio";

export type Edge = {
  id: string;
  src: string;
  dst: string;
  type: string;
  source_url: string;
  record_id: string;
  retrieved_at: string;
  confidence: number;
  evidence_level: ApiEvidence;
  summary: string;
  confidence_note: string;
};

export type SymptomTerm = { hpo_id: string; label: string; present: boolean; quote: string | null };

export type NodeResult = {
  demo_data: boolean;
  disease: { id: string; name: string; synonyms: string[]; group: string; mechanism_ids: string[] };
  genes: { symbol: string; disease_ids: string[]; pathway: string }[];
  mechanisms: { id: string; name: string; gene_symbols: string[]; source_url: string }[];
  summary: string;
  symptoms_for: SymptomTerm[];
  symptoms_against: SymptomTerm[];
  edges: Edge[];
};

export type ExplainResult = {
  demo_data: boolean;
  disease_id: string;
  text: string;
  citations: { edge_id: string; source_url: string }[];
  generation_method: string;
};
