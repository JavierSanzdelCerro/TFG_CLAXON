-- =============================================================================
--  CLAXON · Datos de demostración
--
--  Recrea el ejemplo de la presentación: la ruta del pan sale a las 9:45 de
--  Utrillas y pasa por Martín del Río (10:00), Fuenferrada (10:40), Segura de
--  los Baños (11:20) y La Hoz de la Vieja (12:00). El pescado llega a
--  Fuenferrada a las 12:15 y hoy la consulta de Fuenferrada se pasa en Utrillas.
--
--  Las fechas son relativas a CURRENT_DATE: «hoy» siempre es el día de carga.
--  Nombres de personas y negocios inventados.
--  Contraseña de TODOS los usuarios demo:  Claxon2026!
-- =============================================================================

SET client_encoding = 'UTF8';
SET timezone = 'Europe/Madrid';
SET search_path TO claxon, public;

BEGIN;

-- Pueblos (el gestor y el tablón se rellenan después de crear los usuarios) ----
INSERT INTO municipio (id, nombre, comarca) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Martín del Río',      'Cuencas Mineras'),
    (2, 'Fuenferrada',         'Cuencas Mineras'),
    (3, 'Segura de los Baños', 'Cuencas Mineras'),
    (4, 'La Hoz de la Vieja',  'Cuencas Mineras'),
    (5, 'Utrillas',            'Cuencas Mineras');

-- Usuarios -------------------------------------------------------------------
-- Hash BCrypt (coste 10) de «Claxon2026!»
INSERT INTO usuario (id, roles, nombre, apellidos, email, telefono, password_hash, municipio_id, direccion,
                     necesita_ayuda_entrega, notas_entrega, codigo_familia, tamano_texto, token_push, ultimo_acceso)
OVERRIDING SYSTEM VALUE VALUES
    ( 1, '{ADMIN}',        'Equipo',  'Claxon',         'admin@claxon.app',          NULL,        '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', NULL, NULL, FALSE, NULL, NULL, 'NORMAL', NULL, now() - interval '2 hours'),
    ( 2, '{VECINO}',       'María',   'Pérez Gascón',   NULL,                        '600111222', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 2, 'C/ Mayor, 12', FALSE, NULL, '8F3K2P', 'MUY_GRANDE', 'demo-fcm-maria', now() - interval '20 minutes'),
    ( 3, '{VECINO,FAMILIAR}',       'Manuel',  'Sanz Royo',      'manuel.sanz@demo.claxon',   '600333444', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 2, 'C/ Iglesia, 3', FALSE, NULL, NULL, 'GRANDE', 'demo-fcm-manuel', now() - interval '1 day'),
    ( 4, '{VECINO}',       'Carmen',  'López Navarro',  'carmen.lopez@demo.claxon',  '600555666', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 3, 'Pl. de la Iglesia, 1', FALSE, NULL, NULL, 'GRANDE', 'demo-fcm-carmen', now() - interval '3 hours'),
    ( 5, '{FAMILIAR}',     'Laura',   'Pérez Martín',   'laura.perez@demo.claxon',   '611222333', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', NULL, NULL, FALSE, NULL, NULL, 'NORMAL', 'demo-fcm-laura', now() - interval '35 minutes'),
    ( 9, '{AYUNTAMIENTO}', 'Ana',     'Martín Blasco',  'secretaria@demo.claxon',    NULL,        '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', NULL, NULL, FALSE, NULL, NULL, 'NORMAL', NULL, now() - interval '50 minutes'),
    (10, '{AYUNTAMIENTO,VECINO}', 'Luis',    'Navarro Gracia', 'alcaldia.mdr@demo.claxon',  NULL,        '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 1, 'Pl. Mayor, 2', FALSE, NULL, NULL, 'NORMAL', NULL, now() - interval '4 days'),
    (11, '{VECINO}',       'Teresa',  'Aznar Lahoz',    NULL,                        '600777888', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 1, 'C/ San Roque, 8', FALSE, NULL, NULL, 'GRANDE', 'demo-fcm-teresa', now() - interval '6 hours'),
    -- Joaquín no tiene móvil: sin contraseña, lo gestiona su sobrina Laura
    (12, '{VECINO}',       'Joaquín', 'Pérez Gascón',   NULL,                        '978000111', NULL, 4, 'C/ del Horno, 5', TRUE, 'Llamar fuerte a la puerta: tarda en abrir.', NULL, 'GRANDE', NULL, NULL);

-- Una vecina que se dio de baja: la cuenta se desactiva, no se borra
INSERT INTO usuario (id, roles, nombre, apellidos, telefono, password_hash, municipio_id, idioma, activo, fecha_baja, fecha_alta)
OVERRIDING SYSTEM VALUE VALUES
    (13, '{VECINO}', 'Rosario', 'Gómez Lázaro', '600999000', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 3, 'es', FALSE, now() - interval '10 days', now() - interval '80 days');

-- Vendedores: la ruta (días y hora de salida) va en su propio usuario
INSERT INTO usuario (id, roles, nombre, apellidos, email, telefono, password_hash, municipio_id,
                     nombre_comercial, categoria, dias_reparto, hora_salida, horas_antelacion_encargo, token_push, ultimo_acceso)
OVERRIDING SYSTEM VALUE VALUES
    (6, '{VENDEDOR}', 'Jorge',   'Lázaro Ibáñez', 'horno.sanjorge@demo.claxon', '622111000', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 5,
        'Horno San Jorge',         'PAN',     'LMXJVS', '09:45', 12, 'demo-fcm-jorge',   now() - interval '5 minutes'),
    (7, '{VENDEDOR}', 'Antonio', 'Gil Sebastián', 'pescados.gil@demo.claxon',   '622333000', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 5,
        'Pescados Gil',            'PESCADO', 'LXV',    '11:30', 24, 'demo-fcm-antonio', now() - interval '1 hour'),
    (8, '{VENDEDOR}', 'Pilar',   'Royo Alcalá',   'frutas.pilar@demo.claxon',   '622555000', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 5,
        'Frutas y Verduras Pilar', 'FRUTA',   'MJ',     '09:00', 24, NULL,               now() - interval '2 days');

-- Correos confirmados (Manuel aún no ha pulsado el enlace) y un usuario con la app en catalán
UPDATE usuario SET email_verificado = TRUE WHERE email IS NOT NULL AND id <> 3;
UPDATE usuario SET idioma = 'ca' WHERE id = 7;

-- Ana lleva tres ayuntamientos; Luis, el suyo. Tablones en tres pueblos.
UPDATE municipio SET gestor_id = 9  WHERE id IN (2, 3, 4);
UPDATE municipio SET gestor_id = 10 WHERE id = 1;
UPDATE municipio SET tablon_ubicacion = 'Bar La Plaza',       tablon_token_hash = encode(sha256('tablon-fuenferrada-demo'::bytea), 'hex') WHERE id = 2;
UPDATE municipio SET tablon_ubicacion = 'Local social',       tablon_token_hash = encode(sha256('tablon-segura-demo'::bytea), 'hex')      WHERE id = 3;
UPDATE municipio SET tablon_ubicacion = 'Hogar del jubilado', tablon_token_hash = encode(sha256('tablon-mdr-demo'::bytea), 'hex')         WHERE id = 1;

-- Familias -------------------------------------------------------------------
INSERT INTO familiar (familiar_id, vecino_id, parentesco, estado, fecha_solicitud) VALUES
    (5, 2,  'Hija',    'ACEPTADO',  now() - interval '30 days'),
    (5, 12, 'Sobrina', 'ACEPTADO',  now() - interval '25 days'),
    (3, 4,  'Primo',   'PENDIENTE', now() - interval '1 day');

-- Catálogo -------------------------------------------------------------------
INSERT INTO producto (id, vendedor_id, nombre, precio, unidad, disponible) OVERRIDING SYSTEM VALUE VALUES
    ( 1, 6, 'Barra de pan',           1.10, 'UNIDAD',  TRUE),
    ( 2, 6, 'Hogaza de 1 kg',         3.20, 'UNIDAD',  TRUE),
    ( 3, 6, 'Pan de pueblo redondo',  2.40, 'UNIDAD',  TRUE),
    ( 4, 6, 'Pan integral',           1.60, 'UNIDAD',  TRUE),
    ( 5, 6, 'Magdalenas',             4.50, 'DOCENA',  TRUE),
    ( 6, 6, 'Tortas de aceite',       2.80, 'PAQUETE', TRUE),
    ( 7, 6, 'Croissant',              1.20, 'UNIDAD',  FALSE),
    ( 8, 7, 'Merluza',               14.90, 'KG',      TRUE),
    ( 9, 7, 'Sardinas',               6.50, 'KG',      TRUE),
    (10, 7, 'Boquerones',             7.90, 'KG',      TRUE),
    (11, 7, 'Salmón',                16.50, 'KG',      TRUE),
    (12, 7, 'Bacalao desalado',      15.00, 'KG',      TRUE),
    (13, 8, 'Manzanas',               2.20, 'KG',      TRUE),
    (14, 8, 'Naranjas',               1.80, 'KG',      TRUE),
    (15, 8, 'Tomates',                2.60, 'KG',      TRUE),
    (16, 8, 'Patatas (saco 5 kg)',    4.50, 'PAQUETE', TRUE),
    (17, 8, 'Lechuga',                1.00, 'UNIDAD',  TRUE);

-- Paradas y cómo va hoy --------------------------------------------------------
-- Pan: ha salido a las 9:45, ya pasó por Martín del Río y va hacia Fuenferrada.
-- Pescado: hoy toca, pero aún no ha salido (PREVISTA).
-- Fruta: hoy no toca (sin fecha).
INSERT INTO parada (id, vendedor_id, municipio_id, orden, punto_encuentro, minutos_desde_salida, fecha, hora_estimada, hora_llegada, estado)
OVERRIDING SYSTEM VALUE VALUES
    ( 1, 6, 1, 1, 'Plaza Mayor',          15, CURRENT_DATE, (CURRENT_DATE + TIME '10:00')::timestamptz, (CURRENT_DATE + TIME '10:01')::timestamptz, 'HECHA'),
    ( 2, 6, 2, 2, 'Plaza',                55, CURRENT_DATE, (CURRENT_DATE + TIME '10:40')::timestamptz, NULL, 'EN_CAMINO'),
    ( 3, 6, 3, 3, 'Plaza de la Iglesia',  95, CURRENT_DATE, (CURRENT_DATE + TIME '11:20')::timestamptz, NULL, 'EN_CAMINO'),
    ( 4, 6, 4, 4, 'Plaza',               135, CURRENT_DATE, (CURRENT_DATE + TIME '12:00')::timestamptz, NULL, 'EN_CAMINO'),
    ( 5, 7, 1, 1, 'Plaza Mayor',          20, CURRENT_DATE, (CURRENT_DATE + TIME '11:50')::timestamptz, NULL, 'PREVISTA'),
    ( 6, 7, 2, 2, 'Plaza',                45, CURRENT_DATE, (CURRENT_DATE + TIME '12:15')::timestamptz, NULL, 'PREVISTA'),
    ( 7, 7, 3, 3, 'Plaza de la Iglesia',  80, CURRENT_DATE, (CURRENT_DATE + TIME '12:50')::timestamptz, NULL, 'PREVISTA'),
    ( 8, 8, 2, 1, 'Plaza',                30, NULL, NULL, NULL, NULL),
    ( 9, 8, 4, 2, 'Plaza',                60, NULL, NULL, NULL, NULL),
    (10, 8, 3, 3, 'Plaza de la Iglesia',  90, NULL, NULL, NULL, NULL),
    (11, 8, 1, 4, 'Plaza Mayor',         120, NULL, NULL, NULL, NULL);

-- Suscripciones (a María ya se le avisó hoy del pan, a las 10:25) ---------------
INSERT INTO suscripcion (vecino_id, vendedor_id, minutos_antelacion, ultimo_aviso) VALUES
    ( 2, 6, 15, CURRENT_DATE),
    ( 2, 7, 15, NULL),
    ( 3, 6, 10, NULL),
    ( 4, 6, 15, NULL),
    ( 4, 7, 30, NULL),
    (12, 6, 20, NULL),
    (11, 6, 15, NULL),
    (11, 8, 15, NULL),
    (10, 6, 15, NULL);                -- Luis, el alcalde, también es vecino y quiere aviso del pan

-- Encargos (el vendedor es el de la parada) ------------------------------------
INSERT INTO encargo (id, vecino_id, parada_id, fecha_entrega, estado, creado_por_id, a_domicilio, notas, motivo_rechazo,
                     importe_total, fecha_creacion, fecha_aceptado, fecha_preparado, fecha_entregado)
OVERRIDING SYSTEM VALUE VALUES
    (1,  2, 2, CURRENT_DATE,     'PREPARADO', 2,  FALSE, 'Si puede ser, la barra poco hecha.', NULL, 5.00,
        (CURRENT_DATE - 1 + TIME '19:12')::timestamptz, (CURRENT_DATE + TIME '09:05')::timestamptz, (CURRENT_DATE + TIME '09:20')::timestamptz, NULL),
    (2, 12, 4, CURRENT_DATE,     'ACEPTADO',  5,  TRUE,  'Se lo dejo en casa, como siempre.', NULL, NULL,
        now() - interval '20 hours', now() - interval '18 hours', NULL, NULL),
    (3,  2, 6, CURRENT_DATE,     'PENDIENTE', 5,  FALSE, 'Merluza en rodajas, por favor.', NULL, NULL,
        now() - interval '2 hours', NULL, NULL, NULL),
    (4,  4, 3, CURRENT_DATE,     'ACEPTADO',  4,  FALSE, NULL, NULL, NULL,
        now() - interval '18 hours', now() - interval '16 hours', NULL, NULL),
    (5,  3, 2, CURRENT_DATE,     'PENDIENTE', 3,  FALSE, NULL, NULL, NULL,
        now() - interval '40 minutes', NULL, NULL, NULL),
    (6,  2, 2, CURRENT_DATE - 1, 'ENTREGADO', 2,  FALSE, NULL, NULL, 6.70,
        now() - interval '2 days', now() - interval '40 hours', now() - interval '26 hours', (CURRENT_DATE - 1 + TIME '10:44')::timestamptz),
    (7, 11, 11, CURRENT_DATE + ((2 - EXTRACT(ISODOW FROM CURRENT_DATE)::int + 7) % 7), 'ACEPTADO', 11, FALSE, 'Naranjas de zumo.', NULL, NULL,
        now() - interval '5 hours', now() - interval '4 hours', NULL, NULL),
    (8,  4, 7, CURRENT_DATE - 3, 'RECHAZADO', 4,  FALSE, NULL, 'Ese día no quedaba salmón.', NULL,
        now() - interval '4 days', NULL, NULL, NULL);

INSERT INTO linea_encargo (encargo_id, producto_id, descripcion, cantidad, unidad, precio_unitario) VALUES
    (1, 1,    'Barra de pan',              2,   'UNIDAD',  1.10),
    (1, 6,    'Tortas de aceite',          1,   'PAQUETE', 2.80),
    (2, 3,    'Pan de pueblo redondo',     1,   'UNIDAD',  2.40),
    (2, 5,    'Magdalenas',                1,   'DOCENA',  4.50),
    (3, 8,    'Merluza',                   1,   'KG',     14.90),
    (3, 10,   'Boquerones',                0.5, 'KG',      7.90),
    (4, 2,    'Hogaza de 1 kg',            1,   'UNIDAD',  3.20),
    (5, 4,    'Pan integral',              1,   'UNIDAD',  1.60),
    (5, NULL, 'Barra de centeno (si hay)', 1,   'UNIDAD',  NULL),
    (6, 1,    'Barra de pan',              2,   'UNIDAD',  1.10),
    (6, 5,    'Magdalenas',                1,   'DOCENA',  4.50),
    (7, 14,   'Naranjas',                  2,   'KG',      1.80),
    (7, 17,   'Lechuga',                   1,   'UNIDAD',  1.00),
    (8, 11,   'Salmón',                    0.5, 'KG',     16.50);

-- Consulta médica ---------------------------------------------------------------
-- Horario habitual (con dia_semana). La de Fuenferrada cae «hoy» para la demo.
INSERT INTO consulta (municipio_id, tipo, dia_semana, hora_inicio, hora_fin) VALUES
    (2, 'MEDICINA',   EXTRACT(ISODOW FROM CURRENT_DATE)::int, '09:30', '10:30'),
    (2, 'MEDICINA',   4, '09:30', '10:30'),
    (2, 'ENFERMERIA', 3, '10:00', '11:00'),
    (3, 'MEDICINA',   2, '11:00', '12:00'),
    (3, 'MEDICINA',   5, '11:00', '12:00'),
    (1, 'MEDICINA',   1, '09:00', '11:00'),
    (1, 'MEDICINA',   3, '09:00', '11:00'),
    (1, 'MEDICINA',   5, '09:00', '11:00'),
    (4, 'MEDICINA',   4, '11:00', '12:00');

-- Cambio de hoy (con fecha): se pasa en Utrillas
INSERT INTO consulta (municipio_id, tipo, fecha, hora_inicio, hora_fin, lugar, motivo) VALUES
    (2, 'MEDICINA', CURRENT_DATE, '09:30', '10:30', 'Centro de Salud de Utrillas', 'Reorganización del personal sanitario.');

-- Avisos (si va a dos pueblos, una fila por pueblo; NULL = todos) ----------------
INSERT INTO aviso (municipio_id, autor_id, categoria, titulo, contenido, prioridad, estado, enviar_push, push_enviado, visible_desde, visible_hasta, fecha_creacion) VALUES
    (2,    9,  'SANIDAD',     'Hoy no hay consulta en Fuenferrada',
        'La consulta de medicina de hoy se pasa en el Centro de Salud de Utrillas, en el mismo horario (9:30 a 10:30).',
        'IMPORTANTE', 'PUBLICADO', TRUE, (CURRENT_DATE + TIME '08:05')::timestamptz,
        (CURRENT_DATE + TIME '08:05')::timestamptz, (CURRENT_DATE + 1)::timestamptz, (CURRENT_DATE + TIME '08:02')::timestamptz),
    (2,    9,  'SUMINISTROS', 'Corte de agua el miércoles',
        'El miércoles se cortará el agua de 9:00 a 13:00 por una reparación en la red. Se recomienda llenar alguna garrafa.',
        'NORMAL', 'PUBLICADO', TRUE, now() - interval '1 day', now() - interval '1 day', now() + interval '3 days', now() - interval '1 day'),
    (2,    9,  'TRAMITES',    'Recogida de muebles y enseres',
        'El jueves pasa el camión de la comarca. Dejad los enseres junto a los contenedores antes de las 8:00.',
        'NORMAL', 'PUBLICADO', FALSE, NULL, now() - interval '2 days', now() + interval '4 days', now() - interval '2 days'),
    (3,    9,  'TRAMITES',    'Recogida de muebles y enseres',
        'El jueves pasa el camión de la comarca. Dejad los enseres junto a los contenedores antes de las 8:00.',
        'NORMAL', 'PUBLICADO', FALSE, NULL, now() - interval '2 days', now() + interval '4 days', now() - interval '2 days'),
    (1,    10, 'FIESTAS',     'Castañada popular el sábado',
        'El sábado a las 18:00 en la plaza. Habrá castañas asadas y chocolate para todos.',
        'NORMAL', 'PUBLICADO', TRUE, now() - interval '3 days', now() - interval '3 days', now() + interval '6 days', now() - interval '3 days'),
    (NULL, 9,  'TRANSPORTE',  'Nuevo horario del autobús a Teruel',
        'Desde el lunes que viene el autobús sale a las 7:40 (antes 7:30). La vuelta no cambia.',
        'NORMAL', 'PUBLICADO', FALSE, NULL, now() - interval '1 day', now() + interval '10 days', now() - interval '1 day'),
    (2,    9,  'SANIDAD',     'Campaña de vacunación de la gripe',
        'Borrador: falta confirmar con el centro de salud los días de vacunación en cada pueblo.',
        'IMPORTANTE', 'BORRADOR', TRUE, NULL, now() + interval '2 days', NULL, now() - interval '3 hours'),
    (3,    9,  'SANIDAD',     'Campaña de vacunación de la gripe',
        'Borrador: falta confirmar con el centro de salud los días de vacunación en cada pueblo.',
        'IMPORTANTE', 'BORRADOR', TRUE, NULL, now() + interval '2 days', NULL, now() - interval '3 hours');

-- Poner los contadores IDENTITY por encima de los ids escritos a mano -----------
DO $$
DECLARE t RECORD;
BEGIN
    FOR t IN SELECT table_name, column_name FROM information_schema.columns
             WHERE table_schema = 'claxon' AND is_identity = 'YES'
    LOOP
        EXECUTE format('SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT max(%I) FROM claxon.%I), 0) + 1, FALSE)',
                       'claxon.' || t.table_name, t.column_name, t.column_name, t.table_name);
    END LOOP;
END $$;

COMMIT;
