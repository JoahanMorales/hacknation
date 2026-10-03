import { CheckCircle, Microphone, MinusCircle, Play, Stop, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { useStore } from "../../lib/store";
import { type ExtractedTerm, extractTerms, loadSampleCase } from "./extract";
import { type LiveSession, LiveUnavailableError, startLive } from "./live";
import { Waveform } from "./Waveform";

// HACK-017 · Dictado: escena 2 de docs/FRONTEND-BRIEF.md. El médico habla (o se reproduce el caso de
// ejemplo), cada síntoma reconocido se vuelve chip y vuela hacia la constelación, y `terms` del store
// se actualiza (HACK-018 lo lee para diagnosticar).
// Estilo según web/DESIGN.md (HACK-005); cambiar a Panel/Chip/Button de web/src/ui cuando se integre.
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
  const setStep = useStore((state) => state.setStep);
  const setStoreTerms = useStore((state) => state.setTerms);
  const setStoreTranscript = useStore((state) => state.setTranscript);

  const [mode, setMode] = useState<Mode>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [terms, setTerms] = useState<ExtractedTerm[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const runRef = useRef(0); // invalida reproducciones o sesiones anteriores
  const liveRef = useRef<LiveSession | null>(null);
  const removedRef = useRef(new Set<string>());
  const termsRef = useRef<ExtractedTerm[]>([]);
  const chipsRef = useRef<HTMLUListElement>(null);
  const flightKey = useRef(0);

  const publish = useCallback(
    (next: ExtractedTerm[]) => {
      termsRef.current = next;
      setTerms(next);
      setStoreTerms(next.map(({ hpo_id, label, present }) => ({ hpo_id, label, present })));
    },
    [setStoreTerms],
  );

  // Fusiona lo que devuelve la extracción sin pisar lo que el médico corrigió (quitar o negar).
  const merge = useCallback(
    (found: ExtractedTerm[]) => {
      const known = new Set(termsRef.current.map((term) => term.hpo_id));
      const fresh = found.filter((term) => !known.has(term.hpo_id) && !removedRef.current.has(term.hpo_id));
      if (fresh.length === 0) return;
      publish([...termsRef.current, ...fresh]);
      const from = chipsRef.current?.getBoundingClientRect();
      if (from && !reducedMotion()) {
        setFlights((current) => [
          ...current,
          ...fresh.map((term) => ({ key: ++flightKey.current, label: term.label, present: term.present, from })),
        ]);
      }
    },
    [publish],
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
    setStoreTranscript("");
    publish([]);
  }, [publish, setStoreTranscript]);

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
    publish(termsRef.current.map((term) => (term.hpo_id === id ? { ...term, present: !term.present } : term)));
  const removeTerm = (id: string) => {
    removedRef.current.add(id);
    publish(termsRef.current.filter((term) => term.hpo_id !== id));
  };

  if (step === "action") return null;

  const listening = mode === "live";
  const busy = mode === "starting" || mode === "stopping";
  const typing = mode === "sample";

  return (
    <section
      aria-label="Dictation"
      className="flex min-h-0 flex-col gap-4 rounded-2xl border border-white/10 bg-[#111b2b]/95 p-4 shadow-[0_12px_36px_rgb(2_6_15/28%),inset_0_1px_0_rgb(255_255_255/6%)] backdrop-blur-md"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-[#edf2f8]">Dictation</h2>
        {(transcript || terms.length > 0) && (
          <button
            type="button"
            onClick={reset}
            className="rounded-[10px] px-2 py-1 text-xs text-[#a5b3c7] hover:bg-white/5 hover:text-[#edf2f8] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#edc994]"
          >
            Clear
          </button>
        )}
      </header>

      <div className="flex items-center gap-3">
        <motion.button
          type="button"
          onClick={listening ? stopMic : startMic}
          disabled={busy || typing}
          whileTap={{ scale: 0.94 }}
          aria-label={listening ? "Stop dictation" : "Start dictation"}
          aria-pressed={listening}
          className={`relative grid size-14 shrink-0 place-items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#edc994] disabled:opacity-40 ${
            listening ? "bg-[#edc994] text-[#171c25]" : "bg-[#1a273a] text-[#edf2f8] hover:bg-[#22324a]"
          }`}
        >
          {/* Halo de "escuchando": el único bucle permitido por el brief. */}
          {listening && !reducedMotion() && (
            <motion.span
              aria-hidden
              className="absolute inset-0 rounded-full border border-[#edc994]"
              animate={{ scale: [1, 1.35], opacity: [0.6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
            />
          )}
          {listening ? <Stop size={22} weight="fill" /> : <Microphone size={22} />}
        </motion.button>
        <div className="min-w-0 flex-1">
          <Waveform stream={stream} active={listening || typing} />
          <p className="mt-1 font-mono text-[11px] text-[#a5b3c7]" aria-live="polite">
            {mode === "starting" && "Connecting"}
            {listening && "Listening"}
            {mode === "stopping" && "Finishing"}
            {typing && "Playing sample case"}
            {mode === "idle" && (extracting ? "Reading symptoms" : "Ready")}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={playSample}
        disabled={busy || listening}
        className="flex h-9 items-center justify-center gap-2 rounded-[10px] border border-white/10 bg-[#1a273a] text-[13px] text-[#edf2f8] hover:bg-[#22324a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#edc994] disabled:opacity-40"
      >
        <Play size={16} />
        {typing ? "Restart sample case" : "Play sample case"}
      </button>

      {notice && (
        <p role="status" className="rounded-[10px] border border-[#d3b9a0]/30 bg-[#d3b9a0]/10 px-3 py-2 text-xs text-[#edf2f8]">
          {notice}
        </p>
      )}

      <div className="min-h-24 overflow-y-auto rounded-[10px] bg-black/20 p-3 text-[13px] leading-relaxed text-[#edf2f8]">
        {transcript || interim ? (
          <p>
            <Highlighted text={transcript} terms={terms} />
            {interim && <span className="text-[#a5b3c7]"> {interim}</span>}
            {(typing || listening) && <span className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-[#edc994]" />}
          </p>
        ) : (
          <p className="text-[#a5b3c7]">Speak, or play the sample case. Each symptom becomes a chip.</p>
        )}
      </div>

      <ul ref={chipsRef} aria-label="Symptoms" className="flex min-h-9 flex-wrap gap-2">
        <AnimatePresence initial={false}>
          {terms.map((term) => (
            <motion.li
              key={term.hpo_id}
              layout={!reducedMotion()}
              initial={reducedMotion() ? false : { opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reducedMotion() ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              <TermChip term={term} onToggle={() => toggleTerm(term.hpo_id)} onRemove={() => removeTerm(term.hpo_id)} />
            </motion.li>
          ))}
        </AnimatePresence>
        {terms.length === 0 && <li className="self-center text-xs text-[#a5b3c7]">No symptoms yet</li>}
      </ul>

      {/* Vuelo de cada chip nuevo hacia la constelación (trayectoria curva, ~500 ms). */}
      {flights.map((flight) => (
        <FlyingChip
          key={flight.key}
          flight={flight}
          onDone={() => setFlights((current) => current.filter((item) => item.key !== flight.key))}
        />
      ))}
    </section>
  );
}

function TermChip({ term, onToggle, onRemove }: { term: ExtractedTerm; onToggle: () => void; onRemove: () => void }) {
  const Icon = term.present ? CheckCircle : MinusCircle;
  return (
    <span
      title={term.hpo_id}
      className={`inline-flex min-h-9 max-w-full items-stretch rounded-full text-[13px] leading-snug ${
        term.present ? "bg-[#edf2f8]/10 text-[#edf2f8]" : "border border-[#a5b3c7]/50 text-[#a5b3c7]"
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={term.present}
        aria-label={`${term.present ? term.label : `no ${term.label}`}: ${term.present ? "negate" : "mark present"}`}
        className="flex min-w-0 items-center gap-1.5 rounded-l-full py-1.5 pl-3 pr-1.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#edc994]"
      >
        <Icon size={16} aria-hidden className="shrink-0" />
        <span>
          {!term.present && "no "}
          <span className={term.present ? "" : "line-through"}>{term.label}</span>
        </span>
      </button>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${term.label}`}
        className="grid shrink-0 place-items-center rounded-r-full pl-1 pr-2.5 opacity-70 hover:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#edc994]"
      >
        <X size={14} />
      </button>
    </span>
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
        flight.present ? "bg-[#edc994] text-[#171c25]" : "border border-[#edc994] text-[#edc994]"
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
function Highlighted({ text, terms }: { text: string; terms: ExtractedTerm[] }) {
  const quotes = terms.map((term) => term.quote?.toLowerCase()).filter((quote): quote is string => Boolean(quote));
  if (quotes.length === 0) return <>{text}</>;
  const lower = text.toLowerCase();
  const parts: { text: string; mark: boolean }[] = [];
  let i = 0;
  while (i < text.length) {
    let next: { at: number; length: number } | null = null;
    for (const quote of quotes) {
      const at = lower.indexOf(quote, i);
      if (at !== -1 && (!next || at < next.at)) next = { at, length: quote.length };
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
          <mark key={index} className="bg-transparent text-[#edf2f8] underline decoration-[#edc994] decoration-2 underline-offset-4">
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </>
  );
}
