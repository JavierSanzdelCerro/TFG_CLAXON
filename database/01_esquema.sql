-- =============================================================================
--  CLAXON · El radar de lo que pasa por tu pueblo
--  Esquema de base de datos relacional (PostgreSQL 16)
--
--  Bloques:
--    1. Territorio ............ provincia, comarca, municipio
--    2. Usuarios y seguridad .. usuario, rol, usuario_rol, token_refresco, dispositivo
--    3. Vecinos y familias .... vecino, familiar_vecino
--    4. Vendedores y catálogo . categoria_servicio, vendedor, vendedor_categoria, producto
--    5. Rutas ................. ruta, ruta_dia, parada, jornada, paso_parada
--    6. Encargos .............. suscripcion, encargo, linea_encargo, historial_encargo
--    7. Ayuntamiento y salud .. gestor_municipal, centro_salud, consulta_medica,
--                               incidencia_consulta, aviso, aviso_municipio
--    8. Avisos y tablón ....... notificacion, pantalla_tablon
--
--  Convenciones:
--    · Tablas y columnas en español, snake_case y en singular.
--    · Claves primarias "id" con IDENTITY (encaja con GenerationType.IDENTITY de JPA).
--    · Los estados y tipos son VARCHAR + CHECK (se mapean con @Enumerated(STRING)).
--    · Fechas con hora en TIMESTAMPTZ; horas "de reloj" (10:40) en TIME.
--    · La zona horaria de referencia es Europe/Madrid.
-- =============================================================================

SET client_encoding = 'UTF8';
SET timezone = 'Europe/Madrid';

-- Por si se relanza el script en una base de datos ya creada
DROP SCHEMA IF EXISTS claxon CASCADE;
CREATE SCHEMA claxon;
SET search_path TO claxon, public;

COMMENT ON SCHEMA claxon IS 'Base de datos de Claxon: avisos de servicios ambulantes y encargos en pueblos pequeños.';

-- Zona horaria y esquema por defecto para cualquier conexión a esta base de datos
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Europe/Madrid');
    EXECUTE format('ALTER DATABASE %I SET search_path TO claxon, public', current_database());
END $$;


-- =============================================================================
-- 1. TERRITORIO
-- =============================================================================

CREATE TABLE provincia (
    id          SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre      VARCHAR(60)  NOT NULL UNIQUE,
    codigo_ine  CHAR(2)      UNIQUE
);
COMMENT ON TABLE provincia IS 'Provincias donde opera Claxon (el piloto empieza en Teruel).';

CREATE TABLE comarca (
    id            SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provincia_id  SMALLINT     NOT NULL REFERENCES provincia (id),
    nombre        VARCHAR(80)  NOT NULL,
    CONSTRAINT uq_comarca_nombre UNIQUE (provincia_id, nombre)
);
COMMENT ON TABLE comarca IS 'Comarcas (en Aragón agrupan servicios entre pueblos cercanos).';

CREATE TABLE municipio (
    id            INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    provincia_id  SMALLINT      NOT NULL REFERENCES provincia (id),
    comarca_id    SMALLINT      REFERENCES comarca (id),
    nombre        VARCHAR(100)  NOT NULL,
    codigo_ine    CHAR(5)       UNIQUE,
    habitantes    INTEGER       CHECK (habitantes >= 0),
    latitud       NUMERIC(9,6)  CHECK (latitud  BETWEEN -90  AND 90),
    longitud      NUMERIC(9,6)  CHECK (longitud BETWEEN -180 AND 180),
    activo        BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_alta    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_municipio_nombre UNIQUE (provincia_id, nombre)
);
COMMENT ON TABLE  municipio        IS 'Pueblos dados de alta en Claxon.';
COMMENT ON COLUMN municipio.activo IS 'FALSE si el pueblo deja de usar Claxon (no se borra para conservar el histórico).';


-- =============================================================================
-- 2. USUARIOS Y SEGURIDAD
-- =============================================================================

CREATE TABLE usuario (
    id                BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email             VARCHAR(150),
    telefono          VARCHAR(20),
    password_hash     VARCHAR(100)  NOT NULL,
    nombre            VARCHAR(80)   NOT NULL,
    apellidos         VARCHAR(120),
    tamano_texto      VARCHAR(12)   NOT NULL DEFAULT 'GRANDE'
                      CHECK (tamano_texto IN ('NORMAL', 'GRANDE', 'MUY_GRANDE')),
    alto_contraste    BOOLEAN       NOT NULL DEFAULT FALSE,
    idioma            VARCHAR(5)    NOT NULL DEFAULT 'es',
    email_verificado  BOOLEAN       NOT NULL DEFAULT FALSE,
    activo            BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_alta        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ultimo_acceso     TIMESTAMPTZ,
    fecha_baja        TIMESTAMPTZ,
    CONSTRAINT ck_usuario_contacto CHECK (email IS NOT NULL OR telefono IS NOT NULL),
    CONSTRAINT ck_usuario_email    CHECK (email IS NULL OR email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
    CONSTRAINT ck_usuario_baja     CHECK (fecha_baja IS NULL OR activo = FALSE)
);
-- El email y el teléfono no se pueden repetir (sin distinguir mayúsculas en el email)
CREATE UNIQUE INDEX uq_usuario_email    ON usuario (lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX uq_usuario_telefono ON usuario (telefono)     WHERE telefono IS NOT NULL;

COMMENT ON TABLE  usuario               IS 'Cuenta para entrar en la app o en el panel web. Un usuario puede tener varios roles.';
COMMENT ON COLUMN usuario.telefono      IS 'Alternativa al email: muchas personas mayores no usan correo.';
COMMENT ON COLUMN usuario.password_hash IS 'Hash BCrypt de la contraseña (nunca la contraseña en claro).';
COMMENT ON COLUMN usuario.tamano_texto  IS 'Preferencia de accesibilidad. Por defecto GRANDE.';

CREATE TABLE rol (
    id           SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo       VARCHAR(20)  NOT NULL UNIQUE
                 CHECK (codigo IN ('VECINO', 'FAMILIAR', 'VENDEDOR', 'AYUNTAMIENTO', 'ADMIN')),
    nombre       VARCHAR(40)  NOT NULL,
    descripcion  VARCHAR(200)
);
COMMENT ON TABLE rol IS 'Perfiles de la aplicación. Se usan en Spring Security como ROLE_<codigo>.';

CREATE TABLE usuario_rol (
    usuario_id        BIGINT       NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    rol_id            SMALLINT     NOT NULL REFERENCES rol (id),
    fecha_asignacion  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, rol_id)
);
COMMENT ON TABLE usuario_rol IS 'Relación N:M: un vendedor también puede ser vecino de su pueblo, por ejemplo.';

CREATE TABLE token_refresco (
    id                BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id        BIGINT        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    token_hash        CHAR(64)      NOT NULL UNIQUE,
    fecha_creacion    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_expiracion  TIMESTAMPTZ   NOT NULL,
    revocado          BOOLEAN       NOT NULL DEFAULT FALSE,
    agente_usuario    VARCHAR(200),
    CONSTRAINT ck_token_fechas CHECK (fecha_expiracion > fecha_creacion)
);
COMMENT ON TABLE  token_refresco            IS 'Tokens de refresco del JWT. Permite cerrar sesión en un dispositivo concreto.';
COMMENT ON COLUMN token_refresco.token_hash IS 'SHA-256 del token en hexadecimal (64 caracteres).';

CREATE TABLE dispositivo (
    id              BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id      BIGINT        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    token_push      VARCHAR(255)  NOT NULL UNIQUE,
    plataforma      VARCHAR(10)   NOT NULL CHECK (plataforma IN ('ANDROID', 'IOS', 'WEB')),
    modelo          VARCHAR(80),
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_registro  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ultimo_uso      TIMESTAMPTZ
);
COMMENT ON TABLE  dispositivo            IS 'Móviles de cada usuario donde se envían las notificaciones push.';
COMMENT ON COLUMN dispositivo.token_push IS 'Token de registro de Firebase Cloud Messaging.';


-- =============================================================================
-- 3. VECINOS Y FAMILIAS
-- =============================================================================

CREATE TABLE vecino (
    id                       BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id               BIGINT        UNIQUE REFERENCES usuario (id) ON DELETE SET NULL,
    municipio_id             INTEGER       NOT NULL REFERENCES municipio (id),
    nombre                   VARCHAR(80)   NOT NULL,
    apellidos                VARCHAR(120),
    telefono                 VARCHAR(20),
    direccion                VARCHAR(200),
    necesita_ayuda_entrega   BOOLEAN       NOT NULL DEFAULT FALSE,
    notas_entrega            VARCHAR(300),
    activo                   BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_alta               TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE  vecino                        IS 'Persona que vive en el pueblo. Puede NO tener cuenta: en ese caso la gestiona un familiar.';
COMMENT ON COLUMN vecino.usuario_id             IS 'NULL si el vecino no usa la app (lo gestiona un familiar).';
COMMENT ON COLUMN vecino.necesita_ayuda_entrega IS 'Movilidad reducida: el vendedor se lo acerca a casa si puede.';
COMMENT ON COLUMN vecino.notas_entrega          IS 'Indicaciones para el vendedor. Nunca datos de salud.';

CREATE TABLE familiar_vecino (
    familiar_usuario_id  BIGINT        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    vecino_id            BIGINT        NOT NULL REFERENCES vecino (id)  ON DELETE CASCADE,
    parentesco           VARCHAR(30)   NOT NULL,
    puede_hacer_encargos BOOLEAN       NOT NULL DEFAULT TRUE,
    recibe_avisos        BOOLEAN       NOT NULL DEFAULT TRUE,
    estado               VARCHAR(10)   NOT NULL DEFAULT 'PENDIENTE'
                         CHECK (estado IN ('PENDIENTE', 'ACEPTADA', 'RECHAZADA', 'REVOCADA')),
    codigo_invitacion    CHAR(6),
    fecha_solicitud      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_respuesta      TIMESTAMPTZ,
    PRIMARY KEY (familiar_usuario_id, vecino_id),
    CONSTRAINT ck_familiar_respuesta CHECK (estado = 'PENDIENTE' OR fecha_respuesta IS NOT NULL)
);
COMMENT ON TABLE  familiar_vecino                   IS 'Familiares que ayudan a un vecino desde fuera del pueblo.';
COMMENT ON COLUMN familiar_vecino.codigo_invitacion IS 'Código de 6 caracteres para vincularse sin compartir contraseñas.';


-- =============================================================================
-- 4. VENDEDORES Y CATÁLOGO
-- =============================================================================

CREATE TABLE categoria_servicio (
    id      SMALLINT     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo  VARCHAR(20)  NOT NULL UNIQUE,
    nombre  VARCHAR(40)  NOT NULL,
    icono   VARCHAR(40)  NOT NULL,
    color   CHAR(7)      CHECK (color ~ '^#[0-9A-Fa-f]{6}$')
);
COMMENT ON TABLE  categoria_servicio       IS 'Tipos de servicio ambulante: pan, pescado, fruta, carne...';
COMMENT ON COLUMN categoria_servicio.icono IS 'Nombre del icono en la app (p. ej. "croissant" de Lucide).';

CREATE TABLE vendedor (
    id                        BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id                BIGINT        NOT NULL UNIQUE REFERENCES usuario (id),
    nombre_comercial          VARCHAR(120)  NOT NULL,
    nif                       VARCHAR(9)    UNIQUE,
    telefono_contacto         VARCHAR(20),
    descripcion               VARCHAR(400),
    municipio_base_id         INTEGER       REFERENCES municipio (id),
    acepta_encargos           BOOLEAN       NOT NULL DEFAULT TRUE,
    horas_antelacion_encargo  SMALLINT      NOT NULL DEFAULT 12 CHECK (horas_antelacion_encargo BETWEEN 0 AND 72),
    activo                    BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_alta                TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE  vendedor                          IS 'Negocio ambulante (panadería, pescadería...).';
COMMENT ON COLUMN vendedor.municipio_base_id        IS 'Pueblo desde el que sale el vendedor.';
COMMENT ON COLUMN vendedor.horas_antelacion_encargo IS 'Horas mínimas antes del reparto para aceptar un encargo.';

CREATE TABLE vendedor_categoria (
    vendedor_id   BIGINT    NOT NULL REFERENCES vendedor (id) ON DELETE CASCADE,
    categoria_id  SMALLINT  NOT NULL REFERENCES categoria_servicio (id),
    PRIMARY KEY (vendedor_id, categoria_id)
);
COMMENT ON TABLE vendedor_categoria IS 'Un vendedor puede ofrecer varias categorías (p. ej. pan y bollería, fruta y verdura).';

CREATE TABLE producto (
    id              BIGINT         GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vendedor_id     BIGINT         NOT NULL REFERENCES vendedor (id) ON DELETE CASCADE,
    categoria_id    SMALLINT       REFERENCES categoria_servicio (id),
    nombre          VARCHAR(100)   NOT NULL,
    descripcion     VARCHAR(300),
    precio          NUMERIC(8,2)   CHECK (precio >= 0),
    unidad          VARCHAR(10)    NOT NULL DEFAULT 'UNIDAD'
                    CHECK (unidad IN ('UNIDAD', 'KG', 'GRAMOS', 'DOCENA', 'LITRO', 'PAQUETE', 'BANDEJA')),
    disponible      BOOLEAN        NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMPTZ    NOT NULL DEFAULT now(),
    CONSTRAINT uq_producto_nombre UNIQUE (vendedor_id, nombre)
);
COMMENT ON TABLE  producto        IS 'Catálogo opcional del vendedor. Si no tiene, los encargos se hacen con texto libre.';
COMMENT ON COLUMN producto.precio IS 'Orientativo. NULL = "según peso" o "consultar".';


-- =============================================================================
-- 5. RUTAS
-- =============================================================================

CREATE TABLE ruta (
    id                    BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vendedor_id           BIGINT        NOT NULL REFERENCES vendedor (id) ON DELETE CASCADE,
    nombre                VARCHAR(100)  NOT NULL,
    descripcion           VARCHAR(300),
    hora_salida_prevista  TIME          NOT NULL,
    activa                BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_creacion        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_ruta_nombre UNIQUE (vendedor_id, nombre)
);
COMMENT ON TABLE ruta IS 'Plantilla de recorrido habitual de un vendedor (qué pueblos y en qué orden).';

CREATE TABLE ruta_dia (
    ruta_id     BIGINT    NOT NULL REFERENCES ruta (id) ON DELETE CASCADE,
    dia_semana  SMALLINT  NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    PRIMARY KEY (ruta_id, dia_semana)
);
COMMENT ON TABLE  ruta_dia            IS 'Días de la semana en que se hace la ruta.';
COMMENT ON COLUMN ruta_dia.dia_semana IS 'ISO 8601: 1 = lunes ... 7 = domingo (igual que DayOfWeek de Java).';

CREATE TABLE parada (
    id                     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ruta_id                BIGINT        NOT NULL REFERENCES ruta (id) ON DELETE CASCADE,
    municipio_id           INTEGER       NOT NULL REFERENCES municipio (id),
    orden                  SMALLINT      NOT NULL CHECK (orden >= 1),
    punto_encuentro        VARCHAR(100)  NOT NULL DEFAULT 'Plaza',
    minutos_desde_salida   SMALLINT      NOT NULL CHECK (minutos_desde_salida >= 0),
    duracion_estimada_min  SMALLINT      NOT NULL DEFAULT 10 CHECK (duracion_estimada_min > 0),
    latitud                NUMERIC(9,6),
    longitud               NUMERIC(9,6),
    activa                 BOOLEAN       NOT NULL DEFAULT TRUE,
    -- DEFERRABLE permite reordenar paradas dentro de una transacción
    CONSTRAINT uq_parada_orden UNIQUE (ruta_id, orden) DEFERRABLE INITIALLY IMMEDIATE
);
COMMENT ON TABLE  parada                      IS 'Punto donde para el vendedor en cada pueblo de la ruta.';
COMMENT ON COLUMN parada.minutos_desde_salida IS 'Base de la hora estimada: salida real + estos minutos (no hay GPS en tiempo real).';

CREATE TABLE jornada (
    id                  BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ruta_id             BIGINT        NOT NULL REFERENCES ruta (id),
    fecha               DATE          NOT NULL,
    estado              VARCHAR(12)   NOT NULL DEFAULT 'PROGRAMADA'
                        CHECK (estado IN ('PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA')),
    hora_inicio_real    TIMESTAMPTZ,
    hora_fin_real       TIMESTAMPTZ,
    retraso_minutos     SMALLINT      NOT NULL DEFAULT 0 CHECK (retraso_minutos BETWEEN -120 AND 600),
    motivo_cancelacion  VARCHAR(200),
    fecha_creacion      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_jornada UNIQUE (ruta_id, fecha),
    CONSTRAINT ck_jornada_inicio   CHECK (estado NOT IN ('EN_CURSO', 'FINALIZADA') OR hora_inicio_real IS NOT NULL),
    CONSTRAINT ck_jornada_fin      CHECK (estado <> 'FINALIZADA' OR hora_fin_real IS NOT NULL),
    CONSTRAINT ck_jornada_orden    CHECK (hora_fin_real IS NULL OR hora_fin_real >= hora_inicio_real),
    CONSTRAINT ck_jornada_cancelar CHECK (estado <> 'CANCELADA' OR motivo_cancelacion IS NOT NULL)
);
COMMENT ON TABLE  jornada                 IS 'Una ruta en un día concreto. Se crea al pulsar «Iniciar ruta» o la genera una tarea programada.';
COMMENT ON COLUMN jornada.retraso_minutos IS 'Retraso que indica el vendedor durante el recorrido; desplaza todas las horas estimadas.';

CREATE TABLE paso_parada (
    id                BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jornada_id        BIGINT       NOT NULL REFERENCES jornada (id) ON DELETE CASCADE,
    parada_id         BIGINT       NOT NULL REFERENCES parada (id),
    hora_estimada     TIMESTAMPTZ  NOT NULL,
    hora_llegada_real TIMESTAMPTZ,
    hora_salida_real  TIMESTAMPTZ,
    estado            VARCHAR(12)  NOT NULL DEFAULT 'PENDIENTE'
                      CHECK (estado IN ('PENDIENTE', 'EN_PARADA', 'COMPLETADO', 'OMITIDO', 'CANCELADO')),
    CONSTRAINT uq_paso_parada UNIQUE (jornada_id, parada_id),
    CONSTRAINT ck_paso_llegada CHECK (estado NOT IN ('EN_PARADA', 'COMPLETADO') OR hora_llegada_real IS NOT NULL),
    CONSTRAINT ck_paso_orden   CHECK (hora_salida_real IS NULL OR hora_salida_real >= hora_llegada_real)
);
COMMENT ON TABLE  paso_parada               IS 'Paso del vendedor por cada parada en una jornada. Aquí vive la hora estimada que ve el vecino.';
COMMENT ON COLUMN paso_parada.hora_estimada IS 'Calculada por el servidor: inicio real + minutos_desde_salida + retraso.';


-- =============================================================================
-- 6. SUSCRIPCIONES Y ENCARGOS
-- =============================================================================

CREATE TABLE suscripcion (
    id                  BIGINT       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vecino_id           BIGINT       NOT NULL REFERENCES vecino (id)   ON DELETE CASCADE,
    vendedor_id         BIGINT       NOT NULL REFERENCES vendedor (id) ON DELETE CASCADE,
    parada_id           BIGINT       REFERENCES parada (id) ON DELETE SET NULL,
    minutos_antelacion  SMALLINT     NOT NULL DEFAULT 15 CHECK (minutos_antelacion BETWEEN 5 AND 120),
    activa              BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_suscripcion UNIQUE (vecino_id, vendedor_id)
);
COMMENT ON TABLE  suscripcion                    IS 'Qué vendedores quiere que le avisen a cada vecino y con cuánta antelación.';
COMMENT ON COLUMN suscripcion.parada_id          IS 'Parada preferida si el vendedor para en varios sitios del pueblo.';
COMMENT ON COLUMN suscripcion.minutos_antelacion IS 'Por defecto 15 minutos antes de la hora estimada.';

CREATE TABLE encargo (
    id                     BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vecino_id              BIGINT        NOT NULL REFERENCES vecino (id),
    vendedor_id            BIGINT        NOT NULL REFERENCES vendedor (id),
    parada_id              BIGINT        NOT NULL REFERENCES parada (id),
    fecha_entrega          DATE          NOT NULL,
    estado                 VARCHAR(12)   NOT NULL DEFAULT 'PENDIENTE'
                           CHECK (estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARADO', 'ENTREGADO',
                                             'NO_RECOGIDO', 'RECHAZADO', 'CANCELADO')),
    creado_por_usuario_id  BIGINT        NOT NULL REFERENCES usuario (id),
    entrega_a_domicilio    BOOLEAN       NOT NULL DEFAULT FALSE,
    notas                  VARCHAR(300),
    motivo_rechazo         VARCHAR(200),
    importe_total          NUMERIC(8,2)  CHECK (importe_total >= 0),
    fecha_creacion         TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_actualizacion    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_encargo_rechazo CHECK (estado <> 'RECHAZADO' OR motivo_rechazo IS NOT NULL)
);
COMMENT ON TABLE  encargo                       IS 'Pedido que el vecino deja hecho para recoger cuando pase el vendedor. El pago es en mano.';
COMMENT ON COLUMN encargo.parada_id             IS 'Dónde se recoge. Con fecha_entrega identifica el paso_parada (ruta de la parada + fecha).';
COMMENT ON COLUMN encargo.creado_por_usuario_id IS 'El propio vecino o un familiar en su nombre.';
COMMENT ON COLUMN encargo.importe_total         IS 'Lo rellena el vendedor al prepararlo (los productos a peso varían).';

CREATE TABLE linea_encargo (
    id               BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    encargo_id       BIGINT        NOT NULL REFERENCES encargo (id) ON DELETE CASCADE,
    producto_id      BIGINT        REFERENCES producto (id) ON DELETE SET NULL,
    descripcion      VARCHAR(150)  NOT NULL,
    cantidad         NUMERIC(7,2)  NOT NULL CHECK (cantidad > 0),
    unidad           VARCHAR(10)   NOT NULL DEFAULT 'UNIDAD'
                     CHECK (unidad IN ('UNIDAD', 'KG', 'GRAMOS', 'DOCENA', 'LITRO', 'PAQUETE', 'BANDEJA')),
    precio_unitario  NUMERIC(8,2)  CHECK (precio_unitario >= 0)
);
COMMENT ON TABLE  linea_encargo             IS 'Cada producto del encargo.';
COMMENT ON COLUMN linea_encargo.descripcion IS 'Copia del nombre del producto o texto libre ("1 hogaza poco hecha").';

CREATE TABLE historial_encargo (
    id               BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    encargo_id       BIGINT        NOT NULL REFERENCES encargo (id) ON DELETE CASCADE,
    estado_anterior  VARCHAR(12),
    estado_nuevo     VARCHAR(12)   NOT NULL,
    usuario_id       BIGINT        REFERENCES usuario (id) ON DELETE SET NULL,
    comentario       VARCHAR(200),
    fecha            TIMESTAMPTZ   NOT NULL DEFAULT now()
);
COMMENT ON TABLE historial_encargo IS 'Trazabilidad de los cambios de estado de cada encargo (se rellena con un trigger).';


-- =============================================================================
-- 7. AYUNTAMIENTO Y SALUD
-- =============================================================================

CREATE TABLE gestor_municipal (
    usuario_id    BIGINT       NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    municipio_id  INTEGER      NOT NULL REFERENCES municipio (id),
    cargo         VARCHAR(60)  NOT NULL,
    fecha_alta    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (usuario_id, municipio_id)
);
COMMENT ON TABLE gestor_municipal IS 'Personas del ayuntamiento que publican avisos. N:M porque un secretario suele llevar varios pueblos.';

CREATE TABLE centro_salud (
    id            INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    municipio_id  INTEGER       NOT NULL REFERENCES municipio (id),
    nombre        VARCHAR(120)  NOT NULL,
    direccion     VARCHAR(200),
    telefono      VARCHAR(20)
);
COMMENT ON TABLE centro_salud IS 'Centro de salud de referencia de la zona (p. ej. Utrillas).';

CREATE TABLE consulta_medica (
    id               BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    municipio_id     INTEGER       NOT NULL REFERENCES municipio (id),
    centro_salud_id  INTEGER       REFERENCES centro_salud (id),
    tipo             VARCHAR(15)   NOT NULL DEFAULT 'MEDICINA'
                     CHECK (tipo IN ('MEDICINA', 'ENFERMERIA', 'PEDIATRIA', 'EXTRACCIONES')),
    dia_semana       SMALLINT      NOT NULL CHECK (dia_semana BETWEEN 1 AND 7),
    hora_inicio      TIME          NOT NULL,
    hora_fin         TIME          NOT NULL,
    lugar            VARCHAR(120)  NOT NULL DEFAULT 'Consultorio local',
    activa           BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_consulta_horas CHECK (hora_fin > hora_inicio)
);
COMMENT ON TABLE consulta_medica IS 'Horario semanal habitual de consulta en el pueblo. Sin datos clínicos.';

CREATE TABLE aviso (
    id                BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    autor_usuario_id  BIGINT        NOT NULL REFERENCES usuario (id),
    categoria         VARCHAR(20)   NOT NULL DEFAULT 'GENERAL'
                      CHECK (categoria IN ('GENERAL', 'SANIDAD', 'SUMINISTROS', 'TRAMITES',
                                           'FIESTAS', 'TRANSPORTE', 'EMERGENCIA')),
    titulo            VARCHAR(120)  NOT NULL,
    contenido         TEXT          NOT NULL,
    prioridad         VARCHAR(10)   NOT NULL DEFAULT 'NORMAL'
                      CHECK (prioridad IN ('NORMAL', 'IMPORTANTE', 'URGENTE')),
    estado            VARCHAR(10)   NOT NULL DEFAULT 'BORRADOR'
                      CHECK (estado IN ('BORRADOR', 'PUBLICADO', 'ARCHIVADO')),
    enviar_push       BOOLEAN       NOT NULL DEFAULT TRUE,
    visible_desde     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    visible_hasta     TIMESTAMPTZ,
    fecha_creacion    TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_publicacion TIMESTAMPTZ,
    CONSTRAINT ck_aviso_visibilidad CHECK (visible_hasta IS NULL OR visible_hasta > visible_desde),
    CONSTRAINT ck_aviso_publicado   CHECK (estado = 'BORRADOR' OR fecha_publicacion IS NOT NULL)
);
COMMENT ON TABLE aviso IS 'Avisos del ayuntamiento (cortes de agua, cambios de consulta, fiestas...).';

CREATE TABLE aviso_municipio (
    aviso_id      BIGINT   NOT NULL REFERENCES aviso (id) ON DELETE CASCADE,
    municipio_id  INTEGER  NOT NULL REFERENCES municipio (id),
    PRIMARY KEY (aviso_id, municipio_id)
);
COMMENT ON TABLE aviso_municipio IS 'Un aviso puede ir a varios pueblos a la vez (p. ej. toda la comarca).';

CREATE TABLE incidencia_consulta (
    id                       BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    consulta_id              BIGINT        NOT NULL REFERENCES consulta_medica (id) ON DELETE CASCADE,
    fecha                    DATE          NOT NULL,
    tipo                     VARCHAR(15)   NOT NULL
                             CHECK (tipo IN ('CANCELADA', 'CAMBIO_HORARIO', 'CAMBIO_LUGAR')),
    hora_inicio_nueva        TIME,
    hora_fin_nueva           TIME,
    lugar_alternativo        VARCHAR(120),
    centro_alternativo_id    INTEGER       REFERENCES centro_salud (id),
    motivo                   VARCHAR(200),
    aviso_id                 BIGINT        REFERENCES aviso (id) ON DELETE SET NULL,
    publicado_por_usuario_id BIGINT        NOT NULL REFERENCES usuario (id),
    fecha_publicacion        TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uq_incidencia UNIQUE (consulta_id, fecha),
    CONSTRAINT ck_incidencia_horario CHECK (
        tipo <> 'CAMBIO_HORARIO'
        OR (hora_inicio_nueva IS NOT NULL AND hora_fin_nueva IS NOT NULL AND hora_fin_nueva > hora_inicio_nueva)),
    CONSTRAINT ck_incidencia_lugar CHECK (
        tipo <> 'CAMBIO_LUGAR' OR lugar_alternativo IS NOT NULL OR centro_alternativo_id IS NOT NULL)
);
COMMENT ON TABLE  incidencia_consulta        IS 'Cambio puntual de una consulta: "Hoy no hay consulta, id a Utrillas".';
COMMENT ON COLUMN incidencia_consulta.motivo IS 'Motivo genérico (vacaciones, formación). Nunca información clínica.';
COMMENT ON COLUMN incidencia_consulta.aviso_id IS 'Aviso que se generó automáticamente al publicar la incidencia.';


-- =============================================================================
-- 8. NOTIFICACIONES Y TABLÓN
-- =============================================================================

CREATE TABLE notificacion (
    id                   BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id           BIGINT        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    vecino_id            BIGINT        REFERENCES vecino (id) ON DELETE CASCADE,
    tipo                 VARCHAR(25)   NOT NULL
                         CHECK (tipo IN ('LLEGADA_PROXIMA', 'VENDEDOR_EN_PARADA', 'RUTA_RETRASADA',
                                         'RUTA_CANCELADA', 'ENCARGO_ACTUALIZADO', 'AVISO_MUNICIPAL',
                                         'CAMBIO_CONSULTA', 'NUEVO_ENCARGO', 'SOLICITUD_FAMILIAR')),
    titulo               VARCHAR(120)  NOT NULL,
    cuerpo               VARCHAR(400)  NOT NULL,
    paso_parada_id       BIGINT        REFERENCES paso_parada (id) ON DELETE CASCADE,
    encargo_id           BIGINT        REFERENCES encargo (id) ON DELETE CASCADE,
    aviso_id             BIGINT        REFERENCES aviso (id) ON DELETE CASCADE,
    clave_deduplicacion  VARCHAR(150)  NOT NULL UNIQUE,
    estado               VARCHAR(10)   NOT NULL DEFAULT 'PENDIENTE'
                         CHECK (estado IN ('PENDIENTE', 'ENVIADA', 'FALLIDA', 'LEIDA')),
    intentos             SMALLINT      NOT NULL DEFAULT 0 CHECK (intentos >= 0),
    ultimo_error         VARCHAR(300),
    fecha_programada     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_envio          TIMESTAMPTZ,
    fecha_lectura        TIMESTAMPTZ
);
COMMENT ON TABLE  notificacion                     IS 'Bandeja de avisos de cada usuario y registro de lo enviado por FCM.';
COMMENT ON COLUMN notificacion.vecino_id           IS 'De quién trata el aviso (si lo recibe un familiar, es el vecino al que ayuda).';
COMMENT ON COLUMN notificacion.clave_deduplicacion IS 'Garantiza "un solo aviso, sin duplicados". Ej.: LLEGADA_PROXIMA:<paso_parada>:<usuario>.';

CREATE TABLE pantalla_tablon (
    id             INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    municipio_id   INTEGER       NOT NULL REFERENCES municipio (id),
    nombre         VARCHAR(80)   NOT NULL,
    ubicacion      VARCHAR(120),
    token_hash     CHAR(64)      NOT NULL UNIQUE,
    activa         BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_alta     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ultimo_acceso  TIMESTAMPTZ
);
COMMENT ON TABLE  pantalla_tablon            IS 'Pantallas del tablón web (bar, local social). Entran con un enlace secreto, sin usuario.';
COMMENT ON COLUMN pantalla_tablon.token_hash IS 'SHA-256 del token del enlace del tablón.';


-- =============================================================================
-- ÍNDICES (PostgreSQL no crea índices en las claves ajenas automáticamente)
-- =============================================================================

CREATE INDEX ix_municipio_comarca        ON municipio (comarca_id);
CREATE INDEX ix_usuario_rol_rol          ON usuario_rol (rol_id);
CREATE INDEX ix_token_usuario            ON token_refresco (usuario_id) WHERE revocado = FALSE;
CREATE INDEX ix_dispositivo_usuario      ON dispositivo (usuario_id) WHERE activo;
CREATE INDEX ix_vecino_municipio         ON vecino (municipio_id);
CREATE INDEX ix_familiar_vecino_vecino   ON familiar_vecino (vecino_id);
CREATE INDEX ix_producto_vendedor        ON producto (vendedor_id) WHERE disponible;
CREATE INDEX ix_ruta_vendedor            ON ruta (vendedor_id);
CREATE INDEX ix_parada_municipio         ON parada (municipio_id);
CREATE INDEX ix_jornada_fecha            ON jornada (fecha, estado);
CREATE INDEX ix_paso_parada_parada       ON paso_parada (parada_id);
CREATE INDEX ix_paso_parada_hora         ON paso_parada (hora_estimada) WHERE estado = 'PENDIENTE';
CREATE INDEX ix_suscripcion_vendedor     ON suscripcion (vendedor_id) WHERE activa;
CREATE INDEX ix_encargo_parada_fecha     ON encargo (parada_id, fecha_entrega);
CREATE INDEX ix_encargo_vecino           ON encargo (vecino_id, fecha_entrega DESC);
CREATE INDEX ix_encargo_vendedor_estado  ON encargo (vendedor_id, estado, fecha_entrega);
CREATE INDEX ix_linea_encargo_encargo    ON linea_encargo (encargo_id);
CREATE INDEX ix_historial_encargo        ON historial_encargo (encargo_id, fecha);
CREATE INDEX ix_gestor_municipio         ON gestor_municipal (municipio_id);
CREATE INDEX ix_consulta_municipio_dia   ON consulta_medica (municipio_id, dia_semana) WHERE activa;
CREATE INDEX ix_incidencia_fecha         ON incidencia_consulta (fecha);
CREATE INDEX ix_aviso_estado_fechas      ON aviso (estado, visible_desde, visible_hasta);
CREATE INDEX ix_aviso_municipio_mun      ON aviso_municipio (municipio_id);
CREATE INDEX ix_notificacion_bandeja     ON notificacion (usuario_id, fecha_programada DESC);
CREATE INDEX ix_notificacion_pendiente   ON notificacion (fecha_programada) WHERE estado = 'PENDIENTE';
CREATE INDEX ix_pantalla_municipio       ON pantalla_tablon (municipio_id);


-- =============================================================================
-- TRIGGERS DE INTEGRIDAD
-- (reglas que cruzan varias tablas y no se pueden expresar con un CHECK)
-- =============================================================================

-- La parada de un paso_parada tiene que ser de la misma ruta que la jornada
CREATE FUNCTION fn_validar_paso_parada() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM jornada j
        JOIN parada  p ON p.ruta_id = j.ruta_id
        WHERE j.id = NEW.jornada_id AND p.id = NEW.parada_id
    ) THEN
        RAISE EXCEPTION 'La parada % no pertenece a la ruta de la jornada %', NEW.parada_id, NEW.jornada_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER tg_paso_parada_validar
    BEFORE INSERT OR UPDATE OF jornada_id, parada_id ON paso_parada
    FOR EACH ROW EXECUTE FUNCTION fn_validar_paso_parada();

-- La parada de un encargo tiene que ser de una ruta del vendedor del encargo
CREATE FUNCTION fn_validar_encargo() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM parada p
        JOIN ruta   r ON r.id = p.ruta_id
        WHERE p.id = NEW.parada_id AND r.vendedor_id = NEW.vendedor_id
    ) THEN
        RAISE EXCEPTION 'La parada % no es de ninguna ruta del vendedor %', NEW.parada_id, NEW.vendedor_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER tg_encargo_validar
    BEFORE INSERT OR UPDATE OF parada_id, vendedor_id ON encargo
    FOR EACH ROW EXECUTE FUNCTION fn_validar_encargo();

-- La parada preferida de una suscripción tiene que ser del mismo vendedor
CREATE FUNCTION fn_validar_suscripcion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.parada_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
        FROM parada p
        JOIN ruta   r ON r.id = p.ruta_id
        WHERE p.id = NEW.parada_id AND r.vendedor_id = NEW.vendedor_id
    ) THEN
        RAISE EXCEPTION 'La parada % no es de ninguna ruta del vendedor %', NEW.parada_id, NEW.vendedor_id
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER tg_suscripcion_validar
    BEFORE INSERT OR UPDATE OF parada_id, vendedor_id ON suscripcion
    FOR EACH ROW EXECUTE FUNCTION fn_validar_suscripcion();

-- Un familiar no puede vincularse consigo mismo
CREATE FUNCTION fn_validar_familiar() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF EXISTS (SELECT 1 FROM vecino v WHERE v.id = NEW.vecino_id AND v.usuario_id = NEW.familiar_usuario_id) THEN
        RAISE EXCEPTION 'Un usuario no puede ser familiar de sí mismo'
            USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER tg_familiar_validar
    BEFORE INSERT OR UPDATE ON familiar_vecino
    FOR EACH ROW EXECUTE FUNCTION fn_validar_familiar();

-- Mantener fecha_actualizacion y guardar el historial de estados del encargo.
-- El backend puede indicar quién hizo el cambio con:  SET LOCAL claxon.usuario_id = '<id>';
CREATE FUNCTION fn_encargo_auditar() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    v_usuario BIGINT := NULLIF(current_setting('claxon.usuario_id', TRUE), '')::BIGINT;
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO historial_encargo (encargo_id, estado_anterior, estado_nuevo, usuario_id)
        VALUES (NEW.id, NULL, NEW.estado, COALESCE(v_usuario, NEW.creado_por_usuario_id));
    ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
        INSERT INTO historial_encargo (encargo_id, estado_anterior, estado_nuevo, usuario_id)
        VALUES (NEW.id, OLD.estado, NEW.estado, v_usuario);
    END IF;
    RETURN NULL;
END $$;

CREATE FUNCTION fn_tocar_fecha_actualizacion() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    NEW.fecha_actualizacion := now();
    RETURN NEW;
END $$;

CREATE TRIGGER tg_encargo_fecha_actualizacion
    BEFORE UPDATE ON encargo
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_fecha_actualizacion();

CREATE TRIGGER tg_encargo_historial
    AFTER INSERT OR UPDATE OF estado ON encargo
    FOR EACH ROW EXECUTE FUNCTION fn_encargo_auditar();


-- =============================================================================
-- VISTAS (consultas que usarán la API y el tablón)
-- =============================================================================

-- Texto legible de una cantidad: «×2», «0,5 kg», «1 docena», «2 paquetes»...
CREATE FUNCTION fn_formatear_cantidad(p_cantidad NUMERIC, p_unidad VARCHAR)
RETURNS TEXT LANGUAGE sql IMMUTABLE AS $$
    SELECT CASE p_unidad
        WHEN 'UNIDAD'  THEN '×' || n
        WHEN 'KG'      THEN n || ' kg'
        WHEN 'GRAMOS'  THEN n || ' g'
        WHEN 'LITRO'   THEN n || ' l'
        WHEN 'DOCENA'  THEN n || CASE WHEN p_cantidad = 1 THEN ' docena'  ELSE ' docenas'  END
        WHEN 'PAQUETE' THEN n || CASE WHEN p_cantidad = 1 THEN ' paquete' ELSE ' paquetes' END
        WHEN 'BANDEJA' THEN n || CASE WHEN p_cantidad = 1 THEN ' bandeja' ELSE ' bandejas' END
        ELSE n
    END
    FROM (SELECT replace(trim_scale(p_cantidad)::text, '.', ',') AS n) AS x
$$;

-- Servicios que pasan HOY por cada pueblo, con su hora estimada (pantalla "Hoy" y tablón)
CREATE VIEW v_servicios_hoy AS
SELECT
    m.id                         AS municipio_id,
    m.nombre                     AS municipio,
    pp.id                        AS paso_parada_id,
    v.id                         AS vendedor_id,
    v.nombre_comercial           AS vendedor,
    (SELECT string_agg(c.nombre, ', ' ORDER BY c.nombre)
       FROM vendedor_categoria vc JOIN categoria_servicio c ON c.id = vc.categoria_id
      WHERE vc.vendedor_id = v.id)                       AS categorias,
    p.punto_encuentro,
    pp.hora_estimada,
    pp.hora_llegada_real,
    pp.estado                    AS estado_paso,
    j.estado                     AS estado_jornada,
    j.retraso_minutos
FROM paso_parada pp
JOIN jornada  j ON j.id = pp.jornada_id
JOIN parada   p ON p.id = pp.parada_id
JOIN ruta     r ON r.id = j.ruta_id
JOIN vendedor v ON v.id = r.vendedor_id
JOIN municipio m ON m.id = p.municipio_id
WHERE j.fecha = (now() AT TIME ZONE 'Europe/Madrid')::date;

COMMENT ON VIEW v_servicios_hoy IS 'Qué servicios pasan hoy por cada pueblo y a qué hora estimada.';

-- Consultas médicas de HOY en cada pueblo, aplicando las incidencias
CREATE VIEW v_consultas_hoy AS
SELECT
    cm.id                AS consulta_id,
    m.id                 AS municipio_id,
    m.nombre             AS municipio,
    cm.tipo,
    COALESCE(ic.hora_inicio_nueva, cm.hora_inicio) AS hora_inicio,
    COALESCE(ic.hora_fin_nueva,    cm.hora_fin)    AS hora_fin,
    COALESCE(ic.lugar_alternativo, cs.nombre, cm.lugar) AS lugar,
    COALESCE(ic.tipo, 'NORMAL')                     AS situacion,
    ic.motivo
FROM consulta_medica cm
JOIN municipio m ON m.id = cm.municipio_id
LEFT JOIN incidencia_consulta ic
       ON ic.consulta_id = cm.id
      AND ic.fecha = (now() AT TIME ZONE 'Europe/Madrid')::date
LEFT JOIN centro_salud cs ON cs.id = ic.centro_alternativo_id
WHERE cm.activa
  AND cm.dia_semana = EXTRACT(ISODOW FROM (now() AT TIME ZONE 'Europe/Madrid'))::int;

COMMENT ON VIEW v_consultas_hoy IS 'Consulta médica de hoy por pueblo; situacion = NORMAL, CANCELADA, CAMBIO_HORARIO o CAMBIO_LUGAR.';

-- Avisos publicados y vigentes ahora mismo, por pueblo
CREATE VIEW v_avisos_vigentes AS
SELECT
    am.municipio_id,
    a.id AS aviso_id,
    a.categoria,
    a.prioridad,
    a.titulo,
    a.contenido,
    a.visible_desde,
    a.visible_hasta,
    a.fecha_publicacion
FROM aviso a
JOIN aviso_municipio am ON am.aviso_id = a.id
WHERE a.estado = 'PUBLICADO'
  AND a.visible_desde <= now()
  AND (a.visible_hasta IS NULL OR a.visible_hasta > now());

COMMENT ON VIEW v_avisos_vigentes IS 'Avisos del ayuntamiento que se deben mostrar ahora en cada pueblo.';

-- Encargos agrupados por parada y día: lo que ve el vendedor al pulsar «He llegado»
CREATE VIEW v_encargos_parada AS
SELECT
    e.id                      AS encargo_id,
    e.vendedor_id,
    e.parada_id,
    e.fecha_entrega,
    m.nombre                  AS municipio,
    p.punto_encuentro,
    trim(ve.nombre || ' ' || COALESCE(ve.apellidos, '')) AS vecino,
    ve.telefono               AS telefono_vecino,
    e.entrega_a_domicilio,
    ve.direccion,
    e.estado,
    e.notas,
    e.importe_total,
    (SELECT string_agg(l.descripcion || ' ' || fn_formatear_cantidad(l.cantidad, l.unidad),
                       ' · ' ORDER BY l.id)
       FROM linea_encargo l WHERE l.encargo_id = e.id) AS resumen
FROM encargo e
JOIN vecino    ve ON ve.id = e.vecino_id
JOIN parada    p  ON p.id = e.parada_id
JOIN municipio m  ON m.id = p.municipio_id;

COMMENT ON VIEW v_encargos_parada IS 'Encargos con el nombre del vecino y un resumen de productos, para la lista del vendedor.';

-- Quién debe recibir el aviso de llegada de cada paso_parada pendiente:
-- el propio vecino (si tiene cuenta) y sus familiares con recibe_avisos.
CREATE VIEW v_destinatarios_llegada AS
SELECT
    pp.id                                            AS paso_parada_id,
    s.vecino_id,
    dest.usuario_id,
    pp.hora_estimada - make_interval(mins => s.minutos_antelacion) AS hora_aviso,
    'LLEGADA_PROXIMA:' || pp.id || ':' || dest.usuario_id          AS clave_deduplicacion
FROM paso_parada pp
JOIN jornada     j  ON j.id = pp.jornada_id
JOIN parada      p  ON p.id = pp.parada_id
JOIN ruta        r  ON r.id = j.ruta_id
JOIN suscripcion s  ON s.vendedor_id = r.vendedor_id AND s.activa
JOIN vecino      ve ON ve.id = s.vecino_id AND ve.activo
                   AND ve.municipio_id = p.municipio_id
                   AND (s.parada_id IS NULL OR s.parada_id = p.id)
CROSS JOIN LATERAL (
    SELECT ve.usuario_id WHERE ve.usuario_id IS NOT NULL
    UNION
    SELECT fv.familiar_usuario_id
    FROM familiar_vecino fv
    WHERE fv.vecino_id = ve.id AND fv.estado = 'ACEPTADA' AND fv.recibe_avisos
) AS dest (usuario_id)
WHERE pp.estado = 'PENDIENTE'
  AND j.estado IN ('PROGRAMADA', 'EN_CURSO');

COMMENT ON VIEW v_destinatarios_llegada IS 'La usa la tarea programada: cada minuto busca filas con hora_aviso <= now() y crea la notificación (la clave evita duplicados).';
