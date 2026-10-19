# Base de datos de Claxon

PostgreSQL 16 · **10 tablas** · 5 vistas · 1 trigger · 31 pruebas automáticas.

![Diagrama entidad-relación de Claxon](diagrama-er.png)

## Las 10 tablas

| Bloque | Tabla | Qué guarda |
|---|---|---|
| Pueblos y personas | `municipio` | Los pueblos, quién del ayuntamiento los gestiona y su tablón del bar. |
| | `usuario` | **Todas las personas**: vecinos, familiares, vendedores, ayuntamiento y administración. |
| | `familiar` | Quién ayuda a quién (un familiar ↔ un vecino). |
| Vendedores | `producto` | Catálogo de cada vendedor. |
| | `parada` | Paradas de la ruta del vendedor y cómo va cada una **hoy**. |
| | `suscripcion` | De qué vendedores quiere aviso cada vecino y cuántos minutos antes. |
| Encargos | `encargo` | Pedido para recoger al pasar el vendedor. |
| | `linea_encargo` | Productos de cada encargo. |
| Ayuntamiento | `consulta` | Horario de consulta médica y cambios de un día concreto. |
| | `aviso` | Avisos del ayuntamiento. |

## Cómo verla

| Archivo | Para qué |
|---|---|
| [`diagrama-er.html`](diagrama-er.html) | **Diagrama interactivo.** Descárgalo y ábrelo con doble clic: pulsa una tabla y ves sus columnas y relaciones. |
| [`diagrama-er.png`](diagrama-er.png) | El mismo mapa como imagen. |
| [`diagramas.md`](diagramas.md) | Diagramas Mermaid (GitHub los dibuja directamente). |
| [`claxon.dbml`](claxon.dbml) | Para [dbdiagram.io](https://dbdiagram.io) (*Import → DBML*). |

Todos se generan desde la base de datos real con `database/herramientas/exportar_modelo.py`.

## Arrancarla

```bash
docker compose up -d          # PostgreSQL en localhost:5432 + Adminer en http://localhost:8081
```

- La primera vez carga el esquema y los datos demo.
- **Adminer**: sistema *PostgreSQL*, servidor `db`, usuario `claxon`, contraseña `claxon`, base de datos `claxon`.
- Recargar desde cero: `docker compose down -v && docker compose up -d`.
- Pruebas: `docker exec claxon-db psql -U claxon -d claxon -f /pruebas/03_pruebas.sql`.

## Usuarios demo

Contraseña de todos: **`Claxon2026!`**

| Quién | Entra con | Rol | Para probar |
|---|---|---|---|
| María Pérez | `600111222` | Vecina de Fuenferrada | «Hoy», encargo preparado, cambio de consulta |
| Manuel Sanz | `manuel.sanz@demo.claxon` | Vecino de Fuenferrada | Encargo sin aceptar |
| Carmen López | `carmen.lopez@demo.claxon` | Vecina de Segura de los Baños | Aviso del pescado 30 min antes |
| Teresa Aznar | `600777888` | Vecina de Martín del Río | Encargo de fruta para el martes |
| Joaquín Pérez | — (no tiene móvil) | Vecino de La Hoz de la Vieja | Lo gestiona Laura |
| Laura Pérez | `laura.perez@demo.claxon` | Familiar de María y Joaquín | Encargar por otros |
| Jorge Lázaro | `horno.sanjorge@demo.claxon` | Vendedor (Horno San Jorge) | Ruta del pan en camino |
| Antonio Gil | `pescados.gil@demo.claxon` | Vendedor (Pescados Gil) | Ruta prevista para las 11:30 |
| Pilar Royo | `frutas.pilar@demo.claxon` | Vendedora (Frutas Pilar) | Hoy no reparte |
| Ana Martín | `secretaria@demo.claxon` | Ayuntamiento de 3 pueblos | Avisos y consulta |
| Luis Navarro | `alcaldia.mdr@demo.claxon` | Ayuntamiento de Martín del Río | Aviso de fiestas |
| Equipo Claxon | `admin@claxon.app` | Administración | Resumen del piloto |

«Hoy» siempre es el día en que se cargan los datos: el pan va de camino a Fuenferrada (10:40), el pescado está previsto a las 12:15 y la consulta de Fuenferrada se pasa en Utrillas.

## Cómo se hace cada cosa con 10 tablas

**Todas las personas en `usuario`.** La columna `rol` dice quién es. Los datos del vendedor (`nombre_comercial`, `categoria`, `dias_reparto`, `hora_salida`) solo se rellenan si `rol = 'VENDEDOR'`; una regla CHECK lo obliga. Así no hacen falta tablas aparte de vecinos, vendedores y roles.

**Vecino sin móvil.** Es un `usuario` con `password_hash` vacío: no puede entrar, pero existe, tiene dirección y encargos. Su familiar lo gestiona y recibe sus avisos. Solo un VECINO puede no tener contraseña.

**La ruta es la lista de paradas.** Cada `parada` tiene su orden y los minutos desde la salida. Los días y la hora de salida están en el vendedor (`dias_reparto = 'LMXJVS'`, `hora_salida = 09:45`).

**Cómo va hoy, en la propia parada.** `fecha`, `hora_estimada`, `hora_llegada` y `estado` se sobrescriben cada día de reparto:

| Momento | Qué hace el servidor |
|---|---|
| Por la mañana (tarea programada) | Pone las paradas de hoy en `PREVISTA` con la hora calculada desde `hora_salida`. |
| «Iniciar ruta» | Recalcula las horas con la hora real de salida → `EN_CAMINO`. |
| «Avisar de retraso» | Suma los minutos a `hora_estimada` de las paradas que faltan. |
| «He llegado» | `hora_llegada = now()` → `EN_PARADA`; al salir → `HECHA`. |
| «Hoy no puedo» | Las paradas que faltan → `CANCELADA`. |

**Sin avisos repetidos.** `suscripcion.ultimo_aviso` guarda el día del último aviso de llegada; si ya es hoy, no se manda otro. Con los avisos del ayuntamiento pasa lo mismo con `aviso.push_enviado`. La vista `v_avisos_llegada` devuelve a quién avisar (el vecino y sus familiares) y a qué hora.

**El encargo no repite el vendedor.** El vendedor es el de la parada (`encargo → parada → vendedor`), así es imposible encargar a un vendedor en una parada que no es suya. La línea de tiempo «Enviado → Aceptado → Preparado → Entregado» sale de cuatro fechas del encargo, que rellena un trigger al cambiar el estado.

**Consulta médica en una tabla.** Las filas con `dia_semana` son el horario habitual; las filas con `fecha` son el cambio de ese día (otro lugar, otra hora o `cancelada`). La vista `v_consultas_hoy` junta las dos cosas. No se guardan datos de salud.

**Avisos para varios pueblos.** `municipio_id` vacío = todos los pueblos. Si es para dos pueblos concretos, el panel guarda una fila por pueblo.

**Gestor del ayuntamiento.** Cada pueblo tiene un `gestor_id`. Una secretaria que lleva tres pueblos aparece como gestora en los tres.

**Tablón del bar.** El enlace secreto del tablón se guarda cifrado en el propio pueblo (`municipio.tablon_token_hash`).

## Qué se ha simplificado (y por qué no afecta a las pantallas)

| Antes (31 tablas) | Ahora | Lo que se pierde |
|---|---|---|
| `provincia`, `comarca` | Columnas de `municipio` | Nada para el piloto. |
| `rol`, `usuario_rol` | Columna `usuario.rol` | Una persona no puede tener dos roles a la vez (por ejemplo, vendedor y vecino). |
| `vecino`, `vendedor`, `vendedor_categoria`, `categoria_servicio` | Columnas de `usuario` | Un vendedor tiene una sola categoría. |
| `dispositivo`, `token_refresco` | `usuario.token_push`; sesión con JWT sin guardar | Un solo móvil por persona. |
| `ruta`, `ruta_dia`, `jornada`, `paso_parada` | `parada` + días y hora en el vendedor | Una ruta por vendedor; no se guarda el histórico de horas de días pasados. |
| `notificacion` | `suscripcion.ultimo_aviso` y `aviso.push_enviado` | No hay registro de cada notificación enviada. |
| `historial_encargo` | Cuatro fechas en `encargo` | Quién hizo cada cambio. |
| `centro_salud`, `consulta_medica`, `incidencia_consulta` | `consulta` | Nada visible. |
| `aviso_municipio`, `gestor_municipal`, `pantalla_tablon` | Columnas en `aviso` y `municipio` | Un pueblo tiene un solo gestor y un solo tablón. |

Si en el futuro hiciera falta algo de esto, se añade la tabla con una migración nueva sin tocar lo demás.

## Conexión desde Spring Boot

```yaml
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/claxon
    username: claxon
    password: claxon
  jpa:
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        default_schema: claxon
        jdbc.time_zone: Europe/Madrid
```

Recomendación: mover `01_esquema.sql` a `src/main/resources/db/migration/V1__esquema_inicial.sql` y usar **Flyway**.
