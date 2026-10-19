// Jorge, de Horno San Jorge, haciendo la ruta del pan con Claxon.
window.guion = M => {
  const Q = (c, s, i = 0) => () => M.q(c, s, i);
  const check = '<svg class="i xs" aria-hidden="true"><use href="#i-check"/></svg>';

  // ------------------------------------------------ estado inicial
  // La hoja de «retraso» se pinta encima de la ruta en curso (sin su propio fondo)
  const capaRetraso = M.capas['24'];
  capaRetraso.style.background = 'transparent';
  M.q('24', '.pantalla-app').style.background = 'transparent';
  ['.estado', '.cab', '.cuerpo'].forEach(s => { M.q('24', s).style.visibility = 'hidden'; });
  const chips = capaRetraso.querySelectorAll('.hoja .chip');
  chips.forEach(c => c.classList.remove('on'));
  const filasHora = [...capaRetraso.querySelectorAll('.hoja .tarjeta .fila')];
  const horas = [['10:40', '10:50'], ['11:20', '11:30'], ['12:00', '12:10']];
  filasHora.forEach((f, k) => { f.querySelector('.num').innerHTML = `<b>${horas[k][0]}</b>`; });
  const avisarRetraso = M.q('24', '.hoja .boton');
  avisarRetraso.style.opacity = 0.45;
  // En la parada: llega 10 minutos tarde y el encargo de Manuel ya está aceptado
  M.q('25', '.estado .num').textContent = '10:51';
  M.q('25', '.cab .pill').textContent = 'Llegaste 10:51';
  const pillManuel = M.q('25', '.tarjeta', 1).querySelector('.pill');
  pillManuel.className = 'pill azul'; pillManuel.textContent = 'Aceptado';

  // ------------------------------------------------ 1. Iniciar la ruta
  M.mostrar(0, '22');
  const iniciar = Q('22', '.boton.gigante');
  M.toque(1.6, iniciar);
  const tIni = M.cargando(1.6, iniciar, 0.9);
  M.toast(tIni, `${check} Ruta iniciada · avisaremos a los vecinos`, 2.0);
  M.ir(tIni + 2.4, '22', '23', 'fundido');

  // ------------------------------------------------ 2. Avisar de un retraso de 10 minutos
  const t2 = tIni + 3.8;
  M.toque(t2, Q('23', '.cuerpo .boton.sec'));
  M.mostrar(t2 + 0.2, '24');
  M.animar(t2 + 0.2, Q('24', '.velo'), [{ opacity: 0 }, { opacity: 1 }], 0.3, { ease: 'ease' });
  M.animar(t2 + 0.2, Q('24', '.hoja'), [{ transform: 'translateY(100%)' }, { transform: 'none' }], 0.42);
  M.toque(t2 + 1.6, () => chips[1]);
  M.en(t2 + 1.65, () => {
    chips[1].classList.add('on'); avisarRetraso.style.opacity = 1;
    filasHora.forEach((f, k) => { f.querySelector('.num').innerHTML = `<s class="texto-t">${horas[k][0]}</s> → <b>${horas[k][1]}</b>`; });
  });
  filasHora.forEach((f, k) => M.destello(t2 + 1.7 + k * 0.08, () => f));
  M.toque(t2 + 3.0, () => avisarRetraso);
  const tR = M.cargando(t2 + 3.0, () => avisarRetraso, 0.6);
  M.animar(tR, Q('24', '.velo'), [{ opacity: 1 }, { opacity: 0 }], 0.3, { ease: 'ease', fill: 'forwards' });
  M.animar(tR, Q('24', '.hoja'), [{ transform: 'none' }, { transform: 'translateY(100%)' }], 0.4, { ease: 'ease-in', fill: 'forwards' });
  M.en(tR + 0.45, () => { capaRetraso.classList.remove('ver'); capaRetraso.getAnimations({ subtree: true }).forEach(a => a.cancel()); });
  // La ruta se actualiza con las nuevas horas
  M.texto(tR + 0.45, () => M.q('23', '.tarjeta.oscura .num'), '10:50');
  const lis = M.capas['23'].querySelectorAll('.tiempo li');
  ['10:50', '11:30', '12:10'].forEach((h, k) => M.texto(tR + 0.5 + k * 0.1, () => lis[k + 1].querySelector('.h'), h));
  M.toast(tR + 0.5, `${check} 4 vecinos avisados del retraso`, 2.0);

  // ------------------------------------------------ 3. Aceptar los encargos pendientes
  const t3 = tR + 2.9;
  M.toque(t3, Q('23', '.nav a', 1));
  M.ir(t3 + 0.1, '23', '26', 'corte');
  const seg = Q('26', '.segmentos span', 0);
  const aceptar = (t, i, quedan) => {
    M.toque(t, () => M.q('26', '.tarjeta', i).querySelector('.boton.mini:not(.sec)'));
    M.texto(t + 0.15, () => M.q('26', '.tarjeta', i).querySelector('.boton.mini:not(.sec)'), `${check} Aceptado`, false);
    M.plegar(t + 0.45, () => M.q('26', '.tarjeta', i));
    M.plegar(t + 0.45, () => M.q('26', '.eti', i));
    M.texto(t + 0.5, seg, `Por aceptar · ${quedan}`);
    M.sonido(t + 0.2, 'exito');
  };
  aceptar(t3 + 1.3, 0, 1);
  // En la ruta, el encargo de Manuel ya figura como aceptado
  M.en(t3 + 1.5, () => { M.qt('23', 'Manuel (sin aceptar)', 'span').textContent = 'María (preparado) · Manuel (aceptado)'; });
  aceptar(t3 + 2.9, 1, 0);
  M.en(t3 + 3.7, () => {
    const p = document.createElement('p');
    p.className = 'texto-t'; p.style.textAlign = 'center'; p.style.marginTop = '40px';
    p.textContent = 'No tienes encargos por aceptar.';
    M.q('26', '.cuerpo').appendChild(p);
    p.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 450, easing: 'ease-out', fill: 'both' });
  });

  // ------------------------------------------------ 4. Llega a Fuenferrada y entrega
  const t4 = t3 + 5.0;
  M.toque(t4, Q('26', '.nav a', 0));
  M.ir(t4 + 0.1, '26', '23', 'corte');
  M.toque(t4 + 1.3, Q('23', '.boton.gigante'));
  M.ir(t4 + 1.5, '23', '25', 'push');
  const entregar = (t, i) => {
    const tarjeta = () => M.q('25', '.tarjeta', i);
    M.toque(t, () => tarjeta().querySelector('.boton.mini.ok'));
    M.en(t + 0.15, () => {
      const c = tarjeta();
      c.querySelectorAll('.boton.mini').forEach(b => { b.style.display = 'none'; });
      const pill = c.querySelector('.pill'); pill.className = 'pill ok'; pill.innerHTML = `${check} Entregado`;
    });
    M.salta(t + 0.15, () => tarjeta().querySelector('.pill'));
    M.animar(t + 0.4, tarjeta, [{ opacity: 1 }, { opacity: 0.6 }], 0.4, { ease: 'ease', fill: 'forwards' });
    M.sonido(t + 0.15, 'exito');
  };
  entregar(t4 + 3.0, 0);
  entregar(t4 + 4.6, 1);

  // ------------------------------------------------ 5. Siguiente parada
  const t5 = t4 + 6.2;
  M.toque(t5, Q('25', '.pie-acciones .boton'));
  M.en(t5 + 0.15, () => {
    const card = M.q('23', '.tarjeta.oscura');
    card.querySelector('b').textContent = 'Segura de los Baños';
    card.querySelector('.num').textContent = '11:30';
    card.querySelector('p').textContent = 'Plaza de la Iglesia · 1 encargo · 1 persona recibe aviso';
    const gigante = M.q('23', '.boton.gigante'); gigante.lastChild.textContent = ' He llegado a Segura';
    const ejes = M.capas['23'].querySelectorAll('.tiempo .eje');
    ejes[1].className = 'eje hecho'; ejes[2].className = 'eje actual';
    lis[1].querySelector('.h').style.color = ''; lis[2].querySelector('.h').style.color = 'var(--a-acento)';
  });
  M.ir(t5 + 0.2, '25', '23', 'fundido');
  M.toast(t5 + 0.6, `${check} Siguiente parada: Segura de los Baños · 11:30`, 2.2);

  // ------------------------------------------------ 6. Se acaban las magdalenas
  const t6 = t5 + 3.4;
  M.toque(t6, Q('23', '.nav a', 3));
  M.ir(t6 + 0.1, '23', '28', 'corte');
  const magdalenas = () => M.qt('28', 'Magdalenas', '.producto');
  M.toque(t6 + 1.4, () => magdalenas().querySelector('.interruptor'));
  M.en(t6 + 1.45, () => {
    const p = magdalenas();
    p.querySelector('.interruptor').classList.remove('on');
    p.querySelector('.t2').textContent = '4,50 € · hoy no hay';
  });
  M.animar(t6 + 1.5, magdalenas, [{ opacity: 1 }, { opacity: 0.6 }], 0.35, { ease: 'ease', fill: 'forwards' });
  M.toast(t6 + 1.8, 'Magdalenas ocultas hasta mañana', 2.0);
  return +(t6 + 4.4).toFixed(2);
};
