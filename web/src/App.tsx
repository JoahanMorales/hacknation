import type { ComponentType } from "react";

import { useStore } from "./lib/store";

// Cada feature es web/src/features/<nombre>/index.tsx con `export default`, `slot` y `order`.
// Añadir una feature = crear su carpeta; App.tsx no se vuelve punto de conflicto.
type Slot = "stage" | "left" | "right" | "bottom" | "overlay";
type FeatureModule = { default: ComponentType; slot?: Slot; order?: number };

const features = Object.entries(
  import.meta.glob<FeatureModule>("./features/*/index.tsx", { eager: true }),
)
  .map(([path, module]) => ({ path, ...module }))
  .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));

// Las capas no capturan eventos (el grafo sigue interactivo detrás); sólo cada feature los recibe.
function SlotContent({ slot }: { slot: Slot }) {
  return features
    .filter((feature) => (feature.slot ?? "overlay") === slot)
    .map(({ path, default: Feature }) =>
      slot === "stage" ? (
        <Feature key={path} />
      ) : (
        <div key={path} className="pointer-events-auto">
          <Feature />
        </div>
      ),
    );
}

export default function App() {
  const sampleMode = useStore((state) => state.sampleMode);

  return (
    <main className="relative h-[100dvh] w-full overflow-hidden font-sans">
      {/* Stage: la constelación a pantalla completa, detrás de todo; nunca desaparece. */}
      <div className="absolute inset-0">
        <SlotContent slot="stage" />
      </div>

      {/* Capas: las features ocultan o muestran sus paneles según store.step. */}
      <div className="pointer-events-none absolute inset-0 grid grid-cols-[minmax(0,22rem)_1fr_minmax(0,24rem)] grid-rows-[auto_1fr_auto] gap-4 p-6">
        <header className="pointer-events-auto col-span-3 flex items-center gap-3 justify-self-start">
          <span className="text-sm font-medium tracking-tight">Constellation</span>
          {sampleMode && (
            <span className="rounded-full border border-white/15 px-2 py-0.5 font-mono text-xs text-zinc-400">
              Sample case
            </span>
          )}
        </header>
        <aside className="flex min-h-0 flex-col gap-4">
          <SlotContent slot="left" />
        </aside>
        <div />
        <aside className="flex min-h-0 flex-col gap-4">
          <SlotContent slot="right" />
        </aside>
        <footer className="col-span-3">
          <SlotContent slot="bottom" />
        </footer>
      </div>

      <div className="pointer-events-none absolute inset-0">
        <SlotContent slot="overlay" />
      </div>
    </main>
  );
}
