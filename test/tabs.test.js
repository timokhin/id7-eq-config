'use strict';
const assert=require('assert'),T=require('../apps/getproger_eq_config/tabs');
assert.deepStrictEqual(T.entries('harman'),['Profiles','Scene','Surround','Settings']);
assert.deepStrictEqual(T.entries('stereo'),['Scene','Settings']);
assert.deepStrictEqual(T.entries('stereo',true),['Debug','Scene','Settings']);
assert.deepStrictEqual(T.entries('harman',true),['Debug','Profiles','Scene','Surround','Settings']);
console.log('PASS audio type and debug navigation');
