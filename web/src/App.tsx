import { ArrowsOut, SidebarSimple } from "@phosphor-icons/react";
import { type ComponentType, useEffect, useState } from "react";

import { type Step, useStore } from "./lib/store";
import { Button } from "./ui";

// Cada feature es web/src/features/<nombre>/index.tsx con `export default`, `slot` y `order`.
// Añadir una feature = crear su carpeta; App.tsx no se vuelve punto de conflicto.
// "page" = página propia que sustituye al atlas (la landing de HACK-029).
type Slot = "stage" | "left" | "right" | "bottom" | "overlay" | "page";
type FeatureModule = { default: ComponentType; slot?: Slot; order?: number };

const features = Object.entries(
  import.meta.glob<FeatureModule>("./features/*/index.tsx", { eager: true }),
)
  .map(([path, module]) => ({ path, ...module }))
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

// ?ui=kit muestra el kit de componentes base (web/src/ui/Kit.tsx, HACK-005) en lugar del shell.
// El glob es opcional: compila aunque Kit.tsx aún no exista.
const kitModule = Object.values(
  import.meta.glob<{ default: ComponentType }>("./ui/Kit.tsx", { eager: true }),
)[0];
const KitPage =
  new URLSearchParams(window.location.search).get("ui") === "kit" ? kitModule?.default : undefined;

// Dos páginas con URL propia: la landing en "/" y el atlas en "/?view=atlas" (Atrás vuelve a la
// landing). ?step/?select/?graph/?ui entran directo al atlas, igual que los navegadores automatizados
// (checks de Chromium); ?landing=on fuerza la landing. Las features de página cambian la URL con
// history.pushState y avisan con un evento popstate.
const hasPage = features.some((feature) => feature.slot === "page");
function currentPage(): "landing" | "atlas" {
  const params = new URLSearchParams(window.location.search);
  if (!hasPage || params.get("view") === "atlas") return "atlas";
  if (params.get("landing") === "on") return "landing";
  if (["step", "select", "graph", "ui", "landing"].some((key) => params.has(key))) return "atlas";
  return navigator.webdriver ? "atlas" : "landing";
}

// Recorrido de Maria visible en la cabecera (Ola 3: "no se entiende por dónde empezar").
const JOURNEY: { label: string; steps: Step[] }[] = [
  { label: "Symptoms", steps: ["constellation", "dictation"] },
  { label: "Matches", steps: ["diagnosis"] },
  { label: "Evidence", steps: ["inspector"] },
  { label: "Pathway", steps: ["pathway"] },
  { label: "Next steps", steps: ["action"] },
];

// El paso se deduce de lo que se ve: el inspector abierto es "Evidence" aunque la escena no cambie
// (p. ej. ?select=), y con hallazgos ya hay "Matches".
function currentStep(step: Step, selected: boolean, findings: boolean): number {
  if (step === "pathway" || step === "action") return JOURNEY.findIndex((item) => item.steps.includes(step));
  if (selected) return 2;
  if (findings || step === "diagnosis") return 1;
  return 0;
}

function Journey({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label="Journey">
      {JOURNEY.map((item, index) => (
        <li
          key={item.label}
          aria-current={index === current ? "step" : undefined}
          className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs transition-colors ${
            index === current ? "bg-accent text-accent-ink" : index < current ? "text-ink" : "text-muted"
          }`}
        >
          <span className="font-mono tabular-nums">{index + 1}</span>
          {index === current && <span>{item.label}</span>}
        </li>
      ))}
    </ol>
  );
}

// Las capas no capturan eventos (el grafo sigue interactivo detrás); sólo cada feature los recibe.
function SlotContent({ slot }: { slot: Slot }) {
  return features
    .filter((feature) => (feature.slot ?? "overlay") === slot)
    .map(({ path, default: Feature }) =>
      slot === "stage" || slot === "page" ? (
        <Feature key={path} />
      ) : (
        <div key={path} className="pointer-events-auto flex min-h-0 flex-col">
          <Feature />
        </div>
      ),
    );
}

export default function App() {
  const sampleMode = useStore((state) => state.sampleMode);
  const step = useStore((state) => state.step);
  const selected = useStore((state) => state.selectedId !== null);
  const findings = useStore((state) => state.terms.length > 0);
  // "Focus atlas": oculta los paneles para dejar la constelación sola (modo presentación).
  const [focus, setFocus] = useState(false);
  const [page, setPage] = useState(currentPage);
  // Panel de coincidencias sólo cuando hay algo que mostrar (Ola 3: "basura visual" al inicio).
  const showBottom = findings || step === "action";

  useEffect(() => {
    const onPop = () => setPage(currentPage());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const panels = `transition-opacity duration-300 ${focus ? "pointer-events-none opacity-0" : "opacity-100"}`;

  if (KitPage) return <KitPage />;
  if (page === "landing") return <SlotContent slot="page" />;

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden font-sans">
      {/* Stage: la constelación a pantalla completa, detrás de todo; nunca desaparece. */}
      <div className="absolute inset-0">
        <SlotContent slot="stage" />
      </div>

      {/* Capas: las features ocultan o muestran sus paneles según store.step. */}
      <div className="pointer-events-none absolute inset-0 grid grid-cols-[minmax(0,22rem)_1fr_minmax(0,24rem)] grid-rows-[auto_1fr_auto] gap-4 p-6">
        {/* Cabecera: nombre, recorrido y "Sample case" a la izquierda (debajo, el contador de la
            constelación); el centro queda para la búsqueda y la derecha para gestos y "Focus atlas". */}
        <header className="pointer-events-auto col-span-3 flex min-h-[3.25rem] items-start gap-3 justify-self-start">
          <span className="text-base font-semibold tracking-tight text-ink">OlivIA</span>
          <Journey current={currentStep(step, selected, findings)} />
          {sampleMode && (
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-xs text-muted">Sample case</span>
          )}
        </header>
        <Button
          variant={focus ? "primary" : "secondary"}
          onClick={() => setFocus((on) => !on)}
          aria-pressed={focus}
          className="pointer-events-auto fixed right-6 top-[1.1rem] z-20"
        >
          {focus ? <SidebarSimple size={18} aria-hidden /> : <ArrowsOut size={18} aria-hidden />}
          {focus ? "Show panels" : "Focus atlas"}
        </Button>
        {/* El dictado usa toda la altura izquierda; las coincidencias se colocan a su derecha. */}
        <aside className={`${step === "action" ? "" : "row-span-2"} flex min-h-0 flex-col gap-4 ${panels}`} aria-hidden={focus || undefined}>
          <SlotContent slot="left" />
        </aside>
        <div />
        <aside className={`flex min-h-0 flex-col gap-4 ${panels}`} aria-hidden={focus || undefined}>
          <SlotContent slot="right" />
        </aside>
        <footer
          // En la acción el dictado se oculta: el panel usa todo el ancho y su altura natural. Fuera de ella,
          // altura natural también: con 46vh el aviso "not a diagnosis" quedaba bajo el pliegue a 1280×720.
          className={`min-h-0 ${step === "action" ? "col-span-3 col-start-1" : "col-span-2 col-start-2 max-h-[calc(100dvh-8rem)] overflow-y-auto"} ${panels} ${showBottom ? "" : "hidden"}`}
          aria-hidden={focus || undefined}
        >
          <SlotContent slot="bottom" />
        </footer>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <SlotContent slot="overlay" />
      </div>
    </main>
  );
}
