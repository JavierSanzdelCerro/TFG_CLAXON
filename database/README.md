# database/

| Archivo | Qué hace |
|---|---|
| `01_esquema.sql` | Crea el esquema `claxon`: 10 tablas, índices, 1 trigger y 5 vistas. Se puede relanzar: borra y vuelve a crear el esquema. |
| `02_datos_demo.sql` | Datos de ejemplo (pueblos de las Cuencas Mineras, vecinos, rutas, encargos...). «Hoy» siempre es el día en que se carga. |
| `03_pruebas.sql` | 31 pruebas: intenta guardar datos incorrectos y comprueba que se rechazan. No cambia nada (hace `ROLLBACK`). |
| `herramientas/exportar_modelo.py` | Lee la base de datos y regenera los diagramas de `docs/base-de-datos/`. |
| `herramientas/plantilla_diagrama.html` | Plantilla del diagrama interactivo. |

Documentación completa, decisiones de diseño y usuarios demo: [`docs/base-de-datos/README.md`](../docs/base-de-datos/README.md).

## Después de cambiar el esquema

```bash
docker compose down -v && docker compose up -d                 # recarga esquema y datos
docker exec claxon-db psql -U claxon -d claxon -f /pruebas/03_pruebas.sql   # pruebas
python3 database/herramientas/exportar_modelo.py                # regenera los diagramas
```

El script de exportación solo necesita `psql` instalado (viene con PostgreSQL, o `sudo apt install postgresql-client`).
