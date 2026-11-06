-- Captura provisional de campos de receta del panel. No crea fichas ni cuentas.
BEGIN;
CREATE SCHEMA IF NOT EXISTS demo;
REVOKE ALL ON SCHEMA demo FROM PUBLIC;
CREATE TABLE IF NOT EXISTS demo.recipe_forms (
 receta_id uuid PRIMARY KEY REFERENCES ogp.recetas_documentadas(id),
 form jsonb NOT NULL,
 actualizado_en timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON TABLE demo.recipe_forms FROM PUBLIC;
COMMIT;
