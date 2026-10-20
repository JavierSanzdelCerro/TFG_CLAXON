#!/usr/bin/env python3
"""
Claxon · demo navegable
Junta estilos, scripts e iconos en un único HTML que funciona sin servidor:
    docs/demo/claxon-demo.html   (se abre con doble clic o se manda por correo)

Uso (desde esta carpeta):
    npm i                         # solo la primera vez: iconos Lucide
    python3 construir.py [ruta-extra.html]

Si se pasa una ruta extra, escribe ahí también la versión sin <head> que usa
la página publicada en claude.ai.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
SALIDA = AQUI.parent / "claxon-demo.html"
ICONOS = AQUI / "node_modules" / "lucide-static" / "icons"
if not ICONOS.exists():
    ICONOS = AQUI.parent.parent / "interfaces" / "fuente" / "node_modules" / "lucide-static" / "icons"

CSS = ["componentes.css", "demo.css"]
JS = ["datos.js", "app.js", "vistas-vecino.js", "vistas-vendedor.js", "vistas-web.js"]

FUENTES = ("https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;1,9..144,500"
           "&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600;700&display=swap")


def iconos_usados(js: str) -> dict[str, str]:
    """Todas las cadenas entre comillas que coinciden con un icono de Lucide."""
    candidatos = set(re.findall(r"'([a-z0-9]+(?:-[a-z0-9]+)*)'", js))
    salida = {}
    for nombre in sorted(candidatos):
        f = ICONOS / f"{nombre}.svg"
        if f.exists():
            svg = f.read_text(encoding="utf-8")
            cuerpo = re.search(r"<svg[^>]*>(.*)</svg>", svg, re.S).group(1)
            salida[nombre] = re.sub(r"\s+", " ", cuerpo).replace(" />", "/>").strip()
    return salida


def main() -> None:
    css = "\n".join((AQUI / f).read_text(encoding="utf-8") for f in CSS)
    js = "\n".join((AQUI / f).read_text(encoding="utf-8") for f in JS)
    iconos = iconos_usados(js)
    for nombre in sorted(set(re.findall(r"ic\('([a-z0-9-]+)'", js)) - set(iconos)):
        print(f"AVISO: falta el icono {nombre}", file=sys.stderr)

    cabeza = (
        "<title>Claxon demo</title>\n"
        '<meta name="claude:viewport-fit-sides" content="cover">\n'
        '<meta name="description" content="Demo navegable de Claxon: avisos de los servicios que pasan por los pueblos y encargos.">\n'
        f'<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n'
        f'<link rel="stylesheet" href="{FUENTES}">\n'
        f"<style>\n{css}\n</style>\n"
    )
    cuerpo = (
        '<div id="demo" class="demo"><p style="padding:24px">Cargando Claxon…</p></div>\n'
        f"<script>\nconst ICONOS = {json.dumps(iconos, ensure_ascii=False)};\n{js}\n</script>\n"
    )

    pagina = (
        "<!doctype html>\n<html lang=\"es\">\n<head>\n<meta charset=\"utf-8\">\n"
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        "<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>\n"
        f"{cabeza}</head>\n<body>\n{cuerpo}</body>\n</html>\n"
    )
    SALIDA.write_text(pagina, encoding="utf-8")
    print(f"{SALIDA.relative_to(AQUI.parent.parent.parent)}  ·  {len(pagina) // 1024} KB  ·  {len(iconos)} iconos")

    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(cabeza + cuerpo, encoding="utf-8")
        print(f"versión para publicar: {sys.argv[1]}")


if __name__ == "__main__":
    main()
