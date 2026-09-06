const fs=require('fs'),vm=require('vm');
globalThis.document={getElementById:()=>null,querySelector:()=>null,querySelectorAll:()=>[]};
globalThis.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
globalThis.confirm=()=>true;globalThis.alert=()=>{};console.warn=()=>{};
vm.runInThisContext(fs.readFileSync('js/engine.js','utf8'),{filename:'engine.js'});
vm.runInThisContext(fs.readFileSync('js/data.js','utf8'),{filename:'data.js'});
vm.runInThisContext(fs.readFileSync('js/app.js','utf8'),{filename:'app.js'});
const world=globalThis.BBGM.createWorld(),match={id:'ACB-1-1-2',competitionId:'ACB',date:'2026-09-25',homeClubId:1,awayClubId:2,status:'SCHEDULED'},outcomes=[];
for(const careerSeed of [101,202,303,404,505,606]){
  globalThis.BBGM_APP_TEST.setState({careerSeed,season:'2026/27',currentDate:'2026-09-25',userClubId:1,world,calendar:[],inbox:[],history:[],board:{confidence:72,objectives:[]}});
  const m={...match},seed=globalThis.BBGM_APP_TEST.matchSimulationSeedV4811(m),result=globalThis.BBGM.simulateMatch(world.clubs[0],world.clubs[1],seed);
  outcomes.push({careerSeed,seed,score:`${result.homeScore}-${result.awayScore}`,scenario:globalThis.BBGM_APP_TEST.matchDecisionScenarioV48(m).type});
}
if(new Set(outcomes.map(x=>x.seed)).size!==outcomes.length)throw new Error('Las carreras comparten semilla de partido');
if(new Set(outcomes.map(x=>x.score)).size<3)throw new Error('No hay suficiente variedad de resultados entre carreras');
if(new Set(outcomes.map(x=>x.scenario)).size<2)throw new Error('No hay variedad de situaciones decisivas entre carreras');
console.log(JSON.stringify({outcomes,ok:true},null,2));