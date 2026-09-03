(function(g){
'use strict';
const BBGM=g.BBGM=g.BBGM||{};
const POSITIONS=['PG','SG','SF','PF','C'];
const PHILOSOPHIES={
  WIN_NOW:{label:'Competir ahora',ageTarget:28,potentialWeight:.08,overallWeight:.48,budgetDiscipline:.78},
  DEVELOPMENT:{label:'Desarrollar talento',ageTarget:23,potentialWeight:.38,overallWeight:.25,budgetDiscipline:.92},
  SELL_TO_GROW:{label:'Comprar y desarrollar',ageTarget:22,potentialWeight:.32,overallWeight:.22,budgetDiscipline:1.05},
  BALANCED:{label:'Equilibrio deportivo',ageTarget:26,potentialWeight:.20,overallWeight:.34,budgetDiscipline:.88}
};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const overall=(player,pos)=>typeof BBGM.overall==='function'?BBGM.overall(player,pos):Number(player?.overall||70);
const wageBill=club=>typeof BBGM.wageBill==='function'?BBGM.wageBill(club):(club?.roster||[]).reduce((sum,p)=>sum+(p.salary||0),0);
function hash(value){let h=2166136261;for(const c of String(value||'')){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function philosophyFor(club){
  const reputation=Number(club?.reputation)||65,health=Number(club?.financialHealth??65),cash=Number(club?.cashBudget)||0;
  if(health<48||cash<0)return'SELL_TO_GROW';
  if(reputation>=86)return'WIN_NOW';
  if(hash(`${club?.id}-${club?.name}`)%4===0||reputation<62)return'DEVELOPMENT';
  return'BALANCED';
}
function ensureClubIdentity(club){
  if(!club)return null;
  const philosophy=philosophyFor(club),template=PHILOSOPHIES[philosophy],seed=hash(`${club.id}-${club.name}-market`);
  club.marketIdentity=Object.assign({
    philosophy,
    label:template.label,
    negotiationPatience:42+(seed%43),
    riskTolerance:35+((seed>>>4)%51),
    academyBias:philosophy==='DEVELOPMENT'||philosophy==='SELL_TO_GROW'?72:42+((seed>>>8)%25)
  },club.marketIdentity||{});
  return club.marketIdentity;
}
function ensureWorld(world){for(const club of world?.clubs||[])ensureClubIdentity(club);return world}
function positionNeed(club,pos){
  if(!club||!POSITIONS.includes(pos))return 0;
  const options=(club.roster||[]).map(player=>{
    const primary=player.primaryPosition===pos,secondary=player.secondaryPosition===pos;
    if(!primary&&!secondary)return null;
    return overall(player,pos)-(secondary&&!primary?4:0);
  }).filter(Number.isFinite).sort((a,b)=>b-a);
  const first=options[0]||0,second=options[1]||0,depth=options.length;
  return clamp((depth<2?34:0)+Math.max(0,79-first)*1.65+Math.max(0,71-second)+(depth===2?5:0),0,75);
}
function playerFit(club,player){
  const identity=ensureClubIdentity(club),profile=PHILOSOPHIES[identity.philosophy]||PHILOSOPHIES.BALANCED;
  const need=Math.max(positionNeed(club,player.primaryPosition),player.secondaryPosition?positionNeed(club,player.secondaryPosition):0);
  const rating=overall(player),potential=Number(player.potentialReal)||rating,age=Number(player.age)||27;
  const ageFit=Math.max(-12,13-Math.abs(age-profile.ageTarget)*2.2);
  const salaryPenalty=(Number(player.salary)||0)/1000000*profile.budgetDiscipline;
  return need+rating*profile.overallWeight+potential*profile.potentialWeight+ageFit-salaryPenalty;
}
function affordable(club,player,type='TRANSFER',value=0){
  const room=(Number(club?.salaryBudget)||0)-wageBill(club);
  if(type==='LOAN')return room>=Math.max(0,(Number(player?.salary)||0)*.45);
  const reserve=Math.max(350000,(Number(club?.salaryBudget)||0)*.035);
  return Number(club?.cashBudget)>=Math.max(value*.72,50000)+reserve&&room>=Math.max(0,(Number(player?.salary)||0)*.92);
}
function rankBuyers(clubs,player,options={}){
  const excluded=new Set(options.excludeClubIds||[]),type=options.type||'TRANSFER',value=Number(options.value)||0;
  return (clubs||[]).filter(club=>!excluded.has(club.id)&&club.leagueLevel!=='NBA'&&(club.roster?.length||0)<18&&affordable(club,player,type,value)).map(club=>{
    const fit=playerFit(club,player),need=Math.max(positionNeed(club,player.primaryPosition),player.secondaryPosition?positionNeed(club,player.secondaryPosition):0);
    const cashRatio=type==='LOAN'?1:Number(club.cashBudget)/Math.max(1,value);
    return{club,fit,need,score:fit+clamp(cashRatio,0,4)*2};
  }).sort((a,b)=>b.score-a.score);
}
function createOffer(player,buyer,options={}){
  const rng=options.rng&&typeof options.rng.next==='function'?()=>options.rng.next():Math.random;
  const type=options.type||'TRANSFER',value=Number(options.value)||0,need=Math.max(positionNeed(buyer,player.primaryPosition),player.secondaryPosition?positionNeed(buyer,player.secondaryPosition):0);
  if(type==='LOAN'){
    const room=Math.max(0,(Number(buyer.salaryBudget)||0)-wageBill(buyer)),salary=Math.max(1,Number(player.salary)||0);
    const affordableShare=clamp(Math.floor(room/salary*10)*10,40,100),desired=clamp(50+Math.round(need/12)*10+(rng()>.65?10:0),50,100);
    const wageShare=Math.min(affordableShare,desired),competition=(buyer.roster||[]).filter(p=>p.primaryPosition===player.primaryPosition||p.secondaryPosition===player.primaryPosition),rank=competition.filter(p=>overall(p)>overall(player)).length;
    return{type,wageShare,minutes:clamp(29-rank*5,8,30),need:Math.round(need)};
  }
  const listed=Boolean(options.listed),factor=clamp((listed?.88:.97)+need*.0025+rng()*.16,.78,1.24),reserve=Math.max(350000,(Number(buyer.salaryBudget)||0)*.035);
  const fee=Math.max(50000,Math.min(Math.round(value*factor/50000)*50000,Math.floor(Math.max(0,buyer.cashBudget-reserve)/50000)*50000));
  return{type,fee,need:Math.round(need),factor};
}
BBGM.marketAI={POSITIONS,PHILOSOPHIES,ensureClubIdentity,ensureWorld,positionNeed,playerFit,affordable,rankBuyers,createOffer};
})(typeof globalThis!=='undefined'?globalThis:this);
