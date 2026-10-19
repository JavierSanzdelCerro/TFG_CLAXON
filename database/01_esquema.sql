-- =============================================================================
--  CLAXON · El radar de lo que pasa por tu pueblo
--  Base de datos (PostgreSQL 16) · 10 tablas
--
--   Pueblos y personas ...... municipio, usuario, familiar
--   Vendedores .............. producto, parada, suscripcion
--   Encargos ................ encargo, linea_encargo
--   Ayuntamiento ............ consulta, aviso
--
--  Ideas clave:
--   · Todas las personas están en «usuario». Una misma persona (mismo teléfono
--     y contraseña) puede tener varios roles a la vez: vecino y familiar,
--     vendedor y vecino... Un vecino sin móvil es un usuario sin contraseña
--     que gestiona un familiar.
--   · La ruta del vendedor son sus paradas. Cada parada guarda además cómo va
--     HOY (hora estimada, llegada, estado): no hace falta otra tabla por día.
--   · Los estados son VARCHAR + CHECK (se mapean con @Enumerated(STRING) en JPA).
--   · Zona horaria de referencia: Europe/Madrid.
-- =============================================================================

SET client_encoding = 'UTF8';
SET timezone = 'Europe/Madrid';

DROP SCHEMA IF EXISTS claxon CASCADE;
CREATE SCHEMA claxon;
SET search_path TO claxon, public;

-- Zona horaria y esquema por defecto para cualquier conexión a esta base de datos
DO $$
BEGIN
    EXECUTE format('ALTER DATABASE %I SET timezone TO %L', current_database(), 'Europe/Madrid');
    EXECUTE format('ALTER DATABASE %I SET search_path TO claxon, public', current_database());
END $$;


-- =============================================================================
-- PUEBLOS Y PERSONAS
-- =============================================================================

CREATE TABLE municipio (
    id                 INTEGER       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre             VARCHAR(100)  NOT NULL UNIQUE,
    comarca            VARCHAR(80),
    provincia          VARCHAR(60)   NOT NULL DEFAULT 'Teruel',
    gestor_id          BIGINT,       -- clave ajena a usuario (se añade más abajo)
    tablon_ubicacion   VARCHAR(120),
    tablon_token_hash  CHAR(64)      UNIQUE,
    activo             BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT ck_municipio_tablon CHECK ((tablon_ubicacion IS NULL) = (tablon_token_hash IS NULL))
);
COMMENT ON TABLE  municipio                   IS 'Pueblos donde funciona Claxon.';
COMMENT ON COLUMN municipio.gestor_id         IS 'Persona del ayuntamiento que publica los avisos. Una secretaria puede llevar varios pueblos.';
COMMENT ON COLUMN municipio.tablon_token_hash IS 'SHA-256 del enlace secreto del tablón del bar. NULL si el pueblo no tiene tablón.';

-- ¿Una lista sin elementos repetidos? (se usa en el CHECK de los roles)
CREATE FUNCTION fn_sin_repetidos(lista TEXT[]) RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT cardinality(lista) = (SELECT count(DISTINCT x) FROM unnest(lista) AS x)
$$;

CREATE TABLE usuario (
    id                        BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    roles                     VARCHAR(15)[] NOT NULL DEFAULT ARRAY['VECINO']::VARCHAR(15)[],
    nombre                    VARCHAR(80)   NOT NULL,
    apellidos                 VARCHAR(120),
    email                     VARCHAR(150)  UNIQUE CHECK (email = lower(email)),
    telefono                  VARCHAR(20)   UNIQUE,
    password_hash             VARCHAR(100),
    municipio_id              INTEGER       REFERENCES municipio (id),
    -- Vecino
    direccion                 VARCHAR(200),
    necesita_ayuda_entrega    BOOLEAN       NOT NULL DEFAULT FALSE,
    notas_entrega             VARCHAR(300),
    codigo_familia            CHAR(6)       UNIQUE,
    -- Preferencias y móvil
    idioma                    VARCHAR(5)    NOT NULL DEFAULT 'es' CHECK (idioma ~ '^[a-z]{2}(-[A-Z]{2})?$'),
    tamano_texto              VARCHAR(12)   NOT NULL DEFAULT 'GRANDE'
                              CHECK (tamano_texto IN ('NORMAL', 'GRANDE', 'MUY_GRANDE')),
    alto_contraste            BOOLEAN       NOT NULL DEFAULT FALSE,
    token_push                VARCHAR(255),
    -- Vendedor
    nombre_comercial          VARCHAR(120),
    categoria                 VARCHAR(15)
                              CHECK (categoria IN ('PAN', 'PESCADO', 'FRUTA', 'CARNE', 'ULTRAMARINOS', 'OTROS')),
    dias_reparto              VARCHAR(7)    CHECK (dias_reparto ~ '^L?M?X?J?V?S?D?$'),
    hora_salida               TIME,
    acepta_encargos           BOOLEAN       NOT NULL DEFAULT TRUE,
    horas_antelacion_encargo  SMALLINT      NOT NULL DEFAULT 12 CHECK (horas_antelacion_encargo BETWEEN 0 AND 72),
    -- Control
    email_verificado          BOOLEAN       NOT NULL DEFAULT FALSE,
    activo                    BOOLEAN       NOT NULL DEFAULT TRUE,
    fecha_alta                TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ultimo_acceso             TIMESTAMPTZ,
    fecha_baja                TIMESTAMPTZ,

    CONSTRAINT ck_usuario_roles      CHECK (cardinality(roles) >= 1
                                            AND roles <@ ARRAY['VECINO', 'FAMILIAR', 'VENDEDOR', 'AYUNTAMIENTO', 'ADMIN']::VARCHAR(15)[]
                                            AND fn_sin_repetidos(roles::TEXT[])),
    CONSTRAINT ck_usuario_contacto   CHECK (password_hash IS NULL OR email IS NOT NULL OR telefono IS NOT NULL),
    CONSTRAINT ck_usuario_sin_cuenta CHECK (password_hash IS NOT NULL OR roles = ARRAY['VECINO']::VARCHAR(15)[]),
    CONSTRAINT ck_usuario_vecino     CHECK (NOT 'VECINO' = ANY (roles) OR municipio_id IS NOT NULL),
    CONSTRAINT ck_usuario_vendedor   CHECK (NOT 'VENDEDOR' = ANY (roles) OR (nombre_comercial IS NOT NULL AND categoria IS NOT NULL
                                                                         AND dias_reparto IS NOT NULL AND hora_salida IS NOT NULL)),
    CONSTRAINT ck_usuario_verificado CHECK (email IS NOT NULL OR NOT email_verificado),
    CONSTRAINT ck_usuario_baja       CHECK (fecha_baja IS NULL OR NOT activo)
);
COMMENT ON TABLE  usuario                IS 'Todas las personas: vecinos, familiares, vendedores, ayuntamiento y administración.';
COMMENT ON COLUMN usuario.roles          IS 'Uno o varios roles de la misma persona: VECINO, FAMILIAR, VENDEDOR, AYUNTAMIENTO, ADMIN.';
COMMENT ON COLUMN usuario.idioma         IS 'Idioma de la app (código ISO: es, ca, en...).';
COMMENT ON COLUMN usuario.email_verificado IS 'TRUE cuando la persona ha confirmado su correo con el enlace que se le envía.';
COMMENT ON COLUMN usuario.fecha_baja     IS 'Cuándo se dio de baja. La cuenta se desactiva, no se borra (se conservan sus encargos).';
COMMENT ON COLUMN usuario.password_hash  IS 'Hash BCrypt. NULL = vecino sin móvil que gestiona un familiar (no puede entrar).';
COMMENT ON COLUMN usuario.municipio_id   IS 'Vecino: dónde vive. Vendedor: desde dónde sale.';
COMMENT ON COLUMN usuario.codigo_familia IS 'Código de 6 caracteres que el vecino da a un familiar para vincularse.';
COMMENT ON COLUMN usuario.token_push     IS 'Token de Firebase Cloud Messaging del móvil.';
COMMENT ON COLUMN usuario.dias_reparto   IS 'Días de la ruta del vendedor: letras de LMXJVSD, por ejemplo «LMXJVS».';
COMMENT ON COLUMN usuario.hora_salida    IS 'Hora habitual a la que sale el vendedor.';

ALTER TABLE municipio
    ADD CONSTRAINT fk_municipio_gestor FOREIGN KEY (gestor_id) REFERENCES usuario (id) ON DELETE SET NULL;

CREATE TABLE familiar (
    familiar_id           BIGINT       NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    vecino_id             BIGINT       NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    parentesco            VARCHAR(30)  NOT NULL,
    puede_hacer_encargos  BOOLEAN      NOT NULL DEFAULT TRUE,
    recibe_avisos         BOOLEAN      NOT NULL DEFAULT TRUE,
    estado                VARCHAR(10)  NOT NULL DEFAULT 'PENDIENTE'
                          CHECK (estado IN ('PENDIENTE', 'ACEPTADO', 'RECHAZADO')),
    fecha_solicitud       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (familiar_id, vecino_id),
    CONSTRAINT ck_familiar_distinto CHECK (familiar_id <> vecino_id)
);
COMMENT ON TABLE familiar IS 'Quién ayuda a quién: un familiar puede ayudar a varios vecinos y un vecino tener varios familiares.';


-- =============================================================================
-- VENDEDORES
-- =============================================================================

CREATE TABLE producto (
    id           BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vendedor_id  BIGINT        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    nombre       VARCHAR(100)  NOT NULL,
    precio       NUMERIC(8,2)  CHECK (precio >= 0),
    unidad       VARCHAR(10)   NOT NULL DEFAULT 'UNIDAD'
                 CHECK (unidad IN ('UNIDAD', 'KG', 'DOCENA', 'PAQUETE', 'LITRO')),
    disponible   BOOLEAN       NOT NULL DEFAULT TRUE,
    CONSTRAINT uq_producto UNIQUE (vendedor_id, nombre)
);
COMMENT ON TABLE producto IS 'Catálogo del vendedor. Precio orientativo (NULL = según peso).';

CREATE TABLE parada (
    id                    BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vendedor_id           BIGINT        NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    municipio_id          INTEGER       NOT NULL REFERENCES municipio (id),
    orden                 SMALLINT      NOT NULL CHECK (orden >= 1),
    punto_encuentro       VARCHAR(100)  NOT NULL DEFAULT 'Plaza',
    minutos_desde_salida  SMALLINT      NOT NULL CHECK (minutos_desde_salida >= 0),
    -- Cómo va hoy (se sobrescribe cada día de reparto)
    fecha                 DATE,
    hora_estimada         TIMESTAMPTZ,
    hora_llegada          TIMESTAMPTZ,
    estado                VARCHAR(10)
                          CHECK (estado IN ('PREVISTA', 'EN_CAMINO', 'EN_PARADA', 'HECHA', 'CANCELADA')),
    -- DEFERRABLE permite reordenar paradas dentro de una transacción
    CONSTRAINT uq_parada_orden  UNIQUE (vendedor_id, orden) DEFERRABLE INITIALLY IMMEDIATE,
    CONSTRAINT ck_parada_dia    CHECK ((fecha IS NULL) = (estado IS NULL) AND (estado IS NULL OR hora_estimada IS NOT NULL)),
    CONSTRAINT ck_parada_llegada CHECK (estado NOT IN ('EN_PARADA', 'HECHA') OR hora_llegada IS NOT NULL)
);
COMMENT ON TABLE  parada                      IS 'Paradas de la ruta del vendedor, en orden, y cómo va cada una hoy.';
COMMENT ON COLUMN parada.minutos_desde_salida IS 'Hora estimada = salida + estos minutos (no hay GPS).';
COMMENT ON COLUMN parada.estado               IS 'PREVISTA: aún no ha salido · EN_CAMINO: ha salido · EN_PARADA: está allí · HECHA · CANCELADA.';

CREATE TABLE suscripcion (
    vecino_id           BIGINT    NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    vendedor_id         BIGINT    NOT NULL REFERENCES usuario (id) ON DELETE CASCADE,
    minutos_antelacion  SMALLINT  NOT NULL DEFAULT 15 CHECK (minutos_antelacion BETWEEN 5 AND 120),
    activa              BOOLEAN   NOT NULL DEFAULT TRUE,
    ultimo_aviso        DATE,
    PRIMARY KEY (vecino_id, vendedor_id),
    CONSTRAINT ck_suscripcion_distinto CHECK (vecino_id <> vendedor_id)
);
COMMENT ON TABLE  suscripcion              IS 'De qué vendedores quiere aviso cada vecino y con cuánta antelación.';
COMMENT ON COLUMN suscripcion.ultimo_aviso IS 'Día del último aviso de llegada. Si ya es hoy, no se vuelve a avisar (sin duplicados).';


-- =============================================================================
-- ENCARGOS
-- =============================================================================

CREATE TABLE encargo (
    id               BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    vecino_id        BIGINT        NOT NULL REFERENCES usuario (id),
    parada_id        BIGINT        NOT NULL REFERENCES parada (id),
    fecha_entrega    DATE          NOT NULL,
    estado           VARCHAR(12)   NOT NULL DEFAULT 'PENDIENTE'
                     CHECK (estado IN ('PENDIENTE', 'ACEPTADO', 'PREPARADO', 'ENTREGADO',
                                       'NO_RECOGIDO', 'RECHAZADO', 'CANCELADO')),
    creado_por_id    BIGINT        NOT NULL REFERENCES usuario (id),
    a_domicilio      BOOLEAN       NOT NULL DEFAULT FALSE,
    notas            VARCHAR(300),
    motivo_rechazo   VARCHAR(200),
    importe_total    NUMERIC(8,2)  CHECK (importe_total >= 0),
    fecha_creacion   TIMESTAMPTZ   NOT NULL DEFAULT now(),
    fecha_aceptado   TIMESTAMPTZ,
    fecha_preparado  TIMESTAMPTZ,
    fecha_entregado  TIMESTAMPTZ,
    CONSTRAINT ck_encargo_rechazo CHECK (estado <> 'RECHAZADO' OR motivo_rechazo IS NOT NULL)
);
COMMENT ON TABLE  encargo               IS 'Pedido para recoger cuando pase el vendedor. El vendedor es el de la parada. Se paga en mano.';
COMMENT ON COLUMN encargo.creado_por_id IS 'El propio vecino o un familiar en su nombre.';
COMMENT ON COLUMN encargo.importe_total IS 'Lo pone el vendedor al prepararlo (los productos a peso varían).';

CREATE TABLE linea_encargo (
    id               BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    encargo_id       BIGINT        NOT NULL REFERENCES encargo (id) ON DELETE CASCADE,
    producto_id      BIGINT        REFERENCES producto (id) ON DELETE SET NULL,
    descripcion      VARCHAR(150)  NOT NULL,
    cantidad         NUMERIC(7,2)  NOT NULL CHECK (cantidad > 0),
    unidad           VARCHAR(10)   NOT NULL DEFAULT 'UNIDAD'
                     CHECK (unidad IN ('UNIDAD', 'KG', 'DOCENA', 'PAQUETE', 'LITRO')),
    precio_unitario  NUMERIC(8,2)  CHECK (precio_unitario >= 0)
);
COMMENT ON TABLE  linea_encargo             IS 'Cada producto del encargo.';
COMMENT ON COLUMN linea_encargo.descripcion IS 'Copia del nombre del producto o texto libre («barra de centeno si hay»).';


-- =============================================================================
-- AYUNTAMIENTO
-- =============================================================================

CREATE TABLE consulta (
    id            BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    municipio_id  INTEGER       NOT NULL REFERENCES municipio (id),
    tipo          VARCHAR(12)   NOT NULL DEFAULT 'MEDICINA'
                  CHECK (tipo IN ('MEDICINA', 'ENFERMERIA', 'PEDIATRIA', 'EXTRACCIONES')),
    dia_semana    SMALLINT      CHECK (dia_semana BETWEEN 1 AND 7),
    fecha         DATE,
    hora_inicio   TIME          NOT NULL,
    hora_fin      TIME          NOT NULL,
    lugar         VARCHAR(120)  NOT NULL DEFAULT 'Consultorio local',
    cancelada     BOOLEAN       NOT NULL DEFAULT FALSE,
    motivo        VARCHAR(200),
    CONSTRAINT ck_consulta_tipo_fila CHECK ((dia_semana IS NULL) <> (fecha IS NULL)),
    CONSTRAINT ck_consulta_horas     CHECK (hora_fin > hora_inicio),
    CONSTRAINT ck_consulta_cancelar  CHECK (NOT cancelada OR fecha IS NOT NULL)
);
COMMENT ON TABLE  consulta            IS 'Horario de consulta médica. Con dia_semana es el horario habitual; con fecha, un cambio de ese día.';
COMMENT ON COLUMN consulta.dia_semana IS 'ISO 8601: 1 = lunes ... 7 = domingo (como DayOfWeek de Java).';
COMMENT ON COLUMN consulta.motivo     IS 'Motivo genérico del cambio. Nunca datos de salud.';

CREATE TABLE aviso (
    id             BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    municipio_id   INTEGER       REFERENCES municipio (id),
    autor_id       BIGINT        NOT NULL REFERENCES usuario (id),
    categoria      VARCHAR(12)   NOT NULL DEFAULT 'GENERAL'
                   CHECK (categoria IN ('GENERAL', 'SANIDAD', 'SUMINISTROS', 'TRAMITES', 'FIESTAS', 'TRANSPORTE')),
    titulo         VARCHAR(120)  NOT NULL,
    contenido      TEXT          NOT NULL,
    prioridad      VARCHAR(10)   NOT NULL DEFAULT 'NORMAL'
                   CHECK (prioridad IN ('NORMAL', 'IMPORTANTE', 'URGENTE')),
    estado         VARCHAR(10)   NOT NULL DEFAULT 'BORRADOR'
                   CHECK (estado IN ('BORRADOR', 'PUBLICADO', 'ARCHIVADO')),
    enviar_push    BOOLEAN       NOT NULL DEFAULT TRUE,
    push_enviado   TIMESTAMPTZ,
    visible_desde  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    visible_hasta  TIMESTAMPTZ,
    fecha_creacion TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_aviso_fechas CHECK (visible_hasta IS NULL OR visible_hasta > visible_desde)
);
COMMENT ON TABLE  aviso              IS 'Avisos del ayuntamiento. Si va a dos pueblos, se guarda una fila por pueblo.';
COMMENT ON COLUMN aviso.municipio_id IS 'NULL = para todos los pueblos.';
COMMENT ON COLUMN aviso.push_enviado IS 'Cuándo se mandó la notificación. Si ya tiene fecha, no se vuelve a mandar.';


-- =============================================================================
-- ÍNDICES (PostgreSQL no indexa solo las claves ajenas)
-- =============================================================================

CREATE INDEX ix_usuario_municipio  ON usuario (municipio_id);
CREATE INDEX ix_usuario_roles      ON usuario USING gin (roles);   -- WHERE roles @> ARRAY['VENDEDOR']
CREATE INDEX ix_familiar_vecino    ON familiar (vecino_id);
CREATE INDEX ix_parada_municipio   ON parada (municipio_id, fecha);
CREATE INDEX ix_suscripcion_vend   ON suscripcion (vendedor_id);
CREATE INDEX ix_encargo_parada     ON encargo (parada_id, fecha_entrega);
CREATE INDEX ix_encargo_vecino     ON encargo (vecino_id, fecha_entrega DESC);
CREATE INDEX ix_linea_encargo      ON linea_encargo (encargo_id);
CREATE INDEX ix_consulta_municipio ON consulta (municipio_id);
CREATE INDEX ix_aviso_municipio    ON aviso (municipio_id, estado);


-- =============================================================================
-- TRIGGER: apunta la hora de cada cambio de estado del encargo
-- (es lo que dibuja la línea de tiempo «Enviado → Aceptado → Preparado → Entregado»)
-- =============================================================================

CREATE FUNCTION fn_encargo_fechas() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.estado = 'ACEPTADO'  AND NEW.fecha_aceptado  IS NULL THEN NEW.fecha_aceptado  := now(); END IF;
    IF NEW.estado = 'PREPARADO' AND NEW.fecha_preparado IS NULL THEN NEW.fecha_preparado := now(); END IF;
    IF NEW.estado = 'ENTREGADO' AND NEW.fecha_entregado IS NULL THEN NEW.fecha_entregado := now(); END IF;
    RETURN NEW;
END $$;

CREATE TRIGGER tg_encargo_fechas
    BEFORE UPDATE OF estado ON encargo
    FOR EACH ROW EXECUTE FUNCTION fn_encargo_fechas();


-- =============================================================================
-- VISTAS (consultas ya hechas para la API y el tablón; no son tablas)
-- =============================================================================

-- Servicios que pasan HOY por cada pueblo (pantalla «Hoy» y tablón)
CREATE VIEW v_servicios_hoy AS
SELECT m.id               AS municipio_id,
       m.nombre           AS municipio,
       p.id               AS parada_id,
       v.id               AS vendedor_id,
       v.nombre_comercial AS vendedor,
       v.categoria,
       p.punto_encuentro,
       p.hora_estimada,
       p.hora_llegada,
       p.estado
FROM parada p
JOIN usuario   v ON v.id = p.vendedor_id
JOIN municipio m ON m.id = p.municipio_id
WHERE p.fecha = (now() AT TIME ZONE 'Europe/Madrid')::date;

-- Consulta médica de HOY en cada pueblo, con el cambio del día si lo hay
CREATE VIEW v_consultas_hoy AS
SELECT h.municipio_id,
       m.nombre                                  AS municipio,
       h.tipo,
       COALESCE(c.hora_inicio, h.hora_inicio)    AS hora_inicio,
       COALESCE(c.hora_fin,    h.hora_fin)       AS hora_fin,
       COALESCE(c.lugar,       h.lugar)          AS lugar,
       CASE WHEN c.id IS NULL THEN 'NORMAL'
            WHEN c.cancelada  THEN 'CANCELADA'
            ELSE 'CAMBIO' END                    AS situacion,
       c.motivo
FROM consulta h
JOIN municipio m ON m.id = h.municipio_id
LEFT JOIN consulta c ON c.municipio_id = h.municipio_id
                    AND c.tipo = h.tipo
                    AND c.fecha = (now() AT TIME ZONE 'Europe/Madrid')::date
WHERE h.dia_semana = EXTRACT(ISODOW FROM (now() AT TIME ZONE 'Europe/Madrid'))::int;

-- Avisos que se ven ahora en cada pueblo (los de municipio NULL salen en todos)
CREATE VIEW v_avisos_vigentes AS
SELECT m.id AS municipio_id, a.id AS aviso_id, a.categoria, a.prioridad, a.titulo, a.contenido,
       a.visible_desde, a.visible_hasta
FROM aviso a
JOIN municipio m ON a.municipio_id IS NULL OR a.municipio_id = m.id
WHERE a.estado = 'PUBLICADO'
  AND a.visible_desde <= now()
  AND (a.visible_hasta IS NULL OR a.visible_hasta > now());

-- Encargos con nombre del vecino y resumen, para el vendedor al llegar a la parada
CREATE VIEW v_encargos_parada AS
SELECT e.id AS encargo_id,
       p.vendedor_id,
       e.parada_id,
       e.fecha_entrega,
       m.nombre AS municipio,
       trim(u.nombre || ' ' || COALESCE(u.apellidos, '')) AS vecino,
       u.telefono,
       e.a_domicilio,
       u.direccion,
       e.estado,
       e.notas,
       e.importe_total,
       (SELECT string_agg(l.descripcion || ' ' ||
                          CASE l.unidad WHEN 'UNIDAD' THEN '×' || trim_scale(l.cantidad)
                                        ELSE replace(trim_scale(l.cantidad)::text, '.', ',') || ' ' || lower(l.unidad) END,
                          ' · ' ORDER BY l.id)
          FROM linea_encargo l WHERE l.encargo_id = e.id) AS resumen
FROM encargo e
JOIN parada    p ON p.id = e.parada_id
JOIN usuario   u ON u.id = e.vecino_id
JOIN municipio m ON m.id = p.municipio_id;

-- A quién hay que avisar de una llegada y a qué hora. La tarea programada la lee
-- cada minuto, manda el push al vecino y a sus familiares, y pone ultimo_aviso = hoy.
CREATE VIEW v_avisos_llegada AS
SELECT p.id                                                         AS parada_id,
       s.vecino_id,
       s.vendedor_id,
       p.hora_estimada - make_interval(mins => s.minutos_antelacion) AS hora_aviso,
       -- el vecino (si tiene cuenta) + sus familiares que reciben avisos
       array_remove(ARRAY[CASE WHEN ve.password_hash IS NOT NULL THEN ve.id END], NULL)
         || ARRAY(SELECT f.familiar_id FROM familiar f
                  WHERE f.vecino_id = ve.id AND f.estado = 'ACEPTADO' AND f.recibe_avisos) AS destinatarios
FROM parada p
JOIN suscripcion s  ON s.vendedor_id = p.vendedor_id AND s.activa
JOIN usuario     ve ON ve.id = s.vecino_id AND ve.activo AND ve.municipio_id = p.municipio_id
WHERE p.fecha = (now() AT TIME ZONE 'Europe/Madrid')::date
  AND p.estado IN ('PREVISTA', 'EN_CAMINO')
  AND s.ultimo_aviso IS DISTINCT FROM p.fecha;

COMMENT ON VIEW v_servicios_hoy   IS 'Qué vendedores pasan hoy por cada pueblo, a qué hora estimada y cómo van.';
COMMENT ON VIEW v_consultas_hoy   IS 'Consulta médica de hoy por pueblo; situacion = NORMAL, CAMBIO o CANCELADA.';
COMMENT ON VIEW v_avisos_vigentes IS 'Avisos del ayuntamiento que se ven ahora en cada pueblo.';
COMMENT ON VIEW v_encargos_parada IS 'Encargos con el nombre del vecino y un resumen de productos, para el vendedor.';
COMMENT ON VIEW v_avisos_llegada  IS 'A quién avisar de cada llegada y a qué hora (vecino y familiares). La lee la tarea programada.';
