"""Public navigation and read-only behavior against an isolated running server.

Run with PUBLIC_BASE_URL=http://127.0.0.1:5173 python tests/public_browser.py.
The test never creates accounts or records. Its catalog assertions use records
that the isolated test runner has already published, when present.
"""
import json
import os
import re
import sys
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from playwright.sync_api import expect, sync_playwright


session = json.loads(Path(sys.argv[1]).read_text()) if len(sys.argv) > 1 else {}
origin = session.get("origin", os.environ.get("PUBLIC_BASE_URL", "http://127.0.0.1:5173")).rstrip("/")
output = Path("work/public-review")
output.mkdir(parents=True, exist_ok=True)
private_names = ["RECETA BORRADOR PRIVADO", "INGREDIENTE PRIVADO", "INFORMANTE PRIVADO", "NOTAS PRIVADAS"] + session.get("privateNames", []) + [name for name in os.environ.get("PUBLIC_FORBIDDEN_NAMES", "").split("|") if name]


def query(page):
    return parse_qs(urlparse(page.url).query, keep_blank_values=True)


def assert_read_only(page):
    forbidden = re.compile(r"^(Nueva receta|Nuevo ingrediente|Nuevo episodio|Agregar episodio|Nueva ficha|"
                           r"Registrar receta|Registrar ingrediente|Registrar cocinera|Editar receta|Editar ingrediente|"
                           r"Editar ficha|Editar episodio|Eliminar receta|Eliminar ingrediente|Eliminar episodio|"
                           r"Guardar cambios|Guardar registro|Importar selección|Roles y permisos)$", re.I)
    expect(page.get_by_role("button", name=forbidden)).to_have_count(0)
    expect(page.get_by_role("link", name=forbidden)).to_have_count(0)
    text = page.locator("body").inner_text()
    for name in private_names:
        assert name not in text, f"Se mostró una ficha privada: {name}"


with sync_playwright() as p:
    browser = p.chromium.launch(
        executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
        headless=True,
        args=["--no-sandbox"],
    )
    context = browser.new_context(viewport={"width": 1360, "height": 1000}, reduced_motion="reduce")
    page = context.new_page()
    page.set_default_timeout(20000)
    page.set_default_navigation_timeout(60000)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))

    def visit(route):
        response = page.goto(origin + route, wait_until="networkidle")
        assert response and response.status == 200, (route, response.status if response else None)
        assert "/iniciar-sesion" not in page.url, route
        expect(page.locator("h1").first).to_be_visible()
        assert "Application error" not in page.locator("body").inner_text(), route
        assert_read_only(page)

    # Landing page is a public page, and no synthetic session is required.
    visit("/")
    assert not context.cookies(), "La navegación pública no debe crear una sesión administrativa"
    expect(page.get_by_role("link", name="Acceso del equipo", exact=True)).to_be_visible()
    catalog_response = context.request.get(origin + "/api/public/catalog")
    assert catalog_response.status == 200, catalog_response.text()
    catalog = catalog_response.json()
    for key in ["recipes", "cooks", "ingredients", "episodes", "timeline"]:
        assert isinstance(catalog.get(key), list), key
    serialized = json.dumps(catalog, ensure_ascii=False)
    for name in private_names:
        assert name not in serialized, f"La API expuso un nombre privado: {name}"
    for key in ["draftRecipeId", "privateRecipeId", "privateCookId", "privateIngredientId", "privateEpisodeId"]:
        if session.get(key):
            assert session[key] not in serialized, f"La API expuso una ficha privada: {key}"
    for key, id_key in [("recipes", "recipeId"), ("cooks", "cookId"), ("ingredients", "ingredientId"), ("episodes", "episodeId")]:
        if session.get(id_key):
            assert any(record["id"] == session[id_key] for record in catalog[key]), f"No se encontró la ficha pública {id_key}"
    assert all(record.get("status") == "published" for record in catalog["recipes"])
    assert all(record.get("status") == "verified" for record in catalog["cooks"] + catalog["ingredients"])
    assert all(record.get("status") == "published" for record in catalog["episodes"])
    assert all(not record.get("informant", {}).get("name") for record in catalog["recipes"])

    # The Acervo menu has only the five original sections.
    page.get_by_role("button", name="Acervo", exact=True).click()
    expected_acervo = ["Recetas", "Recetario", "Ingredientes", "Mercados y tianguis", "Cocineras y cocineros"]
    expect(page.get_by_role("menuitem")).to_have_count(5)
    for label in expected_acervo:
        expect(page.get_by_role("menuitem", name=label, exact=True)).to_be_visible()
    page.keyboard.press("Escape")
    page.get_by_role("button", name="Datos y análisis", exact=True).click()
    expect(page.get_by_role("menuitem")).to_have_count(2)
    expect(page.get_by_role("menuitem", name="Reportes", exact=True)).to_be_visible()
    expect(page.get_by_role("menuitem", name="Red de conocimiento", exact=True)).to_be_visible()
    page.keyboard.press("Escape")
    page.get_by_role("button", name=re.compile("^Conocer el observatorio$", re.I)).click()
    expect(page.get_by_role("menuitem")).to_have_count(2)
    expect(page.get_by_role("menuitem", name="Memoria histórica", exact=True)).to_be_visible()
    expect(page.get_by_role("menuitem", name="Acerca del Observatorio", exact=True)).to_be_visible()
    page.keyboard.press("Escape")

    routes = ["/", "/recetas", "/recetario", "/ingredientes", "/cocineras", "/mercados", "/podcast",
              "/mapa", "/memoria", "/acerca", "/red-conocimiento", "/datos-analisis", "/reportes",
              "/proteccion-legal", "/conocer-observatorio"]
    for route in routes:
        visit(route)
        if route in ["/recetas", "/mapa", "/memoria", "/red-conocimiento", "/reportes"]:
            page.screenshot(path=str(output / (route.strip("/") + "-desktop.png")), full_page=True)
    visit("/mercados")
    expect(page.locator("body")).to_contain_text("cuando se publiquen sus fichas")
    expect(page.locator("a[href^='/admin/']")).to_have_count(0)

    # Search and details consume the actual public catalog, with no editor actions.
    resource_routes = [("recipes", "/recetas", "name"), ("ingredients", "/ingredientes", "name"),
                       ("cooks", "/cocineras", "name"), ("episodes", "/podcast", "title")]
    for key, route, label in resource_routes:
        visit(route)
        if not catalog[key]:
            expect(page.locator("body")).to_contain_text("Aún no hay")
            continue
        record = catalog[key][0]
        field = page.get_by_role("search").get_by_role("textbox")
        field.fill("SIN-RESULTADOS-PRUEBA-49372")
        expect(page.locator("body")).to_contain_text("No encontramos resultados")
        page.get_by_role("button", name="Ver todo", exact=True).click()
        field.fill(record[label])
        expect(page.get_by_role("heading", name=record[label], exact=True)).to_be_visible()
        visit(route + "/" + record["id"])
        expect(page.locator("h1")).to_have_text(record[label])
        assert_read_only(page)
    if session.get("recipeId") and session.get("ingredientId"):
        visit("/recetas/" + session["recipeId"])
        expect(page.get_by_role("heading", name="Fichas de ingredientes", exact=True)).to_be_visible()
        expect(page.locator("main a[href='/ingredientes/" + session["ingredientId"] + "']")).to_be_visible()
    visit("/recetas/no-publicada-inexistente")
    expect(page.locator("body")).to_contain_text("Ficha no disponible")
    if session.get("draftRecipeId"):
        visit("/recetas/" + session["draftRecipeId"])
        expect(page.locator("body")).to_contain_text("Ficha no disponible")
    original_episode = next((record for record in catalog["episodes"] if record.get("title") == "Episodio de integración"), None)
    if original_episode:
        visit("/podcast/" + original_episode["id"])
        expect(page.locator("h1")).to_have_text("Episodio de integración")
        expect(page.locator("iframe")).to_have_count(0)
        expect(page.locator("a[href='https://invalid.example/audio']")).to_be_visible()

    # Geographic filters and zoom preserve the territorial map and URL sharing.
    visit("/mapa")
    expect(page.get_by_role("group", name="Mapa de los 217 municipios de Puebla", exact=True)).to_be_visible()
    page.get_by_label("Municipio del mapa", exact=True).select_option("21114")
    expect(page).to_have_url(re.compile("municipio=21114"))
    page.get_by_label("Buscar en el mapa", exact=True).fill("maíz")
    page.get_by_role("button", name="Buscar", exact=True).click()
    expect(page).to_have_url(re.compile("q="))
    assert query(page)["q"] == ["maíz"]
    page.get_by_role("button", name="Acercar mapa", exact=True).click()
    page.get_by_role("button", name="Alejar mapa", exact=True).click()
    page.get_by_role("button", name="Restablecer mapa", exact=True).click()
    page.get_by_role("button", name="Limpiar filtros", exact=True).click()
    expect(page).to_have_url(origin + "/mapa")
    recipes_layer = page.get_by_role("button", name="Recetas", exact=True)
    recipes_layer.click()
    expect(recipes_layer).to_have_attribute("aria-pressed", "false")
    expect(page).to_have_url(re.compile("tipos="))

    # All history eras come from the shared catalog and keep interactive navigation.
    visit("/memoria")
    expect(page.get_by_role("tab")).to_have_count(5)
    page.get_by_role("tab", name=re.compile("^Siglo XXI")).click()
    expect(page.locator("#tl-event-title")).to_contain_text("UNESCO")
    page.get_by_role("button", name="Siguiente hito", exact=True).click()
    selected_title = page.locator("#tl-event-title").inner_text()
    page.reload(wait_until="networkidle")
    expect(page.locator("#tl-event-title")).to_have_text(selected_title)
    page.get_by_label("Buscar un hito", exact=True).fill("maíz")
    expect(page.locator(".tl-search-results button").first).to_be_visible()
    page.locator(".tl-search-results button").first.click()
    expect(page.locator("#tl-event-title")).not_to_have_text(selected_title)

    # Private administration remains protected even with a guessed address.
    for route in ["/admin/mercados/nueva", "/administracion/roles", "/integracion"]:
        page.goto(origin + route, wait_until="networkidle")
        expect(page).to_have_url(re.compile("/iniciar-sesion"))
    assert context.request.get(origin + "/api/recipes").status == 401

    # Public failure is recoverable and never substituted with fabricated records.
    page.route("**/api/public/catalog", lambda route: route.fulfill(status=503, json={"error": "Prueba temporal"}))
    visit("/recetas")
    expect(page.locator(".admin-main [role='alert']")).to_be_visible()
    expect(page.locator("body")).to_contain_text("No se pudo cargar la información")
    page.unroute("**/api/public/catalog")
    page.get_by_role("button", name="Reintentar", exact=True).click()
    expect(page.locator(".admin-main [role='alert']")).to_have_count(0)

    # Public navigation remains usable on narrow screens.
    for width in [1024, 390]:
        page.set_viewport_size({"width": width, "height": 844})
        for route in routes:
            visit(route)
            assert page.evaluate("document.documentElement.scrollWidth <= innerWidth"), f"{route} desborda a {width}px"
            if width == 390 and route in ["/recetas", "/mapa", "/memoria", "/red-conocimiento"]:
                page.screenshot(path=str(output / (route.strip("/") + "-mobile.png")), full_page=True)
    visit("/")
    page.get_by_role("button", name="Abrir menú", exact=True).click()
    page.get_by_role("button", name="Acervo", exact=True).click()
    expect(page.get_by_role("menuitem")).to_have_count(5)
    page.get_by_role("menuitem", name="Recetas", exact=True).click()
    expect(page.locator("h1")).to_have_text("Recetas")
    visit("/memoria")
    page.get_by_label("Ir a una época", exact=True).select_option("siglo-xx")
    expect(page.locator("#tl-event-title")).to_contain_text("taco árabe")

    # Reviewers inspect disabled fields and can approve the version for visitors.
    # Authentication is confined to a separate context; the public visitor stays anonymous.
    if session.get("reviewCookie") and session.get("recipeId"):
        review_context = browser.new_context(viewport={"width": 1360, "height": 1000}, reduced_motion="reduce")
        cookie = session["reviewCookie"]
        review_context.add_cookies([{"name": cookie["name"], "value": cookie["value"], "url": origin, "httpOnly": True, "sameSite": "Lax"}])
        reviewer = review_context.new_page()
        reviewer.set_default_timeout(20000)
        reviewer.goto(origin + "/recetas/" + session["recipeId"], wait_until="networkidle")
        expect(reviewer.locator("#recipe-name")).to_be_disabled()
        expect(reviewer.get_by_role("button", name="Guardar", exact=True)).to_have_count(0)
        expect(reviewer.get_by_role("button", name="Enviar a revisión", exact=True)).to_have_count(0)
        sections = reviewer.locator(".recipe-section-link")
        expect(sections).to_have_count(6)
        for index in range(6):
            sections.nth(index).click()
            expect(reviewer.locator("#recipe-form-panel fieldset")).to_have_attribute("disabled", "")
            fields = reviewer.locator("#recipe-form-panel input, #recipe-form-panel textarea, #recipe-form-panel select")
            for field in fields.all():
                expect(field).to_be_disabled()
        retire = reviewer.get_by_role("button", name="Retirar publicación", exact=True)
        expect(retire).to_be_enabled()
        retire.click()
        publish = reviewer.get_by_role("button", name="Publicar receta", exact=True)
        expect(publish).to_be_enabled()
        retired_catalog = context.request.get(origin + "/api/public/catalog").json()
        assert not any(record["id"] == session["recipeId"] for record in retired_catalog["recipes"])
        publish.click()
        expect(reviewer.get_by_role("button", name="Retirar publicación", exact=True)).to_be_enabled()
        published_catalog = context.request.get(origin + "/api/public/catalog").json()
        assert any(record["id"] == session["recipeId"] for record in published_catalog["recipes"])
        review_context.close()
    if session.get("captureCookie") and session.get("recipeId"):
        capture_context = browser.new_context(viewport={"width": 1360, "height": 1000}, reduced_motion="reduce")
        cookie = session["captureCookie"]
        capture_context.add_cookies([{"name": cookie["name"], "value": cookie["value"], "url": origin, "httpOnly": True, "sameSite": "Lax"}])
        capturer = capture_context.new_page()
        capturer.goto(origin + "/recetas/" + session["recipeId"], wait_until="networkidle")
        expect(capturer.locator("#recipe-name")).to_be_enabled()
        expect(capturer.get_by_role("button", name=re.compile("^(Publicar receta|Actualizar publicación|Retirar publicación)$"))).to_have_count(0)
        capture_context.close()

    assert not errors, errors
    context.close()
    browser.close()
    print("Chromium: navegación pública, cinco acciones de Acervo, fichas de lectura, filtros, mapa, memoria, acceso protegido y móvil correctos.")
