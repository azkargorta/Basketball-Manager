(function(g){
'use strict';
const BBGM=g.BBGM=g.BBGM||{};
const POSITIONS=['PG','SG','SF','PF','C'];
const HEIGHT_RANGES={PG:[178,198,188],SG:[185,203,194],SF:[193,210,201],PF:[198,216,206],C:[203,225,211]};
const PROFILE_OFFSETS={
  PG:{passing:5,ballHandling:5,shotCreation:3,pickAndRoll:5,decisionMaking:4,speed:3,interiorDefense:-8,block:-10,offensiveRebound:-8},
  SG:{threePoint:5,shotCreation:4,finishing:3,offBall:4,perimeterDefense:2,passing:1,interiorDefense:-6,block:-7,offensiveRebound:-5},
  SF:{threePoint:2,finishing:3,perimeterDefense:3,helpDefense:3,offBall:2,strength:2,passing:1,block:-2},
  PF:{interiorDefense:5,defensiveRebound:5,finishing:3,strength:5,helpDefense:4,offensiveRebound:4,postPlay:3,ballHandling:-4,speed:-2},
  C:{interiorDefense:7,defensiveRebound:7,finishing:5,strength:7,block:7,offensiveRebound:6,postPlay:5,threePoint:-5,ballHandling:-7,speed:-4}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function position(value){const p=String(value||'').toUpperCase().replace(/[^A-Z]/g,'');return POSITIONS.includes(p)?p:null}
function secondaryFor(primary,height,requested){
  const explicit=position(requested),index=POSITIONS.indexOf(primary);
  if(explicit&&explicit!==primary&&Math.abs(POSITIONS.indexOf(explicit)-index)===1)return explicit;
  if(primary==='PG')return'SG';
  if(primary==='SG')return height>=198?'SF':'PG';
  if(primary==='SF')return height>=204?'PF':'SG';
  if(primary==='PF')return height>=210?'C':'SF';
  return'PF';
}
function targetOverall(player,target){
  if(!Number.isFinite(target)||!player?.attributes||typeof BBGM.overall!=='function')return;
  for(let pass=0;pass<2;pass++){
    const current=BBGM.overall(player);
    if(!Number.isFinite(current))break;
    const delta=target-current;
    for(const key of Object.keys(player.attributes))if(Number.isFinite(Number(player.attributes[key])))player.attributes[key]=clamp(Number(player.attributes[key])+delta,25,99);
  }
  player.realWorldRatingTarget=target;
}
function normalizeRealWorldPlayer(player,row={}){
  if(!player)return player;
  const primary=position(row.position)||position(player.primaryPosition)||'SF';
  const range=HEIGHT_RANGES[primary];
  const suppliedHeight=Number(row.heightCm??row.height);
  let height=Number.isFinite(suppliedHeight)?suppliedHeight:Number(player.heightCm);
  if(!Number.isFinite(height))height=range[2];
  height=clamp(Math.round(height),range[0],range[1]);
  player.primaryPosition=primary;
  player.secondaryPosition=secondaryFor(primary,height,row.secondaryPosition);
  player.heightCm=height;
  if(player.attributes){
    const target=Number(row.ovr);
    const base=Number.isFinite(target)?target:(typeof BBGM.overall==='function'?BBGM.overall(player):70);
    const offsets=PROFILE_OFFSETS[primary];
    for(const [key,value] of Object.entries(player.attributes)){
      if(!Number.isFinite(Number(value)))continue;
      const archetype=clamp(base+(offsets[key]||0),25,99);
      player.attributes[key]=clamp(Number(value)*.65+archetype*.35,25,99);
    }
    targetOverall(player,target);
  }
  if(player.tendencies){
    if(Number.isFinite(player.tendencies.threePointTendency)){
      const desired={PG:58,SG:64,SF:55,PF:38,C:22}[primary];
      player.tendencies.threePointTendency=clamp(player.tendencies.threePointTendency*.7+desired*.3,5,95);
    }
    if(Number.isFinite(player.tendencies.usage))player.tendencies.usage=clamp(player.tendencies.usage,25,88);
  }
  player.realWorldProfileNormalized=true;
  return player;
}
function summarize(players){
  let duplicatePositions=0,incompatiblePositions=0,invalidHeights=0;
  for(const player of players||[]){
    const a=POSITIONS.indexOf(player.primaryPosition),b=POSITIONS.indexOf(player.secondaryPosition);
    if(a===b)duplicatePositions++;
    if(a<0||b<0||Math.abs(a-b)>1)incompatiblePositions++;
    const range=HEIGHT_RANGES[player.primaryPosition];
    if(!range||!Number.isFinite(player.heightCm)||player.heightCm<range[0]||player.heightCm>range[1])invalidHeights++;
  }
  return{duplicatePositions,incompatiblePositions,invalidHeights};
}
BBGM.normalizeRealWorldPlayer=normalizeRealWorldPlayer;
BBGM.realWorldDataQuality={positions:POSITIONS.slice(),heightRanges:HEIGHT_RANGES,summarize};
})(typeof globalThis!=='undefined'?globalThis:this);
