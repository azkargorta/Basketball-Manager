const fs=require('fs'),vm=require('vm');
for(const file of ['js/engine.js','js/data.js','js/market-ai.js'])vm.runInThisContext(fs.readFileSync(`${__dirname}/${file}`,'utf8'),{filename:file});
const B=globalThis.BBGM,world=B.createWorld(),AI=B.marketAI;
AI.ensureWorld(world);
if(world.clubs.some(c=>!c.marketIdentity?.philosophy))throw new Error('Hay clubes sin identidad de mercado');
const philosophies=new Set(world.clubs.map(c=>c.marketIdentity.philosophy));
if(philosophies.size<3)throw new Error(`Poca variedad de filosofías: ${[...philosophies].join(', ')}`);

const seller=world.clubs[0],player=seller.roster.find(p=>p.primaryPosition==='PG')||seller.roster[0],value=B.marketValue(player);
const candidates=world.clubs.slice(1,20);
candidates.forEach(c=>{c.cashBudget=Math.max(c.cashBudget||0,value*2);c.salaryBudget=Math.max(c.salaryBudget||0,B.wageBill(c)+(player.salary||0)*2)});
const broke=candidates[0];broke.cashBudget=0;
const ranked=AI.rankBuyers(candidates,player,{excludeClubIds:[seller.id],type:'TRANSFER',value});
if(!ranked.length)throw new Error('La IA no encontró compradores solventes');
if(ranked.some(x=>x.club.id===broke.id))throw new Error('Un club sin caja aparece como comprador');
if(ranked.some((x,i)=>i&&x.score>ranked[i-1].score))throw new Error('El ranking de compradores no está ordenado');
const buyer=ranked[0].club,offer=AI.createOffer(player,buyer,{type:'TRANSFER',value,listed:true,rng:new B.RNG(3201)});
const reserve=Math.max(350000,buyer.salaryBudget*.035);
if(offer.fee<50000||offer.fee>buyer.cashBudget-reserve)throw new Error(`Oferta fuera de presupuesto: ${offer.fee}`);
const loan=AI.createOffer(player,buyer,{type:'LOAN',value,rng:new B.RNG(3202)});
if(loan.wageShare<40||loan.wageShare>100||loan.minutes<8||loan.minutes>30)throw new Error(`Cesión inválida: ${JSON.stringify(loan)}`);

const v22=fs.readFileSync(`${__dirname}/js/v022.js`,'utf8');
if(!v22.includes("buyer.cashBudget=(buyer.cashBudget||0)-(o.fee||0)"))throw new Error('El comprador no paga el traspaso v0.22');
if(!v22.includes('if(Number.isFinite(l.originalSalary))p.salary=l.originalSalary'))throw new Error('La cesión no restaura el salario original');
console.log(JSON.stringify({ok:true,clubs:world.clubs.length,philosophies:[...philosophies],rankedBuyers:ranked.length,offer:offer.fee,loanShare:loan.wageShare,loanMinutes:loan.minutes},null,2));
