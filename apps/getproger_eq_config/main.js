'use strict';
const mgu = require('./kit/mgu');
const C = require('./controls');
const P = require('./presets');
const M = require('./profile-model');
const Audio = require('./audio').Audio;
const Storage = require('./storage').Storage;
const ProfileStore = require('./profile-store').ProfileStore;
const view = require('./view');
const Debug = require('./debug').Debug;
const Tabs = require('./tabs');

mgu.run({ start(ctx) {
    const ui = ctx.ui, log = ctx.log, legacy = new Storage(ctx.dataDir, log), profiles = new ProfileStore(ctx.dataDir), audio = new Audio(ctx.signals, log);
    const debug = new Debug(ctx.dataDir, log);
    const s = {tab: 0, debug, draft: M.defaults(P.names[0]), current: {}, bindings: legacy.state.bindings,
        available: {}, applyEnabled: false, editing: null, detected: false, busy: false, targets: [], status: 'Checking audio...', error: false};
    let loop, eventTimer, lastRefresh = 0, dragging = null;
    function name() { return Tabs.profileName(s.tab); }
    function refreshDraft() { const n = name(); s.draft = n === 'Settings' && !profiles.profiles[n] ? M.fromCurrent(s.current, s.bindings, M.defaults(n)) : n ? profiles.get(n) : M.fromCurrent(s.current, s.bindings, M.defaults('')); }
    function message(text, error) { s.status = String(text); s.error = !!error; if (loop) loop.kick(); }
    async function run(fn) {
        if (s.busy) return;
        s.busy = true;
        try { await fn(); } catch (e) { message(e.message || e, true); log.warn(String(e.stack || e)); }
        finally { s.busy = false; if (loop) loop.kick(); }
    }
    async function read() {
        const shot = await audio.snapshot(), points = C.index(shot.points), current = {}, available = {};
        s.detected = shot.points.length > 0;
        M.controls.forEach((id) => {
            const b = s.bindings[id], point = b && points[b.id];
            if (C.validBinding(b) && point && C.normalized(b, point.value) !== null) { current[id] = point.value; available[id] = true; }
        });
        debug.update(shot);
        const wasEq = Tabs.hasEq(s.available);
        s.current = current; s.available = available; lastRefresh = Date.now();
        const hasEq = Tabs.hasEq(available);
        if (wasEq !== hasEq && s.tab !== 0) { s.tab = hasEq ? 1 : Tabs.settingsIndex; s.editing = null; refreshDraft(); }
        else if (s.tab === 1) refreshDraft();
        return shot;
    }
    function status() {
        if (!s.detected) return 'Audio unavailable';
        return 'Audio connected';
    }
    function openTab(i) {
        if (s.busy) return;
        const entry = Tabs.entries(s.available)[i];
        if (!entry) return;
        s.editing = null; s.tab = entry.index; refreshDraft(); message(status());
    }
    function edit(id, value) {
        if (s.busy || s.tab < 2) return;
        M.set(s.draft, id, value); message('Edited - save to keep changes');
    }
    function save() {
        if (!name()) throw new Error('Select a preset or custom slot.');
        profiles.save(name(), s.draft); message(name() + ' saved');
    }
    function reset() {
        if (!Tabs.isPreset(s.tab)) return;
        profiles.reset(name()); refreshDraft(); message(name() + ' reset to default');
    }
    async function apply() {
        if (!name()) throw new Error('Select a preset first.');
        await read();
        const ids = M.controls.filter((id) => s.available[id]);
        if (!ids.length) throw new Error('Audio control mapping unavailable; no settings were changed.');
        const base = {}, draft = {};
        ids.forEach((id) => { base[id] = s.current[id]; draft[id] = C.rawFromNormalized(s.bindings[id], M.value(s.draft, id) / 10); });
        if (!s.available.bass || !s.available.treble || !M.eqIds.every((id) => s.available[id]))
            throw new Error('Audio control mapping incomplete; no settings were changed.');
        message('Applying audio settings...');
        try { await audio.apply(s.bindings, draft, base); }
        catch (e) { try { await read(); } catch (_) { s.available = {}; } throw e; }
        await read(); message(name() + ' applied; surround mapping unknown');
    }
    const actions = { toggleSurround: () => { if (s.busy || s.tab < 2) return; s.editing = null; s.draft.surround = !s.draft.surround; message('Surround edited - save to keep changes'); }, toggleEdit: (id) => { s.editing = s.editing === id ? null : id; message(s.editing ? 'Turn to adjust; press to finish' : 'Edited - save to keep changes'); }, touchEdit: (id, y) => { s.editing = null; edit(id, view.tickAt(y)); }, baseline: () => run(async () => { await audio.connect(); const shot = await read(); debug.capture(shot); message('Baseline saved. Change audio settings, then return and refresh.'); }), refresh: () => run(async () => { await audio.connect(); await read(); message(debug.base ? 'Comparison refreshed' : 'Capture baseline first'); }), page: (d) => { debug.page = Math.max(0, Math.min(Math.max(0, Math.ceil(debug.rows().length / 8) - 1), debug.page + d)); if (loop) loop.kick(); }, tab: openTab, edit, save: () => run(async () => save()), reset: () => run(async () => reset()), apply: () => { if (s.applyEnabled) run(apply); }};
    ctx.onTab(openTab);
    ctx.onTouch((phase, x, y) => {
        if (phase === 1) dragging = view.sliderAt(s, x, y);
        if (dragging && (phase === 1 || phase === 2 || phase === 3)) edit(dragging, view.tickAt(y));
        if (phase === 3) dragging = null;
    });
    ctx.onTap((x, y) => {
        if (s.busy) return;
        const target = s.targets.slice().reverse().find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
        if (target) target.run();
    });
    async function render() { const cv = ctx.canvas(1600, 520); view.draw(cv, ctx.theme(), s, actions, profiles); await ui.image('MAIN_GFX', cv); }
    loop = ctx.loop('MAIN', 3, render);
    ui.onVisible((screen, visible) => { if (screen === 'MAIN' && visible && !s.busy && Date.now() - lastRefresh > 3000) run(async () => { await audio.connect(); await read(); message(status()); }); });
    audio.onChange = () => { clearTimeout(eventTimer); eventTimer = setTimeout(() => { if (!s.busy && ui.isVisible('MAIN')) run(async () => { await read(); message(status()); }); }, 450); };
    render().catch((e) => log.warn(e));
    setImmediate(() => run(async () => { await audio.connect(); await read(); message(status()); }));
} });
