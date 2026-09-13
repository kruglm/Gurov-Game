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
