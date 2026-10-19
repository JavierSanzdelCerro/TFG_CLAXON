// Vídeos de Claxon en formato «grabación de pantalla», uno por perfil.
//
//   node grabar.js                    → los cuatro
//   node grabar.js vecino             → solo uno
//   node grabar.js vecino --previa    → fotogramas sueltos para revisar (sin vídeo)
//
// Monta la app con el HTML real de las pantallas (del catálogo de interfaces),
// ejecuta el guion de cada perfil (grabaciones/<perfil>.js) con el motor
// (grabaciones/motor.js) y graba fotograma a fotograma con Playwright + ffmpeg.
// El sonido (música suave, toques, teclas, notificaciones y claxon) lo genera
// grabaciones/sonido.py a partir de los eventos del guion.
const fs = require('fs');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const AQUI = __dirname;
const RAIZ = path.resolve(AQUI, '..', '..', '..');
const CATALOGO = path.join(RAIZ, 'docs', 'interfaces', 'interfaces-claxon.html');
const SALIDA = path.resolve(AQUI, '..');
const TMP = path.join(AQUI, '.tmp');
const FPS = 30;

const PERFILES = {
  vecino:       { tipo: 'movil', pantallas: ['17-notificaciones', '05-vecino-hoy', '06-vecino-servicio', '07-vecino-encargo-catalogo', '08-vecino-encargo-revisar', '09-vecino-encargo-enviado', '10-vecino-mis-encargos', '12-vecino-avisos', '13-vecino-aviso-detalle', '16-vecino-ajustes'] },
  familiar:     { tipo: 'movil', pantallas: ['18-familiar-inicio', '19-familiar-sin-movil', '07-vecino-encargo-catalogo', '08-vecino-encargo-revisar', '09-vecino-encargo-enviado', '20-familiar-vincular'] },
  vendedor:     { tipo: 'movil', pantallas: ['22-vendedor-iniciar-ruta', '23-vendedor-ruta-en-curso', '24-vendedor-retraso', '26-vendedor-encargos', '25-vendedor-en-parada', '28-vendedor-catalogo'] },
  ayuntamiento: { tipo: 'escritorio', pantallas: ['29-ayuntamiento-inicio', '31-ayuntamiento-consulta', '32-ayuntamiento-avisos', '30-ayuntamiento-nuevo-aviso', '34-tablon-bar'] },
};
const VISTA = { movil: { w: 390, h: 844, dsf: 3 }, escritorio: { w: 1280, h: 800, dsf: 1.5 } };

const args = process.argv.slice(2);
const PREVIA = args.includes('--previa');
const elegidos = args.filter(a => !a.startsWith('--')).length ? args.filter(a => !a.startsWith('--')) : Object.keys(PERFILES);

// ------------------------------------------------------------------ extraer pantallas del catálogo
async function extraer(browser) {
  const page = await browser.newPage();
  await page.goto('file://' + CATALOGO, { waitUntil: 'networkidle' });
  const todas = [...new Set(Object.values(PERFILES).flatMap(p => p.pantallas))];
  const r = await page.evaluate(todas => {
    const css = document.querySelector('style').textContent;
    const sprite = document.querySelector('body > svg').outerHTML;
    const pantallas = {};
    for (const png of todas) {
      const fig = document.querySelector(`figure[data-png="${png}"]`);
      const el = fig.querySelector('.pantalla-app') || fig.querySelector('.navegador') || fig.querySelector('.tablon');
      pantallas[png] = { html: el.outerHTML, tipo: el.className.split(' ')[0] };
    }
    const barra = document.querySelector('.navegador > .barra').outerHTML;
    return { css, sprite, pantallas, barra };
  }, todas);
  await page.close();
  return r;
}

// ------------------------------------------------------------------ página de la grabación
function pagina(perfil, ext) {
  const cfg = PERFILES[perfil], v = VISTA[cfg.tipo];
  const capas = cfg.pantallas.map(png => {
    let { html, tipo } = ext.pantallas[png];
    if (tipo === 'tablon') {
      const barra = ext.barra.replace(/panel\.claxon\.app[^<]*/, 'tablon.claxon.app/fuenferrada');
      html = `<div class="navegador">${barra}<div class="fondo-tablon">${html}</div></div>`;
    }
    const clave = png.slice(0, 2);
    return `<div class="capa" data-capa="${clave}">${html}</div>`;
  }).join('\n');
  const cursor = `<svg viewBox="0 0 24 24" width="28" height="28"><path d="M4 2 L4 19 L8.6 14.8 L11.6 21.6 L14.6 20.3 L11.7 13.6 L18 13.6 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,700;1,9..144,500&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&display=swap">
<style>
${ext.css}
/* ---- Modo grabación ---- */
html, body { margin: 0; padding: 0; width: ${v.w}px; height: ${v.h}px; overflow: hidden; background: #0d0f13; }
.capa { position: absolute; left: 0; top: 0; width: ${v.w}px; height: ${v.h}px; overflow: hidden; visibility: hidden; background: var(--a-fondo); }
.capa.ver { visibility: visible; }
.capa > .pantalla-app { border-radius: 0; width: ${v.w}px; height: ${v.h}px; }
.capa > .navegador { border-radius: 0; box-shadow: none; width: ${v.w}px; height: ${v.h}px; }
.fondo-tablon { flex: 1; display: grid; place-items: center; background: #1b1d22; }
.fondo-tablon .tablon { border-radius: 0; }
/* Indicador rojo de grabación de pantalla en la hora */
.estado > span:first-child { background: #E5372E; color: #fff; border-radius: 12px; padding: 4px 9px; margin-left: -9px; }
#superior { position: absolute; inset: 0; z-index: 4000; pointer-events: none; }
#toque { position: absolute; z-index: 6000; width: 58px; height: 58px; margin: -29px 0 0 -29px; border-radius: 50%; background: rgba(110, 112, 122, .5); border: 2px solid rgba(255, 255, 255, .85); box-shadow: 0 2px 8px rgba(0,0,0,.25); opacity: 0; pointer-events: none; }
#cursor { position: absolute; left: 0; top: 0; z-index: 6001; transform: translate(760px, 470px); pointer-events: none; filter: drop-shadow(0 2px 2px rgba(0,0,0,.35)); }
#onda { position: absolute; z-index: 6000; width: 44px; height: 44px; margin: -22px 0 0 -22px; border-radius: 50%; border: 3px solid var(--a-acento); opacity: 0; pointer-events: none; }
.pulsado { filter: brightness(.9); transform: scale(.97); }
.boton, .fila, .tarjeta, .chip, .radio, .producto, .push, .lateral a { transition: none; }
.interruptor, .interruptor::after { transition: all .22s ease; }
.banner { position: absolute; top: 46px; left: 8px; right: 8px; background: rgba(250, 247, 242, .97); border: 1px solid var(--a-linea); box-shadow: 0 14px 34px -10px rgba(0,0,0,.35); }
.toast { position: absolute; left: 50%; bottom: ${cfg.tipo === 'movil' ? 120 : 48}px; transform: translateX(-50%); background: rgba(30, 37, 50, .95); color: #fff; font: 600 ${cfg.tipo === 'movil' ? 15 : 16}px/1.3 var(--f-texto); padding: 13px 20px; border-radius: 999px; white-space: nowrap; display: flex; gap: 8px; align-items: center; box-shadow: 0 10px 30px -8px rgba(0,0,0,.4); }
.toast .i { width: 18px; height: 18px; color: #8FD3A0; }
.caret { display: inline-block; width: 2px; height: 1.1em; background: var(--a-acento); vertical-align: -0.18em; margin-left: 1px; animation: parpadeo 1s steps(1) infinite; }
.spin { display: inline-block; width: 22px; height: 22px; border: 3px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: girarSpin .7s linear infinite; }
.boton.sec .spin, .boton.mini.sec .spin { border-color: rgba(0,0,0,.15); border-top-color: var(--a-acento); }
.desplegable { position: absolute; z-index: 50; background: #fff; border: 1px solid var(--a-linea); border-radius: 12px; box-shadow: 0 16px 40px -12px rgba(0,0,0,.3); padding: 6px; display: grid; gap: 2px; font-size: 15px; }
.desplegable span { padding: 9px 12px; border-radius: 8px; }
.desplegable span.sobre { background: var(--a-suave); }
.ph { color: #9A9EA8; }
.push-entra { animation: pushEntra .4s cubic-bezier(.2,.8,.2,1) both; }
.push-sale { animation: pushSale .4s cubic-bezier(.2,.8,.2,1) both; }
.pop-entra { animation: popEntra .4s cubic-bezier(.2,.8,.2,1) both; }
.pop-sale { animation: popSale .4s cubic-bezier(.2,.8,.2,1) both; }
.fundido-entra { animation: aparecer .3s ease both; }
.sube-entra { animation: subeEntra .42s cubic-bezier(.2,.8,.2,1) both; }
.banner-entra { animation: bannerEntra .45s cubic-bezier(.2,.9,.25,1.1) both; }
.banner-sale { animation: bannerSale .4s ease-in both; }
.toast-entra { animation: toastEntra .35s cubic-bezier(.2,.8,.2,1) both; }
.toast-sale { animation: toastSale .3s ease-in both; }
.destello { animation: destello 1.1s ease both; }
.salta { animation: salta .5s cubic-bezier(.2,.8,.2,1.4) both; }
.entra-abajo { animation: entraAbajo .45s cubic-bezier(.2,.8,.2,1) both; }
@keyframes pushEntra { from { transform: translateX(100%); box-shadow: -10px 0 30px rgba(0,0,0,.15); } to { transform: none; } }
@keyframes pushSale { from { transform: none; filter: brightness(1); } to { transform: translateX(-28%); filter: brightness(.85); } }
@keyframes popEntra { from { transform: translateX(-28%); filter: brightness(.85); } to { transform: none; filter: brightness(1); } }
@keyframes popSale { from { transform: none; } to { transform: translateX(100%); } }
@keyframes aparecer { from { opacity: 0; } to { opacity: 1; } }
@keyframes subeEntra { from { transform: translateY(100%); } to { transform: none; } }
@keyframes bannerEntra { from { transform: translateY(-160%); } to { transform: none; } }
@keyframes bannerSale { from { transform: none; } to { transform: translateY(-160%); } }
@keyframes toastEntra { from { opacity: 0; transform: translate(-50%, 20px); } to { opacity: 1; transform: translate(-50%, 0); } }
@keyframes toastSale { from { opacity: 1; transform: translate(-50%, 0); } to { opacity: 0; transform: translate(-50%, 10px); } }
@keyframes destello { 0% { background-color: rgba(184, 73, 43, .28); } 100% { background-color: rgba(184, 73, 43, 0); } }
@keyframes salta { 0% { transform: scale(.3); opacity: 0; } 70% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
@keyframes entraAbajo { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@keyframes parpadeo { 0% { opacity: 1; } 50% { opacity: 0; } }
@keyframes girarSpin { to { transform: rotate(360deg); } }
</style></head><body>
${ext.sprite}
<div id="pantalla">${capas}</div>
<div id="superior"></div>
<div id="toque"></div>
<div id="onda"></div>
${cfg.tipo === 'escritorio' ? `<div id="cursor">${cursor}</div>` : ''}
<script>window.ICONO_CLAXON = '<svg class="i s" aria-hidden="true"><use href="#i-volume-2"/></svg>';</script>
</body></html>`;
}

// ------------------------------------------------------------------ grabar
async function grabar(browser, perfil, ext) {
  const cfg = PERFILES[perfil], v = VISTA[cfg.tipo];
  fs.mkdirSync(TMP, { recursive: true });
  const archivo = path.join(TMP, `grabacion-${perfil}.html`);
  fs.writeFileSync(archivo, pagina(perfil, ext));
  const page = await browser.newPage({ viewport: { width: v.w, height: v.h }, deviceScaleFactor: v.dsf });
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  await page.goto('file://' + archivo, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.addScriptTag({ path: path.join(AQUI, 'grabaciones', 'motor.js') });
  await page.evaluate(() => {
    for (const c of document.querySelectorAll('.capa')) M.capas[c.dataset.capa] = c;
  });
  await page.addScriptTag({ path: path.join(AQUI, 'grabaciones', `${perfil}.js`) });
  const total = await page.evaluate(tipo => { M.escritorio = tipo === 'escritorio'; return window.guion(M); }, cfg.tipo);
  if (errores.length) throw new Error(errores.join('\n'));

  const fotogramas = Math.round(total * FPS);
  const avanzar = async t => {
    await page.evaluate(t => M.avanzar(t), t);
    if (errores.length) throw new Error(`t=${t.toFixed(2)}: ${errores.join('\n')}`);
  };

  if (PREVIA) {
    const cada = 1.5;
    for (let f = 0; f < fotogramas; f++) {
      const t = f / FPS;
      await avanzar(t);
      if (f % Math.round(cada * FPS) === Math.round(cada * FPS) - 1) {
        await page.screenshot({ path: path.join(TMP, `${perfil}-${t.toFixed(1).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 75 });
      }
    }
    console.log(`${perfil}: ${total}s · previas cada ${cada}s en ${path.relative(RAIZ, TMP)}`);
    await page.close();
    return;
  }

  // Sonido
  const eventos = await page.evaluate(() => M.eventos);
  const json = path.join(TMP, `grabacion-${perfil}.json`);
  const wav = path.join(TMP, `grabacion-${perfil}.wav`);
  fs.writeFileSync(json, JSON.stringify({ total, eventos }));
  execFileSync('python3', [path.join(AQUI, 'grabaciones', 'sonido.py'), json, wav], { stdio: 'inherit' });

  const salida = path.join(SALIDA, `claxon-${perfil}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-i', wav, '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', salida], { stdio: ['pipe', 'inherit', 'inherit'] });
  const fin = new Promise((ok, mal) => ff.on('close', c => (c === 0 ? ok() : mal(new Error('ffmpeg ' + c)))));
  const inicio = Date.now();
  for (let f = 0; f < fotogramas; f++) {
    await avanzar(f / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end();
  await fin;
  await page.close();
  console.log(`${perfil}: ${total}s · ${(fs.statSync(salida).size / 1048576).toFixed(1)} MB · ${((Date.now() - inicio) / 1000).toFixed(0)}s → ${path.relative(RAIZ, salida)}`);
}

(async () => {
  const browser = await chromium.launch();
  try {
    const ext = await extraer(browser);
    for (const p of elegidos) {
      if (!PERFILES[p]) throw new Error('Perfil desconocido: ' + p);
      await grabar(browser, p, ext);
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exit(1); });
