-- Corrección para bases ya instaladas: convertir el dominio a text.
-- Conserva la firma, los permisos y los datos existentes.
BEGIN;

CREATE OR REPLACE FUNCTION ogp.consultar_fichas(p_tipo text DEFAULT NULL,p_busqueda text DEFAULT NULL,
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

COMMIT;
