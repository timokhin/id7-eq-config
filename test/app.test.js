'use strict';
const assert = require('assert'), fs = require('fs'), os = require('os'), path = require('path'), Module = require('module');
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'eq-profile-test-'));
let start, state, actions;
const old = Module._load;
Module._load = function(name, parent) {
    if (parent && /getproger_eq_config\/main\.js$/.test(parent.filename)) {
        if (name === './kit/mgu') return {run(spec) {start=spec.start;}};
        if (name === './view') return {draw(r,t,s,a){state=s;actions=a;},sliderAt(){return 'bass';},tickAt(){return 5;}};
    }
    return old.apply(this, arguments);
};
require('../apps/getproger_eq_config/main'); Module._load=old;
const writes=[]; let raw=0;
const ctx={dataDir:dir, log:{warn(){},info(){}}, signals:{async proxy(iface){if(iface.includes('CommandControl'))return {};throw Error('not present');},async on(){},async call(p,method,args){if(method==='getListSystemProperties')return {amError:0,listSystemProperties:[{type:3,value:raw}]};if(method==='getListMainSinks')return {amError:0,listMainSinks:[]};writes.push(args);return {amError:0};}}, ui:{onVisible(){},isVisible(){return true;},async image(){}},onTab(){},onTouch(){},onTap(){},canvas(){return {};},theme(){return {};},loop(k,n,fn){return {kick(){fn();}};}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{start(ctx);for(let i=0;i<5;i++)await tick();assert(state.detected);actions.baseline();for(let i=0;i<5;i++)await tick();raw=7;actions.refresh();for(let i=0;i<5;i++)await tick();assert.deepStrictEqual(state.debug.rows().map(r=>[r.id,r.before,r.after]),[['system:0:3',0,7]]);assert.strictEqual(writes.length,0);actions.tab(1);assert.strictEqual(state.tab,15);actions.tab(0);state.available.eq100=true;actions.tab(2);actions.edit('bass',7);actions.toggleSurround();assert.strictEqual(state.draft.surround,true);actions.save();await tick();assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir,'profiles-v2.json'))).profiles.Classical.bass,7);assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir,'profiles-v2.json'))).profiles.Classical.surround,true);actions.apply();for(let i=0;i<5;i++)await tick();assert.strictEqual(state.applyEnabled,false);assert.strictEqual(writes.length,0);actions.reset();await tick();assert(!JSON.parse(fs.readFileSync(path.join(dir,'profiles-v2.json'))).profiles.Classical);actions.tab(12);actions.edit('treble',-3);actions.save();await tick();assert.strictEqual(JSON.parse(fs.readFileSync(path.join(dir,'profiles-v2.json'))).profiles['Custom 1'].treble,-3);console.log('PASS profiles persist, reset, and unknown mappings never write');})().then(()=>fs.rmSync(dir,{recursive:true,force:true}),e=>{console.error(e);fs.rmSync(dir,{recursive:true,force:true});process.exitCode=1;});
