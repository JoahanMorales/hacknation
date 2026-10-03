"""Shared API v1 contracts. JSON examples live in app/fixtures/api/.

Percentages describe normalized phenotype matching, never clinical probability.
All response fixtures explicitly identify sample data and their provenance.
"""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

HpoId = Annotated[str, Field(pattern=r"^HP:\d{7}$")]
DiseaseId = Annotated[str, Field(pattern=r"^(OMIM|ORPHA|MONDO|DECIPHER):\d+$")]
Percent = Annotated[float, Field(ge=0, le=100, allow_inf_nan=False)]
EvidenceLevel = Literal["observado", "inferido", "hipotesis", "contradictorio"]


class Contract(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)


class Source(Contract):
    name: str
    url: HttpUrl
    version: str
    sha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")] | None = None


class SampleResponse(Contract):
    schema_version: Literal["1.0"] = "1.0"
    demo_data: bool = False
    sources: list[Source] = Field(default_factory=list)


class Disease(Contract):
    id: DiseaseId
    name: str
    synonyms: list[str] = Field(default_factory=list)
    group: str
    mechanism_ids: list[str] = Field(default_factory=list)
    x: float
    y: float


class Phenotype(Contract):
    hpo_id: HpoId
    name: str
    ancestors: list[HpoId] = Field(default_factory=list)
    ic: float = Field(ge=0)


class Annotation(Contract):
    disease_id: DiseaseId
    hpo_id: HpoId
    freq: float | None = Field(default=None, ge=0, le=1)
    source: str


class Gene(Contract):
    symbol: str
    disease_ids: list[DiseaseId]
    pathway: str


class Mechanism(Contract):
    id: str
    name: str
    gene_symbols: list[str]
    source_url: HttpUrl


class Edge(Contract):
    id: str
    src: DiseaseId
    dst: DiseaseId
    type: str
    source_url: HttpUrl
    record_id: str
    retrieved_at: datetime
    confidence: float = Field(ge=0, le=1)
    evidence_level: EvidenceLevel
    summary: str
    confidence_note: str


class PatientGroup(Contract):
    name: str
    diseases: list[DiseaseId]
    url: HttpUrl
    registry: HttpUrl | None = None


class Asset(Contract):
    kind: Literal["registro", "historia_natural", "ensayo", "biomarcador"]
    id: str
    name: str
    url: HttpUrl
    evidence_level: EvidenceLevel


class SymptomTerm(Contract):
    hpo_id: HpoId
    label: str
    present: bool
    quote: str | None = None


class Case(Contract):
    id: str
    disease_id: DiseaseId
    pmid: Annotated[str, Field(pattern=r"^PMID:\d+$")]
    source_url: HttpUrl
    source_version: str
    source_sha256: Annotated[str, Field(pattern=r"^[a-f0-9]{64}$")]
    transcript_es: str
    transcript_en: str
    terms: list[SymptomTerm] = Field(min_length=1)
    term_sequence: list[HpoId]
    demo_data: Literal[True] = True
    adaptation_note: str

    @model_validator(mode="after")
    def sequence_covers_terms(self):
        ids = [term.hpo_id for term in self.terms]
        if len(ids) != len(set(ids)) or set(self.term_sequence) != set(ids):
            raise ValueError(
                "Case sequence must contain every unique term exactly once"
            )
        if len(self.term_sequence) != len(ids):
            raise ValueError("Repeated terms in case sequence")
        return self


class SymptomsExtractRequest(Contract):
    transcript: str = Field(min_length=1, max_length=20000)
    language: Literal["es", "en"] = "en"


class SymptomsExtractResult(SampleResponse):
    terms: list[SymptomTerm]
    extraction_method: str


class DiagnosisRequest(Contract):
    terms: list[SymptomTerm] = Field(max_length=100)

    @model_validator(mode="after")
    def unique_terms(self):
        if len({term.hpo_id for term in self.terms}) != len(self.terms):
            raise ValueError("Resolve duplicate or contradictory terms before scoring")
        return self


class Driver(Contract):
    hpo_id: HpoId
    label: str
    present: bool
    likelihood_ratio: float = Field(gt=0)
    log_lr: float
    direction: Literal["supports", "against", "neutral"]
    annotation_hpo_id: HpoId | None = None
    source: str | None = None


class RankedDisease(Contract):
    disease_id: DiseaseId
    name: str
    pct: Percent
    low: Percent
    high: Percent
    drivers: list[Driver] = Field(max_length=3)

    @model_validator(mode="after")
    def ordered_band(self):
        if not self.low <= self.pct <= self.high:
            raise ValueError("Expected low <= pct <= high")
        return self


class NextQuestion(SampleResponse):
    hpo_id: HpoId | None
    label: str | None
    question: str
    candidates: list[DiseaseId] = Field(max_length=2)
    information_gain_bits: float = Field(ge=0)
    if_yes: str
    if_no: str
    rationale: str


class DiagnosisResult(SampleResponse):
    ranking: list[RankedDisease] = Field(max_length=10)
    next_question: NextQuestion | None = None
    total_diseases: int = Field(ge=1)
    other_pct: Percent
    terms_used: int = Field(ge=0)
    method: str
    range_kind: str
    disclaimer: str

    @model_validator(mode="after")
    def ranking_is_consistent(self):
        values = [item.pct for item in self.ranking]
        if values != sorted(values, reverse=True):
            raise ValueError("Ranking must be sorted by descending match")
        ids = [item.disease_id for item in self.ranking]
        if len(ids) != len(set(ids)):
            raise ValueError("Ranking contains duplicate disease IDs")
        if abs(sum(values) + self.other_pct - 100) > 0.02:
            raise ValueError("Ranked and remaining mass must sum to 100")
        return self


class GraphGroup(Contract):
    id: HpoId
    label: str
    count: int = Field(ge=0)
    x: float
    y: float
    r: float = Field(gt=0)


class GraphOverview(SampleResponse):
    nodes: list[Disease]
    groups: list[GraphGroup] = Field(default_factory=list)
    edges: list[Edge] = Field(default_factory=list)
    total_diseases: int = Field(ge=1)
    displayed_diseases: int = Field(ge=1)
    layout_kind: str

    @model_validator(mode="after")
    def graph_is_consistent(self):
        ids = {node.id for node in self.nodes}
        if len(ids) != len(self.nodes) or len(self.nodes) != self.displayed_diseases:
            raise ValueError("Graph requires unique IDs and accurate displayed count")
        if self.total_diseases < self.displayed_diseases:
            raise ValueError("Displayed count exceeds the dataset")
        if any(edge.src not in ids or edge.dst not in ids for edge in self.edges):
            raise ValueError("Graph edge endpoints must exist")
        if self.groups:
            group_ids = {group.id for group in self.groups}
            if len(group_ids) != len(self.groups):
                raise ValueError("Graph groups must have unique IDs")
            if any(node.group not in group_ids for node in self.nodes):
                raise ValueError("Every node must refer to a declared group")
            if sum(group.count for group in self.groups) != self.total_diseases:
                raise ValueError("Group counts must cover the full dataset")
        return self


class NodeResult(SampleResponse):
    disease: Disease
    genes: list[Gene]
    mechanisms: list[Mechanism]
    summary: str
    symptoms_for: list[SymptomTerm]
    symptoms_against: list[SymptomTerm]
    edges: list[Edge]


class EdgeResult(SampleResponse):
    edge: Edge


class ExplainRequest(Contract):
    disease_id: DiseaseId
    edge_ids: list[str]
    language: Literal["es", "en"] = "en"


class ExplanationCitation(Contract):
    edge_id: str
    source_url: HttpUrl


class ExplainResult(SampleResponse):
    disease_id: DiseaseId
    text: str
    citations: list[ExplanationCitation]
    generation_method: str


class ActionPlanRequest(Contract):
    disease_id: DiseaseId


class TimelineLane(Contract):
    label: str
    duration: str
    source_url: HttpUrl | None = None


class Timeline(Contract):
    current: TimelineLane
    proposed: TimelineLane
    assumptions: list[str] = Field(min_length=1)


class ThisWeek(Contract):
    action: str
    url: HttpUrl | None = None


class ActionPlan(SampleResponse):
    disease_id: DiseaseId
    supported: bool
    groups: list[PatientGroup]
    assets: list[Asset]
    bridges: list[Edge]
    differences: list[str]
    needs_expert: list[str]
    this_week: ThisWeek
    timeline: Timeline | None
    searched: list[str] = Field(default_factory=list)
    missing_evidence: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def unsupported_is_actionable(self):
        if not self.supported and (not self.searched or not self.missing_evidence):
            raise ValueError(
                "Unsupported route must explain searches and missing evidence"
            )
        return self


class TranscribeSession(SampleResponse):
    client_secret: str
    expires_at: int = Field(ge=0)
    model: str
    usable: bool


RESPONSE_MODELS = {
    "graph_overview": GraphOverview,
    "symptoms_extract": SymptomsExtractResult,
    "diagnose": DiagnosisResult,
    "next_question": NextQuestion,
    "node": NodeResult,
    "edge": EdgeResult,
    "explain": ExplainResult,
    "action_plan": ActionPlan,
    "transcribe_session": TranscribeSession,
}
