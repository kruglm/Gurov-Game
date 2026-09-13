/* Fatal-hit presentation owns its clock; checkpoint simulation stays frozen. */
(function(root){
 const clamp=n=>Math.max(0,Math.min(1,n));
 class PlayerDeath {
  constructor(fatal,platforms,reduced=false){
   const p=fatal.player;this.elapsed=0;this.reduced=reduced;this.duration=reduced?2.8:3.6;this.landed=false;
   this.x=Math.max(95,Math.min(1185,p.x+p.w/2-fatal.camera));this.facing=p.facing;this.cause=fatal.cause;
   const floors=platforms.filter(q=>p.x+p.w>q.x&&p.x<q.x+q.w&&q.y>=p.y+p.h-20).map(q=>q.y);
   this.floor=floors.length?Math.min(...floors):646;
   this.startFeet=fatal.cause==='fall'?570:Math.min(this.floor,p.y+p.h);
  }
  get pose(){const t=this.elapsed;return t<.24?0:t<.62?1:t<1.0?2:t<1.4?3:t<1.7?4:5;}
  get done(){return this.elapsed>=this.duration;}
  update(dt,active=true){
   if(!active)return false;this.elapsed=Math.min(this.duration,this.elapsed+Math.max(0,Math.min(.05,dt)));
   if(this.elapsed>=1.4&&!this.landed){this.landed=true;return true;}return false;
  }
  draw(ctx,cast,background){
   const t=this.elapsed,u=clamp(t/.8),feet=this.startFeet+(this.floor-this.startFeet)*u*u;
   ctx.save();ctx.drawImage(background,0,0);ctx.fillStyle=`rgba(18,5,12,${.15+.32*clamp(t/1.5)})`;ctx.fillRect(0,0,1280,720);
   if(this.cause==='fall'){ctx.fillStyle='#131b24';ctx.fillRect(0,this.floor,1280,720-this.floor);ctx.fillStyle='#485258';ctx.fillRect(0,this.floor,1280,5);}
   const drift=this.reduced?0:this.facing*20*clamp(t/1.4),x=this.x+drift;
   ctx.fillStyle='#08090c88';ctx.beginPath();ctx.ellipse(x,this.floor+3,t<1?30:66,6,0,0,Math.PI*2);ctx.fill();
   if(!root.GurovActing.drawDeath(ctx,this.pose,x,feet,146,this.facing))cast.draw(ctx,'gurov-tired',13,x,feet,146,this.facing);
   if(t>1.1){const a=t-1.1,jx=x+this.facing*Math.min(110,a*100),jy=this.floor-8-Math.max(0,Math.sin(Math.min(1,a/.8)*Math.PI))*45;root.drawGurovJaw(ctx,jx,jy,.7,0,this.facing*Math.min(a*5,4));}
   if(!this.reduced&&t>=1.4&&t<2.2){const a=(t-1.4)/.8;ctx.globalAlpha=1-a;for(let i=0;i<12;i++){ctx.fillStyle=i%2?'#bcb4a0':'#8f9692';ctx.fillRect(x+(i-5.5)*13*a,this.floor-4-Math.sin(a*Math.PI)*(8+i%3*6),4,3);}ctx.globalAlpha=1;}
   ctx.fillStyle='#090e16';ctx.fillRect(0,0,1280,42);ctx.fillRect(0,680,1280,40);
   if(t>1.9){ctx.globalAlpha=clamp((t-1.9)/.4);ctx.fillStyle='#e9c1b0';ctx.textAlign='center';ctx.font='20px Georgia';ctx.fillText('Доказательство прервано…',640,100);ctx.globalAlpha=1;}
   const fade=clamp((t-(this.duration-.5))/.5);ctx.fillStyle=`rgba(6,10,16,${fade*.92})`;ctx.fillRect(0,0,1280,720);ctx.restore();
  }
 }
 root.GurovPlayerDeath=PlayerDeath;
})(typeof window!=='undefined'?window:globalThis);
