'use strict';
const assert=require('assert'),T=require('../apps/getproger_eq_config/tabs'),P=require('../apps/getproger_eq_config/presets');
const {Canvas}=require('../kit/runtime/canvas'),G=require('../kit/runtime/gauges'),{theme}=require('../kit/runtime/themes');
assert.deepStrictEqual(T.labels.slice(0,2),['Debug','Current']);
assert.deepStrictEqual(T.entries({}).map(x=>x.label),['Debug','Settings']);
assert(T.entries({eq100:true}).some(x=>x.label==='Rock'));
assert(!T.entries({eq100:true}).some(x=>x.label==='Settings'));
for(const name of P.names){const i=T.labels.indexOf(name);assert(T.isPreset(i));assert.strictEqual(T.profileName(i),name);}
for(let i=1;i<=3;i++){const n='Custom '+i,ix=T.labels.indexOf(n);assert(!T.isPreset(ix));assert.strictEqual(T.profileName(ix),n);}
for(let anchor=0;anchor<T.labels.length;anchor++){
 const c=new Canvas(1920,720);G.header(c,theme(),84,0,1256,76,'EQ Config',T.labels,0,[],true,true,anchor);
 assert(c.tabRects.some(r=>r.i===anchor),'Focused tab must be visible: '+anchor);
 assert(c.tabRects.every(r=>r.x>=84 && r.x+r.w<=1340),'Header stays out of HMI status area');
 assert(c.tabRects.every(r=>T.labels[r.i]!=='<' && T.labels[r.i]!=='>'));
}
console.log('PASS tab strip keeps every focused tab reachable without arrows');
