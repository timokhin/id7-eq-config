'use strict';
const G=require('./kit/gauges');
const M=require('./profile-model');
const Tabs=require('./tabs');
const TOP=165, BOTTOM=365, MID=(TOP+BOTTOM)/2;
function tickAt(y){return M.tick((MID-y)/10);}
function draw(r,theme,s,a) {
    const white='#eef1f6',dim='#8e99ab',red='#e52b35',muted='#4e5664',targets=[];
    const tabs=Tabs.entries(s.audioType,s.showDebug),selected=tabs.indexOf(s.tab);
    function text(v,x,y,size,color,opt){r.text(String(v),x,y,size,color||white,opt);}
    function target(key,x,y,w,h,run){targets.push({key,x,y,w,h,r:8,run});}
    function button(key,label,x,y,w,run){r.roundRect(x,y,w,38,19,'#262a32');text(label,x+w/2,y+26,16,white,{align:'center'});target(key,x,y,w,38,run);}
    function toggle(key,label,value,x,y,run,enabled){
        text(label,x,y+27,20,enabled?white:dim);r.roundRect(x+230,y,100,38,19,value?'#b32330':'#383e49');
        r.roundRect(x+(value?297:235),y+5,28,28,14,white);text(value?'ON':'OFF',x+350,y+26,17,enabled?white:dim);
        if(enabled)target(key,x,y,440,42,run);
    }
    function slider(id,label,x,value,enabled){
        const y=MID-(Number.isFinite(value)?value:0)*10;
        if(s.editing===id)r.roundRect(x-34,TOP-8,68,BOTTOM-TOP+16,8,'#51212a');
        r.roundRect(x-13,TOP,26,BOTTOM-TOP,4,'#2b303b');
        for(let t=-10;t<=10;t++){const major=t===0||Math.abs(t)===5||Math.abs(t)===10;r.line(x-(major?23:19),MID-t*10,x+(major?23:19),MID-t*10,1,major?'#a5afbd':'#626c7a');}
        if(enabled){r.fillRect(x-10,Math.min(y,MID),20,Math.abs(MID-y)||2,'#b32330');r.roundRect(x-23,y-7,46,14,4,white);}
        text(label,x,405,16,dim,{align:'center'});text(enabled?((value>0?'+':'')+value):'--',x,430,18,enabled?white:dim,{align:'center'});
        if(enabled){const t={key:'slider-'+id,x:x-32,y:TOP-8,w:64,h:BOTTOM-TOP+16,r:8,run:()=>a.toggleEdit(id),touch:(phase,tx,ty)=>a.touchEdit(id,ty)};
            if(s.editing===id)t.turn=d=>a.edit(id,(s.tab==='Profiles'?M.value(s.draft,id):s.tab==='Scene'?s.scene[id]:s.ticks[id])+d);targets.push(t);}
    }
    r.clear('#050609');r.fillRect(38,71,1524,415,'#101218');r.fillRect(38,71,25,4,'#76bfff');r.fillRect(66,71,25,4,'#2874a9');r.fillRect(94,71,25,4,red);r.line(120,73,1562,73,1,'#b4bac3');
    if(s.tab==='Debug'){
        const d=s.debugMode==='surround'?s.surroundDebug:s.sceneDebug,rows=d.rows(),pages=Math.max(1,Math.ceil(rows.length/8));d.page=Math.min(d.page,pages-1);
        text('DEBUG',66,110,22,white);button('debug-mode',s.debugMode==='surround'?'SURROUND':'FADE / BALANCE',245,84,205,a.debugMode);
        button('capture','CAPTURE BASELINE',475,84,230,a.capture);button('refresh','REFRESH',720,84,145,a.refresh);
        button('prev','<',1190,84,55,()=>a.debugPage(-1));button('next','>',1450,84,55,()=>a.debugPage(1));text('PAGE '+(d.page+1)+' / '+pages,1345,110,16,dim,{align:'center'});
        if(!d.base)text('Set the control to its starting position and capture a baseline.',75,170,19,dim);
        else if(!rows.length)text('Change the control in BMW settings, then refresh.',75,170,19,dim);
        else {text('SCOPE : INSTANCE : KEY',75,155,16,dim);text('BEFORE',1030,155,16,dim);text('AFTER',1300,155,16,dim);
            rows.slice(d.page*8,d.page*8+8).forEach((row,i)=>{const y=183+i*31;r.line(68,y+9,1515,y+9,1,'#282c35');text(row.id,75,y,19,white);text(row.before,1030,y,19,white);text(row.after,1300,y,19,'#86c9ff');});}
        const shot=d.current;text('Changed: '+rows.length+'    Read errors: '+(shot?shot.errors.length:0)+'    '+(shot?shot.scopes.join(', '):''),66,453,15,dim);
    } else if(s.tab==='Profiles'){
        text('PROFILES',66,110,22,white);
        const first=Math.min(Math.max(0,s.names.length-6),Math.floor((s.profileScroll||0)/50));
        s.names.slice(first,first+6).forEach((name,j)=>{const i=first+j,y=125+j*50,active=s.active===name,selected=name===s.selected;
            if(selected)r.roundRect(56,y,338,47,5,active?'#521820':'#272b34');
            else if(active)r.roundRect(56,y,338,47,5,'#35151c');
            else if(i%2)r.roundRect(56,y,338,47,5,'#181b21');
            text(name,66,y+31,24,active?white:dim,{align:'left'});
            if(active){r.line(351,y+22,357,y+28,2,red);r.line(357,y+28,369,y+17,2,red);}
            target('profile-'+i,56,y,338,47,()=>a.profile(name));
        });
        if(s.names.length>6){const max=(s.names.length-6)*50,top=125+(s.profileScroll||0)/max*175;
            r.roundRect(405,125,4,300,2,'#30343b');r.roundRect(405,top,4,125,2,'#858b95');
            r.scroll={y:125,bar:{x:405,y:125,w:4,h:300}};
        }
        r.line(423,114,423,455,1,'#333944');text(s.selected.toUpperCase(),465,110,22,white);
        if(!M.equal(s.draft,M.defaults(s.selected)))button('reset-profile','RESET',1400,84,120,a.resetProfile);
        const ids=['bass'].concat(M.eqIds.filter(id=>s.available[id]),['treble']);
        ids.forEach((id,i)=>{const x=480+(1470-480)*i/(ids.length-1),ix=M.eqIds.indexOf(id),label=ix<0?id.toUpperCase():M.frequencies[ix]>=1000?(M.frequencies[ix]/1000)+'k':M.frequencies[ix];slider(id,label,x,M.value(s.draft,id),!!s.available[id]);});
    } else if(s.tab==='Scene'){
        text('SCENE',66,110,22,white);
        if((s.available.balance&&s.scene.balance!==0)||(s.available.fader&&s.scene.fader!==0))button('reset-scene','RESET',1400,84,120,a.resetScene);
        slider('balance','BALANCE',250,s.scene.balance,!!s.available.balance);slider('fader','FADE',500,s.scene.fader,!!s.available.fader);
        text('SOUND POSITION',1020,135,17,dim,{align:'center'});
        r.roundRect(900,153,240,268,85,'#252a33');r.roundRect(919,168,202,238,70,'#10151b');
        r.roundRect(934,193,73,65,12,'#333a45');r.roundRect(1033,193,73,65,12,'#333a45');
        r.roundRect(934,312,73,63,12,'#303640');r.roundRect(1033,312,73,63,12,'#303640');
        r.line(1020,180,1020,395,1,muted);r.line(932,286,1108,286,1,muted);
        if(s.available.balance&&s.available.fader){const x=1020+s.scene.balance*8,y=286-s.scene.fader*9;r.circle(x,y,18,'#74232a');r.circle(x,y,8,red);}
        else text('Scene controls unavailable',1020,452,16,dim,{align:'center'});
    } else if(s.tab==='Surround'){
        text('SURROUND',66,110,22,white);toggle('surround','SURROUND',s.surround,230,155,a.toggleSurround,!!s.available.surround);
    } else {
        text('SETTINGS',66,110,22,white);text('AUDIO TYPE',100,178,20,dim);
        [['stereo','STEREO'],['harman','HARMAN KARDON']].forEach(([type,label],i)=>{const x=100+i*335,on=s.audioType===type;
            r.roundRect(x,205,300,64,32,on?'#ce202b':'#74777e');
            if(!on)r.roundRect(x+2,207,296,60,30,'#202127');
            text(label,x+150,245,20,white,{align:'center',font:'bold',spacing:1.2});target('audio-'+type,x,205,300,64,()=>a.audioType(type));});
        toggle('debug-toggle','DEBUG',s.showDebug,100,310,a.toggleDebug,true);
    }
    text(s.status,66,478,16,s.error?'#ffa955':dim);s.targets=targets;r.targets=targets;G.frame(r,theme,tabs,selected,[]);
}
module.exports={draw,tickAt};
