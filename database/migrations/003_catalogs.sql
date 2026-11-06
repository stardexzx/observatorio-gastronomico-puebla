-- Catálogos de arranque. Sin usuarios, datos simulados, coordenadas ni instrumentos jurídicos ficticios.
BEGIN;
SET LOCAL search_path = ogp, public;

INSERT INTO tipos_registro(codigo,nombre) VALUES
('preparacion','Preparación'),
('receta','Receta documentada'),
('ingrediente','Ingrediente'),
('variedad','Variedad'),
('persona','Persona'),
('mercado','Mercado o tianguis'),
('expediente','Expediente legal'),
('instrumento','Instrumento legal'),
('podcast','Serie de podcast'),
('episodio','Episodio'),
('institucional','Contenido institucional')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO categorias_preparacion(codigo,nombre) VALUES
('antojitos','Antojitos'),
('guisos','Guisos'),
('moles_salsas','Moles y salsas'),
('sopas_caldos','Sopas y caldos'),
('panes','Panes'),
('dulces_postres','Dulces y postres'),
('bebidas','Bebidas'),
('otra','Otra / por clasificar')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO categorias_ingrediente(codigo,nombre) VALUES
('vegetal','Vegetal'),
('animal','Animal'),
('hongo','Hongo'),
('mineral','Mineral'),
('elaborado','Producto elaborado'),
('otra','Otra / por clasificar')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO unidades(codigo,nombre) VALUES
('g','Gramo'),
('kg','Kilogramo'),
('ml','Mililitro'),
('l','Litro'),
('pieza','Pieza'),
('hectarea','Hectárea'),
('tonelada','Tonelada')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tecnicas(codigo,nombre) VALUES
('asado','Asado'),
('hervido','Hervido'),
('fritura','Fritura'),
('horneado','Horneado'),
('tatemado','Tatemado'),
('molienda','Molienda'),
('fermentacion','Fermentación'),
('otra','Otra documentada')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_participacion(codigo,nombre) VALUES
('cocina','Cocinera/o'),
('produccion','Productor/a'),
('comercio','Comerciante'),
('saberes','Portador/a o transmisor/a de saberes'),
('otra','Otra documentada')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO participaciones_receta(codigo,nombre) VALUES
('comparte_saber','Comparte el saber'),
('prepara','Prepara la variante'),
('testimonio','Aporta testimonio'),
('otra','Otra documentada')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO participaciones_episodio(codigo,nombre) VALUES
('conduccion','Conducción'),
('entrevista','Entrevista'),
('invitado','Invitado/a'),
('produccion','Producción'),
('otra','Otra')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO servicios(codigo,nombre) VALUES
('sanitarios','Sanitarios'),
('estacionamiento','Estacionamiento'),
('agua','Agua'),
('residuos','Manejo de residuos'),
('accesibilidad','Accesibilidad descrita')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_instrumento_legal(codigo,nombre) VALUES
('do','Denominación de origen'),
('ig','Indicación geográfica'),
('declaratoria','Declaratoria'),
('otro','Otro instrumento documentado')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_territorio(codigo,nombre) VALUES
('pais','País'),
('estado','Estado / división administrativa'),
('municipio','Municipio'),
('localidad','Localidad'),
('region','Región')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_temporada(codigo,nombre) VALUES
('produccion','Producción'),
('cosecha','Cosecha'),
('recoleccion','Recolección'),
('disponibilidad','Disponibilidad comercial'),
('mayor_uso','Mayor uso gastronómico')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_fuente(codigo,nombre) VALUES
('entrevista','Entrevista de campo'),
('observacion','Observación de campo'),
('historico','Documento histórico'),
('publicacion','Publicación / recetario'),
('oficial','Publicación oficial'),
('datos','Conjunto de datos / API')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO roles(codigo,nombre) VALUES
('capturista','Capturista'),
('revisor','Revisor'),
('publicador','Publicador'),
('administrador','Administrador')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO plantillas_reporte(codigo,nombre) VALUES
('panorama','Panorama general'),
('cobertura','Cobertura territorial'),
('calidad','Calidad de datos'),
('recetas','Preparaciones y recetas'),
('ingredientes','Ingredientes y variedades'),
('personas','Personas'),
('mercados','Mercados y tianguis'),
('legal','Protección legal'),
('podcast','Listado de podcast')
ON CONFLICT (codigo) DO NOTHING;


INSERT INTO permisos(codigo,modulo,accion)
SELECT t.codigo || '.' || a.accion,t.codigo,a.accion
FROM tipos_registro t CROSS JOIN (VALUES ('crear'),('editar'),('enviar'),('validar'),('publicar'),('retirar')) a(accion)
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO permisos(codigo,modulo,accion) VALUES
 ('usuarios.administrar','usuarios','administrar'),('catalogos.administrar','catalogos','administrar'),
 ('auditoria.consultar','auditoria','consultar'),('importaciones.importar','importaciones','importar'),
 ('consentimientos.validar','consentimientos','validar'),('consentimientos.consultar','consentimientos','consultar'),
 ('personas.contactos','persona','contactos'),('reportes.generar','reportes','generar')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permisos p
WHERE (r.codigo='capturista' AND p.accion IN ('crear','editar','enviar'))
 OR (r.codigo='revisor' AND p.accion='validar' AND p.modulo IN (SELECT codigo FROM tipos_registro))
 OR (r.codigo='publicador' AND p.accion IN ('publicar','retirar'))
 OR (r.codigo='administrador' AND p.modulo IN ('usuarios','catalogos','auditoria'))
ON CONFLICT DO NOTHING;

-- Facultades sensibles opcionales: se asignan como roles explícitos, no excepciones ocultas.
INSERT INTO roles(codigo,nombre) VALUES
 ('verificador_consentimientos','Verificador de consentimientos'),
 ('lector_datos_restringidos','Lector de datos restringidos'),
 ('importador','Importador de establecimientos'),('generador_reportes','Generador de reportes')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permisos p
WHERE (r.codigo='verificador_consentimientos' AND p.modulo='consentimientos')
 OR (r.codigo='lector_datos_restringidos' AND p.codigo IN ('consentimientos.consultar','personas.contactos'))
 OR (r.codigo='importador' AND p.codigo='importaciones.importar')
 OR (r.codigo='generador_reportes' AND p.codigo='reportes.generar')
ON CONFLICT DO NOTHING;
COMMIT;
