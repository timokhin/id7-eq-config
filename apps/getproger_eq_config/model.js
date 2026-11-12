'use strict';
const C = require('./controls');
const P = require('./presets');
const frequencies = [100, 200, 500, 1000, 2000, 5000, 10000];
const bands = C.CONTROLS.filter((c) => c.group === 'eq');
const slotNames = ['Custom 1', 'Custom 2', 'Custom 3'];
const names = slotNames.concat(P.names);

function signature(binding) {
    return JSON.stringify([binding.id, binding.low, binding.center, binding.high, binding.direction]);
}
function slotValues(slot, bindings) {
    if (!slot || !slot.values || !slot.bindingIds) return null;
    if (!bands.every((c) => C.validBinding(bindings[c.id]) &&
        slot.bindingIds[c.id] === signature(bindings[c.id]) &&
        C.normalized(bindings[c.id], slot.values[c.id]) !== null)) return null;
    return bands.reduce((out, c) => { out[c.id] = slot.values[c.id]; return out; }, {});
}
function saveSlot(bindings, current) {
    const values = {}, bindingIds = {};
    bands.forEach((c) => {
        const b = bindings[c.id];
        if (C.normalized(b, current[c.id]) === null) throw new Error('All seven bands must be available.');
        values[c.id] = current[c.id]; bindingIds[c.id] = signature(b);
    });
    return { values, bindingIds };
}

function targets(name, bindings) {
    const values = P.forBands(name, frequencies), result = {};
    bands.forEach((c, i) => { result[c.id] = C.rawFromNormalized(bindings[c.id], values[i] / 12); });
    return result;
}
function matches(name, bindings, current) {
    if (!bands.every((c) => C.validBinding(bindings[c.id]) &&
        C.normalized(bindings[c.id], current[c.id]) !== null)) return false;
    const expected = targets(name, bindings);
    return bands.every((c) => current[c.id] === expected[c.id]);
}
function currentValues(bindings, current) {
    return bands.map((c) => {
        const value = C.normalized(bindings[c.id], current[c.id]);
        return value === null ? null : value * 100;
    });
}
module.exports = { frequencies, bands, names, slotNames, targets, matches, currentValues, slotValues, saveSlot };
