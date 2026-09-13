/* Render-only effects and interpolation. Simulation/save coordinates stay authoritative. */
(function(root){
 const fields=['x','y','h','crouch','vx','vy','gait'];
 const point=p=>p?Object.fromEntries(fields.map(k=>[k,p[k]])):null;
 root.GurovRender={
  capture(w){return {playerRef:w.player,index:w.index,time:w.time,camera:w.camera,player:point(w.player),runner:point(w.runner),companion:point(w.companion),npc:point(w.level.npc),boss:point(w.level.boss),enemies:new Map(w.level.enemies.map(e=>[e,point(e)])),shots:new Map(w.projectiles.map(s=>[s,point(s)]))};},
  between(w,last,a){
   if(!last||last.playerRef!==w.player||last.index!==w.index)return w;
   a=Math.max(0,Math.min(1,a));
   const mix=(p,old)=>{if(!p||!old||Math.hypot((p.x||0)-(old.x||0),(p.y||0)-(old.y||0))>160)return p;const out={...p};for(const k of fields)if(Number.isFinite(p[k])&&Number.isFinite(old[k]))out[k]=old[k]+(p[k]-old[k])*a;return out;};
   return Object.assign(Object.create(w),{time:last.time+(w.time-last.time)*a,camera:Math.abs(w.camera-last.camera)<160?last.camera+(w.camera-last.camera)*a:w.camera,player:mix(w.player,last.player),runner:mix(w.runner,last.runner),companion:mix(w.companion,last.companion),level:{...w.level,npc:mix(w.level.npc,last.npc),boss:mix(w.level.boss,last.boss),enemies:w.level.enemies.map(e=>mix(e,last.enemies.get(e)))},projectiles:w.projectiles.map(s=>mix(s,last.shots.get(s)))});
  }
 };
 root.drawGurovRocketJaw=function(c,x,y,scale,phase,angle){
  c.save();c.translate(x,y);c.rotate(angle);c.scale(scale,scale);
  // The nozzle stays behind the flight direction, even during a homing turn.
  c.fillStyle='#384f62';c.beginPath();c.moveTo(-15,-7);c.lineTo(-28,-9);c.lineTo(-28,9);c.lineTo(-15,7);c.closePath();c.fill();
  c.fillStyle='#a7c0ca';c.fillRect(-27,-7,5,14);c.fillStyle='#1b3043';c.fillRect(-31,-5,5,10);
  const flame=12+(Math.sin(phase*.65)+1)*5;c.fillStyle='#eda24f';c.beginPath();c.moveTo(-31,-5);c.lineTo(-31-flame,0);c.lineTo(-31,5);c.closePath();c.fill();
  c.fillStyle='#d7faff';c.beginPath();c.moveTo(-30,-3);c.lineTo(-42,0);c.lineTo(-30,3);c.closePath();c.fill();
  root.drawGurovJaw(c,0,0,1,phase,0);c.restore();
 };
 root.drawGurovHealTrail=function(c,p,camera){
  if(p.healFlash<=0)return;
  const t=2-p.healFlash;
  for(let i=0;i<7;i++){
   const u=(t-i*.13)/1.25;if(u<0||u>1)continue;
   const x=p.x+p.w/2-camera-p.facing*(22+u*58)+(i%2?8:-8),y=p.y+70-u*86+i%3*9;
   c.save();c.globalAlpha=Math.sin(u*Math.PI)*.9;c.translate(x,y);c.scale(8+i%3,8+i%3);c.fillStyle=i%2?'#ff9cba':'#ffd5c6';c.beginPath();c.moveTo(0,.65);c.bezierCurveTo(-1.7,-.3,-.6,-1.4,0,-.65);c.bezierCurveTo(.6,-1.4,1.7,-.3,0,.65);c.fill();c.restore();
  }
 };
})(window);
