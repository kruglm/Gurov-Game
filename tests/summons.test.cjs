const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {World,COMBAT,PLAYER_H}=require('../game/engine');
function arena(){
 const w=new World(3,{upgrade:'homing'});w.companion=null;w.player.x=900;w.player.y=610-PLAYER_H;w.player.inv=999;w.camera=500;w.updateRoof();
 Object.assign(w.level.boss,{active:true,academic:true,phase:'run',x:1440,summonCool:0,wallCool:100,healCool:100});return w;
}
const tick=(w,n)=>{for(let i=0;i<n;i++)w.update(1/120);};
function open(w){w.updateBoss(1/120);assert.ok(w.level.boss.summon);for(let i=0;i<181;i++)w.updateBoss(1/120);return w.level.enemies.find(e=>e.summoned);}
test('both bosses have more HP; Ivan restores his larger pool only once',()=>{
 assert.equal(new World(1).level.boss.hp,30);const w=arena(),b=w.level.boss;assert.equal(b.hp,36);
 b.academic=false;b.hp=19;w.projectiles.push({x:b.x+20,y:b.y+20,w:30,h:40,vx:0,vy:0,life:1,enemy:false});tick(w,1);
 assert.ok(w.intro);assert.equal(b.hp,36);assert.equal(b.summon,null);assert.equal(w.level.enemies.length,0);
});
test('only the second phase summons, after a fixed tell and a harmless visible emergence',()=>{
 const w=arena(),b=w.level.boss;b.academic=false;tick(w,700);assert.equal(b.summon,null);assert.equal(w.level.enemies.length,0);
 const v=arena(),boss=v.level.boss;v.updateBoss(1/120);const x=boss.summon.x;
 assert.equal(boss.phase,'summon');assert.ok(Math.abs(x-v.player.x)>200);
 for(let i=0;i<170;i++)v.updateBoss(1/120);assert.equal(v.level.enemies.length,0);assert.equal(boss.summon.x,x);
 for(let i=0;i<12;i++)v.updateBoss(1/120);const e=v.level.enemies[0];assert.equal(e.phase,'emerge');assert.equal(e.x+e.w/2,x);
 v.player.x=e.x;v.player.inv=0;v.projectiles.push({x:e.x,y:e.y,w:50,h:90,vx:0,vy:0,life:2,enemy:false});tick(v,40);
 assert.equal(v.player.hp,5);assert.equal(e.hp,COMBAT.darkRomanHP);assert.equal(e.phase,'emerge');assert.equal(v.projectiles.filter(s=>s.sinister).length,0);
 v.player.x=e.x-200;tick(v,70);assert.equal(e.phase,'recover');assert.equal(v.projectiles.filter(s=>s.sinister).length,0);
});
test('a player occupying the mark cancels it instead of receiving point-blank damage',()=>{
 const w=arena(),b=w.level.boss;w.updateBoss(.01);const x=b.summon.x;w.player.x=x-w.player.w/2;
 for(let i=0;i<160;i++)w.updateBoss(.01);
 assert.equal(w.level.enemies.length,0);assert.equal(b.summon,null);assert.ok(w.events.some(e=>e.type==='summonFade'));assert.ok(b.summonCool>9);
});
test('summon does not overlap wall/heal/escape or resume with an unannounced tomato',()=>{
 for(const key of ['wallTell','healTime','escape']){const w=arena(),b=w.level.boss;b[key]=key==='wallTell'?{x:100,time:1}:1;w.updateSummoning(.01);assert.equal(b.summon,null,key);}
 const w=arena(),b=w.level.boss;open(w);w.projectiles=[];for(let i=0;i<30;i++)w.updateBoss(1/120);assert.equal(w.projectiles.length,0);
});
test('dark Romans telegraph faster attacks, their projectiles remain bounded, and corpses dissolve',()=>{
 const w=arena(),e=open(w);tick(w,180);e.phase='patrol';e.attackCool=0;w.player.x=e.x-300;w.camera=e.x-500;w.updateRoman(e,.01);
 assert.equal(e.phase,'burstWindup');assert.equal(e.actionTime,COMBAT.darkRomanTell);
 for(let i=0;i<100;i++)w.updateRoman(e,.01);
 assert.equal(w.projectiles.filter(s=>s.sinister).length,3);assert.ok(w.projectiles.filter(s=>s.sinister).every(s=>s.owner==='roman'));
 e.hp=0;w.updateSummons(.01);assert.equal(e.phase,'dissolve');assert.ok(e.fade>0);for(let i=0;i<90;i++)w.updateSummons(.01);assert.equal(w.level.enemies.length,0);
});
test('roof rebase preserves a portal, minion bounds and aim; retry removes every summon',()=>{
 const w=arena(),e=open(w),b=w.level.boss;e.x=12400;e.min=12000;e.max=12800;e.aim={x:12340,y:510};b.summon={x:13000,time:.7};w.player.x=12400;b.x=12900;w.updateRoof();
 assert.equal(e.x,4208);assert.equal(e.min,3808);assert.equal(e.max,4608);assert.equal(e.aim.x,4148);assert.equal(b.summon.x,4808);assert.equal(b.summon.time,.7);
 w.die('damage','roman');assert.equal(w.level.enemies.length,0);assert.equal(w.level.boss.summon,null);assert.equal(w.level.boss.academic,false);
});
test('long chase keeps at most two active clones and cleans up every hazard when Ivan is exhausted',()=>{
 const w=arena(),b=w.level.boss;let max=0,spawned=0;
 for(let i=0;i<18000;i++){
  w.player.x=b.x-350;w.player.y=610-PLAYER_H;w.player.vy=0;w.player.inv=999;w.update(1/120);
  max=Math.max(max,w.level.enemies.filter(e=>e.hp>0).length);spawned+=w.events.filter(e=>e.type==='summonOpen').length;w.events=[];
  assert.ok(w.level.enemies.length<=3);assert.ok(w.projectiles.filter(s=>s.enemy).length<=COMBAT.maxHostile);
 }
 assert.ok(spawned>=4,spawned+' summons');assert.equal(max,2);
 b.exhausted=true;w.updateSummons(.01);assert.ok(w.level.enemies.every(e=>e.hp===0&&e.phase==='dissolve'));assert.equal(b.summon,null);assert.ok(w.projectiles.filter(s=>s.sinister).every(s=>s.life===0));
});
test('removing the first clone never interpolates the survivor from the wrong actor',()=>{
 const root={};vm.runInNewContext(fs.readFileSync('game/upgrades.js','utf8'),{window:root});const w=arena(),e=open(w),other={...e,x:e.x+80};w.level.enemies.push(other);
 const old=root.GurovRender.capture(w);w.level.enemies.shift();other.x+=2;const view=root.GurovRender.between(w,old,.5);assert.equal(view.level.enemies[0].x,other.x-1);
});
test('a lethal minion contact cannot let the next minion fire into the reset checkpoint',()=>{
 const w=arena(),e=open(w);e.phase='patrol';e.attackCool=100;e.vx=0;w.player.x=e.x;w.player.inv=0;w.player.hp=1;
 const other={...e,x:e.x+180,phase:'burstWindup',actionTime:.001,aim:{x:e.x,y:540}};w.level.enemies.push(other);
 tick(w,1);assert.ok(w.awaitingRespawn);assert.equal(w.level.enemies.length,0);assert.equal(w.projectiles.length,0);
});
