-- Credenciales locales y sesiones del panel. No modifica fichas ni usuarios existentes.
BEGIN;
CREATE SCHEMA IF NOT EXISTS app_auth;
REVOKE ALL ON SCHEMA app_auth FROM PUBLIC;
CREATE TABLE IF NOT EXISTS app_auth.credentials (
 usuario_id uuid PRIMARY KEY REFERENCES ogp.usuarios(id),
 password_hash text NOT NULL,
 actualizado_en timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_auth.sessions (
 token_hash text PRIMARY KEY,
 usuario_id uuid NOT NULL REFERENCES app_auth.credentials(usuario_id) ON DELETE CASCADE,
 creado_en timestamptz NOT NULL DEFAULT now(),
 vence_en timestamptz NOT NULL,
 CHECK(vence_en>creado_en)
);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON app_auth.sessions(vence_en);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON app_auth.sessions(usuario_id);
CREATE TABLE IF NOT EXISTS app_auth.login_attempts (
 email_hash text PRIMARY KEY,
 failures integer NOT NULL DEFAULT 0 CHECK(failures>=0),
 window_start timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_auth.activations (
 token_hash text PRIMARY KEY,
 correo text NOT NULL,
 nombre text NOT NULL,
 role_code text NOT NULL CHECK(role_code IN ('administrador','capturista','revisor')),
 creado_en timestamptz NOT NULL DEFAULT now(),
 vence_en timestamptz NOT NULL,
 usado_en timestamptz,
 CHECK(vence_en>creado_en)
);
REVOKE ALL ON ALL TABLES IN SCHEMA app_auth FROM PUBLIC;
COMMIT;

-- El administrador puede realizar la captura que ya ofrece el panel.
-- No se incorporan aquí los permisos complementarios históricos de datos restringidos.
BEGIN;
INSERT INTO ogp.rol_permisos(rol_id,permiso_id)
 SELECT r.id,p.id FROM ogp.roles r CROSS JOIN ogp.permisos p
 WHERE r.codigo='administrador' AND p.accion IN ('crear','editar','enviar')
 AND p.modulo IN (SELECT codigo FROM ogp.tipos_registro)
ON CONFLICT DO NOTHING;
COMMIT;
