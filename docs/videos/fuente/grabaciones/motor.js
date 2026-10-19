// Motor de «grabaciones de pantalla»: simula a una persona usando la app.
// Se ejecuta dentro de la página. Todo depende del tiempo t (segundos): en cada
// fotograma se llama a M.avanzar(t) y la pantalla queda exactamente como estaría
// en ese instante. Las animaciones CSS se congelan y se colocan a mano, así el
// vídeo sale fluido aunque cada captura tarde lo que tarde.
(() => {
  const EASE = {
    lineal: p => p,
    suave: p => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
    salida: p => 1 - Math.pow(1 - p, 3),
  };
  let semilla = 11;
  const azar = () => { semilla = (semilla * 16807) % 2147483647; return (semilla - 1) / 2147483646; };

  const M = (window.M = {
    acciones: [], tweens: [], eventos: [], anims: new Map(), i: 0, capas: {}, z: 1,
    cursor: { x: 760, y: 470 }, escritorio: false, ordenado: false,

    // ------------------------------------------------------------ núcleo
    en(t, fn) { this.acciones.push({ t, fn, n: this.acciones.length }); this.ordenado = false; return t; },
    tween(t, dur, fn, ease = 'suave') { this.tweens.push({ t, dur, fn, ease: EASE[ease] || ease }); return t + dur; },
    sonido(t, tipo) { this.eventos.push({ t: +t.toFixed(3), tipo }); },
    registrar(ts) {
      for (const an of document.getAnimations()) {
        if (!this.anims.has(an)) { an.pause(); this.anims.set(an, ts); }
      }
    },
    avanzar(t) {
      if (!this.ordenado) { this.acciones.sort((a, b) => a.t - b.t || a.n - b.n); this.ordenado = true; }
      while (this.i < this.acciones.length && this.acciones[this.i].t <= t + 1e-6) {
        const a = this.acciones[this.i++];
        a.fn();
        this.registrar(a.t);
        if (!this.ordenado) { // una acción ha programado otras
          const hechas = this.acciones.slice(0, this.i), resto = this.acciones.slice(this.i).sort((x, y) => x.t - y.t || x.n - y.n);
          this.acciones = hechas.concat(resto); this.ordenado = true;
        }
      }
      for (const tw of this.tweens) {
        if (t >= tw.t && !tw.fin) {
          const p = Math.min(1, (t - tw.t) / tw.dur);
          tw.fn(tw.ease(p), p);
          if (p >= 1) tw.fin = true;
        }
      }
      for (const [an, s] of this.anims) {
        // Una animación CSS cuya clase ya se ha quitado (o cuyo elemento ya no está) se cancela;
        // si no, al moverla a mano «revive» y deja la pantalla desplazada.
        const ef = an.effect, tg = ef && ef.target;
        const huerfana = an.playState === 'idle' || !tg || !tg.isConnected ||
          (typeof CSSAnimation !== 'undefined' && an instanceof CSSAnimation &&
           !getComputedStyle(tg, ef.pseudoElement).animationName.split(/,\s*/).includes(an.animationName));
        if (huerfana) { an.cancel(); this.anims.delete(an); continue; }
        an.currentTime = Math.max(0, (t - s) * 1000);
      }
    },

    // ------------------------------------------------------------ buscar elementos
    q(capa, sel, i = 0) {
      const l = this.capas[capa].querySelectorAll(sel);
      if (!l[i]) throw new Error(`No encuentro ${sel}[${i}] en ${capa}`);
      return l[i];
    },
    qt(capa, texto, sel = '*') {
      const l = [...this.capas[capa].querySelectorAll(sel)].filter(e => e.textContent.includes(texto));
      if (!l.length) throw new Error(`No encuentro «${texto}» (${sel}) en ${capa}`);
      return l[l.length - 1];
    },

    // Animación suelta con la Web Animations API (se puede repetir sobre el mismo elemento)
    animar(t, el, kf, dur, { ease = 'cubic-bezier(.2,.8,.2,1)', fill = 'both' } = {}) {
      return this.en(t, () => { el().animate(kf, { duration: dur * 1000, easing: ease, fill }); });
    },
    salta(t, el) {
      return this.animar(t, el, [{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: 0.7 }, { transform: 'scale(1)', opacity: 1 }], 0.5, { ease: 'cubic-bezier(.2,.8,.2,1.3)' });
    },
    destello(t, el) {
      return this.animar(t, el, [{ backgroundColor: 'rgba(184, 73, 43, .28)' }, { backgroundColor: 'rgba(184, 73, 43, 0)' }], 1.1, { ease: 'ease-out', fill: 'none' });
    },

    // ------------------------------------------------------------ pantallas
    mostrar(t, capa) {
      return this.en(t, () => { const c = this.capas[capa]; c.classList.add('ver'); c.style.zIndex = ++this.z; });
    },
    ir(t, desde, hasta, tipo = 'push') {
      const A = () => this.capas[desde], B = () => this.capas[hasta];
      const dur = { push: 0.4, pop: 0.4, fundido: 0.3, corte: 0, sube: 0.42 }[tipo];
      this.en(t, () => {
        const a = A(), b = B();
        if (tipo === 'pop') { b.style.zIndex = a.style.zIndex - 1 || 0; a.style.zIndex = ++this.z; }
        else b.style.zIndex = ++this.z;
        b.classList.add('ver');
        if (tipo !== 'corte') { b.classList.add(`${tipo}-entra`); a.classList.add(`${tipo}-sale`); }
      });
      this.en(t + dur + 0.02, () => {
        const a = A(), b = B();
        a.classList.remove('ver', `${tipo}-sale`);
        b.classList.remove(`${tipo}-entra`);
        for (const x of [...a.getAnimations(), ...b.getAnimations()]) { x.cancel(); this.anims.delete(x); }
      });
      return t + dur;
    },

    // ------------------------------------------------------------ gestos
    centro(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2 + (azar() - 0.5) * Math.min(14, r.width * 0.2), y: r.top + r.height / 2 + (azar() - 0.5) * Math.min(10, r.height * 0.2) };
    },
    pulsar(t, el) {
      // El elemento puede haber desaparecido (p. ej. una opción de un desplegable que se cierra)
      this.en(t, () => { const e = el(); if (e) e.classList.add('pulsado'); });
      this.en(t + 0.16, () => { const e = el(); if (e) e.classList.remove('pulsado'); });
    },
    // Toque con el dedo (móvil): círculo como el de «mostrar toques» de Android
    toque(t, el) {
      const dedo = document.getElementById('toque');
      let c = null;
      this.tween(t - 0.1, 0.6, (p, lin) => {
        if (!c) c = this.centro(el());
        dedo.style.left = c.x + 'px'; dedo.style.top = c.y + 'px';
        const op = lin < 0.25 ? lin / 0.25 : lin > 0.6 ? Math.max(0, 1 - (lin - 0.6) / 0.4) : 1;
        dedo.style.opacity = (0.95 * op).toFixed(3);
        dedo.style.transform = `scale(${lin < 0.25 ? 0.6 + 0.4 * lin / 0.25 : lin < 0.4 ? 1 - 0.12 * (lin - 0.25) / 0.15 : 0.88 + 0.2 * (lin - 0.4) / 0.6})`;
      }, 'lineal');
      this.pulsar(t, el);
      this.sonido(t, 'toque');
      return t;
    },
    // Ratón (escritorio): se mueve hasta el elemento y hace clic
    mover(t, el, dur = 0.55) {
      const cur = document.getElementById('cursor');
      let ini = null, fin = null;
      return this.tween(t, dur, p => {
        if (!ini) { ini = { ...this.cursor }; fin = typeof el === 'function' ? this.centro(el()) : el; }
        this.cursor = { x: ini.x + (fin.x - ini.x) * p, y: ini.y + (fin.y - ini.y) * p + Math.sin(p * Math.PI) * -18 };
        cur.style.transform = `translate(${this.cursor.x}px, ${this.cursor.y}px)`;
      });
    },
    clic(t, el, dur = 0.55) {
      this.mover(t - dur - 0.05, el, dur);
      const onda = document.getElementById('onda');
      this.tween(t, 0.45, (p, lin) => {
        onda.style.left = this.cursor.x + 'px'; onda.style.top = this.cursor.y + 'px';
        onda.style.opacity = (0.6 * (1 - lin)).toFixed(3);
        onda.style.transform = `scale(${0.3 + lin * 1.1})`;
      }, 'lineal');
      this.pulsar(t, el);
      this.sonido(t, 'clic');
      return t;
    },

    // ------------------------------------------------------------ contenido
    texto(t, el, html, destello = true) {
      return this.en(t, () => {
        const e = el(); e.innerHTML = html;
        if (destello) e.animate([{ backgroundColor: 'rgba(184, 73, 43, .28)' }, { backgroundColor: 'rgba(184, 73, 43, 0)' }], { duration: 1100, easing: 'ease-out' });
      });
    },
    clase(t, el, cls, on = true) { return this.en(t, () => el().classList.toggle(cls, on)); },
    estilo(t, el, css) { return this.en(t, () => Object.assign(el().style, css)); },
    escribir(t, el, texto, { cps = 16, alCambiar } = {}) {
      // Todo dentro de un solo <span>: así el cursor va pegado al texto aunque el campo sea flex
      this.en(t, () => { el().innerHTML = '<span><span class="caret"></span></span>'; });
      let tt = t;
      for (let k = 1; k <= texto.length; k++) {
        const ch = texto[k - 1];
        tt += (1 / cps) * (0.7 + azar() * 0.6) + (ch === ' ' ? 0.03 : 0) + ('.,'.includes(ch) ? 0.12 : 0);
        const parcial = texto.slice(0, k);
        this.en(tt, () => {
          el().innerHTML = '<span>' + parcial.replace(/&/g, '&amp;').replace(/</g, '&lt;') + '<span class="caret"></span></span>';
          if (alCambiar) alCambiar(parcial);
        });
        if (ch !== ' ') this.sonido(tt, this.escritorio ? 'tecla-pc' : 'tecla');
      }
      return tt;
    },
    cargando(t, el, dur = 0.7) {
      let antes = '';
      this.en(t + 0.08, () => { const e = el(); antes = e.innerHTML; e.innerHTML = '<span class="spin"></span>'; });
      this.en(t + dur, () => { el().innerHTML = antes; });
      return t + dur;
    },
    plegar(t, el, dur = 0.4) {
      let h = 0;
      return this.tween(t, dur, p => {
        const e = el();
        if (!h) { h = e.offsetHeight; e.style.overflow = 'hidden'; }
        e.style.height = (h * (1 - p)) + 'px';
        e.style.opacity = (1 - Math.min(1, p * 1.6)).toFixed(3);
        e.style.marginTop = (-16 * p) + 'px';
        if (p >= 1) e.style.display = 'none';
      });
    },

    // ------------------------------------------------------------ avisos
    notificar(t, { titulo, cuerpo, hora = 'ahora' }, { dur = 3.2, claxon = false } = {}) {
      const id = 'banner' + this.eventos.length + Math.round(t * 1000);
      this.en(t, () => {
        const b = document.createElement('div');
        b.className = 'banner push banner-entra'; b.id = id;
        b.innerHTML = `<span class="logo">${window.ICONO_CLAXON}</span><div><span class="app">Claxon</span><b>${titulo}</b><p>${cuerpo}</p></div><time>${hora}</time>`;
        b.style.zIndex = 5000;
        document.getElementById('superior').appendChild(b);
      });
      this.en(t + dur, () => { const b = document.getElementById(id); b.classList.remove('banner-entra'); b.classList.add('banner-sale'); });
      this.en(t + dur + 0.45, () => document.getElementById(id).remove());
      this.sonido(t, claxon ? 'claxon' : 'aviso');
      return t + dur;
    },
    toast(t, html, dur = 2.2) {
      const id = 'toast' + Math.round(t * 1000);
      this.en(t, () => {
        const d = document.createElement('div');
        d.className = 'toast toast-entra'; d.id = id; d.innerHTML = html;
        document.getElementById('superior').appendChild(d);
      });
      this.en(t + dur, () => { const d = document.getElementById(id); d.classList.remove('toast-entra'); d.classList.add('toast-sale'); });
      this.en(t + dur + 0.35, () => document.getElementById(id).remove());
      return t + dur;
    },
  });
})();
