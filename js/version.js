(function(g){
'use strict';
const version=Object.freeze({
  code:'0.47.0-beta',
  label:'v0.47 Beta',
  cacheName:'basketball-gm-beta-v047',
  saveFormat:'basketball-manager-v046',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
