/* Original arcade-style boss entrances. Simulation time is paused by World. */
(function(root){
  class MenuIvan {
    constructor(){this.caught=false;this.x=730;this.feet=597;this.height=194;this.facing=1;this.gait=0;this.turn=0;this.time=5.9;this.phase='peek';this.pose=0;this.update(0);}
    setCaught(caught){
      if(this.caught===caught)return;
      this.caught=caught;this.x=caught?740:730;this.feet=597;this.facing=1;this.turn=0;this.gait=0;this.time=caught?0:5.9;this.phase=caught?'caught':'peek';this.update(0);
    }
    update(dt){
      if(this.caught)return;
      this.time+=dt;const t=this.time%19,old=this.x;
      if(t<4.4){this.phase='run';this.feet=597;this.x=730+t*148;this.facing=1;}
      else if(t<5.3){this.phase='hidden';this.x=1400;}
      else if(t<9.3){this.phase='peek';const u=(t-5.3)/4;this.pose=u<.25?0:u<.7?1:2;this.x=1318-Math.sin(u*Math.PI)*69;this.feet=365;}
      else if(t<10.1){this.phase='hidden';this.x=1400;}
      else if(t<13.6){this.phase='bottom';const u=(t-10.1)/3.5;this.pose=3;this.x=460;this.feet=970-Math.sin(u*Math.PI)*85;}
      else{this.phase='return';this.feet=597;this.x=1390-(t-13.6)*122.222;this.facing=-1;}
      if(this.phase==='run'||this.phase==='return')this.gait+=Math.abs(this.x-old)/110;
    }
    draw(ctx,cast){
      if(this.phase==='hidden')return;
      ctx.save();
      if(!this.caught&&(this.phase==='peek'||this.phase==='bottom')){if(this.phase==='peek')root.GurovActing.peek(ctx,this.pose,this.x,this.feet-250,250);else root.GurovActing.draw(ctx,'ivan',3,this.x,this.feet,285);ctx.restore();return;}
      ctx.fillStyle='#09162075';ctx.beginPath();ctx.ellipse(this.x,this.feet+3,43,7,0,0,Math.PI*2);ctx.fill();
      if(this.caught){
        // Sitting lowers his head without enlarging his body to a standing height.
        const frames=root.GurovActing.sprites.ivan;
        if(frames?.[5]&&frames?.[4])root.GurovActing.draw(ctx,'ivan',5,this.x,this.feet,this.height*frames[5].h/frames[4].h,-1);
        root.GurovItems.draw(ctx,'coursework',this.x+62,this.feet-24,37,40,-.12);
      }else cast.motion(ctx,'ivan',this.turn>0?14:-1,this.x,this.feet,this.height,this.facing,this.gait,this.turn<=0);
      ctx.restore();
    }
  }
  root.GurovMenuIvan=MenuIvan;
  root.drawGurovBossIntro=function(ctx,scene,cast){
    if(!scene)return;
    const t=scene.time,end=scene.duration,erik=scene.kind==='erik',academic=!!scene.academic;
    const reduced=root.matchMedia?.('(prefers-reduced-motion: reduce)').matches||false;
    const ease=v=>1-Math.pow(1-Math.max(0,Math.min(1,v)),3);
    const entry=ease(t/.6),leave=ease((t-(end-.45))/.45),alpha=1-leave;
    const color=erik?'#a5f0cf':academic?'#ffbd78':'#ffbdb2',dark=erik?'#103f39':academic?'#56271f':'#532a4c';
    ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#050e19';ctx.fillRect(0,0,1280,720);
    ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(0,150);ctx.lineTo(1280,42);ctx.lineTo(1280,556);ctx.lineTo(0,678);ctx.fill();
    ctx.save();ctx.beginPath();ctx.rect(0,142,1280,437);ctx.clip();
    for(let i=0;i<31;i++){const y=152+i*15,x=((i*187+t*(erik?600:1100))%1650)-340;ctx.fillStyle=i%3===0?color+'76':color+'22';ctx.fillRect(x,y,90+i%5*50,i%3===0?3:1);}
    ctx.translate(347,366);ctx.rotate(-.12+t*.025);ctx.strokeStyle=color+'65';ctx.lineWidth=2;
    for(let i=0;i<20;i++){ctx.rotate(Math.PI/10);ctx.beginPath();ctx.moveTo(145,0);ctx.lineTo(700,0);ctx.stroke();}ctx.restore();
    const x=340-(1-entry)*560;
    const portrait=academic?(root.GurovActing.portraits['ivan-academic']||root.GurovActing.portraits['ivan-demon']):root.GurovIllustrations.portraits[scene.kind];
    if(portrait?.width){
      ctx.save();ctx.beginPath();ctx.moveTo(x-200,145);ctx.lineTo(x+210,145);ctx.lineTo(x+174,625);ctx.lineTo(x-236,625);ctx.closePath();ctx.clip();
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      const scale=erik?480/portrait.height:Math.max(446/portrait.width,480/portrait.height),w=portrait.width*scale,h=portrait.height*scale;
      ctx.drawImage(portrait,erik?x-230:x-13-w/2,145,w,h);ctx.restore();
    }else cast.draw(ctx,academic?'ivan-academic':scene.kind,9,x,619,460,1);
    if(academic){
      ctx.save();ctx.strokeStyle='#ffba7766';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+210,145);ctx.lineTo(x+174,625);ctx.stroke();
      if(!reduced)for(let i=0;i<22;i++){
        const u=(t*(.32+i%3*.07)+i*.618)%1;ctx.globalAlpha=Math.sin(u*Math.PI)*.8;
        ctx.fillStyle=i%3?'#f49c58':'#ffdeb0';ctx.fillRect(x-208+(i*83)%437+Math.sin(t+i)*7,620-u*465,2,i%3?3:6);
      }ctx.restore();
    }
    ctx.save();ctx.translate(655+(1-entry)*650,0);
    ctx.fillStyle=color;ctx.font='bold 14px monospace';ctx.fillText(erik?'STAGE 02 / CLIMBING AUTHORITY':academic?'STAGE 04 / PHASE II':'STAGE 04 / THE RUNAWAY LEMMA',0,academic?240:269);
    ctx.fillStyle='#fff0d3';ctx.font='bold 66px Georgia';ctx.fillText(erik?'ЭРИК':'ИВАН',0,academic?317:350);ctx.fillText(erik?'ИЛЬЯСОВ':'ПАВЛЕНКО',0,academic?389:421);
    if(academic){ctx.fillStyle=color;ctx.font='bold 27px Georgia';ctx.fillText('В АКАДЕМИЧЕСКОМ',0,437);ctx.fillText('ОТПУСКЕ',0,473);}
    ctx.fillStyle=color;ctx.fillRect(0,academic?500:451,440*ease((t-.4)/.5),4);
    ctx.font='21px Georgia';ctx.fillStyle='#e2d3c3';ctx.fillText(academic?'«Я ухожу в академический отпуск!»':erik?'«Гурочка, всё согласовано!»':'«Сначала догоните!»',0,academic?540:498);
    ctx.restore();
    ctx.fillStyle='#060e18';ctx.fillRect(0,0,1280,112);ctx.fillRect(0,641,1280,79);
    ctx.fillStyle=color;ctx.fillRect(0,108,1280,4);ctx.fillRect(0,641,1280,3);
    ctx.font='bold 18px monospace';ctx.fillText(scene.academic?'ФАЗА II / АКАДЕМИЧЕСКИЙ ОТПУСК':'ПРОТИВНИК ПРИБЛИЖАЕТСЯ',45,70);
    ctx.fillStyle='#d3d4cc';ctx.font='13px monospace';ctx.textAlign='right';ctx.fillText('ПРОБЕЛ / ENTER — ПРОПУСТИТЬ',1228,686);ctx.textAlign='left';
    // One short impact accent, with no repeated strobe.
    if(t<.22&&!reduced){ctx.globalAlpha=alpha*(1-t/.22)*.35;ctx.fillStyle=color;ctx.fillRect(0,0,1280,720);}
    ctx.restore();
  };
})(window);
