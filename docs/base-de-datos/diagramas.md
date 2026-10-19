# Diagramas de la base de datos

> Generado automáticamente con `database/herramientas/exportar_modelo.py` a partir de la base de datos real.
> No lo edites a mano: cambia el SQL y vuelve a ejecutar el script.

**10 tablas · 107 columnas · 17 relaciones · 5 vistas · 1 triggers · 40 reglas CHECK · 27 índices**

Cómo leer las relaciones: `||` exactamente uno · `|o` / `o|` cero o uno · `o{` cero o muchos.

## Vista general

Todas las tablas y cómo se relacionan (sin columnas, para que se lea bien).

```mermaid
erDiagram
    municipio |o--o{ aviso : "municipio_id"
    usuario ||--o{ aviso : "autor_id"
    municipio ||--o{ consulta : "municipio_id"
    usuario ||--o{ encargo : "vecino_id"
    parada ||--o{ encargo : "parada_id"
    usuario ||--o{ encargo : "creado_por_id"
    usuario ||--o{ familiar : "familiar_id"
    usuario ||--o{ familiar : "vecino_id"
    encargo ||--o{ linea_encargo : "encargo_id"
    producto |o--o{ linea_encargo : "producto_id"
    usuario |o--o{ municipio : "gestor_id"
    usuario ||--o{ parada : "vendedor_id"
    municipio ||--o{ parada : "municipio_id"
    usuario ||--o{ producto : "vendedor_id"
    usuario ||--o{ suscripcion : "vecino_id"
    usuario ||--o{ suscripcion : "vendedor_id"
    municipio |o--o{ usuario : "municipio_id"
```

## Pueblos y personas

- **`municipio`** · Pueblos donde funciona Claxon.
- **`usuario`** · Todas las personas: vecinos, familiares, vendedores, ayuntamiento y administración.
- **`familiar`** · Quién ayuda a quién: un familiar puede ayudar a varios vecinos y un vecino tener varios familiares.

```mermaid
erDiagram
    municipio {
        int id PK
        varchar nombre UK
        varchar comarca
        varchar provincia
        bigint gestor_id FK
        varchar tablon_ubicacion
        char tablon_token_hash UK
        bool activo
    }
    usuario {
        bigint id PK
        varchar roles
        varchar nombre
        varchar apellidos
        varchar email UK
        varchar telefono UK
        varchar password_hash
        int municipio_id FK
        varchar direccion
        bool necesita_ayuda_entrega
        varchar notas_entrega
        char codigo_familia UK
        varchar idioma
        varchar tamano_texto
        bool alto_contraste
        varchar token_push
        varchar nombre_comercial
        varchar categoria
        varchar dias_reparto
        time hora_salida
        bool acepta_encargos
        smallint horas_antelacion_encargo
        bool email_verificado
        bool activo
        timestamptz fecha_alta
        timestamptz ultimo_acceso
        timestamptz fecha_baja
    }
    familiar {
        bigint familiar_id PK,FK
        bigint vecino_id PK,FK
        varchar parentesco
        bool puede_hacer_encargos
        bool recibe_avisos
        varchar estado
        timestamptz fecha_solicitud
    }
    usuario ||--o{ familiar : "familiar_id"
    usuario ||--o{ familiar : "vecino_id"
    usuario |o--o{ municipio : "gestor_id"
    municipio |o--o{ usuario : "municipio_id"
```

## Vendedores

- **`producto`** · Catálogo del vendedor. Precio orientativo (NULL = según peso).
- **`parada`** · Paradas de la ruta del vendedor, en orden, y cómo va cada una hoy.
- **`suscripcion`** · De qué vendedores quiere aviso cada vecino y con cuánta antelación.

```mermaid
erDiagram
    producto {
        bigint id PK
        bigint vendedor_id FK
        varchar nombre
        numeric precio
        varchar unidad
        bool disponible
    }
    parada {
        bigint id PK
        bigint vendedor_id FK
        int municipio_id FK
        smallint orden
        varchar punto_encuentro
        smallint minutos_desde_salida
        date fecha
        timestamptz hora_estimada
        timestamptz hora_llegada
        varchar estado
    }
    suscripcion {
        bigint vecino_id PK,FK
        bigint vendedor_id PK,FK
        smallint minutos_antelacion
        bool activa
        date ultimo_aviso
    }
```

## Encargos

- **`encargo`** · Pedido para recoger cuando pase el vendedor. El vendedor es el de la parada. Se paga en mano.
- **`linea_encargo`** · Cada producto del encargo.

```mermaid
erDiagram
    encargo {
        bigint id PK
        bigint vecino_id FK
        bigint parada_id FK
        date fecha_entrega
        varchar estado
        bigint creado_por_id FK
        bool a_domicilio
        varchar notas
        varchar motivo_rechazo
        numeric importe_total
        timestamptz fecha_creacion
        timestamptz fecha_aceptado
        timestamptz fecha_preparado
        timestamptz fecha_entregado
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
    encargo ||--o{ linea_encargo : "encargo_id"
```

## Ayuntamiento

- **`consulta`** · Horario de consulta médica. Con dia_semana es el horario habitual; con fecha, un cambio de ese día.
- **`aviso`** · Avisos del ayuntamiento. Si va a dos pueblos, se guarda una fila por pueblo.

```mermaid
erDiagram
    consulta {
        bigint id PK
        int municipio_id FK
        varchar tipo
        smallint dia_semana
        date fecha
        time hora_inicio
        time hora_fin
        varchar lugar
        bool cancelada
        varchar motivo
    }
    aviso {
        bigint id PK
        int municipio_id FK
        bigint autor_id FK
        varchar categoria
        varchar titulo
        text contenido
        varchar prioridad
        varchar estado
        bool enviar_push
        timestamptz push_enviado
        timestamptz visible_desde
        timestamptz visible_hasta
        timestamptz fecha_creacion
    }
```

## Vistas

| Vista | Para qué sirve |
|---|---|
| `v_avisos_llegada` | A quién avisar de cada llegada y a qué hora (vecino y familiares). La lee la tarea programada. |
| `v_avisos_vigentes` | Avisos del ayuntamiento que se ven ahora en cada pueblo. |
| `v_consultas_hoy` | Consulta médica de hoy por pueblo; situacion = NORMAL, CAMBIO o CANCELADA. |
| `v_encargos_parada` | Encargos con el nombre del vecino y un resumen de productos, para el vendedor. |
| `v_servicios_hoy` | Qué vendedores pasan hoy por cada pueblo, a qué hora estimada y cómo van. |

## Triggers

| Tabla | Trigger | Función |
|---|---|---|
| `encargo` | `tg_encargo_fechas` | `fn_encargo_fechas()` |
