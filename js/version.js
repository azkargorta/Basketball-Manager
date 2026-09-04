(function(g){
'use strict';
const version=Object.freeze({
  code:'0.38.0-beta',
  label:'v0.38 Beta',
  cacheName:'basketball-gm-beta-v038',
  saveFormat:'basketball-manager-v038',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);