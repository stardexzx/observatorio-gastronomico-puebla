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


INTERIOR_POINT = """el=>{
      const box=el.getBBox();
      for(let y=1;y<20;y++)for(let x=1;x<20;x++){
        const p=new DOMPoint(box.x+box.width*x/20,box.y+box.height*y/20);
        if(el.isPointInFill(p)&&!el.isPointInStroke(p)){
          const screen=p.matrixTransform(el.getScreenCTM());
          if(document.elementFromPoint(screen.x,screen.y)===el)return {x:screen.x,y:screen.y};
        }
      }
      throw new Error('No se encontró un punto interior del municipio');
    }"""


def check_zero_selection(page):
    zero = page.locator(".municipal-canvas path[data-record-count='0']").first
    zero.scroll_into_view_if_needed()
    original = zero.evaluate("el=>getComputedStyle(el).fill")
    # Find a point inside the actual polygon rather than relying on its bounding-box centre.
    location = zero.evaluate(INTERIOR_POINT)
    page.mouse.move(location["x"], location["y"])
    expect(zero).to_have_css("fill", "rgb(196, 90, 50)")
    page.mouse.move(0, 0)
    expect(zero).to_have_css("fill", original)
    zero.focus()
    expect(zero).to_have_css("fill", "rgb(196, 90, 50)")
    zero.evaluate("el=>el.blur()")
    expect(zero).to_have_css("fill", original)
    # Selection from the dropdown must fill the whole shape even without hover or focus.
    code = zero.get_attribute("data-municipality")
    page.get_by_label("Municipio del mapa", exact=True).select_option(code)
    expect(zero).to_have_attribute("aria-pressed", "true")
    expect(zero).to_have_css("fill", "rgb(196, 90, 50)")
    assert zero.evaluate("el=>getComputedStyle(el).stroke") == "rgb(3, 58, 165)"
    expect(page.locator(".municipal-selection")).to_contain_text("Municipio seleccionado")
    expect(page.locator(".public-map aside")).to_contain_text("0 registros encontrados")
    expect(zero).to_have_attribute("data-record-count", "0")
    # Keyboard deselection restores density after focus leaves the municipality.
    zero.focus()
    zero.press("Enter")
    expect(zero).to_have_attribute("aria-pressed", "false")
    zero.evaluate("el=>el.blur()")
    expect(zero).to_have_css("fill", original)
    zero.scroll_into_view_if_needed()
    location = zero.evaluate(INTERIOR_POINT)
    page.mouse.click(location["x"], location["y"])
    expect(zero).to_have_attribute("aria-pressed", "true")
    page.mouse.move(0, 0)
    zero.evaluate("el=>el.blur()")
    expect(zero).to_have_css("fill", "rgb(196, 90, 50)")


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
    total = sum(len(catalog[key]) for key in ["recipes", "ingredients", "cooks", "markets"])
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
        mini_index = empty_municipality.evaluate("el=>Array.from(el.ownerSVGElement.querySelectorAll('path[role=button]')).indexOf(el)")
        empty_municipality.focus()
        expect(empty_municipality).to_have_css("fill", "rgb(196, 90, 50)")
        empty_municipality.press("Enter")
        expect(empty_municipality).to_have_attribute("aria-pressed", "true")
        expect(empty_municipality).to_have_css("fill", "rgb(196, 90, 50)")
        selected_fills = initial_fills.copy()
        selected_fills[mini_index] = "rgb(196, 90, 50)"
        assert miniature.locator("path[role='button']").evaluate_all("els=>els.map(el=>getComputedStyle(el).fill)") == selected_fills, "La selección cambió los colores de otros municipios"
        empty_municipality.press("Enter")
        expect(empty_municipality).to_have_attribute("aria-pressed", "false")
        empty_municipality.evaluate("el=>el.blur()")
        expect(empty_municipality).to_have_css("fill", initial_fills[mini_index])
        assert miniature.locator("path[role='button']").evaluate_all("els=>els.map(el=>getComputedStyle(el).fill)") == initial_fills
        expect(counter).to_be_visible()
        market_routes = ["/mercados", "/mercados/ficha-pendiente"]
        if label == "equipo":
            market_routes += ["/admin/mercados", "/admin/mercados/nueva", "/admin/mercados/ficha-pendiente"]
        for route in market_routes:
            page.goto(origin + route, wait_until="networkidle")
            expect(page.locator("main")).to_contain_text("Próximamente, mercados y tianguis")
            expect(page.locator("main form")).to_have_count(0)
            expect(page.locator("main .legacy-module")).to_have_count(0)
            expect(page.get_by_role("button", name="Nuevo mercado", exact=True)).to_have_count(0)
        page.goto(origin + "/reportes", wait_until="networkidle")
        expect(page.get_by_role("button", name="Descargar CSV", exact=True)).to_be_visible()
        page.goto(origin + "/mapa", wait_until="networkidle")
        expect(page.locator(".municipal-canvas path[role='button']")).to_have_count(217)
        snapshots.append(density_snapshot(page))
        allowed_blues = {"rgb(237, 243, 245)", "rgb(200, 223, 228)", "rgb(141, 188, 198)", "rgb(67, 134, 154)", "rgb(22, 79, 112)", "rgb(16, 47, 79)"}
        assert {row["fill"] for row in snapshots[-1]} <= allowed_blues, "El mapa no usa la paleta azul original"
        legends.append(page.locator(".municipal-legend").inner_text())
        check_zero_selection(page)
        page.screenshot(path=str(output / f"mapa-{label}-seleccion.png"), full_page=True)
        page.goto(origin + "/mapa?tipos=mercados", wait_until="networkidle")
        market_filter = page.get_by_role("button", name="Mercados", exact=True)
        expect(market_filter).to_be_enabled()
        expect(market_filter).to_have_attribute("aria-pressed", "true")
        expect(page.locator(".public-map aside")).to_contain_text(f"{len(catalog['markets'])} registros encontrados")
        for market in catalog["markets"]:
            expect(page.locator(".public-map aside")).to_contain_text(market["name"])
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
        page.goto(origin + "/mapa?tipos=mercados", wait_until="networkidle")
        expect(page.get_by_role("button", name="Mercados", exact=True)).to_be_enabled()
        expect(page.get_by_role("button", name="Mercados", exact=True)).to_have_attribute("aria-pressed", "true")
        expect(page.locator(".public-map aside")).to_contain_text("Todavía no hay mercados publicados.")
        expect(page.locator(".municipal-canvas path[data-record-count='0']")).to_have_count(217)
    public.close()
    team.close()
    browser.close()
    print("Usuario y equipo: mismos totales reales, mapa y leyenda; hover, foco y selección rellenan el municipio y restauran su densidad al salir. Mercados continúa pendiente sin formularios en admin.")
