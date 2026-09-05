(function(g){
'use strict';

const BBGM=g.BBGM;
const APP_VERSION=g.BBGM_VERSION||{code:'0.44.0-beta',label:'v0.44 Beta',saveFormat:'basketball-manager-v044'};
const app=document.getElementById('app');
const SAVE_KEY='bbgm_v14_save';
const OLD_SAVE_KEYS=['bbgm_v13_save','bbgm_v12_save','bbgm_v11_save','bbgm_v10_save','bbgm_v09_save','bbgm_v08_save','bbgm_v07_save','bbgm_v06_save','bbgm_v05_save','bbgm_v04_save','bbgm_v03_save','bbgm_v02_save'];
const DB_NAME='basketball_gm_offline';
const DB_VERSION=1;
const DB_STORE='saves';
const DB_SAVE_ID='main_v08';
let dbPromise=null;
function openSaveDB(){
  if(!('indexedDB' in globalThis))return Promise.reject(new Error('IndexedDB no disponible'));
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{
    const req=indexedDB.open(DB_NAME,DB_VERSION);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(DB_STORE))db.createObjectStore(DB_STORE)};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||new Error('No se pudo abrir la base local'));
  });
  return dbPromise;
}
async function dbPut(value){const db=await openSaveDB();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readwrite');tx.objectStore(DB_STORE).put(value,DB_SAVE_ID);tx.oncomplete=()=>resolve(true);tx.onerror=()=>reject(tx.error)});}
async function dbGet(){const db=await openSaveDB();return new Promise((resolve,reject)=>{const tx=db.transaction(DB_STORE,'readonly');const req=tx.objectStore(DB_STORE).get(DB_SAVE_ID);req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error)});}
function saveEmergencySnapshot(){
  if(!state)return false;
  try{
    state.ui=state.ui||{};
    state.ui.lastView=currentView;
    localStorage.setItem(SAVE_KEY,JSON.stringify(state));
    localStorage.setItem(SAVE_KEY+'_marker',JSON.stringify({season:state.season,date:state.currentDate,clubId:state.userClubId,club:state.world?.clubs?.find(c=>c.id===state.userClubId)?.name||'',savedAt:Date.now(),version:state.version}));
    return true;
  }catch(e){console.warn('Emergency save failed',e);return false}
}
function savedGameSummary(){
  try{const raw=localStorage.getItem(SAVE_KEY+'_marker');return raw?JSON.parse(raw):null}catch(_e){return null}
}
if(typeof window!=='undefined'){
  window.addEventListener('pagehide',saveEmergencySnapshot);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveEmergencySnapshot()});
}

let state=null;
let currentView='home';
let marketTab='players';
let scoutingTab='staff';
let statsCompetition='ACB';
let statsSort='points';
let statsMode='basic';
let statsMinGames=0;
let statsPage=1;
let scheduleMode='month';
let scheduleMonth='';
let inboxFilter='ALL';
const STATS_PAGE_SIZE=50;
const statsCache=new Map();
let academyTab='bteam';
const MARKET_FILTER_KEY='bbgm_market_filters_v14';
function defaultMarketFilters(){return {search:'',position:'',league:'',ageMin:0,ageMax:99,status:'',minOvr:0,maxSalary:0,page:1,pageSize:25}}
function loadMarketFilters(){try{return {...defaultMarketFilters(),...(JSON.parse(localStorage.getItem(MARKET_FILTER_KEY)||'{}')||{})}}catch(_e){return defaultMarketFilters()}}
let marketFilters=loadMarketFilters();
function persistMarketFilters(){try{localStorage.setItem(MARKET_FILTER_KEY,JSON.stringify(marketFilters))}catch(_e){}}
function resetMarketFilters(){marketFilters=defaultMarketFilters();persistMarketFilters()}

const roleLabel={STAR:'Estrella',STARTER:'Titular',IMPORTANT:'Importante',ROTATION:'Rotación',SPECIALIST:'Especialista',DEVELOPMENT:'Desarrollo',BENCH:'Fondo banquillo'};
const focusLabel={BALANCED:'Equilibrado',THREE:'Triple',DEFENSE:'Defensa',PHYSICAL:'Físico',PLAYMAKING:'Creación',FINISHING:'Finalización'};
const roleOptions=['STAR','STARTER','IMPORTANT','ROTATION','SPECIALIST','DEVELOPMENT','BENCH'];
const positionLabel={PG:'Base',SG:'Escolta',SF:'Alero',PF:'Ala-pívot',C:'Pívot'};
const roleRank={BENCH:0,DEVELOPMENT:1,SPECIALIST:2,ROTATION:3,IMPORTANT:4,STARTER:5,STAR:6};
const expectedRoleMinutes={STAR:31,STARTER:27,IMPORTANT:22,ROTATION:15,SPECIALIST:11,DEVELOPMENT:8,BENCH:5};
const attrLabel={
  finishing:'Finalización',midRange:'Tiro medio',threePoint:'Triple',freeThrow:'Tiro libre',ballHandling:'Manejo',passing:'Pase',shotCreation:'Creación',pickAndRoll:'Pick & Roll',postPlay:'Poste',offBall:'Sin balón',
  perimeterDefense:'Def. exterior',interiorDefense:'Def. interior',helpDefense:'Ayudas',steal:'Robo',block:'Tapón',defensiveRebound:'Reb. defensivo',offensiveRebound:'Reb. ofensivo',
  speed:'Velocidad',strength:'Fuerza',vertical:'Salto',stamina:'Resistencia',durability:'Durabilidad',basketballIq:'IQ',decisionMaking:'Decisiones',consistency:'Regularidad',competitiveness:'Competitividad',workRate:'Trabajo'
};

const fmtMoney=n=>new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(Math.round(n||0));
const club=id=>state.world.clubs.find(c=>c.id===id);
const userClub=()=>club(state.userClubId);
const comp=id=>state.world.competitions.find(c=>c.id===id);
const fullName=p=>`${p.firstName} ${p.lastName}`;
const wageBill=c=>BBGM.wageBill(c);
const availableWage=c=>Math.max(0,c.salaryBudget-wageBill(c));
const positionText=p=>positionLabel[p.primaryPosition]+(p.secondaryPosition?' / '+positionLabel[p.secondaryPosition]:'');
const staffCost=()=>((userClub().coach?.salary||0)+(state.scouting?.staff||[]).reduce((sum,x)=>sum+(x.salary||0),0)+(state.medical?.doctor?.salary||0));
const availableStaff=()=>Math.max(0,(userClub().staffBudget||0)-staffCost());

function moraleInfo(v){
  v=Math.round(v??50);
  if(v>=85)return {label:'Excelente',cls:'morale-great'};
  if(v>=70)return {label:'Alta',cls:'morale-good'};
  if(v>=55)return {label:'Normal',cls:'morale-normal'};
  if(v>=40)return {label:'Baja',cls:'morale-low'};
  return {label:'Muy baja',cls:'morale-bad'};
}
function expectedMinutesForPlayer(p,c=userClub()){
  return Math.round((BBGM.targetMinutes?BBGM.targetMinutes(c,p):(expectedRoleMinutes[p.role]||14))*10)/10;
}
function samePositionGroup(a,b){
  const ap=[a.primaryPosition,a.secondaryPosition].filter(Boolean),bp=[b.primaryPosition,b.secondaryPosition].filter(Boolean);
  return ap.some(x=>bp.includes(x));
}
function applyRotationMoraleShift(before,after,changedId){
  const roster=userClub().roster;
  for(const p of roster){
    if(p.id===changedId)continue;
    const delta=(after.playerMinutes[p.id]||0)-(before.playerMinutes[p.id]||0);
    if(Math.abs(delta)<2)continue;
    const changed=roster.find(x=>x.id===changedId);if(changed&&!samePositionGroup(p,changed))continue;
    ensurePlayerContractFields(p,p.id);
    const expected=expectedRoleMinutes[p.role]||14,newMin=after.playerMinutes[p.id]||0;
    let moraleDelta=0,satDelta=0;
    if(delta<=-5){moraleDelta=newMin<expected-5?-2.4:-1.2;satDelta=newMin<expected-5?-4.5:-2}
    else if(delta<=-2){moraleDelta=-.7;satDelta=-1.4}
    else if(delta>=5){moraleDelta=1.4;satDelta=2.8}
    else if(delta>=2){moraleDelta=.5;satDelta=1.1}
    p.state.morale=BBGM.clamp((p.state.morale??70)+moraleDelta,10,100);
    p.state.roleSatisfaction=BBGM.clamp((p.state.roleSatisfaction??75)+satDelta,5,100);
  }
}
function coachRequestFor(p){return userClub().coachMinuteRequests?.[p.id]||null}
function coachRelationshipInfo(){
  const v=Math.round(state.coachManagement?.relationship??72);
  return {value:v,label:v>=85?'Excelente':v>=70?'Buena':v>=55?'Correcta':v>=40?'Tensa':'Muy tensa'};
}
function seasonStatsMap(){
  const map={};
  for(const m of state.calendar||[]){
    if(m.status!=='PLAYED'||!m.result)continue;
    for(const stats of [m.result.homeStats||[],m.result.awayStats||[]])for(const st of stats){
      if((st.minutes||0)<=0)continue;
      const a=map[st.playerId]||(map[st.playerId]={g:0,min:0,pts:0,reb:0,ast:0,stl:0,blk:0,val:0});
      a.g++;a.min+=st.minutes||0;a.pts+=st.points||0;a.reb+=(st.offensiveRebounds||0)+(st.defensiveRebounds||0);a.ast+=st.assists||0;a.stl+=st.steals||0;a.blk+=st.blocks||0;
      a.val+=(st.points||0)+(st.offensiveRebounds||0)+(st.defensiveRebounds||0)+(st.assists||0)+(st.steals||0)+(st.blocks||0)-(st.turnovers||0)-((st.twoAttempted||0)-(st.twoMade||0))-((st.threeAttempted||0)-(st.threeMade||0))-((st.freeThrowAttempted||0)-(st.freeThrowMade||0));
    }
  }
  for(const a of Object.values(map)){const g=Math.max(1,a.g);a.mpg=a.min/g;a.ppg=a.pts/g;a.rpg=a.reb/g;a.apg=a.ast/g;a.valpg=a.val/g}
  return map;
}
function changePlayerRole(playerId,newRole){
  const c=userClub(),p=c.roster.find(x=>x.id===playerId);if(!p||p.role===newRole)return;
  const before=BBGM.rotation(c);
  ensurePlayerContractFields(p,p.id);
  const old=p.role,oldRank=roleRank[old]??3,newRank=roleRank[newRole]??3,promisedRank=roleRank[p.promisedRole]??oldRank,diff=newRank-oldRank;
  const ego=(p.personality?.ego??50)/100,amb=(p.personality?.ambition??50)/100;
  let moraleDelta=0,satDelta=0;
  if(diff>0){moraleDelta=2.5+diff*2.2;satDelta=7+diff*5;}
  else if(diff<0){const severity=Math.abs(diff);moraleDelta=-(3.5+severity*3.2)*(0.85+ego*.35+amb*.20);satDelta=-(7+severity*6);}
  if(newRank<promisedRank){const gap=promisedRank-newRank;moraleDelta-=gap*2.2;satDelta-=gap*5;}
  else if(newRank>=promisedRank){satDelta+=4;}
  p.role=newRole;
  const after=BBGM.rotation(c);applyRotationMoraleShift(before,after,p.id);
  const oldMin=before.playerMinutes[p.id]||0,newMin=after.playerMinutes[p.id]||0;
  p.state.morale=BBGM.clamp((p.state.morale??70)+moraleDelta+(newMin-oldMin)*.16,10,100);p.state.roleSatisfaction=BBGM.clamp((p.state.roleSatisfaction??75)+satDelta+(newMin-oldMin)*.25,5,100);
  if(diff<=-2||newRank<promisedRank-1)addInbox('PLAYER_UNHAPPY',`${fullName(p)} no está conforme con su nuevo rol`,`Has cambiado su rol de ${roleLabel[old]} a ${roleLabel[newRole]}. Sus minutos previstos pasan de ${Math.round(oldMin)} a ${Math.round(newMin)} y su moral/satisfacción han bajado.`,{playerId:p.id});
  else if(diff>0)addInbox('PLAYER_ROLE',`Nuevo rol para ${fullName(p)}`,`El jugador valora positivamente pasar de ${roleLabel[old]} a ${roleLabel[newRole]}. Sus minutos previstos pasan de ${Math.round(oldMin)} a ${Math.round(newMin)}.`,{playerId:p.id});
  saveLocal(false);render();toast(`Rol cambiado: ${Math.round(oldMin)} → ${Math.round(newMin)} min`);
}




// ===== v0.13 systems: médico, NBA/Draft, cantera avanzada, selecciones e historial =====
const nationalityLabel={ESP:'España',USA:'Estados Unidos',SRB:'Serbia',FRA:'Francia',LTU:'Lituania',ARG:'Argentina',GRE:'Grecia',CRO:'Croacia',TUR:'Turquía',SLO:'Eslovenia',GER:'Alemania',ITA:'Italia',ISR:'Israel',MNE:'Montenegro',BIH:'Bosnia',AUT:'Austria',ROU:'Rumanía'};
const injuryCatalog=[
  {code:'ANKLE',name:'Esguince de tobillo',min:5,max:16,severity:2},
  {code:'MUSCLE',name:'Sobrecarga muscular',min:3,max:10,severity:1},
  {code:'HAMSTRING',name:'Lesión de isquiotibiales',min:12,max:28,severity:3},
  {code:'KNEE',name:'Molestias de rodilla',min:8,max:24,severity:2.5},
  {code:'HAND',name:'Lesión en mano/dedo',min:6,max:18,severity:2},
  {code:'BACK',name:'Dolor lumbar',min:4,max:14,severity:1.5}
];
function ensureV13State(){
  if(!state)return;
  state.version=APP_VERSION.code;
  state.medical=state.medical||{doctor:{name:'Dr. Iñaki Salazar',diagnosis:82,recovery:80,prevention:77,salary:380000},injuryHistory:[],lastProcessedDate:state.currentDate};
  state.medical.injuryHistory=state.medical.injuryHistory||[];
  state.nba=state.nba||{draftHistory:[],rights:{},lastDraftSeason:null,returns:[]};
  state.nba.draftHistory=state.nba.draftHistory||[];state.nba.rights=state.nba.rights||{};
  state.nationalTeams=state.nationalTeams||{callups:[],history:[],lastSeason:null};
  state.playerCareerHistory=state.playerCareerHistory||{};
  state.playerDevelopmentHistory=state.playerDevelopmentHistory||{};
  state.academy=state.academy||{};state.academy.intakeHistory=state.academy.intakeHistory||[];
  for(const c of state.world.clubs)for(const p of c.roster)ensurePlayerV13(p,c);
  for(const p of state.world.freeAgents||[])ensurePlayerV13(p,null);
  for(const p of state.academy?.players||[])ensurePlayerV13(p,userClub());
  for(const l of state.academy?.loans||[])if(l.player)ensurePlayerV13(l.player,userClub());
}
function ensurePlayerV13(p,c){
  if(!p)return;ensurePlayerContractFields(p,p.id);ensureScoutingFields(p,c?.reputation||50);
  if(p.injuryProneness==null){const r=new BBGM.RNG(hashCode(`inj-prone-${p.id}`));p.injuryProneness=BBGM.clamp(42+r.gaussian()*17,8,92)}
  if(!Array.isArray(p.injuryHistory))p.injuryHistory=[];
  if(!Array.isArray(p.developmentHistory))p.developmentHistory=[{date:state?.currentDate||'2026-09-01',ovr:+BBGM.overall(p).toFixed(2)}];
  if(p.trainWithFirstTeam==null)p.trainWithFirstTeam=false;
  if(p.nbaDeclared==null)p.nbaDeclared=false;
}
function recordDevelopmentPoint(p,date=state.currentDate){ensurePlayerV13(p);const arr=p.developmentHistory;if(!arr.length||arr[arr.length-1].date!==date)arr.push({date,ovr:+BBGM.overall(p).toFixed(2)});if(arr.length>48)arr.splice(0,arr.length-48)}
function youthReadiness(p){
  const o=BBGM.overall(p),a=state.academy?.bStats?.[p.id]||academyStatLine(),g=Math.max(1,a.games),mins=a.minutes/g,coach=userClub().coach;
  const score=o*.72+Math.min(12,mins*.28)+(coach.youthTrust||60)*.07+(p.state?.confidence||65)*.06;
  if(score>=72)return {label:'Preparado para rotación ACB',cls:'good-pill',score};
  if(score>=66)return {label:'Puede tener minutos puntuales',cls:'',score};
  return {label:'Debe seguir desarrollándose',cls:'warn',score};
}
function setFirstTeamTraining(id,on){const p=state.academy.players.find(x=>x.id===id);if(!p)return;p.trainWithFirstTeam=!!on;p.state.fatigue=BBGM.clamp((p.state.fatigue||0)+(on?3:-1),0,75);saveLocal(false);render();toast(on?'Entrenará con el primer equipo':'Vuelve al plan del equipo B')}
function injuryRisk(p,mins){const dur=p.attributes?.durability||65,fat=p.state?.fatigue||0,pr=p.injuryProneness||45;return BBGM.clamp(.0018+(mins/40)*.0022+fat*.000055+(75-dur)*.000045+pr*.000025,.001,.018)}
function createInjury(p,c,date,seed){
  if(p.currentInjury&&p.currentInjury.status!=='RECOVERED')return null;const rng=new BBGM.RNG(seed),type=rng.pick(injuryCatalog),doctor=c?.id===state.userClubId?(state.medical?.doctor?.diagnosis||75):72;
  const span=type.min+Math.floor(rng.next()*(type.max-type.min+1)),uncert=Math.max(1,Math.round((100-doctor)/20));const end=addDays(date,span);
  const inj={id:`I-${p.id}-${date}`,code:type.code,name:type.name,startDate:date,estimatedEndDate:end,baseDays:span,severity:type.severity,recurrenceRisk:BBGM.clamp(8+type.severity*7+(p.injuryProneness||45)*.12,8,45),management:'REST',status:'ACTIVE',diagnosisRange:[Math.max(1,span-uncert),span+uncert]};
  p.currentInjury=inj;p.injuryHistory.push({...inj});state.medical.injuryHistory.unshift({playerId:p.id,clubId:c?.id||null,...inj});state.medical.injuryHistory=state.medical.injuryHistory.slice(0,120);
  if(c?.id===state.userClubId)addInbox('INJURY',`${fullName(p)}: ${type.name}`,`El médico estima ${inj.diagnosisRange[0]}-${inj.diagnosisRange[1]} días de baja. Puedes elegir tratamiento desde Más → Departamento médico.`,{playerId:p.id});return inj;
}
function maybeGenerateMatchInjuries(c,stats,date){const rng=new BBGM.RNG(hashCode(`${date}-${c.id}-${stats.reduce((n,x)=>n+x.points,0)}-medical`));for(const st of stats){if((st.minutes||0)<5)continue;const p=c.roster.find(x=>x.id===st.playerId);if(!p)continue;if(p.currentInjury&&p.currentInjury.status!=='RECOVERED'){if(p.currentInjury.management==='PLAY'&&rng.next()<(p.currentInjury.recurrenceRisk||20)/100*.16){p.currentInjury.estimatedEndDate=addDays(p.currentInjury.estimatedEndDate,5+Math.floor(rng.next()*8));p.currentInjury.severity=Math.min(5,(p.currentInjury.severity||2)+.7);if(c.id===state.userClubId)addInbox('INJURY',`${fullName(p)} agrava sus molestias`,`Jugar con molestias ha provocado una recaída. La recuperación se retrasa hasta ${p.currentInjury.estimatedEndDate}.`,{playerId:p.id})}continue}if(rng.next()<injuryRiskV47(p,st.minutes,c))createInjury(p,c,date,hashCode(`${p.id}-${date}-inj`))}}
function processMedicalTo(target){ensureV13State();for(const c of state.world.clubs)for(const p of c.roster){const inj=p.currentInjury;if(!inj||inj.status==='RECOVERED')continue;let end=inj.estimatedEndDate;if(inj.management==='LIMITED')end=addDays(end,2);if(inj.management==='PLAY')end=addDays(end,4);if(target>=end){inj.status='RECOVERED';p.state.fitness=BBGM.clamp((p.state.fitness||88)+5,70,100);p.state.fatigue=BBGM.clamp((p.state.fatigue||20)-8,0,75);if(c.id===state.userClubId)addInbox('MEDICAL',`${fullName(p)} recibe el alta`,`${p.currentInjury.name}: el jugador vuelve a estar disponible.`);p.currentInjury={...inj,status:'RECOVERED',recoveredDate:target}}}state.medical.lastProcessedDate=target}
function setInjuryManagement(playerId,mode){const p=userClub().roster.find(x=>x.id===playerId);if(!p?.currentInjury||p.currentInjury.status==='RECOVERED')return;p.currentInjury.management=mode;if(mode==='REST'){p.state.morale=BBGM.clamp((p.state.morale||70)-.3,0,100)}if(mode==='PLAY'){p.currentInjury.recurrenceRisk=BBGM.clamp(p.currentInjury.recurrenceRisk+12,0,80);p.state.morale=BBGM.clamp((p.state.morale||70)+1,0,100)}saveLocal(false);render();toast(mode==='REST'?'Reposo completo':mode==='LIMITED'?'Minutos limitados':'Disponible con molestias')}
function activeInjuries(c=userClub()){return c.roster.filter(p=>p.currentInjury&&p.currentInjury.status!=='RECOVERED')}
function recordSeasonPlayerHistory(){
  const stats=seasonStatsMap();for(const c of state.world.clubs)for(const p of c.roster){const a=stats[p.id],row={season:state.season,clubId:c.id,age:p.age,ovr:+BBGM.overall(p).toFixed(1),games:a?.g||0,mpg:a?.mpg||0,ppg:a?.ppg||0,rpg:a?.rpg||0,apg:a?.apg||0,valpg:a?.valpg||0};p.careerHistory=p.careerHistory||[];if(!p.careerHistory.some(x=>x.season===state.season&&x.clubId===c.id))p.careerHistory.push(row);recordDevelopmentPoint(p,state.currentDate)}
}
function prepareDraftDeclarations(){ensureV13State();for(const p of [...userClub().roster,...(state.academy?.players||[])]){if((p.age||30)>22||(p.potentialReal||BBGM.overall(p))<80||p.draftDecisionSeason===state.season)continue;p.draftDecisionSeason=state.season;addInbox('DECISION',`${fullName(p)} valora presentarse al Draft NBA`,`Su entorno cree que tiene opciones de ser elegido. Puedes apoyar el proceso o recomendar que espere una temporada más.`,{playerId:p.id,choices:[{label:'Apoyar su candidatura',effect:'NBA_DECLARE'},{label:'Recomendar que espere',effect:'NBA_WITHDRAW'}]})}}
function draftEligiblePlayers(){
  const arr=[];for(const c of state.world.clubs.filter(x=>x.leagueLevel!=='NBA'))for(const p of c.roster)if((p.age||30)<=22&&(p.potentialReal||BBGM.overall(p))>=77&&p.nbaDeclared!=='WITHDRAW'&&!p.nbaRights)arr.push({p,c,status:'CLUB'});
  for(const p of state.academy?.players||[])if((p.age||30)<=22&&(p.potentialReal||BBGM.overall(p))>=77&&p.nbaDeclared!=='WITHDRAW'&&!p.nbaRights)arr.push({p,c:userClub(),status:'B'});
  return arr.sort((a,b)=>(b.p.potentialReal-a.p.potentialReal)||BBGM.overall(b.p)-BBGM.overall(a.p));
}
function removePlayerFromLocation(p){for(const c of state.world.clubs)c.roster=c.roster.filter(x=>x.id!==p.id);state.world.freeAgents=(state.world.freeAgents||[]).filter(x=>x.id!==p.id);if(state.academy)state.academy.players=state.academy.players.filter(x=>x.id!==p.id)}
function processNbaDraft(){
  ensureV13State();if(state.nba.lastDraftSeason===state.season)return;const rng=new BBGM.RNG(hashCode(`${state.season}-nba-draft-v13`)),nba=state.world.clubs.filter(c=>c.leagueLevel==='NBA').slice().sort((a,b)=>a.baseRating-b.baseRating),eligible=draftEligiblePlayers().slice(0,30),entries=[];
  eligible.forEach((x,i)=>{if(i>=30)return;const team=nba[i%nba.length];const p=x.p,rights={season:state.season,pick:i+1,teamId:team.id,signed:false};p.nbaRights=rights;state.nba.rights[p.id]=rights;const signChance=BBGM.clamp((BBGM.overall(p)-70)*.055+((p.potentialReal||75)-80)*.025+(i<10?.18:0),.08,.82);let signed=rng.next()<signChance;
    if(signed){let buyout=0;if(x.c?.id===state.userClubId){buyout=p.releaseClause?Math.min(p.releaseClause,2200000):Math.round((500000+(p.potentialReal-75)*90000)/50000)*50000;userClub().cashBudget+=buyout;addInbox('NBA',`${fullName(p)} da el salto a la NBA`,`${team.name} seleccionó al jugador con el pick ${i+1} y formaliza su incorporación.${buyout?` Baskonia recibe ${fmtMoney(buyout)} de buyout.`:''}`,{playerId:p.id})}removePlayerFromLocation(p);p.salary=Math.round((1800000+BBGM.overall(p)*90000)/50000)*50000;p.contractYears=3;p.releaseClause=null;p.role=BBGM.desiredRole(p);p.freeAgent=false;team.roster.push(p);rights.signed=true}
    else if(x.c?.id===state.userClubId)addInbox('NBA',`${fullName(p)} elegido en el Draft`,`${team.name} obtiene sus derechos con el pick ${i+1}, pero por ahora el jugador continúa en Europa.`,{playerId:p.id});entries.push({pick:i+1,teamId:team.id,playerId:p.id,signed:rights.signed});
  });for(const ev of state.inbox.filter(e=>!e.resolved&&e.type==='DECISION'&&e.choices?.some(c=>c.effect==='NBA_DECLARE')))ev.resolved=true;state.nba.draftHistory.unshift({season:state.season,entries});state.nba.lastDraftSeason=state.season;return entries
}
function processNbaReturns(){const rng=new BBGM.RNG(hashCode(`${state.season}-nba-returns`)),nba=state.world.clubs.filter(c=>c.leagueLevel==='NBA'),moved=[];for(const c of nba){const cand=c.roster.filter(p=>(p.age||25)>=27&&BBGM.overall(p)<79);if(cand.length&&rng.next()<.18){const p=rng.pick(cand);c.roster=c.roster.filter(x=>x.id!==p.id);p.contractYears=0;p.freeAgent=true;p.salary=Math.round(Math.max(450000,p.salary*.22)/50000)*50000;p.releaseClause=null;state.world.freeAgents.push(p);moved.push({playerId:p.id,from:c.id});}}if(moved.length){state.nba.returns.unshift({season:state.season,moved});addInbox('NBA','Jugadores disponibles desde NBA',`${moved.length} jugador(es) dejan la NBA y pasan al mercado internacional.`)}return moved}
function processNationalTeamSummer(){
  ensureV13State();if(state.nationalTeams.lastSeason===state.season)return;const candidates=userClub().roster.filter(p=>BBGM.overall(p)>=76).sort((a,b)=>BBGM.overall(b)-BBGM.overall(a)),rng=new BBGM.RNG(hashCode(`${state.season}-national`)),callups=[];for(const p of candidates){const chance=BBGM.clamp(.28+(BBGM.overall(p)-76)*.07,0,.92);if(rng.next()<chance){callups.push({playerId:p.id,nationality:p.nationality,competition:rng.next()<.34?'Mundial / JJOO':'Ventana internacional'});p.state.fatigue=BBGM.clamp((p.state.fatigue||0)+5+rng.next()*5,0,75);p.state.morale=BBGM.clamp((p.state.morale||70)+1.5,0,100)}}state.nationalTeams.callups=callups;state.nationalTeams.history.unshift({season:state.season,callups:callups.map(x=>({...x}))});state.nationalTeams.lastSeason=state.season;if(callups.length)addInbox('NATIONAL',`${callups.length} internacionales de Baskonia`,`${callups.map(x=>fullName(playerLocation(x.playerId)?.player||{firstName:'',lastName:''})).join(', ')} han sido convocados. Volverán con algo más de fatiga.`);return callups
}
function aiPositionNeed(c,pos){if(BBGM.marketAI)return BBGM.marketAI.positionNeed(c,pos);const d=c.roster.filter(p=>p.primaryPosition===pos||p.secondaryPosition===pos).sort((a,b)=>BBGM.overall(b,pos)-BBGM.overall(a,pos));const top=d[0]?BBGM.overall(d[0],pos):0,sec=d[1]?BBGM.overall(d[1],pos):0;return (d.length<2?35:0)+Math.max(0,78-top)*1.7+Math.max(0,70-sec)}
function aiFitScore(c,p){if(BBGM.marketAI)return BBGM.marketAI.playerFit(c,p);const pos=Math.max(aiPositionNeed(c,p.primaryPosition),p.secondaryPosition?aiPositionNeed(c,p.secondaryPosition):0),age=(p.age||27),profile=c.reputation>=90?(BBGM.overall(p)>=80?15:-5):c.reputation>=78?(age<=28?8:2):(age<=24?12:0);return pos+profile+BBGM.overall(p)*.3-(p.salary||0)/1000000*.3}
function renderMedical(v){ensureV13State();const inj=activeInjuries(),d=state.medical.doctor;v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Salud y rendimiento</div><h1>Departamento médico</h1><p>Gestiona lesiones, riesgo y disponibilidad.</p></div><button class="btn" id="backMore">← Más</button></div><div class="grid two"><div class="card"><h3>${d.name}</h3><div class="stat-row"><span>Diagnóstico</span><b>${d.diagnosis}</b></div><div class="stat-row"><span>Recuperación</span><b>${d.recovery}</b></div><div class="stat-row"><span>Prevención</span><b>${d.prevention}</b></div></div><div class="card"><h3>Estado plantilla</h3><div class="stat-row"><span>Lesionados</span><b>${inj.length}</b></div><div class="stat-row"><span>Fatiga media</span><b>${Math.round(userClub().roster.reduce((n,p)=>n+(p.state.fatigue||0),0)/Math.max(1,userClub().roster.length))}/100</b></div></div></div><div class="card" style="margin-top:16px"><h3>Lesiones activas</h3>${inj.length?inj.map(p=>{const x=p.currentInjury;return `<div class="medical-row"><div><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button><div class="tiny muted">${x.name} · estimación ${x.diagnosisRange?.[0]||x.baseDays}-${x.diagnosisRange?.[1]||x.baseDays} días · recaída ${Math.round(x.recurrenceRisk)}%</div></div><div class="action-row"><button class="btn small ${x.management==='REST'?'good':''}" data-med="REST" data-pid="${p.id}">Reposo</button><button class="btn small ${x.management==='LIMITED'?'good':''}" data-med="LIMITED" data-pid="${p.id}">Minutos limitados</button><button class="btn small ${x.management==='PLAY'?'warn':''}" data-med="PLAY" data-pid="${p.id}">Jugar con molestias</button></div></div>`}).join(''):'<p class="muted">No hay lesiones activas.</p>'}</div>`;v.querySelector('#backMore').onclick=()=>{currentView='more';render()};v.querySelectorAll('[data-med]').forEach(b=>b.onclick=()=>setInjuryManagement(+b.dataset.pid,b.dataset.med));bindProfileButtons(v)}
function renderNba(v){ensureV13State();const last=state.nba.draftHistory[0],rights=Object.entries(state.nba.rights).map(([id,r])=>({p:playerLocation(+id)?.player,r})).filter(x=>x.p);v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Estados Unidos</div><h1>NBA y Draft</h1><p>Derechos NBA, jugadores drafteados y retornos al mercado europeo.</p></div><button class="btn" id="backMore">← Más</button></div><div class="grid two"><div class="card"><h3>Último Draft</h3>${last?`<div class="stat-row"><span>Temporada</span><b>${last.season}</b></div>${last.entries.slice(0,12).map(e=>{const loc=playerLocation(e.playerId),tm=club(e.teamId);return `<div class="draft-row"><b>#${e.pick}</b><span>${loc?fullName(loc.player):'Jugador'} → ${tm?.shortName||'NBA'}</span><span class="pill ${e.signed?'good-pill':''}">${e.signed?'Firma NBA':'Derechos'}</span></div>`}).join('')}`:'<p class="muted">El primer Draft se procesa al cerrar la temporada.</p>'}</div><div class="card"><h3>Derechos de tus jugadores</h3>${rights.filter(x=>userClub().roster.some(p=>p.id===x.p.id)||state.academy.players.some(p=>p.id===x.p.id)).map(x=>`<div class="player-line"><button class="link-btn" data-profile="${x.p.id}">${fullName(x.p)}</button><span>${club(x.r.teamId)?.shortName||'NBA'} · pick ${x.r.pick}</span></div>`).join('')||'<p class="muted">Ningún jugador actual tiene derechos NBA.</p>'}</div></div>`;v.querySelector('#backMore').onclick=()=>{currentView='more';render()};bindProfileButtons(v)}
function renderInternational(v){ensureV13State();const c=state.nationalTeams.callups||[];v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Selecciones</div><h1>Internacionales</h1><p>Convocatorias y carga adicional durante el verano.</p></div><button class="btn" id="backMore">← Más</button></div><div class="card"><h3>Últimas convocatorias</h3>${c.length?c.map(x=>{const p=playerLocation(x.playerId)?.player;return p?`<div class="player-line"><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button><span>${nationalityLabel[p.nationality]||p.nationality} · ${x.competition}</span></div>`:''}).join(''):'<p class="muted">Todavía no hay convocatorias procesadas en esta temporada.</p>'}</div>`;v.querySelector('#backMore').onclick=()=>{currentView='more';render()};bindProfileButtons(v)}


// ===== v0.12 systems =====
function daysBetween(a,b){if(!a||!b)return 9999;return Math.floor((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/86400000)}
function leadershipScore(p){return (p.attributes?.competitiveness||60)*.28+(p.attributes?.basketballIq||60)*.22+(p.personality?.professionalism||60)*.18+(p.personality?.loyalty||50)*.12+Math.min(36,p.age||25)*.35+BBGM.overall(p)*.08}
function pairKey(a,b){return `${Math.min(a.id,b.id)}-${Math.max(a.id,b.id)}`}
function chemistryPair(a,b){const rng=new BBGM.RNG(hashCode(`chem-${Math.min(a.id,b.id)}-${Math.max(a.id,b.id)}`));const prof=100-Math.abs((a.personality?.professionalism||60)-(b.personality?.professionalism||60));const ego=100-Math.abs((a.personality?.ego||50)-(b.personality?.ego||50));const age=100-Math.min(100,Math.abs((a.age||25)-(b.age||25))*8);const ov=state?.lockerRoom?.relationshipOverrides?.[pairKey(a,b)]||0;return Math.round(BBGM.clamp(34+rng.next()*28+prof*.14+ego*.09+age*.08+ov,12,99))}
function changeRelationship(a,b,delta){state.lockerRoom=state.lockerRoom||{};state.lockerRoom.relationshipOverrides=state.lockerRoom.relationshipOverrides||{};const k=pairKey(a,b);state.lockerRoom.relationshipOverrides[k]=BBGM.clamp((state.lockerRoom.relationshipOverrides[k]||0)+delta,-30,30)}
function lockerRoomMetrics(){const r=userClub().roster;if(!r.length)return {morale:50,harmony:50,role:50,adapt:50,pairAvg:50,label:'Normal'};const avg=k=>r.reduce((n,p)=>n+(p.state?.[k]??60),0)/r.length;let pair=0,n=0;for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++){pair+=chemistryPair(r[i],r[j]);n++}const morale=avg('morale'),role=avg('roleSatisfaction'),adapt=avg('teamAdaptation'),pairAvg=n?pair/n:60,harmony=BBGM.clamp(morale*.35+role*.25+adapt*.15+pairAvg*.25,0,100);return {morale,role,adapt,pairAvg,harmony,label:harmony>=82?'Excelente':harmony>=70?'Buena':harmony>=55?'Estable':harmony>=42?'Tensa':'Muy tensa'}}
function coachTrust(p){const c=userClub(),rot=BBGM.rotation(c),mins=rot.playerMinutes[p.id]||0,target=rot.targets?.[p.id]||expectedMinutesForPlayer(p,c);return Math.round(BBGM.clamp(BBGM.overall(p)*.48+(p.state?.form||50)*.12+(p.state?.teamAdaptation||60)*.10+(p.attributes?.decisionMaking||60)*.08+(p.attributes?.workRate||60)*.08+c.coach.youthTrust*(p.age<=22?.08:.02)+Math.min(10,mins/4)-Math.max(0,target-mins)*.25,20,98))}
function positionDepth(pos){const rot=BBGM.rotation(userClub());return userClub().roster.filter(p=>p.primaryPosition===pos||p.secondaryPosition===pos).map(p=>({p,ovr:BBGM.overall(p,pos),mins:rot.playerMinutes[p.id]||0})).sort((a,b)=>b.ovr-a.ovr)}
function squadNeed(pos){const d=positionDepth(pos),top=d[0]?.ovr||0,second=d[1]?.ovr||0,count=d.length;let severity=0;if(count<2)severity+=38;if(count<3)severity+=12;if(top<76)severity+=(76-top)*2;if(second<70)severity+=(70-second)*1.5;return {pos,depth:d,severity:Math.round(severity),label:severity>=35?'Alta':severity>=18?'Media':'Baja'}}
function allSquadNeeds(){return ['PG','SG','SF','PF','C'].map(squadNeed).sort((a,b)=>b.severity-a.severity)}
function ensureV12State(){if(!state)return;state.version=APP_VERSION.code;state.watchlist=Array.isArray(state.watchlist)?state.watchlist:[];state.marketDynamics=state.marketDynamics||{rumors:[],agentOffers:[],lastPulseGame:0};state.planning=state.planning||{priorityPosition:null};state.lockerRoom=state.lockerRoom||{captainId:null,lastIncidentGame:0};state.lockerRoom.decisionHistory=Array.isArray(state.lockerRoom.decisionHistory)?state.lockerRoom.decisionHistory:[];state.coachManagement=state.coachManagement||{relationship:72};state.coachManagement.interventions=state.coachManagement.interventions||{month:state.currentDate?.slice(0,7)||'',count:0};state.coachManagement.squadRequest=state.coachManagement.squadRequest||null;const roster=userClub()?.roster||[];if(roster.length&&!roster.some(p=>p.id===state.lockerRoom.captainId))state.lockerRoom.captainId=roster.slice().sort((a,b)=>leadershipScore(b)-leadershipScore(a))[0]?.id||null;for(const sc of [...(state.scouting?.staff||[]),...(state.world?.scoutMarket||[])]){if(sc.focusLeague==null){const opts=['Liga ACB','EuroLeague','NBA','LNB Élite','LBA Serie A','Basketbol Süper Ligi','ABA League'];sc.focusLeague=opts[Math.abs((sc.id||1)*7)%opts.length]}if(sc.focusCountry==null){const opts=['España','USA','Serbia','Francia','Italia','Turquía','Lituania'];sc.focusCountry=opts[Math.abs((sc.id||1)*11)%opts.length]}}ensureCoachSquadRequest();ensureV13State()}
function ensureCoachSquadRequest(){if(!state?.coachManagement||state.coachManagement.squadRequest?.season===state.season)return;const need=allSquadNeeds()[0],low=userClub().roster.slice().sort((a,b)=>coachTrust(a)-coachTrust(b))[0];state.coachManagement.squadRequest={season:state.season,position:need.pos,severity:need.severity,status:'PENDING',exitPlayerId:low&&coachTrust(low)<54?low.id:null}}
function setPlanningPriority(pos){state.planning.priorityPosition=pos||null;saveLocal(false);render();toast(pos?`Prioridad: ${positionLabel[pos]}`:'Prioridad eliminada')}
function setCaptain(id){const p=userClub().roster.find(x=>x.id===id);if(!p)return;state.lockerRoom.captainId=id;p.state.morale=BBGM.clamp((p.state.morale||70)+2,0,100);saveLocal(false);render();toast(`${fullName(p)} es el capitán`)}
function toggleWatchlist(id){ensureV12State();const i=state.watchlist.indexOf(id);if(i>=0)state.watchlist.splice(i,1);else state.watchlist.push(id);saveLocal(false);render();toast(i>=0?'Eliminado de seguimiento':'Añadido a seguimiento')}
function watchlisted(id){return (state.watchlist||[]).includes(id)}
function bestRecommendedTarget(){ensureV12State();const pos=state.planning.priorityPosition||allSquadNeeds()[0]?.pos,maxSalary=Math.max(availableWage(userClub()),800000);return allMarketCandidates().map(x=>({...x,k:knownOverall(x.player,x.club)})).filter(x=>(x.player.primaryPosition===pos||x.player.secondaryPosition===pos)&&(x.player.salary||0)<=maxSalary&&x.k.mid!=null).sort((a,b)=>(b.k.mid-a.k.mid)||a.player.age-b.player.age)[0]||null}
function generateMarketPulse(){ensureV12State();const played=(state.calendar||[]).filter(m=>m.status==='PLAYED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)).length;if(!played||played===state.marketDynamics.lastPulseGame||played%2!==0)return;state.marketDynamics.lastPulseGame=played;const rng=new BBGM.RNG(hashCode(`${state.season}-${played}-market-v12`)),cands=allMarketCandidates().filter(x=>BBGM.overall(x.player)>=73);if(cands.length){const x=rng.pick(cands),clubs=state.world.clubs.filter(c=>c.id!==state.userClubId&&c.id!==(x.club?.id)).sort(()=>rng.next()-.5).slice(0,2+Math.floor(rng.next()*2));state.marketDynamics.rumors.unshift({id:`R${played}-${x.player.id}`,date:state.currentDate,playerId:x.player.id,clubId:x.club?.id||null,interestClubIds:clubs.map(c=>c.id),text:`${clubs.map(c=>c.shortName).join(' y ')} siguen a ${fullName(x.player)}.`})}if((state.world.freeAgents||[]).length&&rng.next()<.65){const p=rng.pick(state.world.freeAgents),ask=Math.round(BBGM.salaryExpectation(p,userClub().reputation)/50000)*50000;state.marketDynamics.agentOffers.unshift({id:`A${played}-${p.id}`,date:state.currentDate,playerId:p.id,salary:ask,text:`${p.agent} ofrece a ${fullName(p)} por alrededor de ${fmtMoney(ask)} anuales.`})}state.marketDynamics.rumors=state.marketDynamics.rumors.slice(0,25);state.marketDynamics.agentOffers=state.marketDynamics.agentOffers.slice(0,20)}
function maybeGenerateYouthInterest(){ensureV13State();const played=(state.calendar||[]).filter(m=>m.status==='PLAYED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)).length;if(!played||played%8!==0||state.academy.lastInterestGame===played)return;state.academy.lastInterestGame=played;const youth=[...state.academy.players,...userClub().roster.filter(p=>p.age<=22)].filter(p=>(p.potentialReal||0)>=80);if(!youth.length)return;const rng=new BBGM.RNG(hashCode(`${state.season}-${played}-youth-interest`)),p=rng.pick(youth),dest=state.world.clubs.filter(c=>c.id!==state.userClubId&&c.leagueLevel!=='NBA'&&c.loanEligible!==false&&c.reputation<userClub().reputation).sort((a,b)=>Math.abs(cScore(a)-BBGM.overall(p))-Math.abs(cScore(b)-BBGM.overall(p)))[0];if(dest)addInbox('DECISION',`${dest.name} pregunta por ${fullName(p)}`,`El club considera que ${fullName(p)} podría tener minutos de desarrollo y pregunta por una posible cesión.`,{playerId:p.id,fromClubId:dest.id,choices:[{label:'Abrir opción de cesión',effect:'CLUB_LOAN_OPEN'},{label:'Seguir desarrollándolo aquí',effect:'YOUTH_KEEP'}]})}
function maybeGenerateLockerEvent(){ensureV12State();const played=(state.calendar||[]).filter(m=>m.status==='PLAYED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)).length;if(!played||played%6!==0||state.lockerRoom.lastIncidentGame===played)return;state.lockerRoom.lastIncidentGame=played;const r=userClub().roster;if(r.length<2)return;const pairs=[];for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++)pairs.push({a:r[i],b:r[j],v:chemistryPair(r[i],r[j])});pairs.sort((x,y)=>x.v-y.v);const pair=pairs[0];if(pair.v<55)addInbox('DECISION',`Tensión entre ${fullName(pair.a)} y ${fullName(pair.b)}`,`El vestuario ha detectado fricción entre ambos jugadores. La armonía de la pareja es baja (${pair.v}/100).`,{playerId:pair.a.id,otherPlayerId:pair.b.id,choices:[{label:'Mediar personalmente',effect:'LOCKER_MEDIATE'},{label:'Pedir al capitán que intervenga',effect:'LOCKER_CAPTAIN'},{label:'No intervenir',effect:'LOCKER_IGNORE'}]});else{const cap=userClub().roster.find(p=>p.id===state.lockerRoom.captainId);if(cap)addInbox('DECISION',`${fullName(cap)} refuerza al vestuario`,`El capitán propone una reunión informal para mantener unido al grupo.`,{playerId:cap.id,choices:[{label:'Apoyar la iniciativa',effect:'LOCKER_SUPPORT'},{label:'Centrarse solo en competir',effect:'LOCKER_FOCUS'}]})}}

// ===== v0.15 personality, agents and persistent relationships =====
function agentProfile(name){
  const rng=new BBGM.RNG(hashCode(`agent-v14-${name||'Agente'}`));
  const toughness=Math.round(38+rng.next()*57),patience=Math.round(32+rng.next()*62),prestige=Math.round(35+rng.next()*60);
  const style=toughness>=78?'Muy exigente':toughness>=62?'Exigente':patience>=72?'Paciente':'Pragmático';
  return {name:name||'Agente',toughness,patience,prestige,style};
}
function agentRelation(name){state.agentRelations=state.agentRelations||{};return Math.round(state.agentRelations[name]??50)}
function changeAgentRelation(name,delta){state.agentRelations=state.agentRelations||{};state.agentRelations[name]=BBGM.clamp((state.agentRelations[name]??50)+delta,10,95)}
function agentDifficultyText(name){const a=agentProfile(name),r=agentRelation(name);const score=a.toughness-(r-50)*.42;return score>=78?'Muy difícil':score>=64?'Difícil':score>=48?'Normal':'Accesible'}
function personalityArchetype(p){const q=p.personality||{};const vals=[['Ambicioso',q.ambition],['Leal',q.loyalty],['Profesional',q.professionalism],['Temperamental',q.temperament],['Adaptable',q.adaptability],['Ego alto',q.ego],['Fiable bajo presión',q.pressure]].sort((a,b)=>(b[1]||50)-(a[1]||50));return vals[0][1]>=72?vals[0][0]:'Equilibrado'}
function personalityDetailsHtml(p,ownerClub){
  const own=ownerClub?.id===state.userClubId,level=knowledgeLevel(p,ownerClub);if(!own&&level<3)return `<div class="card inner-card"><h3>Personalidad</h3><p class="muted">Necesitas un informe completo para conocer mejor su carácter y motivaciones.</p></div>`;
  const q=p.personality||{},des=playerDesire(p,ownerClub),agent=agentProfile(p.agent),rel=agentRelation(p.agent);
  const rows=[['Ambición',q.ambition,'Prioriza proyectos competitivos y grandes ligas.'],['Lealtad',q.loyalty,'Predisposición a permanecer en un proyecto estable.'],['Profesionalidad',q.professionalism,'Entrenamiento, disciplina y desarrollo.'],['Temperamento',q.temperament,'Reacción a conflictos y decisiones difíciles.'],['Adaptación',q.adaptability,'Facilidad para encajar en nuevos países y vestuarios.'],['Ego',q.ego,'Necesidad de protagonismo y sensibilidad al rol.'],['Presión',q.pressure,'Respuesta a partidos y situaciones importantes.']];
  return `<div class="grid two"><div class="card inner-card"><div class="eyebrow">Arquetipo</div><h3>${personalityArchetype(p)}</h3><div class="personality-bars">${rows.map(([n,v,d])=>`<div class="personality-row"><div><span>${n}</span><small>${d}</small></div><div class="mini-score">${Math.round(v||50)}</div></div>`).join('')}</div></div><div class="card inner-card"><div class="eyebrow">Situación personal</div><h3>${des.label}</h3><p class="muted">${des.text}</p><div class="stat-row"><span>Agente</span><b>${p.agent}</b></div><div class="stat-row"><span>Estilo</span><b>${agent.style}</b></div><div class="stat-row"><span>Relación contigo</span><b>${rel}/100</b></div><div class="stat-row"><span>Dificultad negociadora</span><b>${agentDifficultyText(p.agent)}</b></div></div></div>`;
}
function playerDesire(p,ownerClub){
  const q=p.personality||{},own=ownerClub?.id===state.userClubId,role=p.state?.roleSatisfaction??70,adapt=p.state?.teamAdaptation??70,mor=p.state?.morale??70;
  if(own&&p.transferRequest)return {code:'EXIT',label:'Quiere salir',text:'Ha comunicado que quiere estudiar una salida del club.'};
  if(own&&(q.adaptability||50)<42&&p.nationality!=='ESP'&&adapt<55)return {code:'HOME',label:'Dificultades de adaptación',text:`Echa de menos su entorno y valora regresar a ${nationalityLabel[p.nationality]||p.nationality} o a un contexto más familiar.`};
  if(own&&(q.ambition||50)>=78&&BBGM.overall(p)>=80&&state.board?.confidence<62)return {code:'AMBITION',label:'Quiere un proyecto ganador',text:'Su ambición le hace dudar si el proyecto no compite al máximo nivel.'};
  if(own&&(q.ego||50)>=74&&role<58)return {code:'ROLE',label:'Exige más protagonismo',text:'Su ego y su rol actual pueden generar un conflicto si no aumenta su protagonismo.'};
  if(own&&(q.loyalty||50)>=76&&p.contractYears<=1&&mor>=62)return {code:'STAY',label:'Predispuesto a continuar',text:'Valora la estabilidad y estaría receptivo a una renovación razonable.'};
  return {code:'OK',label:'Situación estable',text:'No hay una motivación personal urgente que condicione su futuro.'};
}
function ensureMentorPairs(){
  const r=userClub().roster,allYoung=[...r.filter(p=>p.age<=22),...(state.academy?.players||[])],valid=new Set([...r,...allYoung].map(p=>p.id));state.lockerRoom.mentorPairs=(state.lockerRoom.mentorPairs||[]).filter(x=>valid.has(x.mentorId)&&valid.has(x.youngId));
  if(state.lockerRoom.mentorPairs.length>=3)return;const vets=r.filter(p=>p.age>=28&&(p.personality?.professionalism||50)>=62).sort((a,b)=>leadershipScore(b)-leadershipScore(a));const youths=allYoung.sort((a,b)=>(b.potentialReal||0)-(a.potentialReal||0));
  for(const v of vets)for(const y of youths){if(state.lockerRoom.mentorPairs.length>=3)return;if(v.id===y.id||!(samePositionGroup(v,y)||Math.abs(['PG','SG','SF','PF','C'].indexOf(v.primaryPosition)-['PG','SG','SF','PF','C'].indexOf(y.primaryPosition))<=1)||state.lockerRoom.mentorPairs.some(x=>x.mentorId===v.id||x.youngId===y.id))continue;state.lockerRoom.mentorPairs.push({mentorId:v.id,youngId:y.id,since:state.currentDate});changeRelationship(v,y,6);break}
}
function mentorEffectAfterUserMatch(){ensureMentorPairs();for(const m of state.lockerRoom.mentorPairs||[]){const v=userClub().roster.find(p=>p.id===m.mentorId),y=playerLocation(m.youngId)?.player;if(!v||!y)continue;y.state.confidence=BBGM.clamp((y.state.confidence||65)+.12,0,100);y.state.morale=BBGM.clamp((y.state.morale||65)+.06,0,100)}}
function ensureV14State(){
  if(!state)return;state.version=APP_VERSION.code;state.agentRelations=state.agentRelations||{};state.lockerRoom=state.lockerRoom||{};state.lockerRoom.relationshipOverrides=state.lockerRoom.relationshipOverrides||{};state.lockerRoom.mentorPairs=state.lockerRoom.mentorPairs||[];state.lockerRoom.lastPersonalityGame=state.lockerRoom.lastPersonalityGame||0;
  const all=[...state.world.clubs.flatMap(c=>c.roster),...(state.world.freeAgents||[]),...(state.academy?.players||[])];for(const p of all){p.personality=p.personality||{};for(const k of ['professionalism','ambition','loyalty','temperament','pressure','adaptability','ego'])if(p.personality[k]==null)p.personality[k]=50;p.state=p.state||{};if(p.state.roleSatisfaction==null)p.state.roleSatisfaction=72;if(p.state.contractSatisfaction==null)p.state.contractSatisfaction=72;if(p.agent&&!Object.prototype.hasOwnProperty.call(state.agentRelations,p.agent))state.agentRelations[p.agent]=50}
  ensureMentorPairs();
}
function maybeGeneratePersonalityEvent(){
  ensureV14State();const played=(state.calendar||[]).filter(m=>m.status==='PLAYED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)).length;if(!played||played%5!==0||state.lockerRoom.lastPersonalityGame===played)return;state.lockerRoom.lastPersonalityGame=played;
  const r=userClub().roster,rng=new BBGM.RNG(hashCode(`${state.season}-${played}-personality-v14`));let candidates=[];
  for(const p of r){const d=playerDesire(p,userClub());let priority=d.code==='EXIT'?100:d.code==='HOME'?85:d.code==='AMBITION'?78:d.code==='ROLE'?72:d.code==='STAY'?55:0;priority+=rng.next()*15;if(priority>20)candidates.push({p,d,priority})}
  candidates.sort((a,b)=>b.priority-a.priority);const pick=candidates[0];
  if(pick&&pick.d.code==='HOME')addInbox('DECISION',`${fullName(pick.p)} no termina de adaptarse`,`${fullName(pick.p)} reconoce que echa de menos ${nationalityLabel[pick.p.nationality]||pick.p.nationality}. Su adaptación al entorno está siendo complicada.`,{playerId:pick.p.id,choices:[{label:'Darle apoyo y tiempo',effect:'PERS_SUPPORT_ADAPT'},{label:'Abrir la puerta a una salida',effect:'PERS_HOME_EXIT'},{label:'Exigir concentración profesional',effect:'PERS_HARDLINE'}]});
  else if(pick&&pick.d.code==='AMBITION')addInbox('DECISION',`${fullName(pick.p)} cuestiona la ambición del proyecto`,`El jugador quiere garantías de que el club seguirá construyendo una plantilla capaz de competir por títulos.`,{playerId:pick.p.id,choices:[{label:'Prometer un proyecto ambicioso',effect:'PERS_PROMISE_WIN'},{label:'No hacer promesas',effect:'PERS_NO_PROMISE'},{label:'Escuchar ofertas',effect:'PERS_EXIT_MARKET'}]});
  else if(pick&&pick.d.code==='ROLE')addInbox('DECISION',`${fullName(pick.p)} exige más protagonismo`,`Su personalidad hace que lleve mal su situación actual y quiere un papel mayor en la rotación.`,{playerId:pick.p.id,choices:[{label:'Hablar con el entrenador',effect:'TALK_COACH_MORE'},{label:'Mantener la jerarquía',effect:'PERS_ROLE_HOLD'},{label:'Estudiar una salida',effect:'PERS_EXIT_MARKET'}]});
  else if(pick&&pick.d.code==='STAY')addInbox('DECISION',`${fullName(pick.p)} quiere hablar de continuidad`,`Su entorno transmite que está cómodo en el club y estaría dispuesto a estudiar una renovación.`,{playerId:pick.p.id,choices:[{label:'Mostrar interés en renovarlo',effect:'PERS_RENEW_WARM'},{label:'Esperar a final de temporada',effect:'PERS_RENEW_WAIT'}]});
  else {const mentors=state.lockerRoom.mentorPairs||[];if(mentors.length&&rng.next()<.75){const mp=rng.pick(mentors),v=r.find(p=>p.id===mp.mentorId),y=playerLocation(mp.youngId)?.player;if(v&&y)addInbox('DECISION',`${fullName(v)} está ayudando a ${fullName(y)}`,`El veterano se ha convertido en una referencia para el joven dentro del vestuario.`,{playerId:v.id,otherPlayerId:y.id,choices:[{label:'Reforzar la mentoría',effect:'PERS_MENTOR_SUPPORT'},{label:'Dejar que fluya naturalmente',effect:'PERS_MENTOR_NATURAL'}]})}}
}
function renderAgents(root){
  ensureV14State();const map={};for(const c of state.world.clubs)for(const p of c.roster){(map[p.agent]||(map[p.agent]=[])).push(p)}for(const p of state.world.freeAgents||[])(map[p.agent]||(map[p.agent]=[])).push(p);const rows=Object.entries(map).map(([name,players])=>({name,players,profile:agentProfile(name),relation:agentRelation(name)})).sort((a,b)=>b.profile.prestige-a.profile.prestige);
  root.innerHTML=`<div class="card"><div class="section-inline"><div><div class="eyebrow">Representantes</div><h3>Relación con agentes</h3></div><span class="pill">${rows.length} agencias</span></div><p class="muted">Una mejor relación facilita conversaciones futuras; rechazos, conflictos y negociaciones rotas pueden deteriorarla.</p><div class="table-wrap"><table><thead><tr><th>Agente</th><th>Estilo</th><th>Prestigio</th><th>Relación</th><th>Dificultad</th><th>Jugadores</th></tr></thead><tbody>${rows.map(x=>`<tr><td><b>${x.name}</b></td><td>${x.profile.style}</td><td>${x.profile.prestige}</td><td><b>${x.relation}/100</b></td><td>${agentDifficultyText(x.name)}</td><td>${x.players.length}</td></tr>`).join('')}</tbody></table></div></div>`;
}

function recentResultsHtml(){const ms=(state.calendar||[]).filter(m=>m.status==='PLAYED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)).slice(-5).reverse();if(!ms.length)return '<p class="muted">Aún no hay resultados.</p>';return ms.map(m=>{const home=m.homeClubId===state.userClubId,win=home?m.homeScore>m.awayScore:m.awayScore>m.homeScore,opp=club(home?m.awayClubId:m.homeClubId);return `<div class="recent-result ${win?'win':'loss'}"><span>${win?'V':'D'} · ${opp?.shortName||'Rival'}</span><b>${home?m.homeScore:m.awayScore}-${home?m.awayScore:m.homeScore}</b></div>`}).join('')}
function dashboardExtraHtml(){const lm=lockerRoomMetrics(),need=allSquadNeeds()[0],unhappy=userClub().roster.filter(p=>(p.state.morale||70)<48||(p.state.roleSatisfaction||70)<45).slice(0,3);return `<div class="grid three dashboard-extra" style="margin-top:16px"><div class="card"><div class="eyebrow">Últimos partidos</div><h3>Forma reciente</h3>${recentResultsHtml()}</div><div class="card"><div class="section-inline"><div><div class="eyebrow">Vestuario</div><h3>${lm.label}</h3></div><div class="confidence-score small-score">${Math.round(lm.harmony)}</div></div><div class="bar"><i style="width:${Math.round(lm.harmony)}%"></i></div>${unhappy.length?`<p class="tiny warn">Atención: ${unhappy.map(fullName).join(', ')}</p>`:'<p class="tiny muted">No hay focos graves de descontento.</p>'}<button class="btn small" id="openLockerHome">Ver vestuario</button></div><div class="card"><div class="eyebrow">Planificación</div><h3>${positionLabel[need.pos]} · necesidad ${need.label.toLowerCase()}</h3><p class="muted tiny">Profundidad: ${need.depth.length} jugador(es).</p><button class="btn small" id="openPlanningHome">Planificar plantilla</button></div></div>`}

function addDays(iso,days){const d=new Date(iso+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)}


// ===== v0.15 economy, financial health and advanced sponsorship =====
function financeSeason(){return state?.economy?.season||state?.season||'2026/27'}
function ensureClubFinance(c){
  if(c.financialHealth==null)c.financialHealth=BBGM.clamp(42+(c.reputation||70)*.27+Math.min(12,((c.cashBudget||0)/Math.max(1,BBGM.wageBill(c)))*15),28,92);
  if(c.commercialPower==null)c.commercialPower=BBGM.clamp((c.reputation||70)*.82+(c.leagueLevel==='NBA'?16:c.leagueLevel==='EUROLEAGUE'?8:0),35,99);
  if(c.marketSize==null)c.marketSize=BBGM.clamp(42+(c.reputation||70)*.48+(c.leagueLevel==='NBA'?12:0),35,98);
  if(c.baseSalaryBudget==null)c.baseSalaryBudget=c.salaryBudget||BBGM.wageBill(c)*1.08;
  if(c.baseStaffBudget==null)c.baseStaffBudget=c.staffBudget||2500000;
  return c;
}
function ensureV15State(){
  if(!state)return;
  state.world?.clubs?.forEach(ensureClubFinance);
  BBGM.marketAI?.ensureWorld(state.world);
  if(!state.economy)state.economy={season:state.season,seasonStartCash:userClub()?.cashBudget||0,entries:[],history:[],processedMatches:{},prizeProcessedSeason:null,forecastNote:null};
  if(!Array.isArray(state.economy.entries))state.economy.entries=[];
  if(!Array.isArray(state.economy.history))state.economy.history=[];
  if(!state.economy.processedMatches)state.economy.processedMatches={};
  if(!state.economy.season)state.economy.season=state.season;
  if(state.economy.season!==state.season){state.economy.season=state.season;state.economy.seasonStartCash=userClub()?.cashBudget||0;state.economy.entries=[];state.economy.processedMatches={};state.economy.prizeProcessedSeason=null}
  if(state.board&&!state.board.objectives.some(o=>o.id==='FIN'))state.board.objectives.push({id:'FIN',label:'Mantener una estructura financiera sostenible',target:1});
  if(state.sponsorship&&state.sponsorship.brandReputation==null)state.sponsorship.brandReputation=60;
}

const ACHIEVEMENT_DEFS=[
  {id:'FIRST_WIN',icon:'✓',name:'Primera victoria',desc:'Gana tu primer partido oficial.'},
  {id:'FIVE_STREAK',icon:'🔥',name:'En racha',desc:'Consigue cinco victorias consecutivas.'},
  {id:'COPA_CHAMP',icon:'🏆',name:'Rey de Copa',desc:'Gana la Copa del Rey.'},
  {id:'ACB_CHAMP',icon:'★',name:'Campeón ACB',desc:'Gana la Liga ACB.'},
  {id:'EL_CHAMP',icon:'◆',name:'Europa conquistada',desc:'Gana la Euroliga.'},
  {id:'FINAL_FOUR',icon:'4',name:'Final Four',desc:'Clasifica al club para una Final Four.'},
  {id:'ACADEMY_80',icon:'↗',name:'Producto de casa',desc:'Desarrolla un canterano hasta 80 OVR.'},
  {id:'FIN_HEALTH',icon:'€',name:'Club saneado',desc:'Termina una temporada con salud financiera de 80 o más.'},
  {id:'REP_75',icon:'♛',name:'Director de élite',desc:'Alcanza 75 de reputación como director deportivo.'},
  {id:'THREE_TITLES',icon:'3',name:'Proyecto ganador',desc:'Acumula tres títulos oficiales en tu carrera.'}
];

// ===== v0.17 experiencia de juego: pretemporada, agenda, centro de avisos, búsqueda y resúmenes =====
function ensureV17State(){
  if(!state)return;
  state.version=APP_VERSION.code;
  state.preseason=state.preseason||{active:false,weeksRemaining:0,focus:'BALANCED',friendlies:[],season:null};
  state.weeklySummaries=Array.isArray(state.weeklySummaries)?state.weeklySummaries:[];
  state.weeklyMeta=state.weeklyMeta||{lastDate:state.currentDate};
  state.scheduleUi=state.scheduleUi||{mode:'month',month:(state.currentDate||'2026-09-01').slice(0,7)};
  state.notificationPrefs=state.notificationPrefs||{filter:'ALL'};
  state.aiFrontOffice=state.aiFrontOffice||{lastMonth:null};
  state.preseasonReviews=state.preseasonReviews||[];
  scheduleMode=state.scheduleUi.mode||scheduleMode||'month';
  scheduleMonth=state.scheduleUi.month||scheduleMonth||(state.currentDate||'2026-09-01').slice(0,7);
  inboxFilter=state.notificationPrefs.filter||inboxFilter||'ALL';
}
function v17DateLabel(d){try{return new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short'}).format(new Date(d+'T12:00:00'))}catch(_e){return d}}
function fitScoreV17(p,c=userClub()){
  const coach=c.coach||{},o=BBGM.overall(p),a=p.attributes||{};
  let score=54+(o-75)*1.15;
  const pace=(coach.preferredPace||50)/100,per=(coach.preferredPerimeterFocus||50)/100,press=(coach.preferredPressure||50)/100;
  score+=(a.speed-70)*.07*pace+(a.threePoint-70)*.07*per+(a.perimeterDefense-70)*.05*press+(a.basketballIq-70)*.045;
  if(c.id===state.userClubId){const need=allSquadNeeds().find(x=>x.pos===p.primaryPosition);if(need)score+=need.label==='Alta'?8:need.label==='Media'?4:1;if(state.planning?.priorityPosition&&(p.primaryPosition===state.planning.priorityPosition||p.secondaryPosition===state.planning.priorityPosition))score+=5}
  return BBGM.clamp(score,20,98)
}
function fitLabelV17(p,c=userClub()){const v=fitScoreV17(p,c);return {value:Math.round(v),label:v>=84?'Excelente':v>=72?'Bueno':v>=58?'Normal':v>=45?'Dudoso':'Malo'}}
function playerV17SummaryHtml(p,ownerClub){
  const st=seasonStatsMap()[p.id],fit=fitLabelV17(p,userClub()),mv=BBGM.marketValue(p),isOwn=ownerClub?.id===state.userClubId;
  return `<div class="profile-summary-grid"><div><small>Encaje Baskonia</small><b>${fit.label}</b><span>${fit.value}/100</span></div><div><small>Valor estimado</small><b>${fmtMoney(mv)}</b><span>${p.age} años</span></div><div><small>Temporada</small><b>${st?`${st.ppg.toFixed(1)} PTS`:'Sin datos'}</b><span>${st?`${st.rpg.toFixed(1)} REB · ${st.apg.toFixed(1)} AST`:'—'}</span></div><div><small>Perfil</small><b>${pArchetypeV20(p)}</b><span>${isOwn?roleLabel[p.role]:(ownerClub?.shortName||'Libre')} · ${p.contractYears?`${p.contractYears} año(s)`:'Agente libre'}</span></div></div>`
}
function createPreseasonFriendlies(season=state.season,startDate=state.currentDate){
  const rng=new BBGM.RNG(hashCode(`${season}-preseason-v17`)),cands=state.world.clubs.filter(c=>c.id!==state.userClubId&&c.leagueLevel!=='NBA'&&!['Real Madrid','Barcelona','Panathinaikos','Olympiacos'].includes(c.name)).filter(c=>c.baseRating>=70&&c.baseRating<=82);
  const used=new Set(),arr=[];for(let i=0;i<3;i++){let c=null;for(let t=0;t<30;t++){const x=rng.pick(cands);if(x&&!used.has(x.id)){c=x;break}}if(!c)c=rng.pick(cands);used.add(c.id);arr.push({id:`PRE-${season}-${i+1}`,date:addDays(startDate,5+i*7),opponentId:c.id,status:'SCHEDULED',home:i%2===0,result:null})}return arr
}
function activatePreseason(startDate=state.currentDate){ensureV17State();state.preseason={active:true,weeksRemaining:3,focus:state.preseason?.focus||'BALANCED',friendlies:createPreseasonFriendlies(state.season,startDate),season:state.season};addInbox('SEASON','Comienza la pretemporada','Tienes tres semanas para ajustar roles, entrenamiento, patrocinio y plantilla antes de la competición oficial.');}
function applyPreseasonFocus(){const f=state.preseason.focus||'BALANCED';for(const p of userClub().roster){if(f==='PHYSICAL'){p.state.fitness=BBGM.clamp((p.state.fitness||90)+2,0,100);p.state.fatigue=BBGM.clamp((p.state.fatigue||10)+1,0,75);p.attributes.stamina=BBGM.clamp(p.attributes.stamina+.05,1,100)}else if(f==='SHOOTING'){p.state.confidence=BBGM.clamp((p.state.confidence||70)+1.2,0,100);p.attributes.threePoint=BBGM.clamp(p.attributes.threePoint+.035,1,100)}else if(f==='DEFENSE'){p.attributes.helpDefense=BBGM.clamp(p.attributes.helpDefense+.035,1,100);p.state.teamAdaptation=BBGM.clamp((p.state.teamAdaptation||70)+1.2,0,100)}else if(f==='CHEMISTRY'){p.state.morale=BBGM.clamp((p.state.morale||70)+1.1,0,100);p.state.teamAdaptation=BBGM.clamp((p.state.teamAdaptation||70)+1.8,0,100)}else{p.state.fitness=BBGM.clamp((p.state.fitness||90)+1,0,100);p.state.teamAdaptation=BBGM.clamp((p.state.teamAdaptation||70)+.8,0,100)}}}
function simulatePreseasonFriendly(fr){const uc=userClub(),opp=club(fr.opponentId),home=fr.home?uc:opp,away=fr.home?opp:uc,res=BBGM.simulateMatch(home,away,hashCode(`${fr.id}-${state.season}`));fr.status='PLAYED';fr.result=res;fr.homeScore=res.homeScore;fr.awayScore=res.awayScore;const userStats=fr.home?res.homeStats:res.awayStats;updatePlayerState(uc,userStats,fr.home?res.homeScore>res.awayScore:res.awayScore>res.homeScore);maybeGenerateMatchInjuries(uc,userStats,fr.date);return res}
function advancePreseasonWeek(){ensureV17State();if(interruptForPendingDecision())return;if(!state.preseason?.active)return;const fr=state.preseason.friendlies.find(x=>x.status==='SCHEDULED');if(fr){simulatePreseasonFriendly(fr);state.currentDate=fr.date;addInbox('RESULT',`Amistoso: ${userClub().shortName} ${fr.home?fr.homeScore:fr.awayScore}-${fr.home?fr.awayScore:fr.homeScore} ${club(fr.opponentId).shortName}`,`Pretemporada · ${fr.date}`,{preseasonMatchId:fr.id})}applyPreseasonFocus();processScouting(state.currentDate);processMedicalTo(state.currentDate);state.preseason.weeksRemaining--;maybeRecordWeeklySummary(true);if(state.preseason.weeksRemaining<=0){state.preseason.active=false;state.currentDate=addDays(state.currentDate,2);state.preseasonReviews.unshift({season:state.season,focus:state.preseason.focus,results:state.preseason.friendlies.map(x=>({opponentId:x.opponentId,homeScore:x.homeScore,awayScore:x.awayScore,home:x.home}))});addInbox('SEASON','Pretemporada completada','La plantilla queda lista para la competición oficial. Revisa los últimos roles y el estado físico antes del primer partido.');toast('Pretemporada completada')}else toast(`Quedan ${state.preseason.weeksRemaining} semanas de pretemporada`);saveLocal(false);render()}
function preseasonFocusLabel(f){return {BALANCED:'Equilibrio',PHYSICAL:'Físico',SHOOTING:'Tiro',DEFENSE:'Defensa',CHEMISTRY:'Cohesión'}[f]||f}
function renderPreseason(v){ensureV17State();const ps=state.preseason,exp=userClub().roster.filter(p=>p.contractYears===1),unhappy=userClub().roster.filter(p=>(p.state.morale||70)<52),avgFit=userClub().roster.reduce((n,p)=>n+(p.state.fitness||90),0)/Math.max(1,userClub().roster.length);v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Preparación</div><h1>Pretemporada</h1><p>Ajusta plantilla y carga de trabajo antes de la competición oficial.</p></div><button class="btn primary" id="advancePre">${ps.active?`Avanzar semana (${ps.weeksRemaining})`:'Pretemporada completada'}</button></div><div class="grid four"><div class="card"><div class="eyebrow">Estado físico</div><div class="big-metric">${avgFit.toFixed(0)}<small>/100</small></div></div><div class="card"><div class="eyebrow">Contratos por revisar</div><div class="big-metric">${exp.length}</div></div><div class="card"><div class="eyebrow">Moral baja</div><div class="big-metric">${unhappy.length}</div></div><div class="card"><div class="eyebrow">Patrocinador</div><h3>${state.sponsorship?.active?.name||'Pendiente'}</h3></div></div><div class="grid two" style="margin-top:16px"><div class="card"><h3>Foco de pretemporada</h3><div class="preseason-focus">${['BALANCED','PHYSICAL','SHOOTING','DEFENSE','CHEMISTRY'].map(f=>`<button class="btn ${ps.focus===f?'good':''}" data-prefocus="${f}">${preseasonFocusLabel(f)}</button>`).join('')}</div><p class="muted tiny" style="margin-top:12px">El foco afecta ligeramente a forma, adaptación y desarrollo. No sustituye al entrenamiento individual.</p><div class="action-row"><button class="btn" id="preRoles">Revisar roles</button><button class="btn" id="prePlanning">Planificación</button><button class="btn" id="preSponsors">Patrocinadores</button></div></div><div class="card"><h3>Amistosos</h3>${(ps.friendlies||[]).map(fr=>`<div class="friendly-row"><span>${v17DateLabel(fr.date)} · ${fr.home?'vs':'@'} ${club(fr.opponentId)?.name}</span><b>${fr.status==='PLAYED'?`${fr.home?fr.homeScore:fr.awayScore}-${fr.home?fr.awayScore:fr.homeScore}`:'Pendiente'}</b></div>`).join('')||'<p class="muted">Sin amistosos programados.</p>'}</div></div>`;const a=v.querySelector('#advancePre');if(a)a.onclick=advancePreseasonWeek;v.querySelectorAll('[data-prefocus]').forEach(b=>b.onclick=()=>{state.preseason.focus=b.dataset.prefocus;saveLocal(false);render()});v.querySelector('#preRoles').onclick=()=>{currentView='squad';render()};v.querySelector('#prePlanning').onclick=()=>{currentView='planning';render()};v.querySelector('#preSponsors').onclick=()=>{currentView='sponsors';render()}}
function notificationCategory(e){if(['INJURY','DECISION','TRANSFER_OFFER','CONTRACT'].includes(e.type))return 'URGENT';if(['SCOUTING','SCOUT_COMPLETE'].includes(e.type))return 'SCOUT';if(['PLAYER_UNHAPPY','PLAYER_ROLE','LOCKER','MEDICAL','TRAINING'].includes(e.type))return 'TEAM';if(['NBA','TRANSFER','MARKET','MARKET_OFFER','MARKET_DEADLINE','MARKET_CLOSED','LOAN'].includes(e.type))return 'MARKET';if(['BOARD','BOARD_FINANCE','FINANCE','SPONSOR','SEASON'].includes(e.type))return 'CLUB';return 'INFO'}
function notificationCategoryLabel(category){return {URGENT:'Urgente',TEAM:'Plantilla',MARKET:'Mercado',SCOUT:'Scouting',CLUB:'Club',INFO:'Información'}[category]||category}
function notificationTarget(e){
  const title=String(e.title||'').toLowerCase();
  if(e.type==='RESULT')return {label:'Ver resumen',kind:'match'};
  if(e.type==='SCOUT_COMPLETE'&&e.playerId)return {label:'Ver informe',kind:'player'};
  if(e.type==='TRANSFER_OFFER'&&e.playerId)return {label:'Ver jugador',kind:'player'};
  if(e.type==='DECISION'&&e.playerId)return {label:'Ver jugador',kind:'player'};
  if(['INJURY','MEDICAL'].includes(e.type))return {label:'Abrir departamento médico',view:'medical'};
  if(['PLAYER_UNHAPPY','PLAYER_ROLE','TRAINING','LOCKER'].includes(e.type))return e.playerId?{label:'Ver jugador',kind:'player'}:{label:'Abrir plantilla',view:'squad'};
  if(['ACADEMY','LOAN','DEVELOPMENT'].includes(e.type))return {label:'Abrir cantera',view:'academy'};
  if(e.type==='SCOUTING')return {label:'Abrir scouting',view:'market',tab:'scouting'};
  if(e.type==='CONTRACT')return {label:'Revisar contratos',view:'market',tab:'contracts'};
  if(e.type==='TRANSFER_OFFER')return {label:'Abrir ofertas',view:'market',tab:'offers'};
  if(['MARKET','MARKET_OFFER','MARKET_DEADLINE','MARKET_CLOSED','TRANSFER'].includes(e.type))return {label:'Abrir mercado',view:'market',tab:e.type==='MARKET_OFFER'?'offers':'players'};
  if(e.type==='NBA')return {label:'Abrir NBA / Draft',view:'nba'};
  if(e.type==='NATIONAL')return {label:'Ver internacionales',view:'international'};
  if(e.type==='SPONSOR')return {label:'Abrir patrocinadores',view:'sponsors'};
  if(['FINANCE','BOARD_FINANCE'].includes(e.type))return {label:'Abrir finanzas',view:'finance'};
  if(e.type==='STAFF')return {label:title.includes('ojeador')?'Ver ojeadores':'Ver entrenadores',view:'market',tab:title.includes('ojeador')?'scouts':'coaches'};
  if(e.type==='COACH')return {label:'Hablar con el entrenador',view:'coach'};
  if(e.type==='COMPETITION')return {label:'Ver competición',view:'standings'};
  if(e.type==='SEASON')return state.preseason?.active?{label:'Abrir pretemporada',view:'preseason'}:{label:'Ver calendario',view:'schedule'};
  if(['TITLE','ACHIEVEMENT'].includes(e.type))return {label:'Abrir historial',view:'history'};
  if(e.playerId)return {label:'Ver jugador',kind:'player'};
  return null;
}
function notificationActionsHtml(e){
  const actions=[];
  if(e.type==='TRANSFER_OFFER'&&!e.resolved)actions.push(`<button class="btn small good" data-offer-accept="${e.id}">Aceptar</button>`,`<button class="btn small" data-offer-reject="${e.id}">Rechazar</button>`);
  if(e.type==='DECISION'&&!e.resolved)actions.push(`<button class="btn small good" data-open-decision="${e.id}">${decisionActionLabel(e)}</button>`);
  const target=notificationTarget(e);if(target)actions.push(`<button class="btn small inbox-primary-action" data-inbox-open="${e.id}">${target.label} <span aria-hidden="true">→</span></button>`);
  const outcome=e.decisionResult?`<div class="decision-inline-result"><b>Decisión: ${e.decision||'registrada'}</b><span>${e.decisionResult}</span></div>`:'';
  return `${outcome}${actions.length?`<div class="inbox-actions">${actions.join('')}</div>`:''}`;
}
function decisionActionLabel(e){const effects=(e.choices||[]).map(c=>c.effect);return effects.some(x=>x?.startsWith('LOCKER_')||x==='PLAYER_CAPTAIN'||x==='TALK_COACH_MORE')?'Mediar':e.playerId?'Gestionar situación':'Tomar decisión'}
function decisionChoiceDetail(effect){return {
  TALK_COACH_MORE:'Pedirás al entrenador cinco minutos extra durante los próximos cinco partidos. Puede tensar vuestra relación.',
  HOLD_ROLE:'Mantendrás la jerarquía actual. Protege el plan deportivo, pero el jugador puede perder moral y satisfacción.',
  LIST_PLAYER:'El jugador quedará disponible en el mercado. Puede calmar la incertidumbre, pero debilita su compromiso.',
  TALK_COACH_REST:'Reducirás su carga durante cuatro partidos para bajar fatiga y riesgo físico.',
  KEEP_LOAD:'Mantendrás el plan competitivo aunque el jugador pueda sentirse poco protegido.',
  CLUB_NOT_FOR_SALE:'Cerrarás la puerta a cualquier negociación. El jugador se sentirá respaldado y mejorará su moral.',
  CLUB_INVITE_OFFER:'Invitarás al club interesado a presentar una oferta formal cuyo importe dependerá del valor del jugador.',
  CLUB_LOAN_OPEN:'Autorizarás estudiar una cesión. El jugador seguirá perteneciendo al club y podrá ganar minutos en otro equipo.',
  YOUTH_KEEP:'El joven seguirá en tu proyecto, entrenará con el primer equipo y recibirá una pequeña mejora de moral.',
  NBA_DECLARE:'Apoyarás que se presente al Draft NBA. Aumentará su moral, pero podría abandonar el club si es elegido.',
  NBA_WITHDRAW:'Le recomendarás esperar otra temporada. Seguirá en el proyecto, aunque su moral puede bajar ligeramente.',
  BOARD_YOUTH:'La prioridad será desarrollar jóvenes. Subirán la confianza de la directiva y tu valoración en desarrollo.',
  BOARD_RESULTS:'Priorizarás el rendimiento inmediato. Mejorarán ligeramente la confianza directiva y tu planificación.',
  FIN_WAGES:'Moverás hasta 350.000 € de caja para aumentar en 500.000 € el presupuesto salarial. La salud financiera bajará ligeramente.',
  FIN_SCOUT:'Invertirás hasta 300.000 € de caja en scouting. Mejorarán tu valoración y la capacidad de los ojeadores.',
  FIN_STABLE:'No gastarás recursos adicionales. Mejorarán la salud financiera y la confianza de la directiva.',
  V20_RENEW_NOW:'Abrirás inmediatamente la negociación de renovación con el jugador y su agente.',
  V20_RENEW_WAIT:'Aplazarás la renovación. Bajarán la satisfacción contractual del jugador y la relación con su agente.',
  LOCKER_MEDIATE:'Dirigirás una reunión cara a cara. Tu gestión de personal influirá directamente en ambos jugadores.',
  LOCKER_CAPTAIN:'El capitán intentará resolverlo. El desenlace dependerá de liderazgo, moral, química, temperamento y azar.',
  PLAYER_CAPTAIN:'El capitán hablará con el jugador sobre su papel. Liderazgo, relación personal, temperamento y azar decidirán el resultado.',
  LOCKER_IGNORE:'No intervendrás. El conflicto puede empeorar y afectar a la moral de ambos.',
  LOCKER_SUPPORT:'Respaldarás la iniciativa y reforzarás ligeramente la moral de toda la plantilla.',
  LOCKER_FOCUS:'Rechazarás la reunión para mantener toda la atención en los partidos y reforzar ligeramente tu autoridad.',
  PERS_SUPPORT_ADAPT:'Darás apoyo personal al jugador. Mejorarán claramente su adaptación, su moral y la relación con su agente.',
  PERS_HOME_EXIT:'Aceptarás buscar una salida. El jugador pedirá el traspaso y quedará disponible en el mercado.',
  PERS_HARDLINE:'Le exigirás que se centre. Mejorará un poco su adaptación, pero bajarán su moral y la relación con su agente.',
  PERS_PROMISE_WIN:'Prometerás construir un proyecto ganador esta temporada. Mejorarán su moral y la relación con su agente.',
  PERS_NO_PROMISE:'No comprometerás al club. El jugador perderá moral y, si es muy ambicioso, puede pedir salir.',
  PERS_EXIT_MARKET:'Abrirás la puerta a su marcha. Pedirá el traspaso, quedará en el mercado y empeorará la relación con su agente.',
  PERS_ROLE_HOLD:'Mantendrás su papel actual. Bajarán su moral y su satisfacción con el rol.',
  PERS_RENEW_WARM:'Le comunicarás que quieres renovarlo. Mejorarán mucho su satisfacción contractual y la relación con su agente.',
  PERS_RENEW_WAIT:'Pospondrás la conversación hasta final de temporada. Su moral bajará ligeramente.',
  PERS_MENTOR_SUPPORT:'Formalizarás la mentoría. Mejorarán mucho la relación entre ambos, la confianza del joven y la moral del veterano.',
  PERS_MENTOR_NATURAL:'No intervendrás en la mentoría. La relación entre ambos seguirá creciendo, pero más lentamente.'
}[effect]||'No hay una previsión disponible para esta opción.'}
function captainInterventionChance(ev){
  const cap=userClub().roster.find(x=>x.id===state.lockerRoom.captainId),p=ev.playerId?playerLocation(ev.playerId)?.player:null,p2=ev.otherPlayerId?playerLocation(ev.otherPlayerId)?.player:null;
  if(!cap)return {cap:null,available:false,chance:0,pair:0,temperament:100,leadership:0};
  if(cap.id===p?.id||cap.id===p2?.id)return {cap,available:false,chance:0,pair:0,temperament:p?.personality?.temperament||50,leadership:leadershipScore(cap),morale:cap.state?.morale??70};
  const pair=p&&p2?chemistryPair(p,p2):p&&p.id!==cap.id?chemistryPair(cap,p):lockerRoomMetrics().pairAvg,temperament=p2?((p?.personality?.temperament||50)+(p2.personality?.temperament||50))/2:(p?.personality?.temperament||50),leadership=leadershipScore(cap),morale=cap.state?.morale??70;
  const chance=BBGM.clamp(.15+leadership*.005+morale*.001+pair*.002-temperament*.0025,.18,.88);
  return {cap,available:true,chance,pair,temperament,leadership,morale};
}
function resolveCaptainDelegation(ev){
  const p=ev.playerId?playerLocation(ev.playerId)?.player:null,p2=ev.otherPlayerId?playerLocation(ev.otherPlayerId)?.player:null,f=captainInterventionChance(ev),rng=new BBGM.RNG(hashCode(`${state.season}-${ev.id}-${state.currentDate}-captain-decision`)),roll=rng.next(),success=roll<f.chance,partial=!success&&roll<f.chance+.18;
  if(!f.available)return f.cap?'El capitán está implicado directamente y no puede mediar en su propia situación.':'No había un capitán disponible para intervenir.';
  if(success){
    f.cap.state.morale=BBGM.clamp((f.cap.state.morale||70)+2,0,100);
    if(p)p.state.morale=BBGM.clamp((p.state.morale||70)+2,0,100);
    if(p2){p2.state.morale=BBGM.clamp((p2.state.morale||70)+2,0,100);changeRelationship(p,p2,7)}else if(p)p.state.roleSatisfaction=BBGM.clamp((p.state.roleSatisfaction||70)+3,0,100);
  }else if(partial){if(p&&p2)changeRelationship(p,p2,2);else if(p)p.state.morale=BBGM.clamp((p.state.morale||70)-1,0,100)}
  else{
    f.cap.state.morale=BBGM.clamp((f.cap.state.morale||70)-2,0,100);
    if(p)p.state.morale=BBGM.clamp((p.state.morale||70)-3,0,100);
    if(p2){p2.state.morale=BBGM.clamp((p2.state.morale||70)-3,0,100);changeRelationship(p,p2,-6)}else if(p)p.state.roleSatisfaction=BBGM.clamp((p.state.roleSatisfaction||70)-5,0,100);
  }
  ev.captainResolution={captainId:f.cap.id,chance:Math.round(f.chance*100),roll:+roll.toFixed(4),outcome:success?'SUCCESS':partial?'PARTIAL':'FAILURE'};
  if(p2)return success?`${fullName(f.cap)} gestiona bien la conversación: su liderazgo se impone y la relación entre los jugadores mejora 7 puntos.`:partial?`${fullName(f.cap)} contiene el problema, pero no lo resuelve del todo. La relación mejora 2 puntos y habrá que vigilarla.`:`La intervención de ${fullName(f.cap)} sale mal. Los jugadores rechazan su mediación: baja la moral y la relación empeora 6 puntos.`;
  return success?`${fullName(f.cap)} convence a ${fullName(p)} para aceptar su papel por ahora. Mejoran su moral y la satisfacción con el rol.`:partial?`${fullName(f.cap)} calma momentáneamente a ${fullName(p)}, pero la petición de minutos sigue latente.`:`${fullName(p)} rechaza la intervención de ${fullName(f.cap)}. Bajan su moral y satisfacción, y el capitán también queda afectado.`;
}
function decisionSituationHtml(ev){
  const p=ev.playerId?playerLocation(ev.playerId)?.player:null,p2=ev.otherPlayerId?playerLocation(ev.otherPlayerId)?.player:null,rot=p?BBGM.rotation(userClub()):null,mins=p?(rot.playerMinutes[p.id]||0):0,expected=p?(expectedRoleMinutes[p.role]||14):0;
  const rows=[];
  if(p)rows.push(['Jugador',fullName(p)],['Moral',`${Math.round(p.state?.morale??70)}/100`],['Satisfacción con el rol',`${Math.round(p.state?.roleSatisfaction??70)}/100`]);
  if(p&&p2)rows.push(['Otro jugador',fullName(p2)],['Relación actual',`${chemistryPair(p,p2)}/100`]);
  else if(p)rows.push(['Minutos',`${Math.round(mins)} previstos · ${Math.round(expected)} esperados por su rol`],['Personalidad',personalityArchetype(p)]);
  if((ev.choices||[]).some(c=>['LOCKER_CAPTAIN','PLAYER_CAPTAIN'].includes(c.effect))){const f=captainInterventionChance(ev);rows.push(['Capitán',f.cap?`${fullName(f.cap)} · liderazgo ${Math.round(f.leadership)}`:'No hay capitán'],['Opciones del capitán',f.available?`${Math.round(f.chance*100)}% de resolver bien la situación`:f.cap?'No puede mediar porque está implicado':'No puede intervenir hasta que nombres uno']);}
  return `<div class="decision-situation"><p>${ev.text}</p><div class="decision-factors">${rows.map(([k,v])=>`<div><span>${k}</span><b>${v}</b></div>`).join('')}</div></div>`;
}
function openDecisionModal(id){
  const ev=state.inbox.find(e=>String(e.id)===String(id));if(!ev)return;if(ev.resolved){toast('Esta decisión ya está resuelta');return}
  const captainFactors=captainInterventionChance(ev),back=modal(`<div class="modal-head"><div><div class="eyebrow">Decisión de gestión</div><h2>${ev.title}</h2></div><button class="btn" data-close>Cerrar</button></div>${decisionSituationHtml(ev)}<div class="decision-choice-list">${(ev.choices||[]).map((c,i)=>{const disabled=['LOCKER_CAPTAIN','PLAYER_CAPTAIN'].includes(c.effect)&&!captainFactors.available;return `<button data-modal-decision="${ev.id}" data-choice="${i}" ${disabled?'disabled':''}><b>${c.label}</b><span>${decisionChoiceDetail(c.effect)}</span></button>`}).join('')}</div><p class="tiny muted">La decisión se guarda al elegir una opción y sus consecuencias afectan a la partida.</p>`);
  back.querySelector('[data-close]').onclick=()=>back.remove();back.querySelectorAll('[data-modal-decision]').forEach(b=>b.onclick=()=>{const choice=(ev.choices||[])[+b.dataset.choice],result=resolveDecision(+b.dataset.modalDecision,+b.dataset.choice,true);back.remove();if(choice?.effect!=='V20_RENEW_NOW')showDecisionResult(ev,result)});
}
function pendingDecision(){return (state?.inbox||[]).find(e=>e.type==='DECISION'&&!e.resolved)||null}
function interruptForPendingDecision(showToast=true){
  const ev=pendingDecision();if(!ev)return false;
  openDecisionModal(ev.id);if(showToast)toast('Tienes una decisión pendiente antes de continuar');return true;
}
function showDecisionResult(ev,result){const back=modal(`<div class="modal-head"><div><div class="eyebrow">Consecuencia</div><h2>${ev.decision}</h2></div><button class="btn" data-close>Cerrar</button></div><div class="decision-result-card"><p>${result||ev.decisionResult||'La decisión ha quedado registrada.'}</p></div><div class="modal-actions"><button class="btn primary" data-close-bottom>Continuar</button></div>`);back.querySelector('[data-close]').onclick=()=>back.remove();back.querySelector('[data-close-bottom]').onclick=()=>back.remove()}
function preseasonMatchFromEvent(e){
  const fr=(state.preseason?.friendlies||[]).find(x=>String(x.id)===String(e.preseasonMatchId)||(x.date===e.date&&x.status==='PLAYED'));if(!fr?.result)return null;
  return {id:fr.id,date:fr.date,round:'Amistoso',competitionName:'Pretemporada',homeClubId:fr.home?state.userClubId:fr.opponentId,awayClubId:fr.home?fr.opponentId:state.userClubId,result:fr.result};
}
function openInboxTarget(id){
  const e=state.inbox.find(x=>String(x.id)===String(id));if(!e)return;
  const target=notificationTarget(e);if(!target)return;
  if(!['DECISION','TRANSFER_OFFER'].includes(e.type)){e.resolved=true;saveLocal(false)}
  if(target.kind==='player'){const loc=playerLocation(+e.playerId);if(loc){showPlayerProfile(loc.player,loc.club);return}toast('El jugador ya no está disponible');return}
  if(target.kind==='match'){
    const m=state.calendar.find(x=>String(x.id)===String(e.matchId))||state.calendar.find(x=>x.date===e.date&&x.status==='PLAYED'&&(x.homeClubId===state.userClubId||x.awayClubId===state.userClubId))||preseasonMatchFromEvent(e);
    if(m?.result){showResultModal(m,m.result);return}currentView='schedule';render();return;
  }
  if(target.tab)marketTab=target.tab;currentView=target.view;render();
}
function renderInboxCenter(v){ensureV17State();const filters=[['ALL','Todo'],['URGENT','Urgente'],['TEAM','Plantilla'],['MARKET','Mercado'],['SCOUT','Scouting'],['CLUB','Club'],['INFO','Info']],items=state.inbox.filter(e=>inboxFilter==='ALL'||notificationCategory(e)===inboxFilter);v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Centro de actividad</div><h1>Notificaciones</h1><p>${state.inbox.filter(e=>!e.resolved).length} asuntos sin resolver. Cada mensaje accionable te lleva directamente a donde puedes actuar.</p></div><button class="btn" id="markInfoRead">Marcar información como leída</button></div><div class="tabs notice-tabs">${filters.map(([k,l])=>`<button data-notice-filter="${k}" class="${inboxFilter===k?'active':''}">${l}</button>`).join('')}</div><div class="card notice-center">${items.length?items.map(x=>{const cat=notificationCategory(x);return `<article class="notice-row ${x.resolved?'resolved':''}"><div class="notice-tag">${notificationCategoryLabel(cat)}</div><div class="notice-body"><b>${x.title}</b><p>${x.text}</p><small>${x.date||''}</small>${notificationActionsHtml(x)}</div></article>`}).join(''):'<p class="muted">No hay mensajes en esta categoría.</p>'}</div>`;v.querySelectorAll('[data-notice-filter]').forEach(b=>b.onclick=()=>{inboxFilter=b.dataset.noticeFilter;state.notificationPrefs.filter=inboxFilter;saveLocal(false);renderInboxCenter(v)});v.querySelector('#markInfoRead').onclick=()=>{for(const e of state.inbox)if(!['DECISION','TRANSFER_OFFER'].includes(e.type))e.resolved=true;saveLocal(false);renderInboxCenter(v)};bindInboxActions(v)}
function maybeRecordWeeklySummary(force=false){ensureV17State();const last=state.weeklyMeta.lastDate||state.currentDate;if(!force&&daysBetween(last,state.currentDate)<7)return;const matches=state.calendar.filter(m=>m.status==='PLAYED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)&&m.date>last&&m.date<=state.currentDate);const results=matches.map(m=>{const home=m.homeClubId===state.userClubId,win=home?m.homeScore>m.awayScore:m.awayScore>m.homeScore;return {date:m.date,competition:m.competitionId,opponentId:home?m.awayClubId:m.homeClubId,score:`${home?m.homeScore:m.awayScore}-${home?m.awayScore:m.homeScore}`,win}});for(const fr of (state.preseason?.friendlies||[]).filter(x=>x.status==='PLAYED'&&x.date>last&&x.date<=state.currentDate)){const us=fr.home?fr.homeScore:fr.awayScore,them=fr.home?fr.awayScore:fr.homeScore;results.push({date:fr.date,competition:'PRE',opponentId:fr.opponentId,score:`${us}-${them}`,win:us>them})}results.sort((a,b)=>a.date.localeCompare(b.date));const newEvents=state.inbox.filter(e=>(e.date||'')>last&&(e.date||'')<=state.currentDate);const sum={id:`WS-${state.season}-${state.currentDate}`,from:last,to:state.currentDate,results,injuries:activeInjuries().map(p=>({playerId:p.id,name:p.currentInjury?.name})),scouting:newEvents.filter(e=>e.type==='SCOUT_COMPLETE').length,offers:newEvents.filter(e=>e.type==='TRANSFER_OFFER').length,decisions:newEvents.filter(e=>e.type==='DECISION').length,morale:Math.round(lockerRoomMetrics().morale),board:Math.round(state.board?.confidence??70)};state.weeklySummaries.unshift(sum);state.weeklySummaries=state.weeklySummaries.slice(0,30);state.weeklyMeta.lastDate=state.currentDate;return sum}
function weeklySummaryHtml(){ensureV17State();const w=state.weeklySummaries[0];if(!w)return `<div class="card"><div class="eyebrow">Resumen semanal</div><h3>Aún sin resumen</h3><p class="muted">Se generará al avanzar aproximadamente una semana.</p></div>`;return `<div class="card weekly-card"><div class="section-inline"><div><div class="eyebrow">Resumen semanal</div><h3>${v17DateLabel(w.from)} – ${v17DateLabel(w.to)}</h3></div><button class="btn small" id="openWeekly">Abrir</button></div><div class="weekly-kpis"><span><b>${w.results.filter(x=>x.win).length}-${w.results.filter(x=>!x.win).length}</b> balance</span><span><b>${w.injuries.length}</b> lesionados</span><span><b>${w.scouting}</b> informes</span><span><b>${w.offers}</b> ofertas</span></div><div class="tiny muted">Moral ${w.morale}/100 · Directiva ${w.board}/100</div></div>`}
function showWeeklySummaryModal(w=state.weeklySummaries[0]){if(!w)return;const back=modal(`<div class="modal-head"><div><div class="eyebrow">Resumen semanal</div><h2>${v17DateLabel(w.from)} – ${v17DateLabel(w.to)}</h2></div><button class="btn" data-close>Cerrar</button></div><div class="grid two"><div class="card inner-card"><h3>Resultados</h3>${w.results.length?w.results.map(r=>`<div class="recent-result ${r.win?'win':'loss'}"><span>${r.competition==='PRE'?'Amistoso':(comp(r.competition)?.shortName||r.competition)} · ${club(r.opponentId)?.shortName}</span><b>${r.score}</b></div>`).join(''):'<p class="muted">Sin partidos oficiales.</p>'}</div><div class="card inner-card"><h3>Actividad</h3><div class="stat-row"><span>Lesionados</span><b>${w.injuries.length}</b></div><div class="stat-row"><span>Informes scout</span><b>${w.scouting}</b></div><div class="stat-row"><span>Ofertas recibidas</span><b>${w.offers}</b></div><div class="stat-row"><span>Decisiones</span><b>${w.decisions}</b></div><div class="stat-row"><span>Moral vestuario</span><b>${w.morale}/100</b></div><div class="stat-row"><span>Confianza directiva</span><b>${w.board}/100</b></div></div></div>`);back.querySelector('[data-close]').onclick=()=>back.remove()}
function searchAllEntities(q){q=(q||'').trim().toLowerCase();if(!q)return {players:[],clubs:[],staff:[]};const players=[];for(const c of state.world.clubs)for(const p of c.roster)if(fullName(p).toLowerCase().includes(q))players.push({p,c});for(const p of state.world.freeAgents||[])if(fullName(p).toLowerCase().includes(q))players.push({p,c:null});const clubs=state.world.clubs.filter(c=>c.name.toLowerCase().includes(q)||c.shortName.toLowerCase().includes(q)||String(c.leagueName||'').toLowerCase().includes(q));const staff=[];for(const c of state.world.clubs)if(c.coach?.name?.toLowerCase().includes(q))staff.push({type:'Entrenador',name:c.coach.name,club:c});for(const sc of [...state.scouting.staff,...(state.world.scoutMarket||[])])if(sc.name.toLowerCase().includes(q))staff.push({type:'Ojeador',name:sc.name,staff:sc});return {players:players.slice(0,18),clubs:clubs.slice(0,12),staff:staff.slice(0,12)}}
function showClubQuick(c){const back=modal(`<div class="modal-head"><div><div class="eyebrow">${c.leagueName||''}</div><h2>${c.name}</h2></div><button class="btn" data-close>Cerrar</button></div><div class="grid three"><div class="card inner-card"><small>Reputación</small><div class="big-metric">${Math.round(c.reputation)}</div></div><div class="card inner-card"><small>Presupuesto salarial</small><h3>${fmtMoney(c.salaryBudget)}</h3></div><div class="card inner-card"><small>Entrenador</small><h3>${c.coach?.name||'—'}</h3></div></div><div class="card inner-card" style="margin-top:12px"><h3>Plantilla</h3>${c.roster.slice().sort((a,b)=>BBGM.overall(b)-BBGM.overall(a)).map(p=>`<div class="player-line"><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button><span>${positionText(p)} · ${Math.round(BBGM.overall(p))}</span></div>`).join('')}</div>`);back.querySelector('[data-close]').onclick=()=>back.remove();bindProfileButtons(back)}
function openGlobalSearch(initial=''){const back=modal(`<div class="modal-head"><div><div class="eyebrow">Búsqueda global</div><h2>Jugadores, clubes y staff</h2></div><button class="btn" data-close>Cerrar</button></div><div class="field"><input id="globalSearchInput" placeholder="Ej. Baskonia, García, Obradovic..." value="${String(initial).replace(/"/g,'&quot;')}"></div><div id="globalSearchResults" class="global-search-results"></div>`),inp=back.querySelector('#globalSearchInput'),out=back.querySelector('#globalSearchResults');const draw=()=>{const r=searchAllEntities(inp.value);out.innerHTML=`<div class="search-section"><h3>Jugadores</h3>${r.players.length?r.players.map(x=>`<button class="search-result" data-profile="${x.p.id}"><b>${fullName(x.p)}</b><span>${x.c?.name||'Agente libre'} · ${positionText(x.p)}</span></button>`).join(''):'<p class="muted">Sin resultados.</p>'}</div><div class="search-section"><h3>Clubes</h3>${r.clubs.length?r.clubs.map(c=>`<button class="search-result" data-search-club="${c.id}"><b>${c.name}</b><span>${c.leagueName||''}</span></button>`).join(''):'<p class="muted">Sin resultados.</p>'}</div><div class="search-section"><h3>Staff</h3>${r.staff.length?r.staff.map(x=>`<div class="search-result static"><b>${x.name}</b><span>${x.type}${x.club?' · '+x.club.name:''}</span></div>`).join(''):'<p class="muted">Sin resultados.</p>'}</div>`;bindProfileButtons(out);out.querySelectorAll('[data-search-club]').forEach(b=>b.onclick=()=>showClubQuick(club(+b.dataset.searchClub)))};inp.oninput=draw;back.querySelector('[data-close]').onclick=()=>back.remove();draw();setTimeout(()=>inp.focus(),20)}
function monthEventsV17(month){const events=[];for(const m of state.calendar.filter(m=>m.status!=='CANCELLED'&&m.date.startsWith(month)&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)))events.push({date:m.date,type:'MATCH',label:`${comp(m.competitionId)?.shortName||m.competitionId} · ${m.homeClubId===state.userClubId?'vs':'@'} ${club(m.homeClubId===state.userClubId?m.awayClubId:m.homeClubId)?.shortName}`,match:m});for(const a of state.scouting.assignments.filter(a=>a.endDate?.startsWith(month)))events.push({date:a.endDate,type:'SCOUT',label:`Informe scout · ${fullName(playerLocation(a.playerId)?.player||{firstName:'',lastName:''})}`});for(const fr of state.preseason?.friendlies||[])if(fr.date?.startsWith(month))events.push({date:fr.date,type:'FRIENDLY',label:`Amistoso · ${club(fr.opponentId)?.shortName}`});return events.sort((a,b)=>a.date.localeCompare(b.date))}
function monthCalendarHtml(month){const [y,m]=month.split('-').map(Number),days=new Date(Date.UTC(y,m,0)).getUTCDate(),first=(new Date(Date.UTC(y,m-1,1)).getUTCDay()+6)%7,events=monthEventsV17(month),cells=[];for(let i=0;i<first;i++)cells.push('<div class="cal-cell empty"></div>');for(let d=1;d<=days;d++){const ds=`${month}-${String(d).padStart(2,'0')}`,ev=events.filter(e=>e.date===ds);cells.push(`<div class="cal-cell ${ds===state.currentDate?'today':''}"><b>${d}</b>${ev.map(e=>`<span class="cal-event ${e.type.toLowerCase()}">${e.label}</span>`).join('')}</div>`)}return `<div class="month-calendar"><div class="cal-weekdays">${['L','M','X','J','V','S','D'].map(x=>`<span>${x}</span>`).join('')}</div><div class="cal-grid">${cells.join('')}</div></div>`}
function contractAgendaHtml(){const exp=userClub().roster.filter(p=>p.contractYears===1).slice(0,6),inj=activeInjuries().slice(0,5),sc=state.scouting.assignments.filter(a=>a.status==='ACTIVE').sort((a,b)=>a.endDate.localeCompare(b.endDate)).slice(0,5);return `<div class="card"><h3>Alertas de agenda</h3>${exp.length?`<div class="eyebrow">Contratos que vencen</div>${exp.map(p=>`<div class="agenda-alert"><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button><span>Fin de temporada</span></div>`).join('')}`:''}${inj.length?`<div class="eyebrow" style="margin-top:12px">Lesiones</div>${inj.map(p=>`<div class="agenda-alert"><span>${fullName(p)}</span><b>${p.currentInjury.estimatedEndDate}</b></div>`).join('')}`:''}${sc.length?`<div class="eyebrow" style="margin-top:12px">Scouting</div>${sc.map(a=>`<div class="agenda-alert"><span>${fullName(playerLocation(a.playerId)?.player||{firstName:'',lastName:''})}</span><b>${a.endDate}</b></div>`).join('')}`:''}</div>`}
function runAiFrontOfficeV17(){ensureV17State();const month=state.currentDate.slice(0,7);if(state.aiFrontOffice.lastMonth===month)return;state.aiFrontOffice.lastMonth=month;const rng=new BBGM.RNG(hashCode(`${month}-frontoffice-v17`)),clubs=state.world.clubs.filter(c=>c.id!==state.userClubId&&c.leagueLevel!=='NBA');for(let k=0;k<Math.min(12,clubs.length);k++){const c=rng.pick(clubs),exp=c.roster.filter(p=>p.contractYears===1);if(exp.length){const p=exp.sort((a,b)=>aiFitScore(c,b)-aiFitScore(c,a))[0];if(p&&aiFitScore(c,p)>52&&rng.next()<.62){p.contractYears=2+(rng.next()<.25?1:0);p.salary=Math.round(Math.max(p.salary,BBGM.salaryExpectation(p,c.reputation)*.92)/50000)*50000;if(rng.next()<.22)state.marketNews.unshift({date:state.currentDate,text:`${c.name} renueva a ${fullName(p)} por ${p.contractYears} temporadas.`})}}}for(const c of clubs.filter(c=>['ACB','EL'].some(cid=>state.standings[cid]?.[c.id]?.gp>=8))){const rows=['ACB','EL'].map(cid=>state.standings[cid]?.[c.id]).filter(Boolean),gp=rows.reduce((n,x)=>n+x.gp,0),w=rows.reduce((n,x)=>n+x.w,0);if(gp>=10&&w/gp<.29&&rng.next()<.12&&state.world.coachMarket?.length){const old=c.coach,nw=state.world.coachMarket.shift();c.coach={...nw};state.world.coachMarket.push({...old,id:`M-${Date.now()}-${c.id}`});state.marketNews.unshift({date:state.currentDate,text:`${c.name} destituye a ${old.name} y contrata a ${nw.name}.`})}}}
function ensureV16State(){
  if(!state)return;
  state.version=APP_VERSION.code;
  state.seasonArchive=Array.isArray(state.seasonArchive)?state.seasonArchive:[];
  state.achievements=state.achievements||{unlocked:{}};
  state.achievements.unlocked=state.achievements.unlocked||{};
  state.records=state.records||{};
  state.statsPreferences=state.statsPreferences||{mode:'basic',minGames:0};
  statsMode=state.statsPreferences.mode||statsMode||'basic';
  statsMinGames=Number.isFinite(+state.statsPreferences.minGames)?+state.statsPreferences.minGames:(statsMinGames||0);
}
function userMatchesCurrentSeason(){return (state.calendar||[]).filter(m=>m.status==='PLAYED'&&m.result&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId));}
function userMatchWon(m){return (m.homeClubId===state.userClubId&&m.homeScore>m.awayScore)||(m.awayClubId===state.userClubId&&m.awayScore>m.homeScore)}
function currentUserGameRecords(){
  let biggestWin=null,biggestLoss=null,highestTeamScore=null,playerPts=null,playerReb=null,playerAst=null,playerVal=null;
  for(const m of userMatchesCurrentSeason()){
    const home=m.homeClubId===state.userClubId,us=home?m.homeScore:m.awayScore,them=home?m.awayScore:m.homeScore,margin=us-them,opp=club(home?m.awayClubId:m.homeClubId);
    const base={date:m.date,competitionId:m.competitionId,opponent:opp?.name||'Rival',score:`${us}-${them}`,margin};
    if(margin>0&&(!biggestWin||margin>biggestWin.margin))biggestWin={...base};
    if(margin<0&&(!biggestLoss||margin<biggestLoss.margin))biggestLoss={...base};
    if(!highestTeamScore||us>highestTeamScore.value)highestTeamScore={...base,value:us};
    const stats=home?m.result.homeStats:m.result.awayStats;
    for(const st of stats||[]){
      const loc=playerLocation(st.playerId),name=loc?fullName(loc.player):`Jugador ${st.playerId}`,reb=(st.offensiveRebounds||0)+(st.defensiveRebounds||0),val=(st.points||0)+reb+(st.assists||0)+(st.steals||0)+(st.blocks||0)-(st.turnovers||0)-((st.twoAttempted||0)-(st.twoMade||0))-((st.threeAttempted||0)-(st.threeMade||0))-((st.freeThrowAttempted||0)-(st.freeThrowMade||0));
      const pb={playerId:st.playerId,name,date:m.date,competitionId:m.competitionId,opponent:opp?.shortName||'Rival'};
      if(!playerPts||st.points>playerPts.value)playerPts={...pb,value:st.points};
      if(!playerReb||reb>playerReb.value)playerReb={...pb,value:reb};
      if(!playerAst||st.assists>playerAst.value)playerAst={...pb,value:st.assists};
      if(!playerVal||val>playerVal.value)playerVal={...pb,value:val};
    }
  }
  return {biggestWin,biggestLoss,highestTeamScore,playerPts,playerReb,playerAst,playerVal};
}
function compactLeader(row){return row?{playerId:row.playerId,name:fullName(row.player),clubId:row.clubId,club:row.club?.shortName||'—',value:+row.value.toFixed(1)}:null}
function competitionLeaderSnapshot(compId){
  const rows=aggregatePlayerStats(compId);if(!rows.length)return null;
  const pick=k=>rows.slice().sort((a,b)=>b[k]-a[k])[0];
  return {points:compactLeader({...pick('ppg'),value:pick('ppg').ppg}),rebounds:compactLeader({...pick('rpg'),value:pick('rpg').rpg}),assists:compactLeader({...pick('apg'),value:pick('apg').apg}),value:compactLeader({...pick('valpg'),value:pick('valpg').valpg})};
}
function archiveCurrentSeason(){
  ensureV16State();if(state.seasonArchive.some(x=>x.season===state.season))return;
  const acb=sortedStandings('ACB'),el=sortedStandings('EL'),ua=acb.find(x=>x.clubId===state.userClubId),ue=el.find(x=>x.clubId===state.userClubId),records=currentUserGameRecords();
  const userStats=aggregatePlayerStats('ACB').filter(x=>x.clubId===state.userClubId).sort((a,b)=>b.valpg-a.valpg).slice(0,5).map(x=>({playerId:x.playerId,name:fullName(x.player),games:x.games,mpg:+x.mpg.toFixed(1),ppg:+x.ppg.toFixed(1),rpg:+x.rpg.toFixed(1),apg:+x.apg.toFixed(1),valpg:+x.valpg.toFixed(1)}));
  const trophies=[];for(const [code,label] of [['SUPERCOPA','Supercopa'],['COPA','Copa del Rey'],['ACB_PO','Liga ACB'],['EL_F4','Euroliga']])if(state.special?.champions?.[code]===state.userClubId)trophies.push(label);
  state.seasonArchive.push({season:state.season,date:state.currentDate,userClubId:state.userClubId,userAcb:acb.findIndex(x=>x.clubId===state.userClubId)+1,userEl:el.findIndex(x=>x.clubId===state.userClubId)+1,acbRecord:ua?{w:ua.w,l:ua.l,pf:ua.pf,pa:ua.pa}:null,elRecord:ue?{w:ue.w,l:ue.l,pf:ue.pf,pa:ue.pa}:null,champions:{acb:state.special?.champions?.ACB_PO||acb[0]?.clubId||null,el:state.special?.champions?.EL_F4||el[0]?.clubId||null,copa:state.special?.champions?.COPA||null,supercopa:state.special?.champions?.SUPERCOPA||null},trophies,boardConfidence:Math.round(state.board?.confidence||0),managerReputation:Math.round(state.manager?.reputation||0),cash:Math.round(userClub().cashBudget||0),financialHealth:Math.round(userClub().financialHealth||0),leaders:{ACB:competitionLeaderSnapshot('ACB'),EL:competitionLeaderSnapshot('EL')},userTop:userStats,records});
  if(state.seasonArchive.length>60)state.seasonArchive=state.seasonArchive.slice(-60);
}
function careerTrophyCount(){ensureV16State();let n=state.seasonArchive.reduce((a,x)=>a+(x.trophies?.length||0),0);if(!state.seasonComplete){for(const code of ['SUPERCOPA','COPA','ACB_PO','EL_F4'])if(state.special?.champions?.[code]===state.userClubId)n++;}return n}
function unlockAchievement(id,notify=true){ensureV16State();if(state.achievements.unlocked[id])return false;state.achievements.unlocked[id]={season:state.season,date:state.currentDate};if(notify){const d=ACHIEVEMENT_DEFS.find(x=>x.id===id);if(d)addInbox('ACHIEVEMENT',`Logro: ${d.name}`,d.desc);}return true}
function evaluateAchievements(notify=true){
  ensureV16State();const games=userMatchesCurrentSeason();if(games.some(userMatchWon))unlockAchievement('FIRST_WIN',notify);
  let streak=0,maxStreak=0;for(const m of games.sort((a,b)=>a.date.localeCompare(b.date))){if(userMatchWon(m)){streak++;maxStreak=Math.max(maxStreak,streak)}else streak=0}if(maxStreak>=5)unlockAchievement('FIVE_STREAK',notify);
  if(state.special?.champions?.COPA===state.userClubId)unlockAchievement('COPA_CHAMP',notify);if(state.special?.champions?.ACB_PO===state.userClubId)unlockAchievement('ACB_CHAMP',notify);if(state.special?.champions?.EL_F4===state.userClubId)unlockAchievement('EL_CHAMP',notify);
  if(games.some(m=>m.competitionId==='EL_F4'))unlockAchievement('FINAL_FOUR',notify);
  if(userClub().roster.some(p=>p.academyProduct&&BBGM.overall(p)>=80))unlockAchievement('ACADEMY_80',notify);
  if(state.seasonComplete&&(userClub().financialHealth||0)>=80)unlockAchievement('FIN_HEALTH',notify);if((state.manager?.reputation||0)>=75)unlockAchievement('REP_75',notify);if(careerTrophyCount()>=3)unlockAchievement('THREE_TITLES',notify);
}
function recordCandidateBest(entries,key,mode='max'){const vals=entries.map(x=>x.records?.[key]).filter(Boolean);if(!vals.length)return null;return vals.reduce((a,b)=>mode==='min'?(b.value<a.value?b:a):(b.value>a.value?b:a));}
function careerRecordSummary(){
  ensureV16State();const current={season:state.season,records:currentUserGameRecords()},entries=[...state.seasonArchive,current],seasons=[...state.seasonArchive];
  const bestAcb=seasons.filter(x=>x.userAcb>0).sort((a,b)=>a.userAcb-b.userAcb)[0]||null,bestEl=seasons.filter(x=>x.userEl>0).sort((a,b)=>a.userEl-b.userEl)[0]||null;
  const candidates=entries.flatMap(e=>{const r=e.records||{};return ['biggestWin','highestTeamScore','playerPts','playerReb','playerAst','playerVal'].map(k=>r[k]?{season:e.season,key:k,...r[k]}:[])}).flat();
  const best=k=>candidates.filter(x=>x.key===k).sort((a,b)=>(b.value??b.margin??0)-(a.value??a.margin??0))[0]||null;
  return {bestAcb,bestEl,trophies:careerTrophyCount(),seasons:state.seasonArchive.length,biggestWin:best('biggestWin'),highestTeamScore:best('highestTeamScore'),playerPts:best('playerPts'),playerReb:best('playerReb'),playerAst:best('playerAst'),playerVal:best('playerVal')};
}
function advancedStatsRow(a){
  const fgm=(a.twoMade||0)+(a.threeMade||0),fga=(a.twoAttempted||0)+(a.threeAttempted||0),fta=a.ftAttempted||0,min=Math.max(1,a.minutes||0),tsDen=2*(fga+.44*fta);
  return {...a,efgPct:fga?(fgm+.5*(a.threeMade||0))/fga*100:(a.efgPct||0),tsPct:tsDen?(a.points||0)/tsDen*100:(a.tsPct||0),astTo:(a.assists||0)/Math.max(1,a.turnovers||0),pts36:(a.points||0)/min*36,val36:(a.value||0)/min*36};
}
function cachedStatistics(source){
  const key=`${state.season}|${state.currentDate}|${state.history?.length||0}|${source.type}|${source.value}`;if(statsCache.has(key))return statsCache.get(key);
  let rows=source.type==='LEAGUE'?aggregateExternalLeagueStats(source.value.slice(7)):aggregatePlayerStats(source.value);rows=rows.map(advancedStatsRow);statsCache.set(key,rows);if(statsCache.size>18)statsCache.delete(statsCache.keys().next().value);return rows;
}
function renderHistory(v){
  ensureV16State();evaluateAchievements(false);const cr=careerRecordSummary(),unlocked=state.achievements.unlocked||{},archives=state.seasonArchive.slice().reverse();
  const recLine=(label,r,suffix='')=>`<div class="record-line"><span>${label}</span><b>${r?r.value??r.margin:'—'}${suffix}</b><small>${r?`${r.name||r.opponent||''}${r.season?' · '+r.season:''}`:'Sin registro'}</small></div>`;
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Carrera</div><h1>Historial, récords y logros</h1><p>Tu trayectoria como director deportivo y los hitos del club.</p></div><button class="btn" id="backMoreHistory">← Más</button></div>
  <div class="grid four history-kpis"><div class="card"><div class="eyebrow">Temporadas cerradas</div><div class="big-metric">${cr.seasons}</div></div><div class="card"><div class="eyebrow">Títulos</div><div class="big-metric">${cr.trophies}</div></div><div class="card"><div class="eyebrow">Mejor ACB</div><div class="big-metric">${cr.bestAcb?cr.bestAcb.userAcb+'º':'—'}</div><small class="muted">${cr.bestAcb?.season||'Sin temporada cerrada'}</small></div><div class="card"><div class="eyebrow">Mejor Euroliga</div><div class="big-metric">${cr.bestEl?cr.bestEl.userEl+'º':'—'}</div><small class="muted">${cr.bestEl?.season||'Sin temporada cerrada'}</small></div></div>
  <div class="grid two" style="margin-top:16px"><div class="card"><div class="section-inline"><h3>Récords del club</h3><span class="pill">Carrera</span></div><div class="record-grid">${recLine('Mayor victoria',cr.biggestWin)}${recLine('Máxima anotación',cr.highestTeamScore,' pts')}${recLine('Puntos jugador',cr.playerPts,' pts')}${recLine('Rebotes jugador',cr.playerReb,' reb')}${recLine('Asistencias jugador',cr.playerAst,' ast')}${recLine('Mejor valoración',cr.playerVal,' val')}</div></div><div class="card"><div class="section-inline"><h3>Logros</h3><span class="pill">${Object.keys(unlocked).length}/${ACHIEVEMENT_DEFS.length}</span></div><div class="achievement-grid">${ACHIEVEMENT_DEFS.map(a=>{const u=unlocked[a.id];return `<div class="achievement ${u?'unlocked':'locked'}"><div class="achievement-icon">${a.icon}</div><div><b>${a.name}</b><small>${a.desc}</small>${u?`<em>${u.season}</em>`:''}</div></div>`}).join('')}</div></div></div>
  <div class="card" style="margin-top:16px"><div class="section-inline"><div><div class="eyebrow">Archivo de temporadas</div><h3>${archives.length?archives.length+' temporada(s)':'Todavía vacío'}</h3></div></div>${archives.length?archives.map(x=>`<details class="season-history"><summary><b>${x.season}</b><span>ACB ${x.userAcb}º · EL ${x.userEl}º</span><span>${x.trophies?.length?x.trophies.join(' · '):'Sin títulos'}</span></summary><div class="grid two season-history-body"><div><div class="stat-row"><span>ACB</span><b>${x.acbRecord?`${x.acbRecord.w}-${x.acbRecord.l}`:'—'}</b></div><div class="stat-row"><span>Euroliga</span><b>${x.elRecord?`${x.elRecord.w}-${x.elRecord.l}`:'—'}</b></div><div class="stat-row"><span>Confianza directiva</span><b>${x.boardConfidence}/100</b></div><div class="stat-row"><span>Salud financiera</span><b>${x.financialHealth}/100</b></div></div><div><div class="stat-row"><span>Campeón ACB</span><b>${club(x.champions.acb)?.shortName||'—'}</b></div><div class="stat-row"><span>Campeón Euroliga</span><b>${club(x.champions.el)?.shortName||'—'}</b></div><div class="stat-row"><span>Copa</span><b>${club(x.champions.copa)?.shortName||'—'}</b></div><div class="stat-row"><span>Caja final</span><b>${fmtMoney(x.cash)}</b></div></div></div>${x.userTop?.length?`<div class="table-wrap"><table><thead><tr><th>Jugador</th><th>PJ</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>VAL</th></tr></thead><tbody>${x.userTop.map(p=>`<tr><td>${p.name}</td><td>${p.games}</td><td>${p.mpg}</td><td>${p.ppg}</td><td>${p.rpg}</td><td>${p.apg}</td><td>${p.valpg}</td></tr>`).join('')}</tbody></table></div>`:''}</details>`).join(''):'<p class="muted">Al cerrar la primera temporada se guardará aquí el resumen completo.</p>'}</div>`;
  v.querySelector('#backMoreHistory').onclick=()=>{currentView='more';render()};
}
function financeEntry(clubObj,type,category,amount,text,date=state.currentDate){
  if(!clubObj||!Number.isFinite(amount)||amount===0)return;
  ensureV15State();clubObj.cashBudget=(clubObj.cashBudget||0)+amount;
  const healthDelta=(amount/Math.max(2500000,BBGM.wageBill(clubObj)))*3;
  clubObj.financialHealth=BBGM.clamp((clubObj.financialHealth??65)+healthDelta,5,100);
  if(clubObj.id===state.userClubId){state.economy.entries.push({id:`${Date.now()}-${state.economy.entries.length}`,date,type,category,amount:Math.round(amount),text});if(state.economy.entries.length>500)state.economy.entries=state.economy.entries.slice(-500)}
}
function competitionEconomyFactor(compId){return ({ACB:1,EL:1.35,COPA:1.28,SUPERCOPA:1.15,ACB_PO:1.42,EL_PI:1.4,EL_PO:1.65,EL_F4:2.1}[compId]||1)}
function matchGateIncome(c,m){
  const f=competitionEconomyFactor(m.competitionId),rep=(c.reputation||70),market=(c.marketSize||65),base=c.leagueLevel==='NBA'?1550000:185000;
  return Math.round(base*f*(.58+rep/150)*(.72+market/190)/5000)*5000;
}
function matchOperatingCost(c,m){
  const gamesBase=c.leagueLevel==='NBA'?82:(c.leagueLevel==='EUROLEAGUE'||['ACB','EL'].some(id=>state.world.competitions?.find(x=>x.id===id)?.clubIds?.includes(c.id)))?64:38;
  const staff=(c.coach?.salary||0)+(c.id===state.userClubId?staffCost():Math.min(c.staffBudget||0,2600000));
  return Math.round(((BBGM.wageBill(c)+staff)/gamesBase)/5000)*5000;
}
function processMatchEconomy(m){
  ensureV15State();if(state.economy.processedMatches[m.id])return;state.economy.processedMatches[m.id]=1;
  const h=club(m.homeClubId),a=club(m.awayClubId);if(!h||!a)return;
  const gate=matchGateIncome(h,m);financeEntry(h,'INCOME','MATCHDAY',gate,`Taquilla ${comp(m.competitionId)?.name||m.competitionId} vs ${a.shortName}`,m.date);
  financeEntry(h,'EXPENSE','OPERATIONS',-matchOperatingCost(h,m),`Coste operativo de partido`,m.date);
  financeEntry(a,'EXPENSE','OPERATIONS',-matchOperatingCost(a,m),`Coste operativo de partido`,m.date);
}
function financeTotals(){ensureV15State();const e=state.economy.entries||[];const income=e.filter(x=>x.amount>0).reduce((s,x)=>s+x.amount,0),expense=-e.filter(x=>x.amount<0).reduce((s,x)=>s+x.amount,0);return {income,expense,balance:income-expense}}
function financeCategoryTotals(){const out={};for(const e of state.economy?.entries||[]){out[e.category]=(out[e.category]||0)+e.amount}return out}
function financialHealthLabel(v){return v>=82?'Excelente':v>=68?'Sólida':v>=52?'Estable':v>=36?'Tensionada':'Crítica'}
function projectedSeasonResult(){const t=financeTotals(),played=Math.max(1,state.history.filter(h=>{const m=state.calendar.find(x=>x.id===h.matchId);return m&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)}).length),remaining=state.calendar.filter(m=>m.status==='SCHEDULED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)).length;return Math.round(t.balance+(t.balance/played)*remaining*.48)}
function seasonPrizeMoney(c){
  let n=0;if(c.id===state.userClubId){const pa=sortedStandings('ACB').findIndex(x=>x.clubId===c.id)+1,pe=sortedStandings('EL').findIndex(x=>x.clubId===c.id)+1;n+=pa&&pa<=8?650000:250000;n+=pe&&pe<=10?900000:350000;if(state.special?.champions?.COPA===c.id)n+=850000;if(state.special?.champions?.ACB_PO===c.id)n+=1800000;if(state.special?.champions?.EL_F4===c.id)n+=3200000;else if(state.calendar.some(m=>m.competitionId==='EL_F4'&&(m.homeClubId===c.id||m.awayClubId===c.id)))n+=1200000}else{n=Math.round((c.reputation||60)*12000)}return n;
}
function processSeasonEconomy(){
  ensureV15State();if(state.economy.prizeProcessedSeason===state.season)return;
  const prize=seasonPrizeMoney(userClub());if(prize)financeEntry(userClub(),'INCOME','PRIZE',prize,'Premios y distribución por competiciones');
  const t=financeTotals(),uc=userClub(),over=BBGM.wageBill(uc)>uc.salaryBudget;
  uc.financialHealth=BBGM.clamp((uc.financialHealth??65)+(t.balance>=0?4:-6)+(over?-5:2)+(uc.cashBudget<0?-12:0),5,100);
  state.economy.prizeProcessedSeason=state.season;
}
function performanceDeltaForClub(c){
  let d=0;for(const cid of ['ACB','EL']){const rows=sortedStandings(cid),idx=rows.findIndex(x=>x.clubId===c.id);if(idx>=0){const pct=1-idx/Math.max(1,rows.length-1);d+=(pct-.5)*4}}if(state.special?.champions?.ACB_PO===c.id)d+=4;if(state.special?.champions?.EL_F4===c.id)d+=5;if(state.special?.champions?.COPA===c.id)d+=2;return d;
}
function rolloverClubEconomies(){
  ensureV15State();const rng=new BBGM.RNG(hashCode(`${state.season}-economy`));
  for(const c of state.world.clubs){ensureClubFinance(c);const perf=performanceDeltaForClub(c),health=c.financialHealth??65,healthAdj=(health-60)/18,delta=BBGM.clamp(perf+healthAdj+rng.gaussian()*1.1,-9,10);c.reputation=BBGM.clamp((c.reputation||65)+delta*.18,35,99);c.commercialPower=BBGM.clamp((c.commercialPower||60)+delta*.34,25,99);const budgetFactor=1+delta/100*.55;c.salaryBudget=Math.max(Math.round(BBGM.wageBill(c)*1.03/50000)*50000,Math.round((c.salaryBudget||c.baseSalaryBudget)*budgetFactor/50000)*50000);c.staffBudget=Math.max(900000,Math.round((c.staffBudget||c.baseStaffBudget)*(1+delta/100*.38)/50000)*50000);if(c.id!==state.userClubId){const seasonalOps=Math.round((c.commercialPower||60)*18000 + (c.reputation||60)*14000);c.cashBudget=Math.max(-2500000,(c.cashBudget||0)+seasonalOps-Math.max(0,BBGM.wageBill(c)-c.salaryBudget)*.2);c.financialHealth=BBGM.clamp(health+delta*.55+(c.cashBudget<0?-4:1),8,98)}}
}
function financialBoardState(){const uc=userClub(),w=BBGM.wageBill(uc),ok=w<=uc.salaryBudget&&uc.cashBudget>=0;return {ok,text:`Caja ${fmtMoney(uc.cashBudget)} · Salarios ${fmtMoney(w)} / ${fmtMoney(uc.salaryBudget)}`}}
function sponsorMaxValue(o){return o.fixed+(o.bonuses||[]).reduce((s,b)=>s+b.amount,0)}

function createSponsorOffers(season=state?.season||'2026/27'){
  const rep=userClub?.()?(userClub().reputation||78):78,brand=state?.sponsorship?.brandReputation??60,scale=.77+rep/440+brand/900;
  const money=n=>Math.round(n*scale/50000)*50000;
  return [
    {id:`SAFE-${season}`,name:'Araba Mobility',type:'Seguro',profile:'Estabilidad',fixed:money(4400000),bonuses:[{code:'ACB_PO',label:'Clasificarse para playoff ACB',amount:money(350000)},{code:'EL_PI',label:'Alcanzar Play-In Euroliga',amount:money(450000)}]},
    {id:`BAL-${season}`,name:'NorthCourt Technologies',type:'Equilibrado',profile:'Rendimiento',fixed:money(3500000),bonuses:[{code:'COPA_WIN',label:'Ganar Copa del Rey',amount:money(900000)},{code:'ACB_SF',label:'Alcanzar semifinal ACB',amount:money(800000)},{code:'EL_F4',label:'Alcanzar Final Four',amount:money(1500000)}]},
    {id:`AGG-${season}`,name:'Basque Performance',type:'Agresivo',profile:'Títulos',fixed:money(2550000),bonuses:[{code:'ACB_WIN',label:'Ganar Liga ACB',amount:money(2200000)},{code:'EL_WIN',label:'Ganar Euroliga',amount:money(3400000)},{code:'COPA_WIN',label:'Ganar Copa del Rey',amount:money(1200000)}]},
    {id:`YTH-${season}`,name:'GreenFuture Euskadi',type:'Proyecto',profile:'Cantera',fixed:money(3150000),bonuses:[{code:'YOUTH_PLAY',label:'2 jóvenes sub-22 con 10+ partidos',amount:money(750000)},{code:'ACB_PO',label:'Clasificarse para playoff ACB',amount:money(500000)},{code:'FIN_HEALTH',label:'Cerrar con salud financiera sólida',amount:money(450000)}]}
  ];
}
function sponsorObjectiveAchieved(code){
  const acb=sortedStandings('ACB'),el=sortedStandings('EL'),pa=acb.findIndex(x=>x.clubId===state.userClubId)+1,pe=el.findIndex(x=>x.clubId===state.userClubId)+1;
  if(code==='ACB_PO')return pa>0&&pa<=8;
  if(code==='EL_PI')return pe>0&&pe<=10;
  if(code==='COPA_WIN')return state.special?.champions?.COPA===state.userClubId;
  if(code==='ACB_WIN')return state.special?.champions?.ACB_PO===state.userClubId;
  if(code==='EL_WIN')return state.special?.champions?.EL_F4===state.userClubId;
  if(code==='EL_F4')return state.calendar.some(m=>m.competitionId==='EL_F4'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId));
  if(code==='ACB_SF')return seriesOf('ACB_PO','SF').some(x=>x.a===state.userClubId||x.b===state.userClubId)||state.special?.champions?.ACB_PO===state.userClubId;
  if(code==='YOUTH_PLAY'){const ss=seasonStatsMap();return userClub().roster.filter(p=>p.age<=21&&((ss[p.id]?.g||0)>=10)).length>=2}
  if(code==='FIN_HEALTH')return (userClub().financialHealth||0)>=68&&userClub().cashBudget>=0&&BBGM.wageBill(userClub())<=userClub().salaryBudget;
  return false;
}
function acceptSponsor(id){
  if(state.sponsorship?.active){toast('Ya tienes patrocinador esta temporada');return}
  const off=(state.sponsorship?.offers||[]).find(x=>x.id===id);if(!off)return;
  state.sponsorship.active={...off,acceptedDate:state.currentDate};state.sponsorship.offers=[];
  financeEntry(userClub(),'INCOME','SPONSOR',off.fixed,`Fijo patrocinador ${off.name}`);userClub().salaryBudget+=Math.round(off.fixed*.16/50000)*50000;
  addInbox('SPONSOR','Patrocinador firmado',`${off.name} aporta ${fmtMoney(off.fixed)} garantizados. Parte del ingreso aumenta también tu margen salarial.`);
  saveLocal(false);render();toast(`Acuerdo firmado con ${off.name}`);
}
function evaluateSponsorBonuses(){
  const sp=state.sponsorship?.active;if(!sp||state.sponsorship.evaluatedSeason===state.season)return 0;
  let total=0,won=[];for(const b of sp.bonuses||[])if(sponsorObjectiveAchieved(b.code)){total+=b.amount;won.push(b.label)}
  if(total){financeEntry(userClub(),'INCOME','SPONSOR_BONUS',total,`Variables patrocinador ${sp.name}`);state.sponsorship.brandReputation=BBGM.clamp((state.sponsorship.brandReputation||60)+3,20,100);addInbox('SPONSOR','Bonus de patrocinio',`${sp.name} paga ${fmtMoney(total)} en variables: ${won.join(', ')}.`)}
  if(!total)state.sponsorship.brandReputation=BBGM.clamp((state.sponsorship.brandReputation||60)-1,20,100);state.sponsorship.evaluatedSeason=state.season;state.sponsorship.lastBonus=total;return total;
}
function domesticCompetitionForClub(c){if(!c)return null;return (state.world?.competitions||[]).find(x=>x.standings&&x.name===c.leagueName&&x.clubIds?.includes(c.id))||(state.world?.competitions||[]).find(x=>x.id==='ACB'&&x.clubIds?.includes(c.id))||null}
function clubProjectScore(c){return (c?.reputation||60)*.7+Math.min(30,Math.log10(Math.max(1,c?.salaryBudget||c?.budget||1))*3)}
function clubProfile(c){const league=domesticCompetitionForClub(c),clubs=(league?.clubIds||[]).map(id=>club(id)).filter(Boolean).sort((a,b)=>clubProjectScore(b)-clubProjectScore(a)),rank=Math.max(1,clubs.findIndex(x=>x.id===c?.id)+1),size=Math.max(1,clubs.length);if(rank<=Math.max(2,Math.ceil(size*.17)))return{id:'ELITE',name:'Élite',target:Math.min(3,size),youth:2,leagueId:league?.id||null,leagueName:league?.name||c?.leagueName};if(rank<=Math.ceil(size*.34))return{id:'CONTENDER',name:'Candidato a playoff',target:Math.min(5,size),youth:2,leagueId:league?.id||null,leagueName:league?.name||c?.leagueName};if(rank<=Math.ceil(size*.56))return{id:'PLAYOFF',name:'Aspirante a playoff',target:Math.min(8,size),youth:1,leagueId:league?.id||null,leagueName:league?.name||c?.leagueName};if(rank<=Math.ceil(size*.78))return{id:'STABLE',name:'Zona media',target:Math.min(12,size),youth:1,leagueId:league?.id||null,leagueName:league?.name||c?.leagueName};return{id:'SURVIVAL',name:'Permanencia y desarrollo',target:Math.min(Math.max(1,size-4),14),youth:1,leagueId:league?.id||null,leagueName:league?.name||c?.leagueName}}
function ensureClubProjects(){for(const c of state.world?.clubs||[]){const base=clubProfile(c),p=c.careerProject;if(!p||p.modelVersion!==3)c.careerProject={modelVersion:3,profile:base.id,name:base.name,target:base.target,youthTarget:base.youth,leagueId:base.leagueId,leagueName:base.leagueName,season:state.season,history:p?.history||[]}}}
function evolveClubProject(c,position,total){ensureClubProjects();const p=c?.careerProject;if(!p||!position)return;const before=p.target;if(position<=Math.max(2,Math.floor(before*.55)))p.target=Math.max(2,before-1);else if(position>before+3)p.target=Math.min(Math.max(8,Math.ceil(total*.72)),before+1);p.profile=p.target<=3?'ELITE':p.target<=5?'CONTENDER':p.target<=8?'PLAYOFF':p.target<=10?'STABLE':p.target<=12?'DEVELOP':'SURVIVAL';p.name={ELITE:'Élite',CONTENDER:'Candidato',PLAYOFF:'Aspirante a playoff',STABLE:'Zona media',DEVELOP:'Desarrollo',SURVIVAL:'Permanencia'}[p.profile];p.history.unshift({season:state.season,position,target:before,nextTarget:p.target});if(p.history.length>12)p.history.length=12;p.lastPosition=position;p.lastSeason=state.season}
function evolveAllClubProjects(){ensureClubProjects();for(const c of state.world?.clubs||[]){const p=c.careerProject,rows=p?.leagueId?sortedStandings(p.leagueId):[],position=rows.findIndex(x=>x.clubId===c.id)+1;if(position)evolveClubProject(c,position,rows.length)}}
function projectObjectives(clubObj){const p=clubObj?.careerProject||clubProfile(clubObj);return[{id:'LEAGUE',label:`${p.leagueName||'Liga'}: finalizar entre los ${p.target} primeros`,target:p.target,leagueId:p.leagueId},{id:'YOUTH',label:'Dar continuidad al talento joven',target:p.youthTarget||p.youth||1},{id:'FIN',label:'Mantener una estructura financiera sostenible',target:1}]}
function boardObjectiveState(o){
  if(o.id==='LEAGUE'){const league=o.leagueId?(state.world.competitions||[]).find(x=>x.id===o.leagueId):domesticCompetitionForClub(userClub());const p=league?sortedStandings(league.id).findIndex(x=>x.clubId===state.userClubId)+1:0;return {text:p?`${p}.º / objetivo Top ${o.target}`:`Sin partidos en ${league?.name||'la competición'}`,ok:p&&p<=o.target}}
  if(o.id==='ACB'){const p=sortedStandings('ACB').findIndex(x=>x.clubId===state.userClubId)+1;return {text:p?`${p}.º / objetivo Top ${o.target}`:'Sin partidos',ok:p&&p<=o.target}}
  if(o.id==='EL'){const p=sortedStandings('EL').findIndex(x=>x.clubId===state.userClubId)+1;return {text:p?`${p}.º / objetivo Top ${o.target}`:'Sin partidos',ok:p&&p<=o.target}}
  if(o.id==='YOUTH'){const young=userClub().roster.filter(p=>p.age<=21).reduce((n,p)=>n+((seasonStatsMap()[p.id]?.g||0)>=5?1:0),0);return {text:`${young} joven(es) con 5+ PJ`,ok:young>=o.target}}
  if(o.id==='FIN')return financialBoardState();
  return {text:'En curso',ok:false};
}
function setCoachMinuteRequest(p,adjustment,games=5,reason='DIRECTOR'){
  const c=userClub();c.coachMinuteRequests=c.coachMinuteRequests||{};
  c.coachMinuteRequests[p.id]={adjustment,gamesLeft:games,reason,createdDate:state.currentDate};
}
function askCoachForMinutes(playerId,type){
  const c=userClub(),p=c.roster.find(x=>x.id===playerId);if(!p)return;
  ensureV12State();const rel=state.coachManagement?.relationship??72,rot=BBGM.rotation(c),current=rot.playerMinutes[p.id]||0,ovr=BBGM.overall(p),fat=p.state.fatigue||0;
  const im=state.currentDate.slice(0,7),iv=state.coachManagement.interventions;if(iv.month!==im){iv.month=im;iv.count=0}iv.count++;
  const rng=new BBGM.RNG(Date.now()+p.id+(type==='MORE'?71:113));
  let logic=type==='MORE'?((ovr-72)*1.05+(expectedRoleMinutes[p.role]||14)-current):(fat*.7+current-18);
  const meddlingPenalty=Math.max(0,iv.count-3)*.06,chance=BBGM.clamp(.38+(rel-50)*.006+(c.coach.manManagement-65)*.004+logic*.014-meddlingPenalty,.12,.93),accepted=rng.next()<chance;
  if(accepted){
    const adj=type==='MORE'?5:-6;setCoachMinuteRequest(p,adj,5,type);
    state.coachManagement.relationship=BBGM.clamp(rel+1.2,0,100);
    if(type==='MORE'){p.state.morale=BBGM.clamp(p.state.morale+3,0,100);p.state.roleSatisfaction=BBGM.clamp((p.state.roleSatisfaction||70)+4,0,100)}
    else{p.state.morale=BBGM.clamp(p.state.morale+1.5,0,100);p.state.fatigue=BBGM.clamp((p.state.fatigue||0)-5,0,100)}
    addInbox('COACH',`El entrenador acepta la petición sobre ${fullName(p)}`,type==='MORE'?`Durante los próximos 5 partidos intentará darle aproximadamente 5 minutos más, reajustando la rotación de sus posiciones.`:`Durante los próximos 5 partidos reducirá aproximadamente 6 minutos su carga para darle más descanso.`);
  }else{
    state.coachManagement.relationship=BBGM.clamp(rel-1.5,0,100);p.state.morale=BBGM.clamp(p.state.morale-(type==='MORE'?1.5:.5),0,100);
    addInbox('COACH','El entrenador no comparte tu petición',`${c.coach.name} considera que cambiar ahora los minutos de ${fullName(p)} perjudicaría al equipo.`);
  }
  if(iv.count>4){state.coachManagement.relationship=BBGM.clamp((state.coachManagement.relationship||rel)-1.2,0,100);addInbox('COACH','El entrenador pide autonomía',`${c.coach.name} considera que estás interviniendo demasiado en sus rotaciones este mes.`)}
  saveLocal(false);render();toast(accepted?'Petición aceptada':'Petición rechazada');
}
function tickCoachMinuteRequests(c){
  if(c.id!==state.userClubId||!c.coachMinuteRequests)return;
  for(const [id,req] of Object.entries(c.coachMinuteRequests)){req.gamesLeft--;if(req.gamesLeft<=0)delete c.coachMinuteRequests[id]}
}

function seasonStartYear(){return +String(state?.season||'2026/27').slice(0,4)}
function initialSupercopaMatches(year){
  if(year!==2026)return [];
  return [
    {id:'SUPERCOPA-2026-SF1',competitionId:'SUPERCOPA',round:'Semifinal',stage:'SF',bracketIndex:0,date:'2026-09-19',homeClubId:6,awayClubId:1,status:'SCHEDULED'},
    {id:'SUPERCOPA-2026-SF2',competitionId:'SUPERCOPA',round:'Semifinal',stage:'SF',bracketIndex:1,date:'2026-09-19',homeClubId:4,awayClubId:3,status:'SCHEDULED'}
  ];
}
function addMatch(compId,round,date,home,away,extra={}){
  const id=extra.id||`${compId}-${round}-${date}-${home}-${away}-${state.calendar.length}`;
  if(state.calendar.some(m=>m.id===id))return null;
  const m={id,competitionId:compId,round,date,homeClubId:home,awayClubId:away,status:'SCHEDULED',...extra};
  state.calendar.push(m);state.calendar.sort((a,b)=>a.date.localeCompare(b.date)||String(a.id).localeCompare(String(b.id)));return m;
}
function matchWinner(m){return m.homeScore>m.awayScore?m.homeClubId:m.awayClubId}
function matchLoser(m){return m.homeScore>m.awayScore?m.awayClubId:m.homeClubId}
function fixedOrLater(fixed,days=2){return fixed>state.currentDate?fixed:addDays(state.currentDate,days)}
function addFutureSupercopa(year){
  const last=(state.seasonSummaries||[]).slice(-1)[0]||{};
  const acbIds=comp('ACB').clubIds.slice().sort((a,b)=>(club(b).reputation||0)-(club(a).reputation||0));
  const picks=[];for(const id of [last.acbChampion,last.copaChampion,last.supercopaChampion,...acbIds])if(id&&!picks.includes(id))picks.push(id);
  const four=picks.slice(0,4);if(four.length<4)return;
  const d=`${year}-09-19`;
  addMatch('SUPERCOPA','Semifinal',d,four[0],four[3],{stage:'SF',bracketIndex:0,id:`SUPERCOPA-${year}-SF1`});
  addMatch('SUPERCOPA','Semifinal',d,four[1],four[2],{stage:'SF',bracketIndex:1,id:`SUPERCOPA-${year}-SF2`});
}
function createCopa(){
  if(state.special.copaCreated)return;const rows=sortedStandings('ACB');if(rows.length<8||rows.some(r=>r.gp<17))return;
  state.special.copaCreated=true;const seeds=rows.slice(0,8).map(r=>r.clubId);comp('COPA').clubIds=seeds.slice();
  const y=seasonStartYear()+1,d1=fixedOrLater(`${y}-02-18`,3),d2=addDays(d1,1);
  const pairs=[[seeds[0],seeds[7]],[seeds[3],seeds[4]],[seeds[1],seeds[6]],[seeds[2],seeds[5]]];
  pairs.forEach((x,i)=>addMatch('COPA','Cuartos',i<2?d1:d2,x[0],x[1],{stage:'QF',bracketIndex:i,id:`COPA-${state.season}-QF${i+1}`}));
  addInbox('COMPETITION','Copa del Rey',`Ya están definidos los ocho clasificados para la Copa del Rey: ${seeds.map(id=>club(id).shortName).join(', ')}.`);
}
function allStagePlayed(compId,stage){const ms=state.calendar.filter(m=>m.competitionId===compId&&m.stage===stage&&m.status!=='CANCELLED');return ms.length>0&&ms.every(m=>m.status==='PLAYED')}
function stageWinners(compId,stage){return state.calendar.filter(m=>m.competitionId===compId&&m.stage===stage&&m.status==='PLAYED').sort((a,b)=>(a.bracketIndex??0)-(b.bracketIndex??0)).map(matchWinner)}
function processSingleKnockout(m){
  const y=seasonStartYear()+1;
  if(m.competitionId==='SUPERCOPA'){
    if(m.stage==='SF'&&allStagePlayed('SUPERCOPA','SF')&&!state.calendar.some(x=>x.competitionId==='SUPERCOPA'&&x.stage==='F')){const w=stageWinners('SUPERCOPA','SF');addMatch('SUPERCOPA','Final',addDays(m.date,1),w[0],w[1],{stage:'F',bracketIndex:0,id:`SUPERCOPA-${state.season}-F`})}
    if(m.stage==='F'){state.special.champions.SUPERCOPA=matchWinner(m);addInbox('TITLE','Supercopa Endesa',`${club(matchWinner(m)).name} se proclama campeón de la Supercopa.`)}
  }
  if(m.competitionId==='COPA'){
    if(m.stage==='QF'&&allStagePlayed('COPA','QF')&&!state.calendar.some(x=>x.competitionId==='COPA'&&x.stage==='SF')){const w=stageWinners('COPA','QF'),d=addDays(state.calendar.filter(x=>x.competitionId==='COPA'&&x.stage==='QF').sort((a,b)=>b.date.localeCompare(a.date))[0].date,1);addMatch('COPA','Semifinal',d,w[0],w[1],{stage:'SF',bracketIndex:0,id:`COPA-${state.season}-SF1`});addMatch('COPA','Semifinal',d,w[2],w[3],{stage:'SF',bracketIndex:1,id:`COPA-${state.season}-SF2`})}
    if(m.stage==='SF'&&allStagePlayed('COPA','SF')&&!state.calendar.some(x=>x.competitionId==='COPA'&&x.stage==='F')){const w=stageWinners('COPA','SF');addMatch('COPA','Final',addDays(m.date,1),w[0],w[1],{stage:'F',bracketIndex:0,id:`COPA-${state.season}-F`})}
    if(m.stage==='F'){state.special.champions.COPA=matchWinner(m);addInbox('TITLE','Copa del Rey',`${club(matchWinner(m)).name} gana la Copa del Rey.`)}
  }
  if(m.competitionId==='EL_PI')processEuroPlayIn(m);
  if(m.competitionId==='EL_F4'){
    if(m.stage==='SF'&&allStagePlayed('EL_F4','SF')&&!state.calendar.some(x=>x.competitionId==='EL_F4'&&x.stage==='F')){const w=stageWinners('EL_F4','SF');addMatch('EL_F4','Final',addDays(m.date,2),w[0],w[1],{stage:'F',bracketIndex:0,id:`ELF4-${state.season}-F`})}
    if(m.stage==='F'){state.special.champions.EL_F4=matchWinner(m);addInbox('TITLE','Campeón de Euroliga',`${club(matchWinner(m)).name} gana la Euroliga.`)}
  }
}
function createSeriesStage(compId,stage,pairs,bestOf,startDate){
  const needed=Math.floor(bestOf/2)+1,pattern=bestOf===3?[0,1,0]:[0,0,1,1,0];
  pairs.forEach((pair,i)=>{const sid=`${compId}-${state.season}-${stage}-${i}`;state.special.series[sid]={id:sid,compId,stage,index:i,a:pair.a,b:pair.b,seedA:pair.seedA,seedB:pair.seedB,bestOf,needed,winner:null};pattern.forEach((homeSide,g)=>{const home=homeSide===0?pair.a:pair.b,away=homeSide===0?pair.b:pair.a;addMatch(compId,`${stage} · Partido ${g+1}`,addDays(startDate,g*2),home,away,{stage,seriesId:sid,gameNo:g+1,bestOf,bracketIndex:i,id:`${sid}-G${g+1}`})})})
}
function updateSeries(m){
  const sr=state.special.series[m.seriesId];if(!sr||sr.winner)return;const ms=state.calendar.filter(x=>x.seriesId===sr.id&&x.status==='PLAYED');let wa=0,wb=0;for(const x of ms){const w=matchWinner(x);if(w===sr.a)wa++;else if(w===sr.b)wb++}if(wa>=sr.needed||wb>=sr.needed){sr.winner=wa>wb?sr.a:sr.b;state.calendar.filter(x=>x.seriesId===sr.id&&x.status==='SCHEDULED').forEach(x=>x.status='CANCELLED');maybeAdvanceSeriesStage(sr.compId,sr.stage)}
}
function seriesOf(compId,stage){return Object.values(state.special.series).filter(x=>x.compId===compId&&x.stage===stage).sort((a,b)=>a.index-b.index)}
function maybeAdvanceSeriesStage(compId,stage){const ss=seriesOf(compId,stage);if(!ss.length||ss.some(x=>!x.winner))return;
  const winners=ss.map(x=>({id:x.winner,seed:x.winner===x.a?x.seedA:x.seedB}));const latest=state.calendar.filter(x=>x.seriesId&&ss.some(s=>s.id===x.seriesId)&&x.status==='PLAYED').sort((a,b)=>b.date.localeCompare(a.date))[0];const start=addDays(latest?.date||state.currentDate,3);
  if(compId==='ACB_PO'&&stage==='QF'){createSeriesStage('ACB_PO','SF',[{a:winners[0].id,b:winners[1].id,seedA:winners[0].seed,seedB:winners[1].seed},{a:winners[2].id,b:winners[3].id,seedA:winners[2].seed,seedB:winners[3].seed}],5,start)}
  else if(compId==='ACB_PO'&&stage==='SF'){const a=winners[0],b=winners[1],better=a.seed<b.seed?a:b,worse=better===a?b:a;createSeriesStage('ACB_PO','F',[{a:better.id,b:worse.id,seedA:better.seed,seedB:worse.seed}],5,start)}
  else if(compId==='ACB_PO'&&stage==='F'){state.special.champions.ACB_PO=winners[0].id;addInbox('TITLE','Campeón Liga ACB',`${club(winners[0].id).name} gana la Liga ACB.`)}
  else if(compId==='EL_PO'&&stage==='QF'){const w=winners;addMatch('EL_F4','Semifinal',start,w[0].id,w[1].id,{stage:'SF',bracketIndex:0,id:`ELF4-${state.season}-SF1`});addMatch('EL_F4','Semifinal',start,w[2].id,w[3].id,{stage:'SF',bracketIndex:1,id:`ELF4-${state.season}-SF2`})}
}
function createAcbPlayoffs(){if(state.special.acbPoCreated)return;state.special.acbPoCreated=true;const rows=sortedStandings('ACB').slice(0,8);comp('ACB_PO').clubIds=rows.map(r=>r.clubId);const s=rows.map((r,i)=>({id:r.clubId,seed:i+1}));const last=state.calendar.filter(m=>m.competitionId==='ACB'&&m.status==='PLAYED').sort((a,b)=>b.date.localeCompare(a.date))[0];const d=addDays(last?.date||state.currentDate,3);createSeriesStage('ACB_PO','QF',[{a:s[0].id,b:s[7].id,seedA:1,seedB:8},{a:s[3].id,b:s[4].id,seedA:4,seedB:5},{a:s[1].id,b:s[6].id,seedA:2,seedB:7},{a:s[2].id,b:s[5].id,seedA:3,seedB:6}],3,d);addInbox('COMPETITION','Playoffs ACB','Los ocho primeros de la Liga Regular comienzan el playoff por el título.')}
function createEuroPostseason(){if(state.special.elPostCreated)return;state.special.elPostCreated=true;const rows=sortedStandings('EL').slice(0,10);state.special.elSeeds=rows.map((r,i)=>({id:r.clubId,seed:i+1}));const s=state.special.elSeeds,last=state.calendar.filter(m=>m.competitionId==='EL'&&m.status==='PLAYED').sort((a,b)=>b.date.localeCompare(a.date))[0],d=addDays(last?.date||state.currentDate,3);addMatch('EL_PI','Play-In 7º-8º',d,s[6].id,s[7].id,{stage:'PI1',bracketIndex:0,id:`ELPI-${state.season}-A`});addMatch('EL_PI','Play-In 9º-10º',d,s[8].id,s[9].id,{stage:'PI1',bracketIndex:1,id:`ELPI-${state.season}-B`});comp('EL_PI').clubIds=s.slice(6,10).map(x=>x.id);addInbox('COMPETITION','Play-In Euroliga','Los puestos 7º a 10º disputan el Play-In por las dos últimas plazas de playoff.')}
function processEuroPlayIn(m){
  const a=state.calendar.find(x=>x.id===`ELPI-${state.season}-A`),b=state.calendar.find(x=>x.id===`ELPI-${state.season}-B`),c=state.calendar.find(x=>x.id===`ELPI-${state.season}-C`);
  if(a?.status==='PLAYED'&&b?.status==='PLAYED'&&!c){addMatch('EL_PI','Play-In decisivo',addDays(m.date,2),matchLoser(a),matchWinner(b),{stage:'PI2',bracketIndex:0,id:`ELPI-${state.season}-C`});return}
  const cc=state.calendar.find(x=>x.id===`ELPI-${state.season}-C`);if(cc?.status==='PLAYED'&&!seriesOf('EL_PO','QF').length){const q7=matchWinner(a),q8=matchWinner(cc),s=state.special.elSeeds;comp('EL_PO').clubIds=[s[0].id,s[1].id,s[2].id,s[3].id,s[4].id,s[5].id,q7,q8];createSeriesStage('EL_PO','QF',[{a:s[0].id,b:q8,seedA:1,seedB:8},{a:s[3].id,b:s[4].id,seedA:4,seedB:5},{a:s[1].id,b:q7,seedA:2,seedB:7},{a:s[2].id,b:s[5].id,seedA:3,seedB:6}],5,addDays(cc.date,4))}
}
function ensurePostseasonGenerated(){
  if(!state?.special)return;createCopa();
  const acbRegular=state.calendar.filter(m=>m.competitionId==='ACB');if(acbRegular.length&&acbRegular.every(m=>m.status==='PLAYED'))createAcbPlayoffs();
  const elRegular=state.calendar.filter(m=>m.competitionId==='EL');if(elRegular.length&&elRegular.every(m=>m.status==='PLAYED'))createEuroPostseason();
}
function processSpecialAfterMatch(m){if(m.seriesId)updateSeries(m);else processSingleKnockout(m)}
function hasScheduledGames(){return state.calendar.some(m=>m.status==='SCHEDULED')}
function progressWorldUntilUserMatch(){let guard=0;while(!nextUserMatch()&&guard++<300){const m=state.calendar.filter(x=>x.status==='SCHEDULED').sort((a,b)=>a.date.localeCompare(b.date))[0];if(!m)return false;simulateOne(m,false);processAcademyTo(m.date);processScouting(m.date);processMedicalTo(m.date);state.currentDate=m.date}return !!nextUserMatch()}
function maybeGenerateDecisionEvent(){
  const played=(state.calendar||[]).filter(m=>m.status==='PLAYED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)).length;
  if(!played||played%5!==0||state.lastDecisionGame===played)return;state.lastDecisionGame=played;
  const rng=new BBGM.RNG(hashCode(`${state.season}-${played}-decision-v11`)),roster=userClub().roster.slice();
  ensureV15State();if(played%12===0&&state.economy.lastDecisionGame!==played){state.economy.lastDecisionGame=played;addInbox('DECISION','Revisión presupuestaria de la directiva','La directiva te permite reajustar una parte de los recursos para el siguiente tramo de temporada.',{choices:[{label:'Dar más margen salarial',effect:'FIN_WAGES'},{label:'Invertir en scouting',effect:'FIN_SCOUT'},{label:'Proteger la caja',effect:'FIN_STABLE'}]});return}
  const lowSat=roster.slice().sort((a,b)=>(a.state.roleSatisfaction||70)-(b.state.roleSatisfaction||70))[0];
  const tired=roster.slice().sort((a,b)=>(b.state.fatigue||0)-(a.state.fatigue||0))[0];
  const roll=rng.next();
  if(roll<.34&&lowSat){
    addInbox('DECISION',`${fullName(lowSat)} pide más protagonismo`,`El jugador está preocupado por su rol y sus minutos. Puedes implicarte, delegar la conversación en el capitán, mantener el reparto actual o abrirle la puerta del mercado.`,{playerId:lowSat.id,choices:[{label:'Hablar con el entrenador',effect:'TALK_COACH_MORE'},{label:'Delegar en el capitán',effect:'PLAYER_CAPTAIN'},{label:'Mantener el reparto',effect:'HOLD_ROLE'},{label:'Escuchar ofertas',effect:'LIST_PLAYER'}]});
  }else if(roll<.57&&tired){
    addInbox('DECISION',`${fullName(tired)} acusa la carga de partidos`,`El cuerpo médico advierte de fatiga acumulada (${Math.round(tired.state.fatigue||0)}/100).`,{playerId:tired.id,choices:[{label:'Pedir más descanso',effect:'TALK_COACH_REST'},{label:'Mantener minutos',effect:'KEEP_LOAD'}]});
  }else if(roll<.80){
    const candidates=roster.filter(p=>(p.contractYears||0)>0&&BBGM.overall(p)>=70);if(!candidates.length)return;
    const p=rng.pick(candidates),buyers=state.world.clubs.filter(c=>c.id!==state.userClubId&&c.leagueLevel!=='NBA'&&c.cashBudget>BBGM.marketValue(p)*.7);
    if(!buyers.length)return;const buyer=rng.pick(buyers);
    addInbox('DECISION',`${buyer.name} pregunta por ${fullName(p)}`,`El director deportivo de ${buyer.name} quiere saber si estarías dispuesto a negociar por el jugador antes de presentar una oferta formal.`,{playerId:p.id,fromClubId:buyer.id,choices:[{label:'No está en venta',effect:'CLUB_NOT_FOR_SALE'},{label:'Invitar a presentar oferta',effect:'CLUB_INVITE_OFFER'},{label:p.age<=23?'Valorar una cesión':'Escuchar solo traspaso',effect:p.age<=23?'CLUB_LOAN_OPEN':'CLUB_INVITE_OFFER'}]});
  }else{
    addInbox('DECISION','La directiva plantea una prioridad','La directiva quiere saber dónde pondrás el foco durante las próximas semanas.',{choices:[{label:'Potenciar cantera',effect:'BOARD_YOUTH'},{label:'Priorizar resultados',effect:'BOARD_RESULTS'}]});
  }
}
function resolveDecision(id,choiceIndex,fromModal=false){
  const ev=state.inbox.find(e=>e.id===id);if(!ev||ev.resolved)return '';const ch=(ev.choices||[])[choiceIndex];if(!ch)return '';const p=ev.playerId?playerLocation(ev.playerId)?.player:null;let result='La decisión se ha aplicado a la situación.';
  if(ch.effect==='TALK_COACH_MORE'&&p){setCoachMinuteRequest(p,5,5,'PLAYER_MEETING');p.state.morale=BBGM.clamp(p.state.morale+5,0,100);p.state.roleSatisfaction=BBGM.clamp((p.state.roleSatisfaction||70)+8,0,100);state.coachManagement.relationship=BBGM.clamp((state.coachManagement.relationship||72)-.5,0,100);result=`${fullName(p)} agradece tu apoyo. Tendrá una petición de +5 minutos durante 5 partidos; su moral y satisfacción mejoran, aunque la relación con el entrenador baja ligeramente.`}
  if(ch.effect==='TALK_COACH_REST'&&p){setCoachMinuteRequest(p,-6,4,'REST');p.state.morale=BBGM.clamp(p.state.morale+2,0,100);p.state.fatigue=BBGM.clamp((p.state.fatigue||0)-5,0,100)}
  if(ch.effect==='KEEP_LOAD'&&p){p.state.morale=BBGM.clamp(p.state.morale-1.5,0,100)}
  if(ch.effect==='HOLD_ROLE'&&p){p.state.morale=BBGM.clamp(p.state.morale-3,0,100);p.state.roleSatisfaction=BBGM.clamp((p.state.roleSatisfaction||70)-4,0,100);state.manager.reputation=BBGM.clamp(state.manager.reputation+.3,0,100);result=`Mantienes el reparto actual. ${fullName(p)} pierde moral y satisfacción, mientras tu autoridad como director deportivo se refuerza ligeramente.`}
  if(ch.effect==='V20_RENEW_NOW'&&p){ev.resolved=true;ev.decision=ch.label;saveLocal(false);openContractNegotiation(p,{type:'RENEW'});return}
  if(ch.effect==='V20_RENEW_WAIT'&&p){p.state.contractSatisfaction=BBGM.clamp((p.state.contractSatisfaction||70)-3,0,100);changeAgentRelation(p.agent,-.5)}
  if(ch.effect==='LIST_PLAYER'&&p){p.transferListed=true;p.state.morale=BBGM.clamp(p.state.morale-1,0,100);result=`${fullName(p)} queda disponible para recibir ofertas. Su moral baja ligeramente y el mercado ya conoce su situación.`}
  if(ch.effect==='CLUB_NOT_FOR_SALE'&&p){p.state.morale=BBGM.clamp(p.state.morale+2.5,0,100);p.transferListed=false}
  if(ch.effect==='CLUB_INVITE_OFFER'&&p&&ev.fromClubId){const buyer=club(ev.fromClubId),fee=Math.round(BBGM.marketValue(p)*(1.00+.18*Math.random())/50000)*50000;addInbox('TRANSFER_OFFER',`Oferta por ${fullName(p)}`,`${buyer.name} responde a tu apertura y ofrece ${fmtMoney(fee)}.`,{playerId:p.id,fromClubId:buyer.id,fee})}
  if(ch.effect==='CLUB_LOAN_OPEN'&&p){p.loanAvailable=true;p.state.morale=BBGM.clamp(p.state.morale+.5,0,100);addInbox('LOAN','Interés en cesión',`Has comunicado que estudiarías una cesión para ${fullName(p)}. Podrás elegir destino desde Plantilla.`)}
  if(ch.effect==='NBA_DECLARE'&&p){p.nbaDeclared='DECLARE';p.state.morale=BBGM.clamp((p.state.morale||70)+1.5,0,100)}
  if(ch.effect==='NBA_WITHDRAW'&&p){p.nbaDeclared='WITHDRAW';p.state.morale=BBGM.clamp((p.state.morale||70)-.5,0,100)}
  if(ch.effect==='YOUTH_KEEP'&&p){p.state.morale=BBGM.clamp((p.state.morale||70)+1,0,100);p.trainWithFirstTeam=true}
  if(ch.effect==='BOARD_YOUTH'){state.board.confidence=BBGM.clamp(state.board.confidence+3,0,100);state.manager.development=BBGM.clamp(state.manager.development+1,0,100)}
  if(ch.effect==='BOARD_RESULTS'){state.board.confidence=BBGM.clamp(state.board.confidence+1,0,100);state.manager.planning=BBGM.clamp(state.manager.planning+.7,0,100)}
  if(ch.effect==='FIN_WAGES'){const cost=Math.min(350000,Math.max(0,userClub().cashBudget));financeEntry(userClub(),'EXPENSE','BUDGET_MOVE',-cost,'Reasignación a margen salarial');userClub().salaryBudget+=500000;userClub().financialHealth=BBGM.clamp((userClub().financialHealth||65)-1,0,100)}
  if(ch.effect==='FIN_SCOUT'){const cost=Math.min(300000,Math.max(0,userClub().cashBudget));financeEntry(userClub(),'EXPENSE','BUDGET_MOVE',-cost,'Inversión extraordinaria en scouting');state.manager.scouting=BBGM.clamp((state.manager.scouting||50)+1.3,0,100);for(const sc of state.scouting.staff){sc.judgingCurrent=BBGM.clamp(sc.judgingCurrent+.5,0,100);sc.judgingPotential=BBGM.clamp(sc.judgingPotential+.5,0,100)}}
  if(ch.effect==='FIN_STABLE'){userClub().financialHealth=BBGM.clamp((userClub().financialHealth||65)+3,0,100);state.board.confidence=BBGM.clamp((state.board.confidence||70)+1,0,100)}
  if(ch.effect==='LOCKER_MEDIATE'){const p2=ev.otherPlayerId?playerLocation(ev.otherPlayerId)?.player:null;if(p)p.state.morale=BBGM.clamp(p.state.morale+3,0,100);if(p2)p2.state.morale=BBGM.clamp(p2.state.morale+3,0,100);if(p&&p2)changeRelationship(p,p2,8);state.manager.staffManagement=BBGM.clamp((state.manager.staffManagement||50)+.6,0,100);result=p&&p2?`La reunión rebaja la tensión. ${fullName(p)} y ${fullName(p2)} mejoran su moral y su relación sube 8 puntos.`:'La reunión mejora el ambiente del vestuario.'}
  if(ch.effect==='LOCKER_CAPTAIN'||ch.effect==='PLAYER_CAPTAIN')result=resolveCaptainDelegation(ev);
  if(ch.effect==='LOCKER_IGNORE'){if(p)p.state.morale=BBGM.clamp(p.state.morale-2,0,100);const p2=ev.otherPlayerId?playerLocation(ev.otherPlayerId)?.player:null;if(p2)p2.state.morale=BBGM.clamp(p2.state.morale-2,0,100);if(p&&p2)changeRelationship(p,p2,-5);result=p&&p2?`No intervienes. ${fullName(p)} y ${fullName(p2)} pierden moral y su relación empeora 5 puntos.`:'La tensión del vestuario empeora al no intervenir.'}
  if(ch.effect==='LOCKER_SUPPORT'){for(const x of userClub().roster)x.state.morale=BBGM.clamp((x.state.morale||70)+1.2,0,100)}
  if(ch.effect==='LOCKER_FOCUS'){state.manager.reputation=BBGM.clamp((state.manager.reputation||50)+.2,0,100)}
  if(ch.effect==='PERS_SUPPORT_ADAPT'&&p){p.state.teamAdaptation=BBGM.clamp((p.state.teamAdaptation||50)+8,0,100);p.state.morale=BBGM.clamp((p.state.morale||70)+4,0,100);changeAgentRelation(p.agent,1)}
  if(ch.effect==='PERS_HOME_EXIT'&&p){p.transferListed=true;p.transferRequest=true;p.state.morale=BBGM.clamp((p.state.morale||70)+1,0,100)}
  if(ch.effect==='PERS_HARDLINE'&&p){p.state.morale=BBGM.clamp((p.state.morale||70)-4,0,100);p.state.teamAdaptation=BBGM.clamp((p.state.teamAdaptation||50)+2,0,100);changeAgentRelation(p.agent,-1)}
  if(ch.effect==='PERS_PROMISE_WIN'&&p){p.projectPromiseSeason=state.season;p.state.morale=BBGM.clamp((p.state.morale||70)+5,0,100);changeAgentRelation(p.agent,1)}
  if(ch.effect==='PERS_NO_PROMISE'&&p){p.state.morale=BBGM.clamp((p.state.morale||70)-3,0,100);if((p.personality?.ambition||50)>86)p.transferRequest=true}
  if(ch.effect==='PERS_EXIT_MARKET'&&p){p.transferListed=true;p.transferRequest=true;changeAgentRelation(p.agent,-1)}
  if(ch.effect==='PERS_ROLE_HOLD'&&p){p.state.morale=BBGM.clamp((p.state.morale||70)-4,0,100);p.state.roleSatisfaction=BBGM.clamp((p.state.roleSatisfaction||70)-6,0,100)}
  if(ch.effect==='PERS_RENEW_WARM'&&p){p.state.contractSatisfaction=BBGM.clamp((p.state.contractSatisfaction||70)+8,0,100);p.renewalWarm=true;changeAgentRelation(p.agent,2)}
  if(ch.effect==='PERS_RENEW_WAIT'&&p){p.state.morale=BBGM.clamp((p.state.morale||70)-1,0,100)}
  if(ch.effect==='PERS_MENTOR_SUPPORT'){const p2=ev.otherPlayerId?playerLocation(ev.otherPlayerId)?.player:null;if(p&&p2){changeRelationship(p,p2,7);p2.state.confidence=BBGM.clamp((p2.state.confidence||65)+4,0,100);p.state.morale=BBGM.clamp((p.state.morale||70)+2,0,100)}}
  if(ch.effect==='PERS_MENTOR_NATURAL'){const p2=ev.otherPlayerId?playerLocation(ev.otherPlayerId)?.player:null;if(p&&p2)changeRelationship(p,p2,2)}
  ev.resolved=true;ev.decision=ch.label;ev.decisionResult=result;scheduleDecisionFollowUpV21(ev,ch);state.lockerRoom=state.lockerRoom||{};state.lockerRoom.decisionHistory=state.lockerRoom.decisionHistory||[];state.lockerRoom.decisionHistory.unshift({eventId:ev.id,date:state.currentDate,title:ev.title,decision:ch.label,result,captainResolution:ev.captainResolution||null});state.lockerRoom.decisionHistory=state.lockerRoom.decisionHistory.slice(0,40);saveLocal(false);if(app)render();if(!fromModal)toast('Decisión registrada');return result;
}
function advanceOffseasonWeek(){if(interruptForPendingDecision())return;if(!state.offseason?.active)return;state.currentDate=addDays(state.currentDate,7);processScouting(state.currentDate);processMedicalTo(state.currentDate);for(let i=0;i<3;i++)runAiMarketStep();generateMarketPulse();state.offseason.weeksRemaining--;if(state.offseason.weeksRemaining<=0){state.offseason.active=false;state.currentDate=`${seasonStartYear()}-08-25`;activatePreseason(state.currentDate);addInbox('SEASON','Mercado principal cerrado','Comienza la pretemporada: tres semanas para afinar plantilla, roles y carga antes de competir.');toast('Comienza la pretemporada')}else toast(`Quedan ${state.offseason.weeksRemaining} semanas de mercado`);maybeRecordWeeklySummary(true);saveLocal(false);render()}

function regionForNationality(n){if(n==='USA')return 'USA';return 'EUROPE'}
function scoutById(id){return state.scouting.staff.find(s=>s.id===id)}
function activeScoutAssignment(scoutId){return state.scouting.assignments.find(a=>a.scoutId===scoutId&&a.status==='ACTIVE')}
function reportForPlayer(playerId){return state.scouting.knowledge[playerId]||null}
function hashCode(str){let h=2166136261;for(let i=0;i<str.length;i++){h^=str.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function estimatedRange(value,margin,seedKey){
  const rng=new BBGM.RNG(hashCode(seedKey));
  const shift=(rng.next()-.5)*margin*.7;
  const lo=Math.max(1,Math.round(value-margin+shift)),hi=Math.min(99,Math.round(value+margin+shift));
  return [Math.min(lo,hi),Math.max(lo,hi)];
}
function knowledgeLevel(p,ownerClub){
  if(ownerClub&&ownerClub.id===state.userClubId)return 4;
  const r=reportForPlayer(p.id),publicLevel=p.publicKnowledge||0;
  let reportLevel=r?r.level:0;if(r&&r.completedDate){const age=daysBetween(r.completedDate,state.currentDate);if(age>240)reportLevel=Math.max(1,reportLevel-2);else if(age>120)reportLevel=Math.max(1,reportLevel-1)}
  return Math.max(publicLevel,reportLevel);
}
function knowledgeSkill(p){
  const r=reportForPlayer(p.id);
  if(!r)return 55;
  const sc=scoutById(r.scoutId);if(!sc)return 60;
  const reg=regionForNationality(p.nationality),regional=reg==='USA'?sc.usa:sc.europe,loc=playerLocation(p.id),leagueBonus=(loc?.club?.leagueName&&sc.focusLeague===loc.club.leagueName)?8:0,countryBonus=sc.focusCountry===p.nationality?7:0;
  return (sc.judgingCurrent*.55+regional*.25+(p.age<=22?sc.youth:sc.professionals)*.20+leagueBonus+countryBonus);
}
function knownOverall(p,ownerClub){
  const level=knowledgeLevel(p,ownerClub),real=BBGM.overall(p);
  if(level===4)return {level,text:String(Math.round(real)),mid:real,range:[real,real]};
  if(level===0)return {level,text:'?',mid:null,range:null};
  const skill=knowledgeSkill(p);
  let margin=level===1?7:level===2?4:2;
  margin*=Math.max(.72,1.18-skill/220);
  const range=estimatedRange(real,margin,`ovr-${p.id}-${level}-${Math.round(skill)}`);
  return {level,text:`${range[0]}–${range[1]}`,mid:(range[0]+range[1])/2,range};
}
function knownAttribute(p,key,ownerClub){
  const level=knowledgeLevel(p,ownerClub),value=p.attributes[key];
  if(level===4)return String(Math.round(value));
  if(level===0)return '?';
  const skill=knowledgeSkill(p);
  let margin=level===1?15:level===2?8:3.5;
  margin*=Math.max(.72,1.18-skill/220);
  const r=estimatedRange(value,margin,`attr-${p.id}-${key}-${level}-${Math.round(skill)}`);
  return `${r[0]}–${r[1]}`;
}
function knownPotential(p,ownerClub){
  const real=p.potentialReal??BBGM.overall(p);
  if(ownerClub&&ownerClub.id===state.userClubId){
    const margin=Math.max(2.5,6-(state.manager.development||50)/25);
    const r=estimatedRange(real,margin,`ownpot-${p.id}-${Math.round(state.manager.development||50)}`);return `${r[0]}–${r[1]}`;
  }
  const level=knowledgeLevel(p,ownerClub);if(level<2)return '?';
  const report=reportForPlayer(p.id),sc=report?scoutById(report.scoutId):null,skill=sc?sc.judgingPotential:55;
  let margin=level===2?8:3.5;margin*=Math.max(.72,1.18-skill/220);
  const r=estimatedRange(real,margin,`pot-${p.id}-${level}-${Math.round(skill)}`);return `${r[0]}–${r[1]}`;
}
function personalitySummary(p,ownerClub){
  if(ownerClub&&ownerClub.id===state.userClubId)return personalityText(p);
  if(knowledgeLevel(p,ownerClub)<3)return 'Sin información suficiente';
  return personalityText(p);
}
function personalityText(p){
  const q=p.personality||{};const bits=[];
  if((q.professionalism||50)>=72)bits.push('muy profesional');else if((q.professionalism||50)<38)bits.push('profesionalidad dudosa');
  if((q.ambition||50)>=75)bits.push('ambicioso');
  if((q.loyalty||50)>=75)bits.push('leal');else if((q.loyalty||50)<35)bits.push('poco leal');
  if((q.adaptability||50)>=72)bits.push('buena adaptación');else if((q.adaptability||50)<38)bits.push('adaptación lenta');
  return bits.length?bits.slice(0,3).join(' · '):'perfil equilibrado';
}
function processScouting(targetDate){
  if(!state.scouting)return;
  for(const a of state.scouting.assignments){
    if(a.status!=='ACTIVE'||a.endDate>targetDate)continue;
    a.status='COMPLETE';
    const level=a.type==='FULL'?3:2;
    const prev=state.scouting.knowledge[a.playerId];
    if(!prev||level>=prev.level)state.scouting.knowledge[a.playerId]={level,scoutId:a.scoutId,type:a.type,completedDate:a.endDate};
    const loc=playerLocation(a.playerId),sc=scoutById(a.scoutId);
    if(loc)addInbox('SCOUT_COMPLETE','Informe de scouting terminado',`${sc?sc.name:'Tu ojeador'} ha completado el informe ${a.type==='FULL'?'completo':'rápido'} de ${fullName(loc.player)}.`,{playerId:a.playerId});
  }
}
function startScouting(playerId,scoutId,type){
  const sc=scoutById(scoutId);if(!sc||activeScoutAssignment(scoutId)){toast('Ese ojeador ya está ocupado');return false}
  const days=type==='FULL'?15:3;
  state.scouting.assignments.push({id:state.scouting.nextAssignmentId++,playerId,scoutId,type,startDate:state.currentDate,endDate:addDays(state.currentDate,days),status:'ACTIVE'});
  saveLocal(false);toast(`Informe ${type==='FULL'?'completo':'rápido'} asignado`);return true;
}

function addInbox(type,title,text,extra={}){
  if(type==='DECISION'){
    const played=(state.calendar||[]).filter(m=>m.status==='PLAYED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)).length;
    state.decisionPacing=state.decisionPacing||{lastGame:null,minGap:5};
    const last=Number(state.decisionPacing.lastGame);
    const pending=(state.inbox||[]).some(e=>e.type==='DECISION'&&!e.resolved);
    if(pending||(Number.isFinite(last)&&played-last<state.decisionPacing.minGap))return null;
    state.decisionPacing.lastGame=played;
  }
  const ev={id:state.nextEventId++,type,title,text,resolved:false,date:state.currentDate,...extra};
  state.inbox.unshift(ev);
  return ev;
}

function playerLocation(playerId){
  for(const c of state.world.clubs){
    const p=c.roster.find(x=>x.id===playerId);
    if(p)return {player:p,club:c,status:'CONTRACTED'};
  }
  if(state.academy){
    const ap=(state.academy.players||[]).find(x=>x.id===playerId);
    if(ap)return {player:ap,club:userClub(),status:'B_TEAM'};
    const loan=(state.academy.loans||[]).find(x=>x.player&&x.player.id===playerId&&x.status==='ACTIVE');
    if(loan)return {player:loan.player,club:userClub(),status:'LOANED',loan};
  }
  const p=(state.world.freeAgents||[]).find(x=>x.id===playerId);
  return p?{player:p,club:null,status:'FREE_AGENT'}:null;
}

function ensurePlayerContractFields(p,index=0){
  if(p.salary==null)p.salary=300000;
  if(p.contractYears==null)p.contractYears=1;
  if(p.releaseClause===undefined)p.releaseClause=Math.round(p.salary*3/50000)*50000;
  if(!p.agent){const agents=state.world.agents||['EuroHoops Representation'];p.agent=agents[index%agents.length]}
  if(p.transferListed==null)p.transferListed=false;
  if(!p.trainingFocus)p.trainingFocus='BALANCED';
  if(!p.promisedRole)p.promisedRole=p.role||'ROTATION';
  if(!p.role)p.role=p.promisedRole;
  if(!p.state)p.state={};
  if(p.state.morale==null)p.state.morale=70;
  if(p.state.roleSatisfaction==null)p.state.roleSatisfaction=75;
  if(p.state.contractSatisfaction==null)p.state.contractSatisfaction=72;
  p.contractTerms=p.contractTerms||{signingBonus:0,performanceBonus:0,clubOption:false,playerOption:false,nbaClause:!!p.nbaRights};
}


function ensureScoutingFields(p,clubRep=50){
  if(!p.personality){const rng=new BBGM.RNG(p.id*7919);p.personality={professionalism:BBGM.clamp(50+rng.gaussian()*18,10,98),ambition:BBGM.clamp(55+rng.gaussian()*20,10,98),loyalty:BBGM.clamp(50+rng.gaussian()*22,5,98),temperament:BBGM.clamp(55+rng.gaussian()*20,5,98),pressure:BBGM.clamp(55+rng.gaussian()*18,10,98),adaptability:BBGM.clamp(55+rng.gaussian()*18,10,98),workEthic:BBGM.clamp(58+rng.gaussian()*17,10,98),ego:BBGM.clamp(48+rng.gaussian()*22,5,98)}}
  if(p.potentialReal==null){const o=BBGM.overall(p),rng=new BBGM.RNG(p.id*3571);const age=p.age||27;p.potentialReal=BBGM.clamp(o+(age<=21?5+rng.next()*7:age<=24?2+rng.next()*5:rng.next()*2),o-1,96)}
  if(p.publicKnowledge==null)p.publicKnowledge=(BBGM.overall(p)>=84||(clubRep>=90&&BBGM.overall(p)>=79))?1:0;
}

function academyStatLine(){return {games:0,minutes:0,points:0,rebounds:0,assists:0,steals:0,blocks:0,twoMade:0,twoAttempted:0,threeMade:0,threeAttempted:0,ftMade:0,ftAttempted:0,value:0}}
function ensureAcademy(){
  if(!state.academy)state.academy={players:BBGM.createYouthClass(state.userClubId,7,hashCode(state.season||'2026/27')),loans:[],bStats:{},lastBDate:state.currentDate||'2026-09-01',lastDevelopmentMonth:(state.currentDate||'2026-09-01').slice(0,7),nextLoanId:1};
  if(!state.academy.players)state.academy.players=[];if(!state.academy.loans)state.academy.loans=[];if(!state.academy.bStats)state.academy.bStats={};
  if(!state.academy.lastBDate)state.academy.lastBDate=state.currentDate||'2026-09-01';if(!state.academy.lastDevelopmentMonth)state.academy.lastDevelopmentMonth=(state.currentDate||'2026-09-01').slice(0,7);
  state.academy.nextLoanId=state.academy.nextLoanId||1;
  for(const p of state.academy.players){ensurePlayerContractFields(p,p.id);ensureScoutingFields(p,userClub().reputation);p.academy=true;p.role='DEVELOPMENT';if(!state.academy.bStats[p.id])state.academy.bStats[p.id]=academyStatLine()}
  for(const l of state.academy.loans){if(!l.stats)l.stats=academyStatLine();if(!l.status)l.status='ACTIVE'}
}
function dateDiffDays(a,b){return Math.max(0,Math.round((new Date(b+'T12:00:00Z')-new Date(a+'T12:00:00Z'))/86400000))}
function focusAttributes(f){
  const map={BALANCED:['basketballIq','decisionMaking','consistency','workRate'],THREE:['threePoint','offBall','freeThrow'],DEFENSE:['perimeterDefense','interiorDefense','helpDefense','steal','block'],PHYSICAL:['speed','strength','vertical','stamina','durability'],PLAYMAKING:['ballHandling','passing','shotCreation','pickAndRoll'],FINISHING:['finishing','midRange','postPlay','offBall']};return map[f]||map.BALANCED;
}
function simulateDevelopment(p,minutesFactor=1,source='B'){
  const o=BBGM.overall(p),gap=Math.max(0,(p.potentialReal||o)-o),age=p.age||20;if(gap<.2)return 0;
  const ageFactor=age<=17?1.35:age<=19?1.18:age<=21?1:age<=23?.72:.38;
  const pro=((p.personality?.professionalism||55)+(p.personality?.workEthic||55))/110;
  const coach=((userClub().coach?.development||70)+(state.manager?.development||55))/140;
  const rng=new BBGM.RNG(hashCode(`${p.id}-${state.academy.lastDevelopmentMonth}-${source}`));
  const growth=BBGM.clamp((.055+gap*.012)*ageFactor*pro*coach*(.72+minutesFactor*.35)*(0.86+rng.next()*.28),.015,.48);
  const keys=focusAttributes(p.trainingFocus),per=growth*3.2/Math.max(1.2,keys.length*.35);
  for(const k of Object.keys(p.attributes))p.attributes[k]=BBGM.clamp(p.attributes[k]+growth*.45*(.8+rng.next()*.4),1,99);
  for(const k of keys)p.attributes[k]=BBGM.clamp(p.attributes[k]+per*(.75+rng.next()*.5),1,99);
  // pequeña mejora general para evitar perfiles demasiado extremos
  const secondary=['basketballIq','decisionMaking','workRate'];for(const k of secondary)p.attributes[k]=BBGM.clamp(p.attributes[k]+growth*.22,1,99);
  return growth;
}
function addSyntheticStats(p,st,games,levelFactor=1,targetMinutes=null){
  if(games<=0)return;const rng=new BBGM.RNG(hashCode(`${p.id}-${state.academy.lastBDate}-${games}-${levelFactor}-${targetMinutes??'auto'}`));
  const o=BBGM.overall(p),pos=p.primaryPosition;
  for(let g=0;g<games;g++){
    const min=targetMinutes==null?BBGM.clamp(22+(o-55)*.45+rng.gaussian()*3,10,34):BBGM.clamp(targetMinutes+rng.gaussian()*2.6,4,34);
    const usage=(p.tendencies?.usage||50)/50;const minuteScale=min/25;const pts=Math.max(1,Math.round((5+(o-50)*.42)*usage*levelFactor*minuteScale+rng.gaussian()*2.4));
    const rebBase=(pos==='C'?7.2:pos==='PF'?5.8:pos==='SF'?4.3:3.1)+(p.attributes.defensiveRebound-60)*.035;
    const astBase=(pos==='PG'?4.8:pos==='SG'?3.0:2.0)+(p.attributes.passing-60)*.035;
    const reb=Math.max(0,Math.round(rebBase*levelFactor+rng.gaussian()*1.5)),ast=Math.max(0,Math.round(astBase*levelFactor+rng.gaussian()*1.3));
    const stl=Math.max(0,Math.round(.6+(p.attributes.steal-55)*.018+rng.gaussian()*.45)),blk=Math.max(0,Math.round(.3+(p.attributes.block-55)*.018+rng.gaussian()*.4));
    const twoA=Math.max(1,Math.round((pts*.52)/1.05)),threeA=Math.max(0,Math.round((pts*.28)/1.05)),ftA=Math.max(0,Math.round(pts*.22));
    const twoM=Math.min(twoA,Math.max(0,Math.round(twoA*(.43+(p.attributes.finishing-55)*.003)))),threeM=Math.min(threeA,Math.max(0,Math.round(threeA*(.28+(p.attributes.threePoint-55)*.0025)))),ftM=Math.min(ftA,Math.max(0,Math.round(ftA*(.62+(p.attributes.freeThrow-55)*.003))));
    st.games++;st.minutes+=min;st.points+=pts;st.rebounds+=reb;st.assists+=ast;st.steals+=stl;st.blocks+=blk;st.twoMade+=twoM;st.twoAttempted+=twoA;st.threeMade+=threeM;st.threeAttempted+=threeA;st.ftMade+=ftM;st.ftAttempted+=ftA;st.value+=pts+reb+ast+stl+blk-Math.max(0,Math.round(2+rng.next()*2));
  }
}
function monthKeysBetween(fromDate,toDate){
  const out=[];let d=new Date(fromDate.slice(0,7)+'-01T12:00:00Z'),end=new Date(toDate.slice(0,7)+'-01T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+1);while(d<=end){out.push(d.toISOString().slice(0,7));d.setUTCMonth(d.getUTCMonth()+1)}return out;
}
function processAcademyTo(targetDate){
  ensureAcademy();const days=dateDiffDays(state.academy.lastBDate,targetDate),games=Math.floor(days/7);
  if(games>0){
    for(const p of state.academy.players){const st=state.academy.bStats[p.id]||(state.academy.bStats[p.id]=academyStatLine());addSyntheticStats(p,st,games,1)}
    for(const l of state.academy.loans.filter(x=>x.status==='ACTIVE')){const dest=club(l.loanClubId),difficulty=dest?BBGM.clamp(1.08-(cScore(dest)-72)*.012,.88,1.12):1;addSyntheticStats(l.player,l.stats,games,difficulty,l.projectedMinutes||18);}
    state.academy.lastBDate=addDays(state.academy.lastBDate,games*7);
  }
  const months=monthKeysBetween(state.academy.lastDevelopmentMonth+'-01',targetDate);
  for(const mk of months){
    state.academy.lastDevelopmentMonth=mk;
    for(const p of state.academy.players){const st=state.academy.bStats[p.id]||academyStatLine();let mf=st.games?BBGM.clamp((st.minutes/st.games)/26,.55,1.2):.65;if(p.trainWithFirstTeam)mf*=1.12;const before=BBGM.overall(p);simulateDevelopment(p,mf,p.trainWithFirstTeam?'B_FIRST':'B');p.lastDevelopmentDelta=BBGM.overall(p)-before;recordDevelopmentPoint(p,mk+'-28')}
    for(const p of userClub().roster){const rot=BBGM.rotation(userClub());const mf=BBGM.clamp((rot.playerMinutes[p.id]||0)/22,.45,1.25);const before=BBGM.overall(p);simulateDevelopment(p,mf,'FIRST');p.lastDevelopmentDelta=BBGM.overall(p)-before;recordDevelopmentPoint(p,mk+'-28')}
    for(const l of state.academy.loans.filter(x=>x.status==='ACTIVE')){const mf=l.stats.games?BBGM.clamp((l.stats.minutes/l.stats.games)/25,.55,1.25):.8;const before=BBGM.overall(l.player);simulateDevelopment(l.player,mf,'LOAN');l.player.lastDevelopmentDelta=BBGM.overall(l.player)-before}
    addInbox('DEVELOPMENT','Informe mensual de desarrollo','El staff ha actualizado la evolución de la plantilla y del equipo B.');
  }
  for(const l of state.academy.loans.filter(x=>x.status==='ACTIVE'&&x.endDate<=targetDate))returnLoan(l.id,false);
}
function promoteYouth(id){
  ensureAcademy();const i=state.academy.players.findIndex(p=>p.id===id);if(i<0)return;const p=state.academy.players[i],uc=userClub();if(uc.roster.length>=16){toast('La plantilla principal ya tiene 16 jugadores');return}
  const salary=Math.max(100000,Math.round((70000+BBGM.overall(p)*3500)/50000)*50000);if(wageBill(uc)+salary>uc.salaryBudget){toast('No hay margen salarial para promocionarlo');return}
  state.academy.players.splice(i,1);uc.roster.push(p);p.academy=false;p.academyProduct=true;p.salary=salary;p.contractYears=Math.max(2,22-p.age);p.role='DEVELOPMENT';p.state.teamAdaptation=72;addInbox('ACADEMY','Promoción al primer equipo',`${fullName(p)} sube desde el equipo B.`);evaluateAchievements(true);saveLocal(false);render();toast('Jugador promocionado');
}
function demoteYouth(id){
  const uc=userClub(),i=uc.roster.findIndex(p=>p.id===id);if(i<0)return;const p=uc.roster[i];if((p.age||99)>22){toast('Solo puedes bajar jugadores de 22 años o menos');return}if(uc.roster.length<=8){toast('Necesitas mantener al menos 8 jugadores en el primer equipo');return}
  uc.roster.splice(i,1);p.academy=true;p.role='DEVELOPMENT';state.academy.players.push(p);if(!state.academy.bStats[p.id])state.academy.bStats[p.id]=academyStatLine();addInbox('ACADEMY','Jugador enviado al equipo B',`${fullName(p)} pasa al equipo B.`);saveLocal(false);render();toast('Jugador enviado al B');
}
function positionCompetition(p,c){
  return c.roster.filter(x=>x.primaryPosition===p.primaryPosition||x.secondaryPosition===p.primaryPosition).map(x=>BBGM.overall(x)).sort((a,b)=>b-a);
}
function projectedLoanMinutes(p,c){
  const o=BBGM.overall(p),competition=positionCompetition(p,c),stronger=competition.filter(x=>x>o+1).length,near=competition.filter(x=>Math.abs(x-o)<=3).length;
  let min=29-stronger*6-near*1.5;
  const teamGap=cScore(c)-o;if(teamGap>8)min-=Math.min(9,(teamGap-8)*.7);else if(teamGap<-5)min+=2;
  if(c.leagueLevel==='PRIMERA_FEB')min+=2.5;
  return BBGM.clamp(min,5,32);
}
function loanFitScore(p,c){
  const min=projectedLoanMinutes(p,c),o=BBGM.overall(p),team=cScore(c),parent=cScore(userClub());
  let score=100-Math.abs(min-24)*3-Math.abs(team-(o+2))*1.1;
  if(team>=parent+2)score-=24;
  if(c.leagueLevel==='EUROLEAGUE'&&o<78)score-=30;
  if(c.leagueLevel==='PRIMERA_FEB'&&o>76)score-=16;
  if(min<12)score-=28;
  score+=(c.coach?.development||70)*.08;
  score+=(hashCode(`${p.id}-${c.id}`)%17)/10;
  return score;
}
function openLoanDialog(p,source){
  const options=state.world.clubs.filter(c=>c.id!==state.userClubId&&c.loanEligible!==false&&c.roster.length<16).map(c=>({c,min:projectedLoanMinutes(p,c),fit:loanFitScore(p,c)})).filter(x=>x.min>=8).sort((a,b)=>b.fit-a.fit).slice(0,10);
  const leagueName=c=>c.leagueName|| (c.leagueLevel==='PRIMERA_FEB'?'Primera FEB':c.leagueLevel==='ACB'?'Liga ACB':c.leagueLevel==='EUROLEAGUE'?'Euroliga':'Europa');
  const back=modal(`<div class="modal-head"><div><div class="eyebrow">Cesión</div><h2 style="margin:2px 0">${fullName(p)}</h2><div class="muted">OVR ${Math.round(BBGM.overall(p))} · ${positionText(p)}</div></div><button class="btn" data-close>Cerrar</button></div><p class="muted">Los destinos se ordenan por encaje real: competencia en su posición, nivel del club y minutos previstos. Normalmente un joven tendrá mejores opciones en equipos de menor nivel.</p><div class="loan-list">${options.map(x=>`<div class="staff-card"><div><b>${x.c.name}</b><div class="tiny muted">${leagueName(x.c)} · Nivel ${Math.round(cScore(x.c))} · Minutos previstos <b>${Math.round(x.min)}</b>/40</div></div><button class="btn small good" data-loan-club="${x.c.id}" data-loan-min="${Math.round(x.min)}">Ceder</button></div>`).join('')}</div>`);
  back.querySelector('[data-close]').onclick=()=>back.remove();back.querySelectorAll('[data-loan-club]').forEach(b=>b.onclick=()=>{startLoan(p,source,+b.dataset.loanClub,+b.dataset.loanMin);back.remove()});
}
function cScore(c){const top=c.roster.slice().sort((a,b)=>BBGM.overall(b)-BBGM.overall(a)).slice(0,8);return top.length?top.reduce((s,p)=>s+BBGM.overall(p),0)/top.length:60}
function startLoan(p,source,loanClubId,projectedMinutes=null){
  ensureAcademy();if(source==='B')state.academy.players=state.academy.players.filter(x=>x.id!==p.id);else userClub().roster=userClub().roster.filter(x=>x.id!==p.id);
  const dest=club(loanClubId),mins=projectedMinutes||projectedLoanMinutes(p,dest);
  const seasonEnd=(+state.season.slice(0,4)+1)+'-06-30';
  const l={id:state.academy.nextLoanId++,player:p,source,loanClubId,startDate:state.currentDate,endDate:seasonEnd,status:'ACTIVE',projectedMinutes:mins,stats:academyStatLine()};state.academy.loans.push(l);p.loaned=true;addInbox('LOAN','Cesión completada',`${fullName(p)} jugará cedido en ${dest.name}. El staff estima unos ${Math.round(mins)} minutos por partido.`);saveLocal(false);render();toast('Cesión completada');
}
function returnLoan(id,rerender=true){const l=state.academy.loans.find(x=>x.id===id);if(!l||l.status!=='ACTIVE')return;l.status='RETURNED';l.player.loaned=false;if(l.source==='B'){l.player.academy=true;state.academy.players.push(l.player)}else{l.player.academy=false;userClub().roster.push(l.player)}addInbox('LOAN','Fin de cesión',`${fullName(l.player)} ha regresado de su cesión en ${club(l.loanClubId).name}.`);if(rerender){saveLocal(false);render()}}

function upgradeState(s){
  state=s;
  // v0.8: ampliación del universo. Conserva tu partida y añade clubes/ligas que aún no existían.
  const freshWorld=BBGM.createWorld();
  if(!state.world)state.world=freshWorld;
  else{
    const currentIds=new Set((state.world.clubs||[]).map(c=>c.id));
    for(const fc of freshWorld.clubs)if(!currentIds.has(fc.id))state.world.clubs.push(fc);
    const templates=new Map(freshWorld.clubs.map(c=>[c.id,c]));
    for(const c of state.world.clubs){const t=templates.get(c.id);if(t){if(!c.leagueName)c.leagueName=t.leagueName;if(!c.homeNation)c.homeNation=t.homeNation;if(c.loanEligible==null)c.loanEligible=t.loanEligible}}
    state.world.leagues=[...new Set(state.world.clubs.map(c=>c.leagueName).filter(Boolean))].sort().map(name=>({name,clubIds:state.world.clubs.filter(c=>c.leagueName===name).map(c=>c.id)}));
    // Mantener las definiciones nuevas de competiciones, preservando el calendario ya jugado.
    state.world.competitions=freshWorld.competitions.map(c=>({...c}));
  }
  if(!state.world.competitions)state.world.competitions=freshWorld.competitions.map(c=>({...c}));
  if(!state.special)state.special={series:{},champions:{},copaCreated:false,acbPoCreated:false,elPostCreated:false};
  if(!state.special.series)state.special.series={};if(!state.special.champions)state.special.champions={};
  if(!state.board)state.board={confidence:72,objectives:[]};
  ensureClubProjects();
  const userProject=state.world.clubs.find(c=>c.id===state.userClubId);const userComps=(state.world.competitions||[]).filter(c=>c.clubIds?.includes(state.userClubId));const goals=state.board?.objectives||[];const invalidGoals=goals.some(o=>(o.id==='EL'&&!userComps.some(c=>c.id==='EL'))||(o.id==='ACB'&&!userComps.some(c=>c.id==='ACB')));const staleObjectiveModel=state.board?.objectiveModelVersion!==4;if(state.board&&(staleObjectiveModel||state.board.projectClubId!==state.userClubId||invalidGoals||!goals.some(o=>o.id==='LEAGUE'))){state.board.objectives=projectObjectives(userProject);state.board.projectClubId=state.userClubId;state.board.objectiveModelVersion=4;}
  if(!state.coachManagement)state.coachManagement={relationship:72};
  state.world.clubs.forEach(c=>{if(!c.coachMinuteRequests)c.coachMinuteRequests={}});
  if(!state.sponsorship)state.sponsorship={active:null,offers:createSponsorOffers(state.season),evaluatedSeason:null,lastBonus:0,brandReputation:60};
  if(!state.world.agents)state.world.agents=['Aleksandar Sports','Basque Hoops Agency','NorthStar Basketball','Mediterranean Players','Prime Court Management','Atlantic Sports Group','Balkan Elite','EuroHoops Representation'];
  if(!state.world.freeAgents)state.world.freeAgents=BBGM.createFreeAgents();
  state.world.clubs.forEach((c,ci)=>{
    c.roster.forEach((p,pi)=>ensurePlayerContractFields(p,ci*20+pi));
    const wb=BBGM.wageBill(c);
    if(c.salaryBudget==null)c.salaryBudget=Math.max(c.budget||0,Math.round(wb*1.07));
    if(c.cashBudget==null)c.cashBudget=Math.max(1200000,Math.round((c.budget||c.salaryBudget)*.25));
  });
  state.world.clubs.forEach(c=>{if(c.staffBudget==null)c.staffBudget=Math.round((1800000+(c.reputation||70)*22000)/50000)*50000;if(c.coach&&c.coach.salary==null)c.coach.salary=Math.round((450000+(c.reputation||70)*9000)/50000)*50000});
  state.world.freeAgents.forEach((p,i)=>ensurePlayerContractFields(p,500+i));
  if(!state.inbox)state.inbox=[];
  let maxId=0;
  state.inbox.forEach((e,i)=>{if(e.id==null)e.id=i+1;if(e.resolved==null)e.resolved=false;maxId=Math.max(maxId,e.id)});
  state.nextEventId=Math.max(state.nextEventId||0,maxId+1,100);
  if(!state.marketNews)state.marketNews=[];
  if(!state.manager)state.manager={name:'Director deportivo',reputation:52,negotiation:50,scouting:50,planning:55,staffManagement:50,development:55};
  if(!state.world.scoutStaff)state.world.scoutStaff=BBGM.createScoutStaff();
  if(!state.world.scoutMarket)state.world.scoutMarket=BBGM.createScoutMarket();
  if(!state.world.coachMarket)state.world.coachMarket=BBGM.createCoachMarket();
  state.world.clubs.forEach(c=>c.roster.forEach(p=>ensureScoutingFields(p,c.reputation)));
  state.world.freeAgents.forEach(p=>ensureScoutingFields(p,50));
  if(!state.scouting)state.scouting={staff:state.world.scoutStaff.map(x=>({...x})),assignments:[],knowledge:{},nextAssignmentId:1};
  if(!state.scouting.staff)state.scouting.staff=state.world.scoutStaff.map(x=>({...x}));
  state.scouting.staff.forEach((sc,i)=>{if(sc.salary==null)sc.salary=280000+i*25000});
  if(!state.scouting.assignments)state.scouting.assignments=[];if(!state.scouting.knowledge)state.scouting.knowledge={};
  state.scouting.nextAssignmentId=state.scouting.nextAssignmentId||Math.max(0,...state.scouting.assignments.map(a=>a.id||0))+1;
  ensureAcademy();
  state.version=APP_VERSION.code;
  ensureV12State();ensureV13State();ensureV14State();ensureV15State();ensureV16State();ensureV17State();ensureV19State();ensureV20State();ensureV46State();
  return state;
}

function newGame(selectedClubId=1){
  const world=BBGM.createWorld();
  const calendar=BBGM.buildCalendar(world.competitions.filter(c=>c.standings),'2026-09-25');
  calendar.push(...initialSupercopaMatches(2026));calendar.sort((a,b)=>a.date.localeCompare(b.date));
  state={
    version:APP_VERSION.code,saveName:`Carrera ${world.clubs.find(c=>c.id===selectedClubId)?.name||'Basketball GM'}`,season:'2026/27',currentDate:'2026-09-01',userClubId:selectedClubId,nextEventId:100,
    manager:{name:'Director deportivo',reputation:52,negotiation:50,scouting:50,planning:55,staffManagement:50,development:55},
    world,calendar,standings:{},history:[],marketNews:[],autosave:true,inbox:[],special:{series:{},champions:{},copaCreated:false,acbPoCreated:false,elPostCreated:false},board:{confidence:72,objectives:[],projectClubId:selectedClubId,objectiveModelVersion:4},coachManagement:{relationship:72},sponsorship:{active:null,offers:[],evaluatedSeason:null,lastBonus:0},offseason:{active:false,weeksRemaining:0},scouting:{staff:world.scoutStaff.map(x=>({...x})),assignments:[],knowledge:{},nextAssignmentId:1},academy:{players:BBGM.createYouthClass(selectedClubId,7,26092026),loans:[],bStats:{},lastBDate:'2026-09-01',lastDevelopmentMonth:'2026-09',nextLoanId:1},watchlist:[],marketDynamics:{rumors:[],agentOffers:[],lastPulseGame:0},planning:{priorityPosition:null},lockerRoom:{captainId:null,lastIncidentGame:0},medical:{doctor:{name:'Dr. Iñaki Salazar',diagnosis:82,recovery:80,prevention:77,salary:380000},injuryHistory:[],lastProcessedDate:'2026-09-01'},nba:{draftHistory:[],rights:{},lastDraftSeason:null,returns:[]},nationalTeams:{callups:[],history:[],lastSeason:null},playerCareerHistory:{},playerDevelopmentHistory:{}
  };
  ensureAcademy();
  ensureV12State();ensureV13State();ensureV14State();ensureV15State();ensureV16State();ensureV17State();ensureV19State();ensureV20State();ensureV46State();
  ensureClubProjects();
  state.board.objectives=projectObjectives(userClub());
  state.board.projectClubId=state.userClubId;
  state.board.objectiveModelVersion=4;
  activatePreseason('2026-09-01');
  world.clubs.forEach(c=>c.coachMinuteRequests={});
  state.sponsorship.offers=createSponsorOffers(state.season);
  for(const c of world.competitions.filter(c=>c.standings))state.standings[c.id]=Object.fromEntries(c.clubIds.map(id=>[id,{clubId:id,gp:0,w:0,l:0,pf:0,pa:0}]));
  addInbox('INFO',`Bienvenido a ${userClub().name}`,`La directiva presenta un proyecto ${userClub().careerProject?.name?.toLowerCase()||'deportivo'} y fija como prioridad ${state.board.objectives[0]?.label?.toLowerCase()||'competir en tu liga'}.`);
  addInbox('INFO','Data Pack real 2026/27','La partida comienza con identidades y plantillas reales. Ratings, potenciales, salarios y economía son estimaciones propias del juego.');
  addInbox('SCOUTING','Scouting disponible','Tienes tres ojeadores. Los jugadores externos muestran información parcial hasta que los investigues.');
  addInbox('TRAINING','Plan mensual pendiente','Puedes asignar un foco de entrenamiento a cada jugador desde Plantilla.');
  addInbox('SPONSOR','Decisión de patrocinio pendiente','Tienes cuatro propuestas de patrocinio con distinto fijo y variables. Revísalas desde Más → Patrocinadores.');
  addInbox('MEDICAL','Departamento médico disponible','Las lesiones ya afectan a disponibilidad y rendimiento. Puedes gestionarlas desde Más → Departamento médico.');
  addInbox('FINANCE','Economía avanzada activa','Los partidos generan ingresos y costes; el presupuesto del próximo año dependerá de resultados y salud financiera. Revísalo desde Más → Finanzas.');
  addInbox('INFO','Personalidad y agentes activos','Ambición, lealtad, adaptación, ego y relaciones con agentes ya pueden provocar decisiones y conflictos.');
  addInbox('NBA','NBA y Draft activos','Los jóvenes con suficiente proyección pueden ser seleccionados en el Draft al final de temporada.');
  addInbox('ACADEMY','Equipo B disponible',`La cantera comienza con ${state.academy.players.length} jóvenes. Puedes revisar potencial, estadísticas, promociones y cesiones.`);
  const expiring=userClub().roster.filter(p=>p.contractYears===1).length;
  if(expiring)addInbox('CONTRACT',`${expiring} contrato${expiring>1?'s':''} por revisar`,'Varios jugadores terminan contrato al final de la temporada. Revisa la pestaña Contratos del Mercado.');
  saveLocal(false);currentView='home';render();openV46Tutorial();
}

async function saveLocal(showToast=true){
  if(!state)return false;
  try{
    state.ui=state.ui||{};
    state.ui.lastView=currentView;
    await dbPut(state);
    // La marca permite identificar la carrera y el snapshot de emergencia protege cierres del móvil.
    try{localStorage.setItem(SAVE_KEY+'_marker',JSON.stringify({season:state.season,date:state.currentDate,clubId:state.userClubId,club:userClub()?.name||'',savedAt:Date.now(),version:state.version}))}catch(_e){}
    if(showToast)toast('Partida guardada');return true;
  }catch(e){
    console.warn('IndexedDB save failed',e);
    try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));if(showToast)toast('Partida guardada');return true}catch(e2){console.warn(e2);if(showToast)toast('No se pudo guardar: exporta una copia');return false}
  }
}

async function loadLocal(){
  try{
    let obj=null;
    try{obj=await dbGet()}catch(e){console.warn('IndexedDB load fallback',e)}
    if(!obj){
      let raw=localStorage.getItem(SAVE_KEY);if(!raw){for(const k of OLD_SAVE_KEYS){raw=localStorage.getItem(k);if(raw)break}}
      if(raw)obj=JSON.parse(raw);
    }
    if(!obj)return false;
    upgradeState(obj);await saveLocal(false);const validViews=['home','squad','market','academy','schedule','standings','stats','coach','sponsors','calendar','inbox','planning','locker','preseason','more','diagnostics'];currentView=validViews.includes(obj.ui?.lastView)?obj.ui.lastView:'home';render();return true;
  }catch(e){console.warn(e);return false}
}

function exportSave(){
  const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),a=document.createElement('a');
  a.href=URL.createObjectURL(blob);a.download=`${APP_VERSION.saveFormat}_save.json`;a.click();URL.revokeObjectURL(a.href);
}

function importSave(file){
  const r=new FileReader();
  r.onload=()=>{try{upgradeState(JSON.parse(r.result));saveLocal(false);currentView='home';render();toast('Partida importada')}catch(e){alert('El archivo no es una partida válida.')}};
  r.readAsText(file);
}

function nextUserMatch(){return state.calendar.find(m=>m.status==='SCHEDULED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId))}
function gamesBeforeOrAt(date){return state.calendar.filter(m=>m.status==='SCHEDULED'&&m.date<=date)}


/* v0.47: efectos jugables de táctica y staff. */
function staffMatchClubV47(m){return m.homeClubId===state.userClubId?club(m.homeClubId):m.awayClubId===state.userClubId?club(m.awayClubId):null}
function applyStaffMatchEffectsV47(m,res){
  const c=staffMatchClubV47(m);if(!c)return;
  const coach=c.coach||{},management=Number(coach.manManagement||65),development=Number(coach.development||65);
  const moraleDelta=BBGM.clamp((management-65)*.018,-.45,.55),confidenceDelta=BBGM.clamp((management-65)*.012,-.3,.35);
  const stats=m.homeClubId===state.userClubId?res.homeStats:res.awayStats;
  for(const st of stats||[]){const p=c.roster.find(x=>x.id===st.playerId);if(!p)continue;p.state.morale=BBGM.clamp((p.state.morale||70)+moraleDelta,0,100);p.state.confidence=BBGM.clamp((p.state.confidence||70)+confidenceDelta,0,100);if((p.age||99)<=23)p.state.developmentTrust=BBGM.clamp((p.state.developmentTrust||70)+(development-65)*.018,-0,100)}
  res.staffImpact={coachManagement:Math.round(management),development:Math.round(development),medicalPrevention:Math.round(state.medical?.doctor?.prevention||0),tactical:true};
}
function injuryRiskV47(p,mins,c){const base=injuryRisk(p,mins),doctor=c?.id===state.userClubId?Number(state.medical?.doctor?.prevention||70):70,coach=c?.coach?Number(c.coach.manManagement||65):65;return BBGM.clamp(base*(1-BBGM.clamp((doctor-65)*.0035+(coach-65)*.0015,-.18,.28)),.0005,.018)}

function simulateOne(m,show=false){
  const home=club(m.homeClubId),away=club(m.awayClubId);
  const seed=Number(String(Date.now()).slice(-9))+m.round+m.homeClubId*37+m.awayClubId*11;
  const res=BBGM.simulateMatch(home,away,seed);applyStaffMatchEffectsV47(m,res);applyMatchDecisionV48(m,res);
  m.status='PLAYED';m.homeScore=res.homeScore;m.awayScore=res.awayScore;m.overtimePeriods=res.overtimePeriods;m.result=res;
  updateStandings(m);
  updatePlayerState(home,res.homeStats,res.homeScore>res.awayScore);
  updatePlayerState(away,res.awayStats,res.awayScore>res.homeScore);
  maybeGenerateMatchInjuries(home,res.homeStats,m.date);maybeGenerateMatchInjuries(away,res.awayStats,m.date);
  tickCoachMinuteRequests(home);tickCoachMinuteRequests(away);
  state.history.push({matchId:m.id,date:m.date});
  processMatchEconomy(m);
  processSpecialAfterMatch(m);ensurePostseasonGenerated();if(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId){mentorEffectAfterUserMatch();evaluateAchievements(true);}
  return res;
}

function updateStandings(m){
  const s=state.standings[m.competitionId];if(!s)return;
  const h=s[m.homeClubId],a=s[m.awayClubId];if(!h||!a)return;
  h.gp++;a.gp++;h.pf+=m.homeScore;h.pa+=m.awayScore;a.pf+=m.awayScore;a.pa+=m.homeScore;
  if(m.homeScore>m.awayScore){h.w++;a.l++}else{a.w++;h.l++}
}

function updatePlayerState(c,stats,won){
  for(const p of c.roster){
    ensurePlayerContractFields(p,p.id);
    const bs=stats.find(x=>x.playerId===p.id),mins=bs?.minutes||0,expected=expectedRoleMinutes[p.role]||14;
    p.state.fatigue=BBGM.clamp((p.state.fatigue||0)+(bs?mins*.12:0)-3.2,0,75);
    p.state.fitness=BBGM.clamp(100-p.state.fatigue*.18,78,100);
    let roleDelta=0;
    if(mins<expected-7)roleDelta=-.9;else if(mins>expected+4)roleDelta=.45;
    p.state.roleSatisfaction=BBGM.clamp((p.state.roleSatisfaction??75)+roleDelta,5,100);
    p.state.morale=BBGM.clamp((p.state.morale??70)+(won?1.2:-.8)+(bs&&bs.points>=18?1:0)+roleDelta*.45,10,100);
    p.state.confidence=BBGM.clamp((p.state.confidence??70)+(won?.7:-.4)+(bs&&bs.points>=15?.7:0),20,100);
    p.state.form=BBGM.clamp((p.state.form??50)+(bs?(bs.points-8)*.10:0),20,90);
  }
}


function nextScoutingCompletion(){
  return state.scouting&&state.scouting.assignments.filter(a=>a.status==='ACTIVE').sort((a,b)=>a.endDate.localeCompare(b.endDate))[0]||null;
}
function advanceToNextEvent(){
  if(interruptForPendingDecision())return;
  ensureMatchDecisionStateV48();
  if(state.offseason?.active){advanceOffseasonWeek();return}if(state.preseason?.active){advancePreseasonWeek();return}
  const nm=nextUserMatch(),sa=nextScoutingCompletion();
  if(sa&&(!nm||sa.endDate<nm.date)){
    const target=sa.endDate;
    const due=state.calendar.filter(m=>m.status==='SCHEDULED'&&m.date<=target&&m.homeClubId!==state.userClubId&&m.awayClubId!==state.userClubId);
    for(const m of due)simulateOne(m,false);
    processAcademyTo(target);processScouting(target);processMedicalTo(target);state.currentDate=target;runAiMarketStep();runAiFrontOfficeV17();v20AiRenewalsAndPlanning();generateWorldNewsV20();maybeRecordWeeklySummary();if(state.autosave)saveLocal(false);render();toast('Nuevo informe de scouting disponible');return;
  }
  simulateToNextUserMatch();
}


/* v0.48: decisiones jugables en partidos decisivos. */
function ensureMatchDecisionStateV48(){
  if(!state)return;
  state.matchDecisionV48=state.matchDecisionV48||{pending:null,history:[]};
  state.matchDecisionV48.history=Array.isArray(state.matchDecisionV48.history)?state.matchDecisionV48.history:[];
}
function isDecisiveMatchV48(m){
  const text=`${m.competitionId||''} ${m.round||''} ${m.stage||''} ${comp(m.competitionId)?.name||''}`.toLowerCase();
  return /(final|semifinal|cuartos|quarter|playoff|play-in|promoc|copa)/.test(text);
}
function matchDecisionScenarioV48(m){
  const uc=userClub(),top=uc.roster.slice().sort((a,b)=>BBGM.overall(b)-BBGM.overall(a))[0],key=Math.abs(hashCode(`${state.season}-${m.id}-decision-v48`))%3;
  if(key===0)return {type:'STAR_FOULS',playerId:top?.id,title:'Tu estrella llega al tramo decisivo con cuatro faltas',text:`${top?fullName(top):'Tu jugador más importante'} tiene cuatro faltas y quedan los minutos decisivos. ¿Asumes el riesgo?`,choices:[{id:'KEEP',label:'Mantenerlo en pista',detail:'Más talento y anotación, pero puede cometer la quinta falta.'},{id:'BENCH',label:'Sentarlo unos minutos',detail:'Proteges al jugador, aunque pierdes impacto ofensivo.'}]};
  if(key===1)return {type:'LAST_DEFENSE',title:'Última defensa del partido',text:'El rival prepara la última posesión con el marcador apretado. Elige cómo proteger la ventaja.',choices:[{id:'MAN',label:'Defensa individual',detail:'Presiona al creador y protege mejor el tiro exterior.'},{id:'ZONE',label:'Defensa en zona',detail:'Protege la pintura, pero concede más opciones de pase.'},{id:'FOUL',label:'Hacer falta táctica',detail:'Evita el triple, pero envía al rival a los tiros libres.'}]};
  return {type:'LAST_SHOT',title:'Decisión para la última posesión',text:'Tienes una última posesión para cerrar el partido. Elige el tipo de lanzamiento.',choices:[{id:'THREE',label:'Buscar el triple',detail:'Puedes ganar el partido, pero el porcentaje de acierto es menor.'},{id:'TWO',label:'Atacar para dos',detail:'Opción más segura, aunque quizá no sea suficiente para ganar.'},{id:'STAR',label:'Jugar para la estrella',detail:'Concentra la responsabilidad en tu mejor jugador.'}]};
}
function matchDecisionClockV48(type){return type==='STAR_FOULS'?'3:00':type==='LAST_DEFENSE'?'0:18':'0:08'}
function matchDecisionLiveScoreV48(m){
  const home=club(m.homeClubId),away=club(m.awayClubId),rng=new BBGM.RNG(Math.abs(hashCode(state.season+'-live-score-'+m.id)));
  const h=58+Math.floor(rng.next()*24)+Math.round((BBGM.teamOverall(home)-BBGM.teamOverall(away))*.18),a=58+Math.floor(rng.next()*24);
  return {home:Math.max(0,h),away:Math.max(0,a)};
}
function showMatchDecisionResultV48(m,res,decision){
  const home=club(m.homeClubId),away=club(m.awayClubId),winner=res.homeScore===res.awayScore?'Empate':res.homeScore>res.awayScore?home.shortName:away.shortName;
  const back=modal('<div class="v48-match-result"><div class="modal-head"><div><div class="eyebrow">Resultado de la decisión</div><h2>'+decision.title+'</h2></div><button class="btn" data-close>Cerrar</button></div><div class="decision-result-score"><span>'+home.shortName+'</span><strong>'+res.homeScore+' - '+res.awayScore+'</strong><span>'+away.shortName+'</span></div><div class="decision-result-card"><b>'+decision.choiceLabel+'</b><p>'+decision.summary+'</p><p class="muted">La jugada se resolvió con '+decision.clock+' restantes. Resultado final: '+(winner==='Empate'?'empate':winner+' gana')+'.</p></div><div class="modal-actions"><button class="btn primary" data-close-bottom>Continuar</button></div></div>');
  back.querySelector('[data-close]').onclick=()=>back.remove();back.querySelector('[data-close-bottom]').onclick=()=>back.remove();
}
function maybeOpenMatchDecisionV48(m){
  ensureMatchDecisionStateV48();if(!isDecisiveMatchV48(m))return false;
  const d=state.matchDecisionV48;if(d.pending?.matchId===m.id)return false;
  if(d.history.some(x=>x.matchId===m.id))return false;
  const ev=matchDecisionScenarioV48(m),live=matchDecisionLiveScoreV48(m),back=modal(`<div class="v48-match-decision"><div class="modal-head"><div><div><div class="eyebrow">Decision Maker · Partido decisivo</div><h2>${ev.title}</h2></div><span class="pill urgent">Decisión obligatoria</span></div><div class="decision-live-panel" role="status"><div><small>Marcador actual</small><b>${club(m.homeClubId).shortName} ${live.home} - ${live.away} ${club(m.awayClubId).shortName}</b></div><div><small>Tiempo restante</small><strong>${matchDecisionClockV48(ev.type)}</strong></div></div><p class="decision-situation-text">${ev.text}</p><div class="v48-decision-choices">${ev.choices.map(c=>`<button class="v48-decision-choice" data-match-choice="${c.id}"><b>${c.label}</b><span>${c.detail}</span></button>`).join('')}</div><p class="tiny muted">La respuesta más favorable depende del contexto, los jugadores y una parte de azar. El resultado se aplicará al marcador.</p></div>`);
  back.querySelectorAll('[data-match-choice]').forEach(b=>b.onclick=()=>{const choice=ev.choices.find(c=>c.id===b.dataset.matchChoice);d.lastResult=null;d.pending={matchId:m.id,type:ev.type,choice:b.dataset.matchChoice,choiceLabel:choice?.label||b.dataset.matchChoice,title:ev.title,clock:matchDecisionClockV48(ev.type)};d.history.push({matchId:m.id,type:ev.type,choice:b.dataset.matchChoice,date:state.currentDate,clock:matchDecisionClockV48(ev.type)});saveLocal(false);back.remove();simulateToNextUserMatch();if(d.lastResult)showMatchDecisionResultV48(m,d.lastResult,d.lastResult.matchDecision)});
  return true;
}
function applyMatchDecisionV48(m,res){
  ensureMatchDecisionStateV48();const d=state.matchDecisionV48.pending;if(!d||d.matchId!==m.id)return;
  const userHome=m.homeClubId===state.userClubId,uc=userClub(),top=uc.roster.slice().sort((a,b)=>BBGM.overall(b)-BBGM.overall(a))[0],coach=uc.coach||{},quality=BBGM.clamp(((top?BBGM.overall(top):70)-70)*.008+((coach.manManagement||65)-65)*.004, -.12,.16),rng=new BBGM.RNG(Math.abs(hashCode(`${state.season}-${m.id}-decision-result-v48`))),success=rng.next()<BBGM.clamp(.52+quality,-.02,.92);
  const add=(points,opponent=0)=>{if(userHome){res.homeScore+=points;res.awayScore+=opponent}else{res.awayScore+=points;res.homeScore+=opponent}};
  let summary='';
  if(d.type==='STAR_FOULS'){if(d.choice==='KEEP'&&success){add(2);summary=`${top?fullName(top):'Tu estrella'} respondió y anotó la jugada decisiva.`}else if(d.choice==='KEEP'){add(0,2);summary=`${top?fullName(top):'Tu estrella'} cometió la quinta falta y el rival aprovechó el cambio.`}else if(success){summary='La segunda unidad defendió el resultado y el descanso protegió a tu estrella.'}else{add(2,0);summary='Faltó talento en la última posesión y el rival tomó la iniciativa.'}}
  else if(d.type==='LAST_DEFENSE'){if(d.choice==='MAN'&&success){add(0,-2);summary='La defensa individual negó la línea de pase y cerró el partido.'}else if(d.choice==='ZONE'&&success){add(0,-2);summary='La zona protegió la pintura y forzó un tiro incómodo.'}else if(d.choice==='FOUL'&&success){add(0,-1);summary='La falta táctica evitó el triple y el rival solo pudo sumar desde el tiro libre.'}else{add(0,3);summary='El rival encontró la respuesta y convirtió la última posesión.'}}
  else if(d.type==='LAST_SHOT'){const actor=top?fullName(top):'Tu jugador';if((d.choice==='THREE'&&success)||((d.choice==='TWO'||d.choice==='STAR')&&success)){add(d.choice==='THREE'?3:2);summary=d.choice==='THREE'?actor+' encontró un triple liberado y lo convirtió.':d.choice==='STAR'?actor+' recibió la responsabilidad en la última posesión y anotó.':actor+' atacó el aro, encontró espacio y anotó para tu equipo.'}else{summary=d.choice==='THREE'?actor+' intentó un triple liberado, pero falló y tu equipo perdió esa última posesión.':d.choice==='STAR'?actor+' asumió la responsabilidad, pero no encontró canasta.':'El ataque al aro no encontró canasta y el marcador se mantuvo.'}}
  const won=userHome?res.homeScore>res.awayScore:res.awayScore>res.homeScore;const tied=res.homeScore===res.awayScore;summary+=' '+(tied?'El partido terminó en empate.':won?'El equipo ganó el partido.':'El equipo perdió el partido.');const decisionResult={title:d.title,choice:d.choice,choiceLabel:d.choiceLabel||d.choice,summary,clock:d.clock||'0:08'};d.pending=null;d.history[d.history.length-1].summary=summary;d.history[d.history.length-1].result=decisionResult;res.matchDecision=decisionResult;d.lastResult=res;saveLocal(false);
}

function simulateToNextUserMatch(){
  if(interruptForPendingDecision())return;
  if(state.offseason?.active){advanceOffseasonWeek();return}if(state.preseason?.active){advancePreseasonWeek();return}
  let nm=nextUserMatch();if(!nm){if(progressWorldUntilUserMatch()){saveLocal(false);render();toast('Tu siguiente eliminatoria ya está preparada');return}endSeason();return}
  const prior=state.calendar.filter(m=>m.status==='SCHEDULED'&&m.date<nm.date);
  for(const m of prior)simulateOne(m,false);
  const sameDay=state.calendar.filter(m=>m.status==='SCHEDULED'&&m.date===nm.date&&m.id!==nm.id);
  for(const m of sameDay)simulateOne(m,false);
  if(maybeOpenMatchDecisionV48(nm))return;
  const res=simulateOne(nm,true);
  processAcademyTo(nm.date);processScouting(nm.date);processMedicalTo(nm.date);
  state.currentDate=nm.date;
  processDeferredConsequencesV21();
  addInbox('RESULT',`${club(nm.homeClubId).shortName} ${nm.homeScore}-${nm.awayScore} ${club(nm.awayClubId).shortName}`,`${comp(nm.competitionId).name} · ${typeof nm.round==='number'?'Jornada '+nm.round:nm.round}${res.matchDecision?.summary?' · '+res.matchDecision.summary:''}`,{matchId:nm.id});
  recordSeasonNarrativeV46(nm,res);
  maybeGenerateDecisionEvent();maybeGenerateLockerEvent();maybeGeneratePersonalityEvent();maybeGenerateYouthInterest();maybeGenerateContractDecisionV20();runAiMarketStep();runAiFrontOfficeV17();v20AiRenewalsAndPlanning();generateMarketPulse();generateWorldNewsV20();maybeRecordWeeklySummary();
  if(state.autosave)saveLocal(false);
  render();showResultModal(nm,res);
}

// ===== v0.44 career integration: deferred consequences, employment and club offers =====
function ensureCareerV21(){
  if(!state)return;
  state.careerV21=state.careerV21||{};
  const c=state.careerV21;
  c.deferred=Array.isArray(c.deferred)?c.deferred:[];
  c.offers=Array.isArray(c.offers)?c.offers:[];
  c.history=Array.isArray(c.history)?c.history:[];
  c.status=c.status||'ACTIVE';
  c.badSeasons=Number.isFinite(c.badSeasons)?c.badSeasons:0;
  c.lastEvaluationSeason=c.lastEvaluationSeason||null;
  return c;
}
function careerPlayedCountV21(){return userGamesPlayedV20()}
function scheduleDeferredV21(type,dueGame,payload={}){
  const c=ensureCareerV21();if(!c)return null;
  const item={id:`DF-${state.season}-${state.nextEventId++}`,type,dueGame,payload,createdDate:state.currentDate,resolved:false};
  c.deferred.push(item);return item;
}
function scheduleDecisionFollowUpV21(ev,ch){
  const effect=ch?.effect;if(!effect)return;
  const due=careerPlayedCountV21()+5;
  if(['TALK_COACH_MORE','TALK_COACH_REST','PLAYER_CAPTAIN','LOCKER_CAPTAIN','LOCKER_MEDIATE'].includes(effect)){
    scheduleDeferredV21('DECISION_FOLLOW_UP',due,{eventTitle:ev.title,effect,playerId:ev.playerId,otherPlayerId:ev.otherPlayerId});
  }else if(['BOARD_YOUTH','BOARD_RESULTS','FIN_WAGES','FIN_SCOUT','FIN_STABLE'].includes(effect)){
    scheduleDeferredV21('BOARD_FOLLOW_UP',due,{eventTitle:ev.title,effect});
  }else if(['PERS_PROMISE_WIN','PERS_ROLE_HOLD','PERS_NO_PROMISE','PERS_EXIT_MARKET'].includes(effect)){
    scheduleDeferredV21('PLAYER_FOLLOW_UP',due,{eventTitle:ev.title,effect,playerId:ev.playerId});
  }
}
function processDeferredConsequencesV21(){
  const c=ensureCareerV21();if(!c)return;
  const played=careerPlayedCountV21();
  for(const item of c.deferred.filter(x=>!x.resolved&&x.dueGame<=played)){
    const p=item.payload||{};
    if(item.type==='DECISION_FOLLOW_UP'){
      const player=p.playerId?playerLocation(p.playerId)?.player:null;
      const other=p.otherPlayerId?playerLocation(p.otherPlayerId)?.player:null;
      if(p.effect==='TALK_COACH_MORE'&&player){player.state.morale=BBGM.clamp((player.state.morale||70)+1.5,0,100);addInbox('COACH','Seguimiento de la petición de minutos',`${fullName(player)} ha mantenido la mejora de minutos durante el periodo acordado. Su satisfacción sube ligeramente.` ,{playerId:player.id});}
      else if(['PLAYER_CAPTAIN','LOCKER_CAPTAIN','LOCKER_MEDIATE'].includes(p.effect)){const harmony=lockerRoomMetrics().harmony;if(player)player.state.morale=BBGM.clamp((player.state.morale||70)+(harmony>=65?1:-1),0,100);if(other)other.state.morale=BBGM.clamp((other.state.morale||70)+(harmony>=65?1:-1),0,100);addInbox('LOCKER','Efecto diferido de una mediación',harmony>=65?'La situación se ha estabilizado y el vestuario mantiene una armonía saludable.':'La tensión no ha desaparecido por completo; conviene vigilar la relación y la moral.');}
      else if(p.effect==='TALK_COACH_REST'&&player){player.state.fatigue=BBGM.clamp((player.state.fatigue||0)-3,0,75);addInbox('COACH','Seguimiento del descanso','La reducción de carga ha ayudado a recuperar físicamente al jugador.',{playerId:player.id});}
    }else if(item.type==='BOARD_FOLLOW_UP'){
      const ok=financialBoardState().ok,delta=ok?1:-2;state.board.confidence=BBGM.clamp((state.board.confidence||70)+delta,0,100);addInbox('BOARD','La directiva revisa tu decisión',ok?'La medida ha dado resultados y la confianza mejora ligeramente.':'La directiva considera que la medida todavía no ha dado el resultado esperado y reduce ligeramente su confianza.');
    }else if(item.type==='PLAYER_FOLLOW_UP'&&p.playerId){
      const player=playerLocation(p.playerId)?.player;if(player){const stable=(player.state?.morale||70)>=60;addInbox('PLAYER_UNHAPPY','Seguimiento de la situación del jugador',stable?`${fullName(player)} mantiene una actitud profesional tras la conversación.`:`${fullName(player)} sigue intranquilo y podría pedir una salida si la situación no mejora.`,{playerId:player.id});if(!stable)player.state.roleSatisfaction=BBGM.clamp((player.state.roleSatisfaction||70)-2,0,100)}}
    item.resolved=true;item.resolvedDate=state.currentDate;
  }
  c.deferred=c.deferred.filter(x=>!x.resolved||x.resolvedDate===state.currentDate);
}
function careerOfferCandidatesV21(){
  const rep=state.manager?.reputation||50,uc=userClub();
  return state.world.clubs.filter(c=>c.id!==uc.id&&c.leagueLevel!=='NBA').map(c=>({club:c,score:(c.reputation||50)-Math.abs((c.reputation||50)-rep)*.55+(c.id%7)})).filter(x=>x.score>=rep-18).sort((a,b)=>b.score-a.score).slice(0,3).map(x=>x.club);
}
function generateCareerOffersV21(){
  const c=ensureCareerV21();if(!c||c.offers.some(x=>x.status==='PENDING'))return c?.offers||[];
  const uc=userClub(),offers=careerOfferCandidatesV21().map((clubObj,i)=>({id:`JOB-${state.season}-${clubObj.id}`,clubId:clubObj.id,status:'PENDING',season:state.season,role:'Director deportivo',objective:clubObj.careerProject?.name||'Construir un proyecto competitivo',salaryBudget:clubObj.salaryBudget||0,confidence:Math.round(58+i*7),deadline:state.currentDate}));
  c.offers=offers;return offers;
}
function evaluateCareerV21(){
  const c=ensureCareerV21();if(!c||c.lastEvaluationSeason===state.season)return;
  const objective=projectObjectives(userClub()).find(x=>x.id==='LEAGUE'),league=objective?.leagueId?sortedStandings(objective.leagueId):sortedStandings('ACB'),position=league.findIndex(x=>x.clubId===state.userClubId)+1,confidence=Math.round(state.board?.confidence||70),success=position>0&&position<=objective.target;
  if(success)c.badSeasons=0;else c.badSeasons++;
  const rating=BBGM.clamp(Math.round((success?72:48)+(confidence-60)*.35+(financialBoardState().ok?8:-8)),0,100),repDelta=success?2:-2;
  state.manager.reputation=BBGM.clamp((state.manager.reputation||50)+repDelta,0,100);
  c.history.unshift({season:state.season,clubId:state.userClubId,position,target:objective.target,confidence,rating,success});c.history=c.history.slice(0,20);c.lastEvaluationSeason=state.season;
  if(confidence<20&&c.badSeasons>=2){c.status='DISMISSED';addInbox('BOARD','La directiva termina tu etapa','Has sido despedido como director deportivo. Revisa las ofertas disponibles para continuar tu carrera en otro club.');}
  else if(confidence<30&&c.badSeasons>=2){c.status='AT_RISK';addInbox('BOARD','Tu puesto está en riesgo','La directiva considera insuficientes los resultados de las últimas temporadas. Una mala temporada más podría terminar tu etapa en el club.');}
  else c.status='ACTIVE';
  if(success||c.status!=='ACTIVE')generateCareerOffersV21();
}
function acceptCareerOfferV21(offerId){
  const c=ensureCareerV21(),offer=c.offers.find(x=>x.id===offerId),next=offer?club(offer.clubId):null;if(!offer||!next||offer.status!=='PENDING')return false;
  const previous=userClub();offer.status='ACCEPTED';c.offers.filter(x=>x.status==='PENDING').forEach(x=>x.status='DECLINED');state.userClubId=next.id;state.saveName=`Carrera ${next.name}`;state.board={...(state.board||{}),confidence:offer.confidence,objectives:projectObjectives(next),projectClubId:next.id};state.manager.reputation=BBGM.clamp((state.manager.reputation||50)+Math.round((next.reputation-previous.reputation)*.06),0,100);c.status='ACTIVE';addInbox('SEASON','Nuevo proyecto',`Has dejado ${previous.name} para convertirte en director deportivo de ${next.name}. Sus objetivos y presupuesto se aplicarán en la próxima temporada.`);saveLocal(false);return true;
}
function rejectCareerOfferV21(offerId){const offer=ensureCareerV21().offers.find(x=>x.id===offerId);if(offer)offer.status='DECLINED';saveLocal(false);return !!offer}

function simulateToDate(target){
  if(interruptForPendingDecision())return;
  const due=gamesBeforeOrAt(target);for(const m of due)simulateOne(m,false);processAcademyTo(target);processScouting(target);processMedicalTo(target);state.currentDate=target;runAiMarketStep();runAiFrontOfficeV17();v20AiRenewalsAndPlanning();generateWorldNewsV20();maybeRecordWeeklySummary();if(state.autosave)saveLocal(false);render();
}

function endSeason(){
  if(state.seasonComplete){showEndSeasonModal();return}
  evaluateSponsorBonuses();processSeasonEconomy();recordSeasonPlayerHistory();prepareDraftDeclarations();
  const acb=sortedStandings('ACB'),el=sortedStandings('EL');
  state.seasonComplete=true;state.seasonSummaries=state.seasonSummaries||[];
  state.seasonSummaries.push({season:state.season,acbChampion:state.special?.champions?.ACB_PO||acb[0]?.clubId,elChampion:state.special?.champions?.EL_F4||el[0]?.clubId,copaChampion:state.special?.champions?.COPA||null,supercopaChampion:state.special?.champions?.SUPERCOPA||null,userAcb:acb.findIndex(x=>x.clubId===state.userClubId)+1,userEl:el.findIndex(x=>x.clubId===state.userClubId)+1});
  const pa=acb.findIndex(x=>x.clubId===state.userClubId)+1,pe=el.findIndex(x=>x.clubId===state.userClubId)+1;let bd=(pa<=6?4:pa<=10?0:-5)+(pe<=10?4:pe<=14?0:-5);if(state.special?.champions?.COPA===state.userClubId)bd+=8;if(state.special?.champions?.ACB_PO===state.userClubId||state.special?.champions?.EL_F4===state.userClubId)bd+=12;bd+=(financialBoardState().ok?3:-5);state.board.confidence=BBGM.clamp((state.board.confidence||70)+bd,0,100);const league=(state.world.competitions||[]).find(x=>x.standings&&x.clubIds?.includes(state.userClubId));const rows=league?sortedStandings(league.id):[];evolveAllClubProjects();state.board.objectives=projectObjectives(userClub());archiveCurrentSeason();
  evaluateCareerV21();evaluateAchievements(true);addInbox('SEASON','Temporada completada',`Fin de ${state.season}. ACB: ${pa}.º · Euroliga: ${pe}.º · Confianza directiva: ${Math.round(state.board.confidence)}/100.`);
  saveLocal(false);render();showEndSeasonModal();
}
function showEndSeasonModal(){
  ensureCareerV21();
  const acb=sortedStandings('ACB'),el=sortedStandings('EL'),userA=acb.findIndex(x=>x.clubId===state.userClubId)+1,userE=el.findIndex(x=>x.clubId===state.userClubId)+1;
  const back=modal(`<div class="modal-head"><div><div class="eyebrow">Final de temporada</div><h2 style="margin:2px 0">${state.season}</h2></div><button class="btn" data-close>Cerrar</button></div><div class="grid two"><div class="card inner-card"><h3>Tu temporada</h3><div class="stat-row"><span>Liga ACB</span><b>${userA}.º</b></div><div class="stat-row"><span>Euroliga</span><b>${userE}.º</b></div><div class="stat-row"><span>Salud financiera</span><b>${Math.round(userClub().financialHealth||65)}/100</b></div><div class="stat-row"><span>Caja final</span><b>${fmtMoney(userClub().cashBudget)}</b></div></div><div class="card inner-card"><h3>Campeones</h3><div class="stat-row"><span>Liga ACB</span><b>${club(state.special?.champions?.ACB_PO||acb[0]?.clubId)?.name||'—'}</b></div><div class="stat-row"><span>Euroliga</span><b>${club(state.special?.champions?.EL_F4||el[0]?.clubId)?.name||'—'}</b></div><div class="stat-row"><span>Copa</span><b>${club(state.special?.champions?.COPA)?.name||'—'}</b></div></div></div><div class="card inner-card" style="margin-top:14px"><div class="eyebrow">Evaluación de directiva</div><h3>${state.board.confidence>=80?'Temporada sobresaliente':state.board.confidence>=65?'Balance positivo':state.board.confidence>=50?'Objetivos parcialmente cumplidos':'Temporada decepcionante'}</h3><div class="stat-row"><span>Confianza</span><b>${Math.round(state.board.confidence)}/100</b></div><div class="stat-row"><span>Armonía vestuario</span><b>${Math.round(lockerRoomMetrics().harmony)}/100</b></div><div class="stat-row"><span>Salud financiera</span><b>${Math.round(userClub().financialHealth||65)}/100</b></div><div class="stat-row"><span>Principal necesidad</span><b>${positionLabel[allSquadNeeds()[0].pos]}</b></div></div><p class="muted" style="margin-top:15px">La transición hará envejecer a los jugadores, descontará un año de contrato, liberará contratos vencidos, procesará algunas retiradas y generará una nueva hornada de cantera.</p><div class="modal-actions"><button class="btn primary" id="nextSeason">Comenzar siguiente temporada</button></div>`);
  const offers=(state.careerV21?.offers||[]).filter(x=>x.status==='PENDING');
  if(offers.length){const host=back.querySelector('.modal-actions');const box=document.createElement('div');box.className='card inner-card';box.style.marginTop='14px';box.innerHTML=`<div class="eyebrow">Mercado de directores deportivos</div><h3>Ofertas para continuar tu carrera</h3>${offers.map(o=>{const c=club(o.clubId);return `<div class="stat-row"><span><b>${c?.name||'Club'}</b><small>${o.objective} · Confianza inicial ${o.confidence}/100</small></span><span><button class="btn small good" data-career-accept="${o.id}">Aceptar</button> <button class="btn small" data-career-reject="${o.id}">Rechazar</button></span></div>`}).join('')}`;host.before(box);box.querySelectorAll('[data-career-accept]').forEach(b=>b.onclick=()=>{acceptCareerOfferV21(b.dataset.careerAccept);back.remove();showEndSeasonModal()});box.querySelectorAll('[data-career-reject]').forEach(b=>b.onclick=()=>{rejectCareerOfferV21(b.dataset.careerReject);b.closest('.stat-row')?.remove();});}
  back.querySelector('[data-close]').onclick=()=>back.remove();back.querySelector('#nextSeason').onclick=()=>{back.remove();startNextSeason()};
}
function maxPlayerId(){let mx=0;for(const c of state.world.clubs)for(const p of c.roster)mx=Math.max(mx,p.id);for(const p of state.world.freeAgents||[])mx=Math.max(mx,p.id);for(const p of state.academy?.players||[])mx=Math.max(mx,p.id);for(const l of state.academy?.loans||[])mx=Math.max(mx,l.player?.id||0);return mx}
function startNextSeason(){
  ensureAcademy();ensureV13State();ensureV15State();ensureV19State();recordBalanceSnapshotV19('fin '+state.season);const financeSnapshot={season:state.economy.season,startCash:state.economy.seasonStartCash,endCash:userClub().cashBudget,financialHealth:userClub().financialHealth,totals:financeTotals()};rolloverClubEconomies();processNbaDraft();processNbaReturns();for(const l of state.academy.loans.filter(x=>x.status==='ACTIVE'))returnLoan(l.id,false);
  const rng=new BBGM.RNG(hashCode(`${state.season}-rollover`)),free=state.world.freeAgents||[];
  for(const c of state.world.clubs){
    const keep=[];for(const p of c.roster){ensurePlayerContractFields(p,p.id);p.age=(p.age||25)+1;p._agedThisRollover=true;applyAnnualPlayerCurveV19(p,c,rng);p.contractYears=Math.max(0,(p.contractYears||1)-1);const retire=p.age>=37&&(rng.next()<Math.min(.8,.10+(p.age-36)*.16));if(retire)continue;if(p.contractYears<=0){p.freeAgent=true;p.releaseClause=null;free.push(p)}else{p.state.morale=BBGM.clamp(62+rng.gaussian()*8,35,88);p.state.fatigue=0;p.state.fitness=98;p.state.teamAdaptation=BBGM.clamp((p.state.teamAdaptation||70)+7,40,95);keep.push(p)}}c.roster=keep;
  }
  for(const p of free){p.age=(p.age||25)+(p._agedThisRollover?0:1);if(!p._agedThisRollover)applyAnnualPlayerCurveV19(p,null,rng);if(p.contractYears>0)p.contractYears=0;delete p._agedThisRollover}
  state.world.freeAgents=free.filter(p=>!(p.age>=38&&rng.next()<.35));
  // La IA rellena plantillas muy cortas con agentes libres asequibles.
  for(const c of state.world.clubs.filter(x=>x.id!==state.userClubId)){while(c.roster.length<(c.leagueLevel==='NBA'?14:10)){const room=c.salaryBudget-BBGM.wageBill(c),opts=state.world.freeAgents.filter(p=>BBGM.salaryExpectation(p,c.reputation)<=room).sort((a,b)=>aiFitScore(c,b)-aiFitScore(c,a));if(!opts.length)break;const p=opts[0];p.salary=BBGM.salaryExpectation(p,c.reputation);p.contractYears=2;p.role=BBGM.desiredRole(p);p.promisedRole=p.role;p.freeAgent=false;c.roster.push(p);state.world.freeAgents=state.world.freeAgents.filter(x=>x.id!==p.id)}}
  for(const c of state.world.clubs.filter(x=>x.id!==state.userClubId))ensureRosterBalanceV19(c);
  // Cantera: edad, salida a los 23 y nueva hornada de 4-8 jugadores.
  const retained=[];for(const p of state.academy.players){p.age++;if(p.age>22){p.academy=false;p.freeAgent=true;p.contractYears=0;state.world.freeAgents.push(p)}else retained.push(p)}state.academy.players=retained;state.academy.bStats={};
  const nextStart=+state.season.slice(0,4)+1,nextName=`${nextStart}/${String(nextStart+1).slice(-2)}`,count=4+Math.floor(rng.next()*5),newYouth=BBGM.createYouthClass(state.userClubId,count,hashCode(nextName));let nid=maxPlayerId()+1;for(const p of newYouth){p.id=nid++;ensurePlayerV13(p,userClub());state.academy.players.push(p)}state.academy.intakeHistory.push({season:nextName,count,avgPotential:+(newYouth.reduce((n,p)=>n+(p.potentialReal||0),0)/Math.max(1,newYouth.length)).toFixed(1),bestPotential:Math.max(...newYouth.map(p=>p.potentialReal||0))});for(const c of state.world.clubs.filter(x=>x.id!==state.userClubId&&x.leagueLevel!=='NBA')){if(rng.next()<.52&&c.roster.length<16){const y=BBGM.createYouthClass(c.id,1,hashCode(`${nextName}-${c.id}-ai-youth`),c.homeNation)[0];y.id=nid++;ensurePlayerV13(y,c);y.academy=false;y.salary=Math.max(80000,y.salary);y.contractYears=3;y.role='DEVELOPMENT';y.promisedRole='DEVELOPMENT';c.roster.push(y)}}
  state.economy.history=state.economy.history||[];state.economy.history.push(financeSnapshot);
  state.season=nextName;state.currentDate=`${nextStart}-07-01`;const brandRep=state.sponsorship?.brandReputation??60;state.sponsorship={active:null,offers:[],evaluatedSeason:null,lastBonus:0,brandReputation:brandRep};state.economy.season=nextName;state.economy.seasonStartCash=userClub().cashBudget;state.economy.entries=[];state.economy.processedMatches={};state.economy.prizeProcessedSeason=null;state.calendar=BBGM.buildCalendar(state.world.competitions.filter(c=>c.standings),`${nextStart}-09-25`);state.standings={};for(const c of state.world.competitions.filter(c=>c.standings))state.standings[c.id]=Object.fromEntries(c.clubIds.map(id=>[id,{clubId:id,gp:0,w:0,l:0,pf:0,pa:0}]));state.history=[];state.seasonComplete=false;state.special={series:{},champions:{},copaCreated:false,acbPoCreated:false,elPostCreated:false};addFutureSupercopa(nextStart);state.offseason={active:true,weeksRemaining:4};state.preseason={active:false,weeksRemaining:0,focus:'BALANCED',friendlies:[],season:state.season};state.academy.lastBDate=state.currentDate;state.medical.lastProcessedDate=state.currentDate;state.academy.lastDevelopmentMonth=state.currentDate.slice(0,7);state.scouting.assignments=state.scouting.assignments.filter(a=>a.status!=='ACTIVE');state.world.clubs.forEach(c=>c.coachMinuteRequests={});state.coachManagement.relationship=BBGM.clamp((state.coachManagement?.relationship??72)+1,35,95);state.coachManagement.squadRequest=null;state.coachManagement.interventions={month:state.currentDate.slice(0,7),count:0};state.marketDynamics={rumors:[],agentOffers:[],lastPulseGame:0};state.lockerRoom.lastIncidentGame=0;state.lockerRoom.lastPersonalityGame=0;state.sponsorship.offers=createSponsorOffers(state.season);processNationalTeamSummer();
  addInbox('SPONSOR','Nuevas ofertas de patrocinio',`Ya puedes elegir patrocinador para ${state.season}.`);
  addInbox('SEASON','Mercado de verano',`Comienza la preparación de ${state.season}. Han llegado ${count} nuevos jugadores a la cantera. Tienes cuatro semanas de mercado antes de septiembre.`);saveLocal(false);currentView='home';render();toast(`Mercado de verano ${state.season}`);
}


function sortedStandings(id){return Object.values(state.standings[id]||{}).sort((a,b)=>b.w-a.w||(b.pf-b.pa)-(a.pf-a.pa)||b.pf-a.pf)}
function standingsMini(id,limit=8){return `<div class="rank-list">${sortedStandings(id).slice(0,limit).map((r,i)=>`<div class="rank-item ${r.clubId===state.userClubId?'user':''}"><b>${i+1}</b><span>${club(r.clubId).shortName}</span><span>${r.w}-${r.l}</span><span>${r.pf-r.pa>0?'+':''}${r.pf-r.pa}</span></div>`).join('')}</div>`}

function runAiMarketStep(){
  const rng=new BBGM.RNG(Date.now()+state.history.length*991);
  const uc=userClub();

  if(rng.next()<.42){
    const existing=state.inbox.some(e=>!e.resolved&&e.type==='TRANSFER_OFFER');
    if(!existing&&uc.roster.length>9){
      const candidates=uc.roster.filter(p=>(p.contractYears||0)>0&&BBGM.overall(p)>=70);
      if(candidates.length){
        const weighted=candidates.slice().sort((a,b)=>(b.transferListed?10:0)+BBGM.marketValue(b)-(a.transferListed?10:0)-BBGM.marketValue(a));
        const p=weighted[Math.floor(rng.next()*Math.min(6,weighted.length))];
        const value=BBGM.marketValue(p),ranked=BBGM.marketAI?.rankBuyers(state.world.clubs,p,{excludeClubIds:[uc.id],type:'TRANSFER',value})||state.world.clubs.filter(c=>c.id!==uc.id&&c.cashBudget>value*.75&&(c.salaryBudget-BBGM.wageBill(c))>p.salary*1.08).sort((a,b)=>aiFitScore(b,p)-aiFitScore(a,p)).map(club=>({club}));
        if(ranked.length){
          const buyer=ranked[Math.floor(rng.next()*Math.min(4,ranked.length))].club,offer=BBGM.marketAI?.createOffer(p,buyer,{type:'TRANSFER',value,listed:p.transferListed,rng}),fee=offer?.fee||Math.round(value*((p.transferListed?1.02:.90)+rng.next()*.32)/50000)*50000;
          addInbox('TRANSFER_OFFER',`Oferta por ${fullName(p)}`,`${buyer.name} ofrece ${fmtMoney(fee)} por el jugador.`,{playerId:p.id,fromClubId:buyer.id,fee});
        }
      }
    }
  }

  if(rng.next()<.30&&(state.world.freeAgents||[]).length){
    const aiClubs=state.world.clubs.filter(c=>c.id!==uc.id&&c.roster.length<14);
    if(aiClubs.length){
      const c=rng.pick(aiClubs),room=c.salaryBudget-BBGM.wageBill(c);
      const options=state.world.freeAgents.filter(p=>BBGM.salaryExpectation(p,c.reputation)<=room).sort((a,b)=>aiFitScore(c,b)-aiFitScore(c,a));
      if(options.length){
        const p=options[Math.floor(rng.next()*Math.min(4,options.length))];
        p.salary=BBGM.salaryExpectation(p,c.reputation);p.contractYears=2;p.role=BBGM.desiredRole(p);p.releaseClause=Math.round(p.salary*3/50000)*50000;p.freeAgent=false;p.state.teamAdaptation=50;
        state.world.freeAgents=state.world.freeAgents.filter(x=>x.id!==p.id);c.roster.push(p);
        const news=`${c.name} ficha a ${fullName(p)} como agente libre.`;state.marketNews.unshift({date:state.currentDate,text:news});
      }
    }
  }

  if(rng.next()<.16){
    const sellers=state.world.clubs.filter(c=>c.id!==uc.id&&c.leagueLevel!=='NBA'&&c.roster.length>=12);if(sellers.length){const seller=rng.pick(sellers);const surplus=seller.roster.slice().sort((a,b)=>aiFitScore(seller,a)-aiFitScore(seller,b))[0];if(surplus){const value=BBGM.marketValue(surplus),ranked=BBGM.marketAI?.rankBuyers(state.world.clubs,surplus,{excludeClubIds:[uc.id,seller.id],type:'TRANSFER',value})||state.world.clubs.filter(c=>c.id!==uc.id&&c.id!==seller.id&&c.leagueLevel!=='NBA'&&c.cashBudget>value*.7&&(c.salaryBudget-BBGM.wageBill(c))>surplus.salary).sort((a,b)=>aiFitScore(b,surplus)-aiFitScore(a,surplus)).map(club=>({club}));const buyer=ranked[0]?.club;if(buyer&&aiFitScore(buyer,surplus)>aiFitScore(seller,surplus)+8){const fee=BBGM.marketAI?.createOffer(surplus,buyer,{type:'TRANSFER',value,listed:true,rng}).fee||Math.round(value*(.78+rng.next()*.22)/50000)*50000;seller.roster=seller.roster.filter(x=>x.id!==surplus.id);buyer.roster.push(surplus);seller.cashBudget+=fee;buyer.cashBudget-=fee;surplus.state.teamAdaptation=48;state.marketNews.unshift({date:state.currentDate,text:`${buyer.name} ficha a ${fullName(surplus)} desde ${seller.name} por ${fmtMoney(fee)}.`})}}}
  }
}

function acceptIncomingOffer(id){
  const ev=state.inbox.find(e=>e.id===id);if(!ev||ev.resolved)return;
  const uc=userClub(),buyer=club(ev.fromClubId),p=uc.roster.find(x=>x.id===ev.playerId);
  if(!p){ev.resolved=true;render();return}
  if(uc.roster.length<=8){toast('Necesitas mantener al menos 8 jugadores');return}
  if(buyer.cashBudget<ev.fee){ev.resolved=true;toast('El club retiró la oferta');render();return}
  uc.roster=uc.roster.filter(x=>x.id!==p.id);buyer.roster.push(p);financeEntry(uc,'INCOME','TRANSFER_IN',ev.fee,`Venta de ${fullName(p)} a ${buyer.name}`);buyer.cashBudget-=ev.fee;
  p.salary=Math.round(p.salary*1.08/50000)*50000;p.contractYears=Math.max(2,p.contractYears);p.role=BBGM.desiredRole(p);p.transferListed=false;p.state.teamAdaptation=48;
  ev.resolved=true;ev.decision='ACCEPTED';state.marketNews.unshift({date:state.currentDate,text:`${fullName(p)} deja ${uc.name} y ficha por ${buyer.name} por ${fmtMoney(ev.fee)}.`});
  addInbox('INFO','Traspaso completado',`${fullName(p)} ha fichado por ${buyer.name}. Ingresas ${fmtMoney(ev.fee)}.`);
  saveLocal(false);render();toast('Oferta aceptada');
}

function rejectIncomingOffer(id){const ev=state.inbox.find(e=>e.id===id);if(!ev)return;ev.resolved=true;ev.decision='REJECTED';saveLocal(false);render();toast('Oferta rechazada')}

function navButton(view,label,icon){return `<button data-view="${view}" class="${currentView===view?'active':''}" aria-label="${label}"><span class="nav-icon" aria-hidden="true">${icon}</span><span class="nav-label">${label}</span></button>`}

// ===== v0.46: onboarding, tácticas explicadas, staff y narrativa =====
function ensureV46State(){
  if(!state)return;
  state.ui=state.ui||{theme:'dark'};
  state.ui.tutorialV46=!!state.ui.tutorialV46;
  state.careerV46=state.careerV46||{};
  state.careerV46.story=Array.isArray(state.careerV46.story)?state.careerV46.story:[];
  state.careerV46.lastStoryGame=Number.isFinite(state.careerV46.lastStoryGame)?state.careerV46.lastStoryGame:0;
  state.lockerRoom=state.lockerRoom||{};
  state.lockerRoom.groups=Array.isArray(state.lockerRoom.groups)?state.lockerRoom.groups:[];
}
function tacticalGuidanceV46(c){
  const s=c.style||{},high=x=>x>57,low=x=>x<43;
  const items=[
    high(s.pace)?['Ritmo alto','Más posesiones y puntos · aumenta el cansancio','warning']:low(s.pace)?['Ritmo bajo','Reduce el desgaste · puede bajar la producción ofensiva','positive']:['Ritmo equilibrado','Compromiso estable entre rendimiento y desgaste','positive'],
    high(s.perimeterFocus)?['Ataque exterior','Más triples y espacios · dependes más del acierto','positive']:low(s.perimeterFocus)?['Ataque interior','Más presencia cerca del aro · exige fortaleza física','positive']:['Ataque equilibrado','Reparte el riesgo entre juego interior y exterior','positive'],
    high(s.pressure)?['Presión alta','Más recuperaciones · más fatiga y riesgo de faltas','warning']:low(s.pressure)?['Presión baja','Protege la energía · concedes más iniciativa al rival','positive']:['Presión normal','Defensa estable sin coste extraordinario','positive'],
    high(s.offensiveReboundEmphasis)?['Rebote agresivo','Más segundas opciones · peor balance defensivo','warning']:['Rebote conservador','Mejor transición defensiva · menos segundas jugadas','positive']
  ];
  return `<div class="v46-tactical-impact" id="v46TacticalImpact"><h4>Impacto previsto del estilo</h4><div class="v46-impact-grid">${items.map(x=>`<div><b class="v46-${x[2]}">${x[0]}</b><span>${x[1]}</span></div>`).join('')}</div></div>`;
}
function staffImpactV46(){
  const c=userClub(),coach=c.coach||{},sc=(state.scouting?.staff||[]),doctor=state.medical?.doctor||{};
  const scout=Math.round(sc.reduce((n,x)=>n+(x.judgingCurrent||0),0)/Math.max(1,sc.length)),medical=Math.round(doctor.prevention||0);
  return `<div class="v46-staff-impact"><div class="section-inline"><h4>Impacto actual del staff</h4><span class="v46-badge">Se aplica a la simulación</span></div><div class="v46-impact-grid"><div><b class="v46-positive">Entrenador</b><span>${Math.round(coach.manManagement||0)} gestión · ${Math.round(coach.youthTrust||0)} confianza en jóvenes</span></div><div><b class="v46-positive">Scouting</b><span>${sc.length} ojeador(es) · nivel medio ${scout}</span></div><div><b class="v46-positive">Departamento médico</b><span>Prevención ${medical}/100 · influye en recaídas y recuperación</span></div><div><b class="v46-warning">Coste staff</b><span>${fmtMoney(staffCost())} de ${fmtMoney(c.staffBudget||0)} presupuestados</span></div></div></div>`;
}
function lockerDynamicsV46(){
  const r=userClub().roster||[],cap=r.find(p=>p.id===state.lockerRoom?.captainId),young=r.filter(p=>(p.age||99)<=23).length,leaders=r.filter(p=>leadershipScore(p)>=72).length;
  const groups=state.lockerRoom.groups?.length?state.lockerRoom.groups:[{name:'Liderazgo',count:leaders},{name:'Jóvenes',count:young},{name:'Rotación',count:Math.max(0,r.length-leaders-young)}];
  return `<div class="v46-locker-dynamics"><div class="section-inline"><h4>Dinámica del vestuario</h4><span class="pill">Capitán: ${cap?fullName(cap):'—'}</span></div><div class="v46-impact-grid">${groups.map(g=>`<div><b>${g.name}</b><span>${g.count} jugador(es) · observa su moral y relaciones</span></div>`).join('')}</div><p class="tiny muted">Las decisiones, los minutos y los resultados modifican estos equilibrios durante la temporada.</p></div>`;
}
function enhanceV46View(){
  if(!state)return;
  if(currentView==='squad'){
    const save=document.getElementById('saveStyle'),card=save?.closest('.card');if(card&&!card.querySelector('#v46TacticalImpact'))card.insertAdjacentHTML('beforeend',tacticalGuidanceV46(userClub()));
  }
  if(currentView==='more'){const host=document.querySelector('.more-sections');if(host&&!host.querySelector('.v46-staff-impact'))host.insertAdjacentHTML('afterbegin',staffImpactV46());if(host&&!host.querySelector('.v46-help-card')){host.insertAdjacentHTML('afterbegin',`<div class="card v46-help-card"><div class="eyebrow">Ayuda</div><h3>¿Es tu primera carrera?</h3><p class="muted">Repasa en un minuto qué revisar antes de simular y cómo afectan tus decisiones.</p><button class="btn primary" id="openV46Tutorial">Abrir tutorial</button></div>`);document.getElementById('openV46Tutorial').onclick=openV46Tutorial}}
  if(currentView==='locker'){const host=document.querySelector('#view');if(host&&!host.querySelector('.v46-locker-dynamics'))host.insertAdjacentHTML('beforeend',lockerDynamicsV46())}
  if(currentView==='home'&&state.careerV46.story.length&&!state.careerV46.story[0].read){const host=document.querySelector('#view');if(host&&!host.querySelector('.v46-story-callout')){const s=state.careerV46.story[0];host.insertAdjacentHTML('afterbegin',`<div class="v46-story-callout"><div><h4>${s.title}</h4><p>${s.text}</p></div><button class="btn small" id="dismissV46Story" aria-label="Marcar aviso como leído">Leído</button></div>`);const dismissStory=document.getElementById('dismissV46Story');if(dismissStory)dismissStory.onclick=()=>{s.read=true;saveLocal(false);dismissStory.closest('.v46-story-callout')?.remove()}}}
}
function openV46Tutorial(){
  if(!state||document.querySelector('.v46-tutorial-modal'))return;
  const back=modal(`<div class="v46-tutorial-modal"><div class="modal-head"><div><div class="eyebrow">Primeros pasos</div><h2>Tu carrera empieza aquí</h2></div><button class="btn" data-close>Ahora no</button></div><p class="muted">Estas son las cuatro cosas que conviene revisar antes de simular.</p><div class="v46-tutorial-grid"><article><b>1 · Inicio</b><p>Resuelve primero las decisiones pendientes y revisa los objetivos de la directiva.</p></article><article><b>2 · Plantilla</b><p>Configura roles, minutos y estilo; el entrenador y el staff influyen en los resultados.</p></article><article><b>3 · Mercado</b><p>Busca jugadores, observa sus atributos con scouting y controla el margen salarial.</p></article><article><b>4 · Carrera</b><p>Los resultados, el vestuario y las finanzas afectan a tu reputación y a futuras ofertas.</p></article></div><div class="modal-actions"><button class="btn primary" id="finishV46Tutorial">Entendido, empezar</button></div></div>`);
  back.classList.add('v46-tutorial-overlay');
  const finish=()=>{state.ui.tutorialV46=true;saveLocal(false);back.remove()};back.querySelector('[data-close]').onclick=finish;back.querySelector('#finishV46Tutorial').onclick=finish;
}
function maybeShowV46Tutorial(){if(!state||state.ui.tutorialV46||document.querySelector('.v46-tutorial-modal'))return;openV46Tutorial()}
function recordSeasonNarrativeV46(match,res){
  ensureV46State();const played=userGamesPlayedV20(),home=match.homeClubId===state.userClubId,win=home?match.homeScore>match.awayScore:match.awayScore>match.homeScore;
  if(!played||played===state.careerV46.lastStoryGame||played%5!==0)return;state.careerV46.lastStoryGame=played;
  const recent=state.history.slice(-5),wins=recent.filter(h=>{const m=state.calendar.find(x=>x.id===h.matchId);return m&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)&&((m.homeClubId===state.userClubId&&m.homeScore>m.awayScore)||(m.awayClubId===state.userClubId&&m.awayScore>m.homeScore))}).length;
  const title=wins>=4?'El vestuario cree en el proyecto':wins<=1?'La presión empieza a aumentar':'El equipo busca estabilidad';const text=wins>=4?`${userClub().name} encadena ${wins} victorias en sus últimos partidos. La directiva valora el impulso y el capitán gana influencia.`:wins<=1?`${userClub().name} solo ha ganado ${wins} de sus últimos cinco partidos. Conviene revisar la rotación, la moral y el plan de mercado.`:`El equipo mantiene un rendimiento irregular. El próximo tramo puede cambiar la percepción de la directiva.`;
  state.careerV46.story.unshift({date:state.currentDate,title,text,read:false});state.careerV46.story=state.careerV46.story.slice(0,12);worldNewsPushV20('STORY',text,{clubId:state.userClubId});
}

function render(){
  if(!state){renderStart();return}
  ensureV12State();ensureV13State();ensureV14State();ensureV15State();ensureV16State();ensureV17State();ensureV19State();ensureV20State();
  const c=userClub(),wb=wageBill(c),room=availableWage(c);
  app.innerHTML=`<div class="shell"><aside class="sidebar"><div class="brand">BASKETBALL GM<small>${APP_VERSION.label}</small></div><nav class="nav">${navButton('home','Inicio','⌂')}${navButton('squad','Plantilla','◉')}${navButton('market','Mercado','⇄')}${navButton('academy','Cantera','◇')}${navButton('schedule','Calendario','▦')}${navButton('standings','Clasificación','≡')}${navButton('stats','Estadísticas','Σ')}${navButton('more','Más','•••')}</nav><div class="side-footer">Offline · guardado local<br>${state.season}</div></aside><main class="main"><header class="topbar"><div><div class="club-title">${c.name}</div><div class="club-meta">${state.season} · ${state.currentDate}</div></div><div class="top-actions"><span class="budget">Caja ${fmtMoney(c.cashBudget)} · Salarios ${fmtMoney(wb)} / ${fmtMoney(c.salaryBudget)}</span><button class="btn small icon-btn" id="themeBtn" title="Cambiar entre modo claro y oscuro" aria-label="Cambiar entre modo claro y oscuro">◐</button><button class="btn small search-btn" id="globalSearchBtn" title="Buscar jugador o club" aria-label="Buscar jugador o club">⌕ <span>Buscar</span></button><button class="btn small" id="saveBtn">Guardar</button></div></header><section class="content" id="view"></section></main><nav class="bottom-nav" aria-label="Navegación principal">${navButton('home','Inicio','⌂')}${navButton('squad','Equipo','◉')}${navButton('schedule','Partidos','▦')}${navButton('market','Mercado','⇄')}${navButton('more','Más','•••')}</nav></div>`;
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;render()});
  document.getElementById('saveBtn').onclick=()=>saveLocal(true);const gs=document.getElementById('globalSearchBtn');if(gs)gs.onclick=()=>openGlobalSearch();const th=document.getElementById('themeBtn');if(th)th.onclick=()=>{state.ui.theme=state.ui.theme==='light'?'dark':'light';applyThemeV19();saveLocal(false);render()};applyThemeV19();renderView();enhanceV46View();maybeShowV46Tutorial();
}

function renderStart(){
  const saved=savedGameSummary();const savedText=saved?.club?`Último guardado: ${saved.club} · ${saved.season||'carrera activa'} · ${saved.date||''}`:'La partida se guarda automáticamente al avanzar y al cerrar la app.';
  app.innerHTML=`<div class="start-screen"><div class="start-card"><div class="eyebrow">${APP_VERSION.label} · funciona offline</div><h1>Basketball GM</h1><p>Simulador de dirección deportiva con plantillas reales 2026/27, mercado, scouting, cantera, economía e historial de carrera.</p><div class="start-actions"><button class="btn primary" id="newGame">Nueva partida</button><button class="btn" id="continue">Continuar partida guardada</button><button class="btn" id="importBtn">Importar partida</button><input class="file-input" type="file" id="importFile" accept="application/json"></div><div class="note"><b>${savedText}</b><br>Puedes continuar exactamente desde el último punto guardado. Para aplicar la normalización completa de posiciones, alturas y perfiles del Data Pack, crea una partida nueva en ${APP_VERSION.label}.</div></div></div>`;
  document.getElementById('newGame').onclick=()=>{const clubs=BBGM.createWorld().clubs.filter(c=>c.leagueLevel!=='NBA');const leagues=[...new Set(clubs.map(c=>c.leagueName))];const ov=modal(`<div class="modal-head"><div><div class="eyebrow">Nueva carrera</div><h2>Elige tu primer proyecto</h2></div><button class="btn" data-close>Cerrar</button></div><p class="muted">Selecciona una liga y un equipo; también puedes empezar de forma aleatoria.</p><div class="form-grid"><label>Liga<select id="careerLeague">${leagues.map(x=>`<option>${x}</option>`).join('')}</select></label><label>Equipo<select id="careerClub"></select></label></div><div class="modal-actions"><button class="btn" id="careerRandom">Proyecto aleatorio</button><button class="btn primary" id="careerStart">Comenzar carrera</button></div>`);const league=ov.querySelector('#careerLeague'),clubSel=ov.querySelector('#careerClub');const fill=()=>{clubSel.innerHTML=clubs.filter(c=>c.leagueName===league.value).map(c=>`<option value="${c.id}">${c.name}</option>`).join('')};fill();league.onchange=fill;ov.querySelector('[data-close]').onclick=()=>ov.remove();ov.querySelector('#careerRandom').onclick=()=>{const club=clubs[Math.floor(Math.random()*clubs.length)];ov.remove();newGame(club.id)};ov.querySelector('#careerStart').onclick=()=>{ov.remove();newGame(Number(clubSel.value))}};
  document.getElementById('continue').onclick=async()=>{if(!(await loadLocal()))alert('No hay una partida guardada en este navegador.')};
  document.getElementById('importBtn').onclick=()=>document.getElementById('importFile').click();
  document.getElementById('importFile').onchange=e=>e.target.files[0]&&importSave(e.target.files[0]);
}

function renderView(){
  const v=document.getElementById('view');
  if(currentView==='home')renderHome(v);
  else if(currentView==='squad')renderSquad(v);
  else if(currentView==='market')renderMarket(v);
  else if(currentView==='academy')renderAcademy(v);
  else if(currentView==='schedule')renderSchedule(v);
  else if(currentView==='standings')renderStandings(v);
  else if(currentView==='stats')renderStatistics(v);
  else if(currentView==='coach')renderCoachOffice(v);
  else if(currentView==='sponsors')renderSponsors(v);
  else if(currentView==='planning')renderPlanning(v);
  else if(currentView==='locker')renderLockerRoom(v);
  else if(currentView==='medical')renderMedical(v);
  else if(currentView==='nba')renderNba(v);
  else if(currentView==='international')renderInternational(v);
  else if(currentView==='finance')renderFinance(v);
  else if(currentView==='history')renderHistory(v);
  else if(currentView==='inbox')renderInboxCenter(v);
  else if(currentView==='preseason')renderPreseason(v);
  else if(currentView==='diagnostics')renderDiagnosticsV19(v);
  else renderMore(v);
}

function inboxHtml(){
  const items=state.inbox.filter(x=>!x.resolved).slice(0,7);
  if(!items.length)return '<p class="muted">No tienes asuntos pendientes.</p>';
  return items.map(x=>{
    return `<div class="inbox-item"><span class="dot ${x.type==='INJURY'?'bad':x.type==='TRAINING'||x.type==='CONTRACT'?'warn':''}"></span><div class="inbox-body"><div class="msg-title">${x.title}</div><div class="msg-text">${x.text}</div>${notificationActionsHtml(x)}</div></div>`;
  }).join('');
}

function bindInboxActions(root=document){
  root.querySelectorAll('[data-offer-accept]').forEach(b=>b.onclick=()=>acceptIncomingOffer(+b.dataset.offerAccept));
  root.querySelectorAll('[data-offer-reject]').forEach(b=>b.onclick=()=>rejectIncomingOffer(+b.dataset.offerReject));
  root.querySelectorAll('[data-open-decision]').forEach(b=>b.onclick=()=>openDecisionModal(+b.dataset.openDecision));
  root.querySelectorAll('[data-decision]').forEach(b=>b.onclick=()=>resolveDecision(+b.dataset.decision,+b.dataset.choice));
  root.querySelectorAll('[data-inbox-open]').forEach(b=>b.onclick=()=>openInboxTarget(b.dataset.inboxOpen));
}

function startingFive(c){
  const rot=BBGM.rotation(c),used=new Set(),slots={};
  for(const pos of ['PG','SG','SF','PF','C']){
    const candidates=Object.entries(rot.byPosition[pos]||{}).sort((a,b)=>b[1]-a[1]);
    let found=candidates.map(([id])=>c.roster.find(p=>p.id===+id)).find(p=>p&&!used.has(p.id));
    if(!found)found=c.roster.filter(p=>!used.has(p.id)).sort((a,b)=>BBGM.overall(b)-BBGM.overall(a))[0];
    if(found){slots[pos]=found;used.add(found.id)}
  }
  return slots;
}
function courtHtml(c){
  const five=startingFive(c);
  return `<div class="court-wrap"><div class="basket-court"><div class="court-line half"></div><div class="court-circle center-circle"></div><div class="paint paint-top"></div><div class="paint paint-bottom"></div><div class="court-circle top-arc"></div><div class="court-circle bottom-arc"></div>${['PG','SG','SF','PF','C'].map(pos=>{const p=five[pos];return p?`<button class="court-player pos-${pos.toLowerCase()}" data-profile="${p.id}"><span class="court-pos">${positionLabel[pos]}</span><b>${p.firstName.charAt(0)}. ${p.lastName}</b><small>${Math.round(BBGM.overall(p))} OVR</small></button>`:''}).join('')}</div></div>`;
}

function renderHome(v){
  const nm=nextUserMatch(),uc=userClub(),pending=pendingDecision();
  const acbPos=sortedStandings('ACB').findIndex(x=>x.clubId===state.userClubId)+1,elPos=sortedStandings('EL').findIndex(x=>x.clubId===state.userClubId)+1;
  const cr=coachRelationshipInfo(),objectives=(state.board?.objectives||[]).map(o=>({o,s:boardObjectiveState(o)}));
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Despacho</div><h1>Inicio</h1><p>Avanza al siguiente partido o resuelve asuntos de plantilla, directiva y mercado.</p></div><button class="btn primary" id="nextMatchBtn">${pending?'Resolver decisión':state.seasonComplete?'Preparar nueva temporada':state.offseason?.active?`Avanzar mercado de verano (${state.offseason.weeksRemaining} sem.)`:state.preseason?.active?`Avanzar pretemporada (${state.preseason.weeksRemaining} sem.)`:nextScoutingCompletion()&&(!nm||nextScoutingCompletion().endDate<nm.date)?'Avanzar a informe scout':nm?'Jugar siguiente partido':hasScheduledGames()?'Avanzar competición':'Cerrar temporada'}</button></div>
  ${state.preseason?.active?`<div class="preseason-banner"><div><b>Pretemporada activa</b><span>${state.preseason.weeksRemaining} semanas · foco ${preseasonFocusLabel(state.preseason.focus)}</span></div><button class="btn small good" id="openPreHome">Abrir</button></div>`:''}<div class="grid two"><div class="card"><div class="eyebrow">Próximo partido</div>${nm?`<div class="next-match"><div><div class="match-teams">${club(nm.homeClubId).name}<br><span class="muted">vs</span> ${club(nm.awayClubId).name}</div><div class="date">${comp(nm.competitionId).name} · ${typeof nm.round==='number'?'Jornada '+nm.round:nm.round} · ${nm.date}</div></div><button class="btn good" id="playBtn">${pending?'Resolver decisión':'Simular'}</button></div>`:'<p class="muted">No quedan partidos programados.</p>'}</div>
  <div class="card"><h3>Estado del club</h3><div class="stat-row"><span>ACB</span><b>${acbPos||'—'}${acbPos?'º':''}</b></div><div class="stat-row"><span>Euroliga</span><b>${elPos||'—'}${elPos?'º':''}</b></div><div class="stat-row"><span>Caja de fichajes</span><b>${fmtMoney(uc.cashBudget)}</b></div><div class="stat-row"><span>Masa salarial</span><b>${fmtMoney(wageBill(uc))}</b></div><div class="stat-row"><span>Margen salarial</span><b class="${availableWage(uc)<300000?'warn':''}">${fmtMoney(availableWage(uc))}</b></div></div></div>
  <div class="grid two" style="margin-top:16px"><div class="card"><div class="section-inline"><h3>Bandeja de entrada</h3><button class="btn small" id="openInboxHome">Ver todo</button></div>${inboxHtml()}</div><div class="card board-home"><div class="section-inline"><div><div class="eyebrow">Directiva</div><h3>Confianza y objetivos</h3></div><div class="confidence-score">${Math.round(state.board?.confidence??70)}<small>/100</small></div></div><div class="bar confidence-bar"><i style="width:${Math.round(state.board?.confidence??70)}%"></i></div>${objectives.map(({o,s})=>`<div class="objective-row"><div><b>${o.label}</b><small>${s.text}</small></div><span class="pill ${s.ok?'good-pill':''}">${s.ok?'Cumpliendo':'En curso'}</span></div>`).join('')}<div class="coach-mini"><span>Relación entrenador</span><b>${cr.value}/100 · ${cr.label}</b><button class="btn small" id="talkCoachHome">Hablar</button></div></div></div>
  <div class="grid two" style="margin-top:16px"><div class="card"><h3>ACB</h3>${standingsMini('ACB',8)}</div><div class="card"><h3>Patrocinador</h3>${state.sponsorship?.active?`<div class="sponsor-summary"><b>${state.sponsorship.active.name}</b><span>${state.sponsorship.active.type}</span><strong>${fmtMoney(state.sponsorship.active.fixed)} fijo</strong></div><button class="btn" id="sponsorHome">Ver variables</button>`:`<p class="muted">Tienes propuestas de patrocinio pendientes.</p><button class="btn good" id="sponsorHome">Elegir patrocinador</button>`}</div></div>
  <div class="card" style="margin-top:16px"><div class="section-inline"><div><div class="eyebrow">Quinteto previsto por el entrenador</div><h3>Quinteto titular</h3></div><span class="pill">Haz clic en un jugador</span></div>${courtHtml(uc)}</div>
  ${state.marketNews.length?`<div class="card" style="margin-top:16px"><h3>Noticias de mercado</h3>${state.marketNews.slice(0,5).map(n=>`<div class="news-line"><span class="muted">${n.date}</span><span>${n.text}</span></div>`).join('')}</div>`:''}`;
  v.insertAdjacentHTML('afterbegin',`<div class="v49-home-top v49-home-metrics-only"><div class="v49-top-metrics"><div class="v49-metric"><span>DIRECTIVA</span><b>${Math.round(state.board?.confidence??70)}/100</b><small>Confianza</small></div><div class="v49-metric"><span>PRÓXIMO PARTIDO</span><b>${nm?club(nm.homeClubId===state.userClubId?nm.awayClubId:nm.homeClubId)?.shortName||'Rival':'—'}</b><small>${nm?nm.date:'Sin partido'}</small></div></div></div>`);
  v.insertAdjacentHTML('beforeend',v20HomeNewsHtml());
  v.insertAdjacentHTML('beforeend',`<div style="margin-top:16px">${weeklySummaryHtml()}</div>`);v.insertAdjacentHTML('beforeend',dashboardExtraHtml());
  const lh=document.getElementById('openLockerHome');if(lh)lh.onclick=()=>{currentView='locker';render()};const ph=document.getElementById('openPlanningHome');if(ph)ph.onclick=()=>{currentView='planning';render()};
  const nextBtn=document.getElementById('nextMatchBtn');if(nextBtn)nextBtn.onclick=pending?()=>interruptForPendingDecision():state.seasonComplete?showEndSeasonModal:state.offseason?.active?advanceOffseasonWeek:state.preseason?.active?advancePreseasonWeek:advanceToNextEvent;if(nm)document.getElementById('playBtn').onclick=simulateToNextUserMatch;const quick=document.getElementById('v45NextStep');if(quick&&nextBtn)quick.onclick=()=>nextBtn.click();
  const oph=document.getElementById('openPreHome');if(oph)oph.onclick=()=>{currentView='preseason';render()};const oi=document.getElementById('openInboxHome');if(oi)oi.onclick=()=>{currentView='inbox';render()};const ow=document.getElementById('openWeekly');if(ow)ow.onclick=()=>showWeeklySummaryModal();const tc=document.getElementById('talkCoachHome');if(tc)tc.onclick=()=>{currentView='coach';render()};const sh=document.getElementById('sponsorHome');if(sh)sh.onclick=()=>{currentView='sponsors';render()};bindInboxActions(v);bindProfileButtons(v);
}

function renderSquad(v){
  const c=userClub(),rot=BBGM.rotation(c),players=c.roster.slice().sort((a,b)=>BBGM.overall(b)-BBGM.overall(a)),seasonStats=seasonStatsMap();
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Gestión deportiva</div><h1>Plantilla</h1><p>Puedes modificar el rol deportivo durante la temporada. Bajar el rol, especialmente por debajo de lo prometido en contrato, puede afectar a la moral.</p></div></div><div class="grid two"><div class="card"><h3>Jugadores</h3>${players.map(p=>{ensurePlayerContractFields(p,p.id);const mins=rot.playerMinutes[p.id]||0,mor=moraleInfo(p.state.morale),st=seasonStats[p.id],g=st?.g||0,req=coachRequestFor(p);return `<div class="player-card player-card-v07"><button class="ovr ovr-btn" data-profile="${p.id}">${Math.round(BBGM.overall(p))}</button><div class="pc-main"><div class="pc-head"><button class="link-btn pc-name" data-profile="${p.id}">${fullName(p)}</button><span class="morale-pill ${mor.cls}">Moral ${Math.round(p.state.morale)} · ${mor.label}</span></div><div class="pc-meta">${positionText(p)} · ${p.age} años · ${p.nationality}${p.currentInjury&&p.currentInjury.status!=='RECOVERED'?`<span class="injury-badge">${p.currentInjury.name} · ${p.currentInjury.management==='REST'?'baja':p.currentInjury.management==='LIMITED'?'limitado':'molestias'}</span>`:''}</div><div class="role-row"><span>Rol</span><select data-role-change="${p.id}">${roleOptions.map(r=>`<option value="${r}" ${p.role===r?'selected':''}>${roleLabel[r]}</option>`).join('')}</select><span class="promised-role">Prometido: ${roleLabel[p.promisedRole]||roleLabel[p.role]}</span></div><div class="minutes-head"><span>Minutos previstos${req?` · petición ${req.adjustment>0?'+':''}${req.adjustment} (${req.gamesLeft} PJ)`:''}</span><b>${Math.round(mins)}/40</b></div><div class="bar minutes-bar"><i style="width:${Math.min(100,mins/40*100)}%"></i></div><div class="card-stats"><span>PJ <b>${g}</b></span><span>MIN <b>${g?st.mpg.toFixed(1):'—'}</b></span><span>PTS <b>${g?st.ppg.toFixed(1):'—'}</b></span><span>REB <b>${g?st.rpg.toFixed(1):'—'}</b></span><span>AST <b>${g?st.apg.toFixed(1):'—'}</b></span><span>VAL <b>${g?st.valpg.toFixed(1):'—'}</b></span></div></div><div class="pc-right"><div class="training-label">Entrenamiento</div><select data-focus="${p.id}">${Object.entries(focusLabel).map(([k,l])=>`<option value="${k}" ${p.trainingFocus===k?'selected':''}>${l}</option>`).join('')}</select>${p.age<=22?`<div class="young-actions"><button class="btn tiny-btn" data-demote="${p.id}">Equipo B</button><button class="btn tiny-btn" data-loan-first="${p.id}">Ceder</button></div>`:''}</div></div>`}).join('')}</div>
  <div><div class="card"><h3>Estilo de juego</h3><div class="form-grid"><div class="field"><label>Ritmo</label><select id="pace"><option value="35">Lento</option><option value="50">Medio</option><option value="65">Alto</option></select></div><div class="field"><label>Orientación ataque</label><select id="perimeter"><option value="35">Interior</option><option value="50">Equilibrado</option><option value="65">Exterior</option></select></div><div class="field"><label>Presión defensiva</label><select id="pressure"><option value="35">Baja</option><option value="50">Normal</option><option value="65">Alta</option></select></div><div class="field"><label>Rebote ofensivo</label><select id="oreb"><option value="35">Conservador</option><option value="50">Normal</option><option value="65">Agresivo</option></select></div></div><button class="btn primary" id="saveStyle" style="margin-top:14px">Guardar estilo</button></div>
  <div class="card" style="margin-top:16px"><h3>Entrenador</h3><div class="stat-row"><span>${c.coach.name}</span><b>${Math.round(c.coach.reputation)}</b></div><div class="stat-row"><span>Ataque</span><b>${Math.round(c.coach.offense)}</b></div><div class="stat-row"><span>Defensa</span><b>${Math.round(c.coach.defense)}</b></div><div class="stat-row"><span>Desarrollo</span><b>${Math.round(c.coach.development)}</b></div><div class="stat-row"><span>Confianza jóvenes</span><b>${Math.round(c.coach.youthTrust)}</b></div></div></div></div>`;
  const nearest=x=>x<43?'35':x>57?'65':'50';
  document.getElementById('pace').value=nearest(c.style.pace);document.getElementById('perimeter').value=nearest(c.style.perimeterFocus);document.getElementById('pressure').value=nearest(c.style.pressure);document.getElementById('oreb').value=nearest(c.style.offensiveReboundEmphasis);
  document.getElementById('saveStyle').onclick=()=>{c.style.pace=+document.getElementById('pace').value;c.style.perimeterFocus=+document.getElementById('perimeter').value;c.style.pressure=+document.getElementById('pressure').value;c.style.offensiveReboundEmphasis=+document.getElementById('oreb').value;saveLocal(false);toast('Estilo actualizado')};
  document.querySelectorAll('[data-focus]').forEach(s=>s.onchange=()=>{c.roster.find(p=>p.id===+s.dataset.focus).trainingFocus=s.value;saveLocal(false);toast('Entrenamiento actualizado')});
  document.querySelectorAll('[data-role-change]').forEach(sel=>sel.onchange=()=>changePlayerRole(+sel.dataset.roleChange,sel.value));
  document.querySelectorAll('[data-demote]').forEach(b=>b.onclick=()=>demoteYouth(+b.dataset.demote));document.querySelectorAll('[data-loan-first]').forEach(b=>b.onclick=()=>{const p=c.roster.find(x=>x.id===+b.dataset.loanFirst);if(p)openLoanDialog(p,'FIRST')});
  bindProfileButtons(v);
}

function marketTabs(){return `<div class="tabs market-tabs"><button data-market-tab="players" class="${marketTab==='players'?'active':''}">Jugadores</button><button data-market-tab="watchlist" class="${marketTab==='watchlist'?'active':''}">Seguimiento</button><button data-market-tab="live" class="${marketTab==='live'?'active':''}">Mercado vivo</button><button data-market-tab="scouting" class="${marketTab==='scouting'?'active':''}">Scouting</button><button data-market-tab="contracts" class="${marketTab==='contracts'?'active':''}">Mis contratos</button><button data-market-tab="offers" class="${marketTab==='offers'?'active':''}">Ofertas recibidas</button><button data-market-tab="coaches" class="${marketTab==='coaches'?'active':''}">Entrenadores</button><button data-market-tab="scouts" class="${marketTab==='scouts'?'active':''}">Ojeadores</button><button data-market-tab="agents" class="${marketTab==='agents'?'active':''}">Agentes</button></div>`}

function renderMarket(v){
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Dirección deportiva</div><h1>Mercado</h1><p>Busca jugadores, negocia traspasos, renueva contratos y responde ofertas.</p></div><div class="finance-chips"><span class="pill">Caja ${fmtMoney(userClub().cashBudget)}</span><span class="pill">Margen salarial ${fmtMoney(availableWage(userClub()))}</span><span class="pill">Staff ${fmtMoney(staffCost())} / ${fmtMoney(userClub().staffBudget)}</span></div></div>${marketTabs()}<div id="marketContent"></div>`;
  v.querySelectorAll('[data-market-tab]').forEach(b=>b.onclick=()=>{marketTab=b.dataset.marketTab;renderMarket(v)});
  const content=v.querySelector('#marketContent');
  if(marketTab==='players')renderMarketPlayers(content);
  else if(marketTab==='watchlist')renderWatchlist(content);
  else if(marketTab==='live')renderMarketLive(content);
  else if(marketTab==='scouting')renderScouting(content);
  else if(marketTab==='contracts')renderContracts(content);
  else if(marketTab==='offers')renderOffers(content);
  else if(marketTab==='coaches')renderCoachMarket(content);
  else renderScoutMarket(content);
}

function allMarketCandidates(){
  const out=[];
  for(const p of state.world.freeAgents||[])out.push({player:p,club:null,status:'FREE_AGENT'});
  for(const c of state.world.clubs){if(c.id===state.userClubId)continue;for(const p of c.roster)out.push({player:p,club:c,status:'CONTRACTED'})}
  return out;
}

function renderMarketPlayers(root){
  const leagueOptions=(state.world.leagues||[]).map(l=>l.name).sort();
  const f=marketFilters;
  root.innerHTML=`<div class="card"><div class="market-filters"><div class="field"><label>Buscar</label><input id="marketSearch" placeholder="Nombre..." value="${String(f.search||'').replaceAll('&','&amp;').replaceAll('"','&quot;')}"></div><div class="field"><label>Posición</label><select id="marketPos"><option value="">Todas</option>${['PG','SG','SF','PF','C'].map(x=>`<option value="${x}" ${f.position===x?'selected':''}>${positionLabel[x]}</option>`).join('')}</select></div><div class="field"><label>Liga</label><select id="marketLeague"><option value="">Todas</option>${leagueOptions.map(x=>`<option value="${x}" ${f.league===x?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Edad mínima</label><select id="marketAgeMin"><option value="0">Todas</option>${Array.from({length:25},(_,i)=>16+i).map(a=>`<option value="${a}" ${+f.ageMin===a?'selected':''}>${a}</option>`).join('')}</select></div><div class="field"><label>Edad máxima</label><select id="marketAgeMax"><option value="99">Todas</option>${Array.from({length:25},(_,i)=>16+i).map(a=>`<option value="${a}" ${+f.ageMax===a?'selected':''}>${a}</option>`).join('')}</select></div><div class="field"><label>Situación</label><select id="marketStatus"><option value="">Todos</option><option value="FREE_AGENT" ${f.status==='FREE_AGENT'?'selected':''}>Agentes libres</option><option value="CONTRACTED" ${f.status==='CONTRACTED'?'selected':''}>Con contrato</option></select></div><div class="field"><label>Nivel estimado mínimo</label><select id="marketOvr"><option value="0">Todos</option>${[70,75,80,84].map(x=>`<option value="${x}" ${+f.minOvr===x?'selected':''}>${x}+</option>`).join('')}</select></div><div class="field"><label>Salario máximo</label><input id="marketSalaryMax" type="number" min="0" step="100000" placeholder="Sin límite" value="${+f.maxSalary||''}"></div><div class="field filter-actions"><label>&nbsp;</label><button class="btn" id="clearMarketFilters">Limpiar filtros</button></div></div></div><div class="card" style="margin-top:16px"><div id="marketTable"></div></div>`;
  const filterCard=root.querySelector('.market-filters')?.closest('.card');
  if(filterCard){const panel=document.createElement('details');panel.className='market-filter-panel';panel.open=!!(f.search||f.position||f.league||f.ageMin||f.ageMax<99||f.status||f.minOvr||f.maxSalary);const summary=document.createElement('summary');summary.textContent='Filtros de búsqueda';panel.append(summary,filterCard.querySelector('.market-filters'));filterCard.replaceWith(panel)}
  const readFilters=()=>{
    marketFilters={...marketFilters,search:root.querySelector('#marketSearch').value.trim(),position:root.querySelector('#marketPos').value,league:root.querySelector('#marketLeague').value,ageMin:+root.querySelector('#marketAgeMin').value,ageMax:+root.querySelector('#marketAgeMax').value,status:root.querySelector('#marketStatus').value,minOvr:+root.querySelector('#marketOvr').value,maxSalary:+root.querySelector('#marketSalaryMax').value||0};
    if(marketFilters.ageMin>marketFilters.ageMax){const t=marketFilters.ageMin;marketFilters.ageMin=marketFilters.ageMax;marketFilters.ageMax=t}
    persistMarketFilters();
  };
  const refresh=(resetPage=false)=>{
    readFilters();if(resetPage)marketFilters.page=1;
    const q=(marketFilters.search||'').toLowerCase(),pos=marketFilters.position,league=marketFilters.league,ageMin=+marketFilters.ageMin||0,ageMax=+marketFilters.ageMax||99,status=marketFilters.status,min=+marketFilters.minOvr||0,maxSalary=+marketFilters.maxSalary||0;
    let list=allMarketCandidates().map(x=>({...x,known:knownOverall(x.player,x.club)})).filter(x=>(!q||fullName(x.player).toLowerCase().includes(q))&&(!pos||(x.player.primaryPosition===pos||x.player.secondaryPosition===pos))&&(!league||(x.club&&x.club.leagueName===league))&&((x.player.age||0)>=ageMin&&(x.player.age||0)<=ageMax)&&(!status||x.status===status)&&(!min||(x.known.mid!=null&&x.known.mid>=min))&&(!maxSalary||(x.player.salary||0)<=maxSalary));
    list=list.sort((a,b)=>(b.known.mid??-1)-(a.known.mid??-1)||a.player.age-b.player.age||fullName(a.player).localeCompare(fullName(b.player)));
    const pageSize=marketFilters.pageSize||25,total=list.length,totalPages=Math.max(1,Math.ceil(total/pageSize));marketFilters.page=Math.min(Math.max(1,+marketFilters.page||1),totalPages);persistMarketFilters();
    const start=(marketFilters.page-1)*pageSize,page=list.slice(start,start+pageSize);
    root.querySelector('#marketTable').innerHTML=`<div class="market-result-head"><span><b>${total}</b> jugadores encontrados</span><span>Página <b>${marketFilters.page}</b> de <b>${totalPages}</b></span></div><div class="table-wrap"><table><thead><tr><th>Jugador</th><th>Edad</th><th>Pos.</th><th>Nivel</th><th>Club</th><th>Liga</th><th>Salario</th><th>Conocimiento</th><th></th></tr></thead><tbody>${page.map(x=>{const level=x.known.level,label=level>=3?'Completo':level===2?'Rápido':level===1?'Público':'Desconocido';return `<tr><td><button class="link-btn" data-profile="${x.player.id}">${fullName(x.player)}</button><div class="tiny">${x.player.agent}</div></td><td>${x.player.age}</td><td>${positionText(x.player)}</td><td><b class="knowledge-${level}">${x.known.text}</b></td><td>${x.club?x.club.shortName:'Libre'}</td><td>${x.club?x.club.leagueName:'—'}</td><td>${fmtMoney(x.player.salary)}</td><td><span class="pill">${label}</span></td><td><button class="btn small watch-btn ${watchlisted(x.player.id)?'watched':''}" data-watch="${x.player.id}">${watchlisted(x.player.id)?'★':'☆'}</button> <button class="btn small" data-scout="${x.player.id}">Ojeador</button> ${x.status==='FREE_AGENT'?`<button class="btn small good" data-sign="${x.player.id}">Fichar</button>`:`<button class="btn small" data-transfer="${x.player.id}">Negociar</button>`}</td></tr>`}).join('')}</tbody></table></div><div class="pagination"><button class="btn small" id="marketPrev" ${marketFilters.page<=1?'disabled':''}>← Anterior</button><span>${start+1}-${Math.min(start+pageSize,total)} de ${total}</span><button class="btn small" id="marketNext" ${marketFilters.page>=totalPages?'disabled':''}>Siguiente →</button></div><div class="table-note">Los filtros se conservan hasta que pulses “Limpiar filtros”. La media real de jugadores externos sigue oculta y mejora con scouting.</div>`;
    bindProfileButtons(root);
    root.querySelectorAll('[data-watch]').forEach(b=>b.onclick=()=>toggleWatchlist(+b.dataset.watch));
    root.querySelectorAll('[data-scout]').forEach(b=>b.onclick=()=>{const loc=playerLocation(+b.dataset.scout);if(loc)openScoutAssignment(loc.player,loc.club)});
    root.querySelectorAll('[data-sign]').forEach(b=>b.onclick=()=>{const loc=playerLocation(+b.dataset.sign);openContractNegotiation(loc.player,{type:'FREE_AGENT'})});
    root.querySelectorAll('[data-transfer]').forEach(b=>b.onclick=()=>{const loc=playerLocation(+b.dataset.transfer);openTransferNegotiation(loc.player,loc.club)});
    const prev=root.querySelector('#marketPrev'),next=root.querySelector('#marketNext');if(prev)prev.onclick=()=>{marketFilters.page--;persistMarketFilters();refresh(false)};if(next)next.onclick=()=>{marketFilters.page++;persistMarketFilters();refresh(false)};
  };
  ['#marketPos','#marketLeague','#marketAgeMin','#marketAgeMax','#marketStatus','#marketOvr','#marketSalaryMax'].forEach(sel=>root.querySelector(sel).addEventListener('change',()=>refresh(true)));
  let searchTimer=null;root.querySelector('#marketSearch').addEventListener('input',()=>{clearTimeout(searchTimer);searchTimer=setTimeout(()=>refresh(true),180)});
  root.querySelector('#clearMarketFilters').onclick=()=>{resetMarketFilters();renderMarketPlayers(root)};
  refresh(false);
}


function renderWatchlist(root){ensureV12State();const items=(state.watchlist||[]).map(id=>playerLocation(id)).filter(Boolean),rec=bestRecommendedTarget();root.innerHTML=`<div class="grid two"><div class="card"><div class="section-inline"><div><div class="eyebrow">Lista de seguimiento</div><h3>${items.length} jugador(es)</h3></div><span class="pill">Máx. 3 para comparar</span></div>${items.length?`<div class="table-wrap"><table><thead><tr><th></th><th>Jugador</th><th>Edad</th><th>Pos.</th><th>Nivel</th><th>Club</th><th>Salario</th><th></th></tr></thead><tbody>${items.map(loc=>{const k=knownOverall(loc.player,loc.club),r=reportForPlayer(loc.player.id),age=r?.completedDate?daysBetween(r.completedDate,state.currentDate):null;return `<tr><td><input type="checkbox" data-compare="${loc.player.id}"></td><td><button class="link-btn" data-profile="${loc.player.id}">${fullName(loc.player)}</button>${age!=null?`<div class="tiny ${age>120?'warn':''}">Informe hace ${age} días</div>`:''}</td><td>${loc.player.age}</td><td>${positionText(loc.player)}</td><td><b>${k.text}</b></td><td>${loc.club?.shortName||'Libre'}</td><td>${fmtMoney(loc.player.salary)}</td><td><button class="btn small" data-unwatch="${loc.player.id}">Quitar</button></td></tr>`}).join('')}</tbody></table></div><button class="btn good" id="compareSelected" style="margin-top:12px">Comparar seleccionados</button>`:'<p class="muted">Añade jugadores desde Mercado pulsando ☆.</p>'}</div><div class="card"><div class="eyebrow">Recomendación automática</div><h3>${state.planning.priorityPosition?`Prioridad ${positionLabel[state.planning.priorityPosition]}`:'Según necesidad de plantilla'}</h3>${rec?`<button class="link-btn big-link" data-profile="${rec.player.id}">${fullName(rec.player)}</button><div class="stat-row"><span>Posición</span><b>${positionText(rec.player)}</b></div><div class="stat-row"><span>Nivel estimado</span><b>${rec.k.text}</b></div><div class="stat-row"><span>Club</span><b>${rec.club?.name||'Agente libre'}</b></div><div class="stat-row"><span>Salario</span><b>${fmtMoney(rec.player.salary)}</b></div><button class="btn" data-rec-watch="${rec.player.id}">Añadir a seguimiento</button>`:'<p class="muted">Necesitas más conocimiento de mercado.</p>'}</div></div>`;bindProfileButtons(root);root.querySelectorAll('[data-unwatch]').forEach(b=>b.onclick=()=>toggleWatchlist(+b.dataset.unwatch));root.querySelectorAll('[data-rec-watch]').forEach(b=>b.onclick=()=>toggleWatchlist(+b.dataset.recWatch));const cmp=root.querySelector('#compareSelected');if(cmp)cmp.onclick=()=>{const ids=[...root.querySelectorAll('[data-compare]:checked')].map(x=>+x.dataset.compare).slice(0,3);if(ids.length<2){toast('Selecciona 2 o 3 jugadores');return}openPlayerComparison(ids)}}
function openPlayerComparison(ids){const locs=ids.map(playerLocation).filter(Boolean),keys=['threePoint','finishing','passing','ballHandling','perimeterDefense','interiorDefense','defensiveRebound','speed'];const stats=seasonStatsMap();const row=(label,fn)=>`<tr><td>${label}</td>${locs.map(x=>`<td>${fn(x)}</td>`).join('')}</tr>`;const back=modal(`<div class="modal-head"><div><div class="eyebrow">Dirección deportiva</div><h2>Comparar jugadores</h2></div><button class="btn" data-close>Cerrar</button></div><div class="table-wrap comparison-table"><table><thead><tr><th>Dato</th>${locs.map(x=>`<th><button class="link-btn" data-profile="${x.player.id}">${fullName(x.player)}</button></th>`).join('')}</tr></thead><tbody>${row('Edad',x=>x.player.age)}${row('Posición',x=>positionText(x.player))}${row('Nivel',x=>`<b>${knownOverall(x.player,x.club).text}</b>`)}${row('Potencial',x=>knownPotential(x.player,x.club))}${row('Encaje Baskonia',x=>{const f=fitLabelV17(x.player);return `<b>${f.label}</b> · ${f.value}/100`})}${row('Valor mercado',x=>fmtMoney(BBGM.marketValue(x.player)))}${row('Salario',x=>fmtMoney(x.player.salary))}${row('Contrato',x=>x.player.contractYears?x.player.contractYears+' año(s)':'Libre')}${row('Personalidad',x=>personalitySummary(x.player,x.club))}${row('PTS',x=>stats[x.player.id]?stats[x.player.id].ppg.toFixed(1):'—')}${row('REB',x=>stats[x.player.id]?stats[x.player.id].rpg.toFixed(1):'—')}${row('AST',x=>stats[x.player.id]?stats[x.player.id].apg.toFixed(1):'—')}${keys.map(k=>row(attrLabel[k],x=>knownAttribute(x.player,k,x.club))).join('')}</tbody></table></div>`);back.querySelector('[data-close]').onclick=()=>back.remove();bindProfileButtons(back)}

function renderMarketLive(root){ensureV12State();const rumors=state.marketDynamics.rumors||[],offers=state.marketDynamics.agentOffers||[];root.innerHTML=`<div class="grid two"><div class="card"><div class="eyebrow">Rumores</div><h3>Interés de clubes</h3>${rumors.length?rumors.map(r=>{const loc=playerLocation(r.playerId);return `<div class="news-line"><span class="muted">${r.date}</span><span>${loc?`<button class="link-btn" data-profile="${r.playerId}">${fullName(loc.player)}</button> · `:''}${r.text}</span></div>`}).join(''):'<p class="muted">Los rumores aparecerán al avanzar la temporada.</p>'}</div><div class="card"><div class="eyebrow">Agentes</div><h3>Jugadores ofrecidos</h3>${offers.length?offers.map(o=>{const loc=playerLocation(o.playerId);return `<div class="offer-card"><div><b>${loc?fullName(loc.player):'Jugador'}</b><div class="tiny">${o.text}</div></div>${loc?`<button class="btn small" data-profile="${o.playerId}">Ver</button>`:''}</div>`}).join(''):'<p class="muted">Todavía ningún agente te ha ofrecido un jugador.</p>'}</div></div>`;bindProfileButtons(root)}

function renderScouting(root){
  const assignments=state.scouting.assignments.slice().sort((a,b)=>(a.status==='ACTIVE'?0:1)-(b.status==='ACTIVE'?0:1)||b.id-a.id);
  const reports=Object.entries(state.scouting.knowledge).map(([pid,r])=>{const loc=playerLocation(+pid);return loc?{...r,player:loc.player,club:loc.club}:null}).filter(Boolean).sort((a,b)=>(b.completedDate||'').localeCompare(a.completedDate||''));
  root.innerHTML=`<div class="grid three scout-grid">${state.scouting.staff.map(sc=>{const a=activeScoutAssignment(sc.id),loc=a?playerLocation(a.playerId):null;return `<div class="card scout-card"><div class="eyebrow">${sc.region==='USA'?'Especialista USA':sc.region==='YOUTH'?'Especialista jóvenes':'Especialista Europa'}</div><h3>${sc.name}</h3><div class="stat-row"><span>Nivel actual</span><b>${Math.round(sc.judgingCurrent)}</b></div><div class="stat-row"><span>Potencial</span><b>${Math.round(sc.judgingPotential)}</b></div><div class="stat-row"><span>Velocidad</span><b>${Math.round(sc.speed)}</b></div><div class="stat-row"><span>Europa / USA</span><b>${Math.round(sc.europe)} / ${Math.round(sc.usa)}</b></div>${a?`<div class="scout-busy"><b>Ocupado</b><span>${loc?fullName(loc.player):'Jugador'} · hasta ${a.endDate}</span></div>`:`<div class="scout-free">Disponible</div>`}</div>`}).join('')}</div>
  <div class="grid two" style="margin-top:16px"><div class="card"><h3>Trabajos de scouting</h3>${assignments.length?assignments.slice(0,12).map(a=>{const loc=playerLocation(a.playerId),sc=scoutById(a.scoutId);return `<div class="offer-card"><div><b>${loc?fullName(loc.player):'Jugador'}</b><div class="muted">${sc?sc.name:''} · ${a.type==='FULL'?'Informe completo':'Informe rápido'}</div></div><div><span class="pill ${a.status==='ACTIVE'?'warn-pill':'good-pill'}">${a.status==='ACTIVE'?`Hasta ${a.endDate}`:'Completado'}</span></div></div>`}).join(''):'<p class="muted">Todavía no has enviado a ningún ojeador.</p>'}</div>
  <div class="card"><h3>Informes completados</h3>${reports.length?reports.slice(0,12).map(r=>`<div class="offer-card"><div><button class="link-btn" data-profile="${r.player.id}">${fullName(r.player)}</button><div class="muted">${r.club?r.club.shortName:'Libre'} · ${r.type==='FULL'?'Completo':'Rápido'}</div></div><b>${knownOverall(r.player,r.club).text}</b></div>`).join(''):'<p class="muted">Los informes aparecerán aquí cuando terminen.</p>'}</div></div>`;
  bindProfileButtons(root);
}

function openScoutAssignment(p,ownerClub){
  if(ownerClub&&ownerClub.id===state.userClubId){toast('Ya conoces los atributos de tus propios jugadores');return}
  const free=state.scouting.staff.filter(sc=>!activeScoutAssignment(sc.id));
  if(!free.length){toast('Todos tus ojeadores están ocupados');return}
  const current=knownOverall(p,ownerClub),back=modal(`<div class="modal-head"><div><div class="eyebrow">Asignar scouting</div><h2 style="margin:2px 0">${fullName(p)}</h2><div class="muted">Conocimiento actual: ${current.text}</div></div><button class="btn" data-close>Cerrar</button></div><div class="form-grid"><div class="field"><label>Ojeador</label><select id="scoutSelect">${free.map(sc=>`<option value="${sc.id}">${sc.name} · Actual ${Math.round(sc.judgingCurrent)} · Pot. ${Math.round(sc.judgingPotential)}</option>`).join('')}</select></div><div class="field"><label>Tipo de informe</label><select id="reportType"><option value="QUICK">Rápido · 3 días</option><option value="FULL">Completo · 15 días</option></select></div></div><div class="note" style="margin-top:14px">El informe rápido reduce bastante la incertidumbre. El completo revela rangos muy precisos, potencial y personalidad.</div><div class="modal-actions"><button class="btn primary" id="startScout">Asignar ojeador</button></div>`);
  back.querySelector('[data-close]').onclick=()=>back.remove();
  back.querySelector('#startScout').onclick=()=>{if(startScouting(p.id,+back.querySelector('#scoutSelect').value,back.querySelector('#reportType').value)){back.remove();render()}};
}

function renderContracts(root){
  const uc=userClub(),list=uc.roster.slice().sort((a,b)=>a.contractYears-b.contractYears||BBGM.overall(b)-BBGM.overall(a));
  root.innerHTML=`<div class="card"><div class="summary-strip"><div><span class="muted">Masa salarial</span><b>${fmtMoney(wageBill(uc))}</b></div><div><span class="muted">Límite</span><b>${fmtMoney(uc.salaryBudget)}</b></div><div><span class="muted">Margen</span><b>${fmtMoney(availableWage(uc))}</b></div></div><div class="table-wrap"><table><thead><tr><th>Jugador</th><th>OVR</th><th>Rol prometido</th><th>Salario</th><th>Años</th><th>Cláusula</th><th>Transferible</th><th></th></tr></thead><tbody>${list.map(p=>`<tr><td><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button></td><td>${Math.round(BBGM.overall(p))}</td><td>${roleLabel[p.promisedRole]||roleLabel[p.role]}</td><td>${fmtMoney(p.salary)}</td><td><b class="${p.contractYears===1?'warn':''}">${p.contractYears}</b></td><td>${p.releaseClause?fmtMoney(p.releaseClause):'—'}</td><td><label class="switch-row"><input type="checkbox" data-listed="${p.id}" ${p.transferListed?'checked':''}> Sí</label></td><td><button class="btn small" data-renew="${p.id}">Renovar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  bindProfileButtons(root);
  root.querySelectorAll('[data-listed]').forEach(ch=>ch.onchange=()=>{const p=uc.roster.find(x=>x.id===+ch.dataset.listed);p.transferListed=ch.checked;saveLocal(false);toast(ch.checked?'Jugador puesto en el mercado':'Jugador retirado del mercado')});
  root.querySelectorAll('[data-renew]').forEach(b=>b.onclick=()=>openContractNegotiation(uc.roster.find(x=>x.id===+b.dataset.renew),{type:'RENEW'}));
}

function renderOffers(root){
  const offers=state.inbox.filter(e=>e.type==='TRANSFER_OFFER');
  root.innerHTML=`<div class="card"><h3>Ofertas por tus jugadores</h3>${offers.length?offers.map(e=>{const loc=playerLocation(e.playerId),buyer=club(e.fromClubId);return `<div class="offer-card ${e.resolved?'resolved':''}"><div><b>${loc?fullName(loc.player):'Jugador transferido'}</b><div class="muted">${buyer?buyer.name:'Club'} · ${fmtMoney(e.fee)}</div></div><div>${e.resolved?`<span class="pill">${e.decision==='ACCEPTED'?'Aceptada':'Rechazada'}</span>`:`<button class="btn small good" data-offer-accept="${e.id}">Aceptar</button> <button class="btn small" data-offer-reject="${e.id}">Rechazar</button>`}</div></div>`}).join(''):'<p class="muted">Todavía no has recibido ofertas.</p>'}</div>${state.marketNews.length?`<div class="card" style="margin-top:16px"><h3>Movimientos del mercado</h3>${state.marketNews.slice(0,12).map(n=>`<div class="news-line"><span class="muted">${n.date}</span><span>${n.text}</span></div>`).join('')}</div>`:''}`;
  bindInboxActions(root);
}

function renderCoachMarket(root){
  const c=userClub(),current=c.coach,list=(state.world.coachMarket||[]).slice().sort((a,b)=>b.reputation-a.reputation);
  root.innerHTML=`<div class="grid two"><div class="card"><div class="eyebrow">Entrenador actual</div><h3>${current.name}</h3><div class="stat-row"><span>Ataque</span><b>${Math.round(current.offense)}</b></div><div class="stat-row"><span>Defensa</span><b>${Math.round(current.defense)}</b></div><div class="stat-row"><span>Desarrollo</span><b>${Math.round(current.development)}</b></div><div class="stat-row"><span>Gestión de grupo</span><b>${Math.round(current.manManagement)}</b></div><div class="stat-row"><span>Confianza jóvenes</span><b>${Math.round(current.youthTrust)}</b></div><div class="stat-row"><span>Salario</span><b>${fmtMoney(current.salary||0)}</b></div></div><div class="card"><h3>Presupuesto de staff</h3><div class="stat-row"><span>Presupuesto anual</span><b>${fmtMoney(c.staffBudget)}</b></div><div class="stat-row"><span>Coste actual</span><b>${fmtMoney(staffCost())}</b></div><div class="stat-row"><span>Margen</span><b>${fmtMoney(availableStaff())}</b></div><p class="table-note">Al contratar un entrenador, el anterior pasa al mercado. No hay indemnización en este prototipo.</p></div></div><div class="card" style="margin-top:16px"><h3>Entrenadores disponibles</h3><div class="table-wrap"><table><thead><tr><th>Entrenador</th><th>Rep.</th><th>Ataque</th><th>Defensa</th><th>Desarrollo</th><th>Grupo</th><th>Jóvenes</th><th>Salario</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td><b>${x.name}</b><div class="tiny">${x.nationality} · ${x.age} años</div></td><td>${Math.round(x.reputation)}</td><td>${Math.round(x.offense)}</td><td>${Math.round(x.defense)}</td><td>${Math.round(x.development)}</td><td>${Math.round(x.manManagement)}</td><td>${Math.round(x.youthTrust)}</td><td>${fmtMoney(x.salary)}</td><td><button class="btn small good" data-hire-coach="${x.id}">Contratar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  root.querySelectorAll('[data-hire-coach]').forEach(b=>b.onclick=()=>hireCoach(+b.dataset.hireCoach));
}
function hireCoach(id){
  const c=userClub(),idx=(state.world.coachMarket||[]).findIndex(x=>x.id===id);if(idx<0)return;
  const candidate=state.world.coachMarket[idx],scouts=(state.scouting.staff||[]).reduce((s,x)=>s+(x.salary||0),0);
  if(candidate.salary+scouts>c.staffBudget){toast('Ese entrenador supera tu presupuesto de staff');return}
  const old=c.coach;c.coach={...candidate};state.world.coachMarket.splice(idx,1);state.world.coachMarket.push({...old});
  addInbox('STAFF','Nuevo entrenador',`${candidate.name} se incorpora como entrenador principal.`);saveLocal(false);render();toast('Entrenador contratado');
}
function renderScoutMarket(root){
  const hired=state.scouting.staff||[],list=(state.world.scoutMarket||[]).slice().sort((a,b)=>(b.judgingCurrent+b.judgingPotential)-(a.judgingCurrent+a.judgingPotential));
  root.innerHTML=`<div class="card"><div class="section-inline"><div><h3>Ojeadores contratados</h3><div class="muted">${hired.length}/3 plazas ocupadas</div></div><span class="pill">Margen staff ${fmtMoney(availableStaff())}</span></div>${hired.map(sc=>{const busy=activeScoutAssignment(sc.id);return `<div class="staff-row"><div><b>${sc.name}</b><div class="tiny">${sc.nationality||''} · ${sc.region==='USA'?'USA':sc.region==='YOUTH'?'Jóvenes':'Europa'} · ${fmtMoney(sc.salary||0)}</div></div><div class="staff-metrics"><span>Actual <b>${Math.round(sc.judgingCurrent)}</b></span><span>Pot. <b>${Math.round(sc.judgingPotential)}</b></span><span>Vel. <b>${Math.round(sc.speed)}</b></span></div><button class="btn small" data-fire-scout="${sc.id}" ${busy?'disabled':''}>${busy?'Ocupado':'Despedir'}</button></div>`}).join('')}</div><div class="card" style="margin-top:16px"><h3>Mercado de ojeadores</h3><div class="table-wrap"><table><thead><tr><th>Ojeador</th><th>Actual</th><th>Potencial</th><th>Velocidad</th><th>Europa</th><th>USA</th><th>Jóvenes</th><th>Salario</th><th></th></tr></thead><tbody>${list.map(x=>`<tr><td><b>${x.name}</b><div class="tiny">${x.nationality} · ${x.age} años</div></td><td>${Math.round(x.judgingCurrent)}</td><td>${Math.round(x.judgingPotential)}</td><td>${Math.round(x.speed)}</td><td>${Math.round(x.europe)}</td><td>${Math.round(x.usa)}</td><td>${Math.round(x.youth)}</td><td>${fmtMoney(x.salary)}</td><td><button class="btn small good" data-hire-scout="${x.id}" ${hired.length>=3?'disabled':''}>Contratar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  root.querySelectorAll('[data-hire-scout]').forEach(b=>b.onclick=()=>hireScout(+b.dataset.hireScout));
  root.querySelectorAll('[data-fire-scout]').forEach(b=>b.onclick=()=>fireScout(+b.dataset.fireScout));
}
function hireScout(id){
  if(state.scouting.staff.length>=3){toast('Ya tienes las 3 plazas de ojeador ocupadas');return}
  const idx=(state.world.scoutMarket||[]).findIndex(x=>x.id===id);if(idx<0)return;const candidate=state.world.scoutMarket[idx];
  if(staffCost()+candidate.salary>userClub().staffBudget){toast('Ese ojeador supera tu presupuesto de staff');return}
  state.world.scoutMarket.splice(idx,1);state.scouting.staff.push({...candidate});addInbox('STAFF','Nuevo ojeador',`${candidate.name} se incorpora al departamento de scouting.`);saveLocal(false);render();toast('Ojeador contratado');
}
function fireScout(id){
  const idx=state.scouting.staff.findIndex(x=>x.id===id);if(idx<0)return;if(activeScoutAssignment(id)){toast('No puedes despedir a un ojeador con un informe activo');return}
  const [sc]=state.scouting.staff.splice(idx,1);state.world.scoutMarket.push({...sc});saveLocal(false);render();toast('Ojeador despedido');
}

function academyTabs(){return `<div class="tabs market-tabs"><button data-academy-tab="bteam" class="${academyTab==='bteam'?'active':''}">Equipo B</button><button data-academy-tab="loans" class="${academyTab==='loans'?'active':''}">Cedidos</button><button data-academy-tab="development" class="${academyTab==='development'?'active':''}">Desarrollo</button></div>`}
function bStatAverages(p){const s=state.academy.bStats[p.id]||academyStatLine(),g=Math.max(1,s.games);return {g:s.games,min:s.minutes/g,pts:s.points/g,reb:s.rebounds/g,ast:s.assists/g,val:s.value/g}}
function renderAcademy(v){
  ensureAcademy();v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Formación</div><h1>Cantera</h1><p>Gestiona el equipo B, observa su evolución y decide cuándo promocionar o ceder a cada joven.</p></div><span class="pill">${state.academy.players.length} jugadores en el B</span></div>${academyTabs()}<div id="academyContent"></div>`;
  v.querySelectorAll('[data-academy-tab]').forEach(b=>b.onclick=()=>{academyTab=b.dataset.academyTab;renderAcademy(v)});const root=v.querySelector('#academyContent');
  if(academyTab==='bteam'){
    const list=state.academy.players.slice().sort((a,b)=>b.potentialReal-a.potentialReal||BBGM.overall(b)-BBGM.overall(a));
    root.innerHTML=`<div class="card"><div class="table-wrap academy-table-wrap"><table class="academy-table"><thead><tr><th>Jugador</th><th>Edad</th><th>Pos.</th><th>OVR</th><th>Potencial est.</th><th>PJ</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>VAL</th><th>Entrenamiento</th><th>Informe</th><th>1er equipo</th><th class="academy-actions-col">Acciones</th></tr></thead><tbody>${list.map(p=>{const a=bStatAverages(p);return `<tr><td><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button><div class="tiny muted">${p.nationality}</div><div class="academy-mobile-actions"><button class="btn tiny-btn good" data-promote="${p.id}">Subir</button><button class="btn tiny-btn" data-loan-youth="${p.id}">Ceder</button></div></td><td>${p.age}</td><td>${positionText(p)}</td><td><b>${Math.round(BBGM.overall(p))}</b></td><td>${knownPotential(p,userClub())}</td><td>${a.g}</td><td>${a.g?a.min.toFixed(1):'—'}</td><td>${a.g?a.pts.toFixed(1):'—'}</td><td>${a.g?a.reb.toFixed(1):'—'}</td><td>${a.g?a.ast.toFixed(1):'—'}</td><td>${a.g?a.val.toFixed(1):'—'}</td><td><select data-academy-focus="${p.id}">${Object.entries(focusLabel).map(([k,l])=>`<option value="${k}" ${p.trainingFocus===k?'selected':''}>${l}</option>`).join('')}</select></td><td><span class="pill ${youthReadiness(p).cls}">${youthReadiness(p).label}</span></td><td><label class="tiny-check"><input type="checkbox" data-first-team-train="${p.id}" ${p.trainWithFirstTeam?'checked':''}> Entrenar arriba</label></td><td class="academy-actions-col"><div class="action-stack"><button class="btn small good" data-promote="${p.id}">Subir</button><button class="btn small" data-loan-youth="${p.id}">Ceder</button></div></td></tr>`}).join('')}</tbody></table></div><div class="table-note">En pantallas estrechas puedes deslizar la tabla horizontalmente. Los botones Subir/Ceder permanecen accesibles junto al nombre del jugador. No se muestran resultados del equipo B: solo estadísticas individuales.</div></div>`;
    root.querySelectorAll('[data-academy-focus]').forEach(e=>e.onchange=()=>{state.academy.players.find(p=>p.id===+e.dataset.academyFocus).trainingFocus=e.value;saveLocal(false);toast('Entrenamiento actualizado')});root.querySelectorAll('[data-first-team-train]').forEach(e=>e.onchange=()=>setFirstTeamTraining(+e.dataset.firstTeamTrain,e.checked));root.querySelectorAll('[data-promote]').forEach(b=>b.onclick=()=>promoteYouth(+b.dataset.promote));root.querySelectorAll('[data-loan-youth]').forEach(b=>b.onclick=()=>{const p=state.academy.players.find(x=>x.id===+b.dataset.loanYouth);if(p)openLoanDialog(p,'B')});bindProfileButtons(root);
  }else if(academyTab==='loans'){
    const loans=state.academy.loans.filter(x=>x.status==='ACTIVE');root.innerHTML=`<div class="card">${loans.length?loans.map(l=>{const s=l.stats,g=Math.max(1,s.games);return `<div class="loan-row"><div><button class="link-btn" data-profile="${l.player.id}">${fullName(l.player)}</button><div class="tiny muted">${positionText(l.player)} · ${l.player.age} años · cedido en ${club(l.loanClubId).name}</div></div><div class="loan-stats"><span>PJ <b>${s.games}</b></span><span>MIN <b>${s.games?(s.minutes/g).toFixed(1):'—'}</b></span><span>PTS <b>${s.games?(s.points/g).toFixed(1):'—'}</b></span><span>REB <b>${s.games?(s.rebounds/g).toFixed(1):'—'}</b></span><span>AST <b>${s.games?(s.assists/g).toFixed(1):'—'}</b></span></div></div>`}).join(''):'<p class="muted">No tienes jugadores cedidos actualmente.</p>'}</div>`;bindProfileButtons(root);
  }else{
    const people=[...state.academy.players,...state.academy.loans.filter(x=>x.status==='ACTIVE').map(x=>x.player),...userClub().roster.filter(p=>p.age<=23)].filter((p,i,a)=>a.findIndex(x=>x.id===p.id)===i).sort((a,b)=>b.potentialReal-a.potentialReal);
    root.innerHTML=`<div class="card"><h3>Seguimiento de jóvenes</h3>${people.map(p=>{const o=BBGM.overall(p),gap=(p.potentialReal||o)-o;return `<div class="development-row"><div><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button><div class="tiny muted">${positionText(p)} · ${p.age} años · ${p.trainingFocus?focusLabel[p.trainingFocus]:'Equilibrado'}</div></div><div class="dev-meter"><span>OVR ${Math.round(o)}</span><div class="bar"><i style="width:${Math.min(100,Math.max(5,o))}%"></i></div><span>Pot. ${knownPotential(p,userClub())}</span></div><div><span class="pill ${gap>=12?'good-pill':''}">${gap>=12?'Proyección alta':gap>=6?'Margen':'Cerca del techo'}</span>${p.lastDevelopmentDelta!=null?`<div class="tiny ${p.lastDevelopmentDelta>=0?'good':''}" style="margin-top:5px;text-align:right">Último mes ${p.lastDevelopmentDelta>=0?'+':''}${p.lastDevelopmentDelta.toFixed(2)} OVR</div>`:''}</div></div>`}).join('')}</div>`;bindProfileButtons(root);
  }
}

function renderSchedule(v){
  const pending=pendingDecision();
  ensureV17State();const list=state.calendar.filter(m=>m.status!=='CANCELLED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId));const months=[...new Set([...list.map(x=>x.date.slice(0,7)),...(state.preseason?.friendlies||[]).map(x=>x.date.slice(0,7)),state.currentDate.slice(0,7)])].sort();if(!months.includes(scheduleMonth))scheduleMonth=months.find(x=>x>=state.currentDate.slice(0,7))||months[0];state.scheduleUi.mode=scheduleMode;state.scheduleUi.month=scheduleMonth;
  const listHtml=list.map(m=>{const opp=m.homeClubId===state.userClubId?club(m.awayClubId):club(m.homeClubId),home=m.homeClubId===state.userClubId,played=m.status==='PLAYED',win=played?((home&&m.homeScore>m.awayScore)||(!home&&m.awayScore>m.homeScore)):false;return `<div class="schedule-item ${played?'played':''}"><div><b>${m.date}</b><div class="muted tiny">${comp(m.competitionId)?.shortName||m.competitionId}</div></div><div>${home?'vs':'@'} <b>${opp.name}</b><div class="muted tiny">${typeof m.round==='number'?'Jornada '+m.round:m.round}</div></div><div>${played?`<span class="score-chip ${win?'win':'loss'}">${home?m.homeScore:m.awayScore}-${home?m.awayScore:m.homeScore}</span> <button class="btn small" data-box="${m.id}">Stats</button>`:'Pendiente'}</div></div>`}).join('');
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Temporada</div><h1>Calendario y agenda</h1><p>${list.filter(x=>x.status==='PLAYED').length} de ${list.length} partidos oficiales disputados.</p></div><button class="btn primary" id="simNext" ${nextUserMatch()||pending?'':'disabled'}>${pending?'Resolver decisión':'Siguiente partido'}</button></div><div class="calendar-toolbar"><div class="tabs"><button data-schedule-mode="month" class="${scheduleMode==='month'?'active':''}">Mes</button><button data-schedule-mode="list" class="${scheduleMode==='list'?'active':''}">Lista</button></div><select id="scheduleMonth">${months.map(m=>`<option value="${m}" ${m===scheduleMonth?'selected':''}>${new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(new Date(m+'-01T12:00:00'))}</option>`).join('')}</select></div><div class="grid schedule-layout"><div class="card">${scheduleMode==='month'?monthCalendarHtml(scheduleMonth):listHtml}</div>${contractAgendaHtml()}</div>`;
  const sim=v.querySelector('#simNext');if(sim)sim.onclick=simulateToNextUserMatch;v.querySelectorAll('[data-box]').forEach(b=>b.onclick=()=>{const m=state.calendar.find(x=>x.id===b.dataset.box);showResultModal(m,m.result)});v.querySelectorAll('[data-schedule-mode]').forEach(b=>b.onclick=()=>{scheduleMode=b.dataset.scheduleMode;state.scheduleUi.mode=scheduleMode;saveLocal(false);renderSchedule(v)});v.querySelector('#scheduleMonth').onchange=e=>{scheduleMonth=e.target.value;state.scheduleUi.month=scheduleMonth;saveLocal(false);renderSchedule(v)};bindProfileButtons(v)
}

function renderStandings(v){
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Competiciones</div><h1>Clasificación</h1><p>Temporada completa con los clubes configurados para 2026/27.</p></div></div>${state.world.competitions.filter(c=>c.standings).map(c=>`<div class="card" style="margin-bottom:16px"><h3>${c.name}</h3><div class="table-wrap"><table><thead><tr><th>Equipo</th><th>PJ</th><th>G</th><th>P</th><th>PF</th><th>PC</th><th>Dif</th></tr></thead><tbody>${sortedStandings(c.id).map((r,i)=>`<tr><td>${i+1}. <span class="player-name">${club(r.clubId).name}</span></td><td>${r.gp}</td><td>${r.w}</td><td>${r.l}</td><td>${r.pf}</td><td>${r.pa}</td><td>${r.pf-r.pa>0?'+':''}${r.pf-r.pa}</td></tr>`).join('')}</tbody></table></div></div>`).join('')}`;
}

function aggregatePlayerStats(competitionId){
  const map={};
  for(const m of state.calendar){
    if(m.status!=='PLAYED'||m.competitionId!==competitionId||!m.result)continue;
    for(const [clubId,stats] of [[m.homeClubId,m.result.homeStats],[m.awayClubId,m.result.awayStats]]){
      for(const st of stats){
        if((st.minutes||0)<=0)continue;
        const key=st.playerId;if(!map[key])map[key]={playerId:key,clubId,games:0,minutes:0,points:0,rebounds:0,assists:0,steals:0,blocks:0,turnovers:0,twoMade:0,twoAttempted:0,threeMade:0,threeAttempted:0,ftMade:0,ftAttempted:0,value:0};
        const a=map[key];a.clubId=clubId;a.games++;a.minutes+=st.minutes||0;a.points+=st.points||0;a.rebounds+=(st.offensiveRebounds||0)+(st.defensiveRebounds||0);a.assists+=st.assists||0;a.steals+=st.steals||0;a.blocks+=st.blocks||0;a.turnovers+=st.turnovers||0;a.twoMade+=st.twoMade||0;a.twoAttempted+=st.twoAttempted||0;a.threeMade+=st.threeMade||0;a.threeAttempted+=st.threeAttempted||0;a.ftMade+=st.freeThrowMade||0;a.ftAttempted+=st.freeThrowAttempted||0;
        a.value+=(st.points||0)+(st.offensiveRebounds||0)+(st.defensiveRebounds||0)+(st.assists||0)+(st.steals||0)+(st.blocks||0)-(st.turnovers||0)-((st.twoAttempted||0)-(st.twoMade||0))-((st.threeAttempted||0)-(st.threeMade||0))-((st.freeThrowAttempted||0)-(st.freeThrowMade||0));
      }
    }
  }
  return Object.values(map).map(a=>{const loc=playerLocation(a.playerId),g=Math.max(1,a.games);return {...a,player:loc?.player||null,club:club(a.clubId),mpg:a.minutes/g,ppg:a.points/g,rpg:a.rebounds/g,apg:a.assists/g,spg:a.steals/g,bpg:a.blocks/g,tovpg:a.turnovers/g,valpg:a.value/g,twoPct:a.twoAttempted?a.twoMade/a.twoAttempted*100:0,threePct:a.threeAttempted?a.threeMade/a.threeAttempted*100:0,ftPct:a.ftAttempted?a.ftMade/a.ftAttempted*100:0}}).filter(x=>x.player);
}
function stableUnit(seed){let x=(Number(seed)||1)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return ((x>>>0)%100000)/100000}
function externalLeagueGames(leagueName){
  const start=`${seasonStartYear()}-${leagueName==='NBA'?'10-20':'10-01'}`;if(state.currentDate<start)return 0;
  const elapsed=Math.max(0,dateDiffDays(start,state.currentDate));const maxGames=leagueName==='NBA'?82:leagueName==='Primera FEB'?34:34;const seasonDays=leagueName==='NBA'?174:190;return Math.min(maxGames,Math.floor(elapsed/seasonDays*maxGames));
}
function aggregateExternalLeagueStats(leagueName){
  const teams=state.world.clubs.filter(c=>c.leagueName===leagueName),games=externalLeagueGames(leagueName);if(!games)return [];
  const nba=leagueName==='NBA',rows=[];
  for(const c of teams){
    let rot;try{rot=BBGM.rotation(c)}catch(_e){rot={playerMinutes:Object.fromEntries(c.roster.map((p,i)=>[p.id,Math.max(4,32-i*2)]))}}
    for(const p of c.roster){
      const a=p.attributes||{},t=p.tendencies||{},mins=BBGM.clamp(rot.playerMinutes?.[p.id]??14,2,36),noise=(stableUnit(p.id*97+seasonStartYear()*13)-.5);
      const offense=((a.finishing||50)+(a.midRange||50)+(a.threePoint||50)+(a.shotCreation||50))/4,usage=t.usage??50;
      const ppg=Math.max(1,mins*(.12+offense/100*.34+usage/100*.32)*(nba?1.08:1)*(1+noise*.05));
      const rebSkill=((a.defensiveRebound||40)*.72+(a.offensiveRebound||35)*.28),rpg=Math.max(.4,mins*(.045+rebSkill/100*.29)*(1+noise*.06));
      const apg=Math.max(.3,mins*(.018+(a.passing||45)/100*.16+(a.ballHandling||45)/100*.055+(a.basketballIq||50)/100*.035)*(1+noise*.06));
      const spg=Math.max(.1,mins*(.008+(a.steal||45)/100*.034));const bpg=Math.max(.05,mins*(.004+(a.block||35)/100*.038));const tovpg=Math.max(.4,mins*(.012+usage/100*.045+(100-(a.decisionMaking||50))/100*.018));
      const twoPct=BBGM.clamp(41+((a.finishing||50)+(a.midRange||50))/200*19+noise*1.8,38,68),threePct=BBGM.clamp(25+(a.threePoint||50)/100*18+noise*1.8,22,47),ftPct=BBGM.clamp(55+(a.freeThrow||60)/100*35+noise*1.4,50,94);
      const valpg=ppg+rpg+apg+spg+bpg-tovpg-((100-twoPct)/100*3)-((100-threePct)/100*2);
      const threeShare=BBGM.clamp(.22+((t.threePointTendency??50)-50)/180,.12,.62),fieldEff=((twoPct/100)*(1-threeShare)+(threePct/100)*1.5*threeShare)*100,tsEst=BBGM.clamp(fieldEff+3.2,42,72);
      rows.push({playerId:p.id,clubId:c.id,games,minutes:mins*games,points:ppg*games,rebounds:rpg*games,assists:apg*games,steals:spg*games,blocks:bpg*games,turnovers:tovpg*games,player:p,club:c,mpg:mins,ppg,rpg,apg,spg,bpg,tovpg,valpg,twoPct,threePct,ftPct,efgPct:fieldEff,tsPct:tsEst,synthetic:true});
    }
  }
  return rows;
}
function statisticsSources(){
  const simulated=state.world.competitions.filter(c=>['ACB','EL','COPA','SUPERCOPA','ACB_PO','EL_PO','EL_PI','EL_F4'].includes(c.id)).map(c=>({value:c.id,label:c.name,type:'COMP'}));
  const external=(state.world.leagues||[]).map(l=>l.name).filter(name=>name!=='Liga ACB').sort().map(name=>({value:`LEAGUE:${name}`,label:name,type:'LEAGUE'}));
  return [...simulated,...external];
}
function renderStatistics(v){
  ensureV16State();const sources=statisticsSources();if(!sources.length)return;if(!sources.some(x=>x.value===statsCompetition))statsCompetition=sources[0].value;
  const source=sources.find(x=>x.value===statsCompetition)||sources[0],isLeague=source.type==='LEAGUE';let list=cachedStatistics(source).filter(x=>x.games>=statsMinGames);
  const sortMapBasic={points:'ppg',rebounds:'rpg',assists:'apg',value:'valpg',minutes:'mpg',three:'threePct'};
  const sortMapAdv={ts:'tsPct',efg:'efgPct',pts36:'pts36',astto:'astTo',val36:'val36'};const sortMap=statsMode==='advanced'?sortMapAdv:sortMapBasic;
  if(!sortMap[statsSort])statsSort=statsMode==='advanced'?'ts':'points';const key=sortMap[statsSort];list.sort((a,b)=>b[key]-a[key]||b.games-a.games);
  const total=list.length,totalPages=Math.max(1,Math.ceil(total/STATS_PAGE_SIZE));statsPage=BBGM.clamp(statsPage,1,totalPages);const pageRows=list.slice((statsPage-1)*STATS_PAGE_SIZE,statsPage*STATS_PAGE_SIZE);
  const simOptions=sources.filter(x=>x.type==='COMP').map(x=>`<option value="${x.value}" ${x.value===source.value?'selected':''}>${x.label}</option>`).join(''),leagueOptions=sources.filter(x=>x.type==='LEAGUE').map(x=>`<option value="${x.value}" ${x.value===source.value?'selected':''}>${x.label}</option>`).join('');
  const leader=(k,label,fmt=x=>x.toFixed(1))=>{const r=list.slice().sort((a,b)=>b[k]-a[k])[0];return `<div class="stat-leader"><small>${label}</small><b>${r?fmt(r[k]):'—'}</b><span>${r?fullName(r.player):'Sin datos'}</span></div>`};
  const basicHead='<th>#</th><th>Jugador</th><th>Club</th><th>POS</th><th>PJ</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>ROB</th><th>TAP</th><th>2P%</th><th>3P%</th><th>TL%</th><th>VAL</th>';
  const advHead='<th>#</th><th>Jugador</th><th>Club</th><th>POS</th><th>PJ</th><th>MIN</th><th>PTS/36</th><th>VAL/36</th><th>TS%</th><th>eFG%</th><th>AST/PÉRD</th><th>PTS</th><th>AST</th><th>PÉRD</th>';
  const rowHtml=(x,i)=>statsMode==='advanced'?`<tr class="${x.clubId===state.userClubId?'user-stat-row':''}"><td>${(statsPage-1)*STATS_PAGE_SIZE+i+1}</td><td><button class="link-btn" data-profile="${x.playerId}">${fullName(x.player)}</button></td><td>${x.club?.shortName||'—'}</td><td>${positionLabel[x.player.primaryPosition]}</td><td>${x.games}</td><td>${x.mpg.toFixed(1)}</td><td><b>${x.pts36.toFixed(1)}</b></td><td>${x.val36.toFixed(1)}</td><td>${x.tsPct.toFixed(1)}</td><td>${x.efgPct.toFixed(1)}</td><td>${x.astTo.toFixed(2)}</td><td>${x.ppg.toFixed(1)}</td><td>${x.apg.toFixed(1)}</td><td>${x.tovpg.toFixed(1)}</td></tr>`:`<tr class="${x.clubId===state.userClubId?'user-stat-row':''}"><td>${(statsPage-1)*STATS_PAGE_SIZE+i+1}</td><td><button class="link-btn" data-profile="${x.playerId}">${fullName(x.player)}</button></td><td>${x.club?.shortName||'—'}</td><td>${positionLabel[x.player.primaryPosition]}</td><td>${x.games}</td><td>${x.mpg.toFixed(1)}</td><td><b>${x.ppg.toFixed(1)}</b></td><td>${x.rpg.toFixed(1)}</td><td>${x.apg.toFixed(1)}</td><td>${x.spg.toFixed(1)}</td><td>${x.bpg.toFixed(1)}</td><td>${x.twoPct.toFixed(1)}</td><td>${x.threePct.toFixed(1)}</td><td>${x.ftPct.toFixed(1)}</td><td>${x.valpg.toFixed(1)}</td></tr>`;
  const sortOptions=statsMode==='advanced'?`<option value="ts" ${statsSort==='ts'?'selected':''}>TS%</option><option value="efg" ${statsSort==='efg'?'selected':''}>eFG%</option><option value="pts36" ${statsSort==='pts36'?'selected':''}>Puntos / 36</option><option value="val36" ${statsSort==='val36'?'selected':''}>Valoración / 36</option><option value="astto" ${statsSort==='astto'?'selected':''}>AST / pérdida</option>`:`<option value="points" ${statsSort==='points'?'selected':''}>Puntos</option><option value="rebounds" ${statsSort==='rebounds'?'selected':''}>Rebotes</option><option value="assists" ${statsSort==='assists'?'selected':''}>Asistencias</option><option value="value" ${statsSort==='value'?'selected':''}>Valoración</option><option value="minutes" ${statsSort==='minutes'?'selected':''}>Minutos</option><option value="three" ${statsSort==='three'?'selected':''}>% Triple</option>`;
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Rendimiento</div><h1>Estadísticas</h1><p>Compara producción básica y eficiencia avanzada en todo el universo.</p></div></div><div class="card"><div class="stats-filters stats-filters-v16"><div class="field"><label>Competición / liga</label><select id="statsComp"><optgroup label="Competiciones simuladas">${simOptions}</optgroup><optgroup label="Otras ligas">${leagueOptions}</optgroup></select></div><div class="field"><label>Vista</label><select id="statsMode"><option value="basic" ${statsMode==='basic'?'selected':''}>Básica</option><option value="advanced" ${statsMode==='advanced'?'selected':''}>Avanzada</option></select></div><div class="field"><label>Ordenar por</label><select id="statsSort">${sortOptions}</select></div><div class="field"><label>Mínimo PJ</label><input id="statsMinGames" type="number" min="0" max="82" value="${statsMinGames}"></div></div>${isLeague?`<div class="table-note">Liga externa con simulación ligera. Los indicadores avanzados son estimaciones coherentes con el perfil y la producción generada.</div>`:''}</div>
  <div class="stats-leaders">${statsMode==='advanced'?leader('tsPct','Mejor TS%',x=>x.toFixed(1)+'%')+leader('efgPct','Mejor eFG%',x=>x.toFixed(1)+'%')+leader('pts36','PTS / 36'):leader('ppg','Máximo anotador')+leader('rpg','Rebotes')+leader('apg','Asistencias')}</div>
  <div class="card" style="margin-top:16px">${pageRows.length?`<div class="table-wrap"><table><thead><tr>${statsMode==='advanced'?advHead:basicHead}</tr></thead><tbody>${pageRows.map(rowHtml).join('')}</tbody></table></div><div class="pagination"><button class="btn small" id="statsPrev" ${statsPage<=1?'disabled':''}>← Anterior</button><span>${total} jugadores · página ${statsPage} de ${totalPages}</span><button class="btn small" id="statsNext" ${statsPage>=totalPages?'disabled':''}>Siguiente →</button></div>`:`<p class="muted">Todavía no hay suficientes partidos/fecha de temporada para mostrar estadísticas con estos filtros.</p>`}</div>`;
  v.querySelector('#statsComp').onchange=e=>{statsCompetition=e.target.value;statsPage=1;renderStatistics(v)};v.querySelector('#statsMode').onchange=e=>{statsMode=e.target.value;state.statsPreferences.mode=statsMode;statsSort=statsMode==='advanced'?'ts':'points';statsPage=1;saveLocal(false);renderStatistics(v)};v.querySelector('#statsSort').onchange=e=>{statsSort=e.target.value;statsPage=1;renderStatistics(v)};v.querySelector('#statsMinGames').onchange=e=>{statsMinGames=Math.max(0,+e.target.value||0);state.statsPreferences.minGames=statsMinGames;statsPage=1;saveLocal(false);renderStatistics(v)};const prev=v.querySelector('#statsPrev'),next=v.querySelector('#statsNext');if(prev)prev.onclick=()=>{statsPage--;renderStatistics(v)};if(next)next.onclick=()=>{statsPage++;renderStatistics(v)};bindProfileButtons(v);
}


function appendCoachExtras(v){ensureV12State();const req=state.coachManagement.squadRequest;v.insertAdjacentHTML('beforeend',`<div class="grid two" style="margin-top:16px"><div class="card"><div class="eyebrow">Jerarquía del entrenador</div><h3>Confianza en jugadores</h3>${userClub().roster.slice().sort((a,b)=>coachTrust(b)-coachTrust(a)).slice(0,10).map(p=>`<div class="coach-trust-row"><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button><div class="mini-meter"><i style="width:${coachTrust(p)}%"></i></div><b>${coachTrust(p)}</b></div>`).join('')}</div><div class="card"><div class="eyebrow">Petición deportiva</div><h3>${req?.status==='PENDING'?`Reforzar ${positionLabel[req.position]}`:'Plan acordado'}</h3>${req?.status==='PENDING'?`<p>El entrenador considera que la principal necesidad es <b>${positionLabel[req.position]}</b> (severidad ${req.severity}).</p>${req.exitPlayerId&&playerLocation(req.exitPlayerId)?`<p class="tiny muted">Además tiene poca confianza en ${fullName(playerLocation(req.exitPlayerId).player)}.</p>`:''}<div class="action-row"><button class="btn good" id="acceptCoachNeed">Aceptar prioridad</button><button class="btn" id="declineCoachNeed">No estoy de acuerdo</button></div>`:`<p class="muted">${req?.status==='ACCEPTED'?'Has aceptado la prioridad del entrenador.':'Has decidido seguir otro criterio deportivo.'}</p>`}<div class="stat-row"><span>Intervenciones este mes</span><b>${state.coachManagement.interventions?.count||0}</b></div><p class="tiny muted">A partir de 4-5 intervenciones en rotaciones durante el mismo mes, el entrenador puede sentir que invades su autonomía.</p></div></div>`);const ac=v.querySelector('#acceptCoachNeed');if(ac)ac.onclick=()=>{req.status='ACCEPTED';state.planning.priorityPosition=req.position;state.coachManagement.relationship=BBGM.clamp(state.coachManagement.relationship+3,0,100);saveLocal(false);render();toast('Prioridad acordada')};const dc=v.querySelector('#declineCoachNeed');if(dc)dc.onclick=()=>{req.status='DECLINED';state.coachManagement.relationship=BBGM.clamp(state.coachManagement.relationship-2.5,0,100);saveLocal(false);render();toast('El entrenador no comparte tu decisión')};bindProfileButtons(v)}

function renderCoachOffice(v){
  const c=userClub(),rot=BBGM.rotation(c),rel=coachRelationshipInfo();
  const players=c.roster.slice().sort((a,b)=>(rot.playerMinutes[b.id]||0)-(rot.playerMinutes[a.id]||0));
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Despacho técnico</div><h1>Hablar con el entrenador</h1><p>Pide temporalmente más minutos o más descanso para un jugador sin cambiar su rol contractual.</p></div><button class="btn" id="backMore">Volver</button></div>
  <div class="grid two"><div class="card"><h3>${c.coach.name}</h3><div class="stat-row"><span>Relación contigo</span><b>${rel.value}/100 · ${rel.label}</b></div><div class="stat-row"><span>Gestión de grupo</span><b>${Math.round(c.coach.manManagement)}</b></div><div class="stat-row"><span>Ataque</span><b>${Math.round(c.coach.offense)}</b></div><div class="stat-row"><span>Defensa</span><b>${Math.round(c.coach.defense)}</b></div><div class="stat-row"><span>Desarrollo</span><b>${Math.round(c.coach.development)}</b></div><p class="muted tiny">El entrenador puede aceptar o rechazar una petición según su criterio, vuestra relación, la calidad del jugador, la fatiga y el equilibrio de la rotación.</p></div><div class="card"><h3>Cómo funciona</h3><p class="muted">Una petición aceptada dura varios partidos. <b>Más minutos</b> suele añadir unos 5 minutos y se los quita sobre todo a jugadores de posiciones similares. <b>Más descanso</b> reduce alrededor de 6 minutos y beneficia la recuperación.</p><div class="stat-row"><span>Peticiones activas</span><b>${Object.keys(c.coachMinuteRequests||{}).length}</b></div></div></div>
  <div class="card" style="margin-top:16px"><div class="table-wrap"><table><thead><tr><th>Jugador</th><th>Pos.</th><th>Rol</th><th>Min. previstos</th><th>Moral</th><th>Fatiga</th><th>Petición activa</th><th></th></tr></thead><tbody>${players.map(p=>{const req=coachRequestFor(p),mor=moraleInfo(p.state.morale),mins=rot.playerMinutes[p.id]||0;return `<tr><td><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button></td><td>${positionText(p)}</td><td>${roleLabel[p.role]}</td><td><b>${Math.round(mins)}/40</b></td><td><span class="morale-pill ${mor.cls}">${Math.round(p.state.morale)}</span></td><td>${Math.round(p.state.fatigue||0)}</td><td>${req?`${req.adjustment>0?'+':''}${req.adjustment} min · ${req.gamesLeft} PJ`:'—'}</td><td><div class="action-row"><button class="btn small good" data-coach-more="${p.id}" ${req?'disabled':''}>Más minutos</button><button class="btn small" data-coach-rest="${p.id}" ${req?'disabled':''}>Más descanso</button></div></td></tr>`}).join('')}</tbody></table></div></div>`;
  v.querySelector('#backMore').onclick=()=>{currentView='more';render()};v.querySelectorAll('[data-coach-more]').forEach(b=>b.onclick=()=>askCoachForMinutes(+b.dataset.coachMore,'MORE'));v.querySelectorAll('[data-coach-rest]').forEach(b=>b.onclick=()=>askCoachForMinutes(+b.dataset.coachRest,'REST'));bindProfileButtons(v);appendCoachExtras(v);
}

function renderPlanning(v){ensureV12State();const needs=allSquadNeeds(),rot=BBGM.rotation(userClub());v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Dirección deportiva</div><h1>Planificación de plantilla</h1><p>Profundidad por posición, minutos previstos y prioridades de mercado.</p></div><button class="btn" id="backMore">← Más</button></div><div class="grid five depth-grid">${needs.slice().sort((a,b)=>['PG','SG','SF','PF','C'].indexOf(a.pos)-['PG','SG','SF','PF','C'].indexOf(b.pos)).map(n=>`<div class="card depth-card"><div class="section-inline"><h3>${positionLabel[n.pos]}</h3><span class="pill need-${n.label.toLowerCase()}">${n.label}</span></div>${n.depth.slice(0,4).map((x,i)=>`<div class="depth-player"><span>${i+1}. <button class="link-btn" data-profile="${x.p.id}">${fullName(x.p)}</button></span><b>${Math.round(x.ovr)} · ${Math.round(rot.playerMinutes[x.p.id]||0)}m</b></div>`).join('')||'<p class="bad">Sin jugadores</p>'}<button class="btn small ${state.planning.priorityPosition===n.pos?'good':''}" data-priority="${n.pos}">${state.planning.priorityPosition===n.pos?'Prioridad activa':'Marcar prioridad'}</button></div>`).join('')}</div><div class="card" style="margin-top:16px"><div class="section-inline"><div><div class="eyebrow">Jerarquía prevista</div><h3>Primera y segunda unidad</h3></div><span class="pill">Según minutos del entrenador</span></div>${(()=>{const rr=Object.entries(rot.playerMinutes).map(([id,min])=>({p:userClub().roster.find(x=>x.id===+id),min})).filter(x=>x.p).sort((a,b)=>b.min-a.min);const first=rr.slice(0,5),second=rr.slice(5,10);return `<div class="unit-grid"><div><div class="eyebrow">Primera unidad</div>${first.map(x=>`<div class="unit-player"><button class="link-btn" data-profile="${x.p.id}">${fullName(x.p)}</button><b>${Math.round(x.min)}m</b></div>`).join('')}</div><div><div class="eyebrow">Segunda unidad</div>${second.map(x=>`<div class="unit-player"><button class="link-btn" data-profile="${x.p.id}">${fullName(x.p)}</button><b>${Math.round(x.min)}m</b></div>`).join('')}</div></div>`})()}</div><div class="card" style="margin-top:16px"><h3>Diagnóstico</h3>${needs.map(n=>`<div class="objective-row"><div><b>${positionLabel[n.pos]}</b><small>${n.depth.length} opciones · mejor ${n.depth[0]?Math.round(n.depth[0].ovr):'—'} · segunda ${n.depth[1]?Math.round(n.depth[1].ovr):'—'}</small></div><span class="pill need-${n.label.toLowerCase()}">Necesidad ${n.label.toLowerCase()}</span></div>`).join('')}</div>`;v.querySelector('#backMore').onclick=()=>{currentView='more';render()};v.querySelectorAll('[data-priority]').forEach(b=>b.onclick=()=>setPlanningPriority(state.planning.priorityPosition===b.dataset.priority?null:b.dataset.priority));bindProfileButtons(v)}
function renderLockerRoom(v){ensureV12State();const r=userClub().roster,lm=lockerRoomMetrics(),cap=r.find(p=>p.id===state.lockerRoom.captainId),pairs=[];for(let i=0;i<r.length;i++)for(let j=i+1;j<r.length;j++)pairs.push({a:r[i],b:r[j],v:chemistryPair(r[i],r[j])});pairs.sort((a,b)=>b.v-a.v);const leaders=r.slice().sort((a,b)=>leadershipScore(b)-leadershipScore(a)).slice(0,5);v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Gestión humana</div><h1>Vestuario</h1><p>Moral colectiva, liderazgo y relaciones entre jugadores.</p></div><button class="btn" id="backMore">← Más</button></div><div class="grid three"><div class="card"><div class="eyebrow">Armonía</div><div class="big-metric">${Math.round(lm.harmony)}<small>/100</small></div><h3>${lm.label}</h3><div class="bar"><i style="width:${Math.round(lm.harmony)}%"></i></div></div><div class="card"><div class="eyebrow">Promedios</div><div class="stat-row"><span>Moral</span><b>${Math.round(lm.morale)}</b></div><div class="stat-row"><span>Satisfacción rol</span><b>${Math.round(lm.role)}</b></div><div class="stat-row"><span>Adaptación</span><b>${Math.round(lm.adapt)}</b></div><div class="stat-row"><span>Relaciones</span><b>${Math.round(lm.pairAvg)}</b></div></div><div class="card"><div class="eyebrow">Capitán</div><h3>${cap?fullName(cap):'Sin capitán'}</h3><select id="captainSelect">${leaders.map(p=>`<option value="${p.id}" ${p.id===state.lockerRoom.captainId?'selected':''}>${fullName(p)} · liderazgo ${Math.round(leadershipScore(p))}</option>`).join('')}</select><button class="btn small good" id="setCaptainBtn" style="margin-top:10px">Nombrar capitán</button></div></div><div class="grid two" style="margin-top:16px"><div class="card"><h3>Líderes del grupo</h3>${leaders.map(p=>`<div class="player-line"><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button><span>Moral ${Math.round(p.state.morale)} · Liderazgo ${Math.round(leadershipScore(p))}</span></div>`).join('')}</div><div class="card"><h3>Relaciones destacadas</h3><div class="eyebrow">Mejor conexión</div>${pairs.slice(0,3).map(x=>`<div class="chem-row good"><span>${fullName(x.a)} ↔ ${fullName(x.b)}</span><b>${x.v}</b></div>`).join('')}<div class="eyebrow" style="margin-top:14px">Focos de tensión</div>${pairs.slice(-3).reverse().map(x=>`<div class="chem-row ${x.v<55?'bad':''}"><span>${fullName(x.a)} ↔ ${fullName(x.b)}</span><b>${x.v}</b></div>`).join('')}</div></div><div class="grid two" style="margin-top:16px"><div class="card"><h3>Mentorías</h3>${(state.lockerRoom.mentorPairs||[]).map(m=>{const a=r.find(p=>p.id===m.mentorId),b=playerLocation(m.youngId)?.player;return a&&b?`<div class="player-line"><span>${fullName(a)} → ${fullName(b)}</span><b>${chemistryPair(a,b)}/100</b></div>`:''}).join('')||'<p class="muted">No hay mentorías activas.</p>'}</div><div class="card"><h3>Motivaciones</h3>${r.slice().sort((a,b)=>(b.personality?.ambition||50)-(a.personality?.ambition||50)).slice(0,5).map(p=>{const d=playerDesire(p,userClub());return `<div class="player-line"><button class="link-btn" data-profile="${p.id}">${fullName(p)}</button><span>${d.label}</span></div>`}).join('')}</div></div>`;v.querySelector('#backMore').onclick=()=>{currentView='more';render()};v.querySelector('#setCaptainBtn').onclick=()=>setCaptain(+v.querySelector('#captainSelect').value);bindProfileButtons(v)}

function renderSponsors(v){
  const sp=state.sponsorship||{active:null,offers:[]};
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Finanzas comerciales</div><h1>Patrocinadores</h1><p>Compara ingreso garantizado, potencial máximo y objetivos. Tu reputación comercial influirá en las propuestas futuras.</p></div><button class="btn" id="backMore">Volver</button></div>${sp.active?`<div class="card"><div class="section-inline"><div><div class="eyebrow">Acuerdo activo</div><h2>${sp.active.name}</h2></div><span class="pill good-pill">${sp.active.type}</span></div><div class="stat-row"><span>Ingreso fijo</span><b>${fmtMoney(sp.active.fixed)}</b></div><div class="stat-row"><span>Reputación comercial</span><b>${Math.round(sp.brandReputation||60)}/100</b></div><h3 style="margin-top:18px">Variables</h3>${(sp.active.bonuses||[]).map(b=>`<div class="objective-row"><div><b>${b.label}</b><small>${fmtMoney(b.amount)}</small></div><span class="pill ${sponsorObjectiveAchieved(b.code)?'good-pill':''}">${sponsorObjectiveAchieved(b.code)?'Cumplido':'Pendiente'}</span></div>`).join('')}${sp.lastBonus?`<div class="stat-row" style="margin-top:12px"><span>Último bonus cobrado</span><b>${fmtMoney(sp.lastBonus)}</b></div>`:''}</div>`:`<div class="grid three">${(sp.offers||[]).map(o=>`<div class="card sponsor-offer"><div class="eyebrow">${o.type} · ${o.profile||'Comercial'}</div><h3>${o.name}</h3><div class="sponsor-fixed">${fmtMoney(o.fixed)}<small>garantizados</small></div><div class="stat-row"><span>Valor máximo</span><b>${fmtMoney(sponsorMaxValue(o))}</b></div>${o.bonuses.map(b=>`<div class="stat-row"><span>${b.label}</span><b>+${fmtMoney(b.amount)}</b></div>`).join('')}<button class="btn good" data-sponsor="${o.id}" style="margin-top:14px">Elegir oferta</button></div>`).join('')}</div>`}`;
  v.querySelector('#backMore').onclick=()=>{currentView='more';render()};v.querySelectorAll('[data-sponsor]').forEach(b=>b.onclick=()=>acceptSponsor(b.dataset.sponsor));
}


function renderFinance(v){
  ensureV15State();const uc=userClub(),t=financeTotals(),cats=financeCategoryTotals(),hist=(state.economy.history||[]).slice(-5).reverse(),health=Math.round(uc.financialHealth||65),proj=projectedSeasonResult();
  const rows=(state.economy.entries||[]).slice().reverse().slice(0,35);
  const categoryLabel={MATCHDAY:'Taquilla',OPERATIONS:'Operación partidos',SPONSOR:'Patrocinador fijo',SPONSOR_BONUS:'Bonus patrocinio',PRIZE:'Premios',TRANSFER_IN:'Ventas',TRANSFER_OUT:'Fichajes',BUDGET_MOVE:'Reasignaciones'};
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Gestión económica</div><h1>Finanzas</h1><p>Controla caja, costes, ingresos y el impacto de la temporada sobre el presupuesto futuro.</p></div><button class="btn" id="backMoreFinance">Volver</button></div>
  <div class="grid four"><div class="card"><div class="eyebrow">Caja</div><h2>${fmtMoney(uc.cashBudget)}</h2><small class="muted">Inicio ${fmtMoney(state.economy.seasonStartCash)}</small></div><div class="card"><div class="eyebrow">Salud financiera</div><h2>${health}/100</h2><div class="bar"><i style="width:${health}%"></i></div><small class="muted">${financialHealthLabel(health)}</small></div><div class="card"><div class="eyebrow">Balance registrado</div><h2 class="${t.balance>=0?'good-text':'bad-text'}">${t.balance>=0?'+':''}${fmtMoney(t.balance)}</h2><small class="muted">Ingresos ${fmtMoney(t.income)} · Gastos ${fmtMoney(t.expense)}</small></div><div class="card"><div class="eyebrow">Proyección</div><h2>${proj>=0?'+':''}${fmtMoney(proj)}</h2><small class="muted">Estimación hasta final de temporada</small></div></div>
  <div class="grid two" style="margin-top:16px"><div class="card"><h3>Estructura de costes</h3><div class="stat-row"><span>Masa salarial</span><b>${fmtMoney(BBGM.wageBill(uc))}</b></div><div class="stat-row"><span>Límite salarial</span><b>${fmtMoney(uc.salaryBudget)}</b></div><div class="stat-row"><span>Coste staff</span><b>${fmtMoney(staffCost())}</b></div><div class="stat-row"><span>Presupuesto staff</span><b>${fmtMoney(uc.staffBudget)}</b></div><div class="stat-row"><span>Poder comercial</span><b>${Math.round(uc.commercialPower||60)}/100</b></div></div><div class="card"><h3>Por categoría</h3>${Object.entries(cats).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1])).map(([k,n])=>`<div class="stat-row"><span>${categoryLabel[k]||k}</span><b class="${n>=0?'good-text':'bad-text'}">${n>=0?'+':''}${fmtMoney(n)}</b></div>`).join('')||'<p class="muted">Todavía no hay movimientos registrados.</p>'}</div></div>
  <div class="card" style="margin-top:16px"><h3>Últimos movimientos</h3>${rows.length?`<div class="table-wrap"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th>Importe</th></tr></thead><tbody>${rows.map(e=>`<tr><td>${e.date}</td><td>${e.text}</td><td>${categoryLabel[e.category]||e.category}</td><td class="${e.amount>=0?'good-text':'bad-text'}">${e.amount>=0?'+':''}${fmtMoney(e.amount)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Juega partidos o firma un patrocinador para empezar a generar movimientos.</p>'}</div>
  ${hist.length?`<div class="card" style="margin-top:16px"><h3>Evolución por temporadas</h3>${hist.map(x=>`<div class="objective-row"><div><b>${x.season}</b><small>Caja final ${fmtMoney(x.endCash)}</small></div><span class="pill">Salud ${Math.round(x.financialHealth||0)}/100</span></div>`).join('')}</div>`:''}`;
  v.querySelector('#backMoreFinance').onclick=()=>{currentView='more';render()};
}

function renderMore(v){
  const uc=userClub(),cr=coachRelationshipInfo();
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Partida</div><h1>Más</h1><p>Accede al resto de áreas de gestión y configura tu partida.</p></div></div>
  <nav class="more-shortcuts" aria-label="Otras áreas"><button class="more-shortcut" data-more-view="academy"><b>Cantera</b><span>Jóvenes y cesiones</span></button><button class="more-shortcut" data-more-view="standings"><b>Clasificación</b><span>Posición y resultados</span></button><button class="more-shortcut" data-more-view="stats"><b>Estadísticas</b><span>Líderes y rendimiento</span></button></nav>
  <div class="grid two more-sections">
  <div class="card"><h3>Directiva</h3><div class="stat-row"><span>Confianza</span><b>${Math.round(state.board?.confidence??70)}/100</b></div>${(state.board?.objectives||[]).map(o=>{const x=boardObjectiveState(o);return `<div class="objective-row"><div><b>${o.label}</b><small>${x.text}</small></div><span class="pill ${x.ok?'good-pill':''}">${x.ok?'Cumpliendo':'En curso'}</span></div>`}).join('')}<button class="btn" id="openStandings" style="margin-top:12px">Ver clasificaciones</button></div>
  <div class="card"><h3>Entrenador</h3><div class="stat-row"><span>${uc.coach.name}</span><b>${Math.round(uc.coach.reputation)}</b></div><div class="stat-row"><span>Relación</span><b>${cr.value}/100 · ${cr.label}</b></div><div class="stat-row"><span>Peticiones de minutos activas</span><b>${Object.keys(uc.coachMinuteRequests||{}).length}</b></div><button class="btn good" id="talkCoach" style="margin-top:12px">Hablar con el entrenador</button></div>
  <div class="card"><h3>Patrocinadores</h3>${state.sponsorship?.active?`<div class="stat-row"><span>Acuerdo</span><b>${state.sponsorship.active.name}</b></div><div class="stat-row"><span>Fijo</span><b>${fmtMoney(state.sponsorship.active.fixed)}</b></div>`:`<p class="muted">Tienes ${(state.sponsorship?.offers||[]).length} ofertas pendientes.</p>`}<button class="btn ${state.sponsorship?.active?'':'good'}" id="openSponsors" style="margin-top:12px">${state.sponsorship?.active?'Ver acuerdo':'Elegir patrocinador'}</button></div>
  <div class="card"><h3>Finanzas</h3><div class="stat-row"><span>Caja</span><b>${fmtMoney(uc.cashBudget)}</b></div><div class="stat-row"><span>Salud financiera</span><b>${Math.round(uc.financialHealth||65)}/100</b></div><div class="stat-row"><span>Masa salarial</span><b>${fmtMoney(wageBill(uc))}</b></div><div class="stat-row"><span>Límite salarial</span><b>${fmtMoney(uc.salaryBudget)}</b></div><button class="btn good" id="openFinance" style="margin-top:12px">Abrir finanzas</button></div>
  <div class="card"><h3>Director deportivo</h3><div class="stat-row"><span>Reputación</span><b>${Math.round(state.manager.reputation)}</b></div><div class="stat-row"><span>Negociación</span><b>${Math.round(state.manager.negotiation)}</b></div><div class="stat-row"><span>Planificación</span><b>${Math.round(state.manager.planning)}</b></div><div class="stat-row"><span>Scouting</span><b>${Math.round(state.manager.scouting)}</b></div><div class="stat-row"><span>Desarrollo</span><b>${Math.round(state.manager.development)}</b></div></div>
  <div class="card"><h3>Actividad</h3><div class="stat-row"><span>Asuntos pendientes</span><b>${state.inbox.filter(x=>!x.resolved).length}</b></div><div class="stat-row"><span>Resúmenes semanales</span><b>${state.weeklySummaries.length}</b></div><button class="btn good" id="openInbox" style="margin-top:12px">Centro de notificaciones</button></div>
  <div class="card"><h3>Pretemporada</h3><div class="stat-row"><span>Estado</span><b>${state.preseason?.active?'Activa':'Completada'}</b></div><div class="stat-row"><span>Foco</span><b>${preseasonFocusLabel(state.preseason?.focus||'BALANCED')}</b></div><button class="btn" id="openPreseason" style="margin-top:12px">Abrir pretemporada</button></div>
  <div class="card"><h3>Guardado</h3><p class="muted">La partida se guarda automáticamente. Puedes exportarla para conservar una copia.</p><div class="action-row"><button class="btn primary" id="save2">Guardar ahora</button><button class="btn" id="export">Exportar partida</button><button class="btn" id="toStart">Salir al inicio</button></div></div>
  <div class="card"><h3>Gestión deportiva</h3><p class="muted">Revisa la profundidad de la plantilla y el estado del vestuario.</p><div class="action-stack"><button class="btn good" id="openPlanning">Planificación de plantilla</button><button class="btn" id="openLocker">Vestuario</button></div></div>
  <div class="card"><h3>Salud y disponibilidad</h3><div class="stat-row"><span>Lesionados</span><b>${activeInjuries().length}</b></div><p class="muted">Decide reposo, minutos limitados o jugar con molestias.</p><button class="btn good" id="openMedical">Departamento médico</button></div>
  <div class="card"><h3>NBA y Draft</h3><div class="stat-row"><span>Drafts procesados</span><b>${state.nba?.draftHistory?.length||0}</b></div><p class="muted">Derechos NBA, Draft y retornos al mercado europeo.</p><button class="btn" id="openNba">Abrir NBA / Draft</button></div>
  <div class="card"><h3>Selecciones</h3><div class="stat-row"><span>Convocados actuales</span><b>${state.nationalTeams?.callups?.length||0}</b></div><p class="muted">Los internacionales regresan con carga adicional.</p><button class="btn" id="openInternational">Ver internacionales</button></div>
  <div class="card"><h3>Historial y récords</h3><div class="stat-row"><span>Temporadas cerradas</span><b>${state.seasonArchive?.length||0}</b></div><div class="stat-row"><span>Logros</span><b>${Object.keys(state.achievements?.unlocked||{}).length}/${ACHIEVEMENT_DEFS.length}</b></div><p class="muted">Títulos, récords, líderes y trayectoria completa.</p><button class="btn good" id="openHistory">Abrir historial</button></div>
  <div class="card diagnostic-entry"><h3>Diagnóstico de partida</h3><div class="stat-row"><span>Balance global</span><b>${diagnosticVerdictV19(collectDiagnosticsV19()).label}</b></div><div class="stat-row"><span>Snapshots guardados</span><b>${state.balanceHistory?.length||0}</b></div><p class="muted">Revisa edades, medias, élite, agentes libres, economía y equilibrio posicional del universo.</p><button class="btn good" id="openDiagnostics">Abrir diagnóstico</button></div>
  <div class="card"><h3>Universo de jugadores</h3><div class="stat-row"><span>Clubes cargados</span><b>${state.world.clubs.length}</b></div><div class="stat-row"><span>Jugadores en clubes</span><b>${state.world.clubs.reduce((n,c)=>n+c.roster.length,0)}</b></div><div class="stat-row"><span>Agentes libres</span><b>${state.world.freeAgents.length}</b></div><div class="stat-row"><span>Ligas / mercados</span><b>${(state.world.leagues||[]).length}</b></div></div>
  </div>`;
  v.insertAdjacentHTML('afterbegin',`<div class="v45-area-hub" aria-label="Accesos por área"><button data-more-view="squad"><b>Club</b><span>Plantilla, cantera, planificación y vestuario</span></button><button data-more-view="standings"><b>Mundo</b><span>Calendario, clasificación y estadísticas</span></button><button data-more-view="inbox"><b>Sistema</b><span>Actividad, guardado, ajustes y ayuda</span></button></div>`);
  v.querySelectorAll('[data-more-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.moreView;render()});
  v.querySelector('.grid.two')?.insertAdjacentHTML('beforeend',`<div class="card beta-card"><div class="eyebrow">Beta cerrada</div><h3>Pruebas y feedback</h3><div class="stat-row"><span>Versión</span><b>${APP_VERSION.label}</b></div><p class="muted">Si encuentras un error, exporta el informe técnico y, si depende de tu partida, también el save desde Guardado.</p><div class="action-stack"><button class="btn good" id="betaReport">Exportar informe beta</button><button class="btn" id="betaInstallHelp">Instalar en este dispositivo</button></div></div>`);
  const betaReport=document.getElementById('betaReport');if(betaReport)betaReport.onclick=()=>{const payload={version:state.version,season:state.season,date:state.currentDate,device:{userAgent:navigator.userAgent,viewport:[window.innerWidth,window.innerHeight],standalone:window.matchMedia?.('(display-mode: standalone)').matches||navigator.standalone===true},diagnostic:collectDiagnosticsV19()};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`basketball-gm-beta-report-${state.season.replace('/','-')}.json`;a.click();URL.revokeObjectURL(a.href);toast('Informe beta exportado')};
  const betaInstall=document.getElementById('betaInstallHelp');if(betaInstall)betaInstall.onclick=()=>{const b=document.getElementById('pwaInstallBtn');if(b&&!b.hidden)b.click();else toast('En móvil: menú Compartir/⋮ → Añadir a pantalla de inicio o Instalar app')};
  const inboxBtn=document.getElementById('openInbox');if(inboxBtn)inboxBtn.onclick=()=>{currentView='inbox';render()};const preBtn=document.getElementById('openPreseason');if(preBtn)preBtn.onclick=()=>{currentView='preseason';render()};document.getElementById('save2').onclick=()=>saveLocal(true);document.getElementById('export').onclick=exportSave;document.getElementById('toStart').onclick=()=>{state=null;render()};document.getElementById('openStandings').onclick=()=>{currentView='standings';render()};document.getElementById('talkCoach').onclick=()=>{currentView='coach';render()};document.getElementById('openSponsors').onclick=()=>{currentView='sponsors';render()};const planningBtn=document.getElementById('openPlanning');if(planningBtn)planningBtn.onclick=()=>{currentView='planning';render()};const ol=document.getElementById('openLocker');if(ol)ol.onclick=()=>{currentView='locker';render()};const om=document.getElementById('openMedical');if(om)om.onclick=()=>{currentView='medical';render()};const on=document.getElementById('openNba');if(on)on.onclick=()=>{currentView='nba';render()};const intlBtn=document.getElementById('openInternational');if(intlBtn)intlBtn.onclick=()=>{currentView='international';render()};const oh=document.getElementById('openHistory');if(oh)oh.onclick=()=>{currentView='history';render()};const of=document.getElementById('openFinance');if(of)of.onclick=()=>{currentView='finance';render()};const od=document.getElementById('openDiagnostics');if(od)od.onclick=()=>{currentView='diagnostics';render()};
}

function bindProfileButtons(root=document){root.querySelectorAll('[data-profile]').forEach(b=>b.onclick=()=>{const loc=playerLocation(+b.dataset.profile);if(loc)showPlayerProfile(loc.player,loc.club)})}

function openPlayerConversation(p){
  const last=p.lastConversationDate?new Date(p.lastConversationDate+'T12:00:00Z'):null,now=new Date(state.currentDate+'T12:00:00Z'),days=last?Math.floor((now-last)/86400000):999,cooldown=days<14;
  const mor=moraleInfo(p.state.morale),roleSat=Math.round(p.state.roleSatisfaction||70),contractSat=Math.round(p.state.contractSatisfaction||70),rot=BBGM.rotation(userClub()),mins=rot.playerMinutes[p.id]||0;
  const back=modal(`<div class="modal-head"><div><div class="eyebrow">Reunión individual</div><h2 style="margin:2px 0">${fullName(p)}</h2><div class="muted">Moral ${Math.round(p.state.morale)} · ${mor.label} · ${Math.round(mins)} min previstos</div></div><button class="btn" data-close>Cerrar</button></div><div class="grid two"><div class="card inner-card"><h3>Situación</h3><div class="stat-row"><span>Satisfacción con rol</span><b>${roleSat}/100</b></div><div class="stat-row"><span>Satisfacción contrato</span><b>${contractSat}/100</b></div><div class="stat-row"><span>Fatiga</span><b>${Math.round(p.state.fatigue||0)}/100</b></div></div><div class="card inner-card"><h3>Acciones</h3><div class="action-stack"><button class="btn good" data-chat="PRAISE" ${cooldown?'disabled':''}>Elogiar su trabajo</button><button class="btn" data-chat="ROLE" ${cooldown?'disabled':''}>Hablar de su rol</button><button class="btn" data-chat="LISTEN" ${cooldown?'disabled':''}>Escuchar preocupaciones</button></div>${cooldown?`<p class="tiny muted">Ya has tenido una conversación reciente. Podrás volver a intervenir dentro de ${14-days} día(s).</p>`:''}</div></div><div id="chatResult" class="neg-response">Elige cómo quieres enfocar la conversación.</div>`);
  back.querySelector('[data-close]').onclick=()=>back.remove();
  back.querySelectorAll('[data-chat]').forEach(b=>b.onclick=()=>{const type=b.dataset.chat;let msg='';if(type==='PRAISE'){p.state.morale=BBGM.clamp(p.state.morale+2.5,0,100);p.state.confidence=BBGM.clamp((p.state.confidence||70)+1.5,0,100);msg='El jugador agradece el reconocimiento y sale reforzado.'}else if(type==='ROLE'){if(mins<(expectedRoleMinutes[p.role]||14)-4){p.state.morale=BBGM.clamp(p.state.morale+1,0,100);msg='Te deja claro que espera más minutos. Puedes llevar la petición al entrenador desde su despacho.'}else{p.state.roleSatisfaction=BBGM.clamp(roleSat+2,0,100);msg='Está razonablemente conforme con el protagonismo que tiene.'}}else{if(roleSat<55||contractSat<55){p.state.morale=BBGM.clamp(p.state.morale+1.5,0,100);msg='Valora que le hayas escuchado, aunque mantiene algunas dudas sobre su situación.'}else{p.state.morale=BBGM.clamp(p.state.morale+1,0,100);msg='No plantea problemas importantes y agradece el contacto.'}}p.lastConversationDate=state.currentDate;back.querySelector('#chatResult').textContent=msg;back.querySelectorAll('[data-chat]').forEach(x=>x.disabled=true);saveLocal(false)});
}


function developmentPanelHtml(p){const arr=(p.developmentHistory||[]).slice(-12),min=arr.length?Math.min(...arr.map(x=>x.ovr))-2:50,max=arr.length?Math.max(...arr.map(x=>x.ovr))+2:100;return `<div class="card inner-card"><div class="section-inline"><div><div class="eyebrow">Evolución</div><h3>${arr.length} registros</h3></div><span class="pill">Potencial ${knownPotential(p,playerLocation(p.id)?.club)}</span></div>${arr.length?`<div class="dev-chart">${arr.map(x=>`<div class="dev-bar" title="${x.date}: ${x.ovr}"><i style="height:${Math.max(8,(x.ovr-min)/Math.max(1,max-min)*100)}%"></i><small>${x.date.slice(2,7)}</small></div>`).join('')}</div>`:'<p class="muted">Todavía no hay evolución histórica.</p>'}${p.age<=22?`<div class="stat-row"><span>Informe del entrenador</span><b>${youthReadiness(p).label}</b></div>`:''}</div>`}
function careerPanelHtml(p){
  const h=(p.careerHistory||[]).slice().reverse(),tot=h.reduce((a,x)=>{a.g+=x.games||0;a.min+=(x.mpg||0)*(x.games||0);a.pts+=(x.ppg||0)*(x.games||0);a.reb+=(x.rpg||0)*(x.games||0);a.ast+=(x.apg||0)*(x.games||0);return a},{g:0,min:0,pts:0,reb:0,ast:0}),best=h.slice().sort((a,b)=>(b.ppg||0)-(a.ppg||0))[0];
  return `<div class="card inner-card"><div class="section-inline"><h3>Temporadas</h3>${h.length?`<span class="pill">${h.length} temporadas</span>`:''}</div>${h.length?`<div class="grid four compact-career"><div><small>PJ carrera</small><b>${tot.g}</b></div><div><small>PTS</small><b>${tot.g?(tot.pts/tot.g).toFixed(1):'—'}</b></div><div><small>REB</small><b>${tot.g?(tot.reb/tot.g).toFixed(1):'—'}</b></div><div><small>Mejor año</small><b>${best?best.season:'—'}</b></div></div><div class="table-wrap"><table><thead><tr><th>Temporada</th><th>Club</th><th>OVR</th><th>PJ</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th></tr></thead><tbody>${h.map(x=>`<tr><td>${x.season}</td><td>${club(x.clubId)?.shortName||'—'}</td><td>${x.ovr}</td><td>${x.games}</td><td>${(+x.mpg).toFixed(1)}</td><td>${(+x.ppg).toFixed(1)}</td><td>${(+x.rpg).toFixed(1)}</td><td>${(+x.apg).toFixed(1)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">El historial se guardará al cerrar cada temporada.</p>'}${p.nbaRights?`<div class="stat-row"><span>Derechos NBA</span><b>${club(p.nbaRights.teamId)?.shortName||'NBA'} · pick ${p.nbaRights.pick}</b></div>`:''}</div>`
}

function injuryPanelHtml(p){const h=(p.injuryHistory||[]).slice().reverse();return `<div class="card inner-card"><h3>Historial de lesiones</h3>${h.length?h.map(x=>`<div class="injury-history"><b>${x.name}</b><span>${x.startDate} · ${x.baseDays||'—'} días · riesgo recaída ${Math.round(x.recurrenceRisk||0)}%</span></div>`).join(''):'<p class="muted">Sin lesiones registradas.</p>'}</div>`}

function showPlayerProfile(p,ownerClub){
  const groups=[
    ['Ataque',['finishing','midRange','threePoint','freeThrow','ballHandling','passing','shotCreation','pickAndRoll','postPlay','offBall']],
    ['Defensa',['perimeterDefense','interiorDefense','helpDefense','steal','block','defensiveRebound','offensiveRebound']],
    ['Físico / mental',['speed','strength','vertical','stamina','durability','basketballIq','decisionMaking','consistency','competitiveness','workRate']]
  ];
  const loc=playerLocation(p.id),own=ownerClub&&ownerClub.id===state.userClubId,known=knownOverall(p,ownerClub),level=known.level;
  let action=(loc&&loc.status==='B_TEAM')?`<button class="btn good" data-modal-promote="${p.id}">Subir al primer equipo</button> <button class="btn" data-modal-loan-youth="${p.id}">Ceder</button>`:(loc&&loc.status==='LOANED')?`<span class="pill">Cedido en ${club(loc.loan.loanClubId).name}</span>`:!ownerClub?`<button class="btn" data-modal-scout="${p.id}">Ojeador</button> <button class="btn good" data-modal-sign="${p.id}">Fichar</button>`:own?`<button class="btn" data-modal-chat="${p.id}">Hablar</button> <button class="btn" data-modal-renew="${p.id}">Renovar</button>`:`<button class="btn" data-modal-scout="${p.id}">Ojeador</button> <button class="btn" data-modal-transfer="${p.id}">Negociar traspaso</button>`;
  const knowledgeText=own?'Información interna':level>=3?'Informe completo':level===2?'Informe rápido':level===1?'Información pública':'Sin observar';
  const back=modal(`<div class="modal-head"><div><div class="eyebrow">${ownerClub?ownerClub.name:'Agente libre'}</div><h2 style="margin:2px 0">${fullName(p)}</h2><div class="muted">${positionText(p)} · ${p.age} años · ${p.nationality}</div></div><button class="btn" data-close>Cerrar</button></div><div class="profile-hero"><div class="profile-ovr ${!own?'estimated-ovr':''}">${known.text}<span>${own?'OVR':'EST.'}</span></div><div><div class="stat-row"><span>Conocimiento</span><b>${knowledgeText}</b></div><div class="stat-row"><span>Potencial estimado</span><b>${knownPotential(p,ownerClub)}</b></div><div class="stat-row"><span>Personalidad</span><b>${personalitySummary(p,ownerClub)}</b></div>${own?`<div class="stat-row"><span>Moral</span><b>${Math.round(p.state.morale)} · ${moraleInfo(p.state.morale).label}</b></div><div class="stat-row"><span>Rol actual</span><b>${roleLabel[p.role]}</b></div><div class="stat-row"><span>Rol prometido</span><b>${roleLabel[p.promisedRole]||roleLabel[p.role]}</b></div>`:''}<div class="stat-row"><span>Agente</span><b>${p.agent}</b></div><div class="stat-row"><span>Salario actual / petición</span><b>${fmtMoney(p.salary)}</b></div><div class="stat-row"><span>Contrato</span><b>${p.contractYears?`${p.contractYears} año(s)`:'Libre'}</b></div><div class="stat-row"><span>Cláusula</span><b>${p.releaseClause?fmtMoney(p.releaseClause):'—'}</b></div></div></div>${p.currentInjury&&p.currentInjury.status!=='RECOVERED'?`<div class="profile-alert bad"><b>${p.currentInjury.name}</b> · ${p.currentInjury.management==='REST'?'No disponible':p.currentInjury.management==='LIMITED'?'Minutos limitados':'Juega con molestias'} · fin estimado ${p.currentInjury.estimatedEndDate}</div>`:''}${playerV17SummaryHtml(p,ownerClub)}<div class="profile-tabs"><button class="active" data-profile-tab="attributes">Atributos</button><button data-profile-tab="development">Desarrollo</button><button data-profile-tab="history">Historial</button><button data-profile-tab="injuries">Lesiones</button><button data-profile-tab="personality">Personalidad</button></div><div data-profile-panel="attributes"><div class="attribute-grid">${groups.map(([name,keys])=>`<div class="attr-group"><h3>${name}</h3>${keys.map(k=>`<div class="attr-line"><span>${attrLabel[k]}</span><b>${knownAttribute(p,k,ownerClub)}</b></div>`).join('')}</div>`).join('')}</div></div><div data-profile-panel="development" style="display:none">${developmentPanelHtml(p)}</div><div data-profile-panel="history" style="display:none">${careerPanelHtml(p)}</div><div data-profile-panel="injuries" style="display:none">${injuryPanelHtml(p)}</div><div data-profile-panel="personality" style="display:none">${personalityDetailsHtml(p,ownerClub)}</div><div class="modal-actions">${action}</div>`);
  back.querySelector('[data-close]').onclick=()=>back.remove();back.querySelectorAll('[data-profile-tab]').forEach(btn=>btn.onclick=()=>{back.querySelectorAll('[data-profile-tab]').forEach(x=>x.classList.toggle('active',x===btn));back.querySelectorAll('[data-profile-panel]').forEach(x=>x.style.display=x.dataset.profilePanel===btn.dataset.profileTab?'block':'none')});
  const scout=back.querySelector('[data-modal-scout]');if(scout)scout.onclick=()=>{back.remove();openScoutAssignment(p,ownerClub)};
  const sign=back.querySelector('[data-modal-sign]');if(sign)sign.onclick=()=>{back.remove();openContractNegotiation(p,{type:'FREE_AGENT'})};
  const chat=back.querySelector('[data-modal-chat]');if(chat)chat.onclick=()=>{back.remove();openPlayerConversation(p)};
  const renew=back.querySelector('[data-modal-renew]');if(renew)renew.onclick=()=>{back.remove();openContractNegotiation(p,{type:'RENEW'})};
  const transfer=back.querySelector('[data-modal-transfer]');if(transfer)transfer.onclick=()=>{back.remove();openTransferNegotiation(p,ownerClub)};
  const promote=back.querySelector('[data-modal-promote]');if(promote)promote.onclick=()=>{back.remove();promoteYouth(p.id)};const loanY=back.querySelector('[data-modal-loan-youth]');if(loanY)loanY.onclick=()=>{back.remove();openLoanDialog(p,'B')};
}

function openTransferNegotiation(p,seller){
  let round=1;
  const value=BBGM.marketValue(p);
  const back=modal(`<div class="modal-head"><div><div class="eyebrow">Negociación con ${seller.name}</div><h2 style="margin:2px 0">${fullName(p)}</h2></div><button class="btn" data-close>Cerrar</button></div><div class="negotiation-summary"><span>Valor estimado <b>${fmtMoney(value)}</b></span><span>Cláusula <b>${p.releaseClause?fmtMoney(p.releaseClause):'—'}</b></span><span>Tu caja <b>${fmtMoney(userClub().cashBudget)}</b></span></div><div class="card inner-card"><div class="field"><label>Oferta de traspaso</label><input id="transferFee" type="number" min="0" step="50000" value="${Math.min(userClub().cashBudget,Math.round(value/50000)*50000)}"></div><div id="clubResponse" class="neg-response">Ronda 1 de 3. Envía una propuesta al club.</div><button class="btn primary" id="sendTransfer">Enviar oferta</button></div>`);
  back.querySelector('[data-close]').onclick=()=>back.remove();
  const send=back.querySelector('#sendTransfer');
  send.onclick=()=>{
    const fee=+back.querySelector('#transferFee').value||0;
    if(fee>userClub().cashBudget){toast('No tienes suficiente caja para esa oferta');return}
    const r=BBGM.evaluateTransferOffer(p,seller,fee,round,Date.now()+p.id+round);
    const response=back.querySelector('#clubResponse');
    if(r.status==='ACCEPTED'){
      response.innerHTML=`<b class="good">${r.viaClause?'Cláusula alcanzada.':'Oferta aceptada.'}</b> Ahora debes llegar a un acuerdo con el jugador.`;
      send.textContent='Negociar contrato';send.onclick=()=>{back.remove();openContractNegotiation(p,{type:'TRANSFER',sellerClubId:seller.id,transferFee:fee})};
    }else if(r.status==='COUNTER'){
      round++;back.querySelector('#transferFee').value=r.counter;response.innerHTML=`${seller.name} pide <b>${fmtMoney(r.counter)}</b>. Ronda ${round} de 3.`;
    }else{response.innerHTML='<b class="bad">El club rompe la negociación.</b>';send.disabled=true}
  };
}

function openContractNegotiation(p,context){
  let round=1;
  const uc=userClub();
  const ap=agentProfile(p.agent),arel=agentRelation(p.agent);const expectation=Math.round(BBGM.salaryExpectation(p,uc.reputation)*(1+(ap.toughness-55)*.0025-(arel-50)*.0018)/50000)*50000;
  const defaultYears=p.age>=32?1:p.age<=24?3:2;
  const defaultRole=BBGM.desiredRole(p);
  const defaultClause=Math.round(expectation*3/50000)*50000;
  const title=context.type==='RENEW'?'Renovación':context.type==='FREE_AGENT'?'Fichaje de agente libre':'Contrato tras traspaso';
  const back=modal(`<div class="modal-head"><div><div class="eyebrow">${title}</div><h2 style="margin:2px 0">${fullName(p)}</h2><div class="muted">Agente: ${p.agent} · ${ap.style} · relación ${arel}/100</div></div><button class="btn" data-close>Cerrar</button></div><div class="negotiation-summary"><span>Margen salarial <b>${fmtMoney(context.type==='RENEW'?availableWage(uc)+p.salary:availableWage(uc))}</b></span><span>Rol esperado <b>${roleLabel[defaultRole]}</b></span>${context.transferFee!=null?`<span>Traspaso <b>${fmtMoney(context.transferFee)}</b></span>`:''}</div><div class="form-grid negotiation-form"><div class="field"><label>Salario anual</label><input id="offerSalary" type="number" min="100000" step="50000" value="${expectation}"></div><div class="field"><label>Años</label><select id="offerYears">${[1,2,3,4].map(x=>`<option value="${x}" ${x===defaultYears?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Rol prometido</label><select id="offerRole">${roleOptions.map(x=>`<option value="${x}" ${x===defaultRole?'selected':''}>${roleLabel[x]}</option>`).join('')}</select></div><div class="field"><label>Cláusula</label><input id="offerClause" type="number" min="0" step="50000" value="${defaultClause}"></div></div><div id="agentResponse" class="neg-response">Ronda 1 de 3. El agente espera una propuesta seria.</div><button class="btn primary" id="sendContract">Enviar propuesta</button>`);
  back.querySelector('[data-close]').onclick=()=>back.remove();
  const send=back.querySelector('#sendContract');
  send.onclick=()=>{
    const offer={salary:+back.querySelector('#offerSalary').value||0,years:+back.querySelector('#offerYears').value,role:back.querySelector('#offerRole').value,clause:+back.querySelector('#offerClause').value||null};
    const currentBase=context.type==='RENEW'?wageBill(uc)-p.salary:wageBill(uc);
    if(currentBase+offer.salary>uc.salaryBudget){toast('La oferta supera tu límite salarial');return}
    const agentBonus=BBGM.clamp((agentRelation(p.agent)-50)*.0025-(agentProfile(p.agent).toughness-55)*.0016,-.12,.10);const effectiveOffer={...offer,salary:offer.salary*(1+agentBonus)};const r=BBGM.evaluateContractOffer(p,uc,effectiveOffer,round,Date.now()+p.id+round*17);
    const response=back.querySelector('#agentResponse');
    if(r.status==='ACCEPTED'){
      finalizeContract(p,context,offer);changeAgentRelation(p.agent,2);response.innerHTML='<b class="good">Acuerdo alcanzado.</b> El contrato ha sido firmado.';send.disabled=true;send.textContent='Firmado';saveLocal(false);setTimeout(()=>{back.remove();render();toast('Contrato firmado')},650);
    }else if(r.status==='COUNTER'){
      round++;back.querySelector('#offerSalary').value=r.counter.salary;back.querySelector('#offerYears').value=r.counter.years;back.querySelector('#offerRole').value=r.counter.role;back.querySelector('#offerClause').value=r.counter.clause;
      response.innerHTML=`El agente contraoferta: <b>${fmtMoney(r.counter.salary)}</b>, ${r.counter.years} año(s), rol ${roleLabel[r.counter.role]}. Ronda ${round} de 3.`;
    }else{changeAgentRelation(p.agent,-2);response.innerHTML='<b class="bad">El jugador da por terminada la negociación.</b>';send.disabled=true}
  };
}

function finalizeContract(p,context,offer){
  const uc=userClub();
  if(context.type==='FREE_AGENT'){
    state.world.freeAgents=state.world.freeAgents.filter(x=>x.id!==p.id);uc.roster.push(p);p.freeAgent=false;p.state.teamAdaptation=48;
    state.marketNews.unshift({date:state.currentDate,text:`${uc.name} ficha a ${fullName(p)} como agente libre.`});
  }else if(context.type==='TRANSFER'){
    const seller=club(context.sellerClubId),fee=context.transferFee||0;
    if(seller){seller.roster=seller.roster.filter(x=>x.id!==p.id);seller.cashBudget+=fee}financeEntry(uc,'EXPENSE','TRANSFER_OUT',-fee,`Fichaje de ${fullName(p)} desde ${seller?.name||'otro club'}`);uc.roster.push(p);p.state.teamAdaptation=45;p.transferListed=false;
    state.marketNews.unshift({date:state.currentDate,text:`${uc.name} ficha a ${fullName(p)} desde ${seller?seller.name:'otro club'} por ${fmtMoney(fee)}.`});
  }
  p.salary=offer.salary;p.contractYears=offer.years;p.role=offer.role;p.promisedRole=offer.role;p.releaseClause=offer.clause;p.contractTerms=p.contractTerms||{};p.contractTerms.signingBonus=Math.round(offer.salary*.18/5000)*5000;p.contractTerms.performanceBonus=offer.role==='STAR'?Math.round(offer.salary*.12/5000)*5000:Math.round(offer.salary*.06/5000)*5000;p.contractTerms.nbaClause=!!p.nbaRights;p.state.contractSatisfaction=82;p.state.roleSatisfaction=78;
  addInbox('CONTRACT',context.type==='RENEW'?'Renovación completada':'Fichaje completado',`${fullName(p)} firma ${offer.years} año(s) por ${fmtMoney(offer.salary)} anuales.`,{playerId:p.id});
}

function showResultModal(m,res){
  if(!res)return;const h=club(m.homeClubId),a=club(m.awayClubId),competitionName=comp(m.competitionId)?.name||m.competitionName||'Partido';
  const table=(team,stats)=>`<div class="table-wrap"><table><thead><tr><th>Jugador</th><th>MIN</th><th>PTS</th><th>REB</th><th>AST</th><th>2P</th><th>3P</th><th>TL</th><th>ROB</th><th>TAP</th><th>PER</th><th>+/-</th></tr></thead><tbody>${stats.slice().sort((x,y)=>y.minutes-x.minutes).map(s=>{const p=team.roster.find(x=>x.id===s.playerId);if(!p)return '';const reb=s.offensiveRebounds+s.defensiveRebounds;return `<tr><td>${fullName(p)}</td><td>${s.minutes}</td><td><b>${s.points}</b></td><td>${reb}</td><td>${s.assists}</td><td>${s.twoMade}/${s.twoAttempted}</td><td>${s.threeMade}/${s.threeAttempted}</td><td>${s.freeThrowMade}/${s.freeThrowAttempted}</td><td>${s.steals}</td><td>${s.blocks}</td><td>${s.turnovers}</td><td>${s.plusMinus>0?'+':''}${s.plusMinus}</td></tr>`}).join('')}</tbody></table></div>`;
  const back=modal(`<div class="modal-head"><div><div class="eyebrow">${competitionName}</div><b>${typeof m.round==='number'?'Jornada '+m.round:m.round} · ${m.date}</b></div><button class="btn" data-close>Cerrar</button></div><div class="result-head"><div class="result-teams">${h.name} — ${a.name}</div><div class="result-score">${res.homeScore} - ${res.awayScore}</div><div class="muted">${res.overtimePeriods?res.overtimePeriods+' prórroga(s) · ':''}${Math.round(res.homeTeamStats.possessions)} posesiones</div></div><div class="tabs"><button class="active" data-tab="home">${h.shortName}</button><button data-tab="away">${a.shortName}</button></div><div id="boxContent">${table(h,res.homeStats)}</div>`);
  const closeResult=()=>{back.remove();if(pendingDecision())setTimeout(()=>interruptForPendingDecision(false),0)};
  back.querySelector('[data-close]').onclick=closeResult;back.onclick=e=>{if(e.target===back)closeResult()};back.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{back.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));b.classList.add('active');back.querySelector('#boxContent').innerHTML=b.dataset.tab==='home'?table(h,res.homeStats):table(a,res.awayStats)});
}

function modal(html){
  const back=document.createElement('div');back.className='modal-backdrop';back.innerHTML=`<div class="modal">${html}</div>`;document.body.appendChild(back);back.onclick=e=>{if(e.target===back)back.remove()};return back;
}

function toast(msg){let old=document.querySelector('.toast');if(old)old.remove();const t=document.createElement('div');t.className='toast';t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),1800)}



// ===== v0.19: balance a largo plazo + rediseño / diagnóstico =====
const V19_PHYSICAL=['speed','strength','vertical','stamina','durability'];
const V19_SHOOTING=['midRange','threePoint','freeThrow','finishing'];
const V19_SKILL=['ballHandling','passing','shotCreation','pickAndRoll','postPlay','offBall','perimeterDefense','interiorDefense','helpDefense','steal','block','defensiveRebound','offensiveRebound'];
const V19_MENTAL=['basketballIq','decisionMaking','consistency','competitiveness','workRate'];

// ===== v0.20 — Realismo, noticias y mercado final =====
function ensureV20State(){
  if(!state)return;
  state.version=APP_VERSION.code;
  state.worldNews=Array.isArray(state.worldNews)?state.worldNews:[];
  state.realismV20=state.realismV20||{pack:state.world?.realismPack?.version||'legacy',lastNewsGame:0,lastContractGame:0,lastAiReviewMonth:null};
  state.realismV20.lastNewsGame=state.realismV20.lastNewsGame||0;
  state.realismV20.lastContractGame=state.realismV20.lastContractGame||0;
  state.marketNews=state.marketNews||[];
  for(const c of state.world?.clubs||[]){for(const p of c.roster||[]){p.promisedRole=p.promisedRole||p.role;if(!p.archetypeLabel&&p.archetype)p.archetypeLabel=BBGM.archetypeLabelsV20?.[p.archetype]||p.archetype}}
}
function userGamesPlayedV20(){return (state.calendar||[]).filter(m=>m.status==='PLAYED'&&(m.homeClubId===state.userClubId||m.awayClubId===state.userClubId)).length}
function worldNewsPushV20(type,text,extra={}){ensureV20State();state.worldNews.unshift({id:`WN-${Date.now()}-${Math.random()}`,date:state.currentDate,type,text,...extra});state.worldNews=state.worldNews.slice(0,60)}
function weakestPositionV20(c){const vals=['PG','SG','SF','PF','C'].map(pos=>{const a=c.roster.filter(p=>p.primaryPosition===pos||p.secondaryPosition===pos).map(p=>BBGM.overall(p,pos)).sort((x,y)=>y-x);return {pos,score:(a[0]||55)*.65+(a[1]||50)*.35,count:a.length}});return vals.sort((a,b)=>a.score-b.score||a.count-b.count)[0]}
function generateWorldNewsV20(){
  ensureV20State();const played=userGamesPlayedV20();if(!played||played===state.realismV20.lastNewsGame||played%3!==0)return;state.realismV20.lastNewsGame=played;
  const rng=new BBGM.RNG(hashCode(`${state.season}-${played}-worldnews-v20`)),others=state.world.clubs.filter(c=>c.id!==state.userClubId);
  if(!others.length)return;
  const roll=rng.next();
  if(roll<.28){
    const exp=[];for(const c of others)for(const p of c.roster)if((p.contractYears||0)===1&&BBGM.overall(p)>=79)exp.push({c,p});
    if(exp.length){const x=rng.pick(exp);worldNewsPushV20('CONTRACT',`${x.c.name} afronta una decisión con ${fullName(x.p)}: entra en el último año de contrato y varios clubes siguen su situación.`,{playerId:x.p.id,clubId:x.c.id})}
  }else if(roll<.53){
    const youth=[];for(const c of others)for(const p of c.roster)if((p.age||99)<=23&&BBGM.overall(p)>=78) youth.push({c,p});
    if(youth.length){const x=rng.pick(youth);worldNewsPushV20('BREAKOUT',`${fullName(x.p)} (${x.c.shortName}) está ganando peso en la rotación. Su perfil de ${pArchetypeV20(x.p)} atrae atención de scouting.`,{playerId:x.p.id,clubId:x.c.id})}
  }else if(roll<.77){
    const c=rng.pick(others.filter(x=>x.leagueLevel!=='NBA'));if(c){const need=weakestPositionV20(c);worldNewsPushV20('SQUAD',`${c.name} considera prioritaria la posición de ${positionLabel[need.pos]}. Su dirección deportiva ya explora el mercado.`,{clubId:c.id})}
  }else{
    const c=rng.pick(others),top=c.roster.slice().sort((a,b)=>BBGM.overall(b)-BBGM.overall(a))[0];if(c&&top)worldNewsPushV20('TEAM',`${c.name} construye su proyecto alrededor de ${fullName(top)}, actualmente su referencia deportiva con ${Math.round(BBGM.overall(top))} OVR.`,{playerId:top.id,clubId:c.id})
  }
}
function pArchetypeV20(p){return p.archetypeLabel||BBGM.archetypeLabelsV20?.[p.archetype]||({PG:'Base',SG:'Escolta',SF:'Alero',PF:'Ala-pívot',C:'Pívot'}[p.primaryPosition]||'Jugador')}
function maybeGenerateContractDecisionV20(){
  ensureV20State();const played=userGamesPlayedV20();if(!played||played===state.realismV20.lastContractGame||played%10!==0)return;state.realismV20.lastContractGame=played;
  const exp=userClub().roster.filter(p=>(p.contractYears||0)===1).sort((a,b)=>BBGM.overall(b)-BBGM.overall(a));if(!exp.length)return;const p=exp[0];
  addInbox('DECISION',`El agente de ${fullName(p)} quiere aclarar su futuro`,`El contrato termina al final de temporada. ${p.agent} pregunta si el club piensa abrir una renovación antes de que aumente el interés exterior.`,{playerId:p.id,choices:[{label:'Abrir negociación',effect:'V20_RENEW_NOW'},{label:'Esperar',effect:'V20_RENEW_WAIT'},{label:'Escuchar mercado',effect:'LIST_PLAYER'}]});
}
function v20AiRenewalsAndPlanning(){
  ensureV20State();const month=state.currentDate?.slice(0,7);if(!month||state.realismV20.lastAiReviewMonth===month)return;state.realismV20.lastAiReviewMonth=month;
  const rng=new BBGM.RNG(hashCode(`${month}-ai-v20`));
  for(const c of state.world.clubs.filter(x=>x.id!==state.userClubId)){
    const need=weakestPositionV20(c);c.aiPriorityPosition=need.pos;
    const exp=c.roster.filter(p=>(p.contractYears||0)===1).sort((a,b)=>aiFitScore(c,b)-aiFitScore(c,a));
    for(const p of exp.slice(0,2)){
      const keep=aiFitScore(c,p)>50&&(BBGM.overall(p)>=72||p.age<=23);if(!keep||rng.next()>.58)continue;
      const expected=BBGM.salaryExpectation(p,c.reputation);const room=(c.salaryBudget||0)-BBGM.wageBill(c)+p.salary;
      if(expected<=room*1.02){p.contractYears=p.age>=32?1:2+(rng.next()<.22?1:0);p.salary=Math.round(Math.max(p.salary,expected*.92)/50000)*50000;p.promisedRole=p.role;if(rng.next()<.16)worldNewsPushV20('RENEW',`${c.name} asegura la continuidad de ${fullName(p)} por ${p.contractYears} temporada(s).`,{playerId:p.id,clubId:c.id})}
    }
  }
}
function v20HomeNewsHtml(){ensureV20State();const n=state.worldNews.slice(0,5);return `<div class="card" style="margin-top:16px"><div class="section-inline"><div><div class="eyebrow">Mundo del baloncesto</div><h3>Noticias</h3></div><span class="pill">${APP_VERSION.label} · mundo simulado</span></div>${n.length?n.map(x=>`<div class="news-line"><span class="muted">${x.date}</span><span>${x.text}</span></div>`).join(''):'<p class="muted">Las noticias del mundo aparecerán al avanzar la temporada.</p>'}</div>`}

function ensureV19State(){
  if(!state)return;
  state.version=APP_VERSION.code;
  state.ui=state.ui||{theme:'dark',compactMobile:true};
  if(!['dark','light'].includes(state.ui.theme))state.ui.theme='dark';
  state.balanceHistory=Array.isArray(state.balanceHistory)?state.balanceHistory:[];
}
function applyThemeV19(){
  if(typeof document==='undefined')return;
  const theme=state?.ui?.theme||'dark';
  document.documentElement.dataset.theme=theme;
  const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',theme==='light'?'#f4f7fb':'#0c1118');
}
function curveDeltaV19(p,club,rng){
  const age=p.age||27,o=BBGM.overall(p),pot=Math.max(o,p.potentialReal??o),gap=Math.max(0,pot-o),isUser=club?.id===state?.userClubId;
  if(age<=19&&!isUser)return BBGM.clamp(.75+gap*.12+rng.next()*.65,.55,4.20);
  if(age<=22&&!isUser)return BBGM.clamp(.42+gap*.09+rng.next()*.48,.30,3.20);
  if(age<=25&&!isUser)return gap>1?BBGM.clamp(.10+gap*.04+rng.next()*.25,0,1.40):0;
  if(age<=29)return rng.gaussian()*.045;
  if(age<=31)return -.04-rng.next()*.16;
  if(age<=33)return -.22-rng.next()*.42;
  if(age<=35)return -.55-rng.next()*.62;
  return -.95-rng.next()*1.05;
}
function applyAnnualPlayerCurveV19(p,club,rng=new BBGM.RNG((p.id||1)*9187+(p.age||25))){
  if(!p?.attributes)return 0;
  const before=BBGM.overall(p),delta=curveDeltaV19(p,club,rng),age=p.age||27;
  if(delta>0){
    const cap=p.potentialReal??96;if(before>=cap-.15)return 0;const d=Math.min(delta,Math.max(0,cap-before));
    for(const k of Object.keys(p.attributes)){const mult=V19_MENTAL.includes(k)?1.05:V19_PHYSICAL.includes(k)?.9:1;p.attributes[k]=BBGM.clamp(p.attributes[k]+d*mult*(.86+rng.next()*.28),1,99)}
  }else if(delta<0){
    const d=-delta;
    for(const k of V19_PHYSICAL)if(p.attributes[k]!=null)p.attributes[k]=BBGM.clamp(p.attributes[k]-d*(1.45+(age-30)*.045)*(.85+rng.next()*.30),1,99);
    for(const k of V19_SKILL)if(p.attributes[k]!=null)p.attributes[k]=BBGM.clamp(p.attributes[k]-d*.62*(.8+rng.next()*.35),1,99);
    for(const k of V19_SHOOTING)if(p.attributes[k]!=null)p.attributes[k]=BBGM.clamp(p.attributes[k]-d*.22*(.8+rng.next()*.35),1,99);
    for(const k of V19_MENTAL)if(p.attributes[k]!=null)p.attributes[k]=BBGM.clamp(p.attributes[k]-d*(age>=36?.16:.05),1,99);
  }
  const after=BBGM.overall(p);p.lastAnnualDelta=after-before;return p.lastAnnualDelta;
}
function v19PositionCoverage(c,pos){return c.roster.filter(p=>p.primaryPosition===pos||p.secondaryPosition===pos).length}
function ensureRosterBalanceV19(c){
  if(!state?.world?.freeAgents||!c)return 0;let signed=0;const maxRoster=c.leagueLevel==='NBA'?18:16,minCoverage=c.leagueLevel==='NBA'?2:1;
  for(const pos of ['PG','SG','SF','PF','C']){
    while(v19PositionCoverage(c,pos)<minCoverage&&c.roster.length<maxRoster){
      const room=(c.salaryBudget||0)-BBGM.wageBill(c);const opts=state.world.freeAgents.filter(p=>(p.primaryPosition===pos||p.secondaryPosition===pos)&&BBGM.salaryExpectation(p,c.reputation)<=Math.max(100000,room)).sort((a,b)=>aiFitScore(c,b)-aiFitScore(c,a));
      if(!opts.length)break;const p=opts[0];p.salary=BBGM.salaryExpectation(p,c.reputation);p.contractYears=2;p.role=BBGM.desiredRole(p);p.promisedRole=p.role;p.freeAgent=false;c.roster.push(p);state.world.freeAgents=state.world.freeAgents.filter(x=>x.id!==p.id);signed++;
    }
  }
  return signed;
}
function uniqueUniversePlayersV19(){
  const map=new Map();for(const c of state.world.clubs)for(const p of c.roster)map.set(p.id,p);for(const p of state.world.freeAgents||[])map.set(p.id,p);for(const p of state.academy?.players||[])map.set(p.id,p);for(const l of state.academy?.loans||[])if(l.player)map.set(l.player.id,l.player);return [...map.values()]
}
function leagueAuditV19(name){
  const clubs=state.world.clubs.filter(c=>c.leagueName===name||c.leagueLevel===name);const players=clubs.flatMap(c=>c.roster);if(!clubs.length)return null;const avg=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:0;
  return {name,clubs:clubs.length,players:players.length,avgOvr:avg(players.map(p=>BBGM.overall(p)).filter(Number.isFinite)),avgAge:avg(players.map(p=>p.age||0)),avgSalary:avg(players.map(p=>p.salary||0)),avgRoster:players.length/clubs.length};
}
function collectDiagnosticsV19(){
  ensureV19State();const all=uniqueUniversePlayersV19(),clubPlayers=state.world.clubs.flatMap(c=>c.roster),avg=a=>a.length?a.reduce((n,x)=>n+x,0)/a.length:0,ovrs=all.map(p=>BBGM.overall(p)).filter(Number.isFinite),ages=all.map(p=>p.age||0).filter(Number.isFinite),clubs=state.world.clubs;
  const posWarnings=[];for(const c of clubs){const miss=['PG','SG','SF','PF','C'].filter(pos=>v19PositionCoverage(c,pos)===0);if(miss.length||c.roster.length<(c.leagueLevel==='NBA'?12:9))posWarnings.push({clubId:c.id,name:c.name,missing:miss,roster:c.roster.length})}
  const leagues=['Liga ACB','EuroLeague','NBA','LNB Élite','LBA Serie A','easyCredit BBL','Basketbol Süper Ligi','Greek Basket League','ABA League','Primera FEB'].map(leagueAuditV19).filter(Boolean);
  return {season:state.season,date:state.currentDate,clubs:clubs.length,players:all.length,clubPlayers:clubPlayers.length,freeAgents:(state.world.freeAgents||[]).length,academy:(state.academy?.players||[]).length,avgOvr:avg(ovrs),avgAge:avg(ages),elite85:ovrs.filter(x=>x>=85).length,super90:ovrs.filter(x=>x>=90).length,youth21:all.filter(p=>(p.age||99)<=21).length,veterans35:all.filter(p=>(p.age||0)>=35).length,financialRisk:clubs.filter(c=>(c.financialHealth??65)<40).length,posWarnings,leagues,ovrBands:[['<65',ovrs.filter(x=>x<65).length],['65–69',ovrs.filter(x=>x>=65&&x<70).length],['70–73',ovrs.filter(x=>x>=70&&x<74).length],['74–77',ovrs.filter(x=>x>=74&&x<78).length],['78–81',ovrs.filter(x=>x>=78&&x<82).length],['82–85',ovrs.filter(x=>x>=82&&x<86).length],['86–89',ovrs.filter(x=>x>=86&&x<90).length],['90+',ovrs.filter(x=>x>=90).length]]};
}
function diagnosticVerdictV19(d){
  let score=100,issues=[];if(d.avgOvr>78){score-=18;issues.push('media global alta')}if(d.avgOvr<66){score-=15;issues.push('media global baja')}if(d.super90>d.players*.035){score-=15;issues.push('demasiados jugadores 90+')}if(d.freeAgents>d.players*.20){score-=14;issues.push('exceso de agentes libres')}if(d.posWarnings.length>d.clubs*.12){score-=16;issues.push('plantillas descompensadas')}if(d.financialRisk>d.clubs*.18){score-=12;issues.push('muchos clubes con riesgo financiero')}if(d.avgAge>29.5||d.avgAge<24){score-=10;issues.push('edad media fuera de rango')};return {score:Math.max(0,score),label:score>=88?'Estable':score>=72?'Correcto':score>=55?'Vigilar':'Desequilibrado',issues};
}
function recordBalanceSnapshotV19(label='manual'){
  if(!state)return null;ensureV19State();const d=collectDiagnosticsV19(),snap={label,season:d.season,date:d.date,players:d.players,freeAgents:d.freeAgents,avgOvr:+d.avgOvr.toFixed(2),avgAge:+d.avgAge.toFixed(2),elite85:d.elite85,super90:d.super90,financialRisk:d.financialRisk,posWarnings:d.posWarnings.length};state.balanceHistory.push(snap);if(state.balanceHistory.length>50)state.balanceHistory=state.balanceHistory.slice(-50);return snap;
}
function projectedBalanceV19(years=20){
  const base=uniqueUniversePlayersV19().map(p=>({age:p.age||27,ovr:BBGM.overall(p),pot:p.potentialReal??BBGM.overall(p)}));let pool=base.map(x=>({...x})),seed=hashCode(`${state.season}-projection-${years}`),rng=new BBGM.RNG(seed),nextId=1;const snapshots=[];
  const snap=y=>{const avg=a=>a.reduce((n,x)=>n+x,0)/Math.max(1,a.length);snapshots.push({year:y,count:pool.length,avgOvr:avg(pool.map(x=>x.ovr)),avgAge:avg(pool.map(x=>x.age)),elite:pool.filter(x=>x.ovr>=85).length,super90:pool.filter(x=>x.ovr>=90).length,maxOvr:Math.max(...pool.map(x=>x.ovr))})};snap(0);
  for(let y=1;y<=years;y++){let retired=0;pool=pool.filter(x=>{x.age++;let d=0,gap=Math.max(0,x.pot-x.ovr);if(x.age<=19)d=Math.min(4.2,.75+gap*.12+rng.next()*.60);else if(x.age<=22)d=Math.min(3.2,.42+gap*.09+rng.next()*.45);else if(x.age<=25)d=Math.min(1.4,.10+gap*.04+rng.next()*.24);else if(x.age>=36)d=-(.9+rng.next()*1.0);else if(x.age>=34)d=-(.5+rng.next()*.6);else if(x.age>=32)d=-(.18+rng.next()*.4);x.ovr=BBGM.clamp(x.ovr+d,48,96);const reti=x.age>=37&&rng.next()<Math.min(.88,.10+(x.age-36)*.17);if(reti)retired++;return !reti});
    for(let i=0;i<retired;i++){let o,pot;const talent=rng.next();if(talent<.08){o=71+rng.next()*7;pot=93+rng.next()*4}else if(talent<.32){o=65+rng.next()*9;pot=86+rng.next()*9}else{o=56+rng.next()*13;pot=BBGM.clamp(o+10+rng.next()*19,72,91)}pool.push({id:nextId++,age:17+Math.floor(rng.next()*3),ovr:o,pot})}if(y===10||y===20||y===years)snap(y)}return snapshots;
}
function renderDiagnosticsV19(v){
  const d=collectDiagnosticsV19(),ver=diagnosticVerdictV19(d),pct=n=>d.players?Math.round(n/d.players*1000)/10:0;
  v.innerHTML=`<div class="section-title"><div><div class="eyebrow">Herramientas de prueba</div><h1>Diagnóstico de partida</h1><p>Auditoría del universo para detectar inflación de medias, envejecimiento, exceso de libres, economía y plantillas rotas.</p></div><button class="btn" id="diagBack">← Más</button></div>
  <div class="diagnostic-hero ${ver.score<55?'diag-bad':ver.score<72?'diag-warn':'diag-good'}"><div><span>Estado global</span><strong>${ver.label}</strong><small>${ver.issues.length?ver.issues.join(' · '):'Sin alertas estructurales importantes'}</small></div><div class="diag-score">${ver.score}<small>/100</small></div></div>
  <div class="grid four diagnostics-kpis"><div class="card"><div class="eyebrow">Jugadores</div><div class="big-metric">${d.players}</div><small class="muted">${d.freeAgents} libres · ${d.academy} cantera</small></div><div class="card"><div class="eyebrow">OVR medio</div><div class="big-metric">${d.avgOvr.toFixed(1)}</div><small class="muted">85+: ${d.elite85} (${pct(d.elite85)}%) · 90+: ${d.super90}</small></div><div class="card"><div class="eyebrow">Edad media</div><div class="big-metric">${d.avgAge.toFixed(1)}</div><small class="muted">≤21: ${d.youth21} · ≥35: ${d.veterans35}</small></div><div class="card"><div class="eyebrow">Alertas clubes</div><div class="big-metric">${d.posWarnings.length}</div><small class="muted">${d.financialRisk} con riesgo financiero</small></div></div>
  <div class="grid two" style="margin-top:16px"><div class="card"><div class="section-inline"><h3>Distribución de nivel</h3><span class="pill">Escala 1–100</span></div><div class="diag-bars">${d.ovrBands.map(([label,n])=>`<div class="diag-bar"><span>${label}</span><div><i style="width:${Math.max(2,pct(n))}%"></i></div><b>${n}</b></div>`).join('')}</div></div><div class="card"><div class="section-inline"><h3>Herramientas</h3><span class="pill">No modifican el save</span></div><p class="muted">La proyección utiliza la nueva curva de progresión/declive para detectar si el universo tiende a inflarse o vaciarse.</p><div class="action-stack"><button class="btn good" id="diagProject20">Proyección matemática 20 años</button><button class="btn" id="diagSnapshot">Guardar snapshot</button><button class="btn" id="diagExport">Exportar diagnóstico JSON</button></div></div></div>
  <div class="card" style="margin-top:16px"><div class="section-inline"><h3>Mercados principales</h3><span class="pill">${d.leagues.length} ligas</span></div><div class="table-wrap diagnostic-table"><table><thead><tr><th>Liga</th><th>Clubes</th><th>Jugadores</th><th>Plantilla</th><th>Edad</th><th>OVR</th><th>Salario medio</th></tr></thead><tbody>${d.leagues.map(x=>`<tr><td>${x.name}</td><td>${x.clubs}</td><td>${x.players}</td><td>${x.avgRoster.toFixed(1)}</td><td>${x.avgAge.toFixed(1)}</td><td><b>${x.avgOvr.toFixed(1)}</b></td><td>${fmtMoney(x.avgSalary)}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="grid two" style="margin-top:16px"><div class="card"><h3>Equilibrio posicional</h3>${d.posWarnings.length?d.posWarnings.slice(0,12).map(x=>`<div class="stat-row"><span>${x.name}</span><b class="warn">${x.missing.length?'Falta '+x.missing.map(p=>positionLabel[p]).join(', '):'Plantilla corta'} · ${x.roster}</b></div>`).join(''):'<p class="good">Todas las plantillas tienen cobertura básica en las cinco posiciones.</p>'}</div><div class="card"><h3>Historial de auditoría</h3>${(state.balanceHistory||[]).length?state.balanceHistory.slice().reverse().slice(0,10).map(x=>`<div class="stat-row"><span>${x.season} · ${x.label}</span><b>${x.avgOvr} OVR · ${x.avgAge} años</b></div>`).join(''):'<p class="muted">Todavía no hay snapshots guardados.</p>'}</div></div>`;
  v.querySelector('#diagBack').onclick=()=>{currentView='more';render()};v.querySelector('#diagSnapshot').onclick=()=>{recordBalanceSnapshotV19('manual');saveLocal(false);renderDiagnosticsV19(v);toast('Snapshot guardado')};v.querySelector('#diagExport').onclick=()=>{const blob=new Blob([JSON.stringify({diagnostic:d,verdict:ver,history:state.balanceHistory||[]},null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`basketball-gm-diagnostico-${state.season.replace('/','-')}.json`;a.click();URL.revokeObjectURL(a.href)};v.querySelector('#diagProject20').onclick=()=>showProjectionV19();
}
function showProjectionV19(){const rows=projectedBalanceV19(20),back=modal(`<div class="modal-head"><div><div class="eyebrow">Proyección sin modificar partida</div><h2>Equilibrio a 20 años</h2></div><button class="btn" data-close>Cerrar</button></div><div class="projection-grid">${rows.map(x=>`<div class="projection-card"><small>Año +${x.year}</small><b>${x.avgOvr.toFixed(1)} OVR</b><span>${x.avgAge.toFixed(1)} años · ${x.elite} jugadores 85+ · ${x.super90} 90+</span></div>`).join('')}</div><p class="muted">Es una proyección de estrés basada en la curva anual de balance; no simula resultados de partidos ni altera el guardado.</p>`);back.querySelector('[data-close]').onclick=()=>back.remove()}
g.BBGM_APP_TEST={setState:x=>state=x,getState:()=>state,pendingDecision,ensureV20State,generateWorldNewsV20,weakestPositionV20,v20AiRenewalsAndPlanning,ensureV14State,ensureV15State,ensureV16State,ensureV17State,fitScoreV17,fitLabelV17,searchAllEntities,createPreseasonFriendlies,monthEventsV17,maybeRecordWeeklySummary,agentProfile,agentRelation,changeAgentRelation,personalityArchetype,playerDesire,chemistryPair,changeRelationship,ensureMentorPairs,financeEntry,financeTotals,processMatchEconomy,financialBoardState,rolloverClubEconomies,createSponsorOffers,advancedStatsRow,archiveCurrentSeason,careerRecordSummary,evaluateAchievements,currentUserGameRecords,ensureV19State,applyAnnualPlayerCurveV19,ensureRosterBalanceV19,collectDiagnosticsV19,diagnosticVerdictV19,recordBalanceSnapshotV19,projectedBalanceV19,startNextSeason,processAcademyTo,newGame,ensureClubProjects,projectObjectives,boardObjectiveState,decisionActionLabel,decisionChoiceDetail,captainInterventionChance,resolveCaptainDelegation,resolveDecision,ensureCareerV21,scheduleDeferredV21,processDeferredConsequencesV21,evaluateCareerV21,generateCareerOffersV21,acceptCareerOfferV21,rejectCareerOfferV21};
if(app)render();
})(typeof globalThis!=='undefined'?globalThis:this);
