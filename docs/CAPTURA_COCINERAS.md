> Documento de la integración PostgreSQL anterior. La etapa actual usa el [demo local](DEMO_LOCAL.md), con formularios nuevos y sin conexión a esta base.

# Captura de cocineras, cocineros y colectivos

Esta etapa toma el flujo de registro del HTML de pruebas, reúne sus campos con los del diseño aceptado y los guarda en PostgreSQL. Conserva la navegación superior del Observatorio. Los datos públicos se consultan en `/cocineras`; el equipo autorizado trabaja en `/admin`.

## Preparar o actualizar el proyecto

```bash
npm ci
npm run configurar
npm run db:up
npm run dev
```

`configurar` conserva los valores locales existentes y añade los de edición que falten. No imprime contraseñas. `db:up` instala las migraciones adicionales e incorpora los 217 municipios del HTML. No borra registros, geometrías existentes ni volúmenes.

Para entrar en Administración usa `EDITOR_EMAIL` y `EDITOR_PASSWORD` de la configuración local `.env`. Puedes definirlos antes del primer arranque. La contraseña inicial debe tener al menos 12 caracteres; el generador crea una aleatoria. El archivo `.env` está excluido de Git y debe conservarse de forma privada.

La cuenta inicial de desarrollo combina captura, revisión, publicación y verificación de consentimientos, de acuerdo con los roles del esquema. Volver a ejecutar las migraciones no reinicia su contraseña ni restaura permisos retirados. La contraseña se guarda en la base como un hash scrypt; las sesiones de ocho horas usan cookies HttpOnly/SameSite y tokens aleatorios cuyo hash se guarda en PostgreSQL.

La interfaz de altas de usuarios y asignación de roles aún no forma parte de esta etapa. En producción configura identidades y roles del equipo según su responsabilidad, conserva el nombre de host en el proxy, usa HTTPS y establece `COOKIE_SECURE=1`. Las credenciales del administrador de PostgreSQL solo se utilizan para migraciones, no para atender solicitudes de la web.

## Registrar y publicar

1. Entra en **Administración → Nuevo registro**.
2. Completa el nombre público, tipo y municipio; ya puedes guardar un borrador.
3. Recorre las seis secciones. Los campos opcionales del diseño aceptado no deben rellenarse con cifras o textos inventados.
4. Adjunta fotografías, historia oral y evidencia privada de consentimiento.
5. Guarda el borrador. Verifica el consentimiento con una cuenta autorizada.
6. Envía la ficha a revisión. Una cuenta con permiso de revisión puede validarla o solicitar correcciones.
7. Una cuenta con permiso de publicación puede publicar la versión validada. Entonces aparecerá en el directorio, las relaciones y el mapa.

Los cambios posteriores se guardan en el borrador. No alteran la versión pública hasta completar otro envío, validación y publicación. El control de versiones impide sobrescribir una edición guardada desde otra sesión; ante un conflicto, copia los cambios que quieras conservar y vuelve a abrir la ficha.

## Campos del registro

- **General:** nombre, tipo de participación, semblanza, trayectoria, frase o testimonio y colectivo.
- **Territorio:** municipio mediante lista o mapa, comunidad/localidad, región documentada y lenguas. No se publica una ubicación personal precisa.
- **Trayectoria y saberes:** experiencia con fecha de referencia, especialidades, reconocimientos, linaje culinario, establecimiento y estudiantes documentados.
- **Recetas y vínculos:** recetas insignia y mercados publicados, con búsqueda. Los enlaces y conteos públicos se calculan con las relaciones que continúan visibles.
- **Fuentes y consentimiento:** tipo de fuente, cita pública, fecha de consulta, persona que autoriza, representación, fecha, vencimiento, alcance, usos permitidos y documento de evidencia.
- **Fotografías e historia oral:** archivos seleccionados para la siguiente revisión, con título, descripción, autoría, licencia, texto alternativo de imágenes y fecha cuando se conoce.

Puedes guardar borradores incompletos. Para enviar se requieren semblanza o trayectoria, comunidad, experiencia, especialidades, fuente y consentimiento vigente. Recetas relacionadas, fotografías, historia oral, frase, colectivo y cifras de estudiantes son opcionales.

## Archivos y autorización

- Fotos: JPG, PNG o WEBP, hasta 10 MB por archivo.
- Historia oral: MP3, M4A o WAV, hasta 50 MB por archivo.
- Evidencia privada: PDF o imagen admitida, hasta 10 MB.

Se comprueba el formato de los bytes y se requiere crédito/licencia para publicar multimedia; las imágenes también necesitan texto alternativo. Esta implementación conserva los archivos en PostgreSQL para que sobrevivan a la recarga del navegador y al reinicio de la aplicación.

La evidencia solo se descarga mediante una sesión autorizada. Nunca aparece en las fichas o descargas públicas. Revocar el consentimiento oculta la ficha y sus archivos públicos; retirar una publicación también elimina su contribución a los resultados públicos. El historial y los borradores permanecen para el equipo autorizado.

## Mapa municipal

El mapa del área pública, Inicio y Reportes usa las geometrías del adjunto, con la atribución y simplificación descritas en `REFERENCIAS.md`. Cuenta únicamente versiones públicas activas con vínculo municipal. Permite capas por tipo, selección de municipio, búsqueda, periodo de publicación, zoom, desplazamiento, restablecimiento y apertura de fichas. Las personas se vinculan al municipio; los puntos precisos solo representan mercados con coordenadas públicas.

Una ficha puede vincularse a varios municipios, de modo que la suma de cantidades por municipio no necesariamente coincide con el número de fichas únicas. La interfaz indica cuántos registros carecen de vínculo municipal mediante la diferencia entre el total y los registros con vínculo. Los resultados muestran hasta 100 fichas por consulta; se pueden afinar con municipio y búsqueda.

La región no se deduce mediante las fórmulas ilustrativas del HTML de pruebas: se captura según la documentación. No se habilitan capas de ríos o áreas naturales sin sus datasets.

## Comprobar esta etapa

```bash
npm test
OGP_BROWSER_TESTS=1 npm run test:db
npm run db:test
npm run build
```

Las pruebas de integración crean bases temporales con registros sintéticos y las eliminan al terminar. Comprueban acceso, origen de solicitudes, permisos, formatos, persistencia, versiones, consentimiento, publicación, retirada, 217 geometrías, conteos, formularios y navegación de escritorio/móvil. No cargan personas ficticias en la base de trabajo.
