-- Ejecutar después de instalar el esquema, sobre una base de pruebas.
-- Los datos sintéticos y todas sus modificaciones se revierten al terminar.
BEGIN;
SET LOCAL search_path = ogp, public;

DO $pruebas$
DECLARE
 u uuid; cap uuid; fuente uuid; puebla uuid; prep uuid; ing uuid; ing2 uuid; variedad uuid;
 receta uuid; rev uuid; rev_prep uuid; pub uuid; rechazado boolean; original text;
BEGIN
 INSERT INTO usuarios(correo,nombre,estado) VALUES ('prueba-sql@invalid.example','Prueba SQL','activo') RETURNING id INTO u;
 INSERT INTO usuarios(correo,nombre,estado) VALUES ('captura-sql@invalid.example','Solo captura','activo') RETURNING id INTO cap;
 PERFORM set_config('ogp.actor_id',u::text,true);
 INSERT INTO usuario_roles(usuario_id,rol_id) SELECT u,id FROM roles WHERE codigo IN ('capturista','revisor','publicador');
 INSERT INTO usuario_roles(usuario_id,rol_id) SELECT cap,id FROM roles WHERE codigo='capturista';
 INSERT INTO usuario_modulos(usuario_id,modulo) SELECT u,codigo FROM tipos_registro;
 INSERT INTO usuario_modulos(usuario_id,modulo) SELECT cap,codigo FROM tipos_registro;
 INSERT INTO fuentes(tipo_id,titulo,referencia,cita_publica,visibilidad,creado_por)
 SELECT id,'Fuente sintética de prueba','Solo para pruebas con ROLLBACK','Fuente de prueba','publico',u
 FROM tipos_fuente WHERE codigo='historico' RETURNING id INTO fuente;
 INSERT INTO territorios(tipo_id,nombre) SELECT id,'Puebla (prueba)' FROM tipos_territorio WHERE codigo='estado' RETURNING id INTO puebla;
 INSERT INTO referencias_territoriales(territorio_id,fuente_id,identificador_externo)
 VALUES(puebla,fuente,'21');

 prep:=crear_registro(u,'preparacion'); 
 INSERT INTO preparaciones(id,nombre,categoria_id,descripcion)
 SELECT prep,'Preparación sintética',id,'Descripción documentada de prueba.' FROM categorias_preparacion WHERE codigo='guisos';
 INSERT INTO preparacion_fuentes VALUES(prep,fuente,'Describe esta preparación',NULL);
 INSERT INTO preparacion_territorios VALUES(prep,puebla,'documentacion',fuente,NULL);
 rev_prep:=enviar_revision(u,prep);
 PERFORM evaluar_revision(u,rev_prep,'validado');
 PERFORM publicar_revision(u,rev_prep);
 IF NOT ficha_visible(prep) THEN RAISE EXCEPTION 'Fallo: preparación publicada no visible'; END IF;

 ing:=crear_registro(u,'ingrediente');
 INSERT INTO ingredientes(id,nombre,categoria_id,descripcion)
 SELECT ing,'Ingrediente sintético',id,'Descripción del ingrediente.' FROM categorias_ingrediente WHERE codigo='vegetal';
 INSERT INTO ingrediente_fuentes VALUES(ing,fuente,'Describe el ingrediente',NULL);
 rev:=enviar_revision(u,ing);
 PERFORM evaluar_revision(u,rev,'validado');
 PERFORM publicar_revision(u,rev);

 ing2:=crear_registro(u,'ingrediente');
 INSERT INTO ingredientes(id,nombre) VALUES(ing2,'Otro ingrediente en borrador');
 variedad:=crear_registro(u,'variedad');
 INSERT INTO ingrediente_variedades(id,ingrediente_id,nombre) VALUES(variedad,ing2,'Variedad del otro ingrediente');
 receta:=crear_registro(u,'receta');
 INSERT INTO recetas_documentadas(id,preparacion_id,titulo,descripcion,tipo_documentacion_id,limitaciones_documentacion)
 SELECT receta,prep,'Variante histórica sintética','Procedimiento parcialmente conservado.',id,'La fuente no conserva los pasos completos.'
 FROM tipos_fuente WHERE codigo='historico';
 INSERT INTO receta_fuentes VALUES(receta,fuente,'Documenta esta variante',NULL);
 INSERT INTO receta_territorios VALUES(receta,puebla,'documentacion',fuente,NULL);

 rechazado:=false;
 BEGIN
   INSERT INTO receta_ingredientes(receta_id,ingrediente_id,variedad_id,orden) VALUES(receta,ing,variedad,1);
 EXCEPTION WHEN foreign_key_violation THEN rechazado:=true;
 END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Fallo: se aceptó una variedad de otro ingrediente'; END IF;
 rechazado:=false;
 BEGIN
   INSERT INTO receta_ingredientes(receta_id,ingrediente_id,cantidad,unidad_id,orden)
   SELECT receta,ing,-1,id,1 FROM unidades WHERE codigo='g';
 EXCEPTION WHEN check_violation THEN rechazado:=true;
 END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Fallo: se aceptó una cantidad negativa'; END IF;
 INSERT INTO receta_ingredientes(receta_id,ingrediente_id,cantidad_texto,orden) VALUES(receta,ing,'al gusto',1);
 rev:=enviar_revision(u,receta);
 PERFORM evaluar_revision(u,rev,'validado');
 IF NOT EXISTS(SELECT 1 FROM evaluaciones_revision WHERE revision_id=rev AND revisor_id=u) THEN
   RAISE EXCEPTION 'Fallo: autovalidación no registrada'; END IF;
 pub:=publicar_revision(u,rev);
 SELECT contenido#>>'{ficha,descripcion}' INTO original FROM v_fichas_publicas WHERE registro_id=receta;
 UPDATE recetas_documentadas SET descripcion='Edición interna aún no publicada.' WHERE id=receta;
 IF (SELECT contenido#>>'{ficha,descripcion}' FROM v_fichas_publicas WHERE registro_id=receta) IS DISTINCT FROM original THEN
   RAISE EXCEPTION 'Fallo: un borrador alteró la versión pública'; END IF;

 rechazado:=false;
 BEGIN
   UPDATE registro_revisiones SET contenido_publico='{}'::jsonb WHERE id=rev;
 EXCEPTION WHEN raise_exception THEN rechazado:=true;
 END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Fallo: revisión enviada modificable'; END IF;
 rechazado:=false;
 BEGIN
   INSERT INTO revision_fuentes VALUES(rev,fuente,'Cita alterada','Afirmación alterada',NULL);
 EXCEPTION WHEN raise_exception THEN rechazado:=true;
 END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Fallo: se pudo alterar el detalle sellado'; END IF;
 rechazado:=false;
 BEGIN
   PERFORM publicar_revision(cap,rev);
 EXCEPTION WHEN insufficient_privilege THEN rechazado:=true;
 END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Fallo: capturista pudo publicar sin rol'; END IF;

 rechazado:=false;
 BEGIN
   INSERT INTO publicaciones(registro_id,revision_id,evaluacion_id,publicado_por)
   SELECT receta,rev,id,u FROM evaluaciones_revision WHERE revision_id=rev;
 EXCEPTION WHEN unique_violation THEN rechazado:=true;
 END;
 IF NOT rechazado THEN RAISE EXCEPTION 'Fallo: dos publicaciones activas'; END IF;

 PERFORM retirar_publicacion(u,prep,'Retiro de prueba');
 IF ficha_visible(receta) THEN RAISE EXCEPTION 'Fallo: variante visible con preparación retirada'; END IF;
 IF NOT EXISTS(SELECT 1 FROM eventos_auditoria WHERE usuario_id=u AND registro_id=receta) THEN
   RAISE EXCEPTION 'Fallo: falta auditoría de receta'; END IF;
 RAISE NOTICE 'Pruebas de integridad completadas; los datos se revertirán.';
END $pruebas$;
SET CONSTRAINTS ALL IMMEDIATE;
ROLLBACK;
