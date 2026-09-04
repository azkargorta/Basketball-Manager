(function(g){
'use strict';
const version=Object.freeze({
  code:'0.41.0-beta',
  label:'v0.41 Beta',
  cacheName:'basketball-gm-beta-v041',
  saveFormat:'basketball-manager-v041',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
