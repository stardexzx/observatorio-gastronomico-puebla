BEGIN;
CREATE TABLE IF NOT EXISTS ogp.editor_credenciales (
 usuario_id uuid PRIMARY KEY REFERENCES ogp.usuarios(id), password_hash text NOT NULL
);
CREATE TABLE IF NOT EXISTS ogp.editor_sesiones (
 token_hash text PRIMARY KEY, usuario_id uuid NOT NULL REFERENCES ogp.usuarios(id),
 vence_en timestamptz NOT NULL DEFAULT now()+interval '8 hours'
);
CREATE TABLE IF NOT EXISTS ogp.editor_personas (
 persona_id uuid PRIMARY KEY REFERENCES ogp.personas(id), datos jsonb NOT NULL DEFAULT '{}'::jsonb,
 version integer NOT NULL DEFAULT 1, enviada_version integer, fuente_id uuid REFERENCES ogp.fuentes(id),
 consentimiento_id uuid REFERENCES ogp.consentimientos(id), actualizada_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS ogp.editor_archivos (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), persona_id uuid NOT NULL REFERENCES ogp.personas(id),
 clase text NOT NULL CHECK(clase IN ('foto','audio','consentimiento')), nombre text NOT NULL,
 mime text NOT NULL, contenido bytea NOT NULL CHECK(octet_length(contenido)>0 AND octet_length(contenido)<=52428800),
 metadatos jsonb NOT NULL DEFAULT '{}'::jsonb, creado_en timestamptz NOT NULL DEFAULT now(),
 archivo_evidencia_id uuid REFERENCES ogp.archivos(id)
);
CREATE INDEX IF NOT EXISTS editor_archivos_persona_idx ON ogp.editor_archivos(persona_id);

-- Extender los snapshots sin editar el esquema original del ZIP.
DO $$ BEGIN
 IF to_regprocedure('ogp.construir_contenido_base(text,uuid)') IS NULL THEN
   ALTER FUNCTION ogp.construir_contenido(text,uuid) RENAME TO construir_contenido_base;
 END IF;
END $$;
CREATE OR REPLACE FUNCTION ogp.construir_contenido(p_tipo text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path=ogp,public AS $$
DECLARE c jsonb; d jsonb; medios jsonb;
BEGIN
 c:=construir_contenido_base(p_tipo,p_id);
 IF p_tipo='persona' THEN
  SELECT datos INTO d FROM editor_personas WHERE persona_id=p_id;
  IF d IS NOT NULL THEN
   SELECT coalesce(jsonb_agg(jsonb_build_object('id',a.id,'nombre',a.nombre,'mime',a.mime,'clase',a.clase,'metadatos',a.metadatos) ORDER BY a.creado_en),'[]'::jsonb)
   INTO medios FROM editor_archivos a WHERE a.persona_id=p_id AND a.clase<>'consentimiento'
     AND (coalesce(d->'mediaIds','[]'::jsonb) ? a.id::text);
   c:=jsonb_set(c,'{detalle}',(c->'detalle') || jsonb_build_object('perfil',jsonb_build_object(
     'frase',d->>'quote','colectivo',d->>'collective','localidad',d->>'community','region',d->>'region',
     'linaje',coalesce(d->'lineage','[]'::jsonb),'establecimiento',d->>'establishment',
     'estudiantes',d->'students','reconocimientos_publicos',d->>'recognitions','tipo_participacion',d->>'role'), 'multimedia',medios));
  END IF;
 END IF;
 RETURN c;
END $$;

CREATE OR REPLACE FUNCTION ogp.editor_vincular_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path=ogp,public AS $$
DECLARE e editor_personas; item text; target uuid;
BEGIN
 SELECT * INTO e FROM editor_personas WHERE persona_id=NEW.registro_id;
 IF NOT FOUND THEN RETURN NEW; END IF;
 FOR item IN SELECT jsonb_array_elements_text(coalesce(e.datos->'recipeIds','[]'::jsonb)) LOOP
  target:=item::uuid;
  IF EXISTS(SELECT 1 FROM v_fichas_publicas WHERE registro_id=target AND tipo='receta') THEN
   INSERT INTO revision_dependencias VALUES(NEW.id,target,'receta_insignia',false,NULL);
  END IF;
 END LOOP;
 FOR item IN SELECT jsonb_array_elements_text(coalesce(e.datos->'marketIds','[]'::jsonb)) LOOP
  target:=item::uuid;
  IF EXISTS(SELECT 1 FROM v_fichas_publicas WHERE registro_id=target AND tipo='mercado') THEN
   INSERT INTO revision_dependencias VALUES(NEW.id,target,'mercado_vinculado',false,NULL);
  END IF;
 END LOOP;
 IF e.consentimiento_id IS NOT NULL AND consentimiento_valido(e.consentimiento_id) THEN
  INSERT INTO consentimiento_revision_alcances VALUES(e.consentimiento_id,NEW.id,'Ficha y multimedia seleccionada para esta revisión');
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS editor_revision_relaciones ON ogp.registro_revisiones;
CREATE TRIGGER editor_revision_relaciones AFTER INSERT ON ogp.registro_revisiones
FOR EACH ROW EXECUTE FUNCTION ogp.editor_vincular_revision();

CREATE OR REPLACE FUNCTION ogp.consultar_archivo_publico(p_id uuid)
RETURNS TABLE(nombre text,mime text,contenido bytea)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=pg_catalog,ogp,public AS $$
 SELECT a.nombre,a.mime,a.contenido FROM ogp.editor_archivos a
 WHERE a.id=p_id AND a.clase<>'consentimiento' AND EXISTS(
  SELECT 1 FROM ogp.v_fichas_publicas f WHERE f.registro_id=a.persona_id
  AND EXISTS(SELECT 1 FROM jsonb_array_elements(coalesce(f.contenido#>'{detalle,multimedia}','[]'::jsonb)) m WHERE m->>'id'=a.id::text));
$$;

DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='ogp_editor_api') THEN CREATE ROLE ogp_editor_api NOLOGIN; END IF;
END $$;
GRANT USAGE ON SCHEMA ogp TO ogp_editor_api;
GRANT SELECT ON ALL TABLES IN SCHEMA ogp TO ogp_editor_api;
GRANT INSERT,UPDATE ON ogp.registros,ogp.personas,ogp.editor_personas,ogp.fuentes,
 ogp.consentimientos,ogp.archivos,ogp.reconocimientos,ogp.especialidades,ogp.lenguas TO ogp_editor_api;
GRANT INSERT,DELETE ON ogp.persona_tipos_participacion,ogp.persona_especialidades,ogp.persona_lenguas,
 ogp.persona_fuentes,ogp.persona_territorios,ogp.editor_sesiones TO ogp_editor_api;
GRANT INSERT ON ogp.editor_archivos,ogp.consentimiento_archivos,ogp.consentimiento_registros,
 ogp.consentimiento_revision_alcances,ogp.registro_revisiones,ogp.revision_dependencias,
 ogp.revision_fuentes,ogp.revision_archivos,ogp.revision_territorios,ogp.evaluaciones_revision,
 ogp.eventos_editoriales,ogp.eventos_auditoria,ogp.tareas_externas TO ogp_editor_api;
GRANT UPDATE(archivo_evidencia_id) ON ogp.editor_archivos TO ogp_editor_api;
GRANT UPDATE(sellada_en) ON ogp.registro_revisiones TO ogp_editor_api;
GRANT ogp_lector TO ogp_editor_api;
GRANT INSERT,UPDATE ON ogp.publicaciones TO ogp_editor_api;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA ogp TO ogp_editor_api;
REVOKE ALL ON ogp.editor_credenciales,ogp.editor_sesiones,ogp.editor_personas,ogp.editor_archivos FROM PUBLIC;
REVOKE ALL ON FUNCTION ogp.consultar_archivo_publico(uuid),ogp.editor_vincular_revision(),ogp.construir_contenido(text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ogp.consultar_archivo_publico(uuid) TO ogp_lector;
COMMIT;
