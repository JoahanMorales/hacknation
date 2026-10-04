// Contrato GET /api/pathway/{id} (HACK-023, modelos en app/routers/pathway.py).
export type NodeType = "disease" | "gene" | "mechanism" | "group" | "asset" | "investigator";
export type Evidence = "observado" | "inferido" | "hipotesis" | "contradictorio";

export type PathwayNode = { id: string; type: NodeType; label: string; meta: Record<string, unknown> };
export type PathwayEdge = {
  id: string;
  src: string;
  dst: string;
  type: string;
  evidence_level: Evidence;
  source_url: string | null;
  summary: string;
  curated_edge_id: string | null;
};
export type Pathway = {
  center: string;
  nodes: PathwayNode[];
  edges: PathwayEdge[];
  coverage: { searched: string[]; missing: string[] };
};

export type Placed = PathwayNode & { x: number; y: number; ring: number };

// Anillos alrededor del centro: biología (genes, mecanismos) → enfermedades relacionadas →
// personas y recursos (grupos, activos, investigadores). Así Maria lee de dentro hacia fuera:
// "por qué" → "quién más lo tiene" → "con quién trabajar".
const RING: Record<NodeType, number> = { gene: 1, mechanism: 1, disease: 2, group: 3, asset: 3, investigator: 3 };
const RADIUS = [0, 150, 285, 400];

/**
 * Layout radial determinista: cada nodo busca el ángulo medio de sus vecinos ya colocados en anillos
 * interiores y luego se reparte su anillo conservando ese orden, para que las aristas sean cortas y
 * no se crucen de lado a lado. Coordenadas centradas en (0, 0).
 */
export function layout(pathway: Pathway): Placed[] {
  const center = pathway.nodes.find((node) => node.id === pathway.center);
  const angle = new Map<string, number>();
  const placed: Placed[] = [];
  if (center) {
    placed.push({ ...center, x: 0, y: 0, ring: 0 });
    angle.set(center.id, 0);
  }
  const neighbors = new Map<string, string[]>();
  for (const edge of pathway.edges) {
    neighbors.set(edge.src, [...(neighbors.get(edge.src) ?? []), edge.dst]);
    neighbors.set(edge.dst, [...(neighbors.get(edge.dst) ?? []), edge.src]);
  }

  for (let ring = 1; ring <= 3; ring++) {
    const members = pathway.nodes.filter((node) => node.id !== pathway.center && RING[node.type] === ring);
    if (members.length === 0) continue;
    // Ángulo deseado: media circular de los vecinos ya colocados; si no hay, se agrupa por tipo.
    const wanted = members.map((node, index) => {
      const known = (neighbors.get(node.id) ?? []).filter((id) => angle.has(id) && id !== pathway.center);
      if (known.length === 0) return { node, a: typeOffset(node.type) + index * 0.001 };
      const sx = known.reduce((sum, id) => sum + Math.cos(angle.get(id)!), 0);
      const sy = known.reduce((sum, id) => sum + Math.sin(angle.get(id)!), 0);
      return { node, a: Math.atan2(sy, sx) };
    });
    wanted.sort((p, q) => norm(p.a) - norm(q.a));
    const start = norm(wanted[0].a);
    const step = (Math.PI * 2) / members.length;
    wanted.forEach(({ node }, index) => {
      const a = start + index * step;
      angle.set(node.id, a);
      placed.push({ ...node, x: Math.cos(a) * RADIUS[ring], y: Math.sin(a) * RADIUS[ring], ring });
    });
  }
  return placed;
}

function typeOffset(type: NodeType): number {
  return { gene: -Math.PI / 2, mechanism: -Math.PI / 6, disease: Math.PI, group: Math.PI / 2, asset: Math.PI / 6, investigator: (5 * Math.PI) / 6 }[type];
}

function norm(a: number): number {
  return ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

export const EDGE_LABEL: Record<string, string> = {
  caused_by: "Caused by",
  participates_in: "Takes part in",
  shared_pathway: "Shared pathway",
  therapy_bridge: "Therapy bridge",
  allelic_series: "Allelic series",
  differential_diagnosis: "Differential diagnosis",
  same_mechanism_family: "Same mechanism family",
  patient_group_for: "Patient group",
  registro_for: "Registry",
  historia_natural_for: "Natural history study",
  ensayo_for: "Clinical trial",
  phenotype_similarity: "Shared phenotype",
};

// Aristas que cambian la lectura clínica: se rotulan sobre el mapa si caben sin pisar otra etiqueta.
export const NOTABLE_EDGES = new Set(["allelic_series", "therapy_bridge", "differential_diagnosis", "shared_pathway", "phenotype_similarity"]);

/**
 * Forma corta legible para el jurado: las seis "Muscular dystrophy-dystroglycanopathy …" sólo difieren al
 * final del nombre, así que se reescriben como "LGMD C4" o "Congenital A5" y se anteponen al gen.
 */
export function shortForm(label: string): string {
  const girdleType = label.match(/limb-girdle\)?, type ([A-Z0-9]+)(?:, (\d+))?/i);
  if (girdleType) return `LGMD ${girdleType[1]}${girdleType[2] ?? ""}`;
  const congenital = label.match(/congenital[^)]*\), type ([A-Z]), (\d+)/i);
  if (congenital) return `Congenital ${congenital[1]}${congenital[2]}`;
  const rClass = label.match(/limb-girdle muscular dystrophy (R\d+)/i);
  if (rClass) return `LGMD ${rClass[1]}`;
  const lateOnset = label.match(/^(.+?) disease, late-onset$/i);
  if (lateOnset) return `Late-onset ${lateOnset[1]}`;
  return label.replace(/muscular dystrophy/i, "MD");
}

/** Gen causal de cada enfermedad según las aristas `caused_by` (enfermedad → gene:SYMBOL). */
export function genesByDisease(pathway: Pathway): Map<string, string> {
  const genes = new Map<string, string>();
  for (const edge of pathway.edges) {
    if (edge.type === "caused_by" && edge.dst.startsWith("gene:")) genes.set(edge.src, edge.dst.slice(5));
  }
  return genes;
}

export function displayName(node: PathwayNode, genes: Map<string, string>): string {
  if (node.type !== "disease") return node.label;
  const form = shortForm(node.label);
  const gene = genes.get(node.id);
  return gene && !form.includes(gene) ? `${gene} · ${form}` : form;
}
