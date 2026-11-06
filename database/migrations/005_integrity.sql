-- Reglas adicionales de identidad, autorizaciones e historial.
BEGIN;
SET LOCAL search_path = ogp, public;

CREATE FUNCTION comprobar_ficha_registro() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text; v_tabla text; v_existe boolean;
BEGIN
 SELECT tipo INTO v_tipo FROM registros WHERE id=NEW.id;
 IF NOT FOUND THEN RETURN NULL; END IF;
 v_tabla:=CASE v_tipo WHEN 'preparacion' THEN 'preparaciones' WHEN 'receta' THEN 'recetas_documentadas'
 WHEN 'ingrediente' THEN 'ingredientes' WHEN 'variedad' THEN 'ingrediente_variedades'
 WHEN 'persona' THEN 'personas' WHEN 'mercado' THEN 'mercados' WHEN 'expediente' THEN 'expedientes_legales'
 WHEN 'instrumento' THEN 'instrumentos_legales' WHEN 'podcast' THEN 'podcasts' WHEN 'episodio' THEN 'episodios'
 WHEN 'institucional' THEN 'contenidos_institucionales' END;
 IF v_tabla IS NULL THEN RAISE EXCEPTION 'Tipo de registro sin tabla de dominio'; END IF;
 EXECUTE format('SELECT EXISTS(SELECT 1 FROM %I WHERE id=$1)',v_tabla) INTO v_existe USING NEW.id;
 IF NOT v_existe THEN RAISE EXCEPTION 'El registro debe tener su ficha de tipo % antes de COMMIT',v_tipo; END IF;
 RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER registro_con_ficha AFTER INSERT ON registros
DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION comprobar_ficha_registro();

CREATE FUNCTION proteger_identidad_ficha() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Archivar la ficha o retirar la publicación; no eliminar su identidad'; END IF;
 IF NEW.id IS DISTINCT FROM OLD.id THEN RAISE EXCEPTION 'No cambiar el identificador de una ficha'; END IF;
 UPDATE registros SET actualizado_en=now() WHERE id=NEW.id;
 RETURN NEW;
END $$;

DO $identidades$
DECLARE t text;
BEGIN
 FOREACH t IN ARRAY ARRAY['preparaciones','recetas_documentadas','ingredientes','ingrediente_variedades',
  'personas','mercados','expedientes_legales','instrumentos_legales','podcasts','episodios','contenidos_institucionales']
 LOOP
  EXECUTE format('CREATE TRIGGER identidad_estable BEFORE UPDATE OR DELETE ON %I
    FOR EACH ROW EXECUTE FUNCTION proteger_identidad_ficha()',t);
 END LOOP;
END $identidades$;

CREATE FUNCTION validar_evaluacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text; v_registro uuid;
BEGIN
 SELECT r.tipo,r.id INTO STRICT v_tipo,v_registro FROM registros r
 JOIN registro_revisiones rr ON rr.registro_id=r.id
 WHERE rr.id=NEW.revision_id AND rr.sellada_en IS NOT NULL FOR UPDATE OF r;
 PERFORM exigir_permiso(NEW.revisor_id,v_tipo,'validar',v_registro);
 IF NEW.dictamen='validado' THEN
   PERFORM validar_revision(NEW.revision_id);
   IF NOT revision_autorizada(NEW.revision_id) THEN RAISE EXCEPTION 'Autorización no vigente para la revisión'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER evaluacion_con_permiso BEFORE INSERT ON evaluaciones_revision
FOR EACH ROW EXECUTE FUNCTION validar_evaluacion();

CREATE FUNCTION comprobar_activacion_consentimiento() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NEW.estado='activo' THEN
   IF NEW.verificado_por IS NULL OR NEW.verificado_en IS NULL THEN
    RAISE EXCEPTION 'Falta verificación del consentimiento'; END IF;
   PERFORM exigir_permiso(NEW.verificado_por,'consentimientos','validar');
   IF NEW.fecha>current_date OR (NEW.vence_en IS NOT NULL AND NEW.vence_en<current_date)
     OR NOT EXISTS(SELECT 1 FROM consentimiento_archivos ca JOIN archivos a ON a.id=ca.archivo_id
       WHERE ca.consentimiento_id=NEW.id AND a.estado='disponible' AND a.visibilidad='restringido') THEN
     RAISE EXCEPTION 'La autorización debe estar vigente y tener evidencia privada disponible';
   END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER consentimiento_activado BEFORE INSERT OR UPDATE ON consentimientos
FOR EACH ROW EXECUTE FUNCTION comprobar_activacion_consentimiento();

CREATE FUNCTION comprobar_alcance_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM registro_revisiones rr JOIN consentimiento_registros cr
    ON cr.registro_id=rr.registro_id
    WHERE rr.id=NEW.revision_id AND cr.consentimiento_id=NEW.consentimiento_id) THEN
   RAISE EXCEPTION 'El consentimiento no incluye este registro'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER consentimiento_alcance BEFORE INSERT ON consentimiento_revision_alcances
FOR EACH ROW EXECUTE FUNCTION comprobar_alcance_revision();
CREATE TRIGGER consentimiento_alcance_inmutable BEFORE UPDATE OR DELETE ON consentimiento_revision_alcances
FOR EACH ROW EXECUTE FUNCTION impedir_mutacion();

-- Tareas para el servicio externo. SQL puede bloquear lectura; retirar archivos del proveedor
-- requiere que un worker consuma esta cola. No se guardan credenciales en el payload.
CREATE TABLE tareas_externas (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 tipo texto_no_vacio NOT NULL,
 consentimiento_id uuid REFERENCES consentimientos(id),
 archivo_id uuid REFERENCES archivos(id),
 estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_proceso','completada','error')),
 creado_en timestamptz NOT NULL DEFAULT now(),
 intentos integer NOT NULL DEFAULT 0 CHECK (intentos>=0),
 proximo_intento timestamptz,
 error text,
 UNIQUE NULLS NOT DISTINCT (tipo,consentimiento_id,archivo_id)
);
CREATE INDEX tareas_pendientes_idx ON tareas_externas(estado,proximo_intento);

CREATE FUNCTION encolar_revocacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NEW.estado IN ('revocado','vencido','sustituido') AND NEW.estado IS DISTINCT FROM OLD.estado THEN
   INSERT INTO tareas_externas(tipo,consentimiento_id)
   VALUES('revisar_publicaciones_y_reportes',NEW.id) ON CONFLICT DO NOTHING;
   INSERT INTO tareas_externas(tipo,consentimiento_id,archivo_id)
   SELECT 'retirar_archivo_externo',NEW.id,archivo_id FROM consentimiento_archivos_autorizados
   WHERE consentimiento_id=NEW.id ON CONFLICT DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER revocacion_tareas AFTER UPDATE ON consentimientos
FOR EACH ROW EXECUTE FUNCTION encolar_revocacion();

CREATE FUNCTION revocar_consentimiento(p_usuario uuid,p_consentimiento uuid) RETURNS void
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 PERFORM exigir_permiso(p_usuario,'consentimientos','validar');
 UPDATE consentimientos SET estado='revocado' WHERE id=p_consentimiento AND estado IN ('activo','pendiente','vencido');
 IF NOT FOUND THEN RAISE EXCEPTION 'Consentimiento no revocable o inexistente'; END IF;
 INSERT INTO eventos_auditoria(usuario_id,accion,tabla_afectada,entidad_id)
 VALUES(p_usuario,'revocar','consentimientos',p_consentimiento);
END $$;

CREATE FUNCTION proteger_temporada_de_mes() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NEW.temporada_id IS DISTINCT FROM OLD.temporada_id THEN
   RAISE EXCEPTION 'Para mover un mes: eliminar e insertar dentro de la misma transacción'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ingrediente_mes_padre BEFORE UPDATE ON ingrediente_temporada_meses
FOR EACH ROW EXECUTE FUNCTION proteger_temporada_de_mes();
CREATE TRIGGER variedad_mes_padre BEFORE UPDATE ON variedad_temporada_meses
FOR EACH ROW EXECUTE FUNCTION proteger_temporada_de_mes();

-- Auditar las relaciones del catálogo sin copiar sus textos, contactos ni documentos.
DO $auditoria$
DECLARE t record;
BEGIN
 FOR t IN SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='ogp' AND c.relkind='r'
   AND c.relname NOT IN ('eventos_auditoria','tareas_externas')
   AND NOT EXISTS(SELECT 1 FROM pg_trigger tr WHERE tr.tgrelid=c.oid AND NOT tr.tgisinternal
     AND tr.tgfoid='ogp.auditar_evento()'::regprocedure)
 LOOP
  EXECUTE format('CREATE TRIGGER auditar_relacion AFTER INSERT OR UPDATE OR DELETE ON %I
    FOR EACH ROW EXECUTE FUNCTION auditar_evento()',t.relname);
 END LOOP;
END $auditoria$;

REVOKE ALL ON ALL TABLES IN SCHEMA ogp FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ogp FROM PUBLIC;
COMMIT;
