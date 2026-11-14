'use strict';
const mgu = require('./kit/mgu');
const C = require('./controls');
const P = require('./presets');
const M = require('./profile-model');
const Audio = require('./audio').Audio;
const Storage = require('./storage').Storage;
const ProfileStore = require('./profile-store').ProfileStore;
const view = require('./view');
const Tabs = require('./tabs');
const Observed = require('./observed-controls');
const Debug = require('./debug').Debug;

mgu.run({ start(ctx) {
    const ui=ctx.ui, log=ctx.log, legacy=new Storage(ctx.dataDir, log), profiles=new ProfileStore(ctx.dataDir), audio=new Audio(ctx.signals, log);
    const settings=ctx.settings || {get(){return 'harman';},set(){}};
    const sceneDebug=new Debug(ctx.dataDir,log,'balance'), surroundDebug=new Debug(ctx.dataDir,log,'surround');
    const names=P.names.concat(['Custom 1','Custom 2','Custom 3']);
    const s={tab:'Profiles',audioType:settings.get('audioType') || 'harman',showDebug:settings.get('showDebug')===true,debugMode:'surround',sceneDebug,surroundDebug,names, selected:names[0],active:null,draft:profiles.get(names[0]),
        current:{},ticks:{},scene:{},surround:false,available:{},bindings:{},editing:null,profileScroll:0,targets:[],status:'Checking audio...',error:false,writing:false};
    if(s.audioType==='stereo')s.tab='Scene';
    let loop, timer, pending=[], eventTimer, lastRefresh=0;
    const clone=o=>JSON.parse(JSON.stringify(o));
    const say=(v,e)=>{s.status=String(v);s.error=!!e;if(loop)loop.kick();};
    const eqIds=['bass','treble'].concat(M.eqIds);
    function refreshActive() {
        const ids=eqIds.filter(id=>s.available[id]);
        if (!ids.length) {s.active=null;return;}
        const candidates=names.filter(name=>{const p=profiles.get(name);return ids.every(id=>M.value(p,id)===s.ticks[id]);});
        s.active=candidates.includes(s.selected)?s.selected:(candidates[0]||null);
    }
    async function read() {
        const shot=await audio.snapshot(), points=C.index(shot.points), current={},ticks={},available={};
        s.bindings=Object.assign({},Observed.bindings(),legacy.state.bindings);
        for(const id of eqIds.concat(['balance','fader','surround','surroundLevel'])) {
            const b=s.bindings[id],point=b&&points[b.id];
            if(!C.validBinding(b)||!point)continue;
            const normalized=id==='surround'? (point.value===0||point.value===1?point.value:null):C.normalized(b,point.value);
            if(normalized===null)continue;
            current[id]=point.value; ticks[id]=id==='surround'?!!point.value:Math.round(normalized*10);available[id]=true;
        }
        s.current=current;s.ticks=ticks;s.available=available;lastRefresh=Date.now();
        sceneDebug.update(shot);surroundDebug.update(shot);
        if(!s.writing&&!pending.length){s.scene={balance:ticks.balance,fader:ticks.fader};s.surround=!!ticks.surround;refreshActive();}
        return shot;
    }
    async function applyValues(values) {
        await read();
        const base={},draft={};
        Object.keys(values).forEach(id=>{
            const b=s.bindings[id];
            if(!s.available[id]||!C.validBinding(b)||!C.rawValue(s.current[id]))throw new Error('Audio control unavailable: '+id);
            base[id]=s.current[id];
            draft[id]=id==='surround'?(values[id]?1:0):C.rawFromNormalized(b,values[id]/10);
        });
        if(!Object.keys(draft).length)throw new Error('Audio controls unavailable');
        await audio.apply(s.bindings,draft,base);
        await read();
    }
    async function drain() {
        if(s.writing)return;
        s.writing=true;
        while(pending.length) {
            const job=pending.shift();
            try {
                await applyValues(job.values);
                if(job.profile) profiles.save(job.profile,job.profileValue);
                if(!pending.length)say(job.message||'Audio updated');
            } catch(e) {
                pending=[];
                try { await read(); }catch(_){}
                if(job.profile && s.selected===job.profile)s.draft=profiles.get(job.profile);
                say(e.message||e,true);log.warn(String(e.stack||e));
            }
        }
        s.writing=false;s.scene={balance:s.ticks.balance,fader:s.ticks.fader};s.surround=!!s.ticks.surround;refreshActive();if(loop)loop.kick();
    }
    function enqueue(job) {
        const prior=pending.findIndex(p=>p.kind===job.kind);
        if(prior>=0){if(job.kind==='scene')job.values=Object.assign({},pending[prior].values,job.values);pending[prior]=job;}
        else pending.push(job);
        clearTimeout(timer);timer=setTimeout(drain,70);if(loop)loop.kick();
    }
    function profileValues(p) {const values={};eqIds.forEach(id=>{if(s.available[id])values[id]=M.value(p,id);});return values;}
    function select(name) {if(!names.includes(name))return;s.selected=name;s.draft=profiles.get(name);s.editing=null;enqueue({kind:'profile',values:profileValues(s.draft),message:name+' applied'});}
    function edit(id,n) {
        if(!s.available[id])return;
        n=M.tick(n);
        if(s.tab==='Profiles'&&eqIds.includes(id)) {
            M.set(s.draft,id,n); const p=clone(s.draft);
            enqueue({kind:'profile',values:profileValues(p),profile:s.selected,profileValue:p,message:s.selected+' updated'});
        } else if(s.tab==='Scene'&&(id==='balance'||id==='fader')) {
            s.scene[id]=n; enqueue({kind:'scene',values:{[id]:n},message:'Scene updated'});
        } else if(s.tab==='Surround'&&id==='surroundLevel') {
            s.ticks[id]=n;enqueue({kind:'level',values:{[id]:n},message:'Surround updated'});
        }
    }
    const a={
        tab(i){const label=Tabs.entries(s.audioType,s.showDebug)[i];if(label){s.tab=label;s.editing=null;if(loop)loop.kick();}},
        profile:select,
        toggleEdit(id){s.editing=s.editing===id?null:id;if(loop)loop.kick();},
        edit,
        touchEdit(id,y){edit(id,view.tickAt(y));},
        resetProfile(){s.draft=M.defaults(s.selected);const p=clone(s.draft);enqueue({kind:'profile',values:profileValues(p),profile:s.selected,profileValue:p,message:s.selected+' reset'});},
        resetScene(){const v={};['balance','fader'].forEach(id=>{if(s.available[id]){s.scene[id]=0;v[id]=0;}});enqueue({kind:'scene',values:v,message:'Scene reset'});},
        toggleSurround(){if(!s.available.surround)return;const value=!s.surround;s.surround=value;enqueue({kind:'surround',values:{surround:value},message:'Surround updated'});},
        audioType(type){if(!['stereo','harman'].includes(type))return;s.audioType=type;settings.set('audioType',type);s.editing=null;if(!Tabs.entries(type,s.showDebug).includes(s.tab))s.tab='Scene';if(loop)loop.kick();},
        toggleDebug(){s.showDebug=!s.showDebug;settings.set('showDebug',s.showDebug);if(!s.showDebug&&s.tab==='Debug')s.tab='Settings';if(loop)loop.kick();},
        debugMode(){s.debugMode=s.debugMode==='surround'?'scene':'surround';if(loop)loop.kick();},
        capture(){audio.connect().then(read).then(shot=>{(s.debugMode==='surround'?surroundDebug:sceneDebug).capture(shot);say('Baseline captured');}).catch(e=>say(e.message,true));},
        refresh(){audio.connect().then(read).then(()=>say('Comparison refreshed')).catch(e=>say(e.message,true));},
        debugPage(delta){const d=s.debugMode==='surround'?surroundDebug:sceneDebug;d.page=Math.max(0,Math.min(Math.max(0,Math.ceil(d.rows().length/8)-1),d.page+delta));if(loop)loop.kick();}
    };
    ctx.onTab(a.tab);
    if(ctx.onScroll)ctx.onScroll((dy)=>{
        if(s.tab!=='Profiles')return false;
        const max=Math.max(0,(s.names.length-6)*50),next=Math.max(0,Math.min(max,s.profileScroll+dy));
        if(next===s.profileScroll)return false;
        s.profileScroll=next;if(loop)loop.kick();return true;
    });
    ctx.onTap((x,y)=>{const target=s.targets.slice().reverse().find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);if(target)target.run();});
    if(ctx.onTouch)ctx.onTouch(()=>{});
    async function render(){const cv=ctx.canvas(1600,520);view.draw(cv,ctx.theme(),s,a,profiles);await ui.image('MAIN_GFX',cv);}
    loop=ctx.loop('MAIN',3,render);
    ui.onVisible((screen,visible)=>{if(screen==='MAIN'&&visible&&!s.writing&&Date.now()-lastRefresh>3000)audio.connect().then(read).then(()=>say('Audio connected')).catch(e=>say(e.message,true));});
    audio.onChange=()=>{clearTimeout(eventTimer);eventTimer=setTimeout(()=>{if(!s.writing&&!pending.length&&ui.isVisible('MAIN'))read().then(()=>say('Audio connected')).catch(e=>say(e.message,true));},450);};
    render().catch(e=>log.warn(e));
    setImmediate(()=>audio.connect().then(read).then(()=>{if(s.active){s.selected=s.active;s.draft=profiles.get(s.active);s.profileScroll=Math.max(0,names.indexOf(s.active)-5)*50;}say(Object.keys(s.available).length?'Audio connected':'Audio unavailable');}).catch(e=>say(e.message,true)));
} });
