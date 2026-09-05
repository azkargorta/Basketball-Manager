(function(g){
'use strict';
const version=Object.freeze({
  code:'0.44.0-beta',
  label:'v0.44 Beta',
  cacheName:'basketball-gm-beta-v044',
  saveFormat:'basketball-manager-v044',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
