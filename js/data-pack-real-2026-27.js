(function(g){
'use strict';
const BBGM=g.BBGM=g.BBGM||{};
if(!BBGM.createWorld)return;
const originalCreateWorld=BBGM.createWorld;

/* Basketball GM v0.23 — REAL WORLD PRIVATE PACK
   Snapshot: 2026-09-02. Initial player identities can be real; ratings,
   salaries, morale, personality, injuries and future events are simulation data.
   Academy/youth/generated players remain fictional. */
const FALLBACK_CLUBS={
  1:[
    {name:'Damion Baugh',position:'PG'},{name:'Kobi Simmons',position:'PG'},
    {name:'Markus Howard',position:'SG'},{name:'Matteo Spagnolo',position:'SG'},
    {name:'AJ Lawson',position:'SF'},{name:'Chris Duarte',position:'SF'},
    {name:'Dewayne Stewart Jr',position:'SF'},{name:'Rodions Kurucs',position:'SF'},
    {name:'Stefan Joksimovic',position:'SF'},{name:'Tadas Sedekerskis',position:'SF'},
    {name:'Clement Frisch',position:'PF'},{name:'Kenneth Faried',position:'PF'}
  ],
  2:[
    {name:'Facu Campazzo',position:'PG',nationality:'ESP',age:35,height:181},
    {name:'Theo Maledon',position:'PG',nationality:'FRA',age:25,height:195},
    {name:'Andrés Feliz',position:'PG',nationality:'ESP',age:29,height:188},
    {name:'Max Shulga',position:'SG',nationality:'UKR',age:24,height:196},
    {name:'Sergio Llull',position:'SG',nationality:'ESP',age:38,height:190},
    {name:'Timothé Luwawu-Cabarrot',position:'SF',nationality:'FRA',age:31,height:198},
    {name:'Gabriel Deck',position:'SF',nationality:'ARG',age:31,height:198},
    {name:'Alberto Abalde',position:'SF',nationality:'ESP',age:30,height:202},
    {name:'Gabriele Procida',position:'SF',nationality:'ITA',age:24,height:201},
    {name:'Jaime Pradilla',position:'PF',nationality:'ESP',age:25,height:202},
    {name:'Chuma Okeke',position:'PF',nationality:'USA',age:28,height:201},
    {name:'Mikael Jantunen',position:'PF',nationality:'FIN',age:26,height:204},
    {name:'Eli Ndiaye',position:'PF',nationality:'ESP',age:22,height:204},
    {name:'Usman Garuba',position:'PF',nationality:'ESP'},
    {name:'Edy Tavares',position:'C',nationality:'CPV',age:34,height:220},
    {name:'Olivier Sarr',position:'C',nationality:'FRA',age:27,height:208},
    {name:'Damian Jones',position:'C'}
  ],
  3:[
    {name:'Juan Núñez',position:'PG',nationality:'ESP',age:22,height:191},
    {name:'Justin Robinson',position:'PG',nationality:'USA',age:28,height:185},
    {name:'Umoja Gibson',position:'PG',nationality:'BUL',age:28,height:185},
    {name:'Kevin Punter',position:'SG',nationality:'SRB',age:33,height:193},
    {name:'Darío Brizuela',position:'SG',nationality:'ESP',age:31,height:188},
    {name:'Tyrese Martin',position:'SF',nationality:'USA',age:27,height:198},
    {name:'Stanley Umude',position:'SF',nationality:'NGA',age:27,height:198},
    {name:'Justin Minaya',position:'SF'},{name:'Joel Parra',position:'SF',nationality:'ESP',age:26,height:202},
    {name:'Agustín Ubal',position:'SF',nationality:'ITA',age:23,height:198},
    {name:'Tosan Evbuomwan',position:'PF',nationality:'GBR',age:25,height:203},
    {name:'Olivier Nkamhoua',position:'PF',nationality:'FIN',age:26,height:203},
    {name:'Olek Balcerowski',position:'C',nationality:'POL',age:25,height:216},
    {name:'Josh Nebo',position:'C',nationality:'SLO',age:29,height:206},
    {name:'Yoan Makoundou',position:'C',nationality:'FRA',age:26,height:207}
  ],
  4:[
    {name:'TJ Shorts',position:'PG',nationality:'MKD',age:28,height:175},
    {name:'Álvaro Cárdenas',position:'PG',nationality:'ESP',age:24,height:187},
    {name:'Mario Saint-Supery',position:'PG',nationality:'ESP',age:20,height:194},
    {name:'Armoni Brooks',position:'SG',nationality:'USA',age:28,height:194},
    {name:'Omari Moore',position:'SG',nationality:'MKD',age:25,height:198},
    {name:'Josep Puerto',position:'SG',nationality:'ESP',age:27,height:199},
    {name:'Gonzalo Corbalán',position:'SG',nationality:'ESP',age:24,height:193},
    {name:'Lucas Marí',position:'SG',nationality:'ESP',age:20,height:197},
    {name:'Kameron Taylor',position:'SF',nationality:'USA',age:31,height:198},
    {name:'Elias Valtonen',position:'SF'},{name:'Dylan Osetkowski',position:'PF',nationality:'GER',age:30,height:206},
    {name:'Nate Reuvers',position:'PF',nationality:'HUN',age:27,height:211},
    {name:'Mo Gueye',position:'PF',nationality:'SEN',age:28,height:206},{name:'Jasiel Rivero',position:'PF'},
    {name:'Neal Sako',position:'C',nationality:'FRA',age:28,height:210},
    {name:'Yankuba Sima',position:'C',nationality:'ESP',age:30,height:211}
  ]
};

const GENERATED=g.BBGM_REAL_ROSTERS_202627||{};
const GENERATED_META=g.BBGM_REAL_ROSTERS_META_202627||null;
const REAL_PACK={
  id:'real_private_2026_27',version:'2026-09-02',privateUse:true,provisional:true,
  label:'Real 2026/27 · beta privada',
  notes:'Plantillas iniciales reales. Contratos, salarios, ratings, moral, personalidad, lesiones futuras y relaciones son datos de simulación del juego.',
  sources:['ACB.com','RealGM public roster pages'],
  clubs:Object.assign({},FALLBACK_CLUBS,GENERATED)
};

function splitName(name){
  const parts=String(name||'').trim().split(/\s+/);
  if(parts.length<=1)return {firstName:parts[0]||'',lastName:''};
  return {firstName:parts.shift(),lastName:parts.join(' ')};
}
function normalizePosition(pos){
  const p=String(pos||'').toUpperCase().replace(/[^A-Z]/g,'');
  if(['PG','SG','SF','PF','C'].includes(p))return p;
  return null;
}
function applyIdentity(player,row){
  const n=splitName(row.name);
  player.firstName=n.firstName;player.lastName=n.lastName;
  if(row.nationality)player.nationality=row.nationality;
  if(Number.isFinite(row.age))player.age=row.age;
  if(Number.isFinite(row.height))player.height=row.height;
  const pos=normalizePosition(row.position);if(pos)player.primaryPosition=pos;
  const sec=normalizePosition(row.secondaryPosition);if(sec)player.secondaryPosition=sec;
  player.realWorldIdentity=true;
  player.realWorldSnapshot='2026-09-02';
  player.salaryIsGameEstimate=true;
  player.personalitySimulationOnly=true;
}
function cloneSimulationSlot(club){
  const base=club.roster[club.roster.length-1]||club.roster[0];
  if(!base)return null;
  const clone=Object.assign({},base);
  clone.attributes=Object.assign({},base.attributes||{});
  clone.tendencies=Object.assign({},base.tendencies||{});
  clone.id=(club.id*100000)+club.roster.length+1;
  return clone;
}
function applyClubRoster(club,rows){
  if(!club||!Array.isArray(rows)||rows.length<8)return false;
  while(club.roster.length<rows.length){const clone=cloneSimulationSlot(club);if(!clone)break;club.roster.push(clone)}
  if(club.roster.length>rows.length)club.roster.length=rows.length;
  for(let i=0;i<Math.min(club.roster.length,rows.length);i++)applyIdentity(club.roster[i],rows[i]);
  club.realWorldRoster=true;club.realWorldSnapshot='2026-09-02';club.realWorldRosterCount=rows.length;
  return true;
}
function applyRealPack(world){
  if(!world?.clubs)return world;
  let realClubs=0,realPlayers=0;
  for(const c of world.clubs){const rows=REAL_PACK.clubs[c.id];if(rows&&applyClubRoster(c,rows)){realClubs++;realPlayers+=rows.length}}
  world.dataPack={id:REAL_PACK.id,label:REAL_PACK.label,version:REAL_PACK.version,privateUse:true,provisional:REAL_PACK.provisional,realClubs,realPlayers,totalClubs:world.clubs.length,generatedMeta:GENERATED_META};
  return world;
}
BBGM.createWorld=function(){return applyRealPack(originalCreateWorld.apply(this,arguments))};
BBGM.realPrivatePack202627=REAL_PACK;
BBGM.applyRealPrivatePack202627=applyRealPack;
})(typeof globalThis!=='undefined'?globalThis:this);
