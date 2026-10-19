// Laura, desde Zaragoza, ayudando a su madre (María) y a su tío Joaquín, que no tiene móvil.
window.guion = M => {
  const Q = (c, s, i = 0) => () => M.q(c, s, i);
  const T = (c, txt, sel) => () => M.qt(c, txt, sel);
  const check = '<svg class="i xs" aria-hidden="true"><use href="#i-check"/></svg>';

  // ------------------------------------------------ estado inicial
  // Encargo para Joaquín: vacío, a La Hoz de la Vieja
  M.capas['07'].querySelectorAll('.contador').forEach(c => { c.classList.remove('activo'); c.querySelector('b').textContent = '0'; });
  M.q('07', '.tarjeta.crema p').innerHTML = '<b>Mañana, martes 20</b> · La Hoz · hacia las 12:00';
  const pieTxt = M.q('07', '.pie-acciones .fila span'), pieEur = M.q('07', '.pie-acciones .fila b');
  const revisar = M.q('07', '.pie-acciones .boton');
  pieTxt.textContent = 'Ningún producto'; pieEur.textContent = '0,00 €'; revisar.style.opacity = 0.45;
  // Revisar: con los productos de Joaquín
  M.q('08', '.tarjeta .t2').textContent = 'Mañana, martes 20 · hacia las 12:00';
  M.qt('08', 'Barra de pan ×2', '.fila').innerHTML = '<span>Pan de pueblo redondo ×1</span><span class="num">2,40 €</span>';
  M.qt('08', '6,70 €', 'b').textContent = '6,90 €';
  M.qt('08', 'C/ Mayor, 12', '.peq').textContent = 'C/ del Horno, 5 · La Hoz de la Vieja';
  const radios = M.capas['08'].querySelectorAll('.radio');
  const nota = M.qt('08', 'La barra poco hecha', '.entrada');
  nota.innerHTML = '<span class="ph">Escribe una nota (opcional)</span>';
  // Enviado: textos para Joaquín
  M.q('09', '.exito p').textContent = 'Horno San Jorge tiene que aceptarlo. Los avisos te llegarán a ti.';
  M.qt('09', 'Plaza · hacia las 10:40', 'p').innerHTML = '<b>A casa de Joaquín · hacia las 12:00</b>';
  M.qt('09', 'Magdalenas 1 docena', 'p').innerHTML = 'Pan de pueblo redondo ×1 · Magdalenas 1 docena · <span class="num">6,90 €</span>';
  M.qt('09', 'Laura también verá', 'span').textContent = 'Joaquín no tiene móvil: todo te llega a ti.';
  M.q('09', '.exito .circulo').style.opacity = 0;
  // Código para vincular: vacío
  const casillas = M.capas['20'].querySelectorAll('.codigo span');
  casillas.forEach(c => { c.textContent = ''; c.classList.remove('foco'); });

  // ------------------------------------------------ 1. Aviso del pan de su madre
  M.mostrar(0, '18');
  M.notificar(1.0, { titulo: 'El pan llega a Fuenferrada en 15 min', cuerpo: 'Tu madre tiene 1 encargo preparado en Horno San Jorge.' }, { dur: 3.0, claxon: true });

  // ------------------------------------------------ 2. Entra en Joaquín y le encarga pan
  M.toque(4.7, Q('18', '.tarjeta', 1));
  M.ir(4.9, '18', '19', 'push');
  M.destello(6.0, Q('19', '.tarjeta.suave'));
  M.toque(7.7, Q('19', '.pie-acciones .boton:not(.sec)'));
  M.ir(7.9, '19', '07', 'push');

  const sumar = (t, i, productos, euros) => {
    M.toque(t, () => M.q('07', '.producto', i).querySelectorAll('.contador button')[1]);
    M.en(t + 0.05, () => {
      const c = M.q('07', '.producto', i).querySelector('.contador');
      c.classList.add('activo'); c.querySelector('b').textContent = '1';
      pieTxt.textContent = productos; pieEur.textContent = euros; revisar.style.opacity = 1;
    });
    M.salta(t + 0.05, () => M.q('07', '.producto', i).querySelector('.contador b'));
    M.destello(t + 0.05, () => pieEur);
  };
  sumar(9.1, 2, '1 producto', '2,40 €');
  sumar(10.0, 3, '2 productos', '6,90 €');
  M.toque(11.1, () => revisar);
  M.ir(11.3, '07', '08', 'push');

  // ------------------------------------------------ 3. Que se lo lleven a casa, con una nota
  M.toque(12.5, () => radios[1]);
  M.en(12.55, () => { radios[0].classList.remove('on'); radios[1].classList.add('on'); });
  M.toque(13.5, () => nota);
  M.clase(13.55, () => nota, 'foco');
  const finNota = M.escribir(13.8, () => nota, 'Llamad fuerte a la puerta, que tarda en abrir.', { cps: 18 });
  M.clase(finNota + 0.3, () => nota, 'foco', false);
  M.en(finNota + 0.3, () => { nota.innerHTML = nota.textContent; });
  const enviar = Q('08', '.pie-acciones .boton');
  M.toque(finNota + 0.7, enviar);
  const tE = M.cargando(finNota + 0.7, enviar, 0.75);
  M.ir(tE, '08', '09', 'fundido');
  M.en(tE + 0.15, () => { M.q('09', '.exito .circulo').style.opacity = 1; });
  M.salta(tE + 0.15, Q('09', '.exito .circulo'));
  M.sonido(tE + 0.15, 'exito');

  // ------------------------------------------------ 4. Vincularse con su padre usando un código
  M.toque(tE + 2.2, Q('09', '.pie-acciones .boton', 1));
  M.ir(tE + 2.4, '09', '18', 'fundido');
  M.toque(tE + 3.6, Q('18', '.nav a', 3));
  M.ir(tE + 3.8, '18', '20', 'push');
  let tc = tE + 5.0;
  M.toque(tc, () => casillas[0]);
  M.clase(tc + 0.05, () => casillas[0], 'foco');
  [...'8F3K2P'].forEach((ch, k) => {
    const tk = tc + 0.5 + k * 0.32;
    M.en(tk, () => {
      casillas[k].textContent = ch; casillas[k].classList.remove('foco');
      if (k < 5) casillas[k + 1].classList.add('foco');
    });
    M.salta(tk, () => casillas[k]);
    M.sonido(tk, 'tecla');
  });
  const tEnv = tc + 3.0;
  const solicitar = Q('20', '.pie-acciones .boton');
  M.toque(tEnv, solicitar);
  const tOk = M.cargando(tEnv, solicitar, 0.8);
  M.toast(tOk, `${check} Solicitud enviada a Pedro`, 1.8);
  M.notificar(tOk + 2.2, { titulo: 'Pedro ha aceptado tu solicitud', cuerpo: 'Desde ahora recibirás sus avisos y podrás encargar por él.' }, { dur: 3.0 });
  return +(tOk + 5.6).toFixed(2);
};
