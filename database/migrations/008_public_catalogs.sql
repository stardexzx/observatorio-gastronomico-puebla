-- Catálogos capturados por el panel y versiones expresamente aprobadas para lectura pública.
-- No importa ejemplos de los catálogos locales ni crea personas, cuentas o recetas.
BEGIN;
CREATE SCHEMA IF NOT EXISTS demo;
CREATE TABLE IF NOT EXISTS demo.catalog_forms (
 kind text NOT NULL CHECK(kind IN ('cooks','ingredients','episodes')),
 id text NOT NULL CHECK(length(id) BETWEEN 1 AND 100),
 form jsonb NOT NULL CHECK(jsonb_typeof(form)='object'),
 created_by uuid NOT NULL REFERENCES ogp.usuarios(id),
 updated_by uuid NOT NULL REFERENCES ogp.usuarios(id),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,id)
);
CREATE TABLE IF NOT EXISTS demo.public_catalog_versions (
 kind text NOT NULL CHECK(kind IN ('recipes','cooks','ingredients','episodes')),
 record_id text NOT NULL,
 snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
 published_by uuid NOT NULL REFERENCES ogp.usuarios(id),
 published_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(kind,record_id)
);
CREATE TABLE IF NOT EXISTS demo.editorial_content (
 key text PRIMARY KEY,
 content jsonb NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON ALL TABLES IN SCHEMA demo FROM PUBLIC;
COMMIT;
