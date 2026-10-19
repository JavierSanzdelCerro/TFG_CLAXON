-- =============================================================================
--  CLAXON · Datos de demostración
--
--  Recrea el ejemplo de la presentación: la ruta del pan que sale a las 9:45 de
--  Utrillas y pasa por Martín del Río (10:00), Fuenferrada (10:40), Segura de
--  los Baños (11:20) y La Hoz de la Vieja (12:00); el pescado a las 12:15 y la
--  consulta médica de Fuenferrada, que hoy se pasa en Utrillas.
--
--  Las fechas son relativas a CURRENT_DATE: al cargar el script, «hoy» siempre
--  es el día en que se carga, así la demo siempre tiene datos del día.
--
--  Los nombres de personas y negocios son inventados.
--  Contraseña de TODOS los usuarios demo:  Claxon2026!
-- =============================================================================

SET client_encoding = 'UTF8';
SET timezone = 'Europe/Madrid';
SET search_path TO claxon, public;

BEGIN;

-- -----------------------------------------------------------------------------
-- Territorio
-- -----------------------------------------------------------------------------
INSERT INTO provincia (id, nombre, codigo_ine) OVERRIDING SYSTEM VALUE VALUES
    (1, 'Teruel', '44');

INSERT INTO comarca (id, provincia_id, nombre) OVERRIDING SYSTEM VALUE VALUES
    (1, 1, 'Cuencas Mineras');

-- Código INE, habitantes y coordenadas se dejan vacíos: rellenarlos con datos oficiales del INE
INSERT INTO municipio (id, provincia_id, comarca_id, nombre) OVERRIDING SYSTEM VALUE VALUES
    (1, 1, 1, 'Martín del Río'),
    (2, 1, 1, 'Fuenferrada'),
    (3, 1, 1, 'Segura de los Baños'),
    (4, 1, 1, 'La Hoz de la Vieja'),
    (5, 1, 1, 'Utrillas');

-- -----------------------------------------------------------------------------
-- Roles y usuarios
-- -----------------------------------------------------------------------------
INSERT INTO rol (id, codigo, nombre, descripcion) OVERRIDING SYSTEM VALUE VALUES
    (1, 'VECINO',       'Vecino',       'Recibe avisos y hace encargos.'),
    (2, 'FAMILIAR',     'Familiar',     'Ayuda a un vecino desde fuera del pueblo.'),
    (3, 'VENDEDOR',     'Vendedor',     'Organiza sus rutas, paradas y encargos.'),
    (4, 'AYUNTAMIENTO', 'Ayuntamiento', 'Publica avisos y cambios de consulta.'),
    (5, 'ADMIN',        'Administrador','Gestiona pueblos, usuarios y tablones.');

-- Hash BCrypt (coste 10) de "Claxon2026!"
INSERT INTO usuario (id, email, telefono, password_hash, nombre, apellidos, tamano_texto, email_verificado, ultimo_acceso)
OVERRIDING SYSTEM VALUE VALUES
    ( 1, 'admin@claxon.app',          NULL,        '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Equipo',  'Claxon',          'NORMAL',     TRUE, now() - interval '2 hours'),
    ( 2, NULL,                        '600111222', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'María',   'Pérez Gascón',    'MUY_GRANDE', FALSE, now() - interval '20 minutes'),
    ( 3, 'manuel.sanz@demo.claxon',   '600333444', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Manuel',  'Sanz Royo',       'GRANDE',     TRUE, now() - interval '1 day'),
    ( 4, 'carmen.lopez@demo.claxon',  '600555666', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Carmen',  'López Navarro',   'GRANDE',     TRUE, now() - interval '3 hours'),
    ( 5, 'laura.perez@demo.claxon',   '611222333', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Laura',   'Pérez Martín',    'NORMAL',     TRUE, now() - interval '35 minutes'),
    ( 6, 'horno.sanjorge@demo.claxon','622111000', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Jorge',   'Lázaro Ibáñez',   'GRANDE',     TRUE, now() - interval '5 minutes'),
    ( 7, 'pescados.gil@demo.claxon',  '622333000', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Antonio', 'Gil Sebastián',   'GRANDE',     TRUE, now() - interval '1 hour'),
    ( 8, 'frutas.pilar@demo.claxon',  '622555000', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Pilar',   'Royo Alcalá',     'NORMAL',     TRUE, now() - interval '2 days'),
    ( 9, 'secretaria@demo.claxon',    NULL,        '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Ana',     'Martín Blasco',   'NORMAL',     TRUE, now() - interval '50 minutes'),
    (10, 'alcaldia.mdr@demo.claxon',  NULL,        '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Luis',    'Navarro Gracia',  'NORMAL',     TRUE, now() - interval '4 days'),
    (11, NULL,                        '600777888', '$2a$10$pZWCp9McrKgkICxHqs2utetNRCU8CebHSQ/jvNMKZOOpKt.k88A2.', 'Teresa',  'Aznar Lahoz',     'GRANDE',     FALSE, now() - interval '6 hours');

INSERT INTO usuario_rol (usuario_id, rol_id) VALUES
    (1, 5),
    (2, 1), (3, 1), (4, 1), (11, 1),
    (5, 2),
    (6, 3), (7, 3), (8, 3),
    (9, 4), (10, 4),
    (10, 1);   -- el alcalde también es vecino de su pueblo

INSERT INTO dispositivo (usuario_id, token_push, plataforma, modelo, ultimo_uso) VALUES
    (2, 'demo-fcm-maria-0001',  'ANDROID', 'Samsung Galaxy A14',  now() - interval '20 minutes'),
    (3, 'demo-fcm-manuel-0001', 'ANDROID', 'Xiaomi Redmi 12',     now() - interval '1 day'),
    (4, 'demo-fcm-carmen-0001', 'ANDROID', 'Motorola g24',        now() - interval '3 hours'),
    (5, 'demo-fcm-laura-0001',  'ANDROID', 'Google Pixel 8',      now() - interval '35 minutes'),
    (6, 'demo-fcm-jorge-0001',  'ANDROID', 'Samsung Galaxy A34',  now() - interval '5 minutes'),
    (7, 'demo-fcm-antonio-0001','ANDROID', 'Oppo A79',            now() - interval '1 hour'),
    (11,'demo-fcm-teresa-0001', 'ANDROID', 'Samsung Galaxy A05s', now() - interval '6 hours');

-- -----------------------------------------------------------------------------
-- Vecinos y familias
-- -----------------------------------------------------------------------------
INSERT INTO vecino (id, usuario_id, municipio_id, nombre, apellidos, telefono, direccion, necesita_ayuda_entrega, notas_entrega)
OVERRIDING SYSTEM VALUE VALUES
    (1, 2,    2, 'María',   'Pérez Gascón',  '600111222', 'C/ Mayor, 12',          FALSE, NULL),
    (2, 3,    2, 'Manuel',  'Sanz Royo',     '600333444', 'C/ Iglesia, 3',         FALSE, NULL),
    (3, 4,    3, 'Carmen',  'López Navarro', '600555666', 'Pl. de la Iglesia, 1',  FALSE, NULL),
    (4, NULL, 4, 'Joaquín', 'Pérez Gascón',  '978000111', 'C/ del Horno, 5',       TRUE,  'Llamar fuerte a la puerta: tarda en abrir.'),
    (5, 11,   1, 'Teresa',  'Aznar Lahoz',   '600777888', 'C/ San Roque, 8',       FALSE, NULL),
    (6, 10,   1, 'Luis',    'Navarro Gracia', NULL,       'Pl. Mayor, 2',          FALSE, NULL);

INSERT INTO familiar_vecino (familiar_usuario_id, vecino_id, parentesco, puede_hacer_encargos, recibe_avisos, estado, fecha_solicitud, fecha_respuesta) VALUES
    (5, 1, 'Hija',    TRUE, TRUE, 'ACEPTADA', now() - interval '30 days', now() - interval '30 days'),
    (5, 4, 'Sobrina', TRUE, TRUE, 'ACEPTADA', now() - interval '25 days', now() - interval '25 days');

INSERT INTO familiar_vecino (familiar_usuario_id, vecino_id, parentesco, estado, codigo_invitacion, fecha_solicitud) VALUES
    (3, 3, 'Primo', 'PENDIENTE', 'K7P2QX', now() - interval '1 day');

-- -----------------------------------------------------------------------------
-- Vendedores y catálogo
-- -----------------------------------------------------------------------------
INSERT INTO categoria_servicio (id, codigo, nombre, icono, color) OVERRIDING SYSTEM VALUE VALUES
    (1, 'PAN',          'Pan',           'croissant',      '#C0632F'),
    (2, 'PESCADO',      'Pescado',       'fish',           '#2F6F9F'),
    (3, 'FRUTA',        'Fruta y verdura','apple',         '#4E8A3E'),
    (4, 'CARNE',        'Carne',         'beef',           '#A8323E'),
    (5, 'ULTRAMARINOS', 'Ultramarinos',  'shopping-basket','#8A6D3B'),
    (6, 'BUTANO',       'Butano',        'flame',          '#D9822B'),
    (7, 'OTROS',        'Otros',         'truck',          '#6B7280');

INSERT INTO vendedor (id, usuario_id, nombre_comercial, telefono_contacto, descripcion, municipio_base_id, horas_antelacion_encargo)
OVERRIDING SYSTEM VALUE VALUES
    (1, 6, 'Horno San Jorge',          '622111000', 'Pan de leña, tortas y bollería. Reparto de lunes a sábado.', 5, 12),
    (2, 7, 'Pescados Gil',             '622333000', 'Pescado fresco de lonja. Lunes, miércoles y viernes.',      5, 24),
    (3, 8, 'Frutas y Verduras Pilar',  '622555000', 'Fruta y verdura de temporada. Martes y jueves.',            5, 24);

INSERT INTO vendedor_categoria (vendedor_id, categoria_id) VALUES
    (1, 1), (2, 2), (3, 3);

INSERT INTO producto (id, vendedor_id, categoria_id, nombre, precio, unidad) OVERRIDING SYSTEM VALUE VALUES
    ( 1, 1, 1, 'Barra de pan',          1.10, 'UNIDAD'),
    ( 2, 1, 1, 'Hogaza de 1 kg',        3.20, 'UNIDAD'),
    ( 3, 1, 1, 'Pan de pueblo redondo', 2.40, 'UNIDAD'),
    ( 4, 1, 1, 'Pan integral',          1.60, 'UNIDAD'),
    ( 5, 1, 1, 'Magdalenas',            4.50, 'DOCENA'),
    ( 6, 1, 1, 'Tortas de aceite',      2.80, 'PAQUETE'),
    ( 7, 1, 1, 'Croissant',             1.20, 'UNIDAD'),
    ( 8, 2, 2, 'Merluza',              14.90, 'KG'),
    ( 9, 2, 2, 'Sardinas',              6.50, 'KG'),
    (10, 2, 2, 'Boquerones',            7.90, 'KG'),
    (11, 2, 2, 'Salmón',               16.50, 'KG'),
    (12, 2, 2, 'Bacalao desalado',     15.00, 'KG'),
    (13, 2, 2, 'Mejillones',            4.50, 'KG'),
    (14, 3, 3, 'Manzanas',              2.20, 'KG'),
    (15, 3, 3, 'Naranjas',              1.80, 'KG'),
    (16, 3, 3, 'Plátanos',              2.40, 'KG'),
    (17, 3, 3, 'Tomates',               2.60, 'KG'),
    (18, 3, 3, 'Patatas (saco 5 kg)',   4.50, 'PAQUETE'),
    (19, 3, 3, 'Lechuga',               1.00, 'UNIDAD');

-- -----------------------------------------------------------------------------
-- Rutas y paradas
-- -----------------------------------------------------------------------------
INSERT INTO ruta (id, vendedor_id, nombre, descripcion, hora_salida_prevista) OVERRIDING SYSTEM VALUE VALUES
    (1, 1, 'Ruta del pan',     'Sale del horno de Utrillas.',      '09:45'),
    (2, 2, 'Ruta del pescado', 'Sale de Utrillas tras la lonja.',  '11:30'),
    (3, 3, 'Ruta de la fruta', 'Sale del almacén de Utrillas.',    '09:00');

INSERT INTO ruta_dia (ruta_id, dia_semana)
SELECT 1, d FROM generate_series(1, 6) AS d           -- pan: lunes a sábado
UNION ALL SELECT 2, d FROM unnest(ARRAY[1, 3, 5]) AS d -- pescado: L, X, V
UNION ALL SELECT 3, d FROM unnest(ARRAY[2, 4]) AS d;   -- fruta: M, J

INSERT INTO parada (id, ruta_id, municipio_id, orden, punto_encuentro, minutos_desde_salida, duracion_estimada_min)
OVERRIDING SYSTEM VALUE VALUES
    -- Ruta del pan (salida 9:45)
    ( 1, 1, 1, 1, 'Plaza Mayor',         15, 12),   -- 10:00
    ( 2, 1, 2, 2, 'Plaza',               55, 12),   -- 10:40
    ( 3, 1, 3, 3, 'Plaza de la Iglesia', 95, 12),   -- 11:20
    ( 4, 1, 4, 4, 'Plaza',              135, 10),   -- 12:00
    -- Ruta del pescado (salida 11:30)
    ( 5, 2, 1, 1, 'Plaza Mayor',         20, 15),   -- 11:50
    ( 6, 2, 2, 2, 'Plaza',               45, 15),   -- 12:15
    ( 7, 2, 3, 3, 'Plaza de la Iglesia', 80, 15),   -- 12:50
    -- Ruta de la fruta (salida 9:00)
    ( 8, 3, 2, 1, 'Plaza',               30, 15),   -- 9:30
    ( 9, 3, 4, 2, 'Plaza',               60, 15),   -- 10:00
    (10, 3, 3, 3, 'Plaza de la Iglesia', 90, 15),   -- 10:30
    (11, 3, 1, 4, 'Plaza Mayor',        120, 15);   -- 11:00

-- -----------------------------------------------------------------------------
-- Jornadas: ayer (terminada), hoy pan (en curso) y hoy pescado (programada)
-- -----------------------------------------------------------------------------
INSERT INTO jornada (id, ruta_id, fecha, estado, hora_inicio_real, hora_fin_real) OVERRIDING SYSTEM VALUE VALUES
    (1, 1, CURRENT_DATE - 1, 'FINALIZADA', (CURRENT_DATE - 1 + TIME '09:47')::timestamptz, (CURRENT_DATE - 1 + TIME '12:20')::timestamptz),
    (2, 1, CURRENT_DATE,     'EN_CURSO',   (CURRENT_DATE     + TIME '09:45')::timestamptz, NULL),
    (3, 2, CURRENT_DATE,     'PROGRAMADA', NULL, NULL);

INSERT INTO paso_parada (id, jornada_id, parada_id, hora_estimada, hora_llegada_real, hora_salida_real, estado)
OVERRIDING SYSTEM VALUE VALUES
    -- Ayer
    ( 1, 1, 1, (CURRENT_DATE - 1 + TIME '10:02')::timestamptz, (CURRENT_DATE - 1 + TIME '10:03')::timestamptz, (CURRENT_DATE - 1 + TIME '10:15')::timestamptz, 'COMPLETADO'),
    ( 2, 1, 2, (CURRENT_DATE - 1 + TIME '10:42')::timestamptz, (CURRENT_DATE - 1 + TIME '10:44')::timestamptz, (CURRENT_DATE - 1 + TIME '10:58')::timestamptz, 'COMPLETADO'),
    ( 3, 1, 3, (CURRENT_DATE - 1 + TIME '11:22')::timestamptz, (CURRENT_DATE - 1 + TIME '11:25')::timestamptz, (CURRENT_DATE - 1 + TIME '11:36')::timestamptz, 'COMPLETADO'),
    ( 4, 1, 4, (CURRENT_DATE - 1 + TIME '12:02')::timestamptz, (CURRENT_DATE - 1 + TIME '12:05')::timestamptz, (CURRENT_DATE - 1 + TIME '12:14')::timestamptz, 'COMPLETADO'),
    -- Hoy, ruta del pan: ya pasó por Martín del Río y va de camino a Fuenferrada
    ( 5, 2, 1, (CURRENT_DATE + TIME '10:00')::timestamptz, (CURRENT_DATE + TIME '10:01')::timestamptz, (CURRENT_DATE + TIME '10:13')::timestamptz, 'COMPLETADO'),
    ( 6, 2, 2, (CURRENT_DATE + TIME '10:40')::timestamptz, NULL, NULL, 'PENDIENTE'),
    ( 7, 2, 3, (CURRENT_DATE + TIME '11:20')::timestamptz, NULL, NULL, 'PENDIENTE'),
    ( 8, 2, 4, (CURRENT_DATE + TIME '12:00')::timestamptz, NULL, NULL, 'PENDIENTE'),
    -- Hoy, ruta del pescado (todavía no ha salido)
    ( 9, 3, 5, (CURRENT_DATE + TIME '11:50')::timestamptz, NULL, NULL, 'PENDIENTE'),
    (10, 3, 6, (CURRENT_DATE + TIME '12:15')::timestamptz, NULL, NULL, 'PENDIENTE'),
    (11, 3, 7, (CURRENT_DATE + TIME '12:50')::timestamptz, NULL, NULL, 'PENDIENTE');

-- -----------------------------------------------------------------------------
-- Suscripciones (quién quiere aviso de qué vendedor)
-- -----------------------------------------------------------------------------
INSERT INTO suscripcion (vecino_id, vendedor_id, minutos_antelacion) VALUES
    (1, 1, 15), (1, 2, 15),            -- María: pan y pescado
    (2, 1, 10),                        -- Manuel: pan, 10 min antes
    (3, 1, 15), (3, 2, 30),            -- Carmen: pan y pescado (30 min antes)
    (4, 1, 20),                        -- Joaquín (lo gestiona Laura)
    (5, 1, 15), (5, 3, 15),            -- Teresa: pan y fruta
    (6, 1, 15);

-- -----------------------------------------------------------------------------
-- Encargos (el trigger rellena el historial al insertar)
-- -----------------------------------------------------------------------------
INSERT INTO encargo (id, vecino_id, vendedor_id, parada_id, fecha_entrega, estado, creado_por_usuario_id, entrega_a_domicilio, notas, motivo_rechazo, importe_total, fecha_creacion)
OVERRIDING SYSTEM VALUE VALUES
    (1, 1, 1, 2, CURRENT_DATE,     'PENDIENTE', 2, FALSE, 'Si puede ser, la barra poco hecha.', NULL, NULL, now() - interval '15 hours'),
    (2, 4, 1, 4, CURRENT_DATE,     'ACEPTADO',  5, TRUE,  'Se lo dejo en casa, como siempre.',  NULL, NULL, now() - interval '20 hours'),
    (3, 1, 2, 6, CURRENT_DATE,     'PENDIENTE', 5, FALSE, 'Merluza en rodajas, por favor.',     NULL, NULL, now() - interval '2 hours'),
    (4, 3, 1, 3, CURRENT_DATE,     'ACEPTADO',  4, FALSE, NULL,                                 NULL, NULL, now() - interval '18 hours'),
    (5, 2, 1, 2, CURRENT_DATE,     'PENDIENTE', 3, FALSE, NULL,                                 NULL, NULL, now() - interval '40 minutes'),
    (6, 1, 1, 2, CURRENT_DATE - 1, 'ENTREGADO', 2, FALSE, NULL,                                 NULL, 6.70, now() - interval '2 days'),
    (7, 5, 3, 11, CURRENT_DATE + ((2 - EXTRACT(ISODOW FROM CURRENT_DATE)::int + 7) % 7), 'ACEPTADO', 11, FALSE, 'Naranjas de zumo.', NULL, NULL, now() - interval '5 hours'),
    (8, 3, 2, 7, CURRENT_DATE - 3, 'RECHAZADO', 4, FALSE, NULL, 'Ese día no quedaba salmón.',  NULL, now() - interval '4 days');

INSERT INTO linea_encargo (encargo_id, producto_id, descripcion, cantidad, unidad, precio_unitario) VALUES
    (1, 1,    'Barra de pan',          2,   'UNIDAD',  1.10),
    (1, 6,    'Tortas de aceite',      1,   'PAQUETE', 2.80),
    (2, 3,    'Pan de pueblo redondo', 1,   'UNIDAD',  2.40),
    (2, 5,    'Magdalenas',            1,   'DOCENA',  4.50),
    (3, 8,    'Merluza',               1,   'KG',     14.90),
    (3, 10,   'Boquerones',            0.5, 'KG',      7.90),
    (4, 2,    'Hogaza de 1 kg',        1,   'UNIDAD',  3.20),
    (5, 4,    'Pan integral',          1,   'UNIDAD',  1.60),
    (5, NULL, 'Barra de centeno (si hay)', 1, 'UNIDAD', NULL),
    (6, 1,    'Barra de pan',          2,   'UNIDAD',  1.10),
    (6, 5,    'Magdalenas',            1,   'DOCENA',  4.50),
    (7, 15,   'Naranjas',              2,   'KG',      1.80),
    (7, 19,   'Lechuga',               1,   'UNIDAD',  1.00),
    (8, 11,   'Salmón',                0.5, 'KG',     16.50);

-- El horno acepta y prepara el encargo de María (así se ve el historial con el usuario que lo cambia)
SELECT set_config('claxon.usuario_id', '6', TRUE);
UPDATE encargo SET estado = 'ACEPTADO'  WHERE id = 1;
UPDATE encargo SET estado = 'PREPARADO', importe_total = 5.00 WHERE id = 1;
SELECT set_config('claxon.usuario_id', '', TRUE);

-- -----------------------------------------------------------------------------
-- Ayuntamiento, salud y avisos
-- -----------------------------------------------------------------------------
INSERT INTO gestor_municipal (usuario_id, municipio_id, cargo) VALUES
    (9,  2, 'Secretaria-interventora'),
    (9,  3, 'Secretaria-interventora'),
    (9,  4, 'Secretaria-interventora'),
    (10, 1, 'Alcalde');

INSERT INTO centro_salud (id, municipio_id, nombre) OVERRIDING SYSTEM VALUE VALUES
    (1, 5, 'Centro de Salud de Utrillas');

-- La consulta de Fuenferrada cae «hoy» para que la demo siempre muestre el cambio
INSERT INTO consulta_medica (id, municipio_id, centro_salud_id, tipo, dia_semana, hora_inicio, hora_fin, lugar)
OVERRIDING SYSTEM VALUE VALUES
    (1, 2, 1, 'MEDICINA',   EXTRACT(ISODOW FROM CURRENT_DATE)::int, '09:30', '10:30', 'Consultorio local'),
    (2, 2, 1, 'MEDICINA',   4, '09:30', '10:30', 'Consultorio local'),
    (3, 2, 1, 'ENFERMERIA', 3, '10:00', '11:00', 'Consultorio local'),
    (4, 3, 1, 'MEDICINA',   2, '11:00', '12:00', 'Consultorio local'),
    (5, 3, 1, 'MEDICINA',   5, '11:00', '12:00', 'Consultorio local'),
    (6, 1, 1, 'MEDICINA',   1, '09:00', '11:00', 'Consultorio local'),
    (7, 1, 1, 'MEDICINA',   3, '09:00', '11:00', 'Consultorio local'),
    (8, 1, 1, 'MEDICINA',   5, '09:00', '11:00', 'Consultorio local'),
    (9, 4, 1, 'MEDICINA',   4, '11:00', '12:00', 'Consultorio local');

INSERT INTO aviso (id, autor_usuario_id, categoria, titulo, contenido, prioridad, estado, enviar_push, visible_desde, visible_hasta, fecha_publicacion, fecha_creacion)
OVERRIDING SYSTEM VALUE VALUES
    (1, 9, 'SANIDAD',     'Hoy no hay consulta en Fuenferrada',
        'La consulta de medicina de hoy se pasa en el Centro de Salud de Utrillas, en el mismo horario (9:30 a 10:30).',
        'IMPORTANTE', 'PUBLICADO', TRUE,
        CURRENT_DATE::timestamptz, (CURRENT_DATE + 1)::timestamptz, (CURRENT_DATE + TIME '08:05')::timestamptz, (CURRENT_DATE + TIME '08:02')::timestamptz),
    (2, 9, 'SUMINISTROS', 'Corte de agua el miércoles',
        'El miércoles se cortará el agua de 9:00 a 13:00 por una reparación en la red. Se recomienda llenar alguna garrafa.',
        'NORMAL', 'PUBLICADO', TRUE,
        now() - interval '1 day', now() + interval '3 days', now() - interval '1 day', now() - interval '1 day'),
    (3, 9, 'TRAMITES',    'Recogida de muebles y enseres',
        'El jueves pasa el camión de la comarca. Dejad los enseres junto a los contenedores antes de las 8:00.',
        'NORMAL', 'PUBLICADO', FALSE,
        now() - interval '2 days', now() + interval '4 days', now() - interval '2 days', now() - interval '2 days'),
    (4, 10, 'FIESTAS',    'Castañada popular el sábado',
        'El sábado a las 18:00 en la plaza. Habrá castañas asadas y chocolate para todos.',
        'NORMAL', 'PUBLICADO', TRUE,
        now() - interval '3 days', now() + interval '6 days', now() - interval '3 days', now() - interval '3 days'),
    (5, 9, 'TRANSPORTE',  'Nuevo horario del autobús a Teruel',
        'Desde el lunes que viene el autobús sale a las 7:40 (antes 7:30). La vuelta no cambia.',
        'NORMAL', 'PUBLICADO', FALSE,
        now() - interval '1 day', now() + interval '10 days', now() - interval '1 day', now() - interval '1 day'),
    (6, 9, 'SANIDAD',     'Campaña de vacunación de la gripe',
        'Borrador: falta confirmar con el centro de salud los días de vacunación en cada pueblo.',
        'IMPORTANTE', 'BORRADOR', TRUE,
        now() + interval '2 days', NULL, NULL, now() - interval '3 hours');

INSERT INTO aviso_municipio (aviso_id, municipio_id) VALUES
    (1, 2),
    (2, 2),
    (3, 2), (3, 3),
    (4, 1),
    (5, 1), (5, 2), (5, 3), (5, 4),
    (6, 2), (6, 3);

INSERT INTO incidencia_consulta (consulta_id, fecha, tipo, centro_alternativo_id, motivo, aviso_id, publicado_por_usuario_id, fecha_publicacion) VALUES
    (1, CURRENT_DATE, 'CAMBIO_LUGAR', 1, 'Reorganización del personal sanitario.', 1, 9, (CURRENT_DATE + TIME '08:05')::timestamptz);

-- -----------------------------------------------------------------------------
-- Notificaciones
-- -----------------------------------------------------------------------------
INSERT INTO notificacion (usuario_id, vecino_id, tipo, titulo, cuerpo, paso_parada_id, encargo_id, aviso_id, clave_deduplicacion, estado, intentos, fecha_programada, fecha_envio, fecha_lectura) VALUES
    (2, 1, 'LLEGADA_PROXIMA',     'El panadero llega a la plaza en 15 min', 'Horno San Jorge · hora estimada 10:40. Tienes 1 encargo preparado.',
        6, NULL, NULL, 'LLEGADA_PROXIMA:6:2', 'ENVIADA', 1, (CURRENT_DATE + TIME '10:25')::timestamptz, (CURRENT_DATE + TIME '10:25')::timestamptz, NULL),
    (5, 1, 'LLEGADA_PROXIMA',     'El pan llega a Fuenferrada en 15 min',   'Tu madre tiene 1 encargo preparado en Horno San Jorge.',
        6, NULL, NULL, 'LLEGADA_PROXIMA:6:5', 'ENVIADA', 1, (CURRENT_DATE + TIME '10:25')::timestamptz, (CURRENT_DATE + TIME '10:25')::timestamptz, NULL),
    (3, 2, 'LLEGADA_PROXIMA',     'El panadero llega a la plaza en 10 min', 'Horno San Jorge · hora estimada 10:40.',
        6, NULL, NULL, 'LLEGADA_PROXIMA:6:3', 'PENDIENTE', 0, (CURRENT_DATE + TIME '10:30')::timestamptz, NULL, NULL),
    (2, 1, 'CAMBIO_CONSULTA',     'Hoy no hay consulta en Fuenferrada',     'La consulta se pasa en el Centro de Salud de Utrillas, de 9:30 a 10:30.',
        NULL, NULL, 1, 'AVISO_MUNICIPAL:1:2', 'LEIDA', 1, (CURRENT_DATE + TIME '08:05')::timestamptz, (CURRENT_DATE + TIME '08:05')::timestamptz, (CURRENT_DATE + TIME '08:40')::timestamptz),
    (3, 2, 'CAMBIO_CONSULTA',     'Hoy no hay consulta en Fuenferrada',     'La consulta se pasa en el Centro de Salud de Utrillas, de 9:30 a 10:30.',
        NULL, NULL, 1, 'AVISO_MUNICIPAL:1:3', 'ENVIADA', 1, (CURRENT_DATE + TIME '08:05')::timestamptz, (CURRENT_DATE + TIME '08:05')::timestamptz, NULL),
    (2, 1, 'ENCARGO_ACTUALIZADO', 'Tu encargo está preparado',               'Horno San Jorge ha preparado tu encargo: 2 barras y tortas de aceite (5,00 €).',
        NULL, 1, NULL, 'ENCARGO_ACTUALIZADO:1:PREPARADO:2', 'LEIDA', 1, (CURRENT_DATE + TIME '09:20')::timestamptz, (CURRENT_DATE + TIME '09:20')::timestamptz, (CURRENT_DATE + TIME '09:31')::timestamptz),
    (5, 4, 'ENCARGO_ACTUALIZADO', 'Encargo de Joaquín aceptado',             'Horno San Jorge se lo llevará a casa hacia las 12:00.',
        NULL, 2, NULL, 'ENCARGO_ACTUALIZADO:2:ACEPTADO:5', 'LEIDA', 1, now() - interval '18 hours', now() - interval '18 hours', now() - interval '17 hours'),
    (2, 1, 'AVISO_MUNICIPAL',     'Corte de agua el miércoles',              'De 9:00 a 13:00 por una reparación en la red.',
        NULL, NULL, 2, 'AVISO_MUNICIPAL:2:2', 'LEIDA', 1, now() - interval '1 day', now() - interval '1 day', now() - interval '20 hours'),
    (6, NULL, 'NUEVO_ENCARGO',    'Nuevo encargo en Fuenferrada',            'Manuel Sanz: 1 pan integral y una barra de centeno si hay.',
        NULL, 5, NULL, 'NUEVO_ENCARGO:5:6', 'ENVIADA', 1, now() - interval '40 minutes', now() - interval '40 minutes', NULL),
    (7, NULL, 'NUEVO_ENCARGO',    'Nuevo encargo en Fuenferrada',            'María Pérez (pedido por Laura): 1 kg de merluza y 0,5 kg de boquerones.',
        NULL, 3, NULL, 'NUEVO_ENCARGO:3:7', 'ENVIADA', 1, now() - interval '2 hours', now() - interval '2 hours', NULL),
    (4, 3, 'SOLICITUD_FAMILIAR',  'Manuel quiere ayudarte en Claxon',        'Manuel Sanz ha pedido vincularse como familiar. Puedes aceptarlo o rechazarlo.',
        NULL, NULL, NULL, 'SOLICITUD_FAMILIAR:2:3:4', 'ENVIADA', 1, now() - interval '1 day', now() - interval '1 day', NULL);

-- -----------------------------------------------------------------------------
-- Tablones (el token en claro de la demo es «tablon-fuenferrada-demo»)
-- -----------------------------------------------------------------------------
INSERT INTO pantalla_tablon (municipio_id, nombre, ubicacion, token_hash, ultimo_acceso) VALUES
    (2, 'Tablón del bar',    'Bar La Plaza',            encode(sha256('tablon-fuenferrada-demo'::bytea), 'hex'), now() - interval '1 minute'),
    (3, 'Tablón del local',  'Local social',            encode(sha256('tablon-segura-demo'::bytea), 'hex'),      now() - interval '3 minutes'),
    (1, 'Tablón del centro', 'Hogar del jubilado',      encode(sha256('tablon-mdr-demo'::bytea), 'hex'),         now() - interval '2 days');

-- -----------------------------------------------------------------------------
-- Poner los contadores IDENTITY por encima de los ids insertados a mano
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    t RECORD;
BEGIN
    FOR t IN
        SELECT c.table_name, c.column_name
        FROM information_schema.columns c
        WHERE c.table_schema = 'claxon' AND c.is_identity = 'YES'
    LOOP
        EXECUTE format(
            'SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT max(%I) FROM claxon.%I), 0) + 1, FALSE)',
            'claxon.' || t.table_name, t.column_name, t.column_name, t.table_name);
    END LOOP;
END $$;

COMMIT;
