const fs=require('fs'),vm=require('vm');

const app=fs.readFileSync('js/app.js','utf8');
const version=fs.readFileSync('js/version.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const css=fs.readFileSync('css/ui-v049.css','utf8');

if(app.includes('BBGM.teamOverall('))throw new Error('Decision Maker sigue llamando a BBGM.teamOverall, que no existe');
if(!app.includes('projectedMatchResultV4811(m)')||!app.includes('BBGM.simulateMatch(club(m.homeClubId),club(m.awayClubId),matchSimulationSeedV4811(m))'))throw new Error('El marcador previo no usa la simulación real de los equipos');
if(!app.includes('date:addDays(startDate,4+i*5)'))throw new Error('Los amistosos pueden solaparse con el primer partido oficial');
if(!app.includes('const progressionDate=state.currentDate>nm.date?state.currentDate:nm.date'))throw new Error('Una partida antigua puede retroceder de fecha al jugar un partido pendiente');
if(!version.includes("label:'v0.48.12 Beta'")||!html.includes('js/app.js?v=v04812')||!sw.includes('basketball-gm-beta-v04812'))throw new Error('Versión o caché incorrectas');
if(!html.includes("serviceWorker.register('./sw.js?v=v04812', { updateViaCache: 'none' })")||!html.includes("addEventListener('controllerchange'"))throw new Error('La app instalada no activa y recarga la caché v0.48.12');
if(sw.includes('ignoreSearch:true')||!sw.includes('fetch(event.request)'))throw new Error('El service worker todavía puede mezclar archivos de distintas versiones');
if(app.includes('Decision Maker'))throw new Error('La ventana todavía muestra el nombre Decision Maker');
if(!app.includes('if(!isCloseMatchDecisionV4810({home:projected.homeScore,away:projected.awayScore}))return false'))throw new Error('La decisión puede aparecer con un marcador amplio');
if(!css.includes('grid-template-columns:minmax(0,1fr) auto')||!css.includes('overflow-x:hidden'))throw new Error('La decisión no está adaptada al ancho móvil');

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
if(!A.isCloseMatchDecisionV4810({home:74,away:70})||A.isCloseMatchDecisionV4810({home:74,away:59}))throw new Error('El filtro de partidos igualados no respeta el máximo de seis puntos');
A.getState().matchDecisionV48={pending:{matchId:opener.id,type:'LAST_SHOT',choice:'THREE',choiceLabel:'Buscar el triple',title:'Última posesión',clock:'0:08'},history:[{matchId:opener.id,type:'LAST_SHOT',choice:'THREE'}]};
const result={homeScore:70,awayScore:71};
A.applyMatchDecisionV48(opener,result);
if(A.getState().matchDecisionV48.pending!==null)throw new Error('La decisión sigue pendiente después de resolverla');
if(!result.matchDecision?.summary||!A.getState().matchDecisionV48.history[0].summary)throw new Error('El desenlace narrativo no queda guardado');
A.getState().matchDecisionV48={pending:{matchId:opener.id,type:'LAST_SHOT',choice:'TWO',choiceLabel:'Atacar para dos',title:'Última posesión',clock:'0:08'}};
const recoveredResult={homeScore:68,awayScore:68};
A.applyMatchDecisionV48(opener,recoveredResult);
if(A.getState().matchDecisionV48.pending!==null||!Array.isArray(A.getState().matchDecisionV48.history))throw new Error('Una decisión guardada por una versión antigua bloquea la partida');

console.log(JSON.stringify({decisionScoreUsesExistingTeamRating:true,closeGamesOnly:true,mobileDecisionLayout:true,decisionCompletesMatch:true,legacyDecisionRecovery:true,friendliesBeforeOfficialOpener:true,legacyDateDoesNotGoBackwards:true,networkFirstCache:true,version:'v0.48.12',ok:true},null,2));
