(function(g){
'use strict';
const BBGM=g.BBGM=g.BBGM||{};
if(!BBGM.createWorld)return;
const originalCreateWorld=BBGM.createWorld;

/*
  Basketball GM v0.23 — REAL WORLD PRIVATE PACK
  Snapshot target: 2026-09-02.
  This file is intentionally isolated from the gameplay engine.
  Removing this script restores the fictional universe immediately.
  Only initial real-world factual identity data belongs here.
  Future academy/generated players remain fictional.
*/
const REAL_PACK={
  id:'real_private_2026_27',
  version:'2026-09-02',
  privateUse:true,
  provisional:true,
  label:'Real 2026/27 · beta privada',
  notes:'Plantillas iniciales reales. Contratos, salarios, ratings, moral, personalidad, lesiones futuras y relaciones son datos de simulación del juego.',
  clubs:{}
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
  // These values are deliberately simulation-only, not claims about the real person.
  player.salaryIsGameEstimate=true;
  player.personalitySimulationOnly=true;
}
function applyClubRoster(club,rows){
  if(!club||!Array.isArray(rows)||!rows.length)return;
  // Preserve the game's calibrated ability/role slots. Identity rows are ordered
  // by approximate sporting importance/rotation when available.
  for(let i=0;i<Math.min(club.roster.length,rows.length);i++)applyIdentity(club.roster[i],rows[i]);
  club.realWorldRoster=true;club.realWorldSnapshot='2026-09-02';
}
function applyRealPack(world){
  if(!world?.clubs)return world;
  for(const c of world.clubs){const rows=REAL_PACK.clubs[c.id];if(rows)applyClubRoster(c,rows)}
  world.dataPack={id:REAL_PACK.id,label:REAL_PACK.label,version:REAL_PACK.version,privateUse:true,provisional:REAL_PACK.provisional};
  return world;
}
BBGM.createWorld=function(){return applyRealPack(originalCreateWorld.apply(this,arguments))};
BBGM.realPrivatePack202627=REAL_PACK;
BBGM.applyRealPrivatePack202627=applyRealPack;
})(typeof globalThis!=='undefined'?globalThis:this);
