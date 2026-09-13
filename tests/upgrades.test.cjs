const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {World,UPGRADES,PLAYER_H}=require('../game/engine.js');
const tick=(w,n,input={})=>{for(let i=0;i<n;i++)w.update(1/120,i?{}:input);};
const quiet=(upgrade='paper')=>{const w=new World(0,{upgrade});w.level.enemies=[];w.level.items=[];w.runner=null;tick(w,2);return w;};
test('first exit offers exactly one upgrade, preserved across pending save, chapters and retry',()=>{
 const w=quiet(null);w.pages=3;for(const i of ['page0','page1','page2'])w.level.items.push({id:i,type:'page',taken:true});w.player.x=w.level.exit.x;tick(w,1);
 assert.equal(w.won,true);assert.equal(w.pendingUpgrade,true);const r=new World(0,w.save());assert.equal(r.won,true);assert.equal(r.pendingUpgrade,true);
 assert.equal(r.chooseUpgrade('invalid'),false);assert.equal(r.chooseUpgrade('homing'),true);assert.equal(r.chooseUpgrade('paper'),false);
 const again=new World(0,r.save());assert.equal(again.upgrade,'homing');assert.equal(again.pendingUpgrade,false);
 const next=new World(1,{upgrade:r.upgrade});assert.equal(next.upgrade,'homing');assert.equal(next.restartLevel().upgrade,'homing');
 assert.equal(new World(2,{version:1,campaign:3,level:2}).pendingUpgrade,true);assert.equal(new World(0).pendingUpgrade,false);
});
test('paper heals after 1.2 seconds, holds movement/attacks and persists its cooldown',()=>{
 const w=quiet();w.player.hp=1;const x=w.player.x;tick(w,1,{heal:true,shoot:true,right:true});assert.ok(w.player.eating>0);assert.equal(w.projectiles.length,0);assert.equal(w.player.x,x);assert.equal(w.player.hp,1);
 tick(w,150);assert.equal(w.player.hp,3);assert.equal(w.player.eating,0);assert.ok(w.player.healFlash>0);assert.ok(w.events.some(e=>e.type==='heal'&&e.amount===2&&e.source==='paper'));
 assert.equal(w.eatPaper(),false);const save=w.save();assert.ok(save.paperCooldown>18);assert.equal(new World(0,save).paperCooldown,save.paperCooldown);assert.equal(w.restartLevel().paperCooldown,save.paperCooldown);
 tick(w,2400);assert.equal(w.eatPaper(),true);
});
test('full health, wrong branch, air and interrupted casts never give free healing',()=>{
 const w=quiet();assert.equal(w.eatPaper(),false);assert.equal(w.paperCooldown,0);w.player.hp=3;w.player.grounded=false;assert.equal(w.eatPaper(),false);
 w.player.grounded=true;w.upgrade='homing';assert.equal(w.eatPaper(),false);w.upgrade='paper';assert.equal(w.eatPaper(),true);w.player.inv=0;w.damage(1);assert.equal(w.player.eating,0);tick(w,180);assert.equal(w.player.hp,2);assert.ok(w.paperCooldown>0);
 for(const action of ['jump','dash']){const q=quiet();q.player.hp=1;q.eatPaper();tick(q,1,{[action]:true});assert.equal(q.player.eating,0);assert.equal(q.player.hp,1);}
});
test('tea, checkpoint and coursework share the smile/hearts healing event and cap at five',()=>{
 const w=quiet();w.player.hp=4;assert.equal(w.heal(2,'tea'),1);assert.equal(w.player.hp,5);assert.equal(w.heal(2,'tea'),0);
 w.player.hp=1;w.player.x=w.level.checkpoints[1].x;w.player.y=610-PLAYER_H;tick(w,1);assert.equal(w.player.hp,5);assert.ok(w.events.some(e=>e.type==='heal'&&e.source==='checkpoint'));
 const q=new World(1,{upgrade:'paper'});q.player.hp=1;q.nearNpc=q.level.npc;q.talkToCameo();assert.equal(q.player.hp,5);assert.ok(q.events.some(e=>e.type==='heal'&&e.source==='coursework'));
});
test('homing jaw turns toward nearest living target, retargets and preserves rocket speed',()=>{
 const w=quiet('homing');w.level.enemies=[{x:440,y:200,w:50,h:95,hp:3},{x:800,y:515,w:50,h:95,hp:3},{x:210,y:515,w:50,h:95,hp:0}];
 const s={x:200,y:480,w:26,h:18,vx:620,vy:0};w.guideJaw(s,.1);assert.ok(s.vy<0);assert.ok(Math.abs(Math.hypot(s.vx,s.vy)-UPGRADES.homingSpeed)<1e-8);
 w.level.enemies[0].hp=0;for(let i=0;i<8;i++)w.guideJaw(s,.1);assert.ok(s.vy>0);
 w.level.enemies=[];const old={...s};w.guideJaw(s,.1);assert.equal(s.seeking,false);assert.equal(s.vx,old.vx);
 const q=quiet('homing');tick(q,1,{shoot:true});assert.ok(q.projectiles[0].homing);assert.equal(q.projectiles[0].vy,0);
 const plain=quiet(null);tick(plain,1,{shoot:true});assert.equal(plain.projectiles[0].homing,false);assert.ok(plain.projectiles[0].vy>0);
});
test('rockets damage real opponents but do not bypass a closed Erik shield or earth wall',()=>{
 const make=()=>{const w=new World(1,{upgrade:'homing'});w.level.enemies=[];w.level.items=[];w.runner=null;w.companion=null;const b=w.level.boss;b.active=true;b.timer=.2;w.player.x=2300;w.player.y=610-PLAYER_H;return w;};
 const put=(w,x,y)=>w.projectiles.push({type:'jaw',homing:true,x,y,w:26,h:18,vx:620,vy:0,life:1,age:0,bounces:0,enemy:false});
 const w=make(),b=w.level.boss,hp=b.hp;put(w,b.x+5,b.y+42);tick(w,1);assert.equal(b.hp,hp);assert.equal(w.projectiles.filter(s=>!s.enemy).length,0);
 b.timer=2.1;put(w,b.x+5,b.y+42);tick(w,1);assert.equal(b.hp,hp-1);
 const q=make();q.level.boss.walls=[{x:2410,y:470,w:52,h:140,hp:2,life:5}];put(q,2408,510);tick(q,1);assert.equal(q.level.boss.walls[0].hp,1);assert.equal(q.projectiles.filter(s=>!s.enemy).length,0);
});
test('render interpolation is continuous at 60/90/144 Hz and never mutates simulation or saves',()=>{
 const window={};vm.runInNewContext(fs.readFileSync('game/upgrades.js','utf8'),{window});
 for(const rate of [60,90,144]){const w=quiet();const start=JSON.stringify(w.save()),p=w.player;let previous=window.GurovRender.capture(w),accum=0,lastX=0,steps=[];
  for(let i=0;i<120;i++){accum+=1/rate;while(accum+1e-9>=1/120){previous=window.GurovRender.capture(w);w.player.x+=240/120;accum-=1/120;}const view=window.GurovRender.between(w,previous,accum*120);if(i>1)steps.push(view.player.x-lastX);lastX=view.player.x;assert.equal(w.player,p);}
  assert.ok(Math.max(...steps)-Math.min(...steps)<1e-8,rate+' Hz');assert.equal(JSON.stringify(w.save()),start);
  w.spawn();assert.equal(window.GurovRender.between(w,previous,.5),w,'do not interpolate a respawn teleport');
 }
});
