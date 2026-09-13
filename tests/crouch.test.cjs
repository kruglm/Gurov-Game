const test=require('node:test'),assert=require('node:assert/strict');
const {World,PLAYER_H,CROUCH}=require('../game/engine.js');
const step=(w,n,input={})=>{for(let i=0;i<n;i++)w.update(1/120,input);};
function scene(){const w=new World();w.level.enemies=[];w.level.items=[];w.runner=null;step(w,150);return w;}

test('crouching lowers the real body while feet stay fixed and allows slow movement',()=>{
 const w=scene(),p=w.player,feet=p.y+p.h;
 step(w,20,{crouch:true});assert.equal(p.h,CROUCH.height);assert.equal(p.y+p.h,feet);assert.ok(p.grounded);
 step(w,80,{crouch:true,right:true});assert.ok(p.vx>100&&p.vx<=CROUCH.speed);assert.equal(p.y+p.h,feet);
 step(w,20);assert.equal(p.h,PLAYER_H);assert.equal(p.crouch,0);assert.equal(p.y+p.h,feet);
});
test('ducking evades an upper-body projectile but not a low projectile or a rush',()=>{
 const shoot=(w,y)=>w.enemyShot('roman','mcp',w.player.x-1,y,0,0,28,18);
 const standing=scene();shoot(standing,510);step(standing,1);assert.equal(standing.player.hp,3);
 const w=scene();step(w,20,{crouch:true});shoot(w,510);step(w,1,{crouch:true});assert.equal(w.player.hp,5);
 shoot(w,578);step(w,1,{crouch:true});assert.equal(w.player.hp,3);
 const rush=scene();step(rush,20,{crouch:true});rush.damage(3,rush.player.x+20,'roman');assert.equal(rush.player.hp,2);
});
test('crouched jaws launch from the low mouth in both directions with either upgrade',()=>{
 for(const upgrade of [null,'homing'])for(const facing of [-1,1]){
  const w=scene();w.upgrade=upgrade;w.player.facing=facing;step(w,20,{crouch:true});
  w.update(1/120,{crouch:true,shoot:true});const event=w.events.find(e=>e.type==='shoot'),jaw=w.projectiles[0];
  assert.equal(event.y,610-CROUCH.mouthHeight);assert.equal(event.x,w.player.x+w.player.w/2+facing*27);
  assert.equal(Math.sign(jaw.vx),facing);assert.ok(jaw.y+jaw.h<610);assert.equal(!!jaw.homing,upgrade==='homing');
 }
});
test('jump and protected dash leave a crouch; airborne down does not grant a tiny hitbox',()=>{
 for(const action of ['jump','dash']){
  const w=scene();step(w,20,{crouch:true});w.update(1/120,{crouch:true,[action]:true});
  assert.equal(w.player.h,PLAYER_H);assert.equal(w.player.crouch,0);
  if(action==='jump'){assert.ok(w.player.vy<0);step(w,20,{crouch:true});assert.equal(w.player.h,PLAYER_H);}
  else{assert.ok(w.player.dash>0);w.damage(3);assert.equal(w.player.hp,5);}
 }
});
test('headroom prevents standing or jumping into a solid ceiling; one-way ledges stay one-way',()=>{
 const w=scene();step(w,20,{crouch:true});w.level.platforms.push({x:80,y:480,w:140,h:45,kind:'floor'});
 step(w,30);assert.equal(w.player.h,CROUCH.height);w.update(1/120,{jump:true,dash:true});assert.equal(w.player.dash,0);assert.ok(w.player.vy>=0);
 step(w,180,{right:true});assert.equal(w.player.h,PLAYER_H);assert.ok(w.player.x>220);
 const v=scene();step(v,20,{crouch:true});v.level.platforms.push({x:80,y:505,w:140,h:20,kind:'ledge'});
 step(v,20);assert.equal(v.player.h,PLAYER_H);
});
test('eating stands up, restores hearts, and crouch never persists through death or a save',()=>{
 const w=scene();w.upgrade='paper';w.player.hp=2;step(w,20,{crouch:true});w.update(1/120,{crouch:true,heal:true});
 assert.equal(w.player.h,PLAYER_H);assert.ok(w.player.eating>0);step(w,150,{crouch:true});assert.equal(w.player.hp,4);assert.ok(w.player.healFlash>0);
 const restored=new World(0,w.save());assert.equal(restored.player.crouch,0);assert.equal(restored.player.h,PLAYER_H);
 w.die();assert.equal(w.player.crouch,0);assert.equal(w.player.h,PLAYER_H);assert.ok(w.awaitingRespawn);
});
test('render interpolation preserves planted feet throughout crouching',()=>{
 global.window=global;require('../game/upgrades.js');const w=scene(),last=GurovRender.capture(w);
 w.update(1/120,{crouch:true});const h=w.player.h;
 for(const a of [0,.25,.5,.75,1]){const p=GurovRender.between(w,last,a).player;assert.ok(Math.abs(p.y+p.h-610)<1e-8);assert.ok(p.h>=h&&p.h<=PLAYER_H);}
 assert.equal(w.player.h,h);
});
