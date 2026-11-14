'use strict';
const labels = ['Profiles', 'Scene', 'Surround', 'Settings'];
function entries(audioType) {
    return audioType === 'stereo' ? [labels[1], labels[3]] : labels.slice();
}
module.exports = { labels, entries };
