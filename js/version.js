(function(g){
'use strict';
const version=Object.freeze({
  code:'0.42.0-beta',
  label:'v0.42 Beta',
  cacheName:'basketball-gm-beta-v042',
  saveFormat:'basketball-manager-v042',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
