(function(g){
'use strict';
const BBGM=g.BBGM=g.BBGM||{};
if(typeof BBGM.createFreeAgents!=='function')return;
const original=BBGM.createFreeAgents;
BBGM.createGeneratedFreeAgentsOriginal=original;
const REAL_FREE_AGENTS=[
 {name:'Max Abmas',position:'PG',age:25,ovr:73,potential:76,source:'G League'},
 {name:'Jonas Aidoo',position:'C',age:23,ovr:69,potential:76,source:'NCAA'},
 {name:'James Akinjo',position:'PG',age:25,ovr:74,potential:76,source:'G League'},
 {name:'Jaden Akins',position:'SG',age:23,ovr:70,potential:77,source:'NCAA'},
 {name:'Warith Alatishe',position:'SF',age:26,ovr:70,potential:72,source:'G League'},
 {name:'Taran Armstrong',position:'SG',age:24,ovr:75,potential:79,source:'G League'},
 {name:'Steven Ashworth',position:'PG',age:26,ovr:72,potential:73,source:'NCAA'},
 {name:'Zack Austin',position:'SG',age:24,ovr:68,potential:73,source:'NCAA'},
 {name:'Ibou Badji',position:'C',age:23,ovr:72,potential:79,source:'G League'},
 {name:'Adama-Alpha Bal',position:'SG',age:22,ovr:72,potential:80,source:'NCAA'},
 {name:'James Banks',position:'C',age:28,ovr:69,potential:69,source:'G League'},
 {name:'Daniel Batcho',position:'PF',age:24,ovr:74,potential:78,source:'NCAA'},
 {name:'Tamar Bates',position:'SG',age:23,ovr:71,potential:77,source:'NCAA'},
 {name:'Charles Bediako',position:'C',age:24,ovr:74,potential:78,source:'G League'},
 {name:'Jules Bernard',position:'SG',age:26,ovr:76,potential:77,source:'G League'},
 {name:'Buddy Boeheim',position:'SF',age:26,ovr:70,potential:71,source:'G League'},
 {name:'Pedro Bradshaw',position:'SF',age:27,ovr:71,potential:71,source:'International'},
 {name:'Garrison Brooks',position:'C',age:26,ovr:70,potential:71,source:'International'},
 {name:'Darius Brown II',position:'PG',age:26,ovr:71,potential:72,source:'G League'},
 {name:'Cameron Brown',position:'SF',age:25,ovr:67,potential:70,source:'G League'},
 {name:'Charlie Brown Jr.',position:'SG',age:29,ovr:72,potential:72,source:'G League'},
 {name:'Terrell Brown Jr.',position:'PG',age:28,ovr:69,potential:69,source:'G League'},
 {name:'Kendall Brown',position:'SG',age:23,ovr:75,potential:81,source:'G League'},
 {name:'Boo Buie',position:'PG',age:26,ovr:72,potential:73,source:'G League'},
 {name:'Izan Almansa',position:'C',age:21,ovr:73,potential:86,source:'International'}
];
function splitName(name){const p=String(name).trim().split(/\s+/);return {firstName:p.shift()||'',lastName:p.join(' ')}}
function cloneSlot(base,id){const p=Object.assign({},base);p.id=id;p.attributes=Object.assign({},base.attributes||{});p.tendencies=Object.assign({},base.tendencies||{});p.state=Object.assign({},base.state||{});p.personality=Object.assign({},base.personality||{});return p}
BBGM.createFreeAgents=function(){
 const slots=original.apply(this,arguments)||[];
 if(!slots.length)return slots;
 while(slots.length<REAL_FREE_AGENTS.length)slots.push(cloneSlot(slots[slots.length-1]||slots[0],900000+slots.length));
 slots.length=REAL_FREE_AGENTS.length;
 REAL_FREE_AGENTS.forEach((r,i)=>{const p=slots[i],n=splitName(r.name);p.firstName=n.firstName;p.lastName=n.lastName;p.age=r.age;p.freeAgent=true;p.contractYears=0;p.releaseClause=null;p.marketEligibleEurope=true;p.marketSource=r.source;p.realWorldIdentity=true;p.realWorldSnapshot='2026-09-02';p.potentialReal=r.potential;if(typeof BBGM.normalizeRealWorldPlayer==='function')BBGM.normalizeRealWorldPlayer(p,r);});
 return slots;
};
BBGM.realInitialFreeAgents202627=REAL_FREE_AGENTS;
})(typeof globalThis!=='undefined'?globalThis:this);
