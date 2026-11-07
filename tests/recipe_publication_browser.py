"""Regression: publishing updates recipe state immediately, after reload and in catalog filters."""
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

session = json.loads(Path(sys.argv[1]).read_text())
origin = session["origin"]
recipe_id = session["recipeId"]
publication_url = f"{origin}/api/catalogs/recipes/{recipe_id}/publication"
output = Path("work/recipe-publication")
output.mkdir(parents=True, exist_ok=True)


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
        headless=True, args=["--no-sandbox"],
    )
    context = browser.new_context(viewport={"width": 1360, "height": 1000}, reduced_motion="reduce")
    context.add_cookies([{"name": session["name"], "value": session["value"], "url": origin, "httpOnly": True, "sameSite": "Lax"}])
    # The isolated runner created a real in-review working copy and a separate published snapshot.
    response = context.request.post(publication_url, data={"action": "unpublish"}, headers={"Origin": origin})
    assert response.ok, response.text()
    record = context.request.get(f"{origin}/api/recipes/{recipe_id}").json()["recipe"]
    assert record["status"] == "in-review"
    assert record["publicStatus"] == "draft"
    page = context.new_page()
    page.set_default_timeout(20000)
    errors = []
    recipe_writes = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("request", lambda request: recipe_writes.append(request.url) if request.method == "PUT" and "/api/recipes/" in request.url else None)
    page.goto(f"{origin}/recetas/{recipe_id}", wait_until="networkidle")
    badge = page.locator(".acervo-heading .recipe-status")
    expect(badge).to_have_text("En revisión")
    publish = page.get_by_role("button", name="Publicar receta", exact=True)
    expect(publish).to_be_enabled()
    publish.click()
    expect(badge).to_have_text("Publicada")
    expect(page.get_by_role("button", name="Retirar publicación", exact=True)).to_be_enabled()
    # Publishing metadata must not start the editor's debounced PUT/autosave or dirty its form.
    page.wait_for_timeout(1000)
    assert not recipe_writes, "Publicar inició un autoguardado innecesario de la captura"
    expect(page.locator(".acervo-heading").get_by_role("button", name="En revisión", exact=True)).to_have_count(0)
    expect(page.locator(".acervo-heading")).to_contain_text("Guardado")
    page.screenshot(path=str(output / "publicada.png"), full_page=True)

    page.locator(".acervo-heading").get_by_role("button", name="Volver a Recetas", exact=True).click()
    expect(page).to_have_url(origin + "/recetas")
    rows = page.locator(".recipe-table tbody tr")
    target = rows.filter(has=page.locator(f'a[href="/recetas/{recipe_id}"]'))
    expect(target.locator(".recipe-status")).to_have_text("Publicada")
    filters = page.get_by_role("group", name="Filtrar recetas por estado", exact=True)
    counts = [int(value) for value in filters.locator(".recipe-catalog-count").all_text_contents()]
    assert len(counts) == 4 and counts[0] == sum(counts[1:]), "Las publicadas se contaron también como borradores o en revisión"
    filters.get_by_role("button", name=re.compile("^En revisión")).click()
    expect(target).to_have_count(0)
    filters.get_by_role("button", name=re.compile("^Publicadas")).click()
    expect(target.locator(".recipe-status")).to_have_text("Publicada")

    page.goto(f"{origin}/recetas/{recipe_id}", wait_until="networkidle")
    expect(badge).to_have_text("Publicada")
    page.reload(wait_until="networkidle")
    expect(badge).to_have_text("Publicada")
    page.get_by_role("button", name="Retirar publicación", exact=True).click()
    expect(badge).to_have_text("En revisión")
    expect(page.get_by_role("button", name="Publicar receta", exact=True)).to_be_enabled()
    page.wait_for_timeout(1000)
    assert not recipe_writes, "Retirar publicación inició un autoguardado de la captura"
    page.reload(wait_until="networkidle")
    expect(badge).to_have_text("En revisión")
    page.locator(".acervo-heading").get_by_role("button", name="Volver a Recetas", exact=True).click()
    expect(target.locator(".recipe-status")).to_have_text("En revisión")
    page.get_by_role("group", name="Filtrar recetas por estado", exact=True).get_by_role("button", name=re.compile("^Publicadas")).click()
    expect(target).to_have_count(0)

    # Restore the approved version for the runner's remaining browser checks.
    page.goto(f"{origin}/recetas/{recipe_id}", wait_until="networkidle")
    page.get_by_role("button", name="Publicar receta", exact=True).click()
    expect(badge).to_have_text("Publicada")
    assert not errors, errors
    context.close()
    browser.close()
    print("Recetas: Publicada inmediatamente, persistente tras recarga, filtros sin duplicados y retirada a En revisión sin autoguardados accidentales.")
