'use strict';
const P = require('./presets');
const labels = ['Debug','Current'].concat(P.names, ['Custom 1','Custom 2','Custom 3', 'Settings']);
const settingsIndex = labels.length - 1;
function hasEq(available) { return require('./profile-model').eqIds.some(id => !!available[id]); }
function entries(available) { return hasEq(available) ? labels.slice(0, settingsIndex).map((label,index) => ({label,index})) : [{label:'Debug',index:0},{label:'Settings',index:settingsIndex}]; }
function isPreset(tab) { return tab >= 2 && tab < 2 + P.names.length; }
function profileName(tab) { return tab === settingsIndex ? 'Settings' : isPreset(tab) ? P.names[tab-2] : tab >= 2 + P.names.length && tab < settingsIndex ? 'Custom ' + (tab - 1 - P.names.length) : null; }
module.exports = {labels, settingsIndex, hasEq, entries, isPreset, profileName};
