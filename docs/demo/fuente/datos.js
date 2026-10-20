/* =============================================================================
   Claxon · demo · datos
   Copia en memoria de las 10 tablas de database/01_esquema.sql con los mismos
   datos demo de 02_datos_demo.sql. Se guarda en el navegador (localStorage):
   cada persona que abre la demo tiene su propia copia.
   En la app real la contraseña va cifrada con BCrypt; aquí es texto para la demo.
   ============================================================================= */
'use strict';

const CLAVE_DATOS = 'claxon-demo-v1';
const CLAVE_SESION = 'claxon-demo-sesion-v1';
const CONTRASENA_DEMO = 'Claxon2026!';

/* ---------------------------------------------------------------- fechas */
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const DIAS_PL = ['domingos', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábados'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const LETRA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const ORDEN_LETRAS = 'LMXJVSD';
const pad = n => String(n).padStart(2, '0');
const isoDia = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const deIso = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const sumaDias = (iso, n) => { const d = deIso(iso); d.setDate(d.getDate() + n); return isoDia(d); };
const diaIso = iso => { const g = deIso(iso).getDay(); return g === 0 ? 7 : g; }; // 1 = lunes … 7 = domingo
const letraDe = iso => LETRA[deIso(iso).getDay()];
const hm = min => `${pad(Math.floor(min / 60) % 24)}:${pad(Math.round(min) % 60)}`;
const aMin = txt => { const [h, m] = txt.split(':').map(Number); return h * 60 + m; };
const hmCorto = min => hm(min).replace(/^0/, '');

let db = null;      // datos de la demo
let S = null;       // estado de la interfaz

/* Reloj de la demo: empieza a las 10:25 del día en que se abre y avanza con el reloj real.
   Así la ruta del pan siempre va «de camino» al empezar, sea la hora que sea. */
function ahoraMs() { return db.meta.base + (Date.now() - db.meta.inicio) + db.meta.adelanto * 60000; }
function hoy() { return db.meta.dia; }
function minAhora() { const d = new Date(ahoraMs()); return d.getHours() * 60 + d.getMinutes() + (isoDia(d) > hoy() ? 1440 : 0); }
function tsDe(iso, txt) { const d = deIso(iso); const [h, m] = txt.split(':').map(Number); d.setHours(h, m, 0, 0); return d.getTime(); }

function etiquetaDia(iso, conMes = false) {
  const d = deIso(iso);
  const resto = `${DIAS[d.getDay()]} ${d.getDate()}${conMes ? ` de ${MESES[d.getMonth()]}` : ''}`;
  if (iso === hoy()) return `Hoy, ${resto}`;
  if (iso === sumaDias(hoy(), 1)) return `Mañana, ${resto}`;
  if (iso === sumaDias(hoy(), -1)) return `Ayer, ${resto}`;
  return resto.charAt(0).toUpperCase() + resto.slice(1);
}
function diaCorto(iso) {
  if (iso === hoy()) return 'Hoy';
  if (iso === sumaDias(hoy(), 1)) return 'Mañana';
  if (iso === sumaDias(hoy(), -1)) return 'Ayer';
  const d = deIso(iso); return `${DIAS[d.getDay()].slice(0, 3)} ${d.getDate()}`;
}
function haceTxt(ts) {
  const min = Math.round((ahoraMs() - ts) / 60000);
  if (min < 1) return 'Ahora mismo';
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'Ayer' : `Hace ${d} días`;
}
function textoDias(letras) {
  const lista = letras.split('').map(l => DIAS_PL[LETRA.indexOf(l)]);
  if (letras === 'LMXJV') return 'de lunes a viernes';
  if (letras === 'LMXJVS') return 'de lunes a sábado';
  if (letras === 'LMXJVSD') return 'todos los días';
  return lista.length > 1 ? `${lista.slice(0, -1).join(', ')} y ${lista.at(-1)}` : lista[0];
}

/* ---------------------------------------------------------------- semilla */
function semilla() {
  const dia = isoDia(new Date());
  const ahora = Date.now();
  const base = tsDe(dia, '10:25');
  const t = deIso(dia).getDay();
  const letras = (...ks) => { const ls = ks.map(k => LETRA[(t + k) % 7]); return ORDEN_LETRAS.split('').filter(l => ls.includes(l)).join(''); };
  const hace = min => base - min * 60000;

  const usuarios = [
    { id: 1, roles: ['ADMIN'], nombre: 'Equipo', apellidos: 'Claxon', email: 'admin@claxon.app', telefono: null, password: CONTRASENA_DEMO, municipio_id: null, ultimo_acceso: hace(120) },
    { id: 2, roles: ['VECINO'], nombre: 'María', apellidos: 'Pérez Gascón', email: null, telefono: '600111222', password: CONTRASENA_DEMO, municipio_id: 2, direccion: 'C/ Mayor, 12', codigo_familia: '8F3K2P', tamano_texto: 'MUY_GRANDE', ultimo_acceso: hace(20) },
    { id: 3, roles: ['VECINO', 'FAMILIAR'], nombre: 'Manuel', apellidos: 'Sanz Royo', email: 'manuel.sanz@demo.claxon', telefono: '600333444', password: CONTRASENA_DEMO, municipio_id: 2, direccion: 'C/ Iglesia, 3', codigo_familia: 'M4N9LR', tamano_texto: 'GRANDE', email_verificado: false, ultimo_acceso: hace(1440) },
    { id: 4, roles: ['VECINO'], nombre: 'Carmen', apellidos: 'López Navarro', email: 'carmen.lopez@demo.claxon', telefono: '600555666', password: CONTRASENA_DEMO, municipio_id: 3, direccion: 'Pl. de la Iglesia, 1', codigo_familia: 'C7RM2Q', tamano_texto: 'GRANDE', ultimo_acceso: hace(180) },
    { id: 5, roles: ['FAMILIAR'], nombre: 'Laura', apellidos: 'Pérez Martín', email: 'laura.perez@demo.claxon', telefono: '611222333', password: CONTRASENA_DEMO, municipio_id: null, ultimo_acceso: hace(35) },
    { id: 6, roles: ['VENDEDOR'], nombre: 'Jorge', apellidos: 'Lázaro Ibáñez', email: 'horno.sanjorge@demo.claxon', telefono: '622111000', password: CONTRASENA_DEMO, municipio_id: 5,
      nombre_comercial: 'Horno San Jorge', categoria: 'PAN', dias_reparto: t === 0 ? 'LMXJVSD' : 'LMXJVS', hora_salida: '09:45', acepta_encargos: true, horas_antelacion_encargo: 12, salida_real: aMin('09:46'), ultimo_acceso: hace(5) },
    { id: 7, roles: ['VENDEDOR'], nombre: 'Antonio', apellidos: 'Gil Sebastián', email: 'pescados.gil@demo.claxon', telefono: '622333000', password: CONTRASENA_DEMO, municipio_id: 5, idioma: 'ca',
      nombre_comercial: 'Pescados Gil', categoria: 'PESCADO', dias_reparto: letras(0, 2, 4), hora_salida: '11:30', acepta_encargos: true, horas_antelacion_encargo: 24, ultimo_acceso: hace(60) },
    { id: 8, roles: ['VENDEDOR'], nombre: 'Pilar', apellidos: 'Royo Alcalá', email: 'frutas.pilar@demo.claxon', telefono: '622555000', password: CONTRASENA_DEMO, municipio_id: 5,
      nombre_comercial: 'Frutas y Verduras Pilar', categoria: 'FRUTA', dias_reparto: letras(1, 3), hora_salida: '09:00', acepta_encargos: true, horas_antelacion_encargo: 24, ultimo_acceso: hace(2880) },
    { id: 9, roles: ['AYUNTAMIENTO'], nombre: 'Ana', apellidos: 'Martín Blasco', email: 'secretaria@demo.claxon', telefono: null, password: CONTRASENA_DEMO, municipio_id: null, ultimo_acceso: hace(50) },
    { id: 10, roles: ['AYUNTAMIENTO', 'VECINO'], nombre: 'Luis', apellidos: 'Navarro Gracia', email: 'alcaldia.mdr@demo.claxon', telefono: null, password: CONTRASENA_DEMO, municipio_id: 1, direccion: 'Pl. Mayor, 2', codigo_familia: 'L2S6VB', ultimo_acceso: hace(5760) },
    { id: 11, roles: ['VECINO'], nombre: 'Teresa', apellidos: 'Aznar Lahoz', email: null, telefono: '600777888', password: CONTRASENA_DEMO, municipio_id: 1, direccion: 'C/ San Roque, 8', codigo_familia: 'T5R8NA', tamano_texto: 'GRANDE', ultimo_acceso: hace(360) },
    { id: 12, roles: ['VECINO'], nombre: 'Joaquín', apellidos: 'Pérez Gascón', email: null, telefono: '978000111', password: null, municipio_id: 4, direccion: 'C/ del Horno, 5', necesita_ayuda_entrega: true, notas_entrega: 'Llamar fuerte a la puerta: tarda en abrir.', tamano_texto: 'GRANDE', ultimo_acceso: null },
    { id: 13, roles: ['VECINO'], nombre: 'Rosario', apellidos: 'Gómez Lázaro', email: null, telefono: '600999000', password: CONTRASENA_DEMO, municipio_id: 3, activo: false, fecha_baja: base - 10 * 86400000, ultimo_acceso: base - 12 * 86400000 },
  ].map(u => ({
    idioma: 'es', tamano_texto: 'NORMAL', alto_contraste: false, activo: true, fecha_baja: null, direccion: null, necesita_ayuda_entrega: false,
    notas_entrega: null, codigo_familia: null, nombre_comercial: null, categoria: null, dias_reparto: null, hora_salida: null, acepta_encargos: false,
    horas_antelacion_encargo: 0, email_verificado: !!u.email, fecha_alta: base - 60 * 86400000, ...u,
  }));

  const municipios = [
    { id: 1, nombre: 'Martín del Río', comarca: 'Cuencas Mineras', gestor_id: 10, tablon_ubicacion: 'Hogar del jubilado' },
    { id: 2, nombre: 'Fuenferrada', comarca: 'Cuencas Mineras', gestor_id: 9, tablon_ubicacion: 'Bar La Plaza' },
    { id: 3, nombre: 'Segura de los Baños', comarca: 'Cuencas Mineras', gestor_id: 9, tablon_ubicacion: 'Local social' },
    { id: 4, nombre: 'La Hoz de la Vieja', comarca: 'Cuencas Mineras', gestor_id: 9, tablon_ubicacion: null },
    { id: 5, nombre: 'Utrillas', comarca: 'Cuencas Mineras', gestor_id: null, tablon_ubicacion: null },
  ];

  const familiares = [
    { familiar_id: 5, vecino_id: 2, parentesco: 'Hija', puede_hacer_encargos: true, recibe_avisos: true, estado: 'ACEPTADO', fecha: hace(43200) },
    { familiar_id: 5, vecino_id: 12, parentesco: 'Sobrina', puede_hacer_encargos: true, recibe_avisos: true, estado: 'ACEPTADO', fecha: hace(36000) },
    { familiar_id: 3, vecino_id: 4, parentesco: 'Primo', puede_hacer_encargos: true, recibe_avisos: true, estado: 'PENDIENTE', fecha: hace(1440) },
  ];

  const productos = [
    [1, 6, 'Barra de pan', 1.10, 'UNIDAD', true], [2, 6, 'Hogaza de 1 kg', 3.20, 'UNIDAD', true], [3, 6, 'Pan de pueblo redondo', 2.40, 'UNIDAD', true],
    [4, 6, 'Pan integral', 1.60, 'UNIDAD', true], [5, 6, 'Magdalenas', 4.50, 'DOCENA', true], [6, 6, 'Tortas de aceite', 2.80, 'PAQUETE', true],
    [7, 6, 'Croissant', 1.20, 'UNIDAD', false], [8, 7, 'Merluza', 14.90, 'KG', true], [9, 7, 'Sardinas', 6.50, 'KG', true],
    [10, 7, 'Boquerones', 7.90, 'KG', true], [11, 7, 'Salmón', 16.50, 'KG', true], [12, 7, 'Bacalao desalado', 15.00, 'KG', true],
    [13, 8, 'Manzanas', 2.20, 'KG', true], [14, 8, 'Naranjas', 1.80, 'KG', true], [15, 8, 'Tomates', 2.60, 'KG', true],
    [16, 8, 'Patatas (saco 5 kg)', 4.50, 'PAQUETE', true], [17, 8, 'Lechuga', 1.00, 'UNIDAD', true],
  ].map(([id, vendedor_id, nombre, precio, unidad, disponible]) => ({ id, vendedor_id, nombre, precio, unidad, disponible }));

  const P = (id, vendedor_id, municipio_id, orden, punto, minutos, fecha, estimada, llegada, estado) =>
    ({ id, vendedor_id, municipio_id, orden, punto, minutos, fecha, estimada: estimada && aMin(estimada), llegada: llegada && aMin(llegada), estado, salida: null });
  const paradas = [
    P(1, 6, 1, 1, 'Plaza Mayor', 15, dia, '10:00', '10:01', 'HECHA'),
    P(2, 6, 2, 2, 'Plaza', 55, dia, '10:40', null, 'EN_CAMINO'),
    P(3, 6, 3, 3, 'Plaza de la Iglesia', 95, dia, '11:20', null, 'EN_CAMINO'),
    P(4, 6, 4, 4, 'Plaza', 135, dia, '12:00', null, 'EN_CAMINO'),
    P(5, 7, 1, 1, 'Plaza Mayor', 20, dia, '11:50', null, 'PREVISTA'),
    P(6, 7, 2, 2, 'Plaza', 45, dia, '12:15', null, 'PREVISTA'),
    P(7, 7, 3, 3, 'Plaza de la Iglesia', 80, dia, '12:50', null, 'PREVISTA'),
    P(8, 8, 2, 1, 'Plaza', 30, null, null, null, null),
    P(9, 8, 4, 2, 'Plaza', 60, null, null, null, null),
    P(10, 8, 3, 3, 'Plaza de la Iglesia', 90, null, null, null, null),
    P(11, 8, 1, 4, 'Plaza Mayor', 120, null, null, null, null),
  ];
  paradas[0].salida = aMin('10:13');

  const suscripciones = [[2, 6, 15], [2, 7, 15], [3, 6, 10], [4, 6, 15], [4, 7, 30], [12, 6, 20], [11, 6, 15], [11, 8, 15], [10, 6, 15]]
    .map(([vecino_id, vendedor_id, minutos]) => ({ vecino_id, vendedor_id, minutos, activa: true }));

  // Próximo día de reparto de Pilar para el encargo de Teresa
  let diaFruta = sumaDias(dia, 1);
  while (!letras(1, 3).includes(letraDe(diaFruta))) diaFruta = sumaDias(diaFruta, 1);

  const L = (producto_id, desc, cantidad, unidad, precio) => ({ producto_id, desc, cantidad, unidad, precio });
  const E = (id, vecino_id, parada_id, fecha, estado, creado_por, a_domicilio, notas, motivo, creado, aceptado, preparado, entregado, lineas) =>
    ({ id, vecino_id, parada_id, fecha, estado, creado_por, a_domicilio, notas, motivo, creado, aceptado, preparado, entregado, lineas });
  const encargos = [
    E(1, 2, 2, dia, 'PREPARADO', 2, false, 'Si puede ser, la barra poco hecha.', null, tsDe(sumaDias(dia, -1), '19:12'), tsDe(dia, '09:05'), tsDe(dia, '09:20'), null,
      [L(1, 'Barra de pan', 2, 'UNIDAD', 1.10), L(6, 'Tortas de aceite', 1, 'PAQUETE', 2.80)]),
    E(2, 12, 4, dia, 'ACEPTADO', 5, true, 'Se lo dejo en casa, como siempre.', null, hace(1200), hace(1080), null, null,
      [L(3, 'Pan de pueblo redondo', 1, 'UNIDAD', 2.40), L(5, 'Magdalenas', 1, 'DOCENA', 4.50)]),
    E(3, 2, 6, dia, 'PENDIENTE', 5, false, 'Merluza en rodajas, por favor.', null, hace(120), null, null, null,
      [L(8, 'Merluza', 1, 'KG', 14.90), L(10, 'Boquerones', 0.5, 'KG', 7.90)]),
    E(4, 4, 3, dia, 'ACEPTADO', 4, false, null, null, hace(1080), hace(960), null, null, [L(2, 'Hogaza de 1 kg', 1, 'UNIDAD', 3.20)]),
    E(5, 3, 2, dia, 'PENDIENTE', 3, false, null, null, hace(40), null, null, null,
      [L(4, 'Pan integral', 1, 'UNIDAD', 1.60), L(null, 'Barra de centeno (si hay)', 1, 'UNIDAD', null)]),
    E(6, 2, 2, sumaDias(dia, -1), 'ENTREGADO', 2, false, null, null, hace(2880), hace(2400), hace(1560), tsDe(sumaDias(dia, -1), '10:44'),
      [L(1, 'Barra de pan', 2, 'UNIDAD', 1.10), L(5, 'Magdalenas', 1, 'DOCENA', 4.50)]),
    E(7, 11, 11, diaFruta, 'ACEPTADO', 11, false, 'Naranjas de zumo.', null, hace(300), hace(240), null, null,
      [L(14, 'Naranjas', 2, 'KG', 1.80), L(17, 'Lechuga', 1, 'UNIDAD', 1.00)]),
    E(8, 4, 7, sumaDias(dia, -3), 'RECHAZADO', 4, false, null, 'Ese día no quedaba salmón.', hace(5760), null, null, null, [L(11, 'Salmón', 0.5, 'KG', 16.50)]),
  ];

  const C = (municipio_id, tipo, dia_semana, fecha, inicio, fin, lugar = 'Consultorio local', cancelada = false, motivo = null) =>
    ({ municipio_id, tipo, dia_semana, fecha, inicio, fin, lugar, cancelada, motivo });
  const consultas = [
    C(2, 'MEDICINA', diaIso(dia), null, '09:30', '10:30'), C(2, 'MEDICINA', 4, null, '09:30', '10:30'), C(2, 'ENFERMERIA', 3, null, '10:00', '11:00'),
    C(3, 'MEDICINA', 2, null, '11:00', '12:00'), C(3, 'MEDICINA', 5, null, '11:00', '12:00'),
    C(1, 'MEDICINA', 1, null, '09:00', '11:00'), C(1, 'MEDICINA', 3, null, '09:00', '11:00'), C(1, 'MEDICINA', 5, null, '09:00', '11:00'),
    C(4, 'MEDICINA', 4, null, '11:00', '12:00'),
    C(2, 'MEDICINA', null, dia, '09:30', '10:30', 'Centro de Salud de Utrillas', false, 'Reorganización del personal sanitario.'),
  ].filter((c, i, todas) => c.fecha || !todas.some((o, j) => j < i && !o.fecha && o.municipio_id === c.municipio_id && o.tipo === c.tipo && o.dia_semana === c.dia_semana))
   .map((c, i) => ({ id: i + 1, ...c }));

  const A = (municipio_id, autor_id, categoria, titulo, texto, prioridad, estado, push, desde, hasta, creado) =>
    ({ municipio_id, autor_id, categoria, titulo, texto, prioridad, estado, push, desde, hasta, creado });
  const avisos = [
    A(2, 9, 'SANIDAD', 'Hoy no hay consulta en Fuenferrada', 'La consulta de medicina de hoy se pasa en el Centro de Salud de Utrillas, en el mismo horario (9:30 a 10:30).', 'IMPORTANTE', 'PUBLICADO', true, tsDe(dia, '08:05'), tsDe(sumaDias(dia, 1), '00:00'), tsDe(dia, '08:02')),
    A(2, 9, 'SUMINISTROS', 'Corte de agua el miércoles', 'El miércoles se cortará el agua de 9:00 a 13:00 por una reparación en la red. Se recomienda llenar alguna garrafa.', 'NORMAL', 'PUBLICADO', true, hace(1440), base + 3 * 86400000, hace(1440)),
    A(2, 9, 'TRAMITES', 'Recogida de muebles y enseres', 'El jueves pasa el camión de la comarca. Dejad los enseres junto a los contenedores antes de las 8:00.', 'NORMAL', 'PUBLICADO', false, hace(2880), base + 4 * 86400000, hace(2880)),
    A(3, 9, 'TRAMITES', 'Recogida de muebles y enseres', 'El jueves pasa el camión de la comarca. Dejad los enseres junto a los contenedores antes de las 8:00.', 'NORMAL', 'PUBLICADO', false, hace(2880), base + 4 * 86400000, hace(2880)),
    A(1, 10, 'FIESTAS', 'Castañada popular el sábado', 'El sábado a las 18:00 en la plaza. Habrá castañas asadas y chocolate para todos.', 'NORMAL', 'PUBLICADO', true, hace(4320), base + 6 * 86400000, hace(4320)),
    A(null, 9, 'TRANSPORTE', 'Nuevo horario del autobús a Teruel', 'Desde el lunes que viene el autobús sale a las 7:40 (antes 7:30). La vuelta no cambia.', 'NORMAL', 'PUBLICADO', false, hace(1440), base + 10 * 86400000, hace(1440)),
    A(2, 9, 'SANIDAD', 'Campaña de vacunación de la gripe', 'Borrador: falta confirmar con el centro de salud los días de vacunación en cada pueblo.', 'IMPORTANTE', 'BORRADOR', true, base + 2 * 86400000, null, hace(180)),
    A(3, 9, 'SANIDAD', 'Campaña de vacunación de la gripe', 'Borrador: falta confirmar con el centro de salud los días de vacunación en cada pueblo.', 'IMPORTANTE', 'BORRADOR', true, base + 2 * 86400000, null, hace(180)),
  ].map((a, i) => ({ id: i + 1, ...a }));

  // Notificaciones que ya han llegado a cada móvil (en la app real las manda Firebase y no se guardan)
  const notis = [
    { id: 1, uid: 2, icono: 'croissant', titulo: 'El pan llega hacia las 10:40', texto: 'Horno San Jorge ya ha salido de Martín del Río. Te esperará en la Plaza.', ts: hace(0), leida: false },
    { id: 2, uid: 2, icono: 'check', titulo: 'Tu encargo de pan está preparado', texto: 'Barra de pan ×2 · Tortas de aceite. Recógelo en la Plaza.', ts: tsDe(dia, '09:20'), leida: true },
    { id: 3, uid: 2, icono: 'stethoscope', titulo: 'Hoy no hay consulta en Fuenferrada', texto: 'Se pasa en el Centro de Salud de Utrillas, de 9:30 a 10:30.', ts: tsDe(dia, '08:05'), leida: true },
    { id: 4, uid: 5, icono: 'croissant', titulo: 'El pan llega a Fuenferrada hacia las 10:40', texto: 'Aviso para María. Su encargo está preparado.', ts: hace(0), leida: false },
    { id: 5, uid: 4, icono: 'user-plus', titulo: 'Manuel quiere ayudarte', texto: 'Tu primo Manuel ha pedido vincularse contigo. Acéptalo en Ajustes › Mi familia.', ts: hace(1440), leida: false },
  ];

  return {
    meta: { version: 1, dia, inicio: ahora, base, adelanto: 0, sig: { usuario: 14, producto: 18, encargo: 9, consulta: consultas.length + 1, aviso: avisos.length + 1, noti: 6 } },
    municipios, usuarios, familiares, productos, paradas, suscripciones, encargos, consultas, avisos, notis,
  };
}

/* ---------------------------------------------------------------- guardar / cargar */
function cargarDatos() {
  let guardado = null;
  try { guardado = JSON.parse(localStorage.getItem(CLAVE_DATOS) || 'null'); } catch (e) { guardado = null; }
  // Si los datos son de otro día se empieza de nuevo, para que «hoy» cuadre
  if (guardado && guardado.meta && guardado.meta.version === 1 && guardado.meta.dia === isoDia(new Date())) return guardado;
  return semilla();
}
function guardar() { try { localStorage.setItem(CLAVE_DATOS, JSON.stringify(db)); } catch (e) { /* sin almacenamiento: la demo sigue en memoria */ } }
function siguienteId(tabla) { const n = db.meta.sig[tabla]; db.meta.sig[tabla] = n + 1; return n; }

/* ---------------------------------------------------------------- consultas a los datos */
const usuario = id => db.usuarios.find(u => u.id === id);
const municipio = id => db.municipios.find(m => m.id === id);
const producto = id => db.productos.find(p => p.id === id);
const parada = id => db.paradas.find(p => p.id === id);
const encargo = id => db.encargos.find(e => e.id === id);
const aviso = id => db.avisos.find(a => a.id === id);
const nombreCompleto = u => `${u.nombre} ${u.apellidos.split(' ')[0]}`;
const iniciales = u => (u.nombre[0] + (u.apellidos[0] || '')).toUpperCase();
const tieneRol = (u, r) => u.roles.includes(r);
const vendedores = () => db.usuarios.filter(u => tieneRol(u, 'VENDEDOR') && u.activo);
const vecinosDe = mid => db.usuarios.filter(u => tieneRol(u, 'VECINO') && u.activo && u.municipio_id === mid);

const CATEGORIA = {
  PAN: { icono: 'croissant', nombre: 'Pan', circulo: '' },
  PESCADO: { icono: 'fish', nombre: 'Pescado', circulo: 'azul' },
  FRUTA: { icono: 'apple', nombre: 'Fruta y verdura', circulo: 'verde' },
  CARNE: { icono: 'beef', nombre: 'Carne', circulo: '' },
  ULTRAMARINOS: { icono: 'shopping-cart', nombre: 'Ultramarinos', circulo: 'gris' },
  OTROS: { icono: 'store', nombre: 'Otros', circulo: 'gris' },
};
const RUTA_NOMBRE = { PAN: 'Ruta del pan', PESCADO: 'Ruta del pescado', FRUTA: 'Ruta de la fruta', CARNE: 'Ruta de la carne', ULTRAMARINOS: 'Ruta de ultramarinos', OTROS: 'Ruta' };
const UNIDAD = { UNIDAD: ['unidad', 'unidades'], KG: ['kg', 'kg'], DOCENA: ['docena', 'docenas'], PAQUETE: ['paquete', 'paquetes'], LITRO: ['litro', 'litros'] };
const CAT_AVISO = {
  GENERAL: { icono: 'megaphone', nombre: 'General' }, SANIDAD: { icono: 'stethoscope', nombre: 'Sanidad' }, SUMINISTROS: { icono: 'droplets', nombre: 'Agua y luz' },
  TRAMITES: { icono: 'file-text', nombre: 'Trámites' }, FIESTAS: { icono: 'party-popper', nombre: 'Fiestas' }, TRANSPORTE: { icono: 'bus', nombre: 'Transporte' },
};
const TIPO_CONSULTA = { MEDICINA: 'Medicina', ENFERMERIA: 'Enfermería', PEDIATRIA: 'Pediatría', EXTRACCIONES: 'Extracciones' };
const ESTADO_ENCARGO = {
  PENDIENTE: ['pend', 'Sin aceptar'], ACEPTADO: ['azul', 'Aceptado'], PREPARADO: ['ok', 'Preparado'], ENTREGADO: ['', 'Entregado'],
  NO_RECOGIDO: ['error', 'No recogido'], RECHAZADO: ['error', 'Rechazado'], CANCELADO: ['', 'Cancelado'],
};
const ESTADO_PARADA = {
  PREVISTA: ['', 'Previsto'], EN_CAMINO: ['camino', 'En camino'], EN_PARADA: ['ok', 'Ha llegado'], HECHA: ['', 'Ya ha pasado'], CANCELADA: ['error', 'Hoy no viene'],
};
const ROL_NOMBRE = { VECINO: 'Vecino', FAMILIAR: 'Familiar', VENDEDOR: 'Vendedor', AYUNTAMIENTO: 'Ayuntamiento', ADMIN: 'Administración' };
const ENCARGO_ACTIVO = ['PENDIENTE', 'ACEPTADO', 'PREPARADO'];

function euros(n) { return n == null ? '—' : n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'; }
function cantidadTxt(c, unidad) {
  const n = String(c).replace('.', ',');
  if (unidad === 'UNIDAD') return `×${n}`;
  const [s, p] = UNIDAD[unidad];
  return `${n} ${c === 1 ? s : p}`;
}
function importe(e) { return e.lineas.reduce((t, l) => t + (l.precio == null ? 0 : l.precio * l.cantidad), 0); }
function resumenLineas(e) { return e.lineas.map(l => `${l.desc} ${cantidadTxt(l.cantidad, l.unidad)}`).join(' · '); }
function vendedorDeParada(p) { return usuario(p.vendedor_id); }
function vendedorDeEncargo(e) { return usuario(parada(e.parada_id).vendedor_id); }

/* Paradas del día de un vendedor, en orden */
function rutaHoy(vid) { return db.paradas.filter(p => p.vendedor_id === vid && p.fecha === hoy()).sort((a, b) => a.orden - b.orden); }
function paradasDe(vid) { return db.paradas.filter(p => p.vendedor_id === vid).sort((a, b) => a.orden - b.orden); }
function estadoRuta(vid) {
  const r = rutaHoy(vid);
  if (!r.length) return 'SIN_RUTA';
  if (r.every(p => p.estado === 'CANCELADA')) return 'CANCELADA';
  if (r.every(p => ['HECHA', 'CANCELADA'].includes(p.estado))) return 'TERMINADA';
  if (r.every(p => p.estado === 'PREVISTA')) return 'PREVISTA';
  return 'EN_CURSO';
}
function siguienteParada(vid) { return rutaHoy(vid).find(p => ['EN_CAMINO', 'EN_PARADA', 'PREVISTA'].includes(p.estado)); }
function hora(p, fecha = hoy()) {
  // Hora estimada de una parada para un día (hoy: la calculada; otro día: salida + minutos)
  if (fecha === hoy() && p.fecha === hoy() && p.estimada != null) return p.estimada;
  return aMin(usuario(p.vendedor_id).hora_salida) + p.minutos;
}

/* Días en que se puede encargar a una parada, respetando la antelación del vendedor */
function fechasEncargo(p, cuantas = 5) {
  const v = usuario(p.vendedor_id);
  const out = [];
  for (let k = 0; k < 21 && out.length < cuantas; k++) {
    const f = sumaDias(hoy(), k);
    if (k === 0) {
      if (p.fecha !== hoy() || !['PREVISTA', 'EN_CAMINO'].includes(p.estado)) continue;
    } else if (!v.dias_reparto.includes(letraDe(f))) continue;
    const llegada = tsDe(f, hm(hora(p, f)));
    if (llegada - ahoraMs() >= v.horas_antelacion_encargo * 3600000) out.push(f);
  }
  return out;
}
function proximoReparto(v, desde = hoy()) {
  for (let k = 0; k < 8; k++) { const f = sumaDias(desde, k); if (v.dias_reparto.includes(letraDe(f))) return f; }
  return null;
}

/* Consulta médica de un pueblo un día: el cambio de ese día manda sobre el horario habitual */
function consultasDia(mid, iso) {
  const cambios = db.consultas.filter(c => c.municipio_id === mid && c.fecha === iso);
  const habituales = db.consultas.filter(c => c.municipio_id === mid && c.dia_semana === diaIso(iso) && !cambios.some(x => x.tipo === c.tipo));
  return [...cambios.map(c => ({ ...c, cambio: true })), ...habituales.map(c => ({ ...c, cambio: false }))].sort((a, b) => a.inicio.localeCompare(b.inicio));
}

function avisoVigente(a) { const t = ahoraMs(); return a.estado === 'PUBLICADO' && a.desde <= t && (a.hasta == null || a.hasta >= t); }
function avisosPara(mid) { return db.avisos.filter(a => avisoVigente(a) && (a.municipio_id == null || a.municipio_id === mid)).sort((a, b) => (b.prioridad !== 'NORMAL') - (a.prioridad !== 'NORMAL') || b.desde - a.desde); }

/* Familia */
function familiaresDe(vid, estado = 'ACEPTADO') { return db.familiares.filter(f => f.vecino_id === vid && (!estado || f.estado === estado)); }
function ayudadosPor(fid, estado = 'ACEPTADO') { return db.familiares.filter(f => f.familiar_id === fid && (!estado || f.estado === estado)); }

/* A quién llega un aviso sobre un vecino: él (si tiene móvil) y sus familiares que reciben avisos */
function destinatarios(vecinoIds) {
  const set = new Set();
  vecinoIds.forEach(id => {
    const u = usuario(id); if (!u || !u.activo) return;
    if (u.password) set.add(id);
    familiaresDe(id).filter(f => f.recibe_avisos).forEach(f => set.add(f.familiar_id));
  });
  return [...set];
}
function notificar(uids, icono, titulo, texto) {
  uids.forEach(uid => db.notis.unshift({ id: siguienteId('noti'), uid, icono, titulo, texto, ts: ahoraMs(), leida: false }));
  return uids.length;
}
