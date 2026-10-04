import { HandPalm } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "../../ui";
import { ACTIONS, PAUSE_GESTURE, zoomConstellation } from "./actions";
import { HandHud } from "./HandHud";
import { type GestureName, type HandPoint, loadRecognizer, pinchRatio, read } from "./recognizer";

// HACK-013 · Gestos (P1): interruptor "Gestures"; con la cámara, Open_Palm = atrás, Pointing_Up =
// abrir la candidata principal, Victory = siguiente pregunta, Closed_Fist = pausar/reanudar los
// gestos y pellizco = zoom de la constelación. El ratón sigue funcionando siempre.
export const slot = "overlay";
export const order = 90;

type Status = "off" | "loading" | "on" | "error";

const HOLD_MS = 600; // debounce: el gesto debe sostenerse este tiempo
const MIN_SCORE = 0.6;
const PINCH_STEP = 0.04; // cambio mínimo del pellizco para hacer zoom
const PINCH_GAIN = 900;

// Con medio, anular y meñique doblados, el pulgar y el índice controlan el zoom.
function pinchPose(hand: HandPoint[]): boolean {
  const curled = (tip: number, base: number) =>
    Math.hypot(hand[tip].x - hand[0].x, hand[tip].y - hand[0].y) < Math.hypot(hand[base].x - hand[0].x, hand[base].y - hand[0].y);
  return curled(12, 9) && curled(16, 13) && curled(20, 17);
}

export default function Gestures() {
  const [status, setStatus] = useState<Status>("off");
  const [paused, setPaused] = useState(false);
  const [hand, setHand] = useState<HandPoint[] | null>(null);
  const [gesture, setGesture] = useState<GestureName>("None");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef(0);
  const pausedRef = useRef(false);
  const runRef = useRef(0); // cada apagado invalida el arranque en curso

  const stop = useCallback(() => {
    runRef.current++;
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setHand(null);
    setGesture("None");
    setProgress(0);
  }, []);

  const start = useCallback(async () => {
    const run = ++runRef.current;
    setStatus("loading");
    setMessage(null);
    // La cámara se registra en cuanto se concede: si el modelo falla, se cancela o se desmonta,
    // stop() la apaga aunque la otra promesa termine después.
    const camera = navigator.mediaDevices
      .getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
      .then((stream) => {
        if (run === runRef.current) streamRef.current = stream;
        else stream.getTracks().forEach((track) => track.stop());
        return stream;
      });
    try {
      const [recognizer, stream] = await Promise.all([loadRecognizer(), camera]);
      const video = videoRef.current;
      if (run !== runRef.current || !video) return;
      video.srcObject = stream;
      await video.play();
      setStatus("on");

      // Estado del debounce y del pellizco entre cuadros.
      let held: GestureName = "None";
      let heldSince = 0;
      let fired = false;
      let pinchBase: number | null = null;
      let lastVideoTime = -1;

      const loop = (now: number) => {
        frameRef.current = requestAnimationFrame(loop);
        if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
        lastVideoTime = video.currentTime;
        const reading = read(recognizer, video, now);
        const current = reading.score >= MIN_SCORE ? reading.gesture : "None";
        setHand(reading.hand);
        setGesture(current);

        // Pellizco: zoom continuo mientras se mantiene la pose.
        if (!pausedRef.current && reading.hand && current === "None" && pinchPose(reading.hand)) {
          const ratio = pinchRatio(reading.hand);
          if (pinchBase === null) pinchBase = ratio;
          else if (Math.abs(ratio - pinchBase) > PINCH_STEP) {
            zoomConstellation((ratio - pinchBase) * PINCH_GAIN);
            pinchBase = ratio;
          }
        } else {
          pinchBase = null;
        }

        if (current !== held) {
          held = current;
          heldSince = now;
          fired = false;
        }
        const tracked = current === PAUSE_GESTURE || (!pausedRef.current && ACTIONS.some((a) => a.gesture === current));
        if (!tracked || fired) {
          setProgress(0);
          return;
        }
        const elapsed = now - heldSince;
        setProgress(Math.min(1, elapsed / HOLD_MS));
        if (elapsed < HOLD_MS) return;
        // Un disparo por gesto sostenido: para repetir hay que cambiar de gesto.
        fired = true;
        setProgress(0);
        if (current === PAUSE_GESTURE) {
          pausedRef.current = !pausedRef.current;
          setPaused(pausedRef.current);
          setMessage(pausedRef.current ? "Gestures paused. Fist again to resume" : "Gestures resumed");
          return;
        }
        const action = ACTIONS.find((a) => a.gesture === current);
        if (action) setMessage(action.run());
      };
      frameRef.current = requestAnimationFrame(loop);
    } catch (error) {
      if (run !== runRef.current) return; // apagado a mitad del arranque: stop() ya limpió
      stop();
      setStatus("error");
      setMessage(
        error instanceof DOMException && error.name === "NotAllowedError"
          ? "Camera access was blocked. The mouse still works."
          : "Gestures could not start. The mouse still works.",
      );
    }
  }, [stop]);

  const toggle = () => {
    if (status === "on" || status === "loading") {
      stop();
      setStatus("off");
      setMessage(null);
      pausedRef.current = false;
      setPaused(false);
    } else {
      void start();
    }
  };

  useEffect(() => stop, [stop]);

  const label = ACTIONS.find((a) => a.gesture === gesture)?.label ?? (gesture === PAUSE_GESTURE ? "Fist · pause" : null);

  // Columna central de arriba: no tapa los paneles laterales (inspector, dictado). Sólo el botón y el
  // HUD reciben clics; el hueco entre ellos los deja pasar.
  return (
    <div className="pointer-events-none fixed left-1/2 top-5 z-20 flex -translate-x-1/2 flex-col items-center gap-2">
      <Button
        className="pointer-events-auto"
        variant={status === "on" ? "primary" : "secondary"}
        onClick={toggle}
        loading={status === "loading"}
        aria-pressed={status === "on"}
      >
        <HandPalm size={18} aria-hidden />
        {status === "on" ? "Gestures on" : "Gestures"}
      </Button>

      {/* El video sólo alimenta al reconocedor; no se muestra. */}
      <video ref={videoRef} muted playsInline className="hidden" />

      {status === "on" && (
        <div className="cn-panel pointer-events-auto flex items-center gap-3 p-3" role="status" aria-live="polite">
          <HandHud hand={hand} progress={progress} active={!paused && label !== null} />
          <div className="w-40">
            <p className="font-mono text-xs text-ink">{paused ? "Paused" : (label ?? (hand ? "Hand detected" : "Show your hand"))}</p>
            {message && <p className="mt-1 text-xs text-muted">{message}</p>}
          </div>
        </div>
      )}
      {status === "error" && message && (
        <p role="status" className="cn-panel pointer-events-auto max-w-56 px-3 py-2 text-xs text-ink">
          {message}
        </p>
      )}
    </div>
  );
}
