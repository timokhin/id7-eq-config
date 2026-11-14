'use strict';
const G=require('./kit/gauges');
const M=require('./profile-model');
const Tabs=require('./tabs');
const TOP=165, BOTTOM=365, MID=(TOP+BOTTOM)/2;
const LEVEL_LEFT=80, LEVEL_RIGHT=680;
function tickAt(y,max){max=max||10;return Math.max(-max,Math.min(max,Math.round((MID-y)*max/100)));}
function levelAt(x){return Math.max(-2,Math.min(2,Math.round((x-LEVEL_LEFT)*4/(LEVEL_RIGHT-LEVEL_LEFT)-2)));}
function draw(r,theme,s,a) {
    const white='#eef1f6',dim='#8e99ab',red='#e52b35',muted='#4e5664',targets=[];
    const tabs=Tabs.entries(s.audioType),selected=tabs.indexOf(s.tab);
    function text(v,x,y,size,color,opt){r.text(String(v),x,y,size,color||white,opt);}
    function target(key,x,y,w,h,run){targets.push({key,x,y,w,h,r:8,run});}
    function button(key,label,x,y,w,run){r.roundRect(x,y,w,38,19,'#262a32');text(label,x+w/2,y+26,16,white,{align:'center'});target(key,x,y,w,38,run);}
    function toggle(key,label,value,x,y,run,enabled){
        text(label,x,y+27,20,enabled?white:dim);r.roundRect(x+230,y,100,38,19,value?'#b32330':'#383e49');
        r.roundRect(x+(value?297:235),y+5,28,28,14,white);text(value?'ON':'OFF',x+350,y+26,17,enabled?white:dim);
        if(enabled)target(key,x,y,440,42,run);
    }
    function slider(id,label,x,value,enabled){
        const max=id==='surroundLevel'?2:10, step=100/max;
        const y=MID-(Number.isFinite(value)?value:0)*step;
        if(s.editing===id)r.roundRect(x-34,TOP-8,68,BOTTOM-TOP+16,8,'#51212a');
        r.roundRect(x-13,TOP,26,BOTTOM-TOP,4,'#2b303b');
        for(let t=-max;t<=max;t++){const major=t===0||Math.abs(t)===max||(max===10&&Math.abs(t)===5);r.line(x-(major?23:19),MID-t*step,x+(major?23:19),MID-t*step,1,major?'#a5afbd':'#626c7a');}
        if(enabled){r.fillRect(x-10,Math.min(y,MID),20,Math.abs(MID-y)||2,'#b32330');r.roundRect(x-23,y-7,46,14,4,white);}
        text(label,x,405,16,dim,{align:'center'});text(enabled?((value>0?'+':'')+value):'--',x,430,18,enabled?white:dim,{align:'center'});
        if(enabled){const t={key:'slider-'+id,x:x-32,y:TOP-8,w:64,h:BOTTOM-TOP+16,r:8,run:()=>a.toggleEdit(id),touch:(phase,tx,ty)=>a.touchEdit(id,ty)};
            if(s.editing===id)t.turn=d=>a.edit(id,(s.tab==='Profiles'?M.value(s.draft,id):s.tab==='Scene'?s.scene[id]:s.surroundLevel)+d);targets.push(t);}
    }
    function surroundSlider(value,enabled){
        const left=LEVEL_LEFT,right=LEVEL_RIGHT,mid=(left+right)/2,y=315;
        const x=mid+(Number.isFinite(value)?value:0)*(right-left)/4;
        text('LEVEL',66,264,20,enabled?white:dim);
        text(enabled?((value>0?'+':'')+value):'--',right,264,20,enabled?white:dim,{align:'right'});
        if(s.editing==='surroundLevel')r.roundRect(left-20,y-32,right-left+40,64,12,'#51212a');
        r.roundRect(left,y-5,right-left,10,5,'#343b46');
        if(enabled)r.roundRect(Math.min(mid,x),y-5,Math.max(1,Math.abs(x-mid)),10,5,'#b32330');
        for(let t=-2;t<=2;t++){const tx=mid+t*(right-left)/4;r.line(tx,y+15,tx,y+25,2,'#8993a2');text(t>0?'+'+t:t,tx,y+50,16,dim,{align:'center'});}
        if(enabled)r.roundRect(x-9,y-17,18,34,6,white);
        if(enabled){const t={key:'slider-surroundLevel',x:left-20,y:y-30,w:right-left+40,h:90,r:8,
            run:()=>a.toggleEdit('surroundLevel'),touch:(phase,tx)=>a.edit('surroundLevel',levelAt(tx))};
            if(s.editing==='surroundLevel')t.turn=d=>a.edit('surroundLevel',s.surroundLevel+d);targets.push(t);}
    }
    r.clear('#050609');r.fillRect(38,49,1524,437,'#101218');r.fillRect(38,49,25,4,'#76bfff');r.fillRect(66,49,25,4,'#2874a9');r.fillRect(94,49,25,4,red);r.line(120,51,1562,51,1,'#b4bac3');
    if(s.tab==='Profiles'){
        text('PROFILES',66,110,22,white);
        const first=Math.min(Math.max(0,s.names.length-6),Math.floor((s.profileScroll||0)/50));
        s.names.slice(first,first+6).forEach((name,j)=>{const i=first+j,y=125+j*50,active=s.active===name,selected=name===s.selected;
            if(selected)r.roundRect(56,y,338,47,5,active?'#521820':'#272b34');
            else if(active)r.roundRect(56,y,338,47,5,'#35151c');
            else if(i%2)r.roundRect(56,y,338,47,5,'#181b21');
            text(name,66,y+31,24,active?white:dim,{align:'left'});
            if(active){r.line(351,y+22,357,y+28,2,red);r.line(357,y+28,369,y+17,2,red);}
            target('profile-'+i,56,y,338,47,()=>a.profile(name));
            targets[targets.length-1].navigate=d=>a.navigateProfile(i,d);
        });
        if(s.names.length>6){const max=(s.names.length-6)*50,top=125+(s.profileScroll||0)/max*175;
            r.roundRect(405,125,4,300,2,'#30343b');r.roundRect(405,top,4,125,2,'#858b95');
            r.scroll={y:125,bar:{x:405,y:125,w:4,h:300},focusItems:true};
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
        text('SURROUND',66,110,22,white);toggle('surround','SURROUND',s.surround,66,155,a.toggleSurround,!!s.available.surround);
        surroundSlider(s.surroundLevel,!!s.available.surroundLevel);
    } else {
        text('SETTINGS',66,110,22,white);text('AUDIO TYPE',100,178,20,dim);
        [['stereo','STEREO'],['harman','HARMAN KARDON']].forEach(([type,label],i)=>{const x=100+i*335,on=s.audioType===type;
            r.roundRect(x,205,300,64,32,on?'#ce202b':'#74777e');
            if(!on)r.roundRect(x+2,207,296,60,30,'#202127');
            text(label,x+150,245,20,white,{align:'center',font:'bold',spacing:1.2});target('audio-'+type,x,205,300,64,()=>a.audioType(type));});
    }
    text(s.status,66,478,16,s.error?'#ffa955':dim);s.targets=targets;r.targets=targets;G.frame(r,theme,tabs,selected,[]);
}
module.exports={draw,tickAt,levelAt};
