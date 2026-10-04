"""Browser acceptance against Vite + the real search API; no microphone, camera or paid calls.

Use --url for Vite (the shared store is inspected through its development module).
Screenshots/report are saved under --out. Error and delayed responses are controlled test cases.
"""
import argparse
import asyncio
import json
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from playwright.async_api import Error as PlaywrightError
from playwright.async_api import async_playwright, expect

STORE = """async () => {
  const {useStore} = await import('/src/lib/store.ts');
  const s = useStore.getState();
  return {step:s.step, selectedId:s.selectedId, terms:s.terms, transcript:s.transcript, ranking:s.ranking};
}"""


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--url', default='http://127.0.0.1:5174')
    parser.add_argument('--out', default='.cache/search-qa')
    args = parser.parse_args()
    output = Path(args.out)
    output.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(args=['--enable-unsafe-swiftshader'])
        try:
            page = await browser.new_page(viewport={'width': 1280, 'height': 720}, reduced_motion='reduce')
            errors = []
            cancelled_responses = []
            page.on('pageerror', lambda error: errors.append(str(error)))
            await page.goto(args.url, wait_until='networkidle')
            box = page.get_by_role('combobox', name='Search the atlas')
            await expect(box).to_be_visible()
            await page.evaluate('() => new Promise(requestAnimationFrame)')
            await page.keyboard.press('/')
            await expect(box).to_be_focused()
            await expect(page.get_by_text('Start with a disease', exact=False)).to_be_visible()
            await page.evaluate("""() => {
              const dialog=document.createElement('div'); dialog.id='acceptance-dialog';
              dialog.setAttribute('role','dialog'); dialog.setAttribute('aria-modal','true');
              const button=document.createElement('button'); button.textContent='Controlled modal';
              dialog.append(button); document.body.append(dialog); button.focus();
            }""")
            await page.keyboard.press('/')
            assert not await box.evaluate('element => element === document.activeElement'), 'Do not steal focus from a modal'
            await page.evaluate("document.getElementById('acceptance-dialog').remove()")
            await box.focus()
            await page.evaluate("""async () => {
              const {useStore} = await import('/src/lib/store.ts');
              window.__acceptanceStore = useStore;
              useStore.setState({transcript:'Case preserved', terms:[{hpo_id:'HP:0003236',label:'Elevated CK',present:false}],
                ranking:[{disease_id:'ORPHA:34515',name:'FKRP',pct:42,low:35,high:49}]});
            }""")
            await page.wait_for_function("()=>{const r=window.__acceptanceStore.getState().ranking;return r.length > 0 && r[0].pct !== 42}")
            await page.wait_for_load_state('networkidle')
            original = await page.evaluate(STORE)

            async def search(query):
                await box.fill(query)
                await expect(page.get_by_role('listbox')).to_have_attribute('aria-busy', 'false')

            await search('LGMD2I')
            await expect(page.get_by_role('option').first).to_contain_text('Matched: LGMD2I')
            await box.press('Enter')
            snapshot = await page.evaluate(STORE)
            assert snapshot['step'] == 'inspector' and snapshot['selectedId'] == 'ORPHA:34515', snapshot
            for field in ('terms', 'transcript', 'ranking'):
                assert snapshot[field] == original[field], {"field":field,"before":original[field],"after":snapshot[field]}
            assert await box.get_attribute('aria-expanded') == 'false'

            checks = [('FKRP', 'Genes', 'pathway'), ('ribitol', 'Mechanisms', 'pathway'),
                      ('CureLGMD2i', 'Patient communities', 'action'), ('NCT04001595', 'Registries and studies', 'action')]
            for query, group, step in checks:
                await search(query)
                option = page.get_by_role('group', name=group, exact=True).get_by_role('option').first
                identifier = await option.locator('.atlas-search-id').inner_text()
                response = await page.request.get(args.url + '/api/search', params={'q': query, 'limit': 30})
                result = next(r for r in (await response.json())['results'] if r['id'] == identifier)
                await option.click()
                snapshot = await page.evaluate(STORE)
                assert snapshot['step'] == step and snapshot['selectedId'] == result['disease_ids'][0]
                assert snapshot['terms'] == original['terms'] and snapshot['transcript'] == original['transcript']

            await search('elevated CK')
            await page.get_by_role('group', name='Symptoms', exact=True).get_by_role('option').first.click()
            snapshot = await page.evaluate(STORE)
            assert snapshot['terms'] == original['terms'], 'Searching an absent finding must not negate it again'
            assert snapshot['step'] == 'dictation'
            await page.evaluate("""async()=>{const{useStore}=await import('/src/lib/store.ts');useStore.getState().setTerms([])}""")
            await box.focus()
            await search('HP:0003236')
            await box.press('Enter')
            snapshot = await page.evaluate(STORE)
            assert len(snapshot['terms']) == 1 and snapshot['terms'][0]['present'] is True

            await search('FKRP')
            first = await box.get_attribute('aria-activedescendant')
            await box.press('ArrowDown')
            assert await box.get_attribute('aria-activedescendant') != first
            await box.press('ArrowUp')
            assert await box.get_attribute('aria-activedescendant') == first
            await box.press('Escape')
            await expect(page.get_by_role('listbox')).to_have_count(0)
            await box.fill('FKRP')
            await box.press('/')
            assert await box.input_value() == 'FKRP/', 'Shortcut must leave editable fields alone'

            await search('zzzzzzzzzzzzzzzz')
            await expect(page.get_by_text('No results.', exact=False)).to_be_visible()
            fail = {'enabled': True}

            async def outage(route):
                if fail['enabled']:
                    await route.fulfill(status=503, json={'detail': 'Controlled acceptance outage'})
                else:
                    await route.continue_()

            await page.route('**/api/search?**', outage)
            await box.fill('Pompe')
            await expect(page.get_by_role('alert')).to_contain_text('Your findings are saved')
            fail['enabled'] = False
            await page.get_by_role('button', name='Retry search').click()
            await expect(page.get_by_role('option').first).to_contain_text('Pompe')
            await page.unroute('**/api/search?**', outage)

            async def delayed(route):
                query = parse_qs(urlsplit(route.request.url).query).get('q', [''])[0]
                if query == 'Pompe':
                    response = await route.fetch()
                    await asyncio.sleep(.8)
                    try:
                        await route.fulfill(response=response)
                    except PlaywrightError as error:
                        cancelled_responses.append(str(error))  # Cancellation is expected after changing/clearing.
                else:
                    await route.continue_()

            await page.route('**/api/search?**', delayed)
            await box.fill('Pompe')
            await page.wait_for_timeout(250)
            await box.fill('FKRP')
            await expect(page.get_by_role('group', name='Genes', exact=True)).to_be_visible()
            await page.wait_for_timeout(1000)
            assert 'Pompe' not in await page.get_by_role('listbox').inner_text()
            await box.fill('Pompe')
            await page.wait_for_timeout(250)
            await page.get_by_role('button', name='Clear atlas search').click()
            await page.wait_for_timeout(1000)
            assert await page.get_by_role('option').count() == 0
            await page.unroute('**/api/search?**', delayed)

            async def missing(route):
                await route.fulfill(status=404, json={'detail': 'Controlled missing endpoint'})

            await page.route('**/api/search?**', missing)
            await search('CureLGMD2i')
            await expect(page.locator('.atlas-search-sample')).to_contain_text('Sample case')
            await expect(page.get_by_role('option').first).to_contain_text('CureLGMD2i')
            await search('FKRP')
            await expect(page.get_by_role('option').first).to_contain_text('FKRP')
            await expect(page.get_by_role('group', name='Genes', exact=True)).to_be_visible()
            assert await page.get_by_role('option').first.locator('.atlas-search-id').inner_text() == 'FKRP'
            await page.unroute('**/api/search?**', missing)

            await search('LGMD2I')
            await box.press('Enter')
            await search('FKRP')
            await page.screenshot(path=str(output / 'search-1280.png'))
            popup = await page.locator('.atlas-search-popup').bounding_box()
            search_box = await page.locator('.atlas-search-input').bounding_box()
            gestures = await page.get_by_role('button', name='Gestures', exact=True).bounding_box()

            def overlaps(a, b):
                return bool(a and b and a['x'] < b['x']+b['width'] and a['x']+a['width'] > b['x']
                            and a['y'] < b['y']+b['height'] and a['y']+a['height'] > b['y'])

            panels = [await panel.bounding_box() for panel in await page.locator('.cn-panel').all()]
            panel_overlap = any(overlaps(popup, panel) for panel in panels)
            gesture_overlap = overlaps(search_box, gestures)
            header_overlap = overlaps(search_box, await page.locator('main > div > header').bounding_box())
            await page.get_by_role('button', name='Gesture guide', exact=True).click()
            await expect(page.locator('[aria-label="How to use gestures"]')).to_be_visible()
            await box.focus()
            await expect(page.get_by_role('listbox')).to_be_visible()
            await page.screenshot(path=str(output / 'search-guide-1280.png'))
            guide_overlap = overlaps(await page.locator('.atlas-search-popup').bounding_box(),
                                     await page.locator('[aria-label="How to use gestures"]').bounding_box())
            assert popup and popup['x'] >= 0 and popup['x']+popup['width'] <= 1280 and popup['y']+popup['height'] <= 720
            assert not errors, errors
            report = {'six_type_routes': True, 'preserves_case_and_negation': True, 'keyboard': True,
                      'empty_error_retry_sample': True, 'stale_and_clear': True, 'modal_focus_preserved': True, 'runtime_errors': errors,
                      'cancelled_response_count': len(cancelled_responses),
                      'panel_overlap': panel_overlap, 'gesture_overlap': gesture_overlap, 'header_overlap': header_overlap,
                      'guide_overlap': guide_overlap, 'viewport': [1280, 720]}
            (output / 'report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
            assert not panel_overlap, 'Search results overlap a clinical panel'
            assert not gesture_overlap, 'Existing gestures toggle overlaps search; coordinate with its owner'
            assert not header_overlap, 'Search must leave the journey and sample badge visible'
            assert not guide_overlap, 'Gesture guide overlaps search results; coordinate with its owner'
            print('SEARCH_UI_PASS six routes, keyboard, negation, empty/error/retry/sample, stale/clear, bounds1280')
        finally:
            await browser.close()


if __name__ == '__main__':
    asyncio.run(main())
