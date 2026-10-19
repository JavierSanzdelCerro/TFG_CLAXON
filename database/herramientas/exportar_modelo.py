#!/usr/bin/env python3
"""
Exporta el modelo de datos de Claxon leyendo la base de datos real.

Genera, a partir de lo que hay en PostgreSQL (nunca a mano):
  docs/base-de-datos/modelo.json         → datos del modelo (tablas, columnas, relaciones, vistas)
  docs/base-de-datos/claxon.dbml         → para abrir en https://dbdiagram.io
  docs/base-de-datos/diagramas.md        → diagramas Mermaid (GitHub los dibuja solos)
  docs/base-de-datos/diagrama-er.html    → diagrama interactivo (a partir de plantilla_diagrama.html)

Uso:
  python3 database/herramientas/exportar_modelo.py [cadena_de_conexion]
  (por defecto: postgresql://claxon:claxon@localhost:5432/claxon, la del docker-compose)

Solo necesita el cliente «psql» instalado.
"""
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
SALIDA = RAIZ / "docs" / "base-de-datos"
PLANTILLA = Path(__file__).with_name("plantilla_diagrama.html")
DSN = sys.argv[1] if len(sys.argv) > 1 else "postgresql://claxon:claxon@localhost:5432/claxon"

# Bloques funcionales (orden = orden de lectura en los diagramas)
BLOQUES = [
    ("personas",     "Pueblos y personas", ["municipio", "usuario", "familiar"]),
    ("vendedores",   "Vendedores",         ["producto", "parada", "suscripcion"]),
    ("encargos",     "Encargos",           ["encargo", "linea_encargo"]),
    ("ayuntamiento", "Ayuntamiento",       ["consulta", "aviso"]),
]

CONSULTA = r"""
WITH
tablas AS (
    SELECT c.oid, c.relname AS nombre, obj_description(c.oid, 'pg_class') AS comentario
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'claxon' AND c.relkind = 'r'
),
pk AS (
    SELECT con.conrelid, unnest(con.conkey) AS attnum
    FROM pg_constraint con WHERE con.contype = 'p'
),
uq AS (   -- columnas con UNIQUE de una sola columna (restricción o índice único)
    SELECT i.indrelid AS conrelid, i.indkey[0] AS attnum
    FROM pg_index i
    WHERE i.indisunique AND NOT i.indisprimary AND i.indnatts = 1 AND i.indkey[0] <> 0
),
fk AS (
    SELECT con.conrelid, con.confrelid, con.conname,
           unnest(con.conkey) AS attnum, unnest(con.confkey) AS fattnum,
           con.confdeltype
    FROM pg_constraint con WHERE con.contype = 'f'
),
columnas AS (
    SELECT a.attrelid, a.attnum, a.attname AS nombre,
           format_type(a.atttypid, a.atttypmod) AS tipo,
           a.attnotnull AS no_nulo,
           a.attidentity <> '' AS identidad,
           pg_get_expr(d.adbin, d.adrelid) AS por_defecto,
           col_description(a.attrelid, a.attnum) AS comentario
    FROM pg_attribute a
    LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attnum > 0 AND NOT a.attisdropped
)
SELECT json_build_object(
  'tablas', (
    SELECT json_agg(json_build_object(
        'nombre', t.nombre,
        'comentario', t.comentario,
        'columnas', (
            SELECT json_agg(json_build_object(
                'nombre', c.nombre,
                'tipo', c.tipo,
                'no_nulo', c.no_nulo,
                'identidad', c.identidad,
                'por_defecto', c.por_defecto,
                'comentario', c.comentario,
                'pk', EXISTS (SELECT 1 FROM pk WHERE pk.conrelid = t.oid AND pk.attnum = c.attnum),
                'unico', EXISTS (SELECT 1 FROM uq WHERE uq.conrelid = t.oid AND uq.attnum = c.attnum),
                'fk', (SELECT json_build_object('tabla', ft.relname, 'columna', fa.attname,
                                                'al_borrar', fk.confdeltype)
                       FROM fk
                       JOIN pg_class ft ON ft.oid = fk.confrelid
                       JOIN pg_attribute fa ON fa.attrelid = fk.confrelid AND fa.attnum = fk.fattnum
                       WHERE fk.conrelid = t.oid AND fk.attnum = c.attnum LIMIT 1)
            ) ORDER BY c.attnum)
            FROM columnas c WHERE c.attrelid = t.oid
        ),
        'checks', (
            SELECT json_agg(json_build_object('nombre', con.conname,
                                              'definicion', pg_get_constraintdef(con.oid)) ORDER BY con.conname)
            FROM pg_constraint con WHERE con.conrelid = t.oid AND con.contype = 'c'
        ),
        'unicos_compuestos', (
            SELECT json_agg(json_build_object('nombre', con.conname,
                                              'definicion', pg_get_constraintdef(con.oid)) ORDER BY con.conname)
            FROM pg_constraint con
            WHERE con.conrelid = t.oid AND con.contype = 'u' AND array_length(con.conkey, 1) > 1
        ),
        'filas_demo', (SELECT n_live_tup FROM pg_stat_user_tables s WHERE s.relid = t.oid)
    ) ORDER BY t.nombre)
    FROM tablas t
  ),
  'vistas', (
    SELECT json_agg(json_build_object('nombre', c.relname,
                                      'comentario', obj_description(c.oid, 'pg_class'),
                                      'columnas', (SELECT json_agg(a.attname ORDER BY a.attnum)
                                                   FROM pg_attribute a WHERE a.attrelid = c.oid AND a.attnum > 0))
                    ORDER BY c.relname)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'claxon' AND c.relkind = 'v'
  ),
  'triggers', (
    SELECT json_agg(json_build_object('nombre', tg.tgname, 'tabla', c.relname, 'funcion', p.proname)
                    ORDER BY c.relname, tg.tgname)
    FROM pg_trigger tg
    JOIN pg_class c ON c.oid = tg.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = tg.tgfoid
    WHERE n.nspname = 'claxon' AND NOT tg.tgisinternal
  ),
  'indices', (
    SELECT count(*) FROM pg_indexes WHERE schemaname = 'claxon'
  )
)
"""

TIPOS_CORTOS = [
    ("character varying", "varchar"),
    ("timestamp with time zone", "timestamptz"),
    ("time without time zone", "time"),
    ("character", "char"),
    ("integer", "int"),
    ("boolean", "bool"),
]


def tipo_corto(tipo: str) -> str:
    for largo, corto in TIPOS_CORTOS:
        if tipo.startswith(largo):
            return corto + tipo[len(largo):]
    return tipo


def leer_modelo() -> dict:
    # Ejecuta la consulta tal cual (-X sin psqlrc, -A sin alinear, -t sin cabeceras)
    salida = subprocess.run(
        ["psql", DSN, "-X", "-A", "-t", "-v", "ON_ERROR_STOP=1", "-c", "SET search_path TO claxon", "-c", CONSULTA],
        check=True, capture_output=True, text=True,
    ).stdout
    json_texto = salida.strip().splitlines()[-1]
    modelo = json.loads(json_texto)

    por_nombre = {t["nombre"]: t for t in modelo["tablas"]}
    sin_bloque = set(por_nombre)
    bloques = []
    for clave, titulo, tablas in BLOQUES:
        for nombre in tablas:
            if nombre not in por_nombre:
                raise SystemExit(f"La tabla «{nombre}» está en BLOQUES pero no existe en la base de datos")
            por_nombre[nombre]["bloque"] = clave
            sin_bloque.discard(nombre)
        bloques.append({"clave": clave, "titulo": titulo, "tablas": tablas})
    if sin_bloque:
        raise SystemExit(f"Tablas sin bloque asignado en exportar_modelo.py: {sorted(sin_bloque)}")

    relaciones = []
    for t in modelo["tablas"]:
        for c in t["columnas"]:
            c["tipo_corto"] = tipo_corto(c["tipo"])
            if c["fk"]:
                relaciones.append({
                    "desde": t["nombre"], "columna": c["nombre"],
                    "hacia": c["fk"]["tabla"], "columna_destino": c["fk"]["columna"],
                    # 1:1 si la columna FK es única por sí sola, si no N:1
                    "cardinalidad": "1:1" if (c["unico"] or (c["pk"] and sum(x["pk"] for x in t["columnas"]) == 1)) else "N:1",
                    "opcional": not c["no_nulo"],
                    "al_borrar": {"a": "NO ACTION", "r": "RESTRICT", "c": "CASCADE",
                                  "n": "SET NULL", "d": "SET DEFAULT"}[c["fk"]["al_borrar"]],
                })
    modelo["relaciones"] = relaciones
    modelo["bloques"] = bloques
    modelo["resumen"] = {
        "tablas": len(modelo["tablas"]),
        "columnas": sum(len(t["columnas"]) for t in modelo["tablas"]),
        "relaciones": len(relaciones),
        "vistas": len(modelo["vistas"] or []),
        "triggers": len(modelo["triggers"] or []),
        "indices": modelo.pop("indices"),
        "checks": sum(len(t["checks"] or []) for t in modelo["tablas"]),
    }
    # Orden de tablas por bloque
    orden = [n for _, _, ts in BLOQUES for n in ts]
    modelo["tablas"].sort(key=lambda t: orden.index(t["nombre"]))
    return modelo


# ---------------------------------------------------------------------------- DBML
def a_dbml(modelo: dict) -> str:
    def escapar(texto):
        return (texto or "").replace("\\", "\\\\").replace("'", "\\'")

    lineas = ["// Claxon · generado por database/herramientas/exportar_modelo.py",
              "// Ábrelo en https://dbdiagram.io (Import → DBML) para moverlo y exportarlo como imagen o PDF.",
              "",
              "Project claxon {",
              "  database_type: 'PostgreSQL'",
              "  Note: 'El radar de lo que pasa por tu pueblo. Avisos de servicios ambulantes y encargos.'",
              "}", ""]
    for t in modelo["tablas"]:
        lineas.append(f"Table {t['nombre']} {{")
        for c in t["columnas"]:
            ajustes = []
            if c["pk"] and sum(x["pk"] for x in t["columnas"]) == 1:
                ajustes.append("pk")
            if c["identidad"]:
                ajustes.append("increment")
            if c["no_nulo"] and not c["pk"]:
                ajustes.append("not null")
            if c["unico"]:
                ajustes.append("unique")
            if c["por_defecto"] and not c["identidad"]:
                ajustes.append(f"default: `{c['por_defecto']}`")
            if c["comentario"]:
                ajustes.append(f"note: '{escapar(c['comentario'])}'")
            extra = f" [{', '.join(ajustes)}]" if ajustes else ""
            tipo = c["tipo"].replace(" ", "_") if " " in c["tipo"] and "(" not in c["tipo"] else c["tipo_corto"]
            lineas.append(f"  {c['nombre']} {tipo}{extra}")
        pks = [c["nombre"] for c in t["columnas"] if c["pk"]]
        if len(pks) > 1:
            lineas += ["", "  indexes {", f"    ({', '.join(pks)}) [pk]", "  }"]
        if t["comentario"]:
            lineas.append(f"  Note: '{escapar(t['comentario'])}'")
        lineas += ["}", ""]
    for r in modelo["relaciones"]:
        simbolo = "-" if r["cardinalidad"] == "1:1" else ">"
        borrar = f" [delete: {r['al_borrar'].lower()}]" if r["al_borrar"] != "NO ACTION" else ""
        lineas.append(f"Ref: {r['desde']}.{r['columna']} {simbolo} {r['hacia']}.{r['columna_destino']}{borrar}")
    lineas.append("")
    for b in modelo["bloques"]:
        lineas.append(f"TableGroup {b['clave']} {{")
        lineas += [f"  {n}" for n in b["tablas"]]
        lineas.append("}")
    return "\n".join(lineas) + "\n"


# ---------------------------------------------------------------------------- Mermaid
def mermaid(modelo: dict, tablas: list[str], con_columnas: bool) -> str:
    por_nombre = {t["nombre"]: t for t in modelo["tablas"]}
    lineas = ["```mermaid", "erDiagram"]
    if con_columnas:
        for n in tablas:
            t = por_nombre[n]
            lineas.append(f"    {n} {{")
            for c in t["columnas"]:
                marcas = []
                if c["pk"]:
                    marcas.append("PK")
                if c["fk"]:
                    marcas.append("FK")
                if c["unico"] and not c["pk"]:
                    marcas.append("UK")
                tipo = c["tipo_corto"].split("(")[0]
                lineas.append(f"        {tipo} {c['nombre']}{' ' + ','.join(marcas) if marcas else ''}")
            lineas.append("    }")
    vistas = set()
    for r in modelo["relaciones"]:
        if r["desde"] in tablas or r["hacia"] in tablas:
            if not con_columnas and not (r["desde"] in tablas and r["hacia"] in tablas):
                continue
            if con_columnas and not (r["desde"] in tablas and r["hacia"] in tablas):
                continue
            clave = (r["hacia"], r["desde"], r["columna"])
            if clave in vistas:
                continue
            vistas.add(clave)
            # Sintaxis Mermaid: izquierda |o o || ; derecha o| o o{
            lado_padre = "|o" if r["opcional"] else "||"
            lado_hijo = "o|" if r["cardinalidad"] == "1:1" else "o{"
            lineas.append(f"    {r['hacia']} {lado_padre}--{lado_hijo} {r['desde']} : \"{r['columna']}\"")
    lineas.append("```")
    return "\n".join(lineas)


def a_markdown(modelo: dict) -> str:
    r = modelo["resumen"]
    partes = [
        "# Diagramas de la base de datos",
        "",
        "> Generado automáticamente con `database/herramientas/exportar_modelo.py` a partir de la base de datos real.",
        "> No lo edites a mano: cambia el SQL y vuelve a ejecutar el script.",
        "",
        f"**{r['tablas']} tablas · {r['columnas']} columnas · {r['relaciones']} relaciones · "
        f"{r['vistas']} vistas · {r['triggers']} triggers · {r['checks']} reglas CHECK · {r['indices']} índices**",
        "",
        "Cómo leer las relaciones: `||` exactamente uno · `|o` / `o|` cero o uno · `o{` cero o muchos.",
        "",
        "## Vista general",
        "",
        "Todas las tablas y cómo se relacionan (sin columnas, para que se lea bien).",
        "",
        mermaid(modelo, [t["nombre"] for t in modelo["tablas"]], con_columnas=False),
        "",
    ]
    for b in modelo["bloques"]:
        partes += [f"## {b['titulo']}", ""]
        for n in b["tablas"]:
            t = next(x for x in modelo["tablas"] if x["nombre"] == n)
            partes.append(f"- **`{n}`** · {t['comentario'] or ''}")
        partes += ["", mermaid(modelo, b["tablas"], con_columnas=True), ""]
    partes += ["## Vistas", "", "| Vista | Para qué sirve |", "|---|---|"]
    for v in modelo["vistas"]:
        partes.append(f"| `{v['nombre']}` | {v['comentario'] or ''} |")
    partes += ["", "## Triggers", "", "| Tabla | Trigger | Función |", "|---|---|---|"]
    for tg in modelo["triggers"]:
        partes.append(f"| `{tg['tabla']}` | `{tg['nombre']}` | `{tg['funcion']}()` |")
    return "\n".join(partes) + "\n"


def main():
    modelo = leer_modelo()
    SALIDA.mkdir(parents=True, exist_ok=True)
    (SALIDA / "modelo.json").write_text(json.dumps(modelo, ensure_ascii=False, indent=1), encoding="utf-8")
    (SALIDA / "claxon.dbml").write_text(a_dbml(modelo), encoding="utf-8")
    (SALIDA / "diagramas.md").write_text(a_markdown(modelo), encoding="utf-8")
    if PLANTILLA.exists():
        html = PLANTILLA.read_text(encoding="utf-8")
        datos = json.dumps(modelo, ensure_ascii=False).replace("</", "<\\/")
        html = html.replace("/*__MODELO__*/null", datos)
        # La plantilla es un fragmento: se envuelve en un documento completo para abrirlo con doble clic
        cabeza, cuerpo = html.split("</style>", 1)
        documento = ("<!doctype html>\n<html lang=\"es\">\n<head>\n<meta charset=\"utf-8\">\n"
                     "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
                     f"{cabeza}</style>\n</head>\n<body>{cuerpo}</body>\n</html>\n")
        (SALIDA / "diagrama-er.html").write_text(documento, encoding="utf-8")
    r = modelo["resumen"]
    print(f"Modelo exportado: {r['tablas']} tablas, {r['columnas']} columnas, {r['relaciones']} relaciones, "
          f"{r['vistas']} vistas, {r['triggers']} triggers → {SALIDA.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
