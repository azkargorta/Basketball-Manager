const fs=require('fs'),vm=require('vm');
const app=fs.readFileSync(`${__dirname}/js/app.js`,'utf8');
const effects=[...new Set([...app.matchAll(/effect:'([A-Z0-9_]+)'/g)].map(x=>x[1]))];
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
console.warn=()=>{};
vm.runInThisContext(fs.readFileSync(__dirname+'/js/engine.js','utf8'),{filename:'engine.js'});
vm.runInThisContext(fs.readFileSync(__dirname+'/js/data.js','utf8'),{filename:'data.js'});
vm.runInThisContext(app,{filename:'app.js'});
const detail=globalThis.BBGM_APP_TEST.decisionChoiceDetail,missing=[];
for(const effect of effects){
  const text=detail(effect);
  if(!text||text==='No hay una previsión disponible para esta opción.'||text.includes('se aplicará inmediatamente'))missing.push(effect);
}
if(missing.length)throw new Error(`Opciones sin explicación específica: ${missing.join(', ')}`);
console.log(JSON.stringify({effects:effects.length,specificDetails:effects.length,missing,version:'v0.42',ok:true},null,2));
