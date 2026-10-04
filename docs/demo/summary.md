# Submission summary

Copy the paragraph below into the current submission form. Project name is Constellation; team name and roster require human confirmation.

Constellation helps a rare-disease patient organization move from scattered evidence to an actionable research conversation. Maria, an organization leader, needs to know which related diseases, communities and existing research assets could help her members reach their next milestone.

Our prototype combines a broad map of 12,867 disease records with a smaller, curated neuromuscular evidence layer. A clinician can dictate a published case, review standardized HPO symptom chips, and answer an information-gain question. Reproducible likelihood-ratio scoring narrows the map; percentages describe relative phenotype matches, not clinical probabilities. Maria can then inspect cited connections, distinguish observed evidence from inference or hypothesis, and find patient organizations, registries and studies, with a concrete contact to make this week. Missing coverage produces an explicit unsupported-route state.

OpenAI supports live transcription, structured symptom extraction and source-constrained explanations. Scoring remains local. Recorded sample responses or curated text provide a clearly labelled fallback when credentials or connectivity are unavailable. The interface preserves findings when moving between evidence and next steps.

The working FastAPI and React prototype is reproducible from the public repository, including processed datasets and source provenance. Retrospective results on published cases are exploratory, with possible annotation overlap; they are not clinical validation. Our proposed acceleration is to reuse existing evidence, communities and assets rather than start from scratch. A measured 10x improvement toward a treatment milestone remains a hypothesis to test with patient organizations.

## Supporting records

- Runtime snapshot: `ee957e9a0846a5d6de9f0efd0660e66f21e213b7`.
- Dataset count: actual `GET /api/graph/overview`; this counts records, not the total number of distinct rare diseases worldwide.
- Architecture and OpenAI roles: [architecture](../ARCHITECTURE.md), [README](../../README.md), [OpenAI spike](../../spikes/openai/RESULT.md).
- Sources and limits: [curated layer](../../app/fixtures/deep/deep.json), [retrospective validation](../validation.md).
- Challenge fit: user-supplied Challenge 05 brief, `file6.pdf`, sections Mission, Core concepts and Rubric.
