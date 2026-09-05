const fs=require('fs'),vm=require('vm');
const app=fs.readFileSync(`${__dirname}/js/app.js`,'utf8');
const version=fs.readFileSync(`${__dirname}/js/version.js`,'utf8');
const html=fs.readFileSync(`${__dirname}/index.html`,'utf8');
const sw=fs.readFileSync(`${__dirname}/sw.js`,'utf8');

for(const fn of ['pendingDecision','interruptForPendingDecision'])if(!app.includes(`function ${fn}(`))throw new Error(`Falta ${fn}`);
for(const fn of ['advanceToNextEvent','simulateToNextUserMatch','simulateToDate','advancePreseasonWeek','advanceOffseasonWeek']){
  const start=app.indexOf(`function ${fn}(`),body=app.slice(start,start+320);
  if(start<0||!body.includes('interruptForPendingDecision()'))throw new Error(`${fn} no bloquea decisiones pendientes`);
}
if(!app.includes("pending?'Resolver decisión':'Simular'")||!app.includes("pending?'Resolver decisión':'Siguiente partido'"))throw new Error('Los botones no avisan de la decisión pendiente');
if(!app.includes('setTimeout(()=>interruptForPendingDecision(false),0)'))throw new Error('La decisión nueva no aparece tras cerrar el resultado');
if(!app.includes('decisionPacing')||!app.includes('played%5!==0'))throw new Error('La frecuencia de decisiones no está limitada a cinco partidos');
if(!version.includes("label:'v0.43 Beta'")||!html.includes('js/app.js?v=v043')||!sw.includes('basketball-gm-beta-v043'))throw new Error('Versión o caché incorrectas');

globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
console.warn=()=>{};
vm.runInThisContext(fs.readFileSync(__dirname+'/js/engine.js','utf8'),{filename:'engine.js'});
vm.runInThisContext(fs.readFileSync(__dirname+'/js/data.js','utf8'),{filename:'data.js'});
vm.runInThisContext(app,{filename:'app.js'});
const A=globalThis.BBGM_APP_TEST;
A.setState({inbox:[{id:1,type:'RESULT',resolved:false},{id:2,type:'DECISION',resolved:false},{id:3,type:'DECISION',resolved:true}]});
if(A.pendingDecision()?.id!==2)throw new Error('No detecta la decisión sin resolver');
A.getState().inbox[1].resolved=true;
if(A.pendingDecision()!==null)throw new Error('Una decisión resuelta sigue bloqueando la simulación');
console.log(JSON.stringify({simulationBlocked:true,automaticNotice:true,resolvedAllowsContinue:true,version:'v0.43',ok:true},null,2));
