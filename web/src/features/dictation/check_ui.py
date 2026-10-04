"""Browser acceptance for dictation and shared diagnosis findings."""

import argparse
import tempfile
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--url", default="http://127.0.0.1:8770")
parser.add_argument("--output", type=Path, default=Path(tempfile.gettempdir()) / "hack-017-dictation")
args = parser.parse_args()
args.output.mkdir(parents=True, exist_ok=True)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, args=["--enable-unsafe-swiftshader"])
    errors = []
    try:
        def visit(width=1280, height=720):
            page = browser.new_page(viewport={"width": width, "height": height}, reduced_motion="reduce")
            page.on("pageerror", lambda error: errors.append(str(error)))
            page.goto(args.url)
            page.wait_for_load_state("networkidle")
            return page

        def panel(page):
            return page.get_by_role("region", name="Dictation")

        def chips(page):
            return panel(page).get_by_role("button", name="Remove", exact=False)

        def sample(page):
            page.get_by_role("button", name="Play sample case", exact=True).click()
            expect(chips(page)).to_have_count(5, timeout=20000)
            expect(page.get_by_role("button", name="Yes", exact=True)).to_be_enabled(timeout=20000)
            page.wait_for_load_state("networkidle")

        for width, height in [(1280, 720), (1440, 900)]:
            page = visit(width, height)
            console = []
            page.on("console", lambda message: console.append(message.text) if message.type == "error" else None)
            sample(page)
            expect(panel(page)).to_be_in_viewport(ratio=1)
            # Every chip must be reachable above the diagnosis footer after internal scrolling.
            for chip in chips(page).all():
                chip.scroll_into_view_if_needed()
                assert chip.evaluate("el => {const b=el.getBoundingClientRect();return el.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2))}")
            assert panel(page).get_by_role("button", name=": mark present", exact=False).count() == 2
            page.screenshot(path=str(args.output / f"dictation-{width}.png"), full_page=True)
            with page.expect_response(lambda r: r.url.endswith("/api/diagnose")) as answered:
                page.get_by_role("button", name="Yes", exact=True).click()
            terms = answered.value.request.post_data_json["terms"]
            assert len(terms) == 6
            new_term = next(t for t in terms if t["hpo_id"] == "HP:0002913")
            expect(chips(page)).to_have_count(6)
            expect(page.get_by_role("button", name="Yes", exact=True)).to_be_enabled(timeout=20000)
            chip = panel(page).get_by_role("button", name="Reduced maximal inspiratory pressure: negate", exact=True)
            chip.focus()
            with page.expect_response(lambda r: r.url.endswith("/api/diagnose")) as edited:
                chip.press("Space")
            assert len(edited.value.request.post_data_json["terms"]) == 6
            assert new_term in edited.value.request.post_data_json["terms"]
            expect(page.get_by_role("button", name="Yes", exact=True)).to_be_enabled(timeout=20000)
            with page.expect_response(lambda r: r.url.endswith("/api/diagnose")) as removed:
                panel(page).get_by_role("button", name="Remove Cardiomegaly", exact=True).click()
            assert len(removed.value.request.post_data_json["terms"]) == 5
            assert new_term in removed.value.request.post_data_json["terms"]
            expect(page.get_by_role("button", name="Yes", exact=True)).to_be_enabled(timeout=20000)
            page.get_by_role("button", name="Clear findings", exact=True).click()
            expect(chips(page)).to_have_count(0)
            page.get_by_role("button", name="Load published sample").click()
            expect(chips(page)).to_have_count(5)
            expect(panel(page)).to_contain_text("published adult case")
            panel(page).get_by_role("button", name="Clear", exact=True).click()
            expect(chips(page)).to_have_count(0)
            expect(page.get_by_role("meter")).to_have_count(0)
            expect(panel(page)).to_contain_text("Speak, or play")
            assert console == [], console
            page.close()

        page = visit()
        page.route("**/api/transcribe/session", lambda route: route.fulfill(json={"usable": False, "model": "controlled unavailable", "client_secret": ""}))
        page.add_init_script("window.micCalls=0; navigator.mediaDevices.getUserMedia=async()=>{window.micCalls++;throw new Error('must not request mic')}")
        page.reload()
        page.wait_for_load_state("networkidle")
        panel(page).get_by_role("button", name="Start dictation").click()
        expect(panel(page)).to_contain_text("Live dictation is off")
        assert page.evaluate("window.micCalls") == 0
        page.close()

        # Controlled WebRTC failures must release captured audio and the connection.
        for failure in ["offer", "http"]:
            page = visit()
            page.route("**/api/transcribe/session", lambda route: route.fulfill(json={"usable": True, "model": "controlled test", "client_secret": "controlled-test"}))
            page.route("https://api.openai.com/v1/realtime/calls", lambda route: route.fulfill(status=503, body="controlled test"))
            page.add_init_script("""
                window.stops=0; window.closes=0;
                const track={stop:()=>window.stops++};
                navigator.mediaDevices.getUserMedia=async()=>({getTracks:()=>[track],getAudioTracks:()=>[track]});
                window.RTCPeerConnection=class {
                    addTrack(){} close(){window.closes++}
                    createDataChannel(){return {addEventListener(){},close(){},readyState:'open',send(){}}}
                    async setLocalDescription(){}
                    async createOffer(){FAIL_OFFER; return {sdp:'controlled test'}}
                };
            """.replace("FAIL_OFFER", "throw new Error('controlled test')" if failure == "offer" else ""))
            page.reload()
            page.wait_for_load_state("networkidle")
            panel(page).get_by_role("button", name="Start dictation").click()
            expect(panel(page)).to_contain_text("Live dictation could not start")
            assert page.evaluate("window.stops === 1 && window.closes === 1")
            page.close()

        # A transient sample download failure must be recoverable on the next click.
        page = visit()
        page.route("**/*pompe_case*.json", lambda route: route.fulfill(status=503, body="controlled failure"))
        page.get_by_role("button", name="Play sample case", exact=True).click()
        expect(panel(page)).to_contain_text("sample case could not load")
        page.unroute("**/*pompe_case*.json")
        sample(page)
        page.close()

        page = visit()
        page.route("**/api/symptoms/extract", lambda route: route.fulfill(status=503, json={"detail": "controlled failure"}))
        sample(page)
        expect(page.get_by_text("Sample case", exact=True)).to_be_visible()
        page.close()
        assert errors == [], errors

        # Clearing findings must also invalidate an extraction that completes later.
        page = visit()
        held = []

        def hold_final(route):
            if "match these findings?" in route.request.post_data_json["transcript"]:
                held.append((route, route.fetch()))
            else:
                route.continue_()

        page.route("**/api/symptoms/extract", hold_final)
        page.get_by_role("button", name="Play sample case", exact=True).click()
        expect(chips(page)).to_have_count(5, timeout=20000)
        expect(page.get_by_role("button", name="Yes", exact=True)).to_be_enabled(timeout=20000)
        assert len(held) == 1
        page.get_by_role("button", name="Clear findings", exact=True).click()
        held[0][0].fulfill(response=held[0][1])
        page.wait_for_load_state("networkidle")
        expect(chips(page)).to_have_count(0)
        expect(page.get_by_role("meter")).to_have_count(0)
        page.close()
        assert errors == [], errors
        print("DICTATION_PASS: shared Yes/edit/remove/Clear; all chips reachable1280/1440; keyboard/reduced; no-mic fallback and WebRTC cleanup; sample retry/API503; runtime errors0")
    finally:
        browser.close()
