import { ArrowRight, ArrowSquareOut, Play } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { useStore } from "../../lib/store";
import { Button } from "../../ui";

// HACK-029 · Landing: la entrada al atlas (pedido del humano de Saus). Pantalla completa encima de la
// app, con la constelación tenue detrás; al entrar se desvanece y deja el atlas con la búsqueda
// enfocada. Cada cifra lleva su fuente (IDEA.md §11). Con ?step, ?select, ?graph, ?ui o ?landing=off no aparece,
// para que la demo guiada y los checks de Chromium entren directo.
export const slot = "overlay";
export const order = 1;

const SKIP_PARAMS = ["step", "select", "graph", "ui", "landing"];
const EASE = [0.16, 1, 0.3, 1] as const;

const STATS = [
  {
    value: "4.7 years",
    label: "average time to a rare disease diagnosis",
    source: "EURORDIS Rare Barometer, Eur J Hum Genet 2024",
    href: "https://www.nature.com/articles/s41431-024-01604-z",
  },
  {
    value: "56%",
    label: "wait more than 6 months from the first consultation",
    source: "EURORDIS Rare Barometer, 6,507 people in 41 countries",
    href: "https://www.nature.com/articles/s41431-024-01604-z",
  },
  {
    value: "12,867",
    label: "rare diseases with phenotypes in this atlas",
    source: "Human Phenotype Ontology annotations, release v2026-09-01",
    href: "https://github.com/obophenotype/human-phenotype-ontology/releases/tag/v2026-09-01",
  },
];

// Personas de IDEA.md §2 (Priya y Dr. Osei, nombrados en TASKS.md, no tienen descripción con fuente).
const PEOPLE = [
  { name: "Dr. Ruiz", role: "General neurologist", need: "Sees weakness, fatigue and high CK. Gets the closest matches and the next test to order." },
  { name: "Devon", role: "Caregiver, newly diagnosed family", need: "Leaves the clinic with an unfamiliar name. Gets a plain explanation and who to contact." },
  { name: "Maria", role: "Patient group leader", need: "Leads a community with no approved therapy. Gets who to work with and one step for this week." },
];

// ?landing=on la fuerza (para probarla en Chromium automatizado); ?landing=off la oculta. Los
// navegadores automatizados (Playwright marca navigator.webdriver) entran directo a la app, así los
// checks existentes que abren "/" siguen igual.
function shouldShow(): boolean {
  const params = new URLSearchParams(window.location.search);
  if (params.get("landing") === "on") return true;
  if (SKIP_PARAMS.some((key) => params.has(key))) return false;
  return !navigator.webdriver;
}

export default function Landing() {
  const [open, setOpen] = useState(shouldShow);
  const reduced = useReducedMotion() ?? false;
  const next = useRef<"search" | "sample" | null>(null);

  useEffect(() => {
    if (open) document.querySelector<HTMLButtonElement>("[data-landing-cta]")?.focus();
  }, [open]);

  const enter = (then: "search" | "sample") => {
    next.current = then;
    useStore.getState().setStep("constellation");
    setOpen(false);
  };

  // Tras el fundido: enfoca la búsqueda (HACK-022) o reproduce el caso de ejemplo del dictado.
  const afterExit = () => {
    if (next.current === "search") {
      document.querySelector<HTMLInputElement>('input[aria-label="Search the atlas"]')?.focus();
    } else if (next.current === "sample") {
      [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Play sample case")?.click();
    }
  };

  return (
    <AnimatePresence onExitComplete={afterExit}>
      {open && (
        <motion.section
          key="landing"
          aria-label="Welcome to Constellation"
          className="pointer-events-auto fixed inset-0 z-50 overflow-y-auto bg-night/[0.86] backdrop-blur-[2px]"
          initial={false}
          exit={reduced ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 1.02, transition: { duration: 0.5, ease: EASE } }}
        >
          <div className="mx-auto flex min-h-full max-w-6xl flex-col gap-12 px-8 py-10">
            <header className="flex items-center justify-between">
              <span className="text-lg font-semibold tracking-tight text-ink">Constellation</span>
              <span className="font-mono text-xs text-muted">Phenotype match · not a diagnosis</span>
            </header>

            <div className="flex max-w-3xl flex-col gap-6">
              <p className="font-mono text-sm text-accent">Rare disease atlas</p>
              <h1 className="text-[clamp(2.25rem,4.2vw,3.5rem)] font-semibold leading-[1.08] tracking-tight text-ink">
                From scattered symptoms to the people already working on your disease.
              </h1>
              <p className="max-w-2xl text-lg leading-relaxed text-muted">
                A map of rare diseases that narrows a case to its closest matches, shows every connection with its source, and ends with one concrete step for this week.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button data-landing-cta onClick={() => enter("search")} className="h-12! px-6! text-base!">
                  Start with a disease, a gene or a symptom <ArrowRight size={20} aria-hidden />
                </Button>
                <Button variant="secondary" onClick={() => enter("sample")} className="h-12! px-5! text-base!">
                  <Play size={18} aria-hidden /> Watch the sample case
                </Button>
              </div>
            </div>

            <ul className="grid gap-4 md:grid-cols-3" aria-label="The problem, with sources">
              {STATS.map((stat) => (
                <li key={stat.value} className="cn-panel flex flex-col gap-2 p-5">
                  <span className="font-mono text-3xl font-medium tabular-nums text-ink">{stat.value}</span>
                  <span className="text-sm text-ink">{stat.label}</span>
                  <a href={stat.href} target="_blank" rel="noreferrer" className="mt-auto inline-flex items-center gap-1 text-xs text-muted underline underline-offset-4 hover:text-accent">
                    {stat.source} <ArrowSquareOut size={12} aria-hidden />
                  </a>
                </li>
              ))}
            </ul>

            <section aria-label="Who it is for" className="flex flex-col gap-4">
              <h2 className="text-sm font-medium text-muted">Built for</h2>
              <ul className="grid gap-4 md:grid-cols-3">
                {PEOPLE.map((person) => (
                  <li key={person.name} className="flex flex-col gap-1 border-l-2 border-accent/60 pl-4">
                    <span className="text-base font-medium text-ink">{person.name}</span>
                    <span className="font-mono text-xs text-muted">{person.role}</span>
                    <span className="mt-1 text-sm leading-relaxed text-ink/85">{person.need}</span>
                  </li>
                ))}
              </ul>
            </section>

            <footer className="mt-auto text-xs text-muted">
              Phenotype match, not a diagnosis. Every number and every connection links to its source.
            </footer>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
