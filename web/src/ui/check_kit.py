"""Browser acceptance for the public kit; run against a built, running app."""

import argparse
import tempfile
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:8765")
parser.add_argument(
    "--output", type=Path, default=Path(tempfile.gettempdir()) / "hack-005-kit"
)
args = parser.parse_args()
out = args.output
out.mkdir(exist_ok=True)


def rgb(value):
    value = value.lstrip("#")
    return [int(value[i : i + 2], 16) for i in (0, 2, 4)]


def luminance(color):
    channels = [c / 255 for c in color]
    channels = [
        c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in channels
    ]
    return sum(c * w for c, w in zip(channels, (0.2126, 0.7152, 0.0722)))


def contrast(a, b):
    a, b = sorted([luminance(a), luminance(b)])
    return (b + 0.05) / (a + 0.05)


ratios = []
for color in [
    "#eef4f9",
    "#9fb4c9",
    "#8ec5fc",
    "#5ed3d0",
    "#b3a6f2",
    "#ee9cbf",
    "#a6d18c",
    "#e8b46c",
    "#a9b8c7",
]:
    # Cielo oscuro (Ola 3): controles #12365c y panel de vidrio marino al 62% sobre el fondo #071d35.
    for bg in [rgb("#12365c"), [0.62 * a + 0.38 * c for a, c in zip(rgb("#0b2a4a"), rgb("#071d35"))]]:
        ratios.append(contrast(rgb(color), bg))
assert min(ratios) >= 4.5, min(ratios)
assert contrast(rgb("#0b2a4a"), rgb("#8ec5fc")) >= 4.5
assert contrast(rgb("#5f7c9a"), rgb("#071d35")) >= 3

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    try:
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors = []
        page.on("pageerror", lambda error: errors.append(str(error)))
        page.on(
            "console",
            lambda message: (
                errors.append(message.text) if message.type == "error" else None
            ),
        )
        page.goto(args.url.rstrip("/") + "/?ui=kit")
        page.wait_for_load_state("networkidle")
        expect(
            page.get_by_role("heading", name="Symptoms, matches and evidence.")
        ).to_be_visible()
        expect(page.get_by_text("Sample case", exact=True)).to_be_visible()
        assert page.locator(".cn-kit-sky circle").count() == 300
        assert page.get_by_role("meter").get_attribute("aria-valuenow") == "3.751068"
        for label in ["Observed", "Inferred", "Hypothesis", "Contradicted"]:
            assert page.get_by_text(label, exact=True).count() >= 1
        page.keyboard.press("Tab")
        assert page.locator(":focus-visible").count() == 1
        assert (
            page.locator(":focus-visible").evaluate(
                "(e) => getComputedStyle(e).outlineStyle"
            )
            == "solid"
        )
        page.keyboard.press("Tab")
        expect(page.get_by_role("button", name="Reset sample")).to_be_focused()
        page.keyboard.press("Enter")
        term = "Cardiomyopathy"
        toggle = page.get_by_role("button", name=f"no {term}: mark present", exact=True)
        expect(toggle).to_have_attribute("aria-pressed", "false")
        toggle.click()
        expect(
            page.get_by_role("button", name=f"{term}: negate", exact=True)
        ).to_have_attribute("aria-pressed", "true")
        expect(page.get_by_role("status")).to_contain_text(
            "API match example stays fixed"
        )
        page.get_by_role("button", name=f"Remove {term}", exact=True).click()
        assert page.locator(".cn-chip").count() == 4
        page.get_by_role("button", name="Reset sample").click()
        assert page.locator(".cn-chip").count() == 5
        page.get_by_role("button", name="Clear symptoms").click()
        expect(page.get_by_role("button", name="Load sample")).to_be_visible()
        page.get_by_role("button", name="Load sample").click()
        page.get_by_role("button", name="loading", exact=True).click()
        expect(
            page.get_by_role("status").filter(has_text="Loading evidence")
        ).to_be_attached()
        assert page.locator(".cn-skeleton span").count() == 3
        page.get_by_role("button", name="empty", exact=True).click()
        expect(page.get_by_role("button", name="Load sample")).to_be_visible()
        page.get_by_role("button", name="error", exact=True).click()
        expect(page.get_by_role("alert")).to_have_text("Evidence could not be loaded.")
        page.get_by_role("button", name="Try again").click()
        assert page.locator(".cn-chip").count() == 5
        page.locator("summary").click()
        expect(page.locator("details")).to_have_attribute("open", "")
        page.locator("summary").click()
        expect(page.get_by_role("button", name="Loading example")).to_be_disabled()
        for width, height in [(1440, 900), (1280, 720), (375, 812)]:
            page.set_viewport_size({"width": width, "height": height})
            assert page.evaluate(
                "document.documentElement.scrollWidth <= innerWidth"
            ), width
            if width >= 1280:
                assert page.evaluate(
                    "document.documentElement.scrollHeight <= innerHeight"
                ), (width, page.evaluate("document.documentElement.scrollHeight"))
            page.screenshot(path=str(out / f"kit-{width}.png"), full_page=True)
        page.emulate_media(reduced_motion="reduce", color_scheme="light")
        assert (
            page.locator(".cn-button").first.evaluate(
                "(e) => getComputedStyle(e).transitionDuration"
            )
            == "0s"
        )
        assert (
            page.locator("body").evaluate("(e) => getComputedStyle(e).backgroundColor")
            == "rgb(7, 29, 53)"
        )
        page.goto(args.url.rstrip("/") + "/")
        page.wait_for_load_state("networkidle")
        assert page.locator(".cn-kit").count() == 0
        assert errors == [], errors
        print(
            f"KIT_PASS: chips, 4 panel states, evidence, meter, keyboard, reduced motion, normal shell; contrast min={min(ratios):.2f}:1; screenshots={out}"
        )
    finally:
        browser.close()
