const test=require('node:test'),assert=require('node:assert/strict');
const {World}=require('../game/engine');require('../game/player-death');
test('fatal event retains the hit location while the saved checkpoint is ready to retry',()=>{
 const w=new World(1);w.player.x=2470;w.player.y=487;w.player.hp=1;w.player.inv=0;w.damage(2,2500,'erik');
 const event=w.events.find(e=>e.type==='death');assert.equal(event.player.x,2470);assert.equal(event.source,'erik');assert.ok(event.player.hp<=0);assert.notEqual(w.player.x,event.player.x);assert.equal(w.player.hp,5);assert.ok(w.awaitingRespawn);assert.equal(w.stats.deaths,1);
 const restored=new World(1,w.save());assert.ok(restored.awaitingRespawn);assert.equal(restored.deathSource,'erik');
});
test('fall completes before the death menu, emits one landing and respects focus',()=>{
 const w=new World(0);w.die('fall');const fatal=w.events.find(e=>e.type==='death');
 for(const reduced of [false,true]){
  const scene=new GurovPlayerDeath(fatal,w.level.platforms,reduced),poses=new Set();let hits=0;
  for(let i=0;i<40;i++){hits+=scene.update(1/120);poses.add(scene.pose);}
  const elapsed=scene.elapsed;for(let i=0;i<500;i++)scene.update(1/120,false);assert.equal(scene.elapsed,elapsed);assert.equal(scene.done,false);
  for(let i=0;i<600;i++){hits+=scene.update(1/120);poses.add(scene.pose);}
  assert.equal(hits,1);assert.equal(poses.size,6);assert.ok(scene.done);assert.equal(scene.pose,5);
 }
});
test('death snapshot preserves escaped Ivan and the live encounter independently of retry',()=>{
 const w=new World(1,{upgrade:'homing'});w.checkpoint=1;w.runner.escaped=true;
 Object.assign(w.level.boss,{active:true,hp:12,phase:'windup',x:2670,warning:{targets:[2430,2580],next:0}});
 w.level.enemies[0].phase='rush';w.nearNpc=w.level.npc;w.nearSign=w.level.signs[0];
 w.enemyShot('erik','hold',2460,520,-200,0);w.player.x=2450;w.player.hp=1;w.player.inv=0;w.camera=1920;
 w.damage(2,2500,'erik');const fatal=w.events.find(e=>e.type==='death'),scene=fatal.scene;
 assert.equal(scene.runner.escaped,true);assert.equal(w.runner.escaped,false);
 assert.equal(scene.level.boss.hp,12);assert.equal(scene.level.boss.phase,'windup');assert.equal(scene.level.boss.x,2670);
 assert.equal(w.level.boss.active,false);assert.equal(scene.level.enemies[0].phase,'rush');
 assert.equal(scene.nearNpc,scene.level.npc);assert.equal(scene.nearSign,scene.level.signs[0]);
 assert.equal(scene.projectiles.length,1);assert.equal(w.projectiles.length,0);
 w.level.boss.warning={targets:[100]};w.level.enemies[0].phase='patrol';w.runner.x=10;
 assert.deepEqual(scene.level.boss.warning.targets,[2430,2580]);assert.equal(scene.level.enemies[0].phase,'rush');
 assert.notEqual(scene.runner.x,10);assert.equal(fatal.camera,1920);
 assert.equal('scene' in w.save(),false);assert.equal('events' in w.save(),false);
 assert.equal(w.resumeCheckpoint(),true);assert.equal(scene.runner.escaped,true);
});
test('roof reset does not erase academic Ivan, his walls, minions or companion from the fatal scene',()=>{
 const w=new World(3,{upgrade:'homing'});w.player.x=12500;w.updateRoof();
 const b=w.level.boss;Object.assign(b,{active:true,academic:true,hp:9,x:w.player.x+300});
 b.walls=[{x:w.player.x+100,y:462,w:52,h:148,hp:2,life:5}];
 w.level.enemies.push({x:w.player.x+150,y:515,w:50,h:95,kind:'roman',hp:4,summoned:true,phase:'recover'});
 w.companion.x=w.player.x-70;
 const before=structuredClone({boss:b,platforms:w.level.platforms,enemies:w.level.enemies,companion:w.companion,distance:w.distanceOffset});
 w.die('damage','ivan');const s=w.events.find(e=>e.type==='death').scene;
 assert.deepEqual(s.level.boss,before.boss);assert.deepEqual(s.level.platforms,before.platforms);
 assert.deepEqual(s.level.enemies,before.enemies);assert.deepEqual(s.companion,before.companion);assert.equal(s.distanceOffset,before.distance);
 assert.equal(w.level.boss.academic,false);assert.equal(w.level.enemies.length,0);assert.equal(w.distanceOffset,0);
});
