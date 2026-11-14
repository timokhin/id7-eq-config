'use strict';
const labels = ['Profiles', 'Scene', 'Surround', 'Settings'];
function entries(audioType,showDebug) {
    const entries=audioType === 'stereo' ? [labels[1], labels[3]] : labels.slice();
    return showDebug ? ['Debug'].concat(entries) : entries;
}
module.exports = { labels, entries };
