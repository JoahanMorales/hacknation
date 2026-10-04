import { ArrowRight, ArrowSquareOut, Funnel, Graph, Handshake, Microphone, Play, StarFour } from "@phosphor-icons/react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { type ReactNode, useEffect, useState } from "react";

import atlasFull from "./assets/atlas-full.png";
import atlasMatch from "./assets/atlas-match.png";
import { loadSampleCase, type SampleCase } from "./sample";
import { Sky } from "./Sky";
import "./style.css";

// HACK-029 · Landing: página propia en "/" (App.tsx la muestra en lugar del atlas; el atlas vive en
// "/?view=atlas" y Atrás vuelve aquí). Design read: landing de producto de salud para médicos y
// líderes de grupos de pacientes, premium y sereno estilo Apple, vidrio sobre azul clínico;
// VARIANCE 6 / MOTION 5 / DENSITY 3. Objetivo: que se entienda en segundos qué hace el producto
// (dictar → 12,867 enfermedades → dos coincidencias citadas → a quién llamar). El cielo es la
// constelación real y el caso publicado real; cada cifra lleva su fuente (IDEA.md §11).
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
        Start a case <ArrowRight size={18} weight="bold" aria-hidden />
      </button>
      <button type="button" className="lp-btn lp-btn--glass" onClick={() => enterAtlas("sample")}>
        <Play size={16} weight="fill" aria-hidden /> Watch the sample case
      </button>
    </div>
  );
}

function Source({ href, children, tone = "blue" }: { href: string; children: ReactNode; tone?: "blue" | "navy" | "sky" }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1 text-sm underline decoration-1 underline-offset-4 ${tone === "sky" ? "text-[#8EC5FC]" : tone === "navy" ? "text-[#0B2A4A]" : "text-[#1E6FD9]"}`}
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

function scrollToId(id: string, reduced: boolean | null) {
  document.getElementById(id)?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

export default function Landing() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  // Cabecera más opaca al bajar; parallax suave en manchas y mockups (sólo transform/opacity).
  const headerOpacity = useTransform(scrollY, [0, 140], [0.35, 1]);
  const blobY = useTransform(scrollY, [0, 1200], [0, reduced ? 0 : 180]);
  const blobYSlow = useTransform(scrollY, [0, 1200], [0, reduced ? 0 : -120]);
  const stageY = useTransform(scrollY, [0, 900], [0, reduced ? 0 : -40]);
  const floatY = useTransform(scrollY, [0, 900], [0, reduced ? 0 : -90]);
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
      {/* Manchas de fondo: celeste y azul muy difuminados, un toque turquesa. */}
      <motion.div aria-hidden style={{ y: blobY }} className="lp-blob -left-40 top-24 size-[38rem] bg-[#8EC5FC]/55" />
      <motion.div aria-hidden style={{ y: blobYSlow }} className="lp-blob -right-48 top-[28rem] size-[34rem] bg-[#1E6FD9]/20" />
      <motion.div aria-hidden style={{ y: blobY }} className="lp-blob left-[45%] top-[70rem] size-[22rem] bg-[#5ED3D0]/25" />
      <motion.div aria-hidden style={{ y: blobYSlow }} className="lp-blob -left-24 top-[130rem] size-[30rem] bg-[#8EC5FC]/45" />
      <motion.div aria-hidden style={{ y: blobY }} className="lp-blob -right-32 top-[190rem] size-[32rem] bg-[#1E6FD9]/15" />

      <header className="fixed inset-x-0 top-0 z-30">
        <motion.div aria-hidden className="lp-header-bg" style={{ opacity: headerOpacity }} />
        <nav className="relative mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6" aria-label="Constellation">
          <span className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <StarFour size={20} weight="fill" className="text-[#1E6FD9]" aria-hidden /> Constellation
          </span>
          <div className="hidden items-center gap-8 text-sm md:flex">
            <button type="button" className="cursor-pointer hover:text-[#1E6FD9]" onClick={() => scrollToId("how", reduced)}>How it works</button>
            <button type="button" className="cursor-pointer hover:text-[#1E6FD9]" onClick={() => scrollToId("people", reduced)}>Who it's for</button>
            <button type="button" className="cursor-pointer hover:text-[#1E6FD9]" onClick={() => scrollToId("sources", reduced)}>Sources</button>
          </div>
          <button type="button" className="lp-btn lp-btn--glass h-10! px-4! text-sm!" onClick={() => enterAtlas()}>
            Open the atlas
          </button>
        </nav>
      </header>

      <main className="relative">
        {/* Hero: una idea, centrada como el lanzamiento de un producto; debajo, el producto vivo. */}
        <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-32 text-center sm:px-6 lg:pt-40">
          <motion.div {...enter(0)} className="lp-glass mb-8 grid size-16 place-items-center rounded-[20px]!">
            <StarFour size={30} weight="fill" className="text-[#1E6FD9]" aria-hidden />
          </motion.div>
          <motion.h1
            {...enter(1)}
            className="max-w-[24ch] text-balance text-[2.75rem] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[3.5rem] lg:text-[4.75rem]"
          >
            From scattered symptoms to the people who can help.
          </motion.h1>
          <motion.p {...enter(2)} className="mt-6 max-w-[44ch] text-lg leading-relaxed text-[#0B2A4A]/80 sm:text-xl">
            Dictate a case. Watch {total.toLocaleString("en-US")} rare diseases narrow to two matches, every link cited.
          </motion.p>
          <motion.div {...enter(3)} className="mt-9">
            <Ctas center />
          </motion.div>
          <motion.p {...enter(4)} className="mt-5 font-mono text-xs uppercase tracking-[0.14em] text-[#0B2A4A]/70">
            Phenotype match, not a diagnosis
          </motion.p>
        </section>

        {/* El producto vivo: cielo real en azul marino, con el dictado y la captura flotando encima. */}
        <section className="relative mx-auto mt-16 max-w-6xl px-4 pb-10 sm:px-6 lg:mt-20">
          <motion.div
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: reduced ? 0 : 0.4, ease: EASE }}
            style={{ y: stageY }}
            className="lp-navy overflow-hidden rounded-[32px]!"
          >
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-[#8EC5FC] sm:px-6">
              <span>Constellation · one star per disease</span>
              <span className="hidden sm:inline">Published case · PMID 7668832</span>
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
              transition={{ duration: 0.8, delay: reduced ? 0 : 0.7, ease: EASE }}
              className="lp-glass--night mt-4 p-5 md:absolute md:bottom-0 md:left-0 md:mt-0 md:w-[19rem] lg:-left-6"
            >
              <p className="flex items-center gap-2 text-sm font-medium">
                <span className="size-2 rounded-full bg-[#5ED3D0]" aria-hidden /> Dictated findings
              </p>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {sample.terms.map((term) => (
                  <li
                    key={term.hpo_id}
                    className={`rounded-full border px-2.5 py-1 text-xs ${
                      term.present ? "border-[#8EC5FC]/35 bg-[#8EC5FC]/10 text-[#EEF4F9]" : "border-dashed border-[#8EC5FC]/30 bg-transparent text-[#8EC5FC]"
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
            initial={reduced ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: reduced ? 0 : 0.85, ease: EASE }}
            className="lp-glass--night mt-4 overflow-hidden p-2 md:absolute md:-bottom-8 md:right-0 md:mt-0 md:w-[44%] lg:-right-6"
          >
            <img
              src={atlasMatch}
              width={920}
              height={460}
              alt="The atlas after the published Pompe case: two matching diseases stay lit, labelled Top match and Second match with their phenotype match percentage."
              className="w-full rounded-[20px]"
            />
          </motion.figure>
        </section>

        {/* Fuentes: nombres, no logotipos (no implican respaldo). */}
        <section id="sources" className="mx-auto max-w-6xl scroll-mt-24 px-4 pt-24 sm:px-6 md:pt-36">
          <Reveal className="lp-glass flex flex-col items-center gap-4 px-6 py-6 text-center md:flex-row md:justify-between md:text-left">
            <p className="text-sm text-[#5B7189]">Built on open, versioned data</p>
            <ul className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-medium">
              <li>Human Phenotype Ontology v2026-09-01</li>
              <li>Monarch phenopacket-store 0.1.27</li>
              <li>EURORDIS Rare Barometer</li>
              <li>PubMed · ClinicalTrials.gov</li>
            </ul>
          </Reveal>
        </section>

        {/* El problema: una cifra protagonista en la tarjeta marina y dos de apoyo en vidrio. */}
        <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 md:py-32">
          <Reveal>
            <h2 className="max-w-[20ch] text-[2.25rem] font-semibold leading-[1.06] tracking-[-0.03em] md:text-[3.5rem]">
              Diagnosis takes years. The evidence is already out there.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-12 md:grid-rows-2">
            <Reveal index={1} className="lp-navy lp-card flex flex-col justify-between gap-10 p-8 md:col-span-7 md:row-span-2 md:p-10">
              <p className="text-sm text-[#8EC5FC]">Average time to a rare disease diagnosis</p>
              <p className="flex items-baseline gap-3">
                <span className="text-[6rem] font-semibold leading-none tracking-[-0.05em] tabular-nums md:text-[9rem]">4.7</span>
                <span className="text-3xl font-medium text-[#8EC5FC]">years</span>
              </p>
              <Source href={EURORDIS} tone="sky">EURORDIS Rare Barometer, Eur J Hum Genet 2024</Source>
            </Reveal>
            <Reveal index={2} className="lp-glass lp-card flex flex-col gap-2 p-8 md:col-span-5">
              <span className="text-5xl font-semibold tracking-[-0.03em] tabular-nums">56%</span>
              <span className="text-base">wait more than 6 months from the first consultation.</span>
              <Source href={EURORDIS}>6,507 people in 41 countries</Source>
            </Reveal>
            <Reveal index={3} className="lp-glass lp-card flex flex-col gap-2 p-8 md:col-span-5">
              <span className="text-5xl font-semibold tracking-[-0.03em] tabular-nums">{total.toLocaleString("en-US")}</span>
              <span className="text-base">rare diseases with phenotypes, all in one map.</span>
              <Source href={HPO}>Human Phenotype Ontology v2026-09-01</Source>
            </Reveal>
          </div>
        </section>

        {/* Cómo funciona: los cuatro pasos en vidrio y el atlas completo flotando a la derecha. */}
        <section id="how" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 md:py-32">
          <Reveal>
            <h2 className="text-[2.25rem] font-semibold leading-[1.06] tracking-[-0.03em] md:text-[3.5rem]">One case, four moves.</h2>
          </Reveal>
          <div className="mt-12 grid items-center gap-10 lg:grid-cols-12">
            <ol className="lp-glass flex flex-col divide-y divide-[#0B2A4A]/10 p-3 lg:col-span-6">
              {STEPS.map((step, index) => (
                <Reveal as="li" key={step.verb} index={index} className="flex gap-5 p-5">
                  <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#1E6FD9]/10 text-[#1E6FD9]">
                    <step.icon size={22} aria-hidden />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-lg font-semibold">
                      <span className="mr-2 font-mono text-sm text-[#5B7189] tabular-nums">0{index + 1}</span>
                      {step.verb}
                    </span>
                    <span className="text-base leading-relaxed text-[#5B7189]">{step.text}</span>
                  </span>
                </Reveal>
              ))}
            </ol>
            <div className="relative lg:col-span-6">
              <Reveal index={1} className="lp-glass lp-card p-2">
                <img
                  src={atlasFull}
                  width={780}
                  height={780}
                  loading="lazy"
                  alt="The full atlas on a night sky: 12,867 rare diseases grouped into body systems, each a cluster of small stars, some twinkling."
                  className="w-full rounded-[20px]"
                />
              </Reveal>
              <Reveal index={3} className="lp-navy relative mt-4 p-6 sm:absolute sm:-bottom-8 sm:-left-8 sm:mt-0 sm:max-w-[17rem]">
                <p className="text-base font-medium leading-snug">Every connection carries its source and evidence level.</p>
                <p className="mt-2 text-sm text-[#8EC5FC]">No source, no line on the map.</p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* Para quién: Maria en la tarjeta marina (protagonista del recorrido), los otros dos en vidrio. */}
        <section id="people" className="mx-auto max-w-6xl scroll-mt-24 px-4 py-24 sm:px-6 md:py-32">
          <Reveal>
            <h2 className="max-w-[18ch] text-[2.25rem] font-semibold leading-[1.06] tracking-[-0.03em] md:text-[3.5rem]">
              Built for the people around one case.
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-12 md:grid-rows-2">
            <Reveal index={1} className="lp-navy lp-card flex flex-col justify-end gap-4 p-8 md:col-span-6 md:row-span-2 md:p-10">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#8EC5FC]">Patient group leader</p>
              <p className="text-3xl font-semibold tracking-[-0.02em]">Maria</p>
              <p className="max-w-[36ch] text-lg leading-relaxed text-white/90">
                Leads a community with no approved therapy. Gets who to work with and one step for this week.
              </p>
            </Reveal>
            <Reveal index={2} className="lp-glass lp-card flex flex-col gap-2 p-8 md:col-span-6">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#5B7189]">General neurologist</p>
              <p className="text-2xl font-semibold tracking-[-0.02em]">Dr. Ruiz</p>
              <p className="text-base leading-relaxed">Sees weakness, fatigue and high CK. Gets the closest matches and the next test to order.</p>
            </Reveal>
            <Reveal index={3} className="lp-glass lp-card flex flex-col gap-2 p-8 md:col-span-6">
              <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#5B7189]">Caregiver</p>
              <p className="text-2xl font-semibold tracking-[-0.02em]">Devon</p>
              <p className="text-base leading-relaxed">Leaves the clinic with an unfamiliar name. Gets a plain explanation and who to contact.</p>
            </Reveal>
          </div>
        </section>

        {/* Cierre: la misma acción que el hero, dentro de un panel de vidrio grande. */}
        <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6 md:pb-32">
          <Reveal className="lp-glass flex flex-col items-center gap-8 rounded-[32px]! px-6 py-16 text-center md:py-24">
            <h2 className="max-w-[20ch] text-[2.25rem] font-semibold leading-[1.06] tracking-[-0.03em] md:text-[3.5rem]">
              Try it with the published Pompe case or your own.
            </h2>
            <Ctas center />
          </Reveal>
        </section>
      </main>

      <footer className="relative mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="flex flex-col gap-3 border-t border-[#0B2A4A]/15 pt-6 text-sm md:flex-row md:items-center md:justify-between">
          <p>Phenotype match, not a diagnosis. Every number and connection links to its source.</p>
          <div className="flex flex-wrap gap-5">
            <Source href={EURORDIS} tone="navy">EURORDIS</Source>
            <Source href={HPO} tone="navy">HPO v2026-09-01</Source>
            <Source href={PHENOPACKETS} tone="navy">phenopacket-store 0.1.27</Source>
          </div>
        </div>
      </footer>
    </div>
  );
}
