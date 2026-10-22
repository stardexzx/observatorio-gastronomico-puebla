-- Datos sintéticos exclusivos de la base temporal de pruebas; no son contenido real.
BEGIN;
SET LOCAL search_path=ogp,public;
DO $$
DECLARE u uuid; src uuid; state_id uuid; mun uuid; prep uuid; ing uuid; recipe uuid;
 market uuid; loc uuid; person uuid; consent uuid; evidence uuid; legal uuid; series uuid;
 episode uuid; institutional uuid; rev uuid; draft uuid;
BEGIN
 INSERT INTO usuarios(correo,nombre,estado) VALUES('integration@invalid.example','Pruebas de integración','activo') RETURNING id INTO u;
 PERFORM set_config('ogp.actor_id',u::text,true);
 INSERT INTO usuario_roles(usuario_id,rol_id) SELECT u,id FROM roles WHERE codigo IN ('capturista','revisor','publicador','verificador_consentimientos');
 INSERT INTO usuario_modulos(usuario_id,modulo) SELECT u,codigo FROM tipos_registro;
 INSERT INTO usuario_modulos VALUES(u,'consentimientos');
 INSERT INTO fuentes(tipo_id,titulo,referencia,cita_publica,visibilidad,creado_por)
 SELECT id,'Fuente sintética','Prueba, no evidencia histórica','Fuente de integración sintética','publico',u FROM tipos_fuente WHERE codigo='historico' RETURNING id INTO src;
 INSERT INTO territorios(tipo_id,nombre) SELECT id,'Puebla (prueba)' FROM tipos_territorio WHERE codigo='estado' RETURNING id INTO state_id;
 INSERT INTO referencias_territoriales(territorio_id,fuente_id,identificador_externo) VALUES(state_id,src,'21');
 INSERT INTO territorios(tipo_id,nombre) SELECT id,'Municipio sintético' FROM tipos_territorio WHERE codigo='municipio' RETURNING id INTO mun;
 INSERT INTO municipios_puebla(territorio_id,cve_mun,version_fuente,fuente_id) VALUES(mun,'114','prueba',src);
 INSERT INTO territorio_relaciones VALUES(mun,state_id,'pertenece');

 prep:=crear_registro(u,'preparacion');
 INSERT INTO preparaciones(id,nombre,categoria_id,descripcion) SELECT prep,'Preparación de integración',id,'Descripción sintética.' FROM categorias_preparacion WHERE codigo='guisos';
 INSERT INTO preparacion_fuentes VALUES(prep,src,'Prueba',NULL);
 INSERT INTO preparacion_territorios VALUES(prep,mun,'documentacion',src,NULL);
 rev:=enviar_revision(u,prep); PERFORM evaluar_revision(u,rev,'validado'); PERFORM publicar_revision(u,rev);

 ing:=crear_registro(u,'ingrediente');
 INSERT INTO ingredientes(id,nombre,categoria_id,descripcion) SELECT ing,'Chile sintético',id,'Ingrediente de prueba.' FROM categorias_ingrediente WHERE codigo='vegetal';
 INSERT INTO ingrediente_fuentes VALUES(ing,src,'Prueba',NULL);
 rev:=enviar_revision(u,ing); PERFORM evaluar_revision(u,rev,'validado'); PERFORM publicar_revision(u,rev);

 recipe:=crear_registro(u,'receta');
 INSERT INTO recetas_documentadas(id,preparacion_id,titulo,descripcion,tipo_documentacion_id,nivel_documentacion,referencia_temporal)
 SELECT recipe,prep,'Receta de integración', 'Receta sintética con ingredientes y pasos.',id,'completa','Prueba actual' FROM tipos_fuente WHERE codigo='historico';
 INSERT INTO receta_fuentes VALUES(recipe,src,'Prueba',NULL);
 INSERT INTO receta_territorios VALUES(recipe,mun,'documentacion',src,NULL);
 INSERT INTO receta_ingredientes(receta_id,ingrediente_id,cantidad_texto,orden) VALUES(recipe,ing,'al gusto',1);
 INSERT INTO receta_pasos(receta_id,orden,instrucciones) VALUES(recipe,1,'Preparar el ingrediente sintético.');
 rev:=enviar_revision(u,recipe); PERFORM evaluar_revision(u,rev,'validado'); PERFORM publicar_revision(u,rev);

 market:=crear_registro(u,'mercado');
 INSERT INTO mercados(id,nombre,tipo,descripcion,fecha_comprobacion) VALUES(market,'Mercado de integración','mercado','Mercado sintético.',current_date);
 INSERT INTO mercado_fuentes VALUES(market,src,'Prueba',NULL);
 INSERT INTO mercado_territorios VALUES(market,mun,'ubicacion',src,NULL);
 INSERT INTO mercado_ubicaciones(mercado_id,direccion,municipio_id,punto,vigente_desde,fuente_id)
 VALUES(market,'Dirección sintética',mun,ST_SetSRID(ST_MakePoint(-98.2,19.04),4326),current_date,src) RETURNING id INTO loc;
 INSERT INTO mercado_horarios(ubicacion_id,dia_semana,apertura,cierre) VALUES(loc,1,'08:00','18:00');
 rev:=enviar_revision(u,market); PERFORM evaluar_revision(u,rev,'validado'); PERFORM publicar_revision(u,rev);

 person:=crear_registro(u,'persona');
 INSERT INTO personas(id,nombre_publico,semblanza) VALUES(person,'Persona de integración','Semblanza pública sintética.');
 INSERT INTO persona_datos_restringidos VALUES(person,'Nombre privado','private@invalid.example','555-PRIVATE','NOTAS PRIVADAS');
 INSERT INTO persona_fuentes VALUES(person,src,'Prueba',NULL);
 INSERT INTO persona_territorios VALUES(person,mun,'documentacion',src,NULL);
 INSERT INTO persona_tipos_participacion SELECT person,id FROM tipos_participacion LIMIT 1;
 INSERT INTO consentimientos(persona_id,autoriza,calidad_autorizante,fecha,alcance,uso_permitido,creado_por)
 VALUES(person,'Autorizante sintético','Titular',current_date,'Prueba','Prueba',u) RETURNING id INTO consent;
 INSERT INTO archivos(proveedor,clave_externa,nombre,estado,visibilidad,creado_por)
 VALUES('prueba','evidencia-privada','CONSENTIMIENTO PRIVADO','disponible','restringido',u) RETURNING id INTO evidence;
 INSERT INTO consentimiento_archivos VALUES(consent,evidence);
 INSERT INTO consentimiento_registros VALUES(consent,person);
 PERFORM activar_consentimiento(u,consent);
 rev:=enviar_revision(u,person);
 INSERT INTO consentimiento_revision_alcances VALUES(consent,rev,'Prueba');
 PERFORM evaluar_revision(u,rev,'validado'); PERFORM publicar_revision(u,rev);

 legal:=crear_registro(u,'instrumento');
 INSERT INTO instrumentos_legales(id,nombre_oficial,tipo_id,autoridad,referencia_oficial,alcance,fecha_revision,situacion)
 SELECT legal,'Instrumento de integración',id,'Autoridad sintética','Referencia de prueba','Alcance sintético',current_date,'vigente_documentada' FROM tipos_instrumento_legal LIMIT 1;
 INSERT INTO instrumento_fuentes VALUES(legal,src,'Prueba',NULL);
 rev:=enviar_revision(u,legal); PERFORM evaluar_revision(u,rev,'validado'); PERFORM publicar_revision(u,rev);

 series:=crear_registro(u,'podcast');
 INSERT INTO podcasts(id,nombre,descripcion,proposito) VALUES(series,'Serie de integración','Serie sintética.','Prueba de lectura.');
 rev:=enviar_revision(u,series); PERFORM evaluar_revision(u,rev,'validado'); PERFORM publicar_revision(u,rev);
 episode:=crear_registro(u,'episodio');
 INSERT INTO episodios(id,podcast_id,titulo,resumen,transcripcion) VALUES(episode,series,'Episodio de integración','Resumen sintético.','Transcripción sintética.');
 INSERT INTO episodio_creditos(episodio_id,nombre_publico,funcion,autorizacion_confirmada) VALUES(episode,'Crédito sintético','Presentación',true);
 INSERT INTO episodio_enlaces(episodio_id,plataforma,url,tipo,verificado_en,disponible) VALUES(episode,'Página de prueba','https://invalid.example/audio','pagina',now(),true);
 rev:=enviar_revision(u,episode); PERFORM evaluar_revision(u,rev,'validado'); PERFORM publicar_revision(u,rev);

 institutional:=crear_registro(u,'institucional');
 INSERT INTO contenidos_institucionales(id,clave,titulo,cuerpo) VALUES(institutional,'acerca','Acerca de integración','Contenido institucional sintético.');
 rev:=enviar_revision(u,institutional); PERFORM evaluar_revision(u,rev,'validado'); PERFORM publicar_revision(u,rev);
 draft:=crear_registro(u,'ingrediente');
 INSERT INTO ingredientes(id,nombre) VALUES(draft,'BORRADOR NO PUBLICADO');
END $$;
COMMIT;
