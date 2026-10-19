-- =============================================================================
--  CLAXON · Pruebas de integridad
--
--  Cada prueba intenta guardar algo incorrecto y comprueba que la base de datos
--  lo rechaza. Si alguna regla no salta, el script se para con «FALLO».
--  Todo va dentro de una transacción que se deshace al final: no cambia datos.
--
--  Uso:  psql -d claxon -f 03_pruebas.sql
-- =============================================================================

SET search_path TO claxon, public;
SET client_min_messages TO NOTICE;

BEGIN;

CREATE TEMP TABLE resultado (prueba TEXT, ok BOOLEAN) ON COMMIT DROP;

-- Ejecuta una sentencia que DEBE fallar con el código de error indicado
CREATE FUNCTION pg_temp.debe_fallar(p_prueba TEXT, p_sql TEXT, p_sqlstate TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = p_sqlstate THEN
            INSERT INTO resultado VALUES (p_prueba, TRUE);
            RETURN;
        END IF;
        RAISE EXCEPTION 'FALLO en «%»: esperaba % y saltó % (%)', p_prueba, p_sqlstate, SQLSTATE, SQLERRM;
    END;
    RAISE EXCEPTION 'FALLO en «%»: la base de datos aceptó un dato incorrecto', p_prueba;
END $$;

-- Códigos: 23505 = unique, 23503 = clave ajena, 23514 = check, 23502 = not null

-- Usuarios
SELECT pg_temp.debe_fallar('Usuario sin email ni teléfono',
    $q$INSERT INTO usuario (password_hash, nombre) VALUES ('x', 'Sin contacto')$q$, '23514');
SELECT pg_temp.debe_fallar('Email repetido (sin distinguir mayúsculas)',
    $q$INSERT INTO usuario (email, password_hash, nombre) VALUES ('ADMIN@claxon.app', 'x', 'Copia')$q$, '23505');
SELECT pg_temp.debe_fallar('Email con formato incorrecto',
    $q$INSERT INTO usuario (email, password_hash, nombre) VALUES ('no-es-un-email', 'x', 'Malo')$q$, '23514');
SELECT pg_temp.debe_fallar('Teléfono repetido',
    $q$INSERT INTO usuario (telefono, password_hash, nombre) VALUES ('600111222', 'x', 'Copia')$q$, '23505');
SELECT pg_temp.debe_fallar('Rol que no existe',
    $q$INSERT INTO rol (codigo, nombre) VALUES ('SUPERUSUARIO', 'X')$q$, '23514');
SELECT pg_temp.debe_fallar('Usuario dado de baja pero activo',
    $q$UPDATE usuario SET fecha_baja = now() WHERE id = 3$q$, '23514');

-- Familias
SELECT pg_temp.debe_fallar('Familiar de sí mismo',
    $q$INSERT INTO familiar_vecino (familiar_usuario_id, vecino_id, parentesco) VALUES (2, 1, 'Yo')$q$, '23514');
SELECT pg_temp.debe_fallar('Vínculo aceptado sin fecha de respuesta',
    $q$INSERT INTO familiar_vecino (familiar_usuario_id, vecino_id, parentesco, estado) VALUES (9, 2, 'Hija', 'ACEPTADA')$q$, '23514');

-- Rutas y jornadas
SELECT pg_temp.debe_fallar('Dos paradas con el mismo orden en una ruta',
    $q$INSERT INTO parada (ruta_id, municipio_id, orden, minutos_desde_salida) VALUES (1, 5, 2, 10)$q$, '23505');
SELECT pg_temp.debe_fallar('Día de la semana 8',
    $q$INSERT INTO ruta_dia VALUES (1, 8)$q$, '23514');
SELECT pg_temp.debe_fallar('Dos jornadas de la misma ruta el mismo día',
    $q$INSERT INTO jornada (ruta_id, fecha) VALUES (1, CURRENT_DATE)$q$, '23505');
SELECT pg_temp.debe_fallar('Jornada en curso sin hora de inicio',
    $q$INSERT INTO jornada (ruta_id, fecha, estado) VALUES (3, CURRENT_DATE + 30, 'EN_CURSO')$q$, '23514');
SELECT pg_temp.debe_fallar('Jornada cancelada sin motivo',
    $q$UPDATE jornada SET estado = 'CANCELADA' WHERE id = 3$q$, '23514');
SELECT pg_temp.debe_fallar('Paso por una parada de OTRA ruta',
    $q$INSERT INTO paso_parada (jornada_id, parada_id, hora_estimada) VALUES (2, 6, now())$q$, '23514');
SELECT pg_temp.debe_fallar('Llegada sin hora real',
    $q$UPDATE paso_parada SET estado = 'EN_PARADA' WHERE id = 6$q$, '23514');

-- Encargos
SELECT pg_temp.debe_fallar('Encargo en una parada de otro vendedor',
    $q$INSERT INTO encargo (vecino_id, vendedor_id, parada_id, fecha_entrega, creado_por_usuario_id) VALUES (1, 2, 2, CURRENT_DATE, 2)$q$, '23514');
SELECT pg_temp.debe_fallar('Encargo rechazado sin motivo',
    $q$UPDATE encargo SET estado = 'RECHAZADO' WHERE id = 5$q$, '23514');
SELECT pg_temp.debe_fallar('Estado de encargo inventado',
    $q$UPDATE encargo SET estado = 'PERDIDO' WHERE id = 5$q$, '23514');
SELECT pg_temp.debe_fallar('Línea con cantidad 0',
    $q$INSERT INTO linea_encargo (encargo_id, descripcion, cantidad) VALUES (1, 'Nada', 0)$q$, '23514');
SELECT pg_temp.debe_fallar('Encargo de un vecino que no existe',
    $q$INSERT INTO encargo (vecino_id, vendedor_id, parada_id, fecha_entrega, creado_por_usuario_id) VALUES (999, 1, 2, CURRENT_DATE, 2)$q$, '23503');
SELECT pg_temp.debe_fallar('Suscripción repetida',
    $q$INSERT INTO suscripcion (vecino_id, vendedor_id) VALUES (1, 1)$q$, '23505');
SELECT pg_temp.debe_fallar('Aviso con antelación de 2 minutos',
    $q$UPDATE suscripcion SET minutos_antelacion = 2 WHERE vecino_id = 1 AND vendedor_id = 1$q$, '23514');
SELECT pg_temp.debe_fallar('Suscripción a una parada de otro vendedor',
    $q$UPDATE suscripcion SET parada_id = 6 WHERE vecino_id = 1 AND vendedor_id = 1$q$, '23514');
SELECT pg_temp.debe_fallar('Precio negativo',
    $q$UPDATE producto SET precio = -1 WHERE id = 1$q$, '23514');

-- Ayuntamiento y salud
SELECT pg_temp.debe_fallar('Consulta que acaba antes de empezar',
    $q$INSERT INTO consulta_medica (municipio_id, dia_semana, hora_inicio, hora_fin) VALUES (2, 1, '11:00', '10:00')$q$, '23514');
SELECT pg_temp.debe_fallar('Cambio de horario sin horas nuevas',
    $q$INSERT INTO incidencia_consulta (consulta_id, fecha, tipo, publicado_por_usuario_id) VALUES (2, CURRENT_DATE + 3, 'CAMBIO_HORARIO', 9)$q$, '23514');
SELECT pg_temp.debe_fallar('Cambio de lugar sin lugar',
    $q$INSERT INTO incidencia_consulta (consulta_id, fecha, tipo, publicado_por_usuario_id) VALUES (2, CURRENT_DATE + 3, 'CAMBIO_LUGAR', 9)$q$, '23514');
SELECT pg_temp.debe_fallar('Dos incidencias de la misma consulta el mismo día',
    $q$INSERT INTO incidencia_consulta (consulta_id, fecha, tipo, publicado_por_usuario_id) VALUES (1, CURRENT_DATE, 'CANCELADA', 9)$q$, '23505');
SELECT pg_temp.debe_fallar('Aviso que caduca antes de publicarse',
    $q$INSERT INTO aviso (autor_usuario_id, titulo, contenido, visible_desde, visible_hasta) VALUES (9, 'X', 'X', now(), now() - interval '1 day')$q$, '23514');
SELECT pg_temp.debe_fallar('Aviso publicado sin fecha de publicación',
    $q$INSERT INTO aviso (autor_usuario_id, titulo, contenido, estado) VALUES (9, 'X', 'X', 'PUBLICADO')$q$, '23514');

-- Notificaciones
SELECT pg_temp.debe_fallar('Notificación duplicada (mismo aviso de llegada al mismo usuario)',
    $q$INSERT INTO notificacion (usuario_id, tipo, titulo, cuerpo, clave_deduplicacion) VALUES (2, 'LLEGADA_PROXIMA', 'X', 'X', 'LLEGADA_PROXIMA:6:2')$q$, '23505');
SELECT pg_temp.debe_fallar('Tipo de notificación inventado',
    $q$INSERT INTO notificacion (usuario_id, tipo, titulo, cuerpo, clave_deduplicacion) VALUES (2, 'SPAM', 'X', 'X', 'x1')$q$, '23514');

-- Comprobaciones de que lo correcto SÍ funciona ------------------------------

-- Reordenar paradas dentro de una transacción (gracias a DEFERRABLE)
SET CONSTRAINTS uq_parada_orden DEFERRED;
UPDATE parada SET orden = 3 WHERE id = 2;
UPDATE parada SET orden = 2 WHERE id = 3;
SET CONSTRAINTS uq_parada_orden IMMEDIATE;
INSERT INTO resultado VALUES ('Reordenar paradas en una transacción', TRUE);

-- El trigger guarda el historial al cambiar el estado
UPDATE encargo SET estado = 'ACEPTADO' WHERE id = 5;
INSERT INTO resultado
SELECT 'El historial guarda los cambios de estado', count(*) = 2
FROM historial_encargo WHERE encargo_id = 5;

-- fecha_actualizacion se renueva sola
INSERT INTO resultado
SELECT 'fecha_actualizacion se actualiza sola', fecha_actualizacion > fecha_creacion
FROM encargo WHERE id = 5;

-- Un vecino sin cuenta solo avisa a su familiar
INSERT INTO resultado
SELECT 'Joaquín (sin cuenta) avisa solo a Laura', array_agg(usuario_id) = ARRAY[5::bigint]
FROM v_destinatarios_llegada WHERE vecino_id = 4;

-- Resumen ---------------------------------------------------------------------
DO $$
DECLARE
    total INT; buenos INT;
BEGIN
    SELECT count(*), count(*) FILTER (WHERE ok) INTO total, buenos FROM resultado;
    IF buenos <> total THEN
        RAISE EXCEPTION 'FALLO: % de % pruebas correctas', buenos, total;
    END IF;
    RAISE NOTICE '✔ % de % pruebas correctas', buenos, total;
END $$;

SELECT prueba, CASE WHEN ok THEN 'OK' ELSE 'FALLO' END AS resultado FROM resultado;

ROLLBACK;
