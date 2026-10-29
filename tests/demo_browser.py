"""Prueba del demo local en un navegador aislado; no utiliza PostgreSQL."""
import base64
import re
import struct
import sys
from playwright.sync_api import sync_playwright, expect

base = (sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:5173').rstrip('/')
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width': 1440, 'height': 1000})
    page = context.new_page()
    page.set_default_timeout(10000)
    errors, api_calls = [], []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.on('request', lambda r: api_calls.append(r.url) if '/api/' in r.url else None)

    def tab(label):
        page.locator('.editor-tabs').get_by_role('button', name=re.compile(re.escape(label))).click()

    def fill(label, value):
        page.get_by_label(label, exact=True).fill(value)

    def add_entry(label, value):
        field = page.locator('.demo-entry-list').filter(has=page.get_by_label(label, exact=True))
        field.get_by_label(label, exact=True).fill(value)
        field.get_by_role('button', name='Añadir', exact=True).click()

    def choose_municipality(name):
        tab('Origen y ubicación')
        fill('Buscar municipio', name)
        page.locator('.demo-municipality-results').get_by_role('button', name=name, exact=True).click()
        expect(page.locator('.demo-location-selected')).to_contain_text(name)

    def group(name):
        return page.get_by_role('group', name=name, exact=True)

    def save():
        page.get_by_role('button', name='Guardar registro', exact=True).first.click()

    def wait_detail(resource, name):
        page.wait_for_url(re.compile(re.escape(base) + '/' + resource + '/[0-9a-f-]+$'))
        expect(page.locator('main h1')).to_have_text(name)
        return page.url.rsplit('/', 1)[1]

    page.goto(base + '/admin/cocineras/nueva', wait_until='networkidle')
    expect(page.locator('main h1')).to_have_text('Nueva cocinera o cocinero')
    person_draft_url = page.url
    fill('Nombre público', 'Cocinera del demo')
    fill('Presentación o rol', 'Cocinera tradicional de Cuetzalan')
    fill('Biografía', 'Aprendió de su abuela y transmite los saberes culinarios de su comunidad.')
    fill('Frase o testimonio', 'La cocina guarda nuestra memoria.')
    add_entry('Lenguas', 'Náhuatl')
    add_entry('Especialidades', 'Tamales')
    png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK9sAAAAASUVORK5CYII=')
    page.get_by_label('Fotografía o retrato', exact=True).set_input_files({'name':'retrato.png', 'mimeType':'image/png', 'buffer':png})
    expect(page.locator('.demo-photo-preview img')).to_be_visible()
    choose_municipality('Cuetzalan del Progreso')
    fill('Comunidad o localidad', 'Comunidad de prueba')
    # Selección accesible del municipio en el mapa con teclado.
    path = page.locator('.municipal-canvas path[role=button][aria-pressed=true]')
    path.focus()
    page.keyboard.press('Enter')
    expect(page.locator('.demo-location-selected')).to_contain_text('Cuetzalan del Progreso')
    tab('Registros relacionados')
    page.screenshot(path='/tmp/ogp-demo-registro-desktop.png', full_page=True)
    fill('Estudiantes', '12')
    # La selección que falta abre otro registro conservando el formulario original.
    recipes = group('Recetas insignia')
    recipes.get_by_role('searchbox').fill('Receta del demo')
    expect(recipes).to_contain_text('No se encontraron registros')
    recipes.get_by_role('button', name='+ Registrar receta', exact=True).click()
    expect(page.locator('main h1')).to_have_text('Nueva receta histórica')
    fill('Nombre de la receta', 'Receta del demo')
    fill('Descripción', 'Receta histórica vinculada a cocineras y mercados.')
    fill('Época o referencia histórica', 'Tradición contemporánea')
    choose_municipality('Cuetzalan del Progreso')
    tab('Registros relacionados')
    group('Mercados vinculados').get_by_role('button', name='+ Registrar mercado', exact=True).click()
    expect(page.locator('main h1')).to_have_text('Nuevo mercado o tianguis')
    fill('Nombre del mercado', 'Mercado del demo')
    fill('Descripción', 'Espacio de abasto y encuentro comunitario.')
    fill('Horario y días de operación', 'Sábados · 7:00–16:00')
    choose_municipality('Puebla')
    fill('Dirección', 'Calle de prueba, Centro, Puebla')
    page.get_by_role('button', name='Marcar ubicación en el mapa', exact=True).click()
    # Escoge un punto realmente dentro del polígono dibujado, aunque sea cóncavo.
    point = page.locator('.municipal-canvas path[aria-pressed=true]').evaluate('''el => {
      const b = el.getBBox(), svg = el.ownerSVGElement;
      for (let i=1;i<20;i++) for(let j=1;j<20;j++) {
        const p = svg.createSVGPoint(); p.x=b.x+b.width*i/20; p.y=b.y+b.height*j/20;
        if(el.isPointInFill(p)) {const q=p.matrixTransform(el.getScreenCTM()); return {x:q.x,y:q.y};}
      }
    }''')
    assert point, 'No se encontró un punto interior del municipio'
    page.mouse.click(point['x'], point['y'])
    expect(page.locator('.demo-location-selected')).to_contain_text('Ubicación marcada en el mapa')
    tab('Servicios y productos')
    group('Productos destacados').get_by_role('checkbox', name=re.compile('Chile poblano')).check()
    page.get_by_role('checkbox', name='Sanitarios', exact=True).check()
    page.get_by_role('checkbox', name='Rampas de acceso', exact=True).check()
    save()
    expect(page.locator('main h1')).to_have_text('Nueva receta histórica')
    tab('Registros relacionados')
    expect(group('Mercados vinculados').get_by_role('checkbox', name=re.compile('Mercado del demo'))).to_be_checked()
    tab('Fuentes y linaje')
    add_entry('Fuentes históricas', 'Recetario comunitario de prueba')
    fill('Descripción del linaje de preparación', 'Transmitida entre generaciones.')
    add_entry('Etapas del linaje de preparación', 'Abuela · Tradición familiar')
    group('Ingredientes principales').get_by_role('checkbox', name=re.compile('Chile poblano')).check()
    fill('Descripción de Chile poblano', 'Base de la salsa')
    # Alta de ingrediente en un diálogo; se reutiliza el catálogo compartido.
    group('Ingredientes principales').get_by_role('button', name='+ Agregar ingrediente o producto', exact=True).click()
    modal = page.get_by_role('dialog', name='Agregar ingrediente o producto', exact=True)
    modal.get_by_label('Nombre', exact=True).fill('Ingrediente del demo')
    modal.get_by_label('Descripción', exact=True).fill('Producto de prueba')
    modal.get_by_role('button', name='Agregar y seleccionar', exact=True).click()
    expect(modal).not_to_be_visible()
    expect(group('Ingredientes principales').get_by_role('checkbox', name=re.compile('Ingrediente del demo'))).to_be_checked()
    save()
    expect(page.locator('main h1')).to_have_text('Nueva cocinera o cocinero')
    expect(page).to_have_url(person_draft_url)
    tab('Registros relacionados')
    expect(group('Recetas insignia').get_by_role('checkbox', name=re.compile('Receta del demo'))).to_be_checked()
    expect(page.get_by_label('Estudiantes', exact=True)).to_have_value('12')
    group('Mercados vinculados').get_by_role('checkbox', name=re.compile('Mercado del demo')).check()
    group('Colectivo u organización').get_by_role('checkbox').first.check()
    group('Establecimiento vinculado').get_by_role('checkbox').first.check()
    tab('Historia oral y linaje')
    add_entry('Etapas del linaje culinario', 'Bisabuela · Cocina tradicional')
    page.get_by_role('button', name='+ Agregar historia oral', exact=True).click()
    fill('Título del relato 1', 'Memorias de cocina')
    fill('Fecha del relato 1', '2026-10-29')
    fill('Duración del relato 1', '00:01 min')
    wav = b'RIFF' + struct.pack('<I',40) + b'WAVEfmt ' + struct.pack('<IHHIIHH',16,1,1,8000,16000,2,16) + b'data' + struct.pack('<I',4) + bytes(4)
    page.get_by_label('Audio del relato 1', exact=True).set_input_files({'name':'historia.wav','mimeType':'audio/wav','buffer':wav})
    expect(page.locator('.demo-oral audio')).to_be_visible()
    tab('Verificación y respaldo')
    add_entry('Fuentes de respaldo', 'Testimonio comunitario documentado')
    page.get_by_role('checkbox', name='Marcar como verificada en el demo', exact=True).check()
    fill('Fecha de verificación', '2026-10-29')
    fill('Persona que verifica', 'Equipo del demo')
    save()
    person_id = wait_detail('cocineras', 'Cocinera del demo')
    for text in ['La cocina guarda nuestra memoria.', 'Bisabuela · Cocina tradicional','Receta del demo','Mercado del demo','Memorias de cocina','Equipo del demo']:
        expect(page.locator('main')).to_contain_text(text)
    expect(page.locator('audio')).to_have_count(1)
    expect(page.locator('.person-portrait')).to_be_visible()
    page.reload(wait_until='networkidle')
    expect(page.locator('main h1')).to_have_text('Cocinera del demo')
    assert page.locator('.person-portrait').evaluate('el => el.complete && el.naturalWidth > 0')
    assert page.locator('audio').evaluate('el => el.src.startsWith("data:audio/")')
    expect(page.locator('.g-kv')).to_contain_text('Estudiantes documentados')
    expect(page.locator('.g-kv')).to_contain_text('12')
    page.screenshot(path='/tmp/ogp-demo-persona-desktop.png', full_page=True)
    page.get_by_role('link', name='Receta del demo', exact=True).first.click()
    recipe_id = wait_detail('recetas','Receta del demo')
    expect(page.locator('main')).to_contain_text('Cocinera del demo')
    expect(page.locator('main')).to_contain_text('Mercado del demo')
    expect(page.locator('main')).to_contain_text('Ingrediente del demo')
    expect(page.locator('main')).to_contain_text('Abuela · Tradición familiar')
    # Editar un nombre se refleja en los vínculos; desmarcar elimina ambos extremos.
    page.get_by_role('link',name='Editar receta',exact=True).click()
    fill('Nombre de la receta','Receta del demo actualizada')
    tab('Registros relacionados')
    expect(group('Cocineras y cocineros relacionados').get_by_role('checkbox',name=re.compile('Cocinera del demo'))).to_be_checked()
    save()
    wait_detail('recetas','Receta del demo actualizada')
    page.goto(base+'/cocineras/'+person_id,wait_until='networkidle')
    expect(page.locator('main')).to_contain_text('Receta del demo actualizada')
    page.get_by_role('link',name='Mercado del demo',exact=True).first.click()
    market_id=wait_detail('mercados','Mercado del demo')
    expect(page.locator('main')).to_contain_text('Sanitarios')
    expect(page.locator('main')).to_contain_text('Rampas de acceso')
    page.goto(base+'/mapa?municipio=21114',wait_until='networkidle')
    expect(page.locator('.map-results')).to_contain_text('Mercado del demo')
    expect(page.locator('.municipal-canvas svg a circle')).to_have_count(1)
    # Las relaciones se pueden quitar desde el registro inverso.
    page.goto(base+'/admin/recetas/'+recipe_id,wait_until='networkidle')
    tab('Registros relacionados')
    group('Cocineras y cocineros relacionados').get_by_role('checkbox',name=re.compile('Cocinera del demo')).uncheck()
    save()
    wait_detail('recetas','Receta del demo actualizada')
    page.goto(base+'/cocineras/'+person_id,wait_until='networkidle')
    expect(page.locator('main')).not_to_contain_text('Receta del demo actualizada')
    # Los borradores sobreviven a recargar y cancelar un registro relacionado.
    page.goto(base+'/admin/recetas/nueva',wait_until='networkidle')
    fill('Nombre de la receta','Borrador sin terminar')
    fill('Descripción','Contenido que debe conservarse')
    page.get_by_role('button',name='Guardar borrador',exact=True).click()
    expect(page.get_by_role('status').filter(has_text='Borrador guardado')).to_be_visible()
    draft_url=page.url
    page.reload(wait_until='networkidle')
    expect(page.get_by_label('Descripción',exact=True)).to_have_value('Contenido que debe conservarse')
    tab('Registros relacionados')
    group('Otras recetas relacionadas').get_by_role('button',name='+ Registrar receta',exact=True).click()
    expect(page).not_to_have_url(draft_url)
    page.get_by_role('link',name='← Volver al registro anterior',exact=True).click()
    expect(page).to_have_url(draft_url)
    expect(page.get_by_label('Nombre de la receta',exact=True)).to_have_value('Borrador sin terminar')
    # Un nombre duplicado se rechaza sin perder el formulario.
    tab('Identidad y descripción')
    fill('Nombre de la receta','Mole poblano')
    choose_municipality('Puebla')
    save()
    expect(page.get_by_role('alert')).to_contain_text('Ya existe un registro')
    expect(page).to_have_url(draft_url)
    # Dos recetas nuevas anidadas conservan borradores independientes.
    tab('Identidad y descripción')
    fill('Nombre de la receta','Receta padre del demo')
    tab('Registros relacionados')
    group('Otras recetas relacionadas').get_by_role('button',name='+ Registrar receta',exact=True).click()
    fill('Nombre de la receta','Receta secundaria del demo')
    choose_municipality('Puebla')
    save()
    expect(page).to_have_url(draft_url)
    tab('Registros relacionados')
    expect(group('Otras recetas relacionadas').get_by_role('checkbox',name=re.compile('Receta secundaria del demo'))).to_be_checked()
    save()
    wait_detail('recetas','Receta padre del demo')
    expect(page.locator('main')).to_contain_text('Receta secundaria del demo')
    # Captura y mapa utilizables sin desbordamiento en teléfono.
    page.set_viewport_size({'width':390,'height':844})
    page.goto(base+'/admin/mercados/'+market_id,wait_until='networkidle')
    tab('Origen y ubicación')
    expect(page.locator('.demo-location-selected')).to_contain_text('Ubicación marcada')
    page.screenshot(path='/tmp/ogp-demo-registro-mobile.png',full_page=True)
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Desbordamiento de captura móvil'
    page.goto(base+'/mapa?municipio=21114',wait_until='networkidle')
    expect(page.locator('.map-results')).to_contain_text('Mercado del demo')
    assert page.evaluate('document.documentElement.scrollWidth <= window.innerWidth'), 'Desbordamiento del mapa móvil'
    # Las páginas públicas y la búsqueda usan las altas locales sin pedir la API.
    page.goto(base+'/buscar?q=Memorias%20de%20cocina',wait_until='networkidle')
    expect(page.locator('.catalog-grid')).to_contain_text('Cocinera del demo')
    for route in ['/','/recetas','/mercados','/cocineras','/reportes','/red-conocimiento','/proteccion-legal','/acerca','/podcast']:
        page.goto(base+route,wait_until='networkidle')
        expect(page.locator('main h1')).to_be_visible()
    # Exportación contiene las altas y los archivos; el navegador aislado no deja datos de prueba.
    page.goto(base+'/admin',wait_until='networkidle')
    with page.expect_download() as download:
        page.get_by_role('button',name='Descargar copia de los registros',exact=True).click()
    import json
    export=json.load(open(download.value.path()))
    assert any(r['n']=='Cocinera del demo' for r in export['records'])
    assert any(r.get('photos') for r in export['records'] if r['n']=='Cocinera del demo')
    # Si se agota el almacenamiento se conserva el formulario y se muestra el error.
    page.goto(base+'/admin/mercados/nueva',wait_until='networkidle')
    fill('Nombre del mercado','Mercado sin espacio')
    choose_municipality('Puebla')
    page.evaluate("""() => {
      const original=IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put=function(...args) {
        if(this.name==='records') throw new DOMException('Sin espacio simulado','QuotaExceededError');
        return original.apply(this,args);
      };
    }""")
    failed_url=page.url
    save()
    expect(page.get_by_role('alert')).to_contain_text('No se pudo guardar en este navegador')
    expect(page).to_have_url(failed_url)
    tab('Identidad y descripción')
    expect(page.get_by_label('Nombre del mercado',exact=True)).to_have_value('Mercado sin espacio')
    assert not errors, errors
    assert not api_calls, api_calls
    context.close()
    browser.close()
    print('Demo verificado: tres registros, vínculos y retorno, edición, archivos, borradores, recarga, exportación, mapa y móvil; ninguna llamada a la API.')
