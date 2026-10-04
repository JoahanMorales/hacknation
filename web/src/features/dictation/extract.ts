import sampleCaseUrl from "../../../../app/fixtures/case/pompe_case.json?url&no-inline";
import sampleExtractUrl from "../../../../app/fixtures/api/symptoms_extract.json?url&no-inline";

import { api } from "../../lib/api";
import { useStore } from "../../lib/store";

// Contrato SymptomTerm (HACK-002): `quote` es el fragmento literal del dictado que lo originó.
export type ExtractedTerm = { hpo_id: string; label: string; present: boolean; quote?: string };

type ExtractResult = { terms: ExtractedTerm[]; demo_data: boolean; extraction_method: string };

export type SampleCase = { transcript_en: string; transcript_es: string; terms: ExtractedTerm[] };

let sampleCase: Promise<SampleCase> | null = null;
let sampleExtract: Promise<ExtractResult> | null = null;

const json = <T,>(url: string) =>
  fetch(url).then((response) => {
    if (!response.ok) throw new Error(`${url} ${response.status}`);
    return response.json() as Promise<T>;
  });

/** Caso publicado PMID 7668832 (app/fixtures/case, demo_data): narración y términos esperados. */
export function loadSampleCase(): Promise<SampleCase> {
  sampleCase ??= json<SampleCase>(sampleCaseUrl).catch((error: unknown) => {
    sampleCase = null;
    throw error;
  });
  return sampleCase;
}

/**
 * POST /api/symptoms/extract (HACK-008) con el texto dictado hasta ahora.
 * Sin backend, usa el ejemplo del contrato. Con datos de ejemplo se queda sólo con los términos cuya cita ya aparece en el
 * texto: así el respaldo no adelanta síntomas que el médico todavía no dijo. Enciende "Sample case".
 */
export async function extractTerms(transcript: string, language: "en" | "es"): Promise<ExtractedTerm[]> {
  let result: ExtractResult;
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 10000);
  try {
    result = await api<ExtractResult>("/symptoms/extract", {
      method: "POST",
      body: JSON.stringify({ transcript, language }),
      signal: controller.signal,
    });
  } catch {
    sampleExtract ??= json<ExtractResult>(sampleExtractUrl).catch((error: unknown) => {
      sampleExtract = null;
      throw error;
    });
    result = await sampleExtract;
  } finally {
    window.clearTimeout(timer);
  }
  if (!result.demo_data) return result.terms;
  // Respuesta grabada (backend sin API key) o ejemplo del contrato: trae el caso completo, así que
  // se queda sólo con lo ya dicho.
  useStore.getState().setSampleMode(true);
  const text = transcript.toLowerCase();
  return result.terms.filter((term) => term.quote && text.includes(term.quote.toLowerCase()));
}
