/* =============================================================================
   Claxon · demo · vendedor
   ============================================================================= */
'use strict';

function navVendedor(activo) {
  const pend = db.encargos.filter(e => parada(e.parada_id).vendedor_id === S.uid && e.estado === 'PENDIENTE' && e.fecha >= hoy()).length;
  return navMovil([['r-ruta', 'route', 'Ruta'], ['r-encargos', 'shopping-basket', 'Encargos', pend || ''], ['r-catalogo', 'package', 'Catálogo'], ['r-ajustes', 'settings', 'Ajustes']], activo);
}
function encargosParada(pid, fecha = hoy()) { return db.encargos.filter(e => e.parada_id === pid && e.fecha === fecha && e.estado !== 'CANCELADO'); }
function suscritosEn(vid, mid) { return db.suscripciones.filter(s => s.vendedor_id === vid && s.activa && usuario(s.vecino_id).municipio_id === mid && usuario(s.vecino_id).activo).map(s => s.vecino_id); }
function resumenParada(p, fecha = hoy()) {
  const es = encargosParada(p.id, fecha);
  if (!es.length) return 'Sin encargos';
  return es.map(e => `${usuario(e.vecino_id).nombre} (${ESTADO_ENCARGO[e.estado][1].toLowerCase()}${e.a_domicilio ? ', a casa' : ''})`).join(' · ');
}
function lineaRuta(ruta, fecha = hoy()) {
  const actual = siguienteParada(S.uid);
  return `<ol class="tiempo">${ruta.map(p => {
    const esHoy = p.fecha === hoy() && fecha === hoy();
    const clase = !esHoy ? 'pendiente' : p.estado === 'HECHA' ? 'hecho' : p.estado === 'EN_PARADA' ? 'hecho actual' : actual && actual.id === p.id && p.estado === 'EN_CAMINO' ? 'actual' : 'pendiente';
    const h = esHoy && p.llegada != null ? `${hm(p.llegada)}${p.salida ? `<small>salió ${hm(p.salida)}</small>` : '<small>llegó</small>'}` : hm(hora(p, fecha));
    return `<li><span class="h" ${clase.includes('actual') ? 'style="color:var(--a-acento)"' : ''}>${h}</span><span class="eje ${clase}"><i></i></span>
      <span class="d"><b>${esc(municipio(p.municipio_id).nombre)}${esHoy && p.estado === 'CANCELADA' ? ' · cancelada' : ''}</b><span>${esc(resumenParada(p, fecha))}</span></span></li>`;
  }).join('')}</ol>`;
}

/* ---------------------------------------------------------------- Ruta de hoy */
VISTAS['r-ruta'] = () => {
  const v = yo(); const est = estadoRuta(v.id); const ruta = rutaHoy(v.id);
  const nombreRuta = RUTA_NOMBRE[v.categoria];
  if (est === 'SIN_RUTA') {
    const prox = proximoReparto(v, sumaDias(hoy(), 1));
    const todas = paradasDe(v.id);
    const nEnc = db.encargos.filter(e => e.fecha === prox && todas.some(p => p.id === e.parada_id) && ENCARGO_ACTIVO.includes(e.estado)).length;
    return `${cabHola(etiHoy(v.nombre_comercial), `Hola, ${esc(v.nombre)}`, v)}
      ${cuerpo(`<div class="tarjeta crema" style="gap:6px"><span class="eti">Hoy no repartes</span><b style="font:700 22px/1.2 var(--f-display)">Próximo reparto: ${etiquetaDia(prox).toLowerCase()}</b>
          <p class="peq texto-t">Repartes los ${textoDias(v.dias_reparto)} y sales a las ${v.hora_salida}. Lo puedes cambiar en Ajustes.</p></div>
        <div class="tarjeta" style="gap:12px"><div class="fila" style="justify-content:space-between"><b class="titulo-m">${nombreRuta}</b>${pill('', `${diaCorto(prox)} · ${v.hora_salida}`)}</div>
          <div class="fila texto-t peq" style="gap:16px;flex-wrap:wrap"><span>${plural(todas.length, 'parada')}</span><span>${plural(nEnc, 'encargo')}</span></div>
          ${lineaRuta(todas, prox)}</div>`, 'gap:14px')}
      ${navVendedor('r-ruta')}`;
  }
  if (est === 'PREVISTA') {
    const nEnc = ruta.reduce((t, p) => t + encargosParada(p.id).filter(e => ENCARGO_ACTIVO.includes(e.estado)).length, 0);
    const nSus = ruta.reduce((t, p) => t + suscritosEn(v.id, p.municipio_id).length, 0);
    return `${cabHola(etiHoy(v.nombre_comercial), `${saludo()}, ${esc(v.nombre)}`, v)}
      ${cuerpo(`<div class="tarjeta" style="gap:12px">
          <div class="fila" style="justify-content:space-between"><b class="titulo-m">${nombreRuta}</b>${pill('', `Salida ${v.hora_salida}`)}</div>
          <div class="fila texto-t peq" style="gap:16px;flex-wrap:wrap"><span>${plural(ruta.length, 'parada')}</span><span>${plural(nEnc, 'encargo')}</span><span>${plural(nSus, 'vecino suscrito', 'vecinos suscritos')}</span></div>
          ${lineaRuta(ruta)}</div>
        <button class="boton gigante" data-a="ruta-iniciar">${ic('play', 'l')} Iniciar ruta</button>
        <p class="peq texto-t" style="text-align:center">Al pulsar se calculan las horas con tu salida real y se avisa a los vecinos de cada pueblo.</p>`, 'gap:14px')}
      ${navVendedor('r-ruta')}`;
  }
  if (est === 'TERMINADA' || est === 'CANCELADA') {
    const es = ruta.flatMap(p => encargosParada(p.id));
    const entregados = es.filter(e => e.estado === 'ENTREGADO').length;
    const noVino = es.filter(e => e.estado === 'NO_RECOGIDO').length;
    return `${cab(nombreRuta, { volver: false, extra: pill(est === 'TERMINADA' ? 'ok' : 'error', est === 'TERMINADA' ? 'Terminada' : 'Cancelada') })}
      ${cuerpo(`<div class="tarjeta" style="gap:8px;text-align:center;justify-items:center"><span class="circulo ${est === 'TERMINADA' ? 'ok' : ''} g">${ic(est === 'TERMINADA' ? 'flag' : 'circle-x', 'l')}</span>
          <b class="titulo-m">${est === 'TERMINADA' ? 'Ruta terminada' : 'Has cancelado la ruta de hoy'}</b>
          <p class="texto-t peq">${est === 'TERMINADA' ? `${plural(entregados, 'encargo entregado', 'encargos entregados')}${noVino ? ` · ${noVino} sin recoger` : ''}` : esc(v.motivo_cancelacion || '')}</p></div>
        ${lineaRuta(ruta)}`, 'gap:14px')}
      ${navVendedor('r-ruta')}`;
  }
  // En curso
  const sig = siguienteParada(v.id);
  const resto = ruta.filter(p => ['EN_CAMINO', 'PREVISTA'].includes(p.estado));
  let tarjeta;
  if (sig.estado === 'EN_PARADA') {
    const nEnc = encargosParada(sig.id).filter(e => ENCARGO_ACTIVO.includes(e.estado)).length;
    const despues = resto.find(p => p.orden > sig.orden);
    tarjeta = `<div class="tarjeta oscura" style="gap:6px"><span class="eti" style="color:#C9CDD6">Estás en</span>
        <div class="fila" style="justify-content:space-between;align-items:baseline"><b style="font:700 28px/1.1 var(--f-display)">${esc(municipio(sig.municipio_id).nombre)}</b><b class="num" style="font:700 22px/1 var(--f-display)">desde ${hm(sig.llegada)}</b></div>
        <p style="color:#D9DCE3;font-size:15.5px">${esc(sig.punto)} · ${plural(nEnc, 'encargo por entregar', 'encargos por entregar')}</p></div>
      <button class="boton gigante" data-a="ir" data-v="r-parada" data-id="${sig.id}">${ic('shopping-basket', 'l')} Ver los encargos de aquí</button>
      <button class="boton osc" data-a="ruta-salir" data-id="${sig.id}">${despues ? `Salir hacia ${esc(municipio(despues.municipio_id).nombre)}` : 'Terminar la ruta'} ${ic('arrow-right', 's')}</button>`;
  } else {
    const nEnc = encargosParada(sig.id).filter(e => ENCARGO_ACTIVO.includes(e.estado)).length;
    const nAvisos = destinatarios([...new Set([...suscritosEn(v.id, sig.municipio_id), ...encargosParada(sig.id).map(e => e.vecino_id)])]).length;
    tarjeta = `<div class="tarjeta oscura" style="gap:6px"><span class="eti" style="color:#C9CDD6">Siguiente parada</span>
        <div class="fila" style="justify-content:space-between;align-items:baseline"><b style="font:700 28px/1.1 var(--f-display)">${esc(municipio(sig.municipio_id).nombre)}</b><b class="num" style="font:700 30px/1 var(--f-display)">${hm(sig.estimada)}</b></div>
        <p style="color:#D9DCE3;font-size:15.5px">${esc(sig.punto)} · ${plural(nEnc, 'encargo')} · ${plural(nAvisos, 'persona recibe', 'personas reciben')} aviso</p></div>
      <button class="boton gigante ok" data-a="ruta-llegar" data-id="${sig.id}">${ic('map-pin', 'l')} He llegado a ${esc(municipio(sig.municipio_id).nombre)}</button>`;
  }
  return `${cab(nombreRuta, { volver: false, extra: pill('camino', 'En curso', true) })}
    ${cuerpo(`${tarjeta}${lineaRuta(ruta)}
      ${resto.length ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:auto"><button class="boton sec" data-a="hoja" data-v="retraso">${ic('timer', 's')} Retraso</button><button class="boton sec peligro" data-a="hoja" data-v="cancelar-ruta">Hoy no puedo</button></div>` : ''}`, 'gap:14px')}
    ${navVendedor('r-ruta')}`;
};

ACC['ruta-iniciar'] = () => {
  const v = yo(); const ahora = minAhora();
  v.salida_real = ahora;
  const ruta = rutaHoy(v.id);
  let avisados = 0;
  ruta.forEach(p => {
    p.estimada = ahora + p.minutos; p.estado = 'EN_CAMINO';
    const ids = destinatarios(suscritosEn(v.id, p.municipio_id));
    avisados += notificar(ids, CATEGORIA[v.categoria].icono, `${v.nombre_comercial} ha salido`, `Llega a ${municipio(p.municipio_id).nombre} (${p.punto}) hacia las ${hm(p.estimada)}.`);
  });
  guardar(); toast(`Ruta iniciada a las ${hm(ahora)}. Avisadas ${plural(avisados, 'persona')}.`); render();
};
ACC['ruta-llegar'] = d => {
  const v = yo(); const p = parada(Number(d.id));
  p.estado = 'EN_PARADA'; p.llegada = minAhora();
  const conEncargo = encargosParada(p.id).filter(e => ENCARGO_ACTIVO.includes(e.estado)).map(e => e.vecino_id);
  const ids = destinatarios([...new Set([...suscritosEn(v.id, p.municipio_id), ...conEncargo])]);
  const n = notificar(ids, CATEGORIA[v.categoria].icono, `${v.nombre_comercial} ha llegado a ${municipio(p.municipio_id).nombre}`, `Está en ${p.punto} desde las ${hm(p.llegada)}.${conEncargo.length ? ' Si tienes encargo, ya puedes recogerlo.' : ''}`);
  guardar(); toast(`Llegada guardada a las ${hm(p.llegada)}. Avisadas ${plural(n, 'persona')}.`);
  S.pila = [{ n: 'r-ruta', p: {} }]; S.vista = { n: 'r-parada', p: { id: p.id } }; render();
};
ACC['ruta-salir'] = d => {
  const v = yo(); const p = parada(Number(d.id));
  p.estado = 'HECHA'; p.salida = minAhora();
  const sig = siguienteParada(v.id);
  guardar(); toast(sig ? `Sales hacia ${municipio(sig.municipio_id).nombre}.` : 'Ruta terminada. ¡Buen trabajo!');
  pestana('r-ruta');
};

/* Retraso */
HOJAS.retraso = () => {
  const ruta = rutaHoy(S.uid).filter(p => ['EN_CAMINO', 'PREVISTA'].includes(p.estado));
  return `<h2 class="titulo-m">¿Cuánto retraso llevas?</h2>
  <form data-form="retraso" novalidate style="display:grid;gap:14px">
    ${grupoCampo('minutos', 'Elige uno', chipsElegir('minutos', [['5', '+5'], ['10', '+10'], ['15', '+15'], ['30', '+30']], '10'))}
    ${campo({ n: 'otro', l: 'U otro número de minutos', tipo: 'number', modo: 'numeric', ph: 'Por ejemplo: 20', extra: 'min="1" max="180"' })}
    <div class="tarjeta" style="gap:8px"><span class="eti">Nuevas horas</span><div data-vivo="retraso" style="display:grid;gap:6px">${filasRetraso(ruta, 10)}</div></div>
    ${campo({ n: 'motivo', l: 'Motivo (opcional)', ph: 'Por ejemplo: obras en la carretera', max: 100 })}
    <button class="boton" type="submit">Avisar del retraso</button>
    <button type="button" class="boton sec" data-a="cerrar-hoja">Cancelar</button>
  </form>`;
};
function filasRetraso(ruta, min) {
  return ruta.map(p => `<div class="fila" style="justify-content:space-between"><span>${esc(municipio(p.municipio_id).nombre)}</span><span class="num"><s class="texto-t">${hm(p.estimada)}</s> → <b>${hm(p.estimada + min)}</b></span></div>`).join('');
}
function minutosRetraso(vals) { return vals.otro && /^\d+$/.test(vals.otro.trim()) ? Number(vals.otro) : Number(vals.minutos || 0); }
VIVO.retraso = f => {
  const vals = leerForm(f); const min = minutosRetraso(vals);
  if (vals.otro) f.querySelectorAll('[data-campo="minutos"] .chip').forEach(c => c.classList.remove('on'));
  const caja = f.querySelector('[data-vivo="retraso"]');
  if (caja && min > 0 && min <= 180) caja.innerHTML = filasRetraso(rutaHoy(S.uid).filter(p => ['EN_CAMINO', 'PREVISTA'].includes(p.estado)), min);
};
REGLAS.retraso = {
  otro: v => !v.trim() ? undefined : reglaMinutos(v, 1, 180),
  motivo: v => V.texto(v, { max: 100, opcional: true }),
};
ENVIOS.retraso = vals => {
  const v = yo(); const min = minutosRetraso(vals);
  if (!min) return { minutos: 'Elige cuántos minutos de retraso llevas.' };
  const resto = rutaHoy(v.id).filter(p => ['EN_CAMINO', 'PREVISTA'].includes(p.estado));
  let n = 0;
  resto.forEach(p => {
    p.estimada += min;
    n += notificar(destinatarios(suscritosEn(v.id, p.municipio_id)), 'timer', `${v.nombre_comercial} lleva ${min} min de retraso`, `Llega a ${municipio(p.municipio_id).nombre} hacia las ${hm(p.estimada)}.${vals.motivo.trim() ? ` Motivo: ${vals.motivo.trim()}.` : ''}`);
  });
  guardar(); S.hoja = null; toast(`Retraso de ${min} min avisado a ${plural(n, 'persona')}.`); render();
};

/* Cancelar la ruta */
HOJAS['cancelar-ruta'] = () => `<h2 class="titulo-m">¿No puedes seguir hoy?</h2>
  <p class="texto-t">Avisaremos a los vecinos de los pueblos que faltan para que no te esperen.</p>
  <form data-form="cancelar-ruta" novalidate style="display:grid;gap:14px">
    <div class="chips" data-grupo>${['Se me ha averiado la furgoneta', 'Estoy enfermo', 'La carretera está cortada'].map(t => `<button type="button" class="chip" data-a="motivo-rapido" data-texto="${t}">${t}</button>`).join('')}</div>
    ${campo({ n: 'motivo', l: 'Motivo', tipo: 'textarea', max: 150, ph: 'Escribe el motivo' })}
    <button class="boton peligro" type="submit">Cancelar el resto de la ruta</button>
    <button type="button" class="boton sec" data-a="cerrar-hoja">No, volver</button>
  </form>`;
ACC['motivo-rapido'] = (d, el) => { const f = el.closest('form'); const t = f.querySelector('textarea[name="motivo"]'); t.value = d.texto; t.dispatchEvent(new Event('input', { bubbles: true })); t.focus(); };
REGLAS['cancelar-ruta'] = { motivo: v => V.texto(v, { min: 5, max: 150, que: 'el motivo para que los vecinos lo sepan' }) };
ENVIOS['cancelar-ruta'] = vals => {
  const v = yo(); v.motivo_cancelacion = vals.motivo.trim();
  let n = 0;
  rutaHoy(v.id).filter(p => ['EN_CAMINO', 'PREVISTA'].includes(p.estado)).forEach(p => {
    p.estado = 'CANCELADA';
    const ids = destinatarios([...new Set([...suscritosEn(v.id, p.municipio_id), ...encargosParada(p.id).map(e => e.vecino_id)])]);
    n += notificar(ids, 'circle-x', `Hoy no viene ${v.nombre_comercial}`, `${vals.motivo.trim()}. Perdonad las molestias.`);
  });
  guardar(); S.hoja = null; toast(`Ruta cancelada. Avisadas ${plural(n, 'persona')}.`); render();
};

/* ---------------------------------------------------------------- En una parada */
function botonesEncargo(e) {
  const b = (accion, txt, clase = '', icono = '') => `<button class="boton mini ${clase}" style="width:100%" data-a="${accion}" data-id="${e.id}">${icono ? ic(icono, 's') : ''}${txt}</button>`;
  if (e.estado === 'PENDIENTE') return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${b('hoja-rechazar', 'Rechazar', 'sec')}${b('enc-aceptar', 'Aceptar')}</div>`;
  const hoyEs = e.fecha === hoy();
  if (e.estado === 'ACEPTADO') return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${b('enc-preparar', 'Preparado', 'sec', 'package')}${hoyEs ? b('enc-entregar', 'Entregado', 'ok', 'check') : b('hoja-rechazar', 'No puedo', 'sec')}</div>`;
  if (e.estado === 'PREPARADO') return hoyEs ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">${b('enc-novino', 'No vino', 'sec')}${b('enc-entregar', 'Entregado', 'ok', 'check')}</div>` : '';
  return '';
}
function tarjetaEncargoVendedor(e, mostrarLugar = false) {
  const vec = usuario(e.vecino_id); const p = parada(e.parada_id);
  const [cl, txt] = ESTADO_ENCARGO[e.estado];
  const creador = e.creado_por !== e.vecino_id ? usuario(e.creado_por) : null;
  const rel = creador && db.familiares.find(f => f.familiar_id === creador.id && f.vecino_id === vec.id);
  return `<div class="tarjeta" style="gap:10px">
    <div class="fila"><span class="avatar ${['', 'verde', 'azul', 'ocre'][vec.id % 4]}">${iniciales(vec)}</span><div class="flex"><div class="t1">${esc(nombreCompleto(vec))}</div><div class="t2">${mostrarLugar ? `${esc(municipio(p.municipio_id).nombre)} · ` : ''}${haceTxt(e.creado)}${vec.telefono ? ` · ${telTxt(vec.telefono)}` : ''}</div></div>${pill(cl, txt)}</div>
    <p style="font-size:16.5px">${esc(resumenLineas(e))}</p>
    ${e.notas ? `<p class="peq texto-t">«${esc(e.notas)}»</p>` : ''}
    ${e.a_domicilio ? `<div class="fila peq" style="align-items:flex-start">${ic('house', 's')}<span>Llevar a casa: <b>${esc(vec.direccion || '')}</b>${vec.necesita_ayuda_entrega ? ' · necesita ayuda' : ''}${vec.notas_entrega ? `. ${esc(vec.notas_entrega)}` : ''}</span></div>` : ''}
    ${creador ? `<div class="fila peq">${ic('hand-heart', 's')}<span>Lo encargó ${esc(creador.nombre)}${rel ? ` (${esc(rel.parentesco.toLowerCase())})` : ''}</span></div>` : ''}
    ${e.estado === 'RECHAZADO' && e.motivo ? `<p class="peq texto-t">Motivo: «${esc(e.motivo)}»</p>` : ''}
    <div class="fila" style="justify-content:space-between"><b class="num" style="font-size:19px">${euros(importe(e))}</b></div>
    ${botonesEncargo(e)}
  </div>`;
}
VISTAS['r-parada'] = ({ id }) => {
  const p = parada(id); const v = yo();
  const es = encargosParada(p.id);
  const sig = rutaHoy(v.id).filter(x => ['EN_CAMINO', 'PREVISTA'].includes(x.estado) && x.orden > p.orden)[0];
  const extra = p.estado === 'EN_PARADA' ? pill('ok', `Llegaste ${hm(p.llegada)}`) : pill(ESTADO_PARADA[p.estado][0], ESTADO_PARADA[p.estado][1]);
  return `${cab(`En ${esc(municipio(p.municipio_id).nombre)}`, { extra })}
    ${cuerpo(`<span class="eti">Encargos de esta parada · ${es.length}</span>
      ${es.length ? es.map(e => tarjetaEncargoVendedor(e)).join('') : vacio('shopping-basket', 'No hay encargos para esta parada')}`, 'gap:12px')}
    ${p.estado === 'EN_PARADA' ? pie(`<button class="boton osc" data-a="ruta-salir" data-id="${p.id}">${sig ? `Salir hacia ${esc(municipio(sig.municipio_id).nombre)}` : 'Terminar la ruta'} ${ic('arrow-right', 's')}</button>`) : ''}`;
};

/* Acciones sobre encargos */
function avisarEncargo(e, icono, titulo, texto) {
  const ids = destinatarios([e.vecino_id]);
  if (!ids.includes(e.creado_por) && usuario(e.creado_por).password) ids.push(e.creado_por);
  return notificar(ids, icono, titulo, texto);
}
ACC['enc-aceptar'] = d => {
  const e = encargo(Number(d.id)); const v = yo();
  e.estado = 'ACEPTADO'; e.aceptado = ahoraMs();
  avisarEncargo(e, 'check', `${v.nombre_comercial} ha aceptado el encargo`, `${diaCorto(e.fecha)}: ${resumenLineas(e)}`);
  guardar(); toast(`Encargo de ${usuario(e.vecino_id).nombre} aceptado. Le hemos avisado.`); render();
};
ACC['enc-preparar'] = d => {
  const e = encargo(Number(d.id)); const v = yo();
  e.estado = 'PREPARADO'; e.preparado = ahoraMs();
  avisarEncargo(e, 'package', 'Tu encargo está preparado', `${v.nombre_comercial}: ${resumenLineas(e)}`);
  guardar(); toast('Marcado como preparado.'); render();
};
ACC['enc-entregar'] = d => { const e = encargo(Number(d.id)); e.estado = 'ENTREGADO'; e.entregado = ahoraMs(); e.preparado = e.preparado || ahoraMs(); guardar(); toast('Entregado.'); render(); };
ACC['enc-novino'] = d => { const e = encargo(Number(d.id)); e.estado = 'NO_RECOGIDO'; guardar(); toast('Marcado como no recogido.'); render(); };
ACC['hoja-rechazar'] = d => abrirHoja('rechazar', { id: Number(d.id) });
HOJAS.rechazar = ({ id }) => {
  const e = encargo(id);
  return `<h2 class="titulo-m">Rechazar el encargo de ${esc(usuario(e.vecino_id).nombre)}</h2>
  <p class="texto-t">Dile por qué, así puede buscar otra solución.</p>
  <form data-form="rechazar" novalidate style="display:grid;gap:14px">${oculto('id', id)}
    <div class="chips">${['No me queda', 'Ese día no paso por allí', 'No puedo llevarlo a casa'].map(t => `<button type="button" class="chip" data-a="motivo-rapido" data-texto="${t}">${t}</button>`).join('')}</div>
    ${campo({ n: 'motivo', l: 'Motivo', tipo: 'textarea', max: 150, ph: 'Escribe el motivo' })}
    <button class="boton peligro" type="submit">Rechazar el encargo</button>
    <button type="button" class="boton sec" data-a="cerrar-hoja">No, volver</button>
  </form>`;
};
REGLAS.rechazar = { motivo: v => V.texto(v, { min: 5, max: 150, que: 'el motivo' }) };
ENVIOS.rechazar = vals => {
  const e = encargo(Number(vals.id)); const v = yo();
  e.estado = 'RECHAZADO'; e.motivo = vals.motivo.trim();
  avisarEncargo(e, 'circle-x', `${v.nombre_comercial} no puede servir el encargo`, e.motivo);
  guardar(); S.hoja = null; toast('Encargo rechazado. Le hemos avisado con el motivo.'); render();
};

/* ---------------------------------------------------------------- Encargos */
VISTAS['r-encargos'] = () => {
  const mios = db.encargos.filter(e => parada(e.parada_id).vendedor_id === S.uid);
  const pend = mios.filter(e => e.estado === 'PENDIENTE' && e.fecha >= hoy());
  const acep = mios.filter(e => ['ACEPTADO', 'PREPARADO'].includes(e.estado) && e.fecha >= hoy());
  const hist = mios.filter(e => !pend.includes(e) && !acep.includes(e)).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
  const modo = seg('r-encargos', 'pend');
  const lista = modo === 'pend' ? pend : modo === 'acep' ? acep : hist;
  const grupos = [];
  lista.slice().sort((a, b) => modo === 'hist' ? 0 : a.fecha.localeCompare(b.fecha) || parada(a.parada_id).orden - parada(b.parada_id).orden).forEach(e => {
    const clave = `${e.fecha}|${e.parada_id}`;
    let g = grupos.find(x => x.clave === clave);
    if (!g) { g = { clave, e, items: [] }; grupos.push(g); }
    g.items.push(e);
  });
  return `${cab('Encargos', { volver: false })}
    ${cuerpo(`${segmentos('r-encargos', [['pend', `Nuevos · ${pend.length}`], ['acep', `Aceptados · ${acep.length}`], ['hist', 'Historial']], 'pend')}
      ${grupos.length ? grupos.map(g => { const p = parada(g.e.parada_id); return `<span class="eti">${diaCorto(g.e.fecha)} · ${esc(municipio(p.municipio_id).nombre)} · ${hm(hora(p, g.e.fecha))}</span>${g.items.map(e => tarjetaEncargoVendedor(e)).join('')}`; }).join('')
        : vacio('shopping-basket', modo === 'pend' ? 'No tienes encargos por aceptar' : modo === 'acep' ? 'No hay encargos aceptados pendientes' : 'Todavía no hay historial')}`, 'gap:12px')}
    ${navVendedor('r-encargos')}`;
};

/* ---------------------------------------------------------------- Catálogo */
VISTAS['r-catalogo'] = () => {
  const prods = db.productos.filter(p => p.vendedor_id === S.uid);
  return `${cab('Catálogo', { volver: false })}
    ${cuerpo(`<p class="texto-t peq">Los vecinos solo ven los productos disponibles.</p>
      <div class="tarjeta sin-pad">${prods.map(x => `<div class="producto" style="${x.disponible ? '' : 'opacity:.6'}"><div class="flex"><div class="t1">${esc(x.nombre)}</div><div class="t2 num">${euros(x.precio)} · ${UNIDAD[x.unidad][0]}${x.disponible ? '' : ' · agotado'}</div></div>
        ${interruptor(x.disponible, 'prod-disponible', `data-id="${x.id}"`, `${x.nombre} disponible`)}
        <button class="volver" style="width:40px;height:40px;border-radius:50%;border:1px solid var(--a-linea);background:var(--a-tarjeta);display:grid;place-items:center" data-a="ir" data-v="r-producto" data-id="${x.id}" aria-label="Editar ${esc(x.nombre)}">${ic('pencil', 's')}</button></div>`).join('') || vacio('package', 'Todavía no tienes productos')}</div>`, 'gap:12px')}
    ${pie(`<button class="boton" data-a="ir" data-v="r-producto">${ic('plus', 's')} Añadir un producto</button>`)}
    ${navVendedor('r-catalogo')}`;
};
ACC['prod-disponible'] = d => { const x = producto(Number(d.id)); x.disponible = !x.disponible; guardar(); toast(x.disponible ? `${x.nombre}: disponible.` : `${x.nombre}: agotado.`); render(); };
VISTAS['r-producto'] = ({ id }) => {
  const x = id ? producto(id) : { nombre: '', precio: '', unidad: 'UNIDAD', disponible: true };
  return `${cab(id ? 'Editar producto' : 'Producto nuevo')}
    <form data-form="producto" novalidate style="display:contents">${oculto('id', id || '')}
    ${cuerpo(`${campo({ n: 'nombre', l: 'Nombre', v: x.nombre, ph: 'Por ejemplo: Pan de centeno', max: 60 })}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${campo({ n: 'precio', l: 'Precio (€)', v: x.precio === '' ? '' : String(x.precio.toFixed(2)).replace('.', ','), ph: '2,40', modo: 'decimal', icono: 'euro' })}
        ${campo({ n: 'unidad', l: 'Se vende por', tipo: 'select', v: x.unidad, opciones: Object.entries(UNIDAD).map(([k, [s]]) => [k, cap(s)]) })}
      </div>
      ${grupoCampo('disponible', '', casilla('disponible', 'Disponible para encargar', x.disponible))}
      ${id ? `<button type="button" class="enlace peligro peq" style="justify-self:start" data-a="hoja-confirmar" data-tipo="prod-borrar" data-id="${id}">Borrar este producto</button>` : ''}`, 'gap:16px')}
    ${pie(`<button class="boton" type="submit">Guardar</button>`)}
    </form>`;
};
REGLAS.producto = {
  nombre: (v, t) => V.texto(v, { min: 2, max: 60, que: 'el nombre del producto' }) || (db.productos.some(p => p.vendedor_id === S.uid && p.id !== Number(t.id) && p.nombre.toLowerCase() === v.trim().toLowerCase()) ? 'Ya tienes un producto con ese nombre.' : undefined),
  precio(v) {
    const t = v.trim().replace(/\s|€/g, '');
    if (!t) return 'Escribe el precio.';
    if (!/^\d+([.,]\d+)?$/.test(t)) return 'Escribe el precio solo con números, por ejemplo 2,40.';
    if (!/^\d+([.,]\d{1,2})?$/.test(t)) return 'Pon como mucho 2 decimales (céntimos).';
    const n = Number(t.replace(',', '.'));
    if (n <= 0) return 'El precio tiene que ser mayor que 0.';
    if (n > 999.99) return 'El precio no puede pasar de 999,99 €.';
  },
  unidad: v => v ? undefined : 'Elige cómo se vende.',
};
ENVIOS.producto = vals => {
  const precio = Number(vals.precio.trim().replace(/\s|€/g, '').replace(',', '.'));
  const datos = { nombre: vals.nombre.trim(), precio, unidad: vals.unidad, disponible: !!vals.disponible };
  if (vals.id) Object.assign(producto(Number(vals.id)), datos);
  else db.productos.push({ id: siguienteId('producto'), vendedor_id: S.uid, ...datos });
  guardar(); toast(vals.id ? 'Producto guardado.' : `${datos.nombre} añadido al catálogo.`); volver();
};
ACC['prod-borrar'] = d => { db.productos = db.productos.filter(p => p.id !== Number(d.id)); guardar(); S.hoja = null; toast('Producto borrado.'); volver(); };

/* ---------------------------------------------------------------- Ajustes del vendedor */
VISTAS['r-ajustes'] = () => {
  const v = yo();
  return `${cab('Ajustes', { volver: false })}
    ${cuerpo(`${tarjetaPerfil(v)}
      <span class="eti">Mi negocio</span>
      <form data-form="negocio" novalidate class="tarjeta" style="gap:16px">
        ${campo({ n: 'nombre_comercial', l: 'Nombre del negocio', v: v.nombre_comercial, icono: 'store' })}
        ${campo({ n: 'categoria', l: 'Qué vendes', tipo: 'select', v: v.categoria, opciones: Object.entries(CATEGORIA).map(([k, c]) => [k, c.nombre]) })}
        ${grupoCampo('dias', 'Días de reparto', chipsElegir('dias', ORDEN_LETRAS.split('').map(l => [l, cap(DIAS[LETRA.indexOf(l)]).slice(0, 3)]), v.dias_reparto.split('').join(','), true))}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${campo({ n: 'hora_salida', l: 'Hora de salida', tipo: 'time', v: v.hora_salida, icono: 'clock' })}
          ${campo({ n: 'antelacion', l: 'Horas de antelación', tipo: 'number', v: v.horas_antelacion_encargo, modo: 'numeric', extra: 'min="0" max="72"' })}
        </div>
        ${grupoCampo('acepta', '', casilla('acepta', 'Acepto encargos de los vecinos', v.acepta_encargos))}
        <button class="boton" type="submit">Guardar</button>
      </form>
      ${seccionCuenta(v)}`, 'gap:12px')}
    ${navVendedor('r-ajustes')}`;
};
REGLAS.negocio = {
  nombre_comercial: v => V.texto(v, { min: 3, max: 60, que: 'el nombre del negocio' }),
  categoria: v => v ? undefined : 'Elige qué vendes.',
  dias: v => v ? undefined : 'Elige al menos un día de reparto.',
  hora_salida(v) {
    if (!/^\d{2}:\d{2}$/.test(v)) return 'Escribe la hora de salida, por ejemplo 09:45.';
    const m = aMin(v);
    if (m < 5 * 60 || m > 15 * 60) return 'La hora de salida tiene que ser entre las 5:00 y las 15:00.';
  },
  antelacion: v => {
    const t = String(v).trim();
    if (t === '') return 'Escribe cuántas horas antes hay que encargar (0 si da igual).';
    if (!/^\d+$/.test(t)) return 'Escribe un número entero de horas.';
    if (Number(t) > 72) return 'Como mucho 72 horas (3 días).';
  },
};
ENVIOS.negocio = vals => {
  const v = yo();
  Object.assign(v, { nombre_comercial: vals.nombre_comercial.trim(), categoria: vals.categoria, dias_reparto: ORDEN_LETRAS.split('').filter(l => vals.dias.split(',').includes(l)).join(''),
    hora_salida: vals.hora_salida, horas_antelacion_encargo: Number(vals.antelacion), acepta_encargos: !!vals.acepta });
  guardar(); toast('Datos del negocio guardados. La ruta de hoy no cambia.'); render();
};
