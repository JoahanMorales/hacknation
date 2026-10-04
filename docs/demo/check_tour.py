"""Rehearse actual runtime APIs and UI from a clean checkout with Playwright.

Run with the checkout as cwd and FastAPI serving its built web:
  uv run python /path/to/docs/demo/check_tour.py --url http://127.0.0.1:8000 --out /tmp/tour
No paid calls are required: use DEMO_MODE=true on the server. This is automated
evidence and does not replace the manual timed rehearsal or video playback.
"""

import argparse
import json
import subprocess
import time
from pathlib import Path

from playwright.sync_api import expect, sync_playwright


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    base = args.url.rstrip("/")
    args.out.mkdir(parents=True, exist_ok=True)
    report = {
        "source_sha": subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip(),
        "tracked_clean": not subprocess.check_output(["git", "status", "--porcelain"], text=True).strip(),
        "url": base,
        "method": "Automated Chromium; software WebGL; no physical microphone or camera",
    }
    assert report["tracked_clean"], "Run from a clean checkout"
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
        try:
            page = browser.new_page(viewport={"width": 1280, "height": 720})
            errors, console = [], []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda e: console.append(e.text) if e.type == "error" else None)
            page.goto(base + "/")
            page.wait_for_load_state("networkidle")
            expect(page.get_by_text("12,867 rare diseases", exact=False)).to_be_visible()
            start = time.monotonic()
            page.get_by_role("button", name="Play sample case", exact=True).click()
            expect(page.get_by_role("button", name="Restart sample case")).to_be_visible()
            expect(page.get_by_role("button", name="Play sample case", exact=True)).to_be_visible(timeout=60000)
            expect(page.get_by_role("button", name="No", exact=True)).to_be_enabled(timeout=20000)
            with page.expect_response(lambda r: r.url.endswith("/api/diagnose")) as diagnosis:
                page.get_by_role("button", name="No", exact=True).click()
            assert diagnosis.value.json()["demo_data"] is False
            assert len(diagnosis.value.request.post_data_json["terms"]) == 6
            expect(page.get_by_role("button", name="No", exact=True)).to_be_enabled(timeout=20000)
            page.get_by_role("button", name="Inspect Pompe disease, late-onset", exact=True).click()
            inspector = page.get_by_label("Disease inspector")
            expect(inspector).to_contain_text("GAA", timeout=15000)
            page.wait_for_load_state("networkidle")
            inspector.get_by_role("button", name="Explain for the family").click()
            expect(inspector.get_by_role("button", name="Source 1:", exact=False)).to_be_visible(timeout=15000)
            with page.expect_response(lambda r: "/api/edge/" in r.url) as citation:
                inspector.get_by_role("button", name="Source 1:", exact=False).click()
            assert citation.value.status == 200
            report["cited_edge"] = citation.value.json()["edge"]["id"]
            with page.expect_response(lambda r: r.url.endswith("/api/action-plan")) as action:
                inspector.get_by_role("button", name="Next steps", exact=False).click()
            result = action.value.json()
            assert result["supported"] and result["disease_id"] == "OMIM:621314" and result["demo_data"] is False
            plan = page.get_by_label("Action plan")
            expect(plan).to_be_in_viewport(ratio=1)
            expect(page.get_by_role("region", name="Dictation")).to_have_count(0)
            expect(page.get_by_test_id("diagnosis")).to_have_count(0)
            report["action_seconds"] = round(time.monotonic() - start, 2)
            page.screenshot(path=str(args.out / "pompe-action.png"), full_page=True)
            page.get_by_role("button", name="Back to evidence", exact=True).click()
            expect(inspector).to_be_visible()
            expect(page.get_by_test_id("diagnosis")).to_be_visible()
            expect(page.get_by_role("region", name="Dictation").get_by_role("button", name="Remove", exact=False)).to_have_count(6)
            assert page.url == base + "/"
            report["back_seconds"] = round(time.monotonic() - start, 2)

            # The second scene explicitly selects a different disease, without
            # pretending the Pompe published case diagnoses this disease.
            with page.expect_response(lambda r: r.url.endswith("/api/action-plan")) as maria:
                page.goto(base + "/?select=ORPHA:34515&step=action")
            maria_plan = maria.value.json()
            assert maria_plan["supported"] and maria_plan["demo_data"] is False
            assert maria_plan["disease_id"] == "ORPHA:34515"
            assert maria_plan["groups"] and maria_plan["assets"] and maria_plan["bridges"]
            assert all(b["source_url"] and b["evidence_level"] for b in maria_plan["bridges"])
            plan = page.get_by_label("Action plan")
            expect(plan.get_by_role("link", name="CureLGMD2i", exact=True)).to_be_visible()
            expect(plan.get_by_label("This week")).to_be_in_viewport(ratio=1)
            page.screenshot(path=str(args.out / "maria-fkrp-overview.png"), full_page=True)
            plan.get_by_text("Assumptions", exact=False).click()
            expect(plan.get_by_text("not a measured 10x", exact=False)).to_be_visible()
            report["maria"] = {"groups": len(maria_plan["groups"]), "assets": len(maria_plan["assets"]),
                               "bridges": len(maria_plan["bridges"]), "this_week": maria_plan["this_week"]}
            page.screenshot(path=str(args.out / "maria-fkrp-assumptions.png"), full_page=True)
            with page.expect_response(lambda r: r.url.endswith("/api/action-plan")) as missing:
                page.goto(base + "/?select=OMIM:310200&step=action")
            assert missing.value.json()["supported"] is False
            expect(page.get_by_role("heading", name="No supported route yet")).to_be_visible()
            expect(page.get_by_text("Missing evidence", exact=True)).to_be_visible()
            assert errors == console == [], (errors, console)
            report["runtime_errors"] = 0
            report["unsupported_route"] = True
            (args.out / "tour-report.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
            print("FULL_TOUR_PASS " + json.dumps(report))
        finally:
            browser.close()


if __name__ == "__main__":
    main()
