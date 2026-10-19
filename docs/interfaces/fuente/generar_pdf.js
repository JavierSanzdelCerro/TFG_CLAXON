// Genera docs/interfaces/interfaces-claxon.pdf con todas las pantallas (A4 apaisado).
// Usa las capturas de docs/interfaces/png y los textos de fuente/pantallas/*.html.
// Uso: node generar_pdf.js        (antes: python3 construir.py && node capturar.js)
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node22/lib/node_modules/playwright')); }

const AQUI = __dirname;
const PNG = path.resolve(AQUI, '..', 'png');
const SALIDA = path.resolve(AQUI, '..', 'interfaces-claxon.pdf');
const MOVILES_POR_PAGINA = 4;

const texto = h => h.replace(/<code>(.*?)<\/code>/g, '$1').replace(/<[^>]+>/g, '').trim();
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// 1. Leer grupos y pantallas del código fuente del catálogo
const fuente = fs.readdirSync(path.join(AQUI, 'pantallas')).sort()
  .map(f => fs.readFileSync(path.join(AQUI, 'pantallas', f), 'utf8')).join('\n');
const grupos = [...fuente.matchAll(/<section class="grupo" id="([^"]+)">([\s\S]*?)<\/section>/g)].map(([, id, b]) => ({
  id,
  ceja: texto(b.match(/<div class="ceja">([\s\S]*?)<\/div>/)[1]),
  titulo: texto(b.match(/<h2>([\s\S]*?)<\/h2>/)[1]),
  desc: texto(b.match(/<header>[\s\S]*?<p>([\s\S]*?)<\/p>/)[1]),
  anchas: b.includes('pantallas anchas'),
  pantallas: [...b.matchAll(/<figure class="pantalla" data-png="([^"]+)">[\s\S]*?<figcaption><b>(.*?)<\/b><strong>(.*?)<\/strong><span>([\s\S]*?)<\/span><\/figcaption>/g)]
    .map(([, png, num, nombre, expl]) => ({ png, num: texto(num), nombre: texto(nombre), expl: texto(expl) })),
}));
const total = grupos.reduce((n, g) => n + g.pantallas.length, 0);

// 2. Repartir en páginas (portada = 1, índice = 2)
const paginas = [];
for (const g of grupos) {
  const trozo = g.anchas ? 1 : MOVILES_POR_PAGINA;
  for (let i = 0; i < g.pantallas.length; i += trozo) {
    paginas.push({ grupo: g, primera: i === 0, pantallas: g.pantallas.slice(i, i + trozo) });
  }
}
const numPag = {};
paginas.forEach((p, i) => p.pantallas.forEach(s => { numPag[s.png] = i + 3; }));

const img = png => 'file://' + path.join(PNG, png + '.png');
const pie = n => `<footer><span>Claxon · Interfaces con datos demo</span><span>${n}</span></footer>`;

const cabecera = (g, primera) => primera
  ? `<header class="cab-grupo"><div class="ceja">${esc(g.ceja)}</div><h2>${esc(g.titulo)}</h2><p>${esc(g.desc)}</p></header>`
  : `<header class="cab-grupo corta"><div class="ceja">${esc(g.ceja)}</div><h2>${esc(g.titulo)} <span>· continuación</span></h2></header>`;

const htmlPaginas = paginas.map((p, i) => {
  const n = i + 3;
  if (p.grupo.anchas) {
    const s = p.pantallas[0];
    return `<section class="pagina">${cabecera(p.grupo, p.primera)}
      <figure class="ancha"><img src="${img(s.png)}" alt=""><figcaption><b>${esc(s.num)}</b><strong>${esc(s.nombre)}</strong><span>${esc(s.expl)}</span></figcaption></figure>
      ${pie(n)}</section>`;
  }
  return `<section class="pagina">${cabecera(p.grupo, p.primera)}
    <div class="moviles ${p.primera ? '' : 'altos'}">${p.pantallas.map(s => `<figure><img src="${img(s.png)}" alt="">
      <figcaption><b>${esc(s.num)}</b><strong>${esc(s.nombre)}</strong><span>${esc(s.expl)}</span></figcaption></figure>`).join('')}</div>
    ${pie(n)}</section>`;
}).join('\n');

const indice = grupos.map(g => `<div class="ind-grupo"><div class="ceja">${esc(g.ceja)}</div><h3>${esc(g.titulo)}</h3><ol>${
  g.pantallas.map(s => `<li><span>${esc(s.num.split(' · ')[0])} · ${esc(s.nombre)}</span><i></i><b>${numPag[s.png]}</b></li>`).join('')}</ol></div>`).join('');

const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;1,9..144,500&family=Inter:wght@400;600;700&family=JetBrains+Mono:wght@500&display=swap">
<style>
@page { size: A4 landscape; margin: 0; }
* { box-sizing: border-box; }
:root { --acento: #B8492B; --tinta: #1E2532; --tenue: #5E6472; --papel: #FAF6F0; --linea: #E6DCCF; }
body { margin: 0; font: 9pt/1.4 "Inter", system-ui, sans-serif; color: var(--tinta); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.pagina { width: 297mm; height: 210mm; padding: 12mm 15mm 9mm; display: flex; flex-direction: column; background: var(--papel); page-break-after: always; overflow: hidden; position: relative; }
.ceja { font: 500 7.5pt/1 "JetBrains Mono", monospace; letter-spacing: .16em; text-transform: uppercase; color: var(--acento); display: flex; gap: 2mm; align-items: center; }
.ceja::before { content: ""; width: 2.2mm; height: 2.2mm; background: currentColor; transform: rotate(45deg); }
.cab-grupo { display: grid; gap: 1.5mm; margin-bottom: 5mm; }
.cab-grupo h2 { margin: 0; font: 700 20pt/1.1 "Fraunces", Georgia, serif; }
.cab-grupo h2 span { font-weight: 500; color: var(--tenue); font-size: 13pt; font-style: italic; }
.cab-grupo p { margin: 0; color: var(--tenue); font-size: 9.5pt; max-width: 200mm; }
.cab-grupo.corta { margin-bottom: 4mm; }
.cab-grupo.corta h2 { font-size: 15pt; }
footer { margin-top: auto; display: flex; justify-content: space-between; font: 500 7pt/1 "JetBrains Mono", monospace; letter-spacing: .08em; color: var(--tenue); padding-top: 3mm; border-top: .3mm solid var(--linea); }
.moviles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7mm; align-items: start; }
.moviles figure { margin: 0; display: grid; gap: 2.5mm; justify-items: center; }
.moviles img { height: 118mm; width: auto; }
.moviles.altos img { height: 128mm; }
figcaption { display: grid; gap: .6mm; width: 100%; }
figcaption b { font: 500 6.8pt/1.2 "JetBrains Mono", monospace; letter-spacing: .1em; text-transform: uppercase; color: var(--acento); }
figcaption strong { font-size: 9.5pt; }
figcaption span { color: var(--tenue); font-size: 7.6pt; line-height: 1.35; }
figure.ancha { margin: 0; display: grid; grid-template-columns: auto 52mm; gap: 7mm; align-items: center; flex: 1; min-height: 0; }
figure.ancha img { max-height: 148mm; max-width: 205mm; width: auto; height: auto; justify-self: center; }
figure.ancha figcaption strong { font: 700 14pt/1.2 "Fraunces", Georgia, serif; }
figure.ancha figcaption span { font-size: 9pt; }
/* Portada */
.portada { background: var(--acento); color: #fff; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 10mm; padding: 18mm 18mm; }
.portada .ceja { color: #fff; }
.portada h1 { margin: 6mm 0 0; font: 700 64pt/1 "Fraunces", Georgia, serif; }
.portada .lema { font: italic 500 18pt/1.25 "Fraunces", Georgia, serif; margin-top: 3mm; }
.portada .que { margin-top: 12mm; font-size: 13pt; line-height: 1.45; max-width: 120mm; }
.portada .datos { margin-top: 10mm; font: 500 8pt/1.8 "JetBrains Mono", monospace; letter-spacing: .1em; text-transform: uppercase; opacity: .9; }
.portada .trio { display: flex; gap: 5mm; align-items: flex-end; }
.portada .trio img { height: 120mm; }
.portada .trio img:nth-child(2) { height: 140mm; }
/* Índice */
.indice h2 { margin: 0 0 6mm; font: 700 24pt/1 "Fraunces", Georgia, serif; }
.columnas { columns: 3; column-gap: 10mm; }
.ind-grupo { break-inside: avoid; margin-bottom: 5mm; }
.ind-grupo h3 { margin: 1mm 0 1.5mm; font: 700 11pt/1.2 "Fraunces", Georgia, serif; }
.ind-grupo ol { list-style: none; margin: 0; padding: 0; }
.ind-grupo li { display: flex; gap: 2mm; align-items: baseline; font-size: 8.3pt; padding: .5mm 0; }
.ind-grupo li i { flex: 1; border-bottom: .3mm dotted #B9AE9F; transform: translateY(-1mm); }
.ind-grupo li b { font: 500 8pt "JetBrains Mono", monospace; }
</style></head><body>
<section class="pagina portada">
  <div>
    <div class="ceja">Proyecto final · 2.º DAM</div>
    <h1>Claxon</h1>
    <div class="lema">El radar de lo que pasa por tu pueblo</div>
    <p class="que">Interfaces de la app móvil, el panel web del ayuntamiento y el tablón del bar: ${total} pantallas con datos de ejemplo.</p>
    <div class="datos">Datos demo: lunes 19 de octubre · 10:25<br>Fuenferrada y Cuencas Mineras (Teruel)</div>
  </div>
  <div class="trio"><img src="${img('18-familiar-inicio')}" alt=""><img src="${img('05-vecino-hoy')}" alt=""><img src="${img('23-vendedor-ruta-en-curso')}" alt=""></div>
</section>
<section class="pagina indice">
  <div class="ceja">Contenido</div>
  <h2>Índice de pantallas</h2>
  <div class="columnas">${indice}</div>
  ${pie(2)}
</section>
${htmlPaginas}
</body></html>`;

(async () => {
  const tmp = path.join(AQUI, '.pdf-temporal.html');
  fs.writeFileSync(tmp, html);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('file://' + tmp, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.pdf({ path: SALIDA, format: 'A4', landscape: true, printBackground: true, preferCSSPageSize: true });
  await browser.close();
  fs.unlinkSync(tmp);
  console.log(`PDF generado: ${path.relative(path.resolve(AQUI, '..', '..', '..'), SALIDA)} · ${paginas.length + 2} páginas · ${(fs.statSync(SALIDA).size / 1048576).toFixed(1)} MB`);
})();
