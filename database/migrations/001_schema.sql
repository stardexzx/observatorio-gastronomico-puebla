-- Migración inicial: PostgreSQL 16+ y PostGIS 3.x.
-- Ejecutar únicamente sobre una base nueva. No es un script de reinicialización.
BEGIN;
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
COMMIT;
