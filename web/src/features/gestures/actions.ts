import { useStore } from "../../lib/store";
import type { GestureName } from "./recognizer";

// Qué hace cada gesto (TASKS.md HACK-013). Sólo store y DOM: las features no se importan entre sí.
// Ningún gesto responde una pregunta clínica ni añade hallazgos: un falso positivo de la cámara no
// puede cambiar el diagnóstico. Victory lleva el foco a la siguiente pregunta y el médico confirma.

export type GestureAction = { gesture: GestureName; label: string; run: () => string };

// Escenas en orden del recorrido; "atrás" retrocede una.
function back(): string {
  const store = useStore.getState();
  if (store.step === "action") {
    store.setStep("inspector");
    return "Back to the disease";
  }
  if (store.selectedId) {
    store.setSelectedId(null);
    store.setHighlightedEdgeId(null);
    store.setStep("diagnosis");
    return "Inspector closed";
  }
  if (store.step !== "constellation") {
    store.setStep("constellation");
    return "Back to the constellation";
  }
  return "Already at the start";
}

function openTopCandidate(): string {
  const store = useStore.getState();
  const top = store.ranking[0];
  if (!top) return "No candidates yet";
  store.setSelectedId(top.disease_id);
  store.setStep("inspector");
  return `Opened ${top.name}`;
}

function focusNextQuestion(): string {
  const yes = [...document.querySelectorAll<HTMLButtonElement>('[data-testid="diagnosis"] button')].find(
    (button) => button.textContent?.trim() === "Yes" && !button.disabled,
  );
  if (!yes) return "No question right now";
  yes.scrollIntoView({ block: "nearest", behavior: "smooth" });
  yes.focus();
  return "Next question. Answer with a click";
}

export const ACTIONS: GestureAction[] = [
  { gesture: "Open_Palm", label: "Open palm · back", run: back },
  { gesture: "Pointing_Up", label: "Point · open", run: openTopCandidate },
  { gesture: "Victory", label: "Victory · next question", run: focusNextQuestion },
];

export const PAUSE_GESTURE: GestureName = "Closed_Fist";

/**
 * Zoom de la constelación con el pellizco: rueda sintética sobre su lienzo, que tanto cosmos.gl
 * (d3-zoom) como el renderer Canvas ya escuchan. `delta` > 0 acerca.
 */
export function zoomConstellation(delta: number): void {
  const canvas = document.querySelector<HTMLCanvasElement>('[aria-label="Rare disease constellation"] canvas');
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(
    new WheelEvent("wheel", {
      deltaY: -delta,
      deltaMode: 0,
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
      bubbles: true,
      cancelable: true,
    }),
  );
}
