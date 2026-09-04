(function(g){
'use strict';
const version=Object.freeze({
  code:'0.37.0-beta',
  label:'v0.37 Beta',
  cacheName:'basketball-gm-beta-v037',
  saveFormat:'basketball-manager-v037',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
