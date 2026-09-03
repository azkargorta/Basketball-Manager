(function(g){
'use strict';
const version=Object.freeze({
  code:'0.32.0-beta',
  label:'v0.32 Beta',
  cacheName:'basketball-gm-beta-v032',
  saveFormat:'basketball-manager-v032',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
