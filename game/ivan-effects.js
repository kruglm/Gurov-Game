/* Academic leave is a visual transformation; these effects never change combat. */
(function(root){
 const tau=Math.PI*2;
 function state(b,reduced=false){
  const active=!!b&&b.kind==='ivan'&&b.active&&b.academic&&!b.exhausted&&!b.defeated;
  return {active,embers:active&&!reduced?16:0,trail:active&&!reduced&&Math.abs(b.vx)>260?3:0,
   charge:active&&['windup','trapWindup','earthWindup','transform'].includes(b.phase),
   earth:active&&b.phase==='earthWindup',heal:active&&b.phase==='heal',reduced};
 }
 function before(c,b,x,feet,cast,pose,facing,time,reduced=false){
  const s=state(b,reduced);if(!s.active)return;
  const t=reduced?0:time;
  // Only three short copies, anchored to the same frame and floor contact.
  for(let i=s.trail;i>0;i--)cast.motion(c,'ivan-academic',pose,x-Math.sign(b.vx)*i*19,feet+i*2,132,facing,b.gait,true,.055+(s.trail-i)*.035);
  c.save();c.translate(x,feet);
  const glow=c.createRadialGradient(0,-69,8,0,-69,102);
  glow.addColorStop(0,s.heal?'#b5f78c26':'#ff9b402b');glow.addColorStop(.56,'#ea481322');glow.addColorStop(1,'#ef4b0900');
  c.fillStyle=glow;c.fillRect(-104,-173,208,182);
  // A low-opacity flame silhouette sits behind the body, below the face.
  for(let i=0;i<5;i++){
   const dx=(i-2)*16,top=-65-(2-Math.abs(i-2))*19-(reduced?0:Math.sin(t*4+i)*7);
   c.fillStyle=i%2?'#ffa14828':'#ef481834';c.beginPath();c.moveTo(dx-16,-4);
   c.bezierCurveTo(dx-38,-42,dx+15,top+34,dx+Math.sin(t*3+i)*9,top);
   c.bezierCurveTo(dx+29,top+37,dx+26,-23,dx+16,-4);c.fill();
  }
  c.strokeStyle=s.heal?'#b4f89daf':'#fb864d92';c.lineWidth=2;
  c.beginPath();c.ellipse(0,1,47,8,0,0,tau);c.stroke();
  if(s.charge){
   c.strokeStyle='#ffd594b0';c.lineWidth=2;c.beginPath();c.ellipse(0,-57,57,66,0,-t*2,-t*2+Math.PI*1.3);c.stroke();
  }
  if(s.earth)for(let i=0;i<6;i++){
   const u=reduced?.45:(t*.8+i/6)%1,dx=(i%2?1:-1)*(40+i*3);
   c.save();c.translate(dx,-10-u*54);c.rotate(reduced?.2:t*.6+i);c.globalAlpha=reduced?.65:Math.sin(u*Math.PI)*.8;
   c.fillStyle=i%2?'#dcac71':'#aa7951';c.fillRect(-3,-4,7+i%3,8+i%2*3);c.restore();
  }
  c.restore();
 }
 function after(c,b,x,feet,time,reduced=false){
  const s=state(b,reduced);if(!s.active)return;
  c.save();c.translate(x,feet);
  for(let i=0;i<s.embers;i++){
   const u=(time*(.55+i%4*.09)+i*.618)%1;
   const dx=Math.sin(i*2.399)*38+Math.sin(time*2+i)*9-(Math.sign(b.vx)||b.facing)*u*14;
   const y=-22-u*(108+i%3*10);c.globalAlpha=Math.sin(u*Math.PI)*.78;
   c.fillStyle=i%3?'#ff994f':'#ffe4ac';c.fillRect(dx,y,2,i%4===0?5:2);
  }
  if(s.heal){
   c.globalAlpha=.65;c.strokeStyle='#b6ffa1';c.lineWidth=2;
   for(let i=0;i<(reduced?1:3);i++){
    const u=reduced?.5:(time*.75+i/3)%1;c.beginPath();c.ellipse(0,-15-u*95,47*(1-u*.5),7,0,0,tau);c.stroke();
   }
  }
  c.restore();
 }
 const api={state,before,after};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.GurovIvanEffects=api;
})(typeof window==='undefined'?globalThis:window);
