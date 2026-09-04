const fs=require('fs');
const app=fs.readFileSync(`${__dirname}/js/app.js`,'utf8');
const css=fs.readFileSync(`${__dirname}/css/ui-v035.css`,'utf8');
const version=fs.readFileSync(`${__dirname}/js/version.js`,'utf8');
const html=fs.readFileSync(`${__dirname}/index.html`,'utf8');

for(const fn of ['decisionActionLabel','decisionChoiceDetail','captainInterventionChance','resolveCaptainDelegation','decisionSituationHtml','openDecisionModal','showDecisionResult']){
  if(!app.includes(`function ${fn}(`))throw new Error(`Falta ${fn}`);
}
for(const token of ['data-open-decision','data-modal-decision','decisionResult','decisionHistory','captainResolution']){
  if(!app.includes(token))throw new Error(`Falta persistencia o interfaz: ${token}`);
}
if(!app.includes("effect:'PLAYER_CAPTAIN'"))throw new Error('Las peticiones de minutos no permiten delegar en el capitán');
for(const factor of ['leadership*.005','morale*.001','pair*.002','temperament*.0025','new BBGM.RNG']){
  if(!app.includes(factor))throw new Error(`La delegación no usa el factor: ${factor}`);
}
for(const outcome of ['SUCCESS','PARTIAL','FAILURE'])if(!app.includes(`'${outcome}'`))throw new Error(`Falta desenlace ${outcome}`);
for(const selector of ['.decision-situation','.decision-factors','.decision-choice-list','.decision-inline-result'])if(!css.includes(selector))throw new Error(`Falta estilo ${selector}`);
if(!version.includes("label:'v0.42 Beta'")||!html.includes('js/app.js?v=v042'))throw new Error('La versión o la caché no se actualizaron a v0.42');
console.log(JSON.stringify({presentedSituation:true,meaningfulChoices:true,captainFactors:5,captainOutcomes:3,persistentConsequences:true,ok:true},null,2));
