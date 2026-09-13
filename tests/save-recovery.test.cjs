const test=require('node:test'),assert=require('node:assert/strict');
const {World,migrateSave}=require('../game/engine.js');
test('damaged optional save fields cannot poison physics or display counters',()=>{
 const raw={version:1,campaign:3,level:1,checkpoint:1.5,taken:{page0:true},stats:{sparks:-4,diplomas:'six',elapsed:NaN,deaths:Infinity,defeats:2.8},chapterStart:{stats:'broken'},upgrade:'homing'};
 const w=new World(1,raw);assert.equal(w.checkpoint,0);assert.equal(w.pages,0);assert.equal(w.stats.defeats,2);
 for(let i=0;i<120;i++)w.update(1/120,{});
 assert.ok(Object.values(w.stats).every(Number.isFinite));assert.ok(Number.isFinite(w.player.x));assert.doesNotThrow(()=>new World(1,w.save()).restartLevel());
 const legacy=migrateSave({...raw,campaign:2,taken:'invalid'});assert.equal(legacy.stats.diplomas,3);assert.deepEqual(legacy.taken,[]);
 assert.equal(migrateSave('broken'),null);
});
test('a saved final catch without a pending dialogue reaches the ending instead of an empty endless roof',()=>{
 for(const pendingScene of [null,'ivan-caught']){
  const w=new World(3,{version:1,campaign:3,level:3,upgrade:'homing',bossDefeated:true,pendingScene});
  assert.ok(w.won);assert.ok(w.level.boss.defeated);assert.equal(w.pendingScene,pendingScene);
 }
});
