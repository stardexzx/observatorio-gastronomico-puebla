-- Ejecutar el script completo solamente en observatorio_puebla_test.
-- Archiva las recetas de la demo; no elimina fichas, pasos, ingredientes ni auditoría.
BEGIN;

DO $$
BEGIN
 IF current_database() <> 'observatorio_puebla_test' THEN
  RAISE EXCEPTION 'Este script solo se permite en observatorio_puebla_test';
 END IF;
END $$;

SELECT set_config('ogp.actor_id', id::text, true)
FROM ogp.usuarios WHERE correo = 'demo-local@invalid.example';

UPDATE ogp.registros r
SET archivado_en = now()
FROM demo.recipe_forms f
WHERE r.id = f.receta_id
  AND r.tipo = 'receta'
  AND r.archivado_en IS NULL;

COMMIT;
