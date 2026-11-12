'use strict';
const fs = require('fs');
const path = require('path');
const M = require('./profile-model');
class ProfileStore {
    constructor(dir) {
        this.file = path.join(dir, 'profiles-v2.json'); this.profiles = {};
        try {
            const saved = JSON.parse(fs.readFileSync(this.file, 'utf8'));
            if (!saved || saved.schema !== 1 || !saved.profiles || typeof saved.profiles !== 'object') throw new Error('Invalid profile store');
            Object.keys(saved.profiles).forEach((name) => { if (M.names.indexOf(name) < 0 || !M.valid(saved.profiles[name])) throw new Error('Invalid saved profile'); });
            this.profiles = saved.profiles;
        } catch (e) { if (e.code !== 'ENOENT') throw e; }
    }
    get(name) { return JSON.parse(JSON.stringify(this.profiles[name] || M.defaults(name))); }
    write(profiles) {
        const temp = this.file + '.tmp';
        const fd = fs.openSync(temp, 'w', 0o600);
        try { fs.writeFileSync(fd, JSON.stringify({schema: 1, profiles}, null, 2)); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
        fs.renameSync(temp, this.file); this.profiles = profiles;
    }
    save(name, profile) {
        if (M.names.indexOf(name) < 0 || !M.valid(profile)) throw new Error('Invalid profile');
        const profiles = Object.assign({}, this.profiles); profiles[name] = JSON.parse(JSON.stringify(profile)); this.write(profiles);
    }
    reset(name) {
        if (M.names.indexOf(name) < 0 || /^Custom [123]$/.test(name)) throw new Error('Cannot reset custom profile');
        const profiles = Object.assign({}, this.profiles); delete profiles[name]; this.write(profiles);
    }
}
module.exports = { ProfileStore };
