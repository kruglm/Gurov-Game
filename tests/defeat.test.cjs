const test=require('node:test'),assert=require('node:assert/strict');
const {World}=require('../game/engine');require('../game/defeat');
test('finale pauses offscreen, emits three cues once, and finishes on presentation time',()=>{
 for(const kind of ['erik','ivan']){
  const scene=new GurovBossOutro(kind),cues=[];
  for(let i=0;i<60;i++)cues.push(...scene.update(1/120));
  const frozen=scene.elapsed;for(let i=0;i<300;i++)scene.update(1/120,false);assert.equal(scene.elapsed,frozen);assert.ok(scene.paused);
  for(let i=0;i<1200;i++)cues.push(...scene.update(1/120));
  assert.deepEqual(cues,['impact','break','resolve']);assert.ok(scene.done);assert.equal(scene.elapsed,8);assert.equal(scene.particles.length,64);
 }
});
test('reduced motion keeps a readable victory card and shorter timing',()=>{
 const scene=new GurovBossOutro('ivan',true);for(let i=0;i<400;i++)scene.update(1/60);
 assert.ok(scene.done);assert.equal(scene.elapsed,5);assert.ok(scene.canSkip);
});
test('only a saved defeated boss with its matching story can restore a finale',()=>{
 for(const [level,kind,story] of [[1,'erik','erik-rescue'],[3,'ivan','ivan-caught']]){
  const data={version:1,campaign:3,level,bossDefeated:true,pendingScene:story,pendingBossOutro:kind};
  const w=new World(level,data);assert.equal(w.pendingBossOutro,kind);assert.equal(new World(level,w.save()).pendingBossOutro,kind);
  w.acknowledgeBossOutro();const resumed=new World(level,w.save());assert.equal(resumed.pendingBossOutro,null);assert.equal(resumed.pendingScene,story);
  assert.equal(new World(level,{...data,bossDefeated:false}).pendingBossOutro,null);
  assert.equal(new World(level,{...data,pendingBossOutro:kind==='ivan'?'erik':'ivan'}).pendingBossOutro,null);
  assert.equal(new World(level,{...data,pendingBossOutro:undefined}).pendingBossOutro,null);
 }
});
test('exhaustion is not capture; E catch queues the finale exactly once',()=>{
 const w=new World(3),b=w.level.boss;b.exhausted=true;b.hp=0;w.player.x=b.x;w.player.y=b.y;w.nearCatch=true;
 assert.equal(w.pendingBossOutro,null);assert.equal(w.won,false);
 assert.equal(w.catchIvan(),true);assert.equal(w.pendingBossOutro,'ivan');assert.equal(w.pendingScene,'ivan-caught');assert.equal(w.won,true);
 assert.equal(w.catchIvan(),false);assert.equal(w.events.filter(e=>e.type==='ivanCaught').length,1);
});
