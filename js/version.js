(function(g){
'use strict';
const version=Object.freeze({
  code:'0.33.0-beta',
  label:'v0.33 Beta',
  cacheName:'basketball-gm-beta-v033',
  saveFormat:'basketball-manager-v033',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
