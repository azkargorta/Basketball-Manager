const fs = require('fs');

const read = file => fs.readFileSync(`${__dirname}/${file}`, 'utf8');
const app = read('js/app.js');
const html = read('index.html');
const css = `${read('css/ui-v033.css')}\n${read('css/ui-v034.css')}`;
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
if (!lastStyle.startsWith('css/ui-v034.css')) throw new Error('ui-v034.css debe ser la última capa visual');
if (!sw.includes("'./css/ui-v033.css'") || !sw.includes("'./css/ui-v034.css'")) throw new Error('Las capas visuales no están disponibles offline');

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
