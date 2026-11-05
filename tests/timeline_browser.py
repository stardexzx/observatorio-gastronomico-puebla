"""Prueba funcional de la línea de tiempo; requiere Vite, Playwright y Chromium.
Uso: python tests/timeline_browser.py http://127.0.0.1:5181
"""
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
base=sys.argv[1].rstrip('/')
Path('work').mkdir(exist_ok=True)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1080},reduced_motion='reduce',permissions=['clipboard-read','clipboard-write'])
    page=context.new_page()
    errors=[]
    requests=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('request',lambda r:requests.append(r.url) if '/api/' in r.url else None)
    page.goto(base+'/memoria',wait_until='networkidle')
    expect(page.locator('h1')).to_contain_text('Gastronomía poblana')
    expect(page.get_by_role('tab')).to_have_count(5)
    expect(page.get_by_role('button',name='Hito anterior',exact=True)).to_be_disabled()
    expect(page.get_by_role('tabpanel')).to_contain_text('La milpa alimenta a la comunidad')
    # Cada época y todos sus hitos cambian el detalle; también hay navegación continua.
    era_names=['Época prehispánica','Época virreinal','Siglo XIX','Siglo XX','Siglo XXI']
    total=0
    for name in era_names:
        page.get_by_role('tab',name=__import__('re').compile('^'+name+' ·')).click()
        expect(page.locator('.tl-era-intro h2')).to_have_text(name)
        buttons=page.locator('.tl-milestones ol button')
        for i in range(buttons.count()):
            title=buttons.nth(i).locator('strong').inner_text()
            buttons.nth(i).click()
            expect(page.locator('#tl-event-title')).to_have_text(title)
            total+=1
    assert total==12,total
    expect(page.get_by_role('button',name='Siguiente hito',exact=True)).to_be_disabled()
    page.get_by_role('button',name='Hito anterior',exact=True).click()
    expect(page.locator('#tl-event-title')).to_contain_text('UNESCO')
    expect(page.locator('.tl-event-sources a')).to_have_attribute('href',__import__('re').compile('https://ich.unesco.org/'))
    expect(page.locator('.tl-event-notes')).to_contain_text('no es una inscripción independiente')
    # Flechas/Home/End seleccionan las épocas y mantienen el foco en el tab activo.
    last=page.get_by_role('tab',name=__import__('re').compile('^Siglo XXI'))
    last.focus();page.keyboard.press('Home')
    expect(page.get_by_role('tab').first).to_be_focused()
    expect(page.get_by_role('tab').first).to_have_attribute('aria-selected','true')
    page.keyboard.press('ArrowRight')
    expect(page.get_by_role('tab').nth(1)).to_be_focused()
    page.keyboard.press('End')
    expect(last).to_be_focused()
    # Búsqueda sin acentos sobre los detalles y enlace de un hito reproducible.
    page.get_by_label('Buscar un hito',exact=True).fill('granada')
    expect(page.locator('.tl-search-results button')).to_have_count(1)
    page.locator('.tl-search-results button').click()
    expect(page.locator('#tl-event-title')).to_contain_text('chiles en nogada')
    selected_url=page.url
    assert 'hito=chiles-nogada' in selected_url
    page.get_by_role('button',name='Copiar enlace de este hito').click()
    expect(page.locator('.tl-share [role=status]')).to_have_text('Enlace copiado')
    assert page.evaluate('navigator.clipboard.readText()')==selected_url
    page.reload(wait_until='networkidle')
    expect(page.locator('#tl-event-title')).to_contain_text('chiles en nogada')
    page.get_by_role('button',name='Siguiente hito',exact=True).click()
    expect(page.locator('#tl-event-title')).to_contain_text('Intervención francesa')
    page.go_back(wait_until='networkidle')
    expect(page.locator('#tl-event-title')).to_contain_text('chiles en nogada')
    page.get_by_label('Buscar un hito',exact=True).fill('ZZZ-no-existe')
    expect(page.locator('.tl-search-results')).to_contain_text('No hay hitos')
    page.get_by_label('Buscar un hito',exact=True).fill('maiz')
    assert page.locator('.tl-search-results button').count()>0
    page.get_by_label('Buscar un hito',exact=True).fill('')
    page.goto(base+'/linea-de-tiempo?epoca=no-existe&hito=no-existe',wait_until='networkidle')
    expect(page.get_by_role('tab').first).to_have_attribute('aria-selected','true')
    page.screenshot(path='work/timeline-desktop.png',full_page=True)
    # La navegación principal apunta a la sección y la versión móvil no desborda.
    page.get_by_role('button',name='Conocer el Observatorio',exact=True).click()
    page.get_by_role('link',name=__import__('re').compile('Línea de tiempo')).click()
    expect(page.locator('h1')).to_contain_text('Gastronomía poblana')
    for width in [768,390,320]:
        page.set_viewport_size({'width':width,'height':844})
        if width<700:
            page.get_by_label('Ir a una época',exact=True).select_option('siglo-xx')
            expect(page.locator('#tl-event-title')).to_contain_text('taco árabe')
            assert page.locator('.tl-era-track').evaluate('(e)=>e.scrollWidth>e.clientWidth')
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'),f'Desbordamiento a {width}px'
        assert page.locator('.tl-event-copy').evaluate('(e)=>e.getBoundingClientRect().right <= document.querySelector(".tl-era-panel").getBoundingClientRect().right'),f'Detalle recortado a {width}px'
    page.set_viewport_size({'width':390,'height':844})
    page.get_by_label('Ir a una época',exact=True).select_option('virreinal')
    expect(page.locator('.tl-era-intro h2')).to_have_text('Época virreinal')
    for _ in range(3):
        page.get_by_role('button',name='Siguiente hito',exact=True).click()
    expect(page.locator('#tl-event-title')).to_contain_text('Moles y dulces')
    assert page.locator('.tl-milestones ol button.is-active').evaluate('(e)=>{const p=e.closest("ol").getBoundingClientRect(),r=e.getBoundingClientRect();return r.left>=p.left-1 && r.right<=p.right+1;}'),'El hito seleccionado queda fuera de la lista móvil'
    page.screenshot(path='work/timeline-mobile.png',full_page=True)
    assert not errors,errors
    assert not requests,requests
    context.close();browser.close()
    print('Línea de tiempo: 5 épocas, 12 hitos, teclado, búsqueda, enlaces, historial y móvil correctos; sin consultas a la API.')
