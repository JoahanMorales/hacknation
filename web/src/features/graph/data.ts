import sampleOverviewUrl from "../../../../app/fixtures/api/graph_overview.json?url";

import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import type { GraphOverview } from "./types";

// GET /api/graph/overview (HACK-003, 12,867 enfermedades). Si el backend no responde, usa el ejemplo
// del contrato (300 nodos, demo_data) y enciende "Sample case". El ejemplo se pide por URL y no se
// importa: así no pesa en el bundle cuando el backend sí responde.
export async function loadOverview(): Promise<GraphOverview> {
  try {
    return await api<GraphOverview>("/graph/overview");
  } catch {
    const response = await fetch(sampleOverviewUrl);
    if (!response.ok) throw new Error(`sample overview ${response.status}`);
    useStore.getState().setSampleMode(true);
    return (await response.json()) as GraphOverview;
  }
}
