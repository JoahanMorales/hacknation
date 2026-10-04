# Demo verification evidence

Runtime under final verification: `ee957e9a0846a5d6de9f0efd0660e66f21e213b7` (main, PR32 language selector and PR31 gestures included). The docs preparation does not modify runtime behavior.

## Completed integration evidence

- HACK-017 is INTEGRATED at this main commit. Explicit English/Spanish selector routes the extraction language correctly; the English recorded sample remains independent of that selection.
- Peer joahan-1 message #478 reports real-key English live dictation with 5 chips and selected-Spanish extraction with correct negations. Spanish ASR can still mishear expiratory respiratory wording. This is peer synthetic-audio/TTS evidence, not an operator speaking into a physical microphone.
- HACK-006 fix `87ddf0b` independently approved and integrated via PR28: intro, reduced motion, ranking/reset, selection and fallback verified. Software WebGL measurements do not establish hardware performance.
- Navigation PR26 is integrated: Action -> Back restores evidence and findings.
- Benchmark PR29 `fa584d7` independently checked against production scoring on all 210 rows. The earlier benchmark SHA `45547d1` was rejected; its historical task record was not rewritten. Use corrected results in current `docs/validation.md`.
- HACK-013 optional gestures are integrated by the human. Independent review confirmed two P2 issues on `64bb901`: the fixed overlay intercepts the inspector close button, and a model-load failure after camera permission can leave a track live. Request #489 asks the owner for fixes. They are not required for the recording route and should remain off; this does not remove the overlay hit-area issue.

## Final clean-checkout verification

On 3 October 2026, a separate clean clone pulled main `ee957e9`. `git status --porcelain` was empty. It reused dependencies initially installed from the committed lockfiles, then the standard smoke reinstalled npm dependencies and rebuilt the final web bundle.

- `bash scripts/q bash scripts/smoke`: **PRODUCT_PASS**, exit 0, 354 s. Secret scan checked 279 tracked files; Ruff passed; **67 backend tests passed**; frontend lint and production build passed. Vite's bundle-size warning remains a performance limitation, not a failing build.
- Server ran with `DEMO_MODE=true`, no new paid API call. Recorded AI responses retain sample labels; diagnosis and curated action endpoints are actual local services, returning `demo_data: false`.
- `docs/demo/check_tour.py`, native Playwright Chromium at 1280x720: **FULL_TOUR_PASS**. Published sample -> No -> inspect Pompe/GAA -> explanation -> real E07 edge response -> Pompe action -> Back preserved 6 findings and URL. Action reached in **21.88 s**; back at **22.92 s**. These are automated timings.
- Explicit FKRP selection, a separate disease from the sample: actual action plan returned **2 groups, 7 assets, 8 cited bridges**; CureLGMD2i and the actionable registry contact rendered. Expanded assumptions state that no measured 10x speed-up exists.
- An uncovered disease `OMIM:310200` rendered **No supported route yet** and missing evidence. Browser runtime and console errors: **0**.
- [Machine-readable tour report](tour-report.json); [source archive manifest](source-manifest.json). Screenshots are local delivery artifacts, not submitted videos.

Reproduce after setup and starting the built app: `uv run python docs/demo/check_tour.py --url http://127.0.0.1:8000 --out /absolute/path/to/evidence`. The command checks that its working directory is a clean checkout. Run from the runtime checkout if the docs branch is still uncommitted.

Supplemental one-page report: generated with ReportLab, reopened with PDF metadata inspection (one page), rendered with Poppler and visually checked. Source archive: 2,731,389 bytes, SHA-256 `694cfdea5d3ee3527b1bd7b37eca7e4959da6a7304b0fbda3248b782f5ae163e`; ZIP integrity, required files and excluded local/raw paths checked. See the manifest for the exact runtime SHA.

## Human-only evidence still pending

| Required evidence | Result |
|---|---|
| Physical microphone check if recording live | Pending operator check |
| Timed manual product route | Pending: date, operator, commit, seconds, failures |
| Team introduction clip replay | Pending: filename, duration, bytes, playable/audio result |
| Product demo clip replay | Pending |
| Technical walkthrough clip replay | Pending |
| Plan B complete-tour playback | Pending |
| Platform and Google Form receipts | Pending; no submission performed |

Automated tour times measure scripted browser interaction, not clinical benefit, user study performance or operator delivery speed. The proposed patient-progress acceleration is unmeasured.
