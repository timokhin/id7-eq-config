'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./controls');
function scope(p) { return p.kind === 'system' ? 'system' : p.kind + ':' + p.entity; }
function validate(shot) {
    if (!shot || !Array.isArray(shot.points) || !Array.isArray(shot.scopes) || !Array.isArray(shot.errors) || shot.points.length > 10000) throw new Error('Invalid diagnostic snapshot');
    C.index(shot.points);
    return shot;
}
function compare(base, current) {
    if (!base || !current) return [];
    const before = C.index(base.points), after = C.index(current.points);
    return Array.from(new Set(Object.keys(before).concat(Object.keys(after)))).sort().reduce((rows, id) => {
        const b = before[id], a = after[id], p = a || b;
        // An unsuccessful scope is unknown, not evidence that its properties vanished.
        const oldValue = b ? b.value : base.scopes.includes(scope(p)) ? 'new' : '?';
        const newValue = a ? a.value : current.scopes.includes(scope(p)) ? 'gone' : '?';
        if (oldValue !== newValue) rows.push({id, before:oldValue, after:newValue});
        return rows;
    }, []);
}
class Debug {
    constructor(dir, log, suffix) {
        this.file = path.join(dir, 'audio-debug-baseline' + (suffix ? '-' + suffix : '') + '.json'); this.base = null; this.current = null; this.page = 0;
        try { this.base = validate(JSON.parse(fs.readFileSync(this.file, 'utf8'))); }
        catch (e) { if (e.code !== 'ENOENT') log.warn('Debug baseline: ' + e.message); }
    }
    update(shot) { this.current = validate(shot); }
    capture(shot) {
        validate(shot);
        if (!shot.scopes.length || !shot.points.length) throw new Error('No audio data to capture. Check the connection and retry.');
        const tmp = this.file + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(shot), {mode:0o600});
        fs.renameSync(tmp, this.file);
        this.base = shot; this.current = shot; this.page = 0;
    }
    rows() { return compare(this.base, this.current); }
}
module.exports = {Debug, compare, scope};
