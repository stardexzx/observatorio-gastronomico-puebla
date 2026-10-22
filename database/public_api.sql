-- Adaptador de lectura para el frontend. El esquema importado se conserva intacto.
BEGIN;
CREATE OR REPLACE FUNCTION ogp.consultar_ficha(p_id uuid)
RETURNS TABLE(registro_id uuid,tipo text,contenido jsonb,publicado_en timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
 SELECT registro_id,tipo::text,contenido,publicado_en
 FROM ogp.v_fichas_publicas WHERE registro_id=p_id;
$$;

CREATE OR REPLACE FUNCTION ogp.consultar_nombres(p_ids uuid[])
RETURNS TABLE(registro_id uuid,tipo text,nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
 SELECT registro_id,tipo::text,coalesce(contenido#>>'{ficha,titulo}',
   contenido#>>'{ficha,nombre}',contenido#>>'{ficha,nombre_publico}',
   contenido#>>'{ficha,nombre_oficial}')
 FROM ogp.v_fichas_publicas WHERE registro_id=ANY(p_ids) AND cardinality(p_ids)<=200;
$$;

CREATE OR REPLACE FUNCTION ogp.consultar_catalogos()
RETURNS TABLE(registro_id uuid,tipo text,codigo text,nombre text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,ogp,public AS $$
 SELECT id,'unidad'::text,codigo::text,nombre::text FROM ogp.unidades
 UNION ALL SELECT id,'tipo_instrumento'::text,codigo::text,nombre::text FROM ogp.tipos_instrumento_legal;
$$;

CREATE OR REPLACE FUNCTION ogp.consultar_panel()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog, ogp, public AS $$
 SELECT jsonb_build_object(
   'total',(SELECT count(*) FROM ogp.v_fichas_publicas),
   'legal',jsonb_build_object(
     'activos',(SELECT count(*) FROM ogp.v_fichas_publicas WHERE tipo='instrumento' AND contenido#>>'{ficha,situacion}'='vigente_documentada'),
     'expedientes',(SELECT count(*) FROM ogp.v_fichas_publicas WHERE tipo='expediente' AND contenido#>>'{ficha,estado_tramite}' IN ('solicitado','evaluacion','requerimientos')),
     'recetas',(SELECT count(DISTINCT dest.registro_id) FROM ogp.v_fichas_publicas f
       JOIN ogp.revision_dependencias d ON d.revision_id=f.revision_id
       JOIN ogp.v_fichas_publicas dest ON dest.registro_id=d.registro_destino_id
       WHERE f.tipo='instrumento' AND dest.tipo='receta'),
     'municipios',(SELECT count(DISTINCT m.territorio_id) FROM ogp.v_fichas_publicas f
       JOIN ogp.revision_territorios t ON t.revision_id=f.revision_id
       LEFT JOIN ogp.localidades_puebla l ON l.territorio_id=t.territorio_id
       JOIN ogp.municipios_puebla m ON m.territorio_id=coalesce(l.municipio_id,t.territorio_id)
       WHERE f.tipo='instrumento'),
     'actualizado',(SELECT max(publicado_en)::date FROM ogp.v_fichas_publicas WHERE tipo IN ('instrumento','expediente'))),
   'counts',coalesce((SELECT jsonb_object_agg(tipo,registros_publicados) FROM ogp.v_indicadores_publicos),'{}'::jsonb),
   'municipios',(SELECT count(DISTINCT municipio_id) FROM ogp.v_registros_por_municipio),
   'monthly',coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.mes) FROM (
     SELECT to_char(publicado_en,'YYYY-MM') AS mes,count(*) AS cantidad
     FROM ogp.v_fichas_publicas GROUP BY 1 ORDER BY 1 DESC LIMIT 12
   ) m),'[]'::jsonb));
$$;

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ogp_lector') THEN
   CREATE ROLE ogp_lector NOLOGIN;
 END IF;
END $$;
REVOKE ALL ON FUNCTION ogp.consultar_ficha(uuid),ogp.consultar_nombres(uuid[]),ogp.consultar_panel(),ogp.consultar_catalogos() FROM PUBLIC;
GRANT USAGE ON SCHEMA ogp TO ogp_lector;
GRANT EXECUTE ON FUNCTION ogp.consultar_fichas(text,text,integer,integer),
 ogp.consultar_ficha(uuid),ogp.consultar_nombres(uuid[]),ogp.consultar_panel(),ogp.consultar_catalogos(),
 ogp.consultar_indicadores(),ogp.consultar_mapa(uuid),ogp.consultar_red(uuid) TO ogp_lector;
COMMIT;
