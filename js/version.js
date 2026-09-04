(function(g){
'use strict';
const version=Object.freeze({
  code:'0.36.0-beta',
  label:'v0.36 Beta',
  cacheName:'basketball-gm-beta-v036',
  saveFormat:'basketball-manager-v036',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
