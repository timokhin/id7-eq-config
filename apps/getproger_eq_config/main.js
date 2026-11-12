'use strict';
const mgu = require('./kit/mgu');
const C = require('./controls');
const model = require('./model');
const Audio = require('./audio').Audio;
const Storage = require('./storage').Storage;
const view = require('./view');
const bands = model.bands;

mgu.run({ start(ctx) {
    const ui = ctx.ui, log = ctx.log, store = new Storage(ctx.dataDir, log), audio = new Audio(ctx.signals, log);
    const s = { store: store, selected: 0, band: 0, setup: false, busy: false,
        detected: false, ready: false, current: {}, status: 'Checking audio services...', error: false, targets: [] };
    let loop, eventTimer, lastRefresh = 0;
    if (store.state.learning) { s.setup = true; s.band = Math.max(0, bands.findIndex((c) => c.id === store.state.learning.control)); }
    function message(v, error) { s.status = String(v); s.error = !!error; if (loop) loop.kick(); }
    async function run(fn) {
        if (s.busy) return;
        s.busy = true;
        try { await fn(); } catch (e) { message(e.message || e, true); log.warn(String(e.stack || e)); }
        finally { s.busy = false; if (loop) loop.kick(); }
    }
    async function read() {
        const shot = await audio.snapshot(), points = C.index(shot.points), current = {};
        s.detected = shot.points.length > 0;
        bands.forEach((c) => {
            const b = store.state.bindings[c.id], p = b && points[b.id];
            if (C.validBinding(b) && p && C.normalized(b, p.value) !== null) current[c.id] = p.value;
        });
        s.current = current;
        s.ready = bands.every((c) => Object.prototype.hasOwnProperty.call(current, c.id));
        lastRefresh = Date.now();
        return shot;
    }
    function status() {
        if (s.ready) return 'Equalizer ready. Select a preset and press Apply.';
        if (s.detected) return 'Equalizer not verified. Set up all seven bands.';
        return 'Equalizer unavailable or no audio response. Press Refresh to retry.';
    }
    function change(d) {
        if (s.busy || store.state.learning) return;
        if (s.setup) s.band = (s.band + d + bands.length) % bands.length;
        else s.selected = (s.selected + d + model.names.length + 1) % (model.names.length + 1);
        if (loop) loop.kick();
    }
    async function capture() {
        if (!s.setup) { s.setup = true; message('Select a band and press Capture.'); return; }
        let learning = store.state.learning;
        if (!learning) {
            store.update((v) => { v.learning = {control: bands[s.band].id, shots: []}; });
            message('Set this band to centre, then press Capture.'); return;
        }
        const shot = await read();
        if (!shot.points.length) throw new Error('No audio readings. Retry after reconnecting.');
        const scopes = shot.scopes.slice().sort().join('|');
        if (learning.scopes && learning.scopes !== scopes) throw new Error('Audio sources changed during setup. Cancel and retry.');
        const shots = learning.shots.concat([shot.points]);
        if (shots.length < 4) {
            store.update((v) => { v.learning.shots = shots; v.learning.scopes = scopes; });
            message(['', 'Set the band to minimum, then press Capture.', 'Set the band to maximum, then press Capture.', 'Return to centre, then press Capture.'][shots.length]);
            return;
        }
        const binding = C.learn(learning.control, shots, store.state.bindings);
        store.update((v) => { v.bindings[learning.control] = binding; v.learning = null; });
        await read(); message(s.ready ? status() : 'Band configured. Select the next band.');
    }
    async function apply() {
        if (s.setup || store.state.learning) throw new Error('Finish or cancel setup first.');
        await read();
        if (!s.ready) throw new Error(status());
        if (s.selected === 0) { message('Showing current equalizer values.'); return; }
        const name = model.names[s.selected - 1];
        let draft;
        if (s.selected <= model.slotNames.length) {
            const slot = store.state.profiles[String(s.selected)];
            if (!slot) { message(name + ' is empty. Press Save current to fill it.'); return; }
            draft = model.slotValues(slot, store.state.bindings);
            if (!draft) throw new Error(name + ' belongs to different calibration. Save it again.');
        } else draft = model.targets(name, store.state.bindings);
        const base = {};
        bands.forEach((c, i) => {
            base[c.id] = s.current[c.id];
        });
        message('Applying and checking all seven bands...');
        let result;
        try { result = await audio.apply(store.state.bindings, draft, base); }
        catch (e) { try { await read(); } catch (_) { s.ready = false; s.current = {}; } throw e; }
        await read();
        message(name + ' applied; ' + result.count + ' bands changed and verified.');
    }
    async function saveCurrent() {
        if (s.setup || store.state.learning) throw new Error('Finish or cancel setup first.');
        if (s.selected < 1 || s.selected > model.slotNames.length) throw new Error('Select a custom slot first.');
        await read();
        if (!s.ready) throw new Error(status());
        const slot = model.saveSlot(store.state.bindings, s.current), id = String(s.selected);
        store.update((v) => { v.profiles[id] = slot; });
        message(model.names[s.selected - 1] + ' saved.');
    }
    function toggleSetup() {
        if (s.busy) return;
        if (store.state.learning) store.update((v) => { v.learning = null; });
        s.setup = !s.setup;
        message(s.setup ? 'Select a band and press Capture.' : status());
    }
    ui.onClick('BTN_PREVIOUS', () => change(-1));
    ui.onClick('BTN_NEXT', () => change(1));
    ui.onClick('BTN_APPLY', () => run(apply));
    ui.onClick('BTN_SAVE', () => run(saveCurrent));
    ui.onClick('BTN_SETUP', () => { try { toggleSetup(); } catch (e) { message(e.message || e, true); } });
    ui.onClick('BTN_CAPTURE', () => run(capture));
    ui.onClick('BTN_REFRESH', () => run(async () => { await audio.connect(); await read(); message(status()); }));
    const actions = { select(i) {
        if (s.busy || s.setup) return;
        s.selected = i;
        if (loop) loop.kick();
        if (i === 0) run(async () => { await read(); message(s.ready ? 'Showing current equalizer values.' : status()); });
        else run(apply);
    } };
    ctx.onTap((x, y) => {
        if (s.busy) return;
        const hit = s.targets.slice().reverse().find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
        if (hit) hit.act();
    });
    async function render() { const cv = ctx.canvas(1600, 520); view.draw(cv, ctx.theme(), s, actions); await ui.image('MAIN_GFX', cv); }
    loop = ctx.loop('MAIN', 3, render);
    ui.onVisible((name, visible) => { if (name === 'MAIN' && visible && !s.busy && Date.now() - lastRefresh > 3000) run(async () => { await audio.connect(); await read(); message(status()); }); });
    audio.onChange = () => { clearTimeout(eventTimer); eventTimer = setTimeout(() => { if (!s.busy && ui.isVisible('MAIN')) run(async () => { await read(); message(status()); }); }, 450); };
    render().catch((e) => log.warn(e));
    setImmediate(() => run(async () => { await audio.connect(); await read(); message(status()); }));
} });
