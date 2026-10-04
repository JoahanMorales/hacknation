"""Exercise diagnosis UI against a running built app, including controlled failures."""

import argparse
import re
import tempfile
from copy import deepcopy
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

# HACK-032: el shell de HACK-028 ya no tiene "Load published sample"; la muestra entra por el dictado.
SAMPLE = re.compile(r"(Play|Restart) sample case")

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:8768")
parser.add_argument(
    "--output", type=Path, default=Path(tempfile.gettempdir()) / "hack-018-diagnosis"
)
args = parser.parse_args()
args.output.mkdir(exist_ok=True, parents=True)


def endpoint(name):
    return lambda response: response.url.endswith("/api/" + name)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    runtime_errors = []
    try:

        def complete(name):
            def match(response):
                if not endpoint(name)(response):
                    return False
                body = response.request.post_data_json or {}
                return len(body.get("terms", [])) == 5

            return match

        def visit():
            page = browser.new_page(viewport={"width": 1440, "height": 900})
            page.on("pageerror", lambda error: runtime_errors.append(str(error)))
            page.goto(args.url)
            page.wait_for_load_state("networkidle")
            expect(
                page.get_by_role("button", name=SAMPLE)
            ).to_be_visible()
            # HACK-032: en el shell nuevo el aviso aparece junto con los resultados (se comprueba en load).
            return page

        def load(page):
            # El dictado de la muestra extrae por tramos: se espera la respuesta con los 5 términos completos.
            with (
                page.expect_response(complete("diagnose"), timeout=60000) as diagnosis,
                page.expect_response(complete("next-question"), timeout=60000) as question,
            ):
                page.get_by_role("button", name=SAMPLE).click()
            assert diagnosis.value.status == question.value.status == 200
            result, asked = diagnosis.value.json(), question.value.json()
            expect(page.get_by_role("button", name="Yes", exact=True)).to_be_enabled()
            expect(
                page.get_by_text("Phenotype match · not a diagnosis", exact=True)
            ).to_be_visible()
            return result, asked

        def check_meters(page, result):
            expect(page.get_by_role("meter")).to_have_count(2)
            for i, candidate in enumerate(result["ranking"][:2]):
                expect(page.get_by_role("meter").nth(i)).to_have_attribute(
                    "aria-valuenow", format(candidate["pct"], ".15g")
                )
                expect(
                    page.get_by_role(
                        "button", name="Inspect " + candidate["name"], exact=True
                    )
                ).to_be_visible()
            assert page.locator(".cn-diagnosis-driver").count() == sum(
                len(c["drivers"]) for c in result["ranking"][:2]
            )

        page = visit()
        console_errors = []
        page.on(
            "console",
            lambda message: (
                console_errors.append(message.text) if message.type == "error" else None
            ),
        )
        result, question = load(page)
        assert result["demo_data"] is False and result["total_diseases"] == 12867
        assert result["terms_used"] == 5 and len(result["ranking"]) == 10
        check_meters(page, result)
        for width, height in [(1440, 900), (1280, 720)]:
            page.set_viewport_size({"width": width, "height": height})
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            assert page.evaluate("document.documentElement.scrollHeight <= innerHeight")
            expect(
                page.get_by_role("button", name="Yes", exact=True)
            ).to_be_in_viewport()
            expect(
                page.get_by_text("Phenotype match · not a diagnosis", exact=True)
            ).to_be_in_viewport()
            page.screenshot(
                path=str(args.output / f"diagnosis-{width}.png"), full_page=True
            )
        page.set_viewport_size({"width": 1440, "height": 900})
        page.locator("summary").click()
        expect(page.locator("details")).to_have_attribute("open", "")
        expect(page.locator("details")).to_contain_text(result["range_kind"])
        page.locator("summary").click()

        for choice, present in [("Yes", True), ("No", False)]:
            if not present:
                page.get_by_role("button", name="Clear findings").click()
                result, question = load(page)
                page.emulate_media(reduced_motion="reduce")
            with (
                page.expect_response(endpoint("diagnose")) as changed,
                page.expect_response(endpoint("next-question")) as asked,
            ):
                page.get_by_role("button", name=choice, exact=True).click()
            payload = changed.value.request.post_data_json
            assert len(payload["terms"]) == 6
            assert len({term["hpo_id"] for term in payload["terms"]}) == 6
            added = next(
                term
                for term in payload["terms"]
                if term["hpo_id"] == question["hpo_id"]
            )
            assert added["present"] is present and added["label"] == question["label"]
            updated = changed.value.json()
            check_meters(page, updated)
            assert updated["ranking"] != result["ranking"]
            assert asked.value.json()["hpo_id"] != question["hpo_id"]
        selected = page.get_by_role(
            "button", name="Inspect " + updated["ranking"][0]["name"], exact=True
        )
        selected.click()
        expect(selected).to_have_attribute("aria-pressed", "true")
        page.keyboard.press("Tab")
        assert page.locator(":focus-visible").count() == 1
        assert console_errors == [], console_errors
        page.close()

        # Expected HTTP failures must keep the findings and offer recovery.
        page = visit()
        failed = []

        def fail(route):
            failed.append(len(route.request.post_data_json["terms"]))
            route.fulfill(status=503, json={"detail": "controlled failure"})

        page.route("**/api/diagnose", fail)
        page.get_by_role("button", name=SAMPLE).click()
        # El caso de ejemplo se teclea y extrae por tramos: el primer diagnose (503) tarda más de 5 s,
        # y se reintenta cuando el dictado ya entregó los 5 términos.
        expect(page.get_by_role("alert")).to_contain_text("Your findings are kept", timeout=60000)
        for _ in range(120):
            if failed and failed[-1] == 5:
                break
            page.wait_for_timeout(500)
        expect(page.get_by_role("meter")).to_have_count(0)
        page.unroute("**/api/diagnose")
        with (
            page.expect_response(endpoint("diagnose")) as recovered,
            page.expect_response(endpoint("next-question")),
        ):
            page.get_by_role("button", name="Try again").click()
        assert len(recovered.value.request.post_data_json["terms"]) == 5
        check_meters(page, recovered.value.json())
        page.close()

        page = visit()
        page.route(
            "**/api/next-question",
            lambda route: route.fulfill(
                status=503, json={"detail": "controlled failure"}
            ),
        )
        page.get_by_role("button", name=SAMPLE).click()
        expect(page.get_by_role("alert")).to_contain_text("The matches are available", timeout=60000)
        expect(page.get_by_role("meter")).to_have_count(2)
        page.unroute("**/api/next-question")
        page.get_by_role("button", name="Retry question").click()
        expect(page.get_by_role("button", name="Yes", exact=True)).to_be_enabled()
        page.close()

        page = visit()
        unsupported = deepcopy(question)
        unsupported.update(
            hpo_id=None,
            label=None,
            question="No supported question separates these candidates.",
        )
        page.route(
            "**/api/next-question", lambda route: route.fulfill(json=unsupported)
        )
        page.get_by_role("button", name=SAMPLE).click()
        expect(page.get_by_text(unsupported["question"], exact=True)).to_be_visible(timeout=60000)
        expect(page.get_by_role("button", name="Yes", exact=True)).to_have_count(0)
        expect(page.get_by_role("meter")).to_have_count(2)
        page.close()

        # Resolve a held response after clearing: it must never restore old matches.
        page = visit()
        held = []
        page.route("**/api/diagnose", lambda route: held.append(route))
        page.get_by_role("button", name=SAMPLE).click()
        # El ejemplo se teclea: se espera a que termine y a que no lleguen más términos.
        expect(page.get_by_text("Playing sample case")).to_be_visible(timeout=10000)
        expect(page.get_by_text("Playing sample case")).to_have_count(0, timeout=90000)
        count = -1
        while count != len(held):
            count = len(held)
            page.wait_for_timeout(1500)
        assert len(held) >= 1
        expect(
            page.get_by_role("status").filter(has_text="Loading evidence")
        ).to_be_attached()
        page.get_by_role("button", name="Clear findings").click()
        for route in held:
            route.fulfill(json=result)
        page.wait_for_load_state("networkidle")
        expect(page.get_by_role("button", name=SAMPLE)).to_be_visible()
        expect(page.get_by_role("meter")).to_have_count(0)
        page.close()

        # The action scene owns the footer: diagnosis must not push it off screen.
        for width, height in [(1280, 720), (1440, 900)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            page.on("pageerror", lambda error: runtime_errors.append(str(error)))
            page.goto(args.url + "/?select=ORPHA:34515&step=action")
            page.wait_for_load_state("networkidle")
            plan = page.get_by_label("Action plan")
            expect(
                plan.get_by_role("heading", name="Who is already working on this")
            ).to_be_visible()
            expect(page.get_by_test_id("diagnosis")).to_have_count(0)
            expect(plan).to_be_in_viewport(ratio=1)
            expect(
                plan.get_by_label("This week").get_by_role("link", name="Open")
            ).to_be_in_viewport()
            page.screenshot(
                path=str(args.output / f"action-{width}.png"), full_page=True
            )
            page.close()
        assert runtime_errors == [], runtime_errors
        print(
            f"DIAGNOSIS_PASS: real API values, Yes/No findings, selection, ranges, 1440/1280 screenshots, keyboard, reduced motion, recovery, unsupported question, stale response, action footer fits; screenshots={args.output}"
        )
    finally:
        browser.close()
