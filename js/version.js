(function(g){
'use strict';
const version=Object.freeze({
  code:'0.35.0-beta',
  label:'v0.35 Beta',
  cacheName:'basketball-gm-beta-v035',
  saveFormat:'basketball-manager-v035',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
