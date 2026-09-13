const test = require('node:test');
const assert = require('node:assert/strict');
const {World,levelData,overlap,PLAYER_H,PLAYER_ART_H,COMBAT,RAVIL_LINES,migrateSave}=require('../game/engine.js');
const step=(w,n,input={})=>{for(let i=0;i<n;i++)w.update(1/120,input);};

test('gravity lands at ground and jumping has a second impulse but no third',()=>{
 const w=new World();step(w,35);assert.equal(w.player.y,(610-PLAYER_H));assert.ok(w.player.grounded);
 w.update(1/120,{jump:true});assert.equal(w.player.jumps,1);assert.ok(w.player.vy<0);
 step(w,20);w.update(1/120,{jump:true});assert.equal(w.player.jumps,2);const v=w.player.vy;
 w.update(1/120,{jump:true});assert.ok(w.player.vy>v);assert.equal(w.player.jumps,2);
});
test('dash has cooldown and grants collision protection',()=>{
 const w=new World();step(w,160);w.update(1/120,{right:true,dash:true});assert.ok(w.player.vx>800);assert.ok(w.player.dashCool>0);
 w.damage();assert.equal(w.player.hp,5);step(w,30);const cd=w.player.dashCool;w.update(1/120,{dash:true});assert.ok(w.player.dashCool<cd);
});
test('Roman needs three jaws; a stomp deals two damage and leaves a finishing hit',()=>{
 const w=new World();const e=w.level.enemies[0];e.vx=0;w.player.x=e.x-110;w.player.y=(610-PLAYER_H);step(w,125,{shoot:true});assert.equal(e.hp,0);assert.equal(w.stats.defeats,1);
 const v=new World();const enemy=v.level.enemies[0];enemy.vx=0;v.player.x=enemy.x;v.player.y=enemy.y-v.player.h-3;v.player.vy=200;step(v,4);assert.equal(enemy.hp,1);assert.ok(v.player.vy<0);
});
test('collectible state and checkpoint survive serialization and a pit fall',()=>{
 const w=new World();const item=w.level.items.find(i=>i.type==='page');w.player.x=item.x;w.player.y=item.y;step(w,1);assert.equal(w.pages,1);
 w.player.x=w.level.checkpoints[1].x;w.player.y=(610-PLAYER_H);step(w,3);assert.equal(w.checkpoint,1);
 const r=new World(0,JSON.parse(JSON.stringify(w.save())));assert.equal(r.pages,1);assert.equal(r.checkpoint,1);
 r.player.y=1000;step(r,1);assert.equal(r.stats.deaths,1);assert.equal(r.pages,1);assert.equal(r.player.x,r.level.checkpoints[1].x);
});
test('early doors require three diplomas and Erik must be defeated',()=>{
 for(let index=0;index<2;index++){
  const w=new World(index);w.player.x=w.level.exit.x;w.player.y=(610-PLAYER_H);step(w,1);if(w.intro)step(w,390);assert.equal(w.won,false);
  w.pages=3;step(w,1);assert.equal(w.won,index===0);
  if(index>0){w.level.boss.defeated=true;step(w,1);assert.equal(w.won,true);}
 }
});
test('Erik shield protects only his speech and a defeat clears hostile attacks',()=>{
 const w=new World(1),b=w.level.boss;w.player.x=2300;b.active=true;
 const fire=()=>w.projectiles.push({x:b.x+30,y:b.y+40,w:18,h:7,vx:0,vy:0,life:1,enemy:false});
 fire();step(w,1);assert.equal(b.hp,COMBAT.erikHP);assert.equal(w.bossOpen(),false);
 b.timer=2;step(w,1);fire();step(w,1);assert.equal(b.hp,COMBAT.erikHP-1);
 for(let i=0;i<COMBAT.erikHP-1;i++){b.timer=2;fire();step(w,1);}assert.ok(b.defeated);assert.equal(b.hp,0);
 assert.ok(w.projectiles.every(s=>!s.enemy));
});
test('Erik warns before falling holds and attacks never enqueue dialogue on their own',()=>{
 const w=new World(1);w.player.x=2140;w.level.boss.active=true;step(w,370);
 assert.equal(w.events.some(e=>e.type==='bossSpeech'||e.type==='captiveSpeech'),false);
 assert.ok(w.level.boss.warning);assert.equal(w.projectiles.some(s=>s.type==='bigHold'),false);
 step(w,135);assert.ok(w.projectiles.some(s=>s.type==='bigHold'));
 step(w,250);assert.ok(w.level.boss.cycle>=1);assert.equal(w.events.some(e=>e.type==='bossSpeech'||e.type==='captiveSpeech'),false);
});
test('Ivan retreats forward, attacks with tomatoes and vaults ahead when cornered',()=>{
 const w=new World(3),b=w.level.boss;w.player.x=900;b.timer=.899;b.active=true;const old=b.x;step(w,66);
 assert.ok(b.x>old);assert.ok(b.vx>0);assert.ok(w.projectiles.some(s=>s.type==='tomato'&&s.vx<0));assert.ok(w.bossOpen());
 b.x=4440;b.escapeCool=0;b.escape=0;w.player.x=4320;step(w,20);
 assert.ok(b.escape>0);assert.ok(b.y<500);assert.ok(b.vx>0);
});
test('boss resets on death, pages persist, and saved victories stay completed',()=>{
 for(const index of [1,3]){
  const w=new World(index);w.checkpoint=index===1?1:0;w.pages=index===1?1:0;if(index===1)w.level.items[0].taken=true;w.level.boss.hp=1;w.level.boss.warning={x:2000,remaining:.2};w.die();
  assert.equal(w.level.boss.hp,w.level.boss.maxHp);assert.equal(w.level.boss.active,false);assert.equal(w.level.boss.warning,null);assert.equal(w.pages,index===1?1:0);
  if(index===3){assert.ok(w.level.boss.x>w.player.x);const restored=new World(3,w.save());assert.ok(restored.level.boss.x>restored.player.x);}
  w.level.boss.defeated=true;w.level.boss.hp=0;const r=new World(index,JSON.parse(JSON.stringify(w.save())));assert.equal(r.level.boss.defeated,true);r.die();assert.equal(r.level.boss.defeated,true);
 }
});
test('Sasha coursework is handed over once and his cameo is preserved across saves',()=>{
 const w=new World(1);w.player.x=w.level.npc.x;step(w,3);w.player.hp=2;
 assert.equal(w.nearNpc.name,'Саша Ситников');assert.ok(w.talkToCameo());assert.equal(w.player.hp,5);
 w.player.hp=3;w.talkToCameo();assert.equal(w.player.hp,3);
 const r=new World(1,JSON.parse(JSON.stringify(w.save())));assert.equal(r.level.npc.helped,true);
 assert.equal(r.pendingScene,'sasha-coursework');assert.equal(r.level.boss.defeated,false);assert.equal(r.level.npc.greeted,true);
 r.acknowledgeScene('sasha-coursework');assert.equal(new World(1,r.save()).pendingScene,null);
});
test('chapter one geometry is unchanged; obsolete later-chapter saves restart safely',()=>{
 const snapshot=require('./fixtures/level1-v1.1.json');const level=levelData(0);for(const key of ['platforms','items','checkpoints','exit','width'])assert.deepEqual(level[key],snapshot.level[key]);assert.ok(level.enemies.every(e=>e.kind==='roman'&&e.h===95));assert.match(require('../game/engine.js').CHAPTERS[0].intro,/Иван Павленко/);
 const saved={version:1,level:2,checkpoint:1,taken:['page0','page1','page2'],bossDefeated:true,stats:{sparks:12}};
 const w=new World(2,saved);assert.equal(w.pages,0);assert.equal(w.checkpoint,0);assert.equal(w.level.boss,null);assert.equal(w.stats.sparks,12);
 saved.level=0;const first=new World(0,saved);assert.equal(first.pages,3);assert.equal(first.checkpoint,1);
});
test('dentures emerge at mouth height in both directions, arc and bounce',()=>{
 for(const facing of [-1,1]){
  const w=new World();step(w,30);w.player.x=250;w.player.facing=facing;
  const mouthX=w.player.x+w.player.w/2+facing*27,mouthY=w.player.y+25.5;
  w.update(1/120,{shoot:true});const jaw=w.projectiles[0];
  assert.equal(jaw.type,'jaw');assert.equal(Math.sign(jaw.vx),facing);
  assert.ok(Math.abs(jaw.x+jaw.w/2-jaw.vx/120-mouthX)<.01);
  assert.ok(Math.abs(jaw.y+jaw.h/2-mouthY)<1);assert.equal(jaw.bounces,2);
  assert.ok(w.events.some(e=>e.type==='shoot'&&e.x===mouthX&&e.y===mouthY));
 }
 const w=new World();w.player.x=100;w.level.enemies=[];step(w,30);w.update(1/120,{shoot:true});
 for(let i=0;i<160&&!w.events.some(e=>e.type==='jawClack');i++)w.update(1/120);
 assert.ok(w.projectiles.some(s=>s.type==='jaw'&&s.bounces<2&&s.vy<0));
 assert.ok(w.events.some(e=>e.type==='jawClack'));
});
test('gait follows distance, stops when still, and landing gives a brief compression',()=>{
 const w=new World();step(w,40);const initial=w.player.gait;step(w,35,{right:true});assert.ok(w.player.gait>initial);
 step(w,240);const stopped=w.player.gait;step(w,100);assert.ok(Math.abs(w.player.gait-stopped)<.001);
 w.update(1/120,{jump:true});let landed=false;
 for(let i=0;i<160;i++){w.update(1/120);if(w.player.landing>0){landed=true;break;}}
 assert.ok(landed);assert.ok(w.events.some(e=>e.type==='land'));
});
test('level geometry has safe spawn, three pages, recovery and reachable ledge heights',()=>{
 for(let index=0;index<4;index++){
  const l=levelData(index);assert.equal(l.items.filter(i=>i.type==='page').length,index<2?3:0);
  l.checkpoints.forEach(c=>assert.ok(l.platforms.some(p=>p.kind==='floor'&&c.x>=p.x&&c.x+38<=p.x+p.w)));
  const ledges=l.platforms.filter(p=>p.kind==='ledge');
  for(const p of ledges)assert.ok(l.platforms.some(q=>q!==p&&q.y>p.y&&q.y-p.y<=230&&Math.max(0,p.x-(q.x+q.w),q.x-(p.x+p.w))<=320),`unreachable ledge ${index} ${p.x}`);
 }
});
test('long deterministic mixed-input run stays finite, bounded and projectile capped',()=>{
 for(let index=0;index<4;index++){
  const w=new World(index);
  for(let i=0;i<20000;i++){if(w.awaitingRespawn)w.resumeCheckpoint();w.update(1/120,{right:i%900<800,left:i%900>=800,jump:i%63===0,dash:i%113===0,shoot:true});assert.ok(Number.isFinite(w.player.y));assert.ok(w.player.x>=0&&w.player.x<=w.level.width);assert.ok(w.player.hp>=1&&w.player.hp<=5);assert.ok(w.projectiles.length<100);w.events.length=0;}
 }
});

test('fatal boss contact abandons the old update and respawns safely',()=>{
 const w=new World(1);w.player.x=w.level.boss.x;w.player.y=(610-PLAYER_H);w.player.inv=0;w.player.hp=1;w.level.boss.active=true;w.update(1/120);
 assert.equal(w.stats.deaths,1);assert.equal(w.player.hp,5);assert.equal(w.level.boss.active,false);assert.equal(w.projectiles.length,0);
});

test('boss entrance freezes physics and attacks and can be skipped after its first beat',()=>{
 for(const index of [1,3]){const w=new World(index);w.player.x=index===1?2020:710;w.update(1/120);assert.ok(w.intro);const position={x:w.player.x,y:w.player.y},time=w.level.boss.timer;
  step(w,40,{right:true,shoot:true,jump:true});assert.equal(w.player.x,position.x);assert.equal(w.player.y,position.y);assert.equal(w.level.boss.timer,time);
  step(w,40);w.update(1/120,{skipIntro:true});assert.equal(w.intro,null);w.update(1/120);assert.ok(w.level.boss.timer>time);
 }
});
test('Ravil unlocks on Erik victory, persists, follows and damages enemies with his own shots',()=>{
 const w=new World(1),b=w.level.boss;assert.equal(w.companion,null);w.player.x=2300;b.active=true;b.timer=2;step(w,1);b.hp=1;
 w.projectiles.push({x:b.x+20,y:b.y+30,w:40,h:40,vx:0,vy:0,life:1,enemy:false});step(w,1);
 assert.ok(b.defeated);assert.ok(w.companionUnlocked);assert.ok(w.companion);assert.equal(w.events.filter(e=>e.type==='companionJoined').length,1);
 const r=new World(1,w.save());assert.ok(r.companion);r.die();assert.ok(r.companion);
 const v=new World(2),e=v.level.enemies[0];v.player.x=e.x-180;e.vx=0;v.companion.x=e.x-150;v.companion.y=e.y;v.companion.cool=0;step(v,70);
 assert.ok(v.events.some(e=>e.type==='companionShot'));assert.ok(e.hp<COMBAT.romanHP);assert.ok(v.companion.x>0);
 assert.ok(PLAYER_ART_H>=140);assert.ok(v.player.h>110);
});

test('Ivan must be exhausted and caught nearby; shots alone do not finish the chase',()=>{
 const w=new World(3),b=w.level.boss;w.player.x=b.x-250;b.active=true;b.academic=true;b.hp=1;b.timer=1;
 w.projectiles.push({x:b.x+30,y:b.y+30,w:50,h:50,vx:0,vy:0,life:1,enemy:false});step(w,1);
 assert.ok(b.exhausted);assert.equal(b.defeated,false);assert.equal(w.won,false);assert.equal(w.catchIvan(),false);assert.equal(w.bossOpen(),false);
 const hp=w.player.hp;w.player.x=b.x-35;w.player.y=610-PLAYER_H;step(w,1);assert.ok(w.nearCatch);assert.equal(w.player.hp,hp);
 w.update(1/120,{interact:true});assert.ok(b.defeated);assert.ok(w.won);assert.ok(w.events.some(e=>e.type==='ivanCaught'));
});
test('coursework survives chapter transition and is handed over only once',()=>{
 const w=new World(1);w.player.x=w.level.npc.x;step(w,1);w.talkToCameo();w.talkToCameo();
 assert.ok(w.courseworkObtained);assert.equal(w.events.filter(e=>e.type==='coursework').length,1);assert.ok(w.courseworkFlight>0);
 const restored=new World(1,w.save());assert.ok(restored.level.npc.helped);assert.ok(restored.courseworkObtained);
 const next=new World(2,{stats:w.stats,courseworkObtained:w.courseworkObtained});assert.ok(next.courseworkObtained);
});
test('Roman rotates software lines, Ravil speaks affection, and Ivan leads the early chase',()=>{
 const w=new World();w.player.x=520;w.player.inv=999;const before=w.runner.gait;step(w,9000);
 const speeches=w.events.filter(e=>e.type==='romanSpeech').map(e=>e.speech).join(' ');assert.match(speeches,/MCP/);assert.match(speeches,/B2B/);assert.match(speeches,/Claude Code/);assert.match(speeches,/триллион/);assert.match(speeches,/стать/);assert.ok(w.runner.gait>before);
 const v=new World(2);v.player.inv=999;step(v,600);assert.ok(v.events.some(e=>e.type==='companionSpeech'&&e.speech.includes('люблю')));
});
test('the early runner finishes crossing a gap before waiting for Gurov',()=>{
 const w=new World(),floors=w.level.platforms.filter(p=>p.kind==='floor');w.player.vx=0;
 for(let i=0;i<floors.length-1;i++){
  w.runner.x=(floors[i].x+floors[i].w+floors[i+1].x)/2;w.player.x=w.runner.x-500;
  for(let t=0;t<600;t++)w.updateRunner(1/120);
  assert.ok(w.runner.x>=floors[i+1].x+75);assert.equal(w.runner.y,610);assert.ok(Math.abs(w.runner.vx)>0);assert.equal(w.runner.phase,'patrol');
 }
});
test('level-one Ivan patrols physically, turns with his sprite, resumes and resets',()=>{
 const w=new World(),x=w.runner.x,positions=[],directions=new Set();
 for(let i=0;i<720;i++){w.update(1/120);positions.push(w.runner.x);directions.add(w.runner.facing);assert.equal(w.runner.facing,Math.sign(w.runner.vx));}
 assert.ok(Math.max(...positions)-Math.min(...positions)>150);assert.deepEqual([...directions].sort(),[-1,1]);assert.ok(positions.every(p=>p>=x-90&&p<=x+90));
 const last=w.runner.x;step(w,90,{right:true});assert.ok(w.runner.x>last+100);assert.equal(w.runner.facing,1);
 step(w,150);assert.equal(w.runner.phase,'patrol');const bounds={...w.runner.patrol};
 step(w,120);assert.ok(w.runner.x>=bounds.min&&w.runner.x<=bounds.max);
 w.die();assert.equal(w.runner.x,w.level.checkpoints[w.checkpoint].x+600);assert.equal(w.runner.escaped,false);
});
test('level-two Ivan never waits for a stationary player and leaves the level',()=>{
 const w=new World(1),x=w.runner.x;w.level.enemies=[];step(w,120);assert.ok(w.runner.x>x);assert.ok(w.runner.vx>0);
 step(w,1200);assert.equal(w.runner.escaped,true);assert.equal(w.player.x,120);
});
test('Ravil is captive before Erik loses and the rescue scene survives a reload',()=>{
 const w=new World(1),b=w.level.boss;assert.ok(w.level.captive);assert.equal(w.companion,null);
 w.player.x=2200;b.active=true;b.timer=2;step(w,1);assert.equal(w.level.captive.speechTime,0,'captions wait for the actual encounter voice');
 b.hp=1;w.projectiles.push({x:b.x+20,y:b.y+30,w:40,h:40,vx:0,vy:0,life:1,enemy:false});step(w,1);
 assert.equal(w.pendingScene,'erik-rescue');assert.equal(w.level.captive,null);assert.ok(w.companion);
 const restored=new World(1,w.save());assert.equal(restored.pendingScene,'erik-rescue');assert.equal(restored.level.captive,null);
 restored.acknowledgeScene('ivan-caught');assert.equal(restored.pendingScene,'erik-rescue');restored.acknowledgeScene('erik-rescue');assert.equal(restored.save().pendingScene,null);
});
test('the caught-Ivan conversation is recoverable until acknowledged',()=>{
 const w=new World(3),b=w.level.boss;b.exhausted=true;b.hp=0;w.player.x=b.x;w.player.y=610-PLAYER_H;
 assert.ok(w.catchIvan());assert.equal(w.pendingScene,'ivan-caught');
 const restored=new World(3,w.save());assert.ok(restored.won);assert.equal(restored.pendingScene,'ivan-caught');
 restored.acknowledgeScene('ivan-caught');assert.equal(restored.pendingScene,null);
});

test('v1.5 final saves migrate to chapter four without becoming the department',()=>{
 const old={version:1,campaign:2,level:2,checkpoint:1,taken:['page0'],stats:{sparks:17},companionUnlocked:true,pendingScene:'ivan-caught',bossDefeated:true};
 const migrated=migrateSave(old);assert.equal(old.level,2);assert.equal(migrated.level,3);assert.deepEqual(migrated.taken,[]);
 const w=new World(2,old);assert.equal(w.index,3);assert.equal(w.pages,0);assert.equal(w.checkpoint,0);assert.ok(w.won);assert.equal(w.pendingScene,'ivan-caught');assert.equal(w.stats.sparks,17);
});
test('department has eleven passive faculty cameos and can finish with zero pickups',()=>{
 const w=new World(2);assert.equal(w.level.faculty.length,11);assert.equal(new Set(w.level.faculty.map(n=>n.name)).size,11);
 assert.match(w.level.faculty.find(n=>n.id==='maisuradze').lines.join(' '),/Сергей Исаевич, зайдите ко мне на чай вечером/);
 assert.match(w.level.faculty.find(n=>n.id==='kitov').lines.join(' '),/графовая нейросеть/);
 for(const n of w.level.faculty){assert.ok(n.lines.length>=3);assert.match(n.color,/^#[0-9a-f]{6}$/i);assert.equal(n.speechTime,0);}
 w.player.x=w.level.exit.x;w.player.y=610-PLAYER_H;step(w,1);assert.ok(w.won);assert.equal(w.pages,0);assert.equal(w.stats.sparks,0);
});
test('the course team stays together and simulation does not schedule overlapping voice events',()=>{
 const w=new World(2),group=w.level.faculty.filter(n=>n.group==='course-team');
 assert.deepEqual(group.map(n=>n.id),['oganov','feoktistov','alekseev']);
 assert.ok(group[2].x-group[0].x<300);assert.ok(group.every(n=>n.x<w.level.exit.x&&!('hp' in n)));
 assert.equal(new Set(group.flatMap(n=>n.lines)).size,12);
 w.level.enemies=[];w.player.x=group[1].x;step(w,1200);
 assert.equal(w.events.filter(e=>e.type==='facultySpeech').length,0);
 assert.ok(group.every(n=>n.speechTime===0));
});
test('Ravil rotates twenty distinct phrases while travelling',()=>{
 assert.ok(RAVIL_LINES.length>=20);assert.equal(new Set(RAVIL_LINES).size,RAVIL_LINES.length);
 const w=new World(2);w.level.enemies=[];step(w,17000);const heard=new Set(w.events.filter(e=>e.type==='companionSpeech').map(e=>e.speech));assert.equal(heard.size,RAVIL_LINES.length);
});
test('tomatoes follow gravity, splat on floors and cannot survive an impact',()=>{
 const w=new World(3);const s={type:'tomato',x:150,y:400,w:24,h:24,vx:0,vy:0,age:0,life:5,enemy:true};w.projectiles.push(s);step(w,12);assert.ok(s.vy>35);assert.ok(s.y>401);
 step(w,150);assert.ok(w.events.some(e=>e.type==='tomatoSplat'));assert.ok(!w.projectiles.includes(s));
});
test('endless roof streams and rebases for a long chase, with no collectibles or finish door',()=>{
 const w=new World(3);w.companion=null;w.player.inv=9999;let distance=0,maxPlatforms=0,rebases=0;
 for(let i=0;i<50000;i++){
  const oldOffset=w.distanceOffset;w.update(1/120,{right:true});w.events.length=0;
  assert.equal(w.level.items.length,0);assert.equal(w.level.exit,null);assert.equal(w.won,false);assert.equal(w.stats.deaths,0);
  const d=w.distanceOffset+w.player.x;assert.ok(d>=distance-.01);distance=d;if(oldOffset!==w.distanceOffset)rebases++;
  maxPlatforms=Math.max(maxPlatforms,w.level.platforms.length);assert.ok(w.player.x<12300);assert.ok(w.projectiles.length<30);
  assert.ok(w.level.platforms.some(p=>p.kind==='floor'&&w.player.x>=p.x&&w.player.x<p.x+p.w));
 }
 assert.ok(distance>100000);assert.ok(rebases>10);assert.ok(maxPlatforms<=16);assert.ok(!w.level.boss.defeated);
 w.level.boss.exhausted=true;w.level.boss.hp=0;w.level.boss.y=500;w.player.x=w.level.boss.x;w.player.y=610-PLAYER_H;
 assert.ok(w.catchIvan());assert.ok(w.won);assert.equal(w.pendingScene,'ivan-caught');
});

test('running past an exhausted Ivan never rebases him behind the accessible origin',()=>{
 const w=new World(3);w.level.boss.exhausted=true;w.level.boss.hp=0;w.player.x=25000;w.updateRoof();
 assert.ok(w.level.boss.x>=0);assert.equal(w.distanceOffset,0);assert.ok(w.level.platforms.length<=16);
 w.player.x=w.level.boss.x;w.player.y=610-PLAYER_H;w.updateRoof();assert.ok(w.catchIvan());assert.ok(w.won);
});

test('backtracking never drives the first runner forward indefinitely or makes him jump sideways',()=>{
 const w=new World(),r=w.runner;w.player.x=400;w.player.vx=-340;const start=r.x;
 for(let i=0;i<1800;i++){const before=r.x;w.updateRunner(1/120);assert.ok(Math.abs(r.x-before)<=210/120+.001);assert.equal(r.y,610);assert.equal(r.facing,Math.sign(r.vx));}
 assert.ok(Math.abs(r.x-start)<=90);assert.equal(r.escaped,false);
 for(let i=0;i<900;i++){w.player.vx=i%40<20?340:-340;const before=r.x;w.updateRunner(1/120);assert.ok(Math.abs(r.x-before)<5);assert.ok(Number.isFinite(r.y));}
});
test('early Ivan enters the visible door, fades there and never overshoots it',()=>{
 for(const index of [0,1]){
  const w=new World(index),r=w.runner,e=w.level.exit,center=e.x+e.w/2;r.x=center-80;w.player.x=center-230;w.player.vx=340;
  for(let i=0;i<60&&r.phase!=='enter';i++)w.updateRunner(1/120);
  assert.equal(r.phase,'enter');assert.equal(r.x,center);assert.equal(r.y,e.y+e.h);assert.equal(r.escaped,false);
  for(let i=0;i<100;i++)w.updateRunner(1/120);
  assert.equal(r.escaped,true);assert.equal(r.x,center);assert.equal(r.vx,0);
 }
});
test('Ivan plants his feet, releases toward Gurov from his hand and hits a stationary target',()=>{
 const w=new World(3),b=w.level.boss;b.active=true;b.timer=.39;w.player.x=b.x-370;w.player.y=610-PLAYER_H;w.player.vx=0;w.player.inv=0;
 w.level.platforms=w.level.platforms.filter(p=>p.kind==='floor');w.companion=null;
 const start=b.x;for(let i=0;i<32;i++)w.updateBoss(1/120);
 assert.equal(b.phase,'windup');assert.equal(b.x,start);assert.equal(b.facing,-1);
 for(let i=0;i<32;i++)w.updateBoss(1/120);
 const tomato=w.projectiles.find(s=>s.type==='tomato');assert.ok(tomato);assert.equal(b.x,start);assert.equal(b.phase,'throw');
 assert.equal(tomato.x+12,b.x+b.w/2-48);assert.ok(tomato.vx<0);
 const hp=w.player.hp;for(let i=0;i<180;i++)w.update(1/120);assert.ok(w.player.hp<hp);
 const v=new World(3),boss=v.level.boss;boss.active=true;boss.escape=.8;boss.timer=.89;v.updateBoss(1/120);v.updateBoss(1/120);assert.equal(v.projectiles.length,0);
 boss.escape=1/240;boss.timer=.9;v.updateBoss(1/120);assert.equal(boss.phase,'run');assert.equal(v.projectiles.length,0);
});
test('Maisuradze interaction requires proximity and its pending dialogue survives reloading',()=>{
 const w=new World(2);assert.equal(w.talkToFaculty(),false);
 assert.ok(w.level.faculty.every(n=>!['kropotov','ponamarev','dyakonov','gurov'].includes(n.id)));
 w.player.x=w.level.faculty.find(n=>n.id==='maisuradze').x-35;w.player.y=610-PLAYER_H;step(w,1);
 assert.equal(w.nearFaculty.id,'maisuradze');const hp=w.player.hp;assert.equal(w.talkToFaculty(),true);assert.equal(w.player.hp,hp);
 const saved=new World(2,w.save());assert.equal(saved.pendingScene,'maisuradze-tea');saved.acknowledgeScene('maisuradze-tea');assert.equal(saved.save().pendingScene,null);
 assert.equal(new World(1,{...w.save(),level:1}).pendingScene,null);
});

test('death pauses the whole world, counts once, persists and requires a checkpoint choice',()=>{
 for(const cause of ['fall','damage']){
  const w=new World();step(w,160);w.events=[];
  if(cause==='fall'){w.player.y=1000;step(w,1);}else{w.player.hp=1;w.damage();}
  assert.equal(w.awaitingRespawn,true);assert.equal(w.deathCause,cause);assert.equal(w.stats.deaths,1);
  assert.equal(w.events.filter(e=>e.type==='death').length,1);assert.equal(w.events.filter(e=>e.type==='respawn').length,0);
  const frozen=JSON.stringify({player:w.player,runner:w.runner,enemies:w.level.enemies,stats:w.stats,time:w.time});
  step(w,1000,{right:true,shoot:true,jump:true});w.damage(5);w.die();
  assert.equal(JSON.stringify({player:w.player,runner:w.runner,enemies:w.level.enemies,stats:w.stats,time:w.time}),frozen);
  const r=new World(0,JSON.parse(JSON.stringify(w.save())));assert.equal(r.awaitingRespawn,true);assert.equal(r.deathCause,cause);
  assert.equal(r.resumeCheckpoint(),true);assert.equal(r.resumeCheckpoint(),false);assert.equal(r.stats.deaths,1);assert.equal(r.deathCause,null);
  step(r,60,{right:true});assert.ok(r.player.x>r.level.checkpoints[0].x);assert.equal(r.save().awaitingRespawn,false);
 }
});
test('full chapter retry restores entry score and story flags, even after saving a death',()=>{
 const w=new World(1,{stats:{sparks:12,diplomas:3,defeats:4,deaths:2,elapsed:82}});
 w.checkpoint=1;w.level.items.filter(i=>i.type==='spark'||i.type==='page').forEach(i=>{i.taken=true;if(i.type==='page'){w.pages++;w.stats.diplomas++;}else w.stats.sparks++;});
 w.stats.defeats+=3;w.stats.elapsed+=25;w.courseworkObtained=true;w.companionUnlocked=true;w.level.boss.defeated=true;w.level.boss.hp=0;w.level.captive=null;w.die();
 const r=new World(1,JSON.parse(JSON.stringify(w.save()))).restartLevel();
 assert.equal(r.awaitingRespawn,false);assert.equal(r.checkpoint,0);assert.equal(r.pages,0);assert.ok(r.level.items.every(i=>!i.taken));
 assert.deepEqual(r.stats,{sparks:12,diplomas:3,defeats:4,deaths:3,elapsed:107});
 assert.equal(r.courseworkObtained,false);assert.equal(r.companionUnlocked,false);assert.equal(r.companion,null);assert.ok(r.level.captive);assert.equal(r.level.boss.defeated,false);assert.equal(r.level.boss.hp,COMBAT.erikHP);assert.equal(r.pendingScene,null);
 r.stats.sparks+=8;r.die();const again=r.restartLevel();assert.equal(again.stats.sparks,12);assert.equal(again.stats.deaths,4);
});
test('checkpoint retry preserves earned rewards and clears stale nearby interactions',()=>{
 const w=new World(1);w.checkpoint=1;w.courseworkObtained=true;w.companionUnlocked=true;w.level.npc.helped=true;w.level.boss.defeated=true;w.level.boss.hp=0;w.level.captive=null;
 w.level.items[0].taken=true;w.nearNpc=w.level.npc;w.nearSign=w.level.signs[0];w.die();w.resumeCheckpoint();
 assert.equal(w.player.x,w.level.checkpoints[1].x);assert.equal(w.player.hp,5);assert.ok(w.companion);assert.ok(w.courseworkObtained);assert.equal(w.level.boss.defeated,true);assert.equal(w.level.items[0].taken,true);assert.equal(w.nearNpc,null);assert.equal(w.nearSign,null);
});
test('later chapter retries retain rescued Ravil, coursework and completed chapter scores',()=>{
 for(const index of [2,3]){
  const w=new World(index,{stats:{sparks:35,diplomas:6,defeats:8},courseworkObtained:true,companionUnlocked:true});
  if(w.level.boss){w.level.boss.active=true;w.level.boss.hp=2;}
  w.stats.sparks+=4;w.stats.defeats+=2;w.die();const r=w.restartLevel();
  assert.ok(r.companion);assert.ok(r.courseworkObtained);assert.equal(r.stats.sparks,35);assert.equal(r.stats.diplomas,6);assert.equal(r.stats.defeats,8);assert.equal(r.stats.deaths,1);
  if(r.level.boss){assert.equal(r.level.boss.hp,r.level.boss.maxHp);assert.equal(r.level.boss.active,false);assert.equal(r.level.items.length,0);}
 }
});
test('older saves without a chapter entry snapshot retry without duplicating collected scores',()=>{
 const l=levelData(1),spark=l.items.find(i=>i.type==='spark'),page=l.items.find(i=>i.type==='page');
 const w=new World(1,{version:1,campaign:3,level:1,checkpoint:1,taken:[spark.id,page.id],stats:{sparks:13,diplomas:4,defeats:8},bossDefeated:true,courseworkObtained:true,companionUnlocked:true});
 assert.equal(w.awaitingRespawn,false);w.die();const r=new World(1,w.save()).restartLevel();
 assert.equal(r.stats.sparks,12);assert.equal(r.stats.diplomas,3);assert.equal(r.stats.defeats,8);assert.equal(r.courseworkObtained,false);assert.equal(r.companionUnlocked,false);
});

test('fatal contact records the actual attacker, including Roman on a boss level',()=>{
 for(const kind of ['roman','erik','ivan']){
  const w=new World(kind==='ivan'?3:1);w.player.hp=1;w.player.inv=0;w.level.boss.active=true;w.level.boss.escapeCool=1;
  const enemy=kind==='roman'?w.level.enemies[0]:w.level.boss;
  if(kind!=='roman')w.level.enemies=[];
  w.player.x=enemy.x;w.player.y=610-PLAYER_H;step(w,1);
  assert.equal(w.awaitingRespawn,true,kind);assert.equal(w.deathCause,'damage');assert.equal(w.deathSource,kind);assert.equal(w.stats.deaths,1);
  const r=new World(w.index,JSON.parse(JSON.stringify(w.save())));assert.equal(r.deathSource,kind);
  r.die('damage','ivan');assert.equal(r.deathSource,kind,'pending death cannot be reassigned');
  r.resumeCheckpoint();assert.equal(r.deathSource,null);r.die('fall');assert.equal(r.deathSource,null);assert.equal(r.deathCause,'fall');
 }
});
test('all boss projectile types retain their owner through a lethal hit',()=>{
 for(const type of ['hold','bigHold','tomato']){
  const index=type==='tomato'?3:1,w=new World(index),b=w.level.boss;
  b.active=true;b.timer=type==='tomato'?.899:type==='bigHold'?3.1:1.799;
  w.player.x=b.x-370;w.player.y=610-PLAYER_H;w.player.hp=1;w.player.inv=0;w.level.enemies=[];w.companion=null;
  if(type==='bigHold')b.warning={x:w.player.x,remaining:.001};
  w.updateBoss(1/120);const shot=w.projectiles.find(s=>s.type===type);assert.ok(shot,type);assert.equal(shot.owner,b.kind);
  Object.assign(shot,{x:w.player.x+1,y:w.player.y+20,vx:0,vy:0});w.projectiles=[shot];step(w,1);
  assert.equal(w.awaitingRespawn,true,type);assert.equal(w.deathSource,b.kind);assert.equal(w.stats.deaths,1);
 }
});
test('only the lethal hit owns a death; falling, unknown and old saves keep a neutral source',()=>{
 const w=new World(1);w.player.inv=0;w.damage(1,null,'erik');assert.equal(w.deathSource,null);
 w.player.inv=0;w.damage(4,null,'roman');assert.equal(w.deathSource,'roman');
 assert.equal(w.restartLevel().deathSource,null);w.resumeCheckpoint();w.player.y=1000;step(w,1);assert.equal(w.deathCause,'fall');assert.equal(w.deathSource,null);
 const old={...w.save(),deathCause:'damage'};delete old.deathSource;assert.equal(new World(1,old).deathSource,null);
 assert.equal(new World(1,{...old,deathSource:'unknown'}).deathSource,null);
 assert.equal(new World(1,{...old,awaitingRespawn:false,deathSource:'erik'}).deathSource,null);
 assert.equal(new World(1,{...old,deathCause:'fall',deathSource:'erik'}).deathSource,null);
});
