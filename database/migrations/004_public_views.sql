-- Lecturas públicas sobre revisiones aprobadas, nunca sobre borradores.
BEGIN;
SET LOCAL search_path = ogp, public;

ALTER TABLE registro_revisiones ADD COLUMN busqueda tsvector GENERATED ALWAYS AS
 (jsonb_to_tsvector('spanish'::regconfig, contenido_publico, '["string"]'::jsonb)) STORED;
CREATE INDEX revision_busqueda_gin ON registro_revisiones USING gin (busqueda);

CREATE FUNCTION archivo_publicable(p_archivo uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 SELECT EXISTS(SELECT 1 FROM archivos a WHERE a.id=p_archivo AND a.estado='disponible'
   AND a.visibilidad='publico' AND a.licencia IS NOT NULL AND a.url_publica IS NOT NULL)
 AND NOT EXISTS(SELECT 1 FROM consentimiento_archivos_autorizados ca
   WHERE ca.archivo_id=p_archivo AND NOT consentimiento_valido(ca.consentimiento_id));
$$;

CREATE VIEW v_fichas_publicas AS
SELECT reg.id AS registro_id,reg.tipo,rev.id AS revision_id,p.publicado_en,
 rev.contenido_publico || jsonb_build_object(
  'fuentes',coalesce((SELECT jsonb_agg(jsonb_build_object('cita',f.cita_publica,
     'afirmacion',f.afirmacion,'apartado',f.apartado)) FROM revision_fuentes f WHERE f.revision_id=rev.id),'[]'::jsonb),
  'territorios',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.territorio_id,
     'nombre',t.nombre_en_revision,'tipo',t.tipo_territorio_en_revision,'vinculo',t.tipo_vinculo))
      FROM revision_territorios t WHERE t.revision_id=rev.id),'[]'::jsonb),
  'relaciones',coalesce((SELECT jsonb_agg(jsonb_build_object('registro_id',d.registro_destino_id,
     'relacion',d.relacion,'descripcion',d.descripcion_publica)) FROM revision_dependencias d
     WHERE d.revision_id=rev.id AND ficha_visible(d.registro_destino_id)),'[]'::jsonb),
  'archivos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'nombre',a.nombre,
     'url',a.url_publica,'tipo_mime',a.tipo_mime,'duracion_segundos',a.duracion_segundos,
     'credito',a.credito,'licencia',a.licencia,'funcion',ra.funcion,
     'texto_alternativo',ra.texto_alternativo,'descripcion',ra.descripcion_publica,'orden',ra.orden))
     FROM revision_archivos ra JOIN archivos a ON a.id=ra.archivo_id
     WHERE ra.revision_id=rev.id AND archivo_publicable(a.id)),'[]'::jsonb)
 ) AS contenido
FROM publicaciones p JOIN registros reg ON reg.id=p.registro_id
JOIN registro_revisiones rev ON rev.id=p.revision_id
WHERE p.retirado_en IS NULL AND ficha_visible(reg.id);

COMMENT ON VIEW v_fichas_publicas IS
 'Solo versiones aprobadas. Relaciones opcionales privadas se omiten; archivos revocados no se entregan.';

CREATE VIEW v_indicadores_publicos AS
SELECT tipo,count(*) AS registros_publicados FROM v_fichas_publicas GROUP BY tipo;

CREATE VIEW v_registros_por_municipio AS
SELECT m.territorio_id AS municipio_id,m.cvegeo,f.tipo,t.tipo_vinculo,
 count(DISTINCT f.registro_id) AS registros
FROM v_fichas_publicas f JOIN revision_territorios t ON t.revision_id=f.revision_id
LEFT JOIN localidades_puebla l ON l.territorio_id=t.territorio_id
JOIN municipios_puebla m ON m.territorio_id=coalesce(l.municipio_id,t.territorio_id)
GROUP BY m.territorio_id,m.cvegeo,f.tipo,t.tipo_vinculo;

CREATE VIEW v_mercados_mapa AS
SELECT f.registro_id,f.contenido#>>'{ficha,nombre}' AS nombre,
 f.contenido#>>'{ficha,tipo}' AS tipo,
 f.contenido#>>'{ficha,estado_operativo}' AS estado_operativo,
 (f.contenido#>>'{detalle,ubicacion,municipio_id}')::uuid AS municipio_id,
 (f.contenido#>>'{detalle,ubicacion,longitud}')::double precision AS longitud,
 (f.contenido#>>'{detalle,ubicacion,latitud}')::double precision AS latitud,
 f.contenido#>>'{detalle,ubicacion,precision}' AS precision,
 f.contenido#>'{detalle,ubicacion,horarios}' AS horarios
FROM v_fichas_publicas f WHERE f.tipo='mercado';

CREATE VIEW v_red_conocimiento AS
SELECT f.registro_id AS origen_id,d.registro_destino_id AS destino_id,
 d.relacion,d.descripcion_publica
FROM v_fichas_publicas f JOIN revision_dependencias d ON d.revision_id=f.revision_id
WHERE ficha_visible(d.registro_destino_id);

CREATE VIEW v_primeras_publicaciones AS
SELECT registro_id,min(publicado_en) AS primera_publicacion FROM publicaciones GROUP BY registro_id;

CREATE VIEW v_estado_editorial AS
SELECT r.id,r.tipo,r.creado_por,r.archivado_en,
 CASE WHEN r.archivado_en IS NOT NULL THEN 'archivado'
      WHEN rr.id IS NULL THEN 'borrador'
      WHEN ev.dictamen='correcciones' THEN 'correcciones'
      WHEN p.revision_id=rr.id AND p.retirado_en IS NULL THEN 'publicado'
      WHEN ev.dictamen='validado' THEN 'validado'
      ELSE 'en_revision' END AS estado_ultima_revision,
 rr.id AS ultima_revision_id,rr.numero,p.revision_id AS revision_publica_id
FROM registros r
LEFT JOIN LATERAL (SELECT * FROM registro_revisiones x WHERE x.registro_id=r.id ORDER BY numero DESC LIMIT 1) rr ON true
LEFT JOIN evaluaciones_revision ev ON ev.revision_id=rr.id
LEFT JOIN publicaciones p ON p.registro_id=r.id AND p.retirado_en IS NULL;

-- Entrada de lectura limitada: no admite actores ni SQL arbitrario.
-- Un rol PostgreSQL de lectura puede recibir EXECUTE aquí sin acceso a tablas internas.
CREATE FUNCTION consultar_fichas(p_tipo text DEFAULT NULL,p_busqueda text DEFAULT NULL,
 p_limite integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS TABLE(registro_id uuid,tipo text,contenido jsonb,publicado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
BEGIN
 IF p_limite<1 OR p_limite>100 OR p_offset<0 OR p_limite IS NULL OR p_offset IS NULL THEN
   RAISE EXCEPTION 'Usar límite 1..100 y desplazamiento no negativo'; END IF;
 RETURN QUERY SELECT f.registro_id,f.tipo::text,f.contenido,f.publicado_en
 FROM ogp.v_fichas_publicas f JOIN ogp.registro_revisiones rr ON rr.id=f.revision_id
 WHERE (p_tipo IS NULL OR f.tipo=p_tipo)
   AND (p_busqueda IS NULL OR length(btrim(p_busqueda))=0
     OR rr.busqueda @@ websearch_to_tsquery('spanish'::regconfig,p_busqueda))
 ORDER BY f.publicado_en DESC,f.registro_id LIMIT p_limite OFFSET p_offset;
END $$;

CREATE FUNCTION consultar_indicadores() RETURNS TABLE(tipo text,registros_publicados bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
 SELECT tipo,registros_publicados FROM ogp.v_indicadores_publicos;
$$;

CREATE FUNCTION consultar_mapa(p_municipio uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
 SELECT jsonb_build_object('type','FeatureCollection','features',coalesce(jsonb_agg(
   jsonb_build_object('type','Feature','id',registro_id,
     'geometry',jsonb_build_object('type','Point','coordinates',jsonb_build_array(longitud,latitud)),
     'properties',jsonb_build_object('nombre',nombre,'tipo',tipo,'estado_operativo',estado_operativo,
       'municipio_id',municipio_id,'precision',precision,'horarios',horarios))),'[]'::jsonb))
 FROM ogp.v_mercados_mapa WHERE p_municipio IS NULL OR municipio_id=p_municipio;
$$;

CREATE FUNCTION consultar_red(p_registro uuid) RETURNS TABLE(origen_id uuid,destino_id uuid,relacion text,descripcion text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
 SELECT origen_id,destino_id,relacion,descripcion_publica FROM ogp.v_red_conocimiento
 WHERE origen_id=p_registro OR destino_id=p_registro;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA ogp FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ogp FROM PUBLIC;
COMMIT;
