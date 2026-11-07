"""Compare published data and map density with and without an authenticated session."""
import json
import os
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

session = json.loads(Path(sys.argv[1]).read_text())
origin = session["origin"]
output = Path("work/consistent-views")
output.mkdir(parents=True, exist_ok=True)


def density_snapshot(page):
    return page.locator(".municipal-canvas path[role='button']").evaluate_all(
        "els => els.map(el => ({code:el.dataset.municipality,count:el.dataset.recordCount,fill:getComputedStyle(el).fill}))"
    )


def check_zero_selection(page):
    zero = page.locator(".municipal-canvas path[data-record-count='0']").first
    zero.scroll_into_view_if_needed()
    original = zero.evaluate("el=>getComputedStyle(el).fill")
    # Find a point inside the actual polygon rather than relying on its bounding-box centre.
    location = zero.evaluate("""el=>{
      const box=el.getBBox();
      for(let y=1;y<20;y++)for(let x=1;x<20;x++){
        const p=new DOMPoint(box.x+box.width*x/20,box.y+box.height*y/20);
        if(el.isPointInFill(p)){const screen=p.matrixTransform(el.getScreenCTM());return {x:screen.x,y:screen.y};}
      }
      throw new Error('No se encontró un punto interior del municipio');
    }""")
    page.mouse.move(location["x"], location["y"])
    assert zero.evaluate("el=>getComputedStyle(el).fill") == original, "Hover cambió el color de cantidad"
    page.mouse.move(0, 0)
    zero.focus()
    assert zero.evaluate("el=>getComputedStyle(el).fill") == original, "El foco cambió la cantidad representada"
    zero.press("Enter")
    expect(zero).to_have_attribute("aria-pressed", "true")
    assert zero.evaluate("el=>getComputedStyle(el).fill") == original, "Seleccionar un municipio vacío cambió su relleno"
    assert zero.evaluate("el=>getComputedStyle(el).stroke") == "rgb(3, 58, 165)"
    expect(page.locator(".municipal-selection")).to_contain_text("Municipio seleccionado")
    expect(page.locator(".public-map aside")).to_contain_text("0 registros encontrados")


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
        headless=True, args=["--no-sandbox"],
    )
    public = browser.new_context(viewport={"width": 1360, "height": 1000}, reduced_motion="reduce")
    team = browser.new_context(viewport={"width": 1360, "height": 1000}, reduced_motion="reduce")
    team.add_cookies([{"name": session["name"], "value": session["value"], "url": origin, "httpOnly": True, "sameSite": "Lax"}])
    pages = [public.new_page(), team.new_page()]
    catalog = public.request.get(origin + "/api/public/catalog").json()
    total = sum(len(catalog[key]) for key in ["recipes", "ingredients", "cooks"])
    snapshots = []
    legends = []
    summaries = []
    for label, page in zip(["usuario", "equipo"], pages):
        page.set_default_timeout(20000)
        page.goto(origin + "/", wait_until="networkidle")
        counter = page.get_by_role("button", name=f"Explorar registros totales: {total:,} registros", exact=True)
        expect(counter).to_be_visible()
        summaries.append(page.locator("section[aria-label='Indicadores generales']").inner_text())
        assert "+8.6 pp" not in page.locator("main").inner_text()
        miniature = page.get_by_role("group", name="Mapa municipal de Puebla con 217 áreas geoestadísticas municipales", exact=True)
        expect(miniature.locator("path[role='button']")).to_have_count(217)
        initial_fills = miniature.locator("path[role='button']").evaluate_all("els=>els.map(el=>getComputedStyle(el).fill)")
        empty_municipality = miniature.locator("path[aria-label*=', 0 registros publicados']").first
        empty_municipality.focus()
        empty_municipality.press("Enter")
        expect(empty_municipality).to_have_attribute("aria-pressed", "true")
        assert miniature.locator("path[role='button']").evaluate_all("els=>els.map(el=>getComputedStyle(el).fill)") == initial_fills, "El minimapa cambió la escala al seleccionar un municipio"
        empty_municipality.press("Enter")
        expect(empty_municipality).to_have_attribute("aria-pressed", "false")
        expect(counter).to_be_visible()
        page.goto(origin + "/reportes", wait_until="networkidle")
        expect(page.get_by_role("button", name="Descargar CSV", exact=True)).to_be_visible()
        page.goto(origin + "/mapa", wait_until="networkidle")
        expect(page.locator(".municipal-canvas path[role='button']")).to_have_count(217)
        snapshots.append(density_snapshot(page))
        legends.append(page.locator(".municipal-legend").inner_text())
        check_zero_selection(page)
        page.screenshot(path=str(output / f"mapa-{label}-seleccion.png"), full_page=True)
        page.set_viewport_size({"width": 390, "height": 844})
        assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), label
    assert summaries[0] == summaries[1], "Entrar a sesión cambió los indicadores del acervo publicado"
    assert snapshots[0] == snapshots[1], "Los municipios cambiaron de cantidad o color al iniciar sesión"
    assert legends[0] == legends[1], "La leyenda no coincide entre usuario y equipo"

    # An empty real catalog must stay empty after login; no example totals may take its place.
    empty = {key: [] for key in ["recipes", "ingredients", "cooks", "episodes", "markets", "timeline", "relations"]}
    for page in pages:
        page.route("**/api/public/catalog", lambda route: route.fulfill(status=200, json=empty))
        page.goto(origin + "/", wait_until="networkidle")
        expect(page.get_by_role("button", name="Explorar registros totales: 0 registros", exact=True)).to_be_visible()
        expect(page.get_by_role("status").filter(has_text="Aún no hay fichas publicadas")).to_be_visible()
        page.goto(origin + "/mapa", wait_until="networkidle")
        expect(page.locator(".municipal-canvas path[data-record-count='0']")).to_have_count(217)
        assert len({row["fill"] for row in density_snapshot(page)}) == 1
        check_zero_selection(page)
    public.close()
    team.close()
    browser.close()
    print("Usuario y equipo: mismos totales reales, mapa y leyenda; selección, foco y hover conservan el relleno, incluso con cero publicaciones.")
