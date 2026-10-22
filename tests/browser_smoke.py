"""Smoke funcional opcional: requiere Python Playwright y Chromium del sistema."""
import sys
from playwright.sync_api import sync_playwright, expect

base = sys.argv[1]
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    page = browser.new_page(viewport={"width": 1440, "height": 1000})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    for route in ['/', '/mapa', '/recetas', '/mercados', '/cocineras', '/proteccion-legal', '/red-conocimiento', '/reportes', '/podcast', '/acerca']:
        response = page.goto(base + route, wait_until='networkidle')
        assert response.status == 200, route
        expect(page.locator('main h1')).to_be_visible()
        assert 'No fue posible' not in page.locator('main').inner_text(), route
    page.goto(base + '/recetas', wait_until='networkidle')
    expect(page.locator('a.catalog-card')).to_have_count(1)
    page.locator('a.catalog-card').first.click()
    expect(page.locator('main h1')).to_have_text('Receta de integración')
    expect(page.locator('main')).to_contain_text('Chile sintético')
    expect(page.locator('main')).to_contain_text('Preparar el ingrediente sintético.')
    page.screenshot(path='/tmp/ogp-integration-desktop.png', full_page=True)
    for route, title in [('/mercados','Mercado de integración'),('/cocineras','Persona de integración')]:
        page.goto(base + route, wait_until='networkidle')
        page.locator('a.catalog-card').first.click()
        expect(page.locator('main h1')).to_have_text(title)
    page.goto(base + '/proteccion-legal', wait_until='networkidle')
    page.get_by_role('link',name='Ver ficha').click()
    expect(page.locator('main h1')).to_have_text('Instrumento de integración')
    search = page.get_by_role('searchbox', name='Buscar en el observatorio')
    search.fill('Receta')
    search.press('Enter')
    expect(page.locator('main')).to_contain_text('Receta de integración')
    page.goto(base + '/podcast', wait_until='networkidle')
    page.locator('.catalog-grid a').first.click()
    expect(page.locator('main h1')).to_have_text('Episodio de integración')
    expect(page.get_by_role('link',name='Página de prueba')).to_have_attribute('href','https://invalid.example/audio')
    page.get_by_text('Leer transcripción').click()
    expect(page.locator('main')).to_contain_text('Transcripción sintética.')
    page.goto(base + '/mapa', wait_until='networkidle')
    page.get_by_role('button',name='Mercado de integración',exact=True).last.click()
    expect(page.locator('.map-selection')).to_contain_text('-98.2')
    with page.expect_download() as download:
        page.get_by_role('link',name='Descargar datos').click()
    assert download.value.suggested_filename == 'ogp-indicadores-publicos.json'
    page.set_viewport_size({"width":390,"height":844})
    page.goto(base + '/recetas', wait_until='networkidle')
    page.get_by_role('button',name='Abrir o cerrar navegación').click()
    page.get_by_role('button',name='Explorar',exact=True).click()
    expect(page.locator('nav').get_by_role('link',name='Mercados')).to_be_visible()
    page.locator('nav').get_by_role('link',name='Mercados').click()
    expect(page.locator('main h1')).to_have_text('Mercados y tianguis')
    page.screenshot(path='/tmp/ogp-integration-mobile.png', full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Desbordamiento móvil'
    assert not errors, errors
    browser.close()
    print('Chromium: rutas, fichas, búsqueda, mapa, podcast, descarga y navegación móvil correctos.')
