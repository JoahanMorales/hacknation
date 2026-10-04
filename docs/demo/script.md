# Recording scripts and rehearsal

The current platform requires **three separate videos**, each MP4 or MOV, at most 60 seconds and 1 GB. Aim for 55 seconds to leave room for transitions. English narration matches the interface and judges. Confirm the team roster before recording video 1.

## 1. Team introduction (target 50-55 seconds)

| Time | Show / say | Rubric |
|---|---|---|
| 0-12 s | Show the team photo and confirmed names/roles. "We are [confirmed team name]. I'm [name and role], joined by [names and roles]. We built Constellation for Challenge Five, AI Atlas for the World's Rare Diseases." | Product craft |
| 12-30 s | "Maria leads a patient organization. Her members need more than another search result: they need to know who already has relevant evidence, a registry or an asset, and what research conversation to start next." | Patient progress |
| 30-47 s | "Constellation connects phenotype matching to cited mechanisms, existing communities and a concrete next step. We combine public rare-disease data, reproducible local scoring and OpenAI-supported language tools." | Graph quality, evidence integrity |
| 47-55 s | "Our goal is to shorten the path to a meaningful milestone by reusing what already exists. We show uncertainty and missing evidence throughout." | 10x impact (hypothesis) |

Replace every bracketed roster field; do not read placeholders aloud. Names, exact credits and team name have not been supplied to the agent.

## 2. Product demo (target 55 seconds)

Prepare two tabs before recording: `/` and `/?select=ORPHA:34515&step=action`. The second tab is an explicitly selected FKRP-related disease, **not the result of the Pompe sample**. Keep browser zoom at 100%; use 1280x720 or 1440x900. Leave gestures off.

| Time | Operator action and narration | Rubric |
|---|---|---|
| 0-8 s | Show `/`: "Maria needs a route through scattered rare-disease evidence. This map contains 12,867 disease records from our pinned dataset." | Graph quality |
| 8-22 s | Click **Play sample case** and let it finish. "A published Pompe case becomes reviewable symptom chips. This is our labelled recorded sample; scoring is local." | Evidence integrity, craft |
| 22-33 s | Click **No** once, wait for the ranking, then **Inspect Pompe disease, late-onset** and **Explain for the family**. "A question refines the match. Every explanation points back to cited evidence; a match is not a diagnosis." | Evidence integrity |
| 33-45 s | Switch to the preloaded FKRP action tab. "Now we select the curated FKRP cluster for Maria. It shows existing organizations, research assets and connections whose evidence levels remain visible." | Patient progress |
| 45-55 s | Point to **This week**; expand **Assumptions** if time allows. "Her next action is to ask an existing registry about eligibility and its data. Faster progress is our hypothesis; treatment transfer and a 10x improvement are not proven." | Patient progress, 10x impact |

Optional live substitution: choose **English**, start the microphone, and dictate the exact published sample transcript in `spikes/openai/recorded/transcribe_en.json`. Stop and verify every positive and negated chip. A live call needs the team's server-side key and may cost money; this script does not authorize a new paid call. Recorded sample is the reliable fallback. Spanish live ASR can confuse respiratory wording; the language selector itself is verified.

## 3. Technical walkthrough (target 55 seconds)

| Time | Show / say | Rubric |
|---|---|---|
| 0-12 s | Show `docs/ARCHITECTURE.md`: "FastAPI serves a React interface and reproducible public-data snapshots. The broad phenotype map is complemented by a curated mechanism and research layer." | Graph quality, craft |
| 12-28 s | Show `README.md`, OpenAI table: "OpenAI transcribes voice, extracts HPO terms from local candidates using structured output, and explains only supplied evidence. The server holds the key; the browser receives an ephemeral session token." | Evidence integrity |
| 28-40 s | Show `app/services/scoring.py`: "Likelihood ratios, phenotype hierarchy, explicit negations and information gain produce the ranking and next question locally. AI does not invent the percentages." | Evidence integrity |
| 40-49 s | Show `app/fixtures/deep/deep.json`: "Edges carry source URLs, record IDs, dates and evidence levels. Unsupported routes expose what was searched and what evidence is missing." | Evidence integrity, patient progress |
| 49-55 s | Show clean-checkout results from [evidence](evidence.md): "We checked the complete browser journey and reproducible setup. Published-case evaluation remains exploratory, not a clinical test." | Craft |

## Optional three-minute live pitch (practice only)

| Time | Content | Rubric |
|---|---|---|
| 0:00-0:20 | Maria's need: find a supported connection and an existing collaborator or asset. | Patient progress |
| 0:20-1:30 | Published sample -> review chips -> No -> inspect Pompe -> family explanation -> source -> Next steps -> Back to evidence. | Graph quality, evidence integrity, craft |
| 1:30-2:10 | Explicitly select FKRP action tab; inspect labelled bridge evidence, organizations, registry and expert questions. | Patient progress |
| 2:10-2:40 | Architecture and uncertainty; explain local scoring versus language models. | Evidence integrity |
| 2:40-3:00 | Propose reusing registry and evidence; measure time to an actionable collaborator milestone in a future patient-organization pilot. | 10x impact (hypothesis) |

## Rehearsal and backup

1. Use the pinned runtime snapshot and [setup instructions](../../README.md#run-it). Start FastAPI after the web build; check `/api/health` and the map.
2. Human operator walks the exact video route with a stopwatch. Write actual timing, date, commit and failures in [evidence](evidence.md). Automated timings do not replace this.
3. Human records the three clips plus a local backup of the complete tour. Suggested folder: `hacknation-submission/videos/` outside Git. Play every exported file fully; confirm <=60 s per submitted clip, codec/container and audio.
4. If network or live transcription fails, use **Play sample case**, keeping its sample label visible. Scoring and curated action data work locally. Do not conceal a fallback.
5. The authorized person uploads to both required destinations and records receipts. Submission remains pending until both are confirmed.

## Numerical claims and sources

| Claim | Source / limit |
|---|---|
| 12,867 disease records | Actual overview endpoint and processed `app/fixtures/graph/overview.json`; dataset record count. |
| Published sample | phenopacket-store 0.1.27, `PMID_7668832_Father`; provenance in `app/fixtures/api/`. |
| 67 backend tests | Final clean-checkout smoke log recorded in evidence; update only after it passes. |
| Retrospective metrics | `docs/validation.md` and production-aligned `app/fixtures/validation/`; do not describe as prospective accuracy. |
| No measured 10x | `app/services/action.py` timeline assumptions. Different outcomes cannot be used as a speed-up ratio. |

Avoid current therapy-approval claims in the recording unless the team independently checks authoritative sources at recording time.
