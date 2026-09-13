/* Diploma defense. Actors, captions and audio share a pausable scene clock. */
(function(root){
 'use strict';
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
 const art={ready:false,failed:false,frames:{},hall:null};let loaded=0;
 function split(im,cols,rows,key){
  const frames=[],edges=key==='crowd'?[0,338/1086,706/1086,1]:[0,575/1024,1];
  for(let i=0;i<cols*rows;i++){
   const x=Math.round(i%cols*im.width/cols),y=Math.round(edges[Math.floor(i/cols)]*im.height),w=Math.round((i%cols+1)*im.width/cols)-x,h=Math.round(edges[Math.floor(i/cols)+1]*im.height)-y;
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const c=canvas.getContext('2d',{willReadFrequently:true});c.drawImage(im,x,y,w,h,0,0,w,h);
   const pixels=c.getImageData(0,0,w,h),d=pixels.data;let l=w,r=0,t=h,b=0;
   for(let yy=0;yy<h;yy++)for(let xx=0;xx<w;xx++){
    const p=(yy*w+xx)*4;if(key==='principals'&&d[p]>90&&d[p+2]>90&&d[p+1]<Math.min(d[p],d[p+2])*.62)d[p+3]=0;
    if(d[p+3]>100){l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);}
   }
   c.putImageData(pixels,0,0);frames.push({canvas,l,t,w:r-l+1,h:b-t+1});
  }return frames;
 }
 for(const key of ['hall','crowd','principals']){
  const im=new Image();im.onload=()=>{if(key==='hall'){art.hall=document.createElement('canvas');art.hall.width=1280;art.hall.height=720;art.hall.getContext('2d').drawImage(im,0,0,1280,720);}else art.frames[key]=split(im,key==='crowd'?4:3,key==='crowd'?3:2,key);art.ready=++loaded===3;};
  im.onerror=()=>{art.failed=true;console.error('Opening artwork unavailable: '+key);};im.src=root.GUROV_PROLOGUE_DATA?.[key]||'assets/prologue/'+key+'.png';
 }
 function sprite(c,key,i,x,feet,height,reference=i,facing=1,angle=0){
  const f=art.frames[key]?.[i],ref=art.frames[key]?.[reference];if(!f||!ref)return;
  const s=height/ref.h;c.save();c.translate(x,feet);c.scale(facing,1);c.rotate(angle);c.imageSmoothingEnabled=true;c.drawImage(f.canvas,f.l,f.t,f.w,f.h,-f.w*s/2,-f.h*s,f.w*s,f.h*s);c.restore();
 }
 function student(c,id,x,feet,height,time,running=true,facing=1){
  const cycle=time*8+id*.8,frame=running?4+id+(Math.floor(cycle)%2)*4:id;
  sprite(c,'crowd',frame,x,feet-(running?Math.abs(Math.sin(cycle*Math.PI))*2:Math.sin(time*1.4+id)*.6),height,4+id,facing,running?Math.sin(cycle*Math.PI)*.018:0);
 }
 function text(c,value,x,y,size,color='#f2dfb3',align='left') {c.font=`${size>=24?'bold ':''}${size}px Georgia,serif`;c.fillStyle=color;c.textAlign=align;c.fillText(value,x,y);}
 function wrap(c,value,width){const rows=[];let line='';for(const word of value.split(' ')){const next=line?line+' '+word:word;if(c.measureText(next).width>width&&line){rows.push(line);line=word;}else line=next;}if(line)rows.push(line);return rows;}
 const seats=Array.from({length:30},(_,i)=>{const row=Math.floor(i/10),column=i%10;return {row,id:i%4,x:45+column*100+row*8,feet:477+row*91,h:126+row*15,delay:row*.65+(9-column)*.16};});
 class Prologue{
  constructor(){this.index=0;this.time=0;this.elapsed=0;this.phase='line';this.fade=0;this.quiet=0;this.spoken=false;this.done=false;this.cues=new Set();this.escape=0;this.reduced=root.matchMedia('(prefers-reduced-motion: reduce)').matches;}
  get status(){return {index:this.index,time:this.time,elapsed:this.elapsed,phase:this.phase,escape:this.escape,tomatoHit:this.cues.has('splat'),seated:seats.filter(s=>this.escape<=s.delay).length,ready:art.ready};}
  update(dt,sound,active){
   if(!active||this.done||!art.ready)return;
   if(this.phase==='line'){
    const line=root.GurovPrologueLines[this.index];
    if(!this.spoken){this.spoken=true;this.quiet=0;sound.speak(line.actor,line.text,4);}
    // Do not fire a throw or change the caption while its voice is decoding.
    if(sound.voicePending)return;
    this.time+=dt;this.quiet=sound.voiceActive?0:this.quiet+dt;
    if(this.time>=line.duration&&this.quiet>=.85){this.phase='out';this.fade=0;}
   }else{
    this.fade+=dt;
    if(this.phase==='out'&&this.fade>=.5){if(this.index===4){this.phase='title';this.fade=0;sound.sfx('dash');}else{this.index++;this.time=0;this.fade=0;this.phase='line';this.spoken=false;}}
    else if(this.phase==='title'&&this.fade>=3.4)this.done=true;
   }
   this.elapsed+=dt;
   const cue=(key,name)=>{if(!this.cues.has(key)){this.cues.add(key);sound.sfx(name);}};
   if(this.index===1&&this.time>=.8)cue('diploma','bodyFall');
   if(this.index===2&&this.time>=1.25)cue('throw','tomatoThrow');
   if(this.index===2&&this.time>=2.05)cue('splat','tomatoSplat');
   if(this.cues.has('splat')){
    this.escape+=dt;
    const step=Math.floor(this.escape*5);if(this.escape<10&&step!==this.step){this.step=step;sound.sfx('step');}
   }
  }
  draw(c,cast){
   c.fillStyle='#171f24';c.fillRect(0,0,1280,720);
   if(!art.ready){text(c,art.failed?'Не удалось загрузить аудиторию':'Готовим аудиторию…',640,345,29,undefined,'center');return;}
   const i=this.index,t=this.time,hit=this.cues.has('splat'),panic=this.escape;
   c.save();
   const zoom=this.reduced?1:1+.018*smooth(this.elapsed/9),shake=!this.reduced&&i===2?Math.max(0,1-(t-2.05)/.3)*Number(t>=2.05):0;
   c.translate(640+Math.sin(t*95)*shake*5,340);c.scale(zoom,zoom);c.translate(-640,-340);c.drawImage(art.hall,0,0);
   // Board text belongs to the scene, stays legible, and never reveals later cast.
   text(c,'ЗАЩИТА ДИПЛОМНЫХ РАБОТ',596,112,24,'#cfdbbd','center');
   text(c,'модель + графики ≠ доказательство',596,154,21,'#abc7b8','center');
   text(c,i>=1?'ГДЕ ПРИКЛАДНАЯ АЛГЕБРА?':'Что именно вы доказали?',596,203,i>=1?25:23,i>=1?'#f0c588':'#d5d4b0','center');
   if(i>=1){c.strokeStyle='#e5b480';c.lineWidth=2;c.beginPath();c.moveTo(373,215);c.lineTo(821,215);c.stroke();}
   let gx=683,gy=380;
   if(i===4&&t>3){const u=smooth((t-3)/3.4);gx+=u*497;gy-=u*45;}
   if(i===4&&t>3){const u=smooth((t-3)/3.4);cast?.draw(c,'gurov',1+Math.floor(t*10)%6,gx,gy,208-u*25,1,0,1-smooth((u-.94)/.06));}
   else{
    const pose=hit&&(i===2||i===3&&t<1.1)?2:i===0?(Math.floor(t/2.4)%2):i===1&&t<1.35?0:1;
    const bob=this.reduced?0:Math.sin(t*3)*1.3;
    if(this.pose!==pose){this.previousPose=this.pose??pose;this.pose=pose;this.poseAt=this.elapsed;}
    const mix=smooth((this.elapsed-this.poseAt)/.16),angle=hit&&i===2?-.025:Math.sin(t*2)*.008;
    // One opaque pose at a time: dissolving drawings produces double faces.
    sprite(c,'principals',mix<.4?this.previousPose:pose,gx,gy+bob,208,0,1,angle+(this.reduced?0:Math.sin(mix*Math.PI)*.024));
    if(hit&&pose!==2){c.fillStyle='#bb4430';c.beginPath();c.ellipse(gx+7,gy-113,7,9,-.3,0,Math.PI*2);c.fill();}
   }
   // Students sit BEHIND the painted backs of their seats. The lower body of
   // the seated atlas is occluded; no floating crossed legs in the auditorium.
   for(let row=0;row<3;row++){
    for(const s of seats.filter(s=>s.row===row)){
     if(panic>s.delay)continue;
     if(row===0&&Math.abs(s.x-845)<35)continue;
     student(c,s.id,s.x,s.feet,s.h,this.elapsed,false);
    }
    const sy=[449,518,611][row],height=[29,51,109][row];c.drawImage(art.hall,0,sy,1080,height,0,sy,1080,height);
   }
   if(i<2){
    c.save();c.beginPath();c.rect(795,354,103,95);c.clip();cast?.draw(c,'ivan',0,846,510,144,-1);c.restore();
    c.drawImage(art.hall,798,449,96,27,798,449,96,27);
   }
   const runners=seats.filter(s=>panic>s.delay).map(s=>{
    const age=panic-s.delay,toAisle=(1127-s.x)/230,u=clamp((age-toAisle)/1.65),travel=clamp(age/(toAisle+1.65));
    return {s,age,travel,x:Math.min(1127,s.x+age*230)+u*63,y:s.feet+(336-s.feet)*u,h:s.h+(105-s.h)*u};
   }).filter(s=>s.travel<1).sort((a,b)=>a.y-b.y);
   for(const r of runners){c.save();c.globalAlpha=1-smooth((r.travel-.93)/.07);student(c,r.s.id,r.x,r.y,r.h,r.age+r.s.delay,true);c.restore();}
   if(i>=2&&i<4){
    if(i===2&&t<2.85){const rise=smooth(t/.45),pose=t<1.25?3:t<1.85?4:5;sprite(c,'principals',pose,846,478+(1-rise)*52,156,5);}
    else{const age=Math.max(0,panic-.8),u=smooth(age/3.4);if(u<1)cast?.draw(c,'ivan',1+Math.floor(age*11)%6,846+u*340,478-u*142,156-u*40,1);}
   }
   if(i===2&&t>=1.25&&t<2.05){const u=(t-1.25)/.8,x=784+(695-784)*u,y=381+(245-381)*u-Math.sin(u*Math.PI)*78;root.GurovItems.draw(c,'tomato',x,y,27,27,t*10);}
   if(hit&&panic<.7){const u=panic/.7;c.save();c.globalAlpha=1-u;for(let n=0;n<13;n++){const a=n*2.399;c.fillStyle=n%2?'#e95837':'#a8291c';c.beginPath();c.ellipse(695+Math.cos(a)*u*68,245+Math.sin(a)*u*55+u*u*30,4*(1-u)+1,3,0,0,Math.PI*2);c.fill();}c.restore();}
   if(!this.reduced){c.fillStyle='#fff2bd44';for(let n=0;n<16;n++){const x=1000+Math.sin(n*2.4+this.elapsed*.2)*170,y=130+((n*31+this.elapsed*5)%250);c.fillRect(x,y,1.5,1.5);}}
   c.restore();
   c.fillStyle='#111d25f2';c.fillRect(0,0,1280,51);text(c,root.GurovPrologueLines[i].title,35,32,17,'#e6d0a7');text(c,'ПРОЛОГ',1245,32,15,'#90afa6','right');
   c.fillStyle='#101c25f5';c.fillRect(0,624,1280,96);c.fillStyle='#d7b373';c.fillRect(35,644,3,52);
   const opacity=this.phase==='out'?1-smooth(this.fade/.5):smooth(t/.45);c.save();c.globalAlpha=opacity;
   const line=root.GurovPrologueLines[i];text(c,line.name,53,647,13,i===2?'#f0ac9b':'#d6bd81');
   c.font='22px Georgia,serif';const caption=line.actor==='gurov'?root.GurovEngine.lisp(line.text):line.text;
   wrap(c,caption,1160).forEach((s,n)=>text(c,s,53,676+n*27,22,'#f5e9d1'));c.restore();
   if(this.phase==='title'){
    const f=smooth(this.fade/.6);c.fillStyle=`rgba(12,23,30,${f})`;c.fillRect(0,0,1280,720);c.save();c.globalAlpha=f;
    text(c,'ГУРОВ',640,315,96,'#f2db9e','center');text(c,'ПОСЛЕДНИЙ УДОВЛ',640,378,38,'#e6c185','center');text(c,'ИВАН, У МЕНЯ ВФЕГО ОДИН ВОПРОФ.',640,455,19,'#a9c6bd','center');c.restore();
   }
  }
 }
 // Analytic bounded crowd: no ever-growing entity arrays or physics bodies.
 // Door coordinates follow the painted VMK panorama, including its parallax.
 function courtyard(c,world,time){
  if(!art.ready)return;const doorX=1225-world.camera*.25,doorY=513;
  c.save();c.beginPath();c.rect(0,440,1280,139);c.clip();
  for(let j=0;j<18;j++){
   const age=(time+j*.72)%12.96,u=clamp(age/1.4),dir=j%3===0?-1:1;
   const x=doorX+dir*(age*58+age*age*3),y=doorY+smooth(u)*44+(j%3)*5,h=29+smooth(u)*26;
   if(x< -80||x>1360)continue;c.globalAlpha=smooth(age/.24)*(1-smooth((age-11.5)/1.46));
   student(c,j%4,x,y,h,age+j,true,dir);
  }c.restore();
 }
 root.GurovPrologue=Prologue;root.GurovPrologueArt=art;root.GurovCourtyardCrowd={draw:courtyard,capacity:18};
})(window);
