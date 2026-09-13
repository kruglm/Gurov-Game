/* Cached classroom scenery and fixed-scale performances for the final film. */
(function(root){
 const clamp=v=>Math.max(0,Math.min(1,v)),ease=v=>{v=clamp(v);return v*v*(3-2*v);};
 const names={gurov:'Сергей Исаевич Гуров',roman:'Роман Акрамов',ivan:'Иван Павленко',erik:'Эрик Ильясов',sasha:'Саша Ситников',ravil:'Равиль Абдраманов'};
 const colors={gurov:'#eed397',roman:'#bdd4e2',ivan:'#f0b4aa',erik:'#d5ce93',sasha:'#c8ddb0',ravil:'#a9dbd2'};
 const notes=[
  {page:0,at:3.2,seconds:4.5,text:'(G, ·)',x:446,y:222,size:36},
  {page:2,at:2.2,seconds:5.1,text:'e · a = a · e = a',x:567,y:222,size:31},
  {page:3,at:1.8,seconds:4.4,text:'e₁ = e₁ · e₂ = e₂',x:498,y:274,size:32},
  {page:7,at:4.3,seconds:2.7,text:'Q. E. D.',x:728,y:332,size:29}
 ];
 function rect(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(x,y,w,h);}
 function path(c,points,color,fill=false,width=1){c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.lineWidth=width;if(fill){c.closePath();c.fillStyle=color;c.fill();}else{c.strokeStyle=color;c.stroke();}}
 function label(c,text,x,y,size,color,font='Georgia'){c.font=`${size}px ${font}`;c.fillStyle=color;c.fillText(text,x,y);}
 function shadow(c,x,y,rx,alpha=.2){c.fillStyle=`rgba(12,21,23,${alpha})`;c.beginPath();c.ellipse(x,y,rx,7,0,0,Math.PI*2);c.fill();}
 function makeRoom(){
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;const c=canvas.getContext('2d');
  const wall=c.createLinearGradient(0,62,1280,500);wall.addColorStop(0,'#2e676e');wall.addColorStop(.55,'#759d8b');wall.addColorStop(1,'#264e5b');c.fillStyle=wall;c.fillRect(0,0,1280,720);
  rect(c,0,70,1280,7,'#a5ad92');rect(c,0,77,1280,6,'#263f44');
  // Tall glazed windows, a leafy courtyard and the warm light falling into the room.
  for(const x of [33,152]){
   rect(c,x-6,103,110,283,'#273f43');rect(c,x,109,98,270,'#b7c6ae');
   const sky=c.createLinearGradient(0,110,0,380);sky.addColorStop(0,'#b8e0df');sky.addColorStop(.6,'#ece5b7');sky.addColorStop(1,'#72957a');c.fillStyle=sky;c.fillRect(x+6,115,86,257);
   path(c,[[x+50,350],[x+51,241],[x+33,219],[x+51,246],[x+72,205]],'#466d62',false,4);
   for(let j=0;j<12;j++){c.fillStyle=j%2?'#497b6888':'#819c7288';c.beginPath();c.ellipse(x+15+(j*31)%65,221+(j*23)%109,23,16,-.4,0,Math.PI*2);c.fill();}
   rect(c,x+46,111,5,265,'#d7d4b7');rect(c,x+2,236,94,7,'#d7d4b7');rect(c,x-9,381,118,9,'#bcae87');
   c.fillStyle='#ffffe714';c.beginPath();c.moveTo(x+12,115);c.lineTo(x+89,115);c.lineTo(x+37,372);c.lineTo(x+7,372);c.fill();
  }
  const beam=c.createLinearGradient(100,200,850,610);beam.addColorStop(0,'#ffe9a740');beam.addColorStop(1,'#ffe9a700');path(c,[[36,235],[252,235],[885,622],[432,622]],beam,true);
  // Panelled lower walls; real floor perspective gives every chair a ground plane.
  rect(c,0,408,1280,93,'#344f4c');rect(c,0,408,1280,7,'#b4aa81');rect(c,0,418,1280,3,'#203a3e');
  for(let x=14;x<1280;x+=88){c.strokeStyle='#658075';c.strokeRect(x,432,68,51);rect(c,x+3,435,2,44,'#293f3e');}
  rect(c,0,498,1280,10,'#20393c');rect(c,0,507,1280,3,'#beaa7f');
  const floor=c.createLinearGradient(0,508,0,638);floor.addColorStop(0,'#c29966');floor.addColorStop(1,'#755133');c.fillStyle=floor;c.fillRect(0,510,1280,210);
  for(let i=-11;i<=12;i++)path(c,[[640+i*45,510],[640+i*91,670]],'#483e3555');
  for(const y of [525,548,581,626]){path(c,[[0,y],[1280,y]],'#332e2b55');path(c,[[0,y+1],[1280,y+1]],'#d2b58233');}
  // A deep green chalkboard, wood frame, chalk rail and lightly erased old work.
  shadow(c,653,404,344,.19);rect(c,305,108,681,290,'#263d3c');rect(c,311,111,668,280,'#a88253');rect(c,318,118,654,267,'#3e5643');
  const board=c.createLinearGradient(325,120,965,380);board.addColorStop(0,'#214e47');board.addColorStop(.6,'#183e39');board.addColorStop(1,'#14332f');c.fillStyle=board;c.fillRect(325,124,640,254);
  c.save();c.globalAlpha=.012;c.strokeStyle='#d5e3c9';for(let i=0;i<23;i++){c.lineWidth=4+(i%4)*2;c.beginPath();c.ellipse(389+i*21,168+(i*29)%163,48,6,.12,0,Math.PI*2);c.stroke();}c.restore();
  rect(c,314,384,664,7,'#d0ac72');rect(c,318,391,654,5,'#52402e');rect(c,886,377,46,8,'#b3b39b');rect(c,890,373,38,6,'#596460');
  for(let i=0;i<4;i++)rect(c,347+i*13,381,9,3,i%2?'#e6d8a0':'#e8ead1');
  c.textAlign='center';label(c,'ПРИКЛАДНАЯ АЛГЕБРА',646,161,25,'#e8dfbb');path(c,[[414,174],[878,174]],'#afbe9266');
  c.textAlign='left';label(c,'ГРУППА',345,218,10,'#b6c8a5','monospace');label(c,'ЕДИНИЦА',345,257,10,'#b6c8a5','monospace');
  label(c,'Замкнутость · Ассоциативность · Единица · Обратный элемент',367,192,12,'#9db9a7');
  // Bookcase, a framed group diagram and a small tea table give the room a life.
  rect(c,1105,169,145,247,'#253d3e');rect(c,1110,174,135,240,'#8e704e');
  const covers=['#408789','#bd7658','#c0a45e','#55789b','#799963','#d0b474'];
  for(let row=0;row<3;row++){rect(c,1118,182+row*72,119,65,'#3b3830');for(let j=0;j<9;j++){const h=34+(j*13+row*7)%24,x=1121+j*12,y=240+row*72-h;rect(c,x,y,9,h,covers[(j+row)%covers.length]);rect(c,x+2,y+5,5,2,'#d4bd8a');}rect(c,1113,244+row*72,129,6,'#c1a272');}
  rect(c,1008,126,70,83,'#ac8d60');rect(c,1013,131,60,73,'#e0d7b6');
  c.strokeStyle='#688479';c.lineWidth=1.5;c.beginPath();c.arc(1043,168,22,0,Math.PI*2);c.stroke();for(let i=0;i<5;i++){const a=i*Math.PI*2/5;c.fillStyle='#3c5e5b';c.beginPath();c.arc(1043+22*Math.cos(a),168+22*Math.sin(a),3,0,7);c.fill();}
  // Clock, radiator and a leafy plant.
  c.fillStyle='#c1a16b';c.beginPath();c.arc(1044,286,29,0,7);c.fill();c.fillStyle='#e1dabc';c.beginPath();c.arc(1044,286,24,0,7);c.fill();path(c,[[1044,270],[1044,286],[1058,294]],'#344f50',false,2);
  rect(c,46,431,192,51,'#b2b8a0');for(let x=54;x<230;x+=16){rect(c,x,435,6,43,'#768e82');rect(c,x+6,435,3,43,'#d2cfb0');}
  path(c,[[97,416],[101,353],[77,329],[102,358],[119,330]],'#547d65',false,3);for(const [x,y,r]of[[78,327,-.5],[112,341,.6],[93,368,-.4]]){c.fillStyle='#6d9e76';c.beginPath();c.ellipse(x,y,18,7,r,0,7);c.fill();}path(c,[[83,390],[117,390],[111,417],[89,417]],'#bd8860',true);
  rect(c,1159,477,7,49,'#463a2e');rect(c,1240,477,7,49,'#463a2e');rect(c,1151,467,105,10,'#c1a172');rect(c,1181,451,18,15,'#e5daba');c.strokeStyle='#e5daba';c.strokeRect(1199,454,6,7);
  c.textAlign='left';return canvas;
 }
 function wrap(c,text,width){const rows=[''];for(const word of text.split(' ')){const i=rows.length-1,test=rows[i]?rows[i]+' '+word:word;if(c.measureText(test).width>width&&rows[i])rows.push(word);else rows[i]=test;}return rows;}

 class Stage {
  constructor(){this.room=null;this.poseLayers=new Map();this.progress=notes.map(()=>0);this.weights={gurov:1,roman:0,ivan:0,erik:0,sasha:0,ravil:0};this.lecture=[1,0,0,0];this.clock=0;this.detail=0;this.noteIndex=0;this.handOpacity=0;this.reduced=!!root.matchMedia?.('(prefers-reduced-motion: reduce)').matches;}
  update(dt,film){
   this.clock=film.elapsed;
   for(let i=0;i<notes.length;i++){const n=notes[i],p=film.index>n.page?1:film.index===n.page?clamp((film.time-n.at)/n.seconds):0;this.progress[i]=Math.max(this.progress[i],p);}
   const active=root.GurovEpilogueLines[film.index].actor,visible=film.phase==='line'?1:0;
   for(const actor of Object.keys(this.weights))this.weights[actor]+=(Number(actor===active)*visible-this.weights[actor])*(1-Math.exp(-dt*4));
   const writing=this.progress.some((v,i)=>v>0&&v<1&&notes[i].page===film.index),gesture=writing?2:film.index===7&&film.time>6?3:active==='gurov'&&film.time>1.8?1:0;
   for(let i=0;i<4;i++)this.lecture[i]+=(Number(i===gesture)-this.lecture[i])*(1-Math.exp(-dt*5));
   const ni=notes.findIndex(n=>n.page===film.index);let detail=0;
   if(ni>=0){this.noteIndex=ni;const n=notes[ni];detail=ease((film.time-n.at+.7)/.65)*(1-ease((film.time-n.at-n.seconds-.45)/.8));this.handOpacity=1-ease((film.time-n.at-n.seconds-.1)/.65);}
   this.detail+=(detail-this.detail)*(1-Math.exp(-dt*7));
  }
  // Registered poses use the reference standing/seated scale and foot position.
  // Blending in a small offscreen buffer avoids dark overlapping silhouettes.
  blend(c,key,weights,painter,x,y,angle=0){
   let layer=this.poseLayers.get(key);if(!layer){layer=document.createElement('canvas');layer.width=380;layer.height=330;this.poseLayers.set(key,layer);}
   const g=layer.getContext('2d');g.clearRect(0,0,380,330);g.save();g.globalCompositeOperation='lighter';
   weights.forEach((weight,i)=>{if(weight<.002)return;g.save();g.globalAlpha=weight;painter(g,i);g.restore();});g.restore();
   c.save();c.translate(x,y);c.rotate(angle);c.drawImage(layer,-190,-310);c.restore();
  }
  standingPose(c,index,height){
   const frames=root.GurovActing.sprites.lectureFinal,f=frames?.[index],ref=frames?.[index<4?0:index<6?4:6];if(!f||!ref)return;
   const scale=height/ref.h,anchors=[.40,.39,.43,.49,.43,.50,.54,.46];
   c.drawImage(f.canvas,f.l,f.t,f.w,f.h,190-f.w*anchors[index]*scale,310-f.h*scale,f.w*scale,f.h*scale);
  }
  seatedPose(c,index,height,flip){
   const frames=root.GurovActing.sprites.classroom,f=frames?.[index],ref=frames?.[index%3];if(!f||!ref)return;
   const scale=height/ref.h;c.save();c.translate(190,310);c.scale(flip? -1:1,1);c.drawImage(f.canvas,f.l,f.t,f.w,f.h,-f.w*.5*scale,-f.h*scale,f.w*scale,f.h*scale);c.restore();
  }
  chalk(c){
   const t=this.clock;let tip=null;
   notes.forEach((n,i)=>{
    const p=this.progress[i];if(!p&&i!==this.noteIndex)return;c.save();c.font=`italic ${n.size}px Georgia`;c.textAlign='left';
    // Reveal actual glyphs one stroke-width at a time; never draw a guide line.
    const count=p*n.text.length,whole=Math.floor(count),fraction=count-whole;let x=n.x;
    for(let j=0;j<n.text.length&&j<=whole;j++){
     const glyph=n.text[j],w=c.measureText(glyph).width;
     c.save();if(j===whole&&p<1){c.beginPath();c.rect(x-1,n.y-n.size,w*fraction+1,n.size+8);c.clip();}
     c.fillStyle='#e8e5c8';c.fillText(glyph,x,n.y);c.restore();x+=j===whole&&p<1?w*fraction:w;
    }
    const y=n.y-5-Math.abs(Math.sin(count*Math.PI*2))*n.size*.64;
    if(i===this.noteIndex)tip={x,y};
    if(p>0&&p<1&&!this.reduced){
     // A little powder falls from the letter currently being written.
     for(let k=0;k<4;k++){const age=(t*1.8+k*.23)%1;c.globalAlpha=(1-age)*.45;c.fillRect(x-4-k*3,y+age*17,1.5,1.5);}
    }
    c.restore();
   });return tip;
  }
  boardDetail(c){
   if(this.detail<.002)return;
   c.save();c.beginPath();c.rect(0,64,1280,568);c.clip();c.globalAlpha=this.detail;
   rect(c,0,64,1280,568,'#183c38');
   // A genuine insert shot: the chalk hand is filmed at the letter's position.
   // The room keeps animating underneath and returns through a soft dissolve.
   c.save();c.translate(-428,-81);c.scale(1.6,1.6);
   c.drawImage(this.room,305,108,681,290,305,108,681,290);const tip=this.chalk(c);c.restore();
   if(tip){
    const f=root.GurovActing.sprites.chalkHand?.[0];
    if(f){
     const x=tip.x*1.6-428,y=tip.y*1.6-81,scale=.37;
     c.globalAlpha=this.detail*this.handOpacity;
     // The painted forearm continues beyond the shot. Register the physical
     // chalk tip (22.6%, 9.0% in the source) directly to the appearing glyph.
     c.drawImage(f.canvas,f.l,f.t,f.w,f.h,x+(f.l-f.canvas.width*.226)*scale,y+(f.t-f.canvas.height*.09)*scale,f.w*scale,f.h*scale);
    }
   }
   c.restore();
  }
  desk(c,x,kind){
   shadow(c,x+18,627,108,.23);
   rect(c,x-91,555,7,74,'#3b3933');rect(c,x+93,555,7,74,'#3b3933');rect(c,x-84,610,179,4,'#695847');
   path(c,[[x-112,543],[x+102,543],[x+120,560],[x-118,560]],'#c3a276',true);rect(c,x-118,560,238,7,'#74573d');rect(c,x-107,567,216,23,'#9b7852');rect(c,x-103,570,208,2,'#c2a174');
   c.save();c.translate(x+20,549);c.transform(1,0,-.28,.5,0,0);rect(c,-26,-20,56,36,'#eee0b8');path(c,[[0,-19],[0,14]],'#aa9e81');for(let j=0;j<4;j++){path(c,[[-20,-13+j*6],[-5,-13+j*6]],'#849387');path(c,[[6,-13+j*6],[24,-13+j*6]],'#849387');}c.restore();
   if(kind==='roman'){rect(c,x-65,539,24,11,'#273d44');rect(c,x-63,541,20,6,'#648b8b');}
   else if(kind==='ivan'){rect(c,x+65,540,21,6,'#8c7273');rect(c,x+65,539,21,2,'#dbb6a0');}
   else{c.fillStyle='#788661';c.beginPath();c.ellipse(x-68,547,13,5,0,0,7);c.fill();}
   path(c,[[x+47,541],[x+63,547]],'#2f4b4c',false,2);
  }
  draw(c,cast,film){
   this.room??=makeRoom();c.save();c.drawImage(this.room,0,0);this.chalk(c);
   const t=this.clock,motion=this.reduced?0:1;
   // Soft dust in window light, with no random per-frame flickering.
   if(!this.reduced){c.fillStyle='#fff1c0';for(let i=0;i<16;i++){c.globalAlpha=.07+.05*Math.sin(t*.4+i);c.beginPath();c.arc(50+(i*47+t*3)%370,151+(i*31+t*4)%310,1+(i%2)*.4,0,7);c.fill();}c.globalAlpha=1;}
   shadow(c,641,509,56);shadow(c,390,510,38);shadow(c,892,510,38);
   // The standing trio share a floor plane, coherent head sizes and fixed scales.
   this.blend(c,'sasha',[1-this.weights.sasha,this.weights.sasha],(g,i)=>this.standingPose(g,4+i,234),388,508,Math.sin(t*.8)*.004*motion);
   this.blend(c,'gurov',this.lecture,(g,i)=>this.standingPose(g,i,234),618,509,Math.sin(t*.85)*.0025*motion);
   this.blend(c,'ravil',[1-this.weights.ravil,this.weights.ravil],(g,i)=>this.standingPose(g,6+i,234),898,508,Math.sin(t*.92+.8)*.004*motion);
   // Foreground listeners have the same seated stature. Their chairs are part
   // of each pose; desks are drawn in front, so papers never float in the air.
   for(const [who,x,column]of[['roman',251,0],['ivan',713,1],['erik',1046,2]]){
    shadow(c,x,625,60,.27);const w=this.weights[who];
    this.blend(c,who,[1-w,w],(g,i)=>this.seatedPose(g,column+i*3,201,column===2),x,625,Math.sin(t*.9+column)*.002*motion);
    this.desk(c,x,who);
   }
   this.boardDetail(c);
   // Subtitles fade independently; the classroom never cuts to black per line.
   rect(c,0,0,1280,64,'#10252a');rect(c,0,632,1280,88,'#10252a');rect(c,0,632,1280,1,'#839180');
   const line=root.GurovEpilogueLines[film.index],alpha=film.captionOpacity;
   c.save();c.globalAlpha=alpha;c.textAlign='left';label(c,line.title,42,39,13,'#e3ca92','monospace');c.textAlign='right';label(c,`${film.index+1} / ${root.GurovEpilogueLines.length}`,1227,39,12,'#a7b9b0','monospace');
   c.textAlign='center';label(c,names[line.actor].toUpperCase(),640,651,11,colors[line.actor],'monospace');
   const content=line.actor==='gurov'?root.GurovEngine.lisp(line.text):line.text;c.font='19px Georgia';c.fillStyle='#f2e7d1';const rows=wrap(c,content,1130);rows.forEach((row,i)=>c.fillText(row,640,677+i*24));c.restore();
   const fade=Math.max(1-ease(film.elapsed/1.1),film.phase==='end'?ease(film.fade/.9):0);if(fade>0)rect(c,0,0,1280,720,`rgba(8,20,24,${fade})`);c.restore();
  }
 }
 root.GurovEpilogueStage=Stage;
})(window);
