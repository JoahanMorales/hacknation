import { ArrowRight, ArrowSquareOut, Funnel, Graph, Handshake, Microphone, Play, StarFour } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

import atlasFull from "./assets/atlas-full.png";
import atlasMatch from "./assets/atlas-match.png";
import { loadSampleCase, type SampleCase } from "./sample";
import { Sky } from "./Sky";
import "./style.css";

// HACK-029 · Landing de OlivIA: página propia en "/" (App.tsx la muestra en lugar del atlas; el atlas
// vive en "/?view=atlas" y Atrás vuelve aquí). Design read (design-taste-frontend): producto de salud
// para médicos y líderes de grupos de pacientes, oscuro, sobrio y clínico; VARIANCE 6 / MOTION 4 /
// DENSITY 3. Objetivo: que se entienda en segundos qué hace el producto (dictar → 12,867
// enfermedades → dos coincidencias citadas → a quién llamar). El cielo es la constelación real y el
// caso publicado real; cada cifra lleva su fuente (IDEA.md §11). Tarjetas sólo donde hay jerarquía
// (la ventana del producto y lo que flota sobre ella); el resto se agrupa con espacio y líneas finas.
export const slot = "page";
export const order = 1;

const EASE = [0.22, 1, 0.36, 1] as const;
const EURORDIS = "https://www.nature.com/articles/s41431-024-01604-z";
const HPO = "https://github.com/obophenotype/human-phenotype-ontology/releases/tag/v2026-09-01";
const PHENOPACKETS = "https://github.com/monarch-initiative/phenopacket-store/releases/tag/0.1.27";

// Cambia de página sin recargar; en el atlas, opcionalmente reproduce el caso publicado.
function enterAtlas(then?: "sample") {
  window.history.pushState(null, "", "/?view=atlas");
  window.dispatchEvent(new PopStateEvent("popstate"));
  window.scrollTo(0, 0);
  if (!then) return;
  let tries = 0;
  const act = () => {
    const play = [...document.querySelectorAll<HTMLButtonElement>("button")].find((b) => b.textContent?.trim() === "Play sample case");
    if (play) play.click();
    else if (++tries < 20) window.setTimeout(act, 100);
  };
  window.setTimeout(act, 150);
}

function Reveal({ children, index = 0, className, as = "div" }: { children: ReactNode; index?: number; className?: string; as?: "div" | "li" }) {
  const reduced = useReducedMotion();
  const Tag = as === "li" ? motion.li : motion.div;
  return (
    <Tag
      className={className}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: EASE }}
    >
      {children}
    </Tag>
  );
}

function Ctas({ center }: { center?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${center ? "justify-center" : ""}`}>
      <button type="button" className="lp-btn lp-btn--primary" onClick={() => enterAtlas()}>
        Start a case <ArrowRight size={17} weight="bold" aria-hidden />
      </button>
      <button type="button" className="lp-btn lp-btn--ghost" onClick={() => enterAtlas("sample")}>
        <Play size={15} weight="fill" aria-hidden /> Watch the sample case
      </button>
    </div>
  );
}

function Source({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-sm text-[#8EC5FC] underline decoration-[#8EC5FC]/40 decoration-1 underline-offset-4 hover:decoration-[#8EC5FC]"
    >
      {children} <ArrowSquareOut size={13} aria-hidden />
    </a>
  );
}

const STEPS = [
  { icon: Microphone, verb: "Dictate", text: "Speak the case or play the published one. Each finding becomes a chip, negations included." },
  { icon: Funnel, verb: "Compare", text: "Every disease is scored by phenotype likelihood. Two matches stay lit, each with its percentage." },
  { icon: Graph, verb: "Trace", text: "Open a match to see genes, mechanism and every connection with its source and evidence level." },
  { icon: Handshake, verb: "Act", text: "Finish with the patient groups, registries and trials already on it, and one step for this week." },
];

// Personas de IDEA.md §2. Maria primero: es la protagonista del recorrido de la demo.
const PEOPLE = [
  { name: "Maria", role: "Patient group leader", need: "Leads a community with no approved therapy. Gets who to work with and one step for this week." },
  { name: "Dr. Ruiz", role: "General neurologist", need: "Sees weakness, fatigue and high CK. Gets the closest matches and the next test to order." },
  { name: "Devon", role: "Caregiver", need: "Leaves the clinic with an unfamiliar name. Gets a plain explanation and who to contact." },
];

function scrollToId(id: string, reduced: boolean | null) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

const H2 = "text-[2.25rem] font-semibold leading-[1.08] tracking-[-0.03em] md:text-5xl";

export default function Landing() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  // Cabecera más opaca al bajar; parallax suave en la ventana del producto (sólo transform/opacity).
  const headerOpacity = useTransform(scrollY, [0, 140], [0, 1]);
  const stageY = useTransform(scrollY, [0, 900], [0, reduced ? 0 : -32]);
  const floatY = useTransform(scrollY, [0, 900], [0, reduced ? 0 : -72]);
  const [sample, setSample] = useState<SampleCase | null>(null);
  const [total, setTotal] = useState(12867);

  useEffect(() => {
    loadSampleCase().then(setSample).catch(() => setSample(null));
  }, []);

  const enter = (index: number) => ({
    initial: reduced ? false : { opacity: 0, y: 24 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, delay: reduced ? 0 : index * 0.08, ease: EASE },
  });

  return (
    <div className="lp font-sans">
      <header className="fixed inset-x-0 top-0 z-30">
        <motion.div aria-hidden className="lp-header-bg" style={{ opacity: headerOpacity }} />
        <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="OlivIA">
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <StarFour size={18} weight="fill" className="text-[#8EC5FC]" aria-hidden /> OlivIA
          </span>
          <div className="hidden items-center gap-8 text-sm text-[#9FB4C9] md:flex">
            <button type="button" className="cursor-pointer hover:text-[#EEF4F9]" onClick={() => scrollToId("how", reduced)}>How it works</button>
            <button type="button" className="cursor-pointer hover:text-[#EEF4F9]" onClick={() => scrollToId("people", reduced)}>Who it's for</button>
            <button type="button" className="cursor-pointer hover:text-[#EEF4F9]" onClick={() => scrollToId("sources", reduced)}>Sources</button>
          </div>
          <button type="button" className="lp-btn lp-btn--ghost h-9! px-4! text-sm!" onClick={() => enterAtlas()}>
            Start a case
          </button>
        </nav>
      </header>

      <main className="relative">
        {/* Hero: una idea, centrada como el lanzamiento de un producto; debajo, el producto vivo. */}
        <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-28 text-center sm:px-6 lg:pt-32">
          <motion.div {...enter(0)} className="mb-8 grid size-14 place-items-center rounded-[18px] border border-white/10 bg-[#12365c]/50">
            <StarFour size={26} weight="fill" className="text-[#8EC5FC]" aria-hidden />
          </motion.div>
          <motion.h1
            {...enter(1)}
            className="max-w-[22ch] text-balance text-[2.6rem] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-5xl lg:text-[3.9rem]"
          >
            From scattered symptoms to the people who can help.
          </motion.h1>
          <motion.p {...enter(2)} className="mt-6 max-w-[44ch] text-lg leading-relaxed text-[#9FB4C9]">
            Dictate a case. Watch {total.toLocaleString("en-US")} rare diseases narrow to two phenotype matches, every link cited.
          </motion.p>
          <motion.div {...enter(3)} className="mt-9">
            <Ctas center />
          </motion.div>
        </section>

        {/* El producto vivo: el cielo real en su ventana, con el dictado y la captura flotando encima. */}
        <section className="relative mx-auto mt-16 max-w-6xl px-4 pb-10 sm:px-6 lg:mt-20">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: reduced ? 0 : 0.35, ease: EASE }}
            style={{ y: stageY }}
            className="lp-window overflow-hidden"
          >
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3 font-mono text-xs text-[#9FB4C9] sm:px-6">
              <span>Published case, PMID 7668832</span>
              <span className="hidden sm:inline">Phenotype match, not a diagnosis</span>
            </div>
            <div className="h-[340px] sm:h-[460px] lg:h-[540px]">
              <Sky onReady={({ total: count }) => setTotal(count)} />
            </div>
            <div className="h-6 md:h-20" />
          </motion.div>

          {/* Lo que se dictó: los términos reales del caso publicado, negaciones incluidas. */}
          {sample && (
            <motion.div
              style={{ y: floatY }}
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: reduced ? 0 : 0.6, ease: EASE }}
              className="lp-float mt-4 p-5 md:absolute md:bottom-0 md:left-0 md:mt-0 md:w-[19rem] lg:-left-6"
            >
              <p className="text-sm font-medium">Dictated findings</p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {sample.terms.map((term) => (
                  <li
                    key={term.hpo_id}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      term.present ? "border-white/15 bg-white/5 text-[#EEF4F9]" : "border-dashed border-white/20 text-[#9FB4C9]"
                    }`}
                  >
                    {term.present ? term.label : `No ${term.label.toLowerCase()}`}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          <motion.figure
            style={{ y: floatY }}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: reduced ? 0 : 0.75, ease: EASE }}
            className="lp-float mt-4 overflow-hidden p-1.5 md:absolute md:-bottom-8 md:right-0 md:mt-0 md:w-[44%] lg:-right-6"
          >
            <img
              src={atlasMatch}
              width={920}
              height={460}
              alt="The atlas after the published Pompe case: two matching diseases stay lit, labelled Top match and Second match with their phenotype match percentage."
              className="w-full rounded-[18px]"
            />
          </motion.figure>
        </section>

        {/* Fuentes: una línea entre filetes, nombres y no logotipos (no implican respaldo). */}
        <section id="sources" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6 md:pt-36">
          <Reveal className="flex flex-col items-center gap-4 border-y border-white/10 py-6 text-center md:flex-row md:justify-between md:text-left">
            <p className="text-sm text-[#9FB4C9]">Built on open, versioned data</p>
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-medium">
              <li>Human Phenotype Ontology v2026-09-01</li>
              <li>Monarch phenopacket-store 0.1.27</li>
              <li>EURORDIS Rare Barometer</li>
              <li>PubMed and ClinicalTrials.gov</li>
            </ul>
          </Reveal>
        </section>

        {/* El problema: la cifra protagonista en tipografía, sin caja; dos de apoyo a la derecha. */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
          <Reveal>
            <h2 className={`max-w-[20ch] ${H2}`}>Diagnosis takes years. The evidence is already out there.</h2>
          </Reveal>
          <div className="mt-14 grid gap-12 lg:grid-cols-12">
            <Reveal index={1} className="flex flex-col gap-4 lg:col-span-7">
              <p className="flex items-baseline gap-4">
                <span className="text-[6.5rem] font-semibold leading-none tracking-[-0.05em] tabular-nums md:text-[9.5rem]">4.7</span>
                <span className="text-3xl font-medium text-[#9FB4C9]">years</span>
              </p>
              <p className="max-w-[36ch] text-lg text-[#EEF4F9]">average time to a rare disease diagnosis.</p>
              <Source href={EURORDIS}>EURORDIS Rare Barometer, Eur J Hum Genet 2024</Source>
            </Reveal>
            <div className="flex flex-col justify-end gap-10 lg:col-span-4 lg:col-start-9">
              <Reveal index={2} className="flex flex-col gap-2 border-t border-white/10 pt-6">
                <span className="text-5xl font-semibold tracking-[-0.03em] tabular-nums">56%</span>
                <span className="text-base text-[#9FB4C9]">wait more than 6 months from the first consultation.</span>
                <Source href={EURORDIS}>6,507 people in 41 countries</Source>
              </Reveal>
              <Reveal index={3} className="flex flex-col gap-2 border-t border-white/10 pt-6">
                <span className="text-5xl font-semibold tracking-[-0.03em] tabular-nums">{total.toLocaleString("en-US")}</span>
                <span className="text-base text-[#9FB4C9]">rare diseases with phenotypes, all in one map.</span>
                <Source href={HPO}>Human Phenotype Ontology v2026-09-01</Source>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Cómo funciona: los cuatro verbos a la izquierda, el atlas completo a la derecha. */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 md:py-32">
          <Reveal>
            <h2 className={H2}>One case, four moves.</h2>
          </Reveal>
          <div className="mt-14 grid items-center gap-14 lg:grid-cols-12">
            <ol className="flex flex-col gap-9 lg:col-span-5">
              {STEPS.map((step, index) => (
                <Reveal as="li" key={step.verb} index={index} className="grid grid-cols-[1.75rem_1fr] gap-4">
                  <step.icon size={24} className="mt-0.5 text-[#8EC5FC]" aria-hidden />
                  <span className="flex flex-col gap-1.5">
                    <span className="text-xl font-semibold tracking-[-0.01em]">{step.verb}</span>
                    <span className="text-base leading-relaxed text-[#9FB4C9]">{step.text}</span>
                  </span>
                </Reveal>
              ))}
            </ol>
            <Reveal index={1} className="lg:col-span-7">
              <figure className="lp-float p-1.5">
                <img
                  src={atlasFull}
                  width={780}
                  height={780}
                  loading="lazy"
                  alt="The full atlas on a night sky: 12,867 rare diseases grouped into body systems, each a cluster of small stars, some twinkling."
                  className="w-full rounded-[18px]"
                />
              </figure>
              <p className="mt-4 text-sm text-[#9FB4C9]">Every connection on the map carries its source and evidence level.</p>
            </Reveal>
          </div>
        </section>

        {/* Para quién: filas a todo el ancho, separadas por filetes; sin tarjetas. */}
        <section id="people" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 md:py-32">
          <Reveal>
            <h2 className={`max-w-[18ch] ${H2}`}>Built for the people around one case.</h2>
          </Reveal>
          <ul className="mt-14 flex flex-col">
            {PEOPLE.map((person, index) => (
              <Reveal as="li" key={person.name} index={index} className="grid gap-2 border-t border-white/10 py-8 md:grid-cols-12 md:gap-8">
                <div className="md:col-span-4">
                  <p className="text-2xl font-semibold tracking-[-0.02em]">{person.name}</p>
                  <p className="mt-1 text-sm text-[#9FB4C9]">{person.role}</p>
                </div>
                <p className="max-w-[52ch] text-lg leading-relaxed md:col-span-8">{person.need}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        {/* Cierre: la misma acción que el hero, con su misma etiqueta. */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 md:pb-32">
          <Reveal className="flex flex-col items-center gap-8 border-t border-white/10 pt-24 text-center">
            <h2 className={`max-w-[20ch] ${H2}`}>Try it with the published Pompe case or your own.</h2>
            <Ctas center />
          </Reveal>
        </section>
      </main>

      <footer className="relative mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-[#9FB4C9] md:flex-row md:items-center md:justify-between">
          <p>Phenotype match, not a diagnosis. Every number and connection links to its source.</p>
          <div className="flex flex-wrap gap-5">
            <Source href={EURORDIS}>EURORDIS</Source>
            <Source href={HPO}>HPO v2026-09-01</Source>
            <Source href={PHENOPACKETS}>phenopacket-store 0.1.27</Source>
          </div>
        </div>
      </footer>
    </div>
  );
}
