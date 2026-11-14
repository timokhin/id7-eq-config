'use strict';
const assert=require('assert'),T=require('../apps/getproger_eq_config/tabs');
assert.deepStrictEqual(T.entries('harman'),['Profiles','Scene','Surround','Settings']);
assert.deepStrictEqual(T.entries('stereo'),['Scene','Settings']);
assert.deepStrictEqual(T.entries('stereo',true),['Scene','Settings']);
assert.deepStrictEqual(T.entries('harman',true),['Profiles','Scene','Surround','Settings']);
console.log('PASS audio type and debug navigation');
