-- Observatorio Gastronómico de Puebla
-- PostgreSQL 16+ / PostGIS 3.x.
BEGIN;

-- ===== 001_schema.sql =====
-- Migración inicial: PostgreSQL 16+ y PostGIS 3.x.
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE SCHEMA ogp;
REVOKE ALL ON SCHEMA ogp FROM PUBLIC;
SET LOCAL search_path = ogp, public;

CREATE DOMAIN texto_no_vacio AS text CHECK (VALUE IS NULL OR length(btrim(VALUE)) > 0);
CREATE DOMAIN url_https AS text CHECK (VALUE IS NULL OR VALUE ~ '^https://[^[:space:]]+$');
CREATE DOMAIN mes AS smallint CHECK (VALUE BETWEEN 1 AND 12);

CREATE TABLE tipos_registro (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE categorias_preparacion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE categorias_ingrediente (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE unidades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE tecnicas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE tipos_participacion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE participaciones_receta (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE participaciones_episodio (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE especialidades (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE lenguas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE servicios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE tipos_instrumento_legal (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE tipos_territorio (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE tipos_temporada (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE tipos_fuente (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE usuarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    correo texto_no_vacio NOT NULL CHECK (correo = lower(btrim(correo)) AND correo LIKE '%@%'),
    nombre texto_no_vacio NOT NULL,
    estado text NOT NULL DEFAULT 'invitado' CHECK (estado IN ('invitado','activo','desactivado')),
    proveedor_auth text,
    identificador_auth text,
    creado_en timestamptz NOT NULL DEFAULT now(),
    UNIQUE (correo),
    UNIQUE (proveedor_auth, identificador_auth),
    CHECK ((proveedor_auth IS NULL) = (identificador_auth IS NULL))
);

CREATE TABLE roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE permisos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    modulo texto_no_vacio NOT NULL,
    accion texto_no_vacio NOT NULL,
    UNIQUE (modulo, accion)
);

CREATE TABLE usuario_roles (
    usuario_id uuid NOT NULL REFERENCES usuarios(id),
    rol_id uuid NOT NULL REFERENCES roles(id),
    otorgado_por uuid REFERENCES usuarios(id),
    otorgado_en timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, rol_id)
);

CREATE TABLE rol_permisos (
    rol_id uuid NOT NULL REFERENCES roles(id),
    permiso_id uuid NOT NULL REFERENCES permisos(id),
    PRIMARY KEY (rol_id, permiso_id)
);

CREATE TABLE invitaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    correo texto_no_vacio NOT NULL,
    token_hash texto_no_vacio NOT NULL UNIQUE,
    invitado_por uuid NOT NULL REFERENCES usuarios(id),
    creado_en timestamptz NOT NULL DEFAULT now(),
    vence_en timestamptz NOT NULL,
    aceptado_en timestamptz,
    cancelado_en timestamptz,
    CHECK (vence_en > creado_en),
    CHECK (aceptado_en IS NULL OR cancelado_en IS NULL)
);

CREATE TABLE registros (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo texto_no_vacio NOT NULL REFERENCES tipos_registro(codigo),
    creado_por uuid NOT NULL REFERENCES usuarios(id),
    creado_en timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now(),
    archivado_en timestamptz,
    UNIQUE (id, tipo)
);

CREATE TABLE asignaciones_registro (
    registro_id uuid NOT NULL REFERENCES registros(id),
    usuario_id uuid NOT NULL REFERENCES usuarios(id),
    funcion text NOT NULL CHECK (funcion IN ('captura','revision','publicacion')),
    PRIMARY KEY (registro_id, usuario_id, funcion)
);

CREATE TABLE usuario_modulos (
    usuario_id uuid NOT NULL REFERENCES usuarios(id),
    modulo texto_no_vacio NOT NULL,
    PRIMARY KEY (usuario_id, modulo)
);

CREATE TABLE fuentes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_id uuid NOT NULL REFERENCES tipos_fuente(id),
    titulo texto_no_vacio NOT NULL,
    referencia texto_no_vacio NOT NULL,
    cita_publica texto_no_vacio,
    autor_institucion text,
    fecha_original date,
    referencia_temporal text,
    precision_fecha text NOT NULL DEFAULT 'desconocida' CHECK (precision_fecha IN ('exacta','anio','periodo','aproximada','desconocida')),
    fecha_consulta date NOT NULL DEFAULT current_date,
    url url_https,
    visibilidad text NOT NULL DEFAULT 'restringido' CHECK (visibilidad IN ('publico','restringido')),
    creado_por uuid NOT NULL REFERENCES usuarios(id),
    creado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE archivos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor texto_no_vacio NOT NULL,
    clave_externa texto_no_vacio,
    url_publica url_https,
    nombre texto_no_vacio NOT NULL,
    tipo_mime text,
    tamano_bytes bigint CHECK (tamano_bytes >= 0),
    duracion_segundos numeric CHECK (duracion_segundos >= 0),
    estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','disponible','error','retirado')),
    visibilidad text NOT NULL DEFAULT 'restringido' CHECK (visibilidad IN ('publico','restringido')),
    credito text,
    licencia text,
    creado_por uuid NOT NULL REFERENCES usuarios(id),
    creado_en timestamptz NOT NULL DEFAULT now(),
    UNIQUE (proveedor, clave_externa),
    CHECK (clave_externa IS NOT NULL OR url_publica IS NOT NULL)
);

CREATE TABLE fuente_archivos (
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    PRIMARY KEY (fuente_id, archivo_id)
);

CREATE TABLE territorios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_id uuid NOT NULL REFERENCES tipos_territorio(id),
    nombre texto_no_vacio NOT NULL,
    codigo_pais text CHECK (codigo_pais ~ '^[A-Z]{2}$'),
    geometria geometry(Geometry,4326),
    fuente_id uuid REFERENCES fuentes(id),
    CHECK (geometria IS NULL OR ST_IsValid(geometria))
);

CREATE TABLE territorio_relaciones (
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    contenedor_id uuid NOT NULL REFERENCES territorios(id),
    tipo text NOT NULL CHECK (tipo IN ('pertenece','agrupa')),
    PRIMARY KEY (territorio_id, contenedor_id, tipo),
    CHECK (territorio_id <> contenedor_id)
);

CREATE TABLE municipios_puebla (
    territorio_id uuid PRIMARY KEY REFERENCES territorios(id),
    cve_ent text NOT NULL DEFAULT '21' CHECK (cve_ent = '21'),
    cve_mun text NOT NULL CHECK (cve_mun ~ '^[0-9]{3}$'),
    cvegeo text GENERATED ALWAYS AS (cve_ent || cve_mun) STORED UNIQUE,
    geometria geometry(MultiPolygon,4326),
    version_fuente texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    UNIQUE (cve_ent, cve_mun),
    CHECK (geometria IS NULL OR ST_IsValid(geometria))
);

CREATE TABLE localidades_puebla (
    territorio_id uuid PRIMARY KEY REFERENCES territorios(id),
    municipio_id uuid NOT NULL REFERENCES municipios_puebla(territorio_id),
    clave_inegi text UNIQUE CHECK (clave_inegi ~ '^21[0-9]{7}$'),
    UNIQUE (territorio_id, municipio_id)
);

CREATE TABLE referencias_territoriales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    identificador_externo texto_no_vacio NOT NULL,
    fecha_corte date,
    version text,
    geometria geometry(Geometry,4326),
    UNIQUE (territorio_id, fuente_id, identificador_externo),
    CHECK (geometria IS NULL OR ST_IsValid(geometria))
);

CREATE TABLE preparaciones (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('preparacion'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    nombre texto_no_vacio NOT NULL,
    categoria_id uuid REFERENCES categorias_preparacion(id),
    descripcion text
);

CREATE TABLE ingredientes (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('ingrediente'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    nombre texto_no_vacio NOT NULL,
    categoria_id uuid REFERENCES categorias_ingrediente(id),
    descripcion text,
    nombre_cientifico text
);

CREATE TABLE ingrediente_variedades (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('variedad'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    nombre texto_no_vacio NOT NULL,
    caracteristicas text,
    nombre_cientifico text,
    UNIQUE (id, ingrediente_id)
);

CREATE TABLE personas (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('persona'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    nombre_publico texto_no_vacio NOT NULL,
    semblanza text,
    trayectoria text,
    inicio_actividad date,
    experiencia_estimada_anios numeric CHECK (experiencia_estimada_anios >= 0),
    experiencia_fecha_referencia date,
    CHECK (experiencia_estimada_anios IS NULL OR experiencia_fecha_referencia IS NOT NULL)
);

CREATE TABLE persona_datos_restringidos (
    persona_id uuid PRIMARY KEY REFERENCES personas(id),
    nombre_interno text,
    correo text,
    telefono text,
    notas_privadas text
);

CREATE TABLE recetas_documentadas (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('receta'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    preparacion_id uuid NOT NULL REFERENCES preparaciones(id),
    titulo texto_no_vacio NOT NULL,
    descripcion text,
    rendimiento text,
    tipo_documentacion_id uuid REFERENCES tipos_fuente(id),
    fecha_documentacion date,
    fecha_original date,
    precision_fecha text NOT NULL DEFAULT 'desconocida' CHECK (precision_fecha IN ('exacta','anio','periodo','aproximada','desconocida')),
    referencia_temporal text,
    contexto_cultural text,
    ocasion text,
    nivel_documentacion text NOT NULL DEFAULT 'parcial' CHECK (nivel_documentacion IN ('completa','parcial')),
    limitaciones_documentacion text,
    vigencia_culinaria text NOT NULL DEFAULT 'no_documentada' CHECK (vigencia_culinaria IN ('practica_actual','poco_frecuente','en_desuso','no_documentada'))
);

CREATE TABLE receta_pasos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    orden integer NOT NULL CHECK (orden > 0),
    instrucciones texto_no_vacio NOT NULL,
    UNIQUE (receta_id, orden)
);

CREATE TABLE receta_ingredientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    variedad_id uuid,
    cantidad numeric CHECK (cantidad > 0),
    unidad_id uuid REFERENCES unidades(id),
    cantidad_texto text,
    forma_uso text,
    grupo text,
    orden integer NOT NULL CHECK (orden > 0),
    observaciones_publicas text,
    FOREIGN KEY (variedad_id, ingrediente_id) REFERENCES ingrediente_variedades(id, ingrediente_id),
    CHECK (cantidad IS NULL OR unidad_id IS NOT NULL),
    UNIQUE (receta_id, orden)
);

CREATE TABLE receta_tecnicas (
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    tecnica_id uuid NOT NULL REFERENCES tecnicas(id),
    observaciones_publicas text,
    PRIMARY KEY (receta_id, tecnica_id)
);

CREATE TABLE receta_personas (
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    persona_id uuid NOT NULL REFERENCES personas(id),
    participacion_id uuid NOT NULL REFERENCES participaciones_receta(id),
    fuente_id uuid REFERENCES fuentes(id),
    observaciones_publicas text,
    PRIMARY KEY (receta_id, persona_id, participacion_id)
);

CREATE TABLE persona_tipos_participacion (
    persona_id uuid NOT NULL REFERENCES personas(id),
    participacion_id uuid NOT NULL REFERENCES tipos_participacion(id),
    PRIMARY KEY (persona_id, participacion_id)
);

CREATE TABLE persona_especialidades (
    persona_id uuid NOT NULL REFERENCES personas(id),
    especialidad_id uuid NOT NULL REFERENCES especialidades(id),
    PRIMARY KEY (persona_id, especialidad_id)
);

CREATE TABLE persona_lenguas (
    persona_id uuid NOT NULL REFERENCES personas(id),
    lengua_id uuid NOT NULL REFERENCES lenguas(id),
    PRIMARY KEY (persona_id, lengua_id)
);

CREATE TABLE reconocimientos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id uuid NOT NULL REFERENCES personas(id),
    nombre texto_no_vacio NOT NULL,
    entidad_otorgante text,
    fecha date,
    referencia_temporal text,
    descripcion text,
    fuente_id uuid NOT NULL REFERENCES fuentes(id)
);

CREATE TABLE mercados (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('mercado'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    nombre texto_no_vacio NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('mercado','tianguis')),
    descripcion text,
    estado_operativo text NOT NULL DEFAULT 'por_confirmar' CHECK (estado_operativo IN ('operacion_documentada','cierre_temporal','cierre_permanente','por_confirmar')),
    fecha_comprobacion date
);

CREATE TABLE mercado_ubicaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    direccion text,
    descripcion_ubicacion text,
    municipio_id uuid NOT NULL REFERENCES municipios_puebla(territorio_id),
    localidad_id uuid,
    punto geometry(Point,4326),
    precision text NOT NULL DEFAULT 'aproximada' CHECK (precision IN ('exacta','aproximada')),
    vigente_desde date NOT NULL,
    vigente_hasta date,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    FOREIGN KEY (localidad_id, municipio_id) REFERENCES localidades_puebla(territorio_id, municipio_id),
    CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde),
    CHECK (punto IS NULL OR (ST_X(punto) BETWEEN -180 AND 180 AND ST_Y(punto) BETWEEN -90 AND 90 AND NOT ST_IsEmpty(punto))),
    EXCLUDE USING gist (mercado_id WITH =, daterange(vigente_desde, vigente_hasta, '[)') WITH &&)
);

CREATE UNIQUE INDEX mercado_una_ubicacion_abierta ON mercado_ubicaciones (mercado_id) WHERE vigente_hasta IS NULL;

CREATE TABLE mercado_horarios (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ubicacion_id uuid NOT NULL REFERENCES mercado_ubicaciones(id),
    dia_semana smallint NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    apertura time,
    cierre time,
    cierra_dia_siguiente boolean NOT NULL DEFAULT false,
    horario_texto text,
    CHECK ((apertura IS NULL AND cierre IS NULL AND coalesce(length(btrim(horario_texto)),0) > 0) OR (apertura IS NOT NULL AND cierre IS NOT NULL)),
    CHECK (apertura IS NULL OR cierra_dia_siguiente OR cierre > apertura)
);

CREATE TABLE mercado_temporadas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    descripcion texto_no_vacio NOT NULL,
    inicio date,
    fin date,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    CHECK (inicio IS NULL OR fin IS NULL OR fin >= inicio)
);

CREATE TABLE mercado_ingredientes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    variedad_id uuid,
    fecha_observacion date NOT NULL,
    disponibilidad text,
    procedencia_id uuid REFERENCES territorios(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    FOREIGN KEY (variedad_id, ingrediente_id) REFERENCES ingrediente_variedades(id, ingrediente_id)
);

CREATE TABLE mercado_personas (
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    persona_id uuid NOT NULL REFERENCES personas(id),
    participacion_id uuid NOT NULL REFERENCES tipos_participacion(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    PRIMARY KEY (mercado_id, persona_id, participacion_id)
);

CREATE TABLE mercado_servicios (
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    servicio_id uuid NOT NULL REFERENCES servicios(id),
    descripcion text,
    fecha_comprobacion date NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    PRIMARY KEY (mercado_id, servicio_id)
);

CREATE TABLE mercado_identificadores_externos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    proveedor texto_no_vacio NOT NULL,
    identificador texto_no_vacio NOT NULL,
    UNIQUE (proveedor, identificador)
);

CREATE TABLE importaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    proveedor texto_no_vacio NOT NULL,
    criterios jsonb NOT NULL CHECK (jsonb_typeof(criterios) = 'object'),
    creado_por uuid NOT NULL REFERENCES usuarios(id),
    creado_en timestamptz NOT NULL DEFAULT now(),
    estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_proceso','completada','error')),
    resultado jsonb,
    error text,
    clave_idempotencia texto_no_vacio NOT NULL UNIQUE
);

CREATE TABLE importacion_candidatos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    importacion_id uuid NOT NULL REFERENCES importaciones(id),
    identificador_externo texto_no_vacio NOT NULL,
    datos_permitidos jsonb NOT NULL,
    caduca_en timestamptz,
    decision text NOT NULL DEFAULT 'pendiente' CHECK (decision IN ('pendiente','nuevo','actualizacion','descartado','dudoso')),
    mercado_id uuid REFERENCES mercados(id),
    revisado_por uuid REFERENCES usuarios(id),
    revisado_en timestamptz,
    error text,
    UNIQUE (importacion_id, identificador_externo)
);

CREATE TABLE ingrediente_temporadas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_id uuid NOT NULL REFERENCES tipos_temporada(id),
    todo_el_anio boolean NOT NULL DEFAULT false,
    periodo_descriptivo text,
    festividad text,
    descripcion text,
    referencia_temporal text,
    fuente_id uuid NOT NULL REFERENCES fuentes(id)
);

CREATE TABLE ingrediente_temporada_meses (
    temporada_id uuid NOT NULL REFERENCES ingrediente_temporadas(id),
    mes mes NOT NULL,
    PRIMARY KEY (temporada_id, mes)
);

CREATE TABLE ingrediente_produccion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    periodo texto_no_vacio NOT NULL,
    metrica texto_no_vacio NOT NULL,
    cantidad numeric NOT NULL CHECK (cantidad >= 0),
    unidad_id uuid NOT NULL REFERENCES unidades(id),
    metodo text,
    fuente_id uuid NOT NULL REFERENCES fuentes(id)
);

CREATE TABLE variedad_temporadas (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    variedad_id uuid NOT NULL REFERENCES ingrediente_variedades(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_id uuid NOT NULL REFERENCES tipos_temporada(id),
    todo_el_anio boolean NOT NULL DEFAULT false,
    periodo_descriptivo text,
    festividad text,
    descripcion text,
    referencia_temporal text,
    fuente_id uuid NOT NULL REFERENCES fuentes(id)
);

CREATE TABLE variedad_temporada_meses (
    temporada_id uuid NOT NULL REFERENCES variedad_temporadas(id),
    mes mes NOT NULL,
    PRIMARY KEY (temporada_id, mes)
);

CREATE TABLE variedad_produccion (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    variedad_id uuid NOT NULL REFERENCES ingrediente_variedades(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    periodo texto_no_vacio NOT NULL,
    metrica texto_no_vacio NOT NULL,
    cantidad numeric NOT NULL CHECK (cantidad >= 0),
    unidad_id uuid NOT NULL REFERENCES unidades(id),
    metodo text,
    fuente_id uuid NOT NULL REFERENCES fuentes(id)
);

CREATE TABLE preparacion_nombres (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    preparacion_id uuid NOT NULL REFERENCES preparaciones(id),
    nombre texto_no_vacio NOT NULL,
    lengua_id uuid REFERENCES lenguas(id),
    territorio_id uuid REFERENCES territorios(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id)
);

CREATE TABLE ingrediente_nombres (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    nombre texto_no_vacio NOT NULL,
    lengua_id uuid REFERENCES lenguas(id),
    territorio_id uuid REFERENCES territorios(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id)
);

CREATE TABLE variedad_nombres (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    variedad_id uuid NOT NULL REFERENCES ingrediente_variedades(id),
    nombre texto_no_vacio NOT NULL,
    lengua_id uuid REFERENCES lenguas(id),
    territorio_id uuid REFERENCES territorios(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id)
);

CREATE TABLE expedientes_legales (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('expediente'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    titulo texto_no_vacio NOT NULL,
    tipo_id uuid REFERENCES tipos_instrumento_legal(id),
    autoridad text,
    folio text,
    fecha_solicitud date,
    referencia_temporal text,
    estado_tramite text NOT NULL DEFAULT 'no_documentado' CHECK (estado_tramite IN ('solicitado','evaluacion','requerimientos','favorable','rechazado','desistido','no_documentado'))
);

CREATE TABLE expediente_eventos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    expediente_id uuid NOT NULL REFERENCES expedientes_legales(id),
    actuacion texto_no_vacio NOT NULL,
    fecha date,
    referencia_temporal text,
    descripcion texto_no_vacio NOT NULL,
    visibilidad text NOT NULL DEFAULT 'restringido' CHECK (visibilidad IN ('publico','restringido')),
    fuente_id uuid NOT NULL REFERENCES fuentes(id)
);

CREATE TABLE instrumentos_legales (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('instrumento'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    nombre_oficial texto_no_vacio NOT NULL,
    tipo_id uuid REFERENCES tipos_instrumento_legal(id),
    autoridad text,
    referencia_oficial text,
    fecha_emision date,
    referencia_temporal text,
    vigente_desde date,
    vigente_hasta date,
    alcance text,
    situacion text NOT NULL DEFAULT 'no_determinada' CHECK (situacion IN ('vigente_documentada','vencido','revocado','no_determinada')),
    fecha_revision date,
    CHECK (vigente_desde IS NULL OR vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
);

CREATE TABLE expediente_instrumentos (
    expediente_id uuid NOT NULL REFERENCES expedientes_legales(id),
    instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    PRIMARY KEY (expediente_id, instrumento_id)
);

CREATE TABLE instrumento_preparaciones (
    instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
    preparacion_id uuid NOT NULL REFERENCES preparaciones(id),
    alcance texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    apartado text,
    PRIMARY KEY (instrumento_id, preparacion_id)
);

CREATE TABLE instrumento_recetas (
    instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    alcance texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    apartado text,
    PRIMARY KEY (instrumento_id, receta_id)
);

CREATE TABLE instrumento_ingredientes (
    instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    alcance texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    apartado text,
    PRIMARY KEY (instrumento_id, ingrediente_id)
);

CREATE TABLE instrumento_variedades (
    instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
    variedad_id uuid NOT NULL REFERENCES ingrediente_variedades(id),
    alcance texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    apartado text,
    PRIMARY KEY (instrumento_id, variedad_id)
);

CREATE TABLE podcasts (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('podcast'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    proposito text
);

CREATE TABLE episodios (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('episodio'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    podcast_id uuid NOT NULL REFERENCES podcasts(id),
    titulo texto_no_vacio NOT NULL,
    resumen text,
    numero integer CHECK (numero > 0),
    temporada integer CHECK (temporada > 0),
    fecha_original date,
    transcripcion text
);

CREATE UNIQUE INDEX episodio_numero_unico ON episodios (podcast_id, COALESCE(temporada, 1), numero) WHERE numero IS NOT NULL;

CREATE TABLE episodio_personas (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    persona_id uuid NOT NULL REFERENCES personas(id),
    participacion_id uuid NOT NULL REFERENCES participaciones_episodio(id),
    PRIMARY KEY (episodio_id, persona_id, participacion_id)
);

CREATE TABLE episodio_creditos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    nombre_publico texto_no_vacio NOT NULL,
    funcion texto_no_vacio NOT NULL,
    persona_id uuid REFERENCES personas(id),
    autorizacion_confirmada boolean NOT NULL DEFAULT false
);

CREATE TABLE episodio_enlaces (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    plataforma texto_no_vacio NOT NULL,
    url url_https NOT NULL,
    tipo text NOT NULL CHECK (tipo IN ('pagina','audio','reproductor','distribucion')),
    verificado_en timestamptz,
    disponible boolean NOT NULL DEFAULT false,
    UNIQUE (episodio_id, url)
);

CREATE TABLE episodio_preparaciones (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    preparacion_id uuid NOT NULL REFERENCES preparaciones(id),
    observaciones_publicas text,
    PRIMARY KEY (episodio_id, preparacion_id)
);

CREATE TABLE episodio_recetas (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    observaciones_publicas text,
    PRIMARY KEY (episodio_id, receta_id)
);

CREATE TABLE episodio_ingredientes (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    observaciones_publicas text,
    PRIMARY KEY (episodio_id, ingrediente_id)
);

CREATE TABLE episodio_variedades (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    variedad_id uuid NOT NULL REFERENCES ingrediente_variedades(id),
    observaciones_publicas text,
    PRIMARY KEY (episodio_id, variedad_id)
);

CREATE TABLE episodio_mercados (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    observaciones_publicas text,
    PRIMARY KEY (episodio_id, mercado_id)
);

CREATE TABLE episodio_instrumentos (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
    observaciones_publicas text,
    PRIMARY KEY (episodio_id, instrumento_id)
);

CREATE TABLE contenidos_institucionales (
    id uuid PRIMARY KEY,
    tipo_registro text GENERATED ALWAYS AS ('institucional'::text) STORED,
    FOREIGN KEY (id, tipo_registro) REFERENCES registros(id, tipo),
    clave text NOT NULL UNIQUE CHECK (clave IN ('acerca','metodologia')),
    titulo texto_no_vacio NOT NULL,
    cuerpo text
);

CREATE TABLE preparacion_fuentes (
    preparacion_id uuid NOT NULL REFERENCES preparaciones(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (preparacion_id, fuente_id)
);

CREATE TABLE preparacion_archivos (
    preparacion_id uuid NOT NULL REFERENCES preparaciones(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (preparacion_id, archivo_id, funcion)
);

CREATE TABLE preparacion_territorios (
    preparacion_id uuid NOT NULL REFERENCES preparaciones(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    descripcion_publica text,
    PRIMARY KEY (preparacion_id, territorio_id, tipo_vinculo)
);

CREATE TABLE receta_fuentes (
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (receta_id, fuente_id)
);

CREATE TABLE receta_archivos (
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (receta_id, archivo_id, funcion)
);

CREATE TABLE receta_territorios (
    receta_id uuid NOT NULL REFERENCES recetas_documentadas(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    descripcion_publica text,
    PRIMARY KEY (receta_id, territorio_id, tipo_vinculo)
);

CREATE TABLE ingrediente_fuentes (
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (ingrediente_id, fuente_id)
);

CREATE TABLE ingrediente_archivos (
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (ingrediente_id, archivo_id, funcion)
);

CREATE TABLE ingrediente_territorios (
    ingrediente_id uuid NOT NULL REFERENCES ingredientes(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    descripcion_publica text,
    PRIMARY KEY (ingrediente_id, territorio_id, tipo_vinculo)
);

CREATE TABLE variedad_fuentes (
    variedad_id uuid NOT NULL REFERENCES ingrediente_variedades(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (variedad_id, fuente_id)
);

CREATE TABLE variedad_archivos (
    variedad_id uuid NOT NULL REFERENCES ingrediente_variedades(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (variedad_id, archivo_id, funcion)
);

CREATE TABLE variedad_territorios (
    variedad_id uuid NOT NULL REFERENCES ingrediente_variedades(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    descripcion_publica text,
    PRIMARY KEY (variedad_id, territorio_id, tipo_vinculo)
);

CREATE TABLE persona_fuentes (
    persona_id uuid NOT NULL REFERENCES personas(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (persona_id, fuente_id)
);

CREATE TABLE persona_archivos (
    persona_id uuid NOT NULL REFERENCES personas(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (persona_id, archivo_id, funcion)
);

CREATE TABLE persona_territorios (
    persona_id uuid NOT NULL REFERENCES personas(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    descripcion_publica text,
    PRIMARY KEY (persona_id, territorio_id, tipo_vinculo)
);

CREATE TABLE mercado_fuentes (
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (mercado_id, fuente_id)
);

CREATE TABLE mercado_archivos (
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (mercado_id, archivo_id, funcion)
);

CREATE TABLE mercado_territorios (
    mercado_id uuid NOT NULL REFERENCES mercados(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    descripcion_publica text,
    PRIMARY KEY (mercado_id, territorio_id, tipo_vinculo)
);

CREATE TABLE expediente_fuentes (
    expediente_id uuid NOT NULL REFERENCES expedientes_legales(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (expediente_id, fuente_id)
);

CREATE TABLE expediente_archivos (
    expediente_id uuid NOT NULL REFERENCES expedientes_legales(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (expediente_id, archivo_id, funcion)
);

CREATE TABLE expediente_territorios (
    expediente_id uuid NOT NULL REFERENCES expedientes_legales(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    descripcion_publica text,
    PRIMARY KEY (expediente_id, territorio_id, tipo_vinculo)
);

CREATE TABLE instrumento_fuentes (
    instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (instrumento_id, fuente_id)
);

CREATE TABLE instrumento_archivos (
    instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (instrumento_id, archivo_id, funcion)
);

CREATE TABLE instrumento_territorios (
    instrumento_id uuid NOT NULL REFERENCES instrumentos_legales(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    descripcion_publica text,
    PRIMARY KEY (instrumento_id, territorio_id, tipo_vinculo)
);

CREATE TABLE podcast_fuentes (
    podcast_id uuid NOT NULL REFERENCES podcasts(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (podcast_id, fuente_id)
);

CREATE TABLE podcast_archivos (
    podcast_id uuid NOT NULL REFERENCES podcasts(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (podcast_id, archivo_id, funcion)
);

CREATE TABLE episodio_fuentes (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (episodio_id, fuente_id)
);

CREATE TABLE episodio_archivos (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (episodio_id, archivo_id, funcion)
);

CREATE TABLE episodio_territorios (
    episodio_id uuid NOT NULL REFERENCES episodios(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    descripcion_publica text,
    PRIMARY KEY (episodio_id, territorio_id, tipo_vinculo)
);

CREATE TABLE institucional_fuentes (
    institucional_id uuid NOT NULL REFERENCES contenidos_institucionales(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (institucional_id, fuente_id)
);

CREATE TABLE institucional_archivos (
    institucional_id uuid NOT NULL REFERENCES contenidos_institucionales(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer CHECK (orden > 0),
    PRIMARY KEY (institucional_id, archivo_id, funcion)
);

CREATE TABLE consentimientos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    persona_id uuid NOT NULL REFERENCES personas(id),
    autoriza texto_no_vacio NOT NULL,
    calidad_autorizante texto_no_vacio NOT NULL,
    fecha date NOT NULL,
    vence_en date,
    alcance texto_no_vacio NOT NULL,
    uso_permitido texto_no_vacio NOT NULL,
    restricciones text,
    estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','activo','vencido','revocado','sustituido')),
    verificado_por uuid REFERENCES usuarios(id),
    verificado_en timestamptz,
    creado_por uuid NOT NULL REFERENCES usuarios(id),
    CHECK (vence_en IS NULL OR vence_en >= fecha)
);

CREATE TABLE consentimiento_archivos (
    consentimiento_id uuid NOT NULL REFERENCES consentimientos(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    PRIMARY KEY (consentimiento_id, archivo_id)
);

CREATE TABLE consentimiento_registros (
    consentimiento_id uuid NOT NULL REFERENCES consentimientos(id),
    registro_id uuid NOT NULL REFERENCES registros(id),
    PRIMARY KEY (consentimiento_id, registro_id)
);

CREATE TABLE consentimiento_archivos_autorizados (
    consentimiento_id uuid NOT NULL REFERENCES consentimientos(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    PRIMARY KEY (consentimiento_id, archivo_id)
);

CREATE TABLE registro_revisiones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id uuid NOT NULL REFERENCES registros(id),
    numero integer NOT NULL CHECK (numero > 0),
    creado_por uuid NOT NULL REFERENCES usuarios(id),
    creado_en timestamptz NOT NULL DEFAULT now(),
    sellada_en timestamptz,
    contenido_publico jsonb NOT NULL CHECK (jsonb_typeof(contenido_publico) = 'object'),
    version_formato integer NOT NULL DEFAULT 1 CHECK (version_formato > 0),
    UNIQUE (registro_id, numero),
    UNIQUE (id, registro_id)
);

CREATE TABLE revision_dependencias (
    revision_id uuid NOT NULL REFERENCES registro_revisiones(id),
    registro_destino_id uuid NOT NULL REFERENCES registros(id),
    relacion texto_no_vacio NOT NULL,
    obligatoria boolean NOT NULL DEFAULT false,
    descripcion_publica text,
    PRIMARY KEY (revision_id, registro_destino_id, relacion)
);

CREATE TABLE revision_archivos (
    revision_id uuid NOT NULL REFERENCES registro_revisiones(id),
    archivo_id uuid NOT NULL REFERENCES archivos(id),
    funcion texto_no_vacio NOT NULL,
    texto_alternativo text,
    descripcion_publica text,
    orden integer,
    PRIMARY KEY (revision_id, archivo_id, funcion)
);

CREATE TABLE revision_fuentes (
    revision_id uuid NOT NULL REFERENCES registro_revisiones(id),
    fuente_id uuid NOT NULL REFERENCES fuentes(id),
    cita_publica texto_no_vacio NOT NULL,
    afirmacion texto_no_vacio NOT NULL,
    apartado text,
    PRIMARY KEY (revision_id, fuente_id)
);

CREATE TABLE revision_territorios (
    revision_id uuid NOT NULL REFERENCES registro_revisiones(id),
    territorio_id uuid NOT NULL REFERENCES territorios(id),
    tipo_vinculo texto_no_vacio NOT NULL,
    nombre_en_revision texto_no_vacio NOT NULL,
    tipo_territorio_en_revision texto_no_vacio NOT NULL,
    PRIMARY KEY (revision_id, territorio_id, tipo_vinculo)
);

CREATE TABLE consentimiento_revision_alcances (
    consentimiento_id uuid NOT NULL REFERENCES consentimientos(id),
    revision_id uuid NOT NULL REFERENCES registro_revisiones(id),
    descripcion_alcance texto_no_vacio NOT NULL,
    PRIMARY KEY (consentimiento_id, revision_id)
);

CREATE TABLE evaluaciones_revision (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id uuid NOT NULL UNIQUE REFERENCES registro_revisiones(id),
    revisor_id uuid NOT NULL REFERENCES usuarios(id),
    dictamen text NOT NULL CHECK (dictamen IN ('validado','correcciones')),
    observaciones text,
    evaluado_en timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id, revision_id),
    CHECK (dictamen <> 'correcciones' OR coalesce(length(btrim(observaciones)),0) > 0)
);

CREATE TABLE publicaciones (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id uuid NOT NULL REFERENCES registros(id),
    revision_id uuid NOT NULL,
    evaluacion_id uuid NOT NULL,
    publicado_por uuid NOT NULL REFERENCES usuarios(id),
    publicado_en timestamptz NOT NULL DEFAULT now(),
    retirado_en timestamptz,
    retirado_por uuid REFERENCES usuarios(id),
    motivo_retiro text,
    FOREIGN KEY (revision_id, registro_id) REFERENCES registro_revisiones(id, registro_id),
    FOREIGN KEY (evaluacion_id, revision_id) REFERENCES evaluaciones_revision(id, revision_id),
    CHECK (retirado_en IS NULL OR retirado_en >= publicado_en),
    CHECK ((retirado_en IS NULL AND retirado_por IS NULL AND motivo_retiro IS NULL) OR (retirado_en IS NOT NULL AND retirado_por IS NOT NULL AND coalesce(length(btrim(motivo_retiro)),0) > 0))
);

CREATE UNIQUE INDEX publicacion_activa_unica ON publicaciones (registro_id) WHERE retirado_en IS NULL;

CREATE TABLE eventos_editoriales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id uuid NOT NULL REFERENCES registros(id),
    revision_id uuid REFERENCES registro_revisiones(id),
    usuario_id uuid NOT NULL REFERENCES usuarios(id),
    accion texto_no_vacio NOT NULL,
    fecha timestamptz NOT NULL DEFAULT now(),
    observaciones text
);

CREATE TABLE eventos_auditoria (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id uuid REFERENCES usuarios(id),
    registro_id uuid REFERENCES registros(id),
    accion texto_no_vacio NOT NULL,
    tabla_afectada texto_no_vacio NOT NULL,
    entidad_id uuid,
    fecha timestamptz NOT NULL DEFAULT now(),
    detalle jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE plantillas_reporte (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo texto_no_vacio NOT NULL UNIQUE,
    nombre texto_no_vacio NOT NULL,
    descripcion text,
    activo boolean NOT NULL DEFAULT true
);

CREATE TABLE reportes_generados (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    plantilla_id uuid NOT NULL REFERENCES plantillas_reporte(id),
    version_plantilla integer NOT NULL CHECK (version_plantilla > 0),
    filtros jsonb NOT NULL DEFAULT '{}'::jsonb,
    corte_datos timestamptz NOT NULL,
    version_datos texto_no_vacio NOT NULL,
    solicitante_id uuid REFERENCES usuarios(id),
    formato text NOT NULL CHECK (formato IN ('pdf','csv','xlsx')),
    visibilidad text NOT NULL DEFAULT 'restringido' CHECK (visibilidad IN ('publico','restringido')),
    estado text NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','en_proceso','disponible','error','vencido')),
    archivo_id uuid REFERENCES archivos(id),
    creado_en timestamptz NOT NULL DEFAULT now(),
    vence_en timestamptz,
    error text,
    clave_idempotencia texto_no_vacio NOT NULL UNIQUE,
    CHECK (estado <> 'disponible' OR archivo_id IS NOT NULL),
    CHECK (visibilidad = 'publico' OR solicitante_id IS NOT NULL)
);

CREATE TABLE incidencias_calidad (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    registro_id uuid NOT NULL REFERENCES registros(id),
    codigo texto_no_vacio NOT NULL,
    descripcion texto_no_vacio NOT NULL,
    detectado_en timestamptz NOT NULL DEFAULT now(),
    resuelto_en timestamptz,
    resuelto_por uuid REFERENCES usuarios(id),
    CHECK (resuelto_en IS NULL OR resuelto_en >= detectado_en)
);

CREATE INDEX territorios_geometria_gist ON territorios USING gist (geometria);
CREATE INDEX municipios_geometria_gist ON municipios_puebla USING gist (geometria);
CREATE INDEX ubicaciones_punto_gist ON mercado_ubicaciones USING gist (punto);
CREATE INDEX publicaciones_fecha_idx ON publicaciones (publicado_en);
CREATE INDEX revisiones_contenido_gin ON registro_revisiones USING gin (contenido_publico);
CREATE INDEX auditoria_fecha_idx ON eventos_auditoria (fecha);
CREATE INDEX candidatos_caducidad_idx ON importacion_candidatos (caduca_en) WHERE caduca_en IS NOT NULL;

-- Índices sobre todas las FK: prefijos compuestos incluidos. Facilitan joins y verificaciones.
DO $indices$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT con.conrelid::regclass AS tabla, con.conname,
      string_agg(quote_ident(att.attname), ', ' ORDER BY k.ord) AS columnas
    FROM pg_constraint con
    CROSS JOIN LATERAL unnest(con.conkey) WITH ORDINALITY k(attnum, ord)
    JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = k.attnum
    WHERE con.contype = 'f' AND con.connamespace = 'ogp'::regnamespace
    GROUP BY con.conrelid, con.conname
  LOOP
    EXECUTE format('CREATE INDEX %I ON %s (%s)',
      'fk_' || md5(c.tabla::text || c.conname), c.tabla, c.columnas);
  END LOOP;
END $indices$;

-- No conceder acceso a tablas internas al navegador ni al público.
REVOKE ALL ON ALL TABLES IN SCHEMA ogp FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA ogp FROM PUBLIC;

-- ===== 002_workflow.sql =====
-- Integridad y flujo editorial. Las funciones esperan un backend interno autenticado.
SET LOCAL search_path = ogp, public;

CREATE FUNCTION tiene_permiso(p_usuario uuid, p_modulo text, p_accion text, p_registro uuid DEFAULT NULL)
RETURNS boolean LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 SELECT EXISTS (
   SELECT 1 FROM usuarios u
   JOIN usuario_roles ur ON ur.usuario_id = u.id
   JOIN roles r ON r.id = ur.rol_id AND r.activo
   JOIN rol_permisos rp ON rp.rol_id = r.id
   JOIN permisos p ON p.id = rp.permiso_id
   WHERE u.id = p_usuario AND u.estado = 'activo'
     AND p.modulo = p_modulo AND p.accion = p_accion
     AND (p_modulo IN ('usuarios','catalogos','auditoria') OR EXISTS (
       SELECT 1 FROM usuario_modulos um WHERE um.usuario_id = u.id AND um.modulo = p_modulo))
     AND (p_accion NOT IN ('editar','enviar') OR p_registro IS NULL OR EXISTS (
       SELECT 1 FROM registros reg WHERE reg.id = p_registro AND reg.creado_por = u.id)
       OR EXISTS (SELECT 1 FROM asignaciones_registro a
         WHERE a.registro_id = p_registro AND a.usuario_id = u.id AND a.funcion = 'captura'))
 );
$$;

CREATE FUNCTION exigir_permiso(p_usuario uuid, p_modulo text, p_accion text, p_registro uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NOT tiene_permiso(p_usuario,p_modulo,p_accion,p_registro) THEN
   RAISE EXCEPTION 'Permiso insuficiente: %.%', p_modulo,p_accion USING ERRCODE = '42501';
 END IF;
END $$;

CREATE FUNCTION crear_registro(p_usuario uuid, p_tipo text) RETURNS uuid
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_id uuid;
BEGIN
 PERFORM exigir_permiso(p_usuario,p_tipo,'crear');
 INSERT INTO registros(tipo,creado_por) VALUES(p_tipo,p_usuario) RETURNING id INTO v_id;
 RETURN v_id;
END $$;

CREATE FUNCTION impedir_mutacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 RAISE EXCEPTION '% es inmutable; conservar historia y crear una nueva revisión/evento', TG_TABLE_NAME;
END $$;

CREATE FUNCTION proteger_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF TG_OP='UPDATE' THEN
   IF OLD.sellada_en IS NULL AND NEW.sellada_en IS NOT NULL
      AND (to_jsonb(NEW)-ARRAY['sellada_en','busqueda']) = (to_jsonb(OLD)-ARRAY['sellada_en','busqueda']) THEN RETURN NEW; END IF;
 END IF;
 RAISE EXCEPTION 'La revisión es inmutable: solo se admite sellarla una vez';
END $$;
CREATE TRIGGER revision_inmutable BEFORE UPDATE OR DELETE ON registro_revisiones
FOR EACH ROW EXECUTE FUNCTION proteger_revision();

CREATE FUNCTION proteger_detalle_revision() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_revision uuid;
BEGIN
 IF TG_OP='DELETE' THEN v_revision:=OLD.revision_id; ELSE v_revision:=NEW.revision_id; END IF;
 IF EXISTS(SELECT 1 FROM registro_revisiones WHERE id=v_revision AND sellada_en IS NOT NULL)
  OR (TG_OP='UPDATE' AND EXISTS(SELECT 1 FROM registro_revisiones WHERE id=OLD.revision_id AND sellada_en IS NOT NULL)) THEN
   RAISE EXCEPTION 'No modificar fuentes, archivos o relaciones de una revisión sellada';
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;
CREATE TRIGGER dependencia_sellada BEFORE INSERT OR UPDATE OR DELETE ON revision_dependencias
FOR EACH ROW EXECUTE FUNCTION proteger_detalle_revision();
CREATE TRIGGER archivo_sellado BEFORE INSERT OR UPDATE OR DELETE ON revision_archivos
FOR EACH ROW EXECUTE FUNCTION proteger_detalle_revision();
CREATE TRIGGER fuente_sellada BEFORE INSERT OR UPDATE OR DELETE ON revision_fuentes
FOR EACH ROW EXECUTE FUNCTION proteger_detalle_revision();
CREATE TRIGGER territorio_sellado BEFORE INSERT OR UPDATE OR DELETE ON revision_territorios
FOR EACH ROW EXECUTE FUNCTION proteger_detalle_revision();
CREATE TRIGGER evaluacion_inmutable BEFORE UPDATE OR DELETE ON evaluaciones_revision
FOR EACH ROW EXECUTE FUNCTION impedir_mutacion();
CREATE TRIGGER auditoria_inmutable BEFORE UPDATE OR DELETE ON eventos_auditoria
FOR EACH ROW EXECUTE FUNCTION impedir_mutacion();
CREATE TRIGGER evento_editorial_inmutable BEFORE UPDATE OR DELETE ON eventos_editoriales
FOR EACH ROW EXECUTE FUNCTION impedir_mutacion();

CREATE FUNCTION identidad_registro_inmutable() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NEW.id IS DISTINCT FROM OLD.id OR NEW.tipo IS DISTINCT FROM OLD.tipo
    OR NEW.creado_por IS DISTINCT FROM OLD.creado_por OR NEW.creado_en IS DISTINCT FROM OLD.creado_en THEN
   RAISE EXCEPTION 'No modificar identidad, tipo o autor original de un registro';
 END IF;
 NEW.actualizado_en := now();
 RETURN NEW;
END $$;
CREATE TRIGGER registro_identidad BEFORE UPDATE ON registros
FOR EACH ROW EXECUTE FUNCTION identidad_registro_inmutable();

CREATE FUNCTION validar_ciclo_territorial() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 -- Serializar modificaciones del grafo evita ciclos por inserciones concurrentes.
 PERFORM pg_advisory_xact_lock(210001);
 IF EXISTS (
   WITH RECURSIVE ancestros(id) AS (
     SELECT NEW.contenedor_id UNION
     SELECT tr.contenedor_id FROM territorio_relaciones tr JOIN ancestros a ON a.id=tr.territorio_id
     WHERE TG_OP = 'INSERT' OR NOT (tr.territorio_id=OLD.territorio_id
       AND tr.contenedor_id=OLD.contenedor_id AND tr.tipo=OLD.tipo)
   ) SELECT 1 FROM ancestros WHERE id=NEW.territorio_id
 ) THEN RAISE EXCEPTION 'La relación territorial introduce un ciclo'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER territorio_sin_ciclos BEFORE INSERT OR UPDATE ON territorio_relaciones
FOR EACH ROW EXECUTE FUNCTION validar_ciclo_territorial();

CREATE FUNCTION validar_territorio_especializado() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text;
BEGIN
 SELECT tt.codigo INTO v_tipo FROM territorios t JOIN tipos_territorio tt ON tt.id=t.tipo_id
 WHERE t.id=NEW.territorio_id;
 IF v_tipo <> TG_ARGV[0] THEN RAISE EXCEPTION 'Tipo territorial incompatible: esperado %',TG_ARGV[0]; END IF;
 IF TG_TABLE_NAME = 'localidades_puebla' THEN
 IF NEW.clave_inegi IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM municipios_puebla m WHERE m.territorio_id=NEW.municipio_id
     AND left(NEW.clave_inegi,5)=m.cvegeo) THEN
   RAISE EXCEPTION 'La clave de localidad no pertenece al municipio';
 END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER municipio_tipo BEFORE INSERT OR UPDATE ON municipios_puebla
FOR EACH ROW EXECUTE FUNCTION validar_territorio_especializado('municipio');
CREATE TRIGGER localidad_tipo BEFORE INSERT OR UPDATE ON localidades_puebla
FOR EACH ROW EXECUTE FUNCTION validar_territorio_especializado('localidad');

CREATE FUNCTION impedir_cambio_tipo_territorial() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NEW.tipo_id IS DISTINCT FROM OLD.tipo_id AND (
   EXISTS(SELECT 1 FROM municipios_puebla WHERE territorio_id=OLD.id) OR
   EXISTS(SELECT 1 FROM localidades_puebla WHERE territorio_id=OLD.id)) THEN
   RAISE EXCEPTION 'No cambiar el tipo de municipio/localidad especializado';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER territorio_tipo_estable BEFORE UPDATE ON territorios
FOR EACH ROW EXECUTE FUNCTION impedir_cambio_tipo_territorial();

CREATE FUNCTION validar_temporada() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_id uuid; v_anual boolean; v_periodo text; v_meses bigint;
BEGIN
 IF TG_ARGV[2] = 'meses' THEN
   IF TG_OP = 'DELETE' THEN v_id := OLD.temporada_id; ELSE v_id := NEW.temporada_id; END IF;
 ELSE
   IF TG_OP = 'DELETE' THEN RETURN NULL; END IF;
   v_id := NEW.id;
 END IF;
 EXECUTE format('SELECT todo_el_anio, periodo_descriptivo FROM %I WHERE id=$1 FOR UPDATE',TG_ARGV[0])
   INTO v_anual,v_periodo USING v_id;
 IF v_anual IS NULL THEN RETURN NULL; END IF;
 EXECUTE format('SELECT count(*) FROM %I WHERE temporada_id=$1',TG_ARGV[1]) INTO v_meses USING v_id;
 IF v_anual AND v_meses > 0 THEN RAISE EXCEPTION 'Todo el año no admite meses individuales'; END IF;
 IF NOT v_anual AND v_meses=0 AND coalesce(length(btrim(v_periodo)),0)=0 THEN
   RAISE EXCEPTION 'La temporada necesita meses o un periodo descriptivo';
 END IF;
 RETURN NULL;
END $$;

CREATE CONSTRAINT TRIGGER ingrediente_temporada_consistente
 AFTER INSERT OR UPDATE ON ingrediente_temporadas DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION validar_temporada('ingrediente_temporadas','ingrediente_temporada_meses','padre');
 CREATE CONSTRAINT TRIGGER ingrediente_mes_consistente
 AFTER INSERT OR UPDATE OR DELETE ON ingrediente_temporada_meses DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION validar_temporada('ingrediente_temporadas','ingrediente_temporada_meses','meses');

CREATE CONSTRAINT TRIGGER variedad_temporada_consistente
 AFTER INSERT OR UPDATE ON variedad_temporadas DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION validar_temporada('variedad_temporadas','variedad_temporada_meses','padre');
 CREATE CONSTRAINT TRIGGER variedad_mes_consistente
 AFTER INSERT OR UPDATE OR DELETE ON variedad_temporada_meses DEFERRABLE INITIALLY DEFERRED
 FOR EACH ROW EXECUTE FUNCTION validar_temporada('variedad_temporadas','variedad_temporada_meses','meses');


CREATE FUNCTION consentimiento_valido(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 SELECT EXISTS(SELECT 1 FROM consentimientos c
  WHERE c.id=p_id AND c.estado='activo' AND c.fecha<=current_date
    AND (c.vence_en IS NULL OR c.vence_en>=current_date)
    AND c.verificado_por IS NOT NULL AND c.verificado_en IS NOT NULL
    AND EXISTS(SELECT 1 FROM consentimiento_archivos ca JOIN archivos a ON a.id=ca.archivo_id
      WHERE ca.consentimiento_id=c.id AND a.estado='disponible' AND a.visibilidad='restringido'));
$$;

CREATE FUNCTION validar_evidencia_privada() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM archivos WHERE id=NEW.archivo_id AND visibilidad='restringido') THEN
   RAISE EXCEPTION 'La evidencia de consentimiento debe ser restringida';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER consentimiento_evidencia_privada BEFORE INSERT OR UPDATE ON consentimiento_archivos
FOR EACH ROW EXECUTE FUNCTION validar_evidencia_privada();

CREATE FUNCTION proteger_visibilidad_evidencia() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 IF NEW.visibilidad='publico' AND EXISTS(SELECT 1 FROM consentimiento_archivos WHERE archivo_id=NEW.id) THEN
  RAISE EXCEPTION 'No hacer pública una evidencia de consentimiento';
 END IF;
 IF NEW.clave_externa IS DISTINCT FROM OLD.clave_externa OR NEW.proveedor IS DISTINCT FROM OLD.proveedor
    OR NEW.url_publica IS DISTINCT FROM OLD.url_publica THEN
  IF EXISTS(SELECT 1 FROM revision_archivos WHERE archivo_id=OLD.id) THEN
   RAISE EXCEPTION 'Archivo asociado a revisión: crear otra referencia en lugar de reemplazar contenido';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER archivo_evidencia BEFORE UPDATE ON archivos
FOR EACH ROW EXECUTE FUNCTION proteger_visibilidad_evidencia();

CREATE FUNCTION activar_consentimiento(p_usuario uuid,p_consentimiento uuid) RETURNS void
LANGUAGE plpgsql SET search_path = ogp, public AS $$
BEGIN
 PERFORM exigir_permiso(p_usuario,'consentimientos','validar');
 PERFORM 1 FROM consentimientos WHERE id=p_consentimiento FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Consentimiento inexistente'; END IF;
 IF NOT EXISTS(SELECT 1 FROM consentimiento_archivos ca JOIN archivos a ON a.id=ca.archivo_id
   WHERE ca.consentimiento_id=p_consentimiento AND a.visibilidad='restringido' AND a.estado='disponible') THEN
   RAISE EXCEPTION 'Falta evidencia privada disponible';
 END IF;
 UPDATE consentimientos SET estado='activo',verificado_por=p_usuario,verificado_en=now()
 WHERE id=p_consentimiento AND estado IN ('pendiente','vencido');
 IF NOT FOUND THEN RAISE EXCEPTION 'No reactivar autorizaciones revocadas o sustituidas'; END IF;
 INSERT INTO eventos_auditoria(usuario_id,accion,tabla_afectada,entidad_id)
 VALUES(p_usuario,'activar','consentimientos',p_consentimiento);
END $$;

-- Fotografía del contenido visible: no incluye contactos ni evidencia de consentimiento.
CREATE FUNCTION construir_contenido(p_tipo text,p_id uuid) RETURNS jsonb
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tabla text; v_ficha jsonb; v_detalle jsonb := '{}'::jsonb;
BEGIN
 v_tabla := CASE p_tipo

WHEN 'preparacion' THEN 'preparaciones'

WHEN 'ingrediente' THEN 'ingredientes'

WHEN 'variedad' THEN 'ingrediente_variedades'

WHEN 'persona' THEN 'personas'

WHEN 'receta' THEN 'recetas_documentadas'

WHEN 'mercado' THEN 'mercados'

WHEN 'expediente' THEN 'expedientes_legales'

WHEN 'instrumento' THEN 'instrumentos_legales'

WHEN 'podcast' THEN 'podcasts'

WHEN 'episodio' THEN 'episodios'

WHEN 'institucional' THEN 'contenidos_institucionales'

ELSE NULL END;
 IF v_tabla IS NULL THEN RAISE EXCEPTION 'Tipo desconocido: %',p_tipo; END IF;
 EXECUTE format($consulta$SELECT to_jsonb(t) - ARRAY['id','tipo_registro','preparacion_id','ingrediente_id','podcast_id'] FROM %I t WHERE id=$1$consulta$,v_tabla)
 INTO v_ficha USING p_id;
 IF v_ficha IS NULL THEN RAISE EXCEPTION 'Falta ficha de dominio para el registro'; END IF;
 CASE p_tipo
 WHEN 'preparacion' THEN
   SELECT jsonb_build_object('nombres',coalesce(jsonb_agg(to_jsonb(n)-ARRAY['id','preparacion_id','fuente_id']),'[]'::jsonb))
   INTO v_detalle FROM preparacion_nombres n WHERE preparacion_id=p_id;
 WHEN 'receta' THEN
   v_detalle := jsonb_build_object(
    'pasos',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','receta_id'] ORDER BY orden),'[]'::jsonb) FROM receta_pasos x WHERE receta_id=p_id),
    'ingredientes',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','receta_id'] ORDER BY orden),'[]'::jsonb) FROM receta_ingredientes x WHERE receta_id=p_id),
    'tecnicas',(SELECT coalesce(jsonb_agg(jsonb_build_object('codigo',t.codigo,'nombre',t.nombre,'observaciones',x.observaciones_publicas)),'[]'::jsonb) FROM receta_tecnicas x JOIN tecnicas t ON t.id=x.tecnica_id WHERE receta_id=p_id));
 WHEN 'persona' THEN
   v_detalle := jsonb_build_object(
    'participaciones',(SELECT coalesce(jsonb_agg(t.nombre),'[]'::jsonb) FROM persona_tipos_participacion x JOIN tipos_participacion t ON t.id=x.participacion_id WHERE persona_id=p_id),
    'especialidades',(SELECT coalesce(jsonb_agg(t.nombre),'[]'::jsonb) FROM persona_especialidades x JOIN especialidades t ON t.id=x.especialidad_id WHERE persona_id=p_id),
    'lenguas',(SELECT coalesce(jsonb_agg(t.nombre),'[]'::jsonb) FROM persona_lenguas x JOIN lenguas t ON t.id=x.lengua_id WHERE persona_id=p_id),
    'reconocimientos',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','persona_id','fuente_id']),'[]'::jsonb) FROM reconocimientos x WHERE persona_id=p_id));
 WHEN 'mercado' THEN
   v_detalle := jsonb_build_object('ubicacion',(
    SELECT jsonb_build_object('direccion',u.direccion,'descripcion',u.descripcion_ubicacion,
      'municipio_id',u.municipio_id,'localidad_id',u.localidad_id,'precision',u.precision,
      'longitud',ST_X(u.punto),'latitud',ST_Y(u.punto),'vigente_desde',u.vigente_desde,
      'horarios',(SELECT coalesce(jsonb_agg(to_jsonb(h)-ARRAY['id','ubicacion_id']),'[]'::jsonb) FROM mercado_horarios h WHERE h.ubicacion_id=u.id))
    FROM mercado_ubicaciones u WHERE u.mercado_id=p_id AND u.vigente_desde<=current_date
      AND (u.vigente_hasta IS NULL OR u.vigente_hasta>current_date)),
    'temporadas',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','mercado_id','fuente_id']),'[]'::jsonb) FROM mercado_temporadas x WHERE mercado_id=p_id),
    'servicios',(SELECT coalesce(jsonb_agg(jsonb_build_object('nombre',s.nombre,'descripcion',x.descripcion,'fecha',x.fecha_comprobacion)),'[]'::jsonb) FROM mercado_servicios x JOIN servicios s ON s.id=x.servicio_id WHERE mercado_id=p_id),
    'productos',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','mercado_id','fuente_id']),'[]'::jsonb) FROM mercado_ingredientes x WHERE mercado_id=p_id));
 WHEN 'episodio' THEN
   v_detalle := jsonb_build_object(
    'creditos',(SELECT coalesce(jsonb_agg(jsonb_build_object('nombre',nombre_publico,'funcion',funcion)),'[]'::jsonb) FROM episodio_creditos WHERE episodio_id=p_id AND autorizacion_confirmada),
    'enlaces',(SELECT coalesce(jsonb_agg(jsonb_build_object('plataforma',plataforma,'url',url,'tipo',tipo,'verificado_en',verificado_en)),'[]'::jsonb) FROM episodio_enlaces WHERE episodio_id=p_id AND disponible AND verificado_en IS NOT NULL));
 WHEN 'expediente' THEN
   SELECT jsonb_build_object('actuaciones',coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','expediente_id','fuente_id','visibilidad']),'[]'::jsonb))
   INTO v_detalle FROM expediente_eventos x WHERE expediente_id=p_id AND visibilidad='publico';
 ELSE NULL;
 END CASE;

IF p_tipo='ingrediente' THEN
 v_detalle := jsonb_build_object(
   'nombres',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','ingrediente_id','fuente_id']),'[]'::jsonb) FROM ingrediente_nombres x WHERE ingrediente_id=p_id),
   'temporadas',(SELECT coalesce(jsonb_agg((to_jsonb(x)-ARRAY['id','ingrediente_id','fuente_id']) || jsonb_build_object('meses',
      (SELECT coalesce(jsonb_agg(m.mes ORDER BY m.mes),'[]'::jsonb) FROM ingrediente_temporada_meses m WHERE m.temporada_id=x.id))),'[]'::jsonb) FROM ingrediente_temporadas x WHERE ingrediente_id=p_id),
   'produccion',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','ingrediente_id','fuente_id']),'[]'::jsonb) FROM ingrediente_produccion x WHERE ingrediente_id=p_id));
 END IF;

IF p_tipo='variedad' THEN
 v_detalle := jsonb_build_object(
   'nombres',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','variedad_id','fuente_id']),'[]'::jsonb) FROM variedad_nombres x WHERE variedad_id=p_id),
   'temporadas',(SELECT coalesce(jsonb_agg((to_jsonb(x)-ARRAY['id','variedad_id','fuente_id']) || jsonb_build_object('meses',
      (SELECT coalesce(jsonb_agg(m.mes ORDER BY m.mes),'[]'::jsonb) FROM variedad_temporada_meses m WHERE m.temporada_id=x.id))),'[]'::jsonb) FROM variedad_temporadas x WHERE variedad_id=p_id),
   'produccion',(SELECT coalesce(jsonb_agg(to_jsonb(x)-ARRAY['id','variedad_id','fuente_id']),'[]'::jsonb) FROM variedad_produccion x WHERE variedad_id=p_id));
 END IF;

RETURN jsonb_build_object('tipo',p_tipo,'ficha',v_ficha,'detalle',v_detalle);
END $$;

CREATE FUNCTION validar_revision(p_revision uuid) RETURNS void
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE r registro_revisiones; v_tipo text; f jsonb; d jsonb;
BEGIN
 SELECT * INTO STRICT r FROM registro_revisiones WHERE id=p_revision;
 v_tipo:=r.contenido_publico->>'tipo'; f:=r.contenido_publico->'ficha'; d:=r.contenido_publico->'detalle';
 IF v_tipo NOT IN ('podcast','episodio','institucional') AND NOT EXISTS(
   SELECT 1 FROM revision_fuentes WHERE revision_id=p_revision) THEN
   RAISE EXCEPTION 'Falta al menos una fuente con cita pública';
 END IF;
 IF v_tipo IN ('preparacion','receta','persona','expediente') AND NOT EXISTS(
   WITH RECURSIVE alcance(id) AS (
     SELECT territorio_id FROM revision_territorios WHERE revision_id=p_revision UNION
     SELECT tr.contenedor_id FROM territorio_relaciones tr JOIN alcance a ON a.id=tr.territorio_id
   ) SELECT 1 FROM alcance a JOIN territorios t ON t.id=a.id
     JOIN tipos_territorio tt ON tt.id=t.tipo_id
     WHERE a.id IN (SELECT territorio_id FROM municipios_puebla)
       OR (tt.codigo='estado' AND EXISTS(SELECT 1 FROM referencias_territoriales rt
          WHERE rt.territorio_id=a.id AND rt.identificador_externo='21'))
 ) THEN RAISE EXCEPTION 'Falta vínculo territorial documentado con Puebla'; END IF;
 CASE v_tipo
 WHEN 'preparacion' THEN
  IF coalesce(length(btrim(f->>'descripcion')),0)=0 OR f->>'categoria_id' IS NULL THEN
    RAISE EXCEPTION 'Preparación: falta categoría o descripción'; END IF;
 WHEN 'receta' THEN
  IF coalesce(length(btrim(f->>'descripcion')),0)=0 OR f->>'tipo_documentacion_id' IS NULL THEN
    RAISE EXCEPTION 'Receta: falta descripción o tipo de documentación'; END IF;
  IF f->>'nivel_documentacion'='completa' THEN
    IF jsonb_array_length(d->'ingredientes')=0 OR jsonb_array_length(d->'pasos')=0 THEN
      RAISE EXCEPTION 'Receta completa: faltan ingredientes o pasos'; END IF;
  ELSIF coalesce(length(btrim(f->>'limitaciones_documentacion')),0)=0 THEN
    RAISE EXCEPTION 'Receta parcial: describir las limitaciones';
  END IF;
 WHEN 'ingrediente' THEN
  IF f->>'categoria_id' IS NULL OR coalesce(length(btrim(f->>'descripcion')),0)=0 THEN
    RAISE EXCEPTION 'Ingrediente: falta categoría o descripción'; END IF;
 WHEN 'variedad' THEN
  IF coalesce(length(btrim(f->>'caracteristicas')),0)=0 THEN RAISE EXCEPTION 'Variedad: falta caracterización'; END IF;
 WHEN 'persona' THEN
  IF coalesce(length(btrim(f->>'semblanza')),0)=0 AND coalesce(length(btrim(f->>'trayectoria')),0)=0 THEN
    RAISE EXCEPTION 'Persona: falta semblanza o trayectoria'; END IF;
  IF jsonb_array_length(d->'participaciones')=0 THEN RAISE EXCEPTION 'Persona: falta participación'; END IF;
 WHEN 'mercado' THEN
  IF f->>'fecha_comprobacion' IS NULL OR d->'ubicacion' IS NULL OR d->'ubicacion'='null'::jsonb
    OR d#>>'{ubicacion,longitud}' IS NULL OR d#>>'{ubicacion,latitud}' IS NULL
    OR (coalesce(length(btrim(d#>>'{ubicacion,direccion}')),0)=0
      AND coalesce(length(btrim(d#>>'{ubicacion,descripcion}')),0)=0) THEN
    RAISE EXCEPTION 'Mercado: falta ubicación vigente, referencia de ubicación o fecha de comprobación'; END IF;
 WHEN 'expediente' THEN
  IF f->>'tipo_id' IS NULL OR coalesce(length(btrim(f->>'autoridad')),0)=0 THEN
    RAISE EXCEPTION 'Expediente: falta tipo o autoridad'; END IF;
 WHEN 'instrumento' THEN
  IF f->>'tipo_id' IS NULL OR coalesce(length(btrim(f->>'autoridad')),0)=0
    OR coalesce(length(btrim(f->>'referencia_oficial')),0)=0 OR coalesce(length(btrim(f->>'alcance')),0)=0
    OR f->>'fecha_revision' IS NULL THEN RAISE EXCEPTION 'Instrumento: faltan referencia, autoridad, tipo, alcance o fecha de revisión'; END IF;
 WHEN 'podcast' THEN
  IF coalesce(length(btrim(f->>'descripcion')),0)=0 OR coalesce(length(btrim(f->>'proposito')),0)=0 THEN
    RAISE EXCEPTION 'Podcast: falta descripción o propósito'; END IF;
 WHEN 'episodio' THEN
  IF coalesce(length(btrim(f->>'resumen')),0)=0 THEN RAISE EXCEPTION 'Episodio: falta resumen'; END IF;
  IF jsonb_array_length(d->'creditos')=0 THEN RAISE EXCEPTION 'Episodio: faltan créditos autorizados'; END IF;
  IF NOT EXISTS(SELECT 1 FROM jsonb_array_elements(d->'enlaces') e WHERE e->>'tipo' IN ('pagina','audio','reproductor'))
    AND NOT EXISTS(SELECT 1 FROM revision_archivos ra JOIN archivos a ON a.id=ra.archivo_id
      WHERE ra.revision_id=p_revision AND ra.funcion='audio_principal' AND a.estado='disponible') THEN
    RAISE EXCEPTION 'Episodio: falta una opción para escuchar'; END IF;
 WHEN 'institucional' THEN
  IF coalesce(length(btrim(f->>'cuerpo')),0)=0 THEN RAISE EXCEPTION 'Contenido institucional vacío'; END IF;
 ELSE RAISE EXCEPTION 'Tipo de revisión no reconocido';
 END CASE;
 IF EXISTS(SELECT 1 FROM revision_archivos ra JOIN archivos a ON a.id=ra.archivo_id
   WHERE ra.revision_id=p_revision AND (a.estado<>'disponible' OR a.visibilidad<>'publico' OR a.url_publica IS NULL
     OR coalesce(length(btrim(a.licencia)),0)=0
     OR (a.tipo_mime LIKE 'image/%' AND coalesce(length(btrim(ra.texto_alternativo)),0)=0))) THEN
   RAISE EXCEPTION 'Archivo público no disponible, sin condiciones de uso o imagen sin descripción'; END IF;
END $$;

CREATE FUNCTION enviar_revision(p_usuario uuid,p_registro uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text; v_num integer; v_id uuid; v_prefijo text;
BEGIN
 SELECT tipo INTO STRICT v_tipo FROM registros WHERE id=p_registro AND archivado_en IS NULL FOR UPDATE;
 PERFORM exigir_permiso(p_usuario,v_tipo,'enviar',p_registro);
 SELECT coalesce(max(numero),0)+1 INTO v_num FROM registro_revisiones WHERE registro_id=p_registro;
 INSERT INTO registro_revisiones(registro_id,numero,creado_por,contenido_publico)
 VALUES(p_registro,v_num,p_usuario,construir_contenido(v_tipo,p_registro)) RETURNING id INTO v_id;
 v_prefijo:=v_tipo;
 -- Las tablas de vínculos tienen nombres definidos por el catálogo cerrado de tipos.
 EXECUTE format($consulta$INSERT INTO revision_fuentes(revision_id,fuente_id,cita_publica,afirmacion,apartado)
   SELECT $1,f.id,CASE WHEN f.visibilidad='publico' THEN coalesce(f.cita_publica,f.titulo || '. ' || f.referencia)
      ELSE f.cita_publica END,x.afirmacion,x.apartado
   FROM %I x JOIN fuentes f ON f.id=x.fuente_id WHERE x.%I=$2
     AND (f.visibilidad='publico' OR f.cita_publica IS NOT NULL)$consulta$,v_prefijo||'_fuentes',v_prefijo||'_id')
 USING v_id,p_registro;
 EXECUTE format('INSERT INTO revision_archivos(revision_id,archivo_id,funcion,texto_alternativo,descripcion_publica,orden)
   SELECT $1,archivo_id,funcion,texto_alternativo,descripcion_publica,orden FROM %I WHERE %I=$2',
   v_prefijo||'_archivos',v_prefijo||'_id') USING v_id,p_registro;
 IF v_tipo NOT IN ('podcast','institucional') THEN
   EXECUTE format('INSERT INTO revision_territorios(revision_id,territorio_id,tipo_vinculo,nombre_en_revision,tipo_territorio_en_revision)
     SELECT $1,t.id,x.tipo_vinculo,t.nombre,tt.codigo FROM %I x JOIN territorios t ON t.id=x.territorio_id
     JOIN tipos_territorio tt ON tt.id=t.tipo_id WHERE x.%I=$2',v_prefijo||'_territorios',v_prefijo||'_id')
   USING v_id,p_registro;
 END IF;
 CASE v_tipo
 WHEN 'receta' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT v_id,preparacion_id,'variante_de',true FROM recetas_documentadas WHERE id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,ingrediente_id,'utiliza',true FROM receta_ingredientes WHERE receta_id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,variedad_id,'utiliza_variedad',true FROM receta_ingredientes WHERE receta_id=p_registro AND variedad_id IS NOT NULL;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria)
   SELECT v_id,x.persona_id,'participacion:'||p.codigo,false FROM receta_personas x
   JOIN participaciones_receta p ON p.id=x.participacion_id WHERE x.receta_id=p_registro;
 WHEN 'variedad' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT v_id,ingrediente_id,'variedad_de',true FROM ingrediente_variedades WHERE id=p_registro;
 WHEN 'mercado' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,ingrediente_id,'ofrece',true FROM mercado_ingredientes WHERE mercado_id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,variedad_id,'ofrece_variedad',true FROM mercado_ingredientes WHERE mercado_id=p_registro AND variedad_id IS NOT NULL;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,persona_id,'participa',false FROM mercado_personas WHERE mercado_id=p_registro;
 WHEN 'episodio' THEN
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT v_id,podcast_id,'episodio_de',true FROM episodios WHERE id=p_registro;
   INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,persona_id,'participa',false FROM episodio_personas WHERE episodio_id=p_registro;
 ELSE NULL;
 END CASE;

IF v_tipo='episodio' THEN

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,preparacion_id,'menciona',false FROM episodio_preparaciones WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,receta_id,'menciona',false FROM episodio_recetas WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,ingrediente_id,'menciona',false FROM episodio_ingredientes WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,variedad_id,'menciona',false FROM episodio_variedades WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,mercado_id,'menciona',false FROM episodio_mercados WHERE episodio_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria) SELECT DISTINCT v_id,instrumento_id,'menciona',false FROM episodio_instrumentos WHERE episodio_id=p_registro;

END IF;

IF v_tipo='instrumento' THEN

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,preparacion_id,'instrumento_relacionado',false,alcance FROM instrumento_preparaciones WHERE instrumento_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,receta_id,'instrumento_relacionado',false,alcance FROM instrumento_recetas WHERE instrumento_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,ingrediente_id,'instrumento_relacionado',false,alcance FROM instrumento_ingredientes WHERE instrumento_id=p_registro;

INSERT INTO revision_dependencias(revision_id,registro_destino_id,relacion,obligatoria,descripcion_publica) SELECT v_id,variedad_id,'instrumento_relacionado',false,alcance FROM instrumento_variedades WHERE instrumento_id=p_registro;

END IF;

PERFORM validar_revision(v_id);
 UPDATE registro_revisiones SET sellada_en=now() WHERE id=v_id;
 INSERT INTO eventos_editoriales(registro_id,revision_id,usuario_id,accion) VALUES(p_registro,v_id,p_usuario,'enviar');
 RETURN v_id;
END $$;

CREATE FUNCTION revision_autorizada(p_revision uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 SELECT NOT EXISTS (
   SELECT 1 FROM consentimiento_revision_alcances cr
   WHERE cr.revision_id=p_revision AND NOT consentimiento_valido(cr.consentimiento_id)
 ) AND (
   NOT EXISTS(SELECT 1 FROM registro_revisiones rr JOIN registros r ON r.id=rr.registro_id
     WHERE rr.id=p_revision AND r.tipo='persona')
   OR EXISTS(SELECT 1 FROM consentimiento_revision_alcances cr JOIN consentimientos c ON c.id=cr.consentimiento_id
       JOIN registro_revisiones rr ON rr.id=cr.revision_id
     WHERE cr.revision_id=p_revision AND c.persona_id=rr.registro_id AND consentimiento_valido(c.id))
 );
$$;

CREATE FUNCTION evaluar_revision(p_usuario uuid,p_revision uuid,p_dictamen text,p_observaciones text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text; v_registro uuid; v_id uuid;
BEGIN
 SELECT r.tipo,r.id INTO STRICT v_tipo,v_registro FROM registro_revisiones rr JOIN registros r ON r.id=rr.registro_id
 WHERE rr.id=p_revision FOR UPDATE OF r;
 PERFORM exigir_permiso(p_usuario,v_tipo,'validar',v_registro);
 IF NOT EXISTS(SELECT 1 FROM registro_revisiones WHERE id=p_revision AND sellada_en IS NOT NULL) THEN
   RAISE EXCEPTION 'La revisión aún no está sellada'; END IF;
 IF p_dictamen='validado' THEN
   PERFORM validar_revision(p_revision);
   IF NOT revision_autorizada(p_revision) THEN RAISE EXCEPTION 'Consentimiento faltante o no vigente para esta revisión'; END IF;
 END IF;
 INSERT INTO evaluaciones_revision(revision_id,revisor_id,dictamen,observaciones)
 VALUES(p_revision,p_usuario,p_dictamen,p_observaciones) RETURNING id INTO v_id;
 INSERT INTO eventos_editoriales(registro_id,revision_id,usuario_id,accion,observaciones)
 VALUES(v_registro,p_revision,p_usuario,p_dictamen,p_observaciones);
 RETURN v_id;
END $$;

CREATE FUNCTION ficha_visible(p_registro uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 WITH RECURSIVE requeridas(registro_id) AS (
   SELECT p_registro UNION
   SELECT d.registro_destino_id FROM requeridas req
     JOIN publicaciones p ON p.registro_id=req.registro_id AND p.retirado_en IS NULL
     JOIN revision_dependencias d ON d.revision_id=p.revision_id AND d.obligatoria
 ) SELECT NOT EXISTS(
   SELECT 1 FROM requeridas req
   LEFT JOIN publicaciones p ON p.registro_id=req.registro_id AND p.retirado_en IS NULL
   JOIN registros r ON r.id=req.registro_id
   WHERE p.id IS NULL OR r.archivado_en IS NOT NULL OR NOT revision_autorizada(p.revision_id)
 );
$$;

CREATE FUNCTION validar_publicacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text;
BEGIN
 SELECT tipo INTO STRICT v_tipo FROM registros WHERE id=NEW.registro_id AND archivado_en IS NULL FOR UPDATE;
 PERFORM exigir_permiso(NEW.publicado_por,v_tipo,'publicar',NEW.registro_id);
 IF NOT EXISTS(SELECT 1 FROM registro_revisiones WHERE id=NEW.revision_id AND sellada_en IS NOT NULL) THEN
   RAISE EXCEPTION 'La revisión aún no está sellada'; END IF;
 IF NOT EXISTS(SELECT 1 FROM evaluaciones_revision WHERE id=NEW.evaluacion_id
   AND revision_id=NEW.revision_id AND dictamen='validado') THEN RAISE EXCEPTION 'La revisión no está validada'; END IF;
 PERFORM validar_revision(NEW.revision_id);
 IF NOT revision_autorizada(NEW.revision_id) THEN RAISE EXCEPTION 'Autorización no vigente'; END IF;
 IF EXISTS(SELECT 1 FROM revision_dependencias d WHERE d.revision_id=NEW.revision_id
    AND d.obligatoria AND NOT ficha_visible(d.registro_destino_id)) THEN
   RAISE EXCEPTION 'Hay dependencias obligatorias sin publicación visible'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER publicacion_validada BEFORE INSERT ON publicaciones
FOR EACH ROW EXECUTE FUNCTION validar_publicacion();

CREATE FUNCTION proteger_publicacion() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'No eliminar publicaciones; retirar conservando historial'; END IF;
 IF (to_jsonb(NEW)-ARRAY['retirado_en','retirado_por','motivo_retiro']) IS DISTINCT FROM
    (to_jsonb(OLD)-ARRAY['retirado_en','retirado_por','motivo_retiro']) OR OLD.retirado_en IS NOT NULL
    OR NEW.retirado_en IS NULL THEN RAISE EXCEPTION 'Solo se permite retirar una publicación activa'; END IF;
 SELECT tipo INTO v_tipo FROM registros WHERE id=NEW.registro_id;
 PERFORM exigir_permiso(NEW.retirado_por,v_tipo,'retirar',NEW.registro_id);
 RETURN NEW;
END $$;
CREATE TRIGGER publicacion_historial BEFORE UPDATE OR DELETE ON publicaciones
FOR EACH ROW EXECUTE FUNCTION proteger_publicacion();

CREATE FUNCTION publicar_revision(p_usuario uuid,p_revision uuid) RETURNS uuid
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_registro uuid; v_tipo text; v_evaluacion uuid; v_id uuid;
BEGIN
 SELECT rr.registro_id,r.tipo INTO STRICT v_registro,v_tipo FROM registro_revisiones rr JOIN registros r ON r.id=rr.registro_id
 WHERE rr.id=p_revision FOR UPDATE OF r;
 PERFORM exigir_permiso(p_usuario,v_tipo,'publicar',v_registro);
 SELECT id INTO STRICT v_evaluacion FROM evaluaciones_revision WHERE revision_id=p_revision AND dictamen='validado';
 UPDATE publicaciones SET retirado_en=now(),retirado_por=p_usuario,motivo_retiro='Sustituida por una nueva revisión'
 WHERE registro_id=v_registro AND retirado_en IS NULL;
 INSERT INTO publicaciones(registro_id,revision_id,evaluacion_id,publicado_por)
 VALUES(v_registro,p_revision,v_evaluacion,p_usuario) RETURNING id INTO v_id;
 INSERT INTO eventos_editoriales(registro_id,revision_id,usuario_id,accion) VALUES(v_registro,p_revision,p_usuario,'publicar');
 RETURN v_id;
END $$;

CREATE FUNCTION retirar_publicacion(p_usuario uuid,p_registro uuid,p_motivo text) RETURNS void
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE v_tipo text;
BEGIN
 SELECT tipo INTO STRICT v_tipo FROM registros WHERE id=p_registro FOR UPDATE;
 PERFORM exigir_permiso(p_usuario,v_tipo,'retirar',p_registro);
 UPDATE publicaciones SET retirado_en=now(),retirado_por=p_usuario,motivo_retiro=p_motivo
 WHERE registro_id=p_registro AND retirado_en IS NULL;
 IF NOT FOUND THEN RAISE EXCEPTION 'No hay publicación activa'; END IF;
 INSERT INTO eventos_editoriales(registro_id,usuario_id,accion,observaciones) VALUES(p_registro,p_usuario,'retirar',p_motivo);
END $$;

CREATE FUNCTION auditar_evento() RETURNS trigger
LANGUAGE plpgsql SET search_path = ogp, public AS $$
DECLARE j jsonb; v_actor uuid; v_registro uuid;
BEGIN
 IF TG_OP='DELETE' THEN j:=to_jsonb(OLD); ELSE j:=to_jsonb(NEW); END IF;
 v_actor:=coalesce(nullif(current_setting('ogp.actor_id',true),'')::uuid,
   (j->>'publicado_por')::uuid,(j->>'revisor_id')::uuid,(j->>'creado_por')::uuid,(j->>'usuario_id')::uuid);
 IF TG_TABLE_NAME='registros' THEN v_registro:=(j->>'id')::uuid;
 ELSE v_registro:=(j->>'registro_id')::uuid; END IF;
 INSERT INTO eventos_auditoria(usuario_id,registro_id,accion,tabla_afectada,entidad_id,detalle)
 VALUES(v_actor,v_registro,lower(TG_OP),TG_TABLE_NAME,(j->>'id')::uuid,
   jsonb_build_object('operacion',TG_OP));
 IF TG_OP='DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END $$;

CREATE TRIGGER auditar_registros AFTER INSERT OR UPDATE OR DELETE ON registros FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_registro_revisiones AFTER INSERT OR UPDATE OR DELETE ON registro_revisiones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_evaluaciones_revision AFTER INSERT OR UPDATE OR DELETE ON evaluaciones_revision FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_publicaciones AFTER INSERT OR UPDATE OR DELETE ON publicaciones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_eventos_editoriales AFTER INSERT OR UPDATE OR DELETE ON eventos_editoriales FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_consentimientos AFTER INSERT OR UPDATE OR DELETE ON consentimientos FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_invitaciones AFTER INSERT OR UPDATE OR DELETE ON invitaciones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_usuario_roles AFTER INSERT OR UPDATE OR DELETE ON usuario_roles FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_rol_permisos AFTER INSERT OR UPDATE OR DELETE ON rol_permisos FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_usuario_modulos AFTER INSERT OR UPDATE OR DELETE ON usuario_modulos FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_asignaciones_registro AFTER INSERT OR UPDATE OR DELETE ON asignaciones_registro FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_importaciones AFTER INSERT OR UPDATE OR DELETE ON importaciones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_importacion_candidatos AFTER INSERT OR UPDATE OR DELETE ON importacion_candidatos FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_preparaciones AFTER INSERT OR UPDATE OR DELETE ON preparaciones FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_ingredientes AFTER INSERT OR UPDATE OR DELETE ON ingredientes FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_ingrediente_variedades AFTER INSERT OR UPDATE OR DELETE ON ingrediente_variedades FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_personas AFTER INSERT OR UPDATE OR DELETE ON personas FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_recetas_documentadas AFTER INSERT OR UPDATE OR DELETE ON recetas_documentadas FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_mercados AFTER INSERT OR UPDATE OR DELETE ON mercados FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_expedientes_legales AFTER INSERT OR UPDATE OR DELETE ON expedientes_legales FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_instrumentos_legales AFTER INSERT OR UPDATE OR DELETE ON instrumentos_legales FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_podcasts AFTER INSERT OR UPDATE OR DELETE ON podcasts FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_episodios AFTER INSERT OR UPDATE OR DELETE ON episodios FOR EACH ROW EXECUTE FUNCTION auditar_evento();

CREATE TRIGGER auditar_contenidos_institucionales AFTER INSERT OR UPDATE OR DELETE ON contenidos_institucionales FOR EACH ROW EXECUTE FUNCTION auditar_evento();


-- Revocar el EXECUTE que PostgreSQL concede por defecto al crear funciones.
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ogp FROM PUBLIC;
ALTER DEFAULT PRIVILEGES IN SCHEMA ogp REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- ===== 003_catalogs.sql =====
-- Catálogos de arranque. Sin usuarios, datos simulados, coordenadas ni instrumentos jurídicos ficticios.
SET LOCAL search_path = ogp, public;

INSERT INTO tipos_registro(codigo,nombre) VALUES
('preparacion','Preparación'),
('receta','Receta documentada'),
('ingrediente','Ingrediente'),
('variedad','Variedad'),
('persona','Persona'),
('mercado','Mercado o tianguis'),
('expediente','Expediente legal'),
('instrumento','Instrumento legal'),
('podcast','Serie de podcast'),
('episodio','Episodio'),
('institucional','Contenido institucional')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO categorias_preparacion(codigo,nombre) VALUES
('antojitos','Antojitos'),
('guisos','Guisos'),
('moles_salsas','Moles y salsas'),
('sopas_caldos','Sopas y caldos'),
('panes','Panes'),
('dulces_postres','Dulces y postres'),
('bebidas','Bebidas'),
('otra','Otra / por clasificar')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO categorias_ingrediente(codigo,nombre) VALUES
('vegetal','Vegetal'),
('animal','Animal'),
('hongo','Hongo'),
('mineral','Mineral'),
('elaborado','Producto elaborado'),
('otra','Otra / por clasificar')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO unidades(codigo,nombre) VALUES
('g','Gramo'),
('kg','Kilogramo'),
('ml','Mililitro'),
('l','Litro'),
('pieza','Pieza'),
('hectarea','Hectárea'),
('tonelada','Tonelada')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tecnicas(codigo,nombre) VALUES
('asado','Asado'),
('hervido','Hervido'),
('fritura','Fritura'),
('horneado','Horneado'),
('tatemado','Tatemado'),
('molienda','Molienda'),
('fermentacion','Fermentación'),
('otra','Otra documentada')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_participacion(codigo,nombre) VALUES
('cocina','Cocinera/o'),
('produccion','Productor/a'),
('comercio','Comerciante'),
('saberes','Portador/a o transmisor/a de saberes'),
('otra','Otra documentada')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO participaciones_receta(codigo,nombre) VALUES
('comparte_saber','Comparte el saber'),
('prepara','Prepara la variante'),
('testimonio','Aporta testimonio'),
('otra','Otra documentada')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO participaciones_episodio(codigo,nombre) VALUES
('conduccion','Conducción'),
('entrevista','Entrevista'),
('invitado','Invitado/a'),
('produccion','Producción'),
('otra','Otra')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO servicios(codigo,nombre) VALUES
('sanitarios','Sanitarios'),
('estacionamiento','Estacionamiento'),
('agua','Agua'),
('residuos','Manejo de residuos'),
('accesibilidad','Accesibilidad descrita')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_instrumento_legal(codigo,nombre) VALUES
('do','Denominación de origen'),
('ig','Indicación geográfica'),
('declaratoria','Declaratoria'),
('otro','Otro instrumento documentado')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_territorio(codigo,nombre) VALUES
('pais','País'),
('estado','Estado / división administrativa'),
('municipio','Municipio'),
('localidad','Localidad'),
('region','Región')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_temporada(codigo,nombre) VALUES
('produccion','Producción'),
('cosecha','Cosecha'),
('recoleccion','Recolección'),
('disponibilidad','Disponibilidad comercial'),
('mayor_uso','Mayor uso gastronómico')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO tipos_fuente(codigo,nombre) VALUES
('entrevista','Entrevista de campo'),
('observacion','Observación de campo'),
('historico','Documento histórico'),
('publicacion','Publicación / recetario'),
('oficial','Publicación oficial'),
('datos','Conjunto de datos / API')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO roles(codigo,nombre) VALUES
('capturista','Capturista'),
('revisor','Revisor'),
('publicador','Publicador'),
('administrador','Administrador')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO plantillas_reporte(codigo,nombre) VALUES
('panorama','Panorama general'),
('cobertura','Cobertura territorial'),
('calidad','Calidad de datos'),
('recetas','Preparaciones y recetas'),
('ingredientes','Ingredientes y variedades'),
('personas','Personas'),
('mercados','Mercados y tianguis'),
('legal','Protección legal'),
('podcast','Listado de podcast')
ON CONFLICT (codigo) DO NOTHING;


INSERT INTO permisos(codigo,modulo,accion)
SELECT t.codigo || '.' || a.accion,t.codigo,a.accion
FROM tipos_registro t CROSS JOIN (VALUES ('crear'),('editar'),('enviar'),('validar'),('publicar'),('retirar')) a(accion)
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO permisos(codigo,modulo,accion) VALUES
 ('usuarios.administrar','usuarios','administrar'),('catalogos.administrar','catalogos','administrar'),
 ('auditoria.consultar','auditoria','consultar'),('importaciones.importar','importaciones','importar'),
 ('consentimientos.validar','consentimientos','validar'),('consentimientos.consultar','consentimientos','consultar'),
 ('personas.contactos','persona','contactos'),('reportes.generar','reportes','generar')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permisos p
WHERE (r.codigo='capturista' AND p.accion IN ('crear','editar','enviar'))
 OR (r.codigo='revisor' AND p.accion='validar' AND p.modulo IN (SELECT codigo FROM tipos_registro))
 OR (r.codigo='publicador' AND p.accion IN ('publicar','retirar'))
 OR (r.codigo='administrador' AND p.modulo IN ('usuarios','catalogos','auditoria'))
ON CONFLICT DO NOTHING;

-- Facultades sensibles opcionales: se asignan como roles explícitos, no excepciones ocultas.
INSERT INTO roles(codigo,nombre) VALUES
 ('verificador_consentimientos','Verificador de consentimientos'),
 ('lector_datos_restringidos','Lector de datos restringidos'),
 ('importador','Importador de establecimientos'),('generador_reportes','Generador de reportes')
ON CONFLICT (codigo) DO NOTHING;
INSERT INTO rol_permisos(rol_id,permiso_id)
SELECT r.id,p.id FROM roles r CROSS JOIN permisos p
WHERE (r.codigo='verificador_consentimientos' AND p.modulo='consentimientos')
 OR (r.codigo='lector_datos_restringidos' AND p.codigo IN ('consentimientos.consultar','personas.contactos'))
 OR (r.codigo='importador' AND p.codigo='importaciones.importar')
 OR (r.codigo='generador_reportes' AND p.codigo='reportes.generar')
ON CONFLICT DO NOTHING;

-- ===== 004_public_views.sql =====
-- Lecturas públicas sobre revisiones aprobadas, nunca sobre borradores.
SET LOCAL search_path = ogp, public;

ALTER TABLE registro_revisiones ADD COLUMN busqueda tsvector GENERATED ALWAYS AS
 (jsonb_to_tsvector('spanish'::regconfig, contenido_publico, '["string"]'::jsonb)) STORED;
CREATE INDEX revision_busqueda_gin ON registro_revisiones USING gin (busqueda);

CREATE FUNCTION archivo_publicable(p_archivo uuid) RETURNS boolean
LANGUAGE sql STABLE SET search_path = ogp, public AS $$
 SELECT EXISTS(SELECT 1 FROM archivos a WHERE a.id=p_archivo AND a.estado='disponible'
   AND a.visibilidad='publico' AND a.licencia IS NOT NULL AND a.url_publica IS NOT NULL)
 AND NOT EXISTS(SELECT 1 FROM consentimiento_archivos_autorizados ca
   WHERE ca.archivo_id=p_archivo AND NOT consentimiento_valido(ca.consentimiento_id));
$$;

CREATE VIEW v_fichas_publicas AS
SELECT reg.id AS registro_id,reg.tipo,rev.id AS revision_id,p.publicado_en,
 rev.contenido_publico || jsonb_build_object(
  'fuentes',coalesce((SELECT jsonb_agg(jsonb_build_object('cita',f.cita_publica,
     'afirmacion',f.afirmacion,'apartado',f.apartado)) FROM revision_fuentes f WHERE f.revision_id=rev.id),'[]'::jsonb),
  'territorios',coalesce((SELECT jsonb_agg(jsonb_build_object('id',t.territorio_id,
     'nombre',t.nombre_en_revision,'tipo',t.tipo_territorio_en_revision,'vinculo',t.tipo_vinculo))
      FROM revision_territorios t WHERE t.revision_id=rev.id),'[]'::jsonb),
  'relaciones',coalesce((SELECT jsonb_agg(jsonb_build_object('registro_id',d.registro_destino_id,
     'relacion',d.relacion,'descripcion',d.descripcion_publica)) FROM revision_dependencias d
     WHERE d.revision_id=rev.id AND ficha_visible(d.registro_destino_id)),'[]'::jsonb),
  'archivos',coalesce((SELECT jsonb_agg(jsonb_build_object('id',a.id,'nombre',a.nombre,
     'url',a.url_publica,'tipo_mime',a.tipo_mime,'duracion_segundos',a.duracion_segundos,
     'credito',a.credito,'licencia',a.licencia,'funcion',ra.funcion,
     'texto_alternativo',ra.texto_alternativo,'descripcion',ra.descripcion_publica,'orden',ra.orden))
     FROM revision_archivos ra JOIN archivos a ON a.id=ra.archivo_id
     WHERE ra.revision_id=rev.id AND archivo_publicable(a.id)),'[]'::jsonb)
 ) AS contenido
FROM publicaciones p JOIN registros reg ON reg.id=p.registro_id
JOIN registro_revisiones rev ON rev.id=p.revision_id
WHERE p.retirado_en IS NULL AND ficha_visible(reg.id);

COMMENT ON VIEW v_fichas_publicas IS
 'Solo versiones aprobadas. Relaciones opcionales privadas se omiten; archivos revocados no se entregan.';

CREATE VIEW v_indicadores_publicos AS
SELECT tipo,count(*) AS registros_publicados FROM v_fichas_publicas GROUP BY tipo;

CREATE VIEW v_registros_por_municipio AS
SELECT m.territorio_id AS municipio_id,m.cvegeo,f.tipo,t.tipo_vinculo,
 count(DISTINCT f.registro_id) AS registros
FROM v_fichas_publicas f JOIN revision_territorios t ON t.revision_id=f.revision_id
LEFT JOIN localidades_puebla l ON l.territorio_id=t.territorio_id
JOIN municipios_puebla m ON m.territorio_id=coalesce(l.municipio_id,t.territorio_id)
GROUP BY m.territorio_id,m.cvegeo,f.tipo,t.tipo_vinculo;

CREATE VIEW v_mercados_mapa AS
SELECT f.registro_id,f.contenido#>>'{ficha,nombre}' AS nombre,
 f.contenido#>>'{ficha,tipo}' AS tipo,
 f.contenido#>>'{ficha,estado_operativo}' AS estado_operativo,
 (f.contenido#>>'{detalle,ubicacion,municipio_id}')::uuid AS municipio_id,
 (f.contenido#>>'{detalle,ubicacion,longitud}')::double precision AS longitud,
 (f.contenido#>>'{detalle,ubicacion,latitud}')::double precision AS latitud,
 f.contenido#>>'{detalle,ubicacion,precision}' AS precision,
 f.contenido#>'{detalle,ubicacion,horarios}' AS horarios
FROM v_fichas_publicas f WHERE f.tipo='mercado';

CREATE VIEW v_red_conocimiento AS
SELECT f.registro_id AS origen_id,d.registro_destino_id AS destino_id,
 d.relacion,d.descripcion_publica
FROM v_fichas_publicas f JOIN revision_dependencias d ON d.revision_id=f.revision_id
WHERE ficha_visible(d.registro_destino_id);

CREATE VIEW v_primeras_publicaciones AS
SELECT registro_id,min(publicado_en) AS primera_publicacion FROM publicaciones GROUP BY registro_id;

CREATE VIEW v_estado_editorial AS
SELECT r.id,r.tipo,r.creado_por,r.archivado_en,
 CASE WHEN r.archivado_en IS NOT NULL THEN 'archivado'
      WHEN rr.id IS NULL THEN 'borrador'
      WHEN ev.dictamen='correcciones' THEN 'correcciones'
      WHEN p.revision_id=rr.id AND p.retirado_en IS NULL THEN 'publicado'
      WHEN ev.dictamen='validado' THEN 'validado'
      ELSE 'en_revision' END AS estado_ultima_revision,
 rr.id AS ultima_revision_id,rr.numero,p.revision_id AS revision_publica_id
FROM registros r
LEFT JOIN LATERAL (SELECT * FROM registro_revisiones x WHERE x.registro_id=r.id ORDER BY numero DESC LIMIT 1) rr ON true
LEFT JOIN evaluaciones_revision ev ON ev.revision_id=rr.id
LEFT JOIN publicaciones p ON p.registro_id=r.id AND p.retirado_en IS NULL;

-- Entrada de lectura limitada: no admite actores ni SQL arbitrario.
-- Un rol PostgreSQL de lectura puede recibir EXECUTE aquí sin acceso a tablas internas.
CREATE FUNCTION consultar_fichas(p_tipo text DEFAULT NULL,p_busqueda text DEFAULT NULL,
 p_limite integer DEFAULT 20,p_offset integer DEFAULT 0)
RETURNS TABLE(registro_id uuid,tipo text,contenido jsonb,publicado_en timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
BEGIN
 IF p_limite<1 OR p_limite>100 OR p_offset<0 OR p_limite IS NULL OR p_offset IS NULL THEN
   RAISE EXCEPTION 'Usar límite 1..100 y desplazamiento no negativo'; END IF;
 RETURN QUERY SELECT f.registro_id,f.tipo::text,f.contenido,f.publicado_en
 FROM ogp.v_fichas_publicas f JOIN ogp.registro_revisiones rr ON rr.id=f.revision_id
 WHERE (p_tipo IS NULL OR f.tipo=p_tipo)
   AND (p_busqueda IS NULL OR length(btrim(p_busqueda))=0
     OR rr.busqueda @@ websearch_to_tsquery('spanish'::regconfig,p_busqueda))
 ORDER BY f.publicado_en DESC,f.registro_id LIMIT p_limite OFFSET p_offset;
END $$;

CREATE FUNCTION consultar_indicadores() RETURNS TABLE(tipo text,registros_publicados bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
 SELECT tipo,registros_publicados FROM ogp.v_indicadores_publicos;
$$;

CREATE FUNCTION consultar_mapa(p_municipio uuid DEFAULT NULL) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
 SELECT jsonb_build_object('type','FeatureCollection','features',coalesce(jsonb_agg(
   jsonb_build_object('type','Feature','id',registro_id,
     'geometry',jsonb_build_object('type','Point','coordinates',jsonb_build_array(longitud,latitud)),
     'properties',jsonb_build_object('nombre',nombre,'tipo',tipo,'estado_operativo',estado_operativo,
       'municipio_id',municipio_id,'precision',precision,'horarios',horarios))),'[]'::jsonb))
 FROM ogp.v_mercados_mapa WHERE p_municipio IS NULL OR municipio_id=p_municipio;
$$;

CREATE FUNCTION consultar_red(p_registro uuid) RETURNS TABLE(origen_id uuid,destino_id uuid,relacion text,descripcion text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, ogp, public AS $$
 SELECT origen_id,destino_id,relacion,descripcion_publica FROM ogp.v_red_conocimiento
 WHERE origen_id=p_registro OR destino_id=p_registro;
$$;

REVOKE ALL ON ALL TABLES IN SCHEMA ogp FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA ogp FROM PUBLIC;

-- ===== 005_integrity.sql =====
-- Reglas adicionales de identidad, autorizaciones e historial.
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
