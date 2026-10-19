// María, vecina de Fuenferrada, usando Claxon en su móvil (lunes, 10:25).
window.guion = M => {
  const Q = (c, s, i = 0) => () => M.q(c, s, i);
  const T = (c, txt, sel) => () => M.qt(c, txt, sel);

  // ------------------------------------------------ estado inicial de las pantallas
  // Pantalla de bloqueo: la notificación del pan aún no ha llegado
  const pushes = [...M.capas['17'].querySelectorAll('.push')];
  const [p0, ...antiguas] = pushes;
  const alto = p0.offsetHeight + 10;
  p0.style.opacity = 0;
  antiguas.forEach(p => { p.style.transform = `translateY(${-alto}px)`; });
  // Encargo vacío
  M.capas['07'].querySelectorAll('.contador').forEach(c => { c.classList.remove('activo'); c.querySelector('b').textContent = '0'; });
  const pieTxt = M.q('07', '.pie-acciones .fila span'), pieEur = M.q('07', '.pie-acciones .fila b');
  const revisar = M.q('07', '.pie-acciones .boton');
  pieTxt.textContent = 'Ningún producto'; pieEur.textContent = '0,00 €'; revisar.style.opacity = 0.45;
  // Nota del encargo vacía
  const nota = M.qt('08', 'La barra poco hecha', '.entrada');
  nota.innerHTML = '<span class="ph">Escribe una nota (opcional)</span>';
  // El tic de «encargo enviado» aparece con animación
  M.q('09', '.exito .circulo').style.opacity = 0;
  // Ajustes: empieza en «Grande»
  const segs = M.capas['16'].querySelectorAll('.segmentos span');
  segs.forEach(s => s.classList.remove('on')); segs[1].classList.add('on');

  // ------------------------------------------------ 1. Llega el aviso del pan
  M.mostrar(0, '17');
  M.tween(1.1, 0.55, p => {
    p0.style.opacity = p; p0.style.transform = `translateY(${-24 * (1 - p)}px)`;
    antiguas.forEach(a => { a.style.transform = `translateY(${-alto * (1 - p)}px)`; });
  }, 'salida');
  M.sonido(1.1, 'claxon');
  M.toque(3.1, Q('17', '.push', 0));
  M.ir(3.3, '17', '05', 'fundido');

  // ------------------------------------------------ 2. Pantalla «Hoy»
  const barra = M.q('05', '.progreso .barra i');
  M.tween(3.6, 4, p => { barra.style.width = (38 + 8 * p) + '%'; }, 'lineal');
  M.toque(5.7, Q('05', '.lista .fila', 0));
  M.ir(5.9, '05', '06', 'push');

  // ------------------------------------------------ 3. Detalle del pan → encargar
  M.toque(8.6, Q('06', '.pie-acciones .boton:not(.sec)'));
  M.ir(8.8, '06', '07', 'push');

  const sumar = (t, i, n, productos, euros) => {
    M.toque(t, () => M.q('07', '.producto', i).querySelectorAll('.contador button')[1]);
    M.en(t + 0.05, () => {
      const c = M.q('07', '.producto', i).querySelector('.contador');
      c.classList.add('activo');
      c.querySelector('b').textContent = n;
      pieTxt.textContent = productos; pieEur.textContent = euros; revisar.style.opacity = 1;
    });
    M.salta(t + 0.05, () => M.q('07', '.producto', i).querySelector('.contador b'));
    M.destello(t + 0.05, () => pieEur);
  };
  sumar(9.9, 0, 1, '1 producto', '1,10 €');
  sumar(10.45, 0, 2, '2 productos', '2,20 €');
  sumar(11.4, 3, 1, '3 productos', '6,70 €');
  M.toque(12.5, () => revisar);
  M.ir(12.7, '07', '08', 'push');

  // ------------------------------------------------ 4. Revisar: escribe una nota y envía
  M.toque(13.8, () => nota);
  M.clase(13.85, () => nota, 'foco');
  const finNota = M.escribir(14.1, () => nota, 'La barra poco hecha, por favor.', { cps: 17 });
  M.clase(finNota + 0.3, () => nota, 'foco', false);
  M.en(finNota + 0.3, () => { nota.innerHTML = nota.textContent; });
  const enviar = Q('08', '.pie-acciones .boton');
  M.toque(finNota + 0.7, enviar);
  const tEnviado = M.cargando(finNota + 0.7, enviar, 0.75);
  M.ir(tEnviado, '08', '09', 'fundido');
  M.en(tEnviado + 0.15, () => { M.q('09', '.exito .circulo').style.opacity = 1; });
  M.salta(tEnviado + 0.15, Q('09', '.exito .circulo'));
  M.sonido(tEnviado + 0.15, 'exito');

  // ------------------------------------------------ 5. Mis encargos: el horno lo acepta
  M.toque(tEnviado + 2.0, Q('09', '.pie-acciones .boton', 0));
  const tLista = M.ir(tEnviado + 2.2, '09', '10', 'push');
  M.notificar(tLista + 1.2, { titulo: 'Horno San Jorge ha aceptado tu encargo', cuerpo: 'Mañana, martes 20 · hacia las 10:40 en la Plaza.' }, { dur: 2.8 });
  M.texto(tLista + 1.5, () => M.q('10', '.tarjeta', 2).querySelector('.pill'), '<svg class="i xs" aria-hidden="true"><use href="#i-check"/></svg> Aceptado');
  M.clase(tLista + 1.5, () => M.q('10', '.tarjeta', 2).querySelector('.pill'), 'pend', false);
  M.clase(tLista + 1.5, () => M.q('10', '.tarjeta', 2).querySelector('.pill'), 'ok');
  M.destello(tLista + 1.5, () => M.q('10', '.tarjeta', 2));

  // ------------------------------------------------ 6. Avisos del pueblo: cambio de consulta
  const tAv = tLista + 4.6;
  M.toque(tAv, Q('10', '.nav a', 2));
  M.ir(tAv + 0.1, '10', '12', 'corte');
  M.toque(tAv + 1.3, Q('12', '.tarjeta.oscura'));
  M.ir(tAv + 1.5, '12', '13', 'push');
  M.toque(tAv + 4.4, Q('13', '.volver'));
  M.ir(tAv + 4.6, '13', '12', 'pop');

  // ------------------------------------------------ 7. Ajustes: letra más grande
  const tAj = tAv + 5.6;
  M.toque(tAj, Q('12', '.nav a', 0));
  M.ir(tAj + 0.1, '12', '05', 'corte');
  M.toque(tAj + 1.1, Q('05', '.cab .avatar'));
  M.ir(tAj + 1.3, '05', '16', 'push');
  M.toque(tAj + 2.5, () => segs[2]);
  M.en(tAj + 2.55, () => { segs[1].classList.remove('on'); segs[2].classList.add('on'); });

  // ------------------------------------------------ 8. ¡El panadero ya está en la plaza!
  const tFin = tAj + 3.8;
  M.notificar(tFin, { titulo: 'El panadero ya está en la plaza', cuerpo: 'Horno San Jorge ha llegado a Fuenferrada. Tu encargo te espera.' }, { dur: 3.4, claxon: true });
  return +(tFin + 3.6).toFixed(2);
};
