/* =============================================================================
   Claxon · demo · panel web (ayuntamiento y administración) y tablón del bar
   ============================================================================= */
'use strict';

function panelHTML() {
  const u = yo();
  const items = S.rol === 'ADMIN'
    ? [['adm-resumen', 'layout-dashboard', 'Resumen'], ['adm-usuarios', 'users', 'Usuarios'], ['adm-pueblos', 'map-pin', 'Pueblos']]
    : [['a-inicio', 'layout-dashboard', 'Inicio'], ['a-avisos', 'megaphone', 'Avisos'], ['a-consulta', 'stethoscope', 'Consulta médica'], ['a-tablon', 'tv', 'Tablón del bar']];
  const raiz = S.pila[0]?.n || S.vista.n;
  const pueblos = S.rol === 'AYUNTAMIENTO' ? pueblosGestionados() : [];
  const vista = VISTAS[S.vista.n] || VISTAS[INICIO[S.rol]];
  return `<div class="panel">
    <aside class="lateral">
      <div class="marca"><span class="logo">${ic('volume-2')}</span>Claxon</div>
      <nav aria-label="Menú">${items.map(([v, i, t]) => `<button class="${v === raiz ? 'activo' : ''}" data-a="pestana" data-v="${v}" ${v === raiz ? 'aria-current="page"' : ''}>${ic(i, 's')}${t}</button>`).join('')}</nav>
      ${pueblos.length ? `<div class="grupo-eti">Tus pueblos</div><div class="pueblos">${pueblos.map(m => `<button class="${m.id === S.pueblo ? 'activo' : ''}" data-a="pueblo" data-id="${m.id}"><span class="p"></span>${esc(m.nombre)}</button>`).join('')}</div>` : ''}
      <div class="usuario"><span class="avatar">${iniciales(u)}</span><div>${esc(u.nombre)} ${esc(u.apellidos.split(' ')[0])}<small>${S.rol === 'ADMIN' ? 'Administración' : `Ayuntamiento · ${plural(pueblos.length, 'pueblo')}`}</small></div></div>
      <div class="acciones">
        ${u.roles.length > 1 ? `<button data-a="cambiar-perfil">${ic('repeat', 's')} Cambiar de perfil</button>` : ''}
        <button data-a="hoja" data-v="guia">${ic('flask-conical', 's')} Guía de la demo</button>
        <button data-a="cerrar-sesion">${ic('log-out', 's')} Cerrar sesión</button>
      </div>
    </aside>
    <section class="principal-web">${vista(S.vista.p)}</section>
    ${S.hoja ? `<div class="velo" data-a="cerrar-hoja"></div><div class="modal" role="dialog" aria-modal="true">${HOJAS[S.hoja.tipo](S.hoja.p)}</div>` : ''}
    ${S.toast ? toastHTML() : ''}
  </div>`;
}
ACC.pueblo = d => { S.pueblo = Number(d.id); render(); };
function cabWeb(titulo, botones = '') { return `<header class="cab-web"><h1>${titulo}</h1>${botones}</header>`; }
const pueblo = () => municipio(S.pueblo);
function kpi(eti, valor, sub) { return `<div class="kpi"><span class="eti">${eti}</span><b>${valor}</b><span>${sub}</span></div>`; }
function estadoAviso(a) {
  const t = ahoraMs();
  if (a.estado === 'BORRADOR') return ['pend', 'Borrador'];
  if (a.estado === 'ARCHIVADO') return ['', 'Archivado'];
  if (a.desde > t) return ['azul', 'Programado'];
  if (a.hasta != null && a.hasta < t) return ['', 'Caducado'];
  return ['ok', 'Vigente'];
}
const fechaCorta = ts => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

/* ---------------------------------------------------------------- AYUNTAMIENTO · Inicio */
VISTAS['a-inicio'] = () => {
  const m = pueblo();
  const vecinos = vecinosDe(m.id);
  const avisos = avisosPara(m.id);
  const servicios = db.paradas.filter(p => p.municipio_id === m.id && p.fecha === hoy()).sort((a, b) => a.estimada - b.estimada);
  const encargos = db.encargos.filter(e => parada(e.parada_id).municipio_id === m.id && e.fecha === hoy() && !['CANCELADO', 'RECHAZADO'].includes(e.estado));
  const propios = db.avisos.filter(a => a.municipio_id === m.id || (a.municipio_id == null && a.autor_id === S.uid)).sort((a, b) => b.creado - a.creado).slice(0, 5);
  return `${cabWeb(`${esc(m.nombre)}`, `<button class="boton sec mini" data-a="pestana" data-v="a-consulta">${ic('stethoscope', 's')} Cambiar consulta</button><button class="boton mini" data-a="nuevo-aviso">${ic('plus', 's')} Nuevo aviso</button>`)}
    <div class="contenido-web">
      <p class="texto-t">${etiHoy()} · ${esc(m.comarca)}</p>
      <div class="kpis">
        ${kpi('Vecinos', vecinos.length, `${vecinos.filter(v => !v.password).length} sin móvil, con familiar`)}
        ${kpi('Avisos vigentes', avisos.length, 'en la app y el tablón')}
        ${kpi('Servicios hoy', servicios.length, servicios.map(p => CATEGORIA[usuario(p.vendedor_id).categoria].nombre.toLowerCase()).join(', ') || 'ninguno')}
        ${kpi('Encargos hoy', encargos.length, 'de los vecinos del pueblo')}
      </div>
      <div class="columnas-web">
        <div style="display:grid;gap:20px">
          <div class="tarjeta" style="gap:10px"><b class="titulo-m">Hoy pasan</b>
            ${servicios.length ? `<div class="tabla-marco"><table class="tabla"><thead><tr><th>Servicio</th><th>Hora</th><th>Estado</th></tr></thead><tbody>${servicios.map(p => { const v = usuario(p.vendedor_id); const [cl, t] = ESTADO_PARADA[p.estado];
              return `<tr><td><b>${CATEGORIA[v.categoria].nombre}</b><span class="t2">${esc(v.nombre_comercial)} · ${esc(p.punto)}</span></td><td class="num">${p.llegada != null ? `llegó ${hm(p.llegada)}` : hm(p.estimada)}</td><td>${pill(cl, t)}</td></tr>`; }).join('')}</tbody></table></div>` : vacio('calendar', 'Hoy no pasa ningún servicio')}
          </div>
          <div class="tarjeta" style="gap:10px"><div class="fila" style="justify-content:space-between"><b class="titulo-m">Últimos avisos</b><button class="enlace peq" data-a="pestana" data-v="a-avisos">Ver todos</button></div>
            ${propios.length ? `<div class="tabla-marco"><table class="tabla"><tbody>${propios.map(a => { const [cl, t] = estadoAviso(a); return `<tr><td><b>${esc(a.titulo)}</b><span class="t2">${CAT_AVISO[a.categoria].nombre} · ${fechaCorta(a.creado)}</span></td><td style="text-align:right">${pill(cl, t)}</td></tr>`; }).join('')}</tbody></table></div>` : vacio('megaphone', 'Todavía no hay avisos')}
          </div>
        </div>
        <div style="display:grid;gap:20px">
          <div class="tarjeta" style="gap:10px"><b class="titulo-m">Consulta médica hoy</b>
            ${consultasDia(m.id, hoy()).map(c => `<div class="fila" style="align-items:flex-start"><span class="circulo ${c.cambio ? '' : 'azul'}">${ic('stethoscope')}</span><div class="flex"><div class="t1" style="font-size:16px">${TIPO_CONSULTA[c.tipo]} · ${c.cancelada ? 'cancelada' : `${hmCorto(aMin(c.inicio))} a ${hmCorto(aMin(c.fin))}`}</div><div class="t2">${esc(c.lugar)}${c.cambio ? ' · cambio de hoy' : ''}</div></div></div>`).join('') || '<p class="texto-t peq">Hoy no hay consulta.</p>'}
          </div>
          <div class="tarjeta crema" style="gap:8px"><div class="fila">${ic('tv')}<b style="flex:1">Tablón del bar</b></div>
            <p class="peq">${m.tablon_ubicacion ? `Está en <b>${esc(m.tablon_ubicacion)}</b> y enseña los servicios de hoy, la consulta y los avisos.` : 'Este pueblo todavía no tiene tablón.'}</p>
            <button class="boton sec mini" data-a="pestana" data-v="a-tablon">${m.tablon_ubicacion ? 'Ver el tablón' : 'Configurar el tablón'}</button></div>
        </div>
      </div>
    </div>`;
};

/* ---------------------------------------------------------------- AYUNTAMIENTO · Avisos */
VISTAS['a-avisos'] = () => {
  const mios = pueblosGestionados().map(m => m.id);
  const todos = seg('a-avisos', 'pueblo') === 'todos';
  const lista = db.avisos.filter(a => todos ? (a.municipio_id == null ? a.autor_id === S.uid : mios.includes(a.municipio_id)) : a.municipio_id === S.pueblo || (a.municipio_id == null && a.autor_id === S.uid))
    .sort((a, b) => b.creado - a.creado);
  return `${cabWeb('Avisos', `<button class="boton mini" data-a="nuevo-aviso">${ic('plus', 's')} Nuevo aviso</button>`)}
    <div class="contenido-web">
      <div style="max-width:420px">${segmentos('a-avisos', [['pueblo', esc(pueblo().nombre)], ['todos', 'Todos mis pueblos']], 'pueblo')}</div>
      <div class="tarjeta">${lista.length ? `<div class="tabla-marco"><table class="tabla"><thead><tr><th>Aviso</th><th>Pueblo</th><th>Prioridad</th><th>Estado</th><th>Hasta</th><th></th></tr></thead><tbody>
        ${lista.map(a => { const [cl, t] = estadoAviso(a); return `<tr><td style="min-width:220px"><b>${esc(a.titulo)}</b><span class="t2">${CAT_AVISO[a.categoria].nombre}${a.push ? ' · con notificación' : ''}</span></td>
          <td>${a.municipio_id ? esc(municipio(a.municipio_id).nombre) : 'Todos'}</td><td>${a.prioridad === 'NORMAL' ? '<span class="texto-t">Normal</span>' : pill(a.prioridad === 'URGENTE' ? 'error' : 'pend', cap(a.prioridad.toLowerCase()))}</td>
          <td>${pill(cl, t)}</td><td class="num">${a.hasta ? fechaCorta(a.hasta) : '—'}</td>
          <td><div class="acciones-fila">${a.estado === 'BORRADOR' ? `<button class="boton mini" data-a="aviso-publicar" data-id="${a.id}">Publicar</button>` : ''}${a.estado === 'PUBLICADO' ? `<button class="boton mini sec" data-a="hoja-confirmar" data-tipo="aviso-archivar" data-id="${a.id}">Archivar</button>` : ''}</div></td></tr>`; }).join('')}
        </tbody></table></div>` : vacio('megaphone', 'No hay avisos')}</div>
    </div>`;
};
ACC['aviso-publicar'] = d => {
  const a = aviso(Number(d.id));
  a.estado = 'PUBLICADO'; if (a.desde < ahoraMs()) a.desde = ahoraMs();
  let n = 0;
  if (a.push && a.desde <= ahoraMs()) n = notificar(destinatarios(vecinosDe(a.municipio_id).map(v => v.id)), CAT_AVISO[a.categoria].icono, a.titulo, a.texto);
  guardar(); toast(`Aviso publicado${n ? `. Avisadas ${plural(n, 'persona')}` : ''}.`); render();
};
ACC['aviso-archivar'] = d => { aviso(Number(d.id)).estado = 'ARCHIVADO'; guardar(); S.hoja = null; toast('Aviso archivado.'); render(); };
ACC['nuevo-aviso'] = () => { S.pila = [{ n: 'a-avisos', p: {} }]; S.vista = { n: 'a-aviso-nuevo', p: {} }; render(); };

VISTAS['a-aviso-nuevo'] = () => {
  const hoyI = hoy();
  return `${cabWeb('Nuevo aviso', `<button class="boton sec mini" data-a="volver">${ic('arrow-left', 's')} Volver</button>`)}
    <div class="contenido-web"><div class="columnas-web">
      <form data-form="aviso" novalidate class="tarjeta form-web" style="padding:22px">
        <div class="aviso-form" data-error-general hidden>${ic('circle-alert', 's')}<span></span></div>
        ${campo({ n: 'titulo', l: 'Título', ph: 'Por ejemplo: Corte de agua el miércoles', max: 80 })}
        ${campo({ n: 'texto', l: 'Texto del aviso', tipo: 'textarea', ph: 'Explica qué pasa, cuándo y qué tienen que hacer los vecinos.', max: 500 })}
        <div class="dos">
          ${campo({ n: 'categoria', l: 'Tipo', tipo: 'select', opciones: [['', 'Elige…'], ...Object.entries(CAT_AVISO).map(([k, c]) => [k, c.nombre])] })}
          ${grupoCampo('prioridad', 'Prioridad', chipsElegir('prioridad', [['NORMAL', 'Normal'], ['IMPORTANTE', 'Importante'], ['URGENTE', 'Urgente']], 'NORMAL'))}
        </div>
        ${grupoCampo('pueblos', 'Pueblos', chipsElegir('pueblos', pueblosGestionados().map(m => [String(m.id), esc(m.nombre)]), String(S.pueblo), true), 'Se guarda un aviso por pueblo.')}
        <div class="dos">
          ${campo({ n: 'desde', l: 'Visible desde', tipo: 'date', v: hoyI, extra: `min="${hoyI}"` })}
          ${campo({ n: 'hasta', l: 'Visible hasta (opcional)', tipo: 'date', v: sumaDias(hoyI, 7), extra: `min="${hoyI}"` })}
        </div>
        ${grupoCampo('push', '', casilla('push', 'Mandar también una notificación al móvil de los vecinos', true))}
        <div class="botones"><button class="boton sec" type="submit" name="accion" value="borrador">Guardar borrador</button><button class="boton" type="submit" name="accion" value="publicar">${ic('send', 's')} Publicar</button></div>
      </form>
      <div style="display:grid;gap:12px;position:sticky;top:12px"><span class="eti">Así lo verán los vecinos</span><div class="vista-movil" data-vivo="aviso">${previaAviso({})}</div>
        <p class="peq texto-t">Aparece en la pestaña Avisos de la app y en el tablón del bar del pueblo.</p></div>
    </div></div>`;
};
function previaAviso(vals) {
  const cat = CAT_AVISO[vals.categoria] || CAT_AVISO.GENERAL;
  const pr = vals.prioridad || 'NORMAL';
  return `<div class="tarjeta" style="gap:6px;${pr !== 'NORMAL' ? `border-color:${pr === 'URGENTE' ? 'var(--a-error)' : 'var(--a-aviso)'}` : ''}">
    <div class="fila" style="justify-content:space-between"><span class="eti">${ic(cat.icono, 'xs')} ${cat.nombre}</span>${pr === 'NORMAL' ? '<span class="peq texto-t">Ahora mismo</span>' : pill(pr === 'URGENTE' ? 'error' : 'pend', cap(pr.toLowerCase()))}</div>
    <b style="font:700 19px/1.25 var(--f-display)">${esc(vals.titulo || 'Título del aviso')}</b>
    <p class="peq texto-t">${esc(vals.texto || 'Aquí se verá el texto del aviso.')}</p></div>
    ${vals.push !== '' ? `<div class="push"><span class="logo">${ic('bell', 's')}</span><div><span class="app">Claxon · notificación</span><b>${esc(vals.titulo || 'Título del aviso')}</b><p>${esc((vals.texto || '').slice(0, 80))}</p></div><time>ahora</time></div>` : ''}`;
}
VIVO.aviso = f => { const caja = document.querySelector('[data-vivo="aviso"]'); if (caja) caja.innerHTML = previaAviso(leerForm(f)); };
REGLAS.aviso = {
  titulo: v => V.texto(v, { min: 5, max: 80, que: 'el título' }),
  texto: v => V.texto(v, { min: 10, max: 500, que: 'el texto del aviso' }),
  categoria: v => v ? undefined : 'Elige el tipo de aviso.',
  pueblos: v => v ? undefined : 'Elige al menos un pueblo.',
  desde(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Elige la fecha desde la que se verá.';
    if (v < hoy()) return 'La fecha de inicio no puede ser anterior a hoy.';
    if (v > sumaDias(hoy(), 365)) return 'Como mucho, un año desde hoy.';
  },
  hasta(v, t) {
    if (!v) return undefined;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'La fecha no es válida.';
    if (t.desde && v < t.desde) return 'La fecha de fin tiene que ser igual o posterior a la de inicio.';
    if (t.desde && v > sumaDias(t.desde, 90)) return 'Un aviso puede estar visible como mucho 90 días.';
  },
};
ENVIOS.aviso = vals => {
  const publicar = vals.accion !== 'borrador';
  const ids = vals.pueblos.split(',').filter(Boolean).map(Number);
  const desde = vals.desde === hoy() ? ahoraMs() : tsDe(vals.desde, '00:00');
  const hasta = vals.hasta ? tsDe(vals.hasta, '23:59') : null;
  let n = 0;
  ids.forEach(mid => {
    const a = { id: siguienteId('aviso'), municipio_id: mid, autor_id: S.uid, categoria: vals.categoria, titulo: vals.titulo.trim(), texto: vals.texto.trim(), prioridad: vals.prioridad,
      estado: publicar ? 'PUBLICADO' : 'BORRADOR', push: !!vals.push, desde, hasta, creado: ahoraMs() };
    db.avisos.push(a);
    if (publicar && a.push && desde <= ahoraMs()) n += notificar(destinatarios(vecinosDe(mid).map(v => v.id)), CAT_AVISO[a.categoria].icono, a.titulo, a.texto);
  });
  guardar();
  const nombres = ids.map(id => municipio(id).nombre).join(', ');
  toast(!publicar ? 'Borrador guardado. Publícalo cuando quieras desde la lista.' : desde > ahoraMs() ? `Aviso programado para ${nombres}.` : `Aviso publicado en ${nombres}${n ? `. Avisadas ${plural(n, 'persona')}` : ''}.`);
  pestana('a-avisos');
};

/* ---------------------------------------------------------------- AYUNTAMIENTO · Consulta médica */
VISTAS['a-consulta'] = () => {
  const m = pueblo();
  const habitual = db.consultas.filter(c => c.municipio_id === m.id && c.dia_semana).sort((a, b) => a.dia_semana - b.dia_semana || a.inicio.localeCompare(b.inicio));
  const cambios = db.consultas.filter(c => c.municipio_id === m.id && c.fecha && c.fecha >= hoy()).sort((a, b) => a.fecha.localeCompare(b.fecha));
  const opcionesTipo = Object.entries(TIPO_CONSULTA);
  return `${cabWeb(`Consulta médica · ${esc(m.nombre)}`)}
    <div class="contenido-web">
      <div class="aviso-form info">${ic('shield', 's')}<span>Claxon solo guarda el horario de la consulta. Nunca datos de salud de nadie.</span></div>
      <div class="columnas-web">
        <div style="display:grid;gap:20px">
          <div class="tarjeta" style="gap:10px"><b class="titulo-m">Horario habitual</b>
            ${habitual.length ? `<div class="tabla-marco"><table class="tabla"><thead><tr><th>Día</th><th>Tipo</th><th>Horas</th><th>Lugar</th><th></th></tr></thead><tbody>${habitual.map(c => `<tr><td><b>${cap(DIAS[c.dia_semana % 7])}</b></td><td>${TIPO_CONSULTA[c.tipo]}</td><td class="num">${c.inicio}–${c.fin}</td><td>${esc(c.lugar)}</td><td><div class="acciones-fila"><button class="boton mini sec" data-a="consulta-quitar" data-id="${c.id}">Quitar</button></div></td></tr>`).join('')}</tbody></table></div>` : vacio('stethoscope', 'No hay horario')}
          </div>
          <form data-form="consulta-habitual" novalidate class="tarjeta form-web" style="padding:20px"><b class="titulo-m">Añadir al horario</b>
            <div class="dos">${campo({ n: 'dia', l: 'Día', tipo: 'select', opciones: [['', 'Elige…'], ...[1, 2, 3, 4, 5, 6, 7].map(d => [d, cap(DIAS[d % 7])])] })}${campo({ n: 'tipo', l: 'Tipo', tipo: 'select', v: 'MEDICINA', opciones: opcionesTipo })}</div>
            <div class="dos">${campo({ n: 'inicio', l: 'Empieza', tipo: 'time', v: '09:30' })}${campo({ n: 'fin', l: 'Termina', tipo: 'time', v: '10:30' })}</div>
            ${campo({ n: 'lugar', l: 'Lugar', v: 'Consultorio local', max: 120 })}
            <div class="botones"><button class="boton" type="submit">Añadir</button></div>
          </form>
        </div>
        <div style="display:grid;gap:20px">
          <div class="tarjeta" style="gap:10px"><b class="titulo-m">Cambios de un día</b>
            ${cambios.length ? cambios.map(c => `<div class="fila" style="align-items:flex-start"><span class="circulo">${ic('calendar-days')}</span><div class="flex"><div class="t1" style="font-size:16px">${etiquetaDia(c.fecha)}</div><div class="t2">${TIPO_CONSULTA[c.tipo]} · ${c.cancelada ? 'cancelada' : `${esc(c.lugar)}, ${c.inicio}–${c.fin}`}${c.motivo ? ` · ${esc(c.motivo)}` : ''}</div></div><button class="boton mini sec" data-a="consulta-quitar" data-id="${c.id}">Deshacer</button></div>`).join('') : '<p class="texto-t peq">No hay cambios previstos.</p>'}
          </div>
          <form data-form="consulta-cambio" novalidate class="tarjeta form-web" style="padding:20px"><b class="titulo-m">Cambiar un día</b>
            <div class="dos">${campo({ n: 'fecha', l: 'Fecha', tipo: 'date', v: hoy(), extra: `min="${hoy()}"` })}${campo({ n: 'tipo', l: 'Consulta', tipo: 'select', v: 'MEDICINA', opciones: opcionesTipo })}</div>
            ${grupoCampo('que', '¿Qué cambia?', radiosElegir('que', [['cancelar', 'No hay consulta ese día'], ['mover', 'Cambia el lugar o la hora']], 'cancelar'))}
            <div class="dos">${campo({ n: 'inicio', l: 'Empieza', tipo: 'time', v: '09:30' })}${campo({ n: 'fin', l: 'Termina', tipo: 'time', v: '10:30' })}</div>
            ${campo({ n: 'lugar', l: 'Lugar', v: 'Centro de Salud de Utrillas', max: 120 })}
            ${campo({ n: 'motivo', l: 'Motivo para los vecinos', ph: 'Por ejemplo: la médica está de formación', max: 200, ayuda: 'Un motivo general. No pongas datos de salud.' })}
            ${grupoCampo('avisar', '', casilla('avisar', 'Publicar también un aviso y mandar notificación', true))}
            <div class="botones"><button class="boton" type="submit">Guardar el cambio</button></div>
          </form>
        </div>
      </div>
    </div>`;
};
ACC['consulta-quitar'] = d => { db.consultas = db.consultas.filter(c => c.id !== Number(d.id)); guardar(); toast('Quitado del horario.'); render(); };
const reglaHora = v => /^\d{2}:\d{2}$/.test(v) ? undefined : 'Escribe la hora, por ejemplo 09:30.';
REGLAS['consulta-habitual'] = {
  dia: v => v ? undefined : 'Elige el día.',
  inicio: reglaHora,
  fin: (v, t) => reglaHora(v) || (t.inicio && v <= t.inicio ? 'La hora de fin tiene que ser posterior a la de inicio.' : undefined),
  lugar: v => V.texto(v, { min: 3, max: 120, que: 'el lugar' }),
};
ENVIOS['consulta-habitual'] = vals => {
  const dia = Number(vals.dia);
  if (db.consultas.some(c => c.municipio_id === S.pueblo && c.dia_semana === dia && c.tipo === vals.tipo)) return { dia: `Ya hay consulta de ${TIPO_CONSULTA[vals.tipo].toLowerCase()} los ${DIAS_PL[dia % 7]}. Quítala antes de añadir otra.` };
  db.consultas.push({ id: siguienteId('consulta'), municipio_id: S.pueblo, tipo: vals.tipo, dia_semana: dia, fecha: null, inicio: vals.inicio, fin: vals.fin, lugar: vals.lugar.trim(), cancelada: false, motivo: null });
  guardar(); toast('Añadido al horario.'); render();
};
REGLAS['consulta-cambio'] = {
  fecha(v) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return 'Elige la fecha.';
    if (v < hoy()) return 'No se pueden cambiar días que ya han pasado.';
    if (v > sumaDias(hoy(), 60)) return 'Como mucho, 60 días desde hoy.';
  },
  inicio: (v, t) => t.que === 'mover' ? reglaHora(v) : undefined,
  fin: (v, t) => t.que === 'mover' ? (reglaHora(v) || (v <= t.inicio ? 'La hora de fin tiene que ser posterior a la de inicio.' : undefined)) : undefined,
  lugar: (v, t) => t.que === 'mover' ? V.texto(v, { min: 3, max: 120, que: 'el lugar' }) : undefined,
  motivo: (v, t) => V.texto(v, { min: 5, max: 200, que: 'el motivo, para que los vecinos sepan qué pasa', opcional: t.que !== 'cancelar' }),
};
ENVIOS['consulta-cambio'] = vals => {
  const habitual = db.consultas.find(c => c.municipio_id === S.pueblo && c.dia_semana === diaIso(vals.fecha) && c.tipo === vals.tipo);
  if (vals.que === 'cancelar' && !habitual) return { fecha: `Ese día (${DIAS[deIso(vals.fecha).getDay()]}) no hay consulta de ${TIPO_CONSULTA[vals.tipo].toLowerCase()} que cancelar.` };
  if (db.consultas.some(c => c.municipio_id === S.pueblo && c.fecha === vals.fecha && c.tipo === vals.tipo)) return { fecha: 'Ya hay un cambio guardado para ese día. Deshazlo antes de poner otro.' };
  const c = { id: siguienteId('consulta'), municipio_id: S.pueblo, tipo: vals.tipo, dia_semana: null, fecha: vals.fecha,
    inicio: vals.que === 'cancelar' ? habitual.inicio : vals.inicio, fin: vals.que === 'cancelar' ? habitual.fin : vals.fin,
    lugar: vals.que === 'cancelar' ? habitual.lugar : vals.lugar.trim(), cancelada: vals.que === 'cancelar', motivo: vals.motivo.trim() || null };
  db.consultas.push(c);
  let n = 0;
  if (vals.avisar) {
    const tipo = TIPO_CONSULTA[c.tipo].toLowerCase();
    const titulo = c.cancelada ? `${cap(etiquetaDia(c.fecha).split(',')[0])} no hay consulta de ${tipo}` : `Cambio en la consulta de ${tipo}`;
    const texto = c.cancelada ? `${etiquetaDia(c.fecha, true)} no habrá consulta de ${tipo} en ${pueblo().nombre}. ${c.motivo || ''}`.trim()
      : `${etiquetaDia(c.fecha, true)} la consulta de ${tipo} será en ${c.lugar}, de ${hmCorto(aMin(c.inicio))} a ${hmCorto(aMin(c.fin))}. ${c.motivo || ''}`.trim();
    db.avisos.push({ id: siguienteId('aviso'), municipio_id: S.pueblo, autor_id: S.uid, categoria: 'SANIDAD', titulo, texto, prioridad: 'IMPORTANTE', estado: 'PUBLICADO', push: true, desde: ahoraMs(), hasta: tsDe(c.fecha, '23:59'), creado: ahoraMs() });
    n = notificar(destinatarios(vecinosDe(S.pueblo).map(v => v.id)), 'stethoscope', titulo, texto);
  }
  guardar(); toast(`Cambio guardado${n ? `. Avisadas ${plural(n, 'persona')}` : ''}.`); render();
};

/* ---------------------------------------------------------------- AYUNTAMIENTO · Tablón */
VISTAS['a-tablon'] = () => {
  const m = pueblo();
  if (!m.tablon_ubicacion) {
    return `${cabWeb(`Tablón · ${esc(m.nombre)}`)}
      <div class="contenido-web"><form data-form="tablon" novalidate class="tarjeta form-web" style="padding:22px;max-width:560px">
        <b class="titulo-m">Este pueblo aún no tiene tablón</b>
        <p class="texto-t">El tablón es una página que se deja abierta en la tele del bar o del local social. Enseña los servicios de hoy, la consulta y los avisos.</p>
        ${campo({ n: 'ubicacion', l: '¿Dónde estará la pantalla?', ph: 'Por ejemplo: Bar de la plaza', max: 60 })}
        <div class="botones"><button class="boton" type="submit">Crear el tablón</button></div>
      </form></div>`;
  }
  return `${cabWeb(`Tablón · ${esc(m.nombre)}`, `<button class="boton mini" data-a="abrir-tablon" data-id="${m.id}">${ic('maximize', 's')} Pantalla completa</button>`)}
    <div class="contenido-web">
      <p class="texto-t">Así se ve ahora en <b>${esc(m.tablon_ubicacion)}</b>. Se actualiza solo cada pocos segundos.</p>
      <div class="tablon-marco"><div class="tablon-escala">${tablonHTML(m.id)}</div></div>
      <div class="tarjeta crema" style="gap:6px"><div class="fila peq">${ic('link', 's')}<span>Enlace secreto del tablón: <span class="mono">claxon.app/t/${esc(m.nombre.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, ''))}-••••••</span></span></div>
        <p class="peq texto-t">En la base de datos solo se guarda cifrado (municipio.tablon_token_hash).</p></div>
    </div>`;
};
REGLAS.tablon = { ubicacion: v => V.texto(v, { min: 3, max: 60, que: 'dónde estará la pantalla' }) };
ENVIOS.tablon = vals => { pueblo().tablon_ubicacion = vals.ubicacion.trim(); guardar(); toast('Tablón creado.'); render(); };

/* ---------------------------------------------------------------- Tablón del bar (tele) */
function tablonHTML(mid) {
  const m = municipio(mid);
  const servicios = db.paradas.filter(p => p.municipio_id === mid && p.fecha === hoy() && p.estado !== 'HECHA').sort((a, b) => a.estimada - b.estimada).slice(0, 3);
  const consultas = consultasDia(mid, hoy());
  const avisos = avisosPara(mid).filter(a => a.categoria !== 'SANIDAD' || !consultas.some(c => c.cambio)).slice(0, consultas.length ? 2 : 3);
  const d = deIso(hoy());
  return `<div class="tablon">
    <div class="cabt"><div><div class="sub">Hoy en</div><h1>${esc(m.nombre)}</h1></div><div class="reloj"><b class="reloj-txt">${hm(minAhora())}</b><span>${cap(DIAS[d.getDay()])} ${d.getDate()} de ${MESES[d.getMonth()]}</span></div></div>
    <div class="cuerpot">
      <div style="min-width:0"><div class="eti" style="font-size:16px;margin-bottom:4px">Hoy pasan</div>
        ${servicios.length ? servicios.map(p => { const v = usuario(p.vendedor_id); const c = CATEGORIA[v.categoria];
          const estado = p.estado === 'EN_PARADA' ? '¡Ya está aquí!' : p.estado === 'EN_CAMINO' ? 'En camino' : p.estado === 'CANCELADA' ? 'Hoy no viene' : 'Previsto';
          return `<div class="servicio-tv"><span class="circulo ${c.circulo}">${ic(c.icono)}</span><div><b>${c.nombre}</b><span>${esc(v.nombre_comercial)} · ${esc(p.punto)}</span></div>
            <div class="hora">${p.estado === 'EN_PARADA' ? hm(p.llegada) : p.estado === 'CANCELADA' ? '—' : hm(p.estimada)}<small style="${p.estado === 'EN_PARADA' ? 'color:var(--a-ok)' : p.estado === 'CANCELADA' ? 'color:var(--a-error)' : ''}">${estado}</small></div></div>`; }).join('')
          : `<p style="font-size:26px;color:var(--a-tenue);padding:30px 0">Hoy ya no pasa ningún servicio.</p>`}
      </div>
      <div style="display:grid;gap:16px;align-content:start;min-width:0">
        ${consultas.map(c => `<div class="aviso-tv" style="background:${c.cambio ? 'var(--a-tinta);color:#fff' : 'var(--a-azul-suave);color:#1F4E73'}"><span class="eti" style="color:inherit;opacity:.8">${ic('stethoscope', 'xs')} Consulta de ${TIPO_CONSULTA[c.tipo].toLowerCase()}</span>
          <b>${c.cancelada ? 'Hoy no hay consulta' : c.cambio ? `Hoy en ${esc(c.lugar)}` : `Hoy de ${hmCorto(aMin(c.inicio))} a ${hmCorto(aMin(c.fin))}`}</b><p>${c.cancelada ? esc(c.motivo || '') : c.cambio ? `De ${hmCorto(aMin(c.inicio))} a ${hmCorto(aMin(c.fin))}` : esc(c.lugar)}</p></div>`).join('')}
        ${avisos.map(a => `<div class="aviso-tv" style="background:${a.prioridad === 'NORMAL' ? 'var(--a-crema)' : a.prioridad === 'URGENTE' ? 'var(--a-error-suave)' : 'var(--a-aviso-suave)'}"><span class="eti">${ic(CAT_AVISO[a.categoria].icono, 'xs')} ${CAT_AVISO[a.categoria].nombre}</span><b>${esc(a.titulo)}</b><p style="display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden">${esc(a.texto)}</p></div>`).join('')}
        ${!consultas.length && !avisos.length ? '<p style="font-size:22px;color:var(--a-tenue)">No hay avisos.</p>' : ''}
      </div>
    </div>
    <div class="pie-t"><span>CLAXON · ${esc((m.tablon_ubicacion || m.nombre).toUpperCase())}</span><span>SE ACTUALIZA SOLO</span></div>
  </div>`;
}
function tablonCompletoHTML() {
  return `<div class="tablon-completo" role="dialog" aria-label="Tablón del bar"><button class="salir" data-a="cerrar-tablon">${ic('x', 's')} Salir</button>
    <div class="tablon-marco"><div class="tablon-escala">${tablonHTML(S.tablon)}</div></div></div>`;
}

/* ---------------------------------------------------------------- ADMINISTRACIÓN */
VISTAS['adm-resumen'] = () => {
  const activos = db.usuarios.filter(u => u.activo);
  const porRol = Object.keys(ROL_NOMBRE).map(r => [r, activos.filter(u => u.roles.includes(r)).length]);
  const encHoy = db.encargos.filter(e => e.fecha === hoy());
  const estados = Object.keys(ESTADO_ENCARGO).map(k => [k, encHoy.filter(e => e.estado === k).length]).filter(([, n]) => n);
  const max = Math.max(...porRol.map(([, n]) => n), 1);
  const nAvisos = db.avisos.filter(avisoVigente).length;
  return `${cabWeb('Resumen del piloto')}
    <div class="contenido-web">
      <p class="texto-t">${etiHoy()} · Comarca de las Cuencas Mineras</p>
      <div class="kpis">
        ${kpi('Usuarios activos', activos.length, `${db.usuarios.length - activos.length} de baja`)}
        ${kpi('Pueblos', db.municipios.length, `${db.municipios.filter(m => m.tablon_ubicacion).length} con tablón`)}
        ${kpi('Encargos hoy', encHoy.length, `${encHoy.filter(e => e.estado === 'ENTREGADO').length} entregados`)}
        ${kpi('Avisos vigentes', nAvisos, 'de los ayuntamientos')}
      </div>
      <div class="columnas-web">
        <div class="tarjeta" style="gap:12px"><b class="titulo-m">Usuarios por perfil</b>
          <p class="peq texto-t">Una persona puede tener varios perfiles con la misma cuenta.</p>
          ${porRol.map(([r, n]) => `<div style="display:grid;grid-template-columns:120px 1fr 32px;gap:10px;align-items:center"><span class="peq">${ROL_NOMBRE[r]}</span><div class="progreso"><div class="barra" style="height:12px;border-radius:6px"><i style="width:${Math.round(100 * n / max)}%"></i></div></div><b class="num" style="text-align:right">${n}</b></div>`).join('')}
        </div>
        <div class="tarjeta" style="gap:10px"><b class="titulo-m">Encargos de hoy</b>
          ${estados.length ? estados.map(([k, n]) => `<div class="fila" style="justify-content:space-between">${pill(ESTADO_ENCARGO[k][0], ESTADO_ENCARGO[k][1])}<b class="num">${n}</b></div>`).join('') : '<p class="texto-t peq">Hoy no hay encargos.</p>'}
        </div>
      </div>
    </div>`;
};
VISTAS['adm-usuarios'] = () => {
  const filtro = seg('adm-usuarios', 'TODOS');
  const lista = db.usuarios.filter(u => filtro === 'TODOS' || (filtro === 'BAJA' ? !u.activo : u.roles.includes(filtro))).sort((a, b) => a.nombre.localeCompare(b.nombre));
  return `${cabWeb('Usuarios')}
    <div class="contenido-web">
      <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center">
        <div class="campo" style="flex:1;min-width:220px"><div class="entrada" style="min-height:46px">${ic('search', 's')}<input id="buscar-usuario" type="search" placeholder="Buscar por nombre, teléfono o correo" data-buscar style="height:44px;font-size:15.5px" aria-label="Buscar usuarios"></div></div>
        <div class="chips">${[['TODOS', 'Todos'], ...Object.entries(ROL_NOMBRE), ['BAJA', 'De baja']].map(([k, t]) => `<button class="chip ${filtro === k ? 'on' : ''}" data-a="segmento" data-clave="adm-usuarios" data-v="${k}">${t}</button>`).join('')}</div>
      </div>
      <div class="tarjeta"><div class="tabla-marco"><table class="tabla"><thead><tr><th>Persona</th><th>Perfiles</th><th>Pueblo</th><th>Estado</th><th>Último acceso</th><th></th></tr></thead><tbody>
        ${lista.map(u => `<tr data-fila-buscar="${esc(`${u.nombre} ${u.apellidos} ${u.telefono || ''} ${u.email || ''} ${u.nombre_comercial || ''}`.toLowerCase())}">
          <td style="min-width:200px"><b>${esc(u.nombre)} ${esc(u.apellidos)}</b><span class="t2">${esc([u.telefono && telTxt(u.telefono), u.email].filter(Boolean).join(' · ') || 'Sin contacto')}${u.email && !u.email_verificado ? ' · correo sin confirmar' : ''}</span></td>
          <td><div class="chips" style="gap:4px">${u.roles.map(r => pill(r === 'VENDEDOR' ? 'azul' : r === 'AYUNTAMIENTO' ? 'camino' : '', ROL_NOMBRE[r])).join('')}</div></td>
          <td>${u.municipio_id ? esc(municipio(u.municipio_id).nombre) : '—'}</td>
          <td>${u.activo ? (u.password ? pill('ok', 'Activo') : pill('', 'Sin móvil')) : pill('error', 'De baja')}${u.fecha_baja ? `<span class="t2">desde ${fechaCorta(u.fecha_baja)}</span>` : ''}</td>
          <td class="num">${u.ultimo_acceso ? haceTxt(u.ultimo_acceso) : '—'}</td>
          <td><div class="acciones-fila">${u.id === S.uid ? '' : u.activo ? `<button class="boton mini sec" data-a="hoja-confirmar" data-tipo="usuario-baja" data-id="${u.id}">Dar de baja</button>` : `<button class="boton mini sec" data-a="usuario-alta" data-id="${u.id}">Reactivar</button>`}</div></td></tr>`).join('')}
      </tbody></table></div><p class="peq texto-t" data-sin-resultados hidden style="padding:12px 0">Nadie coincide con la búsqueda.</p></div>
    </div>`;
};
ACC['usuario-baja'] = d => { const u = usuario(Number(d.id)); u.activo = false; u.fecha_baja = ahoraMs(); guardar(); S.hoja = null; toast(`${u.nombre} ya no puede entrar.`); render(); };
ACC['usuario-alta'] = d => { const u = usuario(Number(d.id)); u.activo = true; u.fecha_baja = null; guardar(); toast(`${u.nombre} puede volver a entrar.`); render(); };
document.addEventListener('input', ev => {
  if (!ev.target.matches('[data-buscar]')) return;
  const q = ev.target.value.trim().toLowerCase();
  let visibles = 0;
  document.querySelectorAll('[data-fila-buscar]').forEach(tr => { const ok = tr.dataset.filaBuscar.includes(q); tr.hidden = !ok; if (ok) visibles++; });
  const vacioEl = document.querySelector('[data-sin-resultados]'); if (vacioEl) vacioEl.hidden = visibles > 0;
});
VISTAS['adm-pueblos'] = () => `${cabWeb('Pueblos')}
  <div class="contenido-web"><div class="tarjeta"><div class="tabla-marco"><table class="tabla"><thead><tr><th>Pueblo</th><th>Gestiona</th><th>Vecinos</th><th>Servicios que pasan</th><th>Tablón</th></tr></thead><tbody>
    ${db.municipios.map(m => { const g = m.gestor_id && usuario(m.gestor_id); const vs = vendedores().filter(v => paradaEn(v.id, m.id));
      return `<tr><td><b>${esc(m.nombre)}</b><span class="t2">${esc(m.comarca)}</span></td><td>${g ? `${esc(g.nombre)} ${esc(g.apellidos.split(' ')[0])}` : '<span class="texto-t">Sin gestor</span>'}</td><td class="num">${vecinosDe(m.id).length}</td>
        <td>${vs.map(v => esc(CATEGORIA[v.categoria].nombre)).join(', ') || '—'}</td><td>${m.tablon_ubicacion ? esc(m.tablon_ubicacion) : '<span class="texto-t">No</span>'}</td></tr>`; }).join('')}
  </tbody></table></div></div></div>`;

/* ---------------------------------------------------------------- arranque */
function arrancar() {
  db = cargarDatos(); guardar();
  S = estadoInicial();
  cargarSesion();
  engancharEventos();
  // El tablón en pantalla completa se refresca solo
  setInterval(() => { if (S.tablon) render(); }, 20000);
  render();
}
arrancar();
