const fs = require('fs');

const read = file => fs.readFileSync(`${__dirname}/${file}`, 'utf8');
const app = read('js/app.js');
const html = read('index.html');
const visualLayers = ['ui-v033.css','ui-v034.css','ui-v035.css','ui-v045.css','ui-v046.css','ui-v047.css','ui-v048.css','ui-v049.css'];
const css = visualLayers.map(file=>read(`css/${file}`)).join('\n');
const sw = read('sw.js');

const bottomMarkup = app.match(/<nav class="bottom-nav"[\s\S]*?<\/nav>/)?.[0] || '';
const destinations = [...bottomMarkup.matchAll(/navButton\('([^']+)','([^']+)'/g)].map(m => [m[1], m[2]]);
const expected = [['home', 'Inicio'], ['squad', 'Equipo'], ['schedule', 'Partidos'], ['market', 'Mercado'], ['more', 'Más']];
if (JSON.stringify(destinations) !== JSON.stringify(expected)) {
  throw new Error(`Navegación móvil incorrecta: ${JSON.stringify(destinations)}`);
}

for (const view of ['academy', 'standings', 'stats']) {
  if (!app.includes(`data-more-view="${view}"`)) throw new Error(`Falta el acceso ${view} dentro de Más`);
}

const lastStyle = [...html.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)].at(-1)?.[1] || '';
if (!lastStyle.startsWith('css/ui-v049.css')) throw new Error('ui-v049.css debe ser la última capa visual');
for (const file of visualLayers) if (!sw.includes(`'./css/${file}'`)) throw new Error(`${file} no está disponible offline`);

const required = [
  'grid-template-columns: repeat(5, minmax(0, 1fr))',
  'env(safe-area-inset-top)',
  'env(safe-area-inset-bottom)',
  'min-height: 44px',
  ':focus-visible',
  'prefers-reduced-motion'
];
for (const token of required) if (!css.includes(token)) throw new Error(`Falta la regla móvil: ${token}`);

console.log(JSON.stringify({ navigation: destinations, shortcuts: 3, safeAreas: true, touchTarget: 44, reducedMotion: true, ok: true }, null, 2));
