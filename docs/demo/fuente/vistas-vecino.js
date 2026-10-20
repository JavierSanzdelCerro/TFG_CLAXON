/* =============================================================================
   Claxon · demo · vecino y familiar
   ============================================================================= */
'use strict';

function navVecino(activo) {
  const sinLeer = db.notis.filter(n => n.uid === S.uid && !n.leida).length;
  return navMovil([['v-hoy', 'sun', 'Hoy'], ['v-encargos', 'shopping-basket', 'Encargos'], ['v-avisos', 'bell', 'Avisos', sinLeer || ''], ['v-ajustes', 'settings', 'Ajustes']], activo);
}
function navFamiliar(activo) {
  const sinLeer = db.notis.filter(n => n.uid === S.uid && !n.leida).length;
  return navMovil([['f-inicio', 'house', 'Inicio', sinLeer || ''], ['f-encargos', 'shopping-basket', 'Encargos'], ['f-vincular', 'user-plus', 'Vincular'], ['f-ajustes', 'settings', 'Ajustes']], activo);
}
function saludo() { const m = minAhora(); return m < 13 * 60 + 30 ? 'Buenos días' : m < 20 * 60 ? 'Buenas tardes' : 'Buenas noches'; }
function etiHoy(resto) { const d = deIso(hoy()); return `${cap(DIAS[d.getDay()])} ${d.getDate()}${resto ? ` · ${esc(resto)}` : ''}`; }

/* ---------------------------------------------------------------- bloques reutilizables */
function tarjetaConsulta(mid, enlace = true) {
  return consultasDia(mid, hoy()).map(c => {
    const tipo = TIPO_CONSULTA[c.tipo].toLowerCase();
    const attrs = enlace ? `data-a="consulta-ver"` : '';
    if (c.cambio && c.cancelada) {
      return `<button class="tarjeta oscura" style="gap:8px" ${attrs}><div class="fila" style="justify-content:space-between"><span class="eti" style="color:#C9CDD6">${ic('stethoscope', 'xs')} Consulta de ${tipo}</span>${pill('', 'Cambio')}</div>
        <b style="font:700 21px/1.2 var(--f-display)">Hoy no hay consulta de ${tipo}</b><p style="color:#D9DCE3;font-size:15.5px">${esc(c.motivo || 'Se ha cancelado.')}</p></button>`;
    }
    if (c.cambio) {
      return `<button class="tarjeta oscura" style="gap:8px" ${attrs}><div class="fila" style="justify-content:space-between"><span class="eti" style="color:#C9CDD6">${ic('stethoscope', 'xs')} Consulta de ${tipo}</span><span class="pill" style="background:#fff;color:var(--a-tinta)">Cambio</span></div>
        <b style="font:700 21px/1.2 var(--f-display)">${c.lugar === 'Consultorio local' ? `Hoy la consulta cambia de hora` : `Hoy no hay consulta en el pueblo`}</b>
        <p style="color:#D9DCE3;font-size:15.5px">${c.lugar === 'Consultorio local' ? `Será de ${hmCorto(aMin(c.inicio))} a ${hmCorto(aMin(c.fin))} en el consultorio.` : `Se pasa en ${esc(c.lugar)}, de ${hmCorto(aMin(c.inicio))} a ${hmCorto(aMin(c.fin))}.`}</p></button>`;
    }
    return `<button class="tarjeta crema" style="padding:12px 14px" ${attrs}><div class="fila">${ic('stethoscope', 's')}<p class="peq" style="flex:1">Hoy hay consulta de <b>${tipo}</b> de ${hmCorto(aMin(c.inicio))} a ${hmCorto(aMin(c.fin))} · ${esc(c.lugar)}</p></div></button>`;
  }).join('');
}

function textoProgreso(p) {
  const v = usuario(p.vendedor_id);
  const anterior = rutaHoy(v.id).filter(x => x.orden < p.orden && x.estado === 'HECHA').at(-1);
  const desde = anterior ? (anterior.salida ?? anterior.llegada) : v.salida_real;
  const falta = p.estimada - minAhora();
  const pct = desde == null ? 10 : Math.max(6, Math.min(96, Math.round(100 * (minAhora() - desde) / Math.max(1, p.estimada - desde))));
  const salio = anterior ? `Salió de ${municipio(anterior.municipio_id).nombre} a las ${hm(desde)}` : (desde != null ? `Salió a las ${hm(desde)}` : 'Ha salido');
  return { pct, texto: `${salio} · ${falta > 0 ? `llega en ${falta} min` : 'llegará en cualquier momento'}` };
}

function filaServicio(p, vecinoId) {
  const v = usuario(p.vendedor_id);
  const c = CATEGORIA[v.categoria];
  const [cl, txt] = ESTADO_PARADA[p.estado];
  let detalle = `<b class="num" style="color:var(--a-tinta);font-size:17px">${hm(p.estimada)}</b> · ${esc(p.punto)} · ${esc(v.nombre_comercial)}`;
  let extra = '';
  if (p.estado === 'EN_CAMINO') { const pr = textoProgreso(p); extra = `<div class="progreso"><div class="barra"><i style="width:${pr.pct}%"></i></div><span class="t2" style="font-size:13px">${pr.texto}</span></div>`; }
  if (p.estado === 'EN_PARADA') detalle = `<b style="color:var(--a-ok)">Está en ${esc(p.punto)} desde las ${hm(p.llegada)}</b> · ${esc(v.nombre_comercial)}`;
  if (p.estado === 'HECHA') detalle = `Pasó a las ${hm(p.llegada)} · ${esc(v.nombre_comercial)}`;
  if (p.estado === 'CANCELADA') detalle = `${esc(v.nombre_comercial)} no puede venir hoy${v.motivo_cancelacion ? `: ${esc(v.motivo_cancelacion)}` : ''}`;
  return `<button class="fila" style="align-items:flex-start" data-a="ir-servicio" data-id="${p.id}" data-vecino="${vecinoId}">
      <span class="circulo ${c.circulo}">${ic(c.icono)}</span>
      <div class="flex" style="display:grid;gap:6px">
        <div class="fila" style="justify-content:space-between"><span class="t1">${c.nombre}</span>${pill(cl, txt, ['EN_CAMINO', 'EN_PARADA'].includes(p.estado))}</div>
        <div class="t2">${detalle}</div>${extra}
      </div></button>`;
}

function tarjetaEncargoCorta(e, mostrarVecino = false) {
  const v = vendedorDeEncargo(e); const p = parada(e.parada_id);
  const [cl, txt] = ESTADO_ENCARGO[e.estado];
  const quien = mostrarVecino ? `${esc(usuario(e.vecino_id).nombre)} · ` : '';
  return `<button class="tarjeta ${e.fecha === hoy() && e.estado === 'PREPARADO' ? 'suave' : ''}" style="gap:6px" data-a="ir" data-v="v-encargo" data-id="${e.id}">
      <div class="fila" style="justify-content:space-between"><span class="eti acento">${quien}${diaCorto(e.fecha)} · ${esc(v.nombre_comercial)}</span>${pill(cl, txt)}</div>
      <p style="font-size:16px">${esc(resumenLineas(e))}</p>
      <p class="peq texto-t">${e.a_domicilio ? 'A domicilio' : esc(p.punto)} · hacia las ${hm(hora(p, e.fecha))}${importe(e) ? ` · <b class="num" style="color:var(--a-tinta)">${euros(importe(e))}</b>` : ''}</p>
    </button>`;
}

function bloqueHoy(vec, propio) {
  const mid = vec.municipio_id;
  const hoyPasan = db.paradas.filter(p => p.municipio_id === mid && p.fecha === hoy()).sort((a, b) => a.estimada - b.estimada);
  const otros = vendedores().filter(v => !hoyPasan.some(p => p.vendedor_id === v.id))
    .map(v => db.paradas.find(p => p.vendedor_id === v.id && p.municipio_id === mid)).filter(Boolean);
  const encargos = db.encargos.filter(e => e.vecino_id === vec.id && e.fecha >= hoy() && ENCARGO_ACTIVO.includes(e.estado)).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const importantes = avisosPara(mid).filter(a => a.prioridad !== 'NORMAL' && a.categoria !== 'SANIDAD');
  return `${tarjetaConsulta(mid, propio)}
    ${importantes.map(a => `<button class="tarjeta" style="gap:6px;border-color:${a.prioridad === 'URGENTE' ? 'var(--a-error)' : 'var(--a-aviso)'}" data-a="ir" data-v="v-aviso" data-id="${a.id}">
        <div class="fila" style="justify-content:space-between"><span class="eti">${ic(CAT_AVISO[a.categoria].icono, 'xs')} Ayuntamiento</span>${pill(a.prioridad === 'URGENTE' ? 'error' : 'pend', cap(a.prioridad.toLowerCase()))}</div>
        <b style="font:700 19px/1.2 var(--f-display)">${esc(a.titulo)}</b></button>`).join('')}
    <span class="eti">Hoy pasan</span>
    ${hoyPasan.length ? `<div class="tarjeta sin-pad lista">${hoyPasan.map(p => filaServicio(p, vec.id)).join('')}</div>` : `<div class="tarjeta">${vacio('calendar', `Hoy no pasa ningún servicio por ${esc(municipio(mid).nombre)}`)}</div>`}
    ${encargos.map(e => tarjetaEncargoCorta(e)).join('')}
    ${otros.length ? `<span class="eti">Otros días</span><div class="tarjeta sin-pad lista">${otros.map(p => {
      const v = usuario(p.vendedor_id); const c = CATEGORIA[v.categoria]; const prox = proximoReparto(v, sumaDias(hoy(), 1));
      return `<button class="fila" data-a="ir-servicio" data-id="${p.id}" data-vecino="${vec.id}"><span class="circulo ${c.circulo}">${ic(c.icono)}</span><div class="flex"><div class="t1">${esc(v.nombre_comercial)}</div><div class="t2">Pasa los ${textoDias(v.dias_reparto)} · próximo: ${diaCorto(prox).toLowerCase()}</div></div>${ic('chevron-right', 's')}</button>`;
    }).join('')}</div>` : ''}`;
}

/* ---------------------------------------------------------------- VECINO · Hoy */
VISTAS['v-hoy'] = () => {
  const u = yo();
  return `${cabHola(etiHoy(municipio(u.municipio_id).nombre), `${saludo()}, ${esc(u.nombre)}`, u)}
    ${cuerpo(`${bloqueHoy(u, true)}<button class="boton" data-a="nuevo-encargo" style="margin-top:auto">${ic('shopping-basket', 's')} Hacer un encargo</button>`, 'gap:12px')}
    ${navVecino('v-hoy')}`;
};

/* Detalle de un servicio (sirve para el vecino y para el familiar que mira a su vecino) */
VISTAS['v-servicio'] = ({ id, vecino }) => {
  const p = parada(id); const v = usuario(p.vendedor_id); const c = CATEGORIA[v.categoria];
  const vec = usuario(vecino); const propio = vecino === S.uid;
  const hoyRuta = p.fecha === hoy();
  const [cl, txt] = hoyRuta ? ESTADO_PARADA[p.estado] : ['', 'Hoy no pasa'];
  let principal;
  if (!hoyRuta) {
    const prox = proximoReparto(v, sumaDias(hoy(), 1));
    principal = `<span class="eti">${esc(v.nombre_comercial)} pasa por ${esc(p.punto)}</span>
      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><b style="font:700 40px/1 var(--f-display)">${diaCorto(prox)}</b><span class="texto-t" style="font-size:18px">hacia las ${hm(hora(p, prox))}</span></div>
      <p class="peq texto-t">Reparte los ${textoDias(v.dias_reparto)}.</p>`;
  } else if (p.estado === 'EN_PARADA') {
    principal = `<span class="eti">${esc(v.nombre_comercial)} está en ${esc(p.punto)}</span><div style="display:flex;align-items:baseline;gap:12px"><b style="font:700 56px/1 var(--f-display);color:var(--a-ok)" class="num">${hm(p.llegada)}</b><span class="texto-t" style="font-size:18px">llegó a esta hora</span></div>`;
  } else if (p.estado === 'HECHA') {
    principal = `<span class="eti">${esc(v.nombre_comercial)} ya ha pasado hoy</span><div style="display:flex;align-items:baseline;gap:12px"><b style="font:700 56px/1 var(--f-display)" class="num">${hm(p.llegada)}</b><span class="texto-t" style="font-size:18px">llegó</span></div>`;
  } else if (p.estado === 'CANCELADA') {
    principal = `<span class="eti">Hoy no viene</span><b style="font:700 26px/1.2 var(--f-display)">${esc(v.nombre_comercial)} no puede hacer la ruta hoy</b>${v.motivo_cancelacion ? `<p class="texto-t">«${esc(v.motivo_cancelacion)}»</p>` : ''}`;
  } else {
    const falta = p.estimada - minAhora();
    principal = `<span class="eti">${esc(v.nombre_comercial)} llega a ${esc(p.punto)} hacia las</span>
      <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap"><b style="font:700 60px/1 var(--f-display)" class="num">${hm(p.estimada)}</b><span class="texto-t" style="font-size:18px">${falta > 0 ? `dentro de ${falta} min` : 'en cualquier momento'}</span></div>
      <p class="peq texto-t">${p.estado === 'PREVISTA' ? `Todavía no ha salido. Sale a las ${v.hora_salida}.` : 'Estimada según la salida del vendedor. No es GPS.'}</p>`;
  }
  const ruta = hoyRuta ? rutaHoy(v.id) : paradasDe(v.id);
  const linea = ruta.map(x => {
    const mio = x.id === p.id;
    const clase = !hoyRuta ? 'pendiente' : x.estado === 'HECHA' ? 'hecho' : x.estado === 'EN_PARADA' ? 'hecho actual' : mio ? 'actual' : 'pendiente';
    const h = !hoyRuta ? hm(hora(x, 'otro')) : x.llegada != null ? `${hm(x.llegada)}<small>llegó</small>` : hm(x.estimada);
    return `<li><span class="h" ${mio ? 'style="color:var(--a-acento)"' : ''}>${h}</span><span class="eje ${clase}"><i></i></span><span class="d"><b>${esc(municipio(x.municipio_id).nombre)}${mio ? (propio ? ' · tu parada' : ` · parada de ${esc(vec.nombre)}`) : ''}</b><span>${esc(x.punto)}${x.estado === 'CANCELADA' ? ' · cancelada' : ''}</span></span></li>`;
  }).join('');
  const sus = db.suscripciones.find(s => s.vecino_id === vecino && s.vendedor_id === v.id);
  const puedeEncargar = v.acepta_encargos && (propio || puedeEncargarPor(vecino));
  return `${cab(c.nombre, { extra: pill(cl, txt, ['EN_CAMINO', 'EN_PARADA'].includes(p.estado) && hoyRuta) })}
    ${cuerpo(`<div class="tarjeta" style="gap:6px">${principal}</div>
      <ol class="tiempo">${linea}</ol>
      <div class="tarjeta sin-pad lista">
        ${propio ? `<div class="fila"><span class="circulo gris">${ic('bell')}</span><div class="flex"><div class="t1">Avisarme antes</div><div class="t2">${sus && sus.activa ? `${sus.minutos} minutos antes de llegar` : 'No recibes avisos de este servicio'}</div></div>${interruptor(sus && sus.activa, 'suscribir', `data-id="${v.id}"`, 'Avisarme antes')}</div>` : ''}
        <div class="fila"><span class="circulo gris">${ic('calendar')}</span><div class="flex"><div class="t1">Pasa los ${textoDias(v.dias_reparto)}</div><div class="t2">${v.acepta_encargos ? `Encargos hasta ${v.horas_antelacion_encargo} h antes` : 'No acepta encargos'}</div></div></div>
      </div>`, 'gap:12px')}
    ${pie(`<div style="display:grid;grid-template-columns:auto 1fr;gap:10px"><button class="boton sec" style="width:58px;padding:0" data-a="llamar" data-id="${v.id}" aria-label="Llamar">${ic('phone')}</button>
      ${puedeEncargar ? `<button class="boton" data-a="nuevo-encargo" data-vendedor="${v.id}" data-vecino="${vecino}">${ic('shopping-basket', 's')} Encargar${propio ? '' : ` para ${esc(vec.nombre)}`}</button>` : `<button class="boton" disabled>${v.acepta_encargos ? 'No tienes permiso para encargar' : 'No acepta encargos'}</button>`}</div>`)}`;
};
ACC['ir-servicio'] = d => ir('v-servicio', { id: Number(d.id), vecino: Number(d.vecino) });
ACC.suscribir = d => {
  const vid = Number(d.id);
  let s = db.suscripciones.find(x => x.vecino_id === S.uid && x.vendedor_id === vid);
  if (!s) { s = { vecino_id: S.uid, vendedor_id: vid, minutos: 15, activa: false }; db.suscripciones.push(s); }
  s.activa = !s.activa; guardar();
  toast(s.activa ? `Te avisaremos ${s.minutos} minutos antes.` : 'Ya no recibirás avisos de este servicio.');
  render();
};
ACC.llamar = d => { const v = usuario(Number(d.id)); toast(`Teléfono de ${v.nombre_comercial}: ${telTxt(v.telefono)}`); render(); };
ACC['consulta-ver'] = () => { if (S.rol === 'VECINO') { S.seg.avisos = 'consulta'; pestana('v-avisos'); } };

/* ---------------------------------------------------------------- ENCARGO (vecino y familiar) */
function puedeEncargarPor(vecinoId) { return db.familiares.some(f => f.familiar_id === S.uid && f.vecino_id === vecinoId && f.estado === 'ACEPTADO' && f.puede_hacer_encargos); }
function paradaEn(vendedorId, mid) { return db.paradas.find(p => p.vendedor_id === vendedorId && p.municipio_id === mid); }

ACC['nuevo-encargo'] = d => {
  const vecinoId = d.vecino ? Number(d.vecino) : S.uid;
  if (vecinoId !== S.uid && !puedeEncargarPor(vecinoId)) { toast('No tienes permiso para hacer encargos por esta persona.', true); render(); return; }
  S.borrador = { vecino_id: vecinoId, vendedor_id: null, parada_id: null, fecha: '', cant: {}, extra: '', lugar: 'plaza', notas: '', creado_por: S.uid };
  if (d.vendedor) { elegirVendedor(Number(d.vendedor)); return; }
  ir('enc-vendedor');
};
function elegirVendedor(vid) {
  const b = S.borrador; const vec = usuario(b.vecino_id);
  const p = paradaEn(vid, vec.municipio_id);
  b.vendedor_id = vid; b.parada_id = p.id; b.cant = {}; b.extra = '';
  b.fecha = fechasEncargo(p)[0] || '';
  ir('enc-catalogo');
}
ACC['enc-vendedor'] = d => elegirVendedor(Number(d.id));

VISTAS['enc-vendedor'] = () => {
  const b = S.borrador; const vec = usuario(b.vecino_id);
  const lista = vendedores().filter(v => paradaEn(v.id, vec.municipio_id));
  return `${cab('¿A quién encargas?')}
    ${cuerpo(`${b.vecino_id !== S.uid ? `<div class="tarjeta crema" style="padding:12px 14px"><div class="fila peq">${ic('hand-heart', 's')}<span>Encargo para <b>${esc(nombreCompleto(vec))}</b> · ${esc(municipio(vec.municipio_id).nombre)}</span></div></div>` : ''}
      <div class="tarjeta sin-pad lista">${lista.map(v => {
        const c = CATEGORIA[v.categoria]; const p = paradaEn(v.id, vec.municipio_id); const fechas = fechasEncargo(p, 1);
        const ok = v.acepta_encargos && fechas.length;
        return `<button class="fila" ${ok ? `data-a="enc-vendedor" data-id="${v.id}"` : 'disabled style="opacity:.55"'}><span class="circulo ${c.circulo}">${ic(c.icono)}</span>
          <div class="flex"><div class="t1">${esc(v.nombre_comercial)}</div><div class="t2">${!v.acepta_encargos ? 'Ahora no acepta encargos' : fechas.length ? `Lo antes posible: ${diaCorto(fechas[0]).toLowerCase()}` : 'No hay días disponibles'}</div></div>${ok ? ic('chevron-right', 's') : ''}</button>`;
      }).join('')}</div>
      <p class="peq texto-t">Solo aparecen los vendedores que pasan por ${esc(municipio(vec.municipio_id).nombre)}.</p>`)}`;
};

function pasoCantidad(p) { return p.unidad === 'KG' ? 0.5 : 1; }
function maxCantidad(p) { return p.unidad === 'KG' ? 10 : 20; }
VISTAS['enc-catalogo'] = () => {
  const b = S.borrador; const v = usuario(b.vendedor_id); const p = parada(b.parada_id); const vec = usuario(b.vecino_id);
  const fechas = fechasEncargo(p);
  if (!fechas.includes(b.fecha)) b.fecha = fechas[0] || '';
  const prods = db.productos.filter(x => x.vendedor_id === v.id);
  const total = prods.reduce((t, x) => t + (b.cant[x.id] || 0) * x.precio, 0);
  const n = Object.values(b.cant).filter(Boolean).length + (b.extra.trim() ? 1 : 0);
  return `${cab(`Encargo a ${esc(v.nombre_comercial)}`)}
    <form data-form="enc-catalogo" novalidate style="display:contents">
    ${cuerpo(`${b.vecino_id !== S.uid ? `<div class="tarjeta crema" style="padding:12px 14px"><div class="fila peq">${ic('hand-heart', 's')}<span>Para <b>${esc(nombreCompleto(vec))}</b></span></div></div>` : ''}
      ${fechas.length ? grupoCampo('fecha', '¿Qué día?', chipsElegir('fecha', fechas.map(f => [f, `${diaCorto(f)} · ${hm(hora(p, f))}`]), b.fecha, false, 'data-borrador="fecha"'),
        `Recoges en ${esc(p.punto)} de ${esc(municipio(p.municipio_id).nombre)}. ${v.horas_antelacion_encargo ? `${esc(v.nombre_comercial)} pide ${v.horas_antelacion_encargo} h de antelación.` : ''}`)
        : `<div class="aviso-form">${ic('circle-alert', 's')}<span>Ahora no se puede encargar: ${esc(v.nombre_comercial)} pide ${v.horas_antelacion_encargo} h de antelación y no hay ningún reparto a tiempo.</span></div>`}
      ${grupoCampo('productos', 'Productos', `<div class="tarjeta sin-pad">${prods.map(x => {
        const c = b.cant[x.id] || 0;
        return `<div class="producto" ${x.disponible ? '' : 'style="opacity:.5"'}><div class="flex"><div class="t1">${esc(x.nombre)}</div><div class="t2 num">${x.disponible ? `${euros(x.precio)} ${x.unidad === 'UNIDAD' ? 'la unidad' : `el ${UNIDAD[x.unidad][0]}`}` : 'Agotado'}</div></div>
          ${x.disponible ? `<div class="contador ${c ? 'activo' : ''}"><button type="button" data-a="cant" data-id="${x.id}" data-d="-1" ${c ? '' : 'disabled'} aria-label="Quitar ${esc(x.nombre)}">${ic('minus', 's')}</button><b>${String(c).replace('.', ',')}</b><button type="button" data-a="cant" data-id="${x.id}" data-d="1" aria-label="Añadir ${esc(x.nombre)}">${ic('plus', 's')}</button></div>` : ''}</div>`;
      }).join('')}</div>`)}
      ${campo({ n: 'extra', l: '¿Algo que no está en la lista?', v: b.extra, ph: 'Por ejemplo: barra de centeno', icono: 'pencil', max: 60, extra: 'data-borrador="extra"' })}`, 'gap:14px')}
    ${pie(`<div class="fila" style="justify-content:space-between"><span class="texto-t">${plural(n, 'producto')}</span><b class="num" style="font-size:20px">${euros(total)}</b></div>
      <button class="boton" type="submit" ${fechas.length ? '' : 'disabled'}>Revisar encargo ${ic('arrow-right', 's')}</button>`)}
    </form>`;
};
ACC.cant = d => {
  const x = producto(Number(d.id)); const b = S.borrador;
  const actual = b.cant[x.id] || 0;
  const nuevo = Math.round((actual + Number(d.d) * pasoCantidad(x)) * 10) / 10;
  if (nuevo > maxCantidad(x)) { toast(`Máximo ${maxCantidad(x)} ${x.unidad === 'KG' ? 'kg' : ''} de ${x.nombre}. Si necesitas más, escríbelo en la nota.`.replace('  ', ' '), true); render(); return; }
  b.cant[x.id] = Math.max(0, nuevo);
  if (!b.cant[x.id]) delete b.cant[x.id];
  render();
};
REGLAS['enc-catalogo'] = {
  fecha: v => v ? undefined : 'Elige qué día lo quieres.',
  extra: v => V.texto(v, { max: 60, opcional: true }),
};
ENVIOS['enc-catalogo'] = vals => {
  const b = S.borrador; b.fecha = vals.fecha; b.extra = vals.extra;
  if (!Object.keys(b.cant).length && !b.extra.trim()) return { productos: 'Añade al menos un producto con el botón + o escribe lo que necesitas.' };
  const repetido = db.encargos.find(e => e.vecino_id === b.vecino_id && e.parada_id === b.parada_id && e.fecha === b.fecha && ENCARGO_ACTIVO.includes(e.estado));
  if (repetido) return { fecha: `Ya hay un encargo a ${usuario(b.vendedor_id).nombre_comercial} para ese día. Cancélalo en Encargos o elige otro día.` };
  ir('enc-revisar');
};

function lineasBorrador(b) {
  const lineas = Object.entries(b.cant).map(([id, c]) => { const x = producto(Number(id)); return { producto_id: x.id, desc: x.nombre, cantidad: c, unidad: x.unidad, precio: x.precio }; });
  if (b.extra.trim()) lineas.push({ producto_id: null, desc: b.extra.trim(), cantidad: 1, unidad: 'UNIDAD', precio: null });
  return lineas;
}
VISTAS['enc-revisar'] = () => {
  const b = S.borrador; const v = usuario(b.vendedor_id); const p = parada(b.parada_id); const vec = usuario(b.vecino_id);
  const lineas = lineasBorrador(b);
  const total = importe({ lineas });
  return `${cab('Revisa el encargo')}
    <form data-form="enc-revisar" novalidate style="display:contents">
    ${cuerpo(`<div class="tarjeta" style="gap:10px">
        <div class="fila"><span class="circulo ${CATEGORIA[v.categoria].circulo}">${ic(CATEGORIA[v.categoria].icono)}</span><div class="flex"><div class="t1">${esc(v.nombre_comercial)}</div><div class="t2">${etiquetaDia(b.fecha)} · hacia las ${hm(hora(p, b.fecha))}</div></div></div>
        <div class="separa"></div>
        <div class="lineas">${lineas.map(l => `<div class="fila"><span>${esc(l.desc)} ${cantidadTxt(l.cantidad, l.unidad)}</span><span class="num">${l.precio == null ? 'precio al recoger' : euros(l.precio * l.cantidad)}</span></div>`).join('')}</div>
        <div class="separa"></div>
        <div class="fila" style="justify-content:space-between"><b>Total aproximado</b><b class="num" style="font-size:20px">${euros(total)}</b></div>
      </div>
      ${grupoCampo('lugar', '¿Dónde lo recoge' + (b.vecino_id === S.uid ? 's?' : ` ${esc(vec.nombre)}?`), radiosElegir('lugar', [
        ['plaza', `En ${esc(p.punto)}`, `Cuando pase ${esc(v.nombre_comercial)}`],
        ['casa', 'Que lo lleven a casa', vec.direccion ? `${esc(vec.direccion)} · si el vendedor puede` : 'Hace falta una dirección'],
      ], b.lugar))}
      ${campo({ n: 'notas', l: `Nota para ${esc(v.nombre_comercial)} (opcional)`, tipo: 'textarea', v: b.notas, ph: 'Por ejemplo: la barra poco hecha', max: 200, extra: 'data-borrador="notas"' })}
      <div class="fila texto-t peq" style="align-items:flex-start">${ic('wallet', 's')}<span>Se paga en mano al recogerlo. ${esc(v.nombre_comercial)} tiene que aceptar el encargo y te avisaremos.</span></div>`, 'gap:14px')}
    ${pie(`<button class="boton" type="submit">${ic('send', 's')} Enviar encargo</button>`)}
    </form>`;
};
REGLAS['enc-revisar'] = {
  lugar: v => v === 'casa' && !usuario(S.borrador.vecino_id).direccion ? 'Para que lo lleven a casa hace falta una dirección. Añádela en Ajustes › Mis datos.' : undefined,
  notas: v => V.texto(v, { max: 200, opcional: true }),
};
ENVIOS['enc-revisar'] = vals => {
  const b = S.borrador; const v = usuario(b.vendedor_id); const vec = usuario(b.vecino_id);
  const e = { id: siguienteId('encargo'), vecino_id: b.vecino_id, parada_id: b.parada_id, fecha: b.fecha, estado: 'PENDIENTE', creado_por: S.uid,
    a_domicilio: vals.lugar === 'casa', notas: vals.notas.trim() || null, motivo: null, creado: ahoraMs(), aceptado: null, preparado: null, entregado: null, lineas: lineasBorrador(b) };
  db.encargos.push(e);
  notificar([v.id], 'shopping-basket', `Nuevo encargo de ${nombreCompleto(vec)}`, `${diaCorto(e.fecha)} · ${municipio(vec.municipio_id).nombre}: ${resumenLineas(e)}`);
  guardar();
  S.borrador = { enviado: e.id };
  S.pila = []; S.vista = { n: 'enc-enviado', p: { id: e.id } }; render();
};
VISTAS['enc-enviado'] = ({ id }) => {
  const e = encargo(id); const v = vendedorDeEncargo(e); const p = parada(e.parada_id); const vec = usuario(e.vecino_id);
  const fams = familiaresDe(vec.id).filter(f => f.familiar_id !== S.uid && f.recibe_avisos).map(f => usuario(f.familiar_id).nombre);
  const listaVista = S.rol === 'FAMILIAR' ? 'f-encargos' : 'v-encargos';
  return `${cuerpo(`<div class="exito"><span class="circulo ok" style="width:96px;height:96px">${ic('check', 'xl')}</span><h1 class="titulo-g">Encargo enviado</h1>
        <p class="texto-t" style="font-size:18px">${esc(v.nombre_comercial)} tiene que aceptarlo. ${S.uid === vec.id ? 'Te avisaremos' : `Os avisaremos a ti y a ${esc(vec.nombre)}`} en cuanto lo haga.</p></div>
      <div class="tarjeta" style="gap:8px"><div class="fila" style="justify-content:space-between"><span class="eti">${etiquetaDia(e.fecha)}</span>${pill('pend', 'Sin aceptar')}</div>
        <p style="font-size:17px"><b>${e.a_domicilio ? 'A domicilio' : esc(p.punto)} · hacia las ${hm(hora(p, e.fecha))}</b></p><p class="texto-t peq">${esc(resumenLineas(e))}</p></div>
      ${fams.length ? `<div class="tarjeta crema" style="padding:12px 14px"><div class="fila peq">${ic('users', 's')}<span>${esc(fams.join(' y '))} también ${fams.length > 1 ? 'verán' : 'verá'} este encargo.</span></div></div>` : ''}`, 'justify-content:center;gap:20px;padding:20px 26px')}
    ${pie(`<button class="boton" data-a="pestana" data-v="${listaVista}">Ver los encargos</button><button class="boton sec" data-a="pestana" data-v="${INICIO[S.rol]}">Volver al inicio</button>`, 'border:0')}`;
};

/* ---------------------------------------------------------------- VECINO · Encargos */
function listaEncargos(vecinoIds, mostrarVecino) {
  const modo = seg('encargos', 'prox');
  const todos = db.encargos.filter(e => vecinoIds.includes(e.vecino_id));
  const prox = todos.filter(e => e.fecha >= hoy() && ENCARGO_ACTIVO.includes(e.estado)).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
  const ant = todos.filter(e => !prox.includes(e)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  const lista = modo === 'prox' ? prox : ant;
  return `${segmentos('encargos', [['prox', `Próximos · ${prox.length}`], ['ant', `Anteriores · ${ant.length}`]], 'prox')}
    ${lista.length ? lista.map(e => tarjetaEncargoCorta(e, mostrarVecino)).join('') : vacio('shopping-basket', modo === 'prox' ? 'No hay encargos pendientes' : 'Todavía no hay encargos anteriores')}`;
}
VISTAS['v-encargos'] = () => `${cab('Mis encargos', { volver: false })}
  ${cuerpo(listaEncargos([S.uid], false), 'gap:12px')}
  ${pie(`<button class="boton" data-a="nuevo-encargo">${ic('plus', 's')} Hacer un encargo</button>`)}
  ${navVecino('v-encargos')}`;

VISTAS['v-encargo'] = ({ id }) => {
  const e = encargo(id); const v = vendedorDeEncargo(e); const p = parada(e.parada_id); const vec = usuario(e.vecino_id);
  const [cl, txt] = ESTADO_ENCARGO[e.estado];
  const pasos = [['Enviado', e.creado], ['Aceptado', e.aceptado], ['Preparado', e.preparado], ['Entregado', e.entregado]];
  if (e.estado === 'RECHAZADO') pasos.splice(1, 3, ['Rechazado', e.creado]);
  if (e.estado === 'CANCELADO') pasos.splice(1, 3, ['Cancelado', e.cancelado || e.creado]);
  if (e.estado === 'NO_RECOGIDO') pasos.splice(3, 1, ['No se recogió', null]);
  const hecho = i => pasos[i][1] != null || (i === pasos.length - 1 && ['RECHAZADO', 'CANCELADO', 'NO_RECOGIDO'].includes(e.estado));
  const ultimo = pasos.map((x, i) => hecho(i)).lastIndexOf(true);
  const creador = usuario(e.creado_por);
  const parentesco = db.familiares.find(f => f.familiar_id === e.creado_por && f.vecino_id === e.vecino_id);
  const puedeCancelar = ['PENDIENTE', 'ACEPTADO'].includes(e.estado) && e.fecha >= hoy() && (S.uid === e.vecino_id || puedeEncargarPor(e.vecino_id));
  return `${cab('Encargo', { extra: pill(cl, txt) })}
    ${cuerpo(`<div class="tarjeta" style="gap:10px">
        <div class="fila"><span class="circulo ${CATEGORIA[v.categoria].circulo}">${ic(CATEGORIA[v.categoria].icono)}</span><div class="flex"><div class="t1">${esc(v.nombre_comercial)}</div><div class="t2">${etiquetaDia(e.fecha)} · hacia las ${hm(hora(p, e.fecha))}</div></div></div>
        <p class="peq texto-t">${e.a_domicilio ? `A domicilio: ${esc(vec.direccion || '')}` : `Recogida en ${esc(p.punto)}, ${esc(municipio(p.municipio_id).nombre)}`}</p>
      </div>
      ${e.estado === 'RECHAZADO' ? `<div class="aviso-form">${ic('circle-alert', 's')}<span>${esc(v.nombre_comercial)} no puede servirlo: «${esc(e.motivo)}»</span></div>` : ''}
      <ol class="tiempo">${pasos.map(([t, ts], i) => `<li><span class="h">${ts ? hm(new Date(ts).getHours() * 60 + new Date(ts).getMinutes()) : '—'}</span><span class="eje ${hecho(i) ? 'hecho' : 'pendiente'} ${i === ultimo ? 'actual' : ''}"><i></i></span><span class="d"><b>${t}</b><span>${ts ? diaCorto(isoDia(new Date(ts))) : ''}</span></span></li>`).join('')}</ol>
      <div class="tarjeta" style="gap:8px"><span class="eti">Productos</span><div class="lineas">${e.lineas.map(l => `<div class="fila"><span>${esc(l.desc)} ${cantidadTxt(l.cantidad, l.unidad)}</span><span class="num">${l.precio == null ? '—' : euros(l.precio * l.cantidad)}</span></div>`).join('')}</div>
        <div class="separa"></div><div class="fila" style="justify-content:space-between"><b>Total aproximado</b><b class="num">${euros(importe(e))}</b></div>
        ${e.notas ? `<p class="peq texto-t">Nota: «${esc(e.notas)}»</p>` : ''}</div>
      ${e.creado_por !== e.vecino_id ? `<div class="tarjeta crema" style="padding:12px 14px"><div class="fila peq">${ic('hand-heart', 's')}<span>Lo encargó ${esc(creador.nombre)}${parentesco ? ` (${esc(parentesco.parentesco.toLowerCase())})` : ''} para ${S.uid === vec.id ? 'ti' : esc(vec.nombre)}.</span></div></div>` : ''}`, 'gap:12px')}
    ${puedeCancelar ? pie(`<button class="boton sec peligro" data-a="hoja-confirmar" data-tipo="cancelar-encargo" data-id="${e.id}">Cancelar el encargo</button>`) : ''}`;
};
ACC['hoja-confirmar'] = d => {
  const textos = {
    'cancelar-encargo': { titulo: '¿Cancelar este encargo?', texto: 'Avisaremos al vendedor para que no lo prepare.', boton: 'Sí, cancelar', accion: 'cancelar-encargo', peligro: true },
    'fam-quitar': { titulo: '¿Quitar a este familiar?', texto: 'Dejará de ver tus avisos y no podrá hacer encargos por ti.', boton: 'Sí, quitar', accion: 'fam-quitar', peligro: true },
    'prod-borrar': { titulo: '¿Borrar este producto?', texto: 'Desaparecerá del catálogo. Los encargos que ya lo tienen no cambian.', boton: 'Sí, borrar', accion: 'prod-borrar', peligro: true },
    'usuario-baja': { titulo: '¿Dar de baja esta cuenta?', texto: 'No podrá entrar en Claxon. Sus encargos se conservan.', boton: 'Dar de baja', accion: 'usuario-baja', peligro: true },
    'aviso-archivar': { titulo: '¿Archivar este aviso?', texto: 'Dejará de verse en la app y en el tablón.', boton: 'Archivar', accion: 'aviso-archivar', peligro: false },
  };
  abrirHoja('confirmar', { ...textos[d.tipo], id: d.id, v: d.v });
};
ACC['cancelar-encargo'] = d => {
  const e = encargo(Number(d.id)); e.estado = 'CANCELADO'; e.cancelado = ahoraMs();
  const v = vendedorDeEncargo(e);
  notificar([v.id], 'x', `${nombreCompleto(usuario(e.vecino_id))} ha cancelado un encargo`, `${diaCorto(e.fecha)}: ${resumenLineas(e)}`);
  guardar(); S.hoja = null; toast('Encargo cancelado. Hemos avisado al vendedor.'); render();
};

/* ---------------------------------------------------------------- VECINO · Avisos */
function listaNotis() {
  const mias = db.notis.filter(n => n.uid === S.uid).sort((a, b) => b.ts - a.ts);
  if (!mias.length) return vacio('bell', 'No tienes notificaciones');
  return `${mias.some(n => !n.leida) ? `<button class="enlace peq" style="justify-self:end" data-a="notis-leidas">Marcar todas como leídas</button>` : ''}
    <div class="tarjeta sin-pad lista">${mias.map(n => `<div class="fila" style="align-items:flex-start;${n.leida ? '' : 'background:var(--a-suave)'}"><span class="circulo gris">${ic(n.icono || 'bell')}</span>
      <div class="flex"><div class="t1" style="font-size:16.5px">${esc(n.titulo)}</div><div class="t2">${esc(n.texto)}</div><div class="t2" style="font-size:12.5px;margin-top:3px">${haceTxt(n.ts)}</div></div></div>`).join('')}</div>`;
}
ACC['notis-leidas'] = () => { db.notis.filter(n => n.uid === S.uid).forEach(n => { n.leida = true; }); guardar(); render(); };
function horarioConsulta(mid) {
  const habitual = db.consultas.filter(c => c.municipio_id === mid && c.dia_semana).sort((a, b) => a.dia_semana - b.dia_semana || a.inicio.localeCompare(b.inicio));
  const cambios = db.consultas.filter(c => c.municipio_id === mid && c.fecha && c.fecha >= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const nombreDia = n => cap(DIAS[n % 7]);
  return `${cambios.length ? `<span class="eti">Cambios</span>${cambios.map(c => `<div class="tarjeta oscura" style="gap:4px"><span class="eti" style="color:#C9CDD6">${etiquetaDia(c.fecha)} · ${TIPO_CONSULTA[c.tipo]}</span>
      <b style="font:700 19px/1.2 var(--f-display)">${c.cancelada ? 'No hay consulta' : `${esc(c.lugar)}, de ${hmCorto(aMin(c.inicio))} a ${hmCorto(aMin(c.fin))}`}</b>${c.motivo ? `<p style="color:#D9DCE3;font-size:15px">${esc(c.motivo)}</p>` : ''}</div>`).join('')}` : ''}
    <span class="eti">Horario habitual · ${esc(municipio(mid).nombre)}</span>
    ${habitual.length ? `<div class="tarjeta sin-pad lista">${habitual.map(c => `<div class="fila"><span class="circulo ${c.tipo === 'ENFERMERIA' ? 'verde' : 'azul'}">${ic('stethoscope')}</span><div class="flex"><div class="t1">${nombreDia(c.dia_semana)}</div><div class="t2">${TIPO_CONSULTA[c.tipo]} · ${hmCorto(aMin(c.inicio))} a ${hmCorto(aMin(c.fin))} · ${esc(c.lugar)}</div></div></div>`).join('')}</div>` : vacio('stethoscope', 'No hay consulta en este pueblo')}
    <p class="peq texto-t">Claxon solo guarda el horario. Nunca datos de salud.</p>`;
}
VISTAS['v-avisos'] = () => {
  const u = yo(); const modo = seg('avisos', 'avisos');
  const sinLeer = db.notis.filter(n => n.uid === S.uid && !n.leida).length;
  const avisos = avisosPara(u.municipio_id);
  let contenido;
  if (modo === 'avisos') {
    contenido = avisos.length ? avisos.map(a => `<button class="tarjeta" style="gap:6px" data-a="ir" data-v="v-aviso" data-id="${a.id}">
        <div class="fila" style="justify-content:space-between"><span class="eti">${ic(CAT_AVISO[a.categoria].icono, 'xs')} ${CAT_AVISO[a.categoria].nombre}</span>${a.prioridad === 'NORMAL' ? `<span class="peq texto-t">${haceTxt(a.desde)}</span>` : pill(a.prioridad === 'URGENTE' ? 'error' : 'pend', cap(a.prioridad.toLowerCase()))}</div>
        <b style="font:700 19px/1.25 var(--f-display)">${esc(a.titulo)}</b><p class="peq texto-t" style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(a.texto)}</p></button>`).join('')
      : vacio('megaphone', 'No hay avisos del ayuntamiento');
  } else if (modo === 'notis') contenido = listaNotis();
  else contenido = horarioConsulta(u.municipio_id);
  return `${cab('Avisos', { volver: false })}
    ${cuerpo(`${segmentos('avisos', [['avisos', 'Ayuntamiento'], ['notis', `Para mí${sinLeer ? ` · ${sinLeer}` : ''}`], ['consulta', 'Consulta']], 'avisos')}${contenido}`, 'gap:12px')}
    ${navVecino('v-avisos')}`;
};
VISTAS['v-aviso'] = ({ id }) => {
  const a = aviso(id); const autor = usuario(a.autor_id);
  const pueblo = a.municipio_id ? municipio(a.municipio_id).nombre : 'todos los pueblos';
  return `${cab(CAT_AVISO[a.categoria].nombre)}
    ${cuerpo(`<div style="display:grid;gap:10px"><span class="eti acento">${ic(CAT_AVISO[a.categoria].icono, 'xs')} Ayuntamiento · ${esc(pueblo)}</span><h1 class="titulo-g">${esc(a.titulo)}</h1>
        ${a.prioridad !== 'NORMAL' ? `<div>${pill(a.prioridad === 'URGENTE' ? 'error' : 'pend', cap(a.prioridad.toLowerCase()))}</div>` : ''}</div>
      <p style="font-size:18px;line-height:1.55">${esc(a.texto)}</p>
      <div class="tarjeta crema" style="gap:6px"><div class="fila peq">${ic('calendar', 's')}<span>Publicado ${haceTxt(a.desde).toLowerCase()} por ${esc(autor.nombre)} ${esc(autor.apellidos.split(' ')[0])}</span></div>
        ${a.hasta ? `<div class="fila peq">${ic('clock', 's')}<span>Visible hasta el ${new Date(a.hasta).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span></div>` : ''}</div>`, 'gap:16px')}`;
};

/* ---------------------------------------------------------------- AJUSTES (comunes) */
function tarjetaPerfil(u) {
  const contacto = [u.telefono && telTxt(u.telefono), u.email].filter(Boolean).join(' · ');
  return `<div class="tarjeta" style="gap:12px"><div class="fila"><span class="avatar g">${iniciales(u)}</span><div class="flex"><div class="t1">${esc(u.nombre)} ${esc(u.apellidos)}</div><div class="t2">${esc(contacto)}</div>
      ${u.municipio_id && tieneRol(u, 'VECINO') ? `<div class="t2">${esc(municipio(u.municipio_id).nombre)}</div>` : ''}</div></div>
      <button class="boton sec mini" style="width:100%" data-a="ir" data-v="v-perfil">${ic('pencil', 's')} Editar mis datos</button></div>
    ${u.email && !u.email_verificado ? `<div class="aviso-form info" style="display:grid;gap:8px"><div class="fila" style="align-items:flex-start">${ic('mail', 's')}<span>Tu correo no está confirmado. Abre el enlace que te enviamos a <b>${esc(u.email)}</b>.</span></div>
      <div style="display:flex;gap:14px;flex-wrap:wrap"><button class="enlace peq" data-a="reenviar-correo">Reenviar el correo</button><button class="enlace peq" data-a="verificar-demo">Ya lo he confirmado (demo)</button></div></div>` : ''}`;
}
function seccionCuenta(u) {
  return `<span class="eti">Cuenta</span>
    <div class="tarjeta sin-pad lista">
      <button class="fila" data-a="ir" data-v="v-password"><span class="circulo gris">${ic('key-round')}</span><div class="flex"><div class="t1">Cambiar la contraseña</div></div>${ic('chevron-right', 's')}</button>
      ${u.roles.length > 1 ? `<button class="fila" data-a="cambiar-perfil"><span class="circulo gris">${ic('repeat')}</span><div class="flex"><div class="t1">Cambiar de perfil</div><div class="t2">Ahora: ${ROL_NOMBRE[S.rol].toLowerCase()} · también ${u.roles.filter(r => r !== S.rol).map(r => ROL_NOMBRE[r].toLowerCase()).join(' y ')}</div></div>${ic('chevron-right', 's')}</button>` : ''}
      <button class="fila" data-a="hoja" data-v="guia"><span class="circulo gris">${ic('flask-conical')}</span><div class="flex"><div class="t1">Guía de la demo</div><div class="t2">Usuarios de prueba, reloj y reinicio</div></div>${ic('chevron-right', 's')}</button>
      <button class="fila" data-a="cerrar-sesion"><span class="circulo gris">${ic('log-out')}</span><div class="flex"><div class="t1">Cerrar sesión</div></div></button>
    </div>
    ${tieneRol(u, 'VECINO') && S.rol === 'VECINO' ? `<button class="enlace peligro peq" style="justify-self:center" data-a="hoja" data-v="baja">Darme de baja de Claxon</button>` : ''}`;
}
ACC['cambiar-perfil'] = () => { S.pila = []; S.vista = { n: 'elegir-perfil', p: {} }; render(); };
ACC['reenviar-correo'] = () => { toast(`Correo reenviado a ${yo().email} (en la demo no llega).`); render(); };
ACC['verificar-demo'] = () => { yo().email_verificado = true; guardar(); toast('Correo confirmado.'); render(); };

VISTAS['v-ajustes'] = () => {
  const u = yo();
  const subs = db.suscripciones.filter(s => s.vecino_id === u.id);
  const fams = familiaresDe(u.id); const pend = familiaresDe(u.id, 'PENDIENTE');
  const tam = [['NORMAL', 'Normal'], ['GRANDE', 'Grande'], ['MUY_GRANDE', 'Muy grande']];
  return `${cab('Ajustes', { volver: false })}
    ${cuerpo(`${tarjetaPerfil(u)}
      <span class="eti">Lectura</span>
      <div class="tarjeta" style="gap:14px">
        <div style="display:grid;gap:8px"><b>Tamaño de la letra</b><div class="segmentos">${tam.map(([v, t]) => `<button class="${u.tamano_texto === v ? 'on' : ''}" data-a="tamano" data-v="${v}" aria-pressed="${u.tamano_texto === v}">${t}</button>`).join('')}</div></div>
        <div class="fila"><div class="flex"><b>Alto contraste</b><div class="t2">Bordes y textos más marcados</div></div>${interruptor(u.alto_contraste, 'contraste', '', 'Alto contraste')}</div>
        <div style="display:grid;gap:8px"><b>Idioma</b><div class="chips">${[['es', 'Español'], ['ca', 'Català'], ['en', 'English']].map(([v, t]) => `<button class="chip ${u.idioma === v ? 'on' : ''}" data-a="idioma" data-v="${v}" aria-pressed="${u.idioma === v}">${t}</button>`).join('')}</div></div>
      </div>
      <span class="eti">Avisos y familia</span>
      <div class="tarjeta sin-pad lista">
        <button class="fila" data-a="ir" data-v="v-suscripciones"><span class="circulo gris">${ic('bell')}</span><div class="flex"><div class="t1">Servicios que me avisan</div><div class="t2">${subs.filter(s => s.activa).length} de ${vendedores().filter(v => paradaEn(v.id, u.municipio_id)).length} activados</div></div>${ic('chevron-right', 's')}</button>
        <button class="fila" data-a="ir" data-v="v-familia"><span class="circulo gris">${ic('users')}</span><div class="flex"><div class="t1">Mi familia</div><div class="t2">${fams.length ? esc(fams.map(f => `${usuario(f.familiar_id).nombre} (${f.parentesco.toLowerCase()})`).join(', ')) : 'Nadie te ayuda todavía'}</div></div>${pend.length ? `<span class="pill pend">${pend.length} nueva</span>` : ic('chevron-right', 's')}</button>
      </div>
      ${seccionCuenta(u)}`, 'gap:12px')}
    ${navVecino('v-ajustes')}`;
};
ACC.tamano = d => { yo().tamano_texto = d.v; guardar(); render(); };
ACC.contraste = () => { const u = yo(); u.alto_contraste = !u.alto_contraste; guardar(); render(); };
ACC.idioma = d => { yo().idioma = d.v; guardar(); toast(d.v === 'es' ? 'Idioma: español.' : 'Guardado. En la demo los textos solo están en español.'); render(); };

/* Mis datos */
VISTAS['v-perfil'] = () => {
  const u = yo(); const vecino = tieneRol(u, 'VECINO');
  return `${cab('Mis datos')}
    <form data-form="perfil" novalidate style="display:contents">
    ${cuerpo(`${campo({ n: 'nombre', l: 'Nombre', v: u.nombre })}
      ${campo({ n: 'apellidos', l: 'Apellidos', v: u.apellidos })}
      ${campo({ n: 'telefono', l: 'Móvil', v: telTxt(u.telefono || ''), icono: 'smartphone', modo: 'tel', ph: '600 111 222' })}
      ${campo({ n: 'email', l: 'Correo', v: u.email || '', icono: 'mail', modo: 'email', ph: 'nombre@correo.es', extra: 'autocapitalize="none"' })}
      ${vecino ? campo({ n: 'municipio', l: 'Pueblo', tipo: 'select', v: u.municipio_id, opciones: db.municipios.map(m => [m.id, m.nombre]), icono: 'map-pin' }) : ''}
      ${vecino ? campo({ n: 'direccion', l: 'Dirección', v: u.direccion || '', icono: 'house', ph: 'C/ Mayor, 12', ayuda: 'Para los encargos a domicilio.' }) : ''}
      <p class="peq texto-t">Puedes entrar con el móvil o con el correo: deja al menos uno de los dos.</p>`, 'gap:16px')}
    ${pie(`<button class="boton" type="submit">Guardar cambios</button>`)}
    </form>`;
};
REGLAS.perfil = {
  nombre: v => V.nombre(v),
  apellidos: v => V.nombre(v, 'tus apellidos'),
  telefono: v => V.telefono(v, { opcional: true, movil: true }) || (normTel(v) && db.usuarios.some(u => u.id !== S.uid && u.telefono === normTel(v)) ? 'Ese teléfono ya lo usa otra cuenta.' : undefined),
  email: v => V.email(v, { opcional: true }) || (v.trim() && db.usuarios.some(u => u.id !== S.uid && u.email === v.trim().toLowerCase()) ? 'Ese correo ya lo usa otra cuenta.' : undefined),
  direccion: v => V.texto(v, { min: 4, max: 120, opcional: true }),
};
ENVIOS.perfil = vals => {
  if (!normTel(vals.telefono) && !vals.email.trim()) return { telefono: 'Deja al menos el móvil o el correo para poder entrar.' };
  const u = yo(); const email = vals.email.trim().toLowerCase() || null;
  const cambiaCorreo = email && email !== u.email;
  Object.assign(u, { nombre: vals.nombre.trim(), apellidos: vals.apellidos.trim(), telefono: normTel(vals.telefono) || null, email });
  if (cambiaCorreo) u.email_verificado = false;
  if (!email) u.email_verificado = false;
  if ('municipio' in vals) { u.municipio_id = Number(vals.municipio); u.direccion = vals.direccion.trim() || null; }
  guardar(); toast(cambiaCorreo ? 'Guardado. Te hemos enviado un correo para confirmar la dirección nueva.' : 'Datos guardados.'); volver();
};

VISTAS['v-password'] = () => `${cab('Cambiar la contraseña')}
  <form data-form="password" novalidate style="display:contents">
  ${cuerpo(`${campo({ n: 'actual', l: 'Contraseña actual', tipo: 'password', icono: 'lock', auto: 'current-password' })}
    ${campo({ n: 'nueva', l: 'Contraseña nueva', tipo: 'password', icono: 'lock', auto: 'new-password', ayuda: 'Mínimo 8 caracteres, con letras y números.', extra: 'data-fuerza' })}
    <div class="fuerza" data-n="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
    ${campo({ n: 'repetir', l: 'Repite la contraseña nueva', tipo: 'password', icono: 'lock', auto: 'new-password' })}`, 'gap:16px')}
  ${pie(`<button class="boton" type="submit">Cambiar la contraseña</button>`)}
  </form>`;
REGLAS.password = {
  actual: v => v ? undefined : 'Escribe tu contraseña actual.',
  nueva: (v, t) => V.password(v) || (v === t.actual ? 'La contraseña nueva tiene que ser distinta de la actual.' : undefined),
  repetir: (v, t) => !v ? 'Repite la contraseña nueva.' : v !== t.nueva ? 'Las dos contraseñas no son iguales.' : undefined,
};
ENVIOS.password = vals => {
  const u = yo();
  if (vals.actual !== u.password) return { actual: 'La contraseña actual no es correcta.' };
  u.password = vals.nueva; guardar(); toast('Contraseña cambiada. Úsala la próxima vez que entres.'); volver();
};

/* Darse de baja */
HOJAS.baja = () => `<h2 class="titulo-m">Darte de baja de Claxon</h2>
  <p class="texto-t">Dejarás de recibir avisos y no podrás entrar. Tus encargos se conservan. Para confirmarlo, escribe tu contraseña.</p>
  <form data-form="baja" novalidate style="display:grid;gap:14px">
    ${campo({ n: 'clave', l: 'Contraseña', tipo: 'password', icono: 'lock', auto: 'current-password' })}
    <button class="boton peligro" type="submit">Darme de baja</button>
    <button type="button" class="boton sec" data-a="cerrar-hoja">No, volver</button>
  </form>`;
REGLAS.baja = { clave: v => v ? undefined : 'Escribe tu contraseña para confirmar.' };
ENVIOS.baja = vals => {
  const u = yo();
  if (vals.clave !== u.password) return { clave: 'La contraseña no es correcta.' };
  u.activo = false; u.fecha_baja = ahoraMs(); guardar();
  cerrarSesion('Tu cuenta se ha dado de baja. Si intentas entrar, verás el aviso de cuenta dada de baja.');
};

/* Servicios que me avisan */
VISTAS['v-suscripciones'] = () => {
  const u = yo();
  const lista = vendedores().filter(v => paradaEn(v.id, u.municipio_id));
  return `${cab('Servicios que me avisan')}
    <form data-form="suscripciones" novalidate style="display:contents">
    ${cuerpo(`<p class="texto-t">Te mandamos un aviso antes de que llegue cada servicio a ${esc(municipio(u.municipio_id).nombre)}.</p>
      ${lista.map(v => {
        const s = db.suscripciones.find(x => x.vecino_id === u.id && x.vendedor_id === v.id) || { minutos: 15, activa: false };
        const c = CATEGORIA[v.categoria];
        return `<div class="tarjeta" style="gap:12px">
          <div class="fila"><span class="circulo ${c.circulo}">${ic(c.icono)}</span><div class="flex"><div class="t1">${esc(v.nombre_comercial)}</div><div class="t2">Pasa los ${textoDias(v.dias_reparto)}</div></div>
            ${oculto(`on_${v.id}`, s.activa ? '1' : '')}<button type="button" class="interruptor ${s.activa ? 'on' : ''}" role="switch" aria-checked="${s.activa}" aria-label="Avisarme de ${esc(v.nombre_comercial)}" data-a="interruptor-form" data-campo="on_${v.id}"></button></div>
          ${campo({ n: `min_${v.id}`, l: 'Minutos antes', tipo: 'number', v: s.minutos, modo: 'numeric', ayuda: 'Entre 5 y 120 minutos.', extra: 'min="5" max="120" step="1"' })}
        </div>`;
      }).join('')}`, 'gap:12px')}
    ${pie(`<button class="boton" type="submit">Guardar</button>`)}
    </form>`;
};
ACC['interruptor-form'] = (d, el) => {
  const f = el.closest('form'); const input = f.querySelector(`input[name="${d.campo}"]`);
  const on = !input.value; input.value = on ? '1' : '';
  el.classList.toggle('on', on); el.setAttribute('aria-checked', on);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};
const reglaMinutos = (v, min = 5, max = 120) => {
  const t = String(v).trim();
  if (!t) return 'Escribe cuántos minutos antes.';
  if (!/^\d+$/.test(t)) return 'Escribe un número entero de minutos, sin decimales.';
  const n = Number(t);
  if (n < min || n > max) return `Tiene que ser entre ${min} y ${max} minutos.`;
};
ENVIOS.suscripciones = vals => {
  const u = yo(); const errores = {};
  Object.keys(vals).filter(k => k.startsWith('min_')).forEach(k => { const m = reglaMinutos(vals[k]); if (m) errores[k] = m; });
  if (Object.keys(errores).length) return errores;
  Object.keys(vals).filter(k => k.startsWith('on_')).forEach(k => {
    const vid = Number(k.slice(3));
    let s = db.suscripciones.find(x => x.vecino_id === u.id && x.vendedor_id === vid);
    if (!s) { s = { vecino_id: u.id, vendedor_id: vid, minutos: 15, activa: false }; db.suscripciones.push(s); }
    s.activa = !!vals[k]; s.minutos = Number(vals[`min_${vid}`]);
  });
  guardar(); toast('Avisos guardados.'); volver();
};

/* Mi familia (vecino) */
VISTAS['v-familia'] = () => {
  const u = yo();
  const fams = familiaresDe(u.id); const pend = familiaresDe(u.id, 'PENDIENTE');
  return `${cab('Mi familia')}
    ${cuerpo(`${pend.map(f => { const q = usuario(f.familiar_id); return `<div class="tarjeta suave" style="gap:10px"><div class="fila"><span class="avatar verde">${iniciales(q)}</span><div class="flex"><div class="t1">${esc(nombreCompleto(q))} quiere ayudarte</div><div class="t2">Dice que es tu ${esc(f.parentesco.toLowerCase())}</div></div></div>
        <p class="peq">Si aceptas, verá tus avisos y podrá hacer encargos por ti.</p>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><button class="boton mini sec" style="width:100%" data-a="fam-responder" data-id="${q.id}" data-v="no">Rechazar</button><button class="boton mini" style="width:100%" data-a="fam-responder" data-id="${q.id}" data-v="si">Aceptar</button></div></div>`; }).join('')}
      <div class="tarjeta" style="gap:10px"><span class="eti">Tu código de familia</span><div class="codigo-grande">${esc(u.codigo_familia || '—')}</div>
        <p class="peq texto-t">Dáselo a quien te ayude: lo escribe en «Vincular» desde su móvil y luego tú lo aceptas aquí.</p>
        <button class="boton sec mini" style="width:100%" data-a="copiar" data-texto="${esc(u.codigo_familia || '')}">${ic('copy', 's')} Copiar el código</button></div>
      <span class="eti">Te ayudan</span>
      ${fams.length ? `<div class="tarjeta sin-pad lista">${fams.map(f => { const q = usuario(f.familiar_id); return `<div class="fila" style="align-items:flex-start"><span class="avatar azul">${iniciales(q)}</span><div class="flex" style="display:grid;gap:8px">
          <div><div class="t1">${esc(nombreCompleto(q))}</div><div class="t2">${esc(f.parentesco)} · ${q.telefono ? telTxt(q.telefono) : esc(q.email || '')}</div></div>
          <div class="fila" style="gap:10px"><span class="peq" style="flex:1">Puede hacer encargos por mí</span>${interruptor(f.puede_hacer_encargos, 'fam-permiso', `data-id="${q.id}"`, 'Puede hacer encargos por mí')}</div>
          <button class="enlace peligro peq" style="justify-self:start" data-a="hoja-confirmar" data-tipo="fam-quitar" data-id="${q.id}">Quitar</button></div></div>`; }).join('')}</div>`
        : vacio('users', 'Nadie te ayuda todavía', 'Comparte tu código con un familiar.')}`, 'gap:12px')}`;
};
ACC['fam-responder'] = d => {
  const f = db.familiares.find(x => x.familiar_id === Number(d.id) && x.vecino_id === S.uid);
  const q = usuario(f.familiar_id);
  if (d.v === 'si') { f.estado = 'ACEPTADO'; notificar([q.id], 'user-check', `${yo().nombre} ha aceptado tu ayuda`, 'Ya puedes ver sus avisos y hacer encargos por ella o por él.'); toast(`${q.nombre} ya puede ayudarte.`); }
  else { f.estado = 'RECHAZADO'; notificar([q.id], 'user-x', `${yo().nombre} no ha aceptado la solicitud`, 'Si es un error, pídele que te dé su código otra vez.'); toast('Solicitud rechazada.'); }
  guardar(); render();
};
ACC['fam-permiso'] = d => { const f = db.familiares.find(x => x.familiar_id === Number(d.id) && x.vecino_id === S.uid); f.puede_hacer_encargos = !f.puede_hacer_encargos; guardar(); render(); };
ACC['fam-quitar'] = d => { db.familiares = db.familiares.filter(x => !(x.familiar_id === Number(d.id) && x.vecino_id === S.uid)); guardar(); S.hoja = null; toast('Familiar quitado.'); render(); };

/* ---------------------------------------------------------------- FAMILIAR */
VISTAS['f-inicio'] = () => {
  const u = yo();
  const ayudo = ayudadosPor(u.id); const pend = ayudadosPor(u.id, 'PENDIENTE');
  const tarjetas = ayudo.map(f => {
    const vec = usuario(f.vecino_id);
    const prox = db.paradas.filter(p => p.municipio_id === vec.municipio_id && p.fecha === hoy() && ['PREVISTA', 'EN_CAMINO', 'EN_PARADA'].includes(p.estado)).sort((a, b) => a.estimada - b.estimada)[0];
    const activos = db.encargos.filter(e => e.vecino_id === vec.id && e.fecha >= hoy() && ENCARGO_ACTIVO.includes(e.estado));
    const cambio = consultasDia(vec.municipio_id, hoy()).find(c => c.cambio);
    return `<button class="tarjeta" style="gap:10px" data-a="ir" data-v="f-vecino" data-id="${vec.id}">
      <div class="fila"><span class="avatar g">${iniciales(vec)}</span><div class="flex"><div class="t1">${esc(nombreCompleto(vec))}</div><div class="t2">${esc(f.parentesco)} · ${esc(municipio(vec.municipio_id).nombre)}</div></div>${vec.password ? '' : pill('', 'Sin móvil')}</div>
      ${prox ? `<div class="fila peq">${ic(CATEGORIA[usuario(prox.vendedor_id).categoria].icono, 's')}<span style="flex:1">${CATEGORIA[usuario(prox.vendedor_id).categoria].nombre} hacia las <b class="num">${hm(prox.estimada)}</b></span>${pill(ESTADO_PARADA[prox.estado][0], ESTADO_PARADA[prox.estado][1])}</div>` : `<p class="peq texto-t">Hoy ya no pasa ningún servicio por su pueblo.</p>`}
      ${cambio ? `<div class="fila peq">${ic('stethoscope', 's')}<span>Cambio en la consulta de hoy</span></div>` : ''}
      ${activos.length ? `<div class="fila peq">${ic('shopping-basket', 's')}<span>${plural(activos.length, 'encargo pendiente', 'encargos pendientes')}</span></div>` : ''}
    </button>`;
  }).join('');
  return `${cabHola(etiHoy(), `Hola, ${esc(u.nombre)}`, u)}
    ${cuerpo(`<span class="eti">Las personas que ayudas</span>
      ${tarjetas || vacio('hand-heart', 'Todavía no ayudas a nadie', 'Pide a tu familiar su código de familia o crea un perfil para alguien sin móvil.')}
      ${pend.map(f => `<div class="tarjeta crema" style="gap:8px"><div class="fila peq">${ic('hourglass', 's')}<span style="flex:1">Esperando a que <b>${esc(usuario(f.vecino_id).nombre)}</b> acepte tu solicitud.</span></div><button class="enlace peq peligro" style="justify-self:start" data-a="fam-anular" data-id="${f.vecino_id}">Anular la solicitud</button></div>`).join('')}
      <button class="boton sec" data-a="pestana" data-v="f-vincular">${ic('user-plus', 's')} Ayudar a otra persona</button>`, 'gap:12px')}
    ${navFamiliar('f-inicio')}`;
};
ACC['fam-anular'] = d => { db.familiares = db.familiares.filter(x => !(x.familiar_id === S.uid && x.vecino_id === Number(d.id) && x.estado === 'PENDIENTE')); guardar(); toast('Solicitud anulada.'); render(); };

VISTAS['f-vecino'] = ({ id }) => {
  const vec = usuario(id);
  const f = db.familiares.find(x => x.familiar_id === S.uid && x.vecino_id === id);
  return `${cab(esc(vec.nombre))}
    ${cuerpo(`<div class="tarjeta" style="gap:10px">
        <div class="fila"><span class="avatar g">${iniciales(vec)}</span><div class="flex"><div class="t1">${esc(vec.nombre)} ${esc(vec.apellidos)}</div><div class="t2">${esc(vec.direccion || 'Sin dirección')} · ${esc(municipio(vec.municipio_id).nombre)}</div></div></div>
        ${vec.password ? '' : `<p class="peq">${ic('info', 'xs')} No tiene móvil: tú gestionas su cuenta.${vec.necesita_ayuda_entrega ? ' Necesita ayuda con las entregas.' : ''}</p>${vec.notas_entrega ? `<p class="peq texto-t">«${esc(vec.notas_entrega)}»</p>` : ''}
          <button class="boton sec mini" style="width:100%" data-a="ir" data-v="f-editar-vecino" data-id="${vec.id}">${ic('pencil', 's')} Datos de entrega</button>`}
        <div class="fila"><span class="peq" style="flex:1">Recibir sus avisos en mi móvil</span>${interruptor(f.recibe_avisos, 'fam-avisos', `data-id="${vec.id}"`, 'Recibir sus avisos')}</div>
      </div>
      ${bloqueHoy(vec, false)}`, 'gap:12px')}
    ${pie(f.puede_hacer_encargos ? `<button class="boton" data-a="nuevo-encargo" data-vecino="${vec.id}">${ic('shopping-basket', 's')} Hacer un encargo para ${esc(vec.nombre)}</button>` : `<p class="peq texto-t" style="text-align:center">${esc(vec.nombre)} no te ha dado permiso para hacer encargos.</p>`)}`;
};
ACC['fam-avisos'] = d => { const f = db.familiares.find(x => x.familiar_id === S.uid && x.vecino_id === Number(d.id)); f.recibe_avisos = !f.recibe_avisos; guardar(); toast(f.recibe_avisos ? 'Recibirás sus avisos.' : 'Ya no recibirás sus avisos.'); render(); };

VISTAS['f-editar-vecino'] = ({ id }) => {
  const vec = usuario(id);
  return `${cab('Datos de entrega')}
    <form data-form="editar-vecino" novalidate style="display:contents">${oculto('id', id)}
    ${cuerpo(`<p class="texto-t">Para que el vendedor sepa dónde llevar los encargos de ${esc(vec.nombre)}.</p>
      ${campo({ n: 'direccion', l: 'Dirección', v: vec.direccion || '', icono: 'house' })}
      ${campo({ n: 'telefono', l: 'Teléfono fijo (opcional)', v: telTxt(vec.telefono || ''), icono: 'phone', modo: 'tel' })}
      ${grupoCampo('ayuda', '', casilla('ayuda', 'Necesita ayuda con las entregas (subir la compra, abrir la puerta…)', vec.necesita_ayuda_entrega))}
      ${campo({ n: 'notas', l: 'Notas para el vendedor', tipo: 'textarea', v: vec.notas_entrega || '', max: 200, ph: 'Por ejemplo: llamar fuerte a la puerta' })}`, 'gap:16px')}
    ${pie(`<button class="boton" type="submit">Guardar</button>`)}</form>`;
};
REGLAS['editar-vecino'] = {
  direccion: v => V.texto(v, { min: 4, max: 120, que: 'la dirección' }),
  telefono: (v, t) => V.telefono(v, { opcional: true }) || (normTel(v) && db.usuarios.some(u => u.id !== Number(t.id) && u.telefono === normTel(v)) ? 'Ese teléfono ya lo usa otra cuenta.' : undefined),
  notas: v => V.texto(v, { max: 200, opcional: true }),
};
ENVIOS['editar-vecino'] = vals => {
  const vec = usuario(Number(vals.id));
  Object.assign(vec, { direccion: vals.direccion.trim(), telefono: normTel(vals.telefono) || null, necesita_ayuda_entrega: !!vals.ayuda, notas_entrega: vals.notas.trim() || null });
  guardar(); toast('Datos de entrega guardados.'); volver();
};

VISTAS['f-encargos'] = () => {
  const ids = ayudadosPor(S.uid).map(f => f.vecino_id);
  return `${cab('Encargos', { volver: false })}
    ${cuerpo(ids.length ? listaEncargos(ids, true) : vacio('shopping-basket', 'Aún no ayudas a nadie'), 'gap:12px')}
    ${navFamiliar('f-encargos')}`;
};

const PARENTESCOS = ['Hija', 'Hijo', 'Nieta', 'Nieto', 'Sobrina', 'Sobrino', 'Hermana', 'Hermano', 'Prima', 'Primo', 'Vecina', 'Vecino', 'Otra relación'];
VISTAS['f-vincular'] = () => `${cab('Ayudar a alguien', { volver: false })}
  ${cuerpo(`<div class="tarjeta" style="gap:14px"><div class="fila"><span class="circulo">${ic('smartphone')}</span><div class="flex"><div class="t1">Tiene la app</div><div class="t2">Escribe su código de familia. Lo ve en Ajustes › Mi familia.</div></div></div>
      <form data-form="vincular" novalidate style="display:grid;gap:14px">
        ${campo({ n: 'codigo', l: 'Código de 6 letras o números', ph: '8F3K2P', icono: 'key-round', extra: 'autocapitalize="characters" maxlength="10" style="text-transform:uppercase;letter-spacing:.15em;font-family:var(--f-mono)"' })}
        ${campo({ n: 'parentesco', l: '¿Qué es para ti?', tipo: 'select', opciones: [['', 'Elige…'], ...PARENTESCOS.map(p => [p, p])] })}
        <button class="boton" type="submit">${ic('send', 's')} Enviar solicitud</button>
      </form>
      <p class="peq texto-t">Prueba con <b class="mono">C7RM2Q</b> (Carmen) o <b class="mono">T5R8NA</b> (Teresa).</p></div>
    <button class="tarjeta" data-a="ir" data-v="f-nuevo-perfil"><div class="fila"><span class="circulo gris">${ic('user-plus')}</span><div class="flex"><div class="t1">No tiene móvil</div><div class="t2">Crea su perfil y gestiónalo tú: recibirás sus avisos y harás sus encargos.</div></div>${ic('chevron-right', 's')}</div></button>`, 'gap:14px')}
  ${navFamiliar('f-vincular')}`;
REGLAS.vincular = {
  codigo(v) {
    const c = v.replace(/\s/g, '').toUpperCase();
    if (!c) return 'Escribe el código de tu familiar.';
    if (!/^[A-Z0-9]+$/.test(c)) return 'El código solo lleva letras y números, sin guiones ni espacios.';
    if (c.length !== 6) return `El código tiene 6 caracteres y has escrito ${c.length}. Ejemplo: 8F3K2P.`;
  },
  parentesco: v => v ? undefined : 'Elige qué es para ti.',
};
ENVIOS.vincular = vals => {
  const c = vals.codigo.replace(/\s/g, '').toUpperCase();
  const vec = db.usuarios.find(u => u.codigo_familia === c);
  if (!vec) return { codigo: 'No hay nadie con ese código. Comprueba las letras y los números (la O y el 0 se parecen).' };
  if (vec.id === S.uid) return { codigo: 'Ese es tu propio código. Necesitas el de la persona a la que quieres ayudar.' };
  if (!vec.activo) return { codigo: 'Esa cuenta está dada de baja.' };
  const ya = db.familiares.find(f => f.familiar_id === S.uid && f.vecino_id === vec.id);
  if (ya && ya.estado === 'ACEPTADO') return { codigo: `Ya ayudas a ${vec.nombre}.` };
  if (ya && ya.estado === 'PENDIENTE') return { codigo: `Ya le enviaste una solicitud a ${vec.nombre}. Falta que la acepte.` };
  if (ya) db.familiares = db.familiares.filter(f => f !== ya);
  db.familiares.push({ familiar_id: S.uid, vecino_id: vec.id, parentesco: vals.parentesco, puede_hacer_encargos: true, recibe_avisos: true, estado: 'PENDIENTE', fecha: ahoraMs() });
  notificar([vec.id], 'user-plus', `${yo().nombre} quiere ayudarte`, `Dice que es tu ${vals.parentesco.toLowerCase()}. Acéptalo en Ajustes › Mi familia.`);
  guardar(); toast(`Solicitud enviada. ${vec.nombre} tiene que aceptarla desde su móvil.`); pestana('f-inicio');
};

VISTAS['f-nuevo-perfil'] = () => `${cab('Perfil sin móvil')}
  <form data-form="nuevo-perfil" novalidate style="display:contents">
  ${cuerpo(`<p class="texto-t">Para alguien que no usa el móvil. No tendrá contraseña: lo gestionas tú.</p>
    ${campo({ n: 'nombre', l: 'Nombre', ph: 'Joaquín' })}
    ${campo({ n: 'apellidos', l: 'Apellidos', ph: 'Pérez Gascón' })}
    ${campo({ n: 'parentesco', l: '¿Qué es para ti?', tipo: 'select', opciones: [['', 'Elige…'], ...PARENTESCOS.map(p => [p, p])] })}
    ${campo({ n: 'municipio', l: 'Pueblo', tipo: 'select', opciones: [['', 'Elige el pueblo…'], ...db.municipios.map(m => [m.id, m.nombre])], icono: 'map-pin' })}
    ${campo({ n: 'direccion', l: 'Dirección', ph: 'C/ del Horno, 5', icono: 'house' })}
    ${campo({ n: 'telefono', l: 'Teléfono fijo (opcional)', ph: '978 000 111', icono: 'phone', modo: 'tel' })}
    ${grupoCampo('ayuda', '', casilla('ayuda', 'Necesita ayuda con las entregas', false))}
    ${campo({ n: 'notas', l: 'Notas para los vendedores (opcional)', tipo: 'textarea', max: 200, ph: 'Por ejemplo: llamar fuerte a la puerta' })}`, 'gap:16px')}
  ${pie(`<button class="boton" type="submit">Crear el perfil</button>`)}
  </form>`;
REGLAS['nuevo-perfil'] = {
  nombre: v => V.nombre(v, 'su nombre'),
  apellidos: v => V.nombre(v, 'sus apellidos'),
  parentesco: v => v ? undefined : 'Elige qué es para ti.',
  municipio: v => v ? undefined : 'Elige su pueblo.',
  direccion: v => V.texto(v, { min: 4, max: 120, que: 'la dirección' }),
  telefono: v => V.telefono(v, { opcional: true }) || (normTel(v) && db.usuarios.some(u => u.telefono === normTel(v)) ? 'Ese teléfono ya lo usa otra cuenta.' : undefined),
  notas: v => V.texto(v, { max: 200, opcional: true }),
};
ENVIOS['nuevo-perfil'] = vals => {
  const id = siguienteId('usuario'); const mid = Number(vals.municipio);
  db.usuarios.push({ id, roles: ['VECINO'], nombre: vals.nombre.trim(), apellidos: vals.apellidos.trim(), email: null, telefono: normTel(vals.telefono) || null, password: null,
    municipio_id: mid, direccion: vals.direccion.trim(), necesita_ayuda_entrega: !!vals.ayuda, notas_entrega: vals.notas.trim() || null, codigo_familia: null,
    idioma: 'es', tamano_texto: 'GRANDE', alto_contraste: false, activo: true, fecha_baja: null, nombre_comercial: null, categoria: null, dias_reparto: null,
    hora_salida: null, acepta_encargos: false, horas_antelacion_encargo: 0, email_verificado: false, fecha_alta: ahoraMs(), ultimo_acceso: null });
  db.familiares.push({ familiar_id: S.uid, vecino_id: id, parentesco: vals.parentesco, puede_hacer_encargos: true, recibe_avisos: true, estado: 'ACEPTADO', fecha: ahoraMs() });
  vendedores().filter(v => paradaEn(v.id, mid)).forEach(v => db.suscripciones.push({ vecino_id: id, vendedor_id: v.id, minutos: 15, activa: true }));
  guardar(); toast(`Perfil de ${vals.nombre.trim()} creado. Ya recibes sus avisos.`); pestana('f-inicio');
};

VISTAS['f-ajustes'] = () => {
  const u = yo();
  return `${cab('Ajustes', { volver: false })}
    ${cuerpo(`${tarjetaPerfil(u)}${seccionCuenta(u)}`, 'gap:12px')}
    ${navFamiliar('f-ajustes')}`;
};
