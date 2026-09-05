const fs=require('fs');
const app=fs.readFileSync('js/app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('css/ui-v046.css','utf8');
const version=fs.readFileSync('js/version.js','utf8');
const checks=[
  ['tutorial',app.includes('maybeShowV46Tutorial')&&app.includes('openV46Tutorial')&&app.includes('finishV46Tutorial')],
  ['tactical guidance',app.includes('tacticalGuidanceV46')&&app.includes('Impacto previsto del estilo')],
  ['staff impact',app.includes('staffImpactV46')&&app.includes('Impacto actual del staff')],
  ['locker dynamics',app.includes('lockerDynamicsV46')&&app.includes('Dinámica del vestuario')],
  ['season narrative',app.includes('recordSeasonNarrativeV46')&&app.includes('El vestuario cree en el proyecto')],
  ['visual layer',html.includes('css/ui-v046.css?v=v046')&&css.includes('v46-tutorial-grid')],
  ['version/cache',version.includes("label:'v0.48 Beta'")&&version.includes('basketball-gm-beta-v048')]
];
const failed=checks.filter(([,ok])=>!ok).map(([name])=>name);
if(failed.length)throw new Error(`Faltan mejoras v0.46: ${failed.join(', ')}`);
console.log(JSON.stringify({checks:checks.map(([name])=>name),ok:true},null,2));
