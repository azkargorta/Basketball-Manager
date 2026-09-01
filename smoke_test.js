const fs=require('fs'),vm=require('vm');
vm.runInThisContext(fs.readFileSync(__dirname+'/js/engine.js','utf8'),{filename:'engine.js'});
vm.runInThisContext(fs.readFileSync(__dirname+'/js/data.js','utf8'),{filename:'data.js'});
const B=globalThis.BBGM,w=B.createWorld();
if(w.clubs.length!==150)throw new Error('Se esperaban 150 clubes y hay '+w.clubs.length);
const bask=w.clubs.find(c=>c.id===1),rival=w.clubs.find(c=>c.id===2);
let rot=B.rotation(bask),mins=Object.values(rot.playerMinutes).reduce((a,b)=>a+b,0);
if(mins!==200)throw new Error('Rotación base no suma 200: '+mins);
// v0.13: reposo médico excluye de la rotación.
const injured=bask.roster[0];injured.currentInjury={status:'ACTIVE',management:'REST',severity:2};
rot=B.rotation(bask);if((rot.playerMinutes[injured.id]||0)!==0)throw new Error('Jugador en reposo sigue teniendo minutos');
if(Object.values(rot.playerMinutes).reduce((a,b)=>a+b,0)!==200)throw new Error('Rotación con lesión no suma 200');
injured.currentInjury.management='LIMITED';rot=B.rotation(bask);if((rot.playerMinutes[injured.id]||0)>18)throw new Error('Jugador limitado supera 18 minutos');
delete injured.currentInjury;
let bad=0,ot=0,homePts=0,awayPts=0;
for(let i=0;i<500;i++){
  const r=B.simulateMatch(bask,rival,130000+i);const hm=r.homeStats.reduce((a,x)=>a+x.minutes,0),am=r.awayStats.reduce((a,x)=>a+x.minutes,0),expected=200+r.overtimePeriods*25;
  if(hm!==expected||am!==expected)bad++;ot+=r.overtimePeriods;homePts+=r.homeScore;awayPts+=r.awayScore;
}
if(bad)throw new Error('Partidos con minutos incorrectos: '+bad);
console.log(JSON.stringify({clubs:w.clubs.length,players:w.clubs.reduce((n,c)=>n+c.roster.length,0),rotationMinutes:mins,medicalRotation:true,matches:500,avgScore:[+(homePts/500).toFixed(1),+(awayPts/500).toFixed(1)],overtimes:ot,badMinutes:bad,ok:true},null,2));
