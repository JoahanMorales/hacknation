import { HandPalm, Question } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "../../ui";
import { ACTIONS, beginPan, endPan, GRAB_GESTURE, GUIDE, movePan, PAUSE_GESTURE, zoomConstellation } from "./actions";
import { HandHud } from "./HandHud";
import { type GestureName, type HandPoint, loadRecognizer, pinchRatio, read } from "./recognizer";

// HACK-013 · Gestos (P1): interruptor "Gestures"; con la cámara, Open_Palm = atrás, Pointing_Up =
// abrir la candidata principal, Victory = siguiente pregunta, puño y mover = arrastrar el mapa,
// pellizco = zoom y pulgar abajo = pausar/reanudar. Guía visible en el HUD. El ratón sigue igual.
export const slot = "overlay";
export const order = 90;

type Status = "off" | "loading" | "on" | "error";

const HOLD_MS = 600; // debounce: el gesto debe sostenerse este tiempo
const MIN_SCORE = 0.6;
const PINCH_STEP = 0.04; // cambio mínimo del pellizco para hacer zoom
const PINCH_GAIN = 900;
const GRAB_DELAY_MS = 150; // evita arrastres por un puño fugaz al cambiar de gesto
const PAN_GAIN = 1.6; // la mano recorre menos que la pantalla

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
  const [guide, setGuide] = useState(false);
  const guideShownRef = useRef(false); // la guía se abre sola la primera vez que se activan

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
    try {
      // Sin contexto seguro (http fuera de localhost) el navegador no expone la cámara.
      if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("Camera API unavailable", "NotSupportedError");
      // La cámara se registra en cuanto se concede: si el modelo falla, se cancela o se desmonta,
      // stop() la apaga aunque la otra promesa termine después.
      const camera = navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480, facingMode: "user" } })
        .then((stream) => {
          if (run === runRef.current) streamRef.current = stream;
          else stream.getTracks().forEach((track) => track.stop());
          return stream;
        });
      const [recognizer, stream] = await Promise.all([loadRecognizer(), camera]);
      const video = videoRef.current;
      if (run !== runRef.current || !video) return;
      video.srcObject = stream;
      await video.play();
      setStatus("on");
      if (!guideShownRef.current) {
        guideShownRef.current = true;
        setGuide(true);
      }

      // Estado del debounce y del pellizco entre cuadros.
      let held: GestureName = "None";
      let heldSince = 0;
      let fired = false;
      let pinchBase: number | null = null;
      let grab: { x: number; y: number; dx: number; dy: number } | null = null;
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

        // Puño y mover: arrastra el mapa como con el ratón (espejo: mano a la derecha = mapa a la derecha).
        const palm = reading.hand?.[9];
        if (!pausedRef.current && current === GRAB_GESTURE && palm && now - heldSince >= GRAB_DELAY_MS) {
          if (!grab) {
            grab = { x: palm.x, y: palm.y, dx: 0, dy: 0 };
            beginPan();
          } else {
            grab.dx = -(palm.x - grab.x) * window.innerWidth * PAN_GAIN;
            grab.dy = (palm.y - grab.y) * window.innerHeight * PAN_GAIN;
            movePan(grab.dx, grab.dy);
          }
        } else if (grab) {
          endPan(grab.dx, grab.dy);
          grab = null;
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
          setMessage(pausedRef.current ? "Gestures paused. Thumb down again to resume" : "Gestures resumed");
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
          : error instanceof DOMException && error.name === "NotSupportedError"
            ? "This page cannot use the camera here (open it on localhost or https). The mouse still works."
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

  const label =
    ACTIONS.find((a) => a.gesture === gesture)?.label ??
    (gesture === PAUSE_GESTURE ? "Thumb down · pause" : gesture === GRAB_GESTURE ? "Fist · drag the map" : null);

  // El botón vive a la derecha de la cabecera, junto a "Focus atlas" (izquierda: nombre y recorrido;
  // centro: búsqueda); el HUD y la guía bajan por la columna central, sin tapar dictado, inspector ni
  // diagnóstico. Sólo los elementos visibles reciben clics.
  return (
    <>
      <div className="pointer-events-none fixed right-[9.5rem] top-[1.1rem] z-20 flex items-center gap-1">
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
        <Button
          className="pointer-events-auto"
          variant="ghost"
          onClick={() => setGuide((open) => !open)}
          aria-label="Gesture guide"
          aria-pressed={guide}
        >
          <Question size={18} aria-hidden />
        </Button>
      </div>

      {/* El video sólo alimenta al reconocedor; no se muestra. */}
      <video ref={videoRef} muted playsInline className="hidden" />

      {(status === "on" || status === "error" || guide) && (
        <div className="pointer-events-none fixed left-1/2 top-24 z-20 flex w-[min(30rem,calc(100vw-50rem))] min-w-[18rem] -translate-x-1/2 flex-col gap-2">
          {status === "on" && (
            <div className="cn-panel pointer-events-auto flex items-center gap-3 p-3" role="status" aria-live="polite">
              <HandHud hand={hand} progress={progress} active={!paused && label !== null} />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-sm text-ink">{paused ? "Paused" : (label ?? (hand ? "Hand detected" : "Show your hand"))}</p>
                {message && <p className="mt-1 text-xs text-muted">{message}</p>}
              </div>
            </div>
          )}
          {status === "error" && message && (
            <p role="status" className="cn-panel pointer-events-auto px-3 py-2 text-xs text-ink">{message}</p>
          )}
          {guide && status !== "error" && (
            <div className="cn-panel pointer-events-auto p-4" aria-label="How to use gestures">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-ink">How to use gestures</p>
                <Button variant="ghost" onClick={() => setGuide(false)}>Hide</Button>
              </div>
              <ul className="flex flex-col gap-2">
                {GUIDE.map((item) => (
                  <li key={item.gesture} className="grid grid-cols-[7rem_1fr] gap-3 text-xs">
                    <span className="font-mono text-ink">{item.gesture}</span>
                    <span className="text-muted"><span className="text-ink">{item.does}.</span> {item.how}.</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Hold each gesture until the ring fills. The mouse always works.</p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
