# Atlas search (HACK-022)

One accessible combobox searches the six entity types through `api<T>()`. `/` focuses it outside editable fields; arrow keys select a result, Enter opens it, and Escape closes the list. Results display the matching synonym and identifier. Retrieval scores are not shown as clinical percentages.

Disease results open the inspector. Symptoms add a finding without duplicating an existing finding or changing its negation. Genes and mechanisms open `step="pathway"` for their first linked disease. Communities and assets open next steps, preserving the current disease when it is linked. Transcript, findings and ranking remain in the shared store.

Requests debounce for 150 ms, abort when superseded, and time out after 10 seconds. Missing endpoints (404) use small, explicitly labelled curated examples; other failures offer retry or explicit sample search. `?search=sample` selects those labelled examples for rehearsal.

The overlay reserves the central column and measures the shell footer to keep results above clinical panels. The header owner can set `--atlas-search-top`, `--atlas-search-left` and `--atlas-search-width`. Gesture controls must remain outside that reserved area.

## Browser verification

Run these servers in separate terminals from the repository root (Git Bash on Windows):

```bash
DEMO_MODE=true uv run uvicorn app.main:app --host 127.0.0.1 --port 8768
API_PORT=8768 npm --prefix web run dev -- --host 127.0.0.1 --port 5174 --strictPort
```

Then run:

```bash
bash scripts/q npm --prefix web run build
bash scripts/q npm --prefix web run lint
bash scripts/q uv run python web/src/features/search/check_ui.py --url http://127.0.0.1:5174
```

The Chromium check uses the real search endpoint for all six routes, inspects the development store to verify case preservation, and controls only outage/missing/delayed response scenarios. It checks keyboard navigation, negation, stale responses, recovery, runtime errors and overlap at 1280x720 with reduced motion. It requests no microphone or camera and makes no paid API calls. Evidence goes to `.cache/search-qa/`; a layout failure remains a failed check.
