'use strict';
const assert=require('assert'),Module=require('module');
const old=Module._load;
Module._load=function(n,p){if(n==='./kit/gauges' && /getproger_eq_config\/view\.js$/.test(p.filename))return {frame(){}};return old.apply(this,arguments);};
const view=require('../apps/getproger_eq_config/view');Module._load=old;
const M=require('../apps/getproger_eq_config/profile-model');
const {Display}=require('../kit/runtime/display');
const s={tab:2,preset:0,editing:null,draft:M.defaults('Classical'),available:{bass:true,treble:true,surround:true,eq100:true,eq200:true,eq500:true,eq1k:true,eq2k:true,eq5k:true,eq10k:true},detected:true,status:'',targets:[]};
const c={clear(){},fillRect(){},line(){},text(){},roundRect(){}};
let display;
const a={toggleSurround(){s.draft.surround=!s.draft.surround;draw();},preset(){},save(){},reset(){},apply(){},toggleEdit(id){s.editing=s.editing===id?null:id;draw();},edit(id,value){M.set(s.draft,id,value);draw();},touchEdit(id,y){s.editing=null;M.set(s.draft,id,view.tickAt(y));draw();}};
function draw(){view.draw(c,{},s,a,{profiles:{}});if(display)display.pageTargets=s.targets;}
draw();
assert.strictEqual(s.targets.filter(t=>t.key.startsWith('slider-')).length,9);
const toggle=s.targets.find(t=>t.key==='surround');assert(toggle);toggle.run();assert.strictEqual(s.draft.surround,true);
assert(!s.targets.some(t=>/^(up|down)-/.test(t.key)));
assert(!s.targets.some(t=>t.key==='apply'),'Disabled apply must not receive focus or touch');
display=Object.create(Display.prototype);Object.assign(display,{pageTargets:s.targets,focusKey:'tgt:slider-bass',ccuLast:null,sheet:null,log:{error(e){throw e;}},_tabList(){return {tabs:[],sel:2,settings:-1};},_repaint(){},_focus(p){this.focusKey=p.k;},_ring(){return this.pageTargets.map(t=>({k:'tgt:'+t.key,tgt:t}));}});
const ccu=(k,pb)=>display._ccu({frontRotaryEncoderOperation:k,frontRotaryEncoderPushButton:pb,frontRotaryEncoderDeflection:0});
ccu(0,0);ccu(0,1);assert.strictEqual(s.editing,'bass');ccu(0,0);
const value=s.draft.bass;ccu(3,0);assert.strictEqual(s.draft.bass,Math.min(10,value+3));assert.strictEqual(display.focusKey,'tgt:slider-bass');
ccu(3,1);assert.strictEqual(s.editing,null);ccu(3,0);ccu(4,0);assert.strictEqual(display.focusKey,'tgt:slider-eq100');
const slider=s.targets.find(t=>t.key==='slider-eq100');slider.touch(1,slider.x,158);slider.touch(2,slider.x,358);slider.touch(3,slider.x,358);assert.strictEqual(s.draft.eq[0],-10);
// Captured touches continue when the finger leaves the target, and do not trigger a click.
let phases=[];const td=Object.create(Display.prototype);Object.assign(td,{place:{scale:1,ox:0,oy:0,h:520,x:0},sheet:null,touchTarget:null,pageTargets:[{key:'s',x:10,y:10,w:20,h:20,touch(p,x,y){phases.push([p,x,y]);},run(){throw Error('unexpected click');}}],tabs:[],own(){return true;},barH(){return 0;},buttons(){return [];},log:{error(e){throw e;}}});
td._touch(1,15,15);td._touch(2,70,80);td._touch(3,70,80);assert.deepStrictEqual(phases,[[1,15,15],[2,70,80],[3,70,80]]);assert.strictEqual(td.touchTarget,null);

// Swiping the tab strip moves its viewport without opening the touched tab.
let opened=0,repaints=0;const h=Object.create(Display.prototype);Object.assign(h,{place:{scale:1,ox:0,oy:0,h:520,x:0},sheet:null,touchTarget:null,tabs:[{i:0,x:0,y:0,w:100,h:40},{i:1,x:100,y:0,w:100,h:40}],pageTargets:[],own(){return true;},barH(){return 0;},buttons(){return [];},_tabList(){return {tabs:['Debug','Current','Rock','Pop']};},_repaint(){repaints++;},_openTab(){opened++;},log:{error(e){throw e;}}});
h._touch(1,120,20);h._touch(2,25,20);h._touch(3,25,20);assert.strictEqual(h.focusTab,2);assert.strictEqual(h.headerAnchor,2);assert.strictEqual(opened,0);assert(repaints);
console.log('PASS rotary focus, edit, press-to-finish, navigation, and captured touch drag');
