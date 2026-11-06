-- Integridad y flujo editorial. Las funciones esperan un backend interno autenticado.
BEGIN;
SET LOCAL search_path = ogp, public;

CREATE FUNCTION tiene_permiso(p_usuario uuid, p_modulo text, p_accion text, p_registro uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 SELECT EXISTS (
   SELECT 1 FROM usuarios u
   JOIN usuario_roles ur ON ur.usuario_id = u.id
   JOIN roles r ON r.id = ur.rol_id AND r.activo
   JOIN rol_permisos rp ON rp.rol_id = r.id
   JOIN permisos p ON p.id = rp.permiso_id
   WHERE u.id = p_usuario AND u.estado = 'activo'
     AND p.modulo = p_modulo AND p.accion = p_accion
     AND (p_modulo IN ('usuarios','catalogos','auditoria') OR EXISTS (
       SELECT 1 FROM usuario_modulos um WHERE um.usuario_id = u.id AND um.modulo = p_modulo))
     AND (p_accion NOT IN ('editar','enviar') OR p_registro IS NULL OR EXISTS (
       SELECT 1 FROM registros reg WHERE reg.id = p_registro AND reg.creado_por = u.id)
       OR EXISTS (SELECT 1 FROM asignaciones_registro a
         WHERE a.registro_id = p_registro AND a.usuario_id = u.id AND a.funcion = 'captura'))
 );
$$;

CREATE FUNCTION exigir_permiso(p_usuario uuid, p_modulo text, p_accion text, p_registro uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NOT tiene_permiso(p_usuario,p_modulo,p_accion,p_registro) THEN
   RAISE EXCEPTION 'Permiso insuficiente: %.%', p_modulo,p_accion USING ERRCODE = '42501';
 END IF;
END $$;

CREATE FUNCTION crear_registro(p_usuario uuid, p_tipo text) RETURNS uuid
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM exigir_permiso(p_usuario,p_tipo,'crear');
 INSERT INTO registros(tipo,creado_por) VALUES(p_tipo,p_usuario) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION impedir_mutacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 RAISE EXCEPTION '% es inmutable; conservar historia y crear una nueva revisión/evento', TG_TABLE_NAME;
END $$;

CREATE FUNCTION proteger_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
   IF OLD.sellada_en IS NULL AND NEW.sellada_en IS NOT NULL
      AND (to_jsonb(NEW)-ARRAY['sellada_en','busqueda']) = (to_jsonb(OLD)-ARRAY['sellada_en','busqueda']) THEN RETURN NEW; END IF;
 END IF;
 RAISE EXCEPTION 'La revisión es inmutable: solo se admite sellarla una vez';
END $$;
CREATE TRIGGER revision_inmutable BEFORE UPDATE OR DELETE ON registro_revisiones
FOR EACH ROW EXECUTE FUNCTION proteger_revision();

CREATE FUNCTION proteger_detalle_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_revision uuid;
BEGIN
 IF TG_OP='DELETE' THEN v_revision:=OLD.revision_id; ELSE v_revision:=NEW.revision_id; END IF;
 IF EXISTS(SELECT 1 FROM registro_revisiones WHERE id=v_revision AND sellada_en IS NOT NULL)
  OR (TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM registro_revisiones WHERE id=OLD.revision_id AND sellada_en IS NOT NULL)) THEN
   RAISE EXCEPTION 'No modificar fuentes, archivos o relaciones de una revisión sellada';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER dependencia_sellada BEFORE INSERT OR UPDATE OR DELETE ON revision_dependencias
FOR EACH ROW EXECUTE FUNCTION proteger_detalle_revision();
CREATE TRIGGER archivo_sellado BEFORE INSERT OR UPDATE OR DELETE ON revision_archivos
FOR EACH ROW EXECUTE FUNCTION proteger_detalle_revision();
CREATE TRIGGER fuente_sellada BEFORE INSERT OR UPDATE OR DELETE ON revision_fuentes
FOR EACH ROW EXECUTE FUNCTION proteger_detalle_revision();
CREATE TRIGGER territorio_sellado BEFORE INSERT OR UPDATE OR DELETE ON revision_territorios
FOR EACH ROW EXECUTE FUNCTION proteger_detalle_revision();
CREATE TRIGGER evaluacion_inmutable BEFORE UPDATE OR DELETE ON evaluaciones_revision
FOR EACH ROW EXECUTE FUNCTION impedir_mutacion();
CREATE TRIGGER auditoria_inmutable BEFORE UPDATE OR DELETE ON eventos_auditoria
FOR EACH ROW EXECUTE FUNCTION impedir_mutacion();
CREATE TRIGGER evento_editorial_inmutable BEFORE UPDATE OR DELETE ON eventos_editoriales
FOR EACH ROW EXECUTE FUNCTION impedir_mutacion();

CREATE FUNCTION identidad_registro_inmutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.tipo IS DISTINCT FROM OLD.tipo
    OR NEW.creado_por IS DISTINCT FROM OLD.creado_por OR NEW.creado_en IS DISTINCT FROM OLD.creado_en THEN
   RAISE EXCEPTION 'No modificar identidad, tipo o autor original de un registro';
 END IF;
 NEW.actualizado_en := now();
 RETURN NEW;
END $$;
CREATE TRIGGER registro_identidad BEFORE UPDATE ON registros
FOR EACH ROW EXECUTE FUNCTION identidad_registro_inmutable();

CREATE FUNCTION validar_ciclo_territorial() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 -- Serializar modificaciones del grafo evita ciclos por inserciones concurrentes.
 PERFORM pg_advisory_xact_lock(210001);
 IF EXISTS (
   WITH RECURSIVE ancestros(id) AS (
     SELECT NEW.contenedor_id UNION
     SELECT tr.contenedor_id FROM territorio_relaciones tr JOIN ancestros a ON a.id=tr.territorio_id
     WHERE TG_OP = 'INSERT' OR NOT (tr.territorio_id=OLD.territorio_id
       AND tr.contenedor_id=OLD.contenedor_id AND tr.tipo=OLD.tipo)
   ) SELECT 1 FROM ancestros WHERE id=NEW.territorio_id
 ) THEN RAISE EXCEPTION 'La relación territorial introduce un ciclo'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER territorio_sin_ciclos BEFORE INSERT OR UPDATE ON territorio_relaciones
FOR EACH ROW EXECUTE FUNCTION validar_ciclo_territorial();

CREATE FUNCTION validar_territorio_especializado() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text;
BEGIN
 SELECT tt.codigo INTO v_tipo FROM territorios t JOIN tipos_territorio tt ON tt.id=t.tipo_id
 WHERE t.id=NEW.territorio_id;
 IF v_tipo <> TG_ARGV[0] THEN RAISE EXCEPTION 'Tipo territorial incompatible: esperado %',TG_ARGV[0]; END IF;
 IF TG_TABLE_NAME = 'localidades_puebla' THEN
 IF NEW.clave_inegi IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM municipios_puebla m WHERE m.territorio_id=NEW.municipio_id
     AND left(NEW.clave_inegi,5)=m.cvegeo) THEN
   RAISE EXCEPTION 'La clave de localidad no pertenece al municipio';
 END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER municipio_tipo BEFORE INSERT OR UPDATE ON municipios_puebla
FOR EACH ROW EXECUTE FUNCTION validar_territorio_especializado('municipio');
CREATE TRIGGER localidad_tipo BEFORE INSERT OR UPDATE ON localidades_puebla
FOR EACH ROW EXECUTE FUNCTION validar_territorio_especializado('localidad');

CREATE FUNCTION impedir_cambio_tipo_territorial() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NEW.tipo_id IS DISTINCT FROM OLD.tipo_id AND (
   EXISTS(SELECT 1 FROM municipios_puebla WHERE territorio_id=OLD.id) OR
   EXISTS(SELECT 1 FROM localidades_puebla WHERE territorio_id=OLD.id)) THEN
   RAISE EXCEPTION 'No cambiar el tipo de municipio/localidad especializado';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER territorio_tipo_estable BEFORE UPDATE ON territorios
FOR EACH ROW EXECUTE FUNCTION impedir_cambio_tipo_territorial();

CREATE FUNCTION validar_temporada() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_id uuid; v_anual boolean; v_periodo text; v_meses bigint;
BEGIN
 IF TG_ARGV[2] = 'meses' THEN
   IF TG_OP = 'DELETE' THEN v_id := OLD.temporada_id; ELSE v_id := NEW.temporada_id; END IF;
 ELSE
   IF TG_OP = 'DELETE' THEN RETURN NULL; END IF;
   v_id := NEW.id;
 END IF;
 EXECUTE format('SELECT todo_el_anio, periodo_descriptivo FROM %I WHERE id=$1 FOR UPDATE',TG_ARGV[0])
   INTO v_anual,v_periodo USING v_id;
 IF v_anual IS NULL THEN RETURN NULL; END IF;
 EXECUTE format('SELECT count(*) FROM %I WHERE temporada_id=$1',TG_ARGV[1]) INTO v_meses USING v_id;
 IF v_anual AND v_meses > 0 THEN RAISE EXCEPTION 'Todo el año no admite meses individuales'; END IF;
 IF NOT v_anual AND v_meses=0 AND coalesce(length(btrim(v_periodo)),0)=0 THEN
   RAISE EXCEPTION 'La temporada necesita meses o un periodo descriptivo';
 END IF;
 RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER ingrediente_temporada_consistente
 AFTER INSERT OR UPDATE ON ingrediente_temporadas DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION validar_temporada('ingrediente_temporadas','ingrediente_temporada_meses','padre');
 CREATE CONSTRAINT TRIGGER ingrediente_mes_consistente
 AFTER INSERT OR UPDATE OR DELETE ON ingrediente_temporada_meses DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION validar_temporada('ingrediente_temporadas','ingrediente_temporada_meses','meses');

CREATE CONSTRAINT TRIGGER variedad_temporada_consistente
 AFTER INSERT OR UPDATE ON variedad_temporadas DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION validar_temporada('variedad_temporadas','variedad_temporada_meses','padre');
 CREATE CONSTRAINT TRIGGER variedad_mes_consistente
 AFTER INSERT OR UPDATE OR DELETE ON variedad_temporada_meses DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION validar_temporada('variedad_temporadas','variedad_temporada_meses','meses');


CREATE FUNCTION consentimiento_valido(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 SELECT EXISTS(SELECT 1 FROM consentimientos c
  WHERE c.id=p_id AND c.estado='activo' AND c.fecha<=current_date
    AND (c.vence_en IS NULL OR c.vence_en>=current_date)
    AND c.verificado_por IS NOT NULL AND c.verificado_en IS NOT NULL
    AND EXISTS(SELECT 1 FROM consentimiento_archivos ca JOIN archivos a ON a.id=ca.archivo_id
      WHERE ca.consentimiento_id=c.id AND a.estado='disponible' AND a.visibilidad='restringido'));
$$;

CREATE FUNCTION validar_evidencia_privada() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM archivos WHERE id=NEW.archivo_id AND visibilidad='restringido') THEN
   RAISE EXCEPTION 'La evidencia de consentimiento debe ser restringida';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER consentimiento_evidencia_privada BEFORE INSERT OR UPDATE ON consentimiento_archivos
FOR EACH ROW EXECUTE FUNCTION validar_evidencia_privada();

CREATE FUNCTION proteger_visibilidad_evidencia() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NEW.visibilidad='publico' AND EXISTS(SELECT 1 FROM consentimiento_archivos WHERE archivo_id=NEW.id) THEN
  RAISE EXCEPTION 'No hacer pública una evidencia de consentimiento';
 END IF;
 IF NEW.clave_externa IS DISTINCT FROM OLD.clave_externa OR NEW.proveedor IS DISTINCT FROM OLD.proveedor
    OR NEW.url_publica IS DISTINCT FROM OLD.url_publica THEN
  IF EXISTS(SELECT 1 FROM revision_archivos WHERE archivo_id=OLD.id) THEN
   RAISE EXCEPTION 'Archivo asociado a revisión: crear otra referencia en lugar de reemplazar contenido';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER archivo_evidencia BEFORE UPDATE ON archivos
FOR EACH ROW EXECUTE FUNCTION proteger_visibilidad_evidencia();

CREATE FUNCTION activar_consentimiento(p_usuario uuid,p_consentimiento uuid) RETURNS void
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 PERFORM exigir_permiso(p_usuario,'consentimientos','validar');
 PERFORM 1 FROM consentimientos WHERE id=p_consentimiento FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Consentimiento inexistente'; END IF;
 IF NOT EXISTS(SELECT 1 FROM consentimiento_archivos ca JOIN archivos a ON a.id=ca.archivo_id
   WHERE ca.consentimiento_id=p_consentimiento AND a.visibilidad='restringido' AND a.estado='disponible') THEN
   RAISE EXCEPTION 'Falta evidencia privada disponible';
 END IF;
 UPDATE consentimientos SET estado='activo',verificado_por=p_usuario,verificado_en=now()
 WHERE id=p_consentimiento AND estado IN ('pendiente','vencido');
 IF NOT FOUND THEN RAISE EXCEPTION 'No reactivar autorizaciones revocadas o sustituidas'; END IF;
 INSERT INTO eventos_auditoria(usuario_id,accion,tabla_afectada,entidad_id)
 VALUES(p_usuario,'activar','consentimientos',p_consentimiento);
END $$;

-- Fotografía del contenido visible: no incluye contactos ni evidencia de consentimiento.
CREATE FUNCTION construir_contenido(p_tipo text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tabla text; v_ficha jsonb; v_detalle jsonb := '{}'::jsonb;
BEGIN
 v_tabla := CASE p_tipo

WHEN 'preparacion' THEN 'preparaciones'

WHEN 'ingrediente' THEN 'ingredientes'

WHEN 'variedad' THEN 'ingrediente_variedades'

WHEN 'persona' THEN 'personas'

WHEN 'receta' THEN 'recetas_documentadas'

WHEN 'mercado' THEN 'mercados'

WHEN 'expediente' THEN 'expedientes_legales'

WHEN 'instrumento' THEN 'instrumentos_legales'

WHEN 'podcast' THEN 'podcasts'

WHEN 'episodio' THEN 'episodios'

WHEN 'institucional' THEN 'contenidos_institucionales'

ELSE NULL END;
 IF v_tabla IS NULL THEN RAISE EXCEPTION 'Tipo desconocido: %',p_tipo; END IF;
 EXECUTE format($consulta$SELECT to_jsonb(t) - ARRAY['id','tipo_registro','preparacion_id','ingrediente_id','podcast_id'] FROM %I t WHERE id=$1$consulta$,v_tabla)
 INTO v_ficha USING p_id;
 IF v_ficha IS NULL THEN RAISE EXCEPTION 'Falta ficha de dominio para el registro'; END IF;
 CASE p_tipo
 WHEN 'preparacion' THEN
   SELECT jsonb_build_object('nombres',coalesce(jsonb_agg(to_jsonb(n)-ARRAY['id','preparacion_id','fuente_id']),'[]'::jsonb))
   INTO v_detalle FROM preparacion_nombres n WHERE preparacion_id=p_id;
 WHEN 'receta' THEN
   v_detalle := jsonb_build_object(
    'pasos',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','receta_id'] ORDER BY orden),'[]'::jsonb) FROM receta_pasos x WHERE receta_id=p_id),
    'ingredientes',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','receta_id'] ORDER BY orden),'[]'::jsonb) FROM receta_ingredientes x WHERE receta_id=p_id),
    'tecnicas',(SELECT coalesce(jsonb_agg(jsonb_build_object('codigo',t.codigo,'nombre',t.nombre,'observaciones',x.observaciones_publicas)),'[]'::jsonb) FROM receta_tecnicas x JOIN tecnicas t ON t.id=x.tecnica_id WHERE receta_id=p_id));
 WHEN 'persona' THEN
   v_detalle := jsonb_build_object(
    'participaciones',(SELECT coalesce(jsonb_agg(t.nombre),'[]'::jsonb) FROM persona_tipos_participacion x JOIN tipos_participacion t ON t.id=x.participacion_id WHERE persona_id=p_id),
    'especialidades',(SELECT coalesce(jsonb_agg(t.nombre),'[]'::jsonb) FROM persona_especialidades x JOIN especialidades t ON t.id=x.especialidad_id WHERE persona_id=p_id),
    'lenguas',(SELECT coalesce(jsonb_agg(t.nombre),'[]'::jsonb) FROM persona_lenguas x JOIN lenguas t ON t.id=x.lengua_id WHERE persona_id=p_id),
    'reconocimientos',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','persona_id','fuente_id']),'[]'::jsonb) FROM reconocimientos x WHERE persona_id=p_id));
 WHEN 'mercado' THEN
   v_detalle := jsonb_build_object('ubicacion',(
    SELECT jsonb_build_object('direccion',u.direccion,'descripcion',u.descripcion_ubicacion,
      'municipio_id',u.municipio_id,'localidad_id',u.localidad_id,'precision',u.precision,
      'longitud',ST_X(u.punto),'latitud',ST_Y(u.punto),'vigente_desde',u.vigente_desde,
      'horarios',(SELECT coalesce(jsonb_agg(to_jsonb(h)-ARRAY['id','ubicacion_id']),'[]'::jsonb) FROM mercado_horarios h WHERE h.ubicacion_id=u.id))
    FROM mercado_ubicaciones u WHERE u.mercado_id=p_id AND u.vigente_desde<=current_date
      AND (u.vigente_hasta IS NULL OR u.vigente_hasta>current_date)),
    'temporadas',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','mercado_id','fuente_id']),'[]'::jsonb) FROM mercado_temporadas x WHERE mercado_id=p_id),
    'servicios',(SELECT coalesce(jsonb_agg(jsonb_build_object('nombre',s.nombre,'descripcion',x.descripcion,'fecha',x.fecha_comprobacion)),'[]'::jsonb) FROM mercado_servicios x JOIN servicios s ON s.id=x.servicio_id WHERE mercado_id=p_id),
    'productos',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','mercado_id','fuente_id']),'[]'::jsonb) FROM mercado_ingredientes x WHERE mercado_id=p_id));
 WHEN 'episodio' THEN
   v_detalle := jsonb_build_object(
    'creditos',(SELECT coalesce(jsonb_agg(jsonb_build_object('nombre',nombre_publico,'funcion',funcion)),'[]'::jsonb) FROM episodio_creditos WHERE episodio_id=p_id AND autorizacion_confirmada),
    'enlaces',(SELECT coalesce(jsonb_agg(jsonb_build_object('plataforma',plataforma,'url',url,'tipo',tipo,'verificado_en',verificado_en)),'[]'::jsonb) FROM episodio_enlaces WHERE episodio_id=p_id AND disponible AND verificado_en IS NOT NULL));
 WHEN 'expediente' THEN
   SELECT jsonb_build_object('actuaciones',coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','expediente_id','fuente_id','visibilidad']),'[]'::jsonb))
   INTO v_detalle FROM expediente_eventos x WHERE expediente_id=p_id AND visibilidad='publico';
 ELSE NULL;
 END CASE;

IF p_tipo='ingrediente' THEN
 v_detalle := jsonb_build_object(
   'nombres',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','ingrediente_id','fuente_id']),'[]'::jsonb) FROM ingrediente_nombres x WHERE ingrediente_id=p_id),
   'temporadas',(SELECT coalesce(jsonb_agg((to_jsonb(x)-ARRAY['id','ingrediente_id','fuente_id']) || jsonb_build_object('meses',
      (SELECT coalesce(jsonb_agg(m.mes ORDER BY m.mes),'[]'::jsonb) FROM ingrediente_temporada_meses m WHERE m.temporada_id=x.id))),'[]'::jsonb) FROM ingrediente_temporadas x WHERE ingrediente_id=p_id),
   'produccion',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','ingrediente_id','fuente_id']),'[]'::jsonb) FROM ingrediente_produccion x WHERE ingrediente_id=p_id));
 END IF;

IF p_tipo='variedad' THEN
 v_detalle := jsonb_build_object(
   'nombres',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','variedad_id','fuente_id']),'[]'::jsonb) FROM variedad_nombres x WHERE variedad_id=p_id),
   'temporadas',(SELECT coalesce(jsonb_agg((to_jsonb(x)-ARRAY['id','variedad_id','fuente_id']) || jsonb_build_object('meses',
      (SELECT coalesce(jsonb_agg(m.mes ORDER BY m.mes),'[]'::jsonb) FROM variedad_temporada_meses m WHERE m.temporada_id=x.id))),'[]'::jsonb) FROM variedad_temporadas x WHERE variedad_id=p_id),
   'produccion',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','variedad_id','fuente_id']),'[]'::jsonb) FROM variedad_produccion x WHERE variedad_id=p_id));
 END IF;

RETURN jsonb_build_object('tipo',p_tipo,'ficha',v_ficha,'detalle',v_detalle);
END $$;

CREATE FUNCTION validar_revision(p_revision uuid) RETURNS void
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE r registro_revisiones; v_tipo text; f jsonb; d jsonb;
BEGIN
 SELECT * INTO STRICT r FROM registro_revisiones WHERE id=p_revision;
 v_tipo:=r.contenido_publico->>'tipo'; f:=r.contenido_publico->'ficha'; d:=r.contenido_publico->'detalle';
 IF v_tipo NOT IN ('podcast','episodio','institucional') AND NOT EXISTS(
   SELECT 1 FROM revision_fuentes WHERE revision_id=p_revision) THEN
   RAISE EXCEPTION 'Falta al menos una fuente con cita pública';
 END IF;
 IF v_tipo IN ('preparacion','receta','persona','expediente') AND NOT EXISTS(
   WITH RECURSIVE alcance(id) AS (
     SELECT territorio_id FROM revision_territorios WHERE revision_id=p_revision UNION
     SELECT tr.contenedor_id FROM territorio_relaciones tr JOIN alcance a ON a.id=tr.territorio_id
   ) SELECT 1 FROM alcance a JOIN territorios t ON t.id=a.id
     JOIN tipos_territorio tt ON tt.id=t.tipo_id
     WHERE a.id IN (SELECT territorio_id FROM municipios_puebla)
       OR (tt.codigo='estado' AND EXISTS(SELECT 1 FROM referencias_territoriales rt
          WHERE rt.territorio_id=a.id AND rt.identificador_externo='21'))
 ) THEN RAISE EXCEPTION 'Falta vínculo territorial documentado con Puebla'; END IF;
 CASE v_tipo
 WHEN 'preparacion' THEN
  IF coalesce(length(btrim(f->>'descripcion')),0)=0 OR f->>'categoria_id' IS NULL THEN
    RAISE EXCEPTION 'Preparación: falta categoría o descripción'; END IF;
 WHEN 'receta' THEN
  IF coalesce(length(btrim(f->>'descripcion')),0)=0 OR f->>'tipo_documentacion_id' IS NULL THEN
    RAISE EXCEPTION 'Receta: falta descripción o tipo de documentación'; END IF;
  IF f->>'nivel_documentacion'='completa' THEN
    IF jsonb_array_length(d->'ingredientes')=0 OR jsonb_array_length(d->'pasos')=0 THEN
      RAISE EXCEPTION 'Receta completa: faltan ingredientes o pasos'; END IF;
  ELSIF coalesce(length(btrim(f->>'limitaciones_documentacion')),0)=0 THEN
    RAISE EXCEPTION 'Receta parcial: describir las limitaciones';
  END IF;
 WHEN 'ingrediente' THEN
  IF f->>'categoria_id' IS NULL OR coalesce(length(btrim(f->>'descripcion')),0)=0 THEN
    RAISE EXCEPTION 'Ingrediente: falta categoría o descripción'; END IF;
 WHEN 'variedad' THEN
  IF coalesce(length(btrim(f->>'caracteristicas')),0)=0 THEN RAISE EXCEPTION 'Variedad: falta caracterización'; END IF;
 WHEN 'persona' THEN
  IF coalesce(length(btrim(f->>'semblanza')),0)=0 AND coalesce(length(btrim(f->>'trayectoria')),0)=0 THEN
    RAISE EXCEPTION 'Persona: falta semblanza o trayectoria'; END IF;
  IF jsonb_array_length(d->'participaciones')=0 THEN RAISE EXCEPTION 'Persona: falta participación'; END IF;
 WHEN 'mercado' THEN
  IF f->>'fecha_comprobacion' IS NULL OR d->'ubicacion' IS NULL OR d->'ubicacion'='null'::jsonb
    OR d#>>'{ubicacion,longitud}' IS NULL OR d#>>'{ubicacion,latitud}' IS NULL
    OR (coalesce(length(btrim(d#>>'{ubicacion,direccion}')),0)=0
      AND coalesce(length(btrim(d#>>'{ubicacion,descripcion}')),0)=0) THEN
    RAISE EXCEPTION 'Mercado: falta ubicación vigente, referencia de ubicación o fecha de comprobación'; END IF;
 WHEN 'expediente' THEN
  IF f->>'tipo_id' IS NULL OR coalesce(length(btrim(f->>'autoridad')),0)=0 THEN
    RAISE EXCEPTION 'Expediente: falta tipo o autoridad'; END IF;
 WHEN 'instrumento' THEN
  IF f->>'tipo_id' IS NULL OR coalesce(length(btrim(f->>'autoridad')),0)=0
    OR coalesce(length(btrim(f->>'referencia_oficial')),0)=0 OR coalesce(length(btrim(f->>'alcance')),0)=0
    OR f->>'fecha_revision' IS NULL THEN RAISE EXCEPTION 'Instrumento: faltan referencia, autoridad, tipo, alcance o fecha de revisión'; END IF;
 WHEN 'podcast' THEN
  IF coalesce(length(btrim(f->>'descripcion')),0)=0 OR coalesce(length(btrim(f->>'proposito')),0)=0 THEN
    RAISE EXCEPTION 'Podcast: falta descripción o propósito'; END IF;
 WHEN 'episodio' THEN
  IF coalesce(length(btrim(f->>'resumen')),0)=0 THEN RAISE EXCEPTION 'Episodio: falta resumen'; END IF;
  IF jsonb_array_length(d->'creditos')=0 THEN RAISE EXCEPTION 'Episodio: faltan créditos autorizados'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d->'enlaces') e WHERE e->>'tipo' IN ('pagina','audio','reproductor'))
    AND NOT EXISTS(SELECT 1 FROM revision_archivos ra JOIN archivos a ON a.id=ra.archivo_id
      WHERE ra.revision_id=p_revision AND ra.funcion='audio_principal' AND a.estado='disponible') THEN
    RAISE EXCEPTION 'Episodio: falta una opción para escuchar'; END IF;
 WHEN 'institucional' THEN
  IF coalesce(length(btrim(f->>'cuerpo')),0)=0 THEN RAISE EXCEPTION 'Contenido institucional vacío'; END IF;
 ELSE RAISE EXCEPTION 'Tipo de revisión no reconocido';
 END CASE;
 IF EXISTS(SELECT 1 FROM revision_archivos ra JOIN archivos a ON a.id=ra.archivo_id
   WHERE ra.revision_id=p_revision AND (a.estado<>'disponible' OR a.visibilidad<>'publico' OR a.url_publica IS NULL
     OR coalesce(length(btrim(a.licencia)),0)=0
     OR (a.tipo_mime LIKE 'image/%' AND coalesce(length(btrim(ra.texto_alternativo)),0)=0))) THEN
   RAISE EXCEPTION 'Archivo público no disponible, sin condiciones de uso o imagen sin descripción'; END IF;
END $$;

CREATE FUNCTION enviar_revision(p_usuario uuid,p_registro uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text; v_num integer; v_id uuid; v_prefijo text;
BEGIN
 SELECT tipo INTO STRICT v_tipo FROM registros WHERE id=p_registro AND archivado_en IS NULL FOR UPDATE;
 PERFORM exigir_permiso(p_usuario,v_tipo,'enviar',p_registro);
 SELECT coalesce(max(numero),0)+1 INTO v_num FROM registro_revisiones WHERE registro_id=p_registro;
 INSERT INTO registro_revisiones(registro_id,numero,creado_por,contenido_publico)
 VALUES(p_registro,v_num,p_usuario,construir_contenido(v_tipo,p_registro)) RETURNING id INTO v_id;
 v_prefijo:=v_tipo;
 -- Las tablas de vínculos tienen nombres definidos por el catálogo cerrado de tipos.
 EXECUTE format($consulta$INSERT INTO revision_fuentes(revision_id,fuente_id,cita_publica,afirmacion,apartado)
   SELECT $1,f.id,CASE WHEN f.visibilidad='publico' THEN coalesce(f.cita_publica,f.titulo || '. ' || f.referencia)
      ELSE f.cita_publica END,x.afirmacion,x.apartado
   FROM %I x JOIN fuentes f ON f.id=x.fuente_id WHERE x.%I=$2
     AND (f.visibilidad='publico' OR f.cita_publica IS NOT NULL)$consulta$,v_prefijo||'_fuentes',v_prefijo||'_id')
 USING v_id,p_registro;
 EXECUTE format('INSERT INTO revision_archivos(revision_id,archivo_id,funcion,texto_alternativo,descripcion_publica,orden)
   SELECT $1,archivo_id,funcion,texto_alternativo,descripcion_publica,orden FROM %I WHERE %I=$2',
   v_prefijo||'_archivos',v_prefijo||'_id') USING v_id,p_registro;
 IF v_tipo NOT IN ('podcast','institucional') THEN
   EXECUTE format('INSERT INTO revision_territorios(revision_id,territorio_id,tipo_vinculo,nombre_en_revision,tipo_territorio_en_revision)
     SELECT $1,t.id,x.tipo_vinculo,t.nombre,tt.codigo FROM %I x JOIN territorios t ON t.id=x.territorio_id
     JOIN tipos_territorio tt ON tt.id=t.tipo_id WHERE x.%I=$2',v_prefijo||'_territorios',v_prefijo||'_id')
   USING v_id,p_registro;
 END IF;
 CASE v_tipo
 WHEN 'receta' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT v_id,preparacion_id,'variante_de',true FROM recetas_documentadas WHERE id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,ingrediente_id,'utiliza',true FROM receta_ingredientes WHERE receta_id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,variedad_id,'utiliza_variedad',true FROM receta_ingredientes WHERE receta_id=p_registro AND variedad_id IS NOT NULL;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria)
   SELECT v_id,x.persona_id,'participacion:'||p.codigo,false FROM receta_personas x
   JOIN participaciones_receta p ON p.id=x.participacion_id WHERE x.receta_id=p_registro;
 WHEN 'variedad' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT v_id,ingrediente_id,'variedad_de',true FROM ingrediente_variedades WHERE id=p_registro;
 WHEN 'mercado' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,ingrediente_id,'ofrece',true FROM mercado_ingredientes WHERE mercado_id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,variedad_id,'ofrece_variedad',true FROM mercado_ingredientes WHERE mercado_id=p_registro AND variedad_id IS NOT NULL;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,persona_id,'participa',false FROM mercado_personas WHERE mercado_id=p_registro;
 WHEN 'episodio' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT v_id,podcast_id,'episodio_de',true FROM episodios WHERE id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,persona_id,'participa',false FROM episodio_personas WHERE episodio_id=p_registro;
 ELSE NULL;
 END CASE;

IF v_tipo='episodio' THEN

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,preparacion_id,'menciona',false FROM episodio_preparaciones WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,receta_id,'menciona',false FROM episodio_recetas WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,ingrediente_id,'menciona',false FROM episodio_ingredientes WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,variedad_id,'menciona',false FROM episodio_variedades WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,mercado_id,'menciona',false FROM episodio_mercados WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,instrumento_id,'menciona',false FROM episodio_instrumentos WHERE episodio_id=p_registro;

END IF;

IF v_tipo='instrumento' THEN

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,preparacion_id,'instrumento_relacionado',false,alcance FROM instrumento_preparaciones WHERE instrumento_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,receta_id,'instrumento_relacionado',false,alcance FROM instrumento_recetas WHERE instrumento_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,ingrediente_id,'instrumento_relacionado',false,alcance FROM instrumento_ingredientes WHERE instrumento_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,variedad_id,'instrumento_relacionado',false,alcance FROM instrumento_variedades WHERE instrumento_id=p_registro;

END IF;

PERFORM validar_revision(v_id);
 UPDATE registro_revisiones SET sellada_en=now() WHERE id=v_id;
 INSERT INTO eventos_editoriales(registro_id,revision_id,usuario_id,accion) VALUES(p_registro,v_id,p_usuario,'enviar');
 RETURN v_id;
END $$;

CREATE FUNCTION revision_autorizada(p_revision uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 SELECT NOT EXISTS (
   SELECT 1 FROM consentimiento_revision_alcances cr
   WHERE cr.revision_id=p_revision AND NOT consentimiento_valido(cr.consentimiento_id)
 ) AND (
   NOT EXISTS(SELECT 1 FROM registro_revisiones rr JOIN registros r ON r.id=rr.registro_id
     WHERE rr.id=p_revision AND r.tipo='persona')
   OR EXISTS(SELECT 1 FROM consentimiento_revision_alcances cr JOIN consentimientos c ON c.id=cr.consentimiento_id
       JOIN registro_revisiones rr ON rr.id=cr.revision_id
     WHERE cr.revision_id=p_revision AND c.persona_id=rr.registro_id AND consentimiento_valido(c.id))
 );
$$;

CREATE FUNCTION evaluar_revision(p_usuario uuid,p_revision uuid,p_dictamen text,p_observaciones text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text; v_registro uuid; v_id uuid;
BEGIN
 SELECT r.tipo,r.id INTO STRICT v_tipo,v_registro FROM registro_revisiones rr JOIN registros r ON r.id=rr.registro_id
 WHERE rr.id=p_revision FOR UPDATE OF r;
 PERFORM exigir_permiso(p_usuario,v_tipo,'validar',v_registro);
 IF NOT EXISTS(SELECT 1 FROM registro_revisiones WHERE id=p_revision AND sellada_en IS NOT NULL) THEN
   RAISE EXCEPTION 'La revisión aún no está sellada'; END IF;
 IF p_dictamen='validado' THEN
   PERFORM validar_revision(p_revision);
   IF NOT revision_autorizada(p_revision) THEN RAISE EXCEPTION 'Consentimiento faltante o no vigente para esta revisión'; END IF;
 END IF;
 INSERT INTO evaluaciones_revision(revision_id,revisor_id,dictamen,observaciones)
 VALUES(p_revision,p_usuario,p_dictamen,p_observaciones) RETURNING id INTO v_id;
 INSERT INTO eventos_editoriales(registro_id,revision_id,usuario_id,accion,observaciones)
 VALUES(v_registro,p_revision,p_usuario,p_dictamen,p_observaciones);
 RETURN v_id;
END $$;

CREATE FUNCTION ficha_visible(p_registro uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 WITH RECURSIVE requeridas(registro_id) AS (
   SELECT p_registro UNION
   SELECT d.registro_destino_id FROM requeridas req
     JOIN publicaciones p ON p.registro_id=req.registro_id AND p.retirado_en IS NULL
     JOIN revision_dependencias d ON d.revision_id=p.revision_id AND d.obligatoria
 ) SELECT NOT EXISTS(
   SELECT 1 FROM requeridas req
   LEFT JOIN publicaciones p ON p.registro_id=req.registro_id AND p.retirado_en IS NULL
   JOIN registros r ON r.id=req.registro_id
   WHERE p.id IS NULL OR r.archivado_en IS NOT NULL OR NOT revision_autorizada(p.revision_id)
 );
$$;

CREATE FUNCTION validar_publicacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text;
BEGIN
 SELECT tipo INTO STRICT v_tipo FROM registros WHERE id=NEW.registro_id AND archivado_en IS NULL FOR UPDATE;
 PERFORM exigir_permiso(NEW.publicado_por,v_tipo,'publicar',NEW.registro_id);
 IF NOT EXISTS(SELECT 1 FROM registro_revisiones WHERE id=NEW.revision_id AND sellada_en IS NOT NULL) THEN
   RAISE EXCEPTION 'La revisión aún no está sellada'; END IF;
 IF NOT EXISTS(SELECT 1 FROM evaluaciones_revision WHERE id=NEW.evaluacion_id
   AND revision_id=NEW.revision_id AND dictamen='validado') THEN RAISE EXCEPTION 'La revisión no está validada'; END IF;
 PERFORM validar_revision(NEW.revision_id);
 IF NOT revision_autorizada(NEW.revision_id) THEN RAISE EXCEPTION 'Autorización no vigente'; END IF;
 IF EXISTS(SELECT 1 FROM revision_dependencias d WHERE d.revision_id=NEW.revision_id
    AND d.obligatoria AND NOT ficha_visible(d.registro_destino_id)) THEN
   RAISE EXCEPTION 'Hay dependencias obligatorias sin publicación visible'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER publicacion_validada BEFORE INSERT ON publicaciones
FOR EACH ROW EXECUTE FUNCTION validar_publicacion();

CREATE FUNCTION proteger_publicacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'No eliminar publicaciones; retirar conservando historial'; END IF;
 IF (to_jsonb(NEW)-ARRAY['retirado_en','retirado_por','motivo_retiro']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['retirado_en','retirado_por','motivo_retiro']) OR OLD.retirado_en IS NOT NULL
    OR NEW.retirado_en IS NULL THEN RAISE EXCEPTION 'Solo se permite retirar una publicación activa'; END IF;
 SELECT tipo INTO v_tipo FROM registros WHERE id=NEW.registro_id;
 PERFORM exigir_permiso(NEW.retirado_por,v_tipo,'retirar',NEW.registro_id);
 RETURN NEW;
END $$;
CREATE TRIGGER publicacion_historial BEFORE UPDATE OR DELETE ON publicaciones
FOR EACH ROW EXECUTE FUNCTION proteger_publicacion();

CREATE FUNCTION publicar_revision(p_usuario uuid,p_revision uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_registro uuid; v_tipo text; v_evaluacion uuid; v_id uuid;
BEGIN
 SELECT rr.registro_id,r.tipo INTO STRICT v_registro,v_tipo FROM registro_revisiones rr JOIN registros r ON r.id=rr.registro_id
 WHERE rr.id=p_revision FOR UPDATE OF r;
 PERFORM exigir_permiso(p_usuario,v_tipo,'publicar',v_registro);
 SELECT id INTO STRICT v_evaluacion FROM evaluaciones_revision WHERE revision_id=p_revision AND dictamen='validado';
 UPDATE publicaciones SET retirado_en=now(),retirado_por=p_usuario,motivo_retiro='Sustituida por una nueva revisión'
 WHERE registro_id=v_registro AND retirado_en IS NULL;
 INSERT INTO publicaciones(registro_id,revision_id,evaluacion_id,publicado_por)
 VALUES(v_registro,p_revision,v_evaluacion,p_usuario) RETURNING id INTO v_id;
 INSERT INTO eventos_editoriales(registro_id,revision_id,usuario_id,accion) VALUES(v_registro,p_revision,p_usuario,'publicar');
 RETURN v_id;
END $$;

CREATE FUNCTION retirar_publicacion(p_usuario uuid,p_registro uuid,p_motivo text) RETURNS void
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text;
BEGIN
 SELECT tipo INTO STRICT v_tipo FROM registros WHERE id=p_registro FOR UPDATE;
 PERFORM exigir_permiso(p_usuario,v_tipo,'retirar',p_registro);
 UPDATE publicaciones SET retirado_en=now(),retirado_por=p_usuario,motivo_retiro=p_motivo
 WHERE registro_id=p_registro AND retirado_en IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'No hay publicación activa'; END IF;
 INSERT INTO eventos_editoriales(registro_id,usuario_id,accion,observaciones) VALUES(p_registro,p_usuario,'retirar',p_motivo);
END $$;

CREATE FUNCTION auditar_evento() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE j jsonb; v_actor uuid; v_registro uuid;
BEGIN
 IF TG_OP='DELETE' THEN j:=to_jsonb(OLD); ELSE j:=to_jsonb(NEW); END IF;
 v_actor:=coalesce(nullif(current_setting('ogp.actor_id',true),'')::uuid,
   (j->>'publicado_por')::uuid,(j->>'revisor_id')::uuid,(j->>'creado_por')::uuid,(j->>'usuario_id')::uuid);
 IF TG_TABLE_NAME='registros' THEN v_registro:=(j->>'id')::uuid;
 ELSE v_registro:=(j->>'registro_id')::uuid; END IF;
 INSERT INTO eventos_auditoria(usuario_id,registro_id,accion,tabla_afectada,entidad_id,detalle)
 VALUES(v_actor,v_registro,lower(TG_OP),TG_TABLE_NAME,(j->>'id')::uuid,
   jsonb_build_object('operacion',TG_OP));
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

CREATE TRIGGER auditar_registros AFTER INSERT OR UPDATE OR DELETE ON registros FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_registro_revisiones AFTER INSERT OR UPDATE OR DELETE ON registro_revisiones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_evaluaciones_revision AFTER INSERT OR UPDATE OR DELETE ON evaluaciones_revision FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_publicaciones AFTER INSERT OR UPDATE OR DELETE ON publicaciones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_eventos_editoriales AFTER INSERT OR UPDATE OR DELETE ON eventos_editoriales FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_consentimientos AFTER INSERT OR UPDATE OR DELETE ON consentimientos FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_invitaciones AFTER INSERT OR UPDATE OR DELETE ON invitaciones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_usuario_roles AFTER INSERT OR UPDATE OR DELETE ON usuario_roles FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_rol_permisos AFTER INSERT OR UPDATE OR DELETE ON rol_permisos FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_usuario_modulos AFTER INSERT OR UPDATE OR DELETE ON usuario_modulos FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_asignaciones_registro AFTER INSERT OR UPDATE OR DELETE ON asignaciones_registro FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_importaciones AFTER INSERT OR UPDATE OR DELETE ON importaciones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_importacion_candidatos AFTER INSERT OR UPDATE OR DELETE ON importacion_candidatos FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_preparaciones AFTER INSERT OR UPDATE OR DELETE ON preparaciones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_ingredientes AFTER INSERT OR UPDATE OR DELETE ON ingredientes FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_ingrediente_variedades AFTER INSERT OR UPDATE OR DELETE ON ingrediente_variedades FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_personas AFTER INSERT OR UPDATE OR DELETE ON personas FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_recetas_documentadas AFTER INSERT OR UPDATE OR DELETE ON recetas_documentadas FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_mercados AFTER INSERT OR UPDATE OR DELETE ON mercados FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_expedientes_legales AFTER INSERT OR UPDATE OR DELETE ON expedientes_legales FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_instrumentos_legales AFTER INSERT OR UPDATE OR DELETE ON instrumentos_legales FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_podcasts AFTER INSERT OR UPDATE OR DELETE ON podcasts FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_episodios AFTER INSERT OR UPDATE OR DELETE ON episodios FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_contenidos_institucionales AFTER INSERT OR UPDATE OR DELETE ON contenidos_institucionales FOR EACH ROW EXECUTE FUNCTION auditar_evento();


-- Revocar el EXECUTE que PostgreSQL concede por defecto al crear funciones.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ogp FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA ogp REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
COMMIT;
