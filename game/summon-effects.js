/* Bounded procedural portal and corrupted-clone effects, driven by simulation time. */
(function(root){
 const C=typeof module!=='undefined'&&module.exports?require('./engine.js').COMBAT:root.GurovEngine.COMBAT;
 const tau=Math.PI*2,clamp=x=>Math.max(0,Math.min(1,x));
 const state=(e)=>({emerging:e.phase==='emerge',dissolving:e.phase==='dissolve'||e.hp<=0,
  progress:e.phase==='emerge'?clamp(1-e.emerge/C.summonEmerge):1,alpha:e.phase==='dissolve'?clamp(e.fade/.85):1});
 function ring(c,x,y,r,time,color,alpha=1){
  c.save();c.translate(x,y);c.globalAlpha=alpha;c.strokeStyle=color;c.lineWidth=2;
  c.beginPath();c.ellipse(0,0,r,r*.22,0,0,tau);c.stroke();
  for(let i=0;i<6;i++){const a=time+i*tau/6;c.fillStyle=color;c.fillRect(Math.cos(a)*r-2,Math.sin(a)*r*.22-2,4,4);}c.restore();
 }
 function portal(c,x,feet,progress,time,reduced=false){
  const u=clamp(progress),t=reduced?0:time;
  c.save();c.translate(x,feet);
  const g=c.createRadialGradient(0,-65,5,0,-65,105);g.addColorStop(0,'#d371ff66');g.addColorStop(1,'#8124df00');c.fillStyle=g;c.fillRect(-105,-170,210,180);
  // A narrow seam opens into a doorway, with no full-screen strobe.
  const rx=7+u*37,ry=20+u*72;
  c.fillStyle='#1d102fe0';c.strokeStyle='#db91ff';c.lineWidth=3;c.beginPath();c.ellipse(0,-ry,rx,ry,0,0,tau);c.fill();c.stroke();
  c.strokeStyle='#f4caff';c.lineWidth=1;c.beginPath();c.ellipse(0,-ry,rx+5,ry+4,0,-t*2,-t*2+4.7);c.stroke();
  for(let i=0;i<(reduced?3:12);i++){
   const a=i*2.399+t*(i%2?1:-1),r=35+(1-u)*48;const y=-60-Math.sin(a)*61;
   c.globalAlpha=.35+u*.35;c.fillStyle=i%3?'#c277ec':'#ffd6d7';c.fillRect(Math.cos(a)*r,y,3,5);
  }c.restore();ring(c,x,feet,59,t,'#dca2ff',.8);
 }
 function warning(c,b,camera,time,reduced=false){
  if(!b?.summon)return;const x=b.summon.x-camera;if(x<-120||x>1400)return;
  const u=clamp(b.summon.time/C.summonTell);portal(c,x,610,u,time,reduced);
  c.save();c.strokeStyle='#cc80fa70';c.lineWidth=2;c.setLineDash([8,10]);
  c.beginPath();c.moveTo(b.x+b.w/2-camera,b.y+44);c.quadraticCurveTo((b.x-camera+x)/2,340,x,480);c.stroke();c.setLineDash([]);
  c.font='bold 12px monospace';c.textAlign='center';c.fillStyle='#f4dcff';c.fillText('ПРИЗЫВ · РОМАН АКРАМОВ',x,398);
  c.fillStyle='#2c1a39';c.fillRect(x-57,408,114,4);c.fillStyle='#dc9dff';c.fillRect(x-57,408,114*u,4);c.restore();
 }
 function before(c,e,x,feet,time,reduced=false){
  const s=state(e),t=reduced?0:time;
  if(s.emerging)portal(c,x,feet,1-s.progress*.3,time,reduced);
  else if(e.portalClose>0){c.save();c.globalAlpha=e.portalClose/.3;portal(c,x,feet,e.portalClose/.3*.7,time,reduced);c.restore();}
  c.save();c.globalAlpha=s.alpha;
  const g=c.createRadialGradient(x,feet-60,6,x,feet-60,82);g.addColorStop(0,'#9e40cb33');g.addColorStop(1,'#602cb800');c.fillStyle=g;c.fillRect(x-84,feet-149,168,155);
  for(let i=0;i<(reduced?2:5);i++){
   const dx=(i-2)*14,h=53+(i%3)*21+Math.sin(t*4+i)*8;
   c.fillStyle=i%2?'#c57cff38':'#9950dd45';c.beginPath();c.moveTo(x+dx-12,feet);
   c.quadraticCurveTo(x+dx-27,feet-h*.5,x+dx+6,feet-h);c.quadraticCurveTo(x+dx+26,feet-h*.4,x+dx+12,feet);c.fill();
  }c.restore();ring(c,x,feet,35+Math.sin(t*3)*3,t,'#b76ce8',s.alpha*.75);
 }
 function after(c,e,x,feet,time,reduced=false){
  const s=state(e);c.save();
  for(let i=0;i<(reduced?0:10);i++){
   const u=(time*.72+i*.618)%1,dx=Math.sin(i*2.4)*39+Math.sin(time+i)*5;
   c.globalAlpha=Math.sin(u*Math.PI)*s.alpha*.7;c.fillStyle=i%3?'#c389fc':'#ffb3c5';c.fillRect(x+dx,feet-12-u*137,2,3);
  }
  if(s.emerging){c.globalAlpha=.8;c.strokeStyle='#f3c4ff';c.lineWidth=3;c.beginPath();c.ellipse(x,feet,52,10,0,0,tau);c.stroke();}
  c.restore();
 }
 const api={state,warning,before,after};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GurovSummonEffects=api;
})(typeof window==='undefined'?globalThis:window);
