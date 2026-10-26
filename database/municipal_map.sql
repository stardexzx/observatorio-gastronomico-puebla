BEGIN;
CREATE OR REPLACE FUNCTION ogp.consultar_municipios() RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,ogp,public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object('id',m.territorio_id,'code',m.cvegeo,'name',t.nombre) ORDER BY t.nombre),'[]'::jsonb)
 FROM ogp.municipios_puebla m JOIN ogp.territorios t ON t.id=m.territorio_id;
$$;
CREATE OR REPLACE FUNCTION ogp.consultar_mapa_municipal(p_tipos text[] DEFAULT NULL,p_municipio text DEFAULT NULL,
 p_busqueda text DEFAULT NULL,p_desde date DEFAULT NULL,p_hasta date DEFAULT NULL)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,ogp,public AS $$
 WITH fichas AS MATERIALIZED (
  SELECT f.* FROM ogp.v_fichas_publicas f JOIN ogp.registro_revisiones r ON r.id=f.revision_id
  WHERE (p_tipos IS NULL OR f.tipo=ANY(p_tipos))
    AND (p_desde IS NULL OR f.publicado_en>=p_desde::timestamptz)
    AND (p_hasta IS NULL OR f.publicado_en<(p_hasta+1)::timestamptz)
    AND (p_busqueda IS NULL OR btrim(p_busqueda)='' OR r.busqueda @@ websearch_to_tsquery('spanish'::regconfig,p_busqueda))
 ), vinculos AS MATERIALIZED (
  SELECT DISTINCT f.registro_id,f.tipo,m.territorio_id,m.cvegeo
  FROM fichas f JOIN ogp.revision_territorios t ON t.revision_id=f.revision_id
  LEFT JOIN ogp.localidades_puebla l ON l.territorio_id=t.territorio_id
  JOIN ogp.municipios_puebla m ON m.territorio_id=coalesce(l.municipio_id,t.territorio_id)
  UNION
  SELECT f.registro_id,f.tipo,m.territorio_id,m.cvegeo FROM fichas f JOIN ogp.municipios_puebla m
  ON m.territorio_id::text=f.contenido#>>'{detalle,ubicacion,municipio_id}' WHERE f.tipo='mercado'
 ), seleccion AS MATERIALIZED (
  SELECT DISTINCT f.* FROM fichas f WHERE p_municipio IS NULL OR EXISTS(
   SELECT 1 FROM vinculos v WHERE v.registro_id=f.registro_id AND v.cvegeo=p_municipio)
 )
 SELECT jsonb_build_object('type','FeatureCollection','features',coalesce((
  SELECT jsonb_agg(jsonb_build_object('type','Feature','id',m.cvegeo,'geometry',ST_AsGeoJSON(m.geometria)::jsonb,
    'properties',jsonb_build_object('code',m.cvegeo,'name',t.nombre,'total',(
      SELECT count(DISTINCT v.registro_id) FROM vinculos v WHERE v.territorio_id=m.territorio_id AND (p_municipio IS NULL OR v.cvegeo=p_municipio)),
      'counts',coalesce((SELECT jsonb_object_agg(c.tipo,c.n) FROM (SELECT v.tipo,count(DISTINCT v.registro_id) AS n
       FROM vinculos v WHERE v.territorio_id=m.territorio_id AND (p_municipio IS NULL OR v.cvegeo=p_municipio) GROUP BY v.tipo) c),'{}'::jsonb))))
  FROM ogp.municipios_puebla m JOIN ogp.territorios t ON t.id=m.territorio_id WHERE m.geometria IS NOT NULL),'[]'::jsonb),
 'points',coalesce((SELECT jsonb_agg(jsonb_build_object('type','Feature','id',f.registro_id,
   'geometry',jsonb_build_object('type','Point','coordinates',jsonb_build_array(
     (f.contenido#>>'{detalle,ubicacion,longitud}')::numeric,(f.contenido#>>'{detalle,ubicacion,latitud}')::numeric)),
   'properties',jsonb_build_object('nombre',f.contenido#>>'{ficha,nombre}','tipo',f.tipo)))
   FROM seleccion f WHERE f.tipo='mercado' AND f.contenido#>>'{detalle,ubicacion,longitud}' IS NOT NULL),'[]'::jsonb),
 'total',(SELECT count(*) FROM seleccion),'mapped',(SELECT count(DISTINCT v.registro_id) FROM vinculos v WHERE p_municipio IS NULL OR v.cvegeo=p_municipio),
 'records',coalesce((SELECT jsonb_agg(to_jsonb(x)) FROM (SELECT registro_id,tipo,contenido,publicado_en FROM seleccion ORDER BY publicado_en DESC,registro_id LIMIT 100) x),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION ogp.consultar_municipios(),ogp.consultar_mapa_municipal(text[],text,text,date,date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ogp.consultar_municipios(),ogp.consultar_mapa_municipal(text[],text,text,date,date) TO ogp_lector;
COMMIT;
