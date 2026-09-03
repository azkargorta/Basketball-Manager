(function(g){
'use strict';
const BBGM=g.BBGM=g.BBGM||{};
if(!BBGM.createWorld)return;
const originalCreateWorld=BBGM.createWorld;

/* Basketball Manager — REAL WORLD INITIAL ROSTERS
   Snapshot: 2026-09-03. Real identity data is used only for initial rosters.
   OVR/POT below are original game estimates, not official third-party ratings.
   Salaries, morale, personality, injuries and future events remain simulation data. */
const FALLBACK_CLUBS={
  1:[
    {name:'Markus Howard',position:'SG',ovr:84},{name:'Tadas Sedekerskis',position:'SF',ovr:82},
    {name:'Chris Duarte',position:'SF',ovr:81},{name:'Rodions Kurucs',position:'SF',ovr:79},
    {name:'Khalifa Diop',position:'C',ovr:79,potential:84},{name:'Matteo Spagnolo',position:'PG',ovr:78,potential:84},
    {name:'AJ Lawson',position:'SF',ovr:77},{name:'Damion Baugh',position:'PG',ovr:76},
    {name:'Kobi Simmons',position:'PG',ovr:75},{name:'D.J. Stewart Jr',position:'SF',ovr:75},
    {name:'Clement Frisch',position:'PF',ovr:74},{name:'Kenneth Faried',position:'PF',ovr:73}
  ],
  2:[
    {name:'Edy Tavares',position:'C',nationality:'CPV',age:34,height:220,ovr:89},
    {name:'Facu Campazzo',position:'PG',nationality:'ESP',age:35,height:181,ovr:88},
    {name:'Theo Maledon',position:'PG',nationality:'FRA',age:25,height:195,ovr:85},
    {name:'Gabriel Deck',position:'SF',nationality:'ARG',age:31,height:198,ovr:84},
    {name:'Chuma Okeke',position:'PF',nationality:'USA',age:28,height:201,ovr:83},
    {name:'Timothé Luwawu-Cabarrot',position:'SF',nationality:'FRA',age:31,height:198,ovr:82},
    {name:'Mikael Jantunen',position:'PF',nationality:'FIN',age:26,height:204,ovr:82},
    {name:'Usman Garuba',position:'PF',nationality:'ESP',ovr:82},
    {name:'Jaime Pradilla',position:'PF',nationality:'ESP',age:25,height:202,ovr:80},
    {name:'Andrés Feliz',position:'PG',nationality:'ESP',age:29,height:188,ovr:80},
    {name:'Damian Jones',position:'C',ovr:79},{name:'Eli Ndiaye',position:'PF',nationality:'ESP',age:22,height:204,ovr:79,potential:84},
    {name:'Olivier Sarr',position:'C',nationality:'FRA',age:27,height:208,ovr:78},
    {name:'Alberto Abalde',position:'SF',nationality:'ESP',age:30,height:202,ovr:78},
    {name:'Sergio Llull',position:'SG',nationality:'ESP',age:38,height:190,ovr:77},
    {name:'Gabriele Procida',position:'SF',nationality:'ITA',age:24,height:201,ovr:77},
    {name:'Max Shulga',position:'SG',nationality:'UKR',age:24,height:196,ovr:75,potential:82}
  ],
  3:[
    {name:'Kevin Punter',position:'SG',nationality:'SRB',age:33,height:193,ovr:85},
    {name:'Tornike Shengelia',position:'PF',ovr:84},{name:'Nadir Hifi',position:'SG',ovr:82},
    {name:'Tyrese Martin',position:'SF',nationality:'USA',age:27,height:198,ovr:81},
    {name:'Josh Nebo',position:'C',nationality:'SLO',age:29,height:206,ovr:81},
    {name:'Juan Núñez',position:'PG',nationality:'ESP',age:22,height:191,ovr:80,potential:86},
    {name:'Darío Brizuela',position:'SG',nationality:'ESP',age:31,height:188,ovr:79},
    {name:'Joel Parra',position:'SF',nationality:'ESP',age:26,height:202,ovr:79},
    {name:'Olivier Nkamhoua',position:'PF',nationality:'FIN',age:26,height:203,ovr:78},
    {name:'Tosan Evbuomwan',position:'PF',nationality:'GBR',age:25,height:203,ovr:78},
    {name:'Olek Balcerowski',position:'C',nationality:'POL',age:25,height:216,ovr:77},
    {name:'Justin Robinson',position:'PG',nationality:'USA',age:28,height:185,ovr:76},
    {name:'Stanley Umude',position:'SF',nationality:'NGA',age:27,height:198,ovr:76},
    {name:'Justin Minaya',position:'SF',ovr:76},{name:'Umoja Gibson',position:'PG',nationality:'BUL',age:28,height:185,ovr:75},
    {name:'Agustín Ubal',position:'SF',nationality:'ITA',age:23,height:198,ovr:73,potential:81}
  ],
  4:[
    {name:'Kameron Taylor',position:'SF',nationality:'USA',age:31,height:198,ovr:82},
    {name:'Brancou Badio',position:'SG',ovr:80},{name:'Armoni Brooks',position:'SG',nationality:'USA',age:28,height:194,ovr:79},
    {name:'Omari Moore',position:'SG',nationality:'MKD',age:25,height:198,ovr:78},{name:'Nate Reuvers',position:'PF',nationality:'HUN',age:27,height:211,ovr:78},
    {name:'Mouhamadou Gueye',position:'PF',ovr:77},{name:'Álvaro Cárdenas',position:'PG',nationality:'ESP',age:24,height:187,ovr:76,potential:82},
    {name:'Trey Calvin',position:'PG',ovr:75},{name:'Gonzalo Corbalán',position:'SG',nationality:'ESP',age:24,height:193,ovr:75},
    {name:'Mario Saint-Supery',position:'PG',nationality:'ESP',age:20,height:194,ovr:74,potential:86},
    {name:'Lucas Marí',position:'SG',nationality:'ESP',age:20,height:197,ovr:71,potential:82},
    {name:'Boris Bogoslavsky',position:'SF',ovr:70},{name:'Gal Shterenberg',position:'SF',ovr:69}
  ]
};

const GENERATED=g.BBGM_REAL_ROSTERS_202627||{};
const MANUAL=g.BBGM_REAL_ROSTERS_MANUAL_202627||{};
const GENERATED_META=g.BBGM_REAL_ROSTERS_META_202627||null;
const REAL_PACK={id:'real_2026_27',version:'2026-09-03a',privateUse:true,provisional:true,label:'Real 2026/27 · beta',notes:'Identidades reales iniciales; ratings, potenciales y economía son estimaciones originales del juego.',clubs:Object.assign({},FALLBACK_CLUBS,GENERATED,MANUAL)};
function splitName(name){const parts=String(name||'').trim().split(/\s+/);if(parts.length<=1)return {firstName:parts[0]||'',lastName:''};return {firstName:parts.shift(),lastName:parts.join(' ')}}
function normalizePosition(pos){const p=String(pos||'').toUpperCase().replace(/[^A-Z]/g,'');return ['PG','SG','SF','PF','C'].includes(p)?p:null}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function setTargetOverall(player,target){if(!Number.isFinite(target)||!player?.attributes||typeof BBGM.overall!=='function')return;const current=BBGM.overall(player);if(!Number.isFinite(current))return;const delta=target-current;for(const k of Object.keys(player.attributes))if(Number.isFinite(Number(player.attributes[k])))player.attributes[k]=clamp(Number(player.attributes[k])+delta,25,99);player.realWorldRatingTarget=target}
function applyIdentity(player,row){const n=splitName(row.name);player.firstName=n.firstName;player.lastName=n.lastName;if(row.nationality)player.nationality=row.nationality;if(Number.isFinite(row.age))player.age=row.age;if(Number.isFinite(row.height))player.height=row.height;const pos=normalizePosition(row.position);if(pos)player.primaryPosition=pos;const sec=normalizePosition(row.secondaryPosition);if(sec)player.secondaryPosition=sec;setTargetOverall(player,Number(row.ovr));if(Number.isFinite(row.potential))player.potentialReal=Math.max(Number(row.potential),Number(row.ovr)||0);else if(Number.isFinite(row.ovr))player.potentialReal=Math.max(Number(player.potentialReal)||0,Number(row.ovr));player.realWorldIdentity=true;player.realWorldSnapshot='2026-09-03';player.salaryIsGameEstimate=true;player.personalitySimulationOnly=true}
function cloneSimulationSlot(club){const base=club.roster[club.roster.length-1]||club.roster[0];if(!base)return null;const clone=Object.assign({},base);clone.attributes=Object.assign({},base.attributes||{});clone.tendencies=Object.assign({},base.tendencies||{});clone.state=Object.assign({},base.state||{});clone.personality=Object.assign({},base.personality||{});clone.id=(club.id*100000)+club.roster.length+1;return clone}
function applyClubRoster(club,rows){if(!club||!Array.isArray(rows)||rows.length<8)return false;while(club.roster.length<rows.length){const clone=cloneSimulationSlot(club);if(!clone)break;club.roster.push(clone)}if(club.roster.length>rows.length)club.roster.length=rows.length;for(let i=0;i<Math.min(club.roster.length,rows.length);i++)applyIdentity(club.roster[i],rows[i]);club.realWorldRoster=true;club.realWorldSnapshot='2026-09-03';club.realWorldRosterCount=rows.length;return true}
function applyRealPack(world){if(!world?.clubs)return world;let realClubs=0,realPlayers=0;for(const c of world.clubs){const rows=REAL_PACK.clubs[c.id];if(rows&&applyClubRoster(c,rows)){realClubs++;realPlayers+=rows.length}}world.dataPack={id:REAL_PACK.id,label:REAL_PACK.label,version:REAL_PACK.version,privateUse:true,provisional:true,realClubs,realPlayers,totalClubs:world.clubs.length,generatedMeta:GENERATED_META};return world}
BBGM.createWorld=function(){return applyRealPack(originalCreateWorld.apply(this,arguments))};BBGM.realPrivatePack202627=REAL_PACK;BBGM.applyRealPrivatePack202627=applyRealPack;
})(typeof globalThis!=='undefined'?globalThis:this);
