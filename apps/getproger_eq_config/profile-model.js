'use strict';
const P = require('./presets');
const C = require('./controls');
const frequencies = [100, 200, 500, 1000, 2000, 5000, 10000];
const eqIds = ['eq100', 'eq200', 'eq500', 'eq1k', 'eq2k', 'eq5k', 'eq10k'];
const names = P.names.concat(['Custom 1', 'Custom 2', 'Custom 3', 'Settings']);
const controls = ['bass'].concat(eqIds, ['treble']);
function tick(n) { return Math.max(-10, Math.min(10, Math.round(n))); }
function defaults(name) {
    if (P.names.indexOf(name) < 0) return { bass: 0, eq: eqIds.map(() => 0), treble: 0, surround: false };
    const eq = P.forBands(name, frequencies).map((x) => tick(x / 12 * 10));
    return { bass: tick((eq[0] + eq[1]) / 4), eq, treble: tick((eq[5] + eq[6]) / 4), surround: false };
}
function valid(p) {
    return !!p && Number.isInteger(p.bass) && p.bass >= -10 && p.bass <= 10 &&
        Number.isInteger(p.treble) && p.treble >= -10 && p.treble <= 10 &&
        Array.isArray(p.eq) && p.eq.length === 7 && p.eq.every((n) => Number.isInteger(n) && n >= -10 && n <= 10) && typeof p.surround === 'boolean';
}
function value(profile, id) { const i = eqIds.indexOf(id); return i >= 0 ? profile.eq[i] : profile[id]; }
function set(profile, id, n) { const i = eqIds.indexOf(id); if (i >= 0) profile.eq[i] = tick(n); else if (id === 'bass' || id === 'treble') profile[id] = tick(n); }
function fromCurrent(current, bindings, fallback) {
    const p = JSON.parse(JSON.stringify(fallback));
    controls.forEach((id) => { const n = C.normalized(bindings[id], current[id]); if (n !== null) set(p, id, n * 10); });
    return p;
}
function fromTicks(current, fallback) {
    const p = JSON.parse(JSON.stringify(fallback));
    controls.forEach((id) => { if (Number.isInteger(current[id])) set(p, id, current[id]); });
    if (typeof current.surround === 'boolean') p.surround = current.surround;
    return p;
}
function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
module.exports = { frequencies, eqIds, controls, names, defaults, valid, value, set, fromCurrent, fromTicks, equal, tick };
