// Anuncios de Claxon: un vídeo por perfil (1920×1080, 30 fps, con música).
//
//   node videos.js                 → todos los perfiles
//   node videos.js vecino          → solo uno
//   node videos.js vecino --previa → solo fotogramas sueltos para revisar (sin vídeo)
//
// Cada anuncio es una página HTML con animaciones CSS. Para que el vídeo salga
// fluido no se graba en tiempo real: en cada fotograma se «congelan» todas las
// animaciones en el instante exacto (Web Animations API) y se hace una captura.
// Necesita: Playwright, ffmpeg, python3 + numpy, y las capturas de docs/interfaces/png.
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const GUIONES = require('./guiones');
const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..', '..');
const PNG = path.join(RAIZ, 'docs', 'interfaces', 'png');
const CATALOGO = path.join(RAIZ, 'docs', 'interfaces', 'interfaces-claxon.html');
const ICONOS = path.join(RAIZ, 'docs', 'interfaces', 'fuente', 'node_modules', 'lucide-static', 'icons');
const SALIDA = path.resolve(AQUI, '..');
const TMP = path.join(AQUI, '.tmp');
const FPS = 30;
const ANCHO = 1920, ALTO = 1080;

const args = process.argv.slice(2);
const PREVIA = args.includes('--previa');
const PERFILES = args.filter(a => !a.startsWith('--'));
const elegidos = PERFILES.length ? PERFILES : Object.keys(GUIONES);

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const icono = (n, clase = '') => fs.readFileSync(path.join(ICONOS, n + '.svg'), 'utf8')
  .replace(/<!--.*?-->/gs, '').replace('<svg', `<svg class="ico ${clase}"`).replace(/\s(width|height)="24"/g, '');
const a = (nombre, dur, ini, { ease = 'cubic-bezier(.2,.8,.2,1)', fill = 'both', it = 1 } = {}) =>
  `${nombre} ${dur}s ${ease} ${ini.toFixed(3)}s ${it} normal ${fill}`;
const anims = (...l) => `animation:${l.join(',')};`;
const palabras = (texto, t0, paso = 0.06, clase = '') => texto.split(' ').map((p, i) =>
  `<span class="mascara"><span class="palabra ${clase}" style="${anims(a('subirPalabra', 0.75, t0 + i * paso))}">${esc(p)}</span></span>`).join(' ');

// --------------------------------------------------------------------------- medir marcas
async function medirMarcas(browser) {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 } });
  await page.goto('file://' + CATALOGO, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const pedidos = [];
  for (const g of Object.values(GUIONES)) for (const e of g.escenas) for (const m of e.marcas || []) pedidos.push(m);
  const pngs = [...new Set(Object.values(GUIONES).flatMap(g => g.escenas.flatMap(e => e.pantallas)))];
  const r = await page.evaluate(({ pedidos, pngs }) => {
    const disp = png => document.querySelector(`figure[data-png="${png}"]`).querySelector('.movil, .navegador, .tele');
    const tam = Object.fromEntries(pngs.map(p => { const b = disp(p).getBoundingClientRect(); return [p, [b.width, b.height]]; }));
    const marcas = pedidos.map(m => {
      const d = disp(m.png), b = d.getBoundingClientRect();
      const el = d.querySelectorAll(m.sel)[m.idx];
      if (!el) return { error: `${m.png}: no encuentro «${m.sel}» [${m.idx}]` };
      const r = el.getBoundingClientRect();
      return { x: (r.left - b.left) / b.width, y: (r.top - b.top) / b.height, w: r.width / b.width, h: r.height / b.height };
    });
    return { tam, marcas };
  }, { pedidos, pngs });
  await page.close();
  const errores = r.marcas.filter(m => m.error);
  if (errores.length) throw new Error(errores.map(e => e.error).join('\n'));
  pedidos.forEach((m, i) => { m.rect = r.marcas[i]; });
  return r.tam;
}

// --------------------------------------------------------------------------- línea de tiempo
function lineaDeTiempo(g) {
  const escenas = [{ tipo: 'gancho', dur: 4.3, entrada: 'corte' }];
  if (g.dato) escenas.push({ tipo: 'dato', dur: 3.9, entrada: 'cortina' });
  g.escenas.forEach((e, i) => escenas.push({ tipo: 'rasgo', dur: 4.7, entrada: i === 0 && !g.dato ? 'cortina' : (i === 0 ? 'cortina' : 'fundido'), e, i }));
  escenas.push({ tipo: 'cierre', dur: 5.4, entrada: 'cortina' });
  let t = 0;
  escenas.forEach((s, i) => {
    const solape = s.entrada === 'cortina' ? 0.6 : s.entrada === 'fundido' ? 0.45 : 0;
    s.ini = i === 0 ? 0 : t - solape;
    t = s.ini + s.dur;
  });
  escenas.forEach((s, i) => { s.fin = i < escenas.length - 1 ? escenas[i + 1].ini + 0.8 : t; });
  return { escenas, total: +t.toFixed(2) };
}

// --------------------------------------------------------------------------- HTML
function html(clave, g, tam) {
  const { escenas, total } = lineaDeTiempo(g);
  const rasgos = escenas.filter(s => s.tipo === 'rasgo');
  const n = rasgos.length;

  const contenedor = (s, clase, interior) => {
    const entrada = s.entrada === 'cortina' ? a('cortina', 0.65, s.ini, { ease: 'cubic-bezier(.7,0,.2,1)' })
      : s.entrada === 'fundido' ? a('aparecer', 0.45, s.ini) : a('aparecer', 0.01, s.ini);
    return `<section class="escena ${clase}" style="${anims(entrada, a('desaparecer', 0.01, s.fin, { fill: 'forwards' }))}">${interior}</section>`;
  };

  const barraSuperior = (s, oscuro) => `<div class="barra-sup ${oscuro ? 'clara' : ''}">
      <div class="logo-mini" style="${anims(a('subir', 0.6, s.ini + 0.1))}"><span class="cuadro">${icono('volume-2')}</span>Claxon</div>
      <div class="chip-perfil" style="${anims(a('subir', 0.6, s.ini + 0.2))}">${esc(g.chip)}</div></div>`;

  const partes = escenas.map(s => {
    const S = s.ini;
    if (s.tipo === 'gancho') {
      return contenedor(s, 'gancho terracota', `
        <div class="patron" style="${anims(a('deriva', 30, 0, { ease: 'linear', it: 'infinite' }))}"></div>
        <div class="gancho-txt">
          <div class="bocina" style="${anims(a('pop', 0.55, S + 0.05))}"><span style="${anims(a('sacudir', 0.32, S + 0.25, { ease: 'ease-in-out', it: 2 }))}">${icono('volume-2')}</span></div>
          <div class="ceja clara" style="${anims(a('subir', 0.6, S + 0.35))}">${esc(g.gancho.ceja)}</div>
          <h1>${palabras(g.gancho.lineas[0], S + 0.55)}<br><em>${palabras(g.gancho.lineas[1], S + 1.45)}</em></h1>
        </div>
        <div class="tira-rombos"></div>`);
    }
    if (s.tipo === 'dato') {
      const d = g.dato;
      return contenedor(s, 'dato crema', `
        ${barraSuperior(s)}
        <div class="dato-txt">
          <div class="cifra"><span data-contar="${d.numero}" data-t0="${S + 0.35}" data-dur="1.3">0</span>${d.de ? `<small style="${anims(a('subir', 0.6, S + 0.9))}"> de ${d.de}</small>` : ''}</div>
          <p style="${anims(a('subir', 0.7, S + 0.75))}">${esc(d.texto)}</p>
          <div class="fuente" style="${anims(a('subir', 0.6, S + 1.1))}">${esc(d.fuente)}</div>
        </div>`);
    }
    if (s.tipo === 'rasgo') {
      const e = s.e, tipo = e.tipo || 'movil';
      const [pw, ph] = tam[e.pantallas[0]];
      const W = tipo === 'movil' ? Math.round(900 * pw / ph) : 1120;
      const H = tipo === 'movil' ? 900 : Math.round(1120 * ph / pw);
      const cambio = e.cambio != null ? S + e.cambio : null;
      // Al cambiar de pantalla, la primera se va mientras entra la segunda (sin verse doble)
      const imgs = e.pantallas.map((p, k) => {
        const estilo = k ? 'position:absolute;inset:0;' + anims(a('aparecerPantalla', 0.5, cambio))
          : e.pantallas.length > 1 ? anims(a('desaparecer', 0.35, cambio + 0.05, { fill: 'forwards' })) : '';
        return `<img src="file://${path.join(PNG, p + '.png')}" style="${estilo}" alt="">`;
      }).join('');
      const marcas = (e.marcas || []).map(m => {
        const r = m.rect, t = S + m.t;
        const fin = cambio && m.png === e.pantallas[0] && e.pantallas.length > 1 ? cambio + 0.1 : s.fin;
        if (m.tipo === 'anillo') {
          return `<div class="anillo" style="left:calc(${r.x * 100}% - 9px);top:calc(${r.y * 100}% - 9px);width:calc(${r.w * 100}% + 18px);height:calc(${r.h * 100}% + 18px);${anims(a('anilloEntra', 0.5, t), a('pulso', 1.3, t + 0.5, { ease: 'ease-out', it: 'infinite' }), a('desaparecer', 0.2, fin, { fill: 'forwards' }))}"></div>`;
        }
        const cx = (r.x + r.w / 2) * 100, cy = (r.y + r.h / 2) * 100;
        return `<div class="onda" style="left:${cx}%;top:${cy}%;${anims(a('onda', 0.75, t + 0.22, { ease: 'ease-out' }))}"></div>
                <div class="dedo" style="left:${cx}%;top:${cy}%;${anims(a('dedo', 0.95, t, { ease: 'ease-in-out' }))}"></div>`;
      }).join('');
      const puntos = Array.from({ length: n }, (_, k) => `<i class="${k === s.i ? 'on' : ''}"></i>`).join('');
      return contenedor(s, `rasgo crema ${tipo}`, `
        ${barraSuperior(s)}
        <div class="decor ${tipo}" style="${anims(a('crecer', 1.1, S))}"><div style="${anims(a('girar', 60, S, { ease: 'linear', it: 'infinite' }))}"></div></div>
        <div class="texto ${tipo}">
          <div class="ceja" style="${anims(a('subir', 0.6, S + 0.15))}">${esc(g.nombre)} · ${String(s.i + 1).padStart(2, '0')}</div>
          <h2>${palabras(e.titulo, S + 0.25, 0.055)}</h2>
          <p style="${anims(a('subir', 0.7, S + 0.85))}">${esc(e.sub)}</p>
          <div class="puntos" style="${anims(a('subir', 0.6, S + 1.0))}">${puntos}</div>
        </div>
        <div class="dispositivo ${tipo}" style="width:${W}px;height:${H}px;${anims(a('entrarDispositivo', 0.85, S + 0.05))}">
          <div class="flota" style="${anims(a('flotar', 4.2, S + 0.9, { ease: 'ease-in-out', it: 'infinite' }))}">
            <div class="pantalla" style="width:${W}px;height:${H}px">${imgs}${marcas}</div>
          </div>
        </div>`);
    }
    // cierre
    const chips = Object.entries(GUIONES).map(([k, p], i) =>
      `<span class="chip-cierre ${k === clave ? 'actual' : ''}" style="${anims(a('pop', 0.55, S + 1.5 + i * 0.12))}">${esc(p.nombre)}</span>`).join('');
    return contenedor(s, 'cierre terracota', `
      <div class="patron" style="${anims(a('deriva', 30, 0, { ease: 'linear', it: 'infinite' }))}"></div>
      <div class="cierre-txt">
        <div class="logo-grande" style="${anims(a('pop', 0.6, S + 0.15))}"><span style="${anims(a('sacudir', 0.32, S + 0.3, { ease: 'ease-in-out' }))}">${icono('volume-2')}</span></div>
        <div class="marca-grande">${palabras('Claxon', S + 0.45)}</div>
        <div class="lema" style="${anims(a('subir', 0.7, S + 0.95))}">El radar de lo que pasa por tu pueblo</div>
        <div class="chips-cierre">${chips}</div>
        <div class="pie-cierre" style="${anims(a('subir', 0.6, S + 2.2))}">Proyecto final de 2.º DAM · Piloto en las Cuencas Mineras (Teruel)</div>
      </div>
      <div class="tira-rombos"></div>`);
  }).join('\n');

  return { total, escenas, html: `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500;1,9..144,600&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
:root { --acento: #B8492B; --acento-osc: #963A21; --crema: #FAF6F0; --suave: #F4E3DA; --tinta: #1E2532; --tenue: #5B6170; --linea: #E6DCCF; }
* { box-sizing: border-box; }
html, body { margin: 0; width: ${ANCHO}px; height: ${ALTO}px; overflow: hidden; background: var(--crema); }
body { font-family: "Inter", system-ui, sans-serif; color: var(--tinta); -webkit-font-smoothing: antialiased; }
.escena { position: absolute; inset: 0; overflow: hidden; }
.terracota { background: var(--acento); color: #fff; }
.crema { background: var(--crema); }
.ico { width: 100%; height: 100%; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; display: block; }

/* Rombos de la presentación */
.patron { position: absolute; inset: -400px; opacity: .14;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cg fill='none' stroke='%23fff' stroke-width='3'%3E%3Cpath d='M60 18 L102 60 L60 102 L18 60 Z'/%3E%3Cpath d='M60 44 L76 60 L60 76 L44 60 Z' fill='%23fff' stroke='none'/%3E%3C/g%3E%3C/svg%3E");
  background-size: 120px 120px; }
.tira-rombos { position: absolute; left: 0; right: 0; bottom: 0; height: 34px; opacity: .9;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='34' height='34'%3E%3Cpath d='M17 5 L29 17 L17 29 L5 17 Z' fill='%23fff'/%3E%3Cpath d='M17 12 L22 17 L17 22 L12 17 Z' fill='%232F7D4F'/%3E%3C/svg%3E");
  background-size: 34px 34px; }

/* Textos animados */
.mascara { display: inline-block; overflow: hidden; vertical-align: top; padding: 0 0 .12em; margin-bottom: -.12em; }
.palabra { display: inline-block; }
.ceja { font: 500 22px/1 "JetBrains Mono", monospace; letter-spacing: .2em; text-transform: uppercase; color: var(--acento); display: flex; gap: 14px; align-items: center; }
.ceja::before { content: ""; width: 14px; height: 14px; background: currentColor; transform: rotate(45deg); }
.ceja.clara { color: #fff; opacity: .92; }

/* Gancho */
.gancho-txt { position: absolute; left: 150px; right: 150px; top: 50%; transform: translateY(-50%); display: grid; gap: 34px; }
.gancho h1 { margin: 0; font: 700 112px/1.08 "Fraunces", Georgia, serif; letter-spacing: -.015em; }
.gancho h1 em { font-weight: 600; font-style: italic; }
.bocina { width: 120px; height: 120px; border-radius: 30px; background: #fff; color: var(--acento); display: grid; place-items: center; }
.bocina > span { width: 64px; height: 64px; display: block; }

/* Dato */
.dato-txt { position: absolute; left: 150px; right: 150px; top: 54%; transform: translateY(-50%); display: grid; gap: 22px; }
.cifra { font: 700 300px/0.9 "Fraunces", Georgia, serif; color: var(--acento); letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
.cifra small { font-size: 120px; margin-left: 28px; color: var(--tinta); letter-spacing: 0; display: inline-block; }
.dato-txt p { margin: 0; font: 600 54px/1.2 "Fraunces", Georgia, serif; max-width: 1300px; }
.fuente { font: 500 20px/1 "JetBrains Mono", monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--tenue); }

/* Barra superior */
.barra-sup { position: absolute; top: 44px; left: 120px; right: 120px; display: flex; justify-content: space-between; align-items: center; z-index: 3; }
.logo-mini { display: flex; align-items: center; gap: 14px; font: 700 34px/1 "Fraunces", Georgia, serif; }
.logo-mini .cuadro { width: 46px; height: 46px; border-radius: 12px; background: var(--acento); color: #fff; padding: 10px; }
.chip-perfil { font: 600 22px/1 "Inter", sans-serif; padding: 14px 22px; border-radius: 999px; border: 2px solid var(--acento); color: var(--acento); }

/* Rasgo */
.texto { position: absolute; left: 120px; top: 50%; transform: translateY(-46%); width: 760px; display: grid; gap: 28px; z-index: 2; }
.texto.web, .texto.tele { width: 560px; }
.texto h2 { margin: 0; font: 700 96px/1.04 "Fraunces", Georgia, serif; letter-spacing: -.015em; text-wrap: balance; }
.texto.web h2, .texto.tele h2 { font-size: 70px; }
.texto p { margin: 0; font: 400 36px/1.35 "Inter", sans-serif; color: var(--tenue); max-width: 680px; }
.texto.web p, .texto.tele p { font-size: 30px; }
.puntos { display: flex; gap: 12px; margin-top: 8px; }
.puntos i { width: 14px; height: 14px; border-radius: 50%; background: var(--linea); }
.puntos i.on { background: var(--acento); width: 44px; border-radius: 7px; }
.dispositivo { position: absolute; z-index: 1; }
.dispositivo.movil { left: 1170px; top: 110px; }
.dispositivo.web, .dispositivo.tele { left: 720px; top: 50%; margin-top: -330px; }
.dispositivo .pantalla { position: relative; filter: drop-shadow(0 40px 50px rgba(60, 30, 15, .28)); }
.dispositivo img { width: 100%; height: 100%; display: block; }
.decor { position: absolute; z-index: 0; }
.decor.movil { left: 1010px; top: 150px; width: 760px; height: 760px; }
.decor.web, .decor.tele { left: 960px; top: 130px; width: 820px; height: 820px; }
.decor > div { width: 100%; height: 100%; background: var(--suave); border-radius: 80px; }

/* Marcas: anillo que resalta y dedo que pulsa */
.anillo { position: absolute; border: 6px solid var(--acento); border-radius: 22px; }
.dedo { position: absolute; width: 74px; height: 74px; border-radius: 50%; background: rgba(30, 37, 50, .55); border: 4px solid #fff; box-shadow: 0 6px 18px rgba(0,0,0,.3); }
.onda { position: absolute; width: 150px; height: 150px; border-radius: 50%; border: 5px solid var(--acento); }

/* Cierre */
.cierre-txt { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; text-align: center; gap: 22px; }
.logo-grande { width: 150px; height: 150px; border-radius: 38px; background: #fff; color: var(--acento); display: grid; place-items: center; }
.logo-grande > span { width: 80px; height: 80px; display: block; }
.marca-grande { font: 700 190px/1 "Fraunces", Georgia, serif; letter-spacing: -.02em; }
.lema { font: italic 500 52px/1.2 "Fraunces", Georgia, serif; }
.chips-cierre { display: flex; gap: 16px; margin-top: 20px; }
.chip-cierre { font: 600 26px/1 "Inter", sans-serif; padding: 16px 26px; border-radius: 999px; border: 2px solid rgba(255,255,255,.7); }
.chip-cierre.actual { background: #fff; color: var(--acento); border-color: #fff; }
.pie-cierre { margin-top: 20px; font: 500 20px/1 "JetBrains Mono", monospace; letter-spacing: .14em; text-transform: uppercase; opacity: .9; }

/* Barra de progreso del anuncio */
.progreso { position: absolute; left: 0; bottom: 0; height: 8px; width: 100%; background: var(--tinta); opacity: .55; transform-origin: 0 50%; z-index: 9; }

@keyframes aparecer { from { opacity: 0; } to { opacity: 1; } }
@keyframes desaparecer { to { opacity: 0; } }
@keyframes cortina { from { clip-path: inset(0 0 0 100%); } to { clip-path: inset(0 0 0 0); } }
@keyframes subir { from { opacity: 0; transform: translateY(50px); } to { opacity: 1; transform: none; } }
@keyframes subirPalabra { from { transform: translateY(115%) rotate(5deg); } to { transform: none; } }
@keyframes entrarDispositivo { from { opacity: 0; transform: translateY(180px) rotate(5deg) scale(.94); } to { opacity: 1; transform: none; } }
@keyframes flotar { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-16px); } }
@keyframes aparecerPantalla { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: none; } }
@keyframes pop { 0% { opacity: 0; transform: scale(.5); } 60% { opacity: 1; transform: scale(1.1); } 100% { opacity: 1; transform: scale(1); } }
@keyframes sacudir { 0%, 100% { transform: rotate(0) scale(1); } 25% { transform: rotate(-12deg) scale(1.12); } 50% { transform: rotate(10deg) scale(1.12); } 75% { transform: rotate(-6deg) scale(1.05); } }
@keyframes deriva { from { transform: translate(0, 0); } to { transform: translate(-240px, 120px); } }
@keyframes crecer { from { opacity: 0; transform: scale(.4) rotate(45deg); } to { opacity: 1; transform: scale(1) rotate(45deg); } }
@keyframes girar { to { transform: rotate(360deg); } }
@keyframes anilloEntra { from { opacity: 0; transform: scale(1.18); } to { opacity: 1; transform: none; } }
@keyframes pulso { 0% { box-shadow: 0 0 0 0 rgba(184, 73, 43, .45); } 100% { box-shadow: 0 0 0 22px rgba(184, 73, 43, 0); } }
@keyframes dedo { 0% { opacity: 0; transform: translate(-50%, -50%) scale(1.7); } 30% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(.8); } 75% { opacity: 1; transform: translate(-50%, -50%) scale(1); } 100% { opacity: 0; transform: translate(-50%, -50%) scale(1); } }
@keyframes onda { from { opacity: .8; transform: translate(-50%, -50%) scale(.25); } to { opacity: 0; transform: translate(-50%, -50%) scale(1.5); } }
@keyframes barra { from { transform: scaleX(0); } to { transform: scaleX(1); } }
</style></head><body>
${partes}
<div class="progreso" style="${anims(a('barra', total, 0, { ease: 'linear' }))}"></div>
<script>
  // Contadores numéricos (no se pueden animar con CSS)
  window.alTiempo = t => {
    for (const el of document.querySelectorAll('[data-contar]')) {
      const p = Math.min(1, Math.max(0, (t - +el.dataset.t0) / +el.dataset.dur));
      el.textContent = Math.round(+el.dataset.contar * (1 - Math.pow(1 - p, 3)));
    }
  };
</script>
</body></html>` };
}

// --------------------------------------------------------------------------- render
async function congelar(page, t) {
  await page.evaluate(t => {
    for (const an of document.getAnimations()) { an.pause(); an.currentTime = t * 1000; }
    window.alTiempo(t);
  }, t);
}

async function renderizar(browser, clave, tam) {
  const g = GUIONES[clave];
  const { html: pagina, total, escenas } = html(clave, g, tam);
  fs.mkdirSync(TMP, { recursive: true });
  const archivoHtml = path.join(TMP, `${clave}.html`);
  fs.writeFileSync(archivoHtml, pagina);

  const page = await browser.newPage({ viewport: { width: ANCHO, height: ALTO }, deviceScaleFactor: 1 });
  await page.goto('file://' + archivoHtml, { waitUntil: 'networkidle' });
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(i => i.decode())); });

  if (PREVIA) {
    const instantes = escenas.map(s => +(s.ini + Math.min(2.6, s.dur - 0.5)).toFixed(2));
    for (const t of instantes) {
      await congelar(page, t);
      await page.screenshot({ path: path.join(TMP, `${clave}-${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 80 });
    }
    console.log(`${clave}: ${total}s · previas en ${path.relative(RAIZ, TMP)}`);
    await page.close();
    return;
  }

  // Música
  const linea = {
    total,
    inicio_musica: escenas[1].ini,
    inicio_cierre: escenas[escenas.length - 1].ini,
    transiciones: escenas.slice(1).map(s => s.ini),
  };
  const jsonLinea = path.join(TMP, `${clave}.json`);
  const wav = path.join(TMP, `${clave}.wav`);
  fs.writeFileSync(jsonLinea, JSON.stringify(linea));
  execFileSync('python3', [path.join(AQUI, 'musica.py'), jsonLinea, wav], { stdio: 'inherit' });

  // Fotogramas → ffmpeg
  const salida = path.join(SALIDA, `claxon-${clave}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', salida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const terminado = new Promise((ok, mal) => ff.on('close', c => (c === 0 ? ok() : mal(new Error('ffmpeg ' + c)))));
  const fotogramas = Math.round(total * FPS);
  const inicio = Date.now();
  for (let f = 0; f < fotogramas; f++) {
    await congelar(page, f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (f % 150 === 0) process.stdout.write(`\r${clave}: ${f}/${fotogramas} fotogramas`);
  }
  ff.stdin.end();
  await terminado;
  await page.close();
  const mb = (fs.statSync(salida).size / 1048576).toFixed(1);
  console.log(`\r${clave}: ${fotogramas} fotogramas · ${total}s · ${mb} MB · ${((Date.now() - inicio) / 1000).toFixed(0)}s de render → ${path.relative(RAIZ, salida)}`);
}

(async () => {
  const browser = await chromium.launch();
  try {
    const tam = await medirMarcas(browser);
    for (const clave of elegidos) {
      if (!GUIONES[clave]) throw new Error(`Perfil desconocido: ${clave}`);
      await renderizar(browser, clave, tam);
    }
  } finally {
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exit(1); });
