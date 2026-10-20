# Demo navegable de Claxon

Una versión de la app que funciona de verdad en el navegador, con los mismos datos demo que la base de datos. Sirve para probar la idea y enseñarla antes de tener el servidor hecho.

- **Abrirla:** descarga [`claxon-demo.html`](claxon-demo.html) y ábrela con doble clic. Funciona sin instalar nada (solo necesita internet para las fuentes).
- **Enlace para compartir:** <https://claude.ai/artifact/EzebuBtG4Drs4rnEu3Nght> (hay que compartirlo desde el menú *Compartir* de la página).

## Usuarios de prueba

Contraseña de todos: **`Claxon2026!`**

| Quién | Entra con | Qué probar |
|---|---|---|
| María Pérez | `600 111 222` | Vecina de Fuenferrada: «Hoy», encargos, avisos, letra grande |
| Manuel Sanz | `600 333 444` | Una cuenta con dos perfiles: vecino y familiar |
| Carmen López | `carmen.lopez@demo.claxon` | Tiene una solicitud de familiar por aceptar |
| Teresa Aznar | `600 777 888` | Vecina de Martín del Río |
| Laura Pérez | `laura.perez@demo.claxon` | Familiar de María y de Joaquín (sin móvil) |
| Jorge Lázaro | `horno.sanjorge@demo.claxon` | Panadero con la ruta en camino: «He llegado», retraso, cancelar |
| Antonio Gil | `pescados.gil@demo.claxon` | Pescadero con la ruta sin empezar: «Iniciar ruta» y encargos por aceptar |
| Pilar Royo | `frutas.pilar@demo.claxon` | Frutera que hoy no reparte |
| Ana Martín | `secretaria@demo.claxon` | Ayuntamiento de 3 pueblos (panel web): avisos, consulta, tablón |
| Luis Navarro | `alcaldia.mdr@demo.claxon` | Ayuntamiento y vecino con la misma cuenta |
| Equipo Claxon | `admin@claxon.app` | Administración (panel web) |
| Rosario Gómez | `600 999 000` | Cuenta dada de baja: no puede entrar |

## Qué hace

- **Todo está conectado.** Si el panadero pulsa «He llegado», a María le llega el aviso y su pantalla «Hoy» cambia. Si María encarga pescado, Antonio lo ve para aceptarlo. Si Ana publica un aviso, aparece en la app y en el tablón del bar.
- **Comprueba lo que se escribe.** Teléfonos de 9 cifras, correos con @, contraseñas de 8 caracteres con letras y números, fechas que no pueden ser pasadas, precios con 2 decimales, códigos de familia de 6 caracteres... Cada error dice qué está mal y cómo arreglarlo.
- **Respeta las reglas de la base de datos:** un vecino sin móvil no puede entrar, una cuenta dada de baja tampoco, rechazar un encargo pide un motivo, no se puede encargar con menos antelación de la que pide el vendedor, la hora de fin de la consulta tiene que ser posterior a la de inicio...
- **Reloj de la demo.** Empieza a las 10:25 del día en que se abre, para que el pan siempre esté «en camino». Se puede adelantar desde la guía.
- **Cada persona tiene su copia.** Lo que se hace se guarda solo en ese navegador (`localStorage`). «Volver a empezar» deja los datos como al principio.

## Código

```
docs/demo/
├── claxon-demo.html          La demo (un solo archivo, generado)
└── fuente/
    ├── construir.py          Junta estilos, scripts e iconos en claxon-demo.html
    ├── componentes.css       Componentes de las maquetas (docs/interfaces)
    ├── demo.css              Mesa, móvil, panel web y estados de los formularios
    ├── datos.js              Las 10 tablas en memoria con los datos demo
    ├── app.js                Navegación, formularios, validación y sesión
    ├── vistas-vecino.js      Vecino y familiar
    ├── vistas-vendedor.js    Vendedor
    └── vistas-web.js         Ayuntamiento, administración y tablón
```

Para regenerarla: `python3 docs/demo/fuente/construir.py` (usa los iconos Lucide de `docs/interfaces/fuente/node_modules`; si no están, `npm i` en esa carpeta).
