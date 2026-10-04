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

// Pulgar abajo pausa; el puño se reserva para "agarrar" el mapa y moverlo.
export const PAUSE_GESTURE: GestureName = "Thumb_Down";
export const GRAB_GESTURE: GestureName = "Closed_Fist";

// Guía visible en el HUD (petición del humano de Saus: saber cómo hacer zoom y desplazarse).
export const GUIDE: { gesture: string; how: string; does: string }[] = [
  { gesture: "Point up", how: "Hold one finger up", does: "Open the top match" },
  { gesture: "Open palm", how: "Hold your palm open", does: "Go back one step" },
  { gesture: "Victory", how: "Hold two fingers up", does: "Jump to the next question" },
  { gesture: "Fist and move", how: "Close your fist and move it", does: "Drag the map left, right, up or down" },
  { gesture: "Pinch", how: "Fold three fingers, then open or close thumb and index", does: "Zoom in or out" },
  { gesture: "Thumb down", how: "Hold thumb down", does: "Pause or resume gestures" },
];

function constellationCanvas(): HTMLCanvasElement | null {
  return document.querySelector<HTMLCanvasElement>('[aria-label="Rare disease constellation"] canvas');
}

// Arrastre sintético del mapa: eventos de ratón (d3-zoom de cosmos.gl) y de puntero (renderer
// Canvas), que escuchan el arrastre de la misma forma que con la mano en el ratón.
let pan: { canvas: HTMLCanvasElement; x: number; y: number } | null = null;

function fire(target: EventTarget, type: string, x: number, y: number): void {
  const init = { clientX: x, clientY: y, bubbles: true, cancelable: true, view: window, button: 0, buttons: type.endsWith("up") ? 0 : 1 };
  target.dispatchEvent(new MouseEvent(type.replace("pointer", "mouse"), init));
  target.dispatchEvent(new PointerEvent(type, { ...init, pointerId: 1, pointerType: "mouse", isPrimary: true }));
}

export function beginPan(): void {
  const canvas = constellationCanvas();
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  pan = { canvas, x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  fire(canvas, "pointerdown", pan.x, pan.y);
}

/** Mueve el mapa `dx`, `dy` píxeles desde donde empezó el agarre. */
export function movePan(dx: number, dy: number): void {
  if (!pan) return;
  fire(pan.canvas, "pointermove", pan.x + dx, pan.y + dy);
}

export function endPan(dx: number, dy: number): void {
  if (!pan) return;
  fire(pan.canvas, "pointerup", pan.x + dx, pan.y + dy);
  pan = null;
}

/**
 * Zoom de la constelación con el pellizco: rueda sintética sobre su lienzo, que tanto cosmos.gl
 * (d3-zoom) como el renderer Canvas ya escuchan. `delta` > 0 acerca.
 */
export function zoomConstellation(delta: number): void {
  const canvas = constellationCanvas();
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
