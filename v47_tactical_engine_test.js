const fs=require('fs');
const app=fs.readFileSync('js/app.js','utf8'),eng=fs.readFileSync('js/engine.js','utf8'),v=fs.readFileSync('js/version.js','utf8'),h=fs.readFileSync('index.html','utf8'),sw=fs.readFileSync('sw.js','utf8');
const checks=[
 ['tactical pace',eng.includes(')-50)*.22')],
 ['pressure effect',eng.includes('pressure-50)*.0008')],
 ['perimeter effect',eng.includes('perimeterFocus-50)*.0035')],
 ['rebound effect',eng.includes('offensiveReboundEmphasis-50)*.0012')],
 ['coach match effect',app.includes('applyStaffMatchEffectsV47')],
 ['medical effect',app.includes('injuryRiskV47')],
 ['version/cache',v.includes("label:'v0.47 Beta'")&&h.includes('app.js?v=v047')&&sw.includes('basketball-gm-beta-v047')]
];
const failed=checks.filter(([,ok])=>!ok).map(([x])=>x);if(failed.length)throw new Error(failed.join(', '));console.log(JSON.stringify({checks:checks.map(([x])=>x),ok:true},null,2));