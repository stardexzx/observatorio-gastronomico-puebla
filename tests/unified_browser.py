"""Comprueba el panel unificado con sesión sintética y PostgreSQL aislado."""
import sys,json,re
from playwright.sync_api import sync_playwright,expect
with open(sys.argv[1]) as f: session=json.load(f)
origin=session['origin']
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    context=browser.new_context(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    context.add_cookies([{'name':session['name'],'value':session['value'],'url':origin,'httpOnly':True,'sameSite':'Lax'}])
    page=context.new_page(); page.set_default_navigation_timeout(60000); errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    routes=['/','/recetas','/ingredientes','/cocineras','/podcast','/recetario','/reportes','/mercados','/proteccion-legal','/red-conocimiento','/mapa','/memoria','/acerca','/buscar','/integracion','/administracion/roles']
    for route in routes:
        response=page.goto(origin+route,wait_until='networkidle')
        assert response.status==200,(route,response.status)
        expect(page.locator('h1').first).to_be_visible()
        text=page.locator('body').inner_text()
        assert 'Application error' not in text,route
        assert 'No fue posible cargar' not in text,route
        if route=='/recetario':
            expect(page.locator('body')).to_contain_text('Archivo pendiente de adjuntar')
            expect(page.get_by_label('Elegir recetario',exact=True)).to_have_count(0)
            pdf=page.request.get(origin+'/api/recetarios/cocina-dig-2')
            assert pdf.status==404
            assert 'aún no está disponible' in pdf.json()['error']
    # El catálogo duplicado procede del creador, con registros reales de su API.
    page.goto(origin+'/recetas',wait_until='networkidle')
    expect(page.locator('body')).to_contain_text('Receta autoritaria de integración')
    page.goto(origin+'/recetas/'+session['recipeId'],wait_until='networkidle')
    expect(page.locator('body')).to_contain_text('Receta autoritaria de integración')
    # La migración conserva originales y da prioridad al catálogo nuevo ante duplicados.
    page.goto(origin+'/mercados',wait_until='networkidle')
    page.evaluate("""async()=>{
      const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('ogp-demo-local',1);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
      await new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite');const store=tx.objectStore('records');
       const rows=[
        {id:'legacy-duplicate',resource:'recetas',n:'Receta autoritaria de integración',municipalityCode:'21114',m:'Puebla',d:'Esta versión anterior debe perder frente al catálogo autor'},
        {id:'legacy-new',resource:'recetas',n:'Receta anterior conservada',municipalityCode:'21114',m:'Puebla',d:'Información anterior que se importa',steps:['Paso previo']},
        {id:'legacy-person',resource:'cocineras',n:'Portadora anterior temporal',municipalityCode:'21114',m:'Puebla',rol:'Cocinera tradicional',bio:'Memoria anterior',q:'Frase heredada',est:7,languages:['Español'],esp:['Tamales'],oralRecords:[{title:'Relato anterior',url:'',date:'2024-01-01',duration:'10 min'}],lineage:[{label:'Abuela: cocina tradicional'}]}
       ];rows.forEach(r=>store.put({...r,key:r.resource+':'+r.id,seeded:false}));tx.oncomplete=resolve;tx.onerror=reject;});db.close();
    }""")
    page.goto(origin+'/integracion',wait_until='networkidle')
    expect(page.locator('body')).to_contain_text('Ya existe: se conserva la ficha actual')
    with page.expect_download() as download:
        page.get_by_role('button',name='Descargar respaldo JSON',exact=True).click()
    with open(download.value.path()) as f: backup=json.load(f)
    assert any(r.get('n')=='Receta anterior conservada' for r in backup['records'])
    page.get_by_role('button',name=re.compile('Seleccionar disponibles')).click()
    expect(page.get_by_role('button',name='Importar selección (2)',exact=True)).to_be_enabled()
    page.get_by_role('button',name='Importar selección (2)',exact=True).click()
    expect(page.locator('body')).to_contain_text('Importada como borrador en recetas.')
    expect(page.locator('body')).to_contain_text('Importada como borrador en este navegador.')
    page.reload(wait_until='networkidle')
    expect(page.get_by_role('button',name='Seleccionar disponibles (0)',exact=True)).to_be_visible()
    assert page.evaluate("""()=>JSON.parse(localStorage.getItem('observatorio-cooks-v1')).some(r=>r.name==='Portadora anterior temporal' && r.quote==='Frase heredada' && r.studentCount===7)""")
    page.goto(origin+'/recetas',wait_until='networkidle')
    expect(page.locator('body')).to_contain_text('Receta anterior conservada')

    # Los módulos propios navegan dentro de la misma aplicación Next.
    page.goto(origin+'/mercados',wait_until='networkidle')
    page.locator('a.catalog-card').first.click()
    expect(page.locator('h1')).to_contain_text('Mercado')
    page.goto(origin+'/admin/mercados/nueva',wait_until='networkidle')
    page.get_by_label('Nombre del mercado',exact=False).fill('Mercado integrado de prueba')
    page.get_by_label('Descripción',exact=True).fill('Captura local con catálogos del autor')
    page.get_by_role('button',name=re.compile('Origen y ubicación')).click()
    page.get_by_label('Buscar municipio',exact=True).fill('Puebla')
    page.locator('.demo-municipality-results').get_by_role('button',name='Puebla',exact=True).click()
    page.get_by_role('button',name=re.compile('Registros relacionados')).click()
    page.get_by_role('group',name='Recetas relacionadas',exact=True).get_by_role('checkbox',name=re.compile('Receta autoritaria')).check()
    page.get_by_role('button',name=re.compile('Servicios y productos')).click()
    page.get_by_role('button',name=re.compile('Agregar ingrediente o producto')).click()
    dialog=page.get_by_role('dialog')
    dialog.get_by_label('Nombre',exact=True).fill('Producto nuevo del catálogo autor')
    dialog.get_by_role('button',name='Agregar y seleccionar',exact=True).click()
    expect(dialog).not_to_be_visible()
    page.get_by_role('button',name='Guardar registro',exact=True).first.click()
    expect(page.locator('h1')).to_have_text('Mercado integrado de prueba')
    market_url=page.url
    page.reload(wait_until='networkidle')
    expect(page.locator('body')).to_contain_text('Producto nuevo del catálogo autor')
    expect(page.locator('.public-relations')).to_contain_text('Receta autoritaria de integración')
    assert page.evaluate("""()=>JSON.parse(localStorage.getItem('observatorio-ingredients-v1')).some(r=>r.name==='Producto nuevo del catálogo autor' && r.status==='draft')""")
    page.get_by_role('link',name='Editar mercado',exact=True).click()
    page.get_by_label('Nombre del mercado',exact=False).fill('Mercado integrado editado')
    page.get_by_role('button',name='Guardar registro',exact=True).first.click()
    expect(page.locator('h1')).to_have_text('Mercado integrado editado')
    page.goto(market_url,wait_until='networkidle')
    expect(page.locator('h1')).to_have_text('Mercado integrado editado')
    page.goto(origin+'/memoria',wait_until='networkidle')
    expect(page.get_by_role('tab')).to_have_count(5)
    page.get_by_role('tab',name=re.compile('^Siglo XXI')).click()
    expect(page.locator('#tl-event-title')).to_contain_text('UNESCO')
    page.get_by_role('button',name='Siguiente hito',exact=True).click()
    expect(page.locator('#tl-event-title')).to_contain_text('Documentar')
    page.reload(wait_until='networkidle')
    expect(page.locator('#tl-event-title')).to_contain_text('Documentar')
    page.screenshot(path='work/unified-desktop.png',full_page=True)
    page.set_viewport_size({'width':390,'height':844})
    for route in ['/memoria','/mercados','/mapa','/integracion']:
        page.goto(origin+route,wait_until='networkidle')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),route+' desborda en móvil'
    page.goto(origin+'/memoria',wait_until='networkidle')
    page.get_by_label('Ir a una época',exact=True).select_option('siglo-xx')
    expect(page.locator('#tl-event-title')).to_contain_text('taco árabe')
    page.screenshot(path='work/unified-mobile.png',full_page=True)
    assert not errors,errors
    context.close();browser.close()
    print('Chromium: panel, módulos del autor, módulos conservados, navegación, línea de tiempo y móvil correctos.')
