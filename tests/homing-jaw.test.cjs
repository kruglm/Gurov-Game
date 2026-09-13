const test=require('node:test'),assert=require('node:assert/strict');
const {World,PLAYER_H,UPGRADES}=require(process.env.GUROV_ENGINE||'../game/engine.js');

function arena({facing=1,distance=300,behind=true,height=0,speed=0}={}){
 const w=new World(0,{upgrade:'homing'});
 const direction=behind?-facing:facing;
 const e={...w.level.enemies[0],x:1027+direction*distance-22,y:515-height,w:44,h:95,hp:3,vx:direction*speed};
 w.level.width=6000;w.level.enemies=[e];w.level.items=[];w.level.signs=[];w.level.checkpoints=[{x:0,y:610}];w.runner=null;
 w.level.platforms=[{x:0,y:610,w:6000,h:110,kind:'floor'}];
 // Isolate aiming from Roman's attack cycle; movement and projectile collisions are real.
 w.updateRoman=(enemy,dt)=>{enemy.x+=enemy.vx*dt;};
 Object.assign(w.player,{x:1000,y:610-PLAYER_H,facing,grounded:true,inv:20});
 return {w,e};
}
function fire(w,e,dt=1/120){
 const path=[];
 for(let i=0;i<Math.ceil(2/dt);i++){
  w.update(dt,{shoot:i===0});
  const s=w.projectiles.find(s=>s.type==='jaw');
  if(s){assert.ok(Number.isFinite(s.vx)&&Number.isFinite(s.vy));assert.ok(Math.abs(Math.hypot(s.vx,s.vy)-UPGRADES.homingSpeed)<1e-8);path.push({...s});}
  else if(i>0)break;
 }
 return {path,hp:e.hp};
}

for(const facing of [-1,1])for(const distance of [100,180,300,600])for(const dt of [1/30,1/60,1/120]){
 test(`backward rocket hits across ${distance}px, facing ${facing}, ${1/dt} Hz`,()=>{
  const {w,e}=arena({facing,distance}),{path,hp}=fire(w,e,dt);
  assert.ok(path[0].vy<0,'turn away from the floor');
  assert.equal(hp,2.5,'one launch lands one hit before expiring or hitting the floor');
 });
}
for(const facing of [-1,1])for(const behind of [false,true])for(const height of [0,130]){
 test(`tracks ${behind?'rear':'front'} moving target, facing ${facing}, height ${height}`,()=>{
  const {w,e}=arena({facing,behind,height,distance:300,speed:105});
  assert.equal(fire(w,e).hp,2.5);
 });
}
test('after a missed launch a newly available rear target is still acquired',()=>{
 const {w,e}=arena({facing:-1,distance:300});w.level.enemies=[];
 w.update(1/120,{shoot:true});for(let i=0;i<12;i++)w.update(1/120,{});
 const s=w.projectiles[0];assert.equal(s.vy,0);w.level.enemies=[e];
 for(let i=0;i<200&&w.projectiles.length;i++)w.update(1/120,{});
 assert.equal(e.hp,2.5);
});
test('a lost target clears the turn and the rocket flies on without gravity',()=>{
 const {w,e}=arena({facing:-1});w.update(1/120,{shoot:true});const s=w.projectiles[0];
 e.hp=0;const velocity=[s.vx,s.vy];w.update(1/120,{});
 assert.equal(s.seeking,false);assert.deepEqual([s.vx,s.vy],velocity);
});
