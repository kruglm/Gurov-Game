/* Boss finales run on presentation time, independently of the frozen world. */
(function(root){
  const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
  const ease=x=>1-(1-clamp(x))**3;
  const hash=i=>{const n=Math.sin(i*127.1+17)*43758.5453;return n-Math.floor(n);};
  class BossOutro {
    constructor(kind,reduced=false){
      this.kind=kind;this.reduced=reduced;this.elapsed=0;this.duration=reduced?5:8;this.stretch=reduced?1:1.65;
      this.cues=[];this.paused=false;
      this.particles=Array.from({length:64},(_,i)=>({angle:hash(i)*Math.PI*2,speed:130+hash(i+71)*410,size:7+hash(i+29)*21,spin:(hash(i+42)-.5)*7,variant:i%4}));
    }
    get phase(){const t=this.elapsed/this.stretch;return t<.24?'impact':t<1.25?'break':t<2.45?'surrender':'hold';}
    get canSkip(){return this.done;}
    get done(){return this.elapsed>=this.duration;}
    update(dt,active=true){
      this.paused=!active;if(!active)return [];
      this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,Math.min(dt,.05)));
      const due=[];for(const [name,at] of [['impact',0],['break',.28],['resolve',1.35]]){
        if(this.elapsed>=at*this.stretch&&!this.cues.includes(name)){this.cues.push(name);due.push(name);}
      }return due;
    }
    draw(ctx,cast,background){
      const t=this.elapsed/this.stretch,reduced=this.reduced,erik=this.kind==='erik',ink='#0a121d',accent=erik?'#bce2b3':'#f5b6a2',gold='#f4d392';
      ctx.save();ctx.fillStyle=ink;ctx.fillRect(0,0,1280,720);
      if(background){ctx.globalAlpha=.23;ctx.drawImage(background,0,0);ctx.globalAlpha=1;}
      const dim=reduced?.76:.43+.31*ease(t/.28);ctx.fillStyle=`rgba(5,10,17,${dim})`;ctx.fillRect(0,0,1280,720);
      // A diagonal spotlight retains a sense of the arena behind the actors.
      ctx.fillStyle=erik?'#355b493e':'#59374550';ctx.beginPath();ctx.moveTo(817,48);ctx.lineTo(1188,48);ctx.lineTo(1280,672);ctx.lineTo(580,672);ctx.closePath();ctx.fill();
      ctx.strokeStyle=accent+'24';ctx.lineWidth=1;
      for(let i=0;i<18;i++){const y=75+i*34,x=680+hash(i)*120;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(1280,y-95);ctx.stroke();}
      const burst=clamp((t-.24)/1.5),jolt=reduced?0:Math.sin(t*43)*Math.max(0,1-t/1.1)*12;
      ctx.save();ctx.translate(jolt,jolt*.35);
      if(!reduced&&t>.24&&t<2.5){
        ctx.save();ctx.translate(1000,370);
        for(let i=0;i<3;i++){
          const u=clamp((t-.24-i*.12)/.85);if(u<=0||u>=1)continue;
          ctx.globalAlpha=(1-u)*.8;ctx.strokeStyle=i===1?'#ffffff':accent;ctx.lineWidth=(1-u)*13+1;
          ctx.beginPath();ctx.ellipse(0,0,30+u*480,22+u*290,-.18,0,Math.PI*2);ctx.stroke();
        }
        ctx.restore();
      }
      // Cracked agreement seal, followed by actual climbing holds flying apart.
      if(erik&&t<1.25){
        ctx.save();ctx.translate(1000,370);ctx.strokeStyle=accent;ctx.lineWidth=4;ctx.globalAlpha=1-clamp((t-.35)/.9);
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4,dist=reduced?0:burst*95;
          ctx.save();ctx.translate(Math.cos(a)*dist,Math.sin(a)*dist);ctx.rotate(a);
          ctx.beginPath();ctx.arc(0,0,163,-.37,.37);ctx.stroke();
          ctx.beginPath();ctx.moveTo(155,0);ctx.lineTo(113,14);ctx.lineTo(124,-18);ctx.lineTo(71,0);ctx.stroke();ctx.restore();
        }ctx.restore();
      }
      if(!reduced&&t>=.24){
        const age=t-.24;ctx.save();ctx.globalAlpha=clamp(1-(age-1)/1.65);
        this.particles.forEach((p,i)=>{
          const x=1000+Math.cos(p.angle)*p.speed*age,y=360+Math.sin(p.angle)*p.speed*age+95*age*age;
          if(x<-40||x>1320||y>760)return;
          if(i<14)GurovItems.draw(ctx,erik?'hold':'tomato',x,y,p.size+12,p.size+12,p.spin*age,p.variant);
          else {ctx.save();ctx.translate(x,y);ctx.rotate(p.spin*age);ctx.fillStyle=i%3===0?gold:accent;ctx.fillRect(-p.size/2,-2,p.size,i%3===0?4:2);ctx.restore();}
        });ctx.restore();
      }
      const landing=ease((t-.55)/.95),feet=593;
      ctx.fillStyle='#00000066';ctx.beginPath();ctx.ellipse(1002,feet+5,118,13,0,0,Math.PI*2);ctx.fill();
      // Stagger, lower the stance, then surrender. Translation/rotation adds
      // weight without changing the sprite's standing scale between poses.
      const bx=1000+(reduced?0:Math.sin(landing*Math.PI)*34),by=feet-(reduced?0:Math.sin(landing*Math.PI)*30);
      const pose=t<.24?11:t<.85?11:t<1.45?13:erik?14:13;
      ctx.save();ctx.translate(bx,by);ctx.rotate(reduced?0:(erik?-.1:.12)*Math.sin(landing*Math.PI));
      if(t<1.45||!root.GurovActing?.draw(ctx,this.kind,erik?0:4,0,0,erik?290:340,erik?1:-1))cast.draw(ctx,this.kind,pose,0,0,340,-1);ctx.restore();
      if(!erik&&t>.6){
        // Gurov closes the last gap; the final image is a caught opponent.
        const u=reduced?1:ease((t-.6)/.85);
        cast.draw(ctx,'gurov',t<1.45?14:15,660+55*u,feet,288,1);
        if(t>1.45)GurovItems.draw(ctx,'coursework',848,feet-93,62,75,-.12);
      }
      if(erik&&t>1.45){
        const u=reduced?1:ease((t-1.45)/.65);ctx.globalAlpha=u;
        cast.draw(ctx,'ravil',14,766,feet,235,1);ctx.globalAlpha=1;
      }
      ctx.restore();
      // Letterbox and type settle after the physical impact, leaving time to read.
      ctx.fillStyle=ink;ctx.fillRect(0,0,1280,49);ctx.fillRect(0,664,1280,56);
      ctx.fillStyle=accent;ctx.font='bold 12px monospace';ctx.fillText(erik?'02 / НОЧНОЙ СКАЛОДРОМ':'04 / ПОСЛЕДНЯЯ ПОГОНЯ',64,30);
      ctx.textAlign='right';ctx.fillStyle='#99a9b6';ctx.fillText('ПОСЛЕДНИЙ УДОВЛ',1216,30);ctx.textAlign='left';
      const reveal=reduced?1:ease((t-.95)/.45);ctx.save();ctx.globalAlpha=reveal;ctx.translate(reduced?0:-28*(1-reveal),0);
      ctx.fillStyle=accent;ctx.font='bold 15px monospace';ctx.fillText(erik?'ЭРИК ИЛЬЯСОВ':'ИВАН ПАВЛЕНКО',76,231);
      ctx.fillStyle='#fff3d6';ctx.font='bold 64px Georgia';ctx.fillText(erik?'ЩИТ РАЗБИТ.':'ПОЙМАН.',72,311);
      ctx.fillStyle=gold;ctx.fillRect(76,343,72,3);
      ctx.fillStyle='#d8ddd5';ctx.font='22px Georgia';
      ctx.fillText(erik?'Согласование не выдержало аргумента.':'Дальше убегать уже некуда.',76,391);
      ctx.fillStyle='#91b4ad';ctx.font='16px monospace';ctx.fillText(erik?'РАВИЛЬ СВОБОДЕН':'ПОГОНЯ ЗАВЕРШЕНА',76,436);
      if(t>=1.9){
        ctx.save();ctx.translate(260,515);ctx.rotate(reduced?0:-.075);ctx.strokeStyle=accent;ctx.lineWidth=2;ctx.strokeRect(-184,-32,368,56);
        ctx.fillStyle=accent;ctx.font='bold 20px monospace';ctx.textAlign='center';ctx.fillText(erik?'СОГЛАСОВАНИЕ СНЯТО':'ПРИКЛАДНАЯ АЛГЕБРА ЖДЁТ',0,3);ctx.restore();
      }ctx.restore();
      // One brief, decaying flash; no repeating strobe. Reduced motion omits it.
      if(!reduced&&t<.18){ctx.fillStyle=`rgba(255,243,206,${.65*(1-t/.18)})`;ctx.fillRect(0,0,1280,720);}
      ctx.restore();
    }
  }
  root.GurovBossOutro=BossOutro;
})(typeof window!=='undefined'?window:globalThis);
