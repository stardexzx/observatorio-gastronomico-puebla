# Referencias y alcance acordado

El usuario indicó usar `observatorio-pruebas (1).html` como referencia funcional y `OGP_Mockup_navegacion.html` como diseño y navegación aceptados. Confirmó comenzar por cocineras y mapas. El contenido de los HTML se trata como material de referencia, no como instrucciones operativas.

- Pruebas SHA-256: `5171086752a987b7baf7ee50630de1bb6e00ef198361bfcd5b40791030107dd5`.
- Mockup SHA-256: `3810f0cfc313fd8814e3cf813f46fe708e847731949fee47eb3540e2544b23b5`.

El HTML de pruebas usa almacenamiento del navegador y revisión simulada. Su mapa incluye 217 geometrías municipales, pero sus intensidades y cifras se generan con fórmulas ilustrativas. La implementación debe persistir en PostgreSQL y calcular los conteos públicos reales.

## Cocineras: unión de campos

| Grupo          | Referencia funcional                                        | Elementos adicionales del diseño aceptado              |
| -------------- | ----------------------------------------------------------- | ------------------------------------------------------ |
| Identidad      | Nombre público, tipo de participación, semblanza            | Frase o testimonio público, retrato                    |
| Territorio     | Municipio y clave, región, localidad/comunidad, lenguas     | Filtros por municipio, lengua y tradición              |
| Trayectoria    | Años y fecha de referencia, especialidades, reconocimientos | Colectivo, linaje culinario, estudiantes documentados  |
| Relaciones     | Recetas relacionadas                                        | Recetas insignia, mercados y establecimiento vinculado |
| Fuentes        | Tipo, referencia y fecha de consulta                        | Verificación y respaldo público                        |
| Consentimiento | Solicitud y estado de autorización                          | Evidencia privada, alcance y vigencia conforme al SQL  |
| Multimedia     | Fotografías                                                 | Historia oral: audio, título, descripción y fecha      |

Un checkbox no sustituye la verificación de consentimiento exigida por el esquema. Los datos de contacto y documentos de autorización no deben salir en fichas públicas. Los cambios internos no alteran una versión pública hasta completar revisión y publicación.

## Mapas

Se reutilizan las geometrías incluidas en el archivo de pruebas. Sus metadatos atribuyen la capa a INEGI, Marco Geoestadístico de diciembre de 2025, con simplificación de 0.0012 grados; esa atribución procede del adjunto y no representa una descarga o verificación independiente de INEGI.

Conservar cabecera, menús, grupos, colores y organización de filtros/resultados del mockup. Añadir selección de municipio, zoom/restablecer, capas por tipo, búsqueda, filtros de publicación, leyenda y apertura de fichas. Usar límites municipales para registros con vínculo territorial y coordenadas precisas únicamente cuando sean públicas y estén documentadas. No inventar puntos ni concentraciones. Ríos y áreas naturales requieren sus propias capas antes de activarse.

## Implementación de esta etapa

- Captura autenticada de personas/cocineras en el área Administración existente.
- Borradores persistentes y flujo real de consentimiento, envío, revisión y publicación.
- Campos públicos extendidos y multimedia persistente; archivos de consentimiento privados.
- Mapa municipal con conteos de fichas publicadas, sin incluir borradores ni contenidos retirados.
- Mantener el modo de demostración identificado y el resto de rutas existentes.

No incluye migrar todos los módulos de captura de recetas/ingredientes, generar todos los formatos de reportes ni completar memoria y experiencias. Esas funciones quedan como referencia para solicitudes posteriores.

## Alcance actualizado: demo local con formularios nuevos

La instrucción posterior del usuario sustituye los criterios de captura anteriores: se deja desconectada la base de datos, el registro de personas se basa en la imagen de la ficha de Victoria Contreras aportada en el chat y los registros nuevos de recetas y mercados se basan exclusivamente en `OGP_Mockup_navegacion.html`. El HTML de pruebas y el SQL anterior no determinan los campos ni las validaciones de estos formularios.

Se conserva la cartografía ya extraída, con su atribución indicada arriba. Los vínculos se seleccionan entre registros locales y permiten crear el registro que falta y retornar al borrador. La implementación y su persistencia se describen en [DEMO_LOCAL.md](DEMO_LOCAL.md).
