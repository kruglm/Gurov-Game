const test=require('node:test'),assert=require('node:assert/strict');
const {World,COMBAT,PLAYER_H}=require('../game/engine');
const step=(w,n,input={})=>{for(let i=0;i<n;i++)w.update(1/120,input);};
function arena(index){const w=new World(index);w.level.enemies=[];w.companion=null;w.player.x=index===1?2250:900;w.player.y=610-PLAYER_H;w.player.inv=0;w.level.boss.active=true;return w;}

test('normal hits cost two hearts, heavy hits three; burst hits respect invulnerability',()=>{
 const w=new World();w.player.inv=0;w.damage();assert.equal(w.player.hp,3);w.damage(3);assert.equal(w.player.hp,3);
 step(w,163);w.damage(3,null,'erik');assert.equal(w.awaitingRespawn,true);assert.equal(w.deathSource,'erik');assert.equal(w.stats.deaths,1);
 const v=new World();v.player.inv=0;v.damage(COMBAT.heavy);assert.equal(v.player.hp,2);assert.equal(v.events.at(-1).damage,3);
});
test('Roman locks a visible rush, cannot turn mid-attack or leave his patrol floor, and recovers',()=>{
 const w=new World(),e=w.level.enemies[0];w.player.x=e.x+100;w.player.y=610-PLAYER_H;e.attackCool=0;w.updateRoman(e,1/120);
 assert.equal(e.phase,'rushWindup');const x=e.x;w.player.x=e.x-100;
 for(let i=0;i<77;i++)w.updateRoman(e,1/120);assert.equal(e.x,x);assert.equal(e.facing,1);assert.equal(e.phase,'rushWindup');
 for(let i=0;i<60;i++){w.updateRoman(e,1/120);assert.ok(e.x>=e.min&&e.x<=e.max);}
 assert.equal(e.phase,'recover');const end=e.x;for(let i=0;i<60;i++)w.updateRoman(e,1/120);assert.equal(e.x,end);
 for(let i=0;i<90;i++)w.updateRoman(e,1/120);assert.equal(e.phase,'patrol');assert.ok(e.attackCool>0);
});
test('Roman MCP volley aims at the warned position, retains owner and has three distinct trajectories',()=>{
 const w=new World(),e=w.level.enemies[0];w.player.x=e.x-350;e.attackCool=0;w.updateRoman(e,1/120);assert.equal(e.phase,'burstWindup');
 w.player.x=e.x+300;for(let i=0;i<80;i++)w.updateRoman(e,1/120);
 assert.equal(w.projectiles.length,3);assert.ok(w.projectiles.every(s=>s.type==='mcp'&&s.owner==='roman'&&s.damage===2&&s.vx<0));assert.equal(new Set(w.projectiles.map(s=>s.vy)).size,3);
});
test('heavy dash contact uses three hearts and an airborne stomp interrupts the dash',()=>{
 const w=new World(),e=w.level.enemies[0];w.player.inv=0;w.player.x=e.x;w.player.y=610-PLAYER_H;e.phase='rush';e.vx=365;e.actionTime=.4;step(w,1);assert.equal(w.player.hp,2);
 const v=new World(),r=v.level.enemies[0];v.player.inv=0;v.player.x=r.x;v.player.y=r.y-v.player.h-3;v.player.vy=200;r.phase='rush';r.vx=365;r.actionTime=.4;step(v,4);assert.equal(r.hp,1);assert.equal(r.phase,'recover');assert.equal(r.vx,0);assert.equal(v.player.hp,5);
});
test('Erik falling targets are fixed by a full warning; rage makes three heavy drops',()=>{
 const w=arena(1),b=w.level.boss;b.hp=b.maxHp/2;b.timer=3.049;w.updateBoss(1/120);const targets=[...b.warning.targets];assert.equal(targets.length,3);
 w.player.x=3100;for(let i=0;i<120;i++)w.updateBoss(1/120);assert.equal(w.projectiles.filter(s=>s.type==='bigHold').length,0);assert.deepEqual(b.warning.targets,targets);
 for(let i=0;i<95;i++)w.updateBoss(1/120);const drops=w.projectiles.filter(s=>s.type==='bigHold');assert.deepEqual(drops.map(s=>s.x+44),targets);assert.ok(drops.every(s=>s.damage===3&&s.owner==='erik'));assert.equal(b.warning,null);
});
test('Erik has a 0.65-second fan windup, a 0.7-second slam cue, and a vulnerable recovery',()=>{
 const w=arena(1),b=w.level.boss;b.timer=1.149;w.updateBoss(1/120);assert.equal(b.phase,'windup');
 for(let i=0;i<76;i++)w.updateBoss(1/120);assert.equal(w.projectiles.length,0);
 for(let i=0;i<4;i++)w.updateBoss(1/120);assert.equal(w.projectiles.filter(s=>s.type==='hold').length,3);
 w.projectiles=[];b.timer=4.449;w.updateBoss(1/120);assert.ok(b.slamWarning);
 for(let i=0;i<81;i++)w.updateBoss(1/120);assert.equal(w.projectiles.filter(s=>s.type==='shockwave').length,0);
 for(let i=0;i<4;i++)w.updateBoss(1/120);assert.equal(b.phase,'recover');assert.ok(w.bossOpen());const waves=w.projectiles.filter(s=>s.type==='shockwave');assert.equal(waves.length,2);assert.deepEqual(waves.map(s=>Math.sign(s.vx)),[-1,1]);assert.ok(waves.every(s=>s.damage===3));
});
test('ground waves can be jumped or dashed; standing in one takes heavy damage',()=>{
 for(const counter of ['stand','jump','dash']){
  const w=arena(1);w.level.boss.active=false;w.player.x=500;w.player.grounded=true;w.enemyShot('erik','shockwave',620,582,-345,0,64,28,{damage:3});
  step(w,1,counter==='jump'?{jump:true}:counter==='dash'?{right:true,dash:true}:{});step(w,35);
  assert.equal(w.player.hp,counter==='stand'?2:5,counter);
 }
});
test('Ivan warns 0.6 seconds before a throw and adds a delayed second shot in academic phase',()=>{
 for(const rage of [false,true]){const w=arena(3),b=w.level.boss;b.academic=rage;b.hp=rage?b.maxHp/2:b.maxHp;b.timer=.299;w.updateBoss(1/120);assert.equal(b.phase,'windup');
 for(let i=0;i<70;i++)w.updateBoss(1/120);assert.equal(w.projectiles.length,0);
 for(let i=0;i<4;i++)w.updateBoss(1/120);assert.equal(w.projectiles.length,1);
 for(let i=0;i<33;i++)w.updateBoss(1/120);assert.equal(w.projectiles.length,rage?2:1);}
});
test('Ivan traps give position cues, arm later, expire, and are capped at four',()=>{
 const w=arena(3),b=w.level.boss;b.academic=true;b.hp=10;b.timer=4.999;w.updateBoss(1/120);assert.equal(b.phase,'trapWindup');const targets=[...b.trapTargets];assert.equal(targets.length,3);
 for(let i=0;i<73;i++)w.updateBoss(1/120);const traps=w.projectiles.filter(s=>s.type==='tomatoTrap');assert.equal(traps.length,3);assert.deepEqual(traps.map(s=>s.x+17),targets);assert.ok(traps.every(s=>s.arm===.3&&s.life===4.2&&s.owner==='ivan'));
 b.timer=12.049;w.updateBoss(1/120);for(let i=0;i<73;i++)w.updateBoss(1/120);assert.equal(w.projectiles.filter(s=>s.type==='tomatoTrap').length,4);
 b.defeated=true;step(w,510);assert.equal(w.projectiles.length,0);
});
test('traps cannot hurt before arming; a jaw or a jump counters an armed trap',()=>{
 const w=arena(3);w.level.boss.defeated=true;w.enemyShot('ivan','tomatoTrap',w.player.x,579,0,0,34,31,{arm:.3});step(w,30);assert.equal(w.player.hp,5);step(w,8);assert.equal(w.player.hp,3);
 for(const counter of ['jump','jaw']){const v=arena(3);v.level.boss.defeated=true;v.player.grounded=true;v.enemyShot('ivan','tomatoTrap',v.player.x+125,579,0,0,34,31,{arm:0});
 if(counter==='jaw')v.projectiles.push({type:'jaw',x:v.player.x+40,y:580,vx:570,vy:0,w:28,h:18,life:1,bounces:2,enemy:false});
 step(v,1,counter==='jump'?{right:true,jump:true}:{});step(v,55,counter==='jump'?{right:true}:{});assert.equal(v.player.hp,5,counter);
 if(counter==='jaw')assert.equal(v.projectiles.filter(s=>s.type==='tomatoTrap').length,0);
 }
});
test('new hazards preserve lethal owner, cap population, and are cleared on checkpoint retry',()=>{
 for(const [owner,type,n] of [['roman','mcp',2],['erik','shockwave',3],['ivan','tomatoTrap',2]]){
 const w=arena(1);w.player.hp=n;w.level.boss.active=false;w.player.x=500;w.enemyShot(owner,type,502,w.player.y+20,0,0,34,31,{damage:n});step(w,1);assert.equal(w.deathSource,owner);assert.equal(w.projectiles.length,0);assert.ok(w.resumeCheckpoint());assert.equal(w.deathSource,null);assert.equal(w.level.boss.slamWarning,false);}
 const v=new World();for(let i=0;i<100;i++)v.enemyShot('roman','mcp',0,0,0,0);assert.equal(v.projectiles.length,COMBAT.maxHostile);
});
test('roof rebase shifts pending traps and Ivan regains a lead by continuous motion',()=>{
 const w=arena(3),b=w.level.boss;w.player.x=12400;b.x=12550;b.trapTargets=[12510,12370];w.enemyShot('ivan','tomatoTrap',12200,579,0,0);w.updateRoof();assert.deepEqual(b.trapTargets,[4318,4178]);assert.equal(w.projectiles[0].x,4008);
 b.x=w.player.x-200;b.escapeCool=4;const start=b.x;w.updateBoss(1/120);assert.equal(b.phase,'run');assert.ok(b.x>start&&b.x-start<=620/120);assert.equal(w.projectiles.filter(s=>s.type==='tomato').length,0);
});
