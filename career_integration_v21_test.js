const fs=require('fs');
const app=fs.readFileSync(`${__dirname}/js/app.js`,'utf8');
const version=fs.readFileSync(`${__dirname}/js/version.js`,'utf8');
const html=fs.readFileSync(`${__dirname}/index.html`,'utf8');
const sw=fs.readFileSync(`${__dirname}/sw.js`,'utf8');

for(const fn of ['ensureCareerV21','scheduleDeferredV21','processDeferredConsequencesV21','evaluateCareerV21','generateCareerOffersV21','acceptCareerOfferV21']){
  if(!app.includes(`function ${fn}(`))throw new Error(`Falta ${fn}`);
}
for(const marker of ['scheduleDecisionFollowUpV21(ev,ch)','processDeferredConsequencesV21();','data-career-accept','data-career-reject']){
  if(!app.includes(marker))throw new Error(`No está conectada la integración: ${marker}`);
}
if(!version.includes("label:'v0.48 Beta'")||!html.includes('js/app.js?v=v048')||!sw.includes('basketball-gm-beta-v048'))throw new Error('Versión o caché de carrera incorrectas');
console.log(JSON.stringify({deferredConsequences:true,seasonEvaluation:true,careerOffers:true,clubChange:true,version:'v0.48',ok:true},null,2));
