import { GestureRecognizer } from "@mediapipe/tasks-vision";
import wasmBinaryPath from "@mediapipe/tasks-vision/vision_wasm_internal.wasm?url";
import wasmLoaderPath from "@mediapipe/tasks-vision/vision_wasm_internal.js?url";

// Reconocedor de gestos de MediaPipe. El motor WASM sale del propio paquete (sin CDN); el modelo
// `gesture_recognizer.task` no viene en npm y se pide a Google la primera vez que se activan los
// gestos (requiere internet). Para una demo sin red: copiar el archivo en web/public/models/ y
// cambiar MODEL_URL a "/models/gesture_recognizer.task".
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";

export type GestureName = "Open_Palm" | "Pointing_Up" | "Victory" | "Closed_Fist" | "Thumb_Up" | "Thumb_Down" | "ILoveYou" | "None";

export type HandPoint = { x: number; y: number };

export type Reading = {
  gesture: GestureName;
  score: number;
  hand: HandPoint[] | null; // 21 puntos normalizados 0..1, para el HUD y el pellizco
};

let recognizer: Promise<GestureRecognizer> | null = null;

async function create(): Promise<GestureRecognizer> {
  const options = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: MODEL_URL, delegate },
    runningMode: "VIDEO" as const,
    numHands: 1,
  });
  const fileset = { wasmLoaderPath, wasmBinaryPath };
  try {
    return await GestureRecognizer.createFromOptions(fileset, options("GPU"));
  } catch {
    return GestureRecognizer.createFromOptions(fileset, options("CPU"));
  }
}

export function loadRecognizer(): Promise<GestureRecognizer> {
  recognizer ??= create().catch((error: unknown) => {
    recognizer = null; // permite reintentar al volver a activar los gestos
    throw error;
  });
  return recognizer;
}

export function read(instance: GestureRecognizer, video: HTMLVideoElement, now: number): Reading {
  const result = instance.recognizeForVideo(video, now);
  const top = result.gestures[0]?.[0];
  const hand = result.landmarks[0]?.map(({ x, y }) => ({ x, y })) ?? null;
  return {
    gesture: (top?.categoryName as GestureName | undefined) ?? "None",
    score: top?.score ?? 0,
    hand,
  };
}

/** Distancia pulgar–índice relativa al tamaño de la mano (muñeca → base del dedo medio). */
export function pinchRatio(hand: HandPoint[]): number {
  const distance = (a: HandPoint, b: HandPoint) => Math.hypot(a.x - b.x, a.y - b.y);
  const scale = distance(hand[0], hand[9]) || 1;
  return distance(hand[4], hand[8]) / scale;
}
