(function(g){
  'use strict';
  const BBGM = g.BBGM = g.BBGM || {};

  class RNG{
    constructor(seed=Date.now()){this.s=(seed>>>0)||123456789}
    next(){let x=this.s;x^=x<<13;x^=x>>>17;x^=x<<5;this.s=x>>>0;return this.s/4294967296}
    gaussian(){let u=Math.max(this.next(),1e-12),v=this.next();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
    pick(arr){return arr[Math.floor(this.next()*arr.length)]}
  }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const POS=['PG','SG','SF','PF','C'];
  const ROLE_BONUS={STAR:7.0,STARTER:5.2,IMPORTANT:3.4,ROTATION:0.8,SPECIALIST:-0.8,DEVELOPMENT:-2.2,BENCH:-3.8};
  const ROLE_TARGET_MINUTES={STAR:32,STARTER:28,IMPORTANT:23,ROTATION:16,SPECIALIST:11,DEVELOPMENT:8,BENCH:5};
  const OVR_WEIGHTS={
    PG:{passing:12,ballHandling:11,shotCreation:9,pickAndRoll:9,threePoint:8,perimeterDefense:8,basketballIq:8,decisionMaking:7,finishing:6,speed:5,steal:4,offBall:4,helpDefense:3,freeThrow:3,stamina:3},
    SG:{threePoint:12,shotCreation:11,finishing:9,offBall:8,perimeterDefense:8,ballHandling:7,basketballIq:7,decisionMaking:6,passing:5,speed:5,midRange:5,steal:4,freeThrow:4,stamina:4,helpDefense:3},
    SF:{threePoint:9,finishing:8,perimeterDefense:9,helpDefense:7,offBall:7,shotCreation:7,basketballIq:7,decisionMaking:6,defensiveRebound:6,strength:5,speed:5,passing:4,ballHandling:4,interiorDefense:4,stamina:4,steal:3},
    PF:{interiorDefense:10,defensiveRebound:10,finishing:9,strength:8,helpDefense:8,offensiveRebound:7,threePoint:6,postPlay:6,basketballIq:6,block:5,offBall:5,decisionMaking:4,vertical:4,stamina:3,passing:3},
    C:{interiorDefense:13,defensiveRebound:12,finishing:11,strength:10,block:9,offensiveRebound:8,helpDefense:8,postPlay:7,vertical:5,basketballIq:5,offBall:4,decisionMaking:3,stamina:3,passing:2}
  };
  function overall(p,pos=p.primaryPosition){const w=OVR_WEIGHTS[pos],a=p.attributes;let s=0,t=0;for(const k in w){s+=a[k]*w[k];t+=w[k]}return s/t}
  function performanceDelta(p){const s=p.state;const inj=p.currentInjury&&p.currentInjury.status!=='RECOVERED'?p.currentInjury:null;const injPenalty=inj?(inj.management==='PLAY'?Math.max(1,inj.severity||2)*1.15:inj.management==='LIMITED'?Math.max(.5,inj.severity||2)*.65:0):0;return clamp((s.morale-50)*.025+(s.confidence-50)*.03+(s.form-50)*.035+(s.fitness-90)*.05-s.fatigue*.045+(s.matchRhythm-60)*.015+(s.teamAdaptation-60)*.012-injPenalty,-8,6)}
  function wageBill(club){return club.roster.reduce((sum,p)=>sum+(p.salary||0),0)}
  function marketValue(p){
    const o=overall(p),age=p.age||27,contract=Math.max(0,p.contractYears||0);
    let base=70000+Math.pow(Math.max(0,o-57),2)*3400;
    let ageFactor=age<=21?1.18:age<=27?1.12:age<=30?1:age<=33?.78:.58;
    let contractFactor=contract===0?.72:1+Math.min(3,contract)*.08;
    return Math.max(50000,Math.round(base*ageFactor*contractFactor/50000)*50000);
  }
  function salaryExpectation(p,clubReputation=75){
    const o=overall(p);
    const level=120000+Math.pow(Math.max(0,o-58),1.55)*11800;
    const current=Math.max(p.salary||0,level);
    const prestige=clamp(1.075-(clubReputation-70)*.0025,.91,1.08);
    const ageFactor=(p.age||27)>=32?.91:1;
    return Math.max(100000,Math.round(current*prestige*ageFactor/50000)*50000);
  }
  const ROLE_RANK={BENCH:0,DEVELOPMENT:1,SPECIALIST:2,ROTATION:3,IMPORTANT:4,STARTER:5,STAR:6};
  function desiredRole(p){const o=overall(p);return o>=84?'STAR':o>=80?'STARTER':o>=76?'IMPORTANT':o>=72?'ROTATION':(p.age<=22?'DEVELOPMENT':'SPECIALIST')}
  function evaluateContractOffer(p,club,offer,round=1,seed=Date.now()){
    const rng=new RNG(seed),desiredSalary=salaryExpectation(p,club.reputation),wantedRole=desiredRole(p);
    const salaryRatio=(offer.salary||0)/Math.max(1,desiredSalary);
    const roleDelta=(ROLE_RANK[offer.role]??0)-(ROLE_RANK[wantedRole]??0);
    const roleScore=clamp(13+roleDelta*5,0,22);
    const years=offer.years||1,yearScore=(p.age>=31?clamp(15-Math.abs(years-1)*4,3,15):clamp(10+Math.min(years,3)*1.8,5,16));
    const clauseRatio=offer.clause?offer.clause/Math.max(1,offer.salary):99;
    const clauseScore=offer.clause==null?16:clamp(17-clauseRatio*1.5,4,15);
    const prestigeScore=clamp((club.reputation-55)*.22,2,10);
    const score=salaryRatio*46+roleScore+yearScore+clauseScore+prestigeScore+rng.gaussian()*3.5;
    if(score>=87&&salaryRatio>=.88)return {status:'ACCEPTED',score};
    if(round>=3||salaryRatio<.62)return {status:'REJECTED',score};
    const counterSalary=Math.max(100000,Math.round(desiredSalary*(1-.025*round)/50000)*50000);
    const counterYears=p.age>=32?1:((p.age<=24)?3:2);
    const counterClause=Math.round(counterSalary*(2.4+rng.next()*1.4)/50000)*50000;
    return {status:'COUNTER',score,counter:{salary:counterSalary,years:counterYears,role:wantedRole,clause:counterClause}};
  }
  function evaluateTransferOffer(p,sellingClub,fee,round=1,seed=Date.now()){
    const rng=new RNG(seed);
    if(p.releaseClause&&fee>=p.releaseClause)return {status:'ACCEPTED',viaClause:true,counter:null};
    let target=marketValue(p)*(1+Math.min(3,p.contractYears||0)*.10)*(p.transferListed?.82:1);
    target*=.96+rng.next()*.12;
    if(fee>=target)return {status:'ACCEPTED',viaClause:false,counter:null};
    if(round>=3||fee<target*.55)return {status:'REJECTED',counter:null};
    return {status:'COUNTER',counter:Math.round(target*(1.02+rng.next()*.08)/50000)*50000};
  }
  function posIndex(pos){return POS.indexOf(pos)}
  function maxMinutes(p){let m=clamp(Math.round(27+p.attributes.stamina*.11),29,37);if(p.currentInjury&&p.currentInjury.status!=='RECOVERED'&&p.currentInjury.management==='LIMITED')m=Math.min(m,18);return m}
  function minuteRequestAdjustment(club,p){
    const req=club.coachMinuteRequests&&club.coachMinuteRequests[p.id];
    return req&&req.gamesLeft>0?(req.adjustment||0):0;
  }
  function targetMinutes(club,p){
    if(p.currentInjury&&p.currentInjury.status!=='RECOVERED'&&p.currentInjury.management==='REST')return 0;
    const base=ROLE_TARGET_MINUTES[p.role]??14;
    const lim=(p.currentInjury&&p.currentInjury.status!=='RECOVERED'&&p.currentInjury.management==='LIMITED')?-7:0;
    return clamp(base+minuteRequestAdjustment(club,p)+lim,p.currentInjury&&p.currentInjury.management==='REST'?0:2,maxMinutes(p));
  }
  function rotation(club){
    const total={};club.roster.forEach(p=>total[p.id]=0);
    const byPos={};POS.forEach(pos=>byPos[pos]={});
    for(const pos of POS){
      for(let m=0;m<40;m++){
        let best=null,bestScore=-1e9;
        for(const p of club.roster){
          if(p.currentInjury&&p.currentInjury.status!=='RECOVERED'&&p.currentInjury.management==='REST')continue;
          if(total[p.id]>=maxMinutes(p))continue;
          let dist=Math.abs(posIndex(p.primaryPosition)-posIndex(pos));
          let sec=p.secondaryPosition?Math.abs(posIndex(p.secondaryPosition)-posIndex(pos)):99;dist=Math.min(dist,sec);
          let pp=p.primaryPosition===pos?0:(p.secondaryPosition===pos?-1.5:(dist===1?-14:-55-(dist-2)*15));
          const target=targetMinutes(club,p);
          const targetPressure=(target-total[p.id])*2.8;
          const overTarget=Math.max(0,total[p.id]-target)*2.2;
          let score=overall(p,pos)+pp+performanceDelta(p)+(ROLE_BONUS[p.role]||0)+targetPressure-overTarget-total[p.id]*.12;
          if(score>bestScore){bestScore=score;best=p}
        }
        if(!best)best=club.roster.filter(p=>!(p.currentInjury&&p.currentInjury.status!=='RECOVERED'&&p.currentInjury.management==='REST')).sort((a,b)=>overall(b)-overall(a))[0]||club.roster.slice().sort((a,b)=>overall(b)-overall(a))[0];
        total[best.id]++;byPos[pos][best.id]=(byPos[pos][best.id]||0)+1;
      }
    }
    return {playerMinutes:total,byPosition:byPos,targets:Object.fromEntries(club.roster.map(p=>[p.id,targetMinutes(club,p)]))};
  }
  function weightedMetric(club,rot,keys){let n=0,d=0;for(const p of club.roster){let min=rot.playerMinutes[p.id]||0;if(!min)continue;let avg=keys.reduce((s,k)=>s+(p.attributes[k]||0),0)/keys.length;n+=avg*min;d+=min}return n/Math.max(1,d)}
  function metrics(club,rot){
    const off=weightedMetric(club,rot,['finishing','midRange','threePoint','ballHandling','passing','shotCreation','offBall','basketballIq','decisionMaking'])*.88+club.coach.offense*.12;
    const def=weightedMetric(club,rot,['perimeterDefense','interiorDefense','helpDefense','steal','block','defensiveRebound','basketballIq','strength'])*.88+club.coach.defense*.12;
    return {offense:off,defense:def,handling:weightedMetric(club,rot,['ballHandling','passing','decisionMaking','basketballIq']),perimeterDefense:weightedMetric(club,rot,['perimeterDefense','helpDefense']),interiorDefense:weightedMetric(club,rot,['interiorDefense','helpDefense','block']),steals:weightedMetric(club,rot,['steal','perimeterDefense','helpDefense']),offensiveRebound:weightedMetric(club,rot,['offensiveRebound','strength','vertical']),defensiveRebound:weightedMetric(club,rot,['defensiveRebound','strength','vertical']),passing:weightedMetric(club,rot,['passing','basketballIq'])};
  }
  function initialBox(club,rot){const out={};for(const p of club.roster)out[p.id]={playerId:p.id,minutes:rot.playerMinutes[p.id]||0,points:0,twoMade:0,twoAttempted:0,threeMade:0,threeAttempted:0,freeThrowMade:0,freeThrowAttempted:0,offensiveRebounds:0,defensiveRebounds:0,assists:0,steals:0,blocks:0,turnovers:0,fouls:0,plusMinus:0};return out}
  function choosePlayer(club,rot,rng,kind){let arr=[],total=0;for(const p of club.roster){let min=rot.playerMinutes[p.id]||0;if(min<=0)continue;let w=1;if(kind==='shoot')w=min*(.35+p.tendencies.usage*.012);else if(kind==='assist')w=min*(.2+((p.attributes.passing+p.attributes.ballHandling)/2)*.012);else if(kind==='rebound')w=min*(.15+((p.attributes.offensiveRebound+p.attributes.defensiveRebound)/2)*.012);else if(kind==='steal')w=min*(.2+p.attributes.steal*.012);arr.push([p,w]);total+=w}let c=rng.next()*total;for(const [p,w] of arr){c-=w;if(c<=0)return p}return arr[arr.length-1][0]}
  function chooseBy(club,rot,rng,fn){let arr=[],total=0;for(const p of club.roster){let min=rot.playerMinutes[p.id]||0;if(min<=0)continue;let v=min*Math.max(1,fn(p));arr.push([p,v]);total+=v}let c=rng.next()*total;for(const [p,v] of arr){c-=v;if(c<=0)return p}return arr[arr.length-1][0]}
  function maybeAssist(offense,rot,scorer,stats,m,rng){let prob=clamp(.52+(m.passing-70)*.004,.35,.75);if(rng.next()>=prob)return;for(let i=0;i<3;i++){let a=choosePlayer(offense,rot,rng,'assist');if(a.id!==scorer.id){stats[a.id].assists++;return}}}
  function secondChance(offense,defense,orot,drot,ostats,dstats,dm,qd,rng){let shooter=choosePlayer(offense,orot,rng,'shoot'),st=ostats[shooter.id],a=shooter.attributes;st.twoAttempted++;let q=a.finishing*.70+a.postPlay*.15+a.basketballIq*.15;let prob=clamp(.43+q*.0019-(dm.interiorDefense-70)*.0007+qd*.0008,.38,.74);if(rng.next()<prob){st.twoMade++;st.points+=2;return 2}let rb=chooseBy(defense,drot,rng,p=>p.attributes.defensiveRebound+p.attributes.strength);dstats[rb.id].defensiveRebounds++;return 0}
  function playPossession(offense,defense,orot,drot,ostats,dstats,om,dm,homeBonus,rng){
    const qd=om.offense-dm.defense;let toProb=clamp(.135+(dm.steals-om.handling)*.001+(defense.style.pressure-50)*.0004-qd*.00025,.08,.22);
    if(rng.next()<toProb){let cul=choosePlayer(offense,orot,rng,'shoot');ostats[cul.id].turnovers++;if(rng.next()<.65){let th=choosePlayer(defense,drot,rng,'steal');dstats[th.id].steals++}return 0}
    let shooter=choosePlayer(offense,orot,rng,'shoot'),a=shooter.attributes,sd=performanceDelta(shooter);let foulDraw=clamp(.09+((a.finishing+a.shotCreation)-140)*.00035+qd*.00015,.045,.14);
    if(rng.next()<foulDraw){let def=chooseBy(defense,drot,rng,p=>p.attributes.strength+p.attributes.interiorDefense);dstats[def.id].fouls++;let pts=0,ftp=clamp(.50+(a.freeThrow+sd)*.0037+homeBonus*.002,.58,.93);for(let i=0;i<2;i++){ostats[shooter.id].freeThrowAttempted++;if(rng.next()<ftp){ostats[shooter.id].freeThrowMade++;ostats[shooter.id].points++;pts++}}return pts}
    let threeProb=clamp(.36+(shooter.tendencies.threePointTendency-50)*.004+(offense.style.perimeterFocus-50)*.002,.08,.70);
    if(rng.next()<threeProb){let st=ostats[shooter.id];st.threeAttempted++;let q=a.threePoint*.55+a.shotCreation*.15+a.offBall*.15+a.basketballIq*.15+sd;let prob=clamp(.220+q*.00185-(dm.perimeterDefense-70)*.00065+qd*.0009+homeBonus*.013,.22,.48);if(rng.next()<prob){st.threeMade++;st.points+=3;maybeAssist(offense,orot,shooter,ostats,om,rng);return 3}let orp=clamp(.26+(om.offensiveRebound-dm.defensiveRebound)*.0016+(offense.style.offensiveReboundEmphasis-50)*.0006,.16,.40);if(rng.next()<orp){let rb=choosePlayer(offense,orot,rng,'rebound');ostats[rb.id].offensiveRebounds++;return secondChance(offense,defense,orot,drot,ostats,dstats,dm,qd,rng)}let rb=chooseBy(defense,drot,rng,p=>p.attributes.defensiveRebound+p.attributes.strength);dstats[rb.id].defensiveRebounds++;return 0}
    let st=ostats[shooter.id];st.twoAttempted++;let q=a.finishing*.55+a.midRange*.12+a.shotCreation*.12+a.postPlay*.08+a.basketballIq*.13+sd;let prob=clamp(.385+q*.00225-(dm.interiorDefense-70)*.0007+qd*.001+homeBonus*.013,.36,.72);if(rng.next()<prob){st.twoMade++;st.points+=2;maybeAssist(offense,orot,shooter,ostats,om,rng);return 2}let bp=clamp((dm.interiorDefense-58)*.0017,.015,.12);if(rng.next()<bp){let bl=chooseBy(defense,drot,rng,p=>p.attributes.block*1.4+p.attributes.interiorDefense);dstats[bl.id].blocks++}let orp=clamp(.29+(om.offensiveRebound-dm.defensiveRebound)*.0017+(offense.style.offensiveReboundEmphasis-50)*.0006,.16,.42);if(rng.next()<orp){let rb=choosePlayer(offense,orot,rng,'rebound');ostats[rb.id].offensiveRebounds++;return secondChance(offense,defense,orot,drot,ostats,dstats,dm,qd,rng)}let rb=chooseBy(defense,drot,rng,p=>p.attributes.defensiveRebound+p.attributes.strength);dstats[rb.id].defensiveRebounds++;return 0
  }
  function simulateMatch(home,away,seed=Date.now()){
    const rng=new RNG(seed),hr=rotation(home),ar=rotation(away),hs=initialBox(home,hr),as=initialBox(away,ar),hm=metrics(home,hr),am=metrics(away,ar);
    let pace=clamp(72+(((home.style.pace+away.style.pace)/2)-50)*.12+rng.gaussian()*2.3,64,82),poss=Math.round(pace),h=0,a=0;
    for(let i=0;i<poss;i++){h+=playPossession(home,away,hr,ar,hs,as,hm,am,.7,rng);a+=playPossession(away,home,ar,hr,as,hs,am,hm,0,rng)}
    let ot=0;while(h===a&&ot<4){ot++;for(const [id,min] of Object.entries(hr.playerMinutes).sort((x,y)=>y[1]-x[1]).slice(0,5))hs[id].minutes+=5;for(const [id,min] of Object.entries(ar.playerMinutes).sort((x,y)=>y[1]-x[1]).slice(0,5))as[id].minutes+=5;for(let i=0;i<9;i++){h+=playPossession(home,away,hr,ar,hs,as,hm,am,.7,rng);a+=playPossession(away,home,ar,hr,as,hs,am,hm,0,rng)}}
    if(h===a){if(rng.next()<.5)h++;else a++}
    let gm=40+ot*5;Object.values(hs).forEach(x=>x.plusMinus=Math.round((h-a)*x.minutes/gm));Object.values(as).forEach(x=>x.plusMinus=Math.round((a-h)*x.minutes/gm));let p=poss+ot*9;
    return {homeScore:h,awayScore:a,homeStats:Object.values(hs),awayStats:Object.values(as),homeTeamStats:{possessions:p,offensiveRating:h/p*100,defensiveRating:a/p*100,pace:p},awayTeamStats:{possessions:p,offensiveRating:a/p*100,defensiveRating:h/p*100,pace:p},overtimePeriods:ot};
  }
  function roundRobin(teamIds,doubleRound=true){let arr=teamIds.slice();if(arr.length%2)arr.push(null);let n=arr.length,rounds=[];for(let r=0;r<n-1;r++){let games=[];for(let i=0;i<n/2;i++){let a=arr[i],b=arr[n-1-i];if(a!=null&&b!=null){let home=(r%2===0)?a:b,away=(r%2===0)?b:a;games.push({homeClubId:home,awayClubId:away})}}rounds.push(games);arr=[arr[0],arr[n-1],...arr.slice(1,n-1)]}if(doubleRound){let second=rounds.map(g=>g.map(m=>({homeClubId:m.awayClubId,awayClubId:m.homeClubId})));return rounds.concat(second)}return rounds}
  function buildCalendar(competitions,startDate){
    let date=new Date(startDate),all=[];const addDays=(d,n)=>{let x=new Date(d);x.setDate(x.getDate()+n);return x};
    let maxRounds=Math.max(...competitions.map(c=>c.rounds.length));
    for(let r=0;r<maxRounds;r++){
      for(const c of competitions){if(!c.rounds[r])continue;for(const g of c.rounds[r])all.push({id:`${c.id}-${r}-${g.homeClubId}-${g.awayClubId}`,competitionId:c.id,round:r+1,date:date.toISOString().slice(0,10),homeClubId:g.homeClubId,awayClubId:g.awayClubId,status:'SCHEDULED'}) ;date=addDays(date,c.id==='EL'?3:4)}
    }
    return all.sort((a,b)=>a.date.localeCompare(b.date));
  }
  BBGM.RNG=RNG;BBGM.overall=overall;BBGM.rotation=rotation;BBGM.targetMinutes=targetMinutes;BBGM.simulateMatch=simulateMatch;BBGM.roundRobin=roundRobin;BBGM.buildCalendar=buildCalendar;BBGM.clamp=clamp;BBGM.wageBill=wageBill;BBGM.marketValue=marketValue;BBGM.salaryExpectation=salaryExpectation;BBGM.desiredRole=desiredRole;BBGM.evaluateContractOffer=evaluateContractOffer;BBGM.evaluateTransferOffer=evaluateTransferOffer;
  if(typeof module!=='undefined'&&module.exports)module.exports=BBGM;
})(typeof globalThis!=='undefined'?globalThis:this);
