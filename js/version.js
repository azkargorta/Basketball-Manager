(function(g){
'use strict';
const version=Object.freeze({
  code:'0.48.10-beta',
  label:'v0.48.10 Beta',
  cacheName:'basketball-gm-beta-v04810',
  saveFormat:'basketball-manager-v046',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
