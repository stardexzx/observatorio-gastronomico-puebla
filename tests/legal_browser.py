"""Legal UI regression against the disposable PostgreSQL integration fixtures.

No confidential PDF or real legal instrument is loaded by this test.
"""
import json
import os
import re
import sys
from pathlib import Path

from playwright.sync_api import expect, sync_playwright

session = json.loads(Path(sys.argv[1]).read_text())
origin = session["origin"]
legal_id = session["legalId"]
legal_name = session["legalName"]
output = Path("work/legal-review")
output.mkdir(parents=True, exist_ok=True)


def test_pdf(label):
    stream = ("BT /F1 12 Tf 40 140 Td (" + label + ") Tj ET\n").encode()
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"endstream",
    ]
    data = b"%PDF-1.4\n"
    offsets = [0]
    for index, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data += str(index).encode() + b" 0 obj\n" + obj + b"\nendobj\n"
    xref = len(data)
    data += b"xref\n0 " + str(len(offsets)).encode() + b"\n0000000000 65535 f \n"
    for offset in offsets[1:]:
        data += str(offset).zfill(10).encode() + b" 00000 n \n"
    return data + b"trailer\n<< /Size " + str(len(offsets)).encode() + b" /Root 1 0 R >>\nstartxref\n" + str(xref).encode() + b"\n%%EOF\n"


def cookie(value):
    return {"name": value["name"], "value": value["value"], "url": origin, "httpOnly": True, "sameSite": "Lax"}


def success(response):
    assert response.ok, str(response.status) + " " + response.text()
    return response.json()


with sync_playwright() as playwright:
    browser = playwright.chromium.launch(
        executable_path=os.environ.get("CHROMIUM_PATH", "/usr/bin/chromium"),
        headless=True, args=["--no-sandbox"],
    )
    anonymous = browser.new_context(viewport={"width": 1440, "height": 1000}, reduced_motion="reduce")
    page = anonymous.new_page()
    page.set_default_timeout(25000)
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.goto(origin + "/proteccion-legal", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Protección legal", exact=True)).to_be_visible()
    table = page.get_by_role("table", name="Instrumentos legales", exact=True)
    target = table.get_by_role("row").filter(has_text=legal_name)
    expect(target).to_have_count(1)
    expect(page.get_by_role("link", name="Nueva ficha", exact=True)).to_have_count(0)
    search = page.get_by_role("searchbox", name="Buscar instrumentos", exact=True)
    search.fill(legal_name)
    expect(target).to_have_count(1)
    classification = page.get_by_label("Clasificación", exact=True)
    default_classification = classification.input_value()
    classification.select_option("ley")
    expect(target).to_have_count(0)
    classification.select_option("decreto")
    expect(target).to_have_count(1)
    classification.select_option(default_classification)
    search.fill("NO_EXISTE_UN_INSTRUMENTO_CON_ESTE_NOMBRE")
    expect(table).to_have_count(0)
    search.fill(legal_name)
    expect(target).to_have_count(1)
    target.get_by_role("button", name=re.compile("^" + re.escape(legal_name))).click()
    selected = page.get_by_role("article", name="Ficha seleccionada", exact=True)
    expect(selected).to_contain_text(legal_name)
    selected.get_by_role("tab", name="Documentos", exact=True).click()
    expect(selected.get_by_role("link", name=re.compile("public-final-test.pdf"))).to_be_visible()
    expect(page.get_by_text("EVIDENCIA LEGAL PRIVADA.pdf", exact=True)).to_have_count(0)
    page.screenshot(path=str(output / "catalog-desktop.png"), full_page=True)
    selected.get_by_role("tab", name="Vínculos", exact=True).click()
    expect(selected).to_contain_text("Receta pública temporal")
    expect(selected).not_to_contain_text("RECETA BORRADOR PRIVADO")
    selected.get_by_role("tab", name="Municipios", exact=True).click()
    expect(selected).to_contain_text("Municipio sintético")
    selected.get_by_role("link", name=re.compile("^Abrir ficha completa")).click()
    expect(page.get_by_role("heading", name=legal_name, exact=True)).to_be_visible()
    expect(page.get_by_text("NOTA LEGAL PRIVADA", exact=True)).to_have_count(0)
    pdf = anonymous.request.get(origin + "/api/legal/documents/" + session["publicDocumentId"])
    assert pdf.ok and pdf.body().startswith(b"%PDF-")
    assert anonymous.request.get(origin + "/api/legal/documents/" + session["privateDocumentId"]).status == 404
    page.goto(origin + "/recetas/" + session["legalRecipeId"], wait_until="networkidle")
    expect(page.get_by_text("Instrumentos jurídicos vinculados", exact=True)).to_be_visible()
    expect(page.get_by_role("link", name=re.compile(re.escape(legal_name)))).to_have_count(1)

    # The same layout remains usable in a narrow viewport.
    page.set_viewport_size({"width": 390, "height": 844})
    page.goto(origin + "/proteccion-legal", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Protección legal", exact=True)).to_be_visible()
    page.get_by_role("searchbox", name="Buscar instrumentos", exact=True).fill(legal_name)
    expect(page.get_by_role("table", name="Instrumentos legales")).to_be_visible()
    assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), "Legal layout causes horizontal page overflow"
    page.screenshot(path=str(output / "catalog-mobile.png"), full_page=True)

    team = browser.new_context(viewport={"width": 1440, "height": 1100}, reduced_motion="reduce")
    team.add_cookies([cookie(session)])
    editor = team.new_page()
    editor.set_default_timeout(25000)
    editor.on("pageerror", lambda error: errors.append(str(error)))
    editor.goto(origin + "/proteccion-legal/nuevo", wait_until="networkidle")
    expect(editor.get_by_role("heading", name="Nuevo instrumento legal", exact=True)).to_be_visible()
    choices = editor.get_by_role("group", name=re.compile("^Clasificación del instrumento"))
    expect(choices.get_by_role("radio")).to_have_count(10)
    choices.get_by_role("radio", name=re.compile("^Denominación de origen")).check()
    expect(editor.get_by_label("Nombre protegido", exact=True)).to_be_visible()
    choices.get_by_role("radio", name=re.compile("^Marca colectiva")).check()
    expect(editor.get_by_label("Titular colectivo", exact=True)).to_be_visible()
    choices.get_by_role("radio", name=re.compile("^Ley")).check()
    expect(editor.get_by_label("Diario o periódico oficial", exact=True)).to_be_visible()
    expect(editor.get_by_label("Nombre protegido", exact=True)).to_have_count(0)
    editor.get_by_label("Nombre del instrumento", exact=True).fill("Borrador legal capturado desde el navegador")
    source_title = "Fuente sintética de interfaz"
    editor.get_by_role("button", name="Añadir fuente", exact=True).click()
    editor.get_by_label("Título", exact=True).fill(source_title)
    editor.get_by_label("Referencia documental", exact=True).fill("Referencia sintética de prueba UI-001")
    editor.get_by_label("URL de la fuente", exact=True).fill("https://invalid.example/legal-ui/source")
    file_input = editor.get_by_label("Seleccionar documentos PDF", exact=True)
    assert file_input.get_attribute("multiple") is not None
    file_input.set_input_files([
        {"name": "evidencia-ui-uno.pdf", "mimeType": "application/pdf", "buffer": test_pdf("PRIVATE UI EVIDENCE ONE")},
        {"name": "evidencia-ui-dos.pdf", "mimeType": "application/pdf", "buffer": test_pdf("PRIVATE UI EVIDENCE TWO")},
    ])
    licenses = editor.get_by_label("Licencia o autorización de uso", exact=True)
    expect(licenses).to_have_count(2)
    licenses.first.fill("Autorización sintética para pruebas de interfaz")
    document_sources = editor.get_by_label("Fuente del documento (opcional)", exact=True)
    document_sources.first.select_option(label=source_title)
    client_source_id = document_sources.first.input_value()
    # The second restricted PDF deliberately has no documented license.
    editor.screenshot(path=str(output / "editor-classification.png"), full_page=True)
    with editor.expect_response(lambda response: response.request.method == "POST" and response.url == origin + "/api/legal") as created:
        editor.get_by_role("button", name="Guardar ficha", exact=True).click()
    new_record = success(created.value)["record"]
    editor.wait_for_url(re.compile("/proteccion-legal/[^/]+/editar$"))
    stored = success(team.request.get(origin + "/api/legal/" + new_record["id"]))["record"]
    assert not stored["published"] and stored["status"] == "borrador"
    assert len(stored["documents"]) == 2
    canonical_source_id = new_record["sourceIdChanges"][client_source_id]
    assert canonical_source_id != client_source_id
    assert canonical_source_id in {source["id"] for source in stored["sources"]}
    assert next(document for document in stored["documents"] if document["name"] == "evidencia-ui-uno.pdf")["sourceId"] == canonical_source_id
    assert any(document["name"] == "evidencia-ui-dos.pdf" and not document["license"] for document in stored["documents"])
    for document in stored["documents"]:
        assert anonymous.request.get(origin + "/api/legal/documents/" + document["id"]).status == 404
    assert anonymous.request.get(origin + "/api/public/legal/" + new_record["id"]).status == 404

    # Edit an approved record; its old public snapshot survives until the full workflow completes.
    editor.goto(origin + "/proteccion-legal/" + legal_id + "/editar", wait_until="networkidle")
    expect(editor.get_by_label("Número de decreto", exact=True)).to_have_value("PRUEBA-001")
    updated_name = "Actualización legal de integración aprobada"
    editor.get_by_label("Nombre del instrumento", exact=True).fill(updated_name)
    with editor.expect_response(lambda response: response.request.method == "PUT" and response.url == origin + "/api/legal/" + legal_id) as saved:
        editor.get_by_role("button", name="Guardar ficha", exact=True).click()
    assert success(saved.value)["record"]["name"] == updated_name
    assert success(anonymous.request.get(origin + "/api/public/legal/" + legal_id))["record"]["name"] == legal_name
    workflow = editor.get_by_role("region", name="Gestión editorial", exact=True)
    # A named section has the region role, and each response updates its available actions immediately.
    for label, expected_status in [("Enviar a revisión", "en_revision"), ("Validar revisión", "validado"), ("Publicar revisión", "publicado")]:
        button = workflow.get_by_role("button", name=label, exact=True)
        expect(button).to_be_enabled()
        with editor.expect_response(lambda response: response.request.method == "POST" and response.url.endswith("/api/legal/" + legal_id + "/workflow")) as changed:
            button.click()
        changed_record = success(changed.value)["record"]
        if expected_status != "publicado":
            assert changed_record["status"] == expected_status
        else:
            assert changed_record["published"]
    expect(workflow.get_by_role("button", name="Retirar publicación", exact=True)).to_be_enabled()
    expect(workflow).to_contain_text("Publicada")
    final = success(anonymous.request.get(origin + "/api/public/legal/" + legal_id))["record"]
    assert final["name"] == updated_name
    page.goto(origin + "/proteccion-legal/" + legal_id, wait_until="networkidle")
    expect(page.get_by_role("heading", name=updated_name, exact=True)).to_be_visible()
    page.reload(wait_until="networkidle")
    expect(page.get_by_role("heading", name=updated_name, exact=True)).to_be_visible()
    page.screenshot(path=str(output / "approved-detail.png"), full_page=True)
    assert not errors, errors
    anonymous.close()
    team.close()
    browser.close()
    print("Legal UI: public filters/sidebar/tabs, inverse links, mobile layout, 10 classifications, private multiple PDF capture and complete publication workflow passed.")
