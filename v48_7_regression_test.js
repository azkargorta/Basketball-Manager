const fs=require('fs'),vm=require('vm');

const app=fs.readFileSync('js/app.js','utf8');
const version=fs.readFileSync('js/version.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');

if(app.includes('BBGM.teamOverall('))throw new Error('Decision Maker sigue llamando a BBGM.teamOverall, que no existe');
if(!app.includes('(cScore(home)-cScore(away))'))throw new Error('El marcador previo no usa el nivel real de los equipos');
if(!app.includes('date:addDays(startDate,4+i*5)'))throw new Error('Los amistosos pueden solaparse con el primer partido oficial');
if(!app.includes('const progressionDate=state.currentDate>nm.date?state.currentDate:nm.date'))throw new Error('Una partida antigua puede retroceder de fecha al jugar un partido pendiente');
if(!version.includes("label:'v0.48.7 Beta'")||!html.includes('js/app.js?v=v0487')||!sw.includes('basketball-gm-beta-v0487'))throw new Error('Versión o caché incorrectas');

globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
console.warn=()=>{};
vm.runInThisContext(fs.readFileSync('js/version.js','utf8'),{filename:'version.js'});
vm.runInThisContext(fs.readFileSync('js/engine.js','utf8'),{filename:'engine.js'});
vm.runInThisContext(fs.readFileSync('js/data.js','utf8'),{filename:'data.js'});
vm.runInThisContext(app,{filename:'app.js'});

const A=globalThis.BBGM_APP_TEST;
const world=globalThis.BBGM.createWorld();
A.setState({season:'2026/27',currentDate:'2026-09-01',userClubId:1,world});
const friendlies=A.createPreseasonFriendlies('2026/27','2026-09-01');
const dates=friendlies.map(x=>x.date);
if(JSON.stringify(dates)!==JSON.stringify(['2026-09-05','2026-09-10','2026-09-15']))throw new Error(`Calendario de pretemporada incorrecto: ${dates.join(', ')}`);
const opener={id:'SUPERCOPA-SF-1',homeClubId:1,awayClubId:2};
const live=A.matchDecisionLiveScoreV48(opener);
if(!Number.isFinite(live.home)||!Number.isFinite(live.away))throw new Error('El Decision Maker no puede calcular el marcador previo');

console.log(JSON.stringify({decisionScoreUsesExistingTeamRating:true,friendliesBeforeOfficialOpener:true,legacyDateDoesNotGoBackwards:true,version:'v0.48.7',ok:true},null,2));
