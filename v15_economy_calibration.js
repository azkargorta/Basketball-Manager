const fs=require('fs'),vm=require('vm');globalThis.document={getElementById:()=>null};globalThis.localStorage={getItem:()=>null,setItem:()=>{}};
vm.runInThisContext(fs.readFileSync(__dirname+'/js/engine.js','utf8'));vm.runInThisContext(fs.readFileSync(__dirname+'/js/data.js','utf8'));vm.runInThisContext(fs.readFileSync(__dirname+'/js/app.js','utf8'));
const B=BBGM,A=BBGM_APP_TEST,w=B.createWorld(),b=w.clubs.find(c=>c.id===1),r=w.clubs.find(c=>c.id===2);
const standings={};for(const co of w.competitions.filter(c=>c.standings))standings[co.id]=Object.fromEntries(co.clubIds.map(id=>[id,{clubId:id,gp:0,w:0,l:0,pf:0,pa:0}]));
const st={version:'0.15.0',season:'2026/27',currentDate:'2026-09-01',userClubId:1,world:w,history:[],calendar:[],standings,board:{confidence:70,objectives:[]},sponsorship:{brandReputation:60},scouting:{staff:w.scoutStaff||[],assignments:[],knowledge:{}},academy:{players:[]},manager:{scouting:50}};A.setState(st);A.ensureV15State();
const initial=b.cashBudget;A.financeEntry(b,'INCOME','SPONSOR',4000000,'Patrocinio prueba');
for(let i=0;i<72;i++){const home=i%2===0;A.processMatchEconomy({id:'M'+i,competitionId:i%3===0?'EL':'ACB',homeClubId:home?b.id:r.id,awayClubId:home?r.id:b.id,date:'2027-01-01'});}
A.financeEntry(b,'INCOME','PRIZE',1500000,'Premios prueba');const t=A.financeTotals();
console.log(JSON.stringify({initialCash:initial,endCash:b.cashBudget,income:t.income,expense:t.expense,balance:t.balance,financialHealth:Math.round(b.financialHealth),wages:B.wageBill(b),salaryBudget:b.salaryBudget,ok:b.cashBudget>-3000000},null,2));
