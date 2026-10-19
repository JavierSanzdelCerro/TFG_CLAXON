#!/usr/bin/env python3
"""
Monta el catálogo de interfaces de Claxon en un único HTML.

  fuente/estilos.css + fuente/pantallas/*.html  →  docs/interfaces/interfaces-claxon.html

Atajos que se expanden al construir:
  [[nombre]]  [[nombre s]]   icono de Lucide (tamaños: xs, s, l, xl)
  [[ESTADO]] [[ESTADO:9:43]] barra de estado del móvil (10:25 por defecto)
  [[NAV-VECINO:hoy]]         barra inferior del vecino con la pestaña activa
  [[NAV-FAMILIAR:inicio]]    barra inferior del familiar
  [[NAV-VENDEDOR:hoy]]       barra inferior del vendedor
  [[WEB:ruta|activo]]        marco de navegador y menú lateral del panel web

Requisitos: npm i lucide-static@0.460.0   (en esta carpeta)
Uso:        python3 docs/interfaces/fuente/construir.py [--fragmento salida.html]
  (también escribe docs/interfaces/README.md)
"""
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI.parent / "interfaces-claxon.html"
ICONOS = AQUI / "node_modules" / "lucide-static" / "icons"

NAV = {
    "VECINO": [("hoy", "house", "Hoy", None), ("encargos", "shopping-basket", "Encargos", "2"),
               ("avisos", "bell", "Avisos", "1"), ("familia", "users", "Familia", None)],
    "FAMILIAR": [("inicio", "house", "Inicio", None), ("encargos", "shopping-basket", "Encargos", "3"),
                 ("avisos", "bell", "Avisos", None), ("perfil", "user", "Perfil", None)],
    "VENDEDOR": [("hoy", "truck", "Hoy", None), ("encargos", "shopping-basket", "Encargos", "2"),
                 ("rutas", "route", "Rutas", None), ("catalogo", "package", "Catálogo", None)],
}

MENU_WEB = {
    "ayuntamiento": [("inicio", "layout-dashboard", "Inicio"), ("avisos", "megaphone", "Avisos"),
                     ("consultas", "stethoscope", "Consulta médica"), ("servicios", "truck", "Servicios del pueblo"),
                     ("tablones", "monitor", "Tablones")],
    "admin": [("inicio", "layout-dashboard", "Resumen"), ("pueblos", "map", "Pueblos"),
              ("usuarios", "users", "Usuarios"), ("vendedores", "store", "Vendedores"),
              ("tablones", "monitor", "Tablones")],
}
USUARIO_WEB = {
    "ayuntamiento": ("AM", "Ana Martín", "Secretaria · 3 pueblos"),
    "admin": ("EC", "Equipo Claxon", "Administración"),
}

def estado(hora: str = "10:25") -> str:
    return (f'<div class="estado"><span class="num">{hora}</span><span class="isla"></span>'
            '<span class="der">[[signal]]<span>4G</span>[[battery-full]]</span></div>')


def nav(rol: str, activo: str) -> str:
    partes = []
    for clave, icono, texto, globo in NAV[rol]:
        g = f'<span class="globo">{globo}</span>' if globo else ""
        partes.append(f'<a class="{"activo" if clave == activo else ""}">[[{icono}]]{g}<span>{texto}</span></a>')
    return '<nav class="nav">' + "".join(partes) + "</nav>"


def web(tipo: str, activo: str, url: str) -> str:
    menu = "".join(f'<a class="{"activo" if c == activo else ""}">[[{i} s]]{t}</a>' for c, i, t in MENU_WEB[tipo])
    ini, nombre, cargo = USUARIO_WEB[tipo]
    return (f'<div class="barra"><span class="puntos"><i></i><i></i><i></i></span>'
            f'<span class="url">[[lock]]{url}</span></div>'
            f'<div class="web"><aside class="lateral"><div class="marca"><span class="logo">[[volume-2]]</span>Claxon</div>'
            f'{menu}<div class="usuario"><span class="avatar">{ini}</span><div>{nombre}<small>{cargo}</small></div></div></aside>'
            f'<div class="principal-web">')


def icono_svg(nombre: str, tam: str | None) -> str:
    clase = "i" + (f" {tam}" if tam else "")
    return f'<svg class="{clase}" aria-hidden="true"><use href="#i-{nombre}"/></svg>'


def construir() -> tuple[str, str, set]:
    css = (AQUI / "estilos.css").read_text(encoding="utf-8")
    cuerpo = "\n".join(p.read_text(encoding="utf-8") for p in sorted((AQUI / "pantallas").glob("*.html")))

    cuerpo = re.sub(r"\[\[ESTADO(?::([\d:]+))?\]\]", lambda m: estado(m.group(1) or "10:25"), cuerpo)
    cuerpo = re.sub(r"\[\[NAV-(\w+):(\w+)\]\]", lambda m: nav(m.group(1), m.group(2)), cuerpo)
    cuerpo = re.sub(r"\[\[WEB:(\w+)\|(\w+)\|([^\]]+)\]\]", lambda m: web(m.group(1), m.group(2), m.group(3)), cuerpo)

    usados = set()

    def a_icono(m):
        nombre, tam = m.group(1), m.group(2)
        usados.add(nombre)
        return icono_svg(nombre, tam)

    cuerpo = re.sub(r"\[\[([a-z0-9-]+)(?: (xs|s|l|xl))?\]\]", a_icono, cuerpo)

    simbolos, faltan = [], []
    for nombre in sorted(usados):
        archivo = ICONOS / f"{nombre}.svg"
        if not archivo.exists():
            faltan.append(nombre)
            continue
        svg = archivo.read_text(encoding="utf-8")
        interior = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1).strip()
        interior = re.sub(r"\s+", " ", interior)
        simbolos.append(f'<symbol id="i-{nombre}" viewBox="0 0 24 24">{interior}</symbol>')
    if faltan:
        raise SystemExit(f"Iconos que no existen en Lucide: {', '.join(faltan)}")
    sprite = '<svg width="0" height="0" style="position:absolute" aria-hidden="true">' + "".join(simbolos) + "</svg>"

    n = len(re.findall(r'data-png="', cuerpo))
    secciones = re.findall(r'<section class="grupo" id="([^"]+)">\s*<header>\s*<div class="ceja">[^<]*</div>\s*<h2>([^<]+)</h2>', cuerpo)
    indice = "".join(f'<li><a href="#{i}">{t}</a></li>' for i, t in secciones)

    cabeza = f"""<title>Interfaces de Claxon</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
{css}
</style>"""
    contenido = f"""{sprite}
<main class="catalogo">
  <header>
    <div class="ceja">Claxon · Proyecto final de 2.º DAM · Interfaces</div>
    <h1>Interfaces de Claxon</h1>
    <p>{n} pantallas con datos de ejemplo para los cuatro perfiles: vecino, familiar, vendedor y ayuntamiento, más el panel de administración y el tablón del bar. Los datos son los mismos que los de la base de datos demo: lunes 19 de octubre, 10:25, la ruta del pan va de camino a Fuenferrada.</p>
    <ul class="indice">{indice}</ul>
  </header>
{cuerpo}
</main>"""
    return cabeza, contenido, usados


def texto(html: str) -> str:
    html = re.sub(r"<code>(.*?)</code>", r"`\1`", html)
    return re.sub(r"<[^>]+>", "", html).strip()


def indice_markdown(contenido: str) -> str:
    """README de docs/interfaces con una miniatura y la explicación de cada pantalla."""
    lineas = ["# Interfaces de Claxon", "",
              "> Generado por `fuente/construir.py`. Para cambiar una pantalla, edita `fuente/pantallas/*.html` y vuelve a construir.", "",
              "**[Abrir el catálogo completo](interfaces-claxon.html)** (descárgalo y ábrelo con doble clic) · "
              "las imágenes sueltas están en [`png/`](png/).", "",
              "Datos de ejemplo iguales a los de la base de datos demo: lunes 19 de octubre, 10:25. "
              "La ruta del pan va de camino a Fuenferrada (10:40), el pescado llega a las 12:15 y la consulta de hoy se pasa en Utrillas.", "",
              "## Identidad visual", "",
              "| | |", "|---|---|",
              "| Color principal | Terracota `#B8492B` sobre crema `#FAF6F0`, tinta `#1E2532` |",
              "| Titulares | Fraunces (serifa, como la presentación) |",
              "| Texto | Inter, 17 px en la app (más grande que lo habitual) |",
              "| Etiquetas | JetBrains Mono en mayúsculas |",
              "| Iconos | Lucide (los mismos de la presentación) |",
              "| Botones | 58 px de alto como mínimo; 92 px los del vendedor, que va conduciendo |",
              ""]
    for sec in re.finditer(r'<section class="grupo" id="([^"]+)">(.*?)</section>', contenido, re.S):
        bloque = sec.group(2)
        titulo = texto(re.search(r"<h2>(.*?)</h2>", bloque, re.S).group(1))
        ceja = texto(re.search(r'<div class="ceja">(.*?)</div>', bloque, re.S).group(1))
        desc = texto(re.search(r"<header>.*?<p>(.*?)</p>", bloque, re.S).group(1))
        lineas += [f"## {titulo}", "", f"*{ceja}.* {desc}", ""]
        figuras = re.findall(r'<figure class="pantalla" data-png="([^"]+)">.*?<figcaption><b>(.*?)</b><strong>(.*?)</strong><span>(.*?)</span></figcaption>', bloque, re.S)
        anchas = 'pantallas anchas' in bloque
        if anchas:
            for png, num, nombre, expl in figuras:
                lineas += [f"### {texto(num)} · {texto(nombre)}", "", texto(expl), "",
                           f'<img src="png/{png}.png" alt="{texto(nombre)}" width="900">', ""]
        else:
            lineas.append("<table>")
            for i in range(0, len(figuras), 3):
                lineas.append("<tr>")
                for png, num, nombre, expl in figuras[i:i + 3]:
                    lineas.append(f'<td valign="top" width="33%"><img src="png/{png}.png" alt="{texto(nombre)}" width="260"><br>'
                                  f"<b>{texto(num)} · {texto(nombre)}</b><br><sub>{expl.strip()}</sub></td>")
                lineas.append("</tr>")
            lineas += ["</table>", ""]
    lineas += ["## Regenerar", "", "```bash", "cd docs/interfaces/fuente",
               "npm install                 # iconos Lucide y Playwright", "python3 construir.py        # → interfaces-claxon.html y este README",
               "npx playwright install chromium   # solo la primera vez", "node capturar.js            # → png/", "```", ""]
    return "\n".join(lineas)


def main():
    cabeza, contenido, usados = construir()
    (AQUI.parent / "README.md").write_text(indice_markdown(contenido), encoding="utf-8")
    documento = ("<!doctype html>\n<html lang=\"es\">\n<head>\n<meta charset=\"utf-8\">\n"
                 "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n"
                 f"{cabeza}\n</head>\n<body>\n{contenido}\n</body>\n</html>\n")
    SALIDA.write_text(documento, encoding="utf-8")
    if "--fragmento" in sys.argv:
        destino = Path(sys.argv[sys.argv.index("--fragmento") + 1])
        destino.write_text(f"{cabeza}\n{contenido}\n", encoding="utf-8")
    print(f"Catálogo construido: {SALIDA.name} · {len(usados)} iconos · {SALIDA.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
