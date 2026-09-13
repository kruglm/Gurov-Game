const {test}=require('node:test'),assert=require('node:assert/strict');
const {World,COMBAT}=require('../game/engine.js');
const arena=()=>{const w=new World(3);w.companion=null;w.level.boss.active=true;w.player.x=960;w.player.inv=100;w.player.grounded=true;return w;};
const hit=w=>{const b=w.level.boss;w.projectiles.push({x:b.x+15,y:b.y+10,w:44,h:50,vx:0,vy:0,life:1,enemy:false});w.update(1/120,{});};
test('half HP transforms once, heals fully, clears attacks and pauses for a readable entrance',()=>{
 const w=arena(),b=w.level.boss;b.hp=11;w.enemyShot('ivan','tomato',500,300,200,0);hit(w);
 assert.equal(b.academic,true);assert.equal(b.hp,20);assert.equal(w.intro.academic,true);assert.equal(w.projectiles.length,0);
 assert.equal(w.intro.name,'Иван Павленко в академическом отпуске');
 const p={...w.player};w.update(.02,{right:true,shoot:true});assert.deepEqual(w.player,p);
 w.intro=null;b.hp=11;hit(w);assert.equal(b.hp,10);assert.equal(w.intro,null);
 b.hp=1;hit(w);assert.ok(b.exhausted);assert.equal(b.walls.length,0);
});
test('earth walls warn, never spawn on player, are bounded and expire',()=>{
 const w=arena(),b=w.level.boss;b.academic=true;b.wallCool=0;w.updateBoss(.01);assert.ok(b.wallTell);assert.equal(b.walls.length,0);
 for(let i=0;i<80;i++)w.updateBoss(.01);assert.equal(b.walls.length,0);
 for(let i=0;i<12;i++)w.updateBoss(.01);assert.equal(b.walls.length,1);assert.equal(b.walls[0].hp,2);
 for(let i=0;i<510;i++)w.updateBoss(.01);assert.equal(b.walls.length,0);
 b.x=w.player.x+320;b.escape=0;b.wallCool=0;w.updateBoss(.01);assert.ok(b.wallTell);w.player.x=b.wallTell.x;
 for(let i=0;i<95;i++)w.updateBoss(.01);assert.equal(b.walls.length,0);
});
test('wall physically blocks player, yields to two jaws and gives no collision damage',()=>{
 const w=arena(),b=w.level.boss;b.academic=true;b.wallCool=100;b.walls=[{x:1060,y:462,w:52,h:148,hp:2,life:5}];w.player.x=1005;
 for(let i=0;i<25;i++)w.update(1/120,{right:true});assert.ok(w.player.x+w.player.w<=1060.01);assert.equal(w.player.hp,5);
 for(let j=0;j<2;j++){w.projectiles.push({x:1057,y:500,w:26,h:18,vx:100,vy:0,life:1,enemy:false});w.update(1/120,{});}
 w.update(1/120,{});assert.equal(b.walls.length,0);
});
test('healing has two charges, a windup and a cooldown; pressure and hits interrupt it',()=>{
 const w=arena(),b=w.level.boss;b.academic=true;b.x=1800;b.hp=9;b.healCool=0;b.wallCool=100;w.updateBoss(.01);assert.ok(b.healTime>0);assert.equal(b.hp,9);
 for(let i=0;i<145;i++)w.updateBoss(.01);assert.equal(b.hp,11);assert.equal(b.healCharges,1);assert.ok(b.healCool>10);
 b.healCool=0;w.updateBoss(.01);w.player.x=b.x-400;w.updateBoss(.01);assert.equal(b.healTime,0);assert.equal(b.healCharges,1);
 w.player.x=b.x-700;b.healCool=0;w.updateBoss(.01);hit(w);assert.equal(b.healTime,0);assert.equal(b.healCharges,1);
 b.healCool=0;w.updateBoss(.01);for(let i=0;i<145;i++)w.updateBoss(.01);assert.equal(b.healCharges,0);
 b.healCool=0;w.updateBoss(.01);assert.equal(b.healTime,0);
});
test('new boss state resets on retry; rebasing moves walls and their warning',()=>{
 const w=arena(),b=w.level.boss;b.academic=true;b.walls=[{x:12000,y:462,w:52,h:148,hp:2,life:5}];b.wallTell={x:13000,time:.7};w.player.x=14000;b.x=14500;w.updateRoof();assert.equal(b.walls[0].x,3808);assert.equal(b.wallTell.x,4808);
 w.player.inv=0;w.damage(10,b.x,'ivan');w.resumeCheckpoint();assert.equal(w.level.boss.academic,false);assert.equal(w.level.boss.hp,20);assert.deepEqual(w.level.boss.walls,[]);
});
test('course-team dialogue is proximity-gated and survives save/reload',()=>{const w=new World(2);assert.equal(w.talkToFaculty(),false);w.player.x=7080;w.update(1/120,{});assert.ok(w.nearFaculty?.group);assert.ok(w.talkToFaculty());assert.equal(w.pendingScene,'course-team');const restored=new World(2,w.save());assert.equal(restored.pendingScene,'course-team');restored.acknowledgeScene('course-team');assert.equal(restored.pendingScene,null);});
