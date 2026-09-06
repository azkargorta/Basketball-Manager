const fs=require('fs'),vm=require('vm');
vm.runInThisContext(fs.readFileSync('js/engine.js','utf8'),{filename:'engine.js'});
vm.runInThisContext(fs.readFileSync('js/data.js','utf8'),{filename:'data.js'});
const world=globalThis.BBGM.createWorld(),comps=world.competitions.filter(c=>c.standings);
const firstOpponent=seed=>globalThis.BBGM.buildCalendar(comps,'2026-09-25',seed).filter(m=>m.competitionId==='ACB'&&(m.homeClubId===1||m.awayClubId===1))[0];
const a=firstOpponent(111),b=firstOpponent(9999);
if(a.homeClubId===b.homeClubId&&a.awayClubId===b.awayClubId)throw new Error('Dos carreras nuevas conservan el mismo primer rival');
console.log(JSON.stringify({firstCareer:[a.homeClubId,a.awayClubId],secondCareer:[b.homeClubId,b.awayClubId],variableCalendar:true,ok:true},null,2));