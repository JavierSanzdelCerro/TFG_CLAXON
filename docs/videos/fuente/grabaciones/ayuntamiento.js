// Ana, secretaria de tres ayuntamientos, usando el panel web desde el ordenador (lunes, 8:00).
window.guion = M => {
  const Q = (c, s, i = 0) => () => M.q(c, s, i);
  const T = (c, txt, sel) => () => M.qt(c, txt, sel);
  const check = '<svg class="i" aria-hidden="true"><use href="#i-circle-check"/></svg>';
  const ph = texto => `<span class="ph">${texto}</span>`;

  // ------------------------------------------------ estado inicial (antes del cambio de consulta)
  // Inicio: la consulta aún está prevista en el pueblo
  const filaConsulta = M.q('29', '.tabla tbody tr', 2);
  filaConsulta.children[1].innerHTML = 'Consultorio local<span class="t2">Fuenferrada</span>';
  filaConsulta.children[3].innerHTML = '<span class="pill">Prevista</span>';
  M.qt('29', 'Hoy no hay consulta en Fuenferrada', 'tr').style.display = 'none';
  const kpiAvisos = M.qt('29', 'Avisos en vigor', '.kpi');
  kpiAvisos.querySelector('b').textContent = '3'; kpiAvisos.querySelector('span:last-child').textContent = 'Ninguno importante';
  const lunes = M.qt('29', 'Hoy en Utrillas', '.fila');
  lunes.style.background = 'none'; lunes.querySelector('.t2').textContent = 'Consultorio local'; lunes.querySelector('.t2').style.color = '';
  lunes.querySelector('.pill').style.display = 'none';
  // Consulta: formulario sin rellenar
  const bloqueLunes = M.q('31', '.semana .bloque-c', 0);
  bloqueLunes.classList.remove('cambio'); bloqueLunes.innerHTML = '<b>Medicina</b>Local';
  const radios = M.capas['31'].querySelectorAll('.radio');
  radios.forEach(r => r.classList.remove('on'));
  const entradas31 = M.capas['31'].querySelectorAll('.form-web .entrada');
  const lugar = entradas31[0], motivo = entradas31[1];
  lugar.querySelector('span').outerHTML = '<span class="ph" style="flex:1">Elige el lugar</span>';
  motivo.innerHTML = ph('Ej.: vacaciones, formación…');
  const okBox = M.q('31', '[style*="ok-suave"]');
  okBox.style.display = 'none';
  const btnCambio = document.createElement('a');
  btnCambio.className = 'boton mini'; btnCambio.style.justifySelf = 'start'; btnCambio.style.opacity = 0.5;
  btnCambio.textContent = 'Publicar cambio';
  okBox.parentNode.insertBefore(btnCambio, okBox);
  // Nuevo aviso: vacío
  M.q('30', '.cab-web h1').textContent = 'Nuevo aviso';
  M.q('30', '.cab-web .pill').style.display = 'none';
  const ent30 = M.capas['30'].querySelectorAll('.form-web .entrada');
  const titulo = ent30[0], tipo = ent30[1], texto = ent30[2];
  titulo.innerHTML = ph('Título del aviso');
  tipo.querySelector('span').outerHTML = '<span class="ph" style="flex:1">Elige un tipo</span>';
  texto.innerHTML = ph('Escribe el aviso con frases cortas…');
  const segs = M.capas['30'].querySelectorAll('.segmentos span');
  segs.forEach(s => s.classList.remove('on')); segs[0].classList.add('on');
  const casillas = M.capas['30'].querySelectorAll('.casilla i');
  casillas.forEach(c => { c.classList.remove('on'); c.innerHTML = ''; });
  const alcance = M.qt('30', 'A 2 vecinos y 1 familiar', 'div');
  alcance.textContent = 'Elige al menos un pueblo';
  const publicar = M.q('30', '.boton.mini:not(.sec)');
  publicar.style.opacity = 0.5;
  const pushPrev = M.q('30', '.push');
  const prevMovilT = pushPrev.querySelector('b'), prevMovilP = pushPrev.querySelector('p');
  pushPrev.querySelector('time').textContent = 'ahora';
  const tablonPrev = M.qt('30', 'Sanidad · importante', '.eti').parentNode;
  const prevTabEti = tablonPrev.querySelector('.eti'), prevTabT = tablonPrev.querySelector('b'), prevTabP = tablonPrev.querySelector('p');
  const vacioPrev = () => {
    prevMovilT.innerHTML = '<span style="color:#9A9EA8">Título del aviso</span>'; prevMovilP.textContent = 'El texto del aviso aparecerá aquí.';
    prevTabEti.textContent = 'Aviso'; prevTabT.innerHTML = '<span style="opacity:.5">Título del aviso</span>'; prevTabP.textContent = 'El texto del aviso aparecerá aquí.';
  };
  vacioPrev();
  // Tablón del bar: el aviso nuevo sustituirá al tercero
  const avisoTablon = M.q('34', '.aviso-tv', 2);

  // Lista desplegable sencilla bajo un campo
  const desplegar = (t, capa, campo, opciones) => {
    M.en(t, () => {
      const c = campo().getBoundingClientRect();
      const d = document.createElement('div');
      d.className = 'desplegable'; d.id = `desp-${capa}`;
      Object.assign(d.style, { left: c.left + 'px', top: (c.bottom + 4) + 'px', width: c.width + 'px' });
      d.innerHTML = opciones.map(o => `<span>${o}</span>`).join('');
      M.capas[capa].appendChild(d);
      d.animate([{ opacity: 0, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 160, easing: 'ease-out', fill: 'both' });
    });
  };
  const opcion = (capa, i) => () => document.querySelectorAll(`#desp-${capa} span`)[i];
  const cerrar = (t, capa) => M.en(t, () => document.getElementById(`desp-${capa}`).remove());

  // ------------------------------------------------ 1. Panel de inicio → consulta médica
  M.mostrar(0, '29');
  M.mover(0.5, () => filaConsulta, 0.9);
  M.clic(2.6, Q('29', '.lateral a', 2));
  M.ir(2.75, '29', '31', 'corte');

  // ------------------------------------------------ 2. Registrar que hoy se pasa en Utrillas
  M.clic(4.0, () => bloqueLunes);
  M.estilo(4.05, () => bloqueLunes, { outline: '3px solid var(--a-acento)', outlineOffset: '2px' });
  M.clic(5.2, () => radios[2]);
  M.clase(5.25, () => radios[2], 'on');
  M.clic(6.3, () => lugar);
  desplegar(6.35, '31', () => lugar, ['Consultorio local', 'Centro de Salud de Utrillas', 'Consultorio de Martín del Río']);
  M.mover(6.7, opcion('31', 1), 0.4);
  M.clase(7.0, opcion('31', 1), 'sobre');
  M.clic(7.5, opcion('31', 1), 0.3);
  M.en(7.55, () => { lugar.querySelector('span').outerHTML = '<span style="flex:1">Centro de Salud de Utrillas</span>'; });
  cerrar(7.55, '31');
  M.clic(8.5, () => motivo);
  M.clase(8.55, () => motivo, 'foco');
  const finMotivo = M.escribir(8.75, () => motivo, 'Reorganización del personal sanitario', { cps: 21 });
  M.en(finMotivo + 0.2, () => { motivo.classList.remove('foco'); motivo.innerHTML = motivo.textContent; btnCambio.style.opacity = 1; });
  const tPub = finMotivo + 0.8;
  M.clic(tPub, () => btnCambio);
  const tHecho = M.cargando(tPub, () => btnCambio, 0.8);
  M.en(tHecho, () => {
    btnCambio.style.display = 'none'; okBox.style.display = '';
    bloqueLunes.classList.add('cambio'); bloqueLunes.innerHTML = '<b>Medicina</b>Utrillas'; bloqueLunes.style.outline = 'none';
  });
  M.animar(tHecho, () => okBox, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], 0.4);
  M.salta(tHecho, () => bloqueLunes);
  M.sonido(tHecho, 'exito');

  // ------------------------------------------------ 3. El aviso ya está en la lista
  const t3 = tHecho + 2.0;
  M.clic(t3, Q('31', '.lateral a', 1));
  M.ir(t3 + 0.12, '31', '32', 'corte');
  M.destello(t3 + 0.3, Q('32', '.tabla tbody tr', 0));

  // ------------------------------------------------ 4. Escribir un aviso nuevo
  const t4 = t3 + 1.8;
  M.clic(t4, Q('32', '.cab-web .boton'));
  M.ir(t4 + 0.12, '32', '30', 'corte');
  M.clic(t4 + 1.3, () => titulo);
  M.clase(t4 + 1.35, () => titulo, 'foco');
  const finTit = M.escribir(t4 + 1.55, () => titulo, 'Poda de árboles el jueves', { cps: 17, alCambiar: s => { prevMovilT.textContent = s; prevTabT.textContent = s; } });
  M.clase(finTit + 0.2, () => titulo, 'foco', false);
  M.en(finTit + 0.2, () => { titulo.innerHTML = titulo.textContent; });
  const tTipo = finTit + 0.7;
  M.clic(tTipo, () => tipo);
  desplegar(tTipo + 0.05, '30', () => tipo, ['General', 'Sanidad', 'Agua y luz', 'Trámites', 'Fiestas']);
  M.mover(tTipo + 0.4, opcion('30', 3), 0.4);
  M.clase(tTipo + 0.7, opcion('30', 3), 'sobre');
  M.clic(tTipo + 1.15, opcion('30', 3), 0.3);
  M.en(tTipo + 1.2, () => { tipo.querySelector('span').outerHTML = '<span style="flex:1">Trámites</span>'; prevTabEti.textContent = 'Trámites'; });
  cerrar(tTipo + 1.2, '30');
  const tTxt = tTipo + 2.1;
  M.clic(tTxt, () => texto);
  M.clase(tTxt + 0.05, () => texto, 'foco');
  const finTxt = M.escribir(tTxt + 0.25, () => texto, 'El jueves se podan los árboles de la plaza. No aparquéis allí de 8:00 a 12:00.', { cps: 26, alCambiar: s => { prevMovilP.textContent = s; prevTabP.textContent = s; } });
  M.en(finTxt + 0.2, () => { texto.classList.remove('foco'); texto.innerHTML = texto.textContent; });
  const tPueblo = finTxt + 0.8;
  M.clic(tPueblo, () => casillas[0]);
  M.en(tPueblo + 0.05, () => {
    casillas[0].classList.add('on'); casillas[0].innerHTML = '<svg class="i" aria-hidden="true"><use href="#i-check"/></svg>';
    alcance.textContent = 'A 2 vecinos y 1 familiar, al publicarse'; publicar.style.opacity = 1;
  });
  M.destello(tPueblo + 0.1, () => alcance.parentNode);
  const tEnv = tPueblo + 1.2;
  M.clic(tEnv, () => publicar);
  const tOk = M.cargando(tEnv, () => publicar, 0.8);
  M.toast(tOk, `${check} Aviso publicado · 2 vecinos y 1 familiar avisados`, 2.3);
  M.sonido(tOk, 'exito');

  // ------------------------------------------------ 5. Y ya sale en el tablón del bar
  const t5 = tOk + 2.8;
  M.clic(t5, Q('30', '.lateral a', 4));
  M.en(t5 + 0.1, () => {
    avisoTablon.querySelector('.eti').textContent = 'Ayuntamiento · nuevo';
    avisoTablon.querySelector('b').textContent = 'Poda de árboles el jueves';
    avisoTablon.querySelector('p').textContent = 'No aparquéis en la plaza de 8:00 a 12:00.';
  });
  M.ir(t5 + 0.12, '30', '34', 'fundido');
  M.mover(t5 + 0.6, { x: 1240, y: 770 }, 0.8);
  M.animar(t5 + 0.9, () => avisoTablon, [{ opacity: 0, transform: 'translateX(40px)' }, { opacity: 1, transform: 'none' }], 0.6);
  M.animar(t5 + 1.5, () => avisoTablon, [{ boxShadow: '0 0 0 6px rgba(184,73,43,.55)' }, { boxShadow: '0 0 0 0 rgba(184,73,43,0)' }], 1.4, { ease: 'ease-out', fill: 'none' });
  M.sonido(t5 + 0.9, 'aviso');
  return +(t5 + 4.2).toFixed(2);
};
