import { ArrowRight, ArrowSquareOut, Play } from "@phosphor-icons/react";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { Button } from "../../ui";
import atlasFull from "./assets/atlas-full.png";
import atlasMatch from "./assets/atlas-match.png";

// HACK-029 · Landing: página propia en "/" (App.tsx la muestra en lugar del atlas; el atlas vive en
// "/?view=atlas" y Atrás vuelve aquí). Design read: landing de producto para médicos y líderes de
// grupos de pacientes, lenguaje clínico sereno, tema claro, VARIANCE 6 / MOTION 4 / DENSITY 3.
// Imágenes: capturas reales del producto (atlas con el caso publicado). Cada cifra con su fuente
// (IDEA.md §11).
export const slot = "page";
export const order = 1;

const EASE = [0.16, 1, 0.3, 1] as const;
const START = "Start with a disease, a gene or a symptom";
const SAMPLE = "Watch the sample case";

// Cambia de página sin recargar y, ya en el atlas, enfoca la búsqueda (HACK-022) o reproduce el caso.
function enterAtlas(then: "search" | "sample") {
  window.history.pushState(null, "", "/?view=atlas");
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
  let tries = 0;
  const act = () => {
    const target =
      then === "search"
        ? document.querySelector<HTMLInputElement>('input[aria-label="Search the atlas"]')
        : [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Play sample case");
    if (target) {
      if (then === "search") target.focus();
      else target.click();
    } else if (++tries < 20) window.setTimeout(act, 100);
  };
  window.setTimeout(act, 150);
}

function Reveal({ children, delay = 0, className, as = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "li" }) {
  const reduced = useReducedMotion();
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 0.6, delay, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

function Ctas() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button onClick={() => enterAtlas("search")} className="h-12! px-6! text-base!">
        {START} <ArrowRight size={20} aria-hidden />
      </Button>
      <Button variant="secondary" onClick={() => enterAtlas("sample")} className="h-12! px-5! text-base!">
        <Play size={18} aria-hidden /> {SAMPLE}
      </Button>
    </div>
  );
}

const EURORDIS = "https://www.nature.com/articles/s41431-024-01604-z";
const HPO = "https://github.com/obophenotype/human-phenotype-ontology/releases/tag/v2026-09-01";

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-muted underline underline-offset-4 hover:text-accent">
      {children} <ArrowSquareOut size={12} aria-hidden />
    </a>
  );
}

const STEPS = [
  { verb: "Dictate", text: "Speak the case or play the published one. Each finding becomes a chip, negations included." },
  { verb: "Compare", text: "Every disease is scored by phenotype likelihood. Two matches stay lit, each with a range." },
  { verb: "Trace", text: "Open a match to see genes, mechanism and every connection with its source and level." },
  { verb: "Act", text: "End with the patient groups, registries and trials already working on it, and one step for this week." },
];

// Personas de IDEA.md §2 (Priya y Dr. Osei, nombrados en TASKS.md, no tienen descripción con fuente).
const PEOPLE = [
  { name: "Dr. Ruiz", role: "General neurologist", need: "Sees weakness, fatigue and high CK. Gets the closest matches and the next test to order." },
  { name: "Devon", role: "Caregiver of a newly diagnosed family member", need: "Leaves the clinic with an unfamiliar name. Gets a plain explanation and who to contact." },
  { name: "Maria", role: "Patient group leader", need: "Leads a community with no approved therapy. Gets who to work with and one step for this week." },
];

export default function Landing() {
  const reduced = useReducedMotion();
  const enter = (delay: number) => ({
    initial: reduced ? false : { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay: reduced ? 0 : delay, ease: EASE },
  });

  return (
    <div className="min-h-[100dvh] bg-night text-ink">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10" aria-label="Constellation">
        <span className="text-lg font-semibold tracking-tight">Constellation</span>
        <span className="font-mono text-xs text-muted">Phenotype match, not a diagnosis</span>
      </nav>

      <main>
        {/* Hero: texto a la izquierda, el producto real a la derecha (el match del caso publicado). */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-12 lg:px-10 lg:pt-16">
          <div className="flex flex-col gap-7 lg:col-span-6">
            <motion.h1 {...enter(0)} className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl lg:text-[2.85rem]">
              From scattered symptoms to the people who can help.
            </motion.h1>
            <motion.p {...enter(0.08)} className="max-w-[46ch] text-lg leading-relaxed text-muted">
              Dictate a case. Watch 12,867 rare diseases narrow to two matches, every link cited, and one step for this week.
            </motion.p>
            <motion.div {...enter(0.16)}>
              <Ctas />
            </motion.div>
          </div>
          <motion.figure
            initial={reduced ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, delay: reduced ? 0 : 0.2, ease: EASE }}
            className="lg:col-span-6 lg:-mr-10"
          >
            <img
              src={atlasMatch}
              width={920}
              height={460}
              alt="The atlas after the published Pompe case: two matching diseases stay lit, labelled Top match and Second match with their phenotype match percentage."
              className="w-full rounded-[16px] border border-line bg-surface shadow-[0_24px_60px_rgb(16_48_42/12%)]"
            />
          </motion.figure>
        </section>

        {/* El problema: una cifra protagonista y dos de apoyo, sin tarjetas. */}
        <section className="border-t border-line/60 bg-surface">
          <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-12 lg:px-10 lg:py-24">
            <Reveal className="flex flex-col gap-5 lg:col-span-6">
              <h2 className="max-w-[18ch] text-3xl font-semibold leading-tight tracking-tight md:text-4xl">Diagnosis takes years. The evidence is already out there.</h2>
              <p className="flex items-baseline gap-3 text-accent">
                <span className="text-8xl font-semibold tabular-nums tracking-tighter md:text-9xl">4.7</span>
                <span className="text-3xl font-medium">years</span>
              </p>
              <p className="max-w-[40ch] text-base text-ink">average time to a rare disease diagnosis.</p>
              <Source href={EURORDIS}>EURORDIS Rare Barometer, Eur J Hum Genet 2024</Source>
            </Reveal>
            <div className="flex flex-col justify-end gap-10 lg:col-span-5 lg:col-start-8">
              <Reveal delay={0.08} className="flex flex-col gap-2 border-t border-line pt-6">
                <span className="text-5xl font-semibold tabular-nums tracking-tight">56%</span>
                <span className="text-base text-ink">wait more than 6 months from the first consultation.</span>
                <Source href={EURORDIS}>6,507 people in 41 countries, same study</Source>
              </Reveal>
              <Reveal delay={0.16} className="flex flex-col gap-2 border-t border-line pt-6">
                <span className="text-5xl font-semibold tabular-nums tracking-tight">12,867</span>
                <span className="text-base text-ink">rare diseases with phenotypes, all in one map.</span>
                <Source href={HPO}>Human Phenotype Ontology, release v2026-09-01</Source>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Cómo funciona: el atlas completo a la izquierda y los cuatro verbos del recorrido. */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-12 lg:px-10 lg:py-28">
          <Reveal className="lg:col-span-5">
            <img
              src={atlasFull}
              width={780}
              height={780}
              loading="lazy"
              alt="The full atlas: 12,867 rare diseases grouped into 20 body systems, each a cluster of small dots."
              className="w-full rounded-[16px] border border-line bg-surface"
            />
          </Reveal>
          <div className="flex flex-col gap-10 lg:col-span-6 lg:col-start-7">
            <Reveal>
              <h2 className="text-3xl font-semibold leading-tight tracking-tight md:text-4xl">One case, four moves.</h2>
            </Reveal>
            <ol className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {STEPS.map((step, index) => (
                <Reveal as="li" key={step.verb} delay={index * 0.06} className="flex flex-col gap-2">
                    <span className="text-xl font-semibold text-accent">{step.verb}</span>
                    <span className="text-base leading-relaxed text-muted">{step.text}</span>
                </Reveal>
              ))}
            </ol>
          </div>
        </section>

        {/* Para quién: filas a todo el ancho, nombre a la izquierda y lo que obtiene a la derecha. */}
        <section className="border-t border-line/60 bg-surface">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-24">
            <Reveal>
              <h2 className="mb-10 text-3xl font-semibold leading-tight tracking-tight md:text-4xl">Built for the people around one case.</h2>
            </Reveal>
            <ul className="flex flex-col">
              {PEOPLE.map((person, index) => (
                <Reveal as="li" key={person.name} delay={index * 0.06} className="grid gap-2 border-t border-line py-7 md:grid-cols-12 md:gap-8">
                    <div className="md:col-span-4">
                      <p className="text-xl font-medium">{person.name}</p>
                      <p className="text-sm text-muted">{person.role}</p>
                    </div>
                    <p className="text-lg leading-relaxed text-ink md:col-span-8">{person.need}</p>
                </Reveal>
              ))}
            </ul>
          </div>
        </section>

        {/* Cierre: la misma acción que el hero, con su misma etiqueta. */}
        <section className="mx-auto flex max-w-7xl flex-col items-start gap-8 px-6 py-24 lg:px-10">
          <Reveal>
            <h2 className="max-w-[22ch] text-3xl font-semibold leading-tight tracking-tight md:text-5xl">Try it with the published Pompe case or your own.</h2>
          </Reveal>
          <Reveal delay={0.08}>
            <Ctas />
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line/60">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-8 text-sm text-muted md:flex-row md:items-center md:justify-between lg:px-10">
          <p>Phenotype match, not a diagnosis. Every number and connection links to its source.</p>
          <div className="flex gap-5">
            <Source href={EURORDIS}>EURORDIS Rare Barometer</Source>
            <Source href={HPO}>HPO v2026-09-01</Source>
          </div>
        </div>
      </footer>
    </div>
  );
}
