import { MagnifyingGlass, X } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { api } from "../../lib/api";
import { useStore } from "../../lib/store";
import { Button, Kbd, SampleBadge } from "../../ui";
import { sampleSearch } from "./sample";
import type { ResultType, SearchResponse, SearchResult } from "./sample";
import "./style.css";

export const slot = "overlay";
export const order = 5;
const headings: Record<ResultType, string> = {
  disease: "Diseases", gene: "Genes", symptom: "Symptoms",
  mechanism: "Mechanisms", group: "Patient communities", asset: "Registries and studies",
};

export default function Search() {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<SearchResponse | null>(null);
  const [state, setState] = useState<"empty" | "loading" | "ready" | "error">("empty");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [retry, setRetry] = useState(0);
  const [useSample, setUseSample] = useState(() => new URLSearchParams(location.search).get("search") === "sample");
  const [notice, setNotice] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const currentQuery = useRef("");
  const listId = useId();
  const grouped = new Map<ResultType, SearchResult[]>();
  for (const result of response?.results ?? []) {
    if (result.type in headings) grouped.set(result.type, [...(grouped.get(result.type) ?? []), result]);
  }
  const ordered = [...grouped.values()].flat();
  const optionId = (index: number) => `${listId}-${index}`;

  useEffect(() => {
    const shortcut = (event: globalThis.KeyboardEvent) => {
      const target = event.target;
      if (event.key !== "/" || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey ||
          (target instanceof HTMLElement && (target.isContentEditable || target.closest("input, textarea, select")))) return;
      event.preventDefault();
      input.current?.focus();
      input.current?.select();
      setOpen(true);
    };
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("keydown", shortcut);
    document.addEventListener("pointerdown", outside);
    return () => {
      document.removeEventListener("keydown", shortcut);
      document.removeEventListener("pointerdown", outside);
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timer = setTimeout(async () => {
      timeout = setTimeout(() => controller.abort(), 10_000);
      try {
        const data = useSample ? sampleSearch(query) : await api<SearchResponse>(
          `/search?q=${encodeURIComponent(query.trim())}&limit=30`, { signal: controller.signal },
        );
        if (cancelled || currentQuery.current !== query) return;
        setResponse(data);
        setState("ready");
        if (data.demo_data) useStore.getState().setSampleMode(true);
      } catch (error) {
        if (cancelled || currentQuery.current !== query) return;
        if (error instanceof Error && error.message.startsWith("404 ")) {
          setResponse(sampleSearch(query));
          setState("ready");
          useStore.getState().setSampleMode(true);
        } else setState("error");
      } finally {
        clearTimeout(timeout);
      }
    }, 150);
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [query, retry, useSample]);

  useEffect(() => {
    if (open) document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
  });

  useEffect(() => {
    const footer = document.querySelector("main footer");
    const field = container.current?.querySelector(".atlas-search-input");
    const measure = () => {
      if (!field || !container.current) return;
      const start = field.getBoundingClientRect().bottom + 10;
      const end = Math.min(window.innerHeight - 16, footer?.getBoundingClientRect().top ?? window.innerHeight);
      container.current.style.setProperty("--atlas-search-max-height", `${Math.max(0, end - start - 16)}px`);
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (footer) observer.observe(footer);
    if (field) observer.observe(field);
    window.addEventListener("resize", measure);
    return () => { observer.disconnect(); window.removeEventListener("resize", measure); };
  }, [open]);

  function change(value: string) {
    currentQuery.current = value;
    setQuery(value);
    setResponse(null);
    setActive(0);
    setNotice("");
    setState(value.trim() ? "loading" : "empty");
    setOpen(true);
  }

  function choose(result: SearchResult) {
    const store = useStore.getState();
    if (result.type === "symptom") {
      const existing = store.terms.find((term) => term.hpo_id === result.id);
      if (!existing) store.setTerms([...store.terms, { hpo_id: result.id, label: result.label, present: true }]);
      store.setStep("dictation");
      setNotice(existing ? `Already recorded${existing.present ? "" : " as absent"}: ${result.label}` : `Added finding: ${result.label}`);
    } else {
      const disease = result.type === "disease" ? result.id
        : ((result.type === "group" || result.type === "asset") && store.selectedId && result.disease_ids.includes(store.selectedId)
          ? store.selectedId : result.disease_ids[0]);
      if (!disease) { setNotice("No linked disease is available for this result."); return; }
      store.setSelectedId(disease);
      store.setHighlightedEdgeId(null);
      store.setStep(result.type === "disease" ? "inspector"
        : result.type === "gene" || result.type === "mechanism" ? "pathway" : "action");
      setNotice(`Opened ${result.label}`);
    }
    setOpen(false);
  }

  function keyboard(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (ordered.length) setActive((index) => (index + (event.key === "ArrowDown" ? 1 : -1) + ordered.length) % ordered.length);
    } else if (event.key === "Enter" && open && state === "ready" && ordered[active]) {
      event.preventDefault(); choose(ordered[active]);
    }
  }

  return (
    <div ref={container} className="atlas-search" onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <div className="atlas-search-input">
        <MagnifyingGlass size={18} aria-hidden="true" />
        <input ref={input} role="combobox" aria-label="Search the atlas" placeholder="Search disease, gene, symptom..."
          value={query} maxLength={200} autoComplete="off" spellCheck={false}
          aria-expanded={open} aria-controls={open ? listId : undefined} aria-autocomplete="list"
          aria-activedescendant={open && state === "ready" && ordered[active] ? optionId(active) : undefined}
          onFocus={() => setOpen(true)} onChange={(event) => change(event.target.value)} onKeyDown={keyboard} />
        {query ? <button type="button" aria-label="Clear atlas search" onClick={() => { change(""); input.current?.focus(); }}><X size={18} aria-hidden="true" /></button> : <Kbd>/</Kbd>}
      </div>
      {open && <div className="atlas-search-popup">
        {response?.demo_data && <div className="atlas-search-sample"><SampleBadge /><span>Search examples from curated records.</span></div>}
        {state === "empty" && <p className="atlas-search-message">Start with a disease, gene, symptom, mechanism, community or study.</p>}
        {state === "loading" && <p className="atlas-search-message" role="status">Searching the atlas...</p>}
        {state === "error" && <div className="atlas-search-message" role="alert">
          <p>Search is unavailable. Your findings are saved.</p>
          <div className="atlas-search-recovery"><Button variant="secondary" onClick={() => { setState("loading"); setRetry((n) => n + 1); }}>Retry search</Button>
            <Button variant="ghost" onClick={() => { setUseSample(true); setState("loading"); }}>Use sample search</Button></div>
        </div>}
        {state === "ready" && !ordered.length && <p className="atlas-search-message" role="status">No results. Try a shorter name, an ID or another synonym.</p>}
        <div id={listId} role="listbox" aria-label="Atlas search results" className="atlas-search-results" aria-busy={state === "loading"}>
          {[...grouped].map(([type, results]) => <div role="group" aria-label={headings[type]} key={type}>
            <h2 className="atlas-search-heading">{headings[type]}</h2>
            {results.map((result) => {
              const index = ordered.indexOf(result);
              return <button type="button" role="option" tabIndex={-1} id={optionId(index)} key={`${result.type}:${result.id}`}
                aria-selected={active === index} className="atlas-search-result" onMouseEnter={() => setActive(index)}
                onPointerDown={(event) => event.preventDefault()} onClick={() => choose(result)}>
                <span className="atlas-search-label">{result.label}</span>
                <span className="atlas-search-match">Matched: {result.matched}</span>
                <span className="atlas-search-id">{result.id}</span>
              </button>;
            })}
          </div>)}
        </div>
      </div>}
      <span role="status" className="atlas-search-notice">{notice}</span>
    </div>
  );
}
