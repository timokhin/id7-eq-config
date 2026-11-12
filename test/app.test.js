'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Module = require('module');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'eq-config-test-'));
let start, state, tap;
const oldLoad = Module._load;
Module._load = function (name, parent, main) {
    if (parent && /getproger_eq_config\/main\.js$/.test(parent.filename)) {
        if (name === './kit/mgu') return {run(spec) { start = spec.start; }};
        if (name === './view') return { draw(r,t,s,a) { state = s; s.targets = [{ x: 0, y: 0, w: 10, h: 10, act: () => a.select(9) }, { x: 11, y: 0, w: 10, h: 10, act: () => a.select(0) }, {x: 22, y: 0, w: 10, h: 10, act: () => a.select(1)}]; } };
    }
    return oldLoad.apply(this, arguments);
};
require('../apps/getproger_eq_config/main');
Module._load = oldLoad;
const callbacks = {}, raw = Array(7).fill(0), writes = [];
const signals = {
    async proxy(iface) { if (iface.indexOf('CommandControl') < 0) throw new Error('not present'); return {}; },
    async on() {},
    async call(p, method, args) {
        if (method === 'getListSystemProperties') return {amError:0, listSystemProperties: raw.map((value, type) => ({type, value}))};
        if (method === 'getListMainSinks') return {amError:0, listMainSinks: []};
        if (method === 'setSystemProperty') { raw[args.property.type] = args.property.value; writes.push(args.property); return {amError:0}; }
        throw new Error('Unexpected ' + method);
    }
};
const ctx = {signals, dataDir: dir, log:{warn(){},info(){}}, ui: {
    onClick(k, fn) { callbacks[k] = fn; }, onVisible(){}, isVisible(){return true;}, async image(){}
}, onTap(fn){tap = fn;}, canvas(){return {};}, theme(){return {};}, loop(k,n,fn) { return { kick() { fn(); } }; }};
function tick() { return new Promise(resolve => setImmediate(resolve)); }
async function click(name) { callbacks[name](); await tick(); for (let i=0; i<100 && state.busy; i++) await tick(); assert(!state.busy); }
(async () => {
    start(ctx); await tick(); await tick();
    assert.strictEqual(state.ready, false);
    await click('BTN_APPLY'); assert.strictEqual(writes.length, 0);
    tap(5, 5); await tick(); await tick(); assert.strictEqual(writes.length, 0);
    assert(state.error);
    await click('BTN_SETUP');
    for (let i = 0; i < 7; i++) {
        await click('BTN_CAPTURE');
        for (const value of [0,-12,12,0]) { raw[i] = value; await click('BTN_CAPTURE'); }
        assert(state.store.state.bindings[['eq100','eq200','eq500','eq1k','eq2k','eq5k','eq10k'][i]]);
        if (i < 6) await click('BTN_NEXT');
    }
    assert.strictEqual(state.ready, true);
    await click('BTN_SETUP');
    tap(5, 5); await tick(); for (let i = 0; i < 100 && state.busy; i++) await tick();
    assert(writes.length > 0);
    assert(/applied/.test(state.status));
    const model = require('../apps/getproger_eq_config/model');
    assert(model.matches('Rock', state.store.state.bindings, state.current));
    const count = writes.length;
    tap(15, 5); await tick(); for (let i = 0; i < 100 && state.busy; i++) await tick();
    assert.strictEqual(state.selected, 0);
    assert.strictEqual(writes.length, count);
    raw[0] = raw[0] === 12 ? 11 : raw[0] + 1;
    await click('BTN_REFRESH');
    assert(!model.matches('Rock', state.store.state.bindings, state.current));
    tap(25, 5); await tick(); for (let i = 0; i < 100 && state.busy; i++) await tick();
    assert(/empty/.test(state.status));
    const saved = raw.slice(), countBeforeSave = writes.length;
    await click('BTN_SAVE');
    assert(/saved/.test(state.status));
    assert.strictEqual(writes.length, countBeforeSave);
    const Storage = require('../apps/getproger_eq_config/storage').Storage;
    const reloaded = new Storage(dir, {warn(){}, info(){}});
    assert(model.slotValues(reloaded.state.profiles['1'], reloaded.state.bindings));
    raw[0] = raw[0] === 12 ? 11 : raw[0] + 1;
    await click('BTN_APPLY');
    assert.deepStrictEqual(raw, saved);
    assert(/applied/.test(state.status));
    state.store.update((v) => { v.bindings.eq100.high += 1; });
    const countBeforeMismatch = writes.length;
    await click('BTN_APPLY');
    assert(state.error && /calibration/.test(state.status));
    assert.strictEqual(writes.length, countBeforeMismatch);
    await click('BTN_SAVE');
    assert(!state.error && /saved/.test(state.status));
    for (let slot = 2; slot <= 3; slot++) {
        await click('BTN_NEXT'); await click('BTN_SAVE');
        assert(state.store.state.profiles[String(slot)]);
    }
    console.log('Application calibration and apply scenario passed');
})().then(() => fs.rmSync(dir, {recursive:true, force:true}), err => { console.error(err); fs.rmSync(dir, {recursive:true, force:true}); process.exitCode=1; });
