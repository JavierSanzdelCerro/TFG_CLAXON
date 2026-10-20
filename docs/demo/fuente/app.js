/* =============================================================================
   Claxon · demo · núcleo
   Pinta la app, navega entre pantallas, valida formularios y gestiona la sesión.
   Las pantallas de cada perfil están en vistas.js.
   ============================================================================= */
'use strict';

/* ---------------------------------------------------------------- utilidades */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function ic(n, t = '') {
  const p = ICONOS[n];
  if (!p) console.warn('Falta el icono', n);
  return `<svg class="i ${t}" viewBox="0 0 24 24" aria-hidden="true">${p || ''}</svg>`;
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const telTxt = t => t ? t.replace(/^(\d{3})(\d{3})(\d{3})$/, '$1 $2 $3') : '';
const plural = (n, s, p) => `${n} ${n === 1 ? s : (p || s + 's')}`;
const yo = () => usuario(S.uid);

/* ---------------------------------------------------------------- estado de la interfaz */
const INICIO = { VECINO: 'v-hoy', FAMILIAR: 'f-inicio', VENDEDOR: 'r-ruta', AYUNTAMIENTO: 'a-inicio', ADMIN: 'adm-resumen' };
function estadoInicial() {
  return { uid: null, rol: null, vista: { n: 'bienvenida', p: {} }, pila: [], hoja: null, toast: null, borrador: null, pueblo: null,
    seg: {}, relleno: null, intentos: {}, bloqueo: {}, guiaConfirma: false, tablon: null, foco: null };
}
function guardarSesion() { try { localStorage.setItem(CLAVE_SESION, JSON.stringify({ uid: S.uid, rol: S.rol, dia: db.meta.dia })); } catch (e) { /* nada */ } }
function cargarSesion() {
  try {
    const s = JSON.parse(localStorage.getItem(CLAVE_SESION) || 'null');
    const u = s && s.dia === db.meta.dia && usuario(s.uid);
    if (u && u.activo && u.roles.includes(s.rol)) { S.uid = u.id; S.rol = s.rol; S.vista = { n: INICIO[s.rol], p: {} }; S.pueblo = pueblosGestionados()[0]?.id ?? null; }
  } catch (e) { /* nada */ }
}
const esWeb = () => S.uid && ['AYUNTAMIENTO', 'ADMIN'].includes(S.rol);
function pueblosGestionados() { return S.rol === 'ADMIN' ? db.municipios : db.municipios.filter(m => m.gestor_id === S.uid); }

/* ---------------------------------------------------------------- navegación */
function ir(n, p = {}) { S.pila.push(S.vista); S.vista = { n, p }; S.hoja = null; render(); }
function volver() { S.vista = S.pila.pop() || { n: S.uid ? INICIO[S.rol] : 'bienvenida', p: {} }; S.hoja = null; render(); }
function pestana(n) { S.pila = []; S.vista = { n, p: {} }; S.hoja = null; render(); }
function abrirHoja(tipo, p = {}) { S.hoja = { tipo, p }; render(); }
function cerrarHoja() { S.hoja = null; render(); }
let temporizadorToast = null;
function toast(texto, error = false) {
  S.toast = { texto, error };
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => { S.toast = null; const t = document.querySelector('.toast'); if (t) t.remove(); }, 3600);
}

/* ---------------------------------------------------------------- pintado */
let ultimaVista = '';
let temporizadorBanner = null;
function render() {
  const raiz = document.getElementById('demo');
  const clave = JSON.stringify(S.vista);
  const zonas = [...raiz.querySelectorAll('[data-scroll]')].map(el => [el.dataset.scroll, el.scrollTop]);
  const web = esWeb();
  raiz.className = 'demo' + (web ? ' web' : '');
  raiz.innerHTML = (web ? '' : `<aside class="guia" aria-label="Guía de la demo">${guiaHTML()}</aside>`)
    + `<main class="escenario">${web ? panelHTML() : movilHTML()}</main>`
    + (S.tablon ? tablonCompletoHTML() : '');
  if (clave === ultimaVista) zonas.forEach(([k, top]) => { const el = raiz.querySelector(`[data-scroll="${k}"]`); if (el) el.scrollTop = top; });
  else window.scrollTo(0, 0);
  ultimaVista = clave;
  ajustarTablones();
  // El aviso de arriba se guarda como leído a los pocos segundos, como en un móvil de verdad
  const banner = raiz.querySelector('.push.en-app');
  if (banner) {
    const id = Number(banner.dataset.id);
    clearTimeout(temporizadorBanner);
    temporizadorBanner = setTimeout(() => {
      const n = db.notis.find(x => x.id === id); if (n) n.leida = true; guardar();
      const b = document.querySelector(`.push.en-app[data-id="${id}"]`); if (b) b.remove();
    }, 7000);
  }
  if (S.foco) { const el = raiz.querySelector(S.foco); S.foco = null; if (el) el.focus({ preventScroll: false }); }
}

function movilHTML() {
  const u = S.uid && yo();
  const clases = ['pantalla-app'];
  if (u && S.rol === 'VECINO') {
    if (u.tamano_texto === 'GRANDE') clases.push('t-grande');
    if (u.tamano_texto === 'MUY_GRANDE') clases.push('t-muy-grande');
    if (u.alto_contraste) clases.push('contraste');
  }
  const vista = VISTAS[S.vista.n] || VISTAS.bienvenida;
  if (S.vista.n === 'bienvenida') clases.push('portada');
  return `<div class="movil"><div class="${clases.join(' ')}">
      ${barraEstado()}
      ${bannerNoti()}
      ${vista(S.vista.p)}
      ${S.hoja ? `<div class="velo" data-a="cerrar-hoja"></div><div class="hoja" role="dialog" aria-modal="true" data-scroll="hoja"><span class="asa"></span>${HOJAS[S.hoja.tipo](S.hoja.p)}</div>` : ''}
      ${S.toast ? toastHTML() : ''}
    </div></div>
    <p class="pie-escenario">${ic('info', 'xs')} Lo que hagas se guarda solo en este navegador.</p>`;
}
function barraEstado() {
  return `<div class="estado"><span class="reloj-txt num">${hm(minAhora())}</span><span class="isla"></span><span class="der">${ic('signal')}${ic('wifi')}${ic('battery-full')}</span></div>`;
}
function toastHTML() { return `<div class="toast ${S.toast.error ? 'error' : ''}" role="status">${ic(S.toast.error ? 'circle-alert' : 'circle-check', 's')}<span>${esc(S.toast.texto)}</span></div>`; }
function bannerNoti() {
  if (!S.uid || !S.rol || esWeb() || S.hoja) return '';
  const n = db.notis.find(x => x.uid === S.uid && !x.leida);
  if (!n) return '';
  return `<div class="push en-app" data-a="leer-noti" data-id="${n.id}" role="status">
      <span class="logo">${ic(n.icono || 'bell', 's')}</span>
      <div><span class="app">Claxon · ahora</span><b>${esc(n.titulo)}</b><p>${esc(n.texto)}</p></div>
      <button class="cerrar" data-a="leer-noti" data-id="${n.id}" aria-label="Cerrar aviso">${ic('x', 's')}</button>
    </div>`;
}

/* Piezas comunes de pantalla */
function cab(titulo, { volver: v = true, extra = '' } = {}) {
  return `<div class="cab">${v ? `<button class="volver" data-a="volver" aria-label="Volver">${ic('chevron-left')}</button>` : ''}<h1>${titulo}</h1>${extra}</div>`;
}
function cabHola(eti, titulo, u) {
  return `<div class="cab" style="align-items:flex-start;padding-top:6px">
      <div style="flex:1;display:grid;gap:4px;min-width:0"><span class="eti acento">${eti}</span><h1 class="titulo-g" style="font-size:30px">${titulo}</h1></div>
      <button class="avatar ${u.roles.includes('VENDEDOR') ? 'osc' : ''}" style="border:0" data-a="pestana" data-v="${ajustesDe(S.rol)}" aria-label="Ajustes">${iniciales(u)}</button>
    </div>`;
}
function cuerpo(html, estilo = '') { return `<div class="cuerpo" data-scroll="cuerpo" style="${estilo}">${html}</div>`; }
function pie(html, estilo = '') { return `<div class="pie-acciones" style="${estilo}">${html}</div>`; }
function navMovil(items, activo) {
  return `<nav class="nav" aria-label="Menú">${items.map(([v, icono, txt, globo]) =>
    `<button class="${v === activo ? 'activo' : ''}" data-a="pestana" data-v="${v}" ${v === activo ? 'aria-current="page"' : ''}>${ic(icono)}<span>${txt}</span>${globo ? `<span class="globo">${globo}</span>` : ''}</button>`).join('')}</nav>`;
}
function ajustesDe(rol) { return { VECINO: 'v-ajustes', FAMILIAR: 'f-ajustes', VENDEDOR: 'r-ajustes' }[rol] || 'v-ajustes'; }
function pill(clase, txt, punto = false) { return `<span class="pill ${clase}">${punto ? '<span class="punto"></span>' : ''}${txt}</span>`; }
function interruptor(on, accion, datos = '', etiqueta = '') { return `<button class="interruptor ${on ? 'on' : ''}" role="switch" aria-checked="${on}" aria-label="${esc(etiqueta)}" data-a="${accion}" ${datos}></button>`; }
function vacio(icono, titulo, texto = '') { return `<div class="vacio"><span class="circulo gris">${ic(icono)}</span><b>${titulo}</b>${texto ? `<p class="peq">${texto}</p>` : ''}</div>`; }
function segmentos(clave, opciones, def) {
  const actual = S.seg[clave] ?? def;
  return `<div class="segmentos" role="tablist">${opciones.map(([v, t]) => `<button role="tab" aria-selected="${v === actual}" class="${v === actual ? 'on' : ''}" data-a="segmento" data-clave="${clave}" data-v="${v}">${t}</button>`).join('')}</div>`;
}
const seg = (clave, def) => S.seg[clave] ?? def;

/* ---------------------------------------------------------------- formularios */
/* campo({n, l, tipo, v, ph, ayuda, icono, max, opciones}) pinta etiqueta, caja, ayuda y hueco para el error */
function campo({ n, l, tipo = 'text', v = '', ph = '', ayuda = '', icono = '', max = 0, opciones = null, auto = 'off', modo = '', extra = '' }) {
  const id = `f-${n}`;
  let control;
  if (tipo === 'select') {
    control = `<div class="entrada">${icono ? ic(icono, 's') : ''}<select id="${id}" name="${n}">${opciones.map(([val, txt]) => `<option value="${esc(val)}" ${String(val) === String(v) ? 'selected' : ''}>${esc(txt)}</option>`).join('')}</select>${ic('chevron-down', 's')}</div>`;
  } else if (tipo === 'textarea') {
    control = `<textarea class="entrada" id="${id}" name="${n}" rows="3" placeholder="${esc(ph)}" ${max ? `data-max="${max}"` : ''} ${extra}>${esc(v)}</textarea>`;
  } else {
    const ojo = tipo === 'password' ? `<button type="button" class="ojo" data-a="ver-clave" aria-label="Mostrar la contraseña">${ic('eye', 's')}</button>` : '';
    control = `<div class="entrada">${icono ? ic(icono, 's') : ''}<input id="${id}" name="${n}" type="${tipo}" value="${esc(v)}" placeholder="${esc(ph)}" autocomplete="${auto}" ${modo ? `inputmode="${modo}"` : ''} ${max ? `data-max="${max}"` : ''} ${extra}>${ojo}</div>`;
  }
  const cuenta = max ? `<span class="cuenta" data-cuenta="${n}">${String(v).length} / ${max}</span>` : '';
  return `<div class="campo" data-campo="${n}"><label for="${id}">${l}</label>${control}
      ${ayuda || cuenta ? `<div style="display:flex;gap:10px;justify-content:space-between">${ayuda ? `<span class="ayuda">${ayuda}</span>` : '<span></span>'}${cuenta}</div>` : ''}
      <p class="error" id="e-${n}" role="alert"></p></div>`;
}
/* Grupo con un valor oculto que se elige pulsando chips o radios (data-a="elegir") */
function oculto(n, v, attrs = '') { return `<input type="hidden" name="${n}" value="${esc(v)}" ${attrs}>`; }
function grupoCampo(n, etiqueta, html, ayuda = '') {
  return `<div class="campo" data-campo="${n}"><span class="lbl">${etiqueta}</span>${html}${ayuda ? `<span class="ayuda">${ayuda}</span>` : ''}<p class="error" id="e-${n}" role="alert"></p></div>`;
}
function chipsElegir(n, opciones, actual, multi = false, attrs = '') {
  const sel = multi ? String(actual).split(',').filter(Boolean) : [String(actual)];
  return `${oculto(n, actual, attrs)}<div class="chips">${opciones.map(([v, t]) => `<button type="button" class="chip ${sel.includes(String(v)) ? 'on' : ''}" data-a="${multi ? 'marcar' : 'elegir'}" data-campo="${n}" data-valor="${esc(v)}" aria-pressed="${sel.includes(String(v))}">${t}</button>`).join('')}</div>`;
}
function radiosElegir(n, opciones, actual) {
  return `${oculto(n, actual)}<div style="display:grid;gap:8px">${opciones.map(([v, t, sub]) => `<button type="button" class="radio ${String(v) === String(actual) ? 'on' : ''}" data-a="elegir" data-campo="${n}" data-valor="${esc(v)}" aria-pressed="${String(v) === String(actual)}"><i></i><div><b>${t}</b>${sub ? `<div class="peq texto-t">${sub}</div>` : ''}</div></button>`).join('')}</div>`;
}
function casilla(n, texto, on) {
  return `${oculto(n, on ? '1' : '')}<button type="button" class="casilla" data-a="casilla" data-campo="${n}" aria-pressed="${!!on}"><i class="${on ? 'on' : ''}">${on ? ic('check') : ''}</i><span>${texto}</span></button>`;
}

function leerForm(f, boton) {
  const out = {};
  new FormData(f).forEach((v, k) => { out[k] = typeof v === 'string' ? v : ''; });
  if (boton && boton.name) out[boton.name] = boton.value;
  return out;
}
function mostrarError(f, n, msg) {
  const c = f.querySelector(`[data-campo="${n}"]`);
  if (!c) { const g = f.querySelector('[data-error-general]'); if (g) { g.hidden = false; g.querySelector('span').textContent = msg; } return; }
  c.classList.add('mal'); c.classList.remove('bien');
  const e = c.querySelector('.error'); e.innerHTML = `${ic('circle-alert')}<span>${esc(msg)}</span>`;
  const ctrl = c.querySelector('input:not([type=hidden]), select, textarea');
  if (ctrl) { ctrl.setAttribute('aria-invalid', 'true'); ctrl.setAttribute('aria-describedby', `e-${n}`); }
}
function limpiarError(f, n) {
  const c = f.querySelector(`[data-campo="${n}"]`);
  if (c && c.classList.contains('mal')) { c.classList.remove('mal'); const ctrl = c.querySelector('[aria-invalid]'); if (ctrl) ctrl.removeAttribute('aria-invalid'); }
  const g = f.querySelector('[data-error-general]'); if (g) g.hidden = true;
}
function pintarErrores(f, errores) {
  const nombres = Object.keys(errores);
  nombres.forEach(n => mostrarError(f, n, errores[n]));
  const primero = f.querySelector(`[data-campo="${nombres[0]}"]`) || f.querySelector('[data-error-general]');
  if (primero) {
    primero.scrollIntoView({ block: 'center', behavior: 'smooth' });
    const ctrl = primero.querySelector('input:not([type=hidden]), select, textarea, button');
    if (ctrl) ctrl.focus({ preventScroll: true });
    primero.classList.remove('temblor'); void primero.offsetWidth; primero.classList.add('temblor');
  }
}
function validar(id, vals) {
  const reglas = REGLAS[id] || {};
  const errores = {};
  for (const [n, regla] of Object.entries(reglas)) { const m = regla(vals[n] ?? '', vals); if (m) errores[n] = m; }
  return errores;
}

/* ---------------------------------------------------------------- reglas de validación */
const RE_EMAIL = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const RE_NOMBRE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñÀÈÌÒÙàèìòùÇçÏï'·. -]+$/;
const normTel = v => v.replace(/[\s.\-()]/g, '').replace(/^(\+34|0034)/, '');
const V = {
  nombre(v, que = 'tu nombre') {
    v = v.trim();
    if (!v) return `Escribe ${que}.`;
    if (v.length < 2) return 'Es demasiado corto: pon al menos 2 letras.';
    if (v.length > 60) return 'Es demasiado largo: máximo 60 letras.';
    if (!RE_NOMBRE.test(v)) return 'Usa solo letras, sin números ni símbolos.';
  },
  telefono(v, { opcional = false, movil = false } = {}) {
    const t = normTel(v);
    if (!t) return opcional ? undefined : 'Escribe el número de teléfono.';
    if (/[^\d]/.test(t)) return 'El teléfono solo puede llevar números.';
    if (t.length !== 9) return `El teléfono tiene que tener 9 cifras y tiene ${t.length}. Ejemplo: 600 111 222.`;
    if (!/^[6789]/.test(t)) return 'Los teléfonos de España empiezan por 6, 7, 8 o 9.';
    if (movil && !/^[67]/.test(t)) return 'Para recibir avisos hace falta un móvil (empieza por 6 o 7).';
  },
  email(v, { opcional = false } = {}) {
    v = v.trim();
    if (!v) return opcional ? undefined : 'Escribe tu correo.';
    if (!v.includes('@')) return 'Al correo le falta la @. Ejemplo: nombre@correo.es';
    if (!RE_EMAIL.test(v)) return 'El correo no está bien escrito. Ejemplo: nombre@correo.es';
    if (v.length > 120) return 'El correo es demasiado largo.';
  },
  password(v) {
    if (!v) return 'Escribe una contraseña.';
    if (v.length < 8) return `La contraseña tiene que tener al menos 8 caracteres (llevas ${v.length}).`;
    if (!/[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(v) || !/\d/.test(v)) return 'La contraseña tiene que llevar al menos una letra y un número.';
    if (v.length > 72) return 'Máximo 72 caracteres.';
  },
  texto(v, { min = 0, max = 200, que = 'este campo', opcional = false } = {}) {
    v = v.trim();
    if (!v) return opcional ? undefined : `Rellena ${que}.`;
    if (v.length < min) return `Escribe al menos ${min} caracteres (llevas ${v.length}).`;
    if (v.length > max) return `Máximo ${max} caracteres (llevas ${v.length}).`;
  },
};
function fuerzaClave(v) {
  if (!v) return 0;
  let n = 0;
  if (v.length >= 8) n++;
  if (/[A-Za-z]/.test(v) && /\d/.test(v)) n++;
  if (/[A-Z]/.test(v) && /[a-z]/.test(v)) n++;
  if (/[^A-Za-z0-9]/.test(v) || v.length >= 12) n++;
  return Math.max(1, n);
}
function buscarCuenta(texto) {
  const t = texto.trim().toLowerCase();
  return t.includes('@') ? db.usuarios.find(u => u.email && u.email === t) : db.usuarios.find(u => u.telefono && u.telefono === normTel(t));
}

const REGLAS = {
  entrar: {
    usuario(v) {
      v = v.trim();
      if (!v) return 'Escribe tu teléfono o tu correo.';
      if (v.includes('@')) return V.email(v);
      const t = normTel(v);
      if (/[^\d]/.test(t)) return 'Escribe un teléfono (solo números) o un correo con @.';
      if (t.length !== 9) return `El teléfono tiene que tener 9 cifras y tiene ${t.length}. Ejemplo: 600 111 222.`;
    },
    password: v => v ? undefined : 'Escribe tu contraseña.',
  },
  olvido: {
    usuario: v => REGLAS.entrar.usuario(v) || (buscarCuenta(v) ? undefined : 'No hay ninguna cuenta con ese teléfono o correo.'),
  },
  registro: {
    nombre: v => V.nombre(v),
    apellidos: v => V.nombre(v, 'tus apellidos'),
    telefono: v => V.telefono(v, { movil: true }) || (db.usuarios.some(u => u.telefono === normTel(v)) ? 'Ya hay una cuenta con este teléfono. Entra con él o usa otro.' : undefined),
    email: v => V.email(v, { opcional: true }) || (v.trim() && db.usuarios.some(u => u.email === v.trim().toLowerCase()) ? 'Ya hay una cuenta con este correo.' : undefined),
    password: v => V.password(v),
    password2: (v, t) => !v ? 'Repite la contraseña.' : (v !== t.password ? 'Las dos contraseñas no son iguales.' : undefined),
    municipio: v => v ? undefined : 'Elige tu pueblo.',
    direccion: v => V.texto(v, { min: 4, max: 120, opcional: true }),
    condiciones: v => v ? undefined : 'Tienes que aceptar las condiciones para crear la cuenta.',
  },
};

/* ---------------------------------------------------------------- envío de formularios */
const ENVIOS = {
  entrar(vals) {
    const clave = vals.usuario.trim().toLowerCase();
    const bloqueo = S.bloqueo[clave];
    if (bloqueo && bloqueo > Date.now()) return { password: `Has fallado 5 veces. Espera ${Math.ceil((bloqueo - Date.now()) / 1000)} segundos y vuelve a probar.` };
    const u = buscarCuenta(vals.usuario);
    if (!u) return { usuario: 'No hay ninguna cuenta con ese teléfono o correo. Revisa que esté bien escrito o crea una cuenta.' };
    if (!u.password) return { usuario: 'Esta persona no tiene cuenta para entrar: la gestiona un familiar desde su móvil.' };
    if (!u.activo) return { usuario: `Esta cuenta se dio de baja el ${new Date(u.fecha_baja).toLocaleDateString('es-ES')}. Si quieres volver, habla con tu ayuntamiento.` };
    if (vals.password !== u.password) {
      const n = (S.intentos[clave] || 0) + 1;
      S.intentos[clave] = n;
      if (n >= 5) { S.bloqueo[clave] = Date.now() + 30000; S.intentos[clave] = 0; return { password: 'Has fallado 5 veces. Por seguridad, espera 30 segundos y vuelve a probar.' }; }
      return { password: `La contraseña no es correcta. Te ${5 - n === 1 ? 'queda 1 intento' : `quedan ${5 - n} intentos`}. Fíjate en mayúsculas y minúsculas.` };
    }
    S.intentos[clave] = 0;
    iniciarSesion(u);
  },
  olvido(vals) {
    const u = buscarCuenta(vals.usuario);
    S.vista = { n: 'entrar', p: {} }; S.pila = [{ n: 'bienvenida', p: {} }];
    toast(u.telefono && !vals.usuario.includes('@') ? `Te hemos enviado un SMS al ${telTxt(u.telefono)} (en la demo no llega).` : `Te hemos enviado un correo a ${u.email} (en la demo no llega).`);
    render();
  },
  registro(vals) {
    const id = siguienteId('usuario');
    const mid = Number(vals.municipio);
    const codigo = Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random() * 32)]).join('');
    db.usuarios.push({ id, roles: ['VECINO'], nombre: vals.nombre.trim(), apellidos: vals.apellidos.trim(), email: vals.email.trim().toLowerCase() || null,
      telefono: normTel(vals.telefono), password: vals.password, municipio_id: mid, direccion: vals.direccion.trim() || null, codigo_familia: codigo,
      idioma: 'es', tamano_texto: 'NORMAL', alto_contraste: false, activo: true, fecha_baja: null, necesita_ayuda_entrega: false, notas_entrega: null,
      nombre_comercial: null, categoria: null, dias_reparto: null, hora_salida: null, acepta_encargos: false, horas_antelacion_encargo: 0,
      email_verificado: false, fecha_alta: ahoraMs(), ultimo_acceso: ahoraMs() });
    // Se suscribe a todos los vendedores que pasan por su pueblo (lo puede cambiar en Ajustes)
    vendedores().filter(v => db.paradas.some(p => p.vendedor_id === v.id && p.municipio_id === mid))
      .forEach(v => db.suscripciones.push({ vecino_id: id, vendedor_id: v.id, minutos: 15, activa: true }));
    guardar();
    iniciarSesion(usuario(id), `Cuenta creada. Bienvenida o bienvenido, ${vals.nombre.trim()}.`);
  },
};

function iniciarSesion(u, mensaje) {
  S.uid = u.id; u.ultimo_acceso = ahoraMs(); guardar();
  if (u.roles.length > 1) { S.rol = null; S.pila = []; S.vista = { n: 'elegir-perfil', p: {} }; render(); return; }
  entrarComo(u.roles[0], mensaje);
}
function entrarComo(rol, mensaje) {
  S.rol = rol; S.pila = []; S.hoja = null; S.seg = {}; S.borrador = null;
  S.vista = { n: INICIO[rol], p: {} };
  S.pueblo = pueblosGestionados()[0]?.id ?? null;
  guardarSesion();
  toast(mensaje || `Hola, ${yo().nombre}. Has entrado como ${ROL_NOMBRE[rol].toLowerCase()}.`);
  render();
}
function cerrarSesion(mensaje = 'Has cerrado la sesión.') {
  S.uid = null; S.rol = null; S.pila = []; S.hoja = null; S.borrador = null; S.seg = {};
  S.vista = { n: 'bienvenida', p: {} };
  guardarSesion();
  if (mensaje) toast(mensaje);
  render();
}

/* ---------------------------------------------------------------- pantallas de acceso */
const VISTAS = {};
const HOJAS = {};
const ACC = {};

VISTAS.bienvenida = () => `
  <div class="cuerpo" data-scroll="cuerpo" style="justify-content:space-between;padding:20px 28px 30px">
    <div style="display:grid;gap:20px;margin-top:18px">
      <div style="width:72px;height:72px;border-radius:20px;background:#fff;color:var(--a-acento);display:grid;place-items:center">${ic('volume-2', 'l')}</div>
      <div>
        <div style="font:700 66px/1 var(--f-display);letter-spacing:-.01em">Claxon</div>
        <div style="font:italic 500 25px/1.25 var(--f-display);margin-top:12px">El radar de lo que pasa por tu pueblo</div>
      </div>
      <p style="font-size:17.5px;line-height:1.5;opacity:.95">Te avisa cuando llega el panadero, el pescadero o hay cambios en la consulta, y te deja hacer encargos antes de que lleguen.</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap">${['croissant', 'fish', 'apple', 'stethoscope', 'megaphone'].map(i => `<span class="circulo" style="background:rgba(255,255,255,.16);color:#fff">${ic(i)}</span>`).join('')}</div>
    </div>
    <div style="display:grid;gap:12px;margin-top:22px">
      <button class="boton" style="background:#fff;color:var(--a-acento)" data-a="ir" data-v="entrar">Entrar</button>
      <button class="boton" style="background:transparent;border:2px solid rgba(255,255,255,.7)" data-a="ir" data-v="registro">Crear una cuenta</button>
      <div style="display:flex;justify-content:center;gap:18px;flex-wrap:wrap;padding-top:6px">
        <button class="enlace" style="color:#fff" data-a="hoja" data-v="usuarios">Usuarios de prueba</button>
        <button class="enlace" style="color:#fff" data-a="hoja" data-v="elegir-tablon">Ver el tablón del bar</button>
      </div>
    </div>
  </div>`;

VISTAS.entrar = () => {
  const r = S.relleno || {}; S.relleno = null;
  return `${cab('')}
  ${cuerpo(`
    <div style="display:grid;gap:8px"><h1 class="titulo-g">Entrar en Claxon</h1><p class="texto-t">Con tu teléfono o tu correo.</p></div>
    <form data-form="entrar" novalidate style="display:grid;gap:18px">
      ${campo({ n: 'usuario', l: 'Teléfono o correo', v: r.usuario || '', ph: '600 111 222', icono: 'smartphone', auto: 'username', extra: 'autocapitalize="none"' })}
      ${campo({ n: 'password', l: 'Contraseña', tipo: 'password', v: r.password || '', icono: 'lock', auto: 'current-password' })}
      <button class="boton" type="submit">Entrar</button>
      <button type="button" class="enlace" style="justify-self:center" data-a="ir" data-v="olvido">He olvidado la contraseña</button>
    </form>
    <div class="tarjeta crema" style="margin-top:auto">
      <div class="fila" style="align-items:flex-start">${ic('flask-conical')}<p class="peq">Es una demo. Todas las cuentas usan la contraseña <b class="mono">${CONTRASENA_DEMO}</b>. <button class="enlace peq" data-a="hoja" data-v="usuarios">Ver usuarios de prueba</button></p></div>
    </div>`, 'gap:22px')}
  ${pie(`<p class="peq" style="text-align:center">¿No tienes cuenta? <button class="enlace peq" data-a="ir" data-v="registro">Crear una</button></p>`, 'border:0')}`;
};

VISTAS.olvido = () => `${cab('Recuperar la contraseña')}
  ${cuerpo(`<p class="texto-t">Escribe tu teléfono o tu correo y te enviaremos un código para crear una contraseña nueva.</p>
    <form data-form="olvido" novalidate style="display:grid;gap:18px">
      ${campo({ n: 'usuario', l: 'Teléfono o correo', ph: '600 111 222', icono: 'smartphone' })}
      <button class="boton" type="submit">${ic('send', 's')} Enviar el código</button>
    </form>`)}`;

VISTAS.registro = () => {
  const opciones = [['', 'Elige tu pueblo…'], ...db.municipios.map(m => [m.id, m.nombre])];
  return `${cab('Crear una cuenta')}
  ${cuerpo(`<p class="texto-t">Para recibir avisos de los servicios que pasan por tu pueblo.</p>
    <form data-form="registro" novalidate style="display:grid;gap:16px">
      ${campo({ n: 'nombre', l: 'Nombre', ph: 'María', auto: 'given-name' })}
      ${campo({ n: 'apellidos', l: 'Apellidos', ph: 'Pérez Gascón', auto: 'family-name' })}
      ${campo({ n: 'telefono', l: 'Móvil', ph: '600 111 222', icono: 'smartphone', modo: 'tel', auto: 'tel', ayuda: 'Con él entrarás en la app.' })}
      ${campo({ n: 'email', l: 'Correo (opcional)', ph: 'nombre@correo.es', icono: 'mail', modo: 'email', auto: 'email', extra: 'autocapitalize="none"' })}
      ${campo({ n: 'password', l: 'Contraseña', tipo: 'password', icono: 'lock', auto: 'new-password', ayuda: 'Mínimo 8 caracteres, con letras y números.', extra: 'data-fuerza' })}
      <div class="fuerza" data-n="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      ${campo({ n: 'password2', l: 'Repite la contraseña', tipo: 'password', icono: 'lock', auto: 'new-password' })}
      ${campo({ n: 'municipio', l: 'Tu pueblo', tipo: 'select', opciones, icono: 'map-pin' })}
      ${campo({ n: 'direccion', l: 'Dirección (opcional)', ph: 'C/ Mayor, 12', icono: 'house', ayuda: 'Solo si quieres que te lleven los encargos a casa.' })}
      ${grupoCampo('condiciones', '', casilla('condiciones', 'Acepto las condiciones de uso y la política de privacidad.', false))}
      <button class="boton" type="submit">Crear mi cuenta</button>
    </form>`)}`;
};

VISTAS['elegir-perfil'] = () => {
  const u = yo();
  const desc = { VECINO: 'Ver qué pasa hoy por tu pueblo y hacer encargos.', FAMILIAR: 'Ayudar a tus familiares desde tu móvil.', VENDEDOR: 'Tu ruta, tus encargos y tu catálogo.', AYUNTAMIENTO: 'Publicar avisos y cambios de la consulta (panel web).', ADMIN: 'Resumen del piloto (panel web).' };
  const icono = { VECINO: 'house', FAMILIAR: 'hand-heart', VENDEDOR: 'truck', AYUNTAMIENTO: 'landmark', ADMIN: 'shield' };
  return `${cab('', { volver: false })}
  ${cuerpo(`<div style="display:grid;gap:8px"><span class="eti acento">Una cuenta, ${u.roles.length} perfiles</span><h1 class="titulo-g">¿Cómo quieres entrar, ${esc(u.nombre)}?</h1>
      <p class="texto-t">Puedes cambiar de perfil cuando quieras desde Ajustes.</p></div>
    <div style="display:grid;gap:12px">${u.roles.map(r => `<button class="tarjeta" data-a="entrar-como" data-v="${r}">
      <div class="fila"><span class="circulo">${ic(icono[r])}</span><div class="flex"><div class="t1">${ROL_NOMBRE[r]}</div><div class="t2">${desc[r]}</div></div>${ic('chevron-right', 's')}</div></button>`).join('')}</div>
    <button class="enlace" style="justify-self:center" data-a="cerrar-sesion">Salir</button>`, 'gap:22px')}`;
};

/* ---------------------------------------------------------------- hojas comunes */
const DEMO_USUARIOS = [
  [2, '600 111 222', 'Vecina de Fuenferrada'], [3, '600 333 444', 'Vecino y familiar (2 perfiles)'], [4, 'carmen.lopez@demo.claxon', 'Vecina de Segura de los Baños'],
  [11, '600 777 888', 'Vecina de Martín del Río'], [5, 'laura.perez@demo.claxon', 'Familiar de María y Joaquín'], [6, 'horno.sanjorge@demo.claxon', 'Panadero · ruta en camino'],
  [7, 'pescados.gil@demo.claxon', 'Pescadero · ruta sin empezar'], [8, 'frutas.pilar@demo.claxon', 'Frutera · hoy no reparte'], [9, 'secretaria@demo.claxon', 'Ayuntamiento de 3 pueblos (web)'],
  [10, 'alcaldia.mdr@demo.claxon', 'Alcalde y vecino (2 perfiles)'], [1, 'admin@claxon.app', 'Administración (web)'], [13, '600 999 000', 'Cuenta dada de baja: no puede entrar'],
];
function listaUsuariosDemo() {
  return `<ul class="usuarios-demo">${DEMO_USUARIOS.map(([id, acceso, desc]) => {
    const u = usuario(id); if (!u) return '';
    return `<li><b>${esc(u.nombre)} ${esc(u.apellidos.split(' ')[0])}</b><span>${desc}</span><code>${esc(acceso)}</code>
      <button class="boton-mesa" data-a="usar" data-acceso="${esc(acceso)}">Usar</button></li>`;
  }).join('')}</ul>`;
}
HOJAS.usuarios = () => `<h2 class="titulo-m">Usuarios de prueba</h2>
  <p class="peq texto-t">Contraseña de todos: <b class="mono" style="color:var(--a-tinta)">${CONTRASENA_DEMO}</b>. Pulsa «Usar» y se rellena el formulario de entrada.</p>
  <div class="hoja-usuarios">${listaUsuariosDemo()}</div>
  <button class="boton sec" data-a="cerrar-hoja">Cerrar</button>`;
HOJAS.guia = () => `<h2 class="titulo-m">Guía de la demo</h2>${guiaHTML(true)}<button class="boton sec" data-a="cerrar-hoja">Cerrar</button>`;
HOJAS['elegir-tablon'] = () => `<h2 class="titulo-m">Tablón del bar</h2>
  <p class="peq texto-t">Es la pantalla que se pone en la tele del bar o del local social, para quien no usa el móvil. Se actualiza sola.</p>
  <div class="tarjeta sin-pad lista">${db.municipios.filter(m => m.tablon_ubicacion).map(m => `<button class="fila" data-a="abrir-tablon" data-id="${m.id}"><span class="circulo gris">${ic('tv')}</span><div class="flex"><div class="t1">${esc(m.nombre)}</div><div class="t2">${esc(m.tablon_ubicacion)}</div></div>${ic('chevron-right', 's')}</button>`).join('')}</div>
  <button class="boton sec" data-a="cerrar-hoja">Cerrar</button>`;
/* Confirmación genérica: p = {titulo, texto, boton, accion, id, peligro} */
HOJAS.confirmar = p => `<h2 class="titulo-m">${p.titulo}</h2>${p.texto ? `<p class="texto-t">${p.texto}</p>` : ''}
  <button class="boton ${p.peligro ? 'peligro' : ''}" data-a="${p.accion}" data-id="${p.id ?? ''}" data-v="${p.v ?? ''}">${p.boton}</button>
  <button class="boton sec" data-a="cerrar-hoja">No, volver</button>`;

/* ---------------------------------------------------------------- guía de la demo (lateral en escritorio) */
function guiaHTML(compacta = false) {
  const reloj = `<section><h2>Hora en la demo</h2><div class="reloj-demo"><b class="reloj-txt">${hm(minAhora())}</b>
      <button class="boton-mesa" data-a="adelantar">${ic('fast-forward', 'xs')} Adelantar 15 min</button></div>
      <p class="peq">La demo empieza a las 10:25: el pan va de camino y el pescado aún no ha salido.</p></section>`;
  const reinicio = S.guiaConfirma
    ? `<div class="confirma"><b>¿Borrar todo lo que has hecho y volver a los datos del principio?</b><div><button class="boton-mesa peligro" data-a="reiniciar">Sí, borrar</button><button class="boton-mesa" data-a="guia-confirma">Cancelar</button></div></div>`
    : `<div><button class="boton-mesa" data-a="guia-confirma">${ic('rotate-ccw', 'xs')} Volver a empezar</button></div>`;
  const pasos = `<section><h2>Prueba esto</h2><ol class="pasos">
      <li>Entra como <b>Jorge</b> (panadero) y pulsa <b>«He llegado a Fuenferrada»</b>.</li>
      <li>Sal y entra como <b>María</b>: verás el aviso y que el pan ha llegado.</li>
      <li>Como María, haz un <b>encargo de pescado</b>. Luego entra como <b>Antonio</b> y acéptalo.</li>
      <li>Como <b>Ana</b> (ayuntamiento), publica un aviso y míralo en el <b>tablón</b>.</li>
      <li>Escribe mal un teléfono, un correo o la contraseña para ver los mensajes de error.</li>
    </ol></section>`;
  if (compacta) return `<div style="display:grid;gap:18px" class="guia-compacta">${pasos}${reloj}<section><h2>Datos</h2><p class="peq texto-t">Lo que hagas se guarda solo en este navegador.</p>${reinicio}</section></div>`;
  return `<div style="display:grid;gap:6px"><h1>Claxon <em>demo</em></h1><p>El radar de lo que pasa por tu pueblo. Prueba la app con cualquiera de estos usuarios.</p></div>
    <div class="clave">${ic('key-round', 's')}<code>${CONTRASENA_DEMO}</code><button class="boton-mesa" data-a="copiar" data-texto="${CONTRASENA_DEMO}">${ic('copy', 'xs')} Copiar</button></div>
    <section><h2>Usuarios de prueba</h2>${listaUsuariosDemo()}</section>
    ${pasos}${reloj}
    <section><h2>Tus datos</h2><p class="peq">Todo lo que hagas se guarda solo en este navegador. Cada persona que abra el enlace tiene su propia copia.</p>${reinicio}</section>`;
}

/* ---------------------------------------------------------------- acciones */
ACC.ir = d => ir(d.v, d.id ? { id: Number(d.id) } : {});
ACC.volver = () => volver();
ACC.pestana = d => pestana(d.v);
ACC.hoja = d => abrirHoja(d.v, d.id ? { id: Number(d.id) } : {});
ACC['cerrar-hoja'] = () => cerrarHoja();
ACC.segmento = d => { S.seg[d.clave] = d.v; render(); };
ACC['entrar-como'] = d => entrarComo(d.v);
ACC['cerrar-sesion'] = () => cerrarSesion();
ACC.usar = d => {
  if (S.uid) cerrarSesion(null);
  S.relleno = { usuario: d.acceso, password: CONTRASENA_DEMO };
  S.hoja = null; S.pila = [{ n: 'bienvenida', p: {} }]; S.vista = { n: 'entrar', p: {} };
  S.foco = 'form[data-form="entrar"] button[type="submit"]';
  render();
};
ACC['leer-noti'] = (d, el, ev) => {
  ev.stopPropagation();
  const n = db.notis.find(x => x.id === Number(d.id)); if (n) n.leida = true;
  guardar(); render();
};
ACC['ver-clave'] = (d, el) => {
  const input = el.parentElement.querySelector('input');
  const ver = input.type === 'password';
  input.type = ver ? 'text' : 'password';
  el.innerHTML = ic(ver ? 'eye-off' : 'eye', 's');
  el.setAttribute('aria-label', ver ? 'Ocultar la contraseña' : 'Mostrar la contraseña');
};
ACC.elegir = (d, el) => {
  const f = el.closest('form') || el.closest('[data-grupo]');
  const input = f.querySelector(`input[name="${d.campo}"]`);
  input.value = d.valor;
  f.querySelectorAll(`[data-campo="${d.campo}"][data-valor]`).forEach(b => { const on = b.dataset.valor === d.valor; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
  limpiarError(f, d.campo);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
ACC.marcar = (d, el) => {
  const f = el.closest('form');
  const input = f.querySelector(`input[name="${d.campo}"]`);
  const set = new Set(input.value.split(',').filter(Boolean));
  set.has(d.valor) ? set.delete(d.valor) : set.add(d.valor);
  input.value = [...set].join(',');
  el.classList.toggle('on', set.has(d.valor)); el.setAttribute('aria-pressed', set.has(d.valor));
  limpiarError(f, d.campo);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
ACC.casilla = (d, el) => {
  const f = el.closest('form');
  const input = f.querySelector(`input[name="${d.campo}"]`);
  const on = !input.value;
  input.value = on ? '1' : '';
  const i = el.querySelector('i'); i.classList.toggle('on', on); i.innerHTML = on ? ic('check') : '';
  el.setAttribute('aria-pressed', on);
  limpiarError(f, d.campo);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
ACC.copiar = d => {
  const hecho = () => { toast('Copiado.'); render(); };
  try { navigator.clipboard.writeText(d.texto).then(hecho, () => { toast(`Cópialo a mano: ${d.texto}`); render(); }); } catch (e) { toast(`Cópialo a mano: ${d.texto}`); render(); }
};
ACC.adelantar = () => { db.meta.adelanto += 15; guardar(); toast(`Ahora son las ${hm(minAhora())} en la demo.`); render(); };
ACC['guia-confirma'] = () => { S.guiaConfirma = !S.guiaConfirma; render(); };
ACC.reiniciar = () => {
  db = semilla(); guardar();
  const conservar = S.hoja && S.hoja.tipo === 'guia';
  S = estadoInicial(); guardarSesion();
  if (conservar) S.hoja = null;
  toast('Demo reiniciada: has vuelto a los datos del principio.');
  render();
};
ACC['abrir-tablon'] = d => { S.tablon = Number(d.id); S.hoja = null; render(); };
ACC['cerrar-tablon'] = () => { S.tablon = null; render(); };

/* ---------------------------------------------------------------- eventos */
function engancharEventos() {
  const raiz = document.getElementById('demo');
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-a]');
    if (!el || !document.body.contains(el)) return;
    const fn = ACC[el.dataset.a];
    if (!fn) { console.warn('Acción sin definir', el.dataset.a); return; }
    ev.preventDefault();
    fn(el.dataset, el, ev);
  });
  document.addEventListener('submit', ev => {
    const f = ev.target.closest('form[data-form]');
    if (!f) return;
    ev.preventDefault();
    const id = f.dataset.form;
    const vals = leerForm(f, ev.submitter);
    let errores = validar(id, vals);
    if (!Object.keys(errores).length && ENVIOS[id]) errores = ENVIOS[id](vals, f) || {};
    if (Object.keys(errores).length) pintarErrores(f, errores);
  });
  document.addEventListener('input', ev => {
    const t = ev.target;
    const f = t.closest('form[data-form]');
    if (t.name && f) limpiarError(f, t.name);
    if (t.dataset.max) {
      const c = f && f.querySelector(`[data-cuenta="${t.name}"]`);
      if (c) { c.textContent = `${t.value.length} / ${t.dataset.max}`; c.classList.toggle('pasa', t.value.length > Number(t.dataset.max)); }
    }
    if (t.hasAttribute('data-fuerza')) { const m = f.querySelector('.fuerza'); if (m) m.dataset.n = fuerzaClave(t.value); }
    if (t.dataset.borrador && S.borrador) S.borrador[t.dataset.borrador] = t.value;
    if (f && VIVO[f.dataset.form]) VIVO[f.dataset.form](f);
  });
  // Al salir de un campo con algo escrito se comprueba en el momento
  document.addEventListener('focusout', ev => {
    const t = ev.target;
    const f = t.closest && t.closest('form[data-form]');
    if (!f || !t.name || t.type === 'hidden') return;
    const regla = (REGLAS[f.dataset.form] || {})[t.name];
    if (!regla || (!t.value && !f.querySelector(`[data-campo="${t.name}"].mal`))) return;
    const msg = regla(t.value, leerForm(f));
    if (msg) mostrarError(f, t.name, msg);
    else { limpiarError(f, t.name); const c = f.querySelector(`[data-campo="${t.name}"]`); if (c && t.value) c.classList.add('bien'); }
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') { if (S.tablon) { S.tablon = null; render(); } else if (S.hoja) cerrarHoja(); }
  });
  window.addEventListener('resize', ajustarTablones);
  // El reloj de la barra de estado avanza solo
  setInterval(() => {
    document.querySelectorAll('.reloj-txt').forEach(el => { el.textContent = hm(minAhora()); });
  }, 15000);
}
const VIVO = {};   // vista previa en directo de algunos formularios

/* Tablón: se pinta a 1280 × 721 y se escala al ancho disponible */
function ajustarTablones() {
  document.querySelectorAll('.tablon-marco').forEach(m => {
    const e = m.querySelector('.tablon-escala'); if (!e) return;
    const completo = m.closest('.tablon-completo');
    const ancho = m.clientWidth - (completo ? 0 : 16);
    let k = ancho / 1280;
    if (completo) k = Math.min(k, (window.innerHeight - 24) / 721);
    e.style.transform = `scale(${k})`;
    e.style.width = '1280px';
    m.style.height = `${721 * k + (completo ? 0 : 16)}px`;
    if (completo) m.style.width = `${1280 * k}px`;
  });
}
