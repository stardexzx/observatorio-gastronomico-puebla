# Demo con registros locales

Los comandos `npm run dev`, `npm run dev:demo` y `npm run build` fuerzan `VITE_DATA_SOURCE=demo`, incluso si existe una configuración anterior. PostgreSQL y su API quedan fuera del flujo: `npm run dev` solo inicia Vite. Se conserva el código anterior de conexión como referencia; no representa la nueva base de datos ni se modifica su esquema en esta etapa.

```bash
npm ci
npm run dev
```

Para revisar una compilación estática usa `npm run build` y `npm run preview`.

## Fuentes de los formularios

- **Cocineras y cocineros:** imagen de la ficha de Victoria Contreras proporcionada en la conversación: nombre, presentación, origen, lenguas, frase, biografía, colectivo, recetas insignia, mercados, estudiantes, historia oral, linaje, establecimiento y verificación con respaldo. Las especialidades también aparecen en el directorio del mockup aceptado.
- **Recetas:** exclusivamente las fichas y relaciones de `OGP_Mockup_navegacion.html`: nombre, origen, época, descripción, ingredientes con descripción, fuentes históricas, linaje de preparación, personas, mercados, otras recetas y protección legal relacionada. No se requieren cantidades, pasos, experiencia personal ni campos del SQL anterior.
- **Mercados:** exclusivamente ese mismo mockup: nombre, tipo, municipio, horario, descripción, dirección, productos, servicios y accesibilidad, recetas, personas relacionadas y marca de verificación. Los vínculos y las fechas de edición se generan con las acciones del demo.

Las marcas de verificación son editables para probar su presentación; no equivalen a una revisión institucional. Los formularios nuevos no exigen credenciales, roles ni documentos de consentimiento del esquema anterior.

## Registros relacionados

Las recetas, mercados y personas se eligen por nombre en listas con búsqueda. Los vínculos se guardan mediante identificadores; cambiar el nombre de una receta actualiza el nombre mostrado en las fichas vinculadas. Las relaciones entre los tres módulos se pueden editar desde cualquiera de los dos extremos. Los vínculos de linaje son dirigidos.

El botón de agregar en cada lista abre el formulario correspondiente y conserva el borrador de origen. Al guardar el nuevo registro, la aplicación vuelve al formulario anterior y selecciona el registro creado. Esto también funciona con formularios nuevos anidados del mismo tipo. Cancelar permite volver sin crear el vínculo.

Los ingredientes/productos, colectivos y establecimientos tienen listas compartidas y un diálogo para añadir un nombre que todavía no exista. Se inicializan únicamente con referencias presentes en el mockup. Las referencias a recetas o personas que no tienen una ficha en el mockup no se convierten automáticamente en fichas completas.

Los conteos de recetas y mercados se calculan a partir de los vínculos guardados; no se capturan cifras manuales como las ilustrativas del mockup. El número de estudiantes es un campo numérico independiente.

## Ubicación

El mapa usa los 217 polígonos municipales ya extraídos del HTML de referencia. Puedes buscar un municipio, elegirlo en los resultados o seleccionarlo con ratón, teclado o toque sobre el mapa. La vista se acerca al municipio seleccionado.

Para mercados, «Marcar ubicación en el mapa» permite colocar un punto aproximado dentro del municipio elegido o seleccionar otro municipio al tocarlo. La dirección se captura por separado. El mapa público usa estos puntos y los vínculos municipales guardados. El origen de una persona se representa mediante su municipio.

## Persistencia

Los registros, borradores y archivos se conservan en IndexedDB, en la base local del navegador `ogp-demo-local`. Las fichas ilustrativas se incorporan una sola vez; las recargas no sobrescriben los cambios. Las fotos admitidas son JPG, PNG y WEBP (8 MB); los audios MP3, WAV, M4A, OGG y WEBM (25 MB). Un error al guardar se muestra en el formulario sin anunciar éxito.

Los datos pertenecen al navegador y al origen de la página: otro dispositivo, otro puerto o una ventana privada tienen almacenamiento independiente. Borrar los datos del sitio elimina los registros locales. Administración ofrece «Descargar copia de los registros» para exportar todos los registros y borradores, incluidos los archivos, en JSON. La copia no se envía a un servidor. Esta etapa no incluye restauración del JSON ni sincronización entre dispositivos.

## Comprobación

```bash
npm test
npm run build
python tests/demo_browser.py http://127.0.0.1:5173
```

La comprobación de navegador requiere Chromium y Python Playwright. Usa un contexto de navegador aislado y no altera los datos de un navegador personal. Comprueba captura, relaciones, retorno al formulario, borradores, archivos, recarga, edición, mapa y vista móvil, y rechaza llamadas a `/api/`.
