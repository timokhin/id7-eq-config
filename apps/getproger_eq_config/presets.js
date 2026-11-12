'use strict';

// The source export uses 33 for zero, 1 for -12 dB and 64 for +12 dB.
var presets = require('./preset-data');
var frequencies = [70, 180, 320, 600, 1000, 3000, 6000, 12000, 14000, 16000];

function toDb(value) {
    if (typeof value !== 'number' || value < 1 || value > 64) throw new Error('Invalid Winamp level');
    return value >= 33 ? (value - 33) * 12 / 31 : (value - 33) * 12 / 32;
}

// Approximation at the target centre frequency, linear in log-frequency.
// The resulting curve is not an exact acoustic match to Winamp's filters.
function interpolate(levels, frequency) {
    if (!Array.isArray(levels) || levels.length !== frequencies.length ||
        typeof frequency !== 'number' || !isFinite(frequency) || frequency <= 0) throw new Error('Invalid frequency or levels');
    var values = levels.map(toDb);
    if (frequency <= frequencies[0]) return values[0];
    for (var i = 1; i < frequencies.length; i++) {
        if (frequency <= frequencies[i]) {
            var ratio = Math.log(frequency / frequencies[i - 1]) / Math.log(frequencies[i] / frequencies[i - 1]);
            return values[i - 1] + ratio * (values[i] - values[i - 1]);
        }
    }
    return values[values.length - 1];
}
function forBands(name, bands) {
    if (!Object.prototype.hasOwnProperty.call(presets, name)) throw new Error('Unknown preset');
    if (!Array.isArray(bands) || !bands.length) throw new Error('No equalizer bands');
    return bands.map(function (frequency) { return interpolate(presets[name], frequency); });
}
module.exports = { names: Object.keys(presets), frequencies: frequencies, forBands: forBands, toDb: toDb };
