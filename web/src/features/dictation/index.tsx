import { Microphone, Play, Stop } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { type Term, useStore } from "../../lib/store";
import { Button, Chip, Panel } from "../../ui";
import { type ExtractedTerm, extractTerms, loadSampleCase } from "./extract";
import { type LiveSession, LiveUnavailableError, startLive } from "./live";
import { Waveform } from "./Waveform";

// HACK-017 · Dictado: escena 2 de docs/FRONTEND-BRIEF.md. El médico habla (o se reproduce el caso de
// ejemplo), cada síntoma reconocido se vuelve chip y vuela hacia la constelación.
// `terms` del store es la única fuente de los chips: también los escribe el diagnóstico (HACK-018,
// "Load published sample" y la siguiente pregunta), y aquí se ven igual.
export const slot = "left";
export const order = 10;

type Mode = "idle" | "sample" | "starting" | "live" | "stopping";
type Flight = { key: number; label: string; present: boolean; from: DOMRect };

const EASE = [0.16, 1, 0.3, 1] as const;
const TYPE_MS = 34;
const COMMA_PAUSE_MS = 220;
const SENTENCE_PAUSE_MS = 520;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export default function Dictation() {
  const step = useStore((state) => state.step);
  const terms = useStore((state) => state.terms);
  const setStep = useStore((state) => state.setStep);
  const setTerms = useStore((state) => state.setTerms);
  const setStoreTranscript = useStore((state) => state.setTranscript);

  const [mode, setMode] = useState<Mode>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);
  // Cita literal de cada término reconocido en el dictado, para subrayarla en el texto.
  const [quotes, setQuotes] = useState<Map<string, string>>(new Map());

  const runRef = useRef(0); // invalida reproducciones o sesiones anteriores
  const liveRef = useRef<LiveSession | null>(null);
  const removedRef = useRef(new Set<string>());
  const chipsRef = useRef<HTMLUListElement>(null);
  const flightKey = useRef(0);

  // Fusiona lo que devuelve la extracción sin pisar lo que el médico corrigió (quitar o negar).
  const merge = useCallback(
    (found: ExtractedTerm[]) => {
      const current = useStore.getState().terms;
      const known = new Set(current.map((term) => term.hpo_id));
      const fresh = found.filter((term) => !known.has(term.hpo_id) && !removedRef.current.has(term.hpo_id));
      if (fresh.length === 0) return;
      setTerms([...current, ...fresh.map(({ hpo_id, label, present }): Term => ({ hpo_id, label, present }))]);
      setQuotes((previous) => {
        const next = new Map(previous);
        fresh.forEach((term) => term.quote && next.set(term.hpo_id, term.quote));
        return next;
      });
      const from = chipsRef.current?.getBoundingClientRect();
      if (from && !reducedMotion()) {
        setFlights((list) => [
          ...list,
          ...fresh.map((term) => ({ key: ++flightKey.current, label: term.label, present: term.present, from })),
        ]);
      }
    },
    [setTerms],
  );

  const runExtraction = useCallback(
    async (text: string, run: number) => {
      if (!text.trim()) return;
      setExtracting(true);
      try {
        const found = await extractTerms(text, "en");
        if (run === runRef.current) merge(found);
      } finally {
        if (run === runRef.current) setExtracting(false);
      }
    },
    [merge],
  );

  const reset = useCallback(() => {
    runRef.current++;
    void liveRef.current?.stop();
    liveRef.current = null;
    setStream(null);
    removedRef.current.clear();
    setMode("idle");
    setTranscript("");
    setInterim("");
    setNotice(null);
    setExtracting(false);
    setQuotes(new Map());
    setStoreTranscript("");
    setTerms([]);
  }, [setStoreTranscript, setTerms]);

  // "Play sample case": teclea la narración del caso publicado con ritmo natural (plan B sin micro).
  const playSample = useCallback(async () => {
    reset();
    const run = runRef.current;
    setMode("sample");
    setStep("dictation");
    useStore.getState().setSampleMode(true);
    try {
      const sample = await loadSampleCase();
      const text = sample.transcript_en;
      for (let i = 1; i <= text.length; i++) {
        if (run !== runRef.current) return;
        const typed = text.slice(0, i);
        setTranscript(typed);
        setStoreTranscript(typed);
        const char = text[i - 1];
        const sentenceEnd = char === "." || char === "?";
        if (sentenceEnd) void runExtraction(typed, run);
        const wait = reducedMotion() ? 0 : sentenceEnd ? SENTENCE_PAUSE_MS : char === "," ? COMMA_PAUSE_MS : TYPE_MS;
        if (wait) await new Promise((resolve) => window.setTimeout(resolve, wait));
      }
      if (run === runRef.current) setMode("idle");
    } catch {
      if (run === runRef.current) {
        setMode("idle");
        setNotice("The sample case could not load.");
      }
    }
  }, [reset, runExtraction, setStep, setStoreTranscript]);

  const startMic = useCallback(async () => {
    reset();
    const run = runRef.current;
    setMode("starting");
    setStep("dictation");
    let finalText = "";
    try {
      const session = await startLive({
        onDelta: (delta) => run === runRef.current && setInterim((current) => current + delta),
        onSegment: (segment) => {
          if (run !== runRef.current) return;
          finalText = `${finalText} ${segment}`.trim();
          setTranscript(finalText);
          setStoreTranscript(finalText);
          setInterim("");
          void runExtraction(finalText, run);
        },
        onError: (message) => run === runRef.current && setNotice(message),
      });
      if (run !== runRef.current) {
        void session.stop();
        return;
      }
      liveRef.current = session;
      setStream(session.stream);
      setMode("live");
    } catch (error) {
      if (run !== runRef.current) return;
      setMode("idle");
      setNotice(
        error instanceof LiveUnavailableError
          ? "Live dictation is off on this server. Play the sample case instead."
          : error instanceof DOMException && error.name === "NotAllowedError"
            ? "Microphone access was blocked. Allow it, or play the sample case."
            : "Live dictation could not start. Play the sample case instead.",
      );
    }
  }, [reset, runExtraction, setStep, setStoreTranscript]);

  const stopMic = useCallback(async () => {
    const session = liveRef.current;
    if (!session) return;
    setMode("stopping");
    await session.stop();
    liveRef.current = null;
    setStream(null);
    setMode("idle");
  }, []);

  useEffect(
    () => () => {
      runRef.current++;
      void liveRef.current?.stop();
    },
    [],
  );

  const toggleTerm = (id: string) =>
    setTerms(useStore.getState().terms.map((term) => (term.hpo_id === id ? { ...term, present: !term.present } : term)));
  const removeTerm = (id: string) => {
    removedRef.current.add(id);
    setTerms(useStore.getState().terms.filter((term) => term.hpo_id !== id));
  };

  if (step === "action") return null;

  const listening = mode === "live";
  const busy = mode === "starting" || mode === "stopping";
  const typing = mode === "sample";
  const highlighted = terms.flatMap((term) => {
    const quote = quotes.get(term.hpo_id);
    return quote ? [quote] : [];
  });

  return (
    <Panel
      aria-label="Dictation"
      title="Dictation"
      trailing={
        (transcript || terms.length > 0) && (
          <Button variant="ghost" onClick={reset}>
            Clear
          </Button>
        )
      }
      // El aside izquierdo tiene altura fija: el cuerpo del panel se desplaza en vez de cortarse.
      className="flex min-h-0 flex-col [&_.cn-panel-body]:min-h-0 [&_.cn-panel-body]:overflow-y-auto"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <motion.button
            type="button"
            onClick={listening ? stopMic : startMic}
            disabled={busy || typing}
            whileTap={reducedMotion() ? undefined : { scale: 0.94 }}
            aria-label={listening ? "Stop dictation" : "Start dictation"}
            aria-pressed={listening}
            className={`relative grid size-14 shrink-0 place-items-center rounded-full transition-colors disabled:opacity-40 ${
              listening ? "bg-accent text-accent-ink" : "bg-surface-raised text-ink hover:brightness-125"
            }`}
          >
            {/* Halo de "escuchando": el único bucle que permite el brief, sólo con el micrófono activo. */}
            {listening && !reducedMotion() && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full border border-accent"
                animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
                transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            {listening ? <Stop size={22} weight="fill" /> : <Microphone size={22} />}
          </motion.button>
          <div className="min-w-0 flex-1">
            <Waveform stream={stream} active={listening || typing} />
            <p className="mt-1 font-mono text-xs text-muted" aria-live="polite">
              {mode === "starting" && "Connecting"}
              {listening && "Listening"}
              {mode === "stopping" && "Finishing"}
              {typing && "Playing sample case"}
              {mode === "idle" && (extracting ? "Reading symptoms" : "Ready")}
            </p>
          </div>
        </div>

        <Button variant="secondary" onClick={playSample} disabled={busy || listening}>
          <Play size={16} aria-hidden />
          {typing ? "Restart sample case" : "Play sample case"}
        </Button>

        {notice && (
          <p role="status" className="rounded-[10px] border border-signaling/40 bg-signaling/10 px-3 py-2 text-xs text-ink">
            {notice}
          </p>
        )}

        <div className="max-h-48 min-h-24 overflow-y-auto rounded-[10px] bg-night/60 p-3 text-[13px] leading-relaxed text-ink">
          {transcript || interim ? (
            <p>
              <Highlighted text={transcript} quotes={highlighted} />
              {interim && <span className="text-muted"> {interim}</span>}
              {(typing || listening) && <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-accent" />}
            </p>
          ) : (
            <p className="text-muted">Speak, or play the sample case. Each symptom becomes a chip.</p>
          )}
        </div>

        <ul ref={chipsRef} aria-label="Symptoms" className="flex min-h-9 flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {terms.map((term) => (
              <motion.li
                key={term.hpo_id}
                initial={reducedMotion() ? false : { opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={reducedMotion() ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.24, ease: EASE }}
                className="max-w-full"
              >
                <Chip
                  label={term.label}
                  hpoId={term.hpo_id}
                  present={term.present}
                  onToggle={() => toggleTerm(term.hpo_id)}
                  onRemove={() => removeTerm(term.hpo_id)}
                />
              </motion.li>
            ))}
          </AnimatePresence>
          {terms.length === 0 && <li className="self-center text-xs text-muted">No symptoms yet</li>}
        </ul>
      </div>

      {/* Vuelo de cada chip nuevo hacia la constelación (trayectoria curva, ~500 ms). */}
      {flights.map((flight) => (
        <FlyingChip
          key={flight.key}
          flight={flight}
          onDone={() => setFlights((list) => list.filter((item) => item.key !== flight.key))}
        />
      ))}
    </Panel>
  );
}

function FlyingChip({ flight, onDone }: { flight: Flight; onDone: () => void }) {
  // Del panel de chips al centro de la escena, donde vive la constelación.
  const startX = flight.from.left + 12;
  const startY = flight.from.top;
  const dx = window.innerWidth / 2 - startX;
  const dy = window.innerHeight / 2 - startY;
  return (
    <motion.span
      aria-hidden
      className={`pointer-events-none fixed z-50 rounded-full px-3 py-1.5 text-[13px] ${
        flight.present ? "bg-accent text-accent-ink" : "border border-accent text-accent"
      }`}
      style={{ left: startX, top: startY }}
      initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
      animate={{ x: [0, dx * 0.55, dx], y: [0, dy - 140, dy], opacity: [1, 1, 0], scale: [1, 0.9, 0.35] }}
      transition={{ duration: 0.5, ease: EASE }}
      onAnimationComplete={onDone}
    >
      {!flight.present && "no "}
      {flight.label}
    </motion.span>
  );
}

// Subraya en el dictado los fragmentos que ya se reconocieron como síntoma.
function Highlighted({ text, quotes }: { text: string; quotes: string[] }) {
  const needles = quotes.map((quote) => quote.toLowerCase());
  if (needles.length === 0) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: { text: string; mark: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    let next: { at: number; length: number } | null = null;
    for (const needle of needles) {
      const at = lower.indexOf(needle, i);
      if (at !== -1 && (!next || at < next.at)) next = { at, length: needle.length };
    }
    if (!next) {
      parts.push({ text: text.slice(i), mark: false });
      break;
    }
    if (next.at > i) parts.push({ text: text.slice(i, next.at), mark: false });
    parts.push({ text: text.slice(next.at, next.at + next.length), mark: true });
    i = next.at + next.length;
  }
  return (
    <>
      {parts.map((part, index) =>
        part.mark ? (
          <mark key={index} className="bg-transparent text-ink underline decoration-accent decoration-2 underline-offset-4">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
