-- =============================================================================
--  CLAXON · Pruebas de integridad
--
--  Cada prueba intenta guardar algo incorrecto y comprueba que la base de datos
--  lo rechaza. Si alguna regla no salta, el script se para con «FALLO».
--  Todo va en una transacción que se deshace al final: no cambia datos.
--
--  Uso:  psql -d claxon -f 03_pruebas.sql
-- =============================================================================

SET search_path TO claxon, public;

BEGIN;

CREATE TEMP TABLE resultado (prueba TEXT, ok BOOLEAN) ON COMMIT DROP;

-- Ejecuta una sentencia que DEBE fallar con el código de error indicado
CREATE FUNCTION pg_temp.debe_fallar(p_prueba TEXT, p_sql TEXT, p_codigo TEXT) RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
    BEGIN
        EXECUTE p_sql;
    EXCEPTION WHEN OTHERS THEN
        IF SQLSTATE = p_codigo THEN
            INSERT INTO resultado VALUES (p_prueba, TRUE);
            RETURN;
        END IF;
        RAISE EXCEPTION 'FALLO en «%»: esperaba % y saltó % (%)', p_prueba, p_codigo, SQLSTATE, SQLERRM;
    END;
    RAISE EXCEPTION 'FALLO en «%»: la base de datos aceptó un dato incorrecto', p_prueba;
END $$;

-- Códigos: 23505 = repetido (UNIQUE) · 23503 = clave ajena · 23514 = regla CHECK

-- Usuarios
SELECT pg_temp.debe_fallar('Usuario con contraseña pero sin email ni teléfono',
    $q$INSERT INTO usuario (rol, nombre, password_hash, municipio_id) VALUES ('VECINO', 'X', 'hash', 2)$q$, '23514');
SELECT pg_temp.debe_fallar('Solo un vecino puede no tener contraseña',
    $q$INSERT INTO usuario (rol, nombre, telefono) VALUES ('FAMILIAR', 'X', '699000000')$q$, '23514');
SELECT pg_temp.debe_fallar('Vecino sin pueblo',
    $q$INSERT INTO usuario (rol, nombre) VALUES ('VECINO', 'X')$q$, '23514');
SELECT pg_temp.debe_fallar('Vendedor sin días ni hora de salida',
    $q$INSERT INTO usuario (rol, nombre, email, password_hash, nombre_comercial, categoria) VALUES ('VENDEDOR', 'X', 'x@x.es', 'h', 'X', 'PAN')$q$, '23514');
SELECT pg_temp.debe_fallar('Días de reparto mal escritos',
    $q$UPDATE usuario SET dias_reparto = 'LUNES' WHERE id = 6$q$, '23514');
SELECT pg_temp.debe_fallar('Email repetido',
    $q$INSERT INTO usuario (rol, nombre, email, password_hash) VALUES ('ADMIN', 'X', 'admin@claxon.app', 'h')$q$, '23505');
SELECT pg_temp.debe_fallar('Email con mayúsculas (se guarda en minúsculas)',
    $q$INSERT INTO usuario (rol, nombre, email, password_hash) VALUES ('ADMIN', 'X', 'Otro@Claxon.app', 'h')$q$, '23514');
SELECT pg_temp.debe_fallar('Rol inventado',
    $q$UPDATE usuario SET rol = 'JEFE' WHERE id = 1$q$, '23514');

-- Familias
SELECT pg_temp.debe_fallar('Familiar de sí mismo',
    $q$INSERT INTO familiar (familiar_id, vecino_id, parentesco) VALUES (2, 2, 'Yo')$q$, '23514');
SELECT pg_temp.debe_fallar('Vincular dos veces a las mismas personas',
    $q$INSERT INTO familiar (familiar_id, vecino_id, parentesco) VALUES (5, 2, 'Hija')$q$, '23505');

-- Paradas
SELECT pg_temp.debe_fallar('Dos paradas con el mismo orden',
    $q$INSERT INTO parada (vendedor_id, municipio_id, orden, minutos_desde_salida) VALUES (6, 5, 2, 10)$q$, '23505');
SELECT pg_temp.debe_fallar('Estado de hoy sin hora estimada',
    $q$UPDATE parada SET fecha = CURRENT_DATE, estado = 'PREVISTA' WHERE id = 8$q$, '23514');
SELECT pg_temp.debe_fallar('Marcar «en la parada» sin hora de llegada',
    $q$UPDATE parada SET estado = 'EN_PARADA' WHERE id = 2$q$, '23514');
SELECT pg_temp.debe_fallar('Parada en un pueblo que no existe',
    $q$INSERT INTO parada (vendedor_id, municipio_id, orden, minutos_desde_salida) VALUES (6, 99, 9, 10)$q$, '23503');

-- Suscripciones y encargos
SELECT pg_temp.debe_fallar('Suscripción repetida',
    $q$INSERT INTO suscripcion (vecino_id, vendedor_id) VALUES (2, 6)$q$, '23505');
SELECT pg_temp.debe_fallar('Aviso con 2 minutos de antelación',
    $q$UPDATE suscripcion SET minutos_antelacion = 2 WHERE vecino_id = 2 AND vendedor_id = 6$q$, '23514');
SELECT pg_temp.debe_fallar('Encargo rechazado sin motivo',
    $q$UPDATE encargo SET estado = 'RECHAZADO' WHERE id = 5$q$, '23514');
SELECT pg_temp.debe_fallar('Estado de encargo inventado',
    $q$UPDATE encargo SET estado = 'PERDIDO' WHERE id = 5$q$, '23514');
SELECT pg_temp.debe_fallar('Encargo en una parada que no existe',
    $q$INSERT INTO encargo (vecino_id, parada_id, fecha_entrega, creado_por_id) VALUES (2, 999, CURRENT_DATE, 2)$q$, '23503');
SELECT pg_temp.debe_fallar('Línea con cantidad 0',
    $q$INSERT INTO linea_encargo (encargo_id, descripcion, cantidad) VALUES (1, 'Nada', 0)$q$, '23514');
SELECT pg_temp.debe_fallar('Precio negativo',
    $q$UPDATE producto SET precio = -1 WHERE id = 1$q$, '23514');

-- Ayuntamiento
SELECT pg_temp.debe_fallar('Consulta con día de la semana Y fecha a la vez',
    $q$INSERT INTO consulta (municipio_id, dia_semana, fecha, hora_inicio, hora_fin) VALUES (2, 1, CURRENT_DATE, '09:00', '10:00')$q$, '23514');
SELECT pg_temp.debe_fallar('Consulta que acaba antes de empezar',
    $q$INSERT INTO consulta (municipio_id, dia_semana, hora_inicio, hora_fin) VALUES (2, 1, '11:00', '10:00')$q$, '23514');
SELECT pg_temp.debe_fallar('Cancelar el horario habitual (solo se cancela un día concreto)',
    $q$INSERT INTO consulta (municipio_id, dia_semana, hora_inicio, hora_fin, cancelada) VALUES (2, 2, '09:00', '10:00', TRUE)$q$, '23514');
SELECT pg_temp.debe_fallar('Aviso que caduca antes de empezar',
    $q$INSERT INTO aviso (autor_id, titulo, contenido, visible_desde, visible_hasta) VALUES (9, 'X', 'X', now(), now() - interval '1 day')$q$, '23514');
SELECT pg_temp.debe_fallar('Tablón sin enlace secreto',
    $q$UPDATE municipio SET tablon_ubicacion = 'Bar' WHERE id = 4$q$, '23514');

-- Lo correcto SÍ funciona ------------------------------------------------------

-- Reordenar paradas dentro de una transacción (gracias a DEFERRABLE)
SET CONSTRAINTS uq_parada_orden DEFERRED;
UPDATE parada SET orden = 3 WHERE id = 2;
UPDATE parada SET orden = 2 WHERE id = 3;
SET CONSTRAINTS uq_parada_orden IMMEDIATE;
INSERT INTO resultado VALUES ('Reordenar paradas en una transacción', TRUE);

-- El trigger apunta la hora al aceptar un encargo
UPDATE encargo SET estado = 'ACEPTADO' WHERE id = 5;
INSERT INTO resultado SELECT 'El trigger guarda la hora de aceptación', fecha_aceptado IS NOT NULL FROM encargo WHERE id = 5;

-- Joaquín no tiene móvil: el aviso de su llegada le llega solo a Laura
INSERT INTO resultado SELECT 'Joaquín (sin cuenta) avisa solo a Laura', destinatarios = ARRAY[5::bigint]
FROM v_avisos_llegada WHERE vecino_id = 12;

-- A María ya se le avisó hoy del pan: no sale otra vez (sin duplicados)
INSERT INTO resultado SELECT 'No se repite el aviso de llegada del mismo día', count(*) = 0
FROM v_avisos_llegada WHERE vecino_id = 2 AND vendedor_id = 6;

-- Un aviso con municipio NULL se ve en todos los pueblos
INSERT INTO resultado SELECT 'Aviso para todos los pueblos', count(DISTINCT municipio_id) = 5
FROM v_avisos_vigentes WHERE titulo LIKE 'Nuevo horario%';

-- Resumen ----------------------------------------------------------------------
DO $$
DECLARE total INT; buenos INT;
BEGIN
    SELECT count(*), count(*) FILTER (WHERE ok) INTO total, buenos FROM resultado;
    IF buenos <> total THEN RAISE EXCEPTION 'FALLO: % de % pruebas correctas', buenos, total; END IF;
    RAISE NOTICE '✔ % de % pruebas correctas', buenos, total;
END $$;

SELECT prueba, CASE WHEN ok THEN 'OK' ELSE 'FALLO' END AS resultado FROM resultado;

ROLLBACK;
