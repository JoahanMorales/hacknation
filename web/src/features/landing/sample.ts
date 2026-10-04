import sampleCaseUrl from "../../../../app/fixtures/case/pompe_case.json?url&no-inline";

// Caso publicado PMID 7668832 (app/fixtures/case, phenopacket-store 0.1.27): términos dictados reales.
type Term = { hpo_id: string; label: string; present: boolean };
export type SampleCase = { pmid: string; terms: Term[] };

export async function loadSampleCase(): Promise<SampleCase> {
  const response = await fetch(sampleCaseUrl);
  if (!response.ok) throw new Error(`sample case ${response.status}`);
  return (await response.json()) as SampleCase;
}
