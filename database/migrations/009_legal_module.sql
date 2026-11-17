-- Protección legal: extensiones del dominio existente, sin registros de ejemplo.
-- Se aplica sobre instalaciones nuevas y existentes dentro de una transacción.
BEGIN;
SET LOCAL search_path = ogp, public;

INSERT INTO tipos_instrumento_legal(codigo,nombre) VALUES
 ('do','Denominación de origen'),
 ('ig','Indicación geográfica'),
 ('declaratoria','Declaratoria patrimonial'),
 ('platillo_tipico','Platillo típico'),
 ('ley','Ley'),
 ('reglamento','Reglamento'),
 ('decreto','Decreto'),
 ('marca_colectiva','Marca colectiva'),
 ('programa_gubernamental','Programa gubernamental'),
 ('otro','Otro instrumento')
ON CONFLICT (codigo) DO NOTHING;

-- Solo amplía facultades de Protección legal para los tres roles del panel.
-- Las asignaciones de captura y usuario_modulos siguen siendo comprobadas por ogp.
INSERT INTO rol_permisos(rol_id,permiso_id)
 SELECT r.id,p.id FROM roles r CROSS JOIN permisos p
 WHERE p.modulo IN ('instrumento','expediente')
 AND ((r.codigo='administrador' AND p.accion IN ('crear','editar','enviar','validar','publicar','retirar'))
   OR (r.codigo='revisor' AND p.accion IN ('validar','publicar','retirar')))
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS instrumento_panel (
 instrumento_id uuid PRIMARY KEY REFERENCES instrumentos_legales(id),
 form jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(form)='object'),
 notas_privadas text NOT NULL DEFAULT '',
 expediente_id uuid REFERENCES expedientes_legales(id),
 actualizado_por uuid NOT NULL REFERENCES usuarios(id),
 actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS instrumento_fuentes_gestionadas (
 instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
 fuente_id uuid NOT NULL REFERENCES fuentes(id),
 PRIMARY KEY(instrumento_id,fuente_id)
);
CREATE INDEX IF NOT EXISTS instrumento_fuentes_gestionadas_fuente_idx
 ON instrumento_fuentes_gestionadas(fuente_id);

CREATE TABLE IF NOT EXISTS instrumento_personas (
 instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
 persona_id uuid NOT NULL REFERENCES personas(id),
 kind text NOT NULL DEFAULT 'cooks' CHECK(kind IN ('cooks','producers')),
 alcance texto_no_vacio NOT NULL,
 fuente_id uuid NOT NULL REFERENCES fuentes(id),
 PRIMARY KEY(instrumento_id,persona_id)
);
CREATE INDEX IF NOT EXISTS instrumento_personas_persona_idx ON instrumento_personas(persona_id);
CREATE TABLE IF NOT EXISTS instrumento_mercados (
 instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
 mercado_id uuid NOT NULL REFERENCES mercados(id),
 alcance texto_no_vacio NOT NULL,
 fuente_id uuid NOT NULL REFERENCES fuentes(id),
 PRIMARY KEY(instrumento_id,mercado_id)
);
CREATE INDEX IF NOT EXISTS instrumento_mercados_mercado_idx ON instrumento_mercados(mercado_id);

-- Las fichas del panel conservan su identidad: no se clonan en las tablas de dominio.
CREATE TABLE IF NOT EXISTS instrumento_cocineras_panel (
 instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
 cocinera_id text NOT NULL,
 kind text GENERATED ALWAYS AS ('cooks'::text) STORED,
 alcance texto_no_vacio NOT NULL,
 fuente_id uuid NOT NULL REFERENCES fuentes(id),
 PRIMARY KEY(instrumento_id,cocinera_id),
 FOREIGN KEY(kind,cocinera_id) REFERENCES demo.catalog_forms(kind,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS instrumento_cocineras_panel_cocinera_idx
 ON instrumento_cocineras_panel(cocinera_id);
CREATE TABLE IF NOT EXISTS instrumento_ingredientes_panel (
 instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
 ingrediente_id text NOT NULL,
 kind text GENERATED ALWAYS AS ('ingredients'::text) STORED,
 alcance texto_no_vacio NOT NULL,
 fuente_id uuid NOT NULL REFERENCES fuentes(id),
 PRIMARY KEY(instrumento_id,ingrediente_id),
 FOREIGN KEY(kind,ingrediente_id) REFERENCES demo.catalog_forms(kind,id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS instrumento_ingredientes_panel_ingrediente_idx
 ON instrumento_ingredientes_panel(ingrediente_id);

-- Los bytes y su procedencia son inmutables. Separar la relación del borrador
-- permite quitar un adjunto sin destruir el documento de una versión aprobada.
CREATE TABLE IF NOT EXISTS legal_pdf_blobs (
 archivo_id uuid PRIMARY KEY REFERENCES archivos(id),
 instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
 contenido bytea NOT NULL CHECK(octet_length(contenido) BETWEEN 8 AND 20*1024*1024),
 sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 UNIQUE(archivo_id,instrumento_id)
);
CREATE INDEX IF NOT EXISTS legal_pdf_blobs_instrumento_idx ON legal_pdf_blobs(instrumento_id);
CREATE TABLE IF NOT EXISTS instrumento_pdf_adjuntos (
 instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
 archivo_id uuid NOT NULL,
 fuente_id uuid REFERENCES fuentes(id),
 orden integer NOT NULL DEFAULT 1 CHECK(orden>0),
 PRIMARY KEY(instrumento_id,archivo_id),
 FOREIGN KEY(archivo_id,instrumento_id) REFERENCES legal_pdf_blobs(archivo_id,instrumento_id)
);
CREATE TABLE IF NOT EXISTS instrumento_revision_pdf (
 revision_id uuid NOT NULL,
 instrumento_id uuid NOT NULL,
 archivo_id uuid NOT NULL,
 nombre texto_no_vacio NOT NULL,
 licencia texto_no_vacio NOT NULL,
 sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 tamano_bytes bigint NOT NULL CHECK(tamano_bytes BETWEEN 8 AND 20*1024*1024),
 PRIMARY KEY(revision_id,archivo_id),
 FOREIGN KEY(revision_id,instrumento_id) REFERENCES registro_revisiones(id,registro_id),
 FOREIGN KEY(archivo_id,instrumento_id) REFERENCES legal_pdf_blobs(archivo_id,instrumento_id)
);
CREATE INDEX IF NOT EXISTS instrumento_revision_pdf_archivo_idx ON instrumento_revision_pdf(archivo_id);

DO $legal_triggers$
DECLARE t text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ogp.legal_pdf_blobs'::regclass AND tgname='legal_pdf_inmutable') THEN
  CREATE TRIGGER legal_pdf_inmutable BEFORE UPDATE OR DELETE ON legal_pdf_blobs
   FOR EACH ROW EXECUTE FUNCTION impedir_mutacion();
 END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_trigger WHERE tgrelid='ogp.instrumento_revision_pdf'::regclass AND tgname='legal_pdf_revision_sellada') THEN
  CREATE TRIGGER legal_pdf_revision_sellada BEFORE INSERT OR UPDATE OR DELETE ON instrumento_revision_pdf
   FOR EACH ROW EXECUTE FUNCTION proteger_detalle_revision();
 END IF;
 FOREACH t IN ARRAY ARRAY['instrumento_panel','instrumento_fuentes_gestionadas',
  'instrumento_personas','instrumento_mercados','instrumento_cocineras_panel',
  'instrumento_ingredientes_panel','instrumento_pdf_adjuntos','instrumento_revision_pdf']
 LOOP
  IF NOT EXISTS(SELECT 1 FROM pg_trigger
   WHERE tgrelid=to_regclass('ogp.'||t) AND tgname='auditar_legal_relacion') THEN
   EXECUTE format('CREATE TRIGGER auditar_legal_relacion AFTER INSERT OR UPDATE OR DELETE ON %I
    FOR EACH ROW EXECUTE FUNCTION ogp.auditar_evento()',t);
  END IF;
 END LOOP;
END $legal_triggers$;

-- Entrada específica para extender la revisión legal sin alterar el flujo de
-- otros módulos. p_detalle lo construye el servicio, mediante una lista explícita
-- de campos públicos de la captura bloqueada; no es el payload enviado por el cliente.
CREATE OR REPLACE FUNCTION enviar_instrumento_revision(p_usuario uuid,p_registro uuid,p_detalle jsonb)
RETURNS uuid LANGUAGE plpgsql SET search_path = ogp, public AS $legal_revision$
DECLARE v_tipo text; v_id uuid; v_num integer; v_contenido jsonb;
BEGIN
 IF jsonb_typeof(p_detalle) IS DISTINCT FROM 'object' THEN
  RAISE EXCEPTION 'El contenido público legal debe ser un objeto';
 END IF;
 IF p_detalle ? 'id' AND p_detalle->>'id' IS DISTINCT FROM p_registro::text THEN
  RAISE EXCEPTION 'El contenido no corresponde al instrumento';
 END IF;
 SELECT tipo INTO STRICT v_tipo FROM registros
  WHERE id=p_registro AND archivado_en IS NULL FOR UPDATE;
 IF v_tipo<>'instrumento' THEN RAISE EXCEPTION 'La ficha no es un instrumento jurídico'; END IF;
 PERFORM exigir_permiso(p_usuario,'instrumento','enviar',p_registro);
 PERFORM set_config('ogp.actor_id',p_usuario::text,true);
 SELECT coalesce(max(numero),0)+1 INTO v_num FROM registro_revisiones WHERE registro_id=p_registro;
 v_contenido:=construir_contenido('instrumento',p_registro);
 v_contenido:=v_contenido||jsonb_build_object('detalle',
  coalesce(v_contenido->'detalle','{}'::jsonb)||jsonb_build_object('legal',p_detalle));
 INSERT INTO registro_revisiones(registro_id,numero,creado_por,contenido_publico)
  VALUES(p_registro,v_num,p_usuario,v_contenido) RETURNING id INTO v_id;

 INSERT INTO revision_fuentes(revision_id,fuente_id,cita_publica,afirmacion,apartado)
  SELECT v_id,f.id,CASE WHEN f.visibilidad='publico' THEN coalesce(f.cita_publica,f.titulo||'. '||f.referencia)
   ELSE f.cita_publica END,x.afirmacion,x.apartado
  FROM instrumento_fuentes x JOIN fuentes f ON f.id=x.fuente_id
  WHERE x.instrumento_id=p_registro AND (f.visibilidad='publico' OR f.cita_publica IS NOT NULL);

 INSERT INTO revision_archivos(revision_id,archivo_id,funcion,texto_alternativo,descripcion_publica,orden)
  SELECT v_id,x.archivo_id,x.funcion,x.texto_alternativo,x.descripcion_publica,x.orden
  FROM instrumento_archivos x JOIN archivos a ON a.id=x.archivo_id
  WHERE x.instrumento_id=p_registro AND a.visibilidad='publico' AND a.estado='disponible'
   AND a.url_publica IS NOT NULL AND coalesce(length(btrim(a.licencia)),0)>0;

 INSERT INTO revision_territorios(revision_id,territorio_id,tipo_vinculo,nombre_en_revision,tipo_territorio_en_revision)
  SELECT v_id,t.id,x.tipo_vinculo,t.nombre,tt.codigo
  FROM instrumento_territorios x JOIN territorios t ON t.id=x.territorio_id
  JOIN tipos_territorio tt ON tt.id=t.tipo_id WHERE x.instrumento_id=p_registro;

 INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica)
  SELECT v_id,x.destino,'instrumento_relacionado',false,x.alcance FROM (
   SELECT preparacion_id AS destino,alcance FROM instrumento_preparaciones WHERE instrumento_id=p_registro
   UNION ALL SELECT receta_id,alcance FROM instrumento_recetas WHERE instrumento_id=p_registro
   UNION ALL SELECT ingrediente_id,alcance FROM instrumento_ingredientes WHERE instrumento_id=p_registro
   UNION ALL SELECT variedad_id,alcance FROM instrumento_variedades WHERE instrumento_id=p_registro
   UNION ALL SELECT persona_id,alcance FROM instrumento_personas WHERE instrumento_id=p_registro
   UNION ALL SELECT mercado_id,alcance FROM instrumento_mercados WHERE instrumento_id=p_registro
  ) x ON CONFLICT DO NOTHING;

 INSERT INTO instrumento_revision_pdf(revision_id,instrumento_id,archivo_id,nombre,licencia,sha256,tamano_bytes)
  SELECT v_id,p_registro,a.id,a.nombre,a.licencia,b.sha256,octet_length(b.contenido)
  FROM instrumento_pdf_adjuntos x JOIN legal_pdf_blobs b
   ON b.archivo_id=x.archivo_id AND b.instrumento_id=x.instrumento_id
  JOIN archivos a ON a.id=b.archivo_id
  WHERE x.instrumento_id=p_registro AND a.estado='disponible' AND a.visibilidad='publico'
   AND coalesce(length(btrim(a.licencia)),0)>0;

 -- No se permite que el complemento público cite un PDF ajeno, privado o sin
 -- condiciones de publicación. Los archivos externos se comprobaron arriba.
 IF p_detalle ? 'documents' THEN
  IF jsonb_typeof(p_detalle->'documents') IS DISTINCT FROM 'array' THEN
   RAISE EXCEPTION 'Los documentos públicos deben ser una lista';
  END IF;
  IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_detalle->'documents') d
   WHERE NOT EXISTS(SELECT 1 FROM instrumento_revision_pdf r
    WHERE r.revision_id=v_id AND r.archivo_id::text=d->>'id')
   AND NOT EXISTS(SELECT 1 FROM revision_archivos r
    WHERE r.revision_id=v_id AND r.archivo_id::text=d->>'id')) THEN
   RAISE EXCEPTION 'Un documento no está autorizado para esta revisión';
  END IF;
 END IF;

 PERFORM validar_revision(v_id);
 UPDATE registro_revisiones SET sellada_en=now() WHERE id=v_id;
 INSERT INTO eventos_editoriales(registro_id,revision_id,usuario_id,accion)
  VALUES(p_registro,v_id,p_usuario,'enviar');
 RETURN v_id;
END $legal_revision$;

REVOKE ALL ON TABLE instrumento_panel,instrumento_fuentes_gestionadas,
 instrumento_personas,instrumento_mercados,instrumento_cocineras_panel,
 instrumento_ingredientes_panel,legal_pdf_blobs,instrumento_pdf_adjuntos,
 instrumento_revision_pdf FROM PUBLIC;
REVOKE ALL ON FUNCTION enviar_instrumento_revision(uuid,uuid,jsonb) FROM PUBLIC;
COMMIT;
