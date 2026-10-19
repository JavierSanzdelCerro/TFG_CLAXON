// Saca un PNG de cada pantalla del catálogo → docs/interfaces/png/<nombre>.png
// Uso: node capturar.js [filtro]      (necesita Playwright: npm i -D playwright)
const path = require('path');
const fs = require('fs');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

(async () => {
  const filtro = process.argv[2] || '';
  const catalogo = path.resolve(__dirname, '..', 'interfaces-claxon.html');
  const salida = path.resolve(__dirname, '..', 'png');
  fs.mkdirSync(salida, { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, deviceScaleFactor: 2, colorScheme: 'light' });
  const errores = [];
  page.on('pageerror', e => errores.push(String(e)));
  page.on('console', m => m.type() === 'error' && errores.push(m.text()));
  await page.goto('file://' + catalogo, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const figuras = await page.$$('figure.pantalla[data-png]');
  let n = 0;
  for (const fig of figuras) {
    const nombre = await fig.getAttribute('data-png');
    if (filtro && !nombre.includes(filtro)) continue;
    const disp = await fig.$('.movil, .navegador, .tele');
    await disp.screenshot({ path: path.join(salida, nombre + '.png'), omitBackground: true });
    // Comprobar que nada se sale por abajo dentro de la pantalla
    const desborde = await disp.evaluate(d => {
      const p = d.querySelector('.pantalla-app, .web, .tablon, .contenido-web') || d;
      const zonas = d.querySelectorAll('.cuerpo, .contenido-web, .cuerpot');
      return [...zonas].filter(z => z.scrollHeight > z.clientHeight + 2).map(z => z.className + ' +' + (z.scrollHeight - z.clientHeight) + 'px');
    });
    if (desborde.length) console.log('  ⚠', nombre, 'contenido cortado:', desborde.join(', '));
    n++;
  }
  console.log(`${n} capturas en docs/interfaces/png` + (errores.length ? ` · errores: ${errores.join(' | ')}` : ''));
  await browser.close();
})();
