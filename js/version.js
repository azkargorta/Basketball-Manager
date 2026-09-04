(function(g){
'use strict';
const version=Object.freeze({
  code:'0.40.0-beta',
  label:'v0.40 Beta',
  cacheName:'basketball-gm-beta-v040',
  saveFormat:'basketball-manager-v040',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
