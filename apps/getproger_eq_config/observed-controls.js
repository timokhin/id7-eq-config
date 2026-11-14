'use strict';
const C=require('./controls');
const keys={bass:2,treble:3,balance:4,fader:5,eq100:6,eq200:7,eq500:8,eq1k:9,eq2k:10,eq5k:11,eq10k:12};
function read(shot) {
 if(!shot||!Array.isArray(shot.scopes)||!shot.scopes.includes('sink:1'))return {};
 const points=C.index(shot.points),values={};
 for(const id of Object.keys(keys)){const p=points['sink:1:'+keys[id]];if(p&&Number.isInteger(p.value)&&p.value >= -10&&p.value <= 10)values[id]=p.value;}
 const surround=points['sink:1:14'];if(surround&&(surround.value===0||surround.value===1))values.surround=!!surround.value;
 return values;
}
function bindings() {
 const result={};Object.keys(keys).concat(['surround','surroundLevel']).forEach(id=>{const key=id==='surround'?14:id==='surroundLevel'?15:keys[id];result[id]={id:'sink:1:'+key,kind:'sink',entity:1,key,control:id,center:0,low:id==='surround'?0:id==='surroundLevel'?-2:-10,high:id==='surround'?1:id==='surroundLevel'?2:10,direction:id==='fader'?-1:1,source:'observed-v1'};});return result;
}
module.exports={read,bindings};
