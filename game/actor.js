/* Generated acting poses + distance-driven animation and cartoon props. */
(function(root){
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  function decodeChroma(d,width,height,cleanEdges=false){
    for(let i=0;i<d.length;i+=4)if(d[i]>40&&d[i+2]>40&&d[i+1]<Math.min(d[i],d[i+2])*.48)d[i+3]=0;
    if(!cleanEdges)return;
    // Anti-aliased magenta matte survives a hard key. Remove only two outer
    // texels; isolated highlights inside the face, shirt and book are retained.
    for(let pass=0;pass<2;pass++){
      const fringe=[];
      for(let p=0;p<width*height;p++){
        const i=p*4,r=d[i],g=d[i+1],b=d[i+2];
        if(!d[i+3]||r<90||b<90||r-g<25||b-g<25)continue;
        const x=p%width,y=Math.floor(p/width);
        if((x>0&&!d[i-1])||(x<width-1&&!d[i+7])||(y>0&&!d[i-width*4+3])||(y<height-1&&!d[i+width*4+3]))fringe.push(i+3);
      }
      for(const i of fringe)d[i]=0;
    }
  }
  root.gurovDecodeChroma=decodeChroma;
  class GurovActor {
    constructor(){
      this.ready=false;this.frames=[];this.menuTime=0;this.menuState='idle';this.lastCue='';this.runFrame=0;this.menuCycles=0;
      if(root.GUROV_PREPARED_DATA?.actor){root.GurovPrepared.load(root.GUROV_PREPARED_DATA.actor).then(actor=>{Object.assign(this,actor);this.ready=true;}).catch(e=>console.error(e));return;}
      const img=new Image();img.onload=()=>this.prepare(img);img.onerror=()=>console.error('Animation atlas failed to load');
      img.src=root.GUROV_ANIMATION_DATA||'assets/gurov-animation-v2.png';
    }
    prepare(img){
      const atlas=document.createElement('canvas');atlas.width=img.width;atlas.height=img.height;
      const a=atlas.getContext('2d',{willReadFrequently:true});a.drawImage(img,0,0);const data=a.getImageData(0,0,img.width,img.height);
      // Chroma-key texture decoding. Keep the supplied art file unchanged.
      decodeChroma(data.data,img.width,img.height,true);
      a.putImageData(data,0,0);this.cellW=img.width/4;this.cellH=img.height/3;
      for(let k=0;k<12;k++){
        const x0=Math.round(k%4*this.cellW),y0=Math.round(Math.floor(k/4)*this.cellH),w=Math.round(this.cellW),h=Math.round(this.cellH);
        let minX=w,minY=h,maxX=0,maxY=0;
        for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(data.data[((y0+y)*img.width+x0+x)*4+3]>100){minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
        const c=document.createElement('canvas');c.width=maxX-minX+1;c.height=maxY-minY+1;c.getContext('2d').drawImage(atlas,x0+minX,y0+minY,c.width,c.height,0,0,c.width,c.height);
        this.frames.push({image:c,anchor:this.cellW*.495-minX,footY:maxY,top:minY});
      }
      this.bodyHeight=this.frames[8].image.height;this.ready=true;
    }
    resetMenu(){this.menuTime=0;this.lastCue='';this.menuState='idle';}
    draw(ctx,index,x,feet,height,{facing=1,alpha=1,lean=0,sx=1,sy=1,bob=0}={}){
      if(!this.ready)return;const f=this.frames[index],scale=height/this.bodyHeight;
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,feet+bob);ctx.rotate(lean*facing);ctx.scale(facing*scale*sx,scale*sy);ctx.imageSmoothingEnabled=false;ctx.drawImage(f.image,-f.anchor,-f.image.height);ctx.restore();
    }
    point(index,ux,uy,x,feet,height){const f=this.frames[index],scale=height/this.bodyHeight;return {x:x+(ux-.495)*this.cellW*scale,y:feet-(f.footY-uy*this.cellH)*scale};}
    drawDashShield(ctx,p,x,front=false){
      // Use the same timer as damage immunity; no lingering shield after a dash.
      if(p.dash<=0)return;
      const height=GurovEngine.PLAYER_ART_H,entry=smooth((.18-p.dash)/.035);
      const rx=height*.46,ry=height*.60,opacity=.6+.4*clamp(p.dash/.035,0,1);
      ctx.save();ctx.translate(x,p.y+p.h-height*.5);ctx.scale(p.facing*(.92+.08*entry),.97+.03*entry);ctx.globalAlpha=opacity;
      if(!front){
        const glow=ctx.createRadialGradient(0,-12,16,0,0,ry);
        glow.addColorStop(0,'#a3ffed00');glow.addColorStop(.6,'#83eedd0c');glow.addColorStop(1,'#62ede54a');
        ctx.fillStyle=glow;ctx.strokeStyle='#99ffeb88';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.fill();ctx.stroke();
        // Short wake trails make the barrier read in the direction of travel.
        ctx.strokeStyle='#99ffdf99';ctx.lineWidth=2;
        for(const y of [-34,0,34]){const edge=-rx*Math.sqrt(1-y*y/(ry*ry));ctx.beginPath();ctx.moveTo(edge-8,y);ctx.lineTo(edge-25-entry*14,y);ctx.stroke();}
      }else{
        ctx.shadowColor='#79ffe3';ctx.shadowBlur=12;ctx.strokeStyle='#cefff1';ctx.lineWidth=3;
        ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,-1.22,1.22);ctx.stroke();
        ctx.shadowBlur=0;ctx.strokeStyle='#eafffa77';ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(-2,0,rx-7,ry-7,0,-1.08,.92);ctx.stroke();
        // A small shield crest keeps the meaning clear even during the short dash.
        ctx.translate(rx-1,-5);ctx.fillStyle='#194c4c';ctx.strokeStyle='#ddfff3';ctx.lineWidth=1.6;
        ctx.beginPath();ctx.moveTo(-9,-11);ctx.lineTo(9,-11);ctx.lineTo(8,1);ctx.quadraticCurveTo(5,7,0,11);ctx.quadraticCurveTo(-5,7,-8,1);ctx.closePath();ctx.fill();ctx.stroke();
        ctx.beginPath();ctx.moveTo(-4,-1);ctx.lineTo(-1,3);ctx.lineTo(5,-4);ctx.stroke();
      }
      ctx.restore();
    }
    drawPlayer(ctx,p,x,time,fallback,cast){
      const running=p.grounded&&Math.abs(p.vx)>28,feet=p.y+p.h,height=GurovEngine.PLAYER_ART_H;
      this.runFrame=Math.floor(p.gait*8)%8;
      let pose=running?-1:0;
      if(!p.grounded)pose=p.vy<0?12:13;
      if(p.dash>0)pose=12;
      if(p.grounded&&p.landing>.09)pose=13;
      if(!running&&p.grounded&&p.landing<=0&&time%8>6.4)pose=14;
      if(p.cast>.25)pose=9;
      else if(p.cast>.16)pose=10;
      else if(p.cast>.08&&!running&&p.grounded)pose=11;
      const alpha=p.inv>0&&Math.floor(time*13)%2===0?.42:1;
      const character=p.healFlash>0||p.eating>0?'gurov-happy':p.hp<=GurovEngine.UPGRADES.lowHealth?'gurov-tired':'gurov';
      this.playerMood=character;
      if(p.crouch>0&&p.dash<=0&&p.eating<=0&&cast.drawCrouch(ctx,character,p,x,feet,alpha))return;
      if(p.eating>0){pose=14+Math.floor((GurovEngine.UPGRADES.paperDuration-p.eating)*7)%2;}
      else if(character==='gurov-happy'&&pose>=14)pose=0;
      this.drawDashShield(ctx,p,x);
      if(p.dash>0){cast.draw(ctx,character,12,x-p.facing*27,feet,height,p.facing,0,.20);cast.draw(ctx,character,12,x-p.facing*50,feet,height,p.facing,0,.08);}
      cast.motion(ctx,character,pose,x,feet,height,p.facing,p.gait,running,alpha);
      this.drawDashShield(ctx,p,x,true);
      if(p.eating>0){for(let i=0;i<5;i++){const u=(time*1.8+i*.2)%1;ctx.save();ctx.globalAlpha=1-u;ctx.translate(x+p.facing*(25+u*18),p.y+31+u*70);ctx.rotate(u*4+i);ctx.fillStyle='#f1e5c9';ctx.fillRect(-2,-2,5,3);ctx.restore();}}
    }
    updateMenu(dt,sound){
      this.menuTime+=dt;const t=this.menuTime%24;this.menuCycles=Math.floor(this.menuTime/24);
      this.menuState=t<3.2?'idle':t<3.8?'puff':t<4.55?'spit':t<7.5?'jaw-in-hand':t<8.2?'return-jaw':t<12?'idle':t<12.6?'raise-papers':t<16.5?'eat-papers':t<18.2?'chew':'idle';
      const cue=this.menuState+':'+this.menuCycles;
      if(cue!==this.lastCue){if(this.menuState==='spit')sound.sfx('shoot');if(this.menuState==='eat-papers')sound.sfx('paperBite');this.lastCue=cue;}
      if(this.menuState==='jaw-in-hand'&&Math.floor((this.menuTime-dt)*7)!==Math.floor(this.menuTime*7))sound.sfx('menuClack');
      if(['eat-papers','chew'].includes(this.menuState)&&Math.floor((this.menuTime-dt)*3)!==Math.floor(this.menuTime*3))sound.sfx('paperBite');
    }
    drawMenu(ctx,x,feet,height,time,fallback,cast){
      if(!this.ready){fallback(x,feet,height);return;}
      const t=this.menuTime%24,breath=Math.sin(time*1.65),state=this.menuState;
      let frame=null;
      if(state==='puff'||state==='spit'||state==='return-jaw')frame=8;
      else if(state==='jaw-in-hand')frame=9;
      else if(state==='raise-papers')frame=10;
      else if(state==='eat-papers')frame=Math.floor((t-12.6)*5)%2===0?10:11;
      else if(state==='chew')frame=11;
      if(frame===null){
        // Use the clean chroma-key model instead of the legacy checkerboard cutout.
        if(cast?.ready){ctx.save();ctx.translate(x,feet);ctx.rotate(Math.sin(time*.7)*.004);cast.draw(ctx,'gurov',0,0,0,height,1,breath*.8);ctx.restore();}
        else fallback(x,feet,height);
        return;
      }
      const chew=['eat-papers','chew'].includes(state)?Math.sin(t*22):0;
      const jitter=state==='jaw-in-hand'?Math.sin(t*48)*.006:0;
      this.draw(ctx,frame,x,feet,height,{lean:jitter,sy:1+chew*.004,bob:state==='puff'?Math.sin(smooth((t-3.2)/.6)*Math.PI)*3:0});
      const mouth=this.point(8,.65,.30,x,feet,height),hand=this.point(9,.80,.425,x,feet,height);
      if(state==='spit'){
        const u=clamp((t-3.8)/.75,0,1),v=1-u;
        const px=v*v*mouth.x+2*v*u*(hand.x+34)+u*u*hand.x,py=v*v*mouth.y+2*v*u*(mouth.y-80)+u*u*(hand.y-14);
        drawJaw(ctx,px,py,1.6,t*32,Math.sin(u*Math.PI)*1.2);
        for(let i=0;i<4;i++){ctx.fillStyle='#e4dbc7';ctx.fillRect(mouth.x+u*40-i*9,mouth.y+i*5-u*9,3,2);}
      }
      if(state==='jaw-in-hand'){
        const wiggle=Math.sin(t*47)*4+Math.sin(t*71)*2;
        drawJaw(ctx,hand.x+wiggle,hand.y-16+Math.abs(Math.sin(t*31))*5,1.6,t*42,Math.sin(t*37)*.18);
        ctx.strokeStyle='#ebdca0b0';ctx.lineWidth=2;
        for(let side of [-1,1]){ctx.beginPath();ctx.moveTo(hand.x+side*37,hand.y-23);ctx.lineTo(hand.x+side*43,hand.y-30);ctx.moveTo(hand.x+side*39,hand.y-10);ctx.lineTo(hand.x+side*47,hand.y-10);ctx.stroke();}
      }
      if(state==='return-jaw'){
        const u=smooth((t-7.5)/.7);drawJaw(ctx,hand.x+(mouth.x-hand.x)*u,hand.y-15+(mouth.y-hand.y+15)*u-Math.sin(u*Math.PI)*35,1.6*(1-u*.42),t*30,-u*.45);
      }
      if(['eat-papers','chew'].includes(state)){
        const at=this.point(frame,.675,.295,x,feet,height);
        // Small printed scraps fall from the mouth, renewing at each bite.
        for(let i=0;i<10;i++){
          const life=(t*1.3+i*.19)%1,px=at.x+Math.sin(i*7.3)*life*48,py=at.y+life*132;
          ctx.save();ctx.globalAlpha=1-life;ctx.translate(px,py);ctx.rotate(life*(i%2?5:-5));ctx.fillStyle='#eadfbc';ctx.fillRect(-3,-2,5+i%3,4+i%2);ctx.fillStyle='#647268';ctx.fillRect(-1,0,3,1);ctx.restore();
        }
      }
    }
  }
  function drawJaw(ctx,x,y,scale=1,phase=0,rotation=0){
    const open=2+(Math.sin(phase)+1)*3.3;
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
    // Two gum plates, individual ivory teeth, a hinge: deliberately toy-like.
    ctx.fillStyle='#29293c';ctx.fillRect(-16,-open-5,31,7);ctx.fillRect(-17,-open-2,33,5);
    ctx.fillStyle='#d68f99';ctx.fillRect(-14,-open-4,27,4);ctx.fillStyle='#edb6aa';ctx.fillRect(-11,-open-4,20,2);
    for(let i=0;i<6;i++){ctx.fillStyle='#f8f0cd';ctx.fillRect(-13+i*4.3,-open,4,6);ctx.fillStyle='#ccb991';ctx.fillRect(-13+i*4.3,-open+5,4,1);}
    ctx.fillStyle='#29293c';ctx.fillRect(-16,open-1,31,7);ctx.fillRect(-13,open+5,25,3);
    ctx.fillStyle='#c47d91';ctx.fillRect(-14,open+2,27,4);ctx.fillStyle='#e9aaa9';ctx.fillRect(-10,open+5,19,2);
    for(let i=0;i<6;i++){ctx.fillStyle='#f7edc7';ctx.fillRect(-13+i*4.3,open-3,4,5);ctx.fillStyle='#fff7dd';ctx.fillRect(-12+i*4.3,open-3,3,1);}
    ctx.fillStyle='#6f6b78';ctx.fillRect(-17,-open+2,3,open*2);ctx.restore();
  }
  root.GurovActor=GurovActor;root.drawGurovJaw=drawJaw;
})(window);
