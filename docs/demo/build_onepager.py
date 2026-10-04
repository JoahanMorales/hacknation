"""Build the supplemental one-page report: python build_onepager.py.

Requires reportlab. This is a project report, not an assertion that the old
2025 submission guide applies to the current event. Team roster is unconfirmed.
"""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

HERE = Path(__file__).resolve().parent
OUTPUT = HERE / "output" / "pdf" / "Constellation_OnePager.pdf"
SECTIONS = [
    ("01  Challenge tackled", "Challenge 05: AI Atlas for the World's Rare Diseases. Maria leads a patient organization and needs a supported connection to an existing community, research asset or collaborator. Constellation links a broad map of 12,867 disease records to a curated neuromuscular evidence layer, then gives her a concrete question or contact for this week."),
    ("02  Tools and ML models", "FastAPI, React, TypeScript and a WebGL graph serve a reproducible public-data snapshot. OpenAI gpt-live-transcribe supports voice; gpt-6-luna maps locally proposed HPO candidates into structured symptom terms; gpt-6.1-sol explains supplied evidence with constrained citations. Local phenotype likelihood ratios and information gain produce the ranking and next question. The language models do not generate the percentages."),
    ("03  What worked well", "The published-case journey connects reviewable positive and negated findings to ranking, cited explanations and an actionable plan. Action-to-evidence navigation preserves the findings. English/Spanish selection is explicit. Curated edges expose provenance and evidence levels; uncovered diseases show missing evidence. Labelled recorded responses keep the sample usable without live credentials."),
    ("04  What was challenging", "A shared molecular mechanism cannot establish treatment transfer. Coverage is broad for phenotypes but deliberately limited for curated research routes. Spanish live transcription can confuse medical wording. Retrospective evaluation may overlap the annotation literature and is not clinical validation. The 10x goal remains a hypothesis: reuse existing registries, evidence and communities, then measure time to a meaningful milestone in a future pilot."),
    ("05  How we spent our time", "Work proceeded through contract and dataset preparation; OpenAI feasibility checks and local scoring; graph, dictation, evidence and action interfaces; independent reviews and integration fixes; then clean-checkout rehearsal and submission preparation. These phases are supported by task and commit history. Exact person-hours and team credit have not been supplied and are not estimated here."),
]


def footer(canvas, _doc):
    canvas.setStrokeColor(colors.HexColor("#cbd5e1"))
    canvas.line(42, 48, 570, 48)
    canvas.setFillColor(colors.HexColor("#475569"))
    canvas.setFont("Helvetica", 8)
    canvas.drawString(42, 34, "Published/public data only | Research prototype | No measured 10x result")
    canvas.drawRightString(570, 34, "1 / 1")


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=(8.5 * inch, 11 * inch),
                            leftMargin=42, rightMargin=42, topMargin=34,
                            bottomMargin=62, title="Constellation - Project One-Pager",
                            author="Constellation project", subject="Challenge 05 prototype report")
    styles = {
        "title": ParagraphStyle("title", fontName="Helvetica-Bold", fontSize=25, leading=29, textColor=colors.HexColor("#0f172a")),
        "subtitle": ParagraphStyle("subtitle", fontName="Helvetica", fontSize=10.5, leading=14, textColor=colors.HexColor("#475569")),
        "heading": ParagraphStyle("heading", fontName="Helvetica-Bold", fontSize=11.2, leading=14, spaceBefore=11, spaceAfter=4, textColor=colors.HexColor("#166534")),
        "body": ParagraphStyle("body", fontName="Helvetica", fontSize=10, leading=13.4, alignment=TA_LEFT, textColor=colors.HexColor("#1e293b")),
        "small": ParagraphStyle("small", fontName="Helvetica", fontSize=8, leading=10.5, textColor=colors.HexColor("#475569")),
    }
    story = [Paragraph("Constellation", styles["title"]), Spacer(1, 5),
             Paragraph("From scattered evidence to the community already working on it.", styles["subtitle"]),
             Spacer(1, 9), Paragraph("PROJECT REPORT  |  3 October 2026  |  Runtime snapshot: ee957e9", styles["small"]),
             Paragraph("Team name and roster await confirmation; the project name is used provisionally.", styles["small"])]
    for heading, body in SECTIONS:
        story.extend([Paragraph(heading, styles["heading"]), Paragraph(body, styles["body"])])
    story.extend([Spacer(1, 12), Paragraph('Repository and reproducible setup: <link href="https://github.com/JoahanMorales/hacknation" color="#166534">github.com/JoahanMorales/hacknation</link>', styles["small"]),
                  Paragraph("Sources: README.md; docs/ARCHITECTURE.md; app/fixtures/deep/deep.json; docs/validation.md. Dataset: HPO v2026-09-01; published sample: phenopacket-store 0.1.27, PMID_7668832_Father.", styles["small"])])
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)


if __name__ == "__main__":
    main()
