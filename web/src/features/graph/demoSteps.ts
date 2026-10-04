import step01 from "../../../../app/fixtures/api/diagnose_step_01.json?url";
import step02 from "../../../../app/fixtures/api/diagnose_step_02.json?url";
import step03 from "../../../../app/fixtures/api/diagnose_step_03.json?url";
import step04 from "../../../../app/fixtures/api/diagnose_step_04.json?url";
import step05 from "../../../../app/fixtures/api/diagnose_step_05.json?url";

import { type Candidate, useStore } from "../../lib/store";

// Sólo con ?graph=steps: recorre los 5 pasos del caso de ejemplo (diagnose_step_*.json, demo_data)
// escribiendo `ranking` en el store, como lo hará HACK-018. Sirve para ver y ensayar la poda
// mientras el panel de diagnóstico no existe. Marca "Sample case" porque son datos de ejemplo.
const STEPS = [step01, step02, step03, step04, step05];
const STEP_MS = 2600;

type DiagnoseExample = { ranking: Candidate[] };

export function startDemoSteps(): () => void {
  let cancelled = false;
  let timer = 0;
  const store = useStore.getState();
  store.setSampleMode(true);

  Promise.all(STEPS.map((url) => fetch(url).then((r) => r.json() as Promise<DiagnoseExample>)))
    .then((steps) => {
      // Ciclo: base → paso 1..5 → base, para ver la ola en ambos sentidos.
      const sequence: Candidate[][] = [[], ...steps.map((step) => step.ranking)];
      let i = 0;
      const next = () => {
        if (cancelled) return;
        i = (i + 1) % sequence.length;
        useStore.getState().setRanking(sequence[i]);
        timer = window.setTimeout(next, STEP_MS);
      };
      timer = window.setTimeout(next, 1500);
    })
    .catch(() => undefined);

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
  };
}
