# Sugerencias para el proyecto

Ideas que han surgido al diseñar la base de datos y las pantallas. Ninguna es obligatoria; están ordenadas por importancia.

## 1. Organización

- **Un solo repositorio.** Existen `JavierSanzdelCerro/TFG_CLAXON` y `estheeraznnar/PROYECTO_TFG_CLAXON`, los dos vacíos. Usad este, añadid a la otra persona como colaboradora (*Settings → Collaborators*) y archivad el otro.
- **Ramas y pull requests.** Nada directo a `main`: cada tarea en su rama y un PR que revisa la otra persona. En la defensa queda muy bien enseñar el historial.
- **Flyway desde el primer día.** Mover `database/01_esquema.sql` a `backend/src/main/resources/db/migration/V1__esquema_inicial.sql`. Cada cambio posterior va en un archivo nuevo (`V2__...`), y así las bases de datos de las dos estaréis siempre iguales.

## 2. Alcance: qué construir primero

El proyecto tiene 4 perfiles y 3 clientes. Para llegar con algo que funcione de principio a fin, este orden:

1. **Vendedor → aviso → vecino**: rutas, «Iniciar ruta», cálculo de la hora estimada, notificación 15 min antes. Es el corazón de Claxon.
2. **Encargos**: catálogo, hacer encargo, aceptar o rechazar, lista en la parada.
3. **Ayuntamiento**: avisos y cambios de consulta.
4. **Familiar**: vincular con código y vecinos sin móvil.
5. **Tablón del bar**: es solo lectura de tres vistas que ya existen; es lo más rápido de hacer al final.

Fuera del alcance (decirlo en la memoria como «trabajo futuro»): pagos en la app, GPS en tiempo real, chat.

## 3. Preguntas que os harán en el tribunal

- **«Si hay mala cobertura, ¿cómo llegan los avisos?»** Respuestas preparadas:
  - La app guarda la última pantalla «Hoy» y la muestra sin conexión, con la hora de la última actualización.
  - FCM guarda el aviso y lo entrega cuando vuelve la señal (por eso conviene avisar 15 min antes y no 2).
  - El tablón del bar y los familiares cubren a quien no tiene buena señal.
  - Trabajo futuro: avisos por SMS para quien lo pida.
- **«¿Por qué no GPS?»** Porque gasta batería, necesita permisos y cobertura constante, y para avisar con 15 minutos de margen basta con la salida real más el tiempo habitual. La base de datos guarda la hora estimada y la real de cada parada, así que más adelante se puede calcular el retraso medio de cada parada y afinar la estimación.
- **«¿Y los datos médicos?»** No se guardan. Solo días, horas y lugares de consulta. El motivo de un cambio es genérico.

## 4. Privacidad (RGPD)

- Pantalla de consentimiento en el registro y política de privacidad sencilla.
- El teléfono y la dirección del vecino solo los ve el vendedor al que le ha hecho un encargo.
- Opción de borrar la cuenta (la base de datos ya permite desactivar sin perder el histórico).
- Un familiar solo queda vinculado cuando el vecino acepta, salvo que el familiar cree el perfil de alguien sin móvil.

## 5. Mejoras pequeñas que se podrían añadir a la base de datos

- **Verificar vendedores y gestores municipales** (campo `verificado_en` y quién lo verificó), para que nadie se haga pasar por el ayuntamiento.
- **Preferencias de aviso del familiar**: ahora recibe todo lo de su familiar; se podría elegir solo encargos o solo cambios de consulta.
- **Horas de silencio**: no enviar avisos de madrugada aunque un vendedor salga muy temprano.
- **Valoración del piloto**: una tabla sencilla de opiniones para medir si Claxon sirve, útil para la memoria.

## 6. Validación con usuarios (diapositiva 9)

Antes de programar mucho, enseñad estas pantallas en papel o en el móvil a:

- **Un vendedor**: ¿pulsaría «Iniciar ruta» y «He llegado» mientras trabaja? ¿Cómo recibe hoy los encargos?
- **Dos o tres vecinos mayores**: ¿leen bien la pantalla «Hoy» con letra «Muy grande»? ¿Entienden «En camino» y «Previsto»?
- **Un ayuntamiento**: ¿cómo avisan hoy de los cambios de consulta? ¿Quién lo haría en el panel?

Apuntad lo que cambiaríais después de cada entrevista: es material muy bueno para la memoria.
