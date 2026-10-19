// Guiones de los anuncios de Claxon, uno por perfil.
// Cada escena dura unos 4,5 s. Las «marcas» señalan partes de la pantalla:
//   anillo = recuadro que resalta · toque = un dedo que pulsa
// sel/idx: selector CSS dentro de la pantalla del catálogo (se mide solo).
module.exports = {
  vecino: {
    nombre: 'Vecino',
    chip: 'Para vecinos',
    gancho: { ceja: 'Fuenferrada · 10:25', lineas: ['Si no oyes la bocina,', 'te quedas sin pan.'] },
    dato: { numero: 149, de: 236, texto: 'municipios de Teruel tienen menos de 200 habitantes.', fuente: 'Censo AEDPT, 2023' },
    escenas: [
      { titulo: 'Te avisa 15 minutos antes.', sub: 'Cuando el pan, el pescado o la fruta van a llegar a tu plaza.',
        pantallas: ['17-notificaciones'], marcas: [{ png: '17-notificaciones', sel: '.push', idx: 0, tipo: 'anillo', t: 1.0 }] },
      { titulo: 'Todo lo de hoy, de un vistazo.', sub: 'Qué pasa por tu pueblo y a qué hora llega.',
        pantallas: ['05-vecino-hoy'], marcas: [{ png: '05-vecino-hoy', sel: '.lista .fila', idx: 0, tipo: 'anillo', t: 1.0 }] },
      { titulo: 'Encárgalo antes de que llegue.', sub: 'Te lo dejan preparado. Pagas al recogerlo.',
        pantallas: ['07-vecino-encargo-catalogo', '09-vecino-encargo-enviado'], cambio: 2.6,
        marcas: [{ png: '07-vecino-encargo-catalogo', sel: '.contador.activo button', idx: 1, tipo: 'toque', t: 0.9 },
                 { png: '07-vecino-encargo-catalogo', sel: '.pie-acciones .boton', idx: 0, tipo: 'toque', t: 1.9 }] },
      { titulo: 'Los cambios de consulta, al momento.', sub: 'Solo cuándo y dónde. Nunca datos de salud.',
        pantallas: ['13-vecino-aviso-detalle'], marcas: [{ png: '13-vecino-aviso-detalle', sel: '.tarjeta', idx: 0, tipo: 'anillo', t: 1.0 }] },
      { titulo: 'Letra grande. Fácil de verdad.', sub: 'Pensada para quien no se lleva bien con el móvil.',
        pantallas: ['16-vecino-ajustes'], marcas: [{ png: '16-vecino-ajustes', sel: '.segmentos span.on', idx: 0, tipo: 'toque', t: 1.0 },
                                                   { png: '16-vecino-ajustes', sel: '.segmentos', idx: 0, tipo: 'anillo', t: 1.4 }] },
    ],
  },

  familiar: {
    nombre: 'Familiar',
    chip: 'Para familiares',
    gancho: { ceja: 'Zaragoza · 10:25', lineas: ['Tu familia vive en el pueblo.', 'Tú, a cien kilómetros.'] },
    escenas: [
      { titulo: 'Su día, desde tu móvil.', sub: 'Qué les llega hoy y cómo van sus encargos.',
        pantallas: ['18-familiar-inicio'], marcas: [{ png: '18-familiar-inicio', sel: '.tarjeta', idx: 0, tipo: 'anillo', t: 1.0 }] },
      { titulo: '¿No tiene móvil? Tú le ayudas.', sub: 'Creas su perfil y sus avisos te llegan a ti.',
        pantallas: ['21-familiar-crear-perfil', '19-familiar-sin-movil'], cambio: 2.4,
        marcas: [{ png: '21-familiar-crear-perfil', sel: '.pie-acciones .boton', idx: 0, tipo: 'toque', t: 1.5 },
                 { png: '19-familiar-sin-movil', sel: '.tarjeta.suave', idx: 0, tipo: 'anillo', t: 2.9 }] },
      { titulo: 'Encarga por ellos.', sub: 'Se lo dejan preparado en la plaza o se lo llevan a casa.',
        pantallas: ['19-familiar-sin-movil', '07-vecino-encargo-catalogo'], cambio: 1.7,
        marcas: [{ png: '19-familiar-sin-movil', sel: '.pie-acciones .boton', idx: 0, tipo: 'toque', t: 0.9 },
                 { png: '07-vecino-encargo-catalogo', sel: '.contador.activo button', idx: 1, tipo: 'toque', t: 2.7 }] },
      { titulo: 'Te enteras de todo, a tiempo.', sub: 'Las mismas notificaciones que les llegan a ellos.',
        pantallas: ['17-notificaciones'], marcas: [{ png: '17-notificaciones', sel: '.push', idx: 0, tipo: 'anillo', t: 1.0 }] },
      { titulo: 'Os vinculáis con un código.', sub: 'Sin compartir contraseñas. Tu familiar lo acepta.',
        pantallas: ['20-familiar-vincular'], marcas: [{ png: '20-familiar-vincular', sel: '.codigo', idx: 0, tipo: 'anillo', t: 1.0 }] },
    ],
  },

  vendedor: {
    nombre: 'Vendedor',
    chip: 'Para vendedores',
    gancho: { ceja: 'Ruta del pan · 9:45', lineas: ['Conduces, paras, tocas el claxon…', 'y medio pueblo no se entera.'] },
    escenas: [
      { titulo: 'Un botón al salir.', sub: 'Claxon calcula a qué hora llegas a cada pueblo.',
        pantallas: ['22-vendedor-iniciar-ruta'], marcas: [{ png: '22-vendedor-iniciar-ruta', sel: '.boton.gigante', idx: 0, tipo: 'toque', t: 1.4 }] },
      { titulo: 'Tus clientes saben cuándo llegas.', sub: 'Les avisamos 15 minutos antes. Tú solo conduces.',
        pantallas: ['23-vendedor-ruta-en-curso'], marcas: [{ png: '23-vendedor-ruta-en-curso', sel: '.tarjeta.oscura', idx: 0, tipo: 'anillo', t: 0.9 },
                                                          { png: '23-vendedor-ruta-en-curso', sel: '.boton.gigante', idx: 0, tipo: 'toque', t: 2.6 }] },
      { titulo: '¿Vas con retraso? Un toque.', sub: 'Las horas se ajustan y se avisa a todos a la vez.',
        pantallas: ['24-vendedor-retraso'], marcas: [{ png: '24-vendedor-retraso', sel: '.hoja .chip.on', idx: 0, tipo: 'toque', t: 1.0 },
                                                    { png: '24-vendedor-retraso', sel: '.hoja .tarjeta', idx: 0, tipo: 'anillo', t: 1.6 }] },
      { titulo: 'Los encargos, listos en la plaza.', sub: 'Ves qué tiene que recoger cada vecino.',
        pantallas: ['25-vendedor-en-parada'], marcas: [{ png: '25-vendedor-en-parada', sel: '.boton.mini.ok', idx: 0, tipo: 'toque', t: 1.5 }] },
      { titulo: 'Adiós a los pedidos por WhatsApp.', sub: 'Aceptas o rechazas desde un solo sitio.',
        pantallas: ['26-vendedor-encargos'], marcas: [{ png: '26-vendedor-encargos', sel: '.boton.mini:not(.sec)', idx: 0, tipo: 'toque', t: 1.4 }] },
    ],
  },

  ayuntamiento: {
    nombre: 'Ayuntamiento',
    chip: 'Para ayuntamientos',
    gancho: { ceja: 'Fuenferrada · 8:00', lineas: ['Hoy no hay médico en el pueblo.', '¿Cómo se entera todo el mundo?'] },
    dato: { numero: 2, texto: 'días de consulta médica a la semana en un pueblo de 101 a 200 habitantes.', fuente: 'Decreto 59/1997' },
    escenas: [
      { titulo: 'Todos tus pueblos, en un panel.', sub: 'Lo que pasa hoy, los avisos y la consulta.', tipo: 'web',
        pantallas: ['29-ayuntamiento-inicio'], marcas: [{ png: '29-ayuntamiento-inicio', sel: '.columnas-web > .tarjeta', idx: 0, tipo: 'anillo', t: 1.0 }] },
      { titulo: 'Escribe el aviso una vez.', sub: 'Llega al móvil de cada vecino y a la pantalla del bar.', tipo: 'web',
        pantallas: ['30-ayuntamiento-nuevo-aviso'], marcas: [{ png: '30-ayuntamiento-nuevo-aviso', sel: '.contenido-web > div:last-child', idx: 0, tipo: 'anillo', t: 0.9 },
                                                            { png: '30-ayuntamiento-nuevo-aviso', sel: '.boton.mini:not(.sec)', idx: 0, tipo: 'toque', t: 2.7 }] },
      { titulo: 'Un cambio de consulta, en un minuto.', sub: 'Se publica el aviso y se notifica solo.', tipo: 'web',
        pantallas: ['31-ayuntamiento-consulta'], marcas: [{ png: '31-ayuntamiento-consulta', sel: '.radio.on', idx: 0, tipo: 'toque', t: 0.9 },
                                                         { png: '31-ayuntamiento-consulta', sel: '[style*="ok-suave"]', idx: 0, tipo: 'anillo', t: 1.9 }] },
      { titulo: 'Y quien no tiene móvil, también.', sub: 'El tablón del bar se actualiza solo.', tipo: 'tele',
        pantallas: ['34-tablon-bar'], marcas: [{ png: '34-tablon-bar', sel: '.aviso-tv', idx: 0, tipo: 'anillo', t: 1.1 }] },
    ],
  },
};
