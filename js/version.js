(function(g){
'use strict';
const version=Object.freeze({
  code:'0.45.0-beta',
  label:'v0.45 Beta',
  cacheName:'basketball-gm-beta-v045',
  saveFormat:'basketball-manager-v045',
  dataPackVersion:'2026-09-03b'
});
g.BBGM_VERSION=version;
if(typeof document!=='undefined')document.title=`Basketball Manager - ${version.label}`;
})(typeof globalThis!=='undefined'?globalThis:this);
