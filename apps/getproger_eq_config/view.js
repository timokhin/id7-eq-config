'use strict';
const G = require('./kit/gauges');
const M = require('./profile-model');
const Tabs = require('./tabs');
const TOP = 158, BOTTOM = 358;
function ids(s) { return ['bass'].concat(M.eqIds.filter(id => s.available[id]), ['treble']); }
function positions(s) { const list = ids(s), left = list.length === 2 ? 490 : 150, right = list.length === 2 ? 1110 : 1450; return list.map((id, i) => ({ id, x: left + (right - left) * i / (list.length - 1) })); }
function tickAt(y) { return M.tick((TOP + BOTTOM - 2 * y) / (BOTTOM - TOP) * 10); }
function sliderAt(s, x, y) { if (s.tab < 2 || y < TOP || y > BOTTOM) return null; const p = positions(s).find((v) => Math.abs(v.x - x) < 48); return p && p.id; }
function draw(r, theme, s, a, store) {
    const white = '#eef1f6', dim = '#8e99ab', red = '#e52b35';
    const targets = [];
    const tabEntries = Tabs.entries(s.available), tabLabels = tabEntries.map(e => e.label), selectedTab = tabEntries.findIndex(e => e.index === s.tab);
    function text(v,x,y,size,color,opt) { r.text(String(v),x,y,size,color || white,opt); }
    function button(key,label,x,y,w,fn) { r.roundRect(x,y,w,38,18,'#21242b'); text(label,x+w/2,y+26,17,white,{align:'center'}); targets.push({key,x,y,w,h:38,run:fn}); }
    r.clear('#050609');
    r.fillRect(38,71,1524,415,'#101218'); r.fillRect(38,71,25,4,'#76bfff'); r.fillRect(66,71,25,4,'#2874a9'); r.fillRect(94,71,25,4,red); r.line(120,73,1562,73,1,'#b4bac3');
    if (s.tab === 0) {
        const d = s.debug, rows = d.rows(), pages = Math.max(1, Math.ceil(rows.length / 8));
        d.page = Math.min(d.page, pages - 1);
        text('AUDIO DEBUG',66,111,25,white);
        button('baseline','CAPTURE BASELINE',360,82,230,a.baseline);
        button('refresh','REFRESH',602,82,150,a.refresh);
        button('prev-page','<',1230,82,54,() => a.page(-1));
        button('next-page','>',1450,82,54,() => a.page(1));
        text('PAGE ' + (d.page + 1) + ' / ' + pages,1365,109,17,dim,{align:'center'});
        if (!d.base) text('1. Set audio controls to zero. Capture baseline.',66,175,21,white);
        else if (!d.current) text('Baseline saved. Press REFRESH to compare.',66,175,21,white);
        else if (!rows.length) text('No changes. Adjust audio in BMW settings, then press REFRESH.',66,175,21,white);
        else {
            text('SCOPE : INSTANCE : KEY',75,155,17,dim); text('BEFORE',1030,155,17,dim); text('AFTER',1300,155,17,dim);
            rows.slice(d.page * 8, d.page * 8 + 8).forEach((row,i) => {
                const y=183+i*31;
                r.line(68,y+9,1515,y+9,1,'#282c35');
                text(row.id,75,y,19,white); text(row.before,1030,y,19,white); text(row.after,1300,y,19,'#86c9ff');
            });
        }
        const shot = d.current, errors = shot ? shot.errors.length : 0;
        text('Changed: ' + rows.length + '    Read errors: ' + errors + '    ' + (shot ? shot.scopes.join(', ') : 'No current reading'),66,453,15,errors ? '#ffa955' : dim);
        text(s.status,66,478,16,s.error ? '#ffa955' : dim);
        s.targets=targets; r.targets=targets;
        G.frame(r,theme,tabLabels,selectedTab,[]);
        return;
    }
    const label = s.tab === 1 ? 'CURRENT VALUES' : (Tabs.profileName(s.tab) || '').toUpperCase();
    text(label,66,111,25,white);
    if (s.available.surround && s.tab === 1) {
        text('SURROUND  --',1535,108,17,dim,{align:'right'});
    } else if (s.available.surround) {
        const on = s.draft.surround;
        text('SURROUND',1190,103,18,white);
        r.roundRect(1350,80,100,38,19,on ? '#b32330' : '#383e49');
        r.roundRect(on ? 1417 : 1355,85,28,28,14,white);
        text(on ? 'ON' : 'OFF',1490,105,17,on ? white : dim);
        targets.push({key:'surround',x:1175,y:77,w:345,h:46,r:9,run:a.toggleSurround});
    }
    r.line(94,258,1506,258,1,'#4a505b');
    const ps = positions(s);
    ps.forEach(({id,x},i) => {
        const n = M.value(s.draft,id), known = !!s.available[id], y = 258 - n * 10;
        if (s.editing === id) r.roundRect(x-38,TOP-10,76,BOTTOM-TOP+20,8,'#51212a');
        r.roundRect(x-16,TOP,32,BOTTOM-TOP,5,'#2b303b');
        for (let t = -10; t <= 10; t++) { const major = t === 0 || Math.abs(t) === 10 || Math.abs(t) === 5; r.line(x-(major ? 27 : 22),258-t*10,x+(major ? 27 : 22),258-t*10,1,major ? '#a5afbd' : '#626c7a'); }
        if (known) { r.fillRect(x-13,Math.min(y,258),26,Math.abs(258-y) || 2,'#b32330'); r.roundRect(x-25,y-7,50,14,4,white); }
        const ix = M.eqIds.indexOf(id), caption = ix < 0 ? id.toUpperCase() : M.frequencies[ix] >= 1000 ? (M.frequencies[ix]/1000)+'k' : M.frequencies[ix];
        text(caption,x,408,17,dim,{align:'center'}); text(known ? (n > 0 ? '+' : '') + n : '--',x,430,18,white,{align:'center'});
        if (s.tab >= 2 && known) {
            const target = { key:'slider-'+id, x:x-38, y:TOP-8, w:76, h:BOTTOM-TOP+16, r:8,
                run:() => a.toggleEdit(id), touch:(phase, tx, ty) => a.touchEdit(id,ty) };
            if (s.editing === id) target.turn = (d) => a.edit(id, M.value(s.draft,id) + d);
            targets.push(target);
        }
    });
    if (s.tab >= 2) {
        if (s.applyEnabled) button('apply','APPLY',620,435,130,a.apply);
        else { r.roundRect(620,435,130,38,18,'#1a1c21'); text('APPLY',685,461,17,'#5a5f68',{align:'center'}); }
        button('save','SAVE',765,435,130,a.save);
        if (Tabs.isPreset(s.tab) && store.profiles[Tabs.profileName(s.tab)]) button('reset','RESET',910,435,130,a.reset);
    }
    text(s.status,66,478,16,s.error ? '#ffa955' : dim);
    s.targets=targets; r.targets=targets;
    G.frame(r,theme,tabLabels,selectedTab,[]);
}
module.exports = {draw,sliderAt,tickAt};
