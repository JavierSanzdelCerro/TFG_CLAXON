# Diagramas de la base de datos

> Generado automáticamente con `database/herramientas/exportar_modelo.py` a partir de la base de datos real.
> No lo edites a mano: cambia el SQL y vuelve a ejecutar el script.

**31 tablas · 236 columnas · 53 relaciones · 5 vistas · 6 triggers · 50 reglas CHECK · 80 índices**

Cómo leer las relaciones: `||` exactamente uno · `|o` / `o|` cero o uno · `o{` cero o muchos.

## Vista general

Todas las tablas y cómo se relacionan (sin columnas, para que se lea bien).

```mermaid
erDiagram
    usuario ||--o{ aviso : "autor_usuario_id"
    aviso ||--o{ aviso_municipio : "aviso_id"
    municipio ||--o{ aviso_municipio : "municipio_id"
    municipio ||--o{ centro_salud : "municipio_id"
    provincia ||--o{ comarca : "provincia_id"
    municipio ||--o{ consulta_medica : "municipio_id"
    centro_salud |o--o{ consulta_medica : "centro_salud_id"
    usuario ||--o{ dispositivo : "usuario_id"
    vecino ||--o{ encargo : "vecino_id"
    vendedor ||--o{ encargo : "vendedor_id"
    parada ||--o{ encargo : "parada_id"
    usuario ||--o{ encargo : "creado_por_usuario_id"
    usuario ||--o{ familiar_vecino : "familiar_usuario_id"
    vecino ||--o{ familiar_vecino : "vecino_id"
    usuario ||--o{ gestor_municipal : "usuario_id"
    municipio ||--o{ gestor_municipal : "municipio_id"
    encargo ||--o{ historial_encargo : "encargo_id"
    usuario |o--o{ historial_encargo : "usuario_id"
    consulta_medica ||--o{ incidencia_consulta : "consulta_id"
    centro_salud |o--o{ incidencia_consulta : "centro_alternativo_id"
    aviso |o--o{ incidencia_consulta : "aviso_id"
    usuario ||--o{ incidencia_consulta : "publicado_por_usuario_id"
    ruta ||--o{ jornada : "ruta_id"
    encargo ||--o{ linea_encargo : "encargo_id"
    producto |o--o{ linea_encargo : "producto_id"
    provincia ||--o{ municipio : "provincia_id"
    comarca |o--o{ municipio : "comarca_id"
    usuario ||--o{ notificacion : "usuario_id"
    vecino |o--o{ notificacion : "vecino_id"
    paso_parada |o--o{ notificacion : "paso_parada_id"
    encargo |o--o{ notificacion : "encargo_id"
    aviso |o--o{ notificacion : "aviso_id"
    municipio ||--o{ pantalla_tablon : "municipio_id"
    ruta ||--o{ parada : "ruta_id"
    municipio ||--o{ parada : "municipio_id"
    jornada ||--o{ paso_parada : "jornada_id"
    parada ||--o{ paso_parada : "parada_id"
    vendedor ||--o{ producto : "vendedor_id"
    categoria_servicio |o--o{ producto : "categoria_id"
    vendedor ||--o{ ruta : "vendedor_id"
    ruta ||--o{ ruta_dia : "ruta_id"
    vecino ||--o{ suscripcion : "vecino_id"
    vendedor ||--o{ suscripcion : "vendedor_id"
    parada |o--o{ suscripcion : "parada_id"
    usuario ||--o{ token_refresco : "usuario_id"
    usuario ||--o{ usuario_rol : "usuario_id"
    rol ||--o{ usuario_rol : "rol_id"
    usuario |o--o| vecino : "usuario_id"
    municipio ||--o{ vecino : "municipio_id"
    usuario ||--o| vendedor : "usuario_id"
    municipio |o--o{ vendedor : "municipio_base_id"
    vendedor ||--o{ vendedor_categoria : "vendedor_id"
    categoria_servicio ||--o{ vendedor_categoria : "categoria_id"
```

## Territorio

- **`provincia`** · Provincias donde opera Claxon (el piloto empieza en Teruel).
- **`comarca`** · Comarcas (en Aragón agrupan servicios entre pueblos cercanos).
- **`municipio`** · Pueblos dados de alta en Claxon.

```mermaid
erDiagram
    provincia {
        smallint id PK
        varchar nombre UK
        char codigo_ine UK
    }
    comarca {
        smallint id PK
        smallint provincia_id FK
        varchar nombre
    }
    municipio {
        int id PK
        smallint provincia_id FK
        smallint comarca_id FK
        varchar nombre
        char codigo_ine UK
        int habitantes
        numeric latitud
        numeric longitud
        bool activo
        timestamptz fecha_alta
    }
    provincia ||--o{ comarca : "provincia_id"
    provincia ||--o{ municipio : "provincia_id"
    comarca |o--o{ municipio : "comarca_id"
```

## Usuarios y seguridad

- **`usuario`** · Cuenta para entrar en la app o en el panel web. Un usuario puede tener varios roles.
- **`rol`** · Perfiles de la aplicación. Se usan en Spring Security como ROLE_<codigo>.
- **`usuario_rol`** · Relación N:M: un vendedor también puede ser vecino de su pueblo, por ejemplo.
- **`token_refresco`** · Tokens de refresco del JWT. Permite cerrar sesión en un dispositivo concreto.
- **`dispositivo`** · Móviles de cada usuario donde se envían las notificaciones push.

```mermaid
erDiagram
    usuario {
        bigint id PK
        varchar email
        varchar telefono UK
        varchar password_hash
        varchar nombre
        varchar apellidos
        varchar tamano_texto
        bool alto_contraste
        varchar idioma
        bool email_verificado
        bool activo
        timestamptz fecha_alta
        timestamptz ultimo_acceso
        timestamptz fecha_baja
    }
    rol {
        smallint id PK
        varchar codigo UK
        varchar nombre
        varchar descripcion
    }
    usuario_rol {
        bigint usuario_id PK,FK
        smallint rol_id PK,FK
        timestamptz fecha_asignacion
    }
    token_refresco {
        bigint id PK
        bigint usuario_id FK
        char token_hash UK
        timestamptz fecha_creacion
        timestamptz fecha_expiracion
        bool revocado
        varchar agente_usuario
    }
    dispositivo {
        bigint id PK
        bigint usuario_id FK
        varchar token_push UK
        varchar plataforma
        varchar modelo
        bool activo
        timestamptz fecha_registro
        timestamptz ultimo_uso
    }
    usuario ||--o{ dispositivo : "usuario_id"
    usuario ||--o{ token_refresco : "usuario_id"
    usuario ||--o{ usuario_rol : "usuario_id"
    rol ||--o{ usuario_rol : "rol_id"
```

## Vecinos y familias

- **`vecino`** · Persona que vive en el pueblo. Puede NO tener cuenta: en ese caso la gestiona un familiar.
- **`familiar_vecino`** · Familiares que ayudan a un vecino desde fuera del pueblo.

```mermaid
erDiagram
    vecino {
        bigint id PK
        bigint usuario_id FK,UK
        int municipio_id FK
        varchar nombre
        varchar apellidos
        varchar telefono
        varchar direccion
        bool necesita_ayuda_entrega
        varchar notas_entrega
        bool activo
        timestamptz fecha_alta
    }
    familiar_vecino {
        bigint familiar_usuario_id PK,FK
        bigint vecino_id PK,FK
        varchar parentesco
        bool puede_hacer_encargos
        bool recibe_avisos
        varchar estado
        char codigo_invitacion
        timestamptz fecha_solicitud
        timestamptz fecha_respuesta
    }
    vecino ||--o{ familiar_vecino : "vecino_id"
```

## Vendedores y catálogo

- **`categoria_servicio`** · Tipos de servicio ambulante: pan, pescado, fruta, carne...
- **`vendedor`** · Negocio ambulante (panadería, pescadería...).
- **`vendedor_categoria`** · Un vendedor puede ofrecer varias categorías (p. ej. pan y bollería, fruta y verdura).
- **`producto`** · Catálogo opcional del vendedor. Si no tiene, los encargos se hacen con texto libre.

```mermaid
erDiagram
    categoria_servicio {
        smallint id PK
        varchar codigo UK
        varchar nombre
        varchar icono
        char color
    }
    vendedor {
        bigint id PK
        bigint usuario_id FK,UK
        varchar nombre_comercial
        varchar nif UK
        varchar telefono_contacto
        varchar descripcion
        int municipio_base_id FK
        bool acepta_encargos
        smallint horas_antelacion_encargo
        bool activo
        timestamptz fecha_alta
    }
    vendedor_categoria {
        bigint vendedor_id PK,FK
        smallint categoria_id PK,FK
    }
    producto {
        bigint id PK
        bigint vendedor_id FK
        smallint categoria_id FK
        varchar nombre
        varchar descripcion
        numeric precio
        varchar unidad
        bool disponible
        timestamptz fecha_creacion
    }
    vendedor ||--o{ producto : "vendedor_id"
    categoria_servicio |o--o{ producto : "categoria_id"
    vendedor ||--o{ vendedor_categoria : "vendedor_id"
    categoria_servicio ||--o{ vendedor_categoria : "categoria_id"
```

## Rutas

- **`ruta`** · Plantilla de recorrido habitual de un vendedor (qué pueblos y en qué orden).
- **`ruta_dia`** · Días de la semana en que se hace la ruta.
- **`parada`** · Punto donde para el vendedor en cada pueblo de la ruta.
- **`jornada`** · Una ruta en un día concreto. Se crea al pulsar «Iniciar ruta» o la genera una tarea programada.
- **`paso_parada`** · Paso del vendedor por cada parada en una jornada. Aquí vive la hora estimada que ve el vecino.

```mermaid
erDiagram
    ruta {
        bigint id PK
        bigint vendedor_id FK
        varchar nombre
        varchar descripcion
        time hora_salida_prevista
        bool activa
        timestamptz fecha_creacion
    }
    ruta_dia {
        bigint ruta_id PK,FK
        smallint dia_semana PK
    }
    parada {
        bigint id PK
        bigint ruta_id FK
        int municipio_id FK
        smallint orden
        varchar punto_encuentro
        smallint minutos_desde_salida
        smallint duracion_estimada_min
        numeric latitud
        numeric longitud
        bool activa
    }
    jornada {
        bigint id PK
        bigint ruta_id FK
        date fecha
        varchar estado
        timestamptz hora_inicio_real
        timestamptz hora_fin_real
        smallint retraso_minutos
        varchar motivo_cancelacion
        timestamptz fecha_creacion
    }
    paso_parada {
        bigint id PK
        bigint jornada_id FK
        bigint parada_id FK
        timestamptz hora_estimada
        timestamptz hora_llegada_real
        timestamptz hora_salida_real
        varchar estado
    }
    ruta ||--o{ jornada : "ruta_id"
    ruta ||--o{ parada : "ruta_id"
    jornada ||--o{ paso_parada : "jornada_id"
    parada ||--o{ paso_parada : "parada_id"
    ruta ||--o{ ruta_dia : "ruta_id"
```

## Suscripciones y encargos

- **`suscripcion`** · Qué vendedores quiere que le avisen a cada vecino y con cuánta antelación.
- **`encargo`** · Pedido que el vecino deja hecho para recoger cuando pase el vendedor. El pago es en mano.
- **`linea_encargo`** · Cada producto del encargo.
- **`historial_encargo`** · Trazabilidad de los cambios de estado de cada encargo (se rellena con un trigger).

```mermaid
erDiagram
    suscripcion {
        bigint id PK
        bigint vecino_id FK
        bigint vendedor_id FK
        bigint parada_id FK
        smallint minutos_antelacion
        bool activa
        timestamptz fecha_creacion
    }
    encargo {
        bigint id PK
        bigint vecino_id FK
        bigint vendedor_id FK
        bigint parada_id FK
        date fecha_entrega
        varchar estado
        bigint creado_por_usuario_id FK
        bool entrega_a_domicilio
        varchar notas
        varchar motivo_rechazo
        numeric importe_total
        timestamptz fecha_creacion
        timestamptz fecha_actualizacion
    }
    linea_encargo {
        bigint id PK
        bigint encargo_id FK
        bigint producto_id FK
        varchar descripcion
        numeric cantidad
        varchar unidad
        numeric precio_unitario
    }
    historial_encargo {
        bigint id PK
        bigint encargo_id FK
        varchar estado_anterior
        varchar estado_nuevo
        bigint usuario_id FK
        varchar comentario
        timestamptz fecha
    }
    encargo ||--o{ historial_encargo : "encargo_id"
    encargo ||--o{ linea_encargo : "encargo_id"
```

## Ayuntamiento y salud

- **`gestor_municipal`** · Personas del ayuntamiento que publican avisos. N:M porque un secretario suele llevar varios pueblos.
- **`centro_salud`** · Centro de salud de referencia de la zona (p. ej. Utrillas).
- **`consulta_medica`** · Horario semanal habitual de consulta en el pueblo. Sin datos clínicos.
- **`incidencia_consulta`** · Cambio puntual de una consulta: "Hoy no hay consulta, id a Utrillas".
- **`aviso`** · Avisos del ayuntamiento (cortes de agua, cambios de consulta, fiestas...).
- **`aviso_municipio`** · Un aviso puede ir a varios pueblos a la vez (p. ej. toda la comarca).

```mermaid
erDiagram
    gestor_municipal {
        bigint usuario_id PK,FK
        int municipio_id PK,FK
        varchar cargo
        timestamptz fecha_alta
    }
    centro_salud {
        int id PK
        int municipio_id FK
        varchar nombre
        varchar direccion
        varchar telefono
    }
    consulta_medica {
        bigint id PK
        int municipio_id FK
        int centro_salud_id FK
        varchar tipo
        smallint dia_semana
        time hora_inicio
        time hora_fin
        varchar lugar
        bool activa
    }
    incidencia_consulta {
        bigint id PK
        bigint consulta_id FK
        date fecha
        varchar tipo
        time hora_inicio_nueva
        time hora_fin_nueva
        varchar lugar_alternativo
        int centro_alternativo_id FK
        varchar motivo
        bigint aviso_id FK
        bigint publicado_por_usuario_id FK
        timestamptz fecha_publicacion
    }
    aviso {
        bigint id PK
        bigint autor_usuario_id FK
        varchar categoria
        varchar titulo
        text contenido
        varchar prioridad
        varchar estado
        bool enviar_push
        timestamptz visible_desde
        timestamptz visible_hasta
        timestamptz fecha_creacion
        timestamptz fecha_publicacion
    }
    aviso_municipio {
        bigint aviso_id PK,FK
        int municipio_id PK,FK
    }
    aviso ||--o{ aviso_municipio : "aviso_id"
    centro_salud |o--o{ consulta_medica : "centro_salud_id"
    consulta_medica ||--o{ incidencia_consulta : "consulta_id"
    centro_salud |o--o{ incidencia_consulta : "centro_alternativo_id"
    aviso |o--o{ incidencia_consulta : "aviso_id"
```

## Notificaciones y tablón

- **`notificacion`** · Bandeja de avisos de cada usuario y registro de lo enviado por FCM.
- **`pantalla_tablon`** · Pantallas del tablón web (bar, local social). Entran con un enlace secreto, sin usuario.

```mermaid
erDiagram
    notificacion {
        bigint id PK
        bigint usuario_id FK
        bigint vecino_id FK
        varchar tipo
        varchar titulo
        varchar cuerpo
        bigint paso_parada_id FK
        bigint encargo_id FK
        bigint aviso_id FK
        varchar clave_deduplicacion UK
        varchar estado
        smallint intentos
        varchar ultimo_error
        timestamptz fecha_programada
        timestamptz fecha_envio
        timestamptz fecha_lectura
    }
    pantalla_tablon {
        int id PK
        int municipio_id FK
        varchar nombre
        varchar ubicacion
        char token_hash UK
        bool activa
        timestamptz fecha_alta
        timestamptz ultimo_acceso
    }
```

## Vistas

| Vista | Para qué sirve |
|---|---|
| `v_avisos_vigentes` | Avisos del ayuntamiento que se deben mostrar ahora en cada pueblo. |
| `v_consultas_hoy` | Consulta médica de hoy por pueblo; situacion = NORMAL, CANCELADA, CAMBIO_HORARIO o CAMBIO_LUGAR. |
| `v_destinatarios_llegada` | La usa la tarea programada: cada minuto busca filas con hora_aviso <= now() y crea la notificación (la clave evita duplicados). |
| `v_encargos_parada` | Encargos con el nombre del vecino y un resumen de productos, para la lista del vendedor. |
| `v_servicios_hoy` | Qué servicios pasan hoy por cada pueblo y a qué hora estimada. |

## Triggers

| Tabla | Trigger | Función |
|---|---|---|
| `encargo` | `tg_encargo_fecha_actualizacion` | `fn_tocar_fecha_actualizacion()` |
| `encargo` | `tg_encargo_historial` | `fn_encargo_auditar()` |
| `encargo` | `tg_encargo_validar` | `fn_validar_encargo()` |
| `familiar_vecino` | `tg_familiar_validar` | `fn_validar_familiar()` |
| `paso_parada` | `tg_paso_parada_validar` | `fn_validar_paso_parada()` |
| `suscripcion` | `tg_suscripcion_validar` | `fn_validar_suscripcion()` |
