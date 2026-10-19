# Anuncios de Claxon

Un vídeo de unos 30 segundos por cada perfil de la app, en estilo anuncio: 1920×1080, 30 fps, con música.

| Perfil | Vídeo | Qué cuenta |
|---|---|---|
| Vecino | [claxon-vecino.mp4](claxon-vecino.mp4) | Avisos 15 minutos antes, la pantalla «Hoy», encargos, cambios de consulta y letra grande. |
| Familiar | [claxon-familiar.mp4](claxon-familiar.mp4) | Seguir a la familia desde fuera, gestionar a quien no tiene móvil, encargar por ellos y vincularse con un código. |
| Vendedor | [claxon-vendedor.mp4](claxon-vendedor.mp4) | «Iniciar ruta», avisos automáticos a los clientes, retrasos con un toque y los encargos de cada parada. |
| Ayuntamiento | [claxon-ayuntamiento.mp4](claxon-ayuntamiento.mp4) | Panel web, avisos al móvil y al bar, cambios de consulta y el tablón del bar. |

Todos siguen la misma estructura: **gancho** (el problema en una frase, con el sonido del claxon) → **dato** de la presentación (vecino y ayuntamiento) → **4 o 5 escenas** con las pantallas reales de la app → **cierre** con el logo.

## Cómo se hacen

Los vídeos no se editan a mano: se generan a partir del guion.

| Archivo | Qué hace |
|---|---|
| `fuente/guiones.js` | El guion de cada anuncio: frases, pantallas y qué se resalta o se pulsa en cada una. |
| `fuente/videos.js` | Monta cada anuncio como página animada y la graba fotograma a fotograma con Playwright y ffmpeg. |
| `fuente/musica.py` | Compone la música (marimba, bajo y percusión) y el claxon con numpy, ajustada a la duración de cada vídeo. |

Para cambiar un texto o una pantalla, edita `guiones.js` y vuelve a generar:

```bash
cd docs/videos/fuente
node videos.js                    # los cuatro (unos 2–3 minutos cada uno)
node videos.js vendedor           # solo uno
node videos.js vecino --previa    # fotogramas sueltos para revisar, sin grabar
```

Necesita Node con Playwright, ffmpeg, Python con numpy y las capturas de `docs/interfaces/png` (si cambian las pantallas, primero `node docs/interfaces/fuente/capturar.js`).
