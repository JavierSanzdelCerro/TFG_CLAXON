# Vídeos de Claxon

Un vídeo por perfil, grabado **como si fuera la pantalla del móvil (o del ordenador) de una persona usando la app**: se ven los toques, las pantallas cambiando, el texto escribiéndose, los contadores, las notificaciones que llegan… Con música suave y los sonidos de la app (toques, teclado, avisos y el claxon).

| Perfil | Vídeo | Formato | Qué hace la persona |
|---|---|---|---|
| Vecino | [claxon-vecino.mp4](claxon-vecino.mp4) | Móvil vertical | María recibe el aviso del pan, mira «Hoy», encarga pan con una nota, el horno lo acepta, consulta el cambio del médico y le avisan de que el panadero ya está en la plaza. |
| Familiar | [claxon-familiar.mp4](claxon-familiar.mp4) | Móvil vertical | Laura recibe el aviso de su madre, encarga pan para su tío Joaquín (sin móvil) para que se lo lleven a casa y se vincula con otro familiar con un código. |
| Vendedor | [claxon-vendedor.mp4](claxon-vendedor.mp4) | Móvil vertical | Jorge inicia la ruta, avisa de 10 minutos de retraso, acepta encargos, llega a la plaza, entrega y marca las magdalenas como agotadas. |
| Ayuntamiento | [claxon-ayuntamiento.mp4](claxon-ayuntamiento.mp4) | Ordenador (16:10) | Ana registra que la consulta se pasa en Utrillas, escribe un aviso nuevo y lo ve aparecer en el tablón del bar. |

Los móviles se graban a 1170×2532 (como una grabación de pantalla de iPhone) y el ordenador a 1920×1200, a 30 fps.

## Cómo se hacen

| Archivo | Qué hace |
|---|---|
| `fuente/grabaciones/<perfil>.js` | El guion: qué toca la persona y en qué segundo. |
| `fuente/grabaciones/motor.js` | Simula a la persona: toques, ratón, escribir, cambiar de pantalla, notificaciones… |
| `fuente/grabar.js` | Monta la app con el HTML real de las pantallas y graba fotograma a fotograma (Playwright + ffmpeg). |
| `fuente/grabaciones/sonido.py` y `fuente/musica.py` | Música y efectos de sonido generados con numpy. |

```bash
cd docs/videos/fuente
node grabar.js                    # los cuatro
node grabar.js vecino             # solo uno
node grabar.js vecino --previa    # fotogramas cada 1,5 s para revisar, sin grabar
```

Necesita Node con Playwright, ffmpeg, Python con numpy y el catálogo de interfaces construido (`docs/interfaces/interfaces-claxon.html`).
