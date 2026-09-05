const fs=require('fs');
const app=fs.readFileSync('js/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/ui-v048.css','utf8');
const version=fs.readFileSync('js/version.js','utf8');
const checks=[
  ['priority strip',app.includes('v45-priority-strip')],
  ['progressive market filters',app.includes('market-filter-panel')],
  ['area hub',app.includes('v45-area-hub')],
  ['mobile target sizes',css.includes('min-height:44px')],
  ['new visual stylesheet',html.includes('css/ui-v048.css?v=v048')],
  ['version',version.includes("label:'v0.48 Beta'")]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
if(failed.length)throw new Error(`Faltan mejoras visuales: ${failed.join(', ')}`);
console.log(JSON.stringify({designChecks:checks.map(([name])=>name),ok:true},null,2));
