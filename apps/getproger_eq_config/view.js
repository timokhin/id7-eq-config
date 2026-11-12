'use strict';
const G = require('./kit/gauges');
const P = require('./presets');
const C = require('./controls');
const model = require('./model');
const FREQ = model.frequencies;
function draw(r, theme, s, a) {
    const white = '#eef3fc', dim = '#a3afbd', blue = '#74c7ff';
    const text = (v, x, y, size, color, opt) => r.text(String(v), x, y, size, color || white, opt);
    const targets = [];
    function target(key, x, y, w, h, fn) { targets.push({ key, x, y, w, h, act: fn, run: fn }); }
    r.clear('#080d15');
    if (!s.setup) {
        text('PRESETS', 55, 76, 20, dim);
        text('FREQUENCY PREVIEW', 560, 76, 20, dim);
        const first = Math.max(0, Math.min(s.selected - 3, model.names.length - 6));
        const rows = [{name: 'Current values', index: 0}].concat(model.names.slice(first, first + 6).map((name, j) => ({name, index: first + j + 1})));
        rows.forEach((row, j) => {
            const name = row.name, i = row.index, y = 93 + j * 51;
            const slot = i > 0 && i <= model.slotNames.length ? s.store.state.profiles[String(i)] : null;
            const saved = slot && model.slotValues(slot, s.store.state.bindings);
            const active = i > 0 && s.ready && (i <= model.slotNames.length
                ? saved && model.bands.every((c) => saved[c.id] === s.current[c.id])
                : model.matches(name, s.store.state.bindings, s.current));
            r.roundRect(42, y, 455, 44, 7, i === s.selected ? '#204769' : '#111c29');
            text(name, 65, y + 30, 23, i === s.selected ? blue : white);
            if (active) text('ACTIVE', 475, y + 29, 16, '#78dfad', {align:'right'});
            else if (i > 0 && i <= model.slotNames.length) text(!slot ? 'EMPTY' : !saved ? 'SETUP CHANGED' : 'SAVED', 475, y + 29, 16, dim, {align:'right'});
            target('preset' + i, 42, y, 455, 44, () => a.select(i));
        });
        const current = s.selected === 0, custom = s.selected > 0 && s.selected <= model.slotNames.length;
        const slot = custom && s.store.state.profiles[String(s.selected)];
        const saved = custom && model.slotValues(slot, s.store.state.bindings);
        const scale = current || custom ? 100 : 12;
        const values = current ? model.currentValues(s.store.state.bindings, s.current)
            : custom ? model.currentValues(s.store.state.bindings, saved || {}) : P.forBands(model.names[s.selected - 1], FREQ);
        const left = 615, step = 128, mid = 255;
        [scale, 0, -scale].forEach((v) => { const y = mid - v * 108 / scale; r.line(590, y, 1500, y, 1, '#35465a'); text((v > 0 ? '+' : '') + v, 575, y + 6, 16, dim, {align:'right'}); });
        values.forEach((v, i) => {
            const x = left + i * step, y = v === null ? mid : mid - v * 108 / scale;
            if (v !== null) {
                r.line(x, mid, x, y, 7, blue); r.circle(x, y, 8, white);
                if (i && values[i - 1] !== null) r.line(x - step, mid - values[i - 1] * 108 / scale, x, y, 2, blue);
            }
            text(FREQ[i] >= 1000 ? (FREQ[i] / 1000) + 'k' : FREQ[i], x, 399, 18, dim, {align:'center'});
            text(v === null ? '--' : (v > 0 ? '+' : '') + v.toFixed(1), x, 430, 18, white, {align:'center'});
        });
        text(current ? 'Current position, % of calibrated range' : custom
            ? !slot ? 'Empty slot - press Save current' : !saved ? 'Calibration changed - save this slot again' : 'Saved position, % of calibrated range'
            : 'Approximate Winamp curve, dB', 590, 470, 19, dim);
    } else {
        const learning = s.store.state.learning, phase = learning ? learning.shots.length : -1;
        const control = C.CONTROLS[s.band];
        text('EQUALIZER SETUP', 55, 83, 23, dim);
        text(control.label, 55, 146, 40, blue);
        text('Band ' + (s.band + 1) + ' of 7', 55, 183, 23, dim);
        text(s.store.state.bindings[control.id] ? 'Configured' : 'Not configured', 55, 223, 21, white);
        text('Use Previous / Next to choose a band.', 55, 285, 21, dim);
        const instructions = [
            'Choose a band and press Capture to begin.',
            'Set this band to the centre in BMW sound settings.',
            'Set this band to minimum in BMW sound settings.',
            'Set this band to maximum in BMW sound settings.',
            'Return this band to its original centre position.'
        ];
        text(instructions[phase + 1], 550, 145, 27, white);
        text('Return here and press Capture after each adjustment.', 550, 198, 21, dim);
        text('Keep every other sound setting unchanged.', 550, 235, 21, dim);
        text('Set up all seven bands before applying a preset.', 550, 295, 21, dim);
        text('Set up exits or cancels the current measurement.', 550, 332, 21, dim);
    }
    r.fillRect(0, 492, 1600, 28, '#101d2b');
    text(s.status, 42, 512, 18, s.error ? '#ffbd69' : dim);
    s.targets = targets; r.targets = targets;
    G.frame(r, theme, ['EQ CONFIG'], 0, [{text: s.ready ? 'EQ READY' : s.detected ? 'SETUP NEEDED' : 'EQ UNAVAILABLE', color: s.ready ? blue : dim}]);
}
module.exports = { draw, FREQ };
