'use strict';
const assert=require('assert'),fs=require('fs'),os=require('os'),path=require('path');
const {Debug,compare}=require('../apps/getproger_eq_config/debug');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'eq-debug-'));
const point=(kind,entity,key,value)=>({kind,entity,key,value});
const baseline={at:1,points:[point('system',0,42,0),point('car',1,7,2),point('sink',12,3,4)],scopes:['system','car:1','sink:12'],errors:[]};
const after={at:2,points:[point('system',0,42,-8),point('car',1,7,9),point('sink',12,4,6)],scopes:['system','car:1','sink:12'],errors:[]};
try {
 const d=new Debug(dir,{warn(){}});d.capture(baseline);d.update(after);
 assert.deepStrictEqual(d.rows().map(r=>[r.id,r.before,r.after]),[['car:1:7',2,9],['sink:12:3',4,'gone'],['sink:12:4','new',6],['system:0:42',0,-8]]);
 const restored=new Debug(dir,{warn(){}});restored.update(after);assert.deepStrictEqual(restored.rows(),d.rows());
 const failed={at:3,points:[point('system',0,42,0)],scopes:['system'],errors:['car:1: timeout','sink:12: timeout']};
 assert(compare(baseline,failed).some(r=>r.id==='car:1:7'&&r.after==='?'));
 assert.throws(()=>d.capture({points:[],scopes:[],errors:[]}));
 console.log('PASS debug compares identifiers, persists baseline, and distinguishes failed reads');
} finally {fs.rmSync(dir,{recursive:true,force:true});}
