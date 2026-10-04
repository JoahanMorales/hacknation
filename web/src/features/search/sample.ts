export type ResultType = "disease" | "gene" | "symptom" | "mechanism" | "group" | "asset";
export type SearchResult = {
  type: ResultType;
  id: string;
  label: string;
  matched: string;
  disease_ids: string[];
  score: number;
};
export type SearchResponse = { query: string; results: SearchResult[]; demo_data?: boolean };

// Small, explicitly labelled fallback from the curated deep layer. Scores rank retrieval only.
const examples: (SearchResult & { aliases: string[] })[] = [
  { type: "disease", id: "ORPHA:34515", label: "FKRP-related limb-girdle muscular dystrophy R9", matched: "LGMD2I", disease_ids: ["ORPHA:34515"], score: 100, aliases: ["LGMD2I", "FKRP", "ORPHA:34515"] },
  { type: "disease", id: "OMIM:621314", label: "Pompe disease, late-onset", matched: "Pompe", disease_ids: ["OMIM:621314"], score: 100, aliases: ["Pompe", "LOPD", "OMIM:621314"] },
  { type: "gene", id: "FKRP", label: "FKRP", matched: "FKRP", disease_ids: ["ORPHA:34515", "OMIM:613153"], score: 100, aliases: ["FKRP"] },
  { type: "symptom", id: "HP:0003236", label: "Elevated circulating creatine kinase concentration", matched: "Elevated circulating creatine kinase concentration", disease_ids: [], score: 100, aliases: ["elevated CK", "creatina quinasa", "creatine kinase", "HP:0003236"] },
  { type: "mechanism", id: "glycosylation.ribitol", label: "Ribitol-phosphate transfer onto alpha-dystroglycan", matched: "ribitol", disease_ids: ["ORPHA:34515"], score: 100, aliases: ["ribitol", "FKRP", "glycosylation.ribitol"] },
  { type: "group", id: "CureLGMD2i", label: "CureLGMD2i", matched: "CureLGMD2i", disease_ids: ["ORPHA:34515"], score: 100, aliases: ["CureLGMD2i"] },
  { type: "asset", id: "NCT04001595", label: "Global FKRP Registry", matched: "NCT04001595", disease_ids: ["ORPHA:34515"], score: 100, aliases: ["NCT04001595", "Global FKRP Registry", "FKRP"] },
];

export function sampleSearch(query: string): SearchResponse {
  const normalized = query.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  return {
    query, demo_data: true,
    results: normalized ? examples.flatMap(({ aliases, ...result }) => {
      const match = aliases.find((alias) => alias.toLowerCase().includes(normalized))
        ?? (result.label.toLowerCase().includes(normalized) ? result.label : undefined);
      return match ? [{ ...result, matched: match }] : [];
    }) : [],
  };
}
