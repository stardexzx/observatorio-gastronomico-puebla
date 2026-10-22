#!/usr/bin/env bash
set -euo pipefail
psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" --set=ON_ERROR_STOP=1 --set=api_password="$OGP_API_PASSWORD" <<'SQL'
CREATE ROLE ogp_web LOGIN PASSWORD :'api_password';
GRANT ogp_lector TO ogp_web;
SQL
